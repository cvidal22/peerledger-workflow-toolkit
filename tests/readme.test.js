// Check the README's factual claims against a live run.
const { JSDOM } = require("jsdom"); const fs=require("fs");
const P=require("path").resolve(__dirname, "..") + "/";
const dom=new JSDOM(fs.readFileSync(P+"docs/index.html","utf8"),{runScripts:"outside-only",url:"https://x.io/",pretendToBeVisual:true});
const w=dom.window; w.HTMLElement.prototype.scrollIntoView=function(){};
if(!w.PointerEvent) w.PointerEvent=w.MouseEvent;
["docs/data.js","docs/app.js"].forEach(f=>w.eval(fs.readFileSync(P+f,"utf8")));
w.eval(fs.readFileSync(P+"docs/toolkit.bundle.js","utf8"));
const $=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
const click=el=>el.dispatchEvent(new w.MouseEvent("click",{bubbles:true}));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const btn=l=>$$("#pl-dock .pl-b").find(b=>b.querySelector(".lb").textContent===l);
let bad=0; const ck=(n,ok,d)=>{console.log(`${ok?"  ok  ":"  FAIL"}  ${n}${d?" — "+d:""}`);if(!ok)bad++;};
(async()=>{
  await wait(300);
  ck("three buttons docked", $$("#pl-dock .pl-b").length===3,
     $$("#pl-dock .pl-b").map(b=>b.querySelector(".lb").textContent).join(", "));
  ck("nav is Task pool / Handling / Closed",
     $$(".sidenav a.nav-item").map(a=>a.textContent.trim()).join(" | ")==="Task pool | Handling | Closed",
     $$(".sidenav a.nav-item").map(a=>a.textContent.trim()).join(" | "));
  ck("scenery is inert", $$(".topnav .scenery").length===5 && !$$(".topnav .scenery").some(x=>x.tagName==="A"));

  w.location.hash="#/claim/Dispute08"; await wait(320);
  const c=w.PL.adapter.readCase();
  ck("Dispute08 is the Portuguese one",
     w.PL.lang.forParty(c.chat,"buyer",c.id).lang==="pt",
     w.PL.lang.forParty(c.chat,"buyer",c.id).lang);

  click(btn("Macros")); await wait(250);
  ck("48 macros in the palette", $$(".pl-ov-i").length===48, $$(".pl-ov-i").length+"");
  ck("codes are RWP/CBP/CBK/OVP/UND/BAF",
     [...new Set($$(".pl-ov-i .code").map(x=>x.textContent))].sort().join(",")==="BAF,CBK,CBP,OVP,RWP,UND",
     [...new Set($$(".pl-ov-i .code").map(x=>x.textContent))].join(","));
  w.PL.ui.closePopover();
  w.document.dispatchEvent(new w.KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
  await wait(100);

  // the documented 4-step RWP sequence, on a Portuguese case
  w.location.hash="#/claim/Dispute08"; await wait(300);
  click(btn("Macros")); await wait(250);
  $("#pl-ov-in").value="request proof"; $("#pl-ov-in").dispatchEvent(new w.Event("input",{bubbles:true}));
  await wait(120);
  w.document.dispatchEvent(new w.KeyboardEvent("keydown",{key:"Enter",bubbles:true}));
  await wait(600);
  const steps=$$("#pl-run .pl-run-step .nm").map(n=>n.textContent);
  ck("four steps as documented", steps.length===4, steps.join(" / "));
  await wait(7000);
  ck("message sent in Portuguese", /\[pt\]/.test(($("#sent-log .sent")||{textContent:""}).textContent));
  ck("remark not translated",
     !/\[pt\]/.test([...$$("#notes-table tbody tr td:not(.by)")].map(t=>t.textContent).join(" ")));
  ck("returned to the task pool", w.location.hash==="#/queue", w.location.hash);
  w.location.hash="#/handling"; await wait(300);
  ck("Dispute08 parked in Handling",
     $$("#queue-body tr[data-row-claim]").map(t=>t.getAttribute("data-row-claim")).includes("Dispute08"));
  console.log(bad?`\n${bad} README claim(s) wrong`:"\nevery README claim verified");
  process.exit(bad?1:0);
})();
