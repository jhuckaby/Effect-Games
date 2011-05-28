// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// StaticImageSprite.js
// Variable sized sprite based on image definition (image must be preloaded)
////

function StaticImageSprite(_id) {
	// class constructor
	if (_id) this.id = _id;
};

StaticImageSprite.prototype = new Sprite;
StaticImageSprite.prototype.type = 'StaticImageSprite';
StaticImageSprite.prototype.__name = 'StaticImageSprite';

StaticImageSprite.prototype.init = function() {
	if (!this.id) this.id = _get_unique_id();
	this.require('port', 'url');
	
	this.image = gImageLoader.lookupImage( this.url );
	if (!this.image) return _throwError("Failed to initialize StaticImageSprite: Image not loaded: " + this.url);
	
	this.width = this.image.img.width / gPort._zoomLevel;
	this.height = this.image.img.height / gPort._zoomLevel;
	
	if (!this.offsetX) this.offsetX = 0;
	if (!this.offsetY) this.offsetY = 0;

	this.globalID = this.port.id + '_' + this.id;
	this.div = document.createElement('DIV');
	this.style = this.div.style;
	this.div.setAttribute('id', this.globalID);
	this.div.id = this.globalID;
	this.style.position = 'absolute';
	this.style.zIndex = this.zIndex;
	this.style.visibility = this.visible ? "visible" : "hidden";
	this._updateOpacity();
	this.setImage();
	
	if (this.className) this.div.className = this.className;
	
	if (ua.ie) this.div.setAttribute( 'onselectstart', "return false" );

	this.port.div.appendChild(this.div);
};
