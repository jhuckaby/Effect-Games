// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.ArticleEdit", {
	
	onActivate: function(args) {
		// page is being activated, show form
		if (!args) args = {};
		
		if (!require_login()) {
			return false;
		}
		
		this.div.innerHTML = loading_image();
		
		this.old_article_id = '';
		this.old_article_path = '';
		
		if (args.path && args.id) {
			this.old_article_path = args.path;
			this.old_article_id = args.id;
			this.do_edit_article(args.path, args.id);
			return true;
		}
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			[Nav.currentAnchor(), "Post Article"]
		);
		
		Nav.title( 'Post Article' );
		
		this.draw_article_form( merge_objects( args, { AllowComments: 1 } ) );
		
		return true;
	},
	
	onDeactivate: function(new_page) {
		// kill floating upload movie
		// upload_destroy();
		this.div.innerHTML = '';
		return 1;
	},
	
	do_edit_article: function(article_path, article_id) {
		// edit existing article
		session.hooks.after_error = [this, 'edit_article_error'];
		effect_api_get('article_edit', { path: article_path, id: article_id }, [this, 'do_edit_article_2'], {});
	},
	
	edit_article_error: function() {
		// catch edit article error and send user back to prev page
		Nav.prev();
	},
	
	do_edit_article_2: function(response) {
		// edit existing article
		delete session.hooks.after_error;
		var article = response.Article;
		var title = 'Editing Article "'+article.Title+'"';
		
		if (article.Status == 'published') {
			Nav.bar(
				['Main', 'EffectGames.com'],
				['Home', 'My Home'],
				['Article' + article.Path + '/' + article.ArticleID, article.Title],
				[Nav.currentAnchor(), 'Edit Article']
			);
		}
		else {
			Nav.bar(
				['Main', 'EffectGames.com'],
				['Home', 'My Home'],
				[Nav.currentAnchor(), 'Edit Article']
			);
		}
		
		Nav.title( title );
		
		this.draw_article_form( response.Article );
	},
	
	draw_article_form: function(article) {
		var html = '';
		html += '<form method=get action="javascript:void(0)">';
		
		// html += begin_section('blue_border', 24, 'png');
		html += '<div>'+get_user_tab_bar('Post Article')+'</div>';
		html += '<div class="game_main_area">';
		
		html += '<h1>' + (article.Title ? ('Editing Article: "'+article.Title+'"') : 'Post New Article') + '</h1>';
		
		html += '<table style="margin:20px;">';
		
		var cat_items = [];
		for (var idx = 0, len = session.article_categories.Category.length; idx < len; idx++) {
			var cat = session.article_categories.Category[idx];
			if (check_privilege('/article_post_categories' + cat.Path)) {
				cat_items.push([ cat.Path, cat.Title ]);
			}
		}
		
		// user may have custom post privileges (like games he is a member of)
		// which are not in the master list
		// these have the title as the value, rather than normal privileges which are just "1"
		var user_post_privs = xpath_summary( session.user.Privileges.article_post_categories );
		var user_cat_items = [];
		for (var path in user_post_privs) {
			if ((user_post_privs[path] != 0) && (user_post_privs[path] != 1)) {
				user_cat_items.push([ path, ww_fit_string(user_post_privs[path], 400, session.em_width, 1) ]);
			}
		}
		
		if (article.ArticleID || article.Path) {
			var cat_title = article.Path;
			var cat = find_object(cat_items, {"0": article.Path});
			if (!cat) cat = find_object(user_cat_items, {"0": article.Path});
			if (cat) cat_title = cat[1];
			html += '<input type=hidden id="fe_pa_cat" value="'+article.Path+'"/>';
			html += '<input type=hidden id="fe_pa_cat_title" value="'+escape_text_field_value(cat_title)+'"/>';
			html += '<tr><td align=right class="fe_label_left">Category:</td><td align="left" class="medium">'+cat_title+'</td></tr>';
		}
		else {
			html += '<tr><td align=right class="fe_label_left">Category:</td><td align=left>'+menu('fe_pa_cat', cat_items, article.Path, {'class':'fe_medium'})+'</td></tr>';
			html += '<tr><td></td><td class="caption"> Select the category where your article will be posted. </td></tr>';
		}
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '<tr><td align=right class="fe_label_left">Title:</td><td align=left><input type=text id="fe_pa_title" class="fe_medium" size="50" maxlength="128" value="'+escape_text_field_value(article.Title)+'"></td></tr>';
		html += '<tr><td></td><td class="caption"> Enter a title for your article.  This also becomes part of the article URL. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		if (article.Path && article.Path.match(/^\/games\/.+/)) {
			// game article, no tags allowed
			html += '<input type="hidden" id="fe_pa_tags" value=""/>';
		}
		else {
			html += '<tr><td align=right class="fe_label_left">Tags:</td><td align=left><input type=text id="fe_pa_tags" class="fe_medium" size="50" maxlength="128" value="'+escape_text_field_value(article.Tags)+'"></td></tr>';
			html += '<tr><td></td><td class="caption"> Enter a comma-separated list of tags, which can be used to search for your article.  This is optional, but recommended. </td></tr>';
			html += '<tr><td colspan=2>' + spacer(1,10) + '</td></tr>';
		}
		
		// admin tags
		if (is_admin()) {
			var stag_items = [];
			var stags = always_array( session.article_categories.STag );
			for (var idx = 0, len = stags.length; idx < len; idx++) {
				var stag = stags[idx];
				stag_items.push([ stag.Title, stag.Name ]);
			}			
			
			this.stag_menu = new MultiMenu('fe_pa_stags');
			this.stag_menu.multi = true;
			this.stag_menu.toggle = false;
			html += '<tr><td align=right class="fe_label_left">Flags:</td><td align=left>'+this.stag_menu.get_html(stag_items, article.STags, {})+'</td></tr>';
			html += '<tr><td></td><td class="caption"> <b>ADMIN ONLY</b>: Optionally choose flags to attach to this article.  Only select these if you know exactly what you are doing.  This section is only visible to site admins. </td></tr>';
			html += '<tr><td colspan=2>' + spacer(1,10) + '</td></tr>';
		}
		else this.stag_menu = null;
		
		html += '<tr><td align=right class="fe_label"></td><td align=left><input type=checkbox id="fe_pa_comments" value="1" ' + ((article.AllowComments == 1) ? 'checked="checked"' : '') + '/><label for="fe_pa_comments">Allow User Comments</label></td></tr>';
		html += '<tr><td></td><td class="caption"> Choose whether you would like users to be able to add comments about your article, or not.  You may change this preference at any time. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,10) + '</td></tr>';
		
		html += '</table>';
		
		// article body
		html += '<center>';
		html += this.edit_toolbar('fe_pa_body', 'article_edit_toolbar');
		html += '<textarea class="fe_edit article_edit_body" id="fe_pa_body" wrap="virtual" onkeydown="return catchTab(this,event)">'+escape_textarea_value(article.Source)+"\n"+'</textarea>';
		html += '<div class="caption" style="margin-top:5px;">*<b>Bold</b>*&nbsp;&nbsp;|<i>Italic</i>|&nbsp;&nbsp;{<span style="font-family:monaco,courier,monospace;">monospace</span>}&nbsp;&nbsp;&lt;basic html&gt;&nbsp;&nbsp;[http://link]&nbsp;&nbsp;<a href="#Article/Formatting_Guide" target="_blank">Formatting Guide...</a></div>';
		html += '</center>';
		
		html += '<br/><br/>';
		
		html += '<center><table style="margin-bottom:20px;"><tr>';
		
			html += '<td>' + large_icon_button('x', 'Cancel', "Nav.prev()") + '</td>';
			html += '<td width=30>&nbsp;</td>';
		
			if (article.ArticleID) {
				html += '<td>' + large_icon_button('trash', 'Delete Article', "$P('ArticleEdit').do_delete_article()") + '</td>';
				html += '<td width=30>&nbsp;</td>';
			}
			
			html += '<td>' + large_icon_button('zoom.png', 'Preview...', "$P('ArticleEdit').preview()") + '</td>';
			html += '<td width=30>&nbsp;</td>';
			
			if (article.Status == 'published') {
				html += '<td>' + large_icon_button('page_white_edit.png', '<b>Save Changes</b>', "$P('ArticleEdit').post('published')") + '</td>';
			}
			else {
				html += '<td>' + large_icon_button('disk.png', 'Save as Draft', "$P('ArticleEdit').post('draft')") + '</td>';
				html += '<td width=30>&nbsp;</td>';
				html += '<td>' + large_icon_button('page_white_edit.png', '<b>Post Article</b>', "$P('ArticleEdit').post('published')") + '</td>';
			}
		html += '</tr></table></center>';
		
		// html += end_section();
		html += '</div>';
		
		html += '</form>';
		this.div.innerHTML = html;
		if (!article.Title) safe_focus( 'fe_pa_title' );
	},
	
	do_delete_article: function() {
		if (confirm('Are you sure you want to permanently delete the current article?  There is no way to undo this operation.')) {
			effect_api_mod_touch('article_search', 'article_get');
			effect_api_send('article_delete', {
				Path: this.old_article_path,
				ArticleID: this.old_article_id
			}, [this, 'delete_finish'], { } );
		}
	},
	
	delete_finish: function(response, tx) {
		Nav.go('Home');
		// do_notice( 'Article Deleted Successfully', 'The article was deleted successfully.', function() { Nav.prev(); } );
		do_message('success', "The article was deleted successfully.");
	},
	
	toolbar_icon: function(icon_name, func, arg, title, dom_id, id) {
		// insert toolbar icon
		if (!id) id = '';
		if (!icon_name.match(/\.\w+$/)) icon_name += '.gif';
		if (typeof(arg) != 'number') arg = "'" + arg + "'";
		return '<div id="'+id+'" class="toolbar_icon fl" onClick="$P(\'ArticleEdit\').tb_'+func+'(\''+dom_id+'\','+arg+')" title="'+title+'"><img src="'+icons_uri+'/'+icon_name+'" width="16" height="16" border="0"/></div>';
	},
	
	toolbar_spacer: function() {
		return '<div class="fl">'+spacer(10,1)+'</div>';
	},
	
	tb_surround: function(dom_id, ch) {
		if (ch.length == 2) surroundSelection( $(dom_id), ch.substring(0,1), ch.substring(1) );
		else surroundSelection( $(dom_id), ch );
	},
	
	tb_indent: function(dom_id, direction) {
		var input = $(dom_id);
		if (getSelectedText(input).length) {
			indentSelectedText(input, direction);
		}
		else if (direction == 1) {
			// no text selected, just insert a tab
			replaceSelection(input, String.fromCharCode(9));
		}
	},
	
	tb_heading: function(dom_id, level) {
		var chs = '';
		for (var idx = 0; idx < level; idx++) chs += '#.';
		replaceSelection( $(dom_id), "\n=section " + chs + ' ' );
	},
	
	tb_link: function(dom_id) {
		surroundSelection( $(dom_id), '[http://', ']' );
	},
	
	tb_list: function(dom_id, list_type) {
		replaceSelection( $(dom_id), "\n=list\n\tItem 1\n\tItem 2");
	},
	
	tb_table: function(dom_id) {
		replaceSelection( $(dom_id), "\n=table\n\tColumn Header 1 | Column Header 2\n\tItem 1 | Item 2");
	},
	
	tb_image: function(dom_id, flow_type) {
		// insert image
		this.temp_image_flow_type = flow_type;
		do_user_image_manager( [this, 'user_image_finish'] );
	},
	
	edit_toolbar: function(dom_id, extra_classes) {
		// insert edit toolbar for article
		var html = '';
		html += '<div class="edit_toolbar '+str_value(extra_classes)+'">';
		
		html += this.toolbar_icon( 'text_bold.png', 'surround', '*', 'Bold', dom_id );
		html += this.toolbar_icon( 'text_italic.png', 'surround', '|', 'Italic', dom_id );
		html += this.toolbar_icon( 'tag.png', 'surround', '{}', 'Monospace', dom_id );
		html += this.toolbar_icon( 'world_link.png', 'link', 0, 'Link', dom_id );
		
		html += this.toolbar_spacer();
		
		html += this.toolbar_icon( 'text_indent_remove.png', 'indent', -1, 'Outdent Text', dom_id );
		html += this.toolbar_icon( 'text_indent.png', 'indent', 1, 'Indent Text', dom_id );
		html += this.toolbar_icon( 'text_list_bullets.png', 'list', 'bullet', 'Insert List', dom_id );
		html += this.toolbar_icon( 'table.png', 'table', '', 'Insert Table', dom_id );
		
		html += this.toolbar_spacer();
		
		html += this.toolbar_icon( 'picture_add.png', 'image', 'inline', 'Insert Inline Image', dom_id );
		html += this.toolbar_icon( 'photo_add.png', 'image', 'block', 'Insert Block Image', dom_id );
		
		// TODO: def list?, number list?
				
		html += this.toolbar_spacer();
		
		html += this.toolbar_icon( 'text_heading_1.png', 'heading', 1, 'Level 1 Heading', dom_id );
		html += this.toolbar_icon( 'text_heading_2.png', 'heading', 2, 'Level 2 Heading', dom_id );
		html += this.toolbar_icon( 'text_heading_3.png', 'heading', 3, 'Level 3 Heading', dom_id );
		html += this.toolbar_icon( 'text_heading_4.png', 'heading', 4, 'Level 4 Heading', dom_id );
		html += this.toolbar_icon( 'text_heading_5.png', 'heading', 5, 'Level 5 Heading', dom_id );
		
		html += '<div class="clear"></div>';
		html += '</div>';
		
		// setup floating upload movie
		/* var self = this;
		setTimeout( function() {
			prep_upload('d_pa_tb_upload', '/effect/api/upload_user_image', [self, 'do_upload_image_2']);
		}, 1 ); */
		
		return html;
	},
	
	user_image_finish: function(filename) {
		var text = '';
		if (this.temp_image_flow_type == 'block') text = "\n=image " + session.username + '/' + filename + "\n=caption Optional caption here";
		else text = "[image:"+session.username+'/'+filename+"]";
		
		replaceSelection( $('fe_pa_body'), text);
	},
	
	preview: function() {
		var body = $('fe_pa_body').value;
		if (!body) return do_message("error", "Please enter some content for your article before previewing.");
		
		this.preview_win = popup_window('article_preview.html', 'article_preview');
	},
	
	preview_request: function() {
		if (page_manager.current_page_id == 'ArticleEdit') {
			effect_api_send('article_preview', {
				Source: $('fe_pa_body').value
			}, [this, 'preview_finish'], { } );
		}
	},
	
	preview_finish: function(response) {
		// receive response from server, populate window
		var title = $('fe_pa_title').value || 'Untitled';
		if (this.preview_win && !this.preview_win.closed) {
			this.preview_win.document.title = title + ' | Article Preview';
			this.preview_win.document.getElementById('d_title').innerHTML = title;
			this.preview_win.document.getElementById('d_body').innerHTML = response.HTML;
			
			if (response.Warnings && response.Warnings.Warning) {
				var warnings = always_array( response.Warnings.Warning );
				var html = '';
				for (var idx = 0, len = warnings.length; idx < len; idx++) {
					var warning = warnings[idx];
					if (warning.match(/\bon\sline\s(\d+)/)) {
						var line_num = RegExp.$1;
						warning = warning.replace(/\b(on\sline\s\d+)/, '<a href="javascript:void(select_line('+line_num+'))">$1 &rarr;</a>');
					}
					html += '<div class="doxter_warning">' + warning + '</div>';
				}
				this.preview_win.document.getElementById('d_warnings').innerHTML = html;
				this.preview_win.document.getElementById('d_warnings').style.display = 'block';
			} // compile had warnings
		}
	},
	
	preview_select_line: function(num) {
		// select line from preview
		hide_popup_dialog();
		window.focus();
		$('fe_pa_body').focus();
		selectLine($('fe_pa_body'), num);
	},
	
	post: function(status) {
		// post article
		
		// pull path from hidden field if editing, or menu if creating
		var path = $('fe_pa_cat_title') ? $('fe_pa_cat').value : get_menu_value('fe_pa_cat');
		
		var title = $('fe_pa_title').value;
		if (!title) return bad_field("fe_pa_title", "Please enter a title for your article before posting.");
		if (title.replace(/\W+/g, '').length == 0) return bad_field("fe_pa_title", "Please include at least one alphanumeric character in your article title.");
		
		var tags = $('fe_pa_tags').value;
		if (tags) {
			var tags_in = tags.split(/\,\s*/);
			var tags_out = [];
			for (var idx = 0, len = tags_in.length; idx < len; idx++) {
				var tag = tags_in[idx].toLowerCase().replace(/\W+/g, '');
				if (tag.length > 20) tag = tag.substring(0, 20);
				if (tag.length) tags_out.push( tag );
			}
			tags = tags_out.join(', ');
		}
		
		var body = $('fe_pa_body').value;
		if (!body) return do_message("error", "Please enter some content for your article before posting.");
		
		var custom_cat = '';
		var cat_info = find_object( session.article_categories.Category, { Path: path } );
		if (!cat_info) {
			// custom (non-standard) category was selected, so we have to "cache" the category title
			// in with the article.  this is not ideal, but will work for the short term.
			custom_cat = $('fe_pa_cat_title') ? $('fe_pa_cat_title').value : get_menu_text('fe_pa_cat');
		}
		
		hide_popup_dialog();
		show_progress_dialog(1, "Posting article...");
		
		effect_api_mod_touch('article_search', 'article_get', 'article_stream_start', 'article_stream_get');
		effect_api_send('article_post', {
			ArticleID: this.old_article_id,
			Source: body,
			Title: title,
			Tags: tags,
			Path: path,
			Status: status,
			CustomCategory: custom_cat,
			AllowComments: $('fe_pa_comments').checked ? '1' : '0',
			STags: this.stag_menu ? this.stag_menu.get_value() : ''
		}, [this, 'post_finish'], { _status: status } );
	},
	
	post_finish: function(response, tx) {
		// receive response from server
		hide_popup_dialog();
		
		if (response.Warnings && response.Warnings.Warning) {
			var warnings = always_array( response.Warnings.Warning );
			var html = '';
			html += '<div class="doxter_warning" style="font-weight:bold;">Your article was not posted due to the following formatting errors:</div>';
			for (var idx = 0, len = warnings.length; idx < len; idx++) {
				var warning = warnings[idx];
				if (warning.match(/\bon\sline\s(\d+)/)) {
					var line_num = RegExp.$1;
					warning = warning.replace(/\b(on\sline\s\d+)/, '<a href="javascript:void($P(\'ArticleEdit\').preview_select_line('+line_num+'))">$1 &rarr;</a>');
				}
				html += '<div class="doxter_warning">' + warning + '</div>';
			}
			do_error( html, 0, 'pure' );
			return;
		} // compile had warnings
		
		if (tx._status == 'published') {
			// published, so navigate directly to article
			Nav.go('Article' + response.Path + '/' + response.ArticleID);
		}
		else {
			// draft only, so go home, where drafts are listed
			Nav.go('Home');
		}
		
		do_message('success', "Your article was successfully " + ((tx._status == 'published') ? 'published' : 'saved as a draft') + "." );
		
		this.old_article_path = response.Path;
		this.old_article_id = response.ArticleID;
	}
	
} );

Class.subclass( Effect.Page, "Effect.Page.Tag", {
	
	onActivate: function(tag) {
		// page is being activated, perform tag search
		var title = 'Articles tagged "'+tag+'"';
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Tag/' + tag, title]
		);
		Nav.title( title );
		
		$('d_article_tag').innerHTML = loading_image();
		
		Blog.search({
			tag: tag,
			limit: 20,
			target: 'd_article_tag',
			more: 1
		});
		
		// $('h_article_tag').innerHTML = title;
		
		$('h_article_tag').innerHTML = '<div class="fl">' + title + '</div>' + 
			'<div class="fr"><a class="icon feed" href="/effect/api/feed/tag/'+tag+'.rss" title="RSS Feed">RSS Feed</a></div><div class="clear"></div>';
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		$('d_article_tag').innerHTML = '';
		return true;
	}
	
} );

Class.subclass( Effect.Page, "Effect.Page.STag", {
	
	onActivate: function(stag) {
		// page is being activated, perform stag search
		var title = 'Articles stagged "'+stag+'"';
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['STag/' + stag, title]
		);
		Nav.title( title );
		
		$('d_article_stag').innerHTML = loading_image();
		
		Blog.search({
			stag: stag,
			limit: 20,
			target: 'd_article_stag',
			more: 1
		});
		
		// $('h_article_stag').innerHTML = title;
		
		$('h_article_stag').innerHTML = '<div class="fl">' + title + '</div>' + 
			'<div class="fr"><a class="icon feed" href="/effect/api/feed/stag/'+stag+'.rss" title="RSS Feed">RSS Feed</a></div><div class="clear"></div>';
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		$('d_article_stag').innerHTML = '';
		return true;
	}
	
} );

Class.subclass( Effect.Page, "Effect.Page.ArticleCategory", {
	
	onActivate: function(path) {
		// page is being activated, perform category search
		path = '/' + path;
		Debug.trace('page', "Path: " + path);
		
		var cat_info = find_object( session.article_categories.Category, { Path: path } );
		
		// catch user trying to nav to game as category, and redirect to game page
		if (!cat_info && path.match(/^\/games\/([\w\-]+)$/)) {
			this.hide();
			Nav.go('#Game/' + RegExp.$1);
			return true;
		}
		
		$('d_article_category').innerHTML = loading_image();
		
		assert( cat_info, "Cannot locate article category from path: " + path );
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['ArticleCategory' + path, cat_info.Title]
		);
		Nav.title( cat_info.Title );
		
		Blog.search({
			path: path,
			limit: 20,
			target: 'd_article_category',
			more: 1
		});
		
		$('h_article_category').innerHTML = '<div class="fl">' + cat_info.Title + '</div>' + '<div class="fr">' + 
			(check_privilege('/article_post_categories' + path) ? 
				(' <a class="icon post_article" href="#ArticleEdit?Path='+path+'" title="Post Article">Post Article</a> ') : '') + 
			' <a class="icon feed" href="/effect/api/feed/category'+path+'.rss" title="RSS Feed">RSS Feed</a> ' + 
			'</div><div class="clear"></div>';
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		$('d_article_category').innerHTML = '';
		return true;
	}
	
} );

Class.subclass( Effect.Page, "Effect.Page.Article", {
	
	onActivate: function(uri) {
		// page is being activated, load article
		$('td_sidebar').hide();
		$('td_sidebar_spacer').hide();
		
		var article_path = '';
		var article_id = '';
		
		this.anchor = '';
		uri = uri.replace(/\%7C/, '|');
		if (uri.match(/\|(\w+)$/)) {
			// inline section anchor after article name, pipe delimited
			this.anchor = RegExp.$1.toLowerCase();
			uri = uri.replace(/\|(\w+)$/, '');
		}
		
		if (uri.match(/^(.+)\/([^\/]+)$/)) {
			// both category and article specified
			article_path = '/' + RegExp.$1;
			article_id = RegExp.$2;
		}
		else if (uri.match(/^([^\/]+)$/)) {
			// no cateogry, so default to 'main'
			article_path = '/main';
			article_id = RegExp.$1;
		}
		else {
			// bad URI, what do now?
			do_message('error', "Could not locate article: " + uri);
			return false;
		}
		
		var params = {
			path: article_path,
			id: article_id,
			base_anchor: Nav.currentAnchor(),
			format: 'xml'
		};
		
		this.div.innerHTML = loading_image();
		
		if (this.anchor) {
			// anchor, so load entire article
			effect_api_get( 'article_get', params, [this, 'receive_article'], {  } );
		}
		else {
			// no anchor, so let's "stream" the article
			effect_api_get( 'article_stream_start', params, [this, 'receive_article'], {  } );
		}
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		this.div.innerHTML = '';
		$('td_sidebar').show();
		$('td_sidebar_spacer').show();
		return true;
	},
	
	receive_article: function(response, tx) {
		// receive article from server, display
		var article = this.article = response.Row;
		article.Chunks = parseInt( article.Chunks, 10 );
		
		var category_def = find_object( session.article_categories.Category, { Path: article.Path } );
		if (!category_def) category_def = { Title: article.CustomCategory || 'Uncategorized' };
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['ArticleCategory' + article.Path, category_def.Title],
			['Article' + article.Path + '/' + article.ArticleID, article.Title]
		);
		Nav.title( article.Title + ' | ' + category_def.Title );
		
		var row = article;
		var article_url = 'http://' + location.hostname + '/effect/article.psp.html' + row.Path + '/' + row.ArticleID;
		var print_url = 'article_print.psp.html' + row.Path + '/' + row.ArticleID;
		var elem_class = 'article_info_row';
		
		var html = '';
		// html += '<h1>' + article.title + '</h1>';
		// html += '<h1>'+category_def.Title+'</h1>';
		html += '<div class="h1">';
			html += '<div class="fl">' + category_def.Title + '</div>';
			html += '<div class="fr">';
				html += '<a class="icon facebook" href="javascript:void(window.open(\'http://www.facebook.com/sharer.php?u=' + encodeURIComponent(article_url) + '&t=' + encodeURIComponent(article.Title) + '\',\'sharer\',\'toolbar=0,status=0,width=626,height=436\'))" title="Share on Facebook">Facebook</a>';
				html += ' <a class="icon twitter" href="http://twitter.com/home?status=Reading%20' + encodeURIComponent(article.Title) + '%3A%20' + encodeURIComponent(article_url) + '" target="_blank" title="Share on Twitter">Twitter</a>';
			html += '</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		
		html += '<div class="blog_title">' + article.Title + '</div>';
		
		html += '<div class="article_info_floater">';
		if ((session.username == row.Username) || is_admin()) {
			html += '<div class="' + elem_class + '">' + icon('page_white_edit.png', '<span class="bold">Edit Article &rarr;</span>', '#ArticleEdit?path=' + article.Path + '&id=' + article.ArticleID) + '</div>';
			// html += '<center><table><tr><td style="font-size:11px;">' + large_icon_button('page_white_edit.png', 'Edit Article...', '#ArticleEdit?path=' + article.Path + '&id=' + article.ArticleID ) + '</td></tr></table></center>' + spacer(1,10) + '<br/>';
		}
		
		html += '<div class="' + elem_class + '">' + icon('world_link.png', '<span class="bold">Permalink</span>', article_url) + '</div>';
		
		html += '<div class="' + elem_class + '">' + icon('printer.png', '<span class="bold">Printer Friendly</span>', "window.open('" + print_url + "')") + '</div>';
		
		html += '<div class="' + elem_class + '"><b>Category:</b><br/>' + icon('folder', category_def.Title, '#ArticleCategory' + article.Path) + '</div>';
		if (row.Tags) html += '<div class="' + elem_class + '"><b>Tags:</b><br/>' + icon('note.png', make_tag_links(row.Tags)) + '</div>';
		html += '<div class="' + elem_class + '"><b>Posted By:</b><br/>' + get_user_display(row.Username) + '</div>';
		html += '<div class="' + elem_class + '"><b>Last Updated:</b><br/>' + icon('calendar', get_short_date_time(row.Published)) + '</div>';
		
		if (article.AllowComments == 1) {
			html += '<div class="' + elem_class + '"><b>Comments:</b><br/>' + icon('talk', row.Comments) + '</div>';
		}
		
		html += '</div>';
		
		html += '<div class="article_body" id="d_article_body">' + (article.HTML || article.ChunkHTML) + '</div>';
		
		if (!this.anchor && (article.Chunks > 1)) {
			html += '<div id="d_article_progress">' + loading_image() + '</div>';
		}
		
		// comments
		if (article.AllowComments == 1) {
			html += Comments.get('Article' + article.Path + '/' + article.ArticleID);
		}
		
		html += '<br clear="all"/>';
		
		this.div.innerHTML = html;
		
		if (this.anchor) {
			// scroll to anchor
			this.gosub( this.anchor );
		}
		else if (article.Chunks > 1) {
			// more than one chunk, stream them in
			this.chunk_num = 2;
			var self = this;
			setTimeout( function() { self.stream(); }, 1 );
		}
	},
	
	stream: function() {
		// stream in article chunks
		if (!this.active) return;
		if (this.chunk_num <= this.article.Chunks) {
			var params = {
				path: this.article.Path,
				id: this.article.ArticleID,
				chunk: this.chunk_num++,
				base_anchor: Nav.currentAnchor(),
				format: 'xml'
			};
			effect_api_get( 'article_stream_get', params, [this, 'receive_stream'], {  } );
		}
		else {
			var progress = $('d_article_progress');
			if (progress) progress.hide();
		}
	},
	
	receive_stream: function(response, tx) {
		// receive chunk from server
		if (!this.active) return;
		if (response.Row && response.Row.ChunkHTML) {
			var div = document.createElement('div');
			div.innerHTML = response.Row.ChunkHTML;
			$('d_article_body').appendChild( div );
			this.stream();
		}
	},
	
	gosub: function(anchor) {
		// go to sub-anchor (article section)
		this.anchor = anchor;
		if (anchor) {
			// because images may be loading in article that have an indeterminate size,
			// we are cheating here by recalculating the v position 4 times throughout a second
			setTimeout( function() { scroll_to_element( '_section_' + anchor ); }, 1 );
			setTimeout( function() { scroll_to_element( '_section_' + anchor ); }, 250 );
			setTimeout( function() { scroll_to_element( '_section_' + anchor ); }, 500 );
			setTimeout( function() { scroll_to_element( '_section_' + anchor ); }, 1000 );
		}
	}
	
} );
