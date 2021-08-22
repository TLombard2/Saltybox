const http = require('http')
const https = require('https')
const express = require('express');
const resolve = require('path').resolve;
const fs = require('fs')
const path = require('path');

const app = express();

var privateKey = fs.readFileSync('../key.pem', 'utf8');
var certificate = fs.readFileSync('../cert.pem', 'utf8');

var options = {key: privateKey, cert: certificate};

app.set('view engine', 'ejs');

var filePath = resolve('./views/index'); //Obtains absolute path
app.get('/', (req,res) => { //Will load default page
    res.set('Cache-Control', 'public, max-age=604800000');
    res.render(filePath);
})

const fighterDataRouter = require('./routes/fighterdata.js'); //Will load /fighterdata
app.use('/fighterdata', fighterDataRouter);

const matchDataRouter = require('./routes/matchhistory.js'); //Will load /matchdata
app.use('/matchhistory', matchDataRouter);

const cssRouter = require('./routes/styles.js'); //Will load /styles.css
app.use('/styles.css', cssRouter);

const jsonDataRouter1 = require('./routes/raw1.js'); //Will load /raw.json
app.use('/raw1.json', jsonDataRouter1, );

const jsonDataRouter2 = require('./routes/raw2.js'); //Will load /raw2.json
app.use('/raw2.json', jsonDataRouter2);



http.createServer((req, res) => {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
}).listen(80, () => {
    console.log("Listening on port 80!");
})

https.createServer(options, app).listen(443, () =>{
    console.log("Listening on port 443!");
})

