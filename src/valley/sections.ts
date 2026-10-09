// The eight sections (spec §3): ids, minimum heights, tod at each section's end, and the view each section turns to.
// sectionRanges and locate keep the signatures ScrollProvider used with src/bench (spec §3, §15).
import type { SectionId, SectionRange, View } from './types';

export interface SectionDef { id: SectionId; heightVh: number; todEnd: number; view: View; viewPortrait: View }

const view = (yaw: number, pitch: number, fovScale: number): View => ({ yaw, pitch, fovScale });

/** viewPortrait is the spec §3 portrait yaw column; pitch and fovScale are shared with the landscape view. */
export const SECTIONS: readonly SectionDef[] = [
  { id: 'open',    heightVh: 100, todEnd: 0,    view: view(0, 0, 1),     viewPortrait: view(0, 0, 1) },
  { id: 'kalshi',  heightVh: 180, todEnd: 0.3,  view: view(4, 1, 0.96),  viewPortrait: view(0, 1, 0.96) },
  { id: 'heron',   heightVh: 120, todEnd: 0.4,  view: view(2, 0, 0.98),  viewPortrait: view(0, 0, 0.98) },
  { id: 'darch',   heightVh: 180, todEnd: 0.6,  view: view(7, 0, 0.95),  viewPortrait: view(12, 0, 0.95) },
  { id: 'summers', heightVh: 100, todEnd: 0.65, view: view(-6, 3, 0.97), viewPortrait: view(-12, 3, 0.97) },
  { id: 'alive',   heightVh: 120, todEnd: 0.72, view: view(0, 1, 1.04),  viewPortrait: view(0, 1, 1.04) },
  { id: 'yours',   heightVh: 140, todEnd: 0.8,  view: view(4, -2, 0.97), viewPortrait: view(1, -8, 0.5) },   // portrait: tight on the lot, below the copy (§11 reframe)
  { id: 'contact', heightVh: 150, todEnd: 1,    view: view(-3, -1, 1),   viewPortrait: view(-6, -1, 1) },
];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * g ranges: a section's range starts when its top reaches the viewport top and ends where the next one starts;
 * the first starts at 0 and the last ends at 1. `tops` are the sections' page tops in px, in SECTIONS order.
 */
export function sectionRanges(tops: number[], docHeight: number, vh: number): SectionRange[] {
  const max = Math.max(1, docHeight - vh);
  const last = SECTIONS.length - 1;
  return SECTIONS.map((s, i) => ({
    id: s.id,
    start: i === 0 ? 0 : clamp01((tops[i] ?? 0) / max),
    end: i === last ? 1 : clamp01((tops[i + 1] ?? 0) / max),
  }));
}

export interface Located { section: SectionId; s: number; index: number }

/** locate() writing into `out` instead of allocating, for per-frame callers. Returns `out`. */
export function locateInto(g: number, ranges: SectionRange[], out: Located): Located {
  const last = ranges.length - 1;
  if (last < 0) { out.section = 'open'; out.s = 0; out.index = 0; return out; }
  if (g <= ranges[0].start) { out.section = ranges[0].id; out.s = 0; out.index = 0; return out; }
  if (g >= 1) { out.section = ranges[last].id; out.s = 1; out.index = last; return out; }
  for (let i = 0; i <= last; i++) {
    const r = ranges[i];
    if (g < r.end || i === last) {
      const span = Math.max(1e-6, r.end - r.start);
      out.section = r.id; out.s = clamp01((g - r.start) / span); out.index = i;
      return out;
    }
  }
  out.section = ranges[last].id; out.s = 1; out.index = last;
  return out;
}

/** The section g falls in and the local progress s (0..1) inside its range. With no ranges yet, open at s = 0. */
export function locate(g: number, ranges: SectionRange[]): Located {
  return locateInto(g, ranges, { section: 'open', s: 0, index: 0 });
}
