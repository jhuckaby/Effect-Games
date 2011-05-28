// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

LevelEditor.Tool.subclass( 'LevelEditor.ScrollTool', {
	name: 'hand',
	icon: 'hand.png',
	title: 'Scroll Tool (H)',
	hotkey: "H",
	
	activate: function() {
		this.page.set_cursor( ff ? '-moz-grab' : 'url(images/cursors/hand_opened.cur) 8 8, move');
	},
	
	mouse_down: function(e, pt, button) {
		this.page.set_cursor( ff ? '-moz-grabbing' : 'url(images/cursors/hand_closed.cur) 8 8, move' );
		this.origin = pt;
		this.start_scrollx = this.page.scrollx;
		this.start_scrolly = this.page.scrolly;
	},
	
	mouse_move: function(e, pt) {
		if (this.page._game.mouseIsDown) {
			var layer = this.page.current_layer;
			var plane = this.page._port.getPlane( layer.Name );
			
			this.page.set_scroll(
				this.start_scrollx - (((pt.x - this.origin.x) / plane.scrollSpeed) / this.page._port.getZoomLevel()),
				this.start_scrolly - (((pt.y - this.origin.y) / plane.scrollSpeed) / this.page._port.getZoomLevel())
			);
		}
	},
	
	mouse_up: function(e, pt, button) {
		this.page.set_cursor('url(images/cursors/hand_opened.cur) 8 8, move');
	},
	
	key_down: function(e, code) {
		if (code == RIGHT_ARROW) this.page.onNudgeScroll( 1, 0 );
		else if (code == LEFT_ARROW) this.page.onNudgeScroll( -1, 0 );
		else if (code == DOWN_ARROW) this.page.onNudgeScroll( 0, 1 );
		else if (code == UP_ARROW) this.page.onNudgeScroll( 0, -1 );
	}
} );
