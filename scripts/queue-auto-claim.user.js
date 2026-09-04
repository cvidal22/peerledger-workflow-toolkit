// ==UserScript==
// @name         Dispute Handling — Queue Auto-Claim
// @namespace    https://github.com/cvidal22
// @version      6.1.1
// @description  Opens the next appeal in the task pool, so the operator never sits on a list between cases.
// @author       cvidal22
// @match        https://cvidal22.github.io/peerledger-workflow-toolkit/*
// @require      https://raw.githubusercontent.com/cvidal22/peerledger-workflow-toolkit/main/core/pl-core.js?v=6.1.1
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
 * @require content is cached by the extension, and by whatever serves it.
 * A stale or failed fetch leaves PL out of date, and a bare throw here dies
 * in the console where nobody is looking — the operator just sees a toolkit
 * that stopped existing.
 *
 * The URL points at raw.githubusercontent, NOT a CDN. jsDelivr caches a
 * branch URL for up to 12 hours and ignores query strings, so a "?v=" buster
 * busts nothing there: an updated core keeps serving stale for half a day
 * while no button ever appears. Raw honours the query and caches for five
 * minutes.
 * ------------------------------------------------------------------------- */
(function () {
  /* Checking for PL alone is not enough: a cached older core defines PL,
     passes a loose version check, and then dies on the first call to an API
     it does not have — in the console, where nobody is looking. Probe the
     actual surface this script needs. */
  if (typeof PL !== "undefined" && PL.requireCore && PL.ui && PL.ui.button) return;
  if (document.getElementById("pl-boot-error")) return;
  var b = document.createElement("div");
  b.id = "pl-boot-error";
  b.textContent = "Dispute Handling toolkit: pl-core.js is missing or out of date " +
    (typeof PL !== "undefined" && PL.version ? "(found " + PL.version + ") " : "") +
    "— remove the scripts in Tampermonkey and reinstall them.";
  b.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:#8f2f2c;" +
    "color:#fff;padding:9px 14px;font:13px system-ui,sans-serif;text-align:center";
  (document.body || document.documentElement).appendChild(b);
})();
if (typeof PL === "undefined" || !PL.ui || !PL.ui.button) return;

  if (!PL.guard("queue-auto-claim")) return;
  PL.requireCore("6.1.1");
  PL.register("queue-auto-claim", "3.0.0");

  var poller = null;
  var armed = false;

  function onQueue() { return PL.adapter.view() === "queue"; }

  /* The operator presses this from wherever they are — usually the appeal
     they have just finished. Requiring them to navigate to the list first
     would put the manual step back in front of the automation whose whole
     job is removing it. */
  function attempt() {
    var arrive = onQueue()
      ? Promise.resolve()
      : (function () {
          location.hash = "#/queue";
          return PL.waitFor(onQueue, { label: "task pool", timeoutMs: 6000 });
        })();

    return arrive
      /* Refresh before reading. The list may have been rendered before the
         last appeal moved out of it, and opening a stale row means opening
         something that is no longer there. */
      .then(function () { return PL.spa.clickSlow(PL.dom.qs("#refresh-btn")); })
      .then(function () {
        return PL.waitFor(function () {
          return PL.dom.qsa("#queue-body tr[data-row-claim]").length > 0;
        }, { label: "task pool rows", timeoutMs: 5000 });
      })
      .then(function () {
        var rows = PL.adapter.readQueue();
        if (!rows.length) return false;

        /* The top row exactly as displayed. The list is already ordered by
           whatever the platform decided matters; re-sorting on a column the
           script parsed itself means the automation quietly disagrees with
           the queue in front of the operator. */
        var next = rows[0];
        PL.log("autoclaim", "opening " + next.id);
        disarm("opened an appeal");

        return PL.spa.clickSlow(next.openLink).then(function () {
          PL.ui.toast("Opened " + next.id + ".");
          return true;
        });
      })
      .catch(function () { return false; });
  }

  function arm() {
    if (armed) return;
    armed = true;
    /* Announce, so any other long-running loop stands down. Two watchers
       polling the same queue double the request rate for no benefit. */
    PL.exclusive.claim("auto-claim", function (why) { disarm(why); });
    poller = PL.poll(attempt, {
      baseMs: 1500,
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
      text: armed ? "Stop" : "Claim next case",
      onclick: function () { armed ? disarm("manual") : arm(); }
    }));

    if (armed && poller) {
      body.appendChild(PL.dom.el("div", {
        class: "pl-hint",
        text: "Next check in ~" + Math.round(poller.waitMs() / 1000) + "s. Interval widens while the pool is empty."
      }));
    }

    if (!onQueue()) {
      body.appendChild(PL.dom.el("div", {
        class: "pl-hint",
        text: "Not on the task pool — this will navigate there, refresh, and open the next appeal."
      }));
    }

    body.appendChild(PL.dom.el("div", {
      class: "pl-hint",
      text: "One click opens the next appeal in your task pool. Alt+A does the same."
    }));
  }

  PL.ui.button({
    id: "autoclaim",
    label: "Auto Claim",
    title: "Auto-claim",
    /* One click runs it. An arm-then-confirm step is a second decision for a
       thing the operator already decided by reaching for the button, and it
       is exactly the kind of ceremony this toolkit exists to remove. Clicking
       again while it is working stops it. */
    onClick: function () { armed ? disarm("manual") : arm(); },
    /* The only button that lives on every page. Its whole purpose is to be
       reachable the moment the operator finishes a case, wherever they are. */
    pages: "*",
    toggle: true,
    hotkey: "Alt+A",
    badge: function () {
      if (PL.adapter.view() !== "queue") return null;
      var n = PL.adapter.readQueue().length;
      return n ? String(n) : null;
    },
    render: render
  });

  PL.hotkeys.bind("alt+a", function () { armed ? disarm("manual") : arm(); });
  PL.hotkeys.bind("alt+p", function () { location.hash = "#/queue"; });

  PL.watch(function () { return PL.adapter.view() + ":" + (PL.adapter.caseKey() || ""); }, function () {
    PL.ui.refresh();
    var live = PL.ui.liveBody("autoclaim");
    if (live) render(live);
  });
})();
