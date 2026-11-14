import { query, withTransaction } from './db.js';
import { NotFoundError, OutOfStockError, ValidationError } from './errors.js';
import { calculateBill, normaliseItems } from './billing.js';

/**
 * Creates a bill and reduces stock in ONE database transaction.
 *
 * Stock is reduced with a conditional update:
 *   UPDATE products SET stock = stock - qty WHERE id = ? AND stock >= qty
 * If two bills race for the last unit, PostgreSQL locks the row for the first
 * update; the second one re-checks "stock >= qty", finds it false and updates
 * nothing. So stock can never go below zero, and the losing bill is rejected.
 * If any line is short, the whole bill is rolled back (all or nothing).
 */
export async function createBill(items) {
  const lines = normaliseItems(items);

  return withTransaction(async (client) => {
    const sold = [];
    const shortages = [];

    for (const { productId, quantity } of lines) {
      const updated = await client.query(
        `UPDATE products
            SET stock = stock - $2, updated_at = now()
          WHERE id = $1 AND active AND stock >= $2
          RETURNING id, name, price_paise`,
        [productId, quantity],
      );
      if (updated.rowCount === 1) {
        const p = updated.rows[0];
        sold.push({ productId: p.id, name: p.name, unitPricePaise: p.price_paise, quantity });
        continue;
      }
      const existing = await client.query('SELECT name, stock FROM products WHERE id = $1 AND active', [productId]);
      if (existing.rowCount === 0) throw new NotFoundError(`Product ${productId} not found`);
      shortages.push({
        productId,
        name: existing.rows[0].name,
        requested: quantity,
        available: existing.rows[0].stock,
      });
    }

    if (shortages.length > 0) throw new OutOfStockError(shortages);

    const bill = calculateBill(sold);
    const inserted = await client.query(
      'INSERT INTO bills (total_paise, item_count) VALUES ($1, $2) RETURNING id, created_at',
      [bill.totalPaise, bill.itemCount],
    );
    const { id, created_at: createdAt } = inserted.rows[0];

    for (const line of bill.lines) {
      await client.query(
        `INSERT INTO bill_items (bill_id, product_id, product_name, unit_price_paise, quantity, line_total_paise)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, line.productId, line.name, line.unitPricePaise, line.quantity, line.lineTotalPaise],
      );
    }

    return { id, createdAt, totalPaise: bill.totalPaise, itemCount: bill.itemCount, items: bill.lines };
  });
}

export async function getBill(id) {
  const billId = Number(id);
  if (!Number.isInteger(billId) || billId <= 0) throw new ValidationError('Invalid bill id');
  const bill = await query('SELECT id, total_paise, item_count, created_at FROM bills WHERE id = $1', [billId]);
  if (bill.rowCount === 0) throw new NotFoundError('Bill not found');
  const items = await query(
    `SELECT product_id, product_name, unit_price_paise, quantity, line_total_paise
       FROM bill_items WHERE bill_id = $1 ORDER BY id`,
    [billId],
  );
  const b = bill.rows[0];
  return {
    id: b.id,
    totalPaise: b.total_paise,
    itemCount: b.item_count,
    createdAt: b.created_at,
    items: items.rows.map((r) => ({
      productId: r.product_id,
      name: r.product_name,
      unitPricePaise: r.unit_price_paise,
      quantity: r.quantity,
      lineTotalPaise: r.line_total_paise,
    })),
  };
}

export async function listBills({ limit = 50 } = {}) {
  const n = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const { rows } = await query(
    'SELECT id, total_paise, item_count, created_at FROM bills ORDER BY created_at DESC, id DESC LIMIT $1',
    [n],
  );
  return rows.map((b) => ({ id: b.id, totalPaise: b.total_paise, itemCount: b.item_count, createdAt: b.created_at }));
}
