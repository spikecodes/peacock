const {	ipcRenderer, remote } = require('electron');

async function modifyDefault (defaultVar, name, value) {
	if (Object.defineProperty) {
	  Object.defineProperty(defaultVar, name, {
			get: () => { return value }
		});
	} else if (Object.prototype.__defineGetter__) {
	  defaultVar.__defineGetter__(name, () => { return value });
	}
}

modifyDefault(document, 'referrer', '');
modifyDefault(navigator, 'doNotTrack', '1');
modifyDefault(navigator, 'deviceMemory', undefined);
modifyDefault(navigator, 'hardwareConcurrency', Math.round(Math.random()) == 0 ? 4 : 8);
modifyDefault(navigator, 'appCodeName', Math.round(Math.random()) == 0 ? 'Mozilla' : 'Peacock');
modifyDefault(navigator, 'appName', Math.round(Math.random()) == 0 ? 'Netscape' : 'Peacock');
modifyDefault(navigator, 'mimeTypes', Math.round(Math.random()) == 0 ? {} : navigator.mimeTypes);
modifyDefault(navigator, 'plugins', Math.round(Math.random()) == 0 ? {} : navigator.plugins);
modifyDefault(screen, 'colorDepth', Math.round(Math.random()) == 0 ? 24 : 32);
window.close = e => { ipcRenderer.send('closeCurrentTab', remote.getCurrentWebContents().id); };
navigator.getBattery = () => {};
if(navigator.mediaDevices) navigator.mediaDevices.enumerateDevices = ()=>{return new Promise((r)=>{r(undefined)})}

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

// PDF Reader

// window.addEventListener('load', async e => {
// 	if(document.querySelectorAll('embed[type="application/pdf"]').length == 1) {
// 		document.body.innerHTML = `<iframe style="position: absolute; height: 100%; width: 100%; border: none;"
// 			src="https://peacock-pdf.spikethecoder.repl.co/web/viewer.html?file=https://cors-anywhere.herokuapp.com/${window.location.href}"></iframe>`;
// 	}
// });

// IPC FEATURES

if (window.location.protocol == 'peacock:' || window.location.protocol == 'file:') {
	ipcRenderer.once('setError', (event, details) => {
		setError(details);
	});

	global.sendSync = ipcRenderer.sendSync;
	global.send = ipcRenderer.send;
}
