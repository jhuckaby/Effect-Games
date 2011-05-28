// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

function get_sound_manager_html() {
	var html = '';
	if (ie) {
		html += '<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" codebase="'+protocol+'://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=9,0,0,0" width="1" height="1" id="sound_manager" align="middle"><param name="allowScriptAccess" value="sameDomain" /><param name="allowFullScreen" value="false" /><param name="movie" value="EffectSoundPreview.swf" /><param name="loop" value="false" /><param name="menu" value="false" /><param name="quality" value="best" /><param name="bgcolor" value="#ffffff" />	</object>';
	}
	else {
		html += '<embed id="sound_manager" src="EffectSoundPreview.swf" loop="false" menu="false" quality="best" bgcolor="#ffffff" width="8" height="8" name="sound_manager" align="middle" allowScriptAccess="sameDomain" allowFullScreen="false" type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" />';
	}
	return html;
}

function sound_init() {
	// initialize sound manager
	session.sound = {
		tracks: {},
		queue: {},
		playing: {}
	};
	
	if (ie) {
		// this seems to be the only way to get ExternalInterface to work in IE
		document.body.insertAdjacentHTML( "beforeEnd", get_sound_manager_html() );
	}
	else {
		var div = document.createElement('div');
		div.style.position = 'absolute';
		div.style.width = '8px';
		div.style.height = '8px';
		div.style.left = '0px';
		div.style.top = '-100px';
		div.innerHTML = get_sound_manager_html();
	
		var body = document.getElementsByTagName('body')[0];
		if (body) body.appendChild(div);
	}
}

function preview_sound(url) {
	Debug.trace('audio', "Previewing sound: " + url);
	$('sound_manager')._preview(url);
}

function enqueue_sound(url) {
	session.sound.queue[url] = 1;
}

function flush_sound_queue() {
	for (var url in session.sound.queue) {
		play_sound(url);
	}
	session.sound.queue = {};
}

function load_sound(url, loop, volume, balance) {
	if (typeof(loop) == 'undefined') loop = false;
	if (typeof(volume) == 'undefined') volume = 1.0;
	if (typeof(balance) == 'undefined') balance = 0.0;
	
	if (!session.sound.tracks[url]) {
		Debug.trace('audio', "Loading sound: " + url);
		$('sound_manager')._load(url, loop, volume, balance);
		session.sound.tracks[url] = 1;
	}
}

function play_sound(url, loop, volume, balance) {
	Debug.trace('audio', "Playing sound: " + url + " (" + loop + ', ' + volume + ', ' + balance + ')');
	
	if (typeof(loop) == 'undefined') loop = false;
	if (typeof(volume) == 'undefined') volume = 1.0;
	if (typeof(balance) == 'undefined') balance = 0.0;
	
	if (!session.sound.tracks[url]) {
		load_sound(url, loop, volume, balance);
	}
	else {
		$('sound_manager')._set_loop(url, loop);
		$('sound_manager')._set_volume(url, volume);
		$('sound_manager')._set_balance(url, balance);
	}
	
	$('sound_manager')._play(url);
	session.sound.playing[url] = 1;
}

function set_sound_master_volume(vol) {
	$('sound_manager')._set_master_volume(vol);
}

function stop_all_sounds() {
	$('sound_manager')._stop_all();
}

function sound_in_use(){
	// determine if any sounds are currently playing
	for (var url in session.sound.playing) {
		if (session.sound.playing[url]) return 1;
	}
	return 0;
}

function sound_flash_notify(type, msg) {
	switch (type) {
		case 'flashLoadComplete':
			Debug.trace('audio', "Audio Flash Movie Ready");
			safe_call('notify_sound_manager_loaded');
			break;
		
		case 'soundLoadComplete':
			// debugstr("Sound Load Complete: " + msg);
			break;
		
		case 'soundPlayComplete':
			session.sound.playing[msg] = 0;
			break;
		
		case 'debug':
			Debug.trace('audio', "Audio Flash Debug: " + msg);
			break;
		
		default:
			Debug.trace('audio', "sound_flash_notify: " + type + ": " + msg);
			break;
	}
}

