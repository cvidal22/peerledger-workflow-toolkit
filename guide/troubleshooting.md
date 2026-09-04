# When something's wrong

| Symptom | Cause | Fix |
|---|---|---|
| Everything happens twice | Two copies installed | Delete the extra. Check `__PL_INSTANCES__` — one version per script is healthy. |
| No buttons appear | Core didn't load | Look for the red banner; it names the version it found. Delete the scripts and reinstall. |
| Messages go out in English | Language layer wasn't loaded | `PL.requireCore` should have thrown — check the console. |
| Clicks the wrong element | Text lookup hit a hidden sidebar item | Use `PL.spa.byText`. |
| Nothing happens on click | Component wants pointer events | Use `PL.spa.click`. |
| Field looks filled, saves empty | Direct `.value` assignment | Use `PL.spa.set`. |
| A chain hangs on a step | Its `verify` never becomes true | Check what it's looking at. Empty-state placeholder rows are a classic false negative. |
| Chain says success, nothing saved | Verified by row count | Use `PL.marker`. |
| Watcher stalls in a background tab | Chrome throttles timers | `PL.timer` runs on a Worker. Check `t.viaWorker()`. |
| Alert when cancelling | Cancellation surfaced as an error | Throw `PL.abort()`, check `PL.isAbort(e)`. |
| Button is greyed out | On purpose | Hover it — it says why. |
| Demo 404s | Pages source set to `/root` | Settings → Pages → folder `/docs`. |

## Working on a change

Don't push to test. Open `docs/index.html` directly — see [DEVELOPING.md](DEVELOPING.md).
