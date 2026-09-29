import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MACHINE, MACHINE_NAMES, type MachineId } from '@/bench/types';
import { SECTIONS, SECTION_INDEX } from '@/bench/sections';
import { parseSentence } from '@/bench/visitorLayout';
import { HERO_ASPECT_LANDSCAPE, HERO_ASPECT_PORTRAIT, HERO_PLATE_LANDSCAPE, HERO_PLATE_PORTRAIT } from '@/generated/heroPlate';
import { ScrollProvider, type ScrollState } from '@/scroll/ScrollProvider';
import {
  HERO_POSE, HOT_RECTS, OUTLINE, PLATE_MACHINES, StaticPlates, isHeroSection, markHot, platesFor, slotAreaOf, startTier, visitorRects,
  type SlotArea,
} from './StaticPlates';

const plateFile = (m: MachineId) => new URL(`../../public/plates/${MACHINE_NAMES[m]}.svg`, import.meta.url);
const plateSvg = (m: MachineId) => readFileSync(plateFile(m), 'utf8');
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe('the plates each section shows in the SVG tier', () => {
  const at = (id: string) => platesFor(SECTION_INDEX[id]);

  it('builds the hero machines up section by section over the pencil hero, and shows the small machines in their own sections', () => {
    expect(at('sentence')).toEqual([MACHINE.quoter]);
    expect(at('more')).toEqual([MACHINE.quoter]);
    expect(at('first')).toEqual([MACHINE.quoter, MACHINE.bot]);
    expect(at('kalshi')).toEqual([MACHINE.quoter, MACHINE.bot, MACHINE.intake]);
    expect(at('heron')).toEqual([MACHINE.balance]);
    expect(at('darch')).toEqual([MACHINE.splitter]);
    expect(at('summers')).toEqual([MACHINE.watch]);
    expect(at('alive')).toEqual([MACHINE.quoter, MACHINE.bot, MACHINE.intake]);
    expect(at('yours')).toEqual([MACHINE.slot]);
  });

  it('keeps the pencil hero only where the plates are the hero pose\'s, so a small machine is never drawn over it', () => {
    const hero = SECTIONS.map((_, i) => isHeroSection(i));
    expect(hero).toEqual([true, true, true, true, false, false, false, true, false]);
    SECTIONS.forEach((_, i) => {
      for (const m of platesFor(i)) expect(HERO_POSE.includes(m), `${SECTIONS[i].id} ${MACHINE_NAMES[m]}`).toBe(hero[i]);
    });
  });

  it('has a published plate for every machine a section is about, and no plate for the visitor', () => {
    expect(PLATE_MACHINES).toEqual([MACHINE.quoter, MACHINE.bot, MACHINE.intake, MACHINE.balance, MACHINE.splitter, MACHINE.watch, MACHINE.slot]);
    for (const m of PLATE_MACHINES) expect(existsSync(plateFile(m)), MACHINE_NAMES[m]).toBe(true);
    expect(PLATE_MACHINES).not.toContain(MACHINE.visitor);
  });
});

describe('markHot', () => {
  it('flags about 24 rects per plate, spread over it, and leaves the rest of the markup as it was', () => {
    for (const m of PLATE_MACHINES) {
      const svg = plateSvg(m);
      const n = count(svg, /<rect\b/g);
      const marked = markHot(svg);
      const hot = count(marked, /<rect data-hot=""/g);
      expect(hot, MACHINE_NAMES[m]).toBe(Math.min(HOT_RECTS, Math.ceil(n / 4)));
      expect(marked.replace(/ data-hot=""/g, ''), MACHINE_NAMES[m]).toBe(svg);
    }
    expect(HOT_RECTS).toBe(24);
    expect(count(markHot(plateSvg(MACHINE.quoter)), /data-hot/g)).toBe(24);
  });

  it('picks rects from across the plate, not just its largest', () => {
    const rects = Array.from({ length: 96 }, (_, i) => `<rect x="${i}" y="0" width="1" height="1"/>`).join('');
    const marked = markHot(`<svg><g>${rects}</g></svg>`);
    const xs = Array.from(marked.matchAll(/<rect data-hot="" x="(\d+)"/g), (m) => Number(m[1]));
    expect(xs).toHaveLength(24);
    expect(xs[0]).toBeLessThan(4);
    expect(xs[23]).toBeGreaterThan(91);
    expect(new Set(xs.slice(1).map((x, i) => x - xs[i]))).toEqual(new Set([4]));
  });

  it('leaves a plate with no rects alone', () => {
    expect(markHot('<svg><g><ellipse/></g></svg>')).toBe('<svg><g><ellipse/></g></svg>');
  });
});

describe('the no-GL visitor: bars = words, rails = sentences in the slot', () => {
  const area: SlotArea = slotAreaOf(plateSvg(MACHINE.slot))!;

  it('reads the slot area off the slot plate\'s footprint', () => {
    expect(area).toEqual({ cx: 0.166, cy: -0.5366, rx: 0.1873, ry: 0.098 });
    expect(slotAreaOf('<svg></svg>')).toBeNull();
  });

  it('lays one bar per word and one rail per sentence, inside the slot area', () => {
    for (const text of ['a bot.', 'build a thing that runs. then another.', 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen', 'a. b. c. d. e. f.']) {
      const { words, sentences } = parseSentence(text);
      const rects = visitorRects(text, area);
      expect(rects.filter((r) => r.kind === 'bar'), text).toHaveLength(words.length);
      expect(rects.filter((r) => r.kind === 'rail'), text).toHaveLength(sentences);
      for (const r of rects) {
        expect(r.w, text).toBeGreaterThan(0);
        expect(r.h, text).toBeGreaterThan(0);
        expect(r.x, text).toBeGreaterThanOrEqual(area.cx - area.rx);
        expect(r.x + r.w, text).toBeLessThanOrEqual(area.cx + area.rx + 1e-9);
        expect(r.y, text).toBeGreaterThanOrEqual(area.cy - area.ry);
        expect(r.y + r.h, text).toBeLessThanOrEqual(area.cy + area.ry + 1e-9);
      }
    }
  });

  it('stands every bar on a rail, in reading order, the first sentence\'s rail at the back (highest)', () => {
    const rects = visitorRects('build a thing that runs. then another.', area);
    const rails = rects.filter((r) => r.kind === 'rail');
    const bars = rects.filter((r) => r.kind === 'bar');
    expect(rails[0].y).toBeGreaterThan(rails[1].y);
    for (const b of bars) {
      const rail = rails.find((r) => Math.abs(r.y + r.h - b.y) < 1e-12);
      expect(rail).toBeDefined();
      expect(b.x).toBeGreaterThanOrEqual(rail!.x);
      expect(b.x + b.w).toBeLessThanOrEqual(rail!.x + rail!.w + 1e-12);
    }
  });

  it('draws nothing for an empty sentence', () => {
    expect(visitorRects('', area)).toEqual([]);
    expect(visitorRects('   ', area)).toEqual([]);
  });
});

describe('<StaticPlates /> server-rendered', () => {
  const render = (mode: 'hero' | 'tier') => renderToStaticMarkup(createElement(ScrollProvider, null, createElement(StaticPlates, { mode })));

  it('inlines both hero plates in a fixed layer under the canvas, each at its reference aspect, with no id used twice', () => {
    const html = render('hero');
    expect(html).toMatch(/^<div class="sp-layer" aria-hidden="true">/);
    expect(html).toContain(`style="--sp-ref:${HERO_ASPECT_LANDSCAPE}"`);
    expect(html).toContain(`style="--sp-ref:${HERO_ASPECT_PORTRAIT}"`);
    expect(count(html, /<svg\b/g)).toBe(2);
    expect(html).toContain(HERO_PLATE_LANDSCAPE);
    expect(HERO_PLATE_PORTRAIT).toContain('id="bedgrid"');
    const ids = Array.from(html.matchAll(/\bid="([^"]+)"/g), (m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ref of html.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(ref[1]);
    expect(html).not.toContain('data-machine');
  });

  it('adds an empty container per plate in the tier, which the plate is fetched into on first need', () => {
    const html = render('tier');
    for (const m of PLATE_MACHINES) {
      const pose = HERO_POSE.includes(m) ? 'hero' : 'own', outline = m === MACHINE.slot ? ' data-outline=""' : '';
      expect(html).toContain(`<div class="sp-art sp-plate" data-machine="${m}" data-pose="${pose}"${outline} style="--sp-ref:${HERO_ASPECT_LANDSCAPE}"></div>`);
    }
    expect(count(html, /<svg\b/g)).toBe(2);
  });
});

// startTier against stand-ins: the layer, one container per plate, the rAF, window events and the plate fetch.
interface FakeNode {
  attrs: Record<string, string>;
  children: FakeNode[];
  parent: FakeNode | null;
  setAttribute(name: string, value: string): void;
  appendChild(child: FakeNode): FakeNode;
  remove(): void;
}
function node(): FakeNode {
  const n: FakeNode = {
    attrs: {}, children: [], parent: null,
    setAttribute(name, value) { n.attrs[name] = value; },
    appendChild(child) { child.parent = n; n.children.push(child); return child; },
    remove() { if (n.parent) n.parent.children = n.parent.children.filter((c) => c !== n); n.parent = null; },
  };
  return n;
}
function classes() {
  const set = new Set<string>();
  return { set, contains: (c: string) => set.has(c), toggle: (c: string, force = !set.has(c)) => { if (force) set.add(c); else set.delete(c); return force; } };
}
interface FakePlate { dataset: { machine: string }; classList: ReturnType<typeof classes>; innerHTML: string; group: FakeNode | null; querySelector(s: string): FakeNode | null }
/** A plate container: setting its markup gives it the plate's flipped <g>, which is all the visitor's rects need. */
function plateEl(m: MachineId): FakePlate {
  let html = '';
  const el: FakePlate = {
    dataset: { machine: String(m) }, classList: classes(), group: null,
    get innerHTML() { return html; },
    set innerHTML(value: string) { html = value; el.group = value.includes('<g') ? node() : null; },
    querySelector(s) {
      if (s === 'g') return el.group;
      if (s === '[data-visitor]') return el.group?.children.find((c) => 'data-visitor' in c.attrs) ?? null;
      return null;
    },
  };
  return el;
}

describe('startTier', () => {
  let pending: FrameRequestCallback | null = null;
  const tick = () => { const cb = pending; pending = null; cb?.(0); };
  const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
  let layer: { classList: ReturnType<typeof classes>; querySelectorAll(s: string): FakePlate[] };
  let plates: Map<MachineId, FakePlate>;
  let scroll: { current: ScrollState };
  let load: Mock<(url: string) => Promise<string>>;
  let stop: () => void = () => {};

  /** A scroll state whose g sits in the middle of section i's range. */
  const goTo = (i: number) => {
    const n = SECTIONS.length;
    scroll.current.ranges = SECTIONS.map((s, k) => ({ id: s.id, start: k / n, end: (k + 1) / n }));
    scroll.current.g = (i + 0.5) / n;
    tick();
  };

  beforeEach(() => {
    plates = new Map(PLATE_MACHINES.map((m) => [m, plateEl(m)]));
    layer = { classList: classes(), querySelectorAll: (s) => (s === '[data-machine]' ? [...plates.values()] : []) };
    scroll = { current: { g: 0, scrollY: 0, velocity: 0, maxScroll: 1, vh: 900, vw: 1440, ranges: [], tops: [] } };
    load = vi.fn<(url: string) => Promise<string>>(async (url) => readFileSync(new URL(`../../public${url}`, import.meta.url), 'utf8'));
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { pending = cb; return 1; });
    vi.stubGlobal('cancelAnimationFrame', () => { pending = null; });
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('document', { createElementNS: (_ns: string, _tag: string) => Object.assign(node(), { tag: _tag }) });
    stop = startTier(layer as unknown as HTMLElement, scroll, load);
  });
  afterEach(() => { stop(); vi.unstubAllGlobals(); });

  const on = () => PLATE_MACHINES.filter((m) => plates.get(m)!.classList.contains('is-on'));

  it('fetches the first section\'s plate on the first frame, fades it in once it lands, and keeps the hero', async () => {
    tick();
    expect(load.mock.calls.map((c) => c[0])).toEqual(['/plates/quoter.svg']);
    expect(on()).toEqual([]);                                   // nothing to fade in until the markup is there
    await flush();
    expect(plates.get(MACHINE.quoter)!.innerHTML).toBe(markHot(plateSvg(MACHINE.quoter)));
    expect(on()).toEqual([MACHINE.quoter]);
    expect(layer.classList.contains('is-away')).toBe(false);
  });

  it('fetches each plate once, on the section that first needs it, and toggles classes as the page scrolls', async () => {
    goTo(SECTION_INDEX.kalshi);
    await flush();
    expect(load.mock.calls.map((c) => c[0]).sort()).toEqual(['/plates/bot.svg', '/plates/intake.svg', '/plates/quoter.svg']);
    expect(on()).toEqual([MACHINE.quoter, MACHINE.bot, MACHINE.intake]);

    goTo(SECTION_INDEX.heron);
    await flush();
    expect(on()).toEqual([MACHINE.balance]);
    expect(layer.classList.contains('is-away')).toBe(true);     // the pencil hero fades out under a small machine's own pose

    goTo(SECTION_INDEX.alive);
    await flush();
    expect(on()).toEqual([MACHINE.quoter, MACHINE.bot, MACHINE.intake]);
    expect(layer.classList.contains('is-away')).toBe(false);
    expect(load).toHaveBeenCalledTimes(4);                      // the hero plates came back without another fetch

    const frames = load.mock.calls.length;
    tick(); tick();
    expect(load).toHaveBeenCalledTimes(frames);                // a frame in the same section touches nothing
  });

  it('retries a plate whose fetch failed the next time a section needs it', async () => {
    load.mockRejectedValueOnce(new Error('offline'));
    goTo(SECTION_INDEX.heron);
    await flush();
    expect(on()).toEqual([]);
    goTo(SECTION_INDEX.darch);
    goTo(SECTION_INDEX.heron);
    await flush();
    expect(load.mock.calls.filter((c) => c[0] === '/plates/balance.svg')).toHaveLength(2);
    expect(on()).toEqual([MACHINE.balance]);
  });

  it('adds the visitor\'s bars and rails to the slot plate on submit, replaces them on the next, and takes them off on clear', async () => {
    goTo(SECTION_INDEX.yours);
    await flush();
    const slot = plates.get(MACHINE.slot)!;
    const visitor = () => slot.querySelector('[data-visitor]');
    expect(visitor()).toBeNull();

    expect(OUTLINE).toBe(MACHINE.slot);
    expect(slot.innerHTML).toBe(plateSvg(MACHINE.slot));        // a pencil outline: no hot rects on it

    window.dispatchEvent(new CustomEvent('dbso:visitor:build', { detail: { text: 'build a thing that runs. then another.' } }));
    const g = visitor()!;
    expect(g.parent).toBe(slot.group);
    expect(g.attrs.fill).toBe('var(--ink)');                     // the visitor is the ink on the slot
    const expected = visitorRects('build a thing that runs. then another.', slotAreaOf(plateSvg(MACHINE.slot))!);
    expect(g.children).toHaveLength(expected.length);
    expect(g.children.map((c) => (c as FakeNode & { tag: string }).tag)).toEqual(expected.map(() => 'rect'));
    expect(g.children.map((c) => Number(c.attrs.width))).toEqual(expected.map((r) => r.w));

    window.dispatchEvent(new CustomEvent('dbso:visitor:build', { detail: { text: 'a bot.' } }));
    expect(slot.group!.children.filter((c) => 'data-visitor' in c.attrs)).toHaveLength(1);
    expect(visitor()!.children).toHaveLength(3);                // two bars on one rail

    window.dispatchEvent(new CustomEvent('dbso:visitor:clear'));
    expect(visitor()).toBeNull();
  });

  it('draws a sentence submitted before the slot plate has landed once it does', async () => {
    goTo(SECTION_INDEX.alive);
    window.dispatchEvent(new CustomEvent('dbso:visitor:build', { detail: { text: 'a bot.' } }));
    expect(load.mock.calls.map((c) => c[0])).toContain('/plates/slot.svg');
    await flush();
    expect(plates.get(MACHINE.slot)!.querySelector('[data-visitor]')!.children).toHaveLength(3);
  });

  it('stops: no more frames, no more visitor rects, and a late plate is not written', async () => {
    tick();
    stop();
    expect(pending).toBeNull();
    await flush();
    expect(plates.get(MACHINE.quoter)!.innerHTML).toBe('');
    window.dispatchEvent(new CustomEvent('dbso:visitor:build', { detail: { text: 'a bot.' } }));
    expect(plates.get(MACHINE.slot)!.group).toBeNull();
  });
});
