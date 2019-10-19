const tabs = require('./tabs.js');

exports.goBack = function(tab) {
  tab.webview.goBack();
}

exports.goForward = function(tab) {
  tab.webview.goForward();
}

exports.reload = function(tab) {
  tab.webview.reload();
}

exports.loadStart = function(tab) {
  if (window.theme  === "light") {
    tab.setIcon("images/loading-light.gif");
  } else if (window.theme  === "dark") {
    tab.setIcon("images/loading-dark.gif");
  } else {
    console.error("Theme not specified.");
  }
}

exports.loadStop = function(tab) {
  let url = tab.webview.src;
  tab.setIcon(`https://www.google.com/s2/favicons?domain=${url}`);
}

exports.enterFllscrn = function(doc) {
  doc.querySelector("#navigation").style.display = "none";
  doc.querySelector("#titlebar").style.display = "none";
  doc.querySelector("#etabs-tabgroup").style.display = "none";
  doc.querySelector("#etabs-views").style.borderTop = "none";
  doc.querySelector("#etabs-views").style.marginTop = "0px";
}

exports.leaveFllscrn = function(doc) {
  doc.querySelector("#navigation").style.display = "block";
  doc.querySelector("#titlebar").style.display = "block";
  doc.querySelector("#etabs-tabgroup").style.display = "block";
  if(window.theme === "light"){
    doc.querySelector("#etabs-views").style.borderTop = "1px solid #eee";
    doc.querySelector("#etabs-views").style.marginTop = "97px";
  } else {
    doc.querySelector("#etabs-views").style.borderTop = "none";
    doc.querySelector("#etabs-views").style.marginTop = "97px";
  }
}

exports.domReady = function () {
  if (window.theme === "dark") {
    tabs.getTabGroup().getActiveTab().webview.insertCSS(`
  		::-webkit-scrollbar{width:10px}::-webkit-scrollbar-track{background:#2e3033}
      ::-webkit-scrollbar-thumb{background-color:rgba(255,255,255,.5)}`);
  }
}

exports.updateTargetURL = function (event, doc) {
  if (event.url != "") {
    doc.querySelector("#dialog-container").style.opacity = 0.9;
    doc.querySelector("#dialog").innerHTML = event.url;
  } else {
    doc.querySelector("#dialog-container").style.opacity = 0;
  }
}

exports.newWindow = function (event, legit=false) {
  if(legit){
    console.log("newtab");
    tabs.newTab("", event.url);
  }
}

exports.faviconUpdated = function (event) {
  tabs.getTabGroup().getActiveTab().setIcon(event.favicons);
}

exports.titleUpdated = function (event) {
  if(event.explicitSet){
    tabs.getTabGroup().getActiveTab().setTitle(event.title)
  }
}

exports.updateURL = function (event) {
  if (event.target.className === "link") {
    event.preventDefault();
    tabs.getTabGroup().getActiveTab().getActiveTab().webview.loadURL(event.target.href);
  } else if (event.target.className === "favicon") {
    event.preventDefault();
    tabs.getTabGroup().getActiveTab().getActiveTab().webview.loadURL(event.target.parentElement.href);
  }
}
