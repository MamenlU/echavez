import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  CircleDollarSign,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  ShoppingBasket,
  TrendingUp,
  Trophy,
} from 'lucide-react';

interface DailyOperations {
  salesToday: number;
  grossMerchandiseSalesToday: number;
  discountsToday: number;
  totalRevenueToday: number;
  serviceRevenueToday: number;
  deliveryRevenueToday: number;
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

interface InventoryActivityRow {
  productId: number;
  productName: string;
  barcode: string | null;
  category: string | null;
  beginningStock: number;
  stockIn: number;
  stockOut: number;
  currentStock: number;
  reorderLevel: number;
  lowStock: boolean;
  status: string;
}

interface TopSellingProduct {
  rank: number;
  id: number;
  name: string;
  image?: string | null;
  category?: string | null;
  brand?: string | null;
  price: number;
  stock: number;
  quantitySold: number;
  salesAmount: number;
}

interface ManagementOverview {
  profitability: {
    today: {
      grossProfit: number;
      serviceDeliveryRevenue: number;
      operatingExpenses: number;
      estimatedNetProfit: number;
      expenseCount: number;
    };
    month: {
      from: string;
      to: string;
      grossProfit: number;
      serviceDeliveryRevenue: number;
      operatingExpenses: number;
      estimatedNetProfit: number;
      expenseCount: number;
    };
  };
  purchasing: {
    openPurchaseOrders: number;
    partiallyReceivedOrders: number;
    outstandingUnits: number;
    outstandingExpectedCost: number;
  };
  replenishment: {
    needsReorder: number;
    coveredByOpenPo: number;
    setupRequired: number;
    healthy: number;
    suggestedUnits: number;
  };
  saleAdjustmentsToday: {
    adjustmentCount: number;
    returnCount: number;
    voidCount: number;
    refundAmount: number;
    merchandiseRefundAmount: number;
  };
  cashier: {
    hasOpenShift: boolean;
    currentShift: null | {
      shiftId: number;
      openedAt: string;
      openingCash: number;
      cashSales: number;
      cardSales: number;
      cashRefunds: number;
      cashExpenses: number;
      expectedCash: number;
      transactionCount: number;
    };
    lastClosedShift: null | {
      shiftId: number;
      closedAt: string;
      expectedCash: number;
      actualCash: number;
      discrepancy: number;
    };
  };
}

interface AnalyticsPayload {
  generatedAt: string;
  timezone: string;
  period: {
    businessDate: string;
    weekStartsMonday: boolean;
  };
  dailyOperations: DailyOperations;
  inventoryActivity: {
    today: InventoryActivityRow[];
    week: InventoryActivityRow[];
    note: string;
  };
  topSelling: {
    today: TopSellingProduct[];
    week: TopSellingProduct[];
  };
  managementOverview?: ManagementOverview;
}

type Period = 'today' | 'week';

const peso = (value: number) =>
  `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const count = (value: number) => Number(value || 0).toLocaleString('en-PH');

const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export function AdminOperationsAnalytics({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inventoryPeriod, setInventoryPeriod] = useState<Period>('today');
  const [salesPeriod, setSalesPeriod] = useState<Period>('today');

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/analytics/admin', { headers: authHeaders() });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Dashboard analytics are temporarily unavailable.');
      }
      setAnalytics((await response.json()) as AnalyticsPayload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Dashboard analytics are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, []);

  const inventoryRows = useMemo(
    () => analytics?.inventoryActivity?.[inventoryPeriod] || [],
    [analytics, inventoryPeriod]
  );

  const topProducts = useMemo(
    () => analytics?.topSelling?.[salesPeriod] || [],
    [analytics, salesPeriod]
  );

  if (loading && !analytics) {
    return (
      <section className="rounded-3xl border border-[#DDE6E0] bg-white p-6 shadow-sm" aria-label="Loading daily operations analytics">
        <div className="flex items-center gap-3 text-[#52635B]">
          <RefreshCw className="h-4 w-4 animate-spin text-[#15803d]" />
          <span className="text-xs font-bold">Loading Daily Operations…</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-[#F1F5F2]" />
          ))}
        </div>
      </section>
    );
  }

  if (!analytics) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <h3 className="text-sm font-extrabold text-amber-900">Operations analytics unavailable</h3>
              <p className="mt-1 text-[11px] leading-5 text-amber-800">{error || 'The existing Admin Dashboard remains available while this read-only section is unavailable.'}</p>
            </div>
          </div>
          <button type="button" onClick={() => void loadAnalytics()} className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-[10px] font-extrabold text-amber-800 hover:bg-amber-100">
            Try Again
          </button>
        </div>
      </section>
    );
  }

  const d = analytics.dailyOperations;
  const metrics = [
    {
      label: 'Net Merchandise Sales',
      value: peso(d.salesToday),
      icon: CircleDollarSign,
      note: d.discountsToday > 0
        ? `${peso(d.discountsToday)} discount · ${peso(d.feeRevenueToday)} fees separate`
        : `${peso(d.feeRevenueToday)} service/delivery revenue separate`,
    },
    { label: 'Transactions', value: count(d.transactionsToday), icon: ReceiptText, note: 'Valid paid sales today' },
    { label: 'Items Sold', value: count(d.itemsSoldToday), icon: ShoppingBasket, note: 'Units in valid sales' },
    { label: 'Stock Received', value: count(d.stockReceivedToday), icon: ArrowDownToLine, note: 'Recorded Stock-In' },
    { label: 'Stock Out', value: count(d.stockOutToday), icon: ArrowUpFromLine, note: 'Recorded Stock-Out' },
    { label: 'Low Stock', value: count(d.lowStockProducts), icon: AlertTriangle, note: 'Below reorder level' },
    { label: 'Inventory Cost Value', value: peso(d.inventoryValue), icon: Boxes, note: 'Movement-ledger acquisition cost' },
    {
      label: 'Gross Profit',
      value: peso(d.estimatedGrossProfit),
      icon: TrendingUp,
      note: `${Number(d.grossProfitMarginToday || 0).toFixed(2)}% margin · merchandise only`,
    },
  ];

  return (
    <section className="space-y-4" aria-labelledby="daily-operations-heading">
      <div className="overflow-hidden rounded-3xl border border-[#DDE6E0] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#E5ECE8] bg-[linear-gradient(120deg,#f8fbf9_0%,#eff8f2_100%)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#15803d]">Philippine business day</p>
            <h2 id="daily-operations-heading" className="mt-1 font-display text-lg font-extrabold text-[#17372D]">
              Daily Operations — {analytics.period.businessDate}
            </h2>
            <p className="mt-1 text-[10px] text-[#71817A]">Net merchandise sales, COGS, and gross profit now exclude delivery/service fees from merchandise margin calculations.</p>
          </div>
          <button type="button" onClick={() => void loadAnalytics()} disabled={loading} className="inline-flex items-center gap-2 self-start rounded-xl border border-[#CFE0D5] bg-white px-3 py-2 text-[10px] font-extrabold text-[#0D7740] shadow-sm transition hover:bg-emerald-50 disabled:opacity-50 sm:self-auto">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-px bg-[#E5ECE8] sm:grid-cols-4 xl:grid-cols-8">
          {metrics.map(({ label, value, icon: Icon, note }) => (
            <article key={label} className="min-h-[112px] bg-white p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#15803d]">
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-3 break-words text-[14px] font-extrabold leading-tight text-[#17372D]">{value}</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#52635B]">{label}</p>
              <p className="mt-1 text-[8px] leading-3.5 text-[#8A9992]">{note}</p>
            </article>
          ))}
        </div>
      </div>

      {analytics.managementOverview && (() => {
        const management = analytics.managementOverview;
        const currentShift = management.cashier.currentShift;
        const lastClosed = management.cashier.lastClosedShift;
        const managementCards = [
          {
            label: 'Estimated Net Profit — This Month',
            value: peso(management.profitability.month.estimatedNetProfit),
            note: `${peso(management.profitability.month.operatingExpenses)} operating expenses`,
            icon: TrendingUp,
            tab: 'expenses',
          },
          {
            label: 'Open Purchase Orders',
            value: count(management.purchasing.openPurchaseOrders),
            note: `${count(management.purchasing.outstandingUnits)} units still outstanding`,
            icon: ReceiptText,
            tab: 'purchaseOrders',
          },
          {
            label: 'Reorder Attention',
            value: count(management.replenishment.needsReorder),
            note: `${count(management.replenishment.coveredByOpenPo)} covered by PO · ${count(management.replenishment.setupRequired)} setup required`,
            icon: AlertTriangle,
            tab: 'reorderSuggestions',
          },
          {
            label: 'Returns / Voids Today',
            value: count(management.saleAdjustmentsToday.adjustmentCount),
            note: `${peso(management.saleAdjustmentsToday.refundAmount)} recorded refunds`,
            icon: RefreshCw,
            tab: 'saleAdjustments',
          },
          {
            label: 'Cashier Shift',
            value: currentShift ? `Open #${currentShift.shiftId}` : 'No open shift',
            note: currentShift
              ? `${peso(currentShift.expectedCash)} expected cash · ${count(currentShift.transactionCount)} POS transaction${currentShift.transactionCount === 1 ? '' : 's'}`
              : lastClosed
                ? `Last closed #${lastClosed.shiftId} · ${lastClosed.discrepancy === 0 ? 'balanced' : `${peso(Math.abs(lastClosed.discrepancy))} ${lastClosed.discrepancy > 0 ? 'overage' : 'shortage'}`}`
                : 'No Cashier Shift history yet',
            icon: CircleDollarSign,
            tab: 'cashierShift',
          },
        ];

        return (
          <article className="overflow-hidden rounded-3xl border border-[#DDE6E0] bg-white shadow-sm">
            <div className="border-b border-[#E5ECE8] px-5 py-4">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#15803d]">Integrated business controls</p>
              <h3 className="mt-1 font-display text-sm font-extrabold text-[#17372D]">Management Control Center</h3>
              <p className="mt-1 text-[10px] text-[#71817A]">Read-only summary of profitability, purchasing, replenishment, returns, and the current POS cash-control state.</p>
            </div>
            <div className="grid gap-px bg-[#E5ECE8] sm:grid-cols-2 xl:grid-cols-5">
              {managementCards.map(({ label, value, note, icon: Icon, tab }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onNavigate?.(tab)}
                  className="min-h-[126px] bg-white p-4 text-left transition hover:bg-[#F8FBF9] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
                  title={`Open ${label}`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#15803d]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-3 break-words text-[15px] font-extrabold leading-tight text-[#17372D]">{value}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#52635B]">{label}</p>
                  <p className="mt-1 text-[8px] leading-3.5 text-[#8A9992]">{note}</p>
                </button>
              ))}
            </div>
          </article>
        );
      })()}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.8fr)]">
        <article className="overflow-hidden rounded-3xl border border-[#DDE6E0] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#E5ECE8] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-[#15803d]" />
                <h3 className="font-display text-sm font-extrabold text-[#17372D]">Inventory Activity</h3>
              </div>
              <p className="mt-1 text-[10px] text-[#71817A]">Beginning stock, movement, and current stock from the centralized ledger.</p>
            </div>
            <div className="inline-flex w-fit rounded-xl bg-[#F1F6F3] p-1" role="group" aria-label="Inventory period">
              {(['today', 'week'] as Period[]).map((period) => (
                <button key={period} type="button" onClick={() => setInventoryPeriod(period)} className={`rounded-lg px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wide transition ${inventoryPeriod === period ? 'bg-white text-[#0D7740] shadow-sm' : 'text-[#71817A] hover:text-[#17372D]'}`}>
                  {period === 'today' ? 'Today' : 'This Week'}
                </button>
              ))}
            </div>
          </div>

          {inventoryRows.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#71817A]">No products are available for this inventory view.</div>
          ) : (
            <div className="max-h-[360px] overflow-auto">
              <table className="w-full min-w-[720px] text-left text-[10px]">
                <thead className="sticky top-0 z-10 bg-[#F7FAF8] text-[8px] uppercase tracking-[0.08em] text-[#71817A]">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-3 py-3 text-right">Beginning</th>
                    <th className="px-3 py-3 text-right">Received</th>
                    <th className="px-3 py-3 text-right">Stock Out</th>
                    <th className="px-3 py-3 text-right">Current</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF2EE]">
                  {inventoryRows.map((row) => (
                    <tr key={row.productId} className="hover:bg-[#FAFCFB]">
                      <td className="px-4 py-3">
                        <p className="font-bold text-[#17372D]">{row.productName}</p>
                        <p className="mt-0.5 text-[8px] text-[#8A9992]">{row.category || 'Uncategorized'}{row.barcode ? ` · ${row.barcode}` : ''}</p>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-[#52635B]">{count(row.beginningStock)}</td>
                      <td className="px-3 py-3 text-right font-bold text-emerald-700">+{count(row.stockIn)}</td>
                      <td className="px-3 py-3 text-right font-bold text-[#9A5A24]">-{count(row.stockOut)}</td>
                      <td className="px-3 py-3 text-right font-extrabold text-[#17372D]">{count(row.currentStock)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[8px] font-extrabold ${row.lowStock ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {row.lowStock ? 'Low Stock' : 'Healthy'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="border-t border-[#EDF2EE] px-5 py-3 text-[8px] leading-4 text-[#8A9992]">{analytics.inventoryActivity.note}</p>
        </article>

        <article className="overflow-hidden rounded-3xl border border-[#DDE6E0] bg-white shadow-sm">
          <div className="border-b border-[#E5ECE8] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-[#15803d]" />
                  <h3 className="font-display text-sm font-extrabold text-[#17372D]">Product Performance</h3>
                </div>
                <p className="mt-1 text-[10px] text-[#71817A]">Top 5 by quantity sold from valid recorded sales.</p>
              </div>
              <div className="inline-flex rounded-xl bg-[#F1F6F3] p-1" role="group" aria-label="Top-selling period">
                {(['today', 'week'] as Period[]).map((period) => (
                  <button key={period} type="button" onClick={() => setSalesPeriod(period)} className={`rounded-lg px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wide transition ${salesPeriod === period ? 'bg-white text-[#0D7740] shadow-sm' : 'text-[#71817A] hover:text-[#17372D]'}`}>
                    {period === 'today' ? 'Today' : 'This Week'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {topProducts.length === 0 ? (
            <div className="p-8 text-center">
              <Trophy className="mx-auto h-7 w-7 text-[#B6C3BC]" />
              <p className="mt-3 text-xs font-bold text-[#52635B]">No recorded paid sales in this period.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#EDF2EE]">
              {topProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${product.rank === 1 ? 'bg-amber-50 text-amber-700' : 'bg-[#F1F6F3] text-[#52635B]'}`}>
                    {product.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold text-[#17372D]">{product.name}</p>
                    <p className="mt-0.5 truncate text-[8px] text-[#8A9992]">{product.category || product.brand || 'Hardware product'}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-extrabold text-[#0D7740]">{count(product.quantitySold)} sold</p>
                    <p className="mt-0.5 text-[8px] font-semibold text-[#71817A]">Net sales {peso(product.salesAmount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
