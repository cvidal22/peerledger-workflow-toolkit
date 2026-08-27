// ==UserScript==
// @name         PeerLedger — Context Aggregator
// @namespace    https://github.com/cvidal22
// @version      3.0.0
// @description  Collapses order state, counterparty asymmetry and evidence inventory into one always-visible brief, so the decision starts from a single view.
// @author       cvidal22
// @match        https://cvidal22.github.io/peerledger-workflow-toolkit/*
// @require      https://cdn.jsdelivr.net/gh/cvidal22/peerledger-workflow-toolkit@main/core/pl-core.js?v=3.0.1
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

  if (!PL.guard("context-aggregator")) return;
  PL.requireCore("3.0.0");
  PL.register("context-aggregator", "3.0.0");

  var body = PL.ui.section("aggregator", "Case brief");

  function render(c) {
    PL.ui.clear(body);
    if (!c) {
      body.appendChild(PL.dom.el("div", { class: "pl-none", text: "Open a case." }));
      return;
    }

    body.setHeaderRight(c.id);

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

  PL.watch(PL.adapter.caseKey, function () { render(PL.adapter.readCase()); });
})();
