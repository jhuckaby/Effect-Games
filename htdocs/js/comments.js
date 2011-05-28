// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

/**
 * Effect 1.0 Comment Functions
 * Author: Joseph Huckaby
 **/

var Comments = {
	
	comments_per_page: 20,
	
	get: function(page_id) {
		// render container for comments given page ID
		// and request user comments for page async
		var html = '';
		
		html += '<div class="comments_container">';
		html += '<fieldset><legend>Comments</legend>';
		
		// submit a comment
		/* html += '<div class="submit_comment">';
		html += '<div class="title">Leave A Comment?</div>';
		if (!session.user) {
			html += '<div class="label">Your Name:</div>';
			html += '<input type="text" id="fe_comment_name_'+page_id+'" size="40"/>';
		}
		html += '<div class="label">Your Comment:</div>';
		html += '<textarea id="fe_comment_value_'+page_id+'" cols="60" rows="5"></textarea>';
		html += '<input type="button" value="Submit" onClick="Comments.post(\''+page_id+'\')"/>';
		html += '</div>'; */
		// html += large_icon_button( 'comment_add.png', 'Add Comment...', "Comments.add()" );
		// html += '<br clear="all"/>';
		
		// user comments
		html += '<div class="comments" id="d_comments_' + page_id + '"></div>';
		
		html += '</fieldset>';
		html += '</div>';
		
		// this.current_page_id = page_id;
		
		setTimeout( function() { Comments.search({ page_id: page_id }); }, 1 );
		return html;
	},
	
	search: function(args) {
		// fetch comments for page, and render into container
		if (!args.limit) args.limit = this.comments_per_page;
		if (!args.offset) args.offset = 0;
		
		assert(args.page_id, "Comments.search: No page_id specified");
		
		// args.path = '/page_comments/' + args.page_id;
		args.format = 'xml';
		
		this.last_search = args;
		
		effect_api_get( 'comments_get', args, [this, 'search_response'], { _search_args: args } );
	},
	
	research: function(offset) {
		// run previous search but with different offset
		var args = this.last_search;
		if (!args) return;
		
		args.offset = offset;
		effect_api_get( 'comments_get', args, [this, 'search_response'], { _search_args: args } );
	},
	
	search_response: function(response, tx) {
		// receive comments from server and display them
		this.comments = [];
		
		var args = tx._search_args;
		if (args.callback) return fire_callback(args.callback, response, args);
		
		var html = '';
		html += '<div class="little_button_stack">' + 
			large_icon_button( 'comment_edit.png', 'Post Comment...', "Comments.add('"+args.page_id+"')" ) + '<div class="clear"></div></div>';
		
		if (args.page_id.match(/^Article\//)) {
			html += '<div class="feed">' + icon('feed.png', 'RSS', '/effect/api/comment_feed/' + args.page_id + '.rss', 'Comments RSS Feed') + '</div>';
		}
		
		if (response.Items && response.Items.Item && response.List && response.List.length) {
			// pagination
			html += '<div class="pagination">';
			var total_items = response.List.length;
			
			var num_pages = parseInt( total_items / args.limit, 10 ) + 1;
			if (total_items % args.limit == 0) num_pages--;
			var current_page = parseInt( args.offset / args.limit, 10 ) + 1;
			
			if (num_pages > 1) {
				html += 'Page: ';
				if (current_page > 1) {
					html += code_link( 'Comments.research(' + ((current_page - 2) * args.limit) + ')', '&larr; Prev' );
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
						html += code_link( 'Comments.research(' + ((idx - 1) * args.limit) + ')', idx );
					}
					html += '&nbsp;';
				}

				html += '&nbsp;&nbsp;';
				if (current_page < num_pages) {
					html += code_link( 'Comments.research(' + ((current_page + 0) * args.limit) + ')', 'Next &rarr;' );
				}
			} // more than one page
			else {
				html += 'Page 1 of 1';
			}
			html += '</div>';
			
			// html += '<div class="title">Comments</div>';
			html += '<br clear="all"/>';
			
			var items = this.comments = always_array( response.Items.Item );
			for (var idx = 0, len = items.length; idx < len; idx++) {
				var item = items[idx];
				var extra_classes = (args.highlight && (args.highlight == item.ID)) ? ' highlight' : '';
				html += '<div class="comment_container'+extra_classes+'">';
				
				html += '<div class="info">';
				if (item.Username) html += '<a href="#User/'+item.Username+'">';
				html += '<b>' + item.Name.toString().toUpperCase() + '</b>';
				if (item.Username) html += '</a>';
				html += ', ' + get_short_date_time(item.Date);
				
				if (item.ClientInfo) {
					var useragent = parse_useragent( item.ClientInfo );
					if ((useragent.os != 'Unknown') && (useragent.browser != 'Unknown')) {
						html += ' - ' + useragent.os + ' ' + useragent.browser;
					}
				}
				
				html += '</div>';
				
				// if (session.user) {
					html += '<div class="controls" id="d_comment_controls_'+item.ID+'">';
					html += this.get_comment_controls( args.page_id, item );
					html += '</div>';
				// }
				html += '<br clear="all"/>';
				
				/* html += '<div class="info">';
				if (item.Username) {
					html += '<a href="#User/'+item.Username+'">';
					html += '<img class="png" src="'+get_buddy_icon_url(item.Username) + '" width="32" height="32" border="0"><br>';
					html += html += '<b>' + item.Name + '</b></a>';
				}
				else {
					html += '<b>' + item.Name + '</b><br/>';
					html += '(Visitor)';
				}
				html += '</div>'; */
				
				html += '<div class="comment_body">' + item.Comment + '</div>';
				// html += '<br clear="all"/>';
				
				html += '</div>';
				
				html += '<div id="d_comment_replies_'+item.ID+'" class="comment_replies_container" style="display:none"></div>';
				
				if (item.LastReply && ((item.LastReply >= time_now() - (86400 * 7)) || (session.username && (session.username == item.Username)))) {
					setTimeout( "Comments.show_replies('"+args.page_id+"','"+item.ID+"')", 1 );
				}
			} // foreach comment
		}
		else {
			// html = '(No comments found)';
		}
		
		$( 'd_comments_' + args.page_id ).innerHTML = html;
	},
	
	get_control: function(icon, code, text, status_text) {
		if (!icon.match(/\.\w+$/)) icon += '.gif';
		return '<span class="comment_control" style="background-image:url(/effect/images/icons/small/'+icon+')">' + code_link(code, text, status_text) + '</span>';
	},
	
	get_comment_controls: function(page_id, comment) {
		var html = '';
		var spacer_txt = '&nbsp;&nbsp;|&nbsp;&nbsp;';
		
		if (session.user) {
			html += this.get_control('comment', "Comments.reply('"+page_id+"','"+comment.ID+"')", 'Reply') + spacer_txt;
		}
		
		if (comment.Replies) {
			if (comment._replies_visible) html += this.get_control('magnify_minus', "Comments.hide_replies('"+page_id+"','"+comment.ID+"')", 'Hide Replies');
			else html += this.get_control('magnify_plus', "Comments.show_replies('"+page_id+"','"+comment.ID+"')", 'Show Replies ('+comment.Replies+')');
			
			if (session.user) html += spacer_txt;
		}
		
		if (session.user) {
			html += this.get_control(
				'star', 
				"Comments.like('"+page_id+"','"+comment.ID+"')", 
				'Like' + (comment.Like ? (' ('+comment.Like+')') : ''),
				comment.Like ? (comment.Like + ' ' + ((comment.Like == 1) ? 'person likes this' : 'people like this')) : 'I like this comment'
			) + spacer_txt;
		
			if (is_admin()) html += this.get_control('trash', "Comments._delete('"+page_id+"','"+comment.ID+"')", 'Delete') + spacer_txt;
		
			html += this.get_control('warning', "Comments.report('"+page_id+"','"+comment.ID+"')", 'Report Abuse');
		}
		
		return html;
	},
	
	reply: function(page_id, comment_id) {
		// show dialog for posting comment reply
		hide_popup_dialog();
		delete session.progress;
		
		var comment = find_object( this.comments, { ID: comment_id } );

		var html = '';

		html += '<div class="dialog_bkgnd" style="background-image:url('+png('/effect/images/big_icons/pencil_paper.png')+')">';

		html += '<table cellspacing=0 cellpadding=0><tr><td width=600 height=300 valign=center align=center>';
		html += '<div class="dialog_title">Reply to Comment by "'+comment.Name+'"</div>';

		html += '<form method=get action="javascript:void(0)"><table cellspacing="0" cellpadding="0"><tr><td align="left">';
		
		var name = this.get_name();
		html += '<p align="left"><span class="fe_label">Posted by:</span>&nbsp;' + name;
		if (!session.user) html += ' &rarr; <a href="/effect/#CreateAccount">Create Account</a>';
		html += '</p><br/>';
		
		html += '<textarea class="fe_edit" id="fe_comment_body" style="width:400px; height:150px;" wrap="virtual" onkeydown="return catchTab(this,event)"></textarea>';
		html += Blog.edit_caption;
		
		html += '</td></tr></table>';

		html += '<br><br><table><tr>';
			html += '<td>' + large_icon_button('x', 'Cancel', "hide_popup_dialog()") + '</td>';
			html += '<td width=50>&nbsp;</td>';
			// html += '<td>' + large_icon_button('user', 'Create Account...', "Nav.go('CreateAccount')") + '</td>';
			// html += '<td width=15>&nbsp;</td>';
			html += '<td>' + large_icon_button('check', '<b>Post Reply</b>', "Comments.post_reply('"+page_id+"','"+comment_id+"')") + '</td>';
		html += '</tr></table>';

		html += '</form>';

		html += '</div>';

		// session.hooks.keys[ENTER_KEY] = [Comments, 'post', page_id]; // enter key
		session.hooks.keys[ESC_KEY] = 'hide_popup_dialog'; // escape key

		safe_focus( 'fe_comment_body' );

		show_popup_dialog(600, 300, html);
	},
	
	post_reply: function(page_id, comment_id) {
		// reply to a a comment
		var value = $('fe_comment_body').value;
		if (!value) return;
		
		hide_popup_dialog();
		show_progress_dialog(1, "Posting reply...");
		
		var name = this.get_name();
		
		effect_api_mod_touch('comment_replies_get');
		effect_api_send('comment_post_reply', {
			PageID: page_id,
			CommentID: comment_id,
			Username: session.username || '',
			Name: name,
			Comment: value,
			PageURL: location.href
		}, [this, 'post_reply_finish'], { _page_id: page_id, _comment_id: comment_id } );
	},
	
	post_reply_finish: function(response, tx) {
		// reply was posted successfully
		hide_popup_dialog();
		var page_id = tx._page_id;
		var comment_id = tx._comment_id;
		var comment = find_object( this.comments, { ID: comment_id } );
		
		do_message('success', "Comment reply posted successfully.");
		
		this.show_replies(page_id, comment_id);
		
		if (!comment.Replies) comment.Replies = 1; else comment.Replies++;
		$('d_comment_controls_'+comment_id).innerHTML = this.get_comment_controls( page_id, comment );
	},
	
	show_replies: function(page_id, comment_id) {
		// show replies for comment
		var comment = find_object( this.comments, { ID: comment_id } );
		if (!comment._replies_visible) {
			// replies not visible, show loading icon
			$('d_comment_replies_' + comment_id).show().innerHTML = '<img src="images/loading.gif" width="32" height="32"/>';
		}
		
		var args = { page_id: page_id, comment_id: comment_id, offset: 0, limit: 100 };
		effect_api_get( 'comment_replies_get', args, [this, 'receive_replies_response'], { _search_args: args } );
	},
	
	receive_replies_response: function(response, tx) {
		var page_id = tx._search_args.page_id;
		var comment_id = tx._search_args.comment_id;
		var comment = find_object( this.comments, { ID: comment_id } );
		var html = '';
		
		var replies = always_array( response.Items.Item );
		for (var idx = 0, len = replies.length; idx < len; idx++) {
			var reply = replies[idx];
			// html += '<table cellspacing="0" cellpadding="0"><tr>';
			// html += '<td>' + icon('arrow_turn_right_2.png') + '</td>';
			// html += '<td>';
			html += get_chat_balloon(
				(reply.Username == session.username) ? 'blue' : 'grey', 
				reply.Username, 
				reply.Comment.replace(/^<div[^>]*?>(.+)<\/div>$/i, '$1')
			);
			// html += '</td></tr></table>';
		} // foreach reply
		
		$('d_comment_replies_' + comment_id).innerHTML = html;
		
		if (!comment._replies_visible) {
			// animate div
			$('d_comment_replies_' + comment_id).hide();
			animate_div_visibility( 'd_comment_replies_' + comment_id, true );
		}
		comment._replies_visible = true;
		
		$('d_comment_controls_'+comment_id).innerHTML = this.get_comment_controls( page_id, comment );
	},
	
	hide_replies: function(page_id, comment_id) {
		var comment = find_object( this.comments, { ID: comment_id } );
		if (comment._replies_visible) {
			animate_div_visibility( 'd_comment_replies_' + comment_id, false );
			comment._replies_visible = false;
			$('d_comment_controls_'+comment_id).innerHTML = this.get_comment_controls( page_id, comment );
		}
	},
	
	like: function(page_id, comment_id) {
		// user likes comment
		effect_api_mod_touch('comments_get');
		effect_api_send('comment_like', {
			PageID: page_id,
			CommentID: comment_id
		}, [this, 'like_finish'], { _page_id: page_id, _comment_id: comment_id, _on_error: [this, 'like_error'] } );
		// _on_error
	},
	
	like_error: function(response, tx) {
		if (response.Code == 'comment_already_like') do_message('error', "You already like this comment.");
		else do_error( response.Description );
	},
	
	like_finish: function(response, tx) {
		var page_id = tx._page_id;
		var comment_id = tx._comment_id;
		var comment = find_object( this.comments, { ID: comment_id } );
		
		do_message('success', "You now like this comment.");
		
		if (!comment.Like) comment.Like = 1; else comment.Like++;
		$('d_comment_controls_'+comment_id).innerHTML = this.get_comment_controls( page_id, comment );
	},
	
	add: function(page_id) {
		// show dialog for posting new comment
		hide_popup_dialog();
		delete session.progress;

		var html = '';

		html += '<div class="dialog_bkgnd" style="background-image:url('+png('/effect/images/big_icons/pencil_paper.png')+')">';

		html += '<table cellspacing=0 cellpadding=0><tr><td width=600 height=300 valign=center align=center>';
		html += '<div class="dialog_title">Post New Comment</div>';

		html += '<form method=get action="javascript:void(0)"><table cellspacing="0" cellpadding="0"><tr><td align="left">';
		
		var name = this.get_name();
		html += '<p align="left"><span class="fe_label">Posted by:</span>&nbsp;' + name;
		if (!session.user) html += ' &rarr; <a href="/effect/#CreateAccount">Create Account</a>';
		html += '</p><br/>';
		
		html += '<textarea class="fe_edit" id="fe_comment_body" style="width:400px; height:150px;" wrap="virtual" onkeydown="return catchTab(this,event)"></textarea>';
		html += Blog.edit_caption;
		
		html += '</td></tr></table>';

		html += '<br><br><table><tr>';
			html += '<td>' + large_icon_button('x', 'Cancel', "hide_popup_dialog()") + '</td>';
			html += '<td width=50>&nbsp;</td>';
			// html += '<td>' + large_icon_button('user', 'Create Account...', "Nav.go('CreateAccount')") + '</td>';
			// html += '<td width=15>&nbsp;</td>';
			html += '<td>' + large_icon_button('check', '<b>Post Comment</b>', "Comments.post('"+page_id+"')") + '</td>';
		html += '</tr></table>';

		html += '</form>';

		html += '</div>';

		// session.hooks.keys[ENTER_KEY] = [Comments, 'post', page_id]; // enter key
		session.hooks.keys[ESC_KEY] = 'hide_popup_dialog'; // escape key

		safe_focus( 'fe_comment_body' );

		show_popup_dialog(600, 300, html);
	},
	
	report: function(page_id, comment_id) {
		if (confirm('Are you sure you want to report this comment to the site administrators as abusive and/or spam?')) {
			effect_api_send('comment_report_abuse', {
				PageID: page_id,
				CommentID: comment_id
			}, [this, 'report_finish'], { _page_id: page_id, _comment_id: comment_id } );
		}
	},
	
	report_finish: function(response, tx) {
		do_message('success', 'Your abuse report has been received, and will be evaluated by the site administrators.');
	},
	
	_delete: function(page_id, comment_id) {
		if (confirm('Are you sure you want to permanently delete this comment?')) {
			effect_api_mod_touch('comments_get');
			effect_api_send('comment_delete', {
				PageID: page_id,
				CommentID: comment_id
			}, [this, 'delete_finish'], { _page_id: page_id, _comment_id: comment_id } );
		}
	},
	
	delete_finish: function(response, tx) {
		do_message('success', 'The comment was deleted successfully.');
		var page_id = tx._page_id;
		this.search({ page_id: page_id });
	},
	
	get_name: function() {
		// get user name
		// var name = session.user ? session.user.FullName : '(Anonymous)';
		var name = '(Anonymous)';
		if (session.user) {
			if (get_bool_pref('public_profile')) name = session.user.FullName;
			else name = session.username;
		}
		return name;
	},
	
	post: function(page_id) {
		// leave a comment
		var value = $('fe_comment_body').value;
		if (!value) return;
		
		hide_popup_dialog();
		show_progress_dialog(1, "Posting comment...");
		
		var name = this.get_name();
		
		effect_api_mod_touch('comments_get');
		effect_api_send('comment_post', {
			PageID: page_id,
			Username: session.username || '',
			Name: name,
			Comment: value
		}, [this, 'post_finish'], { _page_id: page_id } );
	},
	
	post_finish: function(response, tx) {
		hide_popup_dialog();
		var comment_id = response.CommentID;
		var page_id = tx._page_id;
		this.search({ page_id: page_id, highlight: comment_id });
	}
	
};
