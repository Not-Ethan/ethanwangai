// Per-frame NDC rect tracker for the ink system's `uRect[8]`. Reads each source element's page
// position once, on mount and on debounced resize (never per frame — no getBoundingClientRect
// here at all), then every frame turns the cached measurement plus the current scroll offset into
// clip-space rects with pure arithmetic. Pure TS: no React, no three, no DOM types at runtime —
// elements are accepted duck-typed so tests can mock them with plain objects.
//
// Every source but 08's sits in a `position: sticky` block: the hero's copy in `#sentence`'s grid
// (top 0), every other section's in its `.copy-col` (top-24/28) inside a `.copy-track`. A stuck
// block's offsetTop is not its flow position: Chromium reports it where it is pinned, so a measure
// taken mid-page (a reload with its scroll restored, a resize) would bake the pin in. Its flow top
// is derived from its containing block instead, which is never sticky itself: container top plus
// the container's padding-top (the block is its first child). Where the block is on screen is then
// analytic from the scroll offset (design doc §"Registration").

/** Duck-typed element: only the offset chain this module walks, so tests can mock it plainly. The lib types an
 *  HTMLElement's offsetParent as `Element | null`; CSSOM only ever returns a positioned HTMLElement (or null). */
export interface OffsetElement {
  offsetTop: number;
  offsetLeft: number;
  offsetWidth: number;
  offsetHeight: number;
  offsetParent: OffsetElement | Element | null;
}

/** A source inside a sticky block: the block pins at `top` while its container scrolls past. */
export interface StickyElementSource {
  element: OffsetElement;     // the source; its own box, and its offset inside the block
  block: OffsetElement;       // the sticky block: its height, and the x of the chain
  container: OffsetElement;   // the block's containing block, which bounds its travel
  top: number;                // the block's CSS `top`, px
  lead: number;               // the block's flow offset below the container's top: the container's padding-top, px
}

/** One measured source, in page coordinates (before scroll is applied). */
export interface SourceRect {
  pageTop: number;    // flow position: where the source sits with its block unstuck
  pageLeft: number;
  width: number;
  height: number;
  /** Present only for a source in a sticky block: the block's flow top and height, its pin, and its container's range. */
  sticky?: { top: number; blockTop: number; blockHeight: number; containerTop: number; containerHeight: number };
}

function isStickyElementSource(v: OffsetElement | StickyElementSource): v is StickyElementSource {
  return 'element' in v && 'block' in v;
}

/** Sums offsetTop/offsetLeft up the offsetParent chain, including `el` itself, to get the
 *  page-relative position — the standard technique the brief's "walks offsetParent" calls for. */
function pagePosition(el: OffsetElement): { top: number; left: number } {
  let top = 0, left = 0;
  let node: OffsetElement | null = el;
  while (node) {
    top += node.offsetTop;
    left += node.offsetLeft;
    node = node.offsetParent as OffsetElement | null;
  }
  return { top, left };
}

/** The rect's current top in the viewport: for a source in a sticky block, the block's analytic
 *  top (pinned at `top` between its flow position and its container's end) plus the source's offset
 *  inside it; otherwise just the page top minus how far the page has scrolled. */
export function viewportTop(r: SourceRect, scrollY: number): number {
  if (r.sticky) {
    const { top, blockTop, blockHeight, containerTop, containerHeight } = r.sticky;
    const block = Math.min(Math.max(blockTop - scrollY, top), containerTop + containerHeight - blockHeight - scrollY);
    return block + (r.pageTop - blockTop);
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
        // The source's offset inside the block is the difference of two chains that share the block's
        // (possibly stuck) position, so it holds whether or not the block is pinned right now.
        const el = pagePosition(source.element);
        const block = pagePosition(source.block);
        const container = pagePosition(source.container);
        const blockTop = container.top + source.lead;
        this.rects.set(index, {
          pageTop: blockTop + (el.top - block.top),
          pageLeft: el.left,
          width: source.element.offsetWidth,
          height: source.element.offsetHeight,
          sticky: {
            top: source.top, blockTop, blockHeight: source.block.offsetHeight,
            containerTop: container.top, containerHeight: source.container.offsetHeight,
          },
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
