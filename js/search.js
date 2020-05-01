const { remote } = require("electron");
const { join } = require('path');
const { BrowserWindow } = remote;

var view;

exports.view = () => { return view };

exports.initialize = (bounds) => {	
	// TODO: Create new BrowserView
	view = new BrowserWindow({
    parent: remote.getCurrentWindow(),
    frame: false,
    resizable: false,
    maximizable: false,
    show: false,
		fullscreenable: false,
		acceptFirstMouse: true,
		transparent: true,
		alwaysOnTop: true,
		skipTaskbar: true,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });
	
  view.webContents.session.protocol.registerFileProtocol('assets', (req, cb) => {
    var url = req.url.replace(new URL(req.url).protocol, '');

    if(url.includes('..')) {
      cb(join(__dirname, '../css/favicon.png'));
    } else {
      cb(join(__dirname, '../css/', url));
    }
	}, () => {});
	
	view.webContents.on('console-message', (e, level, message) => {
    console.log('Search window says:', message);
  });

  let address = require("url").format({
    pathname: join(__dirname, "../static/pages/dialogs/search.html"),
    protocol: "file:",
    slashes: true
  });

	view.loadURL(address);
	
	view.on('blur', () => view.hide());

	// TODO: Return view for window assignment
	return view;
}

exports.show = (text, bounds) => {
	// TODO: Show BrowserView
	view.setBounds(bounds);
	view.showInactive();
	// TODO: Set the text of the input box to text
	// view.webContents.openDevTools({ mode: 'detach' });
	view.webContents.send('update', text);
}

exports.hide = () => {
	view.hide();
}

exports.close = () => {
	view.close();
	view = null;
}