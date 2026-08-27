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
  function current() {
    var id = $("#main").getAttribute("data-claim-id");
    return CLAIMS.filter(function (c) { return c.id === id; })[0] || null;
  }

  /* ---------------- queue ---------------- */

  function renderQueue(mode) {
    var rows = CLAIMS.filter(function (c) {
      if (mode === "closed") return c.closed;
      if (mode === "pool") return !c.assigned && !c.closed;
      return c.assigned && !c.closed;
    });
    var title = mode === "closed" ? "Closed today" : mode === "pool" ? "Unassigned pool" : "Work queue";
    $("#queue-title").textContent = title;
    $("#queue-crumb").textContent = title;
    $$(".nav-item[data-nav]").forEach(function (n) { n.classList.toggle("on", n.dataset.nav === mode); });

    var body = $("#queue-body");
    if (!rows.length) {
      body.innerHTML = '<tr class="empty-row"><td colspan="9">' +
        (mode === "pool" ? "No unassigned claims." : mode === "closed" ? "Nothing closed yet this shift." : "Nothing assigned to you.") + "</td></tr>";
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
      (mode === "pool" ? "unassigned" : mode === "closed" ? "closed" : "assigned to you");
    $("#view-queue").hidden = false;
    $("#view-case").hidden = true;
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
    $("#order-kv").innerHTML = [
      kv("Order reference", o.ref), kv("Status", o.status), kv("Pair", o.pair), kv("Side", o.side),
      kv("Crypto quantity", o.cryptoAmount + " " + o.asset),
      kv("Fiat amount", o.fiat + " " + o.fiatAmount),
      kv("Unit price", o.price + " " + o.fiat + "/" + o.asset),
      kv("Payment method", o.method), kv("Created", o.createdAt), kv("Released", o.releasedAt || "-")
    ].join("");

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

    $("#evidence-count").textContent = c.evidence.length + " items";
    $("#evidence-list").innerHTML = c.evidence.map(function (e) {
      return '<li><span class="fn">' + e.label + '</span><span class="tg ' +
        e.tag.replace(/\s/g, "") + '">' + e.tag + "</span></li>";
    }).join("");

    renderNotes(c);
    renderSent(c);
    $("#note-input").value = "";
    $("#msg-input").value = "";
    lockIfClosed(c);

    $("#view-queue").hidden = true;
    $("#view-case").hidden = false;
  }

  function lockIfClosed(c) {
    ["#msg-input", "#msg-send", "#note-input", "#note-save", "#close-claim"].forEach(function (s) {
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
    return busy(btn, "Saving…", 420).then(function () {
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
      c.notes.push({ by: "system", at: stamp(), text: "Claim closed by " + STATE.agent + "." });
      renderNotes(c);
      $("#claim-state").textContent = "claim closed";
      $("#claim-state").className = "tag Cancelled";
      $("#main").setAttribute("data-claim-state", "closed");
      lockIfClosed(c);
      toast("Claim " + c.id + " closed.");
    });
  }

  window.PEERLEDGER_TOAST = toast;

  /* ---------------- router ---------------- */

  function route() {
    var h = location.hash || "#/queue";
    var m = h.match(/^#\/claim\/(.+)$/);
    if (m) { renderCase(m[1]); return; }
    var mode = h === "#/pool" ? "pool" : h === "#/closed" ? "closed" : "queue";
    $("#main").removeAttribute("data-claim-id");
    $("#main").removeAttribute("data-claim-state");
    $("#main").setAttribute("data-view", mode);
    renderQueue(mode);
  }

  window.addEventListener("hashchange", route);
  $("#who").textContent = STATE.agent + " · shift " + STATE.shift;
  route();
})();
