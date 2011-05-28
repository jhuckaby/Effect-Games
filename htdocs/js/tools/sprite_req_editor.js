// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

// Sprite Reqirements Editor

window.spreq = {
	data: {}
};

spreq.delete_row = function(dom_id_prefix, id) {
	// delete row
	var prefix = dom_id_prefix + '_' + id;
	var container = $('d_' + dom_id_prefix);
	var reqs = this.data[dom_id_prefix].reqs;
	
	var req = find_object( reqs, { _id: id } );
	assert(!!req, "Could not find sprite req: " + id);
	
	var req_idx = find_object_idx( reqs, { _id: id } );
	assert(req_idx > -1, "Could not find sprite req: " + id);
	
	reqs.splice( req_idx, 1 );
	
	try { container.removeChild( document.getElementById(prefix) ); }
	catch (e) { alert("Could not remove child: " + id); }
};

spreq.add_req_dlg = function(dom_id_prefix) {
	// show dialog to choose sprite requirement
	var reqs = this.data[dom_id_prefix].reqs;
	this.temp_dom_id_prefix = dom_id_prefix;
	
	this.selection = {};
	
	var html = '';
	
	html += '<div class="dialog_bkgnd" style="padding-left:150px; background-image:url('+png('images/big_icons/cog.png')+')">';
	
	html += '<table cellspacing=0 cellpadding=0><tr><td width=400 height=350>';
	html += '<div class="dialog_title">Select Sprite Classes</div>';
	
	html += '<div id="d_choose_spreq_list" style="width:400px; height:275px; overflow-x:hidden; overflow-y:auto; border:1px solid #bbb; padding-top:5px;">'+busy()+'</div>';
	
	html += spacer(1,15) + '<br/>';
	
	html += '<center><table><tr>';
		html += '<td>' + large_icon_button('x', 'Cancel', 'spreq.cancel_choose()') + '<div class="clear"></div></td>';
		html += '<td width=50>&nbsp;</td>';
		html += '<td>' + large_icon_button('check', 'Select', 'spreq.do_choose()', 'btn_choose_spreq', '', 'disabled') + '<div class="clear"></div></td>';
	html += '</tr></table></center>';
	
	html += '</td></tr></table>';
	
	show_popup_dialog(550, 360, html);
	session.hooks.keys[ENTER_KEY] = [this, 'do_choose']; // enter key
	session.hooks.keys[ESC_KEY] = [this, 'cancel_choose']; // escape key
	
	// fetch sprite list
	var self = this;
	setTimeout( function() {
		effect_api_get('game_objects_get', { 
			id: self.data[dom_id_prefix].game_id,
			sprites: 1
		}, [self, 'receive_objects'], {});
	}, 1 );
};

spreq.receive_objects = function(response, tx) {
	// receive sprite list from server
	var html = '';
	if (response.Sprites && response.Sprites.Sprite) {
		var sprites = this.sprites = sort_array( response.Sprites.Sprite, { sort_by: 'Name', sort_dir: 1 } );
		for (var idx = 0, len = sprites.length; idx < len; idx++) {
			var sprite = sprites[idx];
			
			var class_name = this.selection[sprite.Name] ? 'file_object_selected' : 'file_object';
			html += '<div class="'+class_name+'" id="spreq_file_'+sprite.Name+'" am_path="'+sprite.Name+'" captureMouse="spreq_mouse_file">';
			html += '<table cellspacing=0 cellpadding=0><tr>';
			
			html += '<td style="padding:0px" id="spreq_fl_'+sprite.Name+'" width=16>';
			html += spacer(16,1);
			html += '</td>';
			
			html += '<td style="padding:0px" width=16>' + icon('cog.png') + '</td><td style="padding:0px" width=4>' + spacer(4,1) + '</td>';
			html += '<td style="padding:0px" id="spreq_fn_'+sprite.Name+'" onselectstart="return false"><nobr>'+sprite.Name+'</nobr></td>';
			html += '</tr></table></div>';
		} // foreach sprite
	} // has sprites
	else {
		html = 'No sprite objects found.';
	}
	
	$('d_choose_spreq_list').innerHTML = html;
};

function spreq_mouse_file(type, e, pt) {
	// mouse action on file
	switch (type) {
		case 'mouseDown': spreq.click_sprite( this.getAttribute('am_path') ); break;
		case 'mouseMove': break;
		case 'mouseUp': break;
		case 'click': break;
		case 'doubleClick': 
			spreq.click_sprite( this.getAttribute('am_path') );
			spreq.do_choose();
			break;
	}
	return false; // stop event
};

spreq.click_sprite = function(name) {
	// click on sprite name
	var e = session.last_mouse_event;
	
	if (e.shiftKey || e.ctrlKey || e.metaKey) {
		var num_selected = num_keys(this.selection);
		var first_item = first_key(this.selection);
		
		if (e.shiftKey && // if shift was held
			(num_selected == 1) && // and exactly one item is already selected
			(first_item != name)) { // and you are not de-selecting that item

			// select range of files
			var range_start = parseInt( find_object_idx( this.sprites, { Name: first_item } ), 10 );
			var range_end = parseInt( find_object_idx( this.sprites, { Name: name } ), 10 );

			if ((range_start > -1) && (range_end > -1)) {
				if (range_start > range_end) { var temp = range_start; range_start = range_end; range_end = temp; }
				for (var idx = range_start; idx <= range_end; idx++) {
					var sprite = this.sprites[idx];
					this.select_sprite( sprite.Name );
				}
			}
		} // select range
		else {
			// select individual multiple
			if (this.selection[name]) this.deselect_sprite(name);
			else this.select_sprite(name);
		}
	} // mod key held
	else {
		// no mod key, select solo
		for (var sel_path in this.selection) {
			this.deselect_sprite(sel_path);
		}
		this.selection = {}; // clear all
		this.select_sprite(name);
	}
	
	if (num_keys(this.selection)) $('btn_choose_spreq').removeClass('disabled');
	else $('btn_choose_spreq').addClass('disabled');
};

spreq.deselect_sprite = function(name) {
	// deselect sprite
	$('spreq_file_'+name).className = 'file_object';
	delete this.selection[name];
};

spreq.select_sprite = function(name) {
	// select sprite
	$('spreq_file_'+name).className = 'file_object_selected';
	this.selection[name] = 1;
};

spreq.cancel_choose = function() {
	// hide dialog
	hide_popup_dialog();
};

spreq.do_choose = function() {
	// finalize selection in dialog
	if (num_keys(this.selection)) {
		hide_popup_dialog();
		for (var name in this.selection) {
			this.add_req( name );
		}
		delete this.temp_dom_id_prefix;
	}
};

spreq.add_req = function(name) {
	// add new sprite to req list
	var dom_id_prefix = this.temp_dom_id_prefix;
	
	var container = $('d_' + dom_id_prefix);
	var reqs = this.data[dom_id_prefix].reqs;
	var req = {
		Name: name
	};
	
	if (find_object(reqs, { Name: name })) {
		// do_message('error', "That sprite is already in the list.  Please select each sprite only once.");
		return;
	}
	
	var id = get_unique_id();
	
	var div = document.createElement('div');
	div.id = dom_id_prefix + '_' + id;
	div.setAttribute('id', dom_id_prefix + '_' + id);
	div.innerHTML = this.get_req_html(dom_id_prefix, id, req);
	container.appendChild(div);
	
	req._id = id;
	reqs.push( req );
};

spreq.get_req_html = function(dom_id_prefix, id, req) {
	// return HTML for single resource row
	var reqs = this.data[dom_id_prefix].reqs;
	var prefix = dom_id_prefix + '_' + id;
	var html = '';
	html += '<table class="prop_table"><tr>';
	html += '<td align="center" height="22">' + icon('delete.png', '', "spreq.delete_row('"+dom_id_prefix+"','"+id+"')", "Remove Sprite") + '</td>';
	
	html += '<td width="200">' + icon('cog.png', req.Name ) + '</td>';
		
	html += '</tr></table>';
	return html;
};

spreq.get_all = function(dom_id_prefix) {
	// get all resources
	return this.data[dom_id_prefix].reqs;
};

spreq.render_sprite_req_editor = function(dom_id_prefix, args) {
	// return HTML for custom resource editor
	this.data[dom_id_prefix] = args;
	var reqs = args.reqs;
	
	var html = '';
	html += '<div id="d_'+dom_id_prefix+'">';
	
	if (reqs.length) {
		reqs = sort_array( reqs, { sort_by: 'Name', sort_dir: 1 } );
		
		for (var idx = 0, len = reqs.length; idx < len; idx++) {
			var req = reqs[idx];
			req._id = get_unique_id();
			html += '<div id="'+dom_id_prefix+'_'+req._id+'">';
			html += this.get_req_html(dom_id_prefix, req._id, req);
			html += '</div>';
		}
	}
	
	html += '</div>';
	html += spacer(1,10) + '<br/>';
	html += '<div style="font-size:11px;">' + large_icon_button('cog_add.png', 'Add Sprites...', "spreq.add_req_dlg('"+dom_id_prefix+"')");
	html += '<div class="clear"></div></div>';
	
	return html;
};
