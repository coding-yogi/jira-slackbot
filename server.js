var config = require('./config/config.js');
var msgHandler = require('./handlers/messageHandler.js');
var db = require('./handlers/mongoHandler.js');

var SlackBot = require('slackbots')

//start the bot
console.log('Starting Bot');

var bot = new SlackBot({
	token: config.botToken,
	name: config.botName
});

bot.on('start', function() {

    // more information about additional params https://api.slack.com/methods/chat.postMessage 
    var params = {
        as_user: true
    };

    //connect to Mongo and get all ysers
    console.log('Connecting to DB');
    db.connect(config.mongoUrl, config.dbname);
    

    /*var users = config.users;
    users.forEach(function(user) {
    	console.log('user ' + user.username);
    })*/
      
    // define existing username instead of 'user_name' 
    //bot.postMessageToUser('gadrea', 'Jiratron is activated. Chat with me and I will see how can I help!', params);       
});

bot.on('message', function(data) {

	if(data.type === 'message' && typeof data.user === 'string' && typeof data.bot_id === 'undefined') {		
		msgHandler(bot, data, db);
	}
	
})