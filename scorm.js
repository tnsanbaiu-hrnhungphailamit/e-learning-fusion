(function () {
  "use strict";
  var api = null;
  var initialized = false;

  function findAPI(win) {
    var attempts = 0;
    while (win && attempts < 500) {
      try { if (win.API) return win.API; } catch (e) {}
      if (win.parent && win.parent !== win) win = win.parent; else break;
      attempts += 1;
    }
    try { if (window.opener) return findAPI(window.opener); } catch (e) {}
    return null;
  }

  function init() {
    api = findAPI(window);
    if (!api) return false;
    try {
      initialized = api.LMSInitialize("") === "true";
      if (initialized) {
        var status = api.LMSGetValue("cmi.core.lesson_status");
        if (!status || status === "not attempted") {
          api.LMSSetValue("cmi.core.lesson_status", "incomplete");
          api.LMSCommit("");
        }
      }
    } catch (e) { initialized = false; }
    return initialized;
  }

  function get(name) {
    if (!initialized) return "";
    try { return api.LMSGetValue(name) || ""; } catch (e) { return ""; }
  }

  function set(name, value) {
    if (!initialized) return false;
    try { return api.LMSSetValue(name, String(value)) === "true"; } catch (e) { return false; }
  }

  function commit() {
    if (!initialized) return false;
    try { return api.LMSCommit("") === "true"; } catch (e) { return false; }
  }

  function finish() {
    if (!initialized) return false;
    try {
      api.LMSCommit("");
      var ok = api.LMSFinish("") === "true";
      initialized = false;
      return ok;
    } catch (e) { return false; }
  }

  window.SCORM = {
    init: init, get: get, set: set, commit: commit, finish: finish,
    isConnected: function () { return initialized; }
  };
})();
