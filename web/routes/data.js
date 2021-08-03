const express = require('express');
const sqlite3 = require('sqlite3');
const resolve = require('path').resolve;
const ejs = require('ejs');
const router = express();
const fs = require('fs')

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
    var filePath = resolve('./views/data'); //Obtains absolute path
    var dataPath = resolve('./json/data.json');
    router.get('/', (req,res) => {
        res.render(filePath)
      let json = JSON.stringify(data);
     fs.writeFileSync(dataPath, json);
   })
}

module.exports = router;