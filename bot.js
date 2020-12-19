const request = require('request');
const sqlite3 = require('sqlite3').verbose();
const log = require('./log');
const parseJson = require('parse-json');

var db = new sqlite3.Database('saltydb.db');
db.run('CREATE TABLE IF NOT EXISTS botRnd (name text, correctPredictions blob, totalPredictions integer)');
db.all('SELECT COUNT(*) FROM botRnd', [], function(err, rows) {
    if(err) {
        log.message('0: ' + err.message, "error");
    } else if(rows[0]['COUNT(*)'] == 0) {
        db.run('INSERT INTO botRnd(name) VALUES (?)', ['Prediction History'], function(err) {
            if(err) {
                log.message('1: ' + err.message, "error");
            }
        })
    }
});


var fightData = '';
const stateUrl = 'https://www.saltybet.com/state.json';
var matchCheck = '';
var matchType = '';
var statusCheck = '';
var matchStatus = '';
var oldStatus = '';
var predictedWinner = '';

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
                predictedWinner = Math.round(Math.random());
				break;
			case 'locked':
				break;
			case 'redWon':
                log.message(predictedWinner, "info");
                db.run('UPDATE botRnd SET totalPredictions = totalPredictions + 1 WHERE name = ?', ['Prediction History'], function(err) {
                    if(err) {
                        log.message('2: ' + err.message, "error");
                    } else {
                        log.message('Prediction History updated', "info");
                    }
                });
                if (predictedWinner == 0) {
                    db.run('UPDATE botRnd SET correctPredictions = correctPredictions + 1 WHERE name = ?', ['Prediction History'], function(err) {
                        if(err) {
                            log.message('3: ' + err.message, "error");
                        } else {
                            log.message('Prediction was correct!', "info");
                        }
                    });
                    db.all('SELECT COUNT(*) FROM botRnd', [], function(err, rows) {
                        if(err) {
                            log.message('4: ' + err.message, "error");
                        } else if(rows[0]['COUNT(*)'] == 101) {
                            db.run('DELETE FROM botRnd WHERE rowid = 2', [], function(err) {
                                if(err) {
                                    log.message('5: ' + err.message, "error");
                                } else {
                                    log.message('Row deleted!', "info");
                                }
                            });
                        } 
                    });
                    
                } else {
                    log.message('Prediction was incorrect!', "info");  
                }
				break;
			case 'blueWon':
                log.message(predictedWinner, "info");
                db.run('UPDATE botRnd SET totalPredictions = totalPredictions + 1 WHERE name = ?', ['Prediction History'], function(err) {
                    if(err) {
                        log.message('2: ' + err.message, "error");
                    } else {
                        log.message('Prediction History updated', "info");
                    }
                });
                if (predictedWinner == 1) {
                    db.run('UPDATE botRnd SET correctPredictions = correctPredictions + 1 WHERE name = ?', ['Prediction History'], function(err) {
                        if(err) {
                            log.message('3: ' + err.message, "error");
                        } else {
                            log.message('Prediction was correct!', "info");
                        }
                    });
                    db.all('SELECT COUNT(*) FROM botRnd', [], function(err, rows) {
                        if(err) {
                            log.message('4: ' + err.message, "error");
                        } else if(rows[0]['COUNT(*)'] == 101) {
                            db.run('DELETE FROM botRnd WHERE rowid = 2', [], function(err) {
                                if(err) {
                                    log.message('5: ' + err.message, "error");
                                } else {
                                    log.message('Row deleted!', "info");
                                }
                            });
                        } 
                    });
                    
                } else {
                    log.message('Prediction was incorrect!', "info");  
                }
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

//Count rows in match data to see current match #
//Want to track lifetime accuracy and last 100 match accuracy
//You can delete rows and then reset rowid with REINDEX 'TABLENAME' or try VACUUM