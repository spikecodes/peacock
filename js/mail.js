const request = require('request');

var store;

exports.init = st => { store = st }

exports.new = async function(alias, cb, name='Route', email) {
  if(!email) {
    let settings = require('path').join(__dirname, '../data/settings.json');
    let address = store.get('settings.mail.address');
    if(address && address != '') {
      var options = {
        url: 'https://peacock-mail.now.sh/route',
        headers: {
          'alias': alias,
          'email': address,
          'description': name
        }
      };

      function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
          let data = JSON.parse(body);

          if(data.route) {
            let ids = store.get('settings.mail.ids');
            ids.push(data.route.id);
            store.set('settings.mail.ids', ids);
          }

          cb(data);
        }
      }

      request(options, callback);
    } else {
      cb({ message: 'error: email not specified, set yours at peacock://mail'});
    }
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
          let ids = store.get('settings.mail.ids');
          ids.push(data.route.id);
          store.set('settings.mail.ids', ids);
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
        let ids = store.get('settings.mail.ids');
        ids.push(data.route.id);
        store.set('settings.mail.ids', ids);
      }

      cb(data);
    }
  }

  request(options, callback);
}
