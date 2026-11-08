import { Section } from './Section';
import { customerFeatures, sectionMeta } from '../data/content';

export function CustomerFeatures() {
  const total = customerFeatures.reduce((n, g) => n + g.features.length, 0);

  return (
    <Section
      id="customers"
      eyebrow={sectionMeta.customers.eyebrow}
      title={sectionMeta.customers.title}
      intro="Customers can create an account, browse current products, use the implemented cart and checkout, receive the eligible first-order merchandise discount, choose Pickup, Delivery, or Shop & Go, use supported payment options, track orders, and communicate with Rayjin Hardware."
      className="bg-steel-50"
    >
      <div className="mb-10 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#0b3b23] px-4 py-1.5 text-xs font-semibold text-white">
          {total} Customer Features
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-semibold text-emerald-800">
          {customerFeatures.length} Feature Groups
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
            <div className="flex items-center gap-4 border-b border-steel-200 bg-gradient-to-r from-[#0b3b23] to-[#12372a] px-6 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-[#052e16] shadow-md">
                <group.icon className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-white">{group.group}</h3>
                <p className="text-xs text-emerald-100">
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
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#166534] ring-1 ring-emerald-100 transition-all group-hover/feature:bg-emerald-500 group-hover/feature:text-[#052e16] group-hover/feature:ring-emerald-200">
                      <f.icon className="h-4.5 w-4.5" strokeWidth={2.2} />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-[#17372d]">{f.title}</h4>
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
