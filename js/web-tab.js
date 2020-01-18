var id;
var document;
var firstTime = true;

window.$ = window.jQuery = require('jquery');

let { remote } = require('electron');
function webContents(webview) { return remote.webContents.fromId(webview.getWebContentsId()); }
exports.webContents = webContents;

function setURLBar(url, tab) {
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

exports.setDocument = function (input) { document = input; }

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

exports.failLoad = function(event, view) {
  if(event.errorCode != -27 && event.errorCode != -3) {
    window.error = {errorCode: event.errorCode,
      errorDescription: event.errorDescription,
      validatedURL: event.validatedURL,
      darkMode: window.darkMode};
    view.webContents.loadURL('peacock://network-error');
  }
}

exports.didNavigate = function (url, view, store) {
  try {
    let protocol = (new URL(url)).protocol;
    if(protocol.startsWith('http')) {
      //store.logHistory(url, view.webContents.getTitle());
    }
  } catch (e) {}
  setSearchIcon(url);
}

exports.enterFllscrn = function() {
  document.getElementById('navigation').style.display = 'none';
  document.getElementById('titlebar').style.display = 'none';
  document.getElementById('etabs-tabgroup').style.setProperty('display', 'none', 'important');
  document.getElementById('etabs-views').style.marginTop = '0px';
  document.getElementById('etabs-views').style.height = '100%';
}

exports.leaveFllscrn = function() {
  document.getElementById('navigation').style.display = 'block';
  document.getElementById('titlebar').style.display = 'block';
  document.getElementById('etabs-tabgroup').style.display = 'block';
  document.getElementById('etabs-views').style.marginTop = '89px';
  document.getElementById('etabs-views').style.height = 'calc(100% - 89px)';
}

exports.domReady = function (view, store) {
  //setURLBar(tab.webview.src, tab);

  view.webContents.insertCSS('input::-webkit-calendar-picker-indicator {display: none;}');

  store.isBookmarked(view.webContents.getURL()).then((result) => {
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
      let flags = require('path').join(__dirname, '../data/flags.json');
      require('fs').readFile(flags, {encoding: 'utf-8'}, function(err,data){
        if (err) { console.error(err); return }
        view.webContents.send('loadFlags', data);
      });
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
      store.getHistory().then(obj => {
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
    console.log(url);
    $('#target').css('opacity', '0.95');
    $('#target').text(url);
  } else {
    $('#target').css('opacity', '0');
  }
}

exports.newWindow = function (event, legit=false, newtab) {
  if(legit){
    console.log(newTab);
    //newtab('', event.url);
  }
}

exports.faviconUpdated = function (view, favicons) {
  if(favicons && favicons.length > 0) { view.tab.setIcon(favicons[0]); }
}

exports.titleUpdated = function (view, event) {
  view.tab.setTitle(event.title);
}

exports.changeTab = function (view, store) {
  store.isBookmarked(view.webContents.getURL()).then((result) => {
    document.getElementById('star').style.visibility = 'visible';
    document.getElementById('star').src = result ? 'images/bookmark-saved.svg' : 'images/bookmark.svg';
  });

  //setURLBar(view.webContents.getURL(), tab);

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
