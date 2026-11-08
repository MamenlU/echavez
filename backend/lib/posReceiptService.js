// Read-only receipts are assembled from committed Sale/Sale Item rows.
// Never use the editable browser cart as the financial source of a printed receipt.
export async function getPosReceipt(database, saleId) {
  const [rows] = await database.query(
    `SELECT s.sale_id, s.admin_id, s.shift_id, s.pos_request_id, s.sale_date,
            s.sales_source, s.fulfillment, s.payment_status, s.payment_method,
            s.total_amount, s.delivery_fee, s.cash_received, s.change_amount,
            s.card_payment_reference, s.customer_name, s.delivery_contact_person,
            s.delivery_contact_number, s.delivery_municipality, s.delivery_barangay,
            s.delivery_address, s.delivery_landmark,
            CONCAT_WS(' ', u.first_name, u.last_name) AS operator_name,
            u.username AS operator_username, u.role AS operator_role
       FROM sales s
       INNER JOIN users u ON u.id = s.admin_id
       WHERE s.sale_id = ? AND s.sales_source = 'Onsite POS' LIMIT 1`,
    [saleId]
  );
  if (!rows.length) return null;
  const sale = rows[0];
  const [items] = await database.query(
    `SELECT si.product_id, COALESCE(p.name, CONCAT('Product #', si.product_id)) AS name,
            si.quantity, si.unit_price, si.subtotal
       FROM sale_items si LEFT JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = ? ORDER BY si.sale_item_id`,
    [saleId]
  );
  const [adjustments] = await database.query(
    `SELECT COUNT(*) AS adjustment_count,
            COALESCE(SUM(CASE WHEN adjustment_type = 'Void' THEN 1 ELSE 0 END), 0) AS void_count
       FROM sale_adjustments WHERE sale_id = ?`,
    [saleId]
  );
  const adjustment = adjustments[0] || {};
  return {
    saleId: Number(sale.sale_id),
    reference: `POS-${String(sale.sale_id).padStart(6, '0')}`,
    operatorId: Number(sale.admin_id), operatorName: sale.operator_name?.trim() || sale.operator_username,
    operatorRole: sale.operator_role, shiftId: sale.shift_id == null ? null : Number(sale.shift_id),
    saleDate: sale.sale_date, fulfillment: sale.fulfillment,
    paymentStatus: sale.payment_status, paymentMethod: sale.payment_method,
    totalAmount: Number(sale.total_amount), deliveryFee: Number(sale.delivery_fee || 0),
    cashReceived: sale.cash_received == null ? null : Number(sale.cash_received),
    changeAmount: sale.change_amount == null ? null : Number(sale.change_amount),
    cardPaymentReference: sale.card_payment_reference || null,
    customerName: sale.customer_name || null,
    contactPerson: sale.delivery_contact_person || null,
    contactNumber: sale.delivery_contact_number || null,
    municipality: sale.delivery_municipality || null, barangay: sale.delivery_barangay || null,
    address: sale.delivery_address || null, landmark: sale.delivery_landmark || null,
    adjustmentState: Number(adjustment.void_count) > 0 ? 'Voided'
      : Number(adjustment.adjustment_count) > 0 ? 'Adjusted' : 'Completed',
    items: items.map(item => ({
      productId: Number(item.product_id), name: item.name,
      quantity: Number(item.quantity), unitPrice: Number(item.unit_price), subtotal: Number(item.subtotal),
    })),
  };
}

// The same idempotency key must never silently authorize a DIFFERENT cart or payment.
// Comparison uses persisted rows rather than current product prices.
export function matchesPosReceipt(receipt, { items, paymentMethod, cashReceived, cardPaymentReference, pos }) {
  if (!receipt || !Array.isArray(items)) return false;
  const same = (a, b) => String(a ?? '').trim() === String(b ?? '').trim();
  const amount = (a) => Number(Number(a || 0).toFixed(2));
  const requested = new Map();
  for (const item of items) {
    const id = Number(item?.product?.id);
    const quantity = Number(item?.quantity);
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0) return false;
    requested.set(id, (requested.get(id) || 0) + quantity);
  }
  const existing = new Map();
  for (const item of receipt.items) existing.set(item.productId, (existing.get(item.productId) || 0) + item.quantity);
  if (existing.size !== requested.size || [...existing].some(([id, qty]) => requested.get(id) !== qty)) return false;
  if (!same(receipt.fulfillment, pos.fulfillment) || amount(receipt.deliveryFee) !== amount(pos.deliveryFee)
      || !same(receipt.customerName, pos.customerName)) return false;
  if (pos.fulfillment === 'delivery' && (!same(receipt.contactPerson, pos.contactPerson)
      || !same(receipt.contactNumber, pos.contactNumber)
      || !same(receipt.municipality, pos.municipality) || !same(receipt.barangay, pos.barangay)
      || !same(receipt.address, pos.address) || !same(receipt.landmark, pos.landmark))) return false;
  if (!same(String(receipt.paymentMethod).toLowerCase(), paymentMethod)) return false;
  if (paymentMethod === 'cash' && amount(receipt.cashReceived) !== amount(cashReceived)) return false;
  if (paymentMethod === 'card' && !same(receipt.cardPaymentReference, cardPaymentReference)) return false;
  return true;
}
