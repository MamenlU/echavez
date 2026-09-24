import { Wrench, ArrowUp } from 'lucide-react';
const navLinks = [
  { label: 'Overview', href: '#overview' },
  { label: 'Objectives', href: '#objectives' },
  { label: 'Customers', href: '#customers' },
  { label: 'Admin', href: '#admin' },
  { label: 'Process', href: '#process' },
  { label: 'Tech', href: '#tech' },
  { label: 'Colors', href: '#colors' },
];


export function ProjectFooter() {
  return (
    <footer className="relative overflow-hidden bg-navy-900 text-navy-200">
      <div className="dot-pattern absolute inset-0 opacity-40" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 py-14 md:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Brand */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-2.5 text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-construction-500 text-navy-950">
                <Wrench className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-display text-base font-extrabold tracking-wide">RAYJIN</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-navy-300">Hardware</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-300">
              A web-based Online Ordering, Point-of-Sale, and Inventory
              Management System built as a capstone project for Rayjin
              Hardware — replacing manual operations with one integrated platform.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-navy-100">
              Capstone Project · System Overview
            </div>
          </div>

          {/* Links */}
          <div className="md:col-span-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-construction-300">Sections</h4>
            <ul className="mt-4 grid grid-cols-2 gap-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-navy-200 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Stack summary */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-construction-300">Built With</h4>
            <ul className="mt-4 space-y-1.5 text-sm text-navy-200">
              <li>MySQL · phpMyAdmin</li>
              <li>PayMongo Payments</li>
              <li>Barcode-enabled POS</li>
              <li>Responsive Web App</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-navy-300">
            © {new Date().getFullYear()} Rayjin Hardware — System Overview Document
          </p>
          <a
            href="#top"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
          >
            Back to top
            <ArrowUp className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
