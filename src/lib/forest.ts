// Deterministic generators for the forest scenery. Everything is seeded so
// the SVG paths render identically on the server and the client.

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A jagged conifer ridge silhouette, drawn as a closed path along the bottom
 * of a `width` x `height` viewBox.
 */
export function treelinePath(
  seed: number,
  width = 1440,
  height = 200,
  minTree = 0.45,
  maxTree = 0.95
) {
  const rnd = mulberry32(seed);
  const pts: string[] = [`M0 ${height}`];
  let x = 0;
  pts.push(`L0 ${(height - height * (minTree + rnd() * 0.2)).toFixed(1)}`);
  while (x < width) {
    const tw = 26 + rnd() * 52;
    const th = height * (minTree + rnd() * (maxTree - minTree));
    const peak = x + tw / 2;
    const tier = th * (0.5 + rnd() * 0.15);
    pts.push(`L${(peak - tw * 0.2).toFixed(1)} ${(height - tier).toFixed(1)}`);
    pts.push(`L${peak.toFixed(1)} ${(height - th).toFixed(1)}`);
    pts.push(`L${(peak + tw * 0.2).toFixed(1)} ${(height - tier).toFixed(1)}`);
    x += tw;
    pts.push(`L${x.toFixed(1)} ${(height - th * (0.12 + rnd() * 0.12)).toFixed(1)}`);
  }
  pts.push(`L${width} ${height} Z`);
  return pts.join(" ");
}

/**
 * A gently rising "terrain" line, used as the chart in the Kalshi card.
 * Returns a smooth stroke path, a closed area path, and the final point.
 */
export function terrainSparkline(seed: number, width = 600, height = 120, steps = 26) {
  const rnd = mulberry32(seed);
  const pts: [number, number][] = [];
  let y = height * 0.86;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    y -= rnd() * (height / steps) * 1.7 - (height / steps) * 0.35;
    y = Math.max(height * 0.08, Math.min(height * 0.95, y));
    pts.push([x, y]);
  }
  let line = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const mx = (px + cx) / 2;
    line += ` Q${px.toFixed(1)} ${py.toFixed(1)} ${mx.toFixed(1)} ${((py + cy) / 2).toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  line += ` L${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  return { line, area, last };
}

export type Star = {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  bright: boolean;
};

export function makeStars(seed: number, count: number): Star[] {
  const rnd = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    x: rnd() * 100,
    y: rnd() * 68,
    size: 1 + rnd() * 1.8,
    delay: rnd() * 6,
    duration: 2.4 + rnd() * 4,
    bright: rnd() > 0.78,
  }));
}
