const { ipcMain, app, session, screen,
	BrowserWindow, nativeTheme, dialog } = require('electron');

const { format } = require('url');
const { join, normalize } = require('path');

const settingsFile = join(__dirname, 'data/settings.json');
const flags = join(__dirname, 'data/flags.json');

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
	process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

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
		icon: join(__dirname, 'images/peacock.png')
	});

	mainWindow.webContents.session.protocol.registerFileProtocol('assets', (req, cb) => {
    var url = req.url.replace(new URL(req.url).protocol, '');
    cb({ path: join(__dirname, 'css/', url) });
  }, (error) => {});

	//mainWindow.openDevTools({ mode: 'detach' });

	// and load the html of the app.
	mainWindow.loadURL(format({
		pathname: join(__dirname, 'browser.html'),
		protocol: 'file:',
		slashes: true
	}));

	mainWindow.maximize();

	mainWindow.webContents.on('crashed', async (e) => { console.log('crashed', e); });

	// Emitted when the window is closed.
	mainWindow.on('closed', async () => {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
