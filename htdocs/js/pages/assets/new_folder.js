// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

assetmgr.do_new_folder = function(path) {
	// create new untitled folder and allow user to rename
	fire_hook('before_selection_change');
	
	if (!path) {
		// get path from selection
		path = this.get_enclosing_folder();
	}
	this.new_folder_path = path;
	
	if (count_chars(path, '/') > 10)
		return do_error("You cannot nest folders over 10 levels deep.");
	
	show_progress_dialog(1, "One moment please...", false);
	this.update_folder_list( [this, 'do_new_folder_post_update'] );
};

assetmgr.do_new_folder_post_update = function() {
	var path = this.new_folder_path;
	var subfolder_name = 'untitled';
	var ext = 1;
	var folder = this.get_folder_object(path);
	if (!folder) return do_error("Cannot find the target folder: " + path);
	
	while (typeof(folder[subfolder_name + ext]) != 'undefined') {
		ext++;
	}
	subfolder_name += ext;
	
	// create folder
	folder[subfolder_name] = {};
	
	// set selection to our folder
	this.selection = {};
	this.selection[ path + subfolder_name + '/' ] = 1;
	
	// make sure the parent folder is open
	this.open_folders[ path ] = 1;
		
	effect_api_send('asset_create_folder', {
		GameID: this.game_id,
		Path: path.replace(/\/$/, '') + '/' + subfolder_name
	}, [this, 'do_new_folder_2'], {});
	// this.do_new_folder_2();
};

assetmgr.do_new_folder_2 = function(response) {
	// got good response from create, so save our folder tree
	setTimeout( 'assetmgr.save_folder_tree([assetmgr,"do_new_folder_3"])', 10 );
};

assetmgr.do_new_folder_3 = function() {
	// folder tree saved, now refresh the display so the new folder shows up
	this.refresh_folder_list_fast( [this, 'do_new_folder_4'] );
};

assetmgr.do_new_folder_4 = function() {
	// DOM should be refreshed at this point, so we can rename the folder
	hide_progress_dialog();
	this.update_floater();
	this.rename_file();
	show_glog_widget();
};
