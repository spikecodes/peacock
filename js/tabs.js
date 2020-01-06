var tabGroup;
var closedTabs = [];

function closeTab(tab) {
  tab = tab || this.current();

  let it = tab.tab;

  closedTabs.push(tab.webview.src);

  $(it).css('transition', 'all 0.1s !important');
  $(it).fadeSlideLeft(100, async () => {
    setTimeout(async function () {
      tab.close();
      $(it).css('transition', 'all 0.0s !important');
    }, 200);
  });
}

$.fn.fadeSlideLeft = function(speed,fn) {
  return $(this).animate({
    'opacity' : 0,
    'width' : '0px'
  },speed || 400,function() {
    $.isFunction(fn) && fn.call(this);
  });
}

$.fn.fadeSlideRight = function(speed,fn) {
  return $(this).animate({
    'opacity' : 1,
    'width' : '262px'
  },speed || 400,function() {
    $.isFunction(fn) && fn.call(this);
  });
}

exports.openClosedTab = function () {
  if(closedTabs.length == 0) return;
  let item = closedTabs[closedTabs.length-1];
  this.new(item, item);
  closedTabs.pop(item);
}

exports.new = function (docTitle, url, callback=()=>{}, background=false) {
  let tab = tabGroup.addTab({
    title: docTitle,
    src: url,
    visible: true,
    active: !background,
    webviewAttributes: {
      partition: "persist:peacock",
      sandbox: true,
      preload: 'js/preload.js',
      disablewebsecurity: true
    },
    ready: function (tab) {
      $(tab.tabElements.buttons.firstElementChild).replaceWith($(tab.tabElements.buttons.firstElementChild).clone());
      $(tab.tabElements.buttons.firstElementChild).click(function() { closeTab(tab); });
      callback();
    }
  });

  let it = tab.tab;

  $(it).css('opacity', '0');
  $(it).css('width', '60px');
  $(it).css('transition', 'all 0.1s');
  $(it).fadeSlideRight(100);

  return tab;
}

exports.close = closeTab;

exports.current = function () {
  return tabGroup.getActiveTab();
}

exports.all = function () { return tabGroup.getTabs(); }

exports.get = function (index) { return tabGroup.getTab(index); }

exports.length = function () {
  return tabGroup.getTabs().length;
}

exports.makeTabGroup = function (newTab_title, newTab_url, callback=()=>{}) {
  const TabGroup = require("electron-tabs");
  let newTab = this.new;
  tabGroup = new TabGroup({
    ready: function(tabGroup) {
      let drake = require("dragula")([tabGroup.tabContainer], {
        direction: 'horizontal',
        moves: function (el, container, handle) {
         return $(handle).attr('class') != 'etabs-tab-button-close';
       }
      });

      $('.etabs-tab-button-new').replaceWith($('.etabs-tab-button-new').clone());
      $('.etabs-tab-button-new').click(async () => { newTab(newTab_title, newTab_url); });
      $('.etabs-tab-button-new').attr('title', 'New tab');

      callback(tabGroup);
    },
    newTab: {
     title: newTab_title,
     src: newTab_url,
     visible: true,
     active: true,
     webviewAttributes: {
       partition: "persist:peacock",
       sandbox: true,
       plugins: false,
       preload: 'js/preload.js',
       disablewebsecurity: true
     }
    }
  });

  tabGroup.tabContainer.nextElementSibling.firstElementChild.innerHTML = `<img src="images/plus.svg">`;

  return tabGroup;
}
exports.getTabGroup = function () { return tabGroup; }

exports.added = function (callback) { tabGroup.on('tab-added', callback); }
exports.removed = function (callback) { tabGroup.on('tab-removed', callback); }
exports.active = function (callback) { tabGroup.on('tab-active', callback); }
