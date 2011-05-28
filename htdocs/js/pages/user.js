// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.Home", {
	
	onActivate: function(args) {
		// page is being activated
		if (!args) args = {};
		
		if (!require_login()) {
			return false;
		}
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home']
		);
		Nav.title('My Home');
		
		// tab bar
		$('d_home_tab_bar').innerHTML = get_user_tab_bar('My Home');
		
		$('d_blog_my_articles').innerHTML = loading_image();
		$('d_user_home_summary').innerHTML = loading_image();
		$('d_user_games').innerHTML = loading_image();
		$('d_user_article_drafts').innerHTML = loading_image();
		
		// fetch user games
		effect_api_get( 'get_user_games', { limit:50, offset:0 }, [this, 'receive_user_games'], { } );
		
		// fetch user articles
		Blog.search({
			user: session.username,
			key: 'articles',
			limit: 5,
			target: 'd_blog_my_articles',
			more: 1
		});
		
		// fetch user article drafts
		Blog.search({
			user: session.username,
			key: 'article_drafts',
			limit: 50,
			callback: [this, 'receive_article_drafts']
		});
		
		// user summary
		var html = '';
		
		// user stats
		html += render_user_stats( session.user.Stats );
		
		// user info
		html += '<table><tr>';
		html += '<td><img class="png" src="'+get_buddy_icon_url(session.username, 64) + '" /></td>';
		html += '<td>'+spacer(2,2)+'</td>';
		html += '<td>';
			html += '<b>' + session.user.FullName + '</b> ('+session.username+')<br/>';
			html += session.user.Email;
		html += '</td>';
		html += '</tr></table>';
		
		html += '<br/>';
		html += '<table>';
		html += '<tr><td class="fe_label" align="right">Account Type:</td><td>' + session.user.AccountType + '</td></tr>';
		html += '<tr><td class="fe_label" align="right">Member Since:</td><td>' + get_nice_date( session.user._Attribs.Created ) + '</td></tr>';
		html += '</table>';
		
		html += '<br/>';
		// html += icon('application_view_detail.png', "<b>View Security Access Log</b>", '#UserLog');
		// html += '<a href="#UserLog"><b>View Security Access Log</b></a>';
		// html += '<div class="little_button_stack">' + large_icon_button('user_edit.png', "<b>Edit Account...</b>", '#MyAccount') + '<div class="clear"></div></div>';
		
		if (is_admin()) {
			html += '<div class="little_button_stack">' + large_icon_button('lock.png', "<b>Site Admin...</b>", '#Admin') + '<div class="clear"></div></div>';
		}
		
		// html += '<div class="little_button_stack">' + large_icon_button('application_view_detail.png', "<b>Security Log...</b>", '#UserLog') + '<div class="clear"></div></div>';
		
		html += '<div class="little_button_stack">' + large_icon_button('delete.png', "<b>Logout</b>", 'do_logout()') + '<div class="clear"></div></div>';
		
		html += '<div class="clear"></div>';
		
		$('d_user_home_summary').innerHTML = html;
		$('d_user_home_blurb').hide();
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		$('d_home_tab_bar').innerHTML = '';
		$('d_blog_my_articles').innerHTML = '';
		$('d_user_home_summary').innerHTML = '';
		$('d_user_games').innerHTML = '';
		$('d_user_article_drafts').innerHTML = '';
		return true;
	},
	
	receive_user_games: function(response, tx) {
		// receive list of user games from server
		var html = '';
		
		if (response.Rows && response.Rows.Row) {
			var games = always_array( response.Rows.Row );
			
			for (var idx = 0, len = games.length; idx < len; idx++) {
				var game = games[idx];
				html += '<div class="game_thumb" onClick="Nav.go(\'Game/'+game.GameID+'\')">' + 
					(game.Logo ? 
						user_image_thumbnail(game.Logo, 80, 60) : 
						'<img class="png" src="/effect/images/logo_80_60.png" width="80" height="60"/>'
					) + '<br/>' + ww_fit_box(game.Title, 80, 2, session.em_width, 1) + '</div>';
			} // foreach game
			
			html += '<div class="clear"></div>';
		}
		else {
			html += 'You aren\'t a member of any games yet.  Why not <a href="#GameEdit"><b>create a new one?</b></a>';
		}
		
		$('d_user_games').innerHTML = html;
	},
	
	receive_article_drafts: function(response, args) {
		// receive articles in progress (drafts)
		if (response.Rows && response.Rows.Row) {
			var html = '<table class="data_table">';
			html += '<tr><th>Article Title</th><th>Category</th><th>Last Modified</th></tr>';
			
			var drafts = always_array( response.Rows.Row );
			for (var idx = 0, len = drafts.length; idx < len; idx++) {
				var draft = drafts[idx];
				
				var category_def = find_object( session.article_categories.Category, { Path: draft.Path } );
				if (!category_def) category_def = { Title: draft.Path };
				var cat_title = category_def.Title;
				
				html += '<tr>';
				html += '<td>' + icon('page_white_edit.png', '<b>'+draft.Title+'</b>', '#ArticleEdit?path=' + draft.Path + '&id=' + draft.ArticleID ) + '</td>';
				html += '<td>' + cat_title + '</td>';
				html += '<td>' + get_nice_date_time( draft._Attribs.Modified ) + '</td>';
				html += '</tr>';
			} // foreach draft
			
			html += '</table>';
			
			$('d_user_article_drafts').innerHTML = html;
			$('d_user_article_drafts_wrapper').show();
		}
		else {
			$('d_user_article_drafts_wrapper').hide();
		}
	}
	
} );

Class.subclass( Effect.Page, "Effect.Page.CreateAccount", {
	
	onActivate: function() {
		// page is being activated
		Nav.bar(
			['Main', 'EffectGames.com'],
			['CreateAccount', 'Create Account']
		);
		Nav.title('Create Account');
		
		if (!session.prereg) session.prereg = {};
		
		var html = '';
		
		html += '<form method=get action="javascript:void(0)">';
		
		// html += begin_section('blue_border', 24, 'png');
		html += '<div>'+tab_bar([['#Login', 'Login', 'key.gif'], ['#CreateAccount', 'Create Account', 'user.gif']], 'Create Account')+'</div>';
		html += '<div class="game_main_area">';
		
		html += '<h1>Create New Account</h1>';

		html += '<table style="margin:20px;">';

		html += '<tr><td align=right class="fe_label_left">Username:</td><td align=left><input type=text id="fe_ca_username" class="fe_medium" size="20" spellcheck="false" spelling="false" maxlength="32" value=""></td></tr>';
		html += '<tr><td></td><td class="caption">This is the username you will use to login to Effect.  Please use alphanumeric characters only.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '<tr><td align=right class="fe_label_left">Password:</td><td align=left><input type=password id="fe_ca_password" class="fe_medium" size="20" maxlength="32"></td></tr>';
		html += '<tr><td></td><td class="caption">Enter a password for your account.  You will need this when you login.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';

		html += '<tr><td align=right class="fe_label_left">Verify&nbsp;Password:</td><td align=left><input type=password id="fe_ca_vpassword" class="fe_medium" size="20" maxlength="32"></td></tr>';
		html += '<tr><td></td><td class="caption">Please enter your password again for verification purposes.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';

		html += '<tr><td align=right class="fe_label_left">Full&nbsp;Name:</td><td align=left><input type=text id="fe_full_name" class="fe_medium" size="30" maxlength="256" spellcheck="false" spelling="false" value="'+str_value(session.prereg.fullname)+'"></td></tr>';
		html += '<tr><td></td><td class="caption">Enter your real first and last names.  These will be used for display purposes.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';

		html += '<tr><td align=right class="fe_label_left">Email&nbsp;Address:</td><td align=left><input type=text id="fe_email" class="fe_medium" size="30" maxlength="256" spellcheck="false" spelling="false" value="'+str_value(session.prereg.email)+'"></td></tr>';
		html += '<tr><td></td><td class="caption">Enter your email address.  This will be used to send you notifications.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,25) + '</td></tr>';

		html += '</table>';

		html += '<center><table style="margin-bottom:20px;"><tr>';
			html += '<td>' + large_icon_button('x', 'Cancel', "Nav.go('Main')") + '</td>';
			html += '<td width=50>&nbsp;</td>';
			html += '<td>' + large_icon_button('user_add.png', '<b>Create Account</b>', "$P('CreateAccount').do_create_account()") + '</td>';
		html += '</tr></table></center>';
		
		// html += end_section();
		html += '</div>';
		
		html += '</form>';
		this.div.innerHTML = html;
		safe_focus( 'fe_ca_username' );
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		this.div.innerHTML = '';
		return true;
	},
	
	do_create_account: function() {
		// create account
		clear_field_error();
		
		session.username = $('fe_ca_username').value.toLowerCase();
		if (!session.username) return bad_field('fe_ca_username', "Please enter a username for your account.");
		if (session.username.length > 32) return bad_field('fe_ca_username', "Your username is too long.  Please keep it to 32 characters or less.");
		if (!session.username.match(/^\w+$/)) return bad_field('fe_ca_username', "Sorry, that username is invalid.  Please use alphanumeric characters only.");
		if (!check_reserved_word(session.username)) return bad_field('fe_ca_username', "Sorry, that username is a reserved word.  Please choose another.");

		var password = $('fe_ca_password').value;
		if (!password) return bad_field('fe_ca_password', "Please enter a password.");
		if (password != $('fe_ca_vpassword').value) return bad_field('fe_ca_vpassword', "Your password does not match the verification password.  Please enter it again.");
		
		session.temp_password = password;

		var full_name = $('fe_full_name').value;
		if (!full_name) return bad_field('fe_full_name', "Please enter your first and last names, as these are used for display purposes.");

		var email = $('fe_email').value;
		if (!email) return bad_field('fe_email', "Please enter an email address where we can reach you.");
		if (!email.match(/^[\w\-\.]+\@[\w\-\.]+$/)) return bad_field('fe_email', "Sorry, that email address is invalid.  Please enter a real email address.");

		show_progress_dialog(1, "Creating account...");

		effect_api_send('user_create', {
			Username: session.username,
			Password: password,
			FullName: full_name,
			Email: email,
			Developer: 1
		}, [this, 'do_create_account_2']);
	},
	
	do_create_account_2: function(response) {
		// account created successfully
		do_notice('Success!', 'Your new developer account was created successfully.', [this, 'do_create_account_3']);
	},
	
	do_create_account_3: function() {
		// navigate to user home screen, which prompts for login
		Nav.go('Home');
	}
	
} );

Class.subclass( Effect.Page, "Effect.Page.Login", {
	
	onActivate: function(args) {
		// page is being activated
		if (!args) args = {};
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Login', 'Login']
		);
		Nav.title('Login');
				
		var html = '';
		
		html += '<form method=get action="javascript:void(0)">';
		
		// html += begin_section('blue_border', 24, 'png');
		html += '<div>'+tab_bar([['#Login', 'Login', 'key.gif'], ['#CreateAccount', 'Create Account', 'user.gif']], 'Login')+'</div>';
		html += '<div class="game_main_area">';
		
		html += '<h1>User Login</h1>';

		html += '<center><table width="75%" style="margin:20px;">';
		
		html += '<tr><td colspan="2" align="center">';
			html += '<div style="width:75%; text-align:left; border-top:1px solid #aaa; padding-top:15px;">';
			html += '<div class="fe_label_gray">Login Using Username/Password</div>';
			html += '<div class="caption">Enter your Effect Games username and password.</div>';
			html += '</div>';
		html += '</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '<tr><td align=right class="fe_label_left">Username:</td><td align=left><input type=text id="fe_l_username" class="fe_medium" size="20" spellcheck="false" spelling="false" maxlength="32" value="'+str_value(session.username)+'" onEnter="$P().do_login()"></td></tr>';
		html += '<tr><td></td><td class="caption" align="left">Enter your Effect Games username.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '<tr><td align=right class="fe_label_left">Password:</td><td align=left><input type=password id="fe_l_password" class="fe_medium" size="20" maxlength="32" onEnter="$P().do_login()"></td></tr>';
		html += '<tr><td></td><td class="caption" align="left">Enter your account password. <a href="javascript:void($P().show_forgot_password_dialog())">Forgot your password?  Click here.</a></td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		/* html += '<tr><td align=right class="fe_label_left">Options:</td><td align=left>';
			html += '<input type="checkbox" id="fe_l_autologin" value="1"/><label for="fe_l_autologin">Keep me logged in</label>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption">Check this box to stay logged in until you explicity log out.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>'; */

		html += '</table></center>';

		html += '<center><table style="margin-bottom:20px;"><tr>';
			html += '<td>' + large_icon_button('x', 'Cancel', "Nav.go('Main')") + '</td>';
			html += '<td width=50>&nbsp;</td>';
			html += '<td>' + large_icon_button('check', '<b>Login</b>', "$P('Login').do_login()") + '</td>';
		html += '</tr></table></center>';
		
		// html += end_section();
		html += '</div>';
		
		html += '</form>';
		this.div.innerHTML = html;
		
		safe_focus( 'fe_l_username' );
		
		setTimeout( function() {
			$('fe_l_username').onkeydown = delay_onChange_input_text;
			$('fe_l_password').onkeydown = delay_onChange_input_text;
		}, 1 );
		
		if (args && args.u && args.h) {
			// reset password
			this.do_reset_password(args);
		}
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		this.div.innerHTML = '';
		return true;
	},
	
	do_login: function() {
		clear_field_error();
		$('fe_l_username').blur();
		$('fe_l_password').blur();
		
		if (!$('fe_l_username').value) return bad_field('fe_l_username', "Please enter your username.");
		if (!$('fe_l_password').value) return bad_field('fe_l_password', "Please enter your password.");
		
		session.username = $('fe_l_username').value.toLowerCase();
		
		hide_popup_dialog();
		show_progress_dialog(1, "Logging in...");
		
		effect_api_send('user_login', {
			Username: session.username,
			Password: $('fe_l_password').value,
			Infinite: 0
			// Infinite: $('fe_l_autologin').checked ? 1 : 0
		}, 'do_login_2', { _on_error: [this, 'onError'] } );
	},
	
	onError: function(response, tx) {
		// catch error before std dialog goes up
		hide_popup_dialog();
		
		if (response.Description.match(/password/i)) return bad_field('fe_l_password', response.Description);
		else if (response.Description.match(/user/i)) return bad_field('fe_l_username', response.Description);
		else do_message('error', response.Description );
	},
	
	show_forgot_password_dialog: function() {
		var temp_username = '';
		if ($('fe_l_username')) temp_username = $('fe_l_username').value;
		var html = '';

		html += '<div class="dialog_bkgnd" style="background-image:url('+png('images/big_icons/key.png')+'); padding-left:160px;">';

		html += '<table cellspacing=0 cellpadding=0><tr><td width=350 height=225 valign=center align=center>';
		html += '<div class="dialog_title">Password Recovery</div>';

		html += '<form method=get action="javascript:void(0)"><table cellspacing="0" cellpadding="0"><tr><td align="left">';
		
		html += '<div style="font-size:12px;">Forgot your password?  No problem, just enter your Effect Developer Account Username, and we\'ll e-mail you a link to reset your password.</div>';
		html += '<br/>';
		
		html += '<div class="fe_label">Effect Username:</div><input type=text class="fe_big" id="fe_fp_username" size=20 value="'+temp_username+'"><br><br>';

		html += '</td></tr></table>';

		html += '<br><table><tr>';
			html += '<td>' + large_icon_button('x', 'Cancel', "hide_popup_dialog()") + '</td>';
			html += '<td width=30>&nbsp;</td>';
			// html += '<td>' + large_icon_button('user', 'Create Account...', "Nav.go('CreateAccount')") + '</td>';
			// html += '<td width=15>&nbsp;</td>';
			html += '<td>' + large_icon_button('check', '<b>Send</b>', '$P().do_forgot_password()') + '</td>';
		html += '</tr></table>';

		html += '</form>';

		html += '</div>';

		session.hooks.keys[ENTER_KEY] = 'do_forgot_password'; // enter key
		session.hooks.keys[ESC_KEY] = 'hide_popup_dialog'; // escape key
		
		safe_focus('fe_fp_username');

		show_popup_dialog(450, 225, html);
	},
	
	do_forgot_password: function() {
		// send call to e-mail link to reset password
		var username = $('fe_fp_username').value;
		if (!username) {
			hide_popup_dialog();
			return;
		}
		
		hide_popup_dialog();
		show_progress_dialog(1, "Sending e-mail...");
		
		effect_api_send('user_forgot_password', {
			Username: username
		}, [this, 'finish_forgot_password'] );
	},
	
	finish_forgot_password: function() {
		hide_popup_dialog();
		do_notice('Email Sent', "You should receive an e-mail shortly with a link to reset your password.");
	},
	
	do_reset_password: function(args) {
		// actually reset password -- we have a username and auth hash
		hide_popup_dialog();
		show_progress_dialog(1, "Resetting password...");
		
		effect_api_send('user_reset_password', {
			Username: args.u,
			Auth: args.h
		}, [this, 'finish_reset_password'] );
	},
	
	finish_reset_password: function(response, tx) {
		$('fe_l_username').value = response.Username;
		$('fe_l_password').value = response.TempPassword;
		
		do_notice("Password Reset Successfully", 
			"Your password was successfully reset.  Your new temporary password is:\n\n" + response.TempPassword );
	}
	
} );

Class.subclass( Effect.Page, "Effect.Page.MyAccount", {
	
	onActivate: function(args) {
		// page is being activated
		if (!args) args = {};
		
		if (!require_login()) {
			return false;
		}
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['MyAccount', 'Edit Account']
		);
		Nav.title('Edit Account');
		
		// show my account screen
		var html = '';
		html += '<form method=get action="javascript:void(0)">';
		
		// html += begin_section('blue_border', 24, 'png');
		html += '<div>'+get_user_tab_bar('Edit Account')+'</div>';
		html += '<div class="game_main_area">';
		
		html += '<h1>Change Your Account Settings</h1>';

		html += '<table style="margin:20px;">';

		html += '<tr><td align=right class="fe_label_left">Username:&nbsp;</td><td align=left style="font-size:12pt; color:#666;">'+session.username+'</td></tr>';
		html += '<tr><td></td><td class="caption">You cannot change your username.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';

		html += '<tr><td align=right class="fe_label_left">Change&nbsp;Password:&nbsp;</td><td align=left><input type=password id="fe_password" class="fe_medium" size=20></td></tr>';
		html += '<tr><td></td><td class="caption">Enter a password for your account.  You may need this when you login.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';

		html += '<tr><td align=right class="fe_label_left">Verify&nbsp;Password:&nbsp;</td><td align=left><input type=password id="fe_vpassword" class="fe_medium" size=20></td></tr>';
		html += '<tr><td></td><td class="caption">Please enter your password again for verification purposes.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';

		html += '<tr><td align=right class="fe_label_left">Full&nbsp;Name:&nbsp;</td><td align=left><input type=text id="fe_full_name" class="fe_medium" size=30 value="'+session.user.FullName+'" spellcheck="false" spelling="false"></td></tr>';
		html += '<tr><td></td><td class="caption">Enter your real first and last names.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';

		html += '<tr><td align=right class="fe_label_left">Email&nbsp;Address:&nbsp;</td><td align=left><input type=text id="fe_email" class="fe_medium" size=30 value="'+session.user.Email+'" spellcheck="false" spelling="false"></td></tr>';
		html += '<tr><td></td><td class="caption">Enter your email address.  We will never share this with anyone.</td></tr>';
		
		html += '</table>';
		
		// Games
		html += '<fieldset class="myaccount"><legend>Games</legend>';
			html += '<div class="caption">Here are the current games of which you are a member:</div>';
			html += '<div id="d_myacct_user_games" style="max-height:400px; overflow-x:hidden; overflow-y:auto"></div>';
		html += '</fieldset><br/>' + spacer(1,15) + '<br/>';

		// Avatar Settings
		html += '<fieldset class="myaccount"><legend>Avatar Settings</legend>';

			html += '<table width="100%"><tr><td>';

			var stock_checked = session.user.StockAvatar ? 'checked="checked"' : '';
			var upload_checked = (!stock_checked) ? 'checked="checked"' : '';

			html += '<table cellspacing=0 cellpadding=0><tr><td><input type=radio name="avatar_mode" value="stock" id="fe_avatar_stock" '+stock_checked+' onClick="return do_choose_avatar_dialog()"><label for="fe_avatar_stock"><span class="fe_label">Use built-in avatar:</span></label></td><td>'+spacer(10,1)+'</td><td style="font-size:11px">'+large_icon_button('user', 'Choose...', 'do_choose_avatar_dialog()')+'</td></tr></table><br>';

			html += '<table cellspacing=0 cellpadding=0><tr><td><input type=radio name="avatar_mode" value="custom" id="fe_avatar_custom" '+upload_checked+'><label for="fe_avatar_custom"><span class="fe_label">Upload custom avatar:</span></label></td><td>'+spacer(10,1)+'</td><td id="td_avatar_upload_button" class="icon_button_container" style="font-size:11px">'+large_icon_button('menu_contract', 'Upload...', 'upload_basic()')+'</td><td>'+spacer(10,1)+'</td><td style="font-size:11px">'+large_icon_button('webcam.png', 'Webcam...', 'do_webcam_avatar()')+'</td></tr></table>';

			html += '</td>';
			html += '<td>' + spacer(50,1) + '</td>';
			html += '<td valign=right>';
			html += begin_section( 'shadow_border', 12, 'gif' );
				html += '<div style="width:70px;"><center>';
				html += '<span class="caption2"><b>Your&nbsp;Avatar:</b></span><br>' + spacer(1,5) + '<br>';
				html += '<img id="i_avatar_preview" class="png" src="'+get_buddy_icon_url(session.username, 64)+'&random='+Math.random()+'">';
				html += '</center></div>';
			html += end_section();
			html += '</td></tr></table>';

		html += '</fieldset><br/>' + spacer(1,15) + '<br/>';
		
		// Preferences
		html += '<fieldset class="myaccount"><legend>Privacy Settings</legend>';
			var pref_configs = always_array( config.PreferenceConfig.Pref );
			for (var idx = 0, len = pref_configs.length; idx < len; idx++) {
				var pconfig = pref_configs[idx];
				html += '<div><input type="checkbox" id="fe_pref_'+pconfig.ID+'" value="1" ' + (get_bool_pref(pconfig.ID) ? 'checked="checked"' : '') + '/>';
				html += '<label for="fe_pref_'+pconfig.ID+'">'+pconfig.Label+'</label></div>';
			} // foreach pref config
		html += '</fieldset><br/>' + spacer(1,15) + '<br/>';

		html += '<center><table style="margin-bottom:20px;"><tr>';
			html += '<td>' + large_icon_button('x', 'Cancel', "#Home") + '</td>';
			html += '<td width=50>&nbsp;</td>';
			html += '<td>' + large_icon_button('trash', 'Delete Account', "$P('MyAccount').do_delete_account()") + '</td>';
			html += '<td width=50>&nbsp;</td>';
			html += '<td>' + large_icon_button('check', '<b>Save Changes</b>', "$P('MyAccount').do_save_account()") + '</td>';
		html += '</tr></table></center>';
		
		// html += end_section('blue_border', 24, 'png');
		html += '</div>';
		
		html += '</form>';
		this.div.innerHTML = html;
		
		// setup floating upload movie
		setTimeout( function() {
			prep_upload('td_avatar_upload_button', '/effect/api/upload_avatar', 'do_upload_avatar_2', ['Image Files', '*.jpg;*.jpe;*.jpeg;*.gif;*.png']);
		}, 1 );
		
		effect_api_get( 'get_user_games', { limit:1000, offset:0 }, [this, 'receive_user_games'], { } );
		
		return true;
	},
	
	receive_user_games: function(response, tx) {
		// receive list of user games from server
		var html = '';
		
		this.games = [];
		
		if (response.Rows && response.Rows.Row) {
			var games = this.games = always_array( response.Rows.Row );
			
			html += '<table class="data_table" style="margin-top:10px; margin-bottom:10px;">';
			html += '<tr><th>Game Title</th><th>Actions</th></tr>';
			
			for (var idx = 0, len = games.length; idx < len; idx++) {
				var game = games[idx];
				html += '<tr>';
				// html += '<td><b>' + ww_fit_string(game.GameID, 200, session.em_width, 1) + '</b></td>';
				html += '<td><a href="#Game/'+game.GameID+'"><b>' + ww_fit_string(game.Title, 400, session.em_width, 1) + '</b></a></td>';
				html += '<td>' + icon('delete.png', 'Remove Me', "$P().do_remove_game('"+game.GameID+"')") + '</td>';
				html += '</tr>';
			} // foreach game
			
			html += '</table>';
		}
		else {
			html += '<div style="margin-top:10px; margin-bottom:10px;">(You currently aren\'t a member of any games.)</div>';
		}
		
		$('d_myacct_user_games').innerHTML = html;
		
		setTimeout( function() {
			zero_client.reposition('td_avatar_upload_button');
		}, 1 );
	},
	
	do_remove_game: function(game_id) {
		// remove me from game
		if (confirm("Are you sure you want to remove yourself as a member from the game \""+game_id+"\"?")) {
			show_progress_dialog(1, "Removing game...");
			effect_api_mod_touch('get_user_games');
			effect_api_send('game_delete_member', { 
				GameID: game_id,
				Username: session.username
			}, [this, 'remove_game_finish'], { _game_id: game_id });
		}
	},
	
	remove_game_finish: function(response, tx) {
		var idx = find_object_idx(this.games, { GameID: tx._game_id });
		assert(idx > -1, "Could not find game in list! " + tx._game_id);
		
		this.games.splice(idx, 1);
		if (this.games.length) this.receive_user_games({ Rows: { Row: this.games } });
		else this.receive_user_games({});
		
		hide_progress_dialog();
		
		do_message('success', "You have been removed from the game: " + tx._game_id);
	},
	
	onDeactivate: function(new_page) {
		// kill floating upload movie
		upload_destroy();
		this.div.innerHTML = '';
		return 1;
	},
	
	do_delete_account: function() {
		// permanently delete user account
		if (confirm("Are you sure you want to permanently delete your user account?  You will be immediately logged out of Effect.")) {
			effect_api_send('user_delete', {
				Username: session.username
			}, [this, 'do_delete_account_2']);
		}
	},
	
	do_delete_account_2: function(response) {
		// successfully deleted account
		session.hooks.after_notice = 'do_logout';
		do_notice("Delete Successful", "Your user account has been deleted.  You will now be logged out of Effect.");
	},
	
	do_save_account: function() {
		// save changes to user account
		clear_field_error();
		
		var password = $('fe_password').value;
		if (password && (password != $('fe_vpassword').value)) return bad_field('fe_vpassword', "Your password does not match the verification password.  Please enter it again.");

		var full_name = $('fe_full_name').value;
		if (!full_name) return bad_field('fe_full_name', "Please enter your first and last names, as these are used for display purposes.");

		var email = $('fe_email').value;
		if (!email || !email.match(/^[\w\-\.]+\@[\w\-\.]+$/)) return bad_field('fe_email', "Sorry, that email address is invalid.  Please enter a real email address.");

		var xml = {
			Username: session.username,
			FullName: full_name,
			Email: email
		};
		if (password) xml.Password = password;

		if ($('fe_avatar_stock').checked) {
			// stock avatar
			xml.StockAvatar = session.user.StockAvatar;
		}
		else {
			// custom avatar uploaded
			// if (!session.user.AvatarPreviewFilename) return do_error("You selected to upload a custom avatar, but haven't yet done so.  Please upload an image before saving changes.");
			xml.StockAvatar = '';
		}
		
		// prefs
		var pref_configs = always_array( config.PreferenceConfig.Pref );
		for (var idx = 0, len = pref_configs.length; idx < len; idx++) {
			var pconfig = pref_configs[idx];
			var checked = $('fe_pref_'+pconfig.ID).checked;
			session.user.Preferences[ pconfig.ID ] = checked ? 1 : 0;
		}
		xml.Preferences = session.user.Preferences;

		show_progress_dialog(1, "Saving account...");
		effect_api_mod_touch('user_get', 'get_buddy_icon');
		effect_api_send('user_update', xml, [this, 'do_save_account_2']);
	},
	
	do_save_account_2: function(response) {
		// receive response from server
		var temp_stats = session.user.Stats;
		session.user = response.User;
		session.user.Stats = temp_stats;
		
		Nav.go('Home');
		
		do_message('success', 'Changes saved successfully.');
		hide_progress_dialog();
		update_header();
	}
	
} );

Class.subclass( Effect.Page, "Effect.Page.User", {
	
	// User Profile Page
	
	onInit: function() {
		// render page HTML
		var html = '';
		
		html += '<h1 id="h_user_profile"></h1>';
		html += '<div id="d_user_profile"></div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(username) {
		if (!require_login()) {
			return false;
		}
		
		$('h_user_profile').innerHTML = 'Loading...';
		$('d_user_profile').innerHTML = loading_image();
		
		effect_api_send('user_get', {
			Username: username
		}, [this, 'receive_user_info']);
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		$('h_user_profile').innerHTML = '';
		$('d_user_profile').innerHTML = '';
		return true;
	},
	
	receive_user_info: function(response, tx) {
		// user info
		var user = response.User;
		var username = response.User.Username;
		
		this.user = user;
		this.username = username;
		
		var title = 'User Profile: ' + username;
		
		Nav.title( title );
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['User/' + username, title]
		);
		
		$('h_user_profile').innerHTML = title;
		
		var html = '';
		
		html += '<table><tr>';
		html += '<td><img class="png" src="'+get_buddy_icon_url(username, 64) + '" /></td>';
		html += '<td>'+spacer(2,2)+'</td>';
		html += '<td>';
			if (user.FullName) html += '<b>' + user.FullName + '</b> ('+username+')<br/>';
			else html += '<b>' + username + '</b><br/>';
			
			if (user.Preferences.allow_user_emails) {
				html += icon('mail', 'Send Email...', "$P('User').show_send_email_dialog()");
			}
		html += '</td>';
		html += '</tr></table>';
		
		html += '<br/>';
		html += '<b>Account Type:</b> ' + user.AccountType + '<br/>';
		html += '<b>Member Since:</b> ' + get_nice_date( user._Attribs.Created ) + '<br/>';
		
		if (is_admin()) {
			html += '<br/>';
			html += large_icon_button('lock.png', 'Administer User...', '#AdminUser/' + username);
			html += '<div class="clear"></div>';
		}
		
		$('d_user_profile').innerHTML = html;
	},
	
	show_send_email_dialog: function() {
		// show dialog for sending e-mail to user
		hide_popup_dialog();
		delete session.progress;

		var html = '';

		html += '<div class="dialog_bkgnd" style="background-image:url('+png('images/big_icons/email.png')+')">';

		html += '<table cellspacing=0 cellpadding=0><tr><td width=600 height=375 valign=center align=center>';
		html += '<div class="dialog_title" style="margin-bottom:10px;">Send User Email</div>';
				
		html += '<form method=get action="javascript:void(0)"><table cellspacing="0" cellpadding="0"><tr><td align="left">';
		
		html += '<table>';
		html += '<tr><td align=right class="fe_label">To:&nbsp;</td><td align=left>' + this.username + '</td></tr>';
		html += '<tr><td align=right class="fe_label">From:&nbsp;</td><td align=left>' + session.username + '</td></tr>';
		html += '</table>';
		
		html += '<div class="fe_label">Subject:</div>';
		html += '<div><input type="text" class="fe_medium" id="fe_sem_subject" size="30" maxlength="256"/></div>';
		html += '<div class="caption">Enter a subject for your e-mail.</div>';
		
		html += '<div class="fe_label">Message:</div>';
		html += '<textarea maxlength="2048" class="fe_edit" id="fe_sem_body" style="width:400px; height:150px;" wrap="virtual" onkeydown="return catchTab(this,event)">';
		html += '</textarea>';
		html += '<div class="caption">Enter the body of your e-mail here.  Plain text only please.</div>';
		
		html += '</td></tr></table></form>';
		
		html += '<br><br><table><tr>';
			html += '<td>' + large_icon_button('x', 'Cancel', "hide_popup_dialog()") + '</td>';
			html += '<td width=50>&nbsp;</td>';
			// html += '<td>' + large_icon_button('user', 'Create Account...', "Nav.go('CreateAccount')") + '</td>';
			// html += '<td width=15>&nbsp;</td>';
			html += '<td>' + large_icon_button('check', '<b>Send Email</b>', "$P('User').send_email()") + '</td>';
		html += '</tr></table>';

		html += '</form>';

		html += '</div>';

		// session.hooks.keys[ENTER_KEY] = [Comments, 'post', page_id]; // enter key
		session.hooks.keys[ESC_KEY] = 'hide_popup_dialog'; // escape key

		safe_focus( 'fe_sem_subject' );

		show_popup_dialog(600, 375, html);
	},
	
	send_email: function() {
		// send email invitations
		var subject = trim( $('fe_sem_subject').value );
		if (!subject) {
			$('fe_sem_subject').addClass('control_bad');
			$('fe_sem_subject').focus();
			return;
		}
		
		var msg = $('fe_sem_body').value;
		if (!msg) return;
		
		hide_popup_dialog();
		show_progress_dialog(1, "Sending email...");
		
		effect_api_send('user_send_email', {
			Username: this.username,
			Subject: subject,
			Message: msg
		}, [this, 'send_email_finish'], { } );
	},
	
	send_email_finish: function(response, tx) {
		// successfully sent invitations, yay!
		hide_popup_dialog();
		do_message('success', 'Your message was sent successfully.');
	}
} );

Class.subclass( Effect.Page, "Effect.Page.UserLog", {
	
	// User Security Log Page
	
	onInit: function() {
		// render page HTML
		var html = '';
		
		html += '<div id="d_user_log_tab_bar"></div>';
		html += '<div class="game_main_area">';
		
		html += '<h1 id="h_user_log">User Security Log</h1>';
		// html += '<div style="margin-bottom:10px;"><a href="#Home">&larr; Return to My Home</a></div>';
		html += '<div id="d_user_log"></div>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(username) {
		if (!require_login()) {
			return false;
		}
		
		Nav.title( "User Security Log" );
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			[Nav.currentAnchor(), "User Security Log"]
		);
		
		$('d_user_log_tab_bar').innerHTML = get_user_tab_bar('Security Log');
		
		$('d_user_log').innerHTML = loading_image();
		
		effect_api_get('user_get_log', { 
			offset: 0,
			limit: 100
		}, [this, 'receive_log'], { _search_args: { offset:0, limit:100 } });
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		$('d_user_log_tab_bar').innerHTML = '';
		$('d_user_log').innerHTML = '';
		return true;
	},
	
	research: function(offset) {
		// run previous search but with different offset
		var args = this.last_search;
		if (!args) return;
		
		args.offset = offset;
		effect_api_get( 'user_get_log', args, [this, 'receive_log'], { _search_args: args } );
	},
	
	receive_log: function(response, tx) {
		// receive user log
		var html = '';
		var args = tx._search_args;
		this.last_search = args;
		
		if (response && response.Rows && response.Rows.Row) {
			var rows = always_array( response.Rows.Row );
			
			if (response.List && response.List.length) {
				// pagination
				html += '<div>';
				
				html += '<div class="pagination">';
				var total_items = response.List.length;

				var num_pages = parseInt( total_items / args.limit, 10 ) + 1;
				if (total_items % args.limit == 0) num_pages--;
				var current_page = parseInt( args.offset / args.limit, 10 ) + 1;

				if (num_pages > 1) {
					html += 'Page: ';
					if (current_page > 1) {
						html += code_link( '$P().research(' + ((current_page - 2) * args.limit) + ')', '&larr; Newer' );
					}
					html += '&nbsp;&nbsp;';

					var start_page = current_page - 4;
					var end_page = current_page + 5;

					if (start_page < 1) {
						end_page += (1 - start_page);
						start_page = 1;
					}

					if (end_page > num_pages) {
						start_page -= (end_page - num_pages);
						if (start_page < 1) start_page = 1;
						end_page = num_pages;
					}

					for (var idx = start_page; idx <= end_page; idx++) {
						if (idx == current_page) {
							html += '<b>' + idx + '</b>';
						}
						else {
							html += code_link( '$P().research(' + ((idx - 1) * args.limit) + ')', idx );
						}
						html += '&nbsp;';
					}

					html += '&nbsp;&nbsp;';
					if (current_page < num_pages) {
						html += code_link( '$P().research(' + ((current_page + 0) * args.limit) + ')', 'Older &rarr;' );
					}
				} // more than one page
				else {
					html += 'Page 1 of 1';
				}
				html += '</div>';
				
				html += '<div class="clear"></div>';
				html += '</div>';
			} // pagination
			
			html += '<table class="data_table">';
			html += '<tr><th>Date/Time</th><th>Action</th><th>IP&nbsp;Address</th><th>User Agent</th></tr>';
			
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				html += '<tr>';
				html += '<td><nobr>' + get_short_date_time(row.Date) + '</nobr></td>';
				html += '<td class="fe_label"><nobr>' + row.Message + '</nobr></td>';
				
				if (row.IP) {
					row.IP = row.IP.toString().replace( /\b10\.\d+\.\d+\.\d+\,\s*/, '' );
				}
				html += '<td><nobr>' + row.IP + '</nobr></td>';
				
				if (row.UserAgent) {
					row.UserAgent = row.UserAgent.toString().replace(/\;\s+[\d\.]+\s+cache[\.\w]+(\:\d+)?\s+\(squid[^\)]+\)/, '');
				}
				var user_info = parse_useragent( row.UserAgent );
				html += '<td title="'+escape_text_field_value(row.UserAgent)+'">' + 
					user_info.os.replace(/\s+/g, '&nbsp;') + ' ' + user_info.browser.replace(/\s+/g, '&nbsp;') + '</td>';
				
				html += '</tr>';
			} // foreach row
			
			html += '</table>';
		}
		else {
			html += '(Log is empty)';
		}
		
		$('d_user_log').innerHTML = html;
	}
} );

// Utility Functions

function do_choose_avatar_dialog() {
	var html = '<table cellspacing=0 cellpadding=0><tr><td width=400 height=300 valign=center align=center>';
	html += '<div class="dialog_title">Choose Your Avatar</div>';
	html += '<div class="vert_selector" style="width:380px; height:200px;">';
	
	if (!session.user.StockAvatar) session.user.StockAvatar = session.config.DefaultUser.StockAvatar;
	session.temp_last_avatar = session.user.StockAvatar;
	
	var avatars = always_array( session.config.StockAvatars.Filename );
	for (var idx = 0, len = avatars.length; idx < len; idx++) {
		var filename = avatars[idx];
		var class_name = ((filename == session.user.StockAvatar) ? 'choose_item_selected' : 'choose_item');
		html += '<img id="sa_'+filename+'" class="'+class_name+'" src="'+images_uri+'/stock_avatars/'+filename+'" width="32" height="32" onClick="do_select_avatar(\''+filename+'\')" onDblClick="do_select_avatar(\''+filename+'\'); do_choose_avatar();">';
	}
	
	html += '</div>';
	html += '<br><table><tr>';
		html += '<td>' + large_icon_button('x', 'Cancel', 'cancel_choose_avatar()') + '</td>';
		html += '<td width=50>&nbsp;</td>';
		html += '<td>' + large_icon_button('check', '<b>Choose</b>', 'do_choose_avatar()') + '</td>';
	html += '</tr></table>';
	html += '</td></tr></table>';
	
	session.hooks.keys[ENTER_KEY] = 'do_choose_avatar'; // enter key
	session.hooks.keys[ESC_KEY] = 'cancel_choose_avatar'; // escape key
	
	show_popup_dialog(400, 300, html);
	return false; // don't change radio button yet
}

function do_select_avatar(filename) {
	if ($('sa_'+session.temp_last_avatar)) $('sa_'+session.temp_last_avatar).className = 'choose_item';
	$('sa_'+filename).className = 'choose_item_selected';
	session.temp_last_avatar = filename;
}

function cancel_choose_avatar() {
	hide_popup_dialog();
	delete session.temp_last_avatar;
}

function do_choose_avatar() {
	hide_popup_dialog();
	session.user.StockAvatar = session.temp_last_avatar;
	delete session.temp_last_avatar;
	
	// update thumbnail display
	$('i_avatar_preview').src = images_uri + '/stock_avatars/' + session.user.StockAvatar;
	
	// now change radio button
	$('fe_avatar_stock').checked = true;
	
	setTimeout( function() {
		zero_client.reposition('td_avatar_upload_button');
	}, 1 );
}

function do_upload_avatar_2() {
	// upload complete, check for error
	effect_api_send('user_get', {
		Username: session.username
	}, 'do_upload_avatar_3');
}

function do_upload_avatar_3(response) {
	// receive response from server
	hide_progress_dialog();
	if (response.User.LastUploadError) return do_error( "Failed to upload avatar: " + response.User.LastUploadError );
	
	// update thumbnail display
	// $('i_avatar_preview').src = images_uri + '/buddy_icons/' + response.User.AvatarPreviewFilename + '?random=' + Math.random();
	// $('i_avatar_preview').src = '/effect/api/preview_custom_avatar?username=' + session.username + '&random=' + Math.random();
	// session.user.AvatarPreviewFilename = response.User.AvatarPreviewFilename;
	$('i_avatar_preview').src = get_buddy_icon_url(session.username, 64)+'&random='+Math.random();
	
	// now change radio button
	$('fe_avatar_custom').checked = true;
	
	setTimeout( function() {
		zero_client.reposition('td_avatar_upload_button');
	}, 1 );
}

function do_webcam_avatar() {
	// upload icon using webcam
	var html = '<table cellspacing=0 cellpadding=0><tr><td width=350 height=400 valign=center align=center>';
	html += '<div class="dialog_title">Upload Your Avatar</div>';
	html += '<div style="border:1px solid #aaa;">' + get_webcam_html(280, 280) + '</div>';
	html += '<br><br><table><tr>';
		html += '<td>' + large_icon_button('x', 'Cancel', 'cancel_webcam_avatar()') + '</td>';
		html += '<td width=20>&nbsp;</td>';
		html += '<td>' + large_icon_button('server', 'Setup...', 'webcam_configure()') + '</td>';
		html += '<td width=20>&nbsp;</td>';
		html += '<td>' + large_icon_button('webcam.png', '<b>Snap</b>', 'do_webcam_avatar_snap()') + '</td>';
	html += '</tr></table>';
	html += '</td></tr></table>';
	
	session.hooks.keys[ENTER_KEY] = 'do_webcam_avatar_snap'; // enter key
	session.hooks.keys[ESC_KEY] = 'cancel_webcam_avatar'; // escape key
	
	show_popup_dialog(350, 400, html);
	return false; // don't change radio button yet
}

function cancel_webcam_avatar() {
	hide_popup_dialog();
}

function do_webcam_avatar_snap() {
	webcam_snap('/effect/api/upload_avatar?Filedata=webcam.jpg&session=' + session.cookie.get('effect_session_id'), 'do_upload_avatar_2');
}
