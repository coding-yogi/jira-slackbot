var slacknode = require('slack-node');
var config = require('../config/config.js');
var jiraHandler = require('./jiraHandler');
var userModel = require('../models/user.js');

var messageHandler = function(bot, data, db) {

	console.log('Getting users');

	db.getUser({slackId: data.user})
		.then(function(users) {
			
			if(users.length === 0) {

				console.log('User ' + data.user + 'not found');

				//Get user object from data
				var slack = new slacknode(config.botToken);

				//Get User info
				slack.api('users.info', {user: data.user}, function(err, response) {

					if(err) {
						console.log('unable to fetch info for user ' + data.user + 'exception ' + err + ' occured');
						return;					
					}

					//Define new user
					var newUser = new userModel({
						slackId: data.user,
						username: response.user.name,
						profile: {
							firstname: response.user.profile.first_name,
							lastname: response.user.profile.last_name,
							email: response.user.profile.email
						},
						authtoken: ''
					});

					// save the user
					console.log('Creating a new User');
					db.createOrUpdateUser(newUser)
						.then(function(user) {

							//post
							postMessage('Hey ' + newUser.profile.firstname + ', You are identified as new user. Request you to provide Jira Auth Token');
							return;
						})
						.catch(function(err) {
							console.log('error saving ' + data.user + 'user in db ');
							return;
						})					
				});
			}
			else {

				console.log('User found. fetching details');

				var user = users[0];

				//Fetch 1st name and username for user
				var objectID = user._id;
				var userFirstName = user.profile.firstname;
				var userName = user.username;	
				var jiraToken = user.authtoken;					

				//console.log('setting user details for jira');
				jiraHandler.setUserDetails(userName, jiraToken);

				if(data.text.toLowerCase().includes('list') && data.text.toLowerCase().includes('active') && data.text.toLowerCase().includes('sprints')) {

					//Get List of currently active sprints
					jiraHandler.getCurrentActiveSprints()
						.then(function(body) {

							var res = JSON.parse(body).values;	
							var sprints = '\n\n';

							for(i = 0; i < res.length; i++) {
								sprints = sprints + '*ID*: ' + res[i].id + ' *Name*: ' + res[i].name + '\n';
							}

							//post
							postMessage('Hey ' + userFirstName + ', Here is the list of current sprints: ' + sprints);
						})	
						.catch(function(err) {

							if(err.statusCode == 401) {
								authorizationFailureMessage()
								return;
							}

							console.log('Error occurred while fetching active sprints ' + err.statusCode);
							postMessage('Some error occured while fetching active sprints');	
							return;
						})			
				}
				else if((data.text.toLowerCase().includes('tasks') || data.text.toLowerCase().includes('stories')) && data.text.toLowerCase().includes('sprint')) {

					var sprintId = '';

					try {
						sprintId = data.text.split('sprint')[1].split(' ')[1].trim();
					}
					catch(e) {
						//post
						postMessage('Sorry, Unable to get sprint ID');
						return;
					}
					
					if(isNaN(sprintId)) {
						//post
						postMessage('Sorry, Unable to get a valid sprint Id from your request');
						return;
					}

					//Get List of currently active sprints
					jiraHandler.getTasksForSprint(sprintId)
						.then(function(body) {

							var res = JSON.parse(body).issues;
							var issues = '\n\n';
							for(i = 0; i < res.length; i++) {
								issues = issues + res[i].key + ' ' + res[i].fields.summary + '\n';
							}

							//post
							postMessage('There you go!, Here is the list of tasks for sprint: ' + sprintId + issues);
						})
						.catch(function(err) {

							if(err.statusCode == 401) {
								authorizationFailureMessage()
								return;
							}

							console.log('Error occurred while fetching tasks for active sprints ' + err.statusCode);
							postMessage('Some error occured while fetching tasks for sprint: ' + sprintId);		
							return;
						})			
				}
				else if(data.text.toLowerCase().includes('logged') && data.text.toLowerCase().includes('hours') && data.text.toLowerCase().includes('sprint')) {

					var sprintId = '';

					try {
						sprintId = data.text.split('sprint')[1].split(' ')[1].trim();
					}
					catch(e) {
						//post
						postMessage('Sorry, Unable to get sprint ID');
						return;
					}			

					if(isNaN(sprintId)) {
						//post
						postMessage('Sorry, Unable to get a valid sprint Id from your request');
						return;
					}

					postMessage('Sure, Hold on while I get the required data !');

					var sprintStartDate, sprintEndDate;

					//Get Sprint Details
					jiraHandler.getSprintDetails(sprintId)
						.then(function(body) {

							var res = JSON.parse(body);

							sprintStartDate = res.startDate;
							sprintEndDate = res.endDate;
						
							//Get List of currently active sprints
							return jiraHandler.getTasksForSprint(sprintId);
						})
						.then(function(body) {

							var res = JSON.parse(body).issues

							var totalLoggedHoursForSprintInSecs = 0;
							var issuesWithHoursLogged = [];

							//Loop thru all tasks
							for(var i = 0; i < res.length; i++) {

								var issueId = res[i].id;

								if(res[i].fields.timespent > 0) 
									issuesWithHoursLogged.push(issueId);						
							}

							console.log('Issues with logged hours \n' + issuesWithHoursLogged + '\n');

							jiraHandler.getLoggedHoursByUserForIssue(issuesWithHoursLogged)
								.then(function(arrBody) {

									var iCnt = 0;

									arrBody.forEach(function(body) {

										iCnt++;

										var response = JSON.parse(body).worklogs;								
										var totalWorkLoggedForIssueInSecs = 0;

										//loop thru logged hours to get total logged hours for task
										for(z = 0; z < response.length; z++) {
											if(response[z].author.name === userName 
											&& response[z].started >= sprintStartDate 
											&& response[z].started < sprintEndDate) {
												totalWorkLoggedForIssueInSecs = totalWorkLoggedForIssueInSecs + response[z].timeSpentSeconds;	
											}														
										}

										console.log(iCnt + ' ' + response[0].issueId + ' ' + totalWorkLoggedForIssueInSecs);
										totalLoggedHoursForSprintInSecs = totalLoggedHoursForSprintInSecs + totalWorkLoggedForIssueInSecs;
									})
									
									var hours = Math.floor(totalLoggedHoursForSprintInSecs / 3600);
									var mins = Math.floor((totalLoggedHoursForSprintInSecs-hours*3600) / 60)
									postMessage('Here it is, you have logged *' + hours + ' hours and ' + mins + ' minutes* for sprint starting on *' + sprintStartDate.split('T')[0] + '* and ending on *' +  sprintEndDate.split('T')[0] + '*');

								})
								.catch(function(err) {
									console.log('Error occured while fetching logged hours ' + err);
								})
						})
						.catch(function(err) {
							console.log('Error occured while fetching details ' + err);
						})									
				}
				else if(data.text.toLowerCase().includes('awesome') || data.text.toLowerCase().includes('fantastic') || data.text.toLowerCase().includes('great') || data.text.toLowerCase().includes('cool')) {
					postMessage('Thank you ' + userFirstName + ' ! :)');			
				}
				else if(data.text.toLowerCase().includes('set authorization')) {

					try{

						var authToken = data.text.split('Basic')[1].split(' ')[1];
						user.authtoken = authToken;
						db.createOrUpdateUser(user)
						.then(function(user) {

							//post
							postMessage('Hey ' + user.profile.firstname + ', You Jira Auth Token has been updated successfully!');
							return;
						})
						.catch(function(err) {
							console.log('Error occured while updating auth token ' + err);
							postMessage('Error occured while updating auth token ');
							return;
						})	

					}
					catch(err) {
						postMessage('Unable to extract token. Please try again');
						return;
					}					
				}
				else if(jiraHandler.isValidIssueFormat(data.text)) {

					jiraHandler.getIssueDetails(data.text)
					.then(function(body) {

						var res = JSON.parse(body);

						var summary = res.fields.summary;
						postMessage('*Summary: * ' + summary);
						
					})
					.catch(function(err) {							
						postMessage('No issue found with jira id ' + data.text.toUpperCase());
						return;
					})
				}
				else {
					//Send message
					postMessage('Sorry ' + userFirstName + ', cannot help much here. Could you please try other keywords?\n\
					*Some of the things you can try*\n\
					_get me list of currently active sprints_ \n\
					_get me logged hours for sprint <sprintID>_ \n\
					_get list of stories for sprint <sprintID>_ \n\
					or just enter _jiraID_ to get the description of issue');
				}	
			}
		})
		.catch(function(error) {

			console.log(error);
		})

	var postMessage = function(message) {

		var postOptions = {
			as_user: true
		}

		bot.postMessage(data.channel, message, postOptions)
	}

	var authorizationFailureMessage = function() {
		postMessage('Your are not authorized to perform this operation\nEither your Basic Authorization token is expired or invalid');
		postMessage('You can reset token with command like Set Authorization to Basic c29tZXVzZXI6c29tZXBhc3N3b3Jk');	
	}
}

module.exports = messageHandler;