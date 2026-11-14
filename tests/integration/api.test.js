// Calls the real Next.js route handlers with Request objects, the same way
// the server does, to check status codes and JSON responses.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addProduct, closePool, hasDatabase, migrate, resetDatabase } from '../helpers/db';
import * as health from '@/app/api/health/route';
import * as products from '@/app/api/products/route';
import * as productById from '@/app/api/products/[id]/route';
import * as lowStock from '@/app/api/products/low-stock/route';
import * as bills from '@/app/api/bills/route';
import * as billById from '@/app/api/bills/[id]/route';
import * as daily from '@/app/api/reports/daily/route';
import * as monthly from '@/app/api/reports/monthly/route';

const url = (path) => `http://localhost${path}`;
const post = (path, body) =>
  new Request(url(path), { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });
const ctx = (id) => ({ params: Promise.resolve({ id: String(id) }) });

describe.skipIf(!hasDatabase)('API routes', () => {
  beforeAll(() => migrate());
  afterAll(() => closePool());
  beforeEach(() => resetDatabase());

  it('GET /api/health reports the app and database as ok', async () => {
    const res = await health.GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ok', database: 'ok' });
  });

  it('POST /api/products creates a product (201) and validates input (400)', async () => {
    const ok = await products.POST(post('/api/products', { name: 'Tea leaves 250 g', price: 140, stock: 9 }));
    expect(ok.status).toBe(201);
    const bad = await products.POST(post('/api/products', { name: 'Tea', price: -5, stock: 1 }));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.code).toBe('VALIDATION_ERROR');
    const list = await (await products.GET()).json();
    expect(list.products).toHaveLength(1);
  });

  it('PUT, GET and DELETE /api/products/:id', async () => {
    const id = await addProduct({ name: 'Bread loaf', pricePaise: 4500, stock: 2 });
    const put = await productById.PUT(new Request(url(`/api/products/${id}`), { method: 'PUT', body: '{"stock": 9}' }), ctx(id));
    expect((await put.json()).product.stock).toBe(9);
    expect((await productById.GET(new Request(url('/x')), ctx(id))).status).toBe(200);
    expect((await productById.DELETE(new Request(url('/x')), ctx(id))).status).toBe(204);
    expect((await productById.GET(new Request(url('/x')), ctx(id))).status).toBe(404);
  });

  it('GET /api/products/low-stock lists products at or below their alert level', async () => {
    await addProduct({ name: 'Bread loaf', pricePaise: 4500, stock: 1, lowStockLimit: 5 });
    await addProduct({ name: 'Sugar 1 kg', pricePaise: 4600, stock: 40, lowStockLimit: 5 });
    const body = await (await lowStock.GET()).json();
    expect(body.products.map((p) => p.name)).toEqual(['Bread loaf']);
  });

  it('POST /api/bills returns 201, then 409 when stock runs out', async () => {
    const id = await addProduct({ name: 'Bread loaf', pricePaise: 4500, stock: 1 });
    const first = await bills.POST(post('/api/bills', { items: [{ productId: id, quantity: 1 }] }));
    expect(first.status).toBe(201);
    const billId = (await first.json()).bill.id;

    const second = await bills.POST(post('/api/bills', { items: [{ productId: id, quantity: 1 }] }));
    expect(second.status).toBe(409);
    expect((await second.json()).error.code).toBe('OUT_OF_STOCK');

    const one = await billById.GET(new Request(url('/x')), ctx(billId));
    expect((await one.json()).bill.totalPaise).toBe(4500);
    const all = await (await bills.GET(new Request(url('/api/bills?limit=10')))).json();
    expect(all.bills).toHaveLength(1);
  });

  it('POST /api/bills rejects invalid JSON and unknown products', async () => {
    expect((await bills.POST(post('/api/bills', '{not json'))).status).toBe(400);
    expect((await bills.POST(post('/api/bills', { items: [{ productId: 999, quantity: 1 }] }))).status).toBe(404);
    expect((await billById.GET(new Request(url('/x')), ctx(12345))).status).toBe(404);
  });

  it('GET report endpoints return totals and reject bad dates', async () => {
    expect((await daily.GET(new Request(url('/api/reports/daily')))).status).toBe(200);
    expect((await monthly.GET(new Request(url('/api/reports/monthly?month=2026-11')))).status).toBe(200);
    expect((await daily.GET(new Request(url('/api/reports/daily?date=tomorrow')))).status).toBe(400);
  });
});
