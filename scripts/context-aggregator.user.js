// ==UserScript==
// @name         Dispute Handling — Context Aggregator
// @namespace    https://github.com/cvidal22
// @version      6.1.0
// @description  One brief per appeal: order facts, the buyer/seller comparison, evidence inventory, and any policy-pattern matches the Signal Surfacer found.
// @author       cvidal22
// @match        https://cvidal22.github.io/peerledger-workflow-toolkit/*
// @require      https://raw.githubusercontent.com/cvidal22/peerledger-workflow-toolkit/main/core/pl-core.js?v=6.1.0
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * THE PROBLEM
 *
 * A case page holds five boxes across two columns, and the facts that actually
 * drive the decision are one or two lines from each of them. Reading a case
 * means scrolling between them and assembling the picture in your head, then
 * doing it again when you come back to the case after a follow-up.
 *
 * WHAT THIS DOES
 *
 * Reads the whole page once per case and renders the assembled picture: the
 * order facts that set severity, the counterparty comparison that usually
 * drives credibility, and what evidence is actually on file.
 *
 * THE ONE JUDGEMENT IT ENCODES, STATED OPENLY
 *
 * It puts complainant and defendant side by side. That is a claim about what
 * matters — that relative account history is worth looking at early — and it
 * is the only opinion in the script. Everything else is verbatim.
 *
 * WHAT IT DOES NOT DO
 *
 * No summary of the narrative, no evidence weighting, no suggested outcome.
 * Every value shown appears somewhere on the page already. If the operator
 * would have to trust the script's *reading* of something rather than check
 * it in one glance, it isn't here.
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

  if (!PL.guard("context-aggregator")) return;
  PL.requireCore("6.1.0");
  PL.register("context-aggregator", "3.0.0");

  /* Supplied by the Signal Surfacer. Absent if that script is not installed,
     in which case the brief simply has no flags section rather than failing. */
  function flags(c) {
    var scanner = PL.registry.group("Signals")[0];
    if (!scanner || !scanner.scan) return [];
    try { return scanner.scan(c); } catch (e) { return []; }
  }

  function render(body) {
    var c = PL.adapter.readCase();
    PL.ui.clear(body);
    if (!c) {
      body.appendChild(PL.dom.el("div", { class: "pl-none", text: "Open a case." }));
      return;
    }
    if (body.setHeaderRight) body.setHeaderRight(c.id);

    PL.ui.rows([
      ["Type", c.typeLabel],
      ["Filed by", c.filedBy],
      ["Order", c.order.status],
      ["Value", c.order.fiat],
      ["Crypto", c.order.crypto],
      ["Method", c.order.method],
      ["Released", c.order.releasedAt || "-"],
      ["SLA", c.sla]
    ]).forEach(function (r) { body.appendChild(r); });

    body.appendChild(PL.ui.sub("Complainant vs defendant"));
    PL.ui.rows([
      ["Handle", c.complainant.handle + " / " + c.defendant.handle],
      ["Role", c.complainant.role + " / " + c.defendant.role],
      ["Tier", c.complainant.tier + " / " + c.defendant.tier],
      ["Account age", c.complainant.tenure + " / " + c.defendant.tenure],
      ["Orders", c.complainant.orders + " / " + c.defendant.orders],
      ["Prior disputes", c.complainant.disputes + " / " + c.defendant.disputes]
    ]).forEach(function (r) { body.appendChild(r); });

    body.appendChild(PL.ui.sub("Evidence (" + c.evidence.length + ")"));
    if (!c.evidence.length) {
      body.appendChild(PL.dom.el("div", { class: "pl-none", text: "Nothing submitted." }));
    } else {
      c.evidence.forEach(function (e) {
        body.appendChild(PL.dom.el("div", { class: "pl-quote", text: e.tag + " · " + e.label }));
      });
    }

    /* Flags come from the Signal Surfacer via the registry. They sit here,
       under the facts, because that is the order the case is read in — and
       because a separate button for them was one the operator had to
       remember to press. */
    var hits = flags(c);
    body.appendChild(PL.ui.sub("Flagged lines (" + hits.length + ")"));

    if (!hits.length) {
      body.appendChild(PL.dom.el("div", {
        class: "pl-none",
        text: "No patterns matched. Not a clearance — read the transcript."
      }));
    } else {
      hits.forEach(function (h) {
        var box = PL.dom.el("div", { class: "pl-flag" }, [
          PL.dom.el("div", { class: "t", text: h.p.label }),
          PL.dom.el("div", { class: "q", text: (h.where === "claim" ? "claim" : h.from + " " + h.at) + ": \u201c" + h.text + "\u201d" }),
          PL.dom.el("div", { class: "w", text: h.p.why })
        ]);
        box.addEventListener("click", function () {
          var el = PL.dom.qs(h.where === "claim" ? "#claim-narrative" : "#chat-log");
          if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
        });
        body.appendChild(box);
      });
    }

    body.appendChild(PL.dom.el("div", {
      class: "pl-hint",
      text: c.chat.length + " chat messages. Alt+2 scrolls to the transcript."
    }));

    PL.log("aggregator", "rendered " + c.id);
  }

  PL.hotkeys.bind("alt+2", function () {
    var el = PL.dom.qs("#chat-log");
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  });

  PL.ui.button({
    id: "aggregator",
    label: "Brief",
    title: "Case brief",
    pages: ["case"],
    disabled: function () {
      return PL.adapter.caseKey() ? null : "Open a claim first.";
    },
    hotkey: "Alt+2",
    render: render,
    /* The badge counts flags, not evidence. Evidence is context; a flag is a
       line somebody needs to read, and it is the only thing here worth
       interrupting for. Amber when there is something. */
    variant: "warn",
    badge: function () {
      var c = PL.adapter.readCase();
      if (!c) return null;
      var n = flags(c).length;
      return n ? String(n) : null;
    }
  });

  PL.watch(PL.adapter.caseKey, function () {
    PL.ui.refresh();
    var live = PL.ui.liveBody("aggregator");
    if (live) render(live);
  });
})();
