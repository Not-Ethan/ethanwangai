// The one live frame (spec §6 Driver): preallocated inputs and targets. Driver.tsx writes it every frame; Scene.tsx
// binds frame.targets.uniforms into every material; frame.targets.projected is PROJECTED, which the DOM labels read
// through @/gl/projection (so the site chunk never imports this module or three).
import { createFrame, createUniforms, type Frame } from './driverCore';

export const frame: Frame = createFrame(createUniforms());
