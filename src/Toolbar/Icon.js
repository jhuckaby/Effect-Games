// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.create( 'Toolbar.Icon', {
	
	img_src: '',
	x: 0,
	clip_x: 0,
	width: 24,
	height: 24,
	img_width: 288,
	img_height: 48,
	title: '',
	
	__construct: function() {
		// class constructor
	},
	
	init: function(_toolbar, _x) {
		// create icon
		this.x = _x;
		this._toolbar = _toolbar;
		if (!this.img_src) this.img_src = gGame._homePath + 'images/engine/toolbar/icons.png';
		
		this.div = document.createElement('div');
		this.div.setAttribute('title', this.title);
		this.style = this.div.style;
		this.style.position = 'absolute';
		
		if (ua.op) {
			this.style.left = '' + Math.floor(_x) + 'px';
			this.style.top = '0px';
			this.style.width = '' + this.width + 'px';
			this.style.height = '' + this.height + 'px';
			this.style.backgroundImage = 'url('+this.img_src+')';
			this.style.backgroundPosition = '-' + this.clip_x + 'px -24px';
		}
		else {
			this.style.left = '' + Math.floor(_x - this.clip_x) + 'px';
			this.style.top = '-24px';
			this.style.width = '' + this.img_width + 'px';
			this.style.height = '' + this.img_height + 'px';
			this.style.clip = 'rect(24px '+Math.floor(this.clip_x + 24)+'px 48px '+this.clip_x+'px)';
			this._toolbar._set_div_image( this.div, this.img_src, this.img_width, this.img_height );
		}
		this.style.cursor = 'pointer';
		
		this.state = 'out';
		
		var icon = this;
		this.div.onmouseover = function() { icon.onMouseOver(); };
		this.div.onmouseout = function() { icon.onMouseOut(); };
		this.div.onclick = function(e) { icon.onClick(e || window.event); };
	},
	
	onMouseOver: function() {
		if (ua.op) {
			this.style.backgroundPosition = '-' + this.clip_x + 'px -0px';
		}
		else {
			this.style.left = '' + Math.floor(this.x - this.clip_x) + 'px';
			this.style.clip = 'rect(0px '+Math.floor(this.clip_x + 24)+'px 24px '+this.clip_x+'px)';
			this.style.top = '0px';
		}
		this.state = 'over';
	},
	
	onMouseOut: function() {
		if (ua.op) {
			this.style.backgroundPosition = '-' + this.clip_x + 'px -24px';
		}
		else {
			this.style.left = '' + Math.floor(this.x - this.clip_x) + 'px';
			this.style.clip = 'rect(24px '+Math.floor(this.clip_x + 24)+'px 48px '+this.clip_x+'px)';
			this.style.top = '-24px';
		}
		this.state = 'out';
	},
	
	refresh: function() {
		// refresh clip
		if (this.state == 'over') this.onMouseOver();
		else this.onMouseOut();
	},
	
	onClick: function() {},
	
	logic: function() {},
	draw: function() {},
	pause: function() {},
	resume: function() {},
	
	update: function() {}
	
} );
