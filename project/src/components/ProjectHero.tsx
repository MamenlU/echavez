import { ArrowRight, Database, ShieldCheck, Wrench, Zap } from 'lucide-react';
import { overviewStats } from '../data/content';

export function ProjectHero() {
  return (
    <section
      id="top"
      className="relative isolate overflow-hidden bg-[#0b3b23] pb-20 pt-28 md:pb-28 md:pt-36"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#052e16] via-[#0b3b23] to-[#12372a]" />
      <div className="dot-pattern absolute inset-0 -z-10 opacity-60" />
      <div className="absolute -top-32 right-0 -z-10 h-[36rem] w-[36rem] rounded-full bg-emerald-500/20 blur-[120px]" aria-hidden />
      <div className="absolute bottom-0 left-0 -z-10 h-72 w-72 rounded-full bg-emerald-300/15 blur-[100px]" aria-hidden />

      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-200 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Capstone Project · Release Candidate
              </div>
              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-100">
                Full live acceptance pending
              </span>
            </div>

            <h1 className="mt-6 text-balance font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white md:text-5xl lg:text-6xl">
              Web-Based Online Ordering,{' '}
              <span className="bg-gradient-to-r from-emerald-300 to-emerald-400 bg-clip-text text-transparent">
                Point-of-Sale, and Inventory Management
              </span>{' '}
              System for Rayjin Hardware
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-emerald-50 md:text-lg">
              A unified hardware-retail platform connecting customer ordering, onsite POS,
              fulfillment, inventory integrity, purchasing, cash control, post-sale adjustments,
              operating expenses, auditability, and management reporting.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#overview"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-[#052e16] shadow-xl shadow-emerald-500/20 transition-all hover:bg-emerald-300 hover:shadow-emerald-500/30"
              >
                Explore the Implemented System
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#insights"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10"
              >
                View Business Insights
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-emerald-100">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Customer &amp; Admin access</span>
              <span className="inline-flex items-center gap-1.5"><Database className="h-4 w-4 text-emerald-300" /> Verified 22-table architecture</span>
              <span className="inline-flex items-center gap-1.5"><Zap className="h-4 w-4 text-emerald-300" /> Central inventory ledger</span>
              <span className="inline-flex items-center gap-1.5"><Wrench className="h-4 w-4 text-emerald-300" /> Built for Rayjin Hardware operations</span>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-emerald-300/15 to-transparent blur-2xl" aria-hidden />
              <div className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100">Current System Snapshot</span>
                    <p className="mt-1 text-[11px] text-emerald-100/75">Final release-candidate implementation scope</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200">Implemented</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4">
                  {overviewStats.map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-white/10 bg-[#12372a]/40 p-4 transition-colors hover:bg-[#12372a]/60">
                      <stat.icon className="h-5 w-5 text-emerald-300" />
                      <div className="mt-3 font-display text-2xl font-bold text-white">{stat.value}</div>
                      <div className="mt-0.5 text-xs font-semibold text-white">{stat.label}</div>
                      <div className="mt-1 text-[11px] leading-4 text-emerald-100">{stat.sub}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-white/10 bg-[#052e16]/50 px-4 py-3 text-xs leading-5 text-emerald-100">
                  The release candidate includes the final Admin, Storefront, Customer Dashboard, and presentation refinements. Automated checks are documented; final browser/MariaDB/PayMongo live acceptance remains intentionally pending.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <svg viewBox="0 0 1440 80" className="w-full" preserveAspectRatio="none">
          <path d="M0 80 L0 40 C 360 80 1080 0 1440 40 L1440 80 Z" className="fill-steel-50" />
        </svg>
      </div>
    </section>
  );
}
