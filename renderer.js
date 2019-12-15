// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const jsonfile = require('jsonfile');

require('v8-compile-cache');

const { ipcRenderer, remote, webFrame } = require('electron');
const { BrowserWindow } = remote;

const { join, normalize } = require('path');

const bookmarks = join(__dirname, 'data/bookmarks.json');
const settingsFile = join(__dirname, 'data/settings.json');
const search_engines = join(__dirname, 'data/search_engines.json');
const blocked = join(__dirname, 'data/blocked.json');

const tabs = require('./js/tabs.js');
const web = require('./js/web.js');
web.setDocument(document);
// const extensions = require('./js/extensions.js').setup();
const extensions = null;

const blockchain = require('./js/blockchain.js');
const store = require('./js/store.js');

const { version } = require('./package.json');

//Discord Rich Presence
try {
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
    .catch(console.log('Discord not open.'));
} catch (e) {
  console.log('Discord not open.');
}
//Discord Rich Presence

exports.getTabCount = function() {
  return tabGroup.getTabs().length;
}

remote.app.on('session-created', async (newSession) => {
	newSession.setPermissionRequestHandler(async (webContents, permission, callback) => {
    let url = new URL(webContents.getURL());
    toggleSnackbar('Allow <b>' + url.hostname + '</b> to access <b>' + permission + '</b>?', 100, ['YES', 'NO'], function (response) {
			if(response === 'YES') {
				callback(true);
			} else {
				callback(false);
			}
    }, false);
  });
});

window.theme = 'light';
window.darkMode = false;

var dialogo = $('#dialog'),
  etabsGroup = $('#etabs-tabgroup'),
  etabsViews = $('#etabs-views');

var tabGroup = tabs.makeTabGroup('DuckDuckGo', 'https://duckduckgo.com/');
tabs.new('DuckDuckGo', 'https://duckduckgo.com/');

require('dragula')([$('nav')]);

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
      if (tabGroup.getTabs().length === 1) {
        // Do nothing
      } else if (tabs.current().id === tabGroup.getTabs().length - 1) {
        tabGroup.getTab(0).activate();
      } else {
        tabGroup.getTab(tabs.current().id + 1).activate();
      }

      break;
    case 'backTab':
      if (tabGroup.getTabs().length === 1) {
        // Do nothing
      } else if (tabs.current().id === 0) {
        // If First Tab
        tabGroup.getTab(tabGroup.getTabs().length - 1).activate(); // Activate Last Tab
      } else {
        // If Not First Tab
        tabGroup.getTab(tabs.current().id - 1).activate(); // Activate Previous Tab
      }
      break;
    case 'newTab':
      tabs.new('DuckDuckGo', 'https://duckduckgo.com/');
      break;
    case 'closeTab':
      // id = tabs.current().id;
      // tabGroup.getTab(id).close();
      tabs.close(tabs.current());
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
    case 'refreshPage':
      tabs.current().webview.reload();
      break;
    case 'forceReload':
      tabs.current().webview.reloadIgnoringCache();
      break;
    case 'getMetrics':
      //console.log(remote.app.getAppMetrics());
      toggleSnackbar('Allow <b>duckduckgo.com</b> to access <b>location</b>?', 100, ['YES', 'NO']);
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

var settings;
async function loadTheme() {
  jsonfile.readFile(settingsFile, async function(err, obj) {
    if (err) console.error(err);
    let themeObj = obj.theme.toLowerCase();
    let newTheme = themeObj;

    if(window.darkMode && themeObj == 'default') newTheme = 'dark';

    if (window.theme != newTheme) {
      console.time('Theme load time');
      if (themeObj === 'light') {
        window.theme = 'light';

  			if($('head link[href*="css/themes"]').length > 0){
  				$('head link[href*="css/themes"]').remove();
  			}
      } else if (themeObj === 'default') {
        if (window.darkMode) {
          // If Dark Mode
          window.theme = 'dark';
          $('link[href="css/themes/dark.css"]').remove();
          $('head').append('<link rel="stylesheet" href="css/themes/dark.css">');
        } else {
          // If Light Mode
          window.theme = 'light';
          if($('head link[href*="css/themes"]').length > 0){
    				$('head link[href*="css/themes"]').remove();
    			}
        }
      } else {
        window.theme = 'dark';
        $('link[href="css/themes/' + themeObj + '.css"]').remove();
        $('head').append('<link rel="stylesheet" href="css/themes/' + themeObj + '.css">');
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
  ipcRenderer.send('adblock-change', 'adblock:' + toWhat);

  if (window.theme === 'dark') {
    $('#shieldIMG').attr('src', 'images/loading-dark.gif');
  } else {
    $('#shieldIMG').attr('src', 'images/loading-light.gif');
  }

  setTimeout(async function() {
    tabs.current().webview.reload();
    if (toWhat === 'on') {
      $('#shieldIMG').attr('src', 'images/Peacock Shield.svg');
    } else if (toWhat === 'off') {
      $('#shieldIMG').attr('src', 'images/Peacock Shield Empty.svg');
    } else {
      console.error('Adblocker not working.');
      console.error('Adblocker not working.');
    }
  }, 3000);
}

async function toggleAdblock() {
  let src = $('#shieldIMG').attr('src').replace(/\%20/g, ' ').replace('file:///', '').replace(/\//g, '\\').replace(__dirname, '');
  if (
    src === 'images/Peacock Shield.svg' ||
    src === 'images\\Peacock Shield.svg'
  ) {
    //If On
    changeAdBlock('off');
  } else if (
    src === 'images/Peacock Shield Empty.svg' ||
    src === 'images\\Peacock Shield Empty.svg'
  ) {
    //If Off
    changeAdBlock('on');
  } else {
    console.log(src + ' | ' + __dirname);
  }
}

async function loadPage(val) {
  $('#url').blur();

  try {
    new URL(val);
    tabs.current().webview.loadURL(val);
  } catch (e) {
    if (val.includes('.') && !val.includes(' ')) {
      tabs.current().webview.loadURL('https://' + val);
    } else if (val.includes('://') || val.startsWith('data:') || val.startsWith('localhost:') && !val.includes(' ')) {
      tabs.current().webview.loadURL(val);
    } else {
      getSearchEnginePrefix(async function(prefix) {
        tabs.current().webview.loadURL(prefix + val);
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

  let address = tab.webview.src;
  if(address.startsWith('http')) store.logHistory(address, tab.webview.getTitle());

  let src = new URL(address);
  if(src.protocol == 'http:' || src.protocol == 'https:') {
    $('#url').val(address.substr(src.protocol.length + 2));
  } else {
    $('#url').val(address);
  }

  let fav = `https://www.google.com/s2/favicons?domain=${src.origin}`;
  tab.setIcon(fav);

  if(tab.initialized === undefined || tab.initialized === false) {
    $('#url').focus();
    $('#url').select();
    tab.initialized = true;
  }
}

async function initWebView(tab) {
  if(!tab) tab = tabs.current();

  tab.webview.addEventListener('did-start-loading', async (e) => { web.loadStart(tab, extensions) });
  tab.webview.addEventListener('did-stop-loading', async (e) => { web.loadStop(tab, extensions) });
  tab.webview.addEventListener('did-finish-load', async (e) => { finishLoad(e, tab) });
  tab.webview.addEventListener('did-fail-load', async (e) => { web.failLoad(e, tab.webview) });
  tab.webview.addEventListener('enter-html-full-screen', async (e) => { web.enterFllscrn() });
  tab.webview.addEventListener('leave-html-full-screen', async (e) => { web.leaveFllscrn() });
  tab.webview.addEventListener('update-target-url', async (e) => { web.updateTargetURL(e) });
  tab.webview.addEventListener('dom-ready', async (e) => { web.domReady(tab.webview, store) });
  tab.webview.addEventListener('new-window', async (e) => { web.newWindow(e, true, tabs) });
  tab.webview.addEventListener('page-favicon-updated', async (e) => { web.faviconUpdated(tab) });
  tab.webview.addEventListener('page-title-updated', async (e) => { web.titleUpdated(e, tab) });
  tab.webview.addEventListener('did-change-theme-color', async (e) => { web.changeThemeColor(e) });
  tab.webview.addEventListener('did-navigate', async (e) => { web.didNavigate(e.url) });
  tab.webview.addEventListener('did-navigate-in-page', async (e) => { web.didNavigate(e.url) });
  tab.webview.addEventListener('ipc-message', async (e) => {
    if(e.channel = 'flags.js') {
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
    }
  });
  tab.webview.addEventListener('found-in-page', async (e) => {
    $('#matches').text(e.result.activeMatchOrdinal.toString() + ' of ' + e.result.matches.toString() + ' matches');
  });
}

async function toggleSnackbar(text='', duration=100, buttons=[], callback=console.log, timeout=true) {
  if($('#snackbar').css('opacity') == 0) { // If Snackbar closed.

    $('#snackbar').empty();
    $('#snackbar').append('<p>' + text + '</p>');

    if(buttons != []){
      buttons.forEach((button, index) => {
        $('#snackbar').append('<div>' + button + '</div>');
        $('#snackbar div:last').click(() => {
          callback(button);
          $('#snackbar')
            .css('top', '15px')
            .css('display', 'flex')
            .css('opacity', 1)
            .animate(
              { opacity: 0, top: '5px', display: 'none' },
              { queue: false, duration: duration }
            );
        });
      });
    }

    $('#snackbar')
      .css('top', '5px')
      .css('opacity', 0)
      .animate(
        { opacity: 1, top: '15px' },
        { queue: false, duration: duration }
      );

    if(timeout){
      setTimeout(function () {
        if($('#snackbar').css('opacity') != 0) { // If Snackbar closed.
          $('#snackbar')
            .css('top', '15px')
            .css('display', 'none')
            .css('opacity', 1)
            .animate(
            { opacity: 0, top: '5px' },
            { queue: false, duration: duration, display: 'flex' }
          );
        }
      }, 3000);
    }
  } else { // If Snackbar open.
    $('#snackbar')
    .css('top', '15px')
    .css('display', 'flex')
    .css('opacity', 1)
    .animate(
      { opacity: 0, top: '5px', display: 'none' },
      { queue: false, duration: duration }
      );
  }
}

tabGroup.on('tab-added', async (tab, tabGroup) => {
  tab.activate();
  initWebView(tab);
});

tabGroup.on('tab-removed', async (tab, tabContainer) => {
  if(tabGroup.getTabs().length === 0) { remote.app.quit(); }
});

tabGroup.on('tab-active', async (tab, tabGroup) => {
  let address = tab.webview.src;
  let src = new URL(address);
  let noProtocol = address.substr(src.protocol.length + 2);
  try {
    let address = tab.webview.src;
    let src = new URL(address);
    $('#url').val(noProtocol);
    tab.setTitle(tab.webview.getTitle());
  } catch (e) {
    setTimeout(async function () {
      $('#url').val(noProtocol);
      tab.setTitle(tab.webview.getTitle());
    }, 500);
  }

  tab.on('webview-ready', (tabSmall) => {
    let addr = tabSmall.webview.src;
    let noProt = addr.substr((new URL(addr)).protocol.length + 2);
  	$('#url').val(noProt);
    tabSmall.setTitle(tabSmall.webview.getTitle());
  });
});

$('#shield').click(toggleAdblock);
$('#back').click(async (e) => { tabs.current().webview.goBack() });
$('#forward').click(async (e) => { tabs.current().webview.goForward() });
$('#refresh').click(async (e) => {
  if(this.src == 'images/refresh.svg') {
    tabs.current().webview.reload()
  } else {
    tabs.current().webview.stop();
  }
});

require('autocompleter')({
  input: document.getElementById('url'),
  render: function(item, currentValue) {
    var div = document.createElement('div');
    div.textContent = item.phrase;

    let text = new RegExp('(' + currentValue + ')', 'ig');
    $(div).html($(div).text().replace(text, '<b>$1</b>'));

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
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Peacock/2.0.591 Chrome/78.0.3905.1 Electron/8.0.0 Safari/537.36'
      }
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
});

$('#browser').bind('DOMNodeInserted DOMNodeRemoved', async (e) => {
    if( $(e.target).hasClass('autocomplete') ) {
      if(e.type == 'DOMNodeInserted') {
        $('#url').css('border-radius','4px 4px 0px 0px');
        $('#url').css('margin', '-10.5px 10px 0px 10px');
        $('#url').css('height', '30px');
      } else {
        $('#url').css('border-radius','4px');
        $('#url').css('margin', '-5.5px 10px 0px 10px');
        $('#url').css('height', '20px');
      }
    }
});

$('#url').on('keypress', async (e) => {
  if (e.which == 13) {
    loadPage($('#url').val());
    $('#url').css('border-radius','4px');
    $('#url').css('margin', '-5.5px 10px 0px 10px');
    $('#url').css('height', '20px');
    $('.autocomplete').remove();
  }
});

$('#url').blur(async (e) => {
  $('#url').css('border-radius','4px');
  $('#url').css('margin', '-5.5px 10px 0px 10px');
  $('#url').css('height', '20px');
  $('.autocomplete').remove();
});
$('#star').click(async (e) => {
  let url = tabs.current().webview.src;
  let title = tabs.current().webview.getTitle();
  $('#star').attr('src', 'images/star_filled.svg');
  store.addBookmark(url, title);
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

initWebView();

var options = {
  url: 'https://api.github.com/repos/Codiscite/peacock/releases',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Peacock/2.0.591 Chrome/78.0.3905.1 Electron/8.0.0 Safari/537.36'
  }
};

require('request').get(options, async function (error, response, body) {
  if (error) console.error(error);

  let newestVersion = JSON.parse(body)[0].tag_name.split('.').join('').replace('v', '').substr(0, 3);
  let currentVersion = version.split('.').join('').replace('v', '').substr(0, 3);
  console.log(Number(newestVersion) + ' new left, current right ' + Number(currentVersion));
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
