// Baked curl-noise volume for the ink flight shader (design "Flight"): three independent
// 3-octave value-noise potentials on a hashed 3D lattice, curled by central differences to
// produce a divergence-free vector field, normalized by its global max magnitude and packed
// into an RGBA8 volume (alpha always 255). generateCurl is pure TypeScript with no three
// import, so the test can run in a node environment with no WebGL; createCurlTexture is the
// only export that reaches into three, to wrap those bytes in a Data3DTexture.
import { Data3DTexture, RGBAFormat, LinearFilter, RepeatWrapping } from 'three';

const OCTAVES = [
  { freq: 2, amp: 4 },
  { freq: 4, amp: 2 },
  { freq: 8, amp: 1 },
] as const;

/** Deterministic hash of a signed 3D lattice point plus a seed, into [0, 1). */
function hash(x: number, y: number, z: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 3266489917) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Trilinearly-interpolated hash lattice, recentred from hash's [0, 1) to [-1, 1). */
function latticeNoise(x: number, y: number, z: number, seed: number): number {
  const x0 = Math.floor(x); const y0 = Math.floor(y); const z0 = Math.floor(z);
  const tx = x - x0; const ty = y - y0; const tz = z - z0;
  const c000 = hash(x0, y0, z0, seed); const c100 = hash(x0 + 1, y0, z0, seed);
  const c010 = hash(x0, y0 + 1, z0, seed); const c110 = hash(x0 + 1, y0 + 1, z0, seed);
  const c001 = hash(x0, y0, z0 + 1, seed); const c101 = hash(x0 + 1, y0, z0 + 1, seed);
  const c011 = hash(x0, y0 + 1, z0 + 1, seed); const c111 = hash(x0 + 1, y0 + 1, z0 + 1, seed);
  const x00 = c000 + (c100 - c000) * tx; const x10 = c010 + (c110 - c010) * tx;
  const x01 = c001 + (c101 - c001) * tx; const x11 = c011 + (c111 - c011) * tx;
  const y0i = x00 + (x10 - x00) * ty; const y1i = x01 + (x11 - x01) * ty;
  return (y0i + (y1i - y0i) * tz) * 2 - 1;
}

/** 3-octave value-noise potential; `axis` decorrelates the seed so the three potentials (whose
 * curl is taken below) don't share a lattice. */
function potential(x: number, y: number, z: number, seed: number, axis: number): number {
  let sum = 0;
  for (let o = 0; o < OCTAVES.length; o++) {
    const { freq, amp } = OCTAVES[o];
    sum += latticeNoise(x * freq, y * freq, z * freq, seed + axis * 101 + o * 757) * amp;
  }
  return sum;
}

/** Curl of the vector potential (psiX, psiY, psiZ) at a normalized point, by central
 * differences with step h, giving a field that is divergence-free to first order. */
function curlAt(x: number, y: number, z: number, seed: number, h: number): [number, number, number] {
  const dPsiZdy = (potential(x, y + h, z, seed, 2) - potential(x, y - h, z, seed, 2)) / (2 * h);
  const dPsiYdz = (potential(x, y, z + h, seed, 1) - potential(x, y, z - h, seed, 1)) / (2 * h);
  const dPsiXdz = (potential(x, y, z + h, seed, 0) - potential(x, y, z - h, seed, 0)) / (2 * h);
  const dPsiZdx = (potential(x + h, y, z, seed, 2) - potential(x - h, y, z, seed, 2)) / (2 * h);
  const dPsiYdx = (potential(x + h, y, z, seed, 1) - potential(x - h, y, z, seed, 1)) / (2 * h);
  const dPsiXdy = (potential(x, y + h, z, seed, 0) - potential(x, y - h, z, seed, 0)) / (2 * h);
  return [dPsiZdy - dPsiYdz, dPsiXdz - dPsiZdx, dPsiYdx - dPsiXdy];
}

/** RGBA8 bytes of a `size`³ curl-noise volume: R/G/B are the normalized curl components mapped
 * from [-1, 1] to [0, 255], alpha is always 255. */
export function generateCurl(size = 32, seed = 7): Uint8Array {
  const h = 1 / size;
  const vectors = new Float32Array(size * size * size * 3);
  let maxMag = 1e-6;
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const [vx, vy, vz] = curlAt(x / size, y / size, z / size, seed, h);
        const i = (z * size * size + y * size + x) * 3;
        vectors[i] = vx; vectors[i + 1] = vy; vectors[i + 2] = vz;
        const mag = Math.sqrt(vx * vx + vy * vy + vz * vz);
        if (mag > maxMag) maxMag = mag;
      }
    }
  }
  const bytes = new Uint8Array(size * size * size * 4);
  for (let v = 0; v < size * size * size; v++) {
    const src = v * 3; const dst = v * 4;
    bytes[dst] = Math.round((vectors[src] / maxMag + 1) * 127.5);
    bytes[dst + 1] = Math.round((vectors[src + 1] / maxMag + 1) * 127.5);
    bytes[dst + 2] = Math.round((vectors[src + 2] / maxMag + 1) * 127.5);
    bytes[dst + 3] = 255;
  }
  return bytes;
}

/** The baked curl volume as a Data3DTexture, wrapping on all three axes so the ink shader can
 * sample `uCurl` continuously as flight progresses. */
export function createCurlTexture(): Data3DTexture {
  const size = 32;
  const texture = new Data3DTexture(generateCurl(size), size, size, size);
  texture.format = RGBAFormat;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.wrapR = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}
