-- 世界 Boss 专用贡献账本（候选迁移，禁止自动生产执行）
-- MySQL 8 / InnoDB；幂等、纯追加；不读取/回填/更新 saves，旧客户端字段仅供展示。
CREATE TABLE IF NOT EXISTS world_boss_contributions (
  user_id VARCHAR(36) NOT NULL,
  character_id VARCHAR(36) NOT NULL,
  slot TINYINT NOT NULL,
  route VARCHAR(32) NOT NULL,
  cycle_key VARCHAR(48) NOT NULL,
  contribution BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, character_id, slot, route, cycle_key),
  KEY idx_wbc_cycle_route (cycle_key, route, contribution)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS world_boss_encounter_tickets (
  id CHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  character_id VARCHAR(36) NOT NULL,
  slot TINYINT NOT NULL,
  route VARCHAR(32) NOT NULL,
  encounter_type VARCHAR(48) NOT NULL,
  contribution SMALLINT UNSIGNED NOT NULL,
  issued_by VARCHAR(48) NOT NULL COMMENT '仅可信服务端观测器；禁止客户端自报分值',
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_wbet_owner (user_id, character_id, slot, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS world_boss_contribution_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id VARCHAR(96) NOT NULL,
  source VARCHAR(48) NOT NULL,
  ticket_id CHAR(36) NULL,
  user_id VARCHAR(36) NOT NULL,
  character_id VARCHAR(36) NOT NULL,
  slot TINYINT NOT NULL,
  route VARCHAR(32) NOT NULL,
  cycle_key VARCHAR(48) NOT NULL,
  contribution SMALLINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_wbce_event_source (event_id, source),
  UNIQUE KEY uk_wbce_ticket (ticket_id),
  KEY idx_wbce_owner_cycle (user_id, character_id, slot, route, cycle_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO authority_config (config_key, config_value) VALUES
  ('world_boss_contribution_mode', 'disabled');
-- 上线顺序：先迁移与可信战斗观测器，再人工改为 server_observed。缺任一项 claim-tier 维护中/fail closed。
