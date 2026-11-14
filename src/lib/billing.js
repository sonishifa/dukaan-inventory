// Pure business rules. No database access here, so every rule can be unit tested.
import { ValidationError } from './errors.js';
import { toPaise } from './money.js';

export const MAX_QUANTITY_PER_LINE = 1000;

function isPositiveInt(n) {
  return Number.isInteger(n) && n > 0;
}

/**
 * Validates bill items and merges duplicate products.
 * Returns lines sorted by productId so that concurrent bills always lock
 * product rows in the same order (avoids deadlocks).
 */
export function normaliseItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('A bill needs at least one item');
  }
  const merged = new Map();
  for (const item of items) {
    const productId = Number(item?.productId);
    const quantity = Number(item?.quantity);
    if (!isPositiveInt(productId)) {
      throw new ValidationError('Each item needs a valid productId');
    }
    if (!isPositiveInt(quantity)) {
      throw new ValidationError('Quantity must be a whole number greater than 0');
    }
    const total = (merged.get(productId) ?? 0) + quantity;
    if (total > MAX_QUANTITY_PER_LINE) {
      throw new ValidationError(`Quantity for one product cannot exceed ${MAX_QUANTITY_PER_LINE}`);
    }
    merged.set(productId, total);
  }
  return [...merged.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([productId, quantity]) => ({ productId, quantity }));
}

/**
 * lines: [{ productId, name, unitPricePaise, quantity }]
 * Returns the lines with lineTotalPaise plus the bill total and item count.
 */
export function calculateBill(lines) {
  const priced = lines.map((line) => ({
    ...line,
    lineTotalPaise: line.unitPricePaise * line.quantity,
  }));
  return {
    lines: priced,
    totalPaise: priced.reduce((sum, l) => sum + l.lineTotalPaise, 0),
    itemCount: priced.reduce((sum, l) => sum + l.quantity, 0),
  };
}

export function isLowStock(product) {
  return product.stock <= product.lowStockLimit;
}

function toNonNegativeInt(value, field) {
  const n = typeof value === 'string' ? Number(value.trim()) : value;
  if (!Number.isInteger(n) || n < 0) {
    throw new ValidationError(`${field} must be a whole number of 0 or more`);
  }
  return n;
}

/**
 * Validates product input coming from the API.
 * partial = true allows updating only some fields (PATCH-like PUT).
 */
export function validateProductInput(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Product details are missing');
  }
  const out = {};
  if (!partial || input.name !== undefined) {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (name.length < 2 || name.length > 80) {
      throw new ValidationError('Name must be between 2 and 80 characters');
    }
    out.name = name;
  }
  if (!partial || input.price !== undefined) {
    out.pricePaise = toPaise(input.price, 'Price');
    if (out.pricePaise === 0) throw new ValidationError('Price must be greater than 0');
  }
  if (!partial || input.stock !== undefined) {
    out.stock = toNonNegativeInt(input.stock, 'Stock');
  }
  if (input.lowStockLimit !== undefined && input.lowStockLimit !== '') {
    out.lowStockLimit = toNonNegativeInt(input.lowStockLimit, 'Low-stock limit');
  } else if (!partial) {
    out.lowStockLimit = 5;
  }
  if (partial && Object.keys(out).length === 0) {
    throw new ValidationError('Nothing to update');
  }
  return out;
}
