// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.PlaceholderGen", {
	
	onActivate: function() {
		if (!require_login()) {
			return false;
		}
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			[Nav.currentAnchor(), 'Placeholder Image Generator']
		);
		
		Nav.title( "Placeholder Image Generator" );
		
		if (!session.storage.placeholder_gen) session.storage.placeholder_gen = {
			Width: '64',
			Height: '64',
			BackgroundColor: '#0000ff',
			BackgroundOpacity: '0.5',
			BorderColor: '#000000',
			BorderSize: '1',
			PointSize: '9',
			TextColor: '#000000',
			Label: 'Placeholder',
			Format: 'PNG'
		};
		var prefs = this.prefs = session.storage.placeholder_gen;
		
		var html = '';
		html += '<h1>Placeholder Image Generator</h1>';
		
		html += '<div class="blurb">' + get_string('/PlaceholderGen/Blurb') + '</div>';
		
		html += '<form method=get action="javascript:void(0)">';
		html += '<table style="margin:20px;">';
		
		// image size
		html += '<tr><td align=right class="fe_label_left">Image&nbsp;Size:*</td>';
		html += '<td align=left>';
		html += '<input type=text id="fe_pig_width" class="fe_medium" size=5 onChange="$P().get_preview()" value="'+escape_text_field_value(prefs.Width)+'"/>&nbsp;x&nbsp;<input type=text id="fe_pig_height" class="fe_medium" size=5 onChange="$P().get_preview()" value="'+escape_text_field_value(prefs.Height)+'"/>&nbsp;(pixels)';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Enter the pixel width and height of your placeholder image.  This should be the final size, regardless of border (the border will be rendered inside, and will not increase the size). </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// shape
		html += '<tr><td align=right class="fe_label_left">Shape:*</td>';
		html += '<td align=left>' + menu('fe_pig_shape', ['Rectangle',['RoundRectangle','Round Rectangle'],'Triangle','Circle'], prefs.Shape, 
			{ 'class':'fe_medium_menu', 'onChange':'$P().get_preview()' }) + '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose a primitive geometric shape for your placeholder image. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// background color and opacity
		var op_items = [
			['0.0', '0%'],
			['0.1', '10%'],
			['0.2', '20%'],
			['0.3', '30%'],
			['0.4', '40%'],
			['0.5', '50%'],
			['0.6', '60%'],
			['0.7', '70%'],
			['0.8', '80%'],
			['0.9', '90%'],
			['1.0', '100%']
		];
		html += '<tr><td align=right class="fe_label_left">Background:</td>';
		html += '<td align=left>';
			html += '<input type=hidden id="fe_pig_bkgnd_color" value="'+escape_text_field_value(prefs.BackgroundColor)+'"/>';
			html += '<table><tr>';
			html += '<td id="td_pig_bkgnd_color">' + get_color_preview(prefs.BackgroundColor) + '</td>';
			html += '<td>' + spacer(4,1) + '</td>';
			html += '<td style="font-size:11px">' + large_icon_button('color_wheel.png', "Select Color...", "$P('PlaceholderGen').do_choose_bkgnd_color()") + 
				'<div class="clear"></div></td>';
			html += '<td>' + spacer(4,1) + '</td>';
			html += '<td><b>Opacity:</b></td>';
			html += '<td>' + menu('fe_pig_bkgnd_opacity', op_items, prefs.BackgroundOpacity, 
				{ 'class':'fe_small_menu', 'onChange':'$P().get_preview()' }) + '</td>';
			html += '</tr></table>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose a background color and opacity for your image. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// border color and thickness
		var bs_items = [
			['0','Disabled'], 
			['1','1 pixel'], 
			['2','2 pixels'], 
			['3','3 pixels'], 
			['4','4 pixels']
		];
		html += '<tr><td align=right class="fe_label_left">Border:</td>';
		html += '<td align=left>';
			html += '<input type=hidden id="fe_pig_border_color" value="'+escape_text_field_value(prefs.BorderColor)+'"/>';
			html += '<table><tr>';
			html += '<td id="td_pig_border_color">' + get_color_preview(prefs.BorderColor) + '</td>';
			html += '<td>' + spacer(4,1) + '</td>';
			html += '<td style="font-size:11px">' + large_icon_button('color_wheel.png', "Select Color...", "$P('PlaceholderGen').do_choose_border_color()") + 
				'<div class="clear"></div></td>';
			html += '<td>' + spacer(4,1) + '</td>';
			html += '<td><b>Thickness:</b></td>';
			html += '<td>' + menu('fe_pig_border_size', bs_items, prefs.BorderSize, 
				{ 'class':'fe_small_menu', 'onChange':'$P().get_preview()' }) + '</td>';
			html += '</tr></table>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose a border color and thickness for you image. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// label
		html += '<tr><td align=right class="fe_label_left">Label:</td>';
		html += '<td align=left><input type=text id="fe_pig_label" class="fe_medium" size="25" maxlength="32" onChange="$P().get_preview()" value="'+escape_text_field_value(prefs.Label)+'"></td></tr>';
		html += '<tr><td></td><td class="caption"> Optionally enter a text label for your image, and choose a font size and color below. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// point size
		html += '<tr><td align=right class="fe_label_left">Font&nbsp;Size:</td>';
		html += '<td align=left>';
		html += '<input type="text" id="fe_pig_pointsize" class="fe_medium" size="5" onChange="$P().get_preview()" value="'+escape_text_field_value(prefs.PointSize)+'"/>&nbsp;(points)';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> If you entered a label for your image above, select the font point size here. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// text color
		html += '<tr><td align=right class="fe_label_left">Text&nbsp;Color:</td>';
		html += '<td align=left>';
			html += '<input type=hidden id="fe_pig_text_color" value="'+escape_text_field_value(prefs.TextColor)+'"/>';
			html += '<table><tr>';
			html += '<td id="td_pig_text_color">' + get_color_preview(prefs.TextColor) + '</td>';
			html += '<td>' + spacer(4,1) + '</td>';
			html += '<td style="font-size:11px">' + large_icon_button('color_wheel.png', "Select Color...", "$P('PlaceholderGen').do_choose_text_color()") + 
				'<div class="clear"></div></td>';
			html += '</tr></table>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> If you entered a label for your image above, choose the text color here. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// format
		html += '<tr><td align=right class="fe_label_left">Image&nbsp;Format:*</td>';
		html += '<td align=left>' + menu('fe_pig_format', ['PNG','GIF','JPEG'], prefs.Format, 
			{ 'class':'fe_medium_menu', 'onChange':'$P().get_preview()' }) + '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose the output format for your image.  Note that only PNG images support alpha transparency. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// preview
		html += '<tr><td colspan=2>';
		html += '<fieldset><legend>Image Preview</legend>';
			html += '<table><tr>';
			
				html += '<td style="font-size:11px"><b>Background:</b>&nbsp;' + 
					menu('fe_pig_previewbkgnd', [
						['checkerboard.gif','Checkerboard'],
						['#000','Black'],
						['#fff','White'],
						['#888','Gray']
					], '', { onChange: "$P('PlaceholderGen').get_preview()" }) + '</td>';
				
				html += '<td>' + spacer(8,1) + '</td>';
				
				html += '<td style="font-size:11px">' + large_icon_button('arrow_refresh.png', "Update Preview", "$P().get_preview()") + 
					'<div class="clear"></div></td>';
				
				html += '<td>' + spacer(8,1) + '</td>';
				
				html += '<td style="font-size:11px">' + large_icon_button('disk.png', "Download Image...", "$P().download_preview()") + 
					'<div class="clear"></div></td>';
				
				html += '<td>' + spacer(8,1) + '</td>';

				html += '<td style="font-size:11px">' + large_icon_button('folder_go.png', "Save as Asset...", "$P().show_save_as_dialog()") + 
					'<div class="clear"></div></td>';
			
			html += '</tr></table>';
			html += '<div id="d_pig_preview_scrollarea">';
			html += '</div>';
		html += '</fieldset>';
		html += '</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// footer
		html += '<tr><td colspan="2" align="right" class="fe_label">* Denotes a required field.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '</table>';
		
		html += '</form>';
				
		var self = this;
		setTimeout( function() {
			self.get_preview();
		}, 1 );
		
		this.div.innerHTML = html;
		
		return true;
	},
	
	do_choose_bkgnd_color: function() {
		do_select_color($('fe_pig_bkgnd_color').value, [this, 'do_choose_bkgnd_color_finish'], 'Select Background Color');
	},
	
	do_choose_bkgnd_color_finish: function(hex) {
		$('fe_pig_bkgnd_color').value = hex;
		$('td_pig_bkgnd_color').innerHTML = get_color_preview(hex);
		this.get_preview();
	},
	
	do_choose_border_color: function() {
		do_select_color($('fe_pig_border_color').value, [this, 'do_choose_border_color_finish'], 'Select Border Color');
	},
	
	do_choose_border_color_finish: function(hex) {
		$('fe_pig_border_color').value = hex;
		$('td_pig_border_color').innerHTML = get_color_preview(hex);
		this.get_preview();
	},
	
	do_choose_text_color: function() {
		do_select_color($('fe_pig_text_color').value, [this, 'do_choose_text_color_finish'], 'Select Text Color');
	},
	
	do_choose_text_color_finish: function(hex) {
		$('fe_pig_text_color').value = hex;
		$('td_pig_text_color').innerHTML = get_color_preview(hex);
		this.get_preview();
	},
	
	get_image_args: function() {
		clear_field_error();
		
		var args = {
			Width: trim($('fe_pig_width').value),
			Height: trim($('fe_pig_height').value),
			Shape: get_menu_value('fe_pig_shape'),
			BackgroundColor: $('fe_pig_bkgnd_color').value,
			BackgroundOpacity: get_menu_value('fe_pig_bkgnd_opacity'),
			BorderColor: $('fe_pig_border_color').value,
			BorderSize: get_menu_value('fe_pig_border_size'),
			Label: trim($('fe_pig_label').value),
			PointSize: trim($('fe_pig_pointsize').value),
			TextColor: $('fe_pig_text_color').value,
			Format: get_menu_value('fe_pig_format').toLowerCase()
		};
		
		if (!args.Width || !args.Width.match(/^\d+$/) || (parseInt(args.Width, 10) > 1024))
			return bad_field('fe_pig_width', "Your image width must be an integer between 1 and 1024.");
		
		if (!args.Height || !args.Height.match(/^\d+$/) || (parseInt(args.Height, 10) > 1024))
			return bad_field('fe_pig_height', "Your image height must be an integer between 1 and 1024.");
		
		if (!args.PointSize || !args.PointSize.match(/^\d+$/) || (parseInt(args.PointSize, 10) > 200))
			return bad_field('fe_pig_pointsize', "Your font point size must be an integer between 1 and 200.");
		
		// save prefs
		for (var key in args) this.prefs[key] = args[key];
		user_storage_mark();
		
		return args;
	},
	
	get_preview_url: function() {
		var args = this.get_image_args();
		if (!args) return null;
		
		var url = '/effect/api/preview_placeholder_image.' + args.Format.toLowerCase() + composeQueryString({
			width: args.Width,
			height: args.Height,
			shape: args.Shape,
			bkgnd_color: args.BackgroundColor,
			bkgnd_opacity: args.BackgroundOpacity,
			border_color: args.BorderColor,
			border_size: args.BorderSize,
			label: args.Label,
			pointsize: args.PointSize,
			text_color: args.TextColor,
			format: args.Format
		});
		
		return url;
	},
	
	get_preview: function() {
		var args = this.get_image_args();
		if (!args) return null;
		
		var url = this.get_preview_url();
		
		Debug.trace('placeholder', "Requesting placeholder image: " + url);
		
		var bkgnd = get_menu_value('fe_pig_previewbkgnd');
		var bkgnd_sty = bkgnd.match(/\#\w+$/) ? 
			('background-color:'+bkgnd+';') : 
			('background-image:url(images/font_preview_backgrounds/'+bkgnd+');');
		
		$('d_pig_preview_scrollarea').innerHTML = 
			'<center><div style="margin:10px; padding:20px; display:inline-block; border:1px solid #aaa; '+bkgnd_sty+'">' + 
			'<img src="'+url+'" width="'+args.Width+'" height="'+args.Height+'"/>' + 
			'</div></center>';
	},
	
	download_preview: function() {
		var url = this.get_preview_url();
		if (!url) return null;
		
		url += '&download=' + escape('placeholder_image.' + get_menu_value('fe_pig_format').toLowerCase());
		location.href = url;
	},
	
	show_save_as_dialog: function() {
		dasset.save_as('Save Placeholder Image As...', '', [this, 'do_save_as'], '/images', 'placeholder.' + get_menu_value('fe_pig_format').toLowerCase());
	},
	
	do_save_as: function(game_id, path, filename) {
		var args = this.get_image_args();
		if (!args) return null;
		
		show_progress_dialog(1, "Saving placeholder image...");
		
		effect_api_send('generate_placeholder_image', merge_objects(args, {
			GameID: game_id,
			Path: path,
			Filename: filename
		}), [this, 'save_as_finish'], { _filename: filename });
	},
	
	save_as_finish: function(response, tx) {
		hide_popup_dialog();
		do_message('success', "Saved placeholder image: \""+tx._filename+"\"");
	}

} );
