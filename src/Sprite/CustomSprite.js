// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// CustomSprite.js
// A custom sprite framework -- subclass defines div content
////

function CustomSprite(_id) {
	// class constructor
	if (_id) this.id = _id;
};

CustomSprite.prototype = new Sprite;
CustomSprite.prototype.type = 'CustomSprite';

CustomSprite.prototype.init = function() {
	if (!this.id) this.id = _get_unique_id();
	this.require('port', 'width', 'height');
	
	// try to find our definition from game
	this._def = gGame._sprite_defs[ this.__name ] || null;
	
	if (!this.offsetX) this.offsetX = 0;
	if (!this.offsetY) this.offsetY = 0;

	this.globalID = this.port.id + '_' + this.id;
	this.div = document.createElement('DIV');
	this.style = this.div.style;
	this.div.setAttribute('id', this.globalID);
	this.div.id = this.globalID;
	this.style.position = 'absolute';
	this.style.width = this.zoom(this.width) + 'px';
	this.style.height = this.zoom(this.height) + 'px';
	if (ua.clipnest) this.style.clip = this._getClipStyle();
	this.style.left = this._getScreenX() + 'px';
	this.style.top = this._getScreenY() + 'px';
	this.style.zIndex = this.zIndex;
	this.style.visibility = this.visible ? "visible" : "hidden";
	this._updateOpacity();
	
	if (this.className) this.div.className = this.className;
	if (this.html) this.div.innerHTML = this.html;

	this.port.div.appendChild(this.div);
};
