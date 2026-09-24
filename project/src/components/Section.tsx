import type { ReactNode } from 'react';

type SectionProps = {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
  className?: string;
};

export function Section({ id, eyebrow, title, intro, children, className = '' }: SectionProps) {
  return (
    <section
      id={id}
      className={`relative scroll-mt-24 py-20 md:py-28 ${className}`}
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="reveal mb-14 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-construction-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-construction-600 ring-1 ring-construction-200">
            <span className="h-1.5 w-1.5 rounded-full bg-construction-500" />
            {eyebrow}
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-navy-900 text-balance md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            {title}
          </h2>
          {intro && (
            <p className="mt-5 text-base leading-relaxed text-steel-500 md:text-lg">
              {intro}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
