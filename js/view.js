const { remote } = require('electron');
const { BrowserView } = remote;

new View('1', 'peacock://newtab');

module.exports = class View extends BrowserView {
  constructor(id, url) {
    super({
      webPreferences: {
        partition: "persist:peacock",
        preload: 'preload.js',
        disablewebsecurity: true,
        sandbox: true,
        nodeIntegration: false,
        contextIsolation: true,
        plugins: true,
      },
    });

    let winBounds = remote.getCurrentWindow().getBounds();

    remote.getCurrentWindow().setBrowserView(view);
    view.setBounds({ x: 0, y: 89, width: window.outerWidth, height: winBounds.height - 89 });

    window.onresize = async () => {
      let bounds = view.getBounds();
      winBounds = remote.getCurrentWindow().getBounds();
      view.setBounds({ x: bounds.x, y: bounds.y, width: window.outerWidth, height: winBounds.height - 89 });
    };

    this.webContents.loadURL(url);
  }
}
