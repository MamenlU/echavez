import { Section } from './Section';
import { technologyStack, databaseTables, sectionMeta } from '../data/content';

export function TechStack() {
  return (
    <Section
      id="tech"
      eyebrow={sectionMeta.tech.eyebrow}
      title={sectionMeta.tech.title}
      intro="The system is built on a classic, well-understood web stack so it's easy to deploy, maintain, and extend — with a MySQL database managed via phpMyAdmin."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stack list */}
        <div className="grid gap-4 sm:grid-cols-2">
          {technologyStack.map((t, i) => (
            <div
              key={t.name}
              data-delay={i * 80}
              className="reveal group rounded-2xl border border-steel-200 bg-white p-5 transition-all hover:-translate-y-1 hover:border-navy-300 hover:shadow-xl hover:shadow-navy-900/5"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-700 text-construction-400 shadow-md transition-transform group-hover:scale-110">
                  <t.icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <span className="rounded-full bg-steel-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-steel-600">
                  {t.name}
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold text-navy-900">{t.tech}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-steel-500">{t.desc}</p>
            </div>
          ))}
        </div>

        {/* Database panel */}
        <div className="reveal rounded-2xl border border-steel-200 bg-navy-800 p-6 text-white shadow-xl shadow-navy-900/20">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-construction-300">
                Data Layer
              </span>
              <h3 className="mt-1 font-display text-xl font-bold">MySQL via phpMyAdmin</h3>
            </div>
            <span className="rounded-lg bg-construction-500 px-3 py-1 text-xs font-bold text-navy-950">
              {databaseTables.length} tables
            </span>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-navy-100">
            A normalized relational schema stores every customer, product,
            order, sale, and stock movement — with foreign-key relationships
            enforcing integrity across the system.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {databaseTables.map((t) => (
              <span
                key={t}
                className="rounded-md bg-white/[0.06] px-2.5 py-1 font-mono text-[11px] text-navy-100 ring-1 ring-white/10 transition-colors hover:bg-construction-500/20 hover:text-construction-200"
              >
                {t}
              </span>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-white/10 bg-navy-900/60 p-4">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-navy-200">
              <span>Referential integrity</span>
              <span className="text-emerald-400">Enforced</span>
            </div>
            <p className="mt-1.5 text-xs text-navy-200">
              Foreign keys prevent orphaned orders, payments, and stock movements.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
