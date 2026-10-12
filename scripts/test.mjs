import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { readFile, mkdir, writeFile } from "node:fs/promises";
const require = createRequire(
  resolve(process.env.PEPE_DEP_ROOT || process.cwd(), "package.json"),
);
const ts = require("typescript");
const source = await readFile("src/engine.ts", "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const { Game, generateLevel, emptyInput, normalizeSeed } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const results = [];
function test(name, fn) {
  try {
    fn();
    console.log("PASS " + name);
    results.push({ name, passed: true });
  } catch (error) {
    console.error("FAIL " + name, error);
    results.push({ name, passed: false, error: String(error) });
  }
}
const advance = (g, seconds, input = emptyInput()) => {
  for (let i = 0; i < Math.round(seconds * 120); i++) g.update(1 / 120, input);
};
test("Seed normalization and deterministic geometry, enemies and rewards", () => {
  assert.equal(normalizeSeed("  golden lily  "), "GOLDEN-LILY");
  assert.deepEqual(
    generateLevel("GOLDEN-LILY", 5),
    generateLevel("GOLDEN-LILY", 5),
  );
  assert.notDeepEqual(
    generateLevel("GOLDEN-LILY", 5),
    generateLevel("ANOTHER-LILY", 5),
  );
});
test("8,000 generated levels: bounded gaps, safe starts, bosses and valid bonus pipes", () => {
  for (let s = 0; s < 1000; s++)
    for (let i = 0; i < 8; i++) {
      const l = generateLevel("SEED-" + s, i),
        ground = l.platforms.filter((p) => p.kind === "ground");
      assert.equal(l.world, Math.floor(i / 2));
      assert.equal(!!l.boss, i % 2 === 1);
      assert.equal(ground[0].w, 25);
      for (let p = 1; p < ground.length; p++)
        assert.ok(
          ground[p].x - (ground[p - 1].x + ground[p - 1].w) <= 3.61,
          "gap is reachable",
        );
      assert.ok(
        ground.some((p) => l.pipeX >= p.x && l.pipeX + 1.8 <= p.x + p.w),
      );
      assert.ok(
        ground.some((p) => l.checkpoint >= p.x && l.checkpoint <= p.x + p.w),
      );
      assert.ok(l.length > 180 && l.length < 320);
      assert.ok(l.pickups.length > 30);
    }
});
test("Variable jump height and stable 120 Hz movement", () => {
  function jump(held) {
    const g = new Game();
    g.start("JUMP");
    let high = 0;
    for (let i = 0; i < 120; i++) {
      g.update(1 / 120, { ...emptyInput(), jump: i < held });
      high = Math.max(high, g.player.y);
    }
    return high;
  }
  const tap = jump(4),
    hold = jump(70);
  assert.ok(hold > 2.4 && hold > tap + 1);
  const g = new Game();
  g.start("MOVE");
  advance(g, 1, { ...emptyInput(), right: true });
  assert.ok(g.player.x > 8 && g.player.x < 9);
});
test("Late jump grace and early jump buffering", () => {
  const g = new Game();
  g.start("GRACE");
  g.player.x = 24.95;
  advance(g, 0.09, { ...emptyInput(), right: true, run: true });
  g.update(1 / 120, { ...emptyInput(), right: true, jump: true });
  assert.ok(g.player.vy > 10);
  const b = new Game();
  b.start("BUFFER");
  b.player.y = 0.5;
  b.player.vy = -5;
  b.player.grounded = false;
  advance(b, 0.13, { ...emptyInput(), jump: true });
  assert.ok(b.player.vy > 8, "buffer fires on landing");
});
test("Headbutts break brick and release mystery power exactly once", () => {
  const g = new Game();
  g.start("BLOCK");
  g.player.x = 12.5;
  advance(g, 0.3, { ...emptyInput(), jump: true });
  assert.equal(g.level.platforms.find((p) => p.x === 12).kind, "used");
  assert.equal(g.level.pickups.filter((p) => p.kind === "tea").length, 1);
  const brick = g.level.platforms.find((p) => p.kind === "brick");
  g.breakBlock(brick);
  assert.equal(brick.active, false);
  assert.equal(g.score, 50);
});
test("Mushroom Tea absorbs a hit; Star prevents hits and expires", () => {
  const g = new Game();
  g.start("POWER");
  g.collect({ kind: "tea", active: true, x: 0, y: 0 });
  assert.equal(g.player.power, "big");
  g.player.invuln = 0;
  g.hit();
  assert.equal(g.player.power, "small");
  assert.equal(g.lives, 3);
  g.player.invuln = 0;
  g.collect({ kind: "star", active: true, x: 0, y: 0 });
  g.hit();
  assert.equal(g.lives, 3);
  advance(g, 8.1);
  assert.equal(g.player.star, 0);
});
test("A released mystery power-up is reachable with an ordinary held jump", () => {
  const g = new Game();
  g.start("REACHABLE-TEA");
  g.player.x = 12.5;
  advance(g, 0.8, { ...emptyInput(), jump: true });
  assert.equal(g.level.platforms.find((p) => p.x === 12).kind, "used");
  assert.equal(g.player.power, "small");
  g.player.x = 10;
  advance(g, 0.2);
  advance(g, 0.8, { ...emptyInput(), jump: true, right: true });
  assert.equal(g.player.power, "big");
});
test("Fire Fly shoots bouncing fireballs with a cooldown", () => {
  const g = new Game();
  g.start("FIRE");
  g.collect({ kind: "fire", active: true, x: 0, y: 0 });
  advance(g, 0.1, { ...emptyInput(), fire: true });
  assert.equal(g.shots.length, 1);
  let bounced = false;
  for (let i = 0; i < 65; i++) {
    const last = g.shots[0]?.vy;
    g.update(1 / 120, emptyInput());
    if (last < 0 && g.shots[0]?.vy > 0) bounced = true;
  }
  assert.ok(bounced);
});
test("Beetles can be stomped; snail spikes cost a life", () => {
  const g = new Game();
  g.start("STOMP");
  const e = g.level.enemies[0];
  g.player.x = e.x;
  g.player.y = 0.72;
  g.player.vy = -4;
  g.player.grounded = false;
  g.player.invuln = 0;
  advance(g, 0.07);
  assert.equal(e.alive, false);
  assert.ok(g.player.vy > 0);
  assert.equal(g.score, 200);
  const snail = g.level.enemies.find((e) => e.kind === "snail");
  g.player.x = snail.x;
  g.player.y = 0;
  g.player.invuln = 0;
  advance(g, 0.03);
  assert.equal(g.lives, 2);
});
test("Pause freezes simulation; resume and restart reset correctly", () => {
  const g = new Game();
  g.start("PAUSE");
  advance(g, 1);
  g.pause();
  const before = g.snapshot();
  advance(g, 2, { ...emptyInput(), right: true });
  assert.deepEqual(g.snapshot(), before);
  g.resume();
  advance(g, 0.1, { ...emptyInput(), right: true });
  assert.ok(g.player.x > 3);
  g.start("PAUSE");
  assert.equal(g.elapsed, 0);
  assert.equal(g.score, 0);
  assert.equal(g.lives, 3);
});
test("Bonus cave preserves level progress, score and exit position", () => {
  const g = new Game();
  g.start("CAVE");
  g.checkpoint = true;
  const level = g.level;
  g.enterBonus();
  assert.ok(g.level.bonus);
  assert.equal(g.level.pickups.filter((p) => p.kind === "fly").length, 36);
  g.collect(g.level.pickups[0]);
  g.enterBonus();
  assert.equal(g.level, level);
  assert.equal(g.score, 100);
  assert.ok(g.checkpoint);
  assert.equal(g.player.x, level.pipeX + 2.6);
  g.enterBonus();
  assert.equal(
    g.level.pickups[0].active,
    false,
    "Collected cave flies stay collected on re-entry",
  );
});
test("Checkpoint respawn and three deaths lead to game over", () => {
  const g = new Game();
  g.start("LIVES");
  g.checkpoint = true;
  g.hit(true);
  advance(g, 1.4);
  assert.equal(g.player.x, g.level.checkpoint);
  assert.equal(g.mode, "playing");
  g.hit(true);
  advance(g, 1.4);
  g.hit(true);
  advance(g, 1.4);
  assert.equal(g.lives, 0);
  assert.equal(g.mode, "gameover");
});
test("All four bosses telegraph, attack, rest and can be defeated; eight-level victory", () => {
  const g = new Game();
  g.start("VICTORY");
  for (let i = 0; i < 8; i++) {
    assert.equal(g.level.index, i);
    if (g.level.boss) {
      const b = g.level.boss;
      g.player.x = g.level.length - 28;
      advance(g, 0.02);
      assert.equal(g.mode, "intro");
      advance(g, 2.1);
      assert.equal(g.mode, "playing");
      advance(g, 1.3);
      assert.equal(b.phase, "attack");
      g.player.x = g.level.length - 27;
      advance(g, 1.5);
      assert.equal(b.phase, "rest");
      while (b.hp > 0) {
        b.hit = 0;
        g.damageBoss();
      }
      assert.equal(b.phase, "defeated");
    }
    g.player.x = g.level.length;
    g.player.y = 3;
    advance(g, 0.02);
    assert.equal(g.mode, i === 7 ? "won" : "clear");
    if (i < 7) g.next();
  }
  assert.equal(g.cleared, 8);
  assert.ok(g.score > 10000);
});
test("A failed boss fight respawns at its arena and resets the attack", () => {
  const g = new Game();
  g.start("BOSS-RESPAWN");
  g.loadLevel(3);
  g.player.x = g.level.length - 28;
  advance(g, 0.02);
  assert.equal(g.mode, "intro");
  assert.equal(g.level.checkpoint, g.level.length - 28);
  advance(g, 2.1);
  const boss = g.level.boss;
  boss.hp = 2;
  g.hit(true);
  advance(g, 1.28);
  assert.ok(g.player.x >= g.level.length - 29);
  assert.ok(["waiting", "windup"].includes(boss.phase));
  assert.equal(boss.hp, 2);
  assert.equal(g.shots.length, 0);
});
const manifest = JSON.parse(await readFile("dist/pepe-game.json", "utf8"));
const entry = await readFile("dist/" + manifest.entry);
const cover = await readFile("dist/" + manifest.cover);
test("Manifest and export use a local, complete arcade contract", () => {
  assert.equal(manifest.schemaVersion, "pepe-browser-game/1");
  assert.equal(manifest.players, 1);
  assert.equal(manifest.cover, "cover.svg");
  assert.ok(entry.length > 0 && cover.length > 0);
  assert.match(cover.toString(), /width="1200" height="630"/);
});
await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/engine-tests.json",
  JSON.stringify(
    { command: "npm test", date: new Date().toISOString(), results },
    null,
    2,
  ) + "\n",
);
if (results.some((r) => !r.passed)) process.exitCode = 1;
