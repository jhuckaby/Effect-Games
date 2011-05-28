// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

assetmgr.cancel_transfer = function() {
	// cancel dialog and abort transfer
	session.hooks.before_selection_change = null;
	delete session.hooks.keys[ENTER_KEY]; // enter key
	delete session.hooks.keys[ESC_KEY]; // esc key
	hide_popup_dialog();
};

assetmgr.transfer_files = function() {
	// transfer files and/or folders to other games
	// first, load user game list
	show_progress_dialog(1, "One moment please...", false);
	effect_api_get( 'get_user_games', { limit:1000, offset:0 }, [this, 'transfer_files_2'], { } );
};

assetmgr.transfer_files_2 = function(response, tx) {
	// show transfer dialog
	hide_progress_dialog();
	this.games = [];
	if (response && response.Rows && response.Rows.Row) {
		this.games = always_array( response.Rows.Row );
	}
	if (this.games.length < 2) {
		do_error("You are only a member of a single game.  Please create or join another game, then you can transfer assets around.");
		return;
	}
	
	var html = '';
	
	html += '<div class="dialog_bkgnd" style="background-image:url('+png('images/big_icons/folder_game.png')+')">';
	
	html += '<table cellspacing=0 cellpadding=0><tr><td width=475 height=160 valign=center align=center>';
	html += '<div class="dialog_title">Transfer Assets to Game</div>';
	
	html += '<table cellspacing=5>';
	
	if (!this.transfer_target) this.transfer_target = '';
	
	html += '<tr><td align=right class="fe_label">Target Game:&nbsp;</td>';
	html += '<td align=left><select id="fe_assetmgr_target_game" class="fe_medium_menu">';
	for (var idx = 0, len = this.games.length; idx < len; idx++) {
		var game = this.games[idx];
		if (game.GameID != this.game_id) {
			html += '<option';
			if (game.GameID == this.transfer_target) html += ' selected="selected"';
			html += ' value="' + game.GameID + '">' + ww_fit_string(game.Title, 200, session.em_width, 1) + '</option>';
		}
	}
	html += '</select></td></tr></table><br><br>';
	
	html += '<table><tr>';
		html += '<td>' + large_icon_button('x', 'Cancel', 'assetmgr.cancel_transfer()') + '<div class="clear"></div></td>';
		html += '<td width=50>&nbsp;</td>';
		html += '<td>' + large_icon_button('check', 'Transfer', 'assetmgr.do_transfer()') + '<div class="clear"></div></td>';
	html += '</tr></table>';
	
	html += '</td></tr></table>';
	
	show_popup_dialog(575, 160, html);
	session.hooks.before_selection_change = [this, 'cancel_transfer'];
	session.hooks.keys[ENTER_KEY] = [this, 'do_transfer']; // enter key
	session.hooks.keys[ESC_KEY] = [this, 'cancel_transfer']; // escape key
};

assetmgr.do_transfer = function() {
	// perform file transfer
	var menu = $('fe_assetmgr_target_game');
	var game_id = menu.options[menu.selectedIndex].value;
	this.transfer_target = game_id;
	
	var game = find_object( this.games, { GameID: game_id } );
	this.target_game = game;
	
	this.cancel_transfer(); // hides dialog
	
	var num_selected = num_keys(this.selection);
	show_progress_dialog(1, "Transferring " + num_selected + " " + pluralize('item', num_selected), false);
	
	effect_api_get('asset_folder_tree_get', { 
		id: game_id
	}, [this, 'do_transfer_2'], {});
};

assetmgr.do_transfer_2 = function(response, tx) {
	// receive response from folder tree load
	var remote_tree = lookup_path('/Data/FolderList', response);
	if (!remote_tree) remote_tree = {}; // first time use
	
	// make sure selection contains all subfolders
	this.cleanup_selection();
	
	// create all necessary nodes in tree
	for (var path in this.selection) {
		var new_path = this.is_folder(path) ? path : (dirname(path) + '/');
		var folder = lookup_path(new_path, remote_tree);
			
		if (!folder) set_path_value( new_path, remote_tree, {} );
	}
	
	// save remote folder tree
	effect_api_send('asset_store_folder_data', {
		GameID: this.transfer_target,
		Data: {
			FolderList: remote_tree,
			LastUpdate: time_now(),
			LastUser: session.username
		}
	}, [this, 'do_transfer_3'], {});
};

assetmgr.do_transfer_3 = function(response) {
	// load all applicable metadata
	this.load_queue = {};
	this.populate_load_queue(this.selection);
	this.run_load_queue( [this, 'do_transfer_4'] );
};

assetmgr.do_transfer_4 = function() {
	// queue up all external file copy operations
	this.action_queue = [];
	
	// make sure selection contains all subfolders
	this.cleanup_selection();
	
	// queue copy operations to target environment
	for (var path in this.selection) {
		if (this.is_folder(path)) {
			// copy entire folder
			var metadata = this.folder_metadata[path];
			if (!metadata) metadata = {};
			
			// queue actual file copies
			if (metadata.Files && metadata.Files.File) {
				always_array( metadata.Files, 'File' );
				for (var idx = 0, len = metadata.Files.File.length; idx < len; idx++) {
					var file = metadata.Files.File[idx];
					var filename = file.Name;
					
					this.action_queue.push({
						asset_copy_file: {
							GameID: this.game_id,
							NewGameID: this.transfer_target,
							Filename: filename,
							SourcePath: normalize_dir_path(path),
							DestPath: normalize_dir_path(path)
						}
					});
				} // foreach file in folder
			} // folder has files
		}
		else {
			// copy individual file
			var filename = basename(path);
			
			this.action_queue.push({
				asset_copy_file: {
					GameID: this.game_id,
					NewGameID: this.transfer_target,
					Filename: filename,
					SourcePath: normalize_dir_path( dirname(path) ),
					DestPath: normalize_dir_path( dirname(path) )
				}
			});
		} // individual file
	} // foreach selected item
	
	// here we go!
	this.run_action_queue( [this, 'do_transfer_5'] );
};

assetmgr.do_transfer_5 = function() {
	// success, show message and we're done
	hide_progress_dialog();
	var msg = 'Your ';
	if (num_keys(this.selection) == 1) 
		msg += (this.is_folder(first_key(this.selection)) ? 'folder' : 'file') + ' was';
	else
		msg += 'items were';
	msg += ' successfully transferred to the game "'+this.target_game.Title+'".';
	
	do_message( 'success', msg );
	
	// make sure selection doesn't contain any folders and child items within those folders
	for (var path in this.selection) {
		if (this.is_folder(path)) {
			for (var path2 in this.selection) {
				if ((path2 != path) && (path2.indexOf(path) == 0)) {
					delete this.selection[path2];
				}
			} // inner
		} // is folder
	} // outer
	
	this.refresh_folder_list_fast();
	this.update_floater();
	
	show_glog_widget();
};
