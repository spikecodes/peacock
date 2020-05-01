// PACKAGES

const { remote, ipcRenderer } = require("electron");
const {
  BrowserWindow,
  nativeTheme,
  ipcMain,
  app,
  Menu
} = remote;
require("electron").ipcMain = ipcMain;

require('v8-compile-cache');

const { join } = require("path");

const { ElectronBlocker } = require("@cliqz/adblocker-electron");

const tabs = require("./js/tabs.js");
const storage = require("./js/store.js");

const shortcuts = require("./js/shortcuts.js");

const web = require("./js/web.js");

window.search = require("./js/search.js");

function searchBounds () {
  let winBounds = remote.getCurrentWindow().getBounds();
  let bounds = {};

  bounds.x = Math.ceil($('#nav-center').offset().left);
  bounds.y = Math.ceil($('#nav-center').offset().top + $('#nav-center').height()) + 5;
  bounds.width = Math.floor($('#nav-center').width());
  bounds.height = 240;

  if(winBounds.x >= 0) bounds.x += winBounds.x;
  if(winBounds.y >= 0) bounds.y += winBounds.y;

  return bounds;
};

search.initialize(searchBounds());

// STORAGE

const Store = require("electron-store");
const store = new Store();

window.store = store;
window.storage = storage;

if (!store.get("settings")) {
  let data = {
    search_engine: "DuckDuckGo",
    theme: "Default",
    save_location: "Downloads",
    storage: "Locally",
    newTab: { backgroundTheme: "https://source.unsplash.com/featured/1280x720/?peacock", items: ["", "", "", "", ""] },
    rich_presence: "Enabled"
  };
  store.set("settings", data);
}

store.set("searchEngines", [
  { name: "Google", url: "https://google.com/search?q=" },
  { name: "DuckDuckGo", url: "https://duckduckgo.com/?t=peacock&q=" },
  { name: "Bing", url: "https://www.bing.com/search?q=" },
  { name: "Yahoo", url: "https://search.yahoo.com/search?p=" }
]);

if (!store.get("blocked")) store.set("blocked", 0);
if (!store.get("bookmarks")) store.set("bookmarks", []);
if (!store.get("history")) store.set("history", []);
if (!store.get("permissions")) store.set("permissions", {});
if (!store.get("flags")) store.set("flags", [
  // '--disable-reading-from-canvas'
  '--enable-smooth-scrolling',
  '--dns-prefetch-disable',
  '--no-pings',
  '--no-referrers',
  '--no-crash-upload',
  '--no-default-browser-check',
  '--disable-breakpad',
  '--disable-plugins',
  '--do-not-track'
]);

web.init(document);
storage.init(store);
shortcuts.init(keyboardShortcut, n => { if (tabs.get(n-1)) tabs.activate(tabs.get(n-1)) });

console.colorLog = (msg, color) => { console.log("%c" + msg, "color:" + color + ";font-weight:bold;") }

const { version } = require("./package.json");

// DISCORD RICH PRESENCE
if (store.get("settings.rich_presence") == "Enabled") {
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

      largeImageKey: "tom",
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

  rpclient.login({ clientId }).catch(console.error);
}

exports.getTabCount = function() {
  return tabs.length();
};
exports.showAlert = showAlert;

window.theme = "light";

var alertWin, certDialog;

window.darkMode = nativeTheme.shouldUseDarkColors || false;

ipcMain.on("alert", async (e, data) =>
  showAlert(data, r => {
    e.returnValue = r;
  })
);

ipcMain.on("flags.js", async function(e, action, data) {
  let flags = store.get("flags");

  if (action == "set") {
    store.set("flags", data);
  } else {
    e.returnValue = flags;
  }
});

ipcMain.on("getBookmarks", async e => { e.returnValue = (await storage.getBookmarks()) });
ipcMain.on("removeBookmark", async (e, id) => {
  storage.removeBookmark(id);
  console.log("b", id);
});

ipcMain.on("getHistory", async e => { e.returnValue = (await storage.getHistory()) });
ipcMain.on("clearHistory", async () => storage.clearHistory());
ipcMain.on("removeHistoryItem", async (e, id) => storage.removeHistoryItem(id));

ipcMain.on("newTab", async function(e, action, extra) {
  if (action == "focusSearchbar") {
    $('#url').val("");
    $('#url').focus();
    $('#url').select();
  } else if (action == "saveItem") {
    let items = store.get("settings.newTab.items");
    items[extra.id] = extra.domain;
    store.set("settings.newTab.items", items);
  } else if (action == "loadItems") {
    e.returnValue = store.get("settings.newTab.items");
  } else if (action == "getBackgroundTheme") {
    e.returnValue = store.get("settings.newTab.backgroundTheme");
  } else if (action == "setBackgroundTheme") {
    store.set("settings.newTab.backgroundTheme", extra);
  }
});

ipcMain.on("store", async (e, purpose, name, value) => {
  if (purpose == "set") {
    store.set(name, value);
  } else {
    e.returnValue = store.get(name);
  }
});

ipcMain.on("siteInfo", async (e, action) => {
  switch (action) {
    case "Certificate":
      let host = new URL(tabs.current().webContents.getURL()).host;

      let https = require("https");
      let options = {
        host: host,
        port: 443,
        method: "GET"
      };

      let req = https.request(options, res => {
        let cert = res.connection.getPeerCertificate();
        showCertificateDialog(cert);
      });

      req.on("error", () => {
        showAlert({
          type: "alert",
          message: "Site doesn't have an SSL Certificate.",
          url: "Peacock"
        });
      });

      req.end();
      break;
    case "Cookies":
      cookies()
        .then(cookies => {
          console.log(cookies);
        })
        .catch(console.error);
      break;
    case "Site Settings":
      break;
    default:
  }
});

ipcMain.on("shield-toggle", async (e, val) => changeAdBlock(val));

ipcMain.on(
  "getBlockCount",
  async e => (e.returnValue = tabs.current().webContents.session.ads_blocked)
);

ipcMain.on(
  "getVersions",
  async e => (e.returnValue = { ...process.versions, peacock: version })
);

ipcMain.on("getThemes", async e =>
  require("fs").readdir(join(__dirname, "css/themes"), (err, files) => {
    let result = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].endsWith(".css")) {
        let theme = files[i].replace(".css", "");
        result.push(theme[0].toUpperCase() + theme.slice(1));
      }
    }
    e.returnValue = result;
  })
);

ipcMain.on("getTheme", async e => (e.returnValue = window.theme));
ipcMain.on("getDarkmode", async e => (e.returnValue = window.darkMode));

let nav;
let viewHeight = $(".etabs-views").height();
async function keyboardShortcut(shortcut) {
  let { startVPN, stopVPN } = require("./js/vpn.js");
  switch (shortcut) {
    case "browserDevTools":
      remote.getCurrentWindow().openDevTools({ mode: "detach" });
      break;
    case "devTools":
      tabs.current().webContents.openDevTools({ mode: "right" });
      break;
    case "nextTab":
      tabs.nextTab();
      break;
    case "backTab":
      tabs.backTab();
      break;
    case "newTab":
      tabs.newView();
      break;
    case "closeTab":
      tabs.close();
      break;
    case "openClosedTab":
      tabs.openClosedTab();
      break;
    case "startVPN":
      startVPN(join(__dirname, "tor-win32-0.4.1.6/Tor/tor.exe"));
      break;
    case "stopVPN":
      stopVPN();
      break;
    case "zoomIn":
      tabs.current().webContents.zoomFactor += 0.1;
      break;
    case "zoomOut":
      tabs.current().webContents.zoomFactor -= 0.1;
      break;
    case "resetZoom":
      tabs.current().webContents.zoomFactor = 1;
      break;
    case "focusSearchbar":
      $('#url').focus();
      $('#url').select();
      break;
    case "backPage":
      tabs.current().webContents.goBack();

      if (tabs.current().webContents.canGoBack()) { $("#back").removeAttr("disabled") } else { $("#back").attr("disabled", true) }
      if (tabs.current().webContents.canGoForward()){$("#forward").removeAttr("disabled")}else{$("#forward").attr("disabled", true)}
      break;
    case "forwardPage":
      tabs.current().webContents.goForward();

      if (tabs.current().webContents.canGoBack()) { $("#back").removeAttr("disabled") } else { $("#back").attr("disabled", true) }
      if (tabs.current().webContents.canGoForward()){$("#forward").removeAttr("disabled")}else{$("#forward").attr("disabled", true)}
      break;
    case "savePage":
      tabs.savePage(tabs.current().webContents);
      break;
    case "refreshPage":
      tabs.current().webContents.reload();
      break;
    case "forceReload":
      tabs.current().webContents.reloadIgnoringCache();
      break;
    case "restart":
      app.relaunch();
      app.exit(0);
      break;
    case "toggleCustomization":
      if (!nav) {
        nav = require("dragula")([$("#navigation")], {});
      } else {
        nav.destroy();
        nav = undefined;
      }
      break;
    case "findInPage":
      findInPage();
      break;
    case "scrollToTop":
      tabs
        .current()
        .webContents.executeJavaScript(
          `window.scrollTo({ top: 0, behavior: 'smooth' })`
        );
    default:
      break;
  }
}

ipcMain.on("loadPage", async (e, a) => loadPage(a));

ipcMain.on("openPage", async (e, a) => tabs.newView(a));

ipcMain.on("loadTheme", async () => loadTheme());

ipcMain.on("viewAdded", async () => {
  enableAdBlocking();
  tabs
    .current()
    .webContents.session.setPermissionRequestHandler(handlePermission);
});

// ADBLOCK

var { fetch } = require("cross-fetch");

async function enableAdBlocking(session) {
  session = session || tabs.current().webContents.session;

  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then(blocker => {
    blocker.enableBlockingInSession(session);
    blocker.on("request-blocked", async () => {
      store.set("blocked", store.get("blocked") + 1);

      if (!session.ads_blocked) session.ads_blocked = 0;
      session.ads_blocked++;
    });
  });
}

async function disableAdBlocking(session) {
  session = session || tabs.current().webContents.session;

  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then(blocker => {
    blocker.disableBlockingInSession(session);
  });
}

async function changeAdBlock(enabled) {
  let session = tabs.current().webContents.session;

  if (enabled) {
    enableAdBlocking(session);
  } else {
    disableAdBlocking(session);
  }

  let tone = window.theme === "dark" ? "dark" : "light";
  $("#shieldIMG").attr("src", "images/loading-" + tone + ".gif");

  setTimeout(async function() {
    tabs.current().webContents.reload();
    let suffix = window.theme === "dark" ? " White" : "";
    suffix += enabled ? "" : " Empty";

    $("#shieldIMG").attr("src", "images/Peacock Shield" + suffix + ".svg");
  }, 3000);
}

async function toggleAdblock() {
  let adblock = new BrowserWindow({
    frame: false,
    resizable: false,
    skipTaskbar: true,
    x: $("#shield")[0].offsetLeft - 190,
    y: 80,
    width: 220,
    height: 60,
    webPreferences: {
      nodeIntegration: true,
      zoomFactor: 0.5
    },
    transparent: true,
    parent: remote.getCurrentWindow(),
    alwaysOnTop: true,
    icon: join(__dirname, "images/peacock.png")
  });

  let address = require("url").format({
    pathname: join(__dirname, "static/pages/dialogs/shield.html"),
    protocol: "file:",
    slashes: true
  });

  adblock.focus();

  adblock.webContents.once("dom-ready", async () => {
    let enabled = !$("#shieldIMG")
      .attr("src")
      .endsWith("Empty.svg");
    adblock.webContents.send(
      "count",
      tabs.current().webContents.session.ads_blocked,
      enabled
    );
  });

  adblock.on("blur", async () => {
    adblock.close();
  });

  adblock.loadURL(address);
}

// THEMES

async function loadTheme() {
  let themeObj = store.get("settings.theme").toLowerCase();
  let newTheme = themeObj;

  if (window.darkMode && themeObj == "default") newTheme = "dark";

  let src = $("#shieldIMG").attr("src");

  if (window.theme != newTheme) {
    if (themeObj === "light") {
      window.theme = "light";

      if (src == "images/Peacock Shield White.svg") {
        $("#shieldIMG").attr("src", "images/Peacock Shield.svg");
      } else if (src == "images/Peacock Shield White Empty.svg") {
        $("#shieldIMG").attr("src", "images/Peacock Shield Empty.svg");
      }

      if ($('head link[href*="css/themes"]').length > 0) {
        $('head link[href*="css/themes"]').remove();
      }
    } else if (themeObj === "default") {
      if (window.darkMode) {
        // If Dark Mode
        window.theme = "dark";
        $('link[href="css/themes/dark.css"]').remove();
        $("head").append('<link rel="stylesheet" href="css/themes/dark.css">');

        if (src == "images/Peacock Shield.svg") {
          $("#shieldIMG").attr("src", "images/Peacock Shield White.svg");
        } else if (src == "images/Peacock Shield Empty.svg") {
          $("#shieldIMG").attr("src", "images/Peacock Shield White Empty.svg");
        }
      } else {
        // If Light Mode
        window.theme = "light";

        if (src == "images/Peacock Shield White.svg") {
          $("#shieldIMG").attr("src", "images/Peacock Shield.svg");
        } else if (src == "images/Peacock Shield White Empty.svg") {
          $("#shieldIMG").attr("src", "images/Peacock Shield Empty.svg");
        }

        if ($('head link[href*="css/themes"]').length > 0) {
          $('head link[href*="css/themes"]').remove();
        }
      }
    } else {
      window.theme = "dark";
      $('link[href="css/themes/' + themeObj + '.css"]').remove();
      $("head").append(
        '<link rel="stylesheet" href="css/themes/' + themeObj + '.css">'
      );

      if ($("#shieldIMG").attr("src") == "images/Peacock Shield.svg") {
        $("#shieldIMG").attr("src", "images/Peacock Shield White.svg");
      } else {
        $("#shieldIMG").attr("src", "images/Peacock Shield White Empty.svg");
      }
    }
  }
}
loadTheme();

async function findInPage() {
  if (parseInt($(".etabs-views").css("height")) === viewHeight - 35) {
    // If find dialog open:
    $("#find blur").focus();
    $("#find").css("display", "none");
    $(".etabs-views").animate(
      {
        height: viewHeight
      },
      25,
      function() {}
    );
  } else {
    // If find dialog not open:
    $(".etabs-views").animate(
      {
        height: viewHeight - 35
      },
      25,
      function() {
        $("#find").css("display", "inline-block");
        $("#find input").focus();

        let val;

        $("#find input").on("keypress", async e => {
          val = $("#find input").val();

          if (e.which == 13 && e.shiftKey) {
            if (val.length > 0) {
              tabs.current().webContents.findInPage(val, {
                findNext: true,
                forward: false,
                matchCase: $("#match-case").hasClass("down")
              });
            }
          } else if (e.which == 13) {
            if (val.length > 0) {
              tabs.current().webContents.findInPage(val, {
                findNext: true,
                matchCase: $("#match-case").hasClass("down")
              });
            }
          }
        });

        $("#find input").on("input", function() {
          val = $("#find input").val();
          if (val.length > 0) {
            tabs.current().webContents.findInPage(val, {
              findNext: false,
              matchCase: $("#match-case").hasClass("down")
            });
          } else {
            try {
              tabs.current().webContents.stopFindInPage("clearSelection");
            } catch (e) {}
            $("#matches").text("");
          }
        });
      }
    );
  }
}

// ALERTS

async function initAlert() {

  var screenSize = { width: window.outerWidth, height: window.outerHeight };

  let args = {
    frame: false,
    resizable: false,
    skipTaskbar: true,
    x: screenSize.width / 2 - 450 / 2,
    y: 50,
    width: 450,
    height: 130,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    },
    parent: remote.getCurrentWindow(),
    icon: join(__dirname, "images/peacock.png")
  };

  alertWin = new BrowserWindow(args);

  alertWin.webContents.session.protocol.registerFileProtocol('assets', (req, cb) => {
    var url = req.url.replace(new URL(req.url).protocol, '');

    if(url.includes('..')) {
      cb(join(__dirname, 'css/favicon.png'));
    } else {
      cb(join(__dirname, 'css/', url));
    }
  }, () => {});

  let address = require("url").format({
    pathname: join(__dirname, "static/pages/dialogs/alert.html"),
    protocol: "file:",
    slashes: true
  });

  alertWin.loadURL(address);

  alertWin.on("page-title-updated", async () => {
    alertWin.show();
  });
}

async function showAlert(data, callback) {
  let params = { ...data, bg: window.theme };

  alertWin.webContents.send("load", params);
  alertWin.show();

  switch (data.type) {
    case "prompt":
      alertWin.setBounds({ height: 200 });
      ipcMain.once("alert-reply", (e, r) => {
        callback(r);
        alertWin.setBounds({ height: 130 });
      });
      break;
    case "confirm":
      ipcMain.once("alert-reply", (e, r) => {
        callback(r);
      });
      break;
    default:
      break;
  }

  alertWin.focus();
  alerted = false;
}

// SEARCHING

async function getSearchEngine(cb) {
  let searchEngine = store.get("settings.search_engine");
  let engines = store.get("searchEngines");

  for (var i = 0; i < engines.length; i++) {
    if (engines[i].name == searchEngine) {
      cb(engines[i]);
    }
  }
}

async function loadPage(val) {
  $('#url').blur();

  try {
    new URL(val);
    tabs.current().webContents.loadURL(val);
  } catch (e) {
    if (val.includes(".") && !val.includes(" ")) {
      $('#url').val(val);
      tabs.current().webContents.loadURL("https://" + val);
    } else if (
      val.includes("://") ||
      val.startsWith("data:") ||
      (val.startsWith("localhost:") && !val.includes(" "))
    ) {
      $('#url').val(val);
      tabs.current().webContents.loadURL(val);
    } else {
      getSearchEngine(async function(engine) {
        $('#url').val(engine.url + val);
        tabs.current().webContents.loadURL(engine.url + val);
      });
    }
  }
}

// SNACKBAR

async function showSnackbar(
  text = "",
  items = [],
  buttons = [],
  callback = console.log
) {
  let snackbar = new BrowserWindow({
    frame: false,
    transparent: true,
    width: 320,
    height: 130,
    x: 228,
    y: 81,
    parent: remote.getCurrentWindow(),
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });

  snackbar.webContents.once("dom-ready", async () => {
    snackbar.webContents.send("permission-request", text, items, buttons);

    ipcMain.once("permission-reply", (event, reply) => {
      snackbar.close();
      callback(reply);

      remote.getCurrentWindow().focus();
      remote.getCurrentWindow().focus();
    });
  });

  snackbar.loadURL(
    require("url").format({
      pathname: join(__dirname, "static/pages/dialogs/snackbar.html"),
      protocol: "file:",
      slashes: true
    })
  );
}


async function loadFlags() {
  let flags = store.get("flags");
  for (let i = 0; i < flags.length; i++) {
    console.log(`Added flag: ${flags[i]}`);
    app.commandLine.appendSwitch(flags[i]);
  }
}

// SITE INFO

let siteInfo;
async function toggleSiteInfo() {
  if (!siteInfo) {
    console.log(remote.getCurrentWindow().getBounds().x + $("#site-info").offset().left,
      remote.getCurrentWindow().getBounds().y + $("#site-info").offset().top + ($("#site-info").height() * 3));

    siteInfo = new BrowserWindow({
      frame: false,
      transparent: true,
      width: 320,
      height: 330,
      x: remote.getCurrentWindow().getBounds().x + $("#site-info").offset().left,
      y: remote.getCurrentWindow().getBounds().y + $("#site-info").offset().top + ($("#site-info").height() * 3),
      parent: remote.getCurrentWindow(),
      webPreferences: {
        nodeIntegration: true,
        enableRemoteModule: true
      }
    });

    siteInfo.loadURL(
      require("url").format({
        pathname: join(__dirname, "static/pages/dialogs/info.html"),
        protocol: "file:",
        slashes: true
      })
    );

    siteInfo.on("blur", () => {
      if(siteInfo) siteInfo.close();
      siteInfo = null;
      remote.getCurrentWindow().focus();
      remote.getCurrentWindow().focus();
    });

    siteInfo.on("close", () => {
      siteInfo = null;
      remote.getCurrentWindow().focus();
      remote.getCurrentWindow().focus();
    });

    let url = new URL(tabs.current().webContents.getURL());

    let perms = store.get("permissions")[url.hostname];

    siteInfo.webContents.once("dom-ready", async () => {
      cookies()
        .then(c => {
          siteInfo.webContents.send("cookies", c.length);
        })
        .catch(console.error);

      if (!perms) return;

      Object.keys(perms).forEach((item) => {
        let allowed = perms[item] ? "Allow" : "Block";

        siteInfo.webContents.send(
          "perm",
          `
          <li id='info-perm'>
            <img src='//:0' id='perm-icon'>
            <p id='perm-text'>${item}</p>
            <button id='perm-allow'>${allowed}</button>
          </li>
        `
        );
      });
    });
  }
}

async function savePermission(site, permission, allowed) {
  let perms = store.get("permissions");
  if (!perms[site]) {
    perms[site] = {};
  }
  perms[site][permission] = allowed;

  store.set("permissions", perms);
}

async function cookies(contents, site) {
  contents = contents || tabs.current().webContents;
  site = site || contents.getURL();
  return contents.session.cookies.get({ url: site });
}

async function handlePermission(webContents, permission, callback, details) {
  if (details.mediaTypes) {
  }
  if (permission == "geolocation") permission = "location";
  if (permission == "midiSysex") permission = "midi";

  let allowedPerms = ["fullscreen", "pointerLock"];
  if (!allowedPerms.includes(permission)) {
    let url = new URL(webContents.getURL()).hostname;

    let perms = store.get("permissions");

    let checked;
    try {
      checked = perms[url][permission];
    } catch (e) {
      checked = undefined;
    }

    if (checked == undefined || checked == null) {
      showSnackbar(
        `${url} wants to`,
        [permission],
        ["Allow", "Block"],
        function(response) {
          if (response === "Allow") {
            callback(true);
            savePermission(url, permission, true);
          } else {
            callback(false);
            savePermission(url, permission, false);
          }
        }
      );
    } else {
      callback(checked);
    }
  } else {
    callback(true);
  }
}

async function initCertDialog() {
  let bg = window.theme == "dark" ? "#292A2D" : "#FFFFFF";
  certDialog = new BrowserWindow({
    frame: false,
    resizable: false,
    backgroundColor: bg,
    width: 490,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    },
    show: false,
    parent: remote.getCurrentWindow(),
    icon: join(__dirname, "images/peacock.png")
  });

  certDialog.on("page-title-updated", async () => {
    certDialog.show();
  });
}

async function showCertificateDialog(certificate) {
  certificate.bg = window.theme == "dark" ? "#292A2D" : "#FFFFFF";

  let params = encodeURIComponent(JSON.stringify(certificate));

  let { format } = require("url");
  certDialog.loadURL(
    format({
      pathname: join(__dirname, "static/pages/dialogs/certificate.html"),
      protocol: "file:",
      slashes: true
    }) +
      "?" +
      params
  );
}

// MENU BUTTON MENU

let menuTemp = [
  { label:'New Tab', click: async() => keyboardShortcut('newTab') },
  // { label:'New window', click: async() => keyboardShortcut('newTab') },
  { type: 'separator' },
  { label:'Settings', click: async() => tabs.newView('peacock://settings') },
  { label:'History', click: async() => tabs.newView('peacock://history') },
  { label:'Bookmarks', click: async() => tabs.newView('peacock://bookmarks') },
  { type: 'separator' },
  { label:'Manage Tasks', click: async() => ipcRenderer.send('openProcessManager') },
  { label:'About Peacock', click: async() => tabs.newView('peacock://version') },
  { label:'Exit', click: async() => app.exit() },
];

// HTML ELEMENTS

$("#shield").click(toggleAdblock);

$("#home").click(async () => tabs.current().webContents.loadURL('peacock://newtab'));
$("#back").click(async () => keyboardShortcut("backPage"));
$("#forward").click(async () => keyboardShortcut("forwardPage"));
$("#refresh").mousedown(async e => {
  switch (e.which) {
    case 1:
      if (
        $("#refresh")
          .children()
          .first()
          .attr("src") == "images/refresh.svg"
      ) {
        tabs.current().webContents.reload();
      } else {
        tabs.current().webContents.stop();
      }
      break;
    case 2:
      let url = tabs.current().webContents.getURL();
      tabs.newView(url);
      break;
  }
  return true; // to allow the browser to know that we handled it.
});

$("#menu").click(async () => Menu.buildFromTemplate(menuTemp).popup({
  x: Math.ceil($('#menu').offset().left),
  y: Math.ceil($('#menu').offset().top + $('#menu').height())
}));

$('#url').keypress(async e => {
  if (e.which == 13 || e.which == 10) {
    if (e.ctrlKey) {
      $('#url').val("www." + $('#url').val());
      $('#url').val($('#url').val() + ".org");
    } else if (e.shiftKey) {
      $('#url').val("www." + $('#url').val());
      $('#url').val($('#url').val() + ".net");
    } else {
      loadPage($('#url').val());
      $('#url').blur();
    }
  }
});

$('#url').focus(async e => {
  e.preventDefault();

  $('#nav-center').css('border', 'var(--accent) 2px solid');

  $('#url').val(tabs.current().webContents.getURL())
  $('#url').select();

  $('#url').attr("placeholder", "");
});

$('#url').on('input', async e => {
  search.show($('#url').val(), searchBounds());
});

$('#url').blur(async () => {
  $('#nav-center').removeAttr('style');

  $('#url')[0].setSelectionRange(0,0);
  $('#url').attr("placeholder", $('#url').attr("data-placeholder"));
  setTimeout(function() {
    search.hide();
    web.setSearchIcon(tabs.current().webContents.getURL());
  }, 100);
});

$("#bookmark").click(async () => {
  console.log('bookmarking...');

  let url = tabs.current().webContents.getURL();
  let title = tabs.current().webContents.getTitle();

  console.log('checking if is book of the marked');
  storage.isBookmarked(url).then(isBookmarked => {
    console.log('is bookmarked?', isBookmarked ? 'yes' : 'no');
    if (isBookmarked) {
      $("#bookmark").children().first().attr("src", "images/bookmark.svg");
      console.log('removing bookmark');
      storage.removeBookmark(isBookmarked.id);
    } else {
      $("#bookmark").children().first().attr("src", "images/bookmark-saved.svg");
      console.log('adding bookmark');
      storage.addBookmark(url, title);
    }
  });
});

$("#site-info").click(async () => {
  if(!$("#site-info").children().first().attr('src').includes('search')) toggleSiteInfo();
});

$("#info-header h4").click(async () => {
  toggleSiteInfo();
  tabs.newView("https://support.google.com/chrome/answer/95617");
});

$("#find a").click(async () => $(this).toggleClass("down"));
$("#close-find").click(async () => findInPage());

getSearchEngine(async e => {
  $('#url').attr("placeholder", `Search ${e.name} or type a URL`);
  $('#url').attr("data-placeholder", `Search ${e.name} or type a URL`);
});

initCertDialog();
initAlert();

loadFlags();

remote.getCurrentWindow().on("closed", async () => {
  remote
    .getCurrentWindow()
    .getChildWindows()
    .forEach(win => win.close());
});

remote.getCurrentWindow().on("move", async () => {
  search.hide();
  $('#url').blur();
});

tabs.newView(remote.process.argv[2] && (remote.process.argv[2].startsWith('http') ||
  remote.process.argv[2].startsWith('peacock')) ? remote.process.argv[2] : 'peacock://newtab');
