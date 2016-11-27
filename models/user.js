var mongoose = require('mongoose');

var userSchema = new mongoose.Schema ({

	slackId: String,

	username: String,

	profile: {

		firstname: String,

		lastname: String,

		email: String
	},

	authtoken: String
});

var userModel = mongoose.model('User', userSchema);

module.exports = userModel;