const Store = require('electron-store');
const { v1 } = require('uuid');

const history = new Store({ name: 'history' });
const bookmarks = new Store({ name: 'bookmarks' });

history.set('app', 'peacock');
bookmarks.set('app', 'peacock');

history.delete('app');
bookmarks.delete('app');

window.hist = history;

exports.getHistory = async () => history.get();
exports.getBookmarks = async () => bookmarks.get();

exports.removeHistoryItem = async function (id) {
  return history.delete(id);
}

exports.removeBookmark = async function (id) {
  return bookmarks.delete(id);
}

exports.clearHistory = async function () {
  return history.clear();
}

exports.logHistory = async function (site, title) {
  console.log('history being set!');
  
  let id = v1();
  let item = { "url": site, "title": title, "time": + new Date() };
  return history.set(id, item);
}

exports.addBookmark = async function (site, title) {
  let id = v1();
  let item = { "url": site, "title": title };
  return bookmarks.set(id, item);
}

exports.isBookmarked = async function (url) {
  try {
    let bookmarks = bookmarks.get();
  } catch (error) {
    return false;
  }
  var exists = false;
  for (var i = 0; i < bookmarks.length; i++) {
    if(bookmarks[i].url === url){ exists = bookmarks[i]; break; }
  }
  return exists;
}

exports.renameBookmark = async function (id, name) {
  let bookmark = history.get(id);
  bookmark.title = name;
  history.set(id, bookmark);
}
