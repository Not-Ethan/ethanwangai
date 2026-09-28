import { KIND, MACHINE, type MachineConfig } from '@/bench/types';
import { bar, cell, ring } from './helpers';

const PING = 1.6;   // ping period, seconds
const PULSE = 2.0;  // ping pulse scale

/** Six parts, all ping, no lever: the bot runs from load. */
export const BOT: MachineConfig = {
  id: MACHINE.bot, name: 'bot', footprint: { w: 0.6, d: 0.2 },
  build: () => [
    bar([-0.3, 0.3, 0], [0.3, 0.3, 0], 'bot', 0, KIND.ping, [PING, 0, PULSE, 0]),
    ...[0, 1, 2, 3].map((i) => cell([-0.22 + i * 0.15, 0, 0], [0.12, 0.25, 0.12], 'bot', 0, KIND.ping, [PING, i * 0.1, PULSE, 0], -1, 'module')),
    // ring() fixes kind to spin for rotors; the bot's ring pulses instead, so its spin reads from the param phase only.
    { ...ring([0, 0.55, 0], 'z', 'bot', 0, [PING, 0.05, PULSE, 0], 0.18), kind: KIND.ping },
  ],
};
