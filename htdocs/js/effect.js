// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

/**
 * Effect IDE 1.0
 * Author: Joseph Huckaby
 **/

var session = {
	inited: false,
	api_mod_cache: {},
	query: parseQueryString( ''+location.search ),
	cookie: new CookieTree({ path: '/effect/' }),
	storage: {},
	storage_dirty: false,
	hooks: {
		keys: {}
	},
	username: '',
	em_width: 11,
	audioResourceMatch: /\.mp3$/i,
	imageResourceMatch: /\.(jpe|jpeg|jpg|png|gif)$/i,
	textResourceMatch: /\.xml$/i,
	movieResourceMatch: /\.(flv|mp4|mp4v|mov|3gp|3g2)$/i,
	imageResourceMatchString: '\.(jpe|jpeg|jpg|png|gif)$'
};
session.debug = session.query.debug ? true : false;

var page_manager = null;

var preload_icons = [];

var preload_images = [
	'loading.gif',
	'aquaprogressbar.gif', 
	'aquaprogressbar_bkgnd.gif'
];

function get_base_url() {
	return protocol + '://' + location.hostname + session.config.BaseURI;
}

function effect_init() {
	// initialize application, called from page
	// master entry point
	if (session.inited) return;
	session.inited = true;
	
	assert( window.config, "Config not loaded" );
	session.config = window.config;
	
	Debug.trace("Starting up");
	
	rendering_page = false;
	
	preload();
	
	// precalculate some common reg exps
	window.$R = {};
	for (var key in config.RegExpShortcuts) {
		$R[key] = new RegExp( config.RegExpShortcuts[key] );
	}
	
	// setup word wrap
	ww_precalc_font("body", "effect_precalc_font_finish");
	
	// setup page manager
	page_manager = new Effect.PageManager( config.Pages.Page );
	
	// check for cookie
	var session_id = session.cookie.get('effect_session_id');
	if (session_id && session_id.match(/^login/)) {
		// login from cookie
		do_session_recover();
	}
	else {
		// no session id
		show_default_login_status();
		Nav.init();
	}
	
	// Documentation Sidebar
	Blog.search({
		// path: '/docs',
		stag: 'sidebar_docs',
		limit: 20,
		title_only: true,
		sort_by: 'seq',
		sort_dir: -1,
		target: 'd_sidebar_documents',
		outer_div_class: 'sidebar_blog_row',
		title_class: 'sidebar_blog_title',
		after: '<div class="sidebar_see_more">&rarr; <a href="#ArticleCategory/docs">See More...</a></div>'
	});
	
	// Tutorials Sidebar
	Blog.search({
		// path: '/tutorials',
		stag: 'sidebar_tutorials',
		limit: 5,
		title_only: true,
		sort_by: 'seq',
		sort_dir: -1,
		target: 'd_sidebar_tutorials',
		outer_div_class: 'sidebar_blog_row',
		title_class: 'sidebar_blog_title',
		after: '<div class="sidebar_see_more">&rarr; <a href="#ArticleCategory/tutorials">See More...</a></div>'
	});
	
	// Plugins Sidebar
	Blog.search({
		// path: '/plugins',
		stag: 'sidebar_plugins',
		limit: 5,
		title_only: true,
		sort_by: 'seq',
		sort_dir: -1,
		target: 'd_sidebar_plugins',
		outer_div_class: 'sidebar_blog_row',
		title_class: 'sidebar_blog_title',
		after: '<div class="sidebar_see_more">&rarr; <a href="#ArticleCategory/plugins">See More...</a></div>'
	});
	
	// hook enter key on search bar
	$('fe_search_bar').onkeydown = delay_onChange_input_text;
	
	// start monitoring user storage changes
	user_storage_idle();
}

function effect_precalc_font_finish(width, height) {
	session.em_width = width;
}

function preload() {
	// preload images that are used frequently in app
	for (var idx = 0, len = preload_icons.length; idx < len; idx++) {
		var url = images_uri + '/icons/' + preload_icons[idx] + '.gif';
		preload_icons[idx] = new Image();
		preload_icons[idx].src = url;
	}
	for (var idx = 0, len = preload_images.length; idx < len; idx++) {
		var url = images_uri + '/' + preload_images[idx];
		preload_images[idx] = new Image();
		preload_images[idx].src = url;
	}
}

function $P(id) {
	// shortcut for page_manager.find()
	if (!id) id = page_manager.current_page_id;
	var page = page_manager.find(id);
	assert( !!page, "Failed to locate page: " + id );
	return page;
}

function get_pref(name) {
	if (!session.user || !session.user.Preferences) return alert("ASSERT FAILURE!  Tried to lookup pref " + name + " and user is not yet loaded!");
	return session.user.Preferences[name];
}

function get_bool_pref(name) {
	return (get_pref(name) == 1);
}

function set_pref(name, value) {
	session.user.Preferences[name] = value;
}

function set_bool_pref(name, value) {
	set_pref(name, value ? '1' : '0');
}

function save_prefs() {
	// save selected, or all prefs
	var prefs_to_save = {};
	if (arguments.length) {
		for (var idx = 0, len = arguments.length; idx < len; idx++) {
			var key = arguments[idx];
			prefs_to_save[key] = get_pref(key);
		}
	}
	else prefs_to_save = session.user.Preferences;
	
	effect_api_mod_touch('user_get');
	effect_api_send('user_update', {
		Username: session.username,
		Preferences: prefs_to_save
	}, 'save_prefs_2');
}

function save_prefs_2(response) {
	do_message('success', 'Preferences saved.');
}

function get_full_name(username) {
	// return full name given username
	var user = session.users[username];
	if (!user) return username;
	return user.FullName;
}

function get_buddy_icon_url(username, size) {
	var mod = session.api_mod_cache.get_buddy_icon || 0;
	if (!size) size = 32;
	var url = '/effect/api/get_buddy_icon?username='+username + '&mod=' + mod + '&size=' + size;
	return url;
}

function get_buddy_icon_display(username, show_icon, show_name) {
	// get HTML for buddy icon display, possibly including name
	if ((typeof(show_icon) == 'undefined') && get_bool_pref('show_user_icons')) show_icon = 1;
	if ((typeof(show_name) == 'undefined') && get_bool_pref('show_user_names')) show_name = 1;
	var html = '';
	if (show_icon) html += '<img class="png" src="'+get_buddy_icon_url(username)+'" width="32" height="32" border="0"/>';
	if (show_icon && show_name) html += '<br/>';
	if (show_name) html += username;
	return html;
}

function do_session_recover() {
	// show_progress_dialog(1, "Logging in...");
	session.hooks.after_error = 'do_logout';
	effect_api_send('session_recover', {}, 'do_login_2', { _from_recover: 1 } );
}

function require_login() {
	// return true if logged in, false and display login prompt otherwise
	if (session.user) return true;
	
	Debug.trace('Page requires login, showing login page');
	
	session.nav_after_login = Nav.currentAnchor();
	setTimeout( function() {
		Nav.go( 'Login' );
	}, 1 );
	
	// do_login_prompt();
	return false;
}

function popup_window(url, name) {
	// popup URL in new window, and make sure it worked
	if (!url) url = '';
	if (!name) name = '';
	var win = window.open(url, name);
	if (!win) return alert('Failed to open popup window.  If you have a popup blocker, please disable it for this website and try again.');
	return win;
}

function do_login_prompt() {
	// show login prompt -- part 1, username only (floating dialog box)
	hide_popup_dialog();
	delete session.progress;
	
	if (!session.temp_password) session.temp_password = ''; // pre-populate from create account
	if (!session.username) session.username = '';
	
	var temp_username = session.open_id || session.username || '';
		
	var html = '';
	
	html += '<div class="dialog_bkgnd" style="background-image:url('+png('images/big_icons/key.png')+')">';
	
	html += '<table cellspacing=0 cellpadding=0><tr><td width=450 height=225 valign=center align=center>';
	html += '<div class="dialog_title">Effect Developer Login</div>';
	
	html += '<form method=get action="javascript:void(0)"><table cellspacing="0" cellpadding="0"><tr><td align="left">';
	html += '<div class="fe_label"><table cellspacing="0" cellpadding="0"><tr><td>Effect Username&nbsp;&nbsp;or&nbsp;&nbsp;</td><td>'+icon('openid', 'OpenID', 'popup_window(\'http://openid.net/\')', 'What is OpenID?')+'</td></tr></table></div><input type=text class="fe_big" id="fe_username" size=20 value="'+temp_username+'"><br><br>';
	
	html += '<input type=checkbox id="fe_auto_login" value="1"><label for="fe_auto_login"><span class="fe_label">Keep me logged in</span></label><br>';
	html += '</td></tr></table>';
	
	html += '<br><br><table><tr>';
		html += '<td>' + large_icon_button('x', 'Cancel', "clear_login()") + '</td>';
		html += '<td width=30>&nbsp;</td>';
		// html += '<td>' + large_icon_button('user', 'Create Account...', "Nav.go('CreateAccount')") + '</td>';
		// html += '<td width=15>&nbsp;</td>';
		html += '<td>' + large_icon_button('check', '<b>Login</b>', 'do_login()') + '</td>';
	html += '</tr></table>';
	
	html += '</form>';
	
	html += '</div>';
	
	session.hooks.keys[ENTER_KEY] = 'do_login'; // enter key
	session.hooks.keys[ESC_KEY] = 'clear_login'; // escape key
	
	safe_focus( 'fe_username' );
	
	show_popup_dialog(450, 225, html);
}

function do_login_prompt_2() {
	// show login prompt -- part 2, password only (floating dialog box)
	hide_popup_dialog();
	delete session.progress;
	
	if (!session.temp_password) session.temp_password = ''; // pre-populate from create account
	if (!session.username) session.username = '';
		
	var html = '';
	
	html += '<div class="dialog_bkgnd" style="background-image:url('+png('images/big_icons/key.png')+')">';
	
	html += '<table cellspacing=0 cellpadding=0><tr><td width=450 height=225 valign=center align=center>';
	html += '<div class="dialog_title">Enter Your Password</div>';
	
	html += '<form method=get action="javascript:void(0)"><table cellspacing="0" cellpadding="0"><tr><td align="left">';
	html += '<div class="fe_label">Password:</div><input type=password class="fe_big" id="fe_lp_password" size=20 value="'+session.temp_password+'"><br><br>';
	
	html += '<input type=checkbox id="fe_auto_login" value="1" '+(session.auto_login ? 'checked="checked"' : '')+'><label for="fe_auto_login"><span class="fe_label">Keep me logged in</span></label><br>';
	html += '</td></tr></table>';
	
	html += '<br><br><table><tr>';
		html += '<td>' + large_icon_button('x', 'Cancel', "clear_login()") + '</td>';
		html += '<td width=30>&nbsp;</td>';
		// html += '<td>' + large_icon_button('user', 'Create Account...', "Nav.go('CreateAccount')") + '</td>';
		// html += '<td width=15>&nbsp;</td>';
		html += '<td>' + large_icon_button('check', '<b>Login</b>', 'do_effect_login()') + '</td>';
	html += '</tr></table>';
	
	html += '</form>';
	
	html += '</div>';
	
	session.hooks.keys[ENTER_KEY] = 'do_effect_login'; // enter key
	session.hooks.keys[ESC_KEY] = 'clear_login'; // escape key
	
	safe_focus( 'fe_lp_password' );
	
	show_popup_dialog(450, 225, html);
}

function clear_login() {
	// clear login dialog
	hide_popup_dialog();
	Nav.prev();
}

function do_login() {
	// grab information from login form and send to server
	session.username = $('fe_username').value;
	session.auto_login = $('fe_auto_login').checked;
	do_login_prompt_2();
	return;
}

function do_effect_login() {
	// standard effect login with username/password
	// (username collected before)
	var password = $('fe_lp_password').value;
	session.auto_login = $('fe_auto_login').checked;
	
	hide_popup_dialog();
	show_progress_dialog(1, "Logging in...");
	
	session.hooks.after_error = 'do_login_prompt';
	
	effect_api_send('user_login', {
		Username: session.username,
		Password: password,
		Infinite: session.auto_login ? 1 : 0
	}, 'do_login_2');
}

function do_logout() {
	// reset everything and show login screen
	effect_api_send('user_logout', {}, 'do_logout_2');
}

function do_logout_2(response) {
	// continue logging out
	hide_popup_dialog();
	show_default_login_status();
	
	delete session.hooks.after_error;
	
	delete session.cookie.tree.effect_session_id;
	session.cookie.save();
	
	session.storage = {};
	session.storage_dirty = false;
	
	delete session.user;
	delete session.first_login;
	
	var old_username = session.username;
	session.username = '';
	
	if (Nav.inited) {
		// navigation system already initialized (user clicking 'Logout')
		// so go to main page
		Nav.go('Main');
		if (old_username) $GR.growl('success', "Logged out of account: " + old_username);
	}
	else {
		// nav not init'ed, so this is a session recover error (session timeout or whatnot)
		// just call init and allow the current anchor to activate (will show login screen if needed)
		Nav.init();
	}
}

function do_login_2(response, tx) {
	// receive login (or sesssion_recover) response from server
	if (response.FirstLogin) session.first_login = 1;
	
	if (response.User.UserStorage) {
		Debug.trace('Recovering site storage blob: session.storage = ' + response.User.UserStorage + ';');
		try {
			eval( 'session.storage = ' + response.User.UserStorage + ';' );
		}
		catch (e) {
			Debug.trace("SITE STORAGE RECOVERY FAILED: " + e);
			session.storage = {};
		}
		delete response.User.UserStorage;
		session.storage_dirty = false;
	}
	
	session.user = response.User;
	session.username = session.user.Username;
	
	hide_popup_dialog();
	delete session.hooks.after_error;
	
	// update login status section of header
	update_header();
	
	if (!tx || !tx._from_recover) $GR.growl('success', "Logged in as: " + session.username);
	
	// re-nav to current page
	if (session.nav_after_login) {
		Nav.go( session.nav_after_login );
		delete session.nav_after_login;
	}
	else if (Nav.currentAnchor().match(/^Login/)) {
		Nav.go('Home');
	}
	else {
		Nav.refresh();
	}
	Nav.init();
	
	if (session.config.MaintenanceMode) {
		setTimeout( function() { do_notice(session.config.MaintenanceMode.Title, session.config.MaintenanceMode.Description); }, 1000 );
	}
}

function user_storage_mark() {
	// mark user storage as dirty, will commit at next interval
	Debug.trace("Marking user storage as dirty");
	session.storage_dirty = true;
}

function user_storage_idle() {
	if (session.storage_dirty && !session.mouseIsDown) {
		user_storage_save();
		session.storage_dirty = false;
	}
	setTimeout( 'user_storage_idle()', 5000 );
}

function user_storage_save() {
	if (session.user) {
		Debug.trace("Committing user storage blob");
		effect_api_send('update_user_storage', { Data: serialize(session.storage) }, 'user_storage_save_finish', { _silent: 1 } );
	}
}

function user_storage_save_finish(response, tx) {
	// nothing to do here (silent call)
}

function show_default_login_status() {
	// show login / create account links
	/* $('d_login_status').innerHTML = 
		icon('key', '<b>Login</b>', "#Home") + spacer(1,4) + "<br/>" + 
		icon('user_add.png', '<b>Create Account</b>', "#CreateAccount"); */
	/* $('d_login_status').innerHTML = '<nobr>' + 
		'<a href="#Home">Login</a> | ' + 
		'<a href="#CreateAccount">Create Account</a>' + 
	'</nobr>'; */
	$('d_sidebar_wrapper_recent_games').hide();
	
	$('d_login_status').innerHTML = '<center><table><tr><td>' + 
		large_icon_button('key', "<b>Login</b>", '#Home') + '</td>' + 
		'<td>' + spacer(1,1) + '<td>' + 
		'<td>' + large_icon_button('user_add.png', "<b>Signup</b>", '#CreateAccount') + '</td></tr></table>' + 
		'</center>';
	
	$('d_tagline').innerHTML = 
		'<a href="#Home">Login</a>' + ' <span class="spacer">|</span> ' + 
		'<a href="#CreateAccount">Create Account</a>';
}

function update_header() {
	// show login status in header
	var html = '';
	// html += '<center>';
	html += '<table><tr><td>';
	html += '<a href="#Home">';
	html += '<img class="png" src="'+get_buddy_icon_url(session.username) + '" width="32" height="32" border="0"/>';
	html += '</a>';
	// html += '<br>';
	html += '</td><td>'+spacer(2,2)+'</td><td>';
	// html += '<nobr>Logged in as ' + session.username + '</nobr><br>';
	html += session.user.FullName + '<br/>';
	html += spacer(1,5) + '<br/>';
	// html += '<nobr>';
	html += '<a href="#Home"><b>My Home</b></a>&nbsp;&nbsp;|&nbsp;&nbsp;';
	// html += '<a href="#MyAccount"><b>Account</b></a> | ';
	html += '<a href="javascript:void(0)" onClick="do_logout()">Logout</a>';
	// html += '</nobr>';
	html += '</td></tr></table>';
	// html += '</center>';
	$('d_login_status').innerHTML = html;
	
	$('d_tagline').innerHTML = 
		'Welcome '+session.user.FirstName+'' + ' <span class="spacer">|</span> ' + 
		'<a href="#Home">My Home</a>' + ' <span class="spacer">|</span> ' + 
		'<a href="javascript:void(0)" onClick="do_logout()">Logout</a>';
	
	if (session.config.MaintenanceMode) {
		$('d_tagline').innerHTML += '<br/><br/><p align="right">(Maintenance Mode)</p>';
	}
	
	// recent games
	effect_api_get( 'get_user_games', { limit:5, offset:0 }, 'receive_sidebar_recent_games', { } );
}

function receive_sidebar_recent_games(response, tx) {
	// receive game list from server
	var html = '';
	
	if (response.Rows && response.Rows.Row) {
		var games = always_array( response.Rows.Row );
		
		for (var idx = 0, len = games.length; idx < len; idx++) {
			var game = games[idx];
			html += '<div class="sidebar_blog_row">';
			html += '<div class="sidebar_blog_title"><a href="#Game/'+game.GameID+'">'+ww_fit_string(game.Title, 170, session.em_width, 1)+'</a></div>';
			html += '</div>';
		} // foreach game
		
		// if (games.length == 5) html += '<div class="sidebar_see_more">&rarr; <a href="#Home">See All...</a></div>';
		
		html += '<div class="sidebar_see_more">&rarr; <a href="#GameEdit">Create New Game...</a></div>';
		
		$('d_sidebar_recent_games').innerHTML = html;
		$('d_sidebar_wrapper_recent_games').show();
	}
	else {
		$('d_sidebar_wrapper_recent_games').hide();
	}
}

/* 
outer_div_class: 'sidebar_blog_row',
title_class: 'sidebar_blog_title',
after: '<div class="sidebar_see_more">&rarr; <a href="#ArticleCategory/plugins">See More...</a></div>'
*/

function check_privilege(key) {
	// make sure user has privilege
	// Note to hackers: changing this function is meaningless, we validate this on the server
	if (!session.user) return false;
	if (session.user.Privileges.admin == 1) return true; // admin can do everything
	if (!key.toString().match(/^\//)) key = '/' + key;
	var value = lookup_path(key, session.user.Privileges);
	return( value && (value != 0) );
}

function is_admin() {
	// return true if user is admin, false otherwise
	// Note to hackers: changing this function is meaningless, we validate this on the server
	return check_privilege('admin');
}

// user utilities

function upgrade_flash_error() {
	return alert("Sorry, file upload requires Adobe Flash Player 9 or higher.");
}

function cancel_user_image_manager() {
	upload_destroy();
	hide_popup_dialog();
	delete session.hooks.keys[DELETE_KEY];
}

function do_user_image_manager(callback) {
	// show user manager dialog
	if (callback) session.uim_callback = callback;
	else session.uim_callback = null;
	
	session.temp_last_user_img = null;
	session.temp_last_user_image_filename = '';
	
	var html = '<table cellspacing=0 cellpadding=0><tr><td width=500 height=300 valign=center align=center>';
	html += '<div class="dialog_title">Image Manager</div>';
	
	html += '<div class="vert_selector" id="d_user_image_list" style="width:480px; height:200px;">';
	html += '<img src="images/loading.gif" width="32" height="32" style="margin-left:174px; margin-top:84px"/>';
	html += '</div>';
	
	html += '<br><table><tr>';
		html += '<td>' + large_icon_button('x', 'Cancel', 'cancel_user_image_manager()') + '</td>';
		html += '<td width=25>&nbsp;</td>';
		html += '<td>' + large_icon_button('bullet_upload.png', 'Upload Files...', 'upload_basic()', 'b_upload_user_image') + '</td>';
		html += '<td width=25>&nbsp;</td>';
		html += '<td>' + large_icon_button('check', '<b>Choose</b>', 'do_choose_user_image()', 'btn_choose_user_image', '', 'disabled') + '</td>';
	html += '</tr></table>';
	html += '</td></tr></table>';
	
	session.hooks.keys[ENTER_KEY] = 'do_choose_user_image'; // enter key
	session.hooks.keys[ESC_KEY] = 'cancel_user_image_manager'; // escape key
	session.hooks.keys[DELETE_KEY] = 'do_delete_selected_user_image';
	
	show_popup_dialog(500, 300, html);
	
	var self = this;
	setTimeout( function() {
		prep_upload('b_upload_user_image', '/effect/api/upload_user_image', [self, 'do_upload_user_image_2'], ['Image Files', '*.jpg;*.jpe;*.jpeg;*.gif;*.png']);
	}, 1 );
	
	var args = {
		limit: 50,
		offset: 0,
		random: Math.random()
	};
	effect_api_get( 'user_images_get', args, 'uim_populate_images', { } );
}

function do_upload_user_image_2() {
	// check for upload error
	effect_api_mod_touch('user_images_get');
	effect_api_send('user_get', {
		Username: session.username
	}, [this, 'do_upload_user_image_3']);
}

function do_upload_user_image_3(response) {
	if (response.User.LastUploadError) return do_error( "Failed to upload image: " + response.User.LastUploadError );
	do_user_image_manager( session.uim_callback );
}

function uim_populate_images(response, tx) {
	// receive list of previously uploaded user images from server
	var html = '';
	var base_url = '/effect/api/view/users/' + session.username + '/images';
	
	if (response.Rows && response.Rows.Row) {
		var imgs = always_array( response.Rows.Row );
		for (var idx = 0, len = imgs.length; idx < len; idx++) {
			var img = imgs[idx];
			var class_name = ((img.Filename == session.temp_last_user_image_filename) ? 'choose_item_selected' : 'choose_item');
			html += '<img class="'+class_name+'" src="'+base_url+'/'+img.Thumbnail+'" width="80" height="60" onClick="do_select_user_image(this,\''+img.Filename+'\')" onDblClick="do_select_user_image(this,\''+img.Filename+'\'); do_choose_user_image();">';
		} // foreach image
	} // user has images
	else {
		// no images found
		html = '';
	}
	
	$('d_user_image_list').innerHTML = html;
}

function do_select_user_image(img, filename) {
	// click on user image in dialog
	if (session.temp_last_user_img) session.temp_last_user_img.className = 'choose_item';
	img.className = 'choose_item_selected';
	
	$('btn_choose_user_image').removeClass('disabled');
	
	session.temp_last_user_img = img;
	session.temp_last_user_image_filename = filename;
}

function do_delete_selected_user_image() {
	// delete selected user image
	if (session.temp_last_user_image_filename) {
		effect_api_send('user_image_delete', { Filename: session.temp_last_user_image_filename }, 'do_delete_selected_user_image_finish', {});
	}
}

function do_delete_selected_user_image_finish(response, tx) {
	try { $('d_user_image_list').removeChild( session.temp_last_user_img ); } catch(e) {;}
	session.temp_last_user_img = null;
	session.temp_last_user_image_filename = null;
}

function do_choose_user_image() {
	if (!session.temp_last_user_image_filename) return;
	
	if (session.uim_callback) {
		fire_callback( session.uim_callback, session.temp_last_user_image_filename );
	}
	cancel_user_image_manager();
}

function user_image_thumbnail(filename, width, height, attribs) {
	// return html for rendering using image thumbnail, given MAIN image filename
	var username = session.username;
	if (filename.match(/^(\w+)\/(.+)$/)) {
		username = RegExp.$1;
		filename = RegExp.$2;
	}
	var url = '/effect/api/view/users/' + username + '/images/' + filename.replace(/\.(\w+)$/, '_thumb.jpg');
	return '<img src="'+url+'" width="'+width+'" height="'+height+'" '+compose_attribs(attribs)+'/>';
}

function get_user_display(username, full_name, base_url) {
	if (!base_url) base_url = '';
	return icon('user', full_name || username, base_url + '#User/' + username);
}

function get_game_tab_bar(game_id, cur_page_name) {
	// return HTML for game tab bar (shared between all game related pages)
	return tab_bar([
		['#Game/' + game_id, 'Game', 'controller.png'],
		// ['#GameEdit?id=' + game_id, 'Edit', 'page_white_edit.png'],
		['#GameDisplay/' + game_id, 'Display', 'monitor.png'],
		['#GameAssets/' + game_id, 'Assets', 'folder_page_white.png'],
		['#GameObjects/' + game_id, 'Objects', 'bricks.png'],
		// ['#GameFonts/' + game_id, 'Fonts', 'style.png'],
		['#GameAudio/' + game_id, 'Audio', 'sound.gif'],
		['#GameKeys/' + game_id, 'Keyboard', 'keyboard.png'],
		['#GameLevels/' + game_id, 'Levels', 'world.png'],
		// ['#GameDevelop/' + game_id, 'Develop', 'application_osx_terminal.png'],
		['#GamePublisher/' + game_id, 'Publish', 'cd.png']
		// ['#GameTestBed/' + game_id, 'Test', 'computer.png']
		// ['#GameLog/' + game_id, 'Log', 'application_view_detail.png']
	], cur_page_name);
}

function get_user_tab_bar(cur_page_name) {
	var tabs = [
		['#Home', 'My Home', 'house.png']
	];
	tabs.push( ['#MyAccount', 'Edit Account', 'user_edit.png'] );
	tabs.push( ['#ArticleEdit', 'Post Article', 'page_white_edit.png'] );
	tabs.push( ['#UserLog', 'Security Log', 'application_view_detail.png'] );
	
	return tab_bar(tabs, cur_page_name);
}

function get_admin_tab_bar(cur_page_name) {
	var tabs = [];
	tabs.push( ['#Admin', 'Admin', 'lock.png'] );
	tabs.push( ['#TicketSearch/bugs', 'Bug Tracker', 'bug.png'] );
	tabs.push( ['#TicketSearch/helpdesk', 'Help Desk', 'telephone.png'] );
	tabs.push( ['#AdminReport', 'Reports', 'chart_pie.png'] );
	return tab_bar(tabs, cur_page_name);
}

function get_string(path, args) {
	// return string from config file(s) given XPath
	// strings may contain substitution placeholders
	assert(window.config, "get_string() called before config loaded");
	
	if (!args) args = {};
	args.config = config;
	args.session = session;
	args.query = session.query;
	
	var value = lookup_path(path, config.Strings);
	return (typeof(value) == 'string') ? substitute(value, args) : value;
}

function normalize_dir_path(path) {
	// make sure directory path starts and ends with a slash
	if (!path.match(/^\//)) path = '/' + path;
	if (!path.match(/\/$/)) path += '/';
	return path;
}

function textedit_window_save(storage_key, filename, content, callback) {
	// save file from popup textedit window
	if (!callback) callback = null;
	effect_api_mod_touch('textedit');
	
	if (storage_key.match(/^\/games\/([a-z0-9][a-z0-9\-]*[a-z0-9])\/assets(.+)$/)) {
		// asset mode
		var game_id = RegExp.$1;
		var path = RegExp.$2;
		
		show_progress_dialog(1, "Saving file...");
		effect_api_send('asset_save_file_contents', {
			GameID: game_id,
			Path: path,
			Filename: filename,
			Content: content
		}, 'textedit_window_save_finish', { _mode: 'asset', _game_id: game_id, _filename: filename, _callback: callback } );
	}
	else {
		// admin mode
		show_progress_dialog(1, "Saving data...");
		effect_api_send('admin_save_file_contents', {
			Path: storage_key,
			Filename: filename,
			Content: content
		}, 'textedit_window_save_finish', { _mode: 'admin', _storage_key: storage_key, _filename: filename, _callback: callback } );
	}
}

function textedit_window_save_finish(response, tx) {
	// finish saving
	hide_progress_dialog();
	
	if (tx._mode == 'asset') {
		do_message('success', "Saved asset: \""+tx._filename+"\"");
		show_glog_widget();
	}
	else {
		// admin finish
		do_message('success', "Saved data: \""+tx._storage_key+'/'+tx._filename+"\"");
	}
	
	if (tx._callback) tx._callback();
}

function show_glog_widget(game_id) {
	if (!game_id) game_id = session.glog_game_id;
	if (!game_id) {
		$('glog_widget').hide();
		return;
	}
	if (game_id != session.glog_game_id) {
		// if game has changed, or is first time, update immediately
		$('glog_widget').hide();
		session.glog_game_id = game_id;
		update_glog_widget(game_id);
	}
	else {
		$('glog_widget').show();
		setTimeout( function() { update_glog_widget(game_id); }, 500 );
	}
}

function update_glog_widget(game_id) {
	effect_api_get('game_get_log', { 
		id: game_id,
		offset: 0,
		limit: 1,
		rand: Math.random()
	}, 'receive_glog_data', { _game_id: game_id });
}

function receive_glog_data(response, tx) {
	var game_id = tx._game_id;
	
	if (response && response.Rows && response.Rows.Row) {
		var rows = always_array( response.Rows.Row );
		var row = rows[0];
		var html = '';
	
		// html += '<h2>Latest Game Activity</h2>';
		html += '<div class="h2" style="margin-bottom:5px;">';
			html += '<div class="fl">Latest Game Activity</div>';
			html += '<div class="fr"><a href="#GameLog/'+game_id+'" title="View Log" class="icon" style="margin-left:5px; background-image:url(images/icons/application_view_detail.png)">View Log</a></div>';
			html += '<div class="fr"><a href="javascript:void(show_glog_post_dialog(\''+game_id+'\'))" title="Post Message" class="icon" style="margin-left:5px; background-image:url(images/icons/comment_edit.png)">Post Message</a></div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		
		// html += '<div class="fl">';
			html += '<table><tr>';
				html += '<td style="cursor:pointer" onClick="Nav.go(\'User/'+row.Username+'\')">' + get_buddy_icon_display(row.Username, 1, 0) + '</td>';
				html += '<td>';
					// html += '<div class="fe_label" style="margin:0">' + row.Message + '</div>';
					html += '<div>' + icon( get_icon_for_glog_type(row.Type), '<span class="fe_label">'+row.Message+'</span>' ) + '</div>';
					html += '<div class="caption" style="margin-top:2px;">' + get_relative_date(row.Date, true) + '</div>';
				html += '</td>';
			html += '</tr></table>';
		// html += '</div>';
		
		/* html += '<div class="fr" style="margin-top:2px">';
			html += '<div class="little_button_stack" style="margin-right:0px;">' + large_icon_button('page_white_edit.png', 'Post Message...', "glog_post()") + '<div class="clear"></div></div>';
			html += '<div class="clear"></div>';
		html += '</div>'; */
		
		// html += '<div class="clear"></div>';
	
		$('glog_widget').innerHTML = html;
		$('glog_widget').show();
		
		/* setTimeout( function() {
			$('fe_glog_text').onkeydown = delay_onChange_input_text;
		}, 1 ); */
	}
}

function show_glog_post_dialog(game_id) {
	hide_popup_dialog();
	delete session.progress;

	var html = '';

	html += '<div class="dialog_bkgnd" style="background-image:url('+png('/effect/images/big_icons/pencil_paper.png')+')">';

	html += '<table cellspacing=0 cellpadding=0><tr><td width=500 height=175 valign=center align=center>';
	html += '<div class="dialog_title">Post Game Log Message</div>';

	html += '<form method=get action="javascript:void(0)"><table cellspacing="0" cellpadding="0"><tr><td align="left">';
	
	html += '<textarea class="fe_edit" id="fe_glog_body" style="width:300px; height:50px;" wrap="virtual" onkeydown="return catchTab(this,event)"></textarea>';
	html += '<div class="caption">Enter your log message here.  Plain text only please.</div>';
	
	html += '</td></tr></table>';

	html += '<br><br><table><tr>';
		html += '<td>' + large_icon_button('x', 'Cancel', "hide_popup_dialog()") + '</td>';
		html += '<td width=50>&nbsp;</td>';
		// html += '<td>' + large_icon_button('user', 'Create Account...', "Nav.go('CreateAccount')") + '</td>';
		// html += '<td width=15>&nbsp;</td>';
		html += '<td>' + large_icon_button('check', '<b>Post Message</b>', "glog_post('"+game_id+"')") + '</td>';
	html += '</tr></table>';

	html += '</form>';

	html += '</div>';

	// session.hooks.keys[ENTER_KEY] = [Comments, 'post', page_id]; // enter key
	session.hooks.keys[ESC_KEY] = 'hide_popup_dialog'; // escape key

	safe_focus( 'fe_glog_body' );

	show_popup_dialog(500, 175, html);
}

function glog_post(game_id) {
	var msg = trim( $('fe_glog_body').value );
	if (msg) {
		hide_popup_dialog();
		effect_api_send('game_post_log', {
			GameID: game_id,
			Message: msg
		}, [this, 'glog_post_finish'], { _game_id: game_id });
	}
}

function glog_post_finish(response, tx) {
	show_glog_widget( tx._game_id );
}

function hide_glog_widget() {
	$('glog_widget').hide();
}

function get_icon_for_glog_type(type) {
	var icon = 'page_white.png';
	switch (type) {
		case 'asset': icon = 'folder_page_white.png'; break;
		case 'game': icon = 'controller.png'; break;
		case 'member': icon = 'user'; break;
		case 'comment': icon = 'comment.png'; break;
		case 'level': icon = 'world.png'; break;
		case 'sprite': icon = 'cog.png'; break;
		case 'tile': icon = 'brick.png'; break;
		case 'tileset': icon = 'color_swatch.png'; break;
		case 'rev': icon = 'cd.png'; break;
		case 'revision': icon = 'cd.png'; break;
		case 'font': icon = 'style.png'; break;
		case 'key': icon = 'keyboard.png'; break;
		case 'audio': icon = 'sound'; break;
		case 'env': icon = 'weather.png'; break;
		case 'environment': icon = 'weather.png'; break;
	}
	return icon;
}
