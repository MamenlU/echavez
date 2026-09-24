import { useEffect, useState } from 'react';
import { Menu, Wrench, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProjectUser {
  username?: string;
  first_name?: string;
  role?: 'customer' | 'admin';
}

const projectNavLinks = [
  { label: 'Overview', href: '#overview' },
  { label: 'Objectives', href: '#objectives' },
  { label: 'Customers', href: '#customers' },
  { label: 'Admin', href: '#admin' },
  { label: 'Process', href: '#process' },
  { label: 'Tech', href: '#tech' },
  { label: 'Colors', href: '#colors' },
];

export function ProjectNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<ProjectUser | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    const userStr = localStorage.getItem('user');

    if (userStr) {
      try {
        setUser(JSON.parse(userStr) as ProjectUser);
      } catch {
        setUser(null);
      }
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const dashboardPath = user?.role === 'admin'
    ? '/admin/dashboard'
    : '/customer/dashboard?tab=overview';

  const displayName = user?.first_name?.trim() || user?.username || '';

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'border-b border-white/5 bg-[#0b3b23]/95 shadow-lg shadow-emerald-950/20 backdrop-blur-md'
        : 'bg-transparent'
    }`}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 md:px-8">
        <Link to="/project" onClick={() => setOpen(false)} className="group flex items-center gap-2.5 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#22c55e] text-[#052e16] shadow-lg shadow-emerald-900/30 transition-transform group-hover:scale-105">
            <Wrench className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-sm font-extrabold tracking-wide text-white">RAYJIN</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-300">Hardware</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {projectNavLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-emerald-50 transition-colors hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              {displayName && (
                <span className="hidden rounded-lg px-2 py-2 text-xs font-semibold text-emerald-100 xl:inline">
                  {displayName}
                </span>
              )}
              <Link
                to={dashboardPath}
                className="rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Back to {user.role === 'admin' ? 'Admin Dashboard' : 'Customer Dashboard'}
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-white/10 hover:text-white"
              >
                Storefront
              </Link>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-white/10 hover:text-white"
              >
                Login
              </Link>
              <Link
                to="/register/customer"
                className="rounded-lg bg-construction-500 px-4 py-2 text-sm font-semibold text-navy-950 shadow-lg shadow-construction-500/30 transition-all hover:bg-construction-400"
              >
                Register
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 lg:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <div className={`overflow-hidden bg-[#051c0c]/98 backdrop-blur-md transition-all duration-300 lg:hidden ${open ? 'max-h-[36rem]' : 'max-h-0'}`}>
        <div className="flex flex-col gap-1 px-5 pb-5 pt-2">
          {projectNavLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-emerald-50 transition hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </a>
          ))}
          <div className="my-2 h-px bg-white/10" />
          {user ? (
            <Link
              to={dashboardPath}
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-white/10"
            >
              Back to {user.role === 'admin' ? 'Admin Dashboard' : 'Customer Dashboard'}
            </Link>
          ) : (
            <>
              <Link to="/" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-white/10">
                Storefront
              </Link>
              <Link to="/login" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
                Login
              </Link>
              <Link to="/register/customer" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-white/10">
                Register Account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
