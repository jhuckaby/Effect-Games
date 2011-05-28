// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// Video.js
// Provides video playback services for game backgrounds and sprites
////

Effect.VideoManager = {
	
	enabled: true,
	_movieURL: 'engine/EffectVideo.swf',
	_videos: {},
	
	_register: function(_handler, _id) {
		// register new video clip and link it to a handler for receiving messages
		if (!_id) _id = _get_unique_id();
		var _clip = new _VideoClip(_handler, _id);
		var _video = {
			id: _id,
			handler: _handler,
			clip: _clip
		};
		this._videos[_id] = _video;
		_clip._init();
		return _clip;
	},
	
	notify: function(_id, _type, _msg) {
		// video prodiver telling us something
		// Debug.trace('video', "Video Notify: " + id + ": " + type + ": " + msg);
		
		var _video = this._videos[_id];
		if (!_video) return _throwError("Could not locate video: " + _id);
		_video.clip._notify(_type, _msg);
	},
	
	_update_volume: function() {
		// update volume of all _movies
		for (var _id in this._videos) {
			var _video = this._videos[_id];
			if (_video.clip && _video.clip.loaded) _video.clip._update_volume();
		}
	}
	
};

// Determine implementation based on browser
function _VideoClip() {}; // placeholder

if (ua.safari3 && ua.mac) {
	// Safari 3 Mac supports HTML 5 Video, so use that
	// _VideoClip = _NativeVideoClip;
	// _VideoClip = _QTVideoClip;
	_VideoClip = _FlashVideoClip;
}
else {
	// All other browsers must use Flash (for now)
	_VideoClip = _FlashVideoClip;
}

// VideoLoader

function _VideoLoader() {
	// class constructor
	this._clips = {};
	this.addEventListener('onPlayerLoad', [this, '_playerLoaded']);
};

_VideoLoader.prototype = new _EventHandlerBase();

_VideoLoader.prototype._loadMovies = function(_obj) {
	if (!Effect.VideoManager.enabled) return 0;
	var _list = _always_array(_obj);
	var _count = 0;
	
	// step through each file in list
	for (var _idx = 0; _idx < _list.length; _idx++) {
		var _url = _list[_idx];
		if (!this._clips[_url]) {
			Debug.trace('video', "Loading video player for: " + _url);
			var _clip = this._clips[_url] = Effect.VideoManager._register(this);
			_clip.url = _url;
			_count++;
		} // unique
	} // foreach video
	
	return _count;
};

_VideoLoader.prototype._playerLoaded = function(_clip_id) {
	// flash movie has loaded, and is ready to load stuff	
	var _clip = Effect.VideoManager._videos[_clip_id].clip;
	Debug.trace('video', "Video player is ready: " + _clip_id + ": Loading movie: " + _clip.url);
	_clip._load( _clip.url );
};

_VideoLoader.prototype._getLoadProgress = function() {
	// check movie loading progress
	// result will be between 0.0 and 1.0
	if (!Effect.VideoManager.enabled) return 1.0;
	var _total = 0;
	var _count = 0;
	
	for (var _url in this._clips) {
		var _clip = this._clips[_url];
		if (!_clip.ignore) {
			_total += _clip._get_load_progress();
			_count++;
		}
	}
	
	return (_count > 0) ? (_total / _count) : 1.0;
};

_VideoLoader.prototype._resetProgress = function() {
	// set current state as zero progress, for subsequent
	// loads of additional content
	for (var _url in this._clips) {
		var _clip = this._clips[_url];
		_clip.ignore = true;
	}
};

_VideoLoader.prototype._getClip = function(_url) {
	// lookup clip by its URL
	var _clip = this._clips[_url];
	
	if (!_clip) {
		return _throwError("Movie not loaded: " + _url);
		// this._loadMovies( url );
		// clip = this._clips[url];
	}
	
	return _clip;
};