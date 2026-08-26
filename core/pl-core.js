/*
 * pl-core.js — shared runtime for the PeerLedger workflow scripts.
 *
 * Design rule that governs this file:
 *
 *   Exactly one layer is allowed to know what the page looks like.
 *
 * That layer is `PL.adapter`. Everything above it — the panel UI, the hotkey
 * layer, the template composer — operates on a plain `Case` object and has no
 * idea whether the data came from a DOM scrape, an API, or a fixture. When the
 * host application ships a redesign, the adapter is the only thing that breaks,
 * and it is roughly forty lines.
 *
 * That boundary is the whole reason a set of scripts like this survives contact
 * with a product team that ships weekly.
 *
 * Exposed as `window.PL`.
 */
(function (global) {
  "use strict";

  var PL = {};

  /* ------------------------------------------------------------------ *
   * dom — thin helpers. No business logic lives here.
   * ------------------------------------------------------------------ */

  PL.dom = {
    qs: function (sel, root) { return (root || document).querySelector(sel); },
    qsa: function (sel, root) {
      return Array.prototype.slice.call((root || document).querySelectorAll(sel));
    },
    text: function (sel, root) {
      var el = PL.dom.qs(sel, root);
      return el ? el.textContent.trim() : "";
    },
    el: function (tag, attrs, children) {
      var node = document.createElement(tag);
      Object.keys(attrs || {}).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else node.setAttribute(k, attrs[k]);
      });
      (children || []).forEach(function (c) {
        node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      });
      return node;
    },
    style: function (id, css) {
      if (document.getElementById(id)) return;
      var s = document.createElement("style");
      s.id = id;
      s.textContent = css;
      document.head.appendChild(s);
    }
  };

  /* ------------------------------------------------------------------ *
   * watch — fires a callback whenever the operator moves to another case.
   *
   * Single-page applications do not reload, so a userscript that only runs
   * on document-ready works once and then silently goes stale. This watches
   * the case identifier and re-runs on change, debounced so a burst of DOM
   * mutations produces one call rather than forty.
   * ------------------------------------------------------------------ */

  PL.watch = function (getKey, onChange, opts) {
    opts = opts || {};
    var debounceMs = opts.debounceMs || 60;
    var last = null;
    var timer = null;

    function check() {
      var key = getKey();
      if (!key || key === last) return;
      last = key;
      onChange(key);
    }

    var observer = new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(check, debounceMs);
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    check();
    return function stop() { observer.disconnect(); };
  };

  /* ------------------------------------------------------------------ *
   * adapter — the only DOM-coupled code in the project.
   *
   * Reads the host page and returns a normalised `Case`:
   *
   *   { id, type, typeLabel, filedBy, order:{}, parties:{}, narrative, evidence:[], chat:[] }
   *
   * Note what it does NOT do: it makes no decisions, applies no rules and
   * ranks nothing. It converts pixels into data and stops.
   * ------------------------------------------------------------------ */

  PL.adapter = {
    caseKey: function () {
      var ws = PL.dom.qs("#workspace");
      return ws ? ws.getAttribute("data-claim-id") : null;
    },

    readFields: function (containerSel) {
      var out = {};
      PL.dom.qsa(containerSel + " .field").forEach(function (f) {
        var k = PL.dom.text(".k", f);
        out[k] = PL.dom.text(".v", f);
      });
      return out;
    },

    readCase: function () {
      var ws = PL.dom.qs("#workspace");
      if (!ws || !ws.getAttribute("data-claim-id")) return null;

      var order = PL.adapter.readFields("#order-fields");
      var parties = PL.adapter.readFields("#party-fields");

      return {
        id: ws.getAttribute("data-claim-id"),
        type: ws.getAttribute("data-claim-type"),
        typeLabel: PL.dom.text("#case-type"),
        filedBy: (PL.dom.text("#case-sub").match(/Filed by (\w+)/) || [])[1] || "",
        order: {
          ref: order["Order reference"] || "",
          status: order["Status"] || "",
          asset: order["Asset"] || "",
          fiatValue: order["Fiat value"] || "",
          price: order["Unit price"] || "",
          method: order["Payment method"] || "",
          createdAt: order["Created"] || "",
          releasedAt: order["Released"] || ""
        },
        parties: {
          seller: {
            handle: parties["Seller"] || "",
            tenure: parties["Seller tenure"] || "",
            orders: parseInt(parties["Seller orders"], 10) || 0,
            disputes: parseInt(parties["Seller disputes"], 10) || 0
          },
          buyer: {
            handle: parties["Buyer"] || "",
            tenure: parties["Buyer tenure"] || "",
            orders: parseInt(parties["Buyer orders"], 10) || 0,
            disputes: parseInt(parties["Buyer disputes"], 10) || 0
          }
        },
        narrative: PL.dom.text("#claim-narrative"),
        evidence: PL.dom.qsa("#evidence-list li").map(function (li) {
          return {
            kind: PL.dom.text(".kind", li),
            label: li.textContent.replace(PL.dom.text(".kind", li), "").trim()
          };
        }),
        chat: PL.dom.qsa("#chat-log .msg").map(function (m) {
          return {
            from: m.getAttribute("data-from"),
            at: PL.dom.text(".at", m),
            text: PL.dom.text(".bubble", m)
          };
        })
      };
    }
  };

  /* ------------------------------------------------------------------ *
   * ui — one docked panel, shared by every script.
   *
   * Each script registers a section. They stack in registration order in a
   * single panel rather than each script inventing its own floating window,
   * which is what turns a toolkit into visual noise.
   * ------------------------------------------------------------------ */

  var PANEL_CSS = [
    "#pl-panel{position:fixed;top:0;right:0;width:340px;height:100vh;background:#fff;",
    "border-left:1px solid #d6dae1;box-shadow:-2px 0 12px rgba(0,0,0,.06);z-index:9999;",
    "display:flex;flex-direction:column;font:13px/1.45 system-ui,-apple-system,sans-serif;color:#16181d}",
    "#pl-panel.pl-collapsed{transform:translateX(calc(100% - 34px))}",
    "#pl-panel-head{display:flex;align-items:center;gap:8px;padding:9px 12px;background:#16181d;color:#fff;flex:0 0 auto}",
    "#pl-panel-head b{font-size:12px;letter-spacing:.05em;text-transform:uppercase;font-weight:650}",
    "#pl-panel-head .pl-sp{flex:1}",
    "#pl-panel-head button{background:transparent;border:0;color:#fff;cursor:pointer;font-size:15px;padding:0 4px;line-height:1}",
    "#pl-panel-body{overflow-y:auto;flex:1;min-height:0}",
    ".pl-sec{border-bottom:1px solid #e6e9ee;padding:12px 14px}",
    ".pl-sec h4{margin:0 0 9px;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#545a66;font-weight:650}",
    ".pl-row{display:flex;justify-content:space-between;gap:10px;padding:3px 0;font-size:12.5px}",
    ".pl-row .pl-k{color:#868d9a}",
    ".pl-row .pl-v{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;text-align:right}",
    ".pl-flag{border-left:3px solid #9a5116;background:#fdf1e5;padding:7px 9px;margin-bottom:7px;border-radius:2px}",
    ".pl-flag .pl-ft{font-weight:650;font-size:12px;color:#9a5116}",
    ".pl-flag .pl-fq{font-size:12px;color:#545a66;margin-top:3px;font-style:italic}",
    ".pl-none{color:#868d9a;font-size:12.5px}",
    ".pl-btn{font:inherit;font-size:12.5px;padding:6px 10px;border:1px solid #d6dae1;background:#fff;",
    "border-radius:3px;cursor:pointer;margin:0 6px 6px 0}",
    ".pl-btn:hover{border-color:#868d9a}",
    ".pl-btn.pl-on{background:#2f4b7c;border-color:#2f4b7c;color:#fff}",
    ".pl-out{width:100%;min-height:150px;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;",
    "border:1px solid #d6dae1;border-radius:3px;padding:8px;resize:vertical;margin-top:8px}",
    ".pl-hint{font-size:11.5px;color:#868d9a;margin-top:6px}",
    ".pl-quote{font-size:12px;color:#545a66;border-left:2px solid #d6dae1;padding-left:8px;margin:4px 0}"
  ].join("");

  PL.ui = {
    _sections: {},

    panel: function () {
      var p = document.getElementById("pl-panel");
      if (p) return p;

      PL.dom.style("pl-core-css", PANEL_CSS);

      p = PL.dom.el("div", { id: "pl-panel" });
      var head = PL.dom.el("div", { id: "pl-panel-head" }, [
        PL.dom.el("b", { text: "Toolkit" }),
        PL.dom.el("span", { class: "pl-sp" }),
        PL.dom.el("button", {
          title: "Collapse panel (Alt+\\)",
          text: "›",
          onclick: function () { p.classList.toggle("pl-collapsed"); }
        })
      ]);
      p.appendChild(head);
      p.appendChild(PL.dom.el("div", { id: "pl-panel-body" }));
      document.body.appendChild(p);

      PL.hotkeys.bind("alt+\\", function () { p.classList.toggle("pl-collapsed"); });
      return p;
    },

    section: function (key, title) {
      PL.ui.panel();
      if (PL.ui._sections[key]) return PL.ui._sections[key];
      var body = PL.dom.el("div");
      var sec = PL.dom.el("div", { class: "pl-sec", "data-pl-section": key }, [
        PL.dom.el("h4", { text: title }),
        body
      ]);
      document.getElementById("pl-panel-body").appendChild(sec);
      PL.ui._sections[key] = body;
      return body;
    },

    rows: function (pairs) {
      return pairs.map(function (p) {
        return PL.dom.el("div", { class: "pl-row" }, [
          PL.dom.el("span", { class: "pl-k", text: p[0] }),
          PL.dom.el("span", { class: "pl-v", text: p[1] })
        ]);
      });
    },

    clear: function (node) { while (node.firstChild) node.removeChild(node.firstChild); }
  };

  /* ------------------------------------------------------------------ *
   * hotkeys — one keydown listener for the whole toolkit.
   * ------------------------------------------------------------------ */

  PL.hotkeys = (function () {
    var map = {};
    var attached = false;

    function normalise(e) {
      var parts = [];
      if (e.altKey) parts.push("alt");
      if (e.ctrlKey) parts.push("ctrl");
      if (e.shiftKey) parts.push("shift");
      parts.push(String(e.key).toLowerCase());
      return parts.join("+");
    }

    function attach() {
      if (attached) return;
      attached = true;
      document.addEventListener("keydown", function (e) {
        var tag = (e.target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
        var fn = map[normalise(e)];
        if (fn) { e.preventDefault(); fn(e); }
      });
    }

    return {
      bind: function (combo, fn) { map[combo.toLowerCase()] = fn; attach(); },
      list: function () { return Object.keys(map); }
    };
  })();

  /* ------------------------------------------------------------------ *
   * template — token substitution with strict failure.
   *
   * An unresolved token throws rather than rendering "Dear {{name}}" into a
   * message an operator then sends. Loud failure beats quiet embarrassment.
   * ------------------------------------------------------------------ */

  PL.template = {
    render: function (tpl, vars) {
      return tpl.replace(/\{\{(\w+)\}\}/g, function (_, key) {
        if (!(key in vars) || vars[key] === undefined || vars[key] === null) {
          throw new Error("Template token not supplied: " + key);
        }
        return vars[key];
      });
    }
  };

  /* ------------------------------------------------------------------ *
   * clipboard
   * ------------------------------------------------------------------ */

  PL.clipboard = {
    copy: function (text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return Promise.resolve();
    }
  };

  /* ------------------------------------------------------------------ *
   * log
   * ------------------------------------------------------------------ */

  PL.log = function (script, msg) {
    if (global.PL_DEBUG) console.log("[pl:" + script + "] " + msg);
  };

  PL.version = "1.0.0";
  global.PL = PL;
})(typeof unsafeWindow !== "undefined" ? unsafeWindow : window);
