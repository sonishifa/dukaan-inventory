import { formatRupees } from '@/lib/money';

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  dateStyle: 'medium',
  timeStyle: 'short',
});

/**
 * A bill drawn as a thermal-paper receipt. Used for the live preview on the
 * New bill page (draft) and for saved bills. renderControls lets the draft
 * show quantity buttons under each line.
 */
export default function Receipt({ billId, createdAt, items, totalPaise, itemCount, renderControls }) {
  return (
    <article className="receipt" aria-label={billId ? `Bill ${billId}` : 'Bill preview'}>
      <div className="receipt-shop">Dukaan General Store</div>
      <div className="receipt-meta">
        {billId ? `Bill #${billId}` : 'New bill'}
        {createdAt ? <><br />{dateFormat.format(new Date(createdAt))}</> : null}
      </div>
      <hr className="receipt-rule" />
      {items.length === 0 ? (
        <p className="receipt-empty">Pick products on the left to start the bill.</p>
      ) : (
        items.map((item) => (
          <div className="receipt-line" key={item.productId}>
            <div>
              {item.name}
              <div className="qty">
                {item.quantity} × {formatRupees(item.unitPricePaise)}
              </div>
            </div>
            <div className="amt">{formatRupees(item.unitPricePaise * item.quantity)}</div>
            {renderControls ? <div className="receipt-controls">{renderControls(item)}</div> : null}
          </div>
        ))
      )}
      <hr className="receipt-rule" />
      <div className="receipt-total">
        <span>Total</span>
        <span>{formatRupees(totalPaise)}</span>
      </div>
      <div className="receipt-foot">
        {itemCount} {itemCount === 1 ? 'item' : 'items'}
        {billId ? <><br />Thank you, visit again</> : null}
      </div>
    </article>
  );
}
