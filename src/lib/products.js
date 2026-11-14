import { query } from './db.js';
import { ConflictError, NotFoundError, ValidationError } from './errors.js';
import { validateProductInput } from './billing.js';

const COLUMNS = 'id, name, price_paise, stock, low_stock_limit, created_at, updated_at';

export function toProduct(row) {
  return {
    id: row.id,
    name: row.name,
    pricePaise: row.price_paise,
    stock: row.stock,
    lowStockLimit: row.low_stock_limit,
    isLowStock: row.stock <= row.low_stock_limit,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseId(id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new ValidationError('Invalid product id');
  return n;
}

function mapDbError(err) {
  if (err.code === '23505') return new ConflictError('A product with this name already exists');
  if (err.code === '23514') return new ValidationError('Stock and price cannot be negative');
  return err;
}

export async function listProducts() {
  const { rows } = await query(`SELECT ${COLUMNS} FROM products WHERE active ORDER BY name`);
  return rows.map(toProduct);
}

export async function listLowStock() {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM products WHERE active AND stock <= low_stock_limit ORDER BY stock, name`,
  );
  return rows.map(toProduct);
}

export async function getProduct(id) {
  const { rows } = await query(`SELECT ${COLUMNS} FROM products WHERE id = $1 AND active`, [parseId(id)]);
  if (rows.length === 0) throw new NotFoundError('Product not found');
  return toProduct(rows[0]);
}

export async function createProduct(input) {
  const p = validateProductInput(input);
  try {
    const { rows } = await query(
      `INSERT INTO products (name, price_paise, stock, low_stock_limit)
       VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
      [p.name, p.pricePaise, p.stock, p.lowStockLimit],
    );
    return toProduct(rows[0]);
  } catch (err) {
    throw mapDbError(err);
  }
}

export async function updateProduct(id, input) {
  const p = validateProductInput(input, { partial: true });
  const fields = { name: p.name, price_paise: p.pricePaise, stock: p.stock, low_stock_limit: p.lowStockLimit };
  const sets = [];
  const values = [];
  for (const [column, value] of Object.entries(fields)) {
    if (value !== undefined) {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    }
  }
  values.push(parseId(id));
  try {
    const { rows } = await query(
      `UPDATE products SET ${sets.join(', ')}, updated_at = now()
       WHERE id = $${values.length} AND active RETURNING ${COLUMNS}`,
      values,
    );
    if (rows.length === 0) throw new NotFoundError('Product not found');
    return toProduct(rows[0]);
  } catch (err) {
    throw mapDbError(err);
  }
}

// Products are never hard-deleted because old bills still refer to them.
// "Removing" a product hides it from the shop and frees its name for reuse.
export async function removeProduct(id) {
  const { rowCount } = await query(
    `UPDATE products SET active = false, name = name || ' [removed ' || id || ']', updated_at = now()
     WHERE id = $1 AND active`,
    [parseId(id)],
  );
  if (rowCount === 0) throw new NotFoundError('Product not found');
}
