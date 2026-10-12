import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve, extname, sep } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import http from "node:http";

// --baseline records the existing defects without treating them as test failures.
const baseline = process.argv.includes("--baseline");
const label = baseline ? "before" : "after";
const require = createRequire(resolve(process.env.PEPE_DEP_ROOT || ".", "package.json"));
const { chromium } = require("playwright");
const root = resolve(process.env.PEPE_EXPORT_ROOT || "dist");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };
await mkdir("artifacts/revision", { recursive: true });
const server = http.createServer(async (req, res) => {
  try {
    const uri = new URL(req.url, "http://localhost").pathname;
    if (uri === "/harness") {
      res.setHeader("Content-Type", "text/html");
      res.end(`<!doctype html><html lang="en"><title>Host pause regression</title><body style="margin:0"><iframe title="Pepe Bros" sandbox="allow-scripts allow-pointer-lock" src="/preview/" style="width:100vw;height:100vh;border:0"></iframe><script>window.messages=[];addEventListener('message',e=>messages.push(e.data));window.send=(type,channel='revision')=>document.querySelector('iframe').contentWindow.postMessage({protocol:'pepe-game/1',type,channel},'*');</script></body></html>`);
      return;
    }
    const file = resolve(root, uri.replace(/^\/preview\//, "") || "index.html");
    if (!file.startsWith(root + sep)) throw Error("Invalid path");
    res.setHeader("Content-Type", mime[extname(file)] || "application/octet-stream");
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
  args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const results = [], errors = [], failedRequests = [];
const track = p => {
  p.setDefaultTimeout(15000);
  p.on("pageerror", e => errors.push(String(e)));
  p.on("requestfailed", r => failedRequests.push({ url: r.url(), error: r.failure() }));
};
const record = (name, data) => { results.push({ name, ...data }); console.log(name, JSON.stringify(data)); };
const shot = (p, name) => p.screenshot({ path: `artifacts/revision/${label}-${name}.jpg`, type: "jpeg", quality: 80 });
const diagnostics = p => p.evaluate(() => window.pepeDiagnostics);
const step = (p, frames) => p.evaluate(n => { for (let i = 0; i < n; i++) window.__revisionClock(); }, frames);
const overlap = (a, b) => !!a && !!b && a.x < b.right && b.x < a.right && a.y < b.bottom && b.y < a.bottom;
const layout = p => p.evaluate(() => {
  const box = selector => {
    const el = document.querySelector(selector);
    if (!el || !el.checkVisibility()) return null;
    return el.getBoundingClientRect().toJSON();
  };
  return {
    viewport: [innerWidth, innerHeight], document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    stage: box(".stage"), action: box("#new-run"), hud: box("#hud"), status: box("#game-bottom"),
    tutorial: box("#tutorial"), intro: box("#level-intro"), rotate: box("#rotate-hint"),
    jump: box("#touch-jump"), left: box("#touch-left"), right: box("#touch-right"), fire: box("#touch-fire"),
  };
});

try {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    track(page);
    await page.goto(base + "/preview/");
    await page.waitForFunction(() => !!window.pepeDiagnostics);
    await page.evaluate(() => document.fonts.ready);
    const title = await page.evaluate(() => {
      const weights = new Set();
      for (const el of document.querySelectorAll("body *")) {
        if (el.checkVisibility() && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) weights.add(getComputedStyle(el).fontWeight);
      }
      return { weights: [...weights].sort(), chip: !!document.querySelector(".adventure-chip"), description: document.querySelector(".title-description").textContent };
    });
    record(`title ${width}x${height}`, { ...title, layout: await layout(page) });
    await shot(page, `title-${width}`);
    if (!baseline) {
      assert.deepEqual(title.weights, ["400", "600", "850"]);
      assert.equal(title.chip, false);
      assert.equal(title.description, "A seeded platformer through the Lily Kingdom.");
      const m = await layout(page);
      assert.ok(m.action.bottom <= height);
      assert.equal(m.document[0], width);
    }
    await page.close();
  }
  for (const [width, height] of [[667, 375], [568, 320], [844, 390], [740, 560], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    // Hold the actual introduction so all its frames can be inspected reliably.
    await context.addInitScript(() => {
      let now = 0, callbacks = [], frame = 0;
      performance.now = () => now;
      requestAnimationFrame = cb => (callbacks.push(cb), callbacks.length);
      for (const method of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced", "clear"]) {
        const original = WebGL2RenderingContext.prototype[method];
        WebGL2RenderingContext.prototype[method] = function (...args) { if (frame % 12 === 0) return original.apply(this, args); };
      }
      window.__revisionClock = () => { now += 1000 / 120; frame++; const pending = callbacks; callbacks = []; pending.forEach(cb => cb(now)); };
    });
    const p = await context.newPage();
    track(p);
    await p.goto(base + "/preview/");
    await p.waitForFunction(() => !!window.pepeDiagnostics, {}, { polling: 100 });
    await p.evaluate(() => document.fonts.ready);
    await step(p, 12);
    const title = await layout(p);
    await shot(p, `landscape-title-${width}`);
    const action = title.action;
    await p.touchscreen.tap(action.x + action.width / 2, action.y + action.height / 2);
    await step(p, 12);
    let startMethod = "touch";
    if (baseline && (await diagnostics(p)).mode === "title") {
      // The old 568px title puts New run below the screen; inspect gameplay too.
      startMethod = "DOM click after offscreen touch missed";
      await p.evaluate(() => document.querySelector("#new-run").click());
      await step(p, 12);
    }
    const intro = await layout(p);
    await shot(p, `intro-${width}`);
    await step(p, 288);
    const tutorial = await layout(p);
    await shot(p, `tutorial-${width}`);
    await p.evaluate(() => document.querySelector("#dismiss-tutorial").click());
    const dismissed = await layout(p);
    record(`onboarding ${width}x${height}`, { startMethod, title, intro, tutorial, dismissedRotate: dismissed.rotate, introTutorialOverlap: overlap(intro.intro, intro.tutorial), statusTutorialOverlap: overlap(tutorial.status, tutorial.tutorial), jumpTutorialOverlap: overlap(tutorial.jump, tutorial.tutorial) });
    if (!baseline) {
      assert.equal(title.document[0], width);
      assert.ok(title.action.bottom <= height);
      assert.equal(intro.tutorial, null, "Tutorial waits until the intro finishes");
      assert.ok(intro.intro);
      assert.equal(tutorial.intro, null);
      assert.ok(tutorial.tutorial);
      if (width > height) {
        assert.ok(title.document[1] <= height, "Landscape title fits the viewport");
        assert.equal(dismissed.rotate, null, "Landscape never recommends rotation");
        for (const m of [intro, tutorial]) {
          const message = m.intro || m.tutorial;
          for (const control of [m.hud, m.status, m.jump, m.left, m.right, m.fire]) assert.equal(overlap(message, control), false, "Onboarding clears status and touch controls");
          assert.ok(message.y >= 0 && message.bottom <= height);
          assert.ok(m.jump.bottom <= height && m.left.bottom <= height);
        }
      } else assert.ok(dismissed.rotate, "Portrait retains its rotation hint");
      if (width === 568) {
        await p.evaluate(() => {
          document.querySelector("#pause").click();
          document.querySelector("#return-title").click();
          document.querySelector("#enter-seed").click();
          document.querySelector("#seed-input").value = "WWWWWWWWWWWWWWWWWWWWWWWW";
          document.querySelector("#seed-form").requestSubmit();
        });
        await step(p, 12);
        const longSeedIntro = await layout(p);
        await step(p, 288);
        const longSeedTutorial = await layout(p);
        record("568px maximum-length seed clears onboarding", { intro: longSeedIntro, tutorial: longSeedTutorial });
        assert.equal(overlap(longSeedIntro.intro, longSeedIntro.hud), false);
        assert.equal(overlap(longSeedTutorial.tutorial, longSeedTutorial.hud), false);
        assert.equal(longSeedTutorial.document[0], width);
        await shot(p, "long-seed-568");
      }
    }
    await context.close();
  }
  const p = await browser.newPage({ viewport: { width: 844, height: 600 }, hasTouch: true });
  track(p);
  await p.goto(base + "/harness");
  const frame = p.frames().find(f => f.url().includes("/preview/"));
  await frame.waitForFunction(() => !!window.pepeDiagnostics);
  await p.evaluate(() => send("init"));
  await p.waitForFunction(() => messages.some(m => m.type === "ready"));
  await frame.locator("#new-run").click();
  await frame.waitForFunction(() => window.pepeDiagnostics.elapsed > 0.05);
  await p.evaluate(() => send("pause"));
  await frame.waitForFunction(() => window.pepeDiagnostics.mode === "paused");
  const paused = await diagnostics(frame);
  await frame.locator("#resume").click();
  const resume = await diagnostics(frame);
  await frame.locator("#restart-run").click();
  await p.waitForTimeout(200);
  const restart = await diagnostics(frame);
  record("host pause survives restart", { paused: { mode: paused.mode, elapsed: paused.elapsed }, resume: { mode: resume.mode, elapsed: resume.elapsed }, restart: { mode: restart.mode, elapsed: restart.elapsed }, messages: await p.evaluate(() => messages) });
  if (!baseline) {
    assert.equal(restart.mode, "paused");
    assert.equal(restart.elapsed, paused.elapsed);
    assert.equal(restart.seed, paused.seed);
    await p.evaluate(() => send("resume", "wrong-channel"));
    await p.waitForTimeout(100);
    assert.equal((await diagnostics(frame)).mode, "paused");
    await frame.locator("#return-title").click();
    await frame.locator("#new-run").click();
    assert.equal((await diagnostics(frame)).mode, "title");
    await p.evaluate(() => send("resume"));
    await frame.locator("#new-run").click();
    await frame.waitForFunction(() => window.pepeDiagnostics.mode === "playing");
    record("host pause also guards New run from the title; valid resume releases starts", { passed: true });
    await p.evaluate(() => send("pause"));
    await frame.waitForFunction(() => window.pepeDiagnostics.mode === "paused");
    await p.evaluate(() => send("resume"));
    await frame.waitForFunction(() => window.pepeDiagnostics.mode === "playing");
    await frame.locator("#pause").click();
    await frame.locator("#restart-run").click();
    assert.equal((await diagnostics(frame)).mode, "playing");
    record("valid parent resume and local restart still work", { passed: true });
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(failedRequests, []);
} catch (error) {
  console.error(error);
  errors.push(String(error));
  process.exitCode = 1;
} finally {
  const html = await readFile(resolve(root, "index.html"), "utf8");
  const js = html.match(/<script defer src="\.\/([^"]+)"/)[1];
  await writeFile(`artifacts/revision/${label}.json`, JSON.stringify({ date: new Date().toISOString(), command: `node scripts/revision-check.mjs${baseline ? " --baseline" : ""}`, browser: browser.version(), bundleSha256: createHash("sha256").update(await readFile(resolve(root, js))).digest("hex"), baseline, passed: errors.length === 0, results, errors, failedRequests, limitations: ["Chromium software WebGL and emulated touch, not physical phones.", "Onboarding clock controlled at 120 Hz, every twelfth frame rasterized; host pause uses the normal clock."] }, null, 2) + "\n");
  await browser.close();
  await new Promise(r => server.close(r));
}
