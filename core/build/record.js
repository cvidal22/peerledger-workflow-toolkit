/*
 * Records the demo by driving the real page in Chromium and screenshotting
 * on an interval. No staging: it clicks the same buttons an operator would.
 */
const puppeteer = require("puppeteer-core");
const fs = require("fs");

const OUT = require("path").resolve(__dirname, "..", "frames");
const URL = "http://localhost:8099/docs/?toolkit=1";
const FPS = 10;

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/chromium",
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
           "--disable-gpu", "--font-render-hinting=none", "--force-device-scale-factor=1"]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 760, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: "networkidle0" });

  // wait for the toolkit to mount
  await page.waitForSelector("#pl-dock .pl-b", { timeout: 15000 });
  await new Promise(r => setTimeout(r, 600));

  let n = 0, capturing = true;
  const shoot = async () => {
    if (!capturing) return;
    try {
      await page.screenshot({ path: `${OUT}/f${String(n).padStart(4, "0")}.png` });
      n++;
    } catch (e) { /* page busy */ }
  };
  const timer = setInterval(shoot, 1000 / FPS);

  const click = async (label) => {
    await page.evaluate((l) => {
      const b = [...document.querySelectorAll("#pl-dock .pl-b")]
        .find(x => x.querySelector(".lb").textContent === l);
      if (b) b.click();
    }, label);
  };

  const pause = ms => new Promise(r => setTimeout(r, ms));

  // ---- the sequence -------------------------------------------------
  await pause(1400);                       // task pool, readable

  await click("Auto Claim");               // opens the top case
  await pause(4200);

  await click("Macros");                   // palette
  await pause(900);

  await page.type("#pl-ov-in", "request proof", { delay: 90 });
  await pause(900);
  await page.keyboard.press("Enter");

  await pause(8500);                       // four steps run
  await pause(2200);                       // back on the task pool

  capturing = false;
  clearInterval(timer);
  await browser.close();
  console.log(`captured ${n} frames`);
})();
