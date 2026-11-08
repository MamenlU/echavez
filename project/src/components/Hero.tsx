import {
  ArrowRight,
  MessageCircle,
  Package,
  Store,
  Tag,
  Truck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeroProps {
  onShopProductsClick: () => void;
  supportHref?: string;
  onSupportClick?: () => void;
}

export function Hero({
  onShopProductsClick,
  supportHref = '/login',
  onSupportClick,
}: HeroProps) {
  return (
    <section
      id="top"
      className="relative isolate overflow-hidden border-b border-[#dfe9e2] bg-[#eef7f0] pt-24 lg:min-h-[650px] lg:pt-4"
    >
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(108deg,#f9fcfa_0%,#edf7ef_45%,#dcefdc_100%)]" />
      <div className="pointer-events-none absolute -left-24 top-32 -z-10 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />

      <img
        src="/images/rayjin-storefront-hero.png"
        alt="Rayjin Hardware construction and hardware products"
        className="absolute inset-0 -z-10 hidden h-full w-full object-cover object-center lg:block"
      />

      <div
        className="absolute inset-0 -z-[5] hidden bg-[linear-gradient(90deg,rgba(249,252,250,0.995)_0%,rgba(247,251,247,0.97)_35%,rgba(247,251,247,0.64)_51%,rgba(247,251,247,0.11)_69%,rgba(247,251,247,0)_100%)] lg:block"
        aria-hidden
      />

      <div className="mx-auto flex min-h-[545px] max-w-7xl items-center px-5 py-10 md:px-8 lg:min-h-[650px] lg:py-16">
        <div className="w-full lg:max-w-[49%]">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#15803d] shadow-sm backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Rayjin Hardware Online Store
          </div>

          <h1 className="mt-5 max-w-2xl font-display text-4xl font-extrabold leading-[1.03] tracking-tight text-[#123c2d] sm:text-5xl lg:text-[4.15rem]">
            Project-ready hardware.
            <span className="block text-[#16a34a]">Easier ordering.</span>
          </h1>

          <p className="mt-5 max-w-[36rem] text-sm leading-7 text-[#4f675d] sm:text-base">
            Shop hardware online with clear pricing, convenient pickup options, and local delivery
            across Initao, Libertad, Naawan, and Gitagum.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onShopProductsClick}
              className="inline-flex items-center gap-2 rounded-xl bg-[#15803d] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-[#166534] active:scale-[0.98]"
            >
              Shop Products <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#categories"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white/90 px-5 py-3 text-sm font-extrabold text-[#166534] shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50"
            >
              Browse Categories
            </a>
          </div>

          <Link
            to={supportHref}
            onClick={onSupportClick}
            className="mt-5 flex max-w-xl items-center gap-3 rounded-2xl border border-emerald-200/80 bg-white/82 px-4 py-3.5 text-left shadow-[0_14px_35px_-28px_rgba(11,59,35,0.8)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-white"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#15803d]">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-extrabold text-[#17372d]">Not sure which item fits your project?</span>
              <span className="mt-0.5 block text-[11px] leading-5 text-[#61766d]">Ask Rayjin Hardware about products, pickup, or delivery.</span>
            </span>
            <span className="hidden items-center gap-1 text-[11px] font-extrabold text-[#15803d] sm:inline-flex">
              Message us <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-bold text-[#4f675d]">
            <span className="inline-flex items-center gap-1.5"><Package className="h-4 w-4 text-[#16a34a]" /> Live stock</span>
            <span className="inline-flex items-center gap-1.5"><Tag className="h-4 w-4 text-[#16a34a]" /> Clear pricing</span>
            <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-4 w-4 text-[#16a34a]" /> Customer support</span>
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-[#dce9df] bg-white shadow-[0_24px_55px_-36px_rgba(11,59,35,0.62)] lg:hidden">
            <img
              src="/images/rayjin-storefront-hero.png"
              alt="Rayjin Hardware product assortment"
              className="h-64 w-full object-cover object-[72%_center] sm:h-80"
            />
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute right-[3.6%] top-[8.6rem] hidden w-[15.5rem] rounded-2xl border border-white/25 bg-[#0b3b23]/90 p-4 shadow-[0_22px_50px_-28px_rgba(5,46,22,0.78)] backdrop-blur-xl xl:flex 2xl:right-[4.5%]"
        aria-label="Rayjin Hardware local delivery coverage"
      >
        <span className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/12 text-emerald-200 ring-1 ring-white/15">
          <Truck className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-[9px] font-extrabold uppercase tracking-[0.17em] text-emerald-200">Local Delivery</span>
          <span className="mt-1 block text-sm font-extrabold leading-5 text-white">4 nearby municipalities</span>
          <span className="mt-1 block text-[10px] leading-4 text-emerald-50/80">Initao · Libertad · Naawan · Gitagum</span>
        </span>
      </div>

      <div
        className="pointer-events-none absolute bottom-[5.25rem] right-[7%] hidden w-[14.5rem] rounded-2xl border border-white/25 bg-[#0b3b23]/90 p-4 shadow-[0_22px_50px_-28px_rgba(5,46,22,0.78)] backdrop-blur-xl 2xl:flex"
        aria-label="Rayjin Hardware fulfillment options"
      >
        <span className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/12 text-emerald-200 ring-1 ring-white/15">
          <Store className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-[9px] font-extrabold uppercase tracking-[0.17em] text-emerald-200">Order Your Way</span>
          <span className="mt-1 block text-sm font-extrabold leading-5 text-white">Pickup · Shop &amp; Go · Delivery</span>
          <span className="mt-1 block text-[10px] leading-4 text-emerald-50/80">Choose the fulfillment option that fits your order.</span>
        </span>
      </div>
    </section>
  );
}
