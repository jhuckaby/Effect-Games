//
// TrueFont Plugin for EffectGames.com
// Pre-renders text server-side and returns images for use as sprites
// Docs: http://www.effectgames.com/effect/#Article/plugins/TrueFont
// Version: 1.0b
// Author: Joseph Huckaby
// Copyright (c) 2009 Effect Games
// Source Code released under the MIT License: http://www.opensource.org/licenses/mit-license.php
//

Sprite.extend( 'TrueFontSprite', {
	
	background: 'transparent',
	width: 0,
	height: 0,
	fontAsset: '',
	xmlAsset: '',
	xPath: '',
	pointSize: 12,
	textColor: '#000000',
	textOpacity: 1.0,
	textKerning: 0.0,
	textAlign: 'center',
	antiAlias: true,
	wordWrap: true,
	imageFormat: 'png',
	
	__static: {
		preload: function(xPathList) {
			// convenience method, can be called by YourSpriteClass.preload([...]);
			this.prototype.preload(xPathList);
		}
	},
	
	images: null,
	
	preload: function(xPathList) {
		// preload a set of images, given array of XPaths into XML asset file.
		// if omitted, just preloads single xPath set on object
		// all other params must be set, including xml/font/size/color/etc.
		if (!xPathList) {
			// no xPathList passed in, so just try to preload single xPath in prototype
			if (!this.xPath) return; // no xPath set, hmmm...
			xPathList = [ this.xPath ];
		}
		var oldXPath = this.xPath;
		if (!this.__construct.prototype.images) this.__construct.prototype.images = [];
		
		for (var idx = 0, len = xPathList.length; idx < len; idx++) {
			this.xPath = xPathList[idx];
			this.__construct.prototype.images.push( this.getURL() );
		} // foreach xpath
		
		this.xPath = oldXPath;
	},
	
	composeQueryString: function(queryObj) {
		// compose key/value pairs into query string
		var qs = '';
		for (var key in queryObj) {
			qs += (qs.length ? '&' : '?') + escape(key) + '=' + escape(queryObj[key]);
		}
		return qs;
	},
	
	getURL: function() {
		// construct image URL with current settings
		return Effect.Game.getBaseEffectURL() + 'api/grt.' + this.imageFormat + this.composeQueryString({
			g: Effect.Game.id,
			r: Effect.Game.getQuery().rev,
			f: this.fontAsset,
			x: this.xmlAsset,
			xp: this.xPath,
			w: this.width,
			h: this.height,
			b: this.background.toString().replace(/^\#/, 'H').replace(/^transparent$/, ''),
			p: this.pointSize,
			c: this.textColor.toString().replace(/^\#/, 'H'),
			o: this.textOpacity,
			a: this.textAlign,
			k: this.textKerning,
			aa: this.antiAlias ? 1 : 0,
			ww: this.wordWrap ? 1 : 0
		});
	},
	
	init: function() {
		// register our URL, and invoke parent's init()
		this.url = this.getURL();
		Sprite.prototype.init.call(this);
	},
	
	setXPath: function(newXPath) {
		// change display to new XPath from XML file (must be preloaded)
		this.xPath = newXPath;
		this.url = this.getURL();
		this.setImage();
	}
	
} );
