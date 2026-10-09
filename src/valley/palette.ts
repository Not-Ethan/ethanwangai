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
  terrainLow: '#16241C',
  terrainMid: '#1F3326',
  terrainSlope: '#2B3340',
  terrainCrest: '#0C0F16',
  treeline: '#090B10',
  river: '#6E8AA6',
  mist: '#8FA3B8',
} as const;

export const ALPHA = { hedge: 0.5, rain: 0.35 } as const;

export type SkyName = 'dusk' | 'blue' | 'night' | 'predawn';
export interface SkyKeyframe { name: SkyName; tod: number; zenith: string; horizon: string; east: string; sun: string; sunIntensity: number }

/** Sky and sun/moon keyframes. Hemisphere sky = zenith, hemisphere ground = PALETTE.terrainLow, fog follows the horizon. */
export const SKY_KEYFRAMES: readonly SkyKeyframe[] = [
  { name: 'dusk', tod: 0, zenith: '#1B2238', horizon: '#C9825A', east: '#2A2E48', sun: '#E8A070', sunIntensity: 0.6 },
  { name: 'blue', tod: 0.3, zenith: '#0E1426', horizon: '#3E5A7A', east: '#141A2E', sun: '#8FA8D0', sunIntensity: 0.35 },
  { name: 'night', tod: 0.6, zenith: '#05070F', horizon: '#101830', east: '#070A14', sun: '#9FB2D8', sunIntensity: 0.25 },
  { name: 'predawn', tod: 1, zenith: '#0A0F1E', horizon: '#1E2A40', east: '#3E5068', sun: '#B8C4D8', sunIntensity: 0.3 },
];

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Every colour as [CSS custom property, value]: --ink-dim for PALETTE.inkDim, --sky-night-zenith for night's zenith. */
export function cssVars(): [string, string][] {
  const flat = Object.entries(PALETTE).map(([k, v]): [string, string] => [`--${kebab(k)}`, v]);
  const sky = SKY_KEYFRAMES.flatMap((k) =>
    (['zenith', 'horizon', 'east', 'sun'] as const).map((f): [string, string] => [`--sky-${k.name}-${f}`, k[f]]));
  return [...flat, ...sky];
}
