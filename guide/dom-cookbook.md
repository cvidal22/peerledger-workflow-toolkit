# DOM cookbook

Techniques for driving a reactive single-page application from outside it. Every entry replaces something that ought to work and doesn't, and each one states the **symptom** first — that is how you will recognise it when it happens to you.

None of this is clever. All of it is scar tissue.

---

## Setting a field's value does nothing

**Symptom:** the text appears on screen, but the application behaves as though the field is still empty. Saving stores the old value, or the Save button stays disabled.

**Cause:** frameworks that track their own state don't observe direct assignment to `.value`. Your write updates the DOM node and the framework never hears about it.

**Fix:** go through the native prototype setter, then dispatch the events the framework listens for.

```javascript
PL.spa.set(field, text);
```

Number inputs additionally need a `blur`, or the model keeps the previous value. The worst cases — lookup fields that search as you type — can need the whole sequence: `focus`, `mousedown`, `mouseup`, `click`, set value, `keydown`, `keyup`, `change`, `blur`.

---

## `.click()` is ignored

**Symptom:** nothing happens. No error, no visual feedback. Clicking manually works fine.

**Cause:** the component binds pointer events, and a bare `.click()` produces only the final `click`.

**Fix:** dispatch the full sequence.

```javascript
PL.spa.click(button);   // pointerdown → mousedown → mouseup → click
```

---

## Elements found by text are the wrong ones

**Symptom:** a macro clicks something in the navigation sidebar instead of the button in front of you.

**Cause:** navigation chrome frequently contains hidden copies of on-page label text.

**Fix:** filter every text-based lookup for actual visibility.

```javascript
PL.spa.byText("button", "Save note");   // visible matches only
```

---

## Visible elements report themselves as invisible

**Symptom:** an injected panel is plainly on screen, but your own visibility check says it isn't, so the script skips it.

**Cause:** `offsetParent === null` is the cheap visibility test and it is correct for ordinary flow content — but **`position: fixed` elements report `null` while fully visible.**

**Fix:** `PL.spa.visible` special-cases fixed positioning and falls back to computed style plus a bounding-box size check. Don't use bare `offsetParent` on anything you injected yourself.

---

## Several menus match at once

**Symptom:** a dropdown option is clicked, but on the wrong row.

**Cause:** menus are often teleported to `<body>`, so multiple can exist simultaneously and document order tells you nothing about which belongs to which row.

**Fix:** take the visible candidate nearest the element that opened it.

```javascript
PL.spa.nearest(candidates, anchorRow);
```

Related: the handler frequently sits on a `<button>` *inside* the list item, not the item. Click `el.closest("button")`. And option text carries whitespace — always `.trim()`.

---

## The script runs before the data arrives

**Symptom:** intermittent. Works when you test it, fails on a slow morning, reads empty fields.

**Cause:** layout and buttons render before data loads. The page *looks* ready.

**Fix:** wait for a specific field to hold a real value. Never sleep a fixed interval — a fixed sleep is wrong in both directions: too short when it matters, wasted time every other run.

```javascript
await PL.spa.ready("#order-ref");
await PL.waitFor(() => rows().length > 0, { label: "queue rows" });
```

---

## Pinned table columns read as empty

**Symptom:** a column visible on screen comes back blank when you read the row.

**Cause:** columns that appear pinned are rendered into a separate overlay element and are genuinely absent from the main table body.

**Fix:** read the overlay at the same row index as well. And read columns **by header position**, never by scanning row text — an adjacent column will produce false matches.

---

## Timers stop when the tab is backgrounded

**Symptom:** a watcher works while you're looking at it and stalls the moment you switch tabs — exactly when you needed it.

**Cause:** Chrome throttles `setTimeout`/`setInterval` in hidden tabs to roughly one tick per minute.

**Fix:** run the interval in a Worker, which gets its own thread and isn't throttled the same way.

```javascript
const t = PL.timer(10000, tick);
t.viaWorker();   // false means it fell back to setInterval
```

The same constraint applies to audio: unlock the audio context on a real user click, or an alarm never sounds.

---

## The clipboard throws in a background tab

**Symptom:** handing data between scripts works manually and fails when automated.

**Cause:** `navigator.clipboard.readText()` requires a focused document.

**Fix:** pass data through shared page variables and keep the clipboard as a fallback for manual runs only.

---

## Verifying a save confirms the wrong thing

**Symptom:** rare and confusing. The script reports success; the note isn't there.

**Cause:** verification by row count or newest-row. A colleague saving on the same case at the same instant satisfies both.

**Fix:** verify by identity. Every generated note carries a unique marker; verification searches for that exact string.

```javascript
const mark = PL.marker.make("OVP");
// …write note containing mark…
PL.waitFor(() => PL.marker.present("#notes-table", mark));
```

**Verify by identity, never by position or count.** Anything positional is a race waiting for a colleague to trigger it.

---

## Cancelling shows an error dialog

**Symptom:** the operator cancels at a review gate and gets an alert as though something broke.

**Cause:** generic error handling upstream does `catch (e) { alert(e.message) }`, and a cancellation is an error like any other.

**Fix:** throw a signal whose `.message` throws on read, so any handler trying to display it propagates instead.

```javascript
throw PL.abort("operator cancelled");
// upstream:
catch (e) { if (PL.isAbort(e)) return; /* real error handling */ }
```

Blunt, and it works across sandbox realms where patching `window.alert` does not.

---

## Everything fires twice

**Symptom:** two messages sent, two notes saved, two of everything. With four copies installed, four of everything.

**Cause:** two installed copies of the same script, each binding its own listeners. Usually because a filename stopped matching `@name`, so reinstalling added a copy instead of replacing one.

**Fix:** guard at the top of every script, and keep filenames matching `@name`.

```javascript
if (!PL.guard("macro-matrix")) return;
```

Check for stale copies with `__PL_INSTANCES__` in the console.

---

## Messages send in the wrong language

**Symptom:** everything works, but users receive English when they wrote in Portuguese.

**Cause:** the language layer wasn't loaded when the macro ran, and the macro degraded silently instead of failing.

**Fix:** `PL.requireCore()` at the top of every dependent script. Silent degradation is worse than refusing to start, because nobody notices for weeks.

---

## The table you're reading is the wrong one

**Symptom:** correct-looking data from the wrong view.

**Cause:** the app keeps several rendered views alive in the DOM at once.

**Fix:** anchor table selection to **content** — the table containing the record you queried — never to `nth-of-type` or document order.
