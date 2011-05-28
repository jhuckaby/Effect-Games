// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Toolbar.Icon.extend( 'Toolbar.Icon.Share', {
	
	clip_x: 2 * 24,
	title: 'Share Game',
	
	onClick: function() {
		var _html = '';
		
		var _game_url = gGame._homePath + 'api/gf/' + gGame.id + '/' + gGame._query.rev;
		var _width = (parseInt(gGame._def.PortWidth, 10) * parseInt(gGame._def.ZoomDefault, 10));
		var _height = (parseInt(gGame._def.PortHeight, 10) * parseInt(gGame._def.ZoomDefault, 10)) + 24;
		var _embed_html = '<iframe src="'+_game_url+'" style="width:'+_width+'px; height:'+_height+'px; margin:0; padding:0;" frameborder="0" scrolling="no"></iframe>';
		
		var _clr_name = (this._toolbar.theme == 'dark') ? 'white' : 'black';
		var _cstyle = 'font-family:arial,sans-serif; font-size:10px; opacity:0.75; color:'+_clr_name+'; cursor:default;';
		var _dialog_dir = gGame._homePath + 'images/engine/dialog';
		
		var _zPortWidth = gPort.portWidth * gPort._zoomLevel;
		var _ta_width = (_zPortWidth < 640) ? ((_zPortWidth < 480) ? 150 : 214) : 320;
		var _fb_width = (_zPortWidth < 480) ? 64 : 128;
		var _lp_width = (_zPortWidth < 320) ? 0 : 10;
		
		_html += '<div style="margin-left:'+_lp_width+'px;">';
		_html += '<table cellspacing="0" cellpadding="0">';
			_html += '<tr>';
				_html += '<td align="left" valign="top">';
					_html += '<div style="'+_cstyle+' margin-bottom:5px; width:'+_ta_width+'px;">Paste this HTML into your website or blog:</div>';
					_html += '<form style="margin:0; padding:0;"><textarea style="width:'+_ta_width+'px; height:64px; outline:0; font-family:courier,monospace; font-size:11px; color:'+_clr_name+'; background-color:transparent; border:1px dashed '+_clr_name+'; word-break:break-all; opacity:0.75;" wrap="virtual" onkeyup="return _stop_textarea_key_event(event)" onkeydown="return _stop_textarea_key_event(event)" onClick="_select_all_text(this)">' + _encode_entities(_embed_html) + '</textarea></form>';
				_html += '</td>';
				_html += '<td>';
					_html += '<div style="width:10px;"></div>';
				_html += '</td>';
				_html += '<td align="center" valign="top">';
					_html += '<div style="'+_cstyle+' margin-bottom:5px; width:'+_fb_width+'px;">Or, click to share it on:</div>';
					_html += '<div><img src="'+_dialog_dir+'/facebook-logo.gif" width="64" height="24" style="cursor:pointer; border:1px solid transparent;" onClick="gToolbar._dialogHandler._share_on_facebook()" onMouseOver="this.style.border=\'1px solid '+_clr_name+'\';" onMouseOut="this.style.border=\'1px solid transparent\';"/></div>';
					_html += '<div style="height:16px;"></div>';
					_html += '<div><img src="'+_dialog_dir+'/twitter-logo.'+(ua.ie6 ? 'gif' : 'png')+'" width="64" height="24" style="cursor:pointer; border:1px solid transparent;" onClick="gToolbar._dialogHandler._share_on_twitter()" onMouseOver="this.style.border=\'1px solid '+_clr_name+'\';" onMouseOut="this.style.border=\'1px solid transparent\';"/></div>';
				_html += '</td>';
			_html += '</tr>';
		_html += '</table>';
		_html += '</div>';
		
		_html += '<div style="height:20px;"></div>';
		
		_html += '<table cellspacing="0" cellpadding="0"><tr>';
		_html += '<td><div style="width:10px;"></div></td>';
		_html += '<td>' + this._toolbar._dialog_button('arrow_turn_left.png', 'Back', "_do_cancel()") + '</td>';
		// _html += '<td><div style="width:30px;"></div></td>';
		// _html += '<td>' + this._toolbar._dialog_button('accept.png', '<b>Save</b>', "_do_save()") + '</td>';
		_html += '<td><div style="width:10px;"></div></td>';
		_html += '</tr></table>';
		
		this._toolbar._show_dialog(this, 1, _html);
	},
	
	_share_on_facebook: function() {
		var _game_url = gGame._homePath + 'games/' + gGame.id + '/' + gGame._query.rev;
		window.open(
			'http://www.facebook.com/sharer.php?u='+encodeURIComponent(_game_url)+'&t='+encodeURIComponent(gGame._def.Title),
			'sharer','toolbar=0,status=0,width=626,height=436');
	},
	
	_share_on_twitter: function() {
		var _game_url = gGame._homePath + 'games/' + gGame.id + '/' + gGame._query.rev;
		var _text = 'Playing ' + gGame._def.Title + ' on EffectGames.com: ' + _game_url;
		window.open( 'http://twitter.com/home?status=' + encodeURIComponent(_text) );
	},
	
	_do_cancel: function() {
		// cancel dialog, return to game
		this._toolbar._hide_dialog();
	}
	
} );
