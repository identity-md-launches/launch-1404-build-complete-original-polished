/** Input-only playtest controller. This file is never bundled into the game. */
export function bot(d) {
  const p = d.player,
    l = d.level,
    ground = d.terrain.filter((b) => b.kind === "ground");
  let input = {
    left: false,
    right: true,
    run: true,
    jump: p.vy > 0,
    fire: true,
    down: false,
  };
  const prior = bot.memory;
  if (
    !prior ||
    prior.seed !== d.seed ||
    prior.level !== l.index ||
    d.elapsed < prior.last
  ) {
    bot.memory = {
      seed: d.seed,
      level: l.index,
      last: d.elapsed,
      phase: p.power === "small" && p.x < 15 ? "approach" : "done",
    };
  }
  const mem = bot.memory;
  mem.last = d.elapsed;
  if (p.x > 16 || p.power !== "small") mem.phase = "done";
  if (mem.phase !== "done" && d.mode === "playing") {
    const keys = {
      left: false,
      right: false,
      run: false,
      jump: false,
      fire: false,
      down: false,
    };
    if (mem.phase === "approach") {
      keys.right = p.x < 12.1;
      keys.left = p.x > 12.9;
      if (!keys.right && !keys.left && Math.abs(p.vx) < 0.3) mem.phase = "head";
    } else if (mem.phase === "head") {
      keys.jump = true;
      if (
        d.terrain.some((b) => b.x === 12 && b.kind === "used") &&
        p.grounded
      ) {
        mem.phase = "back";
        keys.jump = false;
      }
    } else if (mem.phase === "back") {
      keys.left = p.x > 10.4;
      if (!keys.left && Math.abs(p.vx) < 0.3) {
        mem.phase = "collect";
        mem.since = d.elapsed;
      }
    } else if (mem.phase === "collect") {
      keys.right = true;
      keys.jump = true;
      if (d.elapsed - mem.since > 1.1) mem.phase = "done";
    }
    return keys;
  }
  const current = ground.find(
    (g) => p.x >= g.x - 0.34 && p.x <= g.x + g.w + 0.34,
  );
  const upcomingGap = current && current.x + current.w - p.x < 2.6;
  const enemy = d.enemies.find(
    (e) => e.x > p.x - 0.3 && e.x - p.x < 3.5 && Math.abs(e.y - p.y) < 1.1,
  );
  const pipe = d.terrain.find(
    (b) => b.kind === "pipe" && b.x > p.x - 0.4 && b.x - p.x < 2.4 && p.y < 1.1,
  );
  const wall = d.terrain.find(
    (b) =>
      ["brick", "mystery", "used"].includes(b.kind) &&
      b.x > p.x - 0.4 &&
      b.x - p.x < 1.1 &&
      p.y < b.y &&
      p.y + p.height > b.y - 1,
  );
  if (p.grounded && (upcomingGap || enemy || pipe || wall)) input.jump = true;
  if (!p.grounded && current && p.y > 0) {
    const end = current.x + current.w,
      next = ground.find((g) => g.x > end + 0.1);
    const remaining =
      (p.vy + Math.sqrt(Math.max(0, p.vy * p.vy + 54 * p.y))) / 27;
    const land = p.x + 8.6 * remaining;
    if (next && land > end - 0.3 && land < next.x + 0.3 && p.x > end - 1.6) {
      input.right = false;
      input.left = p.x > end - 0.7;
    }
  }

  if (l.boss && l.boss.phase !== "waiting" && l.boss.hp > 0) {
    const b = l.boss,
      dist = b.x - p.x;
    if (b.phase === "windup" || b.phase === "attack") {
      input.right = dist < 0 && Math.abs(dist) < (b.phase === "windup" ? 6 : 4);
      input.left = dist > 0 && Math.abs(dist) < (b.phase === "windup" ? 6 : 4);
      if (p.grounded && b.phase === "attack" && Math.abs(dist) < 3)
        input.jump = true;
      if (
        (p.x < l.length - 26 && dist > 0) ||
        (!p.grounded && p.vx > 0 && dist > 0 && p.x < l.length - 20)
      ) {
        input.right = true;
        input.left = false;
        if (p.grounded) input.jump = p.vx > 2.5;
      }
      if (
        (p.x > l.length - 4.5 && dist < 0) ||
        (!p.grounded && p.vx < 0 && dist < 0 && p.x > l.length - 9)
      ) {
        input.left = true;
        input.right = false;
        if (p.grounded) input.jump = p.vx < -2.5;
      }
    } else if (b.phase === "rest") {
      input.right = dist > 0.2;
      input.left = dist < -0.2;
      if (p.grounded && Math.abs(dist) < 4.2 && p.vx * Math.sign(dist) > 2.5)
        input.jump = true;
      if (!p.grounded && p.y > b.y + b.h - 0.3 && Math.abs(dist) < 1.1) {
        input.right = false;
        input.left = false;
      }
    }
  }
  if (
    l.world === 3 &&
    l.boss &&
    l.boss.phase === "rest" &&
    p.grounded &&
    d.shots.some((s) => s.enemy && Math.abs(s.x - p.x) < 3 && s.y < 1.1)
  )
    input.jump = true;
  if (l.world === 1 && l.boss && l.boss.phase === "attack") {
    const danger = d.shots.find(
      (s) => s.enemy && s.y < 5 && s.y > p.y + 0.8 && Math.abs(s.x - p.x) < 1,
    );
    if (danger) {
      input.left = danger.x >= p.x;
      input.right = !input.left;
      input.jump = false;
    }
  }
  return input;
}
