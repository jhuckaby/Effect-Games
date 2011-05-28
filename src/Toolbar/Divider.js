// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Toolbar.Icon.extend( 'Toolbar.Icon.Divider', {
	
	width: 8,
	
	init: function(_toolbar, _x) {
		this._toolbar = _toolbar;
		this.div = document.createElement('div');
		this.style = this.div.style;
		this.style.position = 'absolute';
		this.style.left = '' + _x + 'px';
		this.style.top = '-0px';
		this.style.width = '8px';
		this.style.height = '24px';
		
		this._toolbar._set_div_image( this.div, gGame._homePath + 'images/engine/toolbar/divider.png', 8, 24);
	}
	
});
