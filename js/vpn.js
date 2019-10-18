const request = require('request');
const session = require("electron").remote.session;

exports.startVPN = function () {
  request.get('http://spys.me/proxy.txt', function (error, response, body) {
    var lines = body.split("\n");
    var ips = lines.slice(9, lines.length - 2);

    $.get("https://ipinfo.io", function(response) {
        var validIPs = [];
        for (var i = 0; i < ips.length; i++) {
          if(ips[i].includes(response.country + "-A-S +") ||
            ips[i].includes(response.country + "-H-S +")){
              validIPs.push(ips[i].split(" ")[0]);
          }
        }
        let proxy = validIPs[Math.floor(Math.random()*validIPs.length)];
        let sess = session.fromPartition("persist:peacock");
        sess.setProxy({proxyRules:proxy}, function (){
            console.log('Using the proxy ' + proxy + '.');
        });
    }, "jsonp");
  });
}

exports.stopVPN = function () {
  let sess = session.fromPartition("persist:peacock");
  sess.setProxy({proxyRules:null}, function () {
    console.log('Disabled proxy.');
  })
}
