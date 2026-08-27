# Adding a macro

The point of the matrix is that this is a data change, not a new file.

## To add an action (a new column across every case type)

Open `scripts/macro-matrix.user.js` and add one entry to `ACTIONS`:

```javascript
evidence_expired: {
  label: "Evidence window expired",
  windowHours: 0,
  message: "Hello,\n\nThe response window on order {{orderRef}} has closed…",
  note: "{{marker}} {{code}} — window expired, no response from {{defendant}}.\n…"
}
```

That is the whole change. It becomes available for all six case types immediately, and it inherits sequencing, verification, language routing and the review gate from the shared skeleton — it cannot inherit them unevenly.

## To add a case type (a new row across every action)

Add one entry to `CASE_TYPES`:

```javascript
duplicate_order: { code: "DUP", label: "Duplicate order", refunder: "seller" }
```

Every action becomes available for it at once.

## Rules

**Wording is copied verbatim.** Do not normalise spacing, capitalisation or punctuation in message templates. Approved wording is approved as written; silently "improving" it is a compliance question, not a style one.

**Structural characters are load-bearing.** Arrows and status markers in the note format are parsed and read by people. `PL.lang.protect` masks them through translation; don't strip them.

**Every note template must include `{{marker}}`.** It is what makes the save verifiable.

**Templates fail loudly.** An unresolved token throws rather than rendering `{{orderRef}}` into a message to a real person. If a token can't be resolved for a case, that macro refuses to run on it. That is the intended behaviour.

## Before installing

```bash
node build/validate.js     # syntax + metadata
npm test                   # behavioural tests against the demo page
```

Bump `@version` on any change. The extension will not offer an update without it, so a fix ships to nobody.

Keep the filename matching `@name` exactly. Extensions match on `@name` when reinstalling; a mismatch adds a second copy rather than replacing the first, which is the root of the everything-fires-twice class of bug.
