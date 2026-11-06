-- Use only if Phase 5 has not been used for real purchase orders/receipts and you intentionally want to return to the Phase 4 schema.
-- Back up the database first.

ALTER TABLE inventory_movements
  DROP FOREIGN KEY IF EXISTS fk_inventory_purchase_order_item;
DROP INDEX IF EXISTS idx_inventory_purchase_order_item ON inventory_movements;
ALTER TABLE inventory_movements
  DROP COLUMN IF EXISTS purchase_order_item_id;

DROP TABLE IF EXISTS purchase_order_items;
DROP TABLE IF EXISTS purchase_orders;
