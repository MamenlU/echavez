function money(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function percent(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

const saleItemsAggregateSql = `
  SELECT
    si.sale_id,
    COUNT(*) AS item_count,
    SUM(si.quantity) AS total_quantity,
    ROUND(SUM(si.subtotal), 2) AS merchandise_sales,
    GROUP_CONCAT(
      CONCAT(
        COALESCE(p.name, CONCAT('Product #', si.product_id)),
        ' × ',
        si.quantity
      )
      SEPARATOR ', '
    ) AS items_summary
  FROM sale_items si
  LEFT JOIN products p ON p.id = si.product_id
  GROUP BY si.sale_id
`;

const saleCostsAggregateSql = `
  SELECT
    sale_id,
    ROUND(SUM(quantity * supplier_price), 2) AS original_cogs
  FROM inventory_movements
  WHERE movement_type = 'Stock-Out'
    AND sale_id IS NOT NULL
  GROUP BY sale_id
`;

const saleAdjustmentsAggregateSql = `
  SELECT
    sale_id,
    COUNT(*) AS adjustment_count,
    SUM(CASE WHEN adjustment_type = 'Void' THEN 1 ELSE 0 END) AS void_count,
    ROUND(SUM(merchandise_refund_amount), 2) AS merchandise_refunds,
    ROUND(SUM(service_fee_refund_amount), 2) AS service_fee_refunds,
    ROUND(SUM(delivery_fee_refund_amount), 2) AS delivery_fee_refunds,
    ROUND(SUM(total_refund_amount), 2) AS total_refunds
  FROM sale_adjustments
  GROUP BY sale_id
`;

const saleAdjustmentItemsAggregateSql = `
  SELECT
    sa.sale_id,
    SUM(sai.quantity) AS returned_quantity,
    SUM(CASE WHEN sai.restockable = 1 THEN sai.quantity ELSE 0 END) AS restocked_quantity,
    SUM(CASE WHEN sai.restockable = 0 THEN sai.quantity ELSE 0 END) AS non_restocked_quantity,
    ROUND(
      SUM(CASE WHEN sai.restockable = 1 THEN sai.quantity * sai.unit_cost ELSE 0 END),
      2
    ) AS cogs_reversed
  FROM sale_adjustment_items sai
  INNER JOIN sale_adjustments sa ON sa.adjustment_id = sai.adjustment_id
  GROUP BY sa.sale_id
`;

// One row per paid sale. Phase 4 keeps original sales immutable and applies
// returns/voids as adjustment records. Merchandise refunds reduce merchandise
// revenue. Fee refunds reduce their corresponding fee revenue. COGS reverses
// only when returned inventory is actually restocked at its original sale cost.
const financialSaleBaseSql = `
  SELECT
    s.sale_id,
    s.order_id,
    s.admin_id,
    s.shift_id,
    s.sales_source,
    s.payment_status,
    COALESCE(s.payment_method, o.payment_method, 'Cash') AS payment_method,
    s.cash_received,
    s.change_amount,
    s.card_payment_reference,
    s.sale_date,
    s.fulfillment AS pos_fulfillment,
    COALESCE(items.item_count, 0) AS item_count,
    COALESCE(items.total_quantity, 0) AS total_quantity,
    GREATEST(COALESCE(items.total_quantity, 0) - COALESCE(adjusted_items.returned_quantity, 0), 0) AS net_quantity,
    COALESCE(adjusted_items.returned_quantity, 0) AS returned_quantity,
    COALESCE(adjusted_items.restocked_quantity, 0) AS restocked_quantity,
    COALESCE(adjusted_items.non_restocked_quantity, 0) AS non_restocked_quantity,
    COALESCE(items.items_summary, '—') AS items_summary,
    ROUND(
      CASE
        WHEN s.order_id IS NOT NULL THEN
          CASE
            WHEN COALESCE(o.original_subtotal, 0) > 0 THEN o.original_subtotal
            ELSE COALESCE(items.merchandise_sales, 0)
          END
        ELSE COALESCE(items.merchandise_sales, GREATEST(s.total_amount - COALESCE(s.delivery_fee, 0), 0))
      END,
      2
    ) AS gross_merchandise_sales,
    ROUND(
      CASE WHEN s.order_id IS NOT NULL THEN COALESCE(o.discount_amount, 0) ELSE 0 END,
      2
    ) AS discount_amount,
    ROUND(COALESCE(adjustments.merchandise_refunds, 0), 2) AS merchandise_refunds,
    ROUND(
      GREATEST(
        CASE
          WHEN s.order_id IS NOT NULL THEN COALESCE(o.total, 0)
          ELSE COALESCE(items.merchandise_sales, GREATEST(s.total_amount - COALESCE(s.delivery_fee, 0), 0))
        END - COALESCE(adjustments.merchandise_refunds, 0),
        0
      ),
      2
    ) AS net_merchandise_sales,
    ROUND(COALESCE(adjustments.service_fee_refunds, 0), 2) AS service_fee_refunds,
    ROUND(
      GREATEST(
        CASE WHEN s.order_id IS NOT NULL THEN COALESCE(o.service_fee, 0) ELSE 0 END
        - COALESCE(adjustments.service_fee_refunds, 0),
        0
      ),
      2
    ) AS service_revenue,
    ROUND(COALESCE(adjustments.delivery_fee_refunds, 0), 2) AS delivery_fee_refunds,
    ROUND(
      GREATEST(
        CASE
          WHEN s.order_id IS NOT NULL THEN COALESCE(o.delivery_fee, 0)
          ELSE COALESCE(s.delivery_fee, 0)
        END - COALESCE(adjustments.delivery_fee_refunds, 0),
        0
      ),
      2
    ) AS delivery_revenue,
    ROUND(COALESCE(adjustments.total_refunds, 0), 2) AS total_refunds,
    ROUND(s.total_amount, 2) AS original_total_revenue,
    ROUND(GREATEST(s.total_amount - COALESCE(adjustments.total_refunds, 0), 0), 2) AS total_revenue,
    ROUND(COALESCE(costs.original_cogs, 0), 2) AS original_cogs,
    ROUND(COALESCE(adjusted_items.cogs_reversed, 0), 2) AS cogs_reversed,
    ROUND(
      GREATEST(COALESCE(costs.original_cogs, 0) - COALESCE(adjusted_items.cogs_reversed, 0), 0),
      2
    ) AS cogs,
    COALESCE(adjustments.adjustment_count, 0) AS adjustment_count,
    COALESCE(adjustments.void_count, 0) AS void_count,
    CASE
      WHEN COALESCE(adjustments.void_count, 0) > 0 THEN 'Voided'
      WHEN COALESCE(adjustments.adjustment_count, 0) > 0 THEN 'Adjusted'
      ELSE 'Completed'
    END AS adjustment_state,
    CASE
      WHEN s.order_id IS NOT NULL THEN o.fulfillment
      ELSE s.fulfillment
    END AS fulfillment
  FROM sales s
  LEFT JOIN orders o ON o.id = s.order_id
  LEFT JOIN (${saleItemsAggregateSql}) items ON items.sale_id = s.sale_id
  LEFT JOIN (${saleCostsAggregateSql}) costs ON costs.sale_id = s.sale_id
  LEFT JOIN (${saleAdjustmentsAggregateSql}) adjustments ON adjustments.sale_id = s.sale_id
  LEFT JOIN (${saleAdjustmentItemsAggregateSql}) adjusted_items ON adjusted_items.sale_id = s.sale_id
`;

function decorateFinancialRow(row) {
  const netMerchandiseSales = money(row.net_merchandise_sales);
  const cogs = money(row.cogs);
  const grossProfit = money(netMerchandiseSales - cogs);
  const grossProfitMargin = netMerchandiseSales > 0
    ? percent((grossProfit / netMerchandiseSales) * 100)
    : 0;
  const serviceRevenue = money(row.service_revenue);
  const deliveryRevenue = money(row.delivery_revenue);

  return {
    ...row,
    item_count: Number(row.item_count || 0),
    total_quantity: Number(row.total_quantity || 0),
    net_quantity: Number(row.net_quantity ?? row.total_quantity ?? 0),
    returned_quantity: Number(row.returned_quantity || 0),
    restocked_quantity: Number(row.restocked_quantity || 0),
    non_restocked_quantity: Number(row.non_restocked_quantity || 0),
    gross_merchandise_sales: money(row.gross_merchandise_sales),
    discount_amount: money(row.discount_amount),
    merchandise_refunds: money(row.merchandise_refunds),
    net_merchandise_sales: netMerchandiseSales,
    service_fee_refunds: money(row.service_fee_refunds),
    service_revenue: serviceRevenue,
    delivery_fee_refunds: money(row.delivery_fee_refunds),
    delivery_revenue: deliveryRevenue,
    fee_revenue: money(serviceRevenue + deliveryRevenue),
    total_refunds: money(row.total_refunds),
    original_total_revenue: money(row.original_total_revenue ?? row.total_revenue),
    total_revenue: money(row.total_revenue),
    revenue: money(row.total_revenue),
    original_cogs: money(row.original_cogs ?? row.cogs),
    cogs_reversed: money(row.cogs_reversed),
    cogs,
    adjustment_count: Number(row.adjustment_count || 0),
    void_count: Number(row.void_count || 0),
    adjustment_state: row.adjustment_state || 'Completed',
    gross_profit: grossProfit,
    gross_profit_margin: grossProfitMargin,
  };
}

export function summarizeFinancialRows(rows) {
  const summary = rows.reduce((totals, row) => {
    const sale = decorateFinancialRow(row);
    totals.total_sales += 1;
    totals.total_gross_merchandise_sales += sale.gross_merchandise_sales;
    totals.total_discounts += sale.discount_amount;
    totals.total_merchandise_refunds += sale.merchandise_refunds;
    totals.total_net_merchandise_sales += sale.net_merchandise_sales;
    totals.total_service_fee_refunds += sale.service_fee_refunds;
    totals.total_delivery_fee_refunds += sale.delivery_fee_refunds;
    totals.total_service_revenue += sale.service_revenue;
    totals.total_delivery_revenue += sale.delivery_revenue;
    totals.total_fee_revenue += sale.fee_revenue;
    totals.total_refunds += sale.total_refunds;
    totals.total_revenue += sale.total_revenue;
    totals.total_original_cogs += sale.original_cogs;
    totals.total_cogs_reversed += sale.cogs_reversed;
    totals.total_cogs += sale.cogs;
    totals.total_gross_profit += sale.gross_profit;
    totals.total_items_sold += sale.net_quantity;
    totals.total_items_returned += sale.returned_quantity;
    totals.total_adjustments += sale.adjustment_count;
    totals.total_voided_sales += sale.void_count > 0 ? 1 : 0;
    return totals;
  }, {
    total_sales: 0,
    total_gross_merchandise_sales: 0,
    total_discounts: 0,
    total_merchandise_refunds: 0,
    total_net_merchandise_sales: 0,
    total_service_fee_refunds: 0,
    total_delivery_fee_refunds: 0,
    total_service_revenue: 0,
    total_delivery_revenue: 0,
    total_fee_revenue: 0,
    total_refunds: 0,
    total_revenue: 0,
    total_original_cogs: 0,
    total_cogs_reversed: 0,
    total_cogs: 0,
    total_gross_profit: 0,
    total_gross_profit_margin: 0,
    total_items_sold: 0,
    total_items_returned: 0,
    total_adjustments: 0,
    total_voided_sales: 0,
  });

  for (const key of [
    'total_gross_merchandise_sales',
    'total_discounts',
    'total_merchandise_refunds',
    'total_net_merchandise_sales',
    'total_service_fee_refunds',
    'total_delivery_fee_refunds',
    'total_service_revenue',
    'total_delivery_revenue',
    'total_fee_revenue',
    'total_refunds',
    'total_revenue',
    'total_original_cogs',
    'total_cogs_reversed',
    'total_cogs',
    'total_gross_profit',
  ]) {
    summary[key] = money(summary[key]);
  }

  summary.total_gross_profit_margin = summary.total_net_merchandise_sales > 0
    ? percent((summary.total_gross_profit / summary.total_net_merchandise_sales) * 100)
    : 0;

  return summary;
}

export async function getSalesFinancialHistory(database) {
  const [rows] = await database.query(
    `SELECT financial_sales.*,
       CONCAT_WS(' ', operator.first_name, operator.last_name) AS operator_name,
       operator.username AS operator_username, operator.role AS operator_role,
       cs.admin_id AS shift_owner_id,
       CONCAT_WS(' ', owner.first_name, owner.last_name) AS shift_owner_name,
       owner.username AS shift_owner_username, owner.role AS shift_owner_role
     FROM (${financialSaleBaseSql}
       WHERE s.payment_status = 'Paid'
     ) financial_sales
     LEFT JOIN users operator ON operator.id = financial_sales.admin_id
     LEFT JOIN cashier_shifts cs ON cs.shift_id = financial_sales.shift_id
     LEFT JOIN users owner ON owner.id = cs.admin_id
     ORDER BY financial_sales.sale_date DESC, financial_sales.sale_id DESC`
  );

  const sales = rows.map((row) => {
    const decorated = decorateFinancialRow(row);
    return {
      ...decorated,
      reference: row.order_id || `POS-${String(row.sale_id).padStart(6, '0')}`,
      source_label: row.order_id
        ? row.fulfillment === 'shop_go'
          ? 'Shop & Go'
          : row.fulfillment === 'delivery'
            ? 'Delivery'
            : 'Pickup'
        : row.fulfillment === 'delivery'
          ? 'Delivery'
          : 'POS',
    };
  });

  return { sales, summary: summarizeFinancialRows(sales) };
}

export async function getFinancialSummaryForRange(database, { start, end }) {
  const [rows] = await database.query(
    `SELECT financial_sales.*
     FROM (${financialSaleBaseSql}
       WHERE s.payment_status = 'Paid'
         AND s.sale_date >= ?
         AND s.sale_date <= ?
     ) financial_sales`,
    [start, end]
  );

  return summarizeFinancialRows(rows);
}

// Net product revenue used for monetary product analytics. A sale-level discount
// is allocated proportionally across its items without changing stored historical
// order_items/sale_items rows. Phase 4 then subtracts actual recorded item refunds.
export const netSaleItemRevenueSql = `
  si.subtotal *
  CASE
    WHEN s.order_id IS NOT NULL AND COALESCE(o.original_subtotal, 0) > 0
      THEN COALESCE(o.total, 0) / NULLIF(o.original_subtotal, 0)
    WHEN s.order_id IS NOT NULL AND COALESCE(item_totals.gross_items, 0) > 0
      THEN GREATEST(
        s.total_amount - COALESCE(o.service_fee, 0) - COALESCE(o.delivery_fee, 0),
        0
      ) / NULLIF(item_totals.gross_items, 0)
    ELSE 1
  END
`;
