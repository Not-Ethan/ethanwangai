// SVG plate projection for the build-time emitter. Pure: three's math classes only, one string builder, no DOM.
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { KIND, PRIMITIVE, type LayoutResult, type LeaderLine, type MachineId, type PartInstance, type PrimitiveId, type Vec3 } from './types';
import type { Pose } from './camera';

/** One part on screen: geometry centre (x, y) in NDC (y up), size (w, h) in NDC, NDC depth, and for bars and rods the angle of the long axis in degrees (0 otherwise). */
export interface ProjectedPart { part: PartInstance; x: number; y: number; w: number; h: number; depth: number; angle: number }
export interface HeroPlateOptions { inkMachines: MachineId[]; pencilMachines: MachineId[]; cropMachines: MachineId[] }

/**
 * Extent of each primitive's unit geometry along its local axes, before the instance scale, copied from the kit
 * geometry pinned in docs/plans/2026-09-28-dbso-plan-03-gl-core.md (Task 2.4, createKitGeometries):
 * cell Box(0.8,1,0.8).translate(0,0.5,0); cap Box(0.8,0.03,0.8); bar Box(1,0.12,0.12); rod Cylinder(0.05,0.05,1,8);
 * ring Torus(0.5,0.06,8,24); tile Box(0.2,0.02,0.2).translate(0,0.01,0). The plan is the source of truth: if it
 * changes the kits, change this table and UNIT_CENTRE to match, or the plate-to-GL cross-fades will jump.
 */
export const UNIT_EXTENT: Record<PrimitiveId, Vec3> = {
  [PRIMITIVE.cell]: [0.8, 1, 0.8],
  [PRIMITIVE.cap]: [0.8, 0.03, 0.8],
  [PRIMITIVE.bar]: [1, 0.12, 0.12],
  [PRIMITIVE.rod]: [0.1, 1, 0.1],
  [PRIMITIVE.ring]: [1.12, 1.12, 0.12],
  [PRIMITIVE.tile]: [0.2, 0.02, 0.2],
};

/**
 * Where each primitive's geometry centre sits relative to the instance origin, in local units before the instance
 * scale (the translate() in the plan's kit geometry): a cell stands on its origin, a tile sits on it, the rest are
 * centred. Scaled and rotated with the instance and added to its position before projection.
 */
export const UNIT_CENTRE: Record<PrimitiveId, Vec3> = {
  [PRIMITIVE.cell]: [0, 0.5, 0],
  [PRIMITIVE.cap]: [0, 0, 0],
  [PRIMITIVE.bar]: [0, 0, 0],
  [PRIMITIVE.rod]: [0, 0, 0],
  [PRIMITIVE.ring]: [0, 0, 0],
  [PRIMITIVE.tile]: [0, 0.01, 0],
};

const NEAR = 0.1, FAR = 100;
/** Hairline width in NDC units: about one pixel at a 1000 px tall frame. */
const HAIRLINE = 0.002;
/** Parts wholly outside this NDC box are dropped. x is wider than the frame because the page rescales x by referenceAspect / currentAspect. */
const CULL = { x: 1.6, y: 1.1 };

const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 2 2" preserveAspectRatio="none">';
const FLIP = 'transform="scale(1,-1)"';

function makeCamera(pose: Pose, aspect: number): PerspectiveCamera {
  const cam = new PerspectiveCamera(pose.fov, aspect, NEAR, FAR);
  cam.position.set(pose.position[0], pose.position[1], pose.position[2]);
  cam.lookAt(pose.lookAt[0], pose.lookAt[1], pose.lookAt[2]);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  return cam;
}

const V = new Vector3();
function ndc(p: Vec3, cam: PerspectiveCamera): [number, number, number] {
  V.set(p[0], p[1], p[2]).project(cam);
  return [V.x, V.y, V.z];
}

/** Trims trailing zeros so the plate stays small; four decimals is under a tenth of a pixel at 1000 px. */
function f(n: number): string {
  const s = n.toFixed(4).replace(/\.?0+$/, '');
  return s === '' || s === '-' || s === '-0' ? '0' : s;
}

/**
 * Projects every part's rest pose to NDC (y up). The centre is the instance position plus the scaled, rotated
 * UNIT_CENTRE offset, so a cell is drawn standing on its origin as the GL kit draws it. Each local axis contributes
 * its projected half-extent (scale × UNIT_EXTENT, rotated by the rest quaternion). A bar or rod becomes a rect along its projected long
 * axis: width is its projected length, height its projected thickness, angle its on-screen direction. Every
 * other primitive is the axis-aligned box of the three half-extents, so a cell keeps its footprint and nothing
 * collapses to a zero-size rect.
 */
export function projectParts(result: LayoutResult, pose: Pose, aspect: number): ProjectedPart[] {
  return projectAll(result.parts, makeCamera(pose, aspect));
}

/** Bars and rods are line segments, drawn along their projected long axis; every other primitive is a box. */
const ALONG_AXIS: ReadonlySet<PrimitiveId> = new Set<PrimitiveId>([PRIMITIVE.bar, PRIMITIVE.rod]);

function projectAll(parts: PartInstance[], cam: PerspectiveCamera): ProjectedPart[] {
  const c = new Vector3(), p = new Vector3(), q = new Quaternion(), axis = new Vector3();
  const d: [number, number][] = [[0, 0], [0, 0], [0, 0]];
  const out: ProjectedPart[] = [];
  for (const part of parts) {
    q.set(part.quaternion[0], part.quaternion[1], part.quaternion[2], part.quaternion[3]);
    const unit = UNIT_EXTENT[part.primitive], centre = UNIT_CENTRE[part.primitive];
    axis.set(part.scale[0] * centre[0], part.scale[1] * centre[1], part.scale[2] * centre[2]).applyQuaternion(q);
    const px = part.position[0] + axis.x, py = part.position[1] + axis.y, pz = part.position[2] + axis.z;
    c.set(px, py, pz).project(cam);
    const ext = [part.scale[0] * unit[0], part.scale[1] * unit[1], part.scale[2] * unit[2]];
    for (let k = 0; k < 3; k++) {
      const half = ext[k] / 2;
      axis.set(k === 0 ? half : 0, k === 1 ? half : 0, k === 2 ? half : 0).applyQuaternion(q);
      p.set(px + axis.x, py + axis.y, pz + axis.z).project(cam);
      d[k][0] = p.x - c.x;
      d[k][1] = p.y - c.y;
    }
    let w: number, h: number, angle = 0;
    if (ALONG_AXIS.has(part.primitive)) {
      const long = ext[0] >= ext[1] && ext[0] >= ext[2] ? 0 : ext[1] >= ext[2] ? 1 : 2;
      const [lx, ly] = d[long];
      const len = Math.hypot(lx, ly);
      const ux = len > 0 ? lx / len : 1, uy = len > 0 ? ly / len : 0;
      let thick = 0;
      for (let k = 0; k < 3; k++) if (k !== long) thick += Math.abs(d[k][0] * -uy + d[k][1] * ux);
      w = 2 * len;
      h = 2 * thick;
      angle = (Math.atan2(ly, lx) * 180) / Math.PI;
    } else {
      w = 2 * (Math.abs(d[0][0]) + Math.abs(d[1][0]) + Math.abs(d[2][0]));
      h = 2 * (Math.abs(d[0][1]) + Math.abs(d[1][1]) + Math.abs(d[2][1]));
    }
    out.push({ part, x: c.x, y: c.y, w, h, depth: c.z, angle });
  }
  return out;
}

const inFrustum = (r: ProjectedPart) => Number.isFinite(r.x) && Number.isFinite(r.y) && r.depth >= -1 && r.depth <= 1;
const inCull = (x: number, y: number) => Math.abs(x) <= CULL.x && Math.abs(y) <= CULL.y;
const visible = (r: ProjectedPart) => inFrustum(r) && Math.abs(r.x) - Math.max(r.w, r.h) / 2 <= CULL.x && Math.abs(r.y) - Math.max(r.w, r.h) / 2 <= CULL.y;
const byAreaDesc = (a: ProjectedPart, b: ProjectedPart) => b.w * b.h - a.w * a.h;

const rect = (r: ProjectedPart, attrs = '') => {
  const rot = r.angle === 0 ? '' : ` transform="rotate(${f(r.angle)} ${f(r.x)} ${f(r.y)})"`;
  return `<rect x="${f(r.x - r.w / 2)}" y="${f(r.y - r.h / 2)}" width="${f(r.w)}" height="${f(r.h)}"${attrs}${rot}/>`;
};

/** The bed of one machine as a polygon through the outer corners of its four corner cells (lattice i, j in param), with the pencil grid's projected pitch. */
function bedPolygon(parts: PartInstance[], cam: PerspectiveCamera): { polygon: string; pitch: [number, number] } | null {
  const cells = parts.filter((p) => p.kind === KIND.cell);
  if (cells.length < 4) return null;
  let cmin = Infinity, cmax = -Infinity, rmin = Infinity, rmax = -Infinity;
  for (const p of cells) { cmin = Math.min(cmin, p.param[0]); cmax = Math.max(cmax, p.param[0]); rmin = Math.min(rmin, p.param[1]); rmax = Math.max(rmax, p.param[1]); }
  if (cmax === cmin || rmax === rmin) return null;
  const at = (c: number, r: number) => cells.find((p) => p.param[0] === c && p.param[1] === r);
  const corners = [at(cmin, rmin), at(cmax, rmin), at(cmax, rmax), at(cmin, rmax)];
  if (corners.some((p) => !p)) return null;
  const cx = corners.reduce((s, p) => s + p!.position[0], 0) / 4, cz = corners.reduce((s, p) => s + p!.position[2], 0) / 4;
  const pts = corners.map((p) => {
    const unit = UNIT_EXTENT[p!.primitive];
    const hx = (p!.scale[0] * unit[0]) / 2, hz = (p!.scale[2] * unit[2]) / 2;
    const outer: Vec3 = [p!.position[0] + Math.sign(p!.position[0] - cx) * hx, p!.position[1], p!.position[2] + Math.sign(p!.position[2] - cz) * hz];
    return ndc(outer, cam);
  });
  const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const pitch: [number, number] = [Math.max(1e-3, dist(pts[0], pts[1]) / (cmax - cmin)), Math.max(1e-3, dist(pts[1], pts[2]) / (rmax - rmin))];
  const polygon = `<polygon points="${pts.map((p) => `${f(p[0])},${f(p[1])}`).join(' ')}" fill="url(#bedgrid)"/>`;
  return { polygon, pitch };
}

function leaderLine(l: LeaderLine, cam: PerspectiveCamera): string {
  const a = ndc(l.from, cam), b = ndc(l.to, cam);
  if (!(inCull(a[0], a[1]) || inCull(b[0], b[1]))) return '';
  return `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}"/>`;
}

/**
 * The hero SVG: pencil machines as hairline rects for their module parts with leader lines from explode to slot and
 * their bed as one pattern-filled polygon; crop machines as hairline module rects only, cropped by the frame edge;
 * ink machines as filled rects. Colours are CSS variables so the plate follows the theme.
 */
export function heroPlateSvg(result: LayoutResult, pose: Pose, aspect: number, opts: HeroPlateOptions): string {
  const cam = makeCamera(pose, aspect);
  const projected = projectAll(result.parts, cam);
  const partsOf = (m: MachineId) => result.parts.filter((p) => p.machine === m);
  const modules = (ms: MachineId[]) => projected.filter((r) => ms.includes(r.part.machine) && r.part.explodeMode === 'module' && visible(r));

  const beds = opts.pencilMachines.map((m) => bedPolygon(partsOf(m), cam)).filter((b): b is NonNullable<typeof b> => b !== null);
  const pitch = beds[0]?.pitch ?? [0.01, 0.01];

  const s: string[] = [SVG_OPEN];
  s.push('<defs>');
  s.push(`<pattern id="bedgrid" patternUnits="userSpaceOnUse" width="${f(pitch[0])}" height="${f(pitch[1])}">`);
  s.push(`<path d="M0 0H${f(pitch[0])}M0 0V${f(pitch[1])}" fill="none" stroke="var(--pencil)" stroke-width="${f(HAIRLINE)}"/>`);
  s.push('</pattern></defs>');

  s.push(`<g ${FLIP} fill="none" stroke="var(--pencil)" stroke-width="${f(HAIRLINE)}">`);
  for (const b of beds) s.push(b.polygon);
  for (const l of result.leaderLines) if (opts.pencilMachines.includes(l.machine)) s.push(leaderLine(l, cam));
  for (const r of modules(opts.pencilMachines)) s.push(rect(r));
  for (const r of modules(opts.cropMachines)) s.push(rect(r));
  s.push('</g>');

  s.push(`<g ${FLIP}>`);
  for (const r of projected.filter((r) => opts.inkMachines.includes(r.part.machine) && visible(r)).sort(byAreaDesc)) s.push(rect(r, ' fill="var(--ink)"'));
  s.push('</g></svg>');
  return s.join('');
}

/** One machine assembled in ink: its largest projected rects first, capped, over a flat ellipse shadow on the bench. */
export function inkPlateSvg(result: LayoutResult, machine: MachineId, pose: Pose, aspect: number, cap = 2500): string {
  const cam = makeCamera(pose, aspect);
  const rects = projectAll(result.parts.filter((p) => p.machine === machine), cam).filter(visible).sort(byAreaDesc).slice(0, cap);
  const { min, max } = result.machines[machine];
  const corners: Vec3[] = [[min[0], 0, min[2]], [max[0], 0, min[2]], [max[0], 0, max[2]], [min[0], 0, max[2]]];
  const ground = corners.map((p) => ndc(p, cam));
  const xs = ground.map((p) => p[0]), ys = ground.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s: string[] = [SVG_OPEN, `<g ${FLIP} fill="var(--ink)">`];
  s.push(`<ellipse cx="${f((x0 + x1) / 2)}" cy="${f((y0 + y1) / 2)}" rx="${f((x1 - x0) / 2)}" ry="${f((y1 - y0) / 2)}" fill="var(--shadow)"/>`);
  for (const r of rects) s.push(rect(r));
  s.push('</g></svg>');
  return s.join('');
}
