// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

// Asset Dialog

window.dasset = {};

dasset.choose = function(title, game_id, file_regexp, presel_path, callback, base_path, allow_multiple) {
	// show 'choose asset' dialog	
	this.title = title;
	this.game_id = game_id;
	this.file_regexp =  new RegExp(file_regexp || '.+', 'i');
	this.callback = callback;
	this.allow_multiple = allow_multiple;
	
	if (presel_path && !presel_path.match(/^\//)) presel_path = '/' + presel_path;
	
	var html = '';
	
	html += '<div class="dialog_bkgnd" style="padding-left:150px; background-image:url('+png('images/big_icons/assets.png')+')">';
	
	html += '<table cellspacing=0 cellpadding=0><tr><td width=400 height=350>';
	html += '<div class="dialog_title">' + title + '</div>';
	
	html += '<div id="d_choose_asset" style="width:400px; height:275px; overflow-x:hidden; overflow-y:auto; border:1px solid #bbb;"></div>';
	
	html += spacer(1,15) + '<br/>';
	
	html += '<center><table><tr>';
		html += '<td>' + large_icon_button('x', 'Cancel', 'dasset.cancel_choose()') + '<div class="clear"></div></td>';
		html += '<td width=50>&nbsp;</td>';
		html += '<td>' + large_icon_button('check', 'Select', 'dasset.do_choose()', 'btn_choose_asset', '', presel_path ? '' : 'disabled') + '<div class="clear"></div></td>';
	html += '</tr></table></center>';
	
	html += '</td></tr></table>';
	
	show_popup_dialog(550, 360, html);
	session.hooks.keys[ENTER_KEY] = [this, 'do_choose']; // enter key
	session.hooks.keys[ESC_KEY] = [this, 'cancel_choose']; // escape key
	
	this.init('d_choose_asset', presel_path, base_path);
};

dasset.cancel_choose = function() {
	this.enabled = false;
	hide_popup_dialog();
};

dasset.do_choose = function() {
	if (this.allow_multiple) {
		var paths = [];
		for (var path in this.selection) {
			if (path && path.match(this.file_regexp)) paths.push(path);
		}
		if (paths.length) {
			this.enabled = false;
			hide_popup_dialog();
			fire_callback( this.callback, paths );
		}
	}
	else {
		var path = first_key(this.selection);
		if (path && path.match(this.file_regexp)) {
			this.enabled = false;
			hide_popup_dialog();
			fire_callback( this.callback, path );
		}
	}
};

dasset.save_as = function(title, game_id, callback, base_path, default_filename) {
	// load user game list
	this.title = title;
	this.game_id = game_id;
	this.callback = callback;
	this.base_path = base_path;
	this.default_filename = default_filename;
	this.file_regexp =  new RegExp('\/$', 'i'); // folders only
	
	if (!session.storage.dasset_save_as) session.storage.dasset_save_as = {};
	this.prefs = session.storage.dasset_save_as;
	
	if (game_id) {
		this.save_as_2(null, null);
	}
	else {
		effect_api_get( 'get_user_games', { limit:1000, offset:0 }, [this, 'save_as_2'], { } );
	}
};

dasset.save_as_2 = function(response, tx) {
	// show 'choose asset' dialog	
	this.games = [];
	if (response && response.Rows && response.Rows.Row) {
		this.games = always_array( response.Rows.Row );
	}
	if (!this.games.length && !this.game_id) 
		return do_error("You are not a member of any games.  Please create or join a game, then you can save assets to it.");
	
	var html = '';
	
	html += '<div class="dialog_bkgnd" style="padding-left:150px; background-image:url('+png('images/big_icons/assets.png')+')">';
	
	html += '<table cellspacing=0 cellpadding=0><tr><td width=400 height=450>';
	html += '<div class="dialog_title">' + this.title + '</div>';
	
	// game selection
	if (!this.game_id) {
		var game_titles = [];
		for (var idx = 0, len = this.games.length; idx < len; idx++) {
			var game = this.games[idx];
			game_titles.push([ game.GameID, ww_fit_string(game.Title, 200, session.em_width, 1) ]);
		}
		html += '<table><tr>';
		html += '<td class="fe_label_left">Game:</td>';
		html += '<td>' + menu('fe_dasset_save_game', game_titles, this.prefs.game_id, 
			{ 'class':'fe_medium_menu', 'onChange':"dasset.set_game(this.options[this.selectedIndex].value)" }) + '</td>';
		html += '</tr></table>';
		this.game_id = this.prefs.game_id || this.games[0].GameID;
		html += spacer(1,10) + '<br/>';
	}
	
	html += '<div id="d_choose_asset" style="width:400px; height:275px; overflow-x:hidden; overflow-y:auto; border:1px solid #bbb;"></div>';
	
	html += spacer(1,15) + '<br/>';
	
	// filename
	html += '<table><tr>';
	html += '<td class="fe_label_left">Filename:</td>';
	html += '<td><input type=text id="fe_dasset_save_as_filename" class="fe_medium" size="25" maxlength="64" value="'+escape_text_field_value(this.default_filename)+'"/></td>';
	html += '</tr></table>';
	
	html += spacer(1,15) + '<br/>';
	
	html += '<center><table><tr>';
		html += '<td>' + large_icon_button('x', 'Cancel', 'dasset.cancel_choose()') + '<div class="clear"></div></td>';
		html += '<td width=50>&nbsp;</td>';
		html += '<td>' + large_icon_button('check', 'Save', 'dasset.do_save_as()', 'btn_choose_asset', '', this.default_filename ? '' : 'disabled') + '<div class="clear"></div></td>';
	html += '</tr></table></center>';
	
	html += '</td></tr></table>';
	
	show_popup_dialog(550, 460, html);
	session.hooks.keys[ENTER_KEY] = [this, 'do_save_as']; // enter key
	session.hooks.keys[ESC_KEY] = [this, 'cancel_choose']; // escape key
	
	this.init('d_choose_asset', this.prefs.last_folder || '', this.base_path);
	
	setTimeout( function() {
		var input = $('fe_dasset_save_as_filename');
		input.focus();
		setSelectionRange( input, 0, input.value.lastIndexOf('.') );
	}, 1 );
};

dasset.set_game = function(game_id) {
	this.game_id = game_id;
	this.init('d_choose_asset', '', this.base_path);
	this.prefs.game_id = game_id;
	user_storage_mark();
};

dasset.do_save_as = function() {
	clear_field_error();
	
	var path = first_key(this.selection);
	var filename = trim( $('fe_dasset_save_as_filename').value );
	
	if (!filename) return bad_field('fe_dasset_save_as_filename', "Please enter a filename before saving.");
	if (!filename.match(/^[\w\-\.]+$/)) return bad_field('fe_dasset_save_as_filename', "Your filename contains illegal characters.  Please only use alphanumerics, dashes and periods.");
	if (!filename.match(/^.+\.\w+$/)) return bad_field('fe_dasset_save_as_filename', "Your filename does not have a valid alphanumeric extension.  Please add one and try saving it again.");
	
	if (path && path.match(this.file_regexp) && filename) {
		if (this.folder_metadata[path]) {
			// good, folder is already loaded
			this.do_save_as_finish( this.folder_metadata[path], { _path: path, _filename: filename });
		}
		else {
			// nope, we have to fetch the file list
			effect_api_get('asset_file_list_get', { 
				id: this.game_id,
				path: path
			}, [this, 'do_save_as_finish'], { _path: path, _filename: filename });
		}
	}
};

dasset.do_save_as_finish = function(metadata, tx) {
	var path = tx._path;
	var filename = tx._filename;
	
	if (!metadata) metadata = {};	
	if (!metadata.Files) metadata.Files = {};
	if (!metadata.Files.File) metadata.Files.File = [];
	
	var files = always_array( metadata.Files.File );
	if (find_object(files, { Name: filename }) && !confirm("The file \""+filename+"\" already exists in the selected folder.  Do you want to replace it?")) return;
	
	this.enabled = false;
	
	this.prefs.last_folder = path;
	user_storage_mark();
	
	hide_popup_dialog();
	fire_callback( this.callback, this.game_id, path, filename );
};

dasset.global_animate_folders = !ie6;
dasset.max_animated_items_in_folder = 100;

dasset.init = function(dom_id, path, base_path) {
	this.dom_id = dom_id;
	
	// this.open_folders = { '/': 1 };
	this.folder_metadata = {};
	
	this.selection = {};
	if (path) this.selection[path] = 1;
	
	// recover settings from storage
	if (!session.storage.games) session.storage.games = {};
	var games = session.storage.games;
	
	// game specific prefs
	if (!games[this.game_id]) games[this.game_id] = {};
	this.game_prefs = deep_copy_tree( games[this.game_id] ); // no touch cookie in dialog
	
	// restore open folders
	// if (!this.game_prefs.open_folders) this.game_prefs.open_folders = this.open_folders;
	// else this.open_folders = this.game_prefs.open_folders;
	if (!this.open_folders) {
		if (this.game_prefs.open_folders) this.open_folders = this.game_prefs.open_folders;
		else this.open_folders = { '/': 1 };
	}
	
	// if base path is specified, close all open folders that DON'T match it
	if (base_path) {
		for (var key in this.open_folders) {
			if (key.indexOf(base_path) == -1) delete this.open_folders[key];
		}
		this.open_folders[base_path+'/'] = 1;
	}
	
	this.open_folders['/'] = 1; // root is always open on launch
	
	this.enabled = true;
	this.refresh_folder_list();
};

dasset.refresh_folder_list = function(callback) {
	// load folder list and refresh display
	if (callback) this.rfl_callback = callback;
	else this.rfl_callback = '';
		
	$(this.dom_id).innerHTML = busy();
	
	effect_api_get('asset_folder_tree_get', { 
		id: this.game_id
	}, [this, 'refresh_folder_list_2'], {});
};

dasset.refresh_folder_list_2 = function(response) {
	// receive response from server
	if (!this.enabled) return;
	if (response.Code != 0) {
		return do_error("ERROR: Cannot load folder tree: " + response.Description);
	}
	
	var html = '';
	html += this.render_folder_control('/');
	html += '<div class="folder_contents" id="da_dc_/" style="display:block;">';
	
	var ftree = lookup_path('/Data/FolderList', response);
	if (!ftree) ftree = {}; // first time use
	
	html += this.render_folder_structure( ftree, '/' );
	
	html += '</div>';
	$(this.dom_id).innerHTML = html;
	
	this.folder_tree = ftree ? ftree : {};
	
	// wait for DOM elements to show up
	if (this.rfl_callback) setTimeout( 'fire_callback(dasset.rfl_callback);', 1 );
	setTimeout( 'dasset.refresh_open_folders()', 1 );
};

function dasset_mouse_folder(type, e, pt) {
	// mouse action on folder
	switch (type) {
		case 'mouseDown': break;
		case 'mouseMove': break;
		case 'mouseUp': break;
		case 'click': dasset.click_file( this.getAttribute('am_path') ); break;
		case 'doubleClick': dasset.toggle_folder_view( this.getAttribute('am_path') ); break;
	}
	return false; // stop event
};

function dasset_mouse_folder_control(type, e, pt) {
	switch (type) {
		case 'click': dasset.toggle_folder_view( this.getAttribute('am_path') ); break;
		case 'doubleClick': dasset.toggle_folder_view( this.getAttribute('am_path') ); break;
	}
	return false;
};

dasset.render_folder_control = function(path, folder) {
	// render folder icon plus control (+/-) plus name
	var id = 'da_dc_' + path;
	var icon_name = 'folder.png';
	var folder_name = path.replace(/\/$/, '').replace(/^.*\/([^\/]+)$/, '$1');
	if (!folder_name) {
		// root level
		folder_name = 'Home';
		icon_name = 'house.png';
	}
	
	var class_name = this.selection[path] ? 'file_object_selected' : 'file_object';
		
	var html = '';
	html += '<div class="'+class_name+'" id="da_file_'+path+'">';
	html += '<table cellspacing=0 cellpadding=0><tr>';
	html += '<td style="padding:0px" width=16 am_path="'+path+'" captureMouse="dasset_mouse_folder_control">' + section_control(id, false) + '</td>';
	// html += '<td style="padding:0px">';
		// html += '<table cellspacing=0 cellpadding=0><tr>';
		html += '<td style="padding:0px; display:none;" id="da_fl_'+path+'" width=16>&nbsp;</td>';
			
		html += '<td style="padding:0px" width=16 am_path="'+path+'" captureMouse="dasset_mouse_folder">' + icon(icon_name, '', '', '', 'da_fi_'+path) + '</td><td style="padding:0px" width=4>' + spacer(4,1) + '</td>';
		html += '<td style="padding:0px" am_path="'+path+'" id="da_fn_'+path+'" captureMouse="dasset_mouse_folder" onselectstart="return false"><nobr><b>'+folder_name+'</b></nobr></td>';
		// html += '</tr></table></div>';
	// html += '</td>';
	html += '</tr></table></div>';
	return html;
};

dasset.render_folder_structure = function(folder, path) {
	// render subfolders for a given folder
	var html = '';
	
	if (folder) {
		var sorted_keys = hash_keys_to_array(folder).sort();
		for (var idx = 0, len = sorted_keys.length; idx < len; idx++) {
			var subfolder_name = sorted_keys[idx];
			if (subfolder_name != '_Attribs') {
				var subfolder = folder[subfolder_name];
				var subpath = path + subfolder_name + '/';
				var id = 'da_dc_' + subpath;
			
				// section control here
				html += this.render_folder_control(subpath, subfolder);
			
				html += '<div class="folder_contents" id="'+id+'" style="display:none;">';
				html += this.render_folder_structure(subfolder, subpath);
				html += '</div>';
			} // not _Attribs
		} // foreach subfolder
	} // folder has subfolders
	
	html += '<div id="da_df_'+path+'" style="display:none;"></div>'; // files will go here
	
	return html;
};

dasset.deselect_file = function(path) {
	// deselect file (turn off highlight and remove from selection hash)
	$('da_file_'+path).className = 'file_object';
	delete this.selection[path];
};

dasset.select_file = function(path) {
	if (path == '/') return; // cannot select root
	// select file (make it highlighted and add to selection hash)
	$('da_file_'+path).className = 'file_object_selected';
	this.selection[path] = 1;
};

dasset.is_folder = function(path) {
	// determine if path is folder (trailing slash)
	return !!path.match(/\/$/);
};

dasset.click_file = function(path) {
	// click file or folder
	if (path.match(this.file_regexp)) {
		var e = session.last_mouse_event;
		if (this.allow_multiple && (e.shiftKey || e.ctrlKey || e.metaKey)) {
			// shift key held, toggle selection + multiple
			// or select range if supported
			var num_selected = num_keys(this.selection);
			var first_item = first_key(this.selection);

			if (e.shiftKey && // if shift was held
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
				// ctrlKey or metaKey, select individual multiples
				if (this.selection[path]) this.deselect_file(path);
				else this.select_file(path);
			}
		}
		else {
			// default action, no mod key, always select solo
			for (var sel_path in this.selection) {
				this.deselect_file(sel_path);
			}
			this.selection = {}; // clear all
			this.select_file(path);
		}
	
		this.update_from_selection();
	}
};

dasset.update_from_selection = function() {
	// update dialog buttons from selection
	if (num_keys(this.selection)) {
		$('btn_choose_asset').removeClass('disabled');
	}
	else {
		$('btn_choose_asset').addClass('disabled');
	}
};

dasset.refresh_open_folders = function() {
	// expand and refresh file lists for all open folders
	for (var path in this.open_folders) {
		if ($('da_df_'+path)) {
			delete this.folder_metadata[path];
			this.set_folder_view(path, true);
		}
		else {
			// cannot find folder, silently delete
			// (may have been recovered from cookie)
			delete this.open_folders[path];
		}
	}
};

dasset.animate_folder_frame = function(id) {
	if (!this.enabled) return;
	
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
		
		div._timer = setTimeout('dasset.animate_folder_frame("'+id+'");', 33);
	}
	else {
		if (div._state) {
			div.style.height = 'auto';
		}
		// else div.style.display = 'none';
		div.scrollTop = 0;
	}
};

dasset.resume_folder_animate = function(id) {
	// recheck folder and animate if needed
	var div = $(id);
	if (div._height >= 32) div._mode = 1; // switch to wipe mode if applicable
	if (!div._timer) this.animate_folder_frame(id);
};

dasset.animate_folder_visibility = function(id, visible) {
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

dasset.set_folder_view = function(path, visible, instant) {
	// set folder to expanded or contracted
	var num_files = 0;
	var metadata = this.folder_metadata[path];
	if (metadata && metadata.Files && metadata.Files.File) num_files = metadata.Files.File.length;
	
	if (!visible || $('da_df_'+path).innerHTML.length) {
		if (this.global_animate_folders && (num_files < this.max_animated_items_in_folder) && !instant) 
			this.animate_folder_visibility( 'da_dc_' + path, visible );
		else 
			set_section_visibility( 'da_dc_' + path, visible );
	}
	
	if (path != '/') $('da_fi_'+path).src = images_uri + '/icons/' + (visible ? 'folder_open' : 'folder') + '.png';
	
	if (visible) this.open_folders[path] = 1;
	else delete this.open_folders[path];
	
	if (visible && (!this.folder_metadata[path] || !$('da_df_'+path).innerHTML.length)) {
		this.fetch_file_list(path, instant);
		return true; // yes performing fetch
	}
	else return false; // no need to fetch
};

dasset.toggle_folder_view = function(path) {
	// expand or contract folder
	
	if (this.open_folders[path]) {
		// contracting open folder, 
		// prune selection if any items are children of folder
		var need_update = false;
		for (var subpath in this.selection) {
			if ((subpath != path) && (subpath.indexOf(path) == 0)) { this.deselect_file(subpath); need_update = true; }
		}
		if (need_update) this.update_from_selection();
	}
	
	this.set_folder_view( path, this.open_folders[path] ? false : true );
};

function dasset_mouse_file(type, e, pt) {
	// mouse action on file
	switch (type) {
		case 'mouseDown': dasset.click_file( this.getAttribute('am_path') ); break;
		case 'mouseMove': break;
		case 'mouseUp': break;
		case 'click': break;
		case 'doubleClick': 
			var path = this.getAttribute('am_path');
			// fire_callback(this.callback, 'select', path);
			dasset.do_choose();
		break;
	}
	return false; // stop event
};

dasset.fetch_file_list = function(path, instant) {
	// fetch metadata for path, and render file list
	if (instant) instant = 1; else instant = 0;
	
	if (typeof(this.folder_metadata[path]) != 'undefined') {
		// cached
		this.fetch_file_list_2(this.folder_metadata[path], path, instant);
		return;
	}
	
	$('da_fi_'+path).src = 'images/busy.gif';
	
	effect_api_get('asset_file_list_get', { 
		id: this.game_id,
		path: path
	}, [this, 'receive_file_list'], { _path: path, _instant: instant });
	
	/* var url = protocol + hostnames['Cache'] + '/abc/assets/' + session.account_name + path;
	url += '?format=js&metadata=0&onafter=fetch_file_list_2(jobticket,%22'+path+'%22)&onerror=fetch_file_list_2(null,%22'+path+'%22,'+instant+')';
	load_script( url ); */
};

function dasset_file_sort(a, b) {
	// sort jobticket sources by baseproduct
	return( (b.Name.toString().toLowerCase() < a.Name.toString().toLowerCase()) ? 1 : -1 );
}

dasset.receive_file_list = function(response, tx) {
	if (!this.enabled) return;
	
	if (response.Data) {
		this.fetch_file_list_2( response.Data, tx._path );
	}
	else {
		this.fetch_file_list_2( null, tx._path, tx._instant );
	}
};

dasset.fetch_file_list_2 = function(metadata, path, instant) {
	// receive file list from server
	if (!metadata) metadata = {};
	this.folder_metadata[path] = metadata;
	
	if (!metadata.Files) metadata.Files = {};
	if (!metadata.Files.File) metadata.Files.File = [];
	
	var num_files = 0;
	
	if (metadata && metadata.Files && metadata.Files.File) {
		always_array(metadata.Files, 'File');
		
		// sort alphabetically by filename
		metadata.Files.File = metadata.Files.File.sort( dasset_file_sort );
				
		var html = '';
		for (var idx = 0, len = metadata.Files.File.length; idx < len; idx++) {
			var file = metadata.Files.File[idx];
			var filename = file.Name;
			var file_path = path + filename;
			var class_name = this.selection[file_path] ? 'file_object_selected' : 'file_object';
		
			if (!file_path.match(this.file_regexp)) class_name += ' disabled';
		
			html += '<div class="'+class_name+'" id="da_file_'+file_path+'" am_path="'+file_path+'" captureMouse="dasset_mouse_file">';
			html += '<table cellspacing=0 cellpadding=0><tr>';
		
			html += '<td style="padding:0px" id="da_fl_'+file_path+'" width=16>';
			html += spacer(16,1);
			html += '</td>';
		
			html += '<td style="padding:0px" width=16>' + get_icon_for(filename, 'da_fi_'+file_path) + '</td><td style="padding:0px" width=4>' + spacer(4,1) + '</td>';
			html += '<td style="padding:0px" id="da_fn_'+file_path+'" onselectstart="return false"><nobr>'+filename+'</nobr></td>';
			html += '</tr></table></div>';
			num_files++;
		} // foreach file
		
		var df_div = $('da_df_'+path);
		df_div.style.display = num_files ? '' : 'none';
		
		// var div = $('dc_'+path);
		
		/*if (!$('df_'+path).innerHTML.length && session.open_folders[path] && div._state) {
			div.style.height = '' + div._height + 'px';
			setTimeout( "resume_folder_animate('dc_"+path+"')", 10 );
		}*/
		
		if (!df_div.innerHTML.length && this.open_folders[path]) {
			if (this.global_animate_folders && (num_files <= this.max_animated_items_in_folder) && !instant)
				setTimeout( "dasset.animate_folder_visibility( 'da_dc_"+path+"', true );", 10 );
			else
				set_section_visibility( 'da_dc_' + path, true );
		}
		
		df_div.innerHTML = html;
	}
	else $('da_df_'+path).style.display = 'none';
		
	if (path != '/') $('da_fi_'+path).src = images_uri + '/icons/' + (this.open_folders[path] ? 'folder_open' : 'folder') + '.png';
	else {
		$('da_fi_'+path).src = images_uri + '/icons/house.png';
	}
};

// Utility Functions

function get_asset_url(game_id, path) {
	// return URL for asset
	if (!path.match(/^\//)) path = '/' + path;
	return '/effect/api/view/games/' + game_id + '/assets' + path;
}

function asset_icon_link(game_id, path, link, max_width) {
	// return HTML for icon asset link
	var url = get_asset_url(game_id, path);
	var filename = basename(path);
	
	return get_icon_for(path, '', max_width ? ww_fit_filename(filename, max_width, session.em_width) : filename, link || ("window.open('"+url+"')"));
}
