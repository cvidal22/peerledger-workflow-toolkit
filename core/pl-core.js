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

  var PL = { version: "3.1.1" };

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
       view, not a judgement this function makes. */
    readQueue: function () {
      return PL.dom.qsa("#queue-body tr[data-row-claim]").map(function (tr) {
        var td = tr.children;
        return {
          id: tr.getAttribute("data-row-claim"),
          typeLabel: td[1].textContent.trim(),
          orderRef: td[2].textContent.trim(),
          value: td[3].textContent.trim(),
          filedBy: td[4].textContent.trim(),
          priority: td[5].textContent.trim(),
          age: td[6].textContent.trim(),
          sla: td[7].textContent.trim(),
          claimButton: tr.querySelector("[data-claim-action]")
        };
      });
    },

    /* The host renders "not applicable" as a dash. Normalising it to an empty
       string here is what lets PL.template throw on a genuinely absent value
       instead of quietly emitting "released -" into a user's message. Host
       placeholder conventions are a presentation detail, so they get resolved
       at the boundary rather than leaking into every consumer. */
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
    enabled: true,

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
    "#pl-dock{position:fixed;left:0;top:22vh;z-index:9000;display:flex;flex-direction:column;gap:5px;",
    "font:12.5px/1.3 system-ui,-apple-system,sans-serif}",
    "#pl-dock .pl-b{display:flex;align-items:center;gap:6px;min-width:104px;padding:7px 10px 7px 9px;",
    "border:1px solid #cfd4da;border-left:0;border-radius:0 4px 4px 0;background:#fff;color:#1b1d22;",
    "cursor:pointer;font:inherit;text-align:left;box-shadow:1px 1px 5px rgba(0,0,0,.09);white-space:nowrap}",
    "#pl-dock .pl-b:hover{background:#f4f6f7;border-color:#9aa3ad}",
    "#pl-dock .pl-b:disabled{opacity:.4;cursor:default;box-shadow:none}",
    "#pl-dock .pl-b .dot{width:7px;height:7px;border-radius:50%;background:#c3c8cf;flex:0 0 auto}",
    "#pl-dock .pl-b.on{background:#1f4d5c;border-color:#1f4d5c;color:#fff;font-weight:600}",
    "#pl-dock .pl-b.on .dot{background:#7fd4a8}",
    "#pl-dock .pl-b.warn{border-color:#d9b98a;background:#fdf6ea}",
    "#pl-dock .pl-b.warn .dot{background:#c98a2e}",
    "#pl-dock .pl-b.open{border-color:#1f4d5c}",
    "#pl-dock .pl-b .lb{flex:1}",
    "#pl-dock .pl-b .bd{font-family:ui-monospace,Menlo,monospace;font-size:11px;padding:0 5px;border-radius:8px;",
    "background:#eceef1;color:#5b616d}",
    "#pl-dock .pl-b.on .bd{background:rgba(255,255,255,.22);color:#fff}",
    "#pl-dock .pl-b.warn .bd{background:#f0dcbc;color:#8a5a10}",
    /* ---- popover anchored to a button ----------------------------------- */
    "#pl-pop{position:fixed;z-index:9100;width:340px;max-height:74vh;overflow-y:auto;background:#fff;",
    "border:1px solid #cfd4da;border-radius:4px;box-shadow:0 8px 26px rgba(0,0,0,.16);",
    "font:13px/1.45 system-ui,-apple-system,sans-serif;color:#1b1d22}",
    "#pl-pop-h{display:flex;align-items:center;gap:8px;padding:8px 11px;background:#1b1d22;color:#fff;",
    "border-radius:4px 4px 0 0;position:sticky;top:0}",
    "#pl-pop-h b{font-size:11px;letter-spacing:.06em;text-transform:uppercase}",
    "#pl-pop-h .sp{flex:1}",
    "#pl-pop-h .r{font-family:ui-monospace,Menlo,monospace;font-size:11px;opacity:.75}",
    "#pl-pop-h button{background:none;border:0;color:#fff;cursor:pointer;font-size:15px;line-height:1;padding:0 2px}",
    "#pl-pop-b{padding:11px 13px}",
    /* ---- shared content bits -------------------------------------------- */
    ".pl-row{display:flex;justify-content:space-between;gap:9px;padding:2px 0;font-size:12px}",
    ".pl-row .k{color:#8d939e}.pl-row .v{font-family:ui-monospace,Menlo,monospace;text-align:right}",
    ".pl-sub{margin:11px 0 6px;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:#5b616d;font-weight:650}",
    ".pl-flag{border-left:3px solid #8a5a10;background:#fcf3e2;padding:6px 8px;margin-bottom:6px;cursor:pointer}",
    ".pl-flag .t{font-weight:650;font-size:11.5px;color:#8a5a10}",
    ".pl-flag .q{font-size:11.5px;color:#5b616d;margin-top:2px;font-style:italic}",
    ".pl-flag .w{font-size:11px;color:#8d939e;margin-top:3px}",
    ".pl-none{color:#8d939e;font-size:12px}",
    ".pl-btn{font:inherit;font-size:12px;padding:5px 9px;border:1px solid #dcdfe4;background:#fff;border-radius:2px;cursor:pointer;margin:0 5px 5px 0}",
    ".pl-btn:hover{border-color:#8d939e}.pl-btn.on{background:#1f4d5c;border-color:#1f4d5c;color:#fff}",
    ".pl-btn:disabled{opacity:.45;cursor:default}",
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
    ".pl-lang{display:inline-block;font-size:10px;font-family:ui-monospace,Menlo,monospace;background:#e8f0f2;color:#1f4d5c;padding:1px 5px;border-radius:2px;margin-left:5px}",
    ".pl-lang.low{background:#fcf3e2;color:#8a5a10}",
    ".pl-matrix{font-size:11px;color:#8d939e;font-family:ui-monospace,Menlo,monospace;margin-top:5px}",
    ".pl-dot{width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:5px}",
    ".pl-dot.on{background:#1d6949}.pl-dot.off{background:#8d939e}",
    /* ---- overlay palette -------------------------------------------------- */
    "#pl-ov{position:fixed;inset:0;background:rgba(15,17,20,.42);z-index:9500;display:flex;align-items:flex-start;justify-content:center;padding-top:11vh}",
    "#pl-ov-box{background:#fff;width:min(620px,92vw);border-radius:3px;box-shadow:0 18px 50px rgba(0,0,0,.3);overflow:hidden;",
    "font:13px/1.45 system-ui,-apple-system,sans-serif}",
    "#pl-ov-in{width:100%;border:0;border-bottom:1px solid #dcdfe4;padding:13px 15px;font:15px system-ui;outline:none}",
    "#pl-ov-list{max-height:52vh;overflow-y:auto}",
    ".pl-ov-i{padding:9px 15px;border-bottom:1px solid #eaecef;cursor:pointer;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}",
    ".pl-ov-i.sel{background:#e8f0f2}",
    ".pl-ov-i .nm{font-weight:600;font-size:12.5px}",
    ".pl-ov-i .tags{margin-left:auto;font-size:10.5px;color:#8d939e;font-family:ui-monospace,Menlo,monospace}",
    ".pl-ov-i .pv{font-size:11.5px;color:#5b616d;margin-top:2px;display:block;width:100%}",
    "#pl-ov-foot{padding:8px 15px;font-size:11px;color:#8d939e;background:#f8f9fa;display:flex;gap:14px}",
    /* ---- confirm / review ------------------------------------------------- */
    "#pl-cf{position:fixed;inset:0;background:rgba(15,17,20,.45);z-index:9700;display:flex;align-items:center;justify-content:center}",
    "#pl-cf-b{background:#fff;width:min(460px,92vw);border-radius:3px;padding:18px;font:13px/1.5 system-ui,-apple-system,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.3)}",
    "#pl-cf-b h3{margin:0 0 8px;font-size:14px}",
    "#pl-cf-b .ft{margin-top:14px;display:flex;gap:7px;justify-content:flex-end}",
    ".pl-rv-t{width:100%;min-height:190px;font:12px/1.55 ui-monospace,Menlo,monospace;border:1px solid #dcdfe4;padding:9px;margin-top:10px;resize:vertical}",
    /* ---- toast ------------------------------------------------------------ */
    "#pl-toasts{position:fixed;left:14px;bottom:14px;z-index:9600;display:flex;flex-direction:column;gap:6px}",
    ".pl-toast{background:#1f4d5c;color:#fff;padding:7px 12px;border-radius:2px;font:12.5px system-ui;max-width:320px}"
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
      document.body.appendChild(d);

      /* Close the popover on outside click or Escape. */
      document.addEventListener("mousedown", function (e) {
        var pop = document.getElementById("pl-pop");
        if (!pop) return;
        if (pop.contains(e.target) || e.target.closest("#pl-dock")) return;
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
      new MutationObserver(function () {
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
        if (spec.onClick) { spec.onClick(); PL.ui.refresh(); return; }
        PL.ui.togglePopover(spec);
      });

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
        var b = spec.badge ? spec.badge() : null;
        rec.badge.textContent = b == null ? "" : String(b);
        rec.badge.style.display = b == null ? "none" : "";
        if (spec.variant) rec.el.classList.toggle(spec.variant, true);
        rec.el.classList.toggle("open", PL.ui._openId === id);
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

      pop.style.left = (r.right + 8) + "px";
      pop.style.top = Math.max(8, Math.min(r.top, (global.innerHeight || 800) - 260)) + "px";
      document.body.appendChild(pop);

      body.setHeaderRight = function (t) { head.querySelector(".r").textContent = t; };
      if (spec.render) spec.render(body);
      PL.ui.refresh();
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
        var row = PL.dom.el("div", { class: "pl-ov-i" + (i === sel ? " sel" : "") }, [
          PL.dom.el("span", { class: "nm", text: it.name }),
          PL.dom.el("span", { class: "tags", text: (it.tags || []).join(" ") }),
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
