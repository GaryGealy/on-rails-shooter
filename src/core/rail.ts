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
