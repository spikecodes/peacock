let tor;

exports.startVPN_Old = function () {
  require('request').get('http://spys.me/proxy.txt', function (error, response, body) {
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
        let sess = require("electron").remote.session.fromPartition("persist:peacock");
        sess.setProxy({proxyRules:proxy}, function (){
            console.log('Using the proxy ' + proxy + '.');
        });
    }, "jsonp");
  });
}

exports.stopVPN = function () {
  // if(tor == null){
  //   console.log("Tor not running!");
  // } else {
  //   let sess = require("electron").remote.session.fromPartition("persist:peacock");
  //   sess.setProxy({proxyRules:null}, function () {});
  //   tor.kill();
  //   console.log("Tor stopped running.");
  // }
}

exports.startVPN = function (tor_dir) {
  // if(tor == null){
  //   var exec = require('child_process').execFile;
  //
  //   tor = exec(tor_dir, function(err, data) {});
  //
  //   setTimeout(function () {
  //     let sess = require("electron").remote.session.fromPartition("persist:peacock");
  //     sess.setProxy({proxyRules:"socks5://127.0.0.1:9050"}, () => { });
  //     console.log("Tor started running!");
  //   }, 500);
  // } else {
  //   console.log("Tor already exists!");
  // }
}
