// Scroll time: every scrubbed quantity as one pure function of g. Reverses exactly.
import { MACHINE, MACHINE_COUNT, type MachineId, type Tier } from './types';
import { SECTIONS, SECTION_INDEX, locate, type SectionRange } from './sections';
import { evaluatePose } from './camera';
import { clamp01, smoothstep } from './math';

export interface SceneState {
  section: number; u: number;
  pose: { position: number[]; lookAt: number[]; fov: number };
  compileTarget: (number | null)[];   // per machine; null = not scroll-driven (quoter, visitor)
  merge: number;                      // 0..6
  lean: number;                       // -1..1
  burst: number;                      // 0..1 (merge burst-back progress, drives the merge ink partition)
  active: MachineId;                  // shadow-fit subject
  trickle: boolean;
  rung: number;                       // -1..5, lit ladder rung in section 02
  click: number;                      // -1..3, revealed copy line in section 02
}

/** Section 02 merge phases in local u: six clicks, a hold at level 6, then the burst back. */
const MERGE = { levels: 6, start: 0.10, end: 0.65, holdEnd: 0.78, clickWindow: 0.3 } as const;
const MORE = SECTION_INDEX.more;
const ALIVE = SECTION_INDEX.alive;

export function createSceneState(): SceneState {
  return {
    section: 0, u: 0,
    pose: { position: [0, 0, 0], lookAt: [0, 0, 0], fov: 0 },
    compileTarget: new Array<number | null>(MACHINE_COUNT).fill(0),
    merge: 0, lean: 0, burst: 0, active: MACHINE.quoter, trickle: true, rung: -1, click: -1,
  };
}

export function sceneState(g: number, ranges: SectionRange[], tier: Tier, out: SceneState): SceneState {
  const { index: section, u } = locate(g, ranges);
  out.section = section;
  out.u = u;
  evaluatePose(section, u, tier, out.pose);

  // Compile targets: scrubbed inside a section's build window, 1 once its section is behind us.
  const ct = out.compileTarget;
  for (let m = 0; m < MACHINE_COUNT; m++) ct[m] = 0;
  ct[MACHINE.quoter] = null;
  ct[MACHINE.visitor] = null;
  ct[MACHINE.bot] = 1;
  ct[MACHINE.slot] = 1;
  for (let i = 0; i < SECTIONS.length; i++) {
    const b = SECTIONS[i].build;
    if (!b) continue;
    ct[b.machine] = i < section ? 1 : i > section ? 0 : clamp01((u - b.from) / (b.to - b.from));
  }

  // Merge: six clicks, each a smoothstep over the first 30% of its slice then a hold; hold at 6; burst back with a lean kick.
  let merge = 0, burst = 0, lean = 0;
  if (section === MORE) {
    if (u >= MERGE.holdEnd) {
      burst = clamp01((u - MERGE.holdEnd) / (1 - MERGE.holdEnd));
      merge = MERGE.levels * (1 - burst);
      lean = Math.sin(Math.PI * burst);
    } else if (u >= MERGE.end) {
      merge = MERGE.levels;
    } else if (u > MERGE.start) {
      const x = MERGE.levels * (u - MERGE.start) / (MERGE.end - MERGE.start);
      const level = Math.floor(x);
      merge = Math.min(MERGE.levels, level + smoothstep(0, MERGE.clickWindow, x - level));
    }
  }
  out.merge = merge;
  out.burst = burst;
  out.lean = lean;
  out.rung = Math.max(-1, Math.min(MERGE.levels - 1, Math.floor(merge) - 1));
  out.click = burst > 0.5 ? 3 : burst > 0 ? 2 : merge >= 3 ? 1 : merge >= 1 ? 0 : -1;

  out.active = SECTIONS[section].machine;
  out.trickle = section !== ALIVE;
  return out;
}
