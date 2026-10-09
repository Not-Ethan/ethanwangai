import { describe, it, expect, beforeEach } from 'vitest';
import { copy } from '@/site/copy';
import { countWords, yoursDom } from '@/site/visitorSentence';
import { houseFromSentence } from '@/valley/house';
import type { HouseMeshData } from './houseGeometry';
import { bindWindowBuffers, dynamicWindowCount, resetWindowSlots } from './windowSlots';
import { VisitorBridge, buildPinFromSearch } from './visitorBridge';

const S1 = 'a bot that books my dentist appointments';
const S2 = 'a tiny tool that tells my roommates when the washing machine is done so nobody leaves wet clothes in it';

function rig(withHooks = true) {
  const b = new VisitorBridge();
  const swaps: (HouseMeshData | null)[] = [];
  const building: boolean[] = [];
  const hooks = { swap: (d: HouseMeshData | null) => { swaps.push(d); }, setBuilding: (on: boolean) => { building.push(on); } };
  if (withHooks) b.hooks = hooks;
  b.plane = { constant: 0 };
  b.grow = { array: new Float32Array(18), needsUpdate: false };
  yoursDom.clock = { textContent: '' };
  yoursDom.tag = { textContent: '' };
  return { b, swaps, building, hooks };
}
function frame(b: VisitorBridge, t: number, reducedMotion = false): number | null {
  const bt = b.beforeFrame(t, reducedMotion);
  b.afterFrame(bt);
  return bt;
}
const tagFor = (s: string) => copy.yours.tag(countWords(s), houseFromSentence(s).parts.length);

beforeEach(() => {
  resetWindowSlots();
  bindWindowBuffers({ capacity: 512, staticCount: 0, write: () => {}, setCount: () => {} });
});

describe('VisitorBridge', () => {
  it('a first sentence builds on wall time: scaffold, cut, windows at 3.6 s, tag at 4.4 s', () => {
    const { b, swaps, building } = rig();
    expect(frame(b, 9)).toBeNull();
    b.request(S1);
    expect(frame(b, 10)).toBe(0);
    expect(swaps).toHaveLength(1);
    expect(swaps[0]!.partCount).toBe(houseFromSentence(S1).parts.length);
    expect(building).toEqual([true]);
    expect(yoursDom.clock!.textContent).toBe(copy.yours.clock('0.00'));

    frame(b, 12);
    const d = swaps[0]!;
    expect(b.plane.constant).toBeGreaterThan(d.min[1]);
    expect(b.plane.constant).toBeLessThan(d.max[1]);
    expect(Array.from(b.grow!.array).some((g) => g > 0)).toBe(true);
    expect(b.grow!.needsUpdate).toBe(true);
    expect(yoursDom.clock!.textContent).toBe(copy.yours.clock('2.00'));
    expect(dynamicWindowCount('visitor')).toBe(0);

    frame(b, 13.65);
    expect(dynamicWindowCount('visitor')).toBe(houseFromSentence(S1).windows.length);

    frame(b, 14.5);
    expect(building).toEqual([true, false]);
    expect(yoursDom.clock!.textContent).toBe('');
    expect(yoursDom.tag!.textContent).toBe(tagFor(S1));
    expect(b.plane.constant).toBeGreaterThan(d.max[1]);
    expect('light' in b).toBe(false); // the visitor light is Stage 2's POINT_LIGHTS entry, not the bridge's
  });

  it('the same sentence builds the same house twice (spec §14 G5)', () => {
    const a = rig();
    a.b.request(S1);
    frame(a.b, 1);
    const b = rig();
    b.b.request(S1);
    frame(b.b, 50);
    expect(b.swaps[0]!.positions).toEqual(a.swaps[0]!.positions);
  });

  it('a new sentence: the old house stays up for 0.2 s while its light goes out, then the new build starts', () => {
    const { b, swaps } = rig();
    b.request(S1);
    frame(b, 10);
    frame(b, 15);
    b.request(S2);
    expect(frame(b, 20)).toBeCloseTo(-0.2, 9);
    expect(swaps).toHaveLength(1);
    expect(b.plane.constant).toBeGreaterThan(swaps[0]!.max[1]);
    frame(b, 20.1);
    expect(swaps).toHaveLength(1);
    expect(frame(b, 20.21)).toBeCloseTo(0.01, 9);
    expect(swaps).toHaveLength(2);
    expect(swaps[1]!.partCount).toBe(houseFromSentence(S2).parts.length);
    expect(yoursDom.tag!.textContent).toBe('');
    expect(dynamicWindowCount('visitor')).toBe(0);
  });

  it('a sentence sent mid-build waits; the running build finishes; the latest queued sentence wins', () => {
    const { b, swaps, building } = rig();
    b.request(S1);
    frame(b, 10);
    frame(b, 11);
    b.request('an earlier idea');
    b.request(S2);
    frame(b, 12);
    frame(b, 14.3);
    expect(swaps).toHaveLength(1);
    expect(frame(b, 14.4)).toBeCloseTo(-0.2, 9);
    expect(building).toEqual([true, false]);
    frame(b, 14.61);
    expect(swaps).toHaveLength(2);
    expect(swaps[1]!.partCount).toBe(houseFromSentence(S2).parts.length);
  });

  it('a stored sentence is rebuilt silently: no scaffold, windows and tag at once', () => {
    const { b, swaps, building } = rig();
    b.restore(S1);
    expect(frame(b, 0.5)).toBe(Infinity);
    expect(swaps).toHaveLength(1);
    expect(building).toEqual([]);
    expect(dynamicWindowCount('visitor')).toBe(houseFromSentence(S1).windows.length);
    expect(yoursDom.tag!.textContent).toBe(tagFor(S1));
  });

  it('reduced motion: the house appears built, no scaffolding (spec §11)', () => {
    const { b, swaps, building } = rig();
    b.request(S1);
    expect(frame(b, 10, true)).toBe(Infinity);
    expect(swaps).toHaveLength(1);
    expect(building).toEqual([]);
    expect(yoursDom.tag!.textContent).toBe(tagFor(S1));
  });

  it('waits for the scene: nothing swaps until VisitorHouse has plugged its hooks in', () => {
    const { b, swaps, hooks } = rig(false);
    b.request(S1);
    frame(b, 10);
    expect(swaps).toHaveLength(0);
    b.hooks = hooks;
    expect(frame(b, 10.5)).toBeCloseTo(0.5, 9);
    expect(swaps).toHaveLength(1);
  });

  it('detach and re-attach (canvas remount) puts the same house back', () => {
    const { b, swaps, hooks } = rig();
    b.request(S1);
    frame(b, 10);
    frame(b, 15);
    b.detach();
    expect(b.hooks).toBeNull();
    expect(dynamicWindowCount('visitor')).toBe(0);
    b.hooks = hooks;
    frame(b, 16);
    expect(swaps).toHaveLength(2);
    expect(swaps[1]!.positions).toEqual(swaps[0]!.positions);
    expect(dynamicWindowCount('visitor')).toBe(houseFromSentence(S1).windows.length);
  });

  it('a pinned build holds its time whatever the clock says (G5 stills)', () => {
    const { b, swaps, building } = rig();
    b.pin(S1, 2);
    expect(frame(b, 0)).toBe(2);
    expect(frame(b, 100)).toBe(2);
    expect(swaps).toHaveLength(1);
    expect(building).toEqual([true]);
    expect(yoursDom.clock!.textContent).toBe(copy.yours.clock('2.00'));
  });

  it('writes nothing to a missing DOM and throws nothing', () => {
    const { b } = rig();
    yoursDom.clock = null;
    yoursDom.tag = null;
    b.request(S1);
    expect(() => { frame(b, 1); frame(b, 3); frame(b, 6); }).not.toThrow();
  });
});

describe('buildPinFromSearch', () => {
  it('reads ?visitor= and ?buildT=, cleans the sentence, clamps the time', () => {
    expect(buildPinFromSearch('?visitor=a%20bot&buildT=2')).toEqual({ sentence: 'a bot', t: 2 });
    expect(buildPinFromSearch('?visitor=a+bot&buildT=9')).toEqual({ sentence: 'a bot', t: 4.4 });
    expect(buildPinFromSearch('?visitor=a&buildT=-1')).toEqual({ sentence: 'a', t: 0 });
    expect(buildPinFromSearch('?visitor=a&buildT=soon')).toBeNull();
    expect(buildPinFromSearch('?visitor=%20%20&buildT=1')).toBeNull();
    expect(buildPinFromSearch('?buildT=1')).toBeNull();
    expect(buildPinFromSearch('')).toBeNull();
  });
});
