// PACKAGES

const { remote, ipcRenderer } = require('electron');
const {
  BrowserWindow,
  nativeTheme,
  ipcMain,
  app,
  Menu
} = remote;
require('electron').ipcMain = ipcMain;

require('v8-compile-cache');

const { join } = require('path');

const { ElectronBlocker } = require('@cliqz/adblocker-electron');

const tabs = require('./js/tabs.js');
const storage = require('./js/store.js');

const shortcuts = require('./js/shortcuts.js');

const web = require('./js/web.js');

window.search = require('./js/search.js');
window.tabs = tabs;

function searchBounds () {
  let winBounds = remote.getCurrentWindow().getBounds();
  let bounds = {};

  let navCenter = document.getElementById('nav-center');

  bounds.x = Math.ceil(navCenter.getBoundingClientRect().left + window.scrollX);
  bounds.y = Math.ceil(navCenter.getBoundingClientRect().top + window.scrollY
    + parseFloat(getComputedStyle(navCenter, null).height.replace("px", ""))) + 5;
  bounds.width = Math.floor(parseFloat(getComputedStyle(navCenter, null).width.replace("px", "")));
  bounds.height = 240;

  if(winBounds.x >= 0) bounds.x += winBounds.x;
  if(winBounds.y >= 0) bounds.y += winBounds.y;

  return bounds;
};

search.initialize(searchBounds());

// STORAGE

const Store = require('electron-store');
const store = new Store();

window.store = store;
window.storage = storage;

if (!store.get('settings')) {
  let data = {
    search_engine: 'DuckDuckGo',
    theme: 'Default',
    save_location: 'Downloads',
    storage: 'Locally',
    newTab: { backgroundTheme: 'https://source.unsplash.com/1280x720/daily?peacock', items: ['', '', '', '', ''] }
  };
  store.set('settings', data);
}

store.set('searchEngines', [
  { name: 'Google', url: 'https://google.com/search?q=' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?t=peacock&q=' },
  { name: 'Startpage.com', url: 'https://startpage.com/do/metasearch.pl?query=' },
  { name: 'Bing', url: 'https://www.bing.com/search?q=' },
]);

if (!store.get('blocked')) store.set('blocked', 0);
if (!store.get('bookmarks')) store.set('bookmarks', []);
if (!store.get('history')) store.set('history', []);
if (!store.get('permissions')) store.set('permissions', {});
if (!store.get('flags')) store.set('flags', [
  // '--disable-reading-from-canvas'
  '--enable-smooth-scrolling',
  '--dns-prefetch-disable',
  '--no-pings',
  '--no-referrers',
  '--no-crash-upload',
  '--no-default-browser-check',
  '--disable-breakpad',
  '--disable-plugins',
  '--https-only'
]);

web.init(document);
storage.init(store);
shortcuts.init(keyboardShortcut, n => { if (tabs.get(n-1)) tabs.activate(tabs.get(n-1)) });

console.colorLog = (msg, color) => { console.log('%c' + msg, 'color:' + color + ';font-weight:bold;') }

const { version } = require('./package.json');

exports.getTabCount = function() {
  return tabs.length();
};
exports.showAlert = showAlert;

window.theme = 'light';

var alertWin, certDialog;

window.darkMode = nativeTheme.shouldUseDarkColors || false;

ipcMain.on('alert', async (e, data) =>
  showAlert(data, r => {
    e.returnValue = r;
  })
);

ipcMain.on('flags.js', async function(e, action, data) {
  let flags = store.get('flags');

  if (action == 'set') {
    store.set('flags', data);
  } else {
    e.returnValue = flags;
  }
});

ipcMain.on('getBookmarks', async e => { e.returnValue = (await storage.getBookmarks()) });
ipcMain.on('removeBookmark', async (e, id) => {
  storage.removeBookmark(id);
  console.log('b', id);
});

ipcMain.on('getHistory', async e => { e.returnValue = (await storage.getHistory()) });
ipcMain.on('clearHistory', async () => storage.clearHistory());
ipcMain.on('removeHistoryItem', async (e, id) => storage.removeHistoryItem(id));

ipcMain.on('newTab', async function(e, action, extra) {
  if (action == 'focusSearchbar') {
    let urlEl = document.getElementById('url');
    urlEl.val = '';
    urlEl.focus();
    urlEl.select();
  } else if (action == 'saveItem') {
    let items = store.get('settings.newTab.items');
    items[extra.id] = extra.domain;
    store.set('settings.newTab.items', items);
  } else if (action == 'loadItems') {
    e.returnValue = store.get('settings.newTab.items');;
  } else if (action == 'getBackgroundTheme') {
    e.returnValue = store.get('settings.newTab.backgroundTheme');;
  } else if (action == 'setBackgroundTheme') {
    store.set('settings.newTab.backgroundTheme', extra);
  }
});

ipcMain.on('store', async (e, purpose, name, value) => {
  if (purpose == 'set') {
    store.set(name, value);
  } else {
    e.returnValue = store.get(name);
  }
});

ipcMain.on('siteInfo', async (e, action) => {
  switch (action) {
    case 'Certificate':
      let host = new URL(tabs.current().webContents.getURL()).host;

      let https = require('https');
      let options = {
        host: host,
        port: 443,
        method: 'GET'
      };

      let req = https.request(options, res => {
        let cert = res.connection.getPeerCertificate();
        showCertificateDialog(cert);
      });

      req.on('error', () => {
        showAlert({
          type: 'alert',
          message: 'Site doesn\'t have an SSL Certificate.',
          url: 'Peacock'
        });
      });

      req.end();
      break;
    case 'Cookies':
      cookies()
        .then(cookies => {
          console.log(cookies);
        })
        .catch(console.error);
      break;
    case 'Site Settings':
      break;
    default:
  }
});

ipcMain.on('shield-toggle', async (e, val) => changeAdBlock(val));

ipcMain.on(
  'getBlockCount',
  async e => (e.returnValue = tabs.current().webContents.session.ads_blocked)
);

ipcMain.on(
  'getVersions',
  async e => (e.returnValue = { ...process.versions, peacock: version })
);

ipcMain.on('getThemes', async e =>
  require('fs').readdir(join(__dirname, 'css/themes'), (err, files) => {
    let result = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].endsWith('.css')) {
        let theme = files[i].replace('.css', '');
        result.push(theme[0].toUpperCase() + theme.slice(1));
      }
    }
    e.returnValue = result;
  })
);

ipcMain.on('getTheme', async e => (e.returnValue = window.theme));
ipcMain.on('getDarkmode', async e => (e.returnValue = window.darkMode));

async function keyboardShortcut(shortcut) {
  switch (shortcut) {
    case 'browserDevTools':
      remote.getCurrentWindow().openDevTools({ mode: 'detach' });
      break;
    case 'devTools':
      tabs.current().webContents.openDevTools({ mode: 'right' });
      break;
    case 'nextTab':
      tabs.nextTab();
      break;
    case 'backTab':
      tabs.backTab();
      break;
    case 'newTab':
      tabs.newView();
      break;
    case 'closeTab':
      tabs.close();
      break;
    case 'openClosedTab':
      tabs.openClosedTab();
      break;
    case 'zoomIn':
      tabs.current().webContents.zoomFactor += 0.1;
      break;
    case 'zoomOut':
      tabs.current().webContents.zoomFactor -= 0.1;
      break;
    case 'resetZoom':
      tabs.current().webContents.zoomFactor = 1;
      break;
    case 'focusSearchbar':
      document.getElementById('url').focus();
      document.getElementById('url').select();
      break;
    case 'backPage':
      tabs.current().webContents.goBack();

      if (tabs.current().webContents.canGoBack()) { document.getElementById('back').removeAttribute('disabled') }
      else { document.getElementById('back').setAttribute('disabled', true) }
      if (tabs.current().webContents.canGoForward()){ document.getElementById('forward').removeAttribute('disabled') }
      else{ document.getElementById('forward').setAttribute('disabled', true) }
      break;
    case 'forwardPage':
      tabs.current().webContents.goForward();

      if (tabs.current().webContents.canGoBack()) { document.getElementById('back').removeAttribute('disabled') }
      else { document.getElementById('back').setAttribute('disabled', true) }
      if (tabs.current().webContents.canGoForward()) { document.getElementById('forward').removeAttribute('disabled') }
      else{ document.getElementById('forward').setAttribute('disabled', true) }
      break;
    case 'savePage':
      tabs.savePage(tabs.current().webContents);
      break;
    case 'refreshPage':
      tabs.current().webContents.reload();
      break;
    case 'forceReload':
      tabs.current().webContents.reloadIgnoringCache();
      break;
    case 'restart':
      app.relaunch();
      app.exit(0);
      break;
    case 'scrollToTop':
      tabs
        .current()
        .webContents.executeJavaScript(
          `window.scrollTo({ top: 0, behavior: 'smooth' })`
        );
    case 'openHistory': tabs.newView('peacock://history'); break;
    case 'openBookmarks': tabs.newView('peacock://bookmarks'); break;
    case 'openSettings': tabs.newView('peacock://settings'); break;
    case 'openTaskManager': ipcRenderer.send('openProcessManager'); break;
    default:
      break;
  }
}

ipcMain.on('loadPage', async (e, a) => loadPage(a));

ipcMain.on('openPage', async (e, a) => tabs.newView(a));

ipcMain.on('loadTheme', async () => loadTheme());

ipcMain.on('viewAdded', async () => {
  enableAdBlocking();
  tabs
    .current()
    .webContents.session.setPermissionRequestHandler(handlePermission);
});

// ADBLOCK

var { fetch } = require('cross-fetch');

async function enableAdBlocking(session) {
  session = session || tabs.current().webContents.session;

  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then(blocker => {
    blocker.enableBlockingInSession(session);
    blocker.on('request-blocked', async () => {
      store.set('blocked', store.get('blocked') + 1);

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

  let tone = window.theme === 'dark' ? 'dark' : 'light';
  document.getElementById('shieldIMG').src = 'images/loading-' + tone + '.gif';

  setTimeout(async function() {
    tabs.current().webContents.reload();
    let suffix = window.theme === 'dark' ? ' White' : '';
    suffix += enabled ? '' : ' Empty';

    document.getElementById('shieldIMG').src = 'images/Peacock Shield' + suffix + '.svg';
  }, 3000);
}

async function toggleAdblock() {
  let adblock = new BrowserWindow({
    frame: false,
    resizable: false,
    skipTaskbar: true,
    x: document.getElementById('shield').offsetLeft - 190,
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
    icon: join(__dirname, 'images/peacock.png')
  });

  let address = require('url').format({
    pathname: join(__dirname, 'static/pages/dialogs/shield.html'),
    protocol: 'file:',
    slashes: true
  });

  adblock.focus();

  adblock.webContents.once('dom-ready', async () => {
    let enabled = !document.getElementById('shieldIMG').src.endsWith('Empty.svg');
    adblock.webContents.send('count', tabs.current().webContents.session.ads_blocked, enabled);
  });

  adblock.on('blur', async () => {
    adblock.close();
  });

  adblock.loadURL(address);
}

// THEMES

async function loadTheme() {
  let themeObj = store.get('settings.theme').toLowerCase();
  let newTheme = themeObj;

  if (window.darkMode && themeObj == 'default') newTheme = 'dark';

  if (window.theme != newTheme) {
    if (themeObj === 'light') {
      window.theme = 'light';
      if (document.querySelector('head link[href*="css/themes"]')) document.querySelector('head link[href*="css/themes"]').remove();
    } else if (themeObj === 'default') {
      if (window.darkMode) {
        // If Dark Mode
        window.theme = 'dark';
        if(document.querySelector('link[href="css/themes/dark.css"]')) document.querySelector('link[href="css/themes/dark.css"]').remove();
        document.head.innerHTML += '<link rel="stylesheet" href="css/themes/dark.css">';
      } else {
        // If Light Mode
        window.theme = 'light';
        if (document.querySelector('head link[href*="css/themes"]')) document.querySelector('head link[href*="css/themes"]').remove();
      }
    } else {
      window.theme = 'dark';
      let themeEl = document.querySelector('link[href="css/themes/' + themeObj + '.css"]');
      if(themeEl) themeEl.remove();
      document.head.innerHTML += '<link rel="stylesheet" href="css/themes/' + themeObj + '.css">';
    }
  }
}
loadTheme();

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
    icon: join(__dirname, 'images/peacock.png')
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

  let address = require('url').format({
    pathname: join(__dirname, 'static/pages/dialogs/alert.html'),
    protocol: 'file:',
    slashes: true
  });

  alertWin.loadURL(address);

  // alertWin.openDevTools({ mode: 'detach' });

  alertWin.on('page-title-updated', async () => {
    alertWin.show();
  });
}

async function showAlert(data, callback) {
  let params = { ...data, bg: window.theme };

  alertWin.webContents.send('load', params);
  alertWin.show();

  switch (data.type) {
    case 'prompt':
      alertWin.setBounds({ height: 200 });
      ipcMain.once('alert-reply', (e, r) => {
        callback(r);
        alertWin.setBounds({ height: 130 });
      });
      break;
    case 'confirm':
      ipcMain.once('alert-reply', (e, r) => {
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
  let searchEngine = store.get('settings.search_engine');
  let engines = store.get('searchEngines');

  for (var i = 0; i < engines.length; i++) {
    if (engines[i].name == searchEngine) {
      cb(engines[i]);
    }
  }
}

async function loadPage(val) {
  document.getElementById('url').blur();

  try {
    new URL(val);
    tabs.current().webContents.loadURL(val);
  } catch (e) {
    if (val.includes('.') && !val.includes(' ')) {
      document.getElementById('url').value = val;
      tabs.current().webContents.loadURL('https://' + val);
    } else if (
      val.includes('://') ||
      val.startsWith('data:') ||
      (val.startsWith('localhost:') && !val.includes(' '))
    ) {
      document.getElementById('url').value = val;
      tabs.current().webContents.loadURL(val);
    } else {
      getSearchEngine(async function(engine) {
        document.getElementById('url').value = engine.url + val;
        tabs.current().webContents.loadURL(engine.url + val);
      });
    }
  }
}

// SNACKBAR

async function showSnackbar(
  text = '',
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

  snackbar.webContents.once('dom-ready', async () => {
    snackbar.webContents.send('permission-request', text, items, buttons);

    ipcMain.once('permission-reply', (event, reply) => {
      snackbar.close();
      callback(reply);

      remote.getCurrentWindow().focus();
      remote.getCurrentWindow().focus();
    });
  });

  snackbar.loadURL(
    require('url').format({
      pathname: join(__dirname, 'static/pages/dialogs/snackbar.html'),
      protocol: 'file:',
      slashes: true
    })
  );
}


async function loadFlags() {
  let flags = store.get('flags');
  for (let i = 0; i < flags.length; i++) {
    console.log(`Added flag: ${flags[i]}`);
    app.commandLine.appendSwitch(flags[i]);
  }
}

// SITE INFO

let siteInfo;
async function toggleSiteInfo() {
  if (!siteInfo) {

    let siteInfoEl = document.getElementById('site-info');

    siteInfo = new BrowserWindow({
      frame: false,
      transparent: true,
      width: 320,
      height: 330,
      x: remote.getCurrentWindow().getBounds().x + siteInfoEl.getBoundingClientRect().left + window.scrollX,
      y: remote.getCurrentWindow().getBounds().y + siteInfoEl.getBoundingClientRect().top + window.scrollY +
        (parseFloat(getComputedStyle(siteInfo, null).height.replace("px", "")) * 3),
      parent: remote.getCurrentWindow(),
      webPreferences: {
        nodeIntegration: true,
        enableRemoteModule: true
      }
    });

    siteInfo.loadURL(
      require('url').format({
        pathname: join(__dirname, 'static/pages/dialogs/info.html'),
        protocol: 'file:',
        slashes: true
      })
    );

    siteInfo.on('blur', () => {
      if(siteInfo) siteInfo.close();
      siteInfo = null;
      remote.getCurrentWindow().focus();
      remote.getCurrentWindow().focus();
    });

    siteInfo.on('close', () => {
      siteInfo = null;
      remote.getCurrentWindow().focus();
      remote.getCurrentWindow().focus();
    });

    let url = new URL(tabs.current().webContents.getURL());

    let perms = store.get('permissions')[url.hostname];

    siteInfo.webContents.once('dom-ready', async () => {
      cookies()
        .then(c => {
          siteInfo.webContents.send('cookies', c.length);
        })
        .catch(console.error);

      if (!perms) return;

      Object.keys(perms).forEach((item) => {
        let allowed = perms[item] ? 'Allow' : 'Block';

        siteInfo.webContents.send(
          'perm',
          `
          <li id="info-perm">
            <img src="//:0" id="perm-icon">
            <p id="perm-text">${item}</p>
            <button id="perm-allow">${allowed}</button>
          </li>
        `
        );
      });
    });
  }
}

async function savePermission(site, permission, allowed) {
  let perms = store.get('permissions');
  if (!perms[site]) {
    perms[site] = {};
  }
  perms[site][permission] = allowed;

  store.set('permissions', perms);
}

async function cookies(contents, site) {
  contents = contents || tabs.current().webContents;
  site = site || contents.getURL();
  return contents.session.cookies.get({ url: site });
}

async function handlePermission(webContents, permission, callback, details) {
  if (details.mediaTypes) {
  }
  if (permission == 'geolocation') permission = 'location';
  if (permission == 'midiSysex') permission = 'midi';

  let allowedPerms = ['fullscreen', 'pointerLock'];
  if (!allowedPerms.includes(permission)) {
    let url = new URL(webContents.getURL()).hostname;

    let perms = store.get('permissions');

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
        ['Allow', 'Block'],
        function(response) {
          if (response === 'Allow') {
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
  let bg = window.theme == 'dark' ? '#292A2D' : '#FFFFFF';
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
    icon: join(__dirname, 'images/peacock.png')
  });

  certDialog.on('page-title-updated', async () => {
    certDialog.show();
  });
}

async function showCertificateDialog(certificate) {
  certificate.bg = window.theme == 'dark' ? '#292A2D' : '#FFFFFF';

  let params = encodeURIComponent(JSON.stringify(certificate));

  let { format } = require('url');
  certDialog.loadURL(
    format({
      pathname: join(__dirname, 'static/pages/dialogs/certificate.html'),
      protocol: 'file:',
      slashes: true
    }) +
      '?' +
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

// document.getElementById('shield').addEventListener('click', toggleAdblock);

// document.getElementById('home').addEventListener('click', async () => tabs.current().webContents.loadURL('peacock://newtab'));
document.getElementById('back').addEventListener('click', async () => keyboardShortcut('backPage'));
document.getElementById('forward').addEventListener('click', async () => keyboardShortcut('forwardPage'));
document.getElementById('refresh').addEventListener('mousedown', async e => {
 
  switch (e.which) {
    case 1:    
      if (document.getElementById('refresh').firstElementChild.src.endsWith('refresh.svg')) {
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

document.getElementById('menu').addEventListener('click', async () => Menu.buildFromTemplate(menuTemp).popup({
  x: Math.ceil(document.getElementById('menu').getBoundingClientRect().left + window.scrollX),
  y: Math.ceil(document.getElementById('menu').getBoundingClientRect().top + window.scrollY
    + parseFloat(getComputedStyle(document.getElementById('menu'), null).height.replace("px", "")))
}));

document.getElementById('url').addEventListener('keypress', async e => {
  if (e.which == 13 || e.which == 10) {
    if (e.ctrlKey) {
      document.getElementById('url').value = 'www.' + document.getElementById('url').value;
      document.getElementById('url').value = document.getElementById('url').value + '.org';
    } else if (e.shiftKey) {
      document.getElementById('url').value = 'www.' + document.getElementById('url').value;
      document.getElementById('url').value = document.getElementById('url').value + '.net';
    } else {
      loadPage(document.getElementById('url').value);
      document.getElementById('url').blur();
    }
  }
});

document.getElementById('url').addEventListener('focus', async e => {
  e.preventDefault();

  document.getElementById('nav-center').style.border = 'var(--accent) 2px solid';

  document.getElementById('url').value = tabs.current().webContents.getURL();
  document.getElementById('url').select();

  document.getElementById('url').placeholder = '';
});

document.getElementById('url').addEventListener('input', async e => {
  search.show(document.getElementById('url').value, searchBounds());
});

document.getElementById('url').addEventListener('blur', async () => {
  document.getElementById('nav-center').removeAttribute('style');

  document.getElementById('url').setSelectionRange(0,0);
  document.getElementById('url').placeholder = document.getElementById('url').getAttribute('data-placeholder');
  setTimeout(function() {
    search.hide();
    web.setSearchIcon(tabs.current().webContents.getURL());
  }, 100);
});

document.getElementById('bookmark').addEventListener('click', async () => {
  console.log('bookmarking...');

  let url = tabs.current().webContents.getURL();
  let title = tabs.current().webContents.getTitle();

  console.log('checking if is book of the marked');
  storage.isBookmarked(url).then(isBookmarked => {
    console.log('is bookmarked?', isBookmarked ? 'yes' : 'no');
    if (isBookmarked) {
      document.getElementById('bookmark').firstElementChild.src = 'images/bookmark.svg';
      console.log('removing bookmark');
      storage.removeBookmark(isBookmarked.id);
    } else {
      document.getElementById('bookmark').firstElementChild.src = 'images/bookmark-saved.svg';
      console.log('adding bookmark');
      storage.addBookmark(url, title);
    }
  });
});

document.getElementById('site-info').addEventListener('click', async () => {
  if(!document.getElementById('site-info').firstElementChild.src.includes('search')) toggleSiteInfo();
});

getSearchEngine(async e => {
  document.getElementById('url').placeholder = `Search ${e.name} or type a URL`;
  document.getElementById('url').setAttribute('data-placeholder', `Search ${e.name} or type a URL`);
});

initCertDialog();
initAlert();

loadFlags();

remote.getCurrentWindow().on('closed', async () => {
  remote
    .getCurrentWindow()
    .getChildWindows()
    .forEach(win => win.close());
});

remote.getCurrentWindow().on('move', async () => {
  search.hide();
  document.getElementById('url').blur();
});

tabs.newView(remote.process.argv[2] && (remote.process.argv[2].startsWith('http') ||
  remote.process.argv[2].startsWith('peacock')) ? remote.process.argv[2] : 'peacock://newtab');
