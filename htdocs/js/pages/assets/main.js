// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

assetmgr.global_animate_folders = !ie6 && !(ff && mac);
assetmgr.max_animated_items_in_folder = 50;
assetmgr.yes_delete = 1;

assetmgr.init = function(game_id) {
	this.game_id = game_id;
	
	this.open_folders = { '/': 1 };
	this.folder_metadata = {};
	this.selection = {};
	
	// recover settings from storage
	if (!session.storage.games) session.storage.games = {};
	var games = session.storage.games;
	
	// game specific prefs
	if (!games[this.game_id]) games[this.game_id] = {};
	this.game_prefs = games[this.game_id];
	
	// restore open folders
	if (!this.game_prefs.open_folders) this.game_prefs.open_folders = this.open_folders;
	else this.open_folders = this.game_prefs.open_folders;
	this.open_folders['/'] = 1; // root is always open on launch
	
	this.refresh_folder_list();
	this.update_floater();
	
	// setup mouse capture for main area
	$('assetmgr_main').setAttribute('captureMouse', 'assetmgr_mouse_main_area');
	
	// this.animate_floater();
};

assetmgr.update_floater = function() {
	// show info in floater based on selection
	var button_style_args = {'width':'80px'};
	var html = '';
	html += '<center><table>';
	
	var num_selected = num_keys(this.selection);
	if (num_selected) {
		html += '<tr><td><nobr><span class="info_title">'+num_selected+' item';
		if (num_selected > 1) html += 's';
		html += ' selected:</span></nobr>';
		
		var has_folders = false;
		
		for (var path in this.selection) {
			if (this.is_folder(path)) has_folders = true;
		}
		
		if ((num_selected == 1) && !has_folders) {
			// single file selected, show lots of info
			html += '<br>' + spacer(1,5) + '<br>';
			html += '<span class="info_text">';
			var source = this.get_file_object( first_key(this.selection) );
			
			var size = source.Size;
			if (!size) size = 0;
			html += '<nobr><b>Size:</b> ' + get_text_from_bytes(size) + '</nobr><br>';
			
			html += '<nobr><b>Created:</b> <span style="cursor:default" title="'+get_nice_date_time(source.Created)+'">' + mm_dd_yyyy(source.Created) + '</span></nobr><br>';
			html += '<nobr><b>Modified:</b> <span style="cursor:default" title="'+get_nice_date_time(source.Modified)+'">' + mm_dd_yyyy(source.Modified) + '</span></nobr><br>';
			
			var username = source.Username;
			html += '<nobr><b>User:</b> <a href="#User/'+username+'">' + username + '</a></nobr>';
			html += '</span>';
		}
		else if (!has_folders) {
			// multiple files selected, show total size
			var total = 0;
			for (var path in this.selection) {
				var source = this.get_file_object(path);
				if (source) {
					var size = parseInt( source.Size, 10 );
					if (size) total += size;
				}
			}
			html += '<br><span class="info_text">' + get_text_from_bytes(total) + ' total</span>';
		}
		
		html += '</td></tr>';
		html += '<tr><td height=5>'+spacer(1,1)+'</td></tr>';
		
		/* if (num_selected == 1) {
			html += '<tr><td>';
			if (this.clip_contents == first_key(this.selection)) {
				html += '<div class="button_msg">(Link copied)</div>';
			}
			else {
				html += large_icon_button('page_white_paste.png', 'Copy Link', 'assetmgr.copy_clip()', '', button_style_args) + '<div class="clear"></div>';
			}
			html += '</td></tr>';
		} */
		
		if ((num_selected == 1) && !this.is_folder(first_key(this.selection))) {
			// only show Copy+View+Download buttons if selection is single, and NOT a folder
			html += '<tr><td>' + large_icon_button('zoom.png', 'View', 'assetmgr.view_file()', '', button_style_args) + '<div class="clear"></div></td></tr>';
			
			var path = first_key(this.selection);
			
			if (!this.is_binary(path)) {
				html += '<tr><td>' + large_icon_button('page_white_edit.png', 'Edit...', 'assetmgr.edit_file()', '', button_style_args) + '<div class="clear"></div></td></tr>';
			}
			
			html += '<tr><td>' + large_icon_button('disk.png', 'Download', 'assetmgr.download_file()', '', button_style_args) + '<div class="clear"></div></td></tr>';
		}
		if ((num_selected == 1) && this.is_folder(first_key(this.selection))) {
			// one single folder selected, show archive/download button
			html += '<tr><td>' + large_icon_button('compress.png', 'Download', 'assetmgr.download_folder()', '', button_style_args) + '<div class="clear"></div></td></tr>';
		}
		
		html += '<tr><td>' + large_icon_button('trash', 'Delete', 'assetmgr.delete_files()', '', button_style_args) + '<div class="clear"></div></td></tr>';
		
		// only show rename if single item selected
		if (num_selected == 1) {
			html += '<tr><td>' + large_icon_button('page_white_edit.png', 'Rename...', 'assetmgr.rename_file()', '', button_style_args) + '<div class="clear"></div></td></tr>';
		}
		
		html += '<tr><td>' + large_icon_button('page_white_copy.png', 'Move/Copy...', 'assetmgr.copy_files()', '', button_style_args) + '</td></tr>';
		
		html += '<tr><td>' + large_icon_button('controller_add.png', 'Transfer to...', 'assetmgr.transfer_files()', '', button_style_args) + '</td></tr>';
	}
	else html += '<tr><td><nobr>(No items selected)</nobr></td></tr>';
	
	html += '<tr><td height=15><hr width="80%"></td></tr>';
	
	// html += '<tr><td class="flash_floater" id="td_assetmgr_upload">' + icon('menu_contract', 'Upload Files...', 'assetmgr.upload_catch_missing_button()') + '</td></tr>';
	html += '<tr><td>' + large_icon_button('page_white_upload.png', 'Upload Files...', 'upload_basic()', 'td_assetmgr_upload', button_style_args) + '<div class="clear"></div></td></tr>';
	
	if ((num_selected == 1) && (first_key(this.selection).match(/^\/src\//))) {
		html += '<tr><td>' + large_icon_button('page_white_text_add.png', 'New File...', "assetmgr.do_new_file('js')", '', button_style_args) + '<div class="clear"></div></td></tr>';
	}
	else if ((num_selected == 1) && (first_key(this.selection).match(/^\/text\//))) {
		html += '<tr><td>' + large_icon_button('page_white_text_add.png', 'New File...', "assetmgr.do_new_file('xml')", '', button_style_args) + '<div class="clear"></div></td></tr>';
	}
	
	html += '<tr><td>' + large_icon_button('folder_add.png', 'New Folder...', 'assetmgr.do_new_folder()', '', button_style_args) + '<div class="clear"></div></td></tr>';
	
	if (!num_selected) {
		html += '<tr><td>' + large_icon_button('compress.png', 'Download All', 'assetmgr.download_folder()', '', button_style_args) + '<div class="clear"></div></td></tr>';
	}
	
	html += '</table></center>';
	$('assetmgr_floater').innerHTML = html;
	
	// keep uploader in sync with current enclosing folder
	this.upload_sync_with_selection();
	
	// position floating upload button in correct location
	setTimeout( 'assetmgr.upload_glue();', 1 );
};

assetmgr.update_folder_list = function(callback) {
	// keep folder list up to date, in case another user is editing at the same time
	if (callback) this.ufl_callback = callback;
	else this.ufl_callback = '';
	
	effect_api_get('asset_folder_tree_get', { 
		id: this.game_id
	}, [this, 'update_folder_list_2'], {});
};

assetmgr.update_folder_list_2 = function(response) {
	// receive response from server
	if (response.Code != 0) {
		return do_error("ERROR: Cannot load folder tree: " + response.Description);
	}
	
	// determine if folder tree was modified since our last load
	var mod_date = lookup_path('/Data/LastUpdate', response);
	if (!mod_date) mod_date = 0;
	if (mod_date != this.last_folder_save) this.force_full_refresh = true;
	else this.force_full_refresh = false;
	
	this.last_folder_save = mod_date;
	
	var ftree = lookup_path('/Data/FolderList', response);
	if (!ftree) ftree = {}; // first time use
	this.folder_tree = ftree ? ftree : {};
	
	if (this.ufl_callback) fire_callback(this.ufl_callback);
};

assetmgr.refresh_folder_list = function(callback) {
	// load folder list and refresh display
	if (callback) this.rfl_callback = callback;
	else this.rfl_callback = '';
		
	$('assetmgr_main').innerHTML = busy();
	
	effect_api_get('asset_folder_tree_get', { 
		id: this.game_id
	}, [this, 'refresh_folder_list_2'], {});
};

assetmgr.refresh_folder_list_fast = function(callback) {
	// reload folder list quickly, using cached metadata
	if (callback) this.rfl_callback = callback;
	else this.rfl_callback = '';
	
	this.refresh_folder_list_2({ Code: 0, Data: { FolderList: this.folder_tree } }, 1);
};

assetmgr.refresh_folder_list_2 = function(response, use_cache) {
	// receive response from server
	if (response.Code != 0) {
		return do_error("ERROR: Cannot load folder tree: " + response.Description);
	}
	if (use_cache) use_cache = 1; else use_cache = 0;
	
	if (!use_cache) {
		// actually loaded from server, so refresh last_folder_save
		this.last_folder_save = lookup_path('/Data/LastUpdate', response);
		if (!this.last_folder_save) this.last_folder_save = 0;
	}
	
	var html = '';
	html += this.render_folder_control('/');
	html += '<div class="folder_contents" id="dc_/" style="display:block;">';
	
	var ftree = lookup_path('/Data/FolderList', response);
	if (!ftree) ftree = {}; // first time use
	
	html += this.render_folder_structure( ftree, '/' );
	
	html += '</div>';
	$('assetmgr_main').innerHTML = html;
	
	this.folder_tree = ftree ? ftree : {};
	
	// wait for DOM elements to show up
	if (this.rfl_callback) setTimeout( 'fire_callback(assetmgr.rfl_callback);', 1 );
	setTimeout( 'assetmgr.refresh_open_folders('+use_cache+')', 1 );
};

function assetmgr_mouse_folder(type, e, pt) {
	// mouse action on folder
	switch (type) {
		case 'mouseDown': break;
		case 'mouseMove': break;
		case 'mouseUp': break;
		case 'click': assetmgr.click_file( this.getAttribute('am_path') ); break;
		case 'doubleClick': assetmgr.toggle_folder_view( this.getAttribute('am_path') ); break;
	}
	return false; // stop event
};

function assetmgr_mouse_folder_control(type, e, pt) {
	switch (type) {
		case 'click': assetmgr.toggle_folder_view( this.getAttribute('am_path') ); break;
		case 'doubleClick': assetmgr.toggle_folder_view( this.getAttribute('am_path') ); break;
	}
	return false;
};

assetmgr.render_folder_control = function(path, folder) {
	// render folder icon plus control (+/-) plus name
	var id = 'dc_' + path;
	var icon_name = 'folder.png';
	var folder_name = path.replace(/\/$/, '').replace(/^.*\/([^\/]+)$/, '$1');
	if (!folder_name) {
		// root level
		folder_name = 'Home';
		icon_name = 'house.png';
	}
	
	var class_name = this.selection[path] ? 'file_object_selected' : 'file_object';
		
	var html = '';
	html += '<div class="'+class_name+'" id="file_'+path+'">';
	html += '<table cellspacing=0 cellpadding=0><tr>';
	html += '<td style="padding:0px" width=16 am_path="'+path+'" captureMouse="assetmgr_mouse_folder_control">' + section_control(id, false) + '</td>';
	// html += '<td style="padding:0px">';
		// html += '<table cellspacing=0 cellpadding=0><tr>';
		html += '<td style="padding:0px; display:none;" id="fl_'+path+'" width=16>&nbsp;</td>';
			
		html += '<td style="padding:0px" width=16 am_path="'+path+'" captureMouse="assetmgr_mouse_folder">' + icon(icon_name, '', '', '', 'fi_'+path) + '</td><td style="padding:0px" width=4>' + spacer(4,1) + '</td>';
		html += '<td style="padding:0px" am_path="'+path+'" id="fn_'+path+'" captureMouse="assetmgr_mouse_folder" onselectstart="return false"><nobr><b>'+folder_name+'</b></nobr></td>';
		// html += '</tr></table></div>';
	// html += '</td>';
	html += '</tr></table></div>';
	return html;
};

assetmgr.render_folder_structure = function(folder, path) {
	// render subfolders for a given folder
	var html = '';
	
	if (folder) {
		var sorted_keys = hash_keys_to_array(folder).sort();
		for (var idx = 0, len = sorted_keys.length; idx < len; idx++) {
			var subfolder_name = sorted_keys[idx];
			if (subfolder_name != '_Attribs') {
				var subfolder = folder[subfolder_name];
				var subpath = path + subfolder_name + '/';
				var id = 'dc_' + subpath;
			
				// section control here
				html += this.render_folder_control(subpath, subfolder);
			
				html += '<div class="folder_contents" id="'+id+'" style="display:none;">';
				html += this.render_folder_structure(subfolder, subpath);
				html += '</div>';
			} // not _Attribs
		} // foreach subfolder
	} // folder has subfolders
	
	html += '<div id="df_'+path+'" style="display:none;"></div>'; // files will go here
	
	return html;
};

assetmgr.deselect_file = function(path) {
	// deselect file (turn off highlight and remove from selection hash)
	fire_hook('before_selection_change');
	
	$('file_'+path).className = 'file_object';
	/*if (path.match(/\/$/) && (path != '/')) {
		$('fb_'+path).hide();
	} */
	delete this.selection[path];
};

assetmgr.select_file = function(path) {
	fire_hook('before_selection_change');
	
	if (path == '/') return; // cannot select root
	
	// select file (make it highlighted and add to selection hash)
	$('file_'+path).className = 'file_object_selected';
	/*if (path.match(/\/$/)) {
		$('fb_'+path).show();
	} */
	this.selection[path] = 1;
};

assetmgr.click_file = function(path) {
	// click file or folder -- handle shift key too
	if (session.last_mouse_event.shiftKey || session.last_mouse_event.ctrlKey || session.last_mouse_event.metaKey) {
		// shift key held, toggle selection + multiple
		// or select range if supported
		var num_selected = num_keys(this.selection);
		var first_item = first_key(this.selection);
		
		if (session.last_mouse_event.shiftKey && // if shift was held
			(num_selected == 1) && // and exactly one item is already selected
			(first_item != path) && // and you are not de-selecting that item
			!this.is_folder(first_item) && // and the pre-selected item is not a folder
			!this.is_folder(path) && // and the new item is not a folder
			(dirname(first_item) == dirname(path))) { // and both items are in the same parent folder
			
			// select range of files
			var parent_path = dirname(path) + '/';
			var metadata = this.folder_metadata[parent_path];
			if (!metadata) return alert("Cannot find metadata for: " + parent_path);
			
			var range_start = parseInt( find_object_idx( metadata.Files.File, { Name: basename(first_item) } ), 10 );
			var range_end = parseInt( find_object_idx( metadata.Files.File, { Name: basename(path) } ), 10 );
			
			if ((range_start > -1) && (range_end > -1)) {
				if (range_start > range_end) { var temp = range_start; range_start = range_end; range_end = temp; }
				for (var idx = range_start; idx <= range_end; idx++) {
					var file = metadata.Files.File[idx];
					this.select_file( parent_path + file.Name );
				}
			}
			else alert("Cannot determine selection range: " + range_start + " to " + range_end);
		}
		else {
			if (this.selection[path]) this.deselect_file(path);
			else this.select_file(path);
		}
	}
	else {
		// default action, no shift key, always select solo
		for (var sel_path in this.selection) {
			this.deselect_file(sel_path);
		}
		this.selection = {}; // clear all
		this.select_file(path);
	}
	
	this.update_floater();
};

function assetmgr_mouse_main_area(type, e, pt) {
	// handle mouse event in main area, if not handled by inner elements
	if (type == 'click') {
		for (var sel_path in assetmgr.selection) {
			assetmgr.deselect_file(sel_path);
		}
		assetmgr.selection = {}; // clear all
		assetmgr.update_floater();
	}
};

assetmgr.refresh_open_folders = function(use_cache) {
	// expand and refresh file lists for all open folders
	for (var path in this.open_folders) {
		if ($('df_'+path)) {
			if (!use_cache) delete this.folder_metadata[path];
			this.set_folder_view(path, true, use_cache);
		}
		else {
			// cannot find folder, silently delete
			// (may have been recovered from cookie)
			delete this.open_folders[path];
		}
	}
};

assetmgr.animate_folder_frame = function(id) {
	var div = $(id);
	if (!div) return alert("Cannot find div: " + id);
	div._timer = null;
	
	var target = div._state ? div.scrollHeight : 0;
	if (div._height != target) {
		div._height += ((target - div._height) / 4);
		if (Math.abs( target - div._height ) < 1.0) div._height = target;
		
		div.style.height = '' + div._height + 'px';
		
		if (div._mode == -1) div.scrollTop = div.scrollHeight;
		else div.scrollTop = 0;
		
		div._timer = setTimeout('assetmgr.animate_folder_frame("'+id+'");', 33);
	}
	else {
		if (div._state) {
			div.style.height = 'auto';
		}
		// else div.style.display = 'none';
		div.scrollTop = 0;
	}
};

assetmgr.resume_folder_animate = function(id) {
	// recheck folder and animate if needed
	var div = $(id);
	if (div._height >= 32) div._mode = 1; // switch to wipe mode if applicable
	if (!div._timer) this.animate_folder_frame(id);
};

assetmgr.animate_folder_visibility = function(id, visible) {
	// set section view flag to viewable or hidden

	// var div = document.getElementById(id);
	// div.style.display = visible ? 'block' : 'none';
	
	var div = $(id);
	
	if (typeof(div._state) == 'undefined') {
		div._state = (div.style.display != 'none') ? true : false;
		div._height = div._state ? div.scrollHeight : 0;
		div.style.height = '' + (div._state ? 'auto' : '0px');
		div.scrollTop = 0;
	}
	else {
		// actual height of div may have changed, update now
		div._height = div.offsetHeight;
	}
	div.show();
	
	div._state = visible;
	div._mode = -1; // slide out, instead of wipe out
	if (!div._timer) this.animate_folder_frame(id);
	
	var sc = document.getElementById('sc_' + id);
	if (sc) {
		var new_icon_name = visible ? 'arrow-down' : 'arrow-right';
		if (sc.src.indexOf('_mini') > -1) new_icon_name += '_mini';
		sc.src = images_uri + '/icons/' + new_icon_name + '.png';
	}

	if (visible && !div.innerHTML.length && div.getAttribute('onExpand')) 
		eval( div.getAttribute('onExpand') );
};

assetmgr.set_folder_view = function(path, visible, instant) {
	// set folder to expanded or contracted
	var num_files = 0;
	var metadata = this.folder_metadata[path];
	if (metadata && metadata.Files && metadata.Files.File) num_files = metadata.Files.File.length;
	
	if (!visible || $('df_'+path).innerHTML.length) {
		if (this.global_animate_folders && (num_files < this.max_animated_items_in_folder) && !instant) 
			this.animate_folder_visibility( 'dc_' + path, visible );
		else 
			set_section_visibility( 'dc_' + path, visible );
	}
	
	if (path != '/') $('fi_'+path).src = images_uri + '/icons/' + (visible ? 'folder_open' : 'folder') + '.png';
	
	if (visible) this.open_folders[path] = 1;
	else delete this.open_folders[path];
	user_storage_mark();
	
	if (visible && (!this.folder_metadata[path] || !$('df_'+path).innerHTML.length)) {
		this.fetch_file_list(path, instant);
		return true; // yes performing fetch
	}
	else return false; // no need to fetch
};

assetmgr.toggle_folder_view = function(path) {
	// expand or contract folder
	fire_hook('before_selection_change');
	
	if (this.open_folders[path]) {
		// contracting open folder, 
		// prune selection if any items are children of folder
		var need_update = false;
		for (var subpath in this.selection) {
			if ((subpath != path) && (subpath.indexOf(path) == 0)) { this.deselect_file(subpath); need_update = true; }
		}
		if (need_update) this.update_floater();
	}
	
	this.set_folder_view( path, this.open_folders[path] ? false : true );
};

assetmgr.refresh_file_list = function(path) {
	// force refresh file list
	delete this.folder_metadata[path];
	this.fetch_file_list(path);
};

assetmgr.get_file_url = function(path, proto) {
	// return fully-qualified URL to file given path
	if (!proto) proto = protocol;
	return proto + '://' + location.hostname + '/effect/api/view/games/' + this.game_id + '/assets' + path;
};

assetmgr.download_file = function(path) {
	// download file to local disk
	if (!path) path = first_key(this.selection);
	Debug.trace('assets', "Downloading asset: " + path);
	location.href = this.get_file_url(path) + '?download=1';
};

assetmgr.download_folder = function(path) {
	// download folder as zip file
	if (!path) path = first_key(this.selection) || '';
	Debug.trace('assets', "Downloading folder: " + path);
	location.href = protocol + '://' + location.hostname + '/effect/api/game_asset_folder_download?game_id=' + this.game_id + '&path=' + path;
};

assetmgr.view_file = function(path) {
	// view file in new window, make sure URL is insecure
	// because people may copy & paste the URL into banners
	if (!path) path = first_key(this.selection);
	Debug.trace('assets', "Viewing asset: " + path);
	window.open( this.get_file_url(path, 'http') );
};

assetmgr.edit_file = function(path) {
	// edit file in new window
	if (!path) path = first_key(this.selection);
	Debug.trace('assets', "Editing asset: " + path);
	
	var parent_path = dirname(path);
	var filename = basename(path);
	
	var mod = session.api_mod_cache.textedit || 0;
	
	window.open( 'textedit.psp.html?mode=asset&game_id=' + this.game_id +'&path=' + parent_path + '&filename=' + filename + '&mod=' + mod );
};

function assetmgr_mouse_file(type, e, pt) {
	// mouse action on file
	switch (type) {
		case 'mouseDown': assetmgr.click_file( this.getAttribute('am_path') ); break;
		case 'mouseMove': break;
		case 'mouseUp': break;
		case 'click': break;
		case 'doubleClick': 
			var path = this.getAttribute('am_path');
			if (!assetmgr.is_binary(path) && !assetmgr.is_folder(path)) assetmgr.edit_file(path);
			else assetmgr.view_file(path);
		break;
	}
	return false; // stop event
};

assetmgr.last_floater_y = 0;
assetmgr.floater_counter = 0;

assetmgr.animate_floater = function() {
	// float the floater info pane slowly towards its destination (ease out)
	var scroll = getScrollXY(parent);
	this.target_floater_y = 0;
	if (scroll.y > 175) this.target_floater_y = scroll.y - 175;
	
	this.floater_y += ((this.target_floater_y - this.floater_y) / 8);
	if (Math.abs( this.target_floater_y - this.floater_y ) < 1.0) this.floater_y = this.target_floater_y;
	
	if (Math.floor(this.floater_y) == this.last_floater_y) this.floater_counter++;
	else {
		this.last_floater_y = Math.floor(this.floater_y);
		this.floater_counter = 0;
	}
	
	var floater = $('assetmgr_floater');
	floater.style.top = '' + (75 + Math.floor(this.floater_y)) + 'px';
	
	this.upload_glue();
	
	setTimeout( 'assetmgr.animate_floater()', (this.floater_counter < 100) ? 33 : 500 ); // 30 FPS
};
