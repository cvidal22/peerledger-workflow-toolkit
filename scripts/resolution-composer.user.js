// ==UserScript==
// @name         PeerLedger — Resolution Composer
// @namespace    https://github.com/cvidal22
// @version      3.2.0
// @description  After the operator chooses a resolution route, assembles the outbound user message and the internal case note from live case data. Composition runs strictly after judgement.
// @author       cvidal22
// @match        https://cvidal22.github.io/peerledger-workflow-toolkit/*
// @require      https://raw.githubusercontent.com/cvidal22/peerledger-workflow-toolkit/main/core/pl-core.js?v=3.2.0
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * THE PROBLEM
 *
 * The decision takes thirty seconds. Writing it up takes two minutes: restate
 * the order reference, restate the amount, restate the parties, explain the
 * route in language a distressed user will understand, then write it again in
 * a different register for the audit trail. Same facts, twice, by hand, and
 * every retype is a chance to transpose a digit into a message that goes to
 * someone who has just lost money.
 *
 * WHAT THIS DOES
 *
 * The operator picks a route. The script fills that route's two templates and
 * produces both artefacts for review — the user-facing message and the internal
 * note — which is the point at which they become editable text rather than
 * typing.
 *
 * ORDER OF OPERATIONS IS THE WHOLE DESIGN
 *
 * Nothing here suggests a route, pre-selects one, sorts them by likelihood, or
 * greys out the ones it thinks are wrong. The script has no opinion about which
 * outcome is correct — it has never been validated to have one — it only
 * declines to make a person retype an order reference for the four-thousandth
 * time.
 *
 * The moment a composer starts ranking routes it becomes a decision system
 * wearing a text editor's clothes, and it would be evaluated as one by nobody,
 * because it still looks like a formatting convenience.
 *
 * The user-facing message is never inserted automatically. It is written into
 * the panel for reading. Anything a real person receives should pass through a
 * human's eyes at full attention, and the friction of one copy step is the
 * cheapest possible way to guarantee that.
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
  b.textContent = "PeerLedger toolkit: pl-core.js is missing or out of date " +
    (typeof PL !== "undefined" && PL.version ? "(found " + PL.version + ") " : "") +
    "— remove the scripts in Tampermonkey and reinstall them.";
  b.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:#8f2f2c;" +
    "color:#fff;padding:9px 14px;font:13px system-ui,sans-serif;text-align:center";
  (document.body || document.documentElement).appendChild(b);
})();
if (typeof PL === "undefined" || !PL.ui || !PL.ui.button) return;

  if (!PL.guard("resolution-composer")) return;
  PL.requireCore("3.2.0");
  PL.register("resolution-composer", "3.0.0");

  var ROUTES = [
    {
      id: "request_evidence",
      label: "Request evidence",
      key: "alt+q",
      message:
        "Hello,\n\n" +
        "We have reviewed your claim on order {{orderRef}} ({{fiat}}) and need additional documentation before we can proceed.\n\n" +
        "Please provide a complete bank statement covering the period from {{created}} onward, showing the account holder name and the full transaction record. A screenshot of a single transaction is not sufficient for this claim type.\n\n" +
        "You can upload the document on the claim page. Your claim stays open while we wait.\n\n" +
        "PeerLedger Dispute Operations",
      note:
        "[{{claimId}}] {{typeLabel}} — evidence requested.\n" +
        "Order {{orderRef}} · {{fiat}} · {{status}}.\n" +
        "Complainant {{complainant}} / defendant {{defendant}}.\n" +
        "{{evidenceCount}} item(s) on file — insufficient to determine settlement. Full statement requested from {{created}}.\n" +
        "Awaiting complainant."
    },
    {
      id: "open_recovery",
      label: "Open recovery claim",
      key: "alt+w",
      message:
        "Hello,\n\n" +
        "We have completed our review of order {{orderRef}} ({{fiat}}) and opened a recovery claim on your behalf.\n\n" +
        "The counterparty account has been restricted for the disputed amount while we contact them. If they confirm the funds were received in error, the amount will be returned to you and you will be notified here.\n\n" +
        "No further action is needed from you at this stage.\n\n" +
        "PeerLedger Dispute Operations",
      note:
        "[{{claimId}}] {{typeLabel}} — recovery claim opened.\n" +
        "Order {{orderRef}} · {{fiat}} · {{status}} · released {{released}}.\n" +
        "Complainant {{complainant}} ({{complainantOrders}} orders / {{complainantDisputes}} disputes) vs " +
        "defendant {{defendant}} ({{defendantOrders}} orders / {{defendantDisputes}} disputes).\n" +
        "{{evidenceCount}} item(s) reviewed; consistent with the claim. Counterparty restricted for the disputed amount.\n" +
        "Next: counterparty statement."
    },
    {
      id: "reject_claim",
      label: "Claim not upheld",
      key: "alt+e",
      message:
        "Hello,\n\n" +
        "We have completed our review of order {{orderRef}} ({{fiat}}) and are unable to uphold your claim.\n\n" +
        "The material provided does not establish that the payment failed as described. The order will remain in its current state.\n\n" +
        "If you obtain further documentation, reply here and we will reopen the review.\n\n" +
        "PeerLedger Dispute Operations",
      note:
        "[{{claimId}}] {{typeLabel}} — not upheld.\n" +
        "Order {{orderRef}} · {{fiat}} · {{status}}.\n" +
        "Complainant {{complainant}} / defendant {{defendant}}.\n" +
        "{{evidenceCount}} item(s) reviewed; insufficient to establish the claimed failure. Complainant advised of reopening path.\n" +
        "Closed."
    },
    {
      id: "policy_referral",
      label: "Policy referral",
      key: "alt+r",
      message:
        "Hello,\n\n" +
        "While reviewing order {{orderRef}} we identified activity in the trade chat that is not permitted under the platform trading rules.\n\n" +
        "This has been referred to our account integrity team. Your claim on this order continues to be reviewed separately and is not affected by the referral.\n\n" +
        "PeerLedger Dispute Operations",
      note:
        "[{{claimId}}] {{typeLabel}} — referred to account integrity.\n" +
        "Order {{orderRef}} · {{fiat}} · {{status}}.\n" +
        "Complainant {{complainant}} / defendant {{defendant}}.\n" +
        "Transcript contains conduct outside trading rules. Referred for independent assessment; dispute review continues on its own track.\n" +
        "Referred."
    }
  ];

  function vars(c) {
    return {
      claimId: c.id, typeLabel: c.typeLabel,
      orderRef: c.order.ref, fiat: c.order.fiat, status: c.order.status,
      created: c.order.createdAt, released: c.order.releasedAt || "not released",
      complainant: c.complainant.handle, defendant: c.defendant.handle,
      complainantOrders: String(c.complainant.orders),
      complainantDisputes: String(c.complainant.disputes),
      defendantOrders: String(c.defendant.orders),
      defendantDisputes: String(c.defendant.disputes),
      evidenceCount: String(c.evidence.length)
    };
  }

  function render(body) {
    var c = PL.adapter.readCase();
    PL.ui.clear(body);
    if (!c) { body.appendChild(PL.dom.el("div", { class: "pl-none", text: "Open a case." })); return; }

    if (body.setHeaderRight) body.setHeaderRight(c.id);

    var out = PL.dom.el("textarea", { class: "pl-out", spellcheck: "false" });
    var active = null;
    var v = vars(c);

    function compose(route) {
      active = route;
      PL.dom.qsa(".pl-btn", body).forEach(function (b) {
        b.classList.toggle("on", b.getAttribute("data-route") === route.id);
      });
      try {
        out.value =
          "— MESSAGE TO USER —\n\n" + PL.template.render(route.message, v) +
          "\n\n— INTERNAL CASE NOTE —\n\n" + PL.template.render(route.note, v);
      } catch (err) {
        out.value = "Composition halted: " + err.message +
          "\n\nThis case has no value for that field. Nothing was generated — " +
          "a half-filled message is worse than none.";
      }
    }

    ROUTES.forEach(function (r) {
      var b = PL.dom.el("button", {
        class: "pl-btn", text: r.label, title: r.key.toUpperCase(),
        onclick: function () { compose(r); }
      });
      b.setAttribute("data-route", r.id);
      body.appendChild(b);
    });

    body.appendChild(out);

    /* Routes choose an outcome; these act on what was composed. Mixing them
       in one row invites clicking an action while meaning to pick a route. */
    var acts = PL.dom.el("div", { class: "pl-acts" });
    body.appendChild(acts);

    acts.appendChild(PL.dom.el("button", {
      class: "pl-btn", text: "Copy both",
      onclick: function () {
        if (!active) { PL.ui.toast("Pick a route first."); return; }
        PL.clipboard.copy(out.value);
        PL.ui.toast("Copied.");
      }
    }));

    acts.appendChild(PL.dom.el("button", {
      class: "pl-btn", text: "Note → field",
      onclick: function () {
        if (!active) { PL.ui.toast("Pick a route first."); return; }
        var noteOnly = out.value.split("— INTERNAL CASE NOTE —")[1];
        if (!noteOnly) return;
        PL.insert(PL.adapter.noteField(), noteOnly.trim(), "append");
        PL.ui.toast("Note inserted. The user message is not auto-sent.");
      }
    }));

    body.appendChild(PL.dom.el("div", {
      class: "pl-hint",
      text: "Pick a route after you have decided it. Alt+Q / W / E / R."
    }));
    body.appendChild(PL.dom.el("div", {
      class: "pl-hint",
      text: "Only the internal note can be inserted. Anything a user reads goes through your eyes first."
    }));

    ROUTES.forEach(function (r) { PL.hotkeys.bind(r.key, function () { if (PL.adapter.caseKey()) compose(r); }); });
  }

  PL.ui.button({
    id: "composer",
    label: "Compose",
    title: "Resolution composer",
    pages: ["case"],
    disabled: function () {
      var m = PL.dom.qs("#main");
      if (!m || !m.getAttribute("data-claim-id")) return "Open a claim first.";
      return m.getAttribute("data-claim-state") === "closed"
        ? "This claim is closed — composing is unavailable." : null;
    },
    render: render
  });

  PL.watch(PL.adapter.caseKey, function () {
    PL.ui.refresh();
    var live = PL.ui.liveBody("composer");
    if (live) render(live);
  });
})();
