// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// Flash.js
// Provides audio services through Flash 8 / ActionScript 2
// DHTML Game Engine 1.0 (EffectGames.com)
////

function _FlashAudioHandler() {
	// partial class definition that is merged in with _AudioHandler
	// if flash is to be used
};

_FlashAudioHandler.prototype._getLoadProgress = function() {
	// get progress of tracks still loading
	// result will be between 0.0 and 1.0
	if (!this.enabled) return 1.0;
	if ((_num_keys(this._tracks) - this._baseProgress) == 0) return 1.0;
	
	return ((this._numLoaded - this._baseProgress) / (_num_keys(this._tracks) - this._baseProgress));
};

_FlashAudioHandler.prototype._resetProgress = function() {
	// set current state as zero progress, for subsequent
	// loads of additional content
	this._baseProgress = _num_keys(this._tracks);
};

_FlashAudioHandler.prototype.flashNotify = function(_cmd, _id, _value) {
	// receive notification from flash movie	
	switch (_cmd) {
		case 'soundLoadComplete':
			// MSIE can fire this event BEFORE load thread completes
			// so track is not in this.tracks[] yet (sheesh!)
			// var track = this.getTrack(id);
			// assert(track, "Track not found: " + id);
			
			if (_value) {
				// track.loaded = true;
				this._numLoaded++;
				Debug.trace('audio', "Audio track loaded successfully: " + _id);
			}
			else {
				var _track = this.getTrack(_id);
				if (_track && _track._retries) {
					_track._retries--;
					Debug.trace('audio', "Failed to load audio track: " + _track._mediaURL + " -- retrying in a sec,  " + _track._retries + " retries left.");
					setTimeout( function() { _track.load(); }, 1000 );
				}
				else {
					_throwError("Failed to load audio track: " + _id + ": " + _value);
				}
			}
			break;
		
		case 'soundPlayComplete':
			// sound has finished playing
			Debug.trace('audio', "Sound reached end: " + _id);
			var _track = this.getTrack(_id);
			if (_track) {
				_track._playing = false;
				_track.fireHandler( 'ended' );
			}
			break;
		
		case 'soundLoadError':
			var _track = this.getTrack(_id);
			if (_track && _track._retries) {
				_track._retries--;
				Debug.trace('audio', "Failed to load audio track: " + _track._mediaURL + " -- retrying in a sec,  " + _track._retries + " retries left.");
				setTimeout( function() { _track.load(); }, 1000 );
			}
			else {
				_throwError("Failed to load audio track: " + _id + ": " + _value);
			}
			break;
			
		case 'flashLoadComplete':
			// must set/detect flag because Firefox 3 sends TWO of these!!! sheesh...
			if (!this._flashLoadComplete) {
				this._flashLoadComplete = true;
				Debug.trace('audio', "Audio control load complete, polling for function call support");
				setTimeout( function() { gAudio._monitorControlLoad(); }, 100 );
			}
			break;
		
		case 'debug':
			Debug.trace('audio', "Flash debug: " + id + ": " + value);
			break;
	}
};

_FlashAudioHandler.prototype._monitorControlLoad = function() {
	// poll control for function call support
	this._control = el('audio_player');
	if (!this._control || !this._control._load) {
		this._monitorControlLoadTimer = setTimeout( function() { gAudio._monitorControlLoad(); }, 100 );
		return;
	}
	
	if (this._loadTimer) clearTimeout( this._loadTimer );
	this._loadTimer = null;
	
	this._controlLoaded = true;
	Debug.trace('audio', "Audio control loaded successfully");
	
	// resume loading game
	this.fireHandler('onLoad');
};

_FlashAudioHandler.prototype._setup = function(_callback) {
	// check whether to use OBJECT or EMBED tags
	if (!this.enabled || this._controlLoaded) return;
	
	this.setHandler('onLoad', _callback);
	
	Debug.trace('audio', "Creating audio control");
	
	// flash notification needs gAudio object in window space
	if (!window.gAudio) window.gAudio = gAudio;
	
	// set timeout for "silent" failure (pun intended)
	this._loadTimer = setTimeout( function() { gAudio._loadTimeout(); }, 10 * 1000 );
	
	var _supportsActiveX = ( navigator.userAgent.match(/MSIE/) && 
		navigator.userAgent.match(/Win/) );
		
	// construct HTML for control
	var html = '';
	
	if (_supportsActiveX) {
		html = '<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000"' + 
			' codebase="http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=8,0,0,0"' + 
			' width="1" height="1" id="audio_player" align="middle">' + 
			'<param name="allowScriptAccess" value="always" />' + 
			'<param name="movie" value="' + gGame._homePath + 'engine/EffectAudio.swf" />' + 
			'<param name="quality" value="high" />' + 
			'</object>';
		
		document.body.insertAdjacentHTML( "beforeEnd", html );
	}
	else {
		html = '<embed src="' + gGame._homePath + 'engine/EffectAudio.swf" quality="high" swliveconnect="true" bgcolor="#ffffff"' + 
			' width="4" height="4" id="audio_player" name="effect_audio_player" align="middle" allowScriptAccess="always"' + 
			' type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer">' + 
			'</embed>';
		
		// add as hidden floating div
		var div = document.createElement('DIV');
		div.style.position = 'absolute';
		div.style.width = '16px';
		div.style.height = '16px';
		div.style.left = '-4000px';
		div.style.top = '0px';
		div.style.visibility = 'hidden';
		div.innerHTML = html;
		document.body.appendChild(div);
	}
	
	gGame._addSafeUnloadObject( 'audio_player' );
};

_FlashAudioHandler.prototype._loadTimeout = function() {
	// audio failed to load, resume loading game
	if (this._monitorControlLoadTimer) clearTimeout( this._monitorControlLoadTimer );
	this._monitorControlLoadTimer = null;
	
	Debug.trace('audio', "Audio control load timeout, audio will be disabled");
	gGame.fireHandler( 'audioLoadError' );
	
	this.enabled = false;
	this.fatal = true;
	
	this.fireHandler('onLoad');
};

//
// _FlashAudioTrack Class
//

function _FlashAudioTrack() {
	// partial class definition that is merged in with _AudioTrack
	// if flash is to be used
};

_FlashAudioTrack.prototype = new _EventHandlerBase();

_FlashAudioTrack.prototype._init = function() {
	// initialize sound settings
	if (!this._handler.enabled) return;
	assert(this._handler._control && this._handler._control._set_volume, "Flash object not loaded");
	
	this._handler._control._set_volume( this._id, Math.floor(this._getAdjVolume() * 100) );
	this._handler._control._set_balance( this._id, Math.floor(this._getAdjBalance() * 100) );
};

_FlashAudioTrack.prototype.playSound = function() {
	// play sound as effect
	if (!this._handler.enabled || !this._getCategorySettings().enabled) return this;
	this._handler._control._play( this._id );
	if (!this.multiplex) this._playing = true;
	return this; // for chaining commands
};

_FlashAudioTrack.prototype.play = function() {
	// send Play command to current audio track
	if (!this._handler.enabled || !this._getCategorySettings().enabled) return this;
	this._handler._control._play( this._id );
	if (!this.multiplex) this._playing = true;
	return this; // for chaining commands
};

_FlashAudioTrack.prototype.stop = function() {
	// send Stop command to current audio track
	if (!this._handler.enabled) return this;
	this._handler._control._stop( this._id );
	this._playing = false;
	return this; // for chaining commands
};

_FlashAudioTrack.prototype.rewind = function() {
	// send Rewind command to current audio track
	if (!this._handler.enabled) return this;
	this._handler._control._rewind( this._id );
	return this; // for chaining commands
};

_FlashAudioTrack.prototype.setVolume = function(_newVolume) {
	// set volume for this track
	if (!this._handler.enabled) return this;
	
	if (_newVolume < 0) _newVolume = 0;
	else if (_newVolume > 1.0) _newVolume = 1.0;
	
	this.volume = _newVolume;
	
	this._handler._control._set_volume( this._id, Math.floor(this._getAdjVolume() * 100) );
	return this; // for chaining commands
};

_FlashAudioTrack.prototype.setBalance = function(_newBalance) {
	// set balance for this track
	if (!this._handler.enabled) return this;
	
	if (_newBalance < -1.0) _newBalance = -1.0;
	else if (_newBalance > 1.0) _newBalance = 1.0;
	
	this.balance = _newBalance;
	
	this._handler._control._set_balance( this._id, Math.floor(this._getAdjBalance() * 100) );
	return this; // for chaining commands
};

_FlashAudioTrack.prototype.isPlaying = function() {
	// return true if track is playing, false if stopped
	return !!this._playing; 
};

_FlashAudioTrack.prototype.getPosition = function() {
	// return current time offset into track (hi-res seconds)
	return this._handler._control._get_position( this._id );
};

_FlashAudioTrack.prototype.setPosition = function(_pos) {
	// set playhead position of current audio track, in hires-seconds
	if (!this._handler.enabled) return this;
	this._handler._control._set_position( this._id, _pos );
	return this; // for chaining commands
};

_FlashAudioTrack.prototype.load = function() {
	// load track
	if (!this._handler.enabled) return '';
	
	assert(this._handler._control && this._handler._control._load, "Flash object not ready");
	
	this._playing = false;
	
	this._mediaURL = this.url.match(/^\w+\:\/\//) ? this.url : (gGame.getGamePath() + this.url);
	if (!gGame._standalone) this._mediaURL += '?mod=' + gGame._assetModDate + '&ttl=static';
	Debug.trace('audio', "Loading audio track: " + this._id + " (" + this._mediaURL + ")");
	
	this._handler._control._load( this._id, this._mediaURL, !!this.loop, 
		Math.floor(this._getAdjVolume() * 100), Math.floor(this._getAdjBalance() * 100), !!this.multiplex );
};
