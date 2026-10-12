# Pepe Bros design system

## Overview

Pepe Bros is an arcade platformer presented as a small, sculpted storybook world. The title screen pairs large cream-and-lily typography with a modeled frog on a lily pad. Warm gold marks flies, rewards and sunlight. The four-stage route at the bottom introduces the adventure without competing with New run.

The interface is a quiet, dark frame around the world. Keep gameplay status compact and opaque so it remains readable against every environment. Menus use one primary action, ordinary labels and native controls. The model and scene construction are in `src/view.ts`; UI structure and behavior are in `src/main.ts`; the implemented CSS tokens and responsive patterns are in `src/style.css`.

## Colors

The primitive colors in `:root` feed semantic tokens. Reuse the semantic token for its documented role.

| Semantic token         | Value     | Role                                            |
| ---------------------- | --------- | ----------------------------------------------- |
| `--color-bg`           | `#102b29` | Page, HUD, input and floating status background |
| `--color-surface`      | `#173632` | Dialog and secondary action surface             |
| `--color-raised`       | `#244840` | Hover, keycaps and emblem surfaces              |
| `--color-text`         | `#f6f1d7` | Primary text and icons                          |
| `--color-muted`        | `#c0ccad` | Secondary copy, captions and field guidance     |
| `--color-border`       | `#466458` | Component boundaries                            |
| `--color-accent`       | `#d6e99b` | Primary action fill and progress                |
| `--color-accent-hover` | `#c4de86` | Primary action hover                            |
| `--color-gold`         | `#f4ce7d` | Reward and score emphasis                       |
| `--color-danger`       | `#eca693` | Lives, low time and errors                      |
| `--color-focus`        | `#fff0ac` | 3px keyboard focus perimeter                    |

World palettes live in `WORLDS` in `src/engine.ts`: swamp `#183e3c` / `#91ba5c`, caves `#272039` / `#b3a3db`, sky `#a6cdd1` / `#a8c873`, castle `#35252e` / `#91746b`. Fog and material lighting complete the mood. These scene colors do not replace the UI roles. Solid control contrast measurements are recorded in `artifacts/browser-tests.json`; the animated scene and translucent overlays are not covered by those measurements.

## Typography

Outfit is served locally from `src/assets/outfit-latin.woff2`, with Arial and generic sans-serif fallbacks. Its variable range is declared as weights 100–900; the interface uses 400–850. Body text is 400, controls generally 600, and the title 850.

The six semantic size roles are `--text-xs` 12px, `--text-sm` 14px, `--text-base` 16px, `--text-lg` 20px, `--text-heading` 32px and `--text-display` `clamp(4.5rem, 8.4vw, 8rem)`. The display title uses responsive overrides, including `clamp(3.1rem, 14vw, 4.5rem)` at narrow widths. Inputs stay at 16px.

Body line-height is 1.55; longer help copy uses 1.6. Dialog headings use 1.1 with −0.035em tracking. The large wordmark uses 0.87 line-height and −0.07em tracking. The mobile wordmark fits on one line. Headings balance; short paragraphs use pretty wrapping. Scores, health and clocks use tabular numbers. Seed values wrap instead of truncating, and remain selectable in the pause menu.

## Layout

Desktop uses a 28px page inset, an 82px top bar, a rounded viewport stage and a 42px footer. The title content aligns to a 52px inner edge. Ordinary groups use 8–12px gaps, actions use 12px gaps, and sections use 20–28px spacing. Dialogs are at most 480px wide with 34px inner padding; their content scrolls within `100svh - 40px`.

The desktop route uses four columns. At 1050px the frame and title insets tighten and the header tagline disappears. At 680px the page inset is 12px, the top bar is 66px, title padding is 25px, route captions simplify, and the HUD uses two rows. The seed field has a stable width and cannot collapse to one character per line. A separate time pill keeps the clock visible in portrait. At 360px, controls tighten without dropping below usable touch sizes.

Touch controls appear for coarse pointers or widths up to 860px. They float above safe-area insets. Jump is 72px, movement buttons 58px and Fire 55px; the narrowest layout uses 65px, 48px and 48px respectively. Pointer capture supports simultaneous movement and jumping. Portrait presents a nonblocking landscape hint. Short landscape viewports under 560px tall reduce the header and hide the footer and title route to preserve play space.

Browser inspection covered 1440×900 and 1280×800 desktop, 768×844 intermediate, 390×844 and 320×844 narrow layouts, and 844×390 touch landscape. Native 200% zoom, RTL and translated copy were not tested; the game ships in English.

## Elevation & Depth

The stage uses a subtle outline and a 22px radius, reduced to 17px on mobile. HUD/status surfaces sit above the canvas at z-index 3–6. A title vignette provides a readable left-to-right composition on desktop and a top-to-bottom composition on mobile. Gameplay replaces it with a restrained bottom shade.

Dialogs use the browser’s top layer, a dark translucent backdrop and a 7px blur. The dialog shadow is `0 22px 100px #081b24b3`. Primary controls have a small 3px lower shadow; the HUD uses a shallow 5px shadow. Borders express component structure, while surface tone and shadow express elevation.

The 3D scene uses an orthographic camera, layered trees/hills/castles, distance fog, hemispheric fill, a warm directional key and a cool rim. High quality uses soft shadows, drifting motes, moving reeds and subtle water rings. Static scenery is batched; distant groups are hidden. Sky surfaces use broad oval lily pads; castle towers have masonry joints. Resting bosses show a lime ring. All collisions stay on one 2D plane.

## Shapes

Rounded silhouettes establish the game’s identity: broad frog cheeks, heavy eyelids, wide red-brown lips, small feet, mushroom caps, flattened lily pads and soft foliage. Bricks and mystery blocks deliberately contrast as squared gameplay landmarks. Question marks are raised pixel inlays, not external textures.

Action radii are 11px, fields 10px, HUD 13px, dialogs 24px. Emblems and icon buttons are circular. Small information pills use fully rounded ends. UI icons are original 24×24 SVG line drawings with 1.8px strokes and `currentColor` in `src/icons.ts`; do not substitute emoji for these assets.

## Components

- **`.primary` / `.secondary` / `.text-button`:** one filled action per menu, bordered secondary actions, quieter tertiary links. Hover is tonal; active press scales to 0.96 only when motion is allowed. Disabled Fire is labeled and remains visibly distinct.
- **`.icon-button`:** circular named controls for help, mute and pause. Use a visible label or `aria-label` and a title. The mute control reflects its current pressed state.
- **Native `dialog`:** `openDialog`, `closeDialog` and the menu functions in `src/main.ts` create help, seed, pause, stage-clear and result views. Focus enters the active menu, stays within it, and returns on close. Escape closes help/seed or resumes a paused run. Results retain their explicit replay actions.
- **Seed form:** persistent label, 16px input, inline recoverable error and `aria-invalid`. The hint describes the accepted format before submission. Validation uses normalized uppercase text.
- **HUD:** grouped score/lives/flies, world/stage, timer, full seed and a slim progress line. It uses solid surfaces, tabular numbers and stable sizing. Color is paired with labels and icons.
- **Touch controls:** separate left/right and Fire/Jump groups. `pointerdown`, `pointerup`, cancellation and capture loss update the shared input state. A contextual pipe action appears only nearby.
- **Feedback:** particles, short original sound effects, squash/stretch, boss shake, a live status toast and explicit score updates. Errors and seed guidance stay in their forms. Boss text announces the attack and the vulnerable rest period.
- **Results:** a large score, flies/levels/time, seed identity and one-click replay. Local storage denial changes the best-score wording to session storage behavior, without blocking the game.

Reduced motion disables CSS transitions, press scaling and decorative scene animation, including camera shake. Essential jumping and camera tracking remain functional. New overlays should follow this same rule.

## Do’s and Don’ts

- Start new menus from the existing native dialog, spacing and action classes. Keep one primary action and put the explanation beside its controls.
- Use the established semantic token and six typography roles. Keep technical details out of the player’s path.
- Keep HUD surfaces opaque and reward accents separate from action emphasis. Preserve a text or icon cue for state changes.
- Keep new runtime assets local and relative. Add source assets to `public/`, then rebuild `dist/`.
- Keep new mechanics in the fixed-step engine and new art in the renderer. Visual depth must not introduce a third gameplay axis.
- Do not add dashboard cards, remote fonts, unrelated gradients, new icon systems or automatic camera shake under reduced motion.

To add another informational screen, create its content through `openDialog`, use a 32px `h2`, 14px lead, existing rows and one `.primary.full` action, connect focus/close behavior, inspect it at 320px and in short landscape, then rebuild and update the evidence.
