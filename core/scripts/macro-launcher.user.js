// ==UserScript==
// @name         Dispute Handling — Macro Launcher
// @namespace    https://github.com/cvidal22
// @version      6.1.1
// @description  Keyboard-invoked searchable macro palette. Fills templates from live case data and inserts into the note field. Refuses to insert anything it could not fully resolve.
// @author       cvidal22
// @match        https://cvidal22.github.io/peerledger-workflow-toolkit/*
// @require      https://raw.githubusercontent.com/cvidal22/peerledger-workflow-toolkit/main/core/pl-core.js?v=6.1.1
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * THE PROBLEM
 *
 * Canned responses normally live in a dropdown. A dropdown is fine at eight
 * entries and hostile at sixty: you stop reading it and start scrolling it,
 * so in practice people use the six they can find and hand-type the rest.
 * The library grows and its usable surface doesn't.
 *
 * Worse, the templates are static. Every one still needs the order reference,
 * the amount and the handles typed in by hand afterwards — which is both the
 * slow part and the part where a digit gets transposed into a message that
 * goes to a real person.
 *
 * WHAT THIS DOES
 *
 * One keystroke opens a filter box. Type three or four letters, hit enter, and
 * the macro is inserted with every field already resolved from the case that is
 * open. Arrow keys to move, escape to leave.
 *
 * WHY A PALETTE RATHER THAN A LONGER DROPDOWN
 *
 * Fuzzy filtering means recall beats recognition: you don't need to know where
 * "third-party payment" sits in the list, only that it contains "3rd" or "tpp".
 * That is the difference between a library of sixty that gets used and a library
 * of sixty that decays into six. Aliases exist for exactly this reason — the
 * name you reach for under time pressure is not always the name on the macro.
 *
 * THE REFUSAL BEHAVIOUR IS THE IMPORTANT PART
 *
 * If a template needs a field the page doesn't have, the macro does not insert.
 * It says which token was missing and stops.
 *
 * The tempting alternative — insert it with the gap left in, let the operator
 * fill it — is how "{{orderRef}}" ends up in front of a user, because the
 * operator is moving fast and the placeholder looks like text. A macro that
 * fails loudly is worth more than one that half-works quietly, and this is
 * the same principle as PL.template throwing rather than rendering a blank.
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

  if (!PL.guard("macro-launcher")) return;
  PL.requireCore("6.1.1");
  PL.register("macro-launcher", "3.0.0");

  /*
   * THE PROBLEM
   *
   * A canned-response dropdown is fine at eight entries and hostile at sixty:
   * you stop reading it and start scrolling it, so people use the six they
   * can find and hand-type the rest. The library grows and its usable surface
   * does not.
   *
   * WHAT THIS DOES
   *
   * One keystroke opens a fuzzy-filtered palette of the macros that apply to
   * the open case. Type three letters, press enter, and the full sequence
   * runs — message, response window, remark, and parking the case.
   *
   * WHY IT OWNS NO MACROS OF ITS OWN
   *
   * An earlier version kept a second list here and only inserted a note. The
   * two implementations drifted, and this button quietly did a third of what
   * the same macro did from the matrix — the message was never sent. Now the
   * entries come from the shared registry and the executor is the matrix's.
   * One behaviour, reachable two ways.
   *
   * WHY A PALETTE RATHER THAN A LONGER DROPDOWN
   *
   * Fuzzy filtering makes recall beat recognition: you do not need to know
   * where "third-party payment" sits in a list, only that it matches "tpp".
   * That is the difference between a library of sixty that gets used and one
   * that decays into six.
   */

  function open() {
    var c = PL.adapter.readCase();
    if (!c) { PL.ui.toast("Open an appeal first."); return; }

    var all = PL.registry.group("Macros");
    if (!all.length) {
      PL.ui.toast("No macros registered — is the Macro Engine script installed?");
      return;
    }

    /* Applicable to this appeal first; everything else still reachable. */
    var mine = all.filter(function (m) { return m.caseType === c.type; });
    var rest = all.filter(function (m) { return m.caseType !== c.type; });

    /* Show the trade role the message goes to, not the procedural label.
       "message the seller" tells the operator who receives it; "message the
       complainant" makes them work out which side that is. */
    var roleOf = function (p) { return /buyer/i.test(p.role) ? "buyer" : "seller"; };
    var recipientOf = function (to) {
      if (!to) return null;
      if (to === "both") return "both parties";
      return "the " + (to === "defendant" ? roleOf(c.defendant) : roleOf(c.complainant));
    };

    function toItem(m, applies) {
      return {
        name: m.label,
        meta: m.code,
        tags: [m.code.toLowerCase(), m.id.split("/")[1].replace(/_/g, ""), applies ? "thiscase" : ""],
        preview: (applies ? "▸ " : m.typeLabel + " · ") +
          [m.sendsMessage && m.to ? "message " + recipientOf(m.to) : "no message",
           m.windowHours ? m.windowHours + "h window" : "no window",
           "remark",
           m.closes ? "→ closes the appeal"
             : m.followUp ? "→ Handling" : "stays in task pool"].join(" · "),
        run: function () {
          if (applies) { m.run(); return; }
          PL.ui.confirm("Type mismatch", [
            "This appeal is " + c.typeLabel + ", not " + m.typeLabel + ".",
            "The wording will not match. Run anyway?"
          ]).then(function (yes) { if (yes) m.run(); });
        }
      };
    }

    PL.overlay({
      items: mine.map(function (m) { return toItem(m, true); })
        .concat(rest.map(function (m) { return toItem(m, false); })),
      placeholder: c.id + " · " + c.typeLabel + " — type to filter",
      footer: mine.length + " for this type, " + all.length + " total"
    });
  }

  PL.hotkeys.bind("alt+k", open);

  PL.ui.button({
    id: "macros",
    label: "Macros",
    pages: ["case"],
    disabled: function () {
      var m = PL.dom.qs("#main");
      if (!m || !m.getAttribute("data-claim-id")) return "Open a claim first.";
      return m.getAttribute("data-claim-state") === "closed"
        ? "This claim is closed — the macro palette is unavailable." : null;
    },
    hotkey: "Alt+K",
    /* No popover: this button IS the action. A palette that needed two
       clicks to open would be slower than the dropdown it replaces. */
    onClick: open,
    badge: function () {
      var c = PL.adapter.readCase();
      if (!c) return null;
      var n = PL.registry.group("Macros").filter(function (m) { return m.caseType === c.type; }).length;
      return n ? String(n) : null;
    }
  });

  PL.watch(PL.adapter.caseKey, function () { PL.ui.refresh(); });
})();
