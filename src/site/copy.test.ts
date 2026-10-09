import { describe, it, expect } from 'vitest';
import { copy } from './copy';
import { facts } from '@/valley/facts';

/** Every string in copy, with each function called on sample arguments. */
function strings(o: unknown, out: string[] = []): string[] {
  if (typeof o === 'string') out.push(o);
  else if (typeof o === 'function') out.push(String((o as (...a: unknown[]) => string)(12, 812)));
  else if (o && typeof o === 'object') Object.values(o).forEach((v) => strings(v, out));
  return out;
}
const ALL = strings(copy).concat(copy.yours.clock('2.17'), copy.kalshi.counter(12_340));
const withoutUrls = (s: string) => s.replace(/(https?:\/\/|mailto:)\S+/g, '');

describe('copy rules (spec §2, §16)', () => {
  it('has no uppercase letters outside URLs', () => {
    for (const s of ALL) expect(withoutUrls(s), s).toBe(withoutUrls(s).toLowerCase());
  });
  it('never prints a private number', () => {
    for (const s of ALL) {
      expect(s, s).not.toMatch(/\$20/);
      expect(s, s).not.toMatch(/#\s?75/);
      expect(s, s).not.toMatch(/notional/i);
      expect(s, s).not.toMatch(/contracts/i);
    }
  });
  it('has no em dashes and no en dashes', () => {
    for (const s of ALL) expect(s, s).not.toMatch(/[—–]/);
  });
});

describe('copy is the spec §3.1 copy', () => {
  it('meta and nav', () => {
    expect(copy.meta.title).toBe('ethan wang');
    expect(copy.meta.description).toBe('now is the best time in history to build things. everything lit on this page is something i built that people used.');
    expect(copy.nav.home).toBe('ethan wang');
    expect(copy.nav.items.map((i) => i.label).join(` ${copy.nav.separator} `))
      .toBe('kalshi · heron · darch · summers · contact');
    expect(copy.nav.items.map((i) => i.section)).toEqual(['kalshi', 'heron', 'darch', 'summers', 'contact']);
  });
  it('01 open', () => {
    expect(copy.open.headline).toBe('now is the best time in history to build things.');
    expect(copy.open.deck).toBe('everything lit here is something i built that people used.');
    expect(copy.open.scrollCue).toBe('scroll');
    expect(copy.open.labels).toEqual({
      hut: 'discord bots, middle school. my classmates used them.',
      nist: 'nist, summer 2025',
      mill: 'darch, june 2025 to may 2026',
      kalshiLamp: 'kalshi, since jan 2026',
      wvu: 'wvu medicine, summer 2026',
      bars: 'heron, since june 2026',
      hillside: 'things i built, one house each',
    });
    expect(Object.keys(copy.open.labels)).toEqual(['hut', 'nist', 'mill', 'kalshiLamp', 'wvu', 'bars', 'hillside']);
  });
  it('02 kalshi', () => {
    expect(copy.kalshi.heading).toBe('every light on that ridge is a trade my algorithm made.');
    expect(copy.kalshi.figures).toEqual(['about 30,000 trades', 'top 100 all-time, crypto']);
    expect(copy.kalshi.mono).toBe('jan 2026 → oct 2026 · as of oct 2026 · not live');
    expect(copy.kalshi.counter(30_000)).toBe('30,000 trades');
    expect(copy.kalshi.counter(12_340)).toBe('12,340 trades');
  });
  it('03 heron, 04 darch, 05 summers, 06 alive', () => {
    expect(copy.heron.heading).toBe('if the home team wins tonight, your drinks are free.');
    expect(copy.heron.mono).toBe('co-founder · since june 2026 · as of oct 2026');
    expect(copy.darch.heading).toBe('darch made three thousand videos a month. it ended in may 2026.');
    expect(copy.darch.figures).toEqual(['3,000 videos a month', '20 million views a month']);
    expect(copy.darch.mono).toBe('co-founder · june 2025 to may 2026');
    expect(copy.summers.heading).toBe('i spent two summers building things for other people.');
    expect(copy.summers.figures).toEqual(['about $100m of claims a year']);
    expect(copy.summers.mono).toBe('nist, summer 2025 · wvu medicine, summer 2026');
    expect(copy.alive.heading).toBe('a few sentences of plain language turn into thousands of lines of code now.');
    expect(copy.alive.body.endsWith('i never really liked the coding. i liked watching it run.')).toBe(true);
  });
  it('07 yours and the five hillside sentences (§3.2)', () => {
    expect(copy.yours.heading).toBe('type one sentence about something you\'d build.');
    expect(copy.yours.body).toBe('watch it turn into a house with the lights on. yours gets a light too.');
    expect(copy.yours.placeholder).toBe('something you\'d build');
    expect(copy.yours.button).toBe('build');
    expect(copy.yours.maxLength).toBe(140);
    expect(copy.yours.clock('2.17')).toBe('2.17 / 4.40');
    expect(copy.yours.tag(12, 812)).toBe('12 words in · 812 parts out · 4.40 s on the clock');
    expect(copy.yours.tag(24, 1933)).toBe('24 words in · 1,933 parts out · 4.40 s on the clock');
    expect(copy.yours.hint).toBe('it stays in this browser. nothing is sent anywhere.');
    expect(copy.yours.hillside).toEqual([
      'a discord bot for my middle school server',
      'a trading algorithm for kalshi',
      'a pipeline that made three thousand videos a month',
      'a help-desk assistant that reads the docs for you',
      'a pricing model for free-drinks promos at bars',
    ]);
  });
  it('08 contact', () => {
    expect(copy.contact.heading).toBe('it\'s late and i\'m probably up building something.');
    expect(copy.contact.body).toBe('the first light on this page is still the discord bot.');
    expect(copy.contact.links).toEqual([
      { label: 'email', href: 'mailto:ethan.wanq@gmail.com', external: false },
      { label: 'github', href: 'https://github.com/Not-Ethan', external: true },
      { label: 'linkedin', href: 'https://linkedin.com/in/edw173', external: true },
    ]);
    expect(copy.contact.mono).toBe('ethan wang · cleveland · as of oct 2026');
  });
});

describe('figures agree with facts.ts', () => {
  it('prints the facts, not hand-typed numbers that drifted', () => {
    expect(copy.kalshi.figures[0]).toBe(`about ${facts.kalshi.trades.toLocaleString('en-US')} trades`);
    expect(copy.kalshi.figures[1]).toBe(`top ${facts.kalshi.leaderboardTop} all-time, crypto`);
    expect(copy.darch.figures[0]).toBe(`${facts.darch.videosPerMonth.toLocaleString('en-US')} videos a month`);
    expect(copy.darch.figures[1]).toBe(`${facts.darch.viewsPerMonth / 1_000_000} million views a month`);
    expect(copy.summers.figures[0]).toBe(`about $${facts.wvu.claimsPerYearUsd / 1_000_000}m of claims a year`);
    expect(facts.heron.cities).toBe(4);
    expect(copy.heron.body).toContain('four cities');
    expect(copy.kalshi.mono).toContain(`as of ${facts.kalshi.asOf}`);
  });
});
