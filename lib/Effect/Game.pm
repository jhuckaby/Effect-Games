package Effect::Game;

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
use XML::Lite;
use XML::API::Tools;
use Doxter;
use HTTP::Date;
use Digest::MD5 qw/md5_hex/;

sub get_game_member_profile {
	##
	# Get game member profile for specified user
	##
	my ($self, $game_id, $username) = @_;
	
	$username ||= $self->{session}->{db}->{username};
	my $member_profile = $self->{storage}->list_find( "/games/$game_id/users", { Username => $username } );
	return $member_profile;
}

sub require_game_member {
	##
	# Determine if user is member of game
	##
	my ($self, $game_id, $readonly) = @_;
	
	# first check session cache, which is really fast
	if ($self->{session}->{db}->{games} && $self->{session}->{db}->{games}->{$game_id}) {
		return 1;
	}
	
	# nope, so we have to check the "slow way"
	# this can happen if the api_game_get is cached, but this is a new session
	my $member_profile = $self->get_game_member_profile($game_id);
	
	if (!$member_profile) {
		if (!$readonly) {
			my $game = $self->{storage}->get_metadata( "/games/$game_id" );
			if ($game && ($game->{Access} eq 'Public')) { return $self->api_error( 'game', "You cannot make changes to this game until you become a member.  Please contact the game owner." ); }
			else { return $self->api_error('access', "You do not have access to this game."); }
		}
		else { return 0; }
	}
	
	# put temp access into session, so we don't have to keep loading the game and searching the lists
	$self->{session}->{db}->{games} ||= {};
	$self->{session}->{db}->{games}->{$game_id} = $member_profile->{Admin} ? 'admin' : 1;
	$self->session_mark();
	
	return 1;
}

sub require_game_read_access {
	##
	# Determine if user has read access to game
	# (Game must be public, or user must be a member)
	##
	my ($self, $game_id, $readonly) = @_;
	
	# first check session cache, which is really fast
	if ($self->{session}->{db}->{games} && $self->{session}->{db}->{games}->{$game_id}) {
		return 1;
	}
	
	# admins have read access to all games, regardless
	if ($self->is_admin()) {
		return 1;
	}
	
	# if game is public, return 1 now
	my $game = $self->{storage}->get_metadata( "/games/$game_id" );
	if ($game && ($game->{Access} eq 'Public')) { return 1; }
	
	# at this point, user must be a member to continue
	return $self->require_game_member($game_id, $readonly);
}

sub is_game_admin {
	##
	# Determine if user is game admin, quickly as possible
	##
	my ($self, $game_id) = @_;
	
	# super admins are admins of all games, implicitly
	if ($self->is_admin()) { return 1; }
	
	# first check session cache, which is really fast
	if ($self->{session}->{db}->{games} && $self->{session}->{db}->{games}->{$game_id} && ($self->{session}->{db}->{games}->{$game_id} eq 'admin')) {
		return 1;
	}
	
	# nope, so we have to check the slow way
	my $member_profile = $self->get_game_member_profile($game_id);
	if (!$member_profile || !$member_profile->{Admin}) { return 0; }
	
	# at this point we know the user is a game admin...
	# put temp access into session, so we don't have to keep loading the game and searching the lists
	$self->{session}->{db}->{games} ||= {};
	$self->{session}->{db}->{games}->{$game_id} = 'admin';
	$self->session_mark();
	
	return 1;
}

sub get_game_settings {
	##
	# Get custom user-specified game config settings
	##
	my $self = shift;
	my $game_id = shift;
	my $rev_id = shift || undef;
	my $storage_key = '';
	my $settings = {};
	
	if ($rev_id) {
		$storage_key = '/games/' . $game_id . '/revisions/' . $rev_id . '/assets/text';
	}
	else {
		$storage_key = '/games/' . $game_id . '/assets/text';
	}
	
	my $full_path = $self->{storage}->get_file_path( $storage_key, 'game.xml' );
	if (-e $full_path) {
		$settings = parse_xml( $full_path );
		if (!ref($settings)) {
			$self->log_debug(2, "Error parsing game settings: $storage_key: $settings");
			$settings = {};
		}
	}
	
	return $settings;
}

sub api_game_get {
	##
	# Load game XML for viewing or editing
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	
	return unless $self->validate_session();
	
	my $username = $self->{session}->{db}->{username};
	my $game_id = $query->{id};
	my $path = '/games/' . $game_id;
	my $game = $self->{storage}->get_metadata( $path );
	if (!$game) { return $self->api_error('game', "Game not found: $game_id"); }
	
	my $member_profile = $self->get_game_member_profile($game_id, $username);
	my $is_member = !!$member_profile;
	
	if (($game->{Access} =~ /private/i) && !$is_member && !$self->is_admin() && 
		!$self->{storage}->list_find( "/games/$game_id/invites", { Username => $username } )) {
			
		return $self->api_error('access', "You do not have access to this game.");
	}
	
	# put temp access into session, so we don't have to keep loading the game and searching the lists
	if ($is_member) {
		$self->{session}->{db}->{games} ||= {};
		$self->{session}->{db}->{games}->{$game_id} = $member_profile->{Admin} ? 'admin' : 1;
		$self->session_mark();
	}
	
	$response->{Game} = { %$game };
	delete $response->{Game}->{TwitterPassword};
	
	if ($query->{stats}) {
		$response->{Stats} = $self->{storage}->get_metadata( $path . '/stats' );
	}
	
	if ($query->{users}) {
		$response->{Users} = { User => $self->{storage}->list_get( $path . '/users', 0 ) || [] };
	}
	
	if ($query->{invites}) {
		$response->{Invites} = { Invite => $self->{storage}->list_get( $path . '/invites', 0 ) || [] };
	}
	
	$self->set_response(0, "Success");
	$self->set_ttl( 'ViewTTL' );
	$self->session_unmark();
}

sub api_get_user_games {
	##
	# Return info about all user's games
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	
	return unless $self->validate_session();
	
	my $username = $self->{session}->{db}->{username};
	
	$query->{limit} ||= 1;
	$query->{offset} ||= 0;
	
	my $items = $self->{storage}->list_get( "/users/$username/games", $query->{offset}, $query->{limit} );
	$items ||= [];
	my $rows = [];
	
	foreach my $item (@$items) {
		my $path = '/games/' . $item->{GameID};
		my $metadata = $self->{storage}->get_metadata( $path );
		if ($metadata) {
			push @$rows, $metadata;
		}
	}
	
	$response->{Rows} = { Row => $rows };
	$self->set_response(0, "Search successful");
	# $self->set_ttl( 'ViewTTL' );
	$self->header_out('Cache-Control', 'no-cache'); # temporary, until we can get the username on the query string, or Vary: Cookie
	$self->session_unmark();
}

sub api_game_create {
	##
	# Create new game
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => '^[a-z0-9][a-z0-9\-]*[a-z0-9]$',
		'/Title' => '.+',
		'/Description' => '.*',
		'/Logo' => '.*',
		'/Genre' => '.*',
		'/Access' => '^(Public|Private)$',
		'/State' => '.+',
		'/PortWidth' => '^\d+$',
		'/PortHeight' => '^\d+$'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_path = '/games/' . $xml->{GameID};
	
	return unless $self->check_privilege('/create_games');
	
	# get info about user (pro status)
	my $user = $self->get_user( $username );
	if (!$user) {
		return $self->api_error('game', "User not found: $username");
	}
	
	# make sure isn't abusing this
	my $user_game_info = $self->{storage}->list_get_info( "/users/$username/games" );
	if ($user_game_info && ($user_game_info->{length} >= ($user->{MaxGames} || 5))) {
		return $self->api_error( 'game', "You have reached the maximum allowed number of games.  Please contact us to ask for permission to create more." );
	}
	
	# make sure ID isn't already taken
	if ($self->{storage}->check_record_exists($game_path)) {
		return $self->api_error( 'game', "That Game ID is alredy taken.  Please choose another." );
	}
	
	# make user the owner
	$xml->{Owner} = $username;
	
	# doxterify the description
	if ($xml->{Description}) {
		my $doxter = new Doxter(
			debug => 0,
			section_numbers => 0
		);
		my $response = $doxter->format_text( $xml->{Description} );
		$xml->{DescriptionHTML} = $response->{html};
	}
	else {
		$xml->{DescriptionHTML} = '';
	}
	
	# create game record
	$self->log_debug(5, "Creating game storage record");
	if (!$self->{storage}->create_record( $game_path, $xml )) {
		return $self->api_error( 'storage', 'Failed to create game: ' . $self->{storage}->{error} );
	}
	
	# create stats record
	return unless $self->lock_create_record( "$game_path/stats", {
		Users => 0,
		Files => 0,
		Objects => 0,
		Levels => 0,
		Publishes => 0,
		Quota => (1024 * 1024 * 1024),
		AssetMod => time()
	} );
	
	# create initial asset folder tree
	return unless $self->lock_create_record( "$game_path/asset_folders", {
		FolderList => {
			images => {
				sprites => '',
				tiles => '',
				backgrounds => ''
			},
			audio => {
				effects => '',
				music => ''
			},
			text => '',
			fonts => '',
			video => '',
			src => ''
		},
		LastUpdate => time()
	} );
	
	# default keys
	return unless $self->lock_list_push( "$game_path/keys", 
		{ Name => 'left', Title => 'Move Left', Codes => '65, 37' }, # left arrow or A
		{ Name => 'right', Title => 'Move Right', Codes => '68, 39' }, # right arrow or D
		{ Name => 'up', Title => 'Move Up', Codes => '87, 38' }, # up arrow or W
		{ Name => 'down', Title => 'Move Down', Codes => '83, 40' }, # down arrow or S
		{ Name => 'shoot', Title => 'Shoot', Codes => '90, 188' }, # Z or comma
		{ Name => 'jump', Title => 'Jump', Codes => '88, 32' }, # X or space
		{ Name => 'select', Title => 'Select', Codes => '9' }, # tab
		{ Name => 'start', Title => 'Start / Pause', Codes => '13, 27' } # enter, esc
	);
	
	# start game log
	return unless $self->game_log_msg($xml->{GameID}, "Created game", 'game');
	
	# add user to game, as an admin of course
	return unless $self->game_add_user($xml->{GameID}, $username, { Admin => 1 });
	
	# add game to master list
	return unless $self->lock_list_unshift( "/admin/master_game_list", { GameID => $xml->{GameID} } );
	
	$self->user_log_msg( "Created game" );
	$self->user_update_stats( Games => '+1' );
	
	$self->log_transaction( 'game_create', { game_id => $xml->{GameID} } );
	
	$self->set_response(0, "Success");
}

sub game_add_user {
	##
	# Add user to game
	##
	my ($self, $game_id, $username, $member_profile) = @_;
	if (!$member_profile) { $member_profile = {}; }
	
	my $game_path = '/games/' . $game_id;
	my $game_users_path = "/games/$game_id/users";
	my $user_games_path = "/users/$username/games";
	
	# load game metadata to get title (should be already cached in RAM at this point)
	my $game = $self->{storage}->get_metadata( $game_path );
	if (!$game) {
		$self->api_error( 'game', "Game not found: $game_id" );
		return undef;
	}
	
	if (!$self->{storage}->list_find( $game_users_path, { Username => $username } )) {
		return undef unless $self->lock_list_unshift( $game_users_path, { Username => $username, %$member_profile } );
	}
	
	if (!$self->{storage}->list_find( $user_games_path, { GameID => $game_id } )) {
		return undef unless $self->lock_list_unshift( $user_games_path, { GameID => $game_id } );
	}
	
	my $user_path = "/users/$username";
	
	$self->{storage}->lock_record( $user_path, 1 ); # exclusive
	
	my $user = $self->get_user($username);
	if (!$user) {
		$self->{storage}->unlock_record( $user_path );
		$self->api_error( 'user', "User not found: $username" );
		return undef;
	}
	
	xpath_set_simple( '/Privileges/article_post_categories/games/' . $game_id, $user, $game->{Title} );
	
	if (!$self->{storage}->store_metadata( $user_path, $user )) {
		return $self->api_error('game', "Could not update user: $username: " . $self->{storage}->{error} );
	}
	
	$self->{storage}->unlock_record( $user_path );
	
	$self->log_transaction( 'user_update', $username );
	
	return undef unless $self->game_log_msg($game_id, "Added member to game: $username", 'member');
	
	return undef unless $self->game_update_stats( $game_id, Users => "+1" );
	
	return 1;
}

sub game_update_stats {
	##
	# Update one or more user stats
	##
	my $self = shift;
	my $game_id = shift;
	my $stats = {@_};
	
	my $game_path = '/games/' . $game_id;
	
	return $self->lock_update_record( "$game_path/stats", $stats, 1 );
}

sub game_log_msg {
	##
	# Log message to game activity log
	##
	my $self = shift;
	my $game_id = shift;
	my $msg = shift;
	my $type = shift || '';
	
	my $username = $self->{session}->{db}->{username};
	if (!$username) {
		return $self->api_error('game', "Could not determine username for game log");
	}
	
	$self->log_debug(5, "Adding entry to game log: $game_id: $type: $msg");
	
	my $row = {
		Username => $username,
		Date => time(),
		IP => get_remote_ip(),
		UserAgent => get_user_agent(),
		Message => $msg,
		Type => $type
	};
	
	my $result = $self->lock_list_unshift( "/games/$game_id/log", $row );
	if (!$result) { return $result; }
	
	# if twitter sync is enabled, enqueue request now
	my $game = $self->{storage}->get_metadata( "/games/$game_id" );
	if ($game && $game->{TwitterUsername} && $game->{TwitterPassword}) {
		save_file( $self->{config}->{Paths}->{QueueDir} . '/twiter_glog_' . $game_id . '.xml', compose_xml( {
			Transform => [
				{ _Attribs => { Name => 'TwitterGlog' }, 
					GameID => $game_id 
				}
			]
		}, 'EffectQueueRequest' ) );
	}
	
	return $row;
}

sub api_game_update_member_profile {
	##
	# Update member profile for game (admin only)
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => '^[a-z0-9][a-z0-9\-]*[a-z0-9]$',
		'/Username' => '^\w+$'
	);
	
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	my $game_path = '/games/' . $xml->{GameID};
	my $member_id = $xml->{Username};
	
	# make sure game exists
	if (!$self->{storage}->check_record_exists($game_path)) {
		return $self->api_error( 'game', "Game not found: " . $xml->{GameID} );
	}
	
	# must be admin to do this
	if (!$self->is_game_admin($game_id)) {
		$self->{storage}->unlock_record( $game_path );
		return $self->api_error( 'game', "Only administrators may update member info." );
	}
	
	delete $xml->{GameID};
	delete $xml->{Username};
	
	# update member profile
	my $list_path = $game_path . '/users';
	return unless $self->lock_find_update_list_item( $list_path, { Username => $member_id }, $xml );
	
	return unless $self->game_log_msg($game_id, "Updated member profile: $member_id", 'member');
	$self->log_transaction( 'game_update_member_profile', { game_id => $game_id, member_id => $member_id } );
	
	$self->set_response(0, "Update successful");
}

sub api_game_delete_member {
	##
	# Remove member from game
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => '^[a-z0-9][a-z0-9\-]*[a-z0-9]$',
		'/Username' => '^\w+$'
	);
	
	return unless $self->validate_session();
	
	my $response = $self->{session}->{response};
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	my $game_path = '/games/' . $xml->{GameID};
	my $member_id = $xml->{Username};
	my $list_path = $game_path . '/users';
	
	# make sure game exists
	if (!$self->{storage}->check_record_exists($game_path)) {
		return $self->api_error( 'game', "Game not found: " . $xml->{GameID} );
	}
	
	# must be admin to do this
	if (!$self->is_game_admin($game_id) && ($username ne $member_id)) {
		return $self->api_error( 'game', "Only administrators may remove members from the game." );
	}
	
	# make sure user is not owner
	my $game = $self->{storage}->get_metadata( $game_path );
	if (!$game) {
		$self->api_error( 'game', "Game not found: $game_id" );
		return undef;
	}
	if ($member_id eq $game->{Owner}) {
		return $self->api_error( 'game', "The game owner cannot be removed from the game.  Please transfer ownership to another user." );
	}
	
	# make sure we are not the last member
	my $list_info = $self->{storage}->list_get_info( $list_path );
	if (!$list_info) {
		return $self->api_error( 'game', "Could not load game member list: $list_path");
	}
	if ($list_info->{length} == 1) {
		return $self->api_error( 'game', "You cannot remove the last member from the game.  Each game must have at least one member." );
	}
	
	# delete member profile from game
	return unless $self->lock_find_delete_list_item( $list_path, { Username => $member_id } );
	
	# also remove game from user's own game list
	return unless $self->lock_find_delete_list_item( '/users/' . $member_id . '/games', { GameID => $game_id } );
	
	return unless $self->game_log_msg($game_id, "Removed member $member_id from game", 'member');
	$self->log_transaction( 'game_delete_member', { game_id => $game_id, member_id => $member_id } );
	
	$self->set_response(0, "Delete successful");
}

sub api_game_delete_invite {
	##
	# Remove invitation from game
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => '^[a-z0-9][a-z0-9\-]*[a-z0-9]$',
		'/Username' => '^\w+$'
	);
	
	return unless $self->validate_session();
	
	my $response = $self->{session}->{response};
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	my $game_path = '/games/' . $xml->{GameID};
	my $member_id = $xml->{Username};
	
	# make sure game exists
	if (!$self->{storage}->check_record_exists($game_path)) {
		return $self->api_error( 'game', "Game not found: " . $xml->{GameID} );
	}
	
	# must be admin to do this
	if (!$self->is_game_admin($game_id)) {
		$self->{storage}->unlock_record( $game_path );
		return $self->api_error( 'game', "Only administrators may manage invitations." );
	}
	
	# delete invite stub
	my $list_path = $game_path . '/invites';
	return unless $self->lock_find_delete_list_item( $list_path, { Username => $member_id } );
	
	return unless $self->game_log_msg($game_id, "Removed invitation for user: $member_id", 'member');
	$self->log_transaction( 'game_delete_invite', { game_id => $game_id, member_id => $member_id } );
	
	$self->set_response(0, "Delete successful");
}

sub api_game_change_owner {
	##
	# Change game ownership
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => '^[a-z0-9][a-z0-9\-]*[a-z0-9]$',
		'/NewOwner' => '^\w+$'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $game_id = $xml->{GameID};
	my $game_path = '/games/' . $xml->{GameID};
	my $new_owner = $xml->{NewOwner};
	
	# make sure game exists
	if (!$self->{storage}->check_record_exists($game_path)) {
		return $self->api_error( 'game', "Game not found: " . $xml->{GameID} );
	}	
	
	# get info about new owner
	my $user = $self->get_user( $new_owner );
	if (!$user) {
		return $self->api_error('game', "User not found: $new_owner");
	}
	
	# make sure new owner is a member of the game
	my $member_profile = $self->get_game_member_profile( $game_id, $new_owner );
	if (!$member_profile) {
		return $self->api_error('game', "New owner is not a member of the game: $new_owner" );
	}
	
	# lock the game and open it for editing
	$self->{storage}->lock_record( $game_path, 1 ); # exclusive
	
	my $game = $self->{storage}->get_metadata( $game_path );
	if (!$game) {
		$self->{storage}->unlock_record( $game_path );
		return $self->api_error( 'game', "Game not found: " . $xml->{GameID} );
	}
	
	# make sure current user is the current owner
	if ($username ne $game->{Owner}) {
		$self->{storage}->unlock_record( $game_path );
		return $self->api_error( 'game', "Only the game owner may transfer ownership to another user." );
	}
	
	# transfer owner, and pro status
	$game->{Owner} = $new_owner;
	
	# write game back to disk
	if (!$self->{storage}->store_metadata( $game_path, $game )) {
		return $self->api_error('game', "Could not update game: $game_path: " . $self->{storage}->{error} );
	}
	
	$self->{storage}->unlock_record( $game_path );
	
	# make sure new owner is an admin of the game
	if (!$member_profile->{Admin}) {
		my $list_path = $game_path . '/users';
		return unless $self->lock_find_update_list_item( $list_path, { Username => $new_owner }, { Admin => 1 } );
	
		return unless $self->game_log_msg($game_id, "Updated $new_owner user profile", 'member');
		$self->log_transaction( 'game_update_member_profile', { game_id => $game_id, member_id => $new_owner } );
	}
	
	$self->log_transaction( 'game_change_owner', { game => $game_id, old_owner => $username, new_owner => $new_owner } );
	
	return unless $self->game_log_msg($xml->{GameID}, "Changed game owner to: $new_owner", 'member');
	
	$self->{session}->{response}->{Game} = $game;
	$self->set_response(0, "Success");
}

sub api_game_update {
	##
	# Update existing game
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
	
	# make sure game exists
	if (!$self->{storage}->check_record_exists($game_path)) {
		return $self->api_error( 'game', "Game not found: " . $xml->{GameID} );
	}
	
	return unless $self->require_game_member( $game_id );
	
	$self->{storage}->lock_record( $game_path, 1 ); # exclusive
	
	my $game = $self->{storage}->get_metadata( $game_path );
	if (!$game) {
		$self->{storage}->unlock_record( $game_path );
		return $self->api_error( 'game', "Game not found: " . $xml->{GameID} );
	}
	
	# make sure user is admin
	# if (!$self->is_game_admin($game_id)) {
	# 	$self->{storage}->unlock_record( $game_path );
	# 	return $self->api_error( 'game', "Only administrators may update the game data." );
	# }
	
	# certain things cannot be updated directly
	delete $xml->{Owner};
	
	# doxterify the description
	if (defined($xml->{Description})) {
		if ($xml->{Description}) {
			my $doxter = new Doxter(
				debug => 0,
				section_numbers => 0
			);
			my $response = $doxter->format_text( $xml->{Description} );
			$xml->{DescriptionHTML} = $response->{html};
		}
		else {
			$xml->{DescriptionHTML} = '';
		}
	}
	
	# remove twitter password if omitted (to preserve existing)
	if (!$xml->{TwitterPassword}) { delete $xml->{TwitterPassword}; }
	
	# copy xml to game rec
	foreach my $key (keys %$xml) { $game->{$key} = $xml->{$key}; }
	
	if (!$self->{storage}->store_metadata( $game_path, $game )) {
		return $self->api_error('game', "Could not update game: $game_path: " . $self->{storage}->{error} );
	}
	
	$self->{storage}->unlock_record( $game_path );
	
	$self->log_transaction( 'game_update', { game_id => $xml->{GameID} } );
	
	return unless $self->game_log_msg($xml->{GameID}, "Updated game info", 'game');
	
	$self->{session}->{response}->{Game} = $game;
	$self->set_response(0, "Success");
}

sub api_game_delete {
	##
	# Permanently delete game
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => '^[a-z0-9][a-z0-9\-]*[a-z0-9]$'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	
	my $game_id = $xml->{GameID};
	my $game_path = '/games/' . $game_id;
	
	# make sure game exists
	my $game = $self->{storage}->get_metadata( $game_path );
	if (!$game) {
		return $self->api_error( 'game', "Game not found: $game_id" );
	}
	
	# make sure user is admin
	# if (!$self->is_game_admin($game_id)) {
	# 	return $self->api_error( 'game', "Only administrators may delete the game." );
	# }
	if ($username ne $game->{Owner}) {
		return $self->api_error( 'game', "Only the game owner may delete the game." );
	}
	
	my $game_users_path = "/games/$game_id/users";
	my $game_users = $self->{storage}->list_get( $game_users_path, 0 );
	if ($game_users) {
		foreach my $game_user (@$game_users) {
			my $user_games_path = "/users/" . $game_user->{Username} . "/games";
			return unless $self->lock_find_delete_list_item( $user_games_path, { GameID => $game_id } );
			
			# remove article post privs for game area
			my $user = $self->get_user( $game_user->{Username} );
			if ($user && $user->{Privileges}->{article_post_categories}->{games}->{ $game_id }) {
				delete $user->{Privileges}->{article_post_categories}->{games}->{ $game_id };
				$self->{storage}->mark('users/'.$game_user->{Username});
				$self->{storage}->commit();
			}
		} # foreach game user
	} # game has users
	
	if (!$self->{storage}->list_delete( $game_users_path )) {
		return $self->api_error('game', "Could not delete game users list: $game_users_path: " . $self->{storage}->{error} );
	}
	
	# revisions
	my $base_paths = [];
	my $revs = $self->{storage}->list_get( "$game_path/revs" );
	if ($revs) {
		foreach my $rev (@$revs) {
			push @$base_paths, "$game_path/revisions/" . $rev->{Name};
		} # foreach rev
	} # revs
	
	foreach my $base_path (@$base_paths, $game_path) {
		$self->log_debug(4, "Deleting revision path: $base_path");
		
		# assets
		my $folder_data = $self->{storage}->get_metadata( $base_path . '/asset_folders' );
		if ($folder_data && $folder_data->{FolderList}) {
			my $folder_paths = xpath_summary( $folder_data->{FolderList}, '/', 'inc_refs' );
			$folder_paths->{'/'} = 1;
			foreach my $subpath (sort keys %$folder_paths) {
				if ($self->{storage}->check_record_exists( $base_path . '/assets' . $subpath )) {
					$self->{storage}->delete_record( $base_path . '/assets' . $subpath );
				} # folder exists
			} # foreach asset dir path
		} # game has asset dirs
		$self->{storage}->delete_record( $base_path . '/asset_folders' );

		# level data
		my $levels = $self->{storage}->list_get( "$base_path/levels" );
		if ($levels) {
			foreach my $level (@$levels) {
				if ($self->{storage}->check_record_exists( $base_path . '/level_data/' . $level->{Name} )) {
					$self->{storage}->delete_record( $base_path . '/level_data/' . $level->{Name} );
				} # has level data
				if ($self->{storage}->check_record_exists( $base_path . '/level_nav/' . $level->{Name} )) {
					$self->{storage}->delete_record( $base_path . '/level_nav/' . $level->{Name} );
				} # has nav data
			} # foreach level
		} # has levels
	
		# objects
		foreach my $obj_type ('sprites', 'tiles', 'tilesets', 'fonts', 'keys', 'levels', 'audio', 'envs') {
			if ($self->{storage}->check_record_exists( $base_path . '/' . $obj_type )) {
				$self->{storage}->list_delete( $base_path.'/'.$obj_type );
			}
		}
		
		$self->{storage}->delete_record( $base_path . '/stats' );
		$self->{storage}->delete_record( $base_path );
	} # foreach rev path, incl. base game
	
	# only the base game has revs
	if ($self->{storage}->check_record_exists( $game_path . '/revs' )) {
		$self->{storage}->list_delete( $game_path.'/revs' );
	}
	
	# and invites
	if ($self->{storage}->check_record_exists( $game_path . '/invites' )) {
		$self->{storage}->list_delete( $game_path.'/invites' );
	}
	
	# and a log
	if ($self->{storage}->check_record_exists( $game_path . '/log' )) {
		$self->{storage}->list_delete( $game_path.'/log' );
	}
	
	# and level prop defs
	if ($self->{storage}->check_record_exists( $game_path . '/level_props' )) {
		$self->{storage}->delete_record( $game_path.'/level_props' );
	}
	
	$self->log_transaction( 'game_delete', { game_id => $xml->{GameID} } );
	$self->user_log_msg( "Deleted game: " . $xml->{GameID} );
	
	$self->set_response(0, "Success");
}

sub api_game_admin_broadcast_email {
	##
	# Broadcast e-mail to all members
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => 'GameID',
		'/Subject' => '.+',
		'/Message' => '.+'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $user = $self->get_user( $username );
	if (!$user) {
		return $self->api_error( 'user', "User not found: $username" );
	}
	
	my $game_id = $xml->{GameID};
	my $game_path = '/games/' . $game_id;
	
	# make sure game exists
	my $game = $self->{storage}->get_metadata( $game_path );
	if (!$game) {
		return $self->api_error( 'game', "Game not found: $game_id" );
	}
	
	# make sure user is admin
	if (!$self->is_game_admin($game_id)) {
		return $self->api_error( 'game', "Only administrators may broadcast e-mails to all members." );
	}
	
	my $game_users_path = "/games/$game_id/users";
	my $game_users = $self->{storage}->list_get( $game_users_path, 0 );
	if (!$game_users) { return $self->api_error( 'game', "Game has no members: $game_id" ); }
	
	foreach my $game_user_stub (@$game_users) {
		my $recip_username = $game_user_stub->{Username};
		my $recip_user = $self->get_user( $recip_username );
		if (!$recip_user) {
			return $self->api_error( 'user', "User not found: $recip_username" );
		}
		
		my $body = $xml->{Message};
		$body .= "\n\n";
		$body .= memory_substitute( $self->{config}->{Emails}->{GameAdminToUserSignature}, {
			username => $username,
			title => $game->{Title}
		} ) . "\n";

		my $from = "\"" . $user->{FullName} . "\" <" . $user->{Email} . ">";
		my $to = "\"" . $recip_user->{FullName} . "\" <" . $recip_user->{Email} . ">";
		my $subject = $xml->{Subject};
		
		$self->log_debug(5, "Sending game admin broadcast e-mail to: $recip_username (" . $user->{Email} . ")");
		
		$self->send_email(
			From     => $from,
			To       => $to,
			Subject  => $subject,
			Data     => $body
		);
	} # foreach game member
	
	$self->log_transaction( 'game_email_member_broadcast', { game_id => $xml->{GameID} } );
	$self->set_response(0, "Success");
}

sub api_game_send_invites {
	##
	# Send e-mail invitations to users to join game
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => '^[a-z0-9][a-z0-9\-]*[a-z0-9]$',
		'/Usernames' => '^[\w\,\s]+$',
		'/Message' => '.+'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $user = $self->get_user( $username );
	
	my $game_id = $xml->{GameID};
	my $game_path = '/games/' . $game_id;
	
	# make sure game exists
	my $game = $self->{storage}->get_metadata( $game_path );
	if (!$game) {
		return $self->api_error( 'game', "Game not found: $game_id" );
	}
	
	# make sure user is admin
	if (!$self->is_game_admin($game_id)) {
		return $self->api_error( 'game', "Only administrators may invite users to join the game." );
	}
	
	my @invite_usernames = split(/\,\s*/, $xml->{Usernames});
	if (scalar @invite_usernames > 32) {
		return $self->api_error( 'game', "You can only invite a maximum of 32 users at a time." );
	}
	
	foreach my $invite_username (@invite_usernames) {
		my $invite_user = $self->get_user( $invite_username );
		if (!$invite_user) {
			return $self->api_error( 'game', "Unknown username: $invite_username" );
		}
		
		# add to storage list
		if ($self->{storage}->list_find( $game_path . '/invites', { Username => $invite_username } )) {
			$self->log_debug(5, "Skipping user, already invited: $invite_username" );
			next;
		}
		if ($self->{storage}->list_find( $game_path . '/users', { Username => $invite_username } )) {
			$self->log_debug(5, "Skipping user, already a member: $invite_username" );
			next;
		}
		
		return unless $self->lock_list_unshift( $game_path . '/invites', { Username => $invite_username, Date => time(), From => $username } );
		
		my $body = $xml->{Message};
		$body =~ s/\[user\]/ $invite_user->{FirstName}; /eg;
		
		my $subject = "Invitation to join the game \"" . $game->{Title} . "\" on EffectGames.com";
		
		my $from = "\"" . $user->{FullName} . "\" <" . $user->{Email} . ">";
		
		my $to = "\"" . $invite_user->{FullName} . "\" <" . $invite_user->{Email} . ">";
		
		if (!$self->send_email(
			From     => $from,
			To       => $to,
			Subject  => $subject,
			Data     => $body
		)) {
			return $self->api_error( 'email', "Failed to send email to " . $invite_user->{Email} . ".  Please try again later." );
		}
		
		$self->log_transaction( 'game_invite', { game_id => $game_id, invite_username => $invite_username } );
	} # foreach username
	
	$self->set_response(0, "Success");
}

sub api_game_accept_invite {
	##
	# Accept invitation to join game
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => 'GameID'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	
	my $game_id = $xml->{GameID};
	my $game_path = '/games/' . $game_id;
	
	# make sure game exists
	my $game = $self->{storage}->get_metadata( $game_path );
	if (!$game) {
		return $self->api_error( 'game', "Game not found: $game_id" );
	}
	
	# remove invite stub
	return unless $self->lock_find_delete_list_item( $game_path . '/invites', { Username => $username } );
	
	# add user to game
	return unless $self->game_add_user($game_id, $username);
	
	$self->set_response(0, "Success");
}

sub api_game_get_log {
	##
	# Return game activity log
	##
	my $self = shift;
	return unless $self->require_query(
		id => 'GameID'
	);
	
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	
	return unless $self->validate_session();
	
	my $game_id = $query->{id};
	my $username = $self->{session}->{db}->{username};
	
	# check session for access (game should have been loaded client-side by this point)
	my $access = $self->require_game_read_access($game_id, 'readonly');
	if (!$access) {
		# wait, user may be on invite list -- try that before failing
		my $game = $self->{storage}->get_metadata( "/games/$game_id" );
		if (!$game) {
			return $self->api_error('game', "Game not found: $game_id");
		}
		
		my $member_profile = $self->get_game_member_profile($game_id, $username);
		my $is_member = !!$member_profile;
	
		if (($game->{Access} =~ /private/i) && !$is_member && !$self->is_admin() && 
			!$self->{storage}->list_find( "/games/$game_id/invites", { Username => $username } )) {
			
			return $self->api_error('access', "You do not have access to this game.");
		}
	}
	
	$query->{limit} ||= 1;
	$query->{offset} ||= 0;
	
	my $list_path = "/games/$game_id/log";
	
	my $list = $self->{storage}->get_metadata( $list_path );
	if ($list) { $response->{List} = $list; }
	
	my $items = $self->{storage}->list_get( $list_path, $query->{offset}, $query->{limit} );
	$items ||= [];
	
	$response->{Rows} = { Row => $items };
	$self->set_response(0, "Search successful");
	
	$self->set_ttl( 'ViewTTL' );
	$self->session_unmark();
}

sub api_game_post_log {
	##
	# Post custom message to game log
	##
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => 'GameID',
		'/Message' => '.+'
	);
	
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $response = $self->{session}->{response};
	my $game_id = $xml->{GameID};
	
	# check session for access (game should have been loaded client-side by this point)
	return unless $self->require_game_member($game_id);
	
	# log the message
	my $row = $self->game_log_msg($game_id, $xml->{Message}, 'comment');
	if (!$row) { return undef; }
	
	$response->{Row} = $row;
	$self->set_response(0, "Success");
}

sub game_update_storage_quota {
	##
	# Update storage quota given byte count delta
	# byte count is "delta", so:
	# > 0 = increase size on disk, DEcrease quota
	# < 0 = decrease size on disk, INcrease quota
	##
	my ($self, $game_id, $byte_count) = @_;
	
	# quota check and update
	if ($byte_count > 0) {
		my $stats_path = '/games/' . $game_id . '/stats';
		$self->{storage}->lock_record( $stats_path, 1 ); # exclusive
		my $stats = $self->{storage}->get_metadata( $stats_path );
		if (!$stats) {
			$self->{storage}->unlock_record( $stats_path );
			return $self->api_error('game', 'Could not load game stats record: ' . $stats_path); 
		}
		if ($stats->{Quota} - $byte_count <= 0) {
			$self->{storage}->unlock_record( $stats_path );
			return $self->api_error('game', $self->{config}->{Strings}->{AssetManager}->{OutOfSpace});
		}
		$stats->{Quota} -= $byte_count;
		if (!$self->{storage}->store_metadata( $stats_path, $stats )) {
			$self->{storage}->unlock_record( $stats_path );
			return $self->api_error( 'game', "Failed to update stats record: $stats_path: " . $self->{storage}->{error} );
		}
		$self->{storage}->unlock_record( $stats_path );
	}
	elsif ($byte_count < 0) {
		# file has shrunk, increase quota
		return undef unless $self->lock_update_record( "/games/$game_id/stats", { Quota => '+'.int($byte_count * -1) }, 1 );
	}
	
	return 1;
}

sub api_game_level_props_get {
	# fetch props for game levels
	my $self = shift;
	return unless $self->require_query(
		'id' => 'GameID'
	);
	return unless $self->validate_session();
	
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	my $game_id = $query->{id};
	
	# check session for access (game should have been loaded client-side by this point)
	return unless $self->require_game_read_access($game_id);
	
	my $prop_data = $self->{storage}->get_metadata( "/games/$game_id/level_props" );
	if (!$prop_data) { $prop_data = {}; }
	$prop_data->{Properties} ||= {};
	$prop_data->{Properties}->{Property} ||= [];
	
	$response->{Properties} = $prop_data->{Properties};
	
	$self->set_response(0, "Success");
	$self->set_ttl( 'ViewTTL' );
	$self->session_unmark();
}

sub api_game_level_props_save {
	# save level props
	my $self = shift;
	return unless $self->require_xml(
		'/GameID' => 'GameID'
	);
	return unless $self->validate_session();
	
	my $response = $self->{session}->{response};
	my $xml = $self->{session}->{xml};
	my $game_id = $xml->{GameID};
	
	# check session for access (game should have been loaded client-side by this point)
	return unless $self->require_game_member($game_id);
	
	if (!$self->{storage}->store_metadata( "/games/$game_id/level_props", $xml )) {
		return $self->api_error('game', "Failed to store level prop metadata: " . $self->{storage}->{error} );
	}
	
	return unless $self->game_log_msg($game_id, "Updated level property definitions", 'level');
	$self->log_transaction( 'game_level_update_props', { game_id => $game_id } );
	
	$self->set_response(0, "Success");
}

sub api_game_clone {
	##
	# Clone new game
	##
	my $self = shift;
	return unless $self->require_xml(
		'/OldGameID' => 'GameID',
		'/NewGameID' => 'GameID',
		'/Title' => '.+',
		'/Description' => '.*'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	
	my $old_game_id = $xml->{OldGameID}; delete $xml->{OldGameID};
	my $old_base_path = '/games/' . $old_game_id;
	
	my $game_id = $xml->{NewGameID}; delete $xml->{NewGameID};
	$xml->{GameID} = $game_id;
	
	my $game_path = '/games/' . $game_id;
	my $new_base_path = $game_path;
	
	return unless $self->check_privilege('/create_games');
	
	# get info about user (pro status)
	my $user = $self->get_user( $username );
	if (!$user) {
		return $self->api_error('game', "User not found: $username");
	}
	
	# make sure isn't abusing this
	my $user_game_info = $self->{storage}->list_get_info( "/users/$username/games" );
	if ($user_game_info && ($user_game_info->{length} >= ($user->{MaxGames} || 5))) {
		return $self->api_error( 'game', "You have reached the maximum allowed number of games.  Please contact us to ask for permission to create more." );
	}
	
	my $old_game = $self->{storage}->get_metadata( "/games/$old_game_id" );
	if (!$old_game) {
		return $self->api_error( 'game', "Could not locate game: $old_game_id" );
	}
	
	# make sure user has access
	return unless $self->require_game_read_access($old_game_id);
	
	# make sure new ID isn't already taken
	if ($self->{storage}->check_record_exists($game_path)) {
		return $self->api_error( 'game', "That Game ID is alredy taken.  Please choose another." );
	}
	
	# make user the owner
	$xml->{Owner} = $username;
	$xml->{ClonedFrom} = $old_game_id;
	
	# doxterify the description
	if ($xml->{Description}) {
		my $doxter = new Doxter(
			debug => 0,
			section_numbers => 0
		);
		my $response = $doxter->format_text( $xml->{Description} );
		$xml->{DescriptionHTML} = $response->{html};
	}
	else {
		$xml->{DescriptionHTML} = '';
	}
	
	# copy game metadata (only missing keys)
	foreach my $key (keys %$old_game) {
		if (!defined($xml->{$key})) { $xml->{$key} = $old_game->{$key}; }
	}
	
	# copy assets
	my $total_bytes = 0;
	
	# assets
	if ($self->{storage}->check_record_exists($new_base_path.'/asset_folders')) { $self->{storage}->delete_record($new_base_path.'/asset_folders'); }
	if (!$self->{storage}->copy_record($old_base_path . '/asset_folders', $new_base_path . '/asset_folders')) {
		return $self->api_error('game', "Could not clone game (asset_folders): " . $self->{storage}->{error});
	}
	
	my $folder_data = $self->{storage}->get_metadata( $old_base_path . '/asset_folders' );
	if (!$folder_data) {
		return $self->api_error('game', "Could not locate asset folder list for game.");
	}
	if ($folder_data->{FolderList}) {
		my $folder_paths = xpath_summary( $folder_data->{FolderList}, '/', 'inc_refs' );
		$folder_paths->{'/'} = 1;
		
		$self->log_debug(5, "Folder list xpath summary: " . serialize_object($folder_paths) );
		
		foreach my $subpath (sort keys %$folder_paths) {
			$self->log_debug(5, "Working on asset folder: $subpath");
			if ($self->{storage}->check_record_exists( $old_base_path . '/assets' . $subpath )) {
				$self->log_debug(5, "Folder $subpath exists, copying it");
				
				if ($self->{storage}->check_record_exists($new_base_path . '/assets' . $subpath)) {
					$self->{storage}->delete_record($new_base_path . '/assets' . $subpath);
				}
				
				my $bytes = $self->{storage}->copy_record($old_base_path . '/assets' . $subpath, $new_base_path . '/assets' . $subpath);
				if (!$bytes) {
					return $self->api_error('game', "Could not clone game (assets$subpath): " . $self->{storage}->{error});
				}
				$total_bytes += $bytes;
			} # folder exists
			else {
				$self->log_debug(5, "Folder $subpath DOES NOT EXIST, skipping");
			}
		} # foreach asset dir path
	} # game has asset dirs
	
	my $old_stats = $self->{storage}->get_metadata( "$old_base_path/stats" );
	$old_stats ||= {};
	
	# create stats record
	return unless $self->lock_create_record( "$game_path/stats", {
		Users => 0,
		Files => $old_stats->{Files} || 0,
		Objects => $old_stats->{Objects} || 0,
		Levels => $old_stats->{Levels} || 0,
		Publishes => 0,
		Quota => (1024 * 1024 * 100) - $total_bytes,
		AssetMod => time()
	} );
	
	# copy objects
	foreach my $obj_type ('sprites', 'tiles', 'tilesets', 'fonts', 'keys', 'levels', 'audio', 'envs') {
		if ($self->{storage}->check_record_exists( $old_base_path . '/' . $obj_type )) {
			if ($self->{storage}->check_record_exists($new_base_path.'/'.$obj_type)) { $self->{storage}->list_delete($new_base_path.'/'.$obj_type); }
			if (!$self->{storage}->list_copy( $old_base_path . '/' . $obj_type, $new_base_path . '/' . $obj_type )) {
				return $self->api_error('game', "Could not clone game ($obj_type): " . $self->{storage}->{error});
			}
		}
	}
	
	# level data
	my $levels = $self->{storage}->list_get( "/games/$old_game_id/levels" );
	if ($levels) {
		foreach my $level (@$levels) {
			if ($self->{storage}->check_record_exists( $old_base_path . '/level_data/' . $level->{Name} )) {
				if ($self->{storage}->check_record_exists($new_base_path.'/level_data/'.$level->{Name})) {
					$self->{storage}->delete_record($new_base_path.'/level_data/'.$level->{Name}); 
				}
				if (!$self->{storage}->copy_record($old_base_path . '/level_data/' . $level->{Name}, $new_base_path . '/level_data/' . $level->{Name})) {
					return $self->api_error('game', "Could not clone game (level_data/".$level->{Name}."): " . $self->{storage}->{error});
				}
			} # has level data
			if ($self->{storage}->check_record_exists( $old_base_path . '/level_nav/' . $level->{Name} )) {
				if ($self->{storage}->check_record_exists($new_base_path.'/level_nav/'.$level->{Name})) {
					$self->{storage}->delete_record($new_base_path.'/level_nav/'.$level->{Name}); 
				}
				if (!$self->{storage}->copy_record($old_base_path . '/level_nav/' . $level->{Name}, $new_base_path . '/level_nav/' . $level->{Name})) {
					return $self->api_error('game', "Could not clone game (level_nav/".$level->{Name}."): " . $self->{storage}->{error});
				}
			} # has nav data
		} # foreach level
	} # has levels
	
	# level props
	if ($self->{storage}->check_record_exists( $old_base_path . '/level_props' )) {
		if ($self->{storage}->check_record_exists($new_base_path.'/level_props')) {
			$self->{storage}->delete_record($new_base_path.'/level_props'); 
		}
		if (!$self->{storage}->copy_record($old_base_path . '/level_props', $new_base_path . '/level_props')) {
			return $self->api_error('game', "Could not clone game (level_props): " . $self->{storage}->{error});
		}
	} # has level props
	
	# create master game record
	$self->log_debug(5, "Creating game storage record");
	if (!$self->{storage}->create_record( $game_path, $xml )) {
		return $self->api_error( 'storage', 'Failed to create game: ' . $self->{storage}->{error} );
	}
	
	# start game log
	return unless $self->game_log_msg($xml->{GameID}, "Cloned game from: $old_game_id", 'game');
	
	# add user to game, as an admin of course
	return unless $self->game_add_user($xml->{GameID}, $username, { Admin => 1 });
	
	# add game to master list
	return unless $self->lock_list_unshift( "/admin/master_game_list", { GameID => $xml->{GameID} } );
	
	$self->user_log_msg( "Cloned game: " . $old_game_id . " to: " . $game_id );
	$self->user_update_stats( Games => '+1' );
	
	$self->log_transaction( 'game_create', { game_id => $xml->{GameID}, cloned_from => $old_game_id } );
	
	$self->set_response(0, "Success");
}

sub api_game_get_time {
	##
	# Get temporary authorization to post changes to game (i.e. high scores)
	##
	my $self = shift;
	
	$self->{session}->{response}->{Time} = time();
	$self->set_response(0, "Success");
}

sub api_game_post_high_score {
	##
	# Post high score for game
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	
	return unless $self->require_query(
		# 'auth' => '^\w{32}$', // don't call attention to this
		'game' => '^\w+$',
		'username' => '^\w+$',
		'score' => '^\d+(\.\d+)?$'
	);
	
	# auth check
	my $now = time();
	my $auth = md5_hex( int( $now / 60 ) );
	if ($auth ne $query->{auth}) {
		# try previous minute
		$auth = md5_hex( int( $now / 60 ) - 1 );
		if ($auth ne $query->{auth}) {
			# TODO: make this appear to succeed?  mark IP as bad?
			return $self->api_error( 'api', "Auth failure" );
		}
	}
	delete $query->{auth};
	
	my $path = 'games/' . $query->{game} . '/scores';
	if (!$self->{storage}->check_record_exists($path)) {
		return $self->api_error( 'game', 'Game does not exist: ' . $query->{game} );
	}
	
	$self->{storage}->lock_record( $path, 1 ); # exclusive
	my $data = $self->{storage}->get_metadata( $path );
	
	if (!$data->{Scores}) { $data->{Scores} = { Score => [] }; }
	if (!$data->{Scores}->{Score}) { $data->{Scores}->{Score} = []; }
	XMLalwaysarray( xml=>$data->{Scores}, element=>'Score' );
	
	my $scores = $data->{Scores}->{Score};
	$query->{date} = time();
	# $query->{client_info} = get_client_info();
	# delete $query->{game};
	
	# allow query to specify other data which is stored too (i.e. which level user was on)
	push @$scores, $query;
	
	@$scores = reverse sort { $a->{score} <=> $b->{score} } @$scores;
	
	while (scalar @$scores > $data->{MaxScores}) {
		pop @$scores;
	}
	
	$data->{Scores}->{Score} = $scores;
	$self->{storage}->store_metadata( $path, $data );
	$self->{storage}->unlock_record( $path );
	
	$self->log_transaction( 'game_high_score_post', compose_query($query) );
	
	$self->set_response(0, "Success");
}

1;
