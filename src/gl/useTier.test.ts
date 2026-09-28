import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, createElement, useEffect } from 'react';
import { createRoot } from '@react-three/fiber';
import * as THREE from 'three';
import type { Tier } from '@/bench/types';
import { useTier, dprAfterDeclines, TIER_SETTINGS, DPR_STEP, DPR_FLOOR } from './useTier';

const mockScroll: { tier: Tier } = { tier: 'desktop' };
vi.mock('@/scroll/ScrollProvider', () => ({ useScroll: () => ({ state: { current: null }, reducedMotion: false, tier: mockScroll.tier, scrollTo() {} }) }));

describe('TIER_SETTINGS', () => {
  it('desktop renders at DPR 1.25 with the shadow map and 4× MSAA; phone at DPR 1, no shadow map, 2×', () => {
    expect(TIER_SETTINGS.desktop).toEqual({ dpr: 1.25, shadows: true, msaa: 4 });
    expect(TIER_SETTINGS.phone).toEqual({ dpr: 1, shadows: false, msaa: 2 });
  });
});

describe('dprAfterDeclines', () => {
  it('steps DPR down by 0.25 per decline and stops at 1', () => {
    expect(DPR_STEP).toBe(0.25);
    expect(DPR_FLOOR).toBe(1);
    expect(dprAfterDeclines('desktop', 0)).toBe(1.25);
    expect(dprAfterDeclines('desktop', 1)).toBe(1);
    expect(dprAfterDeclines('desktop', 2)).toBe(1);
    expect(dprAfterDeclines('phone', 0)).toBe(1);
    expect(dprAfterDeclines('phone', 5)).toBe(1);
  });
});

// The hook, rendered through R3F's reconciler (any React renderer will do; this one needs no DOM) with the scroll layer stubbed.
describe('useTier', () => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  type Out = ReturnType<typeof useTier>;
  const sink: { latest: Out | null } = { latest: null };
  /** Publishes the hook's latest return after each commit; act() flushes the effect. */
  function Probe(): null {
    const out = useTier();
    useEffect(() => { sink.latest = out; });
    return null;
  }

  function rendererStub(): THREE.WebGLRenderer {
    return {
      render() {}, setSize() {}, setPixelRatio() {},
      shadowMap: { enabled: false, type: THREE.PCFShadowMap, needsUpdate: false },
      outputColorSpace: THREE.SRGBColorSpace, toneMapping: THREE.NoToneMapping, domElement: {},
    } as unknown as THREE.WebGLRenderer;
  }
  async function mount() {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const root = createRoot({} as HTMLCanvasElement);
    warn.mockRestore();
    await root.configure({ gl: rendererStub(), size: { width: 8, height: 8, top: 0, left: 0 }, dpr: 1, frameloop: 'never' });
    await act(async () => root.render(createElement(Probe)));
    return root;
  }

  beforeEach(() => { sink.latest = null; });

  it('desktop: the tier\'s settings, then onDecline lowers DPR 1.25 → 1 and holds there', async () => {
    mockScroll.tier = 'desktop';
    const root = await mount();
    expect(sink.latest).toMatchObject({ tier: 'desktop', dpr: 1.25, shadows: true, msaa: 4 });
    await act(async () => sink.latest!.onDecline());
    expect(sink.latest!.dpr).toBe(1);
    expect(sink.latest!.shadows).toBe(true);   // Stage 2 only lowers DPR; the shadow rungs come in Stage 6
    await act(async () => sink.latest!.onDecline());
    expect(sink.latest!.dpr).toBe(1);          // the floor holds
    await act(async () => root.unmount());
  });

  it('phone: DPR 1, no shadow map, 2× MSAA, and nowhere lower to go', async () => {
    mockScroll.tier = 'phone';
    const root = await mount();
    expect(sink.latest).toMatchObject({ tier: 'phone', dpr: 1, shadows: false, msaa: 2 });
    await act(async () => sink.latest!.onDecline());
    expect(sink.latest!.dpr).toBe(1);
    await act(async () => root.unmount());
  });
});
