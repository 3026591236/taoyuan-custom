-- V3.3.16 account profile / idempotent rename support. Safe to re-run.
ALTER TABLE characters ADD COLUMN IF NOT EXISTS avatar_id VARCHAR(32) NOT NULL DEFAULT 'bamboo_scholar' AFTER gender;
CREATE TABLE IF NOT EXISTS character_rename_receipts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  request_id VARCHAR(80) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  character_id VARCHAR(36) NOT NULL,
  old_name VARCHAR(20) NOT NULL,
  new_name VARCHAR(20) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_rename_user_request (user_id, request_id),
  INDEX idx_rename_character_time (character_id, created_at),
  CONSTRAINT fk_rename_receipt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rename_receipt_character FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
