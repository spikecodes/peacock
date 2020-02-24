const { remote, webFrame, nativeImage } = require('electron');
const { BrowserView, BrowserWindow, screen, dialog, nativeTheme, ipcMain, app, Menu } = remote;
require('electron').ipcMain = ipcMain;


const { join, normalize } = require('path');

const { ElectronBlocker } = require('@cliqz/adblocker-electron');

const { writeFile } = require('fs');

const mail = require('./js/mail.js');
const tabs = require('./js/tabs.js');
const blockchain = require('./js/blockchain.js');
const storage = require('./js/store.js');

window.tabs = tabs;

var blockstackTab;

const web = require('./js/web.js');

const Store = require('electron-store');
const store = new Store();

if(!store.get('settings')) {
  let data = {
    "search_engine":"DuckDuckGo", "theme":"Default", "save_location":"Downloads", "storage":"Locally",
    "newTab":{ "backgroundTheme": "nature", "items": ["","","","",""] }, "mail":{ "address":"", "ids":[] }, "rich_presence": "Enabled"
  };
  store.set('settings', data);
}

store.set('searchEngines', [
  {"name": "Google", "url": "https://google.com/search?q="},
	{"name": "DuckDuckGo","url": "https://duckduckgo.com/?t=peacock&q="},
	{"name": "Bing","url": "https://www.bing.com/search?q="},
	{"name": "Yahoo","url": "https://search.yahoo.com/search?p="}
]);

if(!store.get('blocked')) store.set('blocked', []);
if(!store.get('bookmarks')) store.set('bookmarks', []);
if(!store.get('flags')) store.set('flags', []);
if(!store.get('history')) store.set('history', []);
if(!store.get('permissions')) store.set('permissions', {});

web.init(document);
storage.init(store);
mail.init(store);

const extensions = null;

const { version } = require('./package.json');

var userAgent = remote.getCurrentWebContents().userAgent.split(' ');
userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:73.0) Gecko/20100101 Firefox/73.0';

//Discord Rich Presence
if (store.get('settings.rich_presence') == 'Enabled') {
  const { Client } = require('discord-rpc');
  const clientId = '627363592408137749';

  const rpclient = new Client({
    transport: 'ipc'
  });
  const startDate = new Date();
  const startTimestamp = startDate.getTime();

  async function setActivity() {
    if (!rpclient) {
      return;
    }
    var details = 'https://peacock.link/';
    var state = 'Browsing the web...';
    rpclient.setActivity({
      details: details,
      state: state,
      startTimestamp,

      largeImageKey: 'peacockbg_light',
      largeImageText: `Peacock Browser v` + version,
      instance: false
    });
  }

  rpclient.on('ready', () => {
    setActivity();

    setInterval(() => {
      setActivity();
    }, 15e3);
  });

  rpclient
    .login({clientId})
    .catch(console.error);
}
//Discord Rich Presence

exports.getTabCount = function() { return tabs.length(); }
exports.showAlert = showAlert;

window.theme = 'light';

var alertWin, settings, certDialog;

window.darkMode = nativeTheme.shouldUseDarkColors || false;

ipcMain.on('alert', async function(e, data) {
  showAlert(data, r => { e.returnValue = r });
});

ipcMain.on('flags.js', async function(e, action, data) {
  let flags = store.get('flags');

  if (action == 'set') {
    if(data.value) { flags.push(data.flag) }
    else           { flags.splice(flags.indexOf(data.flag), 1) }

    store.set('flags', flags);
  } else {
    e.returnValue = flags;
  }
});


ipcMain.on('getBookmarks', async e => { storage.getBookmarks().then(r => e.returnValue = r) });
ipcMain.on('removeBookmark', async (e, id) => { storage.removeBookmark(id); console.log('b', id); });

ipcMain.on('getHistory', async e => { storage.getHistory().then(r => e.returnValue = r) });
ipcMain.on('clearHistory', async e => { storage.clearHistory() });
ipcMain.on('removeHistoryItem', async (e, id) => { storage.removeHistoryItem(id) });

ipcMain.on('newTab', async function(e, action, extra) {
  if(action == 'focusSearchbar') {
    $('#url').val('');
    $('#url').focus();
    $('#url').select();
  } else if (action == 'saveItem') {
    let items = store.get('settings.newTab.items');
    items[extra.id] = extra.domain;
    store.set('settings.newTab.items', items);
  } else if (action == 'loadItems') {
    e.returnValue = store.get('settings.newTab.items');
  } else if (action == 'getBackgroundTheme') {
    e.returnValue = store.get('settings.newTab.backgroundTheme');
  } else if (action == 'setBackgroundTheme') {
    store.set('settings.newTab.backgroundTheme', extra);
  }
});

ipcMain.on('mail', async function(e, action, data) {
  switch (action) {
    case 'new':
      mail.new(data.alias, (result) => {
        e.returnValue = result;
      }, data.name);
      //e.returnValue = 'spikey';
      break;
    case 'setAddress':
      store.set('settings.mail.address', data);
      break;
    case 'getAddress':
      e.returnValue = store.get('settings.mail.address');
      break;
    default:
      break;
  }
});

ipcMain.on('store', async (e, purpose, name, value) => {
  if (purpose == 'set') { store.set(name, value); }
  else { e.returnValue = store.get(name); }
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

      let req = https.request(options, (res) => {
        let cert = res.connection.getPeerCertificate();
        showCertificateDialog(cert);
      });

      req.on('error', (e) => {
       showAlert({ type: "alert", message: "Site doesn't have an SSL Certificate.", url: "Peacock" });
      });

      req.end();
      break;
    case 'Cookies':
      cookies().then((cookies) => {
        console.log(cookies);
      }).catch(console.error);
      break;
    case 'Site Settings':

      break;
    default:

  }
});

ipcMain.on('shield-toggle', async (e, val) => { changeAdBlock(val) });

ipcMain.on('signIntoBlockstack', (e, a) => {
	blockstackTab = tabs.newView(blockchain.signIntoBlockstack());
});

ipcMain.on('blockchain', async (e, a) => {
  switch (a) {
    case 'isUserSignedIn':
      e.returnValue = blockchain.getUserSession().isUserSignedIn();
      break;
    case 'signOut':
      blockchain.getUserSession().signUserOut();
      break;
    case 'profile':
      e.returnValue = blockchain.getUserSession().loadUserData().profile;
      break;
    default:

  }
});

ipcMain.on('getBlockCount', async e => { e.returnValue = tabs.current().webContents.session.ads_blocked })

ipcMain.on('getVersions', async e => { e.returnValue = {...process.versions, peacock: version} });

ipcMain.on('getThemes', async (e) => {
  require('fs').readdir('css/themes', (err, files) => {
    let result = [];
    files.forEach(file => {
      if(file.endsWith(".css")){
        let theme = file.replace(".css", "");
        result.push(theme[0].toUpperCase() + theme.slice(1));
      }
    });
    e.returnValue = result;
  });
});

ipcMain.on('getTheme', async e => { e.returnValue = window.theme; });
ipcMain.on('getDarkmode', async e => { e.returnValue = window.darkMode; });

let nav;
let viewHeight = $('.etabs-views').height();
async function keyboardShortcut(shortcut) {
  let { startVPN, stopVPN } = require('./js/vpn.js');
  switch (shortcut) {
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
    case 'startVPN':
      startVPN(join(__dirname, 'tor-win32-0.4.1.6/Tor/tor.exe'));
      break;
    case 'stopVPN':
      stopVPN();
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
      $('#url').focus();
      $('#url').select();
      break;
    case 'backPage':
      tabs.current().webContents.goBack();

      if(tabs.current().webContents.canGoBack()) {
        $('#back').removeClass('disabled');
      } else {
        $('#back').addClass('disabled');
      }

      if(tabs.current().webContents.canGoForward()) {
        $('#forward').removeClass('disabled');
      } else {
        $('#forward').addClass('disabled');
      }
      break;
    case 'forwardPage':
      tabs.current().webContents.goForward();

      if(tabs.current().webContents.canGoBack()) {
        $('#back').removeClass('disabled');
      } else {
        $('#back').addClass('disabled');
      }

      if(tabs.current().webContents.canGoForward()) {
        $('#forward').removeClass('disabled');
      } else {
        $('#forward').addClass('disabled');
      }
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
    case 'toggleCustomization':
      if(!nav){ nav = require('dragula')([$('#navigation')], {}); }
      else { nav.destroy(); nav = undefined; }
      break;
    case 'findInPage':
      findInPage();
      break;
    case 'scrollToTop':
      tabs.current().webContents.executeJavaScript(`window.scrollTo({ top: 0, behavior: 'smooth' })`);
    default:
      break;
  }
}

ipcMain.on('loadPage', async function(event, args) { tabs.current().webContents.loadURL(args); });

ipcMain.on('openPage', async function(event, args) { tabs.newView(args); });

ipcMain.on('loadTheme', async function(event, args) { loadTheme(); });

// Adblock
var { fetch } = require('cross-fetch');

async function enableAdBlocking(session) {
  session = session || tabs.current().webContents.session;

  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
    blocker.enableBlockingInSession(session);
    blocker.on('request-blocked', async (ad) => {
      let obj = store.get('blocked');
      obj.push({ type: ad.type, url: ad.url, sourceHostname: ad.sourceHostname });
      store.set('blocked', obj);

      if(!session.ads_blocked) session.ads_blocked = 0;
      session.ads_blocked++;
    });
  });
}

async function disableAdBlocking(session) {
  session = session || tabs.current().webContents.session;

  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
    blocker.disableBlockingInSession(session);
  });
}

async function loadTheme() {
  let themeObj = store.get('settings.theme').toLowerCase();
  let newTheme = themeObj;

  if(window.darkMode && themeObj == 'default') newTheme = 'dark';

  let src = $('#shieldIMG').attr('src');

  if (window.theme != newTheme) {
    //console.time('Theme load time');
    if (themeObj === 'light') {
      window.theme = 'light';

      if(src == 'images/Peacock Shield White.svg') {
        $('#shieldIMG').attr('src', 'images/Peacock Shield.svg');
      } else if (src == 'images/Peacock Shield White Empty.svg') {
        $('#shieldIMG').attr('src', 'images/Peacock Shield Empty.svg');
      }

			if($('head link[href*="css/themes"]').length > 0){
				$('head link[href*="css/themes"]').remove();
			}
    } else if (themeObj === 'default') {
      if (window.darkMode) {
        // If Dark Mode
        window.theme = 'dark';
        $('link[href="css/themes/dark.css"]').remove();
        $('head').append('<link rel="stylesheet" href="css/themes/dark.css">');

        if(src == 'images/Peacock Shield.svg') {
          $('#shieldIMG').attr('src', 'images/Peacock Shield White.svg');
        } else if (src == 'images/Peacock Shield Empty.svg') {
          $('#shieldIMG').attr('src', 'images/Peacock Shield White Empty.svg');
        }
      } else {
        // If Light Mode
        window.theme = 'light';

        if(src == 'images/Peacock Shield White.svg') {
          $('#shieldIMG').attr('src', 'images/Peacock Shield.svg');
        } else if (src == 'images/Peacock Shield White Empty.svg') {
          $('#shieldIMG').attr('src', 'images/Peacock Shield Empty.svg');
        }

        if($('head link[href*="css/themes"]').length > 0){
  				$('head link[href*="css/themes"]').remove();
  			}
      }
    } else {
      window.theme = 'dark';
      $('link[href="css/themes/' + themeObj + '.css"]').remove();
      $('head').append('<link rel="stylesheet" href="css/themes/' + themeObj + '.css">');

      if($('#shieldIMG').attr('src') == 'images/Peacock Shield.svg') {
        $('#shieldIMG').attr('src', 'images/Peacock Shield White.svg');
      } else {
        $('#shieldIMG').attr('src', 'images/Peacock Shield White Empty.svg');
      }
    }
    //console.timeEnd('Theme load time');
  }
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

    $('#find input').on('keypress', async (e) => {
      val = $('#find input').val();

      if (e.which == 13 && e.shiftKey) {
        if(val.length > 0){
          tabs.current().webContents.findInPage(val, {
            findNext: true,
            forward: false,
            matchCase: $('#match-case').hasClass('down')
          });
        }
      } else if (e.which == 13) {
        if(val.length > 0){
          tabs.current().webContents.findInPage(val, {
            findNext: true,
            matchCase: $('#match-case').hasClass('down')
          });
        }
      }
    });

    $('#find input').on('input', function () {
      val = $('#find input').val();
      if(val.length > 0) {
        tabs.current().webContents.findInPage(val, {
          findNext: false,
          matchCase: $('#match-case').hasClass('down')
        });
      } else {
        try {
          tabs.current().webContents.stopFindInPage('clearSelection');
        } catch (e) { }
        $('#matches').text('');
      }
    });
  });
}
}

async function initAlert() {
  let bg = (window.theme == 'dark') ? '#292A2D' : '#ffffff';

  var screenSize = {width: window.outerWidth, height: window.outerHeight};

  let args = {
    frame: false,
    resizable: false,
    skipTaskbar: true,
    x: (screenSize.width / 2) - (450 / 2),
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
    icon: join(__dirname, 'images/peacock.ico')
  };

  alertWin = new BrowserWindow(args);

  let address = require('url').format({
    pathname: join(__dirname, 'pages/dialogs/alert.html'),
    protocol: 'file:',
    slashes: true
  });

  alertWin.loadURL(address);

  alertWin.on('page-title-updated', async () => { alertWin.show(); });
}

async function showAlert(data, callback) {
  let params = {...data, bg: window.theme};

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
      ipcMain.once('alert-reply', (e, r) => { callback(r) });
      break;
    default:
      break;
  }

  alertWin.focus();
  alerted = false;
  // case 'message':
  //   $(document.body).prepend(`<center class="messageBox"><div class="message"><p>${data.message}</p></div></center>`);
  //   setTimeout(function () {
  //     $(document.body).children(":first").remove();
  //   }, data.duration);
  //   break;
}

async function getSearchEngine(cb) {
  let searchEngine = store.get('settings.search_engine');
  let engines = store.get('searchEngines');

  for (var i = 0; i < engines.length; i++) {
    if (engines[i].name == searchEngine) {
      cb(engines[i]);
    }
  }
}

async function changeAdBlock(enabled) {
  let session = tabs.current().webContents.session;

  if (enabled) { enableAdBlocking(session); }
  else { disableAdBlocking(session); }

  let tone = (window.theme === 'dark') ? 'dark' : 'light';
  $('#shieldIMG').attr('src', 'images/loading-' + tone + '.gif');

  setTimeout(async function() {
    tabs.current().webContents.reload();
    let suffix = (window.theme === 'dark') ? ' White' : '';
    suffix += (enabled) ? '' : ' Empty';

    $('#shieldIMG').attr('src', 'images/Peacock Shield' + suffix + '.svg');
  }, 3000);
}

async function toggleAdblock() {
  let adblock = new BrowserWindow({
    frame: false,
    resizable: false,
    skipTaskbar: true,
    x: $('#shield')[0].offsetLeft - 190,
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
    icon: join(__dirname, 'images/peacock.ico')
  });

  let address = require('url').format({
    pathname: join(__dirname, 'pages/dialogs/shield.html'),
    protocol: 'file:',
    slashes: true
  });

  adblock.focus();

  adblock.webContents.once('dom-ready', async e => {
    let enabled = !$('#shieldIMG').attr('src').endsWith('Empty.svg');
    adblock.webContents.send('count', tabs.current().webContents.session.ads_blocked, enabled);
  });

  adblock.on('blur', async () => { adblock.close() });

  adblock.loadURL(address);

  // let src = $('#shieldIMG').attr('src');
  // if (src.startsWith('images/Peacock Shield') && !src.endsWith('Empty.svg')) {
  //   //If On
  //   changeAdBlock(false);
  // } else if (src.endsWith('Empty.svg')) {
  //   //If Off
  //   changeAdBlock(true);
  // } else {
  //   console.log(src);
  // }
}

async function loadPage(val) {
$('#url').blur();

try {
  new URL(val);
  tabs.current().webContents.loadURL(val);
} catch (e) {
  if (val.includes('.') && !val.includes(' ')) {
    $('#url').val(val);
    tabs.current().webContents.loadURL('https://' + val);
  } else if (val.includes('://') || val.startsWith('data:') || val.startsWith('localhost:') && !val.includes(' ')) {
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

async function finishLoad(event, tab) {
const webview = document.querySelector('webview');
webview.style.display = null;

try {
  tab.setTitle(tab.webview.getTitle());
} catch (e) {}
}

async function showSnackbar(text='', items=[], buttons=[], callback=console.log) {
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

  snackbar.webContents.once('dom-ready', async e => {
    snackbar.webContents.send('permission-request', text, items, buttons);

    ipcMain.once('permission-reply', (event, reply) => {
      $('#search').removeClass('search-active');
      snackbar.close();
      callback(reply);

      remote.getCurrentWindow().focus();
      remote.getCurrentWindow().focus();
    });
  });

  snackbar.loadURL(require('url').format({
    pathname: join(__dirname, 'pages/dialogs/snackbar.html'),
    protocol: 'file:',
    slashes: true
  }));

  $('#search').addClass('search-active');
}

async function hideSnackbar() {
$('#snackbar').css('display', 'none');
}


async function loadFlags() {
  store.get('flags').forEach(function (flag) {
		console.log('Added flag: ' + flag);
		app.commandLine.appendSwitch(flag);
	});
}

let siteInfo;
async function toggleSiteInfo() {
  if(!siteInfo) {
    $('#search').addClass('search-active');
    siteInfo = new BrowserWindow({
      frame: false,
      transparent: true,
      width: 320,
      height: 330,
      x: $('#search')[0].offsetLeft,
      y: 67,
      parent: remote.getCurrentWindow(),
      webPreferences: {
        nodeIntegration: true,
        enableRemoteModule: true
      }
    });

    siteInfo.loadURL(require('url').format({
      pathname: join(__dirname, 'pages/dialogs/info.html'),
      protocol: 'file:',
      slashes: true
    }));

    siteInfo.on('blur', e => {
      siteInfo.close();
      siteInfo = null; $('#search').removeClass('search-active');
      remote.getCurrentWindow().focus();
      remote.getCurrentWindow().focus();
    });

    siteInfo.on('close', e => {
      siteInfo = null; $('#search').removeClass('search-active');
      remote.getCurrentWindow().focus();
      remote.getCurrentWindow().focus();
    });

    let url = new URL(tabs.current().webContents.getURL());

    let perms = store.get('permissions')[url.hostname];

    siteInfo.webContents.once('dom-ready', async e => {
      cookies().then(c => { siteInfo.webContents.send('cookies', c.length) }).catch(console.error);

      if(!perms) return;

      Object.keys(perms).forEach((item, index) => {
        let allowed = perms[item] ? 'Allow' : 'Block';

        siteInfo.webContents.send('perm', `
          <li id='info-perm'>
            <img src='../../images/earth.svg' id='perm-icon'>
            <p id='perm-text'>${item}</p>
            <button id='perm-allow'>${allowed}</button>
          </li>
        `);
      });
    });
  }
}

async function savePermission(site, permission, allowed) {
  let perms = store.get('permissions');
  if(!perms[site]) { perms[site] = {}; }
  perms[site][permission] = allowed;

  store.set('permissions', perms);
}

async function cookies(contents, site) {
contents = contents || tabs.current().webContents;
site = site || contents.getURL();
return contents.session.cookies.get({ url: site });
}

ipcMain.on('viewAdded', async e => {
  enableAdBlocking();
  tabs.current().webContents.session.setPermissionRequestHandler(handlePermission);
});

async function handlePermission (webContents, permission, callback, details) {
  if (details.mediaTypes) {
    let mediaType = (details.mediaTypes[0] == 'audio') ? 'microphone' : 'camera';
  }
  if (permission == 'geolocation') permission = 'location';
  if (permission == 'midiSysex') permission = 'midi';

  let allowedPerms = ['fullscreen', 'pointerLock'];
  if(!allowedPerms.includes(permission)) {
    let url = (new URL(webContents.getURL())).hostname;

    let perms = store.get('permissions');

    let checked;
    try { checked = perms[url][permission] } catch (e) { checked = undefined }

    if(checked == undefined || checked == null) {
      showSnackbar(`${url} wants to`, [permission], ['Allow', 'Block'], function (response) {
        if(response === 'Allow') {
          callback(true);
          savePermission(url, permission, true);
        } else {
          callback(false);
          savePermission(url, permission, false);
        }
      });
    } else {
      callback(checked);
    }
  } else {
    callback(true);
  }
}

function validURL(str) {
var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
  '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
  '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
  '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
return !!pattern.test(str);
}

/*tabs.added(async (tab) => {
initWebView(tab);

onetime(tab.webview, 'dom-ready', async (e) => {
  let contents = web.webContents(tab.webview);
  let tabSession = contents.session;

  tabSession.setPermissionRequestHandler(handlePermission);

  tabSession.webRequest.onBeforeSendHeaders(async (details, callback) => {
    let headers = details.requestHeaders;
    headers['DNT'] = '1';
    headers['User-Agent'] = userAgent;
    callback({ cancel: false, requestHeaders: headers });
  });

  // tabSession.webRequest.onErrorOccurred(async (details) => {
  //   if(details.error != "net::ERR_BLOCKED_BY_CLIENT") console.log(details);
  // });

	tabSession.protocol.registerFileProtocol('peacock', (req, cb) => {
		var url = new URL(req.url);
		if(url.hostname == 'network-error') {
			cb({ path: join(__dirname, '/pages/', `network-error.html`) });
		} else {
			url = req.url.replace(url.protocol, '');
			cb({ path: join(__dirname, '/pages/', `${ url }.html`) });
		}
  }, (error) => {});

  tabSession.cookies.on('changed', async (e, cookie, cause, rem) => {
    if(!rem) {
      let split = cookie.domain.split('.');
      let domain = split[split.length - 2] + '.' + split[split.length - 1];
      split = (new URL(contents.getURL())).host.split('.');
      let host = split[split.length - 2] + '.' + split[split.length - 1];
      if(domain != host) {
        tabSession.cookies.remove(contents.getURL(), cookie.name);
      }
    }
  });

  enableAdBlocking(tabSession);
});

tab.ready = 0;
tab.on('icon-changed', (image, tabby) => {
  let icon = tab.tabElements.icon;
  icon.children[0].addEventListener('error', async () => {
    icon.innerHTML = `<div class="earth"><svg viewBox="0 0 24 24">
      <path fill="currentcolor" d="M17.9,17.39C17.64,16.59 16.89,16 16,16H15V13A1,1 0 0,0 14,12H8V10H10A1,1 0 0,0 11,9V7H13A2,2
      0 0,0 15,5V4.59C17.93,5.77 20,8.64 20,12C20,14.08 19.2,15.97 17.9,17.39M11,19.93C7.05,19.44 4,16.08 4,12C4,11.38 4.08,
      10.78 4.21,10.21L9,15V16A2,2 0 0,0 11,18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
      </svg></div>`;
  });
});
});

tabs.removed(async (tab, tabContainer) => {
if(tabs.length() === 0) { remote.app.quit(); }
});*/

$('#shield').click(toggleAdblock);
$('#back').click(async (e) => { keyboardShortcut('backPage') });
$('#forward').click(async (e) => { keyboardShortcut('forwardPage') });
$('#refresh').mousedown(async (e) => {
switch(e.which)
{
  case 1:
    if($('#refresh').children().first().attr('src') == 'images/refresh.svg') {
      tabs.current().webContents.reload()
    } else {
      tabs.current().webContents.stop();
    }
  break;
  case 2:
    let url = tabs.current().webContents.getURL();
    tabs.newView(url);
  break;
  case 3:
    //right Click
  break;
}
return true;// to allow the browser to know that we handled it.
});

new ResizeObserver(async () => {
$('#autocomplete').css('left', $('#url')[0].offsetLeft);
$('#autocomplete').width($('#url').width() + 55);
}).observe($('#url')[0]);

$('#url').on('input', function() {
  let value = $(this).val().toLowerCase();

  if(value == '') { hideAutocomplete(); return; }

  var options = {
    url: `https://ac.duckduckgo.com/ac/?t=peacock&type=list&q=${value}`,
    headers: { 'User-Agent': userAgent }
  };

  require('request').get(options, function (error, response, body) {
    if(error) { console.error(error); return; }

    let results = JSON.parse(body)[1];
    //if(!results || results.length == 0) { hideAutocomplete(); return; }

    if(results[0] != value) results.unshift(value);
    results = results.slice(0, 6);

    $('#autocomplete').empty();

    results.forEach(async (item, index) => {
      var div = document.createElement('div');
      //let fixed = item.replace(value.replace(/\s/g, ''), '</b>' + value.replace(/\s/g, '') + '<b>');

      let img = document.createElement('img');
      if(validURL(item)) {
        img.src = `https://www.google.com/s2/favicons?domain=${item}`;
        $(img).css('filter', 'invert(0)');
        $(img).css('opacity', '1');

        img.addEventListener('error', async () => {
          img.src = 'images/earth.svg';
          $(img).css('filter', 'invert(1)');
          $(img).css('opacity', '0.2');
        });
      } else {
        img.src = 'images/search.svg';
      }

      $(div).html(item);
      $(div).prepend(img);

      $(div).hover(async function() {
        $('.selected').removeClass('selected');
        $(this).addClass('selected');
      }, async function() {
        $(this).removeClass('selected');
        $('#autocomplete > div').first().addClass('selected');
      });

      $(div).click(async function() {
        loadPage($(div).text());
      });

      $('#autocomplete').append(div);
    });

    showAutocomplete();
  });
});

function showAutocomplete() {
  // $('#autocomplete').css('display', 'block');
  // $('#autocomplete > div').first().addClass('selected');

  getSearchEngine(async (engine) => {
    let icon = new URL(engine.url).origin + '/favicon.ico';

    $('#search').css('filter', 'invert(0)');
    $('#search').attr('src', icon);
    $('#search').css('filter', 'invert(0)');
  });
}

function hideAutocomplete() {
  $('#autocomplete').empty();
  $('#autocomplete').css('display', 'none');

  web.setSearchIcon(tabs.current().webContents.getURL());
}

$('#url').keypress(async (e) => {
if (e.which == 13) {
  if($('.selected').is(':first-child') || !$('#autocomplete').is(":visible")) {
    loadPage($('#url').val());
  } else {
    loadPage($('.selected').text());
  }
  $('#url').blur();
}
});

$('#url').keydown(async (e) => {
if($('.selected').length == 1) {
  let selected = $('.selected');
  if(e.which == 38) {
    if($('.selected') == $('#autocomplete').children().first()) return;
    selected.removeClass('selected');
    selected.prev().addClass('selected');
  } else if (e.which == 40) {
    if($('.selected') == $('#autocomplete').children().last()) return;
    selected.removeClass('selected');
    selected.next().addClass('selected');
  }
}
})

getSearchEngine(async (e) => {
  $('#url').attr('placeholder', `Search ${e.name} or type a URL`);
  $('#url').attr('data-placeholder', `Search ${e.name} or type a URL`);
});

$('#url').focus(async (e) => {
$('#url').attr('placeholder', '');
$('#url').addClass('url-hover');
$('#url').css('border', '2px solid #736d4f');
});

$('#url').blur(async (e) => {
  $('#url').css('border', '');
  $('#url').removeClass('url-hover');
  $('#url').attr('placeholder', $('#url').attr('data-placeholder'));
  setTimeout(function () {
    $('#url').css('border-radius','4px');
    $('#url').css('margin', '-3px 10px 0px 10px');
    $('#url').css('height', '28px');
    hideAutocomplete();
  }, 75);
});
$('#star').click(async (e) => {
let url = tabs.current().webContents.getURL();
let title = tabs.current().webContents.getTitle();

storage.isBookmarked(url).then((isBookmarked) => {
  if(isBookmarked) {
    $('#star').attr('src', 'images/bookmark.svg');
    storage.removeBookmark(url);
  } else {
    $('#star').attr('src', 'images/bookmark-saved.svg');
    storage.addBookmark(url, title);
  }
});
});
$('#pip').click(async (e) => {
tabs.current().webContents.executeJavaScript(`
  if(!!document.pictureInPictureElement){ // Is PiP
    document.exitPictureInPicture();
  } else { // Not PiP
    document.getElementsByTagName('video')[0].requestPictureInPicture();
  }
`, true).then((result) => {console.log(result);});
})

async function initCertDialog() {
let bg = (window.theme == 'dark') ? '#292A2D' : '#FFFFFF';
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
  icon: join(__dirname, 'images/peacock.ico')
});

certDialog.on('page-title-updated', async () => { certDialog.show(); });
}

async function showCertificateDialog (certificate) {
  certificate.bg = (window.theme == 'dark') ? '#292A2D' : '#FFFFFF';

  let params = encodeURIComponent(JSON.stringify(certificate));

  let { format } = require('url');
  certDialog.loadURL(format({
    pathname: join(__dirname, 'pages/dialogs/certificate.html'),
    protocol: 'file:',
    slashes: true
  }) + '?' + params);
}

$('#search').click(async (e) => {
  // if($('#search').attr('src') == 'images/lock.svg') {
    // cookies().then((c) => { $('#cookies label').text('(' + c.length + ' in use)') })
    //   .catch(console.error);
    toggleSiteInfo();
  // }
});

$('#info-header h4').click(async (e) => {
  toggleSiteInfo();
  tabs.newView('https://support.google.com/chrome/answer/95617');
});

$('#star').on('mouseover mouseout', function(e) {
  $(this).toggleClass('star-hover', e.type === 'mouseover');
  e.stopPropagation();
});

$('#omnibox > #url').on('mouseover mouseout', function(e) {
  $(this).toggleClass('url-hover', e.type === 'mouseover');
  e.stopPropagation();
});

$('#find a').click(function() {  $(this).toggleClass('down');  });
$('#close-find').click(function() {  findInPage();  });

var options = {
url: 'https://api.github.com/repos/Codiscite/peacock/releases',
headers: { 'User-Agent': userAgent }
};
require('request').get(options, async function (error, response, body) {
  if (error) console.error(error);

  let newestVersion = JSON.parse(body)[0].tag_name.split('.').join('').replace('v', '').substr(0, 3);
  let currentVersion = version.split('.').join('').replace('v', '').substr(0, 3);
  if (Number(newestVersion) > Number(currentVersion)) {
    const { dialog } = remote;

    const optionso = {
      type: 'question',
      buttons: ['Cancel', 'Update', 'No, thanks'],
      defaultId: 2,
      title: 'Peacock',
      message: 'Update available!',
      detail: JSON.parse(body)[0].tag_name + ' > ' + version,
      checkboxLabel: 'Do Not Show Again',
      checkboxChecked: false,
    };

    dialog.showMessageBox(null, optionso).then(data => {
      if(data.response === 1){
        tabs.newView('https://github.com/Codiscite/peacock/releases/latest');
      }
      console.log(data.checkboxChecked);
    });
  } else {
    console.log(`Using newest version! v${version}`);
  }
}, 'jsonp');

/*let firstTab;
if(remote.process.argv.length > 2) {
  let arg = remote.process.argv[2];
  arg = (arg.startsWith('http') || arg.startsWith('peacock')) ? arg : 'https://' + arg;
  firstTab = tabs.new('New Tab', arg);
} else {
  firstTab = tabs.new('New Tab', 'about:blank');
  let tab = firstTab;
  onetime(tab.webview, 'dom-ready', async (e) => {
    let contents = web.webContents(tab.webview);
    let tabSession = contents.session;

    tabSession.setPermissionRequestHandler(handlePermission);

    tabSession.webRequest.onBeforeSendHeaders(async (details, callback) => {
      let headers = details.requestHeaders;
      headers['DNT'] = '1';
      headers['User-Agent'] = userAgent;
      callback({ cancel: false, requestHeaders: headers });
    });

    // tabSession.webRequest.onErrorOccurred(async (details) => {
    //   if(details.error != "net::ERR_BLOCKED_BY_CLIENT") console.log(details);
    // });

  	tabSession.protocol.registerFileProtocol('peacock', (req, cb) => {
  		var url = new URL(req.url);
  		if(url.hostname == 'network-error') {
  			cb({ path: join(__dirname, '/pages/', `network-error.html`) });
  		} else {
  			url = req.url.replace(url.protocol, '');
  			cb({ path: join(__dirname, '/pages/', `${ url }.html`) });
  		}
    }, (error) => {});

    tabSession.cookies.on('changed', async (e, cookie, cause, rem) => {
      if(!rem) {
        let split = cookie.domain.split('.');
        let domain = split[split.length - 2] + '.' + split[split.length - 1];
        split = (new URL(contents.getURL())).host.split('.');
        let host = split[split.length - 2] + '.' + split[split.length - 1];
        if(domain != host) {
          tabSession.cookies.remove(contents.getURL(), cookie.name);
        }
      }
    });

    tab.webview.loadURL('peacock://newtab');
  });
}
web.changeTab(firstTab, store);*/

initCertDialog();
initAlert();

loadFlags();

remote.getCurrentWindow().on('closed', async e => {
  remote.getCurrentWindow().getChildWindows().forEach(win => { win.close() });
});

const menuTemplate = [
		{
			label: 'Window',
			submenu: [
				{
					label: 'Open DevTools',
					accelerator: 'CmdOrCtrl+Alt+I',
					click: async () => {
						remote.getCurrentWindow().openDevTools({ mode: 'detach' });
					}
				},
				{
					label: 'Restart Peacock',
					accelerator: 'CmdOrCtrl+Alt+R',
					click: async () => {
						app.relaunch();
						app.exit(0);
					}
				},
				{
					label: 'Focus Searchbar',
					accelerator: 'CmdOrCtrl+E',
					click: async () => {
						keyboardShortcut('focusSearchbar');
					}
				},
				{
					label: 'Focus Searchbar',
					accelerator: 'CmdOrCtrl+L',
					click: async () => {
						keyboardShortcut('focusSearchbar');
					}
				},
				{
					label: 'Toggle Customization Mode',
					accelerator: 'CmdOrCtrl+Alt+C',
					click: async () => {
						keyboardShortcut('toggleCustomization');
					}
				}
			]
		},
		{
			label: 'Website',
			submenu: [
				{
					label: 'Open DevTools',
					accelerator: 'CmdOrCtrl+Shift+I',
					click: async () => {
						keyboardShortcut('devTools');
					}
				},
				{
					label: 'Zoom In',
					accelerator: 'CmdOrCtrl+=',
					click: async () => {
						keyboardShortcut('zoomIn');
					}
				},
				{
					label: 'Zoom Out',
					accelerator: 'CmdOrCtrl+-',
					click: async () => {
						keyboardShortcut('zoomOut');
					}
				},
				{
					label: 'Reset Zoom',
					accelerator: 'CmdOrCtrl+Shift+-',
					click: async () => {
						keyboardShortcut('resetZoom');
					}
				},
				{
					label: 'Back',
					accelerator: 'Alt+Left',
					click: async () => {
						keyboardShortcut('backPage');
					}
				},
				{
					label: 'Forward',
					accelerator: 'Alt+Right',
					click: async () => {
						keyboardShortcut('forwardPage');
					}
				},
				{
					label: 'Reload Page',
					accelerator: 'F5',
					click: async () => {
						keyboardShortcut('refreshPage');
					}
				},
        {
					label: 'Reload Page',
					accelerator: 'CmdOrCtrl+R',
					click: async () => {
						keyboardShortcut('refreshPage');
					}
				},
				{
					label: 'Force Reload Page',
					accelerator: 'CmdOrCtrl+F5',
					click: async () => {
						keyboardShortcut('forceReload');
					}
				},
				{
					label: 'Find in Page',
					accelerator: 'CmdOrCtrl+F',
					click: async () => {
						keyboardShortcut('findInPage');
					}
				},
				{
					label: 'Save as...',
					accelerator: 'CmdOrCtrl+S',
					click: async () => {
						keyboardShortcut('savePage');
					}
				},
				{
					label: 'Scroll To Top',
					accelerator: 'CmdOrCtrl+Up',
					click: async () => {
						keyboardShortcut('scrollToTop');
					}
				}
			]
		},
		{
			label: 'Tabs',
			submenu: [
				{
					label: 'Next Tab',
					accelerator: 'CmdOrCtrl+Tab',
					click: async () => {
						keyboardShortcut('nextTab');
					}
				},
				{
					label: 'Previous Tab',
					accelerator: 'CmdOrCtrl+Shift+Tab',
					click: async () => {
						keyboardShortcut('backTab');
					}
				},
				{
					label: 'New Tab',
					accelerator: 'CmdOrCtrl+T',
					click: async () => {
						keyboardShortcut('newTab');
					}
				},
				{
					label: 'Close Tab',
					accelerator: 'CmdOrCtrl+W',
					click: async () => {
						keyboardShortcut('closeTab');
					}
				},
				{
					label: 'Open Closed Tab',
					accelerator: 'CmdOrCtrl+Shift+T',
					click: async () => {
						keyboardShortcut('openClosedTab');
					}
				}
			]
		}
];

Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

/*require('electron-context-menu')({
  window: remote.getCurrentWebContents(),
  prepend: (defaultActions, params, browserWindow) => [
    {
      label: 'New Tabs',
      accelerator: 'Alt+Left',
      visible: params.selectionText.length == 0,
      enabled: view.webContents.canGoBack(),
      click: async () => { view.webContents.goBack(); }
    }
  ],
  showLookUpSelection: true,
  showCopyImageAddress: true,
  showSaveImageAs: true,
  showInspectElement: true
});*/

const server = require('child_process').fork(__dirname + '/js/server.js');

// Quit server process if main app will quit
app.on('will-quit', async () => {
	server.send('quit');
});

server.on('message', async (m) => {
	let { decodeToken } = require('blockstack');
	const token = decodeToken(m.authResponse);

  console.log('blockstack','signed in');
  if (blockchain.getUserSession().isUserSignedIn()) {
    if(!blockstackTab) return;
    tabs.close(blockstackTab);
    blockstackTab = null;
  } else {
    blockchain.getUserSession().handlePendingSignIn(m.authResponse);
    if(!blockstackTab) return;
    tabs.close(blockstackTab);
    blockstackTab = null;
  }
});

tabs.newView();
