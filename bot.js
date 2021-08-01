const request = require('request');
const sqlite3 = require('sqlite3').verbose();
const log = require('./log');
const parseJson = require('parse-json');
const {chromium} = require('playwright');
require('dotenv').config();

var db = new sqlite3.Database('saltydb.db');
db.run('CREATE TABLE IF NOT EXISTS botStats (name text, correctPredictions blob DEFAULT 0, totalPredictions integer DEFAULT 0)');
setTimeout(function () {
    db.all('SELECT COUNT(*) FROM botStats', [], function (err, rows) {
        if (err) {
            log.message('0: ' + err.message, "error");
        } else if (rows[0]['COUNT(*)'] == 0) {
            db.run('INSERT INTO botStats(name) VALUES (?)', ['Prediction History'], function (err) {
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
var redFighter = '';
var blueFighter = '';
var predictedWinner = 2;
var hasPredicted = false;
var hasLoggedIn = false;
var hasBet = false;
var salt = 0;
var oldSalt = 0;
var oldRedFighter = '';
var oldBlueFighter = '';
var lastMatchType = '';

setInterval(dataObserver, 3000);

function dataObserver() {
    request(stateUrl, function (err, res, data) {
        if (err) {
            log.message(data, "debug");
            log.message('2: ' + err.message, "error");
        } else if(res != undefined) {
            try {
                fightData = parseJson(data);
            } catch (error) {
                log.message('3: ' + error, "error");
            }
            matchCheck = fightData.remaining;
            statusCheck = fightData.status;
        }
    });
    setMatchStatus();
    if ((matchStatus != oldStatus) && matchType != 'Exhibition') { //Exhibitions are not tracked.
        oldStatus = matchStatus;
        redFighter = fightData.p1name;
		blueFighter = fightData.p2name;
        switch (matchStatus) {
            case 'open':
                predictWinner(redFighter, blueFighter);
                break;
            case 'locked':
                predictWinner(redFighter, blueFighter);
                break;
            case 'redWon':
                whenRedWins();
                hasBet = false;
                break;
            case 'blueWon':
                whenBlueWins();
                hasBet = false;
                break;
            default:
                log.message('4: Unknown match status!', "error");
                break;
        }
    }
}

function winPerc (num,den) {
    if (den > 0) {
        return (num/den);
    } else if (den == 0) {
        return 0;
    } 
}

function predictWinner(redName, blueName) { 
    if (hasPredicted == false) {
        db.all('SELECT redFighter, blueFighter, rowid, matchWinner FROM matchTable WHERE redFighter IN (?, ?) AND blueFighter IN (?, ?)' , [redName, blueName, redName, blueName], function(err, rows){
            if (err) {
                log.message('5:' + err.message, "error");
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
                    saltyBot();
                    log.message(redName + ' is predicted to win!', "info");
                    return;
                } else if (blueWins > redWins) {
                    predictedWinner = 1;
                    hasPredicted = true;
                    saltyBot();
                    log.message(blueName + ' is predicted to win!', "info");
                    return;
                } else if (redWins == blueWins) {
                    predictedWinner = Math.floor(Math.random() * 2);
                    hasPredicted = true;
                    saltyBot();
                    if (predictedWinner == 0) {
                        log.message(redName + ' is randomly predicted to win!', "info");
                    } else if (predictedWinner == 1) {
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
                log.message('6:' + err.message, "error");
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
            if (err) {
                log.message('7:' + err.message, "error");
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
                let rFavor = winPerc(rows[0].favor, (rMatches + rTMatches));

                let bMatchWins = rows[1].wins;
                let bMatchLosses = rows[1].losses;
                let bMatches = rows[1].matches;
                let bTMatchWins = rows[1].tournamentMatchWins;
                let bTMatchLosses = rows[1].tournamentMatchLosses;
                let bTMatches = rows[1].tournamentMatches;
                let bTFinalWins = rows[1].tournamentFinalWins;
                let bFavor = winPerc(rows[1].favor, (bMatches + bTMatches));

                let rWinRatio = winPerc(rMatchWins, rMatches);
                let rTWinRatio = winPerc(rTMatchWins, rTMatches);
                let bWinRatio = winPerc(bMatchWins, bMatches);
                let bTWinRatio = winPerc(bTMatchWins, bTMatches);

                let redPoints = 0;
                let bluePoints = 0;

                if (rMatches > 0 && bMatches > 0) {
                    if (rWinRatio > bWinRatio) {
                        redPoints = redPoints + 2;
                    } else if (bWinRatio > rWinRatio) {
                        bluePoints = bluePoints + 2;
                    } else if (rWinRatio == bWinRatio) {
                        //do nothing
                    }
                }

                if (rTMatches > 0 && bTMatches > 0 && (matchType != 'Tournament' || matchType != 'Tournament Final')) {
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
                    redPoints = redPoints + 1;
                } else if (bFavor > rFavor) {
                    bluePoints = bluePoints + 1;
                } else if (rFavor == bFavor) {
                    //do nothing
                }

                if (redHasAdv == true) {
                    predictedWinner = 0;
                    hasPredicted = true;
                    saltyBot();
                    log.message(redName + ' is predicted to win!', "info");
                    return;
                } else if (blueHasAdv == true) {
                    predictedWinner = 1;
                    hasPredicted = true;
                    saltyBot();
                    log.message(blueName + ' is predicted to win!', "info");
                    return;
                }

                if (redPoints > bluePoints) {
                    predictedWinner = 0;
                    hasPredicted = true;
                    saltyBot();
                    log.message(redName + ' is predicted to win!', "info");
                    return;
                } else if (bluePoints > redPoints) {
                    predictedWinner = 1;
                    hasPredicted = true;
                    saltyBot();
                    log.message(blueName + ' is predicted to win!', "info");
                    return;
                } else if (redPoints == bluePoints) {
                    predictedWinner = Math.floor(Math.random() * 2);
                    hasPredicted = true;
                    saltyBot();
                    if (predictedWinner == 0) {
                        log.message(redName + ' is randomly predicted to win!', "info");
                    } else if (predictedWinner == 1) {
                        log.message( blueName + ' is randomly predicted to win!', "info");
                    }
                    return;
                }
            } else if (rows.length == 0) {
                predictedWinner = Math.floor(Math.random() * 2);
                hasPredicted = true;
                saltyBot();
                if (predictedWinner == 0) {
                    log.message( redName + ' is randomly predicted to win!', "info");
                } else if (predictedWinner == 1) {
                    log.message( blueName + ' is randomly predicted to win!', "info");
                }
                return;
            } else if (rows.length == 1) {
            let matchWins = rows[0].wins;
            let matches = rows[0].matches;
            let winRatio = winPerc(matchWins, matches);
                if (rows[0].name == redName && winRatio >= .5) {
                    predictedWinner = 0;
                    hasPredicted = true;
                    saltyBot();
                    log.message( redName + ' is predicted to win!', "info");
                    return;
                } else if (rows[0].name == redName && winRatio < .5) {
                    predictedWinner = 1;
                    hasPredicted = true;
                    saltyBot();
                    log.message( blueName + ' is predicted to win!', "info");
                    return;
                } else if (rows[0].name == blueName & winRatio >= .5) {
                    predictedWinner = 1;
                    hasPredicted = true;
                    saltyBot();
                    log.message( blueName + ' is predicted to win!', "info");
                    return;
                } else if (rows[0].name == blueName & winRatio < .5) {
                    predictedWinner = 0;
                    hasPredicted = true;
                    saltyBot();
                    log.message( redName + ' is predicted to win!', "info");
                    return;
                }
            }
        })
    }
}

let browser = '';
let context = '';
let page = '';
async function saltyBot() {
     if (hasLoggedIn == false) { //login
        hasLoggedIn = true;
        browser = await chromium.launch({headless: true});
        context = await browser.newContext();
        context.setDefaultTimeout(0);
        page = await context.newPage();
        await page.goto('https://www.saltybet.com/authenticate?signin=1');
        await page.fill('id=email', process.env.email);
        await page.fill('id=pword', process.env.pword);
        await page.click('input.graybutton');
    }
    await page.waitForSelector('id=balance');
    salt = await page.$eval('id=balance', function (e) {
        return parseInt(e.innerHTML.replace(/,/g, ''));
    });
    let betAmount = await betCalc(salt);
    if (matchType == 'Tournament' && hasBet == false || matchType == 'Tournament Final' && hasBet == false) {
        await page.click('id=interval10')
        hasBet = true;
    }else if (matchType != 'Tournament' && hasBet == false || matchType != 'Tournament Final' && hasBet == false){
        await page.fill('id=wager', betAmount); 
        hasBet = true;
    }

    let saltWon = (salt-oldSalt);
    if (saltWon != oldSalt && oldSalt != 0 && lastMatchType != 'Tournament Final' && matchType != 'Tournament' && matchType != 'Tournament Final') { //This is adding salt to the new match that just started. Tournament salt is not tracked.
        db.run('UPDATE matchTable SET saltWon = (?) WHERE redFighter = (?) AND blueFighter = (?)', [saltWon, oldRedFighter, oldBlueFighter], function(err) {
            if (err) {
                log.message('8: ' + err.message, "error");
            } else {
                log.message('I earned ' + saltWon + ' salt last match!', "info");
                oldSalt = salt;
                oldRedFighter = redFighter;
                oldBlueFighter = blueFighter;
                lastMatchType = matchType;
            }
        });
    } else {
        oldRedFighter = redFighter;
        oldBlueFighter = blueFighter;
        lastMatchType = matchType;
    }

    if (predictedWinner == 0) {
        await page.click('id=player1');  
        db.run('INSERT INTO matchTable VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [null, null, null, null, null, null, null, redFighter, null], function(err) {
            if (err) {
                log.message('9: ' + err.message, "error");
            } else {
                log.message('Prediction has been saved to the database!', "info");
            }
        });
    }  else if (predictedWinner == 1) {
            await page.click('id=player2');
            db.run('INSERT INTO matchTable VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [null, null, null, null, null, null, null, blueFighter, null], function(err) {
            if (err) {
                log.message('10: ' + err.message, "error");
            } else {
                log.message('Prediction has been saved to the database!', "info");
            }
        });
    }
    if (oldSalt == 0) {
        oldSalt = salt;
        oldRedFighter = redFighter;
        oldBlueFighter = blueFighter;
        lastMatchType = matchType;
    }
    
}


function whenRedWins() {
    hasPredicted = false;
    if (predictedWinner == 0) {
        db.run('UPDATE botStats SET correctPredictions = correctPredictions + 1, totalPredictions = totalPredictions + 1 WHERE name = ?', ["Prediction History"], function(err) {
            if (err) {
                log.message('11:' + err.message, "error");
            }
            log.message("I predicted correctly!", "info");
        });
    } else if (predictedWinner == 1) {
        db.run('UPDATE botStats SET totalPredictions = totalPredictions + 1 WHERE name = ?', ["Prediction History"], function(err) {
            if (err) {
                log.message('12:' + err.message, "error");
            }   
        log.message("I predicted incorrectly.", "info");
    });
    }
}

function whenBlueWins() {
    hasPredicted = false;
    if (predictedWinner == 1) {
        db.run('UPDATE botStats SET correctPredictions = correctPredictions + 1, totalPredictions = totalPredictions + 1 WHERE name = ?', ["Prediction History"], function(err) {
            if (err) {
                log.message('13:' + err.message, "error");
        }
        log.message("I predicted correctly!", "info");
    });
    } else if (predictedWinner == 0) {
        db.run('UPDATE botStats SET totalPredictions = totalPredictions + 1 WHERE name = ?', ["Prediction History"], function(err) {
            if (err) {
                log.message('14:' + err.message, "error");
        }
        log.message("I predicted incorrectly.", "info");
    });
    }
}

async function betCalc(salt) {
    if (salt < 250) {
        return '100'
    } else if (salt <= 10000 && salt >= 250) {
        return '250';
    } else {
        let calc = (salt*.025);   
        return Math.round(calc).toString();
    }
}


function setMatchType() {
    if ((matchCheck.indexOf('100 more matches until the next tournament!') != -1 && matchStatus == 'open') ||
    (matchCheck.indexOf('until the next tournament!') != -1 && matchCheck.indexOf('100 more matches until the next tournament!') == -1) || 
    (matchCheck.indexOf('Tournament mode will be activated after the next match!') != -1) ||
    (matchCheck.indexOf('Tournament mode start!') != -1 && (matchStatus == 'redWon' || matchStatus == 'blueWon'))) {
        matchType = 'Matchmaking';
    } else if ((matchCheck.indexOf('Tournament mode start!') != -1 && matchStatus == 'open') ||
    (matchCheck.indexOf('bracket') != -1) ||
    (matchCheck.indexOf('FINAL ROUND!') != -1 && (matchStatus == 'redWon' || matchStatus == 'blueWon'))) {
        matchType = 'Tournament';
    } else if ((matchCheck.indexOf('FINAL ROUND!') != -1 && matchStatus == 'open') ||
    (matchCheck.indexOf('25 exhibition matches left!') != -1 && (matchStatus == 'redWon' || matchStatus == 'blueWon'))) {
        matchType = 'Tournament Final';
    } else if ((matchCheck.indexOf('25 exhibition matches left!') != -1 && matchStatus == 'open') ||
    (matchCheck.indexOf('exhibition matches left!') != -1 && matchCheck.indexOf('25 exhibition matches left!') == -1) ||
    (matchCheck.indexOf('Matchmaking mode will be activated after the next exhibition match!') != -1) ||
    (matchCheck.indexOf('100 more matches until the next tournament!') != -1 && (matchStatus == 'redWon' || matchStatus == 'blueWon'))) {
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
    setMatchType();
}
