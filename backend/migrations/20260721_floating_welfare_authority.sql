-- 悬浮福利服务端权威领取（候选迁移；审核后人工执行）
-- 仅持久化账号首次见到福利的服务端日期；asset_grants/asset_ledger 由前置候选迁移提供。
-- 可重复执行，不读取或改写既有玩家存档。

CREATE TABLE IF NOT EXISTS floating_welfare_users (
  user_id VARCHAR(36) NOT NULL,
  first_seen_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
