const { JSDOM } = require("jsdom"); const fs = require("fs");
const P = require("path").resolve(__dirname, "..") + "/";
const dom = new JSDOM(fs.readFileSync(P+"docs/index.html","utf8"),
  {runScripts:"outside-only",url:"https://cvidal22.github.io/peerledger-workflow-toolkit/",pretendToBeVisual:true});
const w=dom.window; w.HTMLElement.prototype.scrollIntoView=function(){};
if(!w.PointerEvent) w.PointerEvent=w.MouseEvent;
const L=f=>w.eval(fs.readFileSync(P+f,"utf8"));
L("docs/data.js");L("docs/scenarios.js");L("docs/app.js");L("core/pl-core.js");
["queue-auto-claim","context-aggregator","signal-surfacer","macro-launcher",
 "resolution-composer","compound-resolution","macro-matrix"].forEach(s=>L(`scripts/${s}.user.js`));
const $=s=>w.document.querySelector(s), $$=s=>[...w.document.querySelectorAll(s)];
const click=el=>el.dispatchEvent(new w.MouseEvent("click",{bubbles:true}));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const visible=()=>$$("#pl-dock .pl-b").filter(b=>b.style.display!=="none")
  .map(b=>b.querySelector(".lb").textContent+(b.querySelector(".bd").style.display!=="none"?" ["+b.querySelector(".bd").textContent+"]":""));
let failures=0;
const check=(n,ok,d)=>{console.log(`${ok?"  ok  ":"  FAIL"}  ${n}${d?" — "+d:""}`);if(!ok)failures++;};

(async()=>{
  check("dock renders", !!$("#pl-dock"));
  check("one button per script", $$("#pl-dock .pl-b").length===7, $$("#pl-dock .pl-b").length+" buttons");
  await wait(150);
  check("queue view shows only queue-scoped buttons",
    visible().length===1 && visible()[0].startsWith("Auto Claim"), visible().join(", "));
  w.location.hash="#/pool"; await wait(250);
  check("pool badge counts waiting cases", /Auto Claim \[\d+\]/.test(visible()[0]), visible()[0]);
  w.location.hash="#/claim/PL-204871"; await wait(300);
  check("case view shows the six case buttons", visible().length===6, visible().join(", "));
  w.location.hash="#/section/reports"; await wait(250);
  check("out-of-scope page shows no buttons", visible().length===0, visible().join(", ")||"(none)");

  w.location.hash="#/claim/PL-204871"; await wait(300);
  console.log("\n-- popover: Flags --");
  const flags=$$("#pl-dock .pl-b").find(b=>b.querySelector(".lb").textContent==="Flags");
  click(flags); await wait(120);
  check("popover opens beside the button", !!$("#pl-pop"));
  check("popover carries its own title", $("#pl-pop-h b").textContent==="Flagged lines");
  check("flags render", $$("#pl-pop .pl-flag .t").length>0, $$("#pl-pop .pl-flag .t").length+" flags");

  console.log("\n-- switching case updates open popover --");
  w.location.hash="#/claim/PL-205160"; await wait(350);
  check("open popover follows the case change", !!$("#pl-pop"));

  console.log("\n-- popover closes when button no longer applies --");
  w.location.hash="#/queue"; await wait(300);
  check("popover closes when its button stops applying", !$("#pl-pop"));

  console.log("\n-- toggle button: Auto Claim on pool --");
  w.location.hash="#/pool"; await wait(250);
  const ac=$$("#pl-dock .pl-b").find(b=>b.querySelector(".lb").textContent==="Auto Claim");
  const badge0 = ac.querySelector(".bd").textContent;
  check("toggle button carries a live badge", /^\d+$/.test(badge0), badge0);
  click(ac); await wait(120);
  const armBtn=[...$$("#pl-pop .pl-btn")][0];

  click(armBtn); await wait(200);
  check("arming lights the button", ac.classList.contains("on"));
  await wait(5000);
  check("claiming disarms the button", !ac.classList.contains("on"));
  check("badge updates after a claim that changed neither view nor case",
    ac.querySelector(".bd").textContent === String(Number(badge0)-1),
    badge0+" -> "+ac.querySelector(".bd").textContent);
  console.log(failures?`\n${failures} failure(s)`:"\nall button tests passed");
  process.exit(failures?1:0);
})();
