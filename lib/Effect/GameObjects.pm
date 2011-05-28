package Effect::GameObjects;

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
use Doxter;
use HTTP::Date;
use URI::Escape;
use Digest::MD5 qw/md5_hex/;

sub api_game_object_get {
	##
	# Get single game object by type and id
	##
	my $self = shift;
	return unless $self->require_query(
		game_id => 'GameID',
		type => 'GameObjectType',
		id => 'GameObjectID'
	);
	
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	
	return unless $self->validate_session();
	
	my $game_id = $query->{game_id};
	my $obj_type = $query->{type};
	my $obj_id = $query->{id};
	
	# check session for access (game should have been loaded client-side by this point)
	return unless $self->require_game_read_access($game_id);
	
	my $list_path = "/games/$game_id/" . $obj_type . "s";
	my $obj = $self->{storage}->list_find( $list_path, { Name => $obj_id } );
	if (!$obj) {
		return $self->api_error('game', ucfirst($obj_type) . " not found: $obj_id" );
	}
	
	$response->{Item} = $obj;
	$self->set_response(0, "Search successful");
	$self->set_ttl( 'ViewTTL' );
	$self->session_unmark();
}

sub api_game_objects_get {
	##
	# Get all registered game objects (sprites and tiles)
	##
	my $self = shift;
	return unless $self->require_query(
		id => 'GameID'
	);
	
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	
	return unless $self->validate_session();
	
	my $game_id = $query->{id};
	
	# check session for access (game should have been loaded client-side by this point)
	return unless $self->require_game_read_access($game_id);
	
	if ($query->{sprites}) {
		my $sprites = $self->{storage}->list_get( "/games/$game_id/sprites" );
		$sprites ||= [];
		$response->{Sprites} = { Sprite => $sprites };
	}
	
	if ($query->{tiles}) {
		my $tiles = $self->{storage}->list_get( "/games/$game_id/tiles" );
		$tiles ||= [];
		$response->{Tiles} = { Tile => $tiles };
	}
	
	if ($query->{tilesets}) {
		my $tilesets = $self->{storage}->list_get( "/games/$game_id/tilesets" );
		$tilesets ||= [];
		$response->{Tilesets} = { Tileset => $tilesets };
	}
	
	if ($query->{tileset_files}) {
		foreach my $tileset (@{$response->{Tilesets}->{Tileset}}) {
			my $dir_data = $self->{storage}->get_metadata( "/games/$game_id/assets" . $tileset->{Path} );
			if ($dir_data && $dir_data->{Files} && $dir_data->{Files}->{File}) {
				$tileset->{Files} = { File => [] };
				XMLalwaysarray( xml=>$dir_data->{Files}, element=>'File' );
				foreach my $file (@{$dir_data->{Files}->{File}}) {
					push @{$tileset->{Files}->{File}}, $file->{Name};
				}
			}
		}
	} # include tileset files
	
	if ($query->{fonts}) {
		my $fonts = $self->{storage}->list_get( "/games/$game_id/fonts" );
		$fonts ||= [];
		$response->{Fonts} = { Font => $fonts };
	}
	
	if ($query->{keys}) {
		my $keys = $self->{storage}->list_get( "/games/$game_id/keys" );
		$keys ||= [];
		$response->{Keys} = { Key => $keys };
	}
	
	if ($query->{levels}) {
		my $levels = $self->{storage}->list_get( "/games/$game_id/levels" );
		$levels ||= [];
		$response->{Levels} = { Level => $levels };
	}
	
	if ($query->{revs}) {
		my $revs = $self->{storage}->list_get( "/games/$game_id/revs" );
		$revs ||= [];
		$response->{Revs} = { Rev => $revs };
	}
	
	if ($query->{envs}) {
		my $envs = $self->{storage}->list_get( "/games/$game_id/envs" );
		$envs ||= [];
		$response->{Envs} = { Env => $envs };
	}
	
	if ($query->{lev_props}) {
		# okay, these aren't exactly "objects", but this is sort of a "do everything" api call, so...
		my $prop_data = $self->{storage}->get_metadata( "/games/$game_id/level_props" );
		if (!$prop_data) { $prop_data = {}; }
		$prop_data->{Properties} ||= {};
		$prop_data->{Properties}->{Property} ||= [];
		$response->{Properties} = $prop_data->{Properties};
	}
	
	$self->set_response(0, "Search successful");
	$self->set_ttl( 'ViewTTL' );
	$self->session_unmark();
}

sub api_game_delete_object {
	##
	# Delete single object from game (sprite or tile)
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => 'GameID',
		'/Type' => 'GameObjectType',
		'/ID' => 'GameObjectID'
	);
	return unless $self->validate_session();
	
	my $response = $self->{session}->{response};
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	my $obj_id = $xml->{ID};
	my $obj_type = $xml->{Type};
	
	# check session for access (game should have been loaded client-side by this point)
	return unless $self->require_game_member($game_id);
	
	my $bytes_deleted = 0;
	
	# if type is level, must also delete layer json data
	if ($xml->{Type} eq 'level') {
		my $path = '/games/' . $game_id . '/level_data/' . $xml->{ID};
		if (!$self->{storage}->delete_record($path)) {
			# return $self->api_error('game', "Could not delete level data: " . $self->{storage}->{error});
			# level data may not exist yet, ignore possible error here and continue
			$self->log_debug(2, "Level data not found (probably harmless): $game_id/" . $xml->{ID} . ": " . $self->{storage}->{error});
		}
	} # level
	elsif ($xml->{Type} eq 'rev') {
		# type is rev, so also delete revision record
		$bytes_deleted = $self->game_delete_revision( $game_id, $obj_id );
		return unless $bytes_deleted;
	} # rev
	
	# delete item
	my $list_path = "/games/$game_id/" . $xml->{Type} . "s";
	return unless $self->lock_find_delete_list_item( $list_path, { Name => $xml->{ID} } );
	
	# return entire list of requested type for UI refresh
	my $outer_name = ucfirst($xml->{Type} . 's');
	my $inner_name = ucfirst($xml->{Type});
	my $items = $self->{storage}->list_get( $list_path ) || [];
	$response->{$outer_name} = { $inner_name => $items };
	
	$obj_type =~ s/^env$/environment/;
	$obj_type =~ s/^rev$/revision/;
	
	return unless $self->game_log_msg($game_id, "Deleted $obj_type: $obj_id", $obj_type);
	$self->log_transaction( 'game_delete_object', { game_id => $game_id, obj_type => $xml->{Type}, obj_id => $xml->{ID}, bytes_deleted => $bytes_deleted } );
	
	$self->set_response(0, "Delete successful");
}

sub api_game_update_object {
	##
	# Update existing game object
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => 'GameID',
		'/Type' => 'GameObjectType',
		'/OldName' => 'GameObjectID',
		'/Name' => 'GameObjectID'
	);
	return unless $self->validate_session();
	
	my $response = $self->{session}->{response};
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	my $obj_type = $xml->{Type};
	
	my $old_obj_id = $xml->{OldName};
	my $new_obj_id = $xml->{Name};
	
	# check session for access (game should have been loaded client-side by this point)
	return unless $self->require_game_member($game_id);
	
	my $list_path = "/games/$game_id/" . $xml->{Type} . "s";
	
	# if name has changed, check for collision
	if ($new_obj_id ne $old_obj_id) {
		if ($self->{storage}->list_find( $list_path, { Name => $new_obj_id } )) {
			return $self->api_error('game', "A $obj_type with that name already exists.  Please enter a different name.");
		}
	}
	
	# make sure sprite requirements and resources all exist
	if ($xml->{Type} =~ /sprite|tile|level/) {
		if ($xml->{Requires} && $xml->{Requires}->{Require}) {
			XMLalwaysarray( xml=>$xml->{Requires}, element=>'Require' );
			foreach my $req (@{$xml->{Requires}->{Require}}) {
				if (!$self->{storage}->list_find( "/games/$game_id/sprites", { Name => $req->{Name} } )) {
					return $self->api_error('game', "Sprite dependency \"".$req->{Name}."\" no longer exists.  Please remove it before saving.");
				}
			}
		}
		if ($xml->{Resources} && $xml->{Resources}->{Resource}) {
			XMLalwaysarray( xml=>$xml->{Resources}, element=>'Resource' );
			foreach my $res (@{$xml->{Resources}->{Resource}}) {
				# /images/objects/crystal5-rotate.png
				my $res_path = "/games/$game_id/assets" . $res->{Path};
				if (!$self->{storage}->check_file_exists( dirname($res_path), basename($res_path) )) {
					return $self->api_error('object', "The resource \"".$res->{Path}."\" no longer exists.  Please remove it from the list before saving.");
				}
			}
		}
	}
	
	# if type is level and name has changed, must also rename layer json data path
	# and delete old nav data
	if (($xml->{Type} eq 'level') && ($new_obj_id ne $old_obj_id)) {
		
		my $old_data_path = '/games/' . $game_id . '/level_data/' . $old_obj_id;
		my $new_data_path = '/games/' . $game_id . '/level_data/' . $new_obj_id;
		
		if ($self->{storage}->check_record_exists($old_data_path)) {
			if (!$self->{storage}->rename_record( $old_data_path, $new_data_path )) {
				return $self->api_error('game', "Failed to rename level: " . $self->{storage}->{error});
			}
		}
		
		my $old_nav_path = "/games/$game_id/level_nav/$old_obj_id";
		$self->{storage}->delete_record($old_nav_path); # don't really care about failure here
	} # level
	elsif ($xml->{Type} eq 'rev') {
		if ($new_obj_id ne $old_obj_id) {
			# TODO: rename revision data records
			# for now, throw error
			return $self->api_error('game', "Game revision numbers cannot be changed.");
		}
		
		# recreate revision files
		my $total_bytes = $self->game_create_revision( 'update', $xml );
		if (!$total_bytes) { return undef; }
		
		$xml->{Size} = $total_bytes;
		delete $xml->{Files};
	} # rev
	elsif ($xml->{Type} eq 'env') {
		# environment, update asset mod
		return unless $self->lock_update_record( "/games/$game_id/stats", { AssetMod => time() } );
	}
	elsif ($xml->{Type} =~ /^(sprite|tile)$/) {
		if ($xml->{Icon}) {
			# <Icon>/images/ships/ship1.gif</Icon>
			my $icon_path = "/games/$game_id/assets" . $xml->{Icon};
			if (!$self->{storage}->check_file_exists( dirname($icon_path), basename($icon_path) )) {
				return $self->api_error('object', "The icon preview \"".$xml->{Icon}."\" does not exist.  Please choose another.");
			}
		}
	} # sprite or tile
	
	delete $xml->{GameID};
	delete $xml->{Type};
	# delete $xml->{OldName}; # conflict resolver uses this for auto-fixing
	
	return unless $self->lock_find_update_list_item( $list_path, { Name => $old_obj_id }, $xml );
	
	my $nice_obj_type = $obj_type;
	$nice_obj_type =~ s/^rev$/revision/;
	$nice_obj_type =~ s/^env$/environment/;
	
	if ($new_obj_id ne $old_obj_id) {
		return unless $self->game_log_msg($game_id, "Renamed $nice_obj_type: $old_obj_id to $new_obj_id", $obj_type);
		$self->log_transaction( 'game_rename_object', { game_id => $game_id, obj_type => $obj_type, old_obj_id => $old_obj_id, new_obj_id => $new_obj_id } );
	}
	
	return unless $self->game_log_msg($game_id, "Updated $nice_obj_type: $new_obj_id", $obj_type);
	$self->log_transaction( 'game_update_object', { game_id => $game_id, obj_type => $obj_type, obj_id => $new_obj_id, bytes_written => $xml->{Size} || 0 } );
	
	$self->set_response(0, "Update successful");
}

sub api_game_create_object {
	##
	# Create new game object
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => 'GameID',
		'/Type' => 'GameObjectType',
		'/Name' => 'GameObjectID'
	);
	return unless $self->validate_session();
	
	my $response = $self->{session}->{response};
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	my $obj_id = $xml->{Name};
	my $obj_type = $xml->{Type};
	
	# check session for access (game should have been loaded client-side by this point)
	return unless $self->require_game_member($game_id);
	
	my $list_path = "/games/$game_id/" . $xml->{Type} . "s";
	
	# dupe check
	if ($self->{storage}->list_find($list_path, { Name => $xml->{Name} })) {
		return $self->api_error('game', "A $obj_type with that name already exists.  Please enter a different name.");
	}
	
	# special behavior for certain types
	if ($obj_type eq 'rev') {
		my $total_bytes = $self->game_create_revision( 'create', $xml );
		if (!$total_bytes) { return undef; }
		
		$xml->{Size} = $total_bytes;
		delete $xml->{Files};
	} # rev
	elsif ($obj_type =~ /^(sprite|tile)$/) {
		if ($xml->{Icon}) {
			# <Icon>/images/ships/ship1.gif</Icon>
			my $icon_path = "/games/$game_id/assets" . $xml->{Icon};
			if (!$self->{storage}->check_file_exists( dirname($icon_path), basename($icon_path) )) {
				return $self->api_error('object', "The icon preview \"".$xml->{Icon}."\" does not exist.  Please choose another.");
			}
		}
	} # sprite or tile
	
	delete $xml->{GameID};
	delete $xml->{Type};
	
	# add new object
	return unless $self->lock_list_unshift($list_path, $xml);
	
	my $nice_obj_type = $obj_type;
	$nice_obj_type =~ s/^rev$/revision/;
	$nice_obj_type =~ s/^env$/environment/;
	
	return unless $self->game_log_msg($game_id, "Created new $nice_obj_type: $obj_id", $obj_type);
	$self->log_transaction( 'game_create_object', { game_id => $game_id, obj_type => $obj_type, obj_id => $obj_id, bytes_written => $xml->{Size} || 0 } );
	
	if ($obj_type eq 'level') {
		return undef unless $self->game_update_stats( $game_id, Levels => "+1" );
	}
	elsif ($obj_type eq 'rev') {
		return undef unless $self->game_update_stats( $game_id, Publishes => "+1" );
	}
	elsif ($obj_type eq 'env') {
		return undef unless $self->game_update_stats( $game_id, Environments => "+1" );
	}
	else {
		return undef unless $self->game_update_stats( $game_id, Objects => "+1" );
	}
	
	$self->set_response(0, "Create successful");
}

sub api_game_audio_sync_get {
	##
	# Get all audio objects for game, and sync with asset manager
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => 'GameID'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $response = $self->{session}->{response};
	my $game_id = $xml->{GameID};
	
	# check session for access (game should have been loaded client-side by this point)
	return unless $self->require_game_read_access($game_id);
	
	# make sure game exists
	my $game = $self->{storage}->get_metadata( '/games/' . $game_id );
	if (!$game) {
		return $self->api_error( 'game', "Game not found: $game_id" );
	}
	
	# get offical audio object list
	my $list_path = "/games/$game_id/audio";
	my $objs = $self->{storage}->list_get( $list_path );
	if (!$objs) {
		if (!$self->{storage}->list_create($list_path)) {
			return $self->api_error( 'game', "Failed to create list: $list_path: " . $self->{storage}->{error} );
		}
		$objs = [];
	}
	
	my $new_objs = [];
	
	# only perform the "sync" portion of this, if user is a real game member
	if ($self->require_game_member($game_id, 'readonly')) {
		# get asset file list, and strip base audio path from each
		my $asset_files = $self->get_asset_file_list_recursive( $game_id, '/', '/\.mp3$/i' );
	
		# lock ze list
		$self->{storage}->lock_record( $list_path, 1 );
		my $num_changes = 0;
	
		# automatically add new asset files
		foreach my $file (@$asset_files) {
			if (!XMLsearch( xml=>$objs, Path => $file )) {
				$self->log_debug(5, "Auto-adding audio object: $file");
				my $obj = {
					Path => $file,
					Category => (($file =~ /music/i) ? 'music' : 'sfx'),
					Volume => '1.0',
					Balance => '0.0',
					Loop => (($file =~ /music/i) ? '1' : '0'),
					Preload => 0,
					Multiplex => (($file =~ /music/i) ? '0' : '1'),
				};
				push @$objs, $obj;
				if (!$self->{storage}->list_push( $list_path, $obj )) {
					$self->{storage}->unlock_record( $list_path );
					return $self->api_error('game', "Could not add item to list: $list_path: $file");
				}
				$num_changes++;
			} # not found
		} # foreach asset file
	
		# automatically remove missing asset files
		foreach my $obj (@$objs) {
			if (find_elem_idx($asset_files, $obj->{Path}) > -1) {
				push @$new_objs, $obj;
			}
			else {
				$self->log_debug(5, "Auto-removing audio object: " . $obj->{Path} );
				my $idx = $self->{storage}->list_find_idx( $list_path, { Path => $obj->{Path} } );
				if ($idx == -1) {
					$self->{storage}->unlock_record( $list_path );
					return $self->api_error('game', "Could not locate list item for deletion: $list_path: " . $obj->{Path});
				}
				if (!$self->{storage}->list_cut( $list_path, $idx, 1 )) {
					$self->{storage}->unlock_record( $list_path );
					return $self->api_error('game', "Could not cut item from list: $list_path: " . $obj->{Path});
				}
				$num_changes++;
			}
		} # foreach obj
	
		# write changes to list
		$self->{storage}->commit();
		$self->{storage}->unlock_record( $list_path );
	
		if ($num_changes) {
			return unless $self->game_log_msg($game_id, "Synchronized audio objects to assets", 'audio');
			$self->log_transaction( 'game_audio_sync', { game_id => $game_id } );
		}
	} # real game member, do sync
	else {
		$new_objs = $objs;
	} # non-member
	
	$response->{Items} = { Item => $new_objs };
	$self->set_response(0, "Sync successful");
}

sub api_game_update_audio_object {
	##
	# Update audio object in game
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => 'GameID',
		'/Path' => 'StoragePath',
		'/Category' => 'Alphanumeric',
		'/Preload' => 'IntBoolean',
		'/Loop' => 'IntBoolean',
		'/Volume' => 'PositiveFloat',
		'/Balance' => 'Float'
	);
	return unless $self->validate_session();
	
	my $response = $self->{session}->{response};
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	my $list_path = "/games/$game_id/audio";
	
	# check session for access (game should have been loaded client-side by this point)
	return unless $self->require_game_member($game_id);
	
	delete $xml->{GameID};
	
	return unless $self->lock_find_update_list_item($list_path, { Path => $xml->{Path} }, $xml );
	
	return unless $self->game_log_msg($game_id, "Updated audio track: " . $xml->{Path}, 'audio');
	$self->log_transaction( 'game_update_audio_object', { game_id => $game_id, path => $xml->{Path} } );
	
	$self->set_response(0, "Update successful");
}

sub api_game_get_xml {
	##
	# Get XML asset from game
	#	game_id => ID of game
	#	rev => game revision or "dev"
	#	path => asset path to file
	##
	my $self = shift;
	return unless $self->require_query(
		game_id => 'GameID',
		path => 'StoragePath',
		rev => 'GameRevision'
	);
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	
	my $game_id = $query->{game_id};
	my $game_rev = $query->{rev};
	
	# if ($game_rev eq 'dev') {
	# 	return unless $self->validate_session();
	# 	return unless $self->require_game_read_access($game_id);
		
		# because so many of these API calls come in at the exact same instant,
		# don't save the session every time (atomic writes on local Mac OS X don't quite work)
	# 	$self->session_unmark();
	# }
	
	my $asset_base_path = '';
	
	if ($game_rev eq 'dev') {
		$asset_base_path = '/games/' . $game_id . '/assets';
	}
	else {
		# actual published rev
		$asset_base_path = '/games/' . $game_id . '/revisions/' . $game_rev . '/assets';
	}
	
	my $file_paths = [];
	if ($query->{path} =~ /\[lang\]/) {
		# request for local language file, try both localized and non-localized
		my $non_localized = $query->{path}; $non_localized =~ s@\[lang\]/@@;
		my $localized = $query->{path}; $localized =~ s@\[lang\]@ $query->{lang}; @e;
		push @$file_paths, $localized;
		push @$file_paths, $non_localized;
	}
	else {
		push @$file_paths, $query->{path};
	}
	
	my $data = undef;
	my $parser = undef;
	
	foreach my $file_path (@$file_paths) {
		my $path = $asset_base_path . $file_path;
		my $storage_key = dirname($path);
		my $filename = basename($path);
	
		my $full_path = $self->{storage}->get_record_path($storage_key);
		$parser = new XML::Lite(
			file => $full_path . '/' . $filename,
			preserveAttributes => 0
		);
		if (!$parser->getLastError()) {
			$data = $parser->getTree();
			last;
		}
	}
	
	if (!$data) {
		return $self->api_error('game', "Failed to parse XML file: " . $query->{path} . ": " . $parser->getLastError());
	}
	
	$response->{Data} = $data;
	$response->{Path} = $query->{path};
	
	$self->set_ttl( 'ViewTTL' );
	
	$self->set_response(0, "Success");
}

sub api_game_get_level_data {
	##
	# Load level JSON data
	##
	my $self = shift;
	return unless $self->require_query(
		game_id => 'GameID',
		level_id => 'GameObjectID',
		rev => 'GameRevision'
	);
	
	my $query = $self->{session}->{query};
	my $game_id = $query->{game_id};
	my $level_id = $query->{level_id};
	my $game_rev = $query->{rev};
	
	my $path = '';
	if ($game_rev eq 'dev') {
		$path = '/games/' . $game_id . '/level_data/' . $level_id;
	}
	else {
		$path = '/games/' . $game_id . '/revisions/' . $game_rev . '/level_data/' . $level_id;
	}
	
	my $json = $self->{storage}->get_file_contents( $path, "data.json" );
	if (!$json) { $json = '{}'; }
	
	my $prefix = $query->{callback} ? ($query->{callback} . '(') : 'var response = ';
	my $postfix = $query->{callback} ? ');' : ';';
	my $content = $prefix . '{Code:0,LevelID:"'.$level_id.'",Data:' . trim($json) . '}' . $postfix;
	
	if ($query->{onafter}) { $content .= "\n" . $query->{onafter} . "\n"; }
	
	$content = $self->encode_output( $content );
	
	$self->{session}->{request}->content_type( 'text/javascript' );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', length($content) );
	
	$self->set_ttl( 'ViewTTL' );
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub api_game_save_level_data {
	##
	# Save level data
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => 'GameID',
		'/LevelID' => 'GameObjectID'
	);
	return unless $self->validate_session();
	
	my $response = $self->{session}->{response};
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	my $level_id = $xml->{LevelID};
	
	my $path = '/games/' . $game_id . '/level_data/' . $level_id;
	
	# check session for access (game should have been loaded client-side by this point)
	return unless $self->require_game_member($game_id);
	
	my $game = $self->{storage}->get_metadata( '/games/' . $game_id );
	if (!$game) { return $self->api_error('game', "Game not found: $game_id"); }
	
	if (!$self->{storage}->store_metadata( $path, {} )) {
		return $self->api_error('game', "Could not store level data: " . $self->{storage}->{error});
	}
	
	if (!$self->{storage}->store_file( $path, 'data.json', $xml->{Data} )) {
		return $self->api_error('game', "Could not store level data: " . $self->{storage}->{error});
	}
	
	save_file( $self->{config}->{Paths}->{QueueDir} . '/game_level_preview_' . $game_id . '_' . $level_id . '.xml', compose_xml( {
		Transform => [
			{ _Attribs => { Name => 'LevelPreview' }, 
				GameID => $game_id,
				LevelID => $level_id,
				Width => ($game->{PortWidth} < 640) ? $game->{PortWidth} : 640,
				Height => ($game->{PortHeight} < 480) ? $game->{PortHeight} : 480,
				Save => 1
			}
		]
	}, 'EffectQueueRequest' ) );
	
	# update effective asset mod date
	return unless $self->lock_update_record( "/games/$game_id/stats", { AssetMod => time() } );
	
	return unless $self->game_log_msg($game_id, "Updated level map: $level_id", 'level');
	$self->log_transaction( 'game_update_level_map', { game_id => $game_id, level_id => $level_id } );
	
	$self->set_response(0, "Update successful");
}

1;
