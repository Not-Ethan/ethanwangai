import { describe, it, expect } from 'vitest';
import { MACHINE, type MachineId, type Tier, type Vec3 } from './types';
import { buildBench } from './counts';
import { CAMERA_KEYS, evaluatePose, type Pose } from './camera';
import { SECTIONS, sectionRanges, locate } from './sections';
import { DWELL, projectBounds, type NdcBounds } from './cameraClearance';

// The DOM's copy columns in NDC: every section's copy is the left 42% (x < −0.16); the hero's copy block is the left 58%
// down to 65% of the height (x < 0.17, y > −0.3). The bounds below keep each section's subject clear of them.
const BENCH: Record<Tier, ReturnType<typeof buildBench>> = { desktop: buildBench('desktop'), phone: buildBench('phone') };
const ASPECT: Record<Tier, number> = { desktop: 1.6, phone: 390 / 844 };
const { quoter, intake, balance, splitter, watch, bot, slot } = MACHINE;
const SMALL: MachineId[] = [balance, splitter, watch];
const ALL: MachineId[] = [quoter, intake, balance, splitter, watch, bot, slot];

function poseAt(section: number, u: number, tier: Tier): Pose {
  const out = { position: [0, 0, 0], lookAt: [0, 0, 0], fov: 0 };
  evaluatePose(section, u, tier, out);
  return { position: out.position as unknown as Vec3, lookAt: out.lookAt as unknown as Vec3, fov: out.fov };
}

/** Bounds of `machines` at a dwell the test is declared to check; a dwell missing from DWELL is a test bug. */
function at(section: number, u: number, machines: MachineId[], tier: Tier = 'desktop'): NdcBounds {
  expect(DWELL, `dwell (${section}, ${u}) is listed`).toContainEqual({ section, u });
  const b = projectBounds(BENCH[tier], machines, poseAt(section, u, tier), ASPECT[tier]);
  expect(b, `machines ${machines.join(',')} in front of the camera at (${section}, ${u})`).not.toBeNull();
  return b!;
}
const width = (b: NdcBounds) => b.right - b.left;
const height = (b: NdcBounds) => b.top - b.bottom;
const centreX = (b: NdcBounds) => (b.left + b.right) / 2;
const inFrame = (b: NdcBounds) => b.left >= -1 && b.right <= 1 && b.top <= 1 && b.bottom >= -1;
const intersectsFrame = (b: NdcBounds) => b.right >= -1 && b.left <= 1 && b.top >= -1 && b.bottom <= 1;

describe('projectBounds', () => {
  it('boxes the projected rest positions, y up, and returns null with nothing in front of the camera', () => {
    const facing: Pose = { position: [0, 8, 20], lookAt: [0, 0.5, -2], fov: 30 };
    const b = projectBounds(BENCH.desktop, [quoter], facing, 1.6)!;
    expect(b).not.toBeNull();
    expect(b.left).toBeLessThan(b.right);
    expect(b.bottom).toBeLessThan(b.top);
    expect(Math.abs(centreX(b))).toBeLessThan(0.05);   // the quoter is symmetric about x = 0 and the camera is on the axis
    const away: Pose = { position: [0, 8, 20], lookAt: [0, 8, 40], fov: 30 };
    expect(projectBounds(BENCH.desktop, [quoter], away, 1.6)).toBeNull();
  });
});

describe('desktop clearance at the dwells (aspect 1.6)', () => {
  it('hero (0, 0): the whole quoter below the headline and right of the plate, tight to the right edge; bot in frame; small machines cropped at the bottom edge', () => {
    const q = at(0, 0, [quoter]);
    expect(q.left, 'quoter left').toBeGreaterThanOrEqual(-0.20);
    expect(q.top, 'quoter top').toBeLessThanOrEqual(0.10);
    expect(q.right, 'quoter right').toBeLessThanOrEqual(1.02);
    expect(inFrame(at(0, 0, [bot])), 'bot in frame').toBe(true);
    expect(at(0, 0, SMALL).top, 'small machines top').toBeLessThanOrEqual(-0.72);
  });

  it('risen (0, 1): the quoter within [−0.7, 1.02] × [−1.02, 0.6]', () => {
    const q = at(0, 1, [quoter]);
    expect(q.left).toBeGreaterThanOrEqual(-0.7);
    expect(q.right).toBeLessThanOrEqual(1.02);
    expect(q.bottom).toBeGreaterThanOrEqual(-1.02);
    expect(q.top).toBeLessThanOrEqual(0.6);
  });

  it('more (1, 0.5): the whole quoter in frame, right of the copy column', () => {
    const q = at(1, 0.5, [quoter]);
    expect(q.left).toBeGreaterThanOrEqual(-0.12);
    expect(q.right).toBeLessThanOrEqual(1.02);
    expect(q.top).toBeLessThanOrEqual(0.9);
    expect(q.bottom).toBeGreaterThanOrEqual(-1.02);
  });

  it('first (2, 0.30): a macro on the bot right of centre; (2, 0.85): bot and quoter share the frame, clear of the copy column', () => {
    const b = at(2, 0.30, [bot]);
    expect(centreX(b), 'bot centre x').toBeGreaterThanOrEqual(0.0);
    expect(centreX(b), 'bot centre x').toBeLessThanOrEqual(0.7);
    expect(height(b), 'bot height').toBeGreaterThanOrEqual(0.25);
    expect(at(2, 0.85, [bot, quoter]).left, 'bot + quoter left').toBeGreaterThanOrEqual(-0.12);
    expect(height(at(2, 0.85, [bot])), 'bot height').toBeGreaterThanOrEqual(0.05);
  });

  it('kalshi (3, 0.6): the quoter clear of the copy column and at least 0.9 of it visible', () => {
    const q = at(3, 0.6, [quoter]);
    expect(q.left).toBeGreaterThanOrEqual(-0.12);
    expect(Math.min(q.right, 1) - Math.max(q.left, -1), 'visible width').toBeGreaterThanOrEqual(0.9);
  });

  it('heron (4, 0.7): the balance clear of the copy column and tall enough; the quoter behind it in frame', () => {
    const b = at(4, 0.7, [balance]);
    expect(b.left).toBeGreaterThanOrEqual(-0.12);
    expect(height(b)).toBeGreaterThanOrEqual(0.22);
    expect(intersectsFrame(at(4, 0.7, [quoter])), 'quoter intersects the frame').toBe(true);
  });

  it('darch (5, 0.7): the splitter clear of the copy column and wide', () => {
    const s = at(5, 0.7, [splitter]);
    expect(s.left).toBeGreaterThanOrEqual(-0.12);
    expect(width(s)).toBeGreaterThanOrEqual(0.45);
  });

  it('summers (6, 0.7): the watch clear of the copy column and wide', () => {
    const w = at(6, 0.7, [watch]);
    expect(w.left).toBeGreaterThanOrEqual(-0.12);
    expect(width(w)).toBeGreaterThanOrEqual(0.45);
  });

  it('alive (7, 0.8): the whole bench in frame, mostly right of the copy column, the small machines large in front', () => {
    const all = at(7, 0.8, ALL);
    expect(all.left).toBeGreaterThanOrEqual(-0.30);
    expect(inFrame(all), 'bench in frame').toBe(true);
    expect(height(at(7, 0.8, SMALL)), 'small machines height').toBeGreaterThanOrEqual(0.35);
  });

  it('yours (8, 0.6): the slot clear of the copy column and legible', () => {
    const s = at(8, 0.6, [slot]);
    expect(s.left).toBeGreaterThanOrEqual(-0.12);
    expect(width(s)).toBeGreaterThanOrEqual(0.2);
  });
});

describe('anti-journey', () => {
  it('the desktop camera travels under 45 units over the whole page', () => {
    const vh = 900;
    const tops = SECTIONS.reduce<number[]>((acc, s, i) => {
      acc.push(i === 0 ? 0 : acc[i - 1] + SECTIONS[i - 1].vh.desktop * vh / 100);
      return acc;
    }, []);
    const docHeight = tops[8] + SECTIONS[8].vh.desktop * vh / 100;
    const ranges = sectionRanges(tops, docHeight, vh);
    const out = { position: [0, 0, 0], lookAt: [0, 0, 0], fov: 0 };
    const prev = [0, 0, 0];
    let length = 0;
    const samples = 400;
    for (let i = 0; i < samples; i++) {
      const { index, u } = locate(i / (samples - 1), ranges);
      evaluatePose(index, u, 'desktop', out);
      if (i > 0) length += Math.hypot(out.position[0] - prev[0], out.position[1] - prev[1], out.position[2] - prev[2]);
      for (let k = 0; k < 3; k++) prev[k] = out.position[k];
    }
    expect(length).toBeLessThan(45);
  });

  it('every key looks at the bench: lookAt within the bench bounds ± 3, on both tiers', () => {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const m of BENCH.desktop.machines) {
      if (m.count === 0) continue;
      for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], m.min[k]); max[k] = Math.max(max[k], m.max[k]); }
    }
    for (const tier of ['desktop', 'phone'] as const) {
      for (const key of CAMERA_KEYS[tier]) {
        for (let k = 0; k < 3; k++) {
          expect(key.pose.lookAt[k], `${tier} key (${key.section}, ${key.u}) lookAt[${k}]`).toBeGreaterThanOrEqual(min[k] - 3);
          expect(key.pose.lookAt[k], `${tier} key (${key.section}, ${key.u}) lookAt[${k}]`).toBeLessThanOrEqual(max[k] + 3);
        }
      }
    }
  });
});

describe('phone clearance at the dwells (aspect 390/844)', () => {
  it('at every dwell the active machine sits in the lower 55% and inside the frame width', () => {
    for (const { section, u } of DWELL) {
      const b = at(section, u, [SECTIONS[section].machine], 'phone');
      const where = `(${section}, ${u}) ${SECTIONS[section].id}`;
      expect(b.top, `${where} top`).toBeLessThanOrEqual(0.10);
      expect(b.left, `${where} left`).toBeGreaterThanOrEqual(-1.02);
      expect(b.right, `${where} right`).toBeLessThanOrEqual(1.02);
    }
  });

  it('hero (0, 0): the bot in frame and the quoter at least 1.2 of the width', () => {
    expect(inFrame(at(0, 0, [bot], 'phone')), 'bot in frame').toBe(true);
    expect(width(at(0, 0, [quoter], 'phone'))).toBeGreaterThanOrEqual(1.2);
  });
});

describe('no section starts with a cut', () => {
  /** Scroll distance in vh between two keys, from the tier's section heights. */
  function windowVh(a: { section: number; u: number }, b: { section: number; u: number }, tier: Tier): number {
    if (a.section === b.section) return (b.u - a.u) * SECTIONS[a.section].vh[tier];
    let vh = (1 - a.u) * SECTIONS[a.section].vh[tier];
    for (let s = a.section + 1; s < b.section; s++) vh += SECTIONS[s].vh[tier];
    return vh + b.u * SECTIONS[b.section].vh[tier];
  }
  const travel = (a: Pose, b: Pose) => Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1], a.position[2] - b.position[2]);

  it('a lead-in key (u ≤ 0.10) holds the previous section\'s station on both tiers: it may tilt, not travel', () => {
    for (const tier of ['desktop', 'phone'] as const) {
      const keys = CAMERA_KEYS[tier];
      let found = 0;
      for (let i = 1; i < keys.length; i++) {
        const prev = keys[i - 1], key = keys[i];
        if (key.section === prev.section || key.u > 0.10) continue;
        found++;
        expect(prev.u, `${tier} (${prev.section}, ${prev.u}) ends its section`).toBe(1);
        expect(travel(prev.pose, key.pose), `${tier} key (${key.section}, ${key.u}) travels`).toBe(0);
      }
      expect(found, `${tier} has lead-in keys`).toBeGreaterThan(0);
    }
  });

  it('no key-to-key transit is faster than 2.5 units per vh of scroll on either tier', () => {
    // Desktop's steepest leg is 0.92 (the descent to the bot macro). Phone's far quoter shots and near small-machine
    // shots alternate, so its forced legs (far → near over a section's 13.5–18 vh travel window) sit near 2.2; the
    // ceiling is just above them. The kalshi entry once moved 39.5 units in 8 vh (4.9): a whip-pan, not a transit.
    for (const tier of ['desktop', 'phone'] as const) {
      const keys = CAMERA_KEYS[tier];
      for (let i = 1; i < keys.length; i++) {
        const a = keys[i - 1], b = keys[i];
        const d = travel(a.pose, b.pose);
        if (d === 0) continue;
        const rate = d / windowVh(a, b, tier);
        expect(rate, `${tier} (${a.section}, ${a.u}) → (${b.section}, ${b.u}): ${d.toFixed(1)} units over ${windowVh(a, b, tier).toFixed(1)} vh`).toBeLessThanOrEqual(2.5);
      }
    }
  });
});
