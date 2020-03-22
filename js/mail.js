const request = require('request');

var store;

console.colorLog = (msg, color) => { console.log("%c" + msg, "color:" + color + ";font-weight:bold;") }

exports.init = st => { store = st }

exports.new = async function(alias, cb, name='Route', email) {
  if(!email) {
    let settings = require('path').join(__dirname, '../data/settings.json');
    let address = store.get('settings.mail.address');
    if(address && address != '') {
      var options = {
        url: 'https://api.peacock.link/route',
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
      url: 'https://api.peacock.link/route',
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

exports.list = async () => {
  console.colorLog('[MAIL] Started listing.', 'lime');
  return new Promise((resolve, reject) => {
    let ids = store.get('settings.mail.ids');
    let remaining = ids.length;

    let url = 'https://api.peacock.link/list?ids=' + ids.join(',');

    console.colorLog('[MAIL] Sending request: ' + url, 'yellow');
    request({ url: url },
      (e, r, b) => {
        console.colorLog('[MAIL] Received response.', 'lime');
        if (!e && r.statusCode == 200) {
          console.colorLog('[MAIL] Returning Response.', 'lime');
          resolve(JSON.parse(b));
        } else { reject(error) }
      });
  });
}
