import { describe, it, expect, vi } from 'vitest';
import { act, createElement } from 'react';
import * as THREE from 'three';
import { createRoot, extend } from '@react-three/fiber';
import { KIND, MACHINE } from '@/bench/types';
import { buildBench } from '@/bench/counts';
import { hashString } from '@/bench/hash';
import { BENCH_SEED_TEXT, PLACEMENT } from '@/bench/bench';
import { POST_H } from '@/bench/configs/balance';
import { OU, generateOU } from '@/bench/ou';
import { QUOTER_BED } from '@/bench/configs/quoter';
import { TIMING } from '@/bench/timing';
import { PALETTES } from '@/theme/palettes';
import { applyPalette, createUniforms, hexToColor, type BenchUniforms } from './material/uniforms';
import { KEY_LIGHT } from './Lights';
import { intro } from './Clocks';
import { bedPitch, createOUTexture, configureUniforms, GLErrorBoundary, PaperBackground, bindPaper, warmUp, CAMERA, BENCH_CENTER, FADE_MS } from './Scene';

// The warm-up (design §11): nothing shows until the fonts are in and every program is compiled; the fade is 200 ms; T0 is its end.
describe('warmUp', () => {
  const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

  function stubs() {
    const log: string[] = [];
    const wrapper = { style: { opacity: '0', transition: '' } } as unknown as HTMLElement;
    const gl = {
      compileAsync: vi.fn(async (scene: THREE.Object3D, camera: THREE.Camera) => { log.push(`compile ${scene.name} ${camera.name}`); return scene; }),
      render: vi.fn(() => { log.push(`render at opacity ${wrapper.style.opacity}`); }),
    } as unknown as THREE.WebGLRenderer;
    const scene = new THREE.Scene();
    scene.name = 'bench';
    const camera = new THREE.PerspectiveCamera();
    camera.name = 'lens';
    return { log, wrapper, gl, scene, camera };
  }

  it('waits for the fonts, compiles the scene, draws one frame still hidden, fades in over 200 ms and only then declares T0', async () => {
    vi.useFakeTimers();
    let fontsReady!: () => void;
    vi.stubGlobal('document', { fonts: { ready: new Promise<void>((resolve) => { fontsReady = resolve; }) } });
    const { log, wrapper, gl, scene, camera } = stubs();
    intro.pending = false;
    try {
      const done = warmUp({ gl, scene, camera }, wrapper);
      await flush();
      expect(log).toEqual([]);                                   // nothing before the fonts
      expect(wrapper.style.opacity).toBe('0');
      fontsReady();
      await flush();
      expect(log).toEqual(['compile bench lens', 'render at opacity 0']);
      expect(gl.render).toHaveBeenCalledTimes(1);
      expect(wrapper.style.transition).toBe(`opacity ${FADE_MS}ms`);
      expect(wrapper.style.opacity).toBe('1');
      expect(FADE_MS).toBe(200);
      expect(intro.pending).toBe(false);
      await vi.advanceTimersByTimeAsync(FADE_MS - 1);
      expect(intro.pending).toBe(false);                         // T0 is the end of the fade, not its start
      await vi.advanceTimersByTimeAsync(1);
      expect(intro.pending).toBe(true);
      await done;
      expect(gl.render).toHaveBeenCalledTimes(1);
    } finally {
      intro.pending = false;
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('tolerates a missing wrapper (the error boundary never mounted the canvas div) and still reaches T0', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('document', { fonts: { ready: Promise.resolve() } });
    const { gl, scene, camera } = stubs();
    intro.pending = false;
    try {
      const done = warmUp({ gl, scene, camera }, null);
      await flush();
      await vi.advanceTimersByTimeAsync(FADE_MS);
      await done;
      expect(intro.pending).toBe(true);
    } finally {
      intro.pending = false;
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});

describe('bedPitch', () => {
  it('is the quoter bed pitch on desktop and double it on phone, matching the columns the config actually laid out', () => {
    expect(bedPitch('desktop')).toBe(QUOTER_BED.pitch);
    expect(bedPitch('desktop')).toBe(0.15);
    expect(bedPitch('phone')).toBe(0.3);
    for (const tier of ['desktop', 'phone'] as const) {
      const cells = buildBench(tier).parts.filter((p) => p.machine === MACHINE.quoter && p.kind === KIND.cell);
      const row0 = cells.filter((p) => p.param[1] === 0).sort((a, b) => a.param[0] - b.param[0]);
      expect(row0[1].position[0] - row0[0].position[0], tier).toBeCloseTo(bedPitch(tier), 9);
    }
  });
});

describe('createOUTexture', () => {
  const seed = hashString(BENCH_SEED_TEXT);
  const tex = createOUTexture();

  it('is a 256 × 2048 RGBA8 DataTexture of the bench-seeded OU paths', () => {
    expect(tex).toBeInstanceOf(THREE.DataTexture);
    expect(tex.image.width).toBe(OU.markets);
    expect(tex.image.height).toBe(OU.steps);
    expect([tex.image.width, tex.image.height]).toEqual([256, 2048]);
    expect(tex.format).toBe(THREE.RGBAFormat);
    expect(tex.type).toBe(THREE.UnsignedByteType);
    const data = tex.image.data as Uint8Array;
    expect(data.length).toBe(OU.markets * OU.steps * 4);
    const expected = generateOU(seed);
    expect(data.length).toBe(expected.length);
    for (const i of [0, 1, 2, 3, 4097, 65536 * 4 + 2, data.length - 1]) expect(data[i], `byte ${i}`).toBe(expected[i]);
  });

  it('filters linearly both ways with no mipmaps and is flagged for upload', () => {
    expect(tex.minFilter).toBe(THREE.LinearFilter);
    expect(tex.magFilter).toBe(THREE.LinearFilter);
    expect(tex.generateMipmaps).toBe(false);
    expect(tex.flipY).toBe(false);   // row s of the data is step s: ouFetch reads v = (s + 0.5) / steps
    expect(tex.version).toBe(1);     // needsUpdate = true
  });

  it('takes another seed for another bench', () => {
    const other = createOUTexture(seed + 1);
    const a = tex.image.data as Uint8Array, b = other.image.data as Uint8Array;
    let differs = false;
    for (let i = 0; i < 4096 && !differs; i++) differs = a[i] !== b[i];
    expect(differs).toBe(true);
  });
});

describe('configureUniforms', () => {
  const desktop = buildBench('desktop');
  const ou = createOUTexture();

  it('sets the tier\'s bed pitch, the unit key direction, the bench centre and the OU texture', () => {
    for (const tier of ['desktop', 'phone'] as const) {
      const u = configureUniforms(createUniforms(), tier, ou);
      expect(u.uPitch.value, tier).toBe(bedPitch(tier));
      const key = new THREE.Vector3(...KEY_LIGHT.position).normalize();
      expect(u.uKeyDir.value.length()).toBeCloseTo(1, 12);
      expect(u.uKeyDir.value.distanceTo(key)).toBeLessThan(1e-12);
      expect(u.uBenchCenter.value.toArray()).toEqual([0, 0, 1]);
      expect(BENCH_CENTER).toEqual([0, 0, 1]);
      expect(u.uOU.value).toBe(ou);
    }
  });

  it('leaves the balance pivot on the post top the registry starts with, (−4.2, 0.9, 4.6), not the machine\'s centroid', () => {
    const u = configureUniforms(createUniforms(), 'desktop', ou);
    const o = PLACEMENT[MACHINE.balance].origin;
    expect(u.uBalancePivot.value.toArray()).toEqual([o[0], POST_H, o[2]]);
    expect(u.uBalancePivot.value.toArray()).toEqual([-4.2, 0.9, 4.6]);
    // the lever sits off the post, so the centroid is not the pivot
    expect(desktop.machines[MACHINE.balance].centroid[0]).not.toBe(o[0]);
    // 0.9 is the config's post height: the tilting rail's centre line in bench space
    const rail = desktop.parts.find((p) => p.machine === MACHINE.balance && p.module === 'rail');
    expect(rail?.kind).toBe(KIND.tilt);
    expect(rail?.position).toEqual([o[0], POST_H, o[2]]);
  });

  it('leaves the registry\'s own constants in place', () => {
    const u = configureUniforms(createUniforms(), 'desktop', ou);
    expect(u.uOUInfo.value.toArray()).toEqual([256, 2048, 48, 8]);
    expect(u.uLock.value.toArray()).toEqual([TIMING.lock0, TIMING.lockSpan, TIMING.lockW]);
    expect(u.uCellH.value).toBe(0.4);
    expect(u.uHover.value.toArray()).toEqual([-1, -1]);
    expect(u.uLines.value).toBe(1);
  });
});

describe('CAMERA', () => {
  it('is the long lens: fov 30, near 0.5, far 120', () => {
    expect(CAMERA).toEqual({ fov: 30, near: 0.5, far: 120 });
  });
});

describe('GLErrorBoundary', () => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  extend({ Group: THREE.Group });

  function rendererStub(): THREE.WebGLRenderer {
    return {
      render() {}, setSize() {}, setPixelRatio() {},
      shadowMap: { enabled: false, type: THREE.PCFShadowMap, needsUpdate: false },
      outputColorSpace: THREE.SRGBColorSpace, toneMapping: THREE.NoToneMapping, domElement: {},
    } as unknown as THREE.WebGLRenderer;
  }
  function Thrower(): null { throw new Error('no WebGL2'); }

  it('renders the fallback when a child throws, so a renderer failure leaves the DOM site standing', async () => {
    const quiet = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const root = createRoot({} as HTMLCanvasElement);
      await root.configure({ gl: rendererStub(), size: { width: 8, height: 8, top: 0, left: 0 }, dpr: 1, frameloop: 'never' });
      const store = await act(async () => root.render(createElement(GLErrorBoundary, { fallback: createElement('group', { name: 'fallback' }) }, createElement(Thrower))));
      const { scene } = store.getState();
      expect(scene.children).toHaveLength(1);
      expect(scene.children[0].name).toBe('fallback');
      await act(async () => root.unmount());
    } finally {
      quiet.mockRestore();
      errors.mockRestore();
    }
  });

  it('renders its children when nothing throws', async () => {
    const quiet = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const root = createRoot({} as HTMLCanvasElement);
      await root.configure({ gl: rendererStub(), size: { width: 8, height: 8, top: 0, left: 0 }, dpr: 1, frameloop: 'never' });
      const store = await act(async () => root.render(createElement(GLErrorBoundary, { fallback: null }, createElement('group', { name: 'kits' }))));
      expect(store.getState().scene.children[0].name).toBe('kits');
      await act(async () => root.unmount());
    } finally {
      quiet.mockRestore();
    }
  });
});

// The paper behind the bench: scene.background and the clear colour are the registry's uPaper Color by reference, and the
// binding follows the registry when a tier change rebuilds it, so the palette lerp Clocks writes into the new Color reaches
// the background too (load on desktop, resize below 820 px, toggle the theme).
describe('<PaperBackground uniforms /> mounted through R3F', () => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  function clearingRendererStub() {
    const clears: Array<{ color: THREE.Color; alpha: number }> = [];
    const gl = {
      render() {}, setSize() {}, setPixelRatio() {},
      setClearColor(color: THREE.Color, alpha: number) { clears.push({ color, alpha }); },
      shadowMap: { enabled: false, type: THREE.PCFShadowMap, needsUpdate: false },
      outputColorSpace: THREE.SRGBColorSpace, toneMapping: THREE.NoToneMapping, domElement: {},
    } as unknown as THREE.WebGLRenderer;
    return { gl, clears };
  }
  function withoutClockWarning<T>(fn: () => T): T {
    const warn = console.warn;
    const spy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => { if (!String(args[0]).startsWith('THREE.Clock')) warn(...args); });
    try { return fn(); } finally { spy.mockRestore(); }
  }

  async function mount(uniforms: BenchUniforms) {
    const { gl, clears } = clearingRendererStub();
    const root = withoutClockWarning(() => createRoot({} as HTMLCanvasElement));
    await root.configure({ gl, size: { width: 1440, height: 900, top: 0, left: 0 }, dpr: 1, frameloop: 'never' });
    const store = await act(async () => root.render(createElement(PaperBackground, { uniforms })));
    const rerender = (next: BenchUniforms) => act(async () => { root.render(createElement(PaperBackground, { uniforms: next })); });
    return { root, store, clears, rerender };
  }

  it('binds scene.background and the clear colour to the registry\'s uPaper Color, by reference and opaque', async () => {
    const u = createUniforms();
    const { root, store, clears } = await mount(u);
    expect(store.getState().scene.background).toBe(u.uPaper.value);
    expect(clears).toHaveLength(1);
    expect(clears[0].color).toBe(u.uPaper.value);
    expect(clears[0].alpha).toBe(1);
    await act(async () => root.unmount());
  });

  it('follows a rebuilt registry, so a theme lerp after a tier change moves the background and not a stale Color', async () => {
    const u1 = createUniforms();
    const { root, store, clears, rerender } = await mount(u1);
    const lightPaper = hexToColor(PALETTES.light.paper).getHex();
    expect(u1.uPaper.value.getHex()).toBe(lightPaper);   // a fresh registry sits on the light palette

    const u2 = createUniforms();                          // what Scene's useMemo builds when the tier flips
    await rerender(u2);
    const background = store.getState().scene.background as THREE.Color;
    expect(background).toBe(u2.uPaper.value);
    expect(background).not.toBe(u1.uPaper.value);
    expect(clears).toHaveLength(2);
    expect(clears[1].color).toBe(u2.uPaper.value);

    // The toggle lerps the registry Clocks now holds (u2); the background is that Color, so it moves with kits and ground.
    applyPalette(u2, PALETTES.light, PALETTES.dark, 1);
    const darkPaper = hexToColor(PALETTES.dark.paper).getHex();
    expect(darkPaper).not.toBe(lightPaper);
    expect(background.getHex()).toBe(darkPaper);
    expect(u1.uPaper.value.getHex()).toBe(lightPaper);   // the Color a one-time onCreated binding would still be showing
    await act(async () => root.unmount());
  });

  it('does not rebind when the same registry re-renders (a theme change re-renders Scene without rebuilding u)', async () => {
    const u = createUniforms();
    const { root, store, clears, rerender } = await mount(u);
    await rerender(u);
    expect(clears).toHaveLength(1);
    expect(store.getState().scene.background).toBe(u.uPaper.value);
    await act(async () => root.unmount());
  });
});

describe('bindPaper', () => {
  it('points scene.background and the clear colour at the same uPaper Color object, opaque', () => {
    const u = createUniforms();
    const scene = new THREE.Scene();
    const clears: Array<[THREE.Color, number]> = [];
    const gl = { setClearColor: (c: THREE.Color, a: number) => { clears.push([c, a]); } } as unknown as THREE.WebGLRenderer;
    bindPaper(scene, gl, u);
    expect(scene.background).toBe(u.uPaper.value);
    expect(clears).toEqual([[u.uPaper.value, 1]]);
  });
});
