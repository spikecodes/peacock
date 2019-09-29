const electron = require('electron')
const { ipcMain } = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const session = electron.session

// const ExtensibleSession = require('electron-extensions/main').ExtensibleSession;

const path = require('path')
const url = require('url')

const ElectronBlocker = require('@cliqz/adblocker-electron').ElectronBlocker;
const fetch = require('cross-fetch').fetch; // required 'fetch'

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

ipcMain.on('request-mainprocess-action', (event, arg) => {
	var data = arg.split(":");
	if (data[1] === "on") {
		enableAdBlocking();
	} else if (data[1] === "off") {
		disableAdBlocking();
	}
});

function enableAdBlocking() {
	console.log('yat');
	ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
		blocker.enableBlockingInSession(session.defaultSession);
	});
}

function disableAdBlocking() {
	console.log('yee');
	ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
		blocker.disableBlockingInSession(session.defaultSession);
	});
}

function createWindow() {
	// Create the browser window.
	var screenElectron = electron.screen.getPrimaryDisplay().size;

	mainWindow = new BrowserWindow({
		frame: false,
		backgroundColor: '#FFF',
		webPreferences: {
			nodeIntegration: true
		},
		width: screenElectron.width,
		height: screenElectron.height,
		icon: path.join(__dirname, 'images/download.ico')
	});

	enableAdBlocking();

	// const extensions = new ExtensibleSession(session.defaultSession);
  // extensions.loadExtension('Grammarly'); // Path to the extension to load

	// and load the index.html of the app.
	mainWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'index.html'),
		protocol: 'file:',
		slashes: true
	}));

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
		app.quit();
	}
});

app.on('activate', function() {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) {
		createWindow();
	}
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
