# Stage 3 — Ink, warm-up, the hero compile and the ladder

> Part of `2026-09-28-dbso-plan-00-index.md`. Read the index's Global Constraints and spec §3.1 (01 · sentence), §7 (ink), §8 (clocks 2 and 4), §11 (warm-up). Consumes Stage 1 (`TIMING`, `lockStart/lockEnd/inkDepart/inkLand`, `LayoutResult`, `PartInstance.birth`) and Stage 2 (`BenchUniforms`, `hud`, `Clocks`, `Scene`, `registry`). Gate **G2**: stills at T0 + 0.3, 0.6, 1.2, 2.2, 3.0 s show ink lifting off the real glyphs, rows reading as lines, parts locking, the still beat, then the switch-on.

Order: 3.1, 3.2, 3.3 are **[parallel-safe]**; then 3.4; then 3.5; then 3.6; then 3.7.

---

### Task 3.1: Curl texture bake **[parallel-safe]**

**Files:** `src/gl/curl.ts`, `src/gl/curl.test.ts`

**Interfaces:** `generateCurl(size = 32, seed = 7): Uint8Array` (RGBA8, `size³ × 4`, curl of a seeded 3-octave value-noise potential, each channel mapped from [−1, 1] to [0, 255], alpha 255); `createCurlTexture(): THREE.Data3DTexture` (`RGBAFormat`, `LinearFilter`, `RepeatWrapping` on all three axes, `needsUpdate`).

- [ ] **Step 1: Failing test**: length `32³·4`; every 4th byte is 255; the mean of R over the volume is within 128 ± 6; R is not constant; the field is divergence-free to first order at 50 random interior voxels (`|∂x R + ∂y G + ∂z B| < 12` in byte units).
- [ ] **Step 2: Implement** the potential with `hash` on a 3D lattice and trilinear interpolation, curl by central differences with `h = 1/size`, then normalize by the global max magnitude. **Commit:** `git add src/gl/curl* && git commit -m "Add baked curl noise volume for ink flight"`

---

### Task 3.2: Text sampler **[parallel-safe]**

**Files:** `src/gl/textSampler.ts`

**Interfaces:**

```ts
export interface SampledText { uv: Float32Array; count: number }   // uv pairs relative to the source element's box (0..1, y down)
/** Samples glyph pixels of the words inside `wordsEl` (or all text of `sourceEl`), relative to sourceEl's box. Call after document.fonts.ready. */
export function sampleTextPoints(sourceEl: HTMLElement, wordsEl: HTMLElement | null, stride = 3, max = 6000): SampledText
```

Method: `Range` over each word (split text nodes on whitespace), `range.getClientRects()` gives each word's box on its own line, so multi-line wrapping is never re-implemented. For each word box: an offscreen canvas of that size (× devicePixelRatio), `ctx.font = getComputedStyle(el).font` (build the string from `fontStyle fontWeight fontSize/lineHeight fontFamily`), `letterSpacing` via `ctx.letterSpacing` when supported, `fillText(word, 0, ascentBaseline)`, then scan `getImageData` alpha at `stride` px and push `[ (box.x − src.x + px/dpr) / src.w, (box.y − src.y + py/dpr) / src.h ]`. Cap at `max` points by increasing the stride. If the canvas measures the word wider or narrower than the box by more than 6%, fall back to a uniform grid over the box (spec §7: blurred glyph density fallback).

- [ ] **Step 1: Implement.** No unit test (needs a browser); verified in Task 3.7 via `page.evaluate` returning `count > 400` for the hero span.
- [ ] **Step 2: Commit** — `git add src/gl/textSampler.ts && git commit -m "Add DOM text glyph sampler for ink spawn points"`

---

### Task 3.3: Rect tracker **[parallel-safe]**

**Files:** `src/gl/rects.ts`, `src/gl/rects.test.ts`

**Interfaces:**

```ts
export interface SourceRect { pageTop: number; pageLeft: number; width: number; height: number; sticky?: { sectionTop: number; sectionHeight: number } }
export function viewportTop(r: SourceRect, scrollY: number): number
//   sticky:  min(max(sectionTop − scrollY, 0), sectionTop + sectionHeight − height − scrollY)
//   normal:  pageTop − scrollY
export function ndcRect(r: SourceRect, scrollY: number, vw: number, vh: number, out: Float32Array, offset: number): void
//   writes [x, y, w, h] in NDC (x right, y up) at out[offset..offset+3]: x = left/vw*2−1, y = 1 − top/vh*2, w = width/vw*2, h = height/vh*2
export class RectTracker { measure(sources: Record<number, HTMLElement>): void; write(scrollY, vw, vh, out: Float32Array): void }  // out is uRect (8 × vec4)
```

`measure` reads `offsetTop`/`offsetLeft` chains once (walks `offsetParent`) and, for the hero, the section's `offsetTop`/`offsetHeight` and the sticky block's `offsetHeight`; it runs on mount and on debounced resize (250 ms) only, never per frame.

- [ ] **Step 1: Failing test** (Review Focus #1): sticky block of height 360 in a section at top 0, height 1260: `viewportTop` at scroll 0 → 0, at 100 → 0, at 900 → 0, at 950 → −50, at 1300 → −400; a normal rect at pageTop 2000: at scroll 1500 → 500; `ndcRect` maps a rect at left 0, top 0, width vw, height vh to `[−1, 1, 2, 2]`; after a `measure` with new sizes the next `write` uses them (mock elements as plain objects with `offsetTop/offsetLeft/offsetWidth/offsetHeight/offsetParent`).
- [ ] **Step 2: Implement.** **Commit:** `git add src/gl/rects* && git commit -m "Add per-frame NDC rect tracker with analytic sticky hero"`

---

### Task 3.4: The ink points system

**Files:** `src/gl/Ink.tsx`, `src/gl/inkGeometry.ts`, `src/gl/inkGeometry.test.ts`, `src/gl/shaders/ink.vert.ts`, `src/gl/shaders/ink.frag.ts`

**Interfaces:**

```ts
// inkGeometry.ts (pure)
export const PARTITION = { quoter: 0, intake: 1, merge: 2, balance: 3, splitter: 4, watch: 5, visitor: 6 } as const;
export const PARTITION_SIZES: Record<Tier, number[]> = { desktop: [32768, 4096, 4096, 4096, 4096, 4096, 4096], phone: [7168, 1024, 1024, 1024, 1024, 1024, 1024] };
export const PARTITION_MACHINE = [0, 1, 0, 2, 3, 4, 7];         // which machine's parts are targets (merge targets the quoter bed)
export interface InkGeometryData { target: Float32Array; targetBirth: Float32Array; seed: Float32Array; row: Float32Array; partition: Float32Array; trickle: Float32Array; offsets: number[]; count: number }
export function buildInkGeometry(result: LayoutResult, tier: Tier, seed: number): InkGeometryData
//   for each partition: N points; targets sampled (with replacement, seeded) from the machine's parts sorted by birth, so early-birth parts get early ink;
//   for the merge partition only bed cells (kind cell) are targets; trickle = 1 for a hashed 2% of the quoter partition;
//   row = hashed row index 0..39 (quoter) or 0..7 (others); visitor targets are filled later (zeros now).
```

Uniforms added to `BenchUniforms` (extend `createUniforms`): `uRect: Float32Array(32)`, `uCentroid: Float32Array(24)` (bench-space centroid per source machine, indexed by partition), `uActiveRect: number` (partition index whose rect feeds the trickle), `uTrickle: number` (0/1), `uBurst: number`, `uCurl: Data3DTexture`, `uPixelRatio: number`, `uInk: Color`, `uBandPitch: number` (14 CSS px in NDC y: `14 / vh · 2`), `uBandRows: Float32Array(8)` (40 for quoter, 8 others).

Vertex shader (`glslVersion: GLSL3`; attributes `aTarget vec3, aTargetBirth float, aSeed float, aRow float, aPartition float, aTrickle float, aSpawnUV vec2`):

```glsl
precision highp float; precision highp sampler3D;
in vec3 aTarget; in float aTargetBirth; in float aSeed; in float aRow; in float aPartition; in float aTrickle; in vec2 aSpawnUV;
uniform vec4 uRect[8]; uniform vec3 uCentroid[8]; uniform float uCompile[8]; uniform float uTime; uniform float uVel;
uniform float uBurst; uniform float uTrickle; uniform float uActiveRect; uniform sampler3D uCurl; uniform float uPixelRatio;
uniform float uBandPitch; uniform float uBandRows[8]; uniform vec3 uLock; uniform float uGlyph;
uniform mat4 projectionMatrix; uniform mat4 modelViewMatrix;   // supplied by three for ShaderMaterial
out float vAlpha; out float vGlyph;
const int PART_MACHINE[7] = int[7](0, 1, 0, 2, 3, 4, 7);
float expoOut(float t) { return t >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t); }
void main() {
  int part = int(aPartition + 0.5);
  int m = PART_MACHINE[part];
  // progress 0..1 for this point
  float ls = uLock.x + aTargetBirth * uLock.y;
  float land = ls + uLock.z * 0.5;
  float depart = max(0.0, land - 0.6);
  float t;
  if (aTrickle > 0.5) {
    t = uTrickle > 0.5 ? fract(uTime * 0.12 + aSeed) : 0.0;
    if (uCompile[0] < 0.999) t = 0.0;
  } else if (part == 2) {
    t = clamp((uBurst - aSeed * 0.3) / 0.6, 0.0, 1.0);
  } else {
    t = clamp((uCompile[m] - depart) / max(1e-4, land - depart), 0.0, 1.0);
  }
  // spawn in NDC from the source rect
  int rectIdx = (aTrickle > 0.5) ? int(uActiveRect + 0.5) : part;
  vec4 r = uRect[rectIdx];
  vec2 spawn = vec2(r.x + aSpawnUV.x * r.z, r.y - aSpawnUV.y * r.w);
  // target in NDC
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(aTarget, 1.0);
  vec2 target = clip.xy / clip.w;
  float targetDepth = clip.z / clip.w;
  vec4 cclip = projectionMatrix * modelViewMatrix * vec4(uCentroid[part], 1.0);
  vec2 centroidNdc = cclip.xy / cclip.w;
  // flight: quadratic bezier with a control point pulled toward the band
  float e = expoOut(t);
  vec2 ctrl = mix(spawn, centroidNdc, 0.33) + vec2(0.0, -0.15);
  vec2 p = mix(mix(spawn, ctrl, e), mix(ctrl, target, e), e);
  // rows band: t in [0.28, 0.62] pulls toward a row-quantized point
  float band = smoothstep(0.28, 0.36, t) * (1.0 - smoothstep(0.54, 0.62, t));
  vec2 bandOrigin = mix(spawn, centroidNdc, 0.33);
  float rows = uBandRows[part];
  float lineLen = 0.35 + 0.45 * fract(aSeed * 7.31);           // ragged right ends
  float xInLine = fract(aSeed * 13.7) * lineLen;
  vec2 rowPt = vec2(bandOrigin.x - 0.25 + xInLine * 0.8, bandOrigin.y + (rows * 0.5 - aRow) * uBandPitch);
  // printing front: rows appear top to bottom over the first quarter of the band window
  float front = smoothstep(0.28 + aRow / rows * 0.08, 0.30 + aRow / rows * 0.08, t);
  p = mix(p, rowPt, band * front);
  // curl
  vec3 c = texture(uCurl, vec3(aSpawnUV * 2.0, aSeed + uTime * 0.15)).xyz * 2.0 - 1.0;
  p += c.xy * sin(3.14159265 * t) * (0.006 + 0.02 * abs(uVel)) * (1.0 - band);
  // depth: near the camera in flight, a hair in front of the target once landing
  float z = mix(-0.98, targetDepth - 0.002, smoothstep(0.9, 1.0, t));
  gl_Position = vec4(p, z, 1.0);
  vAlpha = 0.85 * smoothstep(0.0, 0.03, t) * (1.0 - smoothstep(0.92, 1.0, t)) * step(0.001, t);
  vGlyph = uGlyph * step(0.85, fract(aSeed * 3.3)) * band;
  gl_PointSize = (vGlyph > 0.5 ? 12.0 : 2.0) * uPixelRatio * step(0.001, vAlpha);
}
```

Fragment: a soft dot (`length(gl_PointCoord − 0.5) < 0.5`), `uInk` color, alpha `vAlpha`; glyph mode (`uGlyph`, Stage 6) samples the atlas; `discard` when alpha < 0.01. Material: `transparent`, `depthTest: true`, `depthWrite: false`, `blending: NormalBlending`. Draw order after the kits (`renderOrder = 10`). `frustumCulled = false`.

`<Ink result uniforms tier />`: builds the geometry once; on mount and after `document.fonts.ready` samples every `[data-ink-source]` (the hero's `[data-ink-words]` span for partition 0; section h2s for intake (`kalshi`), balance (`heron`), splitter (`darch`), watch (`summers`); the third `<p>` of section 02 for the merge partition; `#yours-echo` for the visitor) into `aSpawnUV` per partition (each point takes `uv[(i · 7919) mod count]`), uploads once, and re-samples on debounced resize; the `RectTracker` measures the same elements; `useFrame` (priority 1, after Clocks) writes `uRect`, `uActiveRect` (= partition of the active section's source: sentence → 0, first → 0 sourcing from section 03's first line, kalshi → 1, heron → 3, darch → 4, summers → 5, more → 2, alive → trickle off, yours → 6), `uTrickle`, `uBurst`, `uTime`, `uPixelRatio`, `uBandPitch`.

- [ ] **Step 1: Failing test** for `buildInkGeometry`: desktop count = 57,344; offsets are prefix sums; every target of partition 0 lies within the quoter's bounds; partition 2 targets are all bed cells; trickle count within 2% ± 0.5% of 32,768; `targetBirth` is non-decreasing on average across partition 0 (the first 10% of points have a lower mean birth than the last 10%); phone count 13,312.
- [ ] **Step 2: Implement** all files. Mount `<Ink>` inside `Scene`'s Canvas after `<Kits>`.
- [ ] **Step 3: Verify:** dev server, `/?built=1` shows no ink (compile complete, trickle only, as 2 px dots drifting from the headline to the quoter); `/?freeze=1.0` (Task 3.5) shows dots mid-flight. **Commit:** `git add src/gl/Ink.tsx src/gl/ink* src/gl/shaders/ink.* && git commit -m "Add the stateless ink points system"`

---

### Task 3.5: Warm-up, cross-fade, T0 and the hero compile tween

**Files:** `src/gl/tween.ts`, `src/gl/tween.test.ts`, modify `src/gl/Scene.tsx`, `src/gl/Clocks.tsx`, `src/site/sections/Sentence.tsx`

**Interfaces:**
- `createTween(durationS: number): { start(nowS: number, from?: number, to?: number): void; value(nowS: number): number; done(nowS: number): boolean; active: boolean }` — linear; `from/to` default 0 → 1; `start` with `from = 1, to = 0` is the teardown direction.
- `intro` module state in `Clocks`: `heroTween = createTween(TIMING.heroCompileS)`; `heroCompile = heroTween.value(now)`; `window.__dbso = { t0: number | null, freeze: number | null, built: boolean }` for tests.
- Scene: canvas wrapper starts `opacity: 0`; `onCreated`: `await document.fonts.ready`, `await gl.compileAsync(scene, camera)`, `gl.render(scene, camera)` once, then set the wrapper `opacity 1` with `transition: opacity 200ms`, and after 200 ms call `startIntro()` which records `t0` and starts `heroTween` (unless `?built=1` → compile pinned to 1, or `?freeze=<s>` → `heroCompile = min(1, s / 2.2)` pinned, or reduced motion → pinned to 1).
- Rebuild: `#rebuild` click and `h1` click call `startIntro()` again (`heroTween.start(now, 0, 1)`); the quoter's `run` naturally drops as `compile` falls below the lock and re-locks at 0.985.

- [ ] **Step 1: Failing test** for `createTween`: value 0 before start; after `start(10)` value at 11.1 = 0.5 for a 2.2 s tween; `done(12.2)` true; `start(20, 1, 0)` runs 1 → 0.
- [ ] **Step 2: Implement.** `Sentence.tsx`: `onClick` on the h1 dispatches `window.dispatchEvent(new CustomEvent('dbso:rebuild'))`; Clocks listens. The `#rebuild` button does the same.
- [ ] **Step 3: Verify:** reload at `/`; the page paints paper and copy immediately; within ~1.5 s the canvas fades in; ink lifts from "build things"; parts lock; the lever drops at ≈ 2.05 s and the carriages start. `/?freeze=0.6` shows the rows band. **Commit:** `git add -A && git commit -m "Add warm-up, cross-fade, T0 and the hero compile tween"`

---

### Task 3.6: Ladder, uptime and HUD sync

**Files:** `src/site/chrome/hudSync.ts`, `src/site/chrome/inkedCount.ts`, `src/site/chrome/inkedCount.test.ts`, modify `src/site/Site.tsx`

**Interfaces:**
- `inkedCount(sortedLockEnds: Float32Array, compile: number): number` — binary search: how many parts have `lockEnd(birth) ≤ compile`.
- `startHudSync(opts: { lockEnds: Record<MachineId, Float32Array>; wordCount: number }): () => void` — a DOM rAF loop (not inside R3F) that reads `hud` and writes, only when changed: `#ladder-lines` (`Math.round(40 · smoothstep(0.05, 0.35, hud.compile))`; 0 if the band is disabled), `#ladder-parts` (sum over machines of `inkedCount`, formatted with `toLocaleString('en-US')`), `#ladder-running` and `#uptime` (`mm:ss` from `hud.runningSince`, `--:--` until the quoter's lever locks), `#footer-total` (`copy.yours.footer(total)`), `[data-strip]` active class, `[data-rung]` lit class by `hud.rung`, `[data-click]` reveal by `hud.click`. Clocks populates `hud.compilePerMachine` (Float32Array 8), `hud.runningSince` (uptime at lock), `hud.rung`, `hud.click`, `hud.section`.

- [ ] **Step 1: Failing test** for `inkedCount`: `[0.4, 0.5, 0.9, 1.0]` with compile 0.45 → 1; 0.9 → 3; 1 → 4; 0 → 0.
- [ ] **Step 2: Implement** and start the sync in `Site.tsx` via a `useEffect`.
- [ ] **Step 3: Verify:** the ladder reads `10 words · 40 lines · N parts · running 00:00:0x` after the intro, where N equals `counts.byMachine[quoter]` from Stage 1 (the intake adds later). **Commit:** `git add -A && git commit -m "Add ladder, uptime and HUD sync"`

---

### Task 3.7: Gate G2 stills

- [ ] **Step 1:** Playwright 1440 × 900, light theme: `/?freeze=0.3`, `0.6`, `1.2`, `2.2`, and `/` waited to T0 + 3.0 s (poll `window.__dbso.t0`); save `.playwright-mcp/gates/g2-<t>.png`. Also `page.evaluate` that the hero sample count is > 400 (`window.__dbso.samples[0]`), and after `page.setViewportSize({ width: 1100, height: 800 })` the count is re-sampled (Review Focus #1).
- [ ] **Step 2:** The orchestrator judges against spec §3.1: ink visibly lifts from the glyphs of "build things"; the 0.6 s still reads as rows of dots (lines), not rain or confetti; the 1.2 s still shows parts locking with the bed racking in from the headline side; the 2.2 s still shows a complete, still machine; the 3.0 s still shows carriages away from the rail end and a hot cap. Fixes per §14 if not.
