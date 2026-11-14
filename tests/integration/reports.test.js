import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addProduct, closePool, hasDatabase, migrate, resetDatabase } from '../helpers/db';
import { createBill } from '@/lib/bills';
import { dailyReport, monthlyReport } from '@/lib/reports';
import { query } from '@/lib/db';
import { todayInShop, thisMonthInShop } from '@/lib/dates';

describe.skipIf(!hasDatabase)('sales reports', () => {
  beforeAll(() => migrate());
  afterAll(() => closePool());
  beforeEach(() => resetDatabase());

  it('returns zeros for a day with no sales', async () => {
    const r = await dailyReport('2026-01-01');
    expect(r).toMatchObject({ billCount: 0, totalPaise: 0, itemsSold: 0, averageBillPaise: 0, topProducts: [] });
  });

  it("totals today's bills and finds the best sellers", async () => {
    const sugar = await addProduct({ name: 'Sugar 1 kg', pricePaise: 4600, stock: 50 });
    const salt = await addProduct({ name: 'Salt 1 kg', pricePaise: 2800, stock: 50 });
    await createBill([{ productId: sugar, quantity: 2 }]);
    await createBill([{ productId: sugar, quantity: 1 }, { productId: salt, quantity: 1 }]);

    const r = await dailyReport(todayInShop());
    expect(r.billCount).toBe(2);
    expect(r.totalPaise).toBe(3 * 4600 + 2800);
    expect(r.itemsSold).toBe(4);
    expect(r.averageBillPaise).toBe(Math.round((3 * 4600 + 2800) / 2));
    expect(r.topProducts[0]).toEqual({ name: 'Sugar 1 kg', quantity: 3, totalPaise: 13800 });
  });

  it('groups a month day by day using Indian time', async () => {
    // 19:00 UTC on 31 Oct is 00:30 on 1 Nov in India, so it belongs to November
    await query("INSERT INTO bills (total_paise, item_count, created_at) VALUES (1000, 1, '2026-10-31T19:00:00Z')");
    await query("INSERT INTO bills (total_paise, item_count, created_at) VALUES (2000, 1, '2026-11-02T06:00:00Z')");
    await query("INSERT INTO bills (total_paise, item_count, created_at) VALUES (500, 1, '2026-10-31T10:00:00Z')");

    const nov = await monthlyReport('2026-11');
    expect(nov.totalPaise).toBe(3000);
    expect(nov.byDay).toEqual([
      { date: '2026-11-01', billCount: 1, totalPaise: 1000 },
      { date: '2026-11-02', billCount: 1, totalPaise: 2000 },
    ]);
    expect((await monthlyReport('2026-10')).totalPaise).toBe(500);
  });

  it('rejects badly formatted periods', async () => {
    await expect(dailyReport('yesterday')).rejects.toThrow(/date/);
    await expect(monthlyReport(thisMonthInShop() + '-01')).rejects.toThrow(/month/);
  });
});
