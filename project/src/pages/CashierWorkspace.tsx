import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CashierFulfillmentPanel } from '../components/CashierFulfillmentPanel';
import { LayoutDashboard, ImageIcon, ScanBarcode, PackageCheck, Clock3, ReceiptText, RotateCcw, LogOut, Menu, X, ShieldCheck, PanelLeftClose, PanelLeftOpen, GripVertical } from 'lucide-react';
import { CashierShiftPanel } from '../components/CashierShiftPanel';
import { SalesAdjustmentPanel } from '../components/SalesAdjustmentPanel';
import { clearStoredSession, getStoredSession } from '../utils/authSession';
import { staffIdentity } from '../utils/staffIdentity';
import { PosReceiptActions } from '../components/PosReceiptActions';
import { PosDeliveryFeeField } from '../components/PosDeliveryFeeField';
import { getPosDeliverySuggestion } from '../utils/posDeliveryPricing';
import { reprintPosReceipt, type PosReceipt } from '../utils/posReceipt';
import '../styles/cashierWorkspaceLayout.css';

type Product = { id: number; name: string; barcode?: string | null; price: number | string;
  stock: number; status?: string; fulfillment_rule?: string; delivery_class?: string | null; bulk_quantity_threshold?: number | null; unit?: string; image?: string | null };
type CartLine = { product: Product; quantity: number };
type DeliveryRate = { municipality: string; barangay: string; surcharge: number };
type CustomerMatch = { id: number; name: string };
const peso = (value: number) => `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function staffFetch(path: string, init: RequestInit = {}) {
  const token = getStoredSession()?.token;
  if (!token) throw new Error('Your session has expired. Please log in again.');
  const response = await fetch(path, { ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } });
  if (response.status === 401) {
    clearStoredSession();
    window.location.assign('/login');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

function CashierPos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState('');
  const [scannerCode, setScannerCode] = useState('');
  const [scanFeedback, setScanFeedback] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerMatches, setCustomerMatches] = useState<CustomerMatch[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup');
  const [payment, setPayment] = useState<'cash' | 'card'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [cardConfirmed, setCardConfirmed] = useState(false);
  const [cardPaymentReference, setCardPaymentReference] = useState('');
  const [completedReceipt, setCompletedReceipt] = useState<PosReceipt | null>(null);
  const [completedSaleId, setCompletedSaleId] = useState<number | null>(null);
  const [rates, setRates] = useState<DeliveryRate[]>([]);
  const [contactPerson, setContactPerson] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [barangay, setBarangay] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const pendingPosRequest = useRef<{ signature: string; id: string } | null>(null);
  const completedSaleFocusRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (completedSaleId === null) return;
    const frame = window.requestAnimationFrame(() => {
      completedSaleFocusRef.current?.focus({ preventScroll: true });
      completedSaleFocusRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [completedSaleId]);

  const reload = useCallback(async () => {
    try {
      const [rawProducts, rawRates] = await Promise.all([
        staffFetch('/api/products'), staffFetch('/api/orders/delivery-rates')
      ]);
      setProducts(Array.isArray(rawProducts) ? rawProducts : []);
      setRates(Array.isArray(rawRates) ? rawRates : []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load POS products.'); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  const filtered = useMemo(() => products.filter(p => p.status !== 'inactive' &&
    `${p.name} ${p.barcode || ''}`.toLowerCase().includes(query.toLowerCase())).slice(0, 40), [products, query]);
  const subtotal = cart.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);
  const needsDelivery = cart.some(line => line.product.fulfillment_rule === 'delivery_only');
  const totalFee = fulfillment === 'delivery' ? Number(deliveryFee || 0) : 0;
  const total = subtotal + totalFee;
  const activeRates = rates.filter(rate => rate.municipality === municipality);
  const matchedRate = rates.find(rate => rate.municipality === municipality && rate.barangay === barangay);
  const deliverySuggestion = getPosDeliverySuggestion(cart, matchedRate);

  function addProduct(product: Product) {
    if (Number(product.stock) <= 0) return;
    setCart(current => {
      const existing = current.find(x => x.product.id === product.id);
      if (existing) return current.map(x => x.product.id === product.id
        ? { ...x, quantity: Math.min(Number(product.stock), x.quantity + 1) } : x);
      return [...current, { product, quantity: 1 }];
    });
    if (product.fulfillment_rule === 'delivery_only') setFulfillment('delivery');
    setMessage('');
    setScanFeedback(`${product.name} added to sale.`);
  }

  async function lookupCustomer(q: string) {
    setCustomerSearch(q);
    if (q.trim().length < 2) { setCustomerMatches([]); return; }
    try {
      const data = await staffFetch(`/api/sales/customer-lookup?q=${encodeURIComponent(q.trim())}`);
      setCustomerMatches(data.customers || []);
    } catch { setCustomerMatches([]); }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || !cart.length) return;
    setError(''); setMessage('');
    if (needsDelivery && fulfillment !== 'delivery') { setError('Delivery-only products require Deliver Out.'); return; }
    if (fulfillment === 'delivery' && (!customerName.trim() || !contactPerson.trim() || !contactNumber.trim()
      || !matchedRate || !address.trim() || !deliveryFee.trim())) {
      setError('Complete customer, contact, active area, address and delivery fee details.'); return;
    }
    if (payment === 'cash' && (!cashReceived.trim() || Number(cashReceived) < total)) {
      setError('Enter enough cash to cover the total.'); return;
    }
    if (payment === 'card' && !cardConfirmed) { setError('Confirm external card payment first.'); return; }
    if (payment === 'card' && !/^[a-zA-Z0-9][a-zA-Z0-9 ._:/#-]{2,79}$/.test(cardPaymentReference.trim())) {
      setError('Enter the external card terminal payment reference (3–80 allowed characters).'); return;
    }
    const payload = {
      items: cart, paymentMethod: payment,
      cashReceived: payment === 'cash' ? Number(cashReceived) : null,
      cardPaymentConfirmed: payment === 'card' && cardConfirmed,
      cardPaymentReference: payment === 'card' ? cardPaymentReference.trim() : null,
      fulfillment, deliveryFee: totalFee, customerName: customerName.trim(),
      deliveryContactPerson: contactPerson.trim(), deliveryContactNumber: contactNumber.trim(),
      deliveryMunicipality: municipality, deliveryBarangay: barangay,
      deliveryAddress: address.trim(), deliveryLandmark: landmark.trim(),
    };
    // Retry the same request after a lost network response, but never reuse its ID
    // for changed cart, customer, fulfillment, or payment details.
    const signature = JSON.stringify(payload);
    if (!pendingPosRequest.current || pendingPosRequest.current.signature !== signature) {
      pendingPosRequest.current = { id: crypto.randomUUID(), signature };
    }
    setSubmitting(true);
    try {
      const response = await staffFetch('/api/sales/pos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, posRequestId: pendingPosRequest.current.id }),
      });
      setCompletedSaleId(Number(response.saleId));
      setCompletedReceipt(response.receipt || null);
      setMessage(`POS-${String(response.saleId).padStart(6, '0')} recorded. Total ${peso(Number(response.totalAmount))}.`);
      setCart([]); setCashReceived(''); setCardConfirmed(false); setCardPaymentReference(''); setCustomerName('');
      pendingPosRequest.current = null;
      await reload();
    } catch (err) {
      // Keep request signature and ID on error; the backend also rejects mismatched retries.
      setError(err instanceof Error ? err.message : 'Unable to complete sale.');
    } finally { setSubmitting(false); }
  }

  const cashChange = payment === 'cash' && cashReceived.trim() && Number.isFinite(Number(cashReceived))
    ? Number((Number(cashReceived) - total).toFixed(2)) : null;

  const inputClass = 'w-full rounded-lg border border-[#DDE6E0] bg-white px-3 py-2 text-sm';
  return <div className="cashier-pos-grid">
    <section className="min-w-0 self-start space-y-3 rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-bold">Product selection & barcode</h2>
      <label className="block text-xs font-semibold text-emerald-900">Barcode scanner
        <div className="mt-1 flex gap-2"><input className={inputClass} autoComplete="off" aria-label="Scan product barcode" placeholder="Scan barcode or type exact code + Enter" value={scannerCode}
          onChange={e => { setScannerCode(e.target.value); setScanFeedback(''); }} onKeyDown={e => { if (e.key !== 'Enter') return;
            e.preventDefault(); const matched = products.find(p => p.barcode && p.barcode.trim() === scannerCode.trim());
            if (!matched) { setScanFeedback('Barcode not found. Try manual search.'); return; }
            if (matched.status === 'inactive' || Number(matched.stock) <= 0) { setScanFeedback('Product is unavailable or out of stock.'); return; }
            addProduct(matched); setScannerCode('');
          }} />
        <button type="button" className="shrink-0 rounded-xl bg-emerald-800 px-3 py-2 text-xs font-bold text-white" onClick={() => {
          const matched = products.find(p => p.barcode && p.barcode.trim() === scannerCode.trim());
          if (!matched) { setScanFeedback('Barcode not found.'); return; }
          if (matched.status === 'inactive' || Number(matched.stock) <= 0) { setScanFeedback('Product is unavailable or out of stock.'); return; }
          addProduct(matched); setScannerCode('');
        }}>Add Barcode</button></div>
      </label>
      {scanFeedback && <p aria-live="polite" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">{scanFeedback}</p>}
      <label className="block text-xs font-semibold text-slate-700">Find products by name or barcode
        <input className={`${inputClass} mt-1`} placeholder="Search products…" value={query} onChange={e => setQuery(e.target.value)} />
      </label>
      <div className="cashier-product-results space-y-2 overflow-y-auto pr-1" role="region" aria-label="Available POS products" tabIndex={0}>
        {filtered.map(p => <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-100">
              {p.image && (/^(https?:\/\/|\/|data:image\/)/.test(p.image))
                ? <img src={p.image} alt="" loading="lazy" className="h-full w-full object-contain" />
                : <ImageIcon aria-hidden className="h-5 w-5 text-slate-300" />}
            </div>
            <div className="min-w-0"><p className="line-clamp-2 text-sm font-semibold">{p.name}</p>
              <p className="text-xs text-gray-600">{p.barcode || 'No barcode'} · Stock {p.stock} · {peso(Number(p.price))}</p></div>
          </div>
          <button className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
            type="button" disabled={Number(p.stock) <= 0} onClick={() => addProduct(p)}>Add</button>
        </div>)}
      </div>
    </section>
    <form onSubmit={submit} className="min-w-0 self-start space-y-3 rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-bold">New POS sale</h2>
      {completedSaleId !== null ? (
        <div ref={completedSaleFocusRef} tabIndex={-1} className="scroll-mt-24 space-y-3 outline-none" aria-label="Completed POS sale">
          <PosReceiptActions receipt={completedReceipt} saleId={completedSaleId}
            onNewSale={() => {
              setCompletedReceipt(null); setCompletedSaleId(null); setError(''); setMessage('');
              setCustomerName(''); setCustomerSearch(''); setCustomerMatches([]);
              setFulfillment('pickup'); setPayment('cash'); setCashReceived('');
              setCardPaymentReference(''); setCardConfirmed(false); setContactPerson('');
              setContactNumber(''); setMunicipality(''); setBarangay('');
              setAddress(''); setLandmark(''); setDeliveryFee('');
              setScannerCode(''); setScanFeedback(''); pendingPosRequest.current = null;
            }}
            onRetryReceipt={() => {
              setError('');
              void staffFetch(`/api/sales/pos/${completedSaleId}/receipt`)
                .then(result => setCompletedReceipt(result.receipt))
                .catch(err => setError(err instanceof Error ? err.message : 'Receipt unavailable.'));
            }} />
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>
      ) : (
        <>
      {cart.length === 0 && <p className="text-sm text-gray-500">Add a product to start a transaction.</p>}
      {cart.length > 0 && (<div className="cashier-cart-items space-y-2 overflow-y-auto pr-1" role="region" aria-label="POS cart items" tabIndex={0}>
      {cart.map(({ product, quantity }) => <div key={product.id} className="flex items-center gap-2 border-b pb-2">
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{product.name}</p><p className="text-xs">{peso(Number(product.price))} each</p></div>
        <input className="w-16 rounded border p-1 text-sm" aria-label={`Quantity for ${product.name}`} type="number" min={1}
          max={product.stock} value={quantity} onChange={e => setCart(current => current.map(line => line.product.id === product.id
            ? { ...line, quantity: Math.max(1, Math.min(Number(product.stock), Number(e.target.value) || 1)) } : line))} />
        <button type="button" className="text-red-700 text-xs" onClick={() => setCart(current => current.filter(x => x.product.id !== product.id))}>Remove</button>
      </div>)}
      </div>)}
      <label className="block text-sm font-semibold">Customer name (optional for pickup)
        <input className={`${inputClass} mt-1`} maxLength={120} placeholder="Walk-in customer or registered name" value={customerName}
          onChange={e => setCustomerName(e.target.value)} /></label>
      <label className="block text-sm font-semibold">Find registered customer (optional)
        <input className={`${inputClass} mt-1`} placeholder="Search by name or username" value={customerSearch}
          onChange={e => void lookupCustomer(e.target.value)} /></label>
      {customerMatches.length > 0 && <div className="max-h-24 overflow-y-auto rounded-lg border">
        {customerMatches.map(c => <button key={c.id} type="button" className="block w-full px-3 py-2 text-left text-xs hover:bg-emerald-50"
          onClick={() => { setCustomerName(c.name); setCustomerSearch(''); setCustomerMatches([]); }}>{c.name}</button>)}
      </div>}
      <label className="block text-sm font-semibold">Fulfillment
        <select className={`${inputClass} mt-1`} value={fulfillment}
          onChange={e => setFulfillment(e.target.value as 'pickup' | 'delivery')}>
          <option value="pickup" disabled={needsDelivery}>Store pickup / walk-in</option><option value="delivery">Deliver Out</option>
        </select></label>
      {fulfillment === 'delivery' && <div className="space-y-2 rounded-lg border bg-gray-50 p-3">
        <input className={inputClass} placeholder="Contact person" value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
        <input className={inputClass} placeholder="Contact number" value={contactNumber} onChange={e => setContactNumber(e.target.value)} />
        <select className={inputClass} value={municipality} onChange={e => { setMunicipality(e.target.value); setBarangay(''); setDeliveryFee(''); }}>
          <option value="">Select municipality</option>{[...new Set(rates.map(r => r.municipality))].map(m => <option key={m}>{m}</option>)}
        </select>
        <select className={inputClass} value={barangay} onChange={e => { setBarangay(e.target.value); setDeliveryFee(''); }}>
          <option value="">Select barangay</option>{activeRates.map(r => <option key={`${r.municipality}-${r.barangay}`}>{r.barangay}</option>)}
        </select>
        <input className={inputClass} placeholder="Delivery address" value={address} onChange={e => setAddress(e.target.value)} />
        <input className={inputClass} placeholder="Landmark (optional)" value={landmark} onChange={e => setLandmark(e.target.value)} />
        <PosDeliveryFeeField value={deliveryFee} onChange={setDeliveryFee} onUseSuggested={setDeliveryFee}
          suggestedFee={deliverySuggestion.suggestedFee} loadClass={deliverySuggestion.loadClass}
          multiplier={deliverySuggestion.multiplier} />
      </div>}
      <label className="block text-sm font-semibold">Payment method
        <select className={`${inputClass} mt-1`} value={payment} onChange={e => { setPayment(e.target.value as 'cash' | 'card'); setCardConfirmed(false); }}>
          <option value="cash">Cash</option><option value="card">Card (externally confirmed)</option>
        </select></label>
      {payment === 'cash' ? <div className="space-y-2">
        <label className="block text-sm font-semibold">Cash received
          <input type="number" min="0" step="0.01" inputMode="decimal" className={`${inputClass} mt-1`} value={cashReceived} onChange={e => setCashReceived(e.target.value)} /></label>
        <div aria-live="polite" className={`rounded-xl border px-3 py-3 text-sm font-bold ${cashChange != null && cashChange >= 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
          {cashChange == null ? 'Enter cash received to calculate change' : cashChange >= 0 ? `Change Due: ${peso(cashChange)}` : `Amount short: ${peso(-cashChange)}`}
        </div>
      </div> : <div className="space-y-3 rounded-xl border bg-slate-50 p-3">
        <label className="block text-sm font-semibold">External card terminal reference (required)
          <input className={`${inputClass} mt-1`} maxLength={80} value={cardPaymentReference} onChange={e => setCardPaymentReference(e.target.value)} placeholder="Reference from approved card terminal receipt" autoComplete="off" /></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={cardConfirmed} onChange={e => setCardConfirmed(e.target.checked)} /> Card payment already confirmed on the external terminal (not verified by this system)</label>
      </div>}
      <div className="border-t pt-3 text-sm space-y-1"><p>Subtotal: {peso(subtotal)}</p><p>Delivery fee: {peso(totalFee)}</p>
        <p className="text-lg font-bold">Total: {peso(total)}</p></div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <button type="submit" disabled={submitting || cart.length === 0}
        className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white disabled:opacity-50">
        {submitting ? 'Processing…' : 'Complete POS sale'}
      </button>
      </>
      )}
    </form>
  </div>;
}

type CashierSection = 'overview' | 'pos' | 'fulfillment' | 'shifts' | 'transactions' | 'adjustments' | 'activity';
const cashSections: { id: CashierSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'pos', label: 'POS / New Sale', icon: ScanBarcode },
  { id: 'fulfillment', label: 'Fulfillment Assistance', icon: PackageCheck },
  { id: 'shifts', label: 'My Cashier Shift', icon: Clock3 },
  { id: 'transactions', label: 'My Transactions', icon: ReceiptText },
  { id: 'adjustments', label: 'Returns & Voids', icon: RotateCcw },
  { id: 'activity', label: 'My Activity', icon: ShieldCheck },
];

function MyTransactions() {
  const [sales, setSales] = useState<{ sale_id: number; reference: string; customer_name?: string;
    sale_date: string; total_amount: number; payment_method: string; adjustment_state: string;
    shift_id?: number | null; card_payment_reference?: string | null; cash_received?: number | null; change_amount?: number | null;
    operator_name?: string | null; operator_username?: string | null; operator_role?: string | null }[]>([]);
  const [error, setError] = useState('');
  const load = useCallback(async () => { try { const result = await staffFetch('/api/sales/my-pos');
    setSales(result.sales || []); setError(''); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load personal transactions.'); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <div className="rounded-2xl border bg-white p-5 shadow-sm">
    <div className="mb-4 flex justify-between gap-3"><div><h2 className="text-lg font-bold">My POS Transactions</h2>
      <p className="text-xs text-slate-500">Only your own completed POS sales, not business-wide reports.</p></div>
      <button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={() => void load()}>Refresh</button></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs">
      <thead><tr className="border-b bg-slate-50 text-slate-500"><th className="p-3">Reference</th><th className="p-3">Date</th><th className="p-3">Operator / Shift</th><th className="p-3">Customer</th><th className="p-3">Method</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3">Receipt</th></tr></thead>
      <tbody>{sales.map(s => <tr key={s.sale_id} className="border-b"><td className="p-3 font-bold">{s.reference}</td><td className="p-3">{new Date(s.sale_date).toLocaleString()}</td><td className="p-3">{staffIdentity(s.operator_name || s.operator_username, s.operator_role)}<p className="mt-1 text-slate-500">Shift: {s.shift_id ? `#${s.shift_id}` : 'Not assigned'}</p></td><td className="p-3">{s.customer_name || 'Walk-in'}</td><td className="p-3">{s.payment_method}{s.card_payment_reference && <p className="mt-1 break-all text-slate-500">Ref: {s.card_payment_reference}</p>}{s.change_amount != null && <p className="mt-1 text-emerald-700">Change: {peso(Number(s.change_amount))}</p>}</td><td className="p-3">{peso(Number(s.total_amount))}</td><td className="p-3">{s.adjustment_state}</td><td className="p-3"><button type="button" className="rounded-lg border border-emerald-200 px-3 py-1.5 font-bold text-emerald-800" onClick={() => { const token = getStoredSession()?.token; if (token) void reprintPosReceipt(s.sale_id, token); else setError('Sign in to reprint receipts.'); }}>Print</button></td></tr>)}
      {!sales.length && <tr><td colSpan={8} className="p-8 text-center text-slate-500">No recorded POS transactions yet.</td></tr>}</tbody>
    </table></div>
  </div>;
}
function MyActivity() {
  const [activities, setActivities] = useState<{audit_id:number; action:string; summary:string; entity_type:string; entity_id:string | null; created_at:string}[]>([]);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { const result = await staffFetch('/api/audit-logs/mine?limit=60');
      setActivities(Array.isArray(result.activities) ? result.activities : []); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load activity.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <section className="rounded-2xl border bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between gap-2"><div>
      <h2 className="text-lg font-bold">My Staff Activity</h2>
      <p className="text-xs text-slate-500">Read-only record of your own meaningful actions. Other staff history and sensitive approval details are restricted.</p>
    </div><button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={() => void load()}>Refresh</button></div>
    {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs">
      <thead><tr className="border-b bg-slate-50 text-slate-600"><th className="p-3">Date</th><th className="p-3">Action</th><th className="p-3">Record</th><th className="p-3">Summary</th></tr></thead>
      <tbody>{activities.map(a => <tr key={a.audit_id} className="border-b">
        <td className="p-3 whitespace-nowrap">{new Date(a.created_at).toLocaleString('en-PH')}</td><td className="p-3 font-semibold">{a.action === 'approval.rejected' ? 'Approval verification failed' : a.action.split('.').join(' / ')}</td>
        <td className="p-3">{a.entity_type}{a.entity_id ? ` #${a.entity_id}` : ''}</td><td className="p-3">{a.summary}</td>
      </tr>)}{!activities.length && <tr><td colSpan={4} className="p-6 text-center text-slate-500">No recorded activity yet.</td></tr>}</tbody>
    </table></div>
  </section>;
}

function CashierOverview({ goTo }: { goTo: (section: CashierSection) => void }) {
  const [shiftOpen, setShiftOpen] = useState(false);
  const [recent, setRecent] = useState<number | null>(null);
  useEffect(() => { void Promise.all([staffFetch('/api/cashier-shifts/current'), staffFetch('/api/sales/my-pos')])
    .then(([shift, sales]) => { setShiftOpen(Boolean(shift.has_open_shift)); setRecent((sales.sales || []).length); }).catch(() => {}); }, []);
  return <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-3">
      {[["My Shift",shiftOpen ? 'Open' : 'Not open'],['My recent POS sales',recent === null ? '—' : String(recent)],['Online orders','Pickup queue']] .map(([label,value]) =>
        <div key={label} className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase text-emerald-700">{label}</p>
          <p className="mt-2 text-xl font-bold">{value}</p></div>)}
    </div>
    <div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Daily Operations</h2><p className="mb-4 text-sm text-slate-500">Start with an approved shift before recording sales.</p>
      <div className="grid gap-3 sm:grid-cols-3">{[['pos','New POS Sale'],['fulfillment','Pickup & Handover'],['shifts','Shift Reconciliation']].map(([id,label]) =>
        <button key={id} type="button" onClick={() => goTo(id as CashierSection)} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left text-sm font-bold text-emerald-900 hover:bg-emerald-100">{label}</button>)}</div>
    </div>
  </div>;
}
export function CashierWorkspace() {
  const [section, setSection] = useState<CashierSection>('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = Number(window.localStorage.getItem('rayjin_cashier_sidebar_width'));
    return Number.isFinite(stored) && stored >= 200 && stored <= 320 ? stored : 254;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    window.localStorage.getItem('rayjin_cashier_sidebar_collapsed') === '1'
  );
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);
  const [resizing, setResizing] = useState(false);
  useEffect(() => {
    window.localStorage.setItem('rayjin_cashier_sidebar_width', String(sidebarWidth));
  }, [sidebarWidth]);
  useEffect(() => {
    window.localStorage.setItem('rayjin_cashier_sidebar_collapsed', sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);
  const session = getStoredSession();
  const navigate = (s: CashierSection) => { setSection(s); setDrawerOpen(false); };
  const signout = () => { clearStoredSession(); window.dispatchEvent(new Event('storage')); window.location.assign('/login'); };
  return <main className="min-h-screen bg-[#F3F7F5] text-[#17372D]">
    <header className="sticky top-0 z-30 border-b border-emerald-950/20 bg-[#064E3B] text-white shadow-md">
      <div className="flex min-h-16 items-center gap-3 px-4 lg:px-7">
        <button type="button" className="rounded-lg p-2 hover:bg-white/10 lg:hidden" aria-label="Toggle Cashier navigation" onClick={() => setDrawerOpen(!drawerOpen)}><Menu className="h-5 w-5" /></button>
        <ShieldCheck className="h-7 w-7 text-emerald-300"/>
        <div className="flex-1"><h1 className="text-sm font-black tracking-wide">RAYJIN HARDWARE</h1>
          <p className="text-[10px] uppercase tracking-widest text-emerald-200">Cashier Operations Console</p></div>
        <span className="hidden text-xs font-semibold text-emerald-100 sm:inline">{String(session?.user.username || 'Cashier')}</span>
        <button type="button" onClick={signout} className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-white/10"><LogOut className="h-4 w-4"/> Sign out</button>
      </div>
    </header>
    <div className="flex w-full min-w-0">
      {drawerOpen && <button type="button" className="fixed inset-0 z-30 bg-black/40 lg:hidden" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />}
      <aside
        style={{ '--cashier-sidebar-width': `${sidebarCollapsed ? 64 : sidebarWidth}px` } as React.CSSProperties}
        className={`${drawerOpen ? 'fixed left-0 top-16 bottom-0 z-40 flex' : 'hidden'} ${sidebarCollapsed ? 'lg:px-2' : 'lg:px-4'} ${resizing ? 'lg:transition-none' : 'lg:transition-[width] lg:duration-150'} w-[254px] shrink-0 flex-col border-r border-emerald-950/10 bg-white p-4 lg:sticky lg:top-16 lg:z-10 lg:flex lg:h-[calc(100vh-64px)] lg:w-[var(--cashier-sidebar-width)]`}
      >
        <div className="mb-4 flex items-center justify-between gap-1">
          <p className={`text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 ${sidebarCollapsed ? 'lg:sr-only' : ''}`}>My Workspace</p>
          <button type="button" className="rounded-md p-1 text-slate-600 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 lg:hidden"
            aria-label="Close sidebar" onClick={() => setDrawerOpen(false)}><X className="h-4 w-4"/></button>
          <button type="button" className="hidden rounded-md p-1 text-emerald-900 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 lg:inline-flex"
            aria-label={sidebarCollapsed ? 'Expand My Workspace navigation' : 'Collapse My Workspace navigation'}
            aria-expanded={!sidebarCollapsed} title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            onClick={() => setSidebarCollapsed(current => !current)}>
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        <nav className="space-y-1" aria-label="Cashier navigation">{cashSections.map(item => { const Icon = item.icon; return <button key={item.id} type="button"
          title={sidebarCollapsed ? item.label : undefined} aria-label={item.label}
          onClick={() => navigate(item.id)} aria-current={section === item.id ? 'page' : undefined}
          className={`flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''} ${section === item.id ? 'bg-emerald-800 text-white' : 'text-slate-700 hover:bg-emerald-50'}`}>
          <Icon className="h-4 w-4 shrink-0"/><span className={sidebarCollapsed ? 'lg:sr-only' : 'min-w-0'}>{item.label}</span></button>; })}</nav>
        <p className={`mt-auto rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900 ${sidebarCollapsed ? 'lg:sr-only' : ''}`}>Restricted cashier access. Management reporting, inventory edits and order approvals belong to Admin.</p>
        {!sidebarCollapsed && <div role="separator" aria-orientation="vertical" aria-label="Resize My Workspace navigation"
          aria-valuemin={200} aria-valuemax={320} aria-valuenow={sidebarWidth} tabIndex={0}
          title="Drag to resize; arrow keys adjust width; Home/End set limits"
          className="cashier-sidebar-resizer hidden lg:flex"
          onPointerDown={event => {
            if (event.button !== 0) return;
            dragState.current = { startX: event.clientX, startWidth: sidebarWidth };
            setResizing(true);
            event.currentTarget.setPointerCapture(event.pointerId);
            event.preventDefault();
          }}
          onPointerMove={event => {
            if (!dragState.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
            const nextWidth = dragState.current.startWidth + event.clientX - dragState.current.startX;
            setSidebarWidth(Math.max(200, Math.min(320, Math.round(nextWidth))));
          }}
          onPointerUp={event => {
            dragState.current = null; setResizing(false);
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => { dragState.current = null; setResizing(false); }}
          onLostPointerCapture={() => { dragState.current = null; setResizing(false); }}
          onKeyDown={event => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault(); setSidebarWidth(w => Math.max(200, Math.min(320, w + (event.key === 'ArrowLeft' ? -10 : 10))));
            } else if (event.key === 'Home' || event.key === 'End') {
              event.preventDefault(); setSidebarWidth(event.key === 'Home' ? 200 : 320);
            }
          }}><GripVertical className="h-4 w-4" aria-hidden="true"/></div>}
      </aside>
      <div className="cashier-workspace-content min-w-0 flex-1 p-4 md:p-6"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Cashier Workspace</p>
        <h2 className="mt-1 text-2xl font-bold">{cashSections.find(x => x.id === section)?.label}</h2></div>
        {section === 'overview' && <CashierOverview goTo={navigate} />}
        {section === 'pos' && <CashierPos />}
        {section === 'fulfillment' && <CashierFulfillmentPanel />}
        {section === 'shifts' && <CashierShiftPanel cashierMode onGoToPos={() => navigate('pos')} />}
        {section === 'transactions' && <MyTransactions />}
        {section === 'adjustments' && <SalesAdjustmentPanel cashierMode />}
        {section === 'activity' && <MyActivity />}
      </div>
    </div>
  </main>;
}
