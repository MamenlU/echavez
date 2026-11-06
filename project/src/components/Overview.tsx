import { Section } from './Section';
import { businessBenefits, objectives, pillars, sectionMeta } from '../data/content';

export function Overview() {
  return (
    <>
      <Section
        id="overview"
        eyebrow={sectionMeta.overview.eyebrow}
        title={sectionMeta.overview.title}
        intro="Rayjin Hardware consolidates customer ordering, onsite sales, inventory, purchasing, post-sale adjustments, cash control, expenses, communication, and management reporting in one web-based platform while preserving controlled stock and payment workflows."
      >
        <div className="grid gap-5 md:grid-cols-2">
          {pillars.map((pillar, i) => (
            <div
              key={pillar.title}
              data-delay={i * 90}
              className="reveal group relative overflow-hidden rounded-2xl border border-steel-200 bg-white p-7 transition-all hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-950/5"
            >
              <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-emerald-50 transition-transform group-hover:scale-150" aria-hidden />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0b3b23] text-emerald-300 shadow-lg shadow-emerald-950/15">
                  <pillar.icon className="h-6 w-6" strokeWidth={2.2} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-[#17372d]">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-steel-500">{pillar.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="reveal mt-8 overflow-hidden rounded-2xl border border-[#dfe9e2] bg-[#0b3b23]">
          <div className="border-b border-white/10 px-6 py-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-300">Practical Value for Rayjin Hardware</p>
            <h3 className="mt-1 font-display text-xl font-extrabold text-white">Designed around real ordering, sales, inventory, and daily administrative work</h3>
          </div>
          <div className="grid gap-px bg-white/10 md:grid-cols-2 xl:grid-cols-4">
            {businessBenefits.map((benefit) => (
              <div key={benefit.title} className="bg-[#0b3b23] p-5">
                <benefit.icon className="h-5 w-5 text-emerald-300" />
                <h4 className="mt-3 text-sm font-extrabold text-white">{benefit.title}</h4>
                <p className="mt-1.5 text-xs leading-5 text-emerald-100">{benefit.text}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section
        id="objectives"
        eyebrow={sectionMeta.objectives.eyebrow}
        title={sectionMeta.objectives.title}
        intro="The presentation keeps the five approved project objectives as the academic foundation while showing how the current release candidate extends them with professional business-control features."
        className="bg-white"
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {objectives.map((obj, i) => (
            <div
              key={obj.title}
              data-delay={i * 100}
              className="reveal group relative flex flex-col rounded-2xl border border-steel-200 bg-steel-50 p-6 transition-all hover:-translate-y-1.5 hover:border-emerald-300 hover:bg-white hover:shadow-2xl hover:shadow-emerald-950/10"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500 text-[#052e16] shadow-lg shadow-emerald-500/20 transition-transform group-hover:scale-110">
                <obj.icon className="h-5 w-5" strokeWidth={2.4} />
              </div>
              <h3 className="mt-5 text-base font-bold text-[#17372d]">{obj.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-steel-500">{obj.text}</p>
              <span className="mt-4 text-xs font-bold uppercase tracking-wider text-emerald-700">Objective {String(i + 1).padStart(2, '0')}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
