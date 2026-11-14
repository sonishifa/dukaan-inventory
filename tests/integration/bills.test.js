import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addProduct, closePool, hasDatabase, migrate, resetDatabase, stockOf } from '../helpers/db';
import { createBill, getBill, listBills } from '@/lib/bills';
import { query } from '@/lib/db';
import { OutOfStockError } from '@/lib/errors';

describe.skipIf(!hasDatabase)('billing with a real database', () => {
  let sugar;
  let bread;

  beforeAll(() => migrate());
  afterAll(() => closePool());
  beforeEach(async () => {
    await resetDatabase();
    sugar = await addProduct({ name: 'Sugar 1 kg', pricePaise: 4600, stock: 10 });
    bread = await addProduct({ name: 'Bread loaf', pricePaise: 4500, stock: 1 });
  });

  it('saves the bill with the correct total', async () => {
    const bill = await createBill([
      { productId: sugar, quantity: 3 },
      { productId: bread, quantity: 1 },
    ]);
    expect(bill.totalPaise).toBe(3 * 4600 + 4500);
    expect(bill.itemCount).toBe(4);

    const saved = await getBill(bill.id);
    expect(saved.items).toHaveLength(2);
    expect(saved.totalPaise).toBe(18300);
  });

  it('reduces stock after every bill', async () => {
    await createBill([{ productId: sugar, quantity: 3 }]);
    await createBill([{ productId: sugar, quantity: 2 }]);
    expect(await stockOf(sugar)).toBe(5);
  });

  it('rejects a bill when there is not enough stock and changes nothing', async () => {
    await expect(createBill([{ productId: sugar, quantity: 11 }])).rejects.toBeInstanceOf(OutOfStockError);
    expect(await stockOf(sugar)).toBe(10);
    expect(await listBills()).toHaveLength(0);
  });

  it('rolls back the whole bill if only one line is short', async () => {
    const err = await createBill([
      { productId: sugar, quantity: 2 },
      { productId: bread, quantity: 5 },
    ]).catch((e) => e);
    expect(err).toBeInstanceOf(OutOfStockError);
    expect(err.details).toEqual([{ productId: bread, name: 'Bread loaf', requested: 5, available: 1 }]);
    expect(await stockOf(sugar)).toBe(10); // sugar line was undone too
  });

  it('sells the last unit only once when two bills race for it', async () => {
    const results = await Promise.allSettled([
      createBill([{ productId: bread, quantity: 1 }]),
      createBill([{ productId: bread, quantity: 1 }]),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(failed[0].reason).toBeInstanceOf(OutOfStockError);
    expect(await stockOf(bread)).toBe(0);
  });

  it('never lets stock go below zero, even with a direct database update', async () => {
    await expect(query('UPDATE products SET stock = -1 WHERE id = $1', [bread])).rejects.toThrow(/check constraint/);
  });

  it('keeps the price used at billing time even if the price changes later', async () => {
    const bill = await createBill([{ productId: sugar, quantity: 1 }]);
    await query('UPDATE products SET price_paise = 9900 WHERE id = $1', [sugar]);
    expect((await getBill(bill.id)).items[0].unitPricePaise).toBe(4600);
  });
});
