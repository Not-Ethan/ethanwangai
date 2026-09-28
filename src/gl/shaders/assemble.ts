// Concatenates the shader pieces into the strings the material patch splices into three's MeshStandardMaterial.
// Vertex: `declarations` at `#include <common>`, `localTransform` after `#include <begin_vertex>`, `project` in place of
// `#include <project_vertex>`. Fragment: see fragment.glsl.ts for each piece's chunk. The kind files are the only
// place a kind's motion lives; this file only dispatches on aMeta.z.
import { COMMON_DECL } from './common.glsl';
import { KIND_STATIC } from './kinds/static.glsl';
import { KIND_SWEEP } from './kinds/sweep.glsl';
import { KIND_SPIN } from './kinds/spin.glsl';
import { KIND_CELL } from './kinds/cell.glsl';
import { KIND_CAP } from './kinds/cap.glsl';
import { KIND_LEVER } from './kinds/lever.glsl';
import { KIND_LANE } from './kinds/lane.glsl';
import { KIND_SCAN } from './kinds/scan.glsl';
import { KIND_PING } from './kinds/ping.glsl';
import { KIND_STACK } from './kinds/stack.glsl';
import { KIND_TILT } from './kinds/tilt.glsl';
import { FRAG_DECL, FRAG_COLOR, FRAG_ROUGHNESS, FRAG_EMISSIVE, FRAG_OUTPUT } from './fragment.glsl';

export interface VertexPieces { declarations: string; localTransform: string; project: string }
export interface FragmentPieces { declarations: string; colorFragment: string; roughness: string; emissive: string; output: string }

/** Kind sources in dependency order: cell defines quoterHeight, which cap calls. */
const KIND_SOURCES = [KIND_STATIC, KIND_SWEEP, KIND_SPIN, KIND_CELL, KIND_CAP, KIND_LEVER, KIND_LANE, KIND_SCAN, KIND_PING, KIND_STACK, KIND_TILT];

// Kind ids are src/bench/types.ts KIND: static 0, sweep 1, spin 2, cell 3, cap 4, lever 5, lane 6, scan 7, ping 8, stack 9, tilt 10.
// The kinds rotate a copy of the normal attribute rather than objectNormal: three derives vNormal from objectNormal
// before begin_vertex, so the rotated normal is written back to vNormal at the end, under the guard that identifies the
// lit MeshStandardMaterial program (the depth material has no vNormal and skips it).
const LOCAL_TRANSFORM = /* glsl */`
int m = int(aMeta.y + 0.5);
int kind = int(aMeta.z + 0.5);
float a = assembleFactor(aMeta.x, m);
float mt = uMachineTime[m];
vec3 worldOffset = vec3(0.0);
vec3 kindNormal = vec3(normal);
vHot = 0.0; vFlip = 0.0; vIsCap = 0.0;
vJitter = hash21(vec2(aMeta.x * 977.0, aMeta.w + float(m)));
vA = a;
if (kind == 1) kind_sweep(transformed, kindNormal, worldOffset, a, mt, m);
else if (kind == 2) kind_spin(transformed, kindNormal, worldOffset, a, mt, m);
else if (kind == 3) kind_cell(transformed, kindNormal, worldOffset, a, mt, m);
else if (kind == 4) kind_cap(transformed, kindNormal, worldOffset, a, mt, m);
else if (kind == 5) kind_lever(transformed, kindNormal, worldOffset, a, mt, m);
else if (kind == 6) kind_lane(transformed, kindNormal, worldOffset, a, mt, m);
else if (kind == 7) kind_scan(transformed, kindNormal, worldOffset, a, mt, m);
else if (kind == 8) kind_ping(transformed, kindNormal, worldOffset, a, mt, m);
else if (kind == 9) kind_stack(transformed, kindNormal, worldOffset, a, mt, m);
else if (kind == 10) kind_tilt(transformed, kindNormal, worldOffset, a, mt, m);
else kind_static(transformed, kindNormal, worldOffset, a, mt, m);
// explode: slide from the offset to the slot with expo-out and a 6% settle
float e = expoOut(a);
float settle = 0.06 * sin(clamp((a - 0.85) / 0.15, 0.0, 1.0) * 3.14159265);
worldOffset += aExplode * (1.0 - e - settle);
#if defined(STANDARD) && !defined(FLAT_SHADED)
// three fixed vNormal before begin_vertex; re-derive it from the kind-rotated normal (same steps as defaultnormal_vertex)
objectNormal = kindNormal;
vec3 kindN = kindNormal;
#ifdef USE_INSTANCING
mat3 kindIM = mat3(instanceMatrix);
kindN = kindIM * (kindN / vec3(dot(kindIM[0], kindIM[0]), dot(kindIM[1], kindIM[1]), dot(kindIM[2], kindIM[2])));
#endif
kindN = normalMatrix * kindN;
#ifdef FLIP_SIDED
kindN = -kindN;
#endif
vNormal = normalize(kindN);
#endif
`;

const PROJECT = /* glsl */`
vec4 wp = instanceMatrix * vec4(transformed, 1.0);
wp.xyz += worldOffset;
// velocity stretch along the travel axis, up to 1.3× at |uVel| = 1
float stretch = 0.3 * abs(uVel);
wp.xyz += uTravelAxis * dot(wp.xyz - uBenchCenter, uTravelAxis) * stretch;
vWorldY = wp.y;
vec4 mvPosition = modelViewMatrix * wp;
gl_Position = projectionMatrix * mvPosition;
`;

export function assembleVertex(): VertexPieces {
  return { declarations: COMMON_DECL + KIND_SOURCES.join(''), localTransform: LOCAL_TRANSFORM, project: PROJECT };
}

export function assembleFragment(): FragmentPieces {
  return { declarations: FRAG_DECL, colorFragment: FRAG_COLOR, roughness: FRAG_ROUGHNESS, emissive: FRAG_EMISSIVE, output: FRAG_OUTPUT };
}
