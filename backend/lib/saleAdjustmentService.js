function money(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
}

function wholeNumber(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : 0;
}

export const REFUND_METHODS = ['Cash', 'Card', 'GCash', 'PayMongo', 'Other'];

export function normalizeRefundMethod(value, fallback = 'Cash') {
  const normalized = String(value || '').trim().toLowerCase();
  const match = REFUND_METHODS.find((method) => method.toLowerCase() === normalized);
  return match || fallback;
}

export function requiresExternalRefundConfirmation(method) {
  return String(method || '').trim().toLowerCase() !== 'cash';
}

function getOriginalItemRefundableAmount(sale, item) {
  if (sale.order_id) {
    const originalSubtotal = money(sale.original_subtotal);
    const orderNetMerchandise = money(sale.order_net_merchandise);
    if (originalSubtotal > 0) {
      return money(money(item.subtotal) * (orderNetMerchandise / originalSubtotal));
    }
  }
  return money(item.subtotal);
}

export async function getSaleAdjustmentSnapshot(database, saleId, { lock = false } = {}) {
  const normalizedSaleId = Number(saleId);
  if (!Number.isInteger(normalizedSaleId) || normalizedSaleId <= 0) return null;

  const [saleRows] = await database.query(
    `SELECT
      s.sale_id,
      s.order_id,
      s.admin_id,
      s.sales_source,
      s.fulfillment AS pos_fulfillment,
      s.total_amount,
      s.delivery_fee AS pos_delivery_fee,
      s.customer_name,
      s.payment_status,
      s.payment_method AS sale_payment_method,
      s.sale_date,
      o.original_subtotal,
      o.discount_amount,
      o.total AS order_net_merchandise,
      o.service_fee AS order_service_fee,
      o.delivery_fee AS order_delivery_fee,
      o.fulfillment AS order_fulfillment,
      o.payment_method AS order_payment_method,
      o.payment_status AS order_payment_status,
      o.status AS order_status
     FROM sales s
     LEFT JOIN orders o ON o.id = s.order_id
     WHERE s.sale_id = ?
     LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [normalizedSaleId]
  );

  if (!saleRows.length) return null;
  const sale = saleRows[0];

  const [itemRows] = await database.query(
    `SELECT
      si.sale_item_id,
      si.sale_id,
      si.product_id,
      p.name AS product_name,
      si.quantity AS sold_quantity,
      si.unit_price,
      si.subtotal,
      COALESCE(previous.returned_quantity, 0) AS returned_quantity,
      COALESCE(previous.refund_subtotal, 0) AS prior_refund_subtotal,
      costs.original_unit_cost
     FROM sale_items si
     INNER JOIN products p ON p.id = si.product_id
     LEFT JOIN (
       SELECT
         sai.sale_item_id,
         SUM(sai.quantity) AS returned_quantity,
         ROUND(SUM(sai.refund_subtotal), 2) AS refund_subtotal
       FROM sale_adjustment_items sai
       GROUP BY sai.sale_item_id
     ) previous ON previous.sale_item_id = si.sale_item_id
     LEFT JOIN (
       SELECT
         sale_id,
         product_id,
         ROUND(
           SUM(quantity * supplier_price) / NULLIF(SUM(quantity), 0),
           2
         ) AS original_unit_cost
       FROM inventory_movements
       WHERE movement_type = 'Stock-Out'
         AND sale_id IS NOT NULL
       GROUP BY sale_id, product_id
     ) costs ON costs.sale_id = si.sale_id AND costs.product_id = si.product_id
     WHERE si.sale_id = ?
     ORDER BY si.sale_item_id ASC`,
    [normalizedSaleId]
  );

  const [[adjustmentTotals]] = await database.query(
    `SELECT
      COUNT(*) AS adjustment_count,
      COALESCE(SUM(CASE WHEN adjustment_type = 'Void' THEN 1 ELSE 0 END), 0) AS void_count,
      COALESCE(SUM(merchandise_refund_amount), 0) AS merchandise_refunded,
      COALESCE(SUM(service_fee_refund_amount), 0) AS service_fee_refunded,
      COALESCE(SUM(delivery_fee_refund_amount), 0) AS delivery_fee_refunded,
      COALESCE(SUM(total_refund_amount), 0) AS total_refunded
     FROM sale_adjustments
     WHERE sale_id = ?`,
    [normalizedSaleId]
  );

  const paymentMethod = normalizeRefundMethod(
    sale.sale_payment_method || sale.order_payment_method || 'Cash'
  );
  const serviceFee = sale.order_id ? money(sale.order_service_fee) : 0;
  const deliveryFee = sale.order_id
    ? money(sale.order_delivery_fee)
    : money(sale.pos_delivery_fee);

  const items = itemRows.map((item) => {
    const soldQuantity = wholeNumber(item.sold_quantity);
    const returnedQuantity = wholeNumber(item.returned_quantity);
    const remainingQuantity = Math.max(0, soldQuantity - returnedQuantity);
    const originalRefundable = getOriginalItemRefundableAmount(sale, item);
    const priorRefund = money(item.prior_refund_subtotal);
    const remainingRefundable = Math.max(0, money(originalRefundable - priorRefund));
    const unitRefundEstimate = remainingQuantity > 0
      ? money(remainingRefundable / remainingQuantity)
      : 0;

    return {
      sale_item_id: Number(item.sale_item_id),
      product_id: Number(item.product_id),
      product_name: item.product_name,
      sold_quantity: soldQuantity,
      returned_quantity: returnedQuantity,
      remaining_quantity: remainingQuantity,
      unit_price: money(item.unit_price),
      gross_subtotal: money(item.subtotal),
      original_refundable_amount: originalRefundable,
      prior_refund_subtotal: priorRefund,
      remaining_refundable_amount: remainingRefundable,
      unit_refund_estimate: unitRefundEstimate,
      original_unit_cost: item.original_unit_cost === null ? null : money(item.original_unit_cost),
    };
  });

  const originalNetMerchandise = money(
    sale.order_id
      ? sale.order_net_merchandise
      : items.reduce((sum, item) => sum + item.gross_subtotal, 0)
  );
  const originalGrossMerchandise = money(
    sale.order_id && money(sale.original_subtotal) > 0
      ? sale.original_subtotal
      : items.reduce((sum, item) => sum + item.gross_subtotal, 0)
  );
  const merchandiseRefunded = money(adjustmentTotals?.merchandise_refunded);
  const serviceFeeRefunded = money(adjustmentTotals?.service_fee_refunded);
  const deliveryFeeRefunded = money(adjustmentTotals?.delivery_fee_refunded);
  const totalRefunded = money(adjustmentTotals?.total_refunded);
  const remainingServiceFee = Math.max(0, money(serviceFee - serviceFeeRefunded));
  const remainingDeliveryFee = Math.max(0, money(deliveryFee - deliveryFeeRefunded));
  const remainingMerchandiseRefundable = money(
    items.reduce((sum, item) => sum + item.remaining_refundable_amount, 0)
  );
  const adjustmentCount = wholeNumber(adjustmentTotals?.adjustment_count);
  const voidCount = wholeNumber(adjustmentTotals?.void_count);

  return {
    sale_id: Number(sale.sale_id),
    order_id: sale.order_id || null,
    reference: sale.order_id || `POS-${String(sale.sale_id).padStart(6, '0')}`,
    sales_source: sale.sales_source,
    fulfillment: sale.order_id ? sale.order_fulfillment : sale.pos_fulfillment,
    sale_date: sale.sale_date,
    customer_name: sale.customer_name || null,
    payment_status: sale.payment_status,
    payment_method: paymentMethod,
    original_total_amount: money(sale.total_amount),
    original_gross_merchandise: originalGrossMerchandise,
    original_discount: sale.order_id ? money(sale.discount_amount) : 0,
    original_net_merchandise: originalNetMerchandise,
    original_service_fee: serviceFee,
    original_delivery_fee: deliveryFee,
    merchandise_refunded: merchandiseRefunded,
    service_fee_refunded: serviceFeeRefunded,
    delivery_fee_refunded: deliveryFeeRefunded,
    total_refunded: totalRefunded,
    remaining_merchandise_refundable: remainingMerchandiseRefundable,
    remaining_service_fee: remainingServiceFee,
    remaining_delivery_fee: remainingDeliveryFee,
    remaining_total_refundable: money(
      remainingMerchandiseRefundable + remainingServiceFee + remainingDeliveryFee
    ),
    adjustment_count: adjustmentCount,
    void_count: voidCount,
    can_void: sale.sales_source === 'Onsite POS' && adjustmentCount === 0,
    external_refund_required: requiresExternalRefundConfirmation(paymentMethod),
    order_payment_status: sale.order_payment_status || null,
    order_status: sale.order_status || null,
    items,
  };
}

export function calculateReturnLine(item, requestedQuantity) {
  const quantity = Number(requestedQuantity);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw Object.assign(new Error('Return quantity must be a whole number greater than zero.'), {
      statusCode: 400,
      code: 'INVALID_RETURN_QUANTITY',
    });
  }
  if (quantity > item.remaining_quantity) {
    throw Object.assign(
      new Error(`Return quantity for ${item.product_name} exceeds the ${item.remaining_quantity} unit(s) still eligible.`),
      { statusCode: 409, code: 'RETURN_QUANTITY_EXCEEDED' }
    );
  }
  if (item.original_unit_cost === null || !Number.isFinite(Number(item.original_unit_cost))) {
    throw Object.assign(
      new Error(`Original inventory cost is unavailable for ${item.product_name}. The return cannot be posted safely.`),
      { statusCode: 409, code: 'ORIGINAL_COST_REQUIRED' }
    );
  }

  const refundSubtotal = quantity === item.remaining_quantity
    ? money(item.remaining_refundable_amount)
    : Math.min(
        money(item.remaining_refundable_amount),
        money((item.original_refundable_amount / item.sold_quantity) * quantity)
      );

  return {
    quantity,
    refundSubtotal,
    unitRefundAmount: quantity > 0 ? money(refundSubtotal / quantity) : 0,
    unitCost: money(item.original_unit_cost),
  };
}
