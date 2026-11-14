import { describe, expect, it } from 'vitest';
import { parseDate, parseMonth, thisMonthInShop, todayInShop } from '@/lib/dates';

describe('shop dates (IST)', () => {
  it('uses Indian time, not UTC', () => {
    // 20:00 UTC on 31 Jan is already 1 Feb, 01:30 in India
    const late = new Date('2026-01-31T20:00:00Z');
    expect(todayInShop(late)).toBe('2026-02-01');
    expect(thisMonthInShop(late)).toBe('2026-02');
  });

  it('validates date and month formats', () => {
    expect(parseDate('2026-11-05')).toBe('2026-11-05');
    expect(() => parseDate('05/11/2026')).toThrow();
    expect(parseMonth('2026-11')).toBe('2026-11');
    expect(() => parseMonth('2026-13')).toThrow();
  });
});
