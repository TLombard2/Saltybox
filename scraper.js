const request = require('request');
const sqlite3 = require('sqlite3').verbose();
const log = require('./log');
const parseJson = require('parse-json');

var db = new sqlite3.Database('saltydb.db');
db.run('CREATE TABLE IF NOT EXISTS fighterTable (name text, wins integer DEFAULT 0, losses integer DEFAULT 0, matches integer DEFAULT 0, tournamentMatchWins integer DEFAULT 0,\
	tournamentMatchLosses integer DEFAULT 0, tournamentMatches integer DEFAULT 0, tournamentFinalWins integer DEFAULT 0, matchmakingBets integer DEFAULT 0)');
db.run('CREATE TABLE IF NOT EXISTS matchTable (redFighter text, blueFighter text, redBets integer DEFAULT 0,blueBets integer DEFAULT 0, matchWinner text, matchType text, matchTime text)');

var fightData = '';
const stateUrl = 'https://www.saltybet.com/state.json';
var matchCheck = '';
var matchType = '';
var statusCheck = '';
var matchStatus = '';
var oldStatus = '';

setInterval(dataObserver,3000);

function dataObserver() {
	request(stateUrl, function(err, statusCode, data) {
		if (err) {
			log.message(data, "debug");	
			log.message('0: ' + err.message, "error");
			} else {	
		try {		
			fightData = parseJson(data);
		} catch (error) {
			log.message('1: ' + error, "error");
		}
		matchCheck = fightData.remaining;
		statusCheck = fightData.status;
		}
	});
	setMatchType();
	setMatchStatus();
	if (matchStatus != oldStatus && matchType != 'Exhibition') { //Exhibitions are not tracked.
		oldStatus = matchStatus;
		let redFighter = fightData.p1name;
		let blueFighter = fightData.p2name;
		let redBets = fightData.p1total;
		let blueBets = fightData.p2total;
		switch(matchStatus) {
			case 'open':
				break;
			case 'locked':
				break;
			case 'redWon':
				checkDatabase(redFighter, blueFighter);
				setTimeout(function() { //Allows checkDatabase to complete before continuing
					addMatch(redFighter, blueFighter, redBets, blueBets, redFighter);
					addMatchResults(redFighter, blueFighter);
					addBets(redFighter, blueFighter, redBets, blueBets);
				}, 100);
				break;
			case 'blueWon':
				checkDatabase(redFighter, blueFighter);
				setTimeout(function() {
					addMatch(redFighter, blueFighter, redBets, blueBets, blueFighter);
					addMatchResults(blueFighter, redFighter);
					addBets(redFighter, blueFighter, redBets, blueBets);
				}, 100);
				break;
			default:
				log.message('Unknown match status!', "error");
				break;
		}
	}
}

function setMatchType() {
	if (matchCheck.indexOf('until the next tournament!') != -1 && matchCheck.indexOf('100 more matches until the next tournament!') == -1) {
		matchType = 'Matchmaking';
	} else if (matchCheck.indexOf('bracket') != -1 && matchCheck.indexOf('16 characters are left in the bracket!') == -1 || matchCheck.indexOf('FINAL ROUND!') != -1) {
		matchType = 'Tournament';
	} else if (matchCheck.indexOf('25 exhibition matches left!') != -1) {
		log.message(matchType, 'debug');
		matchType = 'Tournament Final';
	} else if(matchCheck.indexOf('exhibition matches left!') != -1 || 
	matchCheck.indexOf('100 more matches until the next tournament!') != -1 || 
	matchCheck.indexOf('Matchmaking mode will be activated after the next exhibition match!') != -1) {
		matchType = 'Exhibition';
	}
}

function setMatchStatus() {
	switch(statusCheck) {
		case 'open':
			matchStatus = 'open';
			break;
		case 'locked':
			matchStatus = 'locked';
			break;
		case '1':
			matchStatus = 'redWon';
			break;
		case '2':
			matchStatus = 'blueWon';
			break;
	}
}

function checkDatabase(redFighter, blueFighter) {
	db.all('SELECT name FROM fighterTable WHERE name IN (?, ?)', [redFighter, blueFighter], function(err, rows) {
		if (err) {
			log.message('2: ' + err.message, "error");
		} else if (typeof rows[0] == 'undefined' && typeof rows[1] == 'undefined') { //Neither fighter found.
			addFighterName(redFighter, blueFighter);
			log.message('Adding both fighters...', "info");
		} else if (typeof rows[0] != 'undefined' && typeof rows[1] != 'undefined') { //Both fighters found.
			log.message(redFighter + ' already exists in the database.', "info");	
			log.message(blueFighter + ' already exists in the database.', "info");
		} else if (rows[0].name == redFighter) {  //blueFighter is not found.
			addFighterName(blueFighter);
			log.message('New Fighter, ' + blueFighter + ', is being added...', "info");
			log.message(redFighter + ' already exists in the database.', "info");
		} else if (rows[0].name == blueFighter) { //redFighter is not found.
			addFighterName(redFighter); 
			log.message('New fighter, ' + redFighter + ', is being added...', "info");
			log.message(blueFighter + ' already exists in the database.', "info");
		} else {	
			log.message('Database check failed!', "error");	
		}
	});
}

function addFighterName (name1, name2,) {
	if (typeof name1 != 'undefined' && typeof name2 == 'undefined') {
		db.run('INSERT INTO fighterTable(name) VALUES (?)', [name1], function (err) {
			if (err) {
				log.message('3: ' + err.message, "error");
			} else {
				log.message(name1 + ' has been added to the database.', "info");
			}
		});
	} else {
		db.run('INSERT INTO fighterTable(name) VALUES (?), (?)', [name1, name2], function (err) {
			if (err) {
				log.message('4: ' + err.message, "error");
			} else {
				log.message(name1 + ' and ' + name2 + ' have been added to the database.', "info");
			}
		});
	}
}

function addMatchResults(winner, loser) {
	switch(matchType) {
		case 'Tournament Final':
			db.run('UPDATE fighterTable SET tournamentFinalWins = tournamentFinalWins + 1 WHERE name = ?', [winner], function(err){
				if (err) {
					log.message('5: ' + err.message, "error");
				} else {
					log.message(winner + ' won the tournament! The database has been updated.', "info");
				}
			})
			db.run('UPDATE fighterTable SET tournamentMatchWins = tournamentMatchWins + 1, tournamentMatches = tournamentMatches + 1 WHERE name = ?', [winner], function(err) {
				if (err) {
					log.message('6: ' + err.message, "error");
				} 
			});
			db.run('UPDATE fighterTable SET tournamentMatchLosses = tournamentMatchLosses + 1, tournamentMatches = tournamentMatches + 1 WHERE name = ?', [loser], function(err) {
				if (err) {
					log.message('7: ' + err.message, "error");
				} else {
					log.message(loser + ' lost the match! The database has been updated.', "info");
				}
			});
			break;
		case 'Tournament':
			db.run('UPDATE fighterTable SET tournamentMatchWins = tournamentMatchWins + 1, tournamentMatches = tournamentMatches + 1 WHERE name = ?', [winner], function(err) {
				if (err) {
					log.message('8: ' + err.message, "error");
				} else {
					log.message(winner + ' won the match! The database has been updated.', "info");
				}
			});
			db.run('UPDATE fighterTable SET tournamentMatchLosses = tournamentMatchLosses + 1, tournamentMatches = tournamentMatches + 1 WHERE name = ?', [loser], function(err) {
				if (err) {
					log.message('9: ' + err.message, "error");
				} else {
					log.message(loser + ' lost the match! The database has been updated.', "info");
				}
			});
			break;
		case 'Matchmaking': 
		db.run('UPDATE fighterTable SET wins = wins + 1, matches = matches + 1 WHERE name = ?', [winner], function(err) {
			if (err) {
				log.message('10: ' + err.message, "error");
			} else {
				log.message(winner + ' won the match! The database has been updated.', "info");
			}
		});
		db.run('UPDATE fighterTable SET losses = losses + 1, matches = matches + 1 WHERE name = ?', [loser], function(err) {
			if (err) {
				log.message('11: ' + err.message, "error");
			} else {
				log.message(loser + ' lost the match! The database has been updated.', "info");
			}
		});
			break;
	}
}

function addMatch(redFighter, blueFighter, redBets, blueBets, winner) {
	db.all('SELECT COUNT(*) FROM matchTable', [], function (err,rows) {
		if(err) {
			log.message(err.message, "error");
		} else {
			//let matchId = parseInt(rows[0]['COUNT(*)']) + 1;
			let matchTime = new Date().toLocaleString(); 
			redBets = parseInt(redBets.replace(/,/g, ""));
			blueBets = parseInt(blueBets.replace(/,/g, ""));
			db.run('INSERT INTO matchTable VALUES (?, ?, ?, ?, ?, ?, ?)', [redFighter, blueFighter, redBets, blueBets, winner, matchType, matchTime], function(err) {
				if (err) {
					log.message('12: ' + err.message, "error");
				} else {
					log.message('Match has been saved to the database!', "info");
				}
			});
		}
	});	
}

function addBets(redFighter, blueFighter, redBets, blueBets) {
	redBets = parseInt(redBets.replace(/,/g, "")); //Removes commas from number strings and turns them into integers
	blueBets = parseInt(blueBets.replace(/,/g, ""));
	db.run('UPDATE fighterTable SET matchmakingBets = matchmakingBets + ? WHERE name = ?', [redBets, redFighter], function(err) {
		if(err) {
			log.message('13: ' + err.message, "error");
		} else {
			log.message('$' + redBets + ' was bet on ' + redFighter, "info");
		}
	});
	db.run('UPDATE fighterTable SET matchmakingBets = matchmakingBets + ? WHERE name = ?', [blueBets, blueFighter], function(err) {
		if(err) {
			log.message('14: ' + err.message, "error");
		} else {
			log.message('$' + blueBets + ' was bet on ' + blueFighter, "info");
		}
	});
}
