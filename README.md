<h1 align="center">Peacock</h1>
<p align="center">
  <img src="images/peacock.png" style="display: block;margin-left: auto;margin-right: auto;" data-canonical-src="https://i.imgur.com/Gdko6yP.png" width="300" height="300" align="center"/><br><br>
  🦚 Open source experimental private-by-default web browser.<br>
  <a href="https://github.com/peacockweb/peacock/wiki">Docs</a> |
  <a href="#download">Download</a> |
  <a href="#faq">FAQ</a>
  <br><br>
  <img alt="GitHub Workflow Status" src="https://img.shields.io/github/workflow/status/Codiscite/peacock/build?style=for-the-badge">
  <a href="https://github.com/Codiscite/peacock/releases/latest"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/Codiscite/Peacock?color=tuquoise&label=LATEST&logo=github&logoColor=white&style=for-the-badge"></a>
  <a href="https://discord.gg/PZjDSX3"><img alt="Discord" src="https://img.shields.io/discord/630199884229771314?color=%237289DA&label=discord&logo=Discord&logoColor=white&style=for-the-badge"></a>
</p><br>

# ⚠️ Peacock has been discontinued.

## Contents

- [Documentation](https://github.com/peacockweb/peacock/wiki)
- [Download](#download)
	- [Windows](#windows)
	- [Mac](#mac)
  - [Linux](#linux)
- [Screenshots](#screenshots)
- [Building](#building)
- [FAQ](#faq)
- [Privacy](https://github.com/peacockweb/peacock/wiki/Privacy)

## Download

### Windows

Download the `.exe` file from our [releases page](https://github.com/peacockweb/peacock/releases/latest).

Releasing Peacock for the Windows package, Chocolatey, might be our next step.

### Mac

Unfortunately, Mac builds are failing and there hasn't been enough testing yet for Peacock to be confident enough in releasing a public build for MacOS.

### Linux

Here, you can download Linux builds for Peacock. Hopefully Peacock will have a Flatpak release and possibly an RPM build in the near future.

<br>

**Ubuntu, Debian and Debian derivatives**

Download the `.deb` file from our [releases page](https://github.com/peacockweb/peacock/releases/latest).

<br>

**Arch Linux (AUR)**

[![AUR version](https://img.shields.io/aur/version/peacock?style=for-the-badge)](https://aur.archlinux.org/packages/peacock/)

Download Peacock from the Arch User Repository [here](https://aur.archlinux.org/packages/peacock/). (thank you to u/sunflsks!)

<br>

**AppImage (Everything else)**

Download the `.AppImage` file from our [releases page](https://github.com/peacockweb/peacock/releases/latest).

## Screenshots
New screenshots coming soon!
<img src="https://file.coffee/u/65o2BGmPqie.png"/>
<img src="https://file.coffee/to-Jqlf_a.gif"/>

## Building

Both of the build commands use [`electron-builder`](https://electron.build) and output executables for their respective operating system in the `dist/` folder.

#### Download and initialize Peacock's source code with these commands:

1. ```git clone https://github.com/peacockweb/peacock.git && cd peacock```
2. ```npm i```

#### Run peacock from source:

```npm run start```

#### Build instructions for Windows:

```npm run build-win```

#### Build instructions for Linux:

```npm run build-linux```

## F.A.Q.

### How does Peacock compare to other privacy browsers like Firefox and Brave?
Both Firefox and Brave are spectacular and every day, Peacock gets closer and closer to their status of privacy. Peacock isn't stable enough yet to be used as a daily driver, but is an awesome experiment nonetheless to test the limits of the web and help make the internet a safer place.

### How do I know Peacock doesn't take telemetry?
Peacock is built around on open source technologies and therefore we love transparency. You're welcome to perform your own audits on our entirely open source code! We also include a [Components](https://github.com/peacockweb/peacock/wiki/Components) entry in our docs which breaks down all the technologies used in the production of Peacock.

### How experimental is Peacock? Can I process any sensitive data on it yet?
Using should hold off on doing anything too sensitive on Peacock for now, it's still in development and bugs are getting patched all the time, but like all apps, some may be missed along the way.

### Why use Electron?
Some people are skeptical about [Electron](https://www.electronjs.org/) for its generally high memory usage, but Electron makes the development process incredibly simple. Electron lets us build a desktop app using web technologies. Eventually, we may switch to something more practical like forking Chromium or Firefox.

### How to bypass security warnings?
On Windows, apps are deemed as insecure if they haven't been code-signed with a certificate. Sigining certificates are expensive and therefore, Peacock doesn't have one (yet). This means that Peacock may show up to antiviruses or Windows Defender as a 'suspicious application' but can be easily bypsased selecting "More Info" > "Run Anyway":

<img src="https://i.imgur.com/az4ZKPx.gif"/>
