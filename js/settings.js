const jsonfile = require('jsonfile');

const bookmarks = require("path").join(__dirname, "../data/bookmarks.json");
const settingsFile = require("path").join(__dirname, "../data/settings.json");
const searchEngines = require("path").join(__dirname, "../data/search_engines.json");
const themes = require("path").join(__dirname, "../css/themes");

const store = require("../js/store.js");

const { ipcRenderer, remote } = require("electron");

let settingsInfo = JSON.parse(decodeURIComponent(window.location.href.split('?')[1]));

window.darkMode = settingsInfo.darkMode; loadTheme();
remote.getCurrentWindow().on('focus', updateProfile);

window.theme = 'light';

//Discord Rich Presence
try {
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

      largeImageKey: 'peacockbg_light',
      largeImageText: `Peacock Browser v2.0.5`,
      smallImageKey: 'gear',
      smallImageText: `Settings`,
      instance: false
    })
  };

  rpclient.on('ready', () => {
    setActivity();

    setInterval(() => {
      setActivity();
    }, 15e3);
  });

  rpclient.login({ clientId }).catch(console.error);
} catch (e) {
  console.log("Discord not open.");
}
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
      else { updateProfile(); console.log("Updated Settings!"); }
  	});
  });
}

jsonfile.readFile(settingsFile, function (err, obj) {
  if (err) console.error(err);
  for (var key in obj){
    $('div[data-key=' + key + ']').find('.dropdown').find(".dropdown-toggle").text(obj[key]);
  }
});

jsonfile.readFile(searchEngines, function(err, obj) {
  $(".search-engines-menu").empty();
  obj.forEach(item => {
    $(".search-engines-menu").append(`<a class="dropdown-item" href="#"><img class="search-engine-icon"
      src="${item.icon}"/>${item.name}</a>`);
    $('.dropdown-item').unbind();
    $('.dropdown-item').click(function(event) {
      let text = $(this).text();
      let key = $(this).parent().parent().parent().attr("data-key");
    	$(this).parent().siblings(".dropdown-toggle").text(text);
    	saveSettings({ [key]: text });
      if(key === "theme") { setTimeout(function () { loadTheme(); }, 1000); }
    });
   });
});

// Add slideDown animation to Bootstrap dropdown when expanding.
$('.dropdown').on('show.bs.dropdown', function() {
  $(this).find('.dropdown-menu').first().stop(true, true).slideDown(100);
});

// Add slideUp animation to Bootstrap dropdown when collapsing.
$('.dropdown').on('hide.bs.dropdown', function() {
  $(this).find('.dropdown-menu').first().stop(true, true).slideUp(100);
});

// Add slideDown animation to Bootstrap dropdown when expanding.
$('.dropup').on('show.bs.dropdown', function() {
  $(this).find('.dropdown-menu').first().stop(true, true).slideUp(100);
});

// Add slideUp animation to Bootstrap dropdown when collapsing.
$('.dropup').on('hide.bs.dropdown', function() {
  $(this).find('.dropdown-menu').first().stop(true, true).slideDown(100);
});

$('.dropdown-item').click(function(event) {
  let text = $(this).text();
  let key = $(this).parent().parent().parent().attr("data-key");
	$(this).parent().siblings(".dropdown-toggle").text(text);
	saveSettings({ [key]: text });
  if(key === "theme") { setTimeout(function () { loadTheme(); }, 1000); }
});

$('.clearHistory').click(function () {
  store.clearHistory().then(loadHistory);
});

require('fs').readdir(themes, (err, files) => {
 files.forEach(file => {
   if(file.endsWith(".css")){
     let plain = file.replace(".css", "");
     let spicy = plain[0].toUpperCase() + plain.slice(1);
     $('.theme-dropdown-menu').append(`<a class="dropdown-item" href="#">${spicy}</a>`);
   }
  });
});

function loadTheme() {
	jsonfile.readFile(settingsFile, function (err, obj) {
    if (err) { alert(err); return; }
    let theme = obj.theme.toLowerCase();
    let newTheme = theme;

    if(window.darkMode && theme == 'default') newTheme = 'dark';

    if (window.theme != newTheme) {
      if (theme === "light") {
        window.theme = 'light';
  			if($('head link[href*="../css/themes"]').length > 0){
  				$('head link[href*="../css/themes"]').remove();
  			}
      } else if (theme === "default") {
        if (window.darkMode) {
          // If Dark Mode
          window.theme = 'dark';
          $("head").append('<link rel="stylesheet" href="../css/themes/dark.css">');
        } else {
          // If Light Mode
          window.theme = 'light';
          if($('head link[href*="../css/themes"]').length > 0){
    				$('head link[href*="../css/themes"]').remove();
    			}
        }
      } else {
        window.theme = 'dark';
        $("head").append('<link rel="stylesheet" href="../css/themes/' + theme + '.css">');
      }
    }
    document.body.style.display = 'block';
	});
}

function signOutOfBlockstack() {
  require('./blockchain.js').getUserSession().signUserOut();
  resetProfile();
  updateProfile();
}

function resetProfile() {
  $("#profile").attr("src", require("path").join(__dirname, "../images/blockstack.png"));
  $("#name").text("Blockstack");
  $("#signedIn").text("Signed Out");
  $("#signOut").text("SIGN IN");
  $("#signOut").unbind("click");
  $("#signOut").click(function () { ipcRenderer.send('signIntoBlockstack','');updateProfile(); });
}

function loadHistory() {
  $(".group-history").empty(); // Clear any previous history logs before loading current ones.
  store.getHistory().then(items => {
    if (!items) {
      $(".group-history a").unbind("click");
      $(".group-history").empty();
      $(".group-history").append(`<a href="#" class="list-group-item list-group-item-action item-history default-item">
        Sign in with Blockstack via the Profile tab to access history.</a>`);
      return;
    }

    if(typeof items === "string") { items = JSON.parse(items); }

    if(items.length > 0) {
      for (var i = 0; i < items.length; i++) { // For each item in history log:
        let item = '<a href="#" data-url="' + items[i].url + '" class="list-group-item list-group-item-action item-history default-item">'
          + '<img class="history-icon" src="https://www.google.com/s2/favicons?domain=' + items[i].url + '"><span class="history-title">' + items[i].title +
          '</span><br><span class="history-url">' + items[i].url + '</span></a>';
         $(".group-history").append(item); // Display the item in the bookmarks list.
      }

      $(".item-history").click(function (e) { // When a history item is clicked:
        e.preventDefault(); // Don't refresh the page which is what would normally happen.
        ipcRenderer.send('openPage', $(this).attr("data-url")); // Open the URL of the history item in new tab.
      });
    } else { // If there are no history logs:
      $(".group-history").append(`<a href="#" class="list-group-item list-group-item-action item-history default-item">
        📃 No history logged. Visit a page to get started.</a>`); // Display a "no history" message.
    }
  });
}

function loadBookmarks() {
  $(".group-bookmarks").empty(); // Clear any previous bookmarks before loading current ones.
  store.getBookmarks().then(obj => { // Grab the bookmarks from "bookmarks.json":
    if (!obj) {
      $(".group-bookmarks a").unbind("click");
      $(".group-bookmarks").empty();
      $(".group-bookmarks").append(`<a href="#" class="list-group-item list-group-item-action item-bookmarks">
        Sign in with Blockstack via the Profile tab to access bookmarks.</a>`);
      return;
    }

    if(typeof obj === "string") { obj = JSON.parse(obj); }

    if (obj.length !== 0) { // If there are any bookmarks:
      for (var i = 0; i < obj.length; i++) { // For each stored bookmark:
        // Values: obj[i].icon, obj[i].id, obj[i].url, obj[i].title

        let icon;
        if(obj[i].icon === "blank favicon"){
          icon = require("path").join(__dirname, "../images/se");
        } else { icon = obj[i].icon ;}

        let book = '<a href="#" data-url="' + obj[i].url + '" class="list-group-item list-group-item-action item-bookmarks">'
          + '<img class="bookmark-icon" src="' + icon + '"><span class="bookmark-title">' + obj[i].title +
          '</span><br><span class="bookmark-url">' + obj[i].url + '</span></a>';
        let item = $(".group-bookmarks").append(book); // Display the bookmark in the bookmarks list.
      }

      $(".item-bookmarks").click(function (e) { // When a bookmark is clicked:
        e.preventDefault(); // Don't refresh the page which is what would normally happen.
        ipcRenderer.send('openPage',$(this).attr("data-url")); // Open the URL of the bookmark in new tab.
      });

      $(".item-bookmarks").hover(function () {
        $(this).append('<button class="delete-bookmark">✖</button>');
        $(this).children().last().click(function (e) {
          e.preventDefault();// Don't refresh the page which is what would normally happen.
          event.stopPropagation();
          store.removeBookmark($(this).parent().attr("data-url")).then(e => updateProfile());
        })
      }, function () {
        $(this).children().last().remove();
      });
    } else { // If there are no bookmarks:
      $(".group-bookmarks").append(`<a href="#" class="list-group-item list-group-item-action item-bookmarks default-item">
        🔖 No bookmarks stored. Bookmark a page to get started.</a>`); // Display a "no bookmarks" message.
    }
  });
}

function updateProfile() {
  loadHistory();
  loadBookmarks();
  if(require('./blockchain.js').getUserSession().isUserSignedIn()){
    let profile = require('./blockchain.js').getUserSession().loadUserData().profile;
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
  }
}

$(document).ready(function () {
  updateProfile();
});
