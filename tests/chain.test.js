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
load("docs/data.js"); load("docs/app.js"); load("core/pl-core.js");
["queue-auto-claim","context-aggregator","signal-surfacer","macro-launcher","resolution-composer","compound-resolution"]
  .forEach(s => load(`scripts/${s}.user.js`));

const $ = s => w.document.querySelector(s);
const $$ = s => [...w.document.querySelectorAll(s)];
const click = el => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const wait = ms => new Promise(r => setTimeout(r, ms));
const panel = () => $('[data-pl-section="compound"]');

// auto-confirm irreversible dialogs
const autoConfirm = () => {
  const t = setInterval(() => {
    const b = [...w.document.querySelectorAll("#pl-cf-b .pl-btn")].find(x => x.textContent === "Confirm");
    if (b) click(b);
  }, 50);
  return () => clearInterval(t);
};

(async () => {
  console.log("=== TEST 1: happy path ===");
  w.location.hash = "#/claim/PL-204871";
  await wait(250);
  console.log("state:", $("#main").getAttribute("data-claim-state"));
  console.log("buttons:", $$('[data-pl-section="compound"] .pl-btn').map(b => b.textContent));

  const stop = autoConfirm();
  click($$('[data-pl-section="compound"] .pl-btn')[0]);
  await wait(6000);
  stop();

  console.log("steps:", $$('[data-pl-section="compound"] .pl-step').map(s => s.textContent.trim()));
  console.log("claim state now:", $("#main").getAttribute("data-claim-state"));
  console.log("messages sent:", $$("#sent-log .sent:not(.none)").length);
  console.log("notes:", $$("#notes-table tbody tr").length);
  console.log("panel tail:", panel().textContent.replace(/\s+/g," ").slice(-150));

  console.log("\n=== TEST 2: once-guard (rerun same case) ===");
  // reopen case view
  w.location.hash = "#/queue"; await wait(120);
  w.location.hash = "#/claim/PL-204871"; await wait(250);
  console.log("panel says:", panel().textContent.replace(/\s+/g," ").slice(0,110));

  console.log("\n=== TEST 3: preflight refusal (message already sent) ===");
  w.location.hash = "#/claim/PL-204955"; await wait(250);
  // manually send a message first -> preflight 'no message already sent' must fail
  $("#msg-input").value = "manual note to user";
  click($("#msg-send"));
  await wait(900);
  console.log("sent count:", $$("#sent-log .sent:not(.none)").length);
  click($$('[data-pl-section="compound"] .pl-btn')[0]);
  await wait(500);
  console.log("result:", panel().textContent.replace(/\s+/g," ").slice(-330));
  console.log("notes (should be 1, unchanged):", $$("#notes-table tbody tr").length);
  console.log("claim state (should be open):", $("#main").getAttribute("data-claim-state"));

  console.log("\n=== TEST 4: abort mid-chain + committed report ===");
  w.location.hash = "#/claim/PL-205104"; await wait(120);
  // claim it first so it's in our queue context; then sabotage step 3
  w.location.hash = "#/claim/PL-205104"; await wait(250);
  const closeBtn = $("#close-claim");
  // make step 3 fail: remove the close button after preflight passes
  const origClick = closeBtn.click.bind(closeBtn);
  closeBtn.click = () => { throw new Error("close control unavailable"); };
  const stop2 = autoConfirm();
  click($$('[data-pl-section="compound"] .pl-btn')[0]);
  await wait(6000);
  stop2();
  console.log("steps:", $$('[data-pl-section="compound"] .pl-step').map(s => s.textContent.trim()));
  console.log("panel tail:", panel().textContent.replace(/\s+/g," ").slice(-420));
  console.log("claim state (should still be open):", $("#main").getAttribute("data-claim-state"));

  process.exit(0);
})();
