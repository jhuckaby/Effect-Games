// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.Main", {
	
	inited: false,
	
	onActivate: function() {
		// page is being activated
		Nav.bar( ['Main', 'EffectGames.com'] );
		Nav.title('');
		
		$('d_blog_news').innerHTML = loading_image();
		$('d_blog_community').innerHTML = loading_image();
		// $('d_blog_featured').innerHTML = loading_image();
		
		// Featured Games
		/* Blog.search({
			stag: 'featured_game',
			limit: 4,
			full: 1,
			callback: [this, 'receive_featured_games']
		}); */
				
		// Recent News
		Blog.search({
			// path: '/news',
			stag: 'front_page',
			limit: 5,
			target: 'd_blog_news',
			more: 1
		});
		
		// Community Blog
		Blog.search({
			path: '/community',
			limit: 5,
			target: 'd_blog_community',
			more: 1
		});
		
		// show main header slideshow
		if (!this.inited) {
			this.inited = true;
			config.Strings.MainSlideshow.Slide = always_array( config.Strings.MainSlideshow.Slide );
			
			this.slide_idx = 0;
			this.num_slides = config.Strings.MainSlideshow.Slide.length;
			this.slide_div_num = 0;
			this.slide_dir = 1;
			this.bk_pos = -340;
			this.bk_pos_target = -340;
			
			this.slide_images = [];
			for (var idx = 0, len = this.num_slides; idx < len; idx++) {
				var url = images_uri + '/' + config.Strings.MainSlideshow.Slide[idx].Photo;
				this.slide_images[idx] = new Image();
				this.slide_images[idx].src = png(url, true);
			}			
		}
		
		this.height_target = 470;
		this.height_start = $('d_header').offsetHeight;
		this.time_start = hires_time_now();
		this.duration = 0.75;
		if (!this.timer) this.timer = setTimeout( '$P("Main").animate_mhs()', 33 );
		
		if (session.user) $('d_blurb_main').hide();
		else {
			$('d_blurb_main').innerHTML = get_string('/Main/Blurb');
			$('d_blurb_main').show();
		}
		
		return true;
	},
	
	receive_featured_games: function(response, tx) {
		// display featured games
		var html = '';
		
		if (response.Rows && response.Rows.Row) {
			// we have rows!
			html += '<table cellspacing="0" cellpadding="0" border="0" width="100%">';
			var rows = always_array( response.Rows.Row );
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				var image_url = row.Params.featured_image;
				if (image_url && image_url.match(/^(\w+)\/(\w+\.\w+)$/)) {
					image_url = '/effect/api/view/users/' + RegExp.$1 + '/images/' + RegExp.$2;
				}
				
				if (idx % 2 == 0) html += '<tr>';
				
				html += '<td width="50%">';
					html += '<table cellspacing="0" cellpadding="0"><tr>';
					html += '<td width="175" height="175">';
						// html += '<div style="position:relative">';
							html += '<div class="featured_image_container" style="background-image:url('+image_url+')">';
								html += '<div class="featured_image_overlay" onClick="window.open(\''+row.Params.featured_link+'\')"></div>';
							html += '</div>';
						// html += '</div>';
					html += '</td>';
					html += '<td width="10">' + spacer(10,1) + '</td>';
					html += '<td width="*" valign="top">';
						html += '<div class="blog_title"><a href="'+row.Params.featured_link+'" target="_blank">' + row.Title + '</a></div>';
						html += '<div class="featured_game_content">' + row.HTML + '</div>';
					html += '</td>';
					html += '<td width="10">' + spacer(15,1) + '</td>';
					html += '</tr></table>';
					html += spacer(1,20);
				html += '</td>';
				
				if (idx % 2 == 1) html += '</tr>';
			} // foreach row
			if (rows.length % 2 == 1) {
				html += '<td></td>';
				html += '</tr>';
			}
			html += '</table>';
		} // has rows
		
		// html += '<div class="clear"></div>';
		
		$('d_blog_featured').innerHTML = html;
	},
	
	animate_mhs: function() {
		var now = hires_time_now();
		if (now - this.time_start >= this.duration) {
			// fin
			$('d_header').style.height = '' + this.height_target + 'px';
			$('d_shadow').style.height = '' + this.height_target + 'px';
			delete this.timer;
		}
		else {
			var height = tweenFrame(this.height_start, this.height_target, (now - this.time_start) / this.duration, 'EaseOut', 'Circular');
			$('d_header').style.height = '' + height + 'px';
			$('d_shadow').style.height = '' + height + 'px';
			this.timer = setTimeout( '$P("Main").animate_mhs()', 33 );
		}
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		$('d_blog_news').innerHTML = '';
		$('d_blog_community').innerHTML = '';
		
		// animate title down to minimum size
		this.height_target = 75;
		this.height_start = $('d_header').offsetHeight;
		this.time_start = hires_time_now();
		if (!this.timer) this.timer = setTimeout( '$P("Main").animate_mhs()', 33 );
		
		return true;
	},
	
	draw_slide: function() {
		// draw slideshow image, accompanying text, and controls
		if (this.slide_timer) return;
		
		var slide = config.Strings.MainSlideshow.Slide[ this.slide_idx ];
		
		this.old_photo = $('d_header_slideshow_photo_' + this.slide_div_num);
		this.old_text = $('d_header_slideshow_text_' + this.slide_div_num);
		
		this.slide_div_num = 1 - this.slide_div_num;
		
		this.new_photo = $('d_header_slideshow_photo_' + this.slide_div_num);
		this.new_text = $('d_header_slideshow_text_' + this.slide_div_num);
				
		this.new_photo.style.backgroundImage = 'url('+png(images_uri+'/'+slide.Photo, true)+')';
		this.new_photo.setOpacity(0.0);
		
		var html = '';
		html += slide.Text;
		
		// html += '<div style="width:140px; margin:30px auto 0 auto;">';
		/* html += '<table><tr>';
			html += '<td>' + icon('resultset_previous.png', '', "$P().prev_slide()") + '</td>';
			html += '<td>' + spacer(20,0) + '</td>';
			html += '<td>' + icon('resultset_next.png', '', "$P().next_slide()") + '</td>';
		html += '</tr></table>'; */
		
		/* html += '<div class="toolbar_icon fl hover" style="-moz-border-radius:4px; -webkit-border-radius:4px;" onClick="$P().prev_slide()" title="Previous Slide"><img class="png" src="'+icons_uri+'/resultset_previous.png" width="16" height="16" border="0"/></div>';
		html += '<div class="toolbar_icon fr hover" style="-moz-border-radius:4px; -webkit-border-radius:4px;" onClick="$P().next_slide()" title="Next Slide"><img class="png" src="'+icons_uri+'/resultset_next.png" width="16" height="16" border="0"/></div>';
		html += '<div class="clear"></div>'; */
		
		// html += '</div>';
		
		this.slide_width = this.new_text.offsetWidth;
		
		this.new_text.innerHTML = html;
		
		if (this.slide_dir == 1) this.new_text.style.left = '' + this.slide_width + 'px';
		else this.new_text.style.left = '-' + this.slide_width + 'px';
		
		this.slide_time_start = hires_time_now();
		this.slide_timer = setTimeout( '$P("Main").animate_mhs_slide()', 33 );
	},
	
	animate_mhs_slide: function() {
		var now = hires_time_now();
		if (now - this.slide_time_start >= this.duration) {
			// fin
			this.new_text.style.left = '0px';
			this.old_text.style.left = '-' + this.slide_width + 'px';
			this.new_photo.setOpacity( 1.0 );
			this.old_photo.setOpacity( 0.0 );
			delete this.slide_timer;
			
			this.bk_pos = this.bk_pos_target;
		}
		else {
			var value = tweenFrame(0.0, 1.0, (now - this.slide_time_start) / this.duration, 'EaseOut', 'Circular');
			
			if (this.slide_dir == 1) {
				this.new_text.style.left = '' + Math.floor( this.slide_width - (this.slide_width * value) ) + 'px';
				this.old_text.style.left = '-' + Math.floor( this.slide_width * value ) + 'px';
			}
			else {
				this.new_text.style.left = '-' + Math.floor( this.slide_width - (this.slide_width * value) ) + 'px';
				this.old_text.style.left = '' + Math.floor( this.slide_width * value ) + 'px';
			}
			this.new_photo.setOpacity( value );
			this.old_photo.setOpacity( 1.0 - value );
						
			var bkp = Math.floor( this.bk_pos + ((this.bk_pos_target - this.bk_pos) * value) );
			$('d_header').style.backgroundPosition = '' + bkp + 'px 0px';
			
			/* var bk_pos = (this.bk_idx * 250) + (value * 250);
			bk_pos = 0 - bk_pos;
			$('d_header').style.backgroundPosition = '' + bk_pos + 'px 0px'; */
			
			this.slide_timer = setTimeout( '$P("Main").animate_mhs_slide()', 33 );
		}
	},
	
	prev_slide: function() {
		this.bk_pos_target += 200;
		this.slide_idx--;
		if (this.slide_idx < 0) this.slide_idx += this.num_slides;
		this.slide_dir = -1;
		this.draw_slide();
	},
	
	next_slide: function() {
		this.bk_pos_target -= 200;
		this.slide_idx++;
		if (this.slide_idx >= this.num_slides) this.slide_idx -= this.num_slides;
		this.slide_dir = 1;
		this.draw_slide();
	}
	
} );

Class.subclass( Effect.Page, "Effect.Page.PublicGameList", {
	
	onActivate: function() {
		// page is being activated
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['PublicGameList', "All Public Games"]
		);
		Nav.title( "List of All Public Game Projects" );
		
		effect_api_get( 'get_site_info', { cat: 'all_pub_games' }, [this, 'receive_all_pub_games'], { } );
		
		this.div.innerHTML = loading_image();
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		this.div.innerHTML = '';
		return true;
	},
	
	receive_all_pub_games: function(response, tx) {
		// receive list of pop pub games from server
		var html = '';
		
		html += '<h1>List of All Public Game Projects</h1>';
		
		html += '<div class="blurb">This is the complete list of public games currently being built by our users, presented in alphabetical order.  Maybe they could use some help!  Check out the game project pages and see (requires user account).</div>';
		
		if (response.Data && response.Data.Games && response.Data.Games.Game) {
			var games = always_array( response.Data.Games.Game );
			
			for (var idx = 0, len = games.length; idx < len; idx++) {
				var game = games[idx];
				html += '<div class="game_thumb" onClick="Nav.go(\'Game/'+game.GameID+'\')">' + 
					(game.Logo ? 
						user_image_thumbnail(game.Logo, 80, 60) : 
						'<img class="png" src="/effect/images/logo_80_60.png" width="80" height="60"/>'
					) + '<br/>' + ww_fit_box(game.Title, 80, 2, session.em_width, 1) + '</div>';
			} // foreach game
			
			html += '<div class="clear"></div>';
		}
		else {
			html += 'No public games found!  Why not <a href="#GameEdit"><b>create a new one?</b></a>';
		}
		
		this.div.innerHTML = html;
	}
	
} );
