-- Candidate migration only. Do not apply automatically in production.
-- Prerequisite: run 20260721_asset_authority_phase1_phase2.sql first so the
-- protected-use transaction can append its immutable asset_ledger entry.
-- Microsecond save versions prevent two different idempotency keys accepted in
-- the same second from observing the same optimistic-lock version.
ALTER TABLE saves MODIFY updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6);

CREATE TABLE IF NOT EXISTS consumable_use_receipts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  character_id VARCHAR(36) NOT NULL,
  slot TINYINT NOT NULL,
  item_id VARCHAR(80) NOT NULL,
  quantity INT NOT NULL,
  idempotency_key VARCHAR(96) NOT NULL,
  old_save_updated_at DATETIME(6) NOT NULL,
  before_hash CHAR(64) NOT NULL,
  after_hash CHAR(64) NOT NULL,
  expected_effect_json LONGTEXT NOT NULL,
  result_raw LONGTEXT NOT NULL,
  result_data_json LONGTEXT NOT NULL,
  state ENUM('issued','consumed') NOT NULL DEFAULT 'issued',
  issued_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  consumed_at DATETIME(6) NULL,
  UNIQUE KEY uk_consumable_use_idempotency (user_id, idempotency_key),
  INDEX idx_consumable_receipt_character (user_id, character_id, slot, state),
  CONSTRAINT fk_consumable_receipt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_consumable_receipt_character FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
