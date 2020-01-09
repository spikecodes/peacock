var tabGroup;
var closedTabs = [];

function closeTab(tab) {
  tab = tab || this.current();

  let it = tab.tab;

  closedTabs.push(tab.webview.src);

  $(it).css('transition', 'all 0.1s !important');
  $(it).fadeSlideLeft(100, async () => {
    setTimeout(async function () {
      tab.close();
      $(it).css('transition', 'all 0.0s !important');
    }, 200);
  });
}

$.fn.fadeSlideLeft = function(speed,fn) {
  return $(this).animate({
    'opacity' : 0,
    'width' : '0px'
  },speed || 400,function() {
    $.isFunction(fn) && fn.call(this);
  });
}

$.fn.fadeSlideRight = function(speed,fn) {
  return $(this).animate({
    'opacity' : 1,
    'width' : '262px'
  },speed || 400,function() {
    $.isFunction(fn) && fn.call(this);
  });
}

exports.openClosedTab = function () {
  if(closedTabs.length == 0) return;
  let item = closedTabs[closedTabs.length-1];
  this.new(item, item);
  closedTabs.pop(item);
}

exports.new = function (docTitle, url, callback=()=>{}, background=false) {
  let tab = tabGroup.addTab({
    title: docTitle,
    src: url,
    visible: true,
    active: !background,
    webviewAttributes: {
      partition: "persist:peacock",
      sandbox: true,
      preload: 'js/preload.js',
      disablewebsecurity: true
    },
    ready: function (tab) {
      $(tab.tabElements.buttons.firstElementChild).replaceWith($(tab.tabElements.buttons.firstElementChild).clone());
      $(tab.tabElements.buttons.firstElementChild).click(function() { closeTab(tab); });
      callback();
    }
  });

  let it = tab.tab;

  $(it).css('opacity', '0');
  $(it).css('width', '60px');
  $(it).css('transition', 'all 0.1s');
  $(it).fadeSlideRight(100);

  return tab;
}

exports.close = closeTab;

exports.current = function () {
  return tabGroup.getActiveTab();
}

exports.all = function () { return tabGroup.getTabs(); }

exports.get = function (index) { return tabGroup.getTab(index); }

exports.length = function () {
  return tabGroup.getTabs().length;
}

exports.makeTabGroup = function (newTab_title, newTab_url, callback=()=>{}) {
  const TabGroup = require("electron-tabs");
  let newTab = this.new;
  tabGroup = new TabGroup({
    ready: function(tabGroup) {
      let drake = require("dragula")([tabGroup.tabContainer], {
        direction: 'horizontal',
        moves: function (el, container, handle) {
         return $(handle).attr('class') != 'etabs-tab-button-close';
       }
      });

      $('.etabs-tab-button-new').replaceWith($('.etabs-tab-button-new').clone());
      $('.etabs-tab-button-new').click(async () => { newTab(newTab_title, newTab_url); });
      $('.etabs-tab-button-new').attr('title', 'New tab');

      callback(tabGroup);
    },
    newTab: {
     title: newTab_title,
     src: newTab_url,
     visible: true,
     active: true,
     webviewAttributes: {
       partition: "persist:peacock",
       sandbox: true,
       plugins: false,
       preload: 'js/preload.js',
       disablewebsecurity: true
     }
    }
  });

  tabGroup.tabContainer.nextElementSibling.firstElementChild.innerHTML = `<img src="images/plus.svg">`;

  return tabGroup;
}
exports.getTabGroup = function () { return tabGroup; }

exports.added = function (callback) {   /*tabGroup.on('tab-added', callback);*/   }
exports.removed = function (callback) { /*tabGroup.on('tab-removed', callback);*/ }
exports.active = function (callback) {  /*tabGroup.on('tab-active', callback);*/  }

async function initBrowserView(view) {
  const web = require('./web-tab');
  const store = require('./store');

  view.webContents.on('did-start-loading', async (e) => { web.loadStart(view) });
  view.webContents.on('did-stop-loading', async (e) => { web.loadStop(view) });
  //view.webContents.on('did-finish-load', async (e) => { finishLoad(e, tab) });
  view.webContents.on('did-fail-load', async (e) => {web.failLoad(e, view); });
  view.webContents.on('enter-html-full-screen', async (e) => { web.enterFllscrn() });
  view.webContents.on('leave-html-full-screen', async (e) => { web.leaveFllscrn() });
  view.webContents.on('update-target-url', async (e) => { web.updateTargetURL(e) });
  view.webContents.on('dom-ready', async (e) => { web.domReady(view, store) });
  view.webContents.on('new-window', async (e) => { web.newWindow(e, true, this.newView) });
  view.webContents.on('page-favicon-updated', async (e) => { web.faviconUpdated(view, e.favicons) });
  view.webContents.on('page-title-updated', async (e) => { web.titleUpdated(view, e) });
  view.webContents.on('did-change-theme-color', async (e) => { web.changeThemeColor(e) });
  view.webContents.on('did-navigate', async (e) => { web.didNavigate(e.url, view, store) });
  view.webContents.on('did-navigate-in-page', async (e) => { web.didNavigate(e.url, view, store) });
  view.webContents.on('found-in-page', async (e) => {
    $('#matches').text(e.result.activeMatchOrdinal.toString() + ' of ' + e.result.matches.toString() + ' matches');
  });
  view.webContents.on('ipc-message', async (e) => {
    switch (e.channel) {
      case 'flags.js':
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
    if(e.channel == 'flags.js') {}
  });
}

exports.newView = function (url, userAgent) {
  const { remote } = require('electron');
  const { BrowserView } = remote;
  const { join } = require('path');

  let view = new BrowserView({
    partition: "persist:peacock",
    sandbox: true,
    preload: 'js/preload.js',
    disablewebsecurity: true
  });
  let tabSession = view.webContents.session;

  let winBounds = remote.getCurrentWindow().getBounds();

  remote.getCurrentWindow().setBrowserView(view);
  view.setBounds({ x: 0, y: 89, width: window.outerWidth, height: winBounds.height - 89 });

  window.onresize = async () => {
    let bounds = view.getBounds();
    winBounds = remote.getCurrentWindow().getBounds();
    view.setBounds({ x: bounds.x, y: bounds.y, width: window.outerWidth, height: winBounds.height - 89 });
  };

  tabSession.webRequest.onBeforeSendHeaders(async (details, callback) => {
    let headers = details.requestHeaders;
    headers['DNT'] = '1';
    headers['User-Agent'] = userAgent;
    callback({ cancel: false, requestHeaders: headers });
  });

  tabSession.protocol.registerFileProtocol('peacock', (req, cb) => {
    var url = new URL(req.url);
    if(url.hostname == 'network-error') {
      cb({ path: join(__dirname, '../pages/', `network-error.html`) });
    } else {
      url = req.url.replace(url.protocol, '');
      cb({ path: join(__dirname, '../pages/', `${ url }.html`) });
    }
  }, (error) => {});

  view.setIcon = async (icon) => { console.log(icon); }
  view.setTitle = async (title) => { console.log(title); }

  view.webContents.loadURL(url);

  initBrowserView(view);
  this.viewAdded(view);

  return view;
}

exports.viewAdded = function (view) {
  console.log('view added');
}
