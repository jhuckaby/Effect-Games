#!/effect/perl/bin/perl

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

# Database setup script for Effect Server
# JH - 2008-09-01

use strict;
use File::Basename;
use English qw( -no_match_vars ) ;
use Digest::MD5 qw/md5_hex/;

use lib qw@/effect/lib@;
use XML::Lite;
use XML::API::Tools;
use Effect::Storage;
use Doxter;

$| = 1;

if ($UID != 0) { die "\nError: Must be root to setup DB.  Exiting.\n"; }

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

my $storage_base = $config->{StorageConfig}->{Mount};
my $cleanup_base = $config->{StorageConfig}->{CleanupBaseDir};

##
# Make sure base directories exist
##
`mkdir -p $storage_base`;
`mkdir -p $cleanup_base`;
if (!(-e $storage_base) || !(-e $cleanup_base)) { die "ERROR: Could not create dir: $storage_base or $cleanup_base\n"; }

##
# Wipe out all storage and cleanup data
##
`rm -rf $storage_base/*`;
`rm -rf $cleanup_base/*`;

##
# Insert initial data from XML file
##
print "Creating initial data records\n";
my $initial = parse_xml( '/effect/conf/initial_data_setup.xml' );
XMLalwaysarray( xml=>$initial, element=>'Record' );
foreach my $rec (@{$initial->{Record}}) {
	print "Creating record: " . $rec->{_Attribs}->{Path} . "...";
	$storage->create_record( $rec->{_Attribs}->{Path}, $rec->{Data} );
	print "done.\n";
}

##
# Admin user (default password: admin, CHANGE THIS LATER)
##
my $privs = $config->{DefaultPrivileges};
$privs->{admin} = 1;
$storage->create_record( '/users/admin', {
	%{$config->{DefaultUser}},
	Username => 'admin',
	Created => time(),
	Updated => time(),
	Password => md5_hex( 'admin' ),
	Author => 'admin',
	AuthorClientInfo => 'script',
	Privileges => $privs,
	FullName => 'Administrator',
	FirstName => 'Administrator',
	LastInitial => 'A',
	Email => 'admin@yourdomain.com'
});
$storage->create_record( '/users/admin/stats', {} );
$storage->list_create( '/users/admin/log' );

##
# Insert all documents from /effect/docs/
##
foreach my $doc_file (glob('/effect/docs/*.txt')) {
	my $doc_filename = basename($doc_file);
	if ($doc_filename !~ /^_/) {
		print "\nCreating article from disk: $doc_file\n";
		# insert_article( '', '', '', '', load_file($doc_file) );
		`/effect/bin/insert_article.pl $doc_file`;
	}
}

print "\nStorage setup complete.  You may start Apache.\n\n";

exit;

1;
