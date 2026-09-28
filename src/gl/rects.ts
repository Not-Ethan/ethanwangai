// Per-frame NDC rect tracker for the ink system's `uRect[8]`. Reads each source element's page
// position once, on mount and on debounced resize (never per frame — no getBoundingClientRect
// here at all), then every frame turns the cached measurement plus the current scroll offset into
// clip-space rects with pure arithmetic. Pure TS: no React, no three, no DOM types at runtime —
// elements are accepted duck-typed so tests can mock them with plain objects.
//
// The hero's copy block sits inside `#sentence` under `position: sticky`, whose offsetTop reflects
// its *unstuck* flow position, not where it is actually pinned on screen — so its rect is computed
// analytically from the section's page rect instead of trusted directly (design doc §"Registration").

/** Duck-typed element: only the offset chain this module walks, so tests can mock it plainly. */
export interface OffsetElement {
  offsetTop: number;
  offsetLeft: number;
  offsetWidth: number;
  offsetHeight: number;
  offsetParent: OffsetElement | null;
}

/** The hero source: a sticky block whose height is its own, but whose travel range comes from
 *  the section it sits in (`#sentence`) — a second, distinct element, not an ancestor walk. */
export interface StickyElementSource { element: OffsetElement; section: OffsetElement }

/** One measured source, in page coordinates (before scroll is applied). */
export interface SourceRect {
  pageTop: number;
  pageLeft: number;
  width: number;
  height: number;
  /** Present only for a sticky source: the containing section's page top/height it is clamped to. */
  sticky?: { sectionTop: number; sectionHeight: number };
}

function isStickyElementSource(v: OffsetElement | StickyElementSource): v is StickyElementSource {
  return 'element' in v && 'section' in v;
}

/** Sums offsetTop/offsetLeft up the offsetParent chain, including `el` itself, to get the
 *  page-relative position — the standard technique the brief's "walks offsetParent" calls for. */
function pagePosition(el: OffsetElement): { top: number; left: number } {
  let top = 0, left = 0;
  let node: OffsetElement | null = el;
  while (node) {
    top += node.offsetTop;
    left += node.offsetLeft;
    node = node.offsetParent;
  }
  return { top, left };
}

/** The rect's current top in the viewport: analytic for a sticky source (clamped to its section's
 *  travel range), otherwise just the page top minus how far the page has scrolled. */
export function viewportTop(r: SourceRect, scrollY: number): number {
  if (r.sticky) {
    const { sectionTop, sectionHeight } = r.sticky;
    return Math.min(Math.max(sectionTop - scrollY, 0), sectionTop + sectionHeight - r.height - scrollY);
  }
  return r.pageTop - scrollY;
}

/** Writes `[x, y, w, h]` for `r` into `out[offset..offset+3]`, in NDC (x right, y up). */
export function ndcRect(r: SourceRect, scrollY: number, vw: number, vh: number, out: Float32Array, offset: number): void {
  const top = viewportTop(r, scrollY);
  out[offset] = (r.pageLeft / vw) * 2 - 1;
  out[offset + 1] = 1 - (top / vh) * 2;
  out[offset + 2] = (r.width / vw) * 2;
  out[offset + 3] = (r.height / vh) * 2;
}

/** Caches each source's page rect on `measure`, then turns them into `uRect`'s eight NDC vec4s on
 *  every `write` — the only per-frame work, all arithmetic on already-measured numbers. */
export class RectTracker {
  private rects = new Map<number, SourceRect>();

  measure(sources: Record<number, OffsetElement | StickyElementSource>): void {
    for (const key of Object.keys(sources)) {
      const index = Number(key);
      const source = sources[index];
      if (isStickyElementSource(source)) {
        const { left: pageLeft } = pagePosition(source.element); // pageTop unused: sticky ignores it
        const { top: sectionTop } = pagePosition(source.section);
        this.rects.set(index, {
          pageTop: 0,
          pageLeft,
          width: source.element.offsetWidth,
          height: source.element.offsetHeight,
          sticky: { sectionTop, sectionHeight: source.section.offsetHeight },
        });
      } else {
        const { top, left } = pagePosition(source);
        this.rects.set(index, { pageTop: top, pageLeft: left, width: source.offsetWidth, height: source.offsetHeight });
      }
    }
  }

  write(scrollY: number, vw: number, vh: number, out: Float32Array): void {
    for (const [index, rect] of this.rects) {
      ndcRect(rect, scrollY, vw, vh, out, index * 4);
    }
  }
}
