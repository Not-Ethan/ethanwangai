import { describe, it, expect } from 'vitest';
import { figureTokens } from './figureTokens';

describe('figureTokens', () => {
  it('marks hyphenated tokens nowrap and leaves the words intact', () => {
    expect(figureTokens('top 100 all-time, crypto')).toEqual([
      { text: 'top', nowrap: false }, { text: '100', nowrap: false }, { text: 'all-time,', nowrap: true }, { text: 'crypto', nowrap: false },
    ]);
  });
  it('round-trips the text', () => {
    const s = 'about $100m of claims a year';
    expect(figureTokens(s).map((t) => t.text).join(' ')).toBe(s);
  });
  it('drops nothing but empty runs', () => {
    expect(figureTokens('  a  b ')).toEqual([{ text: 'a', nowrap: false }, { text: 'b', nowrap: false }]);
  });
});
