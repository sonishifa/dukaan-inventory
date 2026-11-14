import { listLowStock } from '@/lib/products';
import { handle, json } from '@/lib/http';

export async function GET() {
  return handle(async () => json({ products: await listLowStock() }));
}
