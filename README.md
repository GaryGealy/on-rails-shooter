# On-Rails Shooter

A browser-based, first-person on-rails light-gun shooter with a cyberpunk theme — a three-level descent into a megacorp (street → tower → breach). Built on Three.js + TypeScript. Zero install, zero login, ~10–15 min per run.

Designed in the `idea-forge` lab (as `cyberpunk-rail-shooter`); this repo is the build home.

## Docs

- [`docs/concept.md`](docs/concept.md) — the originating idea: problem, hypothesis, target users, locked design decisions
- [`docs/design-spec.md`](docs/design-spec.md) — full design spec (mechanics, levels, enemies, scoring, health, audio, game feel, UI, tech stack)
- [`docs/cyberpunk-style.md`](docs/cyberpunk-style.md) — shared cyberpunk visual style (palette, type, effects), also used by the `neon-breach` project

## Status

**Core-feel vertical slice implemented** (branch `feat/core-feel-slice`): spline rail camera through a greybox neon street, Street Thug waves from a t-keyed spawn table, hitscan fire/reload, combo multiplier with break, hit-stop on kills, ceiling-capped screen shake, particle bursts, bloom + vignette post, DOM HUD, procedural SFX. Run `npm install && npm run dev`.

Next: validate the feel, then decide whether to invest in the full three-level build (remaining enemy archetypes, boss, grades, leaderboard, real audio).

## Stack (planned)

TypeScript · Three.js (WebGL) · Vite · vanilla DOM/CSS HUD · Howler.js (audio) · `localStorage` persistence · no web framework.
