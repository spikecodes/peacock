// PACKAGE LOADING

const Store = require('electron-store'); // Used for readable/writable storage
const { v1 } = require('uuid'); // Used to generate random IDs for each history item

// ENCRYPTION

// const keytar = require('keytar');
// var pass = v1();
// keytar.getPassword('peacock', 'encryptionKey').then(r => {
//   console.log(r, pass);
//   if(!r) keytar.setPassword('peacock', 'encryptionKey', pass);
//   else pass = r;
// });

// STORAGE FILE INIT

// Initialize the ElectronStore objects:
const history = new Store({ name: 'history' });
const bookmarks = new Store({ name: 'bookmarks' });

// Create history.json and bookmarks.json:
history.set('app', 'peacock');
bookmarks.set('app', 'peacock');

history.delete('app');
bookmarks.delete('app');

// Globalize history for debugging:
window.hist = history;

// FUNCTIONS

// Manage history:
exports.getHistory = async () => history.get(); // Returns all contents of history.json

exports.removeHistoryItem = async () => history.delete(id);

exports.clearHistory = async () => history.clear();

exports.logHistory = async function (site, title) {
	let id = v1();
	let item = { "url": site, "title": title, "time": + new Date() };
	return history.set(id, item);
}

// Manage bookmarks:
exports.getBookmarks = async () => bookmarks.get(); // Returns all contents of bookmarks.json

exports.removeBookmark = async id => bookmarks.delete(id);

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
