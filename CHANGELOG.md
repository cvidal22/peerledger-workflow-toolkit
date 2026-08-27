# Changelog

Grouped by script, because installs happen one script at a time.

## 3.1.1

**All scripts** — fixed: `requireCore("3.0.0")` while using APIs introduced in 3.1.0. A cached older core passed the check and then died on the first call to a method it did not have, in the console, with no button and no explanation. This is exactly the failure `requireCore` exists to prevent.
- The bootstrap now probes the API the script needs, not merely that `PL` exists, and names the version it found
- `build/validate.js` asserts `requireCore(...)` and `@require ?v=` both match the shipped core version, so the two cannot drift again

**core/pl-core.js** — uncaught errors now surface as a banner on the page. A userscript that throws is otherwise completely invisible: no button appears and the operator has no way to say what went wrong.

**docs/styles.css** — fixed: long evidence filenames collapsed to one character per line. A flex item defaults to min-content width, and `break-all` on top of that breaks every character.

## 3.1.0

**core/pl-core.js (ui)** — replaced the shared docked panel with a left-edge dock of independent buttons. Each script owns one button, scoped to the pages where it applies, with its own badge and popover.
- `PL.ui.button` / `refresh` / `refreshContent` / `setState` / `liveBody` replace `PL.ui.section`
- Badge refresh is driven by a debounced DOM observer, not by navigation. Claiming a case from the pool changes neither the view nor the open case, so a navigation-keyed badge went stale
- Content redraw separated from badge refresh so an open popover holding typed text is not wiped

**All scripts** — converted from panel sections to buttons.

**tests/buttons.test.js** — new. Page scoping, badge liveness, popover lifecycle.

## 3.0.0

**core/pl-core.js**
- Added `registry` and `bus` — scripts publish entries, the launcher renders whatever it finds
- Added `exclusive` — one long-running loop at a time, no shared state required
- Added `guard` and `requireCore` — duplicate-install protection and loud failure on load-order mistakes
- Added `lang` — per-party language detection; outbound translated, notes never
- Added `review` — the pause before an irreversible write
- Added `marker` — verification by identity rather than row position
- Added `spa` — native property setters, real pointer sequences, visibility with the fixed-position exception, `nearest` for teleported menus
- Added `timer` — Worker-based interval that survives a backgrounded tab, with `setInterval` fallback
- Added `abort` — a stop signal that cannot be surfaced as an alert
- Fixed `adapter.readKv` — the host's placeholder dash is normalised to empty at the boundary, so templates fail properly instead of emitting `released -`
- Fixed language scoring — distinctive markers only, confidence measured against the nearest rival. Portuguese was previously detected as English because pt/es share vocabulary

**docs/scenarios.js** — new. Seven failure modes as URL switches: slow load, swallowed click, concurrent write, throttled timers, stale keep-alive view, colliding sidebar text, teleported menus.

**core/pl-core.js (spa.visible)** — fixed: only the element's own computed style was checked, so a control inside a collapsed ancestor read as visible. Now walks ancestors, which does not depend on a layout engine. Found by the `twins` scenario.

**scripts/macro-matrix.user.js** — new. Six case types × eight actions from one skeleton.

**scripts/compound-resolution.user.js** — new. Multi-step resolution through the chain runner.
- Fixed note verification: empty-state placeholder rows were counted as note rows, so the chain hung on cases with no prior history

**scripts/macro-launcher.user.js** — publishes to the registry instead of drawing its own list.

**scripts/queue-auto-claim.user.js** — joins mutual exclusion; stands down when another loop starts.

**All scripts** — `PL.guard` and `PL.requireCore` at entry; versions aligned to 3.0.0.

**build/** — new. `validate.js` checks syntax, metadata, duplicate `@name`, guard and core-requirement presence.

**tests/** — new. jsdom harness driving the real demo page.

**.github/workflows/ci.yml** — new. Validation and tests on every push.

## 2.0.0
- Console rebuilt with queue and case views, asynchronous actions, and a real precondition on closing
- Added chain runner, poll with backoff, macro launcher, resolution composer

## 1.0.0
- Initial: context aggregator, signal surfacer, resolution composer
