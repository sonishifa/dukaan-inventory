import Link from 'next/link';
import { listBills } from '@/lib/bills';
import { formatRupees } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bills' };

const dateFormat = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

export default async function BillsPage() {
  const bills = await listBills({ limit: 100 });
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bills</h1>
          <p>The 100 most recent bills, newest first.</p>
        </div>
        <Link href="/bills/new" className="btn">New bill</Link>
      </div>
      <div className="panel table-wrap">
        {bills.length === 0 ? (
          <p className="empty">No bills yet. Create one from the New bill page.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Bill</th><th>Date and time</th><th className="num">Items</th><th className="num">Amount</th></tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id}>
                  <td><Link href={`/bills/${b.id}`}>#{b.id}</Link></td>
                  <td>{dateFormat.format(new Date(b.createdAt))}</td>
                  <td className="num">{b.itemCount}</td>
                  <td className="num">{formatRupees(b.totalPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
