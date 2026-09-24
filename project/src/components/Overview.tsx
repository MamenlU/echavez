import { Section } from './Section';
import { objectives, pillars, sectionMeta } from '../data/content';

export function Overview() {
  return (
    <>
      <Section
        id="overview"
        eyebrow={sectionMeta.overview.eyebrow}
        title={sectionMeta.overview.title}
        intro="Rayjin Hardware currently handles every order, sale, and stock count on paper. This system brings those workflows online so customers can self-serve orders and admins can run the store from a single dashboard — with inventory that updates itself."
      >
        <div className="grid gap-5 md:grid-cols-2">
          {pillars.map((pillar, i) => (
            <div
              key={pillar.title}
              data-delay={i * 90}
              className="reveal group relative overflow-hidden rounded-2xl border border-steel-200 bg-white p-7 transition-all hover:-translate-y-1 hover:border-construction-200 hover:shadow-xl hover:shadow-navy-900/5"
            >
              <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-construction-50 transition-transform group-hover:scale-150" aria-hidden />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-700 text-construction-400 shadow-lg shadow-navy-900/20">
                  <pillar.icon className="h-6 w-6" strokeWidth={2.2} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-navy-900">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-steel-500">{pillar.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="objectives"
        eyebrow={sectionMeta.objectives.eyebrow}
        title={sectionMeta.objectives.title}
        intro="The system exists to solve four concrete problems that manual operations create for the store today."
        className="bg-white"
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {objectives.map((obj, i) => (
            <div
              key={obj.title}
              data-delay={i * 100}
              className="reveal group relative flex flex-col rounded-2xl border border-steel-200 bg-steel-50 p-6 transition-all hover:-translate-y-1.5 hover:border-navy-300 hover:bg-white hover:shadow-2xl hover:shadow-navy-900/10"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-construction-500 text-navy-950 shadow-lg shadow-construction-500/30 transition-transform group-hover:scale-110">
                <obj.icon className="h-5 w-5" strokeWidth={2.4} />
              </div>
              <h3 className="mt-5 text-base font-bold text-navy-900">{obj.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-steel-500">{obj.text}</p>
              <span className="mt-4 text-xs font-bold uppercase tracking-wider text-construction-600">
                Objective {String(i + 1).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
