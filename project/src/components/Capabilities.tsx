import { Section } from './Section';
import { systemCapabilities, sectionMeta } from '../data/content';

export function Capabilities() {
  return (
    <Section
      id="controls"
      eyebrow={sectionMeta.capabilities.eyebrow}
      title={sectionMeta.capabilities.title}
      intro="These controls are implemented in the current release candidate to protect inventory integrity, payment/refund separation, purchasing accuracy, cash accountability, and traceability without claiming unsupported enterprise security features."
      className="bg-[#0b3b23] text-white"
    >
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {systemCapabilities.map((cap, i) => (
          <div
            key={cap.title}
            data-delay={i * 100}
            className="reveal group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-emerald-300/30 hover:bg-white/[0.08]"
          >
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-xl transition-opacity group-hover:opacity-100" aria-hidden />
            <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-[#052e16] shadow-lg shadow-emerald-500/20 transition-transform group-hover:scale-110">
              <cap.icon className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <h3 className="relative mt-5 text-base font-bold text-white">{cap.title}</h3>
            <p className="relative mt-2 text-sm leading-relaxed text-emerald-50">{cap.text}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
