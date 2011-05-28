// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// ProgressDialog.js
// Loading progress indicator
////

function _ProgressDialog() {
	// class constructor
	this.id = 'd_progress';
	this.width = 0;
	this.height = 0;
	this.zIndex = 99;
	
	this.div = null;
	this._parent = null;
	
	this._counter = 0;
	this._counterMax = 1;
};

// Inherit from EventHandlerBase, to get setHandler(), fireHandler(), et al.
_ProgressDialog.prototype = new _EventHandlerBase();

_ProgressDialog.prototype._preload = function(_callback) {
	// preload images used for loading animation
	this.setHandler('onPreload', _callback);
	
	var _toolbar_dir = gGame._homePath + 'images/engine/toolbar';
	var _dialog_dir = gGame._homePath + 'images/engine/dialog';
	// var toolbar_theme_dir = _toolbar_dir + '/' + (gGame._def.Theme || 'dark');
	// var icon_dir = gGame._homePath + 'images/icons';
	
	var _preload_images = [
		_toolbar_dir + '/background.png',
		_toolbar_dir + '/border-left.png',
		_toolbar_dir + '/border-right.png',
		_toolbar_dir + '/logo.png',
		_toolbar_dir + '/divider.png',
		_toolbar_dir + '/icons.png',
		_toolbar_dir + '/loading-under.png',
		_toolbar_dir + '/loading-over.png',
		_toolbar_dir + '/msgs.png',
		// _dialog_dir + '/titles.png', // now having toolbar load this when game loads
		_dialog_dir + '/play.png'
	];
	
	if (gGame._iframe && !_query.autoplay) {
		_preload_images.push( _dialog_dir + '/play.png' );
	}
	
	this.images = [];
	for (var _idx = 0, _len = _preload_images.length; _idx < _len; _idx++) {
		this._addImage( _preload_images[_idx] );
	}
	
	if (gGame._def.BackgroundImage) {
		this._loading_image_url = gGame.getGamePath() + gGame._def.BackgroundImage;
		if (!gGame._standalone) this._loading_image_url += '?zoom=' + gPort._zoomLevel + '&zoom_filter=' + gGame._def.ZoomFilter;
		this._loading_image = this._addImage( this._loading_image_url );
	}
	else {
		this._loading_image_url = gGame._homePath + 'images/logo_80.png';
		this._loading_image = this._addImage( this._loading_image_url );
	}
	
	if (gGame._def.SplashImage) {
		this._splash_image_url = gGame.getGamePath() + gGame._def.SplashImage;
		if (!gGame._standalone) this._splash_image_url += '?zoom=' + gPort._zoomLevel + '&zoom_filter=' + gGame._def.ZoomFilter;
		this._splash_image = this._addImage( this._splash_image_url );
	}
	else {
		this._splash_image_url = this._loading_image_url;
		this._splash_image = this._loading_image;
	}
	
	this._checkPreload();
};

_ProgressDialog.prototype._addImage = function(_url) {
	// add image to preload list
	var _img = new Image();
	_img.src = _url;
	this.images.push( _img );
	return _img;
};

_ProgressDialog.prototype._checkPreload = function() {
	// see if images are done preloading
	var _num = 0;
	for (var _idx = 0, _len = this.images.length; _idx < _len; _idx++) {
		if (this.images[_idx].complete || this.images[_idx].width) _num++;
	}
	if (_num == this.images.length) {
		// preload complete
		this.fireHandler('onPreload');
	}
	else {
		// nope, keep trying
		setTimeout( function() { gProgress._checkPreload(); }, 100 );
	}
};

_ProgressDialog.prototype._rezoom = function() {
	// reload loading image after a rezoom
	if (gGame._def.BackgroundImage) {
		this._loading_image_url = this._loading_image_url.replace(/\?.+$/, '') + '?zoom=' + gPort._zoomLevel + '&zoom_filter=' + gGame._def.ZoomFilter;
		this._loading_image = new Image();
		this._loading_image.src = this._loading_image_url;
	}
};

_ProgressDialog.prototype._getRezoomProgress = function() {
	// get progress of rezoom
	return( (this._loading_image.complete || this._loading_image.width) ? 1.0 : 0.0 );
};

_ProgressDialog.prototype.setPosition = function(_splash) {
	// find center of largest portal
	var _largest_area = 0;
	var _best_port = null;
	
	if (_splash) {
		this.width = this._splash_image.width;
		this.height = this._splash_image.height;
	}
	else {
		this.width = this._loading_image.width;
		this.height = this._loading_image.height;
	}
	
	var _container = el('effect_container');
	if (_container) {
		this._parent = _container;
		this.left = parseInt( (gPort.div.offsetWidth / 2) - (this.width / 2), 10 );
		this.top = parseInt( (gPort.div.offsetHeight / 2) - (this.height / 2), 10 );
	}
	else {
		if (gGame._portals) {
			for (var _idx = 0; _idx < gGame._portals.length; _idx++) {
				var _port = gGame._portals[_idx];
				if (_port.portWidth * _port.portHeight > _largest_area) {
					_largest_area = _port.portWidth * _port.portHeight;
					_best_port = _port;
				}
			}
		}
	
		if (_best_port) {
			this._parent = _best_port.div;
			this.left = parseInt( (this._parent.offsetWidth / 2) - (this.width / 2), 10 );
			this.top = parseInt( (this._parent.offsetHeight / 2) - (this.height / 2), 10 );
		}
		else {
			// no port found, fail
			return _throwError('Could not find suitable port for progress.');
		}
	}
};

_ProgressDialog.prototype.show = function(_splash) {
	// show (and possibly render) the dialog
	this.hide();
	this.setPosition(_splash);
	
	this.div = document.createElement('DIV');
	this.div.setAttribute( 'id', this.id );
	this.div.id = this.id;
	this.div.style.position = 'absolute';
	this.div.style.left = this.left + 'px';
	this.div.style.top = this.top + 'px';
	this.div.style.width = this.width + 'px';
	this.div.style.height = this.height + 'px';
	this.div.style.zIndex = _splash ? 3 : this.zIndex;
	this.div.style.visibility = 'visible';
	this._parent.appendChild(this.div);
	
	var _url = _splash ? this._splash_image_url : this._loading_image_url;
	
	if (ua.ie6 && _url.match(/\.png(\?|$)/i)) {
		this.div.innerHTML = "<div "
			+ " style=\"" + "width:" + this.width + "px; height:" + this.height + "px;"
			+ "filter:progid:DXImageTransform.Microsoft.AlphaImageLoader"
			+ "(src=\'" + _url + "\', sizingMethod='scale');\"></div>";
	}
	else {
		this.div.style.backgroundImage = 'url('+_url+')';
	}
	
	// show progress bar in toolbar, hide icons
	if (!gGame._level_editor) {
		gGame._toolbar._set_mode('loading');
		gGame._toolbar._show_overlay();
	}
	this._update();
};

_ProgressDialog.prototype.hide = function() {
	// hide the dialog
	if (this.div) {
		this.div.style.left = '-4000px';
		this.div.style.visibility = 'hidden';
		
		// what the hey, let's kill it too (less abs divs the better)
		try { this._parent.removeChild(this.div); } catch (e) {
			// try one last time
			var _div = el( this.id );
			try { this._parent.removeChild(_div); } catch (e) { ; };
		};
		this.div = null;
		
		// restore toolbar icons
		if (!gGame._level_editor) {
			gGame._toolbar._set_mode('icons');
			gGame._toolbar._hide_overlay();
		}
	}
};

_ProgressDialog.prototype._update = function(_newCounter, _newCounterMax) {
	// update progress
	if (typeof(_newCounter) != 'undefined') this._counter = _newCounter;
	if (typeof(_newCounterMax) != 'undefined') this._counterMax = _newCounterMax;
	
	var _value = this._counter / this._counterMax;
	if (!gGame._level_editor) gGame._toolbar._set_loading_progress( _value );
};
