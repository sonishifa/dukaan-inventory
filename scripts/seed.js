#!/usr/bin/env node
// Fills the database with sample products so a preview deployment can be
// tried immediately. Safe to run many times: existing names are skipped.
// Used for local Docker runs and preview deployments, never for production.
const { Client } = require('pg');

const PRODUCTS = [
  // name, price (Rs), stock, low-stock limit
  ['Wheat atta 5 kg', 265, 18, 5],
  ['Basmati rice 1 kg', 120, 25, 5],
  ['Toor dal 1 kg', 160, 12, 4],
  ['Sugar 1 kg', 46, 30, 8],
  ['Iodised salt 1 kg', 28, 40, 10],
  ['Toned milk 500 ml', 28, 6, 10],
  ['Tea leaves 250 g', 140, 9, 3],
  ['Sunflower oil 1 L', 155, 3, 4],
  ['Glucose biscuits', 10, 60, 15],
  ['Bread loaf', 45, 2, 5],
  ['Eggs (6 pack)', 48, 14, 6],
  ['Bathing soap', 38, 22, 6],
  ['Detergent powder 1 kg', 95, 11, 4],
  ['Toothpaste 150 g', 99, 8, 3],
];

async function main() {
  if (process.env.VERCEL_ENV === 'production' || process.env.APP_ENV === 'production') {
    console.log('Refusing to seed a production database.');
    return;
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    let added = 0;
    for (const [name, price, stock, limit] of PRODUCTS) {
      const res = await client.query(
        `INSERT INTO products (name, price_paise, stock, low_stock_limit)
         VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING`,
        [name, Math.round(price * 100), stock, limit],
      );
      added += res.rowCount;
    }
    console.log(`Seed complete: ${added} new product(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
