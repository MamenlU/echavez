import { ArrowRight, Boxes, PackageSearch } from 'lucide-react';

interface CategoryProductLike {
  category?: string | null;
}

interface PremiumCategoryShowcaseProps {
  categories: string[];
  products: CategoryProductLike[];
  onSelect: (category: string) => void;
  onBrowseAll: () => void;
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  compact?: boolean;
}

const normalizeCategory = (value: string) =>
  value.trim().toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ');

const categoryImages: Record<string, string> = {
  tools: '/images/categories/tools_category.png',
  construction: '/images/categories/construction_category.png',
  electrical: '/images/categories/electrical_category.png',
  plumbing: '/images/categories/plumbing_category.png',
  fasteners: '/images/categories/fasteners_category.png',
  'lumber and wood': '/images/categories/lumber_and_wood_category.png',
};

const getCategoryImage = (category: string) => categoryImages[normalizeCategory(category)] || null;

export function PremiumCategoryShowcase({
  categories,
  products,
  onSelect,
  onBrowseAll,
  id,
  eyebrow = 'Find what you need faster',
  title = 'Shop by Categories',
  description = 'Browse live Rayjin Hardware categories and jump directly into the products currently available in each section.',
  compact = false,
}: PremiumCategoryShowcaseProps) {
  if (categories.length === 0) return null;

  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={id ? 'scroll-mt-24' : undefined}>
      <div className="overflow-hidden rounded-[30px] border border-[#dce8e0] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbf9_100%)] shadow-[0_26px_70px_-48px_rgba(11,59,35,0.55)]">
        <div className="flex flex-col gap-4 border-b border-[#e8efea] px-6 py-6 sm:px-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#15803d]">{eyebrow}</p>
            <h2 id={id ? `${id}-title` : undefined} className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-[#17372d] sm:text-[1.75rem]">
              {title}
            </h2>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-[#61766d] sm:text-[13px]">{description}</p>
          </div>
          <button
            type="button"
            onClick={onBrowseAll}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-extrabold text-[#15803d] shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            Browse all products
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className={`grid gap-3 p-4 sm:grid-cols-2 sm:p-5 ${compact ? 'xl:grid-cols-3' : 'lg:grid-cols-3'}`}>
          {categories.map((category, index) => {
            const count = products.filter((product) => product.category === category).length;
            const image = getCategoryImage(category);

            return (
              <button
                key={category}
                type="button"
                onClick={() => onSelect(category)}
                className="group relative min-h-[168px] overflow-hidden rounded-[22px] border border-[#dfe9e2] bg-white text-left shadow-[0_16px_38px_-32px_rgba(11,59,35,0.7)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-[0_24px_48px_-34px_rgba(11,59,35,0.58)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                <span className="absolute inset-0 bg-[linear-gradient(135deg,#f8fcf9_0%,#edf7f1_100%)]" />
                {image ? (
                  <span className="absolute inset-y-0 right-0 w-[48%] overflow-hidden">
                    <img
                      src={image}
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-contain p-3 opacity-90 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-100"
                    />
                    <span className="absolute inset-0 bg-gradient-to-r from-[#f8fcf9] via-[#f8fcf9]/45 to-transparent" />
                  </span>
                ) : (
                  <span className="absolute right-5 top-1/2 flex h-20 w-20 -translate-y-1/2 items-center justify-center rounded-[26px] bg-emerald-100/70 text-emerald-700/60 ring-1 ring-emerald-200/70">
                    <Boxes className="h-9 w-9" strokeWidth={1.7} />
                  </span>
                )}

                <span className="relative z-10 flex h-full max-w-[70%] flex-col justify-between p-5">
                  <span>
                    <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-emerald-200 bg-white/90 px-2 text-[10px] font-extrabold text-[#15803d] shadow-sm">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="mt-4 block font-display text-base font-extrabold leading-tight text-[#17372d]">{category}</span>
                    <span className="mt-1.5 block text-[10px] font-semibold text-[#6f8179]">
                      {count} available product{count === 1 ? '' : 's'}
                    </span>
                  </span>

                  <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#15803d]">
                    Explore category
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-start gap-3 border-t border-[#e8efea] bg-[#f4faf6] px-6 py-4 text-[11px] leading-5 text-[#526b61] sm:px-7">
          <PackageSearch className="mt-0.5 h-4 w-4 shrink-0 text-[#15803d]" />
          <p>
            Category names and product counts come from the current Rayjin Hardware catalog. Product availability can change as orders, POS sales, receiving, returns, and stock adjustments are recorded.
          </p>
        </div>
      </div>
    </section>
  );
}
