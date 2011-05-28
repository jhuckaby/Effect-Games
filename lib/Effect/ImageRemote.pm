package Effect::ImageRemote;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

##
# Effect Game Methods
# Part of the Effect Project
##

use strict;
use File::Basename;
use XML::API::Tools;
use HTTP::Date;
use Digest::MD5 qw/md5_hex/;

sub api_game_get_font {
	##
	# Get pre-made font for use in game engine
	#	game_id => ID of game
	#	rev => game revision or "dev"
	#	font => ID of font
	#	zoom => zoom level
	#	zoom_filter => zoom filter
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	
	my $game_id = $query->{game_id};
	my $game_rev = $query->{rev};
	my $font_id = $query->{font};
	
	# if ($game_rev eq 'dev') {
	# 	return unless $self->validate_session();
	# 	return unless $self->require_game_read_access($game_id);
		
		# because so many of these API calls come in at the exact same instant,
		# don't save the session every time (atomic writes on local Mac OS X don't quite work)
	# 	$self->session_unmark();
	# }
	
	my $list_path = '';
	my $asset_base_path = '';
	
	if ($game_rev eq 'dev') {
		$list_path = '/games/' . $game_id . '/fonts';
		$asset_base_path = '/games/' . $game_id . '/assets';
	}
	else {
		# actual published rev
		$list_path = '/games/' . $game_id . '/revisions/' . $game_rev . '/fonts';
		$asset_base_path = '/games/' . $game_id . '/revisions/' . $game_rev . '/assets';
	}
	
	my $font = $self->{storage}->list_find( $list_path, { Name => $font_id } );
	if (!$font) {
		return $self->api_error('font', "Could not find font: $game_id/$game_rev/$font_id");
	}
	
	my $img_resp = $self->send_image_service_request(
		Transform => [
			{ _Attribs => { Name => 'FontGrid' },
				Font => 'effect:/' . $asset_base_path . $font->{Path},
				Size => $font->{Size},
				Color => $font->{Color},
				Background => 'transparent',
				Format => 'png',
				GlyphWidth => $font->{GlyphWidth},
				GlyphHeight => $font->{GlyphHeight},
				GlyphsPerRow => length($self->{config}->{BitmapFontGlyphs}),
				Glyphs => $self->{config}->{BitmapFontGlyphs},
				AntiAlias => $font->{AntiAlias},
				Zoom => $query->{zoom} || '',
				ZoomFilter => $query->{zoom_filter} || ''
			}
		]
	);
	if (ref($img_resp)) {
		return $self->api_error('game', $img_resp->{Description});
	}
	
	my $content = $img_resp;
	my $len = length($content);
	
	$self->log_debug(5, "Image size: " . $len . " bytes");
	
	$self->set_ttl( 'ViewTTL' );
	
	$self->{session}->{request}->content_type( 'image/png' );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', $len );
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub api_game_preview_font_grid {
	##
	# Return binary image of font grid
	#	game_id => ID of game
	#	font => path to font asset, relative from game assets
	#	size => font pointsize
	#	color => font color
	#	width => glyph width
	#	height => glyph height
	#	glyphs_per_row => number of glyphs per row
	#	antialias => 1 or 0
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	
	return unless $self->validate_session();
	
	my $game_id = $query->{game_id};
	
	# check session for access (game should have been loaded client-side by this point)
	return unless $self->require_game_read_access($game_id);
	
	$query->{font} =~ s/[^\w\-\.\/]+//g;
	$query->{font} =~ s/\.\.//g;
	
	my $img_resp = $self->send_image_service_request(
		Transform => [
			{ _Attribs => { Name => 'FontGrid' },
				Font => 'effect://games/' . $game_id . '/assets' . $query->{font},
				Size => $query->{size},
				Color => $query->{color},
				Background => 'transparent',
				Format => 'png',
				GlyphWidth => $query->{width},
				GlyphHeight => $query->{height},
				GlyphsPerRow => $query->{glyphs_per_row},
				Glyphs => $self->{config}->{BitmapFontGlyphs},
				AntiAlias => $query->{antialias}
			}
		]
	);
	if (ref($img_resp)) {
		return $self->api_error('game', $img_resp->{Description});
	}
	
	my $content = $img_resp;
	my $len = length($content);
	
	$self->log_debug(5, "Image size: " . $len . " bytes");
	
	$self->set_ttl( 'ViewTTL' );
	
	$self->{session}->{request}->content_type( 'image/png' );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', $len );
	
	if ($query->{download}) {
		my $font_name_strip = basename($query->{font}); $font_name_strip =~ s/\.\w+$//;
		my $filename = 'font-preview-' . $game_id . '-' . $font_name_strip . '-' . $query->{size} . 'pt.png';
		my $download_filename = ($query->{download} eq "1") ? $filename : $query->{download};
		$self->{session}->{request}->headers_out()->set('Content-disposition', "attachment; filename=" . $download_filename);
	}
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
	
	$self->session_unmark();
}

sub api_grid_image {
	##
	# Generate simple grid image suitable for repeating
	#	background => background color (defaults to transparent)
	#	color => line color (defaults to #7f7f7f)
	#	width => image width
	#	height => image height
	#	format => image format (gif, png, jpeg, etc.)
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	
	my $fmt = '';
	if ($query->{format}) {
		$fmt = lc($query->{format});
		$fmt =~ s/jpg/jpeg/;
	}
	elsif ($self->{session}->{uri} =~ /\.(\w+)(\?|$)/) {
		$fmt = lc($1);
		$fmt =~ s/jpg/jpeg/;
	}
	else {
		$fmt = 'gif';
	}
	
	my $img_resp = $self->send_image_service_request(
		Transform => [
			{ _Attribs => { Name => 'New' },
				Background => $query->{background} || 'transparent',
				Width => $query->{width} || 1,
				Height => $query->{height} || 1
			},
			{ _Attribs => { Name => 'Mogrify' },
				Draw => {
					Primitive => 'Line',
					Points => '0,0 ' . $query->{width} . ',0',
					Fill => $query->{color} || '#7f7f7f',
					AntiAlias => 'False'
				}
			},
			{ _Attribs => { Name => 'Mogrify' },
				Draw => {
					Primitive => 'Line',
					Points => '0,0 0,' . $query->{height},
					Fill => $query->{color} || '#7f7f7f',
					AntiAlias => 'False'
				}
			},
			{ _Attribs => { Name => 'Set' },
				Format => $fmt
			}
		]
	);
	if (ref($img_resp)) {
		return $self->api_error('image', $img_resp->{Description});
	}
	
	my $content = $img_resp;
	my $len = length($content);
	
	$self->log_debug(5, "Image size: " . $len . " bytes");
	
	$self->set_ttl( 'StaticTTL' );
	
	$self->{session}->{request}->content_type( 'image/' . $fmt );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', $len );
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub api_blank_image {
	##
	# Generate blank image
	#	color => background color (defaults to transparent)
	#	width => image width
	#	height => image height
	#	format => image format (gif, png, jpeg, etc.)
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	
	my $fmt = '';
	if ($query->{format}) {
		$fmt = lc($query->{format});
		$fmt =~ s/jpg/jpeg/;
	}
	elsif ($self->{session}->{uri} =~ /\.(\w+)(\?|$)/) {
		$fmt = lc($1);
		$fmt =~ s/jpg/jpeg/;
	}
	else {
		$fmt = 'gif';
	}
	
	my $img_resp = $self->send_image_service_request(
		Transform => [
			{ _Attribs => { Name => 'New' },
				Background => $query->{color} || 'transparent',
				Width => $query->{width} || 1,
				Height => $query->{height} || 1
			},
			{ _Attribs => { Name => 'Set' },
				Format => $fmt
			},
			{ _Attribs => { Name => 'Zoom' },
				Zoom => $query->{zoom} || 1,
				ZoomFilter => $query->{zoom_filter} || ''
			}
		]
	);
	if (ref($img_resp)) {
		return $self->api_error('image', $img_resp->{Description});
	}
	
	my $content = $img_resp;
	my $len = length($content);
	
	$self->log_debug(5, "Image size: " . $len . " bytes");
	
	$self->set_ttl( 'StaticTTL' );
	
	$self->{session}->{request}->content_type( 'image/' . $fmt );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', $len );
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub api_game_level_layer_preview {
	##
	# Render level layer preview
	##
	my $self = shift;
	return unless $self->require_query(
		game_id => '^[a-z0-9][a-z0-9\-]*[a-z0-9]$',
		level_id => '.+',
		layer_id => '.+',
		width => '^\d+$',
		height => '^\d+$'
	);
	
	my $query = $self->{session}->{query};
	my $game_id = $query->{game_id};
	my $level_id = $query->{level_id};
	my $layer_id = $query->{layer_id};
	my $fmt = 'png';
	
	my $image_path = "/games/$game_id/level_nav/$level_id";
	my $full_path = $self->{storage}->get_file_path( $image_path, "$layer_id.$fmt" );
	
	my $content = '';
	if (-e $full_path) {
		# $content = load_file($full_path);
		my $img_resp = $self->send_image_service_request(
			Transform => [
				{ _Attribs => { Name => 'GameImage' },
					Source => 'effect:/' . $image_path . '/' . "$layer_id.$fmt",
					Env => $query->{env} || ''
				},
				{ _Attribs => { Name => 'Set' },
					Format => $fmt
				}
			]
		);
		if (ref($img_resp)) {
			return $self->api_error('image', $img_resp->{Description});
		}

		$content = $img_resp;
	}
	else {
		# blank image
		my $img_resp = $self->send_image_service_request(
			Transform => [
				{ _Attribs => { Name => 'New' },
					Background => $query->{color} || 'transparent',
					Width => $query->{width} || 1,
					Height => $query->{height} || 1
				},
				{ _Attribs => { Name => 'Set' },
					Format => $fmt
				}
			]
		);
		if (ref($img_resp)) {
			return $self->api_error('image', $img_resp->{Description});
		}

		$content = $img_resp;
	}
	
	my $len = length($content);
	
	$self->log_debug(5, "Image size: " . $len . " bytes");
	
	$self->set_ttl( 'StaticTTL' );
	
	$self->{session}->{request}->content_type( 'image/' . $fmt );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', $len );
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub api_game_level_bkgnd_preview {
	##
	# Render level preview background layer
	##
	my $self = shift;
	return unless $self->require_query(
		game_id => '^[a-z0-9][a-z0-9\-]*[a-z0-9]$',
		level_id => '.+',
		width => '^\d+$',
		height => '^\d+$'
	);
	
	my $query = $self->{session}->{query};
	my $fmt = 'png';
	
	my $img_resp = $self->send_image_service_request(
		Transform => [
			{ _Attribs => { Name => 'New' },
				Background => $query->{color} || 'transparent',
				Width => $query->{width} || 1,
				Height => $query->{height} || 1
			},
			{ _Attribs => { Name => 'NavBackground' },
				GameID => $query->{game_id},
				LevelID => $query->{level_id},
				Env => $query->{env} || ''
			},
			{ _Attribs => { Name => 'Set' },
				Format => $fmt
			}
		]
	);
	if (ref($img_resp)) {
		return $self->api_error('image', $img_resp->{Description});
	}
	
	my $content = $img_resp;
	my $len = length($content);
	
	$self->log_debug(5, "Image size: " . $len . " bytes");
	
	$self->set_ttl( 'StaticTTL' );
	
	$self->{session}->{request}->content_type( 'image/' . $fmt );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', $len );
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub api_game_level_preview {
	##
	# Render level preview (not cached on disk)
	##
	my $self = shift;
	return unless $self->require_query(
		game_id => '^[a-z0-9][a-z0-9\-]*[a-z0-9]$',
		level_id => '.+',
		width => '^\d+$',
		height => '^\d+$'
	);
	
	my $query = $self->{session}->{query};
	
	my $fmt = '';
	if ($query->{format}) {
		$fmt = lc($query->{format});
		$fmt =~ s/jpg/jpeg/;
	}
	elsif ($self->{session}->{uri} =~ /\.(\w+)(\?|$)/) {
		$fmt = lc($1);
		$fmt =~ s/jpg/jpeg/;
	}
	else {
		$fmt = 'png';
	}
	
	my $img_resp = $self->send_image_service_request(
		Transform => [
			{ _Attribs => { Name => 'LevelPreview' },
				GameID => $query->{game_id},
				LevelID => $query->{level_id},
				Width => $query->{width},
				Height => $query->{height},
				SoloLayer => $query->{layer_id} || ''
			},
			{ _Attribs => { Name => 'Set' },
				Format => $fmt
			}
		]
	);
	if (ref($img_resp)) {
		return $self->api_error('image', $img_resp->{Description});
	}
	
	my $content = $img_resp;
	my $len = length($content);
	
	$self->log_debug(5, "Image size: " . $len . " bytes");
	
	$self->set_ttl( 'ViewTTL' );
	
	$self->{session}->{request}->content_type( 'image/' . $fmt );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', $len );
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub api_game_save_level_nav_data {
	##
	# Render and save level navigator data for a layer
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => '^[a-z0-9][a-z0-9\-]*[a-z0-9]$',
		'/LevelID' => '.+',
		'/LayerID' => '.+',
		'/Width' => '^\d+$',
		'/Height' => '^\d+$',
		'/Left' => '^\d+$',
		'/Top' => '^\d+$',
		'/Right' => '^\d+$',
		'/Bottom' => '^\d+$'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	
	# check session for access (game should have been loaded client-side by this point)
	return unless $self->require_game_read_access($game_id);
	
	my $img_resp = $self->send_image_service_request(
		Transform => [
			{ _Attribs => { Name => 'Navigator' },
				%$xml,
				SpriteFrame => 1
			}
		]
	);
	if ($img_resp->{Code}) {
		return $self->api_error('image', $img_resp->{Description});
	}
	
	$self->set_response(0, "Success");
}

sub api_preview_placeholder_image {
	##
	# Render placeholder image, return actual binary image
	##
	my $self = shift;
	return unless $self->require_query(
		width => '^\d+$',
		height => '^\d+$',
		pointsize => '^\d+$',
		format => '^(png|gif|jpeg)$'
	);
	
	my $query = $self->{session}->{query};
	my $fmt = $query->{format} || 'png';
	
	if (($query->{width} > 1024) || ($query->{height} > 1024) || ($query->{pointsize} > 200)) {
		return $self->api_error('image', "Fail");
	}
	
	my $bkgnd_clr = '';
	if ($query->{bkgnd_color} =~ /^\#(\w{2})(\w{2})(\w{2})$/) {
		my ($rr, $gg, $bb) = ($1, $2, $3);
		my $red = hex($rr);
		my $green = hex($gg);
		my $blue = hex($bb);
		my $opacity = $query->{bkgnd_opacity};
		$bkgnd_clr = "rgba($red, $green, $blue, $opacity)";
	}
	else {
		return $self->api_error('image', "Malformed background color: " . $query->{bkgnd_color});
	}
	
	my $img_resp = $self->send_image_service_request(
		Transform => [
			{ _Attribs => { Name => 'Placeholder' },
				Background => $bkgnd_clr || 'white',
				Shape => $query->{shape} || 'Rectangle',
				Width => $query->{width} || 1,
				Height => $query->{height} || 1,
				BorderColor => $query->{border_color} || 'black',
				BorderSize => $query->{border_size} || 0,
				Text => $query->{label} || '',
				PointSize => $query->{pointsize} || 12,
				TextColor => $query->{text_color} || 'black',
				Format => $fmt
			}
		]
	);
	if (ref($img_resp)) {
		return $self->api_error('image', $img_resp->{Description});
	}
	
	my $content = $img_resp;
	my $len = length($content);
	
	$self->log_debug(5, "Image size: " . $len . " bytes");
	
	$self->set_ttl( 'StaticTTL' );
	
	$self->{session}->{request}->content_type( 'image/' . $fmt );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', $len );
	
	if ($query->{download}) {
		my $download_filename = $query->{download};
		$self->{session}->{request}->headers_out()->set('Content-disposition', "attachment; filename=" . $download_filename);
	}
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub api_generate_placeholder_image {
	##
	# Generate placeholder image and save it as an asset
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => 'GameID',
		'/Path' => 'StoragePath',
		'/Filename' => 'AssetFilename',
		'/Width' => 'PositiveInteger',
		'/Height' => 'PositiveInteger',
		'/PointSize' => 'PositiveInteger',
		'/Format' => '^(png|gif|jpeg)$'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	
	my $bkgnd_clr = '';
	if ($xml->{BackgroundColor} =~ /^\#(\w{2})(\w{2})(\w{2})$/) {
		my ($rr, $gg, $bb) = ($1, $2, $3);
		my $red = hex($rr);
		my $green = hex($gg);
		my $blue = hex($bb);
		my $opacity = $xml->{BackgroundOpacity};
		$bkgnd_clr = "rgba($red, $green, $blue, $opacity)";
	}
	else {
		return $self->api_error('image', "Malformed background color: " . $xml->{BackgroundColor});
	}
	
	my $dir_path = '/games/' . $xml->{GameID} . '/assets' . $xml->{Path};
	my $subpath = $xml->{Path};
	
	return unless $self->require_game_member($game_id);
	
	my $data = $self->{storage}->get_metadata( $dir_path );
	if (!$data) {
		# return $self->api_error('assets', "Could not locate asset folder: $dir_path");
		$data = {};
	}
	
	my $filename = $xml->{Filename};
	my $byte_count = 0;
	
	my $img_resp = $self->send_image_service_request(
		Transform => [
			{ _Attribs => { Name => 'Placeholder' },
				Background => $bkgnd_clr || 'white',
				Width => $xml->{Width} || 1,
				Height => $xml->{Height} || 1,
				BorderColor => $xml->{BorderColor} || 'black',
				BorderSize => $xml->{BorderSize} || 0,
				Text => $xml->{Label} || '',
				PointSize => $xml->{PointSize} || 12,
				TextColor => $xml->{TextColor} || 'black',
				Format => $xml->{Format} || 'png',
				Shape => $xml->{Shape} || 'Rectangle'
			}
		]
	);
	if (ref($img_resp)) {
		return $self->api_error('image', $img_resp->{Description});
	}
	
	my $content = $img_resp;
	my $content_length = length($content);
	my $byte_count = 0;
	
	# locate file in metadata
	if (!$data->{Files}) { $data->{Files} = {}; }
	if (!$data->{Files}->{File}) { $data->{Files}->{File} = []; }
	XMLalwaysarray( xml=>$data->{Files}, element=>'File' );
	
	my $file = XMLsearch( xml=>$data->{Files}->{File}, Name=>$filename );
	if ($file) {
		# updating existing file
		$file->{Modified} = time();
		$file->{Username} = $username;
		
		$byte_count = $content_length - $file->{Size};
		$file->{Size} = $content_length;
	}
	else {
		# new file
		$file = {
			Created => time(),
			Modified => time(),
			Username => $username,
			Name => $filename,
			Size => $content_length
		};
		push @{$data->{Files}->{File}}, $file;
		$byte_count = $content_length;
	}
	
	if (!$self->{storage}->store_metadata($dir_path, $data)) {
		return $self->api_error('assets', "Could not write metadata: $dir_path: " . $self->{storage}->{error});
	}
	
	if (!$self->{storage}->store_file( $dir_path, $filename, $content )) {
		return $self->api_error('assets', "Could not store asset file: $subpath$filename: " . $self->{storage}->{error});
	}
	
	# quota check and update
	return unless $self->game_update_storage_quota($game_id, $byte_count);
	
	# log transaction
	$self->log_transaction( 'game_asset_placeholder_image_save', { game_id => $game_id, path => "$dir_path$filename" } );
	
	# log message
	return unless $self->game_log_msg($game_id, "Saved placeholder image to asset: $subpath$filename", 'asset');
	
	# update effective asset mod date
	return unless $self->lock_update_record( "/games/$game_id/stats", { AssetMod => time() } );
	
	$self->set_response(0, "Success");
}

sub api_grt {
	##
	# Render text server-side using OTF/TTF font, and return binary image
	#	game_id => ID of game
	#	rev => game revision or "dev"
	#	font => path to font asset
	#	xml => path to xml asset
	#	xpath => xpath to string in xml file
	#	width => canvas width
	#	height => canvas height
	#	background => color
	#	pointsize => int
	#	color => color
	#	opacity => float
	#	align => center
	#	kerning => float
	#	antialias => 1|0
	#	wordwrap => 1|0
	#	format => png|gif|png
	#	zoom => zoom level
	#	zoom_filter => zoom filter
	##
	my $self = shift;
	
	my $qmap = {
		g => 'game_id',
		r => 'rev',
		f => 'font',
		x => 'xml',
		xp => 'xpath',
		w => 'width',
		h => 'height',
		b => 'background',
		p => 'pointsize',
		c => 'color',
		o => 'opacity',
		a => 'align',
		k => 'kerning',
		aa => 'antialias',
		ww => 'wordwrap'
	};
	my $query = $self->{session}->{query};
	foreach my $key (keys %$query) {
		if ($qmap->{$key}) {
			$query->{ $qmap->{$key} } = $query->{$key};
			delete $query->{$key};
		}
	}
	if (!$query->{format} && ($self->{session}->{uri} =~ /\/grt\.(\w+)/)) {
		$query->{format} = $1;
	}
	if (!$query->{background}) {
		$query->{background} = 'transparent';
	}
	if ($query->{z} && ($query->{z} =~ /^(\d+)(\w+)/)) {
		$query->{zoom} = $1;
		$query->{zoom_filter} = $2;
		$query->{zoom_filter} =~ s/^Sm$/Smooth/;
		$query->{zoom_filter} =~ s/^Sh$/Sharp/;
		delete $query->{z};
	}
	$query->{zoom} ||= 1;
	$query->{zoom_filter} ||= 'Sharp';
	
	if ($query->{background}) { $query->{background} =~ s/^H/#/; }
	if ($query->{color}) { $query->{color} =~ s/^H/#/; }
	
	return unless $self->require_query(
		game_id => 'GameID',
		rev => 'GameRevision',
		font => 'StoragePath',
		xml => 'StoragePath',
		xpath => 'XPath',
		width => 'PositiveInteger',
		height => 'PositiveInteger',
		pointsize => 'PositiveInteger',
		kerning => 'Float',
		format => '^(png|gif|jpeg)$'
	);
	my $fmt = $query->{format} || 'png';
	
	my $game_id = $query->{game_id};
	my $game_rev = $query->{rev};
	my $font = $query->{font};
	
	my $asset_base_path = '';
	
	if ($game_rev eq 'dev') {
		$asset_base_path = '/games/' . $game_id . '/assets';
	}
	else {
		# actual published rev
		$asset_base_path = '/games/' . $game_id . '/revisions/' . $game_rev . '/assets';
	}
	
	# locate xml file and text string
	my $raw_xml = $self->{storage}->get_file_contents( $asset_base_path . dirname($query->{xml}), basename($query->{xml}) );
	if (!$raw_xml) {
		return $self->api_error('image', "XML asset not found: " . $query->{xml} );
	}
	
	my $parser = new XML::Lite( $raw_xml );
	if ($parser->getLastError()) {
		return $self->api_error('image', "Failed to parse XML asset: " . $query->{xml} . ": " . $parser->getLastError());
	}
	
	my $text = $parser->lookup( $query->{xpath} );
	if (!$text) {
		return $self->api_error('image', "Failed to locate XPath: " . $query->{xpath} . " in asset: " . $query->{xml});
	}
	if (ref($text)) { $text = serialize_object($text); }
	
	my $text_color = $query->{color};
	if ($query->{opacity} && ($query->{opacity} != 1.0) && $query->{color} =~ /^\#(\w{2})(\w{2})(\w{2})$/) {
		my ($rr, $gg, $bb) = ($1, $2, $3);
		my $red = hex($rr);
		my $green = hex($gg);
		my $blue = hex($bb);
		my $opacity = $query->{opacity};
		$text_color = "rgba($red, $green, $blue, $opacity)";
	}
	
	my $img_resp = $self->send_image_service_request(
		Transform => [
			{ _Attribs => { Name => 'Text' },
				Font => 'effect:/' . $asset_base_path . $query->{font},
				Color => $text_color,
				Background => $query->{background} || 'transparent',
				Format => $fmt,
				Width => $query->{width},
				Height => $query->{height},
				Text => $text,
				PointSize => $query->{pointsize} || '12',
				Align => $query->{align} || 'center',
				Kerning => $query->{kerning},
				WordWrap => $query->{wordwrap} ? 1 : 0,
				AntiAlias => $query->{antialias} ? 1 : 0,
				Zoom => $query->{zoom} || '',
				ZoomFilter => $query->{zoom_filter} || ''
			}
		]
	);
	if (ref($img_resp)) {
		return $self->api_error('game', $img_resp->{Description});
	}
	
	my $content = $img_resp;
	my $len = length($content);
	
	$self->log_debug(5, "Image size: " . $len . " bytes");
	
	$self->set_ttl( 'ViewTTL' );
	
	$self->{session}->{request}->content_type( 'image/' . $fmt );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', $len );
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub api_env_preview {
	##
	# Generate environment preview
	#	g => game_id
	#	s => source image: /assets/images/foo.bar or /level_data/MetalWorks/preview.png
	#	t => array of transforms
	#	f => format
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	
	my $fmt = '';
	if ($query->{'f'}) {
		$fmt = lc($query->{'f'});
		$fmt =~ s/jpg/jpeg/;
	}
	elsif ($query->{'s'} && ($query->{'s'} =~ /\.(\w+)(\?|$)/)) {
		$fmt = lc($1);
		$fmt =~ s/jpg/jpeg/;
	}
	else {
		$fmt = 'jpg';
	}
	
	my $source = '';
	if ($query->{'s'}) {
		$source = 'effect://games/' . $query->{'g'} . $query->{'s'};
	}
	else {
		$source = '/effect/htdocs/images/color-wheel.jpg';
	}
	
	my $transforms = [];
	if ($query->{'t'}) {
		XMLalwaysarray( xml=>$query, element=>'t' );
		$transforms = $query->{'t'};
	}
	
	my $img_resp = $self->send_image_service_request(
		Transform => [
			{ _Attribs => { Name => 'EnvPreview' },
				GameID => $query->{'g'},
				Source => $source,
				Env => { Transforms => { Transform => $transforms } }
			},
			{ _Attribs => { Name => 'Set' },
				Format => $fmt
			}
		]
	);
	if (ref($img_resp)) {
		return $self->api_error('image', $img_resp->{Description});
	}
	
	my $content = $img_resp;
	my $len = length($content);
	
	$self->log_debug(5, "Image size: " . $len . " bytes");
	
	$self->set_ttl( 'ViewTTL' );
	
	$self->{session}->{request}->content_type( 'image/' . $fmt );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', $len );
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

1;
