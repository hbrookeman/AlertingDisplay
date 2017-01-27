/** 
 * A91Alert
 *
 * Represents an Active911 alert
 */
A91Alert.prototype=new A91MappedDataObject();
A91Alert.prototype.constructor=A91Alert; 
function A91Alert(data) {

	this._items=[
	
		{
			"key"		:	"description",
			"type"		:	"string",
			"value"		:	null,
			"default"	:	"",
			"display_hints"	:	['detail','summary'],	
			"labels"	:	{
								"en-US"		:	"Alarm"
							}
		},	
		{
			"key"		:	"address",
			"type"		:	"string",
			"value"		:	null,
			"default"	:	"",
			"display_hints"	:	['detail','summary'],	
			"labels"	:	{
								"en-US"		:	"Address"
							}
		},
		{
			"key"		:	"place",
			"type"		:	"string",
			"value"		:	null,
			"default"	:	"",
			"display_hints"	:	['detail','summary'],	
			"labels"	:	{
								"en-US"		:	"Place"
							}
		},
		{
			"key"		:	"unit",
			"type"		:	"string",
			"value"		:	null,
			"default"	:	"",
			"display_hints"	:	['detail','summary'],	
			"labels"	:	{
								"en-US"		:	"Apt"
							}
		},
		{
			"key"		:	"city",
			"type"		:	"string",
			"value"		:	null,
			"default"	:	"",
			"display_hints"	:	['detail','summary'],	
			"labels"	:	{
								"en-US"		:	"City"
							}
		},
		{
			"key"		:	"cross_street",
			"type"		:	"string",
			"value"		:	null,
			"default"	:	"",
			"display_hints"	:	['detail'],	
			"labels"	:	{
								"en-US"		:	"Cross"
							}
		},
		{
			"key"		:	"source",
			"type"		:	"string",
			"value"		:	null,
			"default"	:	"",
			"display_hints"	:	['detail'],	
			"labels"	:	{
								"en-US"		:	"Source"
							}
		},
		{
			"key"		:	"units",
			"type"		:	"string",
			"value"		:	null,
			"default"	:	"",
			"display_hints"	:	['detail','summary'],	
			"labels"	:	{
								"en-US"		:	"Units"
							}
		},
		{
			"key"		:	"cad_code",
			"type"		:	"string",
			"value"		:	null,
			"default"	:	"",
			"display_hints"	:	['detail'],	
			"labels"	:	{
								"en-US"		:	"CAD"
							}
		},
		{
			"key"		:	"map_code",
			"type"		:	"string",
			"value"		:	null,
			"default"	:	"",
			"display_hints"	:	['detail'],	
			"labels"	:	{
								"en-US"		:	"MAP"
							}
		},
		{
			"key"		:	"id",
			"type"		:	"number",
			"value"		:	null,
			"default"	:	0,
			"display_hints"	:	['detail'],	
			"labels"	:	{
								"en-US"		:	"Active911 ID"
							}
		},
		{
			"key"		:	"details",
			"type"		:	"string",
			"value"		:	null,
			"default"	:	"",
			"display_hints"	:	['detail'],	
			"labels"	:	{
								"en-US"		:	"Details"
							}
		},	
		{
			"key"		:	"age",
			"type"		:	"number",
			"value"		:	null,
			"default"	:	0,
			"display_hints"	:	[],	
			"labels"	:	{}
		},
		{
			"key"		:	"lat",
			"type"		:	"number",
			"value"		:	null,
			"default"	:	0,
			"display_hints"	:	[],	
			"labels"	:	{
								"en-US"		:	"Latitude"
							}
		},
		{
			"key"		:	"lon",
			"type"		:	"number",
			"value"		:	null,
			"default"	:	0,
			"display_hints"	:	[],	
			"labels"	:	{
								"en-US"		:	"Latitude"
							}
		},
		{
			"key"		:	"agency_id",
			"type"		:	"number",
			"value"		:	null,
			"default"	:	0,
			"display_hints"	:	[],	
			"labels"	:	{
								"en-US"		:	"Agency ID"
							}
		},
		{
			"key"		:	"agency_name",
			"type"		:	"string",
			"value"		:	null,
			"default"	:	"",
			"display_hints"	:	['detail','summary'],	
			"labels"	:	{
								"en-US"		:	"Agency"
							}
		},
		{
			"key"		:	"response_vocabulary",
			"type"		:	"string",
			"value"		:	null,
			"default"	:	"['Respond','Arrive','Available','Unavailable']",
			"display_hints"	:	['vocab','taxonomy'],	
			"labels"	:	{
								"en-US"		:	"Response Vocabulary"
							}
		}
	
	
	];
	
	// Super constructor
	A91MappedDataObject.call(this, data);
	
	// Alarm age
	this._alarm_date=new Date((new Date).getTime()-(this.get_item_value("age")*1000));

	this._marker_letter="?";
	return this;

}

/**
 * Get age of alert
 *
 * @retval age in seconds
 */
A91Alert.prototype.age=function() {

	return ((new Date()).getTime()-this._alarm_date.getTime())/1000;
};
 
 /**
 * Marker letter setter
 *
 * @param letter the new marker letter 
 */
A91Alert.prototype.set_marker_letter=function(letter) {

	if(typeof(letter)!="undefined"){
	
		if(typeof(letter.toString)=="function") {
		
			this._marker_letter=letter.toString();
		}
	}
};

/**
 * Marker letter getter
 *
 * @retval the marker letter 
 */
A91Alert.prototype.get_marker_letter=function() {

	return this._marker_letter;
};



 /**
 * Do we match a certain alert or alert ID?
 *
 * @param a alert or alert ID
 * @retval true|false
 */
A91Alert.prototype.is=function(a) {

	var alert_id=this.get_item_value("id");

	if(typeof(a)=="number") {
	
		return (alert_id==a);	

	} else if (typeof(a)=="object") {

		// Let the superclass do the object comparison
		return A91DataObject.prototype.is.call(this, a);
	} 
	
	return false;
};

 /**
  * Output self as HTML
  *
  * @retval string containing HTML
  */
 A91Alert.prototype.to_html=function() {
 
	return '<div class="ui-widget ui-widget-content ui-state-normal ui-corner-all A91Alert" alert_id="'+this.get_item_value("id")+'">'
		+'<span class="A91Alert_x"><a href="#">x</a></span>'
		+'<span class="A91Alert_agency">'+this.get_item_value("agency_name")+'</span>'
		+((!this.item_is_empty("units"))?('<span class="A91Alert_units">'+this.get_item_value("units")+'</span>'):"")
		+'<h2 class="A91Alert_title">'
			+'<span class="A91Alert_marker_letter">'+this.get_marker_letter()+'&nbsp;</span>'
			+'<span class="A91Alert_description">'+this.get_item_value("description")+'</span>'
		+'</h2>'
		+((!this.item_is_empty("place"))?('<h3 class="A91Alert_place">'+this.get_item_value("place")+'</h3>'):'')
		+'<h3 class="A91Alert_address">'
			+this.get_item_value("address")
			+((!this.item_is_empty("unit"))?('<span class="A91Alert_unit">'+this.get_item_value("unit")+'</span>'):'')
			+' <span class="A91Alert_city">'+this.get_item_value("city")+'</span>'
		+'</h3>'
		+'<div class="A91Alert_response"></div>'
	+'</div>';
 
 };
 
 
 /**
  * Output self as HTML details
  *
  * @retval string containing HTML
  */
 A91Alert.prototype.to_detail_html=function() {

	// Start with a nice image at the top
	var str='<div class="A91AlertDetail" alert_id="'+this.get_item_value("id")+'"><img src="'+this.marker_image_url()+'">';
	
	// Call the superclass for a nice list of details
	str+=A91DataObject.prototype.to_detail_html.call(this);

	str+='</div>';
	
	return str;
 };

 
/**
* Return CSS selector used to get alert HTML 
*
* @retval string containing selector
*/
 A91Alert.prototype.get_html_selector=function() {
 
	return "div.A91Alert[alert_id="+this.get_item_value("id")+"]";
 
 };
 
 /**
 * Marker image URL
 *
 * @param style "large", "small"
 * @param size in pixels
 */
A91Alert.prototype.marker_image_url=function(style, size) {

	/* Todo - size is ignored */

	// Defaults
	if(typeof(style)!="string") {
			
			style="large";
	}
	
	if(typeof(size)!="number") {
	
		size="";
	}


	if(style=="large") {
	
		return Active911Config.markerfactory_uri + "?type=device&color=gray&icon_filename=icon-active911.png&text[]="+encodeURIComponent(this.get_marker_letter()+") "+this.get_item_value("description"))+"&text[]="+encodeURIComponent(this.get_item_value("address"));
	} 

	return Active911Config.markerfactory_uri + "?type=location&color=gray&text[]="+this.get_marker_letter();

};
