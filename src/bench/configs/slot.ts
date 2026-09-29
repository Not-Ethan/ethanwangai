import { KIND, MACHINE, type MachineConfig } from '@/bench/types';
import { bar } from './helpers';

const W = 1.6;   // field width along x
const D = 1.0;   // scanning bar length along z

/** Four pencil rails and one scanning bar, no lever. Excluded from inkedAtEnd by layout(); the visitor builds inside it. */
export const SLOT: MachineConfig = {
  id: MACHINE.slot, name: 'slot', footprint: { w: W, d: D },
  build: () => [
    ...[-0.45, -0.15, 0.15, 0.45].map((z) => bar([-W / 2, 0.06, z], [W / 2, 0.06, z], 'rails', 0)),
    bar([-W / 2, 0.12, -D / 2], [-W / 2, 0.12, D / 2], 'scan', 0, KIND.scan, [W, 3.0, 0, -1]),   // scan rail = [fieldWidth, period, 0, -1]; w < 0 marks a rail; for machine 6 the shader reads uSlotPhase, which Clocks integrates from uSlotPeriod
  ],
};
