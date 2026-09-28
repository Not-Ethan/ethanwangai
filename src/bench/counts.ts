// The whole bench, built once from the sentence and counted. Pure: no React, no DOM.
// The browser, the build-time emitter and every printed count call buildBench with the same
// seed, so they agree; the visitor's config is built per sentence and is not in ALL_CONFIGS.
import { MACHINE, type LayoutResult, type MachineConfig, type Tier } from './types';
import { layout } from './layout';
import { hashString } from './hash';
import { BENCH_SEED_TEXT } from './bench';
import { QUOTER } from './configs/quoter';
import { INTAKE } from './configs/intake';
import { BALANCE } from './configs/balance';
import { SPLITTER } from './configs/splitter';
import { WATCH } from './configs/watch';
import { BOT } from './configs/bot';
import { SLOT } from './configs/slot';

export const ALL_CONFIGS: MachineConfig[] = [QUOTER, INTAKE, BALANCE, SPLITTER, WATCH, BOT, SLOT];

export function buildBench(tier: Tier): LayoutResult {
  return layout({ tier, seed: hashString(BENCH_SEED_TEXT), configs: ALL_CONFIGS });
}

export interface BenchCounts {
  total: number;
  inkedAtEnd: number;          // every part that is ink once the page is scrolled: not the slot, not the visitor
  byMachine: number[];         // indexed by MachineId
  quoterAtHero: number;        // the ladder's figure at T0 + 2.2: the quoter alone
  quoterWithIntake: number;    // the ladder's figure after 04 · kalshi adds the intake at the quoter's headline end
}

export function benchCounts(result: LayoutResult): BenchCounts {
  const { total, inkedAtEnd, byMachine } = result.counts;
  return {
    total, inkedAtEnd, byMachine,
    quoterAtHero: byMachine[MACHINE.quoter],
    quoterWithIntake: byMachine[MACHINE.quoter] + byMachine[MACHINE.intake],
  };
}
