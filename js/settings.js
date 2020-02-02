const { join } = require('path');

const themes = join(__dirname, "../css/themes");

const storage = require("../js/store.js");

const { ipcRenderer, remote } = require("electron");

const store = {};

store.get = name => ipcRenderer.sendSync('store', 'get', name);
store.set = (name, val) => ipcRenderer.send('store', 'set', name, val);

storage.init(store);

let settingsInfo = JSON.parse(decodeURIComponent(location.search.split('?')[1]));

window.darkMode = settingsInfo.darkMode; loadTheme();
remote.getCurrentWindow().on('focus', updateProfile);

function saveSettings(input) {
  let data = store.get('settings');
  for (var key in input){ data[key] = input[key]; }

  store.set('settings', data);

  console.log("Updated Settings!");
  updateProfile();
}

let settings = store.get('settings');
for (var SKey in settings){ $('div[data-key=' + SKey + ']').find('.dropdown').find(".dropdown-toggle").text(settings[SKey]); }

let engines = store.get('searchEngines');
$(".search-engines-menu").empty();
engines.forEach(item => {
  $(".search-engines-menu").append(`<a class="dropdown-item" href="#"><img class="search-engine-icon"
    src="${item.icon}"/>${item.name}</a>`);
  $('.dropdown-item').unbind();
  $('.dropdown-item').click(function(event) {
    let text = $(this).text();
    let key = $(this).parent().parent().parent().attr("data-key");
  	$(this).parent().siblings(".dropdown-toggle").text(text);
  	saveSettings({ [key]: text });
    if(key === "theme") { loadTheme(); ipcRenderer.send('loadTheme'); }
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

require('fs').readdir(themes, (err, files) => {
 files.forEach(file => {
   if(file.endsWith(".css")){
     let plain = file.replace(".css", "");
     let spicy = plain[0].toUpperCase() + plain.slice(1);
     $('.theme-dropdown-menu').append(`<a class="dropdown-item" href="#">${spicy}</a>`);

     let elem = $('.theme-dropdown-menu').children().last();
     elem.attr('locale-key', spicy.toLowerCase());
     elem.click(function(event) {
       let text = $(this).text();
       let key = $(this).parent().parent().parent().attr("data-key");
     	$(this).parent().siblings(".dropdown-toggle").text(text);
     	saveSettings({ [key]: text });
       if(key === "theme") { loadTheme(); ipcRenderer.send('loadTheme'); }
     });
   }
  });
});

function loadTheme() {
  let theme = store.get('settings.theme').toLowerCase();
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
}

function signOutOfBlockstack() {
  require('./blockchain.js').getUserSession().signUserOut();
  resetProfile();
  updateProfile();
}

function resetProfile() {
  $("#profile").attr("src", join(__dirname, "../images/blockstack.png"));
  $("#name").text("Blockstack");
  $("#signedIn").text("Signed Out");
  $("#signOut").text("SIGN IN");
  $("#signOut").unbind("click");
  $("#signOut").click(function () { ipcRenderer.send('signIntoBlockstack','');updateProfile(); });
}

function updateProfile() {
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

$('.dropdown-item').click(function(event) {
  let text = $(this).text();
  let key = $(this).parent().parent().parent().attr("data-key");
	$(this).parent().siblings(".dropdown-toggle").text(text);
	saveSettings({ [key]: text });
  if(key === "theme") { loadTheme(); ipcRenderer.send('loadTheme'); }
});

$(document).ready(function () {
  updateProfile();
});
