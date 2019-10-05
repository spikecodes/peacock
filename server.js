var express = require('express');
var app = express();
var cors = require('cors');

var server = app.listen(9876);
app.use(cors());

app.get('/manifest.json', function (req, res) {
  res.sendFile(__dirname + '/manifest.json');
});

app.get("/callback", function (req, res) {
  process.send({ authResponse: req.query.authResponse });
});

process.on('message', message => {
  server.close();
});