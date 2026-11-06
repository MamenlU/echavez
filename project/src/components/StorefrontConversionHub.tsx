import { ArrowRight, ClipboardCheck, MessageCircle, Package, ShieldCheck, Truck, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { rememberCustomerMessagesRedirect } from '../utils/postAuthRedirect';

interface StorefrontConversionHubProps {
  isCustomerSignedIn: boolean;
}

export function StorefrontConversionHub({ isCustomerSignedIn }: StorefrontConversionHubProps) {
  return (
    <section className="pb-16 md:pb-20" aria-labelledby="storefront-action-title">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid overflow-hidden rounded-[32px] border border-emerald-900/10 bg-white shadow-[0_30px_75px_-46px_rgba(5,46,27,0.75)] lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative overflow-hidden bg-[#0b3b23] px-7 py-9 text-white sm:px-10 sm:py-11">
            <div aria-hidden className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
            <div aria-hidden className="absolute -bottom-24 right-6 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
            <div className="relative">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-300">Ready to order?</p>
              <h2 id="storefront-action-title" className="mt-3 max-w-xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Turn your hardware list into a trackable Rayjin order.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-emerald-50/80">
                Browse current products, use the supported fulfillment option for your order, and keep payment, approval, fulfillment, and customer communication connected to one account.
              </p>

              <div className="mt-6 grid max-w-2xl gap-2 sm:grid-cols-3">
                {["Live catalog", "Order tracking", "Customer messaging"].map((label, index) => {
                  const icons = [Package, ClipboardCheck, MessageCircle];
                  const Icon = icons[index];
                  return (
                    <span key={label} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-[10px] font-bold text-emerald-50">
                      <Icon className="h-3.5 w-3.5 text-emerald-300" /> {label}
                    </span>
                  );
                })}
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                {isCustomerSignedIn ? (
                  <Link
                    to="/customer/dashboard?tab=catalog"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-extrabold text-emerald-950 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b3b23]"
                  >
                    Continue Shopping <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register/customer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-extrabold text-emerald-950 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b3b23]"
                    >
                      <UserPlus className="h-4 w-4" /> Create Customer Account
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                    >
                      Login
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[linear-gradient(180deg,#fbfdfc_0%,#f1f8f4_100%)] px-7 py-9 sm:px-10 sm:py-11">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-emerald-700 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" /> Customer support
            </div>
            <h3 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-[#17372d]">Need help before or after checkout?</h3>
            <p className="mt-3 text-sm leading-6 text-[#61766d]">
              Ask Rayjin Hardware about product availability, an existing Order ID, Pickup, Shop & Go, or Local Delivery. Private conversations stay linked to your customer account.
            </p>

            <div className="mt-5 space-y-2.5">
              {[
                { icon: Package, title: 'Product questions', text: 'Availability, brands, sizes, and product details.' },
                { icon: ClipboardCheck, title: 'Order assistance', text: 'Keep order-specific questions connected to the correct transaction.' },
                { icon: Truck, title: 'Fulfillment help', text: 'Clarify Pickup, Shop & Go, or supported Local Delivery.' },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex items-start gap-3 rounded-2xl border border-[#dfe9e2] bg-white p-3.5 shadow-[0_10px_26px_-24px_rgba(11,59,35,0.45)]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#15803d]"><Icon className="h-4 w-4" /></span>
                  <span><strong className="block text-xs text-[#17372d]">{title}</strong><span className="mt-0.5 block text-[10px] leading-4 text-[#71817a]">{text}</span></span>
                </div>
              ))}
            </div>

            <Link
              to={isCustomerSignedIn ? '/customer/dashboard?tab=messages' : '/login'}
              onClick={isCustomerSignedIn ? undefined : rememberCustomerMessagesRedirect}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-extrabold text-[#15803d] transition hover:border-emerald-300 hover:bg-emerald-100"
            >
              <MessageCircle className="h-4 w-4" /> Message Rayjin Hardware
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
