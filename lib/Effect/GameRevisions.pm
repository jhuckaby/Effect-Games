package Effect::GameRevisions;

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
use URI::Escape;
use Digest::MD5 qw/md5_hex/;

sub api_local_dev {
	##
	# Run engine locally
	##
	my $self = shift;
	
	my $query = $self->{session}->{query};
	
	# grab session from query
	if (!$query->{key}) {
		return $self->nice_js_error("No API Key is specified on the URL.  Please return to EffectGames.com and generate another Local Development URL.");
	}
	$self->{session}->{cookie}->{effect_session_id} = 'login_' . $query->{key};
	
	if (!$self->validate_session('login', 'readonly')) {
		return $self->nice_js_error("Your API key is invalid.  Please <a href=\"".$self->get_base_url()."#Home\" target=\"_blank\">login to the site</a> and generate a new local development URL.");
	}
	my $username = $self->{session}->{db}->{username};
	
	# Make sure current IP matches last user login
	if ($self->{session}->{db}->{IP} ne get_remote_ip()) {
		return $self->nice_js_error("Your IP address has changed.  Please refresh your EffectGames.com browser session (no need to logout/login, just hit refresh) to update your IP address, and then refresh this page.");
	}
	
	my $game_id = $query->{game};
	if (!$game_id) {
		return $self->nice_js_error("No Game ID specified on query string.");
	}
	
	my $engine_ver = $query->{engine};
	if (!$engine_ver) {
		return $self->nice_js_error("No Engine Version specified on query string.");
	}
	
	if (!$self->require_game_member($game_id, 'readonly') && !$self->is_admin()) {
		return $self->nice_js_error("You are not a member of the game $game_id.");
	}
	
	my $engine_versions = $self->{storage}->permacache_get('/admin/engine_versions');
	XMLalwaysarray( xml=>$engine_versions, element=>'Version' );
	$engine_versions = $engine_versions->{Version};
	
	my $ver_data = XMLsearch( xml=>$engine_versions, Name => $engine_ver );
	if (!$ver_data) {
		return $self->nice_js_error("Could not locate engine version: $engine_ver");
	}
	
	my $game_path = '/games/' . $game_id;
	my $game = $self->{storage}->get_metadata( $game_path );
	if (!$game) { return $self->nice_js_error("Game not found: $game_id"); }
	
	my $content = '';
	$content .= $self->get_string('/Engine/Header') . "\n\n";
	$content .= "document.write('<div style=\"font-family:arial,sans-serif; font-size:10px; color:#aaa;\">Local development instance for $username -- DO NOT DISTRIBUTE</div>');";
	
	# first, the CSS
	# my $css_filename = $game->{Theme} ? ($game->{Theme}.'.css') : 'dark.css';
	# $content .= "document.write('<link rel=\"stylesheet\" type=\"text/css\" href=\"".$self->get_base_url()."engine/$css_filename\">');";
	# $content .= "(function() { var lnk = document.createElement('link'); lnk.setAttribute('rel', 'stylesheet'); lnk.setAttribute('type', 'text/css'); lnk.setAttribute('href', '".$self->get_base_url()."engine/$css_filename'); document.getElementsByTagName('head')[0].appendChild(lnk); })();";
	
	# then, the port and toolbar DIVs
	my $init_html = trim(load_file($self->{config}->{Paths}->{EngineDir} . '/init.html'));
	$init_html =~ s/\n\s*//g;
	$content .= "document.write('".$init_html."');";
	
	# load engine and include in output
	my $engine_file = $self->{config}->{Paths}->{EngineDir} . '/' . $ver_data->{File};
	if ($ver_data->{File} eq 'src') {
		# use raw source of engine
		
		my $obfuscate = parse_xml( $self->{config}->{Paths}->{ConfDir} . '/obfuscate.xml' );
		foreach my $filename (@{$obfuscate->{SourceFiles}->{File}}) {
			$content .= load_file( '/effect/src/' . $filename );
		}
		
		# special debug class, only for engine src mode
		$content .= load_file( '/effect/src/Debug.class.js' );
	}
	elsif (-e $engine_file) {
		$content .= load_file( $engine_file );
		
		# stub function just in case
		# $content .= 'window.Debug={trace:function(){}};';
		$content .= 'if (!window.Debug) window.Debug={trace:function(){}};';
	}
	else {
		return $self->nice_js_error("Could not locate engine version: $engine_ver");
	}
	
	# next, create game definition
	my $game_def = copy_hash_remove_keys($game, 
		'Description', 'DescriptionHTML', 'Owner', 'State', 'Access', 'TwitterUsername', 'TwitterPassword');
	
	# add sprites, tiles, fonts, keys, audio to def
	my $sprites = $self->{storage}->list_get( "/games/$game_id/sprites" );
	$sprites ||= [];
	$game_def->{Sprites} = { Sprite => $sprites };

	my $tiles = $self->{storage}->list_get( "/games/$game_id/tiles" );
	$tiles ||= [];
	$game_def->{Tiles} = { Tile => $tiles };
	
	my $tilesets = $self->{storage}->list_get( "/games/$game_id/tilesets" );
	$tilesets ||= [];
	foreach my $tileset (@$tilesets) {
		my $dir_data = $self->{storage}->get_metadata( "/games/$game_id/assets" . $tileset->{Path} );
		if ($dir_data && $dir_data->{Files} && $dir_data->{Files}->{File}) {
			$tileset->{Files} = { File => [] };
			XMLalwaysarray( xml=>$dir_data->{Files}, element=>'File' );
			foreach my $file (@{$dir_data->{Files}->{File}}) {
				push @{$tileset->{Files}->{File}}, $file->{Name};
			}
		}
	}
	$game_def->{Tilesets} = { Tileset => $tilesets };
	
	my $fonts = $self->{storage}->list_get( "/games/$game_id/fonts" );
	$fonts ||= [];
	$game_def->{Fonts} = { Font => $fonts };

	my $keys = $self->{storage}->list_get( "/games/$game_id/keys" );
	$keys ||= [];
	$game_def->{Keys} = { Key => $keys };
	
	my $sounds = $self->{storage}->list_get( "/games/$game_id/audio" );
	$sounds ||= [];
	$game_def->{Sounds} = { Sound => $sounds };
	
	my $levels = $self->{storage}->list_get( "/games/$game_id/levels" );
	$levels ||= [];
	$game_def->{Levels} = { Level => $levels };
	
	my $envs = $self->{storage}->list_get( "/games/$game_id/envs" );
	$envs ||= [];
	$game_def->{Envs} = { Env => $envs };
	
	$content .= 'Effect.Game.setGameDef(' . xml_to_javascript( $game_def, 1, compress => ($ver_data->{File} eq 'src') ? 0 : 1 ) . ");";
	
	# set base asset url
	$content .= 'Effect.Game.setBaseAssetURL("'.$self->get_base_url().'api/view/games/'.$game_id.'/assets");';
	
	# pass along query string as JSON
	$query->{mode} = 'dev';
	$query->{rev} = 'dev';
	$content .= 'Effect.Game.setQuery('.xml_to_javascript($query, 1, compress => 1).');';
	
	# asset mod date (for cache control)
	my $stats = $self->{storage}->get_metadata($game_path . '/stats');
	$content .= 'Effect.Game.setAssetModDate('.$stats->{AssetMod}.');';
	
	if ($game->{Plugin}) {
		# footer
		$content .= "\n\n" . $self->get_string('/Engine/Footer') . "\n\n";
		
		my $all_plugins = $self->{storage}->permacache_get('/admin/engine_plugins');
		XMLalwaysarray( xml=>$all_plugins, element=>'Plugin' );
		$all_plugins = $all_plugins->{Plugin};
		
		$self->log_debug(5, "All Plugins: " . dumper($all_plugins) );
		
		foreach my $plugin_thingy (split(/\,\s*/, $game->{Plugin})) {
			$self->log_debug(5, "Looking for Plugin: " . $plugin_thingy);
			if ($plugin_thingy =~ /^(\w+)\-(.+)$/) {
				my ($plugin_name, $plugin_ver) = ($1, $2);
				my $plug_data = find_object( $all_plugins, Name => $plugin_name, Version => $plugin_ver );
				if (!$plug_data) {
					return $self->nice_js_error("Could not locate engine plugin: $plugin_name-$plugin_ver");
				}
				my $plug_file = $self->{config}->{Paths}->{EngineDir} . '/plugins/' . $plug_data->{_Attribs}->{File};
				$self->log_debug(5, "Including plugin file contents: $plug_file");
				$content .= load_file( $plug_file );
			}
			else { $self->log_debug(5, "Bad plugin thingy: $plugin_thingy"); }
		} # foreach game plugin
	}
	
	# include any code pre-uploaded from the "src" folder
	my $src_folder = $self->{storage}->get_metadata( $game_path . '/assets/src' );
	my $has_code = 0;
	if ($src_folder && $src_folder->{Files} && $src_folder->{Files}->{File}) {
		XMLalwaysarray( xml=>$src_folder->{Files}, element=>'File' );
		foreach my $file (sort { lc($a->{Name}) cmp lc($b->{Name}); } @{$src_folder->{Files}->{File}}) {
			if ($file->{Name} =~ /\.js$/i) {
				if (!$has_code) {
					$content .= "\n\n" . $self->get_string('/Engine/Footer') . "\n\n";
					$has_code = 1;
				}
				$content .= $self->{storage}->get_file_contents( $game_path . '/assets/src', $file->{Name} ) || '';
				$content .= "\n";
			} # is js
		} # foreach file
	} # src folder
	
	$self->{session}->{request}->headers_out()->set( 'Cache-Control', 'no-cache' );
	# $self->{session}->{request}->headers_out()->set( 'Last-Modified', time2str( (stat($full_path))[9] ) );
	# $self->{session}->{request}->headers_out()->set( 'Expires', 
	# 	time2str( time() ) ) 
	# );
	
	$content = $self->encode_output( $content );
		
	$self->{session}->{request}->content_type( 'text/javascript' );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', length($content) );
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
	
	$self->session_unmark();
}

sub api_level_editor {
	##
	# Run engine for level editor
	##
	my $self = shift;
	
	my $query = $self->{session}->{query};
	
	# grab session from query
	if (!$query->{key}) {
		return $self->nice_js_error("No API Key is specified on the URL.");
	}
	$self->{session}->{cookie}->{effect_session_id} = 'login_' . $query->{key};
	
	if (!$self->validate_session('login', 'readonly')) {
		return $self->nice_js_error("Your API key is invalid.");
	}
	my $username = $self->{session}->{db}->{username};
	
	my $game_id = $query->{game};
	if (!$game_id) {
		return $self->nice_js_error("No Game ID specified on query string.");
	}
	
	my $level_id = $query->{level};
	if (!$level_id) {
		return $self->nice_js_error("No Level ID specified on query string.");
	}
	
	my $engine_ver = $self->{config}->{LevelEditor}->{EngineVersion};
	
	if (!$self->require_game_read_access($game_id, 'readonly')) {
		return $self->nice_js_error("You are not a member of the game $game_id.");
	}
	
	my $engine_versions = $self->{storage}->permacache_get('/admin/engine_versions');
	XMLalwaysarray( xml=>$engine_versions, element=>'Version' );
	$engine_versions = $engine_versions->{Version};
	
	my $ver_data = XMLsearch( xml=>$engine_versions, Name => $engine_ver );
	if (!$ver_data) {
		return $self->nice_js_error("Could not locate engine version: $engine_ver");
	}
	
	my $game_path = '/games/' . $game_id;
	my $game = $self->{storage}->get_metadata( $game_path );
	
	my $content = '';
	$content .= $self->get_string('/Engine/Header') . "\n\n";
	
	# load engine and include in output
	my $engine_file = $self->{config}->{Paths}->{EngineDir} . '/' . $ver_data->{File};
	if ($ver_data->{File} eq 'src') {
		# use raw source of engine
		
		my $obfuscate = parse_xml( $self->{config}->{Paths}->{ConfDir} . '/obfuscate.xml' );
		foreach my $filename (@{$obfuscate->{SourceFiles}->{File}}) {
			$content .= load_file( '/effect/src/' . $filename );
		}
		
		# special debug class, only for engine src mode
		$content .= load_file( '/effect/src/Debug.class.js' );
	}
	elsif (-e $engine_file) {
		$content .= load_file( $engine_file );
		
		# stub function just in case
		# $content .= 'window.Debug={trace:function(){}};';
		$content .= 'if (!window.Debug) window.Debug={trace:function(){}};';
	}
	else {
		return $self->nice_js_error("Could not locate engine version: $engine_ver");
	}
	
	# next, create game definition
	my $game_def = copy_hash_remove_keys($game, 
		'Description', 'DescriptionHTML', 'Owner', 'State', 'Access', 'UserCodeHTML', 'ReleaseNotesHTML',
		'TwitterUsername', 'TwitterPassword'
	);
	$game_def->{PreloadAll} = 0;
	$game_def->{BackgroundImage} = '';
	
	# pass along zoom
	$game_def->{Zoom} = "Force";
	$game_def->{ZoomDefault} = $query->{zoom} || 1;
	
	# disable audio completely
	$game_def->{AudioEnabled} = 0;
	
	# add sprites and tiles
	my $sprites = $self->{storage}->list_get( "/games/$game_id/sprites" );
	$sprites ||= [];
	$game_def->{Sprites} = { Sprite => $sprites };

	my $tiles = $self->{storage}->list_get( "/games/$game_id/tiles" );
	$tiles ||= [];
	$game_def->{Tiles} = { Tile => $tiles };
	
	my $tilesets = $self->{storage}->list_get( "/games/$game_id/tilesets" );
	$tilesets ||= [];
	foreach my $tileset (@$tilesets) {
		my $dir_data = $self->{storage}->get_metadata( "/games/$game_id/assets" . $tileset->{Path} );
		if ($dir_data && $dir_data->{Files} && $dir_data->{Files}->{File}) {
			$tileset->{Files} = { File => [] };
			XMLalwaysarray( xml=>$dir_data->{Files}, element=>'File' );
			foreach my $file (@{$dir_data->{Files}->{File}}) {
				push @{$tileset->{Files}->{File}}, $file->{Name};
			}
		}
	}
	$game_def->{Tilesets} = { Tileset => $tilesets };
	
	# only load requested level, and force it to preload
	my $level = $self->{storage}->list_find( "/games/$game_id/levels", { Name => $level_id } );
	if (!$level) {
		return $self->nice_js_error("Could not find level: $level_id");
	}
	$level->{Preload} = 1;
	$game_def->{Levels} = { Level => [$level] };
	
	my $envs = $self->{storage}->list_get( "/games/$game_id/envs" );
	$envs ||= [];
	$game_def->{Envs} = { Env => $envs };
	
	$content .= 'Effect.Game.setGameDef(' . xml_to_javascript( $game_def, 1, compress => ($ver_data->{File} eq 'src') ? 0 : 1 ) . ");";
	
	# set base asset url
	$content .= 'Effect.Game.setBaseAssetURL("'.$self->get_base_url().'api/view/games/'.$game_id.'/assets");';
	
	# pass along query string as JSON
	$query->{mode} = 'leveleditor';
	$query->{rev} = 'dev';
	$content .= 'Effect.Game.setQuery('.xml_to_javascript($query, 1, compress => 1).');';
	
	# asset mod date (for cache control)
	my $stats = $self->{storage}->get_metadata($game_path . '/stats');
	$content .= 'Effect.Game.setAssetModDate('.$stats->{AssetMod}.');';
	
	$self->{session}->{request}->headers_out()->set( 'Cache-Control', 'no-cache' );
	# $self->{session}->{request}->headers_out()->set( 'Last-Modified', time2str( (stat($full_path))[9] ) );
	# $self->{session}->{request}->headers_out()->set( 'Expires', 
	# 	time2str( time() ) ) 
	# );
	
	$content = $self->encode_output( $content );
		
	$self->{session}->{request}->content_type( 'text/javascript' );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', length($content) );
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
	
	$self->session_unmark();
}

sub api_gf {
	##
	# Render HTML for playing game in frame
	##
	my $self = shift;
	my $content = '';
	
	if ($self->{session}->{uri} =~ m@/gf/([\w\-]+)/([\w\.\-]+)@) {
		my ($game_id, $rev_id) = ($1, $2);
		
		# locate rev metadata
		my $rev = $self->{storage}->list_find( "/games/$game_id/revs", { Name => $rev_id } );
		if (!$rev) { return $self->html_error("Could not find game revision: $game_id / $rev_id" ); }
		
		$content .= '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">';
		$content .= '<html>';
		$content .= '<head><title>Effect Games IFRAME</title></head>';
		$content .= '<body style="margin:0; padding:0;">';
		$content .= '<script type="text/javascript" src="/effect/api/play.js?game=' . 
			$game_id . '&rev=' . $rev_id . '&mode=iframe"></script>';
		
		if ($self->{config}->{GoogAnalID}) {
			$content .= "<script type=\"text/javascript\">var _gaq = _gaq || [];_gaq.push(['t1._setAccount', '".$self->{config}->{GoogAnalID}."']);_gaq.push(['t1._trackPageview']);</script>\n";
		}
		if ($rev->{GoogAnalID}) {
			$content .= "<script type=\"text/javascript\">var _gaq = _gaq || [];_gaq.push(['t2._setAccount', '".$rev->{GoogAnalID}."']);_gaq.push(['t2._trackPageview']);</script>\n";
		}
		if ($self->{config}->{GoogAnalID} || $rev->{GoogAnalID}) {
			$content .= "<script type=\"text/javascript\">(function() {var ga = document.createElement('script');ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';ga.setAttribute('async', 'true');document.documentElement.firstChild.appendChild(ga);})();</script>\n";
		}
		
		$content .= '</body></html>' . "\n";
		
		# cache headers
		$self->set_ttl( 'ViewTTL' );
		$self->header_out( 'Last-Modified', time2str( $rev->{_Attribs}->{Modified} ) );
	}
	else {
		# Bad URL
		$content = $self->process_psp_file($self->{config}->{Paths}->{WebDir} . '/error.psp.html', {
			description => "Bad URL Syntax"
		});
	}
	
	# content encoding
	$content = $self->encode_output( $content );
		
	$self->{session}->{request}->content_type( 'text/html' );
	$self->header_out( 'Content-Length', length($content) );
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub api_rewrite_play {
	##
	# Internal rewrite:
	#	/effect/games/GAMEID/REVID --> /effect/play.psp.html?game=GAMEID&rev=REVID
	##
	my $self = shift;
	
	if ($self->{session}->{uri} =~ m@/games/([\w\-]+)/([\w\.\-]+)@) {
		my ($game_id, $rev_id) = ($1, $2);
		$self->{session}->{uri} = '/effect/play.psp.html?game=' . $game_id . '&rev=' . $rev_id;
		$self->{session}->{query}->{game} = $game_id;
		$self->{session}->{query}->{rev} = $rev_id;
		return $self->api_psp();
	}
	elsif ($self->{session}->{uri} =~ m@/games/([\w\-]+)@) {
		# game only, no rev specified, find latest appropriate rev
		
		my $game_id = $1;
		my $path = "/games/$game_id/revs";
		my $rev = $self->{storage}->list_find( $path, { RevType => 'Public' } );
		if (!$rev) {
			$rev = $self->{storage}->list_find( $path, { RevType => 'Release Candidate' } );
			if (!$rev) {
				$rev = $self->{storage}->list_find( $path, { RevType => 'Beta' } );
				if (!$rev) {
					$rev = $self->{storage}->list_find( $path, { RevType => 'Alpha' } );
				}
			}
		}
		
		if ($rev) {
			my $rev_id = $rev->{Name};
			$self->{session}->{uri} = '/effect/play.psp.html?game=' . $game_id . '&rev=' . $rev_id;
			$self->{session}->{query}->{game} = $game_id;
			$self->{session}->{query}->{rev} = $rev_id;
			return $self->api_psp();
		}
		else {
			return $self->html_error( "Cannot find a public, beta or alpha release for $game_id." );
		}
	}
	else {
		return $self->html_error( "Bad URL Syntax" );
	}
}

sub api_play {
	##
	# Run engine
	##
	my $self = shift;
	
	my $query = $self->{session}->{query};
	
	my $game_id = $query->{game};
	if (!$game_id) {
		return $self->nice_js_error("No Game ID specified on query string.");
	}
	
	my $rev_id = $query->{rev};
	if (!$rev_id) {
		return $self->nice_js_error("No Revision ID specified on query string.");
	}
	
	# locate rev metadata
	my $rev = $self->{storage}->list_find( "/games/$game_id/revs", { Name => $rev_id } );
	if (!$rev) { return $self->nice_js_error("Could not find game revision: $game_id / $rev_id" ); }
	
	# load revision's copy of game metadata
	my $game_path = "/games/$game_id/revisions/$rev_id";
	my $game = $self->{storage}->get_metadata( $game_path );
	if (!$game) { return $self->nice_js_error("Could not find game revision: $game_id / $rev_id" ); }
	
	my $is_password_protected = $rev->{Password} && ($rev->{RevType} =~ /^(Alpha|Beta|Release\sCandidate)$/);
	
	# if rev is internal, we need a valid session to continue
	if ($rev->{RevType} eq 'Internal') {
		# grab session from query
		if (!$query->{key}) {
			return $self->nice_js_error("No API Key is specified on the URL.");
		}
		$self->{session}->{cookie}->{effect_session_id} = 'login_' . $query->{key};
	
		if (!$self->validate_session('login', 'readonly')) {
			return $self->nice_js_error("Your session is invalid.  Please <a href=\"".$self->get_base_url()."#Home\" target=\"_blank\">login to the site</a> and try this page again.");
		}
		
		if (!$self->require_game_member($game_id, 'readonly')) {
			return $self->nice_js_error("You are not a member of the game $game_id.");
		}
	} # internal rev
	elsif ($is_password_protected && ($query->{mode} eq 'iframe')) {
		return $self->nice_js_error("This game revision cannot be exported, as it is password protected.");
	}
	
	my $engine_ver = $rev->{Engine};
	if (!$engine_ver) {
		return $self->nice_js_error("No Engine Version specified in revision.");
	}
	
	my $engine_versions = $self->{storage}->permacache_get('/admin/engine_versions');
	XMLalwaysarray( xml=>$engine_versions, element=>'Version' );
	$engine_versions = $engine_versions->{Version};
	
	my $ver_data = XMLsearch( xml=>$engine_versions, Name => $engine_ver );
	if (!$ver_data) {
		return $self->nice_js_error("Could not locate engine version: $engine_ver");
	}
		
	my $content = '';
	$content .= $self->get_string('/Engine/Header') . "\n\n";
	
	# then, the port and toolbar DIVs
	my $init_html = trim(load_file($self->{config}->{Paths}->{EngineDir} . '/init.html'));
	$init_html =~ s/\n\s*//g;
	$content .= "document.write('".$init_html."');";
	
	# if protect mode is enabled, wrap entire engine and game code in self-calling function
	if ($rev->{Protect}) {
		$content .= "(function() {";
	}
	
	# ogg ready has to be a variable outside the engine
	if ($game->{OggReady}) {
		$content .= "var EffectAudioOggReady = true;";
	}
	
	# load engine and include in output
	my $engine_mod = 0;
	my $engine_file = $self->{config}->{Paths}->{EngineDir} . '/' . $ver_data->{File};
	if ($ver_data->{File} eq 'src') {
		# use raw source of engine
		
		my $obfuscate = parse_xml( $self->{config}->{Paths}->{ConfDir} . '/obfuscate.xml' );
		foreach my $filename (@{$obfuscate->{SourceFiles}->{File}}) {
			$content .= load_file( '/effect/src/' . $filename );
		}
		
		# special debug class, only for engine src mode
		$content .= load_file( '/effect/src/Debug.class.js' );
	}
	elsif (-e $engine_file) {
		$engine_mod = (stat($engine_file))[9];
		$content .= load_file( $engine_file );
		
		# stub function just in case
		$content .= 'if (!window.Debug) window.Debug={trace:function(){}};';
		# $content .= load_file( '/effect/src/Debug.class.js' );
	}
	else {
		return $self->nice_js_error("Could not locate engine version: $engine_ver");
	}
	
	# next, create game definition
	my $game_def = copy_hash_remove_keys($game, 
		'Description', 'DescriptionHTML', 'Owner', 'State', 'Access', 'TwitterUsername', 'TwitterPassword');
	
	# add sprites, tiles, fonts, keys, audio to def
	my $sprites = $self->{storage}->list_get( "$game_path/sprites" );
	$sprites ||= [];
	$game_def->{Sprites} = { Sprite => $sprites };

	my $tiles = $self->{storage}->list_get( "$game_path/tiles" );
	$tiles ||= [];
	$game_def->{Tiles} = { Tile => $tiles };
	
	my $tilesets = $self->{storage}->list_get( "$game_path/tilesets" );
	$tilesets ||= [];
	foreach my $tileset (@$tilesets) {
		my $dir_data = $self->{storage}->get_metadata( "$game_path/assets" . $tileset->{Path} );
		if ($dir_data && $dir_data->{Files} && $dir_data->{Files}->{File}) {
			$tileset->{Files} = { File => [] };
			XMLalwaysarray( xml=>$dir_data->{Files}, element=>'File' );
			foreach my $file (@{$dir_data->{Files}->{File}}) {
				push @{$tileset->{Files}->{File}}, $file->{Name};
			}
		}
	}
	$game_def->{Tilesets} = { Tileset => $tilesets };
	
	my $fonts = $self->{storage}->list_get( "$game_path/fonts" );
	$fonts ||= [];
	$game_def->{Fonts} = { Font => $fonts };

	my $keys = $self->{storage}->list_get( "$game_path/keys" );
	$keys ||= [];
	$game_def->{Keys} = { Key => $keys };
	
	my $sounds = $self->{storage}->list_get( "$game_path/audio" );
	$sounds ||= [];
	$game_def->{Sounds} = { Sound => $sounds };
	
	my $levels = $self->{storage}->list_get( "$game_path/levels" );
	$levels ||= [];
	$game_def->{Levels} = { Level => $levels };
	
	my $envs = $self->{storage}->list_get( "$game_path/envs" );
	$envs ||= [];
	$game_def->{Envs} = { Env => $envs };
	
	$content .= 'Effect.Game.setGameDef(' . xml_to_javascript( $game_def, 1, compress => ($ver_data->{File} eq 'src') ? 0 : 1 ) . ");";
	
	# pre-create top-level sprite+tile namespaces, if in protect mode
	if ($rev->{Protect}) {
		foreach my $obj (@$sprites, @$tiles) {
			my $tn_name = $obj->{Name}; $tn_name =~ s/\..+$//;
			$content .= "var $tn_name = null;";
		}
	}
	
	# set base asset url
	$content .= 'Effect.Game.setBaseAssetURL("'.$self->get_base_url().'api/view/games/'.$game_id.'/revisions/'.$rev_id.'/assets");';
	
	# pass along query string as JSON
	$content .= 'Effect.Game.setQuery('.xml_to_javascript( { %$query, 
		revpwd => $is_password_protected ? 1 : 0
	}, 1, compress => 1, force_strings => 1).');';
	
	# asset mod date (for cache control)
	my $stats = $self->{storage}->get_metadata($game_path . '/stats');
	$content .= 'Effect.Game.setAssetModDate('.$stats->{AssetMod}.');';
	
	# log a view
	$content .= "(new Image()).src = '" . $self->get_base_url() . "api/logplay/" . $game_id . "/" . $rev_id . "?referrer=' + escape(document.referrer);\n";
	
	# engine build date
	$content .= "\n// Engine Built: " . (scalar localtime($engine_mod)) . "\n";
	
	# notice
	$content .= "\n\n" . $self->get_string('/Engine/Footer') . "\n\n";
	
	# plugins
	if ($rev->{Plugin}) {
		$content .= $self->{storage}->get_file_contents( $game_path, 'plugins.js' ) . "\n";
	}
	
	# user code
	$content .= $self->{storage}->get_file_contents( $game_path, 'user_code.js' ) . "\n";
	
	# close protection function
	if ($rev->{Protect}) {
		$content .= "})();\n";
	}
	
	# cache headers
	$self->set_ttl( 'ViewTTL' );
	$self->header_out( 'Last-Modified', time2str( ($engine_mod > $rev->{_Attribs}->{Modified}) ? $engine_mod : $rev->{_Attribs}->{Modified} ) );
	
	# content encoding
	$content = $self->encode_output( $content );
		
	$self->{session}->{request}->content_type( 'text/javascript' );
	$self->header_out( 'Content-Length', length($content) );
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
	
	$self->log_print(
		category => 'view',
		code => length($content),
		msg => get_request_url(),
		client_info => get_client_info()
	);
	
	$self->session_unmark();
}

sub api_logplay {
	##
	# Log an event for a game play session
	##
	my $self = shift;
	
	$self->log_print(
		category => 'view',
		code => 0,
		msg => get_request_url(),
		client_info => get_client_info()
	);
	
	$self->{session}->{request}->headers_out()->set( 'Cache-Control', 'no-cache' );
	
	my $content = load_file('/effect/htdocs/images/spacer.gif');
		
	$self->{session}->{request}->content_type( 'image/gif' );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', length($content) );
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub nice_js_error {
	##
	# Return nice JavaScript error
	##
	my ($self, $msg) = @_;
	
	$self->log_debug(2, "Error: $msg");
	
	my $content = 'document.write('.escape_js('<div style="border:1px solid red; margin:20px; padding:20px;"><h2>ERROR: '.$msg.'</h2></div>').');' . "\n";
	
	$self->{session}->{request}->content_type( 'text/javascript' );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', length($content) );
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub throw_game_rev_file_upload_error {
	##
	# Stuff error in DB, so client can fetch it later
	# (Flash upload cannot receive direct response)
	##
	my ($self, $path, $msg) = @_;
	
	my $data = $self->{storage}->get_metadata( $path );
	$data->{LastUploadError} = $msg;
	
	$self->{storage}->mark( $path );
	
	return $self->api_error('upload', $msg);
}

sub api_game_rev_file_upload {
	my $self = shift;
	
	##
	# Flash doesn't send browser cookies, so we must recover session from query string
	##
	$self->{session}->{cookie}->{effect_session_id} = $self->{session}->{query}->{session};
	return unless $self->validate_session();
	
	my $username = $self->{session}->{db}->{username};
	my $user = $self->get_user($username);
	if (!$user) { return $self->api_error('upload', 'Could not load user: ' . $username); }
	
	my $query = $self->{session}->{query};
	my $game_id = $query->{game_id};
	my $dir_path = '/games/' . $game_id . '/rev_stage';
	
	return unless $self->require_game_member($game_id);
	
	my $data = $self->{storage}->get_metadata( $dir_path );
	if (!$data) {
		my $result = $self->{storage}->create_record( $dir_path, {
			Files => { File => [] }
		} );
		if (!$result) { return $self->throw_game_rev_file_upload_error($dir_path, 'Failed to store file: ' . $self->{storage}->{error}); }
		
		$data = $self->{storage}->get_metadata( $dir_path );
	}
	
	if (!$data->{Files}) { $data->{Files} = {}; }
	if (!$data->{Files}->{File}) { $data->{Files}->{File} = []; }
	XMLalwaysarray( xml=>$data->{Files}, element=>'File' );
	
	delete $data->{LastUploadError};
	$self->{storage}->mark( $dir_path );
	
	my $upload = $self->{session}->{query}->{Filedata_data};
	if (!$upload && !$self->{session}->{raw_post_data}) { return $self->throw_game_rev_file_upload_error($dir_path, 'Upload data not found: Filedata'); }
	
	my $client_filename = ''.$self->{session}->{query}->{Filedata};
	if ($client_filename !~ /\.(\w+)$/) { return $self->throw_game_rev_file_upload_error($dir_path, 'Uploaded file has no extension: ' . $client_filename); }
	my $ext = $1;
	
	my $storage_key = $dir_path;
	
	# clean up client filename
	my $orig_filename = $client_filename;
	$client_filename =~ s@\\@/@g;
	$client_filename = basename($client_filename);
	$client_filename =~ s/\s/_/g;
	$client_filename =~ s/_+/_/g;
	$client_filename =~ s/[^\w\.\-]+//g;
	if (!length($client_filename)) { return $self->throw_game_rev_file_upload_error($dir_path, 'Uploaded file has a bad filename: ' . $orig_filename); }
	if (length($client_filename) > 64) {
		$client_filename =~ s@\.\w+$@@;
		$client_filename = substr($client_filename, 0, 63 - length($ext)) . '.' . $ext;
	}
	
	my $raw_data = $upload || $self->{session}->{raw_post_data};
	my $new_size = length($raw_data);
	my $filename = $client_filename;
	my $byte_count = 0;
	my $action = '';
	
	# maybe add to Files->File array or replace existing
	my $old_file = XMLsearch( xml=>$data->{Files}->{File}, Name=>$filename );
	if ($old_file) {
		$self->log_debug(5, "Replacing existing file: $dir_path$filename");
		$byte_count = $new_size - $old_file->{Size};
		$action = 'replace';
		$old_file->{Size} = $new_size;
		$old_file->{Modified} = time();
		$old_file->{Username} = $username;
	}
	else {
		# add new file to list
		$self->log_debug(5, "Adding new file: $dir_path$filename");
		$byte_count = $new_size;
		$action = 'add';
		push @{$data->{Files}->{File}}, {
			Name => $filename,
			Size => $new_size,
			Created => time(),
			Modified => time(),
			Username => $username
		};
	}
	
	# log transaction
	$self->log_transaction( 'game_rev_file_upload_' . $action, { game_id => $game_id, path => "$dir_path$filename" } );
	
	my $result = $self->{storage}->store_file( $storage_key, $filename, $raw_data );
	if (!$result) { return $self->throw_game_rev_file_upload_error($dir_path, 'Failed to store file: ' . $self->{storage}->{error}); }
	
	$self->set_response(0, "Success");
}

sub api_game_rev_get_files {
	##
	# Get list of files in revision staging area (upload temp)
	##
	my $self = shift;
	return unless $self->validate_session();
	
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	
	my $game_id = $query->{game_id};
	my $dir_path = '/games/' . $game_id . '/rev_stage';
	
	return unless $self->require_game_read_access($game_id);
	
	my $data = $self->{storage}->get_metadata( $dir_path );
	if (!$data) { $data = { Files => { File => [] } }; }
	
	$response->{Data} = $data;
	$self->set_response(0, "Success");
	
	$self->session_unmark();
}

sub api_game_rev_file_delete {
	##
	# Delete one or all files from rev stage area
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => 'GameID'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	my $dir_path = '/games/' . $game_id . '/rev_stage';
	
	return unless $self->require_game_member($game_id);
	
	my $data = $self->{storage}->get_metadata( $dir_path );
	if (!$data) {
		# files do not exist, so might as well return success
		$self->set_response(0, "Success");
		return 1;
	}
	
	my $filenames = {};
	my $bytes_deleted = 0;
	
	if ($xml->{All}) { $xml->{Files} = $data->{Files}; }
	
	if (!$xml->{Files} || !$xml->{Files}->{File}) {
		# files already deleted, so might as well return success
		$self->set_response(0, "Success");
		return 1;
	}
	
	XMLalwaysarray( xml=>$xml->{Files}, element=>'File' );
	foreach my $thingy (@{$xml->{Files}->{File}}) {
		my $filename = ref($thingy) ? $thingy->{Name} : $thingy;
		if (!$self->{storage}->delete_file( $dir_path, $filename )) {
			return $self->api_error('game', "Could not delete file: $filename");
		}
		$self->log_transaction( 'game_rev_delete_file', { game_id => $game_id, path => "$dir_path$filename" } );
		$filenames->{$filename} = 1;
	}
	
	if (!$data->{Files}) { $data->{Files} = {}; }
	if (!$data->{Files}->{File}) { $data->{Files}->{File} = []; }
	XMLalwaysarray( xml=>$data->{Files}, element=>'File' );
	my $new_files = [];
	
	foreach my $file (@{$data->{Files}->{File}}) {
		my $filename = $file->{Name};
		if (!$filenames->{ $filename }) { push @$new_files, $file; }
		else { $bytes_deleted += $file->{Size}; }
	}
	$data->{Files}->{File} = $new_files;
	
	if (!$self->{storage}->store_metadata( $dir_path, $data )) {
		return $self->api_error('game', "Could not store metadata: $dir_path: " . $self->{storage}->{error});
	}
	
	$self->set_response(0, "Success");
}

sub game_delete_revision {
	##
	# Delete all data associated with revision
	##
	my ($self, $game_id, $rev_id) = @_;
	
	$self->log_debug(4, "Deleting game revision: $game_id: $rev_id");
	
	my $base_path = '/games/' . $game_id . '/revisions/' . $rev_id;
	
	$self->{storage}->delete_record($base_path);
	$self->{storage}->delete_record($base_path.'/stats');
	
	# track bytes for quota
	my $byte_count = 0;
	
	my $folder_data = $self->{storage}->get_metadata( $base_path . '/asset_folders' );
	if ($folder_data && $folder_data->{FolderList}) {
		my $folder_paths = xpath_summary( $folder_data->{FolderList}, '/', 'inc_refs' );
		$folder_paths->{'/'} = 1;
		
		foreach my $subpath (sort keys %$folder_paths) {
			if ($self->{storage}->check_record_exists($base_path . '/assets' . $subpath)) {
				$byte_count -= $self->{storage}->delete_record($base_path . '/assets' . $subpath);
			}
		} # foreach asset dir path
	} # game has asset dirs
	
	if ($byte_count < 0) {
		# file has shrunk, update quota
		return unless $self->lock_update_record( "/games/$game_id/stats", { Quota => '+'.int($byte_count * -1) }, 1 );
	}
	
	$self->{storage}->delete_record($base_path.'/asset_folders');
	
	# level data
	my $levels = $self->{storage}->list_get( "$base_path/levels" );
	if ($levels) {
		foreach my $level (@$levels) {
			if ($self->{storage}->check_record_exists($base_path.'/level_data/'.$level->{Name})) {
				$self->{storage}->delete_record($base_path.'/level_data/'.$level->{Name}); 
			}
			if ($self->{storage}->check_record_exists($base_path.'/level_nav/'.$level->{Name})) {
				$self->{storage}->delete_record($base_path.'/level_nav/'.$level->{Name}); 
			}
		} # foreach level
	} # has levels
	
	# objects
	foreach my $obj_type ('sprites', 'tiles', 'tilesets', 'fonts', 'keys', 'levels', 'audio', 'envs') {
		if ($self->{storage}->check_record_exists($base_path.'/'.$obj_type)) { $self->{storage}->list_delete($base_path.'/'.$obj_type); }
	}
	
	$self->log_debug(4, "Revision delete complete.");
	
	return ($byte_count * -1) || 1;
}

sub game_create_revision {
	##
	# Publish game rev, called from api_game_create_object()
	##
	my $self = shift;
	my $cmd = shift;
	my $xml = shift;
	
	my $game_id = $xml->{GameID};
	my $rev_id = $xml->{Name};
	
	$self->log_debug(4, (($cmd eq 'create') ? "Creating" : "Updating") . " game revision: $game_id: $rev_id");
	
	my $old_base_path = '/games/' . $game_id;
	my $new_base_path = '/games/' . $game_id . '/revisions/' . $rev_id;
	
	my $old_user_code = '';
	if ($cmd eq 'update') {
		# grab user code from revision, in case user is NOT uploading new code to replace it
		$old_user_code = $self->{storage}->get_file_contents( $new_base_path, 'user_code.js' ) || '';
	}
	
	# game
	if ($self->{storage}->check_record_exists($new_base_path)) { $self->{storage}->delete_record($new_base_path); }
	if (!$self->{storage}->copy_record($old_base_path, $new_base_path)) {
		return $self->api_error('game', "Could not write revision (base): " . $self->{storage}->{error});
	}
	
	# stats
	if ($self->{storage}->check_record_exists($new_base_path.'/stats')) { $self->{storage}->delete_record($new_base_path.'/stats'); }
	if (!$self->{storage}->copy_record($old_base_path.'/stats', $new_base_path.'/stats')) {
		return $self->api_error('game', "Could not write revision (stats): " . $self->{storage}->{error});
	}
	
	# track bytes for quota
	my $byte_count = 0;
	my $total_bytes = 0;
	
	# assets
	if ($self->{storage}->check_record_exists($new_base_path.'/asset_folders')) { $self->{storage}->delete_record($new_base_path.'/asset_folders'); }
	if (!$self->{storage}->copy_record($old_base_path . '/asset_folders', $new_base_path . '/asset_folders')) {
		return $self->api_error('revision', "Could not write revision (asset_folders): " . $self->{storage}->{error});
	}
	
	my $folder_data = $self->{storage}->get_metadata( $old_base_path . '/asset_folders' );
	if (!$folder_data) {
		return $self->api_error('revision', "Could not locate asset folder list for game.");
	}
	if ($folder_data->{FolderList}) {
		my $folder_paths = xpath_summary( $folder_data->{FolderList}, '/', 'inc_refs' );
		$folder_paths->{'/'} = 1;
		
		$self->log_debug(5, "Folder list xpath summary: " . serialize_object($folder_paths) );
		
		foreach my $subpath (sort keys %$folder_paths) {
			$self->log_debug(5, "Working on asset folder: $subpath");
			if ($self->{storage}->check_record_exists( $old_base_path . '/assets' . $subpath )) {
				$self->log_debug(5, "Folder $subpath exists, copying it");
				if ($self->{storage}->check_record_exists($new_base_path . '/assets' . $subpath)) {
					$byte_count -= $self->{storage}->delete_record($new_base_path . '/assets' . $subpath);
				}
				
				my $bytes = $self->{storage}->copy_record($old_base_path . '/assets' . $subpath, $new_base_path . '/assets' . $subpath);
				if (!$bytes) {
					return $self->api_error('revision', "Could not write revision (assets$subpath): " . $self->{storage}->{error});
				}
				$byte_count += $bytes;
				$total_bytes += $bytes;
			} # folder exists
			else {
				$self->log_debug(5, "Folder $subpath DOES NOT EXIST, skipping");
			}
		} # foreach asset dir path
	} # game has asset dirs
	
	# quota check and update
	if ($byte_count > 0) {
		my $stats_path = '/games/' . $game_id . '/stats';
		$self->{storage}->lock_record( $stats_path, 1 ); # exclusive
		my $stats = $self->{storage}->get_metadata( $stats_path );
		if (!$stats) {
			$self->{storage}->unlock_record( $stats_path );
			return $self->api_error('revision', 'Could not load game stats record: ' . $stats_path); 
		}
		if ($stats->{Quota} - $byte_count <= 0) {
			$self->{storage}->unlock_record( $stats_path );
			return $self->api_error('revision', $self->{config}->{Strings}->{AssetManager}->{OutOfSpace});
		}
		$stats->{Quota} -= $byte_count;
		if (!$self->{storage}->store_metadata( $stats_path, $stats )) {
			$self->{storage}->unlock_record( $stats_path );
			return $self->api_error( 'revision', "Failed to update stats record: $stats_path: " . $self->{storage}->{error} );
		}
		$self->{storage}->unlock_record( $stats_path );
	}
	elsif ($byte_count < 0) {
		# file has shrunk, update quota
		return unless $self->lock_update_record( "/games/$game_id/stats", { Quota => '+'.int($byte_count * -1) }, 1 );
	}
	
	# objects
	foreach my $obj_type ('sprites', 'tiles', 'tilesets', 'fonts', 'keys', 'levels', 'audio', 'envs') {
		if ($self->{storage}->check_record_exists( $old_base_path . '/' . $obj_type )) {
			if ($self->{storage}->check_record_exists($new_base_path.'/'.$obj_type)) { $self->{storage}->list_delete($new_base_path.'/'.$obj_type); }
			if (!$self->{storage}->list_copy( $old_base_path . '/' . $obj_type, $new_base_path . '/' . $obj_type )) {
				return $self->api_error('game', "Could not write revision ($obj_type): " . $self->{storage}->{error});
			}
		}
	}
	
	# level data
	my $levels = $self->{storage}->list_get( "/games/$game_id/levels" );
	if ($levels) {
		foreach my $level (@$levels) {
			if ($self->{storage}->check_record_exists( $old_base_path . '/level_data/' . $level->{Name} )) {
				if ($self->{storage}->check_record_exists($new_base_path.'/level_data/'.$level->{Name})) {
					$self->{storage}->delete_record($new_base_path.'/level_data/'.$level->{Name}); 
				}
				if (!$self->{storage}->copy_record($old_base_path . '/level_data/' . $level->{Name}, $new_base_path . '/level_data/' . $level->{Name})) {
					return $self->api_error('game', "Could not write revision (level_data/".$level->{Name}."): " . $self->{storage}->{error});
				}
			} # has level data
			if ($self->{storage}->check_record_exists( $old_base_path . '/level_nav/' . $level->{Name} )) {
				if ($self->{storage}->check_record_exists($new_base_path.'/level_nav/'.$level->{Name})) {
					$self->{storage}->delete_record($new_base_path.'/level_nav/'.$level->{Name}); 
				}
				if (!$self->{storage}->copy_record($old_base_path . '/level_nav/' . $level->{Name}, $new_base_path . '/level_nav/' . $level->{Name})) {
					return $self->api_error('game', "Could not write revision (level_nav/".$level->{Name}."): " . $self->{storage}->{error});
				}
			} # has nav data
		} # foreach level
	} # has levels
	
	# plugins (grab version info)
	my $plugin_content = '';
	
	if ($xml->{Plugin}) {
		$self->log_debug(5, "Revision has Plugins: " . $xml->{Plugin});
		my $all_plugins = $self->{storage}->permacache_get('/admin/engine_plugins');
		XMLalwaysarray( xml=>$all_plugins, element=>'Plugin' );
		$all_plugins = $all_plugins->{Plugin};
		
		$self->log_debug(5, "All Plugins: " . dumper($all_plugins));
		
		foreach my $plugin_thingy (split(/\,\s*/, $xml->{Plugin})) {
			if ($plugin_thingy =~ /^(\w+)\-(.+)$/) {
				my ($plugin_name, $plugin_ver) = ($1, $2);
				$self->log_debug(5, "Locating Plugin: $plugin_name ($plugin_ver)");
				my $plug_data = find_object( $all_plugins, Name => $plugin_name, Version => $plugin_ver );
				if (!$plug_data) {
					return $self->api_error("Could not locate engine plugin: $plugin_name-$plugin_ver");
				}
				if ($plug_data->{_Attribs}) { $plug_data = $plug_data->{_Attribs}; }
				$self->log_debug(5, "Found Plugin: " . dumper($plug_data));
				my $plug_file = $self->{config}->{Paths}->{EngineDir} . '/plugins/' . $plug_data->{File};
				$self->log_debug(5, "Including plugin content: $plug_file");
				$plugin_content .= load_file( $plug_file );
			}
			else { $self->log_debug(5, "Bad plugin thingy: $plugin_thingy"); }
		} # foreach game plugin
		
		# save combined plugin data to file in rev directory
		if (!$self->{storage}->store_file( $new_base_path, 'plugins.js', $plugin_content )) {
			return $self->api_error('game', "Could not write revision (plugins.js): " . $self->{storage}->{error});
		}
	}
	elsif ($self->{storage}->check_file_exists($new_base_path, 'plugins.js')) {
		if (!$self->{storage}->delete_file( $new_base_path, 'plugins.js' )) {
			return $self->api_error('game', "Could not write revision (plugins.js): " . $self->{storage}->{error});
		}
	}
	
	# include any code pre-uploaded from the "src" folder
	my $src_code = '';
	my $src_folder = $self->{storage}->get_metadata( $old_base_path . '/assets/src' );
	if ($src_folder && $src_folder->{Files} && $src_folder->{Files}->{File}) {
		XMLalwaysarray( xml=>$src_folder->{Files}, element=>'File' );
		foreach my $file (sort { lc($a->{Name}) cmp lc($b->{Name}); } @{$src_folder->{Files}->{File}}) {
			if ($file->{Name} =~ /\.js$/i) {
				$src_code .= $self->{storage}->get_file_contents( $old_base_path . '/assets/src', $file->{Name} ) || '';
				$src_code .= "\n";
			} # is js
		} # foreach file
	} # src folder
	
	# user code (grab from staging area or recover from old revision)
	my $stage_dir_path = '/games/' . $game_id . '/rev_stage';
	my $user_code = '';
	
	if ($src_code || ($xml->{Files} && $xml->{Files}->{File})) {
		
		if ($xml->{Files} && $xml->{Files}->{File}) {
			$self->log_debug(5, "Using code from upload");
			XMLalwaysarray( xml=>$xml->{Files}, element=>'File' );
			foreach my $file (@{$xml->{Files}->{File}}) {
				my $code = $self->{storage}->get_file_contents( $stage_dir_path, $file->{Name} );
				if (!$code) {
					return $self->api_error('game', "Could not write revision (".$file->{Name}."): " . $self->{storage}->{error});
				}
				$user_code .= $code . "\n";
			} # foreach user file
		}
		else {
			$self->log_debug(5, "Using code from asset manager");
			$user_code = $src_code;
		}
		
		if ($xml->{UserCodeCompress}) {
			# send code to google closure
			
			# preserve header comment block, if defined
			my $save_header = '';
			while ($user_code =~ s@^\s*(/\*.+\*/)@@s) {
				$save_header .= $1 . "\n";
			}
			while ($user_code =~ s@^\s*(//[^\n]+)@@) {
				$save_header .= $1 . "\n";
			}
			
			my $engine_url = '';
			if ($xml->{UserCodeCompressMode} eq 'ADVANCED_OPTIMIZATIONS') {
				my $engine_ver = $xml->{Engine};
				if (!$engine_ver) {
					return $self->api_error('game', "No Engine Version specified in revision.");
				}

				my $engine_versions = $self->{storage}->permacache_get('/admin/engine_versions');
				XMLalwaysarray( xml=>$engine_versions, element=>'Version' );
				$engine_versions = $engine_versions->{Version};

				my $ver_data = XMLsearch( xml=>$engine_versions, Name => $engine_ver );
				if (!$ver_data) {
					return $self->api_error('game', "Could not locate engine version: $engine_ver");
				}
				
				$engine_url = $self->get_base_url() . 'engine/' . $ver_data->{File};
				# $engine_file = $self->{config}->{Paths}->{EngineDir} . '/' . $ver_data->{File};
			} # advanced
			
			$user_code = $self->google_closure_compile( $user_code, $xml->{UserCodeCompressMode}, $engine_url );
			if (ref($user_code)) {
				return $self->api_error('game', $user_code->{Description});
			}
			
			if ($save_header) {
				$user_code = $save_header . $user_code;
			}
		}
		
		if ($xml->{UserCodeStripComments}) { # currently not in use
			$user_code =~ s@\/\*(.*?)\*\/@@sg;
			$user_code =~ s@(\n|^)\/\/[^\n]*@@g;
			$user_code =~ s@([^:\\\n\/])\/\/[^\n]*@$1@g;
		}
		if ($xml->{UserCodeCompressWhitespace}) { # currently not in use
			$user_code =~ s@\n\s+@\n@g;
			$user_code =~ s@\n@ @g;
			$user_code =~ s@[ \t]+@ @g;
		}
	}
	else {
		$self->log_debug(5, "Using previous revision user code");
		$user_code = $old_user_code;
	}
	
	if (!$user_code) {
		return $self->api_error('game', "No source code was provided.  In order to publish a game release, you must provide source code, either uploaded to the game \"src\" folder, or uploaded here.");
	}
	
	# save combined user code data to file in rev directory
	if (!$self->{storage}->store_file( $new_base_path, 'user_code.js', $user_code )) {
		return $self->api_error('game', "Could not write revision (user_code.js): " . $self->{storage}->{error});
	}
	
	$total_bytes += length($user_code);
	
	# delete code from staging area
	$self->{storage}->delete_record( $stage_dir_path );
	
	# doxterify the release notes and store in the game metadata
	# this is because the game metadata has its own record, the rev is a list item
	my $game = $self->{storage}->get_metadata( $new_base_path );
	
	if ($xml->{Description}) {
		my $doxter = new Doxter(
			debug => 0,
			section_numbers => 0
		);
		my $response = $doxter->format_text( $xml->{Description} );
		$game->{ReleaseNotesHTML} = $response->{html};
		$game->{ReleaseTitle} = $response->{release_title} || '';
		
		if ($game->{ReleaseTitle}) {
			# currently this is only used for examples, so if we get here, we can format the user code for display
			$user_code =~ s@// BEGIN HIDE CODE\n(.+?)// END HIDE CODE\n@@sg;
			$game->{UserCodeHTML} = '<div class="dx_code_block">' . $doxter->highlight_js( trim($user_code) ) . '</div>';
		}
	}
	else {
		$game->{ReleaseNotesHTML} = '';
		$game->{ReleaseTitle} = '';
	}
	
	$game->{DisableSharing} = $xml->{DisableSharing} || 0;
	
	if (!$self->{storage}->store_metadata( $new_base_path, $game )) {
		return $self->api_error('game', "Could not write revision (base): " . $self->{storage}->{error});
	}
	
	my $settings = $self->get_game_settings( $game_id, $rev_id );
	if (!$settings->{OggDisable}) {
		save_file( $self->{config}->{Paths}->{QueueDir} . '/game_rev_ogg_' . $game_id . '-' . $rev_id . '-' . $$ . '.xml', compose_xml( {
			Transform => [
				{ _Attribs => { Name => 'OggCreate' }, 
					GameID => $game_id,
					RevID => $rev_id,
					Username => $self->{session}->{db}->{username}
				}
			]
		}, 'EffectQueueRequest' ) );
	}
	
	$self->log_debug(4, "Game revision " . (($cmd eq 'create') ? "created" : "updated") . " (" . get_text_from_bytes($total_bytes) . ")" );
	
	if (($cmd eq 'create') && ($xml->{RevType} ne 'Internal')) {
		# add release to master list
		$self->lock_list_unshift( "/admin/master_game_rev_list", { GameID => $game_id, RevID => $rev_id, RevType => $xml->{RevType} } );
		
		$self->log_debug(5, "Sending notification to admins about new game release");
		
		my $user = $self->get_user( $game->{Owner} ) || { FullName => 'Unknown' };
		
		my $game_url = $self->get_base_url() . 'games/' . $game_id . '/' . $rev_id;
		my $body = "New " . $xml->{RevType} . " Game Revision Published: " . $game->{Title} . " ($rev_id)\n";
		$body .= $game_url . "\n\n";
		
		$body .= "Game Description:\n" . trim($game->{Description}) . "\n\n";
		$body .= "Release Notes:\n" . trim($xml->{Description}) . "\n\n";
		$body .= "Game Project Page: " . $self->get_base_url() . '#Game/' . $game_id . "\n";
		$body .= "Game Owner: " . $game->{Owner} . " (" . $user->{FullName} . ")\n";
		$body .= "Revision Size: " .  get_text_from_bytes($total_bytes) . "\n";
		
		if (!$self->send_email(
			From     => $self->{config}->{Emails}->{From},
			To       => $self->{config}->{ContactEmail},
			Subject  => "New " . $xml->{RevType} . " Game Revision Published: " . $game->{Title} . " ($rev_id)",
			Data     => $body
		)) {
			$self->log_debug(2, "Failed to send email to " . $self->{config}->{ContactEmail});
		}
	} # public rev, notify admins
	
	return $total_bytes;
}

sub api_game_send_feedback {
	##
	# Send user feedback to game owner
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => 'GameID',
		'/RevID' => 'GameRevision',
		'/From' => 'EmailAddress',
		'/Subject' => '.+',
		'/Message' => '.+'
	);
	
	my $xml = $self->{session}->{xml};
	my $game_id = $xml->{GameID};
	my $rev_id = $xml->{RevID};
	
	# locate rev metadata
	my $rev = $self->{storage}->list_find( "/games/$game_id/revs", { Name => $rev_id } );
	if (!$rev) { return $self->api_error('game', "Could not find game revision: $game_id / $rev_id" ); }
	if (!$rev->{Feedback}) { return $self->api_error('game', "Game revision does not allow feedback: $game_id / $rev_id" ); }
	
	# load game too, need owner
	my $game = $self->{storage}->get_metadata( "/games/$game_id/revisions/$rev_id" );
	if (!$game) { return $self->api_error('game', "Could not find game: $game_id" ); }
	
	my $game_title = $game->{Title};
	
	# load owner
	my $recip_username = $game->{Owner};
	
	my $recip_user = $self->get_user( $recip_username );
	if (!$recip_user) {
		return $self->api_error( 'user', "Unknown username: $recip_username" );
	}
	
	my $body = $xml->{Message};
	$body .= "\n\n";
	$body .= $self->{config}->{Emails}->{GameFeedbackSignature} . "\n";
	
	my $from = $xml->{From};
	
	my $to = "\"" . $recip_user->{FullName} . "\" <" . $recip_user->{Email} . ">";
	
	my $subject = "User feedback for $game_title $rev_id: " . $xml->{Subject};
	
	if (!$self->send_email(
		From     => $from,
		To       => $to,
		Subject  => $subject,
		Data     => $body
	)) {
		return $self->api_error( 'email', "Failed to send feedback.  Please try again later." );
	}
	
	$self->log_transaction( 'game_feedback', { game_id => $game_id, rev_id => $rev_id, recip_username => $recip_username } );
	
	$self->set_response(0, "Success");
}

sub api_game_rev_create_standalone {
	##
	# Request async standalone publish archive for download (will be e-mailed)
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => 'GameID',
		'/RevID' => 'GameRevision'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	my $rev_id = $xml->{RevID};
	
	return unless $self->require_game_member($game_id);
	
	# must be admin to do this
	if (!$self->is_game_admin($game_id)) {
		return $self->api_error( 'game', "Only game administrators may publish standalone versions." );
	}
	
	save_file( $self->{config}->{Paths}->{QueueDir} . '/standalone_publish_' . $game_id . '-' . $$ . '.xml', compose_xml( {
		Transform => [
			{ _Attribs => { Name => 'RevisionExport' }, 
				GameID => $game_id,
				RevID => $rev_id,
				Username => $username
			}
		]
	}, 'EffectQueueRequest' ) );
	
	$self->log_transaction( 'game_rev_standalone_create', { game_id => $game_id, rev_id => $rev_id } );
	
	$self->set_response(0, "Success");
}

1;
