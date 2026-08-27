#!/usr/bin/env python3
"""
scrub_dom.py — strip identifying data out of a captured DOM dump so the
structure can be committed as a test fixture.

    python scrub_dom.py raw.html > fixtures/appeal-detail.html
    python scrub_dom.py raw.html --report      # show what was replaced, don't emit

What it removes, in order of how badly it burns you if you forget:

  1. #watermark-box            — the whole node. It repeats the operator's
                                email ~64x at opacity 0.005. Invisible on
                                screen, fully present in outerHTML.
  2. email addresses          — replaced with agent1@example.com,
                                agent2@example.com, … (stable per address, so
                                the same person stays the same person).
  3. long digit runs          — order numbers, ad numbers, transaction ids
                                (>=15 digits) → 9999… placeholders.
  4. user ids                 — 5-12 digit runs in ID/href positions.
  5. free-text dispute fields — Problem Description / Appeal reason / remark
                                content bodies → lorem placeholders, since
                                these are written by users and can contain
                                anything.
  6. names, IBANs, phones     — the ***MASKED*** forms are still partial
                                identifiers; blanked entirely.
  7. notification payloads    — .news-list items carry live appeal URLs with
                                user ids; the whole list is emptied.

It is deliberately aggressive. A fixture is only useful for its structure;
nothing here needs to survive.

Exit code is 1 if anything that looks like an email or a 15+ digit run is
still present after scrubbing — treat that as "do not commit".
"""

import argparse
import hashlib
import re
import sys

EMAIL_RE = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')
LONGNUM_RE = re.compile(r'\b\d{15,}\b')
UID_RE = re.compile(r'(\bu=|\bID:\s*|>\s*)(\d{5,12})\b')
MASKED_RE = re.compile(r'\*{2,}[^<>*]{1,60}\*{2,}')
PHONE_RE = re.compile(r'\(\d{1,4}\*{2,}\d{1,4}')

# Blocks whose text content is user-authored and must not survive.
FREETEXT_LABELS = [
    'Problem Description:',
    'Appeal reason:',
]

# Set this to your organisation's domain and any internal host names before
# running. The check is the last line of defence: if any of these survive,
# the fixture is not safe to commit.
FORBIDDEN_TOKENS = [
    # '@your-company.com',
    # 'internal-host.example',
]

_email_map = {}
_num_map = {}


def fake_email(match):
    addr = match.group(0).lower()
    if addr not in _email_map:
        _email_map[addr] = f'agent{len(_email_map) + 1}@example.com'
    return _email_map[addr]


def fake_longnum(match):
    raw = match.group(0)
    if raw not in _num_map:
        # Keep the length; make the value obviously synthetic.
        h = hashlib.sha256(raw.encode()).hexdigest()
        digits = ''.join(c for c in h if c.isdigit())
        body = (digits * 3)[: max(len(raw) - 5, 1)]
        _num_map[raw] = ('99999' + body)[: len(raw)]
    return _num_map[raw]


def fake_uid(match):
    prefix, raw = match.group(1), match.group(2)
    if raw not in _num_map:
        h = hashlib.sha256(raw.encode()).hexdigest()
        digits = ''.join(c for c in h if c.isdigit())
        _num_map[raw] = ('9' + digits)[: len(raw)]
    return prefix + _num_map[raw]


def drop_node(html, marker, label):
    """Remove a top-level <div id=...> ... </div> by naive brace-free scan."""
    i = html.find(marker)
    if i == -1:
        return html, False
    start = html.rfind('<div', 0, i + len(marker))
    depth = 0
    j = start
    while j < len(html):
        if html.startswith('<div', j):
            depth += 1
            j = html.find('>', j) + 1
            continue
        if html.startswith('</div>', j):
            depth -= 1
            j += 6
            if depth == 0:
                break
            continue
        j += 1
    return html[:start] + f'<!-- {label} removed by scrub_dom.py -->' + html[j:], True


def blank_freetext(html):
    """Replace the text that follows a user-authored label with a placeholder."""
    for label in FREETEXT_LABELS:
        pattern = re.compile(
            re.escape(label) + r'(.*?)(?=</div>)', re.S
        )
        html = pattern.sub(label + ' [redacted user text] ', html)
    return html


def scrub(html):
    actions = []

    html, hit = drop_node(html, 'id="watermark-box"', 'watermark-box')
    actions.append(('watermark-box', 'removed' if hit else 'not present'))

    html, hit = drop_node(html, 'class="news-list"', 'notification payloads')
    actions.append(('notification list', 'removed' if hit else 'not present'))

    html = blank_freetext(html)
    actions.append(('free-text dispute fields', 'redacted'))

    html = PHONE_RE.sub('(00****00', html)
    actions.append(('phone fragments', 'blanked'))

    html = MASKED_RE.sub('****REDACTED****', html)
    actions.append(('masked names / account numbers', 'blanked'))

    before = len(EMAIL_RE.findall(html))
    html = EMAIL_RE.sub(fake_email, html)
    actions.append(('emails', f'{before} replaced -> {len(_email_map)} distinct'))

    before = len(LONGNUM_RE.findall(html))
    html = LONGNUM_RE.sub(fake_longnum, html)
    actions.append(('long ids (>=15 digits)', f'{before} replaced'))

    before = len(UID_RE.findall(html))
    html = UID_RE.sub(fake_uid, html)
    actions.append(('user ids', f'{before} replaced'))

    return html, actions


def verify(html):
    """Anything left that looks identifying is a hard fail."""
    problems = []
    leftovers = [e for e in EMAIL_RE.findall(html) if not e.endswith('example.com')]
    if leftovers:
        problems.append(f'{len(leftovers)} email(s) survived: {leftovers[:3]}')
    survivors = [n for n in LONGNUM_RE.findall(html) if not n.startswith('99999')]
    if survivors:
        problems.append(f'{len(survivors)} long id(s) survived: {survivors[:3]}')
    for token in FORBIDDEN_TOKENS:
        if token and token.lower() in html.lower():
            problems.append(f'forbidden token still present: {token!r}')
    return problems


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('path')
    ap.add_argument('--report', action='store_true',
                    help='print a summary to stderr instead of emitting HTML')
    args = ap.parse_args()

    raw = open(args.path, encoding='utf-8', errors='replace').read()
    cleaned, actions = scrub(raw)
    problems = verify(cleaned)

    for name, result in actions:
        print(f'  {name:38} {result}', file=sys.stderr)
    print(f'  {"size":38} {len(raw)} -> {len(cleaned)} bytes', file=sys.stderr)

    if problems:
        print('\nFAILED — do not commit:', file=sys.stderr)
        for p in problems:
            print(f'  ! {p}', file=sys.stderr)
        return 1

    print('\nclean', file=sys.stderr)
    if not args.report:
        sys.stdout.write(cleaned)
    return 0


if __name__ == '__main__':
    sys.exit(main())
