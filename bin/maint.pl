#!/effect/perl/bin/perl

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

##
# Effect Daily Maintenance Script
# Cleans up expired data (sessions, etc.), rotates logs

# Usage: /effect/bin/maint.pl hourly|daily
##

package Effect::Maint;

use strict;
use English qw( -no_match_vars ) ;
use File::Path;
use File::Basename;
use URI::Escape;
use MIME::Lite;
use HTTP::Date;
use Digest::MD5 qw/md5_hex/;
use LWP::UserAgent;
use HTTP::Request;
use HTTP::Request::Common qw/POST PUT/;
use HTTP::Response;

use lib qw@/effect/lib@;
use XML::API::Tools;
use XML::API::Log;
use XML::API::Perf;
use Effect::Storage;

our @ISA = ("XML::API::Log", "XML::API::Perf");

$| = 1;

if ($UID != 0) { die "\nError: Must be root to run this script.  Exiting.\n"; }

chdir( '/effect' );

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

my $gzip_bin = "/usr/bin/gzip";
if (!(-e $gzip_bin)) { $gzip_bin = "/bin/gzip"; }
if (!(-e $gzip_bin)) { die "Could not locate gzip binary\n"; }

my $usage = "Usage: /effect/bin/maint.pl hourly|daily\n";
my $mode = shift @ARGV or die $usage;
if ($mode !~ /^(storagecleanup|logarchive|daily|hourly)$/) { die $usage; }

my $self = bless {};
my $name = "Effect Maintenance";
my $config_file = shift @ARGV || "/effect/conf/Effect.xml";

my $config = parse_xml( $config_file );
if (!ref($config)) { die "$name: Failed to parse config file: $config_file: $config\n"; }

if (!$config->{BaseDir}) { die "$name: No BaseDir defined in config: $config_file\n"; }
if ($config->{BaseDir} !~ m@^/@) { die "$name: BaseDir path needs to be absolute: $config_file\n"; }
$config->{BaseDir} =~ s@/$@@;

if (!$config->{Paths}) { $config->{Paths} = {}; }
foreach my $key (keys %{$config->{Paths}}) {
	if ($config->{Paths}->{$key} !~ m@^/@) {
		$config->{Paths}->{$key} = $config->{BaseDir} . '/' . $config->{Paths}->{$key};
	}
}

$self->{config} = $config;
$self->{config}->{Paths}->{LogFile} = $self->{config}->{Paths}->{MaintLogFile};
$self->{config}->{EchoLog} = $self->{config}->{EchoMaintLog} || 0;

$self->{config}->{LogTemplate} ||= '[hires_epoch][yyyy-mm-dd hh:mi:ss][hostname][pid][package][category][code] msg';
$self->{config}->{DebugLevel} ||= 1;

my $storage = new Effect::Storage(
	config => $config->{StorageConfig}
);
$self->{storage} = $storage;

my $hostname = trim(`/bin/hostname`);
$self->{log_args}->{hostname} = $hostname;

$self->log_debug(2, "Beginning $mode maintenance run");
$self->perf_begin();

##
# Perform action based on mode
##
if ($mode eq 'hourly') {
	$self->log_archive();
}
elsif ($mode eq 'daily') {
	$self->storage_cleanup();
}
elsif ($mode eq 'logarchive') {
	$self->log_archive();
}
elsif ($mode eq 'storagecleanup') {
	$self->storage_cleanup();
}

$self->perf_end();
$self->log_debug(2, "End $mode maintenance run");
$self->log_debug(2, "Performance Metrics: " . $self->perf_summarize() );

exit;

sub storage_cleanup {
	##
	# Look for storage expiration log for yesterday, and process it
	##
	my $self = shift;
	$self->log_debug(2, "Cleaning up storage records");
	$self->perf_begin('storage_cleanup');
	
	my $now = time();
	my $then = $now - 86400;
	
	my ($sec,$min,$hour,$mday,$mon,$year,$wday,$yday,$isdst) = localtime( $then );
	my $cleanup_file = $self->{config}->{StorageConfig}->{CleanupBaseDir} . '/' . 
		sprintf("%0004d/%02d/%02d", $year + 1900, $mon + 1, $mday) . '/cleanup.log';

	while (-e $cleanup_file) {
		##
		# Found cleanup file for yesterday's data
		# First, atomically move it
		##
		$self->log_debug(3, "Working on cleanup file: $cleanup_file");
		my $temp_cleanup_file = $cleanup_file . ".tmp.$$.log";
		if (!rename($cleanup_file, $temp_cleanup_file)) {
			$self->log_debug(1, "Failed to rename cleanup file: $cleanup_file: $!");
			$self->perf_end('storage_cleanup');
			return undef;
		}

		my $fh = new FileHandle "<$temp_cleanup_file";
		if (!$fh) {
			$self->log_debug(1, "Failed to open temp cleanup file for reading: $temp_cleanup_file: $!");
			$self->perf_end('storage_cleanup');
			return undef;
		}
		
		while (my $storage_key = <$fh>) {
			chomp $storage_key;
			
			if ($storage_key) {
				$self->log_debug(4, "Processing storage key: $storage_key");
				
				# see if record still exists
				my $metadata = $self->{storage}->get_metadata($storage_key);
				if ($metadata) {
					# found metadata, see if it has expired
					if ($metadata->{_Attribs}->{Expires} && ($metadata->{_Attribs}->{Expires} <= $now)) {
						# yup, expired, so delete it
						$self->log_debug(3, "Record has expired (".$metadata->{_Attribs}->{Expires}."), deleting: $storage_key");
						
						if (!$self->{storage}->delete_record( $storage_key )) {
							$self->log_debug(1, "Failed to delete record: $storage_key: " . $self->{storage}->{error});
						}
					}
					else {
						$self->log_debug(3, "Record is not expired (".($metadata->{_Attribs}->{Expires} || 'infinite')."), skipping: $storage_key");
						
						if ($metadata->{_Attribs}->{Expires}) {
							# write stub to logfile that will be picked up by cleanup system
							my $expire_epoch = $metadata->{_Attribs}->{Expires};
							if ($expire_epoch - $now < 86400) { $expire_epoch += 86400; } # expires later today
							
							($sec,$min,$hour,$mday,$mon,$year,$wday,$yday,$isdst) = localtime( $expire_epoch );
							my $new_cleanup_file = $self->{config}->{StorageConfig}->{CleanupBaseDir} . '/' . 
								sprintf("%0004d/%02d/%02d", $year + 1900, $mon + 1, $mday) . '/cleanup.log';
							
							if ($new_cleanup_file ne $cleanup_file) {
								# prevent infinite loop
								make_dirs_for($new_cleanup_file);

								my $fh = new FileHandle ">>$new_cleanup_file";
								if ($fh) {
									$fh->print( "$storage_key\n" );
									$fh->close();
								}
								else {
									$self->log_debug(1, "Could not open cleanup file for writing: $new_cleanup_file: $!, storage key will not be cleaned up: $storage_key");
								}
							} # not the same file we are working on
						} # record has expiration
					} # not expired yet
					
					# clear storage cache
					$self->{storage}->{cache} = {};
				}
				else {
					$self->log_debug(3, "Record not found, skipping: $storage_key");
				}
			} # got storage key
			
		} # foreach line in file
		
		$fh->close();
		unlink( $temp_cleanup_file );
	} # found cleanup file
	
	$self->perf_end('storage_cleanup');
	$self->log_debug(2, "Storage cleanup complete");
	return 1;
}

sub log_archive {
	##
	# Archive logs to daily gzip files
	##
	my $self = shift;
	$self->log_debug(2, "Archiving logs to " . $config->{Paths}->{LogBackupDir});
	$self->perf_begin('log_archive');

	my $base_log_dir = $config->{Paths}->{LogDir};
	my @files = `/usr/bin/find $base_log_dir -name "*.log"`;
	
	my $alerts = {};

	foreach my $file (@files) {
		chomp $file;
		my $filename = basename $file;
		next if $filename =~ /^\./; # skip resource forks (thanks apple)

		my $filename_strip = $filename;
		$filename_strip =~ s/\.\w+$//;
		
		my $scan_for_alerts = 0;
		if ($filename_strip =~ /^(debug|imageservice|maint)$/) { $scan_for_alerts = 1; }

		my $temp_file = $file . ".$$.tmp";
		if (!rename($file, $temp_file)) {
			$self->log_debug(1, "Failed to rename log file: $file: $!");
			unlink $temp_file;
			next;
		}
		
		my $source_fh = new FileHandle "<$temp_file";
		$self->log_debug(4, "Archiving log: $temp_file" );
		
		my $out_fh = 0;
		my $out_file = '';
		my $lines_written = 0;
		
		while (my $line = <$source_fh>) {
			my $timestamp = 0;
			
			if ($line =~ /^\[(\d+(\.\d+)?)\]/) {
				$timestamp = $1;
				my ($sec,$min,$hour,$mday,$mon,$year,$wday,$yday,$isdst) = localtime( $timestamp );
				$year += 1900;
				$mon++;
				if ($mon < 10) { $mon = '0' . $mon; }
				if ($mday < 10) { $mday = '0' . $mday; }
				if ($hour < 10) { $hour = '0' . $hour; }
				
				my $dest_file = $config->{Paths}->{LogBackupDir} . '/' . $filename_strip . '/' . $year . '/' . $mon . '/' . $mday . '/' . $hour . '.gz';
				if ($dest_file ne $out_file) {
					if ($out_fh) { 
						$self->log_debug(5, "Closing archive: $out_file ($lines_written lines written)");
						$out_fh->close(); 
					}
					
					$self->log_debug(5, "Opening archive: $dest_file");
					$out_file = $dest_file;
					make_dirs_for($out_file);
					$out_fh = new FileHandle "|".$gzip_bin." >> $out_file";
					if (!$out_fh) {
						$self->log_debug(1, "Failed to open log archive for writing: $out_file: $!");
						return;
					}
					$lines_written = 0;
				} # need new file fh
			} # got timestamp from line
			
			if ($out_fh) {
				$out_fh->print( $line );
				$lines_written++;
			}
			
			if ($scan_for_alerts && $timestamp) {
				chomp $line;
				my @columns = split(/\]\[/, substr($line, 1, length($line)-1));
				if ((scalar @columns) && ($columns[-1] =~ s/\]\s*(.+)$//)) { push @columns, trim($1); }
				if (($columns[7] eq '1') && ($columns[2] eq $hostname)) {
					$alerts->{$filename_strip} ||= [];
					push @{$alerts->{$filename_strip}}, $line;
				}
			}
			
		} # foreach line in source file
		
		if ($out_fh) { 
			$self->log_debug(4, "Closing archive: $out_file ($lines_written lines written)");
			$out_fh->close(); 
		}
		
		undef $source_fh;
		
		$self->log_debug(5, "Log archival complete for: $temp_file");
		$self->perf_count('c_logs', 1);
		unlink $temp_file;
	} # foreach log file
	
	$self->perf_end('log_archive');
	$self->log_debug(2, "All logs archived");
	
	if (scalar keys %$alerts) {
		$self->log_debug(2, "Sending alert e-mail for level 1 events");
		my $body = '';
		$body .= "EffectGames.com Level 1 Alerts\n";
		$body .= "Hostname: " . $hostname . "\n";
	
		foreach my $key (sort keys %$alerts) {
			my $rows = $alerts->{$key};
			$body .= "\nLog Category: $key\n";
			foreach my $line (@$rows) { $body .= "$line\n"; }
		}
	
		$body .= "\n\n" . $self->{config}->{Emails}->{Signature} . "\n";
	
		$self->send_email(
			From     => $self->{config}->{Emails}->{From},
			To       => $self->{config}->{ContactEmail},
			Subject  => "EffectGames.com Level 1 Alerts: $hostname",
			Data     => $body
		);
	} # alerts
	
	return 1;
}

sub nslookup_csv {
	##
	# Call nslookup() on a series of IP addresses, comma-separated
	##
	my $csv = shift;
	$csv =~ s/(\d+\.\d+\.\d+\.\d+)/ nslookup($1); /eg;
	return $csv;
}

sub send_email {
	##
	# Proxy mail to a host that can deal, or send locally if we can
	##
	my $self = shift;
	my $args = {@_};
	
	$self->log_debug(4, "Sending mail locally");
	if (!$args->{Data} && $args->{Body}) {
		$args->{Data} = $args->{Body};
		delete $args->{Body};
	}
	my $msg = MIME::Lite->new( %$args );
	if (!$msg->send()) {
		$self->log_debug(2, "Failed to send local mail: $!");
		return 0;
	}
	
	$self->log_debug(4, "Mail send successful");
	return 1;
}

1;
