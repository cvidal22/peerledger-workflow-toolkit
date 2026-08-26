// ==UserScript==
// @name         PeerLedger — Resolution Composer
// @namespace    https://github.com/cvidal22
// @version      1.0.0
// @description  Once the operator has chosen a resolution route, assembles the outbound instruction and the internal case note from live case data. Keyboard-driven.
// @author       cvidal22
// @match        https://cvidal22.github.io/peerledger-workflow-toolkit/*
// @require      https://cdn.jsdelivr.net/gh/cvidal22/peerledger-workflow-toolkit@main/core/pl-core.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * THE PROBLEM
 *
 * The decision takes thirty seconds. Writing it up takes two minutes: restate
 * the order reference, restate the amount, restate the parties, explain the
 * route in the register the user will understand, then write the internal note
 * again in a different register for the audit trail. Same facts, retyped, and
 * every retype is a chance to transpose a digit.
 *
 * WHAT THIS DOES
 *
 * The operator picks a route. The script fills that route's template from the
 * case data already on the page and produces both artefacts — the user-facing
 * message and the internal note — ready to review and copy.
 *
 * THE ORDER OF OPERATIONS IS THE POINT
 *
 * Composition happens strictly after judgement. Nothing here suggests a route,
 * pre-selects one, or ranks them by likelihood. The script has no opinion about
 * which outcome is correct; it only refuses to make a human retype an order
 * reference for the four-thousandth time.
 *
 * Templates fail loudly on a missing token (see PL.template) rather than
 * emitting a half-filled message to a user.
 */

(function () {
  "use strict";

  var ROUTES = [
    {
      id: "request_evidence",
      label: "Request evidence",
      key: "alt+q",
      message:
        "Hello,\n\n" +
        "We have reviewed your claim on order {{orderRef}} ({{fiatValue}}) and need additional documentation before we can proceed.\n\n" +
        "Please provide a complete bank statement covering {{window}}, showing the account holder name and the full transaction record. Screenshots of a single transaction are not sufficient for this claim type.\n\n" +
        "You can upload the document in the claim page. This claim remains open while we wait.\n\n" +
        "PeerLedger Dispute Operations",
      note:
        "[{{claimId}}] {{typeLabel}} — evidence requested.\n" +
        "Order {{orderRef}} · {{fiatValue}} · status {{status}}.\n" +
        "Parties: seller {{seller}} / buyer {{buyer}}.\n" +
        "Submitted so far: {{evidenceCount}} item(s). Full statement requested; insufficient to determine settlement from current material.\n" +
        "Awaiting complainant."
    },
    {
      id: "open_recovery",
      label: "Open recovery claim",
      key: "alt+w",
      message:
        "Hello,\n\n" +
        "We have completed our review of order {{orderRef}} ({{fiatValue}}) and opened a recovery claim on your behalf.\n\n" +
        "The counterparty account has been restricted for the disputed amount while we contact them. If they confirm the funds were received in error, the amount will be returned to you and you will be notified here.\n\n" +
        "No further action is needed from you at this stage.\n\n" +
        "PeerLedger Dispute Operations",
      note:
        "[{{claimId}}] {{typeLabel}} — recovery claim opened.\n" +
        "Order {{orderRef}} · {{fiatValue}} · status {{status}}.\n" +
        "Parties: seller {{seller}} / buyer {{buyer}}.\n" +
        "Evidence reviewed: {{evidenceCount}} item(s). Complainant material consistent with claim; counterparty restricted for disputed amount pending response.\n" +
        "Next: counterparty statement."
    },
    {
      id: "reject_claim",
      label: "Reject claim",
      key: "alt+e",
      message:
        "Hello,\n\n" +
        "We have completed our review of order {{orderRef}} ({{fiatValue}}) and are unable to uphold your claim.\n\n" +
        "The material provided does not establish that the payment failed to reach the counterparty as described. The order will remain in its current state.\n\n" +
        "If you obtain further documentation, you may reply here and we will reopen the review.\n\n" +
        "PeerLedger Dispute Operations",
      note:
        "[{{claimId}}] {{typeLabel}} — claim not upheld.\n" +
        "Order {{orderRef}} · {{fiatValue}} · status {{status}}.\n" +
        "Parties: seller {{seller}} / buyer {{buyer}}.\n" +
        "Evidence reviewed: {{evidenceCount}} item(s). Insufficient to establish the claimed failure. Complainant advised of reopening path.\n" +
        "Closed."
    },
    {
      id: "policy_breach",
      label: "Escalate policy breach",
      key: "alt+r",
      message:
        "Hello,\n\n" +
        "During our review of order {{orderRef}} we identified activity in the trade chat that is not permitted under the platform trading rules.\n\n" +
        "This has been referred to the account integrity team. Your claim on this order continues to be reviewed separately and is not affected by this referral.\n\n" +
        "PeerLedger Dispute Operations",
      note:
        "[{{claimId}}] {{typeLabel}} — referred to account integrity.\n" +
        "Order {{orderRef}} · {{fiatValue}} · status {{status}}.\n" +
        "Parties: seller {{seller}} / buyer {{buyer}}.\n" +
        "Transcript contains conduct outside trading rules. Referred for independent assessment; dispute review continues on its own track.\n" +
        "Referred."
    }
  ];

  function vars(c) {
    return {
      claimId: c.id,
      typeLabel: c.typeLabel,
      orderRef: c.order.ref,
      fiatValue: c.order.fiatValue,
      status: c.order.status,
      seller: c.parties.seller.handle,
      buyer: c.parties.buyer.handle,
      evidenceCount: String(c.evidence.length),
      window: c.order.createdAt.slice(0, 10) + " to today"
    };
  }

  function render(body, c) {
    PL.ui.clear(body);

    var out = PL.dom.el("textarea", { class: "pl-out", spellcheck: "false" });
    var active = null;

    function compose(route) {
      active = route;
      Array.prototype.forEach.call(body.querySelectorAll(".pl-btn"), function (b) {
        b.classList.toggle("pl-on", b.dataset.route === route.id);
      });
      try {
        var v = vars(c);
        out.value =
          "— MESSAGE TO USER —\n\n" +
          PL.template.render(route.message, v) +
          "\n\n— INTERNAL CASE NOTE —\n\n" +
          PL.template.render(route.note, v);
      } catch (err) {
        out.value = "Composition halted: " + err.message +
          "\n\nThe case data needed for this template is missing from the page. Nothing was generated.";
      }
    }

    ROUTES.forEach(function (r) {
      var btn = PL.dom.el("button", {
        class: "pl-btn",
        text: r.label,
        title: r.key.toUpperCase(),
        onclick: function () { compose(r); }
      });
      btn.dataset.route = r.id;
      body.appendChild(btn);
    });

    body.appendChild(out);

    body.appendChild(PL.dom.el("button", {
      class: "pl-btn",
      text: "Copy both",
      onclick: function () {
        if (!active) return;
        PL.clipboard.copy(out.value);
        PL.log("composer", "copied " + active.id + " for " + c.id);
      }
    }));

    body.appendChild(PL.dom.el("div", {
      class: "pl-hint",
      text: "Pick a route after you have decided it. Alt+Q / W / E / R. Every field is drawn from this case — read before sending."
    }));

    ROUTES.forEach(function (r) {
      PL.hotkeys.bind(r.key, function () { compose(r); });
    });
  }

  var body = PL.ui.section("composer", "Resolution composer");

  PL.watch(PL.adapter.caseKey, function () {
    var c = PL.adapter.readCase();
    if (c) render(body, c);
  });
})();
