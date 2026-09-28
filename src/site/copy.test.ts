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
      expect(s).not.toMatch(/\$20/i);
      expect(s).not.toMatch(/#\s?75\b/);
      expect(s).not.toMatch(/notional/i);
    }
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
