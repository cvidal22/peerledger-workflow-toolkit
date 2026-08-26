/*
 * PeerLedger Dispute Console — demo application.
 *
 * This file knows nothing about the userscripts. It is deliberately written the
 * way an internal tool tends to be written: information is split across tabs,
 * each panel renders independently, and nothing is exposed for convenience.
 * The scripts in /scripts read this page from the outside, like they would a
 * real vendor application.
 */
(function () {
  "use strict";

  var claims = window.PEERLEDGER_CLAIMS || [];
  var current = null;

  var $ = function (sel) { return document.querySelector(sel); };

  /* ---------- work basket ---------- */

  function renderBasket() {
    var list = $("#basket-list");
    list.innerHTML = "";
    claims.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "claim-row";
      b.type = "button";
      b.setAttribute("data-claim-id", c.id);
      b.setAttribute("aria-current", String(current && current.id === c.id));
      b.innerHTML =
        '<div class="r1"><span class="cid">' + c.id + "</span>" +
        '<span class="age">' + c.slaHours + "h SLA</span></div>" +
        '<div class="r2">' + c.typeLabel + "</div>" +
        '<div class="r3">' + c.order.fiat + " " + c.order.fiatAmount + " · " + c.order.ref + "</div>";
      b.addEventListener("click", function () { openClaim(c.id); });
      list.appendChild(b);
    });
    $("#basket-count").textContent = claims.length + " open";
  }

  /* ---------- claim rendering ---------- */

  function field(k, v) {
    return '<div class="field"><div class="k">' + k + '</div><div class="v">' + v + "</div></div>";
  }

  function openClaim(id) {
    current = claims.filter(function (c) { return c.id === id; })[0];
    if (!current) return;

    var ws = $("#workspace");
    ws.setAttribute("data-claim-id", current.id);
    ws.setAttribute("data-claim-type", current.type);

    $("#case-id").textContent = current.id;
    $("#case-type").textContent = current.typeLabel;
    $("#case-sla").textContent = "SLA " + current.slaHours + "h";
    $("#case-sub").textContent =
      "Filed by " + current.filedBy + " · opened " + current.openedAt + " · order " + current.order.ref;

    var o = current.order;
    $("#order-fields").innerHTML = [
      field("Order reference", o.ref),
      field("Status", '<span class="status-tag status-' + o.status + '">' + o.status + "</span>"),
      field("Asset", o.cryptoAmount + " " + o.asset),
      field("Fiat value", o.fiat + " " + o.fiatAmount),
      field("Unit price", o.price + " " + o.fiat + "/" + o.asset),
      field("Payment method", o.method),
      field("Created", o.createdAt),
      field("Released", o.releasedAt || "—")
    ].join("");

    var p = current.parties;
    $("#party-fields").innerHTML = [
      field("Seller", p.seller.handle),
      field("Seller tenure", p.seller.tenure),
      field("Seller orders", String(p.seller.orders)),
      field("Seller disputes", String(p.seller.disputes)),
      field("Buyer", p.buyer.handle),
      field("Buyer tenure", p.buyer.tenure),
      field("Buyer orders", String(p.buyer.orders)),
      field("Buyer disputes", String(p.buyer.disputes))
    ].join("");

    $("#chat-log").innerHTML = current.chat.map(function (m) {
      return '<div class="msg ' + m.from + '" data-from="' + m.from + '">' +
        '<div class="who">' + m.from + "</div>" +
        '<div class="bubble">' + escapeHtml(m.text) + "</div>" +
        '<div class="at">' + m.at + "</div></div>";
    }).join("");

    $("#claim-narrative").textContent = current.narrative;

    $("#evidence-list").innerHTML = current.evidence.map(function (e) {
      return '<li><span class="kind">' + e.kind + "</span>" + e.label + "</li>";
    }).join("");

    renderBasket();
    selectTab("order");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- tabs ---------- */

  function selectTab(name) {
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (t) {
      t.setAttribute("aria-selected", String(t.dataset.panel === name));
    });
    Array.prototype.forEach.call(document.querySelectorAll(".panel"), function (p) {
      p.classList.toggle("active", p.dataset.panel === name);
    });
    $("#panels").scrollTop = 0;
  }

  document.addEventListener("click", function (e) {
    var tab = e.target.closest(".tab");
    if (tab) selectTab(tab.dataset.panel);

    var action = e.target.closest("[data-action]");
    if (action) toast("Action recorded in demo: " + action.dataset.action.replace(/_/g, " "));
  });

  /* ---------- toast ---------- */

  function toast(text) {
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = text;
    $("#toast-stack").appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }

  /* ---------- boot ---------- */

  renderBasket();
  if (claims.length) openClaim(claims[0].id);
})();
