exports.goBack = function(tab) {
  tab.webview.goBack();
}

exports.goForward = function(tab) {
  tab.webview.goForward();
}

exports.reload = function(tab) {
  tab.webview.reload();
}

exports.loadStart = function(theme, tab) {
  if (theme === "light") {
    tab.setIcon("images/loading-light.gif");
  } else if (theme === "dark") {
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
  doc.querySelector("#etabs-views").style.borderTop = "1px solid #eee";
  doc.querySelector("#etabs-views").style.marginTop = "97px";
}

exports.domReady = function (theme, tab) {
  if (theme === "dark") {
    tabGroup.getActiveTab().webview.insertCSS(`
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

exports.newWindow = function (event, group) {
  let thisTab = group.addTab({
    title: "",
    src: event.url,
    visible: true,
    active: true,
    webviewAttributes: {
      useragent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) peacock/2.0.43 Chrome/77.0.3865.90 Electron/3.1.13 Safari/537.36",
      partition: "persist:peacock"
    }
  });
}

exports.faviconUpdated = function (event, tab) {
  tab.setIcon(event.favicons);
}

exports.titleUpdated = function (event, tab) {
  if(event.explicitSet){tab.setTitle(event.title)}
}
