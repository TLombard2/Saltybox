const http = require('http')
const https = require('https')
const express = require('express');
const resolve = require('path').resolve;
const ejs = require('ejs');
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

const dataRouter = require('./routes/data'); //Will load /data
app.use('/data', dataRouter);

const jsonDataRouter = require('./routes/datajson'); //Will load /json/data.json
app.use('/json/data.json', jsonDataRouter);


http.createServer(app).listen(80, () => {
    console.log("Listening on port 80!");
})

https.createServer(options, app).listen(443, () =>{
    console.log("Listening on port 443!");
})

