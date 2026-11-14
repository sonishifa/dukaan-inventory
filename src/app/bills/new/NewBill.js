'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Receipt from '@/components/Receipt';
import { formatRupees } from '@/lib/money';

export default function NewBill() {
  const router = useRouter();
  const [products, setProducts] = useState(null);
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState({}); // productId -> quantity
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function loadProducts() {
    const res = await fetch('/api/products', { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? 'Could not load products');
    setProducts(data.products);
  }

  useEffect(() => {
    let ignore = false;
    fetch('/api/products', { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (ignore) return;
        if (!res.ok) throw new Error(data.error?.message ?? 'Could not load products');
        setProducts(data.products);
      })
      .catch((err) => !ignore && setError({ message: err.message }));
    return () => {
      ignore = true;
    };
  }, []);

  const byId = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products]);

  const lines = Object.entries(quantities)
    .map(([id, quantity]) => {
      const p = byId.get(Number(id));
      return p ? { productId: p.id, name: p.name, unitPricePaise: p.pricePaise, quantity, stock: p.stock } : null;
    })
    .filter(Boolean);
  const totalPaise = lines.reduce((sum, l) => sum + l.unitPricePaise * l.quantity, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  const visible = (products ?? []).filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));

  function setQty(productId, quantity) {
    setError(null);
    setQuantities((q) => {
      const next = { ...q };
      if (quantity <= 0) delete next[productId];
      else next[productId] = quantity;
      return next;
    });
  }

  async function saveBill() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data.error?.message ?? 'The bill was not saved', shortages: data.error?.details });
        if (data.error?.code === 'OUT_OF_STOCK') await loadProducts();
        return;
      }
      router.push(`/bills/${data.bill.id}?saved=1`);
    } catch {
      setError({ message: 'The bill was not saved because the server could not be reached. Try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>New bill</h1>
          <p>Pick products, adjust quantities, then save. Stock updates when the bill is saved.</p>
        </div>
      </div>

      <div className="split">
        <section className="panel picker" aria-label="Products">
          <label>
            Find a product
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type a name, for example atta"
            />
          </label>
          {products === null && !error ? <p className="muted">Loading products…</p> : null}
          {products && visible.length === 0 ? <p className="muted">No product matches “{search}”.</p> : null}
          <div className="picker-list">
            {visible.map((p) => {
              const inBill = quantities[p.id] ?? 0;
              const left = p.stock - inBill;
              return (
                <button
                  type="button"
                  key={p.id}
                  className="pick"
                  disabled={left <= 0}
                  onClick={() => setQty(p.id, inBill + 1)}
                >
                  <strong>{p.name}</strong>
                  <span>
                    {formatRupees(p.pricePaise)}, {p.stock === 0 ? 'out of stock' : `${left} left`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-label="Bill" className="stack">
          {error ? (
            <div className="notice notice-error" role="alert">
              {error.message}
              {Array.isArray(error.shortages) && error.shortages.length > 0 ? (
                <ul>
                  {error.shortages.map((s) => (
                    <li key={s.productId}>
                      {s.name}: asked for {s.requested}, only {s.available} in stock
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <Receipt
            items={lines}
            totalPaise={totalPaise}
            itemCount={itemCount}
            renderControls={(line) => (
              <>
                <button type="button" aria-label={`One less ${line.name}`} onClick={() => setQty(line.productId, line.quantity - 1)}>
                  −
                </button>
                <output aria-live="polite">{line.quantity}</output>
                <button
                  type="button"
                  aria-label={`One more ${line.name}`}
                  disabled={line.quantity >= line.stock}
                  onClick={() => setQty(line.productId, line.quantity + 1)}
                >
                  +
                </button>
                <button type="button" className="remove" onClick={() => setQty(line.productId, 0)}>
                  Remove
                </button>
              </>
            )}
          />
          <button type="button" className="btn btn-block" disabled={lines.length === 0 || saving} onClick={saveBill}>
            {saving ? 'Saving bill…' : `Save bill${lines.length ? ` for ${formatRupees(totalPaise)}` : ''}`}
          </button>
        </section>
      </div>
    </>
  );
}
