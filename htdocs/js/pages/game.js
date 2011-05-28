// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.Game", {
	
	onInit: function() {
		// render page HTML
		var html = '<h1 id="h_game_header">Loading...</h1>';
		
		html += '<div id="d_game_summary_tab_bar"></div>';
		
		html += '<div class="game_main_area">';
		
		// game summary, stats and users
		html += '<div id="d_game_summary_info"></div>';
		
		// game members
		html += '<div class="h1">';
			html += '<div id="d_game_members_header" class="fl">';
				html += ''; // Game Members
			html += '</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		html += '<div id="d_game_users"></div>';
		
		// game articles
		html += '<div class="h1">';
			html += '<div id="d_game_articles_header" class="fl">';
				html += ''; // Game Articles
			html += '</div>';
			html += '<div class="fr">';
				html += '<a id="a_game_summary_post_article_link" class="icon post_article" href="#ArticleEdit" title="Post Article">Post Article</a> ';
				html += '<a id="a_game_summary_feed_link" class="icon feed" href="" title="RSS Feed">RSS Feed</a>';
			html += '</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		html += '<div id="d_blog_game_articles" class="main_blog_section"></div>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
		effect_api_mod_touch('game_get');
	},
	
	onActivate: function(game_id) {
		if (!require_login()) {
			return false;
		}
		
		$('d_game_summary_info').innerHTML = loading_image();
		$('d_blog_game_articles').innerHTML = loading_image();
		$('d_game_users').innerHTML = loading_image();
		
		// fetch game articles
		Blog.search({
			path: '/games/' + game_id,
			key: 'articles',
			limit: 5,
			target: 'd_blog_game_articles',
			more: 1
		});
		
		if (this.game && (this.game_id == game_id)) {
			// game already loaded and ID matches, return immediately
			this.receive_game();
			return true;
		}
		
		effect_api_get('game_get', { 
			id: game_id,
			stats: 1,
			users: 1,
			invites: 1
		}, [this, 'receive_game'], {});
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		$('d_game_summary_tab_bar').innerHTML = '';
		$('d_game_summary_info').innerHTML = '';
		$('d_blog_game_articles').innerHTML = '';
		$('d_game_users').innerHTML = '';
		hide_glog_widget();
		return true;
	},
	
	receive_game: function(response, tx) {
		// receive game info from server
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID; 
			this.stats = response.Stats;
			this.users = always_array( response.Users.User );
			this.invites = response.Invites.Invite ? always_array( response.Invites.Invite ) : [];
		}
		
		Nav.title( this.game.Title );
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title]
		);
		
		$('d_game_summary_tab_bar').innerHTML = get_game_tab_bar(this.game_id, 'Game');
		
		$('h_game_header').innerHTML = fit_game_title(this.game.Title);
		
		$('d_game_articles_header').innerHTML = 'Game Articles';
		$('a_game_summary_post_article_link').setAttribute('href', '#ArticleEdit?Path=/games/' + this.game_id);
		$('a_game_summary_post_article_link').href = '#ArticleEdit?Path=/games/' + this.game_id;
		
		$('a_game_summary_feed_link').setAttribute('href', '/effect/api/feed/game/' + this.game_id + '.rss');
		$('a_game_summary_feed_link').href = '/effect/api/feed/game/' + this.game_id + '.rss';
		
		// summary
		var html = '';
		
		if ((this.game.Access == 'Public') && !find_object(this.users, { Username: session.username }) && !find_object(this.invites, { Username: session.username })) {
			html += '<div class="blurb">This is a public game, but you are not yet a member.  You can view the game\'s status, assets, objects and read articles, but you cannot make any changes.  Want to help out?  Please <a href="#User/'+this.game.Owner+'"><b>contact the game owner by clicking here</b></a>.</div>';
		}
		else {
			html += spacer(1,15) + '<br/>';
		}
		
		if (this.game.Logo) html += '<div class="inline_logo_thumb">' + user_image_thumbnail(this.game.Logo, 160, 120) + '</div>';
		
		html += '<div class="game_title">' + fit_game_title(this.game.Title) + '</div>';
		if (this.game.DescriptionHTML) html += '<div class="game_desc">' + this.game.DescriptionHTML + '</div>';
		
		html += '<div class="clear"></div>';
		
		html += '<div class="separator" style="margin-bottom:15px;"></div>';
		
		html += '<div class="article_info_floater">';
		html += '<div class="article_info_header">' + icon('chart_pie.png', 'Game Project Stats') + '</div>';
		// html += '<div class="stats_row"><b>Users Added:</b>&nbsp;' + commify(this.stats.Users || 0) + '</div>';
		html += '<div class="stats_row"><b>Assets Uploaded:</b>&nbsp;' + commify(this.stats.Files || 0) + '</div>';
		html += '<div class="stats_row"><b>Objects Created:</b>&nbsp;' + commify(this.stats.Objects || 0) + '</div>';
		html += '<div class="stats_row"><b>Levels Created:</b>&nbsp;' + commify(this.stats.Levels || 0) + '</div>';
		html += '<div class="stats_row"><b>Versions Published:</b>&nbsp;' + commify(this.stats.Publishes || 0) + '</div>';
		html += '<div class="stats_row"><b>Space Remaining:</b>&nbsp;' + get_text_from_bytes(this.stats.Quota || 0) + '</div>';
		html += '</div>';
		
		var admin_list = [];
		for (var idx = 0, len = this.users.length; idx < len; idx++) {
			var user = this.users[idx];
			if (user.Admin == 1) admin_list.push( '<a href="#User/'+user.Username+'">' + user.Username + '</a>' );
		}
		
		html += '<table cellspacing="0" cellpadding="0"><tr><td valign="top">';
		
			// NOTE: Change rowspan if you add rows!!!
			html += '<table>';
			html += '<tr><td align="right" class="fe_label">Game ID:</td><td ROWSPAN="7" width="5">&nbsp;</td>' + 
				'<td align="left"><b>' + ww_fit_string(this.game.GameID, 200, session.em_width, 1) + '</b></td></tr>';
			html += '<tr><td align="right" class="fe_label">Created:</td><td align="left">' + get_nice_date(this.game._Attribs.Created) + '</td></tr>';
			html += '<tr><td align="right" class="fe_label">Owner:</td><td align="left"><a href="#User/' + this.game.Owner + '">' + this.game.Owner + '</a></td></tr>';
			html += '<tr><td align="right" class="fe_label">Admins:</td><td align="left">' + admin_list.join(', ') + '</td></tr>';
			html += '<tr><td align="right" class="fe_label">Genres:</td><td align="left">' + (this.game.Genre.replace(/\,(\S)/g, ', $1') || "(None)") + '</td></tr>';
			html += '<tr><td align="right" class="fe_label">Access:</td><td align="left">' + this.game.Access + '</td></tr>';
			html += '<tr><td align="right" class="fe_label">Status:</td><td align="left">' + this.game.State + '</td></tr>';
			// html += '<tr><td align="right" class="fe_label">Preload All:</td><td align="left">' + ((this.game.PreloadAll == 1) ? 'Yes' : 'No') + '</td></tr>';
			html += '</table>';
		
		html += '</td><td>' + spacer(50,1) + '</td><td valign="top">';
		
			// NOTE: Change rowspan if you add rows!!!
			html += '<table>';
			html += '<tr><td align="right" class="fe_label">Display Size:</td><td ROWSPAN="7" width="5">&nbsp;</td><td align="left">' + this.game.PortWidth + '&nbsp;x&nbsp;' + this.game.PortHeight + ' pixels</td></tr>';
			html += '<tr><td align="right" class="fe_label">Background:</td><td align="left">' + get_color_preview(this.game.BackgroundColor) + '</td></tr>';
			html += '<tr><td align="right" class="fe_label">Toolbar:</td><td align="left">' + get_color_preview(this.game.ToolbarColor) + '</td></tr>';
			html += '<tr><td align="right" class="fe_label">Loading Image:</td><td align="left">' + (this.game.BackgroundImage ? 'Yes' : 'No') + '</td></tr>';
			html += '<tr><td align="right" class="fe_label">Allow Zoom:</td><td align="left">' + this.game.Zoom + ((this.game.Zoom == 'Yes') ? (' ('+this.game.ZoomDefault+'X)') : '') + '</td></tr>';
			html += '<tr><td align="right" class="fe_label">Zoom Filter:</td><td align="left">' + this.game.ZoomFilter + '</td></tr>';
			html += '<tr><td align="right" class="fe_label">Frame Rate:</td><td align="left">' + this.game.FrameRate + ' fps'+((this.game.SkipFrames == 1) ? ' (skip)' : '')+'</td></tr>';
			// html += '<tr><td align="right" class="fe_label">Skip Frames:</td><td align="left">' + ((this.game.SkipFrames == 1) ? 'Yes' : 'No') + '</td></tr>';
			html += '</table>';
		
		html += '</td></tr></table>';
		
		html += '<div class="clear"></div>';
		html += spacer(1,10) + '<br/>';
		
		// html += '<div class="fl" style="margin-right:20px;">' + icon('page_white_edit.png', "<b>Edit Game Settings...</b>", '#GameEdit?id=' + this.game_id) + '</div>';
		// html += '<div class="fl" style="margin-right:20px;">' + icon('application_view_detail.png', "<b>View Game Log...</b>", '#GameLog/' + this.game_id) + '</div>';
		
		html += '<div class="little_button_stack">' + large_icon_button('page_white_edit.png', "<b>Game Settings...</b>", '#GameEdit?id=' + this.game_id) + '<div class="clear"></div></div>';
		// html += '<div class="little_button_stack">' + large_icon_button('application_view_detail.png', "<b>Game Log...</b>", '#GameLog/' + this.game_id) + '<div class="clear"></div></div>';
		html += '<div class="little_button_stack">' + large_icon_button('application_osx_terminal.png', "<b>Develop Locally...</b>", '#GameDevelop/' + this.game_id) + '<div class="clear"></div></div>';
		html += '<div class="little_button_stack">' + large_icon_button('controller.png', "<b>Quick Play...</b>", '$P().quick_play()') + '<div class="clear"></div></div>';
		html += '<div class="little_button_stack">' + large_icon_button('page_white_copy.png', "<b>Clone Game...</b>", '#GameClone/' + this.game_id) + '<div class="clear"></div></div>';
		
		if (this.is_game_admin() || is_admin()) {
			html += '<div class="little_button_stack">' + large_icon_button('lock.png', "<b>Administer...</b>", '#GameAdmin?id=' + this.game_id) + '<div class="clear"></div></div>';
		}
		html += '<div class="clear"></div>';
		
		html += spacer(1,15);
		
		$('d_game_summary_info').innerHTML = html;
		
		// members
		$('d_game_members_header').innerHTML = 'Game Members (' + this.users.length + ')';
		// $('a_game_summary_add_user_link').setAttribute('href', '#GameInvite/' + this.game_id);
		// $('a_game_summary_add_user_link').href = '#GameInvite/' + this.game_id;
		
		var html = '';
		for (var idx = 0, len = this.users.length; idx < len; idx++) {
			var user = this.users[idx]; var username = user.Username;
			html += '<div class="game_user_thumb" style="cursor:pointer" onClick="Nav.go(\'User/'+username+'\')">';
			html += get_buddy_icon_display(username, 1, 1);
			html += '</div>';
		}
		html += '<div class="clear"></div>';
		$('d_game_users').innerHTML = html;
		
		// check for pending invite
		if (find_object(this.invites, { Username: session.username })) {
			this.show_accept_invite_dialog();
		}
		
		show_glog_widget( this.game_id );
	},
	
	is_game_admin: function() {
		// determine if current user is a game admin
		var profile = find_object( this.users, { Username: session.username } );
		if (!profile) return false;
		
		return( profile.Admin == 1 );
	},
	
	quick_play: function() {
		// recover settings from storage
		if (!session.storage.games) session.storage.games = {};
		var games = session.storage.games;

		// game specific prefs
		if (!games[this.game_id]) games[this.game_id] = {};
		var game_prefs = games[this.game_id];
		
		var engine_ver = game_prefs['last_engine_version'];
		if (!engine_ver) {
			engine_ver = session.engine_versions[0].Name;
		}
		
		window.open( '/effect/quickplay.psp.html?game=' + this.game_id + '&engine=' + engine_ver );
	},
	
	show_accept_invite_dialog: function() {
		// show dialog for accepting pending invitation
		hide_popup_dialog();
		delete session.progress;

		var html = '';

		html += '<div class="dialog_bkgnd" style="background-image:url('+png('images/big_icons/email.png')+')">';

		html += '<table cellspacing=0 cellpadding=0><tr><td width=600 height=200 valign=center align=center>';
		html += '<div class="dialog_title">Accept Invitation?</div>';
		
		html += '<form method=get action="javascript:void(0)"><table cellspacing="0" cellpadding="0"><tr><td align="left">';
		html += '<div class="fe_label" style="margin-left:40px;">You have been invited to join the game "' + this.game.Title + '".  By joining you will become an official game member, and have access to the game assets, sprites, levels and releases.  Click the "Accept Invitation" button below to accept.</div>';
		html += '</td></tr></table></form>';
		
		html += '<br><br><table><tr>';
			html += '<td>' + large_icon_button('x', 'Cancel', "hide_popup_dialog()") + '</td>';
			html += '<td width=50>&nbsp;</td>';
			// html += '<td>' + large_icon_button('user', 'Create Account...', "Nav.go('CreateAccount')") + '</td>';
			// html += '<td width=15>&nbsp;</td>';
			html += '<td>' + large_icon_button('check', '<b>Accept Invitation</b>', "$P('Game').accept_invite()") + '</td>';
		html += '</tr></table>';

		html += '</div>';

		// session.hooks.keys[ENTER_KEY] = [Comments, 'post', page_id]; // enter key
		session.hooks.keys[ESC_KEY] = 'hide_popup_dialog'; // escape key

		show_popup_dialog(600, 200, html);
	},
	
	accept_invite: function() {
		// accept invitation
		effect_api_mod_touch('game_get', 'get_user_games');
		effect_api_send('game_accept_invite', {
			GameID: this.game.GameID
		}, [this, 'accept_invite_finish'], { } );
	},
	
	accept_invite_finish: function() {
		// finish accepting invite
		var idx = find_object_idx( this.invites, { Username: session.username } );
		assert( idx > -1, "Could not find your invitation in array!  " + session.username );
		
		// move user to official list
		this.invites.splice(idx, 1);
		this.users.unshift({ Username: session.username });
		this.stats.Users++;
		
		// redraw page
		hide_popup_dialog();
		this.receive_game();
		
		do_message('success', "Your invitation was accepted.  Welcome to " + this.game.Title + "!" );
		
		update_header();
	}
	
} );

Class.subclass( Effect.Page, "Effect.Page.GameEdit", {
	
	onActivate: function(args) {
		// page is being activated, show form
		if (!args) args = {};
		
		if (!require_login()) {
			return false;
		}
		
		this.div.innerHTML = loading_image();
		
		this.old_game_id = '';
		
		if (args.id) {
			this.old_game_id = args.id;
			this.do_edit_game(args.id);
			return true;
		}
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			[Nav.currentAnchor(), "Create New Game"]
		);
		
		Nav.title( 'Create New Game' );
		
		if (navigator.language && navigator.language.toLowerCase) {
			args.Language = navigator.language.toLowerCase();
		}
		
		this.game = null;
		this.draw_game_form( args );
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		this.div.innerHTML = '';
		return true;
	},
	
	do_edit_game: function(game_id) {
		// edit existing game
		if (this.game && (this.game.GameID == game_id)) {
			// game already loaded and ID matches, so proceed directly to drawing page
			this.do_edit_game_2();
		}
		else {
			// load game from server
			this.div.innerHTML = '';
			session.hooks.after_error = [this, 'edit_game_error'];
			effect_api_get('game_get', { id: game_id }, [this, 'do_edit_game_2'], {});
		}
	},
	
	edit_game_error: function() {
		// catch edit game error and send user back to prev page
		Nav.prev();
	},
	
	do_edit_game_2: function(response) {
		// edit existing game
		if (response) {
			delete session.hooks.after_error;
			this.game = response.Game;
		}
		var title = 'Editing Game "'+this.game.Title+'"';
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			[Nav.currentAnchor(), 'Edit Game Info']
		);
		
		Nav.title( "Edit Game Info | " + title );
		
		this.draw_game_form( this.game );		
	},
	
	draw_game_form: function(game) {
		var html = '';
		
		html += '<form method=get action="javascript:void(0)">';
		
		// if editing game, draw game tabs and border, otherwise, standard blue border
		if (game.GameID) {
			html += '<h1>' + game.Title + '</h1>';
			html += get_game_tab_bar(game.GameID, 'Game');
			html += '<div class="game_main_area">';
		}
		else {
			// html += begin_section('blue_border', 24, 'png');
			html += '<div>'+tab_bar([['#GameEdit', 'Create Game', 'controller.png']], 'Create Game')+'</div>';
			html += '<div class="game_main_area">';
			
			html += '<h1>' + 'Start A New Game' + '</h1>';
			html += '<div class="blurb">' + get_string('/GameCreateForm/Blurb') + '</div>';
		}
		
		html += '<table style="margin:20px;">';
		
		// game id
		html += '<tr><td align=right class="fe_label_left">Game ID:*</td>';
		if (game.GameID) {
			html += '<td align=left><span class="medium"><b>' + game.GameID + '</b></span></td></tr>';
		}
		else {
			html += '<td align=left><input type=text id="fe_ng_id" class="fe_medium" size="20" maxlength="32" value="'+escape_text_field_value(game.GameID)+'"></td></tr>';
			html += '<tr><td></td><td class="caption"> Enter a unique ID for your game.  Only alphanumerics and dashes are allowed.  Please note that you <b>cannot</b> change this value once it is set.</td></tr>';
		}
		// html += '<tr><td colspan=2>' + spacer(1,20) + '</td></tr>';
		html += '<tr><td></td><td><div class="form_spacer"></div></td></tr>';
		
		// title
		html += '<tr><td align=right class="fe_label_left">Title:*</td><td align=left><input type=text id="fe_ng_title" class="fe_medium" size="40" maxlength="64" value="'+escape_text_field_value(game.Title)+'"></td></tr>';
		html += '<tr><td></td><td class="caption"> Enter a title for your game.  You can use upper- and lower-case characters, and common symbols. </td></tr>';
		html += '<tr><td></td><td><div class="form_spacer"></div></td></tr>';
		
		// desc
		html += '<tr><td align=right class="fe_label_left">Description:</td><td align=left><textarea class="fe_edit" id="fe_ng_desc" style="width:400px; height:150px;" wrap="virtual" onkeydown="return catchTab(this,event)">'+escape_textarea_value(game.Description)+'</textarea></td></tr>';
		html += '<tr><td></td><td><div class="caption">Optionally enter a description for your game.  You can use rich formatting here:</div> ' + Blog.edit_caption + ' </td></tr>';
		html += '<tr><td></td><td><div class="form_spacer"></div></td></tr>';
		
		// lang
		var lang_items = [
			['en-us','English (United States)'],
			['af-za','Afrikaans (South Africa)'],
			['am-et','Amharic (Ethiopia)'],
			['ar-ae','Arabic (UAE)'],
			['ar-bh','Arabic (Bahrain)'],
			['ar-dz','Arabic (Algeria)'],
			['ar-eg','Arabic (Egypt)'],
			['ar-iq','Arabic (Iraq)'],
			['ar-jo','Arabic (Jordan)'],
			['ar-kw','Arabic (Kuwait)'],
			['ar-lb','Arabic (Lebanon)'],
			['ar-ly','Arabic (Libya)'],
			['ar-ma','Arabic (Morocco)'],
			['ar-om','Arabic (Oman)'],
			['ar-qa','Arabic (Qatar)'],
			['ar-sa','Arabic (Saudi Arabia)'],
			['ar-sy','Arabic (Syria)'],
			['ar-tn','Arabic (Tunisia)'],
			['ar-ye','Arabic (Yemen)'],
			['arn-cl','Mapudungun (Chile)'],
			['as-in','Assamese (India)'],
			['ast-es','Asturian'],
			['az-az-cyrl','Azeri (Cyrillic)'],
			['az-az-latn','Azeri (Latin)'],
			['ba-ru','Bashkir (Russia)'],
			['be-by','Belarusian (Belarus)'],
			['ber-dz','Tamazight (Algeria, Latin)'],
			['bg-bg','Bulgarian (Bulgaria)'],
			['bn-in','Bengali (India)'],
			['bo-bt','Tibetan (Bhutan)'],
			['bo-cn','Tibetan (PRC)'],
			['br-fr','Breton (France)'],
			['bs-ba-cyrl','Bosnian (Bosnia and Herzegovina, Cyrillic)'],
			['bs-ba-latn','Bosnian (Bosnia and Herzegovina, Latin)'],
			['ca-ad','Catalan (Andorra)'],
			['ca-es','Catalan (Spain)'],
			['ca-fr','Catalan (France)'],
			['co-fr','Corsican (France)'],
			['cs-cz','Czech (Czech Republic)'],
			['cy-gb','Welsh (United Kingdom)'],
			['da-dk','Danish (Denmark)'],
			['de-at','German (Austria)'],
			['de-ch','German (Switzerland)'],
			['de-de','German (Germany)'],
			['de-li','German (Liechtenstein)'],
			['de-lu','German (Luxembourg)'],
			['div-mv','Divehi (Maldives)'],
			['el-gr','Greek (Greece)'],
			['en-au','English (Australia)'],
			['en-bz','English (Belize)'],
			['en-ca','English (Canada)'],
			['en-cb','English (Caribbean)'],
			['en-gb','English (United Kingdom)'],
			['en-ie','English (Ireland)'],
			['en-in','English (India)'],
			['en-ja','English (Jamaica)'],
			['en-my','English (Malaysia)'],
			['en-nz','English (New Zealand)'],
			['en-ph','English (Philippines)'],
			['en-sg','English (Singapore)'],
			['en-tt','English (Trinidad)'],
			['en-us','English (United States)'],
			['en-za','English (South Africa)'],
			['en-zw','English (Zimbabwe)'],
			['es-ar','Spanish (Argentina)'],
			['es-bo','Spanish (Bolivia)'],
			['es-cl','Spanish (Chile)'],
			['es-co','Spanish (Colombia)'],
			['es-cr','Spanish (Costa Rica)'],
			['es-do','Spanish (Dominican Republic)'],
			['es-ec','Spanish (Ecuador)'],
			['es-es','Spanish (Spain)'],
			['es-es-ts','Spanish (Spain, Traditional Sort)'],
			['es-gt','Spanish (Guatemala)'],
			['es-hn','Spanish (Honduras)'],
			['es-mx','Spanish (Mexico)'],
			['es-ni','Spanish (Nicaragua)'],
			['es-pa','Spanish (Panama)'],
			['es-pe','Spanish (Peru)'],
			['es-pr','Spanish (Puerto Rico)'],
			['es-py','Spanish (Paraguay)'],
			['es-sv','Spanish (El Salvador)'],
			['es-ur','Spanish (Uruguay)'],
			['es-us','Spanish (United States)'],
			['es-ve','Spanish (Venezuela)'],
			['et-ee','Estonian (Estonia)'],
			['eu-es','Basque (Basque Country)'],
			['fa-ir','Persian (Iran)'],
			['fi-fi','Finnish (Finland)'],
			['fil-ph','Filipino (Philippines)'],
			['fo-fo','Faeroese (Faero Islands)'],
			['fr-be','French (Belgium)'],
			['fr-ca','French (Canada)'],
			['fr-ch','French (Switzerland)'],
			['fr-fr','French (France)'],
			['fr-lu','French (Luxembourg)'],
			['fr-mc','French (Monaco)'],
			['fur-it','Friulian (Italy)'],
			['fy-nl','Frisian (Netherlands)'],
			['ga-ie','Irish (Ireland)'],
			['gbz-af','Dari (Afghanistan)'],
			['gl-es','Galician (Galicia)'],
			['gsw-fr','Alsatian (France)'],
			['gu-in','Gujarati (India)'],
			['ha-ng-latn','Hausa (Nigeria)'],
			['he-il','Hebrew (Israel)'],
			['hi-in','Hindi (India)'],
			['hr-ba','Croatian (Bosnia and Herzegovina, Latin)'],
			['hr-hr','Croatian (Croatia)'],
			['hu-hu','Hungarian (Hungary)'],
			['hy-am','Armenian (Armenia)'],
			['id-id','Indonesian'],
			['ii-cn','Yi (PRC)'],
			['is-is','Icelandic (Iceland)'],
			['it-ch','Italian (Switzerland)'],
			['it-it','Italian (Italy)'],
			['iu-ca-cans','Inuktitut (Canada, Syllabics)'],
			['iu-ca-latn','Inuktitut (Canada, Latin)'],
			['ja-jp','Japanese (Japan)'],
			['ja-jp-mac','Japanese (Japan, Mac)'],
			['ka-ge','Georgian (Georgia)'],
			['kk-kz','Kazakh (Kazakhstan)'],
			['kl-gl','Greenlandic (Greenland)'],
			['km-kh','Khmer (Cambodia)'],
			['kn-in','Kannada (India)'],
			['kok-in','Konkani (India)'],
			['ko-kr','Korean (Korea)'],
			['ky-kg','Kyrgyz (Kyrgyzstan)'],
			['lb-lu','Luxembourgish (Luxembourg)'],
			['lo-la','Lao (Lao PDR)'],
			['lt-lt','Lithuanian (Lithuania)'],
			['lv-lv','Latvian (Latvia)'],
			['mi-nz','Maori (New Zealand)'],
			['mk-mk','Macedonian (Macedonia)'],
			['ml-in','Malayalam (India)'],
			['mn-cn','Mongolian (PRC)'],
			['mn-mn','Mongolian (Mongolia)'],
			['moh-ca','Mohawk (Canada)'],
			['mr-in','Marathi (India)'],
			['ms-bn','Malay (Brunei Darussalam)'],
			['ms-my','Malay (Malaysia)'],
			['mt-mt','Maltese (Malta)'],
			['nb-no','Norwegian Bokmål (Norway)'],
			['ne-np','Nepali (Nepal)'],
			['nl-be','Dutch (Belgium)'],
			['nl-nl','Dutch (Netherlands)'],
			['nn-no','Norwegian Nynorsk (Norway)'],
			['ns-za','Sesotho sa Leboa (South Africa)'],
			['oc-fr','Occitan (France)'],
			['or-in','Oriya (India)'],
			['pa-in','Punjabi (India)'],
			['pl-pl','Polish (Poland)'],
			['ps-af','Pashto (Afghanistan)'],
			['pt-br','Portuguese (Brazil)'],
			['pt-pt','Portuguese (Portugal)'],
			['qut-gt','K&apos;iche (Guatemala)'],
			['quz-bo','Quechua (Bolivia)'],
			['quz-ec','Quechua (Ecuador)'],
			['quz-pe','Quechua (Peru)'],
			['rm-ch','Romansh (Switzerland)'],
			['ro-ro','Romanian (Romania)'],
			['ru-ru','Russian (Russia)'],
			['rw-rw','Kinyarwanda (Rwanda)'],
			['sah-ru','Yakut (Russia)'],
			['sa-in','Sanskrit (India)'],
			['se-fi','Sami (Northern, Finland)'],
			['se-no','Sami (Northern, Norway)'],
			['se-se','Sami (Northern, Sweden)'],
			['si-lk','Sinhala (Sri Lanka)'],
			['sk-sk','Slovak (Slovakia)'],
			['sl-si','Slovenian (Slovenia)'],
			['sma-no','Sami (Southern, Norway)'],
			['sma-se','Sami (Southern, Sweden)'],
			['smj-no','Sami (Lule, Norway)'],
			['smj-se','Sami (Lule, Sweden)'],
			['smn-fi','Sami (Inari, Finland)'],
			['sms-fi','Sami (Skolt, Finland)'],
			['sq-al','Albanian (Albania)'],
			['sr-ba-cyrl','Serbian (Bosnia, and Herzegovina, Cyrillic)'],
			['sr-ba-latn','Serbian (Bosnia, and Herzegovina, Latin)'],
			['sr-sp-cyrl','Serbian (Serbia and Montenegro, Cyrillic)'],
			['sr-sp-latn','Serbian (Serbia and Montenegro, Latin)'],
			['sv-fi','Swedish (Finland)'],
			['sv-se','Swedish (Sweden)'],
			['sw-ke','Swahili (Kenya)'],
			['syr-sy','Syriac (Syria)'],
			['ta-in','Tamil (India)'],
			['te-in','Telugu (India)'],
			['tg-tj-cyrl','Tajik (Tajikistan)'],
			['th-th','Thai (Thailand)'],
			['tk-tm','Turkmen (Turkmenistan)'],
			['tn-za','Setswana Tswana (South Africa)'],
			['tr-in','Urdu (India)'],
			['tr-tr','Turkish (Turkey)'],
			['tt-ru','Tatar (Russia)'],
			['ug-cn','Uighur (PRC)'],
			['uk-ua','Ukrainian (Ukraine)'],
			['ur-pk','Urdu (Pakistan)'],
			['uz-uz-cyrl','Uzbek (Uzbekistan, Cyrillic)'],
			['uz-uz-latn','Uzbek (Uzbekistan, Latin)'],
			['vi-vn','Vietnamese (Vietnam)'],
			['wee-de','Lower Sorbian (Germany)'],
			['wen-de','Upper Sorbian (Germany)'],
			['wo-sn','Wolof (Senegal)'],
			['xh-za','isiXhosa Xhosa (South Africa)'],
			['yo-ng','Yoruba (Nigeria)'],
			['zh-chs','Chinese (Simplified)'],
			['zh-cht','Chinese (Traditional)'],
			['zh-cn','Chinese (PRC)'],
			['zh-hk','Chinese (Hong Kong SAR, PRC)'],
			['zh-mo','Chinese (Macao SAR)'],
			['zh-sg','Chinese (Singapore)'],
			['zh-tw','Chinese (Taiwan)'],
			['zu-za','isiZulu Zulu (South Africa)']
		];
		html += '<tr><td align=right class="fe_label_left">Language:</td><td align=left>' + 
			menu( 'fe_ng_lang', lang_items, game.Language, {'class':'fe_medium'} ) + '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose the primary speaking / written language used in the game. </td></tr>';
		html += '<tr><td></td><td><div class="form_spacer"></div></td></tr>';
		
		// genre
		this.cat_menu = new MultiMenu('fe_ng_cat');
		this.cat_menu.multi = true;
		this.cat_menu.toggle = false;
		html += '<tr><td align=right class="fe_label_left">Genres:</td><td align=left>'+this.cat_menu.get_html(session.genres, game.Genre, {'class':'fe_medium_menu mult'})+'</td></tr>';
		html += '<tr><td></td><td class="caption"> Optionally choose up to three genres to list your game under.  Use Ctrl or Cmd to select multiple.  Remember that listing is subject to approval by Effect Games. </td></tr>';
		html += '<tr><td></td><td><div class="form_spacer"></div></td></tr>';
		
		// access
		html += '<tr><td align=right class="fe_label_left">Project&nbsp;Access:</td><td align=left>' + 
			menu( 'fe_ng_access', ['Private', 'Public'], game.Access, {'class':'fe_medium'} ) + '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose whether your game project should be public (all users can view) or private (only members can view).  Please note that game <i>releases</i> are always public.  This menu only controls access to the game development project page. </td></tr>';
		html += '<tr><td></td><td><div class="form_spacer"></div></td></tr>';
		
		// state
		if (game.GameID) {
			html += '<tr><td align=right class="fe_label_left">Status:*</td><td align=left>' + 
				menu( 'fe_ng_state', config.GameProjectStates.State, game.State, {'class':'fe_medium'} ) + '</td></tr>';
			html += '<tr><td></td><td class="caption"> Select which development state your game project is currently in.  This is just for display purposes, and you can change this at any time. </td></tr>';
			html += '<tr><td></td><td><div class="form_spacer"></div></td></tr>';
		}
		
		// logo
		html += '<tr><td align=right class="fe_label_left">Logo&nbsp;Image:</td><td align=left>';
			html += '<table cellspacing="0" cellpadding="0"><tr><td>';
			html += begin_section( 'shadow_border', 12, 'gif' );
			html += '<div id="d_ng_logo">';
			if (game.Logo) {
				html += user_image_thumbnail(game.Logo, 160, 120);
			}
			else {
				html += image_placeholder('(No image selected)', 160, 120);
			}
			html += '</div>';
			html += '<input type="hidden" id="fe_ng_logo" value="'+str_value(game.Logo)+'"/>';
			html += end_section();
			html += '</td><td>' + spacer(20,1) + '</td><td>';
			html += '<div style="font-size:11px;">' + large_icon_button('photo_add.png', 'Choose Logo...', "$P('GameEdit').select_logo()") + '<div class="clear"></div></div>';
			html += spacer(1,15) + '<br/>';
			html += '<div style="font-size:11px;">' + large_icon_button('trash', 'Remove Logo', "$P('GameEdit').remove_logo()") + '<div class="clear"></div></div>';
			html += '</td></tr></table>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Optionally upload a logo image for your game.  This will be displayed wherever your game is listed, along with the title and description. </td></tr>';
		html += '<tr><td></td><td><div class="form_spacer"></div></td></tr>';
		
		// twitter
		html += '<tr><td align=right class="fe_label_left">Twitter&nbsp;Sync:</td><td align=left>';
			html += '<table cellspacing="0" cellpadding="0"><tr>';
			html += '<td class="fe_label">Username:&nbsp;</td><td><input type="text" id="fe_ng_twitter_username" size="20" maxlength="64" class="fe_small" value="'+escape_text_field_value(game.TwitterUsername)+'"/></td>';
			html += '<td>' + spacer(20,1) + '</td>';
			html += '<td class="fe_label">Password:&nbsp;</td><td><input type="password" id="fe_ng_twitter_password" size="20" maxlength="64" class="fe_small" value=""/></td>';
			html += '</tr></table>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Optionally sychronize your game activity log with a <a href="http://twitter.com" target="_blank">Twitter</a> account.  An easy way to keep your team informed of project changes. </td></tr>';
		html += '<tr><td></td><td><div class="form_spacer"></div></td></tr>';
		
		// preload all
		html += '<tr><td align=right class="fe_label_left">Preload:</td>';
		html += '<td align=left><input type=checkbox id="fe_ng_preload" value="1" ' + ((game.PreloadAll == 1) ? 'checked="checked"' : '') + '>';
		html += '<label for="fe_es_preload">Preload everything at game startup</label>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose whether you would like all of your game\'s resources loaded at startup, or loaded on-demand.  For smaller games it is sometimes nicer to have everything loaded up front.  For larger games it is better to load things as needed with each level. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		if (game.GameID) {
			// resources
			html += '<tr><td></td><td>';
			html += '<fieldset><legend>Preload Resources</legend>';
				html += '<div class="caption" style="margin-bottom:5px;">Here you can add resources that are required by your game at startup, including images, sounds, videos, and XML files.  These will be automatically preloaded with the game.</div>';
				html += render_resource_editor('fe_ng_res', {
					resources: (game.Resources && game.Resources.Resource) ? always_array(game.Resources.Resource) : [],
					file_reg_exp: config.ResourceRegExp,
					file_error: "Please add only supported file formats (JPEGs, PNGs, GIFs, MP3s and XMLs) to the Resources list.",
					// path_tip: 'Image Asset Path',
					add_button: 'Add Resources...',
					dlg_title: 'Select Resources',
					game_id: game.GameID
				});
			html += '</fieldset>';
			html += '</td></tr>';
			html += '<tr><td colspan=2>' + spacer(1,20) + '</td></tr>';
		} // editing game
		
		// plugins
		var all_plugins = [];
		for (var idx = 0, len = session.engine_plugins.length; idx < len; idx++) {
			var plug = session.engine_plugins[idx];
			all_plugins.push([ plug.Name + ' v' + plug.Version, plug.Name + '-' + plug.Version ]);
		}
		this.plugin_menu = new MultiMenu('fe_ng_plugin');
		this.plugin_menu.multi = true;
		this.plugin_menu.toggle = false;
		html += '<tr><td align=right class="fe_label_left">Plugins:</td><td align=left>'+this.plugin_menu.get_html(all_plugins, game.Plugin, {'class':'fe_medium_menu mult'})+'</td></tr>';
		html += '<tr><td></td><td class="caption"> Optionally choose one or more Engine Plugins to include in your game.  These offer additional functionality for your game, and are described in detail on the <a href="#ArticleCategory/plugins" target="_blank">Plugins Page</a>. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,10) + '</td></tr>';
		
		html += '<tr><td colspan="2" align="right" class="fe_label">* Denotes a required field.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '</table>';
				
		html += '<center><table style="margin-bottom:20px;"><tr>';
			if (game.GameID) {
				html += '<td>' + large_icon_button('x', 'Cancel', "#Game/" + game.GameID) + '</td>';
				html += '<td width=50>&nbsp;</td>';
				html += '<td>' + large_icon_button('controller_add.png', '<b>Save Changes</b>', "$P('GameEdit').save()") + '</td>';
			}
			else {
				html += '<td>' + large_icon_button('x', 'Cancel', "#Home") + '</td>';
				html += '<td width=50>&nbsp;</td>';
				html += '<td>' + large_icon_button('controller_add.png', '<b>Create Game</b>', "$P('GameEdit').save()") + '</td>';
			}
		html += '</tr></table></center>';
		
		if (game.GameID) {
			html += '</div>';
		}
		else {
			// html += end_section('blue_border', 24, 'png');
			html += '</div>';
		}
		
		html += '</form>';		
		this.div.innerHTML = html;
		if (!game.GameID) safe_focus( 'fe_ng_id' );
	},
	
	select_logo: function() {
		// select user image for logo
		do_user_image_manager( [this, 'select_logo_finish'] );
	},
	
	select_logo_finish: function(filename) {
		// logo was selected
		$('d_ng_logo').innerHTML = user_image_thumbnail(filename, 160, 120);
		$('fe_ng_logo').value = session.username + '/' + filename;
	},
	
	remove_logo: function() {
		// remove logo
		$('d_ng_logo').innerHTML = image_placeholder('(No image selected)', 160, 120);
		$('fe_ng_logo').value = '';
	},
	
	save: function() {
		// create new game or save changes to existing game
		clear_field_error();
		
		var title = trim( $('fe_ng_title').value );
		if (!title.length) return bad_field('fe_ng_title', "You must enter a title for your game.");
		
		var desc = trim( $('fe_ng_desc').value );
		
		var access = get_menu_value('fe_ng_access');
		
		var genres = this.cat_menu.get_value();
		if (genres.split(/\,\s*/).length > 3) return bad_field('fe_ng_cat', "You can only choose up to 3 genres to list your game under.");
		
		var logo = $('fe_ng_logo').value;
		
		var preload = $('fe_ng_preload').checked ? '1' : '0';
		
		var plugin_csv = this.plugin_menu.get_value();
		
		var twitter_username = trim( $('fe_ng_twitter_username').value );
		var twitter_password = trim( $('fe_ng_twitter_password').value );
		
		var lang = get_menu_value('fe_ng_lang');
		
		if (this.game) {
			// save existing game (update)
			var state = get_menu_value('fe_ng_state');

			/* var base_images_path = trim( $('fe_ng_base_images').value );
			if (!base_images_path.match(/^[\w\/\-\.]+$/)) return bad_field('fe_ng_base_images', "Please enter a valid path for the base image directory.");
			base_images_path = base_images_path.replace(/\/$/, '').replace(/^([^\/])/, '/$1');

			var base_audio_path = trim( $('fe_ng_base_audio').value );
			if (!base_audio_path.match(/^[\w\/\-\.]+$/)) return bad_field('fe_ng_base_audio', "Please enter a valid path for the base audio directory.");
			base_audio_path = base_audio_path.replace(/\/$/, '').replace(/^([^\/])/, '/$1');

			var base_text_path = trim( $('fe_ng_base_text').value );
			if (!base_text_path.match(/^[\w\/\-\.]+$/)) return bad_field('fe_ng_base_text', "Please enter a valid path for the base text directory.");
			base_text_path = base_text_path.replace(/\/$/, '').replace(/^([^\/])/, '/$1');

			var base_font_path = trim( $('fe_ng_base_fonts').value );
			if (!base_font_path.match(/^[\w\/\-\.]+$/)) return bad_field('fe_ng_base_fonts', "Please enter a valid path for the base font directory.");
			base_font_path = base_font_path.replace(/\/$/, '').replace(/^([^\/])/, '/$1'); */
			
			// resources
			var resources = [];
			re_update_all('fe_ng_res');
			array_cat( resources, re_get_all('fe_ng_res') );
			
			effect_api_mod_touch('game_get', 'get_user_games');
			effect_api_send('game_update', {
				GameID: this.game.GameID,
				Title: title,
				Description: desc,
				Access: access,
				State: state,
				Genre: genres,
				Logo: logo,
				TwitterUsername: twitter_username,
				TwitterPassword: twitter_password,
				PreloadAll: preload,
				Resources: { Resource: resources },
				Plugin: plugin_csv,
				Language: lang
			}, [this, 'save_finish'], { } );
		}
		else {
			// create new game
			var game_id = trim( $('fe_ng_id').value ).toLowerCase();
			if (!game_id.length) return bad_field('fe_ng_id', "You must enter an ID for your game.");
			if (game_id.length > 32) return bad_field('fe_ng_id', "Your Game ID is too long.  Please keep it to 32 characters or less.");
			if ((game_id == 0) || !game_id.match($R.GameID)) return bad_field('fe_ng_id', "Your Game ID is invalid.  Please use only alphanumerics and dashes, make sure it is at least 2 characters in length, and begins and ends with an alphanumeric character.");
			if (!check_reserved_word(game_id)) return bad_field('fe_ng_id', "Your Game ID is a reserved word.  Please choose another.");
			if (game_id.match(/^\d+$/)) return bad_field('fe_ng_id', "Your Game ID cannot be a number.  Please use at least one alpha character.");
			
			effect_api_mod_touch('game_get', 'get_user_games');
			effect_api_send('game_create', {
				GameID: game_id,
				Title: title,
				Description: desc,
				Access: access,
				State: 'New',
				Genre: genres,
				Logo: logo,
				TwitterUsername: twitter_username,
				TwitterPassword: twitter_password,
				PreloadAll: preload,
				Plugin: plugin_csv,
				Language: lang,
				
				PortWidth: '640',
				PortHeight: '480',
				Zoom: 'Yes',
				ZoomFilter: 'Sharp',
				ZoomDefault: '1',
				FrameRate: '60',
				SkipFrames: 1,
				BackgroundColor: '#000000',
				BackgroundImage: '',
				ToolbarColor: '#3D3D3D',
				
				AudioEnabled: '1',
				AudioMasterVolume: '1.0',
				AudioSFXVolume: '1.0',
				AudioMusicVolume: '0.75',
				AudioVideoVolume: '1.0'
				
			}, [this, 'save_finish'], { _game_id: game_id, _title: title } );
		}
	},
	
	save_finish: function(response, tx) {
		if (this.game) {
			// updated existing game
			this.game = response.Game;
			if (page_manager.find('Game')) $P('Game').game = response.Game;
			Nav.go('Game/' + this.game.GameID );
			do_message('success', "Game info saved successfully.");
			update_header();
		}
		else {
			// update user article post privs (this happens on the server, but user rec is not reloaded)
			if (!session.user.Privileges.article_post_categories.games) session.user.Privileges.article_post_categories.games = {};
			session.user.Privileges.article_post_categories.games[tx._game_id] = tx._title;
			
			Nav.go('Game/' + tx._game_id );
			do_message('success', "Game created successfully.");
			update_header();
		}
	}

} );

Class.subclass( Effect.Page, "Effect.Page.GameLog", {
	
	// Game Log Page
	
	onInit: function() {
		// render page HTML
		var html = '';
		
		html += '<h1 id="h_game_log_header">Loading...</h1>';
		
		html += '<div id="d_game_log_tab_bar"></div>';
		
		html += '<div id="d_game_log_content" class="game_main_area">';
		
		html += '<h2 id="h_user_log">Game Activity Log</h2>';
		// html += '<div style="margin-bottom:10px;"><a id="a_game_log_return" href="#">&larr; Return to Game</a></div>';
		
		html += '<div id="d_game_log_controls" style="margin-bottom:10px"></div>';
		
		html += '<div id="d_game_log"></div>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(game_id) {
		if (!require_login()) {
			return false;
		}
		
		$('d_game_log').innerHTML = loading_image();
		
		$('d_game_log_tab_bar').innerHTML = get_game_tab_bar(game_id, 'Game');
		
		var html = '';
		html += large_icon_button('arrow_turn_left.png', 'Return to Game', "#Game/" + game_id);
		html += '<div style="float:right;">' + large_icon_button('page_white_edit.png', 'Post Message', "$P().do_post()") + '<div class="clear"></div></div>';
		html += '<div style="float:right; margin-right:10px; padding-top:1px;">'+
			'<input type="text" id="fe_game_log_text" class="fe_medium" style="width:300px;" maxlength="140" onEnter="$P().do_post()"/></div>';
		html += '<div class="clear"></div>';
		$('d_game_log_controls').innerHTML = html;
		
		setTimeout( function() {
			$('fe_game_log_text').onkeydown = delay_onChange_input_text;
		}, 1 );
		
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
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		$('d_game_log_tab_bar').innerHTML = '';
		$('d_game_log_controls').innerHTML = '';
		$('d_game_log').innerHTML = '';
		this.rows = null;
		return true;
	},
	
	receive_game: function(response, tx) {
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID; 
		}
		
		Nav.title( "Game Activity Log | " + this.game.Title );
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			[Nav.currentAnchor(), "Game Activity Log"]
		);
		
		$('h_game_log_header').innerHTML = fit_game_title(this.game.Title);
		
		$('d_game_log').innerHTML = '';
		
		// $('a_game_log_return').setAttribute('href', '#Game/' + this.game_id);
		// $('a_game_log_return').href = '#Game/' + this.game_id;
		
		effect_api_get('game_get_log', { 
			id: this.game_id,
			offset: 0,
			limit: 100
		}, [this, 'receive_log'], { _search_args: { offset:0, limit:100 } });
		
		return true;
	},
	
	research: function(offset) {
		// run previous search but with different offset
		var args = this.last_search;
		if (!args) return;
		
		args.id = this.game_id;
		args.offset = offset;
		effect_api_get( 'game_get_log', args, [this, 'receive_log'], { _search_args: args } );
	},
	
	receive_log: function(response, tx) {
		// receive user log
		var html = '';
		var args = tx._search_args;
		this.last_search = args;
		
		if (response && response.Rows && response.Rows.Row) {
			var rows = this.rows = always_array( response.Rows.Row );
			
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
			html += '<tr><th>Date/Time</th><th>Username</th><th>Action</th><th>IP&nbsp;Address</th><th>User&nbsp;Agent</th></tr>';
			
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				html += '<tr>';
				html += '<td><nobr>' + get_short_date_time(row.Date) + '</nobr></td>';
				html += '<td><a href="#User/'+row.Username+'">' + row.Username + '</a></td>';
				
				// html += '<td class="fe_label">' + row.Message + '</td>';
				html += '<td>' + icon( get_icon_for_glog_type(row.Type), '<span class="fe_label">'+row.Message+'</span>' ) + '</td>';
				
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
		
		$('d_game_log').innerHTML = html;
	},
	
	do_post: function() {
		// post a message to the game log
		var msg = trim( $('fe_game_log_text').value );
		if (msg) {
			$('fe_game_log_text').value = '';
			effect_api_mod_touch('game_get_log');
			effect_api_send('game_post_log', {
				GameID: this.game_id,
				Message: msg
			}, [this, 'post_finish'], { });
		}
	},
	
	post_finish: function(response, tx) {
		// finish posting to game log
		// this.rows.unshift( response.Row );
		// this.receive_log({ Rows: { Row: this.rows } });
		this.research(0);
	}
} );

Class.subclass( Effect.Page, "Effect.Page.GameAdmin", {
	
	// Game Admin Page
	
	onInit: function() {
		// render page HTML
		var html = '';
		
		html += '<h1 id="h_game_admin_header">Loading...</h1>';
		
		html += '<div id="d_game_admin_tab_bar"></div>';
		
		html += '<div id="d_game_admin_content" class="game_main_area">';
		
		html += '<div class="blurb">' + get_string('/GameAdmin/Blurb') + '</div>';
		
		// users
		html += '<div class="h1">';
			html += '<div id="d_game_admin_users_header" class="fl">';
				html += ''; // Members
			html += '</div>';
			html += '<div class="fr">';
				html += '<a id="a_game_summary_add_user_link" class="icon add_user" href="javascript:void($P().show_invite_users_dialog())" title="Invite Users">Invite Users</a>';
			html += '</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		html += '<div id="d_game_admin_users" style="margin-bottom:20px;">'+busy()+'</div>';
		
		// invites
		html += '<div class="h1">';
			html += '<div id="d_game_admin_invites_header" class="fl">';
				html += ''; // Invites
			html += '</div>';
			/* html += '<div class="fr">';
				html += '<a id="a_game_objects_create_sprite_link" class="icon add_sprite" href="#GameEditSprite" title="Add Sprite Class">Add Sprite Class</a>';
			html += '</div>'; */
			html += '<div class="clear"></div>';
		html += '</div>';
		html += '<div id="d_game_admin_invites" style="margin-bottom:30px;">'+busy()+'</div>';
		
		html += '<div id="d_game_admin_footer"></div>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(args) {
		if (!require_login()) {
			return false;
		}
		
		$('d_game_admin_users').innerHTML = loading_image();
		$('d_game_admin_invites').innerHTML = loading_image();
		
		var game_id = args.id;
		
		effect_api_get('game_get', { 
			id: game_id,
			users: 1,
			invites: 1
		}, [this, 'receive_game'], {});
		
		show_glog_widget(game_id);
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		$('d_game_admin_tab_bar').innerHTML = '';
		$('h_game_admin_header').innerHTML = '';
		$('d_game_admin_users').innerHTML = '';
		$('d_game_admin_invites').innerHTML = '';
		$('d_game_admin_footer').innerHTML = '';
		hide_glog_widget();
		return true;
	},
	
	receive_game: function(response, tx) {
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID;
			if (response.Users) {
				this.users = always_array( response.Users.User );
			}
			if (response.Invites) {
				this.invites = response.Invites.Invite ? always_array( response.Invites.Invite ) : [];
			}
		}
		
		if (!this.users) this.users = [];
		if (!this.invites) this.invites = [];
		
		Nav.title( "Game Administration | " + this.game.Title );
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			[Nav.currentAnchor(), "Administration"]
		);
		
		$('d_game_admin_tab_bar').innerHTML = get_game_tab_bar(this.game_id, 'Game');
		
		$('h_game_admin_header').innerHTML = fit_game_title(this.game.Title);
		
		// users
		var html = '';
		if (this.users.length) {
			var users = this.users;
			html += '<table class="data_table">';
			html += '<tr><th>Username</th><th>Administrator</th>' + '<th>Actions</th></tr>';
		
			for (var idx = 0, len = users.length; idx < len; idx++) {
				var user = users[idx];
			
				html += '<tr>';
				html += '<td>' + icon('user', '<b>' + user.Username + '</b>', '#User/' + user.Username) + '</td>';
				
				if (user.Username == session.username) {
					html += '<td align="center">' + ((user.Admin == 1) ? icon('accept.png') : '') + '</td>';
				}
				else {
					html += '<td align="center"><input type="checkbox" ' + ((user.Admin == 1) ? 'checked="checked"' : '') + 
						' onChange="$P(\'GameAdmin\').set_profile_boolean(\''+user.Username+'\',\'Admin\',this.checked)" /></td>';
				}
				
				if (user.Username != this.game.Owner) {
					html += '<td>' + icon('trash', "Remove From Game", "$P('GameAdmin').delete_member('"+user.Username+"')") + '</td>';
				}
				else {
					html += '<td></td>';
				}
				html += '</tr>';
			} // foreach user
			html += '</table>';
		
			$('d_game_admin_users_header').innerHTML = 'Members (' + users.length + ')';
		} // we have users
		else {
			$('d_game_admin_users_header').innerHTML = 'Members';
			html += 'No members found.  That is odd.';
			this.users = [];
		}
		$('d_game_admin_users').innerHTML = html;
		
		// invites
		html = '';
		if (this.invites.length) {
			var invites = this.invites;
			html += '<table class="data_table">';
			html += '<tr><th>To</th><th>From</th><th>Date/Time</th><th>Actions</th></tr>';
		
			for (var idx = 0, len = invites.length; idx < len; idx++) {
				var invite = invites[idx];
			
				html += '<tr>';
				html += '<td>' + icon('user', '<b>' + invite.Username + '</b>', '#User/' + invite.Username) + '</td>';
				html += '<td>' + icon('user', invite.From, '#User/' + invite.From) + '</td>';
				html += '<td>' + get_short_date_time(invite.Date) + '</td>';
				html += '<td>' + icon('trash', "Delete Invitation", "$P('GameAdmin').delete_invite('"+invite.Username+"')") + '</td>';
				html += '</tr>';
			} // foreach user
			html += '</table>';
		
			$('d_game_admin_invites_header').innerHTML = 'Invitations (' + invites.length + ')';
		} // we have users
		else {
			$('d_game_admin_invites_header').innerHTML = 'Invitations';
			html += 'No invitations have been sent.';
			this.invites = [];
		}
		$('d_game_admin_invites').innerHTML = html;
		
		// footer
		html = '';
		html += '<center><table style="margin-bottom:20px;"><tr>';
		html += '<td>' + large_icon_button('arrow_turn_left.png', 'Return to Game', "#Game/" + this.game.GameID) + '</td>';
		
		html += '<td width=30>&nbsp;</td>';
		html += '<td>' + large_icon_button('mail', 'Email Everyone...', "$P().show_broadcast_email_dialog()") + '</td>';
		
		if (session.username == this.game.Owner) {
			html += '<td width=30>&nbsp;</td>';
			html += '<td>' + large_icon_button('trash', 'Delete Game', "$P().do_delete_game()") + '</td>';
		}
	
		html += '</tr></table></center>';
		$('d_game_admin_footer').innerHTML = html;
				
		return true;
	},
	
	show_broadcast_email_dialog: function() {
		// show dialog for sending e-mail to all game members
		hide_popup_dialog();
		delete session.progress;

		var html = '';

		html += '<div class="dialog_bkgnd" style="background-image:url('+png('images/big_icons/email.png')+')">';

		html += '<table cellspacing=0 cellpadding=0><tr><td width=600 height=375 valign=center align=center>';
		html += '<div class="dialog_title" style="margin-bottom:10px;">Email All Game Members</div>';
				
		html += '<form method=get action="javascript:void(0)"><table cellspacing="0" cellpadding="0"><tr><td align="left">';
		
		html += '<table>';
		html += '<tr><td align=right class="fe_label">To:&nbsp;</td><td align=left>(All Game Members)</td></tr>';
		html += '<tr><td align=right class="fe_label">From:&nbsp;</td><td align=left>' + session.username + '</td></tr>';
		html += '</table>';
		
		html += '<div class="fe_label">Subject:</div>';
		html += '<div><input type="text" class="fe_medium" id="fe_gae_subject" size="30" maxlength="256"/></div>';
		html += '<div class="caption">Enter a subject for your e-mail.</div>';
		
		html += '<div class="fe_label">Message:</div>';
		html += '<textarea maxlength="2048" class="fe_edit" id="fe_gae_body" style="width:400px; height:150px;" wrap="virtual" onkeydown="return catchTab(this,event)">';
		html += '</textarea>';
		html += '<div class="caption">Enter the body of your e-mail here.  Plain text only please.</div>';
		
		html += '</td></tr></table></form>';
		
		html += '<br><br><table><tr>';
			html += '<td>' + large_icon_button('x', 'Cancel', "hide_popup_dialog()") + '</td>';
			html += '<td width=50>&nbsp;</td>';
			// html += '<td>' + large_icon_button('user', 'Create Account...', "Nav.go('CreateAccount')") + '</td>';
			// html += '<td width=15>&nbsp;</td>';
			html += '<td>' + large_icon_button('check', '<b>Send Email</b>', "$P().send_email()") + '</td>';
		html += '</tr></table>';

		html += '</form>';

		html += '</div>';

		// session.hooks.keys[ENTER_KEY] = [Comments, 'post', page_id]; // enter key
		session.hooks.keys[ESC_KEY] = 'hide_popup_dialog'; // escape key

		safe_focus( 'fe_gae_subject' );

		show_popup_dialog(600, 375, html);
	},
	
	send_email: function() {
		// send email invitations
		var subject = trim( $('fe_gae_subject').value );
		if (!subject) {
			$('fe_gae_subject').addClass('control_bad');
			$('fe_gae_subject').focus();
			return;
		}
		
		var msg = $('fe_gae_body').value;
		if (!msg) return;
		
		effect_api_send('game_admin_broadcast_email', {
			GameID: this.game_id,
			Subject: subject,
			Message: msg
		}, [this, 'send_email_finish'], { } );
		
		hide_popup_dialog();
	},
	
	send_email_finish: function(response, tx) {
		// successfully sent invitations, yay!
		do_message('success', 'Your e-mail was sent successfully.');
	},
	
	show_change_owner_dialog: function() {
		// show change owner dialog
		hide_popup_dialog();
		delete session.progress;

		var html = '';

		html += '<div class="dialog_bkgnd" style="background-image:url('+png('images/big_icons/key.png')+')">';

		html += '<table cellspacing=0 cellpadding=0><tr><td width=600 height=250 valign=center align=center>';
		html += '<div class="dialog_title">Change Game Ownership</div>';
		
		html += '<form method=get action="javascript:void(0)"><table cellspacing="0" cellpadding="0"><tr><td align="left">';
		
		html += '<div class="dx_paragraph" style="font-size:12px;">' + get_string('/GameAdmin/ChangeOwnerText') + '</div>';
		
		var members = [];
		var users = this.users;
		for (var idx = 0, len = users.length; idx < len; idx++) {
			var user = users[idx];
			if (user.Username != this.game.Owner) members.push( user.Username );
		}
		
		html += '<br/>';
		html += '<center><table>';
		html += '<tr><td class="fe_label_left" align="right">New Owner:</td><td>';
		html += menu('fe_game_admin_new_owner', members, '', {'class':'fe_medium_menu'});
		html += '</td></tr>';
		html += '</table></center>';
		
		html += '</td></tr></table></form>';
		
		html += '<br><br><table><tr>';
			html += '<td>' + large_icon_button('x', 'Cancel', "hide_popup_dialog()") + '</td>';
			html += '<td width=50>&nbsp;</td>';
			html += '<td>' + large_icon_button('check', '<b>Change Owner</b>', "$P().do_change_owner()") + '</td>';
		html += '</tr></table>';

		html += '</div>';

		// session.hooks.keys[ENTER_KEY] = [Comments, 'post', page_id]; // enter key
		session.hooks.keys[ESC_KEY] = 'hide_popup_dialog'; // escape key

		show_popup_dialog(600, 250, html);
	},
	
	do_change_owner: function() {
		var new_owner = $('fe_game_admin_new_owner').value;
		hide_popup_dialog();
		
		effect_api_send('game_change_owner', { 
			GameID: this.game_id,
			NewOwner: new_owner
		}, [this, 'change_owner_finish'], { _new_owner: new_owner });
	},
	
	change_owner_finish: function(response, tx) {
		// receive response from ownership change
		var owner_profile = find_object( this.users, { Username: tx._new_owner } );
		owner_profile.Admin = 1;
		
		this.receive_game(response, tx);
		do_message('success', "Game ownership successfully transferred to: " + tx._new_owner);
		
		show_glog_widget();
	},
	
	delete_invite: function(username) {
		// delete invite from game
		if (confirm("Are you sure you want to delete the invitation for user \""+username+"\"?")) {
			effect_api_send('game_delete_invite', { 
				GameID: this.game_id,
				Username: username
			}, [this, 'delete_invite_finish'], { _username: username });
		}
	},
	
	delete_invite_finish: function(response, tx) {
		// finish deleting invite
		// prune from list and refresh UI
		var idx = find_object_idx(this.invites, { Username: tx._username });
		assert(idx > -1, "Could not find invite in list! " + tx._username);
		
		this.invites.splice(idx, 1);
		this.receive_game();
		
		do_message('success', "Deleted invitation for user: " + tx._username);
		
		show_glog_widget();
	},
	
	delete_member: function(username) {
		// delete member from game
		if (confirm("Are you sure you want to remove member \""+username+"\" from the game?")) {
			effect_api_send('game_delete_member', { 
				GameID: this.game_id,
				Username: username
			}, [this, 'delete_member_finish'], { _username: username });
		}
	},
	
	delete_member_finish: function(response, tx) {
		// finish deleting user
		// prune from list and refresh UI
		var idx = find_object_idx(this.users, { Username: tx._username });
		assert(idx > -1, "Could not find user in list! " + tx._username);
		
		this.users.splice(idx, 1);
		this.receive_game();
		
		do_message('success', "Removed user from game: " + tx._username);
		
		show_glog_widget();
	},
	
	set_profile_boolean: function(username, key, checked) {
		// set member profile boolean flag (Admin, etc.) to checkbox value
		var user = find_object( this.users, { Username: username } );
		assert(!!user, "Could not find user object: " + username);
		
		user[key] = checked ? '1' : '0';
		
		effect_api_send('game_update_member_profile', merge_objects(user, { 
			GameID: this.game_id
		}), [this, 'update_profile_finish'], { _username: username });
	},
	
	update_profile_finish: function(response, tx) {
		do_message('success', "Updated member profile for: " + tx._username);
		show_glog_widget();
	},
	
	do_delete_game: function() {
		if (confirm("Are you sure you want to permanently delete this game and all associated data?  This will remove ALL published revisions, and remove the project from the developer site.  This action cannot be undone.  Continue with delete?")) {
			effect_api_mod_touch('get_user_games');
			effect_api_send('game_delete', {
				GameID: this.game.GameID
			}, [this, 'delete_game_finish'], { } );
		}
	},
	
	delete_game_finish: function(response, tx) {
		var gpage = page_manager.find('Game');
		if (gpage && gpage.game && (gpage.game.GameID == this.game.GameID)) {
			gpage.game = null;
			gpage.game_id = null; 
			gpage.stats = null;
			gpage.users = null;
			gpage.invites = null;
		}
		
		// delete game specific prefs
		if (!session.storage.games) session.storage.games = {};
		var games = session.storage.games;
		if (games[this.game_id]) {
			delete games[this.game_id];
			user_storage_mark();
		}
		
		Nav.go('Home');
		do_message('success', "The game \""+this.game.Title+"\" was deleted successfully.");
		this.game = null;
		this.game_id = '';
		update_header();
	},
	
	is_game_admin: function() {
		// determine if current user is a game admin
		var profile = find_object( this.users, { Username: session.username } );
		if (!profile) return false;
		
		return( profile.Admin == 1 );
	},
	
	show_invite_users_dialog: function() {
		// show dialog for inviting users to game
		hide_popup_dialog();
		delete session.progress;
		
		if (!this.is_game_admin() && !is_admin()) {
			do_message('error', "Only the game admin may invite users.");
			return;
		}

		var html = '';

		html += '<div class="dialog_bkgnd" style="background-image:url('+png('images/big_icons/email.png')+')">';

		html += '<table cellspacing=0 cellpadding=0><tr><td width=600 height=375 valign=center align=center>';
		html += '<div class="dialog_title" style="margin-bottom:10px;">Invite Users</div>';
		
		html += '<div id="d_invite_message" class="message error" style="display:none"></div>';
		
		html += '<form method=get action="javascript:void(0)"><table cellspacing="0" cellpadding="0"><tr><td align="left">';
		
		html += '<div class="fe_label">Usernames:</div>';
		html += '<div><input type="text" class="fe_medium" id="fe_invite_usernames" size="30" maxlength="256"/></div>';
		html += '<div class="caption">Enter one or more usernames to invite, separated by commas.</div>';
		
		html += '<div class="fe_label">Invitation Message:</div>';
		html += '<textarea maxlength="2048" class="fe_edit" id="fe_invite_body" style="width:400px; height:150px;" wrap="virtual" onkeydown="return catchTab(this,event)">';
		
		html += "Dear [user],\n\n";
		html += "You have been invited to join the game \""+this.game.Title+"\" by "+session.user.FullName+" ("+session.username+").  To accept your invitation, simply visit the game page and follow the instructions there:\n\n";
		html += location.href.replace(/\#.+$/, '') + "#Game/" + this.game.GameID + "\n\n";
		html += "Hope to see you soon!\n\n";
		html += "- " + session.user.FirstName + "\n";
		
		html += '</textarea>';
		html += '<div class="caption">Enter a custom invitation message for the users to receive.  Plain text only please.</div>';
		
		html += '</td></tr></table></form>';
		
		html += '<br><br><table><tr>';
			html += '<td>' + large_icon_button('x', 'Cancel', "hide_popup_dialog()") + '</td>';
			html += '<td width=50>&nbsp;</td>';
			// html += '<td>' + large_icon_button('user', 'Create Account...', "Nav.go('CreateAccount')") + '</td>';
			// html += '<td width=15>&nbsp;</td>';
			html += '<td>' + large_icon_button('check', '<b>Send Invites</b>', "$P().send_invites()") + '</td>';
		html += '</tr></table>';

		html += '</form>';

		html += '</div>';

		// session.hooks.keys[ENTER_KEY] = [Comments, 'post', page_id]; // enter key
		session.hooks.keys[ESC_KEY] = 'hide_popup_dialog'; // escape key

		safe_focus( 'fe_invite_usernames' );

		show_popup_dialog(600, 375, html);
	},
	
	send_invites: function() {
		// send email invitations
		$('d_invite_message').hide();
		
		var usernames = trim( $('fe_invite_usernames').value );
		if (!usernames) return;
		
		var msg = $('fe_invite_body').value;
		if (!msg) return;
		
		effect_api_mod_touch('game_get');
		effect_api_send('game_send_invites', {
			GameID: this.game.GameID,
			Usernames: usernames,
			Message: msg
		}, [this, 'send_invites_finish'], { _on_error: [this, 'send_invites_error'] } );
	},
	
	send_invites_error: function(response, tx) {
		// capture error and display a message inside the dialog
		$('d_invite_message').innerHTML = response.Description;
		$('d_invite_message').show();
	},
	
	send_invites_finish: function(response, tx) {
		// successfully sent invitations, yay!
		hide_popup_dialog();
		do_message('success', 'User invitations sent successfully.');
		
		show_glog_widget();
	}
	
} );

Class.subclass( Effect.Page, "Effect.Page.GameClone", {
	
	onActivate: function(game_id) {
		// page is being activated, show form
		
		if (!require_login()) {
			return false;
		}
		
		this.div.innerHTML = loading_image();
		
		this.old_game_id = '';
		
		if (game_id) {
			this.old_game_id = game_id;
			this.do_clone_game(game_id);
			return true;
		}
		else {
			do_error( "No Game ID was specified.");
			return false;
		}
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		this.div.innerHTML = '';
		return true;
	},
	
	do_clone_game: function(game_id) {
		// edit existing game
		if (this.game && (this.game.GameID == game_id)) {
			// game already loaded and ID matches, so proceed directly to drawing page
			this.do_clone_game_2();
		}
		else {
			// load game from server
			this.div.innerHTML = '';
			session.hooks.after_error = [this, 'clone_game_error'];
			effect_api_get('game_get', { id: game_id }, [this, 'do_clone_game_2'], {});
		}
	},
	
	clone_game_error: function() {
		// catch edit game error and send user back to prev page
		Nav.prev();
	},
	
	do_clone_game_2: function(response) {
		// edit existing game
		if (response) {
			delete session.hooks.after_error;
			this.game = response.Game;
		}
		var title = 'Cloning Game "'+this.game.Title+'"';
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			[Nav.currentAnchor(), 'Clone Game']
		);
		
		Nav.title( "Clone Game | " + title );
		
		this.draw_clone_form( this.game );		
	},
	
	draw_clone_form: function(game) {
		var html = '';
		
		html += '<form method=get action="javascript:void(0)">';
		
		// if editing game, draw game tabs and border, otherwise, standard blue border
		html += '<h1>' + game.Title + '</h1>';
		html += get_game_tab_bar(game.GameID, 'Game');
		html += '<div class="game_main_area">';
			
		html += '<h1>' + 'Clone Game' + '</h1>';
		html += '<div class="blurb">' + get_string('/GameCloneForm/Blurb') + '</div>';
		
		html += '<table style="margin:20px;">';
		
		// game id
		html += '<tr><td align=right class="fe_label_left">Old Game ID:</td>';
		html += '<td align=left><span class="medium"><b>' + game.GameID + '</b></span></td></tr>';
		
		html += '<tr><td></td><td><div class="form_spacer"></div></td></tr>';
		
		html += '<tr><td align=right class="fe_label_left">New Game ID:*</td>';
		html += '<td align=left><input type=text id="fe_cg_id" class="fe_medium" size="20" maxlength="32" value="'+escape_text_field_value(game.GameID.toString().replace(/\d+$/, '') + Math.floor(Math.random() * 9999))+'"></td></tr>';
		html += '<tr><td></td><td class="caption"> Enter a new unique ID for your clone.  Only alphanumerics and dashes are allowed.  Please note that you <b>cannot</b> change this value once it is set.</td></tr>';
		
		// html += '<tr><td colspan=2>' + spacer(1,20) + '</td></tr>';
		html += '<tr><td></td><td><div class="form_spacer"></div></td></tr>';
		
		// title
		var new_title = game.Title.toString();
		if (new_title.match(/Clone$/)) new_title += ' 2';
		else if (new_title.match(/Clone\s+(\d+)$/)) {
			var num = parseInt( RegExp.$1, 10 );
			new_title = new_title.replace(/\d+$/, num + 1);
		}
		else new_title += ' Clone';
		
		html += '<tr><td align=right class="fe_label_left">New Title:*</td><td align=left><input type=text id="fe_cg_title" class="fe_medium" size="40" maxlength="64" value="'+escape_text_field_value(new_title)+'"></td></tr>';
		html += '<tr><td></td><td class="caption"> Enter a new title for your clone.  You can use upper- and lower-case characters, and common symbols. </td></tr>';
		html += '<tr><td></td><td><div class="form_spacer"></div></td></tr>';
		
		// desc
		html += '<tr><td align=right class="fe_label_left">New&nbsp;Description:</td><td align=left><textarea class="fe_edit" id="fe_cg_desc" style="width:400px; height:150px;" wrap="virtual" onkeydown="return catchTab(this,event)">'+escape_textarea_value("This is a clone of \""+game.Title+"\".\n\n" + game.Description)+'</textarea></td></tr>';
		html += '<tr><td></td><td><div class="caption">Optionally enter a new description for your clone.  You can use rich formatting here:</div> ' + Blog.edit_caption + ' </td></tr>';
		html += '<tr><td></td><td><div class="form_spacer"></div></td></tr>';
		
		html += '<tr><td colspan="2" align="right" class="fe_label">* Denotes a required field.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '</table>';
				
		html += '<center><table style="margin-bottom:20px;"><tr>';
				html += '<td>' + large_icon_button('x', 'Cancel', "#Game/" + game.GameID) + '</td>';
				html += '<td width=50>&nbsp;</td>';
				html += '<td>' + large_icon_button('controller_add.png', '<b>Clone Game</b>', "$P().save()") + '</td>';
		html += '</tr></table></center>';
		
		html += '</div>';
		
		html += '</form>';		
		this.div.innerHTML = html;
		// safe_focus( 'fe_cg_id' );
	},
	
	save: function() {
		// create new game or save changes to existing game
		clear_field_error();
		
		var title = trim( $('fe_cg_title').value );
		if (!title.length) return bad_field('fe_ng_title', "You must enter a new title for your clone.");
		
		var desc = trim( $('fe_cg_desc').value );
		
		// clone new game
		var game_id = trim( $('fe_cg_id').value ).toLowerCase();
		if (!game_id.length) return bad_field('fe_cg_id', "You must enter an ID for your clone.");
		if (game_id.length > 32) return bad_field('fe_cg_id', "Your new Game ID is too long.  Please keep it to 32 characters or less.");
		if ((game_id == 0) || !game_id.match($R.GameID)) return bad_field('fe_cg_id', "Your Game ID is invalid.  Please use only alphanumerics and dashes, make sure it is at least 2 characters in length, and begins and ends with an alphanumeric character.");
		if (!check_reserved_word(game_id)) return bad_field('fe_cg_id', "Your Game ID is a reserved word.  Please choose another.");
		if (game_id.match(/^\d+$/)) return bad_field('fe_cg_id', "Your Game ID cannot be a number.  Please use at least one alpha character.");
		
		show_progress_dialog(1, "Cloning game...");
		
		effect_api_mod_touch('game_get', 'get_user_games');
		effect_api_send('game_clone', {
			OldGameID: this.game.GameID,
			NewGameID: game_id,
			Title: title,
			Description: desc
		}, [this, 'save_finish'], { _game_id: game_id, _title: title } );
	},
	
	save_finish: function(response, tx) {
		// update user article post privs (this happens on the server, but user rec is not reloaded)
		if (!session.user.Privileges.article_post_categories.games) session.user.Privileges.article_post_categories.games = {};
		session.user.Privileges.article_post_categories.games[tx._game_id] = tx._title;
		
		hide_popup_dialog();
		
		Nav.go('Game/' + tx._game_id );
		do_message('success', "Game cloned successfully.");
		update_header();
	}

} );
