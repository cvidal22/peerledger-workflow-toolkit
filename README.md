# PeerLedger Workflow Toolkit

**A worked example of decomposing an operational workflow into what a human must decide and what a machine should have already done.**

Seven browser userscripts on a shared core, running against a fictional peer-to-peer dispute console. Live and installable in about two minutes.

**[→ Open the demo console](https://cvidal22.github.io/peerledger-workflow-toolkit/?toolkit=1)** — loads the toolkit straight into the page, no extension needed  ·  **[→ Engineering notes](ENGINEERING-NOTES.md)**  ·  **[→ Architecture](guide/ARCHITECTURE.md)**  ·  **[→ DOM cookbook](guide/dom-cookbook.md)**

*If you only read one thing here, read the [engineering notes](ENGINEERING-NOTES.md). The scripts demonstrate; that document explains what was learned building the real thing.*

---

## Why this exists

I spend my working day inside a dispute queue: two counterparties, one failed trade, conflicting accounts of what happened, and a decision that has to be defensible.

The decision is the job. Almost everything wrapped around it isn't — waiting on a queue to hand you the next case, retrieving context the interface split across five panels, re-reading a transcript for the same handful of policy markers, and retyping the same order reference into a user message and then again into an internal note.

So I started separating the two, measuring what the second category actually cost, and building against it. Around seventy scripts later, this repository is that method — rebuilt from scratch against an invented platform so it can be shown publicly.

> **On the source material:** every line here was written for this repository. No employer code, terminology, interface structure or process logic appears in it. The demo platform, its data and its rules are fictional. What is being shown is an approach, not an artefact.

---

## The decomposition

Working through one dispute end to end:

| Step | Nature | Handled by |
|---|---|---|
| Wait for the queue to release the next case | Mechanical, and *dead attention* | **Script** |
| Retrieve order state, counterparty history, claim, transcript, evidence | Mechanical retrieval | **Script** |
| Read the transcript for policy-violation markers | Mechanical scanning, **fatigue-sensitive** | **Script surfaces, human reads** |
| Weigh conflicting evidence between two parties | Judgement | **Human, always** |
| Decide whether the evidence is sufficient | Judgement | **Human, always** |
| Choose the resolution route | Judgement | **Human, always** |
| Write the user message and the internal case note | Mechanical composition | **Script** |
| Send it, record it, close the claim — in order, all or nothing | Mechanical, **and partially-failable** | **Script** |

The middle rows never move. The outer rows should never have been manual.

**Claim → aggregate → surface → decide → compose → commit.** The scripts occupy every step except the one in the middle.

---

## The scripts

### 1. Queue Auto-Claim
Polls the unassigned pool, claims the oldest waiting case, and stops.

Writing "click the button every five seconds" takes two minutes. What separates that from something you can leave running for a shift is: **backoff** (an empty pool is polled progressively less often, 5s → 60s), **a hard stop** (after a run of empty cycles it stops rather than hammering all night from a forgotten tab), **one at a time** (it claims a single case and disarms, so it can't build you a private backlog your colleagues can't see), and **no overlap** (a cycle can't start while the previous one is in flight).

All four live in `PL.poll`, so the next polling script inherits them. That's the actual payoff of a shared core — the second script is where the first one's scar tissue stops being rework.

It doesn't cherry-pick. It takes the oldest waiting item, the same one you'd have taken, because a script that picks the easy cases quietly reshapes what the rest of the team is left holding.

### 2. Context Aggregator
Reads all five panels on case load and renders one brief: the order facts that set severity, the counterparty comparison that usually drives credibility, and the evidence inventory.

It encodes exactly one judgement, stated openly in the source: that putting complainant and defendant side by side is worth doing early. Everything else is verbatim — if you'd have to trust the script's *reading* of something rather than check it at a glance, it isn't shown.

### 3. Signal Surfacer
Runs a pattern set over the transcript and claim statement, flagging off-platform solicitation, third-party payment indicators, release pressure, unverified bank-delay claims, and re-trade requests. Each flag carries the line it matched, who said it, and why the pattern exists. Clicking it jumps to the source.

**It has no verdict.** It cannot restrict, score, rank, or recommend. It answers one question — *is there a line here you would want to have read?* — and hands the line back.

That limit is the most important design decision in the repository, for two reasons. An operator shown a conclusion starts agreeing with it; give people a confidence score and within a week they're reviewing the score instead of the case, and the automation is silently deciding outcomes it was never validated to decide. And a pattern matcher cannot see the coercion phrased politely or the scam that used none of these words — something with no concept of its own blind spots has no business producing a verdict.

So it optimises for recall and accepts false positives as the price. A false positive costs a second of reading. A missed off-platform solicitation costs a user their money.

### 4. Macro Launcher
One keystroke opens a fuzzy-filtered palette. Type three letters, hit enter, and the macro is inserted with every field resolved from the open case.

A dropdown is fine at eight entries and hostile at sixty — you stop reading it and start scrolling it, so people use the six they can find and hand-type the rest. The library grows and its usable surface doesn't. Fuzzy filtering makes recall beat recognition: you don't need to know where "third-party payment" sits in the list, only that it matches `tpp`. That's the difference between a library of sixty that gets used and one that decays into six.

**If a template needs a field the case doesn't have, it refuses to insert** and says which token was missing. The tempting alternative — insert it with the gap left in — is how `{{orderRef}}` ends up in front of a user, because the operator is moving fast and the placeholder looks like text.

### 5. Resolution Composer
After the operator picks a route, fills that route's templates from live case data and produces both artefacts — the user-facing message and the internal note.

Composition runs strictly *after* judgement. Nothing suggests a route, pre-selects one, or sorts them by likelihood. The moment a composer starts ranking routes it becomes a decision system wearing a text editor's clothes, and it gets evaluated as one by nobody, because it still looks like a formatting convenience.

Only the internal note can be inserted automatically. Anything a real person receives passes through a human's eyes at full attention — one copy step is the cheapest possible way to guarantee that.

### 6. Compound Resolution
Runs a full resolution as one gesture: send the user message, record the case note, close the claim.

The naive version of this — three clicks behind one keystroke — takes ten minutes to write and is actively dangerous. **A browser UI has no transactions.** A chain that assumes success produces *partial* failures: the message goes out, the note never saves, the claim stays open. The user has been told their case is resolved; the audit trail says nobody touched it. Partial failure is worse than no automation, because no automation fails visibly and this fails silently.

So `PL.chain` supplies the properties the UI doesn't have:

| Property | What it prevents |
|---|---|
| **Preflight** | Aborting at step three. Conditions are checked while nothing has happened yet — the only mechanism that avoids partial state rather than reporting it afterwards. |
| **Verify** | Trusting the click. Each step polls the page for evidence it landed; a save that silently didn't persist is the failure that costs most to discover late. |
| **Abort** | Continuing into steps that assume success. |
| **Report** | Silent partial failure. On abort the operator is told exactly which steps committed, before they retry and double-send. |
| **Lock** | Overlapping runs. Impatient double-taps collapse to one. |
| **Once** | Re-running a completed chain on the same case. Double-sending a resolution to someone who just lost money is not recoverable. |
| **Confirm** | Irreversible steps happening unattended — and the dialog shows what already committed before asking. |

Three design calls worth stating, because they're the ones a reviewer should push back on:

**It does not retry.** Retrying a step that may have half-succeeded risks double-sending to a user.

**It does not roll back.** Rollback is a lie in a UI with no undo — claiming to have reverted something you only clicked at is a worse failure than honestly reporting the partial state. On abort it names what committed and tells the operator to finish by hand.

**Only the irreversible step confirms.** Confirming everything trains people to dismiss dialogs unread, which destroys the value of the one dialog that matters.

One bug in this script is worth mentioning because it's the kind only testing finds: the host renders an empty-state placeholder row when a case has no notes, so counting table rows to verify "the note saved" never confirmed on a first-note case — the chain hung on exactly the cases with no history. The verification now counts real note cells. Reading the code would not have caught it.

### 7. Macro Matrix
Generates the full case-type × action grid — six types by eight actions here, forty-eight macros — from **one execution skeleton**. Types and actions are declared as data; only wording varies per cell.

This is the script that answers *how does a suite reach seventy-odd macros without collapsing*. Written individually, seventy-two macros aren't seventy-two units of work, they're seventy-two units of **divergence**: a fix to deadline parsing lands in the four you remembered and the other sixty-eight keep the bug. As a matrix, a fix to sequencing, verification or language routing lands everywhere at once and *cannot* land unevenly. A seventh case type is a data entry, not a new file.

Three things in the skeleton worth reading:

**Language is resolved per party, from that party's own messages.** The two sides of a dispute frequently don't share a language. Outbound messages are translated into each recipient's; **internal notes are never translated**, so any colleague or auditor can pick up any case cold. Getting that backwards produces an audit trail nobody can read — far more expensive than an awkward translation. Open claim **PL-205188** to see it: the buyer writes Spanish, the seller writes English, same case.

**Saves are verified by a unique marker, not by counting rows.** On a shared queue, a colleague saving at the same instant satisfies a row count and produces a false confirmation for a write that never landed. Verify by identity, never by position.

**The review gate stops the chain immediately before the save.** The chain can prove a save happened; it cannot prove the text was right, and a confidently-executed wrong note is authoritative, permanent, and believed by the next person who reads it. So the mechanical work completes, then the wording comes back for editing. That's the line between automating the typing and automating the judgement.

---

## The demo console misbehaves on purpose

A clean mock is a bad test target. Automation that only runs against a synchronous, single-rendered, well-behaved page looks correct right up until it meets a real application — and then fails intermittently, in ways almost impossible to reproduce.

So the failure modes are switches on the URL:

| Scenario | What it does |
|---|---|
| [`?scenario=slow`](https://cvidal22.github.io/peerledger-workflow-toolkit/?scenario=slow) | Fields render as `--` and populate after a delay |
| [`?scenario=noop`](https://cvidal22.github.io/peerledger-workflow-toolkit/?scenario=noop) | The first save on a case is silently swallowed |
| [`?scenario=concurrent`](https://cvidal22.github.io/peerledger-workflow-toolkit/?scenario=concurrent) | A colleague writes to the case at the same instant you do |
| [`?scenario=throttle`](https://cvidal22.github.io/peerledger-workflow-toolkit/?scenario=throttle) | Timers clamped to one tick a minute, as in a background tab |
| [`?scenario=stale`](https://cvidal22.github.io/peerledger-workflow-toolkit/?scenario=stale) | The previous view stays mounted, so two tables exist at once |
| [`?scenario=twins`](https://cvidal22.github.io/peerledger-workflow-toolkit/?scenario=twins) | Collapsed sidebar entries duplicate on-page button labels |
| [`?scenario=menus`](https://cvidal22.github.io/peerledger-workflow-toolkit/?scenario=menus) | Menus render into `<body>`; several can be open at once |

Combine them: `?scenario=slow,concurrent`.

`tests/scenarios.test.js` runs the scripts against each one. The `concurrent` case is the clearest single argument in the repository:

```
scenario=concurrent
  ok    two writes landed, not one — 1 -> 3
  ok    row-count check would have passed on either write
  ok    marker finds MY write specifically
  ok    marker does not match a write I never made
```

That is the difference between verification that looks right and verification that is right — and it only shows up on a page willing to misbehave.

Writing the `twins` scenario also found a real bug in `PL.spa.visible`: it checked the element's own computed style but not its ancestors, so a button inside a collapsed container read as visible. In a browser `offsetParent === null` hides that mistake; the helper was leaning on layout it shouldn't need. It now walks ancestors, which is correct with or without a layout engine. **The scenario existed for about ten minutes before it caught something.**

---

## Repository layout

```
core/pl-core.js      the shared runtime — every script depends on this and nothing else
scripts/             seven userscripts, each one file
docs/                the demo console (GitHub Pages root) — including scenarios.js
guide/               ARCHITECTURE · dom-cookbook · adding-a-macro · troubleshooting
build/validate.js    syntax + metadata gate
build/scrub-fixture.py  strips identifying data from a captured DOM before it becomes a fixture
tests/               jsdom harness driving the real demo page
.github/workflows/   CI: validate, then run the tests
```

```bash
node build/validate.js   # syntax, metadata, duplicate @name, guards
npm test                 # the above plus behavioural tests
```

Validation is not ceremony. **A userscript with a syntax error fails silently** — the extension accepts it, it never runs, and the only clue is a button that stopped appearing. Every check in `validate.js` exists because the failure it catches is invisible.

---

## Architecture

```
  ┌───────────────────────────────────────────────────────────────┐
  │ auto-claim aggregator surfacer macros composer compound matrix│
  │                                                               │
  │  consume plain Case / QueueRow objects. Zero selectors.       │
  └───────────────────────────┬───────────────────────────────────┘
                              │
  ┌───────────────────────────▼───────────────────────────────────┐
  │                         pl-core.js                            │
  │                                                               │
  │   ui         one docked panel, shared sections                │
  │   overlay    keyboard-first filter palette                    │
  │   hotkeys    one listener for the whole toolkit               │
  │   poll       backoff · hard stop · no overlap                 │
  │   chain      preflight · verify · abort · report · lock        │
  │   waitFor    poll a condition instead of guessing a delay      │
  │   review     the pause before an irreversible write            │
  │   lang       per-party detection · translate out, never notes  │
  │   marker     verification that survives concurrent writes      │
  │   timer      an interval that survives a backgrounded tab      │
  │   spa        native setters · real pointer events · visibility │
  │   template   strict tokens, loud failure                      │
  │   insert     framework-safe writes into host fields           │
  │   watch      SPA-safe case-change detection                   │
  │   ───────────────────────────────────────────────────────     │
  │   adapter    ← the ONLY DOM-coupled code in the project       │
  └───────────────────────────┬───────────────────────────────────┘
                              │
                     ┌────────▼────────┐
                     │  host console   │
                     └─────────────────┘
```

**One layer is allowed to know what the page looks like.** `PL.adapter` converts pixels into a normalised object and stops — it makes no decisions, ranks nothing, filters nothing. Everything above it operates on data and has no idea whether it came from a scrape, an API, or a fixture.

When the host ships a redesign, one function breaks instead of five scripts. That boundary is the reason a toolkit like this survives contact with a product team that ships weekly, and the reason the same scripts kept running through interface changes rather than being rewritten each time.

Three smaller decisions that came from things going wrong:

- **`PL.watch`** — single-page apps don't reload. A script bound to `document-ready` runs once and then quietly goes stale, which is worse than not running at all, because the operator keeps trusting it. Case identity is observed and debounced instead.
- **`PL.template`** — an unresolved token raises rather than rendering `Dear {{name}}` into something an operator then sends.
- **`PL.adapter.readKv`** — the host renders "not applicable" as a dash. Normalising that to empty *at the boundary* is what lets the template layer fail properly instead of emitting `released -` into a user's message. Host presentation conventions get resolved once, at the edge, rather than leaking into every consumer.

---

## The interface

Seven scripts, seven buttons, docked at the left edge — the one screen region a dense data table never uses.

| Button | Appears on | What it does |
|---|---|---|
| **Auto Claim** | queue, pool | Toggle. Badge shows how many cases are waiting. Claims one, then disarms. |
| **Brief** | case | Assembled case brief. Badge shows evidence count. |
| **Flags** | case | Policy-pattern matches. Badge shows how many, so you know without opening it. |
| **Macros** | case | Opens the note-macro palette directly — no popover in the way. |
| **Compose** | case | Builds the user message and internal note for a chosen route. |
| **Resolve + Close** | case | Runs the full chain: message, note, close. |
| **Matrix** | case | The full case-type × action grid. Badge shows the cell count. |

A button that cannot act is dimmed and says why on hover, and clicking it says why rather than doing nothing — `Auto Claim` off the pool, or any action button on a closed claim. A control that silently ignores a click reads as broken, and the operator retries instead of reading.

Three deliberate choices:

**A button per script, not one shared panel.** A panel is a single surface every script has to share, so installing one means accepting everyone's UI. With a button each, install three of the seven and you get three buttons.

**Buttons only appear where they apply.** `Auto Claim` is meaningless on a case page and the case buttons are meaningless on the queue, so they aren't rendered there. An open popover closes if its button stops applying.

**Badges are live.** They track the page rather than navigation, because claiming a case from the pool changes neither the view nor the open case — a badge keyed on those would go stale. A stale count on a button is worse than no count, because it gets believed.

## Try it

**Without installing anything:** open the [demo with the toolkit loaded](https://cvidal22.github.io/peerledger-workflow-toolkit/?toolkit=1). The same seven files, loaded as page scripts instead of by an extension — nothing is forked for preview mode.

**As it actually runs**, in an extension:

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Edge, Safari).
2. Click each script below — Tampermonkey will offer to install it.
   - [Queue Auto-Claim](https://raw.githubusercontent.com/cvidal22/peerledger-workflow-toolkit/main/scripts/queue-auto-claim.user.js)
   - [Context Aggregator](https://raw.githubusercontent.com/cvidal22/peerledger-workflow-toolkit/main/scripts/context-aggregator.user.js)
   - [Signal Surfacer](https://raw.githubusercontent.com/cvidal22/peerledger-workflow-toolkit/main/scripts/signal-surfacer.user.js)
   - [Macro Launcher](https://raw.githubusercontent.com/cvidal22/peerledger-workflow-toolkit/main/scripts/macro-launcher.user.js)
   - [Resolution Composer](https://raw.githubusercontent.com/cvidal22/peerledger-workflow-toolkit/main/scripts/resolution-composer.user.js)
   - [Compound Resolution](https://raw.githubusercontent.com/cvidal22/peerledger-workflow-toolkit/main/scripts/compound-resolution.user.js)
   - [Macro Matrix](https://raw.githubusercontent.com/cvidal22/peerledger-workflow-toolkit/main/scripts/macro-matrix.user.js)
3. Open the **[demo console](https://cvidal22.github.io/peerledger-workflow-toolkit/)**.

The buttons dock at the left edge and only appear on pages where they apply. Install order doesn't matter — the core loads via `@require`, and every script calls `PL.requireCore()` and refuses to start rather than degrading silently if it's missing. If you upgrade, **remove the old versions first**: two copies of a script bind two listeners and everything fires twice.

**A 60-second tour:** open the unassigned pool (`Alt+P`), arm auto-claim (`Alt+A`), and watch it pull a case. Then open **PL-204902** from your queue — the brief fills, three policy patterns flag. Hit `Alt+K`, type `tpp`, press enter: a macro lands in the note field with the order reference and both handles already filled. Then `Alt+W` composes the recovery route.

**To see the matrix,** press `Alt+M` on claim **PL-205160** — cells matching the open case sort to the top. Run `OVP · Recovery opened`: the outbound message goes out in Portuguese, and the note comes back to you in English for review before it saves.

**To see the chain runner do its job, try to break it.** On a fresh case, press `Alt+1` — message, note and close all execute and verify in sequence. Now open a different case, send a message by hand first, and press `Alt+1` again: preflight refuses and *nothing runs*, because a second message to the same user is the failure it exists to prevent.

| Key | Action |
|---|---|
| `Alt+A` | Arm / disarm auto-claim |
| `Alt+P` | Jump to the unassigned pool |
| `Alt+K` | Macro palette |
| `Alt+2` | Scroll to the transcript |
| `Alt+Q/W/E/R` | Compose a resolution route |
| `Alt+1` / `Alt+2` | Run a full resolution chain |
| `Alt+M` | Macro matrix (48 cells, this case's type first) |
| `Alt+\` | Collapse the panel |

---

## What this is not

- Not a scraper for any real platform. The `@match` rule targets the demo page only.
- Not an automated decision system. Seven scripts, zero verdicts — the chain executes a decision a human already made.
- Not a framework. It's small on purpose; the interesting part is the boundary, not the line count.

---

## Result

The real suite behind this is roughly 95 active userscripts covering six case types, sustaining about double the team throughput target. It is in active use by colleagues on the team, with formal organisation-wide rollout pending internal audit sign-off. Thirteen separate process improvements developed alongside it were adopted as standard practice.

Other people depending on it is the part that shaped the engineering: tooling only you use can fail quietly, because you know what it does. Tooling colleagues rely on has to survive workflows it wasn't designed for and operators who won't read the notes — which is most of why the failure handling and the review gate exist.

The numbers are the outcome. The [decomposition](#the-decomposition) and the [engineering notes](ENGINEERING-NOTES.md) are the method.

---

## Stack

Vanilla JavaScript, no build step, no dependencies. Userscripts run in Tampermonkey; the demo console is static and hosted on GitHub Pages.

MIT licensed — see [LICENSE](LICENSE).

**Caio Vidal** · [LinkedIn](https://www.linkedin.com/in/caiovidal22/)
