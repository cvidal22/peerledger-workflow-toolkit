# PeerLedger Workflow Toolkit

**A worked example of decomposing an operational workflow into what a human must decide and what a machine should have already done.**

Three browser userscripts on a shared core, running against a fictional peer-to-peer dispute console. Live and installable in about two minutes.

**[→ Open the demo console](https://cvidal22.github.io/peerledger-workflow-toolkit/)**

---

## Why this exists

I spend my working day inside a dispute queue: two counterparties, one failed trade, conflicting accounts of what happened, and a decision that has to be defensible.

The decision is the job. Everything wrapped around it mostly isn't — retrieving context that the interface split across four tabs, re-reading a transcript for the same handful of policy markers, and retyping the same order reference into a user message and then again into an internal note.

So I started separating the two, measuring what the second category actually cost, and building against it. This repository is that method, rebuilt from scratch against an invented platform so it can be shown publicly.

> **On the source material:** every line here was written for this repository. No employer code, terminology, interface structure or process logic appears in it. The demo platform, its data and its rules are fictional. What is being shown is an approach, not an artefact.

---

## The decomposition

Working through one dispute end to end:

| Step | Nature | Handled by |
|---|---|---|
| Retrieve order state, counterparty history, claim, transcript, evidence | Mechanical retrieval | **Script** |
| Read the transcript for policy-violation markers | Mechanical scanning, **fatigue-sensitive** | **Script surfaces, human reads** |
| Weigh conflicting evidence between two parties | Judgement | **Human, always** |
| Decide whether evidence is sufficient | Judgement | **Human, always** |
| Choose the resolution route | Judgement | **Human, always** |
| Write the user message and the internal case note | Mechanical composition | **Script** |

The middle rows never move. The outer rows should never have been manual.

**Aggregate → surface → compose.** Three scripts, in that order.

---

## The scripts

### 1. Context Aggregator
The console splits one decision across four tabs. This reads all of them on case load and renders a single brief: the values that set severity, the seller-versus-buyer asymmetry that usually drives credibility, and the evidence inventory.

It shows no value that isn't already on the page. It does not summarise the claim — if the operator would have to trust the script's *reading* of something, it isn't shown.

### 2. Signal Surfacer
Runs a pattern set over the transcript and claim statement, flagging off-platform contact solicitation, third-party payment indicators, release pressure, unverified bank-delay claims, and re-trade requests. Each flag shows the line it matched and who said it, and clicking it jumps to the source.

**It has no verdict.** It cannot escalate, score, or recommend. It answers exactly one question — *is there a line here you would want to have read?* — and hands the line back.

That limit is deliberate and it is the most important design decision in the repository. An operator shown a conclusion starts agreeing with it, and a pattern matcher has no idea what it's missing. So the script optimises for recall, accepts false positives as the cost, and leaves precision where it belongs. Patterns catch attention; they don't spend it.

### 3. Resolution Composer
After the operator has chosen a route, fills that route's templates from live case data and produces both artefacts — the user-facing message and the internal note — for review and copy. Keyboard-driven.

Composition runs strictly *after* judgement. Nothing pre-selects a route or orders them by likelihood. Templates throw on an unresolved token rather than emitting a half-filled message to a real person.

---

## Architecture

```
       ┌──────────────────────────────────────────────┐
       │   context-aggregator  signal-surfacer        │
       │              resolution-composer             │
       │                                              │
       │   consume a plain Case object. No selectors.  │
       └────────────────────┬─────────────────────────┘
                            │
       ┌────────────────────▼─────────────────────────┐
       │                 pl-core.js                   │
       │                                              │
       │  ui       one docked panel, shared sections  │
       │  hotkeys  one listener for the whole toolkit │
       │  template strict tokens, loud failure        │
       │  watch    SPA-safe case-change detection     │
       │  ─────────────────────────────────────────   │
       │  adapter  ← the ONLY DOM-coupled code        │
       └────────────────────┬─────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │   host console   │
                   └─────────────────┘
```

**One layer is allowed to know what the page looks like.** `PL.adapter` converts pixels into a normalised `Case` object and stops — it makes no decisions and ranks nothing. Everything above it operates on data and has no idea whether it came from a scrape, an API, or a fixture.

When the host application ships a redesign, one function breaks instead of three scripts. That boundary is the reason a toolkit like this survives contact with a product team that ships weekly — and the reason the same scripts kept running through interface changes rather than being rewritten each time.

Two smaller decisions worth noting:

- **`PL.watch`** — single-page apps don't reload. A script bound to `document-ready` runs once and then quietly goes stale, which is worse than not running at all, because the operator keeps trusting it. Case identity is observed and debounced instead.
- **`PL.template`** — an unresolved token raises rather than rendering `Dear {{name}}` into something an operator then sends. Loud failure beats quiet embarrassment.

---

## Try it

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Edge, Safari).
2. Click a script below — Tampermonkey will offer to install it.
   - [Context Aggregator](https://raw.githubusercontent.com/cvidal22/peerledger-workflow-toolkit/main/scripts/context-aggregator.user.js)
   - [Signal Surfacer](https://raw.githubusercontent.com/cvidal22/peerledger-workflow-toolkit/main/scripts/signal-surfacer.user.js)
   - [Resolution Composer](https://raw.githubusercontent.com/cvidal22/peerledger-workflow-toolkit/main/scripts/resolution-composer.user.js)
3. Open the **[demo console](https://cvidal22.github.io/peerledger-workflow-toolkit/)** and click through the work basket.

The toolkit panel docks on the right. `Alt+\` collapses it, `Alt+1` jumps to the transcript, `Alt+Q/W/E/R` compose a resolution route.

Claim **PL-204902** is a good first read — the transcript contains two flagged lines, and the recovery-claim route composes cleanly from it.

---

## What this is not

- Not a scraper for any real platform. The `@match` rule targets the demo page only.
- Not an automated decision system. Three scripts, zero verdicts.
- Not a framework. It is small on purpose; the interesting part is the boundary, not the line count.

---

## Result

The same approach applied to my own queue sustains roughly double the team throughput target, and thirteen of the process changes behind it were adopted as standard practice across the team.

The number is the outcome. The decomposition above is the method.

---

## Stack

Vanilla JavaScript, no build step, no dependencies. Userscripts run in Tampermonkey; the demo console is static and hosted on GitHub Pages.

MIT licensed — see [LICENSE](LICENSE).

**Caio Vidal** · [LinkedIn](https://www.linkedin.com/in/caiovidal22/)
