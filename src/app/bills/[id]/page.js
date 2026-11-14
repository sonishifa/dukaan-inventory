import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBill } from '@/lib/bills';
import { NotFoundError, ValidationError } from '@/lib/errors';
import Receipt from '@/components/Receipt';
import PrintButton from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Bill #${id}` };
}

export default async function BillPage({ params, searchParams }) {
  const { id } = await params;
  const { saved } = await searchParams;
  let bill;
  try {
    bill = await getBill(id);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) notFound();
    throw err;
  }

  return (
    <>
      <div className="page-head no-print">
        <div>
          <h1>Bill #{bill.id}</h1>
          <p>{saved ? 'Bill saved and stock updated.' : 'Saved bill.'}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <PrintButton />
          <Link href="/bills/new" className="btn">New bill</Link>
        </div>
      </div>
      <Receipt
        billId={bill.id}
        createdAt={bill.createdAt}
        items={bill.items}
        totalPaise={bill.totalPaise}
        itemCount={bill.itemCount}
      />
    </>
  );
}
