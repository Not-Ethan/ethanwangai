# Stage 2 — GL core: kits, patched material, kinds, lights, ground, camera, clocks

> Part of `2026-09-28-dbso-plan-00-index.md`. Read the index's Global Constraints and spec §6, §8, §9 (palette), §11 (tiers), §12. Consumes Stage 0 (`ScrollProvider`, `PALETTES`, `themechange` event, `Site.tsx`) and Stage 1 (`buildBench`, `LayoutResult`, `sceneState`, `evaluatePose`, `TIMING`, `lockStart/lockEnd`, `generateOU`, `VISITOR_RESERVE`, param conventions). Gate **G1**: the assembled quoter at the hero pose reads as a designed instrument in both themes.

Order: 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 2.7 → 2.8. Tasks 2.5 (lights/ground) and 2.6 (clocks logic) are **[parallel-safe]** with 2.4.

Two corrections to Stage 1 conventions that this stage depends on (apply them in Stage 1 files if they were written the other way):
- `spin` parts always rotate about their **local z** axis; `param = [0, baseRateRadPerS, phase, 0]`.
- Quoter carriages: side 0 rests at `x = −(FX − 0.9)` with `dir = +1`; side 1 rests at `x = +(FX − 0.9)` with `dir = −1`; sweep offset is `dir · railLength · 0.5 · (1 − cos(2π(mt/period + phase)))` with `phase = 0` so both are parked at `mt = 0`.
- Splitter tiles: 48 tiles = 4 jobs × 12 lanes; tile `i` has `j = 1 + (i mod 12)` and `phase = floor(i / 12) / 4`; `param = [rate, phase, segLen, j]`. Intake tiles: `param = [rate, phase, segLen, 0]`.

---

### Task 2.1: Uniform registry and palette lerp

**Files:**
- Create: `src/gl/material/uniforms.ts`, `src/gl/material/uniforms.test.ts`

**Interfaces:**

```ts
import * as THREE from 'three';
export interface BenchUniforms {
  uCompile: { value: Float32Array };        // [8]
  uMachineTime: { value: Float32Array };    // [8]
  uRun: { value: Float32Array };            // [8]
  uFillRate: { value: Float32Array };       // [8], ≥ 1
  uTilt: { value: number };
  uTime: { value: number };
  uVel: { value: number };                  // −1..1 plus impulse
  uMerge: { value: number };                // 0..6
  uLean: { value: number };
  uHover: { value: THREE.Vector2 };         // (machine, col), −1 = none
  uOU: { value: THREE.Texture | null };
  uOUInfo: { value: THREE.Vector4 };        // markets, steps, rows, stepsPerSecond (8)
  uCellH: { value: number };                // quoter hBase (0.4)
  uPitch: { value: number };                // quoter bed pitch (0.15 desktop, 0.30 phone)
  uTravelAxis: { value: THREE.Vector3 };
  uBenchCenter: { value: THREE.Vector3 };
  uBalancePivot: { value: THREE.Vector3 };
  uSlotPeriod: { value: number };
  uLock: { value: THREE.Vector3 };          // lock0, lockSpan, lockW
  uKeyDir: { value: THREE.Vector3 };        // light direction for three-tone key faces
  uPaper: { value: THREE.Color }; uInkTop: { value: THREE.Color }; uInkKey: { value: THREE.Color };
  uInkShade: { value: THREE.Color }; uPencil: { value: THREE.Color }; uHot: { value: THREE.Color }; uShadow: { value: THREE.Color };
  uGlyph: { value: number }; uLines: { value: number };
}
export function createUniforms(): BenchUniforms
export function applyPalette(u: BenchUniforms, from: Palette, to: Palette, t: number): void   // lerps every color
export function hexToColor(hex: string): THREE.Color
```

- [ ] **Step 1: Failing test**: `createUniforms()` returns arrays of length 8 and `uFillRate` all 1; `applyPalette(u, PALETTES.light, PALETTES.dark, 0)` sets `uPaper` to light paper, at `t = 1` to dark paper, at `t = 0.5` to the midpoint (each channel within 1/255).
- [ ] **Step 2: Implement.** Colors are `THREE.Color` in linear space (`new THREE.Color().setStyle(hex)` then `.convertSRGBToLinear()` is not needed with `ColorManagement.enabled`, which is the default in r185: `setStyle` handles sRGB). `applyPalette` uses `color.lerpColors(a, b, t)` on pre-converted `THREE.Color` instances.
- [ ] **Step 3: Commit** — `git add src/gl/material/uniforms* && git commit -m "Add GL uniform registry and palette lerp"`

---

### Task 2.2: Shader chunks and the assembler

**Files:**
- Create: `src/gl/shaders/common.glsl.ts`, `src/gl/shaders/kinds/{static,sweep,spin,cell,cap,lever,lane,scan,ping,stack,tilt}.glsl.ts`, `src/gl/shaders/fragment.glsl.ts`, `src/gl/shaders/assemble.ts`, `src/gl/shaders/assemble.test.ts`

**Interfaces:**
- `assembleVertex(): { declarations: string; localTransform: string; project: string }` — three strings spliced into three's vertex shader at `#include <common>`, after `#include <begin_vertex>`, and in place of `#include <project_vertex>`.
- `assembleFragment(): { declarations: string; colorFragment: string; emissive: string; output: string }`.
- Every kind file exports `const KIND_<NAME>: string` containing one GLSL function `void kind_<name>(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m)` where `p` and `n` are local position/normal, `world` is an accumulated bench-space offset, `a` is the assemble factor, `mt` machine time, `m` machine id.

- [ ] **Step 1: Failing test `assemble.test.ts`**: the vertex declarations declare each uniform name from `BenchUniforms` exactly once (`(source.match(/uniform\s+\w+\s+uCompile\b/g) ?? []).length === 1` for each), declare `attribute vec3 aExplode`, `attribute vec4 aMeta`, `attribute vec4 aParam`; `localTransform` contains a call to every `kind_<name>` function; the shader's splitter constants equal the config's: `SPLIT_D1 1.6`, out-lane end `2.2` and `-1.1 + j*0.2` appear in `lane.glsl.ts` and in `src/bench/configs/splitter.ts` (string match on both files).

- [ ] **Step 2: `common.glsl.ts`**

```ts
export const COMMON_DECL = /* glsl */`
attribute vec3 aExplode;
attribute vec4 aMeta;      // birth, machine, kind, col
attribute vec4 aParam;
uniform float uCompile[8];
uniform float uMachineTime[8];
uniform float uRun[8];
uniform float uFillRate[8];
uniform float uTilt;
uniform float uTime;
uniform float uVel;
uniform float uMerge;
uniform float uLean;
uniform vec2 uHover;
uniform sampler2D uOU;
uniform vec4 uOUInfo;
uniform float uCellH;
uniform float uPitch;
uniform vec3 uTravelAxis;
uniform vec3 uBenchCenter;
uniform vec3 uBalancePivot;
uniform float uSlotPeriod;
uniform vec3 uLock;
varying float vA;
varying float vHot;
varying float vFlip;
varying float vJitter;
varying float vIsCap;
varying float vWorldY;
const float PI2 = 6.28318530718;
float expoOut(float t) { return t >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t); }
float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
/** OU texel for market col at machine time t (seconds). R mid 0..47, G bid off, B ask off, A steps since last fill (0 = fill now). */
vec4 ouFetch(float col, float t) {
  float step = t * uOUInfo.w;
  float sIdx = mod(floor(step), uOUInfo.y);
  vec2 uv = vec2((col + 0.5) / uOUInfo.x, (sIdx + 0.5) / uOUInfo.y);
  return texture2D(uOU, uv);
}
float assembleFactor(float birth, int m) {
  float ls = uLock.x + birth * uLock.y;
  return smoothstep(ls, ls + uLock.z, uCompile[m]);
}
`;
```

- [ ] **Step 3: Kind files.** Each is a `/* glsl */` string with one function. Copy these exactly.

`static.glsl.ts`:
```glsl
void kind_static(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) { }
```

`sweep.glsl.ts` (carriage parts; `aParam = [railLength, period, phase, dir]`):
```glsl
void kind_sweep(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  float s = 0.5 * (1.0 - cos(PI2 * (mt / aParam.y + aParam.z)));
  world.x += aParam.w * aParam.x * s;
}
```

`spin.glsl.ts` (rotors, spokes, motors; about local z; `aParam = [0, baseRate, phase, 0]`):
```glsl
void kind_spin(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  float rate = aParam.y * (0.6 + 0.4 * uFillRate[m]);
  float ang = mt * rate + aParam.z * PI2;
  mat3 R = rotZ(ang);
  p = R * p; n = R * n;
}
```

`cell.glsl.ts` (quoter bed and visitor/bot cells share the primitive but not the kind; this is the quoter bed; `aParam = [col, row, size, 0]`):
```glsl
// Depth-ladder relief: rows are price levels. Height profile around the market's mid.
float quoterHeight(float col, float row, float size, float mt, int m, out float hot, out vec4 tex) {
  tex = ouFetch(col, mt);
  float mid = tex.r * 255.0;
  float bidOff = tex.g * 255.0, askOff = tex.b * 255.0;
  float d = abs(row - mid);
  float h = 0.25 + 0.75 * exp(-d / 4.0) * size;
  hot = (abs(row - (mid - bidOff)) < 0.5 || abs(row - (mid + askOff)) < 0.5) ? 1.0 : 0.0;
  return clamp(h, 0.25, 1.0);
}
void kind_cell(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  float col = aParam.x, row = aParam.y, size = aParam.z;
  // merge: leader/member state at level L and L+1, blended by f
  float L = min(floor(uMerge), 6.0);
  float f = uMerge >= 6.0 ? 0.0 : smoothstep(0.0, 0.3, fract(uMerge));
  float span0 = exp2(L), span1 = exp2(min(L + 1.0, 6.0));
  float r0 = mod(col, span0), r1 = mod(col, span1);
  float lead0 = step(r0, 0.5), lead1 = step(r1, 0.5);
  float dx0 = -r0 * uPitch + lead0 * (span0 - 1.0) * uPitch * 0.5;
  float dx1 = -r1 * uPitch + lead1 * (span1 - 1.0) * uPitch * 0.5;
  float sx0 = mix(0.001, span0, lead0), sx1 = mix(0.001, span1, lead1);
  float dx = mix(dx0, dx1, f), sx = mix(sx0, sx1, f);
  float leaderCol = col - r0;
  float hot; vec4 tex;
  float ph = quoterHeight(leaderCol, row, size, mt / span0, m, hot, tex);
  float hf = mix(0.125, ph, a);
  p.x *= sx; p.y *= hf;
  world.x += dx;
  // hover lift
  if (abs(uHover.x - float(m)) < 0.5 && abs(uHover.y - col) < 0.5) world.y += 0.08;
  // lean kick (burst-back)
  world.x += uLean * 0.35 * p.y;
  vHot = hot * a;
}
```

`cap.glsl.ts` (`aParam` same as its cell; pivot on the −z edge at local z = −0.4):
```glsl
float flipProfile(float t) {                       // t seconds since the fill
  float up = smoothstep(0.0, 0.12, t);
  float down = 1.0 - smoothstep(0.42, 0.62, t);
  return 1.08 * 3.14159265 * min(up, down);
}
void kind_cap(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  float col = aParam.x, row = aParam.y, size = aParam.z;
  float L = min(floor(uMerge), 6.0);
  float f = uMerge >= 6.0 ? 0.0 : smoothstep(0.0, 0.3, fract(uMerge));
  float span0 = exp2(L), span1 = exp2(min(L + 1.0, 6.0));
  float r0 = mod(col, span0), r1 = mod(col, span1);
  float lead0 = step(r0, 0.5), lead1 = step(r1, 0.5);
  float dx = mix(-r0 * uPitch + lead0 * (span0 - 1.0) * uPitch * 0.5, -r1 * uPitch + lead1 * (span1 - 1.0) * uPitch * 0.5, f);
  float sx = mix(mix(0.001, span0, lead0), mix(0.001, span1, lead1), f);
  float leaderCol = col - r0;
  float hot; vec4 tex;
  float ph = quoterHeight(leaderCol, row, size, mt / span0, m, hot, tex);
  float hf = mix(0.125, ph, a);
  // fill at the traded level: fetch the fill channel at rate-scaled time
  vec4 ft = ouFetch(leaderCol, mt * uFillRate[m] / span0);
  float since = ft.a * 255.0;                                   // steps since last fill
  float t = (since + fract(mt * uFillRate[m] / span0 * uOUInfo.w)) / uOUInfo.w;
  float mid = ft.r * 255.0;
  float side = step(0.5, hash21(vec2(leaderCol, floor(mt * uFillRate[m] / span0 * uOUInfo.w) - since)));
  float tradedRow = mix(mid - ft.g * 255.0, mid + ft.b * 255.0, side);
  float isTraded = step(abs(row - tradedRow), 0.5) * step(since, 6.0);
  float ang = flipProfile(t) * isTraded * a;
  mat3 R = rotX(ang);
  vec3 pivot = vec3(0.0, 0.0, -0.4);
  p = R * (p - pivot) + pivot; n = R * n;
  p.x *= sx;
  world.x += dx;
  world.y += uCellH * (hf - 1.0);
  world.x += uLean * 0.35 * uCellH * hf;
  vFlip = ang / 3.14159265;
  vIsCap = 1.0;
}
```

`lever.glsl.ts` (`aParam = [2, −0.5, 0, 0]`; raised 30° until locked; pivot at local x = −0.5):
```glsl
void kind_lever(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  float ang = (1.0 - expoOut(a)) * 0.5235987756;   // 30° → 0
  mat3 R = rotZ(ang);
  vec3 pivot = vec3(-0.5, 0.0, 0.0);
  p = R * (p - pivot) + pivot; n = R * n;
}
```

`lane.glsl.ts` (tiles; `aParam = [rate, phase, segLen, j]`; `j = 0` intake chute, `j ≥ 1` splitter out-lane):
```glsl
#define SPLIT_D1 1.6
void kind_lane(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  float speed = aParam.x * (1.0 + 2.0 * abs(uVel));
  float prog = fract(mt * speed / 4.0 + aParam.y);
  if (aParam.w < 0.5) {
    vec3 dir = normalize(vec3(0.8, -0.65, 0.0));
    world += dir * prog * aParam.z;
  } else {
    float j = aParam.w - 1.0;
    vec3 outDir = vec3(2.2 - 0.3, 0.0, (-1.1 + j * 0.2) - 0.0);
    float outLen = length(outDir); outDir /= outLen;
    if (prog < 0.5) world.x += prog * 2.0 * SPLIT_D1;
    else world += vec3(SPLIT_D1, 0.0, 0.0) + outDir * (prog - 0.5) * 2.0 * outLen;
  }
  world *= vec3(1.0);
  // parked and stacked while still: mt = 0 → prog = phase; hide the stack by scaling to a thin tile until run
  p *= mix(0.4, 1.0, clamp(uRun[m], 0.0, 1.0));
}
```

`scan.glsl.ts` (watch field cells `aParam = [col, row, hashBase, 0]`; rails `aParam = [fieldWidth, period, 0, 0]`; the slot bar uses the rail form with `uSlotPeriod`):
```glsl
void kind_scan(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  bool isRail = aParam.x > 8.0 || (m == 6);
  if (isRail) {
    float period = (m == 6) ? uSlotPeriod : aParam.y;
    float tri = abs(fract(mt / period) * 2.0 - 1.0);
    world.x += tri * (m == 6 ? 1.6 : aParam.x);
    return;
  }
  float col = aParam.x, row = aParam.y, base = aParam.z;
  float baseline = 0.35 + 0.25 * sin(col * 0.37 + row * 0.61 + mt * 0.4) * base;
  float spike = step(0.995, base) * 3.0;
  float h = mix(0.125, baseline + spike, a);
  p.y *= h;
  // hot ring when the scan passes a spike: rail x = tri * fieldWidth from the field's −x edge; cells pass their col pitch in aParam.w? use col fraction
  float period = 4.0;
  float tri = abs(fract(mt / period) * 2.0 - 1.0);
  float railCol = tri * 48.0;
  vHot = spike > 0.0 && abs(railCol - col) < 1.0 ? a : 0.0;
}
```

`ping.glsl.ts` (`aParam = [period, phase, pulseScale, 0]`):
```glsl
void kind_ping(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  float ph = fract(mt / aParam.x + aParam.y);
  float bump = smoothstep(0.0, 0.05, ph) * (1.0 - smoothstep(0.05, 0.12, ph));
  p *= 1.0 + (aParam.z - 1.0) * bump * a;
  vHot = bump * a;
}
```

`stack.glsl.ts` (balance tiles `aParam = [side, index, offset, 0]`; 8 s game clock: liability stacks left over 0–4 s, hedge right over 4–7 s, clear at 7.5–8):
```glsl
void kind_stack(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  float g = mod(mt, 8.0);
  float side = aParam.x, idx = aParam.y;
  float appear = side < 0.0 ? smoothstep(idx / 48.0 * 4.0, idx / 48.0 * 4.0 + 0.05, g)
                            : smoothstep(4.0 + idx / 48.0 * 3.0, 4.0 + idx / 48.0 * 3.0 + 0.05, g);
  float clear = 1.0 - smoothstep(7.5, 7.8, g);
  float vis = appear * clear * a;
  p *= mix(0.001, 1.0, vis);
  // ride the tilted rail: rotate about the balance pivot
  vec3 rel = (world + p) - uBalancePivot;
  mat3 R = rotZ(uTilt);
  world += (R * rel - rel);
  vHot = (g > 7.5 && g < 7.9) ? a : 0.0;
}
```

`tilt.glsl.ts` (balance rail and end trays):
```glsl
void kind_tilt(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  mat3 R = rotZ(uTilt);
  p = R * p; n = R * n;
}
```

Note for the implementer: `world` in `stack` and `tilt` refers to a bench-space offset that the projection step adds after `instanceMatrix`; the rest position comes from `instanceMatrix`. In `kind_stack` the rotation about the pivot needs the rest position, which is `instanceMatrix[3].xyz`; use that instead of `world + p`: `vec3 rest = instanceMatrix[3].xyz; vec3 rel = rest - uBalancePivot; world += (R * rel - rel);`.

- [ ] **Step 4: `assemble.ts`** — builds the three vertex strings:

`localTransform` (spliced after `#include <begin_vertex>`):
```glsl
int m = int(aMeta.y + 0.5);
int kind = int(aMeta.z + 0.5);
float a = assembleFactor(aMeta.x, m);
float mt = uMachineTime[m];
vec3 worldOffset = vec3(0.0);
vHot = 0.0; vFlip = 0.0; vIsCap = 0.0;
vJitter = hash21(vec2(aMeta.x * 977.0, aMeta.w + float(m)));
vA = a;
if (kind == 1) kind_sweep(transformed, objectNormal, worldOffset, a, mt, m);
else if (kind == 2) kind_spin(transformed, objectNormal, worldOffset, a, mt, m);
else if (kind == 3) kind_cell(transformed, objectNormal, worldOffset, a, mt, m);
else if (kind == 4) kind_cap(transformed, objectNormal, worldOffset, a, mt, m);
else if (kind == 5) kind_lever(transformed, objectNormal, worldOffset, a, mt, m);
else if (kind == 6) kind_lane(transformed, objectNormal, worldOffset, a, mt, m);
else if (kind == 7) kind_scan(transformed, objectNormal, worldOffset, a, mt, m);
else if (kind == 8) kind_ping(transformed, objectNormal, worldOffset, a, mt, m);
else if (kind == 9) kind_stack(transformed, objectNormal, worldOffset, a, mt, m);
else if (kind == 10) kind_tilt(transformed, objectNormal, worldOffset, a, mt, m);
else kind_static(transformed, objectNormal, worldOffset, a, mt, m);
// explode: slide from the offset to the slot with expo-out and a 6% settle
float e = expoOut(a);
float settle = 0.06 * sin(clamp((a - 0.85) / 0.15, 0.0, 1.0) * 3.14159265);
worldOffset += aExplode * (1.0 - e - settle);
```

`project` (replaces `#include <project_vertex>`):
```glsl
vec4 wp = instanceMatrix * vec4(transformed, 1.0);
wp.xyz += worldOffset;
// velocity stretch along the travel axis, up to 1.3× at |uVel| = 1
float stretch = 0.3 * abs(uVel);
wp.xyz += uTravelAxis * dot(wp.xyz - uBenchCenter, uTravelAxis) * stretch;
vWorldY = wp.y;
vec4 mvPosition = modelViewMatrix * wp;
gl_Position = projectionMatrix * mvPosition;
```

`assembleFragment()`:
- `declarations`: the palette uniforms (`uPaper uInkTop uInkKey uInkShade uPencil uHot`), `uKeyDir`, the varyings.
- `colorFragment` (after `#include <color_fragment>`):
```glsl
vec3 wN = inverseTransformDirection(normal, viewMatrix);
float up = wN.y;
float key = dot(wN, uKeyDir);
vec3 tone = up > 0.5 ? uInkTop : (key > 0.25 ? uInkKey : uInkShade);
float inkMix = step(0.6, vA);
diffuseColor.rgb = mix(uPencil, tone, inkMix);
float contact = 1.0 - 0.22 * (1.0 - clamp(vWorldY / 0.5, 0.0, 1.0));
diffuseColor.rgb *= contact;
```
- after `#include <roughnessmap_fragment>`: `roughnessFactor = clamp(roughnessFactor + (vJitter - 0.5) * 0.16, 0.05, 1.0);`
- `emissive` (after `#include <emissivemap_fragment>`):
```glsl
float capHot = vIsCap * step(0.5, vFlip) * step(0.3, wN.y);
totalEmissiveRadiance += uHot * 0.6 * max(vHot, capHot) * inkMix;
```
- `output` (after `#include <opaque_fragment>`): `gl_FragColor.rgb = mix(uPencil * contact, gl_FragColor.rgb, inkMix);` so pencil is unlit.

- [ ] **Step 5: Run** the assemble test → PASS. **Commit:** `git add src/gl/shaders && git commit -m "Add vertex kinds, fragment shading and the shader assembler"`

---

### Task 2.3: Patched ink material and depth material

**Files:** `src/gl/material/inkMaterial.ts`, `src/gl/material/depthMaterial.ts`

**Interfaces:** `createInkMaterial(u: BenchUniforms): THREE.MeshStandardMaterial` (roughness 0.55, metalness 0.08, `onBeforeCompile` splices the assembler output and merges `u` into `shader.uniforms`; `customProgramCacheKey = () => 'dbso-ink-v1'`); `createDepthMaterial(u): THREE.MeshDepthMaterial` (`depthPacking: THREE.RGBADepthPacking`, same vertex splice, plus after the projection: `if (vA < 0.6) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);` so pencil casts no shadow; `customProgramCacheKey = () => 'dbso-depth-v1'`).

- [ ] **Step 1: Implement both.** For the depth material the fragment is untouched. Attach `u` values by reference (`shader.uniforms.uCompile = u.uCompile`) so Clocks writes once for both materials.
- [ ] **Step 2: Commit** — `git add src/gl/material && git commit -m "Add patched ink and depth materials"`

---

### Task 2.4: Kits — six instanced meshes from the layout

**Files:** `src/gl/Kits.tsx`, `src/gl/kitGeometry.ts`, `src/gl/kitAttributes.ts`, `src/gl/kitAttributes.test.ts`

**Interfaces:**
- `createKitGeometries(): Record<PrimitiveId, THREE.BufferGeometry>` — cell `Box(0.8,1,0.8).translate(0,0.5,0)`; cap `Box(0.8,0.03,0.8)`; bar `Box(1,0.12,0.12)`; rod `Cylinder(0.05,0.05,1,8)`; ring `Torus(0.5,0.06,8,24)`; tile `Box(0.2,0.02,0.2).translate(0,0.01,0)`.
- `buildKitAttributes(parts: PartInstance[], reserve: number): { matrices: Float32Array; explode: Float32Array; meta: Float32Array; param: Float32Array; count: number }` — matrices from position/quaternion/scale via `THREE.Matrix4.compose`; reserve instances get scale 0 and `meta = [0, 7, 8, −1]`.
- `VISITOR_RESERVE_BY_PRIMITIVE = { cell: 24, bar: 6, ring: 1, cap: 0, rod: 0, tile: 0 }`.
- `<Kits result={LayoutResult} uniforms={BenchUniforms} />` renders six `<instancedMesh>` with `frustumCulled={false}`, `castShadow`, `receiveShadow`, `customDepthMaterial`, and exposes the meshes on a ref registry `kitRefs: Record<PrimitiveId, THREE.InstancedMesh | null>` (module-level, for the visitor upload in Stage 4).

- [ ] **Step 1: Failing test** for `buildKitAttributes`: 3 parts + reserve 2 → `count 5`, `matrices.length 80`, the third matrix's translation equals the part's position, reserve matrices have zero scale, `meta[4*3+1] === 7`.
- [ ] **Step 2: Implement.** Set `mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)`; attributes as `THREE.InstancedBufferAttribute` on a per-kit cloned geometry (`geometry.clone()` then `setAttribute`); bounding sphere: `geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 20)`. Never touch `instanceMatrix.needsUpdate` after mount except the visitor upload path.
- [ ] **Step 3: Commit** — `git add src/gl/Kits.tsx src/gl/kit* && git commit -m "Add instanced kits with per-instance attributes"`

---

### Task 2.5: Lights and ground **[parallel-safe]**

**Files:** `src/gl/Lights.tsx`, `src/gl/Ground.tsx`

**Interfaces:** `<Lights uniforms tier />` — `directionalLight` at `[-8, 14, 10]`, intensity 2.4, `castShadow` (desktop only), `shadow-mapSize 2048`, `shadow-normalBias 0.02`, `shadow-bias -0.0002`, an orthographic shadow camera whose bounds Clocks fits per frame through `lightRef` (export `setLightRef(l: THREE.DirectionalLight)` on a module registry `src/gl/registry.ts` with `lightRef`, `cameraRef`, `kitRefs`); `hemisphereLight` with `color = uPaper`, `groundColor = uShadow`, intensity 0.6 (Clocks copies the palette into it each frame). `<Ground uniforms tier />` — `planeGeometry 200×200` rotated `-π/2`, `ShadowMaterial` (`opacity` 0.22 light / 0.5 dark, set from a `themechange` listener), patched via `onBeforeCompile` to add contact darkening from `uContact[8]` (vec4: x, z, radius, strength) and a 1-bit dither:

```glsl
// fragment, replacing the ShadowMaterial output line
float contact = 0.0;
for (int i = 0; i < 8; i++) { vec2 d = vWorldXZ - uContact[i].xy; contact += uContact[i].w * exp(-dot(d, d) / (uContact[i].z * uContact[i].z)); }
float dither = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
gl_FragColor = vec4(color, min(1.0, opacity * (1.0 - getShadowMask()) + contact) + dither);
```
(`vWorldXZ` is a varying written in the vertex shader from `worldPosition.xz`.) `uContact` values come from `result.machines[i]` (foot x/z, radius = half the footprint diagonal, strength 0.12) and are constant after mount. Phone: no shadow map; contact only.

- [ ] **Step 1: Implement.** **Commit:** `git add src/gl/Lights.tsx src/gl/Ground.tsx src/gl/registry.ts && git commit -m "Add light rig and paper ground with contact darkening"`

---

### Task 2.6: Clocks logic (pure) **[parallel-safe]**

**Files:** `src/gl/clocksLogic.ts`, `src/gl/clocksLogic.test.ts`

**Interfaces:**

```ts
export interface ClockState {
  mt: Float32Array; run: Float32Array; compile: Float32Array; fillRate: Float32Array;   // [8]
  locked: Uint8Array;                 // lever locked (compile ≥ lockEnd(1) − 1e-3)
  impulse: number; rateSpike: number; vel: number; tilt: number; tiltV: number; uptime: number;
}
export interface ClockInputs {
  dt: number;                          // seconds, clamped to [0, 0.05]
  compileTarget: (number | null)[];    // from sceneState
  heroCompile: number;                 // triggered tween value 0..1 (Stage 3); Stage 2 passes 1 when ?built=1
  visitorCompile: number;              // 0..1
  velocity: number;                    // −1..1 from scroll
  reducedMotion: boolean;
}
export function createClockState(): ClockState          // bot and slot run from load: run = 1, locked = 1
export function stepClocks(s: ClockState, i: ClockInputs): void
export const RUN_TAU = 0.25, VEL_TAU = 0.18, IMPULSE_TAU = 0.13, SPIKE_TAU = 0.35
```

Rules: `compile[m] = target ?? (m === quoter ? heroCompile : m === visitor ? visitorCompile : compile[m])`; `locked[m] = compile[m] ≥ lockEnd(1) − 1e-3` for machines with a lever (all but bot and slot, which stay 1); on `locked` going 0 → 1: `impulse = TIMING.impulse`, `rateSpike = 1`; `run[m] += (locked − run[m]) · (1 − exp(−dt / RUN_TAU))`; `mt[m] += dt · run[m] · (reducedMotion ? 0.3 : 1)`; `impulse *= exp(−dt / IMPULSE_TAU)`; `rateSpike *= exp(−dt / SPIKE_TAU)`; `vel += (velocity − vel) · (1 − exp(−dt / VEL_TAU))`; `fillRate[m] = 1 + 2 · rateSpike + 2 · |vel|` (clamped to [1, 3]); balance tilt target from `mt[balance] mod 8`: `left = clamp(g / 4, 0, 1) · 48`, `right = clamp((g − 4) / 3, 0, 1) · 48`, `cleared = g > 7.5`, `target = cleared ? 0 : 0.12 · (left − right) / 48`, critically damped spring `ω = 10`: `acc = ω²(target − tilt) − 2ω·tiltV; tiltV += acc·dt; tilt += tiltV·dt`; `uptime += dt` always.

- [ ] **Step 1: Failing test** (Review Focus #3): (a) with `compileTarget[balance] = 1` for 1 s of 60 steps, `run[balance]` > 0.95 and `mt[balance]` ≈ 0.76 ± 0.1 (exact solution of the `RUN_TAU` = 0.25 relaxation from `run(0) = 0`: `mt(1) = 1 − RUN_TAU·(1 − e⁻⁴) ≈ 0.7627`); then `compileTarget[balance] = 0` for 0.5 s → `run` < 0.15, `mt` increases by less than 0.25 over that half second (≈ 0.205 exactly), never decreases, and is finite; (b) the lever crossing sets `impulse = 0.6` exactly once and it decays below 0.05 within 0.5 s; (c) bot `mt` advances from the first step; (d) `heroCompile = 1` locks the quoter; (e) `fillRate` never exceeds 3 or drops below 1; (f) no NaN after 10,000 steps with random inputs.
- [ ] **Step 2: Implement.** **Commit:** `git add src/gl/clocksLogic* && git commit -m "Add pure clocks logic with lever lock, impulses and balance spring"`

---

### Task 2.7: Camera rig, clocks driver, scene, tier, and mount

**Files:** `src/gl/CameraRig.tsx`, `src/gl/Clocks.tsx`, `src/gl/Scene.tsx`, `src/gl/useTier.ts`, `src/gl/hud.ts`, modify `src/site/Site.tsx`

**Interfaces:**
- `hud.ts`: `export const hud = { section: 0, u: 0, compile: 0, lines: 0, parts: 0, uptime: 0, running: false, hover: { machine: -1, col: -1, x: 0, y: 0 } }` — a mutable object Clocks writes and DOM chrome reads in its own rAF (Stage 3).
- `useTier(): { tier: Tier; dpr: number; shadows: boolean; msaa: number }` — from `detectTier()`; desktop `dpr 1.25`, `shadows true`; phone `dpr 1`, `shadows false`. Wrap children in drei `PerformanceMonitor` with `onDecline` lowering `dpr` by 0.25 steps to 1 (the rest of the ladder arrives in Stage 6).
- `<Clocks result uniforms tier />` — `useFrame(priority −1)`: reads `useScroll().state.current`, `locate(g, ranges)`, `sceneState(...)` into a reused object, `stepClocks`, writes every uniform (`uCompile.set(s.compile)` etc.), `uTravelAxis` = normalized camera travel direction from the previous frame's pose (or `(1,0,0)` when still), `uBenchCenter = (0, 0, 1)`, `uBalancePivot = result.machines[balance].centroid` with y from the config (0.9), fits the shadow camera to the active machine's bounds ± 3 units, copies palette colors into the hemisphere light, and writes `hud`. Debug: if `location.search` contains `built=1`, `heroCompile = 1` and every `compileTarget` is 1 (all machines built, all running) so gate stills can be taken at any section.
- `<CameraRig />` — `useFrame(priority 0)`: reads the pose Clocks wrote into `hud.pose` (position, lookAt, fov), applies pointer parallax (±2°, damped τ 0.4 s, skipped on phone and reduced motion), sets `camera.position`, `camera.lookAt`, `camera.fov` + `updateProjectionMatrix` when fov changes.
- `<Scene />` — `useTier`, `buildBench(tier)` memoized, `createUniforms` memoized, OU texture from `generateOU(seed)` as `THREE.DataTexture(data, 256, 2048, RGBAFormat)` with `LinearFilter`, `NearestFilter` on min? Use `LinearFilter` for both (spec), `needsUpdate = true`; `uOUInfo = (256, 2048, 48, 8)`; `uLock = (TIMING.lock0, TIMING.lockSpan, TIMING.lockW)`; `uKeyDir` = normalized light direction; palette from `document.documentElement.dataset.theme`, updated on `themechange` with a 300 ms lerp driven inside Clocks (`paletteT`). Renders:

```tsx
<div className="fixed inset-0 z-0" aria-hidden>
  <GLErrorBoundary fallback={null}>
    <Canvas dpr={dpr} shadows={shadows ? { type: THREE.PCFSoftShadowMap } : false}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      camera={{ fov: 30, near: 0.5, far: 120, position: [6.5, 4.2, 11.5] }}
      onCreated={({ gl, scene }) => { scene.background = paperColor; gl.setClearColor(paperColor, 1); }}
      frameloop="always">
      <Lights uniforms={u} tier={tier} />
      <Ground uniforms={u} tier={tier} result={result} />
      <Kits result={result} uniforms={u} />
      <Clocks result={result} uniforms={u} tier={tier} />
      <CameraRig />
    </Canvas>
  </GLErrorBoundary>
</div>
```

The Canvas must be `position: fixed` with `z-index 0` and `main` at `z-index 10` (already), and `pointer-events: none` on the wrapper except where Hover (Stage 4) needs it.

- [ ] **Step 1: Implement all five files and mount `<Scene />` as the first child inside `ScrollProvider` in `Site.tsx`** (dynamic import with `ssr: false`).
- [ ] **Step 2: Verify:** `npm run lint && npx tsc --noEmit && npx vitest run` clean. Dev server up; open `http://localhost:3111/?built=1`; console has no shader compile errors (search the console for `THREE.WebGLProgram`); the quoter, bot, balance, splitter and watch are visible and running (carriages sweeping, rotors turning) at the hero pose; scrolling moves the camera through the poses.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "Mount the GL scene: clocks driver, camera rig, tier"`

---

### Task 2.8: Gate G1 stills

- [ ] **Step 1:** With Playwright at 1440 × 900 take: `.playwright-mcp/gates/g1-hero-built-light.png` (`/?built=1`, top of page, after 3 s), the same in dark (toggle theme first), `g1-hero-pencil-light.png` (`/?built=0` which pins every compile to 0 so the exploded pencil state is visible), and `g1-kalshi-built-light.png` (scroll to `#kalshi` with `?built=1`).
- [ ] **Step 2:** The orchestrator judges: does the assembled quoter read as a designed instrument (frame, bed as a relief, carriages, spoked rotors, lever) in both themes? Does the pencil state read as an exploded drawing? If not, re-author `quoter.ts` modules once (larger, fewer modules; taller frame; thicker rails via scale y/z 1.6) and retake. On a second failure, switch to the fallback archetype (spec §2) by editing only `quoter.ts`.
- [ ] **Step 3:** Record the verdict and the still paths in the Stage 3 brief.

---

### Task 2.9: Camera clearance and light-theme form (added after gate G1)

Gate G1 verdict: the quoter reads as a designed instrument in both themes and the pencil state reads as an exploded drawing, so the fallback archetype is not needed. What failed is composition: at the hero the machine fills the viewport and its rails cross the headline, the deck and ladder are hidden behind it; at kalshi the frame covers the figures; the light theme reads as a near-black mass. This task fixes the camera key tables with a numeric clearance test, and gives the light theme visible form.

**Files:**
- Create: `src/bench/cameraClearance.ts`, `src/bench/cameraClearance.test.ts`
- Modify: `src/bench/camera.ts` (both key tables), `src/gl/Lights.tsx` (intensities), and only if needed `src/theme/palettes.ts` + `src/app/globals.css` (light `inkTop`/`inkKey` only; `ink` and `inkShade` stay) and `src/bench/bench.ts` (`PLACEMENT` of the small machines, last resort)

**Interfaces:**
- `projectBounds(result: LayoutResult, machines: MachineId[], pose: Pose, aspect: number): { left: number; right: number; top: number; bottom: number } | null` — NDC bounding box (x right, y up) of every rest position of the listed machines' parts projected through a `PerspectiveCamera(fov, aspect, 0.5, 120)` at `pose`; null if no part is in front of the camera. Uses three's math only (allowed in bench).
- `DWELL: Array<{ section: number; u: number }>` — the poses the test checks: `(0,0) (0,1) (1,0.5) (2,0.30) (2,0.85) (3,0.6) (4,0.7) (5,0.7) (6,0.7) (7,0.8) (8,0.6)`.

- [ ] **Step 1: Failing test `cameraClearance.test.ts`** (desktop `buildBench('desktop')`, aspect 1.6, `evaluatePose(section, u, 'desktop', out)` per dwell). The copy column is the left 42% of the viewport (NDC x < −0.16); the hero copy block is the left 58% down to 65% of the height (NDC x < 0.17, y > −0.3). Assert:
  - hero (0, 0): quoter bbox `left ≥ −0.20`, `top ≤ 0.10`, `right ≤ 1.02` (whole machine in frame, tight to the right edge); bot bbox inside the frame; balance, splitter and watch union bbox `top ≤ −0.72` (cropped at the bottom edge) — they may be entirely below the frame.
  - risen (0, 1): quoter bbox within `[−0.7, 1.02] × [−1.02, 0.6]`.
  - more (1, 0.5): quoter bbox `left ≥ −0.12`, `right ≤ 1.02`, `top ≤ 0.9`, `bottom ≥ −1.02`.
  - first (2, 0.30): bot bbox centre x ∈ [0.0, 0.7], bbox height ≥ 0.25; (2, 0.85): union of bot and quoter `left ≥ −0.12`, bot bbox height ≥ 0.05.
  - kalshi (3, 0.6): quoter bbox `left ≥ −0.12`; the quoter's visible width `min(right, 1) − max(left, −1) ≥ 0.9`.
  - heron (4, 0.7): balance bbox `left ≥ −0.12`, height ≥ 0.22; quoter bbox intersects the frame.
  - darch (5, 0.7): splitter bbox `left ≥ −0.12`, width ≥ 0.45.
  - summers (6, 0.7): watch bbox `left ≥ −0.12`, width ≥ 0.45.
  - alive (7, 0.8): union of all machines `left ≥ −0.30`, inside the frame; union of balance, splitter, watch height ≥ 0.35.
  - yours (8, 0.6): slot bbox `left ≥ −0.12`, width ≥ 0.2.
  - Anti-journey: the camera path length over 400 samples of g (desktop ranges from the section vh table) is under 45 units; every key's lookAt is within the bench bounds ± 3.
  - Phone (aspect 390/844, `evaluatePose(..., 'phone')`): at every dwell the active machine's bbox `top ≤ 0.10` (in the lower 55%) and `left ≥ −1.02`, `right ≤ 1.02`; at (0, 0) the bot is in frame and the quoter bbox width ≥ 1.2.
- [ ] **Step 2: Implement `projectBounds`** and re-author the key tables until the test passes. Keep fov 30 (desktop) / 38 (phone). Move the camera back and shift `lookAt` left/up to push the machine lower-right; do not enlarge the bench. Keep hold-then-move keys so no section starts with a cut.
- [ ] **Step 3: Light-theme form.** Start the dev server (port 3111), open `/?built=1` in the light theme and judge the hero still: the frame bars and cells must show three distinguishable tones (top, key side, shade). Tune in this order until they do: `Lights.tsx` hemisphere intensity 0.6 → up to 1.0, directional intensity 2.4 → up to 3.0; then, only if still a silhouette, light `inkTop` → `#44444C` and `inkKey` → `#2C2C32` in `palettes.ts` and the same hexes in `globals.css` (the palettes test enforces the match). The dark theme must keep reading well; check it after every change.
- [ ] **Step 4: Stills** with Playwright at 1440 × 900 and `?built=1`, saved to `.playwright-mcp/gates/`: `g1b-hero-light.png`, `g1b-hero-dark.png`, `g1b-more.png` (u 0.5), `g1b-kalshi.png` (u 0.6), `g1b-heron.png` (u 0.7), `g1b-alive.png` (u 0.8), `g1b-phone-hero.png` (390 × 844 with `?built=1&tier=phone`; if `tier=phone` is not yet honoured by `useTier`, add that query override now, it is needed by Stage 5 anyway). Scroll with `window.scrollTo(0, top + u·height)` and wait 3 s. Stop the server after.
- [ ] **Step 5: Verify** `npx vitest run src/bench` green, `npx tsc --noEmit` clean, lint clean. **Commit:** `git add -A && git commit -m "Tune camera keys for copy-column clearance; give the light theme form"`

---

### Task 2.10: Camera round two — larger hero, expressive poses under a 60-unit budget (added after judging the 2.9 stills)

The 2.9 tables clear the copy column everywhere; keep that. Two things are still wrong: the hero quoter is small (bbox top at NDC −0.26 when the copy allows 0.05), and the 45-unit path budget flattened heron (should be side-on), darch (long and low), `more` (~45–55° high 3/4) and the poster (small machines large in the foreground). Relax the budget to 60 units and add numeric pose constraints.

**Files:**
- Modify: `src/bench/camera.ts` (desktop table; phone only if a desktop change forces it), `src/bench/cameraClearance.test.ts` (extend), `src/bench/cameraClearance.ts` (add `elevationDeg(pose)` and `azimuthDeg(pose)` helpers)

**Interfaces:** `elevationDeg(pose): number` = `asin((position.y − lookAt.y) / |position − lookAt|)` in degrees; `azimuthDeg(pose)` = angle of the horizontal view direction from the bench +z axis (0 = looking straight along −z toward the back of the bench, ±90 = looking along the bench's x axis).

- [ ] **Step 1: Extend the test.** Keep every existing assertion, change the path budget to 60, and add: hero (0,0): quoter bbox `top ≥ −0.12` and `≤ 0.05`, `left ≥ −0.20`, `right ≤ 1.02`; `more` (1, 0.5): elevation between 40° and 58°; heron (4, 0.7): elevation ≤ 22° and `|azimuth| ≤ 25°` (side-on to the balance's long axis, which runs along bench x, viewed from +z), balance bbox height ≥ 0.28; darch (5, 0.7): elevation ≤ 16°, `position.y ≤ 2.2`, splitter bbox width ≥ 0.5; summers (6, 0.7): elevation ≥ 45°; alive (7, 0.8): union of balance, splitter, watch height ≥ 0.45 and the quoter bbox intersects the frame; yours (8, 0.6): elevation ≤ 20°. Run it: it must fail on the current table.
- [ ] **Step 2: Re-author the desktop table** until it passes. Holds and moves as before (no section starts with a cut; kalshi's dolly is still the only lateral dolly). Phone table: leave the far-shot hero as is; adjust only if a shared helper changes.
- [ ] **Step 3: Stills** at 1440 × 900 with `?built=1`, light theme: `g1c-hero.png`, `g1c-more.png` (u 0.5), `g1c-kalshi.png` (u 0.6), `g1c-heron.png` (u 0.7), `g1c-darch.png` (u 0.7), `g1c-summers.png` (u 0.7), `g1c-alive.png` (u 0.8), `g1c-yours.png` (u 0.6). Stop the server after.
- [ ] **Step 4: Verify** `npx vitest run src/bench src/gl` green, tsc clean, lint clean. **Commit:** `git add -A && git commit -m "Camera round two: larger hero, side-on heron, low darch, poster foreground"`
