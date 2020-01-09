const { ipcMain, app, session, screen,
	BrowserWindow, nativeTheme, Menu, dialog } = require('electron');

const menuTemplate = [
		{
			label: 'Window',
			submenu: [
				{
					label: 'Open Settings',
					accelerator: 'CmdOrCtrl+Shift+S',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'settings');
					}
				},
				{
					label: 'Open DevTools',
					accelerator: 'CmdOrCtrl+Alt+I',
					click: async () => {
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
					click: async () => {
						// sendToRenderer('keyboardShortcut', 'restart');
						app.relaunch();
						app.exit(0);
					}
				},
				{
					label: 'Open History',
					accelerator: 'CmdOrCtrl+H',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'history');
					}
				},
				{
					label: 'Clear History',
					accelerator: 'CmdOrCtrl+Shift+H',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'clearHistory');
					}
				},
				{
					label: 'Start VPN',
					accelerator: 'CmdOrCtrl+Shift+V',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'startVPN');
					}
				},
				{
					label: 'Stop VPN',
					accelerator: 'CmdOrCtrl+Alt+V',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'stopVPN');
					}
				},
				{
					label: 'Focus Searchbar',
					accelerator: 'CmdOrCtrl+E',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'focusSearchbar');
					}
				},
				{
					label: 'Focus Searchbar',
					accelerator: 'CmdOrCtrl+L',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'focusSearchbar');
					}
				},
				{
					label: 'Get Metrics',
					accelerator: 'CmdOrCtrl+G',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'getMetrics');
					}
				},
				{
					label: 'Toggle Customization Mode',
					accelerator: 'CmdOrCtrl+Alt+C',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'toggleCustomization');
					}
				}
			]
		},
		{
			label: 'Website',
			submenu: [
				{
					label: 'Open DevTools',
					accelerator: 'CmdOrCtrl+Shift+I',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'devTools');
					}
				},
				{
					label: 'Zoom In',
					accelerator: 'CmdOrCtrl+=',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'zoomIn');
					}
				},
				{
					label: 'Zoom Out',
					accelerator: 'CmdOrCtrl+-',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'zoomOut');
					}
				},
				{
					label: 'Reset Zoom',
					accelerator: 'CmdOrCtrl+Shift+-',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'resetZoom');
					}
				},
				{
					label: 'Back',
					accelerator: 'Alt+Left',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'backPage');
					}
				},
				{
					label: 'Forward',
					accelerator: 'Alt+Right',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'forwardPage');
					}
				},
				{
					label: 'Reload Page',
					accelerator: 'F5',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'refreshPage');
					}
				},
				{
					label: 'Force Reload Page',
					accelerator: 'CmdOrCtrl+F5',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'forceReload');
					}
				},
				{
					label: 'Find in Page',
					accelerator: 'CmdOrCtrl+F',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'findInPage');
					}
				},
				{
					label: 'Save as...',
					accelerator: 'CmdOrCtrl+S',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'savePage');
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
					click: async () => {
						sendToRenderer('keyboardShortcut', 'nextTab');
					}
				},
				{
					label: 'Previous Tab',
					accelerator: 'CmdOrCtrl+Shift+Tab',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'backTab');
					}
				},
				{
					label: 'New Tab',
					accelerator: 'CmdOrCtrl+T',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'newTab');
					}
				},
				{
					label: 'Close Tab',
					accelerator: 'CmdOrCtrl+W',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'closeTab');
					}
				},
				{
					label: 'Open Closed Tab',
					accelerator: 'CmdOrCtrl+Shift+T',
					click: async () => {
						sendToRenderer('keyboardShortcut', 'openClosedTab');
					}
				}
			]
		}
];

const { format } = require('url');
const { join, normalize } = require('path');

const settingsFile = join(__dirname, 'data/settings.json');
const flags = join(__dirname, 'data/flags.json');

const server = require('child_process').fork(__dirname + '/server.js');

// Quit server process if main app will quit
app.on('will-quit', async () => {
	server.send('quit');
});

server.on('message', async (m) => {
	authCallback(m.authResponse);
});

require('jsonfile').readFile(settingsFile, async (err, obj) => {
	let dl = require('electron-dl');
	if(obj.save_location === 'Use Save As Window'){
		dl({saveAs: true});
	} else if (obj.save_location === 'Downloads'){
		dl({saveAs: false});
	} else {
		console.error('ERROR');
	}
});
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

ipcMain.on('openPage', (event, arg) => {
	sendToRenderer('openPage', arg);
});

ipcMain.on('signIntoBlockstack', (e, a) => {
	sendToRenderer('keyboardShortcut','signIntoBlockstack');
});

ipcMain.on('setGlobal', (e, globalVal) => {
	global[globalVal[0]] = globalVal[1];
});

async function sendToRenderer(channel, message) {
	try { mainWindow.webContents.send(channel, message); }
	catch (e) { console.log(e); }
}

async function authCallback(authResponse) {
	// Bring app window to front
	mainWindow.focus();

	let { decodeToken } = require('blockstack');
	const token = decodeToken(authResponse);
	sendToRenderer('blockstackSignIn', authResponse);
};

async function createWindow() {
	// Create the browser window.
	var screenSize = screen.getPrimaryDisplay().size;

  mainWindow = new BrowserWindow({
		title: 'Peacock',
		frame: false,
		minWidth: 500,
    minHeight: 450,
		titleBarStyle: 'hiddenInset',
		backgroundColor: '#FFF',
		webPreferences: {
			nodeIntegration: true,
      contextIsolation: false,
      experimentalFeatures: true,
      enableBlinkFeatures: 'OverlayScrollbars',
      webviewTag: true,
			allowRunningInsecureContent: true
		},
		width: screenSize.width,
		height: screenSize.height,
		icon: join(__dirname, 'images/peacock.ico')
	});

	mainWindow.on('focus', async () => {
		sendToRenderer('focus', '');
	});

	Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

	// and load the index.html of the app.
	mainWindow.loadURL(format({
		pathname: join(__dirname, 'index.html'),
		protocol: 'file:',
		slashes: true
	}));

	mainWindow.maximize();

	mainWindow.webContents.on('crashed', async () => {
		console.log('crashed');
		//require('electron-unhandled').logError('Peacock has crashed. 😢');
	});

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
