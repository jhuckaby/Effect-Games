#!/effect/perl/bin/perl

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

# Effect Storage Control
# Usage:
#	./storage.pl dump path xpath
#	./storage.pl set path xpath value
#	./storage.pl delete path xpath
#	./storage.pl edit path [filename]
#	./storage.pl ls path
#	./storage pl cat path [filename]

use strict;
no strict 'refs';

use English qw( -no_match_vars ) ;
use Digest::MD5 qw/md5_hex/;
use File::Basename;

use lib qw@/effect/lib@;
use XML::Lite;
use XML::API::Tools;
use Effect::Storage;

$| = 1;

if ($UID != 0) { die "\nError: Must be root to do this.  Exiting.\n"; }

my $config = parse_xml( '/effect/conf/Effect.xml' );

my $storage = new Effect::Storage(
	config => $config->{StorageConfig}
);

my $cmd = "cmd_" . (shift @ARGV);
# eval( "cmd_" . $cmd . "();" );
$cmd->( @ARGV );

exit;

sub cmd_get { return cmd_dump(@_); }

sub cmd_dump {
	my ($path, $xpath) = @_;
	my $orig_xpath = $xpath;
	
	my $xml = $storage->get_metadata( $path );
	if (!$xml) { die "Could not load metadata: $path\n"; }
	
	while ($xpath =~ s/^\/([^\/]+)//) {
		my $key = $1;
		if (!defined($xml->{$key})) { die "Could not traverse xpath: $orig_xpath, key not found: $key\n"; }
		$xml = $xml->{$key};
	}

	use Data::Dumper;
	print( Dumper( ref($xml) ? $xml : \$xml ) );
}

sub cmd_ls {
	my $path = shift;
	my $full_path = $storage->get_record_path( $path );
	print "$full_path\n";
	print `ls -l $full_path`;
}

sub cmd_cat {
	my ($path, $filename) = @_;
	if (!$filename) { $filename = '_metadata.xml'; }
	my $full_path = $storage->get_record_path( $path ) . '/' . $filename;
	print "$full_path\n";
	print `cat $full_path`;
}

sub cmd_vi { return cmd_edit(@_); }
sub cmd_edit {
	my ($path, $filename) = @_;
	if (!$filename) { $filename = '_metadata.xml'; }
	
	my $full_path = $storage->get_record_path( $path ) . '/' . $filename;
	print "$full_path\n";
	
	if (!(-e $full_path)) { die "File not found: $full_path\n"; }
	
	system( "sudo -u www vi $full_path" );
}

sub cmd_set {
	my ($path, $xpath, $value) = @_;
	
	become_web_user();
	
	my $xml = $storage->get_metadata( $path );
	if (!$xml) { die "Could not load metadata: $path\n"; }
	my $orig_xml = $xml;
	
	my $last_key = basename($xpath);
	$xpath = dirname($xpath);
	if ($xpath !~ /^\//) { $xpath = '/' . $xpath; }

	while ($xpath =~ s/^\/([^\/]+)//) {
		my $key = $1;
		if (!defined($xml->{$key})) { $xml->{$key} = {}; }
		$xml = $xml->{$key};
	}
	
	$xml->{$last_key} = $value;
	
	if (!$storage->store_metadata( $path, $orig_xml )) {
		print "ERROR: " . $storage->{error} . "\n";
	}
}

sub cmd_delete {
	my ($path, $xpath) = @_;
	
	become_web_user();
	
	if ($xpath) {
		my $xml = $storage->get_metadata( $path );
		if (!$xml) { die "Could not load metadata: $path\n"; }
		
		my $orig_xml = $xml;
	
		my $last_key = basename($xpath);
		$xpath = dirname($xpath);
		if ($xpath !~ /^\//) { $xpath = '/' . $xpath; }

		while ($xpath =~ s/^\/([^\/]+)//) {
			my $key = $1;
			if (!defined($xml->{$key})) { $xml->{$key} = {}; }
			$xml = $xml->{$key};
		}
	
		delete $xml->{$last_key};
	
		if (!$storage->store_metadata( $path, $orig_xml )) {
			print "ERROR: " . $storage->{error} . "\n";
		}
	}
	else {
		# delete entire record
		if (!$storage->check_record_exists($path)) {
			print "ERROR: Record does not exist: $path\n";
		}
		elsif (!$storage->delete_record($path)) {
			print "ERROR: " . $storage->{error} . "\n";
		}
	}
}

sub become_web_user {
	##
	# Become web user
	##
	my (undef, undef, $n_uid, $n_gid) = getpwnam('www');
	if (!$n_uid) { die "Cannot determine web UID"; }
	if ($EUID != $n_uid) {
		# print "Becoming web user...";
		$GID = $EGID = $n_gid;
		$UID = $EUID = $n_uid;
		# print "done.\n";
	}
}

1;
