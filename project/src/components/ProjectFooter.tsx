import { ArrowUp, Database, ShieldCheck, Wrench } from 'lucide-react';

/** Presentation-specific footer. The interactive /project experience retains its own identity. */
export function ProjectFooter() {
  return (
    <footer className="relative overflow-hidden bg-[#052e16] text-emerald-100">
      <div className="dot-pattern absolute inset-0 opacity-40" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 py-14 md:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <div className="flex items-center gap-2.5 text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-[#052e16]">
                <Wrench className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-display text-base font-extrabold tracking-wide">RAYJIN</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-200">Hardware</span>
              </span>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-emerald-200">
              A Web-Based Online Ordering, Point-of-Sale, and Inventory Management System for Rayjin Hardware — integrating customer ordering, local fulfillment, POS, purchasing, inventory integrity, returns, cash control, operating expenses, auditability, and business reporting.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-emerald-50">
                <Database className="h-3.5 w-3.5 text-emerald-300" /> 22-table approved architecture
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-emerald-50">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Release candidate · live acceptance pending
              </span>
            </div>
          </div>

          <div className="md:col-span-5 md:pl-8 lg:pl-14">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-200">Technology & Integrations</h4>
            <ul className="mt-4 space-y-1.5 text-sm text-emerald-100">
              <li>React · TypeScript · Vite</li>
              <li>Node.js · Express</li>
              <li>MySQL/MariaDB · phpMyAdmin/XAMPP</li>
              <li>JWT · Google Sign-In</li>
              <li>PayMongo-supported online payment status</li>
              <li>Leaflet · OpenStreetMap delivery-location support</li>
              <li>Barcode-assisted onsite POS</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-emerald-200">© {new Date().getFullYear()} Rayjin Hardware — Capstone System Presentation</p>
          <a href="#top" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10">
            Back to top
            <ArrowUp className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
