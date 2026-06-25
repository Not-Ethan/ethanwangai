// Shared, deterministic terrain height field. The ground mesh displaces its
// vertices with this, and the trees sample it so they sit ON the hills rather
// than floating above a flat plane.
export function terrainHeight(x: number, z: number): number {
  return (
    0.8 * Math.sin(x * 0.12) * Math.cos(z * 0.1) +
    0.4 * Math.sin(x * 0.31 + 2.1) * Math.cos(z * 0.26 + 0.5) +
    0.25 * Math.sin((x + z) * 0.07)
  );
}
