import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, UsersRound } from 'lucide-react';

type Staff = { id: number; username: string; email: string; status: 'active' | 'inactive'; first_name?: string; last_name?: string };
const authFetch = async (path: string, init: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const response = await fetch(path, { ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
};
export function CashierAccountsPage() {
  const [cashiers, setCashiers] = useState<Staff[]>([]);
  const [admins, setAdmins] = useState<Staff[]>([]);
  const [newRole, setNewRole] = useState<'cashier' | 'admin'>('cashier');
  const [form, setForm] = useState({ username: '', email: '', password: '', firstName: '', lastName: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => { const [cashierData, adminData] = await Promise.all([authFetch('/api/auth/staff/cashiers'), authFetch('/api/auth/staff/admins')]);
    setCashiers(cashierData.cashiers || []); setAdmins(adminData.admins || []); };
  useEffect(() => { void load().catch(e => setError(String(e))); }, []);
  const field = 'w-full rounded-lg border px-3 py-2 text-sm';
  const change = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try { await authFetch(`/api/auth/staff/${newRole === 'admin' ? 'admins' : 'cashiers'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form) }); setMessage(`${newRole === 'admin' ? 'Admin' : 'Cashier'} account created. Share credentials privately.`);
      setForm({ username: '', email: '', password: '', firstName: '', lastName: '' }); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create account.'); }
    finally { setBusy(false); }
  };
  const changeStatus = async (cashier: Staff, role: 'cashier' | 'admin') => {
    setError(''); setMessage('');
    try { await authFetch(`/api/auth/staff/${role === 'admin' ? 'admins' : 'cashiers'}/${cashier.id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: cashier.status === 'active' ? 'inactive' : 'active' })
    }); await load(); setMessage(`${role === 'admin' ? 'Admin' : 'Cashier'} access updated.`); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to update account.'); }
  };
  return <div className="min-h-screen bg-[#f4f8f5] text-[#163a2b]">
    <header className="sticky top-0 z-30 border-b border-emerald-950/10 bg-[#104832] text-white shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><ShieldCheck className="h-6 w-6" /></span><div>
          <p className="text-sm font-extrabold tracking-wide">RAYJIN HARDWARE</p><p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-200">Super Admin · Staff Management</p>
        </div></div>
        <Link to="/admin/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-xs font-semibold transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link>
      </div>
    </header>
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
    <header className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-800"><UsersRound className="h-5 w-5" /></span>
      <div><h1 className="font-display text-2xl font-extrabold">Staff Accounts</h1><p className="mt-1 text-sm text-gray-600">Super Admin-only provisioning for Admins and Cashiers. No public staff registration.</p></div></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    <form onSubmit={create} className="rounded-xl border bg-white p-5 space-y-3">
      <h2 className="font-bold">Create Staff account</h2>
      <label className="block text-xs font-semibold">Account role
        <select value={newRole} onChange={e => setNewRole(e.target.value as typeof newRole)} className={`${field} mt-1`}><option value="cashier">Cashier</option><option value="admin">Admin</option></select></label>
      <div className="grid gap-3 sm:grid-cols-2">
        {(['username', 'email', 'firstName', 'lastName'] as const).map(k => <label key={k} className="text-xs font-semibold">{k}
          <input className={`${field} mt-1`} required={k === 'username' || k === 'email'} value={form[k]}
            onChange={e => change(k, e.target.value)} autoComplete="off" /></label>)}
      </div>
      <label className="block text-xs font-semibold">Initial strong password
        <input className={`${field} mt-1`} required type="password" autoComplete="new-password"
          value={form.password} onChange={e => change('password', e.target.value)} /></label>
      <p className="text-xs text-gray-500">Use 8+ characters with upper/lowercase, a number and a symbol. Do not reuse an Admin password.</p>
      <button disabled={busy} type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Create Staff Account'}</button>
    </form>
    <section className="rounded-xl border bg-white p-5 space-y-3"><h2 className="font-bold">Existing Cashiers</h2>
      {cashiers.length === 0 && <p className="text-sm text-gray-500">No Cashiers created yet.</p>}
      {cashiers.map(c => <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3">
        <div><p className="text-sm font-semibold">{c.username} · {c.first_name} {c.last_name}</p>
          <p className="text-xs text-gray-600">{c.email} · {c.status}</p></div>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => void changeStatus(c, 'cashier')}>
          {c.status === 'active' ? 'Deactivate' : 'Reactivate'}
        </button>
      </div>)}
    </section>
    <section className="rounded-xl border bg-white p-5 space-y-3"><h2 className="font-bold">Existing Admins</h2>
      {admins.map(a => <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3">
        <div><p className="text-sm font-semibold">{a.username} · {a.first_name} {a.last_name}</p><p className="text-xs text-gray-600">{a.email} · {a.status}</p></div>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => void changeStatus(a, 'admin')}>
          {a.status === 'active' ? 'Deactivate' : 'Reactivate'}
        </button></div>)}
    </section>
  </main>
  </div>;
}
