// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

function ScrollBar(id, args) {
	// class constructor
	// creates new horiz or vert scroll bar
	assert(id, "You must pass ScrollBar an ID");
	this.id = id;
	
	this.div = document.getElementById(id);
	assert(this.div, "Cannot locate ScrollBar element: " + id);
	
	this.div.style.position = 'relative';
	this.div.style.overflow = 'hidden';

	this.direction = 0;
	this.pos = 0;
	this.max = 10;
	this.viewableArea = 2;
	this.allowFloatPos = false;

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
			'<table class="scrollbar_bkgnd_vert" cellspacing="0" cellpadding="0" border="0" width="16" height="100%">' + 
			'<tr><td class="top" height="4">' + spacer(16,4) + '</td></tr>' + 
			'<tr><td class="center" height="*">' + spacer(16,1) + '</td></tr>' + 
			'<tr><td class="bottom" height="4">' + spacer(16,4) + '</td></tr>' + 
			'</table>';
	}
	else {
		// horiz
		this.bkgnd.style.width = '100%';
		this.bkgnd.style.height = '16px';
		this.bkgnd.innerHTML = 
			'<table class="scrollbar_bkgnd_horiz" cellspacing="0" cellpadding="0" border="0" width="100%" height="16"><tr>' + 
			'<td class="left" width="4">' + spacer(4,16) + '</td>' + 
			'<td class="center" width="*">' + spacer(1,16) + '</td>' + 
			'<td class="right" width="4">' + spacer(4,16) + '</td>' + 
			'</tr></table>';
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
			'<table class="scrollbar_thumb_vert" cellspacing="0" cellpadding="0" border="0" width="16" height="100%">' + 
			'<tr><td class="top" height="8">' + spacer(16,8) + '</td></tr>' + 
			'<tr><td class="center" height="*">' + spacer(16,1) + '</td></tr>' + 
			'<tr><td class="bottom" height="8">' + spacer(16,8) + '</td></tr>' + 
			'</table>';
	}
	else {
		// horiz
		this.thumb.innerHTML = 
			'<table class="scrollbar_thumb_horiz" cellspacing="0" cellpadding="0" border="0" width="100%" height="16px"><tr>' + 
			'<td class="left" width="8">' + spacer(8,16) + '</td>' + 
			'<td class="center" width="*">' + spacer(1,16) + '</td>' + 
			'<td class="right" width="8">' + spacer(8,16) + '</td>' + 
			'</tr></table>';
	}

	this.updateThumb();
	this.div.appendChild(this.thumb);
	
	this.div.captureMouse = this;
};

ScrollBar.prototype.updateThumb = function() {
	// update thumb position and size
	// expects pos/max to be set
	this.barSize = this.direction ? this.div.offsetHeight : this.div.offsetWidth;
	this.thumbSize = Math.floor( (this.viewableArea / this.max) * this.barSize );
	
	if (this.viewableArea == this.max) this.thumbPos = 0;
	else this.thumbPos = Math.floor( (this.pos / (this.max - this.viewableArea)) * (this.barSize - this.thumbSize) );

	if (this.direction) {
		// vert
		this.thumb.style.top = this.thumbPos + 'px';
		this.thumb.style.width = this.div.offsetWidth + 'px';
		this.thumb.style.height = this.thumbSize + 'px';
	}
	else { // horiz
		this.thumb.style.left = this.thumbPos + 'px';
		this.thumb.style.width = this.thumbSize + 'px';
		this.thumb.style.height = this.div.offsetHeight + 'px';
	}
};

ScrollBar.prototype.updatePosition = function(pt) {
	// update position from point
	// also updates thumb
	var newThumbPos = this.direction ? (pt.y - this.anchorOffset) : 
		(pt.x - this.anchorOffset);
	if (newThumbPos < 0) newThumbPos = 0;
	if (newThumbPos > this.barSize - this.thumbSize) newThumbPos = this.barSize - this.thumbSize;
	
	if (this.viewableArea == this.max) this.pos = 0;
	else this.pos = (newThumbPos / (this.barSize - this.thumbSize)) * (this.max - this.viewableArea);
	if (!this.allowFloatPos) this.pos = Math.floor( this.pos );

	if (this.pos < 0) this.pos = 0;
	if (this.pos > this.max - this.viewableArea) this.pos = this.max - this.viewableArea;

	this.updateThumb();
	// this.onScroll(this.pos);
	fire_callback( this.onScroll, this.pos );
};

ScrollBar.prototype.ptInThumb = function(pt) {
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

ScrollBar.prototype.onMouseDown = function(e, pt) {
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

ScrollBar.prototype.onMouseMove = function(e, pt) {
	// mouse move event over bar
	this.updatePosition(pt);
};

ScrollBar.prototype.onMouseUp = function(e, pt) {
	// mouse up event in bar
	// this.updatePosition(pt);
};

ScrollBar.prototype.onScroll = function(newPos) {
	// override this to receive scroll events
};

//
// Scroll Arrow Button
//

function ScrollArrow(id, xd, yd, callback) {
	assert(id, "You must pass ScrollArrow an ID");
	this.id = id;
	
	this.div = document.getElementById(id);
	assert(this.div, "Cannot locate ScrollArrow element: " + id);
	
	this.xd = xd;
	this.yd = yd;
	this.callback = callback;
	
	this.div.captureMouse = this;
};

ScrollArrow.prototype.nudge = function() {
	fire_callback( this.callback, this.xd, this.yd );
	
	var self = this;
	if (this.active) this.timer = setTimeout( function() { self.nudge(); }, this.delay );
	
	this.delay *= 0.6;
	if (this.delay < 1) this.delay = 1;
};

ScrollArrow.prototype.onMouseDown = function(e, pt) {
	// mouse down event in arrow
	if (this.timer) clearTimeout( this.timer );
	this.delay = 500;
	this.active = true;
	this.nudge();
	return false; // stop event
};

ScrollArrow.prototype.onMouseUp = function(e, pt) {
	// mouse up event in arrow
	this.active = false;
	if (this.timer) clearTimeout( this.timer );
	return false; // stop event
};
