package XML::API::Log;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

##
# Logger class for Effect
##

use strict;
use FileHandle;
use Time::HiRes qw/time/;

sub log_debug {
	##
	# Log debug message if level is low enough
	##
	my ($self, $level, $msg) = @_;
	
	if ($level <= $self->{config}->{DebugLevel}) {
		my ($calling_package, undef, undef) = caller();
		$self->log_print(
			category => 'debug',
			code => $level,
			msg => $msg,
			client_info => '',
			'package' => $calling_package
		);
		
		if (($level == 1) && ($self->{config}->{Growl})) {
			my $fh = FileHandle->new( "|" . $self->{config}->{Growl} );
			if ($fh) {
				$fh->print( "$msg\n" );
				$fh->close();
			}
		}
	}
}

sub log_print {
	##
	# Print to event log
	##
	my $self = shift;
	my $args = {@_};
	
	return unless $self->{config}->{Paths}->{LogFile};
	
	##
	# Get the three versions of time: hi-res epoch, epoch and formatted.
	##
	$args->{hires_epoch} ||= sprintf("%.00005f", time());
	$args->{epoch} ||= int($args->{hires_epoch});
	my ($sec, $min, $hour, $mday, $mon, $year, $wday, $yday, $isdst) = localtime($args->{epoch});
	
	##
	# Insert date elements into self for auto-insertion into placeholders.
	# Pad with zeros where appropriate.
	##
	$args->{mm} ||= sprintf("%02d", $mon + 1);
	$args->{dd} ||= sprintf("%02d", $mday);
	$args->{yyyy} ||= sprintf("%0004d", $year + 1900);
	$args->{hh} ||= sprintf("%02d", $hour);
	$args->{mi} ||= sprintf("%02d", $min);
	$args->{ss} ||= sprintf("%02d", $sec);
	
	##
	# Get name of calling package and PID for possible insertion into template
	##
	my ($calling_package, undef, undef) = caller();
	$args->{'package'} ||= $calling_package;
	$args->{'pid'} ||= $$;
	
	##
	# Insert args into log_args.
	##
	foreach my $key (keys %{$args}) {
		$self->{log_args}->{$key} = $args->{$key};
	} # foreach arg
	
	##
	# Grab copy of logfile line template, and fill with data.
	##
	my $fmt_msg = $self->{config}->{LogTemplate};
	$fmt_msg =~ s/(\w+)/ defined($self->{log_args}->{$1}) ? $self->{log_args}->{$1} : ''; /eg;
	
	##
	# Write to log
	##
	my $file = $self->{config}->{Paths}->{LogFile};
	$file =~ s/\[(\w+)\]/ defined($self->{log_args}->{$1}) ? $self->{log_args}->{$1} : ''; /eg;
	
	my $fh = new FileHandle ">>" . $file;
	if ($fh) {
		$fh->print( "$fmt_msg\n" );
		$fh->close();
	}
	
	if ($self->{config}->{EchoLog}) { warn "$fmt_msg\n"; }
}

1;
