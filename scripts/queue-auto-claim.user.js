// ==UserScript==
// @name         PeerLedger — Queue Auto-Claim
// @namespace    https://github.com/cvidal22
// @version      3.1.0
// @description  Watches the unassigned pool and claims the next case automatically, so the operator is never sitting on a refresh button between cases.
// @author       cvidal22
// @match        https://cvidal22.github.io/peerledger-workflow-toolkit/*
// @require      https://cdn.jsdelivr.net/gh/cvidal22/peerledger-workflow-toolkit@main/core/pl-core.js?v=3.1.0
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * THE PROBLEM
 *
 * Between finishing one case and starting the next, an operator sits on the
 * pool page pressing refresh. It is a few seconds each time and it happens a
 * hundred and sixty times a day, but the real cost isn't the seconds — it's
 * that the gap is dead attention. You can't start anything in it, so you check
 * a message instead, and then the case that arrives gets a colder read.
 *
 * WHAT THIS DOES
 *
 * Polls the pool, claims the oldest waiting case, and stops.
 *
 * WHERE THE ENGINEERING ACTUALLY IS
 *
 * Writing "click the button every five seconds" takes two minutes. What makes
 * the difference between that and something you can leave running for a shift:
 *
 *   Backoff. An empty pool is polled progressively less often (5s → 60s).
 *     A fixed interval against an empty queue is just noise against someone
 *     else's server.
 *
 *   A hard stop. After a run of empty cycles it stops entirely rather than
 *     hammering all night from a forgotten tab. Overnight polling from a tab
 *     nobody is watching is how a helpful script becomes an incident.
 *
 *   One at a time. It claims a single case and disarms. A script that keeps
 *     claiming while you are mid-case builds you a private backlog that your
 *     colleagues can't see and can't pick up.
 *
 *   No overlap. A cycle cannot start while the previous one is in flight.
 *
 * All four live in PL.poll, so the next polling script inherits them for free.
 * That is the actual payoff of a shared core: the second script is where the
 * first one's scar tissue stops being rework.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not choose which case looks easiest. It takes the oldest waiting
 * item, the same one the operator would have taken, because a script that
 * cherry-picks quietly reshapes what the rest of the team is left holding.
 */

(function () {
  "use strict";

/* ---------------------------------------------------------------------------
 * Bootstrap check.
 *
 * @require content is cached by the extension AND by the CDN. A stale or
 * failed fetch leaves PL undefined or out of date, and a bare throw here
 * dies in the console where nobody is looking — the operator just sees a
 * toolkit that stopped existing.
 *
 * The version is pinned in the @require URL so a core update forces a
 * re-fetch instead of silently serving the old build.
 * ------------------------------------------------------------------------- */
(function () {
  if (typeof PL !== "undefined" && PL.requireCore) return;
  if (document.getElementById("pl-boot-error")) return;
  var b = document.createElement("div");
  b.id = "pl-boot-error";
  b.textContent = "PeerLedger toolkit: pl-core.js did not load. " +
    "Reinstall the scripts, or wait a few minutes if the repository was just updated.";
  b.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:#8f2f2c;" +
    "color:#fff;padding:9px 14px;font:13px system-ui,sans-serif;text-align:center";
  (document.body || document.documentElement).appendChild(b);
})();
if (typeof PL === "undefined") return;

  if (!PL.guard("queue-auto-claim")) return;
  PL.requireCore("3.0.0");
  PL.register("queue-auto-claim", "3.0.0");

  var poller = null;
  var armed = false;

  function onPool() { return PL.adapter.view() === "pool"; }

  function attempt() {
    if (!onPool()) return false;

    var rows = PL.adapter.readQueue().filter(function (r) { return r.claimButton; });
    if (!rows.length) return false;

    // Oldest first. "Age" reads like "3h 12m" or "46m".
    rows.sort(function (a, b) { return mins(b.age) - mins(a.age); });
    var next = rows[0];

    next.claimButton.click();
    PL.ui.toast("Auto-claimed " + next.id + " (" + next.typeLabel + ")");
    PL.log("autoclaim", "claimed " + next.id);

    disarm("claimed a case");
    return true;
  }

  function mins(s) {
    var h = /(\d+)h/.exec(s), m = /(\d+)m/.exec(s);
    return (h ? parseInt(h[1], 10) * 60 : 0) + (m ? parseInt(m[1], 10) : 0);
  }

  function arm() {
    if (armed) return;
    armed = true;
    /* Announce, so any other long-running loop stands down. Two watchers
       polling the same queue double the request rate for no benefit. */
    PL.exclusive.claim("auto-claim", function (why) { disarm(why); });
    poller = PL.poll(attempt, {
      baseMs: 4000,
      maxMs: 60000,
      giveUpAfter: 12,
      onStop: function (reason) {
        armed = false;
        PL.ui.setState("autoclaim", false);
        if (reason === "idle") PL.ui.toast("Auto-claim stopped — pool stayed empty.");
        var lb = PL.ui.liveBody("autoclaim");
        if (lb) render(lb);
      }
    }).start();
    PL.ui.setState("autoclaim", true);
    var live = PL.ui.liveBody("autoclaim");
    if (live) render(live);
  }

  function disarm(reason) {
    PL.exclusive.release("auto-claim");
    if (poller) poller.stop(reason);
    armed = false;
    PL.ui.setState("autoclaim", false);
    var live = PL.ui.liveBody("autoclaim");
    if (live) render(live);
  }

  function render(body) {
    PL.ui.clear(body);

    body.appendChild(PL.dom.el("div", {}, [
      PL.dom.el("span", { class: "pl-dot " + (armed ? "on" : "off") }),
      PL.dom.el("span", { text: armed ? "Armed — watching the pool" : "Idle" })
    ]));

    body.appendChild(PL.dom.el("button", {
      class: "pl-btn" + (armed ? " on" : ""),
      text: armed ? "Disarm" : "Arm auto-claim",
      onclick: function () { armed ? disarm("manual") : arm(); }
    }));

    if (armed && poller) {
      body.appendChild(PL.dom.el("div", {
        class: "pl-hint",
        text: "Next check in ~" + Math.round(poller.waitMs() / 1000) + "s. Interval widens while the pool is empty."
      }));
    }

    if (!onPool()) {
      body.appendChild(PL.dom.el("div", {
        class: "pl-hint",
        text: "Open the unassigned pool to use this. Alt+P."
      }));
    }

    body.appendChild(PL.dom.el("div", {
      class: "pl-hint",
      text: "Claims one case, then disarms. Alt+A toggles."
    }));
  }

  PL.ui.button({
    id: "autoclaim",
    label: "Auto Claim",
    title: "Auto-claim",
    pages: ["pool", "queue", "escalations", "closed"],
    toggle: true,
    badge: function () {
      if (PL.adapter.view() !== "pool") return null;
      var n = PL.adapter.readQueue().filter(function (r) { return r.claimButton; }).length;
      return n ? String(n) : null;
    },
    render: render
  });

  PL.hotkeys.bind("alt+a", function () { armed ? disarm("manual") : arm(); });
  PL.hotkeys.bind("alt+p", function () { location.hash = "#/pool"; });

  PL.watch(function () { return PL.adapter.view() + ":" + (PL.adapter.caseKey() || ""); }, function () {
    PL.ui.refresh();
    var live = PL.ui.liveBody("autoclaim");
    if (live) render(live);
  });
})();
