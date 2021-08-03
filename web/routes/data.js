const express = require('express');
const sqlite3 = require('sqlite3');
const resolve = require('path').resolve;
const ejs = require('ejs');
const router = express();
const { JSDOM } = require( "jsdom" );
const { window } = new JSDOM( "" );
const $ = require( "jquery" )( window );
var dt = require('datatables.net');






var data = [];

var db = new sqlite3.Database('../saltydb.db');

db.all('SELECT * FROM fighterTable', (err,rows) => {
    if (err) {
        log.message('1: ' + err);
    } else {
        data = rows;
        send(data);
    }
})

function send(data) {
    let nameRow = data.map( (value) => {
        return value.name;
    })
    let winsRow = data.map( (value) => {
        return value.wins;
    })
    let lossesRow = data.map( (value) => {
        return value.losses;
    })
    let matchesRow = data.map( (value) => {
        return value.matches;
    })
    let tournamentMatchWinsRow = data.map( (value) => {
        return value.tournamentMatchWins;
    })
    let tournamentMatchLossesRow = data.map( (value) => {
        return value.tournamentMatchLosses;
    })
    let tournamentMatchesRow = data.map( (value) => {
        return value.tournamentMatches;
    })
    let tournamentFinalWinsRow = data.map( (value) => {
        return value.tournamentFinalWins;
    })
    let favorRow = data.map( (value) => {
        return value.favor;
    })

    var filePath = resolve('./views/data'); //Obtains absolute path
    router.get('/', (req,res) => {
        res.render(filePath, {data : {userQuery: req.params.userQuery, data}});
    //createTable(nameRow, winsRow, lossesRow, matchesRow, tournamentMatchWinsRow, tournamentMatchLossesRow, tournamentMatchesRow, tournamentFinalWinsRow, favorRow);
    }
)}




module.exports = router;