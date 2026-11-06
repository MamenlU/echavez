import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface AdjustmentProduct {
  id: number;
  name: string;
  stock: number;
  unit?: string;
  category?: string;
  status?: string;
}

interface InventoryAdjustmentPanelProps {
  products: AdjustmentProduct[];
  onAdjusted: () => Promise<void> | void;
  onViewMovements?: () => void;
}

const newRequestId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `adj-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function InventoryAdjustmentPanel({
  products,
  onAdjusted,
  onViewMovements,
}: InventoryAdjustmentPanelProps) {
  const [productId, setProductId] = useState('');
  const [countedStock, setCountedStock] = useState('');
  const [reason, setReason] = useState('Physical stock count');
  const [notes, setNotes] = useState('');
  const [requestId, setRequestId] = useState(newRequestId);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const activeProducts = useMemo(
    () => products.filter((product) => product.status !== 'inactive'),
    [products]
  );

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === productId) || null,
    [products, productId]
  );

  const countedNumber = countedStock.trim() === '' ? null : Number(countedStock);
  const difference =
    selectedProduct && Number.isInteger(countedNumber)
      ? Number(countedNumber) - Number(selectedProduct.stock)
      : null;

  const selectProduct = (value: string) => {
    setProductId(value);
    const product = products.find((entry) => String(entry.id) === value);
    setCountedStock(product ? String(product.stock) : '');
    setStatus('idle');
    setMessage('');
    setRequestId(newRequestId());
  };

  const submitAdjustment = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedProduct) {
      setStatus('error');
      setMessage('Select a product first.');
      return;
    }

    const counted = Number(countedStock);
    if (!Number.isInteger(counted) || counted < 0 || counted > 1000000) {
      setStatus('error');
      setMessage('Physical count must be a whole number from 0 to 1,000,000.');
      return;
    }

    if (reason.trim().length < 3) {
      setStatus('error');
      setMessage('Enter a clear reason for the physical count or adjustment.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setStatus('error');
      setMessage('Your Admin session expired. Log in again before adjusting stock.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          expected_stock: Number(selectedProduct.stock),
          counted_stock: counted,
          reason: reason.trim(),
          notes: notes.trim() || null,
          adjustmentRequestId: requestId,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Unable to record inventory adjustment.');
      }

      setStatus('success');
      setMessage(data.message || 'Inventory adjustment completed.');
      setRequestId(newRequestId());
      setNotes('');
      await onAdjusted();

      if (data.adjusted) {
        const updatedStock = Number(data.inventory?.new_stock ?? counted);
        setCountedStock(String(updatedStock));
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to record inventory adjustment.');
    }
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2F7D5A]">
            Inventory Integrity
          </p>
          <h2 className="mt-1 text-2xl font-bold font-display text-steel-950">
            Stock Adjustment / Physical Count
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-steel-500">
            Enter the actual physical quantity counted. Rayjin records only the difference as one
            Stock-In or Stock-Out movement so the product balance and inventory ledger stay synchronized.
          </p>
        </div>

        {onViewMovements && (
          <button
            type="button"
            onClick={onViewMovements}
            className="inline-flex items-center justify-center rounded-xl border border-[#CFE0D7] bg-white px-4 py-2.5 text-xs font-bold text-[#0D7740] transition hover:bg-[#EEF8F2]"
          >
            View Inventory Movements
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Important:</strong> use this only after a real physical count or a verified stock
            discrepancy. Normal supplier deliveries still belong in <strong>Receive Stock</strong>.
            Completed POS and online sales continue using their existing Stock-Out workflows.
          </p>
        </div>
      </div>

      {status === 'success' && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <form
        onSubmit={submitAdjustment}
        className="rounded-2xl border border-steel-200/70 bg-white p-5 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="text-xs font-bold uppercase tracking-wider text-steel-500">
            Product
            <select
              value={productId}
              onChange={(event) => selectProduct(event.target.value)}
              className="mt-1 w-full rounded-xl border border-steel-200 bg-white px-3 py-2.5 text-xs font-medium normal-case tracking-normal text-steel-900 outline-none focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/15"
            >
              <option value="">Select product</option>
              {activeProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} — System Stock: {product.stock}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold uppercase tracking-wider text-steel-500">
            Actual Physical Count
            <input
              type="number"
              min="0"
              max="1000000"
              step="1"
              value={countedStock}
              disabled={!selectedProduct}
              onChange={(event) => setCountedStock(event.target.value)}
              className="mt-1 w-full rounded-xl border border-steel-200 bg-white px-3 py-2.5 text-xs font-medium normal-case tracking-normal text-steel-900 outline-none focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/15 disabled:bg-steel-50"
            />
          </label>

          <label className="text-xs font-bold uppercase tracking-wider text-steel-500">
            Reason
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1 w-full rounded-xl border border-steel-200 bg-white px-3 py-2.5 text-xs font-medium normal-case tracking-normal text-steel-900 outline-none focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/15"
            >
              <option>Physical stock count</option>
              <option>Damaged / unsellable item</option>
              <option>Lost / missing item</option>
              <option>Found / excess item</option>
              <option>Data correction</option>
              <option>Other verified discrepancy</option>
            </select>
          </label>

          <label className="text-xs font-bold uppercase tracking-wider text-steel-500">
            Notes <span className="normal-case font-medium text-steel-400">(optional)</span>
            <input
              type="text"
              maxLength={500}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Example: Counted during October shelf audit"
              className="mt-1 w-full rounded-xl border border-steel-200 bg-white px-3 py-2.5 text-xs font-medium normal-case tracking-normal text-steel-900 outline-none focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/15"
            />
          </label>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-steel-200 bg-steel-50 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-steel-400">System Stock</p>
            <p className="mt-1 text-lg font-bold text-steel-900">{selectedProduct?.stock ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-steel-200 bg-steel-50 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-steel-400">Physical Count</p>
            <p className="mt-1 text-lg font-bold text-steel-900">{countedNumber ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-steel-200 bg-steel-50 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-steel-400">Adjustment</p>
            <p
              className={`mt-1 text-lg font-bold ${
                difference === null || difference === 0
                  ? 'text-steel-900'
                  : difference > 0
                    ? 'text-emerald-700'
                    : 'text-red-700'
              }`}
            >
              {difference === null ? '—' : difference > 0 ? `+${difference}` : difference}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] leading-relaxed text-steel-500">
            The backend locks the product row and rejects stale counts if stock changed after you opened this form.
          </p>
          <button
            type="submit"
            disabled={status === 'loading' || !selectedProduct}
            className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-[#2F7D5A] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#256548] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'loading' && <RefreshCw className="h-4 w-4 animate-spin" />}
            {status === 'loading' ? 'Recording…' : 'Record Adjustment'}
          </button>
        </div>
      </form>
    </div>
  );
}
