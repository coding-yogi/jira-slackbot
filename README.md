# jira-slackbot
Slack bot to get logged hours from Jira

![Jiratron Logo](https://s-media-cache-ak0.pinimg.com/236x/11/ce/1b/11ce1b5518acadf20870b3539cc8f17a.jpg)

## Prerequisites
* Install nodejs
* Install npm
* Install MongoDB

## Steps to get Jiratron up and running
- Clone the repo
- Start the mongod service 
- If required update the Bot Token, Jira URL and MongoDB URL
- Run command "node server.js"

You should see Jiratron up and running in slack

## Commands supported 
* set authorization Basic {JiraToken} - This is used for user interacting for the 1st time with Jiratron
* get list of currently active sprints - Gets list of sprints from ID project which are currently active
* get tasks for sprint {SprintID} - Gets all the tasks for the sprint id provided
* get logged hours for sprint {SprintID} - Gets logged hour for the user interacting with jiratron for a particular sprint
* {JiraIssueID} - Gets the title of the Issue ID entered

## Troubleshooting
* If Jiratron is inactive in slack you can just restart the node server
