package Effect::Storage;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

##
# Effect Data Storage Class
##

use strict;
use FileHandle;
use File::Basename;
use File::Path;
use DirHandle;
use Symbol;
use Fcntl;
use Digest::MD5 qw/md5_hex/;
use Time::HiRes qw/time/;
use URI::Escape;
use File::Flock;

use XML::API::Tools;
use XML::Lite;

my $metadata_filename = '_metadata.xml';

sub new {
	my $class = shift;
	my $self = bless {@_}, $class;
	
	$self->{error} = '';
	$self->{api_key} = '';
	$self->{permacache} = {};
	
	return $self;
}

sub normalize_key {
	##
	# Clean up key
	##
	my $key = shift;
	
	$key =~ s@^/@@; $key =~ s@/$@@;
	$key =~ s@[^\w\-\.\/]+@@g;
	$key = lc($key);
	
	return $key;
}

sub get_record_path {
	##
	# Get full filesystem path to record given key
	##
	my ($self, $key) = @_;
	
	# normalize key
	$key = normalize_key($key);
	
	my $prefix = 'other';
	if ($key =~ m@^([^/]+)/@) { $prefix = $1; }
	
	my $record_hash = md5_hex( $key . $self->{config}->{SaltString} . $self->{api_key} );
	
	$record_hash =~ m@^(\w)(\w)(\w{2})(\w{2})(\w+)$@;
	return $self->{config}->{Mount} . "/$prefix/$1/$2/$3/$4/$5";
}

sub check_record_exists {
	##
	# Check if record exists given key
	##
	my ($self, $key) = @_;
	
	my $cache_key = normalize_key("$key/$metadata_filename");
	if ($self->{cache}->{$cache_key}) { return 1; }
	
	return (-e $self->get_record_path($key));
}

sub check_file_exists {
	##
	# Check if file exists in record given key and filename
	##
	my ($self, $key, $filename) = @_;
	return (-e $self->get_file_path($key, $filename));
}

sub create_record {
	##
	# Create new record given key and possibly new metadata
	##
	my ($self, $key, $metadata) = @_;
	return $self->store_metadata( $key, $metadata );
}

sub delete_record {
	##
	# Delete record
	##
	my ($self, $key) = @_;
	$self->log_debug(5, "Deleting record: $key" );
	
	my $path = $self->get_record_path($key);
	if (!(-e $path)) {
		$self->{error} = "Record not found: $key";
		return 0;
	}
	
	my $bytes = 0;
	map { $bytes += (stat($_))[7]; } glob($path.'/*');
	
	rmtree( $path, 0, 1 );
	my $result = !(-e $path);
	if (!$result) { $self->{error} = 'rmdir: ' . $path . ": " . ($! || "File not found"); }
	
	my $cache_key = normalize_key("$key/$metadata_filename");
	delete $self->{cache}->{$cache_key};
	
	if ($result) {
		# delete empty hash directories
		# /data/effect/storage/games/2/0/46/bd/64cbca83c8c8272a2ae509b96c/
		my $pdir = dirname($path);
		my $count = 4;
		while (($count > 0) && !(scalar glob($pdir.'/*'))) {
			last unless rmdir($pdir);
			$pdir = dirname($pdir);
			$count--;
		}
	}
	
	return $result ? $bytes : 0;
}

sub delete_cache_record {
	##
	# Delete object from cache
	##
	my ($self, $key) = @_;
	
	my $cache_key = normalize_key("$key/$metadata_filename");
	delete $self->{cache}->{$cache_key};
}

sub permacache_init {
	##
	# Initiallize permacache system, precache if configured to do so
	##
	my $self = shift;
	
	if ($self->{config}->{Permacache}->{Precache}->{Path}) {
		XMLalwaysarray( xml=>$self->{config}->{Permacache}->{Precache}, element=>'Path' );
		foreach my $path (@{$self->{config}->{Permacache}->{Precache}->{Path}}) {
			$self->log_debug(5, "Precaching path in permacache: $path");
			$self->permacache_get( $path );
		}
	}
}

sub permacache_get {
	##
	# Get parsed XML file and cache in permanent shared memory (mod_perl global mem)
	# Monitor for changes and refresh if needed
	##
	my ($self, $key, $filename) = @_;
	if (!$filename) { $filename = $metadata_filename; }
	
	my $cache_key = normalize_key("$key/$filename");
	my $obj = $self->{permacache}->{$cache_key};
	my $now = time();
	
	if (!$obj) {
		# not in cache, make it so
		my $metadata = $self->get_metadata( $key, $filename );
		if (!$metadata) { return undef; }
		
		$obj = {
			last_check => $now,
			mod_date => $self->get_file_mod($key, $filename),
			key => $key,
			filename => $filename,
			metadata => $metadata
		};
		$self->{permacache}->{$cache_key} = $obj;
		return $obj->{metadata};
	}
	
	if ($now - $obj->{last_check} >= 60) {
		$obj->{last_check} = $now;
		my $mod_date = $self->get_file_mod($key, $filename);
		if ($obj->{mod_date} != $mod_date) {
			$obj->{mod_date} = $mod_date;
			$obj->{metadata} = $self->get_metadata( $key, $filename );
		} # mod date changed
	} # time to check
	
	return $obj->{metadata};
}

sub get_metadata {
	##
	# Fetch and parse metadata, given key
	##
	my ($self, $key, $filename) = @_;
	if (!$filename) { $filename = $metadata_filename; }
	
	my $cache_key = normalize_key("$key/$filename");
	if ($self->{cache}->{$cache_key}) { return $self->{cache}->{$cache_key}->{metadata}; }
	
	my $path = $self->get_record_path($key);
	my $parser = new XML::Lite(
		file => $path . '/' . $filename,
		preserveAttributes => 1
	);
	if ($parser->getLastError()) {
		$self->{error} = $parser->getLastError();
		return 0;
	}
	my $metadata = $parser->getTree();
	
	# $metadata->{Data} ||= {};
	
	##
	# This is just a temporary transaction cache, NOT resident (cleared in session_end())
	##
	$self->{cache}->{$cache_key} = {
		key => $key,
		filename => $filename,
		metadata => $metadata
	};
	
	return $metadata;
}

sub store_cache {
	##
	# Store metadata in cache, marked for commit
	##
	my ($self, $key, $metadata, $filename) = @_;
	if (!$filename) { $filename = $metadata_filename; }
	
	my $cache_key = normalize_key("$key/$filename");
	$self->{cache}->{$cache_key} = {
		key => $key,
		filename => $filename,
		metadata => $metadata,
		changed => 1
	};
}

sub rename_file {
	##
	# Rename file in record
	##
	my ($self, $key, $old_filename, $new_filename) = @_;
	
	$self->log_debug(5, "Renaming file: $old_filename to: $new_filename in record: $key" );
	
	my $old_path = $self->get_file_path($key, $old_filename);
	$self->log_debug(5, "Old Path: $old_path");
	
	my $new_path = $self->get_file_path($key, $new_filename);
	$self->log_debug(5, "New Path: $new_path");
	
	return rename($old_path, $new_path);
}

sub copy_record {
	##
	# Copy record to new path
	##
	my ($self, $old_key, $new_key) = @_;
	
	$self->log_debug(5, "Copying record: $old_key to: $new_key");
	
	if (!$self->check_record_exists($old_key)) {
		$self->{error} = "Could not find record: $old_key";
		return 0;
	}
	
	if ($self->check_record_exists($new_key)) {
		$self->{error} = "Target record already exists: $new_key";
		return 0;
	}
	
	my $old_path = $self->get_record_path( $old_key );
	my $new_path = $self->get_record_path( $new_key );
	
	make_dirs_for( $new_path . '/' );
	
	my $bytes = 0;
	
	foreach my $file (glob($old_path.'/*')) {
		$bytes += (stat($file))[7];
		my $filename = basename($file);
		
		if (!file_copy($file, $new_path.'/'.$filename)) {
			$self->{error} = "Failed to copy file: $file to $new_path/$filename: $!";
			return 0;
		}
		
		# if (!rename($file, $new_path.'/'.$filename)) {
		# 	if (!file_copy($file, $new_path.'/'.$filename)) {
		# 		$self->{error} = "Failed to copy file: $file to $new_path/$filename: $!";
		# 		return 0;
		# 	}
		# 	unlink $file;
		# }
	}
	
	return $bytes;
}

sub rename_record {
	##
	# Copy, then delete old record
	##
	my ($self, $old_key, $new_key) = @_;
	
	my $result = $self->copy_record($old_key, $new_key);
	if (!$result) { return $result; }
	
	return $self->delete_record($old_key);
}

sub store_metadata {
	##
	# Save modified metadata back to disk (atomic)
	##
	my ($self, $key, $metadata, $filename) = @_;
	if (!$filename) { $filename = $metadata_filename; }

	my $path = $self->get_record_path($key);
	my $now = time();
	
	$self->log_debug(5, "Storing metadata: $key/$filename ($path/$filename)" );
	
	$metadata ||= {};
	$metadata->{_Attribs} ||= {};
	$metadata->{_Attribs}->{Version} ||= '1.0';
	$metadata->{_Attribs}->{Created} ||= $now;
	$metadata->{_Attribs}->{Modified} = $now;
	
	my $metadata_file = $path . '/' . $filename;
	my $temp_file = $metadata_file . ".$$." . rand(32768) . '.tmp';
	if (!make_dirs_for( $metadata_file )) {
		$self->{error} = $!;
		return 0;
	}
	
	my $parser = new XML::Lite( $metadata );
	$parser->setDocumentNodeName( 'EffectMetadata' );
	if (!$parser->compose( $temp_file )) {
		$self->{error} = $!;
		return 0;
	}
	
	if (!rename( $temp_file, $metadata_file )) {
		$self->{error} = $!;
		return 0;
	}
	
	##
	# Update cache (NOT marked for commit)
	##
	my $cache_key = normalize_key("$key/$filename");
	$self->{cache}->{$cache_key} = {
		key => $key,
		filename => $filename,
		metadata => $metadata
	};
	
	return 1;
}

sub set_expiration {
	##
	# Mark record for expiration (needs commit afterward) and flag cleanup system schedule
	# DO NOT PASS MM/DD/YYYY as this is interpreted as DD/MM/YYYY in str2time (use YYYY/MM/DD or epoch instead)
	##
	my ($self, $key, $expire_date) = @_;
	
	my $metadata = $self->get_metadata($key);
	if (!$metadata) {
		$self->{error} = "Record not found: $key";
		return 0;
	}
	
	my $expire_epoch = 0;
	if ($expire_date =~ /^\d+(\.\d+)?$/) {
		$expire_epoch = int($expire_date);
	}
	else {
		$expire_epoch = str2time( $expire_date );
		if (!$expire_epoch) {
			$self->{error} = "Could not convert date to epoch: $expire_date";
			return 0;
		}
	}
	
	# expiration cannot be in the past, as cleanup system will miss it
	if ($expire_epoch < time()) {
		$expire_epoch = int(time());
	}
	
	$self->log_debug(5, "Setting expiration date of $key to " . (scalar localtime $expire_epoch));
	
	$metadata->{_Attribs} ||= {};
	$metadata->{_Attribs}->{Expires} = $expire_epoch;
	$self->mark($key);
	
	# write stub to logfile that will be picked up by cleanup system
	my ($sec,$min,$hour,$mday,$mon,$year,$wday,$yday,$isdst) = localtime( $expire_epoch );
	my $cleanup_file = $self->{config}->{CleanupBaseDir} . '/' . 
		sprintf("%0004d/%02d/%02d", $year + 1900, $mon + 1, $mday) . '/cleanup.log';
	
	make_dirs_for($cleanup_file);
	
	my $fh = new FileHandle ">>$cleanup_file";
	if (!$fh) {
		$self->{error} = "Could not open cleanup file for writing: $cleanup_file: $!";
		return 0;
	}
	$fh->print( "$key\n" );
	$fh->close();
	
	return 1;
}

sub mark {
	##
	# Mark cached metadata as "dirty" so it is committed at end of session
	##
	my ($self, $key, $filename) = @_;
	if (!$filename) { $filename = $metadata_filename; }
	
	my $cache_key = normalize_key("$key/$filename");
	if ($self->{cache}->{$cache_key}) {
		$self->{cache}->{$cache_key}->{changed} = 1;
		return 1;
	}
	else { return 0; } # obj not found
}

sub unmark {
	##
	# Mark cached metadata as "clean" so it is not written
	##
	my ($self, $key, $filename) = @_;
	if (!$filename) { $filename = $metadata_filename; }
	
	my $cache_key = normalize_key("$key/$filename");
	if ($self->{cache}->{$cache_key}) {
		$self->{cache}->{$cache_key}->{changed} = 0;
		return 1;
	}
	else { return 0; } # obj not found
}

sub store_file {
	##
	# Save file into record directory
	##
	my ($self, $key, $filename, $contents) = @_;
	$self->log_debug(5, "Storing file: $filename into record: $key (" . length($contents) . " bytes)" );
	
	if (!defined($contents) || !length($contents)) {
		$self->{error} = "Cannot store zero length files";
		return undef;
	}
	
	my $path = $self->get_file_path($key, $filename);
	$self->log_debug(5, "Full Path: $path");
	
	my $result = save_file($path, $contents);
	if (!$result) {
		$self->{error} = $!;
	}
	return $result;
}

sub delete_file {
	##
	# Delete file from record
	##
	my ($self, $key, $filename) = @_;
	$self->log_debug(5, "Deleting file: $filename from record: $key" );
	
	my $path = $self->get_file_path($key, $filename);
	$self->log_debug(5, "Full Path: $path");
	
	return unlink($path);
}

sub get_file_path {
	##
	# Get full filesystem path to file stored in record
	##
	my ($self, $key, $filename) = @_;
	if (!$filename) { $filename = $metadata_filename; }
	return $self->get_record_path($key) . '/' . $filename;
}

sub get_file_mod {
	##
	# Get file modification date from disk
	##
	my ($self, $key, $filename) = @_;
	if (!$filename) { $filename = $metadata_filename; }
	my $full_path = $self->get_file_path( $key, $filename );
	my @stats = stat($full_path);
	return $stats[9];
}

sub get_file_size {
	##
	# Get file size on disk in bytes
	##
	my ($self, $key, $filename) = @_;
	if (!$filename) { $filename = $metadata_filename; }
	my $full_path = $self->get_file_path( $key, $filename );
	my @stats = stat($full_path);
	return $stats[7];
}

sub lock_record {
	##
	# Obtain exclusive or shared lock on record metadata file
	##
	my ($self, $key, $exclusive) = @_;
	my $metadata_file = $self->get_file_path($key);
	make_dirs_for( $metadata_file );
	lock( $metadata_file, !$exclusive );
}

sub unlock_record {
	##
	# Unlock record
	##
	my ($self, $key) = @_;
	unlock( $self->get_file_path($key) );
}

sub get_file_fh {
	##
	# Get open filehandle to file stored in record
	##
	my ($self, $key, $filename, $mode) = @_;
	$mode ||= O_RDONLY;
	my $path = $self->get_file_path($key, $filename);
	return FileHandle->new( $path, $mode );
}

sub get_file_contents {
	##
	# Return file contents as scalar
	##
	my ($self, $key, $filename) = @_;
	my $path = $self->get_file_path($key, $filename);
	return load_file( $path );
}

sub session_start {
	##
	# Start a new session, prepare metadata cache
	##
	my $self = shift;
	$self->{cache} = {};
}

sub session_end {
	##
	# End session, flush cache to disk
	##
	my $self = shift;
	$self->commit();
	undef $self->{cache};
}

sub commit {
	##
	# Commit all changed metadata in cache to disk
	##
	my $self = shift;
	# $self->log_debug(5, "In storage commit() now");
	
	if ($self->{cache}) {
		foreach my $cache_key (keys %{$self->{cache}}) {
			my $obj = $self->{cache}->{$cache_key};
			if ($obj->{changed}) {
				$self->log_debug(5, "Committing cache object: " . $obj->{key} . '/' . $obj->{filename} );
				return undef unless $self->store_metadata( $obj->{key}, $obj->{metadata}, $obj->{filename} );
				delete $self->{cache}->{$cache_key};
			}
		}
	
		# undef $self->{cache};
	}
	
	return 1;
}

sub log_debug {
	##
	# Pass log request to parent
	##
	my ($self, $level, $msg) = @_;
	if ($self->{resident}) { $self->{resident}->log_debug($level, $msg); }
}

##
# Bidirectional Chunk Lists
# Great for comments, revisions, rss feeds, blogs maybe
##

sub list_create {
	##
	# Create new list
	##
	my ($self, $key) = @_;
	
	$self->log_debug(5, "Creating list: $key" );
	
	return $self->create_record( $key, {
		first_page => 0,
		last_page => 0,
		length => 0
	} );
}

sub _list_load {
	##
	# Internal function, load list root, create if doesn't exist
	##
	my ($self, $key, $create) = @_;
	
	my $list = $self->get_metadata($key);
	if (!$list && $create) {
		my $result = $self->list_create($key);
		if (!$result) { return $result; }
		$list = $self->get_metadata($key);
	}
	
	if ($list && !defined($list->{length})) {
		# plain mediaset only, convert to list
		$list->{length} = 0;
		$list->{first_page} = 0;
		$list->{last_page} = 0;
	}
	
	return $list;
}

sub _list_load_page {
	##
	# Internal function, load page from list, create if doesn't exist
	##
	my ($self, $key, $idx, $create) = @_;
	my $page_key = $key . '/' . $idx;
	
	my $page = $self->get_metadata( $page_key );
	if (!$page && $create) {
		my $result = $self->create_record( $page_key, {
			item => []
		} );
		if (!$result) { return $result; }
		$page = $self->get_metadata( $page_key );
	}
	if (!$page) { return undef; }
	
	if (!$page->{item}) { $page->{item} = []; }
	else {
		XMLalwaysarray( xml=>$page, element=>'item' );
	}
	
	return $page;
}

sub list_push {
	##
	# Push new item onto end of list
	##
	my ($self, $key, $item) = @_;
	
	my $list = $self->_list_load($key, 1);
	return undef unless $list;
	
	my $page = $self->_list_load_page($key, $list->{last_page}, 1);
	return undef unless $page;
	
	my $num_items = scalar @{$page->{item}};
	if ($num_items >= $self->{config}->{ListItemsPerPage}) {
		# need new page
		$list->{last_page}++;
		$page = $self->_list_load_page($key, $list->{last_page}, 1);
		return unless $page;
	}
	
	push @{$page->{item}}, $item;
	$self->mark( $key . '/' . $list->{last_page} );
	
	$list->{length}++;
	$self->mark( $key );
	
	return 1;
}

sub list_unshift {
	##
	# Unshift new item onto beginning of list
	##
	my ($self, $key, $item) = @_;
	
	my $list = $self->_list_load($key, 1);
	return undef unless $list;
	
	my $page = $self->_list_load_page($key, $list->{first_page}, 1);
	return undef unless $page;
	
	my $num_items = scalar @{$page->{item}};
	if ($num_items >= $self->{config}->{ListItemsPerPage}) {
		# need new page
		$list->{first_page}--;
		$page = $self->_list_load_page($key, $list->{first_page}, 1);
		return unless $page;
	}
	
	unshift @{$page->{item}}, $item;
	$self->mark( $key . '/' . $list->{first_page} );
	
	$list->{length}++;
	$self->mark( $key );
	
	return 1;
}

sub list_pop {
	##
	# Pop last item off end of list, shrink as necessary, return item
	##
	my ($self, $key) = @_;
	
	my $list = $self->_list_load($key, 0);
	return undef unless $list;
	
	my $page = $self->_list_load_page($key, $list->{last_page}, 0);
	return undef unless $page;
	
	my $item = pop @{$page->{item}};
	my $num_items = scalar @{$page->{item}};
	if (!$num_items) {
		# out of items in this page, delete page, adjust list
		my $result = $self->delete_record( $key . '/' . $list->{last_page} );
		return $result unless $result;
		
		if ($list->{last_page} > $list->{first_page}) {
			$list->{last_page}--;
		}
	}
	else {
		$self->mark( $key . '/' . $list->{last_page} );
	}
	
	$list->{length}--;
	$self->mark( $key );
	
	return $item;
}

sub list_shift {
	##
	# Shift first item off beginning of list, shrink as necessary, return item
	##
	my ($self, $key) = @_;
	
	my $list = $self->_list_load($key, 0);
	return undef unless $list;
	
	my $page = $self->_list_load_page($key, $list->{first_page}, 0);
	return undef unless $page;
	
	my $item = shift @{$page->{item}};
	my $num_items = scalar @{$page->{item}};
	if (!$num_items) {
		# out of items in this page, delete page, adjust list
		my $result = $self->delete_record( $key . '/' . $list->{first_page} );
		return $result unless $result;
		
		if ($list->{first_page} < $list->{last_page}) {
			$list->{first_page}++;
		}
	}
	else {
		$self->mark( $key . '/' . $list->{first_page} );
	}
	
	$list->{length}--;
	$self->mark( $key );
	
	return $item;
}

sub list_cut {
	##
	# Potentially very expensive operation, cut section out of middle of list
	# Must re-adjust list pages, lots of reading/writing
	##
	my ($self, $key, $idx, $len) = @_;
	$len ||= 1;
	my $items = [];
	
	my $list = $self->_list_load($key, 0);
	return undef unless $list;
	
	my $page = $self->_list_load_page($key, $list->{first_page}, 0);
	return $items unless $page;
	
	my $num_fp_items = scalar @{$page->{item}};
	my $chunk_size = $self->{config}->{ListItemsPerPage};
	
	if ($idx < $num_fp_items) {
		# cut involves first page
		push @$items, splice( @{$page->{item}}, $idx, $len );
		$self->mark( $key . '/' . $list->{first_page} );
		
		$idx += scalar @$items;
		$len -= scalar @$items;
	}
	
	if (($idx >= $num_fp_items) && $len) {
		# more pages are involved
		my $first_page_needed = $list->{first_page} + 1 + int(($idx - $num_fp_items) / $chunk_size);
		my $last_page_needed = $list->{first_page} + 1 + int((($idx - $num_fp_items) + $len - 1) / $chunk_size);
		
		# warn "pages needed: $first_page_needed - $last_page_needed\n";

		for (my $page_idx = $first_page_needed; $page_idx <= $last_page_needed; $page_idx++) {
			$page = $self->_list_load_page($key, $page_idx, 0);
			return undef unless $page;
			
			my $page_start_idx = $num_fp_items + (($page_idx - $list->{first_page} - 1) * $chunk_size);
			my $local_idx = $idx - $page_start_idx;
			
			my $new_items = [ splice( @{$page->{item}}, $local_idx, $len ) ];
			push @$items, @$new_items;
			$self->mark( $key . '/' . $page_idx );

			$idx += scalar @$new_items;
			$len -= scalar @$new_items;
		} # foreach page needed
		
		# keep track of max page affected, for deletes below
		my $max_page_affected = $last_page_needed;
		
		# now, shift everything over to take up space
		# we need to scan pages twice because two different pages may have lost items
		for (1..2) {
			for (my $page_idx = $first_page_needed; $page_idx <= $max_page_affected; $page_idx++) {
				$page = $self->_list_load_page($key, $page_idx, 0);
				return undef unless $page;
			
				if ((scalar @{$page->{item}} < $chunk_size) && ($page_idx < $list->{last_page})) {
					my $relief_idx = $page_idx + 1;
					my $relief_page = $self->_list_load_page($key, $relief_idx, 0);
					return undef unless $relief_page;
				
					while (!scalar @{$relief_page->{item}}) {
						$relief_idx++;
						last if $relief_idx > $list->{last_page};
						$relief_page = $self->_list_load_page($key, $relief_idx, 0);
						return undef unless $relief_page;
					}
				
					if ($relief_idx > $max_page_affected) { $max_page_affected = $relief_idx; }
					if ($max_page_affected > $list->{last_page}) { $max_page_affected = $list->{last_page}; }
				
					my $shifted = 0;
					while ((scalar @{$page->{item}} < $chunk_size) && $relief_page && (scalar @{$relief_page->{item}})) {
						push @{$page->{item}}, shift @{$relief_page->{item}};
						$shifted = 1;
					}
				
					if ($shifted) {
						$self->mark( $key . '/' . $page_idx );
						$self->mark( $key . '/' . $relief_idx );
					}
				} # page needs more items
			} # foreach page touched
		}
		
		# move first page if necessary
		my $page = $self->_list_load_page($key, $list->{first_page}, 0);
		return $items unless $page;
		
		if (!scalar @{$page->{item}}) {
			my $result = $self->delete_record( $key . '/' . $list->{first_page} );
			return $result unless $result;
			
			$list->{first_page}++;
		}
				
		# delete empty pages
		for (my $page_idx = $first_page_needed; $page_idx <= $max_page_affected; $page_idx++) {
			$page = $self->_list_load_page($key, $page_idx, 0);
			return undef unless $page;
			
			if (!scalar @{$page->{item}} && ($page_idx > $list->{first_page})) {
				my $result = $self->delete_record( $key . '/' . $page_idx );
				return $result unless $result;
				
				if ($list->{last_page} > $page_idx - 1) { $list->{last_page} = $page_idx - 1; }
			} # page is empty
		} # foreach page touched
	} # need more items
	
	$list->{length} -= scalar @$items;
	$self->mark( $key );
	
	return $items;
}

sub list_get {
	##
	# Fetch chunk from list of any size, in any location
	# Use negative idx to fetch from end of list
	##
	my ($self, $key, $idx, $len) = @_;
	my $items = [];
	
	my $list = $self->_list_load($key, 0);
	return undef unless $list;
	
	if (!defined($idx)) { $idx = 0; }
	if (!defined($len)) { $len = $list->{length}; }
	
	##
	# Allow user to get items from end of list
	##
	if ($idx < 0) { $idx += $list->{length}; }
	if ($idx + $len > $list->{length}) { $len = $list->{length} - $idx; }
	
	my $page = $self->_list_load_page($key, $list->{first_page}, 0);
	return $items unless $page;
	
	##
	# First page is special, as it is variable sized
	# and shifts the paging algorithm
	##
	while (defined($page->{item}->[$idx])) {
		push @$items, $page->{item}->[$idx++];
		$len--;
		last if !$len;
	}
	return $items if !$len;
	return $items if $idx >= $list->{length};
		
	##
	# Okay, we need more items -- now it gets tricky
	##
	my $num_fp_items = scalar @{$page->{item}};
	my $chunk_size = $self->{config}->{ListItemsPerPage};
	
	my $first_page_needed = $list->{first_page} + 1 + int(($idx - $num_fp_items) / $chunk_size);
	my $last_page_needed = $list->{first_page} + 1 + int((($idx - $num_fp_items) + $len - 1) / $chunk_size);
		
	for (my $page_idx = $first_page_needed; $page_idx <= $last_page_needed; $page_idx++) {
		$page = $self->_list_load_page($key, $page_idx, 0);
		return $items unless $page;
		
		my $page_start_idx = $num_fp_items + (($page_idx - $list->{first_page} - 1) * $chunk_size);
		my $local_idx = $idx - $page_start_idx;
		
		while (defined($page->{item}->[$local_idx])) {
			push @$items, $page->{item}->[$local_idx++];
			$idx++;
			$len--;
			last if !$len;
		}
		return $items if !$len;
	}
	
	return $items;
}

sub list_find_idx {
	##
	# Find single item index in list given criteria -- WARNING: this can be slow with long lists
	##
	my ($self, $path, $criteria, $mark) = @_;
	my $num_crit = scalar keys %$criteria;
	
	my $list = $self->_list_load($path, 0);
	return undef unless $list;
	
	my $idx = 0;
	
	if ($list->{length}) {
		for (my $page_idx = $list->{first_page}; $page_idx <= $list->{last_page}; $page_idx++) {
			my $page = $self->_list_load_page($path, $page_idx, 0);
			return undef unless $page;
			
			foreach my $item (@{$page->{item}}) {
				my $matches = 0;
				foreach my $key (keys %$criteria) {
					if (xpath_lookup($key, $item) eq $criteria->{$key}) { $matches++; }
				}
				if ($matches == $num_crit) {
					if ($mark) { $self->mark( $path . '/' . $page_idx ); }
					return $idx;
				}
				$idx++;
			} # foreach item in page
		} # foreach page
	} # list has items
	
	return -1;
}

sub list_find {
	##
	# Find single item in list given criteria -- WARNING: this can be slow with long lists
	##
	my ($self, $path, $criteria, $mark) = @_;
	my $num_crit = scalar keys %$criteria;
	
	my $list = $self->_list_load($path, 0);
	return undef unless $list;
	
	if ($list->{length}) {
		for (my $page_idx = $list->{first_page}; $page_idx <= $list->{last_page}; $page_idx++) {
			my $page = $self->_list_load_page($path, $page_idx, 0);
			return undef unless $page;
			
			foreach my $item (@{$page->{item}}) {
				my $matches = 0;
				foreach my $key (keys %$criteria) {
					if (xpath_lookup($key, $item) eq $criteria->{$key}) { $matches++; }
				}
				if ($matches == $num_crit) {
					if ($mark) { $self->mark( $path . '/' . $page_idx ); }
					return $item;
				}
			} # foreach item in page
		} # foreach page
	} # list has items
	
	return undef;
}

sub list_find_cut {
	##
	# Find single object by criteria, and if found, delete it -- WARNING: this can be slow with long lists
	##
	my ($self, $path, $criteria) = @_;
	
	my $idx = $self->list_find_idx( $path, $criteria );
	if ($idx > -1) {
		return $self->list_cut( $path, $idx, 1 );
	}
	else {
		return 0;
	}
}

sub list_delete {
	##
	# Delete entire list and all pages
	##
	my ($self, $key) = @_;
	
	my $list = $self->_list_load($key, 0);
	return undef unless $list;
	
	if ($list->{length}) {
		for (my $idx = $list->{first_page}; $idx <= $list->{last_page}; $idx++) {
			my $result = $self->delete_record( $key . '/' . $idx );
			return $result unless $result;
		}
	}
	
	my $result = $self->delete_record( $key );
	return $result unless $result;
	
	return 1;
}

sub list_get_info {
	##
	# Return info about list (number of items, etc.)
	##
	my ($self, $key) = @_;
	
	return $self->_list_load($key, 0);
}

sub list_copy {
	##
	# Copy list to new path (and all pages)
	##
	my ($self, $old_key, $new_key) = @_;
	
	my $old_list = $self->_list_load($old_key, 0);
	return undef unless $old_list;
	
	# make sure new one doesn't already exist
	if ($self->check_record_exists($new_key)) {
		$self->{error} = "Target list already exists: $new_key";
		return 0;
	}
		
	if ($old_list->{length}) {
		for (my $idx = $old_list->{first_page}; $idx <= $old_list->{last_page}; $idx++) {
			my $result = $self->copy_record( $old_key . '/' . $idx, $new_key . '/' . $idx );
			return $result unless $result;
		}
	}
	
	my $result = $self->copy_record( $old_key, $new_key );
	return $result unless $result;
	
	return 1;
}

sub list_rename {
	##
	# Copy, then delete list (and all pages)
	##
	my ($self, $old_key, $new_key) = @_;
	
	my $result = $self->list_copy($old_key, $new_key);
	if (!$result) { return $result; }
	
	return $self->list_delete($old_key);
}

1;
