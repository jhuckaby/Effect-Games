// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Toolbar.Icon.extend( 'Toolbar.Icon.Home', {
	
	clip_x: 3 * 24,
	title: 'Play on EffectGames.com',
	
	onClick: function() {
		var _game_url = gGame._homePath + 'games/' + gGame.id + '/' + gGame._query.rev;
		window.open( _game_url );
		
		if (gGame.inGame) gGame.pause();
	}
	
} );
