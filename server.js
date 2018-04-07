var express = require('express');
var app = express();

app.use('/babb', require('./babb/babb'))
app.use('/sushi', require('./sushi/sushi'))

var port = process.env.PORT || 5000;

var server = app.listen(port, function () {
	console.log('Example app listening on port' + port +'!');
});
