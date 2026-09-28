// The per-frame readout: one mutable object Clocks writes every frame and the DOM chrome reads in its own rAF
// (Stage 3's ladder, uptime and hover readout). No React state on this path. `pose` is the camera pose Clocks
// evaluated this frame, which CameraRig applies next at priority 0; it starts on the desktop hero key so the
// first frame is framed before Clocks has run.
import { CAMERA_KEYS } from '@/bench/camera';
import { MACHINE_COUNT } from '@/bench/types';

export interface HudPose { position: number[]; lookAt: number[]; fov: number }

const hero = CAMERA_KEYS.desktop[0].pose;

export const hud = {
  section: 0,
  u: 0,
  compile: 0,        // the quoter's uCompile, 0..1: the ladder's lines rung ticks with it
  compilePerMachine: new Float32Array(MACHINE_COUNT),  // every machine's uCompile, 0..1: the ladder's parts and the footer's total
  parts: 0,          // parts of the quoter and the intake past the shader's ink threshold; the DOM counts its own at lock
  uptime: 0,         // machine-clock seconds, wall time
  running: false,    // the quoter's lever has locked
  runningSince: 0,   // `uptime` on the frame the quoter's lever last locked; the running clock is uptime − runningSince
  rung: -1,          // -1..5, section 02's lit ladder rung (sceneState's rung)
  click: -1,         // -1..3, section 02's last revealed copy line (sceneState's click)
  hover: { machine: -1, col: -1, x: 0, y: 0 },
  pose: { position: [...hero.position], lookAt: [...hero.lookAt], fov: hero.fov } as HudPose,
};
