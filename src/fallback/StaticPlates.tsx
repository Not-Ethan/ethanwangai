'use client';
// The SVG layer (design §10, §11). `hero`: the emitted hero plate, inlined in the server HTML as a finished poster in a
// fixed layer under the canvas, pixel-matched to the GL projection. `tier` (no WebGL2, a failed renderer, a lost
// context, ?nogl=1): the same layer plus the ink plates, fetched on first need and faded in section by section, with
// about 24 hot rects per plate ticking on a CSS keyframe (staticPlates.css), and the visitor's sentence drawn in ink
// into the slot, a pencil outline, as rects. The tier runs in plain DOM: one rAF reads the scroll state and toggles
// classes, no React state.
import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { MACHINE, MACHINE_NAMES, type MachineId } from '@/bench/types';
import { SECTIONS, locate } from '@/bench/sections';
import { ROW_CAP, SENTENCE_CAP, parseSentence } from '@/bench/visitorLayout';
import { HERO_ASPECT_LANDSCAPE, HERO_ASPECT_PORTRAIT, HERO_PLATE_LANDSCAPE, HERO_PLATE_PORTRAIT } from '@/generated/heroPlate';
import { useScroll, type ScrollState } from '@/scroll/ScrollProvider';
import './staticPlates.css';

export type StaticPlatesMode = 'hero' | 'tier';

/** Rects per plate that tick hot (fewer on a plate of under 96 rects: a quarter of them). */
export const HOT_RECTS = 24;

/** The plates scripts/emitCore.ts projects at the hero pose (the rest at their own section's): they register over the pencil hero. */
export const HERO_POSE: readonly MachineId[] = [MACHINE.quoter, MACHINE.intake, MACHINE.bot];

/**
 * The slot stays a pencil outline once the page is built (it is never inked, bench/counts.ts's inkedAtEnd): its plate is
 * drawn in pencil with no hot rects, and the visitor's bars and rails are the ink on it.
 */
export const OUTLINE: MachineId = MACHINE.slot;

/** The machines section i is about: its camera subject and the machine it builds. */
function subjects(i: number): MachineId[] {
  const { machine, build } = SECTIONS[i];
  return build && build.machine !== machine ? [machine, build.machine] : [machine];
}

/** Every machine a section is about, in page order: one plate container each. */
export const PLATE_MACHINES: readonly MachineId[] = [...new Set(SECTIONS.flatMap((_, i) => subjects(i)))];

/** Section i frames the hero pose: the pencil hero stays under its plates. */
export function isHeroSection(i: number): boolean {
  return subjects(i).some((m) => HERO_POSE.includes(m));
}

/**
 * The plates on at section i. A hero section shows every hero-pose machine the page has reached so far (the quoter
 * from 01, the bot from 03, the intake from 04), so the machines ink in over the pencil hero section by section; any
 * other section shows its own machines alone.
 */
export function platesFor(i: number): MachineId[] {
  if (!isHeroSection(i)) return subjects(i);
  const reached = new Set(SECTIONS.slice(0, i + 1).flatMap((_, k) => subjects(k)));
  return PLATE_MACHINES.filter((m) => HERO_POSE.includes(m) && reached.has(m));
}

/** Flags `min(HOT_RECTS, ⌈n / 4⌉)` of a plate's n rects `data-hot`, evenly spaced through it (the plate is largest first). */
export function markHot(svg: string, count = HOT_RECTS): string {
  const n = (svg.match(/<rect\b/g) ?? []).length;
  const k = Math.min(count, Math.ceil(n / 4));
  const picks = new Set(Array.from({ length: k }, (_, j) => Math.floor(((j + 0.5) * n) / k)));
  let i = 0;
  return svg.replace(/<rect\b/g, (tag) => (picks.has(i++) ? '<rect data-hot=""' : tag));
}

/** The slot's footprint on its plate, in the plate's NDC (y up): the flat ellipse shadow inkPlateSvg draws under it. */
export interface SlotArea { cx: number; cy: number; rx: number; ry: number }

export function slotAreaOf(svg: string): SlotArea | null {
  const m = /<ellipse cx="([-\d.e]+)" cy="([-\d.e]+)" rx="([-\d.e]+)" ry="([-\d.e]+)"/.exec(svg);
  return m ? { cx: Number(m[1]), cy: Number(m[2]), rx: Number(m[3]), ry: Number(m[4]) } : null;
}

export interface PlateRect { kind: 'bar' | 'rail'; x: number; y: number; w: number; h: number }

/** The share of the slot area's half-extents the rails span. */
const FIELD = 0.6;

/**
 * The visitor's sentence as the SVG tier draws it: one rail per sentence, the first at the back (highest), and one bar
 * per word standing on the rails in reading order, the words shared out evenly between them. A rail is as long as its
 * bars, which sit on a pitch of ROW_CAP to the field (more if a rail carries more), and a bar's height grows with its
 * word, as the GL cell does. NDC, y up, as rect x / y / w / h inside the plate's flipped group.
 */
export function visitorRects(text: string, { cx, cy, rx, ry }: SlotArea): PlateRect[] {
  const { words, sentences } = parseSentence(text);
  if (words.length === 0) return [];
  const pitchX = (2 * FIELD * rx) / Math.max(ROW_CAP, Math.ceil(words.length / sentences));
  const pitchY = (2 * FIELD * ry) / (SENTENCE_CAP - 1);
  const x0 = cx - FIELD * rx, railH = 0.12 * pitchY;
  const out: PlateRect[] = [];
  for (let r = 0; r < sentences; r++) {
    const from = Math.floor((words.length * r) / sentences), to = Math.floor((words.length * (r + 1)) / sentences);
    const top = cy + ((sentences - 1) / 2 - r) * pitchY;
    out.push({ kind: 'rail', x: x0, y: top - railH, w: (to - from) * pitchX, h: railH });
    for (let k = from; k < to; k++) {
      out.push({ kind: 'bar', x: x0 + (k - from + 0.2) * pitchX, y: top, w: 0.6 * pitchX, h: pitchY * (0.3 + 0.05 * Math.min(words[k].length, 12)) });
    }
  }
  return out;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const CLASS = { on: 'is-on', away: 'is-away' } as const;

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.text();
}

/**
 * Runs the SVG tier on the layer's plate containers until the returned function stops it. Each frame reads the scroll
 * state; on a new section it fetches the plates that section needs and has not asked for yet, toggles `is-on` on the
 * ones that have landed (the 300 ms fade is CSS) and `is-away` on the layer where the pencil hero steps aside. The
 * form's build and clear events (Yours.tsx) draw the visitor into the slot plate, which is fetched on the build if
 * no section has needed it yet. A failed fetch is asked for again the next time a section needs it.
 */
export function startTier(layer: HTMLElement, scroll: RefObject<ScrollState>, load: (url: string) => Promise<string> = fetchText): () => void {
  const plates = new Map<MachineId, HTMLElement>();
  for (const el of layer.querySelectorAll<HTMLElement>('[data-machine]')) plates.set(Number(el.dataset.machine) as MachineId, el);
  const requested = new Set<MachineId>(), landed = new Set<MachineId>();
  let section = -1, live = true, sentence = '';
  let slot: SlotArea | null = null;

  const show = () => {
    const on = section < 0 ? [] : platesFor(section);
    for (const [m, el] of plates) el.classList.toggle(CLASS.on, landed.has(m) && on.includes(m));
  };

  const drawVisitor = () => {
    const el = plates.get(MACHINE.slot);
    const group = el?.querySelector('g');
    if (!el || !group || !slot) return;
    el.querySelector('[data-visitor]')?.remove();
    const rects = visitorRects(sentence, slot);
    if (rects.length === 0) return;
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('data-visitor', '');
    g.setAttribute('fill', 'var(--ink)');
    for (const r of rects) {
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(r.x));
      rect.setAttribute('y', String(r.y));
      rect.setAttribute('width', String(r.w));
      rect.setAttribute('height', String(r.h));
      g.appendChild(rect);
    }
    group.appendChild(g);
  };

  const need = (m: MachineId) => {
    if (requested.has(m) || !plates.has(m)) return;
    requested.add(m);
    load(`/plates/${MACHINE_NAMES[m]}.svg`).then(
      (svg) => {
        if (!live) return;
        plates.get(m)!.innerHTML = m === OUTLINE ? svg : markHot(svg);
        landed.add(m);
        if (m === MACHINE.slot) { slot = slotAreaOf(svg); drawVisitor(); }
        show();
      },
      () => { requested.delete(m); },
    );
  };

  const frame = () => {
    raf = requestAnimationFrame(frame);
    const s = scroll.current;
    const i = s.ranges.length > 0 ? locate(s.g, s.ranges).index : 0;
    if (i === section) return;
    section = i;
    for (const m of platesFor(i)) need(m);
    layer.classList.toggle(CLASS.away, !isHeroSection(i));
    show();
  };

  const onBuild = (e: Event) => {
    sentence = (e as CustomEvent<{ text?: string }>).detail?.text ?? '';
    need(MACHINE.slot);
    drawVisitor();
  };
  const onClear = () => { sentence = ''; drawVisitor(); };
  window.addEventListener('dbso:visitor:build', onBuild);
  window.addEventListener('dbso:visitor:clear', onClear);
  let raf = requestAnimationFrame(frame);

  return () => {
    live = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('dbso:visitor:build', onBuild);
    window.removeEventListener('dbso:visitor:clear', onClear);
  };
}

// Two hero plates share the emitter's pattern id; the portrait's gets its own, so each fill resolves inside its own SVG.
const PORTRAIT = HERO_PLATE_PORTRAIT.replaceAll('id="bedgrid"', 'id="bedgrid-portrait"').replaceAll('url(#bedgrid)', 'url(#bedgrid-portrait)');
const HERO_HTML = { landscape: { __html: HERO_PLATE_LANDSCAPE }, portrait: { __html: PORTRAIT } };
/** The reference aspect a plate was projected at; staticPlates.css sizes the plate from it and the layer's height. */
const aspect = (a: number) => ({ '--sp-ref': a }) as CSSProperties;

/**
 * Both hero plates are in the server HTML and CSS shows the one for the viewport's orientation, so the poster is right
 * on first paint, before any script. Each is as tall as the layer and `--sp-ref` times as wide, centred: the
 * reference-aspect NDC frame stretched by HERO_ASPECT / currentAspect in x, as the GL camera projects at the canvas's
 * aspect with the same pose and fov.
 */
export function StaticPlates({ mode }: { mode: StaticPlatesMode }) {
  const { state } = useScroll();
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mode !== 'tier' || !layer.current) return;
    return startTier(layer.current, state);
  }, [mode, state]);

  return (
    <div ref={layer} className="sp-layer" aria-hidden="true">
      <div className="sp-art sp-hero sp-hero-landscape" style={aspect(HERO_ASPECT_LANDSCAPE)} dangerouslySetInnerHTML={HERO_HTML.landscape} />
      <div className="sp-art sp-hero sp-hero-portrait" style={aspect(HERO_ASPECT_PORTRAIT)} dangerouslySetInnerHTML={HERO_HTML.portrait} />
      {mode === 'tier' && PLATE_MACHINES.map((m) => (
        // the ink plates are projected at the landscape reference aspect (scripts/emitCore.ts)
        <div
          key={m} className="sp-art sp-plate" data-machine={m} data-pose={HERO_POSE.includes(m) ? 'hero' : 'own'}
          data-outline={m === OUTLINE ? '' : undefined} style={aspect(HERO_ASPECT_LANDSCAPE)}
        />
      ))}
    </div>
  );
}
