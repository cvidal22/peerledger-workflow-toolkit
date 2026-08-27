# Engineering notes

Notes on building and maintaining a browser-automation suite for a high-volume dispute queue. The repository is a rebuilt public illustration; this document is about the engineering decisions behind that kind of system — what forced them, and what breaks when you get them wrong.

---

## 1. The shape of the problem

A dispute has two parties who each believe they were wronged, evidence of varying quality, and an outcome that has to be defensible months later when someone re-reads the file.

The decision takes seconds. What surrounds it does not: pick a response deadline, notify the right parties, write one message to the complainant and a different message to the defendant, put each in a language that party actually reads, write a structured internal note in a fixed format, save it, confirm it saved, close the case at the correct level of finality, and pass it through an audit step.

None of that is judgement. All of it is mandatory, ordered, and unforgiving of a missed step.

At a hundred and sixty cases a day, the arithmetic is not subtle. But the reason to automate it is not the minutes. It is that **mechanical work performed by a tired human is where the error rate lives**. Nobody transposes a digit while deciding whether evidence is credible. They transpose it on the fourth retype of an order reference at hour seven.

---

## 2. Why it became a matrix

The naive growth path is one script per situation. It works up to about a dozen and then quietly fails.

A queue has a small number of case types and a small number of actions per type. Six types, roughly a dozen actions. Every combination needs its own message wording and its own note wording — what you tell a seller whose buyer charged back is not what you tell a buyer who overpaid.

Six by twelve is seventy-two macros. Written individually, that isn't seventy-two units of work; it's seventy-two units of *divergence*. A fix to deadline parsing lands in the four you remembered. The other sixty-eight keep the bug. Six months on, no two macros behave quite alike and nobody can say which are correct — including the person who wrote them.

The fix is to stop treating them as scripts and treat them as **cells in a grid**:

- One execution skeleton, used by every cell.
- Case types and actions declared as data.
- Wording is the only thing that varies.

A fix to sequencing, verification or language routing now lands everywhere at once and *cannot* land unevenly. Adding a seventh case type becomes a data entry rather than a new file.

This is the single decision that determines whether a suite like this reaches seventy macros or collapses at twenty.

**Cost, stated honestly:** the skeleton has to accommodate every cell, so it accretes options. The discipline is to keep genuinely exceptional cases as exceptions rather than bending the skeleton to fit them — one or two odd cells are cheaper than a skeleton nobody understands.

---

## 3. What forced a shared core

The trigger was not elegance. It was the same bug being fixed three times.

Once the same defect has been patched in more than two places, the copy-paste approach has already failed; the only question is how much more it will cost before you admit it. The extraction that mattered most was not UI helpers — it was **failure handling**, because that is the code you write last, test least, and need most.

What ended up shared, and why each earned its place:

| Layer | Why it exists |
|---|---|
| `adapter` | The only code allowed to know what the page looks like. |
| `chain` | Multi-step actions with preflight, verification, abort and reporting. |
| `poll` | Interval work with backoff, a hard stop, and no overlapping runs. |
| `timer` | An interval that survives a backgrounded tab. |
| `template` | Strict token substitution that throws rather than half-renders. |
| `lang` | Per-party language resolution and the translate/don't-translate split. |
| `review` | The pause before an irreversible write. |
| `marker` | Verification that survives concurrent writes. |
| `spa` | The workarounds a reactive single-page app makes necessary. |

The payoff compounds: the second polling script inherits the first one's scar tissue for free. That is the actual argument for a core — not reuse, but **not having to relearn the same failures**.

---

## 4. One layer knows what the page looks like

Every script depends on `adapter` and nothing else touches the DOM. It converts pixels into plain objects and stops — no decisions, no ranking, no filtering.

When the host application ships a redesign, one function breaks instead of the whole suite. On a product that ships weekly, this is the difference between a toolkit that survives and one that gets abandoned after the second painful rewrite.

The rule that keeps the boundary honest: **if a consumer needs to know a selector, the adapter is incomplete.** Host presentation conventions get resolved at the boundary too — a UI that renders "not applicable" as a dash should hand back an empty value, not a dash, or that dash ends up rendered into a message to a user.

---

## 5. What a reactive SPA does to naive automation

Every item below replaces something that ought to work and doesn't. None of it is clever. All of it is scar tissue.

**Setting `.value` does nothing.** Frameworks that track their own state ignore direct assignment. Writes go through the native prototype setter, then dispatch the events the framework is actually listening for. Number inputs need a `blur` as well.

**`.click()` is frequently ignored.** Components bound to pointer events need the real sequence: `pointerdown → mousedown → mouseup → click`.

**Layout arrives before data.** Buttons and structure render while fields are still empty. Waiting for the page to "look ready" is a guess; waiting for a specific field to hold a real value is a fact. Fixed sleeps are wrong in both directions — too short on a slow morning, wasted time on every other run.

**Navigation chrome contains invisible copies of on-page text.** Without a visibility filter on every lookup, a script clicks a hidden menu item instead of the button in front of the operator.

**Pinned table columns live in a separate overlay** and read as empty in the main table. Row reads have to check both.

**The clipboard doesn't work in a background tab.** Anything handing data between scripts needs a real channel, with the clipboard as a fallback for manual runs only.

**Chrome throttles background timers** to roughly one tick per minute. A queue watcher built on `setInterval` therefore stops watching the moment the operator looks at anything else — exactly when they needed it. A Worker gets its own thread and isn't throttled the same way.

**Scripts talk over an event bus** rather than being merged into one file: one channel to start a macro, one to enforce that only one runs at a time, one to sync shared UI. Merging would have been simpler and would have made every script a reason to reinstall all of them.

---

## 6. The language split

The two parties in a dispute frequently don't share a language, and neither necessarily shares the operator's. So "the language of the case" is the wrong unit — it has to be resolved **per party, from that party's own messages**.

Then the rule that matters:

> **Outbound messages are translated into each recipient's language. Internal notes are never translated.**

Notes stay in one language so any colleague or auditor can pick up any case cold. Getting this backwards produces an audit trail nobody can read, which is far more expensive than an awkward translation — the message is read once by one person; the note is read by everyone who touches the case afterwards.

Detection is confidence-scored, and below threshold it defaults rather than guessing: a message in the wrong language is worse than one in the house language.

**A bug worth recording.** The first scorer counted common words per language and got Portuguese wrong. Portuguese and Spanish share too much vocabulary — *banco*, *pedido*, *por favor*, *comprador*, *vendedor* — so a plainly Portuguese message split its score across two candidates, fell below threshold, and defaulted to English. Two changes fixed it: score only **distinctive** markers, since a token appearing in more than one candidate carries no signal; and measure confidence **against the nearest rival** rather than against the total, since summing across all candidates punishes a confident answer merely because other lists also scored.

Structural characters — arrows, status dots — are masked before translation and restored after, because in a fixed note format they are structure, not decoration.

---

## 7. Verification that survives other people

The tempting way to confirm a save is to count rows, or read the newest one.

Both are wrong on a shared queue. A colleague saving on the same case at the same moment satisfies a row count, and the script reports success for a write that never landed. That failure is worse than a visible error because it is *confident* — nobody goes looking for it.

So every generated note carries a unique marker, and verification searches for that exact string in the saved history. It cannot be satisfied by someone else's write.

The general principle: **verify by identity, not by position or count.** Anything positional is a race waiting for a colleague to trigger it.

---

## 8. Chains, and why partial failure is the enemy

A browser UI offers no transactions. A chain that assumes success produces *partial* failures: the message goes out, the note never saves, the case stays open. The user has been told their case is resolved; the audit trail says nobody touched it.

Partial failure is worse than no automation, because no automation fails visibly.

What the chain runner supplies:

- **Preflight** — conditions checked while nothing has happened yet. The only mechanism that *avoids* partial state rather than reporting it afterwards.
- **Verify** — each step proves it landed by observing the page, not by the click returning.
- **Abort** — stop rather than continue into steps that assume success.
- **Report** — name exactly which steps committed, before the operator retries and double-sends.
- **Lock** — one chain at a time; impatient double-taps collapse to one.
- **Once** — a completed chain won't re-run on the same case without an explicit reset.

Two deliberate omissions:

**No automatic retry.** Retrying a step that may have half-succeeded risks double-sending to someone who has just lost money.

**No rollback.** Rollback is a lie in a UI with no undo. Claiming to have reverted something you only clicked at is a worse failure than honestly reporting the partial state and telling the operator what to finish by hand.

---

## 9. The review gate

The chain can verify that a save happened. It cannot verify that the saved text was *correct*.

A confidently-executed wrong note is the most expensive thing this kind of tooling can produce: authoritative, permanent, and believed by the next person who reads it.

So macros run their entire sequence up to the moment before the save, then stop and present the composed text for editing. The operator adjusts the wording and resumes; the mechanical work around it still cost nothing.

This is the line between **automating the typing** and **automating the judgement**. It is on by default, because the failure it prevents is silent.

---

## 10. Coordination without a coordinator

Two operators running the same queue watcher will grab the same case. The obvious fixes — a lock service, a shared assignment table — require infrastructure that a browser userscript doesn't have and shouldn't ask for.

The workable answer is an **offset**: one watcher takes the first waiting case, another takes the third, degrading gracefully when the queue is shorter than the offset. No shared state, no coordination protocol, no server. Collisions become rare instead of certain.

Related discipline: watchers are **mutually exclusive** — starting one stops the others — and an auto-claimer takes **one** case and disarms. A claimer that keeps claiming builds a private backlog nobody else can see or pick up, which quietly makes the operator's throughput look good at the team's expense.

For the same reason it takes the **oldest** waiting case rather than the easiest-looking one. A script that cherry-picks reshapes what colleagues are left holding, and does it invisibly.

---

## 11. Things that only testing found

- The empty-state placeholder row in a table counts as a row. Verifying "the note saved" by row count never confirmed on a case with no prior notes — so the chain hung on exactly the cases with no history.
- Portuguese detected as English, per §6.
- On Brazilian ABNT2 keyboards the backtick is a dead key and the character is never reported to the page. A launcher bound to that character silently does nothing; binding to the **physical key position** works.

Reading the code would not have caught any of these. Each one is the argument for building a test harness that drives the real interface rather than trusting a review.

---

## 12. Status, honestly

The suite is in active use by colleagues on the team; formal organisation-wide rollout is still pending internal audit sign-off. Thirteen separate process improvements developed alongside it were adopted as standard practice.

That distinction is worth keeping precise rather than rounding up, because the two are different achievements. Getting other people to depend on your tooling means it survives contact with workflows you didn't design it for, operators who won't read your notes, and edge cases you never hit yourself — which is most of why the failure handling in §8 and the review gate in §9 exist at all. Audit sign-off is a separate, slower thing, and it isn't done.

---

## 13. What generalizes

Little of this is specific to disputes:

1. Separate judgement from mechanics explicitly, and automate only the second.
2. Make the boundary to the outside world exactly one layer thick.
3. Treat combinatorial families as a matrix, not a library.
4. Verify by identity, never by position or count.
5. Prefer loud failure to quiet partial success.
6. Put a human gate immediately before anything irreversible.
7. When something can't be undone, report the partial state honestly instead of pretending to reverse it.
8. Build the test harness that drives the real thing — the interesting bugs are all in the interaction, not the logic.

---

*Caio Vidal · [github.com/cvidal22](https://github.com/cvidal22) · [LinkedIn](https://www.linkedin.com/in/caiovidal22/)*
