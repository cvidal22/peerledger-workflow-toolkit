# How it fits together

Five scripts, one core. The core is `core/pl-core.js`; everything else depends on it and on nothing else.

> `guide/` is documentation. `docs/` is the demo console — it's the GitHub Pages folder, which is why it has that name.

## The one rule

Only `PL.adapter` touches the DOM. It reads the page, returns plain objects, and stops — no decisions, no filtering.

Everything above it works on data and can't tell whether it came from a scrape, an API, or a fixture. When the platform redesigns, one function breaks instead of five scripts.

If a script needs to know a selector, the adapter is missing something.

One catch: the adapter reads party details by field label, so renaming a label on the page empties it. Those labels are marked in the code as an interface. Don't rename them without changing both.

## Scripts publish, other scripts render

```javascript
PL.registry.publish({
  channel: "macro",     // who consumes this
  id: "cbp/request_proof",
  label: "Request proof",
  run: function () { ... }
});

PL.registry.group("Macros")   // read them back
```

The Macro Engine publishes 48 macros; the Launcher renders whatever it finds. The Signal Surfacer publishes its scanner; the Brief renders the results. Adding a macro means editing one file.

Entries de-dupe on channel + id, which is what stops a duplicate install producing double entries.

## One long-running loop at a time

```javascript
PL.exclusive.claim("auto-claim", stopFn);
```

Anything that polls announces itself and the others stand down. No lock service, no shared state — a userscript has neither.

## Multi-step actions

```javascript
PL.chain.run({
  key: caseId + ":request_proof",
  preflight: [{ label, check }],
  steps: [{ name, run, verify }],
  onProgress: function (log) { ... }
});
```

Preflight runs before anything happens. Each step verifies by looking at the page. On failure it stops and reports which steps already committed.

It doesn't retry (double-send risk) and doesn't roll back (there's no undo — saying you reverted something you only clicked at is worse than admitting the partial state).

## The review gate

Off by default. `PL.review.enabled = true` makes every save pause for editing first.

Macros don't need to know it exists. If the operator cancels, it throws `PL.abort()` — an error whose `.message` throws when read, so generic `catch (e) { alert(e.message) }` upstream can't turn a cancellation into a scary dialog. Check `PL.isAbort(e)` before handling errors.

## Loading

Every script starts with:

```javascript
if (!PL.guard("script-id")) return;   // refuse to bind twice
PL.requireCore("6.1.1");              // refuse to run against an old core
```

Without the guard, two installed copies mean everything fires twice. Usually happens when a filename stops matching `@name` — extensions match on `@name` when reinstalling, so a mismatch adds a copy instead of replacing one.

Type `__PL_INSTANCES__` in the console to check. One version per script is healthy.

## The layers

```
scripts/          consume Case and QueueRow objects
   ↓
core/pl-core.js
   ui         buttons, popovers, run panel
   registry   publish / subscribe
   chain      multi-step actions
   poll       backoff, hard stop
   timer      survives a background tab
   template   strict tokens
   lang       per-party detection
   marker     save verification
   spa        native setters, real clicks, spotlight
   adapter    ← only DOM-coupled code
   ↓
the page
```

See [dom-cookbook.md](dom-cookbook.md) for what each `spa` helper works around.
