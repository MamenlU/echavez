SELECT DATABASE() AS selected_database;

SELECT COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_type = 'BASE TABLE';

SHOW COLUMNS FROM purchase_orders;
SHOW COLUMNS FROM purchase_order_items;
SHOW COLUMNS FROM inventory_movements LIKE 'purchase_order_item_id';

SELECT index_name, non_unique, column_name
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND table_name IN ('purchase_orders', 'purchase_order_items', 'inventory_movements')
  AND index_name IN (
    'uq_purchase_orders_number',
    'uq_purchase_order_product',
    'idx_inventory_purchase_order_item'
  )
ORDER BY table_name, index_name, seq_in_index;

SELECT constraint_name, table_name, referenced_table_name
FROM information_schema.REFERENTIAL_CONSTRAINTS
WHERE constraint_schema = DATABASE()
  AND constraint_name IN (
    'fk_purchase_orders_supplier',
    'fk_purchase_order_items_order',
    'fk_purchase_order_items_product',
    'fk_inventory_purchase_order_item'
  )
ORDER BY constraint_name;

SELECT
  po.po_number,
  po.status,
  s.supplier_name,
  COALESCE(SUM(poi.ordered_quantity), 0) AS ordered_quantity,
  COALESCE(SUM(COALESCE(r.received_quantity, 0)), 0) AS received_quantity,
  COALESCE(SUM(GREATEST(poi.ordered_quantity - COALESCE(r.received_quantity, 0), 0)), 0) AS remaining_quantity
FROM purchase_orders po
JOIN suppliers s ON s.supplier_id = po.supplier_id
LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.purchase_order_id
LEFT JOIN (
  SELECT purchase_order_item_id, SUM(quantity) AS received_quantity
  FROM inventory_movements
  WHERE purchase_order_item_id IS NOT NULL
    AND movement_type = 'Stock-In'
  GROUP BY purchase_order_item_id
) r ON r.purchase_order_item_id = poi.purchase_order_item_id
GROUP BY po.purchase_order_id, po.po_number, po.status, s.supplier_name
ORDER BY po.created_at DESC;
