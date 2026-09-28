import { describe, it, expect } from 'vitest';
import { SECTIONS, sectionRanges } from './sections';
import { MACHINE, type Tier } from './types';
import { power2InOut } from './math';
import { CAMERA_KEYS, evaluatePose } from './camera';
import { createSceneState, sceneState } from './sceneState';

// Desktop ranges built the same way as sections.test.ts.
const vh = 900;
const tops = SECTIONS.reduce<number[]>((acc, s, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SECTIONS[i - 1].vh.desktop * vh / 100);
  return acc;
}, []);
const docHeight = tops[8] + SECTIONS[8].vh.desktop * vh / 100;
const ranges = sectionRanges(tops, docHeight, vh);
const gAt = (i: number, u: number) => ranges[i].start + u * (ranges[i].end - ranges[i].start);
const at = (i: number, u: number, tier: Tier = 'desktop') => sceneState(gAt(i, u), ranges, tier, createSceneState());

describe('sceneState', () => {
  it('at g 0: section 0, hero pose, machines at rest, merge 0, trickle on', () => {
    const s = at(0, 0);
    expect(s.section).toBe(0);
    expect(s.u).toBe(0);
    // by MachineId: quoter, intake, balance, splitter, watch, bot, slot, visitor
    expect(s.compileTarget).toEqual([null, 0, 0, 0, 0, 1, 1, null]);
    expect(s.merge).toBe(0);
    expect(s.burst).toBe(0);
    expect(s.lean).toBe(0);
    expect(s.rung).toBe(-1);
    expect(s.click).toBe(-1);
    expect(s.trickle).toBe(true);
    expect(s.active).toBe(MACHINE.quoter);
    expect(s.pose.position).toEqual([6.5, 4.2, 11.5]);
    expect(s.pose.lookAt).toEqual([1.2, 0.4, -2.2]);
    expect(s.pose.fov).toBe(30);
  });

  it('section 1: the third click has landed at u 0.375; rung and click follow merge', () => {
    const s = at(1, 0.375);
    expect(Math.abs(s.merge - Math.round(s.merge))).toBeLessThan(0.05);
    expect(s.merge).toBeCloseTo(3, 1);
    expect(s.rung).toBe(2);
    expect(s.click).toBe(1);
    expect(s.burst).toBe(0);
    expect(s.lean).toBe(0);
    // inside a click's smoothstep window merge is between levels
    const mid = at(1, 0.375 + 0.15 * 0.55 / 6);
    expect(mid.merge).toBeGreaterThan(3);
    expect(mid.merge).toBeLessThan(4);
    // hold at level 6 lights every rung
    const hold = at(1, 0.7);
    expect(hold.merge).toBe(6);
    expect(hold.rung).toBe(5);
    expect(hold.click).toBe(1);
    expect(hold.burst).toBe(0);
  });

  it('section 1 burst: merge falls from 6 with a lean kick', () => {
    const s = at(1, 0.9);
    expect(s.burst).toBeCloseTo(0.5454, 3);
    expect(s.lean).toBeCloseTo(Math.sin(Math.PI * s.burst), 6);
    expect(s.merge).toBeLessThan(3);
    expect(s.merge).toBeCloseTo(6 * (1 - s.burst), 6);
    expect(s.click).toBe(3);
    const early = at(1, 0.8);
    expect(early.click).toBe(2);
    expect(early.lean).toBeGreaterThan(0);
  });

  it('merge is 0 before the first click and outside section 1', () => {
    expect(at(1, 0.05).merge).toBe(0);
    expect(at(0, 0.9).merge).toBe(0);
    const next = at(2, 0);
    expect(next.merge).toBe(0);
    expect(next.lean).toBe(0);
    expect(next.rung).toBe(-1);
    expect(next.click).toBe(-1);
  });

  it('scrubs a small compile linearly inside its build window; earlier builds hold at 1', () => {
    const s = at(4, 0.285);
    expect(s.compileTarget[MACHINE.balance]).toBeCloseTo(0.5, 6);
    expect(s.compileTarget[MACHINE.intake]).toBe(1);
    expect(s.compileTarget[MACHINE.splitter]).toBe(0);
    expect(s.compileTarget[MACHINE.watch]).toBe(0);
    expect(s.compileTarget[MACHINE.quoter]).toBeNull();
    expect(s.compileTarget[MACHINE.visitor]).toBeNull();
    expect(s.active).toBe(MACHINE.balance);
    expect(at(3, 0.3).compileTarget[MACHINE.intake]).toBeCloseTo(0.5, 6);
    expect(at(4, 0.6).compileTarget[MACHINE.balance]).toBe(1);
  });

  it('by the end of section 6 balance, splitter and watch are all built', () => {
    const s = at(6, 1);
    expect(s.compileTarget[MACHINE.intake]).toBe(1);
    expect(s.compileTarget[MACHINE.balance]).toBe(1);
    expect(s.compileTarget[MACHINE.splitter]).toBe(1);
    expect(s.compileTarget[MACHINE.watch]).toBe(1);
  });

  it('turns the trickle off in alive only', () => {
    expect(at(7, 0.5).trickle).toBe(false);
    expect(at(7, 0.5).section).toBe(7);
    expect(at(6, 0.5).trickle).toBe(true);
    expect(at(8, 0.5).trickle).toBe(true);
  });

  it('reverses: scrolling back to the top of heron un-builds the balance', () => {
    const s = at(4, 0);
    expect(s.compileTarget[MACHINE.balance]).toBe(0);
    expect(s.compileTarget[MACHINE.intake]).toBe(1);
  });

  it('writes into the given out object and keeps its arrays', () => {
    const out = createSceneState();
    const ct = out.compileTarget;
    const pos = out.pose.position;
    const look = out.pose.lookAt;
    const r = sceneState(gAt(4, 0.3), ranges, 'phone', out);
    expect(r).toBe(out);
    expect(out.compileTarget).toBe(ct);
    expect(out.pose.position).toBe(pos);
    expect(out.pose.lookAt).toBe(look);
    expect(out.pose.fov).toBe(38);
  });
});

describe('camera', () => {
  it('keys are sorted by section + u for both tiers', () => {
    for (const tier of ['desktop', 'phone'] as const) {
      const ts = CAMERA_KEYS[tier].map((k) => k.section + k.u);
      for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThanOrEqual(ts[i - 1]);
    }
  });

  it('blends between keys with power2InOut and holds when both keys share a pose', () => {
    const out = { position: [0, 0, 0], lookAt: [0, 0, 0], fov: 0 };
    // midway through the hero rise: keys (0, 0.15) and (0, 1.00)
    evaluatePose(0, 0.575, 'desktop', out);
    expect(out.position[0]).toBeCloseTo(5.0, 6);
    expect(out.position[1]).toBeCloseTo(6.85, 6);
    expect(out.position[2]).toBeCloseTo(10.0, 6);
    expect(out.lookAt[0]).toBeCloseTo(0.7, 6);
    // a quarter of the way is eased, not linear
    evaluatePose(0, 0.15 + 0.25 * 0.85, 'desktop', out);
    expect(out.position[0]).toBeCloseTo(6.5 + (3.5 - 6.5) * power2InOut(0.25), 6);
    // hold inside section 1
    evaluatePose(1, 0.5, 'desktop', out);
    expect(out.position).toEqual([2.8, 10.5, 5.5]);
    expect(out.lookAt).toEqual([0, 0.3, -2]);
    expect(out.fov).toBe(30);
    // after the last key
    evaluatePose(8, 1, 'desktop', out);
    expect(out.position).toEqual([7.8, 1.3, 10.2]);
  });

  it('phone keys: fov 38, a macro hero, every other pose 20% closer to its lookAt and raised 1.2', () => {
    const D = CAMERA_KEYS.desktop;
    const P = CAMERA_KEYS.phone;
    expect(P.length).toBe(D.length);
    P.forEach((k, i) => {
      expect(k.section).toBe(D[i].section);
      expect(k.u).toBe(D[i].u);
      expect(k.pose.fov).toBe(38);
    });
    expect(P[0].pose.position).toEqual([-2.6, 2.2, 5.2]);
    expect(P[0].pose.lookAt).toEqual([-4.2, 0.3, 0.6]);
    expect(P[1].pose.position).toEqual([-2.6, 2.2, 5.2]);
    for (let i = 2; i < D.length; i++) {
      const d = D[i].pose, p = P[i].pose;
      expect(p.lookAt).toEqual(d.lookAt);
      for (let k = 0; k < 3; k++) {
        const closer = d.lookAt[k] + 0.8 * (d.position[k] - d.lookAt[k]);
        expect(p.position[k]).toBeCloseTo(closer + (k === 1 ? 1.2 : 0), 9);
      }
    }
  });
});
