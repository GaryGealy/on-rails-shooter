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
