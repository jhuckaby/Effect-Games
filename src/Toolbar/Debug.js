// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Toolbar.Icon.extend( 'Toolbar.Icon.Debug', {
	
	clip_x: 10 * 24,
	title: 'Open Debugger',
	
	onClick: function() {
		Debug.show();
	}
	
} );
