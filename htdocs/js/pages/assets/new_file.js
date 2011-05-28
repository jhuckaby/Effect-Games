// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

assetmgr.do_new_file = function(ext) {
	// create new untitled folder and allow user to rename
	fire_hook('before_selection_change');
	
	var path = this.get_enclosing_folder();
	this.new_file_path = path;
	this.new_file_ext = ext;
	
	show_progress_dialog(1, "One moment please...", false);
	
	if (typeof(this.folder_metadata[path]) != 'undefined') {
		// cached
		this.do_new_file_2(this.folder_metadata[path], null);
		return;
	}
		
	effect_api_get('asset_file_list_get', { 
		id: this.game_id,
		path: path
	}, [this, 'do_new_file_2'], {  });
};

assetmgr.do_new_file_2 = function(response, tx) {
	var metadata = tx ? response.Data : response;
	if (!metadata) metadata = {};
	
	var path = this.new_file_path;
	var ext = this.new_file_ext;
	var filename = 'untitled';
	var num = 1;
	
	this.folder_metadata[path] = metadata;
	
	if (!metadata.Files) metadata.Files = {};
	if (!metadata.Files.File) metadata.Files.File = [];
	else always_array(metadata.Files, 'File');
	
	while (find_object(metadata.Files.File, { Name: filename + num + '.' + ext })) {
		num++;
	}
	
	filename += num + '.' + ext;
	
	var content = '';
	switch (ext) {
		case 'js':
			content += '/'+'/ ' + $P().game.Title + "\n";
			content += '/'+'/ Created ' + get_nice_date_time( time_now(), true ) + "\n";
			content += '/'+'/ Copyright (c) ' + yyyy() + ' ' + session.user.FullName + "\n\n";
			break;
		
		case 'xml':
			content += '<?xml version="1.0"?>' + "\n";
			// content += '<!-- ' + $P().game.Title + ' -->' + "\n";
			content += '<XML>' + "\n";
			content += "\t<Something></Something>\n";
			content += '</XML>' + "\n";
			break;
	}
	
	// set selection to our file
	for (var sel_path in this.selection) {
		this.deselect_file(sel_path);
	}
	this.selection = {};
	this.selection[ path + filename ] = 1;
	
	// make sure the parent folder is open
	this.open_folders[ path ] = 1;
	
	// force the new file into the list
	metadata.Files.File.push({
		Created: time_now(),
		Modified: time_now(),
		Username: session.username,
		Name: filename,
		Size: content.length
	});
	
	// sort the list
	metadata.Files.File = metadata.Files.File.sort( assetmgr_file_sort );
		
	effect_api_send('asset_save_file_contents', {
		GameID: this.game_id,
		Path: path,
		Filename: filename,
		Content: content,
		Create: 1
	}, [this, 'do_new_file_3'], {});
};

assetmgr.do_new_file_3 = function() {
	// folder tree saved, now refresh the display so the new folder shows up
	// this.refresh_folder_list_fast( [this, 'do_new_file_4'] );
	this.fetch_file_list( this.new_file_path, true );
	setTimeout( 'assetmgr.do_new_file_4()', 1 );
};

assetmgr.do_new_file_4 = function() {
	// DOM should be refreshed at this point, so we can rename the folder
	hide_progress_dialog();
	this.update_floater();
	this.rename_file();
};
