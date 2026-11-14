'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatRupees } from '@/lib/money';

const EMPTY = { name: '', price: '', stock: '', lowStockLimit: '5' };

async function api(url, options) {
  const res = await fetch(url, { cache: 'no-store', ...options, headers: { 'Content-Type': 'application/json' } });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? 'Request failed');
  return data;
}

export default function ProductsManager() {
  const [products, setProducts] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null); // { id, name, price, stock, lowStockLimit }
  const [lowOnly, setLowOnly] = useState(false);
  const [message, setMessage] = useState(null); // { kind: 'ok' | 'error', text }

  const refresh = useCallback(async () => {
    const data = await api('/api/products');
    setProducts(data.products);
  }, []);

  useEffect(() => {
    api('/api/products')
      .then((data) => setProducts(data.products))
      .catch((err) => setMessage({ kind: 'error', text: err.message }));
  }, []);

  async function addProduct(e) {
    e.preventDefault();
    try {
      const data = await api('/api/products', { method: 'POST', body: JSON.stringify(form) });
      setForm(EMPTY);
      setMessage({ kind: 'ok', text: `Added ${data.product.name}.` });
      await refresh();
    } catch (err) {
      setMessage({ kind: 'error', text: err.message });
    }
  }

  async function saveEdit() {
    try {
      const { id, ...fields } = editing;
      const data = await api(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(fields) });
      setEditing(null);
      setMessage({ kind: 'ok', text: `Saved ${data.product.name}.` });
      await refresh();
    } catch (err) {
      setMessage({ kind: 'error', text: err.message });
    }
  }

  async function remove(product) {
    if (!window.confirm(`Remove ${product.name}? Old bills keep their record of it.`)) return;
    try {
      await api(`/api/products/${product.id}`, { method: 'DELETE' });
      setMessage({ kind: 'ok', text: `Removed ${product.name}.` });
      await refresh();
    } catch (err) {
      setMessage({ kind: 'error', text: err.message });
    }
  }

  const shown = (products ?? []).filter((p) => !lowOnly || p.isLowStock);
  const lowCount = (products ?? []).filter((p) => p.isLowStock).length;
  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });
  const editField = (key) => ({ value: editing[key], onChange: (e) => setEditing({ ...editing, [key]: e.target.value }) });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Products</h1>
          <p>Prices and stock here are what every bill uses.</p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 400 }}>
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          Show only running low ({lowCount})
        </label>
      </div>

      {message ? (
        <div className={`notice ${message.kind === 'ok' ? 'notice-ok' : 'notice-error'}`} role="status">
          {message.text}
        </div>
      ) : null}

      <form className="panel form-row" onSubmit={addProduct} style={{ marginBottom: '1.25rem' }}>
        <label>Name<input required {...field('name')} placeholder="Sugar 1 kg" /></label>
        <label>Price (₹)<input required inputMode="decimal" {...field('price')} placeholder="46" /></label>
        <label>Stock<input required inputMode="numeric" {...field('stock')} placeholder="30" /></label>
        <label>Alert below<input inputMode="numeric" {...field('lowStockLimit')} /></label>
        <button type="submit" className="btn">Add product</button>
      </form>

      <div className="panel table-wrap">
        {products === null ? (
          <p className="muted">Loading products…</p>
        ) : shown.length === 0 ? (
          <p className="empty">{lowOnly ? 'Nothing is running low.' : 'No products yet. Add your first product above.'}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th className="num">Price</th>
                <th className="num">Stock</th>
                <th className="num">Alert at</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) =>
                editing?.id === p.id ? (
                  <tr key={p.id}>
                    <td><input aria-label="Name" {...editField('name')} /></td>
                    <td className="num"><input aria-label="Price in rupees" inputMode="decimal" size={6} {...editField('price')} /></td>
                    <td className="num"><input aria-label="Stock" inputMode="numeric" size={4} {...editField('stock')} /></td>
                    <td className="num"><input aria-label="Alert at" inputMode="numeric" size={3} {...editField('lowStockLimit')} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn-small" onClick={saveEdit}>Save</button>{' '}
                      <button type="button" className="btn btn-small btn-quiet" onClick={() => setEditing(null)}>Cancel</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="num">{formatRupees(p.pricePaise)}</td>
                    <td className="num">
                      {p.stock === 0 ? (
                        <span className="tag tag-out">Out of stock</span>
                      ) : p.isLowStock ? (
                        <span className="tag tag-low">{p.stock} left</span>
                      ) : (
                        p.stock
                      )}
                    </td>
                    <td className="num">{p.lowStockLimit}</td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-small btn-quiet"
                        onClick={() =>
                          setEditing({
                            id: p.id,
                            name: p.name,
                            price: String(p.pricePaise / 100),
                            stock: String(p.stock),
                            lowStockLimit: String(p.lowStockLimit),
                          })
                        }
                      >
                        Edit
                      </button>
                      <button type="button" className="btn btn-small btn-danger" onClick={() => remove(p)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
