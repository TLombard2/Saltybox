//Creates log function to output to console and main.log using a string and log type as parameters.
exports.message =  function(str, logType) { 

const log4js = require('log4js');

//Setup logger
log4js.configure({
	appenders: { mainLog: { type: "file", filename: "log.txt"} },
	categories: { default: { appenders: ["mainLog"], level: "all"}}
});

//Creates a new log in local directory
	const fileLogger = log4js.getLogger("mainLog"); 
	

//Check type of log and print
	switch(logType) {
		case "info":
		    //fileLogger.info(str);
		    console.log(str);
		break;
		case "error":
		    fileLogger.error(str);
		    console.log(str);
		break;
		case "debug":
		    fileLogger.debug(str);
		    console.log(str);
		break;
		case "warn":
		    fileLogger.warn(str);
		    console.log(str);
		break;
		default:
		    fileLogger.error("Invalid logType.");
		    console.log("Invalid logType.");
	}
};