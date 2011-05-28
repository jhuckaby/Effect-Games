// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.Contact", {
		
	onInit: function() {
		// render page HTML
	},
	
	onActivate: function(game_id) {
		if (!require_login()) {
			return false;
		}
		
		this.div.innerHTML = '';
		
		this.setup_nav();
		
		this.cat_def = find_object( session.ticket_systems, { Path: '/helpdesk' } );
		
		if (this.games) this.render_form();
		else {
			this.games = [];
			effect_api_get( 'get_user_games', { limit:50, offset:0 }, [this, 'receive_user_games'], { } );
		}
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		this.div.innerHTML = '';
		return true;
	},
	
	setup_nav: function() {
		// setup title and nav
		Nav.title( "Contact Us" );
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			[Nav.currentAnchor(), 'Contact Us']
		);
	},
	
	receive_user_games: function(response, tx) {
		if (response.Rows && response.Rows.Row) {
			this.games = always_array( response.Rows.Row );
		}
		this.render_form();
	},
	
	render_form: function() {
		var html = '';
		
		html += '<form method=get action="javascript:void(0)">';
		
		// html += begin_section('blue_border', 24, 'png');
		html += '<div>'+tab_bar([['#Contact', 'Contact Us', 'mail.gif']], 'Contact Us')+'</div>';
		html += '<div class="game_main_area">';
		
		// html += '<h1>Drop Us A Line</h1>';
		html += '<div class="blurb">' + get_string('/Contact/Blurb') + '</div>';

		html += '<table style="margin:20px;">';
		
		// reason
		var reasons = find_object( this.cat_def.Field, { ID: 'category' } ).Items.split(/\,\s*/);
		html += '<tr><td align=right class="fe_label_left">Reason:</td><td align=left>' + 
			menu( 'fe_cu_reason', reasons, '', {'class':'fe_medium'} ) + '</td></tr>';
		html += '<tr><td></td><td class="caption"> Select the reason why you are contacting us.  If your reason is not in the list, choose "Other". </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// game
		var game_items = [ ['', 'Unspecific'] ];
		for (var idx = 0, len = this.games.length; idx < len; idx++) {
			var game = this.games[idx];
			game_items.push( [game.GameID, ww_fit_string(game.Title, 200, session.em_width, 1)] );
		}
		html += '<tr><td align=right class="fe_label_left">Game:</td><td align=left>' + 
			menu( 'fe_cu_game', game_items, '', {'class':'fe_medium'} ) + '</td></tr>';
		html += '<tr><td></td><td class="caption"> Select which of your games this question applies to, or "Unspecific" if this does not apply. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// os / browser
		var client_info = parse_useragent();
		html += '<tr><td align=right class="fe_label_left">OS/Browser:</td><td align=left>';
		html += '<table cellspacing="0" cellpadding="0"><tr>';
			html += '<td>' + menu( 'fe_cu_os', array_combine(['n/a'], config.ClientInfo.OS).sort(), client_info.os, {'class':'fe_medium'} ) + '</td>';
			html += '<td>' + spacer(15,1) + '</td>';
			html += '<td>' + menu( 'fe_cu_browser', array_combine(['n/a'], config.ClientInfo.Browser).sort(), client_info.browser, {'class':'fe_medium'} ) + '</td>';
		html += '</tr></table>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose your operating system and browser. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// subject
		html += '<tr><td align=right class="fe_label_left">Subject:</td><td align=left><input type=text id="fe_cu_subject" class="fe_medium" size="50" maxlength="256" spellcheck="false" spelling="false"></td></tr>';
		html += '<tr><td></td><td class="caption">Enter a subject for your message.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '</table>';
		
		// body
		html += '<center>';
		html += '<textarea class="fe_edit article_edit_body" id="fe_cu_body" wrap="virtual"></textarea>';
		html += '<div class="caption" style="margin-top:5px;">Enter the body of your message.  Plain text only.</div>';
		html += '</center>';

		html += '<br/><br/>';

		html += '<center><table style="margin-bottom:20px;"><tr>';
			html += '<td>' + large_icon_button('mail.gif', '<b>Send Message</b>', "$P('Contact').send()") + '</td>';
		html += '</tr></table></center>';
		
		// html += end_section();
		html += '</div>';
		
		html += '</form>';
		
		this.div.innerHTML = html;
	},
	
	send: function() {
		// send message
		var xml = {
			Path: this.cat_def.Path,
			TicketID: '',
			Tags: ''
		};
		
		var stags = [];
		
		xml.assigned = '';
		stags.push( 'assigned_' );
		
		xml.status = 'New';
		stags.push( 'status_New' );
		
		xml.priority = 'None';
		stags.push( 'priority_None' );
		
		var reason = get_menu_value('fe_cu_reason');
		xml.category = reason;
		stags.push( 'category_' + get_url_friendly_title(reason) );
		
		var game_id = get_menu_value('fe_cu_game');
		xml.game = game_id;
		stags.push( 'game_' + get_url_friendly_title(game_id) );
		
		var os = get_menu_value('fe_cu_os');
		var browser = get_menu_value('fe_cu_browser');
		xml.software = os + ', ' + browser;
		stags.push( 'software_' + get_url_friendly_title(os + ', ' + browser) );
		
		var subject = $('fe_cu_subject').value;
		if (!subject) return bad_field('fe_cu_subject', "Please enter a subject for your message.");
		xml.summary = subject;
		
		var body = $('fe_cu_body').value;
		if (!body) return do_message('error', "Please enter a message body.");
		xml.description = body;
		
		xml.STags = stags.join(', ');
		
		effect_api_send('ticket_post', xml, [this, 'send_finish'], {} );
	},
	
	send_finish: function(response, tx) {
		Nav.prev();
		do_message('success', "Thank you!  Your message was sent successfully.");
	}
	
} );

Class.subclass( Effect.Page, "Effect.Page.SubmitBug", {
		
	onInit: function() {
		// render page HTML
	},
	
	onActivate: function(game_id) {
		if (!require_login()) {
			return false;
		}
		
		this.div.innerHTML = '';
		
		this.setup_nav();
		
		this.cat_def = find_object( session.ticket_systems, { Path: '/bugs' } );
		
		this.render_form();
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		this.div.innerHTML = '';
		return true;
	},
	
	setup_nav: function() {
		// setup title and nav
		Nav.title( "Submit Bug" );
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			[Nav.currentAnchor(), 'Submit Bug']
		);
	},
	
	render_form: function() {
		var html = '';
		
		html += '<form method=get action="javascript:void(0)">';
		
		// html += begin_section('blue_border', 24, 'png');
		html += '<div>'+tab_bar([['#SubmitBug', 'Submit Bug', 'bug.png']], 'Submit Bug')+'</div>';
		html += '<div class="game_main_area">';
		
		// html += '<h1>Report A Bug</h1>';
		html += '<div class="blurb">' + get_string('/SubmitBug/Blurb') + '</div>';

		html += '<table style="margin:20px;">';
		
		// category
		var categories = find_object( this.cat_def.Field, { ID: 'category' } ).Items.split(/\,\s*/);
		html += '<tr><td align=right class="fe_label_left">Category:</td><td align=left>' + 
			menu( 'fe_sb_category', categories, '', {'class':'fe_medium'} ) + '</td></tr>';
		html += '<tr><td></td><td class="caption"> Select a category for this bug report. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// os / browser
		var client_info = parse_useragent();
		html += '<tr><td align=right class="fe_label_left">OS/Browser:</td><td align=left>';
		html += '<table cellspacing="0" cellpadding="0"><tr>';
			html += '<td>' + menu( 'fe_sb_os', array_combine([['','n/a']], config.ClientInfo.OS).sort(), client_info.os, {'class':'fe_medium'} ) + '</td>';
			html += '<td>' + spacer(15,1) + '</td>';
			html += '<td>' + menu( 'fe_sb_browser', array_combine([['','n/a']], config.ClientInfo.Browser).sort(), client_info.browser, {'class':'fe_medium'} ) + '</td>';
		html += '</tr></table>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose your operating system and browser, if applicable to the bug or feature. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// engine version
		var version_items = [ ['', 'n/a'] ];
		for (var idx = 0, len = session.engine_versions.length; idx < len; idx++) {
			var verobj = session.engine_versions[idx];
			version_items.push([ verobj.Name, verobj.Title ]);
		}
		html += '<tr><td align=right class="fe_label_left">Engine&nbsp;Version:</td><td align=left>' + 
			menu( 'fe_sb_engine', version_items, '', 
				{'class':'fe_medium'} ) + '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose which Effect Engine version your bug or feature applies to, if applicable. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,20) + '</td></tr>';
		
		// subject
		html += '<tr><td align=right class="fe_label_left">Summary:</td><td align=left><input type=text id="fe_sb_subject" class="fe_medium" size="50" maxlength="256" spellcheck="false" spelling="false"></td></tr>';
		html += '<tr><td></td><td class="caption">Summarize your bug or feature in one sentence.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '</table>';
		
		// body
		html += '<center>';
		html += '<textarea class="fe_edit article_edit_body" id="fe_sb_body" wrap="virtual"></textarea>';
		html += '<div class="caption" style="margin-top:5px;">Describe the bug or feature in detail here.  Plain text only.</div>';
		html += '</center>';

		html += '<br/><br/>';

		html += '<center><table style="margin-bottom:20px;"><tr>';
			html += '<td>' + large_icon_button('bug_add.png', '<b>Submit Bug</b>', "$P().submit()") + '</td>';
		html += '</tr></table></center>';
		
		// html += end_section();
		html += '</div>';
		
		html += '</form>';
		
		this.div.innerHTML = html;
	},
	
	submit: function() {
		// send message
		var xml = {
			Path: this.cat_def.Path,
			TicketID: '',
			Tags: ''
		};
		
		var stags = [];
		
		xml.assigned = '';
		stags.push( 'assigned_' );
		
		xml.status = 'New';
		stags.push( 'status_New' );
		
		xml.priority = 'None';
		stags.push( 'priority_None' );
		
		var cat = get_menu_value('fe_sb_category');
		xml.category = cat;
		stags.push( 'category_' + get_url_friendly_title(cat) );
		
		var engine_ver = get_menu_value('fe_sb_engine');
		xml.engine = engine_ver;
		stags.push( 'engine_' + get_url_friendly_title(engine_ver) );
		
		var os = get_menu_value('fe_sb_os');
		var browser = get_menu_value('fe_sb_browser');
		xml.software = os + ', ' + browser;
		stags.push( 'software_' + get_url_friendly_title(os + ', ' + browser) );
		
		var subject = $('fe_sb_subject').value;
		if (!subject) return bad_field('fe_sb_subject', "Please enter a subject for your message.");
		xml.summary = subject;
		
		var body = $('fe_sb_body').value;
		if (!body) return do_message('error', "Please enter a message body.");
		xml.description = body;
		
		xml.STags = stags.join(', ');
		
		effect_api_send('ticket_post', xml, [this, 'send_finish'], {} );
	},
	
	send_finish: function(response, tx) {
		Nav.prev();
		do_message('success', "Thank you!  Your bug was posted successfully.");
	}
	
} );

