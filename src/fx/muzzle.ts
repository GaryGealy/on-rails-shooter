import * as THREE from 'three';

const PEAK = 30;
const DECAY = 900; // intensity units per second — ~1–2 frame bloom spike per spec

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
