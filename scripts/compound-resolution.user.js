// ==UserScript==
// @name         PeerLedger — Compound Resolution
// @namespace    https://github.com/cvidal22
// @version      3.0.0
// @description  Runs a full resolution as one operator gesture: send the user message, record the case note, close the claim. Preflighted, verified between steps, aborts on failure and reports exactly what committed.
// @author       cvidal22
// @match        https://cvidal22.github.io/peerledger-workflow-toolkit/*
// @require      https://cdn.jsdelivr.net/gh/cvidal22/peerledger-workflow-toolkit@main/core/pl-core.js?v=3.0.1
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * THE PROBLEM
 *
 * Resolving a case is one decision followed by three separate acts of typing
 * and clicking: message the user, record the note, close the claim. They must
 * happen in that order, they must all happen, and the third one is refused by
 * the platform if the second didn't land.
 *
 * Doing them by hand costs about two minutes. Doing them by hand a hundred
 * times a day costs a shift's worth of attention on work that involves no
 * judgement whatsoever — the judgement finished before the first keystroke.
 *
 * WHY THIS ISN'T "THREE CLICKS BEHIND ONE KEYSTROKE"
 *
 * That version exists, it takes ten minutes to write, and it is dangerous.
 * A browser UI has no transactions, so a chain that assumes success produces
 * *partial* failures: the message goes out, the note never saves, the claim
 * stays open — and nothing downstream shows that it happened. The user has
 * been told their case is resolved. The audit trail says nobody touched it.
 *
 * Partial failure is worse than no automation, because no automation fails
 * visibly and this fails silently.
 *
 * WHAT THE CHAIN RUNNER ACTUALLY BUYS (all of it in PL.chain)
 *
 *   Preflight   — refuse at step zero rather than abort at step three.
 *                 This is the only mechanism that avoids partial state
 *                 entirely rather than reporting it after the fact.
 *   Verify      — each step proves it landed by observing the page, not by
 *                 the click returning. A save that silently didn't persist
 *                 is the failure mode that costs the most to discover late.
 *   Abort       — stop rather than continue into steps that assume success.
 *   Report      — name exactly which steps committed. If the chain dies
 *                 after step two, the operator needs to know that before
 *                 they retry and double-send.
 *   Lock        — one chain at a time. Impatient double-taps collapse to one.
 *   Once        — a completed chain won't re-run on the same case without an
 *                 explicit reset. Double-sending a resolution to a user who
 *                 just lost money is not a recoverable mistake.
 *   Confirm     — irreversible steps require an explicit yes, and the dialog
 *                 shows what already committed before asking.
 *
 * DESIGN CALLS I MADE — correct these if they're wrong for your workflow
 *
 *   1. Verification is by observation, not optimism. Every step polls for
 *      evidence in the page rather than sleeping a fixed interval. A fixed
 *      sleep is wrong in both directions: too short on a slow morning, wasted
 *      time on every other run.
 *
 *   2. Failure stops and reports; it does not retry and does not roll back.
 *      Retry risks double-sending. Rollback is a lie in a UI that offers no
 *      undo — claiming to have reverted something you only clicked at is a
 *      worse failure than admitting the partial state.
 *
 *   3. Only the irreversible step confirms. Confirming everything trains the
 *      operator to dismiss dialogs without reading, which destroys the value
 *      of the one dialog that matters.
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

  if (!PL.guard("compound-resolution")) return;
  PL.requireCore("3.0.0");
  PL.register("compound-resolution", "3.0.0");

  var body = PL.ui.section("compound", "Compound resolution");
  var lastResult = null;

  /* ---- the chains -------------------------------------------------- */

  var CHAINS = [
    {
      id: "refund_close",
      label: "Recovery + close",
      key: "alt+1",
      message:
        "Hello,\n\n" +
        "We have completed our review of order {{orderRef}} ({{fiat}}) and opened a recovery claim on your behalf.\n\n" +
        "The counterparty account has been restricted for the disputed amount while we contact them. If the funds are returned, you will be notified here.\n\n" +
        "No further action is needed from you.\n\n" +
        "PeerLedger Dispute Operations",
      note:
        "[{{claimId}}] {{typeLabel}} — recovery claim opened, appeal closed.\n" +
        "Order {{orderRef}} · {{fiat}} · {{status}} · released {{released}}.\n" +
        "Complainant {{complainant}} ({{complainantOrders}} orders / {{complainantDisputes}} disputes) vs " +
        "defendant {{defendant}} ({{defendantOrders}} orders / {{defendantDisputes}} disputes).\n" +
        "{{evidenceCount}} evidence item(s) reviewed and consistent with the claim. Counterparty restricted for the disputed amount.\n" +
        "Complainant notified. Closed."
    },
    {
      id: "reject_close",
      label: "Not upheld + close",
      key: "alt+2",
      message:
        "Hello,\n\n" +
        "We have completed our review of order {{orderRef}} ({{fiat}}) and are unable to uphold your claim.\n\n" +
        "The material provided does not establish that the payment failed as described. The order remains in its current state.\n\n" +
        "If you obtain further documentation, reply here and we will reopen the review.\n\n" +
        "PeerLedger Dispute Operations",
      note:
        "[{{claimId}}] {{typeLabel}} — not upheld, appeal closed.\n" +
        "Order {{orderRef}} · {{fiat}} · {{status}}.\n" +
        "Complainant {{complainant}} / defendant {{defendant}}.\n" +
        "{{evidenceCount}} item(s) reviewed; insufficient to establish the claimed failure. Reopening path communicated.\n" +
        "Complainant notified. Closed."
    }
  ];

  function vars(c) {
    return {
      claimId: c.id, typeLabel: c.typeLabel,
      orderRef: c.order.ref, fiat: c.order.fiat, status: c.order.status,
      released: c.order.releasedAt || "not released",
      complainant: c.complainant.handle, defendant: c.defendant.handle,
      complainantOrders: String(c.complainant.orders),
      complainantDisputes: String(c.complainant.disputes),
      defendantOrders: String(c.defendant.orders),
      defendantDisputes: String(c.defendant.disputes),
      evidenceCount: String(c.evidence.length)
    };
  }

  /* ---- execution --------------------------------------------------- */

  function execute(chain) {
    var c = PL.adapter.readCase();
    if (!c) { PL.ui.toast("Open a case first."); return; }

    var v = vars(c);
    var msgText, noteText;
    try {
      msgText = PL.template.render(chain.message, v);
      noteText = PL.template.render(chain.note, v);
    } catch (err) {
      PL.ui.toast("Not run — template " + err.message + ". Nothing was sent.");
      return;
    }

    var msgField = PL.dom.qs("#msg-input");
    var noteField = PL.adapter.noteField();
    /* Count only real note rows. The host renders an empty-state placeholder
       row when there are no notes, and counting that makes the verification
       for a first-note case never confirm — the chain would hang on exactly
       the cases that had no history. Found by testing, not by reading. */
    var countNotes = function () { return PL.dom.qsa("#notes-table tbody tr td.by").length; };
    var notesBefore = countNotes();
    var sentBefore = PL.dom.qsa("#sent-log .sent:not(.none)").length;

    PL.chain.run({
      key: c.id + ":" + chain.id,

      /* Preflight. Every one of these is a reason the chain would have died
         partway through, checked while nothing has happened yet. */
      preflight: [
        { label: "Claim is still open",
          check: function () { return PL.dom.qs("#main").getAttribute("data-claim-state") !== "closed"; } },
        { label: "Message field is present and editable",
          check: function () { return msgField && !msgField.disabled; } },
        { label: "Note field is present and editable",
          check: function () { return noteField && !noteField.disabled; } },
        { label: "Close control is available",
          check: function () { var b = PL.dom.qs("#close-claim"); return b && !b.disabled; } },
        { label: "No message already sent on this claim",
          check: function () { return sentBefore === 0; } }
      ],

      steps: [
        {
          name: "Send message to complainant",
          run: function () {
            PL.insert(msgField, msgText);
            PL.dom.qs("#msg-send").click();
          },
          /* Verified by the sent log growing — not by the click returning. */
          verify: function () {
            return PL.dom.qsa("#sent-log .sent:not(.none)").length > sentBefore;
          }
        },
        {
          name: "Record case note",
          run: function () {
            PL.insert(noteField, noteText);
            PL.dom.qs("#note-save").click();
          },
          /* Verified by the note appearing in history. The platform refuses
             to close without it, so an unverified pass here guarantees the
             next step fails — better to stop now and say so. */
          verify: function () { return countNotes() > notesBefore; }
        },
        {
          name: "Close claim",
          irreversible: true,
          run: function () {
            var b = PL.dom.qs("#close-claim");
            if (!b || b.disabled) throw new Error("close control unavailable");
            b.click();
          },
          verify: function () {
            return PL.dom.qs("#main").getAttribute("data-claim-state") === "closed";
          }
        }
      ],

      confirm: function (step, log) {
        var done = log.filter(function (l) { return l.state === "done"; });
        return PL.ui.confirm("Close " + c.id + "?", [
          "This cannot be undone.",
          done.length
            ? "Already committed: " + done.map(function (d) { return d.name; }).join(", ") + "."
            : "Nothing has committed yet.",
          "Order " + c.order.ref + " · " + c.order.fiat + "."
        ]);
      },

      onProgress: function (log, msg) { render(log, msg, null); }
    }).then(function (res) {
      lastResult = res;
      render(res.log, null, res);
      if (res.ok) PL.ui.toast("Chain complete on " + c.id + ".");
      else PL.ui.toast(res.reason);
      PL.log("compound", chain.id + " -> " + (res.ok ? "ok" : res.reason));
    });
  }

  /* ---- panel ------------------------------------------------------- */

  function icon(state) {
    return { pending: "·", running: "▸", done: "✓", failed: "✕", declined: "–" }[state] || "·";
  }

  function render(log, progressMsg, result) {
    PL.ui.clear(body);
    var c = PL.adapter.readCase();

    if (!c) {
      body.appendChild(PL.dom.el("div", { class: "pl-none", text: "Open a case." }));
      return;
    }
    body.setHeaderRight(c.id);

    var closed = PL.dom.qs("#main").getAttribute("data-claim-state") === "closed";
    if (closed && !log) {
      body.appendChild(PL.dom.el("div", { class: "pl-none", text: "Claim is closed. Nothing to run." }));
      return;
    }

    if (!closed) CHAINS.forEach(function (ch) {
      var ran = PL.chain.hasRun(c.id + ":" + ch.id);
      var b = PL.dom.el("button", {
        class: "pl-btn", text: ch.label + (ran ? " ✓" : ""),
        title: ch.key.toUpperCase(),
        onclick: function () { execute(ch); }
      });
      b.disabled = PL.chain.isLocked();
      body.appendChild(b);
    });

    if (log && log.length) {
      body.appendChild(PL.ui.sub("Steps"));
      log.forEach(function (l) {
        body.appendChild(PL.dom.el("div", { class: "pl-step " + l.state }, [
          PL.dom.el("span", { class: "ic", text: icon(l.state) }),
          PL.dom.el("span", { text: l.name + (l.error ? " — " + l.error : "") })
        ]));
      });
    }

    if (progressMsg) body.appendChild(PL.dom.el("div", { class: "pl-hint", text: progressMsg }));

    if (result) {
      if (result.ok) {
        body.appendChild(PL.dom.el("div", { class: "pl-okbox", text: "All steps confirmed. Claim closed." }));
      } else {
        body.appendChild(PL.dom.el("div", { class: "pl-pre", text: result.reason }));
        (result.detail || []).forEach(function (d) {
          body.appendChild(PL.dom.el("div", { class: "pl-hint", text: "· " + d }));
        });
        if (result.warning) {
          body.appendChild(PL.dom.el("div", { class: "pl-warn", text: result.warning }));
          body.appendChild(PL.dom.el("div", {
            class: "pl-hint",
            text: "Nothing was rolled back. A UI with no undo cannot honestly claim to revert — finish the remaining steps by hand."
          }));
        }
      }
    }

    body.appendChild(PL.dom.el("div", {
      class: "pl-hint",
      text: "Alt+1 recovery + close · Alt+2 not upheld + close. Verified between steps; aborts rather than assuming."
    }));
  }

  CHAINS.forEach(function (ch) {
    PL.hotkeys.bind(ch.key, function () { if (PL.adapter.caseKey()) execute(ch); });
  });

  PL.watch(PL.adapter.caseKey, function () { lastResult = null; render(null, null, null); });
})();
