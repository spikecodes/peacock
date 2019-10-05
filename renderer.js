// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const jsonfile = require('jsonfile');
const favicon = require('favicon-getter').default;
const path = require('path');
const uuid = require('uuid');
const TabGroup = require("electron-tabs");
const dragula = require("dragula");
const bookmarks = path.join(__dirname, 'bookmarks.json');
const blockstack = require("blockstack");

const remote = require('electron').remote;
const {
	ipcRenderer
} = require('electron');

const ElectronBlocker = require('@cliqz/adblocker-electron').ElectronBlocker;
const fetch = require('cross-fetch').fetch; // required 'fetch'

var userSession = new blockstack.UserSession();

var ById = function(id) {
	return document.getElementById(id);
}

var back = ById('back'),
	forward = ById('forward'),
	refresh = ById('refresh'),
	omni = ById('url'),
	fave = ById('fave'),
	nav = ById('navigation'),
	titlebar = ById('titlebar'),
	dialog = ById('dialog'),
	dialogContainer = ById('dialog-container'),
	list = ById('list'),
	etabsGroup = ById('etabs-tabgroup'),
	etabsViews = ById('etabs-views'),
	popup = ById('fave-popup'),
	shield = ById('shieldIMG')

var tabGroup = new TabGroup({
	ready: function(tabGroup) {
		dragula([tabGroup.tabContainer], {
			direction: "horizontal"
		});
	},
	newTab: {
		title: "Google",
		src: "https://google.com",
		visible: true,
		active: true
	}
});
let tab = tabGroup.addTab({
	title: "Google",
	src: "https://google.com",
	visible: true,
	active: true
});

ipcRenderer.on('blockstackSignIn', function(event, token) {
	if(userSession.isUserSignedIn()){
		alert("We did it boys!");
		tabGroup.getActiveTab().close();
	} else {
	  userSession.handlePendingSignIn(token);
		tabGroup.getActiveTab().close();
	}
});

// ipcRenderer.on('window-closing', function(event, input) {
// 	uploadHistory();
// });

Mousetrap.bind(['ctrl+shift+a', 'command+shift+a'], function() {
	toggleAdblock();
});
Mousetrap.bind(['ctrl+tab', 'command+tab'], function() {
	let id = tabGroup.getActiveTab().id;
	let length = tabGroup.getTabs().length;
	if(length === 1){
		// Do nothing
	} else if (id === length - 1){
		tabGroup.getTab(0).activate();
	} else {
		tabGroup.getTab(id+1).activate();
	}
});
Mousetrap.bind(['ctrl+shift+tab', 'command+shift+tab'], function() {
	let id = tabGroup.getActiveTab().id;
	let length = tabGroup.getTabs().length;
	if(length === 1){
		// Do nothing
	} else if (id === 0){
		tabGroup.getTab(length - 1).activate();
	} else {
		tabGroup.getTab(id-1).activate();
	}
});
Mousetrap.bind(['ctrl+h', 'command+h'], function() {
	if(userSession.isUserSignedIn()){
		userSession.getFile("history.txt").then(data => {
			alert(data);
		});
	} else {
		signIntoBlockstack();
	}
});
Mousetrap.bind(['ctrl+l', 'command+l'], function() {
	if(userSession.isUserSignedIn()){
		userSession.putFile("history.txt", "");
	} else {
		signIntoBlockstack();
	}
});
Mousetrap.bind(['ctrl+j', 'command+j'], function() {
	if(userSession.isUserSignedIn()){
		userSession.getFile("history.txt", "").then(data => alert(data));
	} else {
		signIntoBlockstack();
	}
});

omni.focus();

console.log(window.foo);

function uploadHistory() {
	if(userSession.isUserSignedIn()){
		userSession.getFile("history.txt").then(data => {
			console.log("|" + data + "|");
			let content;
			if(data != ""){
				content = data + "," + history;
			} else {
				content = "" + history;
			}
			userSession.putFile("history.txt", content).then(() => {
				ipcRenderer.send('close-window', "now");
			});
		});
	} else {
		signIntoBlockstack();
	}
}

function signIntoBlockstack() {
	const transitPrivateKey = userSession.generateAndStoreTransitKey();
  const redirectURI = 'http://127.0.0.1:9876/callback';
  const manifestURI = 'http://127.0.0.1:9876/manifest.json';
  const scopes = blockstack.DEFAULT_SCOPE;
  const appDomain = 'http://127.0.0.1:9876';
  var authRequest = blockstack.makeAuthRequest(transitPrivateKey, redirectURI, manifestURI, scopes, appDomain);
	let url = "http://browser.blockstack.org/auth?authRequest=" + authRequest;
	tabGroup.addTab({
		title: "Blockstack",
		src: url,
		visible: true,
		active: true
	});
}

function changeAdBlock(toWhat) {
	ipcRenderer.send('adblock-change', "adblock:" + toWhat);

	if (toWhat === "on") {
		shield.src = "images/Peacock Shield.svg";
	} else if (toWhat === "off") {
		shield.src = "images/Peacock Shield Empty.svg";
	} else {
		alert("Error: Adblocker not working.");
	}

	tabGroup.getActiveTab().webview.reload();
}

function toggleAdblock() {
	let src = shield.src.replace(/\%20/g, " ").replace("file:///", "")
		.replace(/\//g, '\\').replace(__dirname, "").substr(1);
	if (src === "images/Peacock Shield.svg" || src === "images\\Peacock Shield.svg") { //If On
		changeAdBlock("off");
	} else if (src === "images/Peacock Shield Empty.svg" || src === "images\\Peacock Shield Empty.svg") { //If Off
		changeAdBlock("on");
	} else {
		console.log(src + " | " + __dirname);
	}
}

function reloadView() {
	tabGroup.getActiveTab().webview.reload();
}

function backView() {
	tabGroup.getActiveTab().webview.goBack();
}

function forwardView() {
	tabGroup.getActiveTab().webview.goForward();
}

function updateURL(event) {
	if (event.keyCode === 13) {
		omni.blur();
		let val = omni.value.toLowerCase();
		if (val.startsWith('peacock://')) {
			let url = path.normalize(`${__dirname}/pages/${val.substr(10)}.html`);
			tabGroup.getActiveTab().webview.loadURL(url);
		} else if (val.startsWith('https://')) {
			tabGroup.getActiveTab().webview.loadURL(val);
		} else if (val.startsWith('http://')) {
			tabGroup.getActiveTab().webview.loadURL(val);
		} else {
			tabGroup.getActiveTab().webview.loadURL('https://' + val);
		}
	}
}

var Bookmark = function(id, url, faviconUrl, title) {
	this.id = id;
	this.url = url;
	this.icon = faviconUrl;
	this.title = title;
}

Bookmark.prototype.ELEMENT = function() {
	var a_tag = document.createElement('a');
	a_tag.href = this.url;
	a_tag.className = 'link';
	a_tag.textContent = this.title;
	var favimage = document.createElement('img');
	favimage.src = this.icon;
	favimage.className = 'favicon';
	a_tag.insertBefore(favimage, a_tag.childNodes[0]);
	return a_tag;
}

function addBookmark() {
	let url = tabGroup.getActiveTab().webview.src;
	let title = tabGroup.getActiveTab().webview.getTitle();
	favicon(url).then(function(fav) {
		let book = new Bookmark(uuid.v1(), url, fav, title);
		jsonfile.readFile(bookmarks, function(err, curr) {
			curr.push(book);
			jsonfile.writeFile(bookmarks, curr, function(err) {})
		});
	})
}

function openPopUp(event) {
	let state = popup.getAttribute('data-state');
	if (state === 'closed') {
		popup.innerHTML = '';
		jsonfile.readFile(bookmarks, function(err, obj) {
			if (obj.length !== 0) {
				for (var i = 0; i < obj.length; i++) {
					let url = obj[i].url;
					let icon;
					if (obj[i].icon != 'blank favicon') {
						icon = obj[i].icon;
					} else {
						icon = 'images/blank.png';
					}
					let id = obj[i].id;
					let title = obj[i].title;
					let bookmark = new Bookmark(id, url, icon, title);
					let el = bookmark.ELEMENT();
					popup.appendChild(el);
				}
			}
			popup.style.display = 'block';
			popup.style.opacity = '1';
			popup.setAttribute('data-state', 'open');
		});
	} else {
		popup.style.opacity = '0';
		popup.style.display = 'none';
		popup.setAttribute('data-state', 'closed');
	}
}

function handleUrl(event) {
	if (event.target.className === 'link') {
		event.preventDefault();
		tabGroup.getActiveTab().webview.loadURL(event.target.href);
	} else if (event.target.className === 'favicon') {
		event.preventDefault();
		tabGroup.getActiveTab().webview.loadURL(event.target.parentElement.href);
	}
}

function updateNav(event) {
	tabGroup.getActiveTab().setTitle(tabGroup.getActiveTab().webview.getTitle());
	let currentURL = tabGroup.getActiveTab().webview.src.substr(8).replace(/\//g, '\\');

	if(currentURL.startsWith(path.normalize(`${__dirname}\\pages\\`))) {
		let protocolVal = currentURL.replace(path.normalize(`${__dirname}\\pages\\`), "").split(".")[0];
		omni.value = 'peacock://' + protocolVal;
	} else {
		userSession.getFile("history.txt").then(data => {
			let content = data + tabGroup.getActiveTab().webview.src + ",";
			userSession.putFile("history.txt", content);
		});

		omni.value = tabGroup.getActiveTab().webview.src;

		let url = tabGroup.getActiveTab().webview.src;
		favicon(url).then(function(fav) {
			if (fav != 'blank favicon') {
				tabGroup.getActiveTab().setIcon(fav);
			} else {
				tabGroup.getActiveTab().setIcon('images/blank.png');
			}
		});
	}

}

function updateTargetURL(event) {
	if (event.url != "") {
		dialogContainer.style.display = "block";
		dialog.innerHTML = event.url;
	} else {
		dialogContainer.style.display = "none";
		dialog.innerHTML = "ERROR";
	}
}

function enterFullscreen() {
	nav.style.display = 'none';
	titlebar.style.display = 'none';
	etabsGroup.style.display = 'none';
	etabsViews.style.borderTop = 'none';
	etabsViews.style.marginTop = '0px';
}

function leaveFullscreen() {
	nav.style.display = 'block';
	titlebar.style.display = 'block';
	etabsGroup.style.display = 'block';
	etabsViews.style.borderTop = '1px solid #eee';
	etabsViews.style.marginTop = '100px';
}

tabGroup.on("tab-active", (tab, tabGroup) => {
	tabGroup.getActiveTab().webview.addEventListener('did-finish-load', updateNav);
	tabGroup.getActiveTab().webview.addEventListener('enter-html-full-screen', enterFullscreen);
	tabGroup.getActiveTab().webview.addEventListener('leave-html-full-screen', leaveFullscreen);
	tabGroup.getActiveTab().webview.addEventListener('update-target-url', updateTargetURL);
	let url = tabGroup.getActiveTab().webview.src;
	favicon(url).then(function(fav) {
		if (fav != 'blank favicon') {
			tab.setIcon(fav);
		} else {
			tab.setIcon('images/blank.png');
		}
	});
});

ById("shield").addEventListener('click', toggleAdblock);
refresh.addEventListener('click', reloadView);
back.addEventListener('click', backView);
forward.addEventListener('click', forwardView);
omni.addEventListener('keydown', updateURL);
fave.addEventListener('click', addBookmark);
list.addEventListener('click', openPopUp);
popup.addEventListener('click', handleUrl);
tabGroup.getActiveTab().webview.addEventListener('did-finish-load', updateNav);
tabGroup.getActiveTab().webview.addEventListener('enter-html-full-screen', enterFullscreen);
tabGroup.getActiveTab().webview.addEventListener('leave-html-full-screen', leaveFullscreen);
tabGroup.getActiveTab().webview.addEventListener('update-target-url', updateTargetURL);
