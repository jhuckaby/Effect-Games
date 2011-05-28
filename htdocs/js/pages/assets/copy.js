// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

assetmgr.cancel_copy = function() {
	// cancel dialog and abort copy
	session.hooks.before_selection_change = null;
	delete session.hooks.keys[ENTER_KEY]; // enter key
	delete session.hooks.keys[ESC_KEY]; // esc key
	hide_popup_dialog();
};

assetmgr.copy_files = function() {
	// move or copy files
	var html = '';
	
	html += '<div class="dialog_bkgnd" style="background-image:url('+png('images/big_icons/folder.png')+')">';
	
	html += '<table cellspacing=0 cellpadding=0><tr><td width=400 height=180 valign=center align=center>';
	html += '<div class="dialog_title">Move/Copy Items</div>';
	
	html += '<table cellspacing=5>';
	
	html += '<tr><td align=right class="fe_label">Action:&nbsp;</td>';
	html += '<td align=left><select id="fe_assetmgr_yes_delete" class="fe_small_menu">';
	html += '<option value="1"' + (this.yes_delete ? ' selected="selected"' : '') + '>Move</option>';
	html += '<option value="0"' + (this.yes_delete ? '' : ' selected="selected"') + '>Copy</option>';
	html += '</select></td></tr>';
	
	if (!this.copy_target) this.copy_target = '';
	var folders = this.get_folder_list();
	
	html += '<tr><td align=right class="fe_label">Target Folder:&nbsp;</td>';
	html += '<td align=left><select id="fe_assetmgr_target_folder" class="fe_small_menu">';
	for (var idx = 0, len = folders.length; idx < len; idx++) {
		var path = folders[idx];
		var filename = basename(path);
		if (!filename) filename = '(Root Directory)';
		else filename += '/';
		
		var indent = count_chars(path, '/') - 2; // path always starts with /
		var prefix = multiplex_str('&nbsp;', indent * 4);
		html += '<option';
		if (path == this.copy_target) html += ' selected="selected"';
		html += ' value="' + path + '">' + prefix + filename + '</option>';
	}
	html += '</select></td></tr></table><br><br>';
	
	html += '<table><tr>';
		html += '<td>' + large_icon_button('x', 'Cancel', 'assetmgr.cancel_copy()') + '<div class="clear"></div></td>';
		html += '<td width=50>&nbsp;</td>';
		html += '<td>' + large_icon_button('check', 'Submit', 'assetmgr.do_copy()') + '<div class="clear"></div></td>';
	html += '</tr></table>';
	
	html += '</td></tr></table>';
	
	show_popup_dialog(500, 180, html);
	session.hooks.before_selection_change = [this, 'cancel_copy'];
	session.hooks.keys[ENTER_KEY] = [this, 'do_copy']; // enter key
	session.hooks.keys[ESC_KEY] = [this, 'cancel_copy']; // escape key
};

assetmgr.do_copy = function() {
	// perform copy (or move, depending on session.yes_delete)
	var yd_menu = $('fe_assetmgr_yes_delete');
	this.yes_delete = parseInt( yd_menu.options[yd_menu.selectedIndex].value, 10 );
	
	var tf_menu = $('fe_assetmgr_target_folder');
	var target_path = tf_menu.options[tf_menu.selectedIndex].value;
	this.copy_target = target_path;
	
	this.cancel_copy(); // hides dialog
	
	show_progress_dialog(1, "Preparing to " + (this.yes_delete ? "Move" : "Copy") + "...", false);
	this.update_folder_list( [this, 'do_copy_post_update'] );
};

assetmgr.do_copy_post_update = function() {
	var target_path = this.copy_target;
	
	// folders cannot be moved into themselves
	// if (session.yes_delete) {
		for (var path in this.selection) {
			if (this.is_folder(path) && (this.copy_target.indexOf(path) == 0)) {
				return do_error("A folder cannot be moved or copied onto, or into itself.");
			}
		}
	// }
	
	// prune null actions (items moved to same folder)
	for (var path in this.selection) {
		if ((dirname(path) + '/') == this.copy_target) delete this.selection[path];
	}
	var num_selected = num_keys(this.selection);
	if (!num_selected) {
		this.selection = {};
		this.refresh_folder_list_fast();
		this.update_floater();
		return do_error("No action required: all the item(s) are already in the target folder.");
	}
	
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
	
	update_progress_dialog(1, (this.yes_delete ? "Moving" : "Copying") + " " + num_selected + " " + pluralize('item', num_selected) );
	
	// load ALL applicable metadata, including target folder
	this.load_queue = {};
	this.load_queue[ this.copy_target ] = 1;
	this.populate_load_queue(this.selection);
	this.run_load_queue( [this, 'do_copy_2'] );
};

assetmgr.do_copy_2 = function() {
	// make sure files aren't in the way at the destination
	var need_confirm = 0;
	var delete_paths = {};
	
	for (var path in this.selection) {
		var filename = basename(path);
		if (this.is_folder(path)) {
			var target_path = this.copy_target + filename + '/';
			if (this.get_folder_object(target_path)) {
				// folder already exists in target
				need_confirm++;
				delete_paths[target_path] = 1;
			}
		}
		else {
			var target_path = this.copy_target + filename;
			if (this.get_file_object(target_path)) {
				// file already exists in target
				need_confirm++;
				delete_paths[target_path] = 1;
			}
		}
	}
	
	this.action_queue = [];
	
	if (need_confirm) {
		var msg = (need_confirm == 1) ? 
			"An item already exists in the target folder.  If you continue, it will be replaced." : 
			('' + need_confirm + " items already exist in the target folder.  If you continue, they will be replaced.");
		msg += "  Proceed with " + (this.yes_delete ? "move" : "copy") + "?";
		if (!confirm(msg)) {
			hide_progress_dialog();
			return;
		}
		
		// queue up deletes of target files/folders in our way
		this.queue_deletes(delete_paths);
	}
	
	// manipulate folder tree
	this.need_save_folder_tree = false;
	var base_path_map = {};
	
	for (var path in this.selection) {
		if (this.is_folder(path)) {
			// copy entire mediaset
			var filename = basename(path);
			var folder = this.get_folder_object(path);
			set_path_value( this.copy_target + filename + '/', this.folder_tree, folder ); // install under target
			this.need_save_folder_tree = true;
			
			base_path_map[path] = this.copy_target + filename + '/';
		}
	}
	
	// make sure selection contains all subfolders
	this.cleanup_selection();
	
	// queue copy operations
	for (var path in this.selection) {
		if (this.is_folder(path)) {
			// copy entire mediaset
			var target_path = '';
			for (var key in base_path_map) {
				if (path.indexOf(key) == 0) {
					var re = new RegExp( key.replace(/(\W)/g, "\\$1") );
					target_path = path.replace(re, base_path_map[key]);
					break;
				}
			}
			
			// var target_path = this.copy_target + basename(path) + '/';
			
			var metadata = this.folder_metadata[path];
			if (!metadata) return alert("Cannot find metadata for: " + path);
			
			// copy metadata to target
			this.folder_metadata[target_path] = deep_copy_tree( metadata );
			var new_metadata = this.folder_metadata[target_path];
			
			// queue actual file copies
			if (metadata.Files && metadata.Files.File) {
				for (var idx = 0, len = metadata.Files.File.length; idx < len; idx++) {
					var file = metadata.Files.File[idx];
					var filename = file.Name;
					
					this.action_queue.push({
						asset_copy_file: {
							GameID: this.game_id,
							Filename: filename,
							SourcePath: normalize_dir_path(path),
							DestPath: normalize_dir_path(target_path)
						}
					});
					
					// update create/modify dates in in-memory metadata
					new_metadata.Files.File[idx].Created = new_metadata.Files.File[idx].Modified = time_now();
					new_metadata.Files.File[idx].Username = session.username;
				} // foreach file in folder
			} // folder has files
		}
		else {
			// copy individual file
			var filename = basename(path);
			
			// copy item metadata to target metadata
			var target_metadata = this.folder_metadata[ this.copy_target ];
			if (!target_metadata) return alert("Cannot find metadata for: " + this.copy_target);
			if (!target_metadata.Files) target_metadata.Files = {};
			if (!target_metadata.Files.File) target_metadata.Files.File = [];
			
			var new_file = deep_copy_tree( this.get_file_object(path) );
			new_file.Created = new_file.Modified = time_now();
			new_file.Username = session.username;
			
			var old_idx = find_object_idx( target_metadata.Files.File, { Name: new_file.Name } );
			if (old_idx > -1) target_metadata.Files.File[old_idx] = new_file;
			else target_metadata.Files.File.push( new_file );
			
			// keep it sorted
			// TODO: optimize, only do this once, not for each selected item
			target_metadata.Files.File = target_metadata.Files.File.sort( function(a,b) {
				return( (b.Name.toString().toLowerCase() < a.Name.toString().toLowerCase()) ? 1 : -1 );
			} );
			
			this.action_queue.push({
				asset_copy_file: {
					GameID: this.game_id,
					Filename: filename,
					SourcePath: normalize_dir_path(dirname(path)),
					DestPath: normalize_dir_path(this.copy_target)
				}
			});
		} // individual file
	} // foreach selected item
	
	// if this is a move operation (not a copy) then delete all the originals
	if (this.yes_delete) this.queue_deletes(this.selection);
	
	// here we go!
	this.run_action_queue( [this, 'do_copy_3'] );
};

assetmgr.do_copy_3 = function() {
	// save folder tree, if needed
	if (this.need_save_folder_tree) this.save_folder_tree( [this, 'do_copy_4'] );
	else this.do_copy_4( {Code:0} );
};

assetmgr.do_copy_4 = function(response) {
	// perform post-copy cleanup and refresh affected folders
	hide_progress_dialog();
	
	for (var path in this.selection) {
		if (this.is_folder(path)) {
			// remove deleted folders (and child folders) from the open_folders list
			// for (var path2 in session.open_folders) {
			// 	if (path2.indexOf(path) == 0) delete session.open_folders[path2];
			// }
			
			// if any open folders were part of the rename, need to change those
			var re = new RegExp("^" + path.replace(/\//g, "\\/"));
			for (var key in this.open_folders) {
				if (key.indexOf(path) == 0) {
					var old_path = key;
					var new_path = old_path.replace(re, this.copy_target + basename(path) + '/');
					if (this.yes_delete) delete this.open_folders[old_path];
					this.open_folders[new_path] = 1;
				} // is child of selected folder
			}
	
			// and delete the old folder metadata cache
			if (this.yes_delete) {
				for (var path2 in this.folder_metadata) {
					if (path2.indexOf(path) == 0) delete this.folder_metadata[path2];
				}
			}
		} // is folder
	} // foreach selected item
	
	// make sure the target folder, and its parent folders, are open
	var folders = this.get_folder_list();
	for (var idx = 0, len = folders.length; idx < len; idx++) {
		if ((this.copy_target.indexOf(folders[idx]) == 0) && (folders[idx].length <= this.copy_target.length))
			this.open_folders[folders[idx]] = 1;
	}
	this.open_folders[ this.copy_target ] = 1;
	user_storage_mark();
	
	// update selection
	/* var new_selection = {};
	for (var path in this.selection) {
		var filename = basename(path);
		if (this.is_folder(path)) new_selection[ this.copy_target + filename + '/' ] = 1;
		else new_selection[ this.copy_target + filename ] = 1;
	}
	this.selection = new_selection; */
	this.selection = {};
	
	// update UI
	this.refresh_folder_list_fast();
	this.update_floater();
	
	show_glog_widget();
};
