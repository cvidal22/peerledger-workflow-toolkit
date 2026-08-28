/*
 * preview.js — lets a visitor see the toolkit without installing anything.
 *
 * The scripts in /scripts are userscripts: normally an extension injects
 * them. That is correct for an operator and hopeless for a demo, because
 * nobody evaluating this repository is going to install a browser extension
 * to look at it. A portfolio piece that requires setup before it shows
 * anything is a portfolio piece nobody sees.
 *
 * So the same files can also be loaded straight into the page. Nothing is
 * forked or duplicated for preview mode — these are the exact files the
 * extension would run, minus the metadata block the browser ignores anyway.
 *
 * ?toolkit=1  loads them automatically.
 */
(function () {
  "use strict";

  var SCRIPTS = [
    "queue-auto-claim",
    "context-aggregator",
    "signal-surfacer",
    "macro-launcher",
    "resolution-composer",
    "compound-resolution",
    "macro-matrix"
  ];

  var loading = false;

  function load(done) {
    if (loading || window.PL) return;
    loading = true;

    var s = document.createElement("script");
    s.src = "../core/pl-core.js";
    s.onload = function () {
      var i = 0;
      (function next() {
        if (i >= SCRIPTS.length) { if (done) done(true); return; }
        var t = document.createElement("script");
        t.src = "../scripts/" + SCRIPTS[i++] + ".user.js";
        t.onload = next;
        t.onerror = function () { next(); };
        document.head.appendChild(t);
      })();
    };
    s.onerror = function () { loading = false; if (done) done(false); };
    document.head.appendChild(s);
  }

  function bar() {
    var el = document.createElement("div");
    el.className = "preview-bar";
    el.innerHTML =
      '<strong>The toolkit is not loaded.</strong> ' +
      'It normally runs as seven userscripts in Tampermonkey — ' +
      'but you can load it straight into this page to see what it does. ' +
      '<button type="button" id="preview-load">Load the toolkit</button>' +
      '<a href="https://github.com/cvidal22/peerledger-workflow-toolkit#try-it">install properly instead</a>';

    el.querySelector("#preview-load").addEventListener("click", function () {
      var b = el.querySelector("#preview-load");
      b.disabled = true;
      b.textContent = "Loading…";
      load(function (ok) {
        if (!ok) { b.disabled = false; b.textContent = "Load failed — retry"; return; }
        el.className = "preview-bar loaded";
        el.innerHTML =
          '<strong>Toolkit loaded.</strong> Seven buttons are docked at the left edge. ' +
          'They appear only on the pages where they apply — open a claim to see the rest.';
      });
    });

    var host = document.querySelector(".scenario-bar") || document.querySelector(".topbar");
    if (host && host.parentNode) host.parentNode.insertBefore(el, host.nextSibling);
  }

  function boot() {
    if (/[?&]toolkit=1/.test(location.search)) { load(); return; }
    bar();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
