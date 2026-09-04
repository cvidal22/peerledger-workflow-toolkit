# Notes on building this

This document is a compilation on what I learned building a browser automation suite for a part of my job at a crypto exchange. This repository is a rebuilt public version; these notes are about the real project.

---

## The problem

Handling a peer-to-peer payment dispute means two counterparties who both believe they are right, evidence of mixed quality including edited or fake proofs, and an outcome that has to pass an audit even months later. It is fraud assessment and customer support.

The decision is judgement based, and it shouldn't be automated. However, what surrounds it is a different thing: get to the next case, gather context spread across all panels to understand the full picture, search the chat for red flags, then message the appropriate party, set a deadline per SOP, write a structured note, save it, follow up, and file the case in the right queue. Structured, ordered, and mechanical.

At +100 cases a day the time adds up, but time wasn't the main reason I automated it. Mechanical and low-cognition work done by a tired person is where it opens the chances for mistakes.

---

## Why one skeleton instead of many scripts

Most disputes are classified in six main case types, roughly a dozen possible actions for each. Each combination needs its own message template — what you send a seller whose buyer charged back is not what you send a buyer who overpaid.

That is around 72 macros. I wrote the first dozen as separate scripts and it stopped scaling quickly. Not because writing them was slow, but because they drifted apart. A change to the deadline parsing would land in the three files I remembered to update. Months later no two behaved the same way and I could not say which was correct.

So: one execution skeleton, case types and actions declared as data, only the wording changing per combination. A fix now lands in all of them at once, or in none. Adding a case type is a data entry rather than a new file.

The cost is that the skeleton has to accommodate every case, so it accumulates options. I keep genuinely unusual cases as exceptions instead of bending the skeleton around them.

---

## Why a shared core

Not for elegance. Because I fixed the same bug three times.

Once you have patched the same thing in three files, copy-paste has already failed you. The first part worth extracting was not the DOM helpers, it was the error handling — the code you write last, test least, and depend on most.

What ended up shared: the DOM adapter, the multi-step runner, polling, timers, templates, language handling, the review gate, and save verification.

---

## One layer touches the DOM

Every script goes through a single adapter. It reads the page and returns plain objects. Nothing above it uses a selector.

When the platform redesigns something, one function breaks instead of ninety-five scripts. On a fast paced industry where updates are shipped weekly, that is the difference between maintaining a suite and abandoning it.

It works in both directions. While building the public version I renamed a field label on the page and forgot the adapter reads parties by label. It returned empty values, the template refused to render on a missing field, and the macro declined to run — correct behaviour, invisible failure. Those labels are now marked in the code as an interface.

---

## Languages

The two parties in a dispute frequently do not share a language, and neither necessarily shares mine. So it is resolved per party, from what that party actually wrote.

The rule that matters: **outbound messages are translated, internal notes never are.** Notes stay in one language so any colleague can pick up any case cold. Reversing that gives you an audit trail nobody can read, which is far more expensive than an awkward translation.

Detection is confidence-scored and falls back to the default language when unsure. A message in the wrong language is worse than one in the house language.

My first version misread Portuguese. It counted common words per language, and Portuguese and Spanish share too many — *banco*, *pedido*, *por favor*. A plainly Portuguese message split its score across both candidates, fell below the threshold, and defaulted to English. Two changes fixed it: count only words that appear in a single candidate language, and measure confidence against the runner-up rather than the total.

---

## Verifying that a note saved

The obvious approach is to count rows before and after. That is wrong on a shared queue — a colleague saving at the same moment satisfies the count, and you report success for a write that never happened.

So every generated note carries a unique marker, and verification searches for that exact string before the case is filed and logged to the tracker. Another operator's write cannot satisfy it.

The general form: verify by identity, not by position or count.

---

## Multi-step actions

A browser page has no transactions. A sequence that assumes each step worked produces *partial* failures: message sent, note not saved, case still open. The user has been told their case is resolved and the audit trail says nobody touched it.

That is worse than no automation, because no automation fails visibly.

What the runner does:

- checks preconditions before anything executes
- verifies each step by observing the page, not by the click returning
- stops on failure instead of continuing into steps that assume success
- reports exactly which steps committed
- refuses to run twice on the same case

Two things it deliberately does not do. It does not retry, because retrying a step that half-succeeded risks sending a second message to someone who has just lost money. And it does not roll back, because there is no undo — claiming to have reverted something you only clicked at is worse than reporting the partial state.

---

## The review gate

The runner can verify that a note saved. It cannot verify that the note was correct.

A confidently-worded wrong note is the most expensive thing this can produce: authoritative, permanent, and believed by whoever reads the case next.

So macros can pause immediately before saving and present the composed text for editing, with everything mechanical already done. It is off by default — the wording is reviewed when the macro is selected, and pausing on every note turns the confirmation into a reflex. I turn it on for new macros and for anyone still learning the queue.

---

## Two people running the same watcher

Two operators running the same queue watcher pull the same case. The obvious solutions need a lock service or a shared table, and a browser userscript has neither.

What works is an offset: one watcher takes the first waiting case, another takes the third, degrading gracefully when the queue is shorter than the offset. No shared state, no server. Collisions become rare instead of certain.

---

## Things only testing found

- An empty-state placeholder row counts as a row. Verifying "the note saved" by row count never confirmed on a case with no history, so it hung on exactly the cases that had none.
- The Portuguese detection problem mentioned above.
- On Brazilian ABNT2 keyboards the backtick is a dead key and never reaches the page. A launcher bound to that character silently does nothing. Binding to the physical key position works.

None of these were findable by reading the code. That is the argument for a test harness that drives the real interface rather than trusting a review.

---

## Where it stands

About 95 scripts across six case types, running at roughly double the team throughput target pace. In active use by colleagues, with formal rollout and internal audit continuously in progress. Thirteen process improvements I developed alongside the suite were adopted as standard practice and work in synergy with it.

Other people depending on the tooling is what shaped the engineering. Tooling built for individual use can fail quietly, because you know what it does. Tooling colleagues rely on has to survive workflows you did not design for and operators who will not read your notes.

---

*Caio Vidal · [github.com/cvidal22](https://github.com/cvidal22) · [LinkedIn](https://www.linkedin.com/in/caiovidal22/)*
