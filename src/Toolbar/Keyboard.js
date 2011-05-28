// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Toolbar.Icon.extend( 'Toolbar.Icon.Keyboard', {
	
	clip_x: 4 * 24,
	title: 'Set Controls',
	
	_get_pkeys: function() {
		// convert game keys into "serializable" format for storing in cookie
		// or saving for restore if dialog is cancelled
		var _pkeys = {};
		for (var _key in gGame.keys) {
			_pkeys[_key] = _deep_copy_object( gGame.keys[_key].code );
		}
		return _pkeys;
	},
	
	onClick: function() {
		this._save_codes = this._get_pkeys();
		
		var _zPortHeight = gPort.portHeight * gPort._zoomLevel;
		var _dlg_border_height = this._toolbar._is_dialog_border_enabled() ? (24 + 24 + 15 + 10) : 0;
		
		var _html = '';
		
		var _clr_name = (this._toolbar.theme == 'dark') ? 'white' : 'black';
		var _rev_clr = (this._toolbar.theme == 'dark') ? 'black' : 'white';
		
		var _keydefs = _always_array( gGame._def.Keys.Key );
		
		var _max_height = (_zPortHeight - _dlg_border_height) - (42 + 55 + 8);
		var _overflow = ((_keydefs.length * 24) >= _max_height);
		
		if (_overflow) _html += '<div style="height:'+_max_height+'px; overflow-x:hidden; overflow-y:auto;">';
		
		_html += '<table width="256" cellspacing="0" cellpadding="0">';
		for (var _idx = 0, _len = _keydefs.length; _idx < _len; _idx++) {
			var _keydef = _keydefs[_idx];
			_html += '<tr>';
			_html += '<td align="right"><div style="padding:5px 15px 5px 5px; font-family:arial,sans-serif; font-size:12px; font-weight:bold; opacity:0.75; cursor:default; text-shadow:'+_rev_clr+' 0px 0px 2px;"><nobr>'+_keydef.Title+':</nobr></div></td>';
			_html += '<td align="left"><div id="d_key_'+_keydef.Name+'" style="padding:5px; font-family:courier,monospace; font-size:12px; font-weight:bold; cursor:pointer; border:1px solid transparent; text-shadow:'+_rev_clr+' 0px 0px 2px;" onMouseOver="this.style.border=\'1px solid '+_clr_name+'\';" onMouseOut="this.style.border=\'1px solid transparent\';" onClick="gToolbar._dialogHandler._edit_key(\''+_keydef.Name+'\')">';
			
			var _codes = gGame.keys[ _keydef.Name ].code;
			var _nices = [];
			for (var _idy = 0, _ley = _codes.length; _idy < _ley; _idy++) {
				_nices.push( gGame._getNiceKeyName(_codes[_idy]) );
			}
			_html += _nices.join(', ');
			
			_html += '</div></td>';
			_html += '</tr>';
		}
		_html += '</table>';
		
		if (_overflow) _html += '</div>';
		
		_html += '<div style="height:20px;"></div>';
		
		_html += '<table cellspacing="0" cellpadding="0"><tr>';
		_html += '<td><div style="width:10px;"></div></td>';
		_html += '<td>' + this._toolbar._dialog_button('arrow_turn_left.png', 'Cancel', "_do_cancel()") + '</td>';
		_html += '<td><div style="width:30px;"></div></td>';
		_html += '<td>' + this._toolbar._dialog_button('accept.png', '<b>Save</b>', "_do_save()") + '</td>';
		_html += '<td><div style="width:10px;"></div></td>';
		_html += '</tr></table>';
				
		this._toolbar._show_dialog(this, 0, _html);
	},
	
	_edit_key: function(_id) {
		// show dialog to edit single key def
		var _keydef = this._keydef = _find_object( _always_array(gGame._def.Keys.Key), { Name: _id } );
		this._codes = _deep_copy_object( gGame.keys[ _keydef.Name ].code );
		
		var _clr_name = (this._toolbar.theme == 'dark') ? 'white' : 'black';
		var _html = '';
		
		_html += '<div style="cursor:default; font-family:arial,sans-serif; font-size:16px; font-weight:bold; text-align:center; color:'+_clr_name+'; opacity:0.75;">'+_keydef.Title+'</div>';
		
		_html += '<div id="d_key_codes" style="width:200px; height:70px; border:1px solid '+_clr_name+'; margin:10px 0px 5px 0px; padding:5px; overflow-x:hidden; overflow-y:auto;">' + this._render_edit_key_codes() + '</div>';
		
		_html += '<div style="cursor:default; width:200px; font-family:arial,sans-serif; font-size:11px; text-align:left; color:'+_clr_name+'; opacity:0.75;">Press keys to assign to the control (up to five).  Click on keys to remove them.</div>';
		
		_html += '<div style="height:15px;"></div>';
		
		_html += '<table cellspacing="0" cellpadding="0"><tr>';
		_html += '<td><div style="width:10px;"></div></td>';
		_html += '<td>' + this._toolbar._dialog_button('arrow_turn_left.png', 'Cancel', "_do_cancel_edit()") + '</td>';
		_html += '<td><div style="width:30px;"></div></td>';
		_html += '<td>' + this._toolbar._dialog_button('accept.png', '<b>OK</b>', "_do_set_key()") + '</td>';
		_html += '<td><div style="width:10px;"></div></td>';
		_html += '</tr></table>';
				
		this._toolbar._show_dialog(this, 0, _html);
		
		// hook keyboard
		gGame.setHandler( 'keyintercept', [this, '_add_key_code'] );
		gGame._keysActive = true;
	},
	
	_render_edit_key_codes: function() {
		// compose HTML for editing key codes on one keydef
		var _clr_name = (this._toolbar.theme == 'dark') ? 'white' : 'black';
		var _html = '';
		
		for (var _idx = 0, _len = this._codes.length; _idx < _len; _idx++) {
			var _code = this._codes[_idx];
			_html += '<div style="float:left; padding:5px; margin:4px; border:1px solid '+_clr_name+';cursor:pointer; opacity:0.75; font-family:courier,monospace; font-size:12px; font-weight:bold; color:'+_clr_name+';" onClick="gToolbar._dialogHandler._remove_key_code('+_idx+')" onMouseOver="this.style.opacity=1.0;" onMouseOut="this.style.opacity=0.75;">' + gGame._getNiceKeyName(_code) + '</div>';
		} // foreach code
		
		_html += '<div style="clear:both;"></div>';
		return _html;
	},
	
	_add_key_code: function(e, _code) {
		// capture key down and add key
		if ((this._codes.length < 5) && !_find_in_array(this._codes, _code)) {
			this._codes.push( _code );
			el('d_key_codes').innerHTML = this._render_edit_key_codes();
		}
		return false; // stop event
	},
	
	_remove_key_code: function(_idx) {
		// remove one key from the list
		this._codes.splice( _idx, 1 );
		el('d_key_codes').innerHTML = this._render_edit_key_codes();
	},
	
	_do_cancel_edit: function() {
		// cancel keydef edit and return to main key display
		delete this._keydef;
		delete this._codes;
		gGame._keysActive = false;
		delete gGame.handlers.keyintercept;
		this.onClick();
	},
	
	_do_set_key: function() {
		// commit changes to key
		gGame.keys[ this._keydef.Name ].code = this._codes;
		this._do_cancel_edit();
	},
	
	_do_cancel: function() {
		// cancel key dialog, return to game
		if (this._keydef) {
			// unhook keyboard
			gGame._keysActive = false;
			delete gGame.handlers.keyintercept;
			delete this._keydef;
			delete this._codes;
		}
		
		// restore keys before user started editing
		for (var _key in gGame.keys) {
			gGame.keys[_key].code = this._save_codes[_key];
		}
		delete this._save_codes;
		
		this._toolbar._hide_dialog();
	},
	
	_do_save: function() {
		// save keydef changes to cookie
		// TODO: if user is logged in, save to profile?
		gGame._game_prefs.keys = this._get_pkeys();
		gGame._cookie.save();
		delete this._save_codes;
		this._toolbar._hide_dialog();
	},
	
	_shutdown: function() {
		// called by Toolbar._hide_dialog()
		if (this._keydef) {
			// unhook keyboard
			gGame._keysActive = false;
			delete gGame.handlers.keyintercept;
			delete this._keydef;
			delete this._codes;
		}
	}
	
} );
