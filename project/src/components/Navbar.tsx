import {
  getStoredSession,
  type StoredUser,
} from '../utils/authSession';

import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import {
LogOut,
Menu,
Search,
ShoppingCart,
User,
UsersRound,
Wrench,
X,

} from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { navLinks } from '../data/content';

interface NavbarUser {
  username: string;
  first_name?: string;
  role?: 'customer' | 'admin';
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
  const navbarSearchParam =
  searchParams.get('search') ?? '';

const [navbarSearch, setNavbarSearch] =
  useState(navbarSearchParam);

useEffect(() => {
  setNavbarSearch(navbarSearchParam);
}, [navbarSearchParam]);

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
      const cartStr = localStorage.getItem('customer_cart');
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

    if (isPublicStorefront) {
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.dispatchEvent(new Event('storage'));
    window.location.href = '/';
  };

  const isCustomerDashboard = Boolean(isDashboard && user?.role === 'customer');
  const isAdminDashboard = Boolean(isDashboard && user?.role === 'admin');
  const isPublicStorefront = pathname === '/' && !isDashboard;
  const isAuthPage = [
    '/login',
    '/register/customer',
    '/forgot-password',
    '/reset-password',
  ].includes(pathname);
  const usesLightNavbar =
  isPublicStorefront ||
  isAuthPage ||
  isCustomerDashboard ||
  isAdminDashboard;

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

  const handleCustomerNavbarSearch = (
  event: FormEvent<HTMLFormElement>
) => {
  event.preventDefault();

  if (!isCustomerDashboard) {
    return;
  }

  const term = navbarSearch.trim();

  const nextParams =
    new URLSearchParams(searchParams);

  nextParams.set('tab', 'catalog');

  // Keep the parameter even when empty so the
  // Products page knows the Navbar intentionally
  // requested a cleared search.
  nextParams.set('search', term);

  setSearchParams(nextParams);

  close();
};

const handleNavbarSearchChange = (
  value: string
) => {
  setNavbarSearch(value);

  // When the Navbar search becomes empty,
  // immediately clear the active product search too.
  if (
    isCustomerDashboard &&
    value.trim() === ''
  ) {
    const nextParams =
      new URLSearchParams(searchParams);

    nextParams.set('tab', 'catalog');
    nextParams.set('search', '');

    setSearchParams(nextParams);
  }
};

const handlePublicStorefrontSearch = (
  event: FormEvent<HTMLFormElement>
) => {
  event.preventDefault();

  if (!isPublicStorefront) {
    return;
  }

  const nextParams = new URLSearchParams(searchParams);
  nextParams.set('search', navbarSearch.trim());
  setSearchParams(nextParams);

  requestAnimationFrame(() => {
    document.getElementById('products')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  });

  close();
};

const handlePublicStorefrontSearchChange = (value: string) => {
  setNavbarSearch(value);

  if (isPublicStorefront && value.trim() === '') {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('search', '');
    setSearchParams(nextParams);
  }
};

  const userDisplayName =
  user?.first_name?.trim() ||
  user?.username?.trim() ||
  'User';

const userInitials =
  userDisplayName
    .slice(0, 2)
    .toUpperCase();

  const headerBgClass =
    isCustomerDashboard || isPublicStorefront || isAuthPage
      ? 'bg-white/95 shadow-[0_8px_30px_-20px_rgba(11,59,35,0.45)] backdrop-blur-md border-b border-[#dfe9e2]'
      : isAdminDashboard
  ? 'bg-white/95 shadow-[0_8px_30px_-20px_rgba(11,59,35,0.45)] backdrop-blur-md border-b border-[#dfe9e2]'
        : scrolled || pathname !== '/'
          ? 'bg-[#0b3b23]/95 shadow-lg shadow-emerald-950/20 backdrop-blur-md border-b border-white/5'
          : 'bg-transparent';

const dashboardTabClass = (tab: string) =>
  `rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all ${
    activeTab === tab
      ? 'border border-emerald-200 bg-emerald-50 text-[#0b3b23] shadow-sm'
      : 'text-[#29483d] hover:bg-[#f1faf4] hover:text-[#15803d]'
  }`;


  const publicSectionKey = (href: string) => {
    if (href.includes('#products')) return 'products';
    if (href.includes('#categories')) return 'categories';
    if (href.includes('#how-it-works')) return 'how-it-works';
    return 'home';
  };

  const publicNavClass = (href: string) => {
    const active = activePublicSection === publicSectionKey(href);

    return `rounded-full px-3.5 py-2 text-sm transition-all ${
      active
        ? 'bg-emerald-50 font-extrabold text-[#0b3b23] ring-1 ring-emerald-100 shadow-sm'
        : 'font-semibold text-[#365246] hover:bg-emerald-50 hover:text-[#15803d]'
    }`;
  };

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${headerBgClass}`}
    >
      <nav
        className={`mx-auto flex items-center justify-between px-5 py-3.5 md:px-8 ${
          isDashboard ? 'max-w-none' : 'max-w-7xl'
        }`}
      > 
        <Link
  to={
    isCustomerDashboard
      ? '/customer/dashboard?tab=overview'
      : isAdminDashboard
        ? '/admin/dashboard?tab=overview'
        : '/'
  }
  onClick={handleHeaderLogoClick}
  className={`group flex items-center gap-2.5 ${
    usesLightNavbar ? 'text-[#17372d]' : 'text-white'
  }`}
>
  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#22c55e] text-[#052e16] shadow-lg shadow-emerald-900/30 transition-transform group-hover:scale-105">
    <Wrench className="h-5 w-5" strokeWidth={2.5} />
  </span>

  <span className="flex flex-col leading-none">
    <span
  className={`font-display text-sm font-extrabold tracking-wide ${
    usesLightNavbar ? 'text-[#17372d]' : 'text-white'
  }`}
>
  {isAdminDashboard
    ? 'RAYJIN HARDWARE CONSOLE'
    : 'RAYJIN'}
</span>

<span
  className={`text-[10px] font-medium uppercase tracking-[0.18em] ${
    usesLightNavbar ? 'text-[#15803d]' : 'text-emerald-300'
  }`}
>
  {isAdminDashboard
    ? 'SYSTEM ADMIN'
    : 'HARDWARE'}
</span>
  </span>
</Link>

        {isPublicStorefront && (
  <form
    onSubmit={handlePublicStorefrontSearch}
    aria-hidden={activePublicSection === 'home'}
    className={`ml-7 mr-4 hidden min-w-[250px] max-w-[340px] flex-1 transition-all duration-200 xl:block ${
      activePublicSection === 'home'
        ? 'invisible pointer-events-none opacity-0'
        : 'visible opacity-100'
    }`}
  >
            <div className="relative w-full">
              <input
                type="search"
                value={navbarSearch}
                onChange={(event) => handlePublicStorefrontSearchChange(event.target.value)}
                placeholder="Search products, categories, or brands..."
                aria-label="Search storefront products"
                className="h-10 w-full rounded-full border border-[#d7e5dc] bg-[#f8fbf9] pl-4 pr-11 text-xs font-medium text-[#17372d] placeholder:text-[#7b8d85] shadow-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20"
              />
              <button
                type="submit"
                aria-label="Search storefront products"
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#17372d] transition hover:bg-emerald-50 hover:text-[#15803d]"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

          {/* Customer Navbar Product Search */}
{isCustomerDashboard && (
  <form
    onSubmit={handleCustomerNavbarSearch}
    className="ml-8 mr-auto hidden w-[390px] shrink-0 xl:block 2xl:w-[440px]"
  >
    <div className="relative w-full">
      <input
        type="search"
        value={navbarSearch}
        onChange={(e) =>
          handleNavbarSearchChange(e.target.value)
        }
        placeholder="Search products, categories, or brands..."
        aria-label="Search products"
        className="h-11 w-full rounded-full border border-[#dce8e0] bg-[#f8fbf9] pl-5 pr-12 text-xs font-medium text-[#17372d] placeholder:text-[#7b8d85] shadow-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20"
      />

      <button
        type="submit"
        aria-label="Search products"
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#17372D] transition hover:bg-emerald-50 hover:text-[#15803d]"
      >
        <Search className="h-4 w-4" />
      </button>
    </div>
  </form>
)}

        {isPublicStorefront && (
          <div className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={publicNavClass(link.href)}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}

        {isAuthPage && (
          <div className="ml-auto hidden items-center lg:flex">
            <Link
              to="/"
              className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-extrabold text-[#0b3b23] ring-1 ring-emerald-100 transition hover:bg-emerald-100"
            >
              Home
            </Link>
          </div>
        )}

        {isCustomerDashboard && (
          <div className="hidden items-center gap-1 lg:flex">
            <button
              type="button"
              onClick={() => setSearchParams({ tab: 'overview' })}
              className={dashboardTabClass('overview')}
            >
              Home
            </button>
            <button type="button" onClick={() => setSearchParams({ tab: 'catalog' })} className={dashboardTabClass('catalog')}>
              Products
            </button>
            <button
              type="button"
              onClick={() => setSearchParams({ tab: 'cart' })}
              className={`${dashboardTabClass('cart')} flex items-center gap-2`}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Cart
              <span className="rounded-full bg-[#15803d] px-2 py-0.5 text-[10px] font-bold text-white">{cartCount}</span>
            </button>
            <button type="button" onClick={() => setSearchParams({ tab: 'orders' })} className={dashboardTabClass('orders')}>
              My Orders
            </button>
            <button
              type="button"
              onClick={() => setSearchParams({ tab: 'profile' })}
              className={`${dashboardTabClass('profile')} flex items-center gap-1.5`}
            >
              <User className="h-3.5 w-3.5" /> Profile
            </button>
            <div className="mx-1 h-7 w-px bg-[#dfe9e2]" />
            <div className="flex items-center gap-2 rounded-full px-2 py-1">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#15803d] text-[10px] font-extrabold text-white shadow-sm ring-1 ring-emerald-200">
                {userInitials}
              </span>
              <span className="max-w-28 truncate text-xs font-bold text-[#17372d]">{userDisplayName}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[#36574b] transition-all hover:bg-emerald-50 hover:text-[#15803d]"
            >
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        )}

        {!isCustomerDashboard && !isAuthPage && (
          user ? (
            isAdminDashboard ? (
              <div className="hidden items-center gap-2 lg:flex">
                <button
                  type="button"
                  onClick={() => setSearchParams({ tab: 'customers' })}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
  activeTab === 'customers'
    ? 'bg-[#15803d] text-white shadow-sm'
    : 'border border-emerald-200 bg-emerald-50 text-[#166534] hover:bg-emerald-100'
}`}
                >
                  <UsersRound className="h-4 w-4" /> Customer Management
                </button>

                <div className="mx-1 h-7 w-px bg-[#dfe9e2]" />

                <div className="flex items-center gap-2.5 rounded-lg px-2 py-1">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#15803d] text-[11px] font-extrabold text-white shadow-sm ring-1 ring-emerald-200">
                    {(user.first_name || user.username).slice(0, 2).toUpperCase()}
                  </span>
                  <span className="leading-tight">
                    <span className="block text-xs font-bold text-[#17372d]">
  {user.first_name || user.username}
</span>
                    <span className="block text-[9px] font-semibold uppercase tracking-wider text-[#15803d]">
  System Admin
</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="
  inline-flex items-center gap-2
  rounded-full
  border border-[#dfe9e2]
  bg-white
  px-3.5 py-2
  text-xs font-bold
  text-[#36574b]
  transition
  hover:border-emerald-200
  hover:bg-emerald-50
  hover:text-[#15803d]
"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 lg:flex">
                <Link
                  to="/customer/dashboard?tab=cart"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-emerald-50 transition hover:bg-white/10 hover:text-white"
                >
                  <ShoppingCart className="h-4 w-4" /> Cart
                  <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-emerald-950">{cartCount}</span>
                </Link>
                <Link to="/customer/dashboard?tab=orders" className="rounded-lg px-3 py-2 text-sm font-medium text-emerald-50 transition hover:bg-white/10 hover:text-white">
                  My Orders
                </Link>
                <Link to="/customer/dashboard?tab=profile" className="rounded-lg px-3 py-2 text-sm font-medium text-emerald-50 transition hover:bg-white/10 hover:text-white">
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            )
          ) : isDashboard ? null : (
  <div className="hidden items-center gap-3 lg:flex">
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
                className="inline-flex items-center gap-2 rounded-lg bg-construction-500 px-4 py-2 text-sm font-semibold text-navy-950 shadow-lg shadow-construction-500/30 transition-all hover:bg-construction-400 hover:shadow-construction-500/50"
              >
                Register
              </Link>
            </div>
          )
        )}

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors lg:hidden ${
            usesLightNavbar
              ? 'text-[#17372d] hover:bg-emerald-50'
              : 'text-white hover:bg-white/10'
          } ${isAdminDashboard ? 'ml-auto' : ''}`}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <div className={`overflow-hidden bg-[#051c0c]/98 backdrop-blur-md transition-all duration-300 lg:hidden ${open ? 'max-h-[34rem]' : 'max-h-0'}`}>
        <div className="flex flex-col gap-1 px-5 pb-5 pt-2">
          {isCustomerDashboard ? (
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

    {/* MOBILE PRODUCT SEARCH — INSERT HERE */}
    <form
      onSubmit={handleCustomerNavbarSearch}
      className="mb-2"
    >
      <div className="relative">
        <input
          type="search"
          value={navbarSearch}
          onChange={(e) =>
  handleNavbarSearchChange(e.target.value)
}
          placeholder="Search products..."
          aria-label="Search products"
          className="h-11 w-full rounded-xl border border-white/10 bg-white pl-4 pr-11 text-sm text-[#17372D] placeholder:text-[#7B8D85] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
        />

        <button
          type="submit"
          aria-label="Search products"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[#17372D] hover:bg-emerald-50"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </form>

    {/* HOME BUTTON CONTINUES HERE */}
    <button
      type="button"
      onClick={() => {
        setSearchParams({ tab: 'overview' });
        close();
      }}
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
                onClick={() => { setSearchParams({ tab: 'catalog' }); close(); }}
                className={`rounded-lg px-4 py-2.5 text-left text-sm font-medium transition ${activeTab === 'catalog' ? 'bg-white/5 text-emerald-400' : 'text-gray-200 hover:bg-white/5'}`}
              >
                Products
              </button>
              <button
                type="button"
                onClick={() => { setSearchParams({ tab: 'cart' }); close(); }}
                className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-left text-sm font-medium transition ${activeTab === 'cart' ? 'bg-white/5 text-emerald-400' : 'text-gray-200 hover:bg-white/5'}`}
              >
                <span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Cart</span>
                <span className="rounded-full bg-[#15803d] px-2 py-0.5 text-xs font-bold text-white">{cartCount}</span>
              </button>
              <button
                type="button"
                onClick={() => { setSearchParams({ tab: 'orders' }); close(); }}
                className={`rounded-lg px-4 py-2.5 text-left text-sm font-medium transition ${activeTab === 'orders' ? 'bg-white/5 text-emerald-400' : 'text-gray-200 hover:bg-white/5'}`}
              >
                My Orders
              </button>
              <button
                type="button"
                onClick={() => { setSearchParams({ tab: 'profile' }); close(); }}
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
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2F7D5A] text-xs font-extrabold text-white">
                  {(user.first_name || user.username).slice(0, 2).toUpperCase()}
                </span>
                <span>
                  <span className="block text-sm font-bold text-white">{user.first_name || user.username}</span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-300">System Admin</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setSearchParams({ tab: 'customers' }); close(); }}
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-white/10"
              >
                <UsersRound className="h-4 w-4" /> Customer Management
              </button>
              <button
                type="button"
                onClick={() => { close(); handleLogout(); }}
                className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-left text-sm font-semibold text-red-300 transition hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </>
          ) : isAuthPage ? (
            <Link
              to="/"
              onClick={close}
              className="rounded-xl bg-white/10 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-white/15"
            >
              Home
            </Link>
          ) : (
            <>
              {isPublicStorefront && (
                <form onSubmit={handlePublicStorefrontSearch} className="mb-2">
                  <div className="relative">
                    <input
                      type="search"
                      value={navbarSearch}
                      onChange={(event) => handlePublicStorefrontSearchChange(event.target.value)}
                      placeholder="Search products..."
                      aria-label="Search storefront products"
                      className="h-11 w-full rounded-xl border border-white/10 bg-white pl-4 pr-11 text-sm text-[#17372d] placeholder:text-[#7b8d85] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                    />
                    <button
                      type="submit"
                      aria-label="Search storefront products"
                      className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[#17372d] hover:bg-emerald-50"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              )}

              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  className={`rounded-lg px-4 py-2.5 text-sm transition ${
                    activePublicSection === publicSectionKey(link.href)
                      ? 'bg-white/10 font-extrabold text-emerald-300'
                      : 'font-semibold text-emerald-50 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {link.label}
                </a>
              ))}
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
              ) : user?.role === 'admin' ? (
                <>
                  <Link to="/admin/dashboard" onClick={close} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-white/10">Admin Dashboard</Link>
                  <button type="button" onClick={() => { close(); handleLogout(); }} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-left text-sm font-medium text-red-300 transition hover:bg-white/10">
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
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
