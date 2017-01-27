/**
 * Webclient framework javascript
 *
 * Implement a webclient for use with Active911
 * API calls go to Active911Config.access_api
 * Live data is followed via XMPP (BOSH)
 */


//$.ajaxSetup ({
// Disable caching of AJAX responses
//   cache: false
//});

// Singleton
active911 = new Active911();

// Webclient specific methods

/**
 * Draw an agency
 *
 * Overrided from base
 * @param the agency to draw
 */
Active911.prototype.draw_agency = function(agency){

	// Draw the agency to the display, prepend puts it in alphabetical order
	$("#agencies").prepend(agency.to_html());

	$(agency.get_html_selector()).click(function(){

	})

	// Hover for css effects
	.hover(function(){ $(this).addClass("ui-state-hover");}, function(){ $(this).removeClass("ui-state-hover");})

		// x to remove from the screen
		.find(".A91Agency_x > a")

		.toggle(
				// Agency starts shown, so hide it
				function(){

					$(".A91Agency[agency_id='"+$(this).parent().attr('agency_id')+"']").css("float","right");
					$(".A91Agency_assignments[agency_id='"+$(this).parent().attr('agency_id')+"']").hide();
					$(this).text("show");
					// Resize the map
					resize_map_to_bounds();

				},
				// A second click shows it again
				function(){

					$(".A91Agency[agency_id='"+$(this).parent().attr('agency_id')+"']").css("float","left");
					$(".A91Agency_assignments[agency_id='"+$(this).parent().attr('agency_id')+"']").show();
					$(this).text("hide");

					// Need to rescale the map
					resize_map_to_bounds();
				});
};

/**
 * Undraw an agency (remove from screen)
 *
 * Overridden from base
 * @param agency the agency to remove
 */
Active911.prototype.undraw_agency=function(agency) {

	$(agency.get_html_selector()).remove();

};


/**
 * Draw an alarm
 *
 * Overridden from base
 * @param alert the alert to draw
 */
Active911.prototype.draw_alert=function(alert) {

	// Has this alert already been drawn on the screen once?
	if($(alert.get_html_selector()).length) {

		return;	/* TODO - Should really modify alert */
	}

	// Get the alert HTML
	$("#alerts").prepend(alert.to_html());

	// Click for details
	$(alert.get_html_selector()).click(function() {

		var alert=null;
		var alert_id = parseInt($(this).attr("alert_id"));

		if(alert=active911.get_alert(parseInt($(this).attr("alert_id")))) {


			//Create the response buttons
			var buttons = {};
			$(eval(alert.get_item_value('response_vocabulary'))).each(function(idx, response){
				buttons[response] = function() {	active911.respond(response, alert_id);	$(this).dialog("close").remove();	}
			});
			buttons['Close'] = function() {	$(this).dialog("close").remove();	};
			$(alert.to_detail_html()).dialog({
				"resizable"		: 	true,
				"width"			: 	500,
				"overflow"		:	"scroll",
				"dialogClass"	:	"dialog-no-title-bar",	// No title bar
				"modal"			:	true,
				"title"			:	alert.get_item_value('description'),
				"buttons"		:	buttons
			});
		}

		//Pan to the location
		if($.inArray("open_alert", active911.settings.auto_scroll.split(";")) >= 0){
			active911.map.map.panTo(new google.maps.LatLng(alert.get_item_value("lat"),alert.get_item_value("lon")));
		}
	})

	// Hover for CSS effects
	.hover(function(){ $(this).addClass("ui-state-hover"); }, function(){ $(this).removeClass("ui-state-hover"); })

		// x to remove from screen
		.find(".A91Alert_x > a")
		.click(function() {

			var alert=null;
			if(alert=active911.get_alert(parseInt($(this).parent().parent().attr("alert_id")))) {

				active911.undraw_alert(alert);
			}

			return false; // Stop bubbling
		});


};

/**
 * Respond to an alert
 *
 * @param action respond|watch|etc
 * @param alert_id
 */
Active911.prototype.respond=function(action, alert_id) {

	// Connect to the webservice and send response.
	$.ajax({
		type:		"POST",
		url:		active911.access_url,
		data:		{	"operation"	: "response_action",
			"action"	:	action,
			"alert_id"	:	alert_id
		},
		dataType:	"jsonp",
		cache:		false,
		success:	function(data, callback) {

			if (data.result=='success') {

				console.log("Response sent");

			} else {

				console.log(data.message);
				$(active911).trigger('json_error',data);
			}
		}
	});

};

Active911.prototype.fetch_locations=function(rect, callback) {

	// Save the callback
	var _callback=(typeof(callback)=='function')?callback:(function(){});
	// Connect to the webservice and send response.
	$.ajax({
		type:		"GET",
		url:		active911.access_url,
		data:		{	"operation"	: "get_locations",
			"north"		: rect.northeast.lat,
			"south"		: rect.southwest.lat,
			"east"		: rect.northeast.lon,
			"west"		: rect.southwest.lon
		},
		dataType:	"jsonp",
		cache:		false,
		success:	function(data) {

			if (data.result=='success') {

				_callback(data.message.locations);

			} else {

				_callback([]);	// Still call the callback, just send empty array
				console.log(data.message);
				$(active911).trigger('json_error',data);

				// Handle "too many markers" error
				try {
					if(data.message.indexOf("Too many Map Data locations")==0){
						$("<div id='active911-popup-message' />").html("<span style='text-align: center; margin: 100px auto;'><p>We were unable to load Map Data (markers) because you have too many showing at this zoomlevel.</p><p>Please click on the gear icon on the top right of your screen and ajust your map marker density to 'urban' or 'dense urban'.</p></span>").dialog({
							title: "Error",
							modal: true,
							autoOpen: true,
							"resizable"		: 	true,
							"width"			: 	300,
							"height" 		: 	'auto',
							"buttons"		:	{

								"Close"	:	function() {	$(this).dialog("close");	}
							}
						});
					}
				} catch(e) {

					console.log("Exception caught while attempting to handle error");
				};
			}
		}
	});


};


/**
 * An alert was clicked on the map
 *
 * Trigger a click event for the corresponding box on the left column
 * @param alert A91Alert that was clicked
 */
Active911GoogleMap.prototype.alert_clicked=function(alert) {

	$(alert.get_html_selector()).click();
};

/**
 * The map was right clicked
 *
 * Send an alert somewhere
 * @param lat the latitude of the click location
 * @param lon the longitude of the click location
 */
Active911GoogleMap.prototype.clicked=function(lat, lon){

	// Someone clicked on the map.  Find any agencies for which we have create_alert capabilites
	var can_send_alerts=false;
	for (n in active911.device.agencies){		// Iterate agencies

		var agency=active911.device.agencies[n];
		for (i in agency.capabilities) {

			var capability=agency.capabilities[i];
			if(capability=='create_alerts') {

				can_send_alerts=true;
			}
		}

	}

	// If we can't create alerts for any agencies, just return
	if(!can_send_alerts){

		console.log("Map clicked but we don't have create_alerts capabilities on any agency");
		return false;
	}


	$("<div id='send_alert' lat='"+lat+"' lon='"+lon+"' />").html("<span style='text-align: center; margin: 100px auto;'><img src='images/loader_large.gif' style='display: block; margin: 100px auto;' /></span>").dialog({
		title: "Send Alert to ("+lat.toFixed(6)+","+lon.toFixed(6)+")", // "+active911.forms.agency.current_alert_id+" detail",
		modal: true,
		autoOpen: true,
		"resizable"		: 	true,
		"width"			: 	500,
		"overflow"		:	"scroll",
		"buttons"		:	{

			"Alert NOW"	:	function() {

				$("#send_alert").trigger("send_alert");
			},
			"Close"	:	function() {	$(this).dialog("close");	}
		},
		open: function() {

			// Load content
			$(this).load('html/send_alert.html');
		},
		close: function() {

			// Remove from DOM on close
			$(this).dialog("destroy").remove();
		}

	});

};

/**
 * Undraw an alarm (remove from screen)
 *
 * Overridden from base
 * @param alert the alert to remove
 */
Active911.prototype.undraw_alert=function(alert) {

	$(alert.get_html_selector()).remove();

	// We should really remove from the map at this point too
	//Make sure the map is not null.  This only happens if the initial call set has a duplicate.
	if(this.map != null){
		this.map.remove_alert(alert);
	}
};

/**
 * Show a popup window when a location is clicked
 *
 * Overridden from Active911GoogleMap
 * @param loc A91Location
 */
Active911GoogleMap.prototype.location_clicked=function(loc) {


	$(loc.to_html()).dialog({
		"resizable"		: 	true,
		"width"			: 	500,
		"overflow"		:	"scroll",
		"dialogClass"	:	"dialog-no-title-bar",	// No title bar
		"modal"			:	true,
		"title"			:	loc.get_item_value('name'),
		"buttons"		:	{
			"Close"	:	function() {	$(this).dialog("close").remove();	}
		}

	}).find(".A91Location_resource_title")
	.before('<span class="ui-state-normal"><span class="ui-icon ui-icon-extlink" style="float:left;"></span></span>');


};


/**
 * Draw a response indication under the appropriate alert
 *
 * Overridden from base
 * @param device the A91Device whose response has changed
 */
Active911.prototype.draw_response=function(device) {

	// Should this response be displayed?  Timeout is one hour.  We also need a response specific ID.
	if(device.age() > 3600 || device.get_item_value("response_specific_id")==0) {

		return;
	}

	// Remove any existing references to this device's response from the DOM
	$("div.A91Device[device_id="+device.get_item_value("id")+"]").remove();

	//Check if this is a watch status.  If the setting to show watch devices is "off", return.
	if(active911.settings.show_watch_devices != "on" && device.get_item_value("response_action") == "watch"){
		return;
	}

	// Find the location where the response will go
	var $container=$("div.A91Alert[alert_id="+device.get_item_value("response_specific_id")+"] div.A91Alert_response");

	if($container.length==1){

		$container.prepend(device.to_html());
	}
};


/**
 * Draw an assignment under the appropriate agency
 *
 * Overridden from base
 * @param assignment the A91Assignment
 */
Active911.prototype.draw_assignments=function(assignments){

	for (n in assignments){

		// Find the agency container
		container = $("div.A91Agency_assignments[agency_id="+assignments[n].get_agency_id()+"]");

		if ($(assignments[n].get_html_selector()).length == 0){

			// Draw the assignment
			$(container).append(assignments[n].to_html());

			// Draw to the selectable list
			$("select.device_assignment[agency_id='"+assignments[n].get_agency_id()+"']").append(assignments[n].to_select_list());

			// But they start out empty, so hide them
			$(assignments[n].get_html_selector()).hide();

		} else {

			console.log("already drawn");
		}
	}	

	// Alphabetize the selectable list and assignments
	$.each($('.A91Agency_assignments'), function(){

		dom_sorter(this,'div','title');
	});

	$.each($('.device_assignment'),function(){

		dom_sorter(this,'option','label');
	});

};


/**
 * Draw an assignment indication under the appropriate agency
 *
 * Overridden from base
 * @param device the A91Device whose assignment has changed
 */
Active911.prototype.draw_device_to_assignment=function(device) {

	// Remove the old assignment
	$(device.get_assignment_html_selector()).remove();

	// Find the location the response will go
	var container = $("div.A91Assignment[assignment_id="+device.get_item_value("assignment_id")+"][agency_id="+device.get_item_value("agency_id")+"] div.A91Assignment_devices");

	container.append(device.to_assignment_html());
	container.parent().show();

	// Sort the devices by name
	dom_sorter(container.selector,'div','name');


	// Prepare to check each agencies permission
	active911.device.agencies.forEach(function(current_value,i,array){
	
		// Find the agency the device belongs to
		if (array[i].agency_id == device.get_item_value('agency_id')){

			var self = array[i];

			// Get the capabilities
			self.capabilities.forEach(function(cv,n,array){

				// Do we have override assignments?
				if (cv == 'override_assignments'){

					// Yes, set up the button
					$(device.get_assignment_html_selector()).click(function(){
					
						// Is this device not the first one selected?
						if ($('.ui-selected').length > 0){
						
							// Yes, check for matching agency_id's
							if (device.get_item_value('agency_id') != $('.ui-selected').attr("agency_id")){
							
								// Reset the device state text
								$('.devices_state[agency_id="'+$('.ui-selected').attr("agency_id")+'"]').text("Change Assignment:");

								// It is a different department, deselect all the previously selected devices
								$('.ui-selected').each(function(){
								
									$(this).toggleClass("ui-selected");

								});
								
							}
						}

						// We are ready to update the clicked devices state
						$(this).toggleClass("ui-selected");

						// Are any devices still selected?
						if($('.ui-selected').length === 0){

							// Denote the fact we are only changing one device
							$('.devices_state[agency_id="'+device.get_item_value("agency_id") +'"]').text("Change Assignment:");

						}else {

							// Denote the fact we are changing many devices
							$('.devices_state[agency_id="'+device.get_item_value("agency_id")+'"]').text("Change Multiple Assignments:");

						}
					});
				}
			});
		}
	});

	// Check to see if we have the alert the device is responding to
	for (var alert in agencies.alerts){

		if (alert.get_item_value("id") == device.get_item_value("response_specific_id")){

			$(container + "div.A91Device_assignment_status_info").append('<div class="A91Device_assignment_alert_name">' + alert.get_item_value("description") + '<div>');
		}
	}

	// Clear out empty assignments
	$('.A91Assignment_devices').each(function(){

		if ($(this).text().length === 0){

			$(this).parent().hide();
		}
	});
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

/**
 * Save local device settings to our servers
 *
 */
Active911.prototype.save_settings= function() {

	$.ajax({

		type: "POST",
		url: active911.access_url,
		data: {
			"operation":"save_device_local_data",
			"data": JSON.stringify({
				"webview_settings": active911.settings
			})
		},
		dataType: "jsonp",
		cache: false,
		success: function(data,callback){

			if (data.result != 'success') {

				// Show the error, shake the dialog
				$("#active911-webview-settings .error-message").show();
				$("#active911-webview-settings .error-message-text").html(data.message);
				$("#active911-webview-settings").parent().find("button").button("enable");
				$("#active911-webview-settings").find('input, select').removeAttr('disabled');
				$("#active911-webview-settings").effect('shake',{},500);
				console.log(data.message);
				$(active911).trigger('json_error',data);
			}
		}
	});
};

function resize_map_to_bounds() {
	var margin_left = 0;
	if($("#left_sidebar").is(":visible")){
		margin_left = $("#left_sidebar").width();
	}
	var margin_right = 0;
	if($("#right_sidebar").is(":visible")){
		margin_right = $("#right_sidebar").width();
	} else {
		$('#map').width('width', ($(window).width) + 'px');
	}
	$("#map").css("margin-left", margin_left + "px").css("margin-right", margin_right + "px");
	google.maps.event.trigger(active911.map.map, 'resize');
}

$(window).resize(function() {
	resize_map_to_bounds();
});

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

	// Clicking on the gear will take you to settings
	$("#settings_icon img").click(function(){
		//Don't do anything if the dialog is already open.
		if($("#active911-webview-settings").length > 0){
			return;
		}
		$("<div id='active911-webview-settings' />").html("<span style='text-align: center; margin: 100px auto;'><img src='images/loader_large.gif' style='display: block; margin: 100px auto;' /></span>").dialog({
			title: "Settings",
			modal: true,
			autoOpen: true,
			"resizable"		: 	true,
			"width"			: 	'auto',
			"height" 		: 	'auto',
			"minHeight"		: 	500,
			"minWidth"		: 	500,
			"overflow"		:	"scroll",
			"buttons"		:	{

				"Save"	:	function() {

					$("#active911-webview-settings").trigger("save");
				},
				"Cancel"	:	function() {	$(this).dialog("close");	}
			},
			open: function() {

				// Load content
				$(this).load('html/settings.html');
			},
			close: function() {

				// Remove from DOM on close
				$(this).dialog("destroy").remove();
			}

		});
	});

	// Set up assignment changing
	$(document).on('click','.update_assignment',function(){

		// Grab the select we will be modifying
		var select = ('.device_assignment[agency_id="'+$(this).attr("agency_id") +'"]');

		// Get the pre-change value in case we need to revert it
		var prior_value = $(select).attr("prior_value");

		// Check if we are updating multiple devices
		var device_ids = [];
		$('.ui-selected[agency_id="'+ $(select).attr("agency_id") + '"]').each(
				function(){
					device_ids.push($(this).attr('device_id'));
				}
				);

		// Get the proper agency being updated
		for (var agency in active911.agencies) {
			var self= this;

			if (active911.agencies[agency].item_value_equals("agency_id",$(self).attr("agency_id"))){

				// Save the new assignment id
				var assignment_id = $(select).attr("value");

				// Call home to update the database
				$.ajax({
					type: "POST",
					url: active911.access_url,
					data: {
						"operation"	:	"override_assignments",
						"agency_id"	:	$(self).attr("agency_id"),
						"assignment_id" : assignment_id,
						"device_ids" : device_ids.toString()
					},
					dataType: "jsonp",
					cache: false,
					success: function(data, callback){

						if (data.result=='success') {

							// Did we just update ourself?
							if (device_ids.length === 0){

								// Yes, update just our device
								active911.update_device_assignment(active911.device.info.device_id,$(self).attr("agency_id"),assignment_id);

								// Update the prior assignment id value
								$(self).attr("prior_value",assignment_id);

							} else {

								// No, Update each selected device, assume our device is not one of them
								$(self).val(prior_value);
								$('.ui-selected[agency_id="'+ $(self).attr("agency_id") + '"]').each(function(){
									active911.update_device_assignment($(this).attr("device_id"),$(self).attr('agency_id'),assignment_id);

									// If we are updating our device, update the prior value attribute to match 
									if($(this).attr("device_id") == active911.device.info.device_id){


										$(select).val(assignment_id);
										$(select).attr("prior_value",assignment_id);
									}
								});

							}

							//Revert the device state text to default
							$('.devices_state[agency_id="'+$(select).attr("agency_id")+'"]').text("Change Assignment:");

							// Failed the override assigments, log an error and revert the assignment value
						} else {

							$(self).val(prior_value);
							console.log("there was an error saving the assignment");
							return;
						}
					}
				});

			}
		}
	});

	// Toggle the sidebars on/off and save the settings to the server
	$("#left_toggle_button").click(function(){

		$("#left_sidebar").toggle();

		if (active911.settings.alarm_sidebar == 'show'){

			active911.settings.alarm_sidebar = 'hide';

		} else {

			active911.settings.alarm_sidebar = 'show';

		}

		active911.save_settings();

		resize_map_to_bounds();

	});

	$("#right_toggle_button").click(function(){

		$("#right_sidebar").toggle();

		if (active911.settings.status_sidebar == 'show'){

			active911.set_setting('status_sidebar', 'hide');


		} else {

			active911.set_setting('status_sidebar','show');

		}

		active911.save_settings();

		resize_map_to_bounds();

	});


	init();

});

/**
 *
 *
 */
function update_agency_assignments(device){

	// Connect to the webservice and get assignments for the agency
	$.ajax({
		type:	"POST",
		url: active911.access_url,
		data: {
			"operation"	:	"update_agency_assignments",
			"agency_id" : device.get_item_value("agency_id")
		},
		dataType: "jsonp",
		cache:	false,
		success: function(data, callback){

			if (data.result == 'success'){

				assignments = [];
				for (n in data.message.assignments){

					assignment = new A91Assignment(_items = data.message.assignments[n]);

					if (!assignment.in_array(active911.assignments)){

						assignments.push(assignment);
					}

				}

				active911.add_assignments(assignments);
				active911.draw_assignments(active911.assignments);
				active911.draw_device_to_assignment(device);

				console.log('successfully updated agency assignments');

			} else {

				console.log(data.message);
				$(active911).trigger('json_error',data);
			}
		}
	});

}

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
				resize_map_to_bounds();

			} else {

				if(data.message=="Unauthorized") {

					// Show the login form
					$("#loading_area").hide();
					$("#client_area").hide();
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

	
	if(!bypass_ratecheck && !check_rate_limit()){
		$("#loading_area").hide();
		$("#register_area").hide();
		$("#reload_warning").slideDown();
		$("#reload_acknowledge").button().click(function(){
			start_webclient(data, true);
		});
		return;
	}

	// Show the webclient area
	$("#reload_warning").hide();
	$("#loading_area").hide();
	$("#register_area").hide();
	$("#client_area").slideDown();
	console.log("Starting webclient");
	
	//Load the Google Maps javascript file
	$.getScript( Active911Config.google_maps_uri )

	// Save our device data
	active911.device=data.device;

	// Update our settings with those returned from the server
	try {

		var device_local_data=JSON.parse(active911.device.device_local_data);
		$.extend(active911.settings,device_local_data.webview_settings);

		// Hide sidebars based on settings
		if (active911.settings.alarm_sidebar == 'hide') {

			$('#left_sidebar').hide();

		}

		if (active911.settings.status_sidebar == 'hide'){

			$('#right_sidebar').hide();

		}


	} catch(e) {

		console.log("Unable to restore saved webview settings");
	};

	// Update the time (in case local computer is off)
	active911.set_server_time(data.device.unix_timestamp);

	// Create an array of alerts
	for (i in data.alerts) {

		var a=new A91Alert(data.alerts[i]);
		active911.add_alert(a);
	}

	// Create an array of agencies
	for (i in data.device.agencies){

		var agency = new A91Agency(data.device.agencies[i]);

		// Draw the agency to the screen
		active911.add_agency(agency);

		// Create an array of assignments
		agency_assignments = agency.get_assignments();

		// Add an unassigned assignment
		agency_assignments.push({
			agency_id : agency.get_agency_id(),
			description : 'Not assigned to any other assignment',
			id : "0000000000000000",
			title : 'Unassigned'
		});

		assignments_array = [];
		for (n in agency_assignments){

			assignment = new A91Assignment(_items = agency_assignments[n]);
			assignments_array.push(assignment);

			// Draw the assignment to the screen
			//active911.draw_assignment(assignment);

		}

		// add to assignments here
		active911.add_assignments(assignments_array);

	}

	active911.draw_assignments(active911.get_assignments());

	// Create an array of devices
	for (i in data.devices) {

		var d=new A91Device(data.devices[i]);
		active911.add_device(d);

		// Update the response listing for this alarm
		active911.draw_response(d);
		active911.draw_device_to_assignment(d);

		// Set the webclients assignment
		if (d.get_item_value('id') == active911.device.info.device_id){

			assignment_id = d.get_item_value('assignment_id');

			// If we are not overriding automatic assignment, set the device to auto
			if (!d.get_item_value('assignment_override')){

				assignment_id = 0;
			}


			$($("select.device_assignment[agency_id="+d.get_item_value('agency_id')+"]")).val(assignment_id).attr("prior_value",assignment_id);
		}
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

						$("<div id='active911-popup-message' />").html("<span style='text-align: center; margin: 100px auto;'>"+m.message+"</span>").dialog({
							title: "Message",
							modal: true,
							autoOpen: true,
							"resizable"		: 	true,
							"width"			: 	300,
							"height" 		: 	'auto',
							"buttons"		:	{

								"Close"	:	function() {	$(this).dialog("close");	}
							}
						});

					}
					break;
				case "message":

					// Incoming alert or similar.  Play sound.
					active911.play_sound(m.sound);

					// If there is no alert ID, pop up a dialog with the message
					if(!m.alert_id) {
						$("<div><p><span class='ui-icon ui-icon-alert' style='float: left; margin: 0 7px 50px 0;'></span>"+m.message+"</p></div>").dialog({
							modal: true,
							title: "Incoming message",
							buttons: {
								Ok: function() {
									$( this ).dialog( "close" );
								}
							}
						});

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

									// Add alert to webclient, then to map
									var a=new A91Alert(data.message);
									active911.add_alert(a);

									//Only pan if setting is true and we don't have a dialog open currently
									if($.inArray("new_alert", active911.settings.auto_scroll.split(";")) >= 0){
										active911.map.alert(a,true);	// Pan to location
									}
									else{
										active911.map.alert(a,false);
									}
									// Mark ourselves as WATCH
									/* TODO */
									/* We prolly need a new function added to the XMPP connector... respond(action, alarm_id) */

								} else {

									console.log("Logging out - "+data.message);
									stop_webclient();
								}
							}
						});
					}

					break;

				case "response":

					if(device=active911.update_device_response(m.device_id, m.agency_id, m.alert_id, m.action)){

						active911.map.reload_device_marker(device);	// Update map
						active911.draw_response(device);			// Update alarm view
					}
					break;

				case "position":

					// Update the device.  Update the map only if the position actually changed (we may get multiple position commands for each change if this webclient and the device both have multiple memberships)
					if(active911.update_device_position(m.device_id, m.lat, m.lon)) {

						active911.map.reposition_device_marker(active911.get_device(m.device_id, m.agency_id));
					}

					break;

				case "assignment":

					// Since we are doing a string comparison, make sure the string is 16 characters.
					while(m.assignment_id.length < 16){

						m.assignment_id = "0" + m.assignment_id;
					}

					if(device = active911.update_device_assignment(m.device_id,m.agency_id,m.assignment_id)){

						// Check to see we have the assignment
						if($("div.A91Assignment[assignment_id="+m.assignment_id+"][agency_id="+m.agency_id+"]").length == 0){

							// Implement a php callback to get the assignment.
							console.log("calling home for new assignments");
							update_agency_assignments(device);

						} 

						active911.draw_device_to_assignment(device);

						console.log("redrawing device "+m.device_id);
					}
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
		//try {
		//		// Load the map script
		//		$.getScript("https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false",function() {

		// Determine the map center (this will be average of all agency locations)
		var average_lat=0;
		var average_lon=0;
		for (a in active911.device.agencies){

			average_lat+=active911.device.agencies[a].lat;
			average_lon+=active911.device.agencies[a].lon;
		}
		average_lat/=active911.device.agencies.length;
		average_lon/=active911.device.agencies.length;


		// Once loaded, init map
		console.log("Loading map");
		active911.map=new Active911GoogleMap({
			"map_id"			:	"map",						// ID of element
			"starting_lat"		: 	average_lat,
			"starting_lon"		: 	average_lon
				/*"locations"	:	locations*/
		});

		// Add all alarms and devices to the map

		for(i in active911.alerts) {

			active911.map.alert(active911.alerts[i]);
		}
		for(i in active911.devices) {

			active911.draw_response(active911.devices[i]);
			active911.map.reload_device_marker(active911.devices[i]);
		}

		for(i in active911.agencies) {

		}

		// Connect XMPP
		console.log("Connecting XMPP");
		active911.xmpp.connect();

		// Activate GPS tracking
		active911.gps=new Active911GPS(function(position) {

			if(active911.xmpp.is_connected()) {

				active911.xmpp.send_position(position.lat, position.lon, position.error);
			}
		});


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

		// Remove inactive devices (every 60 seconds)
		active911.timer_controller.add("inactivity",function(){

			for (i in active911.devices) {

				var device=active911.devices[i];
				if(device.position_age() > 360) {

					if(device.get_map_marker()) {

						active911.map.remove_device_marker(device);
					}
				}
			}

			return true;
		}, 60);

		// Remove alarms more than 4 hours old (every 10 minutes)
		active911.timer_controller.add("old_alarms",function(){

			active911.cull_old_alerts();
			return true;
		}, 600);
		//		});

		/*	} catch (e) {

				console.log("Exception on startup:" +e.message);
				}*/
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
			$("#status img").attr("src","images/connected_animation.gif");

		} else {

			console.log("Status change: XMPP DISCONNECTED");
			$("#status img").attr("src","images/disconnected_animation.gif");

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

/**
 * Sort dom elements by a specified attribute
 *
 * @param container_element is the DOM object holding what needs to be sorted
 * @param dom_element is the element we want to sort on
 * @param the attribute is what we want to use as the sorter
 *
 */
function dom_sorter(container_element,dom_element,attribute){

	var container = $(container_element);
	var sortable_elements = container.children(dom_element).get();

	// Sort based on the attribute specified
	sortable_elements.sort(function(a,b){

		value1 = $(a).attr(attribute).toLowerCase();
		value2 = $(b).attr(attribute).toLowerCase();

		if (value1 < value2){

			return -1;
		} else if (value1 > value2){

			return 1;
		} else {

			return 0;
		}
	});

	// Once sorted, redisplay
	$.each(sortable_elements, function(idx, item){

		container.append(item);
	});

}

/**
 * Check how many refreshes in the past 48 hours and, if more than 20, warn user
 *
 *
 */
function check_rate_limit(){
	//Read the timestamps cookie
	var prevTimestamps = [];
	var timestampsCookie = readCookie("visit_timestamps");
	if(timestampsCookie){
		var two_days_ago = new Date().getTime() - 24*60*60*1000;
		$(timestampsCookie.split(',')).each(function(i, timestamp){
			if(Number(timestamp) >= two_days_ago){
				prevTimestamps.push(timestamp);
			}
		});
	}
	prevTimestamps.push(new Date().getTime());
	createCookie("visit_timestamps", prevTimestamps.join(','), 2);
	return prevTimestamps.length <= 20;
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

