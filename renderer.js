// PACKAGES

const { remote, webFrame, nativeImage } = require("electron");
const {
  BrowserView,
  BrowserWindow,
  screen,
  dialog,
  nativeTheme,
  ipcMain,
  app
} = remote;
require("electron").ipcMain = ipcMain;

const { join, normalize } = require("path");

const { ElectronBlocker } = require("@cliqz/adblocker-electron");

const { writeFile } = require("fs");

const mail = require("./js/mail.js");
const tabs = require("./js/tabs.js");
const blockchain = require("./js/blockchain.js");
const storage = require("./js/store.js");

const shortcuts = require("./js/shortcuts.js");

window.tabs = tabs;

var blockstackTab;

const web = require("./js/web.js");

// STORAGE

const Store = require("electron-store");
const store = new Store();

if (!store.get("settings")) {
  let data = {
    search_engine: "DuckDuckGo",
    theme: "Default",
    save_location: "Downloads",
    storage: "Locally",
    newTab: { backgroundTheme: "nature", items: ["", "", "", "", ""] },
    mail: { address: "", ids: [] },
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

if (!store.get("blocked")) store.set("blocked", []);
if (!store.get("bookmarks")) store.set("bookmarks", []);
if (!store.get("flags")) store.set("flags", []);
if (!store.get("history")) store.set("history", []);
if (!store.get("permissions")) store.set("permissions", {});

web.init(document);
storage.init(store);
mail.init(store);
shortcuts.init(keyboardShortcut, n => { if (tabs.get(n-1)) tabs.activate(tabs.get(n-1)) });

console.colorLog = (msg, color) => { console.log("%c" + msg, "color:" + color + ";font-weight:bold;") }

const { version } = require("./package.json");

var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:68.0) Gecko/20100101 Firefox/68.0';

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

  rpclient.login({ clientId }).catch(console.error);
}

exports.getTabCount = function() {
  return tabs.length();
};
exports.showAlert = showAlert;

window.theme = "light";

var alertWin, settings, certDialog;

window.darkMode = nativeTheme.shouldUseDarkColors || false;

ipcMain.on("alert", async (e, data) =>
  showAlert(data, r => {
    e.returnValue = r;
  })
);

ipcMain.on("flags.js", async function(e, action, data) {
  let flags = store.get("flags");

  if (action == "set") {
    if (data.value) {
      flags.push(data.flag);
    } else {
      flags.splice(flags.indexOf(data.flag), 1);
    }

    store.set("flags", flags);
  } else {
    e.returnValue = flags;
  }
});

ipcMain.on("getBookmarks", async e =>
  storage.getBookmarks().then(r => (e.returnValue = r))
);
ipcMain.on("removeBookmark", async (e, id) => {
  storage.removeBookmark(id);
  console.log("b", id);
});

ipcMain.on("getHistory", async e =>
  storage.getHistory().then(r => (e.returnValue = r))
);
ipcMain.on("clearHistory", async e => storage.clearHistory());
ipcMain.on("removeHistoryItem", async (e, id) => storage.removeHistoryItem(id));

ipcMain.on("newTab", async function(e, action, extra) {
  if (action == "focusSearchbar") {
    $("#url").val("");
    $("#url").focus();
    $("#url").select();
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

ipcMain.on("mail", async function(e, action, data) {
  switch (action) {
    case "new":
      mail.new(
        data.alias,
        result => {
          e.returnValue = result;
        },
        data.name
      );
      //e.returnValue = 'spikey';
      break;
    case "aliases":
      mail.list().then(r => { e.returnValue = r; console.log(r) });
      break;
    case "setAddress":
      store.set("settings.mail.address", data);
      break;
    case "getAddress":
      e.returnValue = store.get("settings.mail.address");
      break;
    default:
      break;
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

      req.on("error", e => {
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
  "signIntoBlockstack",
  (e, a) => (blockstackTab = tabs.newView(blockchain.signIntoBlockstack()))
);

ipcMain.on("blockchain", async (e, a) => {
  switch (a) {
    case "isUserSignedIn":
      e.returnValue = blockchain.getUserSession().isUserSignedIn();
      break;
    case "signOut":
      blockchain.getUserSession().signUserOut();
      break;
    case "profile":
      e.returnValue = blockchain.getUserSession().loadUserData().profile;
      break;
    default:
  }
});

ipcMain.on(
  "getBlockCount",
  async e => (e.returnValue = tabs.current().webContents.session.ads_blocked)
);

ipcMain.on(
  "getVersions",
  async e => (e.returnValue = { ...process.versions, peacock: version })
);

ipcMain.on("getThemes", async e =>
  require("fs").readdir("css/themes", (err, files) => {
    let result = [];
    files.forEach(file => {
      if (file.endsWith(".css")) {
        let theme = file.replace(".css", "");
        result.push(theme[0].toUpperCase() + theme.slice(1));
      }
    });
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
      $("#url").focus();
      $("#url").select();
      break;
    case "backPage":
      tabs.current().webContents.goBack();

      if (tabs.current().webContents.canGoBack()) {
        $("#back").removeClass("disabled");
      } else {
        $("#back").addClass("disabled");
      }

      if (tabs.current().webContents.canGoForward()) {
        $("#forward").removeClass("disabled");
      } else {
        $("#forward").addClass("disabled");
      }
      break;
    case "forwardPage":
      tabs.current().webContents.goForward();

      if (tabs.current().webContents.canGoBack()) {
        $("#back").removeClass("disabled");
      } else {
        $("#back").addClass("disabled");
      }

      if (tabs.current().webContents.canGoForward()) {
        $("#forward").removeClass("disabled");
      } else {
        $("#forward").addClass("disabled");
      }
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

ipcMain.on("loadPage", async (e, a) => tabs.current().webContents.loadURL(a));

ipcMain.on("openPage", async (e, a) => tabs.newView(a));

ipcMain.on("loadTheme", async (e, a) => loadTheme());

ipcMain.on("viewAdded", async e => {
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
    blocker.on("request-blocked", async ad => {
      let obj = store.get("blocked");
      obj.push({
        type: ad.type,
        url: ad.url,
        sourceHostname: ad.sourceHostname
      });
      store.set("blocked", obj);

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
    icon: join(__dirname, "images/peacock.ico")
  });

  let address = require("url").format({
    pathname: join(__dirname, "pages/dialogs/shield.html"),
    protocol: "file:",
    slashes: true
  });

  adblock.focus();

  adblock.webContents.once("dom-ready", async e => {
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
  let bg = window.theme == "dark" ? "#292A2D" : "#ffffff";

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
    alwaysOnTop: true,
    icon: join(__dirname, "images/peacock.ico")
  };

  alertWin = new BrowserWindow(args);

  let address = require("url").format({
    pathname: join(__dirname, "pages/dialogs/alert.html"),
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
  $("#url").blur();

  try {
    new URL(val);
    tabs.current().webContents.loadURL(val);
  } catch (e) {
    if (val.includes(".") && !val.includes(" ")) {
      $("#url").val(val);
      tabs.current().webContents.loadURL("https://" + val);
    } else if (
      val.includes("://") ||
      val.startsWith("data:") ||
      (val.startsWith("localhost:") && !val.includes(" "))
    ) {
      $("#url").val(val);
      tabs.current().webContents.loadURL(val);
    } else {
      getSearchEngine(async function(engine) {
        $("#url").val(engine.url + val);
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

  snackbar.webContents.once("dom-ready", async e => {
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
      pathname: join(__dirname, "pages/dialogs/snackbar.html"),
      protocol: "file:",
      slashes: true
    })
  );
}

async function hideSnackbar() {
  $("#snackbar").css("display", "none");
}

async function loadFlags() {
  store.get("flags").forEach(function(flag) {
    console.log("Added flag: " + flag);
    app.commandLine.appendSwitch(flag);
  });
}

// SITE INFO

let siteInfo;
async function toggleSiteInfo() {
  if (!siteInfo) {
    $("#site-info").addClass("search-active");
    siteInfo = new BrowserWindow({
      frame: false,
      transparent: true,
      width: 320,
      height: 330,
      x: $("#site-info")[0].offsetLeft,
      y: 67,
      parent: remote.getCurrentWindow(),
      webPreferences: {
        nodeIntegration: true,
        enableRemoteModule: true
      }
    });

    siteInfo.loadURL(
      require("url").format({
        pathname: join(__dirname, "pages/dialogs/info.html"),
        protocol: "file:",
        slashes: true
      })
    );

    siteInfo.on("blur", e => {
      siteInfo.close();
      siteInfo = null;
      $("#site-info").removeClass("search-active");
      remote.getCurrentWindow().focus();
      remote.getCurrentWindow().focus();
    });

    siteInfo.on("close", e => {
      siteInfo = null;
      $("#site-info").removeClass("search-active");
      remote.getCurrentWindow().focus();
      remote.getCurrentWindow().focus();
    });

    let url = new URL(tabs.current().webContents.getURL());

    let perms = store.get("permissions")[url.hostname];

    siteInfo.webContents.once("dom-ready", async e => {
      cookies()
        .then(c => {
          siteInfo.webContents.send("cookies", c.length);
        })
        .catch(console.error);

      if (!perms) return;

      Object.keys(perms).forEach((item, index) => {
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
    let mediaType = details.mediaTypes[0] == "audio" ? "microphone" : "camera";
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
    icon: join(__dirname, "images/peacock.ico")
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
      pathname: join(__dirname, "pages/dialogs/certificate.html"),
      protocol: "file:",
      slashes: true
    }) +
      "?" +
      params
  );
}

// HTML ELEMENTS

$("#shield").click(toggleAdblock);
$("#back").click(async e => keyboardShortcut("backPage"));
$("#forward").click(async e => keyboardShortcut("forwardPage"));
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

$("#menu").click(async e => tabs.newView('peacock://settings'));

$("#url").keypress(async e => {
  if (e.which == 13 || e.which == 10) {
    if (e.ctrlKey) {
      $("#url").val("www." + $("#url").val());
      $("#url").val($("#url").val() + ".org");
    } else if (e.shiftKey) {
      $("#url").val("www." + $("#url").val());
      $("#url").val($("#url").val() + ".net");
    } else {
      loadPage($("#url").val());
      $("#url").blur();
    }
  }
});

$("#url").focus(async e => {
  $("#url").attr("placeholder", "");
  getSearchEngine(async e => {

  });
});

$("#url").blur(async e => {
  $("#url").attr("placeholder", $("#url").attr("data-placeholder"));
  setTimeout(function() {
    web.setSearchIcon(tabs.current().webContents.getURL());
  }, 75);
});
$("#bookmark").click(async e => {
  let url = tabs.current().webContents.getURL();
  let title = tabs.current().webContents.getTitle();

  storage.isBookmarked(url).then(isBookmarked => {
    if (isBookmarked) {
      $("#bookmark").attr("src", "images/bookmark.svg");
      storage.removeBookmark(url);
    } else {
      $("#bookmark").attr("src", "images/bookmark-saved.svg");
      storage.addBookmark(url, title);
    }
  });
});

$("#site-info").click(async e => toggleSiteInfo());

$("#info-header h4").click(async e => {
  toggleSiteInfo();
  tabs.newView("https://support.google.com/chrome/answer/95617");
});

$("#bookmark").on("mouseover mouseout", async e => {
  $(this).toggleClass("star-hover", e.type === "mouseover");
  e.stopPropagation();
});

$("#omnibox > #url").on("mouseover mouseout", async e => {
  $(this).toggleClass("url-hover", e.type === "mouseover");
  e.stopPropagation();
});

$("#find a").click(async e => $(this).toggleClass("down"));
$("#close-find").click(async e => findInPage());

getSearchEngine(async e => {
  $("#url").attr("placeholder", `Search ${e.name} or type a URL`);
  $("#url").attr("data-placeholder", `Search ${e.name} or type a URL`);
});

var options = {
  url: "https://api.github.com/repos/Codiscite/peacock/releases",
  headers: { "User-Agent": userAgent }
};
require("request").get(
  options,
  async function(error, response, body) {
    if (error) console.error(error);

    let newestVersion = JSON.parse(body)[0]
      .tag_name.split(".")
      .join("")
      .replace("v", "")
      .substr(0, 3);
    let currentVersion = version
      .split(".")
      .join("")
      .replace("v", "")
      .substr(0, 3);
    if (Number(newestVersion) > Number(currentVersion)) {
      const { dialog } = remote;

      const optionso = {
        type: "question",
        buttons: ["Cancel", "Update", "No, thanks"],
        defaultId: 2,
        title: "Peacock",
        message: "Update available!",
        detail: JSON.parse(body)[0].tag_name + " > " + version,
        checkboxLabel: "Do Not Show Again",
        checkboxChecked: false
      };

      dialog.showMessageBox(null, optionso).then(data => {
        if (data.response === 1) {
          tabs.newView("https://github.com/Codiscite/peacock/releases/latest");
        }
        console.log(data.checkboxChecked);
      });
    } else {
      console.log(`Using newest version! v${version}`);
    }
  },
  "jsonp"
);

initCertDialog();
initAlert();

loadFlags();

remote.getCurrentWindow().on("closed", async e => {
  remote
    .getCurrentWindow()
    .getChildWindows()
    .forEach(win => win.close());
});

const server = require("child_process").fork(__dirname + "/js/server.js");

// QUIT SERVER IF APP QUIT:
app.on("will-quit", async () => {
  server.send("quit");
});

server.on("message", async m => {
  let { decodeToken } = require("blockstack");
  const token = decodeToken(m.authResponse);

  console.log("blockstack", "signed in");
  if (blockchain.getUserSession().isUserSignedIn()) {
    if (!blockstackTab) return;
    tabs.close(blockstackTab);
    blockstackTab = null;
  } else {
    blockchain.getUserSession().handlePendingSignIn(m.authResponse);
    if (!blockstackTab) return;
    tabs.close(blockstackTab);
    blockstackTab = null;
  }
});

tabs.newView(remote.process.argv[2] && remote.process.argv[2].startsWith('http')
  ? remote.process.argv[2] : 'peacock://newtab');
