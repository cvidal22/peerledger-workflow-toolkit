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

  /* One same-origin bundle, generated from core/ and scripts/ by
     build/bundle.js. Loading the sources directly does not work: GitHub Pages
     publishes only docs/, so ../core/pl-core.js is a 404, and raw.github
     serves JavaScript as text/plain with nosniff, which browsers refuse to
     execute as script. CI fails if the bundle drifts from its sources. */
  var BUNDLE = "toolkit.bundle.js";

  /* Dev mode loads the individual source files instead of the bundle, so a
     local edit shows up on refresh with no build step. It only works when the
     repository root is being served (a local server), which is exactly when
     you want it — on GitHub Pages only docs/ is published and these paths
     404, which is why the bundle exists at all. */
  var DEV = /[?&]dev=1/.test(location.search);
  var SOURCES = [
    "../core/pl-core.js",
    "../scripts/queue-auto-claim.user.js",
    "../scripts/signal-surfacer.user.js",
    "../scripts/context-aggregator.user.js",
    "../scripts/macro-engine.user.js",
    "../scripts/macro-launcher.user.js"
  ];

  var loading = false;

  function loadSequential(urls, done) {
    var i = 0;
    (function next() {
      if (i >= urls.length) { done(true); return; }
      var el = document.createElement("script");
      el.src = urls[i] + "?t=" + Date.now();   // defeat the browser cache while iterating
      el.onload = function () { i++; next(); };
      el.onerror = function () { done(false, "could not load " + urls[i]); };
      document.head.appendChild(el);
    })();
  }

  function load(done) {
    if (loading || window.PL) { if (done) done(!!window.PL); return; }
    loading = true;

    var timer = setTimeout(function () {
      loading = false;
      if (done) done(false, "timed out after 15s");
    }, 15000);

    if (DEV) {
      loadSequential(SOURCES, function (ok, why) {
        clearTimeout(timer);
        loading = false;
        if (!ok) { if (done) done(false, why); return; }
        if (done) done(!!(window.PL && document.getElementById("pl-dock")),
                       "sources loaded but no buttons registered");
      });
      return;
    }

    var s = document.createElement("script");
    /* Always fetch fresh. The bundle is regenerated on every change, and a
       browser serving yesterday's copy from cache is indistinguishable from
       a change that did not work — which has cost more debugging here than
       any actual bug. The file is small and this is a demo; correctness of
       what you are looking at matters more than one cached request. */
    s.src = BUNDLE + "?t=" + Date.now();
    s.onload = function () {
      clearTimeout(timer);
      loading = false;
      /* onload only means the file arrived. Confirm the toolkit actually
         started — a bundle that parsed but threw would otherwise report
         success and leave no buttons. */
      if (done) done(!!(window.PL && window.PL.ui && document.getElementById("pl-dock")),
                     window.PL ? "loaded but no buttons registered" : "bundle ran but PL is undefined");
    };
    s.onerror = function () {
      clearTimeout(timer);
      loading = false;
      if (done) done(false, "could not fetch " + BUNDLE);
    };
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
      load(function (ok, why) {
        if (!ok) {
          b.disabled = false;
          b.textContent = "Retry";
          var msg = el.querySelector(".pv-err") || document.createElement("div");
          msg.className = "pv-err";
          msg.textContent = "Could not load the toolkit: " + (why || "unknown") + ".";
          el.appendChild(msg);
          return;
        }
        el.className = "preview-bar loaded";
        el.innerHTML =
          '<strong>Toolkit loaded.</strong> Seven buttons are docked at the left edge. ' +
          'They appear only on the pages where they apply — open a claim to see the rest.';
      });
    });

    var host = document.querySelector(".topbar");
    if (host && host.parentNode) host.parentNode.insertBefore(el, host.nextSibling);
  }

  function boot() {
    /* Opened straight from the filesystem (double-clicked), so this is
       somebody looking at it locally rather than a visitor deciding whether
       to. Load the toolkit without making them find a query parameter. The
       bundle sits in this same folder, so it works over file:// where the
       individual sources would not. */
    var localFile = location.protocol === "file:";

    if (DEV || localFile || /[?&]toolkit=1/.test(location.search)) { load(); return; }
    bar();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
