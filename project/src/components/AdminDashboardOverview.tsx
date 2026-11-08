import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Truck,
} from 'lucide-react';

type InsightKey = 'sales' | 'orders' | 'inventory' | 'fulfillment';

interface OverviewOrder {
  id: string;
  date: string;
  created_at?: string | null;
  total: number;
  fulfillment: 'pickup' | 'delivery' | 'shop_go';
  status: string;
  customer_first_name?: string | null;
  customer_last_name?: string | null;
  items: Array<{ quantity: number }>;
}

interface OverviewProduct {
  id: number;
  name: string;
  category: string;
  stock: number;
  reorder_level: number;
}

interface SalesDay {
  label: string;
  revenue: number;
}

interface DailyOperations {
  salesToday: number;
  discountsToday: number;
  feeRevenueToday: number;
  transactionsToday: number;
  itemsSoldToday: number;
  stockReceivedToday: number;
  stockOutToday: number;
  lowStockProducts: number;
  inventoryValue: number;
  estimatedGrossProfit: number;
  grossProfitMarginToday: number;
  cogsToday: number;
}

interface ManagementOverview {
  profitability: {
    month: {
      estimatedNetProfit: number;
      operatingExpenses: number;
    };
  };
  purchasing: {
    openPurchaseOrders: number;
    outstandingUnits: number;
  };
  replenishment: {
    needsReorder: number;
    coveredByOpenPo: number;
    setupRequired: number;
    suggestedUnits: number;
  };
  saleAdjustmentsToday: {
    adjustmentCount: number;
    refundAmount: number;
  };
  cashier: {
    hasOpenShift: boolean;
    currentShift: null | {
      shiftId: number;
      expectedCash: number;
      transactionCount: number;
    };
    lastClosedShift: null | {
      shiftId: number;
      discrepancy: number;
    };
  };
}

interface AnalyticsPayload {
  period: { businessDate: string };
  dailyOperations: DailyOperations;
  managementOverview?: ManagementOverview;
}

interface AdminDashboardOverviewProps {
  userName: string;
  totalRevenue: number;
  pendingOrders: number;
  activeFulfillment: number;
  completedOrders: number;
  cancelledOrders: number;
  orders: OverviewOrder[];
  lowStockProducts: OverviewProduct[];
  salesDays: SalesDay[];
  onNavigate: (tab: string) => void;
  onOpenLowStockReport: () => void;
}

const peso = (value: number) =>
  `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const count = (value: number) => Number(value || 0).toLocaleString('en-PH');

const activeOrderStatuses = new Set([
  'approved',
  'processing',
  'ready',
  'out_for_delivery',
  'failed_delivery',
  'deactivated',
]);

const orderStatusBadge = (status: string) => {
  if (status === 'completed' || status === 'ready') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (status === 'cancelled' || status === 'rejected') return 'bg-red-50 text-red-700 border-red-100';
  if (status === 'out_for_delivery' || status === 'processing' || status === 'approved') return 'bg-blue-50 text-blue-700 border-blue-100';
  return 'bg-amber-50 text-amber-700 border-amber-100';
};

export function AdminDashboardOverview({
  userName,
  totalRevenue,
  pendingOrders,
  activeFulfillment,
  completedOrders,
  cancelledOrders,
  orders,
  lowStockProducts,
  salesDays,
  onNavigate,
  onOpenLowStockReport,
}: AdminDashboardOverviewProps) {
  const [selectedInsight, setSelectedInsight] = useState<InsightKey>('sales');
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/analytics/admin', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Dashboard analytics are temporarily unavailable.');
      }
      setAnalytics((await response.json()) as AnalyticsPayload);
    } catch (reason) {
      setAnalyticsError(reason instanceof Error ? reason.message : 'Dashboard analytics are temporarily unavailable.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, []);

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const displayDate = today.toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const recentOrders = useMemo(
    () => [...orders]
      .sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime())
      .slice(0, 5),
    [orders]
  );

  const activeOrders = useMemo(
    () => orders.filter((order) => activeOrderStatuses.has(order.status)),
    [orders]
  );

  const fulfillmentBreakdown = useMemo(() => ({
    pickup: activeOrders.filter((order) => order.fulfillment === 'pickup').length,
    shopGo: activeOrders.filter((order) => order.fulfillment === 'shop_go').length,
    delivery: activeOrders.filter((order) => order.fulfillment === 'delivery').length,
    deliveryExceptions: activeOrders.filter((order) => order.status === 'failed_delivery' || order.status === 'deactivated').length,
  }), [activeOrders]);

  const orderTotal = Math.max(pendingOrders + activeFulfillment + completedOrders + cancelledOrders, 1);
  const completedPercent = (completedOrders / orderTotal) * 100;
  const pendingPercent = (pendingOrders / orderTotal) * 100;
  const activePercent = (activeFulfillment / orderTotal) * 100;
  const orderGradient = orders.length === 0
    ? '#E5ECE8'
    : `conic-gradient(#15944F 0 ${completedPercent}%, #F59E0B ${completedPercent}% ${completedPercent + pendingPercent}%, #3B82F6 ${completedPercent + pendingPercent}% ${completedPercent + pendingPercent + activePercent}%, #DC2626 ${completedPercent + pendingPercent + activePercent}% 100%)`;

  const maxRevenue = Math.max(...salesDays.map((day) => day.revenue), 1);
  const d = analytics?.dailyOperations;
  const management = analytics?.managementOverview;

  const kpis = [
    {
      key: 'sales' as const,
      label: 'Sales',
      value: peso(totalRevenue),
      note: 'Recorded paid revenue',
      icon: TrendingUp,
      tone: 'emerald',
    },
    {
      key: 'orders' as const,
      label: 'Orders',
      value: count(pendingOrders),
      note: pendingOrders === 1 ? 'Pending order needs action' : 'Pending orders need action',
      icon: ClipboardList,
      tone: pendingOrders > 0 ? 'amber' : 'emerald',
    },
    {
      key: 'inventory' as const,
      label: 'Inventory',
      value: count(lowStockProducts.length),
      note: lowStockProducts.length === 1 ? 'Low-stock item needs review' : 'Low-stock items need review',
      icon: Boxes,
      tone: lowStockProducts.length > 0 ? 'red' : 'emerald',
    },
    {
      key: 'fulfillment' as const,
      label: 'Fulfillment',
      value: count(activeFulfillment),
      note: activeFulfillment === 1 ? 'Active order in progress' : 'Active orders in progress',
      icon: Truck,
      tone: 'blue',
    },
  ];

  const toneClasses: Record<string, { icon: string; selected: string; accent: string }> = {
    emerald: { icon: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100', selected: 'border-emerald-300 bg-[linear-gradient(145deg,#FFFFFF_0%,#F0FBF5_100%)] ring-1 ring-emerald-100', accent: 'bg-emerald-500' },
    amber: { icon: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100', selected: 'border-emerald-300 bg-[linear-gradient(145deg,#FFFFFF_0%,#F0FBF5_100%)] ring-1 ring-emerald-100', accent: 'bg-amber-400' },
    red: { icon: 'bg-red-50 text-red-700 ring-1 ring-red-100', selected: 'border-emerald-300 bg-[linear-gradient(145deg,#FFFFFF_0%,#F0FBF5_100%)] ring-1 ring-emerald-100', accent: 'bg-red-500' },
    blue: { icon: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100', selected: 'border-emerald-300 bg-[linear-gradient(145deg,#FFFFFF_0%,#F0FBF5_100%)] ring-1 ring-emerald-100', accent: 'bg-blue-500' },
  };

  const renderInsight = () => {
    if (selectedInsight === 'sales') {
      return (
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#15803d]">Sales Insight</p>
              <h3 className="mt-1 font-display text-xl font-extrabold tracking-tight text-[#17372D]">Paid revenue — last seven days</h3>
              <p className="mt-1 text-[10px] text-[#71817A]">Daily paid revenue from the existing sales records. No forecast or estimated trend is added.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-[#DDE7E1] bg-[#F7FAF8] px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#52635B]">Last 7 days</span>
              <button type="button" onClick={() => onNavigate('sales')} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[9px] font-extrabold text-[#0D7740] transition hover:bg-emerald-100">
                Sales History <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.72fr)]">
            <div className="relative overflow-hidden rounded-[22px] border border-[#E0E9E3] bg-[linear-gradient(180deg,#FBFDFC_0%,#F4F9F6_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <div className="pointer-events-none absolute inset-x-4 bottom-10 top-7 flex flex-col justify-between">
                {[0, 1, 2, 3].map((line) => <span key={line} className="block border-t border-dashed border-[#DDE8E1]" />)}
              </div>
              {salesDays.every((day) => day.revenue === 0) ? (
                <div className="relative z-10 flex h-48 items-center justify-center text-xs text-[#71817A]">No paid sales recorded during the last seven days.</div>
              ) : (
                <div className="relative z-10 flex h-52 items-end gap-3 pt-5">
                  {salesDays.map((day) => (
                    <div key={day.label} className="group flex h-full min-w-0 flex-1 flex-col justify-end gap-2 text-center">
                      <span className="truncate text-[9px] font-bold tabular-nums text-[#587067]">{day.revenue > 0 ? `₱${day.revenue.toLocaleString('en-PH', { maximumFractionDigits: 0 })}` : '₱0'}</span>
                      <div className="relative mx-auto flex w-full max-w-11 flex-1 items-end">
                        <div className="w-full rounded-t-xl bg-[linear-gradient(180deg,#4AD381_0%,#15944F_48%,#0F743C_100%)] shadow-[0_12px_26px_-18px_rgba(15,116,60,0.85)] transition group-hover:brightness-105" style={{ height: `${Math.max((day.revenue / maxRevenue) * 100, day.revenue ? 8 : 2)}%` }} title={`${day.label}: ${peso(day.revenue)}`} />
                      </div>
                      <span className="text-[9px] font-extrabold text-[#71817A]">{day.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-[22px] border border-[#DCE8E0] bg-white shadow-[0_14px_30px_-26px_rgba(11,59,35,0.55)]">
              <div className="bg-[linear-gradient(135deg,#EAF8EF_0%,#F6FBF8_100%)] px-4 py-4">
                <p className="text-[8px] font-extrabold uppercase tracking-[0.16em] text-[#52806B]">Today — Net Merchandise</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#12372A]">{d ? peso(d.salesToday) : '—'}</p>
                <p className="mt-1 text-[9px] text-[#71817A]">Paid merchandise sales after applicable discounts and returns.</p>
              </div>
              <div className="divide-y divide-[#EDF2EE]">
                {[
                  ['Service / Delivery Fees', d ? peso(d.feeRevenueToday) : '—'],
                  ['COGS', d ? peso(d.cogsToday) : '—'],
                  ['Gross Profit', d ? peso(d.estimatedGrossProfit) : '—'],
                  ['Gross Margin', d ? `${Number(d.grossProfitMarginToday || 0).toFixed(2)}%` : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 px-4 py-3">
                    <p className="text-[9px] font-bold text-[#61766D]">{label}</p>
                    <p className="text-[11px] font-extrabold tabular-nums text-[#17372D]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (selectedInsight === 'orders') {
      return (
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
          <div className="flex justify-center">
            <div className="relative h-40 w-40 rounded-full" style={{ background: orderGradient }} role="img" aria-label={`${orders.length} total customer orders`}>
              <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
                <strong className="text-2xl font-extrabold tabular-nums text-[#17372D]">{orders.length}</strong>
                <span className="text-[9px] font-bold uppercase tracking-wide text-[#71817A]">Total Orders</span>
              </div>
            </div>
          </div>
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#15803d]">Order Insight</p>
                <h3 className="mt-1 font-display text-lg font-extrabold text-[#17372D]">Current order-status distribution</h3>
              </div>
              <button type="button" onClick={() => onNavigate('orders')} className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-[#0D7740] hover:underline">Manage Orders <ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {[
                ['Pending / Awaiting Payment', pendingOrders, 'bg-amber-400'],
                ['Active / In Progress', activeFulfillment, 'bg-blue-500'],
                ['Completed', completedOrders, 'bg-emerald-500'],
                ['Cancelled / Rejected', cancelledOrders, 'bg-red-500'],
              ].map(([label, value, dot]) => (
                <div key={String(label)} className="flex items-center justify-between rounded-xl border border-[#E5ECE8] bg-[#FAFCFB] px-3 py-3">
                  <span className="flex items-center gap-2 text-[10px] font-semibold text-[#52635B]"><span className={`h-2.5 w-2.5 rounded-full ${dot}`} />{label}</span>
                  <strong className="text-sm tabular-nums text-[#17372D]">{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (selectedInsight === 'inventory') {
      return (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#15803d]">Inventory Insight</p>
                <h3 className="mt-1 font-display text-lg font-extrabold text-[#17372D]">Products requiring replenishment attention</h3>
              </div>
              <button type="button" onClick={() => onNavigate('reorderSuggestions')} className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-[#0D7740] hover:underline">Reorder Suggestions <ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
            {lowStockProducts.length === 0 ? (
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-5 w-5" />No products are currently below their reorder level.</div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-2xl border border-[#E5ECE8]">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between gap-4 border-b border-[#EDF2EE] bg-white px-4 py-3 last:border-b-0">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold text-[#17372D]">{product.name}</p>
                      <p className="mt-0.5 text-[9px] text-[#8A9992]">{product.category}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-extrabold tabular-nums text-red-700">{product.stock} in stock</p>
                      <p className="text-[8px] text-[#8A9992]">Reorder level {product.reorder_level}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Need Reorder', management?.replenishment.needsReorder ?? lowStockProducts.length],
              ['Covered by Open PO', management?.replenishment.coveredByOpenPo ?? 0],
              ['Setup Required', management?.replenishment.setupRequired ?? 0],
              ['Suggested Units', management?.replenishment.suggestedUnits ?? 0],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-[#E5ECE8] bg-[#FAFCFB] p-4">
                <p className="text-[8px] font-extrabold uppercase tracking-[0.1em] text-[#7A8E85]">{label}</p>
                <p className="mt-2 text-xl font-extrabold tabular-nums text-[#17372D]">{count(Number(value))}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#15803d]">Fulfillment Insight</p>
              <h3 className="mt-1 font-display text-lg font-extrabold text-[#17372D]">Active customer-order fulfillment</h3>
            </div>
            <button type="button" onClick={() => onNavigate('orders')} className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-[#0D7740] hover:underline">Open Order Queue <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Store Pickup', value: fulfillmentBreakdown.pickup, icon: ShoppingCart },
              { label: 'Shop & Go', value: fulfillmentBreakdown.shopGo, icon: PackageCheck },
              { label: 'Local Delivery', value: fulfillmentBreakdown.delivery, icon: Truck },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-[#E5ECE8] bg-[#FAFCFB] p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="h-4 w-4" /></span>
                <p className="mt-3 text-xl font-extrabold tabular-nums text-[#17372D]">{count(value)}</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-[#71817A]">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className={`rounded-2xl border p-5 ${fulfillmentBreakdown.deliveryExceptions > 0 ? 'border-amber-200 bg-amber-50/70' : 'border-emerald-100 bg-emerald-50/50'}`}>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#52635B]">Delivery Attention</p>
          <p className={`mt-2 text-3xl font-extrabold tabular-nums ${fulfillmentBreakdown.deliveryExceptions > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>{fulfillmentBreakdown.deliveryExceptions}</p>
          <p className="mt-2 text-[10px] leading-5 text-[#61766D]">Failed or temporarily deactivated delivery orders requiring Admin review.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-up">
      <section
        className="relative min-h-[146px] overflow-hidden rounded-[28px] border border-[#CFE3D7] bg-[#EAF5EE] bg-cover bg-center shadow-[0_24px_60px_-42px_rgba(11,59,35,0.62)]"
        style={{
          backgroundImage: "linear-gradient(90deg, rgba(239,249,243,0.99) 0%, rgba(239,249,243,0.96) 36%, rgba(239,249,243,0.65) 54%, rgba(239,249,243,0.10) 78%, rgba(239,249,243,0.02) 100%), url('/images/rayjin-legendary-trucks-banner.png')",
        }}
      >
        <div className="relative z-10 flex min-h-[146px] max-w-2xl flex-col justify-center px-5 py-5 sm:px-8">
          <div className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#15803d]"><Sparkles className="h-3.5 w-3.5" /> Rayjin Hardware Operations</div>
          <h1 className="mt-2 font-display text-[26px] font-extrabold tracking-[-0.025em] text-[#12372A] sm:text-[32px]">{greeting}, {userName}</h1>
          <p className="mt-1 text-sm font-semibold text-[#36584B]">Monitor sales, orders, inventory, fulfillment, and business controls from one focused workspace.</p>
          <p className="mt-4 flex w-fit items-center gap-2 rounded-full border border-emerald-200/70 bg-white/70 px-3 py-1.5 text-[9px] font-bold text-[#557168] shadow-sm backdrop-blur-sm"><Clock3 className="h-3.5 w-3.5 text-[#15803d]" />{displayDate}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Interactive business overview">
        {kpis.map(({ key, label, value, note, icon: Icon, tone }) => {
          const selected = selectedInsight === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedInsight(key)}
              aria-pressed={selected}
              className={`group relative min-h-[128px] overflow-hidden rounded-[22px] border p-4 text-left shadow-[0_16px_34px_-28px_rgba(11,59,35,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_-28px_rgba(11,59,35,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${selected ? toneClasses[tone].selected : 'border-[#DDE6E0] bg-white'}`}
            >
              <span className={`absolute inset-x-0 top-0 h-1 ${selected ? 'bg-[#15803d] opacity-100' : `${toneClasses[tone].accent} opacity-45`}`} />
              <div className="flex items-start justify-between gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses[tone].icon}`}><Icon className="h-5 w-5" /></span>
                <span className={`rounded-full px-2 py-1 text-[8px] font-extrabold uppercase tracking-[0.12em] ${selected ? 'bg-[#17372D] text-white' : 'bg-[#F4F7F5] text-[#71817A]'}`}>{selected ? 'Active view' : label}</span>
              </div>
              <p className="mt-3 text-xl font-extrabold tabular-nums text-[#17372D] sm:text-2xl">{value}</p>
              <p className="mt-1 text-[10px] font-semibold text-[#71817A]">{note}</p>
            </button>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-[26px] border border-[#D7E4DC] bg-white shadow-[0_22px_56px_-42px_rgba(11,59,35,0.62)]">
        <div className="p-5 md:p-6">{renderInsight()}</div>
      </section>

      <section className="overflow-hidden rounded-[26px] border border-[#D7E4DC] bg-white shadow-[0_18px_42px_-38px_rgba(11,59,35,0.52)]" aria-labelledby="daily-operations-summary">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8EEEA] bg-[linear-gradient(120deg,#F7FBF8_0%,#EAF7EF_100%)] px-5 py-4">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#15803d]">Daily Operations</p>
            <h2 id="daily-operations-summary" className="mt-1 font-display text-base font-extrabold text-[#17372D]">{analytics?.period.businessDate || displayDate}</h2>
            <p className="mt-1 text-[9px] text-[#71817A]">Merchandise margin excludes service and delivery fees, preserving the established financial rules.</p>
          </div>
          <button type="button" onClick={() => void loadAnalytics()} disabled={analyticsLoading} className="inline-flex items-center gap-2 rounded-xl border border-[#D6E4DB] bg-white px-3 py-2 text-[9px] font-extrabold text-[#0D7740] hover:bg-emerald-50 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${analyticsLoading ? 'animate-spin' : ''}`} />Refresh</button>
        </div>

        {analyticsError && !analytics ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50/60 px-5 py-3 text-[10px] text-amber-800"><span>{analyticsError} Existing Admin functions remain available.</span><button type="button" onClick={() => void loadAnalytics()} className="font-extrabold underline">Try again</button></div>
        ) : null}

        <div className="grid gap-px bg-[#E5ECE8] sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Net Merchandise Sales', value: d ? peso(d.salesToday) : '—', icon: CircleDollarSign },
            { label: 'COGS', value: d ? peso(d.cogsToday) : '—', icon: ReceiptText },
            { label: 'Gross Profit', value: d ? peso(d.estimatedGrossProfit) : '—', icon: TrendingUp },
            { label: 'Gross Margin', value: d ? `${Number(d.grossProfitMarginToday || 0).toFixed(2)}%` : '—', icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }, index) => (
            <div key={label} className={`${index === 0 ? 'bg-[linear-gradient(145deg,#F0FAF4_0%,#FFFFFF_100%)]' : 'bg-white'} p-4`}>
              <div className="flex items-center justify-between gap-3"><p className="text-[8px] font-extrabold uppercase tracking-[0.12em] text-[#71817A]">{label}</p><Icon className="h-4 w-4 text-[#15803d]" /></div>
              <p className="mt-2 text-lg font-extrabold tabular-nums text-[#17372D]">{value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-px bg-[#E5ECE8] sm:grid-cols-4">
          {[
            { label: 'Transactions', value: d?.transactionsToday ?? 0, icon: ReceiptText },
            { label: 'Items Sold', value: d?.itemsSoldToday ?? 0, icon: ShoppingCart },
            { label: 'Stock Received', value: d?.stockReceivedToday ?? 0, icon: ArrowDownToLine },
            { label: 'Stock Out', value: d?.stockOutToday ?? 0, icon: ArrowUpFromLine },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 bg-[#FAFCFB] px-4 py-3">
              <Icon className="h-4 w-4 shrink-0 text-[#15803d]" />
              <div><p className="text-sm font-extrabold tabular-nums text-[#17372D]">{count(value)}</p><p className="text-[8px] font-bold uppercase tracking-wide text-[#7A8E85]">{label}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[26px] border border-[#D7E4DC] bg-[linear-gradient(145deg,#FFFFFF_0%,#F8FBF9_100%)] p-4 shadow-[0_18px_42px_-38px_rgba(11,59,35,0.5)]" aria-labelledby="business-controls-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-3">
          <div><p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#15803d]">Business Controls</p><h2 id="business-controls-heading" className="mt-1 font-display text-sm font-extrabold text-[#17372D]">Operational attention</h2></div>
          <span className="text-[9px] font-semibold text-[#8A9992]">Read-only summary · open the source module for action</span>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Estimated Net Profit', value: management ? peso(management.profitability.month.estimatedNetProfit) : '—', note: 'This month', icon: CircleDollarSign, tab: 'expenses', alert: false },
            { label: 'Open Purchase Orders', value: management ? count(management.purchasing.openPurchaseOrders) : '—', note: management ? `${count(management.purchasing.outstandingUnits)} unit(s) outstanding` : 'Purchasing status', icon: ClipboardList, tab: 'purchaseOrders', alert: Boolean(management?.purchasing.openPurchaseOrders) },
            { label: 'Reorder Attention', value: management ? count(management.replenishment.needsReorder) : '—', note: management ? `${count(management.replenishment.coveredByOpenPo)} covered by PO` : 'Replenishment status', icon: AlertTriangle, tab: 'reorderSuggestions', alert: Boolean(management?.replenishment.needsReorder) },
            { label: 'Returns / Voids Today', value: management ? count(management.saleAdjustmentsToday.adjustmentCount) : '—', note: management ? `${peso(management.saleAdjustmentsToday.refundAmount)} refunds` : 'Adjustment status', icon: RotateCcw, tab: 'saleAdjustments', alert: Boolean(management?.saleAdjustmentsToday.adjustmentCount) },
            { label: 'Cashier Shift', value: management?.cashier.currentShift ? `Open #${management.cashier.currentShift.shiftId}` : 'No Open Shift', note: management?.cashier.currentShift ? `${peso(management.cashier.currentShift.expectedCash)} expected cash` : 'Open before POS transactions', icon: Clock3, tab: 'cashierShift', alert: !management?.cashier.hasOpenShift },
          ].map(({ label, value, note, icon: Icon, tab, alert }) => (
            <button key={label} type="button" onClick={() => onNavigate(tab)} className={`rounded-2xl border p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${alert ? 'border-amber-200/70 bg-amber-50/55' : 'border-[#E2EAE5] bg-white/85'}`}>
              <div className="flex items-center justify-between gap-2"><span className={`flex h-8 w-8 items-center justify-center rounded-xl ${alert ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}><Icon className="h-4 w-4" /></span><ArrowRight className="h-3.5 w-3.5 text-[#A0ADA6]" /></div>
              <p className="mt-3 text-[14px] font-extrabold leading-tight tabular-nums text-[#17372D]">{value}</p>
              <p className="mt-1 text-[8px] font-extrabold uppercase tracking-[0.09em] text-[#52635B]">{label}</p>
              <p className="mt-1 text-[8px] leading-4 text-[#8A9992]">{note}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
        <article className="overflow-hidden rounded-[26px] border border-[#D7E4DC] bg-white shadow-[0_16px_38px_-34px_rgba(11,59,35,0.5)]">
          <div className="flex items-start justify-between gap-4 border-b border-[#E8EEEA] p-5">
            <div><h3 className="font-display text-sm font-extrabold text-[#17372D]">Recent Orders</h3><p className="mt-1 text-[9px] text-[#71817A]">Latest customer orders and current status</p></div>
            <button type="button" onClick={() => onNavigate('orders')} className="inline-flex items-center gap-1 text-[9px] font-extrabold text-[#0D7740] hover:underline">View all <ArrowRight className="h-3 w-3" /></button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#71817A]">No customer orders have been recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-[10px]">
                <thead className="bg-[#F7FAF8] text-[8px] uppercase tracking-[0.1em] text-[#71817A]"><tr><th className="px-5 py-3">Order / Customer</th><th className="px-3 py-3">Items</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Fulfillment</th><th className="px-5 py-3 text-right">Total</th></tr></thead>
                <tbody className="divide-y divide-[#EDF2EE]">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#FAFCFB]">
                      <td className="px-5 py-3"><p className="font-extrabold text-[#17372D]">{order.id}</p><p className="mt-0.5 text-[8px] text-[#8A9992]">{[order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ') || 'Customer'}</p></td>
                      <td className="px-3 py-3 font-bold tabular-nums text-[#52635B]">{order.items.reduce((total, item) => total + Number(item.quantity || 0), 0)}</td>
                      <td className="px-3 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[8px] font-extrabold capitalize ${orderStatusBadge(order.status)}`}>{order.status.split('_').join(' ')}</span></td>
                      <td className="px-3 py-3 text-[9px] font-semibold capitalize text-[#52635B]">{order.fulfillment === 'shop_go' ? 'Shop & Go' : order.fulfillment}</td>
                      <td className="px-5 py-3 text-right font-extrabold tabular-nums text-[#17372D]">{peso(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="overflow-hidden rounded-[26px] border border-[#D7E4DC] bg-white shadow-[0_16px_38px_-34px_rgba(11,59,35,0.5)]">
          <div className="flex items-start justify-between gap-4 border-b border-[#E8EEEA] p-5">
            <div><h3 className="font-display text-sm font-extrabold text-[#17372D]">Inventory Attention</h3><p className="mt-1 text-[9px] text-[#71817A]">Low stock and replenishment priorities</p></div>
            <button type="button" onClick={onOpenLowStockReport} className="inline-flex items-center gap-1 text-[9px] font-extrabold text-[#0D7740] hover:underline">Report <ArrowRight className="h-3 w-3" /></button>
          </div>
          {lowStockProducts.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-8 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />All products are above their reorder levels.</div>
          ) : (
            <div className="divide-y divide-[#EDF2EE]">
              {lowStockProducts.slice(0, 5).map((product) => (
                <button key={product.id} type="button" onClick={() => onNavigate('reorderSuggestions')} className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left transition hover:bg-[#FAFCFB]">
                  <div className="min-w-0"><p className="truncate text-xs font-extrabold text-[#17372D]">{product.name}</p><p className="mt-0.5 text-[8px] text-[#8A9992]">{product.category}</p></div>
                  <div className="shrink-0 text-right"><span className="inline-flex rounded-full bg-red-50 px-2 py-1 text-[8px] font-extrabold text-red-700">{product.stock} left</span><p className="mt-1 text-[8px] text-[#8A9992]">Reorder {product.reorder_level}</p></div>
                </button>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
