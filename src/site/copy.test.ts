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
  it('is not empty and has no leading or trailing space', () => { for (const s of ALL) { expect(s.length).toBeGreaterThan(0); expect(s).toBe(s.trim()); } expect(ALL.length).toBeGreaterThan(80); });
});

describe('facts in the copy', () => {
  it('prints kalshi facts from facts.ts', () => {
    const k = copy.experience.jobs.find((j) => j.id === 'kalshi')!;
    expect(k.when).toBe(`${facts.kalshi.since} to now`);
    expect(copy.work.cases[0].lede).toContain(`top ${facts.kalshi.leaderboardTop}`);
    expect(copy.work.cases[0].lede).toContain(`${facts.kalshi.trades.toLocaleString('en-US')} trades`);
  });
  it('spells the word numbers to match facts', () => {
    expect(facts.darch.videosPerMonth).toBe(3_000); expect(copy.work.cases[2].tag).toContain('three thousand videos a month');
    expect(facts.darch.viewsPerMonth).toBe(20_000_000); expect(copy.work.cases[2].lede).toContain('twenty million views a month');
    expect(facts.heron.cities).toBe(4); expect(copy.work.cases[1].lede).toContain('four cities');
    expect(facts.wvu.claimsPerYearUsd).toBe(100_000_000); expect(copy.experience.jobs.find((j) => j.id === 'wvu')!.points[0]).toContain('a hundred million dollars');
    expect(copy.rest.cards[0].entries[0].line).toContain(`class of ${facts.school.classOf}`);
  });
  it('builds notes, awards and dates from facts', () => {
    expect(copy.about.notes[0]).toContain(`top ${facts.kalshi.leaderboardTop}`);
    expect(copy.about.notes[2]).toContain(`class of ${facts.school.classOf}`);
    expect(copy.rest.cards[1].entries[0].name).toContain(`top ${facts.kalshi.leaderboardTop}`);
    expect(copy.experience.jobs.find((j) => j.id === 'darch')!.when).toBe(`${facts.darch.from} to ${facts.darch.to}`);
  });
  it('formats the hud lines', () => {
    expect(copy.bar.status(6, 12, 42)).toBe('6 agents · 12/42 built');
    expect(copy.about.logLine('agent 02', 'h1 name', 0.614)).toBe('agent 02 · h1 name · 0.61s');
  });
  it('has the sections, jobs and cases the spec lists', () => {
    expect(copy.bar.links.map((l) => l.label)).toEqual(['about', 'experience', 'work', 'contact']);
    expect(copy.experience.jobs.map((j) => j.id)).toEqual(['kalshi', 'heron', 'wvu', 'darch', 'nist']);
    expect(copy.work.cases.map((c) => c.shot)).toEqual(['book', 'tab', 'grid', 'chat']);
    expect(copy.toolbox.rows.map((r) => r.label)).toEqual(['languages', 'backend', 'data', 'infra', 'markets']);
    expect(copy.closer.links.map((l) => l.label)).toEqual(['github ↗', 'linkedin ↗']);
    expect(copy.closer.mail).toBe('ethan.wanq@gmail.com');
  });
});

describe('ghost when the swarm is off', () => {
  it('has a lowercase resting line', () => {
    expect(copy.hero.ghostOff).toBe('the agents are resting today. the page is already built.');
    expect(copy.hero.ghostOff).toBe(copy.hero.ghostOff.toLowerCase());
  });
});

describe('prompts', () => {
  it('has a lowercase prompt for every built name', () => {
    const names = [
      'mark', 'nav', 'cta', 'h1 name', 'headline', 'actions', 'h2 about', 'log', 'lede', 'notes', 'h2 toolbox',
      ...copy.toolbox.rows.map((r) => `row ${r.label}`), 'h2 experience', 'index',
      ...copy.experience.jobs.map((j) => `card ${j.id}`), 'h2 work',
      ...copy.work.cases.flatMap((c) => [`shot ${c.id}`, `body ${c.id}`]), 'h2 rest',
      ...copy.rest.cards.map((c) => `card ${c.title}`), 'h2 contact', 'p contact', 'mail', 'links', 'door', 'footer',
    ];
    expect(Object.keys(copy.prompts).sort()).toEqual([...names].sort());
    for (const [k, v] of Object.entries(copy.prompts)) { expect(v, k).toBe(v.toLowerCase()); expect(v.length, k).toBeGreaterThan(0); }
  });
});

describe('job and case shape', () => {
  it('has the index sub-line as role and year, and no ordinals', () => {
    for (const j of copy.experience.jobs) expect(j.sub.startsWith(j.role)).toBe(true);
    for (const c of copy.work.cases) expect('no' in c).toBe(false);
  });
});

describe('rest cards', () => {
  it('never lets a separator start a line', () => {
    for (const c of copy.rest.cards) for (const e of c.entries) expect(e.line, e.line).not.toMatch(/[^\u00a0] · /);
  });
});

describe('door', () => {
  it('has an off paragraph and a phone variant', () => {
    expect(copy.closer.door.offParagraphPhone).toBe(copy.closer.door.offParagraph.replace('six', 'three'));
  });
  it('phone paragraph is the first paragraph with six replaced by three', () => {
    expect(copy.closer.door.paragraphPhone).toBe(copy.closer.door.paragraphs[0].replace('six', 'three'));
  });
});
