// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

assetmgr.upload_complete = function() {
	// upload complete, check for error, then refresh directory
	Debug.trace('assets', "Upload is complete");
	session.upload_in_progress = 0;
	update_progress_dialog(1.0);
	
	/* effect_api_send('user_get', {
		Username: session.username
	}, [this, 'check_upload_error']); */
	
	effect_api_mod_touch('asset_file_list_get');
	effect_api_get('asset_file_list_get', { 
		id: this.game_id,
		path: this.upload_path
	}, [this, 'check_upload_error'], { } );
	
	show_glog_widget();
};

assetmgr.check_upload_error = function(response, tx) {
	// check for error embedded in metadata
	hide_progress_dialog();
	
	if (response.Data.LastUploadError) {
		do_error( "Failed to upload file: " + response.Data.LastUploadError );
	}
	
	// regardless of error or not, always refresh folder contents
	// (may have been partial success)
	if (this.open_folders[this.upload_path]) {
		this.fetch_file_list_2(response.Data, this.upload_path);
	}
	else {
		this.folder_metadata[this.upload_path] = response.Data;
		if (!this.set_folder_view(this.upload_path, true)) {
			this.fetch_file_list_2(response.Data, this.upload_path);
		}
	}
};

assetmgr.upload_sync_with_selection = function() {
	// keep upload control in sync with current enclosing folder
	if (zero_client) {
		var path = this.get_enclosing_folder();
		this.upload_path = path;
		
		var url = '/effect/api/asset_file_upload?game_id=' + this.game_id + '&path=' + path;
		
		if (url.indexOf('?') > -1) url += '&'; else url += '?';
		url += 'session=' + session.cookie.get('effect_session_id');
		
		zero_client.setURL( url );
	}
};

assetmgr.upload_glue = function() {
	// glue upload floater to position of button
	if ($('td_assetmgr_upload')) {
		if (!zero_client || !zero_client.div) {
			// zero_client.glue('td_assetmgr_upload');
			prep_upload('td_assetmgr_upload', '', [this, 'upload_complete'], 
				['Asset Files', '*.jpg;*.jpe;*.jpeg;*.gif;*.png;*.mp3;*.ogg;*.xml;*.mp4;*.m4v;*.ttf;*.otf;*.js'] );
			this.upload_sync_with_selection();
		}
		else {
			zero_client.reposition('td_assetmgr_upload');
		}
	}
};

assetmgr.upload_catch_missing_button = function() {
	// catch button click when flash movie is not yeager
	assetmgr.upload_glue();
};
