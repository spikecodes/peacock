const { remote } = require('electron');

const web = require('./web-tab');
const store = require('./store');

exports.tabs = [];

var tabGroup;
var closedTabs = [];

var activeTab;

async function onetime(node, type, callback) {
  // create event
  node.on(type, function(e) {
  	// remove event
  	node.off(e.type, arguments.callee);
  	// call handler
  	return callback(e);
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

exports.current = function () {
  return tabGroup.getActiveTab();
}

exports.currentView = function () {
  return activeTab;
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
  view.webContents.on('did-start-loading', async (e) => { web.loadStart(view) });
  view.webContents.on('did-stop-loading', async (e) => { web.loadStop(view) });
  //view.webContents.on('did-finish-load', async (e) => { finishLoad(e, tab) });
  view.webContents.on('did-fail-load', async (e) => {web.failLoad(e, view); });
  view.webContents.on('enter-html-full-screen', async (e) => { web.enterFllscrn() });
  view.webContents.on('leave-html-full-screen', async (e) => { web.leaveFllscrn() });
  view.webContents.on('update-target-url', async (e, url) => { web.updateTargetURL(e, url) });
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
  view.webContents.on('preload-error', async (e, path, err) => { console.error(err); });
}

exports.savePage = function(contents) {
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

exports.activate = function (view) {

  if($('div.active').length > 0) $('div.active').removeClass('active');

  console.log('set view', view);
  remote.getCurrentWindow().setBrowserView(view);
  remote.getCurrentWindow().setBrowserView(view);
  view.tab.element.addClass('active');
  activeTab = view;

  this.viewActivated(view);
}

exports.close = function (view) {
  view = view || this.currentView();

  if(activeTab == view) {
    let id = this.tabs.indexOf(view);
    let length = this.tabs.length;

    if (length == 1) { remote.app.quit(); return; }

    let nextTab = (id != 0) ? this.tabs[id - 1] : this.tabs[id + 1];
    this.activate(nextTab);
  }

  closedTabs.push(view.webContents.getURL());

  let tab = view.tab.element;

  this.viewClosed(view);

  $(tab).css('transition', 'all 0.1s !important');
  $(tab).fadeSlideLeft(100, async () => {
    setTimeout(async function () {
      view.tab.close();
      view.destroy();
      $(tab).css('transition', 'all 0.0s !important');
    }, 200);
  });

}

exports.newView = function (url, active=true) {
  const { BrowserView } = remote;
  const { join } = require('path');

  let userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:73.0) Gecko/20100101 Firefox/73.0';

  let view = new BrowserView({
    webPreferences: {
      preload: join(__dirname, 'preload.js')
    }
  });
  let tabSession = view.webContents.session;

  let winBounds = remote.getCurrentWindow().getBounds();

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

  require('electron-context-menu')({
    window: view.webContents,
    prepend: (defaultActions, params, browserWindow) => [
      {
        label: 'Back',
        accelerator: 'Alt+Left',
        visible: params.selectionText.length == 0,
        enabled: view.webContents.canGoBack(),
        click: async () => { view.webContents.goBack(); }
      },
      {
        label: 'Forward',
        accelerator: 'Alt+Right',
        visible: params.selectionText.length == 0,
        enabled: view.webContents.canGoForward(),
        click: async () => { view.webContents.goForward(); }
      },
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        visible: params.selectionText.length == 0,
        click: async () => { view.webContents.reload(); }
      },
      {
        type: 'separator'
      },
      {
        label: 'Save as...',
        accelerator: 'CmdOrCtrl+S',
        visible: params.selectionText.length == 0,
        click: async () => { this.savePage(view.webContents); }
      },
      {
        type: 'separator'
      },
      {
        label: 'View Image',
        visible: params.mediaType === 'image',
        click: async () => { view.webContents.loadURL(params.srcURL); }
      },
      {
        label: 'Open Link in New Tab',
        visible: params.linkURL.length > 0,
        click: async () => { this.newView(params.linkURL); }
      },
      {
        label: 'Search Google for “{selection}”',
        visible: params.selectionText.trim().length > 0,
        click: async () => { view.webContents.loadURL(`https://google.com/search?q=${encodeURIComponent(params.selectionText)}`); }
      }
    ],
    showLookUpSelection: true,
    showCopyImageAddress: true,
    showSaveImageAs: true,
    showInspectElement: true
  });

  $('.etabs-tabs').append(`<div class="etabs-tab visible" style="opacity: 1; width: 262px; transition: all 0.1s ease 0s;">
      <span class="etabs-tab-icon">
        <img src="https://www.google.com/s2/favicons?domain=null">
      </span>

      <span class="etabs-tab-title" title="New Tab">New Tab</span>

      <span class="etabs-tab-buttons">
        <button class="etabs-tab-button-close">✖</button>
      </span>
    </div>`);

  view.tab = {
    element: $('.etabs-tabs').children().last(),
    setIcon: async (icon) => { view.tab.icon.attr('src', icon); },
    setTitle: async (title) => { view.tab.title.text(title); },
    close: async () => { view.tab.element.remove(); }
  };

  view.tab.icon = view.tab.element.children().eq(0).children().first();
  view.tab.title = view.tab.element.children().eq(1);
  view.tab.button = view.tab.element.children().eq(2).children().first();

  view.tab.element.click(async (e) => {
    this.activate(view);
  });

  view.tab.button.click(async (e) => {
    e.stopPropagation();
    this.close(view);
  });

  view.webContents.loadURL(url);
  initBrowserView(view);

  this.viewAdded(view);

  if(active) {
    this.activate(view);
  }

  return view;
}

exports.viewAdded = function (view) {
  this.tabs.push(view);
}

exports.viewClosed = function (view, tabs=this.tabs) {
  const index = this.tabs.indexOf(view);
  if (index > -1) this.tabs.splice(index, 1);
}

exports.viewActivated = function (view) {
  console.log('view activated: ' + this.tabs.indexOf(view));
  web.changeTab(view, store);
}

$('.etabs-tab-button-new').click(async e => {
  this.newView('peacock://newtab');
});

this.newView('peacock://newtab');
