const {	ipcRenderer } = require('electron');
const {	dialog,	BrowserWindow } = require('electron').remote;
const {	join } = require('path');
const { format } = require('url');

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

window.addEventListener('DOMContentLoaded', (event) => {
	setTimeout(function () {
		document.querySelectorAll('input[type="email"]').forEach((box, i) => {
			if(box.getAttribute('list')) return;

			let list = document.createElement('datalist');
			list.id = 'peacock-list';
			list.innerHTML = '<option value="Create Mail Alias">';
			document.body.appendChild(list);

			box.setAttribute('list', 'peacock-list');

			box.addEventListener('input', (event) => {
				if(event.target.value == 'Create Mail Alias') {
					event.target.value = 'Creating Mail Alias...';

					let r = Math.random().toString(36).substring(7);

					let route = ipcRenderer.sendSync('mail', 'new', { alias: r, name: document.title });
					if(!route.message.startsWith('error')) {
						console.log(route.route);
						event.target.value = r + '@mail.peacock.link';
					} else {
						ipcRenderer.send('alert', {
							message: route.message,
							type: 'alert',
							url: 'Peacock'
						});
						event.target.value = '';
					}
				}
			});
		});
	}, 1000);
});

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

	ipcRenderer.once('setVersions', (event, versions) => {
		setVersions(versions);
	});

	global.sendSync = ipcRenderer.sendSync;
	global.send = ipcRenderer.send;
}
