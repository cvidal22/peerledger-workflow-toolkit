# Changelog

Grouped by script, because installs happen one script at a time.

## 6.1.2

**Fixed: the toolkit dock overlapped the host page.** With no surface of its own, the version label collided with the sidebar's own headings and the whole dock read as broken rather than as an overlay. It now sits on a translucent card with a border and shadow, legible over anything behind it.

**Breadcrumbs said "Work queue"** while the navigation said "Task pool". Both now say Task pool.

## 6.1.1

**Fixed: the live demo could serve an old version after an update.** Only the toolkit bundle carried a cache-busting version; `styles.css`, `data.js`, `app.js` and `preview.js` did not, so a browser or the Pages CDN kept serving the previous page shell while the toolkit inside it was current. `build/bundle.js` now stamps those assets with the shipped version, and `--check` fails the build if they drift — so this cannot be forgotten on a future release.

## 6.1.0

**Demo GIF recorded and added to the README.** Captured by driving the real page in headless Chromium rather than staged, so it shows the actual toolkit: Auto Claim opening the top case, then one macro messaging the seller, setting the deadline, writing the note and filing the case. `build/record.js` reproduces it.

**Fixed the step counter in the run panel.** It read `12/4` on a four-step macro — the count incremented on every progress report instead of once per step, and `onProgress` reports the whole log each tick. It now counts completed rows. Found while reviewing a captured frame.

## 6.0.1

**Engineering notes replaced with the author's revision.** The reactive-page quirks list and the closing principles were removed — the DOM quirks are already covered in `guide/dom-cookbook.md`, which is where someone would look for them. Fixed three typos and an editor artefact carried over from the draft.

**README** aligned on one phrase: rollout and audit are "continuously in progress".

## 6.0.0

**Scenario system removed.** `docs/scenarios.js` and its test are gone, along with the slow-load, swallowed-click, concurrent-write, throttling, stale-view, hidden-sidebar and teleported-menu simulations, plus the CSS and documentation for them. It was a development aid, and carrying it in a portfolio repository meant explaining a feature the demo no longer surfaced.

**tests/verification.test.js** — new, and small. The README claims notes are verified by a unique marker rather than by counting rows; the scenario suite used to be the only thing proving it. This test stages a colleague's write landing instead of yours and shows the row count reporting success while the marker correctly reports failure.

## 5.3.0

**README replaced with the author's own revision** — terminology, phrasing and several factual corrections: the deadline is only carried forward when the case was handled before, the note is also written to a tracker, what is requested and how long the party gets are set by SOP, and the thirteen adopted process improvements are separate from the scripts rather than the same thing.

**Engineering notes rewritten to match** that voice and those corrections, and extended with a short section on the scenario switches — the feature exists in the code and CI but is no longer described in the README.

## 5.2.2

**Reframed how the work is described.** The previous wording ("I handle payment disputes for a living") made the dispute queue sound like the whole job and hid the part that matters — that the automation was identified and built without being asked. Both the README and the notes now say what the decision work actually involves before describing what was automated around it.

## 5.2.1

**README restructured around what a visitor actually does.** "Try it" is now the first thing after the title, with three numbered steps and what to watch for. The build badge, a slot for the demo GIF, and a table showing exactly what one macro does are near the top; the reasoning moved below.

**docs/media/** — new, with recording instructions for the GIF. The image tag is commented out so the README stays clean until the file exists rather than showing a broken image.

## 5.2.0

**Documentation rewritten shorter and plainer.** About 8,900 words down to 4,800. The previous version was over-polished — every paragraph landed on a neat conclusion, nothing was ever uncertain, and it read as written by committee rather than by the person who built it. Same content, fewer words, plain language, and the mistakes I made left in.

## 5.1.1

**README rewritten** against the current toolkit. It still documented two scripts that no longer exist and a seven-button layout that had been three for several releases.

**tests/readme.test.js** — new, and the point of it. It asserts what the README claims: three buttons, three lists, inert scenery, 48 macros, the six type codes, the four documented steps, and that a Portuguese buyer gets a Portuguese message while the remark stays English. Documentation that drifts from the code is worse than none — it is confidently wrong.

Writing it caught two real bugs:
- The inert navigation items were still anchors with live `href`s. An earlier patch had matched a string the file did not contain, so they had never actually been made inert.
- The sent-message log truncated at 90 characters, which cut off the language marker the translator appends — hiding the one part of a sent message worth checking at a glance. It now elides the middle and keeps both ends.

## 5.1.0

**Renamed to the Dispute Simulator**, set in one weight.

**Every appeal starts in the task pool.** The separate unassigned pool was a distinction the workflow does not have: appeals are distributed to an operator, and the only way out of the pool is being handled. Auto Claim now navigates to the task pool, refreshes it, and opens the top appeal.

**Escalations removed.** It filtered by priority, which was my invention rather than a stage of the work. Three lists — Task pool, Handling, Closed — are the whole model.

**Scenery is dimmed rather than struck through**, and stays clickable: the page it opens explains what would be there, which is more use than a control that refuses to respond.

## 6.1.2

**Fixed: the toolkit dock overlapped the host page.** With no surface of its own, the version label collided with the sidebar's own headings and the whole dock read as broken rather than as an overlay. It now sits on a translucent card with a border and shadow, legible over anything behind it.

**Breadcrumbs said "Work queue"** while the navigation said "Task pool". Both now say Task pool.

## 6.1.1

**Fixed: the live demo could serve an old version after an update.** Only the toolkit bundle carried a cache-busting version; `styles.css`, `data.js`, `app.js` and `preview.js` did not, so a browser or the Pages CDN kept serving the previous page shell while the toolkit inside it was current. `build/bundle.js` now stamps those assets with the shipped version, and `--check` fails the build if they drift — so this cannot be forgotten on a future release.

## 6.1.0

**Demo GIF recorded and added to the README.** Captured by driving the real page in headless Chromium rather than staged, so it shows the actual toolkit: Auto Claim opening the top case, then one macro messaging the seller, setting the deadline, writing the note and filing the case. `build/record.js` reproduces it.

**Fixed the step counter in the run panel.** It read `12/4` on a four-step macro — the count incremented on every progress report instead of once per step, and `onProgress` reports the whole log each tick. It now counts completed rows. Found while reviewing a captured frame.

## 6.0.1

**Engineering notes replaced with the author's revision.** The reactive-page quirks list and the closing principles were removed — the DOM quirks are already covered in `guide/dom-cookbook.md`, which is where someone would look for them. Fixed three typos and an editor artefact carried over from the draft.

**README** aligned on one phrase: rollout and audit are "continuously in progress".

## 6.0.0

**Scenario system removed.** `docs/scenarios.js` and its test are gone, along with the slow-load, swallowed-click, concurrent-write, throttling, stale-view, hidden-sidebar and teleported-menu simulations, plus the CSS and documentation for them. It was a development aid, and carrying it in a portfolio repository meant explaining a feature the demo no longer surfaced.

**tests/verification.test.js** — new, and small. The README claims notes are verified by a unique marker rather than by counting rows; the scenario suite used to be the only thing proving it. This test stages a colleague's write landing instead of yours and shows the row count reporting success while the marker correctly reports failure.

## 5.3.0

**README replaced with the author's own revision** — terminology, phrasing and several factual corrections: the deadline is only carried forward when the case was handled before, the note is also written to a tracker, what is requested and how long the party gets are set by SOP, and the thirteen adopted process improvements are separate from the scripts rather than the same thing.

**Engineering notes rewritten to match** that voice and those corrections, and extended with a short section on the scenario switches — the feature exists in the code and CI but is no longer described in the README.

## 5.2.2

**Reframed how the work is described.** The previous wording ("I handle payment disputes for a living") made the dispute queue sound like the whole job and hid the part that matters — that the automation was identified and built without being asked. Both the README and the notes now say what the decision work actually involves before describing what was automated around it.

## 5.2.1

**README restructured around what a visitor actually does.** "Try it" is now the first thing after the title, with three numbered steps and what to watch for. The build badge, a slot for the demo GIF, and a table showing exactly what one macro does are near the top; the reasoning moved below.

**docs/media/** — new, with recording instructions for the GIF. The image tag is commented out so the README stays clean until the file exists rather than showing a broken image.

## 5.2.0

**Documentation rewritten shorter and plainer.** About 8,900 words down to 4,800. The previous version was over-polished — every paragraph landed on a neat conclusion, nothing was ever uncertain, and it read as written by committee rather than by the person who built it. Same content, fewer words, plain language, and the mistakes I made left in.

## 5.1.1

**README rewritten** against the current toolkit. It still documented two scripts that no longer exist and a seven-button layout that had been three for several releases.

**tests/readme.test.js** — new, and the point of it. It asserts what the README claims: three buttons, three lists, inert scenery, 48 macros, the six type codes, the four documented steps, and that a Portuguese buyer gets a Portuguese message while the remark stays English. Documentation that drifts from the code is worse than none — it is confidently wrong.

Writing it caught two real bugs:
- The inert navigation items were still anchors with live `href`s. An earlier patch had matched a string the file did not contain, so they had never actually been made inert.
- The sent-message log truncated at 90 characters, which cut off the language marker the translator appends — hiding the one part of a sent message worth checking at a glance. It now elides the middle and keeps both ends.

## 5.1.0

**One queue.** Every appeal is in the task pool. The unassigned pool and the Escalations tab were both mine, not the workflow's — an appeal is distributed to an agent and sits with them until it is handled, and from where the operator sits that is the only queue there is. Three lists remain: Task pool → Handling → Closed.

**Auto Claim opens the next appeal in the task pool.** It navigates there, refreshes, and opens the top row. There is no longer anything to claim from, so it no longer pretends there is.

**Scenery is dimmed rather than struck through**, and is not clickable at all — no click needed to discover it does nothing.

**Logo set in one weight and size.**

## 5.0.1

**Renamed to the Dispute Simulator.**

**Fixed: the task pool could come back showing an appeal that had just been handled.** Navigating to the queue was not enough — the app can re-render the list it held before the appeal moved. The toolkit now waits for the queue to be on screen and presses its own Refresh, which is what the operator would do and is visible while it happens. Auto Claim does the same before reading the pool, so it cannot claim from a stale row.

**Inert navigation is marked.** Users, Orders, Recovery, Reports, Config and the recovery sub-nav are struck through, dimmed and not clickable, with a tooltip saying they are scenery. Previously they routed to a placeholder page, which read as a broken feature rather than a deliberate boundary.

*Version deliberately left at 5.0.0 on the dock, as requested — the demo always fetches a fresh bundle, so the label is not what determines whether you are on the current build.*

## 5.0.0

**Failure modes renamed for what happened**, not for who complained: `RWP` released without payment, `CBP` cancelled but paid, `CBK` chargeback, `OVP` overpaid, `UND` underpaid, `BAF` bank account frozen. A code that only means something to the team that coined it costs every new operator a translation step.

**Fixed: an appeal could stay in the task pool after being handled.** Three macros — recovery settled, not upheld, authority referral — neither parked nor closed, so they finished the matter and left the appeal sitting in the queue to be worked twice. All three now close. The engine refuses to run any macro that would leave an appeal in the pool rather than trusting the table to be right.

**The queue is always in id order** and appeals are numbered after ordering, so the task pool reads 01, 02, 03 from the top. Auto Claim takes the top row, so "the top one" needs to mean the same thing every time.

**Renamed to the Dispute Handling Console.**

## 4.3.1

**The yellow palette actually shipped this time.** The 4.3.0 patch hit an assertion and exited before writing, so none of the colour changes were saved — the build was still violet while the changelog said otherwise. Verified against the built bundle rather than the source: zero violet values remain.

**The dock shows the running version** (`toolkit 4.3.1`). "Am I looking at the new build?" has come up repeatedly and the answer belongs on screen.

**The demo always fetches a fresh bundle.** A browser serving a cached copy is indistinguishable from a change that did not work, which has cost more debugging here than any real defect.

**Faster pacing.** The action spotlight was 480ms a step, which made a six-action macro take seven seconds and read as hung. At 300ms the same run takes about four and every step is still legible; the return to the task pool follows 900ms after.

## 4.3.0

**The toolkit is yellow.** Buttons, popovers, run panel, toasts and the action spotlight, so every element the toolkit owns or touches is the same colour and clearly not the platform's.

**The review gate is off by default.** The mechanism is unchanged and `PL.review.enabled = true` restores it. Macros now run end to end without pausing: message, deadline, remark, and park or close.

**Verified both destinations.** A follow-up macro leaves the appeal in Handling; a closing macro leaves it in Closed. Either way it drops out of the task pool and the toolkit returns there.

## 4.2.0

**Auto Claim takes the top row as displayed**, not the oldest by parsed age. Re-sorting on a column the script parsed itself meant the automation quietly disagreed with the queue in front of the operator — they saw the first row and got the fourth. If the ordering is wrong, that belongs to the queue, in one place, for everyone.

**Every action shows where it is acting.** `PL.spa.touch` scrolls the target into view, outlines it, and pauses before acting; `setSlow` and `clickSlow` wrap the write and the click. Deliberate cost, and what makes the automation watchable rather than merely fast. `PL.spa.paceMs = 0` disables it.

**No confirmation before closing.** The macro's name says it closes the appeal, and the review gate one step earlier already asked for the operator's attention. A dialog dismissed without reading protects nobody.

**The toolkit has its own palette.** Buttons, popovers and the run panel are violet rather than the console's teal, so it is always obvious which controls the platform shipped and which were added on top.

## 4.1.0

**A handled appeal returns you to the task pool.** When a macro parks or closes an appeal it has left the pool, so the page you are on has nothing left to do. The toolkit goes back to the list after the run so the next appeal is one click away.

**The appeal page is lighter.** Prior-dispute history, party flags, completed-order counts, KYC country and the case timeline are gone — on screen for every appeal, read on almost none, and they buried the parts a macro actually changes.

**Attribution in the top bar**, linking to the repository.

**Fixed a self-inflicted break worth recording.** Trimming the party panel renamed its field labels, and `PL.adapter` reads parties by label — so it returned empty handles, the template refused to render on a missing token, and the macro declined to run. It failed correctly and silently. Two changes: the labels that remain are marked as an interface in the code, and a template failure now raises the run panel with the missing field named instead of a toast. A macro that quietly declines is indistinguishable from a button that did not register the click.

## 4.0.0

**Seven buttons became three.** Compose and Resolve + Close duplicated what a macro already did, and Matrix ran the same code as Macros. Removed.

- `resolution-composer` and `compound-resolution` deleted; their routes exist as macros
- `macro-matrix` → `macro-engine`: defines and runs every macro, registers no button
- `signal-surfacer` registers no button; it publishes its scan and the Brief renders it, with the flag count as the Brief's badge
- Closing macros added (`Uphold and close`, `Reject and close`), so a macro can end an appeal as well as park it

**The sequence is visible while it runs.** `PL.ui.runPanel` lists every step before the run starts and moves each one pending → running → done on screen. On success it lingers and fades; on failure it stays until dismissed. Built so a recording shows what the macro actually did.

**Removed the scenario banner from clean runs.** It was a paragraph of explanation above a console that had not gone wrong. The switches still work from the URL.

**Removed the Incoming — unassigned nav item.** Auto Claim still draws from it; it did not need to be a page the operator browses.

## 3.5.0

**Fixed: the Macros button never sent the message.** It kept its own list of note-only templates while the full send-window-remark-park sequence lived in Macro Matrix. Two implementations of "run a macro" drifted, and this one quietly did a third of the job. Macro Matrix now publishes every cell to the shared registry and the launcher renders those, so both buttons run the same executor.

**Parties are addressed by trading role.** Messages and remarks say *the buyer* and *the seller* rather than a handle; handles and user IDs stay in the remark for the audit trail. Party panels are headed by role as well as procedural side.

**Queue model matches the operator's.** Task pool (assigned, still to handle) → Handling (actioned, awaiting a reply) → Closed. Incoming — unassigned is the source auto-claim draws from.

**Macro palette** — the macro name is now the largest element in the row and the type code is a right-aligned chip. The code is a filing reference: useful for filtering, useless for recognition.

## 3.4.0

**Macros run the whole sequence.** A macro now messages the correct party, sets that action's response window, records the remark behind the review gate, and parks the case — four mechanical acts around one decision. Recipient and window are declared per action rather than chosen at run time.

**Handled pool.** A third list beside the unassigned pool and the active queue: claims actioned and waiting on the other side. The active queue now shows only work that can be progressed now.

**scripts/queue-auto-claim.user.js** — one click runs it. The arm-then-confirm step was a second decision for something the operator decided by reaching for the button.

**core/pl-core.js**
- Fixed popovers being cut off at the bottom: height was measured **before** the content was rendered, so the box was placed as though nearly empty and the real content ran off screen. Now renders, measures, then places — and re-places when content grows
- Fixed the popover closing itself mid-run: the toolkit's own synthetic clicks on the host page registered as "clicked outside". Only trusted events dismiss now
- The toolkit's own overlays no longer count as outside either

**docs** — message recipient picker (complainant / defendant / both), follow-up and return-to-queue controls.

## 3.3.2

**docs/preview.js** — the demo now loads the toolkit automatically when the page is opened straight from the filesystem. Double-clicking `docs/index.html` is enough to see it working: no server, no build, no extension, nothing to install. The bundle sits in the same folder, so it loads over `file://` where the individual sources would not.

**guide/DEVELOPING.md** — rewritten around that, with the local server as an optional extra rather than a prerequisite.

## 3.3.1

**docs/preview.js** — added `?dev=1`, which loads the individual source files instead of the bundle, with a cache-busting timestamp on each. Editing a file and refreshing is now the whole loop: no build, no upload, no reinstall. Only works against a locally served repository root, which is where iteration happens anyway.

**guide/DEVELOPING.md** — new. Local workflow, the three ways to run the toolkit, and what to do before pushing.

## 3.3.0

**docs/preview.js + build/bundle.js** — fixed: the preview hung forever. It fetched `../core/pl-core.js`, but GitHub Pages publishes only `docs/`, so that path is a 404 — and raw.githubusercontent serves JavaScript as `text/plain` with `nosniff`, which browsers refuse to execute, so that was not an alternative. The demo now loads one generated same-origin bundle, built from the real sources; `validate.js` and CI fail if it drifts. The loader also times out, verifies the toolkit actually started, and reports why it failed.

**scripts/queue-auto-claim.user.js** — works from any page. Arming navigates to the pool, waits for the list to render, claims the oldest waiting case and opens it, all in one pass. The previous version returned after navigating, which the poller counted as an empty cycle and backed off from.

**docs** — disputes are named `Dispute01`…`Dispute10`. The `Type` column is gone from the work queue; claim type belongs on the case, not the list.

**core/pl-core.js**
- `adapter.readQueue` locates columns by **header text** rather than fixed index. A positional read does not throw when a column is removed — it silently returns the neighbouring column
- Dock moved to the bottom-left as pill buttons, clear of table rows; popovers open upward and clamp to the viewport

## 3.2.0

**docs/preview.js** — new. A visitor can load the toolkit into the page without installing an extension. Nobody evaluating a repository installs a browser extension to look at it, so a demo that requires setup before it shows anything is a demo nobody sees. The same seven files are loaded; nothing is forked for preview.

**core/pl-core.js (ui)**
- Buttons accept a `disabled()` predicate returning a reason. Dimmed, reason on hover, and clicking says why rather than doing nothing
- Buttons accept `hotkey` and show it in the tooltip
- Fixed a mutation-observer feedback loop: `refresh()` writes badge text and title attributes, which are mutations, which triggered `refresh()` again. Mutations originating inside the toolkit are now ignored, and writes only happen on change
- Dock carries a small "toolkit" label so it reads as one tool rather than stray widgets

**scripts** — `Auto Claim` is actionable only on the pool; the action buttons dim on a closed claim. `Compose` separates its route buttons from its output actions.

## 3.1.2

**All scripts** — `@require` moved from jsDelivr to `raw.githubusercontent.com`. jsDelivr caches a branch URL for up to 12 hours and **ignores query strings**, so the `?v=` cache-buster added in 3.1.1 did nothing: an updated core kept serving stale and no button ever appeared. Raw caches for five minutes and honours the query. `build/validate.js` now fails the build if a script points at a CDN host.

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
