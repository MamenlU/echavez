import { Calculator, ShieldCheck } from 'lucide-react';
import { Section } from './Section';
import { financialInsights, managementControls, sectionMeta } from '../data/content';

export function BusinessInsights() {
  return (
    <Section
      id="insights"
      eyebrow={sectionMeta.insights.eyebrow}
      title={sectionMeta.insights.title}
      intro="Rayjin Hardware separates merchandise revenue, service/delivery revenue, product cost, operating expenses, and management estimates so total sales are not incorrectly presented as profit."
      className="bg-[#f4f9f6]"
    >
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
        {financialInsights.map((item, index) => (
          <article
            key={item.title}
            data-delay={index * 70}
            className="reveal rounded-2xl border border-[#dfe9e2] bg-white p-6 shadow-[0_18px_42px_-34px_rgba(11,59,35,0.65)]"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0b3b23] text-emerald-300 shadow-lg shadow-emerald-950/15">
                <item.icon className="h-5 w-5" strokeWidth={2.3} />
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#15803d] ring-1 ring-emerald-100">
                Implemented
              </span>
            </div>
            <h3 className="mt-5 font-display text-lg font-extrabold text-[#17372d]">{item.title}</h3>
            <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3.5 py-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#15803d]">Definition</p>
              <p className="mt-1.5 text-xs font-bold leading-5 text-[#17372d]">{item.formula}</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#61766d]">{item.text}</p>
          </article>
        ))}
      </div>

      <div className="reveal mt-8 overflow-hidden rounded-3xl border border-[#12372a] bg-[#0b3b23] text-white shadow-[0_26px_70px_-38px_rgba(5,46,22,0.75)]">
        <div className="grid lg:grid-cols-[0.85fr_2.15fr]">
          <div className="border-b border-white/10 p-7 lg:border-b-0 lg:border-r">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-[#052e16] shadow-lg shadow-emerald-500/20">
              <Calculator className="h-6 w-6" />
            </span>
            <h3 className="mt-5 font-display text-xl font-extrabold">Management Control Center</h3>
            <p className="mt-2 text-sm leading-6 text-emerald-100">
              The Admin Dashboard brings the most important operational controls together without storing duplicate summary tables.
            </p>
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-xs leading-5 text-emerald-100">
              <strong className="text-white">Financial scope:</strong> Estimated Net Profit is a management estimate, not a full accounting, tax, payroll, or general-ledger statement.
            </div>
          </div>

          <div className="grid gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-3">
            {managementControls.map((item) => (
              <div key={item.title} className="bg-[#0b3b23] p-5 transition hover:bg-[#104833]">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-300 ring-1 ring-white/10">
                    <item.icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-white">{item.title}</h4>
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <p className="mt-1 text-xs leading-5 text-emerald-100">{item.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
