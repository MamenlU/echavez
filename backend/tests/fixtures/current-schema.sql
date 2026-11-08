-- Rayjin Hardware Final Database Structure
-- Schema-only structure aligned with the current working system.
-- Import this file into the intended Rayjin Hardware database.
-- No customer, order, payment, sales, inventory, or test/demo data is included.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- =========================================================
-- TABLE STRUCTURES
-- =========================================================


CREATE TABLE `audit_logs` (
  `audit_id` bigint(20) UNSIGNED NOT NULL,
  `admin_id` int(11) NOT NULL,
  `action` varchar(80) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` varchar(100) DEFAULT NULL,
  `summary` varchar(255) NOT NULL,
  `before_data` longtext DEFAULT NULL,
  `after_data` longtext DEFAULT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `delivery_rates` (
  `id` int(11) NOT NULL,
  `municipality` varchar(100) NOT NULL,
  `barangay` varchar(100) NOT NULL,
  `zone` enum('poblacion','near','medium','far') NOT NULL,
  `surcharge` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `inventory_movements` (
  `movement_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `sale_id` int(11) DEFAULT NULL,
  `movement_type` enum('Stock-In','Stock-Out') NOT NULL,
  `movement_reason` varchar(50) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `supplier_price` decimal(10,2) NOT NULL,
  `selling_price` decimal(10,2) NOT NULL,
  `movement_date` datetime NOT NULL DEFAULT current_timestamp(),
  `remarks` text DEFAULT NULL,
  `receipt_path` mediumtext DEFAULT NULL,
  `supplier_reference` varchar(120) DEFAULT NULL,
  `receiving_request_id` varchar(64) DEFAULT NULL,
  `adjustment_request_id` varchar(64) DEFAULT NULL,
  `sale_adjustment_item_id` bigint(20) UNSIGNED DEFAULT NULL,
  `purchase_order_item_id` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `orders` (
  `id` varchar(50) NOT NULL,
  `user_id` int(11) NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `original_subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `service_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `fulfillment` enum('pickup','delivery','shop_go') NOT NULL,
  `payment_method` enum('paymongo','cash','card','gcash') NOT NULL,
  `payment_status` enum('Pending','Paid','Failed','Cancelled') DEFAULT 'Pending',
  `status` enum('pending','awaiting_payment','approved','processing','ready','out_for_delivery','failed_delivery','deactivated','completed','cancelled','rejected') NOT NULL DEFAULT 'pending',
  `previous_status` varchar(30) DEFAULT NULL,
  `paymongo_link_id` varchar(100) DEFAULT NULL,
  `requested_pickup_date` date DEFAULT NULL,
  `requested_pickup_time` time DEFAULT NULL,
  `scheduled_pickup_date` date DEFAULT NULL,
  `scheduled_pickup_time` time DEFAULT NULL,
  `admin_message` varchar(500) DEFAULT NULL,
  `delivery_contact_person` varchar(100) DEFAULT NULL,
  `delivery_contact_number` varchar(20) DEFAULT NULL,
  `delivery_municipality` varchar(100) DEFAULT NULL,
  `delivery_barangay` varchar(100) DEFAULT NULL,
  `delivery_address` text DEFAULT NULL,
  `delivery_landmark` varchar(255) DEFAULT NULL,
  `delivery_instructions` text DEFAULT NULL,
  `delivery_fee` decimal(10,2) DEFAULT NULL,
  `delivery_load_class` enum('light','standard','bulky') DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `completed_at` datetime DEFAULT NULL,
  `delivery_latitude` decimal(10,7) DEFAULT NULL,
  `delivery_longitude` decimal(10,7) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` varchar(50) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `order_status_history` (
  `history_id` bigint(20) UNSIGNED NOT NULL,
  `order_id` varchar(50) NOT NULL,
  `from_status` varchar(30) DEFAULT NULL,
  `to_status` varchar(30) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `note` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `password_reset_tokens` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `payments` (
  `payment_id` int(11) NOT NULL,
  `order_id` varchar(50) NOT NULL,
  `payment_provider` varchar(100) NOT NULL,
  `gateway_session_id` varchar(100) NOT NULL,
  `gateway_transaction_id` varchar(100) DEFAULT NULL,
  `payment_method` varchar(30) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'PHP',
  `payment_status` enum('Pending','Paid','Failed','Cancelled') NOT NULL DEFAULT 'Pending',
  `livemode` tinyint(1) NOT NULL,
  `checkout_url` varchar(2048) DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `payment_date` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `unit` varchar(50) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `category` varchar(100) NOT NULL,
  `category_id` int(11) NOT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `image` varchar(255) NOT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `reorder_level` int(11) NOT NULL,
  `brand` varchar(100) NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `delivery_class` enum('light','standard','bulky') NOT NULL DEFAULT 'standard',
  `bulk_quantity_threshold` int(11) DEFAULT NULL,
  `fulfillment_rule` enum('all','delivery_only') NOT NULL DEFAULT 'all',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `sales` (
  `sale_id` int(11) NOT NULL,
  `order_id` varchar(50) DEFAULT NULL,
  `pos_request_id` varchar(64) DEFAULT NULL,
  `admin_id` int(11) NOT NULL,
  `shift_id` bigint(20) UNSIGNED DEFAULT NULL,
  `sales_source` enum('Online Order','Onsite POS') NOT NULL,
  `fulfillment` enum('pickup','delivery') DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `delivery_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `customer_name` varchar(150) DEFAULT NULL,
  `delivery_contact_person` varchar(150) DEFAULT NULL,
  `delivery_contact_number` varchar(30) DEFAULT NULL,
  `delivery_municipality` varchar(100) DEFAULT NULL,
  `delivery_barangay` varchar(100) DEFAULT NULL,
  `delivery_address` text DEFAULT NULL,
  `delivery_landmark` varchar(255) DEFAULT NULL,
  `payment_status` enum('Paid','Cancelled') NOT NULL,
  `payment_method` varchar(30) DEFAULT NULL,
  `cash_received` decimal(10,2) DEFAULT NULL,
  `change_amount` decimal(10,2) DEFAULT NULL,
  `card_payment_reference` varchar(80) DEFAULT NULL,
  `sale_date` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `sale_items` (
  `sale_item_id` int(11) NOT NULL,
  `sale_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `sale_adjustments` (
  `adjustment_id` bigint(20) UNSIGNED NOT NULL,
  `sale_id` int(11) NOT NULL,
  `adjustment_type` enum('Return','Void') NOT NULL,
  `reason` varchar(500) NOT NULL,
  `merchandise_refund_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `service_fee_refund_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `delivery_fee_refund_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_refund_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `refund_method` enum('Cash','Card','GCash','PayMongo','Other') NOT NULL,
  `refund_reference` varchar(150) DEFAULT NULL,
  `external_refund_confirmed` tinyint(1) NOT NULL DEFAULT 0,
  `processed_by_admin_id` int(11) NOT NULL,
  `shift_id` bigint(20) UNSIGNED DEFAULT NULL,
  `adjustment_request_id` varchar(64) NOT NULL,
  `processed_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `sale_adjustment_items` (
  `adjustment_item_id` bigint(20) UNSIGNED NOT NULL,
  `adjustment_id` bigint(20) UNSIGNED NOT NULL,
  `sale_item_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_refund_amount` decimal(12,2) NOT NULL,
  `refund_subtotal` decimal(12,2) NOT NULL,
  `unit_cost` decimal(12,2) NOT NULL,
  `restockable` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `purchase_orders` (
  `purchase_order_id` bigint(20) UNSIGNED NOT NULL,
  `po_number` varchar(40) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `status` enum('Draft','Ordered','Partially Received','Received','Cancelled') NOT NULL DEFAULT 'Draft',
  `expected_delivery_date` date DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `created_by_admin_id` int(11) NOT NULL,
  `ordered_by_admin_id` int(11) DEFAULT NULL,
  `cancelled_by_admin_id` int(11) DEFAULT NULL,
  `ordered_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `purchase_order_items` (
  `purchase_order_item_id` bigint(20) UNSIGNED NOT NULL,
  `purchase_order_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` int(11) NOT NULL,
  `ordered_quantity` int(11) NOT NULL,
  `expected_unit_cost` decimal(12,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `cashier_shifts` (
  `shift_id` bigint(20) UNSIGNED NOT NULL,
  `admin_id` int(11) NOT NULL,
  `opening_cash` decimal(12,2) NOT NULL,
  `status` enum('Open','Closed') NOT NULL DEFAULT 'Open',
  `opened_at` datetime NOT NULL DEFAULT current_timestamp(),
  `closed_at` datetime DEFAULT NULL,
  `pos_transaction_count` int(10) UNSIGNED DEFAULT NULL,
  `cash_sales_amount` decimal(12,2) DEFAULT NULL,
  `card_sales_amount` decimal(12,2) DEFAULT NULL,
  `cash_refunds_amount` decimal(12,2) DEFAULT NULL,
  `cash_expenses_amount` decimal(12,2) DEFAULT NULL,
  `expected_cash` decimal(12,2) DEFAULT NULL,
  `actual_cash` decimal(12,2) DEFAULT NULL,
  `discrepancy` decimal(12,2) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `expenses` (
  `expense_id` bigint(20) UNSIGNED NOT NULL,
  `expense_date` date NOT NULL,
  `category` varchar(50) NOT NULL,
  `description` varchar(255) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_method` enum('Cash Drawer','Card','GCash','Bank Transfer','Other') NOT NULL,
  `reference_number` varchar(150) DEFAULT NULL,
  `recorded_by_admin_id` int(11) NOT NULL,
  `shift_id` bigint(20) UNSIGNED DEFAULT NULL,
  `status` enum('Recorded','Voided') NOT NULL DEFAULT 'Recorded',
  `voided_by_admin_id` int(11) DEFAULT NULL,
  `void_reason` varchar(500) DEFAULT NULL,
  `voided_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `suppliers` (
  `supplier_id` int(11) NOT NULL,
  `supplier_name` varchar(100) NOT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `lead_time_days` smallint(5) UNSIGNED DEFAULT NULL,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `role` enum('customer','admin') NOT NULL DEFAULT 'customer',
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `supporting_address` text DEFAULT NULL,
  `google_id` varchar(255) DEFAULT NULL,
  `avatar_url` varchar(512) DEFAULT NULL,
  `status` enum('active','inactive','banned') NOT NULL DEFAULT 'active',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `first_order_discount_used` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `conversations` (
  `conversation_id` bigint(20) UNSIGNED NOT NULL,
  `customer_id` int(11) NOT NULL,
  `conversation_type` enum('general','order') NOT NULL,
  `order_id` varchar(50) DEFAULT NULL,
  `subject` varchar(150) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `conversation_messages` (
  `message_id` bigint(20) UNSIGNED NOT NULL,
  `conversation_id` bigint(20) UNSIGNED NOT NULL,
  `sender_id` int(11) DEFAULT NULL,
  `sender_type` enum('customer','admin','system') NOT NULL,
  `message` text NOT NULL,
  `read_at` datetime DEFAULT NULL,
  `event_key` varchar(190) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================================================
-- INDEXES AND UNIQUE KEYS
-- =========================================================


ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`audit_id`),
  ADD KEY `idx_audit_admin_created` (`admin_id`,`created_at`),
  ADD KEY `idx_audit_entity_created` (`entity_type`,`entity_id`,`created_at`),
  ADD KEY `idx_audit_action_created` (`action`,`created_at`);

ALTER TABLE `categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `uq_category_name` (`category_name`);

ALTER TABLE `delivery_rates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_municipality_barangay` (`municipality`,`barangay`);

ALTER TABLE `inventory_movements`
  ADD PRIMARY KEY (`movement_id`),
  ADD UNIQUE KEY `uq_inventory_receiving_request` (`receiving_request_id`),
  ADD UNIQUE KEY `uq_inventory_adjustment_request` (`adjustment_request_id`),
  ADD UNIQUE KEY `uq_inventory_sale_adjustment_item` (`sale_adjustment_item_id`),
  ADD KEY `idx_inventory_purchase_order_item` (`purchase_order_item_id`),
  ADD KEY `fk_inventory_product` (`product_id`),
  ADD KEY `fk_inventory_admin` (`admin_id`),
  ADD KEY `fk_inventory_supplier` (`supplier_id`),
  ADD KEY `fk_inventory_sale` (`sale_id`);

ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `product_id` (`product_id`);

ALTER TABLE `order_status_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `idx_order_status_history_order` (`order_id`,`created_at`),
  ADD KEY `fk_order_status_history_admin` (`admin_id`);

ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token_hash` (`token_hash`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `expires_at` (`expires_at`);

ALTER TABLE `payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD UNIQUE KEY `uq_payment_session` (`gateway_session_id`),
  ADD UNIQUE KEY `uq_payment_transaction` (`gateway_transaction_id`),
  ADD KEY `idx_payments_order` (`order_id`);

ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_products_barcode` (`barcode`),
  ADD KEY `fk_products_category` (`category_id`),
  ADD KEY `fk_products_supplier` (`supplier_id`);

ALTER TABLE `sales`
  ADD PRIMARY KEY (`sale_id`),
  ADD UNIQUE KEY `uq_sales_order_id` (`order_id`),
  ADD UNIQUE KEY `uq_sales_pos_request_id` (`pos_request_id`),
  ADD KEY `idx_sales_shift_id` (`shift_id`),
  ADD KEY `fk_sales_admin` (`admin_id`);

ALTER TABLE `sale_items`
  ADD PRIMARY KEY (`sale_item_id`),
  ADD KEY `fk_sale_items_sale` (`sale_id`),
  ADD KEY `fk_sale_items_product` (`product_id`);


ALTER TABLE `sale_adjustments`
  ADD PRIMARY KEY (`adjustment_id`),
  ADD UNIQUE KEY `uq_sale_adjustment_request` (`adjustment_request_id`),
  ADD KEY `idx_sale_adjustments_sale_processed` (`sale_id`,`processed_at`),
  ADD KEY `idx_sale_adjustments_admin_processed` (`processed_by_admin_id`,`processed_at`),
  ADD KEY `idx_sale_adjustments_shift_id` (`shift_id`),
  ADD KEY `idx_sale_adjustments_type_processed` (`adjustment_type`,`processed_at`);

ALTER TABLE `sale_adjustment_items`
  ADD PRIMARY KEY (`adjustment_item_id`),
  ADD UNIQUE KEY `uq_sale_adjustment_line` (`adjustment_id`,`sale_item_id`),
  ADD KEY `idx_sale_adjustment_items_sale_item` (`sale_item_id`),
  ADD KEY `idx_sale_adjustment_items_product` (`product_id`);

ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`purchase_order_id`),
  ADD UNIQUE KEY `uq_purchase_orders_number` (`po_number`),
  ADD KEY `idx_purchase_orders_supplier_status` (`supplier_id`,`status`),
  ADD KEY `idx_purchase_orders_status_created` (`status`,`created_at`),
  ADD KEY `idx_purchase_orders_created_by` (`created_by_admin_id`),
  ADD KEY `idx_purchase_orders_ordered_by` (`ordered_by_admin_id`),
  ADD KEY `idx_purchase_orders_cancelled_by` (`cancelled_by_admin_id`);

ALTER TABLE `purchase_order_items`
  ADD PRIMARY KEY (`purchase_order_item_id`),
  ADD UNIQUE KEY `uq_purchase_order_product` (`purchase_order_id`,`product_id`),
  ADD KEY `idx_purchase_order_items_product` (`product_id`);

ALTER TABLE `cashier_shifts`
  ADD PRIMARY KEY (`shift_id`),
  ADD KEY `idx_cashier_shifts_admin_status` (`admin_id`,`status`,`opened_at`),
  ADD KEY `idx_cashier_shifts_opened_at` (`opened_at`);

ALTER TABLE `expenses`
  ADD PRIMARY KEY (`expense_id`),
  ADD KEY `idx_expenses_date_status` (`expense_date`,`status`),
  ADD KEY `idx_expenses_category_date` (`category`,`expense_date`),
  ADD KEY `idx_expenses_recorded_by` (`recorded_by_admin_id`,`created_at`),
  ADD KEY `idx_expenses_shift_id` (`shift_id`),
  ADD KEY `idx_expenses_voided_by` (`voided_by_admin_id`);

ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`supplier_id`),
  ADD UNIQUE KEY `uq_supplier_name` (`supplier_name`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `google_id` (`google_id`);

ALTER TABLE `conversations`
  ADD PRIMARY KEY (`conversation_id`),
  ADD UNIQUE KEY `uq_conversations_order` (`order_id`),
  ADD KEY `idx_conversations_customer_updated` (`customer_id`,`updated_at`),
  ADD KEY `idx_conversations_type_updated` (`conversation_type`,`updated_at`);

ALTER TABLE `conversation_messages`
  ADD PRIMARY KEY (`message_id`),
  ADD UNIQUE KEY `uq_conversation_messages_event_key` (`event_key`),
  ADD KEY `idx_conversation_messages_conversation_created` (`conversation_id`,`created_at`,`message_id`),
  ADD KEY `idx_conversation_messages_unread` (`conversation_id`,`read_at`),
  ADD KEY `fk_conversation_messages_sender` (`sender_id`);

-- =========================================================
-- AUTO_INCREMENT COLUMNS
-- =========================================================


ALTER TABLE `audit_logs`
  MODIFY `audit_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `delivery_rates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `inventory_movements`
  MODIFY `movement_id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `order_status_history`
  MODIFY `history_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `payments`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `sales`
  MODIFY `sale_id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `sale_items`
  MODIFY `sale_item_id` int(11) NOT NULL AUTO_INCREMENT;


ALTER TABLE `sale_adjustments`
  MODIFY `adjustment_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sale_adjustment_items`
  MODIFY `adjustment_item_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `purchase_orders`
  MODIFY `purchase_order_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `purchase_order_items`
  MODIFY `purchase_order_item_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `cashier_shifts`
  MODIFY `shift_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `expenses`
  MODIFY `expense_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `suppliers`
  MODIFY `supplier_id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `conversations`
  MODIFY `conversation_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `conversation_messages`
  MODIFY `message_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

-- =========================================================
-- FOREIGN KEY CONSTRAINTS
-- =========================================================


ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE;

ALTER TABLE `inventory_movements`
  ADD CONSTRAINT `fk_inventory_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_inventory_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_inventory_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`sale_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_inventory_sale_adjustment_item` FOREIGN KEY (`sale_adjustment_item_id`) REFERENCES `sale_adjustment_items` (`adjustment_item_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_inventory_purchase_order_item` FOREIGN KEY (`purchase_order_item_id`) REFERENCES `purchase_order_items` (`purchase_order_item_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_inventory_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

ALTER TABLE `order_status_history`
  ADD CONSTRAINT `fk_order_status_history_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_order_status_history_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`);

ALTER TABLE `password_reset_tokens`
  ADD CONSTRAINT `fk_password_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON UPDATE CASCADE;

ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_products_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `sales`
  ADD CONSTRAINT `fk_sales_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sales_cashier_shift` FOREIGN KEY (`shift_id`) REFERENCES `cashier_shifts` (`shift_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sales_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `sale_items`
  ADD CONSTRAINT `fk_sale_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sale_items_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`sale_id`) ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE `sale_adjustments`
  ADD CONSTRAINT `fk_sale_adjustments_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`sale_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sale_adjustments_admin` FOREIGN KEY (`processed_by_admin_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sale_adjustments_cashier_shift` FOREIGN KEY (`shift_id`) REFERENCES `cashier_shifts` (`shift_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `sale_adjustment_items`
  ADD CONSTRAINT `fk_sale_adjustment_items_adjustment` FOREIGN KEY (`adjustment_id`) REFERENCES `sale_adjustments` (`adjustment_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sale_adjustment_items_sale_item` FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items` (`sale_item_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sale_adjustment_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE;

ALTER TABLE `cashier_shifts`
  ADD CONSTRAINT `fk_cashier_shifts_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE;

ALTER TABLE `expenses`
  ADD CONSTRAINT `fk_expenses_recorded_by` FOREIGN KEY (`recorded_by_admin_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_expenses_voided_by` FOREIGN KEY (`voided_by_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_expenses_cashier_shift` FOREIGN KEY (`shift_id`) REFERENCES `cashier_shifts` (`shift_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `fk_purchase_orders_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_orders_created_by` FOREIGN KEY (`created_by_admin_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_orders_ordered_by` FOREIGN KEY (`ordered_by_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_orders_cancelled_by` FOREIGN KEY (`cancelled_by_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `purchase_order_items`
  ADD CONSTRAINT `fk_purchase_order_items_order` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`purchase_order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_purchase_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE;

ALTER TABLE `conversations`
  ADD CONSTRAINT `fk_conversations_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_conversations_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`);

ALTER TABLE `conversation_messages`
  ADD CONSTRAINT `fk_conversation_messages_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`conversation_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_conversation_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

