// The visitor's sentence becomes a machine: one cell per word, one rail per row of words,
// a spoked ring as the motor at the rails' -x end, and a lever last. Pure: no React, no DOM.
// The frame is centred on the slot it builds inside (configs/slot.ts, same origin in bench.ts):
// a full row of twelve cells spans the slot's field and each rail lies on one of its four pencil rails.
import { KIND, MACHINE, MACHINE_NAMES, PRIMITIVE, type MachineConfig, type PartSpec, type Vec3 } from './types';
import { IDENTITY_Q } from './math';
import { hash2, hashString } from './hash';

/** Instances the kits reserve for the visitor at scale 0 until a sentence is built. */
export const VISITOR_RESERVE = 30;

export const WORD_CAP = 24;
export const SENTENCE_CAP = 4;
/** A row holds up to this many cells; a longer run wraps onto the next rail, and what does not fit on the last rail is dropped. */
export const ROW_CAP = 12;
export const WORD_PITCH = 0.14;
/** Row spacing along z: the slot's pencil-rail pitch, so rows land at z = -0.45, -0.15, 0.15, 0.45. */
export const ROW_PITCH = 0.3;

/** Ring, spoke and lever: the parts every non-empty sentence gets besides its words and rails. */
const FIXED_PARTS = 3;
const RAIL_H = 0.12;                          // bar primitive is Box(1, 0.12, 0.12); rails rest on the bench like the slot's
const ROW_X0 = -(ROW_CAP * WORD_PITCH) / 2;   // -0.84: rows start here, so a full row is centred on the slot
const MOTOR: Vec3 = [ROW_X0 - 0.3, 0.25, 0];  // ring centre past the rails' -x end; torus in the xy plane spins about z, face-on from the front
const RING_SCALE = 0.4;                       // torus radius 0.5 * 0.4 = 0.2

const TERMINATED = /[.!?]['")\]]*$/;

/** Row index per word that fits. A new row opens at a sentence boundary or when a row is full, up to four rows; once the last row is full the rest is left out. */
function rowsFor(words: readonly string[]): number[] {
  const rows: number[] = [];
  let row = 0, inRow = 0;
  for (let i = 0; i < words.length; i++) {
    if (i > 0 && (inRow >= ROW_CAP || TERMINATED.test(words[i - 1])) && row < SENTENCE_CAP - 1) { row++; inRow = 0; }
    else if (inRow >= ROW_CAP) break;
    rows.push(row); inRow++;
  }
  return rows;
}

const rowCount = (words: readonly string[]) => (words.length === 0 ? 0 : rowsFor(words)[words.length - 1] + 1);

/** Whitespace-split tokens: cap 24, only what fits on four rails of twelve, and 23 when four rails would push the build past the reserve; sentences = runs ending in . ! ? or at the end of the text (min 1 if any word, cap 4). */
export function parseSentence(text: string): { words: string[]; sentences: number } {
  let words = text.split(/\s+/).filter(Boolean).slice(0, WORD_CAP);
  words = words.slice(0, rowsFor(words).length);
  while (words.length > 0 && words.length + rowCount(words) + FIXED_PARTS > VISITOR_RESERVE) words = words.slice(0, -1);
  if (words.length === 0) return { words, sentences: 0 };
  let runs = 0;
  words.forEach((w, i) => { if (TERMINATED.test(w) || i === words.length - 1) runs++; });
  return { words, sentences: Math.min(SENTENCE_CAP, runs) };
}

function buildVisitor(text: string): PartSpec[] {
  const { words } = parseSentence(text);
  if (words.length === 0) return [];
  const rows = rowsFor(words);
  const nRows = rows[rows.length - 1] + 1;
  const seed = hashString(words.join(' '));
  const rowZ = (r: number) => (r - (SENTENCE_CAP - 1) / 2) * ROW_PITCH;
  const parts: PartSpec[] = [];

  // Group 0: rails, one per row, along x from the frame's -x end on the slot's pencil rails; then the motor.
  for (let r = 0; r < nRows; r++) {
    const n = rows.filter((x) => x === r).length;
    const len = n * WORD_PITCH;
    parts.push({ primitive: PRIMITIVE.bar, kind: KIND.static, position: [ROW_X0 + len / 2, RAIL_H / 2, rowZ(r)], quaternion: IDENTITY_Q, scale: [len, 1, 1], param: [0, 0, 0, 0], col: -1, module: `row${r}`, group: 0, explodeMode: 'module' });
  }
  parts.push({ primitive: PRIMITIVE.ring, kind: KIND.spin, position: MOTOR, quaternion: IDENTITY_Q, scale: [RING_SCALE, RING_SCALE, RING_SCALE], param: [2, 2.0, 0, 0], col: -1, module: 'motor', group: 0, explodeMode: 'module' });
  parts.push({ primitive: PRIMITIVE.bar, kind: KIND.spin, position: MOTOR, quaternion: IDENTITY_Q, scale: [RING_SCALE, RING_SCALE, RING_SCALE], param: [2, 2.0, 0, 0], col: -1, module: 'motor', group: 0, explodeMode: 'module' });

  // Group 1: one cell per word, sitting on its rail, height from word length, pinging on a cadence seeded from the sentence.
  let col = 0, prevRow = 0;
  words.forEach((w, i) => {
    const r = rows[i];
    if (r !== prevRow) { col = 0; prevRow = r; }
    parts.push({
      primitive: PRIMITIVE.cell, kind: KIND.ping,
      position: [ROW_X0 + WORD_PITCH * (col + 0.5), RAIL_H, rowZ(r)], quaternion: IDENTITY_Q,
      scale: [0.1, 0.15 + 0.03 * Math.min(w.length, 12), 0.1],
      param: [1.2 + 0.6 * hash2(i, seed), i / words.length, 1.6, 0],
      col, module: `row${r}`, group: 1, explodeMode: 'module',
    });
    col++;
  });

  // Group 2: the lever alone, a short bar above the motor pivoted at its -x end, dropping about z toward the rails.
  parts.push({ primitive: PRIMITIVE.bar, kind: KIND.lever, position: [MOTOR[0] + 0.18, 0.52, 0], quaternion: IDENTITY_Q, scale: [0.36, 0.7, 0.7], param: [2, -0.5, 0, 0], col: -1, module: 'lever', group: 2, explodeMode: 'module' });
  return parts;
}

export function visitorConfig(text: string): MachineConfig {
  return {
    id: MACHINE.visitor,
    name: MACHINE_NAMES[MACHINE.visitor],
    // The field the rows fill, matching the slot's; the motor and lever hang 0.3 past its -x end.
    footprint: { w: ROW_CAP * WORD_PITCH, d: SENTENCE_CAP * ROW_PITCH },
    build: () => buildVisitor(text),
  };
}
