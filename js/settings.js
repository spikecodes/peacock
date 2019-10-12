const jsonfile = require('jsonfile');
const path = require('path');

//Discord Rich Presence
const { Client } = require('discord-rpc');
const clientId = '627363592408137749';

const rpclient = new Client({ transport: 'ipc'});
const startDate = new Date();
const startTimestamp = startDate.getTime()

async function setActivity() {
  if (!rpclient) {
    return;
  }
	var details = 'Peacock Browser';
	var state = 'Changing Settings';
  rpclient.setActivity({
    details: details,
    state: state,
    startTimestamp,

    largeImageKey: 'settings',
    largeImageText: `Peacock Browser v2.0.5`,
    instance: false
  })
};

rpclient.on('ready', () => {
  console.log('Loaded Discord RPC');
  setActivity();

  setInterval(() => {
    setActivity();
  }, 15e3);
});

rpclient.login({ clientId }).catch(console.error);
//Discord Rich Presence

function saveSettings(input) {
  jsonfile.readFile("data/settings.json", function (err, data_raw) {
    if (err) console.error(err);
    let data = data_raw;
    for (var key in input){
      data[key] = input[key];
    }
    jsonfile.writeFile("data/settings.json", data, function(err) {
  		if (err) { console.error(err) }
      else { console.log("Updated Settings!") }
  	});
  });
}

saveSettings({ "search_engine": "Yahoo" });

jsonfile.readFile("data/settings.json", function (err, obj) {
  if (err) console.error(err);
  for (var key in obj){
    $('div[data-key=' + key + ']').find('.dropdown').find(".dropdown-toggle").text(obj[key]);
  }
});

$(document).on('click', '#back-arrow', function(event) {
  // window.history.back();
  let url = path.normalize(`${__dirname}/../index.html`);
  window.location.href = url;
});

$(document).on('click', '.dropdown-item', function(event) {
  let text = $(this).text();
  let key = $(this).parent().parent().parent().attr("data-key");
	$(this).parent().siblings(".dropdown-toggle").text(text);
	saveSettings({ [key]: text })
});

function loadTheme() {
	jsonfile.readFile("data/settings.json", function (err, obj) {
	  if (err) console.error(err);
		let theme = obj.theme.toLowerCase();
	  if(theme === "default" || theme === "light"){
			// Do Nothing
		} else {
			$('head').append('<link rel="stylesheet" href="../css/themes/' + theme + '.css">');
		}
	});
}

loadTheme();
