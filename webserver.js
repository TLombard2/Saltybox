const http = require('http');
const log = require('/.log')

//Create webserver.
const hostName = '192.168.0.162'; //local network access.
const port = 3000;

var server = http.createServer(function(request, response) {
	response.statusCode = 200;
	response.setHeader('Content-Type', 'text/plain');
	response.end('Hello World');
});

server.listen(port, hostName, function()  {
	log("Saltybox web server is live @ " + hostName + ":" + port, "info");
});