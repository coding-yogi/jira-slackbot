var jiraHandler = {

	request: require('request-promise'),

	config:  require('../config/config.js'),
	
	username: '',

	jiraAuthToken: '',

	setUserDetails: function(username, authToken) {
		this.username = username;		
		this.jiraAuthToken = authToken;
	},		

	getAuthHeader: function() {
		return 'Basic ' + this.jiraAuthToken;
	},

	setOptions: function(endpoint) {
		
		return {

			url: this.config.jiraUrl + endpoint,
			headers: {
				'Authorization': this.getAuthHeader()
			}
		}
	},

	isValidIssueFormat: function(data) {
	
		var regex = new RegExp(/^(ID|CPMS)-\d+/);
		return regex.test(data.toUpperCase());
	},

	getCurrentActiveSprints: function() {	
	
		var options = this.setOptions('/rest/agile/1.0/board/384/sprint?state=active');
		return this.request(options);		
	},

	getSprintDetails: function(sprintId) {

		var options = this.setOptions('/rest/agile/1.0/sprint/' + sprintId);
		return this.request(options);
	},

	getIssueDetails: function(issueID) {

		var options = this.setOptions('/rest/api/2/issue/' + issueID);
		return this.request(options);
	},

	getTasksForSprint: function(sprintId) {

		var options = this.setOptions('/rest/api/2/search?jql=Sprint=' + sprintId + '&maxResults=500')
		return this.request(options);
	},

	getLoggedHoursByUserForIssue: function(issues) {

		return Promise.all(issues.map(function(issueId) {

			var options = jiraHandler.setOptions('/rest/api/2/issue/' + issueId + '/worklog');

			var retry = function() {

				console.log('1st try for issue ' + issueId);
				var request = jiraHandler.request(options);

				for(var z = 0; z < 3; z++) {
					request = request.catch(function(err) {
						console.log('Exception caught for issue ' + issueId + ' retrying...');
						return jiraHandler.request(options);
					})
				}

				return request;
			}

			return retry();
		}))
	}
};

module.exports = jiraHandler;