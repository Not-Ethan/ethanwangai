import { describe, it, expect, vi } from 'vitest';
import { act, createElement } from 'react';
import * as THREE from 'three';
import { createRoot, extend } from '@react-three/fiber';
import { KIND, MACHINE, type Tier } from '@/bench/types';
import { buildBench } from '@/bench/counts';
import { hashString } from '@/bench/hash';
import { BENCH_SEED_TEXT } from '@/bench/bench';
import { OU, generateOU } from '@/bench/ou';
import { QUOTER_BED } from '@/bench/configs/quoter';
import { TIMING } from '@/bench/timing';
import { createUniforms } from './material/uniforms';
import { KEY_LIGHT } from './Lights';
import { bedPitch, createOUTexture, configureUniforms, GLErrorBoundary, CAMERA, BENCH_CENTER, BALANCE_PIVOT_Y } from './Scene';

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

  it('sets the tier\'s bed pitch, the unit key direction, the bench centre, the balance pivot and the OU texture', () => {
    for (const tier of ['desktop', 'phone'] as const) {
      const result = tier === 'desktop' ? desktop : buildBench(tier as Tier);
      const u = configureUniforms(createUniforms(), tier, result, ou);
      expect(u.uPitch.value, tier).toBe(bedPitch(tier));
      const key = new THREE.Vector3(...KEY_LIGHT.position).normalize();
      expect(u.uKeyDir.value.length()).toBeCloseTo(1, 12);
      expect(u.uKeyDir.value.distanceTo(key)).toBeLessThan(1e-12);
      expect(u.uBenchCenter.value.toArray()).toEqual([0, 0, 1]);
      expect(BENCH_CENTER).toEqual([0, 0, 1]);
      expect(u.uOU.value).toBe(ou);
    }
  });

  it('puts the balance pivot at the machine centroid\'s x/z and the rail\'s height: (−4.2, 0.9, 4.6)', () => {
    const u = configureUniforms(createUniforms(), 'desktop', desktop, ou);
    const c = desktop.machines[MACHINE.balance].centroid;
    expect(u.uBalancePivot.value.x).toBe(c[0]);
    expect(u.uBalancePivot.value.z).toBe(c[2]);
    expect(u.uBalancePivot.value.y).toBe(BALANCE_PIVOT_Y);
    expect(u.uBalancePivot.value.x).toBeCloseTo(-4.2, 2);
    expect(u.uBalancePivot.value.y).toBe(0.9);
    expect(u.uBalancePivot.value.z).toBeCloseTo(4.6, 2);
    // 0.9 is the config's post height: the tilting rail's centre line in bench space
    const rail = desktop.parts.find((p) => p.machine === MACHINE.balance && p.module === 'rail');
    expect(rail?.kind).toBe(KIND.tilt);
    expect(rail?.position[1]).toBe(BALANCE_PIVOT_Y);
  });

  it('leaves the registry\'s own constants in place', () => {
    const u = configureUniforms(createUniforms(), 'desktop', desktop, ou);
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
