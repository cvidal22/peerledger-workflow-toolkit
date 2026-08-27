/*
 * Proves the scripts survive the failure modes the console can be made to
 * exhibit. This is the test that matters: anything works on a clean page.
 */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const P = require("path").resolve(__dirname, "..") + "/";

function boot(scenario) {
  const dom = new JSDOM(fs.readFileSync(P + "docs/index.html", "utf8"), {
    runScripts: "outside-only",
    url: "https://cvidal22.github.io/peerledger-workflow-toolkit/" +
         (scenario ? "?scenario=" + scenario : ""),
    pretendToBeVisual: true
  });
  const w = dom.window;
  w.HTMLElement.prototype.scrollIntoView = function () {};
  if (!w.PointerEvent) w.PointerEvent = w.MouseEvent;
  const L = f => w.eval(fs.readFileSync(P + f, "utf8"));
  L("docs/data.js"); L("docs/scenarios.js"); L("docs/app.js"); L("core/pl-core.js");
  return w;
}

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let failures = 0;
  const check = (name, ok, detail) => {
    console.log(`${ok ? "  ok  " : "  FAIL"}  ${name}${detail ? " — " + detail : ""}`);
    if (!ok) failures++;
  };

  // --- slow load -----------------------------------------------------------
  console.log("\nscenario=slow");
  {
    const w = boot("slow");
    w.location.hash = "#/claim/PL-204871";
    await wait(120);
    const early = w.PL.adapter.readCase();
    check("fields are empty before data arrives", early.order.status === "" || early.order.status === "--",
          JSON.stringify(early.order.status));
    let ready = false;
    w.PL.spa.ready(() => w.PL.adapter.readCase().order.status, { timeoutMs: 5000, label: "order" })
      .then(() => { ready = true; });
    await wait(2500);
    check("PL.spa.ready resolves once values populate", ready);
    check("adapter reads real data after the wait", w.PL.adapter.readCase().order.ref === "ORD-88213445");
  }

  // --- swallowed click -----------------------------------------------------
  console.log("\nscenario=noop");
  {
    const w = boot("noop");
    w.location.hash = "#/claim/PL-204871";
    await wait(150);
    const $ = s => w.document.querySelector(s);
    const before = w.document.querySelectorAll("#notes-table tbody tr td.by").length;
    const mark = w.PL.marker.make("T");
    w.PL.spa.set($("#note-input"), mark + " first attempt");
    w.PL.spa.click($("#note-save"));
    await wait(700);
    check("first save is silently swallowed",
          w.document.querySelectorAll("#notes-table tbody tr td.by").length === before);
    check("marker verification correctly reports NOT saved",
          w.PL.marker.present("#notes-table", mark) === false);
    // retry succeeds
    w.PL.spa.set($("#note-input"), mark + " retry");
    w.PL.spa.click($("#note-save"));
    await wait(700);
    check("retry lands and marker is found", w.PL.marker.present("#notes-table", mark));
  }

  // --- concurrent colleague ------------------------------------------------
  console.log("\nscenario=concurrent");
  {
    const w = boot("concurrent");
    w.location.hash = "#/claim/PL-204871";
    await wait(150);
    const $ = s => w.document.querySelector(s);
    const rowsBefore = w.document.querySelectorAll("#notes-table tbody tr td.by").length;
    const mine = w.PL.marker.make("MINE");
    const theirs = w.PL.marker.make("THEIRS");
    w.PL.spa.set($("#note-input"), mine + " my decision");
    w.PL.spa.click($("#note-save"));
    await wait(700);
    const rowsAfter = w.document.querySelectorAll("#notes-table tbody tr td.by").length;
    check("two writes landed, not one", rowsAfter === rowsBefore + 2, `${rowsBefore} -> ${rowsAfter}`);
    check("row-count check would have passed on either write", rowsAfter > rowsBefore);
    check("marker finds MY write specifically", w.PL.marker.present("#notes-table", mine));
    check("marker does not match a write I never made",
          w.PL.marker.present("#notes-table", theirs) === false);
  }

  // --- stale keep-alive ----------------------------------------------------
  console.log("\nscenario=stale");
  {
    const w = boot("stale");
    w.location.hash = "#/claim/PL-204871";
    await wait(150);
    w.location.hash = "#/queue";
    await wait(200);
    const bodies = w.document.querySelectorAll("tbody").length;
    check("more than one tbody is mounted", bodies > 1, `${bodies} found`);
    check("adapter still reads the live queue",
          w.PL.adapter.readQueue().length > 0 &&
          w.PL.adapter.readQueue()[0].id.startsWith("PL-"));
  }

  // --- colliding sidebar text ---------------------------------------------
  console.log("\nscenario=twins");
  {
    const w = boot("twins");
    w.location.hash = "#/claim/PL-204871";
    await wait(150);
    const all = [...w.document.querySelectorAll("button")]
      .filter(b => b.textContent.trim() === "Save note");
    check("more than one element carries the label", all.length > 1, `${all.length} found`);

    // The naive lookup: first match in document order.
    const naive = all[0];
    check("naive first-match picks the hidden sidebar copy",
          naive.closest(".nav-collapsed") !== null);

    // PL.spa.byText filters for visibility.
    const correct = w.PL.spa.byText("button", "Save note");
    check("PL.spa.byText picks the real on-page control",
          correct !== null && correct.id === "note-save",
          correct ? correct.id || "(no id)" : "null");
  }

  // --- teleported menus ----------------------------------------------------
  console.log("\nscenario=menus");
  {
    const w = boot("menus");
    w.location.hash = "#/claim/PL-204871";
    await wait(150);
    const triggers = [...w.document.querySelectorAll("[data-evidence-menu]")];
    check("each evidence row has a menu trigger", triggers.length >= 2, `${triggers.length} rows`);

    /* jsdom implements no layout, so getBoundingClientRect returns zeros for
       everything and any geometric ranking degenerates to "first". Stub real
       coordinates so the test exercises the ranking, not the DOM engine. */
    let y = 0;
    const place = (el, top) => { el.getBoundingClientRect = () => ({ top, bottom: top + 20, left: 0, right: 100, width: 100, height: 20 }); };
    triggers.forEach(t => place(t, (y += 100)));

    // Open two menus without closing the first.
    triggers[0].dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    triggers[1].dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    await wait(80);

    const menus = [...w.document.querySelectorAll(".teleported-menu")];
    menus.forEach((m, i) => place(m, (i + 1) * 100 + 20));
    check("both menus coexist, detached from their rows", menus.length === 2, `${menus.length} open`);
    check("menus live in <body>, not in the evidence list",
          menus.every(m => m.parentElement === w.document.body));

    // Naive: first in document order. Correct: nearest to the anchor.
    const wanted = triggers[1].getAttribute("data-evidence-menu");
    check("document order gives the wrong menu",
          menus[0].getAttribute("data-for") !== wanted);
    const picked = w.PL.spa.nearest(menus, triggers[1]);
    check("PL.spa.nearest resolves the right one",
          picked && picked.getAttribute("data-for") === wanted,
          picked ? picked.getAttribute("data-for") : "null");

    // Handler is on the button inside the item, not the item.
    const li = picked.querySelector("li");
    check("clicking the <li> does nothing", (li.onclick === null));
    check("menu labels carry padding whitespace, so lookups must trim",
          li.querySelector("button").textContent !== li.querySelector("button").textContent.trim());
  }

  console.log(failures ? `\n${failures} failure(s)` : "\nall scenario tests passed");
  process.exit(failures ? 1 : 0);
})();
