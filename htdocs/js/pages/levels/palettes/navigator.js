// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

LevelEditor.Palette.subclass( 'LevelEditor.NavigatorPalette', {
	name: 'navigator',
	icon: 'search.png',
	title: 'Navigator',
	
	setup: function() {
		// setup palette
		this.mod_date = hires_time_now();
		this.dirty = true;
		this.submit_in_progress = false;
		
		// determine thumbnail image size
		var size = this.size = custom_fit(parseInt(this.page.level.Width, 10), parseInt(this.page.level.Height, 10), 168, 100);
		var margin_left = Math.floor( (176 - size.width) / 2 );
		var html = '';
		html += '<div id="d_emp_nav_area" style="width:'+size.width+'px; height:'+size.height+'px; margin-left:'+margin_left+'px;">';
		
		// background layer
		html += '<div id="d_emp_nav_bkgnd" class="emp_nav_layer" style="width:'+size.width+'px; height:'+size.height+'px; z-index:0; background-color:'+this.page.level.BackgroundColor+';">';
		if (this.page.level.BackgroundImage) {
			var bkgnd_url = '/effect/api/game_level_bkgnd_preview.png' + composeQueryString({
				game_id: this.page.game_id,
				level_id: this.page.level_id,
				image: this.page.level.BackgroundImage,
				width: size.width,
				height: size.height,
				env: this.page.level.Env || '',
				mod: this.mod_date
			});
			html += '<img class="png" src="'+bkgnd_url+'" width="'+size.width+'" height="'+size.height+'"/>';
		}
		html += '</div>';
		
		var layers = this.layers = deep_copy_object( always_array( this.page.level.Layers.Layer ) );
		for (var idx = 0, len = this.layers.length; idx < len; idx++) {
			var layer = this.layers[idx];
			var plane = this.page._port.getPlane( layer.Name );
			
			layer.dirty = true;
			layer.bounds = {
				left: 0, 
				top: 0, 
				right: (layer.Type == 'tile') ? plane.getMaxTileX() : this.page._port.virtualWidth,
				bottom: (layer.Type == 'tile') ? plane.getMaxTileY() : this.page._port.virtualHeight
			};
			
			var url = this.get_layer_image_url( layer.Name );
			html += '<div id="d_emp_nav_layer_'+layer.Name+'" class="emp_nav_layer" style="width:'+size.width+'px; height:'+size.height+'px; z-index:'+layer.ZIndex+';"></div>';
		} // foreach layer
		
		this.scale_factor_x = (parseInt(this.page.level.Width, 10) / size.width);
		this.scale_factor_y = (parseInt(this.page.level.Height, 10) / size.height);
		
		// marquee
		this.mq_width = Math.floor( parseInt(this.page.game.PortWidth, 10) / this.scale_factor_x );
		if (!this.mq_width) this.mq_width = 1;
		
		this.mq_height = Math.floor( parseInt(this.page.game.PortHeight, 10) / this.scale_factor_y );
		if (!this.mq_height) this.mq_height = 1;
		
		html += '<div id="d_emp_nav_marquee" style="width:'+this.mq_width+'px; height:'+this.mq_height+'px;"></div>';
		
		html += '</div>';
		this.set_content( html );
		this.show();
		
		var self = this;
		setTimeout( function() { self.post_setup(); }, 1 );
	},
	
	set_bkgnd_visibility: function(visible) {
		// set background visibility
		if (visible) {
			$('d_emp_nav_bkgnd').show();
			$('d_emp_nav_marquee').style.border = '1px dashed white';
		}
		else {
			$('d_emp_nav_bkgnd').hide();
			$('d_emp_nav_marquee').style.border = '1px dashed black';
		}
	},
	
	set_layer_visibility: function(layer_id, visible) {
		// set layer visibility
		if (visible) $('d_emp_nav_layer_'+layer_id).show();
		else $('d_emp_nav_layer_'+layer_id).hide();
	},
	
	get_layer_image_url: function(layer_id) {
		return '/effect/api/game_level_layer_preview.png' + composeQueryString({
			game_id: this.page.game_id,
			level_id: this.page.level_id,
			layer_id: layer_id,
			width: this.size.width,
			height: this.size.height,
			mod: this.mod_date,
			env: this.page.level.Env || ''
		});
	},
	
	post_setup: function() {
		// continue setup after DOM elements are available
		this.area = $('d_emp_nav_area');
		this.area.captureMouse = this;
		
		this.mq = $('d_emp_nav_marquee');
		this.mq.style.cursor = ff ? '-moz-grab' : 'url(images/cursors/hand_opened.cur) 8 8, move';
		
		this.idle();
	},
	
	shutdown: function() {
		// remove timer
		if (this.timer) {
			clearTimeout( this.timer );
			this.timer = null;
		}
	},
	
	idle: function() {
		// check for dirty level and commit to server
		if (page_manager.current_page_id == 'GameLevelMapEdit') {
			if (this.dirty && !this.submit_in_progress &&  !session.mouseIsDown) {
				Debug.trace('nav', "Level may be dirty, checking for changes");
				this.flush_queue();
			} // dirty
			
			this.timer = setTimeout( "$P('GameLevelMapEdit').pal('navigator').idle()", 5000 );
		}
	},
	
	raw_tile_lookup: function(plane, tx, ty) {
		// like TilePlane.lookupTile(), but no map conversion (raw idx output)
		if ((tx < 0) || (ty < 0) || (tx >= plane.data.length)) return 0;
		var col = plane.data[tx];
		if (!col || (ty >= col.length)) return 0;
		return col[ty] || 0;
	},
	
	flush_queue: function() {
		// find first dirty layer and commit it
		var layer = find_object( this.layers, { dirty: true } );
		if (layer) {
			Debug.trace('nav', "Dirty layer: " + layer.Name);
			var plane = this.page._port.getPlane( layer.Name );
			var data = null;
			var bounds = null;
			
			switch (layer.Type) {
				case 'tile':
					bounds = {
						left: layer.bounds.left * plane.tileSizeX,
						top: layer.bounds.top * plane.tileSizeY,
						right: layer.bounds.right * plane.tileSizeX,
						bottom: layer.bounds.bottom * plane.tileSizeY
					};
					data = {
						left: layer.bounds.left,
						top: layer.bounds.top,
						right: layer.bounds.right,
						bottom: layer.bounds.bottom
					};
					
					// copy affected tiles over to new 2d array
					// if bounds encompass every single tile (i.e. complete flood fill) skip this step
					if (!layer.bounds.left && !layer.bounds.top && (layer.bounds.right == plane.getMaxTileX()) && (layer.bounds.bottom == plane.getMaxTileY())) {
						data.tiles = plane.data;
					}
					else {
						var tiles = [];
						var twidth = data.right - data.left;
						var theight = data.bottom - data.top;
						for (var tx = 0; tx < twidth; tx++) {
							var col = tiles[tx] = [];
							for (var ty = 0; ty < theight; ty++) {
								// col[ty] = plane.lookupTile( tx + data.left, ty + data.top );
								col[ty] = this.raw_tile_lookup(plane, tx + data.left, ty + data.top);
							} // y loop
						} // x loop
						data.tiles = tiles;
					}
					data.map = plane.map;
					break;
				
				case 'sprite':
					data = [];
					bounds = new this.page._iframe.Rect();
					bounds.set( layer.bounds );
					
					var sprite_defs = {};
					if (this.page._def.Sprites.Sprite) {
						var sprites = always_array( this.page._def.Sprites.Sprite );
						for (var idx = 0, len = sprites.length; idx < len; idx++) {
							var sprite = sprites[idx];
							sprite_defs[ sprite.Name ] = sprite;
						} // foreach sprite def
					} // game has sprite classes
					
					for (var key in plane.sprites) {
						var sprite = plane.sprites[key];
						var spriteRect = new this.page._iframe.Rect( sprite.x, sprite.y, sprite.x + sprite.width, sprite.y + sprite.width );
						if (bounds.rectIn(spriteRect)) {
							var obj = {
								x: sprite.x,
								y: sprite.y,
								width: sprite.width,
								height: sprite.height
							};
							var icon = sprite_defs[sprite.type].Icon;
							if (icon) obj.icon = icon;
							Debug.trace('nav', "Serializing sprite: " + serialize(obj));
							data.push(obj);
						} // sprite within bounds
					} // foreach sprite onscreen
					
					var sprites = plane.getAllAetherSprites();
					for (var idx = 0, len = sprites.length; idx < len; idx++) {
						var sprite = sprites[idx];
						var spriteRect = new this.page._iframe.Rect( sprite.x, sprite.y, sprite.x + sprite.width, sprite.y + sprite.width );
						if (bounds.rectIn(spriteRect)) {
							var obj = {
								x: sprite.x,
								y: sprite.y,
								width: sprite.width,
								height: sprite.height
							};
							var icon = sprite_defs[sprite.type].Icon;
							if (icon) obj.icon = icon;
							Debug.trace('nav', "Serializing sprite: " + serialize(obj));
							data.push(obj);
						} // sprite within bounds
					} // foreach aether sprite
					break;
			} // switch layer.Type
			
			// resetting these here in case user dirties the layer while saving
			layer.dirty = false;
			layer.bounds = { left:-1, top:-1, right:-1, bottom:-1 };
			
			this.submit_in_progress = true;
			
			effect_api_send('game_save_level_nav_data', {
				GameID: this.page.game_id,
				LevelID: this.page.level_id,
				LayerID: layer.Name,
				Width: this.size.width,
				Height: this.size.height,
				Left: bounds.left,
				Top: bounds.top,
				Right: bounds.right,
				Bottom: bounds.bottom,
				Data: serialize( data, '=>' )
			}, [this, 'save_finish'], { _layer_id: layer.Name, _on_error: [this, 'onError'] });
		}
		else {
			// all clean
			this.dirty = false;
		}
	},
	
	onError: function(response, tx) {
		this.submit_in_progress = false;
		Debug.trace('nav', "Failed to update nav: " + response.Description);
		if (Debug.enabled) do_error( response.Description );
	},
	
	save_finish: function(response, tx) {
		// refresh image in nav palette
		var layer_id = tx._layer_id;
		this.mod_date = hires_time_now();
		
		this.submit_in_progress = false;
		
		var self = this;
		setTimeout( function() {
			// not the best idea to fetch the image at the EXACT instant it is done updating (async storage much?)
			// need to figure out a better way to do this later.  some storage ops can be flagged as 'instant'?
			var url = self.get_layer_image_url(layer_id);
			Debug.trace('nav', "Refreshing layer image: " + layer_id + ": " + url);
			$('d_emp_nav_layer_'+layer_id).style.backgroundImage = 'url('+url+')';
		}, 1 );
		
		this.flush_queue();		
	},
	
	mark: function(layer_id, left, top, right, bottom) {
		// mark area of layer as dirty
		var layer = find_object(this.layers, { Name: layer_id } );
		if (!layer) alert("Cannot find layer: " + layer_id);
		
		Debug.trace('nav', "Marking layer as dirty: " + layer_id + ": " + left + 'x' + top + ', ' + right + 'x' + bottom);
		
		layer.dirty = true;
		this.dirty = true;
		
		if ((layer.bounds.left == -1) || (left < layer.bounds.left)) layer.bounds.left = left;
		if ((layer.bounds.top == -1) || (top < layer.bounds.top)) layer.bounds.top = top;
		if ((layer.bounds.right == -1) || (right > layer.bounds.right)) layer.bounds.right = right;
		if ((layer.bounds.bottom == -1) || (bottom > layer.bounds.bottom)) layer.bounds.bottom = bottom;
	},
	
	update_marquee: function() {
		// update marquee position from page scroll
		if (this.mq) {
			var mqx = Math.floor( this.page.scrollx / this.scale_factor_x );
			if (mqx >= (this.size.width - this.mq_width) - 1) mqx = (this.size.width - this.mq_width) - 2;
			
			var mqy = Math.floor( this.page.scrolly / this.scale_factor_y );
			if (mqy >= (this.size.height - this.mq_height) - 1) mqy = (this.size.height - this.mq_height) - 2;
		
			this.mq.style.left = '' + mqx + 'px';
			this.mq.style.top = '' + mqy + 'px';
		}
	},
	
	ptInMarquee: function(pt) {
		// check if point is inside the marquee rect
		return(
			(pt.x >= this.mq.offsetLeft) && (pt.x < this.mq.offsetLeft + this.mq.offsetWidth) && 
			(pt.y >= this.mq.offsetTop) && (pt.y < this.mq.offsetTop + this.mq.offsetHeight)
		);
	},
	
	onMouseDown: function(e, pt) {
		if (this.ptInMarquee(pt)) {
			this.mq_offset_x = pt.x - this.mq.offsetLeft;
			this.mq_offset_y = pt.y - this.mq.offsetTop;
		}
		else {
			this.mq_offset_x = Math.floor( this.mq_width / 2 );
			this.mq_offset_y = Math.floor( this.mq_height / 2 );
		}
		this.onMouseMove(e, pt);
		this.mq.style.cursor = ff ? '-moz-grabbing' : 'url(images/cursors/hand_closed.cur) 8 8, move';
		
		return false;
	},
	
	onMouseMove: function(e, pt) {
		var mqx = pt.x - this.mq_offset_x;
		if (mqx < 0) mqx = 0;
		if (mqx > (this.size.width - this.mq_width) - 0) mqx = (this.size.width - this.mq_width) - 0;
		
		var mqy = pt.y - this.mq_offset_y;
		if (mqy < 0) mqy = 0;
		if (mqy > (this.size.height - this.mq_height) - 0) mqy = (this.size.height - this.mq_height) - 0;
		
		this.page.set_scroll(
			mqx * this.scale_factor_x,
			mqy * this.scale_factor_y
		);
		
		if (mqx >= (this.size.width - this.mq_width) - 1) mqx = (this.size.width - this.mq_width) - 2;
		if (mqy >= (this.size.height - this.mq_height) - 1) mqy = (this.size.height - this.mq_height) - 2;
		
		this.mq.style.left = '' + mqx + 'px';
		this.mq.style.top = '' + mqy + 'px';
		
		return true;
	},
	
	onMouseUp: function(e, pt) {
		this.mq.style.cursor = ff ? '-moz-grab' : 'url(images/cursors/hand_opened.cur) 8 8, move';
		return false;
	}
} );























































