# Driving a reactive page from outside

Everything here replaces something that should work and doesn't. Symptom first, because that's what you'll have.

## Setting a field does nothing

The text appears, but saving stores the old value. Frameworks that track their own state ignore direct assignment to `.value`.

```javascript
PL.spa.set(field, text);   // native setter, then the events they listen for
```

Number inputs also need a `blur`.

## Clicking does nothing

No error, no feedback, works fine by hand. The component is bound to pointer events and a bare `.click()` only fires the last one.

```javascript
PL.spa.click(button);   // pointerdown → mousedown → mouseup → click
```

## It clicks the wrong thing

Usually something in the sidebar. Navigation menus are full of hidden items whose text matches on-page buttons.

```javascript
PL.spa.byText("button", "Save note");   // visible matches only
```

## A visible element reports itself as invisible

`offsetParent === null` is the cheap test and it's correct for normal content — but **`position: fixed` elements return null while fully on screen**. Don't use it on anything you injected yourself. `PL.spa.visible` handles it.

Related: check ancestors, not just the element. A button can be `display: inline-block` inside a container that is hidden. I got this wrong the first time.

## Works when you test it, fails on a slow morning

Layout renders before data. Waiting for the page to *look* ready is a guess.

```javascript
await PL.spa.ready("#order-ref");   // wait for a real value
```

Never sleep a fixed interval — too short when it matters, wasted time otherwise.

## Several menus match

Menus often get moved to `<body>`, so more than one can be open and document order tells you nothing.

```javascript
PL.spa.nearest(candidates, anchorRow);
```

The handler is usually on a `<button>` inside the list item, not the item. And option text has whitespace around it — always trim.

## A pinned column reads as empty

It's rendered into a separate overlay table. Read that too. And read columns by header position, never by scanning row text — the neighbouring column will give false matches.

## The watcher stops when you switch tabs

Chrome throttles background timers to about one tick a minute — exactly when you needed it running. `PL.timer` uses a Worker, which isn't throttled the same way.

## Verification confirms the wrong thing

Rare and confusing: the script says it saved, the note isn't there. You're counting rows, and a colleague's save at the same moment satisfies the count.

```javascript
const mark = PL.marker.make("RWP");
// write a note containing mark
PL.waitFor(() => PL.marker.present("#notes-table", mark));
```

Verify by identity, never by position or count.

## Cancelling shows an error dialog

Something upstream does `catch (e) { alert(e.message) }`. Throw `PL.abort()` instead — reading its `.message` re-throws, so nothing can display it.

## Everything happens twice

Two copies of the script installed. Guard at the top of every file, keep filenames matching `@name`, and check `__PL_INSTANCES__`.

## Capturing a page as a test fixture

Don't commit a raw `outerHTML` dump. It contains things you can't see — the worst is a watermark node repeating the operator's email dozens of times at near-zero opacity.

```bash
python3 build/scrub-fixture.py raw.html > tests/fixtures/case.html
```

It exits non-zero if anything email-shaped or ID-shaped survives. Treat that as *do not commit*.

