import { execFileSync } from 'node:child_process';
import { query, closePool } from '@/lib/db';

export const hasDatabase = Boolean(process.env.DATABASE_URL);

export function migrate() {
  execFileSync('node', ['scripts/migrate.js'], { stdio: 'inherit', env: process.env });
}

export async function resetDatabase() {
  await query('TRUNCATE bill_items, bills, products RESTART IDENTITY CASCADE');
}

export async function addProduct({ name, pricePaise, stock, lowStockLimit = 5 }) {
  const { rows } = await query(
    'INSERT INTO products (name, price_paise, stock, low_stock_limit) VALUES ($1, $2, $3, $4) RETURNING id',
    [name, pricePaise, stock, lowStockLimit],
  );
  return rows[0].id;
}

export async function stockOf(id) {
  const { rows } = await query('SELECT stock FROM products WHERE id = $1', [id]);
  return rows[0].stock;
}

export { closePool };
