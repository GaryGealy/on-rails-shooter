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
