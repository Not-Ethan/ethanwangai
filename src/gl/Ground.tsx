'use client';
// The paper ground (design §6, Ground): a 200 × 200 plane that shows only the shadows cast onto it, at 0.22 (light) /
// 0.5 (dark) opacity, plus a radial contact darkening under each machine so the bench sits on the paper even on
// phone, where there is no shadow map. A 1-bit dither keeps the soft falloffs from banding. No distance fade.
// Both are drawn in the palette's shadow tone (design §7: shadow = ground shadow tone): the material's color IS the
// registry's uShadow Color object, so the 300 ms palette lerp (applyPalette, in place) reaches the ground with no
// per-frame copy of ours; three copies material.color into the program's color uniform on each draw.
// uContact is built once from the layout and never written again: it is not on BenchUniforms and nothing per frame
// reads it. Scene.tsx mounts <Ground uniforms={u} tier={tier} result={result} />.
import { useEffect, useMemo } from 'react';
import type {} from '@react-three/fiber';
import * as THREE from 'three';
import { MACHINE_COUNT, type LayoutResult, type MachineSummary, type Tier } from '@/bench/types';
import type { ThemeName } from '@/theme/palettes';
import { splice, spliceAfter } from '@/gl/shaders/splice';
import type { BenchUniforms } from './material/uniforms';

export const GROUND_SIZE = 200;
export const GROUND_OPACITY: Record<ThemeName, number> = { light: 0.22, dark: 0.5 };
export const CONTACT_STRENGTH = 0.12;
/** Radius floor, so an empty machine (the visitor before a sentence is typed) never divides by zero in the shader. */
const CONTACT_MIN_RADIUS = 1e-3;

export const GROUND_VERTEX_DECL = 'varying vec2 vWorldXZ;';
/** After <begin_vertex>. Computed here rather than read from worldPosition, which three declares only under USE_SHADOWMAP (absent on phone). */
export const GROUND_VERTEX_WORLD = 'vWorldXZ = (modelMatrix * vec4(transformed, 1.0)).xz;';
export const GROUND_FRAGMENT_DECL = `varying vec2 vWorldXZ;\nuniform vec4 uContact[${MACHINE_COUNT}];`;
/** Replaces ShadowMaterial's output line: shadow mask plus contact darkening, capped at 1, then the dither. */
export const GROUND_FRAGMENT_OUTPUT = `float contact = 0.0;
for (int i = 0; i < ${MACHINE_COUNT}; i++) { vec2 d = vWorldXZ - uContact[i].xy; contact += uContact[i].w * exp(-dot(d, d) / (uContact[i].z * uContact[i].z)); }
float dither = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
gl_FragColor = vec4(color, min(1.0, opacity * (1.0 - getShadowMask()) + contact) + dither);`;

/** Three's own output line in ShaderLib.shadow, the one the patch replaces. */
const SHADOW_OUTPUT = 'gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );';

/** One vec4 per machine: (foot x, foot z, half the footprint diagonal, 0.12). An empty machine contributes nothing. */
export function contactFromMachines(machines: MachineSummary[]): THREE.Vector4[] {
  return Array.from({ length: MACHINE_COUNT }, (_, i) => {
    const m = machines[i];
    if (m.count === 0) return new THREE.Vector4(0, 0, CONTACT_MIN_RADIUS, 0);
    const radius = Math.max(0.5 * Math.hypot(m.max[0] - m.min[0], m.max[2] - m.min[2]), CONTACT_MIN_RADIUS);
    return new THREE.Vector4(m.foot[0], m.foot[2], radius, CONTACT_STRENGTH);
  });
}

/**
 * A ShadowMaterial in the palette's shadow tone, patched with contact darkening and the dither. `shadow` is uShadow's
 * own Color and `contact` the layout's vec4s; both are held by reference and read on every draw.
 */
export function createGroundMaterial(contact: THREE.Vector4[], shadow: THREE.Color): THREE.ShadowMaterial {
  const mat = new THREE.ShadowMaterial();
  mat.color = shadow;   // the object itself, not color.set(): the palette lerp writes this Color in place
  mat.customProgramCacheKey = () => 'dbso-ground-v1';
  mat.onBeforeCompile = (shader) => {
    const vert = spliceAfter(shader.vertexShader, '#include <common>', GROUND_VERTEX_DECL);
    shader.vertexShader = spliceAfter(vert, '#include <begin_vertex>', GROUND_VERTEX_WORLD);
    const frag = spliceAfter(shader.fragmentShader, '#include <common>', GROUND_FRAGMENT_DECL);
    shader.fragmentShader = splice(frag, SHADOW_OUTPUT, GROUND_FRAGMENT_OUTPUT);
    shader.uniforms.uContact = { value: contact };
  };
  return mat;
}

function readTheme(): ThemeName {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

/** Sets the ground opacity for the current theme now and on every `themechange` ThemeProvider dispatches (data-theme is set before it fires); returns the unsubscribe. */
export function followTheme(material: THREE.Material): () => void {
  const apply = () => { material.opacity = GROUND_OPACITY[readTheme()]; };
  apply();
  window.addEventListener('themechange', apply);
  return () => window.removeEventListener('themechange', apply);
}

export function Ground({ uniforms, tier, result }: { uniforms: BenchUniforms; tier: Tier; result: LayoutResult }) {
  const material = useMemo(
    () => createGroundMaterial(contactFromMachines(result.machines), uniforms.uShadow.value),
    [result, uniforms],
  );
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => followTheme(material), [material]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={tier === 'desktop'} material={material}>
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
    </mesh>
  );
}
