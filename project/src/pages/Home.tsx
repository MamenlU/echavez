import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  ClipboardCheck,
  LogIn,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Store,
  Truck,
  UserPlus,
  X,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { ProductDetailsModal } from '../components/ProductDetailsModal';
import { PopularProducts, type PopularProduct } from '../components/PopularProducts';
import { PremiumCategoryShowcase } from '../components/PremiumCategoryShowcase';
import { StorefrontOrderingJourney } from '../components/StorefrontOrderingJourney';
import { StorefrontConversionHub } from '../components/StorefrontConversionHub';
import { useReveal } from '../hooks/useReveal';
import { getLocalItem, setLocalItem } from '../utils/browserStorage';
import { rememberCustomerMessagesRedirect } from '../utils/postAuthRedirect';

interface Product {
  id: number;
  name: string;
  description?: string | null;
  unit?: string | null;
  price: number | string;
  category: string;
  category_id?: number | null;
  image?: string | null;
  stock: number | string;
  brand?: string | null;
  status?: 'active' | 'inactive';
  fulfillment_rule?: 'all' | 'delivery_only';
}

interface Category {
  category_id: number;
  category_name: string;
  description?: string | null;
  status?: string;
}

interface StoredUser {
  role?: 'customer' | 'admin';
  first_name?: string;
  username?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const isUsableProductImage = (value?: string | null) => {
  if (!value) return false;
  return value.startsWith('/') || value.startsWith('http') || value.startsWith('data:image/');
};

export function Home() {
  const ref = useReveal<HTMLDivElement>();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'recommended' | 'price_asc' | 'price_desc' | 'name'>('recommended');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailsQuantity, setDetailsQuantity] = useState(1);
  const [loginPromptProduct, setLoginPromptProduct] = useState<Product | null>(null);
  const [addedMessage, setAddedMessage] = useState('');
  const [user, setUser] = useState<StoredUser | null>(null);
  const [urlSearchParams] = useSearchParams();
  const storefrontSearchParam = urlSearchParams.get('search') ?? '';

  useEffect(() => {
    setDetailsQuantity(1);
  }, [selectedProduct?.id]);

  useEffect(() => {
    const userStr = getLocalItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr) as StoredUser);
      } catch {
        setUser(null);
      }
    }

    const loadStorefront = async () => {
      setLoading(true);
      setLoadError('');

      const [productResult, categoryResult] = await Promise.allSettled([
        fetch('/api/products'),
        fetch('/api/categories'),
      ]);

      try {
        if (productResult.status === 'fulfilled' && productResult.value.ok) {
          const productData = await productResult.value.json();
          setProducts(Array.isArray(productData) ? productData : []);
        } else {
          setProducts([]);
          setLoadError('The live product catalog is temporarily unavailable. Please try again shortly.');
        }

        if (categoryResult.status === 'fulfilled' && categoryResult.value.ok) {
          const categoryData = await categoryResult.value.json();
          setCategories(Array.isArray(categoryData) ? categoryData : []);
        } else {
          setCategories([]);
        }
      } catch (error) {
        console.error('Unable to load public storefront data:', error);
        setProducts([]);
        setCategories([]);
        setLoadError('The live product catalog is temporarily unavailable. Please try again shortly.');
      } finally {
        setLoading(false);
      }
    };

    void loadStorefront();
  }, []);

  useEffect(() => {
    setSearchQuery(storefrontSearchParam);
  }, [storefrontSearchParam]);

  const normalizeCategory = (value?: string | null) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const categoryNames = useMemo(() => {
    const apiCategoryNames = categories
      .filter(category => category.status !== 'inactive')
      .map((category) => category.category_name?.trim())
      .filter((name): name is string => Boolean(name));

    if (apiCategoryNames.length > 0) {
      return Array.from(new Set(apiCategoryNames)).sort((a, b) => a.localeCompare(b));
    }

    return Array.from(
      new Set(
        products
          .map((product) => product.category?.trim())
          .filter((name): name is string => Boolean(name))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [categories, products]);

  const categoryLabel = useCallback((product: Product) =>
    categories.find(category => category.status !== 'inactive' && Number(category.category_id) === Number(product.category_id))?.category_name
      || categoryNames.find(label => normalizeCategory(label) === normalizeCategory(product.category))
      || product.category, [categories, categoryNames]);

  const availableProducts = useMemo(() => {
    const activeCategorySet = new Set(categoryNames.map(normalizeCategory));
    const validIds = new Set(categories.filter(category => category.status !== 'inactive').map(category => Number(category.category_id)));
    return products.filter(product => Number(product.stock) > 0 && product.status !== 'inactive' &&
      (categories.length === 0 || (product.category_id != null && validIds.has(Number(product.category_id)))
        || activeCategorySet.has(normalizeCategory(product.category))));
  }, [categories, categoryNames, products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return availableProducts.filter((product) => {
      const matchesCategory = selectedCategory === 'All' || normalizeCategory(categoryLabel(product)) === normalizeCategory(selectedCategory);
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        String(product.brand || '').toLowerCase().includes(normalizedSearch) ||
        categoryLabel(product).toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [availableProducts, searchQuery, selectedCategory, categoryLabel]);

  const displayedProducts = useMemo(() => {
    const items = [...filteredProducts];
    if (sortBy === 'price_asc') items.sort((a, b) => Number(a.price) - Number(b.price));
    if (sortBy === 'price_desc') items.sort((a, b) => Number(b.price) - Number(a.price));
    if (sortBy === 'name') items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }, [filteredProducts, sortBy]);

  const normalizeCategoryName = (value: string) =>
    value.trim().toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ');

  const preferredFeaturedCategories = [
    'Tools',
    'Construction',
    'Electrical',
    'Plumbing',
    'Lumber & Wood',
    'Fasteners',
  ];

  const preferredCategoryMatches = preferredFeaturedCategories
    .map((preferred) =>
      categoryNames.find(
        (category) => normalizeCategoryName(category) === normalizeCategoryName(preferred)
      )
    )
    .filter((category): category is string => Boolean(category));

  const featuredCategories = [
    ...preferredCategoryMatches,
    ...categoryNames.filter(
      (category) => !preferredCategoryMatches.some(
        (featured) => normalizeCategoryName(featured) === normalizeCategoryName(category)
      )
    ),
  ].slice(0, 6);
  const popularProducts = availableProducts.slice(0, 8);
  const scrollToProducts = () => {
    setSelectedCategory('All');
    requestAnimationFrame(() => {
      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    requestAnimationFrame(() => {
      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const addProductToCustomerCart = (product: Product, quantity = 1) => {
    const storedUser = getLocalItem('user');
    let parsedUser: StoredUser | null = null;

    if (storedUser) {
      try {
        parsedUser = JSON.parse(storedUser) as StoredUser;
      } catch {
        parsedUser = null;
      }
    }

    if (!parsedUser || parsedUser.role !== 'customer') {
      setLoginPromptProduct(product);
      return;
    }

    let cart: CartItem[] = [];
    const storedCart = getLocalItem('customer_cart');

    if (storedCart) {
      try {
        const parsedCart = JSON.parse(storedCart);
        cart = Array.isArray(parsedCart) ? parsedCart : [];
      } catch {
        cart = [];
      }
    }

    const existingIndex = cart.findIndex((item) => Number(item.product?.id) === Number(product.id));

    if (existingIndex >= 0) {
      const currentQuantity = Number(cart[existingIndex].quantity) || 0;
      const maxStock = Number(product.stock) || 0;
      cart[existingIndex] = {
        ...cart[existingIndex],
        product,
        quantity: Math.min(currentQuantity + Math.max(1, quantity), maxStock),
      };
    } else {
      cart.push({ product, quantity: Math.min(Math.max(1, quantity), Number(product.stock) || 1) });
    }

    setLocalItem('customer_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
    setAddedMessage(`${product.name} added to your cart.`);
    setTimeout(() => setAddedMessage(''), 2600);
  };

  const displayStockUnit = (product: Product) => {
    const unit = String(product.unit || '').trim();
    return unit ? ` ${unit}` : ' units';
  };

  return (
    <div ref={ref} className="bg-[#f6faf7]">
      <main>
        <Hero
          onShopProductsClick={scrollToProducts}
          supportHref="/login"
          onSupportClick={rememberCustomerMessagesRedirect}
        />

        <section aria-label="First order promotion" className="border-y border-emerald-900/10 bg-[#0b3b23]">
          <div className="mx-auto max-w-7xl px-5 py-5 md:px-8 md:py-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(110deg,#0b3b23_0%,#106333_58%,#16a34a_100%)] px-5 py-6 text-white shadow-[0_24px_55px_-38px_rgba(5,46,22,0.95)] sm:px-7 lg:flex lg:items-center lg:justify-between lg:gap-8">
              <div aria-hidden className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[34px] border-white/5" />
              <div className="relative flex max-w-3xl items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-emerald-100 ring-1 ring-white/15">
                  <BadgePercent className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-200">New customer welcome offer</p>
                  <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">20% OFF your first order</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/85">
                    New Rayjin Hardware customers receive 20% off their first online order when the product subtotal reaches ₱1,000. The offer is applied automatically at checkout and can be used once.
                  </p>
                </div>
              </div>

              <div className="relative mt-5 flex shrink-0 flex-wrap items-center gap-3 lg:mt-0 lg:justify-end">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-emerald-50">Minimum ₱1,000</span>
                <Link
                  to="/register/customer"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-[#0b3b23] shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50"
                >
                  Create Account
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Store shopping benefits" className="border-b border-[#dfe9e2] bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-[#e7efe9] px-5 sm:grid-cols-2 sm:divide-x sm:divide-y-0 md:px-8 lg:grid-cols-4">
            {[
              { icon: Package, title: 'Live Inventory', text: 'Check current product availability' },
              { icon: Truck, title: 'Pickup & Delivery', text: 'Choose how to receive your order' },
              { icon: UserPlus, title: 'Customer Account', text: 'Manage your cart, orders, and profile' },
              { icon: ClipboardCheck, title: 'Track Your Order', text: 'Follow order progress from your account' },
            ].map((benefit) => (
              <div key={benefit.title} className="flex items-center gap-3 px-4 py-5 first:pl-0 last:pr-0 sm:px-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#15803d]">
                  <benefit.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-xs font-extrabold text-[#17372d]">{benefit.title}</span>
                  <span className="mt-1 block text-[10px] leading-4 text-[#61766d]">{benefit.text}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="py-10 md:py-14" aria-label="Popular products this week">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <PopularProducts
              onSelect={(popular: PopularProduct) => {
                const liveProduct = products.find((product) => Number(product.id) === Number(popular.id));
                if (liveProduct) {
                  setSelectedProduct(liveProduct);
                  setDetailsQuantity(1);
                }
              }}
            />
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            {featuredCategories.length > 0 ? (
              <PremiumCategoryShowcase
                id="categories"
                categories={featuredCategories}
                products={availableProducts}
                onSelect={handleCategorySelect}
                onBrowseAll={() => handleCategorySelect('All')}
              />
            ) : !loading ? (
              <div id="categories" className="scroll-mt-24 rounded-3xl border border-dashed border-emerald-200 bg-[#f8fbf9] p-8 text-center text-sm text-[#61766d]">
                No active categories are available yet.
              </div>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="popular-products-title" className="py-10 md:py-14">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">Available now</p>
                <h2 id="popular-products-title" className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#17372d]">
                  Popular hardware picks
                </h2>
                <p className="mt-2 text-sm text-[#61766d]">A quick preview of current customer-visible Rayjin Hardware products.</p>
              </div>
              <button
                type="button"
                onClick={scrollToProducts}
                className="inline-flex items-center gap-2 self-start rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-extrabold text-[#15803d] transition hover:bg-emerald-50 sm:self-auto"
              >
                View All Products <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {popularProducts.length > 0 ? (
              <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {popularProducts.map((product) => (
                  <article
                    key={`popular-${product.id}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-[#deebe2] bg-white shadow-[0_12px_34px_-27px_rgba(11,59,35,0.68)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-[0_24px_42px_-28px_rgba(11,59,35,0.58)]"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className="relative flex h-44 items-center justify-center border-b border-[#edf2ee] bg-[#f5faf6] p-5"
                    >
                      {isUsableProductImage(product.image) ? (
                        <img
                          src={String(product.image)}
                          alt={product.name}
                          className="max-h-36 w-full object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <Package className="h-14 w-14 text-emerald-300" />
                      )}
                      {product.brand && (
                        <span className="absolute right-3 top-3 rounded-full border border-[#dde8e0] bg-white/95 px-2 py-1 text-[8px] font-extrabold uppercase tracking-wider text-[#5d7067] shadow-sm">
                          {product.brand}
                        </span>
                      )}
                    </button>

                    <div className="flex flex-1 flex-col p-4">
                      <button type="button" onClick={() => setSelectedProduct(product)} className="text-left">
                        <span className="block text-[9px] font-extrabold uppercase tracking-[0.14em] text-emerald-700">{product.category}</span>
                        <h3 className="mt-1 min-h-10 text-xs font-extrabold leading-5 text-[#17372d]">{product.name}</h3>
                        <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">
                          In stock: {Number(product.stock)}{displayStockUnit(product)}
                        </span>
                      </button>

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#edf2ee] pt-3">
                        <span className="font-display text-sm font-extrabold text-[#17372d]">₱{Number(product.price).toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => addProductToCustomerCart(product)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#15803d] px-3 py-2 text-[9px] font-extrabold text-white transition hover:bg-[#166534] active:scale-95"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add to Cart
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : !loading ? (
              <div className="mt-7 rounded-2xl border border-dashed border-emerald-200 bg-white p-8 text-center text-sm text-[#61766d]">
                No products are currently available for the public preview.
              </div>
            ) : null}
          </div>
        </section>

        {/* Shop & Go · Express Pickup */}
<section id="shop-go" className="py-10 md:py-14">
  <div className="mx-auto max-w-7xl px-5 md:px-8">
    <div className="overflow-hidden rounded-[28px] bg-[#07512f] shadow-[0_24px_55px_-32px_rgba(7,81,47,0.65)]">
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">

        {/* LEFT CONTENT */}
        <div className="flex flex-col justify-center px-7 py-9 text-white sm:px-9 sm:py-10 lg:px-11 lg:py-11">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-200">
            <Store className="h-3.5 w-3.5" />
            Shop &amp; Go · Express Pickup
          </span>

          <h2 className="mt-5 font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            Order ahead. Pick up faster.
          </h2>

          <p className="mt-4 max-w-xl text-sm leading-7 text-emerald-50/90">
            Order online, choose Shop &amp; Go at checkout, and collect your
            prepared order once Rayjin Hardware marks it ready for pickup.
          </p>

          {/* STEPS */}
          <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {[
              {
                number: '01',
                title: 'Browse',
                text: 'Choose what you need.',
              },
              {
                number: '02',
                title: 'Checkout',
                text: 'Select Shop & Go.',
              },
              {
                number: '03',
                title: 'Pick Up',
                text: 'Collect when ready.',
              },
            ].map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3.5"
              >
                <span className="text-[9px] font-extrabold tracking-[0.16em] text-emerald-300">
                  {step.number}
                </span>

                <p className="mt-1 text-xs font-extrabold text-white">
                  {step.title}
                </p>

                <p className="mt-1 text-[10px] leading-4 text-emerald-50/70">
                  {step.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-7">
            <button
              type="button"
              onClick={scrollToProducts}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-extrabold text-emerald-950 shadow-sm transition hover:bg-emerald-300 active:scale-[0.98]"
            >
              Browse Products
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* RIGHT PROMOTIONAL IMAGE */}
        <div className="relative min-h-[280px] overflow-hidden sm:min-h-[340px] lg:min-h-[360px]">
          <img
            src="/images/shop-go-pickup-handover-v2.png"
            alt="Rayjin Hardware staff handing a prepared Shop and Go order to a customer"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />

          {/* Soft blend between green content and photograph */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07512f]/20 via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#07512f]/35 lg:via-transparent lg:to-transparent" />
        </div>

      </div>
    </div>
  </div>
</section>

        <section id="products" className="scroll-mt-24 border-y border-[#e3ece6] bg-white py-14 md:py-20">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">Available now</p>
                <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#17372d]">
                  Browse hardware products
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#61766d]">
                  Visitors can browse product details freely. A customer account is required only when adding items to cart or ordering.
                </p>
              </div>

              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8d84]" />
                <input
                  aria-label="Search hardware products"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search product, brand, or category..."
                  className="w-full rounded-xl border border-[#dce7df] bg-[#f9fbfa] py-3 pl-10 pr-4 text-sm text-[#17372d] outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="-mx-1 mt-6 flex snap-x gap-2 overflow-x-auto px-1 pb-2 sm:flex-wrap sm:overflow-visible" role="group" aria-label="Filter by product category">
              {['All', ...categoryNames].map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={selectedCategory === category}
                  onClick={() => setSelectedCategory(category)}
                  className={`shrink-0 snap-start rounded-full px-4 py-2.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                    selectedCategory === category
                      ? 'bg-[#15803d] text-white shadow-sm'
                      : 'border border-[#dfe9e2] bg-[#f8fbf9] text-[#4f675d] hover:border-emerald-300 hover:text-[#15803d]'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p aria-live="polite" className="text-xs font-medium text-[#61766d]">
                {!loading && !loadError ? `Showing ${displayedProducts.length} available ${displayedProducts.length === 1 ? 'product' : 'products'}` : 'Browse the Rayjin Hardware catalog'}
              </p>
              <label className="flex items-center gap-2 text-xs font-bold text-[#3d5b4d]">
                Sort products
                <select aria-label="Sort hardware products" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="min-h-11 rounded-xl border border-[#d4e5d9] bg-white px-3 py-2 text-xs font-semibold text-[#17372d] outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                  <option value="recommended">Recommended</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                  <option value="name">Name: A to Z</option>
                </select>
              </label>
            </div>

            {loadError && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {loadError}
              </div>
            )}

            {loading ? (
              <div className="mt-8 grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="h-80 animate-pulse rounded-2xl border border-[#e5ece7] bg-[#f6f9f7]" />
                ))}
              </div>
            ) : displayedProducts.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-4">
                {displayedProducts.map((product) => (
                  <article
                    key={product.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-[#e2ebe5] bg-white shadow-[0_10px_30px_-24px_rgba(11,59,35,0.65)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_20px_38px_-25px_rgba(11,59,35,0.55)]"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className="relative flex h-48 items-center justify-center border-b border-[#edf2ee] bg-[#f8faf8] p-6 text-left"
                    >
                      {isUsableProductImage(product.image) ? (
                        <img src={String(product.image)} alt={product.name} loading="lazy" className="max-h-40 w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <Package className="h-16 w-16 text-emerald-300" />
                      )}
                      {product.brand && (
                        <span className="absolute right-3 top-3 rounded-full border border-gray-200 bg-white/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-gray-600 shadow-sm">
                          {product.brand}
                        </span>
                      )}
                    </button>

                    <div className="flex flex-1 flex-col p-5">
                      <button type="button" onClick={() => setSelectedProduct(product)} className="text-left">
                        <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                          {product.category}
                        </span>
                        <h3 className="mt-1 min-h-10 text-sm font-extrabold leading-5 text-[#17372d]">{product.name}</h3>
                        <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                          In stock: {Number(product.stock)}{displayStockUnit(product)}
                        </span>
                      </button>

                      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#edf2ee] pt-4">
                        <span className="font-display text-base font-extrabold text-[#17372d]">₱{Number(product.price).toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => addProductToCustomerCart(product)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#087b53] px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#166534] active:scale-95"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add to Cart
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-[#d7e5dc] bg-[#f9fbfa] px-6 py-12 text-center">
                <Search className="mx-auto h-8 w-8 text-emerald-300" />
                <h3 className="mt-3 text-sm font-extrabold text-[#17372d]">No available products found</h3>
                <p className="mt-1 text-xs text-[#61766d]">Try another search or category.</p>
              </div>
            )}
          </div>
        </section>



        <StorefrontOrderingJourney />

        <StorefrontConversionHub isCustomerSignedIn={user?.role === 'customer'} />
      </main>

      {addedMessage && (
        <div className="fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-[#0b3b23] px-5 py-3 text-sm font-semibold text-white shadow-2xl">
          <CheckCircle2 className="h-5 w-5 text-emerald-300" /> {addedMessage}
        </div>
      )}

      <ProductDetailsModal
        product={selectedProduct}
        quantity={detailsQuantity}
        onQuantityChange={setDetailsQuantity}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(quantity) => {
          if (!selectedProduct) return;
          addProductToCustomerCart(selectedProduct, quantity);
          if (user?.role === 'customer') setSelectedProduct(null);
        }}
      />

      {loginPromptProduct && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onMouseDown={() => setLoginPromptProduct(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#15803d]">
                <ShoppingCart className="h-6 w-6" />
              </span>
              <button type="button" onClick={() => setLoginPromptProduct(null)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="Close login prompt">
                <X className="h-5 w-5" />
              </button>
            </div>
            <h3 className="mt-5 font-display text-2xl font-extrabold text-[#17372d]">Login required</h3>
            <p className="mt-2 text-sm leading-6 text-[#61766d]">
              You can browse Rayjin Hardware without an account, but you need to log in before adding <strong>{loginPromptProduct.name}</strong> to your cart or placing an order.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#15803d] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#166534]">
                <LogIn className="h-4 w-4" /> Login
              </Link>
              <Link to="/register/customer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-extrabold text-[#166534] transition hover:bg-emerald-100">
                <UserPlus className="h-4 w-4" /> Register Account
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
