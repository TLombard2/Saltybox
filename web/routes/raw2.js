const express = require('express');
const sqlite3 = require('sqlite3');
const resolve = require('path').resolve;
const router = express();
const fs = require('fs')


var filePath= resolve('./json/matchdata.json'); //Obtains absolute path
fs.readFile(filePath, "utf8", (err, data) => {
    router.get('/', (req, res) => {
        try {
        data = JSON.parse(data);
        }catch {
            //do nothing lul
        }
        res.send(data);
    })
});


module.exports = router;