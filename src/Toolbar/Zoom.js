// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Toolbar.Icon.extend( 'Toolbar.Icon.Zoom', {
	
	clip_x: 9 * 24,
	title: 'Toggle Zoom',
	
	onClick: function(e) {
		if (gGame.changingZoom) return;
		if (this._toolbar._dialogActive) this._toolbar._hide_dialog( true || 'no_splash' );
		
		Debug.trace('toolbar', 'Zooming');
		
		var _old_zoom = Effect.Port.getZoomLevel();
		var _width = Effect.Port.portWidth;
		var _height = Effect.Port.portHeight;
		Debug.trace('toolbar', "Current zoom: " + _old_zoom + "X (" + Math.floor(_width * _old_zoom) + 'x' + Math.floor(_height * _old_zoom) + ")");
		
		var _max_width = screen.availWidth;
		var _max_height = screen.availHeight;
		Debug.trace('toolbar', "Screen max avail size: " + _max_width + 'x' + _max_height);
		
		var _max_level_x = Math.floor( _max_width / _width );
		var _max_level_y = Math.floor( _max_height / _height );
		var _max_level = Math.min( _max_level_x, _max_level_y );
		if (!_max_level) _max_level = 1;
		Debug.trace('toolbar', "Max zoom level: " + _max_level);
		
		var _zoom = (e.altKey || e.shiftKey || e.metaKey) ? (_old_zoom - 1) : (_old_zoom + 1);
		if (_zoom < 1) _zoom = Math.min(_max_level, 4);
		if (_zoom > Math.min(_max_level, 4)) _zoom = 1;
		
		if (_zoom != _old_zoom) {
			// resize window, if needed
			var _zWidth = (_width * _zoom) + 100; // some padding
			var _zHeight = (_height * _zoom) + 120;
			var _doc_size = _getInnerWindowSize();
			
			Debug.trace('toolbar', "Zooming to level " + _zoom + 'X');
			Debug.trace('toolbar', "Current inner window size: " + _doc_size.width + 'x' + _doc_size.height);
			
			if ((_zWidth > _doc_size.width) || (_zHeight > _doc_size.height)) {
				var _new_window_width = Math.min( Math.max(_zWidth, _doc_size.width), _max_width );
				var _new_window_height = Math.min( Math.max(_zHeight, _doc_size.height), _max_height );
				Debug.trace('toolbar', "Resizing window to: " + _new_window_width + 'x' + _new_window_height);
				
				if (window.resizeTo) {
					window.resizeTo( _new_window_width, _new_window_height );
				}
				else if (window.outerWidth) {
					window.outerWidth = _new_window_width;
					window.outerHeight = _new_window_height;
				}
			}
			
			// save new zoom level in cookie
			gGame._game_prefs.zoom = _zoom;
			gGame._cookie.save();
			
			el('et_icon_shelf').hide();
			gGame.changeZoomLevel(_zoom);
		} // change zoom level
	}
	
} );
