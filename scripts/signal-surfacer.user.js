// ==UserScript==
// @name         PeerLedger — Signal Surfacer
// @namespace    https://github.com/cvidal22
// @version      3.0.0
// @description  Scans the trade transcript and claim statement for known policy-violation patterns and surfaces the matching lines for human review. Flags, never decides.
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
 * account, pressuring a counterparty into releasing early — are usually sitting
 * in plain sight in the transcript. But it is one line in forty, phrased a dozen
 * different ways, and by the hundredth case of a shift your attention is not
 * what it was at the tenth. Detection quality drifts with fatigue, and it drifts
 * silently: nobody can see the ones you stopped noticing.
 *
 * WHAT THIS DOES
 *
 * Runs a pattern set over the transcript and the claim statement and lists every
 * match with the line it came from, who said it, and why the pattern exists.
 *
 * THE CONSTRAINT THAT MATTERS MOST
 *
 * This script has no verdict. It cannot restrict an account, cannot score a case
 * as fraud, cannot rank or recommend. It answers exactly one question — "is there
 * a line here you would want to have read?" — and hands the line back.
 *
 * That limit is deliberate, and it is the most important design decision in the
 * repository. Two reasons:
 *
 *   An operator shown a conclusion starts agreeing with it. Give people a
 *     confidence score and within a week they are reviewing the score instead
 *     of the case. The automation would then be quietly deciding outcomes it
 *     was never validated to decide.
 *
 *   A pattern matcher has no idea what it is missing. It cannot see the
 *     coercion phrased politely or the scam that used none of these words.
 *     Something with no concept of its own blind spots has no business
 *     producing a verdict.
 *
 * So it optimises for recall, accepts false positives as the cost of that, and
 * leaves precision where it belongs. A false positive costs a second of reading.
 * A missed off-platform solicitation costs a user their money.
 *
 * Every flag is one click from its source line, so dismissing a wrong one is
 * as cheap as acting on a right one.
 */

(function () {
  "use strict";

  if (!PL.guard("signal-surfacer")) return;
  PL.requireCore("3.0.0");
  PL.register("signal-surfacer", "3.0.0");

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
      re: /\b(my (cousin|friend|brother|sister|wife|husband|mother|father|uncle)|another account|different name|someone else'?s? account|paying for me|my other account)\b/i
    },
    {
      id: "release_pressure",
      label: "Pressure to release early",
      why: "Urgency aimed at whoever is holding the asset is the common lead-in to a non-payment loss.",
      re: /\b(release it|just release|release now|release or|please release|hurry|i'?m not a scammer|im not a scammer|trust me|open a dispute against you)\b/i
    },
    {
      id: "bank_delay_claim",
      label: "Unverified bank-delay claim",
      why: "Often used to explain a receipt that will never settle. Worth checking against the statement.",
      re: /\b(bank (is )?slow|holiday delay|takes a while to show|already left my account|money left already|bank app is down|pending on my side)\b/i
    },
    {
      id: "re_trade_request",
      label: "Request to re-trade or re-send",
      why: "Cancelling and asking for a second transfer is a known duplication pattern.",
      re: /\b(re-?send|send it again|place another order|cancel and|send to the other account|re-?send to)\b/i
    }
  ];

  var body = PL.ui.section("surfacer", "Flagged lines");

  function scan(c) {
    var hits = [];
    c.chat.forEach(function (m) {
      PATTERNS.forEach(function (p) {
        if (p.re.test(m.text)) hits.push({ p: p, from: m.from, at: m.at, text: m.text, where: "chat" });
      });
    });
    PATTERNS.forEach(function (p) {
      if (p.re.test(c.narrative)) {
        hits.push({ p: p, from: "claim", at: "", text: c.narrative.slice(0, 130) + "…", where: "claim" });
      }
    });
    return hits;
  }

  function render(c) {
    PL.ui.clear(body);
    if (!c) { body.appendChild(PL.dom.el("div", { class: "pl-none", text: "Open a case." })); return; }

    var hits = scan(c);
    body.setHeaderRight(hits.length ? hits.length + " flagged" : "clear");

    if (!hits.length) {
      body.appendChild(PL.dom.el("div", {
        class: "pl-none",
        text: "No patterns matched. This is not a clearance — read the transcript."
      }));
      return;
    }

    hits.forEach(function (h) {
      var box = PL.dom.el("div", { class: "pl-flag" }, [
        PL.dom.el("div", { class: "t", text: h.p.label }),
        PL.dom.el("div", { class: "q", text: (h.where === "claim" ? "claim" : h.from + " " + h.at) + ": “" + h.text + "”" }),
        PL.dom.el("div", { class: "w", text: h.p.why })
      ]);
      box.addEventListener("click", function () {
        var el = PL.dom.qs(h.where === "claim" ? "#claim-narrative" : "#chat-log");
        if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      body.appendChild(box);
    });

    body.appendChild(PL.dom.el("div", {
      class: "pl-hint",
      text: "Patterns catch attention, they don't spend it. Nothing here is a finding."
    }));

    PL.log("surfacer", hits.length + " hits on " + c.id);
  }

  PL.watch(PL.adapter.caseKey, function () { render(PL.adapter.readCase()); });
})();
