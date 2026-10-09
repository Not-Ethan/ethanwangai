// The Stage 3 light block (spec §4.2, §4.5, §4.6, §5.3, §5.6). applyFrame calls applyLights once per frame after it has
// evaluated the timeline; applyLights owns every write to `lit`. Allocation-free.
import * as THREE from 'three';
import type { FrameInputs, Uniform, ValleyUniforms } from './driverCore';
import { EMITTER_INDEX } from './projection';
import { writeChainLevels } from './chain';

export interface LightUniforms {
  uRidgeLit: Uniform<number>;            // the ridge emitter's level, pulse included
  uMillRows: Uniform<THREE.Vector4>;     // the mill's four row levels, bottom row in x
  uWheelAngle: Uniform<number>;          // radians, integrated on wall time
}

class LightNumber implements Uniform<number> {
  value: number;
  constructor(v: number) { this.value = v + 0.5 - 0.5; this.value = v; }
}

export function createLightUniforms(): LightUniforms {
  return {
    uRidgeLit: new LightNumber(1),
    uMillRows: { value: new THREE.Vector4(0, 0, 0, 0) },
    uWheelAngle: new LightNumber(0),
  };
}

export function applyLights(inputs: FrameInputs, u: ValleyUniforms, lit: Float32Array): void {
  writeChainLevels(inputs.introT, inputs.buildT !== null, lit);
  u.uRidgeLit.value = lit[EMITTER_INDEX.ridge];
}
