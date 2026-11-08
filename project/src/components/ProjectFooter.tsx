import { ArrowUp, ChevronLeft, Presentation } from 'lucide-react';
import { Link } from 'react-router-dom';

/** Presentation-specific footer. The interactive /project experience retains its own identity. */
export function ProjectFooter() {
  return (
    <footer className="border-t border-emerald-300/20 bg-[#062b21] px-5 py-8 text-emerald-50 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Presentation aria-hidden="true" className="h-6 w-6 text-emerald-300" />
          <div><p className="text-sm font-bold text-white">Rayjin Hardware · Interactive Capstone Presentation</p><p className="mt-1 text-xs text-emerald-100/70">Browse the project sections using the navigation above.</p></div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10"><ChevronLeft className="h-4 w-4" aria-hidden="true" />Return to Storefront</Link>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-bold text-[#062b21] transition hover:bg-emerald-300">Back to Presentation Top <ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
        </div>
      </div>
    </footer>
  );
}
