// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.GameLevels", {
	
	first_activation: true,
	
	onInit: function() {
		// render page HTML
		var html = '';
		
		html += '<h1 id="h_game_levels_header">Loading...</h1>';
		
		html += '<div id="d_game_levels_tab_bar"></div>';
		
		html += '<div id="d_game_levels_content" class="game_main_area">';
		html += '<div class="blurb">' + get_string('/GameLevels/Blurb') + '</div>';
		
		// levels
		html += '<div class="h1">';
			html += '<div id="d_game_levels_header" class="fl">';
				html += ''; // Game Levels
			html += '</div>';
			html += '<div class="fr">';
				html += '<a id="a_game_levels_create_level_link" class="icon add_level" href="#GameLevelEdit" title="Create New Level">Create New Level</a>';
			html += '</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		html += '<div id="d_game_levels">'+busy()+'</div>';
		html += '<div style="height:15px;"></div>';
		
		// envs
		html += '<div class="h1">';
			html += '<div id="d_game_envs_header" class="fl">';
				html += ''; // Game Envs
			html += '</div>';
			html += '<div class="fr">';
				html += '<a id="a_game_levels_create_env_link" class="icon add_env" href="#GameEnvEdit" title="Create New Environment">Create New Environment</a>';
			html += '</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		html += '<div id="d_game_envs">'+busy()+'</div>';
		html += '<div style="height:15px;"></div>';
		
		// properties
		html += '<div id="d_game_levels_props"></div>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(game_id) {
		if (!require_login()) {
			return false;
		}
		
		$('d_game_levels').innerHTML = loading_image();
		$('d_game_levels_props').innerHTML = loading_image();
		
		if (this.first_activation) {
			this.first_activation = false;
		}
		
		// see if game is already loaded via game page
		var gpage = page_manager.find('Game');
		if (gpage && gpage.game && (gpage.game.GameID == game_id)) {
			this.game = gpage.game;
			this.game_id = gpage.game.GameID;
			this.receive_game();
		}
		else {
			// game not loaded or switched, load again
			effect_api_get('game_get', { 
				id: game_id
			}, [this, 'receive_game'], {});
		}
		
		effect_api_get('game_level_props_get', {
			id: game_id
		}, [this, 'receive_props'], {});
		
		show_glog_widget( game_id );
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		$('h_game_levels_header').innerHTML = '';
		$('d_game_levels_tab_bar').innerHTML = '';
		$('d_game_levels').innerHTML = '';
		$('d_game_levels_props').innerHTML = '';
		hide_glog_widget();
		return true;
	},
	
	setup_nav: function() {
		// setup title and nav
		Nav.title( "Levels | " + this.game.Title );
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			[Nav.currentAnchor(), 'Levels']
		);
	},
	
	receive_game: function(response, tx) {
		// receive game info from server
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID; 
		}
		
		this.setup_nav();
		
		$('d_game_levels_tab_bar').innerHTML = get_game_tab_bar(this.game_id, 'Levels');
		
		$('h_game_levels_header').innerHTML = fit_game_title(this.game.Title);
		
		$('a_game_levels_create_level_link').setAttribute('href', '#GameLevelEdit?game_id=' + this.game_id );
		$('a_game_levels_create_level_link').href = '#GameLevelEdit?game_id=' + this.game_id;
		
		$('a_game_levels_create_env_link').setAttribute('href', '#GameEnvEdit?game_id=' + this.game_id );
		$('a_game_levels_create_env_link').href = '#GameEnvEdit?game_id=' + this.game_id;
		
		effect_api_get('game_objects_get', { 
			id: this.game_id,
			levels: 1,
			envs: 1
		}, [this, 'receive_levels'], {});
	},
	
	receive_levels: function(response, tx) {
		// levels
		var html = '';
		if (typeof(response.Levels) != 'undefined') {
			if (response.Levels && response.Levels.Level) {
				var levels = this.levels = sort_array( always_array( response.Levels.Level ), { sort_by: 'Name', sort_dir: 1 } );
				html += '<table class="data_table">';
				html += '<tr><th>Level ID</th><th>Preload</th><th>Size&nbsp;(Pixels)</th><th>Layers</th><th>Environment</th><th>Resources</th><th>Actions</th></tr>';
			
				for (var idx = 0, len = levels.length; idx < len; idx++) {
					var level = levels[idx];
				
					var res_text = '';
					var nums = { images:0, audio:0, text:0, video:0 };
					if (level.Resources.Resource) {
						var resources = always_array(level.Resources.Resource);
						for (var idy = 0, ley = resources.length; idy < ley; idy++) {
							var res = resources[idy];
							if (res.Path.match(session.imageResourceMatch)) nums.images++;
							else if (res.Path.match(session.audioResourceMatch)) nums.audio++;
							else if (res.Path.match(session.textResourceMatch)) nums.text++;
							else if (res.Path.match(session.movieResourceMatch)) nums.video++;
						} // foreach resource
						
						res_arr = [];
						if (nums.images) res_arr.push( nums.images + ' ' + pluralize('image') );
						if (nums.audio) res_arr.push( nums.audio + ' audio' );
						if (nums.text) res_arr.push( nums.text + ' text' );
						if (nums.video) res_arr.push( nums.video + ' video' );
						res_text += res_arr.join(', ');
					} // has resources
					else res_text = '(None)';
				
					var num_req = (level.Requires && level.Requires.Require) ? always_array(level.Requires.Require).length : 0;
					var req_text = num_req ? ('' + num_req + ' ' + pluralize('sprite', num_req)) : '(None)';
					
					var num_layers = (level.Layers && level.Layers.Layer) ? always_array(level.Layers.Layer).length : 0;
				
					var edit_link = '#GameLevelEdit?game_id=' + this.game_id + '&level_id=' + level.Name;
					var edit_map_link = '#GameLevelMapEdit?game_id=' + this.game_id + '&level_id=' + level.Name;
				
					html += '<tr>';
					html += '<td>' + icon('world.png', '<b>' + ww_fit_string(level.Name, 200, session.em_width, 1) + '</b>', edit_link) + '</td>';
					html += '<td align="center">' + ((level.Preload == 1) ? icon('accept.png') : '') + '</td>';
					html += '<td>' + commify(level.Width) + ' x ' + commify(level.Height) + '</td>';
					html += '<td>' + num_layers + '</td>';
					// html += '<td>' + req_text + '</td>';
					html += '<td>' + (level.Env ? level.Env : '(None)') + '</td>';
					html += '<td>' + res_text + '</td>';
					/* html += '<td><a href="'+edit_link+'">Edit Info</a> | ' + 
						(num_layers ? ('<a href="'+edit_map_link+'">Edit Map</a> | ') : '') + 
						code_link("$P('GameLevels').delete_game_object('level','"+level.Name+"')", "Delete") + '</td>'; */
						
					html += '<td><table cellspacing="0" cellpadding="0" border="0"><tr>';
					html += '<td style="background:transparent"><nobr>' + icon('layout_edit.png', 'Edit Info', edit_link) + '</nobr></td>';
					html += '<td style="background:transparent">&nbsp;|&nbsp;</td>';
					if (num_layers) {
						html += '<td style="background:transparent"><nobr>' + icon('world_edit.png', 'Edit Map', edit_map_link) + '</nobr></td>';
						html += '<td style="background:transparent">&nbsp;|&nbsp;</td>';
					}
					html += '<td style="background:transparent"><nobr>' + icon('trash', 'Delete', "$P('GameLevels').delete_game_object('level','"+level.Name+"')") + '</nobr></td>';
					html += '</tr></table></td>';
					
					html += '</tr>';
				} // foreach level
				html += '</table>';
			
				$('d_game_levels_header').innerHTML = 'Levels (' + levels.length + ')';
			} // we have levels
			else {
				$('d_game_levels_header').innerHTML = 'Levels';
				html += 'No levels found.  Why not <a href="#GameLevelEdit?game_id='+this.game_id+'">create a new one?</a>';
				this.levels = [];
			}
			html += '<div style="height:10px;"></div>';
			$('d_game_levels').innerHTML = html;
		} // levels
	
		// envs
		html = '';
		if (typeof(response.Envs) != 'undefined') {
			if (response.Envs && response.Envs.Env) {
				var envs = this.envs = sort_array( always_array( response.Envs.Env ), { sort_by: 'Name', sort_dir: 1 } );
				html += '<table class="data_table">';
				html += '<tr><th>Environment&nbsp;ID</th><th>Filters</th><th>Exclusions</th><th>Actions</th></tr>';

				for (var idx = 0, len = envs.length; idx < len; idx++) {
					var env = envs[idx];

					// var num_transforms = env.Transform ? always_array(env.Transform).length : 0;
					
					var trans_txt = '';
					if (env.Transforms && env.Transforms.Transform) {
						var trans = always_array(env.Transforms.Transform);
						for (var idy = 0, ley = trans.length; idy < ley; idy++) {
							var transform = trans[idy];
							var trans_def = find_object( config.EnvTransformDefs.Transform, { Plugin: transform.Name } );
							
							if (trans_txt) trans_txt += ', ';
							trans_txt += '<b>' + (trans_def ? trans_def.Title : transform.Name) + '</b>';
							
							trans_txt += ' (';
							if (transform.Enabled == 1) {
								var param_defs = always_array( trans_def.Param );
								var p_txt = '';
								for (var idz = 0, lez = param_defs.length; idz < lez; idz++) {
									var param_def = param_defs[idz];
									if (p_txt) p_txt += ', ';
									var p_value = '' + transform[ param_def.Name ];
									if (p_value.match(/^\//)) p_value = basename(p_value);
									p_txt += param_def.Title + ': ' + p_value;
								}
								
								trans_txt += p_txt;
							}
							else trans_txt += 'Disabled';
							trans_txt += ')';
						}
					}
					else trans_txt = '(None)';
					
					var num_exclusions = (env.Excludes && env.Excludes.Exclude) ? always_array(env.Excludes.Exclude).length : '(None)';

					var edit_link = '#GameEnvEdit?game_id=' + this.game_id + '&env_id=' + env.Name;

					html += '<tr>';
					html += '<td>' + icon('weather.png', '<b>' + ww_fit_string(env.Name, 200, session.em_width, 1) + '</b>', edit_link) + '</td>';
					html += '<td>' + trans_txt + '</td>';
					html += '<td>' + num_exclusions + '</td>';

					html += '<td><table cellspacing="0" cellpadding="0" border="0"><tr>';
					html += '<td style="background:transparent"><nobr>' + icon('weather_edit.png', 'Edit', edit_link) + '</nobr></td>';
					html += '<td style="background:transparent">&nbsp;|&nbsp;</td>';
					html += '<td style="background:transparent"><nobr>' + icon('trash', 'Delete', "$P('GameLevels').delete_game_object('env','"+env.Name+"')") + '</nobr></td>';
					html += '</tr></table></td>';

					html += '</tr>';
				} // foreach env
				html += '</table>';

				$('d_game_envs_header').innerHTML = 'Environments (' + envs.length + ')';
			} // we have envs
			else {
				$('d_game_envs_header').innerHTML = 'Environments';
				html += 'No environments found.  Why not <a href="#GameEnvEdit?game_id='+this.game_id+'">create a new one?</a>';
				this.envs = [];
			}
			html += '<div style="height:10px;"></div>';
			$('d_game_envs').innerHTML = html;
		} // environments
		
	},
	
	delete_game_object: function(type, id) {
		// delete sprite or tile object
		if (confirm('Are you sure you want to delete the ' + type.replace(/^env$/, 'environment') + ' "'+id+'"?')) {
			effect_api_mod_touch('game_objects_get');
			effect_api_send('game_delete_object', {
				GameID: this.game_id,
				Type: type,
				ID: id
			}, [this, 'delete_game_object_finish'], { _type: type, _id: id });
		} // confirmed
	},
	
	delete_game_object_finish: function(response, tx) {
		// received response from server
		this.receive_levels(response, tx);
		do_message('success', 'Deleted the ' + tx._type.replace(/^env$/, 'environment') + ' "'+tx._id+'".'); 
	},
	
	receive_props: function(response, tx) {
		var html = '';
		
		html += '<fieldset><legend>Level Property Definitions</legend>';
		html += '<div class="caption" style="margin-bottom:5px;">' + get_string('/GameLevels/PropBlurb') + '</div>';
		html += render_prop_editor('fe_lev_props', (response.Properties && response.Properties.Property) ? always_array(response.Properties.Property) : [], '$P().save_props()');
		html += '</fieldset>';
		
		$('d_game_levels_props').innerHTML = html;
	},
	
	save_props: function() {
		// save property defs
		if (!pe_prop_update_all('fe_lev_props')) return;
		var props = pe_get_all_props('fe_lev_props');
		
		effect_api_mod_touch('game_level_props_get', 'game_objects_get');
		effect_api_send('game_level_props_save', {
			GameID: this.game_id,
			Properties: { Property: props }
		}, [this, 'save_props_finish'], {  });
	},
	
	save_props_finish: function(response, tx) {
		do_message('success', "Saved level property definitions.");
		show_glog_widget();
	}
	
} );
