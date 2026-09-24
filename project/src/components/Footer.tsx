import {
  ArrowUp,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Store,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { RAYJIN_CONTACT } from '../data/contact';
import {
  clearStoredSession,
  getDashboardPath,
  getStoredSession,
} from '../utils/authSession';

export function Footer() {
  const session = getStoredSession();
const role = session?.user.role;
const dashboardPath = role ? getDashboardPath(role) : null;

  const handleLogout = () => {
    clearStoredSession();
    localStorage.removeItem('customer_cart');
    window.dispatchEvent(new Event('storage'));
    window.location.assign('/');
  };

  return (
    <footer className="relative overflow-hidden bg-[#0b3b23] text-emerald-50">
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:18px_18px]"
      />

      <div className="relative mx-auto max-w-7xl px-5 py-12 md:px-8 lg:py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Clickable Rayjin Hardware brand -> original Capstone presentation */}
          <div className="lg:col-span-4">
            <Link
              to="/project"
              className="group inline-flex items-center gap-2.5"
              aria-label="Open Rayjin Hardware Capstone presentation"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#22c55e] text-[#052e16] shadow-lg shadow-emerald-950/20 transition-transform group-hover:scale-105">
                <Wrench className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-display text-base font-extrabold tracking-wide text-white">
                  RAYJIN
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Hardware
                </span>
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-100/80">
              Browse current hardware products, check live availability, and
              order through your customer account for pickup, local delivery,
              or Shop &amp; Go.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-emerald-100">
              <Store className="h-3.5 w-3.5 text-emerald-300" />
              Online ordering with live inventory visibility
            </div>
          </div>

          {/* Explore */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-300">
              Explore
            </h4>
            <nav className="mt-4 flex flex-col gap-2.5 text-sm">
              <Link to="/" className="w-fit text-emerald-100/85 transition hover:text-white">
                Home
              </Link>
              <Link to="/#categories" className="w-fit text-emerald-100/85 transition hover:text-white">
                Categories
              </Link>
              <Link to="/#products" className="w-fit text-emerald-100/85 transition hover:text-white">
                Products
              </Link>
              <Link to="/#how-it-works" className="w-fit text-emerald-100/85 transition hover:text-white">
                How It Works
              </Link>
            </nav>
          </div>

          {/* Session-aware Customer Account */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-300">
              {role === 'admin' ? 'Admin Account' : 'Customer Account'}
            </h4>

            <div className="mt-4 flex flex-col gap-2.5 text-sm">
              {session && dashboardPath ? (
                <>
                  <Link
                    to={dashboardPath}
                    className="w-fit font-semibold text-emerald-100 transition hover:text-white"
                  >
                    Back to Dashboard
                  </Link>

                  {role === 'customer' && (
                    <>
                      <Link
                        to="/customer/dashboard?tab=orders"
                        className="w-fit text-emerald-100/85 transition hover:text-white"
                      >
                        My Orders
                      </Link>
                      <Link
                        to="/customer/dashboard?tab=profile"
                        className="w-fit text-emerald-100/85 transition hover:text-white"
                      >
                        Profile
                      </Link>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex w-fit items-center gap-2 text-left text-sm font-semibold text-red-200 transition hover:text-white"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="w-fit text-emerald-100/85 transition hover:text-white">
                    Login
                  </Link>
                  <Link
                    to="/register/customer"
                    className="w-fit text-emerald-100/85 transition hover:text-white"
                  >
                    Register Account
                  </Link>
                  <Link to="/login" className="w-fit text-emerald-100/85 transition hover:text-white">
                    My Orders
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Adviser-requested contact details */}
          <div className="lg:col-span-4">
            <h4 className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-300">
              Contact Us At
            </h4>

            <div className="mt-4 space-y-3 text-sm text-emerald-100/85">
              <a
                href={RAYJIN_CONTACT.emailHref}
                className="flex items-start gap-2.5 transition hover:text-white"
              >
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span className="break-all">{RAYJIN_CONTACT.email}</span>
              </a>

              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>{RAYJIN_CONTACT.address}</span>
              </p>

              <a
                href={RAYJIN_CONTACT.phoneHref}
                className="flex items-start gap-2.5 transition hover:text-white"
              >
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>{RAYJIN_CONTACT.phone}</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-emerald-100/65">
            © 2026 Rayjin Hardware. All rights reserved.
          </p>

          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Back to top
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
