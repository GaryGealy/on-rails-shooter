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
      color.rgb *= 1.0 - smoothstep(0.85 - strength, 0.85, d);
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
