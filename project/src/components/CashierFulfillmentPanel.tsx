import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, PackageCheck, RefreshCw, Search, Truck } from 'lucide-react';
import { getStoredSession } from '../utils/authSession';

type Fulfillment = 'pickup' | 'shop_go' | 'delivery';
type PickupOrder = {
  id: string; fulfillment: Fulfillment; status: string;
  payment_method: string; payment_status: string;
  customer_name: string; total: number | string; service_fee: number | string;
  delivery_fee: number | string; scheduled_pickup_date?: string | null;
  scheduled_pickup_time?: string | null; arrival_verified?: number;
  items: { name: string; quantity: number; price: number }[];
};
const peso = (value: number) => `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const labels: Record<Fulfillment, string> = { pickup: 'Standard Pickup', shop_go: 'Shop & Go', delivery: 'Local Delivery' };

async function staffRequest(path: string, init: RequestInit = {}) {
  const token = getStoredSession()?.token;
  if (!token) throw new Error('Session expired. Please log in.');
  const response = await fetch(path, { ...init, headers: {
    ...(init.headers || {}), Authorization: `Bearer ${token}`,
  } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Unable to complete request (${response.status}).`);
  return data;
}

export function CashierFulfillmentPanel() {
  const [type, setType] = useState<Fulfillment>('pickup');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<PickupOrder[]>([]);
  const [selected, setSelected] = useState('');
  const [presentedId, setPresentedId] = useState('');
  const [customerPresent, setCustomerPresent] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      const data = await staffRequest(`/api/orders/cashier/fulfillment?type=${type}`);
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load orders.'); }
  }, [type]);
  useEffect(() => { void load(); }, [load]);
  const shown = useMemo(() => orders.filter(o => !search.trim() || String(o.id).toLowerCase().includes(search.trim().toLowerCase())), [orders, search]);
  const order = shown.find(o => String(o.id) === selected) || null;
  const amountDue = order ? Number(order.total || 0) + Number(order.service_fee || 0) + Number(order.delivery_fee || 0) : 0;
  const isCash = String(order?.payment_method || '').toLowerCase() === 'cash';
  const ready = order?.status === 'ready' && Boolean(order.arrival_verified);

  async function verifyArrival() {
    if (!order || busy) return;
    setError(''); setNotice(''); setBusy(true);
    try {
      await staffRequest(`/api/orders/cashier/fulfillment/${encodeURIComponent(order.id)}/arrival`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presentedOrderId: presentedId.trim(), customerPresent }),
      });
      setNotice(`Arrival for ${order.id} recorded. Admin controls order preparation.`);
      setPresentedId(''); setCustomerPresent(false); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Arrival verification failed.'); }
    finally { setBusy(false); }
  }
  async function handover() {
    if (!order || !ready || busy || !window.confirm(`Release order ${order.id} to the verified customer?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await staffRequest(`/api/orders/${encodeURIComponent(order.id)}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', ...(isCash ? { cashReceived: Number(cashReceived) } : {}) }),
      });
      setNotice(`Order ${order.id} released and completed successfully.`); setCashReceived(''); setSelected('');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Order release failed.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-5">
    <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Fulfillment Assistance</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Online Order Pickup & Preparation</h2>
          <p className="mt-1 text-sm text-slate-500">Admin controls approval, preparation status and dispatch. Cashier releases eligible Ready pickups only.</p></div>
        <button className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold text-emerald-800" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4"/> Refresh</button>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-3" role="tablist" aria-label="Fulfillment types">
        {(['pickup', 'shop_go', 'delivery'] as const).map(t => <button key={t} role="tab" aria-selected={t === type}
          onClick={() => { setType(t); setSelected(''); setNotice(''); setError(''); }}
          className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${t === type ? 'bg-emerald-800 text-white' : 'border bg-slate-50 text-slate-700 hover:bg-emerald-50'}`}>
          {labels[t]}
        </button>)}
      </div>
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <label className="relative block"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400"/>
          <input className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm" value={search}
            onChange={e => setSearch(e.target.value)} placeholder="Search by Order ID" /></label>
        <p className="my-3 text-xs font-semibold uppercase tracking-widest text-slate-500">{shown.length} eligible orders · {labels[type]}</p>
        <div className="max-h-[540px] space-y-2 overflow-y-auto">
          {!shown.length && <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No active orders in this queue.</p>}
          {shown.map(o => <button key={o.id} type="button" onClick={() => {setSelected(String(o.id));setPresentedId('');setCustomerPresent(false);}}
            className={`w-full rounded-xl border p-4 text-left transition ${selected === String(o.id) ? 'border-emerald-700 bg-emerald-50' : 'hover:border-emerald-200'}`}>
            <div className="flex items-center justify-between gap-2"><strong className="text-sm">#{o.id}</strong>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase">{o.status.replace(/_/g,' ')}</span></div>
            <p className="mt-1 text-sm text-slate-600">{o.customer_name || 'Registered customer'}</p>
            <p className="mt-2 text-xs text-slate-500">{o.payment_method} · {o.payment_status} · {o.items.length} line item(s)</p>
          </button>)}
        </div>
      </div>
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        {!order ? <div className="flex min-h-56 flex-col items-center justify-center text-center text-slate-500">
          {type === 'delivery' ? <Truck className="h-9 w-9 text-emerald-600"/> : <PackageCheck className="h-9 w-9 text-emerald-600"/>}
          <p className="mt-3 text-sm">Select an order to inspect its permitted operational details.</p></div> : <div className="space-y-4">
          <div className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-emerald-700"/><h3 className="text-lg font-bold">Order #{order.id}</h3></div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-slate-500">Customer</p><strong>{order.customer_name || 'Registered customer'}</strong></div>
            <div><p className="text-xs text-slate-500">Payment</p><strong>{order.payment_status} ({order.payment_method})</strong></div>
            {type === 'shop_go' && <div className="col-span-2"><p className="text-xs text-slate-500">Confirmed pickup schedule</p>
              <strong>{order.scheduled_pickup_date || 'Not confirmed'} · {order.scheduled_pickup_time || '—'}</strong></div>}
          </div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">Items for preparation</p>
            {order.items.map((line,i) => <div key={`${line.name}-${i}`} className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
              <span>{line.name}</span><strong className="shrink-0">× {line.quantity}</strong></div>)}
          </div>
          <div className="flex items-center justify-between border-t pt-3 text-sm"><span>Total including fees</span><strong>{peso(amountDue)}</strong></div>
          {type === 'delivery' ? <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <Truck className="mr-2 inline h-4 w-4"/> View/preparation assistance only. Dispatch, payment actions and completion remain Admin-only.</div> : <>
            <div className="rounded-xl border bg-slate-50 p-4 space-y-3">
              <p className="font-semibold text-sm">1. Verify customer arrival</p>
              <p className="text-xs text-slate-600">Physically check the customer and their presented Order ID. Do not rely solely on the on-screen number.</p>
              <input className="w-full rounded-lg border p-2 text-sm" aria-label="Presented order ID" placeholder="Type the Order ID presented by customer" value={presentedId}
                onChange={e => setPresentedId(e.target.value)} />
              <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={customerPresent} onChange={e => setCustomerPresent(e.target.checked)} />
                I have checked the customer's identity and physical presence.</label>
              <button type="button" disabled={busy || !customerPresent || !presentedId.trim()} onClick={() => void verifyArrival()}
                className="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Record Arrival</button>
            </div>
            <div className="rounded-xl border bg-emerald-50 p-4 space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4"/> 2. Handover after Admin marks Ready</p>
              <p className="text-xs text-emerald-950">{order.status !== 'ready' ? 'Awaiting Ready status from Admin.' : !order.arrival_verified ? 'Arrival verification required.' : 'Order is Ready; backend will revalidate payment, stock and shift.'}</p>
              {isCash && <label className="block text-xs font-bold">Cash received
                <input type="number" min={amountDue} step="0.01" className="mt-1 w-full rounded-lg border p-2 text-sm" value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)} placeholder={peso(amountDue)} /></label>}
              <button type="button" onClick={() => void handover()} disabled={busy || !ready || (isCash && Number(cashReceived) < amountDue)}
                className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Release Ready Order</button>
            </div>
          </>}
        </div>}
      </div>
    </div>
  </section>;
}
