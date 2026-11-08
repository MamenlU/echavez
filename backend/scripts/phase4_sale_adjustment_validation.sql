-- Rayjin Hardware Phase 4 post-migration validation — READ ONLY

SELECT DATABASE() AS selected_database;

SELECT COUNT(*) AS base_table_count
FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE';
-- Expected after Phase 4: 18

SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN ('sale_adjustments','sale_adjustment_items')
ORDER BY table_name;
-- Expected: 2 rows

SELECT column_name, column_type, is_nullable
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'inventory_movements'
  AND column_name = 'sale_adjustment_item_id';
-- Expected: BIGINT UNSIGNED, nullable

SELECT table_name, index_name, non_unique, column_name
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND (
    (table_name = 'sale_adjustments' AND index_name = 'uq_sale_adjustment_request') OR
    (table_name = 'sale_adjustment_items' AND index_name = 'uq_sale_adjustment_line') OR
    (table_name = 'inventory_movements' AND index_name = 'uq_inventory_sale_adjustment_item')
  )
ORDER BY table_name, index_name, seq_in_index;

SELECT constraint_name, table_name, referenced_table_name
FROM information_schema.referential_constraints
WHERE constraint_schema = DATABASE()
  AND constraint_name IN (
    'fk_sale_adjustments_sale',
    'fk_sale_adjustments_admin',
    'fk_sale_adjustment_items_adjustment',
    'fk_sale_adjustment_items_sale_item',
    'fk_sale_adjustment_items_product',
    'fk_inventory_sale_adjustment_item'
  )
ORDER BY constraint_name;

SELECT COUNT(*) AS adjustment_count FROM sale_adjustments;
SELECT COUNT(*) AS adjustment_item_count FROM sale_adjustment_items;
-- Immediately after migration, both may correctly be 0.
