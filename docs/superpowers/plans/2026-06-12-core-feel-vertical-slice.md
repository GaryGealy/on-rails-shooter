# Core-Feel Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the core loop feels good — a spline-driven camera ride through a greybox neon street where the player shoots Street Thugs with full hit/combo juice (flash-on-hit, hit-stop on kills, particle bursts, combo multiplier with violent break, screen shake, SFX) before any investment in three levels of content.

**Architecture:** A single Three.js canvas driven by `requestAnimationFrame`. Pure-logic modules (rail parameter, combo/score, magazine, hit-stop time scale, screen-shake ceiling, enemy state machine, spawn table) are framework-free and unit-tested with Vitest. Thin rendering/FX layers consume those modules and are verified manually in the dev server. HUD is vanilla DOM overlaid on the canvas. No web framework, no backend.

**Tech Stack:** TypeScript · Three.js (WebGL, `EffectComposer` + `UnrealBloomPass`) · Vite · Vitest · vanilla DOM/CSS HUD · Web Audio API (procedural sfxr-style placeholder SFX — Howler.js deferred until we load real audio assets) · no persistence in the slice.

**Slice scope (from README):** spline camera + one enemy type (Street Thug) + core hit/combo juice. A ~60-second run: ride the rail, fight spawn-table waves, see RUN COMPLETE with score/accuracy, click to restart.

**Out of slice scope:** levels 2/3, other enemy archetypes, boss, grades, leaderboard, checkpoints/death-respawn (death just restarts the run), title screen, music, chromatic aberration/scanline/glitch passes (bloom + vignette only — enough to validate the look).

---

## File Structure

```
on-rails-shooter/
├── index.html              # canvas + HUD root + crosshair cursor styles
├── package.json
├── tsconfig.json
├── vite.config.ts          # vitest config lives here too
├── src/
│   ├── main.ts             # bootstrap: scene, loop, wiring — no logic
│   ├── style.css           # full-bleed canvas + HUD styles (cyberpunk tokens)
│   ├── core/               # pure logic — every file here has unit tests
│   │   ├── rail.ts         # Rail: t advancement + spline pose sampling
│   │   ├── combo.ts        # ComboTracker: multiplier, score, accuracy
│   │   ├── magazine.ts     # Magazine: ammo, reload timing
│   │   ├── timescale.ts    # HitStop: kill-only micro-pause time scale
│   │   ├── shake.ts        # ScreenShake: trauma model with hard ceiling
│   │   ├── enemy-brain.ts  # ThugBrain: approach→windup→attack FSM
│   │   └── spawner.ts      # SpawnTable: t-keyed wave triggering
│   ├── game/
│   │   ├── enemy.ts        # Thug: mesh + brain + flash-on-hit material
│   │   ├── enemies.ts      # EnemyManager: spawn/update/kill/raycast targets
│   │   └── gunner.ts       # input (mouse NDC, fire, reload) + hitscan
│   ├── world/
│   │   └── street.ts       # greybox rain-street: fog, neon emissives, ground
│   ├── fx/
│   │   ├── sparks.ts       # pooled particle bursts (hit spark, death burst)
│   │   └── muzzle.ts       # muzzle flash point light spike
│   ├── hud/
│   │   └── hud.ts          # DOM HUD: reticle, ammo, score, combo, health, end screen
│   └── audio/
│       └── sfx.ts          # Web Audio procedural SFX (fire, hit, kill, ticks…)
└── tests/
    ├── rail.test.ts
    ├── combo.test.ts
    ├── magazine.test.ts
    ├── timescale.test.ts
    ├── shake.test.ts
    ├── enemy-brain.test.ts
    └── spawner.test.ts
```

**Shared conventions locked up front:**

- All update methods take `dt` in **seconds** (real time); modules that should freeze during hit-stop are updated with `dt * hitStop.scale`.
- Palette tokens from `docs/cyberpunk-style.md`: bg `#0a0a0f`, cyan `#00f0ff`, magenta `#ff2bd6`, green `#39ff14`, yellow `#ffe600`, red `#ff1f3d`.
- The world is authored in meters; the rail runs down −Z through the street; player eye height ≈ 1.6.
- Commit after every green test / verified visual; **work on branch `feat/core-feel-slice`, never main.** No Claude attribution in commit messages.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/style.css`, `.gitignore`

- [ ] **Step 1: Create the branch**

```bash
cd /Users/garygealy/repos/company-of-one/on-rails-shooter
git checkout -b feat/core-feel-slice
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "on-rails-shooter",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
npm install three
npm install -D typescript vite vitest @types/three
```

Expected: `node_modules/` created, deps added to package.json with current versions.

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 5: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
} as Parameters<typeof defineConfig>[0]);
```

Note: the `test` key is Vitest's; the cast keeps `tsc` happy without pulling in `vitest/config` types mismatch. If `vitest` exports `defineConfig` cleanly in the installed version, prefer:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

Try the `vitest/config` form first; fall back only if types fail.

- [ ] **Step 6: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ON-RAILS // SLICE</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <canvas id="game"></canvas>
    <div id="hud"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 7: Create src/style.css**

```css
:root {
  --bg: #0a0a0f;
  --cyan: #00f0ff;
  --magenta: #ff2bd6;
  --green: #39ff14;
  --yellow: #ffe600;
  --red: #ff1f3d;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg);
  font-family: 'Courier New', ui-monospace, monospace;
  cursor: none;
  user-select: none;
}

#game {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

#hud {
  position: fixed;
  inset: 0;
  pointer-events: none;
  color: var(--cyan);
  text-transform: uppercase;
  letter-spacing: 0.15em;
}
```

- [ ] **Step 8: Create src/main.ts (smoke render only)**

```typescript
import * as THREE from 'three';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 1.6, 5);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true }),
);
scene.add(cube);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop((time) => {
  cube.rotation.y = time / 1000;
  renderer.render(scene, camera);
});
```

- [ ] **Step 9: Create .gitignore**

```
node_modules
dist
```

- [ ] **Step 10: Verify dev server renders**

Run: `npm run dev` (background), open http://localhost:5173 — expect a rotating cyan wireframe cube on near-black. Then `npm run build` — expect clean exit.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + TypeScript + Three.js project"
```

---

### Task 2: Rail (spline camera parameter)

The `Rail` owns `t ∈ [0,1]`, advances it at a per-segment speed, supports pausing (for forced-clear gates later), and samples camera pose from a `CatmullRomCurve3`. Look-direction is "down the rail": a point slightly ahead on the curve.

**Files:**
- Create: `src/core/rail.ts`
- Test: `tests/rail.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/rail.test.ts
import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { Rail } from '../src/core/rail';

const POINTS = [
  new Vector3(0, 1.6, 0),
  new Vector3(0, 1.6, -20),
  new Vector3(5, 1.6, -40),
  new Vector3(5, 1.6, -60),
];

describe('Rail', () => {
  it('starts at t=0 and advances by speed * dt', () => {
    const rail = new Rail(POINTS, 0.05); // 5% of the rail per second
    expect(rail.t).toBe(0);
    rail.update(1);
    expect(rail.t).toBeCloseTo(0.05);
  });

  it('clamps t at 1 and reports finished', () => {
    const rail = new Rail(POINTS, 0.5);
    rail.update(10);
    expect(rail.t).toBe(1);
    expect(rail.finished).toBe(true);
  });

  it('does not advance while paused', () => {
    const rail = new Rail(POINTS, 0.1);
    rail.paused = true;
    rail.update(1);
    expect(rail.t).toBe(0);
  });

  it('samples position on the curve', () => {
    const rail = new Rail(POINTS, 0.1);
    const start = rail.position(new Vector3());
    expect(start.x).toBeCloseTo(0);
    expect(start.y).toBeCloseTo(1.6);
    expect(start.z).toBeCloseTo(0);
  });

  it('lookTarget is ahead of position along the rail', () => {
    const rail = new Rail(POINTS, 0.1);
    const pos = rail.position(new Vector3());
    const look = rail.lookTarget(new Vector3());
    expect(look.z).toBeLessThan(pos.z); // rail runs down -Z at t=0
  });

  it('lookTarget stays valid at the end of the rail', () => {
    const rail = new Rail(POINTS, 1);
    rail.update(2); // t = 1
    const look = rail.lookTarget(new Vector3());
    expect(Number.isFinite(look.x)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/rail.test.ts`
Expected: FAIL — cannot resolve `../src/core/rail`.

- [ ] **Step 3: Implement src/core/rail.ts**

```typescript
import { CatmullRomCurve3, Vector3 } from 'three';

const LOOK_AHEAD = 0.02; // t-units ahead for the look target

export class Rail {
  readonly curve: CatmullRomCurve3;
  t = 0;
  paused = false;

  constructor(
    points: Vector3[],
    private speed: number, // fraction of the rail per second
  ) {
    this.curve = new CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  }

  get finished(): boolean {
    return this.t >= 1;
  }

  update(dt: number): void {
    if (this.paused || this.finished) return;
    this.t = Math.min(1, this.t + this.speed * dt);
  }

  position(target: Vector3): Vector3 {
    return this.curve.getPointAt(this.t, target);
  }

  lookTarget(target: Vector3): Vector3 {
    // Sample ahead; at the rail's end, extrapolate along the final tangent
    // so the camera doesn't look at its own position.
    if (this.t >= 1 - LOOK_AHEAD) {
      const tangent = this.curve.getTangentAt(1, target.clone());
      return this.curve.getPointAt(1, target).add(tangent.multiplyScalar(2));
    }
    return this.curve.getPointAt(this.t + LOOK_AHEAD, target);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/rail.test.ts`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/core/rail.ts tests/rail.test.ts
git commit -m "feat: rail spline parameter with pause and pose sampling"
```

---

### Task 3: ComboTracker (score, multiplier, accuracy)

Spec rules: multiplier builds on consecutive hits, **resets to x1 on a miss or on taking a hit**; accuracy = hits/shots; score = sum of (base points × multiplier at time of hit). Multiplier steps every 5 consecutive hits: x1 → x2 → x3 … capped at x8. Events are surfaced via a listener so HUD/audio can react (combo-tick, combo-break).

**Files:**
- Create: `src/core/combo.ts`
- Test: `tests/combo.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/combo.test.ts
import { describe, it, expect } from 'vitest';
import { ComboTracker } from '../src/core/combo';

describe('ComboTracker', () => {
  it('starts at x1 with zero score', () => {
    const c = new ComboTracker();
    expect(c.multiplier).toBe(1);
    expect(c.score).toBe(0);
    expect(c.streak).toBe(0);
  });

  it('scores base points times multiplier on a hit', () => {
    const c = new ComboTracker();
    c.registerHit(100);
    expect(c.score).toBe(100);
    expect(c.streak).toBe(1);
  });

  it('steps the multiplier every 5 consecutive hits, capped at x8', () => {
    const c = new ComboTracker();
    for (let i = 0; i < 5; i++) c.registerHit(100);
    expect(c.multiplier).toBe(2);
    for (let i = 0; i < 50; i++) c.registerHit(100);
    expect(c.multiplier).toBe(8);
  });

  it('resets to x1 on a miss', () => {
    const c = new ComboTracker();
    for (let i = 0; i < 5; i++) c.registerHit(100);
    c.registerMiss();
    expect(c.multiplier).toBe(1);
    expect(c.streak).toBe(0);
  });

  it('resets to x1 on taking damage without counting a shot', () => {
    const c = new ComboTracker();
    for (let i = 0; i < 5; i++) c.registerHit(100);
    c.registerPlayerHit();
    expect(c.multiplier).toBe(1);
    expect(c.shots).toBe(5);
  });

  it('tracks accuracy as hits/shots', () => {
    const c = new ComboTracker();
    c.registerHit(100);
    c.registerHit(100);
    c.registerMiss();
    c.registerMiss();
    expect(c.accuracy).toBeCloseTo(0.5);
  });

  it('accuracy is 1 before any shot (no division by zero)', () => {
    expect(new ComboTracker().accuracy).toBe(1);
  });

  it('emits events for hits, multiplier steps, and breaks', () => {
    const events: string[] = [];
    const c = new ComboTracker((e) => events.push(e));
    for (let i = 0; i < 5; i++) c.registerHit(100);
    c.registerMiss();
    c.registerMiss(); // break only fires when a streak existed
    expect(events).toEqual([
      'hit', 'hit', 'hit', 'hit', 'hit', 'step', 'break',
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/combo.test.ts`
Expected: FAIL — cannot resolve `../src/core/combo`.

- [ ] **Step 3: Implement src/core/combo.ts**

```typescript
export type ComboEvent = 'hit' | 'step' | 'break';

const HITS_PER_STEP = 5;
const MAX_MULTIPLIER = 8;

export class ComboTracker {
  score = 0;
  streak = 0;
  shots = 0;
  hits = 0;

  constructor(private onEvent: (e: ComboEvent) => void = () => {}) {}

  get multiplier(): number {
    return Math.min(MAX_MULTIPLIER, 1 + Math.floor(this.streak / HITS_PER_STEP));
  }

  get accuracy(): number {
    return this.shots === 0 ? 1 : this.hits / this.shots;
  }

  registerHit(basePoints: number): void {
    this.shots++;
    this.hits++;
    const before = this.multiplier;
    this.score += basePoints * before;
    this.streak++;
    this.onEvent('hit');
    if (this.multiplier > before) this.onEvent('step');
  }

  registerMiss(): void {
    this.shots++;
    this.break_();
  }

  registerPlayerHit(): void {
    this.break_();
  }

  private break_(): void {
    if (this.streak > 0) this.onEvent('break');
    this.streak = 0;
  }
}
```

Note on event order: the test expects `step` after the 5th `hit` — `registerHit` emits `hit` first, then checks for a step. The 6th miss emits nothing (streak already 0).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/combo.test.ts`
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add src/core/combo.ts tests/combo.test.ts
git commit -m "feat: combo tracker with multiplier, accuracy, and events"
```

---

### Task 4: Magazine (ammo + reload)

8-round magazine. `tryFire()` returns `'fired' | 'empty' | 'reloading'`. Reload takes 1.2s of game time; firing is blocked during it. Dry-fire emits an `empty` event (distinct click per spec).

**Files:**
- Create: `src/core/magazine.ts`
- Test: `tests/magazine.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/magazine.test.ts
import { describe, it, expect } from 'vitest';
import { Magazine } from '../src/core/magazine';

describe('Magazine', () => {
  it('starts full and decrements on fire', () => {
    const m = new Magazine(8, 1.2);
    expect(m.rounds).toBe(8);
    expect(m.tryFire()).toBe('fired');
    expect(m.rounds).toBe(7);
  });

  it('returns empty when out of rounds', () => {
    const m = new Magazine(1, 1.2);
    m.tryFire();
    expect(m.tryFire()).toBe('empty');
  });

  it('blocks firing while reloading, then refills', () => {
    const m = new Magazine(8, 1.2);
    m.tryFire();
    m.startReload();
    expect(m.reloading).toBe(true);
    expect(m.tryFire()).toBe('reloading');
    m.update(0.6);
    expect(m.reloading).toBe(true);
    m.update(0.6);
    expect(m.reloading).toBe(false);
    expect(m.rounds).toBe(8);
  });

  it('ignores reload when already full or already reloading', () => {
    const m = new Magazine(8, 1.2);
    expect(m.startReload()).toBe(false); // full
    m.tryFire();
    expect(m.startReload()).toBe(true);
    expect(m.startReload()).toBe(false); // already reloading
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/magazine.test.ts`
Expected: FAIL — cannot resolve `../src/core/magazine`.

- [ ] **Step 3: Implement src/core/magazine.ts**

```typescript
export type FireResult = 'fired' | 'empty' | 'reloading';

export class Magazine {
  rounds: number;
  reloading = false;
  private reloadLeft = 0;

  constructor(
    readonly capacity: number,
    private reloadTime: number,
  ) {
    this.rounds = capacity;
  }

  tryFire(): FireResult {
    if (this.reloading) return 'reloading';
    if (this.rounds === 0) return 'empty';
    this.rounds--;
    return 'fired';
  }

  startReload(): boolean {
    if (this.reloading || this.rounds === this.capacity) return false;
    this.reloading = true;
    this.reloadLeft = this.reloadTime;
    return true;
  }

  update(dt: number): void {
    if (!this.reloading) return;
    this.reloadLeft -= dt;
    if (this.reloadLeft <= 0) {
      this.reloading = false;
      this.rounds = this.capacity;
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/magazine.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/core/magazine.ts tests/magazine.test.ts
git commit -m "feat: magazine with reload timing and dry-fire result"
```

---

### Task 5: HitStop + ScreenShake (the two global discipline rules)

Spec locks these up front: hit-stop **only on kills**; one shared shake system with a **hard ceiling** so stacking events can't exceed a max. HitStop dips the global time scale to 0.05 for 0.07s real time. ScreenShake uses a trauma model: events add trauma (clamped to 1), trauma decays linearly, displacement ∝ trauma², capped amplitude.

**Files:**
- Create: `src/core/timescale.ts`, `src/core/shake.ts`
- Test: `tests/timescale.test.ts`, `tests/shake.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/timescale.test.ts
import { describe, it, expect } from 'vitest';
import { HitStop } from '../src/core/timescale';

describe('HitStop', () => {
  it('scale is 1 normally', () => {
    expect(new HitStop().scale).toBe(1);
  });

  it('drops the scale on kill and recovers after the stop duration', () => {
    const h = new HitStop();
    h.onKill();
    expect(h.scale).toBeLessThan(0.1);
    h.update(0.07);
    expect(h.scale).toBe(1);
  });

  it('re-triggering extends rather than stacking', () => {
    const h = new HitStop();
    h.onKill();
    h.update(0.05);
    h.onKill();
    h.update(0.05);
    expect(h.scale).toBeLessThan(0.1); // still stopped
    h.update(0.05);
    expect(h.scale).toBe(1);
  });
});
```

```typescript
// tests/shake.test.ts
import { describe, it, expect } from 'vitest';
import { ScreenShake } from '../src/core/shake';

describe('ScreenShake', () => {
  it('starts with zero offset', () => {
    const s = new ScreenShake(0.15);
    s.update(0.016);
    expect(s.offsetX).toBe(0);
    expect(s.offsetY).toBe(0);
  });

  it('trauma is clamped to 1 no matter how many events stack', () => {
    const s = new ScreenShake(0.15);
    for (let i = 0; i < 20; i++) s.addTrauma(0.5);
    expect(s.trauma).toBe(1);
  });

  it('offset never exceeds the ceiling amplitude', () => {
    const s = new ScreenShake(0.15);
    s.addTrauma(1);
    for (let i = 0; i < 100; i++) {
      s.update(0.001);
      expect(Math.abs(s.offsetX)).toBeLessThanOrEqual(0.15);
      expect(Math.abs(s.offsetY)).toBeLessThanOrEqual(0.15);
    }
  });

  it('trauma decays to zero', () => {
    const s = new ScreenShake(0.15);
    s.addTrauma(1);
    for (let i = 0; i < 200; i++) s.update(0.016);
    expect(s.trauma).toBe(0);
    expect(s.offsetX).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/timescale.test.ts tests/shake.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement src/core/timescale.ts**

```typescript
const STOP_SCALE = 0.05;
const STOP_DURATION = 0.07; // seconds of real time

export class HitStop {
  private remaining = 0;

  get scale(): number {
    return this.remaining > 0 ? STOP_SCALE : 1;
  }

  onKill(): void {
    this.remaining = STOP_DURATION;
  }

  update(realDt: number): void {
    this.remaining = Math.max(0, this.remaining - realDt);
  }
}
```

- [ ] **Step 4: Implement src/core/shake.ts**

```typescript
const DECAY_PER_SECOND = 1.4;

export class ScreenShake {
  trauma = 0;
  offsetX = 0;
  offsetY = 0;
  private phase = 0;

  constructor(private ceiling: number) {} // max offset in world units

  addTrauma(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt: number): void {
    this.trauma = Math.max(0, this.trauma - DECAY_PER_SECOND * dt);
    if (this.trauma === 0) {
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }
    this.phase += dt * 60;
    const amp = this.ceiling * this.trauma * this.trauma;
    // Deterministic pseudo-noise (no Math.random — keeps tests stable)
    this.offsetX = amp * Math.sin(this.phase * 1.3 + 1.7);
    this.offsetY = amp * Math.sin(this.phase * 1.7 + 4.2);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/timescale.test.ts tests/shake.test.ts`
Expected: 7 passed.

- [ ] **Step 6: Commit**

```bash
git add src/core/timescale.ts src/core/shake.ts tests/timescale.test.ts tests/shake.test.ts
git commit -m "feat: kill-only hit-stop and ceiling-capped screen shake"
```

---

### Task 6: ThugBrain (enemy state machine)

The Street Thug per spec: slow, charges to melee range, then attacks. Pure FSM over scalar distance-to-player (the rendering layer maps this to world positions): `approach` (closes distance at speed) → `windup` (1.0s telegraph at melee range — the player's last chance) → `attack` (deals 1 damage, then recovers 1.5s and winds up again) → `dead`. 1 HP: any hit kills.

**Files:**
- Create: `src/core/enemy-brain.ts`
- Test: `tests/enemy-brain.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/enemy-brain.test.ts
import { describe, it, expect } from 'vitest';
import { ThugBrain } from '../src/core/enemy-brain';

// distance 10m, speed 4 m/s, melee at 2m, windup 1s, recover 1.5s
const make = () => new ThugBrain({ distance: 10, speed: 4, meleeRange: 2, windup: 1, recover: 1.5 });

describe('ThugBrain', () => {
  it('approaches: closes distance at speed', () => {
    const b = make();
    expect(b.state).toBe('approach');
    b.update(1);
    expect(b.distance).toBeCloseTo(6);
  });

  it('stops at melee range and winds up', () => {
    const b = make();
    b.update(10);
    expect(b.distance).toBeCloseTo(2);
    expect(b.state).toBe('windup');
  });

  it('attacks exactly once when windup elapses', () => {
    const b = make();
    b.update(2); // reach melee at t=2s, windup begins
    expect(b.update(1.0)).toBe('attack'); // windup complete
    expect(b.state).toBe('recover');
    expect(b.update(0.1)).toBe(null);
  });

  it('winds up again after recovering', () => {
    const b = make();
    b.update(2);
    b.update(1.0); // attack
    b.update(1.5); // recover done
    expect(b.state).toBe('windup');
    expect(b.update(1.0)).toBe('attack');
  });

  it('kill() is terminal and stops updates', () => {
    const b = make();
    b.update(1);
    b.kill();
    expect(b.state).toBe('dead');
    const d = b.distance;
    expect(b.update(5)).toBe(null);
    expect(b.distance).toBe(d);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/enemy-brain.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/core/enemy-brain.ts**

```typescript
export type ThugState = 'approach' | 'windup' | 'recover' | 'dead';

export interface ThugConfig {
  distance: number;   // starting distance to the player, meters
  speed: number;      // approach speed, m/s
  meleeRange: number; // distance at which it stops and attacks
  windup: number;     // telegraph duration before the hit lands, seconds
  recover: number;    // pause after an attack, seconds
}

export class ThugBrain {
  state: ThugState = 'approach';
  distance: number;
  private timer = 0;

  constructor(private cfg: ThugConfig) {
    this.distance = cfg.distance;
  }

  /** Advance the FSM. Returns 'attack' on the frame an attack lands, else null. */
  update(dt: number): 'attack' | null {
    switch (this.state) {
      case 'approach': {
        this.distance = Math.max(this.cfg.meleeRange, this.distance - this.cfg.speed * dt);
        if (this.distance <= this.cfg.meleeRange) {
          this.state = 'windup';
          this.timer = this.cfg.windup;
        }
        return null;
      }
      case 'windup': {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'recover';
          this.timer = this.cfg.recover;
          return 'attack';
        }
        return null;
      }
      case 'recover': {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'windup';
          this.timer = this.cfg.windup;
        }
        return null;
      }
      case 'dead':
        return null;
    }
  }

  kill(): void {
    this.state = 'dead';
  }

  /** 0→1 progress through the windup telegraph (for the visual pulse). */
  get windupProgress(): number {
    if (this.state !== 'windup') return 0;
    return 1 - this.timer / this.cfg.windup;
  }
}
```

Note: in the "stops at melee range" test, `update(10)` overshoots — the `Math.max` clamp plus the immediate state switch makes a single big step land exactly at `meleeRange` and enter `windup`. The windup timer starts on the transition frame and only counts down on subsequent frames, which is what the "attacks exactly once" test asserts (2s to arrive, then a full 1.0s update fires the attack).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/enemy-brain.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/core/enemy-brain.ts tests/enemy-brain.test.ts
git commit -m "feat: thug approach/windup/attack state machine"
```

---

### Task 7: SpawnTable (t-keyed waves)

Data-driven encounters per spec: waves keyed to rail-`t` thresholds. Each entry fires once when `t` crosses it. An entry is a list of spawn descriptors (lateral offset + distance ahead) so a wave can flank.

**Files:**
- Create: `src/core/spawner.ts`
- Test: `tests/spawner.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/spawner.test.ts
import { describe, it, expect } from 'vitest';
import { SpawnTable, type SpawnEntry } from '../src/core/spawner';

const TABLE: SpawnEntry[] = [
  { t: 0.1, spawns: [{ side: -1, ahead: 18 }] },
  { t: 0.3, spawns: [{ side: 1, ahead: 20 }, { side: -1, ahead: 22 }] },
  { t: 0.3, spawns: [{ side: 0, ahead: 25 }] },
];

describe('SpawnTable', () => {
  it('fires nothing before the first threshold', () => {
    const s = new SpawnTable(TABLE);
    expect(s.collect(0.05)).toEqual([]);
  });

  it('fires an entry once when t crosses its threshold', () => {
    const s = new SpawnTable(TABLE);
    expect(s.collect(0.15)).toHaveLength(1);
    expect(s.collect(0.2)).toEqual([]); // not re-fired
  });

  it('fires multiple entries crossed in one step, in order', () => {
    const s = new SpawnTable(TABLE);
    const spawned = s.collect(0.5);
    expect(spawned).toHaveLength(4);
    expect(spawned[0].side).toBe(-1);
  });

  it('reports done when all entries have fired', () => {
    const s = new SpawnTable(TABLE);
    expect(s.done).toBe(false);
    s.collect(1);
    expect(s.done).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/spawner.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/core/spawner.ts**

```typescript
export interface SpawnPoint {
  side: -1 | 0 | 1; // left / center / right of the rail
  ahead: number;    // meters ahead of the camera along the rail
}

export interface SpawnEntry {
  t: number;
  spawns: SpawnPoint[];
}

export class SpawnTable {
  private fired: boolean[];

  constructor(private entries: SpawnEntry[]) {
    this.fired = entries.map(() => false);
  }

  get done(): boolean {
    return this.fired.every(Boolean);
  }

  /** Returns all spawn points whose entry threshold t has now been crossed. */
  collect(t: number): SpawnPoint[] {
    const out: SpawnPoint[] = [];
    this.entries.forEach((entry, i) => {
      if (!this.fired[i] && t >= entry.t) {
        this.fired[i] = true;
        out.push(...entry.spawns);
      }
    });
    return out;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/spawner.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/core/spawner.ts tests/spawner.test.ts
git commit -m "feat: t-keyed spawn table with fire-once entries"
```

---

### Task 8: Greybox neon street + camera riding the rail

Visual task — no unit tests; verified in the dev server. Build the asset-strategy look with primitives only: black ground with a high-gloss reflection stand-in (dark `MeshStandardMaterial`, high roughness contrast comes later from bloom), fog, rows of emissive neon slabs as "signs", dim ambient. Camera rides the Task 2 rail.

**Files:**
- Create: `src/world/street.ts`
- Modify: `src/main.ts` (replace the smoke-test cube)

- [ ] **Step 1: Implement src/world/street.ts**

```typescript
import * as THREE from 'three';

const NEON_COLORS = [0x00f0ff, 0xff2bd6, 0xffe600, 0xff8a00, 0x39ff14];

/** Greybox rain-street: a dark corridor of buildings lit by emissive neon slabs. */
export function buildStreet(scene: THREE.Scene): void {
  scene.background = new THREE.Color(0x0a0a0f);
  scene.fog = new THREE.Fog(0x0a0a0f, 8, 70);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 200),
    new THREE.MeshStandardMaterial({ color: 0x05050a, roughness: 0.2, metalness: 0.8 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -80;
  scene.add(ground);

  scene.add(new THREE.AmbientLight(0x202040, 1.2));

  const buildingMat = new THREE.MeshStandardMaterial({ color: 0x0d0d16, roughness: 0.9 });
  for (let i = 0; i < 24; i++) {
    const z = -6 - i * 7;
    for (const side of [-1, 1] as const) {
      const h = 10 + ((i * 7 + (side + 1) * 13) % 14);
      const building = new THREE.Mesh(new THREE.BoxGeometry(6, h, 6), buildingMat);
      building.position.set(side * (8 + (i % 3)), h / 2, z);
      scene.add(building);

      // Neon sign slab on the street-facing wall
      const color = NEON_COLORS[(i + (side === 1 ? 2 : 0)) % NEON_COLORS.length];
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 1.2 + (i % 3), 2.5),
        new THREE.MeshBasicMaterial({ color }),
      );
      sign.position.set(side * (8 + (i % 3)) - side * 3.2, 3 + (i % 5), z);
      scene.add(sign);

      const light = new THREE.PointLight(color, 12, 14);
      light.position.copy(sign.position).x -= side * 0.6;
      scene.add(light);
    }
  }
}
```

- [ ] **Step 2: Rewrite src/main.ts — camera rides the rail**

```typescript
import * as THREE from 'three';
import { Rail } from './core/rail';
import { buildStreet } from './world/street';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
buildStreet(scene);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);

const RAIL_POINTS = [
  new THREE.Vector3(0, 1.6, 0),
  new THREE.Vector3(-1.5, 1.6, -25),
  new THREE.Vector3(1.5, 1.7, -55),
  new THREE.Vector3(-1, 1.6, -85),
  new THREE.Vector3(0, 1.6, -115),
  new THREE.Vector3(0, 1.6, -140),
];
const rail = new Rail(RAIL_POINTS, 1 / 60); // full rail in ~60s

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
let last = performance.now();

renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  rail.update(dt);
  camera.position.copy(rail.position(camPos));
  camera.lookAt(rail.lookTarget(camLook));

  renderer.render(scene, camera);
});
```

- [ ] **Step 3: Verify in the dev server**

Run: `npm run dev`, open http://localhost:5173.
Expected: a ~60-second glide down a dark corridor of buildings with colored neon slabs drifting past, fog swallowing the far end, gentle weave from the rail's lateral offsets. 60fps (check with browser devtools FPS meter). Then run `npm test` — all prior suites still green — and `npm run build`.

- [ ] **Step 4: Commit**

```bash
git add src/world/street.ts src/main.ts
git commit -m "feat: greybox neon street with camera riding the rail"
```

---

### Task 9: Thug entity + EnemyManager

Wrap `ThugBrain` in a world-space entity. Silhouette-driven look per spec: a dark capsule body with a magenta emissive core that pulses brighter through the windup telegraph (the player's "shoot it NOW" signal). On kill: 3 frames of white flash, then the manager removes it (the death burst comes from Task 10's FX, wired in Task 11).

Position model: each Thug keeps its spawn anchor; every frame it stands on the line from the current camera position toward that anchor, at `brain.distance` meters out. This makes enemies "charge the player" even as the rail moves, with zero pathfinding.

**Files:**
- Create: `src/game/enemy.ts`, `src/game/enemies.ts`

- [ ] **Step 1: Implement src/game/enemy.ts**

```typescript
import * as THREE from 'three';
import { ThugBrain } from '../core/enemy-brain';

const BODY_COLOR = 0x101018;
const CORE_COLOR = 0xff2bd6;
const FLASH_DURATION = 0.07; // seconds of white flash on death

export class Thug {
  readonly group = new THREE.Group();
  readonly brain: ThugBrain;
  readonly hitMesh: THREE.Mesh; // the raycast target
  private bodyMat: THREE.MeshStandardMaterial;
  private coreMat: THREE.MeshBasicMaterial;
  private flashLeft = 0;

  constructor(readonly anchor: THREE.Vector3, distance: number) {
    this.brain = new ThugBrain({
      distance,
      speed: 3,
      meleeRange: 2.5,
      windup: 1.0,
      recover: 1.5,
    });

    this.bodyMat = new THREE.MeshStandardMaterial({ color: BODY_COLOR, roughness: 0.9 });
    this.hitMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.0, 4, 12), this.bodyMat);
    this.hitMesh.position.y = 0.85;
    this.group.add(this.hitMesh);

    this.coreMat = new THREE.MeshBasicMaterial({ color: CORE_COLOR });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), this.coreMat);
    core.position.set(0, 1.1, 0.3);
    this.group.add(core);
  }

  get dead(): boolean {
    return this.brain.state === 'dead';
  }

  /** True once the death flash has played out and the mesh can be removed. */
  get expired(): boolean {
    return this.dead && this.flashLeft <= 0;
  }

  /** Returns 'attack' on the frame this thug lands a hit. */
  update(dt: number, playerPos: THREE.Vector3): 'attack' | null {
    if (this.dead) {
      this.flashLeft -= dt;
      return null;
    }

    const result = this.brain.update(dt);

    // Stand on the camera→anchor line at brain.distance, feet on the ground.
    const dir = this.anchor.clone().sub(playerPos);
    dir.y = 0;
    dir.normalize();
    this.group.position.copy(playerPos).add(dir.multiplyScalar(this.brain.distance));
    this.group.position.y = 0;
    this.group.lookAt(playerPos.x, 0, playerPos.z);

    // Windup telegraph: core pulses toward white-hot.
    const w = this.brain.windupProgress;
    this.coreMat.color.setHex(CORE_COLOR).lerp(new THREE.Color(0xffffff), w * 0.8);
    this.group.children[1].scale.setScalar(1 + w * 1.5);

    return result;
  }

  kill(): void {
    this.brain.kill();
    this.flashLeft = FLASH_DURATION;
    // Flash-on-hit: whole silhouette blasts white for a few frames.
    this.bodyMat.color.setHex(0xffffff);
    this.bodyMat.emissive = new THREE.Color(0xffffff);
    this.coreMat.color.setHex(0xffffff);
  }

  /** World position of the core — where death bursts spawn. */
  corePosition(target: THREE.Vector3): THREE.Vector3 {
    return target.copy(this.group.position).setY(1.1);
  }
}
```

- [ ] **Step 2: Implement src/game/enemies.ts**

```typescript
import * as THREE from 'three';
import { Thug } from './enemy';
import type { SpawnPoint } from '../core/spawner';

export interface EnemyEvents {
  onAttack: () => void;                       // a thug landed a hit on the player
  onDeath: (corePos: THREE.Vector3) => void;  // for the death burst FX
}

const SIDE_OFFSET = 5; // meters left/right of the rail for flanking spawns

export class EnemyManager {
  private thugs: Thug[] = [];
  private tmp = new THREE.Vector3();

  constructor(
    private scene: THREE.Scene,
    private events: EnemyEvents,
  ) {}

  get aliveCount(): number {
    return this.thugs.filter((t) => !t.dead).length;
  }

  /** Raycast targets for the gunner. */
  get hitMeshes(): THREE.Mesh[] {
    return this.thugs.filter((t) => !t.dead).map((t) => t.hitMesh);
  }

  spawn(point: SpawnPoint, playerPos: THREE.Vector3, railDir: THREE.Vector3): void {
    const right = new THREE.Vector3().crossVectors(railDir, new THREE.Vector3(0, 1, 0)).normalize();
    const anchor = playerPos
      .clone()
      .add(railDir.clone().multiplyScalar(point.ahead))
      .add(right.multiplyScalar(point.side * SIDE_OFFSET));
    anchor.y = 0;

    const thug = new Thug(anchor, anchor.clone().sub(playerPos).length());
    this.scene.add(thug.group);
    this.thugs.push(thug);
  }

  update(dt: number, playerPos: THREE.Vector3): void {
    for (const thug of this.thugs) {
      if (thug.update(dt, playerPos) === 'attack') this.events.onAttack();
    }
    // Cull expired (death flash finished)
    this.thugs = this.thugs.filter((t) => {
      if (t.expired) {
        this.scene.remove(t.group);
        return false;
      }
      return true;
    });
  }

  /** Kill the thug owning this mesh. Returns true if it was a live target. */
  killByMesh(mesh: THREE.Object3D): boolean {
    const thug = this.thugs.find((t) => t.hitMesh === mesh && !t.dead);
    if (!thug) return false;
    thug.kill();
    this.events.onDeath(thug.corePosition(this.tmp).clone());
    return true;
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: clean. (Visual verification comes in Task 11 when spawning is wired to the rail.)

- [ ] **Step 4: Commit**

```bash
git add src/game/enemy.ts src/game/enemies.ts
git commit -m "feat: thug entity with telegraph pulse and enemy manager"
```

---

### Task 10: Particle FX (hit sparks, death bursts) + muzzle flash

Pooled `THREE.Points` bursts — the neon shatter from the spec's kill feedback, reused at lower intensity for hit sparks on world geometry (misses that strike scenery still spark, selling the hitscan). Muzzle flash is a camera-attached point light whose intensity spikes and decays.

**Files:**
- Create: `src/fx/sparks.ts`, `src/fx/muzzle.ts`

- [ ] **Step 1: Implement src/fx/sparks.ts**

```typescript
import * as THREE from 'three';

const POOL_SIZE = 12;
const PARTICLES = 26;
const LIFE = 0.45; // seconds

class Burst {
  readonly points: THREE.Points;
  private velocities = new Float32Array(PARTICLES * 3);
  private mat: THREE.PointsMaterial;
  life = 0;

  constructor() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLES * 3), 3));
    this.mat = new THREE.PointsMaterial({
      size: 0.09,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.visible = false;
    this.points.frustumCulled = false;
  }

  fire(origin: THREE.Vector3, color: number, speed: number, seed: number): void {
    const pos = this.points.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < PARTICLES; i++) {
      pos.setXYZ(i, origin.x, origin.y, origin.z);
      // Deterministic-ish spread from the seed; visual randomness is fine here
      const a = (i / PARTICLES) * Math.PI * 2 + seed;
      const b = Math.sin(i * 7.31 + seed) * Math.PI;
      const v = speed * (0.4 + Math.abs(Math.sin(i * 3.7 + seed)) * 0.6);
      this.velocities[i * 3] = Math.cos(a) * Math.cos(b) * v;
      this.velocities[i * 3 + 1] = Math.sin(b) * v * 0.7 + speed * 0.3;
      this.velocities[i * 3 + 2] = Math.sin(a) * Math.cos(b) * v;
    }
    pos.needsUpdate = true;
    this.mat.color.setHex(color);
    this.mat.opacity = 1;
    this.life = LIFE;
    this.points.visible = true;
  }

  update(dt: number): void {
    if (this.life <= 0) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.points.visible = false;
      return;
    }
    const pos = this.points.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < PARTICLES; i++) {
      this.velocities[i * 3 + 1] -= 9 * dt; // gravity
      pos.setXYZ(
        i,
        pos.getX(i) + this.velocities[i * 3] * dt,
        pos.getY(i) + this.velocities[i * 3 + 1] * dt,
        pos.getZ(i) + this.velocities[i * 3 + 2] * dt,
      );
    }
    pos.needsUpdate = true;
    this.mat.opacity = this.life / LIFE;
  }
}

export class SparkSystem {
  private pool: Burst[] = [];
  private next = 0;
  private seed = 0;

  constructor(scene: THREE.Scene) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const b = new Burst();
      this.pool.push(b);
      scene.add(b.points);
    }
  }

  /** Small spark — a shot striking scenery or flesh. */
  hitSpark(at: THREE.Vector3, color = 0x00f0ff): void {
    this.fire(at, color, 3);
  }

  /** Big neon shatter — an enemy kill. */
  deathBurst(at: THREE.Vector3, color = 0xff2bd6): void {
    this.fire(at, color, 7);
  }

  private fire(at: THREE.Vector3, color: number, speed: number): void {
    this.seed = (this.seed + 2.399) % (Math.PI * 2);
    this.pool[this.next].fire(at, color, speed, this.seed);
    this.next = (this.next + 1) % POOL_SIZE;
  }

  update(dt: number): void {
    for (const b of this.pool) b.update(dt);
  }
}
```

- [ ] **Step 2: Implement src/fx/muzzle.ts**

```typescript
import * as THREE from 'three';

const PEAK = 30;
const DECAY = 220; // intensity units per second — 1–2 frame spike per spec

export class MuzzleFlash {
  private light: THREE.PointLight;

  constructor(camera: THREE.Camera) {
    this.light = new THREE.PointLight(0x00f0ff, 0, 6);
    this.light.position.set(0.15, -0.2, -0.8); // just off-center, "down the barrel"
    camera.add(this.light);
  }

  fire(): void {
    this.light.intensity = PEAK;
  }

  update(dt: number): void {
    this.light.intensity = Math.max(0, this.light.intensity - DECAY * dt);
  }
}
```

Note: `camera.add(light)` requires the camera to be in the scene graph — `scene.add(camera)` happens in Task 11's wiring.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/fx/sparks.ts src/fx/muzzle.ts
git commit -m "feat: pooled neon particle bursts and muzzle flash"
```

---

### Task 11: Gunner (hitscan input) + first playable wiring

Wire everything built so far into `main.ts`: spawn table drives thugs, left-click hitscan kills them, misses spark on scenery, hit-stop fires on kills only, combo and magazine track state. After this task the game is playable (ugly HUD comes next).

**Files:**
- Create: `src/game/gunner.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Implement src/game/gunner.ts**

```typescript
import * as THREE from 'three';

export interface GunnerCallbacks {
  onFire: (ndc: THREE.Vector2) => void; // a live round left the barrel
  onEmpty: () => void;                  // dry-fire click
  onReload: () => void;                 // reload actually started
}

export interface FireGate {
  tryFire(): 'fired' | 'empty' | 'reloading';
  startReload(): boolean;
}

/** Mouse input: tracks the reticle in NDC, routes fire/reload through the magazine. */
export class Gunner {
  readonly ndc = new THREE.Vector2(0, 0);

  constructor(magazine: FireGate, cb: GunnerCallbacks) {
    window.addEventListener('pointermove', (e) => {
      this.ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('pointerdown', (e) => {
      if (e.button === 0) {
        const result = magazine.tryFire();
        if (result === 'fired') cb.onFire(this.ndc.clone());
        else if (result === 'empty') cb.onEmpty();
      } else if (e.button === 2) {
        if (magazine.startReload()) cb.onReload();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR' && magazine.startReload()) cb.onReload();
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
```

- [ ] **Step 2: Rewrite src/main.ts — full game wiring**

```typescript
import * as THREE from 'three';
import { Rail } from './core/rail';
import { ComboTracker } from './core/combo';
import { Magazine } from './core/magazine';
import { HitStop } from './core/timescale';
import { ScreenShake } from './core/shake';
import { SpawnTable, type SpawnEntry } from './core/spawner';
import { buildStreet } from './world/street';
import { EnemyManager } from './game/enemies';
import { Gunner } from './game/gunner';
import { SparkSystem } from './fx/sparks';
import { MuzzleFlash } from './fx/muzzle';

// --- Renderer / scene / camera ---
const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
buildStreet(scene);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
scene.add(camera); // so camera-attached lights (muzzle flash) render

// --- Rail ---
const RAIL_POINTS = [
  new THREE.Vector3(0, 1.6, 0),
  new THREE.Vector3(-1.5, 1.6, -25),
  new THREE.Vector3(1.5, 1.7, -55),
  new THREE.Vector3(-1, 1.6, -85),
  new THREE.Vector3(0, 1.6, -115),
  new THREE.Vector3(0, 1.6, -140),
];
const rail = new Rail(RAIL_POINTS, 1 / 60);

// --- Core state ---
const combo = new ComboTracker();
const magazine = new Magazine(8, 1.2);
const hitStop = new HitStop();
const shake = new ScreenShake(0.15);
let health = 5;

// --- Encounters: ramping waves of thugs keyed to rail t ---
const TABLE: SpawnEntry[] = [
  { t: 0.06, spawns: [{ side: 0, ahead: 22 }] },
  { t: 0.18, spawns: [{ side: -1, ahead: 20 }, { side: 1, ahead: 24 }] },
  { t: 0.32, spawns: [{ side: 1, ahead: 18 }] },
  { t: 0.42, spawns: [{ side: -1, ahead: 20 }, { side: 0, ahead: 26 }] },
  { t: 0.55, spawns: [{ side: -1, ahead: 18 }, { side: 1, ahead: 18 }] },
  { t: 0.68, spawns: [{ side: 0, ahead: 22 }, { side: -1, ahead: 26 }, { side: 1, ahead: 26 }] },
  { t: 0.82, spawns: [{ side: -1, ahead: 16 }, { side: 1, ahead: 20 }, { side: 0, ahead: 28 }] },
];
const spawnTable = new SpawnTable(TABLE);

// --- FX ---
const sparks = new SparkSystem(scene);
const muzzle = new MuzzleFlash(camera);

// --- Enemies ---
const enemies = new EnemyManager(scene, {
  onAttack: () => {
    health = Math.max(0, health - 1);
    combo.registerPlayerHit();
    shake.addTrauma(0.5);
  },
  onDeath: (corePos) => {
    sparks.deathBurst(corePos);
    hitStop.onKill();
  },
});

// --- Firing ---
const raycaster = new THREE.Raycaster();
const gunner = new Gunner(magazine, {
  onFire: (ndc) => {
    muzzle.fire();
    raycaster.setFromCamera(ndc, camera);

    const enemyHits = raycaster.intersectObjects(enemies.hitMeshes, false);
    if (enemyHits.length > 0) {
      sparks.hitSpark(enemyHits[0].point, 0xffffff);
      enemies.killByMesh(enemyHits[0].object);
      combo.registerHit(100);
      return;
    }

    combo.registerMiss();
    const worldHits = raycaster.intersectObjects(scene.children, true);
    const point =
      worldHits.length > 0
        ? worldHits[0].point
        : raycaster.ray.at(40, new THREE.Vector3());
    sparks.hitSpark(point);
  },
  onEmpty: () => {},  // SFX in Task 14
  onReload: () => {}, // SFX in Task 14
});
void gunner;

// --- Loop ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
const railDir = new THREE.Vector3();
let last = performance.now();

renderer.setAnimationLoop((now) => {
  const realDt = Math.min(0.05, (now - last) / 1000);
  last = now;

  hitStop.update(realDt);
  shake.update(realDt);
  const dt = realDt * hitStop.scale; // game time freezes during hit-stop

  rail.update(dt);
  rail.position(camPos);
  rail.lookTarget(camLook);

  // Spawning
  railDir.copy(camLook).sub(camPos).normalize();
  for (const point of spawnTable.collect(rail.t)) {
    enemies.spawn(point, camPos, railDir);
  }

  enemies.update(dt, camPos);
  sparks.update(dt);
  muzzle.update(realDt); // muzzle flash decays in real time (it's a 1-frame spike)
  magazine.update(dt);

  camera.position.copy(camPos);
  camera.position.x += shake.offsetX;
  camera.position.y += shake.offsetY;
  camera.lookAt(camLook);

  renderer.render(scene, camera);
});
```

- [ ] **Step 3: Verify playable in the dev server**

Run: `npm run dev`, play a full ride. Check each:
- Thugs spawn ahead/flanking as the rail passes thresholds, charge in, stop close, core pulses ~1s, then (if alive) the screen shakes from the hit.
- Left-click kills a thug: white flash on the body, magenta burst, a visible micro-pause (hit-stop) — and **no** hit-stop when a shot hits scenery.
- Misses spark cyan on buildings/ground.
- 8 shots then clicks do nothing (no flash); `R` or right-click, ~1.2s later firing works again.
- `npm test` still fully green; `npx tsc --noEmit` clean.

- [ ] **Step 4: Commit**

```bash
git add src/game/gunner.ts src/main.ts
git commit -m "feat: hitscan gunner wired to spawns, kills, hit-stop, and sparks"
```

---

### Task 12: HUD (reticle, ammo, score, combo, health, end screens)

DOM overlay, cyberpunk terminal style. The combo counter is the visual half of the core loop: it scales/pulses per hit, saturates as the multiplier climbs, and **shatters violently on break** (scale blowout + color drain). Reticle kicks on fire, turns hollow on empty mag, shows a bar during reload. Damage flashes a red vignette overlay. End states: RUN COMPLETE (rail finished) and FLATLINED (health 0) with score/accuracy, click to restart.

**Files:**
- Create: `src/hud/hud.ts`
- Modify: `src/style.css` (append HUD styles), `src/main.ts` (instantiate + feed the HUD)

- [ ] **Step 1: Implement src/hud/hud.ts**

```typescript
export interface HudState {
  score: number;
  multiplier: number;
  streak: number;
  rounds: number;
  capacity: number;
  reloading: boolean;
  health: number;
  maxHealth: number;
  t: number; // rail progress 0..1
}

export class Hud {
  private root: HTMLElement;
  private reticle: HTMLElement;
  private score: HTMLElement;
  private comboEl: HTMLElement;
  private ammo: HTMLElement;
  private healthEl: HTMLElement;
  private progress: HTMLElement;
  private damageFlash: HTMLElement;
  private endScreen: HTMLElement;
  private kickUntil = 0;

  constructor() {
    this.root = document.querySelector<HTMLElement>('#hud')!;
    this.root.innerHTML = `
      <div class="reticle" id="reticle"></div>
      <div class="score" id="score">0</div>
      <div class="combo" id="combo">x1</div>
      <div class="ammo" id="ammo"></div>
      <div class="health" id="health"></div>
      <div class="progress"><div class="progress-fill" id="progress"></div></div>
      <div class="damage-flash" id="damage-flash"></div>
      <div class="end-screen" id="end-screen"></div>
    `;
    this.reticle = document.getElementById('reticle')!;
    this.score = document.getElementById('score')!;
    this.comboEl = document.getElementById('combo')!;
    this.ammo = document.getElementById('ammo')!;
    this.healthEl = document.getElementById('health')!;
    this.progress = document.getElementById('progress')!;
    this.damageFlash = document.getElementById('damage-flash')!;
    this.endScreen = document.getElementById('end-screen')!;

    window.addEventListener('pointermove', (e) => {
      this.reticle.style.left = `${e.clientX}px`;
      this.reticle.style.top = `${e.clientY}px`;
    });
  }

  update(s: HudState): void {
    this.score.textContent = String(s.score).padStart(6, '0');

    this.comboEl.textContent = `x${s.multiplier}`;
    this.comboEl.style.opacity = s.streak > 0 ? '1' : '0.25';
    // Hotter as it climbs: cyan → magenta
    this.comboEl.style.color = s.multiplier >= 4 ? 'var(--magenta)' : 'var(--cyan)';

    this.ammo.textContent = s.reloading
      ? 'RELOADING…'
      : `${'▮'.repeat(s.rounds)}${'▯'.repeat(s.capacity - s.rounds)}`;
    this.ammo.classList.toggle('empty', !s.reloading && s.rounds === 0);

    this.healthEl.textContent =
      '▮'.repeat(s.health) + '▯'.repeat(s.maxHealth - s.health);
    this.healthEl.classList.toggle('low', s.health <= 2);

    this.progress.style.width = `${s.t * 100}%`;

    this.reticle.classList.toggle('empty', s.rounds === 0 && !s.reloading);
    if (performance.now() > this.kickUntil) this.reticle.classList.remove('kick');
  }

  /** Reticle kick — punches outward and recovers. */
  onFire(): void {
    this.reticle.classList.remove('kick');
    void this.reticle.offsetWidth; // restart the CSS animation
    this.reticle.classList.add('kick');
    this.kickUntil = performance.now() + 120;
  }

  /** Combo pulse per hit — scale bump, restarted every hit. */
  onComboHit(): void {
    this.comboEl.classList.remove('pulse', 'shatter');
    void this.comboEl.offsetWidth;
    this.comboEl.classList.add('pulse');
  }

  /** Violent combo break — blowout + color drain. */
  onComboBreak(): void {
    this.comboEl.classList.remove('pulse', 'shatter');
    void this.comboEl.offsetWidth;
    this.comboEl.classList.add('shatter');
  }

  /** Red vignette flash on taking damage. */
  onDamage(): void {
    this.damageFlash.classList.remove('on');
    void this.damageFlash.offsetWidth;
    this.damageFlash.classList.add('on');
  }

  showEnd(title: string, score: number, accuracy: number): void {
    this.endScreen.innerHTML = `
      <h1>${title}</h1>
      <p>SCORE ${String(score).padStart(6, '0')}</p>
      <p>ACCURACY ${(accuracy * 100).toFixed(0)}%</p>
      <p class="restart">CLICK TO RE-RUN</p>
    `;
    this.endScreen.classList.add('on');
  }
}
```

- [ ] **Step 2: Append HUD styles to src/style.css**

```css
.reticle {
  position: absolute;
  width: 28px;
  height: 28px;
  transform: translate(-50%, -50%);
  border: 2px solid var(--cyan);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--cyan);
  transition: transform 0.08s ease-out;
}
.reticle::after {
  content: '';
  position: absolute;
  inset: 11px;
  background: var(--cyan);
  border-radius: 50%;
}
.reticle.kick { transform: translate(-50%, -50%) scale(1.6); }
.reticle.empty { border-color: var(--red); box-shadow: 0 0 8px var(--red); }
.reticle.empty::after { background: var(--red); }

.score {
  position: absolute;
  top: 24px;
  right: 32px;
  font-size: 28px;
  text-shadow: 0 0 10px var(--cyan);
}

.combo {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 44px;
  font-weight: bold;
  text-shadow: 0 0 14px currentColor;
}
.combo.pulse { animation: combo-pulse 0.18s ease-out; }
.combo.shatter { animation: combo-shatter 0.45s ease-out; }
@keyframes combo-pulse {
  0% { transform: translateX(-50%) scale(1.35); }
  100% { transform: translateX(-50%) scale(1); }
}
@keyframes combo-shatter {
  0% { transform: translateX(-50%) scale(2.4) rotate(-6deg); color: var(--red); filter: saturate(0); }
  60% { color: var(--red); filter: saturate(0); }
  100% { transform: translateX(-50%) scale(1); filter: saturate(1); }
}

.ammo {
  position: absolute;
  bottom: 28px;
  right: 32px;
  font-size: 22px;
  color: var(--yellow);
  text-shadow: 0 0 8px var(--yellow);
}
.ammo.empty { color: var(--red); text-shadow: 0 0 8px var(--red); }

.health {
  position: absolute;
  top: 24px;
  left: 32px;
  font-size: 22px;
  color: var(--green);
  text-shadow: 0 0 8px var(--green);
}
.health.low { color: var(--red); text-shadow: 0 0 8px var(--red); }

.progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: rgba(0, 240, 255, 0.15);
}
.progress-fill { height: 100%; background: var(--cyan); box-shadow: 0 0 6px var(--cyan); }

.damage-flash {
  position: absolute;
  inset: 0;
  opacity: 0;
  background: radial-gradient(ellipse at center, transparent 40%, rgba(255, 31, 61, 0.55) 100%);
}
.damage-flash.on { animation: damage 0.35s ease-out; }
@keyframes damage { 0% { opacity: 1; } 100% { opacity: 0; } }

.end-screen {
  position: absolute;
  inset: 0;
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: rgba(10, 10, 15, 0.82);
  font-size: 22px;
}
.end-screen.on { display: flex; }
.end-screen h1 { font-size: 52px; text-shadow: 0 0 18px var(--cyan); }
.end-screen .restart { margin-top: 24px; color: var(--yellow); animation: blink 1s step-end infinite; }
@keyframes blink { 50% { opacity: 0.2; } }
```

- [ ] **Step 3: Wire the HUD into src/main.ts**

Add the import and instance:

```typescript
import { Hud } from './hud/hud';
// ...after core state:
const hud = new Hud();
const MAX_HEALTH = 5;
let gameOver = false;
```

Route combo events — change the `ComboTracker` construction to:

```typescript
const combo = new ComboTracker((e) => {
  if (e === 'hit') hud.onComboHit();
  if (e === 'break') hud.onComboBreak();
});
```

In the `onAttack` enemy callback add `hud.onDamage();` and the death check; in the gunner's `onFire` callback add `hud.onFire();` as the first line.

At the end of the animation loop (before `renderer.render`), add:

```typescript
  hud.update({
    score: combo.score,
    multiplier: combo.multiplier,
    streak: combo.streak,
    rounds: magazine.rounds,
    capacity: magazine.capacity,
    reloading: magazine.reloading,
    health,
    maxHealth: MAX_HEALTH,
    t: rail.t,
  });

  if (!gameOver) {
    if (health <= 0) {
      gameOver = true;
      hud.showEnd('FLATLINED', combo.score, combo.accuracy);
      window.addEventListener('pointerdown', () => location.reload(), { once: true });
    } else if (rail.finished && enemies.aliveCount === 0) {
      gameOver = true;
      hud.showEnd('RUN COMPLETE', combo.score, combo.accuracy);
      window.addEventListener('pointerdown', () => location.reload(), { once: true });
    }
  }
```

Register the restart listener with a 0.5s delay so the click that killed the last enemy doesn't instantly restart — wrap it:

```typescript
const armRestart = () =>
  setTimeout(
    () => window.addEventListener('pointerdown', () => location.reload(), { once: true }),
    500,
  );
```

…and call `armRestart()` instead of adding the listener inline in both branches.

- [ ] **Step 4: Verify in the dev server**

Run: `npm run dev`. Check each:
- Cyan ring reticle follows the mouse, kicks outward on every shot, turns red when the mag is empty; ammo pips bottom-right, RELOADING… during reload.
- Combo counter pulses on each hit, drops to dim x1 with the shatter animation on a miss; turns magenta at x4+.
- Letting a thug hit you: red vignette flash, screen shake, health pip lost, combo breaks.
- Health 0 → FLATLINED; riding to the end → RUN COMPLETE with score + accuracy; click restarts.
- `npm test` green; `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add src/hud/hud.ts src/style.css src/main.ts
git commit -m "feat: cyberpunk DOM HUD with combo pulse/shatter and end screens"
```

---

### Task 13: Post-processing (bloom + vignette)

The post stack supplies ~80% of the look per spec; the slice takes the two cheapest, highest-payoff passes: `UnrealBloomPass` (makes the neon slabs, muzzle flash, particle bursts, and white death-flash all bloom) and a small custom vignette `ShaderPass`. Chromatic aberration / scanlines / glitch stay out of the slice.

**Files:**
- Create: `src/fx/post.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Implement src/fx/post.ts**

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    strength: { value: 0.55 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float strength;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      color.rgb *= smoothstep(0.85, 0.85 - strength, d);
      gl_FragColor = color;
    }
  `,
};

export function createComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): EffectComposer {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.9,  // strength
    0.5,  // radius
    0.2,  // threshold — low, so emissives bloom hard on the dark scene
  );
  composer.addPass(bloom);

  composer.addPass(new ShaderPass(VignetteShader));
  composer.addPass(new OutputPass());
  return composer;
}
```

- [ ] **Step 2: Wire into src/main.ts**

```typescript
import { createComposer } from './fx/post';
// after renderer/scene/camera setup:
const composer = createComposer(renderer, scene, camera);
```

Replace `renderer.render(scene, camera);` with `composer.render();` and extend the resize handler:

```typescript
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
```

- [ ] **Step 3: Verify in the dev server**

Run: `npm run dev`. Expected: neon signs now glow with halos, muzzle flash visibly blooms the scene for a frame, death bursts read as glowing shatter, corners darkened by the vignette. Frame rate still ~60fps (bloom is the heaviest pass — if it tanks, drop `setPixelRatio` to 1 and note it). `npx tsc --noEmit` clean; `npm run build` clean.

- [ ] **Step 4: Commit**

```bash
git add src/fx/post.ts src/main.ts
git commit -m "feat: bloom and vignette post-processing stack"
```

---

### Task 14: Procedural SFX

Audio is ~half the juice; the **combo-break thunk is locked as essential**. Zero asset files: short sfxr-style synth hits on the Web Audio API (the spec's sanctioned placeholder route — Howler.js arrives only when real assets do). The combo-tick pitches up with the streak, the break is a low sour thunk.

**Files:**
- Create: `src/audio/sfx.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Implement src/audio/sfx.ts**

```typescript
export class Sfx {
  private ctx: AudioContext | null = null;

  /** Call once from a user gesture (first pointerdown) to satisfy autoplay policy. */
  unlock(): void {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private tone(
    freq: number,
    type: OscillatorType,
    duration: number,
    gain: number,
    slideTo?: number,
  ): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  private noise(duration: number, gain: number, filterFreq: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter).connect(g).connect(this.ctx.destination);
    src.start(t);
  }

  fire(): void {
    this.tone(880, 'square', 0.08, 0.18, 110);
    this.noise(0.05, 0.12, 4000);
  }

  empty(): void {
    this.tone(220, 'square', 0.04, 0.12);
  }

  reload(): void {
    this.tone(330, 'square', 0.06, 0.15);
    setTimeout(() => this.tone(520, 'square', 0.08, 0.18), 140);
  }

  /** Rising combo-tick: pitch climbs with the streak. */
  comboTick(streak: number): void {
    this.tone(440 + Math.min(streak, 40) * 28, 'triangle', 0.07, 0.14);
  }

  /** The locked-essential break: a sharp, slightly unpleasant thunk. */
  comboBreak(): void {
    this.tone(160, 'sawtooth', 0.28, 0.3, 55);
    this.noise(0.12, 0.18, 900);
  }

  kill(): void {
    this.noise(0.2, 0.25, 2500);
    this.tone(660, 'square', 0.16, 0.16, 90);
  }

  damage(): void {
    this.tone(110, 'sawtooth', 0.3, 0.3, 60);
  }
}
```

- [ ] **Step 2: Wire into src/main.ts**

```typescript
import { Sfx } from './audio/sfx';
// after core state:
const sfx = new Sfx();
window.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
```

Hook the existing event sites:
- `ComboTracker` callback: on `'hit'` add `sfx.comboTick(combo.streak);`, on `'break'` add `sfx.comboBreak();`.
- Gunner `onFire`: add `sfx.fire();`; `onEmpty`: `sfx.empty();`; `onReload`: `sfx.reload();`.
- Enemy `onDeath`: add `sfx.kill();`; `onAttack`: add `sfx.damage();`.

- [ ] **Step 3: Verify in the dev server**

Run: `npm run dev`. Expected: blaster zap per shot; distinct dry click on empty; two-tone reload chunk; tick rising in pitch as the streak climbs (clearly audible by ~10 streak); a sour thunk paired with the combo shatter on a miss; bigger crunch on kills; low growl when hit. No console errors about AudioContext before the first click.

- [ ] **Step 4: Commit**

```bash
git add src/audio/sfx.ts src/main.ts
git commit -m "feat: procedural web-audio sfx with rising combo tick and break thunk"
```

---

### Task 15: Feel pass + verification + status update

The slice exists to answer one question: **does the loop feel good?** Play it, tune the numbers (they're all named constants), then run the full gate and update the README.

**Files:**
- Modify (tuning only, as needed): `src/main.ts` (rail speed, spawn table), `src/game/enemy.ts` (thug speed/windup), `src/fx/post.ts` (bloom strength), `src/core/shake.ts` (decay), `src/core/combo.ts` (step size)
- Modify: `README.md` (Status section)

- [ ] **Step 1: Play three full runs and tune against this checklist**

- Can a first-timer finish without dying? (Thug windup of 1.0s should make every hit avoidable if you're paying attention.)
- Does an all-kills run feel busy but never unfair? If waves overlap awkwardly, adjust `TABLE` t-values.
- Is hit-stop perceptible but not laggy? (0.07s; try 0.05–0.09.)
- Does the combo break *sting* — visual + thunk landing together?
- 60fps throughout (devtools performance panel) at 1080p.

Adjust constants; keep changes minimal and named.

- [ ] **Step 2: Run the full verification gate**

```bash
npm test          # all suites green
npx tsc --noEmit  # clean
npm run build     # clean production build
npm run preview   # play the *built* version once end-to-end
```

Expected: everything passes and the preview build plays identically to dev.

- [ ] **Step 3: Update README.md Status section**

Replace the Status body with:

```markdown
**Core-feel vertical slice implemented** (branch `feat/core-feel-slice`): spline rail camera through a greybox neon street, Street Thug waves from a t-keyed spawn table, hitscan fire/reload, combo multiplier with break, hit-stop on kills, ceiling-capped screen shake, particle bursts, bloom + vignette post, DOM HUD, procedural SFX. Run `npm install && npm run dev`.

Next: validate the feel, then decide whether to invest in the full three-level build (remaining enemy archetypes, boss, grades, leaderboard, real audio).
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: feel-pass tuning and README status for the vertical slice"
```

Then use the superpowers:finishing-a-development-branch skill to decide merge/PR.

---

## Self-Review Notes (already applied)

- **Spec coverage check** against the slice definition (README: "spline camera + one enemy type + core hit/combo juice"): rail ✓ (Task 2, 8), one enemy ✓ (Tasks 6, 9), juice — muzzle flash ✓, reticle kick ✓, flash-on-hit ✓ (white-out on kill; thug is 1HP so hit=kill), hit-spark ✓, hit-stop kills-only ✓, death burst ✓, shake ceiling ✓, combo pulse/escalation/violent break ✓, damage vignette + shake ✓, combo-tick & combo-break audio ✓ (locked essential). Deliberately deferred from the full spec (documented in scope): camera kick on fire, hit-direction indicator, time-scale ramp on level-complete, hold-to-autofire — none are needed to validate the loop; fold into the full build.
- **Consistency:** `ComboTracker` events `'hit' | 'step' | 'break'` are consumed in Tasks 12 and 14; `Magazine.capacity` is public readonly (HUD reads it); `EnemyManager.aliveCount`/`hitMeshes`/`killByMesh` match Task 11's usage; `Hud.onFire/onComboHit/onComboBreak/onDamage/showEnd` match the wiring steps.
- **Known wart accepted:** restarting via `location.reload()` is the entire game-state reset — correct for a slice, replaced by a real state machine in the full build.





