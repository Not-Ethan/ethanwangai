// The visitor's house, end to end (spec §5.5, §3.1 · 07, §4.7, §11). Yours.tsx announces a sentence; VisitorHouse.tsx
// forwards it here and plugs in its mesh hooks and clip plane; Scaffold.tsx plugs in its aGrow attribute;
// Driver.tsx calls beforeFrame (→ FrameInputs.buildT) and afterFrame around applyFrame. One build runs at a time, on
// wall time, so scroll never pauses or reverses it. Structural types keep it testable in Node with fakes.
import type { House } from '@/valley/types';
import { houseFromSentence } from '@/valley/house';
import { PLACES } from '@/valley/layout';
import { BUILD_SECONDS } from '@/valley/build';
import { copy } from '@/site/copy';
import { cleanSentence, countWords, yoursDom } from '@/site/visitorSentence';
import {
  BUILD_PHASE, applyBuild, buildTAt, createBuildTargets, restoreBuild, startBuild,
  type BuildClock, type BuildTargets,
} from './driverCore';
import { clipConstant, houseMeshData, type HouseMeshData } from './houseGeometry';
import { setDynamicWindows } from './windowSlots';

export const WINDOWS_AT = 3.6;             // §5.5: the cut completes at 3.6 s; the windows go in with the last wall
const HIDDEN = -1e6;                       // plane constant that clips everything

export interface VisitorSceneHooks { swap(data: HouseMeshData | null): void; setBuilding(building: boolean): void }
export interface GrowTarget { array: Float32Array; needsUpdate: boolean }
export interface Built { sentence: string; house: House; data: HouseMeshData }

export class VisitorBridge {
  hooks: VisitorSceneHooks | null = null;
  plane: { constant: number } = { constant: HIDDEN };
  grow: GrowTarget | null = null;
  readonly clock: BuildClock = { start: null };
  readonly targets: BuildTargets = createBuildTargets();
  current: Built | null = null;
  private pending: Built | null = null;
  private queued: string | null = null;
  private restoring: string | null = null;
  private pinned: { sentence: string; t: number } | null = null;
  private building = false;
  private windowsShown = false;
  private tagWritten = false;
  private lastClock = '';

  /** A submitted sentence. Starts on the next frame, or when the running build reaches 4.4 s. Latest wins. */
  request(sentence: string): void { this.queued = sentence; }
  /** The sentence found in browser storage at load: built at once, no animation (§4.7). */
  restore(sentence: string): void { this.restoring = sentence; }
  /** Gate stills: hold the build of `sentence` at t seconds. */
  pin(sentence: string, t: number): void { this.pinned = { sentence, t }; }

  private make(sentence: string): Built {
    const house = houseFromSentence(sentence);
    return { sentence, house, data: houseMeshData(house, PLACES.lot[0], PLACES.lot[2]) };
  }

  /** Before applyFrame: start queued builds, swap houses, register windows. Returns FrameInputs.buildT. */
  beforeFrame(t: number, reducedMotion: boolean): number | null {
    if (this.pinned) {
      if (!this.current && !this.pending) this.pending = this.make(this.pinned.sentence);
      this.advance(this.pinned.t);
      return this.pinned.t;
    }
    const running = buildTAt(this.clock, t);
    const busy = running !== null && running < BUILD_SECONDS;
    if (this.queued !== null && !busy) {
      const hadHouse = this.current !== null;
      this.pending = this.make(this.queued);
      this.queued = null;
      this.restoring = null;
      startBuild(this.clock, t, hadHouse, reducedMotion);
    } else if (this.restoring !== null && this.clock.start === null) {
      this.pending = this.make(this.restoring);
      this.restoring = null;
      restoreBuild(this.clock);
    }
    const bt = buildTAt(this.clock, t);
    this.advance(bt);
    return bt;
  }

  private advance(bt: number | null): void {
    if (bt === null || !this.hooks) return;
    if (this.pending && bt >= 0) {
      this.current = this.pending;
      this.pending = null;
      this.hooks.swap(this.current.data);
      setDynamicWindows('visitor', []);
      this.windowsShown = false;
      this.tagWritten = false;
      this.lastClock = '';
      if (yoursDom.tag) yoursDom.tag.textContent = '';
    }
    const cur = this.current;
    if (!cur) return;
    const wantBuilding = bt >= 0 && bt < BUILD_SECONDS;
    if (wantBuilding !== this.building) {
      this.building = wantBuilding;
      this.hooks.setBuilding(wantBuilding);
    }
    if (!this.windowsShown && bt >= WINDOWS_AT) {
      setDynamicWindows('visitor', cur.data.windows);
      this.windowsShown = true;
    }
  }

  /** After applyFrame: clip plane, scaffold growth, and the clock/tag lines in Yours. The visitor point light is
   *  Stage 2's POINT_LIGHTS entry, driven by syncScene from lit[visitor]; the bridge owns no light. */
  afterFrame(buildT: number | null): void {
    const out = this.targets;
    applyBuild(buildT, out);
    const cur = this.current;
    this.plane.constant = cur ? clipConstant(cur.data.min[1], cur.data.max[1], out.cut) : HIDDEN;
    if (this.grow) {
      this.grow.array.set(out.grow);
      this.grow.needsUpdate = true;
    }
    if (!cur) return;
    if (out.phase === BUILD_PHASE.building) {
      if (out.clock !== this.lastClock && yoursDom.clock) {
        yoursDom.clock.textContent = copy.yours.clock(out.clock);
        this.lastClock = out.clock;
      }
    } else if (out.phase === BUILD_PHASE.done && !this.tagWritten && yoursDom.tag) {
      if (yoursDom.clock) yoursDom.clock.textContent = '';
      yoursDom.tag.textContent = copy.yours.tag(countWords(cur.sentence), cur.house.parts.length);
      this.tagWritten = true;
    }
  }

  /** VisitorHouse unmounted (canvas lost or remounted): keep the house so the next mount puts it back. */
  detach(): void {
    if (this.current && !this.pending) this.pending = this.current;
    this.current = null;
    this.hooks = null;
    this.grow = null;
    this.plane = { constant: HIDDEN };
    this.building = false;
    this.windowsShown = false;
    setDynamicWindows('visitor', []);
  }
}

export const visitorBridge = new VisitorBridge();

/** `?visitor=<sentence>&buildT=<seconds>`: hold a build for the G5 stills. Never stored. */
export function buildPinFromSearch(search: string): { sentence: string; t: number } | null {
  const q = new URLSearchParams(search);
  const raw = q.get('visitor');
  const tRaw = q.get('buildT');
  if (raw === null || tRaw === null) return null;
  const sentence = cleanSentence(raw);
  const t = Number(tRaw);
  if (sentence === null || !Number.isFinite(t)) return null;
  return { sentence, t: Math.min(BUILD_SECONDS, Math.max(0, t)) };
}
