import {
  ArrowUp,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  Store,
  Truck,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { RAYJIN_CONTACT } from '../data/contact';

interface FooterProps {
  /** Preserved for existing route callers; all customer pages now share one footer layout. */
  showNavigationSections?: boolean;
}

/** A shared retail footer for Storefront, Customer Dashboard, login and registration.
 *  Only the brand logo links to the existing interactive /project presentation.
 */
export function Footer({ showNavigationSections = true }: FooterProps) {
  return (
    <footer aria-label="Rayjin Hardware store footer" data-footer-context={showNavigationSections ? 'dashboard' : 'public'} className="relative overflow-hidden bg-[#0b3b23] text-emerald-50">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.13)_1px,transparent_1px)] [background-size:20px_20px]"
      />
      <div className="relative mx-auto max-w-7xl px-5 pb-7 pt-11 sm:px-6 md:pt-14 lg:px-8">
        <div className="grid gap-9 pb-10 md:grid-cols-2 lg:grid-cols-[1.05fr_1.3fr_1fr] lg:gap-12">
          <div>
            <Link
              to="/project"
              aria-label="Open Rayjin Hardware Capstone Presentation"
              title="Open Rayjin Hardware Capstone Presentation"
              className="group inline-flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#22c55e] text-[#052e16] shadow-lg shadow-emerald-950/20 transition-transform group-hover:scale-105">
                <Wrench className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
              </span>
              <span className="flex flex-col leading-none">
                <strong className="font-display text-base font-extrabold tracking-wide text-white">RAYJIN</strong>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Hardware</span>
                <span className="mt-2 text-xs font-semibold normal-case tracking-normal text-emerald-100">Built for every project!</span>
              </span>
            </Link>
          </div>

          <section aria-labelledby="footer-shopping-title">
            <h2 id="footer-shopping-title" className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-200">Shopping with Rayjin</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-emerald-50/85">
              Your local destination for hardware and construction supplies. Browse available products, arrange store pickup, or order for local delivery.
            </p>
            <ul className="mt-4 space-y-3 text-sm text-emerald-50/85">
              <li className="flex items-center gap-2.5"><ShoppingBag className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" /> Pickup at the store</li>
              <li className="flex items-center gap-2.5"><Truck className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" /> Local delivery where available</li>
              <li className="flex items-center gap-2.5"><Store className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" /> Online product availability</li>
            </ul>
          </section>

          <section aria-labelledby="footer-contact-title">
            <h2 id="footer-contact-title" className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-200">Visit &amp; Contact</h2>
            <address className="mt-4 space-y-3 not-italic text-sm leading-7 text-emerald-50/85">
              <p className="flex items-start gap-2.5"><MapPin className="mt-1.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" /><span>{RAYJIN_CONTACT.address}</span></p>
              <a href={RAYJIN_CONTACT.phoneHref} className="flex items-start gap-2.5 rounded-sm hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"><Phone className="mt-1.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" /><span>{RAYJIN_CONTACT.phone}</span></a>
              <a href={RAYJIN_CONTACT.emailHref} className="flex items-start gap-2.5 rounded-sm hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"><Mail className="mt-1.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" /><span className="break-all">{RAYJIN_CONTACT.email}</span></a>
            </address>
          </section>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 border-t border-white/15 pt-6 text-xs text-emerald-100/70 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Rayjin Hardware. All rights reserved.</p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.05] px-3.5 py-2 font-semibold text-emerald-50 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
          >
            Back to top <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
