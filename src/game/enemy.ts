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
  private coreMesh: THREE.Mesh;
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
    this.coreMesh = core;
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
    if (dir.lengthSq() >= 0.0001) {
      dir.normalize();
      this.group.position.copy(playerPos).add(dir.multiplyScalar(this.brain.distance));
      this.group.position.y = 0;
      this.group.lookAt(playerPos.x, 0, playerPos.z);
    }

    // Windup telegraph: core pulses toward white-hot.
    const w = this.brain.windupProgress;
    this.coreMat.color.setHex(CORE_COLOR).lerp(new THREE.Color(0xffffff), w * 0.8);
    this.coreMesh.scale.setScalar(1 + w * 1.5);

    return result;
  }

  kill(): void {
    this.brain.kill();
    this.flashLeft = FLASH_DURATION;
    // Flash-on-hit: whole silhouette blasts white for a few frames.
    this.bodyMat.color.setHex(0xffffff);
    this.bodyMat.emissive.setHex(0xffffff);
    this.coreMat.color.setHex(0xffffff);
  }

  /** World position of the core — where death bursts spawn. */
  corePosition(target: THREE.Vector3): THREE.Vector3 {
    return target.copy(this.group.position).setY(1.1);
  }
}
