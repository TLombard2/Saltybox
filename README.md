Saltybox is a data collection and betting bot for the fictional betting platform Saltybet.
The bot has two parts, the scraper and the bettor.
The scraper collects fighter names, betting odds, fight outcomes, and more into a local database.
The bettor uses a custom algorithm to bet fictional currency on each match based on the collected data.

You may see my bot's bets on the sidebar of a match on Saltybet.com by the name SaltyBoxOffical.
SaltyBoxOfficial is currently in the top 200 of all bettors.
My bot has a correct prediction rate of approximately 65% and will only increase with more data.
The data I have collected so far is currently NOT included.


HOW TO INSTALL:
- Install NodeJS HERE: https://nodejs.org/en/ 
- Clone Saltybox to your computer or download the zip and unzip it.
- Open the file named .env in a text editor and enter you email and password in the quotations.
- Install dependencies using a command line while in the same directory as the Saltybox files: 'npm install'
- Run scraper.js using 'node scraper.js' in a command line to collect data.
- Run bot.js using 'node bot.js' in a command line to start betting. 

NOTE: bot.js is dependent on scraper.js running and cannot function without it.

