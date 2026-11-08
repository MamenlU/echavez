import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileText,
  RefreshCw,
  Search,
  Wallet,
  X,
} from 'lucide-react';

interface Expense {
  expense_id: number;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: 'Cash Drawer' | 'Card' | 'GCash' | 'Bank Transfer' | 'Other';
  reference_number: string | null;
  recorded_by_admin_id: number;
  recorded_by_name?: string | null;
  recorded_by_username?: string | null;
  shift_id: number | null;
  status: 'Recorded' | 'Voided';
  voided_by_admin_id: number | null;
  voided_by_name?: string | null;
  void_reason: string | null;
  voided_at: string | null;
  created_at: string;
}

interface ProfitSummary {
  from: string | null;
  to: string | null;
  gross_profit: number;
  service_delivery_revenue: number;
  operating_contribution: number;
  operating_expenses: number;
  expense_count: number;
  estimated_net_profit: number;
  label: string;
}

const formatPeso = (value: number | null | undefined) =>
  `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const toDateInput = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const today = () => toDateInput(new Date());
const monthStart = () => {
  const date = new Date();
  return toDateInput(new Date(date.getFullYear(), date.getMonth(), 1));
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

function SummaryCard({ label, value, help, emphasis = false }: {
  label: string;
  value: string;
  help: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${emphasis ? 'border-[#A9D6BE] bg-[#EEF8F2]' : 'border-[#DDE6E0] bg-white'}`}>
      <p className="text-[9px] font-extrabold uppercase tracking-[0.13em] text-[#71817A]">{label}</p>
      <p className="mt-2 text-xl font-extrabold text-[#17372D]">{value}</p>
      <p className="mt-1 text-[10px] leading-4 text-[#829188]">{help}</p>
    </div>
  );
}

export function ExpenseManagementPanel() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Recorded' | 'Voided'>('all');
  const [period, setPeriod] = useState<'month' | 'today' | 'all' | 'custom'>('month');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [voidTarget, setVoidTarget] = useState<Expense | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const [form, setForm] = useState({
    expenseDate: today(),
    category: 'Utilities',
    description: '',
    amount: '',
    paymentMethod: 'Cash Drawer',
    referenceNumber: '',
  });

  const rangeParams = () => {
    const params = new URLSearchParams();
    if (period === 'today') {
      params.set('from', today());
      params.set('to', today());
    } else if (period === 'month') {
      params.set('from', monthStart());
      params.set('to', today());
    } else if (period === 'custom') {
      if (from) params.set('from', from);
      if (to) params.set('to', to);
    }
    return params;
  };

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const params = rangeParams();
      params.set('includeVoided', 'true');
      params.set('limit', '1000');
      const [expenseResponse, summaryResponse, metaResponse] = await Promise.all([
        authFetch(`/api/expenses?${params.toString()}`),
        authFetch(`/api/expenses/summary?${rangeParams().toString()}`),
        authFetch('/api/expenses/meta'),
      ]);
      const expenseData = await expenseResponse.json().catch(() => ({}));
      const summaryData = await summaryResponse.json().catch(() => ({}));
      const metaData = await metaResponse.json().catch(() => ({}));
      if (!expenseResponse.ok) throw new Error(expenseData.error || 'Unable to load expenses.');
      if (!summaryResponse.ok) throw new Error(summaryData.error || 'Unable to load estimated net profit.');
      if (!metaResponse.ok) throw new Error(metaData.error || 'Unable to load expense options.');
      setExpenses(Array.isArray(expenseData.expenses) ? expenseData.expenses : []);
      setSummary(summaryData.summary || null);
      setCategories(Array.isArray(metaData.categories) ? metaData.categories : []);
      setPaymentMethods(Array.isArray(metaData.payment_methods) ? metaData.payment_methods : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Expense Management.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // Explicit period refresh only; form/search edits do not call the API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const submitExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const amount = Number(form.amount);
    if (!form.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError('Enter a description and a valid expense amount greater than ₱0.00.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await authFetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to record expense.');
      setSuccess('Operating expense recorded successfully.');
      setForm((current) => ({
        ...current,
        expenseDate: today(),
        description: '',
        amount: '',
        referenceNumber: '',
      }));
      await loadAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to record expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const voidExpense = async () => {
    if (!voidTarget) return;
    if (!voidReason.trim()) {
      setError('Enter a reason before voiding the expense.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const response = await authFetch(`/api/expenses/${voidTarget.expense_id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to void expense.');
      setSuccess(`Expense #${voidTarget.expense_id} was voided and excluded from estimated net profit.`);
      setVoidTarget(null);
      setVoidReason('');
      await loadAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to void expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    const term = search.trim().toLowerCase();
    return expenses.filter((expense) => {
      if (statusFilter !== 'all' && expense.status !== statusFilter) return false;
      if (!term) return true;
      return [expense.category, expense.description, expense.payment_method, expense.reference_number, expense.recorded_by_name, expense.recorded_by_username]
        .some((value) => String(value || '').toLowerCase().includes(term));
    });
  }, [expenses, search, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#15803d]">Operating Costs &amp; Profitability</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold text-[#17372D]">Expense Management &amp; Estimated Net Profit</h2>
          <p className="mt-1 max-w-4xl text-sm text-[#71817A]">
            Record operating expenses separately from inventory purchases, then estimate business profit using verified sales, COGS, service/delivery revenue, and recorded operating costs.
          </p>
        </div>
        <button type="button" onClick={() => void loadAll()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DDE6E0] bg-white px-4 py-2.5 text-xs font-bold text-[#2F7D5A] transition hover:bg-[#F7FBF8] disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
        <strong>Financial rule:</strong> supplier inventory purchases belong to inventory/COGS and must not be recorded again as operating expenses. Estimated Net Profit = Gross Profit + Service/Delivery Revenue − Recorded Operating Expenses. This remains a management estimate, not a full accounting or tax statement.
      </div>

      {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {success && <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{success}</div>}

      <section className="rounded-2xl border border-[#DDE6E0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="font-display text-base font-extrabold text-[#17372D]">Profitability Period</h3>
            <p className="mt-1 text-xs text-[#71817A]">Sales and expenses use the same selected date period.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {([['today', 'Today'], ['month', 'This Month'], ['all', 'All Time'], ['custom', 'Custom']] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setPeriod(value)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${period === value ? 'border-[#2F7D5A] bg-[#2F7D5A] text-white' : 'border-[#DDE6E0] bg-white text-[#52635B]'}`}>{label}</button>
            ))}
          </div>
        </div>
        {period === 'custom' && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-xs font-bold text-[#34463F]">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-xl border border-[#DDE6E0] px-3 py-2" /></label>
            <label className="text-xs font-bold text-[#34463F]">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-xl border border-[#DDE6E0] px-3 py-2" /></label>
            <button type="button" onClick={() => void loadAll()} className="rounded-xl bg-[#2F7D5A] px-4 py-2.5 text-xs font-bold text-white">Apply Dates</button>
          </div>
        )}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="Gross Profit" value={formatPeso(summary?.gross_profit)} help="Net merchandise sales minus COGS." />
          <SummaryCard label="Service / Delivery Revenue" value={formatPeso(summary?.service_delivery_revenue)} help="Net service and delivery fees." />
          <SummaryCard label="Operating Contribution" value={formatPeso(summary?.operating_contribution)} help="Gross profit plus service/delivery revenue." />
          <SummaryCard label="Operating Expenses" value={formatPeso(summary?.operating_expenses)} help={`${summary?.expense_count || 0} active expense record(s).`} />
          <SummaryCard label="Estimated Net Profit" value={formatPeso(summary?.estimated_net_profit)} help="Management estimate after operating expenses." emphasis />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.85fr_1.4fr]">
        <form onSubmit={submitExpense} className="rounded-2xl border border-[#DDE6E0] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF8F2] text-[#2F7D5A]"><CircleDollarSign className="h-5 w-5" /></span><div><h3 className="font-display text-base font-extrabold text-[#17372D]">Record Operating Expense</h3><p className="mt-1 text-xs text-[#71817A]">Inventory purchases are excluded from this module.</p></div></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-[#34463F]">Expense Date<input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#DDE6E0] px-3 py-2.5" /></label>
            <label className="text-xs font-bold text-[#34463F]">Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#DDE6E0] bg-white px-3 py-2.5">{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="sm:col-span-2 text-xs font-bold text-[#34463F]">Description<input value={form.description} maxLength={255} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Example: October electricity bill" className="mt-1.5 w-full rounded-xl border border-[#DDE6E0] px-3 py-2.5" /></label>
            <label className="text-xs font-bold text-[#34463F]">Amount<input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="mt-1.5 w-full rounded-xl border border-[#DDE6E0] px-3 py-2.5" /></label>
            <label className="text-xs font-bold text-[#34463F]">Payment Method<select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#DDE6E0] bg-white px-3 py-2.5">{paymentMethods.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="sm:col-span-2 text-xs font-bold text-[#34463F]">Reference Number (optional)<input value={form.referenceNumber} maxLength={150} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} placeholder="Receipt, bill, transfer, or internal reference" className="mt-1.5 w-full rounded-xl border border-[#DDE6E0] px-3 py-2.5" /></label>
          </div>
          {form.paymentMethod === 'Cash Drawer' && <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900"><Wallet className="mr-1 inline h-4 w-4" /> Cash Drawer expenses require an open Cashier Shift and reduce that shift's expected drawer cash.</div>}
          <button type="submit" disabled={submitting} className="mt-5 w-full rounded-xl bg-[#2F7D5A] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{submitting ? 'Recording…' : 'Record Expense'}</button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-[#DDE6E0] bg-white shadow-sm">
          <div className="border-b border-[#DDE6E0] p-5"><h3 className="font-display text-base font-extrabold text-[#17372D]">Expense History</h3><p className="mt-1 text-xs text-[#71817A]">Voided expenses remain visible for accountability but are excluded from Estimated Net Profit.</p></div>
          <div className="grid gap-3 border-b border-[#DDE6E0] p-4 md:grid-cols-[1fr_180px]">
            <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#829188]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description, category, method, reference..." className="w-full rounded-xl border border-[#DDE6E0] py-2.5 pl-9 pr-3 text-xs" /></label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="rounded-xl border border-[#DDE6E0] bg-white px-3 py-2.5 text-xs"><option value="all">All statuses</option><option value="Recorded">Recorded</option><option value="Voided">Voided</option></select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full text-left text-xs">
              <thead className="bg-[#F3F8F5] text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#66766F]"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Category / Description</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Shift</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead>
              <tbody>
                {filteredExpenses.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-[#71817A]">No expense records match this period/filter.</td></tr> : filteredExpenses.map((expense) => (
                  <tr key={expense.expense_id} className="border-t border-[#EDF2EF] text-[#34463F]">
                    <td className="px-4 py-3 whitespace-nowrap">{expense.expense_date}</td>
                    <td className="px-4 py-3"><div className="font-bold text-[#17372D]">{expense.category}</div><div className="mt-1 max-w-[320px] text-[10px] text-[#71817A]">{expense.description}</div></td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" />{expense.payment_method}</span></td>
                    <td className="px-4 py-3">{expense.reference_number || '—'}</td>
                    <td className="px-4 py-3">{expense.shift_id ? `#${expense.shift_id}` : '—'}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatPeso(expense.amount)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${expense.status === 'Recorded' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{expense.status}</span>{expense.status === 'Voided' && expense.void_reason && <div className="mt-1 max-w-[180px] text-[9px] text-[#8A9892]">{expense.void_reason}</div>}</td>
                    <td className="px-4 py-3">{expense.status === 'Recorded' ? <button type="button" onClick={() => { setVoidTarget(expense); setVoidReason(''); }} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-[10px] font-bold text-red-700"><Ban className="h-3.5 w-3.5" />Void</button> : <span className="text-[10px] text-[#9AA6A0]">Preserved</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-[#DDE6E0] bg-[#F7FAF8] px-5 py-4 text-xs leading-5 text-[#52635B]"><FileText className="mr-1 inline h-4 w-4 text-[#2F7D5A]" /><strong>Scope reminder:</strong> this module estimates management profitability only. It does not implement payroll, tax filing, depreciation, accounts payable, or a general ledger.</div>

      {voidTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#E5ECE8] p-5"><div><p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-red-600">Void Expense</p><h3 className="mt-1 font-display text-lg font-extrabold text-[#17372D]">{voidTarget.category} · {formatPeso(voidTarget.amount)}</h3><p className="mt-1 text-xs text-[#71817A]">The record will remain in history and Audit Logs.</p></div><button type="button" onClick={() => setVoidTarget(null)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
            <div className="p-5"><label className="text-xs font-bold text-[#34463F]">Reason<textarea rows={3} maxLength={500} value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Explain why this expense record must be voided." className="mt-1.5 w-full resize-none rounded-xl border border-[#DDE6E0] px-3 py-2.5" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setVoidTarget(null)} className="rounded-xl border border-[#DDE6E0] px-4 py-2.5 text-xs font-bold">Cancel</button><button type="button" onClick={() => void voidExpense()} disabled={submitting} className="rounded-xl bg-red-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{submitting ? 'Voiding…' : 'Void Expense'}</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
}
