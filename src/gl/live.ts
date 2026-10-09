// Per-frame values the DOM reads in its own rAF, written by Driver.tsx (spec §6: React never re-renders on scroll).
// No three import, so site components can read it without pulling three into their chunk.
export const LIVE: { ridge: number } = { ridge: 0 };
