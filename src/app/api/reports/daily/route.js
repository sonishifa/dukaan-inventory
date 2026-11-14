import { dailyReport } from '@/lib/reports';
import { todayInShop } from '@/lib/dates';
import { handle, json } from '@/lib/http';

// GET /api/reports/daily?date=2026-11-05  (defaults to today in IST)
export async function GET(request) {
  return handle(async () => {
    const date = new URL(request.url).searchParams.get('date') || todayInShop();
    return json({ report: await dailyReport(date) });
  });
}
