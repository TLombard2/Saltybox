const express = require('express');
const resolve = require('path').resolve;
const ejs = require('ejs');
const app = express();
const port = 61117;

app.set('view engine', 'ejs');
var filePath = resolve('./views/index'); //Obtains absolute path

app.get('/', (req,res) => { //Will load default page
    res.render(filePath);
})

const dataRouter = require('./routes/data'); //Will load /data
app.use('/data', dataRouter);

const jsonDataRouter = require('./routes/datajson'); //Will load /json/data.json
app.use('/json/data.json', jsonDataRouter);


app.listen(port, (err) => { //0.0.0.0
    if (err) {
        log.message('1: ' + err);
    } else {
    console.log('Server running!')
    }
})
