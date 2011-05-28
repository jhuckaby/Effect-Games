// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// Audio.js
// Cross-browser sound/music controller.
// Copyright (c) 2005 Joseph Huckaby
////

//
// _AudioHandler Class
//

function _AudioHandler(_id) {
	// class constructor
	// if (!id) id = _get_unique_id();
	// this.id = id;
	this._track_defs = {};
	this._tracks = {};
	this._shortcuts = {};
	this._baseProgress = 0;
	this._numLoaded = 0;
	this.enabled = true;
	this._controlLoaded = false;
	this._control = null;
	
	// default settings
	this._masterVolume = 1.0;
	this._masterRate = 1.0;
	this._masterBalance = 0.0;
	
	// category settings
	this._categorySettings = {
		sfx: {
			volume: 1.0,
			rate: 1.0,
			balance: 0.0,
			enabled: true
		},
		music: {
			volume: 1.0,
			rate: 1.0,
			balance: 0.0,
			enabled: true
		},
		video: {
			volume: 1.0,
			rate: 1.0,
			balance: 0.0,
			enabled: true
		}
	};	
};

// Inherit from EventHandlerBase, to get setHandler(), fireHandler(), et al.
_AudioHandler.prototype = new _EventHandlerBase();

_AudioHandler.prototype._lateLoad = false;

_AudioHandler.prototype._setTrackDefs = function(_obj) {
	// define all tracks used in game (preloaded or no)
	var _list = _always_array(_obj);
	var _len = 0;
	for (var _idx = 0, _len = _list.length; _idx < _len; _idx++) {
		var _track_def = _deep_copy_object_lc_keys( _list[_idx] );
		_track_def.url = _track_def.path;
		this._track_defs[ _track_def.path ] = _track_def;
	}
};

_AudioHandler.prototype._loadTracks = function(_obj) {
	// load one or more audio tracks
	var _list = _always_array(_obj);
	var _count = 0;
		
	for (var _idx = 0, _len = _list.length; _idx < _len; _idx++) {
		var _key = _list[_idx];
		var _trackArgs = this._track_defs[_key];
		if (!_trackArgs) {
			// audio track not defined, make one up
			debugstr("Audio track not defined, using defaults: " + _key);
			_trackArgs = {
				volume: 1.0,
				preload: 0,
				path: _key,
				url: _key,
				loop: _key.match(/music/) ? 1 : 0,
				balance: 0.0,
				category: _key.match(/music/) ? 'music' : 'sfx',
				multiplex: _key.match(/music/) ? 0 : 1
			};
		}
		
		if (!this._tracks[_key]) {
			// construct object and save id
			var _track = new _AudioTrack( merge_objects(_trackArgs, { _id: _key, _handler: this }) );
			_track._retries = 5;
			this._tracks[ _key ] = _track;
			if (!this._lateLoad) _track.load();
			
			// shortcut using track filename sans extension
			var _shortcut = _key.replace(/^(.+)\/([^\/]+)$/, '$2').replace(/\.\w+$/, '');
			this._shortcuts[_shortcut] = _track;
			_count++;
		} // not already loaded
	}
	
	return _count;
};

_AudioHandler.prototype._lateLoadAllTracks = function() {
	// tell all tracks to load now, if late loading is enabled
	if (this._lateLoad) {
		for (var _key in this._tracks) {
			var _track = this._tracks[_key];
			if (!_track.loaded && !_track.loading) _track.load();
		}
	}
};

_AudioHandler.prototype._init = function() {
	// initialize all tracks
	if (this._getLoadProgress() < 1.0) 
		return _throwError( "One or more audio tracks are still loading" );
	
	for (var _key in this._tracks) {
		this._tracks[_key]._init();
	}
};

_AudioHandler.prototype.setMasterVolume = function(_newVolume) {
	// set master volume level and filter down to all tracks
	// range is 0.0 to 1.0
	if (_newVolume < 0) _newVolume = 0;
	else if (_newVolume > 1.0) _newVolume = 1.0;
	
	this._masterVolume = _newVolume;
	this._init();
	
	Effect.VideoManager._update_volume();
};

_AudioHandler.prototype._setMasterRate = function(_newRate) {
	// set master rate and filter down to all tracks
	// range is 0.0 to N
	this._masterRate = _newRate;
	this._init();
};

_AudioHandler.prototype._setMasterBalance = function(_newBalance) {
	// set master balance and filter down to all tracks
	// range is -1.0 to 1.0
	this._masterBalance = _newBalance;
	this._init();
};

_AudioHandler.prototype.setCategoryVolume = function(_catName, _newVolume) {
	// set volume for a given audio category (sfx, music, etc.)
	// range is 0.0 to 1.0
	if (_newVolume < 0) _newVolume = 0;
	else if (_newVolume > 1.0) _newVolume = 1.0;
	
	var _cat = this._categorySettings[_catName];
	if (!_cat) return _throwError("Unknown audio category: " + _catName);
	
	_cat.volume = _newVolume;
	this._init();
	
	if (_catName == 'video') {
		// special behavior for video, must update all video tracks
		Effect.VideoManager._update_volume();
	}
};

_AudioHandler.prototype._setCategoryRate = function(_catName, _newRate) {
	// set rate for a given audio category (sfx, music, etc.)
	// range is 0.0 to N
	var _cat = this._categorySettings[_catName];
	if (!_cat) return _throwError("Unknown audio category: " + _catName);
	
	_cat.rate = _newRate;
	this._init();
};

_AudioHandler.prototype._setCategoryBalance = function(_catName, _newBalance) {
	// set balance for a given audio category (sfx, music, etc.)
	// range is -1.0 to 1.0
	var _cat = this._categorySettings[_catName];
	if (!_cat) return _throwError("Unknown audio category: " + _catName);
	
	_cat.balance = _newBalance;
	this._init();
};

_AudioHandler.prototype._getAdjCategoryVolume = function(_catName) {
	return(
		this._categorySettings[ _catName ].volume *
		this._masterVolume
	);
};

_AudioHandler.prototype._getAdjCategoryBalance = function(_catName) {
	return(
		this._categorySettings[ _catName ].balance
	);
};

_AudioHandler.prototype.getTrack = function(_id) {
	// locate track object given id
	return this._tracks[_id] || this._shortcuts[_id] || this._shortcuts[_id.toString().replace(/\.\w+$/, '')];
};

_AudioHandler.prototype.playSound = function(_id) {
	// send playSound command to track given id
	var _track = this.getTrack(_id);
	if (!_track) return _throwError("Could not locate audio track: " + _id);
	_track.playSound();
};

_AudioHandler.prototype.play = function(_id) {
	// send play command to track given id
	var _track = this.getTrack(_id);
	if (!_track) return _throwError("Could not locate audio track: " + _id);
	_track.play();
};

_AudioHandler.prototype.quiet = function() {
	// stop all tracks
	for (var _key in this._tracks) {
		this._tracks[_key].stop();
	}
};

_AudioHandler.prototype.quietCategory = function(_catName) {
	// stop all tracks in a particular category (i.e. sfx, music)
	for (var _key in this._tracks) {
		if (this._tracks[_key].category == _catName) this._tracks[_key].stop();
	}
};

//
// _AudioTrack Class
//

function _AudioTrack(_args) {
	// class constructor
	this._id = 0;
	this._handler = null;
	
	for (var _key in _args) this[_key] = _args[_key];
	assert(this._id, "No ID passed to _AudioTrack" );
	assert(this._handler, "No handler passed to _AudioTrack" );
	
	// debugstr("Creating new audio track: " + dumper(_args));
	
	if (!this.category) this.category = 'sfx';
	if (!this._handler._categorySettings[this.category])
		return _throwError( "Unknown audio category: " + this.category );
	
	if (!this.volume) this.volume = 1.0;
	if (!this.rate) this.rate = 1.0;
	if (!this.balance) this.balance = 0.0;
	if (!this.loop) this.loop = false;
	if (!this.multiplex) this.multiplex = false;
}

_AudioTrack.prototype._getCategorySettings = function() {
	return this._handler._categorySettings[ this.category ];
};

_AudioTrack.prototype._getAdjVolume = function() {
	// get adjusted volume for track
	return( Math.min(
		this.volume * 
		this._handler._categorySettings[ this.category ].volume *
		this._handler._masterVolume, 1.0)
	);
};

_AudioTrack.prototype._getAdjRate = function() {
	// get adjusted rate for track
	return(
		this.rate * 
		this._handler._categorySettings[ this.category ].rate *
		this._handler._masterRate
	);
};

_AudioTrack.prototype._getAdjBalance = function() {
	// get adjusted balance for track
	return this.balance;
};

_AudioTrack.prototype.setRate = function(newRate) {
	// change playing speed of track
	if (!this._handler.enabled) return;
	debugstr("setRate() is currently unsupported");
};

_AudioTrack.prototype.onTweenUpdate = function(_tween) {
	// special care must be taken depending on which properties are being tweened
	var _props = _tween.properties;
	if (_props.volume) this.setVolume( this.volume );
	if (_props.balance) this.setBalance( this.balance );
};

_AudioTrack.prototype.fadeIn = function(_duration, _mode, _algo) {
	// fade track in using tween
	this.setVolume(0);
	if (!this.isPlaying()) this.play();
	
	gTween.add({
		target: this,
		duration: _duration,
		mode: _mode || 'EaseOut',
		algorithm: _algo || 'Linear',
		properties: {
			volume: { start:0, end:this.volume || 1.0 }
		}
	});
};

_AudioTrack.prototype.fadeOut = function(_duration, _mode, _algo) {
	// fade track out using tween
	if (!this.isPlaying()) return;
	gTween.add({
		target: this,
		duration: _duration,
		mode: _mode || 'EaseOut',
		algorithm: _algo || 'Linear',
		properties: {
			volume: { start:this.volume, end:0 }
		},
		onTweenComplete: function(tween) {
			tween.target.stop();
		}
	});
};

_AudioTrack.prototype.crossfade = function(_id, _duration, _mode, _algo) {
	// crossfade between two tracks
	this.fadeOut( _duration, _mode, _algo );
	
	var track = Effect.Audio.getTrack(_id);
	if (track) track.fadeIn( _duration, _mode, _algo );
};

// Inherit from Native or Flash class

if (0 && ua.titanium && window.Titanium && Titanium.Media && Titanium.Media.createSound) {
	// special titanium sound implementation
	for (var key in _TitaniumAudioHandler.prototype)
		_AudioHandler.prototype[key] = _TitaniumAudioHandler.prototype[key];
	
	for (var key in _TitaniumAudioTrack.prototype)
		_AudioTrack.prototype[key] = _TitaniumAudioTrack.prototype[key];
}
// else if (((ua.safari3 && ua.mac && !ua.iphone) || (ua.ff && (ua.ver >= 3.6))) && window.Audio) {
// else if ((ua.safari3 && ua.mac && !ua.iphone && !ua.snow && !ua.titanium) && window.Audio && (typeof(DisableNativeAudio) == 'undefined')) {
else if (((ua.safari3 && ua.mac && !ua.iphone && !ua.ipad && !ua.snow && !ua.titanium) || 
	(ua.ff && ((ua.ver >= 3.6) || ua.prism) && (typeof(EffectAudioOggReady) != 'undefined'))) && window.Audio && (typeof(DisableNativeAudio) == 'undefined')) {
	// Safari 3+ Mac and FF 3.6+ support native audio via HTML 5, so use that
	for (var key in _NativeAudioHandler.prototype)
		_AudioHandler.prototype[key] = _NativeAudioHandler.prototype[key];
	
	for (var key in _NativeAudioTrack.prototype)
		_AudioTrack.prototype[key] = _NativeAudioTrack.prototype[key];
	
	if (ua.ff && (ua.ver >= 3.6)) _AudioHandler.prototype._lateLoad = true;
}
else {
	// all other browsers must use flash (for now)
	for (var key in _FlashAudioHandler.prototype)
		_AudioHandler.prototype[key] = _FlashAudioHandler.prototype[key];
	
	for (var key in _FlashAudioTrack.prototype)
		_AudioTrack.prototype[key] = _FlashAudioTrack.prototype[key];
}
