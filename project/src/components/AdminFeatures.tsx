import { Section } from './Section';
import { adminFeatures, sectionMeta } from '../data/content';

export function AdminFeatures() {
  const total = adminFeatures.reduce((n, g) => n + g.features.length, 0);

  return (
    <Section
      id="admin"
      eyebrow={sectionMeta.admin.eyebrow}
      title={sectionMeta.admin.title}
      intro="Authorized Admin users operate the store from one console covering orders, POS, customers, inventory, purchasing, stock integrity, returns/voids, cashier shifts, expenses, audit logs, messaging, analytics, and reports."
    >
      <div className="mb-10 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#0b3b23] px-4 py-1.5 text-xs font-semibold text-white">
          {total} Admin Features
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-semibold text-emerald-800">
          {adminFeatures.length} Module Groups
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-semibold text-emerald-700">
          Includes POS Terminal
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {adminFeatures.map((group, gi) => (
          <div
            key={group.group}
            data-delay={(gi % 2) * 80}
            className="reveal overflow-hidden rounded-2xl border border-steel-200 bg-white shadow-sm transition-all hover:shadow-xl hover:shadow-emerald-950/5"
          >
            <div className="flex items-center gap-3 border-b border-steel-200 bg-steel-50 px-5 py-3.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0b3b23] text-emerald-300">
                <group.icon className="h-4.5 w-4.5" strokeWidth={2.2} />
              </span>
              <div className="flex-1">
                <h3 className="font-display text-base font-bold text-[#17372d]">{group.group}</h3>
              </div>
              <span className="text-xs font-bold text-steel-400">
                {group.features.length}
              </span>
            </div>
            <div className="divide-y divide-steel-100">
              {group.features.map((f, i) => (
                <div
                  key={f.title}
                  className="group/feature flex items-start gap-3.5 px-5 py-3.5 transition-colors hover:bg-steel-50"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 transition-all group-hover/feature:bg-emerald-500 group-hover/feature:text-[#052e16]">
                    <f.icon className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-[#17372d]">{f.title}</h4>
                    <p className="mt-0.5 text-xs leading-relaxed text-steel-500">{f.desc}</p>
                  </div>
                  <span className="mt-1 text-[10px] font-bold text-steel-300">
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
