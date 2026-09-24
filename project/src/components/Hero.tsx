import {
  ArrowRight,
  Package,
  Search,
  Store,
  Truck,
} from 'lucide-react';

interface HeroProduct {
  name: string;
  price: number | string;
  stock: number | string;
  unit?: string | null;
}

interface HeroProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  heroProduct?: HeroProduct;
}

export function Hero({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  heroProduct,
}: HeroProps) {
  const stockUnit = String(heroProduct?.unit || 'units').trim() || 'units';

  return (
    <section
      id="top"
      className="relative isolate overflow-hidden border-b border-[#dfe9e2] bg-[#eef7f0] pt-24 lg:min-h-[650px] lg:pt-0"
    >
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(105deg,#f7fbf7_0%,#edf7ef_45%,#dcefdc_100%)]" />

      <img
        src="/images/rayjin-storefront-hero.png"
        alt="Rayjin Hardware construction and hardware products"
        className="absolute inset-0 -z-10 hidden h-full w-full object-cover object-center lg:block"
      />

      <div
        className="absolute inset-0 -z-[5] hidden bg-[linear-gradient(90deg,rgba(247,251,247,0.98)_0%,rgba(247,251,247,0.94)_34%,rgba(247,251,247,0.55)_49%,rgba(247,251,247,0.06)_67%,rgba(247,251,247,0)_100%)] lg:block"
        aria-hidden
      />

      <div className="mx-auto flex min-h-[560px] max-w-7xl items-center px-5 py-10 md:px-8 lg:min-h-[650px] lg:py-20">
        <div className="w-full lg:max-w-[48%]">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#15803d] shadow-sm backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Rayjin Hardware Online Store
          </div>

          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.06] tracking-tight text-[#123c2d] sm:text-5xl lg:text-[4rem]">
            Build better.
            <span className="block text-[#16a34a]">Shop hardware online.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#4f675d] sm:text-base">
            Browse available Rayjin Hardware products, check current stock, and order online for
            Store Pickup, Local Delivery, or Shop &amp; Go.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSearchSubmit();
            }}
            className="mt-7"
          >
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f847a]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search cement, tools, paint, roofing..."
                aria-label="Search Rayjin Hardware products"
                className="h-13 w-full rounded-2xl border border-[#d6e5da] bg-white/95 py-3.5 pl-11 pr-14 text-sm font-medium text-[#17372d] shadow-[0_12px_35px_-24px_rgba(11,59,35,0.55)] outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
              <button
                type="submit"
                aria-label="Search products"
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-[#15803d] text-white shadow-sm transition hover:bg-[#166534]"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onSearchSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-[#15803d] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-[#166534] active:scale-[0.98]"
            >
              Shop Products <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#categories"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white/85 px-5 py-3 text-sm font-extrabold text-[#166534] shadow-sm transition hover:bg-emerald-50"
            >
              Browse Categories
            </a>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-bold text-[#4f675d]">
            <span className="inline-flex items-center gap-1.5">
              <Package className="h-4 w-4 text-[#16a34a]" /> Live stock
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Store className="h-4 w-4 text-[#16a34a]" /> Store pickup
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-[#16a34a]" /> Local delivery
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Store className="h-4 w-4 text-[#16a34a]" /> Shop &amp; Go
            </span>
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-[#dce9df] bg-white shadow-[0_24px_55px_-36px_rgba(11,59,35,0.62)] lg:hidden">
            <img
              src="/images/rayjin-storefront-hero.png"
              alt="Rayjin Hardware product assortment"
              className="h-72 w-full object-cover object-[72%_center] sm:h-80"
            />
          </div>
        </div>
      </div>

      {heroProduct && (
        <div className="pointer-events-none absolute right-[7%] top-28 hidden lg:block">
          <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-xl shadow-emerald-950/10 backdrop-blur-md">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#15803d]">In Stock</p>
            <p className="mt-0.5 text-sm font-extrabold text-[#17372d]">
              {Number(heroProduct.stock)} {stockUnit}
            </p>
          </div>
        </div>
      )}

      {heroProduct && (
        <div className="pointer-events-none absolute right-[4%] top-[43%] hidden lg:block">
          <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-xl shadow-emerald-950/10 backdrop-blur-md">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#61766d]">From</p>
            <p className="mt-0.5 font-display text-xl font-extrabold text-[#15803d]">
              ₱{Number(heroProduct.price).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-24 right-[9%] hidden lg:block">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-[10px] font-extrabold text-[#166534] shadow-xl shadow-emerald-950/10 backdrop-blur-md">
          <Truck className="h-4 w-4 text-[#16a34a]" /> Pickup Available
        </div>
      </div>
    </section>
  );
}
