import { segment, lerp } from "@/lib/scroll";

// A distinct camera composition per section. Together with the per-section mood
// (time of day) this makes each chapter read as its own scene; the rig eases
// between them so transitions stay clean.
export type SceneCam = {
  y: number; // camera height
  lookY: number; // height of the point the camera looks at
  fov: number;
  x: number; // lateral offset of the framing
  lookDist: number; // how far ahead the camera looks
};

export const SCENES: SceneCam[] = [
  // 0 — Hero: low, looking down the misty path into the trees.
  { y: 0.9, lookY: 1.2, fov: 55, x: 0, lookDist: 14 },
  // 1 — About / clearing: lifted and opened up, a wider breath.
  { y: 1.9, lookY: 1.5, fov: 62, x: -0.6, lookDist: 16 },
  // 2 — Experience / the trail: low and tight, the ground leading forward.
  { y: 0.7, lookY: 0.55, fov: 50, x: 0, lookDist: 18 },
  // 3 — Projects / grove: raised, angled toward the trees off the path.
  { y: 1.5, lookY: 1.7, fov: 58, x: 1.1, lookDist: 13 },
  // 4 — Skills / undergrowth: down low and wide among the brush.
  { y: 0.6, lookY: 0.5, fov: 64, x: -0.9, lookDist: 12 },
  // 5 — Contact / night clearing: lifted, gazing up toward the moon.
  { y: 2.2, lookY: 3.0, fov: 60, x: 0, lookDist: 15 },
];

export type ResolvedScene = SceneCam;

export function resolveScene(progress: number, out: ResolvedScene) {
  const { a, b, t } = segment(progress, SCENES.length);
  const sa = SCENES[a];
  const sb = SCENES[b];
  out.y = lerp(sa.y, sb.y, t);
  out.lookY = lerp(sa.lookY, sb.lookY, t);
  out.fov = lerp(sa.fov, sb.fov, t);
  out.x = lerp(sa.x, sb.x, t);
  out.lookDist = lerp(sa.lookDist, sb.lookDist, t);
  return out;
}
