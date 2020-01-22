var document;
var store;
var firstTime = true;

window.$ = window.jQuery = require('jquery');

let { remote } = require('electron');
function webContents(webview) { return remote.webContents.fromId(webview.getWebContentsId()); }
exports.webContents = webContents;

function setURLBar(url) {
  let bar = $('#url');
  if(!firstTime) {
    try {
      if(url == 'peacock://newtab') {
        bar.val('');
        bar.focus();
        bar.select();
      } else {
        let protocol = (new URL(url)).protocol;
        bar.val(protocol.startsWith('http') ? url.substr(protocol.length + 2) : url);
      }
    } catch (e) {}
  } else {
    firstTime = false;
  }
}
exports.setURLBar = setURLBar;

function setSearchIcon(url) {
  $('#search').attr('style', '');

  try {
    let protocol = (new URL(url)).protocol;

    if(protocol == 'http:') document.getElementById('search').src = 'images/alert.svg';
    else if(protocol == 'https:') document.getElementById('search').src = 'images/lock.svg';
  } catch (e) {}
}
exports.setSearchIcon = setSearchIcon;

exports.init = function (doc, st) { document = doc; store = st; }

exports.loadStart = function(view, extensions) {
  // tab.tabElements.icon.innerHTML = `<div class='spinner'><svg class='svg' viewBox='22 22 44 44'>
  //   <circle class='circle' cx='44' cy='44' r='20.2' stroke-width='3.6' fill='none'>
  //   </circle></svg></div>`;

  document.getElementById('star').style.visibility = 'hidden';
  document.getElementById('refresh').children[0].src = 'images/close.svg';

  if(!extensions) return;

  extensions.forEach(function (item, index) {
    if(item.run_at == 'document_start'){
      item.content.forEach(function (script, index) {
        let js = require('fs').readFileSync(script).toString();
        js = js.replace('chrome.runtime.onMessage.addListener', '');
        view.webContents.executeJavaScript(js).then((result) => {
          console.log(result);
        });
      });
    }
  });
}

exports.loadStop = function(view, extensions) {
  document.getElementById('refresh').children[0].src = 'images/refresh.svg';

  let url = new URL(view.webContents.getURL());
  view.tab.setIcon(`https://www.google.com/s2/favicons?domain=${url.origin}`);

  if(!extensions) return;

  extensions.forEach(function (item, index) {
    if(item.run_at == 'document_end'){
      item.content.forEach(function (script, index) {
        let js = require('fs').readFileSync(script).toString();
        view.webContents.executeJavaScript(js);
        view.webContents.executeJavaScript(`
          let output;
          function queueOutput(input) {
            output = input;
          }

          function returnOutput() {
            return output;
          }

          chrome.runtime.onMessage({'action': 'process-page'}, this, queueOutput);`)
          .then(() => {
            view.webContents.executeJavaScript(`returnOutput()`).then((result) => {
              console.log(result);
            });
          });
      });
    }
  });
}

exports.failLoad = function(event, view, errorCode, errorDescription, validatedURL) {
  if(errorCode != -27 && errorCode != -3) {
    window.error = {errorCode: errorCode,
      errorDescription: errorDescription,
      validatedURL: validatedURL,
      darkMode: window.darkMode};
    view.webContents.loadURL('peacock://network-error');
  }
}

exports.didNavigate = function (url, view, storage) {
  try {
    let protocol = (new URL(url)).protocol;
    if(protocol.startsWith('http')) {
      //storage.logHistory(url, view.webContents.getTitle());
    }
  } catch (e) {}
  setSearchIcon(url);
}

exports.enterFllscrn = function(view, screen) {
  view.setBounds({ x: 0, y: 0, width: screen.getPrimaryDisplay().size.width, height: screen.getPrimaryDisplay().size.height });
}

exports.leaveFllscrn = function(view, width, height) {
  view.setBounds({ x: 0, y: 89, width: width, height: height - 89 });
  view.setBounds({ x: 0, y: 89, width: width, height: height - 89 });
}

exports.domReady = function (view, storage) {
  setURLBar(view.webContents.getURL());

  view.webContents.insertCSS('input::-webkit-calendar-picker-indicator {display: none;}');

  storage.isBookmarked(view.webContents.getURL()).then((result) => {
    document.getElementById('star').style.visibility = 'visible';
    document.getElementById('star').src = result ? 'images/bookmark-saved.svg' : 'images/bookmark.svg';
  });

  if(view.webContents.canGoBack()) {
    if(document.getElementById('back').classList.contains('disabled')) {
      document.getElementById('back').classList.remove('disabled');
    }
  } else {
    document.getElementById('back').classList.add('disabled');
  }

  if(view.webContents.canGoForward()) {
    if(document.getElementById('forward').classList.contains('disabled')) {
      document.getElementById('forward').classList.remove('disabled');
    }
  } else {
    document.getElementById('forward').classList.add('disabled');
  }

  if(window.theme == 'dark') {
    view.webContents.insertCSS(`
      ::-webkit-scrollbar { width: 17px; }
      ::-webkit-scrollbar-track { background-color: #181A1B;}
      ::-webkit-scrollbar-thumb { background-color: #2A2C2E;}
      ::-webkit-scrollbar-thumb:hover { background-color: #323537;}
      ::-webkit-scrollbar-corner { background-color: transparent;}`);
  }

  view.webContents.executeJavaScript(`document.getElementsByTagName('video').length`)
    .then((result) => {
      if(result === 1) {
        document.getElementById('pip').style.cssText = 'display:block !important';
      } else {
        document.getElementById('pip').style.cssText = 'display:none !important';
      }
    });

  switch (view.webContents.getURL()) {
    case 'peacock://flags':
      view.webContents.send('loadFlags', store.get('flags'));
      break;
    case 'peacock://network-error':
      view.webContents.send('setError', window.error);
      window.error = {errorCode: '-300', validatedURL: 'peacock://network-error', darkMode: window.darkMode};
      break;
    case 'peacock://version':
      view.webContents.send('setVersions', process.versions);
      break;
    case 'peacock://newtab':
      let bookmarks = [];
      storage.getHistory().then(obj => {
        obj.forEach((item, i) => {
          bookmarks.push(item.url);
        });
        view.webContents.send('sendBookmarks', bookmarks);
      });
      break;
    default:
      break;
  }
}

exports.updateTargetURL = function (event, url) {
  if (url && url != '') {
    $('#target').css('opacity', '0.95');
    $('#target').text(url);
  } else {
    $('#target').css('opacity', '0');
  }
}

exports.newWindow = function (newView, url, frameName, disp, legit=false) {
  if(legit) newView(url);
}

exports.faviconUpdated = function (view, favicons) {
  if(favicons && favicons.length > 0) { view.tab.setIcon(favicons[0]); }
}

exports.titleUpdated = function (view, event, title) {
  view.tab.setTitle(title);
  view.tab.title.attr('title', title);
}

exports.changeTab = function (view, storage) {
  storage.isBookmarked(view.webContents.getURL()).then((result) => {
    document.getElementById('star').style.visibility = 'visible';
    document.getElementById('star').src = result ? 'images/bookmark-saved.svg' : 'images/bookmark.svg';
  });

  setURLBar(view.webContents.getURL());

  try {
    let protocol = (new URL(view.webContents)).protocol;
    if(protocol.startsWith('http')) setSearchIcon(view.webContents.getURL());
  } catch (e) {}

  try {
    if(view.webContents.canGoBack()) {
      if(document.getElementById('back').classList.contains('disabled')) {
        document.getElementById('back').classList.remove('disabled');
      }
    } else {
      document.getElementById('back').classList.add('disabled');
    }

    if(view.webContents.canGoForward()) {
      if(document.getElementById('forward').classList.contains('disabled')) {
        document.getElementById('forward').classList.remove('disabled');
      }
    } else {
      document.getElementById('forward').classList.add('disabled');
    }

    view.webContents.executeJavaScript(`document.getElementsByTagName('video').length`)
      .then((result) => {
        if(result === 1) {
          document.getElementById('pip').style.cssText = 'display:block !important';
        } else {
          document.getElementById('pip').style.cssText = 'display:none !important';
        }
      });
  } catch (e) {}

  // tab.on('webview-ready', () => {
  //   tab.setTitle(tab.webview.getTitle());
  // });
}

exports.changeThemeColor = function (event) {
  //document.querySelector('.etabs-tab.active').style.boxShadow = `inset 0px 0px 0px 1px ${event.themeColor}`;
}

exports.exitPointerLock = function (view) {
  view.webContents.executeJavaScript(`document.exitPointerLock();`);
}
