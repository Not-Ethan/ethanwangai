// Every position in the valley (spec §4, §4.2–§4.7). Nothing is hand-placed in a component; components read these.
// Ground-standing places take y = heightAt(x, z). The mill wheel is the one exception: §4.5 fixes its hub at y = 2.6.
import type { Vec3 } from './types';
import { heightAt } from './terrain';

/** Hero camera, landscape (§4). near 1, far 260. */
export const CAMERA_LANDSCAPE: { position: Vec3; lookAt: Vec3; fov: number } = {
  position: [0, 14, 70], lookAt: [0, 2, -10], fov: 36,
};
/** Hero camera, portrait (aspect < 1) (§4). */
export const CAMERA_PORTRAIT: { position: Vec3; lookAt: Vec3; fov: number } = {
  position: [0, 22, 96], lookAt: [0, 0, -12], fov: 70,
};
export const CAMERA_NEAR = 1;
export const CAMERA_FAR = 260;

/** The ridge crest the trades sit on (§4.6): x0 → x1 is jan 2026 → oct 2026. */
export const RIDGE = { x0: -36, x1: 40, z: -36 } as const;

const ground = (x: number, z: number): Vec3 => [x, heightAt(x, z), z];

export const PLACES: Record<
  'hut' | 'nist' | 'wvu' | 'kalshiLamp' | 'bar1' | 'bar2' | 'bar3' | 'bar4' | 'mill' | 'millWheel' | 'lot'
  | 'hill1' | 'hill2' | 'hill3' | 'hill4' | 'hill5',
  Vec3
> = {
  hut: ground(-18, 22),          // §4.2 near bank, left
  nist: ground(-34, -14),        // §4.3 far-left hill
  wvu: ground(-27, -18),
  kalshiLamp: ground(2, -30),    // §4.6 foot of the ridge
  bar1: ground(-10, -20),        // §4.4 far bank, left to right
  bar2: ground(0, -22),
  bar3: ground(10, -21),
  bar4: ground(20, -23),
  mill: ground(30, -12),         // §4.5 on the mill pad
  millWheel: [30, 2.6, -5],      // §4.5 wheel hub, overhanging the river
  lot: ground(6, 10),            // §4.7 the visitor's lot, low on the near bank
  hill1: ground(12, 15),         // §4.7 hillside sites, up the slope toward the camera
  hill2: ground(18, 19),
  hill3: ground(8, 20),
  hill4: ground(22, 13),
  hill5: ground(15, 24),
};
