// Dead-scroll audit (design §"Dead-scroll rule"): no g range should sit still. Sampling g finely and looking at every
// 15-sample window catches a flat stretch of camera + merge + compile motion that a handful of keyframe dwells would
// otherwise hide.
import { describe, it, expect } from 'vitest';
import { SECTIONS, sectionRanges } from './sections';
import { MACHINE_COUNT } from './types';
import { createSceneState, sceneState } from './sceneState';

// Desktop ranges built the same way as sceneState.test.ts.
const vh = 900;
const tops = SECTIONS.reduce<number[]>((acc, s, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SECTIONS[i - 1].vh.desktop * vh / 100);
  return acc;
}, []);
const docHeight = tops[8] + SECTIONS[8].vh.desktop * vh / 100;
const ranges = sectionRanges(tops, docHeight, vh);

const STEP = 0.002;
const WINDOW = 15;          // 14 steps between samples, ≈ 0.03 in g
const HOLD_END = 0.03;      // the hero hold while the copy is sticky (section 0, u 0..0.15): the one deliberate dead stretch
const CAMERA_MIN = 0.02;    // units, Euclidean over position ++ lookAt
const SCALAR_MIN = 0.01;    // merge, burst, or one compileTarget entry

/** Euclidean distance between two poses' position and lookAt, treated as one 6-vector. */
function poseDelta(a: { position: number[]; lookAt: number[] }, b: { position: number[]; lookAt: number[] }): number {
  let sum = 0;
  for (let k = 0; k < 3; k++) {
    sum += (b.position[k] - a.position[k]) ** 2;
    sum += (b.lookAt[k] - a.lookAt[k]) ** 2;
  }
  return Math.sqrt(sum);
}

describe('dead-scroll audit', () => {
  it('every window outside the hero hold moves the camera, the merge/burst, or a compile target', () => {
    const count = Math.round(1 / STEP) + 1;
    const samples = Array.from({ length: count }, (_, i) => sceneState(Math.min(1, i * STEP), ranges, 'desktop', createSceneState()));

    const dead: string[] = [];
    for (let start = 0; start + WINDOW <= samples.length; start++) {
      const g0 = start * STEP;
      if (g0 < HOLD_END) continue; // the hero hold: excluded by design, not a flat stretch to fix

      let camera = 0, merge = 0, burst = 0;
      const compile = new Array(MACHINE_COUNT).fill(0);
      for (let i = start; i < start + WINDOW - 1; i++) {
        const a = samples[i], b = samples[i + 1];
        camera += poseDelta(a.pose, b.pose);
        merge += Math.abs(b.merge - a.merge);
        burst += Math.abs(b.burst - a.burst);
        for (let m = 0; m < MACHINE_COUNT; m++) {
          const av = a.compileTarget[m], bv = b.compileTarget[m];
          if (av == null || bv == null) continue;
          compile[m] += Math.abs(bv - av);
        }
      }

      const moved = camera >= CAMERA_MIN || merge >= SCALAR_MIN || burst >= SCALAR_MIN || compile.some((c) => c >= SCALAR_MIN);
      if (!moved) {
        const g1 = g0 + (WINDOW - 1) * STEP;
        dead.push(`g ∈ [${g0.toFixed(3)}, ${g1.toFixed(3)}] section ${samples[start].section} (${SECTIONS[samples[start].section].id})`);
      }
    }

    expect(dead, `flat windows found:\n${dead.join('\n')}`).toEqual([]);
  });
});
