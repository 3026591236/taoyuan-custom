-- 桃源乡后端 MySQL 完整表结构
-- 所有数据相关的内容都放数据库
CREATE DATABASE IF NOT EXISTS taoyuan DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE taoyuan;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(16) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  role ENUM('admin','user') DEFAULT 'user',
  disabled TINYINT(1) DEFAULT 0,
  disabled_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_username (username)
) ENGINE=InnoDB;

-- 会话表
CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- 存档表 (每个用户每个槽位一条)
CREATE TABLE IF NOT EXISTS saves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  slot TINYINT NOT NULL DEFAULT 1,
  raw LONGTEXT COMMENT '完整存档JSON',
  meta_json JSON COMMENT '存档摘要: playerName/day/money等',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_slot (user_id, slot),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 签到表
CREATE TABLE IF NOT EXISTS checkins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  check_date DATE NOT NULL,
  reward INT DEFAULT 500,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_date (user_id, check_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 邮件表
CREATE TABLE IF NOT EXISTS mails (
  id VARCHAR(36) PRIMARY KEY,
  target VARCHAR(50) NOT NULL COMMENT 'all 或 user_id',
  title VARCHAR(80) NOT NULL,
  content TEXT,
  rewards JSON COMMENT '奖励列表 [{type,itemId,qty,quality}]',
  from_name VARCHAR(50) DEFAULT '系统',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 邮件领取记录
CREATE TABLE IF NOT EXISTS mail_claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mail_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_mail_user (mail_id, user_id),
  FOREIGN KEY (mail_id) REFERENCES mails(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 配置表 (key-value 存储所有可配置项)
CREATE TABLE IF NOT EXISTS config (
  `key` VARCHAR(100) PRIMARY KEY,
  `value` TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 世界公告
CREATE TABLE IF NOT EXISTS world_announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message VARCHAR(500) NOT NULL,
  type VARCHAR(20) DEFAULT 'breakthrough',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_time (created_at DESC)
) ENGINE=InnoDB;

-- 排行榜快照 (定时从存档计算, 减少查询压力)
CREATE TABLE IF NOT EXISTS leaderboard (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  username VARCHAR(16) NOT NULL,
  player_name VARCHAR(20) DEFAULT '无名',
  realm_name VARCHAR(20) DEFAULT '凡人',
  cultivation BIGINT DEFAULT 0,
  aura BIGINT DEFAULT 0,
  money BIGINT DEFAULT 0,
  game_year INT DEFAULT 1,
  game_season VARCHAR(10) DEFAULT '春',
  game_day INT DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user (user_id),
  INDEX idx_cultivation (cultivation DESC),
  INDEX idx_aura (aura DESC),
  INDEX idx_money (money DESC)
) ENGINE=InnoDB;

-- 突破记录 (用于世界公告和统计)
CREATE TABLE IF NOT EXISTS breakthrough_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  player_name VARCHAR(20),
  from_realm VARCHAR(20),
  to_realm VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
