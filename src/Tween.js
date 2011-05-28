// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// Tween.js
// Provides numerical obj property animation with easing.
////

function _TweenManager() {
	// Tween Manager
}

_TweenManager.prototype._tweens = {};
_TweenManager.prototype._nextId = 1;

_TweenManager.prototype.addTween = 
_TweenManager.prototype.add = function(_args) {
	// add new tween to table
	var _tween = new _Tween(_args);
	this._tweens[ this._nextId ] = _tween;
	this._nextId++;
	return _tween;
};

_TweenManager.prototype.logic = function() {
	// update tweens
	for (var _id in this._tweens) {
		var _tween = this._tweens[_id];
		_tween.logic();
		if (_tween.destroyed) delete this._tweens[_id];
	}
};

_TweenManager.prototype.removeAll = function() {
	// remove all tweens
	this._tweens = {};
};

// Tween Object

function _Tween(_args) {
	// create new tween
	// args should contain:
	//	target: target object
	//	duration: length of animation in logic frames
	//	mode: EaseIn, EaseOut, EaseInOut (omit or empty string for linear)
	//	algorithm: Quadtaric, etc.
	//	properties: { x: {start:0, end:150}, y: {start:0, end:250, filter:Math.floor} }
	for (var _key in _args) this[_key] = _args[_key];
	
	// linear shortcut
	if (!this.mode) this.mode = 'EaseIn';
	if (!this.algorithm) this.algorithm = 'Linear';
	
	this.require('target', 'duration', 'properties');
	if (typeof(this.target) != 'object') return _throwError("Tween: Target is not an object");
	if (typeof(this.duration) != 'number') return _throwError("Tween: Duration is not a number");
	if (typeof(this.properties) != 'object') return _throwError("Tween: Properties is not an object");
	
	// setup properties
	for (var _key in this.properties) {
		var _prop = this.properties[_key];
		if (typeof(_prop) == 'number') _prop = this.properties[_key] = { end: _prop };
		if (typeof(_prop) != 'object') return _throwError("Tween: Property " + _key + " is not the correct format");
		if (typeof(_prop.start) == 'undefined') _prop.start = this.target[_key];
		if (typeof(_prop.start) != 'number') return _throwError("Tween: Property " + _key + ": start is not a number");
		if (typeof(_prop.end) != 'number') return _throwError("Tween: Property " + _key + ": end is not a number");
		if (_prop.filter && (typeof(_prop.filter) != 'function')) return _throwError("Tween: Property " + _key + ": filter is not a function");
	}
	
	if (!this.delay) this.start = gGame.logicClock;
}

_Tween.prototype.destroyed = false;
_Tween.prototype.delay = 0;

_Tween.prototype.require = function() {
	// make sure required class members exist
	for (var _idx = 0, _len = arguments.length; _idx < _len; _idx++) {
		if (typeof(this[arguments[_idx]]) == 'undefined') {
			return _throwError("Tween: Missing required parameter: " + arguments[_idx]);
		}
	}
	return true;
};

_Tween.prototype.logic = function() {
	// abort if our target is destroyed
	// (and don't call onTweenComplete)
	if (this.target.destroyed) {
		this.destroyed = true;
		return;
	}
	if (this.delay > 0) {
		this.delay--;
		if (this.delay <= 0) this.start = gGame.logicClock;
		else return;
	}
	
	// calculate current progress
	this.amount = (gGame.logicClock - this.start) / this.duration;
	if (this.amount >= 1.0) {
		this.amount = 1.0;
		this.destroyed = true;
	}
	
	// animate obj properties
	for (var _key in this.properties) {
		var _prop = this.properties[_key];
		this.target[_key] = _prop.start + (ease(this.amount, this.mode, this.algorithm) * (_prop.end - _prop.start));
		if (_prop.filter) this.target[_key] = _prop.filter( this.target[_key] );
	}
	
	// notify object that things are happening to it
	if (this.target.onTweenUpdate) this.target.onTweenUpdate(this);
	if (this.destroyed) {
		if (this.onTweenComplete) this.onTweenComplete(this);
		else if (this.target.onTweenComplete) this.target.onTweenComplete(this);
	}
};

// Static Utility Function for tweening a single property to a single point in an animation

function tweenFrame(_start, _end, _amount, _mode, _algo) {
	return _start + (ease(_amount, _mode, _algo) * (_end - _start));
}
