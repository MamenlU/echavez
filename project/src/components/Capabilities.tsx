import { Section } from './Section';
import { systemCapabilities, sectionMeta } from '../data/content';

export function Capabilities() {
  return (
    <Section
      id="capabilities"
      eyebrow={sectionMeta.capabilities.eyebrow}
      title={sectionMeta.capabilities.title}
      intro="The value isn't just digitizing forms — these are the automated functions that make the manual version obsolete."
      className="bg-navy-700 text-white"
    >
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {systemCapabilities.map((cap, i) => (
          <div
            key={cap.title}
            data-delay={i * 100}
            className="reveal group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-construction-400/40 hover:bg-white/[0.08]"
          >
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-construction-500/10 blur-xl transition-opacity group-hover:opacity-100" aria-hidden />
            <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-construction-500 text-navy-950 shadow-lg shadow-construction-500/30 transition-transform group-hover:scale-110">
              <cap.icon className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <h3 className="relative mt-5 text-base font-bold text-white">{cap.title}</h3>
            <p className="relative mt-2 text-sm leading-relaxed text-navy-100">{cap.text}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
