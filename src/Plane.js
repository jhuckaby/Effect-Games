// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// _Plane.js
// Abstract base class for planes (layers) in a portal
////

function _Plane() {
	// class constructor
};

_Plane.prototype._isPlane = true;
_Plane.prototype.scrollX = 0;
_Plane.prototype.scrollY = 0;
_Plane.prototype.scrollSpeed = 1.0;
_Plane.prototype.zIndex = 1;
_Plane.prototype.visible = true;

_Plane.prototype.setZIndex = function(_idx) {
	// set zIndex level
	this.zIndex = parseInt(_idx, 10);
};

_Plane.prototype.setScrollSpeed = function(_speed) {
	// set zIndex level
	this.scrollSpeed = parseFloat(_speed);
};

_Plane.prototype.init = function() {
	// init graphical elements
};

_Plane.prototype.reset = function() {
	// destroy graphical elements
};

_Plane.prototype.logic = function() {
	// called for each logic loop iteration
};

_Plane.prototype.draw = function() {
	// called for each draw loop iteration
};

_Plane.prototype.hide = function() {
	// hide graphical elements
};

_Plane.prototype.show = function() {
	// show graphical elements
};

_Plane.prototype.getMouseCoords = function() {
	// get current mouse coords adjusted for plane
	// i.e. scrollSpeed may be different, so our scrollX/Y may differ from port's version
	var _pt = this.port.getMouseCoords();
	if (_pt) return _pt.offset( 0 - this.port.scrollX, 0 - this.port.scrollY ).offset( this.scrollX, this.scrollY );
	else return null;
};

_Plane.prototype.zoom = function(_value) {
	// apply portal zoom level to specified value
	return Math.floor( _value * this.port._zoomLevel, 10 );
};

_Plane.prototype.unzoom = function(_value) {
	// remove portal zoom level from specified value
	return Math.floor( _value / this.port._zoomLevel, 10 );
};

_Plane.prototype.tween = function(_args) {
	// tween object properties
	_args.target = this;
	gTween.addTween(_args);
};
