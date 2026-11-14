import { getBill } from '@/lib/bills';
import { handle, json } from '@/lib/http';

export async function GET(request, { params }) {
  return handle(async () => {
    const { id } = await params;
    return json({ bill: await getBill(id) });
  });
}
