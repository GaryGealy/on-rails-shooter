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
