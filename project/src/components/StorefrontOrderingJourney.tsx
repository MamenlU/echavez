import {
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  LogIn,
  Search,
  Truck,
} from 'lucide-react';

type JourneyStep = {
  title: string;
  text: string;
  icon: typeof Search;
};

const journey: JourneyStep[] = [
  {
    title: 'Browse live products',
    text: 'Explore customer-visible products and categories before signing in.',
    icon: Search,
  },
  {
    title: 'Sign in & build your cart',
    text: 'Use a customer account to add products, manage quantities, and continue to checkout.',
    icon: LogIn,
  },
  {
    title: 'Choose fulfillment',
    text: 'Select Standard Pickup, Shop & Go, or supported Local Delivery during checkout.',
    icon: Truck,
  },
  {
    title: 'Complete payment & review',
    text: 'Choose the supported payment option. Online Card/GCash orders follow the existing PayMongo verification rules before approval.',
    icon: CreditCard,
  },
  {
    title: 'Track through completion',
    text: 'Follow approval, payment, readiness, delivery, and completion updates from My Orders.',
    icon: ClipboardCheck,
  },
];

export function StorefrontOrderingJourney() {
  return (
    <section id="how-it-works" className="scroll-mt-24 py-14 md:py-20" aria-labelledby="ordering-journey-title">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Simple from browsing to completion
          </div>
          <h2 id="ordering-journey-title" className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#17372d] sm:text-4xl">
            A clear path from product search to fulfilled order
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#61766d]">
            Browsing is public. A customer account is required when you are ready to transact, communicate privately, and track an order.
          </p>
        </div>

        <div className="relative mt-10">
          <div aria-hidden="true" className="absolute left-[10%] right-[10%] top-7 hidden h-px bg-[linear-gradient(90deg,transparent,#a7d7b8_10%,#a7d7b8_90%,transparent)] lg:block" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {journey.map((step, index) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.title}
                  className="group relative rounded-[22px] border border-[#dfe9e2] bg-white p-5 shadow-[0_16px_38px_-32px_rgba(11,59,35,0.65)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-[0_24px_48px_-34px_rgba(11,59,35,0.55)]"
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf6ef] text-[#15803d] ring-1 ring-emerald-100 transition group-hover:bg-[#15803d] group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-display text-2xl font-extrabold text-emerald-100">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="mt-4 text-sm font-extrabold leading-5 text-[#17372d]">{step.title}</h3>
                  <p className="mt-2 text-[11px] leading-5 text-[#61766d]">{step.text}</p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-[11px] leading-5 text-amber-900">
          <strong>Order-control note:</strong> placing an online order does not bypass Rayjin Hardware review. Cash orders continue through the pending/approval workflow, while supported online payments must satisfy the existing verification requirements before approval where applicable.
        </div>
      </div>
    </section>
  );
}
