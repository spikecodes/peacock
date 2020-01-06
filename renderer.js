// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const jsonfile = require('jsonfile');

require('v8-compile-cache');

const { ipcRenderer, remote, webFrame, nativeImage } = require('electron');
const { BrowserWindow, screen, dialog } = remote;

const { join, normalize } = require('path');

const bookmarks = join(__dirname, 'data/bookmarks.json');
const settingsFile = join(__dirname, 'data/settings.json');
const search_engines = join(__dirname, 'data/search_engines.json');
const blocked = join(__dirname, 'data/blocked.json');
const permissionsFile = join(__dirname, 'data/permissions.json');

const tabs = require('./js/tabs.js');
const web = require('./js/web.js');
web.setDocument(document);
// const extensions = require('./js/extensions.js').setup();
const extensions = null;

const blockchain = require('./js/blockchain.js');
const store = require('./js/store.js');

const { version } = require('./package.json');

var userAgent = remote.getCurrentWebContents().userAgent.split(' ');
// userAgent = userAgent.map(function (part) { return (part.startsWith('Peacock') || part.startsWith('Electron')) ? '' : part });
// userAgent = userAgent.join(' ').replace(/ +(?= )/g,'');
userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:73.0) Gecko/20100101 Firefox/73.0';

//Discord Rich Presence
try {
/*  const { Client } = require('discord-rpc');
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
  .catch(console.log('Discord not open.'));*/
} catch (e) {
console.log('Discord not open.');
}
//Discord Rich Presence

exports.getTabCount = function() {
return tabs.length();
}

window.theme = 'light';
window.darkMode = false;

tabs.makeTabGroup('New Tab', 'peacock://newtab');

var alertWin;
var settings;
var certDialog;

ipcRenderer.on('nativeTheme', async function(event, arg) {
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

ipcRenderer.on('ad-blocked', async function (event, ad) {
/*jsonfile.readFile(blocked, async function(err, obj) {
  if(err) {console.error(err); return;}

  var adRequest = { type: ad.type, url: ad.url, sourceHostname: ad.sourceHostname };

  console.log(adRequest);

  let result = obj;
  result.push(adRequest);
  jsonfile.writeFile(blocked, result, async function (err) {});
});*/
});

ipcRenderer.on('blockstackSignIn', async function(event, token) {
if (blockchain.getUserSession().isUserSignedIn()) {
  tabs.current().close();
} else {
  blockchain.getUserSession().handlePendingSignIn(token);
  tabs.current().close();
}
});

let nav;
let viewHeight = $('.etabs-views').height();
ipcRenderer.on('keyboardShortcut', async function(event, shortcut) {
let { startVPN, stopVPN } = require('./js/vpn.js');
switch (shortcut) {
  case 'settings':
    openSettings();
    break;
  case 'devTools':
    remote.webContents.fromId(tabs.current().webview.getWebContentsId()).toggleDevTools();
    break;
  case 'nextTab':
    if (tabs.length() === 1) {
      // Do nothing
    } else if (tabs.current().id === tabs.length() - 1) {
      tabs.get(0).activate();
    } else {
      tabs.get(tabs.current().id + 1).activate();
    }

    break;
  case 'backTab':
    if (tabs.length() === 1) {
      // Do nothing
    } else if (tabs.current().id === 0) {
      // If First Tab
      tabs.get(tabs.length() - 1).activate(); // Activate Last Tab
    } else {
      // If Not First Tab
      tabs.get(tabs.current().id - 1).activate(); // Activate Previous Tab
    }
    break;
  case 'newTab':
    tabs.new('DuckDuckGo', 'https://duckduckgo.com/');
    break;
  case 'closeTab':
    tabs.close();
    break;
  case 'openClosedTab':
    tabs.openClosedTab();
    break;
  case 'signIntoBlockstack':
    tabs.new('Blockstack', blockchain.signIntoBlockstack());
    break;
  case 'history':
    store.getHistory().then(console.log);
    break;
  case 'clearHistory':
    store.clearHistory();
    break;
  case 'startVPN':
    startVPN(join(__dirname, 'tor-win32-0.4.1.6/Tor/tor.exe'));
    break;
  case 'stopVPN':
    stopVPN();
    break;
  case 'zoomIn':
    tabs.current().webview.setZoomFactor(tabs.current().webview.getZoomFactor() + 0.1);
    break;
  case 'zoomOut':
    tabs.current().webview.setZoomFactor(tabs.current().webview.getZoomFactor() - 0.1);
    break;
  case 'resetZoom':
    webFrame.setZoomFactor(1.0);
    tabs.current().webview.setZoomFactor(1.0);
    break;
  case 'focusSearchbar':
    $('#url').focus();
    $('#url').select();
    break;
  case 'backPage':
    tabs.current().webview.goBack();
    break;
  case 'forwardPage':
    tabs.current().webview.goForward();
    break;
  case 'savePage':
    savePage(web.webContents(tabs.current().webview));
    break;
  case 'refreshPage':
    tabs.current().webview.reload();
    break;
  case 'forceReload':
    tabs.current().webview.reloadIgnoringCache();
    break;
  case 'getMetrics':
    //console.log(remote.app.getAppMetrics());
    showSnackbar('Allow <b>duckduckgo.com</b> to access <b>location</b>?', 100, ['YES', 'NO']);
    break;
  case 'toggleCustomization':
    if(!nav){ nav = require('dragula')([$('#navigation')], {}); }
    else { nav.destroy(); nav = undefined; }
    break;
  case 'findInPage':
    findInPage();
    break;
  default:
    break;
}
});

let popup;
ipcRenderer.on('focus', async function(event, args) { if(popup){ popup.close(); popup = null; } loadTheme(); });

ipcRenderer.on('loadPage', async function(event, args) { tabs.current().webview.loadURL(args); });

ipcRenderer.on('openPage', async function(event, args) { tabs.new('Loading...', args); });

async function onetime(node, type, callback) {
// create event
node.addEventListener(type, function(e) {
	// remove event
	e.target.removeEventListener(e.type, arguments.callee);
	// call handler
	return callback(e);
});
}

async function loadTheme() {
jsonfile.readFile(settingsFile, async function(err, obj) {
  if (err) console.error(err);
  let themeObj = obj.theme.toLowerCase();
  let newTheme = themeObj;

  if(window.darkMode && themeObj == 'default') newTheme = 'dark';

  let src = $('#shieldIMG').attr('src');

  if (window.theme != newTheme) {
    console.time('Theme load time');
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
    console.timeEnd('Theme load time');
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

    $('#find input').on('keypress', async (e) => {
      val = $('#find input').val();

      console.log;

      if (e.which == 13 && e.shiftKey) {
        if(val.length > 0){
          tabs.current().webview.findInPage(val, {
            findNext: true,
            forward: false,
            matchCase: $('#match-case').hasClass('down')
          });
        }
      } else if (e.which == 13) {
        if(val.length > 0){
          tabs.current().webview.findInPage(val, {
            findNext: true,
            matchCase: $('#match-case').hasClass('down')
          });
        }
      }
    });

    $('#find input').on('input', function () {
      val = $('#find input').val();
      if(val.length > 0) {
        tabs.current().webview.findInPage(val, {
          findNext: false,
          matchCase: $('#match-case').hasClass('down')
        });
      } else {
        try {
          tabs.current().webview.stopFindInPage('clearSelection');
        } catch (e) { }
        $('#matches').text('');
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
  let bg = (window.theme == 'dark') ? '#292A2D' : '#ffffff';
  let params = encodeURIComponent(JSON.stringify({ darkMode: (window.theme == 'dark') }));

	settings = new BrowserWindow({
		frame: false,
		minWidth: 700,
    minHeight: 550,
		titleBarStyle: 'hiddenInset',
		backgroundColor: bg,
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
	}) + '?' + params);

	settings.on('closed', async () => { settings = null; });
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
    nodeIntegration: true
  },
  alwaysOnTop: true,
  icon: join(__dirname, 'images/peacock.ico')
};

alertWin = new BrowserWindow(args);

alertWin.on('blur', async () => { alertWin.hide(); });
alertWin.on('page-title-updated', async () => { alertWin.show(); });
}

async function showAlert(input) {
  switch (input.type) {
    case 'alert':
      let defaultParams = { bg: window.theme };
      let params = encodeURIComponent(JSON.stringify({...input, ...defaultParams}));

      let address = require('url').format({
        pathname: join(__dirname, 'pages/alert.html'),
        protocol: 'file:',
        slashes: true
      }) + '?' + params;

      alertWin.loadURL(address);
      alerted = false;
      break;
    case 'message':
      $(document.body).prepend(`<center class="messageBox"><div class="message"><p>${input.message}</p></div></center>`);
      setTimeout(function () {
        $(document.body).children(":first").remove();
      }, input.duration);
      break;
    default:
      break;
  }
}

async function getSearchEngine(cb) {
jsonfile.readFile(settingsFile, async function(err, objecteroonie) {
  if (err) console.error(err);

  let searchEngine = objecteroonie.search_engine;

  jsonfile.readFile(search_engines, async function(err, obj) {
    for (var i = 0; i < obj.length; i++) {
      if (obj[i].name == searchEngine) {
        cb(obj[i]);
      }
    }
  });
});
}

async function changeAdBlock(toWhat) {
ipcRenderer.send('adblock-change', 'adblock:' + toWhat);

if (window.theme === 'dark') {
  $('#shieldIMG').attr('src', 'images/loading-dark.gif');
} else {
  $('#shieldIMG').attr('src', 'images/loading-light.gif');
}

setTimeout(async function() {
  tabs.current().webview.reload();
  if (toWhat === 'on') {
    if(window.theme === 'dark') {
      $('#shieldIMG').attr('src', 'images/Peacock Shield White.svg');
    } else {
      $('#shieldIMG').attr('src', 'images/Peacock Shield.svg');
    }
  } else if (toWhat === 'off') {
    if(window.theme === 'dark') {
      $('#shieldIMG').attr('src', 'images/Peacock Shield White Empty.svg');
    } else {
      $('#shieldIMG').attr('src', 'images/Peacock Shield Empty.svg');
    }
  } else {
    console.error('Adblocker not working.');
  }
}, 3000);
}

async function toggleAdblock() {
let src = $('#shieldIMG').attr('src');
if (sr.startsWith('images/Peacock Shield') && !src.endsWith('Empty.svg')) {
  //If On
  changeAdBlock('off');
} else if (src.endsWith('Empty.svg')) {
  //If Off
  changeAdBlock('on');
} else {
  console.log(src);
}
}

async function loadPage(val) {
$('#url').blur();

try {
  new URL(val);
  tabs.current().webview.loadURL(val);
} catch (e) {
  if (val.includes('.') && !val.includes(' ')) {
    $('#url').val(val);
    tabs.current().webview.loadURL('https://' + val);
  } else if (val.includes('://') || val.startsWith('data:') || val.startsWith('localhost:') && !val.includes(' ')) {
    $('#url').val(val);
    tabs.current().webview.loadURL(val);
  } else {
    getSearchEngine(async function(engine) {
      $('#url').val(engine.url + val);
      tabs.current().webview.loadURL(engine.url + val);
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

async function initWebView(tab) {
tab = tab || tabs.current();

tab.webview.addEventListener('did-start-loading', async (e) => { web.loadStart(tab, extensions) });
tab.webview.addEventListener('did-stop-loading', async (e) => { web.loadStop(tab, extensions) });
tab.webview.addEventListener('did-finish-load', async (e) => { finishLoad(e, tab) });
tab.webview.addEventListener('did-fail-load', async (e) => {web.failLoad(e, tab.webview); });
tab.webview.addEventListener('enter-html-full-screen', async (e) => { web.enterFllscrn() });
tab.webview.addEventListener('leave-html-full-screen', async (e) => { web.leaveFllscrn() });
tab.webview.addEventListener('update-target-url', async (e) => { web.updateTargetURL(e) });
tab.webview.addEventListener('dom-ready', async (e) => { web.domReady(tab, store) });
tab.webview.addEventListener('new-window', async (e) => { web.newWindow(e, true, tabs) });
tab.webview.addEventListener('page-favicon-updated', async (e) => { web.faviconUpdated(tab, e.favicons) });
tab.webview.addEventListener('page-title-updated', async (e) => { web.titleUpdated(e, tab) });
tab.webview.addEventListener('did-change-theme-color', async (e) => { web.changeThemeColor(e) });
tab.webview.addEventListener('did-navigate', async (e) => { web.didNavigate(e.url, tab.webview, store) });
tab.webview.addEventListener('did-navigate-in-page', async (e) => { web.didNavigate(e.url, tab.webview, store) });
tab.webview.addEventListener('found-in-page', async (e) => {
  $('#matches').text(e.result.activeMatchOrdinal.toString() + ' of ' + e.result.matches.toString() + ' matches');
});
tab.webview.addEventListener('ipc-message', async (e) => {
  switch (e.channel) {
    case 'flags.js':
      let flags = join(__dirname, 'data/flags.json');
      let fs = require('fs');
      jsonfile.readFile(flags, async function(err, json) {
        if(err) return console.error(err);

        if(e.args[0].value) {
          json[e.args[0].flag] = true;
        } else {
          delete json[e.args[0].flag];
        }

        jsonfile.writeFile(flags, json, async function (err) {});
      });
      break;
    case 'alert':
      showAlert(e.args[0]);
      break;
    case 'newTab':
      if(e.args[0] == 'focusSearchbar') {
        $('#url').val('');
        $('#url').focus();
        $('#url').select();
      } else if (e.args[0] == 'removeHistoryItem') {
        store.removeHistoryItem(e.args[1]);
      }
      else if(e.args[0] == 'settings') {
        console.log(e.args[1]);
      }
    default:
    break;
  }
  if(e.channel == 'flags.js') {

  }
});
}

async function showSnackbar(text='', items=[], duration=100, buttons=[], callback=console.log) {
$('#snackbar p').text(text);

$('#snackbar ul').empty();
if(items != []){
  items.forEach((item, index) => {
    $('#snackbar ul').append(`<li>Access your ${item}</li>`);
  });
}

$('#snackbar div').empty();
if(buttons != []){
  buttons.forEach((button, index) => {
    $('#snackbar div').append(`<button type="button" name="button">${button}</button>`);
    $('#snackbar div button:last').click(async () => {
      callback(button);
      $('#search').removeClass('search-active');
      $('#snackbar').css('display', 'none');
    });
  });
}

$('#snackbar button').click(async () => {
  callback('close');
  $('#search').removeClass('search-active');
  $('#snackbar').css('display', 'none');
});

$('#search').addClass('search-active');
$('#snackbar').css('display', 'block');
}

async function hideSnackbar() {
$('#snackbar').css('display', 'none');
}

async function toggleSiteInfo() {
if($('#site-info').is(":visible")) {
  $('#search').removeClass('search-active');
  $('#site-info').css('display', 'none');
} else {
  let url = new URL(tabs.current().webview.src);

  $('#info-permissions').empty();
  getPermissions(url.host).then((obj) => {
    if(!obj) return;
    console.log(obj);
    Object.keys(obj).forEach((item, index) => {
      let allowed = obj[item] ? 'Allow' : 'Block';

      $('#info-permissions').append(`
        <li id='info-perm'>
          <img src='images/earth.svg' id='perm-icon'>
          <p id='perm-text'>${item}</p>
          <button id='perm-allow'>${allowed}</button>
        </li>
      `);
    });
  });
  $('#search').addClass('search-active');
  $('#site-info').css('display', 'block');
}
}

async function getPermissions(site) {
let promisio = new Promise((resolve, reject) => {
  jsonfile.readFile(permissionsFile, function (err, obj) {
    if(err) { reject(err); }
    if(site && site != '') { resolve(obj[site]); }
    else { resolve(obj); }
  });
});
return promisio;
}

async function savePermission(site, permission, allowed) {
jsonfile.readFile(permissionsFile, async function(err, obj) {
  if(!obj[site]) { obj[site] = {}; }
  obj[site][permission] = allowed;
  jsonfile.writeFile(permissionsFile, obj, async function (err) {});
});
}

async function cookies(contents, site) {
contents = contents || web.webContents(tabs.current().webview);
site = site || contents.getURL();
return contents.session.cookies.get({ url: site });
}

async function savePage(contents) {
let filters = [
  { name: 'Webpage, Complete', extensions: ['htm', 'html'] },
  { name: 'Webpage, HTML Only', extensions: ['html', 'htm'] },
  { name: 'Webpage, Single File', extensions: ['mhtml'] }
];

let options = {
  title: 'Save as...',
  filters: filters
};

dialog.showSaveDialog(options).then((details) => {
  if(!details.cancelled){
    let path = details.filePath;
    let saveType;
    if(path.endsWith('htm')) saveType = 'HTMLComplete';
    if(path.endsWith('html')) saveType = 'HTMLOnly';
    if(path.endsWith('mhtml')) saveType = 'MHTML';

    contents.savePage(path, saveType).then(() => {
      console.log('Page was saved successfully.') }).catch(err => { console.error(err) });
  }
});
}

async function handlePermission (webContents, permission, callback, details) {
if (details.mediaTypes) {
  let mediaType = (details.mediaTypes[0] == 'audio') ? 'microphone' : 'camera';
}
if (permission == 'geolocation') permission = 'location';
if (permission == 'midiSysex') permission = 'midi';

let allowedPerms = ['fullscreen', 'pointerLock'];
if(!allowedPerms.includes(permission)) {
  let url = (new URL(webContents.getURL())).hostname;
  jsonfile.readFile(permissionsFile, async function(err, obj) {
    let checked;
    try { checked = obj[url][permission] } catch (e) { checked = undefined }

    if(checked == undefined || checked == null) {
      showSnackbar(`${url} wants to`, [permission], 100, ['Allow', 'Block'], function (response) {
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
  });
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

tabs.added(async (tab) => {
initWebView(tab);

onetime(tab.webview, 'dom-ready', async (e) => {
  let contents = web.webContents(tab.webview);
  let tabSession = contents.session;

  require('electron-context-menu')({
    window: contents,
    prepend: (defaultActions, params, browserWindow) => [
      {
        label: 'Back',
        accelerator: 'Alt+Left',
        visible: params.selectionText.length == 0,
        enabled: contents.canGoBack(),
        click: async () => { tabs.current().webview.goBack(); }
      },
      {
        label: 'Forward',
        accelerator: 'Alt+Right',
        visible: params.selectionText.length == 0,
        enabled: contents.canGoForward(),
        click: async () => { tabs.current().webview.goForward(); }
      },
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        visible: params.selectionText.length == 0,
        click: async () => { tabs.current().webview.reload(); }
      },
      {
        type: 'separator'
      },
      {
        label: 'Save as...',
        accelerator: 'CmdOrCtrl+S',
        visible: params.selectionText.length == 0,
        click: async () => { savePage(contents); }
      },
      {
        type: 'separator'
      },
      {
        label: 'View Image',
        visible: params.mediaType === 'image',
        click: async () => { tabs.current().webview.loadURL(params.srcURL); }
      },
      {
        label: 'Open Link in New Tab',
        visible: params.linkURL.length > 0,
        click: async () => { tabs.new('Loading...', params.linkURL); }
      },
      {
        label: 'Search Google for “{selection}”',
        visible: params.selectionText.trim().length > 0,
        click: async () => { tabs.current().webview.loadURL(`https://google.com/search?q=${encodeURIComponent(params.selectionText)}`); }
      }
    ],
    showLookUpSelection: true,
    showCopyImageAddress: true,
    showSaveImageAs: true,
    showInspectElement: true
  });

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
});

tabs.active(async (tab) => { web.changeTab(tab, store); });

$('#shield').click(toggleAdblock);
$('#back').click(async (e) => { tabs.current().webview.goBack() });
$('#forward').click(async (e) => { tabs.current().webview.goForward() });
$('#refresh').mousedown(async (e) => {
switch(e.which)
{
  case 1:
    if($('#refresh').children().first().attr('src') == 'images/refresh.svg') {
      tabs.current().webview.reload()
    } else {
      tabs.current().webview.stop();
    }
  break;
  case 2:
    let webby = tabs.current().webview;
    tabs.new(webby.getTitle(), webby.src, ()=>{}, true);
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

/*require('autocompleter')({
input: document.getElementById('url'),
render: function(item, currentValue) {
  var div = document.createElement('div');
  div.textContent = item.phrase;

  let text = new RegExp('(' + currentValue + ')', 'ig');
  $(div).html('<b>' + $(div).text().replace(text, '</b>$1<b>') + '</b>');

  $(div).hover(async function() {
      $('.selected').removeClass('selected');
      $(this).addClass('selected');
    }, async function() {
      $(this).removeClass('selected');
      $('.autocomplete > div').first().addClass('selected');
    });
  return div;
},
fetch: function(text, update) {
  var options = {
    url: `https://ac.duckduckgo.com/ac/?t=peacock&q=${text.toLowerCase()}`,
    headers: { 'User-Agent': userAgent }
  };

  require('request').get(options, function (error, response, body) {
    if(error) { console.error(error); update( [{'phrase': [text]}] ); return; }
    if(body.startsWith('<')) { update( [{'phrase': [text]}] ); return; }

    let results = JSON.parse(body);
    results.unshift({'phrase': [text]});
    update(results);
  });
},
onSelect: function(item, input) {
  if($('.autocomplete > div').first().hasClass('selected')){
    loadPage($('#url').val());
  } else {
    loadPage(item.phrase);
  }
}
});*/

function showAutocomplete() {
  $('#autocomplete').css('display', 'block');
  $('#autocomplete > div').first().addClass('selected');

  $('#url').css('border', '');
  $('#url').css('box-shadow', '0px 0px 27px -12px rgba(0, 0, 0, 0.75)');
  $('#url').css('background-color', '#3C4043');
  $('#url').css('border-radius','4px 4px 0px 0px');
  $('#url').css('margin', '-10.5px 10px 0px 10px');
  $('#url').css('height', '44px');

  getSearchEngine(async (engine) => {
    $('#search').css('filter', 'invert(0)');
    $('#search').attr('src', engine.icon);
  });
}

function hideAutocomplete() {
  $('#autocomplete').empty();
  $('#autocomplete').css('display', 'none');

  $('#url').css('box-shadow', '');
  $('#url').css('background-color', '');
  $('#url').css('border-radius','4px');
  $('#url').css('margin', '-5.5px 10px 0px 10px');
  $('#url').css('height', '34px');

  web.setSearchIcon(tabs.current().webview.src);
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
  $('#url').css('margin', '-5.5px 10px 0px 10px');
  $('#url').css('height', '34px');
  hideAutocomplete();
}, 75);
});
$('#star').click(async (e) => {
let url = tabs.current().webview.src;
let title = tabs.current().webview.getTitle();

store.isBookmarked(url).then((isBookmarked) => {
  if(isBookmarked) {
    $('#star').attr('src', 'images/bookmark.svg');
    store.removeBookmark(url);
  } else {
    $('#star').attr('src', 'images/bookmark-saved.svg');
    store.addBookmark(url, title);
  }
});
});
$('#settings').click(openSettings);
$('#pip').click(async (e) => {
remote.webContents.fromId(tabs.current().webview.getWebContentsId()).executeJavaScript(`
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
    nodeIntegration: true
  },
  show: false,
  icon: join(__dirname, 'images/peacock.ico')
});

certDialog.on('page-title-updated', async () => { certDialog.show(); });
}

async function showCertificateDialog (certificate) {
certificate.bg = (window.theme == 'dark') ? '#292A2D' : '#FFFFFF';

let params = encodeURIComponent(JSON.stringify(certificate));

let { format } = require('url');
certDialog.loadURL(format({
  pathname: join(__dirname, 'pages/certificate.html'),
  protocol: 'file:',
  slashes: true
}) + '?' + params);
}

$('#search').click(async (e) => {
if($('#search').attr('src') == 'images/lock.svg') {
  cookies().then((c) => { $('#cookies label').text('(' + c.length + ' in use)') })
    .catch(console.error);
  toggleSiteInfo();
}
});

$('#info-close').click(toggleSiteInfo);
$('#info-header h4').click(async (e) => {
toggleSiteInfo();
tabs.new('','https://support.google.com/chrome/answer/95617');
});
$('#cookies').click(async (e) => {
toggleSiteInfo();
cookies().then((cookies) => {
  console.log(cookies);
  showAlert({ type: 'message', message: cookies });
}).catch(console.error);
});
$('#certificate').click(async (e) => {
toggleSiteInfo();
let host = new URL(tabs.current().webview.src).host;

let https = require('https');
let options = {
  host: host,
  port: 443,
  method: 'GET'
};

let req = https.request(options, function(res) {
  let cert = res.connection.getPeerCertificate();
  showCertificateDialog(cert);
});

req.end();
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
      tabs.new('Peacock Download', 'https://github.com/Codiscite/peacock/releases/latest');
    }
    console.log(data.checkboxChecked);
  });
} else {
  console.log(`Using newest version! v${version}`);
}
}, 'jsonp');

let firstTab;
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
web.changeTab(firstTab, store);

initCertDialog();
initAlert();

remote.getCurrentWindow().on('closed', async () => {
  certDialog.close();
  alertWin.close();
  if(settings) settings.close();
});

/*extensions.forEach(function (item, index) {
let badge = $('#omnibox').after(item.badge).next();
badge.mousedown(function(event) {
  switch (event.which) {
    case 1:
      if(!item.hasAction) break;
      if(popup) { popup.focus(); break; }
      var viewportOffset = badge.get(0).getBoundingClientRect();

      var top = viewportOffset.top;
      var left = viewportOffset.left;

      popup = new BrowserWindow({
        title: item.action_title,
        frame: false,
        backgroundColor: '#FFF',
        webPreferences: {
          nodeIntegration: false,
          allowRunningInsecureContent: true
        },
        resizable: false,
        focusable: true,
        movable: false,
        skipTaskbar: true,
        width: 350,
        height: 275,
        x: left - 350 + badge.width(),
        y: top + 10 + badge.height(),
        icon: item.action_icon
      });

      popup.focus();
      popup.openDevTools({ mode: 'detach' });

      let { format } = require('url');
      popup.loadURL(format({
        pathname: item.action_popup,
        protocol: 'file:',
        slashes: true
      }));
      break;
    case 2:
      tabs.new('Options', 'file://' + item.options);
    case 3:
      tabs.current().webview.loadURL('file://' + item.options);
      break;
    default:
      console.log('You have a strange Mouse!');
  }
});
});
*/
