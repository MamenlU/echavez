import { ArrowRight, Wrench, ShieldCheck, Zap } from 'lucide-react';
import { overviewStats } from '../data/content';

export function ProjectHero() {
  return (
    <section
      id="top"
      className="relative isolate overflow-hidden bg-navy-700 pt-28 pb-20 md:pt-36 md:pb-28"
    >
      {/* Background layers */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-navy-900 via-navy-700 to-navy-800" />
      <div className="dot-pattern absolute inset-0 -z-10 opacity-60" />
      <div
        className="absolute -top-32 right-0 -z-10 h-[36rem] w-[36rem] rounded-full bg-construction-500/20 blur-[120px]"
        aria-hidden
      />
      <div
        className="absolute bottom-0 left-0 -z-10 h-72 w-72 rounded-full bg-navy-400/20 blur-[100px]"
        aria-hidden
      />

      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Left: copy */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-construction-300 backdrop-blur-sm">
              <span className="flex h-2 w-2">
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-construction-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-construction-500" />
              </span>
              Capstone Project · System Overview
            </div>

            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white text-balance md:text-5xl lg:text-6xl">
              Web-Based Ordering,{' '}
              <span className="bg-gradient-to-r from-construction-400 to-construction-500 bg-clip-text text-transparent">
                POS &amp; Inventory
              </span>{' '}
              for Rayjin Hardware
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-navy-100 md:text-lg">
              A complete digital platform that replaces manual order-taking,
              sales logs, and stock tracking with one integrated system — serving
              both customers online and staff at the counter.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#overview"
                className="inline-flex items-center gap-2 rounded-lg bg-construction-500 px-6 py-3 text-sm font-semibold text-navy-950 shadow-xl shadow-construction-500/30 transition-all hover:bg-construction-400 hover:shadow-construction-500/50"
              >
                Explore the System
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#objectives"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10"
              >
                Objectives
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-navy-200">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-construction-400" /> Two user roles
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-construction-400" /> Automated inventory sync
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-construction-400" /> Built for hardware retail
              </span>
            </div>
          </div>

          {/* Right: card */}
          <div className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-construction-500/20 to-transparent blur-2xl" aria-hidden />
              <div className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-navy-200">
                    System Snapshot
                  </span>
                  <span className="rounded-full bg-construction-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-construction-300">
                    Live Build
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4">
                  {overviewStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-white/10 bg-navy-800/40 p-4 transition-colors hover:bg-navy-800/60"
                    >
                      <stat.icon className="h-5 w-5 text-construction-400" />
                      <div className="mt-3 font-display text-2xl font-bold text-white">
                        {stat.value}
                      </div>
                      <div className="mt-0.5 text-xs font-semibold text-white">
                        {stat.label}
                      </div>
                      <div className="text-[11px] text-navy-200">{stat.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave divider */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <svg viewBox="0 0 1440 80" className="w-full" preserveAspectRatio="none">
          <path
            d="M0 80 L0 40 C 360 80 1080 0 1440 40 L1440 80 Z"
            className="fill-steel-50"
          />
        </svg>
      </div>
    </section>
  );
}
