// Pure contracts for the valley (spec §5.7). src/valley/** imports nothing from React, three's renderer or the DOM.
// These names are law: later stages copy them and never rename them (plan index, Interface contracts).

export type Tier = 'desktop' | 'phone';
export type SectionId = 'open' | 'kalshi' | 'heron' | 'darch' | 'summers' | 'alive' | 'yours' | 'contact';
export type EmitterId = 'hut' | 'nist' | 'wvu' | 'kalshiLamp' | 'bar1' | 'bar2' | 'bar3' | 'bar4' | 'mill' | 'ridge'
  | 'hill1' | 'hill2' | 'hill3' | 'hill4' | 'hill5' | 'visitor';
export type Vec3 = readonly [number, number, number];
export type LightState = 'dark' | 'igniting' | 'lit' | 'out';
export interface Emitter { id: EmitterId; position: Vec3; color: string; size: number; meaning: string }
export interface SectionRange { id: SectionId; start: number; end: number }          // g space, start < end
export interface View { yaw: number; pitch: number; fovScale: number }               // degrees, degrees, multiplier
export interface Timeline { tod: number; section: SectionId; s: number; view: View; ridgeReveal: number; hedgeReveal: number; darchT: number; rain: number; pulseArm: boolean }
export interface Environment { zenith: string; horizon: string; east: string; fogColor: string; fogNear: number; fogFar: number; sunDir: Vec3; sunColor: string; sunIntensity: number; hemiSky: string; hemiGround: string; starAlpha: number; moonPos: Vec3; moonAlpha: number }
export type IgnitionKind = 'flicker' | 'catch' | 'mill' | 'trickle';
export interface IgnitionStep { target: EmitterId | 'ridge'; at: number; dur: number; kind: IgnitionKind; stagger?: number }
export type RoofKind = 'pitched' | 'hipped' | 'flat';
export interface HousePart { kind: 'plank' | 'slat' | 'frame' | 'post' | 'chimney'; min: Vec3; max: Vec3; order: number }
export interface House { seed: number; words: number; tiers: number; bays: number; width: number; depth: number; roof: RoofKind; windowsPerFace: { front: number; back: number; side: number }; porch: boolean; parts: HousePart[]; windows: Vec3[] }
export interface BuildState { cut: number; scaffold: { idx: number; grow: number }[]; clock: string; lit: boolean; done: boolean }
