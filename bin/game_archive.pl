#!/effect/perl/bin/perl

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

# Archive game into .tar.gz

use strict;
use File::Basename;
use English qw( -no_match_vars ) ;
use Digest::MD5 qw/md5_hex/;

use lib qw@/effect/lib@;
use XML::Lite;
use XML::API::Tools;
use Effect::Storage;

$| = 1;

if ($UID != 0) { die "\nError: Must be root to use this tool.  Exiting.\n"; }

my $usage = "Usage: ./game_archive.pl GAME_ID\n";
my $game_id = shift @ARGV or die $usage;

##
# Become web user
##
my (undef, undef, $n_uid, $n_gid) = getpwnam('www');
if (!$n_uid) { die "Cannot determine web UID"; }
if ($EUID != $n_uid) {
	print "Becoming web user...";
	$GID = $EGID = $n_gid;
	$UID = $EUID = $n_uid;
	print "done.\n";
}

my $config = parse_xml( '/effect/conf/Effect.xml' );

my $storage = new Effect::Storage(
	config => $config->{StorageConfig}
);

my $paths = [];

my $game_path = "/games/$game_id";

# base game dataset
push @$paths, get_rev_paths( $game_path );
push @$paths, get_list_paths( "$game_path/users" );
push @$paths, get_list_paths( "$game_path/log" );
push @$paths, "$game_path/level_props";

# revisions
my $revs = $storage->list_get( "$game_path/revs" );
if ($revs) {
	push @$paths, get_list_paths( "$game_path/revs" );
	foreach my $rev (@$revs) {
		push @$paths, get_rev_paths( "$game_path/revisions/" . $rev->{Name} );
	} # foreach rev
} # revs

use Data::Dumper;
print Dumper $paths;

# my $fs_paths = [ map { get_partial_path($_); } @$paths ];
my $fs_paths = [];
foreach my $path (@$paths) {
	my $fs_path = get_partial_path($path);
	if ($fs_path) { push @$fs_paths, $fs_path; }
}

print Dumper $fs_paths;

my $temp_file = "/var/tmp/game_archive_temp.$$.txt";
save_file( $temp_file, join("\n", @$fs_paths) );

my $data_dir = $storage->{config}->{Mount};
my $archive_file = "$game_id.tar.gz";

print `cd $data_dir; tar zcf $archive_file -T $temp_file`;

unlink $temp_file;

print "\nHere you go:\n";
print `ls -l $data_dir/$archive_file`;

exit;

sub get_partial_path {
	##
	# Given storage key, return partial path
	##
	my $key = shift;
	my $path = $storage->get_record_path( $key );
	if (-e $path) {
		$path =~ s@^$storage->{config}->{Mount}/@@;
		return $path;
	}
	else {
		return undef;
	}
}

sub get_rev_paths {
	my $base_path = shift;
	my $paths = [ $base_path ];
	
	push @$paths, "$base_path/stats";
	
	# objects
	push @$paths, get_list_paths( "$base_path/sprites" );
	push @$paths, get_list_paths( "$base_path/tiles" );
	push @$paths, get_list_paths( "$base_path/tilesets" );
	push @$paths, get_list_paths( "$base_path/levels" );
	push @$paths, get_list_paths( "$base_path/fonts" );
	push @$paths, get_list_paths( "$base_path/keys" );
	push @$paths, get_list_paths( "$base_path/audio" );
	push @$paths, get_list_paths( "$base_path/envs" );

	# assets
	push @$paths, "$base_path/asset_folders";
	my $folder_data = $storage->get_metadata( $base_path . '/asset_folders' );
	if ($folder_data && $folder_data->{FolderList}) {
		my $folder_paths = xpath_summary( $folder_data->{FolderList}, '/', 'inc_refs' );
		$folder_paths->{'/'} = 1;
		foreach my $subpath (sort keys %$folder_paths) {
			if ($storage->check_record_exists( $base_path . '/assets' . $subpath )) {
				push @$paths, $base_path . '/assets' . $subpath;
			} # folder exists
		} # foreach asset dir path
	} # game has asset dirs

	# level data
	my $levels = $storage->list_get( "$base_path/levels" );
	if ($levels) {
		foreach my $level (@$levels) {
			if ($storage->check_record_exists( $base_path . '/level_data/' . $level->{Name} )) {
				push @$paths, $base_path . '/level_data/' . $level->{Name};
			} # has level data
			if ($storage->check_record_exists( $base_path . '/level_nav/' . $level->{Name} )) {
				push @$paths, $base_path . '/level_nav/' . $level->{Name};
			} # has nav data
		} # foreach level
	} # has levels
	
	return @$paths;
}

sub get_list_paths {
	##
	# Return all paths for a given list
	##
	my $list_key = shift;
	
	my $list_info = $storage->list_get_info( $list_key );
	if (!$list_info) { return (); }
	
	my $paths = [ $list_key ];
	
	for ($list_info->{first_page}..$list_info->{last_page}) {
		if ($storage->get_metadata( "$list_key/$_" )) { push @$paths, "$list_key/$_"; }
	}
	
	return @$paths;
}

1;
