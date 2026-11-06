import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Package,
  RefreshCw,
  Search,
} from 'lucide-react';

type ReorderStatus =
  | 'Critical'
  | 'High'
  | 'Reorder Soon'
  | 'Covered by PO'
  | 'Setup Required'
  | 'Healthy';

interface ReorderSuggestion {
  product_id: number;
  product_name: string;
  barcode: string | null;
  unit: string | null;
  category: string | null;
  supplier_id: number | null;
  supplier_name: string | null;
  supplier_status: string | null;
  lead_time_days: number | null;
  current_stock: number;
  reorder_level: number;
  net_units_sold_30d: number;
  average_daily_demand: number;
  outstanding_po_quantity: number;
  projected_available: number;
  demand_during_lead_time: number | null;
  reorder_point: number;
  target_stock: number;
  suggested_order_quantity: number;
  expected_stock_at_arrival: number | null;
  days_of_stock: number | null;
  status: ReorderStatus;
  setup_issue: string | null;
}

interface ReorderSummary {
  total_products: number;
  needs_reorder: number;
  covered_by_po: number;
  setup_required: number;
  healthy: number;
  total_suggested_units: number;
}

interface ReorderResponse {
  generated_at: string;
  lookback_days: number;
  coverage_days: number;
  summary: ReorderSummary;
  suggestions: ReorderSuggestion[];
}

interface ReorderSuggestionsPanelProps {
  onOpenPurchaseOrders: () => void;
  onManageSuppliers: () => void;
  onManageProducts: () => void;
}

const statusOrder: ReorderStatus[] = [
  'Critical',
  'High',
  'Reorder Soon',
  'Covered by PO',
  'Setup Required',
  'Healthy',
];

const statusClass: Record<ReorderStatus, string> = {
  Critical: 'border-red-200 bg-red-50 text-red-700',
  High: 'border-orange-200 bg-orange-50 text-orange-700',
  'Reorder Soon': 'border-amber-200 bg-amber-50 text-amber-700',
  'Covered by PO': 'border-blue-200 bg-blue-50 text-blue-700',
  'Setup Required': 'border-slate-200 bg-slate-50 text-slate-700',
  Healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const formatNumber = (value: number, maximumFractionDigits = 2) =>
  Number(value || 0).toLocaleString('en-PH', { maximumFractionDigits });

export function ReorderSuggestionsPanel({
  onOpenPurchaseOrders,
  onManageSuppliers,
  onManageProducts,
}: ReorderSuggestionsPanelProps) {
  const [data, setData] = useState<ReorderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReorderStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchSuggestions = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.assign('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/reorder-suggestions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const body = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) {
        window.location.assign('/login');
        return;
      }
      if (!response.ok) {
        throw new Error(body.error || 'Unable to load reorder suggestions.');
      }

      setData(body as ReorderResponse);
    } catch (err) {
      console.error('Reorder suggestion load error:', err);
      setError(err instanceof Error ? err.message : 'Unable to load reorder suggestions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSuggestions();
  }, []);

  const categories = useMemo(() => {
    const values = new Set<string>();
    for (const suggestion of data?.suggestions || []) {
      if (suggestion.category) values.add(suggestion.category);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.suggestions || []).filter((suggestion) => {
      const matchesSearch = !query || [
        suggestion.product_name,
        suggestion.barcode || '',
        suggestion.category || '',
        suggestion.supplier_name || '',
      ].some((value) => value.toLowerCase().includes(query));

      const matchesStatus = statusFilter === 'all' || suggestion.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || suggestion.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    }).sort((a, b) => {
      const statusDifference = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
      if (statusDifference !== 0) return statusDifference;
      return a.product_name.localeCompare(b.product_name);
    });
  }, [data, search, statusFilter, categoryFilter]);

  const summary = data?.summary || {
    total_products: 0,
    needs_reorder: 0,
    covered_by_po: 0,
    setup_required: 0,
    healthy: 0,
    total_suggested_units: 0,
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#15803d]">
            Inventory Planning
          </p>
          <h2 className="mt-1 font-display text-2xl font-extrabold text-[#17372D]">
            Reorder Suggestions
          </h2>
          <p className="mt-1 max-w-4xl text-sm text-[#71817A]">
            Review explainable restocking recommendations using current stock, net sales from the last 30 days,
            supplier lead time, reorder level, and quantities already covered by open Purchase Orders.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchSuggestions()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DDE6E0] bg-white px-4 py-2.5 text-xs font-bold text-[#2F7D5A] transition hover:bg-[#F7FBF8] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        <span className="font-bold">Planning rule:</span> suggestions never change stock and never create or place a Purchase Order automatically.
        Admin reviews the recommendation first. Actual inventory still increases only through Receive Stock.
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Active Products" value={summary.total_products} icon={<Package className="h-4 w-4" />} />
        <SummaryCard label="Need Reorder" value={summary.needs_reorder} icon={<AlertTriangle className="h-4 w-4" />} />
        <SummaryCard label="Covered by Open PO" value={summary.covered_by_po} icon={<ClipboardList className="h-4 w-4" />} />
        <SummaryCard label="Setup Required" value={summary.setup_required} icon={<AlertTriangle className="h-4 w-4" />} />
        <SummaryCard label="Healthy" value={summary.healthy} icon={<CheckCircle className="h-4 w-4" />} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#DDE6E0] bg-white shadow-sm">
        <div className="space-y-4 border-b border-[#DDE6E0] p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="font-display text-base font-extrabold text-[#17372D]">Product Replenishment Review</h3>
              <p className="mt-1 text-xs text-[#71817A]">
                Demand window: {data?.lookback_days || 30} days. Coverage target after lead time: {data?.coverage_days || 30} days.
              </p>
            </div>
            <div className="text-xs font-semibold text-[#71817A]">
              Suggested units across all active products: {formatNumber(summary.total_suggested_units, 0)}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71817A]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search product, barcode, supplier..."
                className="w-full rounded-xl border border-[#DDE6E0] bg-white py-2.5 pl-9 pr-3 text-sm text-[#34463F] outline-none focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/20"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | ReorderStatus)}
              className="rounded-xl border border-[#DDE6E0] bg-white px-3 py-2.5 text-sm text-[#34463F] outline-none focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/20"
            >
              <option value="all">All recommendation states</option>
              {statusOrder.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-xl border border-[#DDE6E0] bg-white px-3 py-2.5 text-sm text-[#34463F] outline-none focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/20"
            >
              <option value="all">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center p-8 text-sm font-semibold text-[#71817A]">
            Calculating reorder suggestions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-72 items-center justify-center p-8 text-sm text-[#71817A]">
            No products match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1320px] w-full text-left text-xs">
              <thead className="bg-[#F2F7F3] text-[10px] uppercase tracking-[0.08em] text-[#667970]">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Supplier / Lead Time</th>
                  <th className="px-4 py-3 text-right">Current</th>
                  <th className="px-4 py-3 text-right">Reorder Level</th>
                  <th className="px-4 py-3 text-right">Net Sold 30d</th>
                  <th className="px-4 py-3 text-right">Avg / Day</th>
                  <th className="px-4 py-3 text-right">Incoming PO</th>
                  <th className="px-4 py-3 text-right">Reorder Point</th>
                  <th className="px-4 py-3 text-right">Suggested Qty</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EEE8]">
                {filtered.map((item) => (
                  <tr key={item.product_id} className="align-top hover:bg-[#FBFDFB]">
                    <td className="px-4 py-4">
                      <div className="font-bold text-[#17372D]">{item.product_name}</div>
                      <div className="mt-1 text-[11px] text-[#71817A]">
                        {item.category || 'Uncategorized'}{item.barcode ? ` · ${item.barcode}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-[#34463F]">{item.supplier_name || 'Not assigned'}</div>
                      <div className="mt-1 text-[11px] text-[#71817A]">
                        {item.lead_time_days === null ? 'Lead time not set' : `${item.lead_time_days} day(s)`}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-[#17372D]">{formatNumber(item.current_stock, 0)}</td>
                    <td className="px-4 py-4 text-right">{formatNumber(item.reorder_level, 0)}</td>
                    <td className="px-4 py-4 text-right">{formatNumber(item.net_units_sold_30d, 0)}</td>
                    <td className="px-4 py-4 text-right">{formatNumber(item.average_daily_demand, 2)}</td>
                    <td className="px-4 py-4 text-right font-semibold text-blue-700">{formatNumber(item.outstanding_po_quantity, 0)}</td>
                    <td className="px-4 py-4 text-right font-semibold">{formatNumber(item.reorder_point, 0)}</td>
                    <td className="px-4 py-4 text-right font-extrabold text-[#0D7740]">{formatNumber(item.suggested_order_quantity, 0)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusClass[item.status]}`}>
                        {item.status}
                      </span>
                      {item.setup_issue && (
                        <p className="mt-2 max-w-48 text-[10px] leading-4 text-[#71817A]">{item.setup_issue}</p>
                      )}
                      {!item.setup_issue && item.days_of_stock !== null && (
                        <p className="mt-2 text-[10px] text-[#71817A]">Projected cover: {formatNumber(item.days_of_stock, 1)} day(s)</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {item.status === 'Setup Required' ? (
                        <button
                          type="button"
                          onClick={item.supplier_id ? onManageSuppliers : onManageProducts}
                          className="rounded-lg border border-[#DDE6E0] bg-white px-3 py-1.5 text-[10px] font-bold text-[#2F7D5A] hover:bg-[#F7FBF8]"
                        >
                          {item.supplier_id ? 'Manage Supplier' : 'Assign Supplier'}
                        </button>
                      ) : item.suggested_order_quantity > 0 ? (
                        <button
                          type="button"
                          onClick={onOpenPurchaseOrders}
                          className="rounded-lg bg-[#2F7D5A] px-3 py-1.5 text-[10px] font-bold text-white hover:bg-[#256849]"
                        >
                          Open Purchase Orders
                        </button>
                      ) : (
                        <span className="text-[10px] font-semibold text-[#8A9892]">No action needed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-[#DDE6E0] bg-[#F7FBF8] p-5 text-xs leading-5 text-[#566B62]">
        <p className="font-bold text-[#17372D]">How Rayjin calculates the recommendation</p>
        <p className="mt-1">
          Average Daily Demand = net units sold during the last 30 days ÷ 30. Reorder Point = Average Daily Demand × Supplier Lead Time + Product Reorder Level.
          Open Ordered/Partially Received Purchase Orders are treated as incoming stock. Suggested quantity replenishes projected stock toward lead-time demand plus a 30-day coverage target and the existing reorder level.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#DDE6E0] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[#2F7D5A]">
        {icon}
        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em]">{label}</span>
      </div>
      <div className="mt-2 font-display text-2xl font-extrabold text-[#17372D]">{formatNumber(value, 0)}</div>
    </div>
  );
}
