// ==UserScript==
// @name         PeerLedger — Signal Surfacer
// @namespace    https://github.com/cvidal22
// @version      1.0.0
// @description  Scans the trade transcript for known policy-violation patterns and surfaces the matching lines for human review. Flags, never decides.
// @author       cvidal22
// @match        https://cvidal22.github.io/peerledger-workflow-toolkit/*
// @require      https://cdn.jsdelivr.net/gh/cvidal22/peerledger-workflow-toolkit@main/core/pl-core.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * THE PROBLEM
 *
 * Policy violations — moving the trade off-platform, paying from a third-party
 * account, pressuring a counterparty into early release — are usually visible
 * in the transcript, but they are one line in forty, they are phrased a dozen
 * different ways, and by the fiftieth case of a shift attention is not what it
 * was at the tenth. Detection quality drifts with fatigue.
 *
 * WHAT THIS DOES
 *
 * Runs a pattern set over the transcript and the claim statement, and lists
 * every match with the line it came from and who said it.
 *
 * THE DESIGN CONSTRAINT THAT MATTERS
 *
 * This script has no verdict. It cannot suspend, cannot rank a case as fraud,
 * cannot recommend an outcome. It answers one question — "is there a line here
 * you would want to have read?" — and hands the line back with its context.
 *
 * That constraint is deliberate. An operator who is shown a conclusion starts
 * agreeing with it; a pattern matcher is not competent to form one, and pattern
 * matchers do not know what they are missing. Recall is the goal, precision is
 * the operator's job, and every flag is one click from the source text so the
 * operator can dismiss it in a second when it is wrong.
 */

(function () {
  "use strict";

  /*
   * Patterns are intentionally broad. A false positive costs a second of
   * reading; a missed off-platform solicitation costs a user their money.
   */
  var PATTERNS = [
    {
      id: "off_platform_contact",
      label: "Off-platform contact requested",
      why: "Moving negotiation outside the trade chat removes the evidence trail.",
      re: /\b(whats\s?app|whatsapp|telegram|signal|instagram|e-?mail me|my number|phone number|call me|outside the platform|off platform)\b/i
    },
    {
      id: "third_party_payment",
      label: "Third-party payment indicated",
      why: "Payment from an account other than the trading account breaks the identity chain.",
      re: /\b(my (cousin|friend|brother|sister|wife|husband|mother|father|uncle)|another account|different name|someone else('s)? account|paying for me|my other account)\b/i
    },
    {
      id: "release_pressure",
      label: "Pressure to release early",
      why: "Urgency directed at the holder of the asset is the common lead-in to a non-payment loss.",
      re: /\b(release it|just release|release now|release or|hurry|im not a scammer|i'?m not a scammer|trust me|open a dispute against you)\b/i
    },
    {
      id: "bank_delay_claim",
      label: "Unverified bank-delay claim",
      why: "Frequently used to explain a receipt that will never settle. Worth checking against the statement.",
      re: /\b(bank (is )?slow|holiday delay|takes a while to show|already left my account|money left already|pending on my side)\b/i
    },
    {
      id: "re_trade_request",
      label: "Request to re-trade or re-send",
      why: "Cancelling and asking for a second transfer is a known duplication pattern.",
      re: /\b(re-?send|send (it )?again|place another order|cancel and|send to the other account)\b/i
    }
  ];

  function scan(c) {
    var hits = [];
    c.chat.forEach(function (m) {
      PATTERNS.forEach(function (p) {
        if (p.re.test(m.text)) {
          hits.push({ pattern: p, from: m.from, at: m.at, text: m.text });
        }
      });
    });
    PATTERNS.forEach(function (p) {
      if (p.re.test(c.narrative)) {
        hits.push({ pattern: p, from: "claim statement", at: "", text: c.narrative.slice(0, 140) + "…" });
      }
    });
    return hits;
  }

  function render(body, c) {
    PL.ui.clear(body);
    var hits = scan(c);

    if (!hits.length) {
      body.appendChild(PL.dom.el("div", {
        class: "pl-none",
        text: "No patterns matched. This is not a clearance — read the transcript."
      }));
      return;
    }

    hits.forEach(function (h) {
      var box = PL.dom.el("div", { class: "pl-flag" }, [
        PL.dom.el("div", { class: "pl-ft", text: h.pattern.label }),
        PL.dom.el("div", {
          class: "pl-fq",
          text: (h.from === "claim statement" ? "claim" : h.from + " " + h.at) + ": “" + h.text + "”"
        }),
        PL.dom.el("div", { class: "pl-hint", text: h.pattern.why })
      ]);
      box.addEventListener("click", function () {
        var tab = PL.dom.qs('.tab[data-panel="' + (h.from === "claim statement" ? "claim" : "chat") + '"]');
        if (tab) tab.click();
      });
      box.style.cursor = "pointer";
      body.appendChild(box);
    });

    body.appendChild(PL.dom.el("div", {
      class: "pl-hint",
      text: hits.length + " line(s) flagged for review. The script does not decide anything — click a flag to read it in place."
    }));

    PL.log("surfacer", hits.length + " hits on " + c.id);
  }

  var body = PL.ui.section("surfacer", "Flagged lines");

  PL.watch(PL.adapter.caseKey, function () {
    var c = PL.adapter.readCase();
    if (c) render(body, c);
  });
})();
