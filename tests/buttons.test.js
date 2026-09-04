const { JSDOM } = require("jsdom"); const fs = require("fs");
const P = require("path").resolve(__dirname, "..") + "/";
const dom = new JSDOM(fs.readFileSync(P+"docs/index.html","utf8"),
  {runScripts:"outside-only",url:"https://cvidal22.github.io/peerledger-workflow-toolkit/",pretendToBeVisual:true});
const w=dom.window; w.HTMLElement.prototype.scrollIntoView=function(){};
if(!w.PointerEvent) w.PointerEvent=w.MouseEvent;
const L=f=>w.eval(fs.readFileSync(P+f,"utf8"));
L("docs/data.js");L("docs/app.js");L("core/pl-core.js");
["queue-auto-claim", "signal-surfacer", "context-aggregator", "macro-engine", "macro-launcher"]
  .forEach(s=>L(`scripts/${s}.user.js`));
const $=s=>w.document.querySelector(s), $$=s=>[...w.document.querySelectorAll(s)];
const click=el=>el.dispatchEvent(new w.MouseEvent("click",{bubbles:true}));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const visible=()=>$$("#pl-dock .pl-b").filter(b=>b.style.display!=="none")
  .map(b=>b.querySelector(".lb").textContent+(b.querySelector(".bd").style.display!=="none"?" ["+b.querySelector(".bd").textContent+"]":""));
let failures=0;
const check=(n,ok,d)=>{console.log(`${ok?"  ok  ":"  FAIL"}  ${n}${d?" — "+d:""}`);if(!ok)failures++;};

(async()=>{
  check("dock renders", !!$("#pl-dock"));
  /* Five scripts, three buttons: the surfacer publishes into the Brief and
     the engine is driven by the launcher, so neither owns one. */
  check("three buttons", $$("#pl-dock .pl-b").length===3, $$("#pl-dock .pl-b").length+" buttons");
  check("dock sits bottom-left as pills",
    /column-reverse/.test(w.document.getElementById("pl-core-css").textContent) &&
    /border-radius:999px/.test(w.document.getElementById("pl-core-css").textContent));
  await wait(150);
  check("queue view shows only queue-scoped buttons",
    visible().length===1 && visible()[0].startsWith("Auto Claim"), visible().join(", "));
  w.location.hash="#/pool"; await wait(250);
  check("pool badge counts waiting cases", /Auto Claim \[\d+\]/.test(visible()[0]), visible()[0]);
  w.location.hash="#/claim/Dispute01"; await wait(300);
  check("appeal view shows Brief, Macros and Auto Claim", visible().length===3, visible().join(", "));
  w.location.hash="#/section/reports"; await wait(250);
  /* Auto Claim is the one button on every page: its job is to be reachable
     the moment a case is finished, wherever the operator happens to be. */
  check("only Auto Claim survives on an out-of-scope page",
    visible().length===1 && visible()[0]==="Auto Claim", visible().join(", ")||"(none)");

  w.location.hash="#/claim/Dispute01"; await wait(300);
  console.log("\n-- popover: Flags --");
  const brief=$$("#pl-dock .pl-b").find(b=>b.querySelector(".lb").textContent==="Brief");
  click(brief); await wait(150);
  check("popover opens beside the button", !!$("#pl-pop"));
  check("popover carries its own title", $("#pl-pop-h b").textContent==="Case brief", $("#pl-pop-h b").textContent);
  check("brief includes the flag section", /Flagged lines/.test($("#pl-pop-b").textContent));

  console.log("\n-- switching case updates open popover --");
  w.location.hash="#/claim/Dispute08"; await wait(350);
  check("open popover follows the case change", !!$("#pl-pop"));

  console.log("\n-- popover closes when button no longer applies --");
  w.location.hash="#/queue"; await wait(300);
  check("popover closes when its button stops applying", !$("#pl-pop"));

  console.log("\n-- toggle button: Auto Claim on pool --");
  w.location.hash="#/pool"; await wait(250);
  const ac=$$("#pl-dock .pl-b").find(b=>b.querySelector(".lb").textContent==="Auto Claim");
  const badge0 = ac.querySelector(".bd").textContent;
  check("toggle button carries a live badge", /^\d+$/.test(badge0), badge0);
  /* One click runs it: no popover, no arm step. */
  click(ac); await wait(200);
  check("clicking runs it directly, no popover", !$("#pl-pop"));
  check("running lights the button", ac.classList.contains("on"));
  await wait(5000);
  check("claiming disarms the button", !ac.classList.contains("on"));
  /* After claiming, the script opens the case — so the badge is gone (it only
     counts on the pool) and the hash has moved. Assert the outcome instead. */
  check("claimed case is opened automatically", /#\/claim\/Dispute/.test(w.location.hash), w.location.hash);
  console.log("\n-- disabled states explain themselves --");
  w.location.hash="#/queue"; await wait(250);
  const ac2=$$("#pl-dock .pl-b").find(b=>b.querySelector(".lb").textContent==="Auto Claim");
  check("Auto Claim is live everywhere", !ac2.classList.contains("off"), ac2.title);

  w.location.hash="#/claim/Dispute01"; await wait(250);
  const macros=$$("#pl-dock .pl-b").find(b=>b.querySelector(".lb").textContent==="Macros");
  check("Macros is live on an open claim", !macros.classList.contains("off"));
  // and dims on a closed one
  w.location.hash="#/claim/Dispute03"; await wait(200);
  const closeBtn=$("#close-claim");
  $("#note-input").value="decision"; click($("#note-save")); await wait(600);
  click(closeBtn); await wait(800);
  check("action buttons dim on a closed claim", macros.classList.contains("off"), macros.title);
  w.location.hash="#/claim/Dispute01"; await wait(250);
  check("buttons carry their hotkey in the tooltip", /Alt\+K/.test(macros.title), macros.title);

  console.log("\n-- dock is labelled --");
  check("dock has a label", !!$("#pl-dock .pl-tag"), ($("#pl-dock .pl-tag")||{}).textContent);

  console.log(failures?`\n${failures} failure(s)`:"\nall button tests passed");
  process.exit(failures?1:0);
})();
