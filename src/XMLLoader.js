// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// XMLLoader.js
// Preloads XML files
////

function _XMLLoader() {
	// class constructor
	this._files = {};
	this._shortcuts = {};
	this._baseProgress = 0;
};

_XMLLoader.prototype._loadFiles = function(_obj) {
	var _list = _always_array(_obj);
	var _count = 0;
	
	// step through each file in list
	for (var _idx = 0; _idx < _list.length; _idx++) {
		var _url = _list[_idx];
		
		// make sure image isn't already loaded
		if (!this._files[_url]) {
			debugstr("Loading XML file: " + _url);
			
			this._files[_url] = {
				loaded: false,
				data: null
			};
			
			// shortcut using track filename sans extension
			var _shortcut = _url.replace(/^(.*)\/([^\/]+)$/, '$2').replace(/\.\w+$/, '');
			this._shortcuts[_shortcut] = this._files[_url];
			
			if (gGame._standalone) {
				_load_script( gGame._homePath + 'xml' + _url.replace(/\.xml$/i, '.js') );
			}
			else {
				window.xl = this;
				_load_script( gGame._homePath + 'api/game_get_xml' + _composeQueryString({
					game_id: gGame.id,
					rev: gGame._query.rev,
					path: _url,
					mod: gGame._assetModDate,
					lang: gGame.lang,
					format: 'js',
					callback: 'xl._notifyLoad'
				}));
			}
			
			_count++;
		} // unique
	} // foreach image
	
	return _count;
};

_XMLLoader.prototype._notifyLoad = function(_response) {
	// a file has been loaded
	if (_response.Code != 0)
		return _throwError("Failed to load XML: " + _response.Description);
	
	var _url = _response.Path;
	var _file = this._files[_url];
	assert(!!_file, "Could not find XML file definition for: " + _url);
	_file.loaded = true;
	_file.data = _response.Data;
};

_XMLLoader.prototype._getLoadProgress = function() {
	// check xml loading progress
	// result will be between 0.0 and 1.0
	if ((_num_keys(this._files) - this._baseProgress) == 0) return 1.0;
	var _numLoaded = 0;
	
	for (var _url in this._files) {
		if (this._files[_url].loaded) _numLoaded++;
		else {
			var _file = this._files[_url];
			if (_file.loaded) _numLoaded++;
		}
	}
	
	return ((_numLoaded - this._baseProgress) / (_num_keys(this._files) - this._baseProgress));
};

_XMLLoader.prototype._resetProgress = function() {
	// set current state as zero progress, for subsequent
	// loads of additional content
	this._baseProgress = _num_keys(this._files);
};

_XMLLoader.prototype.lookupFile = function(_path) {
	// lookup an image object by its partial url
	return this._files[_path] || this._shortcuts[_path.replace(/\.\w+$/, '')];
};
