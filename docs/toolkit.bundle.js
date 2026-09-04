/*
 * toolkit.bundle.js — GENERATED. Do not edit.
 *
 * Built by build/bundle.js from core/pl-core.js and scripts/*.user.js.
 * This is the same code the extension runs; it exists because GitHub
 * Pages only serves docs/, so the demo page needs a same-origin copy.
 *
 * Regenerate with:  node build/bundle.js
 * CI fails if this file has drifted from its sources.
 */

/*
 * pl-core.js — shared runtime for the PeerLedger workflow scripts.
 *
 * The rule that governs this file:
 *
 *   Exactly one layer is allowed to know what the page looks like.
 *
 * That layer is `PL.adapter`. Everything above it — panel, overlay, hotkeys,
 * template composer, poller — operates on plain `Case` and `QueueRow` objects
 * and has no idea whether the data came from a DOM scrape, an API or a fixture.
 *
 * When the host application ships a redesign, the adapter is the only thing
 * that breaks, and it is about sixty lines. Five scripts keep working.
 *
 * Exposed as `window.PL`.
 */
(function (global) {
  "use strict";

  var PL = { version: "6.1.0" };

  /* ================================================================
   * dom
   * ================================================================ */

  PL.dom = {
    qs: function (s, r) { return (r || document).querySelector(s); },
    qsa: function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); },
    text: function (s, r) { var e = PL.dom.qs(s, r); return e ? e.textContent.trim() : ""; },
    el: function (tag, attrs, kids) {
      var n = document.createElement(tag);
      Object.keys(attrs || {}).forEach(function (k) {
        if (k === "class") n.className = attrs[k];
        else if (k === "html") n.innerHTML = attrs[k];
        else if (k === "text") n.textContent = attrs[k];
        else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") n.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else n.setAttribute(k, attrs[k]);
      });
      (kids || []).forEach(function (c) {
        n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      });
      return n;
    },
    style: function (id, css) {
      if (document.getElementById(id)) return;
      var s = document.createElement("style");
      s.id = id; s.textContent = css;
      document.head.appendChild(s);
    }
  };

  /* ================================================================
   * adapter — the ONLY DOM-coupled code in the project.
   *
   * Converts pixels into data and stops. It makes no decisions, ranks
   * nothing and filters nothing.
   * ================================================================ */

  PL.adapter = {
    view: function () {
      var m = PL.dom.qs("#main");
      return m ? m.getAttribute("data-view") : null;
    },

    caseKey: function () {
      var m = PL.dom.qs("#main");
      return m ? m.getAttribute("data-claim-id") : null;
    },

    /* Queue rows, as shown. Whether a row is claimable is a property of the
       view, not a judgement this function makes.

       Columns are located by HEADER TEXT, never by position. A fixed index
       breaks silently the moment a column is added or removed — it does not
       throw, it just reads the neighbouring column, and the script carries on
       confidently with the wrong value. Reading by header costs one pass over
       the <th> row and survives the table changing shape. */
    columnIndex: function (name) {
      var heads = PL.dom.qsa("#queue-table thead th");
      for (var i = 0; i < heads.length; i++) {
        if (heads[i].textContent.trim().toLowerCase() === String(name).toLowerCase()) return i;
      }
      return -1;
    },

    readQueue: function () {
      var cols = {};
      ["Dispute", "Order", "Value", "Filed by", "Priority", "Age", "SLA"].forEach(function (n) {
        cols[n] = PL.adapter.columnIndex(n);
      });
      var cell = function (tr, n) {
        var i = cols[n];
        return i >= 0 && tr.children[i] ? tr.children[i].textContent.trim() : "";
      };
      return PL.dom.qsa("#queue-body tr[data-row-claim]").map(function (tr) {
        return {
          id: tr.getAttribute("data-row-claim"),
          orderRef: cell(tr, "Order"),
          value: cell(tr, "Value"),
          filedBy: cell(tr, "Filed by"),
          priority: cell(tr, "Priority"),
          age: cell(tr, "Age"),
          sla: cell(tr, "SLA"),
          claimButton: tr.querySelector("[data-claim-action]"),
          openLink: tr.querySelector("a.claimid")
        };
      });
    },

    readKv: function (sel) {
      var out = {};
      PL.dom.qsa(sel + " > div").forEach(function (d) {
        var v = PL.dom.text(".v", d);
        out[PL.dom.text(".k", d)] = (v === "-" || v === "—") ? "" : v;
      });
      return out;
    },

    readCase: function () {
      var main = PL.dom.qs("#main");
      if (!main || !main.getAttribute("data-claim-id")) return null;

      var o = PL.adapter.readKv("#order-kv");
      var cp = PL.adapter.readKv("#complainant-kv");
      var df = PL.adapter.readKv("#defendant-kv");
      var cl = PL.adapter.readKv("#claim-kv");

      function party(k) {
        return {
          role: k["Role"] || "", handle: k["Handle"] || "", uid: k["User ID"] || "",
          tier: k["Tier"] || "", tenure: k["Account age"] || "",
          orders: parseInt(k["Completed orders"], 10) || 0,
          disputes: parseInt(k["Prior disputes"], 10) || 0,
          country: k["KYC country"] || ""
        };
      }

      return {
        id: main.getAttribute("data-claim-id"),
        type: main.getAttribute("data-claim-type"),
        typeLabel: cl["Claim type"] || "",
        filedBy: cl["Filed by"] || "",
        openedAt: cl["Opened"] || "",
        sla: cl["SLA"] || "",
        order: {
          ref: o["Order reference"] || "", status: o["Status"] || "",
          pair: o["Pair"] || "", side: o["Side"] || "",
          crypto: o["Crypto quantity"] || "", fiat: o["Fiat amount"] || "",
          price: o["Unit price"] || "", method: o["Payment method"] || "",
          createdAt: o["Created"] || "", releasedAt: o["Released"] || ""
        },
        complainant: party(cp),
        defendant: party(df),
        narrative: PL.dom.text("#claim-narrative"),
        evidence: PL.dom.qsa("#evidence-list li").map(function (li) {
          return { label: PL.dom.text(".fn", li), tag: PL.dom.text(".tg", li) };
        }),
        chat: PL.dom.qsa("#chat-log .msg").map(function (m) {
          return { from: m.getAttribute("data-from"), at: PL.dom.text(".at", m), text: PL.dom.text(".bub", m) };
        })
      };
    },

    noteField: function () { return PL.dom.qs("#note-input"); },
    messageField: function () { return PL.dom.qs("#message-input"); },
    sendButton: function () { return PL.dom.qs("#message-send"); },
    saveNoteButton: function () { return PL.dom.qs("#note-save"); },
    closeButton: function () { return PL.dom.qs("#claim-close"); },

    claimState: function () {
      var m = PL.dom.qs("#main");
      return m ? m.getAttribute("data-claim-state") : null;
    },

    /* Note history, used to verify that a write actually landed. Checking the
       host's own rendered record is the only honest confirmation available —
       a click handler returning without error proves nothing. */
    noteHistory: function () {
      return PL.dom.qsa("#notes-table tbody tr").map(function (tr) {
        var td = tr.children;
        return td.length < 2 ? null : { meta: td[0].textContent.trim(), text: td[1].textContent.trim() };
      }).filter(Boolean);
    }
  };

  /* ================================================================
   * watch — re-run on case change.
   *
   * Single-page apps do not reload. A script bound to document-ready runs
   * once and then quietly goes stale, which is worse than not running,
   * because the operator keeps trusting it.
   * ================================================================ */

  PL.watch = function (getKey, onChange, opts) {
    opts = opts || {};
    var last = null, timer = null;
    function check() {
      var k = getKey();
      if (k === last) return;
      last = k;
      onChange(k);
    }
    new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(check, opts.debounceMs || 60);
    }).observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("hashchange", function () { setTimeout(check, 40); });
    check();
  };

  /* ================================================================
   * poll — interval work with backoff and a hard stop.
   *
   * Every polling script eventually meets a page that has logged out, a
   * queue that stays empty for an hour, or a tab left open overnight. The
   * ones that survive have three properties: they back off when there is
   * nothing to do, they stop entirely after a run of empty cycles, and
   * they never overlap their own runs.
   * ================================================================ */

  PL.poll = function (fn, opts) {
    opts = opts || {};
    var base = opts.baseMs || 5000;
    var max = opts.maxMs || 60000;
    var giveUpAfter = opts.giveUpAfter || 40;
    var onStop = opts.onStop || function () {};

    var wait = base, empties = 0, running = false, stopped = false, timer = null;

    function schedule() {
      if (stopped) return;
      timer = setTimeout(tick, wait);
    }

    function tick() {
      if (stopped || running) return;
      running = true;
      Promise.resolve()
        .then(fn)
        .then(function (didWork) {
          if (didWork) { wait = base; empties = 0; }
          else {
            empties++;
            wait = Math.min(Math.round(wait * 1.6), max);
            if (empties >= giveUpAfter) { api.stop("idle"); return; }
          }
        })
        .catch(function (err) {
          empties++;
          wait = Math.min(Math.round(wait * 2), max);
          PL.log("poll", "error: " + err.message);
        })
        .then(function () { running = false; schedule(); });
    }

    var api = {
      start: function () { if (stopped) { stopped = false; wait = base; empties = 0; } schedule(); return api; },
      stop: function (reason) { stopped = true; clearTimeout(timer); onStop(reason || "manual"); return api; },
      running: function () { return !stopped; },
      waitMs: function () { return wait; }
    };
    return api;
  };

  /* ================================================================
   * sequence — ordered multi-step actions with verification between steps.
   *
   * Reading a page is forgiving; a bad read shows a wrong number and the
   * operator notices. Multi-step *writes* are not forgiving, because the
   * failure mode is not "nothing happened" — it is "half of it happened",
   * and half is often worse than none. A claim closed without its remark
   * saved is worse than an untouched claim: the queue looks handled, the
   * audit trail is wrong, and nobody knows to go back.
   *
   * So the contract here is deliberately strict:
   *
   *   Verify before continuing. Every step declares how to check that it
   *     actually took effect. The next step does not start until that check
   *     passes. Clicking a button is not evidence that anything happened.
   *
   *   Halt, never retry. If a verification fails the sequence stops where it
   *     is and reports exactly which steps completed. It does not retry,
   *     because a step that may have half-applied is not safe to repeat, and
   *     it does not roll back, because it has no authority to undo a message
   *     that may already have reached someone.
   *
   *   Irreversible last. Step order is the caller's responsibility, but the
   *     runner is built assuming the least recoverable action is at the end,
   *     so a mid-sequence halt leaves the most recoverable state.
   *
   *   One at a time. A sequence in flight refuses to start again. Double-fire
   *     from an impatient second keypress is the most common way these things
   *     send two messages.
   *
   * Steps: { label, run: fn -> void|Promise, verify: fn -> boolean }
   * ================================================================ */

  PL.sequence = function (steps, opts) {
    opts = opts || {};
    var settleMs = opts.settleMs || 120;
    var inFlight = false;

    function verifyWithin(step, budgetMs) {
      var start = Date.now();
      return new Promise(function (resolve) {
        (function attempt() {
          var ok = false;
          try { ok = !!step.verify(); } catch (e) { ok = false; }
          if (ok) return resolve(true);
          if (Date.now() - start > budgetMs) return resolve(false);
          setTimeout(attempt, 40);
        })();
      });
    }

    return {
      inFlight: function () { return inFlight; },

      run: function (onProgress) {
        if (inFlight) return Promise.resolve({ ok: false, halted: "already running", done: [] });
        inFlight = true;

        var done = [];
        var chain = Promise.resolve();

        steps.forEach(function (step, i) {
          chain = chain.then(function (halted) {
            if (halted) return halted;

            onProgress({ index: i, label: step.label, state: "running" });

            return Promise.resolve()
              .then(function () { return step.run(); })
              .then(function () { return new Promise(function (r) { setTimeout(r, settleMs); }); })
              .then(function () { return verifyWithin(step, opts.verifyMs || 1200); })
              .then(function (ok) {
                if (!ok) {
                  onProgress({ index: i, label: step.label, state: "failed" });
                  return step.label;
                }
                done.push(step.label);
                onProgress({ index: i, label: step.label, state: "done" });
                return null;
              })
              .catch(function (err) {
                onProgress({ index: i, label: step.label, state: "failed", error: err.message });
                return step.label;
              });
          });
        });

        return chain.then(function (halted) {
          inFlight = false;
          return { ok: !halted, halted: halted || null, done: done };
        });
      }
    };
  };

  /* ================================================================
   * waitFor — resolve when a condition becomes true, or reject.
   *
   * The single most common cause of a broken chained macro is firing the
   * next step before the previous one finished. Fixed sleeps are the usual
   * fix and they are wrong in both directions: too short on a slow morning,
   * and wasted time on every other run. Polling a condition costs nothing
   * and is correct at both extremes.
   * ================================================================ */

  PL.waitFor = function (cond, opts) {
    opts = opts || {};
    var timeout = opts.timeoutMs || 8000;
    var every = opts.everyMs || 60;
    var label = opts.label || "condition";
    return new Promise(function (resolve, reject) {
      var t0 = Date.now();
      (function tick() {
        var ok;
        try { ok = cond(); } catch (e) { ok = false; }
        if (ok) return resolve(true);
        if (Date.now() - t0 > timeout) return reject(new Error("timed out waiting for " + label));
        setTimeout(tick, every);
      })();
    });
  };

  /* ================================================================
   * chain — run a sequence of real actions as one operator gesture.
   *
   * The naive version of this is three clicks in a row behind one keystroke.
   * It works on a fast day and fails silently on a slow one, and its failures
   * are expensive because they are *partial*: a message went out, nothing was
   * recorded, and the claim is still open. Nobody downstream can tell that
   * happened by looking.
   *
   * A browser UI offers no transactions, so the properties have to be built:
   *
   *   PREFLIGHT   Conditions checked before anything runs. Cheaper to refuse
   *               at step zero than to abort at step three, and refusing
   *               early is the only way to avoid partial state entirely.
   *
   *   VERIFY      Each step declares how to confirm it actually landed —
   *               a note appearing in the history, a status flipping. The
   *               click returning is not evidence that the save persisted.
   *
   *   ABORT       On a failed verification the chain stops rather than
   *               continuing into steps that assume it worked.
   *
   *   REPORT      On abort, the operator is told exactly which steps
   *               committed and which did not. Silent partial failure is
   *               the worst outcome available here, worse than not running.
   *
   *   LOCK        One chain at a time, globally. Double keypresses, impatient
   *               re-triggers and overlapping runs all collapse to one.
   *
   *   ONCE        A chain that has completed on a case will not re-run on
   *               that case without an explicit reset.
   *
   *   CONFIRM     Steps flagged irreversible require an explicit yes.
   *
   * Steps: { name, run, verify?, irreversible?, undoable? }
   * ================================================================ */

  PL.chain = (function () {
    var lock = false;
    var completed = {};

    function run(spec) {
      var steps = spec.steps || [];
      var key = spec.key || null;
      var onProgress = spec.onProgress || function () {};
      var confirm = spec.confirm || function () { return Promise.resolve(true); };

      var log = steps.map(function (s) { return { name: s.name, state: "pending" }; });
      function emit(msg) { onProgress(log.slice(), msg); }

      if (lock) {
        return Promise.resolve({ ok: false, reason: "A chain is already running.", log: log });
      }
      if (key && completed[key]) {
        return Promise.resolve({ ok: false, reason: "Already run on " + key + ". Reset to run again.", log: log });
      }

      // Preflight: every check must pass before any step executes.
      var failed = (spec.preflight || []).filter(function (p) { return !p.check(); });
      if (failed.length) {
        return Promise.resolve({
          ok: false,
          reason: "Preflight failed — nothing ran.",
          detail: failed.map(function (f) { return f.label; }),
          log: log
        });
      }

      lock = true;
      var i = 0;

      function step() {
        if (i >= steps.length) {
          if (key) completed[key] = true;
          lock = false;
          emit("Chain complete.");
          return Promise.resolve({ ok: true, log: log });
        }

        var s = steps[i];
        var entry = log[i];

        var gate = s.irreversible
          ? confirm(s, log.slice())
          : Promise.resolve(true);

        return gate.then(function (yes) {
          if (!yes) {
            entry.state = "declined";
            lock = false;
            return {
              ok: false,
              reason: "Stopped at “" + s.name + "” — you declined the irreversible step.",
              log: log,
              committed: log.filter(function (l) { return l.state === "done"; }).map(function (l) { return l.name; })
            };
          }

          entry.state = "running";
          emit("Running: " + s.name);

          return Promise.resolve()
            .then(function () { return s.run(); })
            .then(function () {
              if (!s.verify) return true;
              return PL.waitFor(s.verify, { label: s.name, timeoutMs: s.timeoutMs || 8000 });
            })
            .then(function () {
              entry.state = "done";
              emit(s.name + " confirmed.");
              i++;
              return step();
            })
            .catch(function (err) {
              entry.state = "failed";
              entry.error = err.message;
              lock = false;
              var done = log.filter(function (l) { return l.state === "done"; }).map(function (l) { return l.name; });
              return {
                ok: false,
                reason: "Failed at “" + s.name + "”: " + err.message,
                log: log,
                committed: done,
                warning: done.length
                  ? "These steps already committed and were NOT undone: " + done.join(", ") + "."
                  : null
              };
            });
        });
      }

      emit("Preflight passed.");
      return step();
    }

    return {
      run: run,
      isLocked: function () { return lock; },
      hasRun: function (k) { return !!completed[k]; },
      reset: function (k) { delete completed[k]; }
    };
  })();

  /* ================================================================
   * spa — the layer that exists because reactive single-page apps
   *       actively resist naive automation.
   *
   * Every function here replaces something that "should" work and doesn't.
   * None of it is clever; all of it is scar tissue.
   * ================================================================ */

  PL.spa = {
    /* Assigning .value is ignored by frameworks that track their own state,
       so the write goes through the native prototype setter and then the
       events the framework is actually listening for. */
    set: function (field, value) {
      if (!field) return false;
      var proto = Object.getPrototypeOf(field);
      var desc = Object.getOwnPropertyDescriptor(proto, "value");
      if (desc && desc.set) desc.set.call(field, value);
      else field.value = value;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
      if (field.type === "number") field.dispatchEvent(new Event("blur", { bubbles: true }));
      return true;
    },

    /* A bare .click() is frequently ignored by components that bind to
       pointer events. The full sequence is what a real mouse produces. */
    click: function (el) {
      if (!el) return false;
      ["pointerdown", "mousedown", "mouseup", "click"].forEach(function (type) {
        var Ctor = type.indexOf("pointer") === 0 && global.PointerEvent ? global.PointerEvent : global.MouseEvent;
        el.dispatchEvent(new Ctor(type, { bubbles: true, cancelable: true, view: global }));
      });
      return true;
    },

    /* Navigation chrome often contains hidden copies of on-page label text.
       Every lookup filters for actual visibility or the script ends up
       clicking a menu item instead of a button. */
    visible: function (el) {
      if (!el || el.disabled) return false;

      /* Walk ancestors. An element can be display:inline-block itself while
         sitting inside a collapsed container — which is exactly what a
         navigation tree looks like. Checking only the element's own style
         reports a hidden menu item as visible, and the script then clicks it
         instead of the button the operator can see.
         `offsetParent === null` catches this in a real browser but depends on
         layout, which a test environment does not have. Walking computed
         style is correct in both. */
      var node = el;
      while (node && node.nodeType === 1) {
        if (node.hidden) return false;
        var cs = global.getComputedStyle ? global.getComputedStyle(node) : null;
        if (cs) {
          if (cs.display === "none" || cs.visibility === "hidden") return false;
          /* position:fixed elements report offsetParent === null while fully
             on screen, so they must never be judged by layout below. */
          if (cs.position === "fixed") return true;
        }
        node = node.parentElement;
      }

      /* Layout check last, and only when layout actually exists. */
      if (typeof el.getBoundingClientRect === "function") {
        var r = el.getBoundingClientRect();
        var hasLayout = r.width || r.height || r.top || r.left;
        if (hasLayout && r.width === 0 && r.height === 0) return false;
      }
      return true;
    },

    /* Menus are frequently teleported to <body>, so several may exist at
       once. When more than one matches, take the visible one nearest the
       element that opened it rather than the first in document order. */
    nearest: function (candidates, anchor) {
      var list = candidates.filter(PL.spa.visible);
      if (list.length < 2 || !anchor || !anchor.getBoundingClientRect) return list[0] || null;
      var y = anchor.getBoundingClientRect().top;
      return list.sort(function (a, b) {
        return Math.abs(a.getBoundingClientRect().top - y) - Math.abs(b.getBoundingClientRect().top - y);
      })[0];
    },

    byText: function (selector, text, root) {
      var t = String(text).toLowerCase();
      return PL.dom.qsa(selector, root).filter(function (el) {
        return PL.spa.visible(el) && el.textContent.trim().toLowerCase() === t;
      })[0] || null;
    },

    /* ----------------------------------------------------------------
     * Showing the work.
     *
     * A macro that fires four clicks in eight milliseconds is indisting-
     * uishable from a page that refreshed. The operator cannot tell what it
     * touched, cannot spot it touching the wrong thing, and cannot show
     * anyone else what the automation actually does.
     *
     * So each action scrolls its target into view, outlines it, pauses long
     * enough to be seen, and only then acts. The pause is deliberate cost —
     * a few hundred milliseconds against two minutes of manual work — and it
     * buys the thing that makes the automation trustworthy: you can watch it
     * and disagree with it.
     *
     * Set PL.spa.paceMs = 0 to remove it entirely.
     * ---------------------------------------------------------------- */
    /* Long enough to follow, short enough not to feel stuck. At 480ms a
       six-action macro took seven seconds and read as hung; at 300 the same
       run is about four and every step is still legible. */
    paceMs: 300,

    touch: function (el) {
      if (!el) return Promise.resolve(false);
      if (!PL.spa.paceMs) return Promise.resolve(true);
      PL.dom.style("pl-core-css", CSS);
      if (el.scrollIntoView) {
        try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { el.scrollIntoView(); }
      }
      el.classList.add("pl-touch");
      return new Promise(function (res) {
        setTimeout(function () { el.classList.remove("pl-touch"); res(true); }, PL.spa.paceMs);
      });
    },

    /* Highlight, then write. */
    setSlow: function (field, value) {
      return PL.spa.touch(field).then(function () { return PL.spa.set(field, value); });
    },

    /* Highlight, then click. */
    clickSlow: function (el) {
      return PL.spa.touch(el).then(function () { return PL.spa.click(el); });
    },

    /* Layout arrives before data. Waiting for the page to "look ready" is a
       guess; waiting for a specific field to hold a real value is a fact. */
    ready: function (probe, opts) {
      return PL.waitFor(function () {
        var v = typeof probe === "function" ? probe() : PL.dom.text(probe);
        return !!v && v !== "-" && v !== "—" && !/^\s*(loading|--)\s*$/i.test(v);
      }, opts || { label: "case data", timeoutMs: 10000 });
    }
  };

  /* ================================================================
   * timer — an interval that survives a backgrounded tab.
   *
   * Chrome throttles setTimeout/setInterval in background tabs to roughly
   * one tick per minute. A queue watcher built on setInterval therefore
   * stops watching the moment the operator looks at anything else, which
   * is precisely when they needed it. A Worker gets its own thread and
   * is not throttled the same way.
   * ================================================================ */

  PL.timer = function (intervalMs, fn) {
    var worker = null, fallback = null;
    try {
      var src = "let h=null;onmessage=e=>{if(e.data.stop){clearInterval(h);h=null;return;}" +
        "clearInterval(h);h=setInterval(()=>postMessage('tick'),e.data.every);};";
      worker = new Worker(URL.createObjectURL(new Blob([src], { type: "application/javascript" })));
      worker.onmessage = function () { fn(); };
      worker.postMessage({ every: intervalMs });
    } catch (e) {
      PL.log("timer", "worker unavailable, falling back to setInterval");
      fallback = setInterval(fn, intervalMs);
    }
    return {
      stop: function () {
        if (worker) { worker.postMessage({ stop: true }); worker.terminate(); worker = null; }
        if (fallback) { clearInterval(fallback); fallback = null; }
      },
      viaWorker: function () { return !!worker; }
    };
  };

  /* ================================================================
   * lang — per-party language resolution.
   *
   * The two parties in a dispute frequently do not share a language, and
   * neither necessarily shares the operator's. Detecting "the language of
   * the case" is therefore the wrong unit: it has to be resolved per party,
   * from what that party actually wrote.
   *
   * THE SPLIT THAT MATTERS
   *
   *   Outbound messages are translated into each recipient's own language.
   *   Internal case notes are NEVER translated. They stay in one language
   *   so that any colleague or auditor can pick up any case cold.
   *
   * Getting that backwards produces an audit trail nobody can read, which
   * is a far more expensive mistake than an awkward translation.
   *
   * Detection is confidence-scored; below threshold it falls back to the
   * house language rather than guessing, because a message in the wrong
   * language is worse than a message in the default one.
   * ================================================================ */

  PL.lang = (function () {
    var DEFAULT = "en";
    var THRESHOLD = 0.7;
    var cache = {};
    var CACHE_MS = 60000;

    /* Marker-based scoring. Deliberately small and inspectable rather than
       a dependency — the point is the architecture around it, and a wrong
       guess degrades to the default instead of failing. */
    /* DISTINCTIVE markers only. The first version counted common words and
       got Portuguese wrong: pt and es share "banco", "pedido", "por favor",
       "comprador", "vendedor", so a plainly Portuguese message split its score
       across two languages, fell under the threshold, and defaulted to English.
       A token that appears in more than one candidate language carries no
       signal and is excluded. */
    var MARKERS = {
      pt: /\b(não|você|obrigad\w*|já|muito|dinheiro|desculpa|fiz|meu|minha|estou|também|até|então|paguei|enviei)\b/gi,
      es: /\b(usted|gracias|dinero|ya|mi|estoy|también|hasta|entonces|pagué|envié|hola|igual|sólo|solo)\b/gi,
      en: /\b(the|payment|please|money|already|thanks|sent|my|will|have|and|with|from|this|that)\b/gi,
      fr: /\b(je|vous|merci|argent|déjà|mon|suis|aussi|alors|payé|envoyé|bonjour)\b/gi
    };

    function detect(text) {
      if (!text || text.trim().length < 12) return { lang: DEFAULT, confidence: 0, reason: "too little text" };
      var scores = {};
      Object.keys(MARKERS).forEach(function (l) {
        var m = text.match(MARKERS[l]);
        scores[l] = m ? m.length : 0;
      });
      var ranked = Object.keys(scores).sort(function (a, b) { return scores[b] - scores[a]; });
      var best = ranked[0], runnerUp = ranked[1];
      if (!scores[best]) return { lang: DEFAULT, confidence: 0, reason: "no markers" };

      /* Confidence is measured against the nearest rival, not against the
         total. What matters is whether the winner is clearly ahead of the
         next candidate — summing across all four languages punishes a
         confident answer just because other lists also scored something. */
      var confidence = scores[best] / (scores[best] + scores[runnerUp]);
      if (confidence < THRESHOLD) {
        return { lang: DEFAULT, confidence: confidence, reason: "ambiguous vs " + runnerUp + ", defaulted" };
      }
      return { lang: best, confidence: confidence, reason: "detected" };
    }

    return {
      DEFAULT: DEFAULT,
      THRESHOLD: THRESHOLD,

      /* Resolve one party's language from only that party's messages. */
      forParty: function (messages, who, cacheKey) {
        var key = cacheKey ? cacheKey + ":" + who : null;
        if (key && cache[key] && Date.now() - cache[key].at < CACHE_MS) return cache[key].value;
        var text = (messages || [])
          .filter(function (m) { return m.from === who; })
          .map(function (m) { return m.text; })
          .join(" ");
        var result = detect(text);
        if (key) cache[key] = { at: Date.now(), value: result };
        return result;
      },

      /* Pluggable. The demo ships a tiny phrasebook; a real deployment
         swaps in a translation service without any caller changing. */
      translator: null,

      translate: function (text, target) {
        if (target === DEFAULT || !PL.lang.translator) return Promise.resolve(text);
        return Promise.resolve(PL.lang.translator(text, target));
      },

      /* Emoji, arrows and status dots must survive translation intact —
         they are structural markers in the note format, not decoration. */
      protect: function (text) {
        var kept = [], i = 0;
        var masked = text.replace(/[\u2190-\u21FF\u2600-\u27BF\uFE0F\u{1F300}-\u{1FAFF}]/gu, function (m) {
          kept.push(m); return "\u0000" + (i++) + "\u0000";
        });
        return {
          masked: masked,
          restore: function (s) {
            return s.replace(/\u0000(\d+)\u0000/g, function (_, n) { return kept[+n]; });
          }
        };
      }
    };
  })();

  /* ================================================================
   * marker — verification that survives concurrency.
   *
   * Confirming a save by counting rows or reading the newest row is wrong
   * on any shared queue: a colleague saving on the same case at the same
   * moment produces a false confirmation, and the script reports success
   * for something that never persisted.
   *
   * Instead, every generated note carries a unique marker, and verification
   * searches for that exact marker anywhere in the saved history. It cannot
   * be satisfied by somebody else's write.
   * ================================================================ */

  PL.marker = {
    make: function (prefix) {
      return "[" + (prefix || "ref") + ":" +
        Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + "]";
    },
    present: function (containerSel, mark) {
      var el = PL.dom.qs(containerSel);
      return !!el && el.textContent.indexOf(mark) !== -1;
    }
  };

  /* ================================================================
   * review — the pause before the write that can't be taken back.
   *
   * The chain runner can verify that a save happened. It cannot verify that
   * the saved text was *correct*, and a confidently-executed wrong note is
   * the most expensive thing this toolkit could produce: it is authoritative,
   * it is permanent, and the next person to read the case will believe it.
   *
   * So macros run their whole sequence up to the moment before saving, then
   * stop and show the composed text for editing. The operator adjusts the
   * free-text portion and resumes; the mechanical steps around it still cost
   * nothing.
   *
   * This is the difference between automating the typing and automating the
   * judgement. The gate is where that line is drawn, and it is on by default
   * because the failure it prevents is silent.
   * ================================================================ */

  PL.review = {
    /* Off by default.
     *
     * The gate still exists and everything still routes through it — set
     * PL.review.enabled = true and every save pauses for edit before it is
     * written. It is off because the macro wording is reviewed at the point
     * it is chosen, and pausing on a note the operator did not intend to
     * change turns a confirmation into a reflex.
     *
     * Turn it back on for a new macro, an unfamiliar case type, or anyone
     * still learning the queue. The cost is one keystroke per case; the thing
     * it catches is a confidently-worded wrong note, which is the most
     * expensive artefact this toolkit can produce.
     */
    enabled: false,

    /* Resolves with edited text, or null if the operator abandons. */
    gate: function (title, text, meta) {
      if (!PL.review.enabled) return Promise.resolve(text);
      PL.dom.style("pl-core-css", CSS);

      return new Promise(function (resolve) {
        var ta = PL.dom.el("textarea", { class: "pl-rv-t", spellcheck: "false" });
        ta.value = text;

        var box = PL.dom.el("div", { id: "pl-cf-b", style: "width:min(620px,94vw)" });
        box.appendChild(PL.dom.el("h3", { text: title }));
        (meta || []).forEach(function (m) {
          box.appendChild(PL.dom.el("div", { text: m, style: "font-size:12px;color:#5b616d;margin-bottom:2px" }));
        });
        box.appendChild(ta);
        box.appendChild(PL.dom.el("div", {
          class: "pl-hint",
          text: "Everything mechanical is done. Edit the wording, then save."
        }));

        var ft = PL.dom.el("div", { class: "ft" });
        var ov = PL.dom.el("div", { id: "pl-cf" }, [box]);
        function done(v) { ov.remove(); document.removeEventListener("keydown", k, true); resolve(v); }
        function k(e) {
          if (e.key === "Escape") { e.preventDefault(); done(null); }
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); done(ta.value); }
        }
        ft.appendChild(PL.dom.el("button", { class: "pl-btn", text: "Abandon", onclick: function () { done(null); } }));
        ft.appendChild(PL.dom.el("button", { class: "pl-btn on", text: "Save note (⌘↵)", onclick: function () { done(ta.value); } }));
        box.appendChild(ft);

        document.addEventListener("keydown", k, true);
        document.body.appendChild(ov);
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      });
    }
  };

  /* ================================================================
   * guard — refuse to bind twice.
   *
   * Two installed copies of the same script bind two listeners, and every
   * macro fires twice. Four copies, four times. The symptom looks like the
   * host misbehaving rather than a packaging problem, so it costs hours to
   * diagnose the first time.
   *
   * The usual cause is a filename that no longer matches @name: the extension
   * matches on @name when reinstalling, so a mismatch adds a second copy
   * instead of replacing the first.
   * ================================================================ */

  PL.guard = function (id) {
    var key = "__PL_BOUND_" + id + "__";
    if (global[key]) {
      PL.log("guard", id + " already bound — this copy is standing down");
      return false;
    }
    global[key] = true;
    return true;
  };

  /* Exposed so a human can check for stale installs from the console. */
  PL.instances = global.__PL_INSTANCES__ = global.__PL_INSTANCES__ || {};
  PL.register = function (id, version) {
    (PL.instances[id] = PL.instances[id] || []).push(version);
    if (PL.instances[id].length > 1) {
      PL.log("guard", "multiple versions of " + id + ": " + PL.instances[id].join(", "));
    }
  };

  /* ================================================================
   * requireCore — fail loudly on a load-order mistake.
   *
   * Dependent scripts must not silently degrade when the core hasn't loaded.
   * A language-aware macro that quietly falls back to English because the
   * core wasn't ready sends real messages to real users in the wrong language
   * and nobody notices for weeks. Refusing to run is the correct behaviour.
   *
   * The extension executes in list order, so this is a real hazard, not a
   * theoretical one.
   * ================================================================ */

  PL.requireCore = function (minVersion) {
    var have = PL.version.split(".").map(Number);
    var need = String(minVersion).split(".").map(Number);
    for (var i = 0; i < need.length; i++) {
      if ((have[i] || 0) > (need[i] || 0)) return true;
      if ((have[i] || 0) < (need[i] || 0)) {
        throw new Error(
          "pl-core " + minVersion + " or newer required, found " + PL.version +
          ". Move the core above this script in the extension list, or update it."
        );
      }
    }
    return true;
  };

  /* ================================================================
   * registry + bus — scripts publish, the launcher renders.
   *
   * The alternative is a launcher that imports every macro, which means
   * adding a macro edits two files and the launcher becomes a merge
   * conflict magnet. Here a script pushes its entries and the launcher
   * renders whatever it finds; adding a macro touches one file.
   *
   * Entries de-duplicate on channel + id, which is what stops a duplicate
   * install from producing double entries in the palette.
   * ================================================================ */

  PL.registry = (function () {
    var entries = global.__PL_REGISTRY__ = global.__PL_REGISTRY__ || [];

    return {
      publish: function (entry) {
        var dup = entries.some(function (e) {
          return e.channel === entry.channel && e.id === entry.id;
        });
        if (dup) { PL.log("registry", "duplicate ignored: " + entry.channel + "/" + entry.id); return false; }
        entries.push(entry);
        return true;
      },
      all: function () {
        return entries.slice().sort(function (a, b) {
          return (a.order || 100) - (b.order || 100);
        });
      },
      group: function (name) {
        return PL.registry.all().filter(function (e) { return e.group === name; });
      },
      count: function () { return entries.length; }
    };
  })();

  /* The channel/id pair is a frozen vocabulary: other scripts key behaviour
     off these strings, so renaming one silently breaks a listener elsewhere.
     Treat them as an API, not as labels. */
  PL.bus = {
    emit: function (channel, id, payload) {
      document.dispatchEvent(new CustomEvent("pl:" + channel, {
        detail: { id: id, payload: payload || null }
      }));
    },
    on: function (channel, fn) {
      document.addEventListener("pl:" + channel, function (e) {
        fn(e.detail.id, e.detail.payload);
      });
    }
  };

  /* ================================================================
   * exclusive — one long-running loop at a time.
   *
   * Two watchers polling the same queue fight each other and double the
   * request rate for no benefit. Rather than coordinating, each announces
   * itself on start and the others stand down.
   *
   * No shared state, no lock service, no server — which matters, because a
   * browser userscript has none of those available.
   * ================================================================ */

  PL.exclusive = (function () {
    var stoppers = {};
    document.addEventListener("pl:exclusive-start", function (e) {
      Object.keys(stoppers).forEach(function (name) {
        if (name !== e.detail.name) {
          PL.log("exclusive", name + " standing down for " + e.detail.name);
          stoppers[name]("another loop started");
        }
      });
    });
    return {
      claim: function (name, stopFn) {
        stoppers[name] = stopFn;
        document.dispatchEvent(new CustomEvent("pl:exclusive-start", { detail: { name: name } }));
      },
      release: function (name) { delete stoppers[name]; }
    };
  })();

  /* ================================================================
   * abort — a stop signal that cannot become an alert.
   *
   * When the operator cancels at a review gate, the chain must unwind
   * silently. But generic error handling further up (`catch (e) { alert(
   * e.message) }`) will happily surface a cancellation as a scary dialog.
   *
   * Reading .message or stringifying this object re-throws it, so any
   * handler that tries to display it propagates instead. Blunt, and it
   * works across sandbox realms where patching window.alert does not.
   * ================================================================ */

  PL.abort = function (reason) {
    var stop = { __plAbort: true, reason: reason || "aborted" };
    Object.defineProperty(stop, "message", { get: function () { throw stop; } });
    stop.toString = function () { throw stop; };
    return stop;
  };

  PL.isAbort = function (e) { return !!(e && e.__plAbort); };

  /* ================================================================
   * ui — one docked panel, shared sections.
   * ================================================================ */

  var CSS = [
    /* ---- left dock: one button per script, stacked ---------------------- */
    /* Bottom-left, pills. Anchored to a corner rather than floating mid-edge
       so the dock never sits over table rows or the row the operator is
       reading; the bottom-left corner is the emptiest region of a list view
       and of a two-column detail view alike. */
    "#pl-dock{position:fixed;left:12px;bottom:12px;z-index:9000;display:flex;flex-direction:column-reverse;",
    "align-items:flex-start;gap:6px;font:12.5px/1.3 system-ui,-apple-system,sans-serif}",
    /* Deliberately not the host application's palette. These controls were
       added on top of somebody else's product, and an operator should never
       have to wonder whether a button is the platform's or a script's — most
       of all when something goes wrong and they need to say which. */
    "#pl-dock .pl-b{display:inline-flex;align-items:center;gap:7px;padding:7px 14px;",
    "border:1px solid #e3c766;border-radius:999px;background:#fff6d9;color:#5c4406;",
    "cursor:pointer;font:inherit;text-align:left;box-shadow:0 2px 8px rgba(0,0,0,.12);white-space:nowrap}",
    "#pl-dock .pl-b:hover{background:#ffefbe;border-color:#cfa825}",
    "#pl-dock .pl-b:disabled{opacity:.4;cursor:default;box-shadow:none}",
    "#pl-dock .pl-b.off{opacity:.5;background:#f4f5f6;box-shadow:none}",
    "#pl-dock .pl-b.off:hover{background:#f4f5f6;border-color:#cfd4da}",
    "#pl-dock .pl-b .dot{width:7px;height:7px;border-radius:50%;background:#c3c8cf;flex:0 0 auto}",
    "#pl-dock .pl-b.on{background:#c99a12;border-color:#b98d0c;color:#2b2100;font-weight:700}",
    "#pl-dock .pl-b.on .dot{background:#7fd4a8}",
    "#pl-dock .pl-b.warn{border-color:#d9b98a;background:#fdf6ea}",
    "#pl-dock .pl-b.warn .dot{background:#c98a2e}",
    "#pl-dock .pl-b.open{border-color:#c99a12;box-shadow:0 2px 10px rgba(201,154,18,.35)}",
    "#pl-dock .pl-tag{font-size:9px;letter-spacing:.11em;text-transform:uppercase;color:#e8ac00;",
    "padding:0 0 2px 14px;font-weight:650;user-select:none;order:99}",
    "#pl-dock .pl-b .bd{font-family:ui-monospace,Menlo,monospace;font-size:11px;padding:0 6px;",
    "border-radius:999px;background:#f2dfa0;color:#5c4406}",
    "#pl-dock .pl-b.on .bd{background:rgba(255,255,255,.22);color:#fff}",
    "#pl-dock .pl-b.warn .bd{background:#f0dcbc;color:#8a5a10}",
    /* ---- popover anchored to a button ----------------------------------- */
    "#pl-pop{position:fixed;z-index:9100;width:352px;overflow-y:auto;background:#fff;",
    "border:1px solid #e3c766;border-radius:4px;box-shadow:0 8px 26px rgba(0,0,0,.16);",
    "font:13px/1.45 system-ui,-apple-system,sans-serif;color:#1b1d22}",
    "#pl-pop-h{display:flex;align-items:center;gap:8px;padding:8px 11px;background:#5c4406;color:#ffe9a8;",
    "border-radius:4px 4px 0 0;position:sticky;top:0}",
    "#pl-pop-h b{font-size:11px;letter-spacing:.06em;text-transform:uppercase}",
    "#pl-pop-h .sp{flex:1}",
    "#pl-pop-h .r{font-family:ui-monospace,Menlo,monospace;font-size:11px;opacity:.75}",
    "#pl-pop-h button{background:none;border:0;color:#fff;cursor:pointer;font-size:15px;line-height:1;padding:0 2px}",
    "#pl-pop-b{padding:11px 13px}",
    /* ---- shared content bits -------------------------------------------- */
    ".pl-row{display:flex;justify-content:space-between;gap:9px;padding:2px 0;font-size:12px}",
    ".pl-row{align-items:baseline}",
    ".pl-row .k{color:#8d939e;flex:0 0 auto}",
    ".pl-row .v{font-family:ui-monospace,Menlo,monospace;text-align:right;overflow-wrap:anywhere;min-width:0}",
    ".pl-sub{margin:11px 0 6px;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:#5b616d;font-weight:650}",
    ".pl-flag{border-left:3px solid #8a5a10;background:#fcf3e2;padding:6px 8px;margin-bottom:6px;cursor:pointer}",
    ".pl-flag .t{font-weight:650;font-size:11.5px;color:#8a5a10}",
    ".pl-flag .q{font-size:11.5px;color:#5b616d;margin-top:2px;font-style:italic;overflow-wrap:anywhere}",
    ".pl-flag .w{font-size:11px;color:#8d939e;margin-top:3px}",
    ".pl-none{color:#8d939e;font-size:12px}",
    ".pl-btn{font:inherit;font-size:12px;padding:5px 9px;border:1px solid #dcdfe4;background:#fff;border-radius:2px;cursor:pointer;margin:0 5px 5px 0}",
    ".pl-btn:hover{border-color:#cfa825}.pl-btn.on{background:#c99a12;border-color:#b98d0c;color:#2b2100}",
    ".pl-btn:disabled{opacity:.45;cursor:default}",
    ".pl-acts{margin-top:9px;padding-top:9px;border-top:1px solid #eaecef;display:flex;flex-wrap:wrap}",
    ".pl-out{width:100%;min-height:130px;font:11.5px/1.5 ui-monospace,Menlo,monospace;border:1px solid #dcdfe4;padding:7px;resize:vertical;margin-top:7px}",
    ".pl-hint{font-size:11px;color:#8d939e;margin-top:5px}",
    ".pl-quote{font-size:11.5px;color:#5b616d;border-left:2px solid #dcdfe4;padding-left:7px;margin:3px 0}",
    ".pl-step{display:flex;gap:7px;align-items:baseline;font-size:11.5px;padding:2px 0}",
    ".pl-step .ic{width:13px;text-align:center;font-family:ui-monospace,Menlo,monospace}",
    ".pl-step.done .ic{color:#1d6949}.pl-step.failed .ic{color:#8f2f2c}",
    ".pl-step.running .ic{color:#8a5a10}.pl-step.pending{color:#8d939e}",
    ".pl-step.declined .ic{color:#8d939e}",
    ".pl-warn{border-left:3px solid #8f2f2c;background:#fbecea;padding:6px 8px;margin-top:7px;font-size:11.5px;color:#8f2f2c}",
    ".pl-okbox{border-left:3px solid #1d6949;background:#e7f2ed;padding:6px 8px;margin-top:7px;font-size:11.5px;color:#1d6949}",
    ".pl-pre{border-left:3px solid #8a5a10;background:#fcf3e2;padding:6px 8px;margin-top:7px;font-size:11.5px;color:#8a5a10}",
    ".pl-lang{display:inline-block;font-size:10px;font-family:ui-monospace,Menlo,monospace;background:#fff6d9;color:#5c4406;padding:1px 5px;border-radius:2px;margin-left:5px}",
    ".pl-lang.low{background:#fcf3e2;color:#8a5a10}",
    ".pl-matrix{font-size:11px;color:#8d939e;font-family:ui-monospace,Menlo,monospace;margin-top:5px}",
    ".pl-dot{width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:5px}",
    ".pl-dot.on{background:#1d6949}.pl-dot.off{background:#8d939e}",
    /* ---- overlay palette -------------------------------------------------- */
    "#pl-ov{position:fixed;inset:0;background:rgba(15,17,20,.42);z-index:9500;display:flex;align-items:flex-start;justify-content:center;padding-top:11vh}",
    "#pl-ov-box{background:#fff;width:min(680px,94vw);border-radius:3px;box-shadow:0 18px 50px rgba(0,0,0,.3);overflow:hidden;",
    "font:13px/1.45 system-ui,-apple-system,sans-serif}",
    "#pl-ov-in{width:100%;border:0;border-bottom:1px solid #dcdfe4;padding:13px 15px;font:15px system-ui;outline:none}",
    "#pl-ov-list{max-height:52vh;overflow-y:auto}",
    ".pl-ov-i{padding:11px 16px;border-bottom:1px solid #eaecef;cursor:pointer;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}",
    ".pl-ov-i.sel{background:#e8f0f2}",
    ".pl-ov-i .nm{font-weight:650;font-size:14px;letter-spacing:-.01em;flex:1;min-width:0}",
    ".pl-ov-i.sel .nm{color:#16404e}",
    ".pl-ov-i .code{margin-left:auto;font-size:10.5px;font-weight:650;letter-spacing:.06em;",
    "font-family:ui-monospace,Menlo,monospace;color:#5b616d;background:#eceef1;",
    "padding:2px 7px;border-radius:3px;flex:0 0 auto}",
    ".pl-ov-i.sel .code{background:#c99a12;color:#2b2100}",
    ".pl-ov-i .pv{font-size:11.5px;color:#8d939e;margin-top:3px;display:block;width:100%}",
    "#pl-ov-foot{padding:8px 15px;font-size:11px;color:#8d939e;background:#f8f9fa;display:flex;gap:14px}",
    /* ---- confirm / review ------------------------------------------------- */
    "#pl-cf{position:fixed;inset:0;background:rgba(15,17,20,.45);z-index:9700;display:flex;align-items:center;justify-content:center}",
    "#pl-cf-b{background:#fff;width:min(460px,92vw);border-radius:3px;padding:18px;font:13px/1.5 system-ui,-apple-system,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.3)}",
    "#pl-cf-b h3{margin:0 0 8px;font-size:14px}",
    "#pl-cf-b .ft{margin-top:14px;display:flex;gap:7px;justify-content:flex-end}",
    ".pl-rv-t{width:100%;min-height:190px;font:12px/1.55 ui-monospace,Menlo,monospace;border:1px solid #dcdfe4;padding:9px;margin-top:10px;resize:vertical}",
    /* ---- spotlight on the element being acted upon ------------------------ */
    ".pl-touch{outline:3px solid #e8ac00 !important;outline-offset:2px !important;",
    "border-radius:3px;box-shadow:0 0 0 5px rgba(232,172,0,.22) !important;",
    "transition:outline-color .15s ease,box-shadow .15s ease;position:relative;z-index:5}",
    /* ---- run tracker ------------------------------------------------------ */
    "#pl-run{position:fixed;left:12px;bottom:64px;z-index:9400;width:330px;background:#fff;",
    "border:1px solid #e3c766;border-radius:6px;box-shadow:0 6px 26px rgba(0,0,0,.18);overflow:hidden;",
    "font:13px/1.4 system-ui,-apple-system,sans-serif;color:#1b1d22;transition:opacity .5s ease}",
    "#pl-run.fade{opacity:0}",
    "#pl-run.ok{border-color:#9ecdb6}#pl-run.bad{border-color:#dcaaa7}",
    ".pl-run-h{display:flex;align-items:center;gap:8px;padding:9px 12px;background:#5c4406;color:#ffe9a8}",
    ".pl-run-h .sp2{flex:1;font-size:11px;letter-spacing:.05em;text-transform:uppercase;font-weight:650}",
    ".pl-run-h .cnt{font-family:ui-monospace,Menlo,monospace;font-size:11px;opacity:.8}",
    ".pl-run-list{padding:6px 0}",
    ".pl-run-step{display:flex;align-items:baseline;gap:9px;padding:6px 13px;font-size:12.5px;",
    "transition:background .25s ease,color .25s ease}",
    ".pl-run-step .ic{width:14px;text-align:center;font-family:ui-monospace,Menlo,monospace;flex:0 0 auto}",
    ".pl-run-step .nm{flex:1;min-width:0}",
    ".pl-run-step .dt{font-size:10.5px;color:#8d939e;font-family:ui-monospace,Menlo,monospace}",
    ".pl-run-step.pending{color:#a6acb5}",
    ".pl-run-step.running{background:#fdf6ea;color:#8a5a10;font-weight:600}",
    ".pl-run-step.running .ic{color:#c98a2e}",
    ".pl-run-step.done{color:#1b1d22}.pl-run-step.done .ic{color:#1d6949}",
    ".pl-run-step.failed{background:#fbecea;color:#8f2f2c;font-weight:600}",
    ".pl-run-step.skipped{color:#a6acb5}",
    ".pl-run-f{display:none;padding:9px 13px;border-top:1px solid #eaecef;font-size:12px;color:#5b616d;background:#fafbfc}",
    "#pl-run.ok .pl-run-f{color:#1d6949}#pl-run.bad .pl-run-f{color:#8f2f2c}",
    /* ---- toast ------------------------------------------------------------ */
    "#pl-toasts{position:fixed;left:14px;bottom:14px;z-index:9600;display:flex;flex-direction:column;gap:6px}",
    ".pl-toast{background:#5c4406;color:#ffe9a8;padding:7px 12px;border-radius:2px;font:12.5px system-ui;max-width:320px}"
  ].join("");

  /* ================================================================
   * ui — a left-edge dock of independent buttons.
   *
   * Each script owns ONE button. Buttons appear only on the pages where
   * they apply, carry their own state (a badge, an on/off dot), and open
   * their output in a popover anchored beside them.
   *
   * Why buttons rather than one panel: a panel is a single surface that
   * every script has to share, so installing one script means accepting
   * everyone's UI. A button per script keeps them independent — install
   * three of the seven and you get three buttons.
   *
   * Why the left edge: it is the only screen region a dense data table
   * does not use, so nothing overlaps content the operator is reading.
   * ================================================================ */

  PL.ui = {
    _buttons: {},
    _openId: null,

    dock: function () {
      var d = document.getElementById("pl-dock");
      if (d) return d;
      PL.dom.style("pl-core-css", CSS);
      d = PL.dom.el("div", { id: "pl-dock" });
      d.appendChild(PL.dom.el("div", { class: "pl-tag", text: "toolkit " + PL.version }));
      document.body.appendChild(d);

      /* Close the popover on outside click or Escape. */
      document.addEventListener("mousedown", function (e) {
        var pop = document.getElementById("pl-pop");
        if (!pop) return;

        /* Only a real click dismisses. Every synthetic event the toolkit
           dispatches at the host page — a chain clicking Send, or Save, or a
           deadline button — would otherwise read as "the user clicked away",
           and the popover would vanish mid-run taking the step log with it.
           isTrusted is false for anything dispatched from script, which is
           exactly the distinction needed. */
        if (e.isTrusted === false) return;
        /* The toolkit's own overlays — palette, confirm, review gate, toasts —
           are not "outside". Treating them as outside closed the popover the
           moment a palette opened, so the operator lost the step log for the
           run they had just started. */
        if (pop.contains(e.target) ||
            e.target.closest("#pl-dock, #pl-ov, #pl-cf, #pl-toasts")) return;
        PL.ui.closePopover();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && document.getElementById("pl-pop")) PL.ui.closePopover();
      });

      /* Badges and page-scoping have to track the page, not just navigation.
         Claiming a case from the pool changes neither the view nor the open
         case, so a watcher keyed on those would leave a stale count on screen —
         and a stale count on a button is worse than no count, because it is
         believed. Debounced so a burst of mutations costs one pass. */
      var t = null;
      new MutationObserver(function (records) {
        /* Ignore mutations the toolkit itself caused. refresh() writes badge
           text and title attributes, which are mutations, which would trigger
           refresh again — a loop that spins forever at one pass per debounce
           and is invisible except as battery drain. */
        var external = records.some(function (r) {
          var n = r.target;
          if (!n) return false;
          if (n.nodeType !== 1) n = n.parentElement;
          if (!n) return false;
          return !n.closest("#pl-dock, #pl-pop, #pl-ov, #pl-cf, #pl-toasts");
        });
        if (!external) return;
        clearTimeout(t);
        t = setTimeout(function () { PL.ui.refresh(); }, 140);
      }).observe(document.body, { childList: true, subtree: true, attributes: true });

      return d;
    },

    /*
     * spec = {
     *   id, label,
     *   pages:   ["case"] | ["queue","pool"] | "*"   which views it shows on
     *   variant: "warn"                              optional colour
     *   toggle:  true                                renders an on/off dot
     *   badge:   function -> string|null             optional count
     *   render:  function (body) {}                  popover content
     *   onClick: function () {}                      instead of a popover
     *   title:   popover heading (defaults to label)
     * }
     */
    button: function (spec) {
      PL.ui.dock();
      if (PL.ui._buttons[spec.id]) return PL.ui._buttons[spec.id];

      var el = PL.dom.el("button", { class: "pl-b", "data-pl-button": spec.id, type: "button" });
      if (spec.toggle) el.appendChild(PL.dom.el("span", { class: "dot" }));
      el.appendChild(PL.dom.el("span", { class: "lb", text: spec.label }));
      var badge = PL.dom.el("span", { class: "bd" });
      badge.style.display = "none";
      el.appendChild(badge);

      el.addEventListener("click", function () {
        /* A disabled button explains itself rather than doing nothing. A
           control that silently ignores a click reads as broken, and the
           operator retries instead of reading. */
        var why = spec.disabled ? spec.disabled() : null;
        if (why) { PL.ui.toast(why); return; }
        if (spec.onClick) { spec.onClick(); PL.ui.refresh(); return; }
        PL.ui.togglePopover(spec);
      });
      if (spec.hotkey) el.title = spec.label + "  (" + spec.hotkey + ")";

      document.getElementById("pl-dock").appendChild(el);
      var rec = { spec: spec, el: el, badge: badge };
      PL.ui._buttons[spec.id] = rec;
      PL.ui.refresh();
      return rec;
    },

    /* Visibility + badges are recomputed on every view change rather than
       cached, because the page decides what applies, not the script. */
    refresh: function () {
      var view = PL.adapter.view();
      Object.keys(PL.ui._buttons).forEach(function (id) {
        var rec = PL.ui._buttons[id], spec = rec.spec;
        var applies = spec.pages === "*" || (spec.pages || []).indexOf(view) !== -1;
        rec.el.style.display = applies ? "" : "none";

        if (!applies) {
          if (PL.ui._openId === id) PL.ui.closePopover();
          return;
        }
        var why = spec.disabled ? spec.disabled() : null;
        rec.el.classList.toggle("off", !!why);

        var title = why || (spec.hotkey ? spec.label + "  (" + spec.hotkey + ")" : spec.label);
        if (rec.el.title !== title) rec.el.title = title;

        var b = why ? null : (spec.badge ? spec.badge() : null);
        var txt = b == null ? "" : String(b);
        if (rec.badge.textContent !== txt) rec.badge.textContent = txt;
        var disp = b == null ? "none" : "";
        if (rec.badge.style.display !== disp) rec.badge.style.display = disp;
        if (spec.variant) rec.el.classList.toggle(spec.variant, !why);
        rec.el.classList.toggle("open", PL.ui._openId === id);
        if (why && PL.ui._openId === id) PL.ui.closePopover();
      });

    },

    /* Deliberately separate from refresh().
       refresh() runs on every DOM mutation, and re-rendering the open popover
       that often would destroy whatever the operator is typing into it — the
       composer and the review gate both hold live text. Content redraws are
       driven by the scripts, on case change only. */
    refreshContent: function () {
      if (!PL.ui._openId) return;
      var open = PL.ui._buttons[PL.ui._openId];
      var body = document.getElementById("pl-pop-b");
      if (open && body && open.spec.render) {
        PL.ui.clear(body);
        open.spec.render(body);
        PL.ui.reflow();
      }
    },

    setState: function (id, on) {
      var rec = PL.ui._buttons[id];
      if (rec) rec.el.classList.toggle("on", !!on);
    },

    togglePopover: function (spec) {
      if (PL.ui._openId === spec.id) { PL.ui.closePopover(); return; }
      PL.ui.closePopover();
      PL.ui._openId = spec.id;

      var rec = PL.ui._buttons[spec.id];
      var r = rec.el.getBoundingClientRect();

      var head = PL.dom.el("div", { id: "pl-pop-h" }, [
        PL.dom.el("b", { text: spec.title || spec.label }),
        PL.dom.el("span", { class: "sp" }),
        PL.dom.el("span", { class: "r" }),
        PL.dom.el("button", { text: "\u00d7", title: "Close (Esc)", onclick: function () { PL.ui.closePopover(); } })
      ]);
      var body = PL.dom.el("div", { id: "pl-pop-b" });
      var pop = PL.dom.el("div", { id: "pl-pop" }, [head, body]);

      /* Position AFTER the content is in.
         Measuring an empty popover and then filling it was the cause of the
         bottom being cut off: height came back near zero, the box was placed
         just above the button, and the real content then ran off the screen.
         Render, measure, place. */
      pop.style.visibility = "hidden";
      document.body.appendChild(pop);

      body.setHeaderRight = function (t) { head.querySelector(".r").textContent = t; };
      if (spec.render) spec.render(body);

      PL.ui.place(pop, rec.el);
      pop.style.visibility = "";

      PL.ui.refresh();
    },

    /* Keep a popover fully on screen. Content can change height after it
       opens — a chain adds steps, a scan finds flags — so this is callable
       again rather than only at open time. */
    place: function (pop, anchor) {
      if (!pop || !anchor) return;
      var r = anchor.getBoundingClientRect();
      var vh = global.innerHeight || 800;
      var vw = global.innerWidth || 1200;
      var margin = 10;

      pop.style.maxHeight = Math.max(180, vh - margin * 2) + "px";
      var h = pop.offsetHeight || 320;
      var wdt = pop.offsetWidth || 340;

      /* Prefer above the button; fall back to below if there is more room. */
      var above = r.top - h - 8;
      var top = above >= margin ? above : Math.min(r.bottom + 8, vh - h - margin);
      pop.style.top = Math.max(margin, Math.min(top, vh - h - margin)) + "px";
      pop.style.left = Math.max(margin, Math.min(r.left, vw - wdt - margin)) + "px";
    },

    /* Called by scripts after they redraw a popover whose height changed. */
    reflow: function () {
      var pop = document.getElementById("pl-pop");
      var rec = PL.ui._openId && PL.ui._buttons[PL.ui._openId];
      if (pop && rec) PL.ui.place(pop, rec.el);
    },

    closePopover: function () {
      var p = document.getElementById("pl-pop");
      if (p) p.remove();
      PL.ui._openId = null;
      Object.keys(PL.ui._buttons).forEach(function (id) {
        PL.ui._buttons[id].el.classList.remove("open");
      });
    },

    /* The body element of the currently open popover, or null. Scripts use
       this to redraw themselves while the operator is looking at them. */
    liveBody: function (id) {
      return PL.ui._openId === id ? document.getElementById("pl-pop-b") : null;
    },

    rows: function (pairs) {
      return pairs.map(function (p) {
        return PL.dom.el("div", { class: "pl-row" }, [
          PL.dom.el("span", { class: "k", text: p[0] }),
          PL.dom.el("span", { class: "v", text: p[1] })
        ]);
      });
    },
    sub: function (t) { return PL.dom.el("div", { class: "pl-sub", text: t }); },
    clear: function (n) { while (n && n.firstChild) n.removeChild(n.firstChild); },

    toast: function (t) {
      PL.dom.style("pl-core-css", CSS);
      var stack = document.getElementById("pl-toasts");
      if (!stack) { stack = PL.dom.el("div", { id: "pl-toasts" }); document.body.appendChild(stack); }
      var el = PL.dom.el("div", { class: "pl-toast", text: t });
      stack.appendChild(el);
      setTimeout(function () { el.remove(); }, 3200);
    },

    /* ================================================================
     * runPanel — the sequence, visible while it happens.
     *
     * A macro performs four or five real actions in a row. If the only
     * evidence is the page changing underneath, the operator cannot tell
     * what ran, what is still running, or where it stopped — and neither
     * can anyone watching a recording of it.
     *
     * So every step is listed before the run starts, and each one visibly
     * moves pending → running → done. On success the panel lingers briefly
     * and fades; on failure it stays until dismissed, because a failure is
     * the one case somebody needs to read.
     * ================================================================ */
    runPanel: function (title, steps) {
      PL.dom.style("pl-core-css", CSS);
      var old = document.getElementById("pl-run");
      if (old) old.remove();

      var rows = {};
      var list = PL.dom.el("div", { class: "pl-run-list" });

      steps.forEach(function (name, i) {
        var row = PL.dom.el("div", { class: "pl-run-step pending" }, [
          PL.dom.el("span", { class: "ic", text: "\u25cb" }),
          PL.dom.el("span", { class: "nm", text: name })
        ]);
        rows[i] = row;
        list.appendChild(row);
      });

      var head = PL.dom.el("div", { class: "pl-run-h" }, [
        PL.dom.el("span", { class: "sp2", text: title }),
        PL.dom.el("span", { class: "cnt", text: "0/" + steps.length })
      ]);
      var foot = PL.dom.el("div", { class: "pl-run-f" });
      var panel = PL.dom.el("div", { id: "pl-run" }, [head, list, foot]);
      document.body.appendChild(panel);

      var api = {
        step: function (i, state, detail) {
          var row = rows[i];
          if (!row) return;
          row.className = "pl-run-step " + state;
          row.querySelector(".ic").textContent =
            { pending: "\u25cb", running: "\u25d0", done: "\u2713", failed: "\u2715", skipped: "\u2013" }[state] || "\u25cb";
          if (detail) {
            var d = row.querySelector(".dt") || PL.dom.el("span", { class: "dt" });
            d.textContent = detail;
            if (!row.contains(d)) row.appendChild(d);
          }
          /* Count the rows, don't tally the calls. onProgress reports the
             whole log on every tick, so incrementing here counted the same
             completed step once per remaining step — the header read 12/4
             on a four-step macro. */
          var done = list.querySelectorAll(".pl-run-step.done").length;
          head.querySelector(".cnt").textContent = done + "/" + steps.length;
        },
        finish: function (ok, message) {
          panel.classList.add(ok ? "ok" : "bad");
          foot.textContent = message || (ok ? "Complete." : "Stopped.");
          foot.style.display = "block";
          if (ok) {
            setTimeout(function () { panel.classList.add("fade"); }, 2600);
            setTimeout(function () { if (panel.parentNode) panel.remove(); }, 3400);
          } else {
            var x = PL.dom.el("button", { class: "pl-btn", text: "Dismiss",
              onclick: function () { panel.remove(); } });
            foot.appendChild(PL.dom.el("div", {}, [x]));
          }
        },
        close: function () { if (panel.parentNode) panel.remove(); }
      };
      return api;
    },

    confirm: function (title, lines) {
      PL.dom.style("pl-core-css", CSS);
      return new Promise(function (resolve) {
        var box = PL.dom.el("div", { id: "pl-cf-b" });
        box.appendChild(PL.dom.el("h3", { text: title }));
        (lines || []).forEach(function (l) {
          box.appendChild(PL.dom.el("div", { text: l, style: "font-size:12.5px;color:#5b616d;margin-bottom:3px" }));
        });
        var ft = PL.dom.el("div", { class: "ft" });
        var ov = PL.dom.el("div", { id: "pl-cf" }, [box]);
        function done(v) { ov.remove(); document.removeEventListener("keydown", k, true); resolve(v); }
        function k(e) {
          if (e.key === "Escape") { e.preventDefault(); done(false); }
          if (e.key === "Enter") { e.preventDefault(); done(true); }
        }
        ft.appendChild(PL.dom.el("button", { class: "pl-btn", text: "Cancel", onclick: function () { done(false); } }));
        ft.appendChild(PL.dom.el("button", { class: "pl-btn on", text: "Confirm", onclick: function () { done(true); } }));
        box.appendChild(ft);
        document.addEventListener("keydown", k, true);
        document.body.appendChild(ov);
      });
    }
  };

  /* ================================================================
   * overlay — keyboard-first filter list.
   *
   * Items: { name, preview, tags:[], run:fn }
   * ================================================================ */

  PL.overlay = function (opts) {
    var items = opts.items || [];
    var placeholder = opts.placeholder || "Search";
    var footer = opts.footer || "";
    var sel = 0, filtered = items.slice();

    PL.dom.style("pl-core-css", CSS);

    var input = PL.dom.el("input", { id: "pl-ov-in", placeholder: placeholder, autocomplete: "off", spellcheck: "false" });
    var list = PL.dom.el("div", { id: "pl-ov-list" });
    var box = PL.dom.el("div", { id: "pl-ov-box" }, [
      input, list, PL.dom.el("div", { id: "pl-ov-foot" }, [
        PL.dom.el("span", { text: "\u2191\u2193 move" }),
        PL.dom.el("span", { text: "\u21b5 insert" }),
        PL.dom.el("span", { text: "esc close" }),
        PL.dom.el("span", { text: footer })
      ])
    ]);
    var ov = PL.dom.el("div", { id: "pl-ov" }, [box]);

    function score(item, q) {
      if (!q) return 0;
      var hay = (item.name + " " + (item.tags || []).join(" ")).toLowerCase();
      var qi = 0;
      for (var i = 0; i < hay.length && qi < q.length; i++) if (hay[i] === q[qi]) qi++;
      return qi === q.length ? hay.indexOf(q) === -1 ? 2 : 1 : -1;
    }

    function draw() {
      list.innerHTML = "";
      if (!filtered.length) {
        list.appendChild(PL.dom.el("div", { class: "pl-ov-i", html: '<span class="pv">No match.</span>' }));
        return;
      }
      filtered.forEach(function (it, i) {
        /* The macro's name is what the operator is looking for, so it leads
           and is the largest thing in the row. The type code is a filing
           reference, useful for filtering and useless for recognition, so it
           sits right-aligned as a chip rather than in front of the name. */
        var row = PL.dom.el("div", { class: "pl-ov-i" + (i === sel ? " sel" : "") }, [
          PL.dom.el("span", { class: "nm", text: it.name }),
          PL.dom.el("span", { class: "code", text: it.meta || "" }),
          PL.dom.el("span", { class: "pv", text: it.preview || "" })
        ]);
        row.addEventListener("click", function () { choose(i); });
        list.appendChild(row);
      });
      var s = list.children[sel];
      if (s && s.scrollIntoView) s.scrollIntoView({ block: "nearest" });
    }

    function filter() {
      var q = input.value.trim().toLowerCase();
      filtered = !q ? items.slice() : items
        .map(function (it) { return { it: it, s: score(it, q) }; })
        .filter(function (x) { return x.s >= 0; })
        .sort(function (a, b) { return a.s - b.s; })
        .map(function (x) { return x.it; });
      sel = 0;
      draw();
    }

    function close() { ov.remove(); document.removeEventListener("keydown", key, true); }
    function choose(i) { var it = filtered[i]; close(); if (it && it.run) it.run(); }

    function key(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, filtered.length - 1); draw(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); draw(); }
      else if (e.key === "Enter") { e.preventDefault(); choose(sel); }
    }

    input.addEventListener("input", filter);
    document.addEventListener("keydown", key, true);
    ov.addEventListener("mousedown", function (e) { if (e.target === ov) close(); });

    document.body.appendChild(ov);
    input.focus();
    draw();
    return { close: close };
  };

  /* ================================================================
   * hotkeys — one listener for the whole toolkit.
   * ================================================================ */

  PL.hotkeys = (function () {
    var map = {}, attached = false;
    function norm(e) {
      var p = [];
      if (e.altKey) p.push("alt");
      if (e.ctrlKey) p.push("ctrl");
      if (e.metaKey) p.push("meta");
      if (e.shiftKey) p.push("shift");
      p.push(String(e.key).toLowerCase());
      return p.join("+");
    }
    function attach() {
      if (attached) return;
      attached = true;
      document.addEventListener("keydown", function (e) {
        var t = (e.target.tagName || "").toLowerCase();
        var typing = t === "input" || t === "textarea" || e.target.isContentEditable;
        var combo = norm(e);
        var fn = map[combo];
        if (!fn) return;
        // Modifier-bearing shortcuts still work while typing; bare keys do not.
        if (typing && !(e.altKey || e.ctrlKey || e.metaKey)) return;
        e.preventDefault();
        fn(e);
      }, true);
    }
    return {
      bind: function (c, fn) { map[c.toLowerCase()] = fn; attach(); },
      list: function () { return Object.keys(map); }
    };
  })();

  /* ================================================================
   * template — strict tokens, loud failure.
   *
   * An unresolved token throws rather than rendering "Dear {{name}}" into
   * a message an operator then sends to a real person.
   * ================================================================ */

  PL.template = {
    render: function (tpl, vars) {
      return tpl.replace(/\{\{(\w+)\}\}/g, function (_, k) {
        if (!(k in vars) || vars[k] === undefined || vars[k] === null || vars[k] === "") {
          throw new Error("missing token: " + k);
        }
        return vars[k];
      });
    },
    tokens: function (tpl) {
      var out = [], m, re = /\{\{(\w+)\}\}/g;
      while ((m = re.exec(tpl))) if (out.indexOf(m[1]) === -1) out.push(m[1]);
      return out;
    }
  };

  /* ================================================================
   * insert — write into a host textarea without breaking its framework.
   * ================================================================ */

  PL.insert = function (field, text, mode) {
    if (!field) return false;
    var setter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(field), "value"
    );
    var next = mode === "append" && field.value.trim() ? field.value.replace(/\s*$/, "") + "\n\n" + text : text;
    if (setter && setter.set) setter.set.call(field, next);
    else field.value = next;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    field.focus();
    return true;
  };

  PL.clipboard = {
    copy: function (t) {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
      var ta = document.createElement("textarea");
      ta.value = t; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
      return Promise.resolve();
    }
  };

  PL.log = function (s, m) { if (global.PL_DEBUG) console.log("[pl:" + s + "] " + m); };

  /* An uncaught error in a userscript is invisible — no banner, no toast,
     the button simply never appears and the operator assumes the toolkit is
     broken with no way to say how. Surface it on the page once. */
  (function () {
    if (global.__PL_ERR_HOOK__) return;
    global.__PL_ERR_HOOK__ = true;
    global.addEventListener("error", function (e) {
      if (!e || !e.message || document.getElementById("pl-runtime-error")) return;
      if (PL.isAbort && PL.isAbort(e.error)) return;
      var bar = document.createElement("div");
      bar.id = "pl-runtime-error";
      bar.textContent = "PeerLedger toolkit error: " + e.message +
        "  —  see the console for the stack.";
      bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:#8f2f2c;" +
        "color:#fff;padding:8px 14px;font:12.5px system-ui,sans-serif;text-align:center";
      (document.body || document.documentElement).appendChild(bar);
    });
  })();

  global.PL = PL;
})(typeof unsafeWindow !== "undefined" ? unsafeWindow : window);


/* ---- queue-auto-claim ---- */
try {

/*
 * THE PROBLEM
 *
 * Between finishing one case and starting the next, an operator sits on the
 * pool page pressing refresh. It is a few seconds each time and it happens a
 * hundred and sixty times a day, but the real cost isn't the seconds — it's
 * that the gap is dead attention. You can't start anything in it, so you check
 * a message instead, and then the case that arrives gets a colder read.
 *
 * WHAT THIS DOES
 *
 * Polls the pool, claims the oldest waiting case, and stops.
 *
 * WHERE THE ENGINEERING ACTUALLY IS
 *
 * Writing "click the button every five seconds" takes two minutes. What makes
 * the difference between that and something you can leave running for a shift:
 *
 *   Backoff. An empty pool is polled progressively less often (5s → 60s).
 *     A fixed interval against an empty queue is just noise against someone
 *     else's server.
 *
 *   A hard stop. After a run of empty cycles it stops entirely rather than
 *     hammering all night from a forgotten tab. Overnight polling from a tab
 *     nobody is watching is how a helpful script becomes an incident.
 *
 *   One at a time. It claims a single case and disarms. A script that keeps
 *     claiming while you are mid-case builds you a private backlog that your
 *     colleagues can't see and can't pick up.
 *
 *   No overlap. A cycle cannot start while the previous one is in flight.
 *
 * All four live in PL.poll, so the next polling script inherits them for free.
 * That is the actual payoff of a shared core: the second script is where the
 * first one's scar tissue stops being rework.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not choose which case looks easiest. It takes the oldest waiting
 * item, the same one the operator would have taken, because a script that
 * cherry-picks quietly reshapes what the rest of the team is left holding.
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

  if (!PL.guard("queue-auto-claim")) return;
  PL.requireCore("6.1.0");
  PL.register("queue-auto-claim", "3.0.0");

  var poller = null;
  var armed = false;

  function onQueue() { return PL.adapter.view() === "queue"; }

  /* The operator presses this from wherever they are — usually the appeal
     they have just finished. Requiring them to navigate to the list first
     would put the manual step back in front of the automation whose whole
     job is removing it. */
  function attempt() {
    var arrive = onQueue()
      ? Promise.resolve()
      : (function () {
          location.hash = "#/queue";
          return PL.waitFor(onQueue, { label: "task pool", timeoutMs: 6000 });
        })();

    return arrive
      /* Refresh before reading. The list may have been rendered before the
         last appeal moved out of it, and opening a stale row means opening
         something that is no longer there. */
      .then(function () { return PL.spa.clickSlow(PL.dom.qs("#refresh-btn")); })
      .then(function () {
        return PL.waitFor(function () {
          return PL.dom.qsa("#queue-body tr[data-row-claim]").length > 0;
        }, { label: "task pool rows", timeoutMs: 5000 });
      })
      .then(function () {
        var rows = PL.adapter.readQueue();
        if (!rows.length) return false;

        /* The top row exactly as displayed. The list is already ordered by
           whatever the platform decided matters; re-sorting on a column the
           script parsed itself means the automation quietly disagrees with
           the queue in front of the operator. */
        var next = rows[0];
        PL.log("autoclaim", "opening " + next.id);
        disarm("opened an appeal");

        return PL.spa.clickSlow(next.openLink).then(function () {
          PL.ui.toast("Opened " + next.id + ".");
          return true;
        });
      })
      .catch(function () { return false; });
  }

  function arm() {
    if (armed) return;
    armed = true;
    /* Announce, so any other long-running loop stands down. Two watchers
       polling the same queue double the request rate for no benefit. */
    PL.exclusive.claim("auto-claim", function (why) { disarm(why); });
    poller = PL.poll(attempt, {
      baseMs: 1500,
      maxMs: 60000,
      giveUpAfter: 12,
      onStop: function (reason) {
        armed = false;
        PL.ui.setState("autoclaim", false);
        if (reason === "idle") PL.ui.toast("Auto-claim stopped — pool stayed empty.");
        var lb = PL.ui.liveBody("autoclaim");
        if (lb) render(lb);
      }
    }).start();
    PL.ui.setState("autoclaim", true);
    var live = PL.ui.liveBody("autoclaim");
    if (live) render(live);
  }

  function disarm(reason) {
    PL.exclusive.release("auto-claim");
    if (poller) poller.stop(reason);
    armed = false;
    PL.ui.setState("autoclaim", false);
    var live = PL.ui.liveBody("autoclaim");
    if (live) render(live);
  }

  function render(body) {
    PL.ui.clear(body);

    body.appendChild(PL.dom.el("div", {}, [
      PL.dom.el("span", { class: "pl-dot " + (armed ? "on" : "off") }),
      PL.dom.el("span", { text: armed ? "Armed — watching the pool" : "Idle" })
    ]));

    body.appendChild(PL.dom.el("button", {
      class: "pl-btn" + (armed ? " on" : ""),
      text: armed ? "Stop" : "Claim next case",
      onclick: function () { armed ? disarm("manual") : arm(); }
    }));

    if (armed && poller) {
      body.appendChild(PL.dom.el("div", {
        class: "pl-hint",
        text: "Next check in ~" + Math.round(poller.waitMs() / 1000) + "s. Interval widens while the pool is empty."
      }));
    }

    if (!onQueue()) {
      body.appendChild(PL.dom.el("div", {
        class: "pl-hint",
        text: "Not on the task pool — this will navigate there, refresh, and open the next appeal."
      }));
    }

    body.appendChild(PL.dom.el("div", {
      class: "pl-hint",
      text: "One click opens the next appeal in your task pool. Alt+A does the same."
    }));
  }

  PL.ui.button({
    id: "autoclaim",
    label: "Auto Claim",
    title: "Auto-claim",
    /* One click runs it. An arm-then-confirm step is a second decision for a
       thing the operator already decided by reaching for the button, and it
       is exactly the kind of ceremony this toolkit exists to remove. Clicking
       again while it is working stops it. */
    onClick: function () { armed ? disarm("manual") : arm(); },
    /* The only button that lives on every page. Its whole purpose is to be
       reachable the moment the operator finishes a case, wherever they are. */
    pages: "*",
    toggle: true,
    hotkey: "Alt+A",
    badge: function () {
      if (PL.adapter.view() !== "queue") return null;
      var n = PL.adapter.readQueue().length;
      return n ? String(n) : null;
    },
    render: render
  });

  PL.hotkeys.bind("alt+a", function () { armed ? disarm("manual") : arm(); });
  PL.hotkeys.bind("alt+p", function () { location.hash = "#/queue"; });

  PL.watch(function () { return PL.adapter.view() + ":" + (PL.adapter.caseKey() || ""); }, function () {
    PL.ui.refresh();
    var live = PL.ui.liveBody("autoclaim");
    if (live) render(live);
  });
})();

} catch (e) {
  console.error('[pl] queue-auto-claim failed to start:', e);
}

/* ---- signal-surfacer ---- */
try {

/*
 * THE PROBLEM
 *
 * Policy violations — moving the trade off-platform, paying from a third-party
 * account, pressuring a counterparty into releasing early — are usually sitting
 * in plain sight in the transcript. But it is one line in forty, phrased a dozen
 * different ways, and by the hundredth case of a shift your attention is not
 * what it was at the tenth. Detection quality drifts with fatigue, and it drifts
 * silently: nobody can see the ones you stopped noticing.
 *
 * WHAT THIS DOES
 *
 * Runs a pattern set over the transcript and the claim statement and lists every
 * match with the line it came from, who said it, and why the pattern exists.
 *
 * THE CONSTRAINT THAT MATTERS MOST
 *
 * This script has no verdict. It cannot restrict an account, cannot score a case
 * as fraud, cannot rank or recommend. It answers exactly one question — "is there
 * a line here you would want to have read?" — and hands the line back.
 *
 * That limit is deliberate, and it is the most important design decision in the
 * repository. Two reasons:
 *
 *   An operator shown a conclusion starts agreeing with it. Give people a
 *     confidence score and within a week they are reviewing the score instead
 *     of the case. The automation would then be quietly deciding outcomes it
 *     was never validated to decide.
 *
 *   A pattern matcher has no idea what it is missing. It cannot see the
 *     coercion phrased politely or the scam that used none of these words.
 *     Something with no concept of its own blind spots has no business
 *     producing a verdict.
 *
 * So it optimises for recall, accepts false positives as the cost of that, and
 * leaves precision where it belongs. A false positive costs a second of reading.
 * A missed off-platform solicitation costs a user their money.
 *
 * Every flag is one click from its source line, so dismissing a wrong one is
 * as cheap as acting on a right one.
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

  if (!PL.guard("signal-surfacer")) return;
  PL.requireCore("6.1.0");
  PL.register("signal-surfacer", "3.0.0");

  var PATTERNS = [
    {
      id: "off_platform_contact",
      label: "Off-platform contact requested",
      why: "Moving negotiation outside the trade chat removes the evidence trail.",
      re: /\b(whats\s?app|whatsapp|telegram|signal|instagram|e-?mail me|my number|phone number|call me|outside the platform|off platform)\b/i
    },
    {
      id: "third_party_payment",
      label: "Third-party payment indicated",
      why: "Payment from an account other than the trading account breaks the identity chain.",
      re: /\b(my (cousin|friend|brother|sister|wife|husband|mother|father|uncle)|another account|different name|someone else'?s? account|paying for me|my other account)\b/i
    },
    {
      id: "release_pressure",
      label: "Pressure to release early",
      why: "Urgency aimed at whoever is holding the asset is the common lead-in to a non-payment loss.",
      re: /\b(release it|just release|release now|release or|please release|hurry|i'?m not a scammer|im not a scammer|trust me|open a dispute against you)\b/i
    },
    {
      id: "bank_delay_claim",
      label: "Unverified bank-delay claim",
      why: "Often used to explain a receipt that will never settle. Worth checking against the statement.",
      re: /\b(bank (is )?slow|holiday delay|takes a while to show|already left my account|money left already|bank app is down|pending on my side)\b/i
    },
    {
      id: "re_trade_request",
      label: "Request to re-trade or re-send",
      why: "Cancelling and asking for a second transfer is a known duplication pattern.",
      re: /\b(re-?send|send it again|place another order|cancel and|send to the other account|re-?send to)\b/i
    }
  ];


  function scan(c) {
    var hits = [];
    c.chat.forEach(function (m) {
      PATTERNS.forEach(function (p) {
        if (p.re.test(m.text)) hits.push({ p: p, from: m.from, at: m.at, text: m.text, where: "chat" });
      });
    });
    PATTERNS.forEach(function (p) {
      if (p.re.test(c.narrative)) {
        hits.push({ p: p, from: "claim", at: "", text: c.narrative.slice(0, 130) + "…", where: "claim" });
      }
    });
    return hits;
  }

  function hitCount() {
    var c = PL.adapter.readCase();
    return c ? scan(c).length : 0;
  }

  /* Registers no button. The flags belong beside the case facts, not in a
     second panel the operator has to remember to open — so this publishes
     the scanner and the Brief renders it. Keeping the scanning here keeps
     the pattern set in one file with its reasoning, which is the part worth
     reviewing.

     What it still refuses to do is unchanged: no verdict, no score, no
     ranking. It answers "is there a line here you would want to have read?"
     and hands the line back. */
  PL.registry.publish({
    channel: "signals",
    id: "policy-patterns",
    group: "Signals",
    scan: scan,
    patternCount: PATTERNS.length
  });
})();

} catch (e) {
  console.error('[pl] signal-surfacer failed to start:', e);
}

/* ---- context-aggregator ---- */
try {

/*
 * THE PROBLEM
 *
 * A case page holds five boxes across two columns, and the facts that actually
 * drive the decision are one or two lines from each of them. Reading a case
 * means scrolling between them and assembling the picture in your head, then
 * doing it again when you come back to the case after a follow-up.
 *
 * WHAT THIS DOES
 *
 * Reads the whole page once per case and renders the assembled picture: the
 * order facts that set severity, the counterparty comparison that usually
 * drives credibility, and what evidence is actually on file.
 *
 * THE ONE JUDGEMENT IT ENCODES, STATED OPENLY
 *
 * It puts complainant and defendant side by side. That is a claim about what
 * matters — that relative account history is worth looking at early — and it
 * is the only opinion in the script. Everything else is verbatim.
 *
 * WHAT IT DOES NOT DO
 *
 * No summary of the narrative, no evidence weighting, no suggested outcome.
 * Every value shown appears somewhere on the page already. If the operator
 * would have to trust the script's *reading* of something rather than check
 * it in one glance, it isn't here.
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

  if (!PL.guard("context-aggregator")) return;
  PL.requireCore("6.1.0");
  PL.register("context-aggregator", "3.0.0");

  /* Supplied by the Signal Surfacer. Absent if that script is not installed,
     in which case the brief simply has no flags section rather than failing. */
  function flags(c) {
    var scanner = PL.registry.group("Signals")[0];
    if (!scanner || !scanner.scan) return [];
    try { return scanner.scan(c); } catch (e) { return []; }
  }

  function render(body) {
    var c = PL.adapter.readCase();
    PL.ui.clear(body);
    if (!c) {
      body.appendChild(PL.dom.el("div", { class: "pl-none", text: "Open a case." }));
      return;
    }
    if (body.setHeaderRight) body.setHeaderRight(c.id);

    PL.ui.rows([
      ["Type", c.typeLabel],
      ["Filed by", c.filedBy],
      ["Order", c.order.status],
      ["Value", c.order.fiat],
      ["Crypto", c.order.crypto],
      ["Method", c.order.method],
      ["Released", c.order.releasedAt || "-"],
      ["SLA", c.sla]
    ]).forEach(function (r) { body.appendChild(r); });

    body.appendChild(PL.ui.sub("Complainant vs defendant"));
    PL.ui.rows([
      ["Handle", c.complainant.handle + " / " + c.defendant.handle],
      ["Role", c.complainant.role + " / " + c.defendant.role],
      ["Tier", c.complainant.tier + " / " + c.defendant.tier],
      ["Account age", c.complainant.tenure + " / " + c.defendant.tenure],
      ["Orders", c.complainant.orders + " / " + c.defendant.orders],
      ["Prior disputes", c.complainant.disputes + " / " + c.defendant.disputes]
    ]).forEach(function (r) { body.appendChild(r); });

    body.appendChild(PL.ui.sub("Evidence (" + c.evidence.length + ")"));
    if (!c.evidence.length) {
      body.appendChild(PL.dom.el("div", { class: "pl-none", text: "Nothing submitted." }));
    } else {
      c.evidence.forEach(function (e) {
        body.appendChild(PL.dom.el("div", { class: "pl-quote", text: e.tag + " · " + e.label }));
      });
    }

    /* Flags come from the Signal Surfacer via the registry. They sit here,
       under the facts, because that is the order the case is read in — and
       because a separate button for them was one the operator had to
       remember to press. */
    var hits = flags(c);
    body.appendChild(PL.ui.sub("Flagged lines (" + hits.length + ")"));

    if (!hits.length) {
      body.appendChild(PL.dom.el("div", {
        class: "pl-none",
        text: "No patterns matched. Not a clearance — read the transcript."
      }));
    } else {
      hits.forEach(function (h) {
        var box = PL.dom.el("div", { class: "pl-flag" }, [
          PL.dom.el("div", { class: "t", text: h.p.label }),
          PL.dom.el("div", { class: "q", text: (h.where === "claim" ? "claim" : h.from + " " + h.at) + ": \u201c" + h.text + "\u201d" }),
          PL.dom.el("div", { class: "w", text: h.p.why })
        ]);
        box.addEventListener("click", function () {
          var el = PL.dom.qs(h.where === "claim" ? "#claim-narrative" : "#chat-log");
          if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
        });
        body.appendChild(box);
      });
    }

    body.appendChild(PL.dom.el("div", {
      class: "pl-hint",
      text: c.chat.length + " chat messages. Alt+2 scrolls to the transcript."
    }));

    PL.log("aggregator", "rendered " + c.id);
  }

  PL.hotkeys.bind("alt+2", function () {
    var el = PL.dom.qs("#chat-log");
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  });

  PL.ui.button({
    id: "aggregator",
    label: "Brief",
    title: "Case brief",
    pages: ["case"],
    disabled: function () {
      return PL.adapter.caseKey() ? null : "Open a claim first.";
    },
    hotkey: "Alt+2",
    render: render,
    /* The badge counts flags, not evidence. Evidence is context; a flag is a
       line somebody needs to read, and it is the only thing here worth
       interrupting for. Amber when there is something. */
    variant: "warn",
    badge: function () {
      var c = PL.adapter.readCase();
      if (!c) return null;
      var n = flags(c).length;
      return n ? String(n) : null;
    }
  });

  PL.watch(PL.adapter.caseKey, function () {
    PL.ui.refresh();
    var live = PL.ui.liveBody("aggregator");
    if (live) render(live);
  });
})();

} catch (e) {
  console.error('[pl] context-aggregator failed to start:', e);
}

/* ---- macro-engine ---- */
try {

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
  PL.requireCore("6.1.0");
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

} catch (e) {
  console.error('[pl] macro-engine failed to start:', e);
}

/* ---- macro-launcher ---- */
try {

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

  if (!PL.guard("macro-launcher")) return;
  PL.requireCore("6.1.0");
  PL.register("macro-launcher", "3.0.0");

  /*
   * THE PROBLEM
   *
   * A canned-response dropdown is fine at eight entries and hostile at sixty:
   * you stop reading it and start scrolling it, so people use the six they
   * can find and hand-type the rest. The library grows and its usable surface
   * does not.
   *
   * WHAT THIS DOES
   *
   * One keystroke opens a fuzzy-filtered palette of the macros that apply to
   * the open case. Type three letters, press enter, and the full sequence
   * runs — message, response window, remark, and parking the case.
   *
   * WHY IT OWNS NO MACROS OF ITS OWN
   *
   * An earlier version kept a second list here and only inserted a note. The
   * two implementations drifted, and this button quietly did a third of what
   * the same macro did from the matrix — the message was never sent. Now the
   * entries come from the shared registry and the executor is the matrix's.
   * One behaviour, reachable two ways.
   *
   * WHY A PALETTE RATHER THAN A LONGER DROPDOWN
   *
   * Fuzzy filtering makes recall beat recognition: you do not need to know
   * where "third-party payment" sits in a list, only that it matches "tpp".
   * That is the difference between a library of sixty that gets used and one
   * that decays into six.
   */

  function open() {
    var c = PL.adapter.readCase();
    if (!c) { PL.ui.toast("Open an appeal first."); return; }

    var all = PL.registry.group("Macros");
    if (!all.length) {
      PL.ui.toast("No macros registered — is the Macro Engine script installed?");
      return;
    }

    /* Applicable to this appeal first; everything else still reachable. */
    var mine = all.filter(function (m) { return m.caseType === c.type; });
    var rest = all.filter(function (m) { return m.caseType !== c.type; });

    /* Show the trade role the message goes to, not the procedural label.
       "message the seller" tells the operator who receives it; "message the
       complainant" makes them work out which side that is. */
    var roleOf = function (p) { return /buyer/i.test(p.role) ? "buyer" : "seller"; };
    var recipientOf = function (to) {
      if (!to) return null;
      if (to === "both") return "both parties";
      return "the " + (to === "defendant" ? roleOf(c.defendant) : roleOf(c.complainant));
    };

    function toItem(m, applies) {
      return {
        name: m.label,
        meta: m.code,
        tags: [m.code.toLowerCase(), m.id.split("/")[1].replace(/_/g, ""), applies ? "thiscase" : ""],
        preview: (applies ? "▸ " : m.typeLabel + " · ") +
          [m.sendsMessage && m.to ? "message " + recipientOf(m.to) : "no message",
           m.windowHours ? m.windowHours + "h window" : "no window",
           "remark",
           m.closes ? "→ closes the appeal"
             : m.followUp ? "→ Handling" : "stays in task pool"].join(" · "),
        run: function () {
          if (applies) { m.run(); return; }
          PL.ui.confirm("Type mismatch", [
            "This appeal is " + c.typeLabel + ", not " + m.typeLabel + ".",
            "The wording will not match. Run anyway?"
          ]).then(function (yes) { if (yes) m.run(); });
        }
      };
    }

    PL.overlay({
      items: mine.map(function (m) { return toItem(m, true); })
        .concat(rest.map(function (m) { return toItem(m, false); })),
      placeholder: c.id + " · " + c.typeLabel + " — type to filter",
      footer: mine.length + " for this type, " + all.length + " total"
    });
  }

  PL.hotkeys.bind("alt+k", open);

  PL.ui.button({
    id: "macros",
    label: "Macros",
    pages: ["case"],
    disabled: function () {
      var m = PL.dom.qs("#main");
      if (!m || !m.getAttribute("data-claim-id")) return "Open a claim first.";
      return m.getAttribute("data-claim-state") === "closed"
        ? "This claim is closed — the macro palette is unavailable." : null;
    },
    hotkey: "Alt+K",
    /* No popover: this button IS the action. A palette that needed two
       clicks to open would be slower than the dropdown it replaces. */
    onClick: open,
    badge: function () {
      var c = PL.adapter.readCase();
      if (!c) return null;
      var n = PL.registry.group("Macros").filter(function (m) { return m.caseType === c.type; }).length;
      return n ? String(n) : null;
    }
  });

  PL.watch(PL.adapter.caseKey, function () { PL.ui.refresh(); });
})();

} catch (e) {
  console.error('[pl] macro-launcher failed to start:', e);
}
