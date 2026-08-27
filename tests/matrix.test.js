const { JSDOM } = require("jsdom");
const fs = require("fs");
const P = require("path").resolve(__dirname, "..") + "/";

const dom = new JSDOM(fs.readFileSync(P + "docs/index.html", "utf8"), {
  runScripts: "outside-only",
  url: "https://cvidal22.github.io/peerledger-workflow-toolkit/",
  pretendToBeVisual: true
});
const w = dom.window;
w.PL_DEBUG = true;
w.HTMLElement.prototype.scrollIntoView = function () {};
if (!w.PointerEvent) w.PointerEvent = w.MouseEvent;

const load = f => w.eval(fs.readFileSync(P + f, "utf8"));
load("docs/data.js"); load("docs/app.js"); load("core/pl-core.js");
["queue-auto-claim","context-aggregator","signal-surfacer","macro-launcher",
 "resolution-composer","compound-resolution","macro-matrix"].forEach(s => load(`scripts/${s}.user.js`));

const $ = s => w.document.querySelector(s);
/* The toolkit is a dock of buttons; content lives in a popover opened from
   one. These helpers keep the tests reading like operator actions. */
const openBtn = (w, label) => {
  const b = [...w.document.querySelectorAll("#pl-dock .pl-b")]
    .find(x => x.querySelector(".lb").textContent === label);
  if (!b) throw new Error("no button labelled " + label);
  b.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  return w.document.getElementById("pl-pop-b");
};
const popBody = (w) => w.document.getElementById("pl-pop-b");

const $$ = s => [...w.document.querySelectorAll(s)];
const click = el => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log("=== LANGUAGE DETECTION (per party) ===");
  for (const id of ["PL-205160", "PL-205188", "PL-204871"]) {
    w.location.hash = "#/claim/" + id;
    await wait(200);
    const c = w.PL.adapter.readCase();
    const b = w.PL.lang.forParty(c.chat, "buyer", c.id);
    const s = w.PL.lang.forParty(c.chat, "seller", c.id);
    console.log(`${id} [${c.type}]  buyer=${b.lang}(${Math.round(b.confidence*100)}% ${b.reason})  seller=${s.lang}(${Math.round(s.confidence*100)}% ${s.reason})`);
  }

  console.log("\n=== MATRIX PALETTE ===");
  w.location.hash = "#/claim/PL-205160"; await wait(200);
  w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "m", altKey: true, bubbles: true }));
  await wait(120);
  console.log("items:", $$(".pl-ov-i").length, "| placeholder:", $("#pl-ov-in").placeholder);
  console.log("top 4 (should be OVP):", $$(".pl-ov-i .nm").slice(0,4).map(n=>n.textContent));
  $("#pl-ov-in").value = "recovery";
  $("#pl-ov-in").dispatchEvent(new w.Event("input", { bubbles: true }));
  await wait(60);
  console.log("filtered 'recovery' top 3:", $$(".pl-ov-i .nm").slice(0,3).map(n=>n.textContent));

  // run OVP / recovery opened
  console.log("\n=== RUN: OVP recovery_opened (review gate + marker) ===");
  w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

  // review gate should appear after the send step (~700ms)
  let gate = null;
  for (let i = 0; i < 40 && !gate; i++) { await wait(120); gate = $(".pl-rv-t"); }
  console.log("review gate opened:", !!gate);
  if (gate) {
    console.log("--- note presented for review ---");
    console.log(gate.value);
    console.log("--- gate meta ---");
    console.log([...$("#pl-cf-b").querySelectorAll("div")].slice(0,3).map(d=>d.textContent).filter(Boolean).join("\n"));
    // edit then save
    gate.value = gate.value.replace("Status: pending recovery.", "Status: pending recovery. Verified both receipts against statement.");
    click([...$("#pl-cf-b").querySelectorAll(".pl-btn")].find(b => b.textContent.startsWith("Save note")));
  }
  await wait(1500);

  console.log("\nsent messages:", $$("#sent-log .sent:not(.none)").length);
  console.log("sent text (translated?):");
  console.log(($("#sent-log .sent") || {}).textContent);
  console.log("\nsaved note rows:", $$("#notes-table tbody tr td.by").length);
  console.log("saved note:", $$("#notes-table tbody tr td:not(.by)").map(t=>t.textContent)[0]);
  const mb = popBody(w) || openBtn(w, "Matrix");
  const panel = mb;
  console.log("\npanel steps:", [...mb.querySelectorAll(".pl-step")].map(s=>s.textContent.trim()));
  console.log("panel tail:", panel.textContent.replace(/\s+/g," ").slice(-160));

  console.log("\n=== SPA HELPERS ===");
  console.log("spa.visible on hidden view:", w.PL.spa.visible($("#view-queue")));
  console.log("spa.visible on close btn:", w.PL.spa.visible($("#close-claim")));
  console.log("marker.make sample:", w.PL.marker.make("OVP"));
  console.log("timer viaWorker:", (() => { const t = w.PL.timer(99999, ()=>{}); const v = t.viaWorker(); t.stop(); return v; })());

  process.exit(0);
})();
