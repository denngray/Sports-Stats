load('sbbsdefs.js');
load('json-client.js');
load('frame.js');
load('tree.js');
load('js-date-format.js');

// some of the custom functions I'm using
load(js.exec_dir + "helper-functions.js");


// Global sports data cache
var sportsData = null;

var f = new File(js.exec_dir + "server.ini");
f.open("r");
var serverIni = f.iniGetObject();
f.close();


// CHARACTER SET NOTE:
// I edit this document in BBedit on the Mac. I've found I only get the right characters 
// if I save it in Western (Mac OS Roman) encoding. 

// COLORS
var lowWhite = 'NW0';
var highWhite = 'HW0';
var lowCyan = 'NC0';
var highCyan = 'HC0';
var highBlack = 'HK0';
var highYellowDarkBlue = 'HY4';
var highWhiteDarkCyan = 'HW6';
var ansiNormal = '\033[0m';

// CHARACTERS
var charHorizSingle = ascii(196);
var charHorizSingleDownDouble = ascii(210);
var charVertDouble = ascii(186);
var frac12 = ascii(171);

// Temporary favorites placeholder
// Eventually this will become a setting the user can configure
// and save in the JSON datastore.
var favorite = 'Spurs';

// Frame for the whole app
var frame = new Frame(1, 1, 80, 24, BG_BLACK);

// user settings
var u = new Object();
u.favorites = [];
u.alias = '';
u.system = '';

var treeFrame, treeSubFrame, tree, subtree;
var headerFrame, instructFrame, sports;
// Get data slice by sport, method, and/or date.
// If sports data has not been loaded from jsonClient, it will fetch and store.
function getData(sport,method,date) {
	sport  = sport  || 'mlb';
	method = method || null;
	date   = date   || null;
	if ( !sportsData ) {
		try {
			var jsonClient = new JSONClient(serverIni.host, serverIni.port);
			var data = jsonClient.read("SPORTSSTATS", "SPORTSSTATS", 1);
			if (data === undefined) {
				log("SportsStats > JSON client error: jsonClient returned undefined");
				return false;
			}
			else {
				sportsData = data
			}
		}
		catch(err) {
			log("SportsStats > JSON client error: " + err)
			return false;
		}
	}
	if (sport == 'dates') {
		return sportsData[ sport.toUpperCase() ];
	}
	else if (method == 'standings') {
		return sportsData[ sport.toUpperCase() ][ method.toUpperCase() ];
	}
	else {
		return sportsData[ sport.toUpperCase() ][ date ];
	}

	return false;
}



function cleanName(str,method) {
	method  = method  || 'standings';
	var replacements = [];

	if (method == 'standings') {
		replacements = [
	//		['^' : '',
			[/^NL$/i, 'National'],
			[/^AL$/i, 'American'],
			[/^C$/i, 'Central'],
			[/^E$/i, 'East'],
			[/^W$/i, 'West'],
			[/^SW$/i, 'Southwest'],
			[/^CEN$/i, 'Central'],
			[/^ATL$/i, 'Atlantic'],
			[/^NW$/i, 'Northwest'],
			[/^SE$/i, 'Southeast'],
			[/^PAC$/i, 'Pacific'],
			[/^New York Jets/i, 'NY Jets'],
			[/^New York Giants/i, 'NY Giants'],
			[/^Trail Blazers/i, 'TrailBlazers'],
			[/^Golden Knights/i, 'G. Knights'],
			[/^Blue Jackets/i, 'BlueJackets']
		];
	}
	else if (method == 'events') {
		replacements = [
	//		['^' : '',
			[/^Diamondbacks/i, 'D\'Backs'],
			[/^Trail Blazers/i, 'T Blazers'],
			[/^Timberwolves/i, 'T\'wolves'],
			[/^Blue Jackets/i, 'BlueJackets'],
			[/University/i, 'U.'],
			[/America/i, 'Amer.'],
			[/Mercedes-Benz Superdome/i, 'Superdome'],
			[/Financial/i, 'Fin.'],
			[/Stadium/i, 'Std.'],
			[/Los Angeles Memorial/i, 'Std.']
		];
	}

	var len = replacements.length;
	for (var i = 0; i < len; i++) {
		var replacement = replacements[i];
		str = str.replace(replacement[0], replacement[1]);
	}
	return str;
}


function outputConf(conference,sport) {
	var confName = ' ' + cleanName(conference).toLowerCase();
	var theName = confName.ljust('14');
	var theWon  = 'w'.rjust('3');
	var theLost = 'l'.rjust('5');
	var theTied = '';
	var thePct  = 'pct'.rjust('6');
	var theGB   = 'gb '.rjust('5');
	var theL10  = 'l10'.rjust('5');
	// NFL does not have GB or L10.
	// Replace with TD and L5.
	if (sport == 'nfl') {
		theWon  = 'w'.rjust('2');
		theLost = 'l'.rjust('3');
		theTied = 't'.rjust('3');
		theName = confName.ljust('12');
		theGB   = ' pf'.rjust('4') + ' pa'.rjust('4');
		theL10  = 'str'.rjust('4');
	}
	else if (sport == 'nhl') {
		theWon  = 'w'.rjust('3');
		theLost = 'l'.rjust('3');
		theTied = 'ot'.rjust('3');
		thePct  = 'pts'.rjust('4');
		theName = confName.ljust('12');
		theGB   = ' gf'.rjust('4') + ' ga'.rjust('4');
		theL10  = 'l10'.rjust('6');
	}

	return lowCyan + theName + highBlack + theWon + theLost + theTied + thePct + theGB + theL10;
}

function outputDiv(division) {
	division = charHorizSingle.repeat(2) + ' ' + cleanName(division).toLowerCase() + ' ';
	var theName = division.ljust('39',charHorizSingle);
	return highBlack + theName;
}


function outputTeam(team,key,sport) {
	var colorCode;
	var teamName = cleanName( team.last_name.toString() );
	// NFL team names are shorter.
	// NFL doesn't reach triple digit Ws or Ls.
	// NFL lacks GB or L10, so replace with PF, PA, and L5.
	if (sport == 'nfl') {
		var theName = ' ' + teamName.ljust('11');
		var theWon  = team.won.toString().rjust('2');
		var theLost = team.lost.toString().rjust('3');
		var theTied = team.tied.toString().rjust('3');
		var thePct  = team.win_percentage.toString().rjust('6');
		var theGB = team.points_for.toString().rjust('4') + team.points_against.toString().rjust('4');
		var theL10  = team.streak.toString().rjust('4');
	}
	else if (sport == 'nhl') {
		var theName = ' ' + teamName.ljust('11');
		var theWon  = team.won.toString().rjust('3');
		var theLost = team.lost.toString().rjust('3');
		var theTied = team.ot.toString().rjust('3');
		var thePct  = team.points.toString().rjust('4');
		var theGB = team.goals_for.toString().rjust('4') + team.goals_against.toString().rjust('4');
		var theL10  = team.last_ten.toString().rjust('6');
	}

	else {
		var theName = ' ' + teamName.ljust('13');
		var theWon  = team.won.toString().rjust('3');
		var theLost = team.lost.toString().rjust('5');
		var theTied = '';
		var thePct  = team.win_percentage.toString().rjust('6');
		var gb = team.games_back;
		if ( !hasDecimal(gb) ) {
			gb = team.games_back.toString() + ' ';
		}
		else {
			gb = team.games_back.toString().replace('.5',frac12);
		}
		var theGB   = gb.rjust('5');
		var theL10  = team.last_ten.toString().rjust('5');
	}


	if ( favorite == teamName ) {
		colorCode = highYellowDarkBlue;
	}
	else if (key == 0) {
		colorCode = highWhite;
	}
	else {
		colorCode = lowWhite;
	}
	return colorCode + theName + theWon + theLost + theTied + thePct + theGB + theL10;
}







function chooseSport() {
	console.clear();
	frame.cycle();
	var mysport = '';
	var byDivision = true;

	headerFrame = new Frame(1, 1, 80, 3, BG_BLACK, frame);
	headerFrame.load(js.exec_dir + 'graphics/header.bin', 80, 3);
	headerFrame.gotoxy(3,2);
	var sportHeader = "sports stats";
	sportHeader = sportHeader.split('').join(' ');
	headerFrame.putmsg(highCyan + sportHeader);
	headerFrame.gotoxy(65,2);
	headerFrame.putmsg(highBlack + "by Josh Renaud");
	headerFrame.draw();

	instructFrame = new Frame(1, 5, 80, 3, BG_BLACK, frame);
	var message = highBlack + '[Arrows]' + lowWhite + ' Navigate   ' + highBlack + '|   [Enter]' + lowWhite + ' Make selection   ' + highBlack + '|   [Q]' + lowWhite + ' Quit';
	instructFrame.center( message.center(80) );
	instructFrame.draw();

	sports = [
		{ 
			'sport' : 'nba',
			'selected' : 'graphics/basketball.bin',
			'unselected' : 'graphics/basketball-gray.bin',
			'width' : 15,
			'height' : 10,
			'frame' : new Frame(2, 6, 15, 10, BG_BLACK, frame)
		},
		{ 
			'sport' : 'mlb',
			'selected' : 'graphics/baseball.bin',
			'unselected' : 'graphics/baseball-gray.bin',
			'width' : 12,
			'height' : 10,
			'frame' : new Frame(19, 6, 12, 10, BG_BLACK, frame)
		},
		{ 
			'sport' : 'nhl',
			'selected' : 'graphics/hockey-puck.bin',
			'unselected' : 'graphics/hockey-puck-gray.bin',
			'width' : 15,
			'height' : 10,
			'frame' : new Frame(34, 6, 15, 10, BG_BLACK, frame)
		},
		{ 
			'sport' : 'nfl',
			'selected' : 'graphics/football.bin',
			'unselected' : 'graphics/football-gray.bin',
			'width' : 27,
			'height' : 10,
			'frame' : new Frame(52, 6, 27, 10, BG_BLACK, frame)
		}
	];

	for (var i=0; i<sports.length; i++) {
		var image = js.exec_dir + sports[i]['unselected'];
		if (i == 0) { image = js.exec_dir + sports[i]['selected']; }
		sports[i]['frame'].load(
			image, 
			sports[i]['width'], 
			sports[i]['height']
		); 
		sports[i]['frame'].draw();
	}


	var userInput = '';
	var currentSport = 0;
	var prevSport = 0;
	while( ascii(userInput) != 13 ) {
		userInput = console.getkey(K_UPPER | K_NOCRLF);
		if ( userInput == KEY_LEFT || userInput == KEY_RIGHT ||  userInput == KEY_UP || userInput == KEY_DOWN ) {
			// LEFT
			if ( userInput == KEY_LEFT || userInput == KEY_UP ) {
				if ( currentSport != 0 ) { 
					prevSport = currentSport;
					currentSport--;
				}
				else if ( currentSport == 0 ) {
					prevSport = currentSport;
					currentSport = sports.length-1;
				}
			}
			// RIGHT
			else if ( userInput == KEY_RIGHT || userInput == KEY_DOWN ) {
				if ( currentSport != 3 ) { 
					prevSport = currentSport;
					currentSport++;
				}
				else if ( currentSport == sports.length-1 ) {
					prevSport = currentSport;
					currentSport = 0;
				}
			}
			sports[prevSport]['frame'].load(
				js.exec_dir + sports[prevSport]['unselected'], 
				sports[prevSport]['width'], 
				sports[prevSport]['height']
			); 
			sports[currentSport]['frame'].load(
				js.exec_dir + sports[currentSport]['selected'], 
				sports[currentSport]['width'], 
				sports[currentSport]['height']
			); 
			sports[prevSport]['frame'].draw();
			sports[currentSport]['frame'].draw();
		} // end if 
		else if ( userInput == "P" ) {
			setPreferences();
		}
		else if ( userInput == "Q" ) {
			cleanUp();
			exit();
		}

	} // end while

	mysport = sports[currentSport]['sport'];
	

	// Decide if we should display conference standings instead of division
	if (mysport == 'nhl' || mysport == 'nba') {
		var d = new Date();
		var month = d.getMonth();
		// display NBA/NHL conference standings from April-September. 
		if (month >= 3 && month < 9 ) { byDivision = false; }
	}
	
	// GRAB DATES
	// I moved this higher up, because if there are no dates in the NFL,
	// then there is no point to displaying a "scores/schedule" option.
	// To remove that option, I first have to check the dates.
	// As noted below, all of this date stuff is really messy. I need to work
	// out a more robust system for figuring out when it's the offseason in
	// the NFL, etc.

	var datesFromJson = getData('dates');

	// NFL schedules are weekly, not daily
	if (mysport == 'nfl') {
		var dates = [
			{ 'date': datesFromJson['lastweek'], 'name': 'Last week' },
			{ 'date': datesFromJson['thisweek'], 'name': 'This week' },
			{ 'date': datesFromJson['nextweek'], 'name': 'Next week' }
		];

	}
	// All other sports use daily schedules
	else {
		var dates = [
			{ 'date': datesFromJson['yesterday'], 'name': 'Yesterday' },
			{ 'date': datesFromJson['today'], 'name': 'Today' },
			{ 'date': datesFromJson['tomorrow'], 'name': 'Tomorrow' }
		];
	}

	// TEMPORARY FIX
	// I need to do more work about how to handle postseason and offseason.
	// For now in the NFL, I am storing "nextweek" as a null value
	// because nflgame won't return a schedule for next week.
	// In the future I want to store a value for each league indicating
	// whether a particular date/week is pre/reg/post/off-season. Then I
	// could customize these menu options depending on the season's phase.

	// If any of the dates are null, then let's remove them
	for(var i = dates.length -1; i >= 0; i--) {
		if ( dates[i]['date'] == null ) {
			dates.splice(i, 1);
		}
	}
	// END TEMPORARY FIX


	var optionsX = sports[currentSport]['frame'].x;	
	var optionsY = sports[currentSport]['frame'].y + sports[currentSport]['frame'].height + 1;	
	var optionsW = sports[currentSport]['frame'].width;

	treeFrame = new Frame(optionsX, optionsY, optionsW, 5, BG_BLACK, frame);
	treeSubFrame = new Frame(optionsX, optionsY, optionsW, 5, BG_BLACK, treeFrame);

	// Only show Scores/Schedules option if there are actually dates in the
	// JSON datastore.
	if (dates.length > 0) {
		var options = [
			{ 'option': 'standings', 'name': 'Standings' },
			{ 'option': 'events', 'name': 'Scores/Games' }
		];
	}
	else {
		var options = [
			{ 'option': 'standings', 'name': 'Standings' }
		];
	}

	tree = new Tree(treeSubFrame);
	subtree = null;
	tree.colors.fg = LIGHTGRAY;
	tree.colors.bg = BG_BLACK;
	tree.colors.lfg = YELLOW;
	tree.colors.lbg = BG_BLUE;
	tree.colors.cfg = YELLOW;
	tree.colors.cbg = BG_BLUE;
	tree.colors.tfg = DARKGRAY;
	tree.colors.xfg = DARKGRAY;

	for (var i=0; i<options.length; i++) {
		if (i==0) {
			tree.addItem(options[i]['name'], switcher, mysport, options[i]['option'], byDivision);
		}
		if (i==1) {
			subtree = tree.addTree(options[i]['name']);
		}
	}
	for (var i=0; i<dates.length; i++) {
		subtree.addItem(dates[i]['name'], switcher, mysport, 'events', dates[i]['date']);
	}
	//if (subtree) ( subtree.open() );

	treeFrame.open();
	tree.open();
	treeFrame.draw();

	var userInput;
	while ( !js.terminated ) {
		userInput = console.inkey(K_NONE, 5);
		if (userInput) {
			if ( ascii(userInput) == 27 || userInput.toUpperCase() == 'Q' )  {
				treeFrame.delete();
				treeSubFrame.delete();
				instructFrame.delete();
				headerFrame.delete();
				cleanUp();
				exit();
			}
			tree.getcmd(userInput);
			tree.cycle();
		}
	}
	treeFrame.delete();
	treeSubFrame.delete();
	instructFrame.delete();
	headerFrame.delete();
	cleanUp();
	exit();
}


function switcher(sport, option, param) {
	if (typeof sport != undefined && typeof option != undefined && typeof param != undefined ) {
		frame.invalidate();
		frame.cycle();

		for (var s=0; s<sports.length; s++) {
			sports[s]['frame'].delete();
		}
		headerFrame.delete();
		instructFrame.delete()
		treeFrame.delete();
		treeSubFrame.delete();

		tree = null;
		subtree = null;

		if (option == 'standings') { displayStandings(sport,param); }
		else if (option == 'events') { displayScores(sport,param); }
	}
}



// ##################################
// ### 
// ### SET PREFERENCES
// ### 
// ##################################

function setPreferences() {
	console.clear();
	frame.cycle();

	chooseSport();
}



// ##################################
// ### 
// ### SCOREBOARD
// ### 
// ##################################

function displayScores(sport,date) {
	sport = sport || 'mlb';
	date = date || new Date().format('mmddYYYY');
	var json;

	headerFrame = new Frame(1, 1, 80, 2, BG_BLACK, frame);
	headerFrame.load(js.exec_dir + 'graphics/header-compact2.bin', 80, 1);
	headerFrame.gotoxy(2,1);
	var sportHeader = sport + ' scoreboard';
	headerFrame.putmsg(highWhiteDarkCyan + sportHeader);
	headerFrame.draw();

	// Display scores
	var method = "events";
	var eventsJson = getData(sport,method,date);

	// Make sure we actually got data
	if (eventsJson) {
		var statDate = eventsJson['events_date'].split('T')[0];

		var dateHeader = statDate;
		if (sport == 'nfl') {
			var weekStr = date.toString().charAt(4) + '' + date.toString().charAt(5);
			var weekInt = parseInt( weekStr );
			var phase = '';
			if ( weekInt <= 4 ) {
				phase = ' (PRE)';
			}
			else if ( weekInt > 21 ) {
				phase = ' (POST)';
				weekInt = weekInt - 4
			}
			else {
				// Regular season
				weekInt = weekInt - 4
			}
			weekStr = weekInt.toString();
			var dateHeader = 'Week ' + weekStr + phase;
		}

		// add the date to header bar
		headerFrame.gotoxy(63,1);
		headerFrame.putmsg(highBlack + dateHeader);
		headerFrame.draw();

		// Check if any events are actually scheduled
		if (eventsJson.event.length < 1) {
			instructFrame = new Frame(1, 6, 80, 3, BG_BLACK, frame);
			instructFrame.center(lowWhite + 'No games scheduled on this date.');
			instructFrame.crlf();
			instructFrame.crlf();
			instructFrame.center(lowWhite + 'Press any key to continue.');
			instructFrame.draw();
			frame.cycle();
			console.getkey();
			// clean up and return to main menu
			headerFrame.delete();
			instructFrame.delete();
			chooseSport();
		}
		// Yep, looks like we do have events.
		else {
			// Whittle down to just the actual event objects.
			// Then convert the single array into chunks of 8 events,
			// which is most games we can fit on screen at once
			var chunks = chunk(eventsJson.event,8);

			var chunksLen = chunks.length;
			for (var h=0; h<chunksLen; h++) {
				var scoreFrame = new Frame(1, 3, 80, 19, BG_BLACK, frame);

				// Iterate over the events in this chunk 
				var events = chunks[h];
				var eventsLen = events.length;
	
				for (var i=0; i<eventsLen; i++) {

					var event = events[i];
					// display box score
					if ( event.event_status == "completed" && typeof event['away_period_scores'] !== 'undefined' && event['away_period_scores'].length > 0) {
						// number of periods
						var len = event['away_period_scores'].length;
						// default padding between columns
						var paddingAmt = 2;
						// default padding before vertical pipes
						var paddingEndAmt = 2;
						// if we went more than one OT, use smaller padding
						if (len > 5) {
							paddingAmt = 0;
						}
						// Generate the padding
						var padding = ' '.repeat(paddingAmt);
						var paddingEnd = ' '.repeat(paddingEndAmt);
						// length of team column
						if (sport == 'nhl') {
							var teamLen = 12;
						}
						else if (sport == 'nfl') {
							var teamLen = 11;
						}
						else {
							var teamLen = 10;
						}
						// Width of all period columns (not including padding)
						var periodLen = 2*len;
						// Width of total column
						var totalLen = 3;
						// padding before each period and before spacer
						var paddingLen = (paddingAmt * len) + paddingAmt;
						// Length of topLine before the joint
						var lineLen1 = teamLen + periodLen + paddingLen;
						// Length of topLine after the joint
						var lineLen2 = totalLen + 1;

						var home = (' ' + cleanName(event.home_team.last_name,'events')).ljust(teamLen);
						var away = (' ' + cleanName(event.away_team.last_name,'events')).ljust(teamLen);
						var homeScore = event['home_points_scored'];
						var awayScore = event['away_points_scored'];

						var homeColor = lowWhite;
						var awayColor = lowWhite;
						if ( homeScore > awayScore ) { homeColor = highWhite; }
						else { awayColor = highWhite; }



						// BUILD THE BOX SCORE
						// Previously I used a line-by-line method, which was
						// inefficient, since I was using a for-loop to iterate over
						// the periods for each line.
						// Now I'm using just one loop. The advantage is that this 
						// will let me set extra padding on cells that need it.

						// start of label line
						var labelLine = highBlack + ''.toString().ljust(teamLen);

						// start of top gray line
						var topLine = highBlack;
						for (var j=0; j < teamLen; j++) {
							topLine += charHorizSingle;
						}

						// start of away team line
						var awayLine = awayColor + away;

						// start of home team line
						var homeLine = homeColor + home;


						// Iterate over the periods
						for (var j=0; j < len; j++) {
							var period = j + 1;

							// Need to reduce first period padding in NHL
							var thePadding = padding;
							if (sport == 'nhl' && j == 0) {
								thePadding = thePadding.slice(1);
							}

							var awayPeriodScore = event['away_period_scores'][j];
							var homePeriodScore = event['home_period_scores'][j];
							// NEED TO ADD
							// Put a subroutine here (for MLB) to check 
							// if an inning had a double-digit score. If so,
							// increase the size of the cell on all lines.


							// PERIOD LABEL
							labelLine += thePadding;
							if (sport == 'mlb') {
								labelLine += period.toString().rjust(2); 
							}
							else if ( sport == 'nba' || sport == 'nfl' ) {
								if (period < 5) { 
									labelLine += period.toString().rjust(2); 
								}
								else { 
									labelLine += 'ot'.rjust(2);
								}
							}
							else if ( sport == 'nhl' ) {
								if (period < 4) { 
									labelLine += period.toString().rjust(2); 
								}
								else if (period < 5) {  
									labelLine += 'ot'.rjust(2);
								}
								else {  
									labelLine += 'so'.rjust(2);
								}
							}

							// GRAY PIPE
							var pipePadding = 2 + paddingAmt;
							// Need to reduce first period padding in NHL
							if (sport == 'nhl' && j == 0) {
								pipePadding -= 1;
							}
							topLine += ''.rjust(pipePadding, charHorizSingle);

							// AWAY SCORE
							awayLine += thePadding;
							awayLine += awayPeriodScore.toString().rjust(2);

							// HOME SCORE
							homeLine += thePadding;
							// In MLB, -1 indicates home team didn't bat in 9th inning
							if (homePeriodScore < 0) {
								homeLine += '-'.rjust(2);
							}
							else {
								homeLine += homePeriodScore.toString().rjust(2);
							}

						}

						// BUILD END OF LABEL LINE
						// this is the joint
						labelLine += paddingEnd + ' ';
						// totals
						labelLine += ''.rjust((paddingEndAmt-1),' ') + 'tot'.toString().rjust(3);

						// BUILD END OF TOP GRAY LINE
						// add the joint
						topLine += ''.rjust(paddingEndAmt, charHorizSingle);
						topLine += charHorizSingleDownDouble;
						for (var j=0; j < lineLen2; j++) {
							topLine += charHorizSingle;
						}

						// BUILD AWAY TEAM LINE
						awayLine += paddingEnd;
						awayLine += highBlack + charVertDouble;
						awayLine += paddingEnd + awayColor + awayScore.toString().rjust(2);

						// BUILD HOME TEAM LINE
						homeLine += paddingEnd;
						homeLine += highBlack + charVertDouble;
						homeLine += paddingEnd + homeColor + homeScore.toString().rjust(2);


						if ( isOdd(i) ) { 
							var y = ( (i-1) / 2 ) * 5; 
							var x = 42;
						} 
						else { 
							var y = ( i / 2 ) * 5; 
							var x = 1;
						} 

						scoreFrame.gotoxy(x,y+1);
						scoreFrame.putmsg(labelLine);
						scoreFrame.gotoxy(x,y+2);
						scoreFrame.putmsg(topLine);
						scoreFrame.gotoxy(x,y+3);
						scoreFrame.putmsg(awayLine);
						scoreFrame.gotoxy(x,y+4);
						scoreFrame.putmsg(homeLine);

						//debug(labelLine + '\r\n' + topLine +  '\r\n' + awayLine +  '\r\n' + homeLine +  '\r\n');
						//debug('i: ' + i + '  |  i%4:' + i%4);

					} // if game is completed

					// This is a matchup, not a box score
					else {
						// 39
						var away = cleanName(event.away_team.last_name).rjust(16) + ' ';
						var home = (' ' + cleanName(event.home_team.last_name)).ljust(17);
						var eventStartTime = new Date(event.start_date_time).format('h:mm tt');
						eventStartTime = eventStartTime.replace(':00','');
						var eventStartDay = '';
						var site = '';
						if (sport == 'nfl') {
							eventStartDay = new Date(event.start_date_time).format('MMM D');
							eventStartTime = (' ' + eventStartTime + ', ' + eventStartDay ).ljust(16);
							site = cleanName( event.site.name, 'events' ).rjust(20);
						}
						else {
							eventStartTime = (' ' + eventStartTime ).ljust(10);
							site = event.site.name.rjust(26);
						}

						if ( isOdd(i) ) { 
							var y = ( (i-1) / 2 ) * 5; 
							var x = 42;
						} 
						else { 
							var y = ( i / 2 ) * 5; 
							var x = 0;
						} 

						scoreFrame.gotoxy(x,y+1);
						scoreFrame.putmsg(highBlack + eventStartTime + site);
						scoreFrame.gotoxy(x,y+2);
						scoreFrame.putmsg(highBlack + charHorizSingle.repeat(38) + ' ');
						scoreFrame.gotoxy(x,y+3);
						scoreFrame.putmsg(lowWhite + away + ' at ' + home);
					} // matchup
				} // for loop iterating over events

				// We have rendered the eight (or fewer) games in this chunk.
				// Time to display them on the screen.
				scoreFrame.draw();
				headerFrame.draw();

				// User prompt
				var promptFrame = new Frame(1, 23, 80, 1, BG_BLACK, frame);
				if ( h+1 == chunksLen) {
					promptFrame.center(highCyan + 'Press any key to exit.');				
					promptFrame.draw();
				}
				else {
					promptFrame.center(highCyan + 'Press any key to see more.');				
					promptFrame.draw();
					console.getkey();
				}
				frame.invalidate();
				frame.cycle();
				headerFrame.delete();
				promptFrame.delete();
				scoreFrame.delete();

			} // for loop iterating over chunks

			console.getkey();

		} // else (are events)

	} // if eventsJson
	// eventsJson returned as false
	else {
		// User prompt
		var promptFrame = new Frame(1, 23, 80, 1, BG_BLACK, frame);
		promptFrame.center(highCyan + 'There was a problem. Press any key to exit.');				
		promptFrame.draw();
		console.getkey();
		promptFrame.delete();
		log( 'Sports Stats error: JSON returned false when calling getData(' + sport + ', ' + method + ', ' + date + ')' );
	}

	// return to main menu
	chooseSport();

} // displayScores()



// ##################################
// ### 
// ### STANDINGS
// ### 
// ##################################

function displayStandings(sport,byDivision) {
	sport = sport || 'mlb';

	var method = "standings";
	headerFrame = new Frame(1, 1, 80, 2, BG_BLACK, frame);
	var confFrameL = new Frame(1, 3, 39, 21, BG_BLACK, frame);
	var confFrameR = new Frame(42, 3, 39, 21, BG_BLACK, frame);
	var seperatorFrame = new Frame(40, 3, 2, 21, BG_BLACK, frame);

	var json = getData(sport, method);
	if (json) {

		statDate = json['standings_date'].split('T')[0];
		var statDateObj = new Date( parseDate(statDate) );
		json = json['standing'];
		

		// Generate a 00:00:00 yesterday object.
		var yester = new Date();
		yester.setDate(yester.getDate() - 1);
		yester.setTime(yester.getTime()-yester.getHours()*3600*1000-yester.getMinutes()*60*1000);

		var dateHeader = statDate;
		// If these standings are more than a day behind, then we must be in the offseason
		if (statDateObj < yester) {
			dateHeader = 'OFFSEASON';
		}

		// usage
		var conferences = uniqueBy(json, function(x){return x.conference;});

		for (var i=0; i<conferences.length; i++) {
			var thisFrame;
			if ( isOdd(i) ) { thisFrame = confFrameR; } 
			else { thisFrame = confFrameL; } 
			thisFrame.putmsg( outputConf(conferences[i],sport));
			thisFrame.crlf();
			var thisConfStandings = json.filter( function(x){return x.conference === conferences[i];} );

			// There are circumstances where I won't want to break down the standings
			// all the way to the division level. So I have added an optional 
			// byDivision variable, which defaults to True. If you set it to false
			// teams will be displayed by conference.
			if (byDivision) {
				var divisions = uniqueBy(thisConfStandings, function(x){return x.division;});
				for (var j=0; j<divisions.length; j++) {
					var thisDivStandings = thisConfStandings.filter( function(x){return x.division === divisions[j];} );
					thisFrame.putmsg( outputDiv(divisions[j]) );
					thisFrame.crlf();
					for (var key in thisDivStandings) {
						thisFrame.putmsg( outputTeam(thisDivStandings[key],key,sport) );
						thisFrame.crlf();
					} // key in divStandings for loop
				} // divisions for loop
			} // if byDivision
			else {
				// NHL conf standings should be sorted by points
				if (sport == 'nhl') {
					thisConfStandings = sortByKey(thisConfStandings, 'points');
				}
				else {
					thisConfStandings = sortByKey(thisConfStandings, 'win_percentage');
				}
				thisFrame.putmsg(highBlack + ''.ljust('39',charHorizSingle) );
				thisFrame.crlf();
				for (var j=0; j<thisConfStandings.length; j++) {
					thisFrame.putmsg( outputTeam(thisConfStandings[j],j,sport) );
					thisFrame.crlf();
					if (j==7) {
						thisFrame.putmsg( highBlack + ''.ljust('39',charHorizSingle) );
						thisFrame.crlf();
					}
				} // key in divStandings for loop
			} // else byDivision
		} // conferences for loop

		seperatorFrame.load(js.exec_dir + 'graphics/separator.bin', 2, 21);

		headerFrame.load(js.exec_dir + 'graphics/header-compact2.bin', 80, 1);
		headerFrame.gotoxy(2,1);
		var sportHeader = sport + ' ' + method;
		headerFrame.putmsg(highWhiteDarkCyan + sportHeader);
		headerFrame.gotoxy(63,1);
		headerFrame.putmsg(highBlack + dateHeader);

		confFrameL.draw();
		confFrameR.draw();
		seperatorFrame.draw();
		headerFrame.draw();

	} // if json
	// json returned as false
	else {
		// User prompt
		var promptFrame = new Frame(1, 23, 80, 1, BG_BLACK, frame);
		promptFrame.center(highCyan + 'There was a problem. Press any key to exit.');				
		promptFrame.draw();
		console.getkey();
		promptFrame.delete();
		log( 'Sports Stats error: JSON returned false when calling getData(' + sport + ', ' + method + ')' );
	}

	console.getkey();
	frame.invalidate();
	frame.cycle();
	headerFrame.delete();
	confFrameL.delete();
	confFrameR.delete();
	seperatorFrame.delete();

	// return to main menu
	chooseSport();

} // displayStandings




function createUser() {
	var userObj = {
		'alias' : user.alias,
		'favorites' : [],
		'system' : system.name
	};
	return userObj;
}

function initUser() {
	var f = new File(js.exec_dir + "server.ini");
	f.open("r");
	serverIni = f.iniGetObject();
	f.close();
	try {
		var jsonClient = new JSONClient(serverIni.host, serverIni.port);
		var userList = jsonClient.read("SPORTSSTATS", "SPORTSSTATS.PLAYERS", 1);
		// No users yet. We need to create the users database
		if (userList === undefined) {
			userList = [];
			u = createUser();
			userList.push(u);
			jsonClient.write("SPORTSSTATS", "SPORTSSTATS.PLAYERS", userList, 2);
		}
		// There have already been users.
		else {
			var userInList = false;
			// Iterate over list and see if this user has entry in high score list.
			for (var i=0; i<userList.length; i++) {
				if (userList[i].name == user.alias && userList[i].system == system.name) {
					u.name = userList[i].name;
					u.favorites = userList[i].favorites;
					u.system = userList[i].system;
					userInList = true;
				}
			}
			// User was NOT in the list, so create them.
			if (!userInList) { 
				u = createUser();
				userList.push(u);
				jsonClient.write("SPORTSSTATS", "SPORTSSTATS.PLAYERS", userList, 2);
			}
		}
	} catch(err) {
		console.write(LOG_ERR, "JSON client error: " + err);
		return false;
	}
	jsonClient.disconnect();
}




var cleanUp = function() {
	frame.close();
	console.clear();
}





// If it's a returning user, populate the user variable. If new, add to JSON DB
initUser();

// This launches the app
chooseSport();

// When done, remove all the frames
cleanUp();

// Quit
exit();
