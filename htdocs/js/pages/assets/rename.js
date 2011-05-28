// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

function assetmgr_mouse_rename(type, e, pt) {
	return true;
};

assetmgr.rename_file = function() {
	// prompt user to rename file
	var path = first_key(this.selection);
	var div = $('fn_'+path);
	if (!div) return alert("Could not find DOM element: fn_" + path);
	
	// var size = basename(path).length;
	// if (size < 30) size = 30;
	// if (size > 50) size = 50;
	var size = 30;
	this.temp_rename_once = true;
	
	var html = '';
	html += '<form method="get" action="javascript:void(0)" onSubmit="return false" style="margin:0; padding:0;"><table cellspacing=0 cellpadding=0><tr>';
	html += '<td captureMouse="assetmgr_mouse_rename"><input id="fe_rename" maxlength="64" onEnter="do_rename()" class="file_object" style="background-color:white;" type=text size="'+size+'" value="'+basename(path)+'" style="font-size:12px;"></td>';
	html += '<td>' + spacer(5,1) + '</td>';
	// html += '<td>' + icon('x', '<font color=white>Cancel</font>', 'assetmgr.cancel_rename()') + '</td>';
	html += '<td><input type="button" value="Cancel" onClick="assetmgr.cancel_rename()"/></td>';
	html += '<td>' + spacer(5,1) + '</td>';
	// html += '<td>' + icon('check', '<font color=white>Accept</font>', 'assetmgr.do_rename()') + '</td>';
	html += '<td><input type="button" value="Accept" style="font-weight:bold" onClick="assetmgr.do_rename()"/></td>';
	html += '</tr></table></form>';
	div.innerHTML = html;
	
	// session.hooks.enter_key = 'do_rename';
	session.hooks.before_selection_change = 'cancel_rename';
	session.hooks.keys[ENTER_KEY] = [this, 'do_rename_enter_key']; // enter key
	session.hooks.keys[ESC_KEY] = [this, 'cancel_rename']; // escape key
	this.rename_active = true;
	
	div.setAttribute("onselectstart", "return true;");
	
	setTimeout( "assetmgr.setup_rename_ui()", 100 );
};

assetmgr.do_rename_enter_key = function() {
	setTimeout( 'assetmgr.do_rename()', 10 ); // rename in new thread
	return false; // STOP enter key event at all costs
};

assetmgr.setup_rename_ui = function() {
	var field = $('fe_rename');
	if (field) {
		try { field.focus(); } catch(e) {};
		field.onkeypress = delay_onChange_input_text;
	}
};

assetmgr.do_rename = function() {
	// initiate the rename
	if (!this.temp_rename_once) return;
	delete this.temp_rename_once;
	
	var path = first_key(this.selection);
	var parent_path = dirname(path) + '/';
	var filename = basename(path);
	this.temp_rename = $('fe_rename').value;
	
	if (this.temp_rename == filename) return this.cancel_rename(); // not changed
	if (!this.temp_rename.length) return this.cancel_rename(); // entered nothing, abort
	
	var result = this.validate_new_filename(this.temp_rename, this.is_folder(path));
	if (!(result === true)) {
		 // invalid name, but leave edit UI in place
		// session.hooks.enter_key = 'do_rename'; // restore hook
		alert(result);
		this.temp_rename_once = true;
		return;
	}
	
	// dupe check
	var obj = this.is_folder(path) ? this.get_folder_object(parent_path + this.temp_rename) : 
		this.get_file_object(parent_path + this.temp_rename);
	
	// case insensitive dupe check (thanks a lot, msie)
	if (!obj) {
		if (this.is_folder(path)) {
			var parent_folder = this.get_folder_object(parent_path);
			for (var subfolder_name in parent_folder) {
				if (subfolder_name.toString().toLowerCase() == this.temp_rename.toString().toLowerCase()) obj = 1;
			}
		}
		else {
			var metadata = this.folder_metadata[parent_path];
			if (metadata && metadata.Files && metadata.Files.File) {
				var items = always_array(metadata.Files.File);
				for (var idx = 0, len = items.length; idx < len; idx++) {
					var item = items[idx];
					if (item.Name.toString().toLowerCase() == this.temp_rename.toString().toLowerCase()) obj = 1;
				}
			}
		}
	}
	
	if (obj) {
		// invalid name, but leave edit UI in place
		// session.hooks.enter_key = 'do_rename'; // restore hook
		alert("Sorry, that "+(this.is_folder(path) ? 'folder' : 'file')+" already exists, please choose another name.");
		this.temp_rename_once = true;
		return;
	}
	
	// if renaming file, make sure has alphanumeric extension
	if (!this.is_folder(path) && !this.temp_rename.match(/\.\w+$/)) {
		alert("Sorry, that filename is not acceptable.  Filenames must contain a valid alphanumeric extension (jpg, mp3, etc.).");
		this.temp_rename_once = true;
		return;
	}
	
	// restore normal UI
	this.cancel_rename();
	
	show_progress_dialog(1, "Renaming "+(this.is_folder(path) ? 'folder' : 'file')+"...", false);
	
	this.update_folder_list( [this, 'do_rename_post_update'] );
};

assetmgr.do_rename_post_update = function() {	
	// run actions now
	var path = first_key(this.selection);
	var parent_path = dirname(path) + '/';
	var filename = basename(path);
	
	// $('fi_'+path).src = 'images/busy.gif';
	
	this.action_queue = [];
	
	if (this.is_folder(path)) {
		// Renaming folder...		
		// make sure we rename the datasets of all child folders too
		var re = new RegExp("^" + path.replace(/\//g, "\\/"));
		var folders = this.get_folder_list();
		
		for (var idx = 0, len = folders.length; idx < len; idx++) {
			if (folders[idx].indexOf(path) == 0) {
				var old_path = folders[idx];
				var new_path = old_path.replace(re, parent_path + this.temp_rename + '/');
				
				this.action_queue.push({
					asset_rename_folder: {
						GameID: this.game_id,
						OldPath: old_path,
						NewPath: new_path
					}
				});
			} // is affected folder
		} // foreach folder in list
	}
	else {
		// Renaming file...
		this.action_queue.push({
			asset_rename_file: {
				GameID: this.game_id,
				Path: parent_path,
				OldFilename: filename,
				NewFilename: this.temp_rename
			}
		});
	} // renaming file
	
	this.run_action_queue( [this, 'do_rename_2'] );
};

assetmgr.do_rename_2 = function() {
	// manipulate and save folder tree, if renaming folder
	var path = first_key(this.selection);
	var parent_path = dirname(path) + '/';
	
	if (this.is_folder(path)) {
		// modify the folder tree
		var folder = lookup_path( path, this.folder_tree ); // get ref to old folder node
		if (folder === null) return do_error("Cannot find original folder, may have been moved or deleted: " + path + ": Debug Info: " + serialize(this.folder_tree));
		
		delete_path_value( path, this.folder_tree ); // delete old folder
		set_path_value( parent_path + this.temp_rename, this.folder_tree, folder ); // install under new name
		this.save_folder_tree( [this, 'do_rename_3'] ); // save changes
	}
	else {
		// modify the in-memory JT for fast UI update
		var filename = basename(path);
		var parent_metadata = this.folder_metadata[ parent_path ];
		if (!parent_metadata) return alert("Could not locate metadata for: " + parent_path);
		
		var file = find_object( parent_metadata.Files.File, { Name: filename } );
		if (!file) return alert("Could not locate file: " + filename + " in metadata: " + parent_path);
		
		file.Name = this.temp_rename;
		
		this.do_rename_3( {Code:0} );
	}
};

assetmgr.do_rename_3 = function(response) {
	hide_progress_dialog();
	
	var path = first_key(this.selection);
	var parent_path = dirname(path) + '/';
	
	if (this.is_folder(path)) {
		// renamed folder, must refresh everything
		this.selection = {};
		this.selection[ parent_path + this.temp_rename + '/' ] = 1;
		
		// if any open folders were part of the rename, need to change those
		var re = new RegExp("^" + path.replace(/\//g, "\\/"));
		for (var key in this.open_folders) {
			if (key.indexOf(path) == 0) {
				var old_path = key;
				var new_path = old_path.replace(re, parent_path + this.temp_rename + '/');
				delete this.open_folders[old_path];
				this.open_folders[new_path] = 1;
			} // is child of selected folder
		}
		
		user_storage_mark();
		this.refresh_folder_list_fast();
	}
	else {
		// renamed file, only need to refresh parent folder
		this.selection = {};
		this.selection[ parent_path + this.temp_rename ] = 1;
		
		// delete session.folder_metadata[parent_path];
		$('df_'+parent_path).innerHTML = '';
		
		if (this.force_full_refresh) this.refresh_folder_list_fast();
		else this.set_folder_view(parent_path, true);
	}
	
	this.update_floater();
	
	show_glog_widget();
};

assetmgr.cancel_rename = function() {
	// cancel rename UI and restore original file name
	session.hooks.before_selection_change = null;
	delete session.hooks.keys[ESC_KEY];
	delete session.hooks.keys[ENTER_KEY];
	this.rename_active = false;
	
	var path = first_key(this.selection);
	var div = $('fn_'+path);
	if (!div) return alert("Could not find DOM element: fn_" + path);
	
	var filename = basename(path);
	div.innerHTML = '<nobr>' + (this.is_folder(path) ? ('<b>'+filename+'</b>') : filename) + '</nobr>';
	
	div.setAttribute("onselectstart", "return false;");
	div.onselectstart = "return false;";
};
