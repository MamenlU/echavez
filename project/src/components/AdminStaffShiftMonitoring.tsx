import { useEffect, useState } from 'react';
import { AlertTriangle, Eye, RefreshCw, ShieldCheck } from 'lucide-react';
import { approvalDescription, staffIdentity } from '../utils/staffIdentity';

interface Approval { status: string; id: number | null; name: string | null; role: string | null }
interface StaffShift {
  shift_id: number; shift_owner_id: number; shift_owner_name: string; shift_owner_role: string;
  status: 'Open' | 'Closed'; opened_at: string; closed_at: string | null;
  opening_cash: number; cash_sales_amount: number; card_sales_amount: number;
  cash_refunds_amount: number; cash_expenses_amount: number; expected_cash: number;
  actual_cash: number | null; discrepancy: number | null; pos_transaction_count: number;
  opening_approval?: Approval | null; closing_approval?: Approval | null;
}
const peso = (value: number | null) => value == null ? '—' : `₱${Number(value).toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
const date = (value: string | null) => value ? new Date(value).toLocaleString('en-PH') : '—';

export function AdminStaffShiftMonitoring() {
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [selected, setSelected] = useState<StaffShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/cashier-shifts/staff?limit=100', {
        headers: {Authorization: `Bearer ${localStorage.getItem('token') || ''}`},
      });
      if (response.status === 401) {
        localStorage.removeItem('token'); localStorage.removeItem('user');
        window.location.assign('/login'); return;
      }
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to load staff shifts.');
      setShifts(Array.isArray(result.shifts) ? result.shifts : []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load staff shifts.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const filtered = shifts.filter(shift => `${shift.shift_owner_name} ${shift.shift_owner_role} ${shift.shift_id} ${shift.status}`.toLowerCase().includes(filter.toLowerCase()));
  return <section className="rounded-2xl border border-[#DDE6E0] bg-white shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#DDE6E0] p-5">
      <div><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-700"/><h3 className="text-lg font-bold text-[#17372D]">Staff Shift Monitoring</h3></div>
        <p className="mt-1 text-xs text-slate-500">Read-only supervision of Cashier, Admin and Super Admin shifts. Approvers do not become shift owners.</p>
      </div>
      <button type="button" disabled={loading} onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold text-emerald-800"><RefreshCw className="h-4 w-4"/> Refresh</button>
    </div>
    <div className="p-5"><label className="block max-w-md text-xs font-semibold text-slate-700">Filter staff, role, status or shift
      <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Find staff shift…" className="mt-1 w-full rounded-xl border border-[#DDE6E0] px-3 py-2 text-sm" /></label></div>
    {error && <p role="alert" className="mx-5 mb-3 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertTriangle className="h-4 w-4"/>{error}</p>}
    {loading ? <p className="p-6 text-sm text-slate-500">Loading staff shifts…</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs">
      <thead className="bg-emerald-50/60 text-[10px] uppercase text-emerald-900"><tr><th className="p-3">Shift</th><th className="p-3">Shift Owner</th><th className="p-3">Opened / Closed</th><th className="p-3">Status</th><th className="p-3 text-right">Expected Cash</th><th className="p-3 text-right">Discrepancy</th><th className="p-3">Approval</th><th className="p-3">Details</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{filtered.map(shift => <tr key={shift.shift_id} className="hover:bg-emerald-50/30">
        <td className="p-3 font-bold">#{shift.shift_id}</td>
        <td className="p-3">{staffIdentity(shift.shift_owner_name, shift.shift_owner_role, shift.shift_owner_id)}</td>
        <td className="p-3"><div>{date(shift.opened_at)}</div><div className="mt-1 text-slate-500">{date(shift.closed_at)}</div></td>
        <td className="p-3">{shift.status}</td><td className="p-3 text-right">{peso(shift.expected_cash)}</td>
        <td className="p-3 text-right">{peso(shift.discrepancy)}</td>
        <td className="p-3"><div>Open: {approvalDescription(shift.opening_approval)}</div><div className="mt-1">Close: {approvalDescription(shift.closing_approval)}</div></td>
        <td className="p-3"><button type="button" onClick={() => setSelected(shift)} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-emerald-800"><Eye className="h-3.5 w-3.5"/> View</button></td>
      </tr>)}{!filtered.length && <tr><td colSpan={8} className="p-6 text-center text-slate-500">No matching staff shifts.</td></tr>}</tbody>
    </table></div>}
    {selected && <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label={`Staff Shift ${selected.shift_id} details`}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between gap-2"><h4 className="text-lg font-bold">Shift #{selected.shift_id} — {selected.status}</h4><button type="button" onClick={() => setSelected(null)} className="rounded-lg border px-3 py-2 text-xs">Close</button></div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">{([
          ['Shift Owner', staffIdentity(selected.shift_owner_name, selected.shift_owner_role, selected.shift_owner_id)],
          ['Opening Authorization', approvalDescription(selected.opening_approval)],
          ['Closing Authorization', approvalDescription(selected.closing_approval)],
          ['Transactions', String(selected.pos_transaction_count)],
          ['Opening Cash', peso(selected.opening_cash)],
          ['Cash Sales', peso(selected.cash_sales_amount)],
          ['Card Sales', peso(selected.card_sales_amount)],
          ['Cash Refunds', peso(selected.cash_refunds_amount)],
          ['Cash Drawer Expenses', peso(selected.cash_expenses_amount)],
          ['Expected Cash', peso(selected.expected_cash)],
          ['Actual Cash', peso(selected.actual_cash)],
          ['Discrepancy', peso(selected.discrepancy)],
        ] as [string,string][]).map(([label,value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><dt className="text-[10px] uppercase text-slate-500">{label}</dt><dd className="mt-1 text-xs font-semibold text-[#17372D]">{value}</dd></div>)}</dl>
      </div>
    </div>}
  </section>;
}
