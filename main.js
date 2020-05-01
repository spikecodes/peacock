const { ipcMain, app, screen,
	BrowserWindow, nativeTheme } = require('electron');

const { openProcessManager } = require('electron-process-manager');

const { format } = require('url');
const { join } = require('path');

let mainWindow;

process.noDeprecation = true;

ipcMain.on('setGlobal', (e, globalVal) => {
	global[globalVal[0]] = globalVal[1];
});

ipcMain.on('openProcessManager', async e => {
	openProcessManager();
});

async function sendToRenderer(channel, message) {
	try { mainWindow.webContents.send(channel, message); }
	catch (e) { console.log(e); }
}

async function createWindow() {
	process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

	// Create the browser window.
	var screenSize = screen.getPrimaryDisplay().size;

  mainWindow = new BrowserWindow({
		title: 'Peacock',
		frame: false,
		minWidth: 500,
    minHeight: 450,
		backgroundColor: '#FFFFFF',
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true
		},
		width: 1280,
		height: 720,
		icon: join(__dirname, 'images/peacock.png')
	});

	// mainWindow.openDevTools({ mode: 'detach' });

	mainWindow.loadURL(format({
		pathname: join(__dirname, 'browser.html'),
		protocol: 'file:',
		slashes: true
	}));

	mainWindow.maximize();

	mainWindow.webContents.on('crashed', async (e) => { console.log('crashed', e); });

	// Emitted when the window is closed.
	mainWindow.on('closed', async () => {
		mainWindow = null;
	});

	const { autoUpdater } = require("electron-updater");
	autoUpdater.checkForUpdatesAndNotify();
}

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

app.on('activate', async () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) createWindow();
});
