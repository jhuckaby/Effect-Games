// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

// Property Editor

function pe_add_property(dom_id_prefix) {
	// add new property to editor
	var container = $('d_' + dom_id_prefix);
	var props = session.pe_props[dom_id_prefix];
	var prop = {
		Name: '',
		Type: 'menu',
		Items: '',
		DefaultValue: ''
	};
	
	var id = get_unique_id();
	
	var div = document.createElement('div');
	div.id = dom_id_prefix + '_' + id;
	div.setAttribute('id', dom_id_prefix + '_' + id);
	div.innerHTML = pe_get_prop_html(dom_id_prefix, id, prop);
	container.appendChild(div);
	
	prop._id = id;
	
	props.push( prop );
}

function pe_redraw_row(dom_id_prefix, id) {
	// redraw row after a menu change
	var prefix = dom_id_prefix + '_' + id;
	var new_type = get_menu_value(prefix + '_type');
	var new_name = trim( $(prefix + '_name').value );
	var props = session.pe_props[dom_id_prefix];
	var prop = find_object( props, { _id: id } );
	assert(!!prop, "Could not find property: " + id);
	
	prop.Type = new_type;
	prop.Name = new_name;
	delete prop.DefaultValue;
	delete prop.Items;
	
	$(prefix).innerHTML = pe_get_prop_html(dom_id_prefix, id, prop);
}

function pe_delete_row(dom_id_prefix, id) {
	// delete row
	var prefix = dom_id_prefix + '_' + id;
	var container = $('d_' + dom_id_prefix);
	var props = session.pe_props[dom_id_prefix];
	
	var prop = find_object( props, { _id: id } );
	assert(!!prop, "Could not find property: " + id);
	
	var prop_idx = find_object_idx( props, { _id: id } );
	assert(prop_idx > -1, "Could not find property: " + id);
	
	props.splice( prop_idx, 1 );
	
	try { container.removeChild( document.getElementById(prefix) ); }
	catch (e) { alert("Could not remove child: " + id); }
}

function pe_get_prop_html(dom_id_prefix, id, prop) {
	// return HTML for single property row
	var prefix = dom_id_prefix + '_' + id;
	var html = '';
	html += '<table class="prop_table_small"><tr>';
	
	html += '<td align="center">' + icon('delete.png', '', "pe_delete_row('"+dom_id_prefix+"','"+id+"')", "Remove Property") + '</td>';
	
	html += '<td><nobr>Name:' + tiptext_field(prefix + '_name', 'fe_small', {'size':'13','maxlength':'32'}, {}, prop.Name, 'Property Name') + '</nobr></td>';
	
	html += '<td><nobr>Type:' + menu(prefix + '_type', [['menu','Menu'], ['text','Text Field'], ['checkbox','Checkbox']], prop.Type, 
		{ 'class':'fe_small_menu', onChange: "pe_redraw_row('"+dom_id_prefix+"','"+id+"')" }) + '</nobr></td>';
	
	switch (prop.Type) {
		case 'menu':
			html += '<td><nobr>Items:' + tiptext_field(prefix + '_items', 'fe_small', {'size':'16','maxlength':'4096'}, {}, prop.Items, '(Comma separate)') + '</nobr></td>';
			html += '<td><nobr>Default:' + tiptext_field(prefix + '_value', 'fe_small', {'size':'12','maxlength':'128'}, {}, prop.DefaultValue, 'Default Value') + '</nobr></td>';
			break;
		
		case 'text':
			html += '<td><nobr>Default:' + tiptext_field(prefix + '_value', 'fe_small', {'size':'12','maxlength':'128'}, {}, prop.DefaultValue, 'Default Value') + '</nobr></td>';
			break;
		
		case 'checkbox':
			html += '<td><nobr><input type=checkbox id="'+prefix+'_value" value="1" ' + ((prop.DefaultValue == 1) ? 'checked="checked"' : '') + '/>';
			html += '<label for="'+prefix+'_value" style="font-size: 11px;">Default Checked</label></nobr></td>';
			break;
	} // switch type
	
	html += '</tr></table>';
	return html;
}

function pe_prop_update_all(dom_id_prefix) {
	// update all properties from their DOM fields
	// type|interface|class|for|if|else|switch|case|function|window|var|return|in|length
	clear_field_error();
	var props = session.pe_props[dom_id_prefix];
	
	for (var idx = 0, len = props.length; idx < len; idx++) {
		var prop = props[idx];
		var id = prop._id;
		var prefix = dom_id_prefix + '_' + id;
		
		prop.Name = tiptext_value(prefix + '_name');
		if (!prop.Name) return bad_field(prefix+'_name', "Please enter a property name.");
		if (!prop.Name.match(/^[A-Za-z]\w*$/)) return bad_field(prefix+'_name', "Property names must be alphanumeric, and begin with a letter.");
		if (!check_reserved_word(prop.Name)) return bad_field(prefix+'_name', "The property name \""+prop.Name+"\" is a reserved word.  Please choose another.");
		
		prop.Type = get_menu_value(prefix + '_type');
		
		switch (prop.Type) {
			case 'menu':
				prop.Items = tiptext_value(prefix + '_items');
				if (!prop.Items) return bad_field(prefix+'_items', "Please enter one or more menu items for your property menu.");
				prop.DefaultValue = tiptext_value(prefix + '_value');
				break;
			
			case 'text':
				prop.DefaultValue = tiptext_value(prefix + '_value');
				break;
			
			case 'checkbox':
				prop.DefaultValue = $(prefix + '_value').checked ? '1' : '0';
				break;
		} // switch type
	} // foreach prop
	
	return true;
}

function pe_get_all_props(dom_id_prefix) {
	// return array of all properties
	return session.pe_props[dom_id_prefix];
}

function render_prop_editor(dom_id_prefix, props, save_btn_callback) {
	// return HTML for custom property editor
	if (!session.pe_props) session.pe_props = {};
	session.pe_props[dom_id_prefix] = props;
	
	var html = '';
	html += '<div id="d_'+dom_id_prefix+'">';
	
	if (props.length) {
		for (var idx = 0, len = props.length; idx < len; idx++) {
			var prop = props[idx];
			prop._id = get_unique_id();
			html += '<div id="'+dom_id_prefix+'_'+prop._id+'">';
			html += pe_get_prop_html(dom_id_prefix, prop._id, prop);
			html += '</div>';
		}
	}
	
	html += '</div>';
	html += spacer(1,10) + '<br/>';
	html += '<div style="font-size: 11px;">' + large_icon_button('application_form_add.png', 'Add Property...', "pe_add_property('"+dom_id_prefix+"')");
	
	if (save_btn_callback) {
		html += '<div class="fl">'+spacer(15,1)+'</div>';
		html += large_icon_button('disk.png', 'Save Properties', save_btn_callback);
	}
	
	html += '<div class="clear"></div></div>';
	
	return html;
}
