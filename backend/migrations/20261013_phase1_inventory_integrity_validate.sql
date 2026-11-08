-- Rayjin Hardware — Phase 1 post-migration validation
-- Read-only validation. Run after the migration and again after your live Phase 1 tests.

SELECT DATABASE() AS selected_database;

SELECT COUNT(*) AS current_table_count
FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE';

SELECT column_name, column_type, is_nullable
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'inventory_movements'
  AND column_name IN ('movement_reason', 'adjustment_request_id')
ORDER BY column_name;

SELECT index_name, non_unique, column_name
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND table_name = 'inventory_movements'
  AND index_name = 'uq_inventory_adjustment_request';

-- There should be no duplicate non-null adjustment request IDs.
SELECT adjustment_request_id, COUNT(*) AS duplicate_count
FROM inventory_movements
WHERE adjustment_request_id IS NOT NULL
GROUP BY adjustment_request_id
HAVING COUNT(*) > 1;

-- Inventory balance reconciliation. After correcting known legacy discrepancies,
-- this should ideally return zero rows.
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
