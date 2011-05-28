package Effect::ImageService::Plugin::OggCreate;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

use strict;
use URI::Escape;
use File::Basename;
use File::Path;
use XML::API::Tools;
use XML::Lite;
use Digest::MD5 qw/md5_hex/;
use Effect::ImageService::Plugin;

our @ISA = ("Effect::ImageService::Plugin");

sub handler {
	##
	# Create OGG audio files from all MP3 assets (unless ogg files already exist)
	#	GameID => game id
	#	RevID => rev id
	#	Username => username
	##
	my $self = shift;
	my $game_id = $self->{GameID};
	my $rev_id = $self->{RevID};
	my $username = $self->{Username};
	my $errors = [];
	
	my $user = $self->{storage}->get_metadata( '/users/' . $username );
	if (!$user) { die "Could not load user: $username"; }
	
	my $base_path = '/games/' . $game_id . '/revisions/' . $rev_id;
	
	my $game = $self->{storage}->get_metadata( $base_path );
	if (!$game) { die "Could not load game revision: $game_id: $rev_id"; }
	
	# my $rev = $self->{storage}->list_find( "/games/$game_id/revs", { Name => $rev_id } );
	# if (!$rev) { die "Could not find game revision: $game_id: $rev_id"; }
	
	$self->log_debug(3, "Converting MP3s to OGG for game revision: $game_id: $rev_id");
	
	# locate commandline binaries for mpg123 and oggenc
	my $mpg123 = (-e '/usr/local/bin/mpg123') ? '/usr/local/bin/mpg123' : '/opt/local/bin/mpg123';
	my $oggenc = (-e '/usr/bin/oggenc') ? '/usr/bin/oggenc' : '/opt/local/bin/oggenc';
	
	# set ogg bitrate
	my $bitrate = 64;
	my $game_config = $self->get_game_settings( $game_id, $rev_id );
	if ($game_config->{OggBitrate} && ($game_config->{OggBitrate} =~ /^\d+$/)) {
		$bitrate = $game_config->{OggBitrate};
	}
	
	# scan all asset folders
	my $folder_data = $self->{storage}->get_metadata( $base_path . '/asset_folders' );
	if ($folder_data && $folder_data->{FolderList}) {
		my $folder_paths = xpath_summary( $folder_data->{FolderList}, '/', 'inc_refs' );
		$folder_paths->{'/'} = 1;
		
		$self->log_debug(5, "Folder list xpath summary: " . serialize_object($folder_paths) );
		
		foreach my $subpath (sort keys %$folder_paths) {
			$self->log_debug(5, "Working on asset folder: $subpath");
			if ($self->{storage}->check_record_exists( $base_path . '/assets' . $subpath )) {
				
				my $metadata = $self->{storage}->get_metadata( $base_path . '/assets' . $subpath );
				if ($metadata && $metadata->{Files} && $metadata->{Files}->{File}) {
					XMLalwaysarray( xml=>$metadata->{Files}, element=>'File' );
					
					foreach my $file (@{$metadata->{Files}->{File}}) {
						my $filename = $file->{Name};
						my $filename_strip = $filename; $filename_strip =~ s/\.\w+$//;
						
						if (($filename =~ /\.mp3$/i) && !find_object($metadata->{Files}->{File}, Name => "$filename_strip.ogg")) {
							$self->log_debug(5, "Converting MP3 file: $subpath/$filename");
							
							my $source_file = $self->{storage}->get_file_path( $base_path . '/assets' . $subpath, $filename );
							
							# Step 1: MP3 to WAV
							my $temp_wav_file = '/var/tmp/temp_'.$game_id.'_'.$filename_strip.'_'.$$.'.wav';
							my $cmd = "$mpg123 -q -w $temp_wav_file $source_file 2>&1";
							$self->log_debug(5, "Executing command: $cmd");
							$self->perf_begin('mpg123');
							my $output = `$cmd`;
							$self->perf_end('mpg123');
							if ($output =~ /\S/) {
								$self->log_debug(2, "Failed to convert mp3 to wav: $base_path/assets$subpath/$filename: $output");
								push @$errors, "Failed to convert file: $subpath/$filename: $output";
								unlink $temp_wav_file;
								next;
							}
							
							# Step 2: WAV to OGG
							my $temp_ogg_file = '/var/tmp/temp_'.$game_id.'_'.$filename_strip.'_'.$$.'.ogg';
							$cmd = "$oggenc -Q -b $bitrate -o $temp_ogg_file $temp_wav_file";
							$self->log_debug(5, "Executing command: $cmd");
							$self->perf_begin('oggenc');
							my $output = `$cmd`;
							$self->perf_end('oggenc');
							unlink $temp_wav_file;
							if ($output =~ /\S/) {
								$self->log_debug(2, "Failed to convert wav to ogg: $base_path/assets$subpath/$filename: $output");
								push @$errors, "Failed to convert file: $subpath/$filename: $output";
								unlink $temp_ogg_file;
								next;
							}
							
							# Step 3: Commit back to storage right alongside mp3
							if (!$self->{storage}->store_file( $base_path . '/assets' . $subpath, $filename_strip.'.ogg', load_file($temp_ogg_file) )) {
								$self->log_debug(1, "Failed to store file for ogg conversion: $base_path/assets$subpath/$filename_strip.ogg: " . $self->{storage}->{error});
								push @$errors, "Failed to convert file: $subpath/$filename: " . $self->{storage}->{error};
								unlink $temp_ogg_file;
								next;
							}
							
							unlink $temp_ogg_file;
						} # is mp3
					} # foreach file
				} # dir has files
			} # folder exists
			else {
				$self->log_debug(5, "Folder $subpath DOES NOT EXIST, skipping");
			}
		} # foreach asset dir path
		
	} # game has asset dirs
	
	if (scalar @$errors) {
		# send e-mail if errors
		my $num_errors = scalar @$errors;
		my $body = 'Hey ' . $user->{FullName} . ",\n\n";
		$body .= "The following errors occurred while converting audio files for your game revision: $game_id $rev_id\n\n";
		$body .= join("\n", map { trim($_); } @$errors);
		$body .= "\n\nYour game may still work properly, but the audio files listed above may not play correctly, and native audio in Firefox is completely disabled.";
		$body .= "\n\n" . $self->{config}->{Emails}->{Signature};
		
		$self->log_debug(4, "Sending e-mail to: " . $user->{Email} );

		my $to = '"'.$user->{FullName}.'" <'.$user->{Email}.'>';
		my $from = $self->{config}->{Emails}->{From};
		my $subject = "Errors occurred converting audio for your game: $game_id $rev_id";
		
		$self->send_email(
			From     => $from,
			To       => $to,
			Subject  => $subject,
			Data     => $body
		);
		$self->log_debug(5, "Email send complete");
	}
	else {
		# mark game rev as ogg-ready (ONLY IF NO ERRORS)
		$self->log_debug(5, "Complete success, zero errors, marking game rev as OggReady");
		
		$game->{OggReady} = 1;
		$self->{storage}->store_metadata( $base_path, $game );
	} # success
	
	$self->log_debug(5, "OGG creation complete");
}

1;
