# Pepe Bros

**A little frog. A legendary leap.** An original, single-player HTML5 platformer for the Pepe2Pepe arcade. Guide Pepe through eight seeded stages, defeat four guardians and bring the Golden Lily home.

The complete, locally bundled website is in **[`dist/`](dist/index.html)**. It includes `index.html`, the `pepe-browser-game/1` manifest, an original 1200 × 630 SVG cover, favicon, local font, licenses and Three.js. No account, wallet, backend, CDN or remote runtime asset is required.

## Play

- **Move:** A / D or ← / →. **Run:** Shift.
- **Jump:** Space, W or ↑. Hold for a higher jump; a short tap makes a lower hop.
- **Fire:** J or X after collecting Fire Fly. Fireballs bounce.
- **Pause:** P or Esc. **Enter a glowing pipe:** S or ↓.
- **Touch:** left/right, Jump and Fire. Touch movement runs automatically. An Enter pipe button appears beside a pipe. Landscape is recommended; portrait remains playable.

Choose **New run** for a random seed, or **Enter seed** to share a layout. Seeds accept 1–24 letters, numbers and hyphens, with case normalized. There are three lives per run. Each stage has a 150-second time limit. Lanterns save stage progress; entering a boss arena moves the checkpoint to its entrance. After death, an unfinished boss returns to its starting position and keeps its remaining health.

The worlds are Moonlit Swamp, Crystal Caves, Sky Lily Pads and the Bog King’s Castle, with two levels apiece. Mossback charges, the Amethyst Warden drops crystals, Cloudskipper hops, and the Bog King slams out shockwaves. Each signals its attack and has a rest period for stomps or fireballs. The Bog King crouches during this opening.

Collect golden flies, headbutt bricks and glowing mystery blocks, stomp armored beetles and avoid spiky snails and deep water. Mushroom Tea absorbs one hit. Fire Fly also grows Pepe and enables fireballs. Lily Star grants eight seconds of invincibility and faster movement. Bonus pipes lead to a grotto with 36 flies and a star; collected rewards remain collected when revisiting it.

Scoring: 100 per fly, 50 per brick, 500 per power-up, 200 per stomp with up to 5× combos, 150 per fireball enemy defeat, 500 per boss hit and 2,000 per boss defeat. The flag grants 200–2,000 points according to grab height, plus 10 per remaining second. The best score is stored per seed. In an opaque iframe or when storage is disabled, scores and settings work in memory for that page session. Scores are local display values, not a trusted leaderboard.

The intended relaxed run is about 8–12 minutes with collecting and bonus exploration. A fast run can be substantially shorter. No human pacing study was performed.

## Install, develop and rebuild

Use Node.js **20.19+ or 22.12+** and npm. Exact dependency versions and integrity hashes are in `package-lock.json`.

```sh
npm ci
npm run dev
```

```sh
npm run typecheck
npm run build
npm test
npm run preview
```

Open the local URL printed by Vite. Serve the export over HTTP; direct `file:` loading is not part of the supported preview workflow. The export is a self-contained classic IIFE script; the local WOFF2 is inlined into its CSS. This also supports an opaque iframe on static hosts without CORS headers. The Vite configuration lives in [`scripts/tasks.mjs`](scripts/tasks.mjs), with `base: './'`. There are no server routes. Copy the **entire** `dist/` directory to static hosting; the publisher serves this export without rebuilding it.

The worker used an external toolchain at `/tmp/pepe-bros-toolchain` to respect the repository’s dependency-directory restriction. `PEPE_DEP_ROOT` optionally points the scripts to such an installation. It is unnecessary after a normal local `npm ci`, and is never embedded into the export.

## Reproduce the checks

```sh
npx playwright install chromium
node scripts/browser-check.mjs
node scripts/campaign-check.mjs
node scripts/audit.mjs
```

The browser scripts own a temporary HTTP server and close it and Chromium when finished. They validate the **production export at a subpath**, not the development server. `PLAYWRIGHT_EXECUTABLE_PATH` can select an existing Chromium executable. They write their actual JSON results and JPEG screenshots to `artifacts/`.

- [`artifacts/engine-tests.json`](artifacts/engine-tests.json): deterministic generation, 8,000 level layouts, jump height/grace/buffering, collision outcomes, all power-ups, pause, bonus persistence, lives, boss respawns and eight-stage progression. These are targeted model tests; some deliberately place entities to isolate a rule.
- [`artifacts/browser-tests.json`](artifacts/browser-tests.json): real Chromium keyboard and touch interactions, responsive layouts, seed validation, audio gestures, mute persistence, pause/restart, natural game-over/replay, reduced motion, native dialog focus, measured solid-surface contrast and the opaque-origin iframe bridge.
- [`artifacts/campaign-test.json`](artifacts/campaign-test.json): input-driven eight-stage production-browser playthrough. The harness controls the animation clock at 120 Hz and uses read-only diagnostics to choose keyboard input. It rasterizes every twelfth frame to make the software WebGL check practical; every physics, UI and scene update still executes. It never changes game state. This is separate from the normal-clock interaction check and is not an FPS or human playtime benchmark.
- [`artifacts/validation.md`](artifacts/validation.md): consolidated Better Interface review, observed defects and corrections, evidence index and limits.
- [`artifacts/build-checks.txt`](artifacts/build-checks.txt) and [`artifacts/export-audit.json`](artifacts/export-audit.json): actual build/typecheck/test output, complete delivery size, export hashes and local documentation-link checks.
- [`DESIGN.md`](DESIGN.md): the implemented visual system and reusable patterns.

The test controller and clock instrumentation are **not bundled into the game**. Production exposes a read-only `window.pepeDiagnostics` snapshot, without teleport, unlock, score-writing or invincibility controls.

## Runtime and performance

TypeScript owns deterministic, strictly two-dimensional physics with a fixed 120 Hz simulation and a frame-time accumulator. Three.js owns the visuals only: orthographic camera, rounded models, fog, layered scenery, warm lighting, soft shadows, shiny pond surfaces, reeds and particles. Geometry and materials are reused; static scenery is batched and distant scenery is hidden.

High quality caps device pixel ratio at 1.65 and uses shadows and ambient decorations. Low quality caps it at 1 and removes shadows, extra moving reeds, water rings and ambient motes. Coarse-pointer devices start in Low. A rolling low frame rate also lowers High automatically; the pause menu can change the quality manually.

The soundtrack and effects are original Web Audio synthesis. Audio initializes after a gesture. Mute is remembered when storage is available. Pausing stops the music scheduler, with a short release on already scheduled notes. Visibility loss and window blur pause play. Reduced motion removes camera shake, decorative drift/sway, breathing, squash/stretch and CSS transitions; essential character movement and camera tracking remain.

**Limits:** the browser available to this worker uses software WebGL. Hardware 60 FPS, physical Android/iOS devices, Safari, Firefox, screen-reader gameplay and native 200% zoom were not certified. The menus use native accessible controls, but the visual platforming itself is not a nonvisual game. A recent browser with WebGL2 is required. If WebGL creation fails, an explicit recovery screen replaces the game.

## Arcade contract

[`public/pepe-game.json`](public/pepe-game.json) is copied to `dist/pepe-game.json`. [`src/bridge.ts`](src/bridge.ts) implements `pepe-game/1`:

1. Accept `init` only from `parent`, with the exact protocol and a nonempty channel of at most 200 characters; reply `ready` with that channel.
2. Accept `pause` / `resume` only from the same source and matching protocol/channel.
3. Emit one finite, nonnegative integer `score` when a run ends in game over or victory.

The bridge uses `postMessage(..., '*')` for opaque origins and sends no private data. The tested sandbox is `allow-scripts allow-pointer-lock`, without `allow-same-origin`. Storage failures are caught. No registration callback or credential exists in browser code.

## Publish and finish registration

This is the **build-worker handoff**. Hosting occurs after this task completes. The required static export is included; this worker did not launch a nested job, publish a site, run the release helper or invent a future CID.

**Registration pending: post-publication agent required.**

After Swarm hosting is available, the coordinating/publishing agent **must** run the following in the [Pepe2Pepe template repository](https://github.com/adaki2004/pepe2pepe-game-template), using the actual admitted job ID:

```sh
npm run release -- --job JOB_UUID
```

This command belongs to the template repository, not this game package. It validates the hosted immutable export and sends `POST https://game-api-production-2d95.up.railway.app/v1/game-submissions` with `{id, jobId, cid, manifest, contact}` and the private `X-Game-Submission` capability generated by the helper.

Preserve its saved private receipt. After timeouts, HTTP 429 or 5xx, back off and retry the **same command, submission ID and capability**. Never repay, create duplicate submissions or replace the immutable CID with a mutable name. On a validation error or conflict, inspect the actual problem before retrying. Keep receipts, capabilities and credentials out of public files, logs and game code.

The publishing agent’s final response must include the working website, Explorer link, returned submission ID and **actual review status**. `pending` means submitted for administrator review, never approved. A hosted URL alone is not a completed submission. If no continuation is available, retain the explicit pending statement above.

## Art, licenses and references

The game’s rounded character models, environments, interface icons, SVG cover/favicon and synthesized music were authored for this assignment. No stock textures, audio recordings or remote models are used.

- Three.js 0.180.0: [MIT license](public/licenses/three-MIT.txt), [official documentation](https://threejs.org/docs/). Bundled locally.
- Outfit variable font: [SIL Open Font License](public/fonts/OFL.txt). Bundled as WOFF2.
- Better Interface design guidance: Jakub Krehel, pinned MIT revision `267330e1adfc66a718fb65fa6918c1f06d0a689e`. Documentation guidance: Paul Bakaus’s Impeccable, Apache-2.0 revision `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`. The supplied combined [license texts are retained](licenses/design-guidance.txt).
- Arcade contracts consulted: [AGENTS.md](https://github.com/adaki2004/pepe2pepe-game-template/blob/main/AGENTS.md), [INTEGRATION.md](https://github.com/adaki2004/pepe2pepe-game-template/blob/main/INTEGRATION.md), [REGISTRATION.md](https://github.com/adaki2004/pepe2pepe-game-template/blob/main/REGISTRATION.md).

See [`BUDGET.md`](BUDGET.md) for the explicit path budget. Source, lockfile, original assets, test evidence and `dist/` are the deliverables. Dependency directories, caches, browser binaries and scratch files are excluded at every nesting level.
