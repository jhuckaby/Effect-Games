// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Toolbar.Icon.extend( 'Toolbar.Icon.PlayPause', {
	
	clip_x: 0,
	title: 'Play/Pause',
	
	onClick: function() {
		gGame.toggle();
	},
	pause: function() {
		// game is now paused, so show play icon
		this.clip_x = 0;
		this.refresh();
		this._toolbar._show_msg(1, false);
		this._toolbar._show_pause_splash();
	},
	resume: function() {
		// game is running, so show pause icon
		this.clip_x = 24;
		this.refresh();
		this._toolbar._hide_msg(false);
		if (this._toolbar._dialogActive) this._toolbar._hide_dialog();
	},
	
	logic: function() {
		// game is obviously running, so show pause
		if (this.clip_x == 0) this.resume();
	}
	
} );
