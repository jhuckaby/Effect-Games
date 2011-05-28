// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Toolbar.Icon.extend( 'Toolbar.Icon.Music', {
	
	clip_x: 5 * 24,
	title: 'Toggle Music',
	
	onClick: function() {
		if (gGame._game_prefs.music == 1) {
			// disable music
			Debug.trace('toolbar', "Disabling music");
			gAudio.quietCategory('music');
			gAudio._categorySettings['music'].enabled = false;
			this.clip_x = 6 * 24;
			gGame._game_prefs.music = 0;
			gGame.fireHandler('onDisableMusic');
		}
		else {
			// enable music
			Debug.trace('toolbar', "Enabling music");
			gAudio._categorySettings['music'].enabled = true;
			this.clip_x = 5 * 24;
			gGame._game_prefs.music = 1;
			if (gGame.inGame) gGame.fireHandler('onEnableMusic');
		}
		this.refresh();
		gGame._cookie.save();
	},
	
	update: function() {
		if (gGame._game_prefs.music == 1) this.clip_x = 5 * 24;
		else this.clip_x = 6 * 24;
		this.refresh();
	}
	
} );
