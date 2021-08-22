const express = require('express');
const resolve = require('path').resolve;
const router = express();
const fs = require('fs')

var filePath= resolve('./json/fighterdata.json'); //Obtains absolute path

router.get('/', (req, res) => {
    fs.readFile(filePath, "utf8", (err, data) => {
        data = JSON.parse(data);
        res.set('Cache-Control', 'no-cache');
        res.set('X-Content-Type-Options', 'nosniff');
        res.removeHeader('x-powered-by');
        res.send(data);
    })
});


module.exports = router;