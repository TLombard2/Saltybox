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
var predictedWinner = 2;
var hasPredicted = false;

setInterval(dataObserver, 3000);

function dataObserver() {
    request(stateUrl, function (err, statusCode, data) {
        if (err) {
            log.message(data, "debug");
            log.message('2: ' + err.message, "error");
        } else {
            try {
                fightData = parseJson(data);
            } catch (error) {
                log.message('3: ' + error, "error");
            }
            matchCheck = fightData.remaining;
            statusCheck = fightData.status;
        }
    });
    setMatchType();
    setMatchStatus();
    if ((matchStatus != oldStatus) && matchType != 'Exhibition') { //Exhibitions are not tracked.
        oldStatus = matchStatus;
        let redFighter = fightData.p1name;
		let blueFighter = fightData.p2name;
        switch (matchStatus) {
            case 'open':
                predictWinner(redFighter, blueFighter);
                break;
            case 'locked':
                predictWinner(redFighter, blueFighter);
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

function winPerc (num,den) {
    if (den > 0) {
        return (num/den);
    } else if (den == 0 && num == 0) {
        return 0;
    }
}

function predictWinner(redName, blueName) { 
    if (hasPredicted == false) {
        db.all('SELECT redFighter, blueFighter, rowid, matchWinner FROM matchTable WHERE redFighter IN (?, ?) AND blueFighter IN (?, ?)' , [redName, blueName, redName, blueName], function(err, rows){
            if (err) {
                log.message('4:' + err.message, "error");
            } else if (rows.length > 0) {
                let redWins = 0;
                let blueWins = 0;
                for (var i = 0; i < rows.length; i++) {
                    var winner = rows[i].matchWinner
                    if (winner == redName) {
                        redWins++;
                    } else if (winner == blueName) {
                        blueWins++;
                    }
                }
                if (redWins > blueWins) {
                    predictedWinner = 0;
                    hasPredicted = true;
                    log.message(redName + ' is predicted to win!', "info");
                    return;
                } else if (blueWins > redWins) {
                    predictedWinner = 1;
                    hasPredicted = true;
                    log.message(blueName + ' is predicted to win!', "info");
                    return;
                } else if (redWins == blueWins) {
                    predictedWinner = Math.floor(Math.random() * 2);
                    hasPredicted = true;
                    if (predictedWinner = 0) {
                        log.message(redName + ' is randomly predicted to win!', "info");
                    } else if (predictedWinner = 1) {
                        log.message(blueName + ' is randomly predicted to win!', "info");
                    }
                    return;
                }
            }
        });
        let redHasAdv = false;
        let blueHasAdv = false;

        db.all('SELECT redFighter, blueFighter, matchWinner FROM matchTable WHERE redFighter IN (?, ?) OR blueFighter IN (?, ?)', [redName, blueName, redName, blueName], function (err,rows) {
            if (err) {
                log.message('5:' + err.message, "error");
            } else {
                let redBeatList = [];
                let redLostList = [];
                let blueBeatList = [];
                let blueLostList = [];
                for (var i = 0; i < rows.length; i++) {
                    switch(rows[i].redFighter) { //List all opponents who fighters have won or lost against
                        case redName:
                            if (rows[i].matchWinner == redName) {
                                redBeatList.push(rows[i].blueFighter);
                            } else if (rows[i].matchWinner != redName) {
                                redLostList.push(rows[i].blueFighter);
                            }
                            break;
                        case blueName:
                            if (rows[i].matchWinner == blueName) {
                                blueBeatList.push(rows[i].blueFighter);
                            } else if (rows[i].matchWinner != blueName) {
                                blueLostList.push(rows[i].blueFighter);
                            }
                            break;
                    }
                    switch(rows[i].blueFighter) {
                        case redName:
                            if (rows[i].matchWinner == redName) {
                                redBeatList.push(rows[i].redFighter);
                            } else if (rows[i].matchWinner != redName) {
                                redLostList.push(rows[i].redFighter);
                            }
                            break;
                        case blueName:
                            if (rows[i].matchWinner == blueName) {
                                blueBeatList.push(rows[i].redFighter);
                            } else if (rows[i].matchWinner != blueName) {
                                blueLostList.push(rows[i].redFighter);
                            }
                            break;
                    }
                }
                console.log(redBeatList);
                console.log(redLostList);
                console.log(blueBeatList);
                console.log(blueLostList);
                let redAdv = 0;
                let blueAdv = 0;
                for (var i = 0; i < redBeatList.length; i++) { //Search through lists to find if there is a match
                    for (var j = 0; j < blueLostList.length; j++) {
                        if (redBeatList[i] == blueLostList[j]) {
                            redAdv++
                        }
                    }
                }
                for (var i = 0; i < blueBeatList.length; i++) {
                    for (var j = 0; j < redLostList.length; j++) {
                        if (blueBeatList[i] == redLostList[j]) {
                            blueAdv++
                        }
                    }
                };

                if (redAdv > blueAdv) {
                    redHasAdv = true;
                } else if (blueAdv > redAdv) {
                    blueHasAdv = true;
                } else if (redAdv == blueAdv) {
                    //do nothing
                }
            }
        });


        db.all('SELECT * FROM fighterTable WHERE name IN (?, ?)', [redName, blueName], function(err, rows) {
            console.log(rows);
            if (err) {
                log.message('8:' + err.message, "error");
            } else if (rows.length == 2){ //If both fighters exist
                if (redName != rows[0].name) {
                    [rows[0], rows[1]] =  [rows[1], rows[0]]; //If red fighter isn't at index 0 then swap 0 and 1.
                }
                
                let rMatchWins = rows[0].wins;
                let rMatchLosses = rows[0].losses;
                let rMatches = rows[0].matches;
                let rTMatchWins = rows[0].tournamentMatchWins;
                let rTMatchLosses = rows[0].tournamentMatchLosses;
                let rTMatches = rows[0].tournamentMatches;
                let rTFinalWins = rows[0].tournamentFinalWins;
                let rFavor = rows[0].favor;

                let bMatchWins = rows[1].wins;
                let bMatchLosses = rows[1].losses;
                let bMatches = rows[1].matches;
                let bTMatchWins = rows[1].tournamentMatchWins;
                let bTMatchLosses = rows[1].tournamentMatchLosses;
                let bTMatches = rows[1].tournamentMatches;
                let bTFinalWins = rows[1].tournamentFinalWins;
                let bFavor = rows[1].favor;

                let rWinRatio = winPerc(rMatchWins, rMatches);
                let rTWinRatio = winPerc(rTMatchWins, rTMatches);
                let bWinRatio = winPerc(bMatchWins, bMatches);
                let bTWinRatio = winPerc(bTMatchWins, bTMatches);
                
                let redPoints = 0;
                let bluePoints = 0;

                if (rMatches > 0 && bMatches > 0) {
                    if (rWinRatio > bWinRatio) {
                        redPoints = redPoints + 1;
                    } else if (bWinRatio > rWinRatio) {
                        bluePoints = bluePoints + 1;
                    } else if (rWinRatio == bWinRatio) {
                        //do nothing
                    }
                }

                if (rTMatches > 0 && bTMatches > 0) {
                    if (rTWinRatio > bTWinRatio) {
                        redPoints = redPoints + 1;
                    } else if (bTWinRatio > rTWinRatio) {
                        bluePoints = bluePoints + 1;
                    } else if (rTWinRatio == bTWinRatio) {
                        //do nothing
                    }
                }

                if (rTFinalWins > bTFinalWins) {
                    redPoints = redPoints + 3;
                } else if (bTFinalWins > rTFinalWins) {
                    bluePoints = bluePoints + 3;
                } else if (rTFinalWins == bTFinalWins) {
                    //do nothing
                }

                if (rFavor > bFavor) {
                    redPoints = redPoints + 2;
                } else if (bFavor > rFavor) {
                    bluePoints = bluePoints + 2;
                } else if (rFavor == bFavor) {
                    //do nothing
                }

                if (redHasAdv == true) {
                    redPoints = redPoints + 2;
                } else if (blueHasAdv == true) {
                    bluePoints = bluePoints + 2;
                }
                console.log("Predictors---");
                console.log("red win %: " + rWinRatio);
                console.log("blue win %: " + bWinRatio);
                console.log("red T win %: " + rTWinRatio);
                console.log("blue T win %: " + bTWinRatio);
                console.log("red T finals: " + rTFinalWins);
                console.log("blue T finals: " + bTFinalWins);
                console.log("red favor: " + rFavor);
                console.log("blue favor: " + bFavor);
                console.log("red adv: " + redHasAdv);
                console.log("blue adv: " + blueHasAdv);
                console.log("---End");

                if (redPoints > bluePoints) {
                    predictedWinner = 0;
                    hasPredicted = true;
                    log.message(redName + ' is predicted to win!', "info");
                    return;
                } else if (bluePoints > redPoints) {
                    predictedWinner = 1;
                    hasPredicted = true;
                    log.message(blueName + ' is predicted to win!', "info");
                    return;
                } else if (redPoints == bluePoints) {
                    predictedWinner = Math.floor(Math.random() * 2);
                    hasPredicted = true;
                    if (predictedWinner = 0) {
                        log.message(redName + ' is randomly predicted to win!', "info");
                    } else if (predictedWinner = 1) {
                        log.message(blueName + ' is randomly predicted to win!', "info");
                    }
                    return;
                }
            } else if (rows.length < 2) {
                predictedWinner = Math.floor(Math.random() * 2);
                hasPredicted = true;
                if (predictedWinner = 0) {
                    log.message(redName + ' is randomly predicted to win!', "info");
                } else if (predictedWinner = 1) {
                    log.message(blueName + ' is randomly predicted to win!', "info");
                }
                return;
            }
        })
    }
}



function whenRedWins() {
    hasPredicted = false;
    if (predictedWinner == 0) {
        db.run('UPDATE botRnd SET correctPredictions = correctPredictions + 1, totalPredictions = totalPredictions + 1 WHERE name = ?', ["Prediction History"], function(err) {
            if (err) {
                log.message('9:' + err.message, "error");
        }
        log.message("I predicted correctly!", "info");
    });
    } else if (predictedWinner == 1) {
        db.run('UPDATE botRnd SET totalPredictions = totalPredictions + 1 WHERE name = ?', ["Prediction History"], function(err) {
            if (err) {
                log.message('10:' + err.message, "error");
        }
        log.message("I predicted incorrectly.", "info");
    });
    }
}

function whenBlueWins() {
    hasPredicted = false;
    if (predictedWinner == 1) {
        db.run('UPDATE botRnd SET correctPredictions = correctPredictions + 1, totalPredictions = totalPredictions + 1 WHERE name = ?', ["Prediction History"], function(err) {
            if (err) {
                log.message('11:' + err.message, "error");
        }
        log.message("I predicted correctly!", "info");
    });
    } else if (predictedWinner == 0) {
        db.run('UPDATE botRnd SET totalPredictions = totalPredictions + 1 WHERE name = ?', ["Prediction History"], function(err) {
            if (err) {
                log.message('12:' + err.message, "error");
        }
        log.message("I predicted incorrectly.", "info");
    });
    }
}


function setMatchType() {
    if (matchCheck.indexOf('until the next tournament!') != -1 && matchCheck.indexOf('100 more matches until the next tournament!') == -1) {
        matchType = 'Matchmaking';
    } else if (matchCheck.indexOf('bracket') != -1 && matchCheck.indexOf('16 characters are left in the bracket!') == -1 || matchCheck.indexOf('FINAL ROUND!') != -1) {
        matchType = 'Tournament';
    } else if (matchCheck.indexOf('25 exhibition matches left!') != -1) {
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
