const request = require('request');
const jsonfile = require('jsonfile');

exports.new = async function(alias, cb, name='Route', email) {
  if(!email) {
    let settings = require('path').join(__dirname, '../data/settings.json');
    jsonfile.readFile(settings, async function(err, obj) {
      if(obj.mail.address && obj.mail.address != '') {
        email = obj.mail.address;

        var options = {
          url: 'https://peacock-mail.now.sh/route',
          headers: {
            'alias': alias,
            'email': email,
            'description': name
          }
        };

        function callback(error, response, body) {
          if (!error && response.statusCode == 200) {
            let data = JSON.parse(body);

            if(data.route) {
              jsonfile.readFile(settings, async function(err, obj) {
                obj.mail.ids.push(data.route.id);
                jsonfile.writeFile(settings, obj, async function (err) {});
              });
            }

            cb(data);
          }
        }

        request(options, callback);
      } else {
        cb({ message: 'error: email not specified, set yours at peacock://mail'});
      }
    });
  } else {
    var options = {
      url: 'https://peacock-mail.now.sh/route',
      headers: {
        'alias': alias,
        'email': email,
        'description': name
      }
    };

    function callback(error, response, body) {
      if (!error && response.statusCode == 200) {
        let data = JSON.parse(body);

        if(data.route) {
          jsonfile.readFile(settings, async function(err, obj) {
            obj.mail.ids.push(data.route.id);
            jsonfile.writeFile(settings, obj, async function (err) {});
          });
        }

        cb(data);
      }
    }

    request(options, callback);
  }
}

exports.list = async function(id, cb) {
  if(!id || id == '') return;

  var options = {
    url: 'https://peacock-mail.now.sh/list',
    headers: {
      'id': id
    }
  };

  function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
      let data = JSON.parse(body);

      if(data.route) {
        jsonfile.readFile(settings, async function(err, obj) {
          obj.mail.ids.push(data.route.id);
          jsonfile.writeFile(settings, obj, async function (err) {});
        });
      }

      cb(data);
    }
  }

  request(options, callback);
}
