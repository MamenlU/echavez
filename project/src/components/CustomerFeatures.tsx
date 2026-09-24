import { Section } from './Section';
import { customerFeatures, sectionMeta } from '../data/content';

export function CustomerFeatures() {
  const total = customerFeatures.reduce((n, g) => n + g.features.length, 0);

  return (
    <Section
      id="customers"
      eyebrow={sectionMeta.customers.eyebrow}
      title={sectionMeta.customers.title}
      intro="From account creation to order tracking, customers can browse the catalog, pay online, and choose how they receive their items — all without calling the store."
      className="bg-steel-50"
    >
      <div className="mb-10 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-navy-700 px-4 py-1.5 text-xs font-semibold text-white">
          {total} Customer Features
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-construction-100 px-4 py-1.5 text-xs font-semibold text-construction-700">
          4 Feature Groups
        </span>
      </div>

      <div className="space-y-6">
        {customerFeatures.map((group, gi) => (
          <div
            key={group.group}
            data-delay={gi * 80}
            className="reveal overflow-hidden rounded-2xl border border-steel-200 bg-white shadow-sm"
          >
            {/* Group header */}
            <div className="flex items-center gap-4 border-b border-steel-200 bg-gradient-to-r from-navy-700 to-navy-800 px-6 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-construction-500 text-navy-950 shadow-md">
                <group.icon className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-white">{group.group}</h3>
                <p className="text-xs text-navy-200">
                  {group.features.length} feature{group.features.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Features grid */}
            <div className="grid gap-px bg-steel-200 sm:grid-cols-2 lg:grid-cols-3">
              {group.features.map((f, i) => (
                <div
                  key={f.title}
                  className="group/feature relative bg-white p-5 transition-colors hover:bg-steel-50"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 ring-1 ring-navy-100 transition-all group-hover/feature:bg-construction-500 group-hover/feature:text-navy-950 group-hover/feature:ring-construction-200">
                      <f.icon className="h-4.5 w-4.5" strokeWidth={2.2} />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-navy-900">{f.title}</h4>
                      <p className="mt-1 text-xs leading-relaxed text-steel-500">{f.desc}</p>
                    </div>
                  </div>
                  <span className="absolute right-4 top-5 text-[10px] font-bold text-steel-300">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
