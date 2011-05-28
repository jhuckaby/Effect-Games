// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

assetmgr.get_enclosing_folder = function() {
	// get path of enclosing folder given current selection
	// if selection is multiple, try to find common folder
	// if selection is folder, return that folder (not the enlosing one)
	var path = '';
	var num_selected = num_keys(this.selection);
	if (!num_selected) path = '/';
	else if (num_selected > 1) {
		// more than 1 item selected, try to find common enclosing folder
		var folders = {};
		for (var sel_path in this.selection) {
			if (this.is_folder(sel_path)) folders[sel_path] = 1;
			else folders[ dirname(sel_path) + '/' ] = 1;
		}
		if (num_keys(folders) == 1) {
			path = first_key(folders);
		}
		else path = '/';
	}
	else {
		path = first_key(this.selection);
		
		// path may be pointing at a file, not a directory
		if (!path.match(/\/$/)) path = dirname(path) + '/';
	}
	return path;
};

assetmgr.validate_new_filename = function(filename, folder_mode) {
	if (!filename || (filename == 0)) return( "Sorry, that name is not acceptable.  Please choose another.");
	
	if (folder_mode) {
		if (((filename.length <= 2) && !filename.match(/^\w+$/)) || 
			((filename.length > 2) && !filename.match(/^\w[\w\-]*\w$/))) {
			return( "Sorry, that folder name is not acceptable.  Please use only A-Z, a-z, 0-9, underscore (_), and dash (-).  The name must also begin and end with an alphanumeric character or underscore." );
		} // illegal chars
	}
	else {
		if (((filename.length <= 2) && !filename.match(/^\w+$/)) || 
			((filename.length > 2) && !filename.match(/^\w[\w\-\.]*\w$/))) {
			return( "Sorry, that name is not acceptable.  Please use only A-Z, a-z, 0-9, underscore (_), dash (-) and period (.).  The name must also begin and end with an alphanumeric character or underscore." );
		} // illegal chars
	}
	
	if (filename.length > 255) {
		return( "Yeah, you're just asking for trouble with this name.  Please limit names to a SANE amount of characters (255 or less)." );
	}
	
	return true;
};

assetmgr.save_folder_tree = function(callback) {
	// write folder tree back to data api
	if (!callback) callback = [this, 'save_folder_tree_2'];
	
	// save mod date in session so we can tell if anyone else overwrote us
	this.last_folder_save = hires_time_now();
	
	effect_api_send('asset_store_folder_data', {
		GameID: this.game_id,
		Data: {
			FolderList: this.folder_tree,
			LastUpdate: this.last_folder_save,
			LastUser: session.username
		}
	}, callback, {});
};

assetmgr.save_folder_tree_2 = function(response) {
	this.refresh_folder_list();
};

assetmgr.fetch_file_list = function(path, instant) {
	// fetch metadata for path, and render file list
	if (instant) instant = 1; else instant = 0;
	
	if (typeof(this.folder_metadata[path]) != 'undefined') {
		// cached
		this.fetch_file_list_2(this.folder_metadata[path], path, instant);
		return;
	}
	
	$('fi_'+path).src = 'images/busy.gif';
	
	effect_api_get('asset_file_list_get', { 
		id: this.game_id,
		path: path
	}, [this, 'receive_file_list'], { _path: path, _instant: instant });
	
	/* var url = protocol + hostnames['Cache'] + '/abc/assets/' + session.account_name + path;
	url += '?format=js&metadata=0&onafter=fetch_file_list_2(jobticket,%22'+path+'%22)&onerror=fetch_file_list_2(null,%22'+path+'%22,'+instant+')';
	load_script( url ); */
};

function assetmgr_file_sort(a, b) {
	// sort jobticket sources by baseproduct
	return( (b.Name.toString().toLowerCase() < a.Name.toString().toLowerCase()) ? 1 : -1 );
}

assetmgr.receive_file_list = function(response, tx) {
	if (response.Data) {
		this.fetch_file_list_2( response.Data, tx._path );
	}
	else {
		this.fetch_file_list_2( null, tx._path, tx._instant );
	}
};

assetmgr.fetch_file_list_2 = function(metadata, path, instant) {
	// receive file list from server
	if (!metadata) metadata = {};
	this.folder_metadata[path] = metadata;
	
	if (!metadata.Files) metadata.Files = {};
	if (!metadata.Files.File) metadata.Files.File = [];
	
	var num_files = 0;
	
	if (metadata && metadata.Files && metadata.Files.File) {
		always_array(metadata.Files, 'File');
		
		// sort alphabetically by filename
		metadata.Files.File = metadata.Files.File.sort( assetmgr_file_sort );
				
		var html = '';
		for (var idx = 0, len = metadata.Files.File.length; idx < len; idx++) {
			var file = metadata.Files.File[idx];
			var filename = file.Name;
			var file_path = path + filename;
			var class_name = this.selection[file_path] ? 'file_object_selected' : 'file_object';
			html += '<div class="'+class_name+'" id="file_'+file_path+'" am_path="'+file_path+'" captureMouse="assetmgr_mouse_file">';
			html += '<table cellspacing=0 cellpadding=0><tr>';
			
			html += '<td style="padding:0px" id="fl_'+file_path+'" width=16>';
			html += spacer(16,1);
			html += '</td>';
			
			html += '<td style="padding:0px" width=16>' + get_icon_for(filename, 'fi_'+file_path) + '</td><td style="padding:0px" width=4>' + spacer(4,1) + '</td>';
			html += '<td style="padding:0px" id="fn_'+file_path+'" onselectstart="return false"><nobr>'+filename+'</nobr></td>';
			html += '</tr></table></div>';
			num_files++;
		} // foreach file
		
		var df_div = $('df_'+path);
		df_div.style.display = num_files ? '' : 'none';
		
		// var div = $('dc_'+path);
		
		/*if (!$('df_'+path).innerHTML.length && session.open_folders[path] && div._state) {
			div.style.height = '' + div._height + 'px';
			setTimeout( "resume_folder_animate('dc_"+path+"')", 10 );
		}*/
		
		if (!df_div.innerHTML.length && this.open_folders[path]) {
			if (this.global_animate_folders && (num_files <= this.max_animated_items_in_folder) && !instant)
				setTimeout( "assetmgr.animate_folder_visibility( 'dc_"+path+"', true );", 10 );
			else
				set_section_visibility( 'dc_' + path, true );
		}
		
		df_div.innerHTML = html;
	}
	else $('df_'+path).style.display = 'none';
		
	if (path != '/') $('fi_'+path).src = images_uri + '/icons/' + (this.open_folders[path] ? 'folder_open' : 'folder') + '.png';
	else {
		$('fi_'+path).src = images_uri + '/icons/house.png';
	}
};

assetmgr.get_folder_object = function(path) {
	// get folder object in folder tree given path
	var folder = lookup_path( path, this.folder_tree );
	if (folder === "") {
		// empty folders are empty strings in folder tree -- convert to hashish
		var parent_path = dirname(path) + '/';
		var folder_name = basename(path);
		var parent_folder = lookup_path( parent_path, this.folder_tree );
		if (!parent_folder) return null;
		parent_folder[ folder_name ] = {};
		folder = parent_folder[ folder_name ];
	}
	return folder;
};

assetmgr.get_folder_params = function(path) {
	// get folder params given path
	var folder = this.get_folder_object(path);
	if (!folder._Attribs) folder._Attribs = {};
	return folder._Attribs;
};

assetmgr.get_file_object = function(path) {
	// locate file object from JOBTICKET given path
	var parent_path = dirname(path) + '/';
	var filename = basename(path);
	var metadata = this.folder_metadata[parent_path];
	if (!metadata) return null;
	
	if (!metadata.Files || !metadata.Files.File) return null;
	
	var obj = find_object( metadata.Files.File, { Name: filename } );
	if (!obj) return null;
	
	return obj;
};

assetmgr.get_file_params = function(path) {
	// locate file Parameters hash from metadata source
	var file = this.get_file_object(path);
	return file;
};

assetmgr.is_folder = function(path) {
	// determine if path is folder (trailing slash)
	return !!path.match(/\/$/);
};

assetmgr.is_binary = function(path) {
	// poor man's binary file check
	return !path.match(/\.(xml|xls|dtd|js|txt|html|pl|pm|php|c|h|cpp|hpp|csv)$/i);
};

assetmgr.get_folder_list = function(tree, parent_path) {
	// walk folder tree and construct simple array of paths to all folders
	var folders = [];
	if (!tree) {
		tree = this.folder_tree;
		folders.push('/');
		parent_path = '/';
	}
	
	var sorted_keys = hash_keys_to_array(tree).sort();
	for (var idx = 0, len = sorted_keys.length; idx < len; idx++) {
		var key = sorted_keys[idx];
		if (key != '_Attribs') {
			folders.push( parent_path + key + '/' );
			if (isa_hash(tree[key])) {
				var subfolders = this.get_folder_list(tree[key], parent_path + key + '/');
				for (var idy = 0, leny = subfolders.length; idy < leny; idy++) {
					folders.push( subfolders[idy] );
				}
			} // is hash
		} // not _Attribs
	} // foreach key in tree
	
	return folders;
};

assetmgr.cleanup_selection = function(selection) {
	// make sure selection doesn't contain any files and their parent folders
	if (!selection) selection = this.selection;
	
	for (var path in selection) {
		if (this.is_folder(path)) {
			for (var path2 in selection) {
				if (!this.is_folder(path2) && (path2.indexOf(path) == 0)) {
					delete selection[path2];
				}
			} // inner
		} // is folder
	} // outer
	
	// if any folders are selected, make sure we get all the subfolders too
	var folders = this.get_folder_list();
	for (var path in selection) {
		if (this.is_folder(path)) {
			for (var idx = 0, len = folders.length; idx < len; idx++) {
				if (folders[idx].indexOf(path) == 0) {
					selection[ folders[idx] ] = 1;
				}
			}
		} // is folder
	} // outer
};

assetmgr.run_action_queue = function(callback) {
	// execute queue of actions, and fire callback when all is done
	if (callback) {
		this.action_queue_callback = callback;
		this.action_queue_length = this.action_queue.length;
		session.progress.remain_disp = 1;
		session.progress.start_time = hires_time_now();
	}
		
	if (this.action_queue && this.action_queue.length) {
		var action = this.action_queue.shift();
		
		var cmd_name = first_key(action);
		var cmd = action[cmd_name];
		
		effect_api_send(cmd_name, cmd, [this, 'run_action_queue_2'], { } );
	}
	else {
		// queue is empty, fire callback
		if (this.action_queue_callback) fire_callback( this.action_queue_callback );		
		else alert("Cannot find callback function: " + this.action_queue_callback);
	}
};

assetmgr.run_action_queue_2 = function(response) {
	// continue action queue in new thread, to be safe
	// (this thread was invoked from the IFRAME, so we want it to die off first)
	if (this.action_queue_length) {
		var counter = (this.action_queue_length - this.action_queue.length) / this.action_queue_length;
		update_progress_dialog(counter);
	}
	setTimeout( 'assetmgr.run_action_queue()', 10 );
};

assetmgr.populate_load_queue = function(selection) {
	// populate load queue with selection, and all subfolders
	// the load queue simply loads the metadata for all folders in selection
	var folders = this.get_folder_list();
	for (var path in selection) {
		if (this.is_folder(path)) {
			this.load_queue[ path ] = 1;
			for (var idx = 0, len = folders.length; idx < len; idx++) {
				var path2 = folders[idx];
				if (path2.indexOf(path) == 0) this.load_queue[path2] = 1;
			}
		}
		else {
			this.load_queue[ dirname(path) + '/' ] = 1;
		}
	}
};

assetmgr.run_load_queue = function(callback) {
	// load a set of metadata, and fire fallback when all are loaded
	if (callback) this.lq_callback = callback;
	
	var path = first_key( this.load_queue );
	if (path) {
		delete this.load_queue[path]; // remove from queue
		
		if (this.folder_metadata[path]) {
			// already loaded, skip to next task
			this.run_load_queue();
		}
		else {
			effect_api_get('asset_file_list_get', { 
				id: this.game_id,
				path: path
			}, [this, 'run_load_queue_receive'], { _path: path });
			
			/* var url = protocol + hostnames['Cache'] + '/abc/assets/' + session.account_name + path;
			url += '?format=js&metadata=0&onafter=run_load_queue_2(jobticket,%22'+path+'%22)&onerror=run_load_queue_2(null,%22'+path+'%22)';
			load_script( url ); */
		}
	}
	else {
		// no more items to load, fire callback
		if (this.lq_callback) fire_callback(this.lq_callback);
	}
};

assetmgr.run_load_queue_receive = function(response, tx) {
	if (response.Data) {
		this.run_load_queue_2( response.Data, tx._path );
	}
	else {
		this.run_load_queue_2( null, tx._path );
	}
};

assetmgr.run_load_queue_2 = function(metadata, path) {
	// receive response from metadata load
	if (!metadata) metadata = {};
	this.folder_metadata[path] = metadata;
	this.run_load_queue();
};
