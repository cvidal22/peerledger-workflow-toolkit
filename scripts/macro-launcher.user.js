// ==UserScript==
// @name         PeerLedger — Macro Launcher
// @namespace    https://github.com/cvidal22
// @version      3.1.1
// @description  Keyboard-invoked searchable macro palette. Fills templates from live case data and inserts into the note field. Refuses to insert anything it could not fully resolve.
// @author       cvidal22
// @match        https://cvidal22.github.io/peerledger-workflow-toolkit/*
// @require      https://cdn.jsdelivr.net/gh/cvidal22/peerledger-workflow-toolkit@main/core/pl-core.js?v=3.1.1
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
 * @require content is cached by the extension AND by the CDN. A stale or
 * failed fetch leaves PL undefined or out of date, and a bare throw here
 * dies in the console where nobody is looking — the operator just sees a
 * toolkit that stopped existing.
 *
 * The version is pinned in the @require URL so a core update forces a
 * re-fetch instead of silently serving the old build.
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

  if (!PL.guard("macro-launcher")) return;
  PL.requireCore("3.1.1");
  PL.register("macro-launcher", "3.0.0");

  var MACROS = [
    {
      name: "Request full bank statement",
      tags: ["evidence", "statement", "req"],
      body:
        "Requested full statement from {{complainant}} covering the order window " +
        "({{created}} onward) for order {{orderRef}} ({{fiat}}). Screenshot of a single " +
        "transaction insufficient for {{typeLabel}}. Claim held open pending response."
    },
    {
      name: "Recovery claim opened",
      tags: ["recovery", "frc", "open"],
      body:
        "Recovery claim opened on {{orderRef}} ({{fiat}}). Complainant {{complainant}} " +
        "({{complainantOrders}} orders, {{complainantDisputes}} prior disputes) vs " +
        "{{defendant}} ({{defendantOrders}} orders, {{defendantDisputes}} prior disputes). " +
        "Evidence on file: {{evidenceCount}} item(s). Counterparty restricted for the " +
        "disputed amount pending statement."
    },
    {
      name: "Claim not upheld — insufficient evidence",
      tags: ["reject", "close", "insufficient"],
      body:
        "Claim not upheld on {{orderRef}} ({{fiat}}). {{evidenceCount}} item(s) reviewed; " +
        "material does not establish the failure described in a {{typeLabel}} claim. " +
        "Complainant {{complainant}} advised of the reopening path. Order left at {{status}}."
    },
    {
      name: "Third-party payment — policy referral",
      tags: ["3rd", "tpp", "policy", "referral"],
      body:
        "Transcript on {{orderRef}} indicates payment tendered from an account other than " +
        "the trading account. Referred to account integrity for independent assessment. " +
        "Dispute review continues separately. Parties: {{complainant}} / {{defendant}}."
    },
    {
      name: "Off-platform solicitation — policy referral",
      tags: ["offplatform", "telegram", "policy", "referral"],
      body:
        "Transcript on {{orderRef}} contains a request to move the trade off-platform. " +
        "Referred to account integrity. Dispute outcome assessed independently of the " +
        "referral. Parties: {{complainant}} / {{defendant}}."
    },
    {
      name: "Chargeback — awaiting bank documentation",
      tags: ["chargeback", "reversal", "bank"],
      body:
        "Reversal reported on {{orderRef}} ({{fiat}}), released {{released}}. Awaiting the " +
        "issuer's reversal notice from {{complainant}} before assessing. {{evidenceCount}} " +
        "item(s) currently on file."
    },
    {
      name: "Counterparty unresponsive — extending window",
      tags: ["unresponsive", "extend", "followup"],
      body:
        "{{defendant}} unresponsive on {{orderRef}} since claim opened {{opened}}. " +
        "Response window extended. Escalate if no reply by the next review."
    },
    {
      name: "Late payment after auto-cancel",
      tags: ["late", "cancel", "timer"],
      body:
        "Payment on {{orderRef}} tendered after the order auto-cancelled at {{status}}. " +
        "Complainant {{complainant}} seeking return of {{fiat}} from {{defendant}}. " +
        "Assessed on evidence of the transfer, not on the cancellation itself."
    },
    {
      name: "Preliminary review — holding for second read",
      tags: ["hold", "prelim", "pending"],
      body:
        "Preliminary review on {{orderRef}} complete; holding for a second read before " +
        "action. {{evidenceCount}} item(s) on file, {{chatCount}} chat messages reviewed. " +
        "No action taken this pass."
    },
    {
      name: "Case summary — decision recorded",
      tags: ["summary", "close", "decision"],
      body:
        "Case summary — {{claimId}} / {{typeLabel}}\n" +
        "Order {{orderRef}} · {{fiat}} · {{status}} · released {{released}}\n" +
        "Complainant {{complainant}} vs defendant {{defendant}}\n" +
        "Evidence: {{evidenceCount}} item(s). Transcript: {{chatCount}} messages.\n" +
        "Decision: "
    }
  ];

  function vars(c) {
    return {
      claimId: c.id,
      typeLabel: c.typeLabel,
      orderRef: c.order.ref,
      fiat: c.order.fiat,
      status: c.order.status,
      created: c.order.createdAt,
      released: c.order.releasedAt || "not released",
      opened: c.openedAt,
      complainant: c.complainant.handle,
      complainantOrders: String(c.complainant.orders),
      complainantDisputes: String(c.complainant.disputes),
      defendant: c.defendant.handle,
      defendantOrders: String(c.defendant.orders),
      defendantDisputes: String(c.defendant.disputes),
      evidenceCount: String(c.evidence.length),
      chatCount: String(c.chat.length)
    };
  }

  /* Published to the shared registry rather than drawn locally. Any script
     can add entries to the same palette without this file changing, which is
     what stops the launcher becoming the file everyone has to edit. */
  MACROS.forEach(function (m, i) {
    PL.registry.publish({
      channel: "note-macro",
      id: m.name,
      group: "Note macros",
      order: 10 + i,
      label: m.name,
      tags: m.tags,
      body: m.body
    });
  });

  function open() {
    var c = PL.adapter.readCase();
    if (!c) { PL.ui.toast("Open a case first."); return; }

    var v = vars(c);
    var field = PL.adapter.noteField();

    var items = PL.registry.group("Note macros").map(function (m) {
      var resolved = null, missing = null;
      try { resolved = PL.template.render(m.body, v); }
      catch (err) { missing = err.message.replace("missing token: ", ""); }

      return {
        name: m.name,
        tags: m.tags,
        preview: missing
          ? "Unavailable — this case has no value for “" + missing + "”"
          : resolved.replace(/\s+/g, " ").slice(0, 96) + "…",
        run: function () {
          if (missing) {
            PL.ui.toast("Not inserted — missing “" + missing + "”. Nothing was written.");
            return;
          }
          PL.insert(field, resolved, "append");
          PL.ui.toast("Inserted: " + m.name);
          PL.log("macro", m.name + " -> " + c.id);
        }
      };
    });

    PL.overlay({
      items: items,
      placeholder: "Macro for " + c.id + " — type to filter",
      footer: MACROS.length + " macros"
    });
  }

  PL.hotkeys.bind("alt+k", open);

  PL.ui.button({
    id: "macros",
    label: "Macros",
    pages: ["case"],
    /* No popover: this button IS the action. A palette that needed two
       clicks to open would be slower than the dropdown it replaces. */
    onClick: open,
    badge: function () { return String(PL.registry.group("Note macros").length); }
  });

  PL.watch(PL.adapter.caseKey, function () { PL.ui.refresh(); });
})();
