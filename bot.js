const request = require('request');
const sqlite3 = require('sqlite3').verbose();
const log = require('./log');
const parseJson = require('parse-json');

var db = new sqlite3.Database('saltydb.db');
db.run('CREATE TABLE IF NOT EXISTS botRnd (name text, correctPredictions blob DEFAULT 0, totalPredictions integer DEFAULT 0)');
setTimeout(function () {
    db.all('SELECT COUNT(*) FROM botRnd', [], function (err, rows) {
        if (err) {
            log.message('0: ' + err.message, "error");
        } else if (rows[0]['COUNT(*)'] == 0) {
            db.run('INSERT INTO botRnd(name) VALUES (?)', ['Prediction History'], function (err) {
                if (err) {
                    log.message('1: ' + err.message, "error");
                }
            })
        }
    });
}, 100);


var fightData = '';
const stateUrl = 'https://www.saltybet.com/state.json';
var matchCheck = '';
var matchType = '';
var statusCheck = '';
var matchStatus = '';
var oldStatus = '';
var predictedWinner = 3;

setInterval(dataObserver, 3000);

function dataObserver() {
    request(stateUrl, function (err, statusCode, data) {
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
        switch (matchStatus) {
            case 'open':
                predictWinner(redFighter, blueFighter);
                break;
            case 'locked':
                break;
            case 'redWon':
                whenRedWins();
                break;
            case 'blueWon':
                whenBlueWins();
                break;
            default:
                log.message('Unknown match status!', "error");
                break;
        }
    }
}

function predictWinner(redName, blueName) {
    //Check to see if the fighters have fought before
    //Get data from each fighter from database
    //Compare w/l ratio, tournament w/l ratio, tournament wins, and favor
    db.all('SELECT matchWinner FROM matchTable WHERE redFighter = ? AND blueFighter = ? OR redFighter = ? AND blueFighter = ?', [redName, blueName, blueName, redName], 
    function(err,rows){
        if(err) {
            log.message('3: ' + err.message, "error");
        } else {
            log.message(rows[0], "debug");
            let redBeatBlue = rows.filter(function() {return redName}).length;
            let blueBeatRed = rows.filter(function() {return blueName}).length;
            log.message(redBeatBlue, "debug");
            log.message(blueBeatRed, "debug");
            if (redBeatBlue > blueBeatRed) {
                predictedWinner = 0;
            } else if (blueBeatRed > redBeatBlue) {
                predictedWinner = 1;
            }
        }
    });
    if (predictedWinner == 3) { //Checks to make sure predictedWinner wasn't set in the above function.
        db.all('SELECT * FROM fighterTable WHERE name IN (?, ?)', [redName, blueName], function(err, rows){
            if(err) {
                log.message('3: ' + err.message, "error");
            } else if(typeof rows[0] == 'undefined' || typeof rows[1] == 'undefined') {
                predictedWinner = Math.round(Math.random());
                log.message('Predicted winner is ' + predictedWinner, "info");
            } else {
                let redWins = rows[0]['wins'];
                let redLosses = rows[0]['losses'];
                let redTotalMatches = rows[0]['matches'];
                let redTournamentMatchWins = rows[0]['tournamentMatchWins'];
                let redTournamentMatchLosses = rows[0]['tournamentMatchLosses'];
                let redTotalTournamentMatches = rows[0]['tournamentMatches'];
                let redTournamentFinalWins = rows[0]['tournamentFinalWins'];
                let redFavor = rows[0]['favor'];
                let redPoints = 0;
                let redWinRatio = 0;
                let redTournamentWinRatio = 0;

                if (redTotalMatches > 0) {
                    if (redLosses > 0) {
                        redWinRatio = redWins/redLosses;
                    } else {
                        redWinRatio = 'undefeated'
                    }
                }
                if (redTotalTournamentMatches > 0) {
                    if (redTournamentMatchLosses > 0) {
                        redTournamentWinRatio = redTournamentMatchWins/redTournamentMatchLosses;
                    } else {
                        redTournamentWinRatio = 'undefeated'
                    }
                }
                let blueWins = rows[1]['wins'];
                let blueLosses = rows[1]['losses'];
                let blueTotalMatches = rows[1]['matches'];
                let blueTournamentMatchWins = rows[1]['tournamentMatchWins'];
                let blueTournamentMatchLosses = rows[1]['tournamentMatchLosses'];
                let blueTotalTournamentMatches = rows[1]['tournamentMatches'];
                let blueTournamentFinalWins = rows[1]['tournamentFinalWins'];
                let blueFavor = rows[1]['favor'];
                let bluePoints = 0;
                let blueWinRatio = 0;
                let blueTournamentWinRatio = 0;

                if (blueTotalMatches > 0) {
                    if (blueLosses > 0) {
                        blueWinRatio = blueWins/blueLosses;
                    } else {
                        blueWinRatio = 'undefeated'
                    }
                }
                if (blueTotalTournamentMatches > 0) {
                    if (blueTournamentMatchLosses > 0) {
                        blueTournamentWinRatio = blueTournamentMatchWins/blueTournamentMatchLosses;
                    } else {
                        blueTournamentWinRatio = 'undefeated'
                    }
                }

                if (redWinRatio == 'undefeated' || blueWinRatio == 'undefeated') {
                    if (redWinRatio == 'undefeated' && blueWinRatio == 'undefeated') {
                        redPoints = redPoints + 1;
                        bluePoints = bluePoints + 1;
                    } else if (redWinRatio == 'undefeated') {
                        redPoints = redPoints + 1;
                    } else if (blueWinRatio == 'undefeated') {
                        bluePoints - bluePoints + 1;
                    }
                } else if (redWinRatio > blueWinRatio) {
                    redPoints = redPoints + 1;
                } else if (blueWinRatio > redWinRatio) {
                    bluePoints = bluePoints +1;
                } else if (redWinRatio == blueWinRatio) {
                    redPoints = redPoints + 1;
                    bluePoints = bluePoints + 1;
                }

                if (redTournamentWinRatio == 'undefeated' || blueTournamentWinRatio == 'undefeated') {
                    if (redTournamentWinRatio == 'undefeated' && blueTournamentWinRatio == 'undefeated') {
                        redPoints = redPoints + 1;
                        bluePoints = bluePoints + 1;
                    } else if (redTournamentWinRatio == 'undefeated') {
                        redPoints = redPoints + 1;
                    } else if (blueTournamentWinRatio == 'undefeated') {
                        bluePoints - bluePoints + 1;
                    }
                } else if (redTournamentWinRatio > blueTournamentWinRatio) {
                    redPoints = redPoints + 1;
                } else if (blueTournamentWinRatio > redTournamentWinRatio) {
                    bluePoints = bluePoints +1;
                } else if (redTournamentWinRatio == blueTournamentWinRatio) {
                    redPoints = redPoints + 1;
                    bluePoints = bluePoints + 1;
                }

                if (redTournamentFinalWins > blueTournamentFinalWins) {
                    redPoints = redPoints + 3;
                } else if (blueTournamentFinalWins > redTournamentFinalWins) {
                    bluePoints = bluePoints + 3
                } else if (redTournamentFinalWins == blueTournamentFinalWins) {
                    redPoints = redPoints + 3;
                    bluePoints = bluePoints + 3;
                }

                if (redFavor > blueFavor) {
                    redPoints = redPoints + 2;
                } else if (blueFavor > redFavor) {
                    bluePoints = bluePoints + 2
                } else if (redFavor == blueFavor) {
                    redPoints = redPoints + 2;
                    bluePoints = bluePoints + 2;
                }

                if (redPoints > bluePoints) {
                    predictedWinner = 0;
                } else if (bluePoints > redPoints) {
                    predictedWinner = 1;
                } else if (redPoints == bluePoints) {
                    predictedWinner = Math.round(Math.random());
                }
            }
        });
    }
    log.message('Predicted winner is ' + predictedWinner, "info");
}

function whenRedWins() {
    if (predictedWinner != 3) {
        db.run('UPDATE botRnd SET totalPredictions = totalPredictions + 1 WHERE name = ?', ['Prediction History'], function (err) {
            if (err) {
                log.message('2: ' + err.message, "error");
            }
            if (predictedWinner == 0) {
                db.run('UPDATE botRnd SET correctPredictions = correctPredictions + 1 WHERE name = ?', ['Prediction History'], function (err) {
                    if (err) {
                        log.message('3: ' + err.message, "error");
                    } else {
                        log.message('Prediction was correct!', "info");
                    }
                });
                db.run('INSERT INTO botRnd(correctPredictions) VALUES (?)', ['Yes'], function (err) {
                    if (err) {
                        log.message('5: ' + err.message, "error");
                    }
                });
            } else if (predictedWinner != 3) {
                log.message('Prediction was incorrect!', "info");
                db.run('INSERT INTO botRnd(correctPredictions) VALUES (?)', ['No'], function (err) {
                    if (err) {
                        log.message('5: ' + err.message, "error");
                    }
                });
            }
            db.all('SELECT COUNT(*) FROM botRnd', [], function (err, rows) {
                if (err) {
                    log.message('4: ' + err.message, "error");
                } else if (rows[0]['COUNT(*)'] == 102) {
                    db.run('DELETE FROM botRnd WHERE rowid = ?', [2], function (err) {
                        if (err) {
                            log.message('5: ' + err.message, "error");
                        } else {
                            db.run('UPDATE botRnd SET rowid = rowid - 1 WHERE rowid > 1', [], function (err) {
                                if (err) {
                                    log.message('5: ' + err.message, "error");
                                }
                            });
                        }
                    });
                }
            });
        });
    }
    predictedWinner = 3;
}

function whenBlueWins() {
    if (predictedWinner != 3) {
        db.run('UPDATE botRnd SET totalPredictions = totalPredictions + 1 WHERE name = ?', ['Prediction History'], function (err) {
            if (err) {
                log.message('2: ' + err.message, "error");
            }
        });
        if (predictedWinner == 1) {
            db.run('UPDATE botRnd SET correctPredictions = correctPredictions + 1 WHERE name = ?', ['Prediction History'], function (err) {
                if (err) {
                    log.message('3: ' + err.message, "error");
                } else {
                    log.message('Prediction was correct!', "info");
                }
            });
            db.run('INSERT INTO botRnd(correctPredictions) VALUES (?)', ['Yes'], function (err) {
                if (err) {
                    log.message('5: ' + err.message, "error");
                }
            });

        } else if (predictedWinner != 3) {
            log.message('Prediction was incorrect!', "info");
            db.run('INSERT INTO botRnd(correctPredictions) VALUES (?)', ['No'], function (err) {
                if (err) {
                    log.message('5: ' + err.message, "error");
                }
            });
        }
        db.all('SELECT COUNT(*) FROM botRnd', [], function (err, rows) {
            log.message(rows[0]['COUNT(*)'], "debug");
            if (err) {
                log.message('4: ' + err.message, "error");
            } else if (rows[0]['COUNT(*)'] == 102) {
                db.run('DELETE FROM botRnd WHERE rowid = ?', [2], function (err) {
                    if (err) {
                        log.message('5: ' + err.message, "error");
                    } else {
                        db.run('UPDATE botRnd SET rowid = rowid - 1 WHERE rowid > 1', [], function (err) {
                            if (err) {
                                log.message('5: ' + err.message, "error");
                            }
                        });
                    }
                });
            }
        });
    };
    predictedWinner = 3;
}


function setMatchType() {
    if (matchCheck.indexOf('until the next tournament!') != -1 && matchCheck.indexOf('100 more matches until the next tournament!') == -1) {
        matchType = 'Matchmaking';
    } else if (matchCheck.indexOf('bracket') != -1 && matchCheck.indexOf('16 characters are left in the bracket!') == -1 || matchCheck.indexOf('FINAL ROUND!') != -1) {
        matchType = 'Tournament';
    } else if (matchCheck.indexOf('25 exhibition matches left!') != -1) {
        log.message(matchType, 'debug');
        matchType = 'Tournament Final';
    } else if (matchCheck.indexOf('exhibition matches left!') != -1 ||
        matchCheck.indexOf('100 more matches until the next tournament!') != -1 ||
        matchCheck.indexOf('Matchmaking mode will be activated after the next exhibition match!') != -1) {
        matchType = 'Exhibition';
    }
}

function setMatchStatus() {
    switch (statusCheck) {
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