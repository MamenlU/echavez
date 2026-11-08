import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Eye, RefreshCw, Search, ShieldCheck, X } from 'lucide-react';
import { approvalDescription, staffIdentity, staffRoleLabel } from '../utils/staffIdentity';

type AuditData = Record<string, unknown> | null;

interface AuditLogEntry {
  audit_id: number;
  admin_id: number;
  admin_username: string;
  admin_name: string | null;
  admin_role?: string | null;
  actor_name?: string | null;
  actor_role?: string | null;
  actor_role_source?: 'at_action' | 'current_account';
  approval_status?: string;
  approved_by?: { id: number; name: string; username: string; role: string } | null;
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
  'staff.admin.create': 'Admin Account Created',
  'staff.admin.status': 'Admin Account Status Changed',
  'staff.cashier.create': 'Cashier Account Created',
  'staff.cashier.status': 'Cashier Account Status Changed',
  'staff.super_admin.bootstrap': 'Initial Super Admin Assigned',
  'approval.rejected': 'Approval Verification Failed',
  'pickup.arrival': 'Pickup Customer Arrival Verified',
  'pickup.handover': 'Pickup Order Handed Over',
  'order.status': 'Online Order Status Changed',
  'sale.pos.complete': 'POS Sale Completed',
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
  user: 'Staff Account',
  authorization: 'Authorization Attempt',
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
  if (!data || Object.keys(data).length === 0) return 'No values recorded for this event.';
  return JSON.stringify(data, null, 2);
};

const auditFieldLabel = (key: string) => key.replace(/_/g, ' ')
  .replace(/\b\w/g, letter => letter.toUpperCase())
  .replace(/\bId\b/g, 'ID').replace(/\bPos\b/g, 'POS');

const auditValueText = (key: string, value: unknown): string => {
  if (value == null) return 'Not recorded';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number' && /(amount|cash|fee|price|cost|refund|total|discrepancy)/i.test(key)) {
    return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return String(value);
};

function AuditReadableData({ data, emptyText }: { data: AuditData; emptyText: string }) {
  if (!data || Object.keys(data).length === 0) {
    return <div className="rounded-xl bg-[#F7F9F8] p-4 text-xs text-steel-600">{emptyText}</div>;
  }
  // Recursively flatten *only* the already-redacted audit snapshot; do not alter data.
  const entries: { label: string; key: string; value: unknown }[] = [];
  const walk = (current: Record<string, unknown>, prefix = '', depth = 0) => {
    for (const [key, value] of Object.entries(current)) {
      const label = `${prefix}${auditFieldLabel(key)}`;
      if (value && typeof value === 'object' && !Array.isArray(value) && depth < 4) {
        walk(value as Record<string, unknown>, `${label} · `, depth + 1);
      } else entries.push({ label, key, value: typeof value === 'object' && value !== null ? JSON.stringify(value) : value });
    }
  };
  walk(data);
  return <dl className="divide-y divide-[#E4ECE7] overflow-hidden rounded-xl border border-[#E4ECE7] bg-[#F7F9F8]">
    {entries.map(({label, key, value}, index) => <div key={`${label}-${index}`} className="grid grid-cols-1 gap-1 px-3 py-2.5 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.3fr)] sm:gap-3">
      <dt className="break-words text-[11px] font-semibold text-[#52645D]">{label}</dt>
      <dd className="break-words text-xs font-medium text-[#17372D]">{auditValueText(key, value)}</dd>
    </div>)}
  </dl>;
}

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
  const [showTechnicalJson, setShowTechnicalJson] = useState(false);
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);
  const detailDialogRef = useRef<HTMLDivElement | null>(null);
  const detailCloseRef = useRef<HTMLButtonElement | null>(null);

  // Keep the details dialog attached to the viewport, not the animated dashboard panel.
  // Restore scrolling and keyboard focus when the dialog closes.
  useEffect(() => {
    if (!selectedLog) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    detailCloseRef.current?.focus();

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedLog(null);
        return;
      }
      if (event.key !== 'Tab' || !detailDialogRef.current) return;

      const dialog = detailDialogRef.current;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleDialogKeyDown);

    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown);
      document.body.style.overflow = previousOverflow;
      if (detailTriggerRef.current?.isConnected) detailTriggerRef.current.focus();
    };
  }, [selectedLog]);

  const showDetails = (log: AuditLogEntry, trigger: HTMLButtonElement) => {
    detailTriggerRef.current = trigger;
    setShowTechnicalJson(false);
    setSelectedLog(log);
  };

  const loadLogs = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Your staff session has expired. Please log in again.');
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

      if (response.status === 401) {
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
            Review meaningful Cashier, Admin and Super Admin actions including POS, fulfillment, approvals, purchasing, expenses and adjustments. Routine page views and harmless interactions are intentionally not logged.
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
              placeholder="Search staff, role, action, record, or summary..."
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
            <p className="mt-1 text-xs text-steel-500">Meaningful staff activity will appear here as it is recorded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#F4F8F5] text-[10px] uppercase tracking-wider text-[#60756B]">
                <tr>
                  <th className="px-4 py-3">Date &amp; Time</th>
                  <th className="px-4 py-3">Performed By</th>
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
                      <p className="font-semibold text-steel-900">{log.actor_name || log.admin_name?.trim() || log.admin_username || `Staff #${log.admin_id}`}</p>
                      <p className="text-[10px] text-steel-500">{staffRoleLabel(log.actor_role || log.admin_role)}{log.actor_role_source === 'current_account' ? ' (current role)' : ''}</p>
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
                        onClick={(event) => showDetails(log, event.currentTarget)}
                        aria-haspopup="dialog"
                        aria-label={`View details for audit #${log.audit_id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-steel-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#2F7D5A] hover:bg-[#EEF8F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F7D5A]"
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

      {selectedLog && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 p-3 sm:p-6"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedLog(null); }}
        >
          <div
            ref={detailDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-details-title"
            aria-describedby="audit-details-date"
            tabIndex={-1}
            className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-steel-100 bg-white px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#2F7D5A]">Audit #{selectedLog.audit_id}</p>
                <h3 id="audit-details-title" className="mt-1 break-words text-base font-bold text-steel-950 sm:text-lg">{selectedLog.summary}</h3>
                <p id="audit-details-date" className="mt-1 text-xs text-steel-500">{formatDateTime(selectedLog.created_at)}</p>
              </div>
              <button
                type="button"
                ref={detailCloseRef}
                onClick={() => setSelectedLog(null)}
                className="shrink-0 rounded-lg p-2 text-steel-500 hover:bg-steel-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F7D5A]"
                aria-label="Close audit details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-steel-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-steel-400">Performed By</p>
                  <p className="mt-1 text-xs font-semibold text-steel-800">{staffIdentity(selectedLog.actor_name || selectedLog.admin_name || selectedLog.admin_username, selectedLog.actor_role || selectedLog.admin_role, selectedLog.admin_id)}</p>
                  {selectedLog.actor_role_source === 'current_account' && <p className="mt-1 text-[10px] text-amber-700">Current role; historical role not recorded</p>}
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

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#DDE6E0] bg-[#F7FAF8] p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-steel-400">Authorization Result</p>
                  <p className="mt-1 text-xs font-semibold text-steel-800">{selectedLog.approval_status === 'verification_failed' ? 'Approval verification failed' : selectedLog.approval_status === 'self_reauthenticated' ? 'Super Admin reauthenticated' : selectedLog.approval_status === 'approved' ? 'Approved' : selectedLog.approval_status === 'not_required' ? 'Not required' : 'No separate approval recorded'}</p>
                </div>
                <div className="rounded-xl border border-[#DDE6E0] bg-[#F7FAF8] p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-steel-400">Authorized By</p>
                  <p className="mt-1 text-xs font-semibold text-steel-800">{selectedLog.approval_status === 'self_reauthenticated' ? 'Same Super Admin (fresh verification)' : selectedLog.approved_by ? staffIdentity(selectedLog.approved_by.name || selectedLog.approved_by.username, selectedLog.approved_by.role, selectedLog.approved_by.id) : approvalDescription(selectedLog.after_data?.approval as {status?: string} | null)}</p>
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
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-steel-500">Before — Previous Recorded Values</h4>
                  <AuditReadableData data={selectedLog.before_data} emptyText="No previous values recorded for this event." />
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-steel-500">After — Recorded Result</h4>
                  <AuditReadableData data={selectedLog.after_data} emptyText="No resulting values recorded for this event." />
                </div>
              </div>
              <div className="border-t border-steel-100 pt-3">
                <button type="button" aria-expanded={showTechnicalJson} onClick={() => setShowTechnicalJson(open => !open)} className="rounded-lg border border-steel-200 bg-white px-3 py-2 text-xs font-bold text-[#2F7D5A] hover:bg-[#EEF8F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F7D5A]">
                  {showTechnicalJson ? 'Hide Technical Details (JSON)' : 'View Technical Details (JSON)'}
                </button>
                {showTechnicalJson && <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div><h5 className="mb-1 text-xs font-bold">Before — JSON</h5><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[#F7F9F8] p-3 text-[11px]">{formatAuditData(selectedLog.before_data)}</pre></div>
                  <div><h5 className="mb-1 text-xs font-bold">After — JSON</h5><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[#F7F9F8] p-3 text-[11px]">{formatAuditData(selectedLog.after_data)}</pre></div>
                </div>}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
