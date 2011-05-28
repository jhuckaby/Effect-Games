// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

// Resource List Editor

function re_delete_row(dom_id_prefix, id) {
	// delete row
	var prefix = dom_id_prefix + '_' + id;
	var container = $('d_' + dom_id_prefix);
	var args = session.re_args[dom_id_prefix];
	
	var res = find_object( args.resources, { _id: id } );
	assert(!!res, "Could not find resource: " + id);
	
	var res_idx = find_object_idx( args.resources, { _id: id } );
	assert(res_idx > -1, "Could not find resource: " + id);
	
	args.resources.splice( res_idx, 1 );
	
	try { container.removeChild( document.getElementById(prefix) ); }
	catch (e) { alert("Could not remove child: " + id); }
}

function re_add_res_dlg(dom_id_prefix) {
	// show dialog to choose resource asset
	var args = session.re_args[dom_id_prefix];
	session.temp_re_dom_id_prefix = dom_id_prefix;
	
	dasset.choose(args.dlg_title || "Select Resources", args.game_id, args.file_reg_exp, '', 're_add_res', args.strip_path, true || 'allow_multiple');
}

function re_add_res(paths) {
	// add new resource to editor
	var dom_id_prefix = session.temp_re_dom_id_prefix;
	delete session.temp_re_dom_id_prefix;
	
	var container = $('d_' + dom_id_prefix);
	var args = session.re_args[dom_id_prefix];
	
	for (var idx = 0, len = paths.length; idx < len; idx++) {
		var path = paths[idx];
		var res = {
			Path: path
		};
	
		if (!find_object(args.resources, { Path: path })) {
			var id = get_unique_id();
	
			var div = document.createElement('div');
			div.id = dom_id_prefix + '_' + id;
			div.setAttribute('id', dom_id_prefix + '_' + id);
			div.innerHTML = re_get_res_html(dom_id_prefix, id, res);
			container.appendChild(div);
	
			res._id = id;
			args.resources.push( res );
		} // unique res
	} // foreach asset selected
}

/* function re_paste_from_assetmgr(dom_id_prefix, id) {
	// paste link from asset manager
	var args = session.re_args[dom_id_prefix];
	var prefix = dom_id_prefix + '_' + id;
	
	if (window.assetmgr && window.assetmgr.clip_contents) {
		var clip = window.assetmgr.clip_contents;
		if (args.strip_path && (clip.indexOf(args.strip_path) == 0)) {
			clip = clip.substring( args.strip_path.length + 1 );
		}
		tiptext_set(prefix + '_path', clip);
	}
	else {
		do_message('error', "You have not copied a link from Asset Manager yet.");
	}
} */

function re_get_res_html(dom_id_prefix, id, res) {
	// return HTML for single resource row
	var args = session.re_args[dom_id_prefix];
	var prefix = dom_id_prefix + '_' + id;
	var html = '';
	html += '<table class="prop_table"><tr>';
	html += '<td align="center" height="22">' + icon('delete.png', '', "re_delete_row('"+dom_id_prefix+"','"+id+"')", "Remove Resource") + '</td>';
	
	html += '<td width="200">' + asset_icon_link(args.game_id, res.Path, '', 160) + '</td>';
	
	// html += '<td>' + tiptext_field(prefix + '_path', '', {'size':'30'}, {}, res.Path, args.path_tip || 'Resource Asset Path') + '</td>';
	// html += '<td style="font-size:11px;">' + icon('page_white_paste.png', '<b>Paste Link</b>', "re_paste_from_assetmgr('"+dom_id_prefix+"','"+id+"')") + '</td>';
	
	/* if (args.extra_menu && res.Path.match(new RegExp(args.extra_menu.file_reg_exp || '.+'))) {
		// title, id, items
		html += '<td class="fe_label">' + args.extra_menu.title + '&nbsp;' + 
			menu(prefix + '_' + args.extra_menu.id, args.extra_menu.items, res[args.extra_menu.id], {'class':'fe_small_menu'}) + '</td>';
	} */
	
	if (args.csv_menus && res.Path.match(new RegExp(args.csv_menus.file_reg_exp || '.+'))) {
		// multiple menus, csv style
		var csv_values = [];
		if (res[args.csv_menus.id]) csv_values = res[args.csv_menus.id].split(/\,\s*/);
		
		for (var idx = 0, len = args.csv_menus.menus.length; idx < len; idx++) {
			var csv_menu = args.csv_menus.menus[idx];
			var value = (typeof(csv_values[idx]) == 'undefined') ? '' : csv_values[idx].toString();
			if (csv_menu.prefix) {
				value = value.replace(new RegExp( "^" + csv_menu.prefix ), '');
			}
			
			var menu_id = prefix + '_' + args.csv_menus.id + '_' + idx;
			// Debug.trace('resedit', 'Drawing csv menu: ' + menu_id);
			
			html += '<td class="fe_label">' + csv_menu.title + '&nbsp;' + 
				menu(menu_id, csv_menu.items, value, {'class':'fe_small_menu'}) + '</td>';
		} // foreach menu
	} // csv_menus
	
	html += '</tr></table>';
	return html;
}

function re_update_all(dom_id_prefix) {
	// update all resources from DOM elements
	var args = session.re_args[dom_id_prefix];
	
	if (args.resources.length) {
		for (var idx = 0, len = args.resources.length; idx < len; idx++) {
			var res = args.resources[idx];
			var prefix = dom_id_prefix + '_' + res._id;
			
			/* if (args.extra_menu && $(prefix + '_' + args.extra_menu.id)) {
				res[ args.extra_menu.id ] = get_menu_value( prefix + '_' + args.extra_menu.id );
			} */
			
			// Debug.trace( 'resedit', "Grabbing value from csv menu prefix: " + prefix);
			
			if (args.csv_menus && $(prefix + '_' + args.csv_menus.id + '_0')) {
				var csv_values = [];
				
				// Debug.trace( 'resedit', "Got here" );
				
				for (var idy = 0, ley = args.csv_menus.menus.length; idy < ley; idy++) {
					var csv_menu = args.csv_menus.menus[idy];
					var menu_id = prefix + '_' + args.csv_menus.id + '_' + idy;
					
					// Debug.trace( 'resedit', "Got here, menu id: " + menu_id );
					
					var csv_value = get_menu_value( menu_id );
					if (csv_value.length) csv_values.push( (csv_menu.prefix || '') + csv_value );
				}
				
				res[ args.csv_menus.id ] = csv_values.join(',');
			} // csv_menus
		} // foreach res
	} // we have res
}

function re_get_all(dom_id_prefix) {
	// get all resources
	var args = session.re_args[dom_id_prefix];
	return args.resources;
}

function render_resource_editor(dom_id_prefix, args) {
	// return HTML for custom resource editor
	if (!session.re_args) session.re_args = {};
	session.re_args[dom_id_prefix] = args;
	
	var html = '';
	html += '<div id="d_'+dom_id_prefix+'">';
	
	// copy only compatible resources (could be shared list)
	var resources = [];
	var re = new RegExp( args.file_reg_exp || '.+' );
	for (var idx = 0, len = args.resources.length; idx < len; idx++) {
		var res = args.resources[idx];
		if (res.Path.toLowerCase().match(re)) resources.push(res);
	}
	args.resources = resources;
	
	if (args.resources.length) {
		args.resources = args.resources.sort( function(a, b) {
			// sort by file extension, then alphabetically
			var aext = a.Path.match(/\.(\w+)$/)[1].toLowerCase();
			var bext = b.Path.match(/\.(\w+)$/)[1].toLowerCase();
			if (aext == bext) {
				return (basename(b.Path).toLowerCase() < basename(a.Path).toLowerCase()) ? 1 : -1;
			}
			return (bext < aext) ? 1 : -1;
		} );
		
		for (var idx = 0, len = args.resources.length; idx < len; idx++) {
			var res = args.resources[idx];
			res._id = get_unique_id();
			html += '<div id="'+dom_id_prefix+'_'+res._id+'">';
			html += re_get_res_html(dom_id_prefix, res._id, res);
			html += '</div>';
		}
	}
	
	html += '</div>';
	html += spacer(1,10) + '<br/>';
	html += '<div style="font-size:11px;">' + large_icon_button('page_white_add.png', args.add_button || 'Add Resources...', "re_add_res_dlg('"+dom_id_prefix+"')");
	html += '<div class="clear"></div></div>';
	
	return html;
}
