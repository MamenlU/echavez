-- Rayjin Hardware Capstone 2
-- Phase 3: Centralized Audit Logging
-- Additive migration only. Existing business tables and data are preserved.

CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id INT(11) NOT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) DEFAULT NULL,
  summary VARCHAR(255) NOT NULL,
  before_data LONGTEXT DEFAULT NULL,
  after_data LONGTEXT DEFAULT NULL,
  reason VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (audit_id),
  KEY idx_audit_admin_created (admin_id, created_at),
  KEY idx_audit_entity_created (entity_type, entity_id, created_at),
  KEY idx_audit_action_created (action, created_at),
  CONSTRAINT fk_audit_admin
    FOREIGN KEY (admin_id) REFERENCES users(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
