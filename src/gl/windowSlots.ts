// Dynamic window instances (spec §4.7, §6): the hillside's and the visitor's windows live in Windows.tsx's one
// InstancedMesh after its static windows. Houses register quads per emitter; this module owns the layout of the
// dynamic region and rewrites it on every change. Windows.tsx binds its mesh and WindowSet once with windowBuffersFor().
import { Color, Matrix4, Quaternion, Vector3, type InstancedMesh } from 'three';
import { EMITTERS } from '@/valley/lights';
import type { EmitterId } from '@/valley/types';
import type { WindowQuad } from './houseGeometry';
import { EMITTER_INDEX } from './projection';
import { STATIC_WINDOW_COUNT, type WindowSet } from './structures';

export type DynamicWindowEmitter = 'hill1' | 'hill2' | 'hill3' | 'hill4' | 'hill5' | 'visitor';
export const DYNAMIC_ORDER: readonly DynamicWindowEmitter[] = ['hill1', 'hill2', 'hill3', 'hill4', 'hill5', 'visitor'];

export interface WindowBuffers {
  capacity: number;
  staticCount: number;
  write(index: number, quad: WindowQuad, emitter: EmitterId): void;
  setCount(count: number): void;
}

const lists = new Map<DynamicWindowEmitter, readonly WindowQuad[]>();
let buffers: WindowBuffers | null = null;

function flush(): void {
  const b = buffers;
  if (!b) return;
  let i = b.staticCount;
  for (const id of DYNAMIC_ORDER) {
    for (const quad of lists.get(id) ?? []) {
      if (i >= b.capacity) break;
      b.write(i, quad, id);
      i++;
    }
  }
  b.setCount(i);
}

export function bindWindowBuffers(b: WindowBuffers | null): void {
  buffers = b;
  flush();
}

export function setDynamicWindows(emitter: DynamicWindowEmitter, quads: readonly WindowQuad[]): void {
  lists.set(emitter, quads);
  flush();
}

export function dynamicWindowCount(emitter: DynamicWindowEmitter): number {
  return lists.get(emitter)?.length ?? 0;
}

/** Tests only. */
export function resetWindowSlots(): void {
  lists.clear();
  buffers = null;
}

const FORWARD = new Vector3(0, 0, 1);   // Windows.tsx's base quad: PlaneGeometry(1, 1) facing +z

/**
 * WindowBuffers over Windows.tsx's mesh and its WindowSet (Stage 2 Task 2.5). A write fills the set's slot: matrix,
 * the emitter's colour (an unset instance colour is black, so the window would never show), row -1 (aRow only means
 * something for the mill), and emitterOf, which the driver's sink reads on the CPU. setCount moves set.count, which
 * the windows LitSink reads live, and mesh.count, and flags the uploads.
 */
export function windowBuffersFor(mesh: InstancedMesh, set: WindowSet, staticCount = STATIC_WINDOW_COUNT): WindowBuffers {
  const pos = new Vector3();
  const nrm = new Vector3();
  const scl = new Vector3();
  const rot = new Quaternion();
  const mat = new Matrix4();
  const col = new Color();
  const rowAttr = mesh.geometry.getAttribute('aRow');
  const litAttr = mesh.geometry.getAttribute('aLit');
  return {
    capacity: set.matrices.length / 16,
    staticCount,
    write(index, quad, emitter) {
      const e = EMITTER_INDEX[emitter];
      pos.set(quad.center[0], quad.center[1], quad.center[2]);
      rot.setFromUnitVectors(FORWARD, nrm.set(quad.normal[0], quad.normal[1], quad.normal[2]));
      scl.set(quad.width, quad.height, 1);
      mat.compose(pos, rot, scl).toArray(set.matrices, index * 16);
      col.set(EMITTERS[e].color).toArray(set.colors, index * 3);
      set.rows[index] = -1;
      set.lit[index] = 0;
      set.emitterOf[index] = e;
    },
    setCount(count) {
      set.count = count;
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      if (rowAttr) rowAttr.needsUpdate = true;
      if (litAttr) litAttr.needsUpdate = true;
    },
  };
}
