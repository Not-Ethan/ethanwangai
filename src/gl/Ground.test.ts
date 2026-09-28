import { describe, it, expect, afterEach, vi, expectTypeOf } from 'vitest';
import { act, createElement } from 'react';
import * as THREE from 'three';
import { createRoot, extend } from '@react-three/fiber';
import { MACHINE, MACHINE_COUNT, type LayoutResult, type MachineSummary, type Tier } from '@/bench/types';
import { buildBench } from '@/bench/counts';
import { PALETTES, type ThemeName } from '@/theme/palettes';
import { applyPalette, createUniforms, hexToColor, type BenchUniforms } from '@/gl/material/uniforms';
import {
  Ground, contactFromMachines, createGroundMaterial, followTheme, CONTACT_STRENGTH, GROUND_OPACITY, GROUND_SIZE,
  GROUND_VERTEX_DECL, GROUND_VERTEX_WORLD, GROUND_FRAGMENT_DECL, GROUND_FRAGMENT_OUTPUT,
} from './Ground';

/** Runs the material's onBeforeCompile against three's own ShadowMaterial sources, as WebGLPrograms would, without a GL context. */
function compileGround(mat: THREE.Material): THREE.WebGLProgramParametersWithUniforms {
  const lib = THREE.ShaderLib.shadow;
  const shader = {
    vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader, uniforms: THREE.UniformsUtils.clone(lib.uniforms),
  } as unknown as THREE.WebGLProgramParametersWithUniforms;
  mat.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
  return shader;
}

const count = (src: string, needle: string) => src.split(needle).length - 1;
function expectOrdered(src: string, needles: string[], label: string): void {
  let last = -1;
  for (const n of needles) {
    const at = src.indexOf(n);
    expect(at, `${label}: ${n.slice(0, 40)}`).toBeGreaterThan(last);
    last = at;
  }
}

function summary(id: number, min: [number, number, number], max: [number, number, number], count = 10): MachineSummary {
  return { id: id as MachineSummary['id'], count, min, max, foot: [(min[0] + max[0]) / 2, 0, max[2]], centroid: [0, 0, 0] };
}

// The DOM ThemeProvider drives: data-theme on <html>, then a `themechange` event on window. Stubbed here for node.
let theme: ThemeName = 'light';
const win = new EventTarget();
function stubDom(initial: ThemeName): void {
  theme = initial;
  vi.stubGlobal('document', { documentElement: { getAttribute: (name: string) => (name === 'data-theme' ? theme : null) } });
  vi.stubGlobal('window', win);
}
function switchTheme(next: ThemeName): void {
  theme = next;
  win.dispatchEvent(new CustomEvent('themechange', { detail: next }));
}
afterEach(() => vi.unstubAllGlobals());

describe('contactFromMachines', () => {
  const machines = Array.from({ length: MACHINE_COUNT }, (_, i) => summary(i, [i, 0, 0], [i + 1, 1, 1], 1));
  machines[MACHINE.quoter] = summary(MACHINE.quoter, [-6, 0, -6], [6, 0.9, 2]);
  machines[MACHINE.visitor] = summary(MACHINE.visitor, [6.2, 0, 6.6], [6.2, 0, 6.6], 0);

  it('emits one vec4 per machine: foot x, foot z, half the footprint diagonal, strength 0.12', () => {
    const c = contactFromMachines(machines);
    expect(c).toHaveLength(8);
    const q = c[MACHINE.quoter];
    expect(q).toBeInstanceOf(THREE.Vector4);
    expect(q.x).toBe(0);                                   // foot x = mid of −6..6
    expect(q.y).toBe(2);                                   // foot z = front edge (max z)
    expect(q.z).toBeCloseTo(0.5 * Math.hypot(12, 8), 10);  // half the xz diagonal
    expect(q.w).toBe(CONTACT_STRENGTH);
    expect(CONTACT_STRENGTH).toBe(0.12);
  });

  it('gives an empty machine zero strength and a finite, non-zero radius so the shader never divides by zero', () => {
    const v = contactFromMachines(machines)[MACHINE.visitor];
    expect(v.w).toBe(0);
    expect(v.z).toBeGreaterThan(0);
    expect(Number.isFinite(v.z)).toBe(true);
  });

  it('is finite for the real bench layout on both tiers', () => {
    for (const tier of ['desktop', 'phone'] as const) {
      const r = buildBench(tier);
      const c = contactFromMachines(r.machines);
      for (let i = 0; i < MACHINE_COUNT; i++) {
        for (const ch of ['x', 'y', 'z', 'w'] as const) expect(Number.isFinite(c[i][ch]), `${tier} machine ${i}.${ch}`).toBe(true);
        expect(c[i].z, `${tier} machine ${i} radius`).toBeGreaterThan(0);
      }
      // the seven built machines darken; the untyped visitor does not
      for (let i = 0; i < MACHINE.visitor; i++) expect(c[i].w, `${tier} machine ${i}`).toBe(CONTACT_STRENGTH);
      expect(c[MACHINE.visitor].w).toBe(0);
      // the quoter's foot is its front-centre: x at the bed's middle, z at its front edge
      const q = r.machines[MACHINE.quoter];
      expect(c[MACHINE.quoter].x).toBe(q.foot[0]);
      expect(c[MACHINE.quoter].y).toBe(q.foot[2]);
    }
  });
});

describe('createGroundMaterial', () => {
  const contact = contactFromMachines(Array.from({ length: MACHINE_COUNT }, (_, i) => summary(i, [i, 0, 0], [i + 1, 1, 1])));
  const u = createUniforms();
  const mat = createGroundMaterial(contact, u.uShadow.value);
  const s = compileGround(mat);

  it('is a transparent ShadowMaterial keyed as dbso-ground-v1', () => {
    expect(mat).toBeInstanceOf(THREE.ShadowMaterial);
    expect(mat.transparent).toBe(true);
    expect(mat.customProgramCacheKey()).toBe('dbso-ground-v1');
  });

  it('draws in the palette shadow tone: its color IS uShadow\'s Color object and follows the palette lerp with no copy', () => {
    expect(mat.color).toBe(u.uShadow.value);
    expect(mat.color.getHexString()).toBe(hexToColor(PALETTES.light.shadow).getHexString());
    applyPalette(u, PALETTES.light, PALETTES.dark, 1);
    expect(mat.color.getHexString()).toBe(hexToColor(PALETTES.dark.shadow).getHexString());
    expect(mat.color).toBe(u.uShadow.value);
  });

  it('declares vWorldXZ after <common> and writes it from the world position after <begin_vertex>', () => {
    expectOrdered(s.vertexShader, ['#include <common>', GROUND_VERTEX_DECL, 'void main()', '#include <begin_vertex>', GROUND_VERTEX_WORLD, '#include <project_vertex>'], 'vertex');
    expect(count(s.vertexShader, '#include <common>')).toBe(1);
    expect(count(s.vertexShader, '#include <begin_vertex>')).toBe(1);
    expect(GROUND_VERTEX_WORLD).toContain('modelMatrix');
  });

  it('replaces the ShadowMaterial output line with shadow mask + contact darkening + 1-bit dither', () => {
    expect(s.fragmentShader).not.toContain('gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );');
    expectOrdered(s.fragmentShader, ['#include <common>', GROUND_FRAGMENT_DECL, 'void main()', GROUND_FRAGMENT_OUTPUT, '#include <tonemapping_fragment>'], 'fragment');
    expect(count(s.fragmentShader, 'gl_FragColor')).toBe(1);
    expect(GROUND_FRAGMENT_DECL).toContain('uniform vec4 uContact[8];');
    expect(GROUND_FRAGMENT_OUTPUT).toContain('for (int i = 0; i < 8; i++)');
    expect(GROUND_FRAGMENT_OUTPUT).toContain('exp(-dot(d, d) / (uContact[i].z * uContact[i].z))');
    expect(GROUND_FRAGMENT_OUTPUT).toContain('/ 255.0');
    expect(GROUND_FRAGMENT_OUTPUT).toContain('gl_FragColor = vec4(color, min(1.0, opacity * (1.0 - getShadowMask()) + contact) + dither);');
  });

  it('holds uContact by reference next to three\'s own color and opacity uniforms', () => {
    expect(s.uniforms.uContact.value).toBe(contact);
    expect(s.uniforms.color).toBeDefined();
    expect(s.uniforms.opacity).toBeDefined();
  });

  it('throws rather than ship an unpatched program if three\'s output line moves', () => {
    const shader = { vertexShader: THREE.ShaderLib.shadow.vertexShader, fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }', uniforms: {} } as unknown as THREE.WebGLProgramParametersWithUniforms;
    expect(() => mat.onBeforeCompile(shader, {} as THREE.WebGLRenderer)).toThrow(/not in three's shader/);
  });
});

describe('followTheme', () => {
  it('is a 200 × 200 plane at 0.22 opacity in light and 0.5 in dark', () => {
    expect(GROUND_SIZE).toBe(200);
    expect(GROUND_OPACITY).toEqual({ light: 0.22, dark: 0.5 });
  });

  it('reads the mounted theme at once and follows each themechange', () => {
    stubDom('dark');
    const mat = new THREE.ShadowMaterial();
    const off = followTheme(mat);
    expect(mat.opacity).toBe(0.5);
    switchTheme('light');
    expect(mat.opacity).toBe(0.22);
    switchTheme('dark');
    expect(mat.opacity).toBe(0.5);
    off();
  });

  it('stops following once unsubscribed', () => {
    stubDom('light');
    const mat = new THREE.ShadowMaterial();
    const off = followTheme(mat);
    expect(mat.opacity).toBe(0.22);
    off();
    switchTheme('dark');
    expect(mat.opacity).toBe(0.22);
  });
});

// Scene.tsx (Task 2.7) renders exactly `<Ground uniforms={u} tier={tier} result={result} />`. This is that mount, through
// R3F's own reconciler against a renderer stub (no GL context), so the props contract and the hook wiring are exercised on
// real three objects rather than only the pieces.
describe('<Ground uniforms tier result /> mounted through R3F', () => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  extend({ Mesh: THREE.Mesh, PlaneGeometry: THREE.PlaneGeometry });   // Canvas registers all of three on mount; an imperative root registers what Ground renders

  /** The handful of renderer members createRoot().configure touches; nothing is drawn. */
  function rendererStub(): THREE.WebGLRenderer {
    return {
      render() {}, setSize() {}, setPixelRatio() {},
      shadowMap: { enabled: false, type: THREE.PCFShadowMap, needsUpdate: false },
      outputColorSpace: THREE.SRGBColorSpace, toneMapping: THREE.NoToneMapping, domElement: {},
    } as unknown as THREE.WebGLRenderer;
  }

  /** R3F's store news a THREE.Clock per root, which three r185 marks deprecated on the console; only that line is held back. */
  function withoutClockWarning<T>(fn: () => T): T {
    const warn = console.warn;
    const spy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => { if (!String(args[0]).startsWith('THREE.Clock')) warn(...args); });
    try { return fn(); } finally { spy.mockRestore(); }
  }

  type GroundMesh = THREE.Mesh<THREE.PlaneGeometry, THREE.ShadowMaterial>;

  async function mount(tier: Tier, initial: ThemeName) {
    stubDom(initial);
    const uniforms = createUniforms();
    const result = buildBench(tier);
    const root = withoutClockWarning(() => createRoot({} as HTMLCanvasElement));
    await root.configure({ gl: rendererStub(), size: { width: 800, height: 600, top: 0, left: 0 }, dpr: 1, frameloop: 'never' });
    const store = await act(async () => root.render(createElement(Ground, { uniforms, tier, result })));
    const { scene } = store.getState();
    expect(scene.children).toHaveLength(1);
    return { uniforms, result, root, mesh: scene.children[0] as GroundMesh };
  }

  it('takes exactly the props Scene.tsx passes: uniforms, tier, result', () => {
    expectTypeOf<Parameters<typeof Ground>[0]>().toEqualTypeOf<{ uniforms: BenchUniforms; tier: Tier; result: LayoutResult }>();
  });

  it('mounts one 200 × 200 plane lying flat that receives shadows on desktop, carrying the patched material in the shadow tone', async () => {
    const { uniforms, result, root, mesh } = await mount('desktop', 'light');
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.rotation.x).toBeCloseTo(-Math.PI / 2, 12);
    expect(mesh.rotation.y).toBe(0);
    expect(mesh.rotation.z).toBe(0);
    expect(mesh.receiveShadow).toBe(true);
    expect(mesh.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    expect(mesh.geometry.parameters.width).toBe(GROUND_SIZE);
    expect(mesh.geometry.parameters.height).toBe(GROUND_SIZE);
    expect(mesh.material).toBeInstanceOf(THREE.ShadowMaterial);
    expect(mesh.material.customProgramCacheKey()).toBe('dbso-ground-v1');
    expect(mesh.material.color).toBe(uniforms.uShadow.value);
    expect(mesh.material.opacity).toBe(GROUND_OPACITY.light);
    // uContact comes from result.machines, which is why Ground takes the layout and not only the uniforms
    const c = compileGround(mesh.material).uniforms.uContact.value as THREE.Vector4[];
    expect(c).toHaveLength(MACHINE_COUNT);
    expect(c[MACHINE.quoter].x).toBe(result.machines[MACHINE.quoter].foot[0]);
    expect(c[MACHINE.quoter].y).toBe(result.machines[MACHINE.quoter].foot[2]);
    expect(c[MACHINE.quoter].w).toBe(CONTACT_STRENGTH);
    await act(async () => root.unmount());
  });

  it('on phone the plane receives no shadow map, so contact darkening alone grounds the bench', async () => {
    const { root, mesh } = await mount('phone', 'dark');
    expect(mesh.receiveShadow).toBe(false);
    expect(mesh.material.opacity).toBe(GROUND_OPACITY.dark);
    expect(compileGround(mesh.material).uniforms.uContact.value).toHaveLength(MACHINE_COUNT);
    await act(async () => root.unmount());
  });

  it('follows themechange while mounted, then lets go of the listener and disposes the material on unmount', async () => {
    const { root, mesh } = await mount('desktop', 'light');
    expect(mesh.material.opacity).toBe(0.22);
    switchTheme('dark');
    expect(mesh.material.opacity).toBe(0.5);
    const dispose = vi.spyOn(mesh.material, 'dispose');
    await act(async () => root.unmount());
    expect(dispose).toHaveBeenCalledTimes(1);
    switchTheme('light');
    expect(mesh.material.opacity).toBe(0.5);   // unsubscribed: the theme no longer reaches it
  });
});
