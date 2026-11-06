import { getPhilippineBusinessRanges } from './businessTime.js';
import { getFinancialSummaryForRange, netSaleItemRevenueSql } from './financialMetrics.js';
import { getManagementOverview } from './managementOverview.js';

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function clampLimit(value, fallback = 5, maximum = 20) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maximum);
}

export async function getTopSellingProducts(database, { start, end, limit = 5, publicOnly = false }) {
  const safeLimit = clampLimit(limit);
  const publicJoin = publicOnly
    ? `INNER JOIN categories c ON c.category_id = p.category_id AND c.status = 'Active'`
    : '';
  const publicFilter = publicOnly
    ? `AND p.status = 'active' AND p.stock > 0`
    : '';

  const [rows] = await database.query(
    `SELECT
       p.id,
       p.name,
       p.image,
       p.category,
       p.brand,
       p.price,
       p.stock,
       p.reorder_level,
       p.status,
       p.fulfillment_rule,
       SUM(GREATEST(si.quantity - COALESCE(returned.returned_quantity, 0), 0)) AS quantity_sold,
       ROUND(SUM(GREATEST((${netSaleItemRevenueSql}) - COALESCE(returned.refunded_amount, 0), 0)), 2) AS sales_amount
     FROM sales s
     INNER JOIN sale_items si ON si.sale_id = s.sale_id
     LEFT JOIN orders o ON o.id = s.order_id
     LEFT JOIN (
       SELECT sale_id, ROUND(SUM(subtotal), 2) AS gross_items
       FROM sale_items
       GROUP BY sale_id
     ) item_totals ON item_totals.sale_id = s.sale_id
     LEFT JOIN (
       SELECT
         sale_item_id,
         SUM(quantity) AS returned_quantity,
         ROUND(SUM(refund_subtotal), 2) AS refunded_amount
       FROM sale_adjustment_items
       GROUP BY sale_item_id
     ) returned ON returned.sale_item_id = si.sale_item_id
     INNER JOIN products p ON p.id = si.product_id
     ${publicJoin}
     WHERE s.payment_status = 'Paid'
       AND s.sale_date >= ?
       AND s.sale_date <= ?
       ${publicFilter}
     GROUP BY
       p.id, p.name, p.image, p.category, p.brand, p.price, p.stock,
       p.reorder_level, p.status, p.fulfillment_rule
     ORDER BY quantity_sold DESC, sales_amount DESC, p.name ASC
     LIMIT ${safeLimit}`,
    [start, end]
  );

  return rows.map((row, index) => ({
    rank: index + 1,
    id: Number(row.id),
    name: row.name,
    image: row.image,
    category: row.category,
    brand: row.brand,
    price: toNumber(row.price),
    stock: toNumber(row.stock),
    reorderLevel: toNumber(row.reorder_level),
    status: row.status,
    fulfillmentRule: row.fulfillment_rule || 'all',
    quantitySold: toNumber(row.quantity_sold),
    salesAmount: toNumber(row.sales_amount),
  }));
}

async function getDailyOperations(database, range) {
  const sales = await getFinancialSummaryForRange(database, range);

  const [[movements]] = await database.query(
    `SELECT
       COALESCE(SUM(CASE WHEN movement_type = 'Stock-In' THEN quantity ELSE 0 END), 0) AS stock_received,
       COALESCE(SUM(CASE WHEN movement_type = 'Stock-Out' THEN quantity ELSE 0 END), 0) AS stock_out
     FROM inventory_movements
     WHERE movement_date >= ?
       AND movement_date <= ?`,
    [range.start, range.end]
  );

  const [[lowStock]] = await database.query(
    `SELECT COUNT(*) AS low_stock_count
     FROM products
     WHERE stock = 0 OR stock < reorder_level`
  );

  const [[inventoryValue]] = await database.query(
    `SELECT
       ROUND(COALESCE(SUM(product_value.inventory_value), 0), 2) AS inventory_value
     FROM (
       SELECT
         product_id,
         SUM(CASE
           WHEN movement_type = 'Stock-In' THEN quantity * supplier_price
           WHEN movement_type = 'Stock-Out' THEN -(quantity * supplier_price)
           ELSE 0
         END) AS inventory_value
       FROM inventory_movements
       GROUP BY product_id
     ) product_value`
  );

  return {
    // Phase 2: Sales Today now means net merchandise sales, excluding delivery/service fees.
    salesToday: toNumber(sales.total_net_merchandise_sales),
    grossMerchandiseSalesToday: toNumber(sales.total_gross_merchandise_sales),
    discountsToday: toNumber(sales.total_discounts),
    totalRevenueToday: toNumber(sales.total_revenue),
    serviceRevenueToday: toNumber(sales.total_service_revenue),
    deliveryRevenueToday: toNumber(sales.total_delivery_revenue),
    feeRevenueToday: toNumber(sales.total_fee_revenue),
    transactionsToday: toNumber(sales.total_sales),
    itemsSoldToday: toNumber(sales.total_items_sold),
    stockReceivedToday: toNumber(movements?.stock_received),
    stockOutToday: toNumber(movements?.stock_out),
    lowStockProducts: toNumber(lowStock?.low_stock_count),
    inventoryValue: toNumber(inventoryValue?.inventory_value),
    estimatedGrossProfit: toNumber(sales.total_gross_profit),
    grossProfitMarginToday: toNumber(sales.total_gross_profit_margin),
    cogsToday: toNumber(sales.total_cogs),
  };
}

async function getInventoryActivity(database, range) {
  const [rows] = await database.query(
    `SELECT
       activity.id,
       activity.name,
       activity.barcode,
       activity.category,
       activity.current_stock,
       activity.reorder_level,
       activity.status,
       activity.stock_in,
       activity.stock_out
     FROM (
       SELECT
         p.id,
         p.name,
         p.barcode,
         p.category,
         p.stock AS current_stock,
         p.reorder_level,
         p.status,
         COALESCE(SUM(CASE
           WHEN im.movement_type = 'Stock-In'
            AND im.movement_date >= ? AND im.movement_date <= ?
           THEN im.quantity ELSE 0 END), 0) AS stock_in,
         COALESCE(SUM(CASE
           WHEN im.movement_type = 'Stock-Out'
            AND im.movement_date >= ? AND im.movement_date <= ?
           THEN im.quantity ELSE 0 END), 0) AS stock_out
       FROM products p
       LEFT JOIN inventory_movements im ON im.product_id = p.id
       GROUP BY p.id, p.name, p.barcode, p.category, p.stock, p.reorder_level, p.status
     ) activity
     ORDER BY
       CASE
         WHEN activity.current_stock = 0 OR activity.current_stock < activity.reorder_level THEN 0
         ELSE 1
       END,
       (activity.stock_in + activity.stock_out) DESC,
       activity.name ASC`,
    [range.start, range.end, range.start, range.end]
  );

  return rows.map((row) => {
    const currentStock = toNumber(row.current_stock);
    const stockIn = toNumber(row.stock_in);
    const stockOut = toNumber(row.stock_out);
    const reorderLevel = toNumber(row.reorder_level);

    return {
      productId: Number(row.id),
      productName: row.name,
      barcode: row.barcode || null,
      category: row.category || null,
      beginningStock: currentStock - stockIn + stockOut,
      stockIn,
      stockOut,
      currentStock,
      reorderLevel,
      lowStock: currentStock === 0 || currentStock < reorderLevel,
      status: row.status,
    };
  });
}

export async function getAdminAnalytics(database, { adminId = null } = {}) {
  const ranges = await getPhilippineBusinessRanges(database);

  const [dailyOperations, todayInventory, weekInventory, todayTop, weekTop, managementOverview] = await Promise.all([
    getDailyOperations(database, ranges.today),
    getInventoryActivity(database, ranges.today),
    getInventoryActivity(database, ranges.week),
    getTopSellingProducts(database, { ...ranges.today, limit: 5 }),
    getTopSellingProducts(database, { ...ranges.week, limit: 5 }),
    getManagementOverview(database, { adminId, ranges }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    timezone: ranges.timezone,
    period: {
      businessDate: ranges.labels.today,
      weekStartsMonday: true,
      today: ranges.today,
      week: ranges.week,
    },
    dailyOperations,
    inventoryActivity: {
      today: todayInventory,
      week: weekInventory,
      note: 'Beginning stock is derived from current stock and recorded Stock-In/Stock-Out movements for the selected period.',
    },
    topSelling: {
      today: todayTop,
      week: weekTop,
    },
    managementOverview,
  };
}

export async function getPublicPopularProducts(database, { period = 'week', limit = 5 } = {}) {
  const ranges = await getPhilippineBusinessRanges(database);
  const selectedRange = period === 'today' ? ranges.today : ranges.week;
  const products = await getTopSellingProducts(database, {
    ...selectedRange,
    limit,
    publicOnly: true,
  });

  return {
    period: period === 'today' ? 'today' : 'week',
    timezone: ranges.timezone,
    products,
  };
}
