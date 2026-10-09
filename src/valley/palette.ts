// The one dark palette (spec §9). The only place colour literals exist in .ts/.tsx; src/app/globals.css declares the
// same values as CSS variables (palette.test.ts checks both, and the scrim contrast).

export const PALETTE = {
  // copy
  ink: '#E9E4DA',
  inkDim: '#9A958C',
  rule: '#2A2C33',
  scrim: 'rgba(5,7,15,0.72)',
  // emitters: warm is the hut, cabins, visitor and hillside
  warm: '#FFC98A',
  ridge: '#FFB45A',
  porch: '#FFD9A0',
  millWindow: '#FFC27A',
  lamp: '#FFD2A0',
  // lines and weather (alphas in ALPHA)
  hedge: '#8FA3B8',
  rain: '#9AAEC4',
  // building and house bodies
  wall: '#1A1F28',
  roof: '#11151C',
  // terrain ramp, river, mist
  terrainLow: '#14211A',
  terrainMid: '#213829',
  terrainSlope: '#33404F',
  terrainCrest: '#0E121A',
  treeline: '#090B10',
  river: '#6E8AA6',
  mist: '#8FA3B8',
} as const;

export const ALPHA = { hedge: 0.5, rain: 0.35 } as const;

export type SkyName = 'dusk' | 'blue' | 'night' | 'predawn';
export interface SkyKeyframe { name: SkyName; tod: number; zenith: string; horizon: string; east: string; sun: string; sunIntensity: number }

/** Sky and sun/moon keyframes. Hemisphere sky = horizon, hemisphere ground = PALETTE.terrainMid, fog follows the horizon.
 *  sunIntensity is tuned by eye under ACES with the 8.0 hemisphere (Scene.tsx): the ground albedo is ~0.02-0.05 linear, so the key light
 *  must be large to model it, and it rises toward night because the night moon is overhead (y 0.8, so n.l is high) while the dusk sun
 *  is grazing (y 0.18). Modelled up-facing ground brightness is dusk > night > blue, and the screenshots confirm the open view is lighter and warmer than kalshi. */
export const SKY_KEYFRAMES: readonly SkyKeyframe[] = [
  { name: 'dusk', tod: 0, zenith: '#1B2238', horizon: '#C9825A', east: '#2A2E48', sun: '#E8A070', sunIntensity: 10 },
  { name: 'blue', tod: 0.06, zenith: '#0E1426', horizon: '#2E4360', east: '#141A2E', sun: '#8FA8D0', sunIntensity: 12 },
  { name: 'night', tod: 0.6, zenith: '#05070F', horizon: '#101830', east: '#070A14', sun: '#9FB2D8', sunIntensity: 16 },
  { name: 'predawn', tod: 1, zenith: '#0A0F1E', horizon: '#1E2A40', east: '#5A6E8C', sun: '#B8C4D8', sunIntensity: 14 },
];

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Every colour as [CSS custom property, value]: --ink-dim for PALETTE.inkDim, --sky-night-zenith for night's zenith. */
export function cssVars(): [string, string][] {
  const flat = Object.entries(PALETTE).map(([k, v]): [string, string] => [`--${kebab(k)}`, v]);
  const sky = SKY_KEYFRAMES.flatMap((k) =>
    (['zenith', 'horizon', 'east', 'sun'] as const).map((f): [string, string] => [`--sky-${k.name}-${f}`, k[f]]));
  return [...flat, ...sky];
}
