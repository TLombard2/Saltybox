const express = require('express');
const resolve = require('path').resolve;
const ejs = require('ejs');
const app = express();
const port = 61117;

app.set('view engine', 'ejs');
var filePath = resolve('./views/index'); //Obtains absolute path

app.get('/', (req,res) => {
    res.render(filePath);
})

const dataRouter = require('./routes/data');
app.use('/data', dataRouter);

app.listen(port, (err) => { //0.0.0.0
    if (err) {
        log.message('1: ' + err);
    } else {
    console.log('Server running!')
    }
})
