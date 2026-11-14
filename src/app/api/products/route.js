import { createProduct, listProducts } from '@/lib/products';
import { handle, json, readJson } from '@/lib/http';

export async function GET() {
  return handle(async () => json({ products: await listProducts() }));
}

export async function POST(request) {
  return handle(async () => json({ product: await createProduct(await readJson(request)) }, 201));
}
