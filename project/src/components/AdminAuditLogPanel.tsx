import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Eye, RefreshCw, Search, ShieldCheck, X } from 'lucide-react';

type AuditData = Record<string, unknown> | null;

interface AuditLogEntry {
  audit_id: number;
  admin_id: number;
  admin_username: string;
  admin_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  before_data: AuditData;
  after_data: AuditData;
  reason: string | null;
  created_at: string;
}

interface AuditResponse {
  logs: AuditLogEntry[];
  count: number;
  limit: number;
}

const actionLabels: Record<string, string> = {
  'inventory.adjust': 'Stock Adjustment',
  'inventory.receive': 'Stock Receiving',
  'product.create': 'Product Created',
  'product.update': 'Product Updated',
  'product.price_update': 'Price Changed',
  'product.status_change': 'Product Status Changed',
  'sale.return': 'Sale Return / Refund',
  'sale.void': 'POS Sale Voided',
  'purchase_order.create': 'Purchase Order Created',
  'purchase_order.update': 'Purchase Order Updated',
  'purchase_order.order': 'Purchase Order Placed',
  'purchase_order.receive': 'Purchase Order Received',
  'purchase_order.cancel': 'Purchase Order Cancelled',
  'supplier.create': 'Supplier Created',
  'supplier.update': 'Supplier Updated',
  'supplier.lead_time_update': 'Supplier Lead Time Changed',
  'cash_shift.open': 'Cashier Shift Opened',
  'cash_shift.close': 'Cashier Shift Closed',
  'expense.create': 'Expense Recorded',
  'expense.void': 'Expense Voided',
  'supplier.status_change': 'Supplier Status Changed',
};

const entityLabels: Record<string, string> = {
  product: 'Product',
  sale: 'Sale',
  sale_adjustment: 'Sale Adjustment',
  order: 'Order',
  purchase_order: 'Purchase Order',
  cashier_shift: 'Cashier Shift',
  expense: 'Expense',
  supplier: 'Supplier',
};

const formatDateTime = (value: string) => {
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

const formatAuditData = (data: AuditData) => {
  if (!data || Object.keys(data).length === 0) return 'No recorded values.';
  return JSON.stringify(data, null, 2);
};

export function AdminAuditLogPanel() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const loadLogs = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Your Admin session has expired. Please log in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ limit: '200' });
      if (search.trim()) params.set('search', search.trim());
      if (action) params.set('action', action);
      if (entityType) params.set('entity_type', entityType);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);

      const response = await fetch(`/api/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.assign('/login');
        return;
      }

      const data = (await response.json().catch(() => ({}))) as Partial<AuditResponse> & {
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || 'Unable to load audit logs.');

      setLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
    // Initial history load only. Filters are applied explicitly so typing does not spam the API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableActions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.action))).sort(),
    [logs]
  );
  const availableEntityTypes = useMemo(
    () => Array.from(new Set(logs.map((log) => log.entity_type))).sort(),
    [logs]
  );

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2F7D5A]">
            Security &amp; Accountability
          </p>
          <h2 className="mt-1 text-2xl font-bold font-display text-steel-950">Audit Logs</h2>
          <p className="mt-1 max-w-3xl text-sm text-steel-500">
            Review meaningful Admin changes to products, inventory, purchasing, expenses, and sensitive sales adjustments. Routine page views and harmless interactions are intentionally not logged.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadLogs()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#CFE0D7] bg-white px-4 py-2.5 text-xs font-bold text-[#0D7740] transition hover:bg-[#EEF8F2] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-[#DDE6E0] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1.5fr)_minmax(170px,0.8fr)_minmax(150px,0.7fr)_150px_150px_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search action, record, summary, or Admin..."
              className="w-full rounded-xl border border-steel-200 bg-white py-2.5 pl-9 pr-3 text-xs text-steel-900 outline-none focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/15"
            />
          </label>

          <select
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className="rounded-xl border border-steel-200 bg-white px-3 py-2.5 text-xs text-steel-800 outline-none focus:border-[#2F7D5A]"
          >
            <option value="">All actions</option>
            {availableActions.map((value) => (
              <option key={value} value={value}>{actionLabels[value] || value}</option>
            ))}
          </select>

          <select
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
            className="rounded-xl border border-steel-200 bg-white px-3 py-2.5 text-xs text-steel-800 outline-none focus:border-[#2F7D5A]"
          >
            <option value="">All records</option>
            {availableEntityTypes.map((value) => (
              <option key={value} value={value}>{entityLabels[value] || value}</option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) => setDateFrom(event.target.value)}
            title="From date"
            className="rounded-xl border border-steel-200 bg-white px-3 py-2.5 text-xs text-steel-800 outline-none focus:border-[#2F7D5A]"
          />

          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => setDateTo(event.target.value)}
            title="To date"
            className="rounded-xl border border-steel-200 bg-white px-3 py-2.5 text-xs text-steel-800 outline-none focus:border-[#2F7D5A]"
          />

          <button
            type="button"
            onClick={() => void loadLogs()}
            disabled={loading}
            className="rounded-xl bg-[#2F7D5A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#256548] disabled:opacity-60"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#DDE6E0] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-steel-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#2F7D5A]" />
            <div>
              <h3 className="text-sm font-bold text-[#17372D]">Sensitive Activity History</h3>
              <p className="text-[11px] text-steel-500">Showing {logs.length} most recent matching record(s).</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-steel-500">
            <RefreshCw className="h-4 w-4 animate-spin" /> Loading audit history…
          </div>
        ) : logs.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
            <ShieldCheck className="h-8 w-8 text-steel-300" />
            <p className="mt-3 text-sm font-semibold text-steel-700">No matching audit records yet.</p>
            <p className="mt-1 text-xs text-steel-500">New sensitive Admin actions will appear here after Phase 3 is active.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#F4F8F5] text-[10px] uppercase tracking-wider text-[#60756B]">
                <tr>
                  <th className="px-4 py-3">Date &amp; Time</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Record</th>
                  <th className="px-4 py-3">Summary</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100">
                {logs.map((log) => (
                  <tr key={log.audit_id} className="align-top hover:bg-[#FAFCFA]">
                    <td className="whitespace-nowrap px-4 py-3 text-steel-600">{formatDateTime(log.created_at)}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-steel-900">{log.admin_name?.trim() || log.admin_username}</p>
                      <p className="text-[10px] text-steel-400">@{log.admin_username}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-steel-600">
                      <span className="font-semibold">{entityLabels[log.entity_type] || log.entity_type}</span>
                      {log.entity_id && <span className="block text-[10px] text-steel-400">ID {log.entity_id}</span>}
                    </td>
                    <td className="max-w-md px-4 py-3 text-steel-700">
                      <p>{log.summary}</p>
                      {log.reason && <p className="mt-1 text-[10px] text-steel-400">Reason: {log.reason}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 rounded-lg border border-steel-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#2F7D5A] hover:bg-[#EEF8F2]"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between border-b border-steel-100 bg-white px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#2F7D5A]">Audit #{selectedLog.audit_id}</p>
                <h3 className="mt-1 text-lg font-bold text-steel-950">{selectedLog.summary}</h3>
                <p className="mt-1 text-xs text-steel-500">{formatDateTime(selectedLog.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-2 text-steel-500 hover:bg-steel-100"
                aria-label="Close audit details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-steel-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-steel-400">Admin</p>
                  <p className="mt-1 text-xs font-semibold text-steel-800">{selectedLog.admin_name?.trim() || selectedLog.admin_username}</p>
                </div>
                <div className="rounded-xl bg-steel-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-steel-400">Action</p>
                  <p className="mt-1 text-xs font-semibold text-steel-800">{actionLabels[selectedLog.action] || selectedLog.action}</p>
                </div>
                <div className="rounded-xl bg-steel-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-steel-400">Record</p>
                  <p className="mt-1 text-xs font-semibold text-steel-800">{entityLabels[selectedLog.entity_type] || selectedLog.entity_type}{selectedLog.entity_id ? ` #${selectedLog.entity_id}` : ''}</p>
                </div>
              </div>

              {selectedLog.reason && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700">Reason / Context</p>
                  <p className="mt-1 text-xs text-amber-900">{selectedLog.reason}</p>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-steel-500">Before</h4>
                  <pre className="min-h-36 overflow-x-auto whitespace-pre-wrap rounded-xl bg-[#F7F9F8] p-4 text-[11px] leading-5 text-steel-700">{formatAuditData(selectedLog.before_data)}</pre>
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-steel-500">After</h4>
                  <pre className="min-h-36 overflow-x-auto whitespace-pre-wrap rounded-xl bg-[#F7F9F8] p-4 text-[11px] leading-5 text-steel-700">{formatAuditData(selectedLog.after_data)}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
