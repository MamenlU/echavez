import { Section } from './Section';
import { technologyStack, databaseTables, sectionMeta } from '../data/content';

const CORE_TABLE_COUNT = 15;

export function TechStack() {
  const coreTables = databaseTables.slice(0, CORE_TABLE_COUNT);
  const expansionTables = databaseTables.slice(CORE_TABLE_COUNT);

  return (
    <Section
      id="tech"
      eyebrow={sectionMeta.tech.eyebrow}
      title={sectionMeta.tech.title}
      intro="The release candidate keeps the established React/TypeScript frontend, Node.js/Express API layer, and MySQL-compatible MariaDB database. The professional expansion grows the schema from 15 core tables to the approved 22-table architecture without storing duplicate profit, COGS, or reorder-summary tables."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-4 sm:grid-cols-2">
          {technologyStack.map((t, i) => (
            <div
              key={t.name}
              data-delay={i * 80}
              className="reveal group rounded-2xl border border-steel-200 bg-white p-5 transition-all hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-950/5"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0b3b23] text-emerald-300 shadow-md transition-transform group-hover:scale-110">
                  <t.icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <span className="rounded-full bg-steel-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-steel-600">{t.name}</span>
              </div>
              <h3 className="mt-4 text-base font-bold text-[#17372d]">{t.tech}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-steel-500">{t.desc}</p>
            </div>
          ))}
        </div>

        <div className="reveal rounded-2xl border border-steel-200 bg-[#12372a] p-6 text-white shadow-xl shadow-emerald-950/15">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Relational Data Layer</span>
              <h3 className="mt-1 font-display text-xl font-bold">MySQL/MariaDB via phpMyAdmin</h3>
              <p className="mt-1 text-xs text-emerald-100">Central stock ledger + normalized operational records</p>
            </div>
            <span className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-bold text-[#052e16]">{databaseTables.length} tables</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-100">15 core tables</span>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-200 ring-1 ring-emerald-400/20">7 professional expansion tables</span>
          </div>

          <div className="mt-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-300">Core system</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {coreTables.map((t) => (
                <span key={t} className="rounded-md bg-white/[0.06] px-2.5 py-1 font-mono text-[10px] text-emerald-50 ring-1 ring-white/10">{t}</span>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-300">Professional expansion</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {expansionTables.map((t) => (
                <span key={t} className="rounded-md bg-emerald-500/15 px-2.5 py-1 font-mono text-[10px] text-emerald-100 ring-1 ring-emerald-400/15">{t}</span>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-[#052e16]/60 p-4">
            <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-wider text-emerald-100">
              <span>Architecture principles</span>
              <span className="text-emerald-400">Preserved</span>
            </div>
            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-emerald-100">
              <li>• inventory_movements remains the source ledger for stock-changing events.</li>
              <li>• Purchase Orders do not change stock until actual Goods Receiving.</li>
              <li>• Historical POS sales remain valid even when shift_id is NULL.</li>
              <li>• Profit, COGS, reorder, and dashboard summaries are calculated rather than duplicated into summary tables.</li>
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}
