// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.GamePublisher", {
		
	onInit: function() {
		// render page HTML
		var html = '';
		
		html += '<h1 id="h_game_publish_header">Loading...</h1>';
		
		html += '<div id="d_game_publish_tab_bar"></div>';
		
		html += '<div id="d_game_publish_content" class="game_main_area">';
		html += '<div class="blurb">' + get_string('/GamePublisher/Blurb') + '</div>';
		
		// revisions
		html += '<div class="h1">';
			html += '<div id="d_game_publish_header" class="fl">';
				html += ''; // Game Revisions
			html += '</div>';
			html += '<div class="fr">';
				html += '<a id="a_game_publish_create_rev_link" class="icon add_rev" href="#GameEditRevision" title="Publish New Revision">Publish New Revision</a>';
			html += '</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		html += '<div id="d_game_publish">'+busy()+'</div>';
		html += '<div style="height:30px;"></div>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(game_id) {
		if (!require_login()) {
			return false;
		}
		
		$('d_game_publish').innerHTML = loading_image();
		
		// see if game is already loaded via game page
		var gpage = page_manager.find('Game');
		if (gpage && gpage.game && (gpage.game.GameID == game_id)) {
			this.game = gpage.game;
			this.game_id = gpage.game.GameID;
			this.receive_game();
		}
		else {
			// game not loaded or switched, load again
			effect_api_get('game_get', { 
				id: game_id
			}, [this, 'receive_game'], {});
		}
		
		show_glog_widget( game_id );
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		$('h_game_publish_header').innerHTML = '';
		$('d_game_publish_tab_bar').innerHTML = '';
		$('d_game_publish').innerHTML = '';
		hide_glog_widget();
		return true;
	},
	
	setup_nav: function() {
		// setup title and nav
		Nav.title( "Publisher | " + this.game.Title );
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			[Nav.currentAnchor(), 'Publisher']
		);
	},
	
	receive_game: function(response, tx) {
		// receive game info from server
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID; 
		}
		
		this.setup_nav();
		
		$('d_game_publish_tab_bar').innerHTML = get_game_tab_bar(this.game_id, 'Publish');
		
		$('h_game_publish_header').innerHTML = fit_game_title(this.game.Title);
		
		$('a_game_publish_create_rev_link').setAttribute('href', '#GameEditRevision?game_id=' + this.game_id );
		$('a_game_publish_create_rev_link').href = '#GameEditRevision?game_id=' + this.game_id;
		
		effect_api_get('game_objects_get', { 
			id: this.game_id,
			revs: 1
		}, [this, 'receive_revs'], {});
	},
	
	receive_revs: function(response, tx) {
		// levels
		var html = '';
		if (typeof(response.Revs) != 'undefined') {
			if (response.Revs && response.Revs.Rev) {
				var revs = this.revs = always_array( response.Revs.Rev );
				html += '<table class="data_table">';
				html += '<tr><th>Revision&nbsp;Number</th><th>Release&nbsp;Type</th><th>Size</th><th>Engine&nbsp;Version</th><th>Plugins</th><th>Analytics</th><th>Actions</th></tr>';
			
				for (var idx = 0, len = revs.length; idx < len; idx++) {
					var rev = revs[idx];
				
					var edit_link = '#GameEditRevision?game_id=' + this.game_id + '&rev_id=' + rev.Name;
					var play_link = "$P().launch_rev('"+rev.Name+"')";
				
					html += '<tr>';
					html += '<td>' + icon('cd.png', '<b>' + ww_fit_string(rev.Name, 200, session.em_width, 1) + '</b>', edit_link) + '</td>';
					
					html += '<td>' + rev.RevType + '</td>';
					html += '<td>' + get_text_from_bytes( rev.Size ) + '</td>';
					html += '<td>' + rev.Engine + '</td>';
					
					var plugin_txt = '(None)';
					if (rev.Plugin) {
						plugin_txt = '';
						var plugs = rev.Plugin.split(/\,\s*/);
						for (var idy = 0, ley = plugs.length; idy < ley; idy++) {
							var parts = plugs[idy].split(/\-/);
							if (plugin_txt) plugin_txt += ', ';
							plugin_txt += parts[0] + ' v' + parts[1];
						}
					} // plugins
					html += '<td>' + plugin_txt + '</td>';
					
					// html += '<td align="center">' + (((rev.Arcade == 1) && (rev.RevType == 'Public')) ? icon('accept.png') : '') + '</td>';
					html += '<td align="center">' + (rev.GoogAnalID ? icon('accept.png') : '') + '</td>';
						
					html += '<td><table cellspacing="0" cellpadding="0" border="0"><tr>';
					html += '<td style="background:transparent"><nobr>' + icon('cd_edit.png', 'Edit', edit_link) + '</nobr></td>';
					html += '<td style="background:transparent"><span style="color:#aaa;">|</span></td>';
					
					html += '<td style="background:transparent"><nobr>' + icon('cd_go.png', 'Play', play_link) + '</nobr></td>';
					html += '<td style="background:transparent"><span style="color:#aaa;">|</span></td>';
					
					html += '<td style="background:transparent"><nobr>' + icon('compress.png', 'Export', "$P().show_export_dialog('"+rev.Name+"')") + '</nobr></td>';
					html += '<td style="background:transparent"><span style="color:#aaa;">|</span></td>';
					
					html += '<td style="background:transparent"><nobr>' + icon('trash', 'Delete', "$P().delete_game_object('rev','"+rev.Name+"')") + '</nobr></td>';
					html += '</tr></table></td>';
					
					html += '</tr>';
				} // foreach sprite
				html += '</table>';
			
				$('d_game_publish_header').innerHTML = 'Revisions (' + revs.length + ')';
			} // we have sprites
			else {
				$('d_game_publish_header').innerHTML = 'Revisions';
				html += 'No revisions found.  Ready to <a href="#GameEditRevision?game_id='+this.game_id+'">publish a new one?</a>';
				this.revs = [];
			}
			html += '<div style="height:30px;"></div>';
			$('d_game_publish').innerHTML = html;
		}
	},
	
	launch_rev: function(rev_id) {
		// window.open( 'play.psp.html?game='+this.game_id+'&rev='+rev_id );
		window.open( '/effect/games/' + this.game_id + '/' + rev_id );
	},
	
	delete_game_object: function(type, id) {
		// delete sprite or rev object
		if (confirm('Are you sure you want to delete the revision "'+id+'"?')) {
			show_progress_dialog(1, "Deleting revision...");
			effect_api_mod_touch('game_objects_get');
			effect_api_send('game_delete_object', {
				GameID: this.game_id,
				Type: type,
				ID: id
			}, [this, 'delete_game_object_finish'], { _type: type, _id: id });
		} // confirmed
	},
	
	delete_game_object_finish: function(response, tx) {
		// received response from server
		hide_popup_dialog();
		this.receive_revs(response, tx);
		do_message('success', 'Deleted the revision "'+tx._id+'".'); 
	},
	
	show_export_dialog: function(rev_id) {
		var html = '';
		
		html += '<div class="dialog_bkgnd" style="padding-left:140px; background-image:url('+png('images/big_icons/download.png')+')">';
		
		html += '<table cellspacing=0 cellpadding=0><tr><td width=400 height=200>';
		html += '<div class="dialog_title" style="margin-bottom:10px;">Standalone Publish Export</div>';
		html += '<div class="caption" style="margin-bottom:10px;">This feature allows you to export a "standalone" version of the game revision, which is e-mailed to you as a ZIP file.  This can be decompressed and hosted on your own web server.  This version will work entirely without contacting the Effect Games servers.  Please see the <a href="#Article/docs/Publishing_Guide">Publishing Guide</a> for details.</div>';
		
		html += '<div class="caption" style="margin-bottom:10px;">You must read and agree to the <a href="#Article/Standalone_Publish_Agreement" target="_blank">Standalone Publish License Agreement</a> in order to use this feature.</div>';
		
		html += spacer(1,10) + '<br/><center>';
		html += '<form><input type="checkbox" id="fe_export_agree" value="1" onClick="$P().update_btn_export()"/><label for="fe_export_agree">I agree to all the terms and conditions.</label></form>';
		html += spacer(1,20) + '<br/>';
		
		html += '<table><tr>';
			html += '<td>' + large_icon_button('x', 'Cancel', "hide_popup_dialog()") + '<div class="clear"></div></td>';
			html += '<td width=50>&nbsp;</td>';
			html += '<td>' + large_icon_button('check', 'Export', "$P().do_export('"+rev_id+"')", 'btn_export', '', 'disabled') + '<div class="clear"></div></td>';
		html += '</tr></table></center>';
		
		html += '</td></tr></table>';
		
		html += '</div>';
		
		show_popup_dialog(540, 200, html);
	},
	
	update_btn_export: function() {
		if ($('fe_export_agree').checked) $('btn_export').removeClass('disabled');
		else $('btn_export').addClass('disabled');
	},
	
	do_export: function(rev_id) {
		if ($('fe_export_agree').checked) {
			hide_popup_dialog();
			effect_api_send('game_rev_create_standalone', {
				GameID: this.game_id,
				RevID: rev_id
			}, [this, 'do_export_finish'], { _rev_id: rev_id });
		} // agree
	},
	
	do_export_finish: function(response, tx) {
		do_notice("Standalone Request Successful", "Your request to create a standalone version has been received by our servers, and you will be e-mailed instructions to download the ZIP file shortly.  This process may take a few minutes, depending on the complexity of your game.");
	}
	
} );

Class.subclass( Effect.Page, "Effect.Page.GameEditRevision", {
		
	onInit: function() {
		// render page HTML
		var html = '';
		
		html += '<h1 id="h_game_edit_rev_header">Loading...</h1>';
		
		html += '<div id="d_game_edit_rev_tab_bar"></div>';
		
		html += '<div id="d_game_edit_rev_content" class="game_main_area">';
		// html += '<div class="blurb">' + get_string('/GamePublisher/Blurb') + '</div>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(args) {
		if (!args) args = {};
		
		if (!require_login()) {
			return false;
		}
		
		$('d_game_edit_rev_content').innerHTML = loading_image();
		
		this.args = args;
		
		var gpage = page_manager.find('Game');
		if (gpage && gpage.game && (gpage.game.GameID == args.game_id)) {
			this.game = gpage.game;
			this.game_id = gpage.game.GameID;
			this.receive_game();
		}
		else {
			// game not loaded or switched, load again
			effect_api_get('game_get', { 
				id: args.game_id
			}, [this, 'receive_game'], {});
		}
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		upload_destroy();
		$('h_game_edit_rev_header').innerHTML = '';
		$('d_game_edit_rev_tab_bar').innerHTML = '';
		$('d_game_edit_rev_content').innerHTML = '';
		return true;
	},
	
	receive_game: function(response, tx) {
		// receive game info from server
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID; 
		}
		
		$('d_game_edit_rev_tab_bar').innerHTML = get_game_tab_bar(this.game_id, 'Publish');
		
		$('h_game_edit_rev_header').innerHTML = fit_game_title(this.game.Title);
		
		this.files = [];
		
		// recover settings from storage
		if (!session.storage.games) session.storage.games = {};
		var games = session.storage.games;

		// game specific prefs
		if (!games[this.game_id]) games[this.game_id] = {};
		this.game_prefs = games[this.game_id];
				
		if (this.args.rev_id) {
			this.do_edit_rev(this.args.rev_id);
		}
		else {
			// create new rev
			Nav.bar(
				['Main', 'EffectGames.com'],
				['Home', 'My Home'],
				['Game/' + this.game.GameID, this.game.Title],
				['GamePublisher/' + this.game.GameID, 'Publisher'],
				[Nav.currentAnchor(), 'New Revision']
			);

			Nav.title( 'New Revision | ' + this.game.Title );

			this.rev = null;
			this.draw_rev_form( merge_objects({ RevType: 'Internal', Plugin: this.game.Plugin }, this.args) );
		}
	},
	
	do_edit_rev: function(rev_id) {
		// edit existing rev
		if (0 && this.rev && (this.rev.Name == rev_id)) {
			// rev already loaded and ID matches, so proceed directly to drawing page
			this.do_edit_rev_2();
		}
		else {
			// load rev from server
			effect_api_get('game_object_get', {
				game_id: this.game_id,
				'type': 'rev',
				id: rev_id
			}, [this, 'do_edit_rev_2'], {});
		}
	},
	
	do_edit_rev_2: function(response) {
		// edit existing rev
		if (response) {
			this.rev = response.Item;
		}
		var title = 'Editing Revision "'+this.rev.Name+'"';
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			['GamePublisher/' + this.game.GameID, 'Publisher'],
			[Nav.currentAnchor(), 'Edit Revision']
		);
		
		Nav.title( title + ' | ' + this.game.Title );
		
		this.draw_rev_form( this.rev );
	},
	
	draw_rev_form: function(rev) {
		var html = '';
		
		if (rev.Name) {
			html += '<div class="blurb">' + get_string('/GameEditRevision/EditBlurb') + '</div>';
			html += '<h1>Editing Revision "'+rev.Name+'"</h1>';
		}
		else {
			html += '<div class="blurb">' + get_string('/GameEditRevision/NewBlurb') + '</div>';
			html += '<h1>Publish New Revision</h1>';
		}
		
		html += '<form method=get action="javascript:void(0)">';
		html += '<table style="margin:20px;">';
		
		// rev name
		html += '<tr><td align=right class="fe_label_left">Revision&nbsp;Number:*</td>';
		if (rev.Name) {
			html += '<td align=left><span class="medium"><b>' + rev.Name + '</b></span></td></tr>';
			html += '<tr><td></td><td class="caption"> You cannot change the revision number once it is published. </td></tr>';
			html += '<input type=hidden id="fe_er_id" value="'+rev.Name+'"/>';
		}
		else {
			html += '<td align=left><input type=text id="fe_er_id" class="fe_medium" size="10" maxlength="32" value="'+escape_text_field_value(rev.Name)+'"></td></tr>';
			html += '<tr><td></td><td class="caption"> Enter a unique revision number.  You may use alphanumerics, periods and dash, e.g. "0.1a", "1.0b", "1.0rc3", "1.0". </td></tr>';
		}
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// type
		var type_items = ['Internal', 'Alpha', 'Beta', 'Release Candidate', 'Public'];
		html += '<tr><td align=right class="fe_label_left">Release&nbsp;Type:*</td><td align=left>' + 
			menu( 'fe_er_type', type_items, rev.RevType, {'class':'fe_medium', 'onChange':'$P().set_rev_type(this.options[this.selectedIndex].value)'} ) + '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose a release type.  <b>Internal</b> releases can be accessed only be members of the game, and they must be logged in to EffectGames.com.  <b>Alpha</b>, <b>Beta</b> and <b>Release Candidate</b> releases can be either private (a password is required to play) or public.  <b>Public</b> releases are official game releases available to everyone, and may also be submitted to EffectArcade.com.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '<tr><td></td><td>';
			html += '<div id="d_er_sect_password" style="margin-bottom:15px; display:'+(rev.RevType.match(/^(Alpha|Beta|Release\sCandidate)$/) ? 'block' : 'none')+';">';
			html += '<fieldset><legend>Revision Options</legend>';
				html += '<table>';
				html += '<tr><td align=right class="fe_label_left">Password:</td>';
				html += '<td align=left><input type=password id="fe_er_password" class="fe_medium" size="25" maxlength="32" value="'+escape_text_field_value(rev.Password)+'"></td></tr>';
				html += '<tr><td></td><td class="caption"> You can optionally password protect this revision by entering a password here.  Players must enter the password to access the game page.  This is only available to Alpha, Beta and Release Candidate revision types. </td></tr>';
				html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
				
				html += '<tr><td align=right class="fe_label_left">Sharing:</td>';
				html += '<td align=left><input type=checkbox id="fe_er_sharing" value="1" '+((rev.DisableSharing != 1) ? 'checked="checked"' : '')+'/><label for="fe_er_sharing">Allow sharing</label></td></tr>';
				html += '<tr><td></td><td class="caption"> If enabled, the game toolbar will contain a "Sharing" icon for sharing the game via HTML embed code, and links to social networking sites.  This only works for non-password-protected pages. </td></tr>';
				html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
				
				html += '<tr><td align=right class="fe_label_left">Comments:</td>';
				html += '<td align=left><input type=checkbox id="fe_er_comments" value="1" '+((rev.Comments == 1) ? 'checked="checked"' : '')+'/><label for="fe_er_comments">Allow user comments</label></td></tr>';
				html += '<tr><td></td><td class="caption"> User comments are posted and visible to all on the game page itself. </td></tr>';
				html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
				
				html += '<tr><td align=right class="fe_label_left">Feedback:</td>';
				html += '<td align=left><input type=checkbox id="fe_er_feedback" value="1" '+((rev.Feedback == 1) ? 'checked="checked"' : '')+'/><label for="fe_er_feedback">Allow user feedback</label></td></tr>';
				html += '<tr><td></td><td class="caption"> User feedback is sent anonmously to the game owner via e-mail. </td></tr>';
				html += '</table>';
			html += '</fieldset>';
			html += '</div>';
			html += '<div id="d_er_sect_arcade" style="margin-bottom:15px; display:'+(rev.RevType.match(/^(Public)$/) ? 'block' : 'none')+';">';
			html += '<fieldset><legend>Revision Options</legend>';
				html += '<table>';
				html += '<tr><td align=right class="fe_label_left">Submit:</td>';
				html += '<td align=left><input type=checkbox id="fe_er_arcade" value="1" '+((rev.Arcade == 1) ? 'checked="checked"' : '')+'/><label for="fe_er_arcade">Submit to EffectArcade.com</label></td></tr>';
				html += '<tr><td></td><td class="caption"> Coming soon!  Since this is a public release, you can optionally submit the game to our upcoming arcade site, EffectArcade.com.  Our team will review your game and may include it on the site, if we like it.  This is a free service to help promote your game. </td></tr>';
				html += '</table>';
			html += '</fieldset>';
			html += '</div>';
		html += '</td></tr>';
		
		// desc (doxter)
		html += '<tr><td align=right class="fe_label_left">Release&nbsp;Notes:</td><td align=left><textarea class="fe_edit" id="fe_er_desc" style="width:400px; height:150px;" wrap="virtual" onkeydown="return catchTab(this,event)">'+escape_textarea_value(rev.Description)+'</textarea></td></tr>';
		html += '<tr><td></td><td><div class="caption">Optionally include some release notes (known bugs, fixes from previous releases, etc.).  They will be displayed on the game page under the main port.  You can use rich formatting here.</div> ' + Blog.edit_caption + ' </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// engine version
		var version_items = [];
		for (var idx = 0, len = session.engine_versions.length; idx < len; idx++) {
			var verobj = session.engine_versions[idx];
			version_items.push([ verobj.Name, verobj.Title ]);
		}
		html += '<tr><td align=right class="fe_label_left">Engine&nbsp;Version:</td><td align=left>' + 
			menu( 'fe_er_engine', version_items, rev.Engine || this.game_prefs.last_engine_version, 
				{'class':'fe_medium'} ) + '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose which Effect Engine version you want to use.  We are always making improvements to our engine, but sometimes we have to make "breaking changes" (to the API, etc.), so with this you can stick to a particular version of the engine, until you are ready to upgrade. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,20) + '</td></tr>';
		
		// plugins
		var all_plugins = [];
		for (var idx = 0, len = session.engine_plugins.length; idx < len; idx++) {
			var plug = session.engine_plugins[idx];
			all_plugins.push([ plug.Name + ' v' + plug.Version, plug.Name + '-' + plug.Version ]);
		}
		this.plugin_menu = new MultiMenu('fe_er_plugin');
		this.plugin_menu.multi = true;
		this.plugin_menu.toggle = false;
		html += '<tr><td align=right class="fe_label_left">Plugins:</td><td align=left>'+this.plugin_menu.get_html(all_plugins, rev.Plugin, {'class':'fe_medium_menu mult'})+'</td></tr>';
		html += '<tr><td></td><td class="caption"> Optionally change which Engine Plugins will be included in your game revision.  For example, you may have debugging tools enabled, that you want removed for public releases of your game.  For more information about Plugins, see the <a href="#ArticleCategory/plugins" target="_blank">Plugins Page</a>. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,10) + '</td></tr>';
		
		// code uploader
		html += '<tr><td align=right class="fe_label_left">Upload&nbsp;Code:</td><td align=left>';
		html += '<div id="d_er_file_list">';
			// if (rev.Name) html += '<span style="font-style:italic">(Upload files to <b>replace</b> all of the files currently stored in the revision.)</span>';
		html += '</div>';
		html += '<table><tr><td>';
		html += '<div class="little_button_stack">' + large_icon_button('page_white_get.png', 'Upload Files...', 'upload_basic()', 'btn_er_upload', {}) + '<div class="clear"></div></div><div class="clear"></div>';
		// html += '<div class="caption"></div>';
		html += '</td><td>';
		// html += '<div><input type="checkbox" id="fe_er_strip_comments" value="1" '+((rev.UserCodeStripComments == 1) ? ' checked="checked"' : '')+'/><label for="fe_er_strip_comments">Strip Comments</label></div>';
		// html += '<div><input type="checkbox" id="fe_er_compress_whitespace" value="1" '+((rev.UserCodeCompressWhitespace == 1) ? ' checked="checked"' : '')+'/><label for="fe_er_compress_whitespace">Compress Whitespace</label></div>';
		html += '<div><input type="checkbox" id="fe_er_google_closure" value="1" '+((rev.UserCodeCompress == 1) ? ' checked="checked"' : '')+'/><label for="fe_er_google_closure">Compile with Google Closure:</label></div>';
		html += '</td><td>';
		html += menu('fe_er_google_closure_mode', [ 
			['WHITESPACE_ONLY','Whitespace Only'],
			['SIMPLE_OPTIMIZATIONS','Simple Optimizations'],
			['ADVANCED_OPTIMIZATIONS','Advanced Optimizations']
		], rev.UserCodeCompressMode, { 'class':'fe_small_menu' });
		html += '</td></tr></table>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Here you can upload your game source code to be published along with your revision.  ';
			if (rev.Name) html += 'Since you are editing an existing revision, please note that uploading new files <b>replaces</b> all of the existing code previously uploaded.';
			else html += 'A game revision is a complete, standalone package, including the game engine, and requires all your code to make your game function.  You may upload multiple files and order them however you like.  You can also choose to compile (i.e. compress) your code using <a href="http://code.google.com/closure/compiler/" target="_blank">Google Closure</a>.';
		html += ' </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// google analytics?  will this interfere with ours?
		html += '<tr><td align=right class="fe_label_left">Google&nbsp;Analytics&nbsp;ID:</td>';
		html += '<td align=left><input type=text id="fe_er_goog_anal_id" class="fe_medium" size="20" maxlength="32" value="'+escape_text_field_value(rev.GoogAnalID)+'"></td></tr>';
		html += '<tr><td></td><td class="caption"> You can optionally track visitors to your game using <a href="http://www.google.com/analytics/" target="_blank">Google Analytics</a>.  Just create a new profile for the domain <b>www.effectgames.com</b>, and enter the Analytics Profile Web Property ID here (example: UA-1234567-1). </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// footer
		html += '<tr><td colspan="2" align="right" class="fe_label">* Denotes a required field.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '</table>';
				
		html += '<center><table style="margin-bottom:20px;"><tr>';
			if (rev.Name) {
				html += '<td>' + large_icon_button('x', 'Cancel', "#GamePublisher/" + this.game.GameID) + '</td>';
				html += '<td width=50>&nbsp;</td>';
				html += '<td>' + large_icon_button('cd_edit.png', '<b>Save Changes</b>', "$P().save()") + '</td>';
			}
			else {
				html += '<td>' + large_icon_button('x', 'Cancel', "#GamePublisher/" + this.game.GameID) + '</td>';
				html += '<td width=50>&nbsp;</td>';
				html += '<td>' + large_icon_button('cd_add.png', '<b>Publish Revision</b>', "$P().save()") + '</td>';
			}
		html += '</tr></table></center>';
		
		html += '</form>';
		
		$('d_game_edit_rev_content').innerHTML = html;
		
		if (!rev.Name) safe_focus('fe_er_id');
		
		// setup zeroupload
		var self = this;
		setTimeout( function() {
			prep_upload('btn_er_upload', '/effect/api/game_rev_file_upload?game_id=' + self.game_id, 
				[self, 'upload_files_finish'], ['JavaScript Files', '*.js']);
		}, 1 );
		
		// delete leftover files from last time if in edit mode, otherwise refresh file list
		if (rev.Name) {
			// edit mode
			effect_api_send('game_rev_file_delete', {
				GameID: this.game_id,
				All: 1
			}, function() {}, {  });
		}
		else {
			// creating new rev, reload temp files from last time, if they are still around
			effect_api_get( 'game_rev_get_files', { game_id: this.game_id }, [this, 'receive_files'], { } );
		}
	},
		
	upload_files_finish: function() {
		hide_popup_dialog();
		effect_api_mod_touch( 'game_rev_get_files' );
		effect_api_get( 'game_rev_get_files', { game_id: this.game_id }, [this, 'receive_files'], { } );
	},
	
	receive_files: function(response, tx) {
		// check for upload error
		if (response && response.Data && response.Data.LastUploadError) {
			do_error( "Failed to upload file: " + response.Data.LastUploadError );
			return;
		}
		
		if (this.response) this.files = [];
		if (response && response.Data && response.Data.Files && response.Data.Files.File) {
			this.files = always_array( response.Data.Files.File );
		}
		
		var html = '';
		
		if (this.files.length > 0) {
			html += '<table class="prop_table">';
			for (var idx = 0, len = this.files.length; idx < len; idx++) {
				var file = this.files[idx];
				html += '<tr><td height="22">' + icon('trash', '', "$P().delete_file("+idx+")", "Delete File") + '</td>';
				html += '<td width="200">';
					// html += asset_icon_link(this.game_id, file.Name, '/effect/api/view/games/' + this.game_id + '/rev_stage/' + file.Name, 180);
					html += get_icon_for(file.Name, '', ww_fit_filename(file.Name, 180, session.em_width), '');
				html += '</td>';
				
				html += '<td>' + get_text_from_bytes(file.Size) + '</td>';
				
				if (len > 1) {
					html += '<td><table cellspacing="0" cellpadding="0"><tr>';
						if (idx < len - 1) {
							html += '<td>' + icon('arrow_down.png', '', "$P().swap_files("+idx+","+Math.floor(idx+1)+")", "Move File Down") + '</td>';
						}
						else html += '<td><img src="'+icons_uri+'/arrow_down.png" width="16" height="16" class="png disabled"/></td>';
						if (idx > 0) {
							html += '<td>' + icon('arrow_up.png', '', "$P().swap_files("+idx+","+Math.floor(idx-1)+")", "Move File Up") + '</td>';
						}
						else html += '<td><img src="'+icons_uri+'/arrow_up.png" width="16" height="16" class="png disabled"/></td>';
					html += '</tr></table></td>';
				}
				
				html += '</tr>';
			} // foreach file
			html += '</table>';
		}
		
		$('d_er_file_list').innerHTML = html;
		
		setTimeout( function() {
			zero_client.reposition('btn_er_upload');
		}, 1 );
	},
	
	swap_files: function(a, b) {
		// move file up or down in the load order
		var temp = this.files[a];
		this.files[a] = this.files[b];
		this.files[b] = temp;
		this.receive_files();
	},
	
	delete_file: function(idx) {
		// delete selected file from staging area
		var file = this.files[idx];
		
		effect_api_send('game_rev_file_delete', {
			GameID: this.game_id,
			Files: { File: file.Name }
		}, [this, 'delete_file_finish'], { _idx: idx });
	},
	
	delete_file_finish: function(response, tx) {
		// receive response from server
		var idx = tx._idx;
		var file = this.files[idx];
		
		this.files.splice( idx, 1 );
		
		do_message('success', "Deleted file \""+file.Name+"\".");
		this.receive_files();
	},
	
	set_rev_type: function(new_type) {
		// d_er_sect_password
		if (new_type.match(/^(Alpha|Beta|Release\sCandidate)$/)) $('d_er_sect_password').show(); else $('d_er_sect_password').hide();
		
		// d_er_sect_arcade
		if (new_type.match(/^(Public)$/)) $('d_er_sect_arcade').show(); else $('d_er_sect_arcade').hide();
		
		setTimeout( function() {
			zero_client.reposition('btn_er_upload');
		}, 1 );
	},
	
	save: function() {
		// save rev changes, or add new rev
		clear_field_error();
		
		/* if (!this.files.length && !this.rev) {
			do_message('error', "You must upload your game source code before publishing a revision.");
			return;
		} */
		
		var rev = {
			Name: trim($('fe_er_id').value),
			RevType: get_menu_value('fe_er_type'),
			Password: trim($('fe_er_password').value),
			Comments: $('fe_er_comments').checked ? 1 : 0,
			Feedback: $('fe_er_feedback').checked ? 1 : 0,
			Arcade: $('fe_er_arcade').checked ? 1 : 0,
			Description: $('fe_er_desc').value,
			Engine: get_menu_value('fe_er_engine'),
			Plugin: this.plugin_menu.get_value(),
			Files: { File: this.files },
			GoogAnalID: trim($('fe_er_goog_anal_id').value),
			UserCodeCompress: $('fe_er_google_closure').checked ? 1 : 0,
			UserCodeCompressMode: get_menu_value('fe_er_google_closure_mode'),
			DisableSharing: $('fe_er_sharing').checked ? 0 : 1 // yes, reversed
		};
		
		if (rev.RevType == 'Internal') {
			rev.DisableSharing = 1;
			rev.Comments = 0;
			rev.Feedback = 0;
			rev.Password = '';
			rev.Arcade = '';
		}
		else if (rev.RevType == 'Public') {
			rev.DisableSharing = 0;
		}
		
		// text field validation
		if (!rev.Name) return bad_field('fe_er_id', "Please enter a Revision Number.");
		if (!rev.Name.match($R.GameObjectID)) return bad_field('fe_er_id', "Your Revision Number is invalid.  Please use only alphanumerics, dashes and dots, 2 characters minimum, and begin and end with an alpha char.");
		if (!check_reserved_word(rev.Name)) return bad_field('fe_er_id', "Your Revision Number is a reserved word.  Please choose another.");
		if (rev.Name.length > 32) return bad_field('fe_er_id', "Your Revision Number is too long.  Please keep it to 32 characters or less.");
		
		if (rev.GoogAnalID) {
			if (!rev.GoogAnalID.match(/^([\w\-]+)$/)) return bad_field('fe_er_goog_anal_id', "Your Google Analytics Profile Web Property ID is invalid.  Please use only alphanumerics and dashes.");
		}
		
		show_progress_dialog(1, "Publishing revision...");
		
		// create new or save existing
		effect_api_mod_touch('game_objects_get', 'game_object_get');
		
		if (this.rev) {
			// update existing rev
			effect_api_send('game_update_object', merge_objects(rev, {
				GameID: this.game_id,
				OldName: this.rev.Name,
				Type: 'rev'
			}), [this, 'save_finish'], { _rev: rev });
		}
		else {
			// create new rev
			effect_api_send('game_create_object', merge_objects(rev, {
				GameID: this.game_id,
				Type: 'rev'
			}), [this, 'save_finish'], { _rev: rev });
		} // create new
	},
	
	save_finish: function(response, tx) {
		// save complete
		hide_popup_dialog();
		
		if (this.rev) {
			// updated existing rev
			Nav.go('#GamePublisher/' + this.game_id);
			do_message('success', "Saved game revision \""+tx._rev.Name+"\".");
			this.rev = tx._rev;
		}
		else {
			// created new rev
			Nav.go('#GamePublisher/' + this.game_id);
			do_message('success', "Published new game revision \""+tx._rev.Name+"\".");
			this.rev = tx._rev;
		}
	}
} );
