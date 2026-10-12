import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve, extname, sep } from "node:path";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
import { bot } from "./play-controller.mjs";
const require = createRequire(
  resolve(process.env.PEPE_DEP_ROOT || process.cwd(), "package.json"),
);
const { chromium } = require("playwright");
const root = resolve("dist"),
  mime = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
  };
const server = http.createServer(async (req, res) => {
  try {
    const uri = new URL(req.url, "http://localhost").pathname;
    const file = resolve(root, uri.replace(/^\/preview\//, "") || "index.html");
    if (!file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    res.setHeader(
      "Content-Type",
      mime[extname(file)] || "application/octet-stream",
    );
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({
  viewport: { width: 960, height: 640 },
  deviceScaleFactor: 1,
});
const errors = [],
  log = [];
page.on("pageerror", (e) => errors.push(String(e)));
// Control the animation clock and rasterize every twelfth frame for software WebGL.
// Physics, input, UI and scene updates execute on every frame without state mutation.
await page.addInitScript(() => {
  localStorage.setItem("pepe-bros:quality", "low");
  localStorage.setItem("pepe-bros:muted", "true");
  let now = 0,
    callbacks = [],
    id = 0,
    frame = 0;
  for (const method of [
    "drawElements",
    "drawArrays",
    "drawElementsInstanced",
    "drawArraysInstanced",
    "clear",
  ]) {
    const original = WebGL2RenderingContext.prototype[method];
    WebGL2RenderingContext.prototype[method] = function (...args) {
      if (frame % 12 === 0) return original.apply(this, args);
    };
  }
  performance.now = () => now;
  window.requestAnimationFrame = (callback) => {
    callbacks.push(callback);
    return ++id;
  };
  window.__playtestClock = () => {
    now += 1000 / 120;
    frame++;
    const pending = callbacks;
    callbacks = [];
    pending.forEach((callback) => callback(now));
  };
});
let outcome;
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/preview/`);
  await page.waitForFunction(() => !!window.pepeDiagnostics);
  await page.evaluate(() => {
    window.__playtestClock();
    document.querySelector("#enter-seed").click();
  });
  await page.locator("#seed-input").fill("POND-12");
  await page.evaluate(() =>
    document.querySelector("#seed-form").requestSubmit(),
  );
  await page.evaluate(`window.__controller = ${bot.toString()}`);
  const seen = new Set();
  let lastLevel = -1;
  for (let batch = 0; batch < 400; batch++) {
    const state = await page.evaluate(() => {
      const keyMap = {
        left: "ArrowLeft",
        right: "ArrowRight",
        jump: "Space",
        run: "ShiftLeft",
        fire: "KeyJ",
        down: "ArrowDown",
      };
      for (let i = 0; i < 120; i++) {
        let d = window.pepeDiagnostics;
        if (d.mode === "clear") {
          document.querySelector("#next-level").click();
          d = window.pepeDiagnostics;
        }
        if (d.mode === "won" || d.mode === "gameover") {
          for (let n = 0; n < 12; n++) window.__playtestClock();
          break;
        }
        const input = window.__controller(d);
        for (const [key, code] of Object.entries(keyMap))
          if (input[key] !== d.input[key])
            window.dispatchEvent(
              new KeyboardEvent(input[key] ? "keydown" : "keyup", {
                code,
                key: code,
                bubbles: true,
              }),
            );
        window.__playtestClock();
      }
      const d = window.pepeDiagnostics;
      return {
        mode: d.mode,
        level: d.level.index,
        world: d.level.world,
        elapsed: d.elapsed,
        levelTime: d.levelTime,
        x: d.player.x,
        y: d.player.y,
        lives: d.lives,
        score: d.score,
        boss: d.level.boss?.hp,
        bossPhase: d.level.boss?.phase,
        power: d.player.power,
      };
    });
    if (lastLevel !== state.level || ["won", "gameover"].includes(state.mode)) {
      console.log(JSON.stringify(state));
      log.push(state);
      lastLevel = state.level;
    }
    if (batch % 20 === 0)
      console.log(
        `Campaign: ${Math.round(state.elapsed)} simulated seconds; level ${state.level + 1}; ${state.lives} lives`,
      );
    if (
      state.levelTime > 3 &&
      !seen.has(state.level) &&
      state.level % 2 === 0
    ) {
      seen.add(state.level);
      await page.screenshot({
        path: `artifacts/world-${state.world + 1}.jpg`,
        type: "jpeg",
        quality: 85,
      });
    }
    if (
      state.level === 7 &&
      state.boss > 0 &&
      state.bossPhase === "rest" &&
      !seen.has("king")
    ) {
      seen.add("king");
      await page.screenshot({
        path: "artifacts/bog-king.jpg",
        type: "jpeg",
        quality: 85,
      });
    }
    if (state.mode === "won" || state.mode === "gameover") {
      outcome = state;
      break;
    }
  }
  assert.equal(outcome?.mode, "won");
  assert.equal(outcome.level, 7);
  await page.screenshot({
    path: "artifacts/victory.jpg",
    type: "jpeg",
    quality: 85,
  });
  assert.ok(await page.locator("#replay").isVisible());
  await page.evaluate(() => document.querySelector("#replay").click());
  await page.evaluate(() => window.__playtestClock());
  const replay = await page.evaluate(() => window.pepeDiagnostics);
  assert.equal(replay.mode, "playing");
  assert.equal(replay.lives, 3);
  assert.equal(replay.score, 0);
  assert.deepEqual(errors, []);
  console.log("PASS complete eight-level browser campaign and victory replay");
} catch (error) {
  console.error(error);
  errors.push(String(error));
  process.exitCode = 1;
  await page
    .screenshot({
      path: "artifacts/campaign-failure.jpg",
      type: "jpeg",
      quality: 80,
    })
    .catch(() => {});
} finally {
  await writeFile(
    "artifacts/campaign-test.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        command: "node scripts/campaign-check.mjs",
        seed: "POND-12",
        method:
          "Real Chromium production export; controlled 120 Hz requestAnimationFrame clock; read-only diagnostics and synthetic keyboard events. No game state mutation. Low quality software WebGL; every twelfth frame rasterized, with every physics/UI/scene frame executed. This is an input-driven campaign test, not a human pacing or hardware FPS measurement.",
        passed: errors.length === 0,
        outcome,
        transitions: log,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  await browser.close();
  await new Promise((r) => server.close(r));
}
