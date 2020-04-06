const {	ipcRenderer, dialog, BrowserWindow } = require('electron');
const {	join } = require('path');
const { format } = require('url');

async function modifyDefault (defaultVar, name, value) {
	if (Object.defineProperty) {
	  Object.defineProperty(defaultVar, name, {
			get: () => { return value }
		});
	} else if (Object.prototype.__defineGetter__) {
	  defaultVar.__defineGetter__(name, () => { return value });
	}
}

modifyDefault(navigator, 'doNotTrack', '1');
modifyDefault(navigator, 'hardwareConcurrency', Math.round(Math.random()) == 0 ? 4 : 8);
modifyDefault(screen, 'colorDepth', Math.round(Math.random()) == 0 ? 24 : 32);
navigator.getBattery = () => {};

global.alert = window.alert = (message) => {
	let url = (window.location.href.startsWith('peacock')) ? 'Peacock' : window.location.href;

	ipcRenderer.send('alert', {
		message: message,
		type: 'alert',
		url: url
	});
}

global.confirm = window.confirm = (message) => {
	let url = (window.location.href.startsWith('peacock')) ? 'Peacock' : window.location.href;

	return ipcRenderer.sendSync('alert', {
		message: message,
		type: 'confirm',
		url: url
	});
}

global.prompt = window.prompt = (message) => {
	let url = (window.location.href.startsWith('peacock')) ? 'Peacock' : window.location.href;

	return ipcRenderer.sendSync('alert', {
		message: message,
		type: 'prompt',
		url: url
	});
}

let esc_pointer = event => { if (event.keyCode === 27) { document.exitPointerLock(); } };
let esc_fullscreen = event => { if (event.keyCode === 27) { document.exitFullscreen(); } };

let pointerlockchange = async (e) => {
	if (document.pointerLockElement) {
		ipcRenderer.send('alert', {
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
		ipcRenderer.send('alert', {
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
	ipcRenderer.once('setError', (event, details) => {
		setError(details);
	});

	global.sendSync = ipcRenderer.sendSync;
	global.send = ipcRenderer.send;
}
