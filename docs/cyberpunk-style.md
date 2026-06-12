# Cyberpunk Visual Style — Shared Reference

A shared art-direction reference for IdeaForge's cyberpunk-themed projects, so the visual language is designed once and stays consistent across ideas. This is **visual language only** — palette, type, effects, tone. Layout, mechanics, and project-specific (2D vs 3D) concerns stay in each idea's own spec.

**Used by:**
- [`on-rails-shooter`](design-spec.md) — first-person rail shooter (Three.js, WebGL) — *this repo*
- `neon-breach` — virtual roll-and-write (SvelteKit, DOM/UI) — *separate project*

The two share the look, not the tech — a SvelteKit DOM app and a Three.js canvas game realize these tokens differently (CSS variables vs. material/shader uniforms), but the palette values, type choices, and effect vocabulary are the same.

## Palette

Canonical hex values. The dark base and neon accents come from neon-breach and are promoted here as the shared source of truth.

| Token | Hex | Use |
|-------|-----|-----|
| **Background** | `#0a0a0f` | Near-black base; everything sits on this |
| **Cyan** | `#00f0ff` | UI chrome, primary interactive accent |
| **Magenta** | `#ff2bd6` | Primary "hot" accent / offensive elements |
| **Green** | `#39ff14` | Success, defense, safe states |
| **Yellow** | `#ffe600` | Utility, caution, highlights |
| **Orange** | `#ff8a00` | Payoff, warmth, secondary accent |
| **Red** | `#ff1f3d` | Danger, heat, damage, threat |

_Hex values for the neon accents are representative — tune to taste, but keep both projects pointed at the same set. The background and the cyan/magenta/green/yellow/orange/red roles are the canonical part._

Usage principle: a near-black world lit almost entirely by **emissive neon** — color comes from glowing elements, not lit surfaces. Restraint matters; let darkness dominate so the neon reads.

## Typography

- **Monospace throughout** — terminal/hacker register.
- **UPPERCASE labels** with generous **letter-spacing** for chrome, headers, and HUD readouts.
- Numbers (scores, counts, timers) in the same monospace so they sit in tabular alignment.

## Effects Vocabulary

The shared "how cyberpunk looks for us" toolkit. Each project applies these in its own medium (CSS/canvas filters vs. Three.js post-processing), but the vocabulary is common:

- **Bloom / glow** — emissive elements bleed light. The primary reason simple shapes read as rich.
- **Scanlines** — subtle CRT/terminal overlay.
- **Glitch / datamosh** — block displacement, RGB channel tearing; used for emphasis, transitions, and "digital" spaces.
- **Chromatic aberration** — slight RGB split at edges, strongest under stress/intensity.
- **Vignette** — darkened edges to focus the eye and deepen the noir.

## Tone Words

Neon-noir · rain-slicked · terminal · corporate-dystopia · high-contrast dark · electric.

Keep naming, copy, and mood anchored to these so the projects feel like one universe.
