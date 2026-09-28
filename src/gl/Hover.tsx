'use client';
// The bed hover (design §3.1/04, §8 Pointer, task 4.3): one invisible 12 × 8 plane at the quoter bed's height, which a
// pointer is raycast against by hand. The canvas wrapper has pointer-events: none, so R3F's own pointer events never
// fire: a window pointermove (desktop) or a tap (phone, held 2 s) records the pointer in CSS px, and useFrame raycasts
// it while the bed is the subject (02, 04, 08). A hit lifts that column (uHover = (quoter, col)) and writes hud.hover
// with the market's quote from the CPU copy of the OU tape at the quoter's own clock, the texel the shader reads, so
// the readout prints the machine's own numbers. No React state: the listeners write a plain object, the frame the rest.
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PLACEMENT } from '@/bench/bench';
import { OU } from '@/bench/ou';
import { SECTION_INDEX } from '@/bench/sections';
import { KIND, MACHINE, PRIMITIVE, type LayoutResult, type Tier } from '@/bench/types';
import type { BenchUniforms } from './material/uniforms';
import { normalizePointer } from './CameraRig';
import { hud, type HudHover } from './hud';

/** The raycast plane: the quoter's 12 × 8 footprint, at the bed's mid height. */
export const HOVER_PLANE = { w: 12, d: 8, y: 0.2 } as const;
/** Sections whose subject is the quoter bed: 02 more, 04 kalshi, 08 alive. */
export const HOVER_SECTIONS: readonly number[] = [SECTION_INDEX.more, SECTION_INDEX.kalshi, SECTION_INDEX.alive];
/** Steps of tape the readout's fill count looks back over. */
export const FILL_WINDOW = 64;
/** How long a phone tap holds the readout. */
export const TAP_HOLD_MS = 2000;

/** The quoter bed's lattice in bench space: `minX`/`minZ` are the near edges of column 0 and row 0. */
export interface BedGrid { cols: number; rows: number; pitch: number; minX: number; minZ: number }

/** Reads the bed off the layout's quoter cells (param = [col, row, size, 0]), so a tier's lattice is the one it draws. */
export function quoterBedGrid(result: LayoutResult): BedGrid {
  let cols = 0, rows = 0, x0 = Infinity, x1 = -Infinity, z0 = Infinity;
  for (const p of result.byPrimitive[PRIMITIVE.cell]) {
    if (p.machine !== MACHINE.quoter || p.kind !== KIND.cell) continue;
    cols = Math.max(cols, p.param[0] + 1);
    rows = Math.max(rows, p.param[1] + 1);
    x0 = Math.min(x0, p.position[0]);
    x1 = Math.max(x1, p.position[0]);
    z0 = Math.min(z0, p.position[2]);
  }
  const pitch = (x1 - x0) / (cols - 1);
  return { cols, rows, pitch, minX: x0 - pitch / 2, minZ: z0 - pitch / 2 };
}

export interface BedCell { col: number; row: number }

/** The cell under bench point (x, z): the column clamped to the bed, the row as it falls. */
export function bedCell(g: BedGrid, x: number, z: number, out: BedCell = { col: 0, row: 0 }): BedCell {
  out.col = Math.min(g.cols - 1, Math.max(0, Math.floor((x - g.minX) / g.pitch)));
  out.row = Math.floor((z - g.minZ) / g.pitch);
  return out;
}

/** The tape row at machine time `mt`: floor(mt · stepsPerSecond) mod steps, ouFetch's sIdx. */
export function ouStep(mt: number, stepsPerSecond: number, steps: number): number {
  const s = Math.floor(mt * stepsPerSecond);
  return ((s % steps) + steps) % steps;
}

export interface Quote { mid: number; bid: number; ask: number; fills: number }

/**
 * Market `market` at tape row `step`, into `out`: the mid level, his bid and ask as levels (the two hot cells' rows),
 * and the fill flags (steps since fill = 0) over the FILL_WINDOW steps up to and including this one, wrapping the tape.
 */
export function readQuote<T extends Quote>(ou: Uint8Array, market: number, step: number, out: T): T {
  const i = (step * OU.markets + market) * 4;
  out.mid = ou[i];
  out.bid = ou[i] - ou[i + 1];
  out.ask = ou[i] + ou[i + 2];
  let fills = 0;
  for (let k = 0; k < FILL_WINDOW; k++) {
    const s = (step - k + OU.steps) % OU.steps;
    if (ou[(s * OU.markets + market) * 4 + 3] === 0) fills++;
  }
  out.fills = fills;
  return out;
}

/** The pointer in CSS px, live while `until` (performance.now ms) is ahead: Infinity for a hover, a tap's + 2 s. */
export interface HoverPointer { x: number; y: number; until: number }

export interface HoverDriver {
  grid: BedGrid; uniforms: BenchUniforms; ou: Uint8Array; mesh: THREE.Mesh;
  pointer: HoverPointer; raycaster: THREE.Raycaster; ndc: THREE.Vector2; hits: THREE.Intersection[]; cell: BedCell;
}

export function createHover(result: LayoutResult, uniforms: BenchUniforms, ou: Uint8Array): HoverDriver {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(HOVER_PLANE.w, HOVER_PLANE.d));
  const [x, , z] = PLACEMENT[MACHINE.quoter].origin;   // the quoter's yaw is 0: the plane's axes are the bed's
  mesh.position.set(x, HOVER_PLANE.y, z);
  mesh.rotation.x = -Math.PI / 2;   // face up, so the camera above the bench sees its front
  mesh.visible = false;             // never drawn, never compiled; the raycaster ignores visibility
  mesh.updateMatrixWorld();
  return {
    grid: quoterBedGrid(result), uniforms, ou, mesh,
    pointer: { x: 0, y: 0, until: -Infinity },
    raycaster: new THREE.Raycaster(), ndc: new THREE.Vector2(), hits: [], cell: { col: 0, row: 0 },
  };
}

/** No column lifted, the readout hidden. */
export function clearHover(h: HoverDriver, out: HudHover = hud.hover): void {
  h.uniforms.uHover.value.set(-1, -1);
  out.machine = -1;
  out.col = -1;
}

/**
 * One frame, after CameraRig has placed the camera: if the pointer is live and the bed is the subject, raycast it
 * against the plane; a hit sets uHover and hud.hover, anything else clears them. `width`/`height` are the canvas's
 * CSS size (the canvas fills the viewport), `now` performance.now().
 */
export function stepHover(h: HoverDriver, camera: THREE.Camera, width: number, height: number, now: number): void {
  const p = h.pointer;
  if (p.until > now && HOVER_SECTIONS.includes(hud.section)) {
    normalizePointer(p.x, p.y, width, height, h.ndc);
    camera.updateMatrixWorld();
    h.raycaster.setFromCamera(h.ndc, camera);
    h.hits.length = 0;
    const hit = h.raycaster.intersectObject(h.mesh, false, h.hits)[0];
    if (hit) {
      const { col } = bedCell(h.grid, hit.point.x, hit.point.z, h.cell);
      const u = h.uniforms, info = u.uOUInfo.value, out = hud.hover;
      readQuote(h.ou, col, ouStep(u.uMachineTime.value[MACHINE.quoter], info.w, info.y), out);
      u.uHover.value.set(MACHINE.quoter, col);
      out.machine = MACHINE.quoter;
      out.col = col;
      out.x = p.x;
      out.y = p.y;
      return;
    }
  }
  clearHover(h);
}

/**
 * The hover plane and its listeners. Desktop hovers: pointermove, and leaving the window clears. Phone taps: a click
 * (which a scroll gesture never fires) holds the readout for TAP_HOLD_MS. Mounted after CameraRig, so both run at
 * priority 0 and this frame's camera is the one raycast.
 */
export function Hover({ result, uniforms, ouData, tier }: { result: LayoutResult; uniforms: BenchUniforms; ouData: Uint8Array; tier: Tier }) {
  const h = useMemo(() => createHover(result, uniforms, ouData), [result, uniforms, ouData]);

  useEffect(() => () => {
    clearHover(h);
    h.mesh.geometry.dispose();
    (h.mesh.material as THREE.Material).dispose();
  }, [h]);

  useEffect(() => {
    const p = h.pointer;
    const at = (e: MouseEvent, until: number) => { p.x = e.clientX; p.y = e.clientY; p.until = until; };
    if (tier === 'desktop') {
      const onMove = (e: PointerEvent) => at(e, Infinity);
      const onLeave = () => { p.until = -Infinity; };
      window.addEventListener('pointermove', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
      return () => {
        window.removeEventListener('pointermove', onMove);
        document.documentElement.removeEventListener('pointerleave', onLeave);
      };
    }
    const onTap = (e: MouseEvent) => at(e, performance.now() + TAP_HOLD_MS);
    window.addEventListener('click', onTap);
    return () => window.removeEventListener('click', onTap);
  }, [h, tier]);

  useFrame((state) => stepHover(h, state.camera, state.size.width, state.size.height, performance.now()));
  return <primitive object={h.mesh} />;
}
