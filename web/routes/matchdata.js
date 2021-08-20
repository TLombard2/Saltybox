const express = require('express');
const sqlite3 = require('sqlite3');
const resolve = require('path').resolve;
const router = express();
const fs = require('fs')

var data = [];

var db = new sqlite3.Database('../saltydb.db');

db.all('SELECT * FROM matchTable', (err,rows) => {
    if (err) {
        log.message('1: ' + err);
    } else {
        data = rows;
        send(data);
    }
})

function send(data) {
    var filePath = resolve('./views/matchdata.ejs'); //Obtains absolute path
    var dataPath = resolve('./json/matchdata.json');
    router.get('/', (req,res) => {
        res.render(filePath)
      let json = JSON.stringify(data);
     fs.writeFileSync(dataPath, json);
   })
}

module.exports = router;