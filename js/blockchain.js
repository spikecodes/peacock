const blockstack = require("blockstack");

var userSession = new blockstack.UserSession();

exports.signIntoBlockstack = function () {
  const transitPrivateKey = userSession.generateAndStoreTransitKey();
  const redirectURI = "http://127.0.0.1:9876/callback";
  const manifestURI = "http://127.0.0.1:9876/manifest.json";
  const scopes = blockstack.DEFAULT_SCOPE;
  const appDomain = "http://127.0.0.1:9876";
  var authRequest = blockstack.makeAuthRequest(
    transitPrivateKey,
    redirectURI,
    manifestURI,
    scopes,
    appDomain
  );
  let url = "http://browser.blockstack.org/auth?authRequest=" + authRequest;
  return url;
}

exports.getUserSession = function () { return userSession; }
