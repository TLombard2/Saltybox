const express = require('express');
const resolve = require('path').resolve;
const router = express();
const fs = require('fs')


var filePath= resolve('./css/styles.css'); //Obtains absolute path

router.get('/', (req, res) => {
    fs.readFile(filePath, "utf8", (err, data) => {
        res.set('Content-Type', 'text/css');
        res.set('Cache-Control', 'no-cache');
        res.set('X-Content-Type-Options', 'nosniff');
        res.removeHeader('x-powered-by');
        res.send(data);
    })
});

module.exports = router;