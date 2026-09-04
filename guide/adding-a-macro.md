# Adding a macro

It's a data change, not a new file. Everything lives in `scripts/macro-engine.user.js`.

## A new action (applies to every case type)

Add one entry to `ACTIONS`:

```javascript
evidence_expired: {
  label: "Deadline expired",
  to: "complainant",     // who gets the message
  windowHours: 0,        // response window, or omit
  followUp: true,        // → Handling.  Use closes: true for → Closed
  message: "Hello,\n\nThe response window on order {{orderRef}} has closed…",
  note: "{{marker}} {{code}} — window expired, no response from {{defendant}}.\n…"
}
```

That's it. It's available for all six case types immediately and inherits sequencing, verification, language routing and the review gate from the shared skeleton.

## A new case type

Add one entry to `CASE_TYPES`:

```javascript
duplicate_order: { code: "DUP", label: "Duplicate order", filedBy: "buyer", refunder: "seller" }
```

Every action becomes available for it at once.

## Rules

**Every macro must park or close.** Set `followUp: true` or `closes: true`. A macro that does neither leaves the case in the task pool to be worked twice — the engine refuses to run it.

**Copy approved wording exactly.** Don't tidy spacing or punctuation in message templates. That's a compliance question, not a style one.

**Every note template needs `{{marker}}`.** It's what makes the save verifiable.

**Templates throw on a missing token** rather than rendering `{{orderRef}}` into a message. If a case has no value for a field, that macro won't run on it. That's intended.

## Before installing

```bash
node build/bundle.js   # rebuild the demo bundle
npm test               # validation + tests
```

Bump `@version` on any change or the extension won't offer the update. Keep the filename matching `@name` — a mismatch adds a second copy instead of replacing the first.
