// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// Tile.js
// Base class for all tile objects
////

function Tile() {
	// class constructor
};

Tile.prototype.__name = 'Tile';
Tile.extend = function(_name, _members) { Class.extend(this, _name, _members); };
Tile.subclass = Tile.extend;

Tile.prototype.type = '';
Tile.prototype.solid = false;
Tile.prototype.ground = false;
Tile.prototype.collisions = false;
Tile.prototype.climb = false;
Tile.prototype.requires = null;

Tile.prototype.onScreen = function() {
	// override in subclasses
};

Tile.prototype.tween = function(_args) {
	// tween object properties
	_args.target = this;
	gTween.addTween(_args);
};
