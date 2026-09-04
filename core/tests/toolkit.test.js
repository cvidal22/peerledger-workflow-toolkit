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

const load = f => w.eval(fs.readFileSync(P + f, "utf8"));
load("docs/data.js"); load("docs/app.js");
load("core/pl-core.js");
/* All seven. The Macros button reads macros from the shared registry, which
   Macro Matrix populates — loading a subset leaves the palette empty. */
["queue-auto-claim", "signal-surfacer", "context-aggregator", "macro-engine", "macro-launcher"]
  .forEach(s => load(`scripts/${s}.user.js`));

const $ = s => w.document.querySelector(s);
const $$ = s => [...w.document.querySelectorAll(s)];
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

const click = el => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log("VIEW:", w.PL.adapter.view(), "| queue rows:", $("#queue-body").children.length);
  console.log("dock buttons:", [...w.document.querySelectorAll("#pl-dock .pl-b")]
    .map(b => b.querySelector(".lb").textContent).join(", "));

  // --- open a case
  w.location.hash = "#/claim/Dispute02";
  await wait(200);
  const c = w.PL.adapter.readCase();
  console.log("\n=== CASE READ ===");
  console.log("id:", c.id, "| type:", c.type, "| filedBy:", c.filedBy);
  console.log("order:", JSON.stringify(c.order));
  console.log("complainant:", JSON.stringify(c.complainant));
  console.log("defendant:", JSON.stringify(c.defendant));
  console.log("evidence:", c.evidence.length, "| chat:", c.chat.length);

  console.log("\n=== BRIEF ===");
  console.log(openBtn(w, "Brief").textContent.replace(/\s+/g, " ").slice(0, 330));

  console.log("\n=== FLAGS (inside the brief) ===");
  popBody(w).querySelectorAll(".pl-flag .t")
    .forEach(f => console.log("  ·", f.textContent));

  // --- macro launcher
  console.log("\n=== MACRO LAUNCHER ===");
  $("#note-input").value = "";
  w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "k", altKey: true, bubbles: true }));
  await wait(100);
  const ov = $("#pl-ov");
  console.log("overlay open:", !!ov, "| items:", ov ? ov.querySelectorAll(".pl-ov-i").length : 0);
  const input = $("#pl-ov-in");
  input.value = "proof";
  input.dispatchEvent(new w.Event("input", { bubbles: true }));
  await wait(60);
  console.log("after filter 'proof':", [...w.document.querySelectorAll(".pl-ov-i .nm")].map(n => n.textContent));
  /* Enter now runs the whole macro sequence, which pauses at the review
     gate — so assert the sequence started rather than a note appearing. */
  w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  let gate = null;
  for (let i = 0; i < 40 && !gate; i++) { await wait(150); gate = $(".pl-rv-t"); }
  console.log("overlay closed:", !$("#pl-ov"), "| review gate opened:", !!gate);
  if (gate) {
    console.log("composed note:\n", gate.value.split("\n").slice(0, 3).join("\n"));
    click([...$("#pl-cf-b").querySelectorAll(".pl-btn")].find(b => b.textContent.startsWith("Save note")));
    await wait(1200);
    console.log("message sent:", $$("#sent-log .sent:not(.none)").length > 0);
  }

  // --- auto-claim
  console.log("\n=== AUTO-CLAIM ===");
  w.location.hash = "#/pool";
  await wait(200);
  console.log("pool rows:", $("#queue-body").children.length);
  /* One click runs it — there is no arm step to click through any more. */
  const acBtn = [...w.document.querySelectorAll("#pl-dock .pl-b")]
    .find(b => b.querySelector(".lb").textContent === "Auto Claim");
  click(acBtn);
  console.log("popover opened (should be false):", !!$("#pl-pop"));
  await wait(5200);
  console.log("pool rows after poll:", $("#queue-body").children.length);
  console.log("state after claim:", acBtn.classList.contains("on") ? "still armed" : "disarmed");
  w.location.hash = "#/queue";
  await wait(200);
  console.log("my queue now:", $("#queue-body").children.length, "rows");
  process.exit(0);
})();
