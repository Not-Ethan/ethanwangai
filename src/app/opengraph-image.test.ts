import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { copy } from '@/site/copy';
import { PALETTES } from '@/theme/palettes';
import { POSTER_RECTS } from '@/generated/posterPlate';

// The og image (design §10, G4): the poster frame on paper, the headline and the deck. Two passes: the element tree the
// route hands ImageResponse (next/og mocked, so the tree and options can be read), and the real PNG it renders.
const captured: { element: ReactElement | null; options: Record<string, unknown> | null } = { element: null, options: null };
vi.mock('next/og', async (importOriginal) => {
  const real = await importOriginal<typeof import('next/og')>();
  return {
    ImageResponse: class extends real.ImageResponse {
      constructor(element: ReactElement, options: ConstructorParameters<typeof real.ImageResponse>[1]) {
        super(element, options);
        captured.element = element;
        captured.options = options as Record<string, unknown>;
      }
    },
  };
});

const route = await import('./opengraph-image');

type Props = { style?: Record<string, unknown>; children?: ReactNode; [k: string]: unknown };
/** Every element in the tree, depth first. */
function elements(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Props>(node)) return [];
  return [node, ...elements(node.props.children)];
}
/** Every string or number rendered as text. */
function texts(node: ReactNode): string[] {
  if (Array.isArray(node)) return node.flatMap(texts);
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (!isValidElement<Props>(node)) return [];
  return texts(node.props.children);
}

describe('opengraph-image', () => {
  let response: Response;
  beforeEach(async () => { response = await route.default(); });

  it('is a node route for a 1200 × 630 PNG', () => {
    expect(route.runtime).toBe('nodejs');
    expect(route.size).toEqual({ width: 1200, height: 630 });
    expect(route.contentType).toBe('image/png');
  });

  it('prints the headline and the deck and nothing else: no private number reaches the image', () => {
    expect(texts(captured.element)).toEqual([copy.sentence.headline, copy.sentence.deck]);
    const byText = (t: string) => elements(captured.element).find((e) => e.props.children === t)!;
    expect(byText(copy.sentence.headline).props.style).toMatchObject({ fontSize: 64, fontWeight: 700 });
    expect(byText(copy.sentence.deck).props.style).toMatchObject({ fontSize: 22 });
  });

  it('sets it in Archivo 700 from @fontsource/archivo, on the light paper', async () => {
    const woff = await readFile(path.join(process.cwd(), 'node_modules/@fontsource/archivo/files/archivo-latin-700-normal.woff'));
    const fonts = captured.options!.fonts as Array<{ name: string; data: ArrayBuffer | Buffer; weight: number; style: string }>;
    expect(fonts).toHaveLength(1);
    expect(fonts[0]).toMatchObject({ name: 'Archivo', weight: 700, style: 'normal' });
    expect(Buffer.from(fonts[0].data as ArrayBuffer).equals(woff)).toBe(true);
    expect(captured.options).toMatchObject({ width: 1200, height: 630 });
    const root = captured.element as ReactElement<Props>;
    expect(root.props.style).toMatchObject({ background: PALETTES.light.paper, color: PALETTES.light.ink, fontFamily: 'Archivo' });
    expect(PALETTES.light.paper).toBe('#F1EEE9');
  });

  it('draws the poster frame as an inline SVG, one rect per POSTER_RECTS entry, toned ink, pencil and hot', () => {
    const svg = elements(captured.element).filter((e) => e.type === 'svg');
    expect(svg).toHaveLength(1);
    expect(svg[0].props).toMatchObject({ width: 1200, height: 630, viewBox: '0 0 1200 630' });
    const rects = elements(svg[0]).filter((e) => e.type === 'rect');
    expect(rects).toHaveLength(POSTER_RECTS.length);
    const tone = [PALETTES.light.ink, PALETTES.light.pencil, PALETTES.light.hot];
    rects.forEach((r, i) => {
      const [x, y, width, height, t] = POSTER_RECTS[i];
      expect(r.props).toMatchObject({ x, y, width, height, fill: tone[t] });
    });
    // the frame sits right of the copy and low: its rects are all right of the headline's column
    expect(Math.min(...POSTER_RECTS.map((r) => r[0]))).toBeGreaterThan(500);
  });

  it('renders a 1200 × 630 PNG', async () => {
    expect(response.headers.get('content-type')).toBe('image/png');
    const png = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(png.slice(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const view = new DataView(png.buffer, png.byteOffset);
    expect([view.getUint32(16), view.getUint32(20)]).toEqual([1200, 630]);   // IHDR width, height
  }, 30_000);
});
