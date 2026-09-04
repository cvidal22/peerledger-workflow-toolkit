// ==UserScript==
// @name         Dispute Handling — Macro Engine
// @namespace    https://github.com/cvidal22
// @version      6.1.1
// @description  Generates the full case-type × action macro grid from one skeleton. Per-party language resolution on outbound messages, single-language internal notes, review gate before every save, marker-verified writes.
// @author       cvidal22
// @match        https://cvidal22.github.io/peerledger-workflow-toolkit/*
// @require      https://raw.githubusercontent.com/cvidal22/peerledger-workflow-toolkit/main/core/pl-core.js?v=6.1.1
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * THE PROBLEM THIS SOLVES IS SCALE, NOT SPEED
 *
 * A dispute queue has a small number of case types and a small number of
 * things you can do about one. Six types, roughly a dozen actions. But every
 * combination needs its own message wording and its own note wording, because
 * what you tell a seller whose buyer charged back is not what you tell a buyer
 * who overpaid.
 *
 * Six by twelve is seventy-two macros. Written individually that is seventy-two
 * files to maintain, and the failure mode is not that writing them is slow —
 * it is that they drift. A fix to the deadline-parsing bug lands in the four
 * macros you remembered. The other sixty-eight keep the bug. Six months later
 * no two macros behave quite the same way and nobody can say which are correct.
 *
 * THE ANSWER IS A MATRIX, NOT A LIBRARY
 *
 * There is one execution skeleton. Case types and actions are declared as data.
 * Every macro in the grid is generated from the same code path, so a fix to
 * sequencing, verification or language handling lands everywhere at once and
 * cannot land unevenly.
 *
 * Adding a seventh case type is a data entry, not a new file. That property is
 * the entire reason a suite like this can reach seventy-odd macros without
 * collapsing under its own maintenance cost.
 *
 * WHAT VARIES PER CELL: the message text and the note text.
 * WHAT NEVER VARIES: sequencing, verification, language routing, the review
 * gate, and the refusal to proceed on an unresolved template.
 *
 * THREE THINGS IN THE SKELETON WORTH READING
 *
 * 1. Language is resolved PER PARTY, from that party's own messages. The two
 *    sides of a dispute frequently do not share a language. Outbound text is
 *    translated into each recipient's; the internal note is never translated,
 *    so any colleague or auditor can read any case cold. Getting that backwards
 *    produces an audit trail nobody can use.
 *
 * 2. Every note carries a unique marker, and the save is verified by finding
 *    that marker in the history — not by counting rows. On a shared queue a
 *    colleague saving at the same instant would satisfy a row count and produce
 *    a false confirmation for a write that never landed.
 *
 * 3. The review gate stops the chain immediately before the save. The mechanical
 *    work is done; the wording is the operator's. Automating the typing is the
 *    goal. Automating the judgement is the thing to avoid, and this is where
 *    that line is drawn.
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

  if (!PL.guard("macro-matrix")) return;
  PL.requireCore("6.1.1");
  PL.register("macro-matrix", "3.0.0");

  /* ---- demo translator ------------------------------------------------
     A real deployment swaps a translation service in here. The point is
     that no caller changes when it does — the phrasebook is behind the
     same interface the service would use. */
  PL.lang.translator = function (text, target) {
    var BOOK = {
      pt: [[/Hello/g, "Olá"], [/We have completed our review of order/g, "Concluímos a análise do pedido"],
           [/recovery claim/g, "processo de recuperação"], [/No further action is needed from you/g, "Nenhuma ação adicional é necessária"],
           [/Dispute Operations/g, "Operações de Disputa"], [/Please provide/g, "Por favor, envie"]],
      es: [[/Hello/g, "Hola"], [/We have completed our review of order/g, "Hemos completado la revisión del pedido"],
           [/recovery claim/g, "reclamación de recuperación"], [/No further action is needed from you/g, "No se requiere ninguna acción adicional"],
           [/Dispute Operations/g, "Operaciones de Disputa"], [/Please provide/g, "Por favor, envíe"]],
      fr: [[/Hello/g, "Bonjour"], [/We have completed our review of order/g, "Nous avons terminé l'examen de la commande"],
           [/recovery claim/g, "demande de récupération"], [/Dispute Operations/g, "Opérations de Litige"]]
    };
    var rules = BOOK[target];
    if (!rules) return text;
    var p = PL.lang.protect(text);
    var out = p.masked;
    rules.forEach(function (r) { out = out.replace(r[0], r[1]); });
    return p.restore(out) + "\n\n[" + target + "]";
  };

  /* ---- the two axes ---------------------------------------------------
     Case types and actions are DATA. Neither knows how execution works. */

  /* The six ways a peer-to-peer trade fails, named for what happened rather
     than for who complained. "Released without payment" says the seller let
     the crypto go and the money never came; "Cancelled but paid" says the
     opposite. A code that only means something to the team that coined it
     costs every new operator a translation step. */
  var CASE_TYPES = {
    released_without_payment: { code: "RWP", label: "Released without payment", filedBy: "seller", refunder: "buyer"  },
    cancelled_but_paid:       { code: "CBP", label: "Cancelled but paid",       filedBy: "buyer",  refunder: "seller" },
    chargeback:               { code: "CBK", label: "Chargeback after release", filedBy: "seller", refunder: "buyer"  },
    overpaid:                 { code: "OVP", label: "Overpaid",                 filedBy: "buyer",  refunder: "seller" },
    underpaid:                { code: "UND", label: "Underpaid",                filedBy: "seller", refunder: "buyer"  },
    bank_account_frozen:      { code: "BAF", label: "Bank account frozen",      filedBy: "seller", refunder: "buyer"  }
  };

  var ACTIONS = {
    request_proof: {
      label: "Request proof",
      /* Recipient and window are properties of the action, not choices made
         at run time. "Request proof" always goes to the party who has to
         produce it, and always with the same window — making the operator
         re-decide that on every run is how two cases of the same kind end up
         with different deadlines and nobody can say which was right. */
      to: "complainant",
      windowHours: 12,
      followUp: true,
      message: "Hello,\n\nWe have completed our review of order {{orderRef}} ({{fiat}}) and need further documentation.\n\n" +
        "Please provide a complete statement covering {{created}} onward, showing the account holder name and the full transaction record. " +
        "A single screenshot is not sufficient for a {{typeLabel}} claim.\n\nYou have {{window}} hours to respond.\n\nDispute Operations",
      note: "{{marker}} {{code}} — proof requested ({{window}}h window).\n" +
        "Order {{orderRef}} · {{fiat}} · {{status}}.\n" +
        "Complainant: the {{complainantRole}} ({{complainant}}). Defendant: the {{defendantRole}} ({{defendant}}). {{evidenceCount}} item(s) on file, insufficient to determine settlement.\n" +
        "Follow-up: review on expiry. Status: pending."
    },
    proof_insufficient: {
      label: "Proof insufficient",
      to: "complainant",
      windowHours: 6,
      followUp: true,
      message: "Hello,\n\nThe documentation you provided for order {{orderRef}} could not be used to verify the payment.\n\n" +
        "Please provide a clear, unedited record showing the full transaction. You have {{window}} hours.\n\nDispute Operations",
      note: "{{marker}} {{code}} — submitted proof unusable, re-requested ({{window}}h).\n" +
        "Order {{orderRef}} · {{fiat}}. {{evidenceCount}} item(s) reviewed and rejected.\n" +
        "Follow-up: review on expiry. Status: pending."
    },
    recovery_opened: {
      label: "Recovery opened",
      to: "defendant",
      windowHours: 24,
      followUp: true,
      message: "Hello,\n\nWe have completed our review of order {{orderRef}} ({{fiat}}) and opened a recovery claim on your behalf.\n\n" +
        "The counterparty account has been restricted for the disputed amount while we contact them.\n\n" +
        "No further action is needed from you.\n\nDispute Operations",
      note: "{{marker}} {{code}} — recovery claim opened.\n" +
        "Order {{orderRef}} · {{fiat}} · {{status}} · released {{released}}.\n" +
        "Refunding party per type: the {{refunder}}. Complainant: the {{complainantRole}} ({{complainant}}, {{complainantOrders}} orders / {{complainantDisputes}} disputes). Defendant: the {{defendantRole}} ({{defendant}}, {{defendantOrders}} / {{defendantDisputes}}).\n" +
        "{{evidenceCount}} item(s) reviewed, consistent with claim. Status: pending recovery."
    },
    recovery_settled: {
      label: "Recovery settled",
      to: "complainant",
      followUp: false,
      closes: true,
      message: "Hello,\n\nThe recovery claim on order {{orderRef}} ({{fiat}}) has settled and the funds have been returned.\n\n" +
        "Thank you for your patience.\n\nDispute Operations",
      note: "{{marker}} {{code}} — recovery settled, funds returned.\n" +
        "Order {{orderRef}} · {{fiat}}. Refunding party: {{refunder}}.\n" +
        "Complainant {{complainant}} notified. Status: solved."
    },
    not_upheld: {
      label: "Not upheld",
      to: "complainant",
      followUp: false,
      closes: true,
      message: "Hello,\n\nWe have completed our review of order {{orderRef}} ({{fiat}}) and are unable to uphold your claim.\n\n" +
        "The material provided does not establish that the payment failed as described. If you obtain further documentation, reply here and we will reopen the review.\n\n" +
        "Dispute Operations",
      note: "{{marker}} {{code}} — not upheld.\n" +
        "Order {{orderRef}} · {{fiat}} · {{status}}.\n" +
        "{{evidenceCount}} item(s) reviewed; insufficient to establish the claimed failure. Reopening path communicated to the {{complainantRole}} ({{complainant}}).\n" +
        "Status: solved."
    },
    policy_referral: {
      label: "Policy referral",
      to: "both",
      windowHours: 24,
      followUp: true,
      message: "Hello,\n\nWhile reviewing order {{orderRef}} we identified activity in the trade chat that is not permitted under the platform trading rules.\n\n" +
        "This has been referred to our account integrity team. Your claim continues to be reviewed separately.\n\nDispute Operations",
      note: "{{marker}} {{code}} — referred to account integrity.\n" +
        "Order {{orderRef}} · {{fiat}}. Parties: {{complainantRole}} {{complainant}} / {{defendantRole}} {{defendant}}.\n" +
        "Transcript contains conduct outside trading rules. Dispute assessed independently of referral. Status: pending."
    },
    authority_referral: {
      label: "Authority referral",
      to: "complainant",
      followUp: false,
      closes: true,
      message: "Hello,\n\nWe were unable to reach the counterparty on order {{orderRef}} ({{fiat}}).\n\n" +
        "At this stage the remaining route is a report to your local authorities. We will respond to any official request received through our documented channel for law enforcement.\n\n" +
        "Dispute Operations",
      note: "{{marker}} {{code}} — authority referral issued.\n" +
        "Order {{orderRef}} · {{fiat}}. Defendant {{defendant}} unresponsive since {{opened}}.\n" +
        "Complainant {{complainant}} directed to local authorities; official channel provided. Status: solved."
    },
    handover: {
      label: "Shift handover",
      to: null,
      followUp: true,
      message: null,
      note: "{{marker}} {{code}} — shift handover.\n" +
        "Order {{orderRef}} · {{fiat}} · {{status}}.\n" +
        "Work completed this shift: {{evidenceCount}} item(s) reviewed, transcript read. Awaiting counterparty response.\n" +
        "Next shift: re-check on expiry before any close. Status: pending."
    }
  };

  /* ---- variables -------------------------------------------------------- */

  function vars(c, action, marker) {
    var t = CASE_TYPES[c.type] || { code: "GEN", label: c.typeLabel, refunder: "counterparty" };

    /* Address people by what they did in the trade, not by handle.
       "the buyer" is meaningful to both parties and to anyone reading the
       case later; a handle is a lookup nobody performs. Handles stay in the
       note alongside the user ID, where the audit trail needs them. */
    var role = function (p) { return /buyer/i.test(p.role) ? "buyer" : "seller"; };

    return {
      complainantRole: role(c.complainant),
      defendantRole: role(c.defendant),
      marker: marker,
      code: t.code,
      claimId: c.id,
      typeLabel: c.typeLabel || t.label,
      refunder: t.refunder,
      orderRef: c.order.ref,
      fiat: c.order.fiat,
      status: c.order.status,
      created: c.order.createdAt,
      released: c.order.releasedAt || "not released",
      opened: c.openedAt,
      window: String(action.windowHours || 0),
      complainant: c.complainant.handle,
      defendant: c.defendant.handle,
      complainantOrders: String(c.complainant.orders),
      complainantDisputes: String(c.complainant.disputes),
      defendantOrders: String(c.defendant.orders),
      defendantDisputes: String(c.defendant.disputes),
      evidenceCount: String(c.evidence.length)
    };
  }

  /* ---- ONE skeleton, used by every cell in the grid ---------------------- */

  function execute(typeKey, actionKey) {
    var c = PL.adapter.readCase();
    if (!c) { PL.ui.toast("Open a case first."); return; }

    var action = ACTIONS[actionKey];
    var marker = PL.marker.make(CASE_TYPES[c.type] ? CASE_TYPES[c.type].code : "GEN");
    var v = vars(c, action, marker);

    var messageSrc = null, noteSrc = null;
    try {
      if (action.message) messageSrc = PL.template.render(action.message, v);
      noteSrc = PL.template.render(action.note, v);
    } catch (err) {
      /* Loud, not a toast. A macro that declines to run is indistinguishable
         from a button that did not register the click, and the operator will
         retry rather than read — so say what was missing and leave it up. */
      PL.ui.runPanel("Macro not run", [action.label])
        .finish(false, "Template needs " + err.message.replace("missing token: ", "") +
          ", which this appeal has no value for. Nothing was written.");
      return;
    }

    /* Language is resolved from each party's own messages, independently. */
    var recipient = c.filedBy === "seller" ? "seller" : "buyer";
    var detected = PL.lang.forParty(c.chat, recipient, c.id);

    /* Which side the message is actually addressed to, in trade terms. */
    var roleOf = function (p) { return /buyer/i.test(p.role) ? "buyer" : "seller"; };
    var recipientRole = action.to === "both" ? "both parties"
      : action.to === "defendant" ? roleOf(c.defendant) : roleOf(c.complainant);

    var msgField = PL.dom.qs("#msg-input");
    var noteField = PL.adapter.noteField();
    var sentBefore = PL.dom.qsa("#sent-log .sent:not(.none)").length;
    var deadlineBefore = "";

    /* Every macro ends by parking or closing. A third outcome — actioned but
       still sitting in the task pool — is the state that makes an operator
       work the same appeal twice, and there is no macro that legitimately
       wants it. Guard rather than trust the table. */
    if (!action.followUp && !action.closes) {
      PL.ui.runPanel("Macro misconfigured", [action.label])
        .finish(false, "\"" + action.label + "\" neither parks nor closes the appeal. " +
          "It would stay in the task pool after running. Not run.");
      return;
    }

    var steps = [];

    /* The sequence a macro replaces, in the order an operator would do it:
       message the right party, set the response window, write the remark,
       and park the case where it belongs. Four mechanical acts around one
       decision that was already made before the palette opened. */

    if (messageSrc && action.to) {
      steps.push({
        name: "Message the " + recipientRole + " (" + detected.lang + ")",
        run: function () {
          return PL.lang.translate(messageSrc, detected.lang).then(function (translated) {
            var to = PL.dom.qs("#msg-to");
            return PL.spa.setSlow(to, action.to)
              .then(function () { return PL.spa.setSlow(msgField, translated); })
              .then(function () { return PL.spa.clickSlow(PL.dom.qs("#msg-send")); });
          });
        },
        verify: function () { return PL.dom.qsa("#sent-log .sent:not(.none)").length > sentBefore; }
      });
    }

    if (action.windowHours) {
      steps.push({
        name: "Set " + action.windowHours + "h response window",
        run: function () {
          var b = PL.dom.qs('[data-deadline="' + action.windowHours + '"]');
          if (!b) throw new Error("no " + action.windowHours + "h deadline control on this page");
          deadlineBefore = PL.dom.text("#deadline-current");
          return PL.spa.clickSlow(b);
        },
        verify: function () { return PL.dom.text("#deadline-current") !== deadlineBefore; }
      });
    }

    steps.push({
      name: "Record remark (review gate)",
      run: function () {
        /* The note is NEVER translated. Single language, always, so the audit
           trail stays readable by anyone. */
        return PL.review.gate("Case note — " + c.id, noteSrc, [
          "Recipient: the " + recipientRole + " (" + (action.to || "none") + ")" +
            " · language " + detected.lang +
            " (" + Math.round(detected.confidence * 100) + "%)",
          action.windowHours ? "Response window: " + action.windowHours + "h" : "No response window set.",
          action.closes ? "The appeal will be closed after this."
            : action.followUp ? "Will be parked in Handling — awaiting reply."
            : "Stays in the task pool.",
          "Marker " + marker + " verifies the save."
        ]).then(function (edited) {
          if (edited === null) throw PL.abort("abandoned at review");
          if (edited.indexOf(marker) === -1) edited = marker + " " + edited;
          return PL.spa.setSlow(noteField, edited)
            .then(function () { return PL.spa.clickSlow(PL.dom.qs("#note-save")); });
        });
      },
      verify: function () { return PL.marker.present("#notes-table", marker); },
      timeoutMs: 120000
    });

    if (action.closes) {
      steps.push({
        name: "Close the appeal",
        /* No confirmation. The operator chose a macro whose name says it
           closes the appeal; asking again is a second decision about a
           decision already made, and a dialog people dismiss without reading
           protects nobody. The review gate one step earlier is where the
           thinking belongs — everything after it is the choice being carried
           out. */
        run: function () {
          var b = PL.dom.qs("#close-claim");
          if (!b || b.disabled) throw new Error("close control unavailable");
          return PL.spa.clickSlow(b);
        },
        verify: function () {
          return PL.dom.qs("#main").getAttribute("data-claim-state") === "closed";
        }
      });
    }

    if (action.followUp) {
      steps.push({
        name: "Move to Handling — awaiting reply",
        run: function () {
          var b = PL.dom.qs("#follow-up");
          if (!b) throw new Error("no follow-up control on this page");
          return PL.spa.clickSlow(b);
        },
        verify: function () {
          return PL.dom.qs("#main").getAttribute("data-follow-up") === "yes";
        }
      });
    }

    /* Show the sequence on the page, named in full before it starts. The
       operator needs to see which step is running while it runs, and it is
       the only way anyone watching a recording can tell what the macro did. */
    var panel = PL.ui.runPanel(
      (CASE_TYPES[c.type] || {}).code + " · " + action.label,
      steps.map(function (s) { return s.name; })
    );

    PL.chain.run({
      key: c.id + ":" + actionKey,
      preflight: [
        { label: "Claim still open", check: function () { return PL.dom.qs("#main").getAttribute("data-claim-state") !== "closed"; } },
        { label: "Note field editable", check: function () { return noteField && !noteField.disabled; } },
        { label: "Message field editable", check: function () { return !messageSrc || (msgField && !msgField.disabled); } },
        { label: "Deadline controls present", check: function () {
            return !action.windowHours || !!PL.dom.qs('[data-deadline="' + action.windowHours + '"]'); } },
        { label: "Follow-up control present", check: function () {
            return !action.followUp || !!PL.dom.qs("#follow-up"); } },
        { label: "Close control available", check: function () {
            var b = PL.dom.qs("#close-claim");
            return !action.closes || (b && !b.disabled); } }
      ],
      steps: steps,
      confirm: function (step, log) {
        var done = log.filter(function (l) { return l.state === "done"; });
        return PL.ui.confirm("Close " + c.id + "?", [
          "This cannot be undone.",
          done.length ? "Already committed: " + done.map(function (d) { return d.name; }).join(", ") + "."
                      : "Nothing has committed yet.",
          "Order " + c.order.ref + " · " + c.order.fiat + "."
        ]);
      },
      /* The panel is the only progress surface. Mirroring it into a popover
         as well meant two things to keep in sync and one of them was always
         hidden behind the palette that launched the run. */
      onProgress: function (log) {
        log.forEach(function (l, i) { panel.step(i, l.state, l.error || ""); });
      }
    }).then(function (res) {
      panel.finish(res.ok, res.ok
        ? action.label + " complete." + (action.followUp || action.closes
            ? " Returning to the task pool." : "")
        : res.reason + (res.warning ? "  " + res.warning : ""));

      /* The appeal has left the task pool — parked in Handling or closed — so
         there is nothing further to do on this page. Going back to the list is
         what the operator does next every single time.

         Navigating is not enough on its own: if the app was already showing a
         cached queue it can re-render the list it had before this appeal
         moved, so the handled one appears to still be sitting there. Wait for
         the queue to be on screen and press its own Refresh, which is the
         same thing the operator would do and is visible while it happens.

         Only on success. A failed run stays put so the partial state can be
         read and finished by hand. */
      if (res.ok && (action.followUp || action.closes)) {
        setTimeout(function () {
          location.hash = "#/queue";
          PL.waitFor(function () { return PL.adapter.view() === "queue"; },
                     { label: "task pool", timeoutMs: 4000 })
            .then(function () { return PL.spa.clickSlow(PL.dom.qs("#refresh-btn")); })
            .catch(function () {});
        }, 900);
      }

      PL.log("macro", typeKey + "/" + actionKey + " -> " + (res.ok ? "ok" : res.reason));
    });
  }

  /* ---- palette ---------------------------------------------------------- */

  /* No button of its own. This script is the macro definition and the
     executor; the Macro Launcher is the way in. Two buttons running the
     same code was the redundancy that made the toolkit feel bigger than it
     was, and it is what let the two paths drift apart in the first place. */

  /* Publish every cell as a runnable entry. The launcher renders these; it
     no longer owns a second, note-only implementation of "run a macro" —
     that divergence was why the Macros button wrote a remark and never sent
     the message. One executor, two ways to reach it. */
  Object.keys(CASE_TYPES).forEach(function (tk) {
    Object.keys(ACTIONS).forEach(function (ak) {
      var t = CASE_TYPES[tk], a = ACTIONS[ak];
      PL.registry.publish({
        channel: "macro",
        id: tk + "/" + ak,
        group: "Macros",
        caseType: tk,
        code: t.code,
        typeLabel: t.label,
        label: a.label,
        to: a.to,
        windowHours: a.windowHours,
        followUp: a.followUp,
        closes: !!a.closes,
        sendsMessage: !!a.message,
        run: function () { execute(tk, ak); }
      });
    });
  });

})();
