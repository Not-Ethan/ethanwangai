import { describe, it, expect } from 'vitest';
import { ALL_CONFIGS, buildBench, benchCounts } from './counts';
import { layout } from './layout';
import { hashString } from './hash';
import { BENCH_SEED_TEXT } from './bench';
import { visitorConfig } from './visitorLayout';
import { MACHINE } from './types';

describe('ALL_CONFIGS', () => {
  it('lists the seven bench machines in placement order; the visitor is built per sentence', () => {
    expect(ALL_CONFIGS.map((c) => c.id)).toEqual([
      MACHINE.quoter, MACHINE.intake, MACHINE.balance, MACHINE.splitter, MACHINE.watch, MACHINE.bot, MACHINE.slot,
    ]);
  });
});

describe('buildBench + benchCounts', () => {
  const desktop = buildBench('desktop');
  const counts = benchCounts(desktop);

  it('desktop total sits inside the plan band', () => {
    console.info(JSON.stringify(counts));
    expect(counts.total).toBeGreaterThanOrEqual(7500);
    expect(counts.total).toBeLessThanOrEqual(10500);
    expect(counts.total).toBe(desktop.parts.length);
  });

  it('inkedAtEnd excludes the slot and the visitor', () => {
    expect(counts.byMachine[MACHINE.slot]).toBeGreaterThan(0);
    expect(counts.byMachine[MACHINE.visitor]).toBe(0);
    expect(counts.inkedAtEnd).toBe(counts.total - counts.byMachine[MACHINE.slot]);
    const withVisitor = benchCounts(layout({
      tier: 'desktop', seed: hashString(BENCH_SEED_TEXT), configs: [...ALL_CONFIGS, visitorConfig(BENCH_SEED_TEXT)],
    }));
    expect(withVisitor.byMachine[MACHINE.visitor]).toBeGreaterThan(0);
    expect(withVisitor.inkedAtEnd).toBe(withVisitor.total - withVisitor.byMachine[MACHINE.slot] - withVisitor.byMachine[MACHINE.visitor]);
    expect(withVisitor.inkedAtEnd).toBe(counts.inkedAtEnd);
  });

  it('quoterAtHero is the quoter alone; quoterWithIntake adds the intake', () => {
    expect(counts.quoterAtHero).toBe(counts.byMachine[MACHINE.quoter]);
    expect(counts.quoterAtHero).toBeGreaterThan(0);
    expect(counts.quoterWithIntake).toBe(counts.byMachine[MACHINE.quoter] + counts.byMachine[MACHINE.intake]);
    expect(counts.quoterWithIntake).toBeGreaterThan(counts.quoterAtHero);
  });

  it('byMachine sums to total and every bench machine emits parts', () => {
    expect(counts.byMachine).toHaveLength(8);
    expect(counts.byMachine.reduce((a, b) => a + b, 0)).toBe(counts.total);
    ALL_CONFIGS.forEach((c) => expect(counts.byMachine[c.id]).toBeGreaterThan(0));
  });

  it('phone total sits inside the plan band', () => {
    const phone = benchCounts(buildBench('phone'));
    expect(phone.total).toBeGreaterThanOrEqual(1600);
    expect(phone.total).toBeLessThanOrEqual(2600);
  });

  it('is deterministic across two calls', () => {
    expect(buildBench('desktop')).toEqual(desktop);
  });

  it('seeds from the bench sentence', () => {
    expect(desktop).toEqual(layout({ tier: 'desktop', seed: hashString(BENCH_SEED_TEXT), configs: ALL_CONFIGS }));
  });

  it('pins the quoter plate at the bench surface on the quoter front', () => {
    const foot = desktop.machines[MACHINE.quoter].foot;
    expect(foot[1]).toBe(0);
    expect(foot[2]).toBeGreaterThan(1.5);
  });
});
