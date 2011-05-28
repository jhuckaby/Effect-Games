// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// SpritePlane.js
// Manages a set of sprites in a port
////

function SpritePlane(_id) {
	// class constructor
	if (!_id) _id = _get_unique_id();
	this.id = _id;
	
	this.sprites = {};
	this._minSpriteSize = 16; // for collision detection
	
	// this controls how far out sprites can live before they
	// are destroyed (if dieOfscreen flag is set on sprite)
	// 0.0 = they die the INSTANT they leave the screen
	// 1.0 = they can live one whole screen in each direction
	this._dieOffscreenDistance = 0.5;
	
	// level may have array of sprites for onscreen invocation
	this._aether = null;
	this._aetherDistance = 0;
	this._aetherCheckFreq = 1; // update every N frames
	this._largestAetherSpriteWidth = 0;
	this._largestAetherSpriteHeight = 0;
	
	// offset all sprites by this amount
	this.offsetX = 0;
	this.offsetY = 0;
	
	// global opacity for all our sprites
	this.opacity = 1.0;
	
	// logic defaults to enabled
	this._logicEnabled = true;
	
	this._oldScrollX = -1;
	this._oldScrollY = -1;
};

// inherit from _Plane
SpritePlane.prototype = new _Plane();

// accessor methods
SpritePlane.prototype.setMinSpriteSize = function(_size) { this._minSpriteSize = parseInt(_size, 10); };
SpritePlane.prototype.setOffscreenDistance = function(_value) { this._dieOffscreenDistance = parseFloat(_value); };
SpritePlane.prototype.setAetherDistance = function(_value) { this._aetherDistance = parseFloat(_value); };
SpritePlane.prototype.setAetherCheckFreq = function(_value) { this._aetherCheckFreq = parseInt(_value, 10); };
SpritePlane.prototype.setLogic = function(_enabled) { this._logicEnabled = _enabled; };
SpritePlane.prototype.setSoloSprite = function(_sprite) { this._soloSprite = _sprite; };
SpritePlane.prototype.clearSoloSprite = function() { this._soloSprite = null; };

SpritePlane.prototype.init = function() {
	// setup
	assert(this.port, "No port attached to plane");
	this.globalID = this.port.id + '_' + this.id;
	
	// restore sprites if any
	for (var _key in this.sprites) {
		this.sprites[_key].init();
	}
};

SpritePlane.prototype.reset = function() {
	// delete all graphical elements (probably for re-zoom)
	for (var _key in this.sprites) {
		this.sprites[_key].reset();
	}
};

SpritePlane.prototype.deleteAll = function() {
	// delete all sprites
	this.reset();
	this.sprites = {};
};

SpritePlane.prototype.deleteSprite = function() {
	// delete one or more sprites by ids
	for (var idx = 0, len = arguments.length; idx < len; idx++) {
		var id = arguments[idx];
		if (this.sprites[id]) {
			this.sprites[id].destroy();
			delete this.sprites[id];
		}
	}
};
SpritePlane.prototype.deleteSprites = SpritePlane.prototype.deleteSprite;

SpritePlane.prototype.createSprite = function(_class_name, _args) {
	// create new sprite
	// args = {
	//	type: ClassType, // not a string
	//	width: 16, // unzoomed
	//	height: 32, // unzoomed
	//	url: 'character/mario_small.gif' // must be preloaded
	// }
	if (!_args) _args = {};
	if (!_args.type) _args.type = _class_name;
	
	if (_args.id && this.sprites[_args.id]) return _throwError("A sprite with that ID ("+_args.id+") already exists in this plane ("+this.id+").");
	
	// var sprite = (typeof(args.type) == 'string') ? eval('new ' + args.type) : new args.type;
	// var sprite = (typeof(args.type) == 'string') ? (new gGame._sprite_defs[args.type]._constructor) : (new args.type);
	var _sprite = null;
	if (typeof(_args.type) == 'string') {
		if (!gGame._sprite_defs[_args.type]) return _throwError("No sprite definition found for: " + _args.type);
		if (!gGame._sprite_defs[_args.type]._constructor) return _throwError("No sprite constructor found for: " + _args.type);
		_sprite = new gGame._sprite_defs[_args.type]._constructor;
	}
	else {
		_sprite = new _args.type;
	}
	
	for (var _key in _args) {
		// if (key != 'type') sprite[key] = args[key];
		_sprite[_key] = _args[_key];
	}
	if (typeof(_args.zIndex) == 'undefined') _sprite.zIndex = this.zIndex;
	if (typeof(_args.visible) == 'undefined') _sprite.visible = this.visible;

	this.attach(_sprite);
	return _sprite;
};

SpritePlane.prototype.attach = function(_sprite) {
	// attach newly created sprite to plane
	_sprite.plane = this;
	_sprite.port = this.port;
	
	// JH 2009-10-26: Switched these, so setup() comes after init().
	_sprite.init();
	_sprite.setup();
	
	if (this.sprites[ _sprite.id ]) {
		debugstr("WARNING: Duplicate sprite going into plane: " + this.id + ": " + _sprite.id );
	}
	
	this.sprites[ _sprite.id ] = _sprite;
};

SpritePlane.prototype.setOpacity = function(_newOpacity) {
	// set new opacity, will update all sprites on next draw()
	if (_newOpacity != this.opacity) {
		this.opacity = _newOpacity;
		this._dirtyClip = true;
	}
};

SpritePlane.prototype.draw = function(_instant) {
	// refresh plane
	var _drawClock = gGame.drawClock;
	for (var _key in this.sprites) {
		var _sprite = this.sprites[_key];
		if (this._dirtyClip) _sprite._dirtyClip = true;
		_sprite.draw(_drawClock);
		if (_sprite.destroyed) delete this.sprites[_key];
	}
	
	if (_instant) {
		// debugstr("calling _updateAether for _instant");
		this._updateAether(true);
	}
	this._dirtyClip = false;
};

SpritePlane.prototype.logic = function(_logicClock) {
	// execute logic routine on all sprites
	if (!this._logicEnabled) return;
	
	if (this._soloSprite) {
		this._soloSprite.logic(_logicClock);
		if (this._soloSprite && this._soloSprite.destroyed) {
			delete this.sprites[this._soloSprite.id];
			this._soloSprite = null;
		}
	}
	else {
		var _lates = [];
		for (var _key in this.sprites) {
			var _sprite = this.sprites[_key];
			if (_sprite.lateLogic) _lates.push(_key);
			else {
				if (!_sprite.destroyed) _sprite.logic(_logicClock);
				if (_sprite.destroyed) delete this.sprites[_key];
			}
		} // foreach sprite
		
		if (_lates.length > 0) {
			for (var _idx = 0, _len = _lates.length; _idx < _len; _idx++) {
				var _key = _lates[_idx];
				var _sprite = this.sprites[_key];
				if (!_sprite.destroyed) _sprite.logic(_logicClock);
				if (_sprite.destroyed) delete this.sprites[_key];
			} // foreach late sprite
		} // has late sprites
	} // not solo mode
};

SpritePlane.prototype.setScroll = function(_sx, _sy) {
	// set new scroll position
	this.scrollX = Math.floor( _sx * this.scrollSpeed );
	this.scrollY = Math.floor( _sy * this.scrollSpeed );
	
	if ((this.scrollX != this._oldScrollX) || (this.scrollY != this._oldScrollY)) {
		// debugstr("calling _updateAether ("+this.scrollX+"x"+this.scrollY+") != ("+this._oldScrollX+"x"+this._oldScrollY+")");
		this._updateAether(false);
		this._oldScrollX = this.scrollX;
		this._oldScrollY = this.scrollY;
	}
};

SpritePlane.prototype._getAetherKey = function(_x, _y) {
	// return aether key from global position
	return '' + Math.floor(_x / this.port.portWidth) + 'x' + Math.floor(_y / this.port.portHeight);
};

SpritePlane.prototype.setupAether = function(_aether) {
	// split raw aether into port-sized chunks, for search optimization
	this._aether = {};
	for (var _idx = 0, _len = _aether.length; _idx < _len; _idx++) {
		var _obj = _aether[_idx];
		
		// setup width/height
		/* assert(window[obj.type], "Object not loaded: " + obj.type);
		assert(window[obj.type].prototype, obj.type + " is not an object");
		if (!window[ obj.type ].prototype.width || !window[ obj.type ].prototype.height) 
			return _throwError("Object is not setup for aether (missing width/height in prototype)");
			
		obj.width = window[ obj.type ].prototype.width;
		obj.height = window[ obj.type ].prototype.height; */
		
		var _def = gGame._sprite_defs[ _obj.type ];
		if (!_def) return _throwError("No sprite definition found for: " + _obj.type);
		if (!_def.Width || !_def.Height) return _throwError("Sprite definition has no size: " + _obj.type);
		
		_obj.width = parseInt( _def.Width, 10 );
		_obj.height = parseInt( _def.Height, 10 );
		
		if (_def.Persist == 1) {
			this.createSprite( _obj.type, merge_objects(_obj, {
				type: _obj.type,
				visible: this.visible
			}) );
		}
		else {
			if (_obj.width > this._largestAetherSpriteWidth) this._largestAetherSpriteWidth = _obj.width;
			if (_obj.height > this._largestAetherSpriteHeight) this._largestAetherSpriteHeight = _obj.height;
			
			var _key = this._getAetherKey(_obj.x, _obj.y);
			if (!this._aether[_key]) this._aether[_key] = [];
			this._aether[_key].push( _obj );
		}
	} // foreach obj in aether
};

SpritePlane.prototype.addToAether = function(_obj) {
	// add object to aether (level editor)
	if (_obj._isSprite) return _throwError("Cannot add real sprite objects to aether.  Must be a generic stub object.");
	if (typeof(_obj.type) == 'undefined') return _throwError("Aether stub has no type.");
	if ((typeof(_obj.x) == 'undefined') || (typeof(_obj.y) == 'undefined')) 
		return _throwError("Aether stub has no position (x,y)");
	
	var _def = gGame._sprite_defs[ _obj.type ];
	if (_def && !_obj.width && !_obj.height) {
		_obj.width = parseInt( _def.Width, 10 );
		_obj.height = parseInt( _def.Height, 10 );
	}
	
	var _aetherKey = this._getAetherKey(_obj.x, _obj.y);
	if (!this._aether) this._aether = {};
	if (!this._aether[_aetherKey]) this._aether[_aetherKey] = [];
	this._aether[_aetherKey].push( _obj );
	
	if (_obj.width > this._largestAetherSpriteWidth) this._largestAetherSpriteWidth = _obj.width;
	if (_obj.height > this._largestAetherSpriteHeight) this._largestAetherSpriteHeight = _obj.height;
};

SpritePlane.prototype.sendAllToAether = function() {
	// send all active sprites to aether
	for (var _key in this.sprites) {
		this.sprites[_key].sendToAether();
	}
};

SpritePlane.prototype.getAllAetherSprites = function() {
	// return array of all aetherial sprites
	var _objs = [];
	
	for (var _aetherKey in this._aether) {
		if (this._aether[_aetherKey]) {
			var _aetherChunk = this._aether[_aetherKey];
			for (var _idx = 0, _len = _aetherChunk.length; _idx < _len; _idx++) {
				_objs.push( _aetherChunk[_idx] );
			} // foreach sprite in chunk
		} // chunk has sprites
	} // foreach aether chunk
	
	return _objs;
};

SpritePlane.prototype._updateAether = function(_instant) {
	// check aether for new sprites
	if (this._aether && (_instant || (gGame.logicClock % this._aetherCheckFreq == 0))) {
		// aether left/top draw distances must be at least as large as the maximum aether sprite width/height, respectively
		// this is because aether sprites may "drape" over the chunk egde on bottom/right only (hence draping onto top/left of neighbors)
		var _leftDist = (this.port.portWidth * this._aetherDistance);
		if (_leftDist < this._largestAetherSpriteWidth) _leftDist = this._largestAetherSpriteWidth;
		
		var _topDist = (this.port.portHeight * this._aetherDistance);
		if (_topDist < this._largestAetherSpriteHeight) _topDist = this._largestAetherSpriteHeight;
		
		var _activeRect = new Rect(
			this.scrollX - _leftDist,
			this.scrollY - _topDist,
			this.scrollX + this.port.portWidth + (this.port.portWidth * this._aetherDistance), 
			this.scrollY + this.port.portHeight + (this.port.portHeight * this._aetherDistance)
		);
		
		// determine which aether chunks we need to search
		var _aetherKeys = {};
		
		var _aymax = Math.ceil(_activeRect.height() / this.port.portHeight);
		var _axmax = Math.ceil(_activeRect.width() / this.port.portWidth);
		
		for (var _ay = 0; _ay <= _aymax; _ay++) {
			for (var _ax = 0; _ax <= _axmax; _ax++) {
				var _x = _activeRect.left + (_ax * this.port.portWidth); if (_x > _activeRect.right) _x = _activeRect.right;
				var _y = _activeRect.top + (_ay * this.port.portHeight); if (_y > _activeRect.bottom) _y = _activeRect.bottom;
				_aetherKeys[ this._getAetherKey(_x, _y) ] = 1;
			} // ax loop
		} // ay loop
		
		// JH 2009-10-31
		// okay, now that we copied all the aether keys to scan, we can reset the _activeRect.
		// so it is correct (screen bounds + aether distance), not artifically enlarged for hangovers.
		// otherwise, sprites may be created and destroyed instantly, over and over
		_activeRect.left = this.scrollX - (this.port.portWidth * this._aetherDistance);
		_activeRect.top = this.scrollY - (this.port.portHeight * this._aetherDistance);
		
		/* aetherKeys[ this._getAetherKey(activeRect.left, activeRect.top) ] = 1;
		aetherKeys[ this._getAetherKey(activeRect.right, activeRect.top) ] = 1;
		aetherKeys[ this._getAetherKey(activeRect.left, activeRect.bottom) ] = 1;
		aetherKeys[ this._getAetherKey(activeRect.right, activeRect.bottom) ] = 1;
		aetherKeys[ this._getAetherKey(activeRect.centerPointX(), activeRect.centerPointY()) ] = 1; */
		
		for (var _aetherKey in _aetherKeys) {
			if (this._aether[_aetherKey]) {
				var _aetherChunk = this._aether[_aetherKey];
								
				for (var _idx = 0, _len = _aetherChunk.length; _idx < _len; _idx++) {
										
					var _aetherObj = _aetherChunk[_idx];
					var _aetherRect = new Rect(
						_aetherObj.x, 
						_aetherObj.y, 
						_aetherObj.x + _aetherObj.width,
						_aetherObj.y + _aetherObj.height
					);

					if (_activeRect.rectIn(_aetherRect)) {
						var _sprite = this.createSprite( _aetherObj.type, merge_objects(_aetherObj, {
							type: _aetherObj.type,
							visible: this.visible,
							_aether: _aetherObj // JH 2009-10-27: Moved this here, so it is available at setup() time
						}) );
						
						// connect sprite with its aethereal counterpart
						// _sprite._aether = _aetherObj; // moved into createSprite above
						
						// remove obj from aether chunk
						_aetherChunk.splice(_idx, 1);
						// _array_splice( _aetherChunk, _idx, 1 );
						_idx--; _len--;
					} // yes, activate this sprite
				} // foreach aether obj
			} // aether has key
		} // foreach potential aether key
	} // level has aether
};

SpritePlane.prototype.hide = function() {
	// hide entire layer
	for (var _key in this.sprites) {
		this.sprites[_key].hide();
	}
	this.visible = false;
};

SpritePlane.prototype.show = function() {
	// show entire layer
	for (var _key in this.sprites) {
		this.sprites[_key].show();
	}
	this.visible = true;
};

SpritePlane.prototype.movePointX = function(_xpos, _ypos, _deltaX, _checkSprites, _tilePlane) {
	// move point horizontally in 16 pixel chunks
	if (_xpos._isPoint) {
		// user passed a real point instead of xpos, ypos
		var _pt = _xpos;
		_xpos = _pt.x;
		_ypos = _pt.y;
		_deltaX = arguments[1];
		_checkSprites = arguments[2];
		_tilePlane = arguments[3];
	}
	
	if (typeof(_checkSprites) == 'undefined') _checkSprites = true;
	if (typeof(_tilePlane) == 'undefined') _tilePlane = this.tilePlane;
	
	var _targetX = _xpos + _deltaX;
	if (parseInt(_xpos, 10) == parseInt(_targetX, 10)) return null;
	
	while (_xpos != _targetX) {
		if (_deltaX > 0) {
			_xpos += this._minSpriteSize;
			if (_xpos > _targetX) _xpos = _targetX;
		}
		else {
			_xpos -= this._minSpriteSize;
			if (_xpos < _targetX) _xpos = _targetX;
		}
		
		// check object collisions first
		if (_checkSprites) {
			for (var _key in this.sprites) {
				var _sprite = this.sprites[_key];
				if (_sprite.collisions && !_sprite.destroyed && _sprite.ptIn(_xpos, _ypos)) {
					var _adjX = _targetX;
					if (_sprite.solid) {
						if (_deltaX > 0) {
							if (_sprite.hitRect) _adjX = (_sprite.x + _sprite.hitRect.left) - 1;
							else _adjX = _sprite.x - 1;
						}
						else {
							if (_sprite.hitRect) _adjX = (_sprite.x + _sprite.hitRect.right);
							else _adjX = _sprite.x + _sprite.width;
						}
					}

					var _event = {
						type: 'collision',
						targetType: 'sprite',
						target: _sprite,
						correctedX: _adjX,
						correctedY: _ypos
					};
					return _event;
				} // collision
			} // foreach sprite
		} // checkSprites
		
		// finally, check tile collisions
		if (_tilePlane && _tilePlane.objectData) {
			var _obj = _tilePlane.lookupTileFromGlobal(_xpos, _ypos, 'objectData');
			if (_obj && _obj.collisions) {
				var _adjX = _xpos;
				if (_obj.solid) {
					var _modX = _xpos % _tilePlane.tileSizeX;
					if (_deltaX > 0) _adjX = (_xpos - _modX) - 1;
					else _adjX = _xpos + (_tilePlane.tileSizeX - _modX);
				}

				var _event = {
					type: 'collision',
					targetType: 'tile',
					target: _obj,
					correctedX: _adjX,
					correctedY: _ypos
				};
				return _event;
			} // collision
		} // tilePlane is attached
	} // while

	return null;
};

SpritePlane.prototype.movePointY = function(_xpos, _ypos, _deltaY, _checkSprites, _tilePlane) {
	// move point vertically in variable sized pixel chunks
	if (_xpos._isPoint) {
		// user passed a real point instead of xpos, ypos
		var _pt = _xpos;
		_xpos = _pt.x;
		_ypos = _pt.y;
		_deltaY = arguments[1];
		_checkSprites = arguments[2];
		_tilePlane = arguments[3];
	}
	
	if (typeof(_checkSprites) == 'undefined') _checkSprites = true;
	if (typeof(_tilePlane) == 'undefined') _tilePlane = this.tilePlane;
	
	var _targetY = _ypos + _deltaY;
	if (parseInt(_ypos, 10) == parseInt(_targetY, 10)) return null;

	while (_ypos != _targetY) {
		if (_deltaY > 0) {
			_ypos += this._minSpriteSize;
			if (_ypos > _targetY) _ypos = _targetY;
		}
		else {
			_ypos -= this._minSpriteSize;
			if (_ypos < _targetY) _ypos = _targetY;
		}

		// check object collisions first
		if (_checkSprites) {
			for (var _key in this.sprites) {
				var _sprite = this.sprites[_key];
				if (_sprite.collisions && !_sprite.destroyed && _sprite.ptIn(_xpos, _ypos)) {
					var _adjY = _targetY;
					if ((_deltaY > 0) && (_sprite.ground || _sprite.solid)) {
						if (_sprite.hitRect) _adjY = (_sprite.y + _sprite.hitRect.top) - 1;
						else _adjY = _sprite.y - 1;
					}
					else if ((_deltaY < 0) && _sprite.solid) {
						if (_sprite.hitRect) _adjY = _sprite.y + _sprite.hitRect.bottom;
						else _adjY = _sprite.y + _sprite.height;
					}

					var _event = {
						type: 'collision',
						targetType: 'sprite',
						target: _sprite,
						correctedX: _xpos,
						correctedY: _adjY
					};
					return _event;
				} // collision
			} // foreach sprite
		} // checkSprites

		// finally, check tile collisions
		if (_tilePlane && _tilePlane.objectData) {
			var _obj = _tilePlane.lookupTileFromGlobal(_xpos, _ypos, 'objectData');
			if (_obj && _obj.collisions) {
				var _adjY = _ypos;
				if ((((_deltaY > 0) && (_obj.ground || _obj.solid)) || ((_deltaY < 0) && _obj.solid))) {
					var _modY = _ypos % _tilePlane.tileSizeY;
					if (_deltaY > 0) _adjY = (_ypos - _modY) - 1;
					else _adjY = _ypos + (_tilePlane.tileSizeY - _modY);
				}

				var _event = {
					type: 'collision',
					targetType: 'tile',
					target: _obj,
					correctedX: _xpos,
					correctedY: _adjY
				};
				return _event;
			} // collision
		} // tilePlane is attached
	} // while

	return null;
};

SpritePlane.prototype.moveLineX = function(_xpos, _top, _bottom, _deltaX, _checkSprites, _tilePlane) {
	// move a vertical line horizontally
	var _events = [];
	
	for (var _ypos = _top; _ypos < _bottom; _ypos += this._minSpriteSize) {
		var _event = this.movePointX( _xpos, _ypos, _deltaX, _checkSprites, _tilePlane );
		if (_event) _events.push(_event);
	}
	var _ypos = _bottom - 1;
	var _event = this.movePointX( _xpos, _ypos, _deltaX, _checkSprites, _tilePlane );
	if (_event) _events.push(_event);
	
	if (!_events.length) return null;
	
	// hits into solid objects or tiles take priority
	for (var _idx = 0, _len = _events.length; _idx < _len; _idx++) {
		if (_events[_idx].target.solid) return _events[_idx];
	}
	
	// no solid hits?  just return first event then
	return _events[0];
};

SpritePlane.prototype.moveLineY = function(_ypos, _left, _right, _deltaY, _checkSprites, _tilePlane) {
	// move a horizontal line vertically
	var _events = [];
	
	for (var _xpos = _left; _xpos < _right; _xpos += this._minSpriteSize) {
		var _event = this.movePointY( _xpos, _ypos, _deltaY, _checkSprites, _tilePlane );
		if (_event) _events.push(_event);
	}
	var _xpos = _right - 1;
	var _event = this.movePointY( _xpos, _ypos, _deltaY, _checkSprites, _tilePlane );
	if (_event) _events.push(_event);
	
	if (!_events.length) return null;
	
	// hits into solid objects or tiles take priority
	for (var _idx = 0, _len = _events.length; _idx < _len; _idx++) {
		if (_events[_idx].target.solid) return _events[_idx];
	}
	
	// no solid hits?  just return first event then
	return _events[0];
};

SpritePlane.prototype.checkFreeTile = function(_tx, _ty) {
	// see if tile is free of objects and solid ground
	// needs attached tilePlane to work
	var _sx = this.tilePlane.tileSizeX;
	var _sy = this.tilePlane.tileSizeY;
	var _x = _tx * _sx;
	var _y = _ty * _sy;
	
	if (this.movePointX(_x, _y, 1)) return false;
	if (this.movePointY(_x + _sx - 1, _y, 1)) return false;
	if (this.movePointX(_x + _sx - 1, _y + _sy - 1, -1)) return false;
	if (this.movePointY(_x, _y + _sy - 1, -1)) return false;
	
	return true;
};

SpritePlane.prototype.findSprite = function(_criteria, _search_aether) {
	// search active sprite list for _criteria
	if (typeof(_criteria) != 'object') _criteria = { id: ''+_criteria };
	var _criteria_length = _num_keys(_criteria);
	
	for (var _key in this.sprites) {
		var _sprite = this.sprites[_key];
		if (!_sprite.destroyed) {
			var _matches = 0;
		
			for (var _b in _criteria) {
				if (_sprite[_b] == _criteria[_b]) _matches++;
			}
			if (_matches >= _criteria_length) return _sprite;
		}
	}
	
	if (_search_aether && this._aether) {
		for (var _aetherKey in this._aether) {
			if (this._aether[_aetherKey]) {
				var _aetherChunk = this._aether[_aetherKey];
				for (var _idx = 0, _len = _aetherChunk.length; _idx < _len; _idx++) {
					var _sprite = _aetherChunk[_idx];
					var _matches = 0;

					for (var _b in _criteria) {
						if (_sprite[_b] == _criteria[_b]) _matches++;
					}
					if (_matches >= _criteria_length) return _sprite;
				} // foreach obj in chunk
			} // chunk has objs
		} // foreach chunk
	} // search aether
	
	return null;
};

SpritePlane.prototype.findSprites = function(_criteria, _search_aether) {
	// search active sprite list for _criteria, return ALL found
	if (!_criteria) _criteria = {};
	var _matched_sprites = [];
	
	if (typeof(_criteria) == 'function') {
		// callback criteria
		for (var _key in this.sprites) {
			var _sprite = this.sprites[_key];
			if (!_sprite.destroyed) {
				if (_criteria.call(_sprite, _sprite)) _matched_sprites.push(_sprite);
			}
		}
		
		if (_search_aether && this._aether) {
			for (var _aetherKey in this._aether) {
				if (this._aether[_aetherKey]) {
					var _aetherChunk = this._aether[_aetherKey];
					for (var _idx = 0, _len = _aetherChunk.length; _idx < _len; _idx++) {
						var _sprite = _aetherChunk[_idx];
						if (_criteria.call(_sprite, _sprite)) _matched_sprites.push(_sprite);
					} // foreach obj in chunk
				} // chunk has objs
			} // foreach chunk
		} // search aether
	}
	else {
		// hash criteria
		var _criteria_length = _num_keys(_criteria);
	
		for (var _key in this.sprites) {
			var _sprite = this.sprites[_key];
			if (!_sprite.destroyed) {
				var _matches = 0;
		
				for (var _b in _criteria) {
					if (_sprite[_b] == _criteria[_b]) _matches++;
				}
				if (_matches >= _criteria_length) _matched_sprites.push(_sprite);
			}
		}
	
		if (_search_aether && this._aether) {
			for (var _aetherKey in this._aether) {
				if (this._aether[_aetherKey]) {
					var _aetherChunk = this._aether[_aetherKey];
					for (var _idx = 0, _len = _aetherChunk.length; _idx < _len; _idx++) {
						var _sprite = _aetherChunk[_idx];
						var _matches = 0;

						for (var _b in _criteria) {
							if (_sprite[_b] == _criteria[_b]) _matches++;
						}
						if (_matches >= _criteria_length) _matched_sprites.push(_sprite);
					} // foreach obj in chunk
				} // chunk has objs
			} // foreach chunk
		} // search aether
	}
	
	if (!_matched_sprites.each) _matched_sprites.each = function(_callback) {
		for (var _idx = 0, _len = this.length; _idx < _len; _idx++) {
			_callback.call(this[_idx], this[_idx]);
		}
	};
	
	return _matched_sprites;
};

SpritePlane.prototype.lookupSprite = function(_id, _search_aether) {
	// lookup sprite by its id (quickest)
	var _sprite = this.sprites[ _id ];
	
	if (!_sprite && _search_aether && this._aether) {
		for (var _aetherKey in this._aether) {
			if (this._aether[_aetherKey]) {
				var _aetherChunk = this._aether[_aetherKey];
				for (var _idx = 0, _len = _aetherChunk.length; _idx < _len; _idx++) {
					var _asprite = _aetherChunk[_idx];
					if (_asprite.id == _id) return _asprite;
				} // foreach obj in chunk
			} // chunk has objs
		} // foreach chunk
	} // search aether
	
	return _sprite;
};

SpritePlane.prototype.getSprite = SpritePlane.prototype.lookupSprite;

SpritePlane.prototype.lookupSpriteFromGlobal = function() {
	// locate sprite from global point
	var _pt = (arguments.length == 1) ? arguments[0].clone() : new Point(arguments[0], arguments[1]);
	var _hopefuls = [];
	
	for (var _key in this.sprites) {
		var _sprite = this.sprites[_key];
		if (!_sprite.destroyed && _sprite.pointIn(_pt)) _hopefuls.push( _sprite );
	}
	if (!_hopefuls.length) return null;
	
	var _highest_zindex = 0;
	var _best = null;
	for (var _idx = 0, _len = _hopefuls.length; _idx < _len; _idx++) {
		var _sprite = _hopefuls[_idx];
		if (_sprite.zIndex > _highest_zindex) {
			_highest_zindex = _sprite.zIndex;
			_best = _sprite;
		}
	}
	
	return _best;
};

SpritePlane.prototype.lookupSpriteFromScreen = function() {
	// locate sprite from global point
	var _pt = (arguments.length == 1) ? arguments[0].clone() : new Point(arguments[0], arguments[1]);
	_pt.x = this.unzoom(_pt.x) + this.scrollX;
	_pt.y = this.unzoom(_pt.y) + this.scrollY;
	return this.lookupSpriteFromGlobal(_pt);
};

SpritePlane.prototype.findSpritesByPoint = function(_pt, _search_aether) {
	// find all sprites that intersect with a point
	var _matched_sprites = [];
	
	for (var _key in this.sprites) {
		var _sprite = this.sprites[_key];
		if (!_sprite.destroyed && _sprite.getRect().pointIn(_pt)) {
			_matched_sprites.push(_sprite);
		}
	}
	
	if (_search_aether && this._aether) {
		for (var _aetherKey in this._aether) {
			if (this._aether[_aetherKey]) {
				var _aetherChunk = this._aether[_aetherKey];
				for (var _idx = 0, _len = _aetherChunk.length; _idx < _len; _idx++) {
					var _sprite = _aetherChunk[_idx];
					var _arect = new Rect( _sprite.x, _sprite.y, _sprite.x + _sprite.width, _sprite.y + _sprite.height );
					if (_arect.pointIn(_pt)) _matched_sprites.push(_sprite);
				} // foreach obj in chunk
			} // chunk has objs
		} // foreach chunk
	} // search aether
	
	if (!_matched_sprites.each) _matched_sprites.each = function(_callback) {
		for (var _idx = 0, _len = this.length; _idx < _len; _idx++) {
			_callback.call(this[_idx], this[_idx]);
		}
	};
	
	return _matched_sprites;
};

SpritePlane.prototype.findSpritesByRect = function(_rect, _search_aether) {
	// find all sprites that intersect with a rectangle
	var _matched_sprites = [];
	
	for (var _key in this.sprites) {
		var _sprite = this.sprites[_key];
		if (!_sprite.destroyed && _sprite.getRect().rectIn(_rect)) {
			_matched_sprites.push(_sprite);
		}
	}
	
	if (_search_aether && this._aether) {
		for (var _aetherKey in this._aether) {
			if (this._aether[_aetherKey]) {
				var _aetherChunk = this._aether[_aetherKey];
				for (var _idx = 0, _len = _aetherChunk.length; _idx < _len; _idx++) {
					var _sprite = _aetherChunk[_idx];
					var _arect = new Rect( _sprite.x, _sprite.y, _sprite.x + _sprite.width, _sprite.y + _sprite.height );
					if (_arect.rectIn(_rect)) _matched_sprites.push(_sprite);
				} // foreach obj in chunk
			} // chunk has objs
		} // foreach chunk
	} // search aether
	
	if (!_matched_sprites.each) _matched_sprites.each = function(_callback) {
		for (var _idx = 0, _len = this.length; _idx < _len; _idx++) {
			_callback.call(this[_idx], this[_idx]);
		}
	};
	
	return _matched_sprites;
};

SpritePlane.prototype.linkTilePlane = function(_plane) {
	// link to tile plane for collision detection
	this.tilePlane = _plane;
	_plane.spritePlane = this;
};

SpritePlane.prototype.tween = function(_args) {
	// tween object properties
	_args.target = this;
	gTween.addTween(_args);
};

SpritePlane.prototype.onTweenUpdate = function(_tween) {
	// special care must be taken depending on which properties are being tweened
	var _props = _tween.properties;
	if (_props.opacity) this._dirtyClip = true;
};

SpritePlane.prototype.getScreenRect = function() {
	return new Rect(
		this.scrollX, 
		this.scrollY, 
		this.scrollX + this.port.portWidth, 
		this.scrollY + this.port.portHeight 
	);
};
