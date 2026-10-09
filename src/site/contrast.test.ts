import { describe, it, expect } from 'vitest';
import { PALETTE } from '@/valley/palette';
import { parseColor, over, relativeLuminance, contrastRatio } from './contrast';

const rgb = (css: string) => parseColor(css).rgb;

/** The ground colours copy and labels can sit over (the sky stops are Stage 0's palette.test.ts). */
function labelBackgrounds(): Record<string, string> {
  return {
    terrainLow: PALETTE.terrainLow,
    terrainMid: PALETTE.terrainMid,
    terrainSlope: PALETTE.terrainSlope,
    terrainCrest: PALETTE.terrainCrest,
    treeline: PALETTE.treeline,
  };
}

function scrimBackgrounds(): Record<string, string> {
  return { ...labelBackgrounds(), river: PALETTE.river };
}

describe('contrast maths (WCAG 2.x)', () => {
  it('parses hex and rgba', () => {
    expect(parseColor('#FFC98A')).toEqual({ rgb: [255, 201, 138], alpha: 1 });
    expect(parseColor('rgba(5,7,15,0.72)')).toEqual({ rgb: [5, 7, 15], alpha: 0.72 });
    expect(parseColor('rgba(5, 7, 15, 0.72)')).toEqual({ rgb: [5, 7, 15], alpha: 0.72 });
  });
  it('matches the reference values', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(contrastRatio([119, 119, 119], [255, 255, 255])).toBeCloseTo(4.48, 2);
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 6);
    expect(over([0, 0, 0], 0.5, [255, 255, 255])).toEqual([127.5, 127.5, 127.5]);
  });
});

describe('copy contrast over the ground (spec §9: 4.5:1; the sky stops are Stage 0\'s)', () => {
  const scrim = parseColor(PALETTE.scrim);

  it('body copy and mono over the scrim on every terrain colour and the river are ≥ 4.5:1', () => {
    for (const [name, bg] of Object.entries(scrimBackgrounds())) {
      const behind = over(scrim.rgb, scrim.alpha, rgb(bg));
      expect(contrastRatio(rgb(PALETTE.ink), behind), `ink on scrim over ${name}`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(rgb(PALETTE.inkDim), behind), `inkDim on scrim over ${name}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('labels (ink, no scrim) over every terrain ramp colour are ≥ 4.5:1', () => {
    for (const [name, bg] of Object.entries(labelBackgrounds())) {
      expect(contrastRatio(rgb(PALETTE.ink), rgb(bg)), `ink over ${name}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
