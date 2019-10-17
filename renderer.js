// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const jsonfile = require("jsonfile");
const path = require("path");
const url = require('url');
const uuid = require("uuid");
const TabGroup = require("electron-tabs");
const dragula = require("dragula");
const bookmarks = path.join(__dirname, "bookmarks.json");
const blockstack = require("blockstack");
const web = require('./js/web.js');

const session = require("electron").remote.session;
const remote = require("electron").remote;
const { BrowserWindow } = require("electron").remote;
const { ipcRenderer } = require("electron");
const Mercury = require('@postlight/mercury-parser');

const contextMenu = require('electron-context-menu');

const ElectronBlocker = require("@cliqz/adblocker-electron").ElectronBlocker;
const fetch = require("cross-fetch").fetch; // required 'fetch'

//Discord Rich Presence
const { Client } = require("discord-rpc");
const clientId = "627363592408137749";

const rpclient = new Client({
  transport: "ipc"
});
const startDate = new Date();
const startTimestamp = startDate.getTime();

var theme = "light";

async function setActivity() {
  if (!rpclient) {
    return;
  }
  var details = "Peacock Browser";
  var state = "Exploring the internet...";
  rpclient.setActivity({
    details: details,
    state: state,
    startTimestamp,

    largeImageKey: "peacock",
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

var userSession = new blockstack.UserSession();

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

var tabGroup = new TabGroup({
  ready: function(tabGroup) {
    dragula([tabGroup.tabContainer], {
      direction: "horizontal"
    });
  },
  newTab: {
    title: "Google",
    src: "https://google.com",
    visible: true,
    active: true,
    webviewAttributes: {
      useragent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) peacock/2.0.43 Chrome/77.0.3865.90 Electron/3.1.13 Safari/537.36",
      partition: "persist:peacock"
    }
  }
});
let tab = tabGroup.addTab({
  title: "Google",
  src: "https://google.com",
  visible: true,
  active: true,
  webviewAttributes: {
    useragent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) peacock/2.0.43 Chrome/77.0.3865.90 Electron/3.1.13 Safari/537.36",
    partition: "persist:peacock"
  }
});

// Customize button placement: dragula([nav]);

ipcRenderer.on("blockstackSignIn", function(event, token) {
  if (userSession.isUserSignedIn()) {
    alert("We did it boys!");
    tabGroup.getActiveTab().close();
  } else {
    userSession.handlePendingSignIn(token);
    tabGroup.getActiveTab().close();
  }
});

ipcRenderer.on("keyboardShortcut", function(event, shortcut) {
  let id;
  let length;
  switch (shortcut) {
    case "settings":
      let url = path.normalize(`${__dirname}/pages/settings.html`);
      window.location.href = url;
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
      tabGroup.addTab({
        title: "Google",
        src: "https://google.com",
        visible: true,
        active: true,
        webviewAttributes: {
          useragent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) peacock/2.0.43 Chrome/77.0.3865.90 Electron/3.1.13 Safari/537.36",
          partition: "persist:peacock"
        }
      });
      break;
    case "closeTab":
      id = tabGroup.getActiveTab().id;
      tabGroup.getTab(id).close();
      break;
    case "history":
      if (userSession.isUserSignedIn()) {
        userSession.getFile("history.txt").then(data => {
          alert(data);
        });
      } else {
        signIntoBlockstack();
      }
      break;
    case "clearHistory":
      if (userSession.isUserSignedIn()) {
        userSession.putFile("history.txt", "");
      } else {
        signIntoBlockstack();
      }
      break;
    default:
      break;
  }
});

ipcRenderer.on("loadTheme", function(event, args) { loadTheme(); });


// ipcRenderer.on('window-closing', function(event, input) {
// 	uploadHistory();
// });

Mousetrap.bind(["ctrl+shift+a", "command+shift+a"], function() {
  toggleAdblock();
});

omni.focus();

var settings;
function loadTheme() {
  jsonfile.readFile("data/settings.json", function(err, obj) {
    if (err) console.error(err);
    let themeObj = obj.theme.toLowerCase();
    if (themeObj === "light") {
      theme = "light";

			if($('head link[href*="css/themes"]').length > 0){
				$('head link[href*="css/themes"]').remove();
			}
    } else if (themeObj === "default") {
      theme = "light";
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        // If Dark Mode
        theme = "dark";
        $("head").append('<link rel="stylesheet" href="css/themes/dark.css">');
      } else if($('head link[href*="css/themes"]').length > 0){
				$('head link[href*="css/themes"]').remove();
			}
    } else {
      $("head").append(
        '<link rel="stylesheet" href="css/themes/' + themeObj + '.css">'
      );
      theme = "dark";
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

		// and load the html of the app.
		settings.loadURL(url.format({
			pathname: path.join(__dirname, 'pages/settings.html'),
			protocol: 'file:',
			slashes: true
		}));

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
  if (userSession.isUserSignedIn()) {
    userSession.getFile("history.txt").then(data => {
      console.log("|" + data + "|");
      let content;
      if (data != "") {
        content = data + "," + history;
      } else {
        content = "" + history;
      }
      userSession.putFile("history.txt", content).then(() => {
        ipcRenderer.send("close-window", "now");
      });
    });
  } else {
    signIntoBlockstack();
  }
}

function signIntoBlockstack() {
  const transitPrivateKey = userSession.generateAndStoreTransitKey();
  const redirectURI = "http://127.0.0.1:9876/callback";
  const manifestURI = "http://127.0.0.1:9876/manifest.json";
  const scopes = blockstack.DEFAULT_SCOPE;
  const appDomain = "http://127.0.0.1:9876";
  var authRequest = blockstack.makeAuthRequest(
    transitPrivateKey,
    redirectURI,
    manifestURI,
    scopes,
    appDomain
  );
  let url = "http://browser.blockstack.org/auth?authRequest=" + authRequest;
  tabGroup.addTab({
    title: "Blockstack",
    src: url,
    visible: true,
    active: true
  });
}

function changeAdBlock(toWhat) {
  ipcRenderer.send("adblock-change", "adblock:" + toWhat);

  if (theme === "light") {
    shield.src = "images/loading-light.gif";
  } else if (theme === "dark") {
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

function updateURL(event) {
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

function handleUrl(event) {
  if (event.target.className === "link") {
    event.preventDefault();
    tabGroup.getActiveTab().webview.loadURL(event.target.href);
  } else if (event.target.className === "favicon") {
    event.preventDefault();
    tabGroup.getActiveTab().webview.loadURL(event.target.parentElement.href);
  }
}

function finishLoad(event) {
  const webview = document.querySelector("webview");
  webview.style.display = null;
  tabGroup.getActiveTab().setTitle(tabGroup.getActiveTab().webview.getTitle());
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
    if (userSession.isUserSignedIn()) {
      userSession.getFile("history.txt").then(data => {
        let content = data + tabGroup.getActiveTab().webview.src + ",";
        userSession.putFile("history.txt", content);
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

function updateTargetURL(event) {
  if (event.url != "") {
    dialogContainer.style.opacity = 0.9;
    dialog.innerHTML = event.url;
  } else {
    dialogContainer.style.opacity = 0;
  }
}

tabGroup.on("tab-active", (tab, tabGroup) => {
  tab.webview.addEventListener("did-start-loading", web.loadStart(theme, mTab));
  tab.webview.addEventListener("did-stop-loading", web.loadStop(mTab));
  tab.webview.addEventListener("did-finish-load", finishLoad);
  tab.webview.addEventListener("enter-html-full-screen", web.enterFllscrn(document));
  tab.webview.addEventListener("leave-html-full-screen", web.leaveFllscrn(document));
  tab.webview.addEventListener("update-target-url", e => web.updateTargetURL(e, document));
  tab.webview.addEventListener("dom-ready", web.domReady(theme, mTab));
  tab.webview.addEventListener("new-window", web.newWindow(tabGroup));
  tab.webview.addEventListener("page-favicon-updated", web.faviconUpdated(mTab));
  tab.webview.addEventListener("page-title-updated", e => web.titleUpdated(e, mTab));
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
    updateURL(e);
  }
});
$("#url").focus(e => $("#url").select());
$("#fave").click(addBookmark);
$("#list").click(openPopUp);
$("#settings").click(openSettings);
$("#fave-popup").click(handleUrl);
tabGroup.getActiveTab().webview.addEventListener("did-start-loading", web.loadStart(theme, mTab));
tabGroup.getActiveTab().webview.addEventListener("did-stop-loading", web.loadStop(mTab));
tabGroup.getActiveTab().webview.addEventListener("did-finish-load", finishLoad);
tabGroup.getActiveTab().webview.addEventListener("enter-html-full-screen", web.enterFllscrn(document));
tabGroup.getActiveTab().webview.addEventListener("leave-html-full-screen", web.leaveFllscrn(document));
tabGroup.getActiveTab().webview.addEventListener("update-target-url", e => web.updateTargetURL(e, document));
tabGroup.getActiveTab().webview.addEventListener("dom-ready", web.domReady(theme, mTab));
tabGroup.getActiveTab().webview.addEventListener("new-window", web.newWindow(tabGroup));
tabGroup.getActiveTab().webview.addEventListener("page-favicon-updated", web.faviconUpdated(mTab));
tabGroup.getActiveTab().webview.addEventListener("page-title-updated", e => web.titleUpdated(e, mTab));

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

// let proxy = "75.73.50.82:80";
// sess.setProxy({proxyRules:proxy}, function (){
//     console.log('using the proxy ' + proxy);
// });
