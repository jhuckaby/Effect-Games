// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.TicketSearch", {
	
	onInit: function() {
		// render page html
		var html = '';
		
		// html += '<h1 id="h_tsearch_header">Loading...</h1>';
		
		html += '<div id="d_tsearch_tab_bar"></div>';
		
		html += '<div id="d_tsearch_content" class="game_main_area">';
			// html += '<div class="blurb">' + get_string('/GameDisplay/Blurb') + '</div>';
			
			html += '<div id="h_tsearch_header" class="h1"></div>';
		
			html += '<fieldset><legend>Search Options</legend>';
				html += '<div id="d_tsearch_opts"></div>';
			html += '</fieldset>';
		
			html += '<div id="d_tsearch_results"></div>';
			
			html += '<div id="d_tsearch_footer"></div>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(thingy) {
		var args = {};
		if (typeof(thingy) == 'object') args = thingy;
		else args.path = '/' + thingy;
		
		this.args = args;
		
		// page is being activated
		if (!require_login()) {
			return false;
		}
		
		this.cat_def = find_object( session.ticket_systems, { Path: args.path } );
		if (!this.cat_def) {
			session.hooks.after_error = [this, 'search_ticket_error'];
			do_error("Could not locate ticket system for: " + args.path);
			return true;
		}
		this.field_defs = always_array( this.cat_def.Field );
		this.rtn = this.cat_def.RecordTypeName;
		this.rtns = this.rtn + 's';
		
		$('h_tsearch_header').innerHTML = '<div class="fl">' + this.cat_def.Title + '</div>' + 
			'<div class="fr">' + '<a class="icon" style="background-image: url(images/icons/'+this.cat_def.Icon+'_add.png);" ' + 
				'href="javascript:void($P().do_new_ticket())" title="Enter New '+this.cat_def.RecordTypeName+'">Enter New '+this.cat_def.RecordTypeName+'</a>' + 
				'</div>' + '<div class="clear"></div>';
				
		$('d_tsearch_tab_bar').innerHTML = get_admin_tab_bar( this.cat_def.Title );
		
		var field_items = [];
		var default_field = '';
		for (var idx = 0; idx < this.field_defs.length; idx++) {
			var field_def = this.field_defs[idx];
			if (field_def.Index) {
				field_items.push([ field_def.ID, field_def.Title ]);
				if (this.args.stag && (this.args.stag.indexOf(field_def.ID) == 0)) default_field = field_def.ID;
			}
		}
		
		var html = '';
		html += '<table width="100%"><tr>';
		html += '<td align="left">';
			html += '<div class="fe_label">Special Searches</div>';
			html += '<table cellspacing="0" cellpadding="0"><tr>';
			html += '<td><div class="little_button_stack" style="margin-right:10px"><nobr>' + large_icon_button('folder.png', 'All ' + this.rtns, "$P().do_all_tickets()") + '</nobr><div class="clear"></div></div><div class="clear"></div></td>';
			html += '<td><div class="little_button_stack" style="margin-right:10px"><nobr>' + large_icon_button('user', 'My ' + this.rtns, "$P().do_my_tickets()") + '</nobr><div class="clear"></div></div><div class="clear"></div></td>';
			html += '</tr></table>';
		html += '</td>';
		html += '<td>' + spacer(10,1) + '</td>';
		html += '<td align="left">';
			html += '<div class="fe_label">Search by Tag</div>';
			html += '<table cellspacing="0" cellpadding="0"><tr>';
				html += '<td><form method="get" action="javascript:void(0)"><input type="text" class="fe_small" id="fe_tsearch_tag" size="15" value="'+escape_text_field_value(this.args.tag)+'" onEnter="$P().do_tag_search()"/></form></td>';
				// html += '<td style="font-size:11px">' + large_icon_button('zoom.png', 'Search', "$P().do_tag_search()") + '<div class="clear"></div></td>';
				html += '<td><input type="button" value="Search" onClick="$P().do_tag_search()"/></td>';
			html += '</tr></table>';
		html += '</td>';
		html += '<td>' + spacer(20,1) + '</td>';
		html += '<td align="left">';
			html += '<div class="fe_label">Field Search</div>';
			html += '<table cellspacing="0" cellpadding="0"><tr>';
				html += '<td>'+menu('fe_tsearch_field_id', field_items, default_field, {
					'class': 'fe_small_menu',
					'onChange': "$P().set_field(this.options[this.selectedIndex].value)"
				})+'</td>';
				html += '<td id="td_tsearch_field"></td>';
				// html += '<td style="font-size:11px">' + large_icon_button('zoom.png', 'Search', "$P().do_stag_search()") + '<div class="clear"></div></td>';
				html += '<td><input type="button" value="Search" onClick="$P().do_stag_search()"/></td>';
			html += '</tr></table>';
		html += '</td>';
		html += '</tr></table>';
		$('d_tsearch_opts').innerHTML = html;
		
		html = '';
		html += '<center><table style="margin-top:20px; margin-bottom:20px;"><tr>';
			html += '<td>' + large_icon_button(this.cat_def.Icon+'_add.png', '<b>Enter New '+this.rtn+'...</b>', "$P().do_new_ticket()") + '</td>';
		html += '</tr></table></center>';
		$('d_tsearch_footer').innerHTML = html;
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Admin', 'Admin'],
			[Nav.currentAnchor(), this.cat_def.Title]
		);
		
		Nav.title( this.cat_def.Title );
		
		this.do_search(args);
		
		// populate td_search_field in new ithread
		var self = this;
		setTimeout( function() {
			self.set_field( default_field || field_items[0][0] );
			$('fe_tsearch_tag').onkeydown = delay_onChange_input_text;
		}, 1 );
		
		return true;
	},
	
	onDeactivate: function(new_page) {
		$('h_tsearch_header').innerHTML = '';
		$('d_tsearch_tab_bar').innerHTML = '';
		$('d_tsearch_opts').innerHTML = '';
		$('d_tsearch_results').innerHTML = '';
		return true;
	},
	
	do_new_ticket: function() {
		Nav.go( 'Ticket' + this.args.path );
	},
	
	search_ticket_error: function() {
		Nav.go('Home');
	},
	
	do_my_tickets: function() {
		Nav.go( 'TicketSearch' + composeQueryString({
			path: this.args.path,
			stag: 'inbox_' + session.username,
			l: 'my'
		}) );
	},
	
	do_all_tickets: function() {
		Nav.go( 'TicketSearch' + composeQueryString({
			path: this.args.path,
			l: 'all'
		}) );
	},
	
	do_tag_search: function() {
		var tag = trim($('fe_tsearch_tag').value);
		if (tag) {
			Nav.go( 'TicketSearch' + composeQueryString({
				path: this.args.path,
				tag: get_url_friendly_title(tag)
			}) );
		}
	},
	
	do_stag_search: function() {
		var id = get_menu_value('fe_tsearch_field_id');
		var field_def = find_object( this.field_defs, { ID: id } );
		var value = '';
		
		if (field_def.Special && this['get_special_search_field_value_'+field_def.Special]) {
			var func = 'get_special_search_field_value_' + field_def.Special;
			value = this[func](field_def);
		}
		else {
			switch (field_def.Type) {
				case 'Text':
					value = trim($('fe_tsearch_field_value').value);
					break;
			
				case 'Menu':
					value = get_menu_value('fe_tsearch_field_value');
					break;
			}
		}
		
		// if (value.length) {
			Nav.go( 'TicketSearch' + composeQueryString({
				path: this.args.path,
				stag: id + '_' + get_url_friendly_title(value)
			}) );
		// }
	},
	
	render_special_search_field_EngineVersions: function(field_def, value) {
		var version_items = ['n/a'];
		for (var idx = 0, len = session.engine_versions.length; idx < len; idx++) {
			var verobj = session.engine_versions[idx];
			version_items.push([ verobj.Name, verobj.Title ]);
			
			if (value == get_url_friendly_title(verobj.Name)) value = verobj.Name;
		}
		return '<form>' + menu('fe_tsearch_field_value', version_items, value, {'class':'fe_small_menu'}) + '</form>';
	},
	
	render_special_search_field_UserSoftware: function(field_def, value) {
		var html = '';
		var id = field_def.ID;
		var client_info = parse_useragent();
		
		var value_os = client_info.os;
		var value_browser = client_info.browser;
		
		var abbrev_oses = [];
		for (var idx = 0, len = config.ClientInfo.OS.length; idx < len; idx++) {
			var os = config.ClientInfo.OS[idx];
			abbrev_oses[idx] = [ os, os.replace(/Windows/, 'Win') ];
			
			if (value.match( new RegExp( get_url_friendly_title(os) ) )) value_os = os;
		}
		
		var abbrev_browsers = [];
		for (var idx = 0, len = config.ClientInfo.Browser.length; idx < len; idx++) {
			var browser = config.ClientInfo.Browser[idx];
			abbrev_browsers[idx] = [ browser, browser.replace(/Internet Explorer/, 'IE').replace(/Firefox/, 'FF').replace(/Safari/, 'Saf').replace(/Opera/, 'Op') ];
			
			if (value.match( new RegExp( get_url_friendly_title(browser) ) )) value_browser = browser;
		}
		
		html += '<form><table cellspacing="0" cellpadding="0"><tr>';
			html += '<td>' + menu( 'fe_tsearch_field_'+id+'_os', array_combine(['n/a'], abbrev_oses).sort(), value_os, {'class':'fe_small_menu'} ) + '</td>';
			html += '<td>' + menu( 'fe_tsearch_field_'+id+'_browser', array_combine(['n/a'], abbrev_browsers).sort(), value_browser, {'class':'fe_small_menu'} ) + '</td>';
		html += '</tr></table></form>';
		
		return html;
	},
	
	get_special_search_field_value_UserSoftware: function(field_def) {
		var id = field_def.ID;
		return get_menu_value('fe_tsearch_field_'+id+'_os') + ' ' + get_menu_value('fe_tsearch_field_'+id+'_browser');
	},
	
	set_field: function(id) {
		var field_def = find_object( this.field_defs, { ID: id } );
		var html = '';
		
		var value = '';
		if (this.args.stag && (this.args.stag.indexOf(field_def.ID) == 0)) {
			value = this.args.stag.substring( field_def.ID.length + 1 );
		}
		
		if (field_def.Special && this['render_special_search_field_' + field_def.Special]) {
			var func = 'render_special_search_field_' + field_def.Special;
			html += this[func]( field_def, value );
		}
		else {
			switch (field_def.Type) {
				case 'Text':
					html += '<form method="get" action="javascript:void(0)"><input type="text" class="fe_small" id="fe_tsearch_field_value" size="15" value="'+escape_text_field_value(value)+'" onEnter="$P().do_stag_search()"/></form>';
					setTimeout( function() {
						if ($('fe_tsearch_field_value')) $('fe_tsearch_field_value').onkeydown = delay_onChange_input_text;
					}, 1 );
					break;
			
				case 'Menu':
					var items = field_def.Items.split(/\,\s*/);
					for (var idx = 0, len = items.length; idx < len; idx++) {
						if (value == get_url_friendly_title(items[idx])) {
							value = items[idx];
							idx = len;
						}
					}
					html += '<form>' + menu('fe_tsearch_field_value', items, value, {'class':'fe_small_menu'}) + '</form>';
					break;
			}
		}
		
		$('td_tsearch_field').innerHTML = html;
	},
	
	do_search: function(args) {
		var search_args = copy_object( args );
		if (!search_args.mode) search_args.mode = 'and';
		if (!search_args.offset) search_args.offset = 0;
		if (!search_args.limit) search_args.limit = 20;
		if (!search_args.format) search_args.format = 'xml';
		
		this.last_search = search_args;
		
		$('d_tsearch_results').innerHTML = '<img src="images/loading.gif" width="32" height="32"/>';
		
		effect_api_get( 'ticket_search', search_args, [this, 'search_response'], { _search_args: search_args } );
	},
	
	research: function(offset) {
		var args = this.last_search;
		if (!args) return;
		
		args.offset = offset;
		this.do_search( args );
	},
	
	search_response: function(response, tx) {
		var html = '';
		var args = tx._search_args;
		
		var title = '';
		if (!args.tag && !args.stag) args.l = 'all';
		switch (args.l) {
			case 'my': title = 'My ' + this.rtns; break;
			case 'all': title = 'All ' + this.rtns; break;
			default: title = 'Search Results'; break;
		}
		html += '<h2 style="margin-top:10px;">'+title+'</h2>';
		
		var total_items = 0;
		if (response.List) total_items = response.List.length;
		html += '<div class="fl">' + total_items + ' ' + pluralize(this.rtn.toLowerCase(), total_items) + ' found' + ((total_items > 0) ? ':' : '') + '</div>';
				
		if (response.Rows && response.Rows.Row) {
			// pagination
			html += '<div class="pagination">';
			
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
			
			// html += '<div class="title">Comments</div>';
			html += '<br clear="all"/>';
			html += spacer(1,10) + '<br/>';
			
			html += '<table class="data_table" width="100%">';
			html += '<tr>';
				html += '<th>' + icon('attachment') + '</th>';
				html += '<th>ID</th>';
				html += '<th>Summary</th>';
				html += '<th>Category</th>';
				html += '<th>Status</th>';
				html += '<th>Assigned&nbsp;To</th>';
				// html += '<th>Created</th>';
				html += '<th>Modified</th>';
				html += '<th>Actions</th>';
			html += '</tr>';
			
			var tickets = always_array( response.Rows.Row );
			for (var idx = 0, len = tickets.length; idx < len; idx++) {
				var ticket = tickets[idx];
				
				var ticket_url = '#Ticket' + this.args.path + '/' + ticket.TicketID;
				var bopen = ticket.status.match(/^(New|Active)$/) ? '<b>' : '';
				var bclose = ticket.status.match(/^(New|Active)$/) ? '</b>' : '';
				
				html += '<tr>';
				html += '<td>' + ((ticket.Files && ticket.Files.File) ? icon('attachment') : '') + '</td>';
				html += '<td><a href="'+ticket_url+'">'+bopen+get_ticket_number_disp(ticket.TicketID)+bclose+'</a></td>';
				html += '<td><a href="'+ticket_url+'">'+bopen+ticket.summary+bclose+'</a></td>';
				html += '<td><nobr>' + ticket.category + '</nobr></td>';
				html += '<td><nobr>' + ticket.status + '</nobr></td>';
				html += '<td>' + (ticket.assigned ? ('<a href="#User/'+ticket.assigned+'">'+ticket.assigned+'</a>') : '<span style="color:#888;">(None)</span>') + '</td>';
				// html += '<td><nobr>' + get_short_date_time(ticket._Attribs.Created) + '</nobr></td>';
				html += '<td><nobr>' + get_short_date_time(ticket._Attribs.Modified) + '</nobr></td>';
				html += '<td><nobr>' + '<a href="'+ticket_url+'">Edit</a> | ' + code_link("$P().delete_ticket('"+ticket.TicketID+"')", 'Delete') + '</nobr></td>';
				html += '</tr>';
			} // foreach ticket
			
			html += '</table>';
		}
		else {
			// html = '(No ' + this.rtns.toLowerCase() + ' found)';
			html += '<div class="clear"></div>';
		}
				
		$('d_tsearch_results').innerHTML = html;
	},
	
	delete_ticket: function(ticket_id) {
		if (confirm("Are you sure you want to permanently delete the " + this.rtn.toLowerCase() + " #" + ticket_id + "?")) {
			effect_api_mod_touch('ticket_search', 'ticket_get');
			effect_api_send('ticket_delete', {
				Path: this.args.path,
				TicketID: ticket_id
			}, [this, 'delete_finish'], { _ticket_id: ticket_id } );
		}
	},
	
	delete_finish: function(response, tx) {
		this.research( this.last_search.offset );
		do_message('success', this.rtn + " #" + tx._ticket_id + " was deleted successfully." );
	}
	
} );

Class.subclass( Effect.Page, "Effect.Page.Ticket", {
	
	onActivate: function(uri) {
		// page is being activated, show form
		if (!require_login()) {
			return false;
		}
		
		this.ticket_id = '';
		this.ticket_path = '';
		
		this.messages = [];
		this.files = [];
		
		// copy search args from search page, for navigating back to it
		this.search_uri = '';
		var spage = page_manager.find('TicketSearch');
		if (spage) {
			this.search_uri = composeQueryString( spage.args );
		}
		
		if (uri && uri.match(/^(.+)\/(\w+)$/)) {
			var path = '/' + RegExp.$1;
			var id = RegExp.$2;
			this.ticket_path = path;
			this.ticket_id = id;
			
			this.cat_def = find_object( session.ticket_systems, { Path: path } );
			if (!this.cat_def) {
				session.hooks.after_error = [this, 'edit_ticket_error'];
				do_error("Could not locate ticket system for: " + path);
				return true;
			}
			
			if (!this.search_uri) this.search_uri = this.ticket_path;
			
			this.rtn = this.cat_def.RecordTypeName;
			this.rtns = this.rtn + 's';
			
			this.do_edit_ticket(path, id);
			return true;
		}
		else if (uri) {
			this.ticket_path = '/' + uri;
			this.ticket_id = '';
			
			this.cat_def = find_object( session.ticket_systems, { Path: this.ticket_path } );
			if (!this.cat_def) {
				session.hooks.after_error = [this, 'edit_ticket_error'];
				do_error("Could not locate ticket system for: " + this.ticket_path);
				return true;
			}
			
			if (!this.search_uri) this.search_uri = this.ticket_path;
			
			this.rtn = this.cat_def.RecordTypeName;
			this.rtns = this.rtn + 's';
		}
		else {
			session.hooks.after_error = [this, 'edit_ticket_error'];
			do_error("No ticket system specified.");
			return true;
		}
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			is_admin() ? ['Admin', 'Admin'] : '_ignore_',
			is_admin() ? ['TicketSearch' + this.search_uri, this.cat_def.Title] : '_ignore_',
			[Nav.currentAnchor(), "New " + this.rtn]
		);
		
		Nav.title( 'New ' + this.rtn + ' | ' + this.cat_def.Title );
		
		this.draw_ticket_form( {} );
		
		return true;
	},
	
	onDeactivate: function(new_page) {
		// kill floating upload movie
		upload_destroy();
		this.div.innerHTML = '';
		return true;
	},
	
	do_edit_ticket: function(ticket_path, ticket_id) {
		// edit existing ticket
		session.hooks.after_error = [this, 'edit_ticket_error'];
		effect_api_get('ticket_get', { path: ticket_path, id: ticket_id }, [this, 'do_edit_ticket_2'], {});
	},
	
	edit_ticket_error: function() {
		// catch edit ticket error and send user back to prev page
		Nav.prev();
	},
	
	do_edit_ticket_2: function(response) {
		// edit existing ticket
		delete session.hooks.after_error;
		var ticket = response.Row;
		var title = 'Editing ' + this.rtn + ' ' + get_ticket_number_disp(ticket.TicketID);
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			is_admin() ? ['Admin', 'Admin'] : '_ignore_',
			is_admin() ? ['TicketSearch' + this.search_uri, this.cat_def.Title] : '_ignore_',
			[Nav.currentAnchor(), 'Edit ' + this.rtn]
		);
		
		Nav.title( title + ' | ' + this.cat_def.Title );
		
		this.messages = [];
		if (response.Messages && response.Messages.Message) {
			this.messages = always_array( response.Messages.Message );
		}
		
		this.author_full_name = '';
		if (response.AuthorFullName) this.author_full_name = response.AuthorFullName;
		
		this.files = [];
		if (ticket.Files && ticket.Files.File) {
			this.files = always_array( ticket.Files.File );
		}
		
		this.draw_ticket_form( ticket );
	},
	
	draw_ticket_form: function(ticket) {
		var html = '';
		html += '<form method=get action="javascript:void(0)">';
		
		// html += begin_section('blue_border', 24, 'png');
		if (is_admin()) {
			html += '<div>'+get_admin_tab_bar(this.cat_def.Title)+'</div>';
		}
		else {
			html += '<div>'+tab_bar([['', this.cat_def.Title, this.cat_def.Icon + '.png']], this.cat_def.Title)+'</div>';
		}
		html += '<div class="game_main_area">';
		
		html += '<h1>' + (ticket.TicketID ? 
			('Editing ' + this.rtn + ' #'+ticket.TicketID) : 
			'New ' + this.rtn) + '</h1>';
		
		html += '<table style="margin:20px;">';
		
		if (ticket.TicketID) {
			// author, created, modified
			html += '<tr><td align="right" class="fe_label" style="padding-right: 10px;">Submitted By:</td>' + 
				'<td align="left" class=""><a href="#User/'+ticket.Author+'">' + ticket.Author + '</a>';
			if (this.author_full_name) html += ' (' + this.author_full_name + ')';
			html += '</td></tr>';
			
			html += '<tr><td align="right" class="fe_label" style="padding-right: 10px;">Created:</td>' + 
				'<td align="left" class="">' + get_short_date_time(ticket._Attribs.Created, 1) + '</td></tr>';
			html += '<tr><td align="right" class="fe_label" style="padding-right: 10px;">Modified:</td>' + 
				'<td align="left" class="">' + get_short_date_time(ticket._Attribs.Modified, 1) + '</td></tr>';
			html += '<tr><td colspan=2>' + spacer(1,10) + '</td></tr>';
		}
		
		var field_defs = always_array( this.cat_def.Field );
		for (var idx = 0, len = field_defs.length; idx < len; idx++) {
			var field_def = field_defs[idx];
			var id = field_def.ID;
			var value = ticket.TicketID ? ticket[ id ] : (field_def.Default || '');
			
			html += '<tr><td align="right" class="fe_label_left">'+field_def.Title+':</td>';
			html += '<td align="left">';
			if (field_def.Special) {
				var func = 'render_special_field_' + field_def.Special;
				html += this[func]( field_def, value );
			}
			else {
				switch (field_def.Type) {
					case 'Menu':
						html += menu('fe_tix_' + id, field_def.Items.split(/\,\s*/), value, {'class':'fe_medium'});
						break;
					
					case 'Text':
						html += '<input type="text" class="fe_medium" id="fe_tix_'+id+'" size="'+field_def.Size+'" maxlength="'+field_def.MaxLength+'" value="'+escape_text_field_value(value)+'"/>';
						break;
					
					case 'TextArea':
						html += '<textarea class="fe_edit" wrap="virtual" id="fe_tix_'+id+'" cols="'+field_def.Cols+'" rows="'+field_def.Rows+'"' +
						 	' maxlength="'+field_def.MaxLength+'" onkeydown="return catchTab(this,event)">' + escape_textarea_value(value)+'</textarea>';
						break;
				}
			}
			html += '</td></tr>';
			if (field_def.Caption) {
				html += '<tr><td></td><td class="caption"> ' + field_def.Caption + ' </td></tr>';
			}
			html += '<tr><td colspan=2>' + spacer(1,10) + '</td></tr>';
		} // foreach field
		
		// tags
		html += '<tr><td align="right" class="fe_label_left">Tags:</td>';
		html += '<td align="left"><input type="text" id="fe_tix_tags" class="fe_medium" size="30" maxlength="128" value="'+escape_text_field_value(ticket.Tags)+'"/></td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,10) + '</td></tr>';
		
		if (ticket.TicketID) {
			html += '<tr><td colspan=2>' + spacer(1,10) + '</td></tr>';
			
			// messages
			html += '<tr><td colspan="2"><fieldset><legend>Comments</legend>';
			html += '<div class="little_button_stack">' + 
				large_icon_button('comment_add.png', 'Add Comment...', "$P().show_post_message_dialog()") + 
				'<div class="clear"></div></div><div class="clear"></div>';
			html += '<div id="d_tix_messages">';
			if (this.messages.length) {
				html += this.render_messages();
			}
			else {
				// html += '(No comments found)';
			}
			html += '</div>';
			html += '</fieldset></td></tr>';
			html += '<tr><td colspan=2>' + spacer(1,10) + '</td></tr>';
			
			// files
			html += '<tr><td colspan="2"><fieldset><legend>Attachments</legend>';
			html += '<div class="little_button_stack">' + 
				large_icon_button('page_white_get.png', 'Attach Files...', 'upload_basic()', 'btn_tix_upload', {}) + 
				'<div class="clear"></div></div><div class="clear"></div>';
			html += '<div id="d_tix_files">';
			if (this.files.length) {
				html += this.render_files();
			}
			else {
				// html += '(No attachments found)';
			}
			html += '</div>';
			html += '</fieldset></td></tr>';
			html += '<tr><td colspan=2>' + spacer(1,10) + '</td></tr>';
		}
		
		html += '</table>';
		
		html += '<br/>';
		
		html += '<center>';
		if (ticket.TicketID && is_admin()) {
			html += '<input type="checkbox" id="fe_tix_author_notify" value="1" checked="checked"/>';
			html += '<label for="fe_tix_author_notify">Notify ticket submitter about changes.</label><br/><br/>';
		}
		html += '<table style="margin-bottom:20px;"><tr>';
			if (is_admin()) {
				html += '<td>' + large_icon_button('x', 'Cancel', "#TicketSearch" + this.search_uri) + '</td>';
				html += '<td width=30>&nbsp;</td>';
				
				if (ticket.TicketID) {
					html += '<td>' + large_icon_button('trash', 'Delete', "$P().do_delete_ticket()") + '</td>';
					html += '<td width=30>&nbsp;</td>';
					html += '<td>' + large_icon_button('arrow_turn_left.png', 'Reply...', "$P().show_reply_dialog()") + '</td>';
					html += '<td width=30>&nbsp;</td>';
				}
			}
			if (ticket.TicketID) {
				html += '<td>' + large_icon_button(this.cat_def.Icon+'_edit.png', '<b>Save Changes</b>', "$P().post()") + '</td>';
			}
			else {
				html += '<td>' + large_icon_button(this.cat_def.Icon+'_add.png', '<b>Submit '+this.rtn+'</b>', "$P().post()") + '</td>';
			}
		html += '</tr></table></center>';
		
		// html += end_section();
		html += '</div>';
		
		html += '</form>';
		this.div.innerHTML = html;
		
		// setup zeroupload
		if (ticket.TicketID) {
			var self = this;
			setTimeout( function() {
				prep_upload('btn_tix_upload', '/effect/api/ticket_upload_file?path=' + self.ticket_path + '&ticket=' + self.ticket_id, 
					[self, 'upload_files_finish']);
			}, 1 );
		}
		else {
			safe_focus( 'fe_tix_summary' );
		}
		
		this.ticket = ticket;
	},
	
	render_files: function() {
		var html = '';
		
		if (this.files.length > 0) {
			html += '<table class="prop_table">';
			for (var idx = 0, len = this.files.length; idx < len; idx++) {
				var file = this.files[idx];
				html += '<tr><td height="22">' + icon('trash', '', "$P().delete_file("+idx+")", "Delete File") + '</td>';
				html += '<td width="200">';
					html += asset_icon_link('', file.Name, 
						"window.open('/effect/api/view/tickets"+this.ticket_path+"/"+this.ticket_id+"/"+file.Name+"')", 180);
					// html += get_icon_for(file.Name, '', ww_fit_filename(file.Name, 180, session.em_width), '');
				html += '</td>';
				
				html += '<td>' + get_text_from_bytes(file.Size) + '</td>';
				html += '<td><a href="#User/'+file.Username+'">' + file.Username + '</a></td>';
				
				html += '</tr>';
			} // foreach file
			html += '</table>';
		}
		
		return html;
	},
	
	delete_file: function(idx) {
		// delete selected file from staging area
		var file = this.files[idx];
		
		effect_api_send('ticket_delete_file', {
			Path: this.ticket_path,
			TicketID: this.ticket_id,
			Filename: file.Name
		}, [this, 'delete_file_finish'], { _idx: idx });
	},
	
	delete_file_finish: function(response, tx) {
		// receive response from server
		var idx = tx._idx;
		var file = this.files[idx];
		
		this.files.splice( idx, 1 );
		
		do_message('success', "Deleted file \""+file.Name+"\".");
		$('d_tix_files').innerHTML = this.render_files();
	},
	
	upload_files_finish: function() {
		hide_popup_dialog();
		effect_api_mod_touch( 'ticket_get' );
		effect_api_get( 'ticket_get', { path: this.ticket_path, id: this.ticket_id, files_only: 1 }, [this, 'receive_files'], { } );
	},
	
	receive_files: function(response, tx) {
		if (response.LastUploadError) {
			do_error( "Failed to upload file: " + response.LastUploadError );
			return;
		}
		
		if (response.Files && response.Files.File) {
			this.files = always_array( response.Files.File );
			$('d_tix_files').innerHTML = this.render_files();
			do_message('success', "File(s) uploaded successfully.");
		}
	},
	
	render_messages: function(args) {
		if (!args) args = {};
		var html = '';
		
		for (var idx = 0, len = this.messages.length; idx < len; idx++) {
			var message = this.messages[idx];
			
			var extra_classes = (args.highlight && (args.highlight == message.MessageID)) ? ' highlight' : '';
			html += '<div class="comment_container'+extra_classes+'">';
			
			html += '<div class="info">' + message.MessageType + ' by <b>' + 
				message.Username.toString().toUpperCase() + '</b>, ' + get_short_date_time(message.Created) + '</div>';
				
			if (session.user) {
				html += '<div class="controls">';
				if (is_admin() || (session.username == message.Username)) {
					html += code_link("$P().delete_message('"+message.MessageID+"')", 'Delete');
				}
				// html += ' | ';
				// html += code_link("Comments.report('"+args.page_id+"','"+item.ID+"')", 'Report Abuse');
				html += '</div>';
			}
			html += '<br clear="all"/>';
			html += '<div class="comment_body" style="margin-left:20px;">' + text_to_html( message.Content ) + '</div>';
			html += '</div>';
		} // foreach message
		
		return html;
	},
	
	delete_message: function(message_id) {
		var message = find_object( this.messages, { MessageID: message_id } );
		// if (confirm('Are you sure you want to permanently delete this '+message.MessageType.toLowerCase()+'?')) {
			effect_api_mod_touch('ticket_get');
			effect_api_send('ticket_delete_message', {
				Path: this.ticket_path,
				TicketID: this.ticket_id,
				MessageID: message_id
			}, [this, 'delete_message_finish'], { _message_id: message_id } );
		// }
	},
	
	delete_message_finish: function(response, tx) {
		var message_id = tx._message_id;
		this.messages.splice( find_object_idx( this.messages, { MessageID: message_id } ), 1 );
		$('d_tix_messages').innerHTML = this.render_messages();
		do_message('success', "Comment deleted successfully.");
		
		setTimeout( function() {
			zero_client.reposition( 'btn_tix_upload' );
		}, 1 );
	},
	
	show_reply_dialog: function() {
		// show dialog for sending reply to ticket author
		hide_popup_dialog();
		delete session.progress;

		var html = '';

		html += '<div class="dialog_bkgnd" style="background-image:url('+png('images/big_icons/email.png')+')">';

		html += '<table cellspacing=0 cellpadding=0><tr><td width=600 height=420 valign=center align=center>';
		html += '<div class="dialog_title" style="margin-bottom:10px;">Send Reply</div>';
				
		html += '<form method=get action="javascript:void(0)"><table cellspacing="0" cellpadding="0"><tr><td align="left">';
		
		html += '<table>';
		html += '<tr><td align=right class="fe_label">To:&nbsp;</td><td align=left>' + this.ticket.Author + '</td></tr>';
		html += '</table>';
		
		html += '<div class="fe_label">Subject:</div>';
		html += '<div><input type="text" class="fe_medium" id="fe_txem_subject" size="30" maxlength="256" value="Re: '+this.ticket.summary+'"/></div>';
		html += '<div class="caption">Enter a subject for your reply.</div>';
		
		html += '<div class="fe_label">Reply:</div>';
		html += '<textarea maxlength="2048" class="fe_edit" id="fe_txem_body" style="width:400px; height:150px;" wrap="virtual" onkeydown="return catchTab(this,event)">';
		html += '</textarea>';
		html += '<div class="caption">Enter the body of your reply here.  Plain text only please.</div>';
		
		// change status
		var status_def = find_object( this.cat_def.Field, { ID: 'status' } );
		var status_items = status_def.Items.split(/\,\s*/);
		html += '<br/><table>';
		html += '<tr><td align=right class="fe_label">Change Status:&nbsp;</td><td align=left>' + 
			menu('fe_txem_status', status_items, this.ticket.status, { 'class':'fe_small_menu' }) + '</td></tr>';
		html += '</table>';
		
		html += '</td></tr></table></form>';
		
		html += '<br><br><table><tr>';
			html += '<td>' + large_icon_button('x', 'Cancel', "hide_popup_dialog()") + '</td>';
			html += '<td width=50>&nbsp;</td>';
			// html += '<td>' + large_icon_button('user', 'Create Account...', "Nav.go('CreateAccount')") + '</td>';
			// html += '<td width=15>&nbsp;</td>';
			html += '<td>' + large_icon_button('check', '<b>Send Reply</b>', "$P().send_reply()") + '</td>';
		html += '</tr></table>';

		html += '</form>';

		html += '</div>';

		// session.hooks.keys[ENTER_KEY] = [Comments, 'post', page_id]; // enter key
		session.hooks.keys[ESC_KEY] = 'hide_popup_dialog'; // escape key

		safe_focus( 'fe_txem_body' );

		show_popup_dialog(600, 420, html);
	},
	
	send_reply: function() {
		var body = trim($('fe_txem_body').value);
		var subject = trim($('fe_txem_subject').value);
		var new_status = get_menu_value('fe_txem_status');
		
		if (body) {
			hide_popup_dialog();
			effect_api_mod_touch('ticket_search', 'ticket_get');
			effect_api_send('ticket_post_reply', {
				Path: this.ticket_path,
				TicketID: this.ticket_id,
				MessageType: 'Comment',
				Content: body,
				Subject: subject
			}, [this, 'post_reply_finish'], { _new_status: new_status } );
		}
	},
	
	post_reply_finish: function(response, tx) {
		// finish posting reply
		do_message('success', "Reply sent successfully.");
		var new_status = tx._new_status;
		
		if (new_status != this.ticket.status) {
			// status has changed, save ticket
			set_menu_value('fe_tix_status', new_status);
			this.disable_notify_author = true;
			this.post();
		}
		else {
			// finished, go back to search page
			Nav.go("TicketSearch" + this.search_uri);
		}
	},
	
	show_post_message_dialog: function() {
		// show dialog for posting new comment
		hide_popup_dialog();
		delete session.progress;

		var html = '';

		html += '<div class="dialog_bkgnd" style="background-image:url('+png('images/big_icons/pencil_paper.png')+')">';

		html += '<table cellspacing=0 cellpadding=0><tr><td width=600 height=275 valign=center align=center>';
		html += '<div class="dialog_title">Post New Comment</div>';

		html += '<form method=get action="javascript:void(0)"><table cellspacing="0" cellpadding="0"><tr><td align="left">';
		html += '<textarea class="fe_edit" id="fe_tix_message_body" style="width:400px; height:150px;" wrap="virtual" onkeydown="return catchTab(this,event)"></textarea>';
		html += '<div class="caption">Enter your comment here.  Plain text only.</div>';
		
		html += '</td></tr></table>';

		html += '<br><br><table><tr>';
			html += '<td>' + large_icon_button('x', 'Cancel', "hide_popup_dialog()") + '</td>';
			html += '<td width=50>&nbsp;</td>';
			// html += '<td>' + large_icon_button('user', 'Create Account...', "Nav.go('CreateAccount')") + '</td>';
			// html += '<td width=15>&nbsp;</td>';
			html += '<td>' + large_icon_button('check', '<b>Post Comment</b>', "$P().post_message()") + '</td>';
		html += '</tr></table>';

		html += '</form>';

		html += '</div>';

		// session.hooks.keys[ENTER_KEY] = [Comments, 'post', page_id]; // enter key
		session.hooks.keys[ESC_KEY] = 'hide_popup_dialog'; // escape key

		safe_focus( 'fe_tix_message_body' );

		show_popup_dialog(600, 275, html);
	},
	
	post_message: function() {
		var body = trim($('fe_tix_message_body').value);
		if (body) {
			hide_popup_dialog();
			effect_api_mod_touch('ticket_get');
			effect_api_send('ticket_post_message', {
				Path: this.ticket_path,
				TicketID: this.ticket_id,
				MessageType: 'Comment',
				Content: body
			}, [this, 'post_message_finish'], { _body: body } );
		}
	},
	
	post_message_finish: function(response, tx) {
		this.messages.unshift( response.Message );
		$('d_tix_messages').innerHTML = this.render_messages();
		do_message('success', "Comment posted successfully.");
		
		setTimeout( function() {
			zero_client.reposition( 'btn_tix_upload' );
		}, 1 );
	},
	
	render_special_field_Assigned: function(field_def, value) {
		var html = '<table cellspacing="0" cellpadding="0"><tr>';
		html += '<td><input type="text" class="fe_medium" id="fe_tix_'+field_def.ID+'" size="'+field_def.Size+'" maxlength="'+field_def.MaxLength+'" value="'+escape_text_field_value(value)+'"/></td>';
		html += '<td>' + spacer(6,1) + '</td>';
		html += '<td style="font-size:11px;">' + large_icon_button('user_add.png', 'Assign to me', "$P().assign_to_me('"+field_def.ID+"')") + '</td>';
		html += '</tr></table>';
		return html;
	},
	
	assign_to_me: function(id) {
		$('fe_tix_'+id).value = session.username;
	},
	
	render_special_field_EngineVersions: function(field_def, value) {
		var version_items = ['n/a'];
		for (var idx = 0, len = session.engine_versions.length; idx < len; idx++) {
			var verobj = session.engine_versions[idx];
			version_items.push([ verobj.Name, verobj.Title ]);
		}
		return menu('fe_tix_' + field_def.ID, version_items, value, {'class':'fe_medium'});
	},
	
	render_special_field_UserSoftware: function(field_def, value) {
		var html = '';
		var id = field_def.ID;
		
		var client_info = null;
		if (value) {
			var parts = value.split(/\,\s*/);
			client_info = { os: parts[0], browser: parts[1] };
		}
		else {
			client_info = parse_useragent();
		}
		
		html += '<table cellspacing="0" cellpadding="0"><tr>';
			html += '<td>' + menu( 'fe_tix_'+id+'_os', array_combine(['n/a'], config.ClientInfo.OS).sort(), client_info.os, {'class':'fe_medium'} ) + '</td>';
			html += '<td>' + spacer(15,1) + '</td>';
			html += '<td>' + menu( 'fe_tix_'+id+'_browser', array_combine(['n/a'], config.ClientInfo.Browser).sort(), client_info.browser, {'class':'fe_medium'} ) + '</td>';
		html += '</tr></table>';
		
		return html;
	},
	
	render_special_field_Cc: function(field_def, value) {
		var html = '<table cellspacing="0" cellpadding="0"><tr>';
		html += '<td><input type="text" class="fe_medium" id="fe_tix_'+field_def.ID+'" size="'+field_def.Size+'" maxlength="'+field_def.MaxLength+'" value="'+escape_text_field_value(value)+'"/></td>';
		html += '<td>' + spacer(6,1) + '</td>';
		html += '<td style="font-size:11px;">' + large_icon_button('user_add.png', 'Add me', "$P().cc_me('"+field_def.ID+"')") + '</td>';
		html += '</tr></table>';
		return html;
	},
	
	cc_me: function(id) {
		var field = $('fe_tix_'+id);
		var re = new RegExp( "\\b" + session.username + "\\b" );
		if (!field.value.match(re)) {
			if (field.value) field.value += ', ';
			field.value += session.username;
		}
	},
	
	do_delete_ticket: function() {
		if (confirm('Are you sure you want to permanently delete the current ticket?  There is no way to undo this operation.')) {
			effect_api_mod_touch('ticket_search', 'ticket_get');
			effect_api_send('ticket_delete', {
				Path: this.ticket_path,
				TicketID: this.ticket_id
			}, [this, 'delete_finish'], { } );
		}
	},
	
	delete_finish: function(response, tx) {
		Nav.go('TicketSearch' + this.search_uri);
		// do_notice( 'Ticket Deleted Successfully', 'The ticket was deleted successfully.', function() { Nav.prev(); } );
		do_message('success', "The "+this.rtn.toLowerCase()+" was deleted successfully.");
	},
	
	get_special_field_value_UserSoftware: function(field_def) {
		var id = field_def.ID;
		return get_menu_value('fe_tix_'+id+'_os') + ', ' + get_menu_value('fe_tix_'+id+'_browser');
	},
	
	post: function() {
		// post ticket
		clear_field_error();
		
		var xml = {
			Path: this.ticket_path,
			TicketID: this.ticket_id,
			Tags: trim($('fe_tix_tags').value)
		};
		
		// fields
		var stags = [];
		var field_defs = always_array( this.cat_def.Field );
		for (var idx = 0, len = field_defs.length; idx < len; idx++) {
			var field_def = field_defs[idx];
			var id = field_def.ID;
			var value = '';
			if (field_def.Special && this['get_special_field_value_' + field_def.Special]) {
				var func = 'get_special_field_value_' + field_def.Special;
				value = this[func]( field_def );
			}
			else {
				switch (field_def.Type) {
					case 'Menu':
						value = get_menu_value('fe_tix_' + id);
						break;
					
					case 'Text':
					case 'TextArea':
						value = trim($('fe_tix_'+id).value);
						break;
				}
			}
			
			if (field_def.Required && !value.length) {
				return bad_field('fe_tix_'+id, "The field \""+field_def.Title+"\" is required.  Please enter a value.");
			}
			
			xml[ id ] = value;
			if (field_def.Index) stags.push( id + '_' + value.replace(/\W+/g, '_').replace(/_+/, '_') );
		} // foreach field
		
		// special stag for "inbox"
		if (xml.assigned && xml.status && xml.status.match(/^(new|active)$/i)) {
			stags.push( 'inbox_' + xml.assigned );
		}
		
		// stags
		xml.STags = stags.join(', ');
		
		// disable notify author
		if (this.disable_notify_author) {
			xml.DisableNotifyAuthor = 1;
			delete this.disable_notify_author;
		}
		else if ($('fe_tix_author_notify') && !$('fe_tix_author_notify').checked) {
			xml.DisableNotifyAuthor = 1;
		}
		
		hide_popup_dialog();
		show_progress_dialog(1, this.ticket_id ? "Saving ticket..." : "Posting ticket...");
		
		effect_api_mod_touch('ticket_search', 'ticket_get');
		effect_api_send('ticket_post', xml, [this, 'post_finish'], {  } );
	},
	
	post_finish: function(response, tx) {
		// receive response from server
		hide_popup_dialog();
		
		if (is_admin()) Nav.go("TicketSearch" + this.search_uri);
		else Nav.go('Ticket' + response.Path + '/' + response.TicketID);
		
		do_message('success', this.ticket_id ? 
			("Your "+this.rtn.toLowerCase()+" changes were saved successfully.") : 
			("Your "+this.rtn.toLowerCase()+" was posted successfully.") 
		);
		
		this.ticket_path = response.Path;
		this.ticket_id = response.TicketID;
	}
	
} );
