// The house grammar (spec §5.4): one sentence → one house of real parts. parts.length is the number the tag prints.
// House-local space: origin at the ground centre of the footprint, x along the width (front face toward +z, the
// camera), y up. Every part is an axis-aligned box {min, max}; sloped roof sides are stepped courses of slats.
import type { House, HousePart, RoofKind, Vec3 } from './types';
import { hashString } from './hash';
import { PALETTE } from './palette';

/** Grammar constants (§5.4). */
export const HOUSE = {
  maxWords: 24,
  tierHeight: 2.5,     // one storey
  course: 0.25,        // plank height
  plank: 0.5,          // plank length along a wall
  slat: 0.25,          // roof slat width along x
  wall: 0.1,           // wall thickness
  pitch: 0.6,          // pitched/hipped rise = pitch · depth / 2
  window: { w: 0.7, h: 0.8, sill: 1.0, bar: 0.08, out: 0.06 },
  overhang: 0.2,
} as const;

/** Stepped courses per sloped roof side (pitched and hipped). width / 0.25 is always divisible by 4. */
export const ROOF_COURSES = 4;

const ROOFS: readonly RoofKind[] = ['pitched', 'hipped', 'flat'];

/** Whitespace-split non-empty word count, clamped 1–24. */
export function countWords(sentence: string): number {
  const n = sentence.split(/\s+/).filter((w) => w.length > 0).length;
  return Math.min(HOUSE.maxWords, Math.max(1, n));
}

/** The roof's rise above the wall top (flat roofs are a 0.15 slab). */
export function roofRise(roof: RoofKind, depth: number): number {
  return roof === 'flat' ? 0.15 : HOUSE.pitch * (depth / 2);
}

/**
 * Build the house for `sentence`. Deterministic: the seed is FNV-1a of the trimmed, lower-cased sentence, so
 * "  Hello World " and "hello world" build the same house. Never throws; an empty sentence counts as one word.
 */
export function houseFromSentence(sentence: string): House {
  const seed = hashString(sentence.trim().toLowerCase());
  const words = countWords(sentence);
  const tiers = 1 + Math.floor((words - 1) / 8);
  const bays = 2 + Math.floor(words / 3);
  const width = bays;
  const depth = 3 + ((seed >>> 2) % 2);
  const roof = ROOFS[(seed >>> 4) % 3];
  const half = Math.floor(width / 2);
  const windowsPerFace = { front: half, back: half, side: 1 + ((seed >>> 6) % 2) };
  const porch = (seed & 1) === 1;

  const W = width / 2, D = depth / 2, T = HOUSE.wall;
  const wallTop = tiers * HOUSE.tierHeight;
  const raw: Omit<HousePart, 'order'>[] = [];
  const box = (kind: HousePart['kind'], min: Vec3, max: Vec3) => raw.push({ kind, min, max });

  // Wall planks: one per 0.5 of wall length per 0.25 course, 10 courses per tier, all four faces.
  for (let tier = 0; tier < tiers; tier++) {
    for (let c = 0; c < HOUSE.tierHeight / HOUSE.course; c++) {
      const y0 = tier * HOUSE.tierHeight + c * HOUSE.course, y1 = y0 + HOUSE.course;
      for (let i = 0; i < width / HOUSE.plank; i++) {
        const x0 = -W + i * HOUSE.plank, x1 = x0 + HOUSE.plank;
        box('plank', [x0, y0, D - T], [x1, y1, D]);          // front
        box('plank', [x0, y0, -D], [x1, y1, -D + T]);        // back
      }
      for (let i = 0; i < depth / HOUSE.plank; i++) {
        const z0 = -D + i * HOUSE.plank, z1 = z0 + HOUSE.plank;
        box('plank', [-W, y0, z0], [-W + T, y1, z1]);        // left
        box('plank', [W - T, y0, z0], [W, y1, z1]);          // right
      }
    }
  }

  // Windows: per tier, `front` on the front face, `back` on the back, `side` on each side; four frame bars each.
  const windows: Vec3[] = [];
  const { w: ww, h: wh, sill, bar, out } = HOUSE.window;
  for (let tier = 0; tier < tiers; tier++) {
    const cy = tier * HOUSE.tierHeight + sill + wh / 2;
    const y0 = cy - wh / 2, y1 = cy + wh / 2;
    const faceX = (n: number, z: number, zIn: number, zOut: number) => {
      for (let i = 0; i < n; i++) {
        const cx = -W + ((i + 0.5) * width) / n;
        windows.push([cx, cy, z]);
        const x0 = cx - ww / 2, x1 = cx + ww / 2;
        box('frame', [x0 - bar, y1, zIn], [x1 + bar, y1 + bar, zOut]);   // head
        box('frame', [x0 - bar, y0 - bar, zIn], [x1 + bar, y0, zOut]);   // sill
        box('frame', [x0 - bar, y0, zIn], [x0, y1, zOut]);               // left jamb
        box('frame', [x1, y0, zIn], [x1 + bar, y1, zOut]);               // right jamb
      }
    };
    const faceZ = (n: number, x: number, xIn: number, xOut: number) => {
      for (let i = 0; i < n; i++) {
        const cz = -D + ((i + 0.5) * depth) / n;
        windows.push([x, cy, cz]);
        const z0 = cz - ww / 2, z1 = cz + ww / 2;
        box('frame', [xIn, y1, z0 - bar], [xOut, y1 + bar, z1 + bar]);
        box('frame', [xIn, y0 - bar, z0 - bar], [xOut, y0, z1 + bar]);
        box('frame', [xIn, y0, z0 - bar], [xOut, y1, z0]);
        box('frame', [xIn, y0, z1], [xOut, y1, z1 + bar]);
      }
    };
    faceX(windowsPerFace.front, D + out / 2, D, D + out);
    faceX(windowsPerFace.back, -D - out / 2, -D - out, -D);
    faceZ(windowsPerFace.side, -W - out / 2, -W - out, -W);
    faceZ(windowsPerFace.side, W + out / 2, W, W + out);
  }

  // Porch: four deck boards laid flat in front of the door (kind 'post' so the part count holds).
  if (porch) {
    for (let i = 0; i < 4; i++) {
      const x0 = -W + 0.3 + (i * (width - 0.6)) / 4;
      const x1 = -W + 0.3 + ((i + 1) * (width - 0.6)) / 4 - 0.05;
      box('post', [x0, 0, D], [x1, 0.18, D + 1.35]);
    }
  }

  // Roof slats: width / 0.25 per roof side (two sides for pitched and hipped, one flat slab for flat).
  // Every part is an axis-aligned box, so a sloped side is laid as ROOF_COURSES stepped courses from the eave up to
  // the ridge line (z = 0), each course `width / 0.25 / ROOF_COURSES` boards wide: same count, and it reads as a pitch.
  // Hipped courses also step in from both gable ends.
  const rise = roofRise(roof, depth);
  const O = HOUSE.overhang;
  if (roof === 'flat') {
    for (let i = 0; i < width / HOUSE.slat; i++) {
      const x0 = -W + i * HOUSE.slat;
      box('slat', [x0, wallTop, -D - O], [x0 + HOUSE.slat, wallTop + rise, D + O]);
    }
  } else {
    const perCourse = width / HOUSE.slat / ROOF_COURSES;   // = width, an integer
    for (let r = 0; r < ROOF_COURSES; r++) {
      const inset = roof === 'hipped' ? (r / ROOF_COURSES) * Math.min(W, D) : 0;
      const xa = -W - O + inset, xb = W + O - inset;
      const zOut = (D + O) * (1 - r / ROOF_COURSES), zIn = (D + O) * (1 - (r + 1) / ROOF_COURSES);
      const y0 = wallTop + (rise * r) / ROOF_COURSES, y1 = wallTop + (rise * (r + 1)) / ROOF_COURSES;
      for (let i = 0; i < perCourse; i++) {
        const x0 = xa + ((xb - xa) * i) / perCourse, x1 = xa + ((xb - xa) * (i + 1)) / perCourse;
        box('slat', [x0, y0, zIn], [x1, y1, zOut]);       // front side
        box('slat', [x0, y0, -zOut], [x1, y1, -zIn]);     // back side
      }
    }
  }

  // Chimney: one, at the back right, through the roof.
  box('chimney', [W - 0.9, wallTop, -0.6], [W - 0.4, wallTop + rise + 0.8, -0.1]);

  // Build order is bottom to top: a stable sort on each part's lowest y. order === index.
  const indexed = raw.map((p, i) => ({ p, i }));
  indexed.sort((a, b) => a.p.min[1] - b.p.min[1] || a.i - b.i);
  const parts: HousePart[] = indexed.map(({ p }, order) => ({ kind: p.kind, min: p.min, max: p.max, order }));

  return { seed, words, tiers, bays, width, depth, roof, windowsPerFace, porch, parts, windows };
}

/** Expected part count from the §5.4 formulas (what parts.length must equal). */
export function expectedParts(h: Pick<House, 'width' | 'depth' | 'tiers' | 'roof' | 'windowsPerFace' | 'porch'>): number {
  const perimeter = 2 * (h.width + h.depth);
  const planks = (perimeter / HOUSE.plank) * (HOUSE.tierHeight / HOUSE.course) * h.tiers;
  const slats = (h.width / HOUSE.slat) * (h.roof === 'flat' ? 1 : 2);
  const wpf = h.windowsPerFace;
  const frames = (wpf.front + wpf.back + 2 * wpf.side) * h.tiers * 4;
  return planks + slats + frames + (h.porch ? 4 : 0) + 1;
}

const fmt = (v: number) => (Math.round(v * 100) / 100).toString();

/**
 * Front elevation of `house` as an SVG string, for the no-WebGL tier (§11). Body and roof from the dark building
 * ramp, windows warm (lit). Scale 20 px per unit, 1-unit margin. Only self-closing children inside one <svg>.
 */
export function houseSvg(house: House): string {
  const S = 20, M = 1;
  const W = house.width, wallTop = house.tiers * HOUSE.tierHeight;
  const rise = roofRise(house.roof, house.depth);
  const chimneyTop = wallTop + rise + 0.8;
  const vw = (W + 2 * HOUSE.overhang + 2 * M) * S;
  const vh = (chimneyTop + 2 * M) * S;
  const X = (x: number) => fmt((x + W / 2 + HOUSE.overhang + M) * S);   // house-local x → svg x
  const Y = (y: number) => fmt((chimneyTop + M - y) * S);              // house-local y → svg y (down)
  const L = (len: number) => fmt(len * S);
  const wall = PALETTE.wall, roofC = PALETTE.roof, lit = PALETTE.warm;
  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(vw)} ${fmt(vh)}" width="${fmt(vw)}" height="${fmt(vh)}" aria-hidden="true">`);
  // chimney first so the roof overlaps its foot
  out.push(`<rect x="${X(W / 2 - 0.9)}" y="${Y(chimneyTop)}" width="${L(0.5)}" height="${L(chimneyTop - wallTop)}" fill="${roofC}"/>`);
  out.push(`<rect x="${X(-W / 2)}" y="${Y(wallTop)}" width="${L(W)}" height="${L(wallTop)}" fill="${wall}"/>`);
  const eaveL = -W / 2 - HOUSE.overhang, eaveR = W / 2 + HOUSE.overhang;
  if (house.roof === 'flat') {
    out.push(`<rect x="${X(eaveL)}" y="${Y(wallTop + rise)}" width="${L(eaveR - eaveL)}" height="${L(rise)}" fill="${roofC}"/>`);
  } else {
    // Front elevation of a ridge along x: pitched shows a band (eave line to ridge line); hipped a trapezoid.
    const inset = house.roof === 'hipped' ? Math.min(W / 2, house.depth / 2) : 0;
    const pts = [[eaveL, wallTop], [eaveR, wallTop], [eaveR - inset, wallTop + rise], [eaveL + inset, wallTop + rise]]
      .map(([x, y]) => `${X(x)},${Y(y)}`).join(' ');
    out.push(`<polygon points="${pts}" fill="${roofC}"/>`);
  }
  for (const [x, y, z] of house.windows) {
    if (z <= house.depth / 2) continue;   // front face only
    out.push(`<rect x="${X(x - HOUSE.window.w / 2)}" y="${Y(y + HOUSE.window.h / 2)}" width="${L(HOUSE.window.w)}" height="${L(HOUSE.window.h)}" fill="${lit}"/>`);
  }
  if (house.porch) {
    for (let i = 0; i < 4; i++) {
      const cx = -W / 2 + 0.3 + (i * (W - 0.6)) / 3;
      out.push(`<rect x="${X(cx - 0.075)}" y="${Y(2.2)}" width="${L(0.15)}" height="${L(2.2)}" fill="${roofC}"/>`);
    }
  }
  out.push('</svg>');
  return out.join('');
}
