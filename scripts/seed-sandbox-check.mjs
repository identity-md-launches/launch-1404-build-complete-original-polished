import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve, extname, sep } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import http from "node:http";

const baseline = process.argv.includes("--baseline");
const label = baseline ? "before" : "after";
const require = createRequire(resolve(process.env.PEPE_DEP_ROOT || ".", "package.json"));
const { chromium } = require("playwright");
const root = resolve(process.env.PEPE_EXPORT_ROOT || "dist");
const evidence = "artifacts/seed-revision";
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };
await mkdir(evidence, { recursive: true });
const server = http.createServer(async (req, res) => {
  try {
    const uri = new URL(req.url, "http://localhost").pathname;
    if (uri === "/favicon.ico") { res.writeHead(204).end(); return; }
    if (uri.startsWith("/harness")) {
      const permissions = "allow-scripts allow-pointer-lock" + (uri.endsWith("-forms") ? " allow-forms" : "");
      res.setHeader("Content-Type", "text/html");
      res.end(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Seed launch regression</title><body style="margin:0"><iframe title="Pepe Bros" sandbox="${permissions}" src="/game/" style="display:block;width:100vw;height:100vh;border:0"></iframe><script>window.messages=[];addEventListener('message',e=>messages.push(e.data));window.send=(type,channel='review')=>document.querySelector('iframe').contentWindow.postMessage({protocol:'pepe-game/1',type,channel},'*');</script></body></html>`);
      return;
    }
    const file = resolve(root, uri.replace(/^\/game\//, "") || "index.html");
    if (!file.startsWith(root + sep)) throw Error("Invalid path");
    res.setHeader("Content-Type", mime[extname(file)] || "application/octet-stream");
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
  args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const results = [], errors = [], consoleMessages = [], failedRequests = [];
const record = (name, detail) => { results.push({ name, passed: true, ...detail }); console.log("PASS " + name); };
const snapshot = frame => frame.evaluate(() => ({
  mode: pepeDiagnostics.mode, seed: pepeDiagnostics.seed, audio: pepeDiagnostics.audio,
  elapsed: pepeDiagnostics.elapsed, storagePersistent: pepeDiagnostics.storagePersistent,
  dialog: document.querySelector("#dialog").open, focused: document.activeElement.id,
  error: document.querySelector("#seed-error")?.textContent,
  invalid: document.querySelector("#seed-input")?.getAttribute("aria-invalid"),
  submits: window.__seedSubmitCount,
}));
async function shot(page, frame, name) {
  // Wait for the opaque frame's compositor to paint the latest field/focus state.
  await frame.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  await page.screenshot({ path: `${evidence}/${name}.jpg`, type: "jpeg", quality: 80 });
}
async function openGame(kind, viewport = { width: 844, height: 600 }, hasTouch = true) {
  const context = await browser.newContext({ viewport, hasTouch });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (["error", "warning"].includes(m.type())) consoleMessages.push({ kind, type: m.type(), text: m.text() }); });
  page.on("requestfailed", r => failedRequests.push({ url: r.url(), error: r.failure() }));
  page.on("response", r => { if (r.status() >= 400) failedRequests.push({ url: r.url(), status: r.status() }); });
  await page.goto(base + (kind === "standalone" ? "/game/" : kind === "forms-control" ? "/harness-forms" : "/harness"));
  const frame = kind === "standalone" ? page : page.frames().find(f => f.url().includes("/game/"));
  await frame.waitForFunction(() => !!window.pepeDiagnostics);
  if (kind !== "standalone") {
    await page.evaluate(() => send("init"));
    await page.waitForFunction(() => messages.some(m => m.protocol === "pepe-game/1" && m.type === "ready" && m.channel === "review"));
    assert.equal((await snapshot(frame)).storagePersistent, false);
  }
  // Observe submit events only; do not change application state or its clock.
  await frame.evaluate(() => {
    window.__seedSubmitCount = 0;
    document.addEventListener("submit", () => window.__seedSubmitCount++, true);
  });
  await frame.locator("#enter-seed").click();
  await frame.waitForFunction(() => document.activeElement.id === "seed-input");
  return { context, page, frame };
}
async function activate(frame, method) {
  if (method === "enter") await frame.locator("#seed-input").press("Enter");
  else if (method === "tap") await frame.locator("#seed-form button").tap();
  else await frame.locator("#seed-form button").click();
}
async function expectStarted(frame, seed) {
  await frame.waitForFunction(seed => pepeDiagnostics.mode === "playing" && pepeDiagnostics.seed === seed, seed);
  const actual = await snapshot(frame);
  assert.equal(actual.dialog, false);
  assert.equal(actual.focused, "game");
  assert.equal(actual.audio, "running");
  return actual;
}

try {
  for (const kind of ["sandbox", "standalone", "forms-control"]) {
    for (const method of ["click", "enter"]) {
      const { context, page, frame } = await openGame(kind);
      const before = await snapshot(frame);
      await frame.locator("#seed-input").fill("GOLDEN-LILY");
      await activate(frame, method);
      let after;
      if (baseline && kind === "sandbox") {
        await page.waitForTimeout(250);
        after = await snapshot(frame);
        assert.equal(after.mode, "title");
        assert.equal(after.seed, "LILY-2026");
        assert.equal(after.dialog, true);
        assert.equal(after.submits, 0);
      } else {
        after = await expectStarted(frame, "GOLDEN-LILY");
        assert.equal(after.submits, baseline ? 1 : 0);
      }
      record(`${kind}: ${method} ${baseline && kind === "sandbox" ? "reproduces blocked launch" : "starts seed"}`, { before, after });
      if (kind === "sandbox" && method === "click") await shot(page, frame, `${label}-sandbox`);
      await context.close();
    }
  }
  if (!baseline) {
    for (const [width, height, hasTouch] of [[1440, 900, false], [390, 844, true], [568, 320, true]]) {
      const { context, page, frame } = await openGame("sandbox", { width, height }, hasTouch);
      const method = hasTouch ? "tap" : "click";
      for (const value of ["", "INVALID!"]) {
        await frame.locator("#seed-input").fill(value);
        await activate(frame, value ? "enter" : method);
        const invalid = await snapshot(frame);
        assert.equal(invalid.mode, "title");
        assert.equal(invalid.dialog, true);
        assert.equal(invalid.invalid, "true");
        assert.equal(invalid.error, "Use 1–24 letters, numbers or hyphens.");
        assert.equal(invalid.focused, "seed-input");
        assert.equal(invalid.submits, 0);
      }
      await frame.locator("#seed-input").press("Tab");
      const layout = await frame.evaluate(() => {
        const input = document.querySelector("#seed-input"), action = document.querySelector("#seed-form button");
        return { viewport: [innerWidth, innerHeight], width: document.documentElement.scrollWidth,
          input: input.getBoundingClientRect().toJSON(), action: action.getBoundingClientRect().toJSON(),
          inputFontSize: getComputedStyle(input).fontSize, focused: document.activeElement === action,
          focusOutline: getComputedStyle(action).outline, accessibleLabel: input.labels[0].textContent,
        };
      });
      assert.equal(layout.width, width);
      assert.equal(layout.focused, true);
      assert.equal(layout.inputFontSize, "16px");
      assert.ok(layout.action.height >= 44 && layout.action.right <= width && layout.action.bottom <= height);
      await shot(page, frame, `after-dialog-${width}`);
      await frame.locator("#seed-form button").press("Tab");
      assert.equal((await snapshot(frame)).focused, "close-dialog");
      await frame.locator("#close-dialog").press("Escape");
      assert.equal((await snapshot(frame)).focused, "enter-seed");
      await frame.locator("#enter-seed").click();
      await frame.locator("#seed-input").fill(" golden lily ");
      await activate(frame, method);
      const started = await expectStarted(frame, "GOLDEN-LILY");
      assert.equal(started.submits, 0);
      record(`${width}x${height}: validation, focus, normalization and ${method} start`, { layout, started });
      await context.close();
    }
    const { context, page, frame } = await openGame("sandbox");
    await frame.locator("#seed-input").fill("PAUSED-SEED");
    await page.evaluate(() => send("pause"));
    // The parent message is asynchronous; allow its event to be handled.
    await page.waitForTimeout(100);
    for (const method of ["click", "enter"]) {
      await activate(frame, method);
      const guarded = await snapshot(frame);
      assert.equal(guarded.mode, "title");
      assert.equal(guarded.seed, "LILY-2026");
      assert.equal(guarded.dialog, true);
      assert.equal(guarded.audio, "unstarted");
      assert.equal(guarded.submits, 0);
      assert.match(await frame.locator("#toast").textContent(), /Resume from the player/);
      record(`Host pause guards seed ${method}`, { guarded });
    }
    await page.evaluate(() => send("resume", "wrong-channel"));
    await page.waitForTimeout(100);
    await activate(frame, "enter");
    assert.equal((await snapshot(frame)).mode, "title");
    await page.evaluate(() => send("resume"));
    await page.waitForTimeout(100);
    await activate(frame, "enter");
    const resumed = await expectStarted(frame, "PAUSED-SEED");
    assert.equal(resumed.submits, 0);
    record("Only matching parent resume releases seeded start", { resumed });
    await context.close();
  }
  const blocked = consoleMessages.filter(m => m.text.includes("Blocked form submission"));
  assert.equal(blocked.length, baseline ? 2 : 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(failedRequests, []);
} catch (error) {
  console.error(error);
  errors.push(String(error));
  process.exitCode = 1;
} finally {
  const html = await readFile(resolve(root, "index.html"), "utf8");
  const bundle = html.match(/<script defer src="\.\/([^"]+)"/)[1];
  await writeFile(`${evidence}/${label}.json`, JSON.stringify({
    date: new Date().toISOString(), command: `node scripts/seed-sandbox-check.mjs${baseline ? " --baseline" : ""}`,
    browser: browser.version(), viewport: "844x600 with touch, plus listed layout checks",
    bundleSha256: createHash("sha256").update(await readFile(resolve(root, bundle))).digest("hex"),
    baseline, passed: errors.length === 0, results, errors, consoleMessages, failedRequests,
    limitations: ["Chromium software WebGL and emulated touch; no physical phone or WebKit/Firefox run.", "Normal animation clock; no game-state mutation. Submit observer only counts events.", "Baseline pass means the reported failure reproduced and diagnostic controls succeeded."],
  }, null, 2) + "\n");
  await browser.close();
  await new Promise(r => server.close(r));
}
