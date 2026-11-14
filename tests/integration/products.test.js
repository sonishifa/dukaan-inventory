import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closePool, hasDatabase, migrate, resetDatabase } from '../helpers/db';
import { createProduct, getProduct, listLowStock, listProducts, removeProduct, updateProduct } from '@/lib/products';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';

describe.skipIf(!hasDatabase)('products with a real database', () => {
  beforeAll(() => migrate());
  afterAll(() => closePool());
  beforeEach(() => resetDatabase());

  it('creates and lists products', async () => {
    const p = await createProduct({ name: 'Toor dal 1 kg', price: 160, stock: 12 });
    expect(p).toMatchObject({ name: 'Toor dal 1 kg', pricePaise: 16000, stock: 12, lowStockLimit: 5, isLowStock: false });
    expect(await listProducts()).toHaveLength(1);
  });

  it('refuses duplicate names', async () => {
    await createProduct({ name: 'Sugar 1 kg', price: 46, stock: 1 });
    await expect(createProduct({ name: 'Sugar 1 kg', price: 50, stock: 2 })).rejects.toBeInstanceOf(ConflictError);
  });

  it('updates only the fields sent', async () => {
    const p = await createProduct({ name: 'Bread loaf', price: 45, stock: 2 });
    const updated = await updateProduct(p.id, { stock: 20 });
    expect(updated).toMatchObject({ name: 'Bread loaf', pricePaise: 4500, stock: 20 });
  });

  it('detects low-stock products', async () => {
    await createProduct({ name: 'Bread loaf', price: 45, stock: 2, lowStockLimit: 5 });
    await createProduct({ name: 'Sugar 1 kg', price: 46, stock: 30, lowStockLimit: 5 });
    const low = await listLowStock();
    expect(low.map((p) => p.name)).toEqual(['Bread loaf']);
  });

  it('removes a product from the shop and frees its name', async () => {
    const p = await createProduct({ name: 'Eggs (6 pack)', price: 48, stock: 3 });
    await removeProduct(p.id);
    expect(await listProducts()).toHaveLength(0);
    await expect(getProduct(p.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(createProduct({ name: 'Eggs (6 pack)', price: 50, stock: 5 })).resolves.toBeTruthy();
  });

  it('reports missing products and bad ids', async () => {
    await expect(updateProduct(999, { stock: 1 })).rejects.toBeInstanceOf(NotFoundError);
    await expect(removeProduct(999)).rejects.toBeInstanceOf(NotFoundError);
    await expect(getProduct('abc')).rejects.toBeInstanceOf(ValidationError);
  });
});
