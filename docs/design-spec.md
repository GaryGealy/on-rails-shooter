# Cyberpunk Rail Shooter — Design Spec

## Overview

A browser-based, first-person on-rails light-gun shooter with a cyberpunk theme. The camera travels a fixed spline through each of three escalating levels — a descent into a megacorp — while the player aims a mouse-driven reticle and shoots enemies before they land hits. The core loop is arcade score-chasing: a combo multiplier rewards clean, consecutive hits and a per-level letter grade drives "one more run." A full playthrough is 10–15 minutes with zero install and zero login.

## Game Identity

- **Genre:** First-person on-rails light-gun shooter (Time Crisis / House of the Dead lineage)
- **Theme:** Cyberpunk — a lone runner shooting their way down into a megacorp
- **Framing:** Three-level descent: the street, the tower, the breach
- **Session length:** 10–15 minutes for a full run
- **Players:** Single-player
- **Platform:** Desktop browser (mouse required); no install, no account

## Tech Stack

- **Language:** TypeScript (Three.js ships first-class types; the spawn-table / enemy-archetype / scoring state benefits most from typed interfaces). A quick plain-JS spike to validate core feel is acceptable before committing.
- **Engine:** Three.js (WebGL)
- **Post-processing:** Three.js `EffectComposer` — bloom, chromatic aberration, scanline/glitch, vignette
- **Build/tooling:** Vite (dev server + bundler; handles TS with zero config)
- **UI layer:** vanilla DOM/CSS for the HUD and menu screens — no web framework
- **Persistence:** `localStorage` only (no backend)
- **Target:** 60fps on mid-range hardware

Rationale: on-rails means we need depth without physics or free movement, so Three.js gives the visual payoff of 3D without the hard parts, and has the best-trodden path for the cyberpunk post-processing stack that carries the aesthetic.

### Why not a web framework (e.g. SvelteKit)?

This is a **render-loop game on a single canvas**, not a DOM/UI app — so a meta-framework like SvelteKit would add machinery we'd fight rather than use:

- **One screen, no routing.** Three.js owns a `<canvas>` and everything runs inside `requestAnimationFrame`. Menus are *game states*, not URLs — there's nothing for a router to do.
- **No server, no SSR, no data loading.** Persistence is `localStorage`; there's no backend or server endpoints. SSR/hydration would only get in the way of a client-side game loop.
- **The framework lifecycle and the game loop compete for control of the page.** Keeping the loop in charge is simpler than bridging it into a framework's reactivity.

This is the key contrast with `neon-breach`, which *correctly* uses SvelteKit because that game **is** its UI (crew cards, run-tracker grid, drag-and-drop, multiple routes, SQLite via a server). Same cyberpunk theme, opposite tech needs — the shared aesthetic should not pull the stacks together.

**Middle option, if menus get elaborate:** use Svelte purely as a component compiler (`@sveltejs/vite-plugin-svelte`, *not* SvelteKit) for the menu screens while Three.js keeps the canvas. Start vanilla; reach for this only if the menu UI actually becomes painful.

## Core Mechanic

The camera is locked to a per-level spline and advances automatically (the "rail"). The player has no movement control — only aim and fire:

- **Aim:** reticle follows the mouse cursor 1:1.
- **Fire:** left-click fires a hitscan shot at the reticle. Optional hold-to-autofire at a fixed cadence.
- **Reload:** limited magazine; reload on right-click or `R`. (Classic mechanic, modern binding — no off-screen gesture, since players have no light gun.)
- **Damage:** enemies that reach their attack window deal damage to the player if not destroyed in time.

Skill expression comes from target prioritization, accuracy under time pressure, and ammo management.

## Camera / Perspective

- **First-person**, down-the-barrel view. No on-screen avatar.
- Camera position and look-direction are sampled from a Catmull-Rom spline parameter `t ∈ [0,1]`.
- The rail auto-advances `t` at a per-segment speed; designers can slow or pause `t` at set-pieces (e.g. a wave that must be cleared before advancing).

## Levels

Escalating descent into a megacorp — three distinct backdrops so each feels different and difficulty ramps:

### Level 1 — Rain-soaked Street
- Neon signs, market stalls, wet reflective ground.
- Enemies: Street Thug (primary), Drone (introduced late).
- Role: onboarding. Generous timing windows, low enemy density.

### Level 2 — Corporate Tower Interior
- Chrome, glass, lasers, tighter spaces.
- Enemies: Drone, Security Bot (introduced), Sniper/Turret (introduced late).
- Role: mid-difficulty. Combines archetypes; introduces precision and prioritization demands.

### Level 3 — The Breach / Server Core
- Abstract digital-physical space, glitching geometry.
- Enemies: Security Bot, Sniper/Turret, and the Boss.
- Role: climax. Highest density, then the multi-phase boss.

## Enemy Roster

4 archetypes + 1 boss, each testing a different skill. Difficulty ramps by **combining** archetypes, not by inflating health.

| Enemy | Intro | Behavior | Skill tested | HP / weak point |
|-------|-------|----------|--------------|-----------------|
| **Street Thug** | L1 | Slow, charges to melee range, then attacks | Basic reaction | 1 hit |
| **Drone** | L1–L2 | Flying, erratic movement, occasional ranged shot | Tracking aim | 1 hit |
| **Security Bot** | L2–L3 | Armored, advances steadily | Precision | 3 body hits OR 1 weak-point (head/core) hit |
| **Sniper/Turret** | L2–L3 | Stationary, telegraphs a charged shot on a timer | Prioritization | 1 hit, but must be killed before its shot lands |
| **Boss** | L3 | Multi-phase; weak points open and close on a cycle | Everything | Phase-gated; only vulnerable when a weak point is exposed |

### Boss (L3)
- Megacorp core defense. Three phases.
- Each phase exposes a weak point on a timed open/close cycle; damage only registers while exposed.
- Between phases, spawns add-waves (drones, then bots) to split the player's attention.
- **Shader-maximalist, not modeled (locked).** The boss stays primitive geometry but goes all-in on effects the rest of the game doesn't use: a glitching/datamoshing core, volumetric scan beams, screen-distortion on phase transitions, dissolve/reconstruct on the weak points. It feels special because it's *shader-spectacular*, not because it's modeled — which keeps the asset discipline, stays visually coherent with the shader-driven world, and makes "abstract glitching megacorp core" a stronger cyberpunk climax than a literal modeled robot. The special-ness budget goes into reusable effects, not one-off geometry.

## Rail Authoring

- One **Catmull-Rom spline** per level defines the camera path; the camera scrubs `t` from 0→1.
- **Enemy spawns are data-driven**: a per-level spawn table keys waves to `t` thresholds, e.g. `{ t: 0.4, spawn: ["drone","drone","drone"], from: "rooftop" }`.
- This separates **movement** (the spline, authored once) from **encounters** (the spawn table, iterated freely).
- **Set-pieces** (the boss arena, a forced-clear gate) layer on top as special cases that can pause `t`.

## Asset Strategy

Shaders and post-processing over detailed models — cyberpunk is forgiving and this is what keeps a solo build feasible:

- **Geometry:** simple/low-poly, often untextured. Effort goes into reusable shaders and lighting, not per-asset modeling.
- **Neon:** emissive materials + bloom make plain shapes read as detailed.
- **Atmosphere:** fog + darkness hide geometric simplicity and stay on-theme (rainy neon-noir).
- **Enemies:** silhouette-driven — dark shapes against neon backlight.
- **Post stack** supplies ~80% of the look: bloom, chromatic aberration, scanlines/glitch, vignette.

## Scoring & Replay

The arcade loop — moment-to-moment tension plus a between-run hook. Informed by the *Addiction by Design* research (variable reinforcement, flow).

- **Combo multiplier:** builds on consecutive hits; **resets to x1 on a miss or on taking a hit.** This is the core tension engine — every shot matters.
- **Accuracy bonus:** awarded at level end based on hit/shot ratio. Rewards restraint, punishes spray-and-pray.
- **Per-level letter grade — S / A / B / C:** derived from score + accuracy + (optionally) damage taken. The primary replay pull: "I got a B, I know an S is possible" beats chasing a raw number.
- **Local leaderboard:** top runs stored in `localStorage`. No backend, preserves the zero-login promise.

### Grade thresholds (starting point, to tune)

| Grade | Criteria (per level) |
|-------|----------------------|
| **S** | ≥90% accuracy, no damage taken, high combo sustained |
| **A** | ≥80% accuracy, minimal damage |
| **B** | ≥65% accuracy |
| **C** | completed the level |

## Health & Lives

Forgiving-to-complete, strict-to-grade. Death lets casual players see all three levels; mastery (a high grade) means taking no hits. The arcade tension lives in the grade chase, not in dying.

- **Health bar:** 5 segments. Enemy hits remove segments; heavier attacks (boss, charged sniper shots) remove more than one.
- **Checkpoint:** one per level at the midpoint (`t ≈ 0.5`). Reaching it restores health **partially** (not full — keeps tension), e.g. up to 3 of 5 segments.
- **Death:** sends the player to the last checkpoint (level start or midpoint), **not** back to level 1. Respects the player's time.
- **Grade coupling:** damage taken feeds the per-level grade (S = no damage, A = minimal, etc. — see Scoring). Forgiveness for *completing* and punishment for the *grade* are deliberately separated, so casual players finish while score-chasers self-impose the no-hit run.

_(Future option, not v1: a one-life "perfect run" mode for the hardcore.)_

## Audio

Audio is ~half the "juice" of an arcade shooter and reinforces the core combo loop.

### Creative direction
- **Soundtrack:** synthwave / darksynth, one track per level escalating in intensity — moody mid-tempo (street) → tenser (tower) → aggressive darksynth (breach + boss).
- **SFX (matter more than music for feel):** meaty blaster fire, distinct empty-mag click, satisfying reload chunk, enemy-specific hit/death sounds.
- **Combo-tick:** a rising tick that pitches up as the multiplier climbs — audio reinforcement of the combo loop (ties to the *Addiction by Design* reinforcement model).
- **Combo-break:** a sharp, slightly unpleasant thunk on multiplier reset — negative feedback that makes the player not want to miss. **Treated as essential, not nice-to-have.**

### Sourcing & tech (solo-dev realistic)
- **Music:** royalty-free synthwave packs (itch.io / OpenGameArt / licensed) for v1; commissioned/composed is a later upgrade.
- **SFX:** **sfxr/jsfxr** procedural retro-synth for placeholders; curated freesound/commercial packs for hero sounds (fire, reload, explosion).
- **Playback:** **Howler.js** — handles audio sprites, pooling, and browser autoplay-unlock gotchas. The one audio dependency.

## Game Feel ("Juice")

On-rails means the player can't move, so *all* feedback comes from shooting and hitting — juice is make-or-break here. Two global discipline rules govern everything below:

- **Hit-stop only on kills**, never on every hit.
- **Global screen-shake ceiling** — one shared shake system with a strict max so simultaneous events can't stack into motion sickness. (Decided up front, not tuned late.)

**Damage numbers: OFF** — they clutter the neon-noir aesthetic; the hit/kill feedback below carries the "I'm landing shots" signal instead.

### Firing (every shot)
- Neon **muzzle flash** (1–2 frame bloom spike).
- **Reticle kick** — punches outward and recovers.
- **Subtle camera kick** — tiny upward nudge, fast recovery (restrained; it's on-rails).
- Optional small **energy/shell ejection** particle.

### Hitting an enemy
- **Flash-on-hit** — enemy blasts white/bright-neon for 2–3 frames. The primary "I hit it" signal.
- **Hit-spark** at contact; **weak-point hits get a bigger, differently-colored spark** (e.g. gold) so precision reads instantly.
- **Hit-stop** — a few frames of micro-pause **on kills only**. The core of impact weight.

### Killing an enemy
- **Neon particle burst / voxel-shatter** into glowing fragments (no death animations needed — fits the shader-driven look).
- **Glitch/datamosh dissolve** on death, on-theme and cheap.
- **Scaled screen-shake** — none on small kills, tiny on heavies (Security Bot, Sniper), real shake on explosions and boss-phase-ends (within the ceiling).

### Combo (visual half of the core loop — essential)
- Combo counter **scales and pulses** with each hit, brighter/more saturated as it climbs.
- **Escalating screen intensity** at high combos — screen-edge neon glow, mild chromatic-aberration creep, subtle color shift. The screen visibly gets "hotter" as the chain grows.
- **Combo break is violent** — counter shatters, brief color drain, paired with the locked combo-break *thunk*. The drop should sting.

### Taking damage
- **Red vignette flash** + chromatic-aberration spike + sharp screen-shake.
- **Hit-direction indicator** — brief red arc at the screen edge showing the source (enemies attack from off-angles on the rail).

### Global polish
- **Time-scale ramp** (brief slow-mo) on the boss's final kill and on level-complete.

## UI Architecture

### Approach
Single canvas, full-bleed. HUD overlaid in the DOM (or a Three.js orthographic overlay) — minimal, arcade-style.

### HUD elements
- **Reticle** — cursor-locked, changes state on hover-over-enemy and on empty magazine.
- **Health** — segmented bar or pips, top-left.
- **Ammo** — magazine count, bottom-right, with a reload indicator.
- **Combo multiplier** — large, center-or-corner, animates up and visibly "breaks" on reset.
- **Score** — running total, top-right.
- **Level / progress** — subtle `t` progress indicator and level name.

### Screens
- **Title** — start, how-to-play, best grades per level.
- **Gameplay** — the canvas + HUD.
- **Level-complete** — accuracy, grade, score breakdown, continue.
- **Game-over / run-summary** — final score, per-level grades, local leaderboard, replay.

### Aesthetic
Follows the shared [Cyberpunk Visual Style reference](cyberpunk-style.md) — canonical palette, monospace/uppercase type, and effects vocabulary shared with `neon-breach`. Realized here through Three.js materials/shaders and `EffectComposer` post-processing rather than CSS.

- Dark `#0a0a0f` base lit almost entirely by emissive neon; heavy bloom and glitch.
- Monospace/uppercase HUD type, letter-spacing, scanline overlay — the cyberpunk terminal look.

## Open Questions

_All major design questions resolved. Remaining items are tuning-and-content work for the build phase: exact enemy timing windows, spawn-table pacing per level, grade thresholds, boss phase cycles, and audio asset selection._

## Out of Scope for v1

- Player movement / free-look (it's on-rails by definition)
- Multiplayer
- Authentication / accounts / server-side leaderboards
- Mobile / touch controls (desktop mouse only)
- Weapon variety / upgrades (single weapon, single fire mode + reload)
- Branching paths (single linear spline per level)
- Cutscenes / voiced narrative
