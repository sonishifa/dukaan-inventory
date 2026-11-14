import { query } from './db.js';
import { SHOP_TIMEZONE, parseDate, parseMonth } from './dates.js';

const LOCAL_DAY = `(b.created_at AT TIME ZONE '${SHOP_TIMEZONE}')::date`;

async function summary(whereSql, param) {
  const totals = await query(
    `SELECT count(*)::int AS bill_count,
            coalesce(sum(b.total_paise), 0)::bigint AS total_paise,
            coalesce(sum(b.item_count), 0)::bigint AS items_sold
       FROM bills b WHERE ${whereSql}`,
    [param],
  );
  const top = await query(
    `SELECT bi.product_name AS name,
            sum(bi.quantity)::bigint AS quantity,
            sum(bi.line_total_paise)::bigint AS total_paise
       FROM bill_items bi JOIN bills b ON b.id = bi.bill_id
      WHERE ${whereSql}
      GROUP BY bi.product_name
      ORDER BY quantity DESC, name
      LIMIT 5`,
    [param],
  );
  const t = totals.rows[0];
  return {
    billCount: t.bill_count,
    totalPaise: Number(t.total_paise),
    itemsSold: Number(t.items_sold),
    averageBillPaise: t.bill_count ? Math.round(Number(t.total_paise) / t.bill_count) : 0,
    topProducts: top.rows.map((r) => ({ name: r.name, quantity: Number(r.quantity), totalPaise: Number(r.total_paise) })),
  };
}

export async function dailyReport(date) {
  const day = parseDate(date);
  return { date: day, ...(await summary(`${LOCAL_DAY} = $1::date`, day)) };
}

export async function monthlyReport(month) {
  const m = parseMonth(month);
  const where = `to_char(${LOCAL_DAY}, 'YYYY-MM') = $1`;
  const base = await summary(where, m);
  const days = await query(
    `SELECT to_char(${LOCAL_DAY}, 'YYYY-MM-DD') AS day,
            count(*)::int AS bill_count,
            sum(b.total_paise)::bigint AS total_paise
       FROM bills b WHERE ${where}
      GROUP BY 1 ORDER BY 1`,
    [m],
  );
  return {
    month: m,
    ...base,
    byDay: days.rows.map((r) => ({ date: r.day, billCount: r.bill_count, totalPaise: Number(r.total_paise) })),
  };
}
