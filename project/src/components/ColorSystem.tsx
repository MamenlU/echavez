import { Section } from './Section';
import { colorPalette, sectionMeta } from '../data/content';

export function ColorSystem() {
  return (
    <Section
      id="colors"
      eyebrow={sectionMeta.colors.eyebrow}
      title={sectionMeta.colors.title}
      intro="The final interface centers on Rayjin Hardware green, clean white surfaces, soft mint support states, and clear status colors for a consistent storefront, customer, admin, and presentation experience."
      className="bg-steel-50"
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {colorPalette.map((c, i) => (
          <div
            key={c.name}
            data-delay={i * 70}
            className="reveal group overflow-hidden rounded-2xl border border-steel-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/5"
          >
            {/* Swatch */}
            <div
              className="relative flex h-32 items-end p-5"
              style={{ backgroundColor: c.hex }}
            >
              <div className="absolute right-4 top-4 flex items-center gap-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    c.text === 'light' ? 'bg-white/20 text-white' : 'bg-[#052e16]/10 text-[#17372d]'
                  }`}
                >
                  {c.category}
                </span>
              </div>
              <div className={c.text === 'light' ? 'text-white' : 'text-[#17372d]'}>
                <div className="font-display text-lg font-bold">{c.name}</div>
                <div className="font-mono text-xs opacity-80">{c.hex}</div>
              </div>
            </div>

            {/* Details */}
            <div className="p-5">
              <dl className="space-y-3 text-xs">
                <div className="flex items-start gap-2">
                  <dt className="w-16 shrink-0 font-semibold uppercase tracking-wider text-steel-400">Role</dt>
                  <dd className="text-[#166534]">{c.role}</dd>
                </div>
                <div className="flex items-start gap-2">
                  <dt className="w-16 shrink-0 font-semibold uppercase tracking-wider text-steel-400">Meaning</dt>
                  <dd className="text-steel-500">{c.meaning}</dd>
                </div>
              </dl>
            </div>
          </div>
        ))}

        {/* Usage summary card */}
        <div className="reveal group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#0b3b23] bg-[#0b3b23] p-6 text-white shadow-xl">
          <div>
            <h3 className="font-display text-lg font-bold text-white">Paired with intent</h3>
            <p className="mt-2 text-sm leading-relaxed text-emerald-50">
              Forest green anchors the Rayjin identity; emerald supports primary actions and positive states; neutral surfaces keep dense business interfaces readable.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-medium text-emerald-50">
              Primary
            </span>
            <span className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-medium text-emerald-50">
              Secondary
            </span>
            <span className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-medium text-emerald-50">
              Accent
            </span>
            <span className="rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-[#052e16]">
              Action
            </span>
          </div>
        </div>
      </div>
    </Section>
  );
}
