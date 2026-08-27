# Architecture

The scripts are separate files that behave as one system. Five contracts hold them together. These are the public API of the repository — renaming any string here silently breaks a listener somewhere else, so treat them as an interface rather than as labels.

> `guide/` holds documentation. `docs/` is the GitHub Pages root and contains the demo console only.

---

## The boundary rule

**Exactly one layer knows what the page looks like: `PL.adapter`.**

It converts pixels into plain objects and stops. No decisions, no ranking, no filtering. Every other layer operates on data and cannot tell whether it came from a DOM scrape, an API or a fixture.

If a consumer needs to know a selector, the adapter is incomplete.

When the host ships a redesign, one function breaks instead of seven scripts. On a product that ships weekly this is the difference between a toolkit that survives and one abandoned after the second painful rewrite.

Host presentation conventions are resolved at this boundary too. A UI that renders "not applicable" as a dash hands back an empty value — otherwise that dash ends up rendered into a message to a user.

---

## Contract 0 — one button per script

```javascript
PL.ui.button({
  id: "surfacer",
  label: "Flags",
  pages: ["case"],          // views this button applies to, or "*"
  variant: "warn",          // optional colour
  toggle: true,             // renders an on/off dot
  badge: () => count || null,
  render: (body) => {},     // popover contents
  onClick: () => {}         // instead of a popover
});
```

`PL.ui.refresh()` recomputes visibility and badges; it runs on every DOM mutation, debounced. `PL.ui.refreshContent()` redraws an open popover and is deliberately *not* called by `refresh` — the composer and review gate hold live text a redraw would destroy. Scripts drive content redraws themselves, on case change.

`PL.ui.liveBody(id)` returns the popover body if that button's popover is open, or null.

## Contract 1 — the registry

Scripts publish entries; the launcher renders whatever it finds. Adding a macro touches one file.

```javascript
PL.registry.publish({
  channel: "note-macro",     // who consumes this
  id: "Recovery claim opened", // unique within the channel
  group: "Note macros",       // section in the palette
  order: 12,                  // sort position
  label: "Recovery claim opened",
  tags: ["recovery", "frc"],
  body: "…"
});
```

Entries de-duplicate on `channel` + `id`. That is what stops a duplicate install from producing double entries in the palette.

The alternative — a launcher that imports every macro — makes adding a macro a two-file change and turns the launcher into a merge-conflict magnet.

## Contract 2 — the event bus

```javascript
PL.bus.emit("run-macro", "recovery_opened", { claimId: "PL-204871" });
PL.bus.on("run-macro", (id, payload) => { /* … */ });
```

| Channel | Direction | `id` means |
|---|---|---|
| `run-macro` | launcher → macro | which macro to run |
| `exclusive-start` | any loop → all loops | which loop just claimed the floor |
| `review-changed` | review gate → all | whether the gate is enabled |

Channel and id strings are a **frozen vocabulary**. Other scripts key behaviour off them.

## Contract 3 — mutual exclusion

Any long-running loop announces itself; the others stand down.

```javascript
PL.exclusive.claim("auto-claim", (why) => disarm(why));
// …later
PL.exclusive.release("auto-claim");
```

Two watchers polling the same queue fight each other and double the request rate for no benefit. This needs no shared state, no lock service and no server — which matters, because a browser userscript has none of those available.

## Contract 4 — the review gate

Macros do not need to know the gate exists. It intercepts immediately before the irreversible write and resumes afterwards.

What a macro must provide:

- Compose the note text before calling the gate.
- Write into the field through `PL.spa.set`, never by assigning `.value`.
- **Tolerate being aborted.** Cancellation arrives as `PL.abort()`, whose `.message` throws on read so that generic `catch (e) { alert(e.message) }` handling cannot turn a cancellation into a scary dialog. Check `PL.isAbort(e)` before handling any error.

```javascript
PL.review.gate("Case note — " + id, text, meta).then(edited => {
  if (edited === null) throw PL.abort("operator cancelled");
  PL.spa.set(field, edited);
});
```

## Contract 5 — the chain runner

Multi-step actions run through `PL.chain`, never as sequential clicks.

```javascript
PL.chain.run({
  key: claimId + ":recovery",       // once-guard scope
  preflight: [{ label, check }],     // refuse before anything happens
  steps: [{ name, run, verify, irreversible }],
  confirm: (step, log) => Promise<boolean>,
  onProgress: (log, message) => {}
});
```

Guarantees: preflight before any execution, per-step verification by observation, abort on failure, a report naming exactly which steps committed, one chain at a time globally, and no re-running a completed chain on the same case without an explicit reset.

Deliberately absent: **retry** (risks double-sending after a half-success) and **rollback** (a lie in a UI with no undo — reporting the partial state honestly is better than pretending to reverse it).

---

## Install order

The core must load before anything that depends on it. Extensions execute in list order.

1. `core/pl-core.js` — loaded automatically via `@require`, no manual ordering needed
2. Any scripts, in any order

Every script calls `PL.requireCore("3.0.0")` and throws if the core is older or absent. A script that silently degrades — quietly sending English because the language layer never loaded — sends real messages to real users in the wrong language and nobody notices for weeks. Refusing to start is correct.

## Duplicate installs

Every script opens with `PL.guard("script-id")`. Without it, two installed copies bind two listeners and every action fires twice; four copies, four times. The symptom looks like the host misbehaving, so it is expensive to diagnose the first time.

The usual cause is a filename that no longer matches `@name` — extensions match on `@name` when reinstalling, so a mismatch adds a copy instead of replacing one.

To check for stale installs from the console:

```javascript
__PL_INSTANCES__   // { "macro-matrix": ["3.0.0"] } is healthy
                   // { "macro-matrix": ["2.1.0", "3.0.0"] } means a stale copy is live
```

---

## Layers

```
scripts/         consume Case and QueueRow objects. Zero selectors.
  ↓
core/pl-core.js
  ui        left-edge button dock; one button per script, popover output
  overlay   keyboard-first filter palette
  hotkeys   one listener for the whole toolkit
  registry  scripts publish, launcher renders
  bus       named channels between scripts
  exclusive one long-running loop at a time
  chain     preflight · verify · abort · report · lock · once
  poll      backoff · hard stop · no overlap
  timer     an interval that survives a backgrounded tab
  waitFor   poll a condition instead of guessing a delay
  template  strict tokens, loud failure
  lang      per-party detection; translate out, never notes
  review    the pause before an irreversible write
  marker    verification that survives concurrent writes
  guard     refuse to bind twice
  spa       native setters · real pointer events · visibility
  ─────────────────────────────────────────────
  adapter   ← the ONLY DOM-coupled code
  ↓
host console
```

See [`guide/dom-cookbook.md`](dom-cookbook.md) for what each `spa` helper works around, and [`ENGINEERING-NOTES.md`](../ENGINEERING-NOTES.md) for why the system is shaped this way.
