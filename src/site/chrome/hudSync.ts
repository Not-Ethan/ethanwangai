// The chrome's per-frame sync (design §3.1, §9, task 3.6): a plain DOM rAF loop, outside R3F, that reads `hud`
// (gl/hud.ts, which Clocks writes every frame) and writes only what changed: the hero ladder's lines, parts and
// running clock, the alive section's uptime, the footer's total (the inked bench plus the visitor's built parts; this
// and the ladder's two counts from the scene only while it is live, hud.gl, over the server's final counts), the
// section rail's current item, section 02's lit rungs (every one up to hud.rung, that one current), its revealed copy
// lines and <html data-gl>, the live-scene marker those lines hide under (task 4.1). No React state and no layout
// reads: every node is looked up once, at start, and the last value written to each is kept here, so a frame where
// nothing changed touches no DOM at all.
import { SECTIONS } from '@/bench/sections';
import { MACHINE_COUNT } from '@/bench/types';
import { smoothstep } from '@/bench/math';
import { TIMING } from '@/bench/timing';
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

/**
 * The ladder's lines rung ticks with the quoter's compile while the rows band prints: T0 + 0.35 → 0.5 s of the hero
 * compile (design §3.1), the first quarter of ink.vert.ts's band window BAND_T0..BAND_T1 (T0 + 0.35 → 0.95 s), where
 * its printing front seats the last row. 0.159 → 0.227 in uCompile, so the count and the rows on screen agree.
 */
const LINES_FROM = 0.35 / TIMING.heroCompileS, LINES_TO = 0.5 / TIMING.heroCompileS;
/** Rows the quoter's ink prints through the band: 40, or 0 if the band is ever cut, and the rung reads 0 with it. */
const BAND_LINES = BAND_ROWS[PARTITION.quoter];
/** Every machine's compile once the page is built: the counts the SVG tier reads. */
const BUILT = new Float32Array(MACHINE_COUNT).fill(1);
/** The running clock until the quoter's lever locks: the width of hh:mm:ss, so the ladder line never reflows. */
const NOT_RUNNING = '--:--:--';

const CLASS = { current: 'is-current', lit: 'is-lit', revealed: 'is-revealed' } as const;
/** The live-scene marker on <html>: set while hud.gl is. */
const ATTR_GL = 'data-gl';

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
  const root = document.documentElement;
  const strips = all('[data-strip]'), rungs = all('[data-rung]'), clicks = all('[data-click]');
  const syncReadout = createReadoutSync(byId('readout'));   // the bed's hover readout (task 4.3)

  setText(byId('ladder-words'), String(wordCount));

  // −2 is a value none of these ever takes, so the first frame writes every node.
  let lastLines = -2, lastParts = -2, lastTotal = -2, lastSecond = -2, lastSection = -2, lastRung = -2, lastClick = -2;
  let lastGl: boolean | null = null;

  const frame = () => {
    raf = requestAnimationFrame(frame);

    // The server rendered the ladder and the footer with the layout's final counts, which is what they read with no
    // scene (the SVG tier, spec §11); the scene takes them over on its first frame and counts them up from there, and
    // if it goes (a lost context, a failed renderer) they go back to the built bench's on that frame, once.
    if (hud.gl || lastGl) {
      const compile = hud.gl ? hud.compilePerMachine : BUILT;
      const n = hud.gl ? Math.round(BAND_LINES * smoothstep(LINES_FROM, LINES_TO, hud.compile)) : BAND_LINES;
      if (n !== lastLines) { lastLines = n; setText(lines, String(n)); }

      const p = ladderParts(lockEnds, compile);
      if (p !== lastParts) { lastParts = p; setText(parts, p.toLocaleString('en-US')); }

      const total = inkedTotal(lockEnds, compile) + (hud.gl ? hud.visitorParts : 0);
      if (total !== lastTotal) { lastTotal = total; setText(footer, copy.yours.footer(total)); }
    }

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
      for (const el of rungs) {
        const i = Number(el.dataset.rung);
        el.classList.toggle(CLASS.lit, i <= hud.rung);
        el.classList.toggle(CLASS.current, i === hud.rung);
      }
    }

    // globals.css hides section 02's click-keyed lines only under :root[data-gl], so the copy is whole in every tier
    // without a scene (no WebGL2, a refused context, ?nogl=1, no JS). The marker and the lines' classes are written in
    // the same frame, so a line already reached never flashes out when the scene comes up.
    if (hud.gl !== lastGl) { lastGl = hud.gl; root.toggleAttribute(ATTR_GL, hud.gl); }

    if (hud.click !== lastClick) {
      lastClick = hud.click;
      for (const el of clicks) el.classList.toggle(CLASS.revealed, Number(el.dataset.click) <= hud.click);
    }

    syncReadout(hud.hover);
  };
  let raf = requestAnimationFrame(frame);
  // data-gl and the lines' classes are left as they are: a stop is a tier change, whose next loop rewrites both on its
  // first frame. Taking the marker off in between would flash the still-hidden lines in and fade them out again.
  return () => cancelAnimationFrame(raf);
}
