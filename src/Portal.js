// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// Portal.js
// Takes over a specified DIV for rendering game graphics
////

function Portal(_id) {
	// class constructor
	// associate object with DIV by its ID
	if (!_id) return _throwError("You must pass an ID");
	this.id = _id;
	
	this.div = el(_id);
	if (!this.div) return _throwError("Cannot locate DOM element: " + _id);
	
	this.style = this.div.style;

	if (!this.div.style.position) this.div.style.position = 'relative';
	this.div.style.overflow = 'hidden';

	this._layers = [];
	this._zoomLevel = 1;
	this._oldZoomLevel = 1;
	
	this.portWidth = 0;
	this.portHeight = 0;
	
	this.virtualWidth = 0;
	this.virtualHeight = 0;

	this.scrollX = 0;
	this.scrollY = 0;
	
	this._oldScrollX = -1000;
	this._oldScrollY = -1000;
	
	// hide cursor on mac support
	this.cursor = true;
	this.hc = {
		div: null,
		last_x: 0,
		last_y: 0,
		size: 192,
		padding: 64
	};
	
	// new bkgnd div
	this._bkgnd_div = null;
	this._bkgnd_id = '_bkgnd_' + this.id;
	
	// background offset
	this.backgroundOffsetX = 0;
	this.backgroundOffsetY = 0;
	
	// flag for instant draw next frame (set by setActiveLevel())
	this._firstFrame = false;
};

// Inherit from EventHandlerBase, to get setHandler(), fireHandler(), et al.
Portal.prototype = new _EventHandlerBase();

Portal.prototype.init = function() {
	// setup portal div and all layers
	
	// guess size based on DIV, if not set
	if (!this.portWidth || !this.portHeight) {
		this.portWidth = this.div.offsetWidth / this._zoomLevel;
		this.portHeight = this.div.offsetHeight / this._zoomLevel;
	}
	
	if (!this.virtualWidth) this.virtualWidth = this.portWidth;
	if (!this.virtualHeight) this.virtualHeight = this.portHeight;
	
	// if (!this.portWidth || !this.portHeight) return _throwError("Portal size is not set.");
	
	var _zPortWidth = this.portWidth * this._zoomLevel;
	var _zPortHeight = this.portHeight * this._zoomLevel;
	this.div.style.width = _zPortWidth + 'px';
	this.div.style.height = _zPortHeight + 'px';
	
	if (this._is_master) {
		el('effect_container').style.width = _zPortWidth + 'px';
	}
	
	for (var _idx = 0; _idx < this._layers.length; _idx++) {
		if (this._layers[_idx].init) this._layers[_idx].init();
	}
	
	this.setBackground();
};

Portal.prototype.setZoomLevel = function(_newLevel) {
	// set initial zoom level, BEFORE all is initialized
	this._zoomLevel = parseInt(_newLevel, 10);
};

Portal.prototype.getZoomLevel = function() { return this._zoomLevel; };

Portal.prototype.setBackgroundColor = function(_newColor) {
	// set portal background color
	this._remove_bkgnd_div();
	this.div.style.backgroundColor = _newColor;
};

Portal.prototype.setBackgroundOpacity = function(_newOpacity) {
	// set portal background image opacity
	if (this._bkgnd_div) {
		_set_opacity( this._bkgnd_div, _newOpacity );
	}
};

Portal.prototype.setBackgroundOffset = function(_bx, _by) {
	// set portal background image offset
	this.backgroundOffsetX = _bx;
	this.backgroundOffsetY = _by;
	
	if (this._bkgnd_div) {
		this._update_background_position();
	}
};

Portal.prototype._create_bkgnd_div = function() {
	// create huge div for scrolling background
	this._remove_bkgnd_div();
	
	if (this.background.url) {
		var _image = gGame._imageLoader.lookupImage( this.background.url );
		if (!_image) {
			// supposedly this isn't fatal, but I'm sure the hell logging it
			Debug.trace('Portal', 'Background image not found: ' + this.background.url);
			this.background.width = 0;
			this.background.height = 0;
			return;
		}
		
		Debug.trace('Portal', "Creating background: " + this.background.url );
		
		this.background.width = _image.img.width;
		this.background.height = _image.img.height;
		
		var _zPortWidth = this.portWidth * this._zoomLevel;
		var _zPortHeight = this.portHeight * this._zoomLevel;
		
		var _width = 0;
		switch (this.background.xMode || 'fit') {
			case 'fit':
				_width = Math.max( this.background.width, _zPortWidth );
				break;
				
			case 'infinite':
				_width = _zPortWidth + this.background.width;
				break;
		}
		if (_width % this.background.width > 0) _width = this.background.width * Math.ceil( _width / this.background.width );
		
		var _height = 0;
		switch (this.background.yMode || 'fit') {
			case 'fit':
				_height = Math.max( this.background.height, _zPortHeight );
				break;
				
			case 'infinite':
				_height = _zPortHeight + this.background.height;
				break;
		}
		if (_height % this.background.height > 0) _height = this.background.height * Math.ceil( _height / this.background.height );
		
		this._bkgnd_div = document.createElement('div');
		this._bkgnd_div.setAttribute('id', this._bkgnd_id);
		this._bkgnd_div.id = this._bkgnd_id;
		
		if (ua.ie) this._bkgnd_div.setAttribute( 'onselectstart', "return false" );
		
		var _sty = this._bkgnd_div.style;
		_sty.position = 'absolute';
		_sty.width = '' + _width + 'px';
		_sty.height = '' + _height + 'px';
		_sty.left = '0px';
		_sty.top = '0px';
		_sty.zIndex = 0;
		
		var _count = Math.floor( _width / this.background.width ) * Math.floor( _height / this.background.height );
		
		if (ua.portalBkgndImage || ua.ie || (_count > 64)) {
			// too many IMGs floating around, use backgroundImage
			// this tends to freak out Safari and FF tho
			_sty.backgroundImage = 'url(' + _image.img.src + ')';
		}
		else {
			var _html = '';
			for (var _idx = 0; _idx < _count; _idx++) {
				_html += '<img src="'+_image.img.src+'" width="'+this.background.width+'" height="'+this.background.height+'"';
				if (ua.ie) _html += ' onselectstart="return false"';
				_html += '/>';
			}
			this._bkgnd_div.innerHTML = _html;
		}
		
		this.div.appendChild( this._bkgnd_div );
	} // has url
};

Portal.prototype._remove_bkgnd_div = function() {
	// remove background div, if exists
	if (this._bkgnd_div) {
		try { this.div.removeChild(this._bkgnd_div); } catch (e) {
			// try one last time (ie sometimes has trouble with this)
			var _div = el( this._bkgnd_id );
			try { this.div.removeChild(_div); } catch (e) { ; };
		};
		this._bkgnd_div = null;
	}
};

Portal.prototype.setBackground = function(_args) {
	// set portal background image + behavior
	if (_args) this.background = _copy_object( _args );
	if (!this.background) return;
	
	Debug.trace('Portal', "Setting background: " + dumper(_args));
	
	this.div.style.backgroundColor = this.background.color ? this.background.color : 'black';
	
	if (this.background.url) {
		this._create_bkgnd_div();
		
		if (this.background.xSpeed) {
			this.background.xDiv = this.background.xSpeed;
			delete this.background.xSpeed;
		}
		if (this.background.ySpeed) {
			this.background.yDiv = this.background.ySpeed;
			delete this.background.ySpeed;
		}

		if (!this.background.xDiv && this.background.xyDiv) this.background.xDiv = this.background.xyDiv;
		if (!this.background.xDiv) this.background.xDiv = 0;

		if (!this.background.yDiv && this.background.xyDiv) this.background.yDiv = this.background.xyDiv;
		if (!this.background.yDiv) this.background.yDiv = 0;

		this._update_background_position();
	} // has url
};

Portal.prototype._update_background_position = function() {
	if (this.background && this.background.url && this._bkgnd_div) {
		var _bx = 0;
		var _by = 0;
		var _sx = this.scrollX;
		var _sy = this.scrollY;
	
		if (this.background.xMode) {
			if (this.background.xMode == 'infinite') {
				_bx = Math.floor( _sx * this.background.xDiv );
			}
			else if (this.background.xMode == 'fit') {
				if (this.virtualWidth == this.portWidth) _bx = 0;
				else {
					var _zPortWidth = this.portWidth * this._zoomLevel;
					var _maxx = this.background.width - _zPortWidth;
					_bx = Math.floor( (_sx * _maxx) / (this.virtualWidth - this.portWidth) );
				}
			}
		} // xMode
	
		if (this.background.yMode) {
			if (this.background.yMode == 'infinite') {
				_by = Math.floor( _sy * this.background.yDiv );
			}
			else if (this.background.yMode == 'fit') {
				if (this.virtualHeight == this.portHeight) _by = 0;
				else {
					var _zPortHeight = this.portHeight * this._zoomLevel;
					var _maxy = this.background.height - _zPortHeight;
					_by = Math.floor( (_sy * _maxy) / (this.virtualHeight - this.portHeight) );
				}
			}
		} // yMode
		
		_bx += Math.floor( this.backgroundOffsetX * this._zoomLevel );
		_by += Math.floor( this.backgroundOffsetY * this._zoomLevel );
		
		_bx = 0 - (_bx % this.background.width);
		_by = 0 - (_by % this.background.height);
	
		this._bkgnd_div.style.left = '' + _bx + 'px';
		this._bkgnd_div.style.top = '' + _by + 'px';
	}
};

Portal.prototype.attach = function(_obj) {
	// attach and initialize new layer
	if (!_obj._isPlane) return _throwError("Cannot attach non-plane object to portal");
	_obj.port = this;
	if (!_find_object(this._layers, {id: _obj.id})) _array_push( this._layers, _obj );
	if (_obj.init) _obj.init();
};

Portal.prototype.remove = function(_thingy) {
	// remove plane by ID (or plane object itself)
	var _id = '';
	var _obj = null;
	
	if (typeof(_thingy) == 'object') {
		_obj = _thingy;
		_id = _thingy.id;
	}
	else {
		_obj = _find_object( this._layers, { id: _thingy } );
		if (!_obj) return false;
		_id = _obj.id;
	}
	
	var _idx = _find_object_idx( this._layers, { id: _id } );
	if (_idx == -1) return false;
	
	_obj.reset();
	this._layers.splice( _idx, 1 );
};

Portal.prototype.removeAll = function() {
	// remove all planes
	for (var _idx = 0, _len = this._layers.length; _idx < _len; _idx++) {
		this._layers[_idx].reset();
	}
	this._layers = [];
};

Portal.prototype.getPlane = function(_id) {
	// lookup an attached plane by its id
	return _find_object( this._layers, { id: _id } );
};

Portal.prototype.setSize = function(_newWidth, _newHeight) {
	// set viewable area in port (unzoomed)
	this.portWidth = parseInt(_newWidth, 10);
	this.portHeight = parseInt(_newHeight, 10);
};

Portal.prototype.setVirtualSize = function(_newWidth, _newHeight) {
	// set max virtual size (scrollable area, unzoomed)
	this.virtualWidth = parseInt(_newWidth, 10);
	this.virtualHeight = parseInt(_newHeight, 10);
};

Portal.prototype.setScroll = function(_sx, _sy) {
	// set new scroll pos
	if (_sx < 0) _sx = 0;
	if (_sy < 0) _sy = 0;
	if (_sx > this.virtualWidth - this.portWidth) _sx = this.virtualWidth - this.portWidth;
	if (_sy > this.virtualHeight - this.portHeight) _sy = this.virtualHeight - this.portHeight;
	
	for (var _idx = 0, _len = this._layers.length; _idx < _len; _idx++) {
		if (this._layers[_idx].setScroll) this._layers[_idx].setScroll(_sx, _sy);
	}
	
	this.scrollX = _sx;
	this.scrollY = _sy;
};

Portal.prototype.follow = function(_sprite, _speed) {
	// follow center point of sprite
	if (!_speed) _speed = 1;
	var _destScrollX = Math.floor( (_sprite.x + (_sprite.width / 2)) - (this.portWidth / 2) );
	var _destScrollY = Math.floor( (_sprite.y + (_sprite.height / 2)) - (this.portHeight / 2) );
	
	if ((this.scrollX != _destScrollX) || (this.scrollY != _destScrollY)) {
		this.setScroll(
			Math.floor( this.scrollX + ((_destScrollX - this.scrollX) * _speed) ),
			Math.floor( this.scrollY + ((_destScrollY - this.scrollY) * _speed) )
		);
	}
};

Portal.prototype.tween = function(_args) {
	// tween object properties
	_args.target = this;
	gTween.addTween(_args);
};

Portal.prototype.onTweenUpdate = function(_tween) {
	// special care must be taken depending on which properties are being tweened
	var _props = _tween.properties;
	if (_props.scrollX || _props.scrollY) this.setScroll( this.scrollX, this.scrollY );
	if (_props.backgroundOffsetX || _props.backgroundOffsetY) this._update_background_position();
};

Portal.prototype.draw = function(_instant) {
	// in-game draw routine
	if (!_instant) _instant = false;
	if (this._firstFrame) _instant = true;
	
	for (var _idx = 0, _len = this._layers.length; _idx < _len; _idx++) {
		this._layers[_idx].draw(_instant);
	}
	
	if (this.background && this.background.url && ((this.scrollX != this._oldScrollX) || (this.scrollY != this.oldScrollY))) {
		// animate background image
		this._update_background_position();
		
		this._oldScrollX = this.scrollX;
		this._oldScrollY = this.scrollY;
	} // animate background image
	
	if (!this.cursor && this.hc.div) {
		// must track mouse to keep cursor hidden on mac
		var _pt = new Point( gGame.mousePt.x, gGame.mousePt.y );
		var _info = _get_dom_object_info(this.div);
		_pt.x -= _info.left;
		_pt.y -= _info.top;
		var _hc_x = Math.floor(_pt.x / this.hc.size);
		var _hc_y = Math.floor(_pt.y / this.hc.size);
		
		if ((_hc_x != this.hc.last_x) || (_hc_y != this.hc.last_y)) {
			var _x = _hc_x * this.hc.size;
			var _y = _hc_y * this.hc.size;
			var _zPortWidth = this.portWidth * this._zoomLevel;
			var _zPortHeight = this.portHeight * this._zoomLevel;
			
			if ((_pt.x < 0) || (_pt.x >= _zPortWidth) || (_pt.y < 0) || (_pt.y >= _zPortHeight)) {
				_x = -4000; _y = 0;
			}
			
			_x -= (this.hc.padding / 2);
			_y -= (this.hc.padding / 2);
			
			this.hc.div.style.left = _x + 'px';
			this.hc.div.style.top = _y + 'px';
			this.hc.last_x = _hc_x;
			this.hc.last_y = _hc_y;
		} // moved to new section
	}
	
	this._firstFrame = false;
};

Portal.prototype.logic = function(_logicClock) {
	// in-game logic routine
	for (var _idx = 0, _len = this._layers.length; _idx < _len; _idx++) {
		this._layers[_idx].logic(_logicClock);
	}
};

Portal.prototype.reset = function() {
	// delete all graphical elements (probably for re-zoom)
	for (var _idx = 0; _idx < this._layers.length; _idx++) {
		if (this._layers[_idx].reset) this._layers[_idx].reset();
	}
	
	this._oldScrollX = -1000;
	this._oldScrollY = -1000;
	
	this._remove_bkgnd_div();
};

Portal.prototype.hide = function() {
	// hide all graphical elements
	for (var _idx = 0; _idx < this._layers.length; _idx++) {
		if (this._layers[_idx].hide) this._layers[_idx].hide();
	}
};

Portal.prototype.show = function() {
	// show all graphical elements
	for (var _idx = 0; _idx < this._layers.length; _idx++) {
		if (this._layers[_idx].show) this._layers[_idx].show();
	}
};

Portal.prototype.loadlevel = function() {
	// game level load notify -- pass onto layers
	for (var _idx = 0; _idx < this._layers.length; _idx++) {
		if (this._layers[_idx].loadlevel) this._layers[_idx].loadlevel();
	}
};

Portal.prototype.pause = function() {
	// game level load notify -- pass onto layers
	for (var _idx = 0; _idx < this._layers.length; _idx++) {
		if (this._layers[_idx].pause) this._layers[_idx].pause();
	}
};

Portal.prototype.resume = function() {
	// game level load notify -- pass onto layers
	for (var _idx = 0; _idx < this._layers.length; _idx++) {
		if (this._layers[_idx].resume) this._layers[_idx].resume();
	}
};

Portal.prototype.hideCursor = function() {
	// try VERY hard to hide the cursor
	if (!this.cursor) return; // already hidden
	
	if (ua.mac) {
		if (ua.ff3 || ua.safari3 || ua.chrome) {
			this.div.style.cursor = 'none';
		}
		else {
			// hiding cursor on mac safari and ff2 is very difficult
			if (!this.hc.div) {
				// create floating movie for hiding cursor
				// will track mouse to stay hidden (yuck)
				var _full_size = this.hc.size + this.hc.padding;
				var _div = document.createElement('DIV');
				_div.style.position = 'absolute';
				_div.style.width = ''+_full_size+'px';
				_div.style.height = ''+_full_size+'px';
				_div.style.left = '-4000px';
				_div.style.top = '0px';
				_div.style.zIndex = 999; // MUST be above everything for FF
				_div.innerHTML = '<embed src="'+gGame._homePath+'engine/hide_cursor.swf" quality="high" swliveconnect="true" bgcolor="#ffffff" width="'+_full_size+'" height="'+_full_size+'" align="middle" allowScriptAccess="always" type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" wmode="transparent" />';
				this.div.appendChild(_div);
				this.hc.div = _div;
			}
			this.hc.div.style.visibility = 'visible';
			this.div.style.cursor = 'crosshair';
		} // mac safari or ff2
	}
	else {
		// easier for win browsers
		if (ua.ff3) {
			this.div.style.cursor = 'none';
		}
		else if (ua.chrome || ua.safari) {
			// google chrome and safari on windows (i.e. webkit-win32) have a nasty bug --
			// custom cursors with ALL PIXELS TRANSPARENT show up as a big black box
			// so we have to "cheat" with a cursor containing 1 black pixel.
			this.div.style.cursor = 'url(' + gGame._homePath + 'engine/1px.cur) 8 8, none';
		}
		else if (ua.ie) {
			// IE doesn't like the "8 8" thing, but otherwise supports custom cur files
			this.div.style.cursor = 'url(' + gGame._homePath + 'engine/transparent.cur), none, crosshair';
		}
		else {
			// all other browsers, try anything and everything
			this.div.style.cursor = 'url(' + gGame._homePath + 'engine/transparent.cur) 8 8, none, crosshair';
		}
	}
	
	var overlay = el('effect_overlay');
	if (overlay) {
		if (ua.chrome) overlay.style.cursor = 'url(' + gGame._homePath + 'engine/1px.cur) 8 8, none';
		else overlay.style.cursor = 'none';
	}
	
	this.cursor = false;
};

Portal.prototype.showCursor = function() {
	// show cursor
	if (this.cursor) return; // already visible
	
	if (ua.mac) {
		if (this.hc.div) {
			// hide movie for hiding cursor
			this.div.removeChild( this.hc.div );
			this.hc.div = null;
			
			/*var sty = this.hc.div.style;
			sty.visibility = 'hidden';
			sty.left = '-4000px';*/
		}
	}
	
	var overlay = el('effect_overlay');
	if (overlay) overlay.style.cursor = 'default';
	
	this.div.style.cursor = 'default';
	this.cursor = true;
};

Portal.prototype.getMouseCoords = function(_force) {
	// get current mouse coords adjusted for portal, zoom level and virtual scroll
	
	// JH 2009-11-21: the local point cache is broken -- disabling for now.
	// if (gGame.inGame && this._localPointCacheTime && (this._localPointCacheTime == gGame.logicClock)) return this._localPointCache.clone();
	
	var _zPortWidth = this.portWidth * this._zoomLevel;
	var _zPortHeight = this.portHeight * this._zoomLevel;
	
	var _out = new Point(0, 0);
	var _pt = new Point( gGame.mousePt.x, gGame.mousePt.y );
	var _info = _get_dom_object_info(this.div);
	
	_pt.x -= _info.left;
	_pt.y -= _info.top;
	
	if (_force || ((_pt.x >= 0) && (_pt.x < _zPortWidth) && (_pt.y >= 0) && (_pt.y < _zPortHeight))) {
		// pt.x /= this._zoomLevel;
		// pt.y /= this._zoomLevel;
		_pt.x = Math.floor( _pt.x / this._zoomLevel );
		_pt.y = Math.floor( _pt.y / this._zoomLevel );
		
		_pt.x += this.scrollX;
		_pt.y += this.scrollY;
		// this._localPointCache = _pt;
		// this._localPointCacheTime = gGame.logicClock;
		return _pt;
	}
	else return null;
};

Portal.prototype.setHandler = 
Portal.prototype.addEventListener = function(_name, _func) {
	// override _EventHandlerBase.setHandler to set captureMouse
	if (_name.match(/mouse/i)) {
		assert(!!this.div, "Cannot set mouse handlers before portal is initialized.");
		this.div.captureMouse = this;
		
		var overlay = el('effect_overlay');
		if (overlay) overlay.captureMouse = this;
	}
	_EventHandlerBase.prototype.setHandler.apply(this, [_name, _func]);
};
