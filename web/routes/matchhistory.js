const express = require('express');
const sqlite3 = require('sqlite3');
const resolve = require('path').resolve;
const router = express();
const fs = require('fs')

var data = [];

var db = new sqlite3.Database('../saltydb.db');

getData();
setInterval(getData, 3000);

function getData() {
    db.all('SELECT * FROM matchTable', (err,rows) => {
        if (err) {
            log.message('1: ' + err);
        } else {
            data = rows;
            send(data);
        }
    })
}

function send(data) {
    var filePath = resolve('./views/matchhistory.ejs'); //Obtains absolute path
    var dataPath = resolve('./json/matchhistory.json');
    let json = JSON.stringify(data);
    fs.writeFileSync(dataPath, json);
    router.get('/', (req,res) => {
        res.set('Cache-Control', 'no-cache');
        res.set('X-Content-Type-Options', 'nosniff');
        res.removeHeader('x-powered-by');
        res.render(filePath)
   })
}

module.exports = router;