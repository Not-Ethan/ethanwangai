// Reduced-motion view (spec §11): view offsets cut at section boundaries instead of easing. Allocation-free for the
// frame loop. The reduced pulse is Stage 3's reducedPulse in ./pulse.
import { SECTIONS } from '@/valley/sections';
import type { SectionRange, View } from '@/valley/types';

/** The view of the section g is in, with no easing; ranges are in SECTIONS order. */
export function cutView(g: number, ranges: SectionRange[], portrait: boolean, out: View): View {
  let index = 0;
  if (ranges.length > 0) {
    index = ranges.length - 1;
    for (let i = 0; i < ranges.length; i++) {
      if (g < ranges[i].end) { index = i; break; }
    }
  }
  const sec = SECTIONS[Math.min(index, SECTIONS.length - 1)];
  const v = portrait ? sec.viewPortrait : sec.view;
  out.yaw = v.yaw;
  out.pitch = v.pitch;
  out.fovScale = v.fovScale;
  return out;
}
