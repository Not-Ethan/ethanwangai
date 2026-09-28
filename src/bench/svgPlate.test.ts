import { describe, it, expect } from 'vitest';
import { layout } from './layout';
import { evaluatePose, type Pose } from './camera';
import { KIND, MACHINE, PRIMITIVE, type LayoutResult, type PartInstance } from './types';
import { ALL_CONFIGS } from './counts';
import { heroPlateSvg, inkPlateSvg, projectParts, UNIT_CENTRE, UNIT_EXTENT } from './svgPlate';

const ASPECT = 16 / 10;

function heroPose(): Pose {
  const out = { position: [0, 0, 0], lookAt: [0, 0, 0], fov: 0 };
  evaluatePose(0, 0, 'desktop', out);
  const [px, py, pz] = out.position, [lx, ly, lz] = out.lookAt;
  return { position: [px, py, pz], lookAt: [lx, ly, lz], fov: out.fov };
}

const count = (s: string, needle: string) => s.split(needle).length - 1;

describe('svgPlate', () => {
  const result = layout({ tier: 'desktop', seed: 1, configs: ALL_CONFIGS });
  const pose = heroPose();
  const opts = {
    inkMachines: [MACHINE.bot],
    pencilMachines: [MACHINE.quoter, MACHINE.intake],
    cropMachines: [MACHINE.balance, MACHINE.splitter, MACHINE.watch, MACHINE.slot],
  };
  const hero = heroPlateSvg(result, pose, ASPECT, opts);

  it('uses the section-0 desktop pose from the key table', () => {
    expect(pose).toEqual({ position: [-7.2, 15.0, 20.6], lookAt: [-3.9, 3.2, -4.0], fov: 30 });
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

  it('copies the kit geometry pinned in plan-03 Task 2.4', () => {
    // cell Box(0.8,1,0.8).translate(0,0.5,0); cap Box(0.8,0.03,0.8); bar Box(1,0.12,0.12);
    // rod Cylinder(0.05,0.05,1,8); ring Torus(0.5,0.06,8,24); tile Box(0.2,0.02,0.2).translate(0,0.01,0).
    expect(UNIT_EXTENT[PRIMITIVE.cell]).toEqual([0.8, 1, 0.8]);
    expect(UNIT_EXTENT[PRIMITIVE.cap]).toEqual([0.8, 0.03, 0.8]);
    expect(UNIT_EXTENT[PRIMITIVE.bar]).toEqual([1, 0.12, 0.12]);
    expect(UNIT_EXTENT[PRIMITIVE.rod]).toEqual([2 * 0.05, 1, 2 * 0.05]);
    expect(UNIT_EXTENT[PRIMITIVE.ring]).toEqual([2 * (0.5 + 0.06), 2 * (0.5 + 0.06), 2 * 0.06]);
    expect(UNIT_EXTENT[PRIMITIVE.tile]).toEqual([0.2, 0.02, 0.2]);
    expect(UNIT_CENTRE[PRIMITIVE.cell]).toEqual([0, 0.5, 0]);
    expect(UNIT_CENTRE[PRIMITIVE.tile]).toEqual([0, 0.01, 0]);
    for (const p of [PRIMITIVE.cap, PRIMITIVE.bar, PRIMITIVE.rod, PRIMITIVE.ring]) expect(UNIT_CENTRE[p]).toEqual([0, 0, 0]);
  });

  it('projects a cell and a tile about their geometry centre, not their origin', () => {
    const at = (primitive: PartInstance['primitive'], position: PartInstance['position'], scale: PartInstance['scale']): PartInstance => ({
      primitive, kind: KIND.static, position, quaternion: [0, 0, 0, 1], scale, param: [0, 0, 0, 0], col: -1, module: 'probe', group: 0, explodeMode: 'module', machine: MACHINE.quoter, explode: [0, 0, 0], birth: 0,
    });
    const bedCell = result.parts.find((p) => p.machine === MACHINE.quoter && p.kind === KIND.cell)!;
    expect(bedCell.position[1]).toBe(0);
    const [px, , pz] = bedCell.position, sy = bedCell.scale[1];
    // A rod's origin is its centre. A cell stands on its origin, so its centre is 0.5 * scale.y above it; a tile sits 0.01 * scale.y above.
    const probe: PartInstance['scale'] = [1, 0.01, 1];
    const parts = [bedCell, at(PRIMITIVE.rod, [px, sy / 2, pz], probe), at(PRIMITIVE.rod, [px, 0, pz], probe), at(PRIMITIVE.tile, [px, 0, pz], [1, 1, 1]), at(PRIMITIVE.rod, [px, 0.01, pz], probe)];
    const [cell, raised, base, tile, tileCentre] = projectParts({ parts } as LayoutResult, pose, ASPECT);
    expect(cell.x).toBeCloseTo(raised.x, 6);
    expect(cell.y).toBeCloseTo(raised.y, 6);
    expect(cell.y).toBeGreaterThan(base.y + 0.001);
    expect(tile.x).toBeCloseTo(tileCentre.x, 6);
    expect(tile.y).toBeCloseTo(tileCentre.y, 6);
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
