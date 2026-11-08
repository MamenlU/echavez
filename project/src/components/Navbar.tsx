import {
  clearStoredSession,
  getStoredSession,
  type StoredUser,
} from '../utils/authSession';

import {
  useEffect,
  useRef,
  useState,
} from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

import {
LogOut,
Menu,
ShoppingCart,
MessageCircle,
Gift,
User,
Wrench,
X,
ScanBarcode,
ChevronDown,

} from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { navLinks } from '../data/content';
import { getLocalItem, removeLocalItem } from '../utils/browserStorage';

interface NavbarUser {
  username: string;
  first_name?: string;
  role?: 'customer' | 'admin' | 'cashier' | 'super_admin';
}

const toNavbarUser = (storedUser: StoredUser): NavbarUser => ({
  username:
    typeof storedUser.username === 'string'
      ? storedUser.username
      : '',

  first_name:
    typeof storedUser.first_name === 'string'
      ? storedUser.first_name
      : undefined,

  role: storedUser.role,
});

interface CartItem {
  quantity: number;
}

export function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isDashboard = pathname.includes('/dashboard');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const [scrolled, setScrolled] = useState(false);
  const [activePublicSection, setActivePublicSection] = useState('home');
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<NavbarUser | null>(() => {
  const session = getStoredSession();

  return session
    ? toNavbarUser(session.user)
    : null;
});

  const [cartCount, setCartCount] = useState(0);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);

    const syncUser = () => {
  const session = getStoredSession();

  setUser(
    session
      ? toNavbarUser(session.user)
      : null
  );
};

    const updateCartCount = () => {
      const cartStr = getLocalItem('customer_cart');
      if (!cartStr) {
        setCartCount(0);
        return;
      }

      try {
        const cart = JSON.parse(cartStr) as CartItem[];
        const count = Array.isArray(cart)
          ? cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
          : 0;
        setCartCount(count);
      } catch {
        setCartCount(0);
      }
    };

    const syncSession = () => {
      syncUser();
      updateCartCount();
    };

    onScroll();
    syncSession();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('storage', syncSession);
    window.addEventListener('cart-updated', updateCartCount);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('storage', syncSession);
      window.removeEventListener('cart-updated', updateCartCount);
    };
  }, []);

  const close = () => setOpen(false);

  const scrollToStorefrontSection = (targetId: string, attempt = 0) => {
    const target = document.getElementById(targetId);

    if (target) {
      const headerOffset = 88;
      const targetTop = Math.max(
        0,
        target.getBoundingClientRect().top + window.scrollY - headerOffset
      );

      window.scrollTo({
        top: targetTop,
        left: 0,
        behavior: 'smooth',
      });
      return;
    }

    if (attempt < 10) {
      window.setTimeout(() => scrollToStorefrontSection(targetId, attempt + 1), 45);
    }
  };

  const handlePublicNavClick = (
    event: ReactMouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    event.preventDefault();
    close();

    if (href === '/') {
      if (pathname !== '/') {
        navigate('/');
      }

      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      });
      return;
    }

    const hashIndex = href.indexOf('#');
    if (hashIndex < 0) {
      navigate(href);
      return;
    }

    const targetId = decodeURIComponent(href.slice(hashIndex + 1));
    const destination = `/#${targetId}`;

    navigate(destination);
    window.requestAnimationFrame(() => scrollToStorefrontSection(targetId));
  };

  const handleHeaderLogoClick = () => {
    close();

    if (isCustomerDashboard) {
      setSearchParams({ tab: 'overview' });

      requestAnimationFrame(() => {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'auto',
        });
      });

      return;
    }

    if (isCustomerPromos) {
      navigate('/customer/dashboard?tab=overview');
      return;
    }

    if (isPublicStorefront || isPublicPromos) {
      requestAnimationFrame(() => {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'auto',
        });
      });
    }
  };

  const handleLogout = () => {
    clearStoredSession();
    removeLocalItem('customer_cart');
    setUser(null);
    setCartCount(0);
    setOpen(false);
    setAdminMenuOpen(false);
    window.dispatchEvent(new Event('storage'));
    navigate('/', { replace: true });
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  const isCustomerDashboard = Boolean(isDashboard && user?.role === 'customer');
  const isAdminDashboard = Boolean(isDashboard && (user?.role === 'admin' || user?.role === 'super_admin'));
  const isCashierDashboard = Boolean(isDashboard && user?.role === 'cashier');
  const isPublicStorefront = pathname === '/' && !isDashboard;
  const isPromosPage = pathname === '/promos-rewards';
  const isCustomerPromos = Boolean(isPromosPage && user?.role === 'customer');
  const isPublicPromos = Boolean(isPromosPage && !isCustomerPromos);
  const isCustomerNavigation = isCustomerDashboard || isCustomerPromos;
  const isLoginPage = pathname === '/login';
  const isRegistrationPage = pathname === '/register/customer';
  const isAuthPage = [
    '/login',
    '/register/customer',
    '/forgot-password',
    '/reset-password',
  ].includes(pathname);
  const usesLightNavbar =
  isPublicStorefront ||
  isPromosPage ||
  isAuthPage ||
  isCustomerDashboard ||
  isAdminDashboard;
  const usesWideMenu = isCustomerNavigation || isPublicStorefront || isPublicPromos;

  const openCustomerTab = (tab: string) => {
    close();

    if (isCustomerDashboard) {
      setSearchParams({ tab });
      return;
    }

    navigate(`/customer/dashboard?tab=${tab}`);
  };

  useEffect(() => {
    if (!isCustomerNavigation && !isAdminDashboard) {
      setMessageUnreadCount(0);
      return;
    }

    let cancelled = false;

    const fetchUnreadCount = async () => {
      const token = getLocalItem('token');
      if (!token || document.hidden) return;

      try {
        const response = await fetch('/api/messages/unread-count', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) return;
        const payload = await response.json();

        if (!cancelled) {
          setMessageUnreadCount(Math.max(0, Number(payload?.unreadCount || 0)));
        }
      } catch (error) {
        console.error('Unable to load message unread count:', error);
      }
    };

    const refreshUnreadCount = () => {
      void fetchUnreadCount();
    };

    void fetchUnreadCount();
    const timer = window.setInterval(fetchUnreadCount, 30_000);
    window.addEventListener('focus', refreshUnreadCount);
    window.addEventListener('messages-unread-updated', refreshUnreadCount);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshUnreadCount);
      window.removeEventListener('messages-unread-updated', refreshUnreadCount);
    };
  }, [isAdminDashboard, isCustomerNavigation]);

  useEffect(() => {
    if (!isPublicStorefront) {
      setActivePublicSection('home');
      return;
    }

    const sections = [
      { id: 'categories', key: 'categories' },
      { id: 'products', key: 'products' },
      { id: 'how-it-works', key: 'how-it-works' },
    ];

    const updateActiveSection = () => {
      const marker = window.scrollY + 170;
      let nextSection = 'home';

      sections.forEach(({ id, key }) => {
        const element = document.getElementById(id);
        if (element && element.offsetTop <= marker) {
          nextSection = key;
        }
      });

      setActivePublicSection(nextSection);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, [isPublicStorefront]);



  useEffect(() => {
    setAdminMenuOpen(false);
  }, [activeTab, pathname]);

  useEffect(() => {
    if (!adminMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setAdminMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [adminMenuOpen]);

  const userDisplayName =
  user?.first_name?.trim() ||
  user?.username?.trim() ||
  'User';

const userInitials =
  userDisplayName
    .slice(0, 2)
    .toUpperCase();

  const headerBgClass =
    isCustomerNavigation || isPublicStorefront || isPublicPromos || isAuthPage
      ? 'bg-[linear-gradient(90deg,rgba(255,255,255,0.97)_0%,rgba(248,253,250,0.97)_52%,rgba(241,249,245,0.97)_100%)] shadow-[0_12px_36px_-26px_rgba(11,59,35,0.5)] backdrop-blur-xl border-b border-[#dce8e0]'
      : isAdminDashboard
  ? 'bg-[linear-gradient(90deg,rgba(255,255,255,0.985)_0%,rgba(250,254,252,0.985)_55%,rgba(243,250,246,0.985)_100%)] shadow-[0_12px_34px_-24px_rgba(11,59,35,0.5)] backdrop-blur-xl border-b border-[#dce8e0]'
        : scrolled || pathname !== '/'
          ? 'bg-[#0b3b23]/95 shadow-lg shadow-emerald-950/20 backdrop-blur-md border-b border-white/5'
          : 'bg-transparent';

const dashboardTabClass = (tab: string) =>
  `rounded-xl px-3.5 py-2 text-[11px] font-extrabold tracking-wide transition-all ${
    !isCustomerPromos && activeTab === tab
      ? 'border border-emerald-200 bg-white text-[#0b3b23] shadow-[0_8px_20px_-18px_rgba(11,59,35,0.5)]'
      : 'border border-transparent text-[#365246] hover:border-emerald-100 hover:bg-white hover:text-[#15803d]'
  }`;


  const publicSectionKey = (href: string) => {
    if (href.includes('#products')) return 'products';
    if (href.includes('#categories')) return 'categories';
    if (href.includes('#how-it-works')) return 'how-it-works';
    return 'home';
  };

  const publicNavClass = (href: string) => {
    const active = !isPromosPage && activePublicSection === publicSectionKey(href);

    return `rounded-xl px-3.5 py-2 text-[12px] transition-all ${
      active
        ? 'bg-white font-extrabold text-[#0b3b23] ring-1 ring-emerald-100 shadow-sm'
        : 'font-bold text-[#52685f] hover:bg-white hover:text-[#15803d]'
    }`;
  };

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${headerBgClass}`}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-[2px] ${isAdminDashboard ? 'bg-[linear-gradient(90deg,#0b3b23,#22c55e,#0b3b23)]' : 'bg-[linear-gradient(90deg,#0b3b23_0%,#22c55e_48%,#a7f3d0_100%)]'}`}
      />
      <nav
        className={`relative mx-auto flex items-center justify-between px-5 py-3.5 md:px-8 ${
          isAdminDashboard
  ? 'max-w-none h-16 py-0'
  : 'max-w-7xl'
        }`}
      > 
        <Link
  to={
    isCustomerNavigation
      ? '/customer/dashboard?tab=overview'
      : isAdminDashboard
        ? '/admin/dashboard?tab=overview'
        : isCashierDashboard ? '/cashier/dashboard' : '/'
  }
  onClick={handleHeaderLogoClick}
  className={`group flex items-center gap-2.5 ${
    usesLightNavbar ? 'text-[#17372d]' : 'text-white'
  }`}
>
  <span className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-emerald-500/25 bg-[linear-gradient(145deg,#3BDA78_0%,#20B85E_55%,#149248_100%)] text-[#052e16] shadow-[0_14px_30px_-18px_rgba(21,128,61,0.7)] ring-1 ring-white transition-transform group-hover:-translate-y-0.5 group-hover:scale-[1.03]">
    <Wrench className="h-5 w-5" strokeWidth={2.5} />
  </span>

  <span className={isAdminDashboard ? 'hidden flex-col leading-none sm:flex' : 'flex flex-col leading-none'}>
    <span
  className={`font-display text-sm font-extrabold tracking-wide ${
    usesLightNavbar ? 'text-[#17372d]' : 'text-white'
  }`}
>
  {isAdminDashboard
    ? 'RAYJIN HARDWARE'
    : 'RAYJIN'}
</span>

<span
  className={`text-[10px] font-medium uppercase tracking-[0.18em] ${
    usesLightNavbar ? 'text-[#15803d]' : 'text-emerald-300'
  }`}
>
  {isAdminDashboard
    ? 'ADMIN CONSOLE'
    : 'HARDWARE'}
</span>
  </span>
</Link>

        {(isPublicStorefront || isPublicPromos) && (
          <div className="hidden items-center gap-1 rounded-[16px] border border-[#e3ebe6] bg-[#f6faf7]/90 p-1 shadow-[0_10px_28px_-24px_rgba(11,59,35,0.5)] xl:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(event) => handlePublicNavClick(event, link.href)}
                className={publicNavClass(link.href)}
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/promos-rewards"
              className={`ml-1 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-[12px] font-extrabold transition-all ${
                isPromosPage
                  ? 'bg-[#0b3b23] text-white shadow-sm'
                  : 'border border-emerald-200 bg-emerald-50/80 text-[#166534] hover:bg-emerald-100'
              }`}
            >
              <Gift className="h-3.5 w-3.5" />
              Promos &amp; Rewards
              <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider ${
                isPromosPage ? 'bg-white/15 text-emerald-100' : 'bg-white text-[#15803d]'
              }`}>Soon</span>
            </Link>
          </div>
        )}

        {isAuthPage && (
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <Link
              to="/"
              className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-extrabold text-[#0b3b23] ring-1 ring-emerald-100 transition hover:bg-emerald-100"
            >
              Home
            </Link>
            {isLoginPage && (
              <Link
                to="/register/customer"
                className="rounded-full bg-[#16a34a] px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#15803d]"
              >
                Register
              </Link>
            )}
            {isRegistrationPage && (
              <Link
                to="/login"
                className="rounded-full bg-[#16a34a] px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#15803d]"
              >
                Login
              </Link>
            )}
          </div>
        )}

{isCustomerNavigation && (
  <div className="ml-auto hidden items-center gap-1 rounded-[18px] border border-[#e1ebe4] bg-[#f7fbf8]/90 p-1 shadow-[0_12px_30px_-26px_rgba(11,59,35,0.48)] xl:flex">

    <button
      type="button"
      onClick={() => openCustomerTab('overview')}
      className={dashboardTabClass(
        'overview'
      )}
    >
      Home
    </button>

    <button
      type="button"
      onClick={() => openCustomerTab('catalog')}
      className={dashboardTabClass(
        'catalog'
      )}
    >
      Products
    </button>

    <button
      type="button"
      onClick={() => openCustomerTab('orders')}
      className={dashboardTabClass(
        'orders'
      )}
    >
      My Orders
    </button>

    <button
      type="button"
      onClick={() => openCustomerTab('messages')}
      className={`${dashboardTabClass('messages')} flex items-center gap-1.5`}
    >
      <MessageCircle className="h-3.5 w-3.5" />
      Messages
      {messageUnreadCount > 0 && (
        <span className="flex min-w-5 items-center justify-center rounded-full bg-[#15803d] px-1.5 py-0.5 text-[9px] font-extrabold text-white">
          {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
        </span>
      )}
    </button>

    <Link
      to="/promos-rewards"
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-extrabold shadow-sm transition hover:-translate-y-0.5 ${
        isCustomerPromos
          ? 'border-[#15803d] bg-[#15803d] text-white'
          : 'border-emerald-200 bg-white text-[#166534] hover:bg-emerald-50'
      }`}
    >
      <Gift className="h-3.5 w-3.5" />
      Rewards
      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-[#15803d]">Soon</span>
    </Link>

    <div className="mx-1 h-7 w-px bg-[#dfe9e2]" />

    <button
      type="button"
      onClick={() => openCustomerTab('cart')}
      className={`${dashboardTabClass(
        'cart'
      )} flex items-center gap-2`}
    >
      <ShoppingCart className="h-3.5 w-3.5" />

      Cart

      <span className="rounded-full bg-[#15803d] px-2 py-0.5 text-[10px] font-bold text-white">
        {cartCount}
      </span>
    </button>

    <button
      type="button"
      onClick={() => openCustomerTab('profile')}
      aria-label="Open customer profile"
      className={`ml-1 flex items-center gap-2.5 rounded-full border px-2.5 py-1.5 transition-all ${
        activeTab === 'profile'
          ? 'border-emerald-200 bg-emerald-50 shadow-sm'
          : 'border-transparent hover:border-[#dfe9e2] hover:bg-[#f8fbf9]'
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#15803d] text-[10px] font-extrabold text-white shadow-sm ring-1 ring-emerald-200">
        {userInitials}
      </span>

      <span className="max-w-28 truncate text-xs font-extrabold text-[#17372d]">
        {userDisplayName}
      </span>
    </button>

    <button
      type="button"
      onClick={handleLogout}
      className="ml-1 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold tracking-wide text-[#52685f] transition hover:bg-emerald-50 hover:text-[#15803d]"
    >
      <LogOut className="h-3.5 w-3.5" />

      Logout
    </button>

  </div>
)}

        {!isCustomerNavigation && !isAuthPage && (
          user ? (
            isAdminDashboard ? (
              <div className="hidden items-center gap-2 lg:flex">
                <button
                  type="button"
                  onClick={() => setSearchParams({ tab: 'pos' })}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-700/15 px-4 py-2 text-[12px] font-extrabold text-white shadow-[0_12px_28px_-15px_rgba(21,128,61,0.7)] transition hover:-translate-y-0.5 ${activeTab === 'pos' ? 'bg-[#0B5F33]' : 'bg-[linear-gradient(135deg,#169447_0%,#0F7A3C_100%)] hover:from-[#188F47] hover:to-[#0B6933]'}`}
                >
                  <ScanBarcode className="h-4 w-4" />
                  New POS Sale
                </button>

                <button
                  type="button"
                  onClick={() => setSearchParams({ tab: 'messages' })}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 py-2 text-[12px] font-extrabold shadow-[0_8px_20px_-18px_rgba(11,59,35,0.35)] transition ${activeTab === 'messages' ? 'border-[#15803d] bg-emerald-50 text-[#0D7740]' : 'border-[#DDE6E0] bg-white/90 text-[#29483D] hover:border-emerald-200 hover:bg-emerald-50 hover:text-[#15803d]'}`}
                  aria-label={messageUnreadCount > 0 ? `Messages, ${messageUnreadCount} unread` : 'Messages'}
                >
                  <MessageCircle className="h-4 w-4" />
                  Messages
                  {messageUnreadCount > 0 && <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-extrabold text-white">{messageUnreadCount > 99 ? '99+' : messageUnreadCount}</span>}
                </button>

                <div className="mx-1 h-9 w-px bg-[#D7E4DC]" />

                <div ref={adminMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setAdminMenuOpen((current) => !current)}
                    className="flex min-h-10 items-center gap-2.5 rounded-xl border border-transparent bg-[#F6FAF7]/70 px-2.5 py-1.5 text-left transition hover:border-[#DDE6E0] hover:bg-white"
                    aria-expanded={adminMenuOpen}
                    aria-haspopup="menu"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#17372D] text-[10px] font-extrabold text-white shadow-sm ring-2 ring-emerald-100">{(user.first_name || user.username).slice(0, 2).toUpperCase()}</span>
                    <span className="max-w-28 leading-tight">
                      <span className="block truncate text-[12px] font-extrabold text-[#17372D]">{user.first_name || user.username}</span>
                      <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-[#71817A]">System Admin</span>
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-[#61766D] transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {adminMenuOpen && (
                    <div className="absolute right-0 top-[calc(100%+0.55rem)] z-[70] w-56 overflow-hidden rounded-2xl border border-[#DDE6E0] bg-white p-2 shadow-[0_22px_60px_-24px_rgba(11,59,35,0.45)]" role="menu">
                      <div className="border-b border-[#EDF2EE] px-3 py-2.5">
                        <p className="text-[11px] font-extrabold text-[#17372D]">{user.first_name || user.username}</p>
                        <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-[#15803d]">Rayjin Hardware Admin</p>
                      </div>
                      <div className="px-3 py-2 text-[9px] leading-4 text-[#71817A]">Use the grouped sidebar for administration modules. This menu is reserved for your account session.</div>
                      <button type="button" role="menuitem" onClick={handleLogout} className="mt-1 flex w-full items-center gap-2 border-t border-[#EDF2EE] px-3 py-2.5 text-left text-[10px] font-bold text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Logout</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={`hidden items-center gap-2 ${isPublicPromos ? 'xl:flex' : 'lg:flex'}`}>
                <Link
                  to="/customer/dashboard?tab=cart"
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${usesLightNavbar ? 'text-[#365246] hover:bg-emerald-50 hover:text-[#15803d]' : 'text-emerald-50 hover:bg-white/10 hover:text-white'}`}
                >
                  <ShoppingCart className="h-4 w-4" /> Cart
                  <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-emerald-950">{cartCount}</span>
                </Link>
                <Link to="/customer/dashboard?tab=orders" className={`rounded-lg px-3 py-2 text-sm font-medium transition ${usesLightNavbar ? 'text-[#365246] hover:bg-emerald-50 hover:text-[#15803d]' : 'text-emerald-50 hover:bg-white/10 hover:text-white'}`}>
                  My Orders
                </Link>
                <Link to="/customer/dashboard?tab=profile" className={`rounded-lg px-3 py-2 text-sm font-medium transition ${usesLightNavbar ? 'text-[#365246] hover:bg-emerald-50 hover:text-[#15803d]' : 'text-emerald-50 hover:bg-white/10 hover:text-white'}`}>
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition ${usesLightNavbar ? 'border-[#dfe9e2] bg-white text-[#365246] hover:bg-emerald-50 hover:text-[#15803d]' : 'border-white/15 bg-white/5 text-white hover:bg-white/10'}`}
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            )
          ) : isDashboard ? null : (
  <div className={`hidden items-center gap-3 ${(isPublicStorefront || isPublicPromos) ? 'xl:flex' : 'lg:flex'}`}>
              <Link
                to="/login"
                className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                  usesLightNavbar
                    ? 'text-[#17372d] hover:bg-emerald-50 hover:text-[#15803d]'
                    : 'text-emerald-50 hover:bg-white/10 hover:text-white'
                }`}
              >
                Login
              </Link>
              <Link
                to="/register/customer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#15803d] px-4 py-2 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/10 transition-all hover:bg-[#166534]"
              >
                Register
              </Link>
            </div>
          )
        )}

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border border-[#d9e6de] bg-white/95 shadow-[0_10px_24px_-20px_rgba(11,59,35,0.5)] transition-all hover:-translate-y-0.5 ${usesWideMenu ? 'xl:hidden' : 'lg:hidden'} ${
            usesLightNavbar
              ? 'text-[#17372d] hover:bg-emerald-50'
              : 'text-white hover:bg-white/10'
          } ${isAdminDashboard ? 'ml-auto border-emerald-100 bg-emerald-50/70 text-[#0b3b23] hover:bg-emerald-100' : ''}`}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <div className={`border-t border-emerald-300/10 bg-[linear-gradient(180deg,#083c28_0%,#062515_100%)] shadow-2xl backdrop-blur-xl transition-all duration-300 ${usesWideMenu ? 'xl:hidden' : 'lg:hidden'} ${open ? 'max-h-[calc(100vh-4rem)] overflow-y-auto' : 'max-h-0 overflow-hidden'}`}>
        <div className="flex flex-col gap-1 px-5 pb-5 pt-2">
          {isCustomerNavigation ? (
  <>
    {/* Customer Identity */}
    <div className="mb-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2F7D5A] text-xs font-extrabold text-white">
        {userInitials}
      </span>

      <span>
        <span className="block text-sm font-bold text-white">
          {userDisplayName}
        </span>

        <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
          Customer
        </span>
      </span>
    </div>

    {/* HOME BUTTON CONTINUES HERE */}
    <button
      type="button"
      onClick={() => openCustomerTab('overview')}
      className={`rounded-lg px-4 py-2.5 text-left text-sm font-medium transition ${
        activeTab === 'overview'
          ? 'bg-white/5 text-emerald-400'
          : 'text-gray-200 hover:bg-white/5'
      }`}
    >
      Home
    </button>
              <button
                type="button"
                onClick={() => openCustomerTab('catalog')}
                className={`rounded-lg px-4 py-2.5 text-left text-sm font-medium transition ${activeTab === 'catalog' ? 'bg-white/5 text-emerald-400' : 'text-gray-200 hover:bg-white/5'}`}
              >
                Products
              </button>
              <button
                type="button"
                onClick={() => openCustomerTab('cart')}
                className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-left text-sm font-medium transition ${activeTab === 'cart' ? 'bg-white/5 text-emerald-400' : 'text-gray-200 hover:bg-white/5'}`}
              >
                <span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Cart</span>
                <span className="rounded-full bg-[#15803d] px-2 py-0.5 text-xs font-bold text-white">{cartCount}</span>
              </button>
              <button
                type="button"
                onClick={() => openCustomerTab('orders')}
                className={`rounded-lg px-4 py-2.5 text-left text-sm font-medium transition ${activeTab === 'orders' ? 'bg-white/5 text-emerald-400' : 'text-gray-200 hover:bg-white/5'}`}
              >
                My Orders
              </button>
              <button
                type="button"
                onClick={() => openCustomerTab('messages')}
                className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-left text-sm font-medium transition ${activeTab === 'messages' ? 'bg-white/5 text-emerald-400' : 'text-gray-200 hover:bg-white/5'}`}
              >
                <span className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Messages</span>
                {messageUnreadCount > 0 && (
                  <span className="rounded-full bg-[#15803d] px-2 py-0.5 text-xs font-bold text-white">
                    {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                  </span>
                )}
              </button>
              <Link
                to="/promos-rewards"
                onClick={close}
                className="flex items-center justify-between rounded-lg px-4 py-2.5 text-left text-sm font-medium text-emerald-100 transition hover:bg-white/5"
              >
                <span className="flex items-center gap-2"><Gift className="h-4 w-4" /> Promos &amp; Rewards</span>
                <span className="rounded-full bg-emerald-300/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-300/20">Soon</span>
              </Link>
              <button
                type="button"
                onClick={() => openCustomerTab('profile')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition ${activeTab === 'profile' ? 'bg-white/5 text-emerald-400' : 'text-gray-200 hover:bg-white/5'}`}
              >
                <User className="h-4 w-4" /> Profile
              </button>
              <button
                type="button"
                onClick={() => { close(); handleLogout(); }}
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-left text-sm font-medium text-red-300 transition hover:bg-white/5"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </>
          ) : isAdminDashboard && user ? (
            <>
              <div className="mb-1 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2F7D5A] text-xs font-extrabold text-white">{(user.first_name || user.username).slice(0, 2).toUpperCase()}</span>
                <span><span className="block text-sm font-bold text-white">{user.first_name || user.username}</span><span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-300">System Admin</span></span>
              </div>
              <button type="button" onClick={() => { setSearchParams({ tab: 'pos' }); close(); }} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-[#052E16] shadow-lg shadow-emerald-950/15 transition hover:bg-emerald-400"><ScanBarcode className="h-4 w-4" />New POS Sale</button>
              <button type="button" onClick={() => { setSearchParams({ tab: 'messages' }); close(); }} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-semibold text-emerald-100 transition hover:bg-white/10"><span className="flex items-center gap-2"><MessageCircle className="h-4 w-4" />Messages</span>{messageUnreadCount > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{messageUnreadCount > 99 ? '99+' : messageUnreadCount}</span>}</button>
              <button type="button" onClick={() => { close(); handleLogout(); }} className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-left text-sm font-semibold text-red-300 transition hover:bg-white/10"><LogOut className="h-4 w-4" />Logout</button>
            </>
          ) : isAuthPage ? (
            <div className="grid gap-2">
              <Link
                to="/"
                onClick={close}
                className="rounded-xl bg-white/10 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-white/15"
              >
                Home
              </Link>
              {isLoginPage && (
                <Link
                  to="/register/customer"
                  onClick={close}
                  className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-[#052e16] transition hover:bg-emerald-400"
                >
                  Register
                </Link>
              )}
              {isRegistrationPage && (
                <Link
                  to="/login"
                  onClick={close}
                  className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-[#052e16] transition hover:bg-emerald-400"
                >
                  Login
                </Link>
              )}
            </div>
          ) : (
            <>

              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(event) => handlePublicNavClick(event, link.href)}
                  className={`rounded-lg px-4 py-2.5 text-sm transition ${
                    !isPromosPage && activePublicSection === publicSectionKey(link.href)
                      ? 'bg-white/10 font-extrabold text-emerald-300'
                      : 'font-semibold text-emerald-50 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {link.label}
                </a>
              ))}
              <Link
                to="/promos-rewards"
                onClick={close}
                className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  isPromosPage ? 'bg-white/10 text-emerald-300' : 'text-emerald-50 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2"><Gift className="h-4 w-4" /> Promos &amp; Rewards</span>
                <span className="rounded-full bg-emerald-300/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-300">Soon</span>
              </Link>
              <div className="my-2 h-px bg-white/10" />
              {user?.role === 'customer' ? (
                <>
                  <Link to="/customer/dashboard?tab=cart" onClick={close} className="flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium text-emerald-200 transition hover:bg-white/10">
                    <span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Cart</span>
                    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-emerald-950">{cartCount}</span>
                  </Link>
                  <Link to="/customer/dashboard?tab=orders" onClick={close} className="rounded-lg px-4 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-white/10">My Orders</Link>
                  <Link to="/customer/dashboard?tab=profile" onClick={close} className="rounded-lg px-4 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-white/10">Profile</Link>
                  <button type="button" onClick={() => { close(); handleLogout(); }} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-left text-sm font-medium text-red-300 transition hover:bg-white/10">
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </>
              ) : (user?.role === 'admin' || user?.role === 'super_admin') ? (
                <>
                  <Link to="/admin/dashboard" onClick={close} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-white/10">Admin Dashboard</Link>
                  <button type="button" onClick={() => { close(); handleLogout(); }} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-left text-sm font-medium text-red-300 transition hover:bg-white/10">
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </>
              ) : user?.role === 'cashier' ? (
                <>
                  <Link to="/cashier/dashboard" onClick={close} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-emerald-200">Cashier POS</Link>
                  <button type="button" onClick={() => { close(); handleLogout(); }} className="rounded-lg px-4 py-2.5 text-left text-sm font-medium text-red-300">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={close} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">Login</Link>
                  <Link to="/register/customer" onClick={close} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-white/10">Register Account</Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
