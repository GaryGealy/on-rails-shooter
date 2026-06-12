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
