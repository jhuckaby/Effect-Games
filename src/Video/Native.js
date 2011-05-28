// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// Native.js
// Provides native video playback services through HTML5
////

function _NativeVideoClip(_handler, _id) {
	// class constructor
	this.handler = _handler;
	this.id = _id;
	this.volume = 1.0;
	this.balance = 0.0;
	this.loop = false;
	this.progress = 0;
	this.loading = false;
	this.loaded = false;
	this.url = '';
};

_NativeVideoClip.prototype._init = function() {
	// init clip and create movie in main port
	var _movie = this.movie = document.createElement('video');
	var _clip = this;
	
	_movie.addEventListener('begin', function(ev) { 
		// movie is beginning to download
		_clip.progress = 0;
		_clip.loading = true;
		Debug.trace('video', _clip.id + ": starting download: " + _clip.url);
	});
	
	_movie.addEventListener('progress', function(ev) { 
		// called every so often during download
		_clip.progress = ev.total ? (ev.loaded / ev.total) : 0;
		_clip.loading = true;
		Debug.trace('video', _clip.id + ": download progress: " + _clip.progress);
	});
	
	_movie.addEventListener('load', function() {
		// movie has finished downloading
		_clip.progress = 1.0;
		_clip.loading = false;
		// movie.volume = gAudio._getAdjCategoryVolume('video');
		Debug.trace('video', _clip.id + ": finished download");
	});
	
	_movie.addEventListener('ended', function() {
		// movie has reached its end, check for loop
		Debug.trace('video', _clip.id + ": Movie reached end" + (_clip.loop ? ' (looping)' : ''));
		if (_clip.loop) {
			_clip._rewind();
			_clip._play();
		}
		_clip._notify('movieEnd', _clip.url);
	});
	
	_movie.addEventListener('error', function() {
		_throwError("Video Clip Error: Cannot load: " + _clip.url);
	});
		
	var _style = this.style = _movie.style;
	_style.position = 'absolute';
	_style.left = '-300px';
	_style.top = '-300px';
	_style.width = '1px';
	_style.height = '1px';
	
	gPort.div.appendChild(_movie);
	
	// movie.volume = gAudio._getAdjCategoryVolume('video');
		
	// inform handler we are loaded (not the movie itself, just the 'player')
	this.loaded = true;
	setTimeout( function() { _clip._notify('onPlayerLoad', ''); }, 1 );
};

_NativeVideoClip.prototype._reset = function() {
	// restore clip to its hidden, shrunk state
	this._stop();
	this._set_size(1, 1);
	this.style.left = '-300px';
	this.style.top = '-300px';
};

_NativeVideoClip.prototype._notify = function(_type, _msg) {
	// unused, pass everything to handler (i.e. onPlayerLoad, onMovieEnd)	
	var _video = Effect.VideoManager._videos[ this.id ];
	assert(!!_video, "Could not find video by id: " + this.id);
	if (_video.handler.fireHandler) _video.handler.fireHandler(_type, this.id, _msg);
};

_NativeVideoClip.prototype._getAdjVolume = function() {
	// get volume adjusted for video category
	if (!gAudio.enabled || !gAudio._categorySettings['video'].enabled) return 0.0;
	return ( this.volume * gAudio._getAdjCategoryVolume('video') );
};

_NativeVideoClip.prototype._getAdjBalance = function() {
	// get balance
	return ( this.balance );
};

_NativeVideoClip.prototype._load = function(_url, _loop) {
	// load video clip
	if (!_loop) _loop = false;
	this.loop = _loop;
	this.url = _url;
	
	this.movie.src = gGame.getGamePath() + _url + '?mod=' + gGame._assetModDate + '&ttl=static';
	if (this._loadRequired()) this.movie.load();
};

_NativeVideoClip.prototype._play = function() {
	// play movie
	if (this._canPlayThrough()) {
		this.movie.play();
		this.movie.volume = this._getAdjVolume();
	}
};

_NativeVideoClip.prototype._stop = function() {
	// pause movie
	this.movie.pause();
};

_NativeVideoClip.prototype._rewind = function() {
	// rewind to beginning of movie
	this.movie.currentTime = 0;
};

_NativeVideoClip.prototype._set_active = function(url) {
	// unused
};

_NativeVideoClip.prototype._deactivate = function() {
	// unused
};

_NativeVideoClip.prototype._get_position = function() {
	// get current movie position in seconds
	return this.movie.currentTime;
};

_NativeVideoClip.prototype._set_position = function(pos) {
	// set current movie position in seconds
	this.movie.currentTime = pos;
};

_NativeVideoClip.prototype._get_load_progress = function() {
	// get load progress (0.0 to 1.0)
	return this.progress;
};

_NativeVideoClip.prototype._set_size = function(_width, _height) {
	// set movie player pixel size
	this.style.width = '' + _width + 'px';
	this.style.height = '' + _height + 'px';
};

_NativeVideoClip.prototype._set_loop = function(_loop) {
	// enable or disable looping
	this.loop = _loop;
};

_NativeVideoClip.prototype._loadRequired = function() {
	// determine if a load is required
    if ("DATA_UNAVAILABLE" in HTMLMediaElement)
        return this.movie.readyState == HTMLMediaElement.DATA_UNAVAILABLE;
    if ("HAVE_NOTHING" in HTMLMediaElement)
        return this.movie.readyState == HTMLMediaElement.HAVE_NOTHING;
    return false;
};

_NativeVideoClip.prototype._canPlayThrough = function() {
	// determine if movie can play
    if ("CAN_PLAY_THROUGH" in HTMLMediaElement)
        return this.movie.readyState == HTMLMediaElement.CAN_PLAY_THROUGH;
    if ("HAVE_ENOUGH_DATA" in HTMLMediaElement)
        return this.movie.readyState == HTMLMediaElement.HAVE_ENOUGH_DATA;
    return false;
};

_NativeVideoClip.prototype._set_volume = function(_vol) {
	// set clip volume
	this.volume = _vol;
	if (this.movie) this.movie.volume = this._getAdjVolume();
};

_NativeVideoClip.prototype._update_volume = function() {
	// refresh clip volume (category settings may have changed)
	if (this.movie) this.movie.volume = this._getAdjVolume();
};
