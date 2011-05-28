package Effect::ImageService::Plugin::TwitterGlog;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

use strict;
use XML::API::Tools;
use Net::Twitter::Lite;
use Effect::ImageService::Plugin;

our @ISA = ("Effect::ImageService::Plugin");

sub handler {
	##
	# Sycnhronize last game log event to twitter account
	#	GameID => game id
	##
	my $self = shift;
	my $game_id = $self->{GameID};
	
	my $game = $self->{storage}->get_metadata( "/games/$game_id" );
	if (!$game) { die "Could not load game: $game_id"; }
	
	my $list_path = "/games/$game_id/log";
	
	my $items = $self->{storage}->list_get( $list_path, 0, 1 );
	if (!$items) { die "Could not load game log: $game_id"; }
	my $log_entry = $items->[0];
	
	# Patterns to compress:
	# Deleted asset:
	# Copied asset 
	# Uploaded asset:
	
	if ($log_entry->{Message} =~ /^(Deleted|Copied|Uploaded|Transferred)\s+asset\b/) {
		my $action = $1;
		my $count = 0;
		$items = $self->{storage}->list_get( $list_path, 0, 100 );
		foreach my $item (@$items) {
			if ($item->{Message} !~ /^$action\s+asset\b/) { last; }
			$count++;
		}
		if ($count > 1) { $log_entry->{Message} = $action . " $count assets"; }
	} # repeating pattern
	
	my $msg .= '#' . $game_id . ": " . $log_entry->{Username} . ": " . $log_entry->{Message};
	
	$self->log_debug(5, "Posting message to twitter \@" . $game->{TwitterUsername} . ": $msg");
	
	my $twitter = undef;
	eval {
		$twitter = Net::Twitter::Lite->new(
			username => $game->{TwitterUsername},
			password => $game->{TwitterPassword},
			source => ''
		);
	};
	if ($@) {
		$self->log_debug(2, "Failed to update twitter for $game_id: $@");
		return;
	}
	
	eval { $twitter->update($msg); };
	if ($@) {
		$self->log_debug(2, "Failed to update twitter for $game_id: $@");
	}
	else {
		$self->log_debug(5, "Successfully posted to twitter." );
	}
}

1;
