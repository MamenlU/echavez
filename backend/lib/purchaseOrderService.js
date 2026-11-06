export async function getPurchaseOrderProgress(db, purchaseOrderId) {
  const [rows] = await db.query(
    `SELECT
       po.purchase_order_id,
       po.po_number,
       po.status,
       COALESCE(SUM(poi.ordered_quantity), 0) AS ordered_quantity,
       COALESCE(SUM(COALESCE(receipts.received_quantity, 0)), 0) AS received_quantity,
       COALESCE(SUM(GREATEST(poi.ordered_quantity - COALESCE(receipts.received_quantity, 0), 0)), 0) AS remaining_quantity
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
       ON receipts.purchase_order_item_id = poi.purchase_order_item_id
     WHERE po.purchase_order_id = ?
     GROUP BY po.purchase_order_id, po.po_number, po.status`,
    [purchaseOrderId]
  );

  return rows[0] || null;
}

export async function syncPurchaseOrderStatus(db, purchaseOrderId) {
  const progress = await getPurchaseOrderProgress(db, purchaseOrderId);
  if (!progress) return null;

  const currentStatus = String(progress.status || '');
  if (currentStatus === 'Draft' || currentStatus === 'Cancelled') {
    return { ...progress, previous_status: currentStatus, status: currentStatus };
  }

  const ordered = Number(progress.ordered_quantity || 0);
  const received = Number(progress.received_quantity || 0);

  let nextStatus = 'Ordered';
  if (ordered > 0 && received >= ordered) nextStatus = 'Received';
  else if (received > 0) nextStatus = 'Partially Received';

  if (nextStatus !== currentStatus) {
    await db.query(
      `UPDATE purchase_orders
       SET status = ?, updated_at = NOW()
       WHERE purchase_order_id = ?`,
      [nextStatus, purchaseOrderId]
    );
  }

  return {
    ...progress,
    previous_status: currentStatus,
    status: nextStatus,
  };
}
