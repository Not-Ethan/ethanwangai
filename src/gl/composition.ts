// Which camera frames the valley (spec §4, §11): portrait is aspect < 1 (vw < vh), never the tier, so a small
// landscape laptop on the phone tier keeps the landscape camera. The names come from cameraCore; this module
// only re-exports them and names the base pose. composeCamera stays the only writer of the camera.
import { CAMERA_LANDSCAPE, CAMERA_PORTRAIT } from '@/valley/layout';
import type { Vec3 } from '@/valley/types';
import { isPortrait } from './cameraCore';

export { isPortrait, CAMERA_NEAR, CAMERA_FAR } from './cameraCore';

export function cameraFor(width: number, height: number): { position: Vec3; lookAt: Vec3; fov: number } {
  return isPortrait(width, height) ? CAMERA_PORTRAIT : CAMERA_LANDSCAPE;
}
