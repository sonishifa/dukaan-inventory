import { createBill, listBills } from '@/lib/bills';
import { handle, json, readJson } from '@/lib/http';

export async function GET(request) {
  return handle(async () => {
    const limit = new URL(request.url).searchParams.get('limit') ?? 50;
    return json({ bills: await listBills({ limit }) });
  });
}

// Body: { "items": [ { "productId": 3, "quantity": 2 }, ... ] }
export async function POST(request) {
  return handle(async () => {
    const body = await readJson(request);
    return json({ bill: await createBill(body?.items) }, 201);
  });
}
