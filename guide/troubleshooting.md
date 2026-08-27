# Troubleshooting

Symptom first, because that is what you have when something goes wrong.

| Symptom | Cause | Fix |
|---|---|---|
| Every action fires twice | Two copies of the script installed | Remove the stale copy. Check `__PL_INSTANCES__` in the console — more than one version listed means a duplicate is live. |
| Panel never appears | The core failed to load, or jsDelivr hasn't picked up a fresh commit | Wait ~10 minutes after pushing and reload. Check the console for the `PL.requireCore` error. |
| Panel appears twice | Same as double-firing | As above. |
| Messages go out in English | Language layer unavailable when the macro ran | `PL.requireCore` should have thrown — check the console. Never let a macro degrade silently. |
| Macro clicks the wrong thing | Text lookup matched a hidden navigation element | Use `PL.spa.byText`, which filters for visibility. |
| Nothing happens on click | Component binds pointer events; bare `.click()` ignored | Use `PL.spa.click`. |
| Field looks filled but saves empty | Direct `.value` assignment ignored by the framework | Use `PL.spa.set`. |
| Chain hangs at a step | A `verify` predicate never becomes true | Check what it observes. Empty-state placeholder rows are a classic false negative — count real rows, not table rows. |
| Chain reports success, nothing saved | Verification by row count satisfied by someone else's write | Verify by marker (`PL.marker`), never by count or position. |
| Watcher stalls when you switch tabs | Chrome throttles background timers | Use `PL.timer`, which runs on a Worker. Check `t.viaWorker()`. |
| Alert appears when cancelling | Cancellation surfaced through generic `alert(e.message)` handling | Throw `PL.abort()`; check `PL.isAbort(e)` before handling errors. |
| Two watchers fighting | One didn't stand down | Both must call `PL.exclusive.claim`. |
| Palette shows duplicate entries | Same entry published twice | Registry de-duplicates on `channel` + `id`; check they're unique. |
| Demo page 404s | Pages source set to `/root` | Settings → Pages → folder `/docs`. |
| Demo loads unstyled | `docs/styles.css` missing | Re-upload it. |
