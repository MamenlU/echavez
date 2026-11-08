import { Section } from './Section';
import { processSteps, sectionMeta } from '../data/content';

export function Process() {
  return (
    <Section
      id="process"
      eyebrow={sectionMeta.process.eyebrow}
      title={sectionMeta.process.title}
      intro="Online ordering and onsite POS follow separate but coordinated workflows. Stock changes occur only at the correct business event, while purchasing, returns, physical counts, shifts, expenses, and reporting reuse the same protected records instead of bypassing them."
      className="bg-steel-50"
    >
      <div className="relative">
        {/* Connector line */}
        <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-steel-300 to-transparent lg:block" aria-hidden />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {processSteps.map((s, i) => (
            <div
              key={s.step}
              data-delay={i * 90}
              className="reveal group relative"
            >
              <div className="relative overflow-hidden rounded-2xl border border-steel-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-950/5">
                <div className="flex items-center justify-between">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#166534] ring-1 ring-emerald-100 transition-all group-hover:bg-[#0b3b23] group-hover:text-emerald-300">
                    <s.icon className="h-6 w-6" strokeWidth={2.2} />
                  </span>
                  <span className="font-display text-3xl font-extrabold text-steel-200 transition-colors group-hover:text-emerald-200">
                    {s.step}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-bold text-[#17372d]">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-steel-500">{s.text}</p>
              </div>

              {/* Arrow connector */}
              {i < processSteps.length - 1 && (
                <div className="hidden lg:flex absolute -right-3 top-1/2 z-10 h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 text-[#052e16] shadow-md">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5h6m0 0L5 2m3 3L5 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
