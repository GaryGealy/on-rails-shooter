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
