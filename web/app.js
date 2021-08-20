const http = require('http')
const https = require('https')
const express = require('express');
const resolve = require('path').resolve;
const app = express();
const fs = require('fs')

var privateKey = fs.readFileSync('../key.pem', 'utf8');
var certificate = fs.readFileSync('../cert.pem', 'utf8');

var options = {key: privateKey, cert: certificate};

app.set('view engine', 'ejs');

var filePath = resolve('./views/index'); //Obtains absolute path
app.get('/', (req,res) => { //Will load default page
    res.render(filePath);
})

const fighterDataRouter = require('./routes/fighterdata.js'); //Will load /fighterdata
app.use('/fighterdata', fighterDataRouter);

const matchDataRouter = require('./routes/matchdata.js'); //Will load /matchdata
app.use('/matchdata', matchDataRouter);

const jsonDataRouter1 = require('./routes/raw1.js'); //Will load /raw.json
app.use('/raw1.json', jsonDataRouter1);

const jsonDataRouter2 = require('./routes/raw2.js'); //Will load /raw2.json
app.use('/raw2.json', jsonDataRouter2);


http.createServer(app).listen(80, () => {
    console.log("Listening on port 80!");
})

https.createServer(options, app).listen(443, () =>{
    console.log("Listening on port 443!");
})

