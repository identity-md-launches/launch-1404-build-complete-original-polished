import "./style.css";
import {
  Game,
  WORLDS,
  emptyInput,
  normalizeSeed,
  type Input,
  type Mode,
} from "./engine";
import { View } from "./view";
import { Sound } from "./audio";
import { storage } from "./storage";
import { connectBridge } from "./bridge";
import { icon, frogMark } from "./icons";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <main class="arcade" aria-label="Pepe Bros game">
    <header class="topbar">
      <div class="brand">${frogMark}<span>pepe<span class="brand-light">2</span>pepe<span class="brand-small">arcade</span></span></div>
      <div class="top-center"><span class="small-lily">✦</span> A little frog. A legendary leap.</div>
      <nav class="top-actions" aria-label="Game options">
        <button class="icon-button" id="help" aria-label="How to play" title="How to play">${icon("help")}</button>
        <button class="icon-button" id="mute" aria-label="Mute sound" aria-pressed="false" title="Mute sound">${icon("sound")}</button>
        <button class="icon-button hidden" id="pause" aria-label="Pause game" title="Pause (P or Esc)">${icon("pause")}</button>
      </nav>
    </header>
    <section class="stage" aria-label="Lily Kingdom">
      <canvas id="game" tabindex="0" aria-label="Pepe Bros platforming game. Move with A and D or arrow keys. Hold Space to jump higher. Press P to pause."></canvas>
      <div class="scene-vignette" aria-hidden="true"></div>
      <section class="title-screen" id="title-screen" aria-labelledby="game-title">
        <div class="title-copy">
          <div class="adventure-chip">${icon("seed")} A Lily Kingdom adventure</div>
          <h1 id="game-title">Pepe<span>Bros<span class="title-dot">.</span></span></h1>
          <p class="title-description">Small frog. Big adventure.</p>
          <p class="title-story">The Golden Lily is gone. The Bog King looks smug.<br class="desktop-break"> Time to give him a run for it.</p>
          <div class="start-actions"><button class="primary" id="new-run">${icon("play")} New run ${icon("arrow")}</button><button class="secondary" id="enter-seed">${icon("seed")} Enter seed</button></div>
          <p class="run-note">Random seed · 8 levels · 3 lives</p>
          <button class="text-button" id="learn">First adventure? Here’s how to play ${icon("arrow")}</button>
        </div>
        <div class="scene-caption"><span class="live-dot"></span> Somewhere in the Lily Kingdom</div>
        <div class="world-route" aria-label="Four worlds in your adventure">
          ${WORLDS.map((w, i) => `<div class="world-stop"><span class="world-number">0${i + 1}</span><div class="world-art world-art-${i}" aria-hidden="true"><i></i><i></i><i></i></div><div><strong>${w.name}</strong><span>2 levels${i === 3 ? " · The final leap" : ""}</span></div>${i < 3 ? '<span class="route-dots" aria-hidden="true">···</span>' : ""}</div>`).join("")}
        </div>
      </section>
      <section class="hud hidden" id="hud" aria-label="Run status">
        <div class="hud-cluster"><div class="hud-stat score-stat"><span>Score</span><strong id="score">000000</strong></div><div class="hud-stat lives-stat"><span>Lives</span><strong id="lives" aria-label="3 lives">${icon("heart")}${icon("heart")}${icon("heart")}</strong></div><div class="hud-stat flies-stat"><span>Flies</span><strong>${icon("fly")} <b id="flies">0</b></strong></div></div>
        <div class="hud-world"><strong id="world-name">Moonlit Swamp</strong><span id="level-label">World 1 · Level 1 of 8</span></div>
        <div class="hud-cluster hud-right"><div class="hud-stat time-stat"><span>Time</span><strong id="time">150</strong></div><button class="seed-chip" id="seed-copy" title="Copy this run’s seed">${icon("seed")} <span id="seed-value"></span></button></div>
        <div class="progress-track" aria-hidden="true"><span id="progress-fill"></span></div>
      </section>
      <div class="level-intro hidden" id="level-intro"><span id="intro-count"></span><h2 id="intro-name"></h2><p id="intro-line"></p></div>
      <div class="boss-hud hidden" id="boss-hud"><div><strong id="boss-name"></strong><span id="boss-health"></span></div><div class="boss-health-track"><span id="boss-health-fill"></span></div><p id="boss-cue"></p></div>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>
      <div class="floating-points" id="floating-points" aria-hidden="true"></div>
      <div class="tutorial hidden" id="tutorial">${icon("jump")}<span><strong>A little leap goes a long way.</strong> Hold Jump for height. Land on beetles. Give spiky snails some space.</span><button class="icon-button" id="dismiss-tutorial" aria-label="Dismiss tip">${icon("close")}</button></div>
      <div class="game-bottom hidden" id="game-bottom"><span id="power-label">${icon("seed")} Little Pepe</span><span class="mobile-time" id="mobile-time">150s</span><span class="keyboard-guide"><kbd>A</kbd><kbd>D</kbd> move <kbd>Space</kbd> jump <kbd>Shift</kbd> run <kbd>J</kbd> fire</span><span id="best-label">Seed best 0</span></div>
      <div class="rotate-hint hidden" id="rotate-hint">${icon("rotate")} More room to leap in landscape</div>
      <div class="touch-controls hidden" id="touch-controls" aria-label="Touch game controls"><div class="touch-move"><button id="touch-left" aria-label="Move left">${icon("left")}</button><button id="touch-right" aria-label="Move right">${icon("right")}</button></div><button class="pipe-button hidden" id="touch-pipe">Enter pipe ↓</button><div class="touch-action"><button class="touch-fire" id="touch-fire" aria-label="Fire fireball">${icon("fire")}<span>Fire</span></button><button class="touch-jump" id="touch-jump" aria-label="Jump">${icon("jump")}<span>Jump</span></button></div></div>
      <div class="pipe-hint hidden" id="pipe-hint">A secret below… <kbd>↓</kbd> / <kbd>S</kbd> to enter</div>
      <div class="fatal hidden" id="fatal"><h2>A little graphics trouble</h2><p>This adventure needs WebGL. Try enabling hardware acceleration or opening it in a recent browser.</p><button class="primary" id="reload">Reload game</button></div>
    </section>
    <footer class="footer"><span>Handcrafted hops. Endless possibilities.</span><span>Pepe Bros <span class="footer-dot">·</span> v1.0</span></footer>
    <dialog id="dialog" aria-labelledby="dialog-title"><div class="dialog-inner" id="dialog-content"></div></dialog>
    <div id="announcer" class="sr-only" aria-live="polite"></div>
  </main>`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const game = new Game(),
  sound = new Sound();
let quality: "low" | "high" =
  storage.get("quality") === "low" ||
  (!storage.get("quality") && matchMedia("(pointer: coarse)").matches)
    ? "low"
    : "high";
sound.mute(storage.get("muted") === "true");
const canvas = $<HTMLCanvasElement>("game"),
  dialog = $<HTMLDialogElement>("dialog");
let view: View | undefined;
let input = emptyInput(),
  previousMode: Mode = "title",
  lastFrame = performance.now(),
  accumulator = 0,
  lastHud = 0;
let toastUntil = 0,
  introUntil = 0,
  tutorialDismissed = false,
  modalKind = "",
  lastFocused: HTMLElement | null = null;
const physicalKeys = new Set<string>(),
  pointers = new Map<number, keyof Input>();
let best = 0,
  clearDetails = "",
  finishedReported = false,
  hostPaused = false;
try {
  view = new View(canvas, () => {
    quality = "low";
    toast("Quality adjusted to Low for smoother hops.");
  });
  view.setQuality(quality);
} catch (error) {
  console.error("Unable to create WebGL renderer", error);
  $("fatal").classList.remove("hidden");
  $("title-screen").classList.add("hidden");
  $("new-run").setAttribute("disabled", "");
}
updateMute();

function clearInput() {
  input = emptyInput();
  physicalKeys.clear();
  pointers.clear();
  document.querySelectorAll(".held").forEach((e) => e.classList.remove("held"));
}
function toast(text: string, seconds = 3) {
  $("toast").textContent = text;
  toastUntil = performance.now() + seconds * 1000;
  $("toast").classList.add("visible");
}
function announce(text: string) {
  $("announcer").textContent = text;
}
function updateMute() {
  const b = $("mute");
  b.innerHTML = icon(sound.muted ? "muted" : "sound");
  b.setAttribute("aria-label", sound.muted ? "Unmute sound" : "Mute sound");
  b.setAttribute("title", sound.muted ? "Unmute sound" : "Mute sound");
  b.setAttribute("aria-pressed", String(sound.muted));
}
function toggleMute() {
  void sound.unlock();
  sound.mute(!sound.muted);
  storage.set("muted", String(sound.muted));
  updateMute();
  const b = $("dialog-mute");
  if (b) {
    b.textContent = sound.muted ? "Sound off" : "Sound on";
    b.setAttribute("aria-pressed", String(!sound.muted));
  }
}
function randomSeed() {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  return `LILY-${values[0].toString(36).slice(0, 5).toUpperCase()}`;
}
function start(seed: string) {
  if (!view) return;
  closeDialog();
  clearInput();
  hostPaused = false;
  finishedReported = false;
  tutorialDismissed = false;
  game.start(seed);
  best = storage.best(game.seed);
  sound.music(true);
  void sound.unlock();
  canvas.focus();
  syncMode();
}
function pause() {
  if (game.mode === "playing" || game.mode === "intro") {
    game.pause();
    clearInput();
    sound.music(false);
    syncMode();
  }
}
function resume() {
  if (hostPaused) {
    toast("The arcade has paused this run. Resume from the player.");
    return;
  }
  if (document.hidden) return;
  closeDialog();
  clearInput();
  game.resume();
  sound.music(true);
  canvas.focus();
  syncMode();
}
const bridge = connectBridge(
  () => {
    hostPaused = true;
    pause();
  },
  () => {
    hostPaused = false;
    if (modalKind === "pause") resume();
  },
);
window.addEventListener("blur", () => {
  clearInput();
  pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    hostPaused = false;
    clearInput();
    pause();
  }
});

function openDialog(kind: string, html: string) {
  if (!dialog.open) lastFocused = document.activeElement as HTMLElement;
  modalKind = kind;
  $("dialog-content").innerHTML = html;
  if (!dialog.open) dialog.showModal();
  clearInput();
  requestAnimationFrame(() => {
    const el =
      dialog.querySelector<HTMLElement>("[autofocus]") ||
      dialog.querySelector<HTMLElement>("button,input");
    el?.focus();
  });
}
function closeDialog() {
  if (dialog.open) dialog.close();
  modalKind = "";
  lastFocused?.focus();
}
function closeButton() {
  return `<button class="dialog-close icon-button" id="close-dialog" aria-label="Close">${icon("close")}</button>`;
}
function wireClose() {
  const close = $("close-dialog");
  if (close)
    close.onclick = () => {
      if (game.mode === "paused") resume();
      else closeDialog();
    };
}
function showHelp() {
  const wasActive = ["playing", "intro"].includes(game.mode);
  if (wasActive) pause();
  openDialog(
    "help",
    `${closeButton()}<div class="modal-emblem">${frogMark}</div><h2 id="dialog-title">A frog’s field guide</h2><p class="modal-lead">Get the Golden Lily back from the Bog King. Eight levels, four worlds, three lives.</p><div class="controls-list"><div><span>Move</span><span><kbd>←</kbd><kbd>→</kbd> or <kbd>A</kbd><kbd>D</kbd></span></div><div><span>Jump · hold for height</span><span><kbd>Space</kbd> <kbd>W</kbd> <kbd>↑</kbd></span></div><div><span>Run / Fireball</span><span><kbd>Shift</kbd> / <kbd>J</kbd><kbd>X</kbd></span></div><div><span>Pause / Enter pipe</span><span><kbd>P</kbd><kbd>Esc</kbd> / <kbd>↓</kbd><kbd>S</kbd></span></div></div><p class="touch-help">On touch, use the bottom buttons. Movement runs automatically. Hold Jump to go higher.</p><div class="field-notes"><p><strong>Find your rhythm.</strong> Stomp beetles, leap over snails and deep water. Headbutt bricks and glowing ? blocks. Lit lanterns save your place.</p><p><strong>A sip. A spark. A star.</strong> Mushroom Tea absorbs a hit. Fire Fly gives bouncing fireballs. Lily Star gives eight seconds of invincibility and speed.</p><p><strong>Read the boss.</strong> Dodge its signaled attack, then stomp its head while it rests. Grab the end flag higher for more points.</p><p><strong>Take the scenic route.</strong> Glowing pipes hide bonus caves. Get 100 per fly, 200 per stomp, up to 5× combos and a time bonus. Each level has 150 seconds.</p></div><button class="primary full" id="help-done">${game.mode === "paused" ? "Resume adventure" : "Ready to hop"} ${icon("arrow")}</button>`,
  );
  wireClose();
  $("help-done").onclick = () => {
    if (game.mode === "paused") resume();
    else closeDialog();
  };
}
function showSeed() {
  openDialog(
    "seed",
    `${closeButton()}<div class="modal-emblem">${icon("seed")}</div><h2 id="dialog-title">Same seed. Shared adventure.</h2><p class="modal-lead">Every seed grows a different Lily Kingdom. Enter one to replay it or share it with a friend.</p><form id="seed-form"><label for="seed-input">Run seed</label><input id="seed-input" name="seed" type="text" maxlength="24" autocomplete="off" spellcheck="false" placeholder="e.g. GOLDEN-LILY" aria-describedby="seed-note seed-error" autofocus required><p class="field-note" id="seed-note">1–24 letters, numbers or hyphens. Case doesn’t matter.</p><p id="seed-error" class="field-error" role="status"></p><button class="primary full" type="submit">Start this seed ${icon("arrow")}</button></form>`,
  );
  wireClose();
  $("seed-form").onsubmit = (e) => {
    e.preventDefault();
    const field = $<HTMLInputElement>("seed-input"),
      seed = normalizeSeed(field.value);
    if (!/^[A-Z0-9-]{1,24}$/.test(seed)) {
      field.setAttribute("aria-invalid", "true");
      $("seed-error").textContent = "Use 1–24 letters, numbers or hyphens.";
      field.focus();
      return;
    }
    start(seed);
  };
}
function showPause() {
  openDialog(
    "pause",
    `<div class="modal-emblem">${icon("pause")}</div><h2 id="dialog-title">Take a lily break.</h2><p class="modal-lead">${WORLDS[Math.floor(game.level.index / 2)].name} · Level ${game.level.index + 1} of 8</p><button class="primary full" id="resume" autofocus>Resume adventure ${icon("play")}</button><div class="settings-row"><button class="secondary" id="dialog-mute" aria-pressed="${!sound.muted}">${sound.muted ? "Sound off" : "Sound on"}</button><button class="secondary" id="quality" title="Change graphics quality">Quality: ${quality === "high" ? "High" : "Low"}</button></div><div class="pause-seed"><span>Run seed</span><strong>${game.seed}</strong><small>Best ${best.toLocaleString()}${storage.persistent ? "" : " · this session"}</small></div><button class="secondary full" id="restart-run">${icon("restart")} Restart this seed</button><div class="dialog-links"><button class="text-button" id="pause-help">How to play</button><button class="text-button" id="return-title">Return to title</button></div>`,
  );
  $("resume").onclick = resume;
  $("dialog-mute").onclick = toggleMute;
  $("quality").onclick = () => {
    quality = quality === "high" ? "low" : "high";
    view?.setQuality(quality);
    storage.set("quality", quality);
    $("quality").textContent =
      `Quality: ${quality === "high" ? "High" : "Low"}`;
  };
  $("restart-run").onclick = () => start(game.seed);
  $("pause-help").onclick = showHelp;
  $("return-title").onclick = () => {
    closeDialog();
    game.home();
    sound.music(false);
    syncMode();
    $("new-run").focus();
  };
}
function showClear() {
  const next = game.level.index + 1,
    w = WORLDS[Math.floor(next / 2)];
  openDialog(
    "clear",
    `<div class="modal-emblem gold">${icon("flag")}</div><h2 id="dialog-title">A leap well taken.</h2><p class="modal-lead">Level ${game.level.index + 1} complete. The Golden Lily is a little closer.</p><div class="result-score"><span>Run score</span><strong>${game.score.toLocaleString()}</strong><p>${clearDetails}</p></div><div class="next-world"><span>Up next · ${Math.floor(next / 2) + 1}–${(next % 2) + 1}</span><strong>${w.name}</strong><p>${w.subtitle}</p></div><button class="primary full" id="next-level" autofocus>Next level ${icon("arrow")}</button><p class="result-seed">Seed ${game.seed} · ${game.lives} ${game.lives === 1 ? "life" : "lives"} left</p>`,
  );
  $("next-level").onclick = () => {
    closeDialog();
    clearInput();
    game.next();
    sound.music(true);
    canvas.focus();
    syncMode();
  };
}
function showResult(won: boolean) {
  best = storage.saveBest(game.seed, game.score);
  if (!finishedReported) {
    bridge.score(game.score);
    finishedReported = true;
  }
  openDialog(
    "result",
    `<div class="modal-emblem ${won ? "gold" : ""}">${won ? icon("trophy") : frogMark}</div><h2 id="dialog-title">${won ? "The Lily is home." : "Feels bad, frog."}</h2><p class="modal-lead">${won ? "One small frog. One enormous adventure. The Lily Kingdom owes you a cup of tea." : "Even legends miss a lily pad. Your next great run is one leap away."}</p><div class="result-score"><span>Final score</span><strong>${game.score.toLocaleString()}</strong><p>${game.score >= best && game.score > 0 ? "A new seed best!" : `Seed best ${best.toLocaleString()}`} ${storage.persistent ? "" : "· this session"}</p></div><div class="result-stats"><div><strong>${game.flies}</strong><span>golden flies</span></div><div><strong>${game.cleared}/8</strong><span>levels cleared</span></div><div><strong>${Math.floor(game.elapsed / 60)}:${String(Math.floor(game.elapsed % 60)).padStart(2, "0")}</strong><span>run time</span></div></div><button class="primary full" id="replay" autofocus>${icon("restart")} Play again</button><button class="secondary full" id="new-seed">Try a new seed ${icon("seed")}</button><p class="result-seed">Seed <strong>${game.seed}</strong></p><button class="text-button" id="result-title">Return to title</button>`,
  );
  $("replay").onclick = () => start(game.seed);
  $("new-seed").onclick = () => start(randomSeed());
  $("result-title").onclick = () => {
    closeDialog();
    game.home();
    syncMode();
    $("new-run").focus();
  };
}
function syncMode() {
  const title = game.mode === "title",
    active = !title;
  $("title-screen").classList.toggle("hidden", !title);
  $("hud").classList.toggle("hidden", !active);
  $("pause").classList.toggle(
    "hidden",
    !["playing", "intro", "paused"].includes(game.mode),
  );
  $("game-bottom").classList.toggle("hidden", !active);
  $("touch-controls").classList.toggle(
    "hidden",
    !["playing", "intro"].includes(game.mode),
  );
  $("rotate-hint").classList.toggle(
    "hidden",
    !["playing", "intro"].includes(game.mode),
  );
  if (previousMode !== game.mode) {
    if (game.mode === "paused") showPause();
    if (game.mode === "clear") {
      sound.music(false);
      showClear();
    }
    if (game.mode === "gameover" || game.mode === "won") {
      sound.music(false);
      showResult(game.mode === "won");
    }
    if (game.mode === "dying") sound.music(false);
    if (game.mode === "playing") sound.music(true);
    previousMode = game.mode;
  }
  updateHUD();
}
function updateHUD() {
  const p = game.player,
    world = WORLDS[Math.floor(game.level.index / 2)];
  $("score").textContent = String(game.score).padStart(6, "0");
  $("flies").textContent = String(game.flies);
  $("lives").innerHTML = Array.from({ length: 3 }, (_, i) =>
    icon("heart", i < game.lives ? "" : "lost"),
  ).join("");
  $("lives").setAttribute("aria-label", `${game.lives} lives`);
  $("world-name").textContent = game.level.bonus ? "Secret grotto" : world.name;
  $("level-label").textContent =
    `World ${Math.floor(game.level.index / 2) + 1} · Level ${game.level.index + 1} of 8`;
  $("time").textContent = String(Math.max(0, Math.ceil(150 - game.levelTime)));
  $("mobile-time").textContent =
    `${Math.max(0, Math.ceil(150 - game.levelTime))}s left`;
  $("time").classList.toggle("time-low", game.levelTime > 120);
  $("seed-value").textContent = game.seed;
  $("progress-fill").style.width =
    `${Math.min(100, (game.player.x / game.level.length) * 100)}%`;
  $("best-label").textContent =
    `Seed best ${Math.max(best, game.score).toLocaleString()}${storage.persistent ? "" : " · session"}`;
  const power =
    p.star > 0
      ? `Lily Star · ${Math.ceil(p.star)}s`
      : p.power === "fire"
        ? "Fire Fly · J / X"
        : p.power === "big"
          ? "Mushroom Tea"
          : "Little Pepe";
  $("power-label").innerHTML =
    icon(p.star > 0 ? "trophy" : p.power === "fire" ? "fire" : "seed") + power;
  $<HTMLButtonElement>("touch-fire").disabled = p.power !== "fire";
  const near =
    Math.abs(p.x - (game.level.pipeX + 0.9)) < 1.4 &&
    p.y < 1.8 &&
    game.mode === "playing";
  $("touch-pipe").classList.toggle("hidden", !near);
  $("pipe-hint").classList.toggle("hidden", !near);
  const b = game.level.boss,
    showBoss = !!b && b.phase !== "waiting" && b.hp > 0;
  $("boss-hud").classList.toggle("hidden", !showBoss || game.mode === "intro");
  if (b) {
    $("boss-name").textContent = b.name;
    $("boss-health").textContent = `${b.hp} / ${b.maxHp}`;
    $("boss-health-fill").style.width = `${(b.hp / b.maxHp) * 100}%`;
    $("boss-cue").textContent = game.bossCue;
    $("boss-hud").classList.toggle("vulnerable", b.phase === "rest");
  }
  $("tutorial").classList.toggle(
    "hidden",
    tutorialDismissed ||
      game.mode !== "playing" ||
      game.level.index !== 0 ||
      game.elapsed > 13 ||
      game.player.x > 8,
  );
}
function processEvents() {
  for (const event of game.drainEvents()) {
    view?.event(event);
    sound.effect(event.type);
    if (
      event.text &&
      [
        "power",
        "checkpoint",
        "respawn",
        "bonus",
        "bossDefeated",
        "toast",
        "stomp",
      ].includes(event.type)
    )
      toast(event.text);
    if (event.type === "clank" && performance.now() > toastUntil)
      toast(event.text || "", 1.5);
    if (event.type === "clear" || event.type === "won") {
      clearDetails = event.text || "";
      best = storage.saveBest(game.seed, game.score);
    }
    if (event.type === "level") {
      const w = WORLDS[Math.floor(game.level.index / 2)];
      $("intro-count").textContent = game.level.bonus
        ? "A hidden little wonder"
        : `World ${Math.floor(game.level.index / 2) + 1} · Level ${game.level.index + 1}`;
      $("intro-name").textContent = game.level.bonus ? "Secret grotto" : w.name;
      $("intro-line").textContent = game.level.bonus
        ? "Fill your pockets. Exit through the glowing pipe."
        : w.subtitle;
      introUntil = performance.now() + 2400;
      announce(`${w.name}. Level ${game.level.index + 1}.`);
    }
    if (event.type === "bossIntro") {
      $("intro-count").textContent = "Guardian of the Golden Lily";
      $("intro-name").textContent = event.text || "";
      $("intro-line").textContent = "Dodge the attack. Stomp while it rests.";
      introUntil = performance.now() + 1950;
      announce(event.text || "Boss fight");
    }
    if (event.type === "death") announce(`${game.lives} lives left.`);
  }
}

$("new-run").onclick = () => start(randomSeed());
$("enter-seed").onclick = showSeed;
$("help").onclick = showHelp;
$("learn").onclick = showHelp;
$("pause").onclick = pause;
$("mute").onclick = toggleMute;
$("dismiss-tutorial").onclick = () => {
  tutorialDismissed = true;
  updateHUD();
};
$("reload").onclick = () => location.reload();
$("seed-copy").onclick = async () => {
  try {
    await navigator.clipboard.writeText(game.seed);
    toast(`Seed copied · ${game.seed}`);
  } catch {
    pause();
    toast("The seed is shown in the pause menu. Select it to copy.", 5);
  }
};
dialog.addEventListener("cancel", (e) => {
  e.preventDefault();
  if (game.mode === "paused") resume();
  else if (["help", "seed"].includes(modalKind)) closeDialog();
});
dialog.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  const controls = Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), a[href], select:not(:disabled), [tabindex="0"]',
    ),
  ).filter((element) => element.getClientRects().length > 0);
  const first = controls[0],
    last = controls[controls.length - 1];
  if (
    event.shiftKey &&
    (document.activeElement === first || document.activeElement === dialog)
  ) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
});
const keyMap: Record<string, keyof Input> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  Space: "jump",
  KeyW: "jump",
  ArrowUp: "jump",
  ShiftLeft: "run",
  ShiftRight: "run",
  KeyJ: "fire",
  KeyX: "fire",
  ArrowDown: "down",
  KeyS: "down",
};
function updateInput() {
  const next = emptyInput();
  for (const k of physicalKeys) {
    if (keyMap[k]) next[keyMap[k]] = true;
  }
  for (const action of pointers.values()) {
    next[action] = true;
    if (action === "left" || action === "right") next.run = true;
  }
  input = next;
}
window.addEventListener("keydown", (e) => {
  if (
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement
  )
    return;
  if (e.code === "KeyP" || e.code === "Escape") {
    if (e.repeat) return;
    if (game.mode === "playing" || game.mode === "intro") {
      e.preventDefault();
      pause();
    } else if (game.mode === "paused") {
      e.preventDefault();
      resume();
    }
    return;
  }
  if (dialog.open || game.mode === "title" || !keyMap[e.code]) return;
  e.preventDefault();
  physicalKeys.add(e.code);
  updateInput();
  void sound.unlock();
});
window.addEventListener("keyup", (e) => {
  physicalKeys.delete(e.code);
  updateInput();
});
for (const [id, action] of [
  ["touch-left", "left"],
  ["touch-right", "right"],
  ["touch-jump", "jump"],
  ["touch-fire", "fire"],
  ["touch-pipe", "down"],
] as const) {
  const button = $<HTMLButtonElement>(id);
  button.addEventListener("pointerdown", (e) => {
    if (button.disabled) return;
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, action);
    updateInput();
    button.classList.add("held");
    void sound.unlock();
  });
  const release = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    updateInput();
    button.classList.remove("held");
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
}
canvas.addEventListener("pointerdown", () => {
  void sound.unlock();
  canvas.focus();
});
function frame(now: number) {
  const realDt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  accumulator += realDt;
  while (accumulator >= 1 / 120) {
    game.update(1 / 120, input);
    accumulator -= 1 / 120;
  }
  processEvents();
  if (game.mode !== previousMode) syncMode();
  if (now - lastHud > 90) {
    updateHUD();
    lastHud = now;
  }
  $("toast").classList.toggle("visible", now < toastUntil);
  $("level-intro").classList.toggle(
    "hidden",
    now > introUntil ||
      ["title", "paused", "gameover", "clear", "won"].includes(game.mode),
  );
  view?.render(game, realDt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Read-only diagnostics support repeatable interaction checks without cheat controls.
Object.defineProperty(window, "pepeDiagnostics", {
  get: () => ({
    ...game.snapshot(),
    quality,
    muted: sound.muted,
    audio: sound.state,
    storagePersistent: storage.persistent,
    reducedMotion: view?.reduced,
    fps: Math.round(view?.fps || 0),
    drawCalls: view?.drawCalls || 0,
    input: { ...input },
    terrain: game.level.platforms
      .filter((p) => p.active)
      .map((p) => ({ x: p.x, y: p.y, w: p.w, kind: p.kind })),
    enemies: game.level.enemies
      .filter((e) => e.alive)
      .map((e) => ({ x: e.x, y: e.y, kind: e.kind })),
    shots: game.shots.map((s) => ({ ...s })),
  }),
});
