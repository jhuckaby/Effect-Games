// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// LevelLoader.js
// Loads level data
////

function _LevelLoader() {
	// class constructor
	this._levels = {};
	this._baseProgress = 0;
};

_LevelLoader.prototype._loadLevels = function(_obj) {
	var _list = _always_array(_obj);
	
	// step through each level in list
	for (var _idx = 0; _idx < _list.length; _idx++) {
		var _level_id = _list[_idx];
		
		// make sure level isn't already loaded
		if (!this._levels[_level_id]) {
			debugstr("Loading level data: " + _level_id);
			
			this._levels[_level_id] = {
				loaded: false,
				data: null
			};
			
			if (gGame._standalone) {
				_load_script( gGame._homePath + 'levels/' + _level_id + '.js' );
			}
			else {
				window.ll = this;
				_load_script( gGame._homePath + 'api/game_get_level_data' + _composeQueryString({
					game_id: gGame.id,
					rev: gGame._query.rev,
					level_id: _level_id,
					mod: gGame._assetModDate,
					format: 'js',
					callback: 'll._notifyLoad'
				}));
			}
		} // unique
	} // foreach image
};

_LevelLoader.prototype._notifyLoad = function(_response) {
	// level data has been loaded
	if (_response.Code != 0)
		return _throwError("Failed to load level data: " + _response.Description);
	
	var _level_id = _response.LevelID;
	var _level = this._levels[_level_id];
	assert(!!_level, "Could not find level definition for: " + _level_id);
	_level.loaded = true;
	_level.data = _response.Data;
	
	if (!_level.data.layers) _level.data.layers = {};
	
	// analyze level data, see if we need to late-load any sprites
	var _level_def = _find_object( gGame._def.Levels.Level, { Name: _level_id } );
	if (_level_def.Layers && _level_def.Layers.Layer) {
		var _layers = _always_array( _level_def.Layers.Layer );
	
		for (var _idx = 0, _len = _layers.length; _idx < _len; _idx++) {
			var _layer_def = _layers[_idx];
			var _layer_data = _level.data.layers[ _layer_def.Name ];
			if (_layer_data) {
				debugstr("checking layer for late-loaders: " + _layer_def.Name);
				switch (_layer_def.Type) {
					case 'sprite': this._checkSpriteLayer(_layer_def, _layer_data); break;
					case 'tile': this._checkTileLayer(_layer_def, _layer_data); break;
				} // switch layer.Type
			} // has layer data
		} // foreach layer
	} // level has layers
	
	debugstr("Level data loaded successfully: " + _level_id);
};

_LevelLoader.prototype._checkSpriteLayer = function(_layer_def, _sprites) {
	// scan sprite layer for sprites needing to be loaded
	for (var _idx = 0, _len = _sprites.length; _idx < _len; _idx++) {
		var _sprite = _sprites[_idx];
		var _sprite_def = gGame._sprite_defs[ _sprite.type ];
		if (!_sprite_def) return _throwError("Could not find sprite definition: " + sprite.type);
		if (!_sprite_def._media_loaded) {
			gGame._loadSpriteMedia( _sprite.type );
		}
	} // foreach sprite in level
};

_LevelLoader.prototype._checkTileLayer = function(_layer_def, _layer_data) {
	// scan tile layer for tile object classes needing to be loaded
	if (_layer_data.objectData) {
		var _objectData = _layer_data.objectData;
		for (var _tx = 0, _max_tx = _objectData.length; _tx < _max_tx; _tx++) {
			var _col = _objectData[_tx];
			if (_col) {
				for (var _ty = 0, _max_ty = _col.length; _ty < _max_ty; _ty++) {
					var _tile = _col[_ty];
					if (_tile) {
						var _obj_name = (typeof(_tile) == 'object') ? _tile.type : _tile;
						var _tile_def = gGame._tile_defs[ _obj_name ];
						if (!_tile_def) return _throwError("Could not find tile definition: " + _obj_name);
						if (!_tile_def._media_loaded) {
							gGame._loadTileMedia( _obj_name );
						}
					} // tile
				} // y loop
			} // col
		} // x loop
	} // layer has objectData
	
	// scan visual layer for tiles that have overlays (gotta load these late)
	if (_layer_data.map) {
		var _map = _layer_data.map;
		for (var _key in _map) {
			var _filename = _map[_key];
			if (_filename.match(/\?.+/)) {
				var _tileset = _find_object( gGame._def.Tilesets.Tileset, { Name: _layer_def.Tileset } );
				
				var _tile_image_key = _tileset.Path + _filename;
				if (ua.ie6 && _tile_image_key.match(/\.png/i)) {
					if (_tile_image_key.match(/\?/)) _tile_image_key += '&format=gif';
					else _tile_image_key += '?format=gif';
				}
				
				debugstr("Late loading overlay tile: " + _tile_image_key );
				gGame._imageWeight += gImageLoader.loadImages( _tile_image_key );
			} // tile has query
		} // foreach key in map
	} // layer has map
};

_LevelLoader.prototype._getLoadProgress = function() {
	// check level data loading progress
	// result will be between 0.0 and 1.0
	if ((_num_keys(this._levels) - this._baseProgress) == 0) return 1.0;
	var _numLoaded = 0;
	
	for (var _level_id in this._levels) {
		if (this._levels[_level_id].loaded) _numLoaded++;
		else {
			var _level = this._levels[_level_id];
			if (_level.loaded) _numLoaded++;
		}
	}
	
	return ((_numLoaded - this._baseProgress) / (_num_keys(this._levels) - this._baseProgress));
};

_LevelLoader.prototype._resetProgress = function() {
	// set current state as zero progress, for subsequent
	// loads of additional content
	this._baseProgress = _num_keys(this._levels);
};

_LevelLoader.prototype.lookupLevel = function(_level_id) {
	// lookup level data object by its ID
	return this._levels[_level_id] ? this._levels[_level_id].data : null;
};
