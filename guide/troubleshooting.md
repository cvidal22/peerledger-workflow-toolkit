# Troubleshooting

Symptom first, because that is what you have when something goes wrong.

| Symptom | Cause | Fix |
|---|---|---|
| Every action fires twice | Two copies of the script installed | Remove the stale copy. Check `__PL_INSTANCES__` in the console — more than one version listed means a duplicate is live. |
| Buttons never appear, red banner naming an old version | A cached copy of `pl-core.js` is being served | The banner tells you which version arrived. Remove and reinstall the scripts. If it persists, see *Stale core* below. |
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

## Reproducing a bug

Append a scenario to the demo URL rather than waiting for the failure to happen again:

`?scenario=slow` · `noop` · `concurrent` · `throttle` · `stale` · `twins` · `menus` — combinable with commas.

`tests/scenarios.test.js` asserts the scripts survive each one, and shows the naive approach failing alongside the correct one.


## Stale core

The banner reads `pl-core.js is missing or out of date (found X)`. The scripts fetched an older core than they need.

**Why it happens.** `@require` content is cached twice: by the extension, and by whatever serves the file.

`raw.githubusercontent.com` caches for about five minutes and honours a `?v=` query, so bumping the version in the URL forces a fresh fetch. **jsDelivr does not** — a `@branch` URL is cached for up to 12 hours and the query string is ignored, so a version buster busts nothing and an updated core serves stale for half a day. That is why the `@require` here points at raw, and why `build/validate.js` fails the build if anyone switches it back.

**To fix it now:**

1. Remove all the scripts in the Tampermonkey dashboard (not just disable).
2. Reload the extensions page, then reinstall from the README links.
3. If the banner still names the old version, open the `@require` URL directly in a tab and check the `PL.version` line near the top. If that file is current, the extension is holding the cache — reinstall once more.

**If you must use a CDN**, purge it explicitly after each push rather than relying on a query string:
`https://purge.jsdelivr.net/gh/<user>/<repo>@main/core/pl-core.js`
