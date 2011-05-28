// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.Admin", {
	
	onActivate: function(username) {
		if (!require_login()) {
			return false;
		}
		if (!is_admin()) {
			setTimeout( function() {
				Nav.go( 'Home' );
				do_message('error', "You do not have administrator privileges.");
			}, 1 );
			return true;
		}
		
		var html = '';
		
		html += '<div>' + get_admin_tab_bar('Admin') + '</div>';
		html += '<div class="game_main_area">';
		
		html += '<h1>Administration</h1>';
		
		html += '<fieldset><legend>Edit User</legend>';
			html += '<table><tr>';
				html += '<td class="fe_label">Username:</td>';
				html += '<td><input type="text" class="fe_medium" id="fe_admin_username" value="" onEnter="$P().do_edit_user()" /></td>';
				html += '<td>' + large_icon_button('user_edit.png', 'Edit User...', "$P().do_edit_user()") + '</td>';
			html += '</tr></table>';
		html += '</fieldset>';
		
		html += '<div style="height:15px;"></div>';
		
		html += '<fieldset><legend>Site Configuration</legend>';
			
			html += '<div class="little_button_stack">' + large_icon_button('page_white_edit.png', 'Edit Article Categories...', "$P().do_admin_storage_edit('/admin/article_categories')") + '<div class="clear"></div></div>';
			
			html += '<div class="little_button_stack">' + large_icon_button('page_white_edit.png', 'Edit Game Genres...', "$P().do_admin_storage_edit('/admin/game_genres')") + '<div class="clear"></div></div>';
			
			html += '<div class="little_button_stack">' + large_icon_button('page_white_edit.png', 'Edit Engine Versions...', "$P().do_admin_storage_edit('/admin/engine_versions')") + '<div class="clear"></div></div>';
			
			html += '<div class="little_button_stack">' + large_icon_button('page_white_edit.png', 'Edit Engine Plugins...', "$P().do_admin_storage_edit('/admin/engine_plugins')") + '<div class="clear"></div></div>';
			
			html += '<div class="little_button_stack">' + large_icon_button('page_white_edit.png', 'Edit IP Block List...', "$P().do_admin_storage_edit('/admin/ip_block_list')") + '<div class="clear"></div></div>';
			
			html += '<div class="little_button_stack">' + large_icon_button('page_white_edit.png', 'Edit Ticket Systems...', "$P().do_admin_storage_edit('/admin/ticket_systems')") + '<div class="clear"></div></div>';
			
			html += '<div class="clear"></div>';
		html += '</fieldset>';
		
		html += '<div style="height:15px;"></div>';
				
		html += '<fieldset><legend>Links</legend>';
			html += '<a href="/effect/api/admin_get_all_users.csv">Download Complete User List (CSV)</a><br/>';
			html += '<a href="/effect/api/admin_get_all_games.csv">Download Complete Game List (CSV)</a><br/><br/>';
			html += '<a href="#Article/Abuse">Comment Abuse Page</a><br/>';
			html += '<a href="test/api.html">XML API Test Harness</a><br/>';
		html += '</fieldset>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
		
		Nav.title( "Administration" );
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Admin', "Administration"]
		);
		
		setTimeout( function() {
			$('fe_admin_username').onkeydown = delay_onChange_input_text;
		}, 1 );
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		this.div.innerHTML = '';
		return true;
	},
	
	do_edit_user: function() {
		var username = $('fe_admin_username').value;
		if (username) {
			Nav.go( 'AdminUser/' + username );
		}
	},
	
	do_admin_storage_edit: function(path) {
		window.open( 'textedit.psp.html?mode=admin&path=' + path + '&rand=' + Math.random() );
	}
	
} );

Class.subclass( Effect.Page, "Effect.Page.AdminUser", {
	
	// User Admin Page
	
	onInit: function() {
		// render page HTML
		var html = '';
		
		html += '<div id="d_admin_user_tab_bar"></div>';
		html += '<div class="game_main_area">';
		
		html += '<h1 id="h_admin_user_profile"></h1>';
		html += '<div id="d_admin_user_profile"></div>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(username) {
		if (!require_login()) {
			return false;
		}
		if (!is_admin()) {
			setTimeout( function() {
				Nav.go( 'Home' );
				do_message('error', "You do not have administrator privileges.");
			}, 1 );
			return true;
		}
		
		$('d_admin_user_tab_bar').innerHTML = get_admin_tab_bar('Admin');
		$('h_admin_user_profile').innerHTML = 'Loading...';
		$('d_admin_user_profile').innerHTML = '';
		
		if (!session.storage.sect_prefs) session.storage.sect_prefs = {};
		this.sect_prefs = session.storage.sect_prefs;
		
		// all sects closed on activate
		this.sect_prefs.d_admin_user_log = 0;
		this.sect_prefs.d_admin_user_articles = 0;
		this.sect_prefs.d_admin_user_games = 0;
		
		effect_api_send('admin_user_get', {
			Username: username
		}, [this, 'receive_user_info']);
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		$('d_admin_user_tab_bar').innerHTML = '';
		$('h_admin_user_profile').innerHTML = '';
		$('d_admin_user_profile').innerHTML = '';
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
			['Admin', "Administration"],
			['AdminUser/' + username, title]
		);
		
		$('h_admin_user_profile').innerHTML = title;
		
		var html = '';
		
		html += render_user_stats( response.Stats );
		
		html += '<table><tr>';
		html += '<td><img class="png" src="'+get_buddy_icon_url(username, 64) + '" /></td>';
		html += '<td>'+spacer(2,2)+'</td>';
		html += '<td>';
			if (user.FullName) html += '<b>' + user.FullName + '</b> ('+username+')<br/>';
			else html += '<b>' + username + '</b><br/>';
			html += '<a href="mailto:'+user.Email+'">'+user.Email+'</a>';
		html += '</td>';
		html += '</tr></table>';
		
		html += '<br/>';
		html += '<table>';
		html += '<tr><td align="right" class="fe_label">Account Type:</td><td>' + user.AccountType + '</td></tr>';
		html += '<tr><td align="right" class="fe_label">Account Status:</td><td>' + user.Status + '</td></tr>';
		html += '<tr><td class="fe_label" align="right">Member Since:</td><td>' + get_nice_date( user._Attribs.Created ) + '</td></tr>';
		html += '<tr><td class="fe_label" align="right">Last Login:</td><td>' + get_nice_date_time( user.LastLogin ) + '</td></tr>';
		html += '</table>';
		
		html += '<div class="clear"></div>';
		
		// log
		html += '<div style="height:15px"></div>';
		html += '<div class="h1">';
			html += '<div id="ctl_d_admin_user_log" class="fl header_section_control closed" onClick="$P().toggle_section(\'d_admin_user_log\')"></div>';
			html += '<div class="fl" style="cursor:pointer" onClick="$P().toggle_section(\'d_admin_user_log\')">User Security Log</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		html += '<div id="d_admin_user_log" style="display:none">';
		if (response && response.Log && response.Log.Row) {
			var rows = always_array( response.Log.Row );
			
			html += '<table class="data_table">';
			html += '<tr><th>Date/Time</th><th>Action</th><th>IP&nbsp;Address</th><th>User Agent</th></tr>';
			
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				html += '<tr>';
				html += '<td><nobr>' + get_short_date_time(row.Date) + '</nobr></td>';
				html += '<td class="fe_label"><nobr>' + row.Message + '</nobr></td>';
				html += '<td><nobr>' + row.IP + '</nobr></td>';
				
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
		html += '</div>';
		
		// games
		html += '<div style="height:15px"></div>';
		html += '<div class="h1">';
			html += '<div id="ctl_d_admin_user_games" class="fl header_section_control closed" onClick="$P().toggle_section(\'d_admin_user_games\')"></div>';
			html += '<div class="fl" style="cursor:pointer" onClick="$P().toggle_section(\'d_admin_user_games\')">User Games</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		html += '<div id="d_admin_user_games" style="display:none">';
		if (response && response.Games && response.Games.Row) {
			var games = always_array( response.Games.Row );
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
			html += '(No games found)';
		}
		html += '</div>';
		
		// articles
		html += '<div style="height:15px"></div>';
		html += '<div class="h1">';
			html += '<div id="ctl_d_admin_user_articles" class="fl header_section_control closed" onClick="$P().toggle_section(\'d_admin_user_articles\')"></div>';
			html += '<div class="fl" style="cursor:pointer" onClick="$P().toggle_section(\'d_admin_user_articles\')">User Articles</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		html += '<div id="d_admin_user_articles" style="display:none">';
		if (response && response.Articles && response.Articles.Row) {
			var rows = always_array( response.Articles.Row );
			
			html += '<table class="data_table">';
			html += '<tr><th>Article ID</th><th>Category ID</th></tr>';
			
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var article = rows[idx];
				html += '<tr>';
				html += '<td><a href="#Article'+article.Path+'/'+article.ArticleID+'">' + article.ArticleID + '</a></td>';
				html += '<td>' + article.Path + '</td>';
				html += '</tr>';
			}
			
			html += '</table>';
		}
		else {
			html += '(No articles found)';
		}
		html += '</div>';
		
		html += '<div style="height:15px"></div>';
		
		html += '<center><table style="margin-bottom:20px;"><tr>';
			html += '<td>' + large_icon_button('arrow_turn_left.png', '<b>Back to Admin</b>', "#Admin") + '</td>';
			html += '<td width=50>&nbsp;</td>';
			html += '<td>' + large_icon_button('trash', 'Delete User', "$P('').do_delete_account()") + '</td>';
			html += '<td width=50>&nbsp;</td>';
			html += '<td>' + large_icon_button('page_white_edit.png', '<b>Edit User XML...</b>', "$P().do_edit_user_xml()") + '</td>';
		html += '</tr></table></center>';
		
		$('d_admin_user_profile').innerHTML = html;
	},
	
	pop_order_xml: function(order_id) {
		window.open( 'textedit.psp.html?mode=admin&path=/orders/' + order_id + '/events/0&rand=' + Math.random() );
	},
	
	do_edit_user_xml: function() {
		window.open( 'textedit.psp.html?mode=admin&path=/users/' + this.username + '&rand=' + Math.random() );
	},
	
	do_delete_account: function() {
		// permanently delete user account
		if (confirm("Are you sure you want to permanently delete the user account \""+this.username+"\"?")) {
			effect_api_send('user_delete', {
				Username: this.username
			}, [this, 'do_delete_account_2']);
		}
	},
	
	do_delete_account_2: function(response) {
		// successfully deleted account
		Nav.go('Admin');
		do_message('success', "The user \""+this.username+"\" has been successfully deleted.");
	},
	
	toggle_section: function(sect) {
		// toggle smart section
		smart_sect_toggle( sect, this.sect_prefs );
	}
	
} );

Class.subclass( Effect.Page, "Effect.Page.AdminReport", {
	
	// Admin Report Page
	
	onInit: function() {
		// render page HTML
		var html = '';
		
		html += '<div id="d_admin_report_tab_bar"></div>';
		html += '<div class="game_main_area">';
		
		// html += '<h1 id="h_admin_report"></h1>';
		html += '<div class="h1">';
			html += '<div id="h_admin_report" class="fl">';
				html += ''; // Admin Report Title
			html += '</div>';
			html += '<a class="fr icon report_go" href="javascript:void($P().generate_report_from_header_date())" title="Generate Report">Go</a>';
			html += '<div class="fr" id="d_admin_report_date_ctl" style="padding-right:10px;">';
			html += '</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		
		html += '<div id="d_admin_report"></div>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	generate_report_from_header_date: function() {
		var epoch = get_menu_date( 'fe_admin_report_date' );
		var args = get_date_args( epoch );
		Nav.go( 'AdminReport/' + args.yyyy + '/' + args.mm + '/' + args.dd );
	},
	
	onActivate: function(date) {
		if (!require_login()) {
			return false;
		}
		if (!is_admin()) {
			setTimeout( function() {
				Nav.go( 'Home' );
				do_message('error', "You do not have administrator privileges.");
			}, 1 );
			return true;
		}
		
		$('d_admin_report_tab_bar').innerHTML = get_admin_tab_bar('Reports');
		$('h_admin_report').innerHTML = 'Loading...';
		$('d_admin_report').innerHTML = loading_image();
		
		if (!date) {
			// default to current day
			date = yyyy_mm_dd();
		}
		
		$('d_admin_report_date_ctl').innerHTML = '<table cellspacing="0" cellpadding="0" height="30"><tr><td valign="center">' + 
			insert_date_selector('fe_admin_report_date', (new Date(date)).getTime() / 1000) + '</td></tr></table>';
		
		effect_api_send('admin_report_get', {
			Date: date
		}, [this, 'receive_report'], { _date: date });
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		$('d_admin_report_tab_bar').innerHTML = '';
		$('h_admin_report').innerHTML = '';
		$('d_admin_report').innerHTML = '';
		$('d_admin_report_date_ctl').innerHTML = '';
		return true;
	},
	
	receive_report: function(response, tx) {
		// user info
		var report = response.Report;
		this.report = report;
		
		var title = 'Activity Report: ' + get_nice_date( report.DateRangeStart );
		
		Nav.title( title );
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Admin', "Administration"],
			[Nav.currentAnchor(), 'Activity Report']
		);
		
		if (report.Partial == 1) title += ' (Partial)';
		$('h_admin_report').innerHTML = title;
		
		var html = '';
		var report_spacer = spacer(1,30) + '<br/>';
		
		// convert traffic graph into google chart URL
		var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
		var cols = report.Traffic.split(/\,\s*/);
		var highest = 0;
		for (var idx = 0, len = cols.length; idx < len; idx++) {
			cols[idx] = parseFloat(cols[idx]);
			if (cols[idx] > highest) highest = cols[idx];
		}
		if (!highest) highest = 1;
		// Debug.trace("highest: " + highest);
		var chd = 's:';
		for (var idx = 0, len = cols.length; idx < len; idx++) {
			var num = Math.floor((cols[idx] / highest) * (chars.length - 1));
			// Debug.trace("idx " + idx + ": " + cols[idx] + ": " + num + ": " + chars[num]);
			chd += chars[ num ];
		}
		
		// figure out label values
		var horiz_labels = '12AM|1|2|3|4|5|6AM|7|8|9|10|11|12PM|1|2|3|4|5|6PM|7|8|9|10|11|12AM';
		var vert_labels = '';
		var px_time = 86400 / cols.length;
		var highest_persec = highest / px_time;
		
		if (highest_persec >= 1.0) {
			// show per sec
			var top_label = '' + Math.floor( highest_persec ) + '/sec';
			var mid_label = '' + Math.floor( highest_persec / 2 ) + '/sec';
			vert_labels += '|' + mid_label + '|' + top_label;
		}
		else {
			// not enough traffic for that, do minutes instead
			var top_label = '' + Math.floor( highest_persec * 60 ) + '/min';
			var mid_label = '' + Math.floor( (highest_persec / 2) * 60 ) + '/min';
			vert_labels += '|' + mid_label + '|' + top_label;
		}
		
		// ze goog url
		var goog_url = 'http://chart.apis.google.com/chart?cht=lc&chs=800x250&chd=' + chd +
		 	'&chco=224499&chxt=x,y&chxl=0:|' + horiz_labels + '|1:|' + vert_labels + '&chm=B,76A4FB,0,0,0' + 
			'&chtt=Overall+Traffic+Graph&chts=397dbb,16';
		
		html += '<center><img src="'+goog_url+'" width="800" height="250"/></center><br/>';
		
		// Totals
		html += report_spacer;
		html += '<h2>Totals</h2>';
		html += '<center><table cellspacing="0" cellpadding="0" width="100%"><tr>';
		html += '<td width="50%" align="center" valign="top">';
			html += '<table>';
			
			html += '<tr><td align=right class="fe_label">Unique Visitors:&nbsp;</td><td align=left>' + commify(report.Totals.NumUniqueUsers) + '</td></tr>';
			
			html += '<tr><td align=right class="fe_label">New User Accounts:&nbsp;</td><td align=left>' + commify(report.TransactionTypes.user_create) + '</td></tr>';
			html += '<tr><td align=right class="fe_label">New Games Created:&nbsp;</td><td align=left>' + commify(report.TransactionTypes.game_create) + '</td></tr>';
			
			html += '<tr><td align=right class="fe_label">Games Played:&nbsp;</td><td align=left>' + commify(report.Totals.Plays) + '</td></tr>';
			html += '<tr><td align=right class="fe_label">User Logins:&nbsp;</td><td align=left>' + commify(report.TransactionTypes.user_login) + '</td></tr>';
			
			html += '<tr><td align=right class="fe_label">New Articles:&nbsp;</td><td align=left>' + commify(report.TransactionTypes.article_post) + '</td></tr>';
			html += '<tr><td align=right class="fe_label">New Comments:&nbsp;</td><td align=left>' + commify(report.TransactionTypes.comment_post) + '</td></tr>';
			html += '<tr><td align=right class="fe_label">New Tickets:&nbsp;</td><td align=left>' + commify(report.TransactionTypes.ticket_post) + '</td></tr>';
			
			html += '</table>';
		html += '</td>';
		html += '<td width="50%" align="center" valign="top">';
			html += '<table>';
			html += '<tr><td align=right class="fe_label">Total Transactions:&nbsp;</td><td align=left>' + commify(report.Totals.Transactions) + '</td></tr>';
			html += '<tr><td align=right class="fe_label">Total Views:&nbsp;</td><td align=left>' + commify(report.Totals.Views) + '</td></tr>';
			html += '<tr><td align=right class="fe_label">Data Written:&nbsp;</td><td align=left>' + get_text_from_bytes(report.Totals.StorageWritten || 0) + '</td></tr>';
			html += '<tr><td align=right class="fe_label">Data Deleted:&nbsp;</td><td align=left>' + get_text_from_bytes(report.Totals.StorageDeleted || 0) + '</td></tr>';
			
			html += '<tr><td align=right class="fe_label">Game Revisions Published:&nbsp;</td><td align=left>' + commify(report.Totals.GameRevisionsPosted) + '</td></tr>';
			html += '<tr><td align=right class="fe_label">Standalones Published:&nbsp;</td><td align=left>' + commify(report.TransactionTypes.game_rev_standalone_create) + '</td></tr>';
			
			html += '<tr><td align=right class="fe_label">Games Deleted:&nbsp;</td><td align=left>' + commify(report.TransactionTypes.game_delete) + '</td></tr>';
			html += '<tr><td align=right class="fe_label">Users Deleted:&nbsp;</td><td align=left>' + commify(report.TransactionTypes.user_delete) + '</td></tr>';
			
			html += '</table>';
		html += '</td>';
		html += '</tr></table></center>';
		
		// New Users
		html += report_spacer;
		html += '<h2>New Users</h2>';
		if (report.NewUsers.Row) {
			html += '<table class="data_table">';
			html += '<tr><th>Username</th><th>Full Name</th><th>Email Address</th><th>IP</th><th>User Agent</th></tr>';
			var rows = always_array( report.NewUsers.Row );
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				html += '<tr>';
				html += '<td>'+icon('user', row.Username, row.URL)+'</td>';
				html += '<td>' + row.FullName + '</td>';
				html += '<td><a href="mailto:'+row.Email+'">'+row.Email+'</a></td>';
				
				var user_info = get_user_client_info( row.ClientInfo );
				html += '<td>' + user_info.ip + '</td>';
				html += '<td title="'+escape_text_field_value(row.ClientInfo)+'">' + 
					user_info.os.replace(/\s+/g, '&nbsp;') + ' ' + user_info.browser.replace(/\s+/g, '&nbsp;') + '</td>';
				
				html += '</tr>';
			}
			html += '</table>';
		}
		else html += '(None)<br/>';
		
		// New Games
		html += report_spacer;
		html += '<h2>New Games</h2>';
		if (report.NewGames.Row) {
			html += '<table class="data_table">';
			html += '<tr><th>Game ID</th><th>Title</th><th>Owner</th><th>Storage Written</th><th>Storage Deleted</th></tr>';
			var rows = always_array( report.NewGames.Row );
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				html += '<tr>';
				html += '<td>'+icon('controller.png', row.GameID, row.URL)+'</td>';
				html += '<td>' + row.Title + '</td>';
				html += '<td>'+icon('user', row.Owner, '#User/' + row.Owner)+'</td>';
				html += '<td>' + get_text_from_bytes( row.StorageWritten || 0 ) + '</td>';
				html += '<td>' + get_text_from_bytes( row.StorageDeleted || 0 ) + '</td>';
				html += '</tr>';
			}
			html += '</table>';
		}
		else html += '(None)<br/>';
		
		// Most Active Users
		html += report_spacer;
		html += '<h2>Most Active Users</h2>';
		if (report.MostActiveUsers.Row) {
			html += '<table class="data_table">';
			html += '<tr><th>Rank</th><th>Username</th><th>Full Name</th><th>Email Address</th><th>Transactions</th><th>Percentile</th><th>Visual</th></tr>';
			var rows = always_array( report.MostActiveUsers.Row );
			var highest = 0;
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				row.Count = parseInt(row.Count, 10);
				if (row.Count > highest) highest = row.Count;
			}
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				html += '<tr>';
				html += '<td>' + Math.floor(idx + 1) + '</td>';
				html += '<td>'+icon('user', row.Username, row.URL)+'</td>';
				html += '<td>' + row.FullName + '</td>';
				html += '<td><a href="mailto:'+row.Email+'">'+row.Email+'</a></td>';
				html += '<td>' + commify(row.Count) + '</td>';
				html += '<td>' + pct(row.Count, highest) + '</td>';
				html += '<td>' + bar(row.Count, highest, 100) + '</td>';
				html += '</tr>';
			}
			html += '</table>';
		}
		else html += '(None)<br/>';
		
		// Most Active Game Projects
		html += report_spacer;
		html += '<h2>Most Active Game Projects</h2>';
		if (report.MostActiveGames.Row) {
			html += '<table class="data_table">';
			html += '<tr><th>Rank</th><th>Game ID</th><th>Title</th><th>Owner</th><th>Storage Written</th><th>Storage Deleted</th><th>Transactions</th><th>Percentile</th><th>Visual</th></tr>';
			var rows = always_array( report.MostActiveGames.Row );
			var highest = 0;
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				row.Count = parseInt(row.Count, 10);
				if (row.Count > highest) highest = row.Count;
			}
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				html += '<tr>';
				html += '<td>' + Math.floor(idx + 1) + '</td>';
				html += '<td>'+icon('controller.png', row.GameID, row.URL)+'</td>';
				html += '<td>' + row.Title + '</td>';
				html += '<td>'+icon('user', row.Owner, '#User/' + row.Owner)+'</td>';
				html += '<td>' + get_text_from_bytes( row.StorageWritten || 0 ) + '</td>';
				html += '<td>' + get_text_from_bytes( row.StorageDeleted || 0 ) + '</td>';
				html += '<td>' + commify(row.Count) + '</td>';
				html += '<td>' + pct(row.Count, highest) + '</td>';
				html += '<td>' + bar(row.Count, highest, 100) + '</td>';
				html += '</tr>';
			}
			html += '</table>';
		}
		else html += '(None)<br/>';
		
		// Most Played Games
		html += report_spacer;
		html += '<h2>Most Played Games</h2>';
		if (report.MostPlayedGames.Row) {
			html += '<table class="data_table">';
			html += '<tr><th>Rank</th><th>Game ID</th><th>Title</th><th>Owner</th><th>Plays</th><th>Percentile</th><th>Visual</th></tr>';
			var rows = always_array( report.MostPlayedGames.Row );
			var highest = 0;
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				row.Count = parseInt(row.Count, 10);
				if (row.Count > highest) highest = row.Count;
			}
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				html += '<tr>';
				html += '<td>' + Math.floor(idx + 1) + '</td>';
				html += '<td>'+icon('controller.png', row.GameID, row.URL)+'</td>';
				html += '<td>' + row.Title + '</td>';
				html += '<td>'+icon('user', row.Owner, '#User/' + row.Owner)+'</td>';
				html += '<td>' + commify(row.Count) + '</td>';
				html += '<td>' + pct(row.Count, highest) + '</td>';
				html += '<td>' + bar(row.Count, highest, 100) + '</td>';
				html += '</tr>';
			}
			html += '</table>';
		}
		else html += '(None)<br/>';
		
		// New Articles Posted
		html += report_spacer;
		html += '<h2>New Articles Posted</h2>';
		if (report.ArticlesPosted.Row) {
			html += '<table class="data_table">';
			html += '<tr><th>Title</th><th>Author</th><th>Category</th></tr>';
			var rows = always_array( report.ArticlesPosted.Row );
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				
				var category_def = find_object( session.article_categories.Category, { Path: row.Category } );
				if (!category_def) category_def = { Title: row.CustomCategory || 'Uncategorized' };
				
				html += '<tr>';
				html += '<td>'+icon('page_white_text.png', row.Title, row.URL)+'</td>';
				html += '<td>'+icon('user', row.Author, '#User/' + row.Author)+'</td>';
				html += '<td>'+icon('folder.png', category_def.Title)+'</td>';
				html += '</tr>';
			}
			html += '</table>';
		}
		else html += '(None)<br/>';
		
		// Pages With New Comments
		html += report_spacer;
		html += '<h2>Pages with New Comments</h2>';
		if (report.PagesWithNewComments.Row) {
			html += '<table class="data_table">';
			html += '<tr><th>URL</th><th>Comments</th></tr>';
			var rows = always_array( report.PagesWithNewComments.Row );
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				html += '<tr>';
				html += '<td><a href="'+row.URL+'"><span style="word-break: break-word;">'+row.URL+'</span></a></td>';
				html += '<td>'+commify(row.Count)+'</td>';
				html += '</tr>';
			}
			html += '</table>';
		}
		else html += '(None)<br/>';
		
		// New Tickets
		html += report_spacer;
		html += '<h2>New Tickets ('+commify(report.TransactionTypes.ticket_post)+')</h2>';
		if (report.NewTickets.Row) {
			html += '<table class="data_table">';
			html += '<tr><th>System</th><th>Category</th><th>Ticket ID</th><th>Summary</th><th>Author</th></tr>';
			var rows = always_array( report.NewTickets.Row );
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				
				var category_def = find_object( session.ticket_systems, { Path: row.Category } );
				if (!category_def) category_def = { Title: 'Unknown', Icon: 'delete' };
				
				html += '<tr>';
				html += '<td>' + icon('folder.png', category_def.Title, '#TicketSearch' + row.Category) + '</td>';
				html += '<td>' + row.TicketCategory + '</td>';
				html += '<td>'+icon( category_def.Icon + '.png', get_ticket_number_disp(row.TicketID), row.URL)+'</td>';
				html += '<td><a href="'+row.URL+'">'+row.Summary+'</a></td>';
				html += '<td>'+icon('user', row.Username, '#User/' + row.Username)+'</td>';
				html += '</tr>';
			}
			html += '</table>';
		}
		else html += '(None)<br/>';
		
		// User Software
		html += report_spacer;
		html += '<h2>User Client Software</h2>';
		html += '<center><table width="100%">';
			html += '<tr>';
				html += '<td width="50%" align="center" valign="top">';
					html += this.get_user_software_pie( report.UserSoftware.os_nover, "Operating System" ) + '<br/>';
					html += spacer(1,10) + '<br/>';
					html += this.get_user_software_table( report.UserSoftware.os_nover, "OS" );
				html += '</td>';
				html += '<td width="50%" align="center" valign="top">';
					html += this.get_user_software_pie( report.UserSoftware.os, "OS Major Version" ) + '<br/>';
					html += spacer(1,10) + '<br/>';
					html += this.get_user_software_table( report.UserSoftware.os, "OS" );
				html += '<td>';
			html += '</tr>';
			html += '<tr><td colspan="2" width="100%"><div style="height:1px; background-color:#ccc; margin-top:10px; margin-bottom:10px;"></div></td></tr>';
			html += '<tr>';
				html += '<td width="50%" align="center" valign="top">';
					html += this.get_user_software_pie( report.UserSoftware.browser_nover, "Browser" ) + '<br/>';
					html += spacer(1,10) + '<br/>';
					html += this.get_user_software_table( report.UserSoftware.browser_nover, "Browser" );
				html += '</td>';
				html += '<td width="50%" align="center" valign="top">';
					html += this.get_user_software_pie( report.UserSoftware.browser, "Browser Version" ) + '<br/>';
					html += spacer(1,10) + '<br/>';
					html += this.get_user_software_table( report.UserSoftware.browser, "Browser" );
				html += '</td>';
			html += '</tr>';
			html += '<tr><td colspan="2" width="100%"><div style="height:1px; background-color:#ccc; margin-top:10px; margin-bottom:10px;"></div></td></tr>';
			html += '<tr>';
				html += '<td width="50%" align="center" valign="top">';
					html += this.get_user_software_pie( report.UserSoftware.combined_nover, "Combined" ) + '<br/>';
					html += spacer(1,10) + '<br/>';
					html += this.get_user_software_table( report.UserSoftware.combined_nover, "Name" );
				html += '</td>';
				html += '<td width="50%" align="center" valign="top">';
					html += this.get_user_software_pie( report.UserSoftware.combined, "Combined Version" ) + '<br/>';
					html += spacer(1,10) + '<br/>';
					html += this.get_user_software_table( report.UserSoftware.combined, "Name/Version" );
				html += '</td>';
			html += '</tr>';
			html += '<tr><td colspan="2" width="100%"><div style="height:1px; background-color:#ccc; margin-top:10px; margin-bottom:10px;"></div></td></tr>';
			html += '<tr>';
				html += '<td width="50%" align="center" valign="top">';
					html += this.get_user_software_pie( report.UserSoftware.flash_major, "Flash Player Major Verison" ) + '<br/>';
					html += spacer(1,10) + '<br/>';
					html += this.get_user_software_table( report.UserSoftware.flash_major, "Version" );
				html += '</td>';
				html += '<td width="50%" align="center" valign="top">';
					html += this.get_user_software_pie( report.UserSoftware.flash, "Flash Player Full Version" ) + '<br/>';
					html += spacer(1,10) + '<br/>';
					html += this.get_user_software_table( report.UserSoftware.flash, "Version" );
				html += '</td>';
			html += '</tr>';
		html += '</table></center>';
		
		// TopReferrerDomains
		html += report_spacer;
		html += '<h2>Top Game Referrer Domains</h2>';
		if (report.TopReferrerDomains.Row) {
			html += '<table class="data_table">';
			html += '<tr><th>Rank</th><th>Domain</th><th>Plays</th><th>Percentile</th><th>Visual</th></tr>';
			var rows = always_array( report.TopReferrerDomains.Row );
			var highest = 0;
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				row.Count = parseInt(row.Count, 10);
				if (row.Count > highest) highest = row.Count;
			}
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				html += '<tr>';
				html += '<td>' + Math.floor(idx + 1) + '</td>';
				html += '<td>' + icon('world.png', row.Domain, "window.open('http://" + row.Domain + "')") + '</td>';
				html += '<td>' + commify(row.Count) + '</td>';
				html += '<td>' + pct(row.Count, highest) + '</td>';
				html += '<td>' + bar(row.Count, highest, 100) + '</td>';
				html += '</tr>';
			}
			html += '</table>';
		}
		else html += '(None)<br/>';
		
		// TopReferrers
		html += report_spacer;
		html += '<h2>Top Game Referrer URLs</h2>';
		if (report.TopReferrers.Row) {
			html += '<table class="data_table">';
			html += '<tr><th>Rank</th><th>URL</th><th>Plays</th><th>Percentile</th><th>Visual</th></tr>';
			var rows = always_array( report.TopReferrers.Row );
			var highest = 0;
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				row.Count = parseInt(row.Count, 10);
				if (row.Count > highest) highest = row.Count;
			}
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				html += '<tr>';
				html += '<td>' + Math.floor(idx + 1) + '</td>';
				html += '<td><a href="'+row.URL+'" target="_blank"><span style="word-break: break-word;">'+row.URL+'</span></a></td>';
				html += '<td>' + commify(row.Count) + '</td>';
				html += '<td>' + pct(row.Count, highest) + '</td>';
				html += '<td>' + bar(row.Count, highest, 100) + '</td>';
				html += '</tr>';
			}
			html += '</table>';
		}
		else html += '(None)<br/>';
		
		// Top IPs
		html += report_spacer;
		html += '<h2>Top IP Addresses</h2>';
		if (report.TopIPs.Row) {
			html += '<table class="data_table">';
			html += '<tr><th>Rank</th><th>IP Address</th><th>DNS Lookup</th><th>Requests</th><th>Percentile</th><th>Visual</th></tr>';
			var rows = always_array( report.TopIPs.Row );
			var highest = 0;
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				row.Count = parseInt(row.Count, 10);
				if (row.Count > highest) highest = row.Count;
			}
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				html += '<tr>';
				html += '<td>' + Math.floor(idx + 1) + '</td>';
				html += '<td>'+icon('world.png', row.IP)+'</td>';
				html += '<td>' + row.DNS + '</td>';
				html += '<td>' + commify(row.Count) + '</td>';
				html += '<td>' + pct(row.Count, highest) + '</td>';
				html += '<td>' + bar(row.Count, highest, 100) + '</td>';
				html += '</tr>';
			}
			html += '</table>';
		}
		else html += '(None)<br/>';
		
		// Top View URLs
		html += report_spacer;
		html += '<h2>Top Requested URLs</h2>';
		if (report.TopViewURLs.Row) {
			html += '<table class="data_table">';
			html += '<tr><th>Rank</th><th>URL</th><th>Requests</th><th>Percentile</th><th>Visual</th></tr>';
			var rows = always_array( report.TopViewURLs.Row );
			var highest = 0;
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				row.Count = parseInt(row.Count, 10);
				if (row.Count > highest) highest = row.Count;
			}
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				html += '<tr>';
				html += '<td>' + Math.floor(idx + 1) + '</td>';
				html += '<td><a href="'+row.URL+'" target="_blank"><span style="word-break: break-word;">'+row.URL+'</span></a></td>';
				html += '<td>' + commify(row.Count) + '</td>';
				html += '<td>' + pct(row.Count, highest) + '</td>';
				html += '<td>' + bar(row.Count, highest, 100) + '</td>';
				html += '</tr>';
			}
			html += '</table>';
		}
		else html += '(None)<br/>';
		
		html += report_spacer;
		html += '<div class="caption">Report Generated: ' + get_nice_date_time( report._Attribs.Modified ) + '</div>';
		html += '<div class="caption">Hostname: ' + report.Hostname + '</div>';
		
		$('d_admin_report').innerHTML = html;
	},
	
	get_user_software_pie: function(sys, title) {
		var html = '';
		if (sys && sys.Row) {
			var rows = deep_copy_tree( always_array( sys.Row ) );
			var total = 0;
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				row.Count = parseInt(row.Count, 10);
				total += row.Count;
			}
			if (!total) total = 1; // prevent divide by zero
			
			// if we have more than 10 slices, combine rest into single "Other" slice
			var other = 0;
			while (rows.length > 10) {
				other += rows.pop().Count;
			}
			if (other > 0) rows.push({ Count: other, Value: "Other" });
			
			var chd = []; // 20,20,20,40
			var chl = []; // IE|Firefox|Safari|Chrome
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				var pct = Math.floor( (row.Count / total) * 100 );
				chd.push( pct );
				
				row.Value = row.Value.toString().replace(/Windows/, 'Win').replace(/Mac\sOS\sX/, 'Mac');
				
				chl.push( escape(row.Value) );
			}
			var url = 'http://chart.apis.google.com/chart?cht=p3&chd=t:'+chd.join(",")+'&chl='+chl.join("|")+'&chtt='+escape(title)+'&chts=397dbb,16&chco=0000FF';
			html = '<a href="'+url+'&chs=700x300" target="_blank"><img src="'+url+'&chs=400x150" width="400" height="150" border="0"/></a>';
		}
		else html = '(No pie for you!)<br/>';
		return html;
	},
	
	get_user_software_table: function(sys, title) {
		var html = '';
		if (sys && sys.Row) {
			html += '<table class="data_table">';
			html += '<tr><th>'+title+'</th><th>Hits</th><th>Percent</th></tr>';
			var rows = always_array( sys.Row );
			var total = 0;
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				row.Count = parseInt(row.Count, 10);
				total += row.Count;
			}
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				html += '<tr>';
				html += '<td>'+row.Value+'</td>';
				html += '<td>' + commify(row.Count) + '</td>';
				html += '<td>' + pct(row.Count, total) + '</td>';
				html += '</tr>';
			}
			html += '</table>';
		}
		else html = '';
		return html;
	}
	
} );
