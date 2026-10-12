import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve, extname, sep } from "node:path";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
const require = createRequire(
  resolve(process.env.PEPE_DEP_ROOT || process.cwd(), "package.json"),
);
const { chromium } = require("playwright");
await mkdir("artifacts", { recursive: true });
const root = resolve("dist"),
  mimes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
    ".json": "application/json",
  };
const server = http.createServer(async (req, res) => {
  try {
    const uri = new URL(req.url, "http://localhost").pathname;
    if (uri === "/harness") {
      res.setHeader("Content-Type", "text/html");
      res.end(
        `<!doctype html><html lang="en"><title>Arcade sandbox check</title><body style="margin:0"><iframe title="Pepe Bros" sandbox="allow-scripts allow-pointer-lock" src="/preview/" style="width:100vw;height:100vh;border:0"></iframe><script>window.messages=[];addEventListener('message',e=>messages.push(e.data));window.send=(type,channel='validation-channel')=>document.querySelector('iframe').contentWindow.postMessage({protocol:'pepe-game/1',type,channel},'*');</script></body></html>`,
      );
      return;
    }
    const file = resolve(
      root,
      uri.replace(/^\/preview\//, "").replace(/^\//, "") || "index.html",
    );
    if (!file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const data = await readFile(file);
    res.setHeader(
      "Content-Type",
      mimes[extname(file)] || "application/octet-stream",
    );
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const results = [],
  errors = [],
  requests = [];
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(String(e)));
page.on("requestfailed", (r) =>
  requests.push({ url: r.url(), error: r.failure() }),
);
const result = (name, detail) => {
  console.log("PASS " + name);
  results.push({ name, passed: true, ...detail });
};
const diag = (p) => p.evaluate(() => window.pepeDiagnostics);
const shot = (name, p = page) =>
  p.screenshot({ path: `artifacts/${name}.jpg`, type: "jpeg", quality: 82 });
async function startSeed(p, seed) {
  await p.locator("#enter-seed").click();
  await p.locator("#seed-input").fill(seed);
  await p.locator("#seed-form button").click();
  await p.waitForFunction(() => window.pepeDiagnostics.mode === "playing");
}
try {
  await page.goto(base + "/preview/");
  await page.waitForFunction(() => !!window.pepeDiagnostics);
  await page.evaluate(() => document.fonts.ready);
  assert.equal((await diag(page)).audio, "unstarted");
  assert.equal(await page.locator("h1").innerText(), "Pepe\nBros.");
  const contrasts = await page.evaluate(() => {
    const rgb = (c) =>
      c
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number)
        .map((x) => {
          x /= 255;
          return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
        });
    const lum = (c) => {
      const v = rgb(c);
      return v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722;
    };
    const pair = (name, fg, bg) => {
      const a = lum(fg),
        b = lum(bg);
      return {
        name,
        foreground: fg,
        background: bg,
        ratio:
          Math.round(
            ((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100,
          ) / 100,
      };
    };
    const action = getComputedStyle(document.querySelector("#new-run")),
      secondary = getComputedStyle(document.querySelector("#enter-seed")),
      body = getComputedStyle(document.body),
      root = getComputedStyle(document.documentElement);
    return [
      pair("Primary action", action.color, action.backgroundColor),
      pair("Secondary action", secondary.color, secondary.backgroundColor),
      pair(
        "Header muted text",
        getComputedStyle(document.querySelector(".top-center")).color,
        root.backgroundColor,
      ),
    ];
  });
  assert.ok(contrasts.every((c) => c.ratio >= 4.5));
  result("Measured rendered solid text/background contrast", { contrasts });
  await shot("desktop-title");
  result("Desktop title, local font, metadata and gesture-gated audio", {
    title: await page.title(),
  });
  for (const width of [390, 320, 768]) {
    await page.setViewportSize({ width, height: 844 });
    const m = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      action: document
        .querySelector("#new-run")
        .getBoundingClientRect()
        .toJSON(),
      heading: document.querySelector("h1").getBoundingClientRect().toJSON(),
    }));
    assert.equal(m.overflow, false);
    assert.ok(m.action.bottom < 844);
    assert.ok(m.action.x >= 0 && m.action.right <= width);
    result(`${width}px title reflow and primary action above fold`, m);
    if (width === 390) await shot("mobile-title");
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await startSeed(page, "WWWWWWWWWWWWWWWWWWWWWWWW");
  const longSeedLayout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    seed: document.querySelector("#seed-value").textContent,
    hud: document.querySelector("#hud").getBoundingClientRect().toJSON(),
  }));
  assert.equal(longSeedLayout.overflow, false);
  assert.ok(longSeedLayout.hud.right <= 320);
  assert.equal(longSeedLayout.seed.length, 24);
  await shot("narrow-long-seed");
  result("320px gameplay HUD with a maximum-length seed", longSeedLayout);
  await page.keyboard.press("p");
  await page.locator("#return-title").click();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.locator("#enter-seed").click();
  await page.locator("#seed-input").fill("INVALID!");
  await page.locator("#seed-form button").click();
  assert.equal(
    await page.locator("#seed-input").getAttribute("aria-invalid"),
    "true",
  );
  await page.locator("#seed-input").fill("GOLDEN-LILY");
  await page.locator("#seed-form button").click();
  assert.equal((await diag(page)).seed, "GOLDEN-LILY");
  assert.equal((await diag(page)).audio, "running");
  result("Seed validation, valid seeded start and audio unlocked by gesture");
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(
    () => window.pepeDiagnostics.player.x > 6.4,
    {},
    { timeout: 15000 },
  );
  await page.keyboard.up("ArrowRight");
  const moved = await diag(page);
  assert.ok(moved.player.x > 5);
  assert.ok(moved.score >= 100);
  await page.keyboard.down("Space");
  await page.waitForFunction(
    () => window.pepeDiagnostics.player.y > 0.7,
    {},
    { timeout: 10000 },
  );
  const jumped = await diag(page);
  await page.keyboard.up("Space");
  assert.ok(jumped.player.y > 0.5);
  await page.keyboard.press("p");
  const frozen = await diag(page);
  await page.waitForTimeout(300);
  const frozen2 = await diag(page);
  assert.equal(frozen2.elapsed, frozen.elapsed);
  assert.equal(frozen2.player.x, frozen.player.x);
  assert.ok(await page.locator("#resume").isVisible());
  assert.equal(await page.evaluate(() => document.activeElement.id), "resume");
  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    "return-title",
  );
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.id), "resume");
  await shot("pause-menu");
  result(
    "Keyboard movement, fly collection, variable jump, P pause and frozen simulation",
    { movedX: moved.player.x, jumpY: jumped.player.y },
  );
  await page.locator("#quality").click();
  const q = (await diag(page)).quality;
  assert.equal(
    await page.locator("#quality").innerText(),
    `Quality: ${q === "high" ? "High" : "Low"}`,
  );
  await page.locator("#dialog-mute").click();
  assert.equal((await diag(page)).muted, true);
  await page.locator("#resume").click();
  await page.waitForTimeout(80);
  assert.equal((await diag(page)).mode, "playing");
  await page.keyboard.press("Escape");
  await page.locator("#restart-run").click();
  let d = await diag(page);
  assert.equal(d.seed, "GOLDEN-LILY");
  assert.equal(d.score, 0);
  assert.equal(d.lives, 3);
  assert.ok(d.player.x < 3.1);
  result("Resume, Esc pause, quality, mute and same-seed restart");
  // Software WebGL may take seconds per High-quality frame. Use the real
  // quality control for the long, normal-clock game-over observation.
  if (d.quality === "high") {
    await page.locator("#pause").click();
    await page.locator("#quality").click();
    await page.locator("#resume").click();
  }
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(
    () => window.pepeDiagnostics.mode === "gameover",
    {},
    { timeout: 90000 },
  );
  await page.keyboard.up("ArrowRight");
  d = await diag(page);
  assert.equal(d.lives, 0);
  await shot("game-over");
  const ending = d;
  await page.locator("#replay").click();
  d = await diag(page);
  assert.equal(d.lives, 3);
  assert.equal(d.score, 0);
  assert.equal(d.seed, "GOLDEN-LILY");
  result("Natural three-life game over and one-click replay", {
    endingScore: ending.score,
    endingTime: ending.elapsed,
    quality: ending.quality,
  });
  await page.reload();
  await page.waitForFunction(() => !!window.pepeDiagnostics);
  assert.equal((await diag(page)).muted, true);
  assert.equal((await diag(page)).audio, "unstarted");
  result("Mute preference persists across reload without autoplay");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(
    () => window.pepeDiagnostics.reducedMotion === true,
  );
  assert.equal((await diag(page)).reducedMotion, true);
  result("Reduced-motion media preference updates the renderer");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const touchContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  });
  const touch = await touchContext.newPage();
  touch.on("pageerror", (e) => errors.push(String(e)));
  await touch.goto(base + "/preview/");
  await touch.locator("#new-run").tap();
  await touch.waitForFunction(() => window.pepeDiagnostics.elapsed > 0.5);
  assert.equal((await diag(touch)).quality, "low");
  assert.ok(await touch.locator("#touch-jump").isVisible());
  const client = await touchContext.newCDPSession(touch),
    right = await touch.locator("#touch-right").boundingBox(),
    jump = await touch.locator("#touch-jump").boundingBox();
  const points = [
    { x: right.x + right.width / 2, y: right.y + right.height / 2, id: 1 },
    { x: jump.x + jump.width / 2, y: jump.y + jump.height / 2, id: 2 },
  ];
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: points,
  });
  await touch.waitForFunction(
    () =>
      window.pepeDiagnostics.player.y > 0.7 &&
      window.pepeDiagnostics.player.x > 3.3,
  );
  const touchJump = await diag(touch);
  assert.ok(touchJump.player.x > 3.3);
  assert.ok(touchJump.player.y > 0.5);
  assert.equal(touchJump.input.jump, true);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await touch.waitForTimeout(60);
  assert.equal((await diag(touch)).input.right, false);
  assert.equal((await diag(touch)).input.jump, false);
  await touch.waitForFunction(() => window.pepeDiagnostics.elapsed > 2.7);
  await shot("mobile-game", touch);
  result(
    "Mobile automatic Low quality, real simultaneous touch movement/jump and pointer cancellation",
    { jumpY: touchJump.player.y, x: touchJump.player.x },
  );
  await touch.setViewportSize({ width: 844, height: 390 });
  await shot("touch-landscape", touch);
  const touchBounds = await touch.locator("#touch-jump").boundingBox();
  assert.ok(touchBounds.y + touchBounds.height <= 390);
  result("Landscape touch controls remain within the viewport");
  await touchContext.close();
  await page.setViewportSize({ width: 844, height: 600 });
  await page.goto(base + "/harness");
  const frame = page.frames().find((f) => f.url().includes("/preview/"));
  assert.ok(frame);
  await frame.waitForFunction(() => !!window.pepeDiagnostics);
  const storageDenied = await frame.evaluate(() => {
    try {
      localStorage.setItem("check", "1");
      return false;
    } catch {
      return true;
    }
  });
  assert.ok(storageDenied);
  assert.equal((await diag(frame)).storagePersistent, false);
  await page.evaluate(() => send("init"));
  await page.waitForFunction(() =>
    messages.some(
      (m) =>
        m.type === "ready" &&
        m.protocol === "pepe-game/1" &&
        m.channel === "validation-channel",
    ),
  );
  await frame.locator("#new-run").click();
  await frame.waitForTimeout(100);
  await page.evaluate(() => send("pause", "wrong-channel"));
  assert.equal((await diag(frame)).mode, "playing");
  await frame.evaluate(() =>
    window.postMessage(
      { protocol: "pepe-game/1", type: "pause", channel: "validation-channel" },
      "*",
    ),
  );
  await frame.waitForTimeout(60);
  assert.equal((await diag(frame)).mode, "playing");
  await page.evaluate(() => send("pause"));
  await frame.waitForFunction(() => window.pepeDiagnostics.mode === "paused");
  const at = await diag(frame);
  await frame.waitForTimeout(150);
  assert.equal((await diag(frame)).elapsed, at.elapsed);
  await page.evaluate(() => send("resume"));
  await frame.waitForFunction(() => window.pepeDiagnostics.mode === "playing");
  await frame.locator("#pause").click();
  if ((await diag(frame)).quality === "high")
    await frame.locator("#quality").click();
  await frame.locator("#resume").click();
  result(
    "Opaque-origin sandbox: denied storage, channel handshake, source/channel rejection and host pause/resume",
    { gameOverCheckQuality: (await diag(frame)).quality },
  );
  await frame.locator("#game").focus();
  await page.keyboard.down("ArrowRight");
  await frame.waitForFunction(
    () => window.pepeDiagnostics.mode === "gameover",
    {},
    { timeout: 240000 },
  );
  await page.keyboard.up("ArrowRight");
  await page.waitForFunction(() =>
    messages.some((message) => message.type === "score"),
  );
  const messages = await page.evaluate(() => messages);
  const scores = messages.filter((m) => m.type === "score");
  assert.equal(scores.length, 1);
  assert.ok(Number.isSafeInteger(scores[0].score) && scores[0].score >= 0);
  assert.equal(scores[0].channel, "validation-channel");
  await shot("sandbox-game-over");
  result(
    "Sandbox game-over score bridge emits one finite nonnegative integer",
    { messages },
  );
  await frame.locator("#replay").click();
  assert.equal((await diag(frame)).lives, 3);
  result("Sandbox restart remains functional after score submission");
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  result("No JavaScript errors or failed local resource requests", {
    errors,
    requests,
  });
} catch (error) {
  console.error(error);
  results.push({
    name: "Browser check failure",
    passed: false,
    error: String(error),
    diagnostics: await Promise.all(page.frames().map((frame) => diag(frame).catch(() => null))),
  });
  await shot("browser-failure").catch(() => {});
  process.exitCode = 1;
} finally {
  await writeFile(
    "artifacts/browser-tests.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        command: "node scripts/browser-check.mjs",
        browser: browser.version(),
        results,
        errors,
        failedRequests: requests,
        limitations: [
          "Chromium with software WebGL; not a physical phone or hardware performance certification.",
          "No screen-reader session or native 200% zoom test.",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  await browser.close();
  await new Promise((r) => server.close(r));
}
