import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  RefreshCw,
  Wallet,
} from 'lucide-react';

interface CashierShift {
  shift_id: number;
  admin_id: number;
  admin_name?: string | null;
  admin_username?: string | null;
  status: 'Open' | 'Closed';
  opened_at: string;
  closed_at: string | null;
  opening_cash: number;
  pos_transaction_count: number | null;
  cash_sales_amount: number | null;
  card_sales_amount: number | null;
  cash_refunds_amount: number | null;
  cash_expenses_amount: number | null;
  expected_cash: number | null;
  actual_cash: number | null;
  discrepancy: number | null;
  notes: string | null;
}

interface CurrentShiftResponse {
  has_open_shift: boolean;
  shift: CashierShift | null;
}

interface ShiftHistoryResponse {
  shifts: CashierShift[];
}

interface CashierShiftPanelProps {
  onGoToPos: () => void;
}

const formatPeso = (value: number | null | undefined) =>
  `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
};

const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  if (!token) {
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

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.assign('/login');
    throw new Error('Admin session expired.');
  }

  return response;
};

function SummaryCard({
  label,
  value,
  icon,
  emphasis = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${emphasis ? 'border-[#A9D6BE] bg-[#EEF8F2]' : 'border-[#DDE6E0] bg-white'}`}>
      <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#71817A]">
        <span className="text-[#2F7D5A]">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-xl font-extrabold text-[#17372D]">{value}</p>
    </div>
  );
}

export function CashierShiftPanel({ onGoToPos }: CashierShiftPanelProps) {
  const [current, setCurrent] = useState<CashierShift | null>(null);
  const [history, setHistory] = useState<CashierShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openingCash, setOpeningCash] = useState('');
  const [openNotes, setOpenNotes] = useState('');
  const [actualCash, setActualCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [currentResponse, historyResponse] = await Promise.all([
        authFetch('/api/cashier-shifts/current'),
        authFetch('/api/cashier-shifts/history?limit=50'),
      ]);
      const currentData = (await currentResponse.json().catch(() => ({}))) as Partial<CurrentShiftResponse> & { error?: string };
      const historyData = (await historyResponse.json().catch(() => ({}))) as Partial<ShiftHistoryResponse> & { error?: string };
      if (!currentResponse.ok) throw new Error(currentData.error || 'Unable to load current Cashier Shift.');
      if (!historyResponse.ok) throw new Error(historyData.error || 'Unable to load Cashier Shift history.');
      setCurrent(currentData.shift || null);
      setHistory(Array.isArray(historyData.shifts) ? historyData.shifts : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Cashier Shift module.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const reconciliationPreview = useMemo(() => {
    if (!current || !actualCash.trim()) return null;
    const actual = Number(actualCash);
    if (!Number.isFinite(actual) || actual < 0) return null;
    const expected = Number(current.expected_cash || 0);
    return {
      actual,
      discrepancy: Number((actual - expected).toFixed(2)),
    };
  }, [current, actualCash]);

  const openShift = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const amount = Number(openingCash);
    if (!openingCash.trim() || !Number.isFinite(amount) || amount < 0) {
      setError('Enter a valid non-negative opening cash balance.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await authFetch('/api/cashier-shifts/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingCash: amount, notes: openNotes.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to open Cashier Shift.');
      setSuccess('Cashier Shift opened. New POS sales can now be recorded under this shift.');
      setOpeningCash('');
      setOpenNotes('');
      await loadAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to open Cashier Shift.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeShift = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!current) return;
    setError('');
    setSuccess('');
    const amount = Number(actualCash);
    if (!actualCash.trim() || !Number.isFinite(amount) || amount < 0) {
      setError('Enter the actual cash physically counted before closing the shift.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await authFetch(`/api/cashier-shifts/${current.shift_id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualCash: amount, notes: closeNotes.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to close Cashier Shift.');
      setSuccess(`Cashier Shift #${current.shift_id} closed and reconciled successfully.`);
      setActualCash('');
      setCloseNotes('');
      await loadAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to close Cashier Shift.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#15803d]">Cash Control</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold text-[#17372D]">Cashier Shift &amp; Cash Reconciliation</h2>
          <p className="mt-1 max-w-4xl text-sm text-[#71817A]">
            Record the opening drawer balance, group new Onsite POS transactions into a shift, and compare expected cash with the actual cash counted at closing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAll()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DDE6E0] bg-white px-4 py-2.5 text-xs font-bold text-[#2F7D5A] transition hover:bg-[#F7FBF8] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
        <span className="font-bold">Cash-control rule:</span> opening cash is not sales revenue. Expected drawer cash is Opening Cash + Cash POS Sales − Cash Refunds − Cash Drawer Expenses. Card sales are shown for shift reporting but do not increase the physical cash drawer. Historical pre-Phase-7 sales remain valid with no shift assignment.
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {success}
        </div>
      )}

      {!current ? (
        <section className="grid gap-5 rounded-2xl border border-[#DDE6E0] bg-white p-5 shadow-sm xl:grid-cols-[1fr_0.9fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF8F2] text-[#2F7D5A]"><Wallet className="h-5 w-5" /></span>
              <div>
                <h3 className="font-display text-base font-extrabold text-[#17372D]">No open Cashier Shift</h3>
                <p className="mt-1 text-xs text-[#71817A]">Open a shift before completing new Onsite POS transactions.</p>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-[#DDE6E0] bg-[#F7FAF8] p-4 text-xs leading-5 text-[#52635B]">
              Online orders do not belong to a cashier shift. Phase 7 only links new <strong>Onsite POS</strong> sales to the Admin's open shift. Cash refunds also require an open shift so drawer cash remains reconcilable.
            </div>
          </div>

          <form onSubmit={openShift} className="space-y-4 rounded-xl border border-[#DDE6E0] bg-[#FBFCFB] p-4">
            <label className="block text-xs font-bold text-[#34463F]">
              Opening Cash Balance
              <input
                type="number"
                min="0"
                step="0.01"
                value={openingCash}
                onChange={(event) => setOpeningCash(event.target.value)}
                placeholder="0.00"
                className="mt-1.5 w-full rounded-xl border border-[#DDE6E0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/15"
              />
            </label>
            <label className="block text-xs font-bold text-[#34463F]">
              Opening Note (optional)
              <textarea
                rows={2}
                maxLength={500}
                value={openNotes}
                onChange={(event) => setOpenNotes(event.target.value)}
                placeholder="Example: Morning drawer count verified."
                className="mt-1.5 w-full resize-none rounded-xl border border-[#DDE6E0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/15"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#2F7D5A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#256548] disabled:opacity-60"
            >
              {submitting ? 'Opening…' : 'Open Cashier Shift'}
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-[#BFE0CC] bg-[#F6FBF8] p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Open</span>
                  <span className="text-xs font-bold text-[#52635B]">Shift #{current.shift_id}</span>
                </div>
                <h3 className="mt-2 font-display text-xl font-extrabold text-[#17372D]">Current Cashier Shift</h3>
                <p className="mt-1 text-xs text-[#71817A]">Opened {formatDateTime(current.opened_at)} · {current.admin_name || current.admin_username || 'Admin'}</p>
              </div>
              <button type="button" onClick={onGoToPos} className="rounded-xl bg-[#2F7D5A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#256548]">
                Go to POS / New Sale
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-7">
              <SummaryCard label="Opening Cash" value={formatPeso(current.opening_cash)} icon={<Wallet className="h-4 w-4" />} />
              <SummaryCard label="Cash POS Sales" value={formatPeso(current.cash_sales_amount)} icon={<Banknote className="h-4 w-4" />} />
              <SummaryCard label="Card POS Sales" value={formatPeso(current.card_sales_amount)} icon={<CreditCard className="h-4 w-4" />} />
              <SummaryCard label="Cash Refunds" value={formatPeso(current.cash_refunds_amount)} icon={<RefreshCw className="h-4 w-4" />} />
              <SummaryCard label="Cash Drawer Expenses" value={formatPeso(current.cash_expenses_amount)} icon={<Wallet className="h-4 w-4" />} />
              <SummaryCard label="Expected Cash" value={formatPeso(current.expected_cash)} icon={<Banknote className="h-4 w-4" />} emphasis />
              <SummaryCard label="POS Transactions" value={String(current.pos_transaction_count || 0)} icon={<Clock className="h-4 w-4" />} />
            </div>
          </section>

          <section className="grid gap-5 rounded-2xl border border-[#DDE6E0] bg-white p-5 shadow-sm xl:grid-cols-[1fr_0.9fr]">
            <div>
              <h3 className="font-display text-base font-extrabold text-[#17372D]">Close &amp; Reconcile Shift</h3>
              <p className="mt-1 text-xs leading-5 text-[#71817A]">
                Physically count the cash drawer before closing. Rayjin compares the count with the expected balance and records any shortage or overage.
              </p>
              <div className="mt-4 rounded-xl border border-[#DDE6E0] bg-[#F7FAF8] p-4 text-xs text-[#52635B]">
                <div className="flex justify-between gap-3"><span>Opening Cash</span><strong>{formatPeso(current.opening_cash)}</strong></div>
                <div className="mt-2 flex justify-between gap-3"><span>+ Cash POS Sales</span><strong>{formatPeso(current.cash_sales_amount)}</strong></div>
                <div className="mt-2 flex justify-between gap-3"><span>− Cash Refunds</span><strong>{formatPeso(current.cash_refunds_amount)}</strong></div>
                <div className="mt-2 flex justify-between gap-3"><span>− Cash Drawer Expenses</span><strong>{formatPeso(current.cash_expenses_amount)}</strong></div>
                <div className="mt-3 border-t border-[#DDE6E0] pt-3 flex justify-between gap-3 text-[#17372D]"><span className="font-bold">Expected Cash</span><strong>{formatPeso(current.expected_cash)}</strong></div>
              </div>
            </div>

            <form onSubmit={closeShift} className="space-y-4">
              <label className="block text-xs font-bold text-[#34463F]">
                Actual Cash Counted
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={actualCash}
                  onChange={(event) => setActualCash(event.target.value)}
                  placeholder="0.00"
                  className="mt-1.5 w-full rounded-xl border border-[#DDE6E0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/15"
                />
              </label>

              {reconciliationPreview && (
                <div className={`rounded-xl border px-4 py-3 text-xs ${reconciliationPreview.discrepancy === 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                  <div className="flex justify-between gap-3"><span>Expected</span><strong>{formatPeso(current.expected_cash)}</strong></div>
                  <div className="mt-1 flex justify-between gap-3"><span>Actual</span><strong>{formatPeso(reconciliationPreview.actual)}</strong></div>
                  <div className="mt-2 border-t border-current/10 pt-2 flex justify-between gap-3">
                    <span className="font-bold">{reconciliationPreview.discrepancy === 0 ? 'Balanced' : reconciliationPreview.discrepancy > 0 ? 'Overage' : 'Shortage'}</span>
                    <strong>{formatPeso(Math.abs(reconciliationPreview.discrepancy))}</strong>
                  </div>
                </div>
              )}

              <label className="block text-xs font-bold text-[#34463F]">
                Closing Note (optional)
                <textarea
                  rows={2}
                  maxLength={500}
                  value={closeNotes}
                  onChange={(event) => setCloseNotes(event.target.value)}
                  placeholder="Example: End-of-day drawer count verified."
                  className="mt-1.5 w-full resize-none rounded-xl border border-[#DDE6E0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/15"
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[#17372D] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0E2B22] disabled:opacity-60"
              >
                {submitting ? 'Closing…' : 'Close & Reconcile Shift'}
              </button>
            </form>
          </section>
        </>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#DDE6E0] bg-white shadow-sm">
        <div className="border-b border-[#DDE6E0] p-5">
          <h3 className="font-display text-base font-extrabold text-[#17372D]">Recent Shift Reconciliations</h3>
          <p className="mt-1 text-xs text-[#71817A]">Closed shifts keep the exact reconciliation snapshot recorded at closing.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1040px] w-full text-left text-xs">
            <thead className="bg-[#F3F8F5] text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#66766F]">
              <tr>
                <th className="px-4 py-3">Shift</th>
                <th className="px-4 py-3">Opened / Closed</th>
                <th className="px-4 py-3 text-right">Opening</th>
                <th className="px-4 py-3 text-right">Cash Sales</th>
                <th className="px-4 py-3 text-right">Cash Refunds</th>
                <th className="px-4 py-3 text-right">Cash Expenses</th>
                <th className="px-4 py-3 text-right">Expected</th>
                <th className="px-4 py-3 text-right">Actual</th>
                <th className="px-4 py-3 text-right">Discrepancy</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-[#71817A]">No Cashier Shift history yet.</td></tr>
              ) : history.map((shift) => {
                const discrepancy = shift.discrepancy === null ? null : Number(shift.discrepancy);
                return (
                  <tr key={shift.shift_id} className="border-t border-[#EDF2EF] text-[#34463F]">
                    <td className="px-4 py-3 font-bold text-[#17372D]">#{shift.shift_id}</td>
                    <td className="px-4 py-3"><div>{formatDateTime(shift.opened_at)}</div><div className="mt-1 text-[10px] text-[#8A9892]">{shift.closed_at ? formatDateTime(shift.closed_at) : 'Still open'}</div></td>
                    <td className="px-4 py-3 text-right font-semibold">{formatPeso(shift.opening_cash)}</td>
                    <td className="px-4 py-3 text-right">{shift.cash_sales_amount === null ? '—' : formatPeso(shift.cash_sales_amount)}</td>
                    <td className="px-4 py-3 text-right">{shift.cash_refunds_amount === null ? '—' : formatPeso(shift.cash_refunds_amount)}</td>
                    <td className="px-4 py-3 text-right">{shift.cash_expenses_amount === null ? '—' : formatPeso(shift.cash_expenses_amount)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{shift.expected_cash === null ? '—' : formatPeso(shift.expected_cash)}</td>
                    <td className="px-4 py-3 text-right">{shift.actual_cash === null ? '—' : formatPeso(shift.actual_cash)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${discrepancy === null || discrepancy === 0 ? 'text-emerald-700' : discrepancy > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                      {discrepancy === null ? '—' : `${discrepancy === 0 ? '' : discrepancy > 0 ? '+' : '-'}${formatPeso(Math.abs(discrepancy))}`}
                    </td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${shift.status === 'Open' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{shift.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function CashierShiftStatusBanner({ onManageShift }: { onManageShift: () => void }) {
  const [shift, setShift] = useState<CashierShift | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/cashier-shifts/current');
      const data = (await response.json().catch(() => ({}))) as Partial<CurrentShiftResponse>;
      setShift(response.ok ? data.shift || null : null);
    } catch {
      setShift(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return <div className="rounded-xl border border-[#DDE6E0] bg-white px-4 py-3 text-xs text-[#71817A]">Checking Cashier Shift…</div>;
  }

  if (!shift) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between">
        <div><strong>Cashier Shift required.</strong> Open a shift before completing a new POS sale.</div>
        <button type="button" onClick={onManageShift} className="rounded-lg bg-amber-900 px-3 py-2 font-bold text-white">Open Cashier Shift</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <strong>Shift #{shift.shift_id} is open.</strong> Expected drawer cash: {formatPeso(shift.expected_cash)} · POS transactions: {shift.pos_transaction_count || 0}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => void load()} className="rounded-lg border border-emerald-300 bg-white px-3 py-2 font-bold text-emerald-800">Refresh</button>
        <button type="button" onClick={onManageShift} className="rounded-lg bg-[#2F7D5A] px-3 py-2 font-bold text-white">Manage Shift</button>
      </div>
    </div>
  );
}
