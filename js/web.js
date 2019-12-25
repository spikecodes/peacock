var id;
var document;
var firstTime = true;

window.$ = window.jQuery = require('jquery');

let { remote } = require('electron');
function webContents(webview) { return remote.webContents.fromId(webview.getWebContentsId()); }

function setURLBar(url, tab) {
  let bar = $('#url');
  if(!firstTime) {
    if(!(!!tab.initialized)) {
      bar.val('');
      tab.initialized = true;

      setTimeout(function () {
        bar.focus();
      }, 250);
    } else {
      let protocol = (new URL(url)).protocol;
      bar.val(protocol.startsWith('http') ? url.substr(protocol.length + 2) : url);
    }
  } else {
    firstTime = false;
  }
}
exports.setURLBar = setURLBar;

function setSearchIcon(url) {
  $('#search').attr('style', '');

  let protocol = (new URL(url)).protocol;

  if(protocol == 'http:') document.getElementById('search').src = 'images/alert.svg';
  else if(protocol == 'https:') document.getElementById('search').src = 'images/lock.svg';
}
exports.setSearchIcon = setSearchIcon;

exports.setDocument = function (input) { document = input; }

exports.loadStart = function(tab, extensions) {
  tab.tabElements.icon.innerHTML = `<div class="spinner"><svg class="svg" viewBox="22 22 44 44">
    <circle class="circle" cx="44" cy="44" r="20.2" stroke-width="3.6" fill="none">
    </circle></svg></div>`;

  document.getElementById('star').style.visibility = 'hidden';
  document.getElementById('refresh').children[0].src = 'images/close.svg';

  if(!extensions) return;

  extensions.forEach(function (item, index) {
    if(item.run_at == 'document_start'){
      item.content.forEach(function (script, index) {
        let js = require('fs').readFileSync(script).toString();
        js = js.replace('chrome.runtime.onMessage.addListener', '');
        webContents(tab.webview).executeJavaScript(js).then((result) => {
          console.log(result);
        });
      });
    }
  });
}

exports.loadStop = function(tab, extensions) {
  document.getElementById('refresh').children[0].src = 'images/refresh.svg';

  let url = new URL(tab.webview.src);
  tab.setIcon(`https://www.google.com/s2/favicons?domain=${url.origin}`);

  if(!extensions) return;

  extensions.forEach(function (item, index) {
    if(item.run_at == 'document_end'){
      item.content.forEach(function (script, index) {
        let js = require('fs').readFileSync(script).toString();
        webContents(tab.webview).executeJavaScript(js);
        webContents(tab.webview).executeJavaScript(`
          let output;
          function queueOutput(input) {
            output = input;
          }

          function returnOutput() {
            return output;
          }

          chrome.runtime.onMessage({'action': 'process-page'}, this, queueOutput);`)
          .then(() => {
            webContents(tab.webview).executeJavaScript(`returnOutput()`).then((result) => {
              console.log(result);
            });
          });
      });
    }
  });
}

exports.failLoad = function(event, webview) {
  if(event.errorCode != -27 && event.errorCode != -3) {
    window.error = {errorCode: event.errorCode,
      errorDescription: event.errorDescription,
      validatedURL: event.validatedURL,
      darkMode: window.darkMode};
    webview.loadURL('peacock://network-error');
  }
}

exports.didNavigate = function (url, webview, store) {
  store.logHistory(url, webview.getTitle());
  setSearchIcon(url);
}

exports.enterFllscrn = function() {
  document.getElementById("navigation").style.display = "none";
  document.getElementById("titlebar").style.display = "none";
  document.getElementById("etabs-tabgroup").style.setProperty('display', 'none', 'important');
  document.getElementById("etabs-views").style.marginTop = "0px";
  document.getElementById("etabs-views").style.height = "100%";
}

exports.leaveFllscrn = function() {
  document.getElementById("navigation").style.display = "block";
  document.getElementById("titlebar").style.display = "block";
  document.getElementById("etabs-tabgroup").style.display = "block";
  document.getElementById("etabs-views").style.marginTop = "89px";
  document.getElementById("etabs-views").style.height = "calc(100% - 89px)";
}

exports.domReady = function (tab, store) {
  let webview = tab.webview;

  tab.ready++;
  if (tab.ready > 2) { setURLBar(tab.webview.src, tab); }

  store.isBookmarked(webview.src).then((result) => {
    document.getElementById('star').style.visibility = 'visible';
    document.getElementById('star').src = result ? "images/bookmark-saved.svg" : "images/bookmark.svg";
  });

  if(webview.canGoBack()) {
    if(document.getElementById('back').classList.contains('disabled')) {
      document.getElementById('back').classList.remove('disabled');
    }
  } else {
    document.getElementById('back').classList.add('disabled');
  }

  if(webview.canGoForward()) {
    if(document.getElementById('forward').classList.contains('disabled')) {
      document.getElementById('forward').classList.remove('disabled');
    }
  } else {
    document.getElementById('forward').classList.add('disabled');
  }

  if(window.theme == 'dark') {
    webContents(webview).insertCSS(`
      ::-webkit-scrollbar { width: 17px; }
      ::-webkit-scrollbar-track { background-color: #181A1B;}
      ::-webkit-scrollbar-thumb { background-color: #2A2C2E;}
      ::-webkit-scrollbar-thumb:hover { background-color: #323537;}
      ::-webkit-scrollbar-corner { background-color: transparent;}`);
  }

  webContents(webview).executeJavaScript(`document.getElementsByTagName('video').length`)
    .then((result) => {
      if(result === 1) {
        document.getElementById("pip").style.cssText = 'display:block !important';
      } else {
        document.getElementById("pip").style.cssText = "display:none !important";
      }
    });

  switch (webview.src) {
    case 'peacock://flags':
      let flags = require('path').join(__dirname, '../data/flags.json');
      require('fs').readFile(flags, {encoding: 'utf-8'}, function(err,data){
        if (err) { console.error(err); return }
        webContents(webview).send('loadFlags', data);
      });
      break;
    case 'peacock://network-error':
      webContents(webview).send('setError', window.error);
      window.error = {errorCode: '-300', validatedURL: 'peacock://network-error', darkMode: window.darkMode};
      break;
    case 'peacock://version':
      console.log(process.versions);
      webContents(webview).send('setVersions', process.versions);
      break;
    default:
      break;
  }
}

exports.updateTargetURL = function (event) {
  if (event.url != "") {
    document.getElementById("target").style.opacity = 0.95;
    document.getElementById("target").innerHTML = event.url;
  } else {
    document.getElementById("target").style.opacity = 0;
  }
}

exports.newWindow = function (event, legit=false, tabs) {
  if(legit){
    tabs.new("", event.url);
  }
}

exports.faviconUpdated = function (tab, favicons) {
  tab.setIcon(favicons[0]);
}

exports.titleUpdated = function (event, tab) {
  if(event.explicitSet){
    tab.setTitle(event.title)
  }
}

exports.changeTab = function (tab, store) {
  store.isBookmarked(tab.webview.src).then((result) => {
    document.getElementById('star').style.visibility = 'visible';
    document.getElementById('star').src = result ? "images/bookmark-saved.svg" : "images/bookmark.svg";
  });

  setURLBar(tab.webview.src, tab);

  try {
    if(tab.webview.canGoBack()) {
      if(document.getElementById('back').classList.contains('disabled')) {
        document.getElementById('back').classList.remove('disabled');
      }
    } else {
      document.getElementById('back').classList.add('disabled');
    }

    if(tab.webview.canGoForward()) {
      if(document.getElementById('forward').classList.contains('disabled')) {
        document.getElementById('forward').classList.remove('disabled');
      }
    } else {
      document.getElementById('forward').classList.add('disabled');
    }

    webContents(tab.webview).executeJavaScript(`document.getElementsByTagName('video').length`)
      .then((result) => {
        if(result === 1) {
          document.getElementById("pip").style.cssText = 'display:block !important';
        } else {
          document.getElementById("pip").style.cssText = "display:none !important";
        }
      });
  } catch (e) {}

  tab.on('webview-ready', () => {
    tab.setTitle(tab.webview.getTitle());
  });
}

exports.changeThemeColor = function (event) {
  //document.querySelector(".etabs-tab.active").style.boxShadow = `inset 0px 0px 0px 1px ${event.themeColor}`;
}

exports.exitPointerLock = function (webview) {
  webContents(webview).executeJavaScript(`document.exitPointerLock();`);
}
