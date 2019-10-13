const electron = require('electron')
const {
	ipcMain
} = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
const session = electron.session
const protocol = electron.protocol

// const ExtensibleSession = require('electron-extensions/main').ExtensibleSession;

const { Menu, MenuItem } = require('electron');

const path = require('path')
const url = require('url')

const ElectronBlocker = require('@cliqz/adblocker-electron').ElectronBlocker;
const fetch = require('cross-fetch').fetch; // required 'fetch'

const blockstack = require('blockstack');
const queryString = require('query-string').queryString;
const cp = require('child_process');

const menuTemplate = [
		{
			label: 'Window',
			submenu: [
				{
					label: 'Open Settings',
					accelerator: 'CmdOrCtrl+Shift+S',
					click: () => {
						mainWindow.webContents.send('keyboardShortcut', 'settings');
					}
				},
				{
					label: 'Open DevTools',
					accelerator: 'CmdOrCtrl+Shift+I',
					click: () => {
						if(mainWindow.isDevToolsOpened()){
							mainWindow.closeDevTools();
						} else {
							mainWindow.openDevTools();
						}
					}
				},
				{
					label: 'Restart Peacock',
					accelerator: 'CmdOrCtrl+Alt+R',
					click: () => {
						// mainWindow.webContents.send('keyboardShortcut', 'restart');
						app.relaunch();
						app.exit(0);
					}
				},
				{
					label: 'Open History',
					accelerator: 'CmdOrCtrl+H',
					click: () => {
						mainWindow.webContents.send('keyboardShortcut', 'history');
					}
				},
				{
					label: 'Clear History',
					accelerator: 'CmdOrCtrl+Shift+H',
					click: () => {
						mainWindow.webContents.send('keyboardShortcut', 'clearHistory');
					}
				}
			]
		},
		{
			label: 'Website',
			submenu: [
				{
					label: 'Open DevTools',
					accelerator: 'CmdOrCtrl+Alt+I',
					click: () => {
						mainWindow.webContents.send('keyboardShortcut', 'devTools');
					}
				}
			]
		},
		{
			label: 'Tabs',
			submenu: [
				{
					label: 'Next Tab',
					accelerator: 'CmdOrCtrl+Tab',
					click: () => {
						mainWindow.webContents.send('keyboardShortcut', 'nextTab');
					}
				},
				{
					label: 'Previous Tab',
					accelerator: 'CmdOrCtrl+Shift+Tab',
					click: () => {
						mainWindow.webContents.send('keyboardShortcut', 'backTab');
					}
				},
				{
					label: 'New Tab',
					accelerator: 'CmdOrCtrl+T',
					click: () => {
						mainWindow.webContents.send('keyboardShortcut', 'newTab');
					}
				},
				{
					label: 'Close Tab',
					accelerator: 'CmdOrCtrl+W',
					click: () => {
						mainWindow.webContents.send('keyboardShortcut', 'closeTab');
					}
				}
			]
		}
];

// Start process to serve manifest file
const server = cp.fork(__dirname + '/server.js');

var force_quit = false;

// Quit server process if main app will quit
app.on('will-quit', () => {
	server.send('quit');
});

server.on('message', (m) => {
	authCallback(m.authResponse)
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

ipcMain.on('adblock-change', (event, arg) => {
	var data = arg.split(":");
	if (data[1] === "on") {
		enableAdBlocking();
	} else if (data[1] === "off") {
		disableAdBlocking();
	}
});

ipcMain.on('test-message', (event, arg) => {
	console.log(arg);
});

// ipcMain.on('close-window', (event, arg) => {
//   force_quit = true;
// 	app.quit();
// });

function authCallback(authResponse) {
	// Bring app window to front
	mainWindow.focus();

	const token = blockstack.decodeToken(authResponse);
	console.log(authResponse);
	mainWindow.webContents.send('blockstackSignIn', authResponse);
};

function enableAdBlocking() {
	ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
		blocker.enableBlockingInSession(session.defaultSession);
	});
}

function disableAdBlocking() {
	ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
		blocker.disableBlockingInSession(session.defaultSession);
	});
}

function createWindow() {
	// Create the browser window.
	var screenElectron = electron.screen.getPrimaryDisplay().size;

  mainWindow = new BrowserWindow({
		frame: false,
		minWidth: 500,
    minHeight: 450,
		titleBarStyle: 'hiddenInset',
		backgroundColor: '#FFF',
		webPreferences: {
			nodeIntegration: true,
			plugins: true,
      nodeIntegration: true,
      contextIsolation: false,
      experimentalFeatures: true,
      enableBlinkFeatures: 'OverlayScrollbars',
      webviewTag: true
		},
		width: screenElectron.width,
		height: screenElectron.height,
		icon: path.join(__dirname, 'images/Peacock2.0.ico')
	});

	Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

	enableAdBlocking();

	const filter = {
		urls: ["http://*/*", "https://*/*"]
	}

	session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
		details.requestHeaders['DNT'] = "1";
		callback({
			cancel: false,
			requestHeaders: details.requestHeaders
		})
	});

	session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
		const url = webContents.getURL()

    console.log(permission);
		callback(true);
	});

	// const extensions = new ExtensibleSession(session.defaultSession);
	// extensions.loadExtension('Grammarly'); // Path to the extension to load

	// and load the index.html of the app.
	mainWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'index.html'),
		protocol: 'file:',
		slashes: true
	}));

	// Continue to handle mainWindow "close" event here
	// mainWindow.on('close', function(e) {
	//   if(!force_quit){
	//       e.preventDefault();
	//       mainWindow.hide();
	//       console.log("yes");
	//       mainWindow.webContents.send('window-closing', "now");
	//   }
	// });

	mainWindow.maximize();

	// Open the DevTools.
	// mainWindow.webContents.openDevTools()

	// Emitted when the window is closed.
	mainWindow.on('closed', function() {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});

	// var notif = new window.Notification('Peacock is Fabulous! ⭐', {
	//   "Love, Spike",
	//   silent: true // We'll play our own sound
	// });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function() {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		if (mainWindow) {
			mainWindow.webContents.closeDevTools()
		}
		app.quit()
	}
})

app.on('activate', function() {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) {
		createWindow();
	}
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
