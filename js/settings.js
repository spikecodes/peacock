const jsonfile = require('jsonfile');

const path = require("path");
const uuid = require("uuid");

const bookmarks = path.join(__dirname, "../bookmarks.json");
const settingsFile = path.join(__dirname, "../settings.json");

const blockchain = require('./blockchain.js');

const { ipcRenderer } = require("electron");

ipcRenderer.on("updateProfile", function(event, args) { updateProfile(); });

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
  jsonfile.readFile(settingsFile, function (err, data_raw) {
    if (err) console.error(err);
    let data = data_raw;
    for (var key in input){
      data[key] = input[key];
    }
    jsonfile.writeFile(settingsFile, data, function(err) {
  		if (err) { console.error(err) }
      else { console.log("Updated Settings!") }
  	});
  });
}

jsonfile.readFile(settingsFile, function (err, obj) {
  if (err) console.error(err);
  for (var key in obj){
    $('div[data-key=' + key + ']').find('.dropdown').find(".dropdown-toggle").text(obj[key]);
  }
});

$(document).on('click', '.dropdown-item', function(event) {
  let text = $(this).text();
  let key = $(this).parent().parent().parent().attr("data-key");
	$(this).parent().siblings(".dropdown-toggle").text(text);
	saveSettings({ [key]: text });
  if(key === "theme") { setTimeout(function () { loadTheme(); }, 1000); }
});

function loadTheme() {
	jsonfile.readFile(settingsFile, function (err, obj) {
	  if (err) console.error(err);
		let theme = obj.theme.toLowerCase();
	  if (theme === "default" || theme === "light"){
      if($('head link[href*="css/themes"]').length > 0){
  				$('head link[href*="css/themes"]').remove();
      }
		} else {
			$('head').append('<link rel="stylesheet" href="../css/themes/' + theme + '.css">');
		}
	});
}

loadTheme();

function signOutOfBlockstack() {
  blockchain.getUserSession().signUserOut();
  resetProfile();
  $(".list-group").empty();
  $(".list-group").append('<a href="#" class="list-group-item list-group-item-action">error</a>');
  $(".list-group-item").first().text("Sign in with Blockstack via the Profile tab to access history.");
}

function resetProfile() {
  $("#profile").attr("src", "../images/blank.png");
  $("#name").text("Blockstack");
  $("#signedIn").text("Signed Out");
  $("#signOut").text("SIGN IN");
  $("#signOut").unbind("click");
  $("#signOut").click(function () { ipcRenderer.send('signIntoBlockstack',''); });
}

function loadHistory() {
  $(".group-history").empty();
  blockchain.getUserSession().getFile("history.txt").then(data => {
    var split = data.split(',');
    for (var i = 0; i < split.length; i++) {
      if(split[i] != null && split[i] != undefined && split[i] != ""){
        let item = $(".group-history").append('<a href="#" class="list-group-item list-group-item-action item-history">' + split[i]
          + '</a>');
      }
    }
    $(".item-history").click(function (e) {
      e.preventDefault();
      ipcRenderer.send('openPage',$(this).text());
    });
  });
}

function loadBookmarks() {
  $(".group-bookmarks").empty();
  jsonfile.readFile(bookmarks, function(err, obj) {
    if (obj.length !== 0) {
      for (var i = 0; i < obj.length; i++) {
        let url = obj[i].url;
        let icon;
        if (obj[i].icon != "blank favicon") {
          icon = obj[i].icon;
        } else {
          icon = "images/blank.png";
        }
        let id = obj[i].id;
        let title = obj[i].title;

        let item = $(".group-bookmarks").append('<a href="#" class="list-group-item list-group-item-action item-bookmarks">' + url + '</a>');
      }

      $(".item-bookmarks").click(function (e) {
        e.preventDefault();
        ipcRenderer.send('openPage',$(this).text());
      });
    }
  });
}

function updateProfile() {
  if(blockchain.getUserSession().isUserSignedIn()){
    loadHistory();
    loadBookmarks();

    let profile = blockchain.getUserSession().loadUserData().profile;
    let username = profile.name;
    let profilePic = profile.image[0].contentUrl;
    $("#profile").attr("src",profilePic);
    $("#name").text(username);
    $("#signedIn").text("Signed In");
    $("#signOut").text("SIGN OUT");
    $("#signOut").unbind("click");
    $("#signOut").click(signOutOfBlockstack);
  } else {
    resetProfile();
    $(".list-group a").unbind("click");
    $(".list-group-item").first().text("Sign in with Blockstack via the Profile tab to access history.");
  }
}

$(document).ready(function () {
  updateProfile();
})
