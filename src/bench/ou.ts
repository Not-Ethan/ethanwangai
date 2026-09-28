// Seeded Ornstein-Uhlenbeck quote texture for the quoter bed. Pure: no React, no DOM, no three renderer.
import { mulberry32 } from './hash';

/** Texture dimensions: markets across, steps down, rows = price levels R is clamped to. */
export const OU = { markets: 256, steps: 2048, rows: 48 } as const;

const MID = OU.rows / 2;   // 24: the level the mid reverts to
const THETA = 0.05;        // reversion per step
const SIGMA = 0.9;         // gaussian step size
const BASE = 0.04;         // baseline fill intensity
const DECAY = 0.7;         // excitation kept each step
const KICK = 0.25;         // excitation added by a fill

/** Box-Muller on the shared rng, keeping the spare deviate. */
function gaussian(rng: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) { const g = spare; spare = null; return g; }
    const r = Math.sqrt(-2 * Math.log(1 - rng()));   // 1 - u keeps log away from 0
    const t = 2 * Math.PI * rng();
    spare = r * Math.sin(t);
    return r * Math.cos(t);
  };
}

/**
 * RGBA8, length markets × steps × 4, row-major by step then market: index ((step × markets) + market) × 4.
 * R = mid level 0..rows-1, G = bid offset 1..4, B = ask offset 1..4,
 * A = steps since the last fill (0 = a fill on this step), saturating at 255.
 * Fills are Hawkes-style: λ = BASE + excite, where excite decays by DECAY each step and gains KICK on a fill.
 */
export function generateOU(seed: number): Uint8Array {
  const { markets, steps, rows } = OU;
  const rng = mulberry32(seed);
  const gauss = gaussian(rng);
  const out = new Uint8Array(markets * steps * 4);
  for (let m = 0; m < markets; m++) {
    let x = MID + 8 * (rng() - 0.5);
    let excite = 0;
    let since = 255;
    for (let s = 0; s < steps; s++) {
      x += THETA * (MID - x) + SIGMA * gauss();
      const bid = 1 + Math.floor(4 * rng() ** 2);
      const ask = 1 + Math.floor(4 * rng() ** 2);
      excite *= DECAY;
      if (rng() < BASE + excite) { excite += KICK; since = 0; } else since = Math.min(255, since + 1);
      const i = (s * markets + m) * 4;
      out[i] = Math.min(rows - 1, Math.max(0, Math.round(x)));
      out[i + 1] = bid;
      out[i + 2] = ask;
      out[i + 3] = since;
    }
  }
  return out;
}
