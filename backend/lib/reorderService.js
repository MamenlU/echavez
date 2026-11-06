const LOOKBACK_DAYS = 30;
const COVERAGE_DAYS = 30;

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeLeadTime(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) return null;
  return number;
}

export function calculateReorderSuggestion(row, {
  lookbackDays = LOOKBACK_DAYS,
  coverageDays = COVERAGE_DAYS,
} = {}) {
  const currentStock = toFiniteNumber(row.stock, 0);
  const reorderLevel = Math.max(0, toFiniteNumber(row.reorder_level, 0));
  const netUnitsSold = Math.max(0, toFiniteNumber(row.net_units_sold_30d, 0));
  const incomingQuantity = Math.max(0, toFiniteNumber(row.outstanding_po_quantity, 0));
  const leadTimeDays = normalizeLeadTime(row.lead_time_days);
  const supplierId = row.supplier_id === null || row.supplier_id === undefined
    ? null
    : Number(row.supplier_id);
  const supplierStatus = String(row.supplier_status || '');

  const averageDailyDemand = lookbackDays > 0
    ? netUnitsSold / lookbackDays
    : 0;
  const projectedAvailable = currentStock + incomingQuantity;

  let setupIssue = null;
  if (!Number.isInteger(supplierId) || supplierId <= 0) {
    setupIssue = 'Assign an active supplier to this product.';
  } else if (supplierStatus !== 'Active') {
    setupIssue = 'The assigned supplier is inactive.';
  } else if (leadTimeDays === null) {
    setupIssue = 'Set the supplier lead time before using demand-based reorder calculations.';
  }

  const demandDuringLeadTime = leadTimeDays === null
    ? null
    : averageDailyDemand * leadTimeDays;
  const reorderPoint = demandDuringLeadTime === null
    ? reorderLevel
    : Math.ceil(demandDuringLeadTime + reorderLevel);
  const targetStock = leadTimeDays === null
    ? reorderLevel
    : Math.ceil(averageDailyDemand * (leadTimeDays + coverageDays) + reorderLevel);
  const expectedStockAtArrival = demandDuringLeadTime === null
    ? null
    : projectedAvailable - demandDuringLeadTime;

  const currentNeedsAttention = currentStock < reorderPoint || (currentStock <= 0 && targetStock > 0);
  const projectedNeedsReorder = projectedAvailable < reorderPoint || (projectedAvailable <= 0 && targetStock > 0);
  const coveredByIncomingPo = currentNeedsAttention && !projectedNeedsReorder && incomingQuantity > 0;
  const suggestedOrderQuantity = setupIssue || !projectedNeedsReorder
    ? 0
    : Math.max(0, Math.ceil(targetStock - projectedAvailable));

  let status = 'Healthy';
  if (setupIssue) {
    status = 'Setup Required';
  } else if (coveredByIncomingPo) {
    status = 'Covered by PO';
  } else if (currentStock <= 0 && projectedNeedsReorder) {
    status = 'Critical';
  } else if (projectedAvailable < reorderLevel) {
    status = 'High';
  } else if (projectedNeedsReorder) {
    status = 'Reorder Soon';
  }

  const daysOfStock = averageDailyDemand > 0
    ? projectedAvailable / averageDailyDemand
    : null;

  return {
    product_id: Number(row.product_id ?? row.id),
    product_name: row.product_name ?? row.name ?? '',
    barcode: row.barcode ?? null,
    unit: row.unit ?? null,
    category: row.category ?? null,
    supplier_id: supplierId,
    supplier_name: row.supplier_name ?? null,
    supplier_status: supplierStatus || null,
    lead_time_days: leadTimeDays,
    current_stock: currentStock,
    reorder_level: reorderLevel,
    net_units_sold_30d: netUnitsSold,
    average_daily_demand: Number(averageDailyDemand.toFixed(4)),
    outstanding_po_quantity: incomingQuantity,
    projected_available: projectedAvailable,
    demand_during_lead_time: demandDuringLeadTime === null
      ? null
      : Number(demandDuringLeadTime.toFixed(4)),
    reorder_point: reorderPoint,
    target_stock: targetStock,
    suggested_order_quantity: suggestedOrderQuantity,
    expected_stock_at_arrival: expectedStockAtArrival === null
      ? null
      : Number(expectedStockAtArrival.toFixed(4)),
    days_of_stock: daysOfStock === null
      ? null
      : Number(daysOfStock.toFixed(2)),
    status,
    setup_issue: setupIssue,
    calculation_basis: {
      lookback_days: lookbackDays,
      coverage_days: coverageDays,
      formula: 'Reorder Point = Avg Daily Demand × Supplier Lead Time + Reorder Level; Suggested Qty replenishes projected stock to Lead Time + 30-day coverage + Reorder Level.',
    },
  };
}

export async function getReorderSuggestions(db) {
  const [rows] = await db.query(
    `SELECT
       p.id AS product_id,
       p.name AS product_name,
       p.barcode,
       p.unit,
       p.category,
       p.stock,
       p.reorder_level,
       p.supplier_id,
       s.supplier_name,
       s.status AS supplier_status,
       s.lead_time_days,
       COALESCE(sales_30d.net_units_sold_30d, 0) AS net_units_sold_30d,
       COALESCE(open_po.outstanding_po_quantity, 0) AS outstanding_po_quantity
     FROM products p
     LEFT JOIN suppliers s
       ON s.supplier_id = p.supplier_id
     LEFT JOIN (
       SELECT
         si.product_id,
         SUM(GREATEST(si.quantity - COALESCE(returned.returned_quantity, 0), 0)) AS net_units_sold_30d
       FROM sale_items si
       INNER JOIN sales sale
         ON sale.sale_id = si.sale_id
        AND sale.payment_status = 'Paid'
        AND sale.sale_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       LEFT JOIN (
         SELECT
           sai.sale_item_id,
           SUM(sai.quantity) AS returned_quantity
         FROM sale_adjustment_items sai
         GROUP BY sai.sale_item_id
       ) returned
         ON returned.sale_item_id = si.sale_item_id
       GROUP BY si.product_id
     ) sales_30d
       ON sales_30d.product_id = p.id
     LEFT JOIN (
       SELECT
         poi.product_id,
         SUM(
           GREATEST(
             poi.ordered_quantity - COALESCE(receipts.received_quantity, 0),
             0
           )
         ) AS outstanding_po_quantity
       FROM purchase_order_items poi
       INNER JOIN purchase_orders po
         ON po.purchase_order_id = poi.purchase_order_id
        AND po.status IN ('Ordered', 'Partially Received')
       LEFT JOIN (
         SELECT
           purchase_order_item_id,
           SUM(quantity) AS received_quantity
         FROM inventory_movements
         WHERE purchase_order_item_id IS NOT NULL
           AND movement_type = 'Stock-In'
         GROUP BY purchase_order_item_id
       ) receipts
         ON receipts.purchase_order_item_id = poi.purchase_order_item_id
       GROUP BY poi.product_id
     ) open_po
       ON open_po.product_id = p.id
     WHERE p.status = 'active'
     ORDER BY p.name ASC`
  );

  const suggestions = rows.map((row) => calculateReorderSuggestion(row));

  const summary = suggestions.reduce((acc, suggestion) => {
    acc.total_products += 1;
    if (suggestion.status === 'Critical' || suggestion.status === 'High' || suggestion.status === 'Reorder Soon') {
      acc.needs_reorder += 1;
    }
    if (suggestion.status === 'Covered by PO') acc.covered_by_po += 1;
    if (suggestion.status === 'Setup Required') acc.setup_required += 1;
    if (suggestion.status === 'Healthy') acc.healthy += 1;
    acc.total_suggested_units += suggestion.suggested_order_quantity;
    return acc;
  }, {
    total_products: 0,
    needs_reorder: 0,
    covered_by_po: 0,
    setup_required: 0,
    healthy: 0,
    total_suggested_units: 0,
  });

  return {
    generated_at: new Date().toISOString(),
    lookback_days: LOOKBACK_DAYS,
    coverage_days: COVERAGE_DAYS,
    summary,
    suggestions,
  };
}
