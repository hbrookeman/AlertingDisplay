function StopWatch(params) {
	// Private vars
	var	startAt	= 0;	// Time of last start / resume. (0 if not running)
	var	lapTime	= 0;	// Time on the clock when last stopped in milliseconds
	var clocktimer;
	
	
	var	now	= function() {
		return (new Date()).getTime(); 
	}; 

	// Public methods
	// Start or resume
	this.start = function() {
		startAt	= startAt ? startAt : now();
		clocktimer = setInterval(function() {
			if(stopwatch.time() < 60000) {
				document.getElementById("time").style.color = "green";
			}
			else if(stopwatch.time() >= 60000 && stopwatch.time() < 120000) {
					document.getElementById("time").style.color = "yellow";
			}
			else {
					document.getElementById("time").style.color = "red";
			}
			$('#time').text(stopwatch.formatTime());
		}, 1);
		console.log("Starting Timer...");
	};

	// Stop or pause
	this.stop = function() {
		// If running, update elapsed time otherwise keep it
		lapTime	= startAt ? lapTime + now() - startAt : lapTime;
		startAt	= 0; // Paused
		clearInterval(clocktimer);
	};

	// Reset
	this.reset = function() {
		lapTime = startAt = 0;
	};

	// Duration
	this.time = function() {
		return lapTime + (startAt ? now() - startAt : 0); 
	};
		
	// Pretty print the time	
	this.formatTime = function() {
		var timeMath = lapTime + (startAt ? now() - startAt : 0);
		var h = m = s = ms = 0;
		var newTime = '';

		h = Math.floor( timeMath / (60 * 60 * 1000) );
		timeMath = timeMath % (60 * 60 * 1000);
		m = Math.floor( timeMath / (60 * 1000) );
		timeMath = timeMath % (60 * 1000);
		s = Math.floor( timeMath / 1000 );
		
		var seconds = "0000" + s;
		seconds = seconds.substr(seconds.length - 2);
		
		var minutes = "0000" + m;
		minutes = minutes.substr(minutes.length - 2);
		
		return (minutes + ':' + seconds);
	}	
};
