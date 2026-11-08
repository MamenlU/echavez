import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';

type PurchaseOrderStatus = 'Draft' | 'Ordered' | 'Partially Received' | 'Received' | 'Cancelled';

type Product = {
  id: number;
  name: string;
  barcode?: string | null;
  unit: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive';
};

type Supplier = {
  supplier_id: number;
  supplier_name: string;
  status: 'Active' | 'Inactive';
};

type PurchaseOrderSummary = {
  purchase_order_id: number;
  po_number: string;
  supplier_id: number;
  supplier_name: string;
  status: PurchaseOrderStatus;
  expected_delivery_date: string | null;
  notes: string | null;
  created_by: string | null;
  ordered_by: string | null;
  ordered_at: string | null;
  created_at: string;
  item_count: number;
  ordered_quantity: number;
  received_quantity: number;
  remaining_quantity: number;
  expected_cost: number;
  actual_received_cost: number;
};

type PurchaseOrderItem = {
  purchase_order_item_id: number;
  product_id: number;
  product_name: string;
  barcode: string | null;
  unit: string;
  current_selling_price: number;
  current_stock: number;
  ordered_quantity: number;
  expected_unit_cost: number;
  received_quantity: number;
  remaining_quantity: number;
  actual_received_cost: number;
  average_received_unit_cost: number | null;
};

type PurchaseOrderDetail = PurchaseOrderSummary & {
  cancelled_by?: string | null;
  cancelled_at?: string | null;
};

type FormLine = {
  key: string;
  product_id: string;
  ordered_quantity: string;
  expected_unit_cost: string;
};

export type PurchaseOrderReceiveTarget = {
  purchase_order_id: number;
  po_number: string;
  purchase_order_item_id: number;
  product_id: number;
  product_name: string;
  supplier_id: number;
  supplier_name: string;
  remaining_quantity: number;
  expected_unit_cost: number;
  current_selling_price: number;
};

interface PurchaseOrdersPanelProps {
  onReceiveItem: (target: PurchaseOrderReceiveTarget) => void;
}

const peso = (value: number | string | null | undefined) =>
  `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const dateText = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' });
};

const dateTimeText = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const statusClass: Record<PurchaseOrderStatus, string> = {
  Draft: 'bg-slate-100 text-slate-700',
  Ordered: 'bg-blue-50 text-blue-700',
  'Partially Received': 'bg-amber-50 text-amber-700',
  Received: 'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-red-50 text-red-700',
};

const newLine = (): FormLine => ({
  key: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  product_id: '',
  ordered_quantity: '1',
  expected_unit_cost: '',
});

export function PurchaseOrdersPanel({ onReceiveItem }: PurchaseOrdersPanelProps) {
  const [orders, setOrders] = useState<PurchaseOrderSummary[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<PurchaseOrderDetail | null>(null);
  const [detailItems, setDetailItems] = useState<PurchaseOrderItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<FormLine[]>([newLine()]);

  const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    if (!token) {
      localStorage.removeItem('user');
      window.location.assign('/login');
      throw new Error('Admin session expired.');
    }
    const response = await fetch(input, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.assign('/login');
      throw new Error('Admin session expired.');
    }
    return response;
  };

  const loadOrders = async () => {
    const response = await authFetch('/api/purchase-orders');
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to load purchase orders.');
    setOrders(Array.isArray(data.purchase_orders) ? data.purchase_orders : []);
  };

  const loadDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const response = await authFetch(`/api/purchase-orders/${id}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to load purchase-order details.');
      setDetail(data.purchase_order || null);
      setDetailItems(Array.isArray(data.items) ? data.items : []);
      setSelectedId(id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load purchase-order details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const loadInitial = async () => {
    setLoading(true);
    setError('');
    try {
      const [supplierResponse, productResponse] = await Promise.all([
        authFetch('/api/suppliers'),
        authFetch('/api/products'),
      ]);
      const supplierData = await supplierResponse.json().catch(() => []);
      const productData = await productResponse.json().catch(() => []);
      if (!supplierResponse.ok) throw new Error(supplierData.error || 'Unable to load suppliers.');
      if (!productResponse.ok) throw new Error(productData.error || 'Unable to load products.');
      setSuppliers(Array.isArray(supplierData) ? supplierData : []);
      setProducts(Array.isArray(productData) ? productData : []);
      await loadOrders();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load purchase-order module.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAll = async (focusId?: number | null) => {
    setError('');
    await loadOrders();
    const targetId = focusId ?? selectedId;
    if (targetId) await loadDetail(targetId);
  };

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter && order.status !== statusFilter) return false;
      if (!query) return true;
      return [order.po_number, order.supplier_name, order.status, order.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [orders, search, statusFilter]);

  const resetForm = () => {
    setEditingId(null);
    setSupplierId('');
    setExpectedDate('');
    setNotes('');
    setLines([newLine()]);
  };

  const openCreate = () => {
    resetForm();
    setError('');
    setSuccess('');
    setShowForm(true);
  };

  const openEdit = () => {
    if (!detail || detail.status !== 'Draft') return;
    setEditingId(detail.purchase_order_id);
    setSupplierId(String(detail.supplier_id));
    setExpectedDate(detail.expected_delivery_date ? String(detail.expected_delivery_date).slice(0, 10) : '');
    setNotes(detail.notes || '');
    setLines(detailItems.map((item) => ({
      key: String(item.purchase_order_item_id),
      product_id: String(item.product_id),
      ordered_quantity: String(item.ordered_quantity),
      expected_unit_cost: String(Number(item.expected_unit_cost).toFixed(2)),
    })));
    setError('');
    setSuccess('');
    setShowForm(true);
  };

  const selectedProductIds = new Set(lines.map((line) => Number(line.product_id)).filter(Boolean));

  const updateLine = (key: string, patch: Partial<FormLine>) => {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  };

  const expectedTotal = lines.reduce((sum, line) => {
    const quantity = Number(line.ordered_quantity || 0);
    const cost = Number(line.expected_unit_cost || 0);
    return sum + (Number.isFinite(quantity * cost) ? quantity * cost : 0);
  }, 0);

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const payloadLines = lines.map((line) => ({
      product_id: Number(line.product_id),
      ordered_quantity: Number(line.ordered_quantity),
      expected_unit_cost: Number(line.expected_unit_cost),
    }));

    if (!supplierId) {
      setError('Select an active supplier.');
      return;
    }
    if (payloadLines.some((line) => !line.product_id || !Number.isInteger(line.ordered_quantity) || line.ordered_quantity <= 0 || !Number.isFinite(line.expected_unit_cost) || line.expected_unit_cost <= 0)) {
      setError('Complete every product line with a valid quantity and expected unit cost.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await authFetch(
        editingId ? `/api/purchase-orders/${editingId}` : '/api/purchase-orders',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplier_id: Number(supplierId),
            expected_delivery_date: expectedDate || null,
            notes: notes.trim() || null,
            items: payloadLines,
          }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to save purchase order.');

      const focusId = editingId || Number(data.purchase_order_id);
      setSuccess(data.message || 'Purchase order saved successfully.');
      setShowForm(false);
      resetForm();
      await refreshAll(focusId);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save purchase order.');
    } finally {
      setSubmitting(false);
    }
  };

  const markOrdered = async () => {
    if (!detail || detail.status !== 'Draft') return;
    if (!window.confirm(`Mark ${detail.po_number} as Ordered? After this, product lines are locked and receiving can begin.`)) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await authFetch(`/api/purchase-orders/${detail.purchase_order_id}/order`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to mark purchase order as Ordered.');
      setSuccess(data.message || 'Purchase order marked as Ordered.');
      await refreshAll(detail.purchase_order_id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to update purchase order.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelOrder = async () => {
    if (!detail || detail.status === 'Received' || detail.status === 'Cancelled') return;
    const reason = window.prompt(
      Number(detail.received_quantity || 0) > 0
        ? `Why are you cancelling the remaining quantities on ${detail.po_number}? Already received stock will remain unchanged.`
        : `Why are you cancelling ${detail.po_number}?`,
      'Supplier order cancelled / remaining quantity unavailable'
    );
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError('Please provide a short cancellation reason.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await authFetch(`/api/purchase-orders/${detail.purchase_order_id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to cancel purchase order.');
      setSuccess(data.message || 'Purchase order cancelled.');
      await refreshAll(detail.purchase_order_id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to cancel purchase order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2F7D5A]">Purchasing &amp; Receiving</p>
          <h2 className="mt-1 text-2xl font-bold font-display text-steel-950">Purchase Orders</h2>
          <p className="mt-1 max-w-3xl text-sm text-steel-500">
            Plan supplier purchases without changing stock. Inventory increases only when goods are physically received through Rayjin&apos;s existing Stock Receiving workflow.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void refreshAll()} disabled={loading || submitting} className="inline-flex items-center gap-2 rounded-xl border border-[#CFE0D7] bg-white px-4 py-2.5 text-xs font-bold text-[#0D7740] hover:bg-[#EEF8F2] disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-[#2F7D5A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#256548]">
            <Plus className="h-4 w-4" /> New Purchase Order
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
        <strong>Inventory safety rule:</strong> Drafting or ordering a PO never increases product stock. Only an actual goods receipt creates Stock-In. Partial receiving is allowed, and the remaining shortage stays visible on the PO.
      </div>

      {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {success && <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{success}</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.6fr)]">
        <section className="rounded-2xl border border-[#DDE6E0] bg-white shadow-sm">
          <div className="border-b border-steel-100 p-4">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search PO or supplier..." className="w-full rounded-xl border border-steel-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#2F7D5A]" />
            </label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-2 w-full rounded-xl border border-steel-200 bg-white px-3 py-2.5 text-xs text-steel-800 outline-none focus:border-[#2F7D5A]">
              <option value="">All statuses</option>
              {(['Draft','Ordered','Partially Received','Received','Cancelled'] as PurchaseOrderStatus[]).map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
          <div className="max-h-[650px] divide-y divide-steel-100 overflow-y-auto">
            {loading ? <div className="p-8 text-center text-xs text-steel-500">Loading purchase orders…</div> : filteredOrders.length === 0 ? <div className="p-8 text-center text-xs text-steel-500">No matching purchase orders.</div> : filteredOrders.map((order) => (
              <button key={order.purchase_order_id} type="button" onClick={() => void loadDetail(order.purchase_order_id)} className={`w-full p-4 text-left transition hover:bg-[#F8FBF9] ${selectedId === order.purchase_order_id ? 'bg-[#F0F8F3]' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-sm font-bold text-[#17372D]">{order.po_number}</p><p className="mt-1 text-[11px] text-steel-500">{order.supplier_name}</p></div>
                  <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${statusClass[order.status]}`}>{order.status}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                  <div><span className="text-steel-400">Ordered</span><p className="font-bold text-steel-800">{Number(order.ordered_quantity || 0).toLocaleString()}</p></div>
                  <div><span className="text-steel-400">Received</span><p className="font-bold text-emerald-700">{Number(order.received_quantity || 0).toLocaleString()}</p></div>
                  <div><span className="text-steel-400">Remaining</span><p className="font-bold text-amber-700">{Number(order.remaining_quantity || 0).toLocaleString()}</p></div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#DDE6E0] bg-white p-5 shadow-sm">
          {detailLoading ? <div className="flex min-h-72 items-center justify-center text-sm text-steel-500">Loading purchase-order details…</div> : !detail ? (
            <div className="flex min-h-72 flex-col items-center justify-center text-center text-steel-500"><ClipboardCheck className="mb-3 h-10 w-10 text-steel-300" /><p className="text-sm font-semibold">Select a purchase order to review its products and receiving progress.</p></div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-bold text-[#17372D]">{detail.po_number}</h3><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${statusClass[detail.status]}`}>{detail.status}</span></div><p className="mt-1 text-xs text-steel-500">{detail.supplier_name} · Created {dateTimeText(detail.created_at)}</p></div>
                <div className="flex flex-wrap gap-2">
                  {detail.status === 'Draft' && <><button type="button" onClick={openEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-steel-200 px-3 py-2 text-[10px] font-bold text-steel-700 hover:bg-steel-50"><Edit3 className="h-3.5 w-3.5" />Edit Draft</button><button type="button" onClick={() => void markOrdered()} disabled={submitting} className="inline-flex items-center gap-1.5 rounded-lg bg-[#2F7D5A] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#256548] disabled:opacity-60"><Send className="h-3.5 w-3.5" />Mark Ordered</button></>}
                  {!['Received','Cancelled'].includes(detail.status) && <button type="button" onClick={() => void cancelOrder()} disabled={submitting} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-[10px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"><X className="h-3.5 w-3.5" />{Number(detail.received_quantity || 0) > 0 ? 'Cancel Remaining' : 'Cancel PO'}</button>}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[['Ordered Qty', detail.ordered_quantity], ['Received Qty', detail.received_quantity], ['Remaining', detail.remaining_quantity], ['Expected Cost', peso(detail.expected_cost)], ['Actual Received Cost', peso(detail.actual_received_cost)]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-[#E1E9E4] bg-[#F8FBF9] p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-steel-400">{label}</p><p className="mt-1 text-sm font-bold text-[#17372D]">{String(value)}</p></div>)}
              </div>

              <div className="grid gap-3 sm:grid-cols-3 text-xs"><div><span className="font-bold text-steel-500">Expected delivery:</span><p className="mt-1 text-steel-800">{dateText(detail.expected_delivery_date)}</p></div><div><span className="font-bold text-steel-500">Ordered at:</span><p className="mt-1 text-steel-800">{dateTimeText(detail.ordered_at)}</p></div><div><span className="font-bold text-steel-500">Notes:</span><p className="mt-1 text-steel-800">{detail.notes || '—'}</p></div></div>

              <div className="overflow-hidden rounded-xl border border-[#DDE6E0]">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-[#F2F7F4] text-[9px] uppercase tracking-wider text-steel-500"><tr><th className="px-3 py-3">Product</th><th className="px-3 py-3">Ordered</th><th className="px-3 py-3">Received</th><th className="px-3 py-3">Remaining</th><th className="px-3 py-3">Expected Cost</th><th className="px-3 py-3">Actual Avg Cost</th><th className="px-3 py-3">Action</th></tr></thead>
                    <tbody className="divide-y divide-steel-100">
                      {detailItems.map((item) => (
                        <tr key={item.purchase_order_item_id} className="hover:bg-[#FBFCFB]"><td className="px-3 py-3"><p className="font-semibold text-steel-900">{item.product_name}</p><p className="text-[10px] text-steel-400">Stock {item.current_stock} · {item.unit}</p></td><td className="px-3 py-3 font-semibold">{item.ordered_quantity}</td><td className="px-3 py-3 font-semibold text-emerald-700">{item.received_quantity}</td><td className="px-3 py-3 font-semibold text-amber-700">{item.remaining_quantity}</td><td className="px-3 py-3">{peso(item.expected_unit_cost)}</td><td className="px-3 py-3">{item.average_received_unit_cost === null ? '—' : peso(item.average_received_unit_cost)}</td><td className="px-3 py-3">{['Ordered','Partially Received'].includes(detail.status) && Number(item.remaining_quantity) > 0 ? <button type="button" onClick={() => onReceiveItem({ purchase_order_id: detail.purchase_order_id, po_number: detail.po_number, purchase_order_item_id: item.purchase_order_item_id, product_id: item.product_id, product_name: item.product_name, supplier_id: detail.supplier_id, supplier_name: detail.supplier_name, remaining_quantity: Number(item.remaining_quantity), expected_unit_cost: Number(item.expected_unit_cost), current_selling_price: Number(item.current_selling_price) })} className="inline-flex items-center gap-1 rounded-lg bg-[#EAF7EF] px-2.5 py-1.5 text-[10px] font-bold text-[#0D7740] hover:bg-[#DDF2E5]"><PackageCheck className="h-3.5 w-3.5" />Receive</button> : <span className="text-[10px] text-steel-400">—</span>}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target && !submitting) setShowForm(false); }}>
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-steel-100 bg-white px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2F7D5A]">{editingId ? 'Edit Draft' : 'New Purchase Order'}</p><h3 className="mt-1 text-xl font-bold text-[#17372D]">{editingId ? detail?.po_number : 'Prepare supplier order'}</h3></div><button type="button" onClick={() => !submitting && setShowForm(false)} className="rounded-lg p-2 text-steel-500 hover:bg-steel-50"><X className="h-5 w-5" /></button></div>
            <form onSubmit={submitForm} className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs font-bold uppercase tracking-wider text-steel-500">Supplier<select required value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="mt-1 w-full rounded-xl border border-steel-200 bg-white px-3 py-2.5 text-xs normal-case tracking-normal text-steel-900 outline-none focus:border-[#2F7D5A]"><option value="">Select active supplier</option>{suppliers.filter((supplier) => supplier.status === 'Active').map((supplier) => <option key={supplier.supplier_id} value={supplier.supplier_id}>{supplier.supplier_name}</option>)}</select></label>
                <label className="text-xs font-bold uppercase tracking-wider text-steel-500">Expected Delivery <span className="normal-case font-medium text-steel-400">(Optional)</span><input type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} className="mt-1 w-full rounded-xl border border-steel-200 px-3 py-2.5 text-xs normal-case tracking-normal outline-none focus:border-[#2F7D5A]" /></label>
              </div>
              <label className="block text-xs font-bold uppercase tracking-wider text-steel-500">Notes <span className="normal-case font-medium text-steel-400">(Optional)</span><textarea maxLength={500} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Supplier terms, special instructions, etc." className="mt-1 w-full rounded-xl border border-steel-200 px-3 py-2.5 text-xs normal-case tracking-normal outline-none focus:border-[#2F7D5A]" /></label>

              <div><div className="mb-3 flex items-center justify-between"><div><h4 className="text-sm font-bold text-[#17372D]">Products to Order</h4><p className="text-[11px] text-steel-500">Expected cost is for purchasing planning only. Actual received cost is recorded during Goods Receiving.</p></div><button type="button" onClick={() => setLines((current) => [...current, newLine()])} disabled={lines.length >= 100} className="inline-flex items-center gap-1.5 rounded-lg border border-[#CFE0D7] px-3 py-2 text-[10px] font-bold text-[#0D7740] hover:bg-[#EEF8F2] disabled:opacity-50"><Plus className="h-3.5 w-3.5" />Add Product</button></div>
                <div className="space-y-2">{lines.map((line, index) => <div key={line.key} className="grid gap-2 rounded-xl border border-[#E1E9E4] bg-[#FAFCFB] p-3 md:grid-cols-[minmax(0,1fr)_130px_170px_auto]"><select required value={line.product_id} onChange={(event) => updateLine(line.key, { product_id: event.target.value })} className="rounded-lg border border-steel-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#2F7D5A]"><option value="">Select product</option>{products.filter((product) => product.status === 'active' && (!selectedProductIds.has(product.id) || Number(line.product_id) === product.id)).map((product) => <option key={product.id} value={product.id}>{product.name} — Stock {product.stock}</option>)}</select><input type="number" min="1" step="1" required value={line.ordered_quantity} onChange={(event) => updateLine(line.key, { ordered_quantity: event.target.value })} placeholder="Qty" className="rounded-lg border border-steel-200 px-3 py-2 text-xs outline-none focus:border-[#2F7D5A]" /><input type="number" min="0.01" step="0.01" required value={line.expected_unit_cost} onChange={(event) => updateLine(line.key, { expected_unit_cost: event.target.value })} placeholder="Expected cost / unit" className="rounded-lg border border-steel-200 px-3 py-2 text-xs outline-none focus:border-[#2F7D5A]" /><button type="button" title={`Remove product line ${index + 1}`} disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((candidate) => candidate.key !== line.key))} className="inline-flex items-center justify-center rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></div>)}</div>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-[#DDE6E0] bg-[#F8FBF9] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-steel-400">Expected Purchase Cost</p><p className="mt-1 text-lg font-bold text-[#17372D]">{peso(expectedTotal)}</p></div><div className="flex gap-2"><button type="button" onClick={() => setShowForm(false)} disabled={submitting} className="rounded-xl border border-steel-200 px-4 py-2.5 text-xs font-bold text-steel-700 hover:bg-steel-50">Cancel</button><button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-[#2F7D5A] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#256548] disabled:opacity-60"><ShoppingCart className="h-4 w-4" />{submitting ? 'Saving…' : editingId ? 'Save Draft Changes' : 'Create Draft PO'}</button></div></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
