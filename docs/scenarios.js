/*
 * scenarios.js — makes the console misbehave on purpose.
 *
 * A well-behaved mock is a bad test target. Automation that only ever runs
 * against a clean, synchronous, single-rendered page looks correct right up
 * until it meets a real application, and then fails intermittently in ways
 * that are almost impossible to reproduce.
 *
 * So the failure modes are switches. Append them to the URL:
 *
 *   ?scenario=slow                 data arrives after the skeleton
 *   ?scenario=noop                 the first click on a save is swallowed
 *   ?scenario=concurrent           a colleague writes to the case mid-save
 *   ?scenario=throttle             timers clamped, as in a background tab
 *   ?scenario=stale                the previous view is left in the DOM
 *   ?scenario=slow,concurrent      combine freely
 *
 * Each one turns "the macro fails sometimes" into a test you can run.
 *
 * The scripts in /scripts are built to survive all of these. That is the
 * demonstration — not that they work on a good day.
 */
(function () {
  "use strict";

  var raw = (location.search.match(/[?&]scenario=([^&]*)/) || [])[1] || "";
  var on = {};
  decodeURIComponent(raw).split(",").forEach(function (s) {
    if (s.trim()) on[s.trim()] = true;
  });

  var SCENARIOS = {
    slow: {
      label: "Slow load",
      note: "Order fields render as “--” and populate after a delay. Scripts that read on document-ready get nothing; PL.spa.ready waits for a real value."
    },
    noop: {
      label: "Swallowed click",
      note: "The first click on Save note is silently ignored. A chain that trusts the click reports success for a write that never happened; verification catches it."
    },
    concurrent: {
      label: "Concurrent colleague",
      note: "Another operator saves a note at the same instant as you. Row-count verification is satisfied by their write; marker verification is not."
    },
    throttle: {
      label: "Background throttling",
      note: "setInterval is clamped to one tick per minute. A watcher on setInterval stalls; PL.timer runs on a Worker and does not."
    },
    stale: {
      label: "Stale keep-alive view",
      note: "The previous table is left in the DOM. Selecting a tbody by position gets the wrong one; anchoring on content does not."
    },
    twins: {
      label: "Colliding sidebar text",
      note: "The sidebar gains collapsed items whose labels duplicate on-page buttons. A lookup without a visibility filter clicks the sidebar instead."
    },
    menus: {
      label: "Teleported menus",
      note: "Evidence menus render into <body> rather than in place, and several can be open at once. Document order no longer tells you which belongs to which row."
    }
  };

  window.PL_SCENARIO = {
    on: function (name) { return !!on[name]; },
    active: Object.keys(on).filter(function (k) { return SCENARIOS[k]; }),
    all: SCENARIOS,
    delay: function () { return on.slow ? 400 + Math.floor(Math.random() * 1200) : 0; }
  };

  /* --- throttling: clamp intervals the way a hidden tab does ------------- */
  if (on.throttle) {
    var nativeInterval = window.setInterval;
    window.setInterval = function (fn, ms) {
      return nativeInterval(fn, Math.max(ms || 0, 60000));
    };
    var nativeTimeout = window.setTimeout;
    window.setTimeout = function (fn, ms) {
      /* Leave short timeouts alone — clamping every one of them would break
         the page itself rather than emulating the browser, which only
         throttles repeating timers and long delays. */
      return nativeTimeout(fn, (ms || 0) >= 1000 ? Math.max(ms, 60000) : ms);
    };
  }

  /* --- twins: hidden sidebar items duplicating on-page control text ------
     Real navigation trees are full of collapsed entries. When one of them
     happens to carry the same label as a button on the page, a text lookup
     without a visibility filter silently targets the wrong element — and it
     looks like the script is clicking at random. */
  function plantTwins() {
    var nav = document.querySelector(".sidenav");
    if (!nav) return;
    var group = document.createElement("div");
    group.className = "nav-collapsed";
    group.setAttribute("aria-hidden", "true");
    /* Inline, not from the stylesheet. A collapsed tree is hidden by the app's
       own logic, and a script must not depend on external CSS having loaded to
       tell the difference. This also makes the trap reproducible under test. */
    group.style.display = "none";
    ["Save note", "Close claim", "Open recovery claim", "Send message", "Request evidence"]
      .forEach(function (label) {
        var a = document.createElement("button");
        a.className = "nav-item";
        a.textContent = label;
        group.appendChild(a);
      });
    nav.appendChild(group);
  }

  /* --- menus: per-evidence menus teleported to <body> --------------------- */
  function teleportedMenus() {
    document.addEventListener("click", function (e) {
      var trigger = e.target.closest("[data-evidence-menu]");
      if (!trigger) return;
      e.preventDefault();

      var menu = document.createElement("ul");
      menu.className = "teleported-menu";
      menu.setAttribute("data-for", trigger.getAttribute("data-evidence-menu"));
      var r = trigger.getBoundingClientRect();
      menu.style.top = (r.bottom + window.scrollY) + "px";
      menu.style.left = (r.left + window.scrollX) + "px";

      ["Accept", "Reject", "Request better copy"].forEach(function (label) {
        var li = document.createElement("li");
        /* The handler lives on the button inside the item, not the item —
           clicking the <li> does nothing at all. */
        var b = document.createElement("button");
        b.textContent = "  " + label + "  ";   // padded, as real menus are
        b.addEventListener("click", function () {
          if (window.PEERLEDGER_TOAST) {
            window.PEERLEDGER_TOAST(label + " · " + menu.getAttribute("data-for"));
          }
          menu.remove();
        });
        li.appendChild(b);
        menu.appendChild(li);
      });

      /* Teleported to body, and previous menus are NOT closed. */
      document.body.appendChild(menu);
    });
  }

  if (on.twins || on.menus) {
    var apply = function () {
      if (on.twins) plantTwins();
      if (on.menus) teleportedMenus();
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
    else apply();
  }

  /* --- banner ------------------------------------------------------------ */
  function banner() {
    var bar = document.createElement("div");
    bar.className = "scenario-bar" + (window.PL_SCENARIO.active.length ? " on" : "");

    if (!window.PL_SCENARIO.active.length) {
      bar.innerHTML =
        '<strong>Clean run.</strong> This console can be made to misbehave the way a real ' +
        'internal tool does — that is what makes it a useful test target. ' +
        '<span class="sc-links"></span>';
    } else {
      bar.innerHTML = "<strong>Scenario: " +
        window.PL_SCENARIO.active.map(function (k) { return SCENARIOS[k].label; }).join(" + ") +
        "</strong> " +
        window.PL_SCENARIO.active.map(function (k) { return SCENARIOS[k].note; }).join(" ") +
        ' <span class="sc-links"></span>';
    }

    var links = bar.querySelector(".sc-links");
    Object.keys(SCENARIOS).forEach(function (k) {
      var a = document.createElement("a");
      a.href = "?scenario=" + k + location.hash;
      a.textContent = SCENARIOS[k].label;
      a.className = on[k] ? "active" : "";
      links.appendChild(a);
    });
    if (window.PL_SCENARIO.active.length) {
      var clear = document.createElement("a");
      clear.href = "./" + location.hash;
      clear.textContent = "clear";
      clear.className = "clear";
      links.appendChild(clear);
    }

    var host = document.querySelector(".topbar");
    if (host && host.parentNode) host.parentNode.insertBefore(bar, host.nextSibling);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", banner);
  else banner();
})();
