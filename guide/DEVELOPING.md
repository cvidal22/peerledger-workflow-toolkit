# Testing changes on your Mac

You don't need GitHub, Tampermonkey, or Python. Push to GitHub only when you're happy with it.

---

## The easy way

1. Unzip the project somewhere you'll remember, like your Desktop.
2. Open the `docs` folder inside it.
3. **Double-click `index.html`.**

It opens in your browser and the buttons appear on their own. That's it.

To test a change: I send you a new zip, you unzip it, you double-click `index.html` again.

If the page looks like the old version, press **Cmd + Shift + R** to force a fresh load.

---

## When you're ready to publish

Upload the files to GitHub as usual, or use **GitHub Desktop** (see below).

Make sure `docs/toolkit.bundle.js` is included. That one file is what makes the demo work for visitors, and I regenerate it every time I send you a zip — so as long as you upload everything, it stays correct.

---

## GitHub Desktop — worth 5 minutes

It replaces the whole download-unzip-drag-upload routine.

1. Download it from **desktop.github.com** and sign in.
2. **File → Add Local Repository**, choose your project folder.
3. From then on: changed files show up in a list on the left. Type a short message, click **Commit to main**, then click **Push origin**.

Two clicks instead of the upload page.

---

## Optional: a live preview that reloads as you edit

Only useful if you want to edit files yourself. Skip it otherwise.

Check whether you have Node:

```
node --version
```

If that prints a number, run this from the project folder:

```
npx serve
```

It prints an address like `http://localhost:3000`. Open that, then add `/docs/?dev=1` to the end.

In this mode the browser reads your source files directly, so you just save a file and refresh — no rebuilding.

If `node --version` says "command not found", ignore this section. Double-clicking `index.html` does everything you need.

---

## If something looks wrong

**Buttons don't appear when I double-click index.html**
Make sure you opened `index.html` from inside the `docs` folder, and that `toolkit.bundle.js` is sitting next to it.

**I see an old version**
Press Cmd + Shift + R.

**It works on my Mac but not on the live site**
Something didn't get uploaded — most likely `docs/toolkit.bundle.js`.

**Buttons appear but one is greyed out**
That's on purpose. Hover it and it tells you why.
