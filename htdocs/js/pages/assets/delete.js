// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

assetmgr.delete_files = function() {
	// delete files and/or folders
	fire_hook('before_selection_change');
	
	// count selected BEFORE cleanup, so the user doesn't get confused at the prompt
	var num_selected = num_keys(this.selection);
	
	this.cleanup_selection();

	// prompt user for confirmation
	var msg = '';
	if (num_selected == 1) {
		var path = first_key(this.selection);
		var filename = basename(path);
		var type = this.is_folder(path) ? 'folder' : 'file';
		msg = "Are you sure you want to permanently delete the " + type + ' "' + filename + '"?';
	}
	else {
		msg = "Are you sure you want to permanently delete the " + num_selected + " selected items?";
	}
	if (!confirm(msg)) return;
	
	show_progress_dialog(1, "Preparing to delete...", false);
	this.update_folder_list( [this, 'delete_files_post_update'] );
};

assetmgr.delete_files_post_update = function() {
	var num_selected = num_keys(this.selection);
	
	this.action_queue = [];
	this.queue_deletes(this.selection);
	
	// first, make changes to folder tree, if applicable
	var need_save = false;
	for (var path in this.selection) {
		if (this.is_folder(path)) need_save = true;
	}
	
	update_progress_dialog(1, "Deleting " + num_selected + " " + pluralize("item", num_selected) + "...");
	if (need_save) this.save_folder_tree( [this, 'delete_files_2'] );
	else this.delete_files_2({Code:0});
};

assetmgr.queue_deletes = function(selection) {
	// analyze selection, converting to set of data sets and/or files
	// and queue up delete operations in session.action_queue
	// also makes changes to folder tree and in-memory metadata
	var datasets = {};
	
	for (var path in selection) {
		if (this.is_folder(path)) {
			// delete entire mediaset
			datasets[path] = 1;
			delete_path_value(path, this.folder_tree);
		}
		else {
			// delete selected files from mediaset
			var parent_path = dirname(path) + '/';
			var filename = basename(path);
			if (!datasets[parent_path]) datasets[parent_path] = {};
			datasets[parent_path][filename] = 1;
			
			// remove file from in-memory JT for fast UI update
			var parent_metadata = this.folder_metadata[ parent_path ];
			if (!parent_metadata) return alert("Could not locate metadata for: " + parent_path);
			
			var file_idx = parseInt( find_object_idx( parent_metadata.Files.File, { Name: filename } ), 10 );
			if (file_idx == -1) return alert("Could not locate file: " + filename + " in metadata: " + parent_path);
			parent_metadata.Files.File.splice( file_idx, 1 );
		}
	} // foreach path selected
	
	for (var path in datasets) {
		if (isa_hash(datasets[path])) {
			// delete individual files from mediaset
			var items = [];
			for (var filename in datasets[path]) {
				items.push( filename );
			}
			
			this.action_queue.push({
				asset_delete_files: {
					GameID: this.game_id,
					Path: path,
					Files: { File: items }
				}
			});
		}
		else {
			// delete entire mediaset
			this.action_queue.push({
				asset_delete_folder: {
					GameID: this.game_id,
					Path: path
				}
			});
		}
	}
};

assetmgr.delete_files_2 = function(response) {
	// run queue of operations
	this.run_action_queue( [this, 'delete_files_3'] );
};

assetmgr.delete_files_3 = function() {
	// finished with delete, refresh affected sections
	hide_progress_dialog();
	
	var has_folders = false;
	for (var path in this.selection) {
		if (this.is_folder(path)) {
			has_folders = true;
			
			// remove deleted folders (and child folders) from the open_folders list
			for (var path2 in this.open_folders) {
				if (path2.indexOf(path) == 0) delete this.open_folders[path2];
			}
			
			// and the folder metadata cache
			for (var path2 in this.folder_metadata) {
				if (path2.indexOf(path) == 0) delete this.folder_metadata[path2];
			}
		}
	}
	
	if (has_folders || this.force_full_refresh) {
		// selection contained folders, so just refresh everything
		this.selection = {};
		this.refresh_folder_list_fast();
	}
	else {
		// selection contained files only, so only refresh parent folders
		var affected_folders = {};
		for (var path in this.selection) {
			affected_folders[ dirname(path) + '/' ] = 1;
		}
		
		this.selection = {};
		
		for (var path in affected_folders) {
			// delete session.folder_metadata[path];
			$('df_'+path).innerHTML = '';
			this.set_folder_view(path, true);
		}
	}
	
	this.update_floater();
	
	show_glog_widget();
};
