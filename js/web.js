var id;

exports.loadStart = function(tab) {
  if (window.theme === "light") {
    tab.setIcon("images/loading-light.gif");
  } else if (window.theme === "dark") {
    tab.setIcon("images/loading-dark.gif");
  } else if (window.theme === "default") {
    if(window.darkMode) {
      tab.setIcon("images/loading-dark.gif");
    } else {
      tab.setIcon("images/loading-light.gif");
    }
  }
}

exports.loadStop = function(tab) {
  let src = new URL(tab.webview.src);
  let fav = `https://www.google.com/s2/favicons?domain=${src.origin}`;
  tab.setIcon(fav);
}

exports.enterFllscrn = function(doc) {
  doc.getElementById("navigation").style.display = "none";
  doc.getElementById("titlebar").style.display = "none";
  doc.getElementById("etabs-tabgroup").style.display = "none";
  doc.getElementById("etabs-views").style.borderTop = "none";
  doc.getElementById("etabs-views").style.marginTop = "0px";
}

exports.leaveFllscrn = function(doc) {
  doc.getElementById("navigation").style.display = "block";
  doc.getElementById("titlebar").style.display = "block";
  doc.getElementById("etabs-tabgroup").style.display = "block";
  doc.getElementById("etabs-views").style.marginTop = "97px";
}

exports.domReady = function (webview) {
  webview.blur();
  webview.focus();

  if (window.theme === "dark" || (window.theme === "default" && window.darkMode)) {
    webview.insertCSS(`
  		::-webkit-scrollbar{width:10px}::-webkit-scrollbar-track{background:#2e3033}
      ::-webkit-scrollbar-thumb{background-color:rgba(255,255,255,.5)}`);
  }
}

exports.updateTargetURL = function (event, doc) {
  if (event.url != "") {
    doc.getElementById("dialog-container").style.opacity = 0.95;
    doc.getElementById("dialog").innerHTML = event.url;
  } else {
    doc.getElementById("dialog-container").style.opacity = 0;
  }
}

exports.newWindow = function (event, legit=false, tabs) {
  if(legit){
    tabs.newTab("", event.url);
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

exports.changeThemeColor = function (event, doc) {
  doc.querySelector(".etabs-tab.active").style.boxShadow = `inset 0px 0px 0px 1px ${event.themeColor}`;
}
