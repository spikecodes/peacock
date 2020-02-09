const { ipcMain, app, session, screen,
	BrowserWindow, nativeTheme, dialog } = require('electron');

const { format } = require('url');
const { join, normalize } = require('path');

const settingsFile = join(__dirname, 'data/settings.json');
const flags = join(__dirname, 'data/flags.json');

/*require('jsonfile').readFile(settingsFile, async (err, obj) => {
	let dl = require('electron-dl');
	if(obj.save_location === 'Use Save As Window'){
		dl({saveAs: true});
	} else if (obj.save_location === 'Downloads'){
		dl({saveAs: false});
	} else {
		console.error('ERROR');
	}
});*/

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

process.noDeprecation = true;

ipcMain.on('setGlobal', (e, globalVal) => {
	global[globalVal[0]] = globalVal[1];
});

async function sendToRenderer(channel, message) {
	try { mainWindow.webContents.send(channel, message); }
	catch (e) { console.log(e); }
}

async function createWindow() {
	// Create the browser window.
	var screenSize = screen.getPrimaryDisplay().size;

  mainWindow = new BrowserWindow({
		title: 'Peacock',
		frame: false,
		minWidth: 500,
    minHeight: 450,
		backgroundColor: '#FFF',
		webPreferences: {
			nodeIntegration: true,
			allowRunningInsecureContent: true,
			enableRemoteModule: true
		},
		width: 1280,
		height: 720,
		icon: join(__dirname, 'images/peacock.ico')
	});

	//mainWindow.openDevTools({ mode: 'detach' });

	// and load the index.html of the app.
	mainWindow.loadURL(format({
		pathname: join(__dirname, 'index.html'),
		protocol: 'file:',
		slashes: true
	}));

	mainWindow.maximize();

	mainWindow.webContents.on('crashed', async (e) => { console.log('crashed', e); });

	// Open the DevTools.
	// mainWindow.webContents.openDevTools()

	// Emitted when the window is closed.
	mainWindow.on('closed', async () => {
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
app.on('window-all-closed', async () => {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		if (mainWindow) {
			mainWindow.webContents.closeDevTools()
		}
		app.quit()
	}
});

app.on('renderer-process-crashed', async () => {
	console.log('rp-crashed');
});

app.on('web-contents-created', async (e, contents) => {
  if (contents.getType() == 'webview') {
		sendToRenderer('nativeTheme', nativeTheme.shouldUseDarkColors);
  }
});

app.on('activate', async () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) {
		createWindow();
	}
});

// app.on('certificate-error', async (event, webContents, url, error, certificate, callback) => {
//   console.log("! url: " + url + "| issuerName: " + certificate.issuerName);
//   event.preventDefault();
//   callback(true);
// });

// app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
// 	console.log(error);
//  dialog.showCertificateTrustDialog(mainWindow, {certificate: certificate});
// });

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
