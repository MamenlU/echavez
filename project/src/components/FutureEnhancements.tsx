import { Gift, Sparkles, Tag, Trophy } from 'lucide-react';
import { Section } from './Section';

const plannedItems = [
  {
    icon: Gift,
    title: 'Promos & Loyalty Program',
    text: 'The existing Promos & Rewards presentation remains future-facing. No loyalty points, coins, reward balance, or production promotion engine is counted as implemented functionality.',
  },
  {
    icon: Tag,
    title: 'Automated Gateway Refunds',
    text: 'The current return workflow records verified external non-cash refunds but intentionally does not call an automatic PayMongo refund API. Direct gateway refund automation may be evaluated later.',
  },
  {
    icon: Trophy,
    title: 'Advanced Forecasting & Procurement',
    text: 'The implemented reorder engine uses an explainable formula based on recent demand, lead time, reorder level, current stock, and open Purchase Orders. More advanced forecasting remains future work.',
  },
];

export function FutureEnhancements() {
  return (
    <Section
      id="future"
      eyebrow="Future Development"
      title="Future ideas are separated from the implemented release candidate"
      intro="The items below are not required for the current Rayjin Hardware system to operate. They remain optional future improvements and are not presented as completed Capstone 2 functionality."
      className="bg-[#f4f9f6]"
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {plannedItems.map((item, index) => (
          <article
            key={item.title}
            data-delay={index * 80}
            className="reveal rounded-2xl border border-[#dfe9e2] bg-white p-6 shadow-[0_16px_36px_-30px_rgba(11,59,35,0.65)]"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-[#15803d] ring-1 ring-emerald-100">
                <item.icon className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
                <Sparkles className="h-3 w-3" /> Future
              </span>
            </div>
            <h3 className="mt-5 font-display text-lg font-extrabold text-[#17372d]">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#61766d]">{item.text}</p>
          </article>
        ))}
      </div>

      <div className="reveal mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-900">
        <strong>Presentation rule:</strong> only features supported by the current code, database, and verified implementation documentation are described as implemented. The UI refinement pass is now complete in the release candidate; final whole-system live acceptance remains pending until the browser, MariaDB, and applicable payment workflows are tested on the target Windows environment.
      </div>
    </Section>
  );
}
