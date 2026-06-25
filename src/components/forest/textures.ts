import * as THREE from "three";

// Small seeded PRNG so the silhouettes look hand-made but render deterministically.
function mulberry32(seed: number) {
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
 * A wide, tileable conifer-treeline silhouette drawn in white on transparent.
 * Wrapped around a cylinder it becomes a layered ridge on the horizon; the
 * material tints the white, the alpha carves the tree shapes.
 */
export function makeTreelineTexture(seed: number, w = 2048, h = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const rnd = mulberry32(seed);

  const base = h * 0.62; // tree bases sit here; solid fill below
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, base);

  let x = 0;
  while (x < w) {
    const tw = 22 + rnd() * 60;
    const th = base * (0.35 + rnd() * 0.6);
    const peak = x + tw / 2;
    // a couple of stepped tiers so each conifer reads as a fir, not a triangle
    ctx.lineTo(peak - tw * 0.22, base - th * 0.55);
    ctx.lineTo(peak, base - th);
    ctx.lineTo(peak + tw * 0.22, base - th * 0.55);
    x += tw;
    ctx.lineTo(x, base - th * (0.1 + rnd() * 0.14));
  }

  ctx.lineTo(w, base);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A soft radial blob (white centre → transparent edge) for mist and glows. */
export function makeSoftCircleTexture(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.5, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}
