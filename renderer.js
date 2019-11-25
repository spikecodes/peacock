// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const jsonfile = require("jsonfile");

require('v8-compile-cache');

const { ipcRenderer, remote, webFrame } = require("electron");
const { BrowserWindow } = remote;

const { join, normalize } = require("path");

const bookmarks = join(__dirname, "data/bookmarks.json");
const settingsFile = join(__dirname, "data/settings.json");
const search_engines = join(__dirname, "data/search_engines.json");
const blocked = join(__dirname, 'data/blocked.json');

const tabs = require('./js/tabs.js');
const web = require('./js/web.js');

const blockchain = require('./js/blockchain.js');
const store = require('./js/store.js');

const { version } = require('./package.json');

//Discord Rich Presence
try {
  const { Client } = require("discord-rpc");
  const clientId = "627363592408137749";

  const rpclient = new Client({
    transport: "ipc"
  });
  const startDate = new Date();
  const startTimestamp = startDate.getTime();

  async function setActivity() {
    if (!rpclient) {
      return;
    }
    var details = "https://peacock.link/";
    var state = "Browsing the web...";
    rpclient.setActivity({
      details: details,
      state: state,
      startTimestamp,

      largeImageKey: "peacockbg_light",
      largeImageText: `Peacock Browser v` + version,
      instance: false
    });
  }

  rpclient.on("ready", () => {
    setActivity();

    setInterval(() => {
      setActivity();
    }, 15e3);
  });

  rpclient
    .login({clientId})
    .catch(console.log("Discord not open."));
} catch (e) {
  console.log("Discord not open.");
}
//Discord Rich Presence

window.theme = "light";
window.darkMode = false;

var omni = $("#url"),
  fave = $("#fave"),
  titlebar = $("#titlebar"),
  dialogo = $("#dialog"),
  dialogContainer = $("#dialog-container"),
  etabsGroup = $("#etabs-tabgroup"),
  etabsViews = $("#etabs-views"),
  shield = $("#shieldIMG");

var tabGroup = tabs.makeTabGroup("DuckDuckGo", "https://duckduckgo.com/");
tabs.newTab("DuckDuckGo", "https://duckduckgo.com/");

require("dragula")([$('nav')]);

ipcRenderer.on("nativeTheme", async function(event, arg) {
  window.darkMode = arg;
});

/*const {openNewGitHubIssue, debugInfo} = require('electron-util');
require('electron-unhandled')({
  showDialog: true,
	reportButton: error => {
		openNewGitHubIssue({
			user: 'Codiscite',
			repo: 'peacock',
			body: `\`\`\`\n${error.stack}\n\`\`\`\n\n---\n\n${debugInfo()}`
		});
	}
});*/

ipcRenderer.on("ad-blocked", async function (event, ad) {
  /*jsonfile.readFile(blocked, async function(err, obj) {
    if(err) {console.error(err); return;}

    var adRequest = { type: ad.type, url: ad.url, sourceHostname: ad.sourceHostname };

    console.log(adRequest);

    let result = obj;
    result.push(adRequest);
    jsonfile.writeFile(blocked, result, async function (err) {});
  });*/
});

ipcRenderer.on("blockstackSignIn", async function(event, token) {
  if (blockchain.getUserSession().isUserSignedIn()) {
    tabGroup.getActiveTab().close();
  } else {
    blockchain.getUserSession().handlePendingSignIn(token);
    tabGroup.getActiveTab().close();
  }
});

let nav;
let viewHeight = $('.etabs-views').height();
ipcRenderer.on("keyboardShortcut", async function(event, shortcut) {
  let { startVPN, stopVPN } = require('./js/vpn.js');
  switch (shortcut) {
    case "settings":
      openSettings();
      break;
    case "devTools":
      if (tabGroup.getActiveTab().webview.isDevToolsOpened()) {
        tabGroup.getActiveTab().webview.closeDevTools();
      } else {
        tabGroup.getActiveTab().webview.openDevTools();
      }
      break;
    case "nextTab":
      if (tabGroup.getTabs().length === 1) {
        // Do nothing
      } else if (tabGroup.getActiveTab().id === tabGroup.getTabs().length - 1) {
        tabGroup.getTab(0).activate();
      } else {
        tabGroup.getTab(tabGroup.getActiveTab().id + 1).activate();
      }

      break;
    case "backTab":
      if (tabGroup.getTabs().length === 1) {
        // Do nothing
      } else if (tabGroup.getActiveTab().id === 0) {
        // If First Tab
        tabGroup.getTab(tabGroup.getTabs().length - 1).activate(); // Activate Last Tab
      } else {
        // If Not First Tab
        tabGroup.getTab(tabGroup.getActiveTab().id - 1).activate(); // Activate Previous Tab
      }
      break;
    case "newTab":
      tabs.newTab("DuckDuckGo", "https://duckduckgo.com/");
      break;
    case "closeTab":
      // id = tabGroup.getActiveTab().id;
      // tabGroup.getTab(id).close();
      tabs.closeTab(tabGroup.getActiveTab());
      break;
    case "signIntoBlockstack":
      tabs.newTab("Blockstack", blockchain.signIntoBlockstack());
      break;
    case "history":
      store.getHistory().then(console.log);
      break;
    case "clearHistory":
      store.clearHistory();
      break;
    case "startVPN":
      startVPN();
      break;
    case "stopVPN":
      stopVPN();
      break;
    case "zoomIn":
      tabGroup.getActiveTab().webview.setZoomFactor(tabGroup.getActiveTab().webview.getZoomFactor() + 0.1);
      break;
    case "zoomOut":
      tabGroup.getActiveTab().webview.setZoomFactor(tabGroup.getActiveTab().webview.getZoomFactor() - 0.1);
      break;
    case "resetZoom":
      webFrame.setZoomFactor(1.0);
      tabGroup.getActiveTab().webview.setZoomFactor(1.0);
      break;
    case "focusSearchbar":
      omni.focus();
      omni.select();
      break;
    case "refreshPage":
      tabGroup.getActiveTab().webview.reload();
      break;
    case "getMetrics":
      console.log(remote.app.getAppMetrics());
      break;
    case "toggleCustomization":
      if(!nav){ nav = require("dragula")([document.getElementById('navigation')], {}); }
      else { nav.destroy(); nav = undefined; }
      break;
    case "findInPage":
      findInPage();
      break;
    default:
      break;
  }
});

ipcRenderer.on("loadTheme", async function(event, args) { loadTheme(); });

ipcRenderer.on("loadPage", async function(event, args) { tabGroup.getActiveTab().webview.loadURL(args); });

ipcRenderer.on("openPage", async function(event, args) { tabs.newTab("Loading...", args); });

var settings;
async function loadTheme() {
  console.time("Theme load time");
  jsonfile.readFile(settingsFile, async function(err, obj) {
    if (err) console.error(err);
    let themeObj = obj.theme.toLowerCase();
    if (window.theme != themeObj) {
      if (themeObj === "light") {
        window.theme = "light";

  			if($('head link[href*="css/themes"]').length > 0){
  				$('head link[href*="css/themes"]').remove();
  			}
      } else if (themeObj === "default") {
        if (window.darkMode) {
          // If Dark Mode
          window.theme = "dark";
          $('link[href="css/themes/dark.css"]').remove();
          $("head").append('<link rel="stylesheet" href="css/themes/dark.css">');
        } else {
          // If Light Mode
          window.theme = "light";
          if($('head link[href*="css/themes"]').length > 0){
    				$('head link[href*="css/themes"]').remove();
    			}
        }
      } else {
        window.theme = "dark";
        $('link[href="css/themes/' + themeObj + '.css"]').remove();
        $("head").append('<link rel="stylesheet" href="css/themes/' + themeObj + '.css">');
      }
      console.timeEnd("Theme load time");
    }
  });
}
loadTheme();

async function findInPage() {
  if(parseInt( $('.etabs-views').css('height') ) === viewHeight - 35){

    // If find dialog open:
    $('#find blur').focus();
    $('#find').css('display', 'none');
    $('.etabs-views').animate({
      'height' : viewHeight
    }, 25, function() { });

  } else {

    // If find dialog not open:
    $('.etabs-views').animate({
      'height' : viewHeight - 35
    }, 25, function() {
      $('#find').css('display', 'inline-block');
      $('#find input').focus();

      let val;

      $("#find input").on("keypress", async (e) => {
        val = $("#find input").val();
        if (e.which == 13) {
          if(val.length > 0){
            tabGroup.getActiveTab().webview.findInPage(val, {
              findNext: true,
              matchCase: $('#match-case').hasClass('down')
            });
          }
        }
      });

      $("#find input").on('input', function () {
        val = $("#find input").val();
        console.log($('#match-case').hasClass('down'));
        if(val.length > 0) {
          tabGroup.getActiveTab().webview.findInPage(val, {
            findNext: false,
            matchCase: $('#match-case').hasClass('down')
          });
        } else {
          try { tabGroup.getActiveTab().webview.stopFindInPage(); } catch (e) { }
        }
      });
    });
  }
}

async function openSettings() {
	// let url = normalize(`${__dirname}/pages/settings.html`);
  // window.location.href = url;

	if(settings != undefined && settings != null){ // If Settings Already Exists
		settings.focus(); // Focus on it
	} else { // If Settings Doesn't Already Exist
		settings = new BrowserWindow({
			frame: false,
			minWidth: 700,
	    minHeight: 550,
			titleBarStyle: 'hiddenInset',
			backgroundColor: '#FFF',
			webPreferences: {
				nodeIntegration: true,
				plugins: true,
	      contextIsolation: false,
	      enableBlinkFeatures: 'OverlayScrollbars',
	      webviewTag: false
			},
			width: 900,
			height: 700,
			icon: join(__dirname, 'images/peacock.ico')
		}); // Create Settings

    // Open Developer Tools:
    settings.openDevTools();

		// and load the html of the app.
    let { format } = require('url');
		settings.loadURL(format({
			pathname: join(__dirname, 'pages/settings.html'),
			protocol: 'file:',
			slashes: true
		}));

    settings.on('focus', () => { settings.webContents.send('updateProfile', ''); });
		settings.on('closed', async function() { settings = null; });

    setTimeout(async function () {
      settings.webContents.send('nativeTheme', window.darkMode);
    }, 500);
	}
}

async function getSearchEnginePrefix(cb) {
  jsonfile.readFile(settingsFile, async function(err, objecteroonie) {
    if (err) console.error(err);

    let searchEngine = objecteroonie.search_engine;

    jsonfile.readFile(search_engines, async function(err, obj) {
      for (var i = 0; i < obj.length; i++) {
        if (obj[i].name === searchEngine) {
          cb(obj[i].url);
        }
      }
    });
  });
}

async function changeAdBlock(toWhat) {
  ipcRenderer.send("adblock-change", "adblock:" + toWhat);

  if (window.theme === "dark") {
    shield.attr('src', "images/loading-dark.gif");
  } else {
    shield.attr('src', "images/loading-light.gif");
  }

  setTimeout(async function() {
    tabGroup.getActiveTab().webview.reload();
    if (toWhat === "on") {
      shield.attr('src', "images/Peacock Shield.svg");
    } else if (toWhat === "off") {
      shield.attr('src', "images/Peacock Shield Empty.svg");
    } else {
      console.error("Adblocker not working.");
      console.error("Adblocker not working.");
    }
  }, 3000);
}

async function toggleAdblock() {
  let src = shield.attr('src').replace(/\%20/g, " ").replace("file:///", "").replace(/\//g, "\\").replace(__dirname, "");
  if (
    src === "images/Peacock Shield.svg" ||
    src === "images\\Peacock Shield.svg"
  ) {
    //If On
    changeAdBlock("off");
  } else if (
    src === "images/Peacock Shield Empty.svg" ||
    src === "images\\Peacock Shield Empty.svg"
  ) {
    //If Off
    changeAdBlock("on");
  } else {
    console.log(src + " | " + __dirname);
  }
}

async function loadPage(val) {
  omni.blur();
  omni.val(val);

  if (val.startsWith("peacock://")) {
    let url = normalize(`${__dirname}/pages/${val.substr(10)}.html`);
    window.location.href = url;
  } else if (val.startsWith("https://")) {
    $('#search').attr('src', 'images/lock.svg');
    tabGroup.getActiveTab().webview.loadURL(val);
  } else if (val.startsWith("http://")) {
    $('#search').attr('src', 'images/unlock.svg');
    tabGroup.getActiveTab().webview.loadURL(val);
  } else {
    if (val.includes(".") && !val.includes(" ")) {
      tabGroup.getActiveTab().webview.loadURL("https://" + val);
    } else if (val.includes("://") || val.startsWith("data:") || val.startsWith("localhost:") && !val.includes(" ")) {
      tabGroup.getActiveTab().webview.loadURL(val);
    } else {
      getSearchEnginePrefix(async function(prefix) {
        tabGroup.getActiveTab().webview.loadURL(prefix + val);
      });
    }
  }
}

async function finishLoad(event, tab) {
  const webview = document.querySelector("webview");
  webview.style.display = null;
  try {
    tab.setTitle(tab.webview.getTitle());
  } catch (e) {}
  let currentURL = tab.webview.src.substr(8).replace(/\//g, "\\");

  if (currentURL.startsWith(normalize(`${__dirname}\\pages\\`))) {
    let protocolVal = currentURL
      .replace(normalize(`${__dirname}\\pages\\`), "")
      .split(".")[0];
    omni.val("peacock://" + protocolVal);
  } else {
    store.logHistory(tab.webview.src, tabGroup.getActiveTab().webview.getTitle());

    omni.val(tab.webview.src);

    let src = new URL(tab.webview.src);
    let fav = `https://www.google.com/s2/favicons?domain=${src.origin}`;
    tab.setIcon(fav);
  }

  if(tab.initialized === undefined || tab.initialized === false) {
    omni.focus();
    omni.select();
    tab.initialized = true;
  }
}

async function initWebView(tab) {
  if(!tab) tab = tabGroup.getActiveTab();

  tab.webview.addEventListener("did-start-loading", async (e) => { web.loadStart(tab) });
  tab.webview.addEventListener("did-stop-loading", async (e) => { web.loadStop(tab) });
  tab.webview.addEventListener("did-finish-load", async (e) => { finishLoad(e, tab) });
  tab.webview.addEventListener("enter-html-full-screen", async (e) => { web.enterFllscrn(document) });
  tab.webview.addEventListener("leave-html-full-screen", async (e) => { web.leaveFllscrn(document) });
  tab.webview.addEventListener("update-target-url", async (e) => { web.updateTargetURL(e, document) });
  tab.webview.addEventListener("dom-ready", async (e) => { web.domReady(tab.webview) });
  tab.webview.addEventListener("new-window", async (e) => { web.newWindow(e, true, tabs) });
  tab.webview.addEventListener("page-favicon-updated", async (e) => { web.faviconUpdated(tab) });
  tab.webview.addEventListener("page-title-updated", async (e) => { web.titleUpdated(e, tab) });
  tab.webview.addEventListener("did-change-theme-color", async (e) => { web.changeThemeColor(e, document) });
  tab.webview.addEventListener('found-in-page', async (e) => {
    $('#matches').text(e.result.activeMatchOrdinal.toString() + ' of ' + e.result.matches.toString() + ' matches');
  });
}

tabGroup.on("tab-added", async (tab, tabGroup) => {
  tab.activate();
  initWebView(tab);
  /*$('.etabs-tab-button-close').click((e) => { console.log('clicked!') });*/
});

tabGroup.on("tab-removed", async (tab, tabContainer) => {
  if(tabGroup.getTabs().length === 0) { remote.app.quit(); }
});

tabGroup.on("tab-active", async (tab, tabGroup) => {
  try {
    $("#url").val(tab.webview.src);
    tab.setTitle(tab.webview.getTitle());
  } catch (e) {
    setTimeout(async function () {
      $("#url").val(tab.webview.src);
      tab.setTitle(tab.webview.getTitle());
    }, 500);
  }

  tab.on("webview-ready", (tab) => {
  	$("#url").val(tab.webview.src);
    tab.setTitle(tab.webview.getTitle());
  });
});

$("#shield").click(toggleAdblock);
$("#refresh").click(async (e) => { tabGroup.getActiveTab().webview.reload() });
$("#back").click(async (e) => { tabGroup.getActiveTab().webview.goBack() });
$("#forward").click(async (e) => { tabGroup.getActiveTab().webview.goForward() });

require('autocompleter')({
  input: document.getElementById('url'),
  render: function(item, currentValue) {
    var div = document.createElement("div");
    div.textContent = item.phrase;

    let text = new RegExp('(' + currentValue + ')', 'ig');
    $(div).html($(div).text().replace(text, '<b>$1</b>'));

    document.getElementById("url").style.borderRadius = "4px 4px 0px 0px";
    $(div).hover(async function() {
        $(".selected").removeClass("selected");
        $(this).addClass("selected");
      }, async function() {
        $(this).removeClass("selected");
        $(".autocomplete > div").first().addClass("selected");
      });
    return div;
  },
  fetch: function(text, update) {
    var options = {
      url: `https://ac.duckduckgo.com/ac/?t=peacock&q=${text.toLowerCase()}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Peacock/2.0.591 Chrome/78.0.3905.1 Electron/8.0.0 Safari/537.36'
      }
    };

    require('request').get(options, function (error, response, body) {
      if(error) { console.error(error); update( [{"phrase": [text]}] ); return; }
      if(body.startsWith("<")) { update( [{"phrase": [text]}] ); return; }

      let results = JSON.parse(body);
      results.unshift({"phrase": [text]});
      update(results);
      if(results.length > 0){ // If there are results for the query:
        $("#url").css('border-radius','4px 4px 0px 0px');
        $("#url").css('margin', '-10.5px 10px 0px 10px');
        $("#url").css('height', '30px');
      } else {
        $("#url").css('border-radius','4px');
        $("#url").css('margin', '-5.5px 10px 0px 10px');
        $("#url").css('height', '20px');
      }
    });
  },
  onSelect: function(item, input) {
    if($(".autocomplete > div").first().hasClass("selected")){
      loadPage(omni.val());
    } else {
      loadPage(item.phrase);
    }
  }
});

$("#omnibox").on("keypress", async (e) => {
  if (e.which == 13) {
    loadPage(omni.val());
    $("#url").css('border-radius','4px');
    $("#url").css('margin', '-5.5px 10px 0px 10px');
    $("#url").css('height', '20px');
    $(".autocomplete").remove();
  }
});

$("#url").blur(async (e) => {
  $("#url").css('border-radius','4px');
  $("#url").css('margin', '-5.5px 10px 0px 10px');
  $("#url").css('height', '20px');
  $(".autocomplete").remove();
});
$("#fave").click(async (e) => {
  let url = tabGroup.getActiveTab().webview.src;
  let title = tabGroup.getActiveTab().webview.getTitle();
  $("#fave > img").attr('src', 'images/star_filled.svg');
  store.addBookmark(url, title);
});
$("#settings").click(openSettings);

$('#find a').click(function() {  $(this).toggleClass("down");  });
$('#close-find').click(function() {  findInPage();  });

initWebView();

var options = {
  url: 'https://api.github.com/repos/Codiscite/peacock/releases',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Peacock/2.0.591 Chrome/78.0.3905.1 Electron/8.0.0 Safari/537.36'
  }
};
require('request').get(options, async function (error, response, body) {
  if (error) console.error(error);

  let newestVersion = JSON.parse(body)[0].tag_name.split('.').join("").replace("v", "").substr(0, 3);
  let currentVersion = version.split('.').join("").replace("v", "").substr(0, 3);
  console.log(Number(newestVersion) + " new left, current right " + Number(currentVersion));
  if (Number(newestVersion) > Number(currentVersion)) {
    const { dialog } = remote;

    const optionso = {
      type: 'question',
      buttons: ['Cancel', 'Update', 'No, thanks'],
      defaultId: 2,
      title: 'Peacock',
      message: "Update available!",
      detail: JSON.parse(body)[0].tag_name + " > " + version,
      checkboxLabel: 'Do Not Show Again',
      checkboxChecked: false,
    };

    dialog.showMessageBox(null, optionso).then(data => {
      if(data.response === 1){
        tabs.newTab("Peacock Download", "https://github.com/Codiscite/peacock/releases/latest");
      }
      console.log(data.checkboxChecked);
    });
  } else {
    console.log(`Using newest version! v${version}`);
  }
}, "jsonp");
