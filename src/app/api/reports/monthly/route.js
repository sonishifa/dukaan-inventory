import { monthlyReport } from '@/lib/reports';
import { thisMonthInShop } from '@/lib/dates';
import { handle, json } from '@/lib/http';

// GET /api/reports/monthly?month=2026-11  (defaults to this month in IST)
export async function GET(request) {
  return handle(async () => {
    const month = new URL(request.url).searchParams.get('month') || thisMonthInShop();
    return json({ report: await monthlyReport(month) });
  });
}
