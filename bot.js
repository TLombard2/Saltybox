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
        switch (matchStatus) {
            case 'open':
                predictedWinner = Math.round(Math.random());
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

function whenRedWins() {
    log.message(predictedWinner, "info");
    if (predictedWinner != 3) {
        db.run('UPDATE botRnd SET totalPredictions = totalPredictions + 1 WHERE name = ?', ['Prediction History'], function (err) {
            if (err) {
                log.message('2: ' + err.message, "error");
            } else {
                log.message('Prediction History updated', "info");
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
                    } else {
                        log.message('Added new prediction row!', "info");
                    }
                });
            } else if (predictedWinner != 3) {
                log.message('Prediction was incorrect!', "info");
                db.run('INSERT INTO botRnd(correctPredictions) VALUES (?)', ['No'], function (err) {
                    if (err) {
                        log.message('5: ' + err.message, "error");
                    } else {
                        log.message('Added new prediction row!', "info");
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
                            log.message('Row deleted', "debug");
                            db.run('UPDATE botRnd SET rowid = rowid - 1 WHERE rowid > 1', [], function (err) {
                                if (err) {
                                    log.message('5: ' + err.message, "error");
                                } else {
                                    log.message('RowId has been reset!', "debug");
                                }
                            });
                        }
                    });
                }
            });
        });
    }
}

function whenBlueWins() {
    log.message(predictedWinner, "info");
    if (predictedWinner != 3) {
        db.run('UPDATE botRnd SET totalPredictions = totalPredictions + 1 WHERE name = ?', ['Prediction History'], function (err) {
            if (err) {
                log.message('2: ' + err.message, "error");
            } else {
                log.message('Prediction History updated', "info");
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
                } else {
                    log.message('Added new prediction row!', "info");
                }
            });

        } else if (predictedWinner != 3) {
            log.message('Prediction was incorrect!', "info");
            db.run('INSERT INTO botRnd(correctPredictions) VALUES (?)', ['No'], function (err) {
                if (err) {
                    log.message('5: ' + err.message, "error");
                } else {
                    log.message('Added new prediction row!', "info");
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
                        log.message('Row deleted', "debug");
                        db.run('UPDATE botRnd SET rowid = rowid - 1 WHERE rowid > 1', [], function (err) {
                            if (err) {
                                log.message('5: ' + err.message, "error");
                            } else {
                                log.message('RowId has been reset!', "debug");
                            }
                        });
                    }
                });
            }
        });
    };
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