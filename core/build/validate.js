#!/usr/bin/env node
/*
 * validate.js — the checks that must pass before any script is installable.
 *
 * A userscript with a syntax error does not fail loudly. The extension
 * accepts it, the script never runs, and the operator's only clue is that a
 * button stopped appearing. Every check here exists because the failure it
 * catches is silent.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SCRIPTS = path.join(ROOT, "scripts");
const CORE = path.join(ROOT, "core", "pl-core.js");

const HOST = "https://cvidal22.github.io/peerledger-workflow-toolkit/*";
/* raw.githubusercontent, deliberately not a CDN: jsDelivr caches branch URLs
   for up to 12 hours and ignores the query string, so a version buster does
   nothing there and an updated core silently serves stale. */
const REQUIRE_BASE = "https://raw.githubusercontent.com/cvidal22/peerledger-workflow-toolkit/main/core/pl-core.js";
const BANNED_HOST = "cdn.jsdelivr.net";

let failures = [];
const fail = (file, msg) => failures.push(`${path.basename(file)}: ${msg}`);

function meta(src) {
  const block = src.match(/\/\/ ==UserScript==([\s\S]*?)\/\/ ==\/UserScript==/);
  if (!block) return null;
  const out = {};
  block[1].split("\n").forEach(line => {
    const m = line.match(/^\/\/\s+@(\S+)\s+(.*)$/);
    if (!m) return;
    (out[m[1]] = out[m[1]] || []).push(m[2].trim());
  });
  return out;
}

/* 1. Syntax. Non-negotiable — a parse error bricks the script silently. */
function checkSyntax(file) {
  try {
    execFileSync("node", ["--check", file], { stdio: "pipe" });
  } catch (e) {
    fail(file, "syntax error\n" + e.stderr.toString().trim());
  }
}

const files = fs.readdirSync(SCRIPTS).filter(f => f.endsWith(".user.js")).map(f => path.join(SCRIPTS, f));

checkSyntax(CORE);
files.forEach(checkSyntax);

const seenNames = new Map();

files.forEach(file => {
  const src = fs.readFileSync(file, "utf8");
  const m = meta(src);
  if (!m) { fail(file, "no ==UserScript== metadata block"); return; }

  /* 2. @name must be present and unique. Two scripts sharing a name means
        installing one silently replaces the other. */
  if (!m.name) fail(file, "missing @name");
  else {
    const n = m.name[0];
    if (seenNames.has(n)) fail(file, `duplicate @name, also in ${path.basename(seenNames.get(n))}`);
    seenNames.set(n, file);
  }

  /* 3. @version must be present. The extension will not offer an update
        without it, so a fix ships to nobody. */
  if (!m.version) fail(file, "missing @version");
  else if (!/^\d+\.\d+\.\d+$/.test(m.version[0])) fail(file, `@version "${m.version[0]}" is not x.y.z`);

  /* 4. Exactly one @match, pointing at the demo. A stray @match is how a
        demo script ends up running somewhere it was never meant to. */
  if (!m.match) fail(file, "missing @match");
  else if (m.match.length !== 1) fail(file, `expected 1 @match, found ${m.match.length}`);
  else if (m.match[0] !== HOST) fail(file, `@match is "${m.match[0]}", expected "${HOST}"`);

  /* 5. @run-at document-idle everywhere — consistent timing across the suite. */
  if (!m["run-at"] || m["run-at"][0] !== "document-idle") fail(file, "@run-at must be document-idle");

  /* 6. Every script requires the same core build. */
  if (!m.require) fail(file, "missing @require for pl-core");
  else if (m.require[0].indexOf(BANNED_HOST) !== -1) fail(file, "@require uses jsDelivr, which ignores the ?v= buster on branch URLs");
  else if (!m.require[0].startsWith(REQUIRE_BASE)) fail(file, "@require does not point at core/pl-core.js on main");
  /* The version query is what forces a re-fetch when the core changes. Without
     it the extension and the CDN both serve a cached build and the scripts
     die on requireCore with nothing visible on the page. */
  else if (!/\?v=\d+\.\d+\.\d+$/.test(m.require[0])) fail(file, "@require is missing the ?v=x.y.z cache-buster");

  /* 7b. Visible bootstrap failure. A console-only throw is invisible to the
        person actually using the toolkit. */
  if (!/pl-boot-error/.test(src)) fail(file, "no visible bootstrap failure banner");

  /* 7. Duplicate-install guard. Without it two installed copies bind two
        listeners and every action fires twice. */
  if (!/PL\.guard\(/.test(src)) fail(file, "no PL.guard() call — duplicate installs would double-fire");

  /* 8. Load-order enforcement. A script that silently degrades when the core
        is missing is worse than one that refuses to start. */
  if (!/PL\.requireCore\(/.test(src)) fail(file, "no PL.requireCore() call");

  /* 9. @description present and one line. */
  if (!m.description) fail(file, "missing @description");
});

/* 10. Core must expose the API the scripts rely on. */
const coreSrc = fs.readFileSync(CORE, "utf8");

/* 10b. requireCore must name the version that actually ships. A looser
   assertion lets a cached older core pass the check and then fail on the
   first call to an API it does not have — silently, in the console. */
const coreVersion = (coreSrc.match(/version:\s*"(\d+\.\d+\.\d+)"/) || [])[1];
if (!coreVersion) failures.push("core: cannot determine PL.version");
else {
  files.forEach(file => {
    const src = fs.readFileSync(file, "utf8");
    const req = (src.match(/PL\.requireCore\("(\d+\.\d+\.\d+)"\)/) || [])[1];
    if (req !== coreVersion) {
      fail(file, `requireCore("${req}") does not match shipped core ${coreVersion}`);
    }
    const vq = (src.match(/pl-core\.js\?v=(\d+\.\d+\.\d+)/) || [])[1];
    if (vq !== coreVersion) fail(file, `@require ?v=${vq} does not match core ${coreVersion}`);
  });
}
["adapter", "chain", "poll", "template", "lang", "review", "marker", "spa", "guard",
 "requireCore", "registry", "bus", "exclusive", "abort", "timer", "waitFor"].forEach(api => {
  if (!new RegExp(`PL\\.${api}\\s*=`).test(coreSrc)) failures.push(`core: PL.${api} is not defined`);
});

/* 11. The committed bundle must match its sources. A generated artefact in
   the repository is only safe if drift is a build failure — otherwise the
   demo silently serves an older toolkit than the scripts. */
try {
  execFileSync("node", [path.join(__dirname, "bundle.js"), "--check"], { stdio: "pipe" });
} catch (e) {
  failures.push("docs/toolkit.bundle.js is out of date — run: node build/bundle.js");
}

if (failures.length) {
  console.error("VALIDATION FAILED\n");
  failures.forEach(f => console.error("  ✕ " + f));
  console.error(`\n${failures.length} problem(s)`);
  process.exit(1);
}

console.log(`✓ core + ${files.length} scripts pass syntax and metadata checks`);
