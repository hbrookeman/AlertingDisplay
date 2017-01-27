 /**
  * Active911
  *
  * Use as singleton
  * Used for storing data, piping events, etc
  */
function Active911(params) {

	$.extend(this,
		$.extend(
			{
				"local_time_offset_msec"			:	0,							// Time difference between local and server (local - server = offset)
				"xmpp"								:	{},
				"settings"							:
								{

									"max_alarms"				:		5,			// Max alarms to display
									"language"					:		'en-US',
									"map_marker_density" 		: 		"normal",
									"alarm_autoremove_age"		: 		4*3600,
									"auto_scroll"				:		"new_alert",
									"show_watch_devices"		:		"on",
									"silent_alarms"	: "toned",
                  					"alarm_sidebar":"show",
                					"status_sidebar":"show",
								},
				"gps"								: 	{},
				"live"								:	false,
				"timer_controller"					:	new TimerController(),
				"startup_delay"						:	2,
				"alerts"							:	[],							// A91Alert[]
        		"agencies"            				: 	[],             			// A91Agency[]
				"devices"							:	[],							// A91Device[] (may contain multiple copies of a device in case of multiple memberships)
				"assignments"						:	[],							// A91Assignment[] (may contain multiple copies of an assignment in case of multiple agencies)
				"access_url"						: 	Active911Config.access_uri
			}, params));


	this.current_marker_letter="A";


}


/* * PLEASE OVERRIDE THESE FUNCTIONS IN YOUR API SPECIFIC IMPLEMENTATION * */
Active911.prototype.draw_alert=function(alert) {};
Active911.prototype.undraw_alert=function(alert) {};
Active911.prototype.draw_agency=function(agency) {};
Active911.prototype.undraw_agency=function(agency){};
Active911.prototype.draw_response=function(device) {};
Active911.prototype.draw_assignment=function(device) {};
Active911.prototype.draw_assignments=function(assignments){};
Active911.prototype.play_sound=function(sound) {};
Active911.prototype.fetch_locations=function(rect, callback){};
/* * PLEASE OVERRIDE THESE FUNCTIONS IN YOUR API SPECIFIC IMPLEMENTATION * */

Active911.prototype.cull_old_alerts=function() {

	// Make a list of alerts to remove
	var alerts_to_remove=[];
	for (var i in this.alerts) {

		var alert=this.alerts[i];
		if(alert.age() > this.settings.alarm_autoremove_age) {
			console.log("Alert age: "+alert.age() + " > "+this.settings.alarm_autoremove_age);
			//this.remove_alert(alert);
			alerts_to_remove.push(alert);
		}
	}

	// Remove them
	for (i in alerts_to_remove){

		this.remove_alert(alerts_to_remove[i]);
	}
};

/**
 * Get a setting
 *
 * @param setting
 * @retval the value
 */
Active911.prototype.get_setting=function(setting) {

	return this.settings[setting];	/* Todo - make this more judicious */

};

/**
 * Change a setting
 *
 * NB if the setting does not exist (i.e., there is no default) we don't change it
 * @param setting	the setting to change
 * @param value		the new value
 * @retval the value
 */
Active911.prototype.set_setting=function(setting,value) {

	if(typeof(this.settings[setting])=="undefined") {

		return;
	}

	this.settings[setting]=value;

};


/**
 * Calculate the server time offset
 *
 * In case the local computer clock is off, we use the server time for all calcs
 * @param unix_timestamp current time (UTC, in seconds since Unix epoch)
 */
Active911.prototype.set_server_time=function(unix_timestamp) {

	this.local_time_offset_msec=(new Date()).getTime()-(new Date(unix_timestamp*1000)).getTime();
};


/**
 * Return a current Date object
 *
 * In case the local computer clock is off, this function will return a Date corresponding to current server time
 */
Active911.prototype.ServerDate=function() {

	return new Date(new Date((new Date()).getTime()-this.local_time_offset_msec));

};
/**
 * Remove an alert from the webview
 *
 * @param alert the alert to remove
 */
Active911.prototype.remove_alert=function(alert) {

	console.log("Removing alarm: " +alert.description);

	// Remove from screen
	this.undraw_alert(alert);

	// Remove from array
	for(i in this.alerts) {

		if(this.alerts[i].is(alert)) {

			this.alerts.splice(i,1);
			return;
		}
	}

}

/**
 * Add an alert
 *
 * Adds to the local data, draws on screen
 * @param alert A91Alert
 */
Active911.prototype.add_alert=function(alert) {

	var alert_id = alert.get_item_value("id");

	//If the alert has been already added, remove it first
	var old_alert = this.get_alert(alert_id);
	//Before removing the alert, we need the responses
	var old_responses;

	if(old_alert !== null){
		
		// Store the old alerts response data
		old_responses = jQuery(".A91Alert[alert_id='"+alert_id+"'] .A91Alert_response").children();
		console.log(old_responses);
		console.log(typeof old_responses);

		this.remove_alert(old_alert);
	}

	// Add to array
	console.log("Adding alarm: " +alert.get_item_value("description"));
	alert.set_marker_letter(this.current_marker_letter);
	this.alerts.push(alert);

	// Draw on screen
	this.draw_alert(alert);

	// Append the old response data
	$(".A91Alert[alert_id='"+alert_id+"'] .A91Alert_response").append(old_responses);
	console.log(old_responses);

	// Increment marker letter (A -> B -> ... Y -> Z -> A)
	this.current_marker_letter=(String.fromCharCode(this.current_marker_letter.charCodeAt(0)+1));
	if(this.current_marker_letter=="[") {	// [ is next after Z

		this.current_marker_letter="A";
	}

};

/**
 * Finds a specific alert
 *
 * @param alert_id the alert_id
 * @retval A91Alert if found, or null
 */
Active911.prototype.get_alert=function(alert_id) {

	for(var i in this.alerts) {

		if(this.alerts[i].is(alert_id)) {

			return this.alerts[i];
		}
	}

	return null;
};

Active911.prototype.add_agency = function(agency) {
  
  var old_agency = this.get_agency(agency.get_agency_id());
  if(old_agency != null){
		console.log("removing the old agency");
    this.remove_agency(old_agency);
  }
  this.agencies.push(agency);

  console.log("Adding agency: "+agency.get_item_value("name"));

};

Active911.prototype.get_agency = function(agency_id){
  for (var i in this.agencies) {
    if (this.agencies[i].get_agency_id() == agency_id) {
      console.log(this.agencies[i]);
      return this.agencies[i];
    }
  }

  return null;
};

/**
 * Remove an agency from the webview
 *
 * @param alert the agency to remove
 */
Active911.prototype.remove_agency=function(agency) {

	console.log("Removing agency: " +agency.name);

	// Remove from screen
	this.undraw_agency(agency);

	// Remove from array
	for(i in this.agencies) {

		if(this.agencies[i].is(agency)) {

			this.agencies.splice(i,1);
			return;
		}
	}

};

Active911.prototype.add_device=function(device) {

	this.devices.push(device);
};



/**
 * Finds a specific device
 *
 * @param agency_id the agency it belongs to
 * @param device_id the device we are trying to match
 * @retval A91Device if found, or null
 */
Active911.prototype.get_device=function(device_id, agency_id) {

	for(i in this.devices) {

		if(this.devices[i].is(device_id, agency_id)) {

			return this.devices[i];
		}
	}

	return null;
};

/**
 * Update the assignment of a given device
 *
 * @retval A91Device
 */
Active911.prototype.update_device_assignment=function(device_id, agency_id, assignment_id){
	
	for (i in this.devices) {
			
		if (this.devices[i].is(device_id, agency_id)) {
			
			this.devices[i].set_assignment(agency_id,assignment_id);

			return this.devices[i];
		}
	}
}

/**
 * Update the position of a given device
 *
 * @retval number of devices changed
 */
Active911.prototype.update_device_position=function(device_id, lat, lon) {

	var device=null;
	var devices_changed=0;

	for(i in this.devices) {

		if(this.devices[i].is(device_id)) {

			device=this.devices[i];
			devices_changed+=this.devices[i].set_position(lat,lon);
			// Continue searching, since we may have more than one copy of a given device (multiple membership)
		}
	}

	return devices_changed;
}


/**
 * Update the status (response) of a given device
 *
 * @retval A91Device
 */
Active911.prototype.update_device_response=function(device_id, agency_id, alert_id, action) {

	for(i in this.devices) {

		if(this.devices[i].is(device_id, agency_id)) {

			this.devices[i].set_response(alert_id, action);
			return this.devices[i];
		}
	
	}

	console.log("Unable to update device - no found (device_id "+device_id+", agency_id "+agency_id+")");
}



/**
 * Get assignments
 *
 * @retval a list of all the assignments
 */
Active911.prototype.get_assignments = function(){

	return this.assignments;
}

/**
 * Get assignment by agency and id
 *
 * @retval a single assignment
 */
Active911.prototype.get_assignment = function (agency_id,assignment_id){

	for (n in this.assignments){
	
		if ((this.assignments[n].get_agency_id() == agency_id) && (this.assignments[n].get_id() == assignment_id)){
		
			return assignments[n];
		}
	}

}

/**
 * Add assignments
 *
 * @param an array of assignments
 */
Active911.prototype.add_assignments = function(array){

	// Add sorting

	for (n in array){
		// Make sure the assignment is not archived
		if (array[n].get_item_value('archived') == false){
			this.assignments.push(array[n]);
		}
	}

};


