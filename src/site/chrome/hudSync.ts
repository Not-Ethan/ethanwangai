// The chrome's per-frame sync (design §3.1, §9, task 3.6): a plain DOM rAF loop, outside R3F, that reads `hud`
// (gl/hud.ts, which Clocks writes every frame) and writes only what changed: the hero ladder's lines, parts and
// running clock, the alive section's uptime, the footer's total, the section rail's current item, section 02's lit
// rung and its revealed copy lines. No React state and no layout reads: every node is looked up once, at start, and
// the last value written to each is kept here, so a frame where nothing changed touches no DOM at all.
import { SECTIONS } from '@/bench/sections';
import { smoothstep } from '@/bench/math';
import { BAND_ROWS, PARTITION } from '@/gl/inkGeometry';
import { hud } from '@/gl/hud';
import { copy } from '@/site/copy';
import { createReadoutSync } from '@/site/Readout';
import { inkedTotal, ladderParts, type LockEnds } from './inkedCount';

export interface HudSyncOptions {
  /** Every machine's sorted lockEnd(birth), from the layout Scene builds for the same tier (inkedCount.ts's benchLockEnds). */
  lockEnds: LockEnds;
  /** The headline's word count, written once into #ladder-words. */
  wordCount: number;
}

/** The ladder's lines rung ticks with the quoter's compile across this window, while the band prints (design §3.1). */
const LINES_FROM = 0.05, LINES_TO = 0.35;
/** Rows the quoter's ink prints through the band: 40, or 0 if the band is ever cut, and the rung reads 0 with it. */
const BAND_LINES = BAND_ROWS[PARTITION.quoter];
/** The running clock until the quoter's lever locks: the width of hh:mm:ss, so the ladder line never reflows. */
const NOT_RUNNING = '--:--:--';

const CLASS = { current: 'is-current', lit: 'is-lit', revealed: 'is-revealed' } as const;

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
/** hh:mm:ss of a whole number of seconds. */
const formatClock = (s: number) => `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor(s / 60) % 60)}:${pad2(s % 60)}`;

function setText(el: HTMLElement | null, text: string): void {
  if (el && el.textContent !== text) el.textContent = text;
}

/** Starts the loop; the returned function stops it. */
export function startHudSync({ lockEnds, wordCount }: HudSyncOptions): () => void {
  const byId = (id: string) => document.getElementById(id);
  const all = (selector: string) => Array.from(document.querySelectorAll<HTMLElement>(selector));
  const lines = byId('ladder-lines'), parts = byId('ladder-parts'), footer = byId('footer-total');
  const clocks = [byId('ladder-running'), byId('uptime')];
  const strips = all('[data-strip]'), rungs = all('[data-rung]'), clicks = all('[data-click]');
  const syncReadout = createReadoutSync(byId('readout'));   // the bed's hover readout (task 4.3)

  setText(byId('ladder-words'), String(wordCount));

  // −2 is a value none of these ever takes, so the first frame writes every node.
  let lastLines = -2, lastParts = -2, lastTotal = -2, lastSecond = -2, lastSection = -2, lastRung = -2, lastClick = -2;

  const frame = () => {
    raf = requestAnimationFrame(frame);

    const n = Math.round(BAND_LINES * smoothstep(LINES_FROM, LINES_TO, hud.compile));
    if (n !== lastLines) { lastLines = n; setText(lines, String(n)); }

    const p = ladderParts(lockEnds, hud.compilePerMachine);
    if (p !== lastParts) { lastParts = p; setText(parts, p.toLocaleString('en-US')); }

    const total = inkedTotal(lockEnds, hud.compilePerMachine);
    if (total !== lastTotal) { lastTotal = total; setText(footer, copy.yours.footer(total)); }

    const second = hud.running ? Math.max(0, Math.floor(hud.uptime - hud.runningSince)) : -1;
    if (second !== lastSecond) {
      lastSecond = second;
      const text = second < 0 ? NOT_RUNNING : formatClock(second);
      for (const el of clocks) setText(el, text);
    }

    if (hud.section !== lastSection) {
      lastSection = hud.section;
      const id = SECTIONS[hud.section].id;
      for (const el of strips) el.classList.toggle(CLASS.current, el.dataset.strip === id);
    }

    if (hud.rung !== lastRung) {
      lastRung = hud.rung;
      for (const el of rungs) el.classList.toggle(CLASS.lit, Number(el.dataset.rung) === hud.rung);
    }

    if (hud.click !== lastClick) {
      lastClick = hud.click;
      for (const el of clicks) el.classList.toggle(CLASS.revealed, Number(el.dataset.click) <= hud.click);
    }

    syncReadout(hud.hover);
  };
  let raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
