import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Store,
  Truck,
  X,
} from 'lucide-react';
import { ProductImageViewer } from './ProductImageViewer';

export interface ProductDetailsItem {
  id: number;
  name: string;
  description?: string | null;
  unit?: string | null;
  price: number | string;
  category?: string | null;
  image?: string | null;
  stock: number | string;
  brand?: string | null;
  status?: 'active' | 'inactive';
  fulfillment_rule?: 'all' | 'delivery_only';
}

interface ProductDetailsModalProps {
  product: ProductDetailsItem | null;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onAddToCart: (quantity: number) => void;
  onClose: () => void;
}

const isUsableImage = (value?: string | null) =>
  Boolean(
    value &&
      (value.startsWith('/') ||
        value.startsWith('http') ||
        value.startsWith('data:image/')),
  );

const formatMoney = (value: number | string) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
};

const DESCRIPTION_PREVIEW_LIMIT = 360;

export function ProductDetailsModal({
  product,
  quantity,
  onQuantityChange,
  onAddToCart,
  onClose,
}: ProductDetailsModalProps) {
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const stock = Math.max(0, Number(product?.stock) || 0);
  const safeQuantity = stock > 0 ? Math.min(stock, Math.max(1, quantity || 1)) : 1;

  const description = useMemo(
    () =>
      product?.description?.trim() ||
      'Product information is available from the current Rayjin Hardware catalog.',
    [product?.description],
  );

  const hasLongDescription = description.length > DESCRIPTION_PREVIEW_LIMIT;
  const visibleDescription =
    hasLongDescription && !descriptionExpanded
      ? `${description.slice(0, DESCRIPTION_PREVIEW_LIMIT).trimEnd()}…`
      : description;

  useEffect(() => {
    setImageViewerOpen(false);
    setDescriptionExpanded(false);
  }, [product?.id]);

  useEffect(() => {
    if (!product) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [product]);

  useEffect(() => {
    if (!product || imageViewerOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageViewerOpen, onClose, product]);

  if (!product) return null;

  const inStock = stock > 10;
  const lowStock = stock > 0 && stock <= 10;
  const unit = String(product.unit || '').trim();
  const stockLabel = unit
    ? `${stock.toLocaleString()} ${unit}${stock === 1 ? '' : ''}`
    : `${stock.toLocaleString()} unit${stock === 1 ? '' : 's'}`;
  const total = Number(product.price || 0) * safeQuantity;
  const deliveryOnly = product.fulfillment_rule === 'delivery_only';

  const changeQuantity = (next: number) => {
    if (stock <= 0) return;
    onQuantityChange(Math.min(stock, Math.max(1, next)));
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-[#07140f]/65 p-3 backdrop-blur-md sm:p-5"
        onMouseDown={onClose}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby={`product-details-${product.id}`}
          className="flex h-[94dvh] max-h-[920px] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_35px_100px_-30px_rgba(3,33,20,0.55)] sm:h-[90vh] sm:rounded-[32px] lg:h-[min(760px,86vh)]"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="relative z-20 flex shrink-0 items-center justify-between gap-4 border-b border-[#e5eee8] bg-white/95 px-5 py-4 backdrop-blur sm:px-7 sm:py-5">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">
                {product.category || 'Rayjin Hardware'}
              </p>
              <h2 className="mt-1 font-display text-lg font-extrabold text-[#17372d] sm:text-xl">
                Product Details
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e2ebe5] bg-[#f7faf8] text-[#52675d] transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100"
              aria-label="Close product details"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="grid min-h-0 flex-1 grid-rows-[minmax(220px,36vh)_minmax(0,1fr)] overflow-hidden lg:grid-cols-[1.04fr_0.96fr] lg:grid-rows-1">
            <div className="relative flex min-h-0 items-center justify-center overflow-hidden border-b border-[#e7efe9] bg-[radial-gradient(circle_at_top_left,#f7fbf8_0%,#eff7f2_52%,#e8f2eb_100%)] p-4 sm:p-6 lg:border-b-0 lg:border-r lg:p-8">
              <div aria-hidden className="absolute left-8 top-8 h-28 w-28 rounded-full bg-emerald-200/25 blur-3xl" />
              <div aria-hidden className="absolute bottom-10 right-10 h-36 w-36 rounded-full bg-lime-100/40 blur-3xl" />

              {isUsableImage(product.image) ? (
                <button
                  type="button"
                  onClick={() => setImageViewerOpen(true)}
                  className="group/image relative z-10 flex h-full w-full items-center justify-center rounded-[24px] border border-white/80 bg-white/70 p-4 shadow-[0_22px_50px_-38px_rgba(11,59,35,0.55)] backdrop-blur transition hover:border-emerald-200 hover:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:p-6 lg:p-8"
                  aria-label={`View larger image of ${product.name}`}
                >
                  <img
                    src={String(product.image)}
                    alt={product.name}
                    className="max-h-[28vh] max-w-full select-none object-contain transition duration-300 group-hover/image:scale-[1.025] sm:max-h-[31vh] lg:max-h-[440px]"
                  />

                  <span className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#dfe9e2] bg-white/95 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#17372d] shadow-lg backdrop-blur transition sm:translate-y-2 sm:opacity-0 sm:group-hover/image:translate-y-0 sm:group-hover/image:opacity-100 sm:group-focus-visible/image:translate-y-0 sm:group-focus-visible/image:opacity-100">
                      <Maximize2 className="h-3.5 w-3.5 text-emerald-700" />
                      View full image
                    </span>
                  </span>
                </button>
              ) : (
                <div className="relative z-10 flex h-full w-full flex-col items-center justify-center rounded-[24px] border border-dashed border-emerald-200 bg-white/70 text-center">
                  <Package className="h-20 w-20 text-emerald-200" />
                  <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#708178]">
                    Product image unavailable
                  </p>
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-col bg-white">
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6 lg:px-8 lg:py-7">
                <div className="flex flex-wrap items-center gap-2">
                  {product.brand && (
                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.13em] text-emerald-800">
                      {product.brand}
                    </span>
                  )}
                  {product.category && (
                    <span className="rounded-full border border-[#e2e9e5] bg-[#f7f9f8] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#66786f]">
                      {product.category}
                    </span>
                  )}
                </div>

                <h3
                  id={`product-details-${product.id}`}
                  className="mt-4 font-display text-[1.7rem] font-extrabold leading-[1.08] tracking-[-0.025em] text-[#142f27] sm:text-[2rem]"
                >
                  {product.name}
                </h3>

                <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2">
                  <p className="font-display text-3xl font-extrabold tracking-tight text-[#15803d] sm:text-[2.15rem]">
                    ₱{formatMoney(product.price)}
                  </p>
                  {unit && (
                    <span className="pb-1 text-xs font-semibold text-[#778a81]">
                      per {unit}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {inStock && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" /> In Stock · {stockLabel} available
                    </span>
                  )}
                  {lowStock && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
                      <AlertTriangle className="h-3.5 w-3.5" /> Only {stockLabel} left
                    </span>
                  )}
                  {stock <= 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
                      <AlertTriangle className="h-3.5 w-3.5" /> Out of Stock
                    </span>
                  )}
                </div>

                <div
                  className={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${
                    deliveryOnly
                      ? 'border-amber-200 bg-amber-50/80'
                      : 'border-emerald-100 bg-emerald-50/70'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      deliveryOnly
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-white text-emerald-700 shadow-sm'
                    }`}
                  >
                    {deliveryOnly ? <Truck className="h-[18px] w-[18px]" /> : <Store className="h-[18px] w-[18px]" />}
                  </div>
                  <div>
                    <p
                      className={`text-xs font-extrabold ${
                        deliveryOnly ? 'text-amber-900' : 'text-[#174c33]'
                      }`}
                    >
                      {deliveryOnly ? 'Delivery Only' : 'Flexible Fulfillment'}
                    </p>
                    <p
                      className={`mt-0.5 text-[11px] leading-5 ${
                        deliveryOnly ? 'text-amber-800/80' : 'text-[#5b7669]'
                      }`}
                    >
                      {deliveryOnly
                        ? 'This product is available through Delivery and cannot be ordered for Pickup or Shop & Go.'
                        : 'Available for Pickup, Shop & Go, or Delivery.'}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#324a40]">
                      Product Description
                    </h4>
                    {hasLongDescription && (
                      <button
                        type="button"
                        onClick={() => setDescriptionExpanded((current) => !current)}
                        className="text-[11px] font-extrabold text-emerald-700 transition hover:text-emerald-800"
                      >
                        {descriptionExpanded ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[#61766d]">{visibleDescription}</p>
                </div>

                <div className="mt-6 border-t border-[#e9efeb] pt-5">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#324a40]">
                    Product Information
                  </h4>
                  <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-[#8a9a92]">Brand</dt>
                      <dd className="mt-1 font-bold text-[#243d33]">{product.brand || 'Not specified'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-[#8a9a92]">Category</dt>
                      <dd className="mt-1 font-bold text-[#243d33]">{product.category || 'Uncategorized'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-[#8a9a92]">Unit</dt>
                      <dd className="mt-1 font-bold text-[#243d33]">{unit || 'Not specified'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-[#8a9a92]">Availability</dt>
                      <dd className="mt-1 font-bold text-[#243d33]">
                        {stock > 0 ? `${stockLabel} available` : 'Out of stock'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="z-10 shrink-0 border-t border-[#e2ebe5] bg-white/95 px-5 py-4 shadow-[0_-18px_40px_-34px_rgba(11,59,35,0.55)] backdrop-blur sm:px-7 lg:px-8">
                {stock > 0 ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="shrink-0">
                      <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#65786e]">
                        Quantity
                      </label>
                      <div className="flex h-12 items-center rounded-xl border border-[#dce7df] bg-[#f6f9f7] p-1">
                        <button
                          type="button"
                          onClick={() => changeQuantity(safeQuantity - 1)}
                          disabled={safeQuantity <= 1}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#334b40] shadow-sm transition hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-[44px] select-none text-center text-sm font-extrabold tabular-nums text-[#17372d]">
                          {safeQuantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(safeQuantity + 1)}
                          disabled={safeQuantity >= stock}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#334b40] shadow-sm transition hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onAddToCart(safeQuantity)}
                      className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#15803d] px-5 text-sm font-extrabold text-white shadow-[0_14px_28px_-18px_rgba(21,128,61,0.85)] transition hover:-translate-y-0.5 hover:bg-[#166534] hover:shadow-[0_18px_32px_-18px_rgba(21,128,61,0.9)] active:translate-y-0"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Add to Cart · ₱{total.toFixed(2)}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-[#e4e8e6] bg-[#f4f6f5] text-sm font-extrabold text-[#98a39d]"
                  >
                    Currently Out of Stock
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {isUsableImage(product.image) && (
        <ProductImageViewer
          open={imageViewerOpen}
          src={String(product.image)}
          alt={product.name}
          title={product.name}
          onClose={() => setImageViewerOpen(false)}
        />
      )}
    </>
  );
}
