import { describe, it, expect } from 'vitest';
import { viewportTop, ndcRect, RectTracker, type SourceRect, type OffsetElement } from './rects';

describe('viewportTop: sticky (Review Focus #1)', () => {
  // The hero: the source is the whole sticky block, height 360, top 0, in a section at top 0, height 1260.
  const r: SourceRect = {
    pageTop: 0, pageLeft: 0, width: 0, height: 360,
    sticky: { top: 0, blockTop: 0, blockHeight: 360, containerTop: 0, containerHeight: 1260 },
  };

  it.each([
    [0, 0],
    [100, 0],
    [900, 0],
    [950, -50],
    [1300, -400],
  ])('scroll %d -> %d', (scrollY, expected) => {
    expect(viewportTop(r, scrollY)).toBeCloseTo(expected, 6);
  });
});

describe('viewportTop: a source inside a copy-col (top 96) whose track leads it by 300', () => {
  // Measured in Chromium: a block of height 200 pinned at top 96 inside a track at page top 0 with
  // padding-top 300 and offsetHeight 1700 sits at 300 unscrolled, at 96 from scroll 204 to 1404,
  // then leaves with the track (-100 at scroll 1600). The h2 is the block's first child (offset 0).
  const h2: SourceRect = {
    pageTop: 300, pageLeft: 48, width: 400, height: 80,
    sticky: { top: 96, blockTop: 300, blockHeight: 200, containerTop: 0, containerHeight: 1700 },
  };

  it.each([
    [0, 300],
    [100, 200],
    [204, 96],
    [800, 96],
    [1404, 96],
    [1500, 0],
    [1600, -100],
  ])('scroll %d -> %d', (scrollY, expected) => {
    expect(viewportTop(h2, scrollY)).toBeCloseTo(expected, 6);
  });

  it('carries a source lower in the block by its offset inside it', () => {
    const p: SourceRect = { ...h2, pageTop: 300 + 120, height: 40 };   // a paragraph 120 below the block's top
    expect(viewportTop(p, 0)).toBe(420);
    expect(viewportTop(p, 800)).toBe(216);
    expect(viewportTop(p, 1600)).toBe(20);
  });
});

describe('viewportTop: normal rect', () => {
  it('is pageTop - scrollY', () => {
    const r: SourceRect = { pageTop: 2000, pageLeft: 0, width: 10, height: 10 };
    expect(viewportTop(r, 1500)).toBe(500);
  });
});

describe('ndcRect', () => {
  it('maps a full-viewport rect to [-1, 1, 2, 2]', () => {
    const vw = 1280, vh = 800;
    const r: SourceRect = { pageTop: 0, pageLeft: 0, width: vw, height: vh };
    const out = new Float32Array(4);
    ndcRect(r, 0, vw, vh, out, 0);
    expect(out[0]).toBeCloseTo(-1, 6);
    expect(out[1]).toBeCloseTo(1, 6);
    expect(out[2]).toBeCloseTo(2, 6);
    expect(out[3]).toBeCloseTo(2, 6);
  });

  it('writes at the given offset, leaving the rest of the buffer untouched', () => {
    const r: SourceRect = { pageTop: 0, pageLeft: 0, width: 100, height: 100 };
    const out = new Float32Array(8).fill(-9);
    ndcRect(r, 0, 200, 200, out, 4);
    expect(Array.from(out.subarray(0, 4))).toEqual([-9, -9, -9, -9]);
    expect(out[4]).not.toBe(-9);
  });

  it('a sticky rect uses viewportTop for its y placement', () => {
    const r: SourceRect = {
      pageTop: 0, pageLeft: 0, width: 100, height: 360,
      sticky: { top: 0, blockTop: 0, blockHeight: 360, containerTop: 0, containerHeight: 1260 },
    };
    const out = new Float32Array(4);
    ndcRect(r, 950, 200, 800, out, 0);
    // viewportTop(r, 950) = -50 (from the sticky table above)
    expect(out[1]).toBeCloseTo(1 - (-50 / 800) * 2, 6);
  });
});

/** A plain object shaped like the DOM element the module actually reads: no live DOM required. */
function el(over: Partial<OffsetElement> = {}): OffsetElement {
  return { offsetTop: 0, offsetLeft: 0, offsetWidth: 0, offsetHeight: 0, offsetParent: null, ...over };
}

describe('RectTracker: measure + write (Review Focus #1)', () => {
  it('after a measure with new sizes, the next write uses them', () => {
    const tracker = new RectTracker();
    const vw = 1000, vh = 1000;
    const out = new Float32Array(32);

    tracker.measure({ 0: el({ offsetTop: 100, offsetLeft: 200, offsetWidth: 50, offsetHeight: 60 }) });
    tracker.write(0, vw, vh, out);
    const firstX = out[0], firstY = out[1], firstW = out[2], firstH = out[3];

    tracker.measure({ 0: el({ offsetTop: 400, offsetLeft: 500, offsetWidth: 80, offsetHeight: 90 }) });
    tracker.write(0, vw, vh, out);

    expect(out[0]).not.toBeCloseTo(firstX, 6);
    expect(out[1]).not.toBeCloseTo(firstY, 6);
    expect(out[2]).not.toBeCloseTo(firstW, 6);
    expect(out[3]).not.toBeCloseTo(firstH, 6);

    // And the new write matches a manual ndcRect from the new, walked page position.
    const expected = new Float32Array(4);
    ndcRect({ pageTop: 400, pageLeft: 500, width: 80, height: 90 }, 0, vw, vh, expected, 0);
    expect(out[0]).toBeCloseTo(expected[0], 6);
    expect(out[1]).toBeCloseTo(expected[1], 6);
    expect(out[2]).toBeCloseTo(expected[2], 6);
    expect(out[3]).toBeCloseTo(expected[3], 6);
  });

  it('walks the offsetParent chain to accumulate page-relative position', () => {
    const tracker = new RectTracker();
    const grandparent = el({ offsetTop: 30, offsetLeft: 10 });
    const parent = el({ offsetTop: 20, offsetLeft: 5, offsetParent: grandparent });
    const child = el({ offsetTop: 15, offsetLeft: 1, offsetWidth: 40, offsetHeight: 40, offsetParent: parent });

    tracker.measure({ 3: child });
    const out = new Float32Array(32);
    tracker.write(0, 1000, 1000, out);

    // page top = 15 + 20 + 30 = 65; page left = 1 + 5 + 10 = 16
    const expected = new Float32Array(4);
    ndcRect({ pageTop: 65, pageLeft: 16, width: 40, height: 40 }, 0, 1000, 1000, expected, 0);
    expect(out[3 * 4 + 0]).toBeCloseTo(expected[0], 6);
    expect(out[3 * 4 + 1]).toBeCloseTo(expected[1], 6);
  });

  it('measures a sticky source from its block and container (the hero, section 0)', () => {
    const tracker = new RectTracker();
    // Section (#sentence): page top 0, height 1260. Sticky grid (top 0): height 360. The tracked source is
    // the copy column inside it, 96 down (the grid's pt-24), 48 in.
    const section = el({ offsetTop: 0, offsetHeight: 1260 });
    const grid = el({ offsetWidth: 1000, offsetHeight: 360, offsetParent: section });
    const column = el({ offsetTop: 96, offsetLeft: 48, offsetWidth: 320, offsetHeight: 240, offsetParent: grid });

    tracker.measure({ 0: { element: column, block: grid, container: section, top: 0, lead: 0 } });

    const out = new Float32Array(32);
    tracker.write(950, 1000, 1000, out);
    // The grid's top at scroll 950 is -50 per the sticky table; the column sits 96 below it, 48 in.
    const expected = new Float32Array(4);
    ndcRect(
      { pageTop: 96, pageLeft: 48, width: 320, height: 240, sticky: { top: 0, blockTop: 0, blockHeight: 360, containerTop: 0, containerHeight: 1260 } },
      950, 1000, 1000, expected, 0,
    );
    expect(Array.from(out.subarray(0, 4))).toEqual(Array.from(expected));
    expect(out[1]).toBeCloseTo(1 - ((-50 + 96) / 1000) * 2, 6);
  });

  it('derives a copy-col\'s flow top from its track, so a measure taken while it is pinned is not baked in', () => {
    // Chromium at scroll 800: the block (flow top 300 = track top 0 + padding 300) reports offsetTop 896, pinned at 96.
    const section = el({ offsetTop: 1000, offsetHeight: 1700 });
    const track = el({ offsetTop: 0, offsetHeight: 1700, offsetParent: section });
    const stuckBlock = el({ offsetTop: 896, offsetLeft: 48, offsetWidth: 400, offsetHeight: 200, offsetParent: section });
    const h2 = el({ offsetTop: 0, offsetLeft: 0, offsetWidth: 400, offsetHeight: 80, offsetParent: stuckBlock });
    const p = el({ offsetTop: 120, offsetLeft: 0, offsetWidth: 400, offsetHeight: 40, offsetParent: stuckBlock });
    const tracker = new RectTracker();
    tracker.measure({ 1: { element: h2, block: stuckBlock, container: track, top: 96, lead: 300 }, 2: { element: p, block: stuckBlock, container: track, top: 96, lead: 300 } });

    const out = new Float32Array(32);
    const vh = 1000;
    // page top 1000 + flow 300: unscrolled the h2 is at 1300, at scroll 1800 it is pinned at 96, at 2600 it has left with the track (-100)
    tracker.write(0, 1000, vh, out);
    expect(out[1 * 4 + 1]).toBeCloseTo(1 - (1300 / vh) * 2, 6);
    tracker.write(1800, 1000, vh, out);
    expect(out[1 * 4 + 1]).toBeCloseTo(1 - (96 / vh) * 2, 6);
    expect(out[2 * 4 + 1]).toBeCloseTo(1 - (216 / vh) * 2, 6);
    tracker.write(2600, 1000, vh, out);
    expect(out[1 * 4 + 1]).toBeCloseTo(1 - (-100 / vh) * 2, 6);
    expect(out[1 * 4 + 0]).toBeCloseTo((48 / 1000) * 2 - 1, 6);   // x: the block's 48, the section's offsetTop is vertical
    expect(out[1 * 4 + 2]).toBeCloseTo((400 / 1000) * 2, 6);
    expect(out[1 * 4 + 3]).toBeCloseTo((80 / vh) * 2, 6);
  });

  it('leaves unmeasured slots untouched by write', () => {
    const tracker = new RectTracker();
    tracker.measure({ 2: el({ offsetWidth: 10, offsetHeight: 10 }) });
    const out = new Float32Array(32).fill(7);
    tracker.write(0, 1000, 1000, out);
    expect(out[0]).toBe(7);
    expect(out[1]).toBe(7);
    expect(out[4 * 4]).toBe(7);
  });
});
