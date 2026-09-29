import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { SECTIONS } from '@/bench/sections';
import { MACHINE, MACHINE_COUNT } from '@/bench/types';
import { BAND_ROWS, PARTITION } from '@/gl/inkGeometry';
import { INK_VERTEX } from '@/gl/shaders/ink.vert';
import { hud } from '@/gl/hud';
import { copy } from '@/site/copy';
import type { LockEnds } from './inkedCount';
import { startHudSync } from './hudSync';

// hudSync's rAF loop against a stubbed DOM: just the nodes it looks up once at start, each with a dataset, text and a
// classList, and a requestAnimationFrame that hands back one frame per `tick`. The layout and the paint are
// Playwright's; this pins what the loop writes for a given hud.

interface FakeEl {
  dataset: Record<string, string>;
  textContent: string;
  classList: { contains(name: string): boolean; toggle(name: string, force?: boolean): boolean };
}
function fakeEl(dataset: Record<string, string> = {}): FakeEl {
  const classes = new Set<string>();
  return {
    dataset, textContent: '',
    classList: {
      contains: (name) => classes.has(name),
      toggle: (name, force = !classes.has(name)) => { if (force) classes.add(name); else classes.delete(name); return force; },
    },
  };
}

/** <html>: just the attributes the loop sets on it. */
interface FakeRoot { attrs: Set<string>; hasAttribute(name: string): boolean; toggleAttribute(name: string, force?: boolean): boolean }
function fakeRoot(): FakeRoot {
  const attrs = new Set<string>();
  return {
    attrs,
    hasAttribute: (name) => attrs.has(name),
    toggleAttribute: (name, force = !attrs.has(name)) => { if (force) attrs.add(name); else attrs.delete(name); return force; },
  };
}

const ids: Record<string, FakeEl> = {};
let root: FakeRoot = fakeRoot();
let rungs: FakeEl[] = [], clicks: FakeEl[] = [];
let pending: FrameRequestCallback | null = null;
let stop: () => void = () => {};
/** Runs the one frame the loop has queued. */
const tick = () => { const cb = pending; pending = null; cb?.(0); };

const LOCK_ENDS = Object.fromEntries(Array.from({ length: MACHINE_COUNT }, (_, m) => [m, new Float32Array(0)])) as unknown as LockEnds;

beforeEach(() => {
  for (const id of ['ladder-words', 'ladder-lines', 'ladder-parts', 'ladder-running', 'uptime', 'footer-total']) ids[id] = fakeEl();
  rungs = Array.from({ length: 6 }, (_, i) => fakeEl({ rung: String(i) }));
  clicks = Array.from({ length: 4 }, (_, i) => fakeEl({ click: String(i) }));
  const strips = SECTIONS.map((s) => fakeEl({ strip: s.id }));
  const bySelector: Record<string, FakeEl[]> = { '[data-strip]': strips, '[data-rung]': rungs, '[data-click]': clicks };
  root = fakeRoot();
  vi.stubGlobal('document', { documentElement: root, getElementById: (id: string) => ids[id] ?? null, querySelectorAll: (s: string) => bySelector[s] ?? [] });
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { pending = cb; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { pending = null; });
  Object.assign(hud, { gl: false, section: 0, compile: 0, rung: -1, click: -1, running: false, uptime: 0, runningSince: 0, visitorParts: 0 });
  hud.compilePerMachine.fill(0);
  stop = startHudSync({ lockEnds: LOCK_ENDS, wordCount: 10 });
});
afterEach(() => { stop(); vi.unstubAllGlobals(); });

const withClass = (els: FakeEl[], name: string, key: 'rung' | 'click') =>
  els.filter((el) => el.classList.contains(name)).map((el) => Number(el.dataset[key]));

describe("section 02's ladder rungs", () => {
  it('light cumulatively up to hud.rung, the one at hud.rung current, and reverse on the way back up', () => {
    tick();
    expect(withClass(rungs, 'is-lit', 'rung')).toEqual([]);
    expect(withClass(rungs, 'is-current', 'rung')).toEqual([]);
    for (const [rung, lit] of [[0, [0]], [2, [0, 1, 2]], [5, [0, 1, 2, 3, 4, 5]], [1, [0, 1]]] as [number, number[]][]) {
      hud.rung = rung;
      tick();
      expect(withClass(rungs, 'is-lit', 'rung'), `rung ${rung}`).toEqual(lit);
      expect(withClass(rungs, 'is-current', 'rung'), `rung ${rung}`).toEqual([rung]);
    }
    hud.rung = -1;
    tick();
    expect(withClass(rungs, 'is-lit', 'rung')).toEqual([]);
    expect(withClass(rungs, 'is-current', 'rung')).toEqual([]);
  });
});

describe("section 02's copy lines", () => {
  it('are revealed up to hud.click and hidden again as it falls', () => {
    for (const [click, shown] of [[-1, []], [0, [0]], [2, [0, 1, 2]], [3, [0, 1, 2, 3]], [1, [0, 1]]] as [number, number[]][]) {
      hud.click = click;
      tick();
      expect(withClass(clicks, 'is-revealed', 'click'), `click ${click}`).toEqual(shown);
    }
  });
});

describe('<html data-gl>, the live-scene marker the click-keyed lines hide under', () => {
  it('is off while no scene drives hud.click (no WebGL2, a refused context, ?nogl=1), so the copy stays whole', () => {
    for (let i = 0; i < 3; i++) tick();
    expect(root.hasAttribute('data-gl')).toBe(false);
  });

  it('goes on in the same frame as the lines revealed so far, follows hud.gl, and comes off when the scene goes', () => {
    hud.click = 1;
    tick();
    expect(root.hasAttribute('data-gl')).toBe(false);
    hud.gl = true;                                                   // Clocks' first frame on measured ranges
    tick();
    expect(root.hasAttribute('data-gl')).toBe(true);
    expect(withClass(clicks, 'is-revealed', 'click')).toEqual([0, 1]);
    hud.click = 3;
    tick();
    expect(root.hasAttribute('data-gl')).toBe(true);
    hud.gl = false;                                                  // Clocks unmounted: the renderer failed after it ran
    tick();
    expect(root.hasAttribute('data-gl')).toBe(false);
  });

  it("is written on a new loop's first frame, and left as it is on stop for the next tier's loop to take over", () => {
    hud.gl = true;
    tick();
    stop();
    expect(root.hasAttribute('data-gl')).toBe(true);                // no gap for the hidden lines to flash in across a tier change
    hud.gl = false;
    stop = startHudSync({ lockEnds: LOCK_ENDS, wordCount: 10 });
    tick();
    expect(root.hasAttribute('data-gl')).toBe(false);
  });
});

describe('globals.css', () => {
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
  /** The declarations of the top-level rule whose selector list is exactly `selector`. */
  const rule = (selector: string) =>
    new RegExp(`(?:^|\\n)${selector.replace(/[[\].:-]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? null;

  it('styles the classes the loop writes: a click-keyed line hidden (live scene) until .is-revealed, rungs pencil, ink when lit, hot when current', () => {
    expect(rule(':root[data-gl] [data-reveal][data-click]')).toMatch(/opacity:\s*0;/);
    expect(rule(':root[data-gl] [data-reveal].is-revealed')).toMatch(/opacity:\s*1;[^}]*transform:\s*none/);
    expect(rule('[data-rung]')).toMatch(/color:\s*var\(--pencil\)/);
    expect(rule('[data-rung].is-lit')).toMatch(/color:\s*var\(--ink\)/);
    expect(rule('[data-rung].is-lit:last-child, [data-rung].is-current')).toMatch(/color:\s*var\(--hot\)/);
  });

  it('hides the click-keyed lines only under :root[data-gl], so with no scene (or no JS) the server-rendered copy is whole', () => {
    const selectors = Array.from(css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]*\[data-click\][^{}]*)\{/g), (m) => m[1].trim());
    expect(selectors).toHaveLength(2);                              // the hide and its reduced-motion variant
    for (const s of selectors) expect(s).toMatch(/^:root\[data-gl\] \[data-reveal\]\[data-click\]$/);
    // the reveal and the reduced-motion variant match the hide's specificity (0,4,0) and follow it, so they win
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ :root\[data-gl\] \[data-reveal\]\[data-click\] \{ transition-duration: 0\.2s; transform: none; \} \}/);
    expect(css.indexOf(':root[data-gl] [data-reveal].is-revealed')).toBeGreaterThan(css.indexOf(':root[data-gl] [data-reveal][data-click]'));
  });

  it("hides only section 02's click-keyed lines, so every other section's [data-reveal] copy stays on the page", () => {
    expect(rule('[data-reveal]')).toBeNull();
    expect(css).not.toMatch(/\[data-reveal\]\s*(?:,[^{]*)?\{[^}]*opacity:\s*0/);
  });
});

describe("the footer's total", () => {
  it("is the inked bench total plus the visitor's parts (hud.visitorParts), and drops back when they are cleared", () => {
    stop();
    const lockEnds = { ...LOCK_ENDS, [MACHINE.quoter]: Float32Array.from([0.1, 0.2, 0.3]), [MACHINE.watch]: Float32Array.from([0.5]) } as LockEnds;
    stop = startHudSync({ lockEnds, wordCount: 10 });
    hud.compilePerMachine[MACHINE.quoter] = 1;
    hud.compilePerMachine[MACHINE.watch] = 1;
    tick();
    expect(ids['footer-total'].textContent).toBe(copy.yours.footer(4));
    hud.visitorParts = 12;
    tick();
    expect(ids['footer-total'].textContent).toBe(copy.yours.footer(16));
    hud.visitorParts = 0;
    tick();
    expect(ids['footer-total'].textContent).toBe(copy.yours.footer(4));
  });
});

describe("the hero ladder's lines rung", () => {
  // The shader's own numbers, so a retune of the band moves this test with it.
  const code = INK_VERTEX.replace(/\/\/.*$/gm, '');
  const glslConst = (name: string) => Number(code.match(new RegExp(`\\b${name}\\s*=\\s*(-?[0-9.]+)`))?.[1]);
  const t0 = glslConst('BAND_T0'), t1 = glslConst('BAND_T1');
  // The printing front seats its last row within the first quarter of the band's window (ink.vert.ts: the front runs
  // over aRow / rows · 0.22 + 0.03 of it); the release starts at 0.75, so the rows hold in between.
  const printed = t0 + 0.25 * (t1 - t0);
  const rows = BAND_ROWS[PARTITION.quoter];
  const linesAt = (compile: number) => { hud.compile = compile; tick(); return ids['ladder-lines'].textContent; };

  it('ticks from 0 to the band\'s rows while the band prints, T0 + 0.35 → 0.5 s, and holds them after', () => {
    expect(t0).toBeGreaterThan(0.15);
    expect(t1).toBeGreaterThan(t0);
    expect(linesAt(0)).toBe('0');
    expect(linesAt(t0 - 0.001)).toBe('0');
    expect(linesAt((t0 + printed) / 2)).toBe(String(rows / 2));
    expect(linesAt(printed)).toBe(String(rows));
    expect(linesAt(t1)).toBe(String(rows));
    expect(linesAt(1)).toBe(String(rows));
  });
});
