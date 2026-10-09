import { describe, it, expect } from 'vitest';
import { hashString } from './hash';

describe('hashString (FNV-1a 32-bit)', () => {
  it('matches the published FNV-1a test vectors', () => {
    expect(hashString('')).toBe(0x811c9dc5);
    expect(hashString('a')).toBe(0xe40c292c);
    expect(hashString('foobar')).toBe(0xbf9cf968);
  });
  it('is an unsigned 32-bit integer for every input', () => {
    for (const s of ['', ' ', 'hello world', 'x'.repeat(500), 'é', '🙂']) {
      const h = hashString(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(2 ** 32);
    }
  });
  it('is deterministic and case-sensitive (callers normalise)', () => {
    expect(hashString('a trading algorithm for kalshi')).toBe(hashString('a trading algorithm for kalshi'));
    expect(hashString('A')).not.toBe(hashString('a'));
  });
});
