import { getEstimatedNetProfitSummary } from './expenseService.js';
import { getOpenShiftForAdmin, getShiftMetrics } from './cashierShiftService.js';
import { getReorderSuggestions } from './reorderService.js';

const money = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
};

const count = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

async function getPurchasingSummary(database) {
  const [[row]] = await database.query(
    `SELECT
       COUNT(DISTINCT CASE WHEN po.status IN ('Ordered', 'Partially Received') THEN po.purchase_order_id END) AS open_purchase_orders,
       COUNT(DISTINCT CASE WHEN po.status = 'Partially Received' THEN po.purchase_order_id END) AS partially_received_orders,
       COALESCE(SUM(
         CASE WHEN po.status IN ('Ordered', 'Partially Received')
           THEN GREATEST(poi.ordered_quantity - COALESCE(receipts.received_quantity, 0), 0)
           ELSE 0 END
       ), 0) AS outstanding_units,
       COALESCE(SUM(
         CASE WHEN po.status IN ('Ordered', 'Partially Received')
           THEN GREATEST(poi.ordered_quantity - COALESCE(receipts.received_quantity, 0), 0) * poi.expected_unit_cost
           ELSE 0 END
       ), 0) AS outstanding_expected_cost
     FROM purchase_orders po
     LEFT JOIN purchase_order_items poi
       ON poi.purchase_order_id = po.purchase_order_id
     LEFT JOIN (
       SELECT purchase_order_item_id, SUM(quantity) AS received_quantity
       FROM inventory_movements
       WHERE purchase_order_item_id IS NOT NULL
         AND movement_type = 'Stock-In'
       GROUP BY purchase_order_item_id
     ) receipts
       ON receipts.purchase_order_item_id = poi.purchase_order_item_id`
  );

  return {
    openPurchaseOrders: count(row?.open_purchase_orders),
    partiallyReceivedOrders: count(row?.partially_received_orders),
    outstandingUnits: count(row?.outstanding_units),
    outstandingExpectedCost: money(row?.outstanding_expected_cost),
  };
}

async function getSaleAdjustmentSummary(database, range) {
  const [[row]] = await database.query(
    `SELECT
       COUNT(*) AS adjustment_count,
       COALESCE(SUM(total_refund_amount), 0) AS refund_amount,
       COALESCE(SUM(merchandise_refund_amount), 0) AS merchandise_refund_amount,
       COALESCE(SUM(CASE WHEN adjustment_type = 'Void' THEN 1 ELSE 0 END), 0) AS void_count,
       COALESCE(SUM(CASE WHEN adjustment_type = 'Return' THEN 1 ELSE 0 END), 0) AS return_count
     FROM sale_adjustments
     WHERE processed_at >= ? AND processed_at <= ?`,
    [range.start, range.end]
  );

  return {
    adjustmentCount: count(row?.adjustment_count),
    returnCount: count(row?.return_count),
    voidCount: count(row?.void_count),
    refundAmount: money(row?.refund_amount),
    merchandiseRefundAmount: money(row?.merchandise_refund_amount),
  };
}

async function getCashierControlSummary(database, adminId) {
  if (!Number.isInteger(Number(adminId)) || Number(adminId) <= 0) {
    return {
      hasOpenShift: false,
      currentShift: null,
      lastClosedShift: null,
    };
  }

  const open = await getOpenShiftForAdmin(database, Number(adminId));
  const currentShift = open ? await getShiftMetrics(database, open.shift_id) : null;

  const [rows] = await database.query(
    `SELECT shift_id, closed_at, expected_cash, actual_cash, discrepancy
     FROM cashier_shifts
     WHERE admin_id = ? AND status = 'Closed'
     ORDER BY closed_at DESC, shift_id DESC
     LIMIT 1`,
    [Number(adminId)]
  );

  const last = rows[0] || null;
  return {
    hasOpenShift: Boolean(currentShift),
    currentShift: currentShift
      ? {
          shiftId: Number(currentShift.shift_id),
          openedAt: currentShift.opened_at,
          openingCash: money(currentShift.opening_cash),
          cashSales: money(currentShift.cash_sales_amount),
          cardSales: money(currentShift.card_sales_amount),
          cashRefunds: money(currentShift.cash_refunds_amount),
          cashExpenses: money(currentShift.cash_expenses_amount),
          expectedCash: money(currentShift.expected_cash),
          transactionCount: count(currentShift.pos_transaction_count),
        }
      : null,
    lastClosedShift: last
      ? {
          shiftId: Number(last.shift_id),
          closedAt: last.closed_at,
          expectedCash: money(last.expected_cash),
          actualCash: money(last.actual_cash),
          discrepancy: money(last.discrepancy),
        }
      : null,
  };
}

export async function getManagementOverview(database, { adminId, ranges }) {
  const todayLabel = ranges.labels.today;
  const monthStart = `${todayLabel.slice(0, 7)}-01`;

  const [todayProfitability, monthProfitability, purchasing, reorder, adjustmentsToday, cashier] = await Promise.all([
    getEstimatedNetProfitSummary(database, { from: todayLabel, to: todayLabel }),
    getEstimatedNetProfitSummary(database, { from: monthStart, to: todayLabel }),
    getPurchasingSummary(database),
    getReorderSuggestions(database),
    getSaleAdjustmentSummary(database, ranges.today),
    getCashierControlSummary(database, adminId),
  ]);

  return {
    profitability: {
      today: {
        grossProfit: money(todayProfitability.gross_profit),
        serviceDeliveryRevenue: money(todayProfitability.service_delivery_revenue),
        operatingExpenses: money(todayProfitability.operating_expenses),
        estimatedNetProfit: money(todayProfitability.estimated_net_profit),
        expenseCount: count(todayProfitability.expense_count),
      },
      month: {
        from: monthStart,
        to: todayLabel,
        grossProfit: money(monthProfitability.gross_profit),
        serviceDeliveryRevenue: money(monthProfitability.service_delivery_revenue),
        operatingExpenses: money(monthProfitability.operating_expenses),
        estimatedNetProfit: money(monthProfitability.estimated_net_profit),
        expenseCount: count(monthProfitability.expense_count),
      },
    },
    purchasing,
    replenishment: {
      needsReorder: count(reorder.summary.needs_reorder),
      coveredByOpenPo: count(reorder.summary.covered_by_po),
      setupRequired: count(reorder.summary.setup_required),
      healthy: count(reorder.summary.healthy),
      suggestedUnits: count(reorder.summary.total_suggested_units),
    },
    saleAdjustmentsToday: adjustmentsToday,
    cashier,
  };
}
