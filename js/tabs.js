var tabGroup;

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

exports.new = function (docTitle, url, callback=function () {}) {
  let tab = tabGroup.addTab({
    title: docTitle,
    src: url,
    visible: true,
    active: true,
    webviewAttributes: {
      partition: "persist:peacock",
      sandbox: true,
      plugins: false,
      preload: 'js/preload.js'
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

  console.log("NEW TAB: " + url);
}

function closeTab(tab) {
  tab = tab || this.current();

  let it = tab.tab;

  $(it).css('transition', 'all 0.1s');
  $(it).fadeSlideLeft(100, async () => {
    setTimeout(async function () {
      tab.close();
      $(it).css('transition', 'all 0.05s');
    }, 200);
  });
}

exports.close = closeTab;

exports.current = function () {
  return tabGroup.getActiveTab();
}

exports.makeTabGroup = function (newTab_title, newTab_url) {
  const TabGroup = require("electron-tabs");
  let newTab = this.new;
  tabGroup = new TabGroup({
    ready: function(tabGroup) {
     require("dragula")([tabGroup.tabContainer], {
       direction: 'vertical',
       moves: function (el, container, handle) {
         return $(handle).attr('class') != 'etabs-tab-button-close';
       }
     });

     $('.etabs-tab-button-new').replaceWith($('.etabs-tab-button-new').clone());
     $('.etabs-tab-button-new').click(async () => { newTab("DuckDuckGo", "https://duckduckgo.com/"); });
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
       preload: 'js/preload.js'
     }
    }
  });

  tabGroup.tabContainer.nextElementSibling.firstElementChild.innerHTML = `<img src="images/plus.svg">`;

  return tabGroup;
}
exports.getTabGroup = function () { return tabGroup; }
