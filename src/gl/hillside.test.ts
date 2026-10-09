import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { copy } from '@/site/copy';
import { ignitionSchedule } from '@/valley/ignition';
import { HILL_IDS, hillsideData } from './houseGeometry';
import { bindWindowBuffers, resetWindowSlots, setDynamicWindows, type WindowBuffers } from './windowSlots';
import type { EmitterId } from '@/valley/types';

beforeEach(() => resetWindowSlots());

describe('the hillside', () => {
  it('builds from copy.yours.hillside: each hill emitter drives exactly its own house\'s windows', () => {
    const h = hillsideData(copy.yours.hillside);
    const written: EmitterId[] = [];
    let count = 0;
    const b: WindowBuffers = { capacity: 512, staticCount: 40, write: (...args) => { written.push(args[2]); }, setCount: (n) => { count = n; } };
    bindWindowBuffers(b);
    written.length = 0;
    for (const w of h.windows) setDynamicWindows(w.emitter, w.quads);
    const total = h.houses.reduce((s, x) => s + x.windows.length, 0);
    expect(count).toBe(40 + total);
    const finalPass = written.slice(-total);
    for (let i = 0; i < 5; i++) {
      expect(finalPass.filter((e) => e === HILL_IDS[i]).length).toBe(h.houses[i].windows.length);
    }
  });

  it('lights with the chain: hill1…hill5 catch at 3.6 s, 0.04 s apart (spec §5.3)', () => {
    const steps = ignitionSchedule().filter((s) => (HILL_IDS as readonly string[]).includes(s.target as string));
    expect(steps.map((s) => s.target)).toEqual([...HILL_IDS]);
    steps.forEach((s, i) => {
      expect(s.kind).toBe('catch');
      expect(s.at).toBeCloseTo(3.6, 9);
      expect(s.stagger ?? 0).toBeCloseTo(0.04 * i, 9);
    });
  });

  it('Hillside.tsx is one Lambert mesh with vertex colours, registers its windows, and is not a shadow caster', () => {
    const src = readFileSync(new URL('./Hillside.tsx', import.meta.url), 'utf8');
    expect(src).toContain('hillsideData(copy.yours.hillside)');
    expect(src).toContain('vertexColors: true');
    expect(src).toContain('flatShading: true');
    expect(src).toContain('setDynamicWindows(');
    expect(src).not.toContain('castShadow');
    expect(src).not.toMatch(/emissive|AdditiveBlending/);
    expect(src.match(/<mesh\b/g)).toHaveLength(1);
  });

  it('Scene mounts the hillside right after the buildings', () => {
    const scene = readFileSync(new URL('./Scene.tsx', import.meta.url), 'utf8');
    expect(scene).toContain('<Buildings shadows={shadows} />\n          <Hillside />');
  });
});
