import { MACHINE, type MachineId, type Tier } from './types';

export interface SectionDef {
  id: string;
  vh: { desktop: number; phone: number };
  machine: MachineId;                 // the machine this section is about (camera subject)
  /** Scrubbed compile in this section: machine and the local-u window. null = no build. */
  build: { machine: MachineId; from: number; to: number } | null;
  /** Local u at which the camera has finished travelling to this section's pose. */
  travelEnd: number;
  headingAt: number;                  // local u at which the heading reveals
}

export const SECTIONS: readonly SectionDef[] = [
  { id: 'sentence', vh: { desktop: 140, phone: 140 }, machine: MACHINE.quoter, build: null, travelEnd: 1.0, headingAt: 0 },
  { id: 'more',     vh: { desktop: 100, phone: 220 }, machine: MACHINE.quoter, build: null, travelEnd: 0.10, headingAt: 0.12 },
  { id: 'first',    vh: { desktop: 60,  phone: 60  }, machine: MACHINE.bot,    build: null, travelEnd: 0.30, headingAt: 0.12 },
  { id: 'kalshi',   vh: { desktop: 100, phone: 100 }, machine: MACHINE.quoter, build: { machine: MACHINE.intake,   from: 0.15, to: 0.45 }, travelEnd: 0.25, headingAt: 0.12 },
  { id: 'heron',    vh: { desktop: 90,  phone: 90  }, machine: MACHINE.balance, build: { machine: MACHINE.balance, from: 0.12, to: 0.45 }, travelEnd: 0.15, headingAt: 0.12 },
  { id: 'darch',    vh: { desktop: 90,  phone: 90  }, machine: MACHINE.splitter, build: { machine: MACHINE.splitter, from: 0.12, to: 0.40 }, travelEnd: 0.15, headingAt: 0.12 },
  { id: 'summers',  vh: { desktop: 80,  phone: 80  }, machine: MACHINE.watch,  build: { machine: MACHINE.watch,    from: 0.12, to: 0.35 }, travelEnd: 0.15, headingAt: 0.12 },
  { id: 'alive',    vh: { desktop: 110, phone: 110 }, machine: MACHINE.quoter, build: null, travelEnd: 0.60, headingAt: 0.12 },
  { id: 'yours',    vh: { desktop: 100, phone: 100 }, machine: MACHINE.slot,   build: null, travelEnd: 0.25, headingAt: 0.12 },
];

export type SectionId = (typeof SECTIONS)[number]['id'];
export const SECTION_INDEX: Record<string, number> = Object.fromEntries(SECTIONS.map((s, i) => [s.id, i]));

export function pageHeightVh(tier: Tier): number {
  return SECTIONS.reduce((sum, s) => sum + s.vh[tier], 0);
}

export interface SectionRange { id: string; start: number; end: number }

/** g ranges: a section spans from its top reaching the viewport top to the next section's top doing so. */
export function sectionRanges(tops: number[], docHeight: number, vh: number): SectionRange[] {
  const max = Math.max(1, docHeight - vh);
  return SECTIONS.map((s, i) => ({
    id: s.id,
    start: i === 0 ? 0 : Math.min(1, tops[i] / max),
    end: i === SECTIONS.length - 1 ? 1 : Math.min(1, tops[i + 1] / max),
  }));
}

export function locate(g: number, ranges: SectionRange[]): { index: number; u: number } {
  if (g <= 0) return { index: 0, u: 0 };
  if (g >= 1) return { index: ranges.length - 1, u: 1 };
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (g < r.end || i === ranges.length - 1) {
      const span = Math.max(1e-6, r.end - r.start);
      return { index: i, u: Math.min(1, Math.max(0, (g - r.start) / span)) };
    }
  }
  return { index: ranges.length - 1, u: 1 };
}
