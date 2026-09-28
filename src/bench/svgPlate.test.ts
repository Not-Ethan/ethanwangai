import { describe, it, expect } from 'vitest';
import { layout } from './layout';
import { evaluatePose, type Pose } from './camera';
import { KIND, MACHINE } from './types';
import { QUOTER } from './configs/quoter';
import { INTAKE } from './configs/intake';
import { BOT } from './configs/bot';
import { SLOT } from './configs/slot';
import { heroPlateSvg, inkPlateSvg, projectParts } from './svgPlate';

// Task 1.4's BALANCE, SPLITTER and WATCH were not present when this was written; Task 1.10 swaps in ALL_CONFIGS.
const CONFIGS = [QUOTER, INTAKE, BOT, SLOT];
const ASPECT = 16 / 10;

function heroPose(): Pose {
  const out = { position: [0, 0, 0], lookAt: [0, 0, 0], fov: 0 };
  evaluatePose(0, 0, 'desktop', out);
  const [px, py, pz] = out.position, [lx, ly, lz] = out.lookAt;
  return { position: [px, py, pz], lookAt: [lx, ly, lz], fov: out.fov };
}

const count = (s: string, needle: string) => s.split(needle).length - 1;

describe('svgPlate', () => {
  const result = layout({ tier: 'desktop', seed: 1, configs: CONFIGS });
  const pose = heroPose();
  const opts = {
    inkMachines: [MACHINE.bot],
    pencilMachines: [MACHINE.quoter, MACHINE.intake],
    cropMachines: [MACHINE.balance, MACHINE.splitter, MACHINE.watch, MACHINE.slot],
  };
  const hero = heroPlateSvg(result, pose, ASPECT, opts);

  it('uses the section-0 desktop pose from the key table', () => {
    expect(pose).toEqual({ position: [6.5, 4.2, 11.5], lookAt: [1.2, 0.4, -2.2], fov: 30 });
  });

  it('hero plate is an NDC svg with the y flip', () => {
    expect(hero).toContain('<svg');
    expect(hero).toContain('viewBox="-1 -1 2 2"');
    expect(hero).toContain('transform="scale(1,-1)"');
  });

  it('draws more than 300 hairline rects and at least 300 leader lines', () => {
    expect(count(hero, '<rect')).toBeGreaterThan(300);
    expect(count(hero, '<line')).toBeGreaterThanOrEqual(300);
    expect(hero).toContain('stroke="var(--pencil)"');
  });

  it('draws the bed as exactly one pattern-filled polygon', () => {
    expect(count(hero, '<polygon')).toBe(1);
    expect(hero).toContain('fill="url(#bedgrid)"');
    expect(hero).toContain('id="bedgrid"');
  });

  it('inks the bot as six filled rects', () => {
    expect(count(hero, 'fill="var(--ink)"')).toBe(6);
  });

  it('is deterministic and carries no colour literal', () => {
    expect(heroPlateSvg(result, pose, ASPECT, opts)).toBe(hero);
    expect(hero).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('projects every quoter part to finite NDC with a positive size', () => {
    const quoter = projectParts(result, pose, ASPECT).filter((r) => r.part.machine === MACHINE.quoter);
    expect(quoter).toHaveLength(result.counts.byMachine[MACHINE.quoter]);
    quoter.forEach((r) => {
      expect(Number.isFinite(r.x)).toBe(true);
      expect(Number.isFinite(r.y)).toBe(true);
      expect(Number.isFinite(r.w)).toBe(true);
      expect(Number.isFinite(r.h)).toBe(true);
      expect(r.w).toBeGreaterThan(0);
      expect(r.h).toBeGreaterThan(0);
    });
    // A top rail is a long thin rect along its projected axis; a bed cell is a small upright footprint.
    const rail = quoter.find((r) => r.part.module === 'topRailsX')!;
    expect(rail.w).toBeGreaterThan(10 * rail.h);
    expect(rail.angle).not.toBe(0);
    const cell = quoter.find((r) => r.part.kind === KIND.cell)!;
    expect(cell.angle).toBe(0);
    expect(cell.w).toBeLessThan(rail.w / 20);
    expect(cell.h).toBeGreaterThan(cell.w);
  });

  it('caps the quoter ink plate at 2,500 rects, largest first, over a flat shadow', () => {
    const ink = inkPlateSvg(result, MACHINE.quoter, pose, ASPECT);
    expect(ink).toContain('viewBox="-1 -1 2 2"');
    expect(count(ink, '<rect')).toBeLessThanOrEqual(2500);
    expect(count(ink, '<rect')).toBeGreaterThan(2000);
    expect(count(ink, '<ellipse')).toBe(1);
    expect(ink).toContain('fill="var(--shadow)"');
    expect(ink.indexOf('<ellipse')).toBeLessThan(ink.indexOf('<rect'));
    const areas = [...ink.matchAll(/<rect x="[^"]*" y="[^"]*" width="([^"]*)" height="([^"]*)"/g)].map((m) => Number(m[1]) * Number(m[2]));
    // Areas are re-read from four-decimal strings, so allow for rounding between near-equal neighbours.
    for (let i = 1; i < areas.length; i++) expect(areas[i]).toBeLessThanOrEqual(areas[i - 1] + 2e-4);
    const bot = inkPlateSvg(result, MACHINE.bot, pose, ASPECT);
    expect(count(bot, '<rect')).toBe(6);
    expect(count(inkPlateSvg(result, MACHINE.quoter, pose, ASPECT, 100), '<rect')).toBe(100);
  });
});
