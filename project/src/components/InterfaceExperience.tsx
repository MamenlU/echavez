import { LayoutDashboard, MessageCircle, ShoppingBag, ShieldCheck, Smartphone, Store, UserRound } from 'lucide-react';
import { Section } from './Section';

const interfaces = [
  {
    icon: Store,
    label: 'Public Storefront',
    title: 'Browse before signing in',
    text: 'A responsive customer-facing storefront presents live products, actual categories, product details, ordering guidance, account entry points, and customer-support access without inventing stock or category figures.',
    points: ['Live catalog and category browsing', 'Ordering-process guidance', 'Registration/login and messaging entry points'],
  },
  {
    icon: UserRound,
    label: 'Customer Dashboard',
    title: 'Shop, track, and communicate',
    text: 'Authenticated customers use one workspace for the live catalog, cart and checkout, My Orders, messaging, profile details, and supported fulfillment/payment flows.',
    points: ['Cart and checkout workflow', 'Order/payment/fulfillment tracking', 'Customer Messages and Rayjin Assistant'],
  },
  {
    icon: LayoutDashboard,
    label: 'Admin Console',
    title: 'Operate the business from one console',
    text: 'The final Admin experience organizes ordering, POS, inventory, purchasing, returns, cashier control, expenses, audit history, financial insights, and management reporting around the same backend records.',
    points: ['Interactive business overview', 'Operational controls and audit trail', 'Compact reporting and detail views'],
  },
];

export function InterfaceExperience() {
  return (
    <Section
      id="interfaces"
      eyebrow="Final interface experience"
      title="One Rayjin Hardware system, three purpose-built workspaces"
      intro="The release candidate uses one consistent visual identity while giving public visitors, authenticated customers, and administrators interfaces suited to their actual tasks. The UI redesign changes presentation and usability—not the underlying payment, inventory, ordering, or financial business rules."
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {interfaces.map(({ icon: Icon, label, title, text, points }) => (
          <article key={label} className="reveal overflow-hidden rounded-3xl border border-steel-200 bg-white shadow-[0_18px_48px_-38px_rgba(11,59,35,0.55)]">
            <div className="border-b border-steel-100 bg-[linear-gradient(135deg,#f7fcf8_0%,#edf8f1_100%)] p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b3b23] text-emerald-300 shadow-lg shadow-emerald-950/10"><Icon className="h-5 w-5" /></span>
                <span className="rounded-full border border-emerald-100 bg-white px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">{label}</span>
              </div>
              <h3 className="mt-5 font-display text-xl font-extrabold tracking-tight text-[#17372d]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-steel-500">{text}</p>
            </div>
            <div className="p-6">
              <ul className="space-y-3">
                {points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-xs font-semibold leading-5 text-[#425a50]">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {point}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      <div className="reveal mt-6 grid gap-4 rounded-3xl border border-[#12372a] bg-[#0b3b23] p-6 text-white sm:grid-cols-3">
        <div className="flex items-start gap-3"><Smartphone className="mt-0.5 h-5 w-5 text-emerald-300" /><div><p className="text-xs font-extrabold">Responsive by design</p><p className="mt-1 text-[11px] leading-5 text-emerald-50/70">Desktop, tablet, and mobile layouts use adaptive navigation, responsive grids, and compact detail patterns.</p></div></div>
        <div className="flex items-start gap-3"><ShoppingBag className="mt-0.5 h-5 w-5 text-emerald-300" /><div><p className="text-xs font-extrabold">Shared commerce rules</p><p className="mt-1 text-[11px] leading-5 text-emerald-50/70">Storefront and Customer Dashboard explain the same checkout, fulfillment, payment-verification, and tracking rules.</p></div></div>
        <div className="flex items-start gap-3"><MessageCircle className="mt-0.5 h-5 w-5 text-emerald-300" /><div><p className="text-xs font-extrabold">Release-candidate status</p><p className="mt-1 text-[11px] leading-5 text-emerald-50/70">Automated checks can be completed before packaging; final browser/MariaDB/payment live acceptance remains a separate final step.</p></div></div>
      </div>
    </Section>
  );
}
