// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Toolbar.Icon.extend( 'Toolbar.Icon.Sound', {
	
	clip_x: 7 * 24,
	title: 'Toggle Sound',
	
	onClick: function() {
		if (gGame._game_prefs.sound == 1) {
			// disable sound
			Debug.trace('toolbar', "Disabling sound");
			gAudio.quiet();
			gAudio.enabled = false;
			Effect.VideoManager._update_volume();
			this.clip_x = 8 * 24;
			gGame._game_prefs.sound = 0;
			gGame.fireHandler('onDisableSound');
		}
		else if (!gAudio.fatal) {
			// enable sound
			Debug.trace('toolbar', "Enabling sound");
			gAudio.enabled = true;
			Effect.VideoManager._update_volume();
			this.clip_x = 7 * 24;
			gGame._game_prefs.sound = 1;
			gGame.fireHandler('onEnableSound');
			if (gGame._game_prefs.music == 1) gGame.fireHandler('onEnableMusic');
		}
		this.refresh();
		gGame._cookie.save();
	},
	
	audioloaderror: function() {
		// audio failed to load, disable icon?
		this.clip_x = 8 * 24;
		this.refresh();
	},
	
	update: function() {
		if ((gGame._game_prefs.sound == 1) && !gAudio.fatal) this.clip_x = 7 * 24;
		else this.clip_x = 8 * 24;
		this.refresh();
	}
	
} );
