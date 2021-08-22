const express = require('express');
const resolve = require('path').resolve;
const router = express();
const fs = require('fs')


var jsonPath= resolve('./json/matchhistory.json'); //Obtains absolute path

router.get('/', (req, res) => {
    res.set('Cache-Control', 'public, max-age=31557600');
    fs.readFile(jsonPath, "utf8", (err, data) => {
        data = JSON.parse(data);
        res.set('Cache-Control', 'no-cache');
        res.set('X-Content-Type-Options', 'nosniff');
        res.removeHeader('x-powered-by');
        res.send(data);
    })
});

module.exports = router;