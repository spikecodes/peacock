# Components

Peacock strongly supports accessible transparency. This file gives you a glimpse into each and every component that makes up our browser without making you dig deep in the code to find it.

Our list uses GitHub repository links for open source projects and website links for closed-source ones. License links are attached with each FOSS application.

## Tools

- [Electron](https://github.com/electron/electron) [[MIT](https://github.com/electron/electron/blob/master/LICENSE)]
  - Electron is the backbone for Peacock. It allows us to build cross-platform desktop apps using web technologies.
  - *Editors Note: although it may be lacking regarding memory usage, it makes development seamless. We may eventually switch to a more practical setup like forking Chromium.* 

- [VSCodium](https://github.com/VSCodium/vscodium) [[MIT](https://github.com/VSCodium/vscodium/blob/master/LICENSE)]
  - Open source text editor used by Peacock's primary developer. Provides binary releases of VS Code without microsoft branding/telemetry/licensing.

- [GitHub Actions](https://github.com/features/actions)
  - Powerful, transparent CI/CD built directly into GitHub. All our builds are performed using GitHub actions.

- [Electron Builder](https://github.com/electron-userland/electron-builder) [[MIT](https://github.com/electron-userland/electron-builder/blob/master/LICENSE)]
  - Electron Builder turns [our source code](https://github.com/peacockweb/peacock) into [executables](https://github.com/peacockweb/peacock/releases). It's run on GitHub Actions as shown above.

## Version Control

- [GitHub](https://github.com/)
  - Online interface for git version control software.
  - *Editors Note: we plan to switch to a selfhosted setup like [Gitlab](https://gitlab.com) or [Gitea](https://gitea.io) to become more decentralized.*

## Website

- [Porkbun](https://porkbun.com/)
  - Porkbun is very well priced and has great customer service. They are the registrar behind our [peacock.link](https://peacock.link) (currently redirects to the GitHub page) domain.
  - *Editors Note: we will be switching to the privacy friendly domain name registration service, [Njalla](https://njal.la), soon.*

- [Let's Encrypt](https://letsencrypt.org/)
  - Let's Encrypt powers a ton of the modern web with their great free SSL service and Peacock is no different.
  - *Editors Note: in the ideal world, we'd use an SSL provided by switzerland-based SwissSign but paid certificates are expensive so we'll be sticking with Let's Encrypt for now.*

## Packages

- [@cliqz/adblocker-electron](https://github.com/cliqz-oss/adblocker/tree/master/packages/adblocker-electron) [[Mozilla Public License Version 2.0](https://github.com/cliqz-oss/adblocker/blob/master/packages/adblocker-electron/LICENSE)]
  - Engine for Peacock Shield.
- [cross-fetch](https://github.com/lquixada/cross-fetch) [[MIT](https://github.com/lquixada/cross-fetch/blob/master/LICENSE)]
  - Lets adblocker read from blacklists.
- [electron-context-menu](https://github.com/sindresorhus/electron-context-menu) [[MIT](https://github.com/sindresorhus/electron-context-menu/blob/master/license)]
  - Allows for neat right-click (also called context) menus.
- [electron-process-manager](https://github.com/getstation/electron-process-manager) [[No License](https://choosealicense.com/no-permission/)]
  - Peacock Task Manager uses this package to display the data.
- [electron-store](https://github.com/sindresorhus/electron-store) [[MIT](https://github.com/sindresorhus/electron-store/blob/master/license)]
  - Manages storage of data (bookmarks, history, flags, settings). This information never leaves your device.
- [electron-updater](https://github.com/electron-userland/electron-builder) [[MIT](https://github.com/electron-userland/electron-builder/blob/master/LICENSE)]
  - Provides auto update for Peacock.
- [sortablejs](https://github.com/SortableJS/Sortable) [[MIT](https://github.com/SortableJS/Sortable/blob/master/LICENSE)]
  - Powers tab dragging functionality.
- [uuid](https://github.com/uuidjs/uuid) [[MIT](https://github.com/uuidjs/uuid/blob/master/LICENSE.md)]
  - Used to generate IDs for each bookmark and history item.
- [v8-compile-cache](https://github.com/zertosh/v8-compile-cache) [[MIT](https://github.com/zertosh/v8-compile-cache/blob/master/LICENSE)]
  - Allows for better caching with the V8 engine for faster loading.
