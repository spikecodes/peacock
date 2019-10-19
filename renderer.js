// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const jsonfile = require("jsonfile");
const path = require("path");
const uuid = require("uuid");
const bookmarks = path.join(__dirname, "bookmarks.json");

const session = require("electron").remote.session;
const remote = require("electron").remote;
const { BrowserWindow } = require("electron").remote;
const { ipcRenderer } = require("electron");

// const Mercury = require('@postlight/mercury-parser');

const contextMenu = require('electron-context-menu');

const tabs = require('./js/tabs.js');
const web = require('./js/web.js');
const vpn = require('./js/vpn.js');
const blockchain = require('./js/blockchain.js');

//Discord Rich Presence
const { Client } = require("discord-rpc");
const clientId = "627363592408137749";

const rpclient = new Client({
  transport: "ipc"
});
const startDate = new Date();
const startTimestamp = startDate.getTime();

window.theme = "light";

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
    largeImageText: `Peacock Browser v2.0.5`,
    instance: false
  });
}

rpclient.on("ready", () => {
  console.log("Loaded Discord RPC");
  setActivity();

  setInterval(() => {
    setActivity();
  }, 15e3);
});

rpclient
  .login({
    clientId
  })
  .catch(console.error);
//Discord Rich Presence

var ById = function(id) {
  return document.getElementById(id);
};
var omni = ById("url"),
  fave = ById("fave"),
  titlebar = ById("titlebar"),
  dialog = ById("dialog"),
  dialogContainer = ById("dialog-container"),
  etabsGroup = ById("etabs-tabgroup"),
  etabsViews = ById("etabs-views"),
  popup = ById("fave-popup"),
  shield = ById("shieldIMG");

var tabGroup = tabs.makeTabGroup();
tabs.newTab("Google", "https://google.com/");

// Customize button placement: dragula([nav]);

ipcRenderer.on("blockstackSignIn", function(event, token) {
  if (blockchain.getUserSession().isUserSignedIn()) {
    alert("We did it boys!");
    tabGroup.getActiveTab().close();
  } else {
    blockchain.getUserSession().handlePendingSignIn(token);
    tabGroup.getActiveTab().close();
  }
});

ipcRenderer.on("keyboardShortcut", function(event, shortcut) {
  let id;
  let length;
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
      id = tabGroup.getActiveTab().id;
      length = tabGroup.getTabs().length;
      if (length === 1) {
        // Do nothing
      } else if (id === length - 1) {
        tabGroup.getTab(0).activate();
      } else {
        tabGroup.getTab(id + 1).activate();
      }

      break;
    case "backTab":
      id = tabGroup.getActiveTab().id;
      length = tabGroup.getTabs().length;
      if (length === 1) {
        // Do nothing
      } else if (id === 0) {
        // If First Tab
        tabGroup.getTab(length - 1).activate(); // Activate Last Tab
      } else {
        // If Not First Tab
        tabGroup.getTab(id - 1).activate(); // Activate Previous Tab
      }
      break;
    case "newTab":
      tabs.newTab("Google", "https://google.com/");
      break;
    case "closeTab":
      id = tabGroup.getActiveTab().id;
      tabGroup.getTab(id).close();
      break;
    case "history":
      if (blockchain.getUserSession().isUserSignedIn()) {
        blockchain.getUserSession().getFile("history.txt").then(data => {
          alert(data);
        });
      } else {
        tabs.newTab("Blockstack", blockchain.signIntoBlockstack());
      }
      break;
    case "clearHistory":
      if (blockchain.getUserSession().isUserSignedIn()) {
        blockchain.getUserSession().putFile("history.txt", "");
      } else {
        tabs.newTab("Blockstack", blockchain.signIntoBlockstack());
      }
      break;
    case "signIntoBlockstack":
      tabs.newTab("Blockstack", blockchain.signIntoBlockstack());
      break;
    case "startVPN":
      vpn.startVPN();
      break;
    case "stopVPN":
      vpn.stopVPN();
      break;
    default:
      break;
  }
});

ipcRenderer.on("loadTheme", function(event, args) { loadTheme(); });

// ipcRenderer.on('window-closing', function(event, input) {
// 	uploadHistory();
// });

omni.focus();

var settings;
function loadTheme() {
  jsonfile.readFile("data/settings.json", function(err, obj) {
    if (err) console.error(err);
    let themeObj = obj.theme.toLowerCase();
    if (window.theme != themeObj) {
      if (themeObj === "light") {
        window.theme = "light";

  			if($('head link[href*="css/themes"]').length > 0){
  				$('head link[href*="css/themes"]').remove();
  			}
      } else if (themeObj === "default") {
        window.theme = "light";
        if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
          // If Dark Mode
          window.theme = "dark";
          $("head").append('<link rel="stylesheet" href="css/themes/dark.css">');
        } else if($('head link[href*="css/themes"]').length > 0){
  				$('head link[href*="css/themes"]').remove();
  			}
      } else {
        $("head").append(
          '<link rel="stylesheet" href="css/themes/' + themeObj + '.css">'
        );
        window.theme = "dark";
      }
    }
  });
}
loadTheme();

function openSettings() {
	// let url = path.normalize(`${__dirname}/pages/settings.html`);
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
	      nodeIntegration: true,
	      contextIsolation: false,
	      experimentalFeatures: true,
	      enableBlinkFeatures: 'OverlayScrollbars',
	      webviewTag: true
			},
			width: 900,
			height: 700,
			icon: path.join(__dirname, 'images/Peacock2.0.ico')
		}); // Create Settings

    // Open Developer Tools:
    // settings.openDevTools();

		// and load the html of the app.
		settings.loadURL(require('url').format({
			pathname: path.join(__dirname, 'pages/settings.html'),
			protocol: 'file:',
			slashes: true
		}));

    settings.on('focus', () => { settings.webContents.send('updateProfile', ''); });
		settings.on('closed', function() { settings = null; });
	}
}

function getSearchEnginePrefix(cb) {
  jsonfile.readFile("data/settings.json", function(err, objecteroonie) {
    if (err) console.error(err);

    let searchEngine = objecteroonie.search_engine;

    jsonfile.readFile("data/search_engines.json", function(err, obj) {
      for (var i = 0; i < obj.length; i++) {
        if (obj[i].name === searchEngine) {
          cb(obj[i].url);
        }
      }
    });
  });
}

function uploadHistory() {
  if (blockchain.getUserSession().isUserSignedIn()) {
    blockchain.getUserSession().getFile("history.txt").then(data => {
      console.log("|" + data + "|");
      let content;
      if (data != "") {
        content = data + "," + history;
      } else {
        content = "" + history;
      }
      blockchain.getUserSession().putFile("history.txt", content).then(() => {
        ipcRenderer.send("close-window", "now");
      });
    });
  } else {
    tabs.newTab("Blockstack", blockchain.signIntoBlockstack());
  }
}

function changeAdBlock(toWhat) {
  ipcRenderer.send("adblock-change", "adblock:" + toWhat);

  if (window.theme === "light") {
    shield.src = "images/loading-light.gif";
  } else if (window.theme === "dark") {
    shield.src = "images/loading-dark.gif";
  } else {
    console.error("Theme not specified.");
  }

  setTimeout(function() {
    tabGroup.getActiveTab().webview.reload();
    if (toWhat === "on") {
      shield.src = "images/Peacock Shield.svg";
    } else if (toWhat === "off") {
      shield.src = "images/Peacock Shield Empty.svg";
    } else {
      alert("Error: Adblocker not working.");
    }
  }, 3000);
}

function toggleAdblock() {
  let src = shield.src
    .replace(/\%20/g, " ")
    .replace("file:///", "")
    .replace(/\//g, "\\")
    .replace(__dirname, "")
    .substr(1);
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

function loadPage(event) {
  if (event.keyCode === 13) {
    omni.blur();
    let val = omni.value.toLowerCase();
    if (val.startsWith("peacock://")) {
      let url = path.normalize(`${__dirname}/pages/${val.substr(10)}.html`);
      window.location.href = url;
    } else if (val.startsWith("https://")) {
      tabGroup.getActiveTab().webview.loadURL(val);
    } else if (val.startsWith("http://")) {
      tabGroup.getActiveTab().webview.loadURL(val);
    } else {
      if (val.includes(".") && !val.includes(" ")) {
        tabGroup.getActiveTab().webview.loadURL("https://" + val);
      } else if (val.includes("://") && !val.includes(" ")) {
        tabGroup.getActiveTab().webview.loadURL(val);
      } else {
        getSearchEnginePrefix(function(prefix) {
          console.log(prefix + val);
          //tabGroup.getActiveTab().webview.loadURL('https://' + val);
          tabGroup.getActiveTab().webview.loadURL(prefix + val);
        });
      }
    }
  }
}

var Bookmark = function(id, url, faviconUrl, title) {
  this.id = id;
  this.url = url;
  this.icon = faviconUrl;
  this.title = title;
};

Bookmark.prototype.ELEMENT = function() {
  var a_tag = document.createElement("a");
  a_tag.href = this.url;
  a_tag.className = "link";
  a_tag.textContent = this.title;
  var favimage = document.createElement("img");
  favimage.src = this.icon;
  favimage.className = "favicon";
  a_tag.insertBefore(favimage, a_tag.childNodes[0]);
  return a_tag;
};

function addBookmark() {
  let url = tabGroup.getActiveTab().webview.src;
  let title = tabGroup.getActiveTab().webview.getTitle();
  let fav = `https://www.google.com/s2/favicons?domain=${url}`;
  let book = new Bookmark(uuid.v1(), url, fav, title);
  jsonfile.readFile(bookmarks, function(err, curr) {
    curr.push(book);
    jsonfile.writeFile(bookmarks, curr, function(err) {});
  });
}

function openPopUp(event) {
  let state = popup.getAttribute("data-state");
  if (state === "closed") {
    popup.innerHTML = "";
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
          let bookmark = new Bookmark(id, url, icon, title);
          let el = bookmark.ELEMENT();
          popup.appendChild(el);
        }
      }
      popup.style.display = "block";
      popup.style.opacity = "1";
      popup.setAttribute("data-state", "open");
    });
  } else {
    popup.style.opacity = "0";
    popup.style.display = "none";
    popup.setAttribute("data-state", "closed");
  }
}

function finishLoad(event) {
  const webview = document.querySelector("webview");
  webview.style.display = null;
  try {
    tabGroup.getActiveTab().setTitle(tabGroup.getActiveTab().webview.getTitle());
  } catch (e) {

  }
  let currentURL = tabGroup
    .getActiveTab()
    .webview.src.substr(8)
    .replace(/\//g, "\\");

  if (currentURL.startsWith(path.normalize(`${__dirname}\\pages\\`))) {
    let protocolVal = currentURL
      .replace(path.normalize(`${__dirname}\\pages\\`), "")
      .split(".")[0];
    omni.value = "peacock://" + protocolVal;
  } else {
    if (blockchain.getUserSession().isUserSignedIn()) {
      blockchain.getUserSession().getFile("history.txt").then(data => {
        var split = data.split(',');
        if(split[split.length - 2] === tabGroup.getActiveTab().webview.src){
          console.warn("History item already exists!");
        } else {
          let content = data + tabGroup.getActiveTab().webview.src + ",";
          blockchain.getUserSession().putFile("history.txt", content);
        }
      });
    }

    omni.value = tabGroup.getActiveTab().webview.src;

    let url = tabGroup.getActiveTab().webview.src;
    tabGroup
      .getActiveTab()
      .setIcon(`https://www.google.com/s2/favicons?domain=${url}`);
  }

  contextMenu({
  	window: tabGroup.getActiveTab().webview,
  	showCopyImageAddress: true
  });
}

tabGroup.on("tab-active", (tab, tabGroup) => {
  tab.webview.addEventListener("did-start-loading", web.loadStart(mTab));
  tab.webview.addEventListener("did-stop-loading", web.loadStop(mTab));
  tab.webview.addEventListener("did-finish-load", finishLoad());
  tab.webview.addEventListener("enter-html-full-screen", web.enterFllscrn(document));
  tab.webview.addEventListener("leave-html-full-screen", web.leaveFllscrn(document));
  tab.webview.addEventListener("update-target-url", e => web.updateTargetURL(e, document));
  tab.webview.addEventListener("dom-ready", web.domReady());
  tab.webview.addEventListener("new-window", e => web.newWindow(e, true));
  tab.webview.addEventListener("page-favicon-updated", e => web.faviconUpdated(e));
  tab.webview.addEventListener("page-title-updated", e => web.titleUpdated(e));
  let url = tab.webview.src;
	$("#url").val(url);
	try {
		tab.setTitle(tabGroup.getActiveTab().webview.getTitle());
	} catch (e) {}
});

const webview = document.querySelector("webview");
const mTab = tabGroup.getActiveTab();
$("#shield").click(toggleAdblock);
$("#refresh").click(e => web.reload(mTab));
$("#back").click(e => web.goBack(mTab));
$("#forward").click(e => web.goForward(mTab));
$("#omnibox").on("keypress", function(e) {
  if (e.which == 13) {
    webview.style.display = "none";
    loadPage(e);
  }
});
$("#url").focus(e => $("#url").select());
$("#fave").click(addBookmark);
$("#list").click(openPopUp);
$("#settings").click(openSettings);
$("#fave-popup").click(web.handleUrl);

tabGroup.getActiveTab().webview.addEventListener("did-start-loading", web.loadStart(mTab));
tabGroup.getActiveTab().webview.addEventListener("did-stop-loading", web.loadStop(mTab));
tabGroup.getActiveTab().webview.addEventListener("did-finish-load", finishLoad);
tabGroup.getActiveTab().webview.addEventListener("enter-html-full-screen", web.enterFllscrn(document));
tabGroup.getActiveTab().webview.addEventListener("leave-html-full-screen", web.leaveFllscrn(document));
tabGroup.getActiveTab().webview.addEventListener("update-target-url", e => web.updateTargetURL(e, document));
tabGroup.getActiveTab().webview.addEventListener("dom-ready", web.domReady());
tabGroup.getActiveTab().webview.addEventListener("new-window", e => web.newWindow(e, true));
tabGroup.getActiveTab().webview.addEventListener("page-favicon-updated", web.faviconUpdated);
tabGroup.getActiveTab().webview.addEventListener("page-title-updated", web.titleUpdated);

const sess = session.fromPartition("persist:peacock");
const filter = {
  urls: ["http://*/*", "https://*/*"]
};
sess.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
  details.requestHeaders["DNT"] = "1";
  callback({
    cancel: false,
    requestHeaders: details.requestHeaders
  });
});
// Mercury.parse("https://en.wikipedia.org/wiki/Madagascar", { contentType: 'html' }).then(function (result) {
// 	console.log(result);
// });
