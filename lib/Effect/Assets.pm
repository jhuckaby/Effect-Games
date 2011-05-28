package Effect::Assets;

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
use Digest::MD5 qw/md5_hex/;
use Archive::Zip qw( :ERROR_CODES :CONSTANTS );

sub api_asset_folder_tree_get {
	##
	# Get asset folder tree for game
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	
	return unless $self->validate_session();
	
	my $game_id = $query->{id};
	my $game_path = '/games/' . $game_id;
	
	return unless $self->require_game_read_access($game_id);
	
	my $data = $self->{storage}->get_metadata( $game_path . '/asset_folders' );
	if (!$data) {
		return $self->api_error('assets', "Could not locate asset folder list for game.");
	}
	
	$response->{Data} = $data;
	$self->set_response(0, "Success");
	
	$self->session_unmark();
}

sub api_asset_store_folder_data {
	##
	# Store folder data back into filesystem
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => '^[a-z0-9][a-z0-9\-]*[a-z0-9]$'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	my $game_path = '/games/' . $xml->{GameID};
	
	return unless $self->require_game_member($game_id);
	
	my $data = $self->{storage}->get_metadata( $game_path . '/asset_folders' );
	if (!$data) {
		return $self->api_error('assets', "Could not locate asset folder list for game.");
	}
	
	foreach my $key (keys %{$xml->{Data}}) {
		$data->{$key} = $xml->{Data}->{$key};
	}
	
	if (!$self->{storage}->store_metadata( $game_path . '/asset_folders', $data ) ) {
		return $self->api_error('assets', "Could not store metadata: $game_path/asset_folders: " . $self->{storage}->{error});
	}
	
	# update effective asset mod date
	return unless $self->lock_update_record( "/games/$game_id/stats", { AssetMod => time() } );
	
	$self->log_transaction( 'game_asset_store_folder_data', { game_id => $game_id } );
	
	$self->set_response(0, "Success");
}

sub api_asset_file_list_get {
	##
	# Get asset file list for any directory
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	
	return unless $self->validate_session();
	
	my $game_id = $query->{id};
	my $dir_path = '/games/' . $game_id . '/assets' . $query->{path};
	
	return unless $self->require_game_read_access($game_id);
	
	my $data = $self->{storage}->get_metadata( $dir_path );
	if ($data) {
		$response->{Data} = $data;
	}
	
	# because so many of these API calls come in at the exact same instant,
	# don't save the session every time (atomic writes on local Mac OS X don't quite work)
	$self->session_unmark();
	
	$self->set_response(0, "Success");
}

sub api_asset_delete_files {
	##
	# Delete one or more files from a directory
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => '^[a-z0-9][a-z0-9\-]*[a-z0-9]$',
		'/Path' => '.+'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	my $dir_path = '/games/' . $xml->{GameID} . '/assets' . $xml->{Path};
	my $subpath = $xml->{Path};
	
	return unless $self->require_game_member($game_id);
	
	my $data = $self->{storage}->get_metadata( $dir_path );
	if (!$data) {
		return $self->api_error('assets', "Could not locate asset folder: $dir_path");
	}
	
	my $filenames = {};
	my $bytes_deleted = 0;
	
	XMLalwaysarray( xml=>$xml->{Files}, element=>'File' );
	foreach my $filename (@{$xml->{Files}->{File}}) {
		my $file_size = $self->{storage}->get_file_size( $dir_path, $filename );
		if (!$self->{storage}->delete_file( $dir_path, $filename )) {
			return $self->api_error('assets', "Could not delete file: $subpath$filename");
		}
		return unless $self->game_log_msg($game_id, "Deleted asset: $subpath$filename", 'asset');
		$self->log_transaction( 'game_asset_delete_file', { game_id => $game_id, path => "$dir_path$filename", bytes_deleted => $file_size } );
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
		return $self->api_error('assets', "Could not store metadata: $dir_path: " . $self->{storage}->{error});
	}
	
	return undef unless $self->lock_update_record( "/games/$game_id/stats", { Quota => "+" . $bytes_deleted, AssetMod => time() }, 1 );
	
	$self->set_response(0, "Success");
}

sub api_asset_delete_folder {
	##
	# Delete asset folder
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => '^[a-z0-9][a-z0-9\-]*[a-z0-9]$',
		'/Path' => '.+'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	my $dir_path = '/games/' . $xml->{GameID} . '/assets' . $xml->{Path};
	
	return unless $self->require_game_member($game_id);
	
	my $data = $self->{storage}->get_metadata( $dir_path );
	if (!$data) {
		# this may happen, because folder data isn't actually created.  Just return success.
		return unless $self->game_log_msg($game_id, "Deleted asset folder: " . $xml->{Path}, 'asset');
		$self->set_response(0, "Success");
		return;
		
		# return $self->api_error('assets', "Could not locate asset folder: $dir_path");
	}
	
	if (!$data->{Files}) { $data->{Files} = {}; }
	if (!$data->{Files}->{File}) { $data->{Files}->{File} = []; }
	XMLalwaysarray( xml=>$data->{Files}, element=>'File' );
	
	my $bytes_deleted = 0;
	foreach my $file (@{$data->{Files}->{File}}) {
		$bytes_deleted += $file->{Size};
	}
	
	if (!$self->{storage}->delete_record( $dir_path )) {
		return $self->api_error('assets', "Could not delete asset folder: $dir_path: " . $self->{storage}->{error});
	}
	
	return undef unless $self->lock_update_record( "/games/$game_id/stats", { Quota => "+" . $bytes_deleted, AssetMod => time() }, 1 );
	
	return unless $self->game_log_msg($game_id, "Deleted asset folder: " . $xml->{Path}, 'asset');
	
	$self->log_transaction( 'game_asset_delete_folder', { game_id => $game_id, path => $xml->{Path}, bytes_deleted => $bytes_deleted } );
	
	$self->set_response(0, "Success");
}

sub api_asset_create_folder {
	##
	# Create asset folder (no-op, just log the event)
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => '^[a-z0-9][a-z0-9\-]*[a-z0-9]$',
		'/Path' => '.+'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	
	return unless $self->require_game_member($game_id);
	
	return unless $self->game_log_msg($game_id, "Created asset folder: ".$xml->{Path}, 'asset');
	
	$self->set_response(0, "Success");
	return;
}

sub api_asset_rename_folder {
	##
	# Rename asset folder
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => '^[a-z0-9][a-z0-9\-]*[a-z0-9]$',
		'/OldPath' => '.+',
		'/NewPath' => '.+'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	
	my $old_path = '/games/' . $xml->{GameID} . '/assets' . $xml->{OldPath};
	my $new_path = '/games/' . $xml->{GameID} . '/assets' . $xml->{NewPath};
	
	return unless $self->require_game_member($game_id);
	
	my $data = $self->{storage}->get_metadata( $old_path );
	if (!$data) {
		# this may happen, because folder data isn't actually created.  Just return success.
		return unless $self->game_log_msg($game_id, "Renamed asset folder: ".$xml->{OldPath}." to ".$xml->{NewPath}, 'asset');
		$self->set_response(0, "Success");
		return;
		 
		# return $self->api_error('assets', "Could not locate asset folder: $old_path");
	}
	
	if (!$self->{storage}->rename_record( $old_path, $new_path )) {
		return $self->api_error('assets', "Could not rename asset folder: $old_path: " . $self->{storage}->{error});
	}
	
	return unless $self->game_log_msg($game_id, "Renamed asset folder: ".$xml->{OldPath}." to ".$xml->{NewPath}, 'asset');
	
	$self->log_transaction( 'game_asset_rename_folder', { game_id => $game_id, old_path => $xml->{OldPath}, new_path => $xml->{NewPath} } );
	
	# update effective asset mod date
	return unless $self->lock_update_record( "/games/$game_id/stats", { AssetMod => time() } );
	
	$self->set_response(0, "Success");
}

sub api_asset_rename_file {
	##
	# Rename asset folder
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => '^[a-z0-9][a-z0-9\-]*[a-z0-9]$',
		'/Path' => '.+',
		'/OldFilename' => '.+',
		'/NewFilename' => '.+'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	
	my $dir_path = '/games/' . $xml->{GameID} . '/assets' . $xml->{Path};
	my $subpath = $xml->{Path};
	
	return unless $self->require_game_member($game_id);
	
	my $data = $self->{storage}->get_metadata( $dir_path );
	if (!$data) {
		return $self->api_error('assets', "Could not locate asset folder: $dir_path");
	}
	
	my $old_filename = $xml->{OldFilename};
	my $new_filename = $xml->{NewFilename};
	
	# rename file in Files->File
	if (!$data->{Files}) { $data->{Files} = {}; }
	if (!$data->{Files}->{File}) { $data->{Files}->{File} = []; }
	XMLalwaysarray( xml=>$data->{Files}, element=>'File' );
	
	my $old_file = XMLsearch( xml=>$data->{Files}->{File}, Name=>$old_filename );
	if ($old_file) {
		$old_file->{Name} = $new_filename;
		$old_file->{Modified} = time();
		$old_file->{Username} = $username;
	}
	else {
		return $self->api_error('assets', "Could not locate asset file: $dir_path/$old_filename");
	}
	
	if (!$self->{storage}->store_metadata($dir_path, $data)) {
		return $self->api_error('assets', "Could not write metadata: $dir_path: " . $self->{storage}->{error});
	}
	
	if (!$self->{storage}->rename_file( $dir_path, $old_filename, $new_filename )) {
		return $self->api_error('assets', "Could not rename asset file: $subpath$old_filename to $new_filename: " . $self->{storage}->{error});
	}
	
	return unless $self->game_log_msg($game_id, "Renamed asset: $subpath$old_filename to $new_filename", 'asset');
	
	$self->log_transaction( 'game_asset_rename_file', { game_id => $game_id, old_path => "$dir_path$old_filename", new_path => "$dir_path$new_filename" } );
	
	# update effective asset mod date
	return unless $self->lock_update_record( "/games/$game_id/stats", { AssetMod => time() } );
	
	$self->set_response(0, "Success");
}

sub api_asset_copy_file {
	##
	# Copy file from one dataset to another
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => 'GameID',
		'/Filename' => '.+',
		'/SourcePath' => '.+',
		'/DestPath' => '.+'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	my $new_game_id = $xml->{NewGameID} || $xml->{GameID};
	my $filename = $xml->{Filename};
	
	my $source_path = '/games/' . $xml->{GameID} . '/assets' . $xml->{SourcePath};
	my $dest_path = '/games/' . ($xml->{NewGameID} || $xml->{GameID}) . '/assets' . $xml->{DestPath};
	
	return unless $self->require_game_member($game_id);
	
	if ($xml->{NewGameID}) {
		return unless $self->require_game_member($new_game_id);
	}
	
	my $source_data = $self->{storage}->get_metadata( $source_path );
	if (!$source_data) {
		return $self->api_error('assets', "Could not locate asset folder: $source_path");
	}
	
	if (!$source_data->{Files}) { $source_data->{Files} = {}; }
	if (!$source_data->{Files}->{File}) { $source_data->{Files}->{File} = []; }
	XMLalwaysarray( xml=>$source_data->{Files}, element=>'File' );
	
	if (!XMLsearch( xml=>$source_data->{Files}->{File}, Name => $filename )) {
		return $self->api_error('assets', "File not found: $source_path$filename");
	}
	
	my $dest_data = $self->{storage}->get_metadata( $dest_path );
	if (!$dest_data) {
		if (!$self->{storage}->store_metadata( $dest_path, { Files => { File => [] } } )) {
			return $self->api_error('assets', "Could not create asset folder: $dest_path: " . $self->{storage}->{error});
		}
		$dest_data = $self->{storage}->get_metadata( $dest_path );
	}
	
	if (!$dest_data->{Files}) { $dest_data->{Files} = {}; }
	if (!$dest_data->{Files}->{File}) { $dest_data->{Files}->{File} = []; }
	XMLalwaysarray( xml=>$dest_data->{Files}, element=>'File' );
	
	my $action = '';
	my $raw_data = $self->{storage}->get_file_contents( $source_path, $filename );
	if (!$raw_data) {
		return $self->api_error('assets', "File not found: $source_path$filename");
	}
	my $new_size = length($raw_data);
	my $byte_count = 0;
		
	my $old_file = XMLsearch( xml=>$dest_data->{Files}->{File}, Name=>$filename );
	if ($old_file) {
		$self->log_debug(5, "Replacing existing file: $dest_path$filename");
		$byte_count = $new_size - $old_file->{Size};
		$action = 'replace';
		$old_file->{Size} = $new_size;
		$old_file->{Modified} = time();
		$old_file->{Username} = $username;
	}
	else {
		# add new file to list
		$self->log_debug(5, "Adding new file: $dest_path$filename");
		$byte_count = $new_size;
		$action = 'add';
		push @{$dest_data->{Files}->{File}}, {
			Name => $filename,
			Size => $new_size,
			Created => time(),
			Modified => time(),
			Username => $username
		};
	}
	
	return unless $self->game_update_storage_quota($new_game_id, $byte_count);
	
	my $result = $self->{storage}->store_file( $dest_path, $filename, $raw_data );
	if (!$result) { return $self->api_error('upload', 'Failed to store file: ' . $self->{storage}->{error}); }
	
	# store metadata
	if (!$self->{storage}->store_metadata($dest_path, $dest_data)) {
		return $self->api_error('upload', 'Failed to store metadata: ' . $self->{storage}->{error});
	}
	
	# log transaction
	if ($xml->{NewGameID}) {
		$self->log_transaction( 'game_asset_file_transfer_' . $action, { 
			old_game_id => $game_id, 
			new_game_id => $new_game_id,
			old_path => "$source_path$filename", 
			new_path => "$dest_path$filename", 
			bytes_written => $byte_count 
		} );
		return unless $self->game_log_msg($new_game_id, "Transferred asset $filename from $game_id", 'asset');
	}
	else {
		$self->log_transaction( 'game_asset_file_copy_' . $action, { 
			game_id => $new_game_id, 
			old_path => "$source_path$filename", 
			new_path => "$dest_path$filename", 
			bytes_written => $byte_count 
		} );
		return unless $self->game_log_msg($new_game_id, "Copied asset $filename from ".$xml->{SourcePath}." to ".$xml->{DestPath}, 'asset');
	}
	
	# update game stats
	if ($action eq 'add') {
		return unless $self->lock_update_record( "/games/$new_game_id/stats", { Files => "+1", AssetMod => time() }, 1 );
	}
	else {
		# update effective asset mod date
		return unless $self->lock_update_record( "/games/$new_game_id/stats", { AssetMod => time() } );
	}
	
	$self->set_response(0, "Success");
}

sub throw_asset_upload_error {
	##
	# Stuff error in user DB, so client can fetch it later
	# (Flash upload cannot receive direct response)
	##
	my ($self, $path, $msg) = @_;
	
	my $data = $self->{storage}->get_metadata( $path );
	$data->{LastUploadError} = $msg;
	
	$self->{storage}->mark( $path );
	
	return $self->api_error('upload', $msg);
}

sub api_asset_file_upload {
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
	my $dir_path = '/games/' . $game_id . '/assets' . $query->{path};
	my $subpath = $query->{path};
	
	return unless $self->require_game_member($game_id);
	
	my $data = $self->{storage}->get_metadata( $dir_path );
	if (!$data) {
		my $result = $self->{storage}->create_record( $dir_path, {
			Files => { File => [] }
		} );
		if (!$result) { return $self->api_error('upload', 'Failed to store file: ' . $self->{storage}->{error}); }
		
		$data = $self->{storage}->get_metadata( $dir_path );
	}
	
	if (!$data->{Files}) { $data->{Files} = {}; }
	if (!$data->{Files}->{File}) { $data->{Files}->{File} = []; }
	XMLalwaysarray( xml=>$data->{Files}, element=>'File' );
	
	delete $data->{LastUploadError};
	$self->{storage}->mark( $dir_path );
	
	my $upload = $self->{session}->{query}->{Filedata_data};
	if (!$upload && !$self->{session}->{raw_post_data}) { return $self->throw_asset_upload_error($dir_path, 'Upload data not found: Filedata'); }
	
	my $client_filename = ''.$self->{session}->{query}->{Filedata};
	if ($client_filename !~ /\.(\w+)$/) { return $self->throw_asset_upload_error($dir_path, 'Uploaded file has no extension: ' . $client_filename); }
	my $ext = $1;
	
	my $storage_key = $dir_path;
	
	# clean up client filename
	my $orig_filename = $client_filename;
	$client_filename =~ s@\\@/@g;
	$client_filename = basename $client_filename;
	$client_filename =~ s/\s/_/g;
	$client_filename =~ s/_+/_/g;
	$client_filename =~ s/[^\w\.\-]+//g;
	if (!length($client_filename)) { return $self->throw_asset_upload_error($dir_path, 'Uploaded file has a bad filename: ' . $orig_filename); }
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
		$byte_count = $new_size - $old_file->{Size};
		$self->log_debug(5, "Replacing existing file: $dir_path$filename ($new_size bytes, diff: $byte_count)");
		$action = 'replace';
	}
	else {
		# add new file to list
		$self->log_debug(5, "Adding new file: $dir_path$filename ($new_size bytes)");
		$byte_count = $new_size;
		$action = 'add';
	}
	
	# quota check and update
	if ($byte_count > 0) {
		my $stats_path = '/games/' . $game_id . '/stats';
		$self->{storage}->lock_record( $stats_path, 1 ); # exclusive
		my $stats = $self->{storage}->get_metadata( $stats_path );
		if (!$stats) {
			$self->{storage}->unlock_record( $stats_path );
			return $self->throw_asset_upload_error($dir_path, 'Could not load game stats record: ' . $stats_path); 
		}
		if ($stats->{Quota} - $byte_count <= 0) {
			$self->{storage}->unlock_record( $stats_path );
			$self->log_debug(5, "Stats dump: " . serialize_object($stats));
			$self->log_debug(5, "Byte Count: $byte_count");
			return $self->throw_asset_upload_error($dir_path, $self->{config}->{Strings}->{AssetManager}->{OutOfSpace});
		}
		$stats->{Quota} -= $byte_count;
		if (!$self->{storage}->store_metadata( $stats_path, $stats )) {
			$self->{storage}->unlock_record( $stats_path );
			return $self->throw_asset_upload_error( $dir_path, "Failed to update stats record: $stats_path: " . $self->{storage}->{error} );
		}
		$self->{storage}->unlock_record( $stats_path );
	}
	elsif ($byte_count < 0) {
		# file has shrunk, update quota
		return unless $self->lock_update_record( "/games/$game_id/stats", { Quota => '+'.int($byte_count * -1) }, 1 );
	}
	
	# make changes to directory listing
	if ($old_file) {
		# replace file
		$old_file->{Size} = $new_size;
		$old_file->{Modified} = time();
		$old_file->{Username} = $username;
	}
	else {
		# add new file
		push @{$data->{Files}->{File}}, {
			Name => $filename,
			Size => $new_size,
			Created => time(),
			Modified => time(),
			Username => $username
		};
	}
	
	# log transaction
	$self->log_transaction( 'game_asset_file_upload_' . $action, { game_id => $game_id, path => "$dir_path$filename", bytes_written => $byte_count } );
	
	# post to game log
	return unless $self->game_log_msg($game_id, "Uploaded asset: $subpath$filename", 'asset');
	
	# update game stats
	return unless $self->lock_update_record( "/games/$game_id/stats", { Files => "+1", AssetMod => time() }, 1 );
	
	my $result = $self->{storage}->store_file( $storage_key, $filename, $raw_data );
	if (!$result) { return $self->throw_asset_upload_error('upload', 'Failed to store file: ' . $self->{storage}->{error}); }
	
	$self->set_response(0, "Success");
}

sub get_asset_file_list_recursive {
	##
	# Recursively get file list from specified base path
	##
	my ($self, $game_id, $path, $regexp) = @_;
	
	$path =~ s@/$@@; # strip trailing slash
	if ($path && ($path !~ m@^/@)) { $path = '/' . $path; } # add leading slash
	
	my $game_path = '/games/' . $game_id;
	my $files = [];
	
	# note: this will be cached, so is only fetched from disk once
	my $folder_data = $self->{storage}->get_metadata( $game_path . '/asset_folders' );
	if (!$folder_data) { return []; }
	
	my $subfolder = xpath_lookup( $path, $folder_data->{FolderList} );
	if ($subfolder) {
		foreach my $key (keys %$subfolder) {
			push @$files, @{ $self->get_asset_file_list_recursive($game_id, $path . '/' . $key, $regexp ) };
		}
	}
	
	# get file list at this location
	my $dir_path = '/games/' . $game_id . '/assets' . $path;
	my $data = $self->{storage}->get_metadata( $dir_path );
	
	if ($data && $data->{Files} && $data->{Files}->{File}) {
		XMLalwaysarray( xml=>$data->{Files}, element=>'File' );
		foreach my $file (@{$data->{Files}->{File}}) {
			my $file_path = $path . '/' . $file->{Name};
			if (!$regexp || eval('$file_path =~ ' . $regexp . ';')) {
				push @$files, $file_path;
			}
		} # foreach file
	} # folder has files
	
	return $files;
}

sub api_game_asset_folder_download {
	##
	# Download folder and contents as ZIP archive
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	
	return unless $self->validate_session();
	
	my $username = $self->{session}->{db}->{username};
	my $game_id = $query->{game_id};
	my $game_path = '/games/' . $game_id;
	
	return unless $self->require_game_read_access($game_id);
	
	my $base_path = $query->{path} || '';
	$base_path =~ s@/$@@; # strip trailing slash
	if ($base_path && ($base_path !~ m@^/@)) { $base_path = '/' . $base_path; } # add leading slash
	
	my $base_path_parent = $base_path ? dirname($base_path) : '';
	
	$self->log_debug(4, "Creating zip file for: $game_path/assets$base_path");
	
	my $zip = Archive::Zip->new();
	my $files = $self->get_asset_file_list_recursive($game_id, $base_path);
	
	foreach my $file (@$files) {
		my $storage_key = $game_path . '/assets' . dirname($file);
		my $filename = basename($file);
		my $contents = $self->{storage}->get_file_contents($storage_key, $filename);
		if ($contents) {
			my $zip_path = $file; $zip_path =~ s@^$base_path_parent/@@;
			$self->log_debug(5, "Adding file to zip: $storage_key/$filename ($zip_path)");
			$zip->addString( $contents, $zip_path );
		}
		else {
			$self->log_debug(2, "File not found: $storage_key/$filename, skipping");
		}
	}
	
	my $temp_file = $self->{config}->{Paths}->{TempDir} . '/temp_asset_zip_' . $username . '_' . $$ . '.zip';
	unlink $temp_file;
	unless ( $zip->writeToFileNamed($temp_file) == AZ_OK ) {
		return $self->api_error('assets', "Failed to create ZIP file, please try again later.");
	}
	my $content = load_file($temp_file);
	unlink $temp_file;
	undef $zip;
	
	$self->{session}->{request}->content_type( 'application/zip' );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', length($content) );
	
	my $download_filename = $game_id . $base_path;
	$download_filename =~ s/\W+/_/g; $download_filename .= '.zip';
	$self->{session}->{request}->headers_out()->set('Content-disposition', "attachment; filename=" . $download_filename);
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub api_asset_save_file_contents {
	##
	# Save actual file contents (text file edit)
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => '^[a-z0-9][a-z0-9\-]*[a-z0-9]$',
		'/Path' => '.+',
		'/Filename' => '.+',
		'/Content' => '.+'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	my $content = $xml->{Content};
	my $content_length = length($content);
	
	if ($xml->{Path} !~ /\/$/) { $xml->{Path} .= '/'; }
	
	my $dir_path = '/games/' . $xml->{GameID} . '/assets' . $xml->{Path};
	my $subpath = $xml->{Path};
	
	return unless $self->require_game_member($game_id);
	
	my $data = $self->{storage}->get_metadata( $dir_path );
	if (!$data) {
		if ($xml->{Create}) {
			$data = {};
		}
		else {
			return $self->api_error('assets', "Could not locate asset folder: $dir_path");
		}
	}
	
	my $filename = $xml->{Filename};
	my $byte_count = 0;
	
	# locate file in metadata
	if (!$data->{Files}) { $data->{Files} = {}; }
	if (!$data->{Files}->{File}) { $data->{Files}->{File} = []; }
	XMLalwaysarray( xml=>$data->{Files}, element=>'File' );
	
	my $file = XMLsearch( xml=>$data->{Files}->{File}, Name=>$filename );
	if ($file) {
		$file->{Modified} = time();
		$file->{Username} = $username;
		
		$byte_count = $content_length - $file->{Size};
		$file->{Size} = $content_length;
	}
	elsif ($xml->{Create}) {
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
	else {
		return $self->api_error('assets', "Could not locate asset file: $dir_path/$filename");
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
	$self->log_transaction( 'game_asset_edit_file', { game_id => $game_id, path => "$dir_path$filename", bytes_written => $byte_count } );
	
	# log message
	my $action = $xml->{Create} ? 'Created' : 'Edited';
	return unless $self->game_log_msg($game_id, "$action asset: $subpath$filename", 'asset');
	
	# update effective asset mod date
	return unless $self->lock_update_record( "/games/$game_id/stats", { AssetMod => time() } );
	
	$self->set_response(0, "Success");
}

1;
