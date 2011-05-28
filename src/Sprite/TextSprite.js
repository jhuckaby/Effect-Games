// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// TextSprite.js
// A merging of Sprite and HUD for a floating font grid thingy
////

function TextSprite(_id) {
	// class constructor
	if (_id) this.id = _id;
	this.text = '';
};

// multiple inheritance, Sprite takes precedence over HUD
TextSprite.prototype = merge_objects( new HUD(), new Sprite() );
TextSprite.prototype.type = 'TextSprite';

TextSprite.prototype.init = function() {
	if (!this.id) this.id = _get_unique_id();
	
	// try to find our definition from game
	this._def = gGame._sprite_defs[ this.__name ] || null;
	
	// setup font
	this.require('font');
	if (!this._customDef) this.setFont( this._fontName );
	
	// setup table
	this.require('cols', 'rows');
	// this.setTableSize( this.cols, this.rows );
	
	// reset elements for our weird nature
	this.width = this._charWidth * this.cols * this._trackingX;
	this.height = this._charHeight * this.rows * this._trackingY;
	this._getClipStyle();
	
	// prepopulate text?
	if (this.text) this.setString(0, 0, this.text);
	
	// call HUD's init
	HUD.prototype.init.call(this);
	
	this.style.left = this._getScreenX() + 'px';
	this.style.top = this._getScreenY() + 'px';
};

TextSprite.prototype.reset = function() {
	// must call HUD reset for this
	HUD.prototype.reset.apply(this, []);
};
