/*
 * Save verification.
 *
 * The README claims notes are verified "by a unique marker, not by counting
 * rows". This proves it, because the difference only shows when two writes
 * land at once — which is the situation a shared queue produces and a quiet
 * demo never will.
 */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const P = require("path").resolve(__dirname, "..") + "/";

const dom = new JSDOM(fs.readFileSync(P + "docs/index.html", "utf8"), {
  runScripts: "outside-only",
  url: "https://cvidal22.github.io/peerledger-workflow-toolkit/",
  pretendToBeVisual: true
});
const w = dom.window;
w.HTMLElement.prototype.scrollIntoView = function () {};
if (!w.PointerEvent) w.PointerEvent = w.MouseEvent;

["docs/data.js", "docs/app.js"].forEach(f => w.eval(fs.readFileSync(P + f, "utf8")));
w.eval(fs.readFileSync(P + "docs/toolkit.bundle.js", "utf8"));

const $ = s => w.document.querySelector(s);
const $$ = s => [...w.document.querySelectorAll(s)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const notes = () => $$("#notes-table tbody tr td.by").length;

let bad = 0;
const ck = (n, ok, d) => { console.log(`${ok ? "  ok  " : "  FAIL"}  ${n}${d ? " — " + d : ""}`); if (!ok) bad++; };

(async () => {
  w.location.hash = "#/claim/Dispute01";
  await wait(320);

  const mine = w.PL.marker.make("MINE");
  const theirs = w.PL.marker.make("THEIRS");
  const before = notes();

  /* A colleague writes to the same case at the same moment. Only their note
     lands; mine never does. */
  const c = w.PEERLEDGER_CLAIMS.find(x => x.id === "Dispute01");
  c.notes.push({ by: "r.tavares", at: "2026-08-26 17:02", text: theirs + " second review, no action." });
  w.location.hash = "#/queue";
  await wait(200);
  w.location.hash = "#/claim/Dispute01";
  await wait(320);

  ck("a write landed", notes() === before + 1, `${before} -> ${notes()}`);
  ck("row count says my save succeeded", notes() > before);
  ck("marker correctly says it did not", w.PL.marker.present("#notes-table", mine) === false);
  ck("marker finds the write that did land", w.PL.marker.present("#notes-table", theirs));

  console.log(bad ? `\n${bad} failure(s)` : "\nmarker verification holds where row counting fails");
  process.exit(bad ? 1 : 0);
})();
