const {	ipcRenderer } = require('electron');
const {	dialog,	BrowserWindow } = require('electron').remote;
const {	join } = require('path');
const { format } = require('url');

global.alert = (message) => {
	ipcRenderer.sendToHost('alert', {
		message: message,
		type: 'alert',
		url: window.location.href
	});
}

global.confirm = (text) => {
	const dialogOptions = {
		type: 'info',
		buttons: ['OK', 'Cancel'],
		message: text
	};
	return dialog.showMessageBoxSync(dialogOptions);
}

// setTimeout(async () => {
//  document.body.requestPointerLock()
// }, 1000);

let esc_pointer = event => { if (event.keyCode === 27) { document.exitPointerLock(); } };
let esc_fullscreen = event => { if (event.keyCode === 27) { document.exitFullscreen(); } };

let pointerlockchange = async (e) => {
	if (document.pointerLockElement) {
		ipcRenderer.sendToHost('alert', {
			message: 'Press <span>ESC</span> to show your cursor',
			type: 'message',
			duration: 5000
		});

    document.addEventListener("keydown", esc_pointer);
	} else {
    document.removeEventListener("keydown", esc_pointer);
  }
};
let fullscreenchange = async (e) => {
  console.log('fullscreenchange');
	if (document.fullscreenElement) {
		ipcRenderer.sendToHost('alert', {
			message: 'Press <span>ESC</span> to exit fullscreen',
			type: 'message',
			duration: 5000
		});

    document.addEventListener("keydown", esc_fullscreen);
	} else {
    document.removeEventListener("keydown", esc_fullscreen);
  }
}

document.addEventListener('pointerlockchange', pointerlockchange, false);

document.addEventListener('fullscreenchange', fullscreenchange);
document.addEventListener('webkitfullscreenchange', fullscreenchange);

if (window.location.protocol == 'peacock:') {

	ipcRenderer.once('loadFlags', (event, data) => {
		let json = JSON.parse(data);

		setEnabled(Object.keys(json));
	});

	ipcRenderer.once('setError', (event, details) => {
		setError(details);
	});

	ipcRenderer.once('setVersions', (event, versions) => {
		setVersions(versions);
	});

	ipcRenderer.once('sendBookmarks', (event, bookmarks) => {
		listSites(bookmarks);
	});

	global.richSendToHost = (channel, purpose, args) => {
		ipcRenderer.sendToHost(channel, purpose, args);
	}

	global.sendToHost = (channel, message) => {
		ipcRenderer.sendToHost(channel, message);
	}
}
