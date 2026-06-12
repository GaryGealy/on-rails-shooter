# Cyberpunk Rail Shooter

**Status**: exploring
**Tags**: gaming, digital-game, browser-game, game-design, cyberpunk, rail-shooter, arcade, light-gun, casual-gamers, arcade-fans, nostalgia, replayability, engagement

## Problem

Classic arcade on-rails shooters (Time Crisis, House of the Dead) are effectively dead as a form — locked to defunct arcade cabinets or console light-gun peripherals nobody owns. There's no friction-free way to get that quick, intense arcade shooting-gallery experience today.

## Hypothesis

A tight, 3-level on-rails shooter built with web tech can deliver the arcade light-gun thrill in the browser with zero install friction — mouse-as-light-gun is a natural fit, and a cyberpunk setting gives strong visual identity on a small asset budget (neon, silhouettes, glitch effects).

## Target Users

- Nostalgic arcade fans who remember light-gun cabinets
- Casual web gamers looking for a 10–15 minute session
- Itch.io / web-game communities

## Success Criteria

- Three complete, distinct levels playable start-to-finish in a desktop browser
- A full run takes 10–15 minutes and players voluntarily replay for score
- Runs at 60fps on mid-range hardware with no install or login

## Open Questions

_The original tech/controls/rail/asset/scoring questions are now resolved — see Design Decisions below. Remaining:_

- Health/lives model — how forgiving? Checkpoints mid-level, or run-from-the-top?
- Audio direction — synthwave soundtrack, hit/reload SFX. Where do the assets come from?
- Whether to budget one modeled hero asset for the L3 boss (the noted exception to the shaders-over-models strategy).
- Shared cyberpunk art-direction note with `neon-breach` (palette, type, glitch effects) so the theme work is done once.

## Design Decisions

- **Tech stack (locked)** — Three.js. On-rails means we need depth without physics/free movement; Three.js has the best-trodden path for the cyberpunk post stack (bloom, glitch, chromatic aberration). Asset cost stays manageable because the aesthetic rewards cheap geometry + expensive shaders.
- **Camera/perspective (locked)** — **first-person** light-gun style (Time Crisis / House of the Dead). The player sees down the barrel; a reticle follows the cursor and the rail moves the camera through each scene. No on-screen avatar.
- **Controls (locked)** — pure mouse aim: reticle follows the cursor, left-click to fire. Keep the classic limited-magazine reload mechanic, but bound to right-click / `R` rather than a physical off-screen gesture. Zero learning curve, fits the 10–15 min casual session.
- **Rail authoring (locked)** — spline-based camera path + data-driven enemy spawns. A Catmull-Rom spline per level defines the rail; the camera scrubs a parameter `t` from 0→1. Enemy waves trigger at `t` thresholds from a tunable spawn table, separating movement (authored once) from encounters (iterated freely). Hand-scripted set-pieces (e.g. the L3 boss arena) layer on top as special cases.
- **Asset strategy (locked)** — shaders and post-processing over detailed models. Simple/low-poly (often untextured) geometry carried by emissive materials + bloom; fog and darkness hide simplicity and stay on-theme; the post stack (bloom, chromatic aberration, scanlines/glitch, vignette) supplies ~80% of the look; enemies are silhouette-driven dark shapes against neon. Keeps a solo Three.js build feasible — effort goes into reusable shaders/lighting, not per-asset modeling. (Possible exception to revisit: a modeled hero asset for the L3 boss.)
- **Scoring / replay (locked)** — combo multiplier that builds on consecutive hits and resets on a miss or a hit taken (the core tension/flow loop); end-of-level accuracy bonus (rewards restraint); per-level letter grade S/A/B/C (the "one more run" hook — clearer pull than a raw number); local leaderboard via `localStorage` (no backend, preserves the zero-login promise). Informed by the *Addiction by Design* research on variable reinforcement and flow.
- **Level arc (locked)** — escalating descent into a megacorp, three distinct backdrops:
  1. **Rain-soaked street** — neon signs, market stalls, low-level thugs/drones. Eases the player in.
  2. **Corporate tower interior** — chrome, security bots, glass and lasers. Tighter spaces, mid difficulty.
  3. **The breach / server core** — abstract digital-physical space, glitching geometry, the boss. Climax.

- **Enemy roster (locked)** — 4 archetypes + 1 boss, each testing a different skill:
  1. **Street thug** (L1) — slow, charges to melee range. Tests basic reaction.
  2. **Drone** (L1–L2) — flying, erratic, fires occasionally. Tests tracking aim.
  3. **Security bot** (L2–L3) — armored, needs multiple hits or a weak-point shot. Tests precision.
  4. **Sniper/turret** (L2–L3) — stationary, telegraphs a charged shot the player must destroy in time. Tests prioritization.
  5. **Boss** (L3) — megacorp core defense, multi-phase, weak points that open and close.

  Difficulty ramps by *combining* archetypes, not by inflating health.

## Notes

**Design spec:** [design-spec.md](design-spec.md) · **Visual style:** [cyberpunk-style.md](cyberpunk-style.md)

<!-- Add any rough thoughts, links, or context here -->

Related research: *Addiction by Design* (behavioral reinforcement loops, flow, engagement) — relevant to the arcade scoring/replay hooks. Summary lives in the originating idea-forge repo.

Origin: captured and designed in the `idea-forge` lab as `cyberpunk-rail-shooter`; this repo is the build home. Shares its cyberpunk visual language with the `neon-breach` project (see cyberpunk-style.md).
