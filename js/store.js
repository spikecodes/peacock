const { v1 } = require('uuid');

var store;

exports.init = st => { store = st }

async function set (key, value) { store.set(key, value); }

exports.getHistory = async () => store.get('history');
exports.getBookmarks = async () => store.get('bookmarks');

exports.removeHistoryItem = async function (id) {
  let removed = (await this.getHistory()).filter(item => item.id !== id)
  return set('history', removed);
}

exports.removeBookmark = async function (id) {
  let fixed = (await this.getBookmarks()).filter(item => item.id !== id);
  return set('bookmarks', fixed);
}

exports.clearHistory = async function () {
  return set('history', []);
}

exports.logHistory = async function (site, title) {
  let curr = await this.getHistory();
  curr.push({ "url": site, "title": title, "id": v1(), "time": + new Date() });
  return set('history', curr);
}

exports.addBookmark = async function (site, title) {
  let curr = await this.getBookmarks();
  curr.push({ "url": site, "title": title, "id": v1() });
  return set('bookmarks', curr);
}

exports.isBookmarked = async function (url) {
  let bookmarks = await this.getBookmarks();
  var exists = false;
  for (var i = 0; i < bookmarks.length; i++) {
    if(bookmarks[i].url === url){ exists = bookmarks[i]; break; }
  }
  return exists;
}

exports.renameBookmark = async function (id, name) {
  let renamedArray = (await this.getBookmarks()).map(item => {
    if(item.id == id) { item.title=name; return item }
    else { return item }
  });
  return set('bookmarks', renamedArray);
}
