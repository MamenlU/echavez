import { useState } from 'react';
import {
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  MessageCircle,
  ShoppingCart,
  Truck,
} from 'lucide-react';

type ConfidenceStep = {
  title: string;
  summary: string;
  detail: string;
  bullets: string[];
  icon: typeof ShoppingCart;
};

const steps: ConfidenceStep[] = [
  {
    title: 'Shop Online',
    summary: 'Browse live products and build your order from current inventory.',
    detail:
      'Search and filter the customer-visible catalog, review product details and available stock, then add the quantities you need to your cart.',
    bullets: ['Live catalog records', 'Product details and quantity controls', 'Cart review before checkout'],
    icon: ShoppingCart,
  },
  {
    title: 'Choose Fulfillment',
    summary: 'Select the receiving option that fits the products and supported location.',
    detail:
      'Checkout supports Standard Pickup, Shop & Go express pickup, and Local Delivery where the order and configured delivery coverage allow it.',
    bullets: ['Standard Pickup', 'Shop & Go scheduling', 'Configured municipality/barangay delivery coverage'],
    icon: Truck,
  },
  {
    title: 'Payment & Review',
    summary: 'Complete the applicable payment step, then Rayjin reviews the order.',
    detail:
      'Cash orders follow the pending review workflow. Supported PayMongo Card/GCash orders must satisfy the existing payment-verification rules before approval can proceed.',
    bullets: ['Cash pending/approval flow', 'Verified online-payment status', 'Admin review before fulfillment'],
    icon: ClipboardCheck,
  },
  {
    title: 'Track & Communicate',
    summary: 'Follow order progress and keep questions connected to your account.',
    detail:
      'Use My Orders to follow payment and fulfillment status. Customer Messages keeps general inquiries and order-linked conversations available from the same account.',
    bullets: ['My Orders status tracking', 'Order-linked conversations', 'General customer inquiries'],
    icon: MessageCircle,
  },
];

export function CustomerConfidenceCards() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <section aria-labelledby="customer-confidence-title">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-700">Simple from cart to completion</p>
          <h2 id="customer-confidence-title" className="mt-1 font-display text-2xl font-extrabold tracking-tight text-[#17372d]">
            Shop with confidence
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-[#61766d]">
            Open any step for more detail. The information follows the same ordering, payment, approval, and fulfillment rules used by the live system.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-emerald-700">
          <CircleDollarSign className="h-3.5 w-3.5" /> Real checkout rules
        </span>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => {
          const expanded = expandedIndex === index;
          const Icon = step.icon;
          const contentId = `confidence-step-${index}`;

          return (
            <article
              key={step.title}
              className={`overflow-hidden rounded-[22px] border bg-white shadow-[0_16px_38px_-32px_rgba(11,59,35,0.68)] transition-all duration-300 ${
                expanded ? 'border-emerald-300 shadow-[0_22px_48px_-34px_rgba(11,59,35,0.58)]' : 'border-[#dfe9e2] hover:-translate-y-0.5 hover:border-emerald-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedIndex(expanded ? null : index)}
                aria-expanded={expanded}
                aria-controls={contentId}
                className="flex w-full items-start gap-3 p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${expanded ? 'bg-[#15803d] text-white' : 'bg-[#eaf6ef] text-[#15803d]'}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] font-extrabold uppercase tracking-[0.14em] text-emerald-700">Step {index + 1}</span>
                  <span className="mt-1 block text-sm font-extrabold text-[#17372d]">{step.title}</span>
                  <span className="mt-1.5 block text-[11px] leading-5 text-[#61766d]">{step.summary}</span>
                </span>
                <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-[#71817a] transition-transform duration-300 ${expanded ? 'rotate-180 text-[#15803d]' : ''}`} />
              </button>

              <div
                id={contentId}
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-[#e8efea] bg-[#f8fbf9] px-5 pb-5 pt-4">
                    <p className="text-[11px] leading-5 text-[#526b61]">{step.detail}</p>
                    <ul className="mt-3 space-y-2">
                      {step.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2 text-[10px] font-semibold leading-4 text-[#425a50]">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
