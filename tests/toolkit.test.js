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
["queue-auto-claim", "context-aggregator", "signal-surfacer", "macro-launcher", "resolution-composer"]
  .forEach(s => load(`scripts/${s}.user.js`));

const $ = s => w.document.querySelector(s);
const click = el => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log("VIEW:", w.PL.adapter.view(), "| queue rows:", $("#queue-body").children.length);
  console.log("panel sections:", [...w.document.querySelectorAll("[data-pl-section]")]
    .map(s => s.getAttribute("data-pl-section")).join(", "));

  // --- open a case
  w.location.hash = "#/claim/PL-204902";
  await wait(200);
  const c = w.PL.adapter.readCase();
  console.log("\n=== CASE READ ===");
  console.log("id:", c.id, "| type:", c.type, "| filedBy:", c.filedBy);
  console.log("order:", JSON.stringify(c.order));
  console.log("complainant:", JSON.stringify(c.complainant));
  console.log("defendant:", JSON.stringify(c.defendant));
  console.log("evidence:", c.evidence.length, "| chat:", c.chat.length);

  console.log("\n=== BRIEF ===");
  console.log($('[data-pl-section="aggregator"]').textContent.replace(/\s+/g, " ").slice(0, 330));

  console.log("\n=== FLAGS ===");
  w.document.querySelectorAll('[data-pl-section="surfacer"] .pl-flag .t')
    .forEach(f => console.log("  ·", f.textContent));

  // --- composer
  console.log("\n=== COMPOSER (route 2) ===");
  const comp = $('[data-pl-section="composer"]');
  click([...comp.querySelectorAll(".pl-btn")].find(b => b.getAttribute("data-route") === "open_recovery"));
  console.log(comp.querySelector("textarea").value.slice(0, 620));

  // note -> field
  click([...comp.querySelectorAll(".pl-btn")].find(b => b.textContent === "Note → field"));
  console.log("\nnote field now:\n", $("#note-input").value.slice(0, 240));

  // --- macro launcher
  console.log("\n=== MACRO LAUNCHER ===");
  $("#note-input").value = "";
  w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "k", altKey: true, bubbles: true }));
  await wait(100);
  const ov = $("#pl-ov");
  console.log("overlay open:", !!ov, "| items:", ov ? ov.querySelectorAll(".pl-ov-i").length : 0);
  const input = $("#pl-ov-in");
  input.value = "tpp";
  input.dispatchEvent(new w.Event("input", { bubbles: true }));
  await wait(60);
  console.log("after filter 'tpp':", [...w.document.querySelectorAll(".pl-ov-i .nm")].map(n => n.textContent));
  w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  await wait(80);
  console.log("overlay closed:", !$("#pl-ov"));
  console.log("inserted note:\n", $("#note-input").value);

  // --- auto-claim
  console.log("\n=== AUTO-CLAIM ===");
  w.location.hash = "#/pool";
  await wait(200);
  console.log("pool rows:", $("#queue-body").children.length);
  const ac = $('[data-pl-section="autoclaim"]');
  console.log("state:", ac.textContent.replace(/\s+/g, " ").slice(0, 90));
  click([...ac.querySelectorAll(".pl-btn")][0]);
  console.log("armed:", ac.textContent.replace(/\s+/g, " ").slice(0, 60));
  await wait(5200);
  console.log("pool rows after poll:", $("#queue-body").children.length);
  console.log("state after claim:", ac.textContent.replace(/\s+/g, " ").slice(0, 70));
  w.location.hash = "#/queue";
  await wait(200);
  console.log("my queue now:", $("#queue-body").children.length, "rows");
  process.exit(0);
})();
