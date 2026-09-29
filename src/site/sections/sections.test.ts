import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScrollProvider } from '@/scroll/ScrollProvider';
import { SECTIONS, SECTION_INDEX } from '@/bench/sections';
import { MACHINE } from '@/bench/types';
import { copy } from '@/site/copy';
import { Sentence } from './Sentence';
import { More } from './More';
import { First } from './First';
import { Kalshi } from './Kalshi';
import { Heron } from './Heron';
import { Darch } from './Darch';
import { Summers } from './Summers';
import { Alive } from './Alive';
import { Yours } from './Yours';

// Server render, as Nav.test does: ScrollProvider hands out its SSR tier and no effect runs,
// so this pins the DOM shape later stages read (ink sources, plates, the form, the counters)
// and the sticky copy wrapper around it, not the scroll behaviour (Playwright covers that).
const COMPONENT: Record<string, ComponentType> = {
  sentence: Sentence, more: More, first: First, kalshi: Kalshi, heron: Heron, darch: Darch, summers: Summers, alive: Alive, yours: Yours,
};

/** Every id / data hook a later stage reads from inside each section's copy. */
const COPY_HOOKS: Record<string, string[]> = {
  sentence: ['data-ink-source="sentence"', 'data-ink-words', 'id="deck"', 'id="rebuild"', `data-plate="${MACHINE.quoter}"`],
  more: ['data-ink-source="more"', 'data-click="0"', 'data-click="3"'],
  first: ['data-ink-source="first"', `data-plate="${MACHINE.bot}"`],
  kalshi: ['data-ink-source="kalshi"', `data-plate="${MACHINE.quoter}"`, `data-plate="${MACHINE.intake}"`],
  heron: ['data-ink-source="heron"', `data-plate="${MACHINE.balance}"`],
  darch: ['data-ink-source="darch"', `data-plate="${MACHINE.splitter}"`],
  summers: ['data-ink-source="summers"', `data-plate="${MACHINE.watch}"`],
  alive: ['id="uptime"'],
  yours: [
    'data-ink-source="yours"', 'id="yours-form"', 'id="yours-input"', 'id="yours-clear"', 'id="yours-echo"', 'id="yours-plate"',
    'id="mailto"', 'id="footer-total"', `data-plate="${MACHINE.visitor}"`,
  ],
};

function render(id: string): string {
  return renderToStaticMarkup(createElement(ScrollProvider, null, createElement(COMPONENT[id])));
}

/** The class attribute of the nearest `<tag …>` opening at or before `index`. */
function enclosingClass(html: string, index: number, tag: string): string {
  const start = html.lastIndexOf(`<${tag}`, index);
  if (start < 0) return '';
  const openTag = html.slice(start, html.indexOf('>', start) + 1);
  return /\bclass="([^"]*)"/.exec(openTag)?.[1] ?? '';
}

/** The markup of the element whose `<tag` opens at or before `index`, through its matching close. */
function elementAt(html: string, index: number, tag: string): string {
  const start = html.lastIndexOf(`<${tag}`, index);
  const re = new RegExp(`<${tag}\\b|</${tag}>`, 'g');
  re.lastIndex = start;
  let depth = 0;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index + m[0].length);
  }
  return html.slice(start);
}

describe('section copy', () => {
  it('renders every bench section with the hooks later stages read', () => {
    for (const s of SECTIONS) {
      const html = render(s.id);
      expect(html, s.id).toContain(`id="${s.id}"`);
      expect(html, s.id).toContain('min-height:');
      for (const hook of COPY_HOOKS[s.id]) expect(html, `${s.id} keeps ${hook}`).toContain(hook);
    }
  });

  it('wraps the copy of every section but the hero in one sticky copy-col that holds its hooks', () => {
    for (const s of SECTIONS.slice(1)) {
      const html = render(s.id);
      expect(html.split('copy-col').length - 1, `${s.id} has one copy-col`).toBe(1);
      const at = html.indexOf('copy-col');
      const cls = enclosingClass(html, at, 'div');
      expect(cls, s.id).toMatch(/\bsticky\b/);
      expect(cls, s.id).toMatch(/\btop-24\b/);
      expect(cls, s.id).toMatch(/\bmd:top-28\b/);
      const wrapper = elementAt(html, at, 'div');
      for (const hook of COPY_HOOKS[s.id]) expect(wrapper, `${s.id} copy-col holds ${hook}`).toContain(hook);
      // sticky is bounded by its containing block: the grid must stretch to the section's min-height
      const grid = enclosingClass(html, html.indexOf('grid-cols-12'), 'div');
      expect(grid, s.id).toMatch(/(^|\s)min-h-\[inherit\](\s|$)/);
    }
  });

  it("keys section 02's lines to the merge clicks in copy order, and lifts its ink burst from the line about thousands of lines", () => {
    const html = render('more');
    const unescape = (t: string) => t.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    const lines = Array.from(html.matchAll(/<(?:h2|p)\b([^>]*\bdata-click="[^"]*"[^>]*)>([^<]*)</g), (m) => ({ attrs: m[1], text: unescape(m[2]) }));
    expect(lines.map((l) => l.text)).toEqual(copy.more.lines);
    lines.forEach((l, i) => {
      expect(l.attrs, l.text).toContain(`data-click="${i}"`);
      expect(l.attrs, l.text).toMatch(/\bdata-reveal=/);
    });
    const source = lines.filter((l) => l.attrs.includes('data-ink-source="more"')).map((l) => l.text);
    expect(source).toEqual([copy.more.lines[2]]);
    expect(source[0]).toContain('thousands of lines');
    expect(Array.from(html.matchAll(/<li data-rung="(\d)">([^<]*)</g), (m) => [Number(m[1]), m[2]])).toEqual(copy.more.rungs.map((r, i) => [i, r]));
  });

  it('keeps the ladder rungs as their own column beside the sticky copy', () => {
    const html = render('more');
    const wrapper = elementAt(html, html.indexOf('copy-col'), 'div');
    expect(html).toContain('id="rungs"');
    expect(html.split('data-rung=').length - 1).toBe(6);
    expect(wrapper).not.toContain('id="rungs"');
  });

  it('keeps the hero sticky itself, and clears the rail gutter in every section', () => {
    const hero = render('sentence');
    expect(hero).not.toContain('copy-col');
    expect(enclosingClass(hero, hero.indexOf('grid-cols-12'), 'div')).toMatch(/\bsticky\b/);
    for (const s of SECTIONS) {
      const grid = enclosingClass(render(s.id), render(s.id).indexOf('grid-cols-12'), 'div');
      expect(grid, s.id).toMatch(/\bpx-4\b/);
      expect(grid, s.id).toMatch(/\bmd:px-12\b/);
      expect(grid, s.id).not.toMatch(/\bmd:px-8\b/);
    }
  });
});

describe('copy measure', () => {
  // A measure on the wrapper resolves `ch` in the 16px body default (312px at 1440) and squeezes
  // every h2 to 7-11 lines, pushing four sections past their min-height. The 34ch belongs to the
  // body paragraphs (spec §9: body max 34ch); the heading keeps the grid column.
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
  const declarationsOf = (selector: string): string | null =>
    new RegExp(`(?:^|\\n)${selector.replace(/\./g, '\\.')}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? null;

  it('puts the 34ch measure on .body and none on the .copy-col wrapper', () => {
    const copyCol = declarationsOf('.copy-col');
    expect(copyCol).not.toBeNull();
    expect(copyCol).not.toMatch(/max-width/);
    expect(copyCol).toMatch(/padding-bottom:\s*6vh/);
    expect(declarationsOf('.body')).toMatch(/max-width:\s*34ch/);
  });

  it('gives every heading the whole column: no width utility on any h2', () => {
    for (const s of SECTIONS.slice(1)) {
      const h2s = render(s.id).match(/<h2\b[^>]*>/g) ?? [];
      expect(h2s.length, `${s.id} has one h2`).toBe(1);
      expect(h2s[0], s.id).not.toMatch(/max-w/);
    }
  });
});

describe('copy lead and tail (Step 3 gate: u = 0.7 of #heron)', () => {
  // u is measured at the viewport's top edge, so at u of a section only (1 − u) of it is still
  // below that edge and the next section's heading sits (1 − u)·H + lead below it. The block
  // therefore leads its section by --copy-lead (its sticky containing block is the .copy-track,
  // which starts that far down) and the track runs --copy-tail past the section's bottom so the
  // block is still pinned at top-28 when the next heading is below the fold.
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
  const base = /(?:^|\n)\.copy-track\s*\{([^}]*)\}/.exec(css)?.[1] ?? null;
  const desktop = /@media \(min-width: 48rem\)\s*\{\s*\.copy-track\s*\{([^}]*)\}/.exec(css)?.[1] ?? null;
  const vhOf = (decls: string | null, prop: string): number =>
    Number(new RegExp(`${prop}:\\s*([\\d.]+)vh`).exec(decls ?? '')?.[1] ?? NaN);

  it('puts every sticky copy-col inside one copy-track that is the copy column itself', () => {
    for (const s of SECTIONS.slice(1)) {
      const html = render(s.id);
      expect(html.split('copy-track').length - 1, `${s.id} has one copy-track`).toBe(1);
      const track = elementAt(html, html.indexOf('copy-track'), 'div');
      expect(track, `${s.id} track holds the copy-col`).toContain('copy-col');
      // the track is the direct child of the column, so its 100% resolves against the stretched column
      const column = elementAt(html, html.indexOf('md:col-span-5'), 'div');
      expect(column.indexOf('copy-track'), s.id).toBeLessThan(column.indexOf('copy-col'));
      expect(column.replace(/^<div[^>]*>\s*/, '').startsWith('<div class="copy-track"'), `${s.id} track first in column`).toBe(true);
    }
  });

  it('leads each block far enough that the next heading is below the fold at u = 0.7 of a 90vh section', () => {
    const heron = SECTIONS[SECTION_INDEX.heron];
    const darch = SECTIONS[SECTION_INDEX.darch];
    expect(heron.vh.desktop).toBe(darch.vh.desktop);
    const bound = 100 - (1 - 0.7) * heron.vh.desktop;       // 73vh at any viewport height
    expect(vhOf(desktop, '--copy-lead')).toBeGreaterThanOrEqual(bound);
  });

  it('never lets a track run past the next block, and keeps the column as the range on phones', () => {
    expect(vhOf(desktop, '--copy-tail')).toBeLessThanOrEqual(vhOf(desktop, '--copy-lead'));
    expect(desktop).toMatch(/padding-top:\s*calc\(var\(--copy-lead\) - 6rem\)/);   // the grid's pt-24 is the first 6rem of the lead
    expect(desktop).toMatch(/margin-bottom:\s*calc\(6rem - var\(--copy-lead\)\)/); // hands the lead back so no section grows
    expect(desktop).toMatch(/min-height:\s*calc\(100% \+ var\(--copy-tail\)\)/);
    expect(base).toMatch(/min-height:\s*100%/);
  });
});

describe("08's poster dwell (desktop): its block holds to u = 1 and 09's heading stays below the fold", () => {
  // 08's camera holds the poster from u = 0.6 to 1 and nothing in the DOM may move but the uptime (spec §3.1 · 08). u
  // is read at the viewport's top edge, so at 08's u the next section's top is (1 − u)·110vh down and 09's block sits
  // its --copy-lead below that: at u = 1 it is exactly --copy-lead down, so the lead must be a full viewport. 08's
  // block holds while its track still runs a pin-plus-block past the viewport's top; a track that runs a full viewport
  // past the section holds it to u = 1 whenever it fits under its pin. Each track still ends before the next block
  // starts, and 09's tail grows with its lead so the page ends with 09's block where it did.
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
  const base = /@media \(min-width: 48rem\)\s*\{\s*\.copy-track\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  const scoped = (id: string): string => new RegExp(`@media \\(min-width: 48rem\\)\\s*\\{[^@]*?#${id} \\.copy-track\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  const vh = (decls: string, prop: string): number => Number(new RegExp(`${prop}:\\s*([\\d.]+)vh`).exec(decls)?.[1] ?? NaN);
  const lead = (id: string) => (Number.isNaN(vh(scoped(id), '--copy-lead')) ? vh(base, '--copy-lead') : vh(scoped(id), '--copy-lead'));
  const tail = (id: string) => (Number.isNaN(vh(scoped(id), '--copy-tail')) ? vh(base, '--copy-tail') : vh(scoped(id), '--copy-tail'));

  it("leads 09's block a full viewport into its section, so it is below the fold at every u of 08's dwell", () => {
    const alive = SECTIONS[SECTION_INDEX.alive];
    for (const u of [0.6, 0.8, 1]) expect((1 - u) * alive.vh.desktop + lead('yours'), `09's block at 08's u = ${u}`).toBeGreaterThanOrEqual(100);
  });

  it("runs 08's track a full viewport past its section, so its block is still pinned at u = 1", () => {
    expect(tail('alive')).toBeGreaterThanOrEqual(100);
  });

  it('never lets a track run past the next block, and keeps the air between them', () => {
    const ids = SECTIONS.slice(1).map((s) => s.id);
    for (let i = 0; i + 1 < ids.length; i++) expect(tail(ids[i]), `${ids[i]} tail ≤ ${ids[i + 1]} lead`).toBeLessThanOrEqual(lead(ids[i + 1]));
    expect(lead('yours') - tail('alive'), "air between 08's and 09's blocks").toBeGreaterThanOrEqual(vh(base, '--copy-lead') - vh(base, '--copy-tail'));
  });

  it("ends the page with 09's block where it did: its tail grows with its lead", () => {
    for (const v of [lead('yours'), tail('yours'), vh(base, '--copy-lead'), vh(base, '--copy-tail')]) expect(Number.isFinite(v)).toBe(true);
    expect(lead('yours') - tail('yours')).toBe(vh(base, '--copy-lead') - vh(base, '--copy-tail'));
  });

  it("sets 08's uptime on one line in the copy column at 1440 px, so the block fits under its pin", () => {
    const html = render('alive');
    const uptime = /<p\b[^>]*class="([^"]*)"[^>]*>[^<]*<span id="uptime">/.exec(html)?.[1] ?? '';
    expect(uptime.split(/\s+/)).toContain('mono-figure');
    expect(uptime.split(/\s+/)).toContain('uptime-figure');
    const [, lo, vw, hi] = /(?:^|\n)\.uptime-figure\s*\{[^}]*font-size:\s*clamp\(([\d.]+)rem,\s*([\d.]+)vw,\s*([\d.]+)rem\)/.exec(css)?.map(Number) ?? [];
    const px = Math.min(Math.max(lo * 16, (vw / 100) * 1440), hi * 16);
    expect(px, 'still an oversized figure (spec §9: 48–72 px)').toBeGreaterThanOrEqual(48);
    // `running 00:00:00` is 16 mono characters at a 0.6em advance less the figure's 0.01em tracking
    const text = `${copy.alive.running} 00:00:00`;
    const column = ((1440 - 2 * 48 - 11 * 16) / 12) * 5 + 4 * 16;   // md:px-12, gap-4, col-span-5
    expect(text.length * 0.59 * px, 'uptime width at 1440').toBeLessThanOrEqual(column);
  });
});

describe("section 02's ladder (#rungs)", () => {
  // hudSync lights the rungs per merge click and darkens them again through the burst, but #more is 100vh on desktop,
  // so a ladder left at the top of its grid is under the nav by the first click and gone by the third. It pins
  // top-right instead, in a track that runs past the section by the ladder's pinned bottom, so it holds through the
  // clicks, the hold and the burst and scrolls off with the section's end. Phones keep the column as it is.
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
  const desktopRule = (selector: string) =>
    new RegExp(`@media \\(min-width: 48rem\\)\\s*\\{\\s*${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? null;

  it('pins the ladder top-right on desktop, inside a track that opens its column', () => {
    const html = render('more');
    const column = elementAt(html, html.indexOf('md:col-start-10'), 'div');
    expect(column.replace(/^<div[^>]*>\s*/, '').startsWith('<div class="rungs-track"')).toBe(true);
    expect(elementAt(html, html.indexOf('rungs-track'), 'div')).toContain('id="rungs"');
    const ol = enclosingClass(html, html.indexOf('id="rungs"'), 'ol');
    for (const cls of ['md:sticky', 'md:top-20', 'md:text-right']) expect(ol).toMatch(new RegExp(`(?:^|\\s)${cls}(?:\\s|$)`));
  });

  it("runs the ladder's track past the section by the ladder's own pinned bottom, so it lets go at #more's end", () => {
    // top-20, then six rows of .mono at the root line-height 1.5, then gap-1 between them: all rem, no vh, so the
    // section's end is where the ladder leaves at every viewport height, not somewhere inside 03.
    const rem = (v: string) => Number(/^([\d.]+)rem$/.exec(v.trim())?.[1] ?? NaN);
    const monoSize = rem(/(?:^|\n)\.mono\s*\{[^}]*font-size:\s*([^;]+);/.exec(css)?.[1] ?? '');
    const pinnedBottom = 5 + 6 * 1.5 * monoSize + 5 * 0.25;
    const tail = /min-height:\s*calc\(100% \+ (.+)\);/.exec(desktopRule('.rungs-track') ?? '')?.[1] ?? '';
    expect(tail).not.toMatch(/vh/);
    const terms = tail.split(' + ').map((t) => t.split(' * ').reduce((acc, f) => acc * (f.endsWith('rem') ? rem(f) : Number(f)), 1));
    expect(terms.reduce((a, b) => a + b, 0)).toBeCloseTo(pinnedBottom, 6);
    expect(css).not.toMatch(/(?:^|\n)\.rungs-track\s*\{/);
  });
});

describe('the visitor echo (#yours-echo)', () => {
  // Stage 5 (Task 4.6) writes the submitted sentence into this span so the ink sampler has glyph pixels to read
  // (an <input> has none). It must render in the input's own face at the input's own place, and never be seen:
  // laid out (opacity, not display:none, so Range.getClientRects() still works) but invisible, out of flow so the
  // copy column keeps the height the camera clearance was tuned against, and inert so it never sits between the
  // pointer and the input it covers.
  const html = render('yours');
  const openTag = (tag: string, id: string): string => new RegExp(`<${tag}\\b[^>]*\\bid="${id}"[^>]*>`).exec(html)?.[0] ?? '';
  const classes = (tag: string): string[] => (/\bclass="([^"]*)"/.exec(tag)?.[1] ?? '').split(/\s+/).filter(Boolean);
  const echo = openTag('span', 'yours-echo');
  const input = openTag('input', 'yours-input');

  it('is rendered in the input\'s own face, not the mono readout', () => {
    expect(echo).not.toBe('');
    expect(classes(input)).toContain('body');
    expect(classes(echo)).toContain('body');
    expect(classes(echo)).not.toContain('mono');
  });

  it('is laid out but invisible, out of flow, inert, and hidden from assistive tech', () => {
    const cls = classes(echo);
    expect(cls).toContain('opacity-0');
    expect(cls).not.toContain('hidden');
    expect(cls).not.toContain('sr-only');
    expect(cls).toContain('absolute');
    expect(cls).toContain('pointer-events-none');
    expect(echo).toContain('aria-hidden="true"');
  });

  it('overlays the input row, whose box it takes, so ink lifts from where the typed words are', () => {
    const at = html.indexOf('id="yours-echo"');
    const row = elementAt(html, at, 'div');
    expect(classes(/^<div\b[^>]*>/.exec(row)?.[0] ?? '')).toContain('relative');
    expect(row).toContain('id="yours-input"');
    expect(classes(echo)).toContain('inset-0');
    expect(classes(echo)).toContain('py-2');   // the input's own vertical padding, so the baselines meet
  });

  it('starts empty: nothing is mirrored before a sentence is submitted', () => {
    expect(html).toMatch(/<span\b[^>]*\bid="yours-echo"[^>]*><\/span>/);
  });
});
