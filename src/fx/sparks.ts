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
