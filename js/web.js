var id;
var doc;
var error;

let { remote } = require('electron');
function webContents(webview) {
  return remote.webContents.fromId(webview.getWebContentsId());
}

exports.setDocument = function (input) { doc = input; }

exports.loadStart = function(tab, extensions) {
  if (window.theme === "light") {
    tab.tabElements.icon.innerHTML = `<div class="spinner spinner-light"><svg class="svg" viewBox="22 22 44 44">
      <circle class="circle" cx="44" cy="44" r="20.2" stroke-width="3.6" fill="none">
      </circle></svg></div>`; // .setIcon("images/loading-light.gif")
  } else if (window.theme === "dark") {
    tab.tabElements.icon.innerHTML = `<div class="spinner spinner-dark"><svg class="svg" viewBox="22 22 44 44">
      <circle class="circle" cx="44" cy="44" r="20.2" stroke-width="3.6" fill="none">
      </circle></svg></div>`;//tab.setIcon("images/loading-dark.gif");
  } else if (window.theme === "default") {
    if(window.darkMode) {
      tab.setIcon("images/loading-dark.gif");
    } else {
      tab.setIcon("images/loading-light.gif");
    }
  }

  doc.getElementById('star').style.visibility = 'hidden';
  doc.getElementById('refresh').children[0].src = 'images/close.svg';

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
  let src = new URL(tab.webview.src);
  let fav = `https://www.google.com/s2/favicons?domain=${src.origin}`;
  tab.setIcon(fav);

  doc.getElementById('refresh').children[0].src = 'images/refresh.svg';

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
          .then((result) => {
            webContents(tab.webview).executeJavaScript(`returnOutput()`).then((resultant) => {
              console.log(resultant);
            });
          });
      });
    }
  });
}

exports.failLoad = function(event, webview) {
  error = {errorCode: event.errorCode,
    errorDescription: event.errorDescription,
    validatedURL: event.validatedURL,
    darkMode: window.darkMode}
  webview.loadURL('peacock://network-error');
}

exports.didNavigate = function (url) {
  let val = url;
  let protocol = (new URL(val)).protocol;

  if(protocol == 'http:' || protocol == 'https:') { doc.getElementById('url').value = val.substr(protocol.length + 2); }
  else { doc.getElementById('url').value = val; }

  if(protocol == 'http:') doc.getElementById('search').src = 'images/alert.svg';
  else if(protocol == 'https:') doc.getElementById('search').src = 'images/lock.svg';
}

exports.enterFllscrn = function() {
  doc.getElementById("navigation").style.display = "none";
  doc.getElementById("titlebar").style.display = "none";
  doc.getElementById("etabs-tabgroup").style.display = "none";
  doc.getElementById("etabs-views").style.borderTop = "none";
  doc.getElementById("etabs-views").style.marginTop = "0px";
}

exports.leaveFllscrn = function() {
  doc.getElementById("navigation").style.display = "block";
  doc.getElementById("titlebar").style.display = "block";
  doc.getElementById("etabs-tabgroup").style.display = "block";
  doc.getElementById("etabs-views").style.marginTop = "97px";
}

exports.domReady = function (webview, store) {
  webview.blur();
  webview.focus();

  store.isBookmarked(webview.src).then((result) => {
    doc.getElementById('star').style.visibility = 'visible';
    doc.getElementById('star').src = result ? "images/bookmark-saved.svg" : "images/bookmark.svg";
  });

  if(webview.canGoBack()) {
    if(doc.getElementById('back').classList.contains('disabled')) {
      doc.getElementById('back').classList.remove('disabled');
    }
  } else {
    doc.getElementById('back').classList.add('disabled');
  }

  if(webview.canGoForward()) {
    if(doc.getElementById('forward').classList.contains('disabled')) {
      doc.getElementById('forward').classList.remove('disabled');
    }
  } else {
    doc.getElementById('forward').classList.add('disabled');
  }

  webContents(webview).executeJavaScript(`document.getElementsByTagName('video').length`)
    .then((result) => {
      if(result === 1) {
        doc.getElementById("pip").style.cssText = 'display:block !important';
      } else {
        doc.getElementById("pip").style.cssText = "display:none !important";
      }
    });

  switch (webview.src) {
    case 'peacock://flags':
      let flags = require('path').join(__dirname, '../data/flags.json');
      require('fs').readFile(flags, {encoding: 'utf-8'}, function(err,data){
        if (!err) {
          webContents(webview).send('loadFlags', data);
        } else {
          console.log(err);
        }
      });
      break;
    case 'peacock://network-error':
      webContents(webview).send('setError', error);
      error = {errorCode: '-300', validatedURL: 'peacock://network-error', darkMode: window.darkMode};
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
    doc.getElementById("dialog-container").style.opacity = 0.95;
    doc.getElementById("dialog").innerHTML = event.url;
  } else {
    doc.getElementById("dialog-container").style.opacity = 0;
  }
}

exports.newWindow = function (event, legit=false, tabs) {
  if(legit){
    tabs.new("", event.url);
  }
}

exports.faviconUpdated = function (tab) {
  let src = new URL(tab.webview.src);
  let fav = `https://www.google.com/s2/favicons?domain=${src.origin}`;
  tab.setIcon(fav);
}

exports.titleUpdated = function (event, tab) {
  if(event.explicitSet){
    tab.setTitle(event.title)
  }
}

exports.changeThemeColor = function (event) {
  doc.querySelector(".etabs-tab.active").style.boxShadow = `inset 0px 0px 0px 1px ${event.themeColor}`;
}
