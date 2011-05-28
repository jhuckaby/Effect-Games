package XML::API::Perf;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

##
# Performance tracking class for Effect
##

use strict;
use Time::HiRes qw/time/;

sub perf_begin {
	##
	# Mark start time for performance tracking
	##
	my $self = shift;
	my $id = shift || 't';

	$self->{perf} ||= {};
	$self->{perf}->{$id} ||= { elapsed => 0 };
	$self->{perf}->{$id}->{start} = time();
}

sub perf_count {
	##
	# Simple counter
	##
	my $self = shift;
	my $id = shift;
	my $amount = shift || 1;
	if (!$id) { return 0; }

	$self->{perf} ||= {};
	$self->{perf}->{$id} ||= { start => 1, end => 1, elapsed => 0 };
	$self->{perf}->{$id}->{elapsed} += $amount;
}

sub perf_end {
	##
	# Mark end time and advance elapsed for performance tracking
	##
	my $self = shift;
	my $id = shift || 't';
	
	$self->{perf} ||= {};
	$self->{perf}->{$id}->{end} = time();
	my $elapsed = $self->{perf}->{$id}->{end} - $self->{perf}->{$id}->{start};

	##
	# Make sure elapsed is not one of those e-numbers,
	# and is non-negative
	##
	if ($elapsed !~ /^\d+(\.\d+)?$/) { $elapsed = 0; }
	if ($elapsed < 0) { $elapsed = 0; }

	$self->{perf}->{$id}->{elapsed} += $elapsed;
}

sub perf_summarize {
	##
	# Summarize all performance numbers for logging purposes
	##
	my $self = shift;
	my $summary = '';
	
	$self->{perf} ||= {};
	foreach my $key (sort keys %{$self->{perf}}) {
		if (!$self->{perf}->{$key}->{end}) { $self->perf_end($key); }

		if ($summary) { $summary .= ';'; }
		my $value = $self->{perf}->{$key}->{elapsed};
		$value =~ s/^(\-?\d+\.[0]*\d{3}).*$/$1/; # limit to millisec
		$summary .= $key . '=' . $value;
	}

	return $summary;
}

sub perf_reset {
	##
	# Clear all perf counters
	##
	my $self = shift;
	$self->{perf} = {};
}

sub perf_get {
	##
	# Get named perf object
	##
	my $self = shift;
	my $id = shift || undef;
	
	if ($id) { return $self->{perf}->{$id} || undef; }
	return $self->{perf};
}

1;
