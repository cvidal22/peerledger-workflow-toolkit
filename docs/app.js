/*
 * PeerLedger Dispute Console — demo application.
 *
 * Actions here are deliberately asynchronous and briefly disable their own
 * controls while in flight, the way a real internal tool behaves. Closing a
 * claim is refused until a note exists. None of this is convenience for the
 * scripts — it is the friction they have to survive.
 */
(function () {
  "use strict";

  var CLAIMS = window.PEERLEDGER_CLAIMS || [];
  var SC = window.PL_SCENARIO || { on: function () { return false; }, delay: function () { return 0; }, active: [] };
  var swallowed = {};
  var STATE = window.PEERLEDGER_STATE || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function age(m) { return m < 60 ? m + "m" : Math.floor(m / 60) + "h " + (m % 60) + "m"; }
  function kv(k, v) { return '<div><div class="k">' + k + '</div><div class="v">' + v + "</div></div>"; }
  function stamp() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }
  function toast(t) {
    var el = document.createElement("div");
    el.className = "toast"; el.textContent = t;
    $("#toasts").appendChild(el);
    setTimeout(function () { el.remove(); }, 3000);
  }
  function busy(btn, label, ms) {
    var old = btn.textContent;
    btn.disabled = true; btn.textContent = label;
    return new Promise(function (res) {
      setTimeout(function () { btn.disabled = false; btn.textContent = old; res(); }, ms);
    });
  }
  function fmt(iso) {
    var d = new Date(iso), z = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + " " + z(d.getHours()) + ":" + z(d.getMinutes());
  }

  function remaining(iso) {
    var ms = new Date(iso) - new Date("2026-08-26T17:00:00");
    var mins = Math.round(ms / 60000);
    if (mins <= 0) return { text: "expired " + Math.abs(mins) + "m ago", cls: "expired", mins: mins };
    var t = mins < 60 ? mins + "m" : Math.floor(mins / 60) + "h " + (mins % 60) + "m";
    return { text: "due in " + t, cls: mins < 120 ? "soon" : "", mins: mins };
  }

  function logEvent(c, text) {
    c.events.push({ at: stamp(), by: STATE.agent, text: text });
    renderTimeline(c);
  }

  function current() {
    var id = $("#main").getAttribute("data-claim-id");
    return CLAIMS.filter(function (c) { return c.id === id; })[0] || null;
  }

  /* ---------------- queue ---------------- */

  var typeFilter = "";

  function populateFilter() {
    var sel = $("#type-filter");
    if (!sel || sel.dataset.ready) return;
    var seen = {};
    CLAIMS.forEach(function (c) { seen[c.type] = c.typeLabel; });
    Object.keys(seen).forEach(function (t) {
      var o = document.createElement("option");
      o.value = t; o.textContent = seen[t];
      sel.appendChild(o);
    });
    sel.dataset.ready = "1";
    sel.addEventListener("change", function () { typeFilter = sel.value; route(); });
  }

  function renderQueue(mode) {
    populateFilter();
    var rows = CLAIMS.filter(function (c) {
      if (typeFilter && c.type !== typeFilter) return false;
      if (mode === "closed") return c.closed;
      if (mode === "pool") return !c.assigned && !c.closed;
      if (mode === "escalations") return c.assigned && !c.closed && c.priority === "High";
      return c.assigned && !c.closed;
    });
    var title = mode === "closed" ? "Closed today" : mode === "pool" ? "Unassigned pool"
      : mode === "escalations" ? "Escalations" : "Work queue";
    $("#queue-title").textContent = title;
    $("#queue-crumb").textContent = title;
    $$(".nav-item[data-nav]").forEach(function (n) { n.classList.toggle("on", n.dataset.nav === mode); });

    var body = $("#queue-body");
    if (!rows.length) {
      body.innerHTML = '<tr class="empty-row"><td colspan="9">' +
        (typeFilter ? "No claims of that type in this view."
          : mode === "pool" ? "No unassigned claims."
          : mode === "closed" ? "Nothing closed yet this shift."
          : mode === "escalations" ? "No high-priority claims open."
          : "Nothing assigned to you.") + "</td></tr>";
    } else {
      body.innerHTML = rows.map(function (c) {
        return '<tr data-row-claim="' + c.id + '">' +
          '<td><a class="claimid" href="#/claim/' + c.id + '">' + c.id + "</a></td>" +
          "<td>" + esc(c.typeLabel) + "</td>" +
          '<td class="m">' + c.order.ref + "</td>" +
          '<td class="m">' + c.order.fiat + " " + c.order.fiatAmount + "</td>" +
          "<td>" + c.filedBy + "</td>" +
          '<td><span class="tag ' + c.priority + '">' + c.priority + "</span></td>" +
          '<td class="m">' + age(c.ageMin) + "</td>" +
          '<td class="m">' + c.slaHours + "h</td>" +
          "<td>" + (mode === "pool"
            ? '<button class="btn sm" data-claim-action="' + c.id + '">Claim</button>'
            : '<a class="btn sm" href="#/claim/' + c.id + '">Open</a>') + "</td></tr>";
      }).join("");
    }
    $("#queue-count").textContent = rows.length + " " +
      (mode === "pool" ? "unassigned" : mode === "closed" ? "closed"
        : mode === "escalations" ? "escalated" : "assigned to you") +
      (typeFilter ? " · filtered" : "");
    show("view-queue");
  }

  function show(id) {
    ["view-queue", "view-case", "view-stub"].forEach(function (v) {
      $("#" + v).hidden = v !== id;
    });

    /* Scenario "stale": a keep-alive cache leaves the previous table mounted.
       Two tbody elements now exist. Code selecting one by position gets the
       wrong one; code anchoring on content does not. */
    if (SC.on("stale") && id === "view-queue") {
      var old = document.getElementById("stale-view");
      if (old) old.remove();
      var clone = $("#view-queue").cloneNode(true);
      clone.id = "stale-view";
      clone.hidden = false;
      clone.style.display = "none";
      clone.querySelectorAll("[id]").forEach(function (n) { n.id = "stale-" + n.id; });
      $("#main").appendChild(clone);
    }
  }

  var SECTIONS = {
    users: ["Users", "Account lookup, KYC status and trading history for individual and merchant accounts."],
    orders: ["Orders", "Order search across the P2P book — status, counterparties, payment method and settlement timestamps."],
    recovery: ["Recovery claims", "Open recovery claims, restricted balances and repayment status. Claims are created from the dispute workflow."],
    restrictions: ["Restrictions", "Accounts with active balance restrictions, the claim that created each one, and its release condition."],
    reports: ["Reports", "Queue throughput, SLA attainment and dispute outcome distribution by case type."],
    config: ["Configuration", "SLA windows per case type, evidence requirements, macro catalogue and escalation routing."]
  };

  function renderStub(key) {
    var sec = SECTIONS[key] || ["Not found", "No such section."];
    $("#stub-title").textContent = sec[0];
    $("#stub-crumb").textContent = sec[0];
    $("#stub-body").textContent = sec[1];
    $$(".nav-item[data-nav]").forEach(function (n) { n.classList.toggle("on", n.dataset.nav === key); });
    $$(".topnav a").forEach(function (a) {
      a.classList.toggle("on", a.getAttribute("href") === "#/section/" + key);
    });
    show("view-stub");
  }

  /* ---------------- case ---------------- */

  function renderCase(id) {
    var c = CLAIMS.filter(function (x) { return x.id === id; })[0];
    if (!c) { location.hash = "#/queue"; return; }

    var main = $("#main");
    main.setAttribute("data-claim-id", c.id);
    main.setAttribute("data-claim-type", c.type);
    main.setAttribute("data-claim-state", c.closed ? "closed" : "open");
    main.setAttribute("data-view", "case");

    $("#case-crumb").textContent = c.id;
    $("#case-heading").textContent = c.id + "  ·  " + c.order.pair + "  " + c.order.side;
    $("#case-status").textContent = "order " + c.order.status.toLowerCase();
    $("#case-status").className = "tag " + c.order.status;
    $("#case-priority").textContent = c.priority + " priority";
    $("#claim-state").textContent = c.closed ? "claim closed" : "claim open";
    $("#claim-state").className = "tag " + (c.closed ? "Cancelled" : "ok");

    $("#order-ref-h").textContent = c.order.ref;
    var o = c.order;

    /* Scenario "slow": layout and buttons render immediately, values arrive
       later. This is the canonical reason a ready-check must observe a real
       value rather than the page merely existing. */
    var lag = SC.delay();
    if (lag) {
      $("#order-kv").innerHTML = [
        "Order reference", "Status", "Pair", "Side", "Crypto quantity", "Fiat amount",
        "Unit price", "Payment method", "Created", "Released"
      ].map(function (k) {
        return '<div><div class="k">' + k + '</div><div class="v pending">--</div></div>';
      }).join("");
      setTimeout(function () {
        if ($("#main").getAttribute("data-claim-id") === c.id) fillOrder(o);
      }, lag);
    } else {
      fillOrder(o);
    }

    function fillOrder(o) {
      $("#order-kv").innerHTML = [
        kv("Order reference", o.ref), kv("Status", o.status), kv("Pair", o.pair), kv("Side", o.side),
        kv("Crypto quantity", o.cryptoAmount + " " + o.asset),
        kv("Fiat amount", o.fiat + " " + o.fiatAmount),
        kv("Unit price", o.price + " " + o.fiat + "/" + o.asset),
        kv("Payment method", o.method), kv("Created", o.createdAt), kv("Released", o.releasedAt || "-")
      ].join("");
    }

    var comp = c.filedBy === "seller" ? c.parties.seller : c.parties.buyer;
    var def = c.filedBy === "seller" ? c.parties.buyer : c.parties.seller;
    var roles = c.filedBy === "seller" ? ["Seller", "Buyer"] : ["Buyer", "Seller"];
    function pkv(p, role) {
      return [kv("Role", role), kv("Handle", p.handle), kv("User ID", p.uid), kv("Tier", p.tier),
        kv("Account age", p.tenure), kv("Completed orders", String(p.orders)),
        kv("Prior disputes", String(p.disputes)), kv("KYC country", p.country)].join("");
    }
    $("#complainant-kv").innerHTML = pkv(comp, roles[0]);
    $("#defendant-kv").innerHTML = pkv(def, roles[1]);
    renderParty(comp, "complainant");
    renderParty(def, "defendant");

    $("#chat-count").textContent = c.chat.length + " messages";
    $("#chat-log").innerHTML = c.chat.map(function (m) {
      return '<div class="msg ' + m.from + '" data-from="' + m.from + '">' +
        '<div class="who2">' + m.from + '</div><div class="bub">' + esc(m.text) +
        '</div><div class="at">' + m.at + "</div></div>";
    }).join("");

    $("#claim-kv").innerHTML = [
      kv("Claim type", c.typeLabel), kv("Filed by", c.filedBy),
      kv("Opened", c.openedAt), kv("SLA", c.slaHours + "h")
    ].join("");
    $("#claim-narrative").textContent = c.narrative;

    var accepted = c.evidence.filter(function (e) { return e.status === "accepted"; }).length;
    $("#evidence-count").textContent = c.evidence.length + " items · " + accepted + " accepted";
    $("#evidence-list").innerHTML = c.evidence.map(function (e) {
      return '<li data-evidence="' + e.label + '"><span class="fn">' + e.label + "</span>" +
        '<span class="tg ' + e.tag.replace(/\s/g, "") + '">' + e.tag + "</span>" +
        '<span class="st ' + e.status + '">' + e.status + "</span>" +
        (SC.on("menus") ? '<button class="ev-menu" data-evidence-menu="' + e.label + '">\u22ef</button>' : "") +
        '<span class="meta">' + e.submittedBy + " · " + e.submittedAt + " · " + e.sizeKb + " KB</span></li>";
    }).join("");

    renderNotes(c);
    renderSent(c);
    renderDeadline(c);
    renderRecovery(c);
    renderAudit(c);
    renderTimeline(c);
    $("#claim-stage").textContent = "stage: " + c.stage;
    $("#claim-stage").className = "tag " + (c.stage === "closed" ? "Cancelled" : "alt");
    $("#note-input").value = "";
    $("#msg-input").value = "";
    lockIfClosed(c);

    show("view-case");
  }

  function renderParty(p, which) {
    $("#" + which + "-flags").innerHTML = p.flags.length
      ? '<span class="flags">' + p.flags.join(" · ") + "</span>" : "";
    var h = $("#" + which + "-history");
    h.innerHTML = p.history.length
      ? '<div class="lbl">Prior disputes</div>' + p.history.map(function (x) {
          return '<div class="h-row"><span class="ref">' + x.ref + '</span><span>' + x.when +
            '</span><span class="out">' + x.outcome + "</span></div>";
        }).join("")
      : '<div class="none">No prior disputes on record.</div>';
  }

  function renderDeadline(c) {
    var r = remaining(c.deadline);
    var tag = $("#claim-deadline");
    tag.textContent = r.text;
    tag.className = "deadline " + r.cls;
    $("#deadline-set-by").textContent = "set by " + c.deadlineSetBy;
    $("#deadline-current").innerHTML =
      '<span class="lbl2">Current expiry</span>' + fmt(c.deadline) + "  ·  " + r.text;
    $$("#deadline-actions .btn").forEach(function (b) { b.disabled = !!c.closed; });
  }

  function renderRecovery(c) {
    var box = $("#recovery-state");
    var r = c.recovery;
    $("#recovery-ref").textContent = r ? r.ref : "";
    if (!r) {
      box.className = "";
      box.textContent = "No recovery claim on this case.";
    } else {
      box.className = r.status;
      box.textContent = r.status === "active"
        ? "Active — " + r.amount + " restricted on the counterparty since " + r.openedAt + "."
        : r.status === "settled"
          ? "Settled — " + r.amount + " returned to the complainant on " + r.settledAt + "."
          : "Unrecoverable — counterparty balance insufficient. Closed " + r.settledAt + ".";
    }
    $("#recovery-open").disabled = !!r || !!c.closed;
    $("#recovery-settle").disabled = !r || r.status !== "active" || !!c.closed;
    $("#recovery-fail").disabled = !r || r.status !== "active" || !!c.closed;
  }

  function renderAudit(c) {
    var box = $("#audit-state");
    if (!c.closed) {
      box.className = "";
      box.textContent = "Audit becomes available once the claim is closed.";
    } else if (!c.audit) {
      box.className = "";
      box.textContent = "Closed, awaiting audit.";
    } else {
      box.className = c.audit.status === "passed" ? "passed" : "queried";
      box.textContent = c.audit.status === "passed"
        ? "Audit passed by " + c.audit.by + " on " + c.audit.at + "."
        : "Queried by " + c.audit.by + " on " + c.audit.at + " — reopened for correction.";
    }
    $("#audit-query").disabled = !c.closed || (c.audit && c.audit.status === "passed");
    $("#audit-pass").disabled = !c.closed || (c.audit && c.audit.status === "passed");
  }

  function renderTimeline(c) {
    $("#timeline").innerHTML = c.events.slice().reverse().map(function (e) {
      return '<div class="tl"><span class="when">' + e.at + '</span><span class="who">' +
        e.by + "</span><span>" + esc(e.text) + "</span></div>";
    }).join("");
  }

  function lockIfClosed(c) {
    ["#msg-input", "#msg-send", "#note-input", "#note-save", "#close-claim", "#escalate"].forEach(function (s) {
      $(s).disabled = !!c.closed;
    });
    $$("[data-action]").forEach(function (b) { b.disabled = !!c.closed; });
  }

  function renderNotes(c) {
    var tb = $("#notes-table").querySelector("tbody");
    tb.innerHTML = c.notes.length
      ? c.notes.map(function (n) {
          return "<tr><td class='by'>" + n.by + "<br>" + n.at + "</td><td>" + esc(n.text) + "</td></tr>";
        }).join("")
      : '<tr><td class="none" colspan="2">No notes recorded.</td></tr>';
  }

  function renderSent(c) {
    c.sent = c.sent || [];
    $("#sent-log").innerHTML = c.sent.length
      ? c.sent.map(function (m) {
          return '<div class="sent"><span class="at">' + m.at + "</span>" + esc(m.text.slice(0, 90)) +
            (m.text.length > 90 ? "…" : "") + "</div>";
        }).join("")
      : '<div class="sent none">No messages sent.</div>';
  }

  /* ---------------- actions ---------------- */

  document.addEventListener("click", function (e) {
    var claimBtn = e.target.closest("[data-claim-action]");
    if (claimBtn) {
      var cc = CLAIMS.filter(function (x) { return x.id === claimBtn.dataset.claimAction; })[0];
      if (cc) { cc.assigned = true; toast("Claimed " + cc.id); route(); }
      return;
    }

    if (e.target.id === "msg-send") return sendMessage(e.target);
    if (e.target.id === "note-save") return saveNote(e.target);
    if (e.target.id === "close-claim") return closeClaim(e.target);
    if (e.target.id === "refresh-btn") { route(); toast("Queue refreshed."); return; }

    var dl = e.target.closest("[data-deadline]");
    if (dl) return setDeadline(dl, parseInt(dl.dataset.deadline, 10));

    if (e.target.id === "recovery-open") return openRecovery(e.target);
    if (e.target.id === "recovery-settle") return closeRecovery(e.target, "settled");
    if (e.target.id === "recovery-fail") return closeRecovery(e.target, "failed");
    if (e.target.id === "escalate") return escalate(e.target);
    if (e.target.id === "audit-pass") return audit(e.target, "passed");
    if (e.target.id === "audit-query") return audit(e.target, "queried");

    var act = e.target.closest("[data-action]");
    if (act) toast("Demo action: " + act.dataset.action.replace(/_/g, " "));
  });

  function sendMessage(btn) {
    var c = current();
    var txt = $("#msg-input").value.trim();
    if (!c || !txt) { toast("Nothing to send."); return Promise.resolve(); }
    return busy(btn, "Sending…", 650).then(function () {
      c.sent = c.sent || [];
      c.sent.push({ at: stamp(), text: txt });
      renderSent(c);
      $("#msg-input").value = "";
      toast("Message sent to complainant.");
    });
  }

  function saveNote(btn) {
    var c = current();
    var txt = $("#note-input").value.trim();
    if (!c || !txt) { toast("Nothing to save."); return Promise.resolve(); }

    /* Scenario "noop": the first save on a case is silently swallowed. The
       button returns to normal, no error, nothing written. A chain that
       treats the click as proof reports success for a write that never
       happened — which is why every step verifies by observation. */
    if (SC.on("noop") && !swallowed[c.id]) {
      swallowed[c.id] = true;
      return busy(btn, "Saving…", 420).then(function () { /* silence */ });
    }

    return busy(btn, "Saving…", 420).then(function () {
      /* Scenario "concurrent": a colleague saves on the same case at the
         same moment. Row-count verification is satisfied by their write.
         Marker verification is not. */
      if (SC.on("concurrent")) {
        c.notes.push({ by: "r.tavares", at: stamp(), text: "Second review — no action taken this pass." });
      }
      c.notes.push({ by: STATE.agent, at: stamp(), text: txt });
      renderNotes(c);
      $("#note-input").value = "";
      toast("Note saved.");
    });
  }

  function closeClaim(btn) {
    var c = current();
    if (!c) return Promise.resolve();
    if (!c.notes.some(function (n) { return n.by === STATE.agent; })) {
      toast("Cannot close: no case note recorded by you.");
      return Promise.resolve();
    }
    return busy(btn, "Closing…", 520).then(function () {
      c.closed = true;
      c.stage = "audit";
      c.notes.push({ by: "system", at: stamp(), text: "Claim closed by " + STATE.agent + "." });
      logEvent(c, "Claim closed; awaiting audit.");
      renderAudit(c);
      $("#claim-stage").textContent = "stage: audit";
      renderNotes(c);
      $("#claim-state").textContent = "claim closed";
      $("#claim-state").className = "tag Cancelled";
      $("#main").setAttribute("data-claim-state", "closed");
      lockIfClosed(c);
      toast("Claim " + c.id + " closed.");
    });
  }

  function setDeadline(btn, hours) {
    var c = current();
    if (!c) return Promise.resolve();
    /* Carry forward from the existing deadline when it is still in the future,
       rather than restarting the clock from now. Restarting silently gives the
       counterparty more time than the case file says they were given. */
    var base = new Date(c.deadline);
    var now = new Date("2026-08-26T17:00:00");
    var from = base > now ? base : now;
    return busy(btn, "Setting…", 300).then(function () {
      c.deadline = new Date(from.getTime() + hours * 3600000).toISOString();
      c.deadlineSetBy = STATE.agent;
      renderDeadline(c);
      logEvent(c, "Response deadline extended by " + hours + "h to " + fmt(c.deadline) + ".");
      toast("Deadline set to " + fmt(c.deadline) + ".");
    });
  }

  function openRecovery(btn) {
    var c = current();
    if (!c || c.recovery) return Promise.resolve();
    return busy(btn, "Opening…", 700).then(function () {
      c.recovery = {
        ref: "RC-" + (410000 + Math.floor(Math.random() * 9000)),
        amount: c.order.fiat + " " + c.order.fiatAmount,
        status: "active",
        openedAt: stamp(),
        settledAt: null
      };
      c.stage = "recovery";
      renderRecovery(c);
      $("#claim-stage").textContent = "stage: recovery";
      logEvent(c, "Recovery claim " + c.recovery.ref + " opened; " + c.recovery.amount + " restricted.");
      toast("Recovery claim " + c.recovery.ref + " opened.");
    });
  }

  function closeRecovery(btn, outcome) {
    var c = current();
    if (!c || !c.recovery || c.recovery.status !== "active") return Promise.resolve();
    return busy(btn, outcome === "settled" ? "Settling…" : "Closing…", 600).then(function () {
      c.recovery.status = outcome;
      c.recovery.settledAt = stamp();
      renderRecovery(c);
      logEvent(c, outcome === "settled"
        ? "Recovery " + c.recovery.ref + " settled; funds returned."
        : "Recovery " + c.recovery.ref + " closed as unrecoverable.");
      toast(outcome === "settled" ? "Recovery settled." : "Marked unrecoverable.");
    });
  }

  function escalate(btn) {
    var c = current();
    if (!c || c.escalated) { toast("Already escalated."); return Promise.resolve(); }
    return busy(btn, "Escalating…", 500).then(function () {
      c.escalated = true;
      c.priority = "High";
      renderCase(c.id);
      logEvent(c, "Escalated to senior review.");
      toast("Escalated to senior review.");
    });
  }

  function audit(btn, outcome) {
    var c = current();
    if (!c || !c.closed) return Promise.resolve();
    return busy(btn, "Submitting…", 550).then(function () {
      c.audit = { status: outcome, by: "audit.queue", at: stamp() };
      if (outcome === "queried") {
        /* A queried case reopens. The audit step is not a rubber stamp. */
        c.closed = false;
        c.stage = "review";
        renderCase(c.id);
        logEvent(c, "Audit queried the close — case reopened for correction.");
        toast("Audit queried — case reopened.");
      } else {
        c.stage = "closed";
        renderAudit(c);
        logEvent(c, "Audit passed.");
        toast("Audit passed.");
      }
    });
  }

  window.PEERLEDGER_TOAST = toast;

  /* ---------------- router ---------------- */

  function route() {
    var h = location.hash || "#/queue";

    var claim = h.match(/^#\/claim\/(.+)$/);
    if (claim) {
      $$(".topnav a").forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#/queue"); });
      renderCase(claim[1]);
      return;
    }

    $("#main").removeAttribute("data-claim-id");
    $("#main").removeAttribute("data-claim-state");

    var section = h.match(/^#\/section\/(.+)$/);
    if (section) {
      $("#main").setAttribute("data-view", "section");
      renderStub(section[1]);
      return;
    }

    var mode = h === "#/pool" ? "pool" : h === "#/closed" ? "closed"
      : h === "#/escalations" ? "escalations" : "queue";
    $("#main").setAttribute("data-view", mode);
    $$(".topnav a").forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#/queue"); });
    renderQueue(mode);
  }

  window.addEventListener("hashchange", route);
  $("#who").textContent = STATE.agent + " · shift " + STATE.shift;
  route();
})();
