var firstTime = true;

window.$ = window.jQuery = require('jquery');

let { remote } = require('electron');
function webContents(webview) { return remote.webContents.fromId(webview.getWebContentsId()); }
exports.webContents = webContents;

const topbarHeight = 70;

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
        if(!protocol.startsWith('file')) bar.val(protocol.startsWith('http') ? url.substr(protocol.length + 2) : url); // 
      }
    } catch (e) {}
  } else {
    firstTime = false;
  }
}
exports.setURLBar = setURLBar;

function setSearchIcon(url) {
  $('#site-info').attr('style', '');

  try {
    let protocol = (new URL(url)).protocol;

    if(protocol == 'http:') {
      $('#site-info').removeClass('secure');
      $('#site-info').addClass('insecure');
      $('#site-info > img').attr('src', 'images/alert.svg');
    }
    else if(protocol == 'https:') {
      $('#site-info').removeClass('insecure');
      $('#site-info').addClass('secure');
      $('#site-info > img').attr('src', 'images/lock.svg');
    } else {
      $('#site-info').removeClass('secure');
      $('#site-info').removeClass('insecure');
      $('#site-info > img').attr('src', 'images/search.svg');
    }
  } catch (e) {}
}
exports.setSearchIcon = setSearchIcon;

exports.init = function (doc) { document = doc }

exports.loadStart = function(view, extensions) {
  // view.tab.icon[0].outerHTML = `<div class='spinner'><svg class='svg' viewBox='22 22 44 44'>
  //   <circle class='circle' cx='44' cy='44' r='20.2' stroke-width='3.6' fill='none'>
  //   </circle></svg></div>`;

  view.tab.setTitle('Loading...');

  $('#bookmark').css('visibility', 'hidden');
  $('#refresh').children().first().attr('src','images/close.svg');

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
  $('#refresh').children().first().attr('src', 'images/refresh.svg');

  view.webContents.executeJavaScript(`document.querySelectorAll('link[rel="shortcut icon"]').length`)
    .then(r => {
      if(r > 0) {
        view.webContents.executeJavaScript(`document.querySelector('link[rel="shortcut icon"]').href`)
          .then(u => view.tab.setIcon(u));
      } else {
        let origin = new URL(view.webContents.getURL()).origin;
        view.tab.setIcon(origin + '/favicon.ico');
      }
    });

  view.tab.setTitle(view.webContents.getTitle());

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
  if(errorCode != -27 && errorCode != -3 && view.webContents.getURL() == validatedURL) {
    window.error = {errorCode: errorCode,
      errorDescription: errorDescription,
      validatedURL: validatedURL,
      darkMode: window.darkMode};
    view.webContents.loadURL('peacock://network-error');
  }
}

exports.didNavigate = function (url, view, storage) {
  view.webContents.session.ads_blocked = 0;

  try {
    let protocol = (new URL(url)).protocol;
    if(protocol.startsWith('http')) {
      storage.logHistory(url, view.webContents.getTitle());
    }
  } catch (e) {}
  setSearchIcon(url);
}

exports.enterFllscrn = function(view, screen) {
  view.setBounds({ x: 0, y: 0, width: screen.getPrimaryDisplay().size.width, height: screen.getPrimaryDisplay().size.height });
}

exports.leaveFllscrn = function(view, bounds) {
  view.setBounds({x:0, y:topbarHeight, width:bounds.width, height:bounds.height-topbarHeight});
  view.setBounds({x:0, y:topbarHeight, width:bounds.width, height:bounds.height-topbarHeight});
}

exports.domReady = function (view, storage) {
  setURLBar(view.webContents.getURL());

  view.webContents.insertCSS('input::-webkit-calendar-picker-indicator {display: none;}');

  storage.isBookmarked(view.webContents.getURL()).then((result) => {
    $('#bookmark').css('visibility', 'visible');
    $('#bookmark').children().first().attr('src', result ? 'images/bookmark-saved.svg' : 'images/bookmark.svg');
  });

  if (view.webContents.canGoBack()) { $("#back").removeAttr("disabled") } else { $("#back").attr("disabled", true) }
  if (view.webContents.canGoForward()){$("#forward").removeAttr("disabled")}else{$("#forward").attr("disabled", true)}

  if(window.theme == 'dark') {
    view.webContents.insertCSS(`
      ::-webkit-scrollbar { width: 17px; }
      ::-webkit-scrollbar-track { background-color: #2E3440;}
      ::-webkit-scrollbar-thumb { background-color: #3B4252;}
      ::-webkit-scrollbar-thumb:hover { background-color: #434C5E;}
      ::-webkit-scrollbar-corner { display: none; }`);
  }

  switch (view.webContents.getURL()) {
    case 'peacock://network-error':
      view.webContents.send('setError', window.error);
      window.error = {errorCode: '-300', validatedURL: 'peacock://network-error', darkMode: window.darkMode};
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
  setURLBar(view.webContents.getURL());
  setSearchIcon(view.webContents.getURL());

  storage.isBookmarked(view.webContents.getURL()).then((result) => {
    $('#bookmark').css('visibility', 'visible');
    $('#bookmark').attr('src', result ? 'images/bookmark-saved.svg' : 'images/bookmark.svg');
  });

  try {
    let protocol = (new URL(view.webContents)).protocol;
    if(protocol.startsWith('http')) setSearchIcon(view.webContents.getURL());
  } catch (e) {}

  try {
    if (view.webContents.canGoBack()) { $("#back").removeAttr("disabled") } else { $("#back").attr("disabled", true) }
    if (view.webContents.canGoForward()){$("#forward").removeAttr("disabled")}else{$("#forward").attr("disabled", true)}
  } catch (e) {}
}

exports.exitPointerLock = function (view) {
  view.webContents.executeJavaScript(`document.exitPointerLock();`);
}
