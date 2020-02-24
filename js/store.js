const blockchain = require('./blockchain.js');

var store;

exports.init = st => { store = st }

async function checkFiles() {
  if (store.get('settings.storage') == 'Blockstack') {
    if (blockchain.getUserSession().isUserSignedIn()) {
      blockchain.getUserSession().getFile("history.json").then(data => {
        if(data === null) {
          console.log("Creating History");
          blockchain.getUserSession().putFile("history.json", "[]");
        }
      });
      blockchain.getUserSession().getFile("bookmarks.json").then(data => {
        if(data === null) {
          console.log("Creating Bookmarks");
          blockchain.getUserSession().putFile("bookmarks.json", "[]");
        }
      });
    } else {
      console.log("Not signed into Blockstack, Blockstack required for history.");
    }
  }
}

exports.syncHistory = function () {

}

exports.getHistory = async function () {
  await checkFiles();
  let loc = store.get('settings.storage');

  if(loc === "Blockstack"){
    if (blockchain.getUserSession().isUserSignedIn()) {
      let result = await blockchain.getUserSession().getFile("history.json");
      return result;
    } else {
      console.log("Not signed into Blockstack, Blockstack required for history.");
    }
  } else if (loc === "Locally") {
    let promisio = new Promise((resolve, reject) => {
      resolve(store.get('history'));
    });
    return promisio;
  } else {
    console.error("Storage location not set.");
  }
}

exports.removeHistoryItem = async function (id) {
  await checkFiles();
  let loc = store.get('settings.storage');

  if(loc === "Blockstack"){
    if (blockchain.getUserSession().isUserSignedIn()) {
      blockchain.getUserSession().getFile("history.json").then(data => {
        var curr = JSON.parse(data).filter(item => item.id !== id);
        blockchain.getUserSession().putFile("history.json", JSON.stringify(curr));
      });
    } else {
      console.log("Not signed into Blockstack, Blockstack required to log history.");
    }
  } else {
    let removed = store.get('history').filter(item => item.id !== id);
    store.set('history', removed);
  }
}

exports.clearHistory = async function () {
  await checkFiles();
  let loc = store.get('settings.storage');

  if(loc === "Blockstack"){
    if (blockchain.getUserSession().isUserSignedIn()) {
      let result = await blockchain.getUserSession().putFile("history.json", "[]");
      return result;
    } else {
      console.log("Not signed into Blockstack, Blockstack required for to clear history.");
    }
  } else if (loc === "Locally") {
    let promisio = new Promise((resolve, reject) => {
      store.set('history', []);
      resolve();
    });
    return promisio;
  } else {
    console.error("Storage location not set.");
  }
}

exports.logHistory = async function (site, title) {
  await checkFiles();
  let loc = store.get('settings.storage');

  let id = require('uuid/v1')();
  let time = + new Date();
  let item = { "url": site, "title": title, "id": id, "time": time };

  if(loc === "Blockstack"){
    if (blockchain.getUserSession().isUserSignedIn()) {
      blockchain.getUserSession().getFile("history.json").then(data => {
        var curr = JSON.parse(data);

        if(curr[curr.length-1].url == item.url) return;

        curr.push(item);
        blockchain.getUserSession().putFile("history.json", JSON.stringify(curr));
      });
    } else {
      console.log("Not signed into Blockstack, Blockstack required to log history.");
    }
  } else {
    let curr = store.get('history');
    curr.push(item);
    store.set('history', curr);
  }
}

async function getBookmarks() {
  await checkFiles();
  let loc = store.get('settings.storage');

  if(loc === "Blockstack"){
    if (blockchain.getUserSession().isUserSignedIn()) {
      let result = await blockchain.getUserSession().getFile("bookmarks.json");
      return result;
    } else {
      console.log("Not signed into Blockstack, Blockstack required to get bookmarks.");
    }
  } else if (loc === "Locally") {
    let promisio = new Promise((resolve, reject) => {
      resolve(store.get('bookmarks'));
    });
    return promisio;
  } else {
    console.error("Storage location not set.");
  }
}

exports.getBookmarks = getBookmarks;

exports.isBookmarked = async function (url) {
  await checkFiles();
  let loc = store.get('settings.storage');

  if(loc === "Blockstack"){
    if (blockchain.getUserSession().isUserSignedIn()) {
      let promisio = new Promise((resolve, reject) => {
        blockchain.getUserSession().getFile("bookmarks.json").then(data => {
          var exists = false;
          for (var i = 0; i < data.length; i++) {
            if(data[i].url === url){ exists = true; break; }
          }
          resolve(exists);
        });
      });
      return promisio;
    } else {
      console.log("Not signed into Blockstack, Blockstack required for bookmarks.");
    }
  } else {
    let promisio = new Promise((resolve, reject) => {
      let bookmarks = store.get('bookmarks');
      var exists = false;
      for (var i = 0; i < bookmarks.length; i++) {
        if(bookmarks[i].url === url){ exists = true; break; }
      }
      resolve(exists);
    });
    return promisio;
  }
}

exports.addBookmark = async function (site, title) {
  await checkFiles();
  let loc = store.get('settings.storage');

  let id = require('uuid/v1')();
  let item = { "url": site, "title": title, "id": id };

  if(loc === "Blockstack"){
    if (blockchain.getUserSession().isUserSignedIn()) {
      blockchain.getUserSession().getFile("bookmarks.json").then(data => {
        var curr = JSON.parse(data);
        curr.push(item);
        blockchain.getUserSession().putFile("bookmarks.json", JSON.stringify(curr));
      });
    } else {
      console.log("Not signed into Blockstack, Blockstack required for bookmarks.");
    }
  } else {
    let curr = store.get('bookmarks');
    curr.push(item);
    store.set('bookmarks', curr);
  }
}

exports.removeBookmark = async function (id) {
  await checkFiles();
  let loc = store.get('settings.storage');
  let books = await getBookmarks();

  if(typeof books === "string") { books = JSON.parse(books); }

  let fixed = books.filter(item => item.id !== id);
  if(loc === "Blockstack"){
    if (blockchain.getUserSession().isUserSignedIn()) {
      let result = await blockchain.getUserSession().putFile("bookmarks.json", JSON.stringify(fixed));
      return result;
    } else {
      console.log("Not signed into Blockstack, Blockstack required to get bookmarks.");
    }
  } else if (loc === "Locally") {
    let promisio = new Promise((resolve, reject) => {
      store.set('bookmarks', fixed);
    });
    return promisio;
  } else {
    console.error("Storage location not set.");
  }
}
