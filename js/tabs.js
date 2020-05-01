const { remote, ipcRenderer, nativeImage } = require('electron');

var crypto = require('crypto');

const web = require('./web');
const storage = require('./store');

const { BrowserView, BrowserWindow, ipcMain, Menu } = remote;
const { join } = require('path');

const win = remote.getCurrentWindow();

const topbarHeight = 70;

let Sortable = require('sortablejs');
var sortable = new Sortable($('#tabs')[0]);

console.colorLog = (msg, color) => { console.log("%c" + msg, "color:" + color + ";font-weight:bold;") }

exports.tabs = [];

var closedTabs = [];

var activeTab;

var downloadWindow;

$.fn.fadeSlideLeft = function() {
  $(this).css('opacity', '0');
  $(this).css('width', '0px');
  // return $(this).animate({
  //   'opacity' : 0,
  //   'width' : '0px'
  // },speed || 400,function() {
  //   $.isFunction(fn) && fn.call(this);
  // });
}

$.fn.fadeSlideRight = function() {
  $(this).css('opacity', '1');
  $(this).css('width', '250px');
  // return $(this).animate({
  //   'opacity' : 1,
  //   'width' : '250px'
  // },speed || 400,function() {
  //   $.isFunction(fn) && fn.call(this);
  // });
}

exports.initDownloads = async () => {
  downloadWindow = new BrowserWindow({
    frame: false,
    width: window.outerWidth,
    height: 66,
    x: 0,
    y: window.outerHeight - 66,
    parent: remote.getCurrentWindow(),
    show: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });

  downloadWindow.loadURL(require('url').format({
    pathname: join(__dirname, '../static/pages/dialogs/download.html'),
    protocol: 'file:',
    slashes: true
  }));

  //downloadWindow.openDevTools({ mode: "detach" });

  ipcMain.on('startDrag', async (e, file) => {
    file = file.replace(/\\/g, "/");
    let image = nativeImage.createFromDataURL(`data:null`);

    console.log(file);

    downloadWindow.webContents.startDrag({ file: file, icon: image });
  });
}

exports.handleDownload = async (event, item) => {
  let itemAddress = item.getURL();
  if(item.getMimeType() === 'application/pdf' && itemAddress.indexOf('blob:') !== 0 && itemAddress.indexOf('#pdfjs.action=download') === -1) {
    event.preventDefault();
    let query = '?file=' + encodeURIComponent(itemAddress);
    this.current().webContents.loadURL(join(__dirname, '..', 'static', 'pdf', 'index.html') + query);
  } else {
    var savePath;

    downloadWindow.show();

    let id = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
    downloadWindow.webContents.send('newDownload', id, item.getFilename(), itemAddress);

    item.on('updated', (event, state) => {
      if (state === 'interrupted') {
        downloadWindow.webContents.send('stoppedDownload', id, state);
      } else if (state === 'progressing') {
        savePath = item.savePath;
        if (item.isPaused()) {
          downloadWindow.webContents.send('stoppedDownload', id, 'paused');
        } else {
          let percentage = ~~((item.getReceivedBytes() / item.getTotalBytes()) * 100);
          downloadWindow.webContents.send('updateDownload', id, percentage);
        }
      }
    });

    ipcMain.once('cancel-download-' + id, () => { item.cancel(); console.log('CANCELLED:', id); });

    item.once('done', (event, state) => {
      if (state === 'completed') {
        console.log(savePath);
        downloadWindow.webContents.send('completeDownload', id, savePath);
      } else {
        downloadWindow.webContents.send('failedDownload', id);
      }
    });
  }
}

exports.openClosedTab = function () {
  if(closedTabs.length == 0) return;
  let item = closedTabs[closedTabs.length-1];
  this.newView(item);

  const index = closedTabs.indexOf(item);
  if (index > -1) closedTabs.splice(index, 1);
}

exports.current = function () {
  return activeTab;
}

exports.all = function () { return this.tabs; }

exports.get = function (index) { return this.tabs[index]; }

exports.length = function () {
  return this.tabs.length;
}

exports.initBrowserView = async (view) => {
  view.webContents.on('did-start-loading', async () => { web.loadStart(view) });
  view.webContents.on('did-stop-loading', async () => { web.loadStop(view) });
  view.webContents.on('did-fail-load', async (e, ec, ed, vu) => {web.failLoad(e, view, ec, ed, vu); });
  view.webContents.on('enter-html-full-screen', async () => { web.enterFllscrn(view, remote.screen) });
  view.webContents.on('leave-html-full-screen', async () => { web.leaveFllscrn(view, win.getBounds().height) });
  view.webContents.on('update-target-url', async (e, url) => { web.updateTargetURL(e, url) });
  view.webContents.on('dom-ready', async () => { web.domReady(view, storage) });
  view.webContents.on('new-window', async (e, url, f, disposition) => {
    switch (disposition) {
      case 'background-tab':
        this.newView(url, false);
        break;
      default:
        this.newView(url);
        break;
    }
  });
  // view.webContents.on('page-favicon-updated', async (e) => { web.faviconUpdated(view, e.favicons) });
  view.webContents.on('page-title-updated', async (e, t) => { web.titleUpdated(view, e, t) });
  view.webContents.on('did-navigate', async (e, url) => { web.didNavigate(url, view, storage) });
  view.webContents.on('did-navigate-in-page', async (e, url) => { web.didNavigate(url, view, storage) });
  view.webContents.on('preload-error', async (e, path, err) => { console.error("PRELOAD ERROR", err); });
  view.webContents.session.on('will-download', this.handleDownload);
  view.webContents.on('certificate-error', async (e, url, err) => {
    e.preventDefault();
    console.log(err);
  });
  view.webContents.on('found-in-page', async (e) => {
    $('#matches').text(e.result.activeMatchOrdinal.toString() + ' of ' + e.result.matches.toString() + ' matches');
  });
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
  let win = remote.getCurrentWindow()
  let views = win.getBrowserViews();
  for (let i = 0; i < views.length; i++) {
    if(views[i].tab) win.removeBrowserView(views[i]);
  }
  win.addBrowserView(view);
  $('#url').val('');

  this.viewActivated(view);

  if($('.selected').length > 0) $('.selected').removeClass('selected');

  view.tab.element.addClass('selected');
  activeTab = view;
}

exports.close = function (view) {
  view = view || this.current();

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
  $(tab).fadeSlideLeft();

  view.tab.element.remove();
  view.destroy();
  $(tab).css('transition', 'all 0.0s !important');
}

exports.newView = function (url='peacock://newtab', active=true) {
  // USER AGENT RANDOMIZATION

  let version = Math.floor(Math.random() * (69 - 53) + 53);
  var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:' + version + '.0) Gecko/20100101 Firefox/' + version + '.0';

  // BROWSERVIEW CREATION

  let view = new BrowserView({
    webPreferences: {
      preload: join(__dirname, 'preload.js')
    }
  });
  let tabSession = view.webContents.session;

  view.webContents.setUserAgent(userAgent);

  // SYNCHRONIZE VIEW SIZE WITH PARENT WINDOW SIZE

  view.setBounds({x:0, y:topbarHeight, width:win.getContentBounds().width, height:win.getContentBounds().height - topbarHeight });

  win.on('resize', () => {
    view.setBounds({x:0, y:topbarHeight, width:win.getContentBounds().width, height:win.getContentBounds().height - topbarHeight });
  });

  // HEADER CONFIGURATION

  tabSession.webRequest.onBeforeSendHeaders(async (details, callback) => {
    if('Content-Type' in details.requestHeaders && store.get('flags').includes('--no-pings')) {
      if(details.requestHeaders['Content-Type'][0] == 'text/ping') callback({ cancel: true });
    } else {
      let headers = details.requestHeaders;
      if(store.get('flags').includes('--no-referrers')) headers['Referer'] = '';
      if(store.get('flags').includes('--do-not-track')) headers['DNT'] = '1';
      headers['Accept-Language'] = 'en-US,en;q=0.9';
      headers['User-Agent'] = userAgent;
      callback({ cancel: false, requestHeaders: headers });
    }
  });

  // tabSession.protocol.interceptFileProtocol('chrome-extension', async (req, cb) => {
  //   if(!req.url.includes('mhjfbmdgcfjbbpaeojofohoefgiehjai')) return;
  //   let relative = req.url.replace('chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/', '');
  //   cb(join(__dirname, '..', 'static', 'pdf', relative));
  // });

  // DUCKDUCKGO SMARTER ENCRYPTION

  // tabSession.protocol.interceptHttpProtocol('http', (req, cb) => {
  //   let url = new URL(req.url);
  //   let shasum = crypto.createHash('sha1');
  //   let hash = shasum.update(url.host).digest('hex');
  //   $.get('https://duckduckgo.com/smarter_encryption.js?pv1=' + hash.substr(0,4), data => {
  //     console.log(data.includes(hash), url.host);
  //   });
  //   cb();
  // });

  // THIRD-PARTY COOKIE BLOCKING

  tabSession.cookies.on('changed', async (e, cookie, cause, rem) => {
    if(!rem) {
      let split = cookie.domain.split('.');
      let domain = split[split.length - 2] + '.' + split[split.length - 1];
      split = (new URL(view.webContents.getURL())).host.split('.');
      let host = split[split.length - 2] + '.' + split[split.length - 1];
      if(domain != host) {
        tabSession.cookies.remove(view.webContents.getURL(), cookie.name);
      }
    }
  });

  // CUSTOM PROTOCOLS

  tabSession.protocol.registerHttpProtocol('ipfs', (req, cb) => {
    var hash = req.url.substr(7);
    cb({ url: 'https://ipfs.io/ipfs/' + hash });
  }, () => {});

  // PDF READER

  tabSession.webRequest.onResponseStarted(async (details) => {
    let type = details.responseHeaders['Content-Type'] || details.responseHeaders['content-type'];
    let resource = details.resourceType;

    if(type && type[0] == 'application/json') console.log(type[0]);
  
    if(!resource || !type) return;
    if(resource == 'mainFrame' && type[0].includes('application/json')) {
      let query = '?url=' + encodeURIComponent(details.url);
      view.webContents.loadURL(join(__dirname, '..', 'static', 'json-viewer', 'index.html') + query);
    }
  });

  // tabSession.protocol.registerFileProtocol('pdf', (req, cb) => {
  //   var url = req.url.substr(6);
  //   let result = join(__dirname, '../static/pdf/', url);
  //   console.log(result);
  //   cb(result); // + '' + url
  // }, (error) => {});

  tabSession.protocol.registerFileProtocol('assets', (req, cb) => {
    var url = req.url.replace(new URL(req.url).protocol, '');

    if(url.includes('..')) {
      cb(join(__dirname, '../css/favicon.png'));
    } else {
      cb(join(__dirname, '../css/', url));
    }
  }, () => {});

  tabSession.protocol.registerFileProtocol('peacock', (req, cb) => {
    var url = new URL(req.url);
    if(url.hostname == 'network-error') {
      cb(join(__dirname, '../static/pages/', `network-error.html`));
    } else {
      url = req.url.replace(url.protocol, '');
      cb(join(__dirname, '../static/pages/', `${ url }.html`));
    }
  }, () => {});

  // CLOSE HANDLING

  ipcMain.on('closeCurrentTab', async (e, id) => {
    if(id == view.webContents.id) this.close(view);
  });

  // CONTEXT (RIGHT-CLICK) MENU

  require('electron-context-menu')({
    window: view.webContents,
    prepend: (defaultActions, params) => [
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
      }
    ],
    showLookUpSelection: true,
    showCopyImageAddress: true,
    showSaveImageAs: true,
    showInspectElement: true
  });

  $('#new-tab').before(`<div class="tab">
        <img class="tab-icon" src="//:0">
        <p class="tab-label">Loading...</p>
        <img class="tab-close" src="images/close.svg">
      </div>`);

  view.tab = {
    element: $('#new-tab').prev(),
    setIcon: async (icon) => {
      view.tab.icon.on("error", () => { view.tab.icon.attr('src', `//:0`) });
      view.tab.icon.attr('src', icon);
    },
    setTitle: async (title) => { view.tab.title.text(title); },
    close: async () => { view.tab.element.remove(); }
  };

  view.tab.element.css('opacity', '0');
  view.tab.element.css('width', '60px');
  view.tab.element.fadeSlideRight(100);

  view.tab.icon = view.tab.element.children().eq(0);
  view.tab.title = view.tab.element.children().eq(1);
  view.tab.button = view.tab.element.children().eq(2);

  // TAB MENU

  let tabMenuTemp = [
    { label:'Reload', click: async() => view.webContents.reload() },
    { label:'Duplicate', click: async() => this.newView(view.webContents.getURL()) },
    { label:'Pin', click: async() => alert('Tab pinning hasn\'t been added yet.') },
    { type: 'separator' },
    { label:'Close', click: async() => this.close(view) }
  ];

  view.tab.element.mousedown(async (e) => {
    switch (e.which) {
      case 1:
        this.activate(view);
        break;
      case 2:
        this.close(view);
        break;
      case 3:
        Menu.buildFromTemplate(tabMenuTemp).popup();
        break;
      default:
        break;
    }
  });

  view.tab.button.click(async (e) => {
    e.stopPropagation();
    this.close(view);
  });

  view.type = 'tab';

  view.webContents.loadURL(url);
  this.initBrowserView(view);

  this.viewAdded(view);

  if(active) { this.activate(view); this.activate(view); }

  return view;
}

exports.nextTab = async () => {
  let length = this.tabs.length;
  let index = this.tabs.indexOf(activeTab);

  if (length == 1) return;

  if (index == length - 1) { this.activate(this.tabs[0]); }
  else { this.activate(this.tabs[index + 1]); }
}

exports.backTab = async () => {
  let length = this.tabs.length;
  let index = this.tabs.indexOf(activeTab);

  if (length == 1) return;

  if (index == 0) { this.activate(this.tabs[length - 1]); }
  else { this.activate(this.tabs[index - 1]); }
}

exports.viewActivated = function (view) { web.changeTab(view, storage); }
exports.viewAdded = function (view) { this.tabs.push(view); ipcRenderer.send('viewAdded'); }
exports.viewClosed = function (view, tabs=this.tabs) {
  const index = tabs.indexOf(view);
  if (index > -1) tabs.splice(index, 1);
}

exports.showDialog = async (text) => {
  let { BrowserView } = remote;
  let view = new BrowserView();
  view.webContents.loadURL('data:,' + encodeURIComponent(text));
  remote.getCurrentWindow().addBrowserView(view);
}

$('#new-tab').click(async () => this.newView('peacock://newtab'));

remote.app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  console.log(certificate, error);
  event.preventDefault();
  callback(true);
});

this.initDownloads();
