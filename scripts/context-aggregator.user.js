// ==UserScript==
// @name         PeerLedger — Context Aggregator
// @namespace    https://github.com/cvidal22
// @version      1.0.0
// @description  Collapses order, counterparty and claim context into one always-visible brief, removing the tab round-trip from every dispute review.
// @author       cvidal22
// @match        https://cvidal22.github.io/peerledger-workflow-toolkit/*
// @require      https://cdn.jsdelivr.net/gh/cvidal22/peerledger-workflow-toolkit@main/core/pl-core.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * THE PROBLEM
 *
 * The console splits a single decision across four tabs. Reviewing one dispute
 * means: read the claim, switch to order details to check status and value,
 * switch to the chat to see what was agreed, switch back to the claim to look
 * at the evidence, then hold all of it in your head at once.
 *
 * None of that is analysis. It is retrieval, and it repeats on every case.
 *
 * WHAT THIS DOES
 *
 * Reads all four tabs once when the case loads and renders a single brief:
 * the numbers that determine severity, the counterparty asymmetry that usually
 * decides credibility, and the evidence inventory.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not summarise the claim, weight the evidence or suggest an outcome.
 * Every value shown is a value that already exists on the page. If the operator
 * would have to trust the script's reading of something, the script does not
 * show it.
 */

(function () {
  "use strict";

  function riskSpread(c) {
    // Not a score. A plain statement of how differently the two accounts look,
    // which is exactly what an operator eyeballs first and what the tab layout
    // makes annoying to compare.
    var s = c.parties.seller, b = c.parties.buyer;
    return {
      ordersGap: s.orders + " vs " + b.orders,
      disputesGap: s.disputes + " vs " + b.disputes,
      tenureGap: s.tenure + " vs " + b.tenure
    };
  }

  function render(body, c) {
    PL.ui.clear(body);
    var spread = riskSpread(c);

    PL.ui.rows([
      ["Claim", c.id],
      ["Type", c.typeLabel],
      ["Filed by", c.filedBy],
      ["Order status", c.order.status],
      ["Value", c.order.fiatValue],
      ["Asset", c.order.asset],
      ["Method", c.order.method],
      ["Released", c.order.releasedAt]
    ]).forEach(function (r) { body.appendChild(r); });

    body.appendChild(PL.dom.el("h4", {
      text: "Seller vs buyer",
      style: "margin:12px 0 7px;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#545a66;font-weight:650"
    }));

    PL.ui.rows([
      ["Completed orders", spread.ordersGap],
      ["Prior disputes", spread.disputesGap],
      ["Account tenure", spread.tenureGap]
    ]).forEach(function (r) { body.appendChild(r); });

    body.appendChild(PL.dom.el("h4", {
      text: "Evidence on file (" + c.evidence.length + ")",
      style: "margin:12px 0 7px;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#545a66;font-weight:650"
    }));

    if (!c.evidence.length) {
      body.appendChild(PL.dom.el("div", { class: "pl-none", text: "Nothing submitted." }));
    } else {
      c.evidence.forEach(function (e) {
        body.appendChild(PL.dom.el("div", { class: "pl-quote", text: e.kind + " · " + e.label }));
      });
    }

    body.appendChild(PL.dom.el("div", {
      class: "pl-hint",
      text: "Chat: " + c.chat.length + " messages. Alt+1 jumps to the transcript."
    }));

    PL.log("aggregator", "rendered " + c.id);
  }

  var body = PL.ui.section("aggregator", "Case brief");

  PL.hotkeys.bind("alt+1", function () {
    var tab = PL.dom.qs('.tab[data-panel="chat"]');
    if (tab) tab.click();
  });

  PL.watch(PL.adapter.caseKey, function () {
    var c = PL.adapter.readCase();
    if (c) render(body, c);
  });
})();
