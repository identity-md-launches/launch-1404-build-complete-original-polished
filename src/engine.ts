export const WORLDS = [
  {
    name: "Moonlit Swamp",
    short: "Swamp",
    boss: "Mossback",
    subtitle: "Where the adventure takes root",
    sky: "#183e3c",
    fog: "#35645a",
    ground: "#576844",
    grass: "#91ba5c",
    accent: "#f5ce70",
    dark: "#23483d",
  },
  {
    name: "Crystal Caves",
    short: "Caves",
    boss: "Amethyst Warden",
    subtitle: "Follow the light beneath the roots",
    sky: "#272039",
    fog: "#59436d",
    ground: "#675171",
    grass: "#b3a3db",
    accent: "#e8a2eb",
    dark: "#3b2d51",
  },
  {
    name: "Sky Lily Pads",
    short: "Sky",
    boss: "Cloudskipper",
    subtitle: "A little closer to the impossible",
    sky: "#a6cdd1",
    fog: "#d6e1cc",
    ground: "#758e86",
    grass: "#a8c873",
    accent: "#ffeeae",
    dark: "#718f97",
  },
  {
    name: "Bog King’s Castle",
    short: "Castle",
    boss: "The Bog King",
    subtitle: "One last leap for the Golden Lily",
    sky: "#35252e",
    fog: "#7a4545",
    ground: "#5b505a",
    grass: "#91746b",
    accent: "#ffb375",
    dark: "#443541",
  },
] as const;

export type Mode =
  | "title"
  | "playing"
  | "paused"
  | "dying"
  | "gameover"
  | "clear"
  | "won"
  | "intro";
export type Power = "small" | "big" | "fire";
export type Input = {
  left: boolean;
  right: boolean;
  jump: boolean;
  run: boolean;
  fire: boolean;
  down: boolean;
};
export const emptyInput = (): Input => ({
  left: false,
  right: false,
  jump: false,
  run: false,
  fire: false,
  down: false,
});
export type Platform = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "ground" | "ledge" | "brick" | "mystery" | "used" | "pipe";
  active: boolean;
  power?: "tea" | "fire" | "star";
  bump: number;
};
export type Pickup = {
  id: number;
  x: number;
  y: number;
  kind: "fly" | "tea" | "fire" | "star";
  active: boolean;
  born: number;
};
export type Enemy = {
  id: number;
  x: number;
  y: number;
  origin: number;
  range: number;
  vx: number;
  kind: "beetle" | "snail";
  alive: boolean;
};
export type Shot = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  enemy: boolean;
  size: number;
};
export type Boss = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  phase: "waiting" | "windup" | "attack" | "rest" | "defeated";
  timer: number;
  hit: number;
  cycle: number;
  name: string;
  w: number;
  h: number;
};
export type Level = {
  index: number;
  world: number;
  length: number;
  platforms: Platform[];
  pickups: Pickup[];
  enemies: Enemy[];
  boss?: Boss;
  pipeX: number;
  checkpoint: number;
  bonus: boolean;
};
export type GameEvent = {
  type: string;
  x?: number;
  y?: number;
  text?: string;
  value?: number;
  kind?: string;
};
export type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  facing: number;
  power: Power;
  invuln: number;
  star: number;
  squash: number;
  grin: number;
};

export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function normalizeSeed(seed: string): string {
  return seed.trim().toUpperCase().replace(/\s+/g, "-").slice(0, 24);
}

export function generateLevel(seed: string, index: number): Level {
  const random = rng(hashSeed(seed + ":" + index));
  const world = Math.floor(index / 2),
    platforms: Platform[] = [],
    pickups: Pickup[] = [],
    enemies: Enemy[] = [];
  let id = 0;
  const platform = (
    x: number,
    y: number,
    w: number,
    h: number,
    kind: Platform["kind"],
    power?: Platform["power"],
  ) =>
    platforms.push({
      id: id++,
      x,
      y,
      w,
      h,
      kind,
      active: true,
      power,
      bump: 0,
    });
  const flies = (x: number, y: number, n: number, arc = false) => {
    for (let i = 0; i < n; i++)
      pickups.push({
        id: id++,
        x: x + i * 1.2,
        y: y + (arc ? Math.sin((i / (n - 1)) * Math.PI) * 1.2 : 0),
        kind: "fly",
        active: true,
        born: 0,
      });
  };
  platform(0, 0, 25, 4, "ground");
  flies(6, 1.1, 5);
  platform(12, 2.7, 1, 1, "mystery", "tea");
  platform(11, 2.7, 1, 1, "brick");
  platform(13, 2.7, 1, 1, "brick");
  enemies.push({
    id: id++,
    x: 19,
    y: 0,
    origin: 19,
    range: 2,
    vx: -0.85,
    kind: "beetle",
    alive: true,
  });
  const count = 7 + world;
  let cursor = 25;
  for (let c = 0; c < count; c++) {
    const gap = 2.2 + random() * (world > 1 ? 1.4 : 1);
    flies(cursor - 1.1, 1.2, 4, true);
    const start = cursor + gap,
      width = 18 + random() * 4;
    platform(start, 0, width, 4, "ground");
    const variant = Math.floor(random() * 3);
    if (variant === 0) {
      platform(start + 4, 1.35, 3.4, 0.42, "ledge");
      platform(start + 9, 2.4, 3.2, 0.42, "ledge");
      flies(start + 8.9, 3.4, 3);
    } else if (variant === 1) {
      platform(start + 5, 2.8, 1, 1, "brick");
      platform(
        start + 6,
        2.8,
        1,
        1,
        "mystery",
        c % 3 === 0 ? "fire" : c % 3 === 1 ? "star" : "tea",
      );
      platform(start + 7, 2.8, 1, 1, "brick");
      flies(start + 11, 1.15, 4);
    } else {
      platform(start + 4, 1.1, 3.4, 0.4, "ledge");
      platform(start + 11, 1.8, 4, 0.4, "ledge");
      flies(start + 4.4, 2.2, 3);
    }
    if (c === 0) platform(start + 12, 2.8, 1, 1, "mystery", "fire");
    enemies.push({
      id: id++,
      x: start + width - 4,
      y: 0,
      origin: start + width - 4,
      range: 2.2,
      vx: -(0.75 + world * 0.17),
      kind: c % 3 === 1 ? "snail" : "beetle",
      alive: true,
    });
    if (world > 1 && c === 4)
      enemies.push({
        id: id++,
        x: start + 10,
        y: 0,
        origin: start + 10,
        range: 1,
        vx: 0.85,
        kind: "beetle",
        alive: true,
      });
    cursor = start + width;
  }
  platform(cursor, 0, 42, 4, "ground");
  const length = cursor + 38;
  const pipeX = platforms.filter((p) => p.kind === "ground")[3].x + 10;
  platform(pipeX, 1.1, 1.8, 1.1, "pipe");
  const checkpoint =
    platforms.filter((p) => p.kind === "ground")[Math.floor(count / 2)].x + 1.5;
  let boss: Boss | undefined;
  if (index % 2 === 1) {
    boss = {
      x: cursor + 22,
      y: 0,
      vx: 0,
      vy: 0,
      hp: world === 3 ? 5 : 3 + Math.min(world, 1),
      maxHp: world === 3 ? 5 : 3 + Math.min(world, 1),
      phase: "waiting",
      timer: 0,
      hit: 0,
      cycle: 0,
      name: WORLDS[world].boss,
      w: world === 3 ? 2.5 : 2,
      h: world === 3 ? 2.55 : 1.85,
    };
    platform(cursor + 4, 2.7, 1, 1, "mystery", "tea");
    platform(cursor + 6, 2.7, 1, 1, "mystery", "fire");
  } else {
    platform(length - 7, 1.2, 2.6, 0.4, "ledge");
    platform(length - 4, 2.4, 2.6, 0.4, "ledge");
  }
  return {
    index,
    world,
    length,
    platforms,
    pickups,
    enemies,
    boss,
    pipeX,
    checkpoint,
    bonus: false,
  };
}

export class Game {
  mode: Mode = "title";
  beforePause: Mode = "playing";
  seed = "LILY-2026";
  level: Level = generateLevel(this.seed, 0);
  player: Player = {
    x: 3,
    y: 0,
    vx: 0,
    vy: 0,
    grounded: true,
    facing: 1,
    power: "small",
    invuln: 0,
    star: 0,
    squash: 0,
    grin: 0,
  };
  score = 0;
  lives = 3;
  flies = 0;
  combo = 0;
  elapsed = 0;
  levelTime = 0;
  clock = 0;
  shots: Shot[] = [];
  events: GameEvent[] = [];
  checkpoint = false;
  deaths = 0;
  cleared = 0;
  bossCue = "";
  private jumpBuffer = 0;
  private coyote = 0;
  private jumpWas = false;
  private fireCooldown = 0;
  private downWas = false;
  private deathTimer = 0;
  private introTimer = 0;
  private shotId = 10000;
  private bonusReturn?: { level: Level; x: number; y: number };
  private bonusCave?: Level;
  get height() {
    return this.player.power === "small" ? 1.16 : 1.58;
  }
  start(seed: string) {
    this.seed = normalizeSeed(seed) || "LILY-2026";
    this.score = 0;
    this.lives = 3;
    this.flies = 0;
    this.elapsed = 0;
    this.deaths = 0;
    this.cleared = 0;
    this.events = [];
    this.bonusReturn = undefined;
    this.player.power = "small";
    this.loadLevel(0);
    this.mode = "playing";
    this.emit("start");
  }
  loadLevel(index: number) {
    this.level = generateLevel(this.seed, index);
    this.levelTime = 0;
    this.checkpoint = false;
    this.shots = [];
    this.bonusReturn = undefined;
    this.bonusCave = undefined;
    this.resetPlayer(3);
    this.emit("level");
  }
  resetPlayer(x: number) {
    Object.assign(this.player, {
      x,
      y: 0,
      vx: 0,
      vy: 0,
      grounded: true,
      facing: 1,
      invuln: 1.6,
      star: 0,
      squash: 0,
      grin: 0,
    });
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.jumpWas = false;
    this.downWas = false;
    this.combo = 0;
  }
  emit(type: string, extra: Omit<GameEvent, "type"> = {}) {
    this.events.push({ type, ...extra });
  }
  drainEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }
  pause() {
    if (["playing", "intro"].includes(this.mode)) {
      this.beforePause = this.mode;
      this.mode = "paused";
      this.emit("pause");
    }
  }
  resume() {
    if (this.mode === "paused") {
      this.mode = this.beforePause;
      this.jumpWas = true;
      this.emit("resume");
    }
  }
  next() {
    if (this.mode !== "clear") return;
    this.loadLevel(this.level.index + 1);
    this.mode = "playing";
  }
  home() {
    this.mode = "title";
    this.emit("home");
  }
  addScore(n: number, x?: number, y?: number) {
    this.score += Math.max(0, Math.floor(n));
    if (x !== undefined) this.emit("points", { x, y, value: n });
  }
  hit(force = false) {
    const p = this.player;
    if (!["playing", "intro"].includes(this.mode)) return;
    if (!force && (p.invuln > 0 || p.star > 0)) return;
    if (!force && p.power !== "small") {
      p.power = "small";
      p.invuln = 2;
      p.vx = -p.facing * 4;
      p.vy = 5;
      this.emit("hurt", { x: p.x, y: p.y });
      return;
    }
    this.lives--;
    this.deaths++;
    this.mode = "dying";
    this.deathTimer = 1.25;
    p.vy = 8;
    p.power = "small";
    p.star = 0;
    this.combo = 0;
    this.emit("death", { x: p.x, y: p.y });
  }
  collect(item: Pickup) {
    item.active = false;
    const p = this.player;
    if (item.kind === "fly") {
      this.flies++;
      this.addScore(100);
      this.emit("collect", { x: item.x, y: item.y });
    } else {
      if (item.kind === "tea" && p.power === "small") p.power = "big";
      if (item.kind === "fire") p.power = "fire";
      if (item.kind === "star") p.star = 8;
      p.grin = 2;
      this.addScore(500);
      this.emit("power", {
        x: p.x,
        y: p.y,
        text:
          item.kind === "tea"
            ? "Mushroom Tea · one extra hit"
            : item.kind === "fire"
              ? "Fire Fly · J / X to fire"
              : "Lily Star · rainbow rush!",
        kind: item.kind,
      });
    }
  }
  breakBlock(block: Platform) {
    if (block.kind === "mystery") {
      block.kind = "used";
      block.bump = 0.22;
      this.level.pickups.push({
        id: this.shotId++,
        x: block.x + 0.5,
        y: block.y + 0.85,
        kind: block.power || "tea",
        active: true,
        born: this.clock,
      });
      this.emit("block", {
        x: block.x + 0.5,
        y: block.y,
        text: "A little magic.",
      });
    } else if (block.kind === "brick") {
      block.active = false;
      this.addScore(50);
      this.emit("break", { x: block.x + 0.5, y: block.y - 0.4 });
    }
  }
  enterBonus() {
    if (this.level.bonus) {
      if (!this.bonusReturn) return;
      this.level = this.bonusReturn.level;
      this.player.x = this.bonusReturn.x;
      this.player.y = this.bonusReturn.y;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.invuln = 1.5;
      this.bonusReturn = undefined;
      this.emit("level");
      this.emit("toast", { text: "Back to the adventure." });
      return;
    }
    this.bonusReturn = { level: this.level, x: this.level.pipeX + 2.6, y: 0 };
    const pickups: Pickup[] = [];
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 12; i++)
        pickups.push({
          id: this.shotId++,
          x: 5 + i * 1.3,
          y: 1.1 + row * 1.3,
          kind: "fly",
          active: true,
          born: 0,
        });
    pickups.push({
      id: this.shotId++,
      x: 20,
      y: 1.3,
      kind: "star",
      active: true,
      born: 0,
    });
    this.level = this.bonusCave || {
      index: this.level.index,
      world: 1,
      length: 26,
      platforms: [
        {
          id: 9000,
          x: 0,
          y: 0,
          w: 28,
          h: 4,
          kind: "ground",
          active: true,
          bump: 0,
        },
        {
          id: 9001,
          x: 23,
          y: 1.1,
          w: 1.8,
          h: 1.1,
          kind: "pipe",
          active: true,
          bump: 0,
        },
        {
          id: 9002,
          x: 8,
          y: 1.5,
          w: 9,
          h: 0.4,
          kind: "ledge",
          active: true,
          bump: 0,
        },
      ],
      pickups,
      enemies: [],
      pipeX: 23,
      checkpoint: 0,
      bonus: true,
    };
    this.bonusCave = this.level;
    Object.assign(this.player, { x: 2, y: 0, vx: 0, vy: 0 });
    this.shots = [];
    this.emit("level");
    this.emit("bonus", { text: "Secret grotto · a pocket full of gold" });
  }
  update(dt: number, input: Input) {
    if (
      this.mode === "paused" ||
      this.mode === "title" ||
      this.mode === "gameover" ||
      this.mode === "clear" ||
      this.mode === "won"
    )
      return;
    this.clock += dt;
    const p = this.player;
    if (this.mode === "dying") {
      p.vy -= 23 * dt;
      p.y += p.vy * dt;
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        if (this.lives <= 0) {
          this.mode = "gameover";
          this.emit("gameover");
        } else {
          if (this.bonusReturn) {
            this.level = this.bonusReturn.level;
            this.bonusReturn = undefined;
            this.emit("level");
          }
          this.resetPlayer(this.checkpoint ? this.level.checkpoint : 3);
          this.shots = [];
          const boss = this.level.boss;
          if (boss && boss.hp > 0) {
            Object.assign(boss, {
              phase: "waiting",
              timer: 0,
              x: this.level.length - 16,
              y: 0,
              vx: 0,
              vy: 0,
              hit: 0,
            });
          }
          this.mode = "playing";
          this.emit("respawn", {
            text: this.checkpoint
              ? "Back at the lantern. You’ve got this."
              : "A fresh leap. You’ve got this.",
          });
        }
      }
      return;
    }
    if (this.mode === "intro") {
      this.introTimer -= dt;
      if (this.introTimer <= 0) {
        this.mode = "playing";
        this.emit("introEnd");
      }
      return;
    }
    this.elapsed += dt;
    this.levelTime += dt;
    if (this.levelTime >= 150) {
      this.hit(true);
      this.levelTime = 0;
      return;
    }
    p.invuln = Math.max(0, p.invuln - dt);
    p.star = Math.max(0, p.star - dt);
    p.squash = Math.max(0, p.squash - dt * 5);
    p.grin = Math.max(0, p.grin - dt);
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    for (const b of this.level.platforms) b.bump = Math.max(0, b.bump - dt);
    if (input.jump && !this.jumpWas) this.jumpBuffer = 0.14;
    this.jumpWas = input.jump;
    this.jumpBuffer -= dt;
    this.coyote = p.grounded ? 0.11 : Math.max(0, this.coyote - dt);
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      p.vy = 12.8;
      p.grounded = false;
      this.jumpBuffer = 0;
      this.coyote = 0;
      p.squash = 0.55;
      this.emit("jump", { x: p.x, y: p.y });
    }
    if (!input.jump && p.vy > 4.5) p.vy = Math.max(4.5, p.vy - 55 * dt);
    const direction = Number(input.right) - Number(input.left),
      speed = (input.run ? 8.6 : 5.9) * (p.star > 0 ? 1.23 : 1);
    if (direction) p.facing = direction;
    const desired = direction * speed,
      acceleration = p.grounded ? 48 : 29;
    p.vx +=
      Math.sign(desired - p.vx) *
      Math.min(Math.abs(desired - p.vx), acceleration * dt);
    const prevX = p.x,
      prevY = p.y,
      h = this.height,
      half = 0.34;
    p.x += p.vx * dt;
    for (const b of this.level.platforms) {
      if (!b.active || b.kind === "ledge") continue;
      if (
        p.y + 0.07 < b.y &&
        p.y + h > b.y - b.h + 0.04 &&
        p.x + half > b.x &&
        p.x - half < b.x + b.w
      ) {
        if (prevX + half <= b.x + 0.01) {
          p.x = b.x - half;
          p.vx = 0;
        } else if (prevX - half >= b.x + b.w - 0.01) {
          p.x = b.x + b.w + half;
          p.vx = 0;
        }
      }
    }
    p.vy -= 27 * dt;
    p.y += p.vy * dt;
    p.grounded = false;
    for (const b of this.level.platforms) {
      if (!b.active || p.x + half <= b.x || p.x - half >= b.x + b.w) continue;
      if (p.vy <= 0 && prevY >= b.y - 0.08 && p.y <= b.y) {
        p.y = b.y;
        p.vy = 0;
        p.grounded = true;
      } else if (
        b.kind !== "ledge" &&
        p.vy > 0 &&
        prevY + h <= b.y - b.h + 0.08 &&
        p.y + h >= b.y - b.h
      ) {
        p.y = b.y - b.h - h;
        p.vy = -1.5;
        this.breakBlock(b);
      }
    }
    if (p.grounded && prevY > p.y + 0.025) {
      p.squash = 0.6;
      this.combo = 0;
      this.emit("land", { x: p.x, y: p.y });
    }
    p.x = Math.max(0.4, Math.min(this.level.length + 1, p.x));
    if (p.y < -5) {
      this.hit(true);
      return;
    }
    if (!this.level.bonus && !this.checkpoint && p.x >= this.level.checkpoint) {
      this.checkpoint = true;
      this.emit("checkpoint", {
        x: p.x,
        y: 1,
        text: "Lantern lit · checkpoint",
      });
    }
    for (const item of this.level.pickups) {
      if (
        item.active &&
        Math.abs(p.x - item.x) < 0.8 &&
        p.y < item.y + 0.45 &&
        p.y + h > item.y - 0.45
      )
        this.collect(item);
    }
    for (const e of this.level.enemies) {
      if (!e.alive || Math.abs(e.x - p.x) > 38) continue;
      e.x += e.vx * dt;
      if (Math.abs(e.x - e.origin) > e.range) {
        e.vx *= -1;
        e.x = Math.max(e.origin - e.range, Math.min(e.origin + e.range, e.x));
      }
      if (
        Math.abs(p.x - e.x) < 0.75 &&
        p.y < e.y + 0.7 &&
        p.y + h > e.y + 0.05
      ) {
        if (
          p.star > 0 ||
          (e.kind === "beetle" && p.vy < 0 && prevY >= e.y + 0.45)
        ) {
          e.alive = false;
          this.combo++;
          this.addScore(200 * Math.min(this.combo, 5), e.x, e.y + 1);
          if (p.star <= 0) {
            p.vy = 8.8;
            p.grounded = false;
          }
          this.emit("stomp", {
            x: e.x,
            y: e.y,
            text: this.combo > 1 ? `${this.combo}× stomp combo` : undefined,
          });
        } else this.hit();
      }
    }
    if (input.fire && this.fireCooldown <= 0 && p.power === "fire") {
      this.fireCooldown = 0.28;
      this.shots.push({
        id: this.shotId++,
        x: p.x + p.facing * 0.6,
        y: p.y + this.height * 0.72,
        vx: p.facing * 12,
        vy: 1,
        life: 3,
        enemy: false,
        size: 0.17,
      });
      this.emit("fire", { x: p.x, y: p.y });
    }
    const nearPipe =
      Math.abs(p.x - (this.level.pipeX + 0.9)) < 1.4 && p.y < 1.8;
    if (input.down && !this.downWas && nearPipe) {
      this.enterBonus();
      this.downWas = true;
      return;
    }
    this.downWas = input.down;
    this.updateBoss(dt);
    for (const s of this.shots) {
      const previousY = s.y;
      s.life -= dt;
      s.x += s.vx * dt;
      s.vy -= (s.enemy ? 8 : 22) * dt;
      s.y += s.vy * dt;
      for (const b of this.level.platforms) {
        if (
          b.active &&
          s.x >= b.x &&
          s.x <= b.x + b.w &&
          previousY >= b.y + 0.1 &&
          s.y <= b.y + 0.2 &&
          s.vy < 0
        ) {
          s.y = b.y + 0.2;
          if (s.enemy && this.level.world === 1) s.life = 0;
          else s.vy = s.enemy ? 3.5 : 6.5;
        }
      }
      if (s.enemy) {
        if (
          Math.abs(s.x - p.x) < 0.48 + s.size &&
          s.y + s.size > p.y &&
          s.y - s.size < p.y + h
        ) {
          this.hit();
          s.life = 0;
        }
      } else {
        for (const e of this.level.enemies)
          if (
            e.alive &&
            Math.abs(e.x - s.x) < 0.65 &&
            s.y < e.y + 0.9 &&
            s.y > e.y - 0.2
          ) {
            e.alive = false;
            s.life = 0;
            this.addScore(150, e.x, 1);
            this.emit("stomp", { x: e.x, y: e.y });
          }
        const b = this.level.boss;
        if (
          b &&
          b.hp > 0 &&
          Math.abs(s.x - b.x) < b.w * 0.6 &&
          s.y > b.y &&
          s.y < b.y + b.h
        ) {
          this.damageBoss();
          s.life = 0;
        }
      }
      if (s.y < -5) s.life = 0;
    }
    this.shots = this.shots.filter((s) => s.life > 0);
    if (
      !this.level.bonus &&
      p.x >= this.level.length - 0.65 &&
      (!this.level.boss || this.level.boss.hp <= 0)
    ) {
      const flag = Math.min(
          2000,
          Math.max(200, Math.round(((p.y + h) / 5) * 2000)),
        ),
        time = Math.max(0, Math.floor(150 - this.levelTime)) * 10;
      this.addScore(flag + time);
      this.cleared++;
      this.mode = this.level.index === 7 ? "won" : "clear";
      this.emit(this.mode, {
        value: flag,
        text: `Flag +${flag.toLocaleString()} · Time +${time.toLocaleString()}`,
      });
    }
  }
  private updateBoss(dt: number) {
    const b = this.level.boss,
      p = this.player;
    if (!b || b.hp <= 0) return;
    if (this.level.world === 3) b.h = b.phase === "rest" ? 2 : 2.55;
    const arena = this.level.length - 29;
    if (b.phase === "waiting") {
      if (p.x > arena) {
        b.phase = "windup";
        b.timer = 1.2;
        this.level.checkpoint = arena + 1;
        this.checkpoint = true;
        this.mode = "intro";
        this.introTimer = 2;
        this.bossCue = "Watch the tell. Jump the attack. Stomp when tired.";
        this.emit("bossIntro", { text: b.name });
      }
      return;
    }
    if (this.mode !== "playing") return;
    p.x = Math.max(arena + 0.5, Math.min(p.x, this.level.length - 3));
    b.hit = Math.max(0, b.hit - dt);
    b.timer -= dt;
    if (b.phase === "windup") {
      this.bossCue = [
        "Charging up — get ready to jump!",
        "Crystals above — keep moving!",
        "Big hop incoming — give it room!",
        "Royal stomp — jump the shockwaves!",
      ][this.level.world];
      if (b.timer <= 0) {
        b.phase = "attack";
        b.timer = this.level.world === 0 ? 1.2 : 1.35;
        b.cycle++;
        b.vx =
          this.level.world === 0
            ? Math.sign(p.x - b.x) * 5.5
            : Math.sign(p.x - b.x) * 2.7;
        if (this.level.world > 0) b.vy = 8.4;
        this.emit("bossAttack", { x: b.x, y: b.y });
        if (this.level.world === 1)
          for (let i = 0; i < 3; i++)
            this.shots.push({
              id: this.shotId++,
              x: p.x - 3 + i * 3,
              y: 7 + i * 0.5,
              vx: 0,
              vy: -1,
              life: 2.8,
              enemy: true,
              size: 0.28,
            });
      }
    } else if (b.phase === "attack") {
      b.x += b.vx * dt;
      b.vy -= 19 * dt;
      b.y = Math.max(0, b.y + b.vy * dt);
      b.x = Math.max(arena + 4, Math.min(this.level.length - 6, b.x));
      if (b.timer <= 0) {
        b.phase = "rest";
        b.timer = 2.25;
        b.vx = 0;
        b.y = 0;
        b.vy = 0;
        this.emit("slam", { x: b.x, y: 0 });
        if (this.level.world === 3)
          for (const d of [-1, 1])
            for (let i = 0; i < 2; i++)
              this.shots.push({
                id: this.shotId++,
                x: b.x + d * (1 + i * 0.8),
                y: 0.25,
                vx: d * (4 + i),
                vy: 0,
                life: 2.2,
                enemy: true,
                size: 0.23,
              });
      }
    } else if (b.phase === "rest") {
      this.bossCue = "Now! Stomp the head or fire away.";
      if (b.timer <= 0) {
        b.phase = "windup";
        b.timer = 1.2;
      }
    }
    if (
      Math.abs(p.x - b.x) < b.w * 0.48 + 0.3 &&
      p.y < b.y + b.h &&
      p.y + this.height > b.y
    ) {
      if (p.vy < 0 && p.y > b.y + b.h - 0.55) {
        p.y = b.y + b.h;
        p.vy = 10;
        p.grounded = false;
        this.damageBoss();
      } else if (p.star > 0) this.damageBoss();
      else this.hit();
    }
  }
  damageBoss() {
    const b = this.level.boss;
    if (!b || b.hp <= 0 || b.hit > 0) return;
    if (b.phase !== "rest") {
      this.emit("clank", { text: "Wait for the tired glow." });
      return;
    }
    b.hp--;
    b.hit = 0.75;
    this.addScore(500, b.x, b.y + b.h);
    this.emit("bossHit", { x: b.x, y: b.y + b.h });
    if (b.hp <= 0) {
      b.phase = "defeated";
      this.addScore(2000);
      this.bossCue = "The path is clear. Grab the flag!";
      this.emit("bossDefeated", {
        x: b.x,
        y: b.y,
        text: `${b.name} defeated!`,
      });
      this.shots = this.shots.filter((s) => !s.enemy);
    }
  }
  snapshot() {
    return {
      mode: this.mode,
      seed: this.seed,
      score: this.score,
      lives: this.lives,
      flies: this.flies,
      elapsed: this.elapsed,
      levelTime: this.levelTime,
      checkpoint: this.checkpoint,
      player: { ...this.player, height: this.height },
      level: {
        index: this.level.index,
        world: this.level.world,
        length: this.level.length,
        bonus: this.level.bonus,
        pipeX: this.level.pipeX,
        boss: this.level.boss ? { ...this.level.boss } : null,
      },
      bossCue: this.bossCue,
    };
  }
}
