// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

// Simple Horiz Slider

function Slider(id, args) {
	// class constructor
	// creates new horiz or vert slider bar
	assert(id, "You must pass Slider an ID");
	this.id = id;
	
	this.div = document.getElementById(id);
	assert(this.div, "Cannot locate Slider element: " + id);
	
	this.div.style.position = 'relative';
	this.div.style.overflow = 'hidden';

	this.direction = 0;
	this.pos = 0;
	this.max = 10;
	this.offset = 0;
	this.allowFloatPos = false;
	
	this.thumbSize = 8;
	this.thumbMargin = 8;

	for (var key in args) this[key] = args[key];

	if (this.direction == 'vert') this.direction = 1;
	if (this.direction == 'horiz') this.direction = 0;
	
	this.bkgnd = document.createElement('DIV');
	this.bkgnd.style.position = 'relative';
	this.bkgnd.style.zIndex = 1;
	if (this.direction) {
		// vert
		this.bkgnd.style.width = '16px';
		this.bkgnd.style.height = '100%';
		this.bkgnd.innerHTML = 
			'<div class="slider_bar vert" style="height:'+Math.floor(this.div.offsetHeight - 8)+'px"></div>';
	}
	else {
		// horiz
		this.bkgnd.style.width = '100%';
		this.bkgnd.style.height = '16px';
		this.bkgnd.innerHTML = 
			'<div class="slider_bar horiz" style="width:'+Math.floor(this.div.offsetWidth - 8)+'px"></div>';
	}
	this.div.appendChild(this.bkgnd);

	this.thumb = document.createElement('DIV');
	this.thumb.style.position = 'absolute';
	this.thumb.style.left = '0px';
	this.thumb.style.top = '0px';
	this.thumb.style.zIndex = 2;
	if (this.direction) {
		// vert
		this.thumb.innerHTML = 
			'<div class="slider_thumb vert"></div>';
	}
	else {
		// horiz
		this.thumb.innerHTML = 
			'<div class="slider_thumb horiz"></div>';
	}

	this.updateThumb();
	this.div.appendChild(this.thumb);
	
	this.div.captureMouse = this;
	
	this.edit = document.getElementById( id.toString().replace(/_slider$/, '' ) ) || null;
	if (this.edit) {
		var self = this;
		this.edit.onchange = function() {
			var value = self.allowFloatPos ? parseFloat(this.value) : parseInt(this.value, 10);
			if (value < self.offset) value = self.offset;
			else if (value > self.offset + self.max) value = self.offset + self.max;
			this.value = value;
			self.pos = value - self.offset;
			self.updateThumb();
			fire_callback( self.onScroll, self.pos );
			fire_callback( self.onChange, self.pos );
		};
	}
};

Slider.prototype.updateThumb = function() {
	// update thumb position and size
	// expects pos/max to be set
	this.barSize = this.direction ? this.div.offsetHeight : this.div.offsetWidth;
	this.thumbMax = ((this.barSize - this.thumbSize) - (this.thumbMargin * 2));
	this.thumbPos = Math.floor( (this.pos / this.max) * this.thumbMax );

	if (this.direction) {
		// vert
		this.thumb.style.top = '' + Math.floor(this.thumbMargin + this.thumbPos) + 'px';
		this.thumb.style.width = '' + this.div.offsetWidth + 'px';
		this.thumb.style.height = '' + this.thumbSize + 'px';
	}
	else { // horiz
		this.thumb.style.left = '' + Math.floor(this.thumbMargin + this.thumbPos) + 'px';
		this.thumb.style.width = '' + this.thumbSize + 'px';
		this.thumb.style.height = '' + this.div.offsetHeight + 'px';
	}
};

Slider.prototype.updatePosition = function(pt) {
	// update position from point
	// also updates thumb
	this.thumbMax = ((this.barSize - this.thumbSize) - (this.thumbMargin * 2));
	var newThumbPos = this.direction ? (pt.y - this.anchorOffset) : 
		(pt.x - this.anchorOffset);
	
	newThumbPos -= this.thumbMargin;
	newThumbPos++;
	
	if (newThumbPos < 0) newThumbPos = 0;
	if (newThumbPos > this.thumbMax) newThumbPos = this.thumbMax;
	
	this.pos = (newThumbPos / this.thumbMax) * this.max;
	if (!this.allowFloatPos) this.pos = Math.floor( this.pos );

	if (this.pos < 0) this.pos = 0;
	if (this.pos > this.max) this.pos = this.max;

	this.updateThumb();
	// this.onScroll(this.pos);
	fire_callback( this.onScroll, this.pos );
	
	if (this.edit) {
		var disp = this.offset + this.pos;
		disp = disp.toString();
		if (this.allowFloatPos) {
			disp = disp.replace(/(\.\d{2}).+$/, '$1');
			if (disp.match(/(^\-?\d+)$/)) disp += '.00';
			if (disp.match(/(\.\d)$/)) disp += '0';
		}
		this.edit.value = disp;
	}
};

Slider.prototype.ptInThumb = function(pt) {
	// check if point is located in thumb

	if (this.direction) {
		return ( (pt.y >= this.thumb.offsetTop) && 
			(pt.y < this.thumb.offsetTop + this.thumb.offsetHeight) );
	}
	else {
		return ( (pt.x >= this.thumb.offsetLeft) 
			&& (pt.x < this.thumb.offsetLeft + this.thumb.offsetWidth) );
	}
};

Slider.prototype.onMouseDown = function(e, pt) {
	// mouse down event in bar

	if (this.ptInThumb(pt)) {
		// point inside thumb -- grab anchor point
		this.anchorOffset = this.direction ? (pt.y - this.thumb.offsetTop) : 
			(pt.x - this.thumb.offsetLeft);
	}
	else {
		// point outside thumb -- scroll to here (center thumb)
		this.anchorOffset = this.direction ? Math.floor(this.thumb.offsetHeight / 2) : 
			Math.floor(this.thumb.offsetWidth / 2);
	}
	this.updatePosition(pt);
};

Slider.prototype.onMouseMove = function(e, pt) {
	// mouse move event over bar
	this.updatePosition(pt);
};

Slider.prototype.onMouseUp = function(e, pt) {
	// mouse up event in bar
	// this.updatePosition(pt);
	fire_callback( this.onChange, this.pos );
};

Slider.prototype.onScroll = function(newPos) {
	// override this to receive scroll events
};

Slider.prototype.onChange = function(newPos) {
	// override this to receive change events (not real-time, only on mouseup and text field change)
};