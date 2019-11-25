const blockchain = require('./blockchain.js');
const jsonfile = require('jsonfile');

const settingsFile = require('path').join(__dirname, "../data/settings.json");
const bookmarks = require("path").join(__dirname, "../data/bookmarks.json");
const historyFile = require('path').join(__dirname, "../data/history.json");

async function checkFiles() {
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

async function storeLocation() {
  let promisio = new Promise((resolve, reject) => {
    jsonfile.readFile(settingsFile, function (err, obj) {
      if(err) { reject(); }
      resolve(obj.storage);
    });
  });
  return promisio;
}

exports.syncHistory = function () {

}

exports.getHistory = async function () {
  await checkFiles();
  let loc = await storeLocation();

  if(loc === "Blockstack"){
    if (blockchain.getUserSession().isUserSignedIn()) {
      let result = await blockchain.getUserSession().getFile("history.json");
      return result;
    } else {
      console.log("Not signed into Blockstack, Blockstack required for history.");
    }
  } else if (loc === "Locally") {
    let promisio = new Promise((resolve, reject) => {
      jsonfile.readFile(historyFile, function (err, obj) {
        if(err) { reject(); }
        resolve(obj);
      });
    });
    return promisio;
  } else {
    console.error("Storage location not set.");
  }
}

exports.clearHistory = async function () {
  await checkFiles();
  let loc = await storeLocation();

  if(loc === "Blockstack"){
    if (blockchain.getUserSession().isUserSignedIn()) {
      let result = await blockchain.getUserSession().putFile("history.json", "[]");
      return result;
    } else {
      console.log("Not signed into Blockstack, Blockstack required for to clear history.");
    }
  } else if (loc === "Locally") {
    let promisio = new Promise((resolve, reject) => {
      jsonfile.writeFile(historyFile, [], function(err) {
        if(err) { reject(); } else { resolve(); }
      });
    });
    return promisio;
  } else {
    console.error("Storage location not set.");
  }
}

exports.logHistory = async function (site, title) {
  await checkFiles();
  let loc = await storeLocation();

  let item = {};
  item.id = require("uuid").v1();
  item.url = site;
  item.icon = `https://www.google.com/s2/favicons?domain=${site}`;
  item.title = title;

  if(loc === "Blockstack"){
    if (blockchain.getUserSession().isUserSignedIn()) {
      blockchain.getUserSession().getFile("history.json").then(data => {
        var curr = JSON.parse(data);
        curr.push(item);
        blockchain.getUserSession().putFile("history.json", JSON.stringify(curr));
      });
    } else {
      console.log("Not signed into Blockstack, Blockstack required to log history.");
    }
  } else {
    jsonfile.readFile(historyFile, function(err, curr) {
      curr.push(item);
      jsonfile.writeFile(historyFile, curr, function(err) {});
    });
  }
}

async function getBookmarks() {
  await checkFiles();
  let loc = await storeLocation();

  if(loc === "Blockstack"){
    if (blockchain.getUserSession().isUserSignedIn()) {
      let result = await blockchain.getUserSession().getFile("bookmarks.json");
      return result;
    } else {
      console.log("Not signed into Blockstack, Blockstack required to get bookmarks.");
    }
  } else if (loc === "Locally") {
    let promisio = new Promise((resolve, reject) => {
      jsonfile.readFile(bookmarks, function (err, obj) {
        if(err) { reject(); }
        resolve(obj);
      });
    });
    return promisio;
  } else {
    console.error("Storage location not set.");
  }
}

exports.getBookmarks = async function () {
  await checkFiles();
  let loc = await storeLocation();

  if(loc === "Blockstack"){
    if (blockchain.getUserSession().isUserSignedIn()) {
      let result = await blockchain.getUserSession().getFile("bookmarks.json");
      return result;
    } else {
      console.log("Not signed into Blockstack, Blockstack required to get bookmarks.");
    }
  } else if (loc === "Locally") {
    let promisio = new Promise((resolve, reject) => {
      jsonfile.readFile(bookmarks, function (err, obj) {
        if(err) { reject(); }
        resolve(obj);
      });
    });
    return promisio;
  } else {
    console.error("Storage location not set.");
  }
}

exports.isBookmarked = async function (url) {
  if(loc === "Blockstack"){
    if (blockchain.getUserSession().isUserSignedIn()) {
      let promisio = new Promise((resolve, reject) => {
        blockchain.getUserSession().getFile("bookmarks.json").then(data => {
          var exists = false;
          for (var i = 0; i < data.length; i++) {
            if(data[i].url === url){
              exists = true;
              resolve(true);
            }
          }
          if(exists === false){ resolve(false); }
          else { resolve(true); }
        });
      });
      return promisio;
    } else {
      console.log("Not signed into Blockstack, Blockstack required for bookmarks.");
    }
  } else {
    let promisio = new Promise((resolve, reject) => {
      jsonfile.readFile(bookmarks, function(err, data) {
        var exists = false;
        for (var i = 0; i < data.length; i++) {
          if(data[i].url === url){
            resolve(true);
          }
        }
        if(exists === false){ resolve(false); }
      });
    });
    return promisio;
  }
}

exports.addBookmark = async function (site, title) {
  await checkFiles();
  let loc = await storeLocation();

  let item = {};
  item.id = require("uuid").v1();
  item.url = site;
  item.icon = `https://www.google.com/s2/favicons?domain=${site}`;
  item.title = title;

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
    jsonfile.readFile(bookmarks, function(err, curr) {
      curr.push(item);
      jsonfile.writeFile(bookmarks, curr, function(err) {});
    });
  }
}

exports.removeBookmark = async function (url) {
  await checkFiles();
  let loc = await storeLocation();
  let books = await getBookmarks();

  if(typeof books === "string") { books = JSON.parse(books); }

  let fixed = books.filter(item => item.url !== url);
  if(loc === "Blockstack"){
    if (blockchain.getUserSession().isUserSignedIn()) {
      let result = await blockchain.getUserSession().putFile("bookmarks.json", JSON.stringify(fixed));
      return result;
    } else {
      console.log("Not signed into Blockstack, Blockstack required to get bookmarks.");
    }
  } else if (loc === "Locally") {
    let promisio = new Promise((resolve, reject) => {
      jsonfile.writeFile(bookmarks, fixed, function (err) {
        if(err) { reject(); }
        resolve();
      });
    });
    return promisio;
  } else {
    console.error("Storage location not set.");
  }
}
