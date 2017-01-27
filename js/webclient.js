/**
 * Webclient framework javascript
 *
 * Implement a webclient for use with Active911
 * API calls go to Active911Config.access_api
 * Live data is followed via XMPP (BOSH)
 */

// Singleton
active911 = new Active911();

// Webclient specific methods

stopwatch = new StopWatch();

var active_timer = 0;

/**
 * Draw an alarm
 *
 * Overridden from base
 * @param alert the alert to draw
 */
Active911.prototype.draw_alert=function(alert) {

	// Clear old alert data
	active911.undraw_alert();
	$('#statusBD').empty();
	if(typeof active_timer !== "undefined"){
  		clearTimeout(active_timer);
	}
	
	console.log("Loading alert");
	
	//Regex for data cleanup
	var reg1 = /(\*\*\*\d+\/\d+\/\d+\*\*\*\s+\d\d\:\d\d\:\d\d\s\d*\w*\s\-\s)/gi;
	var reg2 = /(\d\d\:\d\d\:\d\d\s\d*\w*)/gi;
	var reg3 = /(DT\:\d+\/\d+\/\d+\s\d+\:\d+\:\d+)/gi;
	var reg4 = /(ESN\:\w+)/gi;
	var details = alert.get_item_value("details");
	
	
	var ESN = details.match(/(ESN\:\w+)/gi)[0];
	
	
	// Update alert text fields
	$('#call_type').text(alert.get_item_value("description"));
	$('#address').text(alert.get_item_value("address"));
	//$('#details').text(alert.get_item_value("details"));
	$('#details').text(details.replace(reg1,"").replace(reg2,"").replace(reg3,""));
	$('#units').text(alert.get_item_value("units"));
	
	// Prevent text running off screen
	if(alert.get_item_value("details").length > 275) {
		document.getElementById("details").style.fontSize = "30px";
	}
	// Load map
	$("#map").append("<iframe width=\"900\" height=\"900\" frameborder=\"0\" style=\"border:0\" src=\"https://www.google.com/maps/embed/v1/directions?key=AIzaSyCp0sHXlJIUWxI4h2z-C7Qp38KV7qfUA5k&mode=driving&origin=810+McIntire+Rd,+Charlottesville,+VA+22902&destination=" + alert.get_item_value("address").replace(" ","+") + ",+Charlottesville,+VA\"> </iframe>");
	
	// Start timer
	stopwatch.start();
	
	
	active_timer = setTimeout(function(){
		active911.undraw_alert();
		$('#statusBD').append("<iframe width=\"1920\" height=\"1080\" frameBorder=\"0\" src=\"http://warhammer.mcc.virginia.edu/statusbd/statusbd.php\"> </iframe>");
	}, 300000);
};

/**
 * Undraw an alarm (remove from screen)
 *
 * Overridden from base
 * @param alert the alert to remove
 */
Active911.prototype.undraw_alert=function() {

	$('#call_type').empty();
	$('#address').empty();
	$('#details').empty();
	$('#units').empty();
	stopwatch.stop();
	stopwatch.reset();
	$('#time').empty();
	$("#map").empty();
	$("activeUnits").empty();
};

/**
 * Play a sound
 *
 * Overridden from base
 * @param sound the filename of the sound we are playing
 */
Active911.prototype.play_sound=function(sound) {

	if (active911.settings.silent_alarms === 'toned'){

		try {
			$("audio[sound='"+sound+"']")[0].play();
		} catch(e){}

	}

};

$(document).ready(function() {
	
	
	// Wire up controls: register button
	$("#register").button().click(function() {

		// Momentarily disable the form on submission; show spinner
		$("#register_area").find('input, select').attr('disabled','disabled');
		$("#register").button('disable');
		$("#register_area .spinner").show();

		$.ajax({
			type:		"POST",
			url:		active911.access_url,
			data:		{	"operation": "register", "device_code": $("#device_code").val() },
			dataType:	"jsonp",
			cache:		false,
			success:	function(data, callback) {

				if (data.result=='success') {

					// Registration successful.  Attempt init
					console.log("Registration successful");
					init();

				} else {

					// Show the error, shake the login screen
					$("#register_area-error-message").show();
					$("#register_area-error-message-text").html(data.message);
					$("#register_area-box").effect('shake',{},500);
					$('#register_area').find('input, select').removeAttr('disabled');
					$("#register").button('enable');
					$("#register_area .spinner").hide();
					console.log(data.message);
					$(active911).trigger('json_error',data);

				}
			}
		});


		return false;
	});

	init();

});

/**
 * Attempt to authenticate and connect to the webservice
 *
 */
function init() {
	// Connect to the webservice and try to authenticate.  If we fail, show the login box.
	$.ajax({
		type:		"POST",
		url:		active911.access_url,
		data:		{
			"operation"				: 	"init"
		},
		dataType:	"jsonp",
		cache:		false,
		success:	function(data, callback) {

			if (data.result=='success') {

				start_webclient(data.message);
				
//				resize_map_to_bounds();

			} else {

				if(data.message=="Unauthorized") {

					// Show the login form

					//$("#call_type").text("Unable to authenticate");
					$("#register_area").slideDown();

				} else {

					// Some other kind of error
					console.log(data.message);
					$(active911).trigger('json_error',data);
				}
			}
		}
	});
}

/**
 * Start the webclient
 *
 * @param data the data returned by the init call
 */
function start_webclient(data, bypass_ratecheck) {

	$("#register_area").hide();
	console.log("Starting webclient");

	$('#statusBD').append("<iframe width=\"1920\" height=\"1080\" frameBorder=\"0\" src=\"http://warhammer.mcc.virginia.edu/statusbd/statusbd.php\"> </iframe>");
	console.log("Loading Status Board");
	
	// Save our device data
	active911.device=data.device;

	// Update the time (in case local computer is off)
	active911.set_server_time(data.device.unix_timestamp);


 	var a = new A91Alert(data.alerts[data.alerts.length-1])
 	active911.add_alert(a);

	// Create an array of agencies
	for (i in data.device.agencies){

		var agency = new A91Agency(data.device.agencies[i]);

		// Draw the agency to the screen
		active911.add_agency(agency);

	}

	// Setup XMPP
	var xmpp_params={ 	"device_id"				:	active911.device.info.device_id,
						"registration_code"		:	active911.device.info.registration_code,
						"incoming_callback"		:	function(m) {
							console.log("Command: "+m.command);
							switch(m.command) {
								case "popup":

									// If the popup is for us...show a popup
									if(active911.device.info.device_id==m.device_id || 0==m.device_id){
									
										// Direct Message popup

									}
									break;
							
								case "message":

									// Incoming alert or similar.  Play sound.
									active911.play_sound(m.sound);

									// If there is no alert ID, pop up a dialog with the message
									if(!m.alert_id) {
										
										// No Alert ID

									} else {

										// If there is an alert ID, load the alert
										$.ajax({
											type:		"POST",
											url:		active911.access_url,
											data:		{	"operation": "fetch_alert", "message_id": m.message_id },
											dataType:	"jsonp",
											cache:		false,
											success:	function(data, callback) {

												if (data.result=='success') {

													// Add alert to display
													var a=new A91Alert(data.message);
													active911.draw_alert(a);

												} else {

													console.log("Logging out - "+data.message);
													stop_webclient();
												}
											}
										});
									}

									break;

								case "response":

									
									break;

								case "position":

									
									break;

								case "assignment":

									
									break;

								default:
									console.log("Unhandled command: "+m.command+" with message: "+m.message);
									break;
							}
						},
						"rooms":[]
	};

	for(var i in active911.device.agencies) {

		xmpp_params.rooms.push(active911.device.agencies[i].agency_id);
	}
	active911.xmpp=new Active911Xmpp(xmpp_params);

	// Delay before starting
	active911.timer_controller.add("connect",function(){

		// It is important that this only runs once!  So we use exception handling...

		// Connect XMPP
		console.log("Connecting XMPP");
		active911.xmpp.connect();


		// Add XMPP connection monitoring.  This includes server pings since it seems to be the only reliable way
		active911.timer_controller.add("pinger",function(){

			if(active911.xmpp.is_connected()) {

				active911.xmpp.ping( {
					"timeout": 5000,
					/*"success": function() {
						console.log("Ping OK");
						},*/
					"failure":function() {

						// Ping failure.  Make a clean disconnect and start a reconnect timer.
						console.log("Ping Timeout");
						active911.xmpp.disconnect();
						reconnect();
					}
				});
			} else {

				if(!active911.xmpp.is_disconnected()) {

					// Neither connected nor disconnected...
					console.log("Pinger shows XMPP as neither connected nor disconnected.");
					active911.xmpp.disconnect();
				}
				reconnect();
			}

			return true;

		}, 30);

		return false;

	}, active911.startup_delay);


	// Manage connection display (every 1s)
	active911.timer_controller.add("display_state",function(){

		if(active911.live==active911.xmpp.is_connected()) {

			return true;
		}

		if(active911.live=active911.xmpp.is_connected()) {

			// We just connected
			console.log("Status change: XMPP connected");

		} else {

			console.log("Status change: XMPP DISCONNECTED");

		}

		return true;

	}, 1);

}

/**
 * Reconnect
 *
 * Attempts reconnect every 10s until connected
 */
function reconnect() {

	console.log("Reconnect called");
	// Make sure there is not another reconnect attempt in progress (and that we are really not connected)
	if(active911.timer_controller.exists("reconnect") || active911.xmpp.is_connected()) {

		console.log("Reconnect already in operation.  Returning.");
		return;
	}

	// Set up a reconnect timer
	active911.timer_controller.add("reconnect",function(){

		if(!active911.xmpp.is_connected()) {	// We used to make sure we were disconnected before reconnecting.  But sometimes we can reach neither state, and we just need to go for it.

			console.log("Reconnect attempt");
			active911.xmpp.connect();
		}

		return !active911.xmpp.is_connected();	// Remove ourself once connected

	}, 10);

	// Connect right now
	// Don't do this since we may still be disconnecting
	/*	if(active911.xmpp.is_disconnected()) {

			console.log("Reconnect is performing mmediate reconnect attempt");
			active911.xmpp.connect();
			}
			*/

}

/**
 * Stop webclient (log out)
 *
 */
function stop_webclient() {


	// Disconnect XMPP
	active911.gps=null;
	active911.timer_controller.remove_all();
	active911.xmpp.disconnect();
	active911.xmpp=null;

	// Show the login form
	$("#loading_area").hide();
	$("#client_area").hide();
	$("#register_area").slideDown();

}

function createCookie(name, value, days) {
    var expires;
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toGMTString();
    } else {
        expires = "";
    }
    document.cookie = encodeURIComponent(name) + "=" + encodeURIComponent(value) + expires + "; path=/";
}

function readCookie(name) {
    var nameEQ = encodeURIComponent(name) + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name, "", -1);
}


