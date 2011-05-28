// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// Toolbar.js
////

function _Toolbar() {
	// class constructor
};

_Toolbar.prototype._init = function() {
	// setup toolbar
	
	// effect_container
	// effect_port
	// effect_toolbar
	// et_left_border
	// et_logo
	// et_right_border
	
	// et_loading_bar
	// et_lb_divider
	// et_lb_outer
	// et_lb_inner
	// et_lb_inner_under
	// et_lb_inner_over
	
	// et_icon_shelf
	// et_is_divider
		
	this._icons = [];
	
	// this._toolbar = el('effect_toolbar');
	// this._logo =  el('et_logo');
	// this._loading_bar = el('et_loading_bar');
	// this._loading_bar_over = el('et_lb_inner_over');
	// this._icon_shelf = el('et_icon_shelf');
	// this._msg_area = el('et_msgs');
	
	this.setColor( gGame._def.ToolbarColor );
	
	var _toolbar_width = el('effect_port').offsetWidth;
	
	var _tdiv = el('effect_toolbar');
	_tdiv.style.width = '' + _toolbar_width + 'px';
	
	// this._set_div_image('effect_toolbar', gGame._homePath + 'images/engine/toolbar/background.png');
	// setup toolbar background
	if (ua.ie6) {
		_tdiv.innerHTML += "<div id=\"effect_toolbar_ie6span\""
			+ " style=\"" + "width:" + _tdiv.offsetWidth + "px; height:" + _tdiv.offsetHeight + "px;"
			+ "filter:progid:DXImageTransform.Microsoft.AlphaImageLoader"
			+ "(src=\'" + gGame._homePath + 'images/engine/toolbar/background.png' + "\', sizingMethod='scale'); position:absolute; left:0px; top:0px;\"></div>";
	}
	else {
		_tdiv.style.backgroundImage = 'url('+gGame._homePath + 'images/engine/toolbar/background.png'+')';
	}
	
	this._set_div_image('et_left_border', gGame._homePath + 'images/engine/toolbar/border-left.png');
	this._set_div_image('et_right_border', gGame._homePath + 'images/engine/toolbar/border-right.png');
	this._set_div_image('et_lb_divider', gGame._homePath + 'images/engine/toolbar/divider.png');
	// this._set_div_image('et_is_divider', gGame._homePath + 'images/engine/toolbar/divider.png');
	this._set_div_image('et_logo', gGame._homePath + 'images/engine/toolbar/logo.png');
	this._set_div_image('et_msgs', gGame._homePath + 'images/engine/toolbar/msgs.png', 84, 48);
	
	this._logo_state = 'out';
	this._logo_width = 160;
	var _self = this;
	var _logod = el('et_logo');
	
	_logod.onmouseover = function() {
		var _logo_yoffset = 0;
		var _y = _logo_yoffset + 24;
		_self._logo_state = 'over';
		this.style.clip = 'rect('+_y+'px '+_self._logo_width+'px '+Math.floor(_y + 24)+'px 0px)';
		this.style.top = '' + Math.floor(0 - _y) + 'px';
	};
	_logod.onmouseout = function() {
		var _logo_yoffset = 0;
		var _y = _logo_yoffset;
		_self._logo_state = 'out';
		this.style.clip = 'rect('+_y+'px '+_self._logo_width+'px '+Math.floor(_y + 24)+'px 0px)';
		this.style.top = '' + Math.floor(0 - _y) + 'px';
	};
	_logod.onclick = function() {
		window.open('http://www.effectgames.com/');
		if (gGame.inGame) gGame.pause();
	};
	
	el('et_loading_bar').style.left = '' + Math.floor(_toolbar_width - 120) + 'px';
	
	this._set_div_image('et_lb_inner_under', gGame._homePath + 'images/engine/toolbar/loading-under.png');
	this._set_div_image('et_lb_inner_over', gGame._homePath + 'images/engine/toolbar/loading-over.png');
	
	el('et_lb_inner_under').style.backgroundColor = this._clr_hex;
	el('et_lb_inner_over').style.backgroundColor = '#777777';
	
	// construct icon tray
	this._icon_x = 0;
	
	if (!gGame.fireHandler('onBeforeToolbarIconInit', this)) return;
	
	this.addIcon( new Toolbar.Icon.Divider() );
	
	this.addIcon( new Toolbar.Icon.PlayPause() );
	
	if ((gGame._query.mode != 'dev') && (gGame._query.revpwd != 1) && (gGame._def.DisableSharing != 1)) {
		this.addIcon( new Toolbar.Icon.Share() );
	}
	
	if (gGame._iframe) {
		this.addIcon( new Toolbar.Icon.Home() );
	}
	
	if (_num_keys(gGame.keys)) {
		this.addIcon( new Toolbar.Icon.Keyboard() );
	}
	
	var _has_music = false;
	if (gGame._def.Sounds && gGame._def.Sounds.Sound) {
		for (var _idx = 0, _len = gGame._def.Sounds.Sound.length; _idx < _len; _idx++) {
			var _sound = gGame._def.Sounds.Sound[_idx];
			if (_sound.Category == 'music') { _has_music = true; _idx = _len; }
		}
	}
	if (gAudio.enabled && _has_music) {
		this.addIcon( new Toolbar.Icon.Music() );
	}
	
	if (gAudio.enabled && gGame._def.Sounds && gGame._def.Sounds.Sound && gGame._def.Sounds.Sound.length) {
		this.addIcon( new Toolbar.Icon.Sound() );
	}
	
	if ((gGame._def.Zoom == 'Yes') && !gGame._iframe && this._zoom_is_possible()) {
		this.addIcon( new Toolbar.Icon.Zoom() );
	}
	
	if (Debug.enabled) {
		this.addIcon( new Toolbar.Icon.Debug() );
	}
	
	gGame.fireHandler('onAfterToolbarIconInit', this);
	
	// preload some dialog images, no need to explicitly wait for them
	var _dialog_dir = gGame._homePath + 'images/engine/dialog';
	this._preload_images = [
		_dialog_dir + '/titles.png',
		_dialog_dir + '/loading-' + this.theme + '.gif',
		_dialog_dir + '/top-left-dark.png',
		_dialog_dir + '/top-dark.png',
		_dialog_dir + '/top-right-dark.png',
		_dialog_dir + '/right-dark.png',
		_dialog_dir + '/bottom-right-dark.png',
		_dialog_dir + '/bottom-dark.png',
		_dialog_dir + '/bottom-left-dark.png',
		_dialog_dir + '/left-dark.png',
		_dialog_dir + '/growl-icons.png'
	];
	for (var _idx = 0, _len = this._preload_images.length; _idx < _len; _idx++) {
		var _url = this._preload_images[_idx];
		this._preload_images[_idx] = new Image();
		this._preload_images[_idx].src = _url;
	}
	
	// growl settings
	this._growl_width = 256;
	this._growl_height = 52;
	this._growl_pos = 'south';
	this._growl_timer = null;
	this._growl_max_frames = 30;
	this._growl_lifetime = 6 * 1000;
};

_Toolbar.prototype._zoom_is_possible = function() {
	// return true if zoom is possible given port size and screen size, false if no
	var _old_zoom = Effect.Port.getZoomLevel();
	var _width = Effect.Port.portWidth;
	var _height = Effect.Port.portHeight;
	
	var _max_width = screen.availWidth;
	var _max_height = screen.availHeight;
	
	var _max_level_x = Math.floor( _max_width / _width );
	var _max_level_y = Math.floor( _max_height / _height );
	var _max_level = Math.min( _max_level_x, _max_level_y );
	if (!_max_level) _max_level = 1;
	
	var _zoom = _old_zoom + 1;
	if (_zoom > Math.min(_max_level, 4)) _zoom = 1;
	
	if (_zoom != _old_zoom) return true;
	else return false;
};

_Toolbar.prototype._animate_msg = function() {
	// animate message in or out
	this._msg_anim_enabled = true;
	var _shelf_width = (this._mode == 'loading') ? el('et_loading_bar').offsetWidth : this._icon_x;
	var _toolbar_width = el('effect_toolbar').offsetWidth;
	var _offset_x = 0;
	var _vis_left = Math.floor(((_toolbar_width - _shelf_width) - 4) - 84);
	
	var _msg_area = el('et_msgs');
	_msg_area.style.left = '' + Math.floor((_vis_left - _offset_x) + this._msg_anim_frame) + 'px';
	_msg_area.style.top = '' + Math.floor(0 - (this._msg_idx * 24)) + 'px';
	_msg_area.style.clip = 'rect('+Math.floor(this._msg_idx * 24)+'px '+Math.floor((_offset_x+84) - this._msg_anim_frame)+'px '+Math.floor((this._msg_idx+1)*24)+'px '+Math.floor(_offset_x)+'px)';
	
	this._msg_anim_frame += ((this._msg_anim_target - this._msg_anim_frame) / 6);
	if (Math.abs(this._msg_anim_target - this._msg_anim_frame) < 1.0) {
		// we're done
		if (this._msg_anim_target == 84) {
			_msg_area.hide();
			this._msg_visible = false;
		}
		this._msg_anim_enabled = false;
	}
	else {
		// keep animating
		setTimeout( 'gToolbar._animate_msg();', 33 );
	}
};

_Toolbar.prototype._show_msg = function(_idx, _instant) {
	// show message in area
	// debugstr("in toolbar _show_msg(" + _idx + ', ' + (_instant ? 'true' : 'false') + ")");
	this._msg_idx = _idx;
	
	var _shelf_width = (this._mode == 'loading') ? el('et_loading_bar').offsetWidth : this._icon_x;
	var _toolbar_width = el('effect_toolbar').offsetWidth;
	var _offset_x = 0;
	
	var _vis_left = Math.floor(((_toolbar_width - _shelf_width) - 4) - 84);
	var _logod = el('et_logo');
	var _logo_right = _logod.offsetLeft + _logod.offsetWidth;
	if (_vis_left <= _logo_right) return false; // runs into logo, do not show
	
	if (typeof(this._msg_anim_frame) == 'undefined') this._msg_anim_frame = 84;
	this._msg_anim_target = 0;
	this._msg_visible = true;
	
	var _msg_area = el('et_msgs');
	
	if (_instant) {
		_msg_area.style.left = '' + Math.floor(_vis_left - _offset_x) + 'px';
		_msg_area.style.top = '' + Math.floor(0 - (this._msg_idx * 24)) + 'px';
		_msg_area.style.clip = 'rect('+Math.floor(this._msg_idx * 24)+'px '+Math.floor(_offset_x+84)+'px '+Math.floor((this._msg_idx+1)*24)+'px '+Math.floor(_offset_x)+'px)';
	}
	else {
		this._animate_msg();
	}
	
	_msg_area.show();
	
	return true;
};

_Toolbar.prototype._hide_msg = function(_instant) {
	// hide message area
	// debugstr("in toolbar _hide_msg(" + (_instant ? 'true' : 'false') + ")");
	if (this._msg_visible) {
		if (_instant) {
			el('et_msgs').hide();
			this._msg_visible = false;
		}
		else {
			if (typeof(this._msg_anim_frame) == 'undefined') this._msg_anim_frame = 0;
			this._msg_anim_target = 84;
			this._animate_msg();
		}
	}
};

_Toolbar.prototype.setColor = function(_clr_hex) {
	// set toolbar theme color
	this._clr_hex = _clr_hex;
	this._clr = _HEX2RGB(this._clr_hex);
	
	var _avg = (this._clr.r + this._clr.g + this._clr.b) / 3;
	this.theme = (_avg > 128) ? 'light' : 'dark';
	
	el('effect_toolbar').style.backgroundColor = this._clr_hex;
	
	var _logo_yoffset = (this.theme == 'light') ? 48 : 0;
	var _logod = el('et_logo');
	_logod.style.clip = 'rect('+_logo_yoffset+'px 160px '+Math.floor(_logo_yoffset + 24)+'px 0px)';
	_logod.style.top = '' + Math.floor(0 - _logo_yoffset) + 'px';
};

_Toolbar.prototype._update_width = function(_toolbar_width) {
	// update toolbar width, called when port resizes
	if (!_toolbar_width) _toolbar_width = el('effect_port').offsetWidth;
	el('effect_toolbar').style.width = '' + _toolbar_width + 'px';
	
	// right-align loading bar and icon shelf
	el('et_loading_bar').style.left = '' + Math.floor(_toolbar_width - 120) + 'px';
	el('et_icon_shelf').style.left = '' + Math.floor((_toolbar_width - this._icon_x) - 4) + 'px';
	
	// show minimized or maximized logo depending on available width
	var _logod = el('et_logo');
	if (_toolbar_width - this._icon_x >= 160) {
		this._logo_width = 160;
		_logod.style.width = '160px';
	}
	else {
		this._logo_width = 32;
		_logod.style.width = '32px';
	}
	if (this._logo_state == 'over') _logod.onmouseover();
	else _logod.onmouseout();
	
	if (this._msg_visible && !this._msg_anim_enabled) {
		this._show_msg(this._msg_idx, true);
	}
	
	if (ua.ie6) {
		var _span = el('effect_toolbar_ie6span');
		if (_span) {
			_span.style.width = '' + _toolbar_width + 'px';
		}
	}
};

_Toolbar.prototype.addIcon = function(_icon) {
	// add icon to shelf
	_icon.init( this, this._icon_x );
	
	el('et_icon_shelf').appendChild(_icon.div);
	
	this._icons.push(_icon);
	
	this._icon_x += _icon.width;
	
	var _shelf_width = this._icon_x;
	var _toolbar_width = el('effect_toolbar').offsetWidth;
	
	el('et_icon_shelf').style.width = '' + _shelf_width + 'px';
	el('et_icon_shelf').style.left = '' + Math.floor((_toolbar_width - _shelf_width) - 4) + 'px';
};

_Toolbar.prototype._update = function() {
	// update all icons
	for (var _idx = 0, _len = this._icons.length; _idx < _len; _idx++) {
		this._icons[_idx].update();
	}
};

_Toolbar.prototype.logic = function() {
	// delegate to all icons
	for (var _idx = 0, _len = this._icons.length; _idx < _len; _idx++) {
		this._icons[_idx].logic();
	}
};

_Toolbar.prototype.draw = function() {
	// delegate to all icons
	for (var _idx = 0, _len = this._icons.length; _idx < _len; _idx++) {
		this._icons[_idx].draw();
	}
};

_Toolbar.prototype.pause = function() {
	// delegate to all icons
	for (var _idx = 0, _len = this._icons.length; _idx < _len; _idx++) {
		this._icons[_idx].pause();
	}
};

_Toolbar.prototype.resume = function() {
	// delegate to all icons
	for (var _idx = 0, _len = this._icons.length; _idx < _len; _idx++) {
		this._icons[_idx].resume();
	}
};

_Toolbar.prototype.audioloaderror = function() {
	// delegate to all icons
	for (var _idx = 0, _len = this._icons.length; _idx < _len; _idx++) {
		if (this._icons[_idx].audioloaderror) {
			this._icons[_idx].audioloaderror();
		}
	}
};

_Toolbar.prototype.login = function(_user) {
	// delegate to all icons
	for (var _idx = 0, _len = this._icons.length; _idx < _len; _idx++) {
		if (this._icons[_idx].login) {
			this._icons[_idx].login(_user);
		}
	}
};

_Toolbar.prototype.loginfail = function(_response) {
	// delegate to all icons
	for (var _idx = 0, _len = this._icons.length; _idx < _len; _idx++) {
		if (this._icons[_idx].loginfail) {
			this._icons[_idx].loginfail(_response);
		}
	}
};

_Toolbar.prototype.logout = function(_user) {
	// delegate to all icons
	for (var _idx = 0, _len = this._icons.length; _idx < _len; _idx++) {
		if (this._icons[_idx].logout) {
			this._icons[_idx].logout(_user);
		}
	}
};

_Toolbar.prototype._set_div_image = function(_id, _url, _width, _height) {
	// set div background, supporting IE 6
	var _div = (typeof(_id) == 'string') ? el(_id) : _id;
	
	// debugstr("in _Toolbar._set_div_image");
	
	if (!_width) _width = _div.offsetWidth;
	if (!_height) _height = _div.offsetHeight;
	
	if (ua.ie6 && _url.match(/\.png(\?|$)/i)) {
		// var _temp = (typeof(_id) == 'string') ? ('id="'+_id+'_ie6span"') : '';
		var _html = "<div "
			+ " style=\"" + "width:" + _width + "px; height:" + _height + "px;"
			+ "filter:progid:DXImageTransform.Microsoft.AlphaImageLoader"
			+ "(src=\'" + _url + "\', sizingMethod='scale');\"></div>";
		
		// debugstr("IE6 crap: " + _html );
		
		_div.innerHTML = _html;
	}
	else {
		_div.style.backgroundImage = 'url('+_url+')';
	}
};

_Toolbar.prototype._set_mode = function(_mode) {
	debugstr("setting toolbar mode: " + _mode);
	this._mode = _mode;
	switch (_mode) {
		case 'loading':
			el('et_loading_bar').show();
			el('et_icon_shelf').hide();
			this._show_msg(0, true);
			break;
		
		case 'icons':
			el('et_loading_bar').hide();
			el('et_icon_shelf').show();
			if (gGame.inGame || gGame._runAfterZoom) this._hide_msg(true);
			else this._show_msg(1, true);
			break;
	}
};

_Toolbar.prototype._set_loading_progress = function(_counter) {
	var _left = '-' + Math.floor( (1.0 - _counter) * 100 );
	el('et_lb_inner_over').style.left = '' + _left + 'px';
};

_Toolbar.prototype._dialog_image = function(_name, _width, _height, _opacity) {
	if (!_opacity) _opacity = "1.0";
	var _dialog_dir = gGame._homePath + 'images/engine/dialog';
	var _url = _dialog_dir + '/' + _name + '-dark' + '.png';
	// var _url = _dialog_dir + '/' + _name + '.png';
	
	if (ua.ie6 && _url.match(/\.png(\?|$)/i)) {
		return "<div "
			+ " style=\"" + "width:" + _width + "px; height:" + _height + "px;"
			+ "filter:progid:DXImageTransform.Microsoft.AlphaImageLoader"
			+ "(src=\'" + _url + "\', sizingMethod='scale');\"></div>";
	}
	else {
		return '<img src="'+_url+'" width="'+_width+'" height="'+_height+'" style="opacity:'+_opacity+';"/>';
	}
};

_Toolbar.prototype._growl_image = function(_idx) {
	// return HTML for growl image
	var _dialog_dir = gGame._homePath + 'images/engine/dialog';
	var _url = _dialog_dir + '/growl-icons.png';
	var _x = 0 - (_idx * 32);
	
	if (ua.ie6 && _url.match(/\.png(\?|$)/i)) {
		return '<div style="width:32px; height:32px; position:relative; overflow:hidden;"><div '
			+ " style=\"" + "position:absolute; left:"+_x+"px; top:0px; width:352px; height:32px;"
			+ "filter:progid:DXImageTransform.Microsoft.AlphaImageLoader"
			+ "(src=\'" + _url + "\', sizingMethod='scale');\"></div></div>";
	}
	else {
		return '<div style="width:32px; height:32px; background:url('+_url+') no-repeat '+_x+'px 0px;"></div>';
	}
};

/* _Toolbar.prototype._dialog_button = function(_icon, _label, _code) {
	var _clr_name = (this.theme == 'dark') ? 'white' : 'black';
	if (!_label) _label = '';
	if (!_code) _code = '';
	_code = 'gGame._toolbar._dialogHandler.' + _code;
	var _html = '';
	var _url = gGame._homePath + 'images/icons/' + _icon;
	_html += '<table cellspacing="0" cellpadding="0" style="cursor:pointer; border:1px solid #888; border-collapse:collapse; -moz-border-radius:4px; -webkit-border-radius:4px; border-radius:4px;" onMouseOver="this.style.border=\'1px solid '+_clr_name+'\';" onMouseOut="this.style.border=\'1px solid #888\';" onClick="'+_code+'"><tr>';
	_html += '<td width="16"><div style="padding:5px;"><img src="'+_url+'" width="16" height="16" border="0" title="'+_label+'"/></div></td>';
	if (_label) {
		_html += '<td><div style="padding:5px; font-family:arial,sans-serif; font-size:12px;">';
		_html += _label;
		_html += '</div></td>';
	}
	_html += '</tr></table>';
	return _html;
}; */

_Toolbar.prototype._dialog_button = function(_icon, _label, _code) {
	var _clr_name = 'white';
	if (!_label) _label = '';
	if (!_code) _code = '';
	_code = 'gToolbar._dialogHandler.' + _code;
	var _html = '';
	// _html += '<div style="cursor:pointer; width:80px; padding:5px; font-family:arial,sans-serif; font-size:12px; text-align:center; color:#888; border:1px solid #888;" onClick="'+_code+'" onMouseOver="this.style.border=\'1px solid white\';this.style.color=\'white\';" onMouseOut="this.style.border=\'1px solid #888\';this.style.color=\'#888\';">'+_label+'</div>';
	
	// _html += '<div style="cursor:pointer; width:80px; padding:5px; font-family:arial,sans-serif; font-size:12px; text-align:center; color:'+_clr_name+'; border:2px solid '+_clr_name+'; -moz-border-radius:5px; -webkit-border-radius:5px; opacity:0.6;" onClick="'+_code+'" onMouseOver="this.style.opacity=1.0;" onMouseOut="this.style.opacity=0.6;">'+_label+'</div>';
	
	_html += '<div class="effect_dialog_button" onClick="'+_code+'">'+_label+'</div>';
	
	return _html;
};

_Toolbar.prototype._is_dialog_border_enabled = function() {
	var _zPortWidth = gPort.portWidth * gPort._zoomLevel;
	var _zPortHeight = gPort.portHeight * gPort._zoomLevel;
	return ((_zPortWidth >= 256 + 48) && (_zPortHeight >= 240 + 48));
};

_Toolbar.prototype._dialog_bkgnd_style = function(_name) {
	var _dialog_dir = gGame._homePath + 'images/engine/dialog';
	var _suffix = '-dark';
	var _url = _dialog_dir+'/'+_name+_suffix+'.png';
	if (ua.ie6) return 'filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(src=\''+_url+'\', sizingMethod=\'scale\')';
	else return 'background-image:url('+_url+')';
};

_Toolbar.prototype._show_overlay = function(_overlay_opacity) {
	// animate overlay visible
	var _zoom = gGame.changingZoom ? gPort._oldZoomLevel : gPort._zoomLevel;
	var _zPortWidth = gPort.portWidth * _zoom;
	var _zPortHeight = gPort.portHeight * _zoom;
	
	if (!this._overlay) {
		this._overlay = el('effect_overlay');
		_set_opacity( this._overlay, 0 );
		this._overlay._opacity = 0;
	}
	this._overlay._target_opacity = _overlay_opacity || 0.75;
	
	this._overlay.style.display = 'block';
	this._overlay.style.width = '' + _zPortWidth + 'px';
	this._overlay.style.height = '' + _zPortHeight + 'px';
	// this._overlay.style.backgroundColor = this._clr_hex;
	this._overlay.style.backgroundColor = 'black';
	
	// animate overlay opacity
	if (ua.ie) {
		_set_opacity( this._overlay, this._overlay._target_opacity );
	}
	else {
		if (!this._overlay_timer) {
			this._overlay_timer = setTimeout( 'gToolbar._animate_overlay()', 33 );
		}
	}
};

_Toolbar.prototype._show_dialog = function(_handler, _title_idx, _inner_html, _disable_border, _overlay_opacity) {
	// show popup dialog
	if (typeof(this._saveInGame) == 'undefined') {
		this._saveInGame = gGame.inGame;
		if (gGame.inGame) gGame.pause();
	}
	
	var _zPortWidth = gPort.portWidth * gPort._zoomLevel;
	var _zPortHeight = gPort.portHeight * gPort._zoomLevel;
	
	this._dialog = el('effect_dialog');
	
	this._show_overlay( _overlay_opacity );
	
	var _title_url = gGame._homePath + 'images/engine/dialog/titles.png';
	var _title_html = '';
	var _title_x = 0;
	var _title_y = 0 - (_title_idx * 32);
	
	if (_title_idx > -1) {
		if (ua.ie6) {
			_title_html += '<div style="width:256px; height:32px; position:relative; overflow:hidden;">';
			_title_html += '<div style="width:512px; height:224px; position:absolute; left:'+_title_x+'px; top:'+_title_y+'px;">';
			_title_html += "<div "
				+ " style=\"" + "width:512px; height:192px;"
				+ "filter:progid:DXImageTransform.Microsoft.AlphaImageLoader"
				+ "(src=\'" + _title_url + "\', sizingMethod='scale');\"></div>";
			_title_html += '</div>';
			_title_html += '</div>';
		}
		else {
			_title_html += '<div style="width:256px; height:32px; background:url('+_title_url+') '+_title_x+'px '+_title_y+'px;"></div>';
		}
		_title_html += '<div style="height:10px;"></div>';
	}
	
	var _html = '';
	
	if (this._is_dialog_border_enabled() && !_disable_border) {
		var _dialog_dir = gGame._homePath + 'images/engine/dialog';
		var _suffix = '-dark';
		_html += '<table cellspacing="0" cellpadding="0">';
		
			// top row
			_html += '<tr>';
			_html += '<td width="20" height="20">' + this._dialog_image('top-left', 20, 20, 1.0) + '</td>';
			_html += '<td width="*" height="20" style="'+this._dialog_bkgnd_style('top')+'"></td>';
			_html += '<td width="20" height="20">' + this._dialog_image('top-right', 20, 20, 1.0) + '</td>';
			_html += '</tr>';
		
			// middle row
			_html += '<tr>';
			_html += '<td width="20" height="*" style="'+this._dialog_bkgnd_style('left')+'"></td>';
			_html += '<td width="*" height="*" align="center" valign="center" style="'+this._dialog_bkgnd_style('center')+'">';
				_html += '<div style="position:relative; margin:10px 0px 15px 0px;">' + _title_html + _inner_html + '</div>';
			_html += '</td>';
			_html += '<td width="20" height="*" style="'+this._dialog_bkgnd_style('right')+'"></td>';
			_html += '</tr>';
		
			// bottom row
			_html += '<tr>';
			_html += '<td width="20" height="20">' + this._dialog_image('bottom-left', 20, 20, 1.0) + '</td>';
			_html += '<td width="*" height="20" style="'+this._dialog_bkgnd_style('bottom')+'"></td>';
			_html += '<td width="20" height="20">' + this._dialog_image('bottom-right', 20, 20, 1.0) + '</td>';
			_html += '</tr>';
		
		_html += '</table>';
	}
	else {
		// mininal dialog for small portals
		_html += _title_html + _inner_html;
	}
	
	this._dialog.style.display = 'block';
	this._dialog.style.width = '' + _zPortWidth + 'px';
	this._dialog.style.height = '' + _zPortHeight + 'px';
	this._dialog.innerHTML = '<table cellspacing="0" cellpadding="0" border="0" width="'+_zPortWidth+'" height="'+_zPortHeight+'"><tr><td align="center" valign="center" style="color:'+('white')+'">' + _html + '</td></tr></table>';
	
	this._dialogActive = true;
	this._dialogHandler = _handler;
	
	this._dialog.onmousedown = function() {};
};

_Toolbar.prototype._shake_dialog = function() {
	// shake dialog horizontally indicating an error condition
	if (this._dialogActive) {
		this._shake_amount = 32;
		this._shake_dir = 1;
		this._shake_orig_x = this._dialog.offsetLeft;
		this._dialog.style.left = '' + Math.floor(this._shake_orig_x + (this._shake_amount * this._shake_dir)) + 'px';
		
		var self = this;
		setTimeout( function() { self._animate_shake(); }, 50 );
	}
};

_Toolbar.prototype._animate_shake = function() {
	if (this._dialogActive) {
		this._shake_dir *= -1;
		if (this._shake_dir == 1) this._shake_amount *= 0.5;
		this._dialog.style.left = '' + Math.floor(this._shake_orig_x + (this._shake_amount * this._shake_dir)) + 'px';
		
		var self = this;
		if (this._shake_amount >= 1) setTimeout( function() { self._animate_shake(); }, 50 );
		else this._dialog.style.left = '' + this._shake_orig_x + 'px';
	}
};

_Toolbar.prototype._animate_overlay = function() {
	// animate dialog overlay
	// var _target = this._dialogActive ? this._overlay._target_opacity : 0;	
	var _target = this._overlay._target_opacity;
	this._overlay._opacity += ((_target - this._overlay._opacity) / 8);
	
	if (Math.abs(_target - this._overlay._opacity) < 0.01) {
		this._overlay._opacity = _target;
		delete this._overlay_timer;
		
		if (!_target) {
			this._overlay.style.display = 'none';
			this._overlay.style.width = '1px';
			this._overlay.style.height = '1px';
		}
	}
	else {
		this._overlay_timer = setTimeout( 'gToolbar._animate_overlay()', 33 );
	}
	
	_set_opacity( this._overlay, this._overlay._opacity );
};

_Toolbar.prototype._hide_overlay = function() {
	// animate overlay to hidden
	this._overlay._target_opacity = 0;
	
	var _zPortWidth = gPort.portWidth * gPort._zoomLevel;
	var _zPortHeight = gPort.portHeight * gPort._zoomLevel;
	
	this._overlay.style.width = '' + _zPortWidth + 'px';
	this._overlay.style.height = '' + _zPortHeight + 'px';
	
	if (ua.ie) {
		this._overlay.style.display = 'none';
		this._overlay.style.width = '1px';
		this._overlay.style.height = '1px';
	}
	else {
		if (!this._overlay_timer) {
			this._overlay_timer = setTimeout( 'gToolbar._animate_overlay()', 33 );
		}
	}
};

_Toolbar.prototype._hide_dialog = function(no_splash) {
	// hide popup dialog
	if (this._dialogHandler && this._dialogHandler._shutdown) {
		this._dialogHandler._shutdown();
	}
	
	this._dialog.innerHTML = '';
	this._dialog.style.display = 'none';
	this._dialog.style.width = '1px';
	this._dialog.style.height = '1px';
	
	this._hide_overlay();
	
	if (this._saveInGame) gGame.resume();
	delete this._saveInGame;
	
	this._dialogActive = false;
	
	if (!gGame.inGame && gGame.loaded && !no_splash) this._show_pause_splash();
};

_Toolbar.prototype._show_splash = function() {
	// show splash screen (click to play)
	gGame._progress.show(1); // 1==splash
	
	var _html = '';
	var _url = gGame._homePath + 'images/engine/dialog/play.png';
	
	_html += '<div style="width:160px; height:160px; position:relative; overflow:hidden; cursor:pointer;">';
		_html += '<div style="width:160px; height:320px; position:absolute; left:0px; top:0px;" onMouseOver="this.style.top=\'-160px\';" onMouseOut="this.style.top=\'0px\';" onClick="gToolbar._click_play()">';
			if (ua.ie6) {
				_html += "<div "
					+ " style=\"" + "width:160px; height:320px;"
					+ "filter:progid:DXImageTransform.Microsoft.AlphaImageLoader"
					+ "(src=\'" + _url + "\', sizingMethod='scale');\"></div>";
			}
			else {
				_html += '<img src="'+_url+'" width="160" height="320"/>';
			}
		_html += '</div>';
	_html += '</div>';
	
	this._show_dialog( this, 4, _html, true, 0.5 );
	
	this._dialog.onmousedown = function() {
		gGame._toolbar._click_play();
	};
	
	// hide loading bar, icons
	el('et_loading_bar').hide();
	el('et_msgs').hide();
};

_Toolbar.prototype._click_play = function() {
	// hide splash, continue loading game
	this._hide_dialog();
	
	gGame._progress.show(0); // 0==loading
	
	el('et_loading_bar').show();
	el('et_msgs').show();
	
	gGame._load3();
};

_Toolbar.prototype._show_pause_splash = function() {
	// show splash screen for paused state
	if (Debug.enabled) return; // no splash for debug mode
	
	var _html = '';
	var _url = gGame._homePath + 'images/engine/dialog/play.png';

	_html += '<div style="width:160px; height:160px; position:relative; overflow:hidden; cursor:pointer;">';
		_html += '<div style="width:160px; height:320px; position:absolute; left:0px; top:0px;" onMouseOver="this.style.top=\'-160px\';" onMouseOut="this.style.top=\'0px\';" onClick="gGameControl.resume()">';
			if (ua.ie6) {
				_html += "<div "
					+ " style=\"" + "width:160px; height:320px;"
					+ "filter:progid:DXImageTransform.Microsoft.AlphaImageLoader"
					+ "(src=\'" + _url + "\', sizingMethod='scale');\"></div>";
			}
			else {
				_html += '<img src="'+_url+'" width="160" height="320"/>';
			}
		_html += '</div>';
	_html += '</div>';
	
	this._show_dialog( this, 5, _html, true, 0.5 );
	
	this._dialog.onmousedown = function() {
		gGame.resume();
	};
};

_Toolbar.prototype._show_progress = function(_msg) {
	// show "progress" dialog
	var _dialog_dir = gGame._homePath + 'images/engine/dialog';
	var _clr_name = 'white';
	var _rev_clr = 'black';
	var _lstyle = 'font-family:arial,sans-serif; font-size:12px; color:'+_clr_name+'; font-weight:bold; opacity:0.75; cursor:default; text-shadow:'+_rev_clr+' 0px 0px 2px;';
	var _html = '';
	_html += '<img src="'+_dialog_dir+'/loading-dark.gif" width="31" height="31"/>';
	_html += '<br/><br/>';
	_html += '<span style="'+_lstyle+'">'+_msg+'<span>';
	this._show_dialog( this, -1, _html, true );
};

_Toolbar.prototype._growl = function(_icon, _title, _msg) {
	// show growl message (logged in, received, etc.)
	var _height = this._growl_height;
	
	var _html = '';
	_html += '<table cellspacing="0" cellpadding="0" width="100%" height="'+_height+'">';
		// top row
		_html += '<tr>';
		_html += '<td width="20" height="20">' + this._dialog_image('top-left', 20, 20, 1.0) + '</td>';
		_html += '<td width="*" height="20" style="'+this._dialog_bkgnd_style('top')+'"></td>';
		_html += '<td width="20" height="20">' + this._dialog_image('top-right', 20, 20, 1.0) + '</td>';
		_html += '</tr>';
		// middle row
		_html += '<tr>';
		_html += '<td width="20" height="*" style="'+this._dialog_bkgnd_style('left')+'"></td>';
		_html += '<td width="*" height="*" align="center" valign="center" style="'+this._dialog_bkgnd_style('center')+'">';
			_html += '<div style="width:1px; height:1px;"></div>';
		_html += '</td>';
		_html += '<td width="20" height="*" style="'+this._dialog_bkgnd_style('right')+'"></td>';
		_html += '</tr>';
		// bottom row
		_html += '<tr>';
		_html += '<td width="20" height="20">' + this._dialog_image('bottom-left', 20, 20, 1.0) + '</td>';
		_html += '<td width="*" height="20" style="'+this._dialog_bkgnd_style('bottom')+'"></td>';
		_html += '<td width="20" height="20">' + this._dialog_image('bottom-right', 20, 20, 1.0) + '</td>';
		_html += '</tr>';
	_html += '</table>';
	
	var _clr_name = 'white';
	var _rev_clr = 'black';
	var _lstyle = 'font-family:arial,sans-serif; font-size:12px; color:'+_clr_name+'; opacity:1.0; cursor:default; text-shadow:'+_rev_clr+' 0px 0px 2px;';
	
	_html += '<div style="position:absolute; z-index:2; left:0px; top:0px; width:100%; height:'+_height+'px; overflow:hidden;">';
	_html += '<table cellspacing="0" cellpadding="0" width="100%" height="'+_height+'"><tr>';
		_html += '<td width="10"><div style="width:10px; height:1px;"></div></td>';
		_html += '<td width="32">';
			if (_icon.toString().match(/^\d+$/)) _html += this._growl_image(_icon);
			else _html += '<img src="'+_icon+'" width="32" height="32"/>';
		_html += '</td>';
		_html += '<td width="10"><div style="width:10px; height:1px;"></div></td>';
		_html += '<td width="*">';
			_html += '<div style="'+_lstyle+' font-weight:bold;"><nobr>'+_title+'</nobr></div>';
			_html += '<div style="'+_lstyle+'"><nobr>'+_msg+'</nobr></div>';
		_html += '</td>';
	_html += '</tr></table>';
	_html += '</div>';
	
	var _div = el('effect_growl');
	if (_div) {
		// el('effect_port').removeChild(_div);
		_div.parentNode ? _div.parentNode.removeChild(_div) : _div.parentElement.removeChild(_div);
	}
	
	if (this._growl_timer) clearTimeout( this._growl_timer );
	
	var _width = 20;
	
	_div = document.createElement('div');
	_div.id = 'effect_growl';
	_div.setAttribute('id', 'effect_growl');
	_div.style.position = 'absolute';
	_div.style.width = '' + _width + 'px';
	_div.style.height = '' + _height + 'px';
	_div.style.overflow = 'hidden';
	_div.style.opacity = '0.0';
	
	var _zPortWidth = gPort.portWidth * gPort._zoomLevel;
	var _zPortHeight = gPort.portHeight * gPort._zoomLevel;
	
	if (this._growl_pos.match(/west/i)) _div.style.left = '10px';
	else if (this._growl_pos.match(/east/i)) _div.style.left = '' + Math.floor((_zPortWidth - _width) - 10) + 'px';
	else _div.style.left = '' + Math.floor( (_zPortWidth / 2) - (_width / 2) ) + 'px';
	
	if (this._growl_pos.match(/north/i)) _div.style.top = '10px';
	else if (this._growl_pos.match(/south/i)) _div.style.top = '' + Math.floor((_zPortHeight - _height) - 10) + 'px';
	else _div.style.top = '' + Math.floor( (_zPortHeight / 2) - (_height / 2) ) + 'px';
	
	_div.style.zIndex = 999;
	_div.innerHTML = _html;
	gGame.inGame ? el('effect_port').appendChild(_div) : el('effect_container').appendChild(_div);
	
	this._growl_cur_frame = 0;
	this._growl_start_width = _width;
	this._growl_start_opacity = 0;
	this._growl_dest_width = this._growl_width;
	this._growl_dest_opacity = 1.0;
	var self = this;
	this._growl_timer = setTimeout( function() { self._animate_growl(); }, 20 );
};

_Toolbar.prototype._animate_growl = function() {
	var _zPortWidth = gPort.portWidth * gPort._zoomLevel;
	var _div = el('effect_growl');
	this._growl_cur_frame++;
	
	var _width = tweenFrame(this._growl_start_width, this._growl_dest_width, this._growl_cur_frame / this._growl_max_frames, 'EaseInOut', 'Sine');
	var _opacity = tweenFrame(this._growl_start_opacity, this._growl_dest_opacity, this._growl_cur_frame / this._growl_max_frames, 'EaseInOut', 'Sine');
	
	_div.style.width = '' + Math.floor(_width) + 'px';
	_div.style.opacity = _opacity;
	
	if (this._growl_pos.match(/west/i)) _div.style.left = '10px';
	else if (this._growl_pos.match(/east/i)) _div.style.left = '' + Math.floor((_zPortWidth - _width) - 10) + 'px';
	else _div.style.left = '' + Math.floor( (_zPortWidth / 2) - (_width / 2) ) + 'px';
	
	if (this._growl_cur_frame >= this._growl_max_frames) {
		if (this._growl_dest_opacity == 1.0) {
			// growl was fading in, and is now complete
			// sit around for a bit, then animate out
			this._growl_start_width = _width;
			this._growl_start_opacity = 1.0;
			this._growl_dest_opacity = 0;
			this._growl_dest_width = 20;
			this._growl_cur_frame = 0;
			var self = this;
			this._growl_timer = setTimeout( function() { self._animate_growl(); }, this._growl_lifetime );
		}
		else {
			// growl was fading out, and is now gone
			// el('effect_port').removeChild(_div);
			_div.parentNode ? _div.parentNode.removeChild(_div) : _div.parentElement.removeChild(_div);
		}
	}
	else {
		var self = this;
		this._growl_timer = setTimeout( function() { self._animate_growl(); }, 20 );
	}
};

