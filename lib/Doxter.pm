package Doxter;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

##
# Doxter Documentation System
# Compiler Library
#
# Usage:
#	my $doxter = new Doxter( debug => 1 );
#	$response = $doxter->format_text( 'Hello this is my article' );
#	print $response->{html};
##

use strict;
use FileHandle;
use File::Basename;
use URI::Escape;
use XML::API::Tools;

# supported markup languages
use Syntax::Highlight::Engine::Kate::XML;
use Syntax::Highlight::Engine::Kate::Xslt;
use Syntax::Highlight::Engine::Kate::HTML;

# supported programming langauges
use Syntax::Highlight::Engine::Kate::JavaScript;
use Syntax::Highlight::Engine::Kate::Perl;
use Syntax::Highlight::Engine::Kate::PHP_HTML;
use Syntax::Highlight::Engine::Kate::PHP_PHP;
use Syntax::Highlight::Engine::Kate::Cplusplus;
use Syntax::Highlight::Engine::Kate::Bash;
use Syntax::Highlight::Engine::Kate::CSS;
use Syntax::Highlight::Engine::Kate::SQL;

my $months = [ 'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December' ];

my $code_matches = [
	'\bfunction\s*\(',
	'\b(function|sub)\s*\w+\s*\(',
	'\b\$[A-Za-z]+',
	'\bvar\s+\w+',
	'\b(if|switch|while|do|elsif|else\s+if|for|foreach|catch|alert|assert|typeof|unless)\s*\(',
	'\bforeach\s+(my|\$\w+)',
	'\b(else|try|finally|eval)\s*\{',
	'\b(Math|RegExp|Array|Object|Function|window|document|location|navigator|prototype)\.',
	'\b(break|continue|next|last)\;',
	'\bclass\s+\w+\s*\{',
	'\b(include_once|include|print|eval|echo)\s+\"',
	'\/\*.+\*\/', # comments mean its code,
	'<\?(php|\=)', # php markup tags
	'\)\;', # close paren followed by semicolon
	'\b\#\!\/[\w\/]+\s', # perl #!... line
	'\buse\s+[\w\:]+\;' # perl 'use' statement
];
my $code_match = '(' . join(')|(', @$code_matches) . ')';

sub new {
	##
	# Class constructor
	##
	my $class = shift;
	my $self = bless {}, $class;
	
	$self->setup_highlight();
	
	# defaults
	$self->{args} = {
		debug => 0,
		quiet => 1,
		code => 'js',
		markup => 'xml',
		inline_link_icon => '',
		external_link_icon => '',
		toc => 0,
		toc_max => 4,
		list_type => 'bullet',
		list_bullets => '&bull; &loz; &diams;',
		section_numbers => 0,
		email_links => 1,
		validate_urls => 0,
		tab_char => '\t',
		icon_folder => '/effect/images/icons/folder.gif',
		icon_file => '/effect/images/icons/file.gif',
		use_link_cache => 1,
		params => {}
	};
	my $in_args = {@_};
	foreach my $key (keys %$in_args) {
		$self->{args}->{$key} = $in_args->{$key};
	}
	
	$self->{html} = '';
	$self->{state} = 'normal';
	$self->{section_names} = {};
	$self->{toc} = [];
	$self->{warnings} = [];
	$self->{link_cache} = {};
	
	# custom user functions:
	$self->{inline_handlers} = {};
	$self->{command_handlers} = {};
	
	# chunk management
	$self->{chunk_locs} = [];
	$self->{chunks} = [];
	$self->{chunk_size} = 8192;
	
	return $self;
}

sub set_inline_handler {
	##
	# Set custom user inline handler
	##
	my ($self, $name, $func) = @_;
	$self->{inline_handlers}->{$name} = $func;
}

sub set_command_handler {
	##
	# Set custom user command handler
	##
	my ($self, $name, $func) = @_;
	$self->{command_handlers}->{$name} = $func;
}

sub format_file {
	##
	# Load file and format it
	##
	my $self = shift;
	my $file = shift;
	my $contents = undef;
	
	my $fh = new FileHandle "<$file";
	if (defined($fh)) {
		$fh->read( $contents, (stat($fh))[7] );
		$fh->close();
	}
	
	return $self->format_text( $contents );
}

sub format_text {
	##
	# Format text into Doxter HTML
	##
	my $self = shift;
	my $text = shift;
	
	##
	# Must make initial scan of content for section names
	##
	$self->{mode} = 'preprocess';
	$self->log_debug("Preprocessing text");
	$self->preprocess_text( $text );

	##
	# Clear everything for actual compilation run
	##
	$self->{mode} = 'compile';
	$self->{current_line} = undef;
	$self->{current_line_num} = undef;
	$self->{last_section_num} = undef;
	$self->{html} = '';
	$self->{toc} = [];
	$self->{state} = 'normal';

	$self->log_debug("Beginning compilation");
	$self->process_text( $text );

	$self->{current_line} = undef;
	$self->{current_line_num} = undef;
	
	if ($self->{state} ne 'normal') {
		# make sure final state is closed out
		$self->change_state('normal');
	}
	if ($self->{box}) {
		# box left open
		$self->do_warn("Box left open (=box tag never closed)");
		$self->handler_box();
	}
	
	# make sure document is fully chunked
	$self->manage_chunks();

	if ($self->{args}->{copyright}) { $self->{html} .='<br><br><br><div class="dx_copyright">Copyright &copy; '.$self->{args}->{copyright}.'</div>' . "\n"; }
	
	# make chunks
	$self->finalize_chunks();

	$self->{args}->{html} = $self->{html};
	$self->{args}->{preview} = $self->{preview};

	# compile toc
	my $toc_html = '';
	if (check_boolean_arg($self->{args}->{toc})) {
		$toc_html .= '<div class="dx_toc">';
		$toc_html .= '<div class="dx_toc_header">Table of Contents</div>';
		foreach my $sec (@{$self->{toc}}) {
			my ($sec_num, $sec_name) = @$sec;
			my @nums = split(/\./, $sec_num);
			my $indent = scalar @nums;
			if ($indent <= $self->{args}->{toc_max}) {
				my $link_id = '_section_' . $sec_num;
				$link_id =~ s/\./_/g;
				# my $link_id = '_section_' . lc($sec_name);
				# $link_id =~ s/\W+/_/g;
				my $class_name = "dx_toc_level_$indent";
				if ($sec_num =~ /^[A-Za-z]+$/) { $class_name = "dx_toc_pre"; }
				$toc_html .= '<div class="'.$class_name.'"><a class="dx_toc_link" href="#'.$link_id.'">' . $sec_num . '. ' . $sec_name . '</a></div>' . "\n";
			}
		}
		$toc_html .= '</div>' . "\n";
	}
	$self->{args}->{table_of_contents} = $toc_html;
	
	# if desired, insert toc into HTML
	if ($self->{args}->{toc}) {
		$self->{args}->{html} = $toc_html . $self->{args}->{html};
		
		# and make this the first "chunk"
		unshift @{$self->{chunks}}, $toc_html;
	}

	# auto date?
	if ($self->{args}->{date} && ($self->{args}->{date} =~ /auto/i)) {
		my ($sec, $min, $hour, $mday, $mon, $year, $wday, $yday, $isdst) = localtime( time() );
		$self->{args}->{date} = sprintf("%s %d, %d", $months->[$mon], $mday, $year + 1900 );
	}

	# window title
	$self->{args}->{windowtitle} = $self->{args}->{title};
	if ($self->{args}->{subtitle}) { $self->{args}->{windowtitle} .= ' | ' . $self->{args}->{subtitle}; }
	if ($self->{args}->{version}) { $self->{args}->{windowtitle} .= ' | Revision ' . $self->{args}->{version}; }

	$self->log_debug("Doxter complete.");
	
	return {
		%{$self->{args}},
		warnings => $self->{warnings},
		chunks => $self->{chunks}
	};
}

sub preprocess_text {
	my $self = shift;
	my $contents = shift;
	
	$contents = fix_line_endings($contents);
	my $lines = [ split(/\n/, $contents) ];
	
	my $idx = 0;
	foreach my $line (@$lines) {
		$self->{current_line} = $line;
		$self->{current_line_num} = $idx;
		# $self->log_debug( "Preprocessing line: $line" );
		
		if (length($line)) {
			if ($line =~ /^\=(section)(\s+(.+))?$/) {
				# handle section line (=section 1. foo)
				my ($key, $value) = ($1, $3);
				if (!defined($value)) { $value = ''; }
				$self->handler_section($value);
			} # section line
		} # line has content
		$idx++;
	} # foreach line
}

sub process_text {
	my $self = shift;
	my $contents = shift;
	
	$contents = fix_line_endings($contents);
	my $lines = [ split(/\n/, $contents) ];
	my $tab_char = $self->{args}->{tab_char};
	
	my $idx = 0;
	foreach my $line (@$lines) {
		$self->{current_line} = $line;
		$self->{current_line_num} = $idx;
		# $self->log_debug( "Processing line: $line" );
		
		if (length($line)) {
			if ($line =~ /^\=(\S+)(\s+(.+))?$/) {
				# handle command line (=section 1. foo)
				my ($key, $value) = ($1, $3);
				if (!defined($value)) { $value = ''; }
				my $func = 'handler_' . $key;
				if ($self->{command_handlers}->{$key}) {
					# custom user function for command
					$self->{html} .= $self->{command_handlers}->{$key}->( $self, $value );
				}
				elsif ($self->can($func)) {
					$self->$func($value);
				}
				else {
					$self->{args}->{$key} = $value;
					if (!check_boolean_arg($self->{args}->{quiet})) { $self->log_debug("Setting $key to $value"); }
				}
			} # command line
			elsif ($line =~ /^$tab_char(.*)$/) {
				# handle indented line
				my $iline = $1;
				my $func = 'iline_' . $self->{state};
				if ($self->can($func)) { $self->$func( $iline ); }
				else { $self->do_warn("Unsupported handler: $func"); }
			} # indented line
			elsif ($line =~ /^\{\{\{/) {
				# enter code block, google code style
				$self->{args}->{syntax} = 'code';
			}
			elsif ($line =~ /^\}\}\}/) {
				# exit code block, google code style
				# just ignore this
			}
			elsif ($line =~ /\S/) {
				# handle standard line
				my $func = 'line_' . $self->{state};
				if ($self->can($func)) { $self->$func( $line ); }
				else { $self->do_warn("Unsupported handler: $func"); }
			} # standard line
		} # line has content
		$idx++;
	} # foreach line
	
	$self->{args}->{quiet} = 0;
}

sub handler_param {
	# set freeform param, which is stored in article metadata
	my ($self, $line) = @_;
	if ($line =~ /^(\w+)\s+(.+)$/) {
		my ($key, $value) = ($1, $2);
		$self->log_debug( "Setting param: $key: $value" );
		$self->{args}->{params}->{$key} = $value;
	}
}

sub handler_asciititle {
	# handle ascii title
	my $self = shift;
	$self->change_state('asciititle');
	$self->{asciititle} = '';
}

sub iline_asciititle {
	my ($self, $line) = @_;
	$self->{asciititle} .= $line . "\n";
}

sub line_asciititle {
	my ($self, $line) = @_;
	$self->change_state('normal');
	$self->line_normal($line);
}

sub handler_passthrough {
	# =passthrough
	# pass indented HTML directly through to output (indent it all)
	my ($self) = @_;
	
	$self->change_state('passthrough', 1);
	
	$self->{passthrough} = {
		html => ''
	};
}

sub iline_passthrough {
	# add html to passthrough buffer
	my ($self, $line) = @_;
	
	$line =~ s/^\s+//; $line =~ s/\s+$//;
	
	$self->{passthrough}->{html} .= $line;
}

sub line_passthrough {
	my ($self, $line) = @_;
	$self->change_state('normal');
	$self->line_normal($line);
}

sub leave_state_passthrough {
	# render passthrough
	my $self = shift;
		
	$self->{html} .= $self->{passthrough}->{html};
	$self->{html} .= "\n";
}

sub handler_deflist {
	# =deflist Here is an explanation of the top-level XML elements in the file:
	# start new definition list
	my ($self, $list_title) = @_;
	
	$self->change_state('deflist', 1);
	
	$self->{deflist} = {
		html => '<div class="dx_deflist">'
	};
	
	if ($list_title) {
		$self->{deflist}->{html} .= '<div class="dx_deflist_header">' . $list_title . '</div>' . "\n";
	}
	
	$self->{deflist}->{html} .= '<table class="dx_deflist_table">' . "\n";
}

sub iline_deflist {
	# add row to deflist
	my ($self, $line) = @_;
	
	my ($key, $value) = split(/\s*[^\\]\|\s*/, $line);
	if (!defined($key) || !defined($value)) { $self->do_warn("Malformed deflist row: $line"); }
	
	$self->{deflist}->{html} .= '<tr><td class="dx_deflist_key"><nobr>'.$self->substitute($key).'</nobr></td>';
	$self->{deflist}->{html} .= '<td class="dx_deflist_value">'.$self->substitute($value).'</td></tr>' . "\n";
}

sub line_deflist {
	my ($self, $line) = @_;
	$self->change_state('normal');
	$self->line_normal($line);
}

sub leave_state_deflist {
	# render deflist
	my $self = shift;
	
	$self->{deflist}->{html} .= '</table></div>' . "\n";
	
	$self->{html} .= $self->{deflist}->{html};
	$self->{html} .= "\n";
}

sub handler_list {
	# =list Projects / Customers dependent on Feed Exporter:
	# starts new list
	my ($self, $list_title) = @_;
	
	$self->change_state('list', 1);
	
	$self->{list} = {
		bullets => [ split(/\s+/, $self->{args}->{list_bullets}) ],
		last_indent_level => 0,
		html => '<div class="dx_list">'
	};
	
	if ($list_title) {
		$self->{list}->{html} .= '<div class="dx_list_header">' . $list_title . '</div>' . "\n";
	}
}

sub iline_list {
	# add line to list
	my ($self, $line) = @_;
	
	my $indent_level = 1;
	my $tab_char = $self->{args}->{tab_char};
	while ($line =~ s/^$tab_char//) { $indent_level++; }
	
	my $item_char = '';
	# my $item_idx = $self->{list}->{items_per_level}->{$indent_level} || 0;
	
	my $list_tag = '';
	my $item_tag = '';
	
	if ($line =~ s/^(\(\w+\))\s*//) {
		# custom: (1) My Item Here
		$item_char = '<dt>' . $1 . '</dt>';
		$list_tag = 'dl';
		$item_tag = 'dd';
	}
	elsif ($self->{args}->{list_type} =~ /bullet/i) {
		# bulleted list
		# my $bullet_idx = (($indent_level - 1) % (scalar @{$self->{list}->{bullets}}));
		# $item_char = $self->{list}->{bullets}->[$bullet_idx];
		$list_tag = 'ul';
		$item_tag = 'li';
	}
	elsif ($self->{args}->{list_type} =~ /number/i) {
		# numbered list
		# $item_idx++;
		# if ($indent_level % 2 == 0) { $item_char = chr(96 + $item_idx) . '.'; }
		# else { $item_char = "$item_idx."; }
		$list_tag = 'ol';
		$item_tag = 'li';
	}
	
	$self->{list}->{last_list_tag} = $list_tag;
	
	if ($indent_level > $self->{list}->{last_indent_level}) {
		while ($indent_level > $self->{list}->{last_indent_level}) {
			$self->{list}->{html} .= "<$list_tag>\n";
			$self->{list}->{last_indent_level}++;
		}
	}
	elsif ($indent_level < $self->{list}->{last_indent_level}) {
		while ($indent_level < $self->{list}->{last_indent_level}) {
			$self->{list}->{html} .= "</$list_tag>\n";
			$self->{list}->{last_indent_level}--;
		}
	}
	
	if ($item_char) { $self->{list}->{html} .= "$item_char\n"; }
	
	$self->{list}->{html} .= "<$item_tag class=\"dx_list_level_".$indent_level."\">" . $self->substitute($line) . "</$item_tag>\n";
}

sub line_list {
	my ($self, $line) = @_;
	$self->change_state('normal');
	$self->line_normal($line);
}

sub leave_state_list {
	# render list
	my $self = shift;
	
	while ($self->{list}->{last_indent_level} > 0) {
		$self->{list}->{html} .= "</" . $self->{list}->{last_list_tag} . ">\n";
		$self->{list}->{last_indent_level}--;
	}
	
	$self->{list}->{html} .= '</div>' . "\n";
	
	$self->{html} .= $self->{list}->{html};
	$self->{html} .= "\n";
}

sub handler_table {
	# start new table
	my ($self, $table_title) = @_;
	
	$self->change_state('table', 1);
	
	$self->{table} = {
		html => '<div class="dx_body_table_wrapper">',
		num_cols => 0
	};
	
	if ($table_title) {
		$self->{table}->{html} .= '<div class="dx_body_table_header">' . $table_title . '</div>' . "\n";
	}
	
	$self->{table}->{html} .= '<table class="dx_body_table">';
}

sub handler_header {
	# add header row to table
	my ($self, $header_raw) = @_;
	
	$self->{table}->{html} .= '<tr>';
	foreach my $header_th (split(/\s+\|\s+/, $header_raw)) {
		$self->{table}->{html} .= '<th><nobr>' . $header_th . '</nobr></th>';
		$self->{table}->{num_cols}++;
	}
	$self->{table}->{html} .= '</tr>' . "\n";
	$self->{table}->{header} = 1;
}

sub handler_row {
	# add row to table
	my ($self, $row_raw) = @_;
	
	my $num_cols = scalar split(/\s+\|\s+/, $row_raw);
	if ($num_cols != $self->{table}->{num_cols}) {
		# incorrect number of columns
		$self->do_warn( "Incorrect number of table columns: $num_cols != " . $self->{table}->{num_cols});
	}
	
	$self->{table}->{html} .= '<tr>';
	foreach my $td (split(/\s+\|\s+/, $row_raw)) {
		$self->{table}->{html} .= '<td>' . $self->substitute($td) . '</td>';
	}
	$self->{table}->{html} .= '</tr>' . "\n";
}

sub line_table {
	my ($self, $line) = @_;
	$self->change_state('normal');
	$self->line_normal($line);
}

sub iline_table {
	# same as =row
	my ($self, $row_raw) = @_;
	# $self->change_state('normal');
	# $self->line_normal($line);
	
	my $num_cols = scalar split(/\s+\|\s+/, $row_raw);
	
	my $unit_open = '<td>';
	my $unit_close = '</td>';
	if (!$self->{table}->{header}) {
		$unit_open = '<th><nobr>';
		$unit_close = '</nobr></th>';
		$self->{table}->{header} = 1;
		$self->{table}->{num_cols} = $num_cols;
	}
	elsif ($num_cols != $self->{table}->{num_cols}) {
		# incorrect number of columns
		$self->do_warn( "Incorrect number of table columns: $num_cols != " . $self->{table}->{num_cols});
	}
	
	$row_raw =~ s/^\s+//;
	$self->{table}->{html} .= '<tr>';
	foreach my $td (split(/\s+\|\s+/, $row_raw)) {
		$self->{table}->{html} .= "$unit_open" . $self->substitute($td) . "$unit_close";
	}
	$self->{table}->{html} .= '</tr>' . "\n";
}

sub leave_state_table {
	# render table
	my $self = shift;
	
	$self->{table}->{html} .= '</table></div>' . "\n";
	
	$self->{html} .= $self->{table}->{html};
	$self->{html} .= "\n";
}

sub handler_section {
	my $self = shift;
	my $name = shift;
	
	my $section_num = '';
	my $section_name = '';
	my $show_num = 1;
	
	if ($name =~ /^([\w\.]+)\s+(.+)$/) {
		# standard numbered section
		($section_num, $section_name) = ($1, $2);
	}
	elsif ($name =~ /^([\#\.]+)\s+(.+)$/) {
		# auto-number section
		($section_num, $section_name) = ($1, $2);
		
		if ($self->{last_section_num}) {
			my $last_nums = [ split(/\./, $self->{last_section_num}) ];
			my $last_indent_level = scalar @$last_nums;
			
			my $new_nums = [ split(/\./, $section_num) ];
			my $new_indent_level = scalar @$new_nums;
			
			if ($new_indent_level > $last_indent_level) {
				# more indent
				$section_num = join('.', @$last_nums) . ('.1' x ($new_indent_level - $last_indent_level));
			}
			elsif ($new_indent_level < $last_indent_level) {
				# less indent
				$last_nums->[ $new_indent_level - 1 ]++;
				while (scalar @$last_nums > scalar @$new_nums) { pop @$last_nums; }
				$section_num = join('.', @$last_nums);
			}
			else {
				# same indent
				$last_nums->[ $new_indent_level - 1 ]++;
				$section_num = join('.', @$last_nums);
			}
		}
		else {
			# first section
			$section_num =~ s@\#@1@g;
		}
	}
	else {
		# named section only
		my $section_name = $name;
		my $section_num = lc($name);
		$section_num =~ s@\W+@.@g;
		$section_num =~ s@\.{2,}@.@g;
		$show_num = 0;
	}
		
	$self->change_state('normal');
	
	$section_num =~ s/\.$//; # strip trailing period
	
	if ($self->{mode} eq 'compile') {
		$self->log_debug( "Beginning new section: $section_num ($section_name)" );
	}
	
	my $sec_nums = [ split(/\./, $section_num) ];
	my $indent_level = scalar @$sec_nums;
	my $class_name = "dx_section_header_" . $indent_level;
	
	if ($self->{section_names}->{lc($section_name)} && ($self->{mode} eq 'preprocess')) {
		# $self->do_warn( "Duplicate section title: $section_name in " . $self->{section_names}->{lc($section_name)} . " and " . $section_num );
	}
	$self->{section_names}->{lc($section_name)} = $section_num;
	push @{$self->{toc}}, [ $section_num, $section_name ];
	
	my $link_id = '_section_' . $section_num;
	$link_id =~ s/\./_/g;
	
	# put link in args for late-linking
	my $norm_section_name = lc($section_name); $norm_section_name =~ s@\W+@_@g;
	$self->{args}->{'|'.$norm_section_name} = '<a href="#'.$link_id.'" class="dx_inline_link">' . $section_name . '</a>';
	
	$self->{html} .= "\n";
	$self->{html} .= '<a id="'.$link_id.'" name="'.$link_id.'"></a>';
	$self->{html} .= '<a id="_section_'.$norm_section_name.'" name="_section_'.$norm_section_name.'"></a>';
	$self->{html} .= '<div class="'.$class_name.'"><a href="#'.$link_id.'">';
	if ($show_num && check_boolean_arg($self->{args}->{section_numbers})) { $self->{html} .= $section_num . '. '; }
	$self->{html} .= $section_name . '</a></div>';
	$self->{html} .= "\n";
	
	if ($section_num =~ /^[\d\.]+$/) { $self->{last_section_num} = $section_num; }
}

sub line_normal {
	my $self = shift;
	my $line = shift;
	
	$line = $self->substitute( $line ); # inline substitution
	$self->{html} .= '<div class="dx_paragraph">' . $line . '</div>' . "\n";
	# $self->{preview} ||= $line;
	
	if (!$self->{preview}) {
		$self->{preview} = $line;
		$self->{preview} =~ s@<.+?>@@g; # strip all HTML
	}
	
	$self->manage_chunks();
}

sub iline_normal {
	my $self = shift;
	my $line = shift;
	
	# first indented line
	$self->change_state('indent');
	
	$self->{indent_block} = '';
	$self->iline_indent($line);
}

sub iline_indent {
	# handle indented line
	my $self = shift;
	my $line = shift;
	
	# push onto stack for processing when state changes
	$self->{indent_block} .= $line . "\n";
}

sub line_indent {
	# standard line, but we are in an indented state
	# so call $self->change_state to switch back to normal state
	# which will call leave_state_indent
	my $self = shift;
	my $line = shift;
	
	$self->change_state('normal');
	return $self->line_normal($line);
}

sub leave_state_indent {
	# render indented block
	my $self = shift;
	
	my $block_type = 'text';
	if ($self->{args}->{syntax}) { $block_type = $self->{args}->{syntax}; }
	elsif ($self->{indent_block} =~ m@^\s*<\/?\??[\w\-]+([^\n]*)?>@) { $block_type = 'markup'; }
	elsif ($self->{indent_block} =~ m@$code_match@s) { $block_type = 'code'; }
	
	# hmm, better handle specific ones
	my $save_markup = '';
	my $save_code = '';
	
	if ($block_type =~ /^(xml|html|xsl)$/i) {
		$save_markup = $self->{args}->{markup};
		$self->{args}->{markup} = $block_type; 
		$block_type = 'markup';
	}
	elsif ($block_type =~ /^(perl|php|js|javascript|c|cpp|css|sql|sh|shell|bash)$/i) {
		$save_code = $self->{args}->{code};
		$self->{args}->{code} = $block_type; 
		$block_type = 'code';
	}
	
	# auto-detect format
	if ($block_type =~ /code/i) {
		# code
		$self->log_debug("Block recognized as code (" . $self->{args}->{code} . ")" );
		my $func = 'highlight_' . lc($self->{args}->{code});
		if (!$self->can($func)) { $self->do_warn("Unknown code type: " . $self->{args}->{code}); }
		
		$self->{html} .= '<div class="dx_code_block">' . $self->$func( $self->{indent_block} ) . '</div>' . "\n";
	}
	elsif ($block_type =~ /markup/i) {
		# markup
		$self->log_debug("Block recognized as markup (" . $self->{args}->{markup} . ")" );
		my $func = 'highlight_' . lc($self->{args}->{markup});
		if (!$self->can($func)) { $self->do_warn("Unknown markup type: " . $self->{args}->{markup}); }
		
		$self->{html} .= '<div class="dx_markup_block">' . $self->$func( $self->{indent_block} ) . '</div>' . "\n";
	}
	else {
		# plain text
		$self->log_debug("Block recognized as plain text" );
		$self->{indent_block} =~ s/\&/&amp;/g;
		$self->{indent_block} =~ s/</&lt;/g;
		$self->{indent_block} =~ s/>/&gt;/g;
		$self->{indent_block} =~ s/\n/<br>/g;
		$self->{indent_block} =~ s/\t/&nbsp;&nbsp;&nbsp;&nbsp;/g;
		$self->{indent_block} =~ s/\s/&nbsp;/g;
		$self->{html} .= '<div class="dx_text_block">' . $self->{indent_block} . '</div>' . "\n";
	}
	
	$self->{args}->{syntax} = '';
	if ($save_markup) { $self->{args}->{markup} = $save_markup; }
	if ($save_code) { $self->{args}->{code} = $save_code; }
}

sub handler_preview {
	# =preview TEXT
	# set article preview text
	my ($self, $line) = @_;
	
	$self->{preview} = $line;
	$self->{args}->{preview} = $line;
}

sub handler_note {
	# =note
	# change state to note
	my ($self, $line) = @_;
	
	$self->change_state('note');
	
	my $note_title = 'Note';
	if ($line && ($line =~ s/^([A-Z][\w\s\']+)\:\s+//)) { $note_title = $1; }
	
	$self->{html} .= '<div class="dx_note"><b>'.$note_title.':</b>&nbsp;';
	$self->{note} = '';
	
	if ($line) {
		$self->iline_note( $line );
	}
}

sub line_note {
	# return to normal state
	my ($self, $line) = @_;
	$self->change_state('normal');
	$self->line_normal($line);
}

sub iline_note {
	# add line to note
	my ($self, $line) = @_;
	if ($self->{note}) { $self->{note} .= "<br><br>"; }
	$self->{note} .= $self->substitute($line) . "\n";
}

sub leave_state_note {
	# compose note
	my $self = shift;
	$self->{html} .= $self->{note};
	$self->{html} .= '</div>' . "\n";
}

sub handler_image {
	# image, centered
	my ($self, $url) = @_;
	
	$self->{html} .= '<div class="dx_image_wrapper"><img src="'.$url.'" class="dx_image"';
	# if ($dest_width && $dest_height) { $self->{html} .= ' width="'.$dest_width.'" height="'.$dest_height.'"'; }
	$self->{html} .= '></div>' . "\n";
}

sub handler_caption {
	# caption under image
	my ($self, $line) = @_;
	$self->{html} .= '<div class="dx_caption">'.$self->substitute($line).'</div>' . "\n";
}

sub handler_code {
	# change code type
	# must close out state if not normal
	my ($self, $code_type) = @_;
	$self->change_state('normal');
	
	if (($code_type ne $self->{args}->{code}) && !check_boolean_arg($self->{args}->{quiet})) {
		$self->log_debug("Changing code type to: $code_type");
	}
	$self->{args}->{code} = $code_type;
}

sub handler_box {
	# start or stop an indented box section
	my $self = shift;
	$self->change_state('normal');
	
	if (!$self->{box}) {
		$self->{html} .= '<div class="dx_box">' . "\n";
		$self->{box} = 1;
	}
	else {
		# end box
		$self->{box} = 0;
		$self->{html} .= '</div>' . "\n";
	}
}

sub handler_filesystem {
	# =filesystem File Layout
	# starts new graphical filesystem
	my ($self, $filesystem_title) = @_;
	
	$self->change_state('filesystem', 1);
	
	$self->{filesystem} = {
		html => '<div class="dx_filesystem">'
	};
	
	if ($filesystem_title) {
		$self->{filesystem}->{html} .= '<div class="dx_filesystem_header">' . $filesystem_title . '</div>' . "\n";
	}
}

sub iline_filesystem {
	# add line to filesystem
	my ($self, $line) = @_;
	
	my $indent_level = 0;
	my $tab_char = $self->{args}->{tab_char};
	while ($line =~ s/^$tab_char//) { $indent_level++; }
	
	my $indent_px = ($indent_level * 20);
	my $icon = 'file';
	if ($line =~ m@/$@) { $icon = 'folder'; }
	
	my $icon_img_tag = '<img src="'.$self->{args}->{'icon_'.$icon}.'" width="16" height="16">';
		
	$self->{filesystem}->{html} .= '<div class="dx_filesystem_item" style="margin-left:'.$indent_px.'px;">';
	$self->{filesystem}->{html} .= '<table cellspacing="0" cellpadding="0"><tr><td valign="center" class="dx_filesystem_icon">'.$icon_img_tag.'</td>';
	$self->{filesystem}->{html} .= '<td valign="center" class="dx_filesystem_content_'.$icon.'">'.$self->substitute($line).'</td></tr></table></div>' . "\n";	
}

sub line_filesystem {
	my ($self, $line) = @_;
	$self->change_state('normal');
	$self->line_normal($line);
}

sub leave_state_filesystem {
	# render filesystem
	my $self = shift;
	
	$self->{filesystem}->{html} .= '</div>' . "\n";
	
	$self->{html} .= $self->{filesystem}->{html};
	$self->{html} .= "\n";
}

sub change_state {
	my ($self, $new_state, $force) = @_;
	if (($new_state ne $self->{state}) || $force) {
		$self->log_debug( "Changing state from $self->{state} to $new_state" );
		my $func = 'leave_state_' . $self->{state};
		if ($self->can($func)) { $self->$func(); }
		$self->{state} = $new_state;
		
		$self->manage_chunks();
	} # state differs
}

sub process_link {
	# process inline link
	my $self = shift;
	my $link = shift;
	
	# warn "processing link: $link\n";
	
	if ($self->{args}->{$link}) {
		# found named tag
		return $self->{args}->{$link};
	}
	elsif ($self->{args}->{use_link_cache} && $self->{link_cache}->{$link}) {
		# previously-used link
		return $self->{link_cache}->{$link};
	}
	elsif ($link =~ /^Section\s+([\d\.]+)$/) {
		# inline link to section by number
		my $section_num = $1;
		my $link_id = '_section_' . $section_num;
		$link_id =~ s/\./_/g;
		return '<a href="#'.$link_id.'" class="dx_inline_link">' . $link . '</a>';
	}
	elsif ($link =~ /^wikipedia\:(.+)$/) {
		# link to external wikipedia article
		my $article_name = $1;
		my $link_title = $article_name;
		if ($article_name =~ s/\,\s*(.+)$//) { $link_title = $1; }
		
		my $article_id = $article_name;
		$article_id =~ s@\s+@_@g;
		# $article_id = ucfirst(lc($article_id));
		my $url = 'http://en.wikipedia.org/wiki/' . uri_escape($article_id);
		my $link_html = '<a href="'.$url.'" class="dx_external_link" target="_blank">' . $link_title . '</a>';
		$self->{link_cache}->{$link_title} = $link_html;
		return $link_html;
	}
	elsif ($link =~ /^google\:(.+)$/) {
		# link to google search
		my $search_term = $1;
		my $link_title = $search_term;
		if ($search_term =~ s/\,\s*(.+)$//) { $link_title = $1; }
		
		# http://www.google.com/search?hl=en&btnI=lucky&q=
		my $url = 'http://www.google.com/search?hl=en&q=' . uri_escape($search_term);
		my $link_html = '<a href="'.$url.'" class="dx_external_link" target="_blank">' . $link_title . '</a>';
		$self->{link_cache}->{$link_title} = $link_html;
		return $link_html;
	}
	elsif ($link =~ /^rfc\:(.+)$/) {
		# link to external RFC document
		my $rfc_num = $1;
		my $link_title = 'RFC ' . $rfc_num;
		if ($rfc_num =~ s/\,\s*(.+)$//) { $link_title = $1; }
		
		my $url = 'http://www.faqs.org/rfcs/rfc' . $rfc_num . '.html';
		my $link_html = '<a href="'.$url.'" class="dx_external_link" target="_blank">' . $link_title . '</a>';
		$self->{link_cache}->{$link_title} = $link_html;
		return $link_html;
	}
	elsif ($link =~ /^cpan\:(.+)$/) {
		# link to CPAN module search
		my $search_term = $1;
		my $link_title = $search_term;
		if ($search_term =~ s/\,\s*(.+)$//) { $link_title = $1; }
		my $url = 'http://search.cpan.org/perldoc?' . $search_term;
		my $link_html = '<a href="'.$url.'" class="dx_external_link" target="_blank"><span class="dx_inline_code">' . $link_title . '</span></a>';
		$self->{link_cache}->{$link_title} = $link_html;
		return $link_html;
	}
	elsif ($link =~ /^php\:(.+)$/) {
		# link to PHP function search
		my $search_term = $1;
		my $link_title = $search_term;
		if ($search_term =~ s/\,\s*(.+)$//) { $link_title = $1; }
		my $url = 'http://www.php.net/' . $search_term;
		my $link_html = '<a href="'.$url.'" class="dx_external_link" target="_blank"><span class="dx_inline_code">' . $link_title . '</span></a>';
		$self->{link_cache}->{$link_title} = $link_html;
		return $link_html;
	}
	elsif ($link =~ /^article\:(.+)\/([^\/]+)$/) {
		# link to another effect article
		my ($article_path, $article_id) = ($1, $2);
		if ($article_path !~ /^\//) { $article_path = '/' . $article_path; }
		my $article_title = $article_id; $article_title =~ s/_/ /g;
		
		# support links to anchors inside articles
		my $anchor = '';
		if ($article_id =~ s/\|(.+)$//) {
			my $temp = $1;
			$article_title = $temp; $article_title =~ s/_/ /g;
			
			$temp =~ s/\W+/_/g; # non-alpha to _
			$anchor = '|' . $temp;
		}
		
		$article_id =~ s/\W+/_/g; # non-alpha to _
		if (length($article_id) > 40) { $article_id = substr($article_id, 0, 40); }
		$article_id =~ s/^_+//; # strip leading _
		$article_id =~ s/_+$//; # string trailing _
		
		return '<a href="#Article'.$article_path.'/'.$article_id.$anchor.'" class="dx_inline_link">'.$article_title.'</a>';
	}
	# elsif ($link =~ /^(.+)\,\s*(\w+\:\/\/\S+)$/) {
	# 	# explicit external link with title (title first)
	# 	my ($link_title, $link_url) = ($1, $2);
	# 	my $link_html = '<a href="'.$link_url.'" class="dx_external_link" target="_blank">' . $link_title . '</a>';
	# 	$self->{link_cache}->{$link_title} = $link_html;
	# 	return $link_html;
	# }
	elsif ($link =~ /^icon:(.+)$/) {
		# icon image
		my $icon_name = $1;
		if ($icon_name !~ /\.\w+$/) { $icon_name .= '.gif'; }
		return '<img src="/effect/images/icons/'.$icon_name.'" width="16" height="16" border="0"/>';
	}
	elsif ($link =~ /^(\w+\:\/\/[^\,]+)\,\s*(.+)$/) {
		# explicit external link with title (reversed, url first)
		my ($link_url, $link_title) = ($1, $2);
		my $link_html = '<a href="'.$link_url.'" class="dx_external_link" target="_blank">' . $link_title . '</a>';
		$self->{link_cache}->{$link_title} = $link_html;
		return $link_html;
	}
	elsif ($link =~ /^(\w+\:\/\/\S+)\s+(.+)$/) {
		# explicit external link with title (wiki style)
		my ($link_url, $link_title) = ($1, $2);
		my $link_html = '<a href="'.$link_url.'" class="dx_external_link" target="_blank">' . $link_title . '</a>';
		$self->{link_cache}->{$link_title} = $link_html;
		return $link_html;
	}
	elsif ($link =~ /^\#(\S+)\s+(.+)$/) {
		# explicit internal anchor link with title (wiki style)
		my ($link_url, $link_title) = ($1, $2);
		my $link_html = '<a href="#'.$link_url.'" class="dx_inline_link">' . $link_title . '</a>';
		$self->{link_cache}->{$link_title} = $link_html;
		return $link_html;
	}
	elsif ($link =~ /^(\S+\.(jpe|jpeg|jpg|gif|png|bmp))$/i) {
		# inline image URL
		my $img_html .= '<img class="dx_inline_image" src="'.$link.'"';
		# if ($dest_width && $dest_height) { $img_html .= ' width="'.$dest_width.'" height="'.$dest_height.'"'; }
		$img_html .= '>' . "\n";
		
		return $img_html;
	}
	elsif ($link =~ /^(\/\S+)\s+(.+)$/) {
		# explicit URI link (on site) with title
		my ($link_url, $link_title) = ($1, $2);
		return '<a href="'.$link_url.'" class="dx_external_link" target="_blank">' . $link_title . '</a>';
	}
	elsif ($link =~ /^(\w+\:\/\/\S+)$/) {
		# explicit external link
		my $link_url = $1;
		return '<a href="'.$link_url.'" class="dx_external_link" target="_blank">' . $link_url . '</a>';
	}
	elsif ($self->{section_names}->{lc($link)}) {
		# link to section by name
		# my $link_id = '_section_' . $self->{section_names}->{lc($link)};
		# $link_id =~ s/\./_/g;
		my $link_id = '_section_' . lc($link);
		$link_id =~ s/\W+/_/g;
		return '<a href="#'.$link_id.'" class="dx_inline_link">' . $link . '</a>';
	}
	elsif (($link =~ /^(\w+)\:?(.*)$/) && $self->{inline_handlers}->{$1}) {
		# custom user inline handler
		return $self->{inline_handlers}->{$1}->( $self, $2 );
	}
	else {
		# at this point link should be an error (section names are pre-compiled)
		$self->do_warn("Link not found: $link");
		return '<font color=red><b>'.$link.'</b></font>';
		
		# assume link to future section, add tag for post-processing
		# my $norm_section_name = lc($link); $norm_section_name =~ s@\W+@_@g;
		# return '<=|'.$norm_section_name.'>';
	}
}

sub process_tag {
	# evaluate <=tag>
	my $self = shift;
	my $name = shift;
	
	if (!defined($self->{args}->{$name})) {
		$self->do_warn( "Link not found: $name" );
		return '<font color=red><b>'.$name.'</b></font>';
	}
	
	return $self->{args}->{$name};
}

sub make_url_link {
	##
	# Convert URL to <a href> link, stripping trailing symbols
	##
	my $url = shift;
	my $after = '';

	if ($url =~ s/([\)\.\,]+)$//) {
		$after = $1;
	}
	return '<a href="' . $url . '" class="dx_external_link" target="_blank">' . $url . '</a>' . $after;
}

sub make_email_link {
	##
	# Convert email address to mailto link, stripping trailing symbols
	##
	my $email = shift;
	my $after = '';

	if ($email =~ s/([\)\.\,]+)$//) {
		$after = $1;
	}
	return '<a href="mailto:' . $email . '" class="dx_mailto_link">' . $email . '</a>' . $after;
}

sub make_inline_code {
	# format inline code
	my $code = shift;
	# $code =~ s/\&/&amp;/g;
	# $code =~ s@([\*\|])@ '&#'.ord($1).';'; @eg;
	$code =~ s@([\*\|\{\}\[\]\\\@\:])@ '&#'.ord($1).';'; @eg; # escape chars
	$code =~ s/</&lt;/g;
	$code =~ s/>/&gt;/g;
	$code =~ s/\s/&nbsp;/g;
	
	return '<span class="dx_inline_code">'.$code.'</span>';
}

sub substitute {
	# inline substitution and styling
	my $self = shift;
	my $text = shift;
	
	$text =~ s@\\([\*\|\{\}\<\>\[\]\\\&])@ '&#'.ord($1).';'; @eg; # explicit escape chars
	$text =~ s@[\{\`](.+?)[\}\`]@ make_inline_code($1); @eg;
	$text =~ s@\*(.+?)\*@<b>$1</b>@g; # bold
	$text =~ s@\|(.+?)\|@<i>$1</i>@g; # italics
	$text =~ s@(^|[^\[\"\(])((https?|ftp)://\S*)@ $1.make_url_link($2); @eig;
	
	# if ($self->{args}->{use_link_cache}) {
	# 	foreach my $link (keys %{$self->{link_cache}}) {
	# 		$text =~ s@([^\:])\b($link)\b([^\]])@ $1.$self->{link_cache}->{$link}.$3; @eg;
	# 	}
	# }
	if (check_boolean_arg($self->{args}->{email_links})) { $text =~ s@([\w\-\.]+\@[\w\-\.]+\.\w+)@ make_email_link($1); @eig; }
	$text =~ s@\[((?!\=).+?)\]@ $self->process_link($1); @eg;
		
	return $text;
}

sub do_error {
	my $self = shift;
	my $msg = shift;
	
	my $line = $self->{current_line};
	my $line_num = $self->{current_line_num} + 1;
	
	if ($line_num) {
		$msg .= " on line $line_num ($line)";
	}
	
	die "\nFATAL ERROR: $msg\n\n";
}

sub do_warn {
	my $self = shift;
	my $msg = shift;
	my $verbose = shift;
	if (!defined($verbose)) { $verbose = 1; }
	
	my $line_num = $self->{current_line_num} + 1;
	
	if ($line_num && $verbose) {
		$msg .= " (on line $line_num)";
	}
	
	$self->log_debug( "Warning: $msg" );
	push @{$self->{warnings}}, $msg;
}

sub log_debug {
	my $self = shift;
	my $msg = shift;
	if ($self->{args}->{debug}) {
		if (ref($self->{args}->{debug})) { $self->{args}->{debug}->log_debug(5, $msg); }
		else { warn "$msg\n"; }
	}
}

sub check_boolean_arg {
	# interpret literal boolean string ("true", "false")
	my $value = shift;
	return $value !~ /^(false|off|no|0|hide|disable)$/i;
}

sub fix_line_endings {
	##
	# Convert DOS/MAC line endings to UNIX style
	##
	my $contents = shift;
	$contents =~ s/\r\n/\n/sg;
	$contents =~ s/\r/\n/sg;
	return $contents;
}

sub manage_chunks {
	##
	# Auto-split document into chunks, for "streaming"
	##
	my $self = shift;
	if ($self->{box}) { return; }
	
	if ((!@{$self->{chunk_locs}} && (length($self->{html}) >= $self->{chunk_size})) || (length($self->{html}) - $self->{chunk_locs}->[-1] >= $self->{chunk_size})) {
		push @{$self->{chunk_locs}}, length($self->{html});
	} # need chunk
}

sub finalize_chunks {
	##
	# Create real chunks (only offsets are stored during compilation)
	##
	my $self = shift;
	$self->{chunks} = [];
	
	my $last_loc = 0;
	foreach my $loc (@{$self->{chunk_locs}}) {
		if ($loc > $last_loc) {
			push @{$self->{chunks}}, substr($self->{html}, $last_loc, $loc - $last_loc);
			$last_loc = $loc;
		}
	}
	
	if ($last_loc < length($self->{html})) {
		push @{$self->{chunks}}, substr($self->{html}, $last_loc);
	}
}

# syntax hilighting

sub setup_highlight {
	my $self = shift;
	
	my $format_table = {
	   Alert => ["<span class=\"Alert\">", "</span>"],
	   BaseN => ["<span class=\"BaseN\">", "</span>"],
	   BString => ["<span class=\"BString\">", "</span>"],
	   Char => ["<span class=\"Char\">", "</span>"],
	   Comment => ["<span class=\"Comment\">", "</span>"],
	   DataType => ["<span class=\"DataType\">", "</span>"],
	   DecVal => ["<span class=\"DecVal\">", "</span>"],
	   Error => ["<span class=\"Error\">", "</span>"],
	   Float => ["<span class=\"Float\">", "</span>"],
	   Function => ["<span class=\"Function\">", "</span>"],
	   IString => ["<span class=\"IString\">", "</font>"],
	   Keyword => ["<span class=\"Keyword\">", "</span>"],
	   Normal => ["<span class=\"Normal\">", "</span>"],
	   Operator => ["<span class=\"Operator\">", "</span>"],
	   Others => ["<span class=\"Others\">", "</span>"],
	   RegionMarker => ["<span class=\"RegionMarker\">", "</span>"],
	   Reserved => ["<span class=\"Reserved\">", "</span>"],
	   String => ["<span class=\"String\">", "</span>"],
	   Variable => ["<span class=\"Variable\">", "</span>"],
	   Warning => ["<span class=\"Warning\">", "</span>"],
	};

	my $subs_table = {
       "<" => "&lt;",
       ">" => "&gt;",
       "&" => "&amp;",
      # " " => "&nbsp;",
       "\t" => "&nbsp;&nbsp;&nbsp;",
       "\n" => "<BR>\n",
    };
	
	$self->{hl_xml} = new Syntax::Highlight::Engine::Kate::XML(
		substitutions => $subs_table,
	    format_table => $format_table
	);
	
	$self->{hl_xsl} = new Syntax::Highlight::Engine::Kate::Xslt(
		substitutions => $subs_table,
	    format_table => $format_table
	);

	$self->{hl_html} = new Syntax::Highlight::Engine::Kate::HTML(
		substitutions => $subs_table,
	    format_table => $format_table
	);

	$self->{hl_js} = new Syntax::Highlight::Engine::Kate::JavaScript(
		substitutions => $subs_table,
	    format_table => $format_table
	);
	
	##
	# Some Effect specific modifications...
	##
	$self->{hl_js}->listAdd('events', 
		@{ $self->{hl_js}->lists->{events} },
		'onInit',
		'onLoadGame',
		'onLoadLevel',
		'onLogic',
		'onDraw',
		'onPause',
		'onResume',
		'onMouseDown',
		'onMouseUp',
		'onMouseMove',
		'onKeyDown',
		'onKeyUp',
		'onMouseWheel',
		'onBeforeToolbarIconInit',
		'onAfterToolbarIconInit',
		'onDisableMusic',
		'onEnableMusic',
		'onDisableSound',
		'onEnableSound',
		'onZoom'
	);
	# $self->{hl_js}->listAdd('functions');
	$self->{hl_js}->listAdd('keywords',
		@{ $self->{hl_js}->lists->{keywords} },
		'null'
	);
	# $self->{hl_js}->listAdd('methods');
	$self->{hl_js}->listAdd('objects',
		@{ $self->{hl_js}->lists->{objects} },
		'Effect',
		'Game',
		'Port',
		'Audio',
		'ImageLoader',
		'Class',
		'Namespace'
	);
	
	$self->{hl_js}->listAdd('methods',
		@{ $self->{hl_js}->lists->{methods} },
		'__construct', '__static', 'assert'
	);
	
	remove_from_array( $self->{hl_js}->lists->{methods}, 'left' );
	
	# use Data::Dumper;
	# die Dumper $self->{hl_js}->lists->{keywords};

	$self->{hl_perl} = new Syntax::Highlight::Engine::Kate::Perl(
		substitutions => $subs_table,
	    format_table => $format_table
	);

	$self->{hl_php_html} = new Syntax::Highlight::Engine::Kate::PHP_HTML(
		substitutions => $subs_table,
	    format_table => $format_table
	);

	$self->{hl_php_php} = new Syntax::Highlight::Engine::Kate::PHP_PHP(
		substitutions => $subs_table,
		format_table => $format_table
	);
	
	$self->{hl_cpp} = new Syntax::Highlight::Engine::Kate::Cplusplus(
		substitutions => $subs_table,
	    format_table => $format_table
	);
	
	$self->{hl_bash} = new Syntax::Highlight::Engine::Kate::Bash(
		substitutions => $subs_table,
	    format_table => $format_table
	);
	
	$self->{hl_css} = new Syntax::Highlight::Engine::Kate::CSS(
		substitutions => $subs_table,
	    format_table => $format_table
	);
	
	$self->{hl_sql} = new Syntax::Highlight::Engine::Kate::SQL(
		substitutions => $subs_table,
	    format_table => $format_table
	);
}

sub highlight_xml { my ($self, $text) = @_; return ''.$self->{hl_xml}->highlightText($text); }
sub highlight_xsl { my ($self, $text) = @_; return ''.$self->{hl_xsl}->highlightText($text); }
sub highlight_xslt { my ($self, $text) = @_; return ''.$self->{hl_xsl}->highlightText($text); }
sub highlight_html { my ($self, $text) = @_; return ''.$self->{hl_html}->highlightText($text); }
sub highlight_js {
	my ($self, $text) = @_; 
	my $html = ''.$self->{hl_js}->highlightText($text);
	$html =~ s/\b(this|true|false)\b/<span class="Keyword">$1<\/span>/g;
	return $html;
}
sub highlight_javascript { return highlight_js(@_); }
sub highlight_perl { my ($self, $text) = @_; return ''.$self->{hl_perl}->highlightText($text); }
sub highlight_php {
	my ($self, $text) = @_;
	if ($text !~ m@<\?@) {
		my $temp = ''.$self->{hl_php_html}->highlightText( '<?php' . $text . '?>' );
		$temp =~ s/\&lt\;\?php//; $temp =~ s/\?\&gt\;//; return $temp;
	}
	else { return ''.$self->{hl_php_html}->highlightText($text); }
}
sub highlight_cpp { my ($self, $text) = @_; return ''.$self->{hl_cpp}->highlightText($text); }
sub highlight_c { my ($self, $text) = @_; return ''.$self->{hl_cpp}->highlightText($text); }
sub highlight_bash { my ($self, $text) = @_; return ''.$self->{hl_bash}->highlightText($text); }
sub highlight_shell { my ($self, $text) = @_; return ''.$self->{hl_bash}->highlightText($text); }
sub highlight_sh { my ($self, $text) = @_; return ''.$self->{hl_bash}->highlightText($text); }
sub highlight_css { my ($self, $text) = @_; return ''.$self->{hl_css}->highlightText($text); }
sub highlight_sql { my ($self, $text) = @_; return ''.$self->{hl_sql}->highlightText($text); }

1;
