import { describe, it, expect } from 'vitest';
import { copy } from './copy';
import { facts } from './facts';

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (typeof v === 'function') return out;
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}
const ALL = strings(copy);

describe('voice', () => {
  it('is lowercase everywhere except urls', () => {
    for (const s of ALL) if (!/^(https?:|mailto:)/.test(s)) expect(s, s).toBe(s.toLowerCase());
  });
  it('has no em or en dashes', () => { for (const s of ALL) expect(s, s).not.toMatch(/[—–]/); });
  it('never prints the private or forbidden things', () => {
    for (const s of ALL) expect(s, s).not.toMatch(/\$20|#75|notional|contracts|240-810|r[eé]sum[eé]/i);
  });
  it('is not empty and has no leading or trailing space', () => { for (const s of ALL) expect(s).toBe(s.trim()); expect(ALL.length).toBeGreaterThan(80); });
});

describe('facts in the copy', () => {
  it('prints kalshi facts from facts.ts', () => {
    const k = copy.experience.jobs.find((j) => j.id === 'kalshi')!;
    expect(k.lede).toContain(`top ${facts.kalshi.leaderboardTop}`);
    expect(k.points.join(' ')).toContain(facts.kalshi.trades.toLocaleString('en-US'));
    expect(copy.work.cases[0].lede).toContain(`top ${facts.kalshi.leaderboardTop}`);
  });
  it('spells the word numbers to match facts', () => {
    expect(facts.darch.videosPerMonth).toBe(3_000); expect(copy.experience.jobs.find((j) => j.id === 'darch')!.lede).toContain('three thousand videos a month');
    expect(facts.darch.viewsPerMonth).toBe(20_000_000); expect(copy.work.cases[2].lede).toContain('twenty million views a month');
    expect(facts.heron.cities).toBe(4); expect(copy.work.cases[1].lede).toContain('four cities');
    expect(facts.wvu.claimsPerYearUsd).toBe(100_000_000); expect(copy.experience.jobs.find((j) => j.id === 'wvu')!.lede).toContain('a hundred million dollars');
    expect(copy.rest.cards[0].entries[0].line).toContain(`class of ${facts.school.classOf}`);
  });
  it('formats the hud lines', () => {
    expect(copy.bar.status(6, 12, 43)).toBe('6 agents · 12/43 built');
    expect(copy.about.logLine('agent 02', 'h1 name', 0.614)).toBe('agent 02 · h1 name · 0.61s');
  });
  it('has the sections, jobs and cases the spec lists', () => {
    expect(copy.bar.links.map((l) => l.label)).toEqual(['about', 'work', 'experience', 'contact']);
    expect(copy.experience.jobs.map((j) => j.id)).toEqual(['kalshi', 'heron', 'wvu', 'darch', 'nist']);
    expect(copy.work.cases.map((c) => c.shot)).toEqual(['book', 'tab', 'grid', 'chat']);
    expect(copy.toolbox.rows.map((r) => r.label)).toEqual(['languages', 'backend', 'data', 'infra', 'markets']);
    expect(copy.closer.links.map((l) => l.label)).toEqual(['github ↗', 'linkedin ↗']);
    expect(copy.closer.mail).toBe('ethan.wanq@gmail.com');
  });
});
