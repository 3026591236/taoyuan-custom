-- 万象仙乡：服务端权威资产 Phase 1 + Phase 2（候选迁移；审核后人工执行）
-- MySQL 8.0 / InnoDB。可重复执行；只新增资产基线/授权/账本结构，不更新 saves，
-- 不回填、不追溯、不回滚既有玩家资产。邮件、签到、悬浮福利与受保护
-- 道具使用均写入 asset_ledger；user_mails.grant_id 仅用于邮件关联。

CREATE TABLE IF NOT EXISTS asset_baselines (
  user_id VARCHAR(36) NOT NULL,
  character_id VARCHAR(36) NOT NULL,
  slot TINYINT NOT NULL,
  schema_version INT NOT NULL DEFAULT 1,
  save_hash CHAR(64) NOT NULL,
  assets_json LONGTEXT NOT NULL,
  established_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, slot),
  UNIQUE KEY uk_asset_baseline_character (character_id),
  KEY idx_asset_baseline_user_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asset_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id VARCHAR(36) NOT NULL,
  character_id VARCHAR(36) NOT NULL,
  slot TINYINT NOT NULL,
  idempotency_key VARCHAR(96) NOT NULL,
  event_type VARCHAR(48) NOT NULL,
  source_type VARCHAR(48) NOT NULL,
  source_id VARCHAR(96) NULL,
  delta_json LONGTEXT NOT NULL,
  before_hash CHAR(64) NULL,
  after_hash CHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_asset_ledger_idempotency (user_id, idempotency_key),
  KEY idx_asset_ledger_character_time (character_id, created_at),
  KEY idx_asset_ledger_source (source_type, source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asset_grants (
  id CHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  character_id VARCHAR(36) NOT NULL,
  slot TINYINT NOT NULL,
  grant_type VARCHAR(48) NOT NULL,
  source_type VARCHAR(48) NOT NULL,
  source_id VARCHAR(96) NOT NULL,
  payload_json LONGTEXT NOT NULL,
  state ENUM('issued','consumed','void') NOT NULL DEFAULT 'issued',
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  consumed_at DATETIME NULL,
  expires_at DATETIME NULL,
  PRIMARY KEY (id),
  -- A logical reward source belongs to the account once; retries may not
  -- rebind the same source to another character slot.
  UNIQUE KEY uk_asset_grant_source (user_id, source_type, source_id),
  KEY idx_asset_grant_pending (user_id, character_id, slot, state, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS authority_config (
  config_key VARCHAR(64) NOT NULL,
  config_value VARCHAR(255) NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO authority_config (config_key, config_value) VALUES
  ('asset_authority_mode', 'baseline_only'),
  ('asset_catalog_version', '1'),
  ('new_character_template_version', '1');

-- 执行顺序：先运行本文件，再运行 consumable_use_receipts、floating_welfare
-- 与 world_boss_contribution 候选迁移。world_boss_contribution_mode 保持 disabled，
-- 直到可信战斗观测器上线后才可人工改为 server_observed。

-- MySQL 8 没有可跨小版本依赖的 ADD COLUMN/INDEX IF NOT EXISTS，使用
-- information_schema + dynamic SQL，确保重复执行不会报 duplicate column/key。
SET @aa_schema := DATABASE();
SET @aa_sql := IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @aa_schema AND TABLE_NAME = 'user_mails'
      AND COLUMN_NAME = 'grant_id'
  ),
  'DO 0',
  'ALTER TABLE user_mails ADD COLUMN grant_id CHAR(36) NULL'
);
PREPARE aa_stmt FROM @aa_sql;
EXECUTE aa_stmt;
DEALLOCATE PREPARE aa_stmt;

SET @aa_sql := IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @aa_schema AND TABLE_NAME = 'user_mails'
      AND INDEX_NAME = 'idx_user_mails_grant'
  ),
  'DO 0',
  'ALTER TABLE user_mails ADD INDEX idx_user_mails_grant (grant_id)'
);
PREPARE aa_stmt FROM @aa_sql;
EXECUTE aa_stmt;
DEALLOCATE PREPARE aa_stmt;
