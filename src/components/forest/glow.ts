import * as THREE from "three";

// Soft, round, additive points used for both pollen motes and fireflies.
// Motion (sway / bob / twinkle) happens entirely on the GPU for performance.

export const glowVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uSway;
  uniform float uBob;
  attribute float aSeed;
  attribute float aScale;
  varying float vTwinkle;

  void main() {
    vec3 p = position;
    float s = aSeed * 6.2831853;
    p.x += sin(uTime * 0.35 + s) * uSway;
    p.z += cos(uTime * 0.28 + s * 1.3) * uSway;
    p.y += sin(uTime * 0.5 + s * 2.1) * uBob;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vTwinkle = 0.55 + 0.45 * sin(uTime * 1.8 + s * 3.0);
    gl_PointSize = uSize * aScale * uPixelRatio * (200.0 / -mv.z) * vTwinkle;
    gl_Position = projectionMatrix * mv;
  }
`;

export const glowFragment = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vTwinkle;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    a = pow(a, 1.6);
    gl_FragColor = vec4(uColor, a * uOpacity * vTwinkle);
  }
`;

export function makeGlowUniforms(
  color: string,
  opts: { size: number; sway: number; bob: number }
) {
  return {
    uTime: { value: 0 },
    uSize: { value: opts.size },
    uPixelRatio: {
      value:
        typeof window !== "undefined"
          ? Math.min(window.devicePixelRatio, 2)
          : 1,
    },
    uSway: { value: opts.sway },
    uBob: { value: opts.bob },
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: 0 },
  };
}

/** Build the geometry for a cloud of glow points within a box volume. */
export function makeGlowGeometry(
  count: number,
  box: { x: number; yMin: number; yMax: number; z: number }
) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const scales = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * box.x * 2;
    positions[i * 3 + 1] = box.yMin + Math.random() * (box.yMax - box.yMin);
    positions[i * 3 + 2] = -Math.random() * box.z + 4;
    seeds[i] = Math.random();
    scales[i] = 0.5 + Math.random() * 1.2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
  return geo;
}
