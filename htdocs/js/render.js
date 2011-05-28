// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

/**
 * Effect 1.0
 * Author: Joseph Huckaby
 **/

var last_section = {};
var last_tab = '';
var rendering_page = true;

var years = [
	[ 2002, '2002' ], [ 2003, '2003' ], [ 2004, '2004' ], [ 2005, '2005' ],
	[ 2006, '2006' ], [ 2007, '2007' ], [ 2008, '2008' ], [ 2009, '2009' ],
	[ 2010, '2010' ]
];
var months = [
	[ 1, 'January' ], [ 2, 'February' ], [ 3, 'March' ], [ 4, 'April' ],
	[ 5, 'May' ], [ 6, 'June' ], [ 7, 'July' ], [ 8, 'August' ],
	[ 9, 'September' ], [ 10, 'October' ], [ 11, 'November' ],
	[ 12, 'December' ]
];
var days = [
	[1,1], [2,2], [3,3], [4,4], [5,5], [6,6], [7,7], [8,8], [9,9], [10,10],
	[11,11], [12,12], [13,13], [14,14], [15,15], [16,16], [17,17], [18,18], 
	[19,19], [20,20], [21,21], [22,22], [23,23], [24,24], [25,25], [26,26],
	[27,27], [28,28], [29,29], [30,30], [31,31]
];
var hours = [
	[0, '12 AM'], [1, '1 AM'], [2, '2 AM'], [3, '3 AM'], [4, '4 AM'],
	[5, '5 AM'], [6, '6 AM'], [7, '7 AM'], [8, '8 AM'], [9, '9 AM'],
	[10, '10 AM'], [11, '11 AM'], [12, '12 PM'], [13, '1 PM'], 
	[14, '2 PM'], [15, '3 PM'], [16, '4 PM'], [17, '5 PM'], [18, '6 PM'],
	[19, '7 PM'], [20, '8 PM'], [21, '9 PM'], [22, '10 PM'], [23, '11 PM']
];

function mouse_icon_button(type, e, pt) {
	// mouse action on icon button
	switch (type) {
		case 'mouseDown': this.className = 'icon_button_active'; return false; // stop event
		case 'mouseUp': this.className = 'icon_button'; break;
		case 'click':
			var self = this;
			setTimeout( function() { invoke_dom_handler(self, 'onMouseClick'); }, 10 );
		break;
	}
	return true; // pass event
}

function icon_button(icon_name, text, code, width) {
	// render a fun little icon button
	var html = '';
	html += '<table class="icon_button" cellspacing=0 cellpadding=0 captureMouse="mouse_icon_button"';
	// html += ' onMouseDown="this.className=\'icon_button_active\'; session.buttons_down.push(this); return false;"';
	// html += ' onMouseUp="this.className=\'icon_button\'; '+code+'">';
	if (width) html += ' width="'+width+'"';
	html += ' onMouseClick="'+code+'">';
	html += '<tr>';
	html += '<td width="16" style="padding-right:0px;">' + icon(icon_name) + '</td>';
	if (!ie) html += '<td width="3" style="padding-right:0px;">' + spacer(3,1) + '</td>';
	html += '<td align="center" width="*" onselectstart="return false" style="padding-right:0px;"><nobr>' + text + '</nobr></td>';
	html += '</tr></table>';
	return html;
}

function large_icon_button(icon_name, text, code, id, style, extra_classes) {
	// render a fun big icon button
	var html = '';
	if (!icon_name) icon_name = '';
	if (!icon_name.match(/\.\w+$/)) icon_name += '.gif';
	if (!text) text = '';
	if (!code) code = '';
	if (!id) id = '';
	if (!extra_classes) extra_classes = '';
	
	if (code.toString().match(/^\#(.+)$/)) code = "Nav.go('"+RegExp.$1+"')";
	
	html += '<div class="button '+extra_classes+'" id="'+id+'" onClick="'+code+'">';
		html += '<ul>';
			html += '<li class="left"></li>';
			if (icon_name) html += '<li class="icon"><img src="'+png(icons_uri+'/'+icon_name, true)+'" class="png" width="16" height="16"/></li>';
			html += '<li class="center" style="' + (icon_name ? 'padding-left:5px;' : '') + compose_style(style) + '">' + text + '</li>';
			html += '<li class="right"></li>';
		html += '</ul>';
		html += '<div class="clear"></div>';
	html += '</div>';
	
	return html;
}

function get_icon_for(filename, id, text, code) {
	// return an appropriate icon for the given filename
	if (!id) id = '';
	if (!text) text = '';
	if (!code) code = '';
	
	var icon_name = '';
	var ext = filename.replace(/^.+\.(\w+)$/, '$1').toLowerCase();
	
	if (filename.match(/\/$/)) icon_name = 'folder.png';
	else if (ext.match(/(js|sh|pl|pm|php|asp)/)) icon_name = 'page_white_code.png';
	else if (ext.match(/(xml|xsl|dtd|txt|htm|html|css)/)) icon_name = 'page_white_text.png';
	else if (ext.match(/(jpg|jpe|jpeg|bmp|gif|pcx|png|tif|tiff|psd)/)) icon_name = 'page_white_colorwheel.png';
	else if (ext.match(/(as|swf|fla)/)) icon_name = 'page_white_flash.png';
	else if (ext.match(/(doc)/)) icon_name = 'page_white_word.png';
	else if (ext.match(/(xls)/)) icon_name = 'page_white_excel.png';
	else if (ext.match(/(pdf)/)) icon_name = 'page_white_acrobat.png';
	else if (ext.match(/(zip)/)) icon_name = 'page_white_zip.png';
	else if (ext.match(/(mp3)/)) icon_name = 'page_white_audio.png';
	else if (ext.match(/(flv|mp4|mp4v|mov|3gp|3g2)/)) icon_name = 'page_white_movie.png';
	else if (ext.match(/(ttf|otf)/)) icon_name = 'page_white_font.png';
	else icon_name = 'page_white.png';
	
	return icon(icon_name, text, code, filename, id);
}

function get_color_preview(color) {
	// get HTML for color, plus hex code
	if (!color.match(/^\#/)) color = '#' + color;
	var html = '';
	html += '<table cellspacing="0" cellpadding="0"><tr>';
	html += '<td style="margin:0; padding:0;"><div style="width:24px; height:14px; border:1px solid #aaa; background-color:'+color+';"></div></td>';
	html += '<td style="margin:0; padding:0;">' + spacer(4,1) + '</td>';
	html += '<td style="margin:0; padding:0;">' + color + '</td>';
	html += '</tr></table>';
	return html;
}

function busy() {
	return '<img src="'+images_uri+'/busy.gif" width="16" height="16"/>';
}

function loading_image() {
	return '<center><img src="'+images_uri+'/loading.gif" width="32" height="32"/></center>';
}

function begin_section(type, size, ext, table_attribs) {
	// begin section with image borders
	if (typeof(size) == 'number') size = [size, size, size, size];
	if (!ext || ie6) ext = 'gif';
	last_section.type = type;
	last_section.size = size;
	last_section.ext = ext;
	var png = (ext.toLowerCase() == 'png') ? true : false;
	var html = '<table cellspacing=0 cellpadding=0 border=0 '+compose_attribs(table_attribs)+'><tr>';
	html += '<td width="'+size[0]+'" height="'+size[1]+'"><img '+(png ? 'class="png" ' : '')+'src="'+images_uri+'/'+type+'/top_left.'+ext+'" width="'+size[0]+'" height="'+size[1]+'"></td>';
	html += '<td width="*" height="'+size[1]+'" '+(png ? 'class="png" ' : '')+' background="'+images_uri+'/'+type+'/top.'+ext+'"><img src="'+images_uri+'/pixel.gif" width="1" height="1"></td>';
	html += '<td width="'+size[2]+'" height="'+size[1]+'"><img '+(png ? 'class="png" ' : '')+'src="'+images_uri+'/'+type+'/top_right.'+ext+'" width="'+size[2]+'" height="'+size[1]+'"></td>';
	html += '</tr><tr>';
	html += '<td width="'+size[0]+'" height="*" '+(png ? 'class="png" ' : '')+'background="'+images_uri+'/'+type+'/left.'+ext+'"><img src="'+images_uri+'/pixel.gif" width="1" height="1"></td>';
	html += '<td width="*" height="*">';
	if (rendering_page) document.write(html); else return html;
}

function end_section(type, size, ext) {
	// begin section with image borders
	if (typeof(size) == 'number') size = [size, size, size, size];
	if (!type) type = last_section.type;
	if (!size) size = last_section.size;
	if (!ext) ext = last_section.ext;
	if (ie6) ext = 'gif';
	var png = (ext.toLowerCase() == 'png') ? true : false;
	var html = '</td>';
	html += '<td width="'+size[2]+'" height="*" '+(png ? 'class="png" ' : '')+'background="'+images_uri+'/'+type+'/right.'+ext+'"><img src="'+images_uri+'/pixel.gif" width="1" height="1"></td>';
	html += '</tr><tr>';
	html += '<td width="'+size[0]+'" height="'+size[3]+'"><img '+(png ? 'class="png" ' : '')+'src="'+images_uri+'/'+type+'/bottom_left.'+ext+'" width="'+size[0]+'" height="'+size[3]+'"></td>';
	html += '<td width="*" height="'+size[3]+'" '+(png ? 'class="png" ' : '')+'background="'+images_uri+'/'+type+'/bottom.'+ext+'"><img src="'+images_uri+'/pixel.gif" width="1" height="1"></td>';
	html += '<td width="'+size[2]+'" height="'+size[3]+'"><img '+(png ? 'class="png" ' : '')+'src="'+images_uri+'/'+type+'/bottom_right.'+ext+'" width="'+size[2]+'" height="'+size[3]+'"></td>';
	html += '</tr></table>';
	if (rendering_page) document.write(html); else return html;
}

function img8_bkgnd(lw, th, rw, bh) {
	// lw = left border width, th = top border height, 
	// rw = right border width, bh = bottom border height
	if (arguments.length == 1) { th = rw = bh = lw; }
	else if (arguments.length == 2) { rw = lw; bh = th; }
	
	return( 
		'<table cellspacing="0" cellpadding="0" border="0" width="100%" height="100%"><tr>' + 
		'<td width="'+lw+'" height="'+th+'" class="tl"><img src="'+images_uri+'/sp.gif" width="1" height="1"/></td>' +
		'<td width="*" height="'+th+'" class="t"><img src="'+images_uri+'/sp.gif" width="1" height="1"/></td>' + 
		'<td width="'+rw+'" height="'+th+'" class="tr"><img src="'+images_uri+'/sp.gif" width="1" height="1"/></td>' + 
		'</tr><tr>' + 
		'<td width="'+lw+'" height="*" class="l"><img src="'+images_uri+'/sp.gif" width="1" height="1"/></td>' + 
		'<td width="*" height="*" class="c"><img src="'+images_uri+'/sp.gif" width="1" height="1"/></td>' + 
		'<td width="'+rw+'" height="*" class="r"><img src="'+images_uri+'/sp.gif" width="1" height="1"/></td>' + 
		'</tr><tr>' + 
		'<td width="'+lw+'" height="'+bh+'" class="bl"><img src="'+images_uri+'/sp.gif" width="1" height="1"/></td>' + 
		'<td width="*" height="'+bh+'" class="b"><img src="'+images_uri+'/sp.gif" width="1" height="1"/></td>' + 
		'<td width="'+rw+'" height="'+bh+'" class="br"><img src="'+images_uri+'/sp.gif" width="1" height="1"/></td>' + 
		'</tr></table>'
	);
}

function tab_bar(tabs, cur_tab_name) {
	// tabs should be array of arrays
	// inner array should be: [code, label, classes]
	var lw = 10, th = 10, rw = 10;
	var html = '';
	html += '<div class="tab_bar">';
	
	for (var idx = 0, len = tabs.length; idx < len; idx++) {
		var tab = tabs[idx];
		var code = tab[0];
		if (code.toString().match(/^\#(.+)$/)) code = "Nav.go('"+RegExp.$1+"')";
		// html += '<div class="tab_spacer"></div>';
		html += '<div class="tab '+((tab[1] == cur_tab_name) ? 'active' : 'inactive')+'" onClick="'+code+'">';
		/* html += '<div class="border">' + 
			'<table cellspacing="0" cellpadding="0" border="0" width="100%" height="100%"><tr>' + 
			'<td width="'+lw+'" height="'+th+'" class="tl"><img src="images/sp.gif" width="1" height="1"/></td>' +
			'<td width="*" height="'+th+'" class="t"><img src="images/sp.gif" width="1" height="1"/></td>' + 
			'<td width="'+rw+'" height="'+th+'" class="tr"><img src="images/sp.gif" width="1" height="1"/></td>' + 
			'</tr><tr>' + 
			'<td width="'+lw+'" height="*" class="l"><img src="images/sp.gif" width="1" height="1"/></td>' + 
			'<td width="*" height="*" class="c"><img src="images/sp.gif" width="1" height="1"/></td>' + 
			'<td width="'+rw+'" height="*" class="r"><img src="images/sp.gif" width="1" height="1"/></td>' + 
			'</tr>' +
			'</table>' + 
			'</div>'; */
		html += '<div class="content ' + (tab[2] ? (' icon" style="background-image:url(images/icons/'+tab[2]+')"') : '"') + '>' + tab[1] + '</div>';
		html += '</div>';
	}
	
	html += '<div class="clear"></div>';
	html += '</div>';
	return html;
}

function select_tab(id) {
	$('tab_left_'+id).src = $('tab_left_'+id).src.replace(/_inactive_/, '_active_');
	$('tab_middle_'+id).style.backgroundImage = $('tab_middle_'+id).style.backgroundImage.replace(/_inactive_/, '_active_');
	$('tab_right_'+id).src = $('tab_right_'+id).src.replace(/_inactive_/, '_active_');
	$('tab_text_'+id).className = 'tab_active';
	$('page_'+id).show();
}

function deselect_tab(id) {
	$('tab_left_'+id).src = $('tab_left_'+id).src.replace(/_active_/, '_inactive_');
	$('tab_middle_'+id).style.backgroundImage = $('tab_middle_'+id).style.backgroundImage.replace(/_active_/, '_inactive_');
	$('tab_right_'+id).src = $('tab_right_'+id).src.replace(/_active_/, '_inactive_');
	$('tab_text_'+id).className = 'tab_inactive';
	$('page_'+id).hide();
}

function click_tab(id) {
	// switch tabs
	if (id != last_tab) {
		if (last_tab) {
			deselect_tab(last_tab);
			safe_call('deactivate_page_'+last_tab);
		}
		select_tab(id);
		last_tab = id;
		if (!$('page_'+id).innerHTML.length) safe_call('init_page_'+id);
		else safe_call('activate_page_'+id);
	}
}

function begin_tabs(tabs, type, size, tab_height, ext, table_attribs) {
	// begin section with tabs
	if (!ext) ext = 'gif';
	last_section.type = type;
	last_section.size = size;
	last_section.ext = ext;
	var png = (ext.toLowerCase() == 'png') ? true : false;
	var html = '<table cellspacing=0 cellpadding=0 border=0 '+compose_attribs(table_attribs)+'>';
	html += '<tr>';
	html += '<td width="'+size+'" height="'+tab_height+'"><img '+(png ? 'class="png" ' : '')+'src="'+images_uri+'/'+type+'/tabs/top_left.'+ext+'" width="'+size+'" height="'+tab_height+'"></td>';
	html += '<td width="*" height="'+tab_height+'">';
	
	html += '<table width="100%" cellspacing=0 cellpadding=0 border=0><tr>';
	for (var idx = 0, len = tabs.length; idx < len; idx++) {
		var tab = tabs[idx];
		// var tab_mode = (idx == 0) ? 'tab_active' : 'tab_inactive';
		var tab_mode = 'tab_inactive';
		var click_action = 'onMouseDown="return false" onMouseUp="click_tab(\''+tab[1]+'\')"';
		
		html += '<td width="'+size+'" height="'+tab_height+'" '+click_action+'>';
		html += '<img '+(png ? 'class="png" ' : '')+'src="'+images_uri+'/'+type+'/tabs/'+tab_mode+'_left.'+ext+'" width="'+size+'" height="'+tab_height+'" id="tab_left_'+tab[1]+'">';
		html += '</td>';
		
		html += '<td '+(png ? 'class="png" ' : '')+'width="1" height="'+tab_height+'" '+click_action+' id="tab_middle_'+tab[1]+'" style="background-image:url('+images_uri+'/'+type+'/tabs/'+tab_mode+'_middle.'+ext+');">';
		html += '<span id="tab_text_'+tab[1]+'" class="'+tab_mode+'">' + tab[0].toString().replace(/\s/g, "&nbsp;") + '</span>';
		html += '</td>';
		
		html += '<td width="'+size+'" height="'+tab_height+'" '+click_action+'>';
		html += '<img '+(png ? 'class="png" ' : '')+'src="'+images_uri+'/'+type+'/tabs/'+tab_mode+'_right.'+ext+'" width="'+size+'" height="'+tab_height+'" id="tab_right_'+tab[1]+'">';
		html += '</td>';
	}
	html += '<td width="*" height="'+tab_height+'" '+(png ? 'class="png" ' : '')+' background="'+images_uri+'/'+type+'/tabs/top.'+ext+'"><img src="'+images_uri+'/pixel.gif" width="1" height="1"></td>';
	html += '</tr></table>';
	html += '</td>';
	
	html += '<td width="'+size+'" height="'+tab_height+'"><img '+(png ? 'class="png" ' : '')+'src="'+images_uri+'/'+type+'/tabs/top_right.'+ext+'" width="'+size+'" height="'+tab_height+'"></td>';
	html += '</tr><tr>';
	html += '<td width="'+size+'" height="*" '+(png ? 'class="png" ' : '')+'background="'+images_uri+'/'+type+'/left.'+ext+'"><img src="'+images_uri+'/pixel.gif" width="1" height="1"></td>';
	html += '<td width="*" height="*" bgcolor=white>';
	if (rendering_page) document.write(html); else return html;
}

function popup_fade_animate() {
	
	if (session.popup_fade_screen_active) {
		// fade faster when closing
		var div_amount = (session.popup_fade_target == 0.0) ? 4 : 8;
		
		session.popup_fade_opacity += ((session.popup_fade_target - session.popup_fade_opacity) / div_amount);
		var div = document.getElementById('lbox_overlay');
		if (div) {
			div.style.opacity = session.popup_fade_opacity;
			if (ie) div.style.filter = 'alpha(opacity=' + parseInt(session.popup_fade_opacity * 100, 10) + ')';
			div = null;
		}
		
		if (Math.abs(session.popup_fade_target - session.popup_fade_opacity) < 0.01) {
			// close enough, we're done
			session.popup_fade_screen_active = 0;
			
			if (!session.popup_fade_target) {
				// target was to fade out, so remove elements now
				
				document.body.removeChild( $('lbox_overlay') );

				if (ie) {
					document.body.removeChild( $('lbox_msie_frame') );
				}
				
				if (0) {
					var html = document.getElementsByTagName('html')[0];
					html.style.height = 'auto';
					html.style.width = 'auto';
					html.style.overflow = '';

					var body = document.getElementsByTagName('body')[0];
					body.style.width = 'auto';
					body.style.height = 'auto';
					body.style.overflow = '';
					body.style.marginRight = '0px';
				}
				if (safari) {
					window.scrollBy(0, 1);
					window.scrollBy(0, -1);
				}
			} // remove elements
		}
		else {
			setTimeout( 'popup_fade_animate()', 33 );
		}
	}
}

function popup_fade_screen() {
	// fade screen for popup dialog (i.e. lightbox effect)
	if (!session.popup_dialog_active) {
		if (0) {
			var html = document.getElementsByTagName('html')[0];
			html.style.height = '100%';
			html.style.width = '100%';
			html.style.overflow = 'hidden';

			var body = document.getElementsByTagName('body')[0];
			// body.style.width = '100%';
			body.style.height = '100%';
			body.style.overflow = 'hidden';
			
			// adjust margin ONLY if page has a vertical scrollbar
			if (getInnerWindowSize().height < getScrollMax().height) {
				body.style.marginRight = '16px';
			}
		}

		if (ie && !$('lbox_msie_frame')) {
			// IE needs some additional help to deal with this type of overlay
			var ifr = document.createElement('IFRAME');
			ifr.id = 'lbox_msie_frame';
			document.body.appendChild(ifr);
		}
		
		if (!$('lbox_overlay')) {
			var div = document.createElement('DIV');
			div.id = 'lbox_overlay';
			document.body.appendChild(div);
		}
	
		// if (ie) div2.style.top = document.body.scrollTop + 'px';
		
		// animation
		session.popup_fade_target = 0.4;
			
		if (!session.popup_fade_screen_active) {
			session.popup_fade_opacity = 0.0;
			session.popup_fade_screen_active = 1;
			popup_fade_animate();
		}
	}
}

function popup_restore_screen() {
	// restore screen from popup lightbox effect
	if (session.popup_dialog_active) {
		session.popup_fade_target = 0.0;
		
		if (1) {
			var html = document.getElementsByTagName('html')[0];
			html.style.height = 'auto';
			html.style.width = 'auto';
			html.style.overflow = '';

			var body = document.getElementsByTagName('body')[0];
			body.style.width = 'auto';
			body.style.height = 'auto';
			body.style.overflow = '';
			body.style.marginRight = '0px';
		}
		if (safari) {
			window.scrollBy(0, 1);
			window.scrollBy(0, -1);
		}
			
		if (!session.popup_fade_screen_active) {
			session.popup_fade_opacity = 0.5;
			session.popup_fade_screen_active = 1;
			popup_fade_animate();
		}
	}
}

function show_popup_dialog(width, height, html) {
	// position popup onscreen
	if (session.net_error) return;
	
	if (window.gGameControl) {
		gGameControl.pause();
		gGameControl.setClickResume( false );
	}
	else {
		if (window.Effect && Effect.Game && Effect.Game.inGame) Effect.Game.pause();
		if (window.Effect && Effect.Game) Effect.Game.clickResume = false;
	}
	
	var popup = $('d_dialog_outer');
	var doc_size = getInnerWindowSize();
	var scroll = getScrollXY();
	
	var outer_width = width + 24 + 24; // horiz borders
	var outer_height = height + 24 + 24; // vert borders
	var left = Math.floor( (doc_size.width / 2) - (outer_width / 2) );
	var top = Math.floor( ((doc_size.height / 2) - (outer_height / 2)) / 2 );
	
	// honor window scroll
	top += scroll.y;
	
	// adjust for page header
	top += 50;
	
	popup.style.left = left + 'px';
	popup.style.top = top + 'px';
	popup.style.width = outer_width + 'px';
	popup.style.height = outer_height + 'px';
	
	var content = $('d_dialog_inner');
	content.style.width = width + 'px';
	content.style.height = height + 'px';
	content.innerHTML = html;
	
	popup.show();
	if (!ie) popup_fade_screen();
	session.popup_dialog_active = true;
	delete session.progress;
	
	safe_call('hook_show_popup_dialog');
}

function hide_popup_dialog() {
	// hide popup dialog
	$('d_dialog_inner').innerHTML = '';
	var popup = $('d_dialog_outer');
	popup.left = "-4000px";
	popup.hide();
	if (!ie) popup_restore_screen();
	session.popup_dialog_active = false;
	
	delete session.hooks.keys[ENTER_KEY];
	delete session.hooks.keys[ESC_KEY];
	delete session.progress;
	
	safe_call('hook_hide_popup_dialog');
	
	if (window.gGameControl) {
		gGameControl.setClickResume( true );
	}
	else if (window.Effect && Effect.Game) Effect.Game.clickResume = true;
}

function clear_notice() {
	// clear error dialog
	hide_popup_dialog();
	fire_hook('after_notice');
}

function do_notice(title, msg, callback) {
	// show error dialog
	hide_popup_dialog();
	delete session.progress;
	
	if (callback) session.hooks.after_notice = callback;
	
	var html = '<table cellspacing=0 cellpadding=0><tr><td width=400 height=150 valign=center align=center>';
	html += '<div class="dialog_title">'+title+'</div>';
	html += text_to_html(msg);
	html += '<br><br>';
	
	html += '<table><tr>';
		html += '<td>' + large_icon_button('check', 'Close', 'clear_notice()') + '</td>';
	html += '</tr></table>';
	
	html += '</td></tr></table>';
	
	session.hooks.keys[ENTER_KEY] = 'clear_notice'; // enter key
	session.hooks.keys[ESC_KEY] = 'clear_notice'; // escape key
	
	show_popup_dialog(400, 150, html);
}

function clear_error() {
	// clear error dialog
	hide_popup_dialog();
	// safe_call('hook_clear_error');
	fire_hook('after_error');
}

function do_error(msg, button_args, pure) {
	// show error dialog
	hide_popup_dialog();
	delete session.progress;
	// alert("Sorry, an error occurred:\n\n" + msg);
	// return null;
	
	fire_hook('before_error');
	
	var html = '<table cellspacing=0 cellpadding=0><tr><td width=400 height=250 valign=center align=center>';
	html += '<img src="'+images_uri+'/icons/error.gif" width="33" height="32"><br>';
	html += '<span class="subtitle" style="color:#f00;">Sorry, an error occurred:</span><br><br>';
	html += '<div style="width:350px; height:150px; overflow-x:hidden; overflow-y:auto;">';
	html += pure ? msg : text_to_html(msg);
	html += '</div><br>';
	
	html += '<table><tr>';
		html += '<td>' + large_icon_button('check', 'Close', 'clear_error()') + '</td>';
		if (button_args) {
			html += '<td width=15>&nbsp;</td>';
			html += '<td>' + large_icon_button.apply(window, button_args) + '</td>';
		}
	html += '</tr></table>';
	
	html += '</td></tr></table>';
	
	session.hooks.keys[ENTER_KEY] = 'clear_error'; // enter key
	session.hooks.keys[ESC_KEY] = 'clear_error'; // escape key
	
	show_popup_dialog(400, 250, html);
	
	return null;
}

function show_progress_dialog(counter, title, remain_disp, button_args) {
	// show floating progress dialog
	// set counter to 1 for indeterminate
	// set remain_disp to 1 for automatic remaining time calculation
	if (session.progress) {
		// dialog already present, update instead
		update_progress_dialog(counter, title);
		return;
	}
	if (!counter) counter = 0;
	var cx = Math.floor( counter * 196 );
	
	var html = '';
	html += '<center><br>';
	html += '<span id="d_progress_title" class="subtitle">' + title + '</span><br><br>';
	
	var opac_str = '';
	if (counter == 1.0) opac_str = 'opacity:0.5; moz-opacity:0.5; filter:alpha(opacity=50);';
	
	html += '<div style="position:relative; overflow:hidden; width:196px; height:20px; background-image:url('+images_uri+'/aquaprogressbar_bkgnd.gif);">';
		html += '<div id="d_progress_bar" style="position:absolute; left:0px; top:0px; width:196px; height:20px; clip:rect(0px '+cx+'px 20px 0px);'+opac_str+'">';
			html += '<img src="'+images_uri+'/aquaprogressbar.gif" width="196" height="20"/>';
		html += '</div>';
	html += '</div>';
	
	html += '<br><span id="d_progress_caption" class="caption"></span>';
	
	if (button_args) {
		html += '<br/><br/><table><tr><td>';
		html += large_icon_button.apply(window, button_args);
		html += '<br clear="all"/></td></tr></table>';
	}
	
	html += '</center>';
	show_popup_dialog(275, button_args ? 150 : 100, html);
	
	session.progress = {
		remain_disp: remain_disp,
		start_counter: counter,
		counter: counter,
		counter_max: 1,
		start_time: hires_time_now(),
		last_update: hires_time_now(),
		title: title
	};
}

function hide_progress_dialog() {
	hide_popup_dialog();
	session.progress = null;
	delete session.progress;
}

function update_progress_dialog(counter, title, caption) {
	// update progress display
	var now = hires_time_now();
	var cx = Math.floor( counter * 196 );
	var prog_div = $('d_progress_bar');
	if (prog_div) {
		prog_div.style.clip = 'rect(0px '+cx+'px 20px 0px)';
		var opacity = (counter == 1.0) ? 0.5 : 1.0;
		if ((opacity > 0) && (opacity < 1.0)) {
			prog_div.style.opacity = opacity;
			if (moz) prog_div.style.MozOpacity = opacity;
			else if (ie) prog_div.style.filter = "alpha(opacity=" + parseInt(opacity * 100, 10) + ")";
		}
		else {
			prog_div.style.opacity = 1.0;
			if (moz) prog_div.style.MozOpacity = 1.0;
			else if (ie) prog_div.style.filter = "";
		}
	}
	
	if (title) session.progress.title = title;
	var title_div = $('d_progress_title');
	if (title_div) title_div.innerHTML = session.progress.title;
	
	if (caption) {
		// show custom caption
		var cap_div = $('d_progress_caption');
		if (cap_div) cap_div.innerHTML = caption;
	}
	else if (session.progress.remain_disp) {
		// show time remaining if applicable
		if (session.progress.start_time <= now - 5.0) {
			var caption = '';
			if ((counter > 0.0) && (counter < 1.0)) {
				caption = get_nice_remaining_time(session.progress.start_time, now, counter, 1.0, true);
				caption += ' remaining';
			}
			var cap_div = $('d_progress_caption');
			if (cap_div) cap_div.innerHTML = caption;
		}
	} // remain_disp
	
	session.progress.last_update = now;
	session.progress.counter = counter;
}

function safe_focus(id) {
	// safely focus dom element
	if ($(id)) {
		try { $(id).focus(); } catch (e) {;}
	}
	else setTimeout( "try { $('"+id+"').focus(); } catch (e) {;}", 1 );
}

function do_message(type, msg) {
	// display message in header
	// type: success (green), warning (yellow), error (red)
	
	$GR.growl(type, msg);
	return;
	
	/* $('d_message').className = 'message ' + type;
	$('d_message').innerHTML = '<div class="message_inner">' + msg + '</div>';
	
	$('d_message_wrapper').style.height = 'auto';
	$('d_message_wrapper').show();
	
	setTimeout( function() { window.scrollTo(0, 0); }, 1 );
	
	// if (session.message_timer) clearTimeout( session.message_timer );
	// session.message_timer = setTimeout( "animate_div_visibility('d_message', false)", 10 * 1000 );
	
	if (!session.message_id) session.message_id = 1;
	else session.message_id++;
	setTimeout( "hide_message("+session.message_id+")", 10 * 1000 ); */
	
	// animate_div_visibility('d_message', true);
}

function hide_message(id) {
	if (session.message_id == id) {
		if (ie) $('d_message').hide();
		else animate_div_visibility('d_message_wrapper', false);
	}
}

function menu( id, items, value, attribs ) {
	// render simple menu given id, array of items, and value
	if (typeof(value) == 'undefined') value = null;
	var html = '<select name="'+id+'" id="'+id+'" '+compose_attribs(attribs)+'>';
	for (var idx = 0, len = items.length; idx < len; idx++) {
		var item = items[idx];
		if (typeof(item) != 'object') item = [ items[idx], items[idx] ];
		if (isa_array(item[0])) {
			// opt group
			var subitems = item[0];
			html += '<optgroup label="'+item[1]+'">';
			for (var idy = 0, ley = subitems.length; idy < ley; idy++) {
				var subitem = subitems[idy];
				if (typeof(subitem) != 'object') subitem = [ subitems[idy], subitems[idy] ];
				var selected = (subitem[0] == value) ? ' selected="selected"' : '';
				html += '<option value="'+subitem[0]+'"' + selected + '>' + subitem[1] + '</option>';
			}
			html += '</optgroup>';
		}
		else {
			// std item
			var selected = (item[0] == value) ? ' selected="selected"' : '';
			html += '<option value="'+item[0]+'"' + selected + '>' + item[1] + '</option>';
		}
	}
	html += '</select>';
	return html;
}

function insert_date_selector(prefix, epoch) {
	// insert mon/mday/year/hour multi-menu selector
	var date = get_date_args(epoch);
	// var html = '<form>';
	var html = '';
	
	html += menu( prefix + '_mon', months, date.mon );
	html += menu( prefix + '_mday', days, date.mday );
	html += menu( prefix + '_year', years, date.year );
	// html += menu( prefix + '_hour', hours, date.hour );

	// html += '</form>';
	return html;
	// document.write( html );
}

function set_menu_date( prefix, epoch ) {
	// set multi-menu date selector to epoch
	var date = get_date_args(epoch);

	var mon = $( prefix + '_mon' );
	if (mon) mon.selectedIndex = date.mon - 1;

	var mday = $( prefix + '_mday' );
	if (mday) mday.selectedIndex = date.mday - 1;

	var year = $( prefix + '_year' );
	if (year) year.selectedIndex = date.year - years[0][0];

	/* var hour = $( prefix + '_hour' );
	if (hour) hour.selectedIndex = date.hour; */
}

function get_menu_date( prefix ) {
	// get epoch of multi-menu date selector
	var mon = get_menu_value( prefix + '_mon' );
	var mday = get_menu_value( prefix + '_mday' );
	var year = get_menu_value( prefix + '_year' );
	// var hour = get_menu_value( prefix + '_hour' );

	var date = new Date( year, mon - 1, mday, 0, 0, 0, 0 );
	return parseInt( date.getTime() / 1000, 10 );
}

// animate DIV visibility

function animate_div(id) {
	var div = $(id);
	if (!div) return alert("Cannot find div: " + id);
	div._timer = null;
	
	var target = div._state ? div.scrollHeight : 0;
	if (div._height != target) {
		div._height += ((target - div._height) / 4);
		if (Math.abs( target - div._height ) < 1.0) div._height = target;
		
		div.style.height = '' + div._height + 'px';
		
		if (div._mode == -1) div.scrollTop = div.scrollHeight;
		else div.scrollTop = 0;
		
		div._timer = setTimeout('animate_div("'+id+'");', 33);
	}
	else {
		if (div._state) {
			div.style.height = 'auto';
		}
		// else div.style.display = 'none';
		div.scrollTop = 0;
	}
}

function animate_div_visibility(id, visible) {
	// set section view flag to viewable or hidden
	var div = $(id);
	
	if (typeof(div._state) == 'undefined') {
		div._state = (div.style.display != 'none') ? true : false;
		div._height = div._state ? div.scrollHeight : 0;
		div.style.height = '' + (div._state ? 'auto' : '0px');
		div.style.overflow = 'hidden';
		div.scrollTop = 0;
	}
	else {
		// actual height of div may have changed, update now
		div._height = div.offsetHeight;
	}
	div.show();
	
	div._state = visible;
	div._mode = -1; // slide out, instead of wipe out
	if (!div._timer) animate_div(id);
	
	var sc = document.getElementById('sc_' + id);
	if (sc) {
		var new_icon_name = visible ? 'arrow-down' : 'arrow-right';
		if (sc.src.indexOf('_mini') > -1) new_icon_name += '_mini';
		sc.src = images_uri + '/icons/' + new_icon_name + '.png';
	}

	if (visible && !div.innerHTML.length && div.getAttribute('onExpand')) 
		eval( div.getAttribute('onExpand') );
}

function image_placeholder(text, width, height) {
	// simple image placeholder
	return '<table cellspacing="0" cellpadding="0" width="'+width+'" height="'+height+'"><tr><td bgcolor="#dddddd" align="center" valign="center"><b>'+text+'</b></td></tr></table>';
}

function bad_field(id, msg) {
	// mark field as bad, display message
	var field = $(id);
	
	field.addClass('control_bad');
	do_message("error", msg);
	
	try { field.focus(); } catch(e) {;}
	
	// field.onchange = function() { $(this).removeClass('control_bad'); };
	
	session.last_bad_field_id = id;
	
	return false;
}

function clear_field_error() {
	// clear last field error, if applicable
	if (session.last_bad_field_id && $(session.last_bad_field_id)) $(session.last_bad_field_id).removeClass('control_bad');
	// hide_message(session.message_id);
}

function smart_sect_restore(sects, prefs) {
	// restore a set of smart sections
	if (!sects) sects = [];
	if (!prefs) prefs = {};
	
	for (var idx = 0, len = sects.length; idx < len; idx++) {
		var sect = sects[idx];
		if (typeof(prefs[sect]) == 'undefined') prefs[sect] = 1;
		if (prefs[sect] == 1) {
			$(sect).show();
			$(sect).style.height = '';
			$('ctl_'+sect).removeClass('closed');
			$('ctl_'+sect).addClass('open');
		}
		else {
			$(sect).hide();
			$('ctl_'+sect).removeClass('open');
			$('ctl_'+sect).addClass('closed');
		}
	}
}

function smart_sect_toggle(sect, prefs) {
	// toggle smart section open/closed, and mark prefs for save
	if (prefs[sect] == 0) {
		// $(sect).show();
		animate_div_visibility(sect, true);
		$('ctl_'+sect).removeClass('closed');
		$('ctl_'+sect).addClass('open');
		prefs[sect] = 1;
	}
	else {
		// $(sect).hide();
		animate_div_visibility(sect, false);
		$('ctl_'+sect).removeClass('open');
		$('ctl_'+sect).addClass('closed');
		prefs[sect] = 0;
	}
	user_storage_mark();
}

function custom_fit(source_width, source_height, dest_width, dest_height) {
	// fit box into another, preserving aspect ratio
	var width = dest_width;
	var height = dest_height;
	
	if ((dest_width <= source_width) || (dest_height <= source_height)) {
		width = source_width;
		height = source_height;

		for (var idx = 0; idx < 2; idx++) {
			if (width - dest_width > height - dest_height) {
				if (width > dest_width) {
					height = Math.floor( height / (width / dest_width) );
					width = dest_width;
				}
			}
			else {
				if (height > dest_height) {
					width = Math.floor( width / (height / dest_height) );
					height = dest_height;
				}
			}
		} // loop

		if (!width) width = 1;
		if (!height) height = 1;
	}
	
	return { width: width, height: height };
}

function fit_game_title(title) {
	return ww_fit_string(title, 550, session.em_width, 1);
}

function render_user_stats(stats) {
	var html = '';
	
	html += '<div class="article_info_floater">';
	html += '<div class="article_info_header">' + icon('chart_pie.png', 'User Stats') + '</div>';
	html += '<div class="stats_row"><b>Logins:</b>&nbsp;' + commify(stats.Logins || 0) + '</div>';
	html += '<div class="stats_row"><b>Articles:</b>&nbsp;' + commify(stats.Articles || 0) + '</div>';
	html += '<div class="stats_row"><b>Comments:</b>&nbsp;' + commify(stats.Comments || 0) + '</div>';
	html += '<div class="stats_row"><b>Games:</b>&nbsp;' + commify(stats.Games || 0) + '</div>';
	html += '</div>';
	
	return html;
}

function get_speech_bubble(color, content) {
	// render inner speech bubble.
	var bubble_uri = images_uri + '/speech_bubbles/' + color;
	var html = '';
	html += '<table cellspacing=0 cellpadding=0 border=0><tr>';
	html += '<td width="24" height="14"><img class="png" src="'+png(bubble_uri+'_tl.png', true)+'" width="24" height="14"/></td>';
	html += '<td width="*" height="14" class="png" background="'+png(bubble_uri+'_tm.png', true)+'">'+spacer(1,14)+'</td>';
	html += '<td width="24" height="14"><img class="png" src="'+png(bubble_uri+'_tr.png', true)+'" width="24" height="14"/></td>';
	html += '</tr><tr>';
	html += '<td width="24" height="*" class="png" background="'+png(bubble_uri+'_ml.png', true)+'">'+spacer(24,1)+'</td>';
	html += '<td width="*" height="*" class="png" background="'+png(bubble_uri+'_mi.png', true)+'">';
	html += '<div ';
	if (!ie6) {
		html += 'style="';
		if (!ie7) html += 'margin-left:-5px; margin-right:-5px; ';
		html += 'margin-top:-7px; margin-bottom:-7px; overflow:visible; position:relative;"';
	}
	html += '>';
	html += content;
	html += '</div></td>';
	html += '<td width="24" height="*" class="png" background="'+png(bubble_uri+'_mr.png', true)+'">'+spacer(24,1)+'</td>';
	html += '</tr><tr>';
	html += '<td width="24" height="17"><img class="png" src="'+png(bubble_uri+'_bl.png', true)+'" width="24" height="17"/></td>';
	html += '<td width="*" height="17" class="png" background="'+png(bubble_uri+'_bm.png', true)+'">'+spacer(1,17)+'</td>';
	html += '<td width="24" height="17"><img class="png" src="'+png(bubble_uri+'_br.png', true)+'" width="24" height="17"/></td>';
	html += '</tr></table>';
	return html;
}

function get_chat_balloon(color, username, chat_text) {
	// get HTML for speech bubble with optional avatar and username
	// color should be 'grey' or 'blue'
	var html = '<div class="chat_msg_bubble"><table><tr><th valign="bottom" onClick="Nav.go(\'User/'+username+'\')" style="cursor:pointer;" title="'+username+'">';
	// html += '<a href="#User/'+username+'">';
	html += get_buddy_icon_display(username, true, false);
	// html += '</a>';
	html += '</th>';
	
	var user_span = '';
	user_span += '<span class="chat_msg_text"';
	user_span += '>';
	user_span += chat_text;
	user_span += '</span>';
	
	html += '<td valign="bottom"';
	// if (username) html += ' style="padding-bottom:8px;"';
	html += '>';
	
	html += get_speech_bubble( color, user_span );
	html += '</td></tr></table></div>';
	
	return html;
}

function bar(count, max, width) {
	// return custom horizontal bar
	if (!max) max = 1; // prevent divide by zero
	var a_width = Math.floor( (count / max) * width );
	var b_width = Math.floor( ((max - count) / max) * width );
	
	var html = '';
	html += '<div style="width:'+width+'px; height:14px;">';
	html += '<div class="bar_inner" style="width:'+a_width+'px;">';
	html += '</div>';
	html += '</div>';
	
	/* html += '<div style="width:'+width+'px; height:14px; position:relative; -webkit-box-shadow: rgba(0,0,0,0.1) 2px 2px 2px; -moz-box-shadow: rgba(0,0,0,0.1) 2px 2px 2px;">';
	if (a_width) html += '<div style="float:left; width:'+a_width+'px; height:14px; background-color:#397dbb"></div>';
	if (b_width) html += '<div style="float:left; width:'+b_width+'px; height:14px; background-color:#092d6b"></div>';
	html += '<div class="clear"></div>';
	html += '</div>'; */
	return html;
}

function get_ticket_number_disp(num) {
	// return 4-digit number padded with zeros, and leading hashmark
	num = num.toString();
	// while (num.length < 4) num = "0" + num;
	return "#" + num;
}

function png(url, no_alpha_dither) {
	// convert URL to GIF for IE 6
	if (ie6 && url.match(/\.png/)) {
		if (url.match(/^images\//)) {
			url = url.replace(/^images\//, '/effect/api/image/');
		}
		else if (url.match(/^\/effect\/images\//)) {
			url = url.replace(/^\/effect\/images\//, '/effect/api/image/');
		}
		if (url.match(/\?/)) url += '&'; else url += '?';
		url += 'format=gif';
		if (no_alpha_dither) url += '&noalphadither=1';
	}
	return url;
}