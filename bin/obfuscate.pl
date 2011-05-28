#!/effect/perl/bin/perl

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

##
# Effect Code Obfuscation Engine
# Author: Joseph Huckaby
# $Id: $
##

use strict;
use File::Basename;
use Cwd qw/cwd abs_path/;
use UNIVERSAL qw/isa/;
use Data::Dumper;

use lib qw@/effect/lib@;
use XML::API::Tools;
use XML::Lite;

$| = 1;

my $script_dir = abs_path( dirname $0 );
my $base_dir = abs_path( $script_dir . '/..' );
my $conf_dir = $base_dir . '/conf';

my $args = get_args();
$args->{config} ||= $conf_dir . '/obfuscate.xml';
$args->{build} ||= 'Debug';
$args->{verbose} ||= 0;
$args->{quiet} ||= 0;

my $config = parse_xml_collapse( $args->{config} );
if (!ref($config)) { die "Could not parse config file: " . $args->{config} . ": $config\n"; }

log_debug("Effect Code Obfuscation Engine");
log_debug("Configuration: " . $args->{config});
log_debug("Build: " . $args->{build});

if (!$config->{SourceFiles} || !$config->{SourceFiles}->{File}) { die "No source files in config.\n"; }
XMLalwaysarray( xml=>$config->{SourceFiles}, element=>'File' );

##
# Merge build configuration with default configuration
##
my $build_config = $config->{BuildConfigurations}->{ $args->{build} };
if (!$build_config) { die "Could not find build config: " . $args->{build} . "\n"; }
if (1) {
	# special handling for code files
	if ($build_config->{SourceFiles} && $build_config->{SourceFiles}->{File}) {
		XMLalwaysarray( xml=>$build_config->{SourceFiles}, element=>'File' );
		push @{$config->{SourceFiles}->{File}}, @{$build_config->{SourceFiles}->{File}};
		delete $build_config->{SourceFiles};
	}
	
	foreach my $key (keys %$build_config) {
		if ($config->{$key}) {
			if (isa($build_config->{$key}, 'ARRAY')) {
				if (isa($config->{$key}, 'ARRAY')) { unshift @{$config->{$key}}, @{$build_config->{$key}}; }
				else { $config->{$key} = [ @{$build_config->{$key}}, $config->{$key} ]; }
			}
			else {
				if (isa($config->{$key}, 'ARRAY')) { unshift @{$config->{$key}}, $build_config->{$key}; }
				else { $config->{$key} = [ $build_config->{$key}, $config->{$key} ]; }
			}
		}
		else { $config->{$key} = $build_config->{$key}; }
	}
}

##
# Load all source files
##
my $source = "";
my $source_dir = $base_dir . '/' . $config->{SourceDir};

log_debug("Loading source files");
foreach my $filename (@{$config->{SourceFiles}->{File}}) {
	my $file = $source_dir . '/' . $filename;
	log_debug("Loading file: $file");
	my $contents = load_file( $file );
	if (!$contents) { die "WARNING: Could not load file: $file\n"; }
	
	chomp($contents); $contents .= ";\n";
	$source .= $contents;
} # foreach file
if (!$source) { die "No source code found.\n"; }

$source =~ s/\r\n/\n/sg;
$source =~ s/\r/\n/sg;
$source = "\n" . $source . "\n";

##
# Begin with simple regular expression replacements
##
if ($config->{Regexp} && ($args->{build} ne 'Internal')) {
	log_debug("Performing regular expression replacements");
	XMLalwaysarray( xml=>$config, element=>'Regexp' );
	foreach my $regexp (@{$config->{Regexp}}) {
		if (!$regexp->{Pattern}) { warn "WARNING: Regular expression has no pattern defined!\n"; next; }
		$regexp->{Replace} ||= '';
		$regexp->{Flags} ||= '';
		
		my $cmd = '';
		my $count = 0;
		my $num = 0;
		my $max = 0;
		if ($regexp->{Partial} && ($regexp->{Partial} =~ /^(\d+)\D+(\d+)$/)) {
			($num, $max) = ($1, $2);
			$cmd = '$source =~ s@(' . $regexp->{Pattern} . ')@ $count++; repl_partial("' . $regexp->{Replace} . '", $1, '.$num.', '.$max.', $count); @' . $regexp->{Flags} . 'e;';
			# $cmd = '$source =~ s@(' . $regexp->{Pattern} . ')@ ($count++ % $max < $num) ? "'.$regexp->{Replace}.'" : $1; @' . $regexp->{Flags} . 'e;';
		}
		elsif ($regexp->{Debug}) {
			$max = $regexp->{Max} || 0;
			$cmd = '$source =~ s@' . $regexp->{Pattern} . '@ $count++; repl_debug("' . $regexp->{Replace} . '", $count, $max); @' . $regexp->{Flags} . 'e;';
		}
		else {
			$cmd = '$source =~ s@' . $regexp->{Pattern} . '@' . $regexp->{Replace} . '@' . $regexp->{Flags} . ';';
		}
		log_debug("Command: $cmd");
		eval "$cmd";
		if ($@) { warn "WARNING: Regular expression compile error: $@\n"; }
	} # foreach regexp
}

my $keywords = {};
my $excludes = {};
my $reserved_words = {};
my $ob_keys = {};

if ($args->{build} ne 'Internal') {
	##
	# Gather keyword lists
	##
	log_debug("Gathering keyword lists");
	if ($config->{KeywordList}) {
		$keywords = { map { $_ => 1; } split(/\,\s*/, $config->{KeywordList}) };
	}
	if ($config->{ExcludeList}) {
		$excludes = { map { $_ => 1; } split(/\,\s*/, $config->{ExcludeList}) };
	}
	if ($config->{KeywordMatch}) {
		my $source_temp = $source;
		XMLalwaysarray( xml=>$config, element=>'KeywordMatch' );
		foreach my $match (@{$config->{KeywordMatch}}) {
			my $pat = $match->{Pattern};
			my $imatch = $match->{IndividualMatch} || '.+';
			log_debug("Matching pattern: $pat");
			eval {
				$source_temp =~ s@($pat)@ process_keywords($2, $imatch); $1; @eg;
			};
			if ($@) { warn "WARNING: Regular expression compile error: $@\n"; }
		} # foreach keyword match
	} # has keyword matches

	# remove excludes
	foreach my $key (keys %$excludes) { delete $keywords->{$key}; }

	# remove single-char keywords (eliminates many possible errors)
	foreach my $key (keys %$keywords) {
		if (length($key) == 1) { delete $keywords->{$key}; }
	}

	log_verbose("Keyword list: " . join(', ', sort keys %$keywords));

	##
	# Generate obfuscated versions of all keywords
	##
	$config->{CharList} ||= 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_';
	$config->{MinLength} ||= 2;
	$config->{MaxLength} ||= 2;

	if ($config->{ReservedWords}) {
		$reserved_words = { map { $_ => 1; } split(/\,\s*/, $config->{ReservedWords}) };
	}

	foreach my $key (keys %$keywords) {
		my $ob_key = gen_ob_key();
		$keywords->{$key} = $ob_key;
	}

	log_verbose("Substitution map: " . Dumper($keywords) );

	##
	# Perform keyword substitution
	##
	log_debug("Performing keyword substitution");

	foreach my $source_key (keys %$keywords) {
		my $ob_key = $keywords->{$source_key};
		$source =~ s@\b$source_key\b@$ob_key@g;
	} # foreach key
}

##
# Apply header and footer
##
if ($config->{Header}) {
	chomp $config->{Header};
	$source = $config->{Header} . "\n" . $source;
}
if ($config->{Footer}) {
	chomp $config->{Footer};
	chomp $source;
	$source .= "\n" . $config->{Footer} . "\n";
}
chomp $source;
$source .= "\n";

##
# Save destination file
##
my $dest_file = $base_dir . '/' . $config->{Output};
log_debug("Writing destination file: $dest_file");
save_file( $dest_file, $source );

log_debug("Exiting");

exit;

sub repl_debug {
	my ($replace_text, $count, $max) = @_;
	if ($max && ($count > $max)) {
		log_debug("$count: Regexp Debug: Max limit reached, skipping: " . $&);
		return $&;
	}
	log_debug("$count: Regexp Debug: Matched: " . $& . " (Replacing with: $1)");
	return $replace_text;
}

sub repl_partial {
	my ($replace_text, $original_text, $num, $max, $count) = @_;
	my $value = ($count % $max < $num) ? $replace_text : $original_text;
	# warn "$num, $max, $count, $value\n";
	return $value;
}

sub process_keywords {
	# insert single or multiple keywords
	my $str = shift;
	my $imatch = shift;
	log_verbose("Matched: $&");
	foreach my $key (split(/\,\s*/, $str)) {
		$key =~ s@^\s+@@; $key =~ s@\s+$@@;
		if (($key =~ m@$imatch@) && !$keywords->{$key} && !$excludes->{$key}) {
			log_verbose("Adding keyword: $key");
			$keywords->{$key} = 1;
		}
	}
	return '';
}

sub gen_ob_key {
	# generate obfuscated keyword
	my $done = 0;
	my $len = 0;
	my $ob_key = '';
	
	while (!$done) {
		$ob_key = '';
		if ($config->{MinLength} == $config->{MaxLength}) { $len = $config->{MinLength}; }
		else { $len = int( rand($config->{MaxLength} - $config->{MinLength}) + $config->{MinLength} ); }
		
		for (my $idx = 0; $idx < $len; $idx++) {
			$ob_key .= substr( $config->{CharList}, int(rand(length($config->{CharList}))), 1 );
		}
		if (!$ob_keys->{$ob_key} && !$reserved_words->{$ob_key}) {
			$ob_keys->{$ob_key} = 1;
			$done = 1;
		}
	}
	
	return $ob_key;
}

sub log_debug {
	my $msg = shift;
	chomp $msg;
	!$args->{quiet} && print "$msg\n";
}

sub log_verbose {
	my $msg = shift;
	chomp $msg;
	$args->{verbose} && print "$msg\n";
}

1;
