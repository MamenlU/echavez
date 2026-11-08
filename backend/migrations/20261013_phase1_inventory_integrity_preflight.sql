-- Rayjin Hardware — Phase 1 Inventory Integrity preflight
-- Run while echavez_web_demo is selected in phpMyAdmin BEFORE the Phase 1 migration.
-- Read-only: this script does not modify data or schema.

SELECT DATABASE() AS selected_database;

SELECT COUNT(*) AS current_table_count
FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE';

SELECT column_name, column_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'inventory_movements'
ORDER BY ordinal_position;

-- IMPORTANT: save/export these results. Rows returned here mean products.stock and the ledger differ.
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.stock AS product_stock,
  COALESCE(SUM(CASE
    WHEN im.movement_type = 'Stock-In' THEN im.quantity
    WHEN im.movement_type = 'Stock-Out' THEN -im.quantity
    ELSE 0
  END), 0) AS ledger_stock,
  p.stock - COALESCE(SUM(CASE
    WHEN im.movement_type = 'Stock-In' THEN im.quantity
    WHEN im.movement_type = 'Stock-Out' THEN -im.quantity
    ELSE 0
  END), 0) AS stock_difference
FROM products p
LEFT JOIN inventory_movements im ON im.product_id = p.id
GROUP BY p.id, p.name, p.stock
HAVING stock_difference <> 0
ORDER BY ABS(stock_difference) DESC, p.name;

-- Products with positive stock but no cost-bearing inventory history should be reviewed before adjustment.
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.stock,
  COUNT(im.movement_id) AS movement_rows,
  COALESCE(SUM(CASE
    WHEN im.movement_type = 'Stock-In' THEN im.quantity * im.supplier_price
    WHEN im.movement_type = 'Stock-Out' THEN -(im.quantity * im.supplier_price)
    ELSE 0
  END), 0) AS ledger_inventory_value
FROM products p
LEFT JOIN inventory_movements im ON im.product_id = p.id
GROUP BY p.id, p.name, p.stock
HAVING p.stock > 0 AND (movement_rows = 0 OR ledger_inventory_value <= 0)
ORDER BY p.name;
