import {
  ArrowUp,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Store,
  Wrench,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { RAYJIN_CONTACT } from '../data/contact';
import {
  clearStoredSession,
  getStoredSession,
} from '../utils/authSession';

interface FooterProps {
  showNavigationSections?: boolean;
}

export function Footer({ showNavigationSections = true }: FooterProps) {
  const session = getStoredSession();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isStorefront = pathname === '/';

  const handleLogout = () => {
    clearStoredSession();
    localStorage.removeItem('customer_cart');
    window.dispatchEvent(new Event('storage'));
    navigate('/', { replace: true });
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  return (
    <footer className="relative overflow-hidden bg-[#0b3b23] text-emerald-50">
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:18px_18px]"
      />

      <div className="relative mx-auto max-w-7xl px-5 py-12 md:px-8 lg:py-14">
        {isStorefront ? (
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12">
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
                  <span className="font-display text-base font-extrabold tracking-wide text-white">RAYJIN</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Hardware</span>
                </span>
              </Link>

              <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-100/80">
                Hardware and construction supplies with online ordering for Standard Pickup, Local Delivery, and Shop &amp; Go.
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                <Store className="h-3.5 w-3.5 text-emerald-300" />
                Live inventory visibility
              </div>
            </div>

            <div className="lg:col-span-3">
              <h4 className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-300">Store Information</h4>
              <div className="mt-4 space-y-3 text-sm text-emerald-100/85">
                <p className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{RAYJIN_CONTACT.address}</span>
                </p>
                <p className="flex items-start gap-2.5">
                  <Store className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>Rayjin Hardware customer pickup and local fulfillment.</span>
                </p>
              </div>
            </div>

            <div className="lg:col-span-2">
              <h4 className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-300">Order Services</h4>
              <div className="mt-4 flex flex-col gap-2.5 text-sm text-emerald-100/85">
                <span>Standard Pickup</span>
                <span>Local Delivery</span>
                <span>Shop &amp; Go</span>
              </div>
            </div>

            <div className="lg:col-span-3">
              <h4 className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-300">Contact</h4>
              <div className="mt-4 space-y-3 text-sm text-emerald-100/85">
                <p className="font-bold text-white">Rayjin Hardware</p>
                <p className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>Initao, Misamis Oriental</span>
                </p>
                <p className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{RAYJIN_CONTACT.phone}</span>
                </p>
                <p className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span className="break-all">{RAYJIN_CONTACT.email}</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <Link
                to="/project"
                className="group inline-flex items-center gap-2.5"
                aria-label="Open Rayjin Hardware Capstone presentation"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#22c55e] text-[#052e16] shadow-lg shadow-emerald-950/20 transition-transform group-hover:scale-105">
                  <Wrench className="h-5 w-5" strokeWidth={2.5} />
                </span>
                <span className="flex flex-col leading-none">
                  <span className="font-display text-base font-extrabold tracking-wide text-white">RAYJIN</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Hardware</span>
                </span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-100/80">
                Browse current hardware products, check live availability, and order through your customer account.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-300">Contact Us At</h4>
              <div className="mt-4 space-y-3 text-sm text-emerald-100/85">
                <p className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span className="break-all">{RAYJIN_CONTACT.email}</span>
                </p>
                <p className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{RAYJIN_CONTACT.address}</span>
                </p>
                <p className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{RAYJIN_CONTACT.phone}</span>
                </p>

                {showNavigationSections && session && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex w-fit items-center gap-2 text-left text-sm font-semibold text-red-200 transition hover:text-white"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Logout
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-emerald-100/65">© 2026 Rayjin Hardware. All rights reserved.</p>
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
