import Link from 'next/link';
import { dailyReport } from '@/lib/reports';
import { listLowStock } from '@/lib/products';
import { listBills } from '@/lib/bills';
import { todayInShop } from '@/lib/dates';
import { formatRupees } from '@/lib/money';

export const dynamic = 'force-dynamic';

const timeFormat = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', timeStyle: 'short' });

export default async function TodayPage() {
  const [report, lowStock, recent] = await Promise.all([
    dailyReport(todayInShop()),
    listLowStock(),
    listBills({ limit: 6 }),
  ]);

  return (
    <>
      {report.billCount > 0 ? (
        <>
          <p className="headline">
            {formatRupees(report.totalPaise)} sold today across {report.billCount}{' '}
            {report.billCount === 1 ? 'bill' : 'bills'}.
          </p>
          <p className="headline-sub">
            {report.itemsSold} items sold, average bill {formatRupees(report.averageBillPaise)}.
          </p>
        </>
      ) : (
        <>
          <p className="headline">No bills yet today.</p>
          <p className="headline-sub">
            <Link href="/bills/new" className="btn">Create the first bill</Link>
          </p>
        </>
      )}

      <div className="split">
        <section className="panel" aria-labelledby="low-stock">
          <h2 id="low-stock">Running low</h2>
          {lowStock.length === 0 ? (
            <p className="muted">Every product is above its alert level.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Product</th><th className="num">In stock</th><th className="num">Alert at</th></tr>
                </thead>
                <tbody>
                  {lowStock.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td className="num">
                        <span className={p.stock === 0 ? 'tag tag-out' : 'tag tag-low'}>
                          {p.stock === 0 ? 'Out of stock' : p.stock}
                        </span>
                      </td>
                      <td className="num">{p.lowStockLimit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ marginTop: '1rem', marginBottom: 0 }}><Link href="/products">Update stock</Link></p>
        </section>

        <section className="panel" aria-labelledby="recent">
          <h2 id="recent">Latest bills</h2>
          {recent.length === 0 ? (
            <p className="muted">Bills you create will appear here.</p>
          ) : (
            <table>
              <tbody>
                {recent.map((b) => (
                  <tr key={b.id}>
                    <td><Link href={`/bills/${b.id}`}>Bill #{b.id}</Link></td>
                    <td className="muted">{timeFormat.format(new Date(b.createdAt))}</td>
                    <td className="num">{formatRupees(b.totalPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
