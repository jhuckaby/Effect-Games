// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// HUD.js
// Heads-up display for a image grid (monospace-font) overlay
////

function HUD(id) {
	// class constructor
	if (!id) id = _get_unique_id();
	this.id = id;
	
	this.x = 0;
	this.y = 0;
	this.scrollX = 0;
	this.scrollY = 0;
	this.zIndex = 99; // above everything
};

// inherit from _Plane
HUD.prototype = new _Plane();

HUD.prototype.cols = 0;
HUD.prototype.rows = 0;
HUD.prototype._charWidth = 8;
HUD.prototype._charHeight = 8;

HUD.prototype.font = null;
HUD.prototype._fontName = '';
HUD.prototype._customDef = null;

HUD.prototype._data = [ [] ];
HUD.prototype._trackingX = 1.0;
HUD.prototype._trackingY = 1.0;

HUD.prototype.setTableSize = function(_newCols, _newRows) {
	// set table dimensions
	debugstr("in HUD.setTableSize: " + _newCols + 'x' + _newRows);
	
	this.cols = _newCols;
	this.rows = _newRows;
	this._data = [];
	
	for (var _x = 0; _x < _newCols; _x++) {
		this._data[_x] = [];
		for (var _y = 0; _y < _newRows; _y++) {
			this._data[_x][_y] = { ch: ' ' };
		} // y loop
	} // x loop
};

HUD.prototype.setCharSize = function(_newCharWidth, _newCharHeight) {
	// set font char size
	this._charWidth = _newCharWidth;
	this._charHeight = _newCharHeight;
};

HUD.prototype.setPosition = function(_px, _py) {
	// set position
	this.x = _px;
	this.y = _py;
};

HUD.prototype.setTracking = function(_tx, _ty) {
	// set tracking increments
	this._trackingX = _tx;
	this._trackingY = _ty;
};

HUD.prototype.setFont = function(_newFont) {
	// set font images dir location
	// if (!gGame.fonts[newFont]) return _throwError( "Font not found: " + newFont );
	var _font_def = gGame._fontLoader.lookupFont( _newFont );
	if (!_font_def) return _throwError("Font not found: " + _newFont);
	
	this._fontName = _newFont;
	this._customDef = null;
	
	this.font = _font_def;
	this.setCharSize( _font_def.GlyphWidth, _font_def.GlyphHeight );
};

HUD.prototype.setCustomFont = function(_url, _newCharWidth, _newCharHeight) {
	// set custom font based on simple image (must be preloaded)
	var _img = gGame._imageLoader.lookupImage( _url );
	if (!_img) return _throwError("Image not found: " + _url);
	// if (!img.loaded) return _throwError("Image is not loaded: " + url);
	
	if (!_newCharWidth || !_newCharHeight) return _throwError("Glyph width/height not specified.");
		
	this._fontName = '';
	this._customDef = {
		url: _url,
		charWidth: _newCharWidth,
		charHeight: _newCharHeight
	};
	
	this.font = {
		img: _img.img,
		loaded: true
	};
	
	this.setCharSize( _newCharWidth, _newCharHeight );
};

HUD.prototype.init = function() {
	// setup
	if (!this.port) return _throwError( "No port attached to HUD plane" );
	if (!this.cols || !this.rows) return _throwError( "HUD is not properly setup for init -- must set cols, rows" );
	
	if (!this.font && this._fontName) this.setFont( this._fontName );
	else if (!this.font && this._customDef) this.setCustomFont( this._customDef.url, this._customDef.charWidth, this._customDef.charHeight );
	
	if (!this.font) return _throwError("No font selected for HUD");
	if (!this.font.loaded) return _throwError("Font is not loaded, HUD cannot init.");
	
	// font path
	this.fontPath = this.font.img.src;
	this.img = this.font.img;
	
	// pre-zoom stuff
	var _zCharWidth = this._charWidth * this.port._zoomLevel;
	var _zCharHeight = this._charHeight * this.port._zoomLevel;
	var _zWidth = _zCharWidth * this.cols;
	var _zHeight = _zCharHeight * this.rows;
	var _zx = this.x * this.port._zoomLevel;
	var _zy = this.y * this.port._zoomLevel;
	
	// cache these so we don't have to compute them later
	this._zCharWidth = _zCharWidth;
	this._zCharHeight = _zCharHeight;

	// our div
	this.globalID = this.port.id + '_' + this.id;
	this.div = document.createElement('DIV');
	this.style = this.div.style;
	this.div.setAttribute('id', this.globalID);
	this.div.id = this.globalID;
	this.style.position = 'absolute';
	this.style.overflow = 'hidden';
	this.style.width = _zWidth + 'px';
	this.style.height = _zHeight + 'px';
	this.style.left = _zx + 'px';
	this.style.top = _zy + 'px';
	this.style.zIndex = this.zIndex;
	this.style.visibility = this.visible ? 'visible' : 'hidden';
	if (ua.ie) this.div.setAttribute( 'onselectstart', "return false" );
	this.port.div.appendChild(this.div);
	
	// create glyphs
	for (var _ty = 0; _ty < this.rows; _ty++) {
		for (var _tx = 0; _tx < this.cols; _tx++) {
			if (this._data[_tx][_ty].ch != ' ') this._createGlyphDiv( _tx, _ty );
		} // x loop
	} // y loop
};

HUD.prototype._createGlyphDiv = function(_tx, _ty) {
	// create one glyph div
	var _dat = this._data[_tx][_ty];
	var _x = _tx * this._zCharWidth * this._trackingX;
	var _y = _ty * this._zCharHeight * this._trackingY;
		
	var _glyph = document.createElement('div');
	var _sty = _glyph.style;
	_sty.position = 'absolute';
	_sty.width = '' + this._zCharWidth + 'px';
	_sty.height = '' + this._zCharHeight + 'px';
	_sty.top = '' + _y + 'px';
				
	if (ua.clipnest) {
		// clipnest technique, for safari and ie6
		_sty.width = this.img.width + 'px';
		_sty.height = this.img.height + 'px';
		_sty.clip = this._getClipFor( _dat.ch );
		_sty.left = this._getLeftFor( _dat.ch, _x );
	}
	else {
		// all other browsers use background position
		_sty.left = '' + _x + 'px';
		_sty.width = '' + this._zCharWidth + 'px';
		_sty.height = '' + this._zCharHeight + 'px';
		_sty.backgroundPosition = this._getBkgndPosFor( _dat.ch );
	}
	
	if (ua.ie6 && this.fontPath.match(/\.png(\?|$)/i)) {
		// IE 6 requires special handling for PNG images
		_glyph.innerHTML = "<div "
			+ " style=\"" + "width:" + this.img.width + "px; height:" + this.img.height + "px;"
			+ "filter:progid:DXImageTransform.Microsoft.AlphaImageLoader"
			+ "(src=\'" + this.img.src + "\', sizingMethod='scale');\"></div>";
	}
	else if (ua.clipnest) {
		// safari and ie6 like a nested image in the div (go figure)
		_glyph.innerHTML = '<img src="'+this.img.src+'" width="'+this.img.width+'" height="'+this.img.height+'" border="0"/>' + "\n";
	}
	else {
		// most browsers prefer the background position technique (classic CSS sprite)
		_sty.backgroundImage = 'url(' + this.img.src + ')';
		_sty.backgroundRepeat = 'no-repeat';
	}
	
	this.div.appendChild(_glyph);
	_dat.glyph = _glyph;
	_dat.sty = _sty;
};

HUD.prototype._getIdxFromChar = function(_ch) {
	// get index into char map from ascii char
	return _ch.charCodeAt(0) - 33;
};

HUD.prototype._getClipFor = function(_ch) {
	// get clip rect given ascii char
	var _idx = this._getIdxFromChar(_ch);
	var _x = _idx * this._zCharWidth;
	return 'rect(0px '+Math.floor(_x + this._zCharWidth)+'px '+this._zCharHeight+'px '+Math.floor(_x)+'px)';
};

HUD.prototype._getLeftFor = function(_ch, _x) {
	// get left coordinate (taking clip into account)
	var _idx = this._getIdxFromChar(_ch);
	var _offsetX = _idx * this._zCharWidth;
	return '' + Math.floor(_x - _offsetX) + 'px';
};

HUD.prototype._getBkgndPosFor = function(_ch) {
	// get CSS background position for ascii char
	var _idx = this._getIdxFromChar(_ch);
	var _offsetX = 0 - (_idx * this._zCharWidth);
	return '' + _offsetX + 'px 0px';
};

HUD.prototype.reset = function() {
	// delete all graphical elements (probably for re-zoom)
	for (var _ty = 0; _ty < this.rows; _ty++) {
		for (var _tx = 0; _tx < this.cols; _tx++) {
			this._data[_tx][_ty].sty = null;
			this._data[_tx][_ty].glyph = null;
		}
	}
	
	try { this.port.div.removeChild(this.div); } catch (e) {
		// try one last time
		var _div = el( this.globalID );
		try { this.port.div.removeChild(_div); } catch (e) { ; };
	}
	this.style = null;
	this.div = null;
	
	this.font = null;
};

HUD.prototype.setChar = function(_tx, _ty, _ch) {
	// set new character (if changed)
	if ((_tx < 0) || (_ty < 0) || (_tx >= this.cols) || (_ty >= this.rows)) return;
	
	var _dat = this._data[_tx][_ty];
	if (_dat.ch != _ch) {
		_dat.ch = _ch;
		
		if (_dat.sty) {
			if (ua.clipnest) {
				_dat.sty.clip = this._getClipFor( _ch );
			
				var _x = _tx * this._zCharWidth * this._trackingX;
				_dat.sty.left = this._getLeftFor( _ch, _x );
			}
			else {
				_dat.sty.backgroundPosition = this._getBkgndPosFor( _ch );
			}
		}
		else if (this.div) {
			this._createGlyphDiv(_tx, _ty);
		}
	}
};

HUD.prototype.setString = function(_x, _y, _str) {
	// set string at location
	if (typeof(_str) != 'string') _str = _str.toString();
	var _len = _str.length;
	var _startx = _x;
	for (var _idx = 0; _idx < _len; _idx++) {
		var _ch = _str.substring(_idx, _idx + 1);
		if ((_ch == 13) || (_ch == 10)) {
			// newline
			_x = _startx; _y++;
		}
		else {
			this.setChar( _x++, _y, _ch );
		}
	}
};

HUD.prototype.setPadInt = function(_x, _y, _value, _pad) {
	// set zero-padded int at location
	var _str = '' + _value;
	while (_str.length < _pad) _str = '0' + _str;
	this.setString(_x, _y, _str);
};

HUD.prototype.logic = function(_logicClock) {
	
};

HUD.prototype.draw = function() {
	
};

HUD.prototype.hide = function() {
	// hide entire layer
	this.div.style.visibility = 'hidden';
	this.visible = false;
};

HUD.prototype.show = function() {
	// show entire layer
	this.div.style.visibility = 'visible';
	this.visible = true;
};