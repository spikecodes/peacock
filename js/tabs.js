const TabGroup = require("electron-tabs");
const dragula = require("dragula");

var tabGroup;

exports.newTab = function (docTitle, url) {
  tabGroup.addTab({
    title: docTitle,
    src: url,
    visible: true,
    active: true,
    webviewAttributes: {
      useragent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) peacock/2.0.43 Chrome/77.0.3865.90 Electron/3.1.13 Safari/537.36",
      partition: "persist:peacock"
    }
  });
}

exports.makeTabGroup = function () {
  tabGroup = new TabGroup({
    ready: function(tabGroup) {
     dragula([tabGroup.tabContainer], {
       direction: "horizontal"
     });
    },
    newTab: {
     title: "Google",
     src: "https://google.com",
     visible: true,
     active: true,
     webviewAttributes: {
       useragent:
         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) peacock/2.0.43 Chrome/77.0.3865.90 Electron/3.1.13 Safari/537.36",
       partition: "persist:peacock"
     }
    }
  });
  return tabGroup;
}
exports.getTabGroup = function () { return tabGroup; }
