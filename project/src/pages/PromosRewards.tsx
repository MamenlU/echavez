import {
  ArrowRight,
  BadgePercent,
  Gift,
  Sparkles,
  Star,
  Tag,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getStoredSession } from '../utils/authSession';

const futureConcepts = [
  {
    icon: BadgePercent,
    title: 'Exclusive Promotions',
    text: 'Future promo codes, seasonal offers, and selected shopping benefits are planned for Rayjin Hardware customers.',
  },
  {
    icon: Star,
    title: 'Customer Rewards',
    text: 'A future loyalty experience is being explored for returning customers and continued support of Rayjin Hardware.',
  },
  {
    icon: Tag,
    title: 'More Ways to Save',
    text: 'Planned promotional programs may introduce more value-focused ways to shop for future projects.',
  },
];

export function PromosRewards() {
  const session = getStoredSession();
  const continueShoppingPath = session?.user?.role === 'customer'
    ? '/customer/dashboard?tab=catalog'
    : '/#products';

  return (
    <main className="min-h-screen bg-[#f6faf7] pt-20">
      <section className="relative isolate overflow-hidden border-b border-[#dfe9e2] bg-[#0b3b23] text-white">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.25),transparent_32%),linear-gradient(120deg,#052e16_0%,#0b3b23_48%,#106333_100%)]" />
        <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full border-[46px] border-white/[0.04]" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 -z-10 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:px-8 md:py-[4.5rem] lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-white/[0.06] px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-200 backdrop-blur-sm">
              <Gift className="h-4 w-4" /> Future Development
            </div>

            <h1 className="mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">
              Promos &amp; Rewards
              <span className="mt-2 block bg-gradient-to-r from-emerald-300 to-lime-200 bg-clip-text text-transparent">
                Something rewarding is on the way.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-sm leading-7 text-emerald-50/80 sm:text-base">
              Rayjin Hardware is exploring future promotions, customer rewards, seasonal offers,
              and loyalty experiences designed to make shopping even more rewarding.
            </p>

            <div className="mt-7 inline-flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-extrabold text-emerald-100">
              <Sparkles className="h-4 w-4 text-emerald-300" /> Coming Soon — not yet an active rewards program
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={continueShoppingPath}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-extrabold text-emerald-950 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:bg-emerald-300"
              >
                Continue Shopping <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[36px] bg-emerald-300/10 blur-3xl" aria-hidden />
            <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-300">Rayjin Roadmap</p>
                  <h2 className="mt-1 font-display text-xl font-extrabold">Future customer experiences</h2>
                </div>
                <span className="rounded-full bg-emerald-300/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-200 ring-1 ring-emerald-300/20">
                  Planned
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {futureConcepts.map((concept) => (
                  <article key={concept.title} className="flex gap-4 rounded-2xl border border-white/10 bg-black/[0.08] p-4 transition hover:border-emerald-300/20 hover:bg-white/[0.06]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200 ring-1 ring-emerald-300/15">
                      <concept.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-white">{concept.title}</h3>
                      <p className="mt-1 text-[11px] leading-5 text-emerald-50/65">{concept.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
        <div className="rounded-[28px] border border-[#dfe9e2] bg-white p-6 shadow-[0_20px_45px_-34px_rgba(11,59,35,0.45)] sm:p-8">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#15803d]">Important</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold text-[#17372d]">This page presents future development only.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#61766d]">
            No rewards balance, points system, promo-code engine, or loyalty earning feature is active yet.
            The current Rayjin Hardware system continues to use its implemented ordering, fulfillment,
            first-order discount, messaging, payment, inventory, and account features as they work today.
          </p>
        </div>
      </section>
    </main>
  );
}
