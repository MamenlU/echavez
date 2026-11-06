-- Rayjin Hardware Phase 4 preflight — READ ONLY
-- Run in phpMyAdmin with echavez_web_demo selected BEFORE the migration.

SELECT DATABASE() AS selected_database;

SELECT COUNT(*) AS existing_table_count
FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE';
-- Expected Phase 3 baseline: 16

SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN ('sales','sale_items','inventory_movements','audit_logs','payments','orders')
ORDER BY table_name;

SELECT table_name AS unexpected_phase4_table
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN ('sale_adjustments','sale_adjustment_items');
-- Expected before Phase 4: 0 rows

SELECT column_name, column_type
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'sales'
  AND column_name IN ('sale_id','order_id','payment_status','payment_method','total_amount','delivery_fee','sale_date')
ORDER BY ordinal_position;

SELECT column_name, column_type
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'inventory_movements'
  AND column_name IN ('movement_id','product_id','sale_id','movement_type','movement_reason','quantity','supplier_price','selling_price','adjustment_request_id')
ORDER BY ordinal_position;
