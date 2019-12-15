// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const remote = require('electron').remote;

let tabCount;
exports.setTabCount = function (input) {
  tabCount = input;
}

// When document has loaded, initialise
document.onreadystatechange = () => {
    if (document.readyState == "complete") {
        init();
    }
};

function init() {
    let window = remote.getCurrentWindow();
    const minButton = document.getElementById('min-button'),
        maxButton = document.getElementById('max-button'),
        restoreButton = document.getElementById('restore-button'),
        closeButton = document.getElementById('close-button');

    minButton.addEventListener("click", event => {
        window = remote.getCurrentWindow();
        window.minimize();
    });

    maxButton.addEventListener("click", event => {
        window = remote.getCurrentWindow();
        window.maximize();
        toggleMaxRestoreButtons();
    });

    restoreButton.addEventListener("click", event => {
        window = remote.getCurrentWindow();
        window.unmaximize();
        toggleMaxRestoreButtons();
    });

    // Toggle maximise/restore buttons when maximisation/unmaximisation
    // occurs by means other than button clicks e.g. double-clicking
    // the title bar:
    toggleMaxRestoreButtons();
    try {
      window.on('maximize', toggleMaxRestoreButtons);
    } catch (e) { }
    window.on('maximize', toggleMaxRestoreButtons);
    window.on('unmaximize', toggleMaxRestoreButtons);

    closeButton.addEventListener("click", event => {
        // var { app } = remote;
        // app.quit();
        let tc;
        try {
          tc = tabCount();
        } catch (e) {
          window = remote.getCurrentWindow();
          window.close();
          return;
        }

        if(tc && tc > 1) {
          if (confirm('You are about to close ' + tc + ' tabs. Are you sure you want to continue?')) {
            window = remote.getCurrentWindow();
            window.close();
          } else {
            // Do nothing!
          }
        } else {
          window = remote.getCurrentWindow();
          window.close();
        }
    });

    function toggleMaxRestoreButtons() {
        window = remote.getCurrentWindow();
        if (window.isMaximized()) {
            maxButton.style.display = "none";
            restoreButton.style.display = "flex";
        } else {
            restoreButton.style.display = "none";
            maxButton.style.display = "flex";
        }
    }
}
