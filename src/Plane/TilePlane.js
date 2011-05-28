// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// TilePlane.js
// Implements a fast scrolling tile plane for large tilesets.
////

function TilePlane(_id) {
	// class constructor
	// associate plane with Portal object	
	if (!_id) _id = _get_unique_id();
	this.id = _id;
	
	this.tileSizeX = 0;
	this.tileSizeY = 0;
	this.tileImagePath = ''; // MUST SET
	
	this.data = [ [] ];
	this.map = {};
	this.rev_map = {};
	
	this._activeList = [];
	this._freeList = [];
	this._divs = {};
	this._objs = {};
	
	this._oldScrollX = 0;
	this._oldScrollY = 0;
	
	this._tilesPerDivX = 0;
	this._tilesPerDivY = 0;

	this._instantLoad = false;
	
	this.opacity = 1.0;

	// custom draw function
	this._drawTile = null;
};

// inherit from _Plane
TilePlane.prototype = new _Plane();

// Accessor methods:
TilePlane.prototype.setTileSize = function(_width, _height) { this.tileSizeX = parseInt(_width, 10); this.tileSizeY = parseInt(_height, 10); };
TilePlane.prototype.setTilesPerChunk = function(_nx, _ny) { this._tilesPerDivX = parseInt(_nx, 10); this._tilesPerDivY = parseInt(_ny, 10); };
TilePlane.prototype.setInstantLoad = function(_enabled) { this._instantLoad = !!_enabled; };
TilePlane.prototype.setDrawTile = function(_func) { this._drawTile = _func; };

TilePlane.prototype.getMaxTileX = function() { 
	return Math.ceil( (this.port.portWidth + ((this.port.virtualWidth - this.port.portWidth) * this.scrollSpeed)) / this.tileSizeX ); 
};

TilePlane.prototype.getMaxTileY = function() { 
	return Math.ceil( (this.port.portHeight + ((this.port.virtualHeight - this.port.portHeight) * this.scrollSpeed)) / this.tileSizeY ); 
};

TilePlane.prototype.setTileset = function(_name) {
	// set tileset for our tile plane
	if (this.tileImagePath) return _throwError("Cannot change the Tileset once it is set.");
	
	var _tileset_id = _name;
	var _tileset = _find_object( gGame._def.Tilesets.Tileset, { Name: _tileset_id } );
	if (!_tileset) return _throwError("Could not locate tileset definition: " + _tileset_id);
	
	this.tileImagePath = _tileset.Path.replace(/\/$/, '');
	this.setTileSize( _tileset.TileWidth, _tileset.TileHeight );
};

TilePlane.prototype.init = function() {
	// add DIVs to portal
	assert(this.port, "No port attached to plane" );
	this.globalID = this.port.id + '_' + this.id;
	
	if (!this.tileSizeX || !this.tileSizeY) return _throwError("No tile size specified for TilePlane.");
	
	if (!this._tilesPerDivX || !this._tilesPerDivY) {
		// automatically calculate this based on tile size and port size
		var _tpx = Math.floor( (this.port.portWidth / this.tileSizeX) / (0 ? 4 : 2) );
		if (!_tpx) _tpx = 1;
		this._tilesPerDivX = _tpx;
		
		var _tpy = Math.floor( (this.port.portHeight / this.tileSizeY) / (0 ? 4 : 2) );
		if (!_tpy) _tpy = 1;
		this._tilesPerDivY = _tpy;
	}
	
	// the number of divs should be the max viewable divs
	// plus one more column horiz and one more row vert
	this._divWidth = this.tileSizeX * this._tilesPerDivX;
	this._divHeight = this.tileSizeY * this._tilesPerDivY;
	
	this._zDivWidth = this.zoom(this._divWidth);
	this._zDivHeight = this.zoom(this._divHeight);
	
	var _numDivsX = Math.ceil(this.port.portWidth / this._divWidth) + 1;
	var _numDivsY = Math.ceil(this.port.portHeight / this._divHeight) + 1;
	this._numDivs = _numDivsX * _numDivsY;
	
	// create all divs
	for (var _idx = 0, _len = this._numDivs; _idx < _len; _idx++) {
		var _divID = this.globalID + '_' + _idx;
		
		var _div = document.createElement('DIV');
		_div.setAttribute('id', _divID);
		_div.id = _divID;
		_div.style.position = 'absolute';
		_div.style.left = '-1000px';
		_div.style.top = '0px';
		_div.style.width = this.zoom(this._divWidth) + 'px';
		_div.style.height = this.zoom(this._divHeight) + 'px';
		_div.style.zIndex = this.zIndex;
		_div.style.visibility = this.visible ? 'visible' : 'hidden';
		if (this.opacity != 1.0) _set_opacity( _div, this.opacity );
		if (ua.ie) _div.setAttribute( 'onselectstart', "return false" );
		this.port.div.appendChild(_div);
		
		// render div contents
		var _zTileSizeX = this.zoom(this.tileSizeX);
		var _zTileSizeY = this.zoom(this.tileSizeY);
		
		var _zTileURL = gGame.getGamePath() + this.tileImagePath;
		var _html = '';
		if (this._drawTile) {
			var _table_width = _zTileSizeX * this._tilesPerDivX;
			var _table_height = _zTileSizeY * this._tilesPerDivY;
			_html = '<table cellspacing="0" cellpadding="0" border="0" ' + 
				'style="border-collapse:collapse; table-layout:fixed; width:'+_table_width+'px; height:'+_table_height+'px;">';
		}
		
		for (var _y = 0; _y < this._tilesPerDivY; _y++) {
			if (this._drawTile) _html += '<tr>';
			
			for (var _x = 0; _x < this._tilesPerDivX; _x++) {
				if (this._drawTile) _html += '<td width="' + _zTileSizeX + '" height="' + _zTileSizeY + '">';
				var _imgID = _divID + '_' + _x + '_' + _y;
				if (this._drawTile) {
					_html += '<div id="' + _imgID + '" style="width:'+_zTileSizeX+'px; height:'+_zTileSizeY+'px;"></div>';
				}
				else {
					_html += '<img id="' + _imgID + '" src="' + this._get_blank_tile_url() + 
						'" width="' + _zTileSizeX + '" height="' + _zTileSizeY + '" border="0"';
					if (ua.ie) _html += ' onselectstart="return false"';
					_html += '/>';
				}
				if (this._drawTile) _html += '</td>';
			} // x loop
			
			if (this._drawTile) _html += '</tr>';
			else _html += '<br/>';
		} // y loop
		
		if (this._drawTile) _html += '</table>';
		_div.innerHTML = _html;
		
		_array_push( this._freeList, _divID );
		this._divs[ _divID ] = _div;
		this._objs[ _divID ] = {
			id: _divID,
			div: _div,
			style: _div.style,
			left: -1000,
			top: 0,
			data: _make_2d_array( this._tilesPerDivX, this._tilesPerDivY, 0 )
		};
	} // foreach div
	
	// JH commented this out 03/28/2007 because it is totally incorrect
	// TilePlane has no _maxPriorityLevels or dynaLoader -- it is part of ImageLoader
	/*for (var idx = 0; idx <= this._maxPriorityLevels; idx++) {
		this.dynaLoader[idx] = {};
	}*/
};

TilePlane.prototype.reset = function() {
	// delete all graphical elements (probably for re-zoom)
	for (var _divID in this._divs) {
		try { this.port.div.removeChild(this._divs[_divID]); } catch (e) {
			// try one last time
			var _div = el( divID );
			try { this.port.div.removeChild(_div); } catch (e) { ; };
		}
	}
	
	this._activeList = [];
	this._freeList = [];
	this._divs = {};
	this._objs = {};
};

TilePlane.prototype.setZIndex = function(_idx) {
	// set zIndex level, propagate to all divs
	this.zIndex = parseInt(_idx, 10);
	
	for (var _divID in this._divs) {
		this._divs[ _divID ].style.zIndex = _idx;
	}
};

TilePlane.prototype.setOpacity = function(_op) {
	// set opacity on entire tile plane
	this.opacity = _op;
	for (var _divID in this._divs) {
		_set_opacity( this._divs[ _divID ], _op );
	}
};

TilePlane.prototype._dump_info = function() {
	debugstr("TilePlane " + this.id + ": Info Dump");
	debugstr("activeList: " + dumper( this._activeList ) );
	for (var _idx = 0, _len = this._activeList.length; _idx < _len; _idx++) {
		debugstr( dumper( this._objs[ this._activeList[_idx] ] ) );
	}
	debugstr("freeList: " + dumper( this._freeList ) );
	for (var _idx = 0, _len = this._freeList.length; _idx < _len; _idx++) {
		debugstr( dumper( this._objs[ this._freeList[_idx] ] ) );
	}
};

TilePlane.prototype.draw = function(_instant) {
	// refresh plane
	var _scrollModX = this.scrollX % this._divWidth;
	var _scrollModY = this.scrollY % this._divHeight;
	
	// get zoomed port and div sizes
	var _zPortWidth = this.port.div.offsetWidth;
	var _zPortHeight = this.port.div.offsetHeight;
	
	var _zDivWidth = this._zDivWidth;
	var _zDivHeight = this._zDivHeight;
	
	// our divs may not fit exactly into the port
	// so calculate the adjusted port width / height
	var _zAdjPortWidth = _zPortWidth;
	if (_zPortWidth % _zDivWidth) _zAdjPortWidth += (_zDivWidth - (_zPortWidth % _zDivWidth));
	
	var _zAdjPortHeight = _zPortHeight;
	if (_zPortHeight % _zDivHeight) _zAdjPortHeight += (_zDivHeight - (_zPortHeight % _zDivHeight));
	
	// move all tile strips based on new scrollX, scrollY
	// and deactivate tile strips that have gone offscreen
	var _xd = this.zoom( this.scrollX - this._oldScrollX );
	var _yd = this.zoom( this.scrollY - this._oldScrollY );
	
	if (_xd || _yd) {
		for (var _idx = 0, _len = this._activeList.length; _idx < _len; _idx++) {
			// var div = this._divs[ this._activeList[idx] ];
			var _obj = this._objs[ this._activeList[_idx] ] ;
			var _xpos = _obj.left - _xd;
			var _ypos = _obj.top - _yd;
			
			if ((_xpos <= 0 - _zDivWidth) || (_xpos >= _zAdjPortWidth) || 
				(_ypos <= 0 - _zDivHeight) || (_ypos >= _zAdjPortHeight)) {
				// yes, div is now entirely offscreen
				_obj.style.left = '-1000px';
				_obj.left = -1000;
				// gImageLoader._dynaClear(this._activeList[idx]);
				
				// debugstr("TilePlane: Removing div from active list: " + _obj.id );
				
				// _array_push( this._freeList, _array_splice(this._activeList, _idx, 1)[0] );
				this._freeList.push( this._activeList.splice(_idx, 1)[0] );
				
				_idx--; _len--;
			}
			else {
				_obj.style.left = _xpos + 'px';
				_obj.style.top = _ypos + 'px';
				_obj.left = _xpos;
				_obj.top = _ypos;
			}
		}
	} // scrolled
	
	if (!ua.ff3) {
		this._tempObjs = {};
		for (var _idx = 0, _len = this._activeList.length; _idx < _len; _idx++) {
			this._tempObjs[this._activeList[_idx]] = this._objs[ this._activeList[_idx] ];
		}
	}

	// var zTileURL = gGame.getGamePath() + this.tileImagePath;
		
	// now determine how many new divs we need to activate
	for (var _xpos = 0; _xpos <= _zAdjPortWidth; _xpos += _zDivWidth) {
		for (var _ypos = 0; _ypos <= _zAdjPortHeight; _ypos += _zDivHeight) {
			
// debugstr("TP: checking for active div at: " + _xpos + 'x' + _ypos);
			
			if (!this._tempPtInActiveDiv(_xpos, _ypos)) {
				// exceptions: if scroll mod is 0, right and bottom edge
				// do not get new divs
				if (!_scrollModX && (_xpos == _zAdjPortWidth)) continue;
				if (!_scrollModY && (_ypos == _zAdjPortHeight)) continue;
// debugstr("TP: activating new div at: " + _xpos + " x " + _ypos);
				
				// activate new div at this location
				// var id = _array_pop( this._freeList );
				var _id = this._freeList.pop();
				// assert(_id, "TilePlane: No available nodes in freelist" );
				if (!_id) {
					this._dump_info();
					debugstr("Needed new node for pos: " + _xpos + 'x' + _ypos);
					debugstr("Manual lookup finds: " + this._ptInActiveDiv(_xpos, _ypos));
					assert(false, "TilePlane " + this.id + ": No available nodes in freelist");
					return;
				}
				
				// _array_push( this._activeList, id );
				this._activeList.push( _id );
				var _obj = this._objs[_id];
				
				// debugstr("TilePlane: Added new obj to active list: " + _obj.id);
				
				// figure out what tile map location this div controls
				var _adjXPos = _xpos - this.zoom( _scrollModX );
				var _adjYPos = _ypos - this.zoom( _scrollModY );
				
				var _tileLeft = parseInt( (this.unzoom(_adjXPos) + this.scrollX) / this.tileSizeX, 10 );
				var _tileTop = parseInt( (this.unzoom(_adjYPos) + this.scrollY) / this.tileSizeY, 10 );
// debugstr("TP: new div id: " + _id + ", tileLeft: " + _tileLeft + ", tileTop: " + _tileTop);
				
				// assign IMG SRC tags
				for (var _iy = 0; _iy < this._tilesPerDivY; _iy++) {
					for (var _ix = 0; _ix < this._tilesPerDivX; _ix++) {
						var _imgID = _obj.id + '_' + _ix + '_' + _iy;
						
						var _tileID = 0;
						if (_tileLeft + _ix < this.data.length) {
							var _col = this.data[_tileLeft + _ix];
							if (_col && (_tileTop + _iy < _col.length)) {
								_tileID = _col[_tileTop + _iy];
							}
						}
						
						/* if (tileLeft + ix >= this.data.length) continue;
						var tileID = this.data[ tileLeft + ix ][ tileTop + iy ];
						if (typeof(tileID) == 'undefined') continue; */
						
						if ((_obj.data[_ix][_iy] == _tileID) && !this._drawTile) continue; // image already set to the right tile
						_obj.data[_ix][_iy] = _tileID;
						
						var _tile_image_key = '';
						if (_tileID) {
							_tile_image_key = this.tileImagePath + '/' + this.map[_tileID];
							if (ua.ie6 && _tile_image_key.match(/\.png/i)) {
								if (_tile_image_key.match(/\?/)) _tile_image_key += '&format=gif';
								else _tile_image_key += '?format=gif';
							}
						}
						
						var _url = _tileID ? gGame._imageLoader.getImageURL(_tile_image_key) : this._get_blank_tile_url();
						
						if (this._drawTile) {
							var _cdiv = el(_imgID);
							assert(_cdiv, "Cannot find div: " + _imgID);
							this._drawTile( _cdiv, _tileLeft + _ix, _tileTop + _iy, this.map[_tileID], this.lookupTile(_tileLeft + _ix, _tileTop + _iy, 'objectData'), _url );
						}
						else {
							var _priority = 1.0;
							if (_xd > 0) _priority *= (_ix / (this._tilesPerDivX - 1));
							else if (_xd < 0) _priority *= (((this._tilesPerDivX - 1) - _ix) / (this._tilesPerDivX - 1));
							if (_yd > 0) _priority *= (_iy / (this._tilesPerDivY - 1));
							else if (_yd < 0) _priority *= (((this._tilesPerDivY - 1) - _iy) / (this._tilesPerDivY - 1));
							
							// gImageLoader.dynaLoad( imgID, this.tileImagePath + '/' + tileID, priority );
							
							if (_instant || this._instantLoad || !_priority || (Math.abs(_xd) >= _zDivWidth) || (Math.abs(_yd) >= _zDivHeight)) {
								var _img = el(_imgID);
								assert(_img, "TilePlane: Cannot find image: " + _imgID);
								_img.src = _url;
								delete gGame._imageLoader._dynaLoader[_imgID];
							}
							else {
								gGame._imageLoader.dynaLoad( _imgID, _tileID ? (_tile_image_key) : this._get_blank_tile_url(), _priority );
							}
						} // standard tile map
					} // x loop
				} // y loop
				
				// move div into place
// alert("adjusted coords: " + adjXPos + " x " + adjYPos);
				
				_obj.style.left = _adjXPos + 'px';
				_obj.style.top = _adjYPos + 'px';
				_obj.left = _adjXPos;
				_obj.top = _adjYPos;
				
				// only allow one new div per frame
				if (!_instant && !this._instantLoad) {
					_xpos = _zAdjPortWidth + 1;
					_ypos = _zAdjPortHeight + 1;
				}
			} // need new div here
		} // ypos loop
	} // xpos loop

	// check for object plane updates
	if (gGame.inGame && this.objectData && (_xd || _yd)) this._updateObjectData();
		
	// remember scroll values for next iteration
	this._oldScrollX = this.scrollX;
	this._oldScrollY = this.scrollY;
};

TilePlane.prototype._updateObjectData = function() {
	// update object data after scrolling
	var _newTiles = 0;
	var _startX = 0;
	var _startY = 0;
	var _endX = 0;
	var _endY = 0;

	if (this.scrollX > this._oldScrollX) {
		var _stx = parseInt( (this.scrollX + this.port.portWidth - 1) / this.tileSizeX, 10 );
		var _oldStx = parseInt( (this._oldScrollX + this.port.portWidth - 1) / this.tileSizeX, 10 );

		if (_stx != _oldStx) {
			var _leftSide = parseInt( this.scrollX / this.tileSizeX, 10 );
			_startX = _oldStx + 1;
			if (_startX < _leftSide) _startX = _leftSide;
			_endX = _stx;

			_startY = parseInt( this.scrollY / this.tileSizeY, 10 );
			_endY = parseInt( (this.scrollY + this.port.portHeight - 1) / this.tileSizeY, 10 );

			_newTiles = 1;
		} // activate new tiles on right
	} // scrolled right
	else if (this.scrollX < this._oldScrollX) {
		var _stx = parseInt( this.scrollX / this.tileSizeX, 10 );
		var _oldStx = parseInt( this._oldScrollX / this.tileSizeX, 10 );
		
		if (_stx != _oldStx) {
			var _rightSide = parseInt( (this.scrollX + this.port.portWidth - 1) / this.tileSizeX, 10 );
			_startX = _stx;
			_endX = _oldStx - 1;
			if (_endX > _rightSide) _endX = _rightSide;

			_startY = parseInt( this.scrollY / this.tileSizeY, 10 );
			_endY = parseInt( (this.scrollY + this.port.portHeight - 1) / this.tileSizeY, 10 );

			_newTiles = 1;
		} // activate new tiles on left
	} // scrolled left

	if (_newTiles) {
		for (var _tx = _startX; _tx <= _endX; _tx++) {
			for (var _ty = _startY; _ty <= _endY; _ty++) {
				var _obj = this.lookupTile( _tx, _ty, 'objectData' );
				if (_obj) _obj.onScreen();
			} // y loop
		} // x loop
		_newTiles = 0;
	} // activate new object tiles

	if (this.scrollY > this._oldScrollY) {
		var _sty = parseInt( (this.scrollY + this.port.portHeight - 1) / this.tileSizeY, 10 );
		var _oldSty = parseInt( (this._oldScrollY + this.port.portHeight - 1) / this.tileSizeY, 10 );

		if (_sty != _oldSty) {
			var _topSide = parseInt( this.scrollY / this.tileSizeY, 10 );
			_startY = _oldSty + 1;
			if (_startY < _topSide) _startY = _topSide;
			_endY = _sty;

			_startX = parseInt( this.scrollX / this.tileSizeX, 10 );
			_endX = parseInt( (this.scrollX + this.port.portWidth - 1) / this.tileSizeX, 10 );

			_newTiles = 1;
		} // activate new tiles on bottom
	} // scrolled down
	else if (this.scrollY < this._oldScrollY) {
		var _sty = parseInt( this.scrollY / this.tileSizeY, 10 );
		var _oldSty = parseInt( this._oldScrollY / this.tileSizeY, 10 );
		
		if (_sty != _oldSty) {
			var _bottomSide = parseInt( (this.scrollY + this.port.portHeight - 1) / this.tileSizeY, 10 );
			_startY = _sty;
			_endY = _oldSty - 1;
			if (_endY > _bottomSide) _endY = _bottomSide;

			_startX = parseInt( this.scrollX / this.tileSizeX, 10 );
			_endX = parseInt( (this.scrollX + this.port.portWidth - 1) / this.tileSizeX, 10 );

			_newTiles = 1;
		} // activate new tiles on top
	} // scrolled up
	
	if (_newTiles) {
		for (var _tx = _startX; _tx <= _endX; _tx++) {
			for (var _ty = _startY; _ty <= _endY; _ty++) {
				var _obj = this.lookupTile( _tx, _ty, 'objectData' );
				if (_obj) _obj.onScreen();
			} // y loop
		} // x loop
	} // activate new object tiles
};

TilePlane.prototype.activateScreenObjects = function() {
	// call onScreen on all objects currently onscreen
	// (for beginning of level)
	var _leftSide = parseInt( this.scrollX / this.tileSizeX, 10 );
	var _rightSide = parseInt( (this.scrollX + this.port.portWidth) / this.tileSizeX, 10 );
	var _topSide = parseInt( this.scrollY / this.tileSizeY, 10 );
	var _bottomSide = parseInt( (this.scrollY + this.port.portHeight) / this.tileSizeY, 10 );
	
	for (var _tx = _leftSide - 1; _tx <= _rightSide; _tx++) {
		for (var _ty = _topSide; _ty <= _bottomSide; _ty++) {
			var _obj = this.lookupTile( _tx, _ty, 'objectData' );
			if (_obj) _obj.onScreen();
		} // y loop
	} // x loop
};

TilePlane.prototype._tempPtInActiveDiv = function(_xpos, _ypos) {
	// scan active list to see if point falls in active div
	// x and y are pre-zoomed, localized port coords
	if (ua.ff3) return this._ptInActiveDiv(_xpos, _ypos);
	
	for (var _key in this._tempObjs) {
		var _obj = this._tempObjs[_key];
		if ((_xpos >= _obj.left) && (_xpos < _obj.left + this._zDivWidth) && 
			(_ypos >= _obj.top) && (_ypos < _obj.top + this._zDivHeight)) {
			// yup, found one
			delete this._tempObjs[_key];
			return this._divs[_key];
		}
	}
	
	return null;
};

TilePlane.prototype._ptInActiveDiv = function(_xpos, _ypos) {
	// scan active list to see if point falls in active div
	// x and y are pre-zoomed, localized port coords
	
	for (var _idx = 0; _idx < this._activeList.length; _idx++) {
		var _obj = this._objs[ this._activeList[_idx] ];
		if ((_xpos >= _obj.left) && (_xpos < _obj.left + this._zDivWidth) && 
			(_ypos >= _obj.top) && (_ypos < _obj.top + this._zDivHeight)) {
			// yup, found one
			return this._divs[ this._activeList[_idx] ];
		}
	} // foreach active div
	
	return null;
};

TilePlane.prototype.lookupTileFromScreen = function(_xpos, _ypos, _dataName) {
	// lookup tile index based on screen position
	if (!_dataName) _dataName = 'data'; // default to tile data
	var _tx = parseInt( (this.unzoom(_xpos) + this.scrollX) / this.tileSizeX, 10 );
	var _ty = parseInt( (this.unzoom(_ypos) + this.scrollY) / this.tileSizeY, 10 );

	return this.lookupTile(_tx, _ty, _dataName);
};

TilePlane.prototype.lookupTileFromGlobal = function(_xpos, _ypos, _dataName) {
	// lookup tile index based on global coords
	if (!_dataName) _dataName = 'data'; // default to tile data
	var _tx = parseInt( _xpos / this.tileSizeX, 10 );
	var _ty = parseInt( _ypos / this.tileSizeY, 10 );
	
	return this.lookupTile(_tx, _ty, _dataName);
};

TilePlane.prototype.lookupTile = function(_tx, _ty, _dataName) {
	// lookup tile given index coords
	if (!_dataName) _dataName = 'data'; // default to tile data
	else if (_dataName === true) _dataName = 'objectData';
	
	if (!this[_dataName]) return 0;
	if ((_tx < 0) || (_ty < 0) || (_tx >= this[_dataName].length)) return 0;
	
	var _col = this[_dataName][_tx];
	if (!_col || (_ty >= _col.length)) return 0;
	
	var _value = _col[_ty] || 0;
	if ((_dataName == 'data') && _value) {
		// must convert idx back to filename for output
		_value = this.map[_value];
	}
	
	return _value;
};

TilePlane.prototype.setTileFromScreen = function(_xpos, _ypos, _idx, _dataName) {
	// set tile index based on screen position
	if (!_dataName) _dataName = 'data'; // default to tile data
	var _tx = parseInt( (this.unzoom(_xpos) + this.scrollX) / this.tileSizeX, 10 );
	var _ty = parseInt( (this.unzoom(_ypos) + this.scrollY) / this.tileSizeY, 10 );
	
	return this.setTile(_tx, _ty, _idx, _dataName);
};

TilePlane.prototype.setTileFromGlobal = function(_xpos, _ypos, _idx, _dataName) {
	// set tile index based on global coords
	if (!_dataName) _dataName = 'data'; // default to tile data
	var _tx = parseInt( _xpos / this.tileSizeX, 10 );
	var _ty = parseInt( _ypos / this.tileSizeY, 10 );

	return this.setTile(_tx, _ty, _idx, _dataName);
};

TilePlane.prototype.getTileIdx = function(_filename) {
	// lookup idx for tile filename, creating new index if necessary
	var _idx = this.rev_map[_filename];
	if (!_idx) {
		// first time use for tile, assign new idx
		_idx = _get_next_key_seq(this.map);
		debugstr("First time use for new tile: " + _idx + ": " + _filename);
		
		this.map[_idx] = _filename;
		this.rev_map[_filename] = _idx;
	}
	return _idx;
};

TilePlane.prototype.setTile = function(_tx, _ty, _idx, _dataName) {
	// set tile given index coords
	if (!_idx) _idx = 0;
	// debugstr("got here, in setTile, " + tx + "x" + ty + ": " + idx);
	
	if (!_dataName) _dataName = 'data'; // default to tile data
	else if (_dataName === true) _dataName = 'objectData';
	
	if (!this[_dataName]) this[_dataName] = [];
	// var zTileURL = gGame.getGamePath() + this.tileImagePath;

	if ((_tx < 0) || (_ty < 0)) return 0;
	
	if (!this[_dataName][_tx]) this[_dataName][_tx] = [];
	var _col = this[_dataName][_tx];
	
	if ((_dataName == 'data') && _idx) {
		// must convert filename to numerical index
		_idx = this.getTileIdx(_idx);
	}
	else if ((_dataName == 'objectData') && _idx && !gGame._level_editor) {
		// prep tile for insertion
		if (!_idx.type) _idx.type = _idx.__name;
		_idx.plane = this;
		_idx.tx = _tx;
		_idx.ty = _ty;
	}
	
	this[_dataName][_tx][_ty] = _idx;
	
	if ((_dataName == 'data') || this._drawTile) {
		var _xpos = this.zoom( (_tx * this.tileSizeX) - this._oldScrollX ); // um, OLDscrollX??
		var _ypos = this.zoom( (_ty * this.tileSizeY) - this._oldScrollY );
		var _div = this._ptInActiveDiv(_xpos, _ypos);
		
		// debugstr("pos: " + xpos + 'x' + ypos + ', div id: ' + (div ? div.id : '(offscreen)'));
		
		if (_div) {
			var _ix = parseInt( this.unzoom(_xpos - _div.offsetLeft) / this.tileSizeX, 10 );
			var _iy = parseInt( this.unzoom(_ypos - _div.offsetTop) / this.tileSizeY, 10 );
			
			// debugstr("ix/iy: " + ix + 'x' + iy);
			
			var _divID = _div.id;
			if (_dataName == 'data') this._objs[ _divID ].data[_ix][_iy] = _idx;
			
			var _imgID = _divID + '_' + _ix + '_' + _iy;
			var _img = el(_imgID);

			if (this._drawTile) {
				assert(_img, "Cannot locate div: " + _imgID);
				
				var _tileID = (_dataName == 'data') ? this.map[_idx] : this.lookupTile(_tx, _ty);
				var _objectID = (_dataName == 'objectData') ? _idx : this.lookupTile(_tx, _ty, 'objectData');
				var _url = _tileID ? gGame._imageLoader.getImageURL(this.tileImagePath + '/' + _tileID) : this._get_blank_tile_url();
				
				// debugstr("calling drawTile for: " + imgID);
				
				this._drawTile( _img, _tx, _ty, _tileID, _objectID, _url );
			}
			else {
				// assert(img, "Cannot locate image: " + imgID);
				
				// debugstr("looking up image: " + zTileURL + '/' + idx);
				
				var _tile_image_key = '';
				if (_idx) {
					_tile_image_key = this.tileImagePath + '/' + this.map[_idx];
					if (ua.ie6 && _tile_image_key.match(/\.png/i)) {
						if (_tile_image_key.match(/\?/)) _tile_image_key += '&format=gif';
						else _tile_image_key += '?format=gif';
					}
				}
				
				_img.src = _idx ? gGame._imageLoader.getImageURL(_tile_image_key) : this._get_blank_tile_url();
				
				// debugstr("img src: " + img.src);
			}
		} // tile is currently onscreen
		// else debugstr("setTile: Tile is OFFSCREEN: " + _tx, + 'x' + _ty + " ("+_xpos+"x"+_ypos+"): " + _idx);
	} // changing visisble tile data

	return 1;
};

TilePlane.prototype.setMap = function(_newMap) {
	// provide data that maps numerical indexes to tile filenames
	this.map = _newMap;
	this.rev_map = _reverse_hash( this.map );
	
	// convert strings to numbers
	for (var _key in this.rev_map) {
		this.rev_map[_key] = parseInt( this.rev_map[_key], 10 );
	}
};

TilePlane.prototype.setData = function(_newData, _dataName) {
	// set level tile data
	// this.data = _deep_copy_object( newData );
	if (!_dataName) _dataName = 'data'; // default to tile data
	this[_dataName] = _newData;

	if (_dataName == 'data') {
		// the data has changed, so we need to flush our entire activelist
		// while (this._activeList.length > 0)
		// 	_array_push( this._freeList, _array_pop(this._activeList) );

		for (var _idx = 0, _len = this._activeList.length; _idx < _len; _idx++) {
			var _div = this._divs[ this._activeList[_idx] ];
			_div.style.left = '-1000px';
			
			// _array_push( this._freeList, _array_splice(this._activeList, idx, 1)[0] );
			this._freeList.push( this._activeList.splice(_idx, 1)[0] );
			
			_idx--; _len--;
		}
	}
	else if (_dataName == 'objectData') {
		// prep object data -- convert all strings to real objects
		// and bless generic objects in map
		for (var _tx = 0; _tx < this.objectData.length; _tx++) {
			var _col = this.objectData[_tx];
			if (_col) for (var _ty = 0; _ty < _col.length; _ty++) {
				if (_col[_ty]) {
					if (typeof(_col[_ty]) == 'string') {
						var _temp = _col[_ty];
						_col[_ty] = eval("new " + _col[_ty] + "();");
						_col[_ty].type = _temp;
					}
					else {
						var _tempObj = eval("new " + _col[_ty].type + "();");
						for (var _key in _col[_ty]) _tempObj[_key] = _col[_ty][_key];
						_col[_ty] = _tempObj;
					}
					_col[_ty].plane = this;
					_col[_ty].tx = _tx;
					_col[_ty].ty = _ty;
				} // object at location
			} // y loop
		} // x loop
	}
};

TilePlane.prototype.setScroll = function(_sx, _sy) {
	// set new scroll position
	this.scrollX = Math.floor( _sx * this.scrollSpeed );
	this.scrollY = Math.floor( _sy * this.scrollSpeed );
};

TilePlane.prototype.logic = function(_logicClock) {
	// in-game logic routine
	if (this.port._firstFrame && this.objectData) {
		this.activateScreenObjects();
	}
};

TilePlane.prototype.hide = function() {
	// hide entire layer
	for (var _key in this._divs) {
		this._divs[_key].style.visibility = 'hidden';
	}
	this.visible = false;
};

TilePlane.prototype.show = function() {
	// show entire layer
	for (var _key in this._divs) {
		this._divs[_key].style.visibility = 'visible';
	}
	this.visible = true;
};

TilePlane.prototype.linkSpritePlane = function(_plane) {
	// link to sprite plane so tiles can create sprites, etc.
	this.spritePlane = _plane;
	_plane.tilePlane = this;
};

TilePlane.prototype._get_blank_tile_url = function() {
	// get URL to "blank" tile knowing current tile size
	// return gGame._homePath + '/api/blank_image.gif?width=' + this.zoom(this.tileSizeX) + '&height=' + this.zoom(this.tileSizeY);
	if (gGame._standalone) return gImageLoader.getImageURL( this.tileImagePath + '/_blank.gif' );
	else return gImageLoader.getImageURL( gGame._homePath + 'api/blank_image.gif?width=' + this.tileSizeX + '&height=' + this.tileSizeY );
};
