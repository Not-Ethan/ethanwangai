// The per-frame readout: one mutable object Clocks writes every frame and the DOM chrome reads in its own rAF
// (Stage 3's ladder, uptime and hover readout). No React state on this path. `pose` is the camera pose Clocks
// evaluated this frame, which CameraRig applies next at priority 0; it starts on the desktop hero key so the
// first frame is framed before Clocks has run.
import { CAMERA_KEYS } from '@/bench/camera';

export interface HudPose { position: number[]; lookAt: number[]; fov: number }

const hero = CAMERA_KEYS.desktop[0].pose;

export const hud = {
  section: 0,
  u: 0,
  compile: 0,        // the quoter's uCompile, 0..1: the ladder's parts rung ticks with it
  lines: 0,          // rows-band line count; the ink system (Stage 3) writes it, Clocks does not
  parts: 0,          // parts of the quoter and the intake drawn as ink right now: the ladder's `parts`
  uptime: 0,         // machine-clock seconds, wall time
  running: false,    // the quoter's lever has locked
  hover: { machine: -1, col: -1, x: 0, y: 0 },
  pose: { position: [...hero.position], lookAt: [...hero.lookAt], fov: hero.fov } as HudPose,
};
