import { describe, it, expect } from 'vitest';
import { viewportTop, ndcRect, RectTracker, type SourceRect, type OffsetElement } from './rects';

describe('viewportTop: sticky (Review Focus #1)', () => {
  // Sticky block of height 360 in a section at top 0, height 1260.
  const r: SourceRect = { pageTop: 0, pageLeft: 0, width: 0, height: 360, sticky: { sectionTop: 0, sectionHeight: 1260 } };

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
    const r: SourceRect = { pageTop: 999999, pageLeft: 0, width: 100, height: 360, sticky: { sectionTop: 0, sectionHeight: 1260 } };
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

  it('measures a sticky source from a distinct {element, section} pair (the hero, section 0)', () => {
    const tracker = new RectTracker();
    // Section (#sentence): page top 0, height 1260. Sticky block (the tracked element): height 360.
    const section = el({ offsetTop: 0, offsetHeight: 1260 });
    const stickyBlock = el({ offsetLeft: 40, offsetWidth: 320, offsetHeight: 360 });

    tracker.measure({ 0: { element: stickyBlock, section } });

    const out = new Float32Array(32);
    tracker.write(950, 1000, 1000, out);
    // viewportTop at scroll 950 is -50 per the sticky table; x/w come from the block itself.
    const expected = new Float32Array(4);
    ndcRect(
      { pageTop: 0, pageLeft: 40, width: 320, height: 360, sticky: { sectionTop: 0, sectionHeight: 1260 } },
      950, 1000, 1000, expected, 0,
    );
    expect(Array.from(out.subarray(0, 4))).toEqual(Array.from(expected));
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
