// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

/**
 * Effect 1.0
 * Author: Joseph Huckaby
 **/

var webcam_callback = null;

function get_webcam_html(width, height) {
	var html = '';
	if (ie) {
		html += '<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" codebase="'+protocol+'://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=9,0,0,0" width="'+width+'" height="'+height+'" id="webcam" align="middle"><param name="allowScriptAccess" value="sameDomain" /><param name="allowFullScreen" value="false" /><param name="movie" value="webcam.swf" /><param name="loop" value="false" /><param name="menu" value="false" /><param name="quality" value="best" /><param name="bgcolor" value="#ffffff" />	</object>';
	}
	else {
		html += '<embed id="webcam" src="webcam.swf" loop="false" menu="false" quality="best" bgcolor="#ffffff" width="'+width+'" height="'+height+'" name="webcam" align="middle" allowScriptAccess="sameDomain" allowFullScreen="false" type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" />';
	}
	return html;
}

function webcam_snap(url, callback) {
	if (callback) webcam_callback = callback;
	else webcam_callback = null;
	
	Debug.trace('webcam', 'Sending snapshot to: ' + url);
	session.webcam_in_progress = true;
	
	var movie = $('webcam');
	movie._snap( url );
}

function webcam_configure(panel) {
	// "camera", "privacy", "default", "localStorage", "microphone", "settingsManager"
	if (!panel) panel = "camera";
	var movie = $('webcam');
	movie._configure(panel);
}

function webcam_flash_notify(type, msg) {
	Debug.trace('webcam', 'Flash Notify: ' + type);
	
	switch (type) {
		case 'flashLoadComplete':
			session.webcam_loaded = true;
			safe_call('notify_webcam_loaded');
			if (!session.cookie.get('wbfuse')) {
				webcam_configure();
				session.cookie.set('wbfuse', 1);
				session.cookie.save();
			}
			break;
		
		case 'debug':
			alert("Flash Debug: " + msg);
			break;
		
		case 'error':
			alert("Flash Error: " + msg);
			session.webcam_in_progress = false;
			break;
		
		case 'success':
			session.webcam_in_progress = false;
			if (webcam_callback) window[webcam_callback](msg);
			break;
		
		default:
			alert("webcam_flash_notify: " + type + ": " + msg);
			break;
	}
}
