import { describe, expect, it } from 'vitest';
import { formatRupees, toPaise } from '@/lib/money';
import { ValidationError } from '@/lib/errors';

describe('toPaise', () => {
  it('converts rupees to whole paise', () => {
    expect(toPaise(45)).toBe(4500);
    expect(toPaise(45.5)).toBe(4550);
    expect(toPaise('19.99')).toBe(1999);
  });

  it('avoids floating-point errors', () => {
    expect(toPaise(0.1 + 0.2)).toBe(30);
    expect(toPaise(1.15)).toBe(115);
  });

  it('rejects negative, non-numeric and over-precise values', () => {
    expect(() => toPaise(-1)).toThrow(ValidationError);
    expect(() => toPaise('abc')).toThrow(ValidationError);
    expect(() => toPaise(undefined)).toThrow(ValidationError);
    expect(() => toPaise(1.234)).toThrow(/2 decimal places/);
  });
});

describe('formatRupees', () => {
  it('formats paise as Indian rupees', () => {
    expect(formatRupees(123456)).toBe('₹1,234.56');
    expect(formatRupees(12345678)).toBe('₹1,23,456.78');
    expect(formatRupees(0)).toBe('₹0.00');
  });
});
