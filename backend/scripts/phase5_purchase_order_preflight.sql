SELECT DATABASE() AS selected_database;

SELECT COUNT(*) AS current_table_count
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_type = 'BASE TABLE';

SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN ('purchase_orders', 'purchase_order_items');

SELECT column_name
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'inventory_movements'
  AND column_name = 'purchase_order_item_id';
