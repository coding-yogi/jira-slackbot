var config = require('../config/config.js');

var mongodb = require('mongodb');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var userModel = require('../models/user.js');

var connect = function(url, db) {

	var dbUrl = url + '/' + db;
	mongoose.connect(dbUrl);
}

var disconnect = function() {

	mongoose.disconnect();
}

var getUser = function(filter) {

	return userModel.find(filter).exec();
}

var createOrUpdateUser = function(newUser) {

	return newUser.save();
}

module.exports = {
	connect: connect,
	getUser: getUser,
	disconnect: disconnect,
	createOrUpdateUser: createOrUpdateUser
}