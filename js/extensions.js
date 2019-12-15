const fs = require('fs');
const { join } = require('path')

const getExtensions = source =>
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

function lengthenArray(array, path) {
  array.forEach(function(part, index) {
    this[index] = join(path, this[index]).replace(/\\\\/g, '\\');
  }, array); // use arr as this

  return array;
}

let Extension = class {
  constructor(path) {
    let manifest = JSON.parse(fs.readFileSync( join(path, 'manifest.json') ));
    this.manifest = manifest;

    this.name = manifest.name;
    this.icon = Object.values(manifest.icons).slice(-1)[0];

    this.hasAction = !!manifest.browser_action;
    this.action_title = join(path, manifest.browser_action.default_title || manifest.name);
    this.action_icon = join(path, Object.values(manifest.browser_action.default_icon).slice(-1)[0] || this.icon).replace(/\\\\/g, '\\');
    this.action_popup = join(path, manifest.browser_action.default_popup || 'popup.html').replace(/\\\\/g, '\\');

    this.badge = `<div class="badge" id="${ manifest.name.replace(/ /g,'_') }"><img src="${ this.action_icon }"></div>`;

    this.background = lengthenArray(manifest.background.scripts, path);

    this.content = lengthenArray(manifest.content_scripts[0].js, path);
    this.run_at = manifest.content_scripts[0].run_at;

    this.options = lengthenArray([manifest.options_ui['page']], path);
  }
}

exports.setup = function () {
  let extensionsFolder = join(__dirname, '../extensions');
  let extensions = [];

  getExtensions(extensionsFolder).forEach(extension => {
    let extensionLocation = join(extensionsFolder, extension);
    let ext = new Extension(extensionLocation);
    extensions.push(ext);
  });

  //console.log(extensions);
  return extensions;
}

//this.setup();
