// PACKAGES

const {	ipcRenderer, remote } = require('electron');

// ANTI-FINGERPRINTING

async function modifyDefault (defaultVar, name, value) {
	if (Object.defineProperty) {
	  Object.defineProperty(defaultVar, name, {
			get: () => { return value }
		});
	} else if (Object.prototype.__defineGetter__) {
	  defaultVar.__defineGetter__(name, () => { return value });
	}
}

Array.prototype.random = function () {
	return this[Math.floor((Math.random()*this.length))];
}

modifyDefault(document, 'referrer', '');
modifyDefault(navigator, 'deviceMemory', undefined);
modifyDefault(navigator, 'hardwareConcurrency', [4,8].random());
modifyDefault(navigator, 'appCodeName', ['Mozilla', 'Peacock'].random());
modifyDefault(navigator, 'appName', ['Netscape', 'Peacock'].random());
modifyDefault(navigator, 'mimeTypes', [{}, navigator.mimeTypes].random());
modifyDefault(navigator, 'plugins', [{}, navigator.plugins].random());
modifyDefault(navigator, 'platform', 'Win32');
modifyDefault(screen, 'colorDepth', [24, 32, 48].random());
modifyDefault(screen, 'pixelDepth', [24, 32, 48].random());
modifyDefault(history, 'length', 1);
window.close = e => { ipcRenderer.send('closeCurrentTab', remote.getCurrentWebContents().id); };
navigator.getBattery = () => {};
if(navigator.mediaDevices) navigator.mediaDevices.enumerateDevices = ()=>{return new Promise((r)=>{r(undefined)})}

// DIALOG HANDLERS

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

// FULLSCREEN HANDLERS

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
