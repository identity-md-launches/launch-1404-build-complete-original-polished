# Pepe Bros validation

Worker report, 12 October 2026. **Complete for the stated build-worker scope.** Hosting and the registration callback remain the post-publication agent’s responsibility. This is recorded worker evidence, not an independent certification.

## Scope and decisions

The inspected product is the complete static `dist/` export served under `/preview/`: title, help, seed entry/error, eight-stage gameplay, four bosses, pause/settings, stage clear, game over, victory and replay. Desktop keyboard and emulated touch are supported. English is the shipped language; one dark UI surrounds four world palettes. The game uses TypeScript and Three.js with native DOM controls; React would add no useful state boundary to this small canvas game.

The supplied Better Interface workflow and core principles from **all six domains** were read and applied while implementing. Supporting focus, form, motion, wrapping, color and design-documentation sections informed the final review. Their notices are preserved in [the license record](../licenses/design-guidance.txt). [DESIGN.md](../DESIGN.md) documents the actual final tokens and components.

Consequential choices: touch movement runs automatically; pipes use Down/S or a contextual touch action; a stage lasts at most 150 seconds; checkpoints preserve progress and unfinished boss health. Storage denial falls back to memory. Seed sharing does not require a server. The stated 8–12 minute pace is a design intention for exploratory play, not a measured human completion time.

## Six-domain coverage

| Domain | Coverage and evidence | Limits / not applicable |
| --- | --- | --- |
| Accessibility — Checked | Native buttons, labeled seed form, recoverable inline error, named canvas/options, polite status text, visible focus, dialog boundary focus and return, keyboard movement/pause/replay, simultaneous touch/cancel and reduced-motion preference. Focus visible in [pause](pause-menu.jpg) and [victory](victory.jpg); interaction assertions in [browser results](browser-tests.json). | No screen-reader session, automated accessibility scanner, native 200% zoom or physical assistive-device test. Visual platforming is not a nonvisual game. |
| Layout — Checked | Rendered 1440×900 and 1280×800 desktop, 768×844 intermediate, 390×844 and 320×844 portrait, and 844×390 touch landscape. First-screen action and horizontal overflow measured at 390/320/768. Maximum 24-character seed checked at 320. [Mobile title](mobile-title.jpg), [long seed](narrow-long-seed.jpg), [landscape](touch-landscape.jpg). | No RTL or translated content; those variants are not shipped. Native zoom remains unverified. |
| Writing — Checked | Short action labels, goal and rules beside relevant controls, seed format before submission, inline invalid-seed recovery, plain quality/mute labels, distinct resume/restart/replay actions and named boss attack/rest cues. Source and rendered menus reviewed. | No localization or user comprehension study. No checkout, account or destructive data workflow applies. |
| Typography — Checked | Six semantic size roles, locally bundled Outfit, readable body/input sizing, tabular scores and timer, heading hierarchy, seed wrapping and dialog scrolling. Actual 390/320 layouts and maximum-length seed inspected. | Font appearance varies by platform; physical-device rasterization and text-enlargement settings were not tested. |
| Colors — Checked | Semantic palette reviewed in source; four world moods inspected in production screenshots. Measured rendered solid-surface contrast: primary action **11.42:1**, secondary **11.48:1**, header muted copy **8.92:1**. Labels/icons supplement color for lives, powers, quality and boss state. | Ratios cover those measured solid pairs only. Animated scene, translucent overlays and every possible background were not exhaustively measured. Alternate UI themes are not applicable. |
| UI — Checked | Shared buttons, original icons, pressed/disabled states, native dialogs, progress, status feedback, touch targets, responsive menu scrolling, mute/quality persistence, reduced-motion handling, hit/collect/win feedback and instant replay. All four world scenes and final boss reviewed. | Browser Animations-panel playback at 10% speed was not performed. No skeleton/remote-loading state is needed for this locally bundled game. |

## Findings, corrections and rechecks

Source locations identify the final corrective implementation. Earlier failing states are described rather than presented as passing evidence.

| Severity / domain | Observed issue and impact | Correction / final evidence |
| --- | --- | --- |
| Medium · layout/typography | At narrow widths, the HUD seed flex item could collapse into one character per line, making the top bar excessively tall. | `src/style.css:1789` fixes flex sizing and a stable seed width while retaining wrapping. 390px gameplay and a 24-character seed at 320px pass overflow checks; [screenshot](narrow-long-seed.jpg). |
| Medium · layout | The first mobile title composition crowded its route and main actions. | `src/style.css:1808` and `src/style.css:1844` anchor title content to the stage and use a one-line mobile wordmark. New run is visible at y=314px at 390 width; [final title](mobile-title.jpg). |
| Medium · layout/UI | The early tutorial sat over the player’s ground-level path. | `src/style.css:1828` places the tip beneath the HUD; `src/main.ts:407` dismisses it after initial movement/time. [Final mobile gameplay](mobile-game.jpg) shows an unobstructed path. |
| Medium · accessibility | A native dialog’s Shift+Tab boundary could leave the expected control cycle. | `src/main.ts:487` explicitly wraps first/last visible controls. The browser test verifies Resume → Shift+Tab → Return to title → Tab → Resume; [focused pause](pause-menu.jpg). |
| High · gameplay/UI | The original jump apex was slightly too low to retrieve a released mystery-block reward, despite successfully headbutting it. | `src/engine.ts:688` raises held-jump velocity to 12.8. A regression test collects the tea by ordinary approach/headbutt/backtrack/jump. The input-only final campaign collects tea; [sky screenshot](world-3.jpg). |
| Medium · gameplay/layout | An early pipe placement could constrain movement beside raised blocks. | `src/engine.ts:296` positions the pipe ten units into its ground segment. Generation checks verify valid supporting ground in 8,000 layouts; the final campaign traverses those segments. |
| High · gameplay | Dying in a boss fight could respawn far away while the boss kept attacking. | `src/engine.ts:635` resets the unfinished boss attack and `src/engine.ts:913` places a checkpoint at the arena. Dedicated regression passes; final campaign survives two deaths at the Bog King and wins. |
| Medium · gameplay | Revisiting a bonus cave could regenerate collected rewards. | `src/engine.ts:565` and `src/engine.ts:607` retain that cave’s state until the stage changes. Bonus persistence/return regression passes. |
| High · integration | ES-module/font loading would depend on host CORS policy in an opaque sandbox. | `scripts/tasks.mjs:61` bundles one classic IIFE with inlined local font, relative asset paths and no runtime imports. The final browser test uses a server without CORS headers and `allow-scripts allow-pointer-lock` without same-origin; startup, gameplay, pause/resume, score and replay pass. |
| Medium · performance/UI | Unbatched scenery and large foreground tree crowns increased rendering work and obscured composition. | `src/view.ts:124` batches static meshes; background scale, distance culling and Low quality limit visual work. All worlds inspected. This is an optimization, not a certified 60 FPS result. |
| Low · art/UI | Sky terrain and castle walls needed stronger world silhouettes; boss rest needed a non-text cue. | `src/view.ts:641` adds themed scenery/masonry, sky terrain uses oval lily surfaces, and `src/view.ts:1178` shows a rest halo. [Sky](world-3.jpg), [castle](world-4.jpg), [Bog King](bog-king.jpg). |
| High · delivery | Inherited ignore behavior omitted generated export/evidence from ordinary file discovery. | `.gitignore:1` explicitly includes root `dist/` and `artifacts/`, followed by recursive dependency/cache exclusions. Both are visible to ignore-aware discovery. The file stays within its explicit 512-byte budget in [BUDGET.md](../BUDGET.md). |

## Actual verification

The final source build used Node/npm with dependencies installed outside the repository (`PEPE_DEP_ROOT=/tmp/pepe-bros-toolchain`). Browser checks selected the installed Chromium executable with `PLAYWRIGHT_EXECUTABLE_PATH`. Equivalent normal-install commands are documented in the README.

| Command | Actual result / evidence |
| --- | --- |
| `npm run typecheck` | Passed, no TypeScript diagnostics. [Captured output](build-checks.txt). |
| `npm run build` | Passed, Vite 7.1.12. Single locally bundled Three.js/game script and complete static export. [Captured output](build-checks.txt). |
| `npm test` | **15 checks passed**, including 8,000 generated layouts, jump timing, powers, enemies, pause, bonus persistence, lives and all bosses/progression. [JSON](engine-tests.json). Targeted model tests sometimes position entities directly to isolate a rule; they are not a substitute for browser play. |
| `node scripts/browser-check.mjs` | **18 checks passed** in Chromium 154.0.8037.0 with a normal animation clock: responsive layout, seed entry, keyboard/touch, gesture audio, focus, mute, quality, natural game-over and replay, reduced motion, sandbox bridge. No JavaScript errors or failed resource requests. [JSON](browser-tests.json). |
| `node scripts/campaign-check.mjs` | **Passed all eight levels and victory replay**, seed `POND-12`, score **67,974**, one life remaining, 316.61 simulated gameplay seconds. [JSON](campaign-test.json). Real production browser with controlled 120 Hz animation clock, synthetic keyboard input and read-only diagnostics. Every simulation/UI/scene frame runs; software WebGL rasterizes every twelfth frame. No game-state mutation. This is not a hardware FPS or human pacing measurement. |
| `node scripts/audit.mjs` | File sizes, relative entry references, manifest assets, original cover dimensions, metadata, required evidence links, public/export equivalence and export SHA-256 inventory are recorded in [export audit](export-audit.json). |

The normal browser check exercises `sandbox="allow-scripts allow-pointer-lock"`, denied localStorage, channel handshake, rejection of wrong channel and wrong source, host pause/resume, one finite nonnegative integer score on game over, and subsequent replay. Audio is unstarted before a gesture, starts from a click, and mute survives a reload when storage is available. Touch uses Chromium’s real touch event dispatch with simultaneous movement/jump and cancellation.

The worker also navigated and inspected the production page using the supplied browser tool. The final screenshots linked here were taken by the repeatable Playwright scripts and then visually opened for review. Software WebGL can emit GPU/readback performance warnings; no production JavaScript or asset failure was observed in the final checks.

## Evidence gallery

- [Desktop title](desktop-title.jpg), [390px title](mobile-title.jpg), [390px gameplay](mobile-game.jpg), [320px long seed](narrow-long-seed.jpg), [touch landscape](touch-landscape.jpg).
- [Pause/settings](pause-menu.jpg), [game over](game-over.jpg), [sandbox game over](sandbox-game-over.jpg), [victory](victory.jpg).
- [Moonlit Swamp](world-1.jpg), [Crystal Caves](world-2.jpg), [Sky Lily Pads](world-3.jpg), [Bog King’s Castle](world-4.jpg), [Bog King fight](bog-king.jpg).

## Remaining limits and handoff

No required build-worker check remains outstanding. Hardware 60 FPS, physical iOS/Android, Safari/Firefox, screen-reader gameplay, native 200% zoom and a human 8–12 minute pacing study remain unverified. The browser campaign is a fast input-driven route, not a claim that every possible generated layout has been completed by a person. Current tests are useful evidence, not a proof of universal playability or full accessibility conformance.

**Registration pending: post-publication agent required.** After hosting, the coordinating agent must run `npm run release -- --job JOB_UUID` in the template repository with the actual admitted job ID, preserve the private receipt, and report website, Explorer link, submission ID and actual review status. Use the same command/ID/capability for backoff retries of timeouts, 429 and 5xx. The complete instructions are in [README.md](../README.md#publish-and-finish-registration). No public credential, invented CID or registration callback is embedded in this export.
