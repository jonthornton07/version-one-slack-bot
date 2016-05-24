/**
 *  TODO:
 *  Handle configuring the token
 */
require('string.prototype.startswith');

var Botkit = require('botkit');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var DONE =  (typeof XMLHttpRequest.Done !== 'undefined') ? XMLHttpRequest.Done : 4;

if (!process.env.token) {
  console.log('Error: Specify token in environment');
  process.exit(1);
}

if (!process.env.authToken) {
  console.log('Error: Must give an auth token');
  process.exit(1);
}

if (!process.env.baseUrl) {
  console.log('Error: Must provide a base url');
  process.exit(1);
}

var slackToken = process.env.token;
var apiAuthToken = process.env.authToken;
var baseUrl = process.env.baseUrl;
var controller = Botkit.slackbot();
var bot = controller.spawn({
  token: slackToken
});

bot.startRTM(function(err,bot,payload) {
  if (err) {
    throw new Error('Could not connect to Slack');
  }
});

controller.hears(["[D|B]-([^\s]+)"],["direct_message","direct_mention","mention","ambient"],function(bot,message) {
  bot.startConversation(message, handleStoryOrDefect);
});

handleStoryOrDefect = function(response, conversation) {
  var reg = /([B|D|E|TK|AT|FG|I|R]-\d+)/gi;
  var result;
    while ((result = reg.exec(conversation.source_message.text)) !== null) {
      var number = result[1];
      if (number.startsWith('D')) {
        fetchStoryOrDefectInfo('Defect', number, conversation);
      } else if (number.startsWith('B')) {
        fetchStoryOrDefectInfo('Story', number, conversation);
      }
    }
}

fetchStoryOrDefectInfo = function(urlIdentifier, number, conversation) {
  var url = baseUrl + "/v1sdktesting/rest-1.v1/Data/" + urlIdentifier + "?Where=Number=\"" + number +"\"";

  var serviceCall = new XMLHttpRequest();
  serviceCall.onreadystatechange = function() {
    if (serviceCall.readyState == DONE) {
      var response = JSON.parse(serviceCall.responseText);
      var number = response.Assets[0].Attributes.Number.value;
      var title = response.Assets[0].Attributes.Name.value;
      var identifier = response.Assets[0].id.split(":")[1];
      conversation.say("[" + number + "] " + title + "  (" + baseUrl + "/assetdetail.v1?oid=" + urlIdentifier + "%3A" + identifier + ")");
      conversation.next();
    }
  };

  serviceCall.open("GET", url, false);
  serviceCall.setRequestHeader("Authorization", "Bearer " + apiAuthToken);
  serviceCall.setRequestHeader("Accept", "application/json");
  serviceCall.send();
}
