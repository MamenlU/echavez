import { useEffect, useState } from 'react';
import { ArrowRight, Package, Sparkles, Truck, Trophy } from 'lucide-react';

export interface PopularProduct {
  rank: number;
  id: number;
  name: string;
  image?: string | null;
  category?: string | null;
  brand?: string | null;
  price: number;
  stock: number;
  fulfillmentRule?: 'all' | 'delivery_only';
}

interface PopularProductsProps {
  onSelect?: (product: PopularProduct) => void;
  compact?: boolean;
}

const usableImage = (value?: string | null) =>
  Boolean(value && (value.startsWith('/') || value.startsWith('http') || value.startsWith('data:image/')));

const peso = (value: number) =>
  `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function PopularProducts({ onSelect, compact = false }: PopularProductsProps) {
  const [products, setProducts] = useState<PopularProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch('/api/analytics/popular?period=week&limit=5');
        if (!response.ok) throw new Error('Popular products unavailable');
        const payload = await response.json();
        if (active) {
          setProducts(Array.isArray(payload?.products) ? payload.products : []);
          setFailed(false);
        }
      } catch {
        if (active) {
          setProducts([]);
          setFailed(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
  }, []);

  if (failed) return null;

  return (
    <section aria-labelledby={compact ? 'customer-popular-week-title' : 'popular-week-title'} className="overflow-hidden rounded-[2rem] border border-[#DDE8E1] bg-white shadow-[0_20px_55px_-42px_rgba(11,59,35,0.75)]">
      <div className="flex flex-col gap-3 border-b border-[#E8EFEA] bg-[linear-gradient(120deg,#f8fbf9_0%,#eff8f2_100%)] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#15803d]">
            <Sparkles className="h-3.5 w-3.5" /> Real weekly sales
          </span>
          <h2 id={compact ? 'customer-popular-week-title' : 'popular-week-title'} className="mt-1.5 font-display text-xl font-extrabold tracking-tight text-[#17372D] sm:text-2xl">Popular This Week</h2>
          <p className="mt-1 text-[10px] leading-5 text-[#61766D]">Customer-visible best sellers ranked from completed recorded sales—not hard-coded picks.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[9px] font-extrabold text-emerald-700">
          <Trophy className="h-3.5 w-3.5" /> Weekly Best Sellers
        </span>
      </div>

      {loading ? (
        <div className={`grid gap-3 p-5 sm:grid-cols-2 ${compact ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} sm:p-6`}>
          {Array.from({ length: compact ? 4 : 5 }).map((_, index) => <div key={index} className="h-48 animate-pulse rounded-2xl bg-[#F1F5F2]" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="px-6 py-9 text-center">
          <Trophy className="mx-auto h-7 w-7 text-[#B7C5BD]" />
          <p className="mt-3 text-xs font-extrabold text-[#52635B]">Weekly best sellers will appear after valid sales are recorded.</p>
          <p className="mt-1 text-[9px] text-[#8A9992]">The regular storefront remains fully available.</p>
        </div>
      ) : (
        <div className={`grid gap-3 p-5 sm:grid-cols-2 ${compact ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} sm:p-6`}>
          {products.slice(0, compact ? 4 : 5).map((product) => (
            <button key={product.id} type="button" onClick={() => onSelect?.(product)} disabled={!onSelect} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E2EBE5] bg-white text-left shadow-[0_12px_30px_-26px_rgba(11,59,35,0.8)] transition duration-300 enabled:hover:-translate-y-1 enabled:hover:border-emerald-300 enabled:hover:shadow-[0_20px_36px_-26px_rgba(11,59,35,0.65)] disabled:cursor-default">
              <div className="relative flex h-32 items-center justify-center overflow-hidden bg-[#F5F8F6]">
                {usableImage(product.image) ? (
                  <img src={product.image || ''} alt={product.name} className="h-full w-full object-contain p-3 transition-transform duration-300 group-enabled:group-hover:scale-105" />
                ) : (
                  <Package className="h-9 w-9 text-[#A9B9B0]" />
                )}
                <span className="absolute left-2.5 top-2.5 rounded-full bg-[#0B3B23] px-2 py-1 text-[8px] font-extrabold uppercase tracking-wide text-white">#{product.rank} Best Seller</span>
              </div>
              <div className="flex flex-1 flex-col p-3.5">
                <p className="line-clamp-1 text-[9px] font-bold uppercase tracking-wide text-[#71817A]">{product.category || product.brand || 'Hardware'}</p>
                <h3 className="mt-1 line-clamp-2 min-h-[36px] text-xs font-extrabold leading-[18px] text-[#17372D]">{product.name}</h3>
                <div className="mt-auto pt-3">
                  <p className="text-sm font-black text-[#0D7740]">{peso(product.price)}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[8px] font-bold text-[#61766D]">
                    <span className="inline-flex items-center gap-1">
                      {product.fulfillmentRule === 'delivery_only' ? <Truck className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                      {product.fulfillmentRule === 'delivery_only' ? 'Delivery only' : 'Flexible fulfillment'}
                    </span>
                    {onSelect && <ArrowRight className="h-3 w-3 text-[#15803d] transition group-hover:translate-x-0.5" />}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
