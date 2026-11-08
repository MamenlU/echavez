SELECT DATABASE() AS current_database;

SELECT COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_type = 'BASE TABLE';

SELECT column_name, column_type, is_nullable
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'suppliers'
  AND column_name = 'lead_time_days';

SELECT supplier_id, supplier_name, lead_time_days, status
FROM suppliers
ORDER BY supplier_name;

-- Outstanding purchase-order quantities by product.
SELECT
  poi.product_id,
  p.name AS product_name,
  SUM(GREATEST(poi.ordered_quantity - COALESCE(receipts.received_quantity, 0), 0)) AS outstanding_po_quantity
FROM purchase_order_items poi
INNER JOIN purchase_orders po
  ON po.purchase_order_id = poi.purchase_order_id
 AND po.status IN ('Ordered', 'Partially Received')
INNER JOIN products p ON p.id = poi.product_id
LEFT JOIN (
  SELECT purchase_order_item_id, SUM(quantity) AS received_quantity
  FROM inventory_movements
  WHERE purchase_order_item_id IS NOT NULL
    AND movement_type = 'Stock-In'
  GROUP BY purchase_order_item_id
) receipts ON receipts.purchase_order_item_id = poi.purchase_order_item_id
GROUP BY poi.product_id, p.name
ORDER BY p.name;

-- Net units sold in the last 30 days after recorded returns/voids.
SELECT
  si.product_id,
  p.name AS product_name,
  SUM(GREATEST(si.quantity - COALESCE(returned.returned_quantity, 0), 0)) AS net_units_sold_30d
FROM sale_items si
INNER JOIN sales sale
  ON sale.sale_id = si.sale_id
 AND sale.payment_status = 'Paid'
 AND sale.sale_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
INNER JOIN products p ON p.id = si.product_id
LEFT JOIN (
  SELECT sale_item_id, SUM(quantity) AS returned_quantity
  FROM sale_adjustment_items
  GROUP BY sale_item_id
) returned ON returned.sale_item_id = si.sale_item_id
GROUP BY si.product_id, p.name
ORDER BY p.name;
