// Test helpers for the Stage 3 frame tests (not a test file itself): section ranges for a document laid out at the
// spec §3 heights, g at a section-local s, and a FrameInputs with defaults.
import { SECTIONS, sectionRanges } from '@/valley/sections';
import type { SectionId, SectionRange } from '@/valley/types';
import type { FrameInputs } from './driverCore';

export function fixtureRanges(vh = 900): SectionRange[] {
  const tops: number[] = [];
  let y = 0;
  for (const s of SECTIONS) {
    tops.push(y);
    y += (s.heightVh * vh) / 100;
  }
  return sectionRanges(tops, y, vh);
}

export function gAt(ranges: SectionRange[], id: SectionId, s: number): number {
  const r = ranges.find((x) => x.id === id);
  if (!r) throw new Error(`no range for ${id}`);
  return r.start + s * (r.end - r.start);
}

export function fixtureInputs(ranges: SectionRange[], over: Partial<FrameInputs> = {}): FrameInputs {
  return {
    g: 0, ranges, t: 10, dt: 1 / 60, introT: null, buildT: null, pulseT: null, flickerT: null, reducedMotion: false,
    ...over,
  };
}
