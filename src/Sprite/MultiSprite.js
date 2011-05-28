// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// MultiSprite.js
// Sprite Object
////

function MultiSprite(_id) {
	// class constructor
	if (_id) this.id = _id;
};

MultiSprite.prototype = new Sprite();

MultiSprite.prototype.init = function() {
	// initialize things
	if (!this.id) this.id = _get_unique_id();
	this.require('port');
	
	// try to find our definition from game
	this._def = gGame._sprite_defs[ this.__name ] || null;

	if (!this.offsetX) this.offsetX = 0;
	if (!this.offsetY) this.offsetY = 0;

	this.globalID = this.port.id + '_' + this.id;
};

MultiSprite.prototype.reset = function() {
	// delete all graphical elements (probably for re-zoom)
	for (var _idx = 0; _idx < this.sprites.length; _idx++) {
		var _sprite = this.sprites[_idx];
		_sprite.reset();
	}
	this.sprites = [];
};

MultiSprite.prototype.logic = function() {
	for (var _idx = 0, _len = this.sprites.length; _idx < _len; _idx++) {
		this.sprites[_idx].logic();
	}
};

MultiSprite.prototype.draw = function() {
	for (var _idx = 0, _len = this.sprites.length; _idx < _len; _idx++) {
		this.sprites[_idx].draw();
	}
	
	if (this.dieOffscreen) {
		var _die = 0;
		if (this.x + this.width < this.port.scrollX - (this.port.portWidth * this.plane._dieOffscreenDistance)) _die = 1;
		else if (this.y + this.height < this.port.scrollY - (this.port.portHeight * this.plane._dieOffscreenDistance)) _die = 1;
		else if (this.x >= this.port.scrollX + this.port.portWidth + (this.port.portWidth * this.plane._dieOffscreenDistance)) _die = 1;
		else if (this.y >= this.port.scrollY + this.port.portHeight + (this.port.portHeight * this.plane._dieOffscreenDistance)) _die = 1;

		if (_die) this.destroy();
	} // dieOffscreen
};

MultiSprite.prototype.destroy = function() {
	// prep for deletion
	if (!this.destroyed) {
		for (var _idx = 0, _len = this.sprites.length; _idx < _len; _idx++) {
			this.sprites[_idx].destroy();
		}
		this.destroyed = 1;
		if (this._aether) this._aether.destroyed = 1;
	}
};

MultiSprite.prototype.hide = function() {
	for (var _idx = 0, _len = this.sprites.length; _idx < _len; _idx++) {
		this.sprites[_idx].hide();
	}
};

MultiSprite.prototype.show = function() {
	for (var _idx = 0, _len = this.sprites.length; _idx < _len; _idx++) {
		this.sprites[_idx].show();
	}
};

MultiSprite.prototype.ptIn = function(_px, _py) {
	// check if pt is inside our rect
	for (var _idx = 0, _len = this.sprites.length; _idx < _len; _idx++) {
		if (this.sprites[_idx].ptIn(_px, _py)) return true;
	}
	return false;
};

MultiSprite.prototype.rectIn = function(_tempRect) {
	// check if rect is inside our rect
	for (var _idx = 0, _len = this.sprites.length; _idx < _len; _idx++) {
		if (this.sprites[_idx].rectIn(_tempRect)) return true;
	}
	return false;
};
