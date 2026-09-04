#!/usr/bin/env node
/*
 * bundle.js — generate docs/toolkit.bundle.js from core/ and scripts/.
 *
 * WHY THIS EXISTS
 *
 * GitHub Pages publishes one folder. This site is served from docs/, so
 * core/ and scripts/ are not reachable over HTTP at all — a demo page that
 * tries to load ../core/pl-core.js gets a 404.
 *
 * Fetching them from raw.githubusercontent instead does not work either:
 * raw serves JavaScript as text/plain with X-Content-Type-Options: nosniff,
 * and browsers refuse to execute that as a script. It is fine for an
 * extension's @require, which is not bound by that rule, and useless for a
 * <script> tag.
 *
 * So the preview needs a same-origin copy inside docs/. This generates it
 * from the real sources rather than anyone maintaining a second copy, and
 * `validate.js` fails the build if the generated file has drifted — which is
 * the only thing that makes a committed build artefact safe.
 *
 *   node build/bundle.js            write docs/toolkit.bundle.js
 *   node build/bundle.js --check    exit 1 if it is out of date
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "toolkit.bundle.js");

const ORDER = [
  "queue-auto-claim",
  "signal-surfacer",
  "context-aggregator",
  "macro-engine",
  "macro-launcher"
];

/* The metadata block is instructions for the extension. In a page it is just
   a comment, but stripping it keeps the bundle honest about what it is. */
function stripMeta(src) {
  return src.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\n?/, "");
}

function build() {
  const core = fs.readFileSync(path.join(ROOT, "core", "pl-core.js"), "utf8");

  const parts = [
    "/*",
    " * toolkit.bundle.js — GENERATED. Do not edit.",
    " *",
    " * Built by build/bundle.js from core/pl-core.js and scripts/*.user.js.",
    " * This is the same code the extension runs; it exists because GitHub",
    " * Pages only serves docs/, so the demo page needs a same-origin copy.",
    " *",
    " * Regenerate with:  node build/bundle.js",
    " * CI fails if this file has drifted from its sources.",
    " */",
    "",
    core,
    ""
  ];

  ORDER.forEach(name => {
    const src = stripMeta(fs.readFileSync(path.join(ROOT, "scripts", name + ".user.js"), "utf8"));
    parts.push(
      "/* ---- " + name + " ---- */",
      /* One failing script must not take the other six down with it. In the
         extension each runs in its own sandbox and gets that for free; in a
         single bundle it has to be explicit. */
      "try {",
      src,
      "} catch (e) {",
      "  console.error('[pl] " + name + " failed to start:', e);",
      "}",
      ""
    );
  });

  return parts.join("\n");
}

/* Stamp the demo page's own assets with the version too.
   Only the toolkit bundle was cache-busted, so after an update a browser —
   or the Pages CDN — kept serving the previous styles.css, app.js and
   data.js. The page looked like an older release while the toolkit inside
   it was current, which is a confusing way to fail. */
function stampAssets(version) {
  const page = path.join(ROOT, "docs", "index.html");
  let html = fs.readFileSync(page, "utf8");
  const stamped = html.replace(
    /(href|src)="(styles\.css|data\.js|app\.js|preview\.js)\?v=[^"]*"/g,
    (_, attr, file) => `${attr}="${file}?v=${version}"`
  );
  if (stamped !== html) {
    fs.writeFileSync(page, stamped);
    return true;
  }
  return false;
}

const coreVersion =
  (fs.readFileSync(path.join(ROOT, "core", "pl-core.js"), "utf8")
     .match(/version:\s*"(\d+\.\d+\.\d+)"/) || [])[1] || "0.0.0";

const generated = build();

if (process.argv.includes("--check")) {
  const html = fs.readFileSync(path.join(ROOT, "docs", "index.html"), "utf8");
  if (!html.includes(`app.js?v=${coreVersion}`)) {
    console.error(`✕ docs/index.html assets are not stamped ${coreVersion} — run: node build/bundle.js`);
    process.exit(1);
  }
  let current = "";
  try { current = fs.readFileSync(OUT, "utf8"); } catch (e) { /* missing */ }
  if (current !== generated) {
    console.error("✕ docs/toolkit.bundle.js is out of date — run: node build/bundle.js");
    process.exit(1);
  }
  console.log("✓ docs/toolkit.bundle.js matches its sources");
  process.exit(0);
}

fs.writeFileSync(OUT, generated);
if (stampAssets(coreVersion)) console.log(`✓ stamped docs/index.html assets ${coreVersion}`);
console.log(`✓ wrote docs/toolkit.bundle.js (${(generated.length / 1024).toFixed(0)} KB, core + ${ORDER.length} scripts)`);
