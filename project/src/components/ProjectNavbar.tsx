import { useEffect, useState, type MouseEvent } from 'react';
import { Menu, Wrench, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProjectUser {
  username?: string;
  first_name?: string;
  role?: 'customer' | 'admin';
}

const projectNavLinks = [
  { label: 'Overview', href: '#overview' },
  { label: 'Interfaces', href: '#interfaces' },
  { label: 'Customers', href: '#customers' },
  { label: 'Admin', href: '#admin' },
  { label: 'Insights', href: '#insights' },
  { label: 'Controls', href: '#controls' },
  { label: 'Process', href: '#process' },
  { label: 'Architecture', href: '#tech' },
  { label: 'Future', href: '#future' },
];

export function ProjectNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [user, setUser] = useState<ProjectUser | null>(null);

  useEffect(() => {
    const updateActiveSection = () => {
      const sectionIds = projectNavLinks.map((link) => link.href.slice(1));
      const activationLine = 132;
      let currentSection = sectionIds[0];

      for (const sectionId of sectionIds) {
        const section = document.getElementById(sectionId);
        if (!section) continue;

        if (section.getBoundingClientRect().top <= activationLine) {
          currentSection = sectionId;
        }
      }

      // Keep the final navigation item selected when the user reaches the
      // bottom of the presentation, even if the last section is short.
      const nearPageBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;

      if (nearPageBottom) {
        currentSection = sectionIds[sectionIds.length - 1];
      }

      setActiveSection(currentSection);
    };

    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      updateActiveSection();
    };

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
    window.addEventListener('resize', updateActiveSection);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, []);

  const handleSectionNavigation = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    event.preventDefault();

    const sectionId = href.slice(1);
    const target = document.getElementById(sectionId);

    if (!target) return;

    setActiveSection(sectionId);
    setOpen(false);

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });

    window.history.replaceState(null, '', href);
  };

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

        <div className="hidden items-center gap-1 xl:flex">
          {projectNavLinks.map((link) => {
            const sectionId = link.href.slice(1);
            const isActive = activeSection === sectionId;

            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(event) => handleSectionNavigation(event, link.href)}
                aria-current={isActive ? 'location' : undefined}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/12 text-white ring-1 ring-white/10 shadow-sm'
                    : 'text-emerald-50 hover:bg-white/10 hover:text-white'
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </div>

        <div className="hidden items-center gap-2 xl:flex">
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
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#052e16] shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-300"
              >
                Register
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 xl:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <div className={`overflow-hidden bg-[#051c0c]/98 backdrop-blur-md transition-all duration-300 xl:hidden ${open ? 'max-h-[36rem]' : 'max-h-0'}`}>
        <div className="flex flex-col gap-1 px-5 pb-5 pt-2">
          {projectNavLinks.map((link) => {
            const sectionId = link.href.slice(1);
            const isActive = activeSection === sectionId;

            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(event) => handleSectionNavigation(event, link.href)}
                aria-current={isActive ? 'location' : undefined}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-white/10 font-extrabold text-emerald-300'
                    : 'text-emerald-50 hover:bg-white/10 hover:text-white'
                }`}
              >
                {link.label}
              </a>
            );
          })}
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
