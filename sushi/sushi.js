var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var menu = require('./menu');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// See example of Slack POST at the bottom as well
var exampleMessage =
  {
    date: new Date(1970, 1, 1),
    text: 'Initial message',
    channel_name: 'whatever',
    user_name: 'foo',
    trigger_word: 'bar'
  };

var messages = [exampleMessage];

var exampleDriver = {
    date: new Date(1970, 1, 1),
    user_name: 'foo'
};

var drivers = [exampleDriver];

app.get('/', function (req, res) {
  return res.json(messages);
});

function getMessagesToday() {
  var tmpMessagesToday = messages.filter(message => {
    var today = new Date().toISOString().substr(0,10);
    return message.date.toISOString().substr(0,10) === today;
  });
  var orderNumberRegex = /^(\d+)\)/;
  tmpMessagesToday.sort((a,b) => {
    var aNum = parseInt(orderNumberRegex.exec(a.order), 10) || 0;
    var bNum = parseInt(orderNumberRegex.exec(b.order), 10) || 0;
    return aNum - bNum;
  });

  return tmpMessagesToday;
}

function getDriverToday() {
  return drivers.filter(message => {
    var today = new Date().toISOString().substr(0,10);
    return message.date.toISOString().substr(0,10) === today;
  });
}

var randomFeedback = [
  'Omnomnom',
  'No soup for you!',
  'Har du egentlig godt av det?',
  'Roger that!'
];

function getRandomFeedback() {
  return randomFeedback[Math.floor(Math.random()*randomFeedback.length)];
}


var bestillingsRegEx = /^(\d+)$/;

var bestillingsText = 'Bestillinger gjøres på et format som f.eks. `9`.\n:nerd_face: Valideringskode: `' + bestillingsRegEx.toString() + '`';
var andreInstruksjoner = '\nHar alle bestilt? `sushi driver` for å plukke ut en heldig sjåfør blandt bestillingene!' +
'\n`sushi list`' +
'\n`sushi slett` - hvis du glemte Beach Body-prosjektet ditt';

function getMenuText() {
  var introText = 'Se også http://www.ntkiosk.no/page10.html \n';
  return introText +
    menu.map(menuItem => `${menuItem.number}) ${menuItem.text} - ${menuItem.price}`).join('\n') +
    '\n' + bestillingsText + andreInstruksjoner;
}


app.post('/', function (req, res) {
  console.log(new Date(), req.body);
  var slackInput = req.body.text.substr(req.body.trigger_word.length).trim();

  console.log('slackInput', slackInput);

  if (slackInput.indexOf('meny') > -1) {
    return res.json({
      text: getMenuText(),
      username: req.body.trigger_word
    });
  }

  if (slackInput.indexOf('list') > -1) {
    var allMessageTexts = getMessagesToday().map(message => `@${message.user_name}: ${message.order}`).join('\n');
    if (getMessagesToday().length === 0) {
      allMessageTexts = 'Ingen som er sultne i dag ser det ut til';
    }
    var responseObject = {
      text: `${allMessageTexts}`,
      username: req.body.trigger_word
    };

    return res.json(responseObject);
  }

  if (slackInput.indexOf('slett') > -1) {
    var foundMessages = messages.filter(message => message.user_name === req.body.user_name).length;
    messages = messages.filter(message => message.user_name !== req.body.user_name)
    var allMessageTexts = getMessagesToday().map(message => `@${message.user_name}: ${message.order}`).join('\n');
    if (getMessagesToday().length === 0) {
      allMessageTexts = 'Ingen som er sultne i dag ser det ut til';
    }
    var responseObject = {
      text: `<@${req.body.user_id}> Fant ${foundMessages} bestilling(er) - og fjerna like mange\n${allMessageTexts}`,
      username: req.body.trigger_word
    };

    return res.json(responseObject);
  }

  if (slackInput.indexOf('driver') > -1) {
    var driver = getDriverToday();
    var messageTexts = getMessagesToday();
    if (messageTexts.length){
      var potentialDrivers = messageTexts;
      if (potentialDrivers.length) {
        var newDriver = potentialDrivers[Math.floor(Math.random()*potentialDrivers.length)]
        drivers.push({user_name: newDriver.user_name, user_id: newDriver.user_id, date: new Date()})
      }
    }

    driver = getDriverToday();

    console.log(driver);
    return res.json({
      text: driver.length ? `<@${driver[driver.length - 1].user_id}> er dagens heldige sjåfør! :racing_car: ` : 'Ingen sjåfør',
      username: req.body.trigger_word
    });
  }



  if (!bestillingsRegEx.test(slackInput)) {
    return res.json({
      text: bestillingsText,
      username: req.body.trigger_word
    });
  }

  var regexResult = bestillingsRegEx.exec(slackInput);
  var number = parseInt(regexResult[1], 10) || 0;
  var styrke = regexResult[2];

  if (number < 1 || number > menu.length) {
    return res.json({
      text: bestillingsText,
      username: req.body.trigger_word
    });
  }

  var match = menu.find(menuItem => menuItem.number === number);

  var order = `${match.number}) ${match.text}. Pris: ${match.price}`;

  messages.push(Object.assign({}, req.body, {date: new Date()}, {order: order}));

  var randomMessage = getRandomFeedback();
  var allMessageTexts = getMessagesToday().map(message => `@${message.user_name}: ${message.order}`).join('\n');

  var responseObject = {
    text: `<@${req.body.user_id}> ${randomMessage}\n ${allMessageTexts}`,
    username: req.body.trigger_word
  };

  return res.json(responseObject);
});


// token=TOGcOwYN8qh6OKqic8N34FAz
// team_id=T0001
// team_domain=example
// channel_id=C2147483705
// channel_name=test
// timestamp=1355517523.000005
// user_id=U2147483697
// user_name=Steve
// text=googlebot: What is the air-speed velocity of an unladen swallow?
// trigger_word=googlebot:


module.exports = app;
