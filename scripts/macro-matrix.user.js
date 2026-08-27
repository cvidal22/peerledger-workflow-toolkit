// ==UserScript==
// @name         PeerLedger — Macro Matrix
// @namespace    https://github.com/cvidal22
// @version      3.1.0
// @description  Generates the full case-type × action macro grid from one skeleton. Per-party language resolution on outbound messages, single-language internal notes, review gate before every save, marker-verified writes.
// @author       cvidal22
// @match        https://cvidal22.github.io/peerledger-workflow-toolkit/*
// @require      https://cdn.jsdelivr.net/gh/cvidal22/peerledger-workflow-toolkit@main/core/pl-core.js?v=3.1.0
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

  if (!PL.guard("macro-matrix")) return;
  PL.requireCore("3.0.0");
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

  var CASE_TYPES = {
    payment_not_received:        { code: "PNR", label: "Payment not received",  refunder: "buyer"  },
    order_cancelled_after_payment:{ code: "CAP", label: "Cancelled after payment", refunder: "seller" },
    chargeback_after_release:    { code: "CBK", label: "Chargeback after release", refunder: "buyer" },
    overpayment:                 { code: "OVP", label: "Overpayment",           refunder: "seller" },
    underpayment:                { code: "UND", label: "Underpayment",          refunder: "buyer"  },
    account_frozen:              { code: "FRZ", label: "Account frozen",        refunder: "buyer"  }
  };

  var ACTIONS = {
    request_proof: {
      label: "Request proof",
      windowHours: 12,
      message: "Hello,\n\nWe have completed our review of order {{orderRef}} ({{fiat}}) and need further documentation.\n\n" +
        "Please provide a complete statement covering {{created}} onward, showing the account holder name and the full transaction record. " +
        "A single screenshot is not sufficient for a {{typeLabel}} claim.\n\nYou have {{window}} hours to respond.\n\nPeerLedger Dispute Operations",
      note: "{{marker}} {{code}} — proof requested ({{window}}h window).\n" +
        "Order {{orderRef}} · {{fiat}} · {{status}}.\n" +
        "Complainant {{complainant}} / defendant {{defendant}}. {{evidenceCount}} item(s) on file, insufficient to determine settlement.\n" +
        "Follow-up: review on expiry. Status: pending."
    },
    proof_insufficient: {
      label: "Proof insufficient",
      windowHours: 6,
      message: "Hello,\n\nThe documentation you provided for order {{orderRef}} could not be used to verify the payment.\n\n" +
        "Please provide a clear, unedited record showing the full transaction. You have {{window}} hours.\n\nPeerLedger Dispute Operations",
      note: "{{marker}} {{code}} — submitted proof unusable, re-requested ({{window}}h).\n" +
        "Order {{orderRef}} · {{fiat}}. {{evidenceCount}} item(s) reviewed and rejected.\n" +
        "Follow-up: review on expiry. Status: pending."
    },
    recovery_opened: {
      label: "Recovery opened",
      message: "Hello,\n\nWe have completed our review of order {{orderRef}} ({{fiat}}) and opened a recovery claim on your behalf.\n\n" +
        "The counterparty account has been restricted for the disputed amount while we contact them.\n\n" +
        "No further action is needed from you.\n\nPeerLedger Dispute Operations",
      note: "{{marker}} {{code}} — recovery claim opened.\n" +
        "Order {{orderRef}} · {{fiat}} · {{status}} · released {{released}}.\n" +
        "Refunding party per type: {{refunder}}. Complainant {{complainant}} ({{complainantOrders}} orders / {{complainantDisputes}} disputes) vs defendant {{defendant}} ({{defendantOrders}} / {{defendantDisputes}}).\n" +
        "{{evidenceCount}} item(s) reviewed, consistent with claim. Status: pending recovery."
    },
    recovery_settled: {
      label: "Recovery settled",
      message: "Hello,\n\nThe recovery claim on order {{orderRef}} ({{fiat}}) has settled and the funds have been returned.\n\n" +
        "Thank you for your patience.\n\nPeerLedger Dispute Operations",
      note: "{{marker}} {{code}} — recovery settled, funds returned.\n" +
        "Order {{orderRef}} · {{fiat}}. Refunding party: {{refunder}}.\n" +
        "Complainant {{complainant}} notified. Status: solved."
    },
    not_upheld: {
      label: "Not upheld",
      message: "Hello,\n\nWe have completed our review of order {{orderRef}} ({{fiat}}) and are unable to uphold your claim.\n\n" +
        "The material provided does not establish that the payment failed as described. If you obtain further documentation, reply here and we will reopen the review.\n\n" +
        "PeerLedger Dispute Operations",
      note: "{{marker}} {{code}} — not upheld.\n" +
        "Order {{orderRef}} · {{fiat}} · {{status}}.\n" +
        "{{evidenceCount}} item(s) reviewed; insufficient to establish the claimed failure. Reopening path communicated to {{complainant}}.\n" +
        "Status: solved."
    },
    policy_referral: {
      label: "Policy referral",
      message: "Hello,\n\nWhile reviewing order {{orderRef}} we identified activity in the trade chat that is not permitted under the platform trading rules.\n\n" +
        "This has been referred to our account integrity team. Your claim continues to be reviewed separately.\n\nPeerLedger Dispute Operations",
      note: "{{marker}} {{code}} — referred to account integrity.\n" +
        "Order {{orderRef}} · {{fiat}}. Parties {{complainant}} / {{defendant}}.\n" +
        "Transcript contains conduct outside trading rules. Dispute assessed independently of referral. Status: pending."
    },
    authority_referral: {
      label: "Authority referral",
      message: "Hello,\n\nWe were unable to reach the counterparty on order {{orderRef}} ({{fiat}}).\n\n" +
        "At this stage the remaining route is a report to your local authorities. We will respond to any official request received through our documented channel for law enforcement.\n\n" +
        "PeerLedger Dispute Operations",
      note: "{{marker}} {{code}} — authority referral issued.\n" +
        "Order {{orderRef}} · {{fiat}}. Defendant {{defendant}} unresponsive since {{opened}}.\n" +
        "Complainant {{complainant}} directed to local authorities; official channel provided. Status: solved."
    },
    handover: {
      label: "Shift handover",
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
    return {
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
      PL.ui.toast("Not run — template " + err.message + ". Nothing was written.");
      return;
    }

    /* Language is resolved from each party's own messages, independently. */
    var recipient = c.filedBy === "seller" ? "seller" : "buyer";
    var detected = PL.lang.forParty(c.chat, recipient, c.id);

    var msgField = PL.dom.qs("#msg-input");
    var noteField = PL.adapter.noteField();
    var sentBefore = PL.dom.qsa("#sent-log .sent:not(.none)").length;

    var steps = [];

    if (messageSrc) {
      steps.push({
        name: "Send message (" + detected.lang + ")",
        run: function () {
          /* Outbound is translated into the recipient's language. */
          return PL.lang.translate(messageSrc, detected.lang).then(function (translated) {
            PL.spa.set(msgField, translated);
            PL.spa.click(PL.dom.qs("#msg-send"));
          });
        },
        verify: function () { return PL.dom.qsa("#sent-log .sent:not(.none)").length > sentBefore; }
      });
    }

    steps.push({
      name: "Record note (review gate)",
      run: function () {
        /* The note is NEVER translated. Single language, always, so the
           audit trail stays readable by anyone. */
        return PL.review.gate("Case note — " + c.id, noteSrc, [
          "Recipient language detected: " + detected.lang +
            " (" + Math.round(detected.confidence * 100) + "% — " + detected.reason + ")",
          "This note is not translated. Notes stay in one language for auditors.",
          "Marker " + marker + " will be used to verify the save."
        ]).then(function (edited) {
          if (edited === null) throw new Error("abandoned at review");
          if (edited.indexOf(marker) === -1) edited = marker + " " + edited;
          PL.spa.set(noteField, edited);
          PL.spa.click(PL.dom.qs("#note-save"));
        });
      },
      /* Verified by the unique marker, not by row count — a colleague
         saving concurrently cannot satisfy this. */
      verify: function () { return PL.marker.present("#notes-table", marker); },
      timeoutMs: 120000
    });

    PL.chain.run({
      key: c.id + ":" + actionKey,
      preflight: [
        { label: "Claim still open", check: function () { return PL.dom.qs("#main").getAttribute("data-claim-state") !== "closed"; } },
        { label: "Note field editable", check: function () { return noteField && !noteField.disabled; } },
        { label: "Message field editable", check: function () { return !messageSrc || (msgField && !msgField.disabled); } }
      ],
      steps: steps,
      onProgress: function (log, msg) { renderRun(log, msg, null, c, detected); }
    }).then(function (res) {
      renderRun(res.log, null, res, c, detected);
      PL.ui.toast(res.ok ? "Done: " + CASE_TYPES[c.type].code + " / " + action.label : res.reason);
      PL.log("matrix", typeKey + "/" + actionKey + " -> " + (res.ok ? "ok" : res.reason));
    });
  }

  /* ---- palette ---------------------------------------------------------- */

  function openPalette() {
    var c = PL.adapter.readCase();
    if (!c) { PL.ui.toast("Open a case first."); return; }

    var items = [];
    Object.keys(CASE_TYPES).forEach(function (tk) {
      Object.keys(ACTIONS).forEach(function (ak) {
        var t = CASE_TYPES[tk], a = ACTIONS[ak];
        var applies = tk === c.type;
        items.push({
          name: t.code + " · " + a.label,
          tags: [t.code.toLowerCase(), ak.replace(/_/g, ""), applies ? "thiscase" : ""],
          preview: (applies ? "▸ matches this case — " : "") + t.label +
            (a.message ? " · sends message + note" : " · note only"),
          run: function () {
            if (!applies) {
              PL.ui.confirm("Type mismatch", [
                "This case is " + (CASE_TYPES[c.type] || {}).label + ", not " + t.label + ".",
                "The wording will not match the case. Run anyway?"
              ]).then(function (yes) { if (yes) execute(tk, ak); });
              return;
            }
            execute(tk, ak);
          }
        });
      });
    });

    // Cells matching the open case sort first.
    items.sort(function (a, b) {
      var am = a.tags.indexOf("thiscase") !== -1, bm = b.tags.indexOf("thiscase") !== -1;
      return am === bm ? 0 : am ? -1 : 1;
    });

    PL.overlay({
      items: items,
      placeholder: c.id + " · " + items.length + " macros — type to filter",
      footer: Object.keys(CASE_TYPES).length + "×" + Object.keys(ACTIONS).length + " grid"
    });
  }

  /* ---- panel ------------------------------------------------------------ */

  function icon(s) { return { pending: "·", running: "▸", done: "✓", failed: "✕", declined: "–" }[s] || "·"; }

  var lastRun = { log: null, progress: null, result: null, detected: null };

  function renderRun(log, progress, result, c, detected) {
    lastRun = { log: log, progress: progress, result: result, detected: detected };
    var body = PL.ui.liveBody("matrix");
    if (!body) { PL.ui.refresh(); return; }
    draw(body, log, progress, result, c, detected);
  }

  function draw(body, log, progress, result, c, detected) {
    PL.ui.clear(body);
    if (body.setHeaderRight) body.setHeaderRight(c ? c.id : "");

    body.appendChild(PL.dom.el("button", { class: "pl-btn", text: "Open matrix (Alt+M)", onclick: openPalette }));

    var nTypes = Object.keys(CASE_TYPES).length, nActions = Object.keys(ACTIONS).length;
    body.appendChild(PL.dom.el("div", {
      class: "pl-matrix",
      text: nTypes + " types × " + nActions + " actions = " + (nTypes * nActions) + " macros, one skeleton"
    }));

    if (detected) {
      var badge = PL.dom.el("div", { class: "pl-hint" }, [
        PL.dom.el("span", { text: "Recipient language: " }),
        PL.dom.el("span", {
          class: "pl-lang" + (detected.confidence < PL.lang.THRESHOLD ? " low" : ""),
          text: detected.lang + " " + Math.round(detected.confidence * 100) + "%"
        })
      ]);
      body.appendChild(badge);
      body.appendChild(PL.dom.el("div", { class: "pl-hint", text: "Notes are never translated." }));
    }

    if (log && log.length) {
      body.appendChild(PL.ui.sub("Steps"));
      log.forEach(function (l) {
        body.appendChild(PL.dom.el("div", { class: "pl-step " + l.state }, [
          PL.dom.el("span", { class: "ic", text: icon(l.state) }),
          PL.dom.el("span", { text: l.name + (l.error ? " — " + l.error : "") })
        ]));
      });
    }
    if (progress) body.appendChild(PL.dom.el("div", { class: "pl-hint", text: progress }));
    if (result) {
      if (result.ok) body.appendChild(PL.dom.el("div", { class: "pl-okbox", text: "Marker verified in saved history." }));
      else {
        body.appendChild(PL.dom.el("div", { class: "pl-pre", text: result.reason }));
        (result.detail || []).forEach(function (d) {
          body.appendChild(PL.dom.el("div", { class: "pl-hint", text: "· " + d }));
        });
        if (result.warning) body.appendChild(PL.dom.el("div", { class: "pl-warn", text: result.warning }));
      }
    }

    body.appendChild(PL.dom.el("div", {
      class: "pl-hint",
      text: "Review gate is " + (PL.review.enabled ? "ON" : "OFF") + " — every save pauses for edit."
    }));
    body.appendChild(PL.dom.el("button", {
      class: "pl-btn",
      text: PL.review.enabled ? "Disable review gate" : "Enable review gate",
      onclick: function () { PL.review.enabled = !PL.review.enabled; renderRun(log, progress, result, c, detected); }
    }));
  }

  PL.ui.button({
    id: "matrix",
    label: "Matrix",
    title: "Macro matrix",
    pages: ["case"],
    badge: function () {
      return String(Object.keys(CASE_TYPES).length * Object.keys(ACTIONS).length);
    },
    render: function (body) {
      draw(body, lastRun.log, lastRun.progress, lastRun.result, PL.adapter.readCase(), lastRun.detected);
    }
  });

  PL.hotkeys.bind("alt+m", openPalette);
  PL.watch(PL.adapter.caseKey, function () {
    lastRun = { log: null, progress: null, result: null, detected: null };
    PL.ui.refresh();
    var live = PL.ui.liveBody("matrix");
    if (live) draw(live, null, null, null, PL.adapter.readCase(), null);
  });
})();
