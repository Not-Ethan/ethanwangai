// Samples the glyph pixels of DOM text into uv pairs inside a source element's box: the ink system's aSpawnUV
// (spec §7, Registration). DOM-only; runs once after document.fonts.ready and again on debounced resize, never
// per frame. Each word is rasterised on an offscreen 2D canvas in its element's computed font at the word's own
// client rect, so line wrapping is the browser's and never re-implemented here. If the canvas measures a word
// more than 6% wider or narrower than its DOM box, that box falls back to a uniform grid (spec §7's blurred
// glyph density fallback) rather than spawning from misregistered glyphs.

export interface SampledText { uv: Float32Array; count: number }   // uv pairs relative to the source element's box (0..1, y down)

const METRIC_TOLERANCE = 0.06;
const ALPHA_MIN = 64;   // a device pixel is ink when at least a quarter covered by the glyph

interface WordBox {
  x: number; y: number;          // the word's client rect origin, CSS px
  W: number; H: number;          // the raster's size, device px
  rgba: Uint8ClampedArray | null; // the word's raster; null spawns a uniform grid over the box instead
}

/** Samples glyph pixels of the words inside `wordsEl` (or all text of `sourceEl`), relative to sourceEl's box. Call after document.fonts.ready. */
export function sampleTextPoints(sourceEl: HTMLElement, wordsEl: HTMLElement | null, stride = 3, max = 6000): SampledText {
  const src = sourceEl.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (src.width <= 0 || src.height <= 0 || !ctx) return { uv: new Float32Array(0), count: 0 };
  const dpr = window.devicePixelRatio || 1;

  const boxes: WordBox[] = [];
  for (const { node, start, word } of words(wordsEl ?? sourceEl)) {
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, start + word.length);
    const style = getComputedStyle(node.parentElement ?? sourceEl);
    const drawn = transform(word, style.textTransform);   // the canvas draws what the DOM rendered, not the source text
    for (const rect of range.getClientRects()) {
      if (rect.width > 0 && rect.height > 0) boxes.push(rasterise(ctx, canvas, drawn, rect, style, dpr));
    }
  }

  // Cap at `max` by widening the stride: hits scale with 1/stride², so one or two passes over the kept rasters land.
  let step = Math.max(1, Math.round(stride));
  let count = countHits(boxes, step);
  while (count > max && step < 4096) {
    step = Math.ceil(step * Math.sqrt(count / max));
    count = countHits(boxes, step);
  }
  count = Math.min(count, max);

  const uv = new Float32Array(count * 2);
  let i = 0;
  for (const b of boxes) {
    for (let py = 0; py < b.H && i < uv.length; py += step) {
      for (let px = 0; px < b.W && i < uv.length; px += step) {
        if (b.rgba && b.rgba[(py * b.W + px) * 4 + 3] < ALPHA_MIN) continue;
        uv[i++] = (b.x - src.x + px / dpr) / src.width;
        uv[i++] = (b.y - src.y + py / dpr) / src.height;
      }
    }
  }
  return { uv, count };
}

/** Every whitespace-delimited run of a text node under `root`, with its offset into the node. */
function* words(root: HTMLElement): Generator<{ node: Text; start: number; word: string }> {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const re = /\S+/g;
    for (let m = re.exec(node.data); m; m = re.exec(node.data)) yield { node, start: m.index, word: m[0] };
  }
}

function transform(word: string, textTransform: string): string {
  if (textTransform === 'lowercase') return word.toLowerCase();
  if (textTransform === 'uppercase') return word.toUpperCase();
  if (textTransform === 'capitalize') return word[0].toUpperCase() + word.slice(1);
  return word;
}

function rasterise(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, word: string, box: DOMRect, style: CSSStyleDeclaration, dpr: number): WordBox {
  const W = Math.ceil(box.width * dpr);
  const H = Math.ceil(box.height * dpr);
  canvas.width = W;   // resizing resets the context state, so the font is set again per word
  canvas.height = H;
  ctx.scale(dpr, dpr);
  setFont(ctx, style);
  const metrics = ctx.measureText(word);
  if (Math.abs(metrics.width - box.width) > box.width * METRIC_TOLERANCE) return { x: box.left, y: box.top, W, H, rgba: null };
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(word, 0, metrics.fontBoundingBoxAscent ?? box.height * 0.8);   // a range rect is the font's content area, so its top is the ascent above the baseline
  return { x: box.left, y: box.top, W, H, rgba: ctx.getImageData(0, 0, W, H).data };
}

function setFont(ctx: CanvasRenderingContext2D, style: CSSStyleDeclaration) {
  const { fontStyle, fontWeight, fontSize, lineHeight, fontFamily, letterSpacing } = style;
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}/${lineHeight} ${fontFamily}`;
  if (!ctx.font.includes(fontSize)) ctx.font = `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;   // a canvas that rejects the shorthand keeps its 10px default, so retry without the line-height
  if ('letterSpacing' in ctx) ctx.letterSpacing = letterSpacing === 'normal' ? '0px' : letterSpacing;
}

function countHits(boxes: WordBox[], step: number): number {
  let n = 0;
  for (const b of boxes) {
    if (!b.rgba) { n += Math.ceil(b.W / step) * Math.ceil(b.H / step); continue; }
    for (let py = 0; py < b.H; py += step) {
      for (let px = 0; px < b.W; px += step) if (b.rgba[(py * b.W + px) * 4 + 3] >= ALPHA_MIN) n++;
    }
  }
  return n;
}
