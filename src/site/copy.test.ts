import { describe, it, expect } from 'vitest';
import { copy } from './copy';
import { facts } from './facts';

function strings(o: unknown, out: string[] = []): string[] {
  if (typeof o === 'string') out.push(o);
  else if (typeof o === 'function') out.push(String((o as (...a: number[]) => string)(9, 1, 12)));
  else if (o && typeof o === 'object') Object.values(o).forEach((v) => strings(v, out));
  return out;
}

describe('copy', () => {
  const all = strings(copy).concat(strings(facts));
  it('never prints the private numbers', () => {
    for (const s of all) {
      // the dollar profit figure, in any spelling
      expect(s, s).not.toMatch(/\$20/i);
      expect(s, s).not.toMatch(/\b20k\b/i);
      expect(s, s).not.toMatch(/\b20,000\b/);
      // the exact leaderboard rank
      expect(s, s).not.toMatch(/#\s?75\b/);
      expect(s, s).not.toMatch(/\b75\b/);
      // notional volume, dollar-denominated or not
      expect(s, s).not.toMatch(/notional/i);
      expect(s, s).not.toMatch(/\$2m\b/i);
    }
  });
  it('prints the public kalshi figures in place of the dollar figure and the exact rank', () => {
    const figures = copy.kalshi.figures.map((fig) => `${fig.value} ${fig.label}`);
    expect(figures).toEqual([
      '30,000 live trades',
      '2M contracts traded',
      'top 100 all-time crypto profit leaderboard',
    ]);
    expect(copy.kalshi.asOf).toBe('as of sept 2026');
    expect(copy.kalshi.status).toBe('live on kalshi since jan 2026');
    expect(copy.kalshi.heading).toContain('top 100');
  });
  it('is lowercase sentences, no title case, no em dash in sentences', () => {
    // figures carry public numbers verbatim (e.g. "2M"), not prose; check their
    // labels only, same as nav/meta being excluded as non-sentence UI data.
    const prose = strings({
      ...copy,
      nav: undefined,
      meta: undefined,
      kalshi: { ...copy.kalshi, figures: copy.kalshi.figures.map((fig) => fig.label) },
    });
    for (const s of prose) {
      if (s.startsWith('fig.')) continue;                  // plates use the figure idiom with an em dash
      expect(s, s).toBe(s.toLowerCase().replace(/\bnot-ethan\b/g, 'Not-Ethan'));
      expect(s, s).not.toContain('—');
    }
  });
  it('carries the thesis verbatim', () => {
    expect(copy.sentence.headline).toBe('now is the best time in history to build things.');
    expect(copy.sentence.headline.split(' ')).toHaveLength(10);
  });
});
