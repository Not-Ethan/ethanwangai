// The og image (design §10, gate G4): the poster frame, the pull-back of section 08, as the emitter's flat tone rects
// on the light paper, with the headline and the deck at the top left. Only public words: no figure from facts.ts, so
// no private number can reach it.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { POSTER_RECTS } from '@/generated/posterPlate';
import { copy } from '@/site/copy';
import { PALETTES } from '@/theme/palettes';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const FONT = path.join(process.cwd(), 'node_modules/@fontsource/archivo/files/archivo-latin-700-normal.woff');
const PAPER = PALETTES.light;
/** POSTER_RECTS' tone index: 0 ink, 1 pencil, 2 hot. */
const TONE = [PAPER.ink, PAPER.pencil, PAPER.hot] as const;
/** The copy's left and top margin, and its measures: each stops short of the frame's leftmost rect beside it (x 522 by
 * the headline, 573 by the deck, which then sets on one line). */
const MARGIN = 64, HEADLINE_W = 440, DECK_W = 480;

export default async function Image() {
  const archivo = await readFile(FONT);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: PAPER.paper, color: PAPER.ink, fontFamily: 'Archivo' }}>
        <svg width={size.width} height={size.height} viewBox={`0 0 ${size.width} ${size.height}`} style={{ position: 'absolute', left: 0, top: 0 }}>
          {POSTER_RECTS.map(([x, y, width, height, tone], i) => <rect key={i} x={x} y={y} width={width} height={height} fill={TONE[tone]} />)}
        </svg>
        <div style={{ position: 'absolute', left: MARGIN, top: MARGIN - 8, display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: HEADLINE_W, fontSize: 64, fontWeight: 700, lineHeight: 0.92, letterSpacing: -1.92 }}>{copy.sentence.headline}</div>
          <div style={{ width: DECK_W, fontSize: 22, lineHeight: 1.35, marginTop: 24 }}>{copy.sentence.deck}</div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Archivo', data: archivo, weight: 700, style: 'normal' }] },
  );
}
