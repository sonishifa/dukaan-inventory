import { describe, expect, it } from 'vitest';
import { calculateBill, isLowStock, normaliseItems, validateProductInput, MAX_QUANTITY_PER_LINE } from '@/lib/billing';
import { ValidationError } from '@/lib/errors';

describe('calculateBill', () => {
  it('multiplies price by quantity and adds the lines', () => {
    const bill = calculateBill([
      { productId: 1, name: 'Sugar 1 kg', unitPricePaise: 4600, quantity: 2 },
      { productId: 2, name: 'Bread loaf', unitPricePaise: 4500, quantity: 1 },
    ]);
    expect(bill.lines[0].lineTotalPaise).toBe(9200);
    expect(bill.totalPaise).toBe(13700);
    expect(bill.itemCount).toBe(3);
  });

  it('keeps paise exact for awkward prices', () => {
    const bill = calculateBill([{ productId: 1, name: 'x', unitPricePaise: 1999, quantity: 3 }]);
    expect(bill.totalPaise).toBe(5997);
  });

  it('returns zero for an empty list', () => {
    expect(calculateBill([])).toEqual({ lines: [], totalPaise: 0, itemCount: 0 });
  });
});

describe('normaliseItems', () => {
  it('merges the same product added twice and sorts by id', () => {
    expect(
      normaliseItems([
        { productId: 5, quantity: 1 },
        { productId: 2, quantity: 3 },
        { productId: 5, quantity: 2 },
      ]),
    ).toEqual([
      { productId: 2, quantity: 3 },
      { productId: 5, quantity: 3 },
    ]);
  });

  it.each([
    ['no items', []],
    ['not an array', 'abc'],
    ['zero quantity', [{ productId: 1, quantity: 0 }]],
    ['negative quantity', [{ productId: 1, quantity: -2 }]],
    ['fractional quantity', [{ productId: 1, quantity: 1.5 }]],
    ['missing product id', [{ quantity: 1 }]],
    ['too many of one product', [{ productId: 1, quantity: MAX_QUANTITY_PER_LINE + 1 }]],
  ])('rejects %s', (_label, items) => {
    expect(() => normaliseItems(items)).toThrow(ValidationError);
  });
});

describe('isLowStock', () => {
  it('flags stock at or below the alert level', () => {
    expect(isLowStock({ stock: 5, lowStockLimit: 5 })).toBe(true);
    expect(isLowStock({ stock: 0, lowStockLimit: 5 })).toBe(true);
    expect(isLowStock({ stock: 6, lowStockLimit: 5 })).toBe(false);
  });
});

describe('validateProductInput', () => {
  it('cleans valid input and converts the price to paise', () => {
    expect(validateProductInput({ name: '  Sugar 1 kg ', price: '46', stock: '30' })).toEqual({
      name: 'Sugar 1 kg',
      pricePaise: 4600,
      stock: 30,
      lowStockLimit: 5,
    });
  });

  it('rejects bad values', () => {
    expect(() => validateProductInput({ name: 'A', price: 10, stock: 1 })).toThrow(/Name/);
    expect(() => validateProductInput({ name: 'Rice', price: 0, stock: 1 })).toThrow(/greater than 0/);
    expect(() => validateProductInput({ name: 'Rice', price: 10, stock: -1 })).toThrow(/Stock/);
    expect(() => validateProductInput({ name: 'Rice', price: 10, stock: 2.5 })).toThrow(/Stock/);
    expect(() => validateProductInput(null)).toThrow(ValidationError);
  });

  it('allows partial updates but not empty ones', () => {
    expect(validateProductInput({ stock: 12 }, { partial: true })).toEqual({ stock: 12 });
    expect(() => validateProductInput({}, { partial: true })).toThrow(/Nothing to update/);
  });
});
