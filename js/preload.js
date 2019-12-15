const { ipcRenderer } = require('electron')

if(window.location.protocol == 'peacock:'){
  ipcRenderer.on('loadFlags', (event, data) => {
    let json = JSON.parse(data);

    setEnabled(Object.keys(json));
  });

  ipcRenderer.on('setError', (event, details) => {
    setError(details);
  });

  ipcRenderer.on('setVersions', (event, versions) => {
    setVersions(versions);
  });

  global.sendToHost = (channel, message) => {
    ipcRenderer.sendToHost(channel, message);
  }
}
