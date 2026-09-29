import { describe, it, expect } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { MACHINE, type MachineId, type Tier, type Vec3 } from './types';
import { buildBench } from './counts';
import { CAMERA_KEYS, evaluatePose, type Pose } from './camera';
import { SECTIONS, sectionRanges, locate } from './sections';
import { DWELL, projectBounds, projectPoint, elevationDeg, azimuthDeg, type NdcBounds } from './cameraClearance';

// The DOM's copy columns in NDC: every section's copy is the left 42% (x < −0.16); the hero's copy block is the left 58%
// down to 65% of the height (x < 0.17, y > −0.3). The bounds below keep each section's subject clear of them, and at
// the hero and darch also the tall, dense non-subject machines (the intake's hopper, the balance's tile stacks) that
// would otherwise sit dark-on-dark under the copy.
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

/**
 * The splitter's out-rails from the desktop layout, each as [block end, far end] in bench space and ordered across the
 * fan. A bar part is its midpoint, a rotation and a length along local x, so its ends are the midpoint ± half the length.
 */
function fanRails(): Array<[Vec3, Vec3]> {
  const parts = BENCH.desktop.parts.filter((p) => p.machine === splitter);
  const block = parts.filter((p) => p.module === 'block');
  const hub = [0, 1, 2].map((k) => block.reduce((sum, p) => sum + p.position[k], 0) / block.length);
  const rails = parts.filter((p) => p.module === 'fan').map((p): [Vec3, Vec3] => {
    const h = new Vector3(p.scale[0] / 2, 0, 0).applyQuaternion(new Quaternion(...p.quaternion));
    const a: Vec3 = [p.position[0] - h.x, p.position[1] - h.y, p.position[2] - h.z];
    const b: Vec3 = [p.position[0] + h.x, p.position[1] + h.y, p.position[2] + h.z];
    const d = (v: Vec3) => Math.hypot(v[0] - hub[0], v[1] - hub[1], v[2] - hub[2]);
    return d(a) <= d(b) ? [a, b] : [b, a];
  });
  // Across the fan: each rail's heading in the bench plane, measured from the fan's mean heading.
  const heading = ([a, b]: [Vec3, Vec3]) => Math.atan2(b[2] - a[2], b[0] - a[0]);
  const mean = Math.atan2(rails.reduce((s, r) => s + Math.sin(heading(r)), 0), rails.reduce((s, r) => s + Math.cos(heading(r)), 0));
  const across = (r: [Vec3, Vec3]) => Math.atan2(Math.sin(heading(r) - mean), Math.cos(heading(r) - mean));
  return rails.sort((r, q) => across(r) - across(q));
}

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

describe('elevationDeg and azimuthDeg', () => {
  it('measure the pitch above the bench and the heading from −z, in degrees', () => {
    const s = Math.sqrt(3);
    expect(elevationDeg({ position: [0, 1, s], lookAt: [0, 0, 0], fov: 30 })).toBeCloseTo(30, 6);   // 2 units away, 1 up
    expect(elevationDeg({ position: [4, 2, 0], lookAt: [4, 2, -9], fov: 30 })).toBeCloseTo(0, 6);   // level
    expect(azimuthDeg({ position: [0, 5, 10], lookAt: [0, 0, -2], fov: 30 })).toBeCloseTo(0, 6);     // straight along −z
    expect(azimuthDeg({ position: [-8, 5, 4], lookAt: [3, 0, 4], fov: 30 })).toBeCloseTo(90, 6);     // along +x
    expect(azimuthDeg({ position: [8, 5, 4], lookAt: [-3, 0, 4], fov: 30 })).toBeCloseTo(-90, 6);    // along −x
    expect(azimuthDeg({ position: [10, 5, 12], lookAt: [0, 0, 2], fov: 30 })).toBeCloseTo(-45, 6);   // front-right 3/4
  });
});

describe('desktop clearance at the dwells (aspect 1.6)', () => {
  it('hero (0, 0): the whole quoter below the headline and right of the plate, its top near the deck, tight to the right edge; bot in frame; intake below the copy block; small machines cropped at the bottom edge', () => {
    const q = at(0, 0, [quoter]);
    expect(q.left, 'quoter left').toBeGreaterThanOrEqual(-0.20);
    expect(q.top, 'quoter top').toBeGreaterThanOrEqual(-0.12);
    expect(q.top, 'quoter top').toBeLessThanOrEqual(0.05);
    expect(q.right, 'quoter right').toBeLessThanOrEqual(1.02);
    expect(inFrame(at(0, 0, [bot])), 'bot in frame').toBe(true);
    expect(at(0, 0, SMALL).top, 'small machines top').toBeLessThanOrEqual(-0.72);
    expect(at(0, 0, [intake]).top, 'intake top').toBeLessThanOrEqual(-0.3);   // the hopper is under the plate and the honesty line otherwise
  });

  it('risen (0, 1): the quoter within [−0.7, 1.02] × [−1.02, 0.6]', () => {
    const q = at(0, 1, [quoter]);
    expect(q.left).toBeGreaterThanOrEqual(-0.7);
    expect(q.right).toBeLessThanOrEqual(1.02);
    expect(q.bottom).toBeGreaterThanOrEqual(-1.02);
    expect(q.top).toBeLessThanOrEqual(0.6);
  });

  it('more (1, 0.5): the whole quoter in frame, right of the copy column, from a high 3/4 (40–58°)', () => {
    const q = at(1, 0.5, [quoter]);
    expect(q.left).toBeGreaterThanOrEqual(-0.12);
    expect(q.right).toBeLessThanOrEqual(1.02);
    expect(q.top).toBeLessThanOrEqual(0.9);
    expect(q.bottom).toBeGreaterThanOrEqual(-1.02);
    expect(elevationDeg(poseAt(1, 0.5, 'desktop')), 'elevation').toBeGreaterThanOrEqual(40);
    expect(elevationDeg(poseAt(1, 0.5, 'desktop')), 'elevation').toBeLessThanOrEqual(58);
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

  it('heron (4, 0.7): the balance side-on (low, within 25° of its rail\'s normal), clear of the copy column and tall; the quoter behind it in frame', () => {
    const b = at(4, 0.7, [balance]);
    const pose = poseAt(4, 0.7, 'desktop');
    expect(b.left).toBeGreaterThanOrEqual(-0.12);
    expect(height(b)).toBeGreaterThanOrEqual(0.28);
    expect(intersectsFrame(at(4, 0.7, [quoter])), 'quoter intersects the frame').toBe(true);
    expect(elevationDeg(pose), 'elevation').toBeLessThanOrEqual(22);
    expect(Math.abs(azimuthDeg(pose)), '|azimuth|').toBeLessThanOrEqual(25);
  });

  it('darch (5, 0.7): the splitter low (pitched under 20°) and along its length from the fan end (50–70° round), clear of the copy column; one in, twelve out: the out-rails open across the frame; the balance and the intake behind it clear of the column too', () => {
    const s = at(5, 0.7, [splitter]);
    const pose = poseAt(5, 0.7, 'desktop');
    expect(s.left).toBeGreaterThanOrEqual(-0.12);
    expect(elevationDeg(pose), 'elevation').toBeLessThanOrEqual(20);
    expect(pose.position[1], 'camera height').toBeLessThanOrEqual(5.5);
    expect(azimuthDeg(pose), 'azimuth').toBeGreaterThanOrEqual(-70);
    expect(azimuthDeg(pose), 'azimuth').toBeLessThanOrEqual(-50);
    // The twelve out-rails lie flat and diverge across z. Seen down that spread they stack into one wedge: the earlier
    // pose (camera at y 2.2, 41° round from far in front) put all twelve rail ends inside 12° at the block, about 10 px
    // apart, at the frame's right edge. Here every rail end is in frame and right of the copy column, the fan opens at
    // least 45° at the block, and neighbouring ends sit at least 0.04 apart (x scaled by the aspect; about 18 px at 900).
    const rails = fanRails();
    expect(rails).toHaveLength(12);
    const near = rails.map(([a]) => projectPoint(a, pose, ASPECT.desktop)!);
    const ends = rails.map(([, b]) => projectPoint(b, pose, ASPECT.desktop)!);
    for (const [j, [x, y]] of ends.entries()) {
      expect(x >= -0.12 && x <= 1 && y >= -1 && y <= 1, `rail ${j} end in frame, right of the copy column (${x.toFixed(2)}, ${y.toFixed(2)})`).toBe(true);
    }
    const apex = [0, 1].map((k) => near.reduce((sum, p) => sum + p[k], 0) / near.length);
    const dir = ([x, y]: [number, number]) => Math.atan2(y - apex[1], (x - apex[0]) * ASPECT.desktop);
    const first = dir(ends[0]);
    const turn = ends.map((e) => Math.atan2(Math.sin(dir(e) - first), Math.cos(dir(e) - first)) * 180 / Math.PI);
    expect(Math.max(...turn) - Math.min(...turn), 'fan opening at the block, degrees').toBeGreaterThanOrEqual(45);
    for (let j = 1; j < ends.length; j++) {
      const gap = Math.hypot((ends[j][0] - ends[j - 1][0]) * ASPECT.desktop, ends[j][1] - ends[j - 1][1]);
      expect(gap, `rail ends ${j - 1} and ${j} apart`).toBeGreaterThanOrEqual(0.04);
    }
    // The balance's tile stacks and the intake's hopper are the tall, dense machines left of the splitter: from a low
    // front view they land in the copy column's band at the height of the darch copy, dark on dark. Each is either
    // right of the column or out of the frame.
    for (const [name, m] of [['balance', balance], ['intake', intake]] as const) {
      const b = at(5, 0.7, [m]);
      expect(b.left >= -0.16 || !intersectsFrame(b), `${name} right of the copy column or out of frame (L ${b.left.toFixed(2)} R ${b.right.toFixed(2)})`).toBe(true);
    }
  });

  it('summers (6, 0.7): the watch from high up (45° or more), clear of the copy column and wide', () => {
    const w = at(6, 0.7, [watch]);
    expect(w.left).toBeGreaterThanOrEqual(-0.12);
    expect(width(w)).toBeGreaterThanOrEqual(0.45);
    expect(elevationDeg(poseAt(6, 0.7, 'desktop')), 'elevation').toBeGreaterThanOrEqual(45);
  });

  it('alive (7, 0.8): pulled back and around to a front-right 3/4; the small machines large in front, every machine clear of the copy column; the quoter the wall behind', () => {
    // Gate G4 (spec §3.1 · 08). With the whole bench in frame the front row (balance to slot, 13 units along x) had to
    // span the right 58% of the width, which held the small machines to 0.72 of the height and let the balance and the
    // intake reach under the h2. From 45–65° round the row recedes toward the copy column instead: every machine but
    // the quoter is whole in frame and right of the column (08's copy is pinned through this dwell), the small
    // machines span most of the height, and the quoter rises behind the front row and runs out of the right edge.
    const pose = poseAt(7, 0.8, 'desktop');
    const names: Record<number, string> = { [intake]: 'intake', [balance]: 'balance', [splitter]: 'splitter', [watch]: 'watch', [bot]: 'bot', [slot]: 'slot' };
    for (const m of [intake, balance, splitter, watch, bot, slot]) expect(inFrame(at(7, 0.8, [m])), `${names[m]} in frame`).toBe(true);
    expect(at(7, 0.8, ALL).left, 'bench left').toBeGreaterThanOrEqual(-0.16);
    expect(height(at(7, 0.8, SMALL)), 'small machines height').toBeGreaterThanOrEqual(1.1);
    for (const m of SMALL) expect(height(at(7, 0.8, [m])), `${names[m]} height`).toBeGreaterThanOrEqual(0.2);
    const q = at(7, 0.8, [quoter]);
    expect(q.right, 'quoter runs out of the right edge').toBeGreaterThan(1);
    expect(Math.min(q.right, 1) - Math.max(q.left, -1), 'quoter visible width').toBeGreaterThanOrEqual(0.9);
    expect(q.top - at(7, 0.8, [splitter, watch]).top, 'quoter above the front row').toBeGreaterThanOrEqual(0.3);
    expect(azimuthDeg(pose), 'azimuth').toBeGreaterThanOrEqual(-65);
    expect(azimuthDeg(pose), 'azimuth').toBeLessThanOrEqual(-45);
    expect(elevationDeg(pose), 'elevation').toBeGreaterThanOrEqual(15);
    expect(elevationDeg(pose), 'elevation').toBeLessThanOrEqual(30);
  });

  it('yours (8, 0.6): the slot from low down (under 20°), clear of the copy column and legible', () => {
    const s = at(8, 0.6, [slot]);
    expect(s.left).toBeGreaterThanOrEqual(-0.12);
    expect(width(s)).toBeGreaterThanOrEqual(0.2);
    expect(elevationDeg(poseAt(8, 0.6, 'desktop')), 'elevation').toBeLessThanOrEqual(20);
  });
});

describe('anti-journey', () => {
  it('the desktop camera travels under 60 units over the whole page', () => {
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
    expect(length).toBeLessThan(60);
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
