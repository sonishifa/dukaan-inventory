'use client';

import { useEffect, useState } from 'react';
import { formatRupees } from '@/lib/money';
import { thisMonthInShop, todayInShop } from '@/lib/dates';

const dayLabel = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', weekday: 'short', timeZone: 'UTC' });

export default function Reports() {
  const [period, setPeriod] = useState('daily');
  const [date, setDate] = useState(() => todayInShop());
  const [month, setMonth] = useState(() => thisMonthInShop());
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    const url = period === 'daily' ? `/api/reports/daily?date=${date}` : `/api/reports/monthly?month=${month}`;
    fetch(url, { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (ignore) return;
        if (!res.ok) throw new Error(data.error?.message ?? 'Could not load the report');
        setError(null);
        setReport(data.report);
      })
      .catch((err) => !ignore && setError(err.message));
    return () => {
      ignore = true;
    };
  }, [period, date, month]);

  const maxDay = Math.max(1, ...(report?.byDay ?? []).map((d) => d.totalPaise));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Sales reports</h1>
          <p>Totals are worked out in Indian Standard Time.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="segmented" role="group" aria-label="Report period">
            <button type="button" aria-pressed={period === 'daily'} onClick={() => setPeriod('daily')}>Daily</button>
            <button type="button" aria-pressed={period === 'monthly'} onClick={() => setPeriod('monthly')}>Monthly</button>
          </div>
          {period === 'daily' ? (
            <input type="date" aria-label="Day" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          ) : (
            <input type="month" aria-label="Month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          )}
        </div>
      </div>

      {error ? <div className="notice notice-error" role="alert">{error}</div> : null}

      {report ? (
        <div className="stack">
          <section className="panel">
            <p className="headline">
              {report.billCount === 0
                ? 'No sales in this period.'
                : `${formatRupees(report.totalPaise)} from ${report.billCount} ${report.billCount === 1 ? 'bill' : 'bills'}`}
            </p>
            {report.billCount > 0 ? (
              <div className="facts">
                <span><b>{report.itemsSold}</b> items sold</span>
                <span>Average bill <b>{formatRupees(report.averageBillPaise)}</b></span>
              </div>
            ) : null}

            {report.topProducts.length > 0 ? (
              <>
                <h2>Best sellers</h2>
                <table>
                  <thead>
                    <tr><th>Product</th><th className="num">Quantity</th><th className="num">Sales</th></tr>
                  </thead>
                  <tbody>
                    {report.topProducts.map((p) => (
                      <tr key={p.name}>
                        <td>{p.name}</td>
                        <td className="num">{p.quantity}</td>
                        <td className="num">{formatRupees(p.totalPaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : null}
          </section>

          {period === 'monthly' && report.byDay?.length > 0 ? (
            <section className="panel table-wrap">
              <h2>Day by day</h2>
              <table>
                <thead>
                  <tr><th>Day</th><th className="num">Bills</th><th className="num">Sales</th><th style={{ width: '40%' }}><span className="sr-only">Share</span></th></tr>
                </thead>
                <tbody>
                  {report.byDay.map((d) => (
                    <tr key={d.date}>
                      <td>{dayLabel.format(new Date(`${d.date}T00:00:00Z`))}</td>
                      <td className="num">{d.billCount}</td>
                      <td className="num">{formatRupees(d.totalPaise)}</td>
                      <td><div className="bar" style={{ width: `${(d.totalPaise / maxDay) * 100}%` }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </div>
      ) : !error ? (
        <p className="muted">Loading report…</p>
      ) : null}
    </>
  );
}
