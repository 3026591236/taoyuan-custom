import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v4 as uuidv4 } from "uuid";
import {
  inspectSaveProgression,
  absoluteGameDay,
} from "./save-progression.mjs";
import { validateSavePayload } from "./lib/save-payload.mjs";
import {
  matchIssuedMailGrants,
  parseGrantRows,
  resolveMailClaimCharacter,
} from "./lib/mail-grants.mjs";
import {
  issueSourceGrant,
  resolveRewardCharacter,
} from "./lib/reward-grants.mjs";
import {
  floatingWelfareConfigVersion,
  floatingWelfareSourceId,
  resolveWelfarePeriod,
  welfareResetForGift,
} from "./lib/floating-welfare.mjs";
import {
  DEFAULT_ASSET_AUTHORITY_MODE,
  persistAssetBaseline,
} from "./lib/asset-authority.mjs";
import {
  resolveWorldBossTierClaim,
  WORLD_BOSS_TIER_ROUTES,
} from "./lib/world-boss-tier-rewards.mjs";
import {
  contributionCycle,
  contributionFeatureEnabled,
  WORLD_BOSS_CONTRIBUTION_MODE_KEY,
} from "./lib/world-boss-contributions.mjs";
import {
  applyProtectedConsumable,
  encryptSave,
  PROTECTED_CONSUMABLES,
} from "./lib/consumable-use.mjs";
import { canonicalJson } from "./lib/save-payload.mjs";

// 兼容旧 pbkdf2 密码验证
function verifyLegacyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const got = crypto
    .pbkdf2Sync(String(password), salt, 120000, 32, "sha256")
    .toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(got));
}

function safeJsonParse(val, fallback = null) {
  if (typeof val === "object") return val;
  try {
    return JSON.parse(String(val));
  } catch {
    return fallback;
  }
}

function normalizeDaoTitle(value) {
  return Array.from(
    String(value ?? "")
      .replace(/[\p{Cc}\p{Cf}]/gu, "")
      .trim(),
  )
    .slice(0, 8)
    .join("");
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_ROOT =
  process.env.TAOYUAN_SOURCE_ROOT || path.resolve(__dirname, "..");
const CLIENT_BUNDLE_DIR =
  process.env.TAOYUAN_CLIENT_BUNDLE_DIR ||
  path.join(SOURCE_ROOT, "client-dist");

const app = express();
app.set("trust proxy", "loopback");
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const requiredDbPassword = process.env.TAOYUAN_DB_PASSWORD;
if (!requiredDbPassword) {
  throw new Error("TAOYUAN_DB_PASSWORD is required");
}
const pool = mysql.createPool({
  host: process.env.TAOYUAN_DB_HOST || "localhost",
  user: process.env.TAOYUAN_DB_USER || "taoyuan",
  password: requiredDbPassword,
  database: process.env.TAOYUAN_DB_NAME || "taoyuan",
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
});

function normalizePlayerName(name) {
  return String(name || "")
    .trim()
    .slice(0, 20);
}
function safeStringify(val) {
  if (val == null) return null;
  return typeof val === "string" ? val : JSON.stringify(val);
}
async function ensureSchema() {
  await pool.execute(`CREATE TABLE IF NOT EXISTS characters (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    slot TINYINT NOT NULL DEFAULT 0,
    name VARCHAR(20) NOT NULL,
    gender VARCHAR(20) DEFAULT 'male',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_character_name (name),
    UNIQUE KEY uk_character_user_slot (user_id, slot),
    INDEX idx_character_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.execute(`CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    channel VARCHAR(20) NOT NULL DEFAULT 'world',
    from_user_id VARCHAR(36) NOT NULL,
    from_username VARCHAR(50),
    from_player_name VARCHAR(50),
    from_realm_name VARCHAR(50),
    to_user_id VARCHAR(36) DEFAULT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_chat_channel_id (channel, id),
    INDEX idx_chat_from_user (from_user_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.execute(`CREATE TABLE IF NOT EXISTS user_mails (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    legacy_mail_id VARCHAR(36) NULL,
    title VARCHAR(120) NOT NULL,
    content TEXT NULL,
    rewards LONGTEXT NULL,
    from_name VARCHAR(40) DEFAULT '系统',
    claimed TINYINT(1) NOT NULL DEFAULT 0,
    claimed_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_mails_user_time (user_id, created_at),
    INDEX idx_user_mails_claimed (user_id, claimed),
    UNIQUE KEY uk_user_mails_legacy_user (legacy_mail_id, user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.execute(`INSERT IGNORE INTO user_mails (id, user_id, legacy_mail_id, title, content, rewards, from_name, claimed, claimed_at, created_at)
    SELECT UUID(), u.id, m.id, m.title, m.content, m.rewards, m.from_name,
      CASE WHEN mc.id IS NULL THEN 0 ELSE 1 END,
      CASE WHEN mc.id IS NULL THEN NULL ELSE m.created_at END,
      m.created_at
    FROM mails m
    JOIN users u ON (m.target = 'all' OR m.target = u.id)
    LEFT JOIN mail_claims mc ON mc.mail_id = m.id AND mc.user_id = u.id`);

  // Mail grants use the candidate asset_grants/asset_ledger migration.
  // Do not silently create those tables here: rollout must apply/review the
  // candidate migration before this code is enabled.

  const [characterIdCols] = await pool.execute(
    "SHOW COLUMNS FROM saves LIKE 'character_id'",
  );
  if (!characterIdCols.length)
    await pool.execute(
      "ALTER TABLE saves ADD COLUMN character_id VARCHAR(36) NULL AFTER user_id",
    );
  const [playerNameCols] = await pool.execute(
    "SHOW COLUMNS FROM saves LIKE 'player_name'",
  );
  if (!playerNameCols.length)
    await pool.execute(
      "ALTER TABLE saves ADD COLUMN player_name VARCHAR(20) NULL AFTER slot",
    );
  const [idx] = await pool.execute(
    "SHOW INDEX FROM saves WHERE Key_name = 'idx_saves_player_name'",
  );
  if (!idx.length)
    await pool.execute(
      "ALTER TABLE saves ADD INDEX idx_saves_player_name (player_name)",
    );
  await pool.execute(`CREATE TABLE IF NOT EXISTS economy_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    username VARCHAR(16) NOT NULL,
    character_id VARCHAR(36) NULL,
    player_name VARCHAR(20) NULL,
    event_type VARCHAR(40) NOT NULL,
    amount BIGINT NOT NULL DEFAULT 0,
    item_id VARCHAR(80) NULL,
    quantity INT NOT NULL DEFAULT 0,
    quality VARCHAR(30) NULL,
    source VARCHAR(80) NULL,
    detail_json LONGTEXT NULL,
    ip VARCHAR(80) NULL,
    user_agent VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_economy_user_time (user_id, created_at),
    INDEX idx_economy_type_time (event_type, created_at),
    INDEX idx_economy_player_name (player_name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS feedbacks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NULL,
    username VARCHAR(16) NULL,
    player_name VARCHAR(20) NULL,
    category VARCHAR(20) NOT NULL COMMENT 'feature|bug|suggestion',
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending|read|resolved|closed',
    ip VARCHAR(80) NULL,
    user_agent VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_feedbacks_category (category),
    INDEX idx_feedbacks_status (status),
    INDEX idx_feedbacks_created (created_at),
    INDEX idx_feedbacks_ip_created (ip, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  const [feedbackIpCreatedIdx] = await pool.execute(
    "SHOW INDEX FROM feedbacks WHERE Key_name = 'idx_feedbacks_ip_created'",
  );
  if (!feedbackIpCreatedIdx.length)
    await pool.execute(
      "ALTER TABLE feedbacks ADD INDEX idx_feedbacks_ip_created (ip, created_at)",
    );

  await pool.execute(`CREATE TABLE IF NOT EXISTS save_trusted_snapshots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    character_id VARCHAR(36) NULL,
    slot TINYINT NOT NULL DEFAULT 0,
    player_name VARCHAR(20) NULL,
    raw LONGTEXT NOT NULL,
    data_json LONGTEXT NULL,
    meta_json LONGTEXT NULL,
    game_absolute_day INT NULL,
    source_updated_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_trusted_snapshot_slot_time (user_id, slot, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.execute(`CREATE TABLE IF NOT EXISTS save_audit_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    username VARCHAR(16) NOT NULL,
    character_id VARCHAR(36) NULL,
    player_name VARCHAR(20) NULL,
    slot TINYINT NOT NULL DEFAULT 0,
    event_type VARCHAR(40) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ok',
    raw_size INT NOT NULL DEFAULT 0,
    data_size INT NOT NULL DEFAULT 0,
    data_hash VARCHAR(64) NULL,
    client_loaded_at DATETIME NULL,
    server_updated_at DATETIME NULL,
    detail_json LONGTEXT NULL,
    ip VARCHAR(80) NULL,
    user_agent VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_save_audit_user_time (user_id, created_at),
    INDEX idx_save_audit_type_time (event_type, created_at),
    INDEX idx_save_audit_player_name (player_name),
    INDEX idx_save_audit_status_time (status, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  // Phase 1 runtime dependency. This only creates additive authority metadata;
  // existing saves are deliberately not scanned, rewritten, or backfilled.
  await pool.execute(`CREATE TABLE IF NOT EXISTS asset_baselines (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS authority_config (
    config_key VARCHAR(64) NOT NULL,
    config_value VARCHAR(255) NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (config_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.execute(
    "INSERT IGNORE INTO authority_config (config_key, config_value) VALUES ('asset_authority_mode', ?)",
    [DEFAULT_ASSET_AUTHORITY_MODE],
  );
  await pool.execute(`CREATE TABLE IF NOT EXISTS floating_welfare_users (
    user_id VARCHAR(36) NOT NULL,
    first_seen_date DATE NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

async function assetAuthorityMode(conn) {
  const [rows] = await conn.execute(
    "SELECT config_value FROM authority_config WHERE config_key = 'asset_authority_mode' LIMIT 1",
  );
  return String(rows[0]?.config_value || DEFAULT_ASSET_AUTHORITY_MODE);
}

async function worldBossContributionAvailable(conn = pool) {
  try {
    const [rows] = await conn.execute(
      "SELECT config_value FROM authority_config WHERE config_key = ? LIMIT 1",
      [WORLD_BOSS_CONTRIBUTION_MODE_KEY],
    );
    if (!contributionFeatureEnabled(rows[0]?.config_value)) return false;
    await conn.execute("SELECT 1 FROM world_boss_contributions LIMIT 0");
    await conn.execute("SELECT 1 FROM world_boss_contribution_events LIMIT 0");
    await conn.execute("SELECT 1 FROM asset_grants LIMIT 0");
    await conn.execute("SELECT 1 FROM asset_ledger LIMIT 0");
    return true;
  } catch (error) {
    if (["ER_NO_SUCH_TABLE", "ER_BAD_TABLE_ERROR", "ER_BAD_FIELD_ERROR"].includes(error?.code)) return false;
    throw error;
  }
}

function send(res, status, data) {
  res.status(status).json(data);
}
function toMysqlDateTime(val) {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(val);
  if (!Number.isFinite(d.getTime())) return null;
  return d
    .toISOString()
    .slice(0, 19)
    .replace(String.fromCharCode(84), String.fromCharCode(32));
}
function saveWriterMeta(metaValue) {
  const meta = safeJsonParse(metaValue, {});
  return {
    pageId: String(meta?.savePageId || "").slice(0, 80),
    sequence: Number.isSafeInteger(Number(meta?.saveSequence))
      ? Number(meta.saveSequence)
      : 0,
  };
}
function saveSummary(raw, data, meta = {}) {
  const dataText = data ? JSON.stringify(data) : "";
  const rawText = raw ? String(raw) : "";
  const source = dataText || rawText;
  const p = data?.player || data?.playerStore || data?.stores?.player || {};
  const cu =
    data?.cultivation ||
    data?.cultivationStore ||
    data?.stores?.cultivation ||
    {};
  const g = data?.game || data?.gameStore || data?.stores?.game || {};
  const inv =
    data?.inventory || data?.inventoryStore || data?.stores?.inventory || {};
  const items = inv.items || inv.inventory || inv.bag || [];
  return {
    rawSize: rawText.length,
    dataSize: dataText.length,
    dataHash: source
      ? crypto.createHash("sha256").update(source).digest("hex")
      : null,
    money: p.money ?? meta.money ?? null,
    playerName: normalizePlayerName(
      meta.playerName || p.playerName || p.name || "",
    ),
    year: g.year ?? meta.year ?? null,
    season: g.season ?? meta.season ?? null,
    day: g.day ?? meta.day ?? null,
    realm: cu.realmName ?? cu.realm ?? cu.realmIndex ?? null,
    cultivation: cu.cultivation ?? null,
    aura: cu.aura ?? null,
    spiritStone: Array.isArray(items)
      ? items
          .filter((item) => item?.itemId === "spirit_stone")
          .reduce(
            (total, item) => total + saveSummaryNumber(item?.quantity, 0),
            0,
          )
      : null,
    immortalJade: data?.ascension?.immortalJade ?? null,
    immortalMerit: data?.ascension?.merit ?? null,
    itemKinds: Array.isArray(items)
      ? items.length
      : items && typeof items === "object"
        ? Object.keys(items).length
        : null,
  };
}

function saveSummaryNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function validateSaveProgression({
  summary,
  currentSaveRow,
  plainData,
  authorizedDelta = null,
}) {
  if (!currentSaveRow || !currentSaveRow.data_json) return null;
  const previousData = safeJsonParse(currentSaveRow.data_json, null);
  if (!previousData)
    return {
      abnormal: true,
      reasons: ["trusted_save_unreadable"],
      dayDelta: 0,
    };
  const previous = saveSummary(
    currentSaveRow.raw || currentSaveRow.data_json || "",
    previousData,
    safeJsonParse(currentSaveRow.meta_json, {}),
  );
  return inspectSaveProgression(previous, summary, plainData, previousData, {
    authorizedDelta,
  });
}

async function sampleTrustedSnapshot(conn, userId, slot, currentSaveRow) {
  if (!currentSaveRow) return;
  const data = safeJsonParse(currentSaveRow.data_json, null);
  const summary = saveSummary(
    currentSaveRow.raw || currentSaveRow.data_json || "",
    data,
    safeJsonParse(currentSaveRow.meta_json, {}),
  );
  const gameDay = absoluteGameDay(summary);
  const [latest] = await conn.execute(
    `SELECT game_absolute_day, created_at FROM save_trusted_snapshots
     WHERE user_id = ? AND slot = ? ORDER BY id DESC LIMIT 1`,
    [userId, slot],
  );
  const last = latest[0];
  const oldEnough =
    !last || Date.now() - new Date(last.created_at).getTime() >= 15 * 60 * 1000;
  const dayChanged =
    gameDay != null && (!last || Number(last.game_absolute_day) !== gameDay);
  if (!oldEnough && !dayChanged) return;
  await conn.execute(
    `INSERT INTO save_trusted_snapshots
      (user_id, character_id, slot, player_name, raw, data_json, meta_json, game_absolute_day, source_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      currentSaveRow.character_id || null,
      slot,
      currentSaveRow.player_name || null,
      currentSaveRow.raw || "",
      currentSaveRow.data_json || null,
      currentSaveRow.meta_json || null,
      gameDay,
      currentSaveRow.updated_at || null,
    ],
  );
  await conn.execute(
    `DELETE FROM save_trusted_snapshots WHERE user_id = ? AND slot = ? AND id NOT IN (
       SELECT id FROM (SELECT id FROM save_trusted_snapshots
       WHERE user_id = ? AND slot = ? ORDER BY id DESC LIMIT 12) kept
     )`,
    [userId, slot, userId, slot],
  );
}

function validateInitialCharacterSave(summary) {
  const money = saveSummaryNumber(summary.money, 0);
  const cultivation = saveSummaryNumber(summary.cultivation, 0);
  const year = saveSummaryNumber(summary.year, 1);
  const day = saveSummaryNumber(summary.day, 1);
  const reasons = [];
  // 新建角色只能提交接近新号的初始存档，防止通过创建角色接口注入高资产/高修为存档。
  if (money > 10000) reasons.push(`initial_money:${money}`);
  if (cultivation > 1000) reasons.push(`initial_cultivation:${cultivation}`);
  if (year > 1 || day > 2) reasons.push(`initial_time:${year}-${day}`);
  return reasons;
}

async function recordSaveAuditEvent(user, req, event = {}, db = pool) {
  if (!user) return;
  try {
    const detail = event.detail == null ? null : JSON.stringify(event.detail);
    await db.execute(
      `INSERT INTO save_audit_events
      (user_id, username, character_id, player_name, slot, event_type, status, raw_size, data_size, data_hash, client_loaded_at, server_updated_at, detail_json, ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.username,
        event.characterId || null,
        normalizePlayerName(event.playerName || "") || null,
        Number.isFinite(Number(event.slot))
          ? Math.trunc(Number(event.slot))
          : 0,
        String(event.eventType || "unknown").slice(0, 40),
        String(event.status || "ok").slice(0, 20),
        Number.isFinite(Number(event.rawSize))
          ? Math.trunc(Number(event.rawSize))
          : 0,
        Number.isFinite(Number(event.dataSize))
          ? Math.trunc(Number(event.dataSize))
          : 0,
        event.dataHash || null,
        toMysqlDateTime(event.clientLoadedAt),
        toMysqlDateTime(event.serverUpdatedAt),
        detail,
        String(
          req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
        ).slice(0, 80),
        String(req.headers["user-agent"] || "").slice(0, 255),
      ],
    );
  } catch (e) {
    console.error("save audit err", e.message);
  }
}
async function recordEconomyEvent(user, req, event = {}) {
  if (!user) return;
  try {
    const slot = Number.isFinite(Number(event.slot))
      ? Number(event.slot)
      : null;
    let characterId = event.characterId || null;
    let playerName = normalizePlayerName(event.playerName || "") || null;
    if ((!characterId || !playerName) && slot !== null) {
      const [rows] = await pool.execute(
        "SELECT s.character_id, COALESCE(c.name, s.player_name) AS player_name FROM saves s LEFT JOIN characters c ON c.id = s.character_id WHERE s.user_id = ? AND s.slot = ? LIMIT 1",
        [user.id, slot],
      );
      if (rows.length) {
        characterId = characterId || rows[0].character_id || null;
        playerName = playerName || rows[0].player_name || null;
      }
    }
    const detail = event.detail == null ? null : JSON.stringify(event.detail);
    await pool.execute(
      `INSERT INTO economy_events
      (user_id, username, character_id, player_name, event_type, amount, item_id, quantity, quality, source, detail_json, ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.username,
        characterId,
        playerName,
        String(event.eventType || event.type || "unknown").slice(0, 40),
        Number.isFinite(Number(event.amount))
          ? Math.trunc(Number(event.amount))
          : 0,
        event.itemId ? String(event.itemId).slice(0, 80) : null,
        Number.isFinite(Number(event.quantity))
          ? Math.trunc(Number(event.quantity))
          : 0,
        event.quality ? String(event.quality).slice(0, 30) : null,
        event.source ? String(event.source).slice(0, 80) : null,
        detail,
        String(
          req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
        ).slice(0, 80),
        String(req.headers["user-agent"] || "").slice(0, 255),
      ],
    );
  } catch (e) {
    console.error("economy event err", e.message);
  }
}
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    createdAt: u.created_at,
    disabled: !!u.disabled,
    disabledAt: u.disabled_at || null,
  };
}
async function auth(req) {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!t) return null;
  const [rows] = await pool.execute(
    "SELECT user_id FROM sessions WHERE token = ?",
    [t],
  );
  if (!rows.length) return null;
  const [users] = await pool.execute(
    "SELECT * FROM users WHERE id = ? AND disabled = 0",
    [rows[0].user_id],
  );
  return users.length ? users[0] : null;
}
async function requireAdmin(req, res) {
  const u = await auth(req);
  if (!u || u.role !== "admin") {
    send(res, 403, { error: "需要管理员权限" });
    return null;
  }
  return u;
}

// 境界列表 (V0.4: 30级)
const REALMS = [
  "凡人",
  "炼气一层",
  "炼气二层",
  "炼气三层",
  "炼气四层",
  "炼气五层",
  "炼气六层",
  "炼气七层",
  "炼气八层",
  "炼气九层",
  "筑基初期",
  "筑基中期",
  "筑基后期",
  "金丹初期",
  "金丹中期",
  "金丹后期",
  "元婴初期",
  "元婴中期",
  "元婴后期",
  "化神初期",
  "化神中期",
  "化神后期",
  "渡劫初期",
  "渡劫中期",
  "渡劫后期",
  "大乘初期",
  "大乘中期",
  "大乘后期",
];
const IMMORTAL_REALMS = [
  { name: "真仙", powerBonus: 0 },
  { name: "玄仙", powerBonus: 220 },
  { name: "地仙", powerBonus: 520 },
  { name: "天仙", powerBonus: 960 },
  { name: "太乙金仙", powerBonus: 1700 },
];
const realmNameFromSave = (cu = {}, asc = {}) =>
  asc?.ascended
    ? IMMORTAL_REALMS[
        Math.max(
          0,
          Math.min(
            IMMORTAL_REALMS.length - 1,
            Number(asc.immortalRealmStage || 0),
          ),
        )
      ]?.name || "真仙"
    : REALMS[
        Math.max(
          0,
          Math.min(
            REALMS.length - 1,
            Number(cu.realmIndex ?? cu.realm ?? 0) || 0,
          ),
        )
      ] || "凡人";
const realmSortIndexFromSave = (cu = {}, asc = {}) =>
  asc?.ascended
    ? REALMS.length +
      Math.max(
        0,
        Math.min(
          IMMORTAL_REALMS.length - 1,
          Number(asc.immortalRealmStage || 0),
        ),
      )
    : Math.max(
        0,
        Math.min(
          REALMS.length - 1,
          Number(cu.realmIndex ?? cu.realm ?? 0) || 0,
        ),
      );

const REALM_STATS = [
  { name: "凡人", maxCultivation: 100, maxMana: 30 },
  { name: "炼气一层", maxCultivation: 220, maxMana: 45 },
  { name: "炼气二层", maxCultivation: 420, maxMana: 65 },
  { name: "炼气三层", maxCultivation: 760, maxMana: 90 },
  { name: "炼气四层", maxCultivation: 1200, maxMana: 120 },
  { name: "炼气五层", maxCultivation: 1800, maxMana: 155 },
  { name: "炼气六层", maxCultivation: 2600, maxMana: 195 },
  { name: "炼气七层", maxCultivation: 3700, maxMana: 240 },
  { name: "炼气八层", maxCultivation: 5200, maxMana: 290 },
  { name: "炼气九层", maxCultivation: 7200, maxMana: 350 },
  { name: "筑基初期", maxCultivation: 11000, maxMana: 460 },
  { name: "筑基中期", maxCultivation: 16000, maxMana: 580 },
  { name: "筑基后期", maxCultivation: 24000, maxMana: 720 },
  { name: "金丹初期", maxCultivation: 40000, maxMana: 1000 },
  { name: "金丹中期", maxCultivation: 65000, maxMana: 1400 },
  { name: "金丹后期", maxCultivation: 100000, maxMana: 2000 },
  { name: "元婴初期", maxCultivation: 160000, maxMana: 2800 },
  { name: "元婴中期", maxCultivation: 250000, maxMana: 3800 },
  { name: "元婴后期", maxCultivation: 400000, maxMana: 5200 },
  { name: "化神初期", maxCultivation: 650000, maxMana: 7200 },
  { name: "化神中期", maxCultivation: 1000000, maxMana: 10000 },
  { name: "化神后期", maxCultivation: 1600000, maxMana: 14000 },
  { name: "渡劫初期", maxCultivation: 2600000, maxMana: 20000 },
  { name: "渡劫中期", maxCultivation: 4200000, maxMana: 28000 },
  { name: "渡劫后期", maxCultivation: 6800000, maxMana: 40000 },
  { name: "大乘初期", maxCultivation: 11000000, maxMana: 58000 },
  { name: "大乘中期", maxCultivation: 18000000, maxMana: 82000 },
  { name: "大乘后期", maxCultivation: 30000000, maxMana: 120000 },
];

const defaultConfig = {
  siteName: "万象仙乡",
  announcement: "欢迎来到万象仙乡。灵田起步，万象问道。",
  registrationEnabled: true,
  maintenanceMode: false,
  announcementIntervalHours: 24,
  aboutQqText: "718630139",
  aboutQqUrl: "https://qm.qq.com/q/2BVaTTwDkI",
  aboutGithubUrl: "",
  aboutTapTapUrl: "https://www.taptap.cn/app/383510",
  iosDownloadUrl: "",
  androidDownloadUrl: "",
  sponsorAlipayImageUrl: "",
  sponsorWechatImageUrl: "",
  sponsorAfdianUrl: "",
  groupEntry: {
    enabled: false,
    buttonText: "点我加群",
    url: "",
  },
  floatingWelfare: {
    enabled: true,
    buttonText: "福利",
    title: "仙乡福缘",
    desc: "管理员可在后台调整悬浮福利内容，奖励会直接进入当前存档。",
    gifts: [
      {
        id: "newbie",
        type: "newbie",
        title: "新手福利",
        desc: "新号起步补给，助你更快进入灵田经营与问道循环。",
        enabled: true,
        reset: "once",
        rewards: {
          money: 5000,
          spiritStone: 40,
          aura: 800,
          cultivation: 1200,
          items: [
            { itemId: "mana_recovery_pill", name: "回灵丹", quantity: 3 },
            { itemId: "qi_gathering_pill", name: "聚气丹", quantity: 2 },
          ],
        },
      },
      {
        id: "daily",
        type: "daily",
        title: "每日福利",
        desc: "每日登录可领，补充日常问道和万象市集消耗。",
        enabled: true,
        reset: "daily",
        rewards: {
          money: 1600,
          spiritStone: 8,
          aura: 240,
          cultivation: 360,
          items: [
            { itemId: "mana_recovery_pill", name: "回灵丹", quantity: 1 },
          ],
        },
      },
      {
        id: "seven_day",
        type: "seven_day",
        title: "七日福利",
        desc: "七日内每天可领一档，适合新玩家连续成长。",
        enabled: true,
        reset: "sevenDay",
        rewards: {
          money: 3000,
          spiritStone: 18,
          aura: 560,
          cultivation: 800,
          items: [{ itemId: "foundation_pill", name: "筑基丹", quantity: 1 }],
        },
      },
    ],
  },
  updateLogs: [
    {
      title: "V3.3.8 仙乡领地全图战略",
      date: "2026-07-23",
      content:
        "仙乡领地重制为沉浸式全屏山河战略地图，补充山脉、河流、森林、灵田、矿区、城池、势力范围和动态供给线，不再以线条文字面板作为主体。新增基础SLG循环：行动力恢复、军府征募、兵力与士气、破阵/镇守/奇袭克制、邻接出征、守军损耗、据点驻防升级、敌袭回援、离线资源产出和山河战报；旧领地存档会自动迁移并继续保存到数据库。",
    },
    {
      title: "V3.3.7 邮箱已领取邮件清理",
      date: "2026-07-23",
      content:
        "系统邮件面板新增‘清理已领取’按钮，可一次删除当前账号已完成领取的历史邮件。清理接口只删除奖励已经确认写入数据库的邮件；未领取邮件以及奖励仍在待确认状态的邮件会继续保留，避免误删尚未到账的奖励。",
    },
    {
      title: "V3.3.6 奖励存档串行与历史恢复",
      date: "2026-07-23",
      content:
        "修复反馈#37：邮件、签到和悬浮福利领取改为先写稳原进度，再逐笔应用奖励并等待数据库确认；领取期间暂停体力恢复和自动吐纳等资产变化，回家休息前后也会等待最新存档落库，避免奖励增量与普通操作交错后反复提示不符。进入角色时会从服务器权威存档按顺序恢复历史待确认奖励，确保不吞奖励、不重复发放。",
    },
    {
      title: "V3.3.5 百晓入口与一键收获优化",
      date: "2026-07-23",
      content:
        "游戏内地图的‘随身仙囊’新增‘百晓’按钮，可随时进入前端知识库并返回原游戏页面；知识库补充数据库实时存档、自动抚摸机、仙乡领地和批量收获等近期教程。处理BUG反馈#35：实时存档通知改为按同一轮同步操作合并，百块灵田一键收获时只在整批结算完成后序列化并写入最新完整状态，避免每株收获都重复加密整份存档造成页面卡死；纳戒、任务、图鉴、修行与育种结算规则保持不变。",
    },
    {
      title: "V3.3.4 数据库实时存档与首页保存修复",
      date: "2026-07-23",
      content:
        "角色数据改为服务器数据库唯一持久化来源：登录首页只读取数据库角色列表，点击继续时重新读取最新云档；游戏运行数据仅保留在当前页面内存，每次状态变化实时写入数据库，不再把角色存档写入浏览器。首页会清理旧版本地角色副本和待同步标记，未进入有效角色前绝不发送保存请求，修复部分玩家在首页提示‘保存页面标识无效’的问题。同步修复奖励到账后的账本写入兼容，避免奖励结算导致实时保存失败。",
    },
    {
      title: "V3.3.3 实时存档冲突与宠物照料修复",
      date: "2026-07-23",
      content:
        "实时存档增加页面实例与单调序号标识，区分本页写档、刷新前本页写档、服务器权威用药和真正的其他页面更新；同页较新进度自动补写，已完成的权威结果优先载入，只有不同页面更新才暂停保存，修复单页面被误报冲突后永久停止上传的问题。处理BUG反馈#34：自动抚摸机现在也覆盖独立猫狗宠物状态，每天自动抚摸并增加5点好感，安装机器后已有宠物和已有机器后新领养宠物都会立即生效，重复结算不会重复增加。",
    },
    {
      title: "V3.3.2 实时存档入口与转生修复",
      date: "2026-07-23",
      content:
        "存档统一为游戏数据变化后实时写入服务器，移除 WebDAV 和手动云端上传、下载入口；每次变化先同步写浏览器恢复副本，突然刷新后会核对同账号、同角色和服务器基线，安全时先补传最新本地进度，版本分叉时停止覆盖并提示核查。排行榜刷新前先等待最新进度落库，同步失败时不再展示可能过期的数据。炼丹失败会明确列出每种缺失材料及灵气、灵力的现有/需要数量。修复轮回殿转生遗漏灵根晋升：成功转生按杂、木、水、土、火、金、天灵根逐阶提升，天灵根封顶，确认弹窗和游戏日志显示前后变化。核查当前服务器存档后未发现已转生角色，因此无需猜测性批量补档。",
    },
    {
      title: "V3.3.1 权威用药与实时保存提示修复",
      date: "2026-07-23",
      content:
        "修复灵芝培元丹等受保护道具虽然已有服务器结算接口，但背包、快捷用药与悬浮快捷栏仍误走本地服药入口的问题；现在统一由服务器锁定权威云档后扣除道具、结算药效并记录消费回执。权威消费与本页面实时写档短暂并发时会等待最新云档版本后幂等重试。实时保存遇到奖励授权等普通409业务冲突时不再误报为其他设备更新，只有明确的SAVE_CONFLICT才提示并暂停。",
    },
    {
      title: "V3.3.0 玩家数据实时入库",
      date: "2026-07-23",
      content:
        "玩家游玩状态改为每次数据变化后立即写入数据库，不再依赖每5秒自动保存；同一操作内的多项同步变化合并为一次完整写档，写入进行中若继续产生变化，会在当前请求完成后立刻补写最新状态。数据异常守卫收窄为只拦截铜钱、修为、灵气、灵石、仙玉与仙界功德的异常大数值增长，普通玩法变化、集中结算、数值消耗和日期变化不再作为拦截理由。",
    },
    {
      title: "V3.2.9 服务端权威结算第一阶段",
      date: "2026-07-21",
      content:
        "云存档开始建立资产基线与授权账本；邮件、签到和悬浮福利奖励改为服务器签发后随云档确认，受保护道具（仙盟永久增益、洗髓丹、仙桃、体力丹、时间禁锢丹、灵芝培元丹）改由服务器锁定云档后结算并记录消费回执。体力丹的每日次数、冷却、额外体力上限与游戏时间成本，以及凌晨2点后的丹药限制均由服务器校验。镇魔分档奖励预留服务器观测贡献账本，未部署可信战斗观测器时维持关闭，避免客户端伪造贡献领奖。仅对后续操作生效，不追溯或改动已有玩家资产。",
    },
    {
      title: "V3.2.8 装备效果说明优化",
      date: "2026-07-21",
      content:
        "明确药师帽是独立灵耕装备，效果为灵耕体力消耗-6%、灵植品质+5%，不属于丰收套装；丰收套装固定由丰收月戒、碧玉簪、云锦履组成，背包套装区域可直接查看组成与说明。未改动装备数值、掉落、套装判定或存档结构。",
    },
    {
      title: "V3.2.7 工具精通时间修复",
      date: "2026-07-21",
      content:
        "处理功能反馈#24：修复工具精通把20分钟误按20小时推进、导致点击后直接累倒进入次日的问题。工具精通现在正确消耗20分钟；只有操作开始时已经临近凌晨2点，正常跨过就寝时限时才会触发日结。",
    },
    {
      title: "V3.2.6 仙缘触发与反馈修复",
      date: "2026-07-21",
      content:
        "处理功能反馈#21—#23：仙缘条件满足后会随地点、时辰、天气、行囊与成长状态即时检查，不再必须睡到次日；修复供奉30分钟、仙灵互动1小时被误当成30/60小时而直接累倒的问题；狐珠改为击败玄矿幽脉60层熔岩君主确定获得，旧档已首杀玩家可在再次击败时补领；丹宗额外成丹明确为当前界面显示的概率加成、最高35%，并非每炉固定多一颗。",
    },
    {
      title: "V3.2.5 数据异常自动回档",
      date: "2026-07-21",
      content:
        "云存档新增可信历史快照与高置信异常自动回档：正常单项增长和集中结算采用宽松规则，修正跨季、跨年游戏日计算；仅在关键数值荒谬、极端硬上限、极端跳变或多项强异常时拒绝来档，并立即用服务器可信存档恢复本地、暂停自动保存并记录审计事件。每个槽位最多保留12份可信快照，按时间间隔或游戏日变化采样，避免高频自动保存造成快照膨胀。仅防范后续异常，不追溯或改动现有玩家存档。",
    },
    {
      title: "V3.2.4 功能反馈综合修复",
      date: "2026-07-21",
      content:
        "处理功能反馈#20：蟹笼新增跨水域一键放饵；百草园每日保底紫菀并在修仙市集增加稳定补给；聚灵阵明确基础Lv.0、最高Lv.10、升级费用和满级状态；宗门百艺显示当前与升级后实际加成，三大建筑改为精确效果并接入领奖、洗练及宗门副本结算；日志清空与关闭按钮分区，扩大移动端关闭触控区域；更新公告按内容版本重新提示，配置接口禁用缓存，减少公告已更新但页面资源仍旧的情况。",
    },
    {
      title: "V3.2.3 仙缘指引与词条定向洗练",
      date: "2026-07-20",
      content:
        "根据游戏内意见反馈补强仙灵与炼器体验：仙灵页新增六条仙缘的分阶段指引，只展示下一步可追寻线索，并实时标记季节、天气、时辰、地点、行囊物品、技能、任务、矿层与好感等条件是否满足；剧情门槛和旧存档保持不变。装备词条洗练改为可选择锁定主词条或副词条，锁定一条后可明确重洗另一条，修复锁定后副词条无法继续洗练及只扣材料不产出新词条的问题；同件装备最多锁定一条，兼容原有 locked 字段。同步细化材料默认来源及炼器图纸、魂晶、雷精、龙玉、蚕丝、雪莲等关键物品的获取文案。",
    },
    {
      title: "V3.2.2 意见反馈体验修复",
      date: "2026-07-20",
      content:
        "根据游戏内意见反馈修复四项体验问题：最高品质工具的详情页继续显示工具精通等级、材料与升级按钮，不再因品质满级隐藏；灵牧苑动物派遣取消额外推进1小时游戏时间，保留原有每日休整限制；洞府聚灵阵补齐升级按钮与明确费用，每级提高现实日五行元气和灵石产量且不清空待领取天数；出货灵匣新增全部、灵植/果实、鱼获、牧产、加工/料理、其他六类筛选，便于快速批量出货。",
    },
    {
      title: "V3.2.1 水域巡钓与实获结算",
      date: "2026-07-20",
      content:
        "重构完整钓鱼结算链：将鱼池加权选择、宝箱奖品、蟹笼产物和主/临时纳戒批次容量模拟抽取为独立可测试领域规则；修复鱼池全部为零权重时仍选中首鱼的问题。鱼获、垃圾、宝箱、淘金和蟹笼现在只按实际成功入包推进图鉴、任务、鱼获统计和经验，容量不足不再虚假结算；宝箱多物品按整箱原子预检，蟹笼收获失败保留饵料与下次收获机会，浮漂和蟹笼回收失败保持原状态。保留61种鱼、creek/pond/river/mine/waterfall/swamp六个水域、鱼饵/浮漂/蟹笼ID、概率权重、品质与经验公式，以及原有五个钓鱼存档字段。",
    },
    {
      title: "V3.2.0 山野巡护与资源谱系",
      date: "2026-07-19",
      content:
        "山海野境原有采集入口升级为山野巡护：新增综合巡查、竹坞材料线、坡荫药植线与溪缘遗存线，并为17种固定采集物补齐地貌带、供给职责、加工去向和调查说明；巡护区仅影响当次行动，不新增存档字段。普通采集、专精资源、追踪者、友好动物和野兽掉落统一按实际入包结算，整批容量不足时不消耗资源、不推进任务、图鉴或经验；补齐野兽击杀、遭遇及掉落任务记账，修正采集图鉴任务统计和战败提示。同步重写云飞、李渔翁、小满、雪芹、丹青五名人物职责、日常对话、相关主线与云飞/雪芹/丹青15段关系事件。保留 forage 路由、nature 地点组、foraging 技能、资源/动物/敌对单位/NPC/事件/任务ID、门槛、奖励及旧存档结构。",
    },
    {
      title: "V3.1.9 四时田契与百工作序",
      date: "2026-07-19",
      content:
        "原创化基础阶段首批发布：16种四时田契锚点作物接入公开供给定位，20类加工设施重述为百工作序，商店、加工、料理、集仓订单、功业与乡志共建册形成一致的公开经济表达；12名经济人物职责和春兰、红豆10段关系事件完整重写。保留作物、配方、商店、NPC、关系事件、任务、功业及共建册内部ID、旧档进度和既有数值规则。修复手动与自动加工、烹饪在成品空间不足时可能丢失产物或材料的问题：现在会保留完成状态或不消耗材料。",
    },
    {
      title: "V3.1.8 山河双线人物重写",
      date: "2026-07-19",
      content:
        "原创化第四阶段完整重写星澜河与玄矿幽脉人物线：沈听澜（星澜河巡汛师）负责水位、鱼汛、护岸、放流与合规捕捞；裴砚川（地脉勘验师）负责矿层测绘、闭井警戒、支护风险与开采边界。两人四阶段日常台词、3段恋爱事件和2段知己事件全部重写，并同步主线、商店、节庆、食谱、秘闻、竞赛及系统提示。内部 qiu_yue、a_shi 与原有事件ID、好感、婚姻、任务、食谱和旧存档数据保持兼容。",
    },
    {
      title: "V3.1.7 万象集开篇人物重写",
      date: "2026-07-19",
      content:
        "原创化第三阶段完整重写万象集开篇三人组：顾百川（万象行主）、陆清和（乡志司书）、陆镇岳（万象集执事）启用全新姓名、身份、性格与人物关系；陆清和五段好感/知己事件重写为星澜河水文、无名地契、乡志新卷、双页校记与远行留页；同步重写三人关联主线章节、祠堂订单、节庆职责、晨间引导、25条执事生活提示、知己日结、婚礼、公仓来信、食谱叙述与旁人评价，并将万物铺公开名称统一为万象行。内部 chen_bo、liu_niang、liu_cunzhang ID及好感、婚姻、任务、食谱和旧存档数据保持兼容。",
    },
    {
      title: "V3.1.6 世界观术语统一",
      date: "2026-07-19",
      content:
        "原创化第二阶段建立《万象仙乡》世界观与术语规范，并统一当前玩法、剧情、成就、活动、商店和福利界面的旧称：灵田洞天、星澜河、万象云集、仙乡知交等名称正式启用。仅调整玩家可见表达，不修改任务ID、NPC ID、物品ID、存档结构及 taoyuan_* 兼容键，旧玩家存档可直接沿用；原作署名与 CC BY-NC 4.0 说明继续保留。",
    },
    {
      title: "V3.1.5 关于页仓库展示调整",
      date: "2026-07-19",
      content:
        "按展示要求移除首页关于游戏与版权来源页中的本项目 GitHub 仓库信息，并撤下后台对应配置入口；原版作品来源与 CC BY-NC 4.0 合规说明继续保留。",
    },
    {
      title: "V3.1.4 原创化第一阶段",
      date: "2026-07-19",
      content:
        "启动按模块原创化改造：停用并移除授权链未核验的 zpix 字体，改用系统中文字体栈；移除未使用的旧 Logo、旧首页图与本地赞助二维码；首页关于页新增固定的原版来源、CC BY-NC 4.0 状态和本项目仓库说明；Android 公开标题及备用服务默认品牌统一为万象仙乡；新增原创化进度、来源留证和第三方声明文档。兼容性存档键、数据库名及部署路径暂时保留，避免影响旧档。",
    },
    {
      title: "V3.1.3 今日全服巡检修复",
      date: "2026-07-18",
      content:
        "收紧云存档槽位、角色归属与多端冲突保护；匿名反馈新增IP频率与每日配额；修复瀚海装备兑换和旧档迁移；拆分龙珠作物/信物及柿子作物/果树鲜果ID；同步时间禁锢丹30分钟文案，并移除数据库凭据源码默认值。",
    },
    {
      title: "V3.1.2 装备方案与炼丹体验",
      date: "2026-07-18",
      content:
        "装备方案上限统一提升到12套，旧档方案完整保留，装备页与快捷换装统一显示真实计数并优化移动端滚动；炼丹新增药材入炉、灵火淬炼、凝丹出炉及失败熄火反馈，动画期间防重复点击并支持系统减少动态效果，配方、成功率与产出逻辑不变；知识库补齐寻珍矿工准确来源、近期任务口径、仙市行情、装备锁定、反馈状态及V3.0.7—V3.1.1常见问题。",
    },
    {
      title: "V3.1.1 我的反馈与补偿补发",
      date: "2026-07-18",
      content:
        "反馈入口新增“我的反馈”列表，可查看本人提交内容以及待查看、已查看、已解决或已关闭状态；管理员打开反馈列表后，待查看项目会更新为已查看。补发此前筛选遗漏的未禁用管理员 V3.1.0 综合更新补偿。",
    },
    {
      title: "V3.0.9 综合体验与周期修复",
      date: "2026-07-18",
      content:
        "修复瀚海禁地商路与灵兽派遣不推进；签到连续天数日期解析；月度修行令改按现实自然月；奇遇进度保持长期存档不随游戏周期清空；下调符箓战力上限并让本命法宝保持主成长地位；云靴前期改用可稳定获取的云灵丝；物品来源提示覆盖纳戒与加工材料；百工坊新增一键加工/收取；灵牧苑沿用并强化喂食全部；百艺补充宗门与道统说明。",
    },
    {
      date: "2026-07-17",
      title: "V3.0.8 刷新恢复当前存档修复",
      content:
        "修复玩家在游戏内刷新页面后，前端内存状态清空并返回首页，导致看起来像存档/背包/玩法进度丢失的问题：现在刷新游戏页会优先读取上次活跃槽位并自动恢复本地缓存存档；若恢复失败才回到首页，云端存档不会被清空。",
    },
    {
      date: "2026-07-17",
      title: "V3.0.7 灵兽培育任务计数修复",
      content:
        "修复修行志/周修行令中灵兽培育、动物培育类任务容易卡住的问题：培育次数现在会统计灵兽喂食、灵兽每日陪练、灵禽舍/牲口棚孵化成功、灵泉鱼池繁殖成功，并保留原灵种育种台完成计数；同步调整任务说明，明确哪些培育行为可推进目标。",
    },
    {
      date: "2026-07-15",
      title: "V3.0.6 冰魄护魂丹灵力回满修复",
      content:
        "修复冰魄护魂丹实际只恢复固定90点灵力的问题：服用后现在会直接恢复至当前灵力上限，并保留心魔削减与元神伤势恢复效果；同步调整服用日志与浮动提示，避免效果描述和实际数值不一致。",
    },
    {
      date: "2026-07-13",
      title: "V3.0.5 原版基线与文案替换",
      content:
        "按原版 setube/taoyuan README 建立 ORIGINAL_BASELINE.md，明确只把原版已有的田庄、农场、村民、商店、矿洞、公会、博物馆、任务教程、世界观等作为去原版化重点；仙界、后台、云存档、长期留存等后续新增系统只做品牌统一。同步替换一批原版体系玩家文案为万象仙乡口径，如灵田、灵田洞天、万象集、万象铺、玄矿幽脉、仙盟、藏珍阁、天机榜、纳戒、百艺、功业等。",
    },
    {
      date: "2026-07-13",
      title: "V3.0.4 前台玩法入口去原版化",
      content:
        "原创化继续推进：前端地图分区与玩法按钮改为万象仙乡自有体系，如灵田、灵牧苑、万象集、万象市集、青篁秘林、玄矿幽脉、问道、丹炉、洞天、道统、器阁、天榜、飞书等；package 作者与描述改为万象仙乡制作组和万象经营修仙定位；后端默认公告与福利文案同步换成万象仙乡口径。内部路由、数据库和 taoyuan 存档键暂保留兼容，避免旧玩家数据受影响。",
    },
    {
      date: "2026-07-13",
      title: "V3.0.3 万象仙乡应用图标",
      content:
        "品牌视觉补全：基于万象仙乡徽记生成浏览器 favicon、PWA 192/512 图标、iOS apple-touch-icon 与 Android 多密度 App 图标；新增 Web App manifest，并补充资产台账中的图标来源与生成脚本记录。",
    },
    {
      date: "2026-07-13",
      title: "V3.0.2 万象仙乡品牌视觉",
      content:
        "原创化第二阶段继续推进：新增万象仙乡原创徽记与首页主视觉，首页从旧像素田园图升级为灵田村落、星河仙门、云阙洞天的品牌视觉；清理主要玩家可见旧名残留，并新增 ASSET_LEDGER.md 资产台账，记录品牌素材、AI 辅助原创素材、第三方授权素材与原版遗留待替换素材。",
    },
    {
      date: "2026-07-12",
      title: "V3.0.1 万象仙乡品牌过渡",
      content:
        "原创化第二阶段启动：游戏正式名确定为《万象仙乡》，首页标题、浏览器标题、移动端 App 名、后台站点名、README 与知识库入口等公开品牌先行替换；内部 taoyuan 存档键、部署目录和数据库名暂时保留兼容，避免影响旧玩家云存档。",
    },
    {
      date: "2026-07-12",
      title: "V3.0.0 仙身豪华花哨特效",
      content:
        "仙界大厅角色特效全面重做为更花哨的仙界风：新增金紫青渐变流彩边框、多层旋转法环、莲花光阵、星河粒子雨、飘带流光、前景扫光和豪华境界光晕；角色图片继续铺满特效框，但本体保持稳定，主要由光效层制造华丽动态。",
    },
    {
      date: "2026-07-12",
      title: "V2.9.9 仙身铺满特效框",
      content:
        "仙界大厅角色立绘改为铺满整个特效框：图片从完整适配改为覆盖式填充，避免小图浮在框内；同时降低整张图片位移晃动，只保留轻微呼吸与明暗变化，把主要动态交给扫光、脚下灵光、境界粒子和法环特效。",
    },
    {
      date: "2026-07-12",
      title: "V2.9.8 仙身动态浮光修正",
      content:
        "仙界大厅角色立绘动态效果修正：把误写到样式标签外的动态 CSS 移回有效样式区，并强化悬浮、呼吸、左右摆动、脚下灵光脉冲与扫光流影；不改变玩法数值和入口。",
    },
    {
      date: "2026-07-12",
      title: "V2.9.7 仙界完整立绘舞台",
      content:
        "继续优化仙界大厅角色展示：取消上圆下方的头像式裁切，改为更大的完整海报立绘舞台；角色立绘完整居中靠底显示，移动端也保持大尺寸；境界法环、粒子和前景光环整体外扩，允许溢出舞台边缘显示，避免特效被卡片边界或立绘遮挡。",
    },
    {
      date: "2026-07-12",
      title: "V2.9.6 仙界界面纯净与立绘强化",
      content:
        "仙界界面体验优化：仙界所有区域不再显示下界状态栏中的今日机缘提示，但下界界面保持原样；仙界大厅角色立绘展示区域放大，立绘改为完整适配显示，避免人物显得过小或被裁切；境界粒子与前景光环层级提高，特效会包围并覆盖在角色卡边缘，让真仙、玄仙、地仙、天仙、太乙金仙的卡片差异更明显。",
    },
    {
      date: "2026-07-12",
      title: "V2.9.5 仙界境界角色卡片",
      content:
        "仙界角色表现继续深化：真仙、玄仙、地仙、天仙、太乙金仙五个仙界境界现在拥有不同角色卡片主题、境界徽记、名牌、身份说明与战斗光环。真仙偏白云初升，玄仙偏银紫玄月，地仙偏洞天山河，天仙偏云阙天门，太乙金仙偏功德金轮；仙界大厅与混沌裂隙玩家卡都会随当前仙阶切换边框、粒子、光环和描述，让境界突破在视觉上有清晰反馈。",
    },
    {
      date: "2026-07-12",
      title: "V2.9.4 仙界多仙术与特效强化",
      content:
        "仙界卡片战斗继续补强技能与表现：四大仙术扩展为八大仙术，新增归墟潮心、坠星傀核、净魔心灯、逆律天瞳，并在混沌裂隙战斗中加入差异化效果。归墟潮心可回命减伤，坠星傀核先震碎护盾，净魔心灯降低心魔侵蚀，逆律天瞳提高暴击与破律伤害；前端同步新增技能粒子层、不同仙术主题色、潮汐/陨星/心灯/天瞳等专属动效与技能标签，让裂隙卡片战斗更像真正出招。",
    },
    {
      date: "2026-07-12",
      title: "V2.9.3 仙界动态卡片战斗",
      content:
        "仙界混沌裂隙补强战斗表现：裂隙页新增仙身卡与首领卡对阵舞台，展示仙战力、气血、仙力、首领阶段、仙躯与护盾；四大仙术升级为可点击出招卡，明确标记首领弱点与轮值词缀顺应；新增战斗播报面板、卡面扫光、法环呼吸、护盾光条、狂暴提示和移动端自适应，让裂隙首领战从纯按钮文本升级为动态卡片战斗体验。",
    },
    {
      date: "2026-07-12",
      title: "V2.9.2 修行路总览与每日指引",
      content:
        "参考五行修真的成神之路、每日重置与集中福利结构，不照搬数值、不新增地图入口，而是在活动中心新增修行路总览与今日重置推荐清单。修行路把桃源初立、引气修行、红尘历练、道统立身、转生筑基、飞升仙界、裂隙镇狱等既有系统按阶段串联，显示已完成、当前推荐与后续解锁；今日指引集中提示每日目标、周修行令、全服镇魔、世界剧情、道统材料和仙界日常，帮助玩家上线后知道先做什么。",
    },
    {
      date: "2026-07-11",
      title: "V2.9.1 晚间三线闭环补强",
      content:
        "按晚间全功能巡检结果继续横向补齐三个已有系统：修行页新增玉简参悟，玉简不再只作为产出材料，可每日消耗玉简与灵气参悟已习得功法，获得顿悟、修为、灵力并削减心魔，高层功法升级额外消耗玉简；技能页新增生活技能大师委托，Lv7+生活/战斗技能可提交高阶材料换取铜钱、灵石与大量技能经验；炼器页新增装备副词条洗练，主词条之外可消耗炼器图纸与灵石洗出副词条，并接入稀有图鉴与套装方向，让玉简、炼器图纸和高阶材料形成更完整的长期消耗闭环。",
    },
    {
      date: "2026-07-11",
      title: "V2.9.0 今日全服巡检修复",
      content:
        "今日全服巡检覆盖代码、物品、丹药、加成与构建链路，并修复真实引用缺口：补齐石料/黏土物品定义，避免小屋维护与博物馆彩陶修复消耗不存在物品；成就奖励 compost 改为基础肥料；职业委托“鱼鲜备货”从泛称 fish 改为鲫鱼；每日签到第5天不存在的草莓种子改为萝卜种子。同步修正星陨铁、炼器图纸和教程中装备升星仍为后续的旧文案。",
    },
    {
      date: "2026-07-11",
      title: "V2.8.9 15转装备升星",
      content:
        "横向补齐炼器与转生闭环：15转解锁装备升星，炼器页新增装备升星模块。灵剑、法衣、云靴、护符需先淬炼至满阶，再消耗星陨铁、法宝碎片、灵石与铜钱升星，高星额外消耗炼器图纸。升星提升修仙装备战力与渡劫稳定，并重置灵韧，让星陨铁、炼器图纸、法宝碎片等既有材料进入长期消耗循环；转生页15转说明同步从“后续”改为已实装。",
    },
    {
      date: "2026-07-11",
      title: "V2.8.8 本命法宝主动威能",
      content:
        "横向补齐本命法宝闭环：本命法宝不再只是被动战力养成，新增每日主动威能。七星剑可发动七星斩念，获得修为与灵气并削减心魔；太极镜可发动太极护心，回转灵力、修复洞府稳定并缓解元神伤势；青莲灯可发动青莲照心，获得悟道与灵气并净化心魔。主动威能按法宝等级提升每日次数与效果，消耗灵力，直接接入已有本命法宝页，不新增入口。",
    },
    {
      date: "2026-07-11",
      title: "V2.8.7 道统副本与长老试炼",
      content:
        "本次从仙界线横向巡检已有玩法，优先补齐道统系统闭环：道统页新增道统副本·长老试炼，不新增凡界地图入口。亲传弟子可按所入道统挑战剑冢镇妖、丹霞药境、天罡符阵，消耗道统贡献并根据职位、试剑台等底蕴结算功勋、灵气和专属材料；长老候补可每日挑战长老试炼，获得玉简、法宝碎片、功勋与灵气。道统宝库万象秘境材料匣说明同步调整，道统职位从“后续接副本”改为已接入副本闭环。",
    },
    {
      date: "2026-07-11",
      title: "V2.8.6 裂隙轮值词缀",
      content:
        "仙界混沌裂隙新增裂隙轮值词缀：每日/每周混沌波动会切换虚潮涨落、坠星乱流、心魔低语、逆律回环、镇狱稳界等战场环境。词缀会影响首领战反噬、奖励倍率与推荐仙术，顺应用云体护身、星河落刃、曜阳真火、紫霄雷印等对应仙术可获得额外伤害和结算收益，让裂隙首领、猎榜、赛季功勋与功勋兑换形成更有变化的循环。",
    },
    {
      date: "2026-07-11",
      title: "V2.8.5 裂隙功勋兑换",
      content:
        "仙界混沌裂隙新增功勋兑换·镇狱宝库：裂隙赛季功勋现在不仅用于段位和阶段奖励，还会形成可用功勋池，可兑换猎榜补给匣、遗珍碎片匣、裂隙法则核、镇狱稳界令。兑换可获得功德、仙玉、法则、仙器精魄、遗珍碎片和洞天稳定，每周限购，累计功勋不清零，只扣除可用功勋，让赛季追猎形成持续消耗与补短板闭环。",
    },
    {
      date: "2026-07-11",
      title: "V2.8.4 裂隙赛季功勋",
      content:
        "仙界混沌裂隙新增裂隙赛季功勋：根据裂隙镇压次数、裂隙猎榜领取、首领遗珍炼化累计赛季功勋，并在裂隙页展示初临裂隙、裂隙初猎、猎榜入册、四象镇狱、裂隙猎尊等段位。新增四档赛季功勋奖励，达到功勋门槛后可领取功德、仙玉、法则、仙器精魄与遗珍碎片，让首领战不只停留在单次悬赏，而是形成可持续冲段与领奖的长期循环。",
    },
    {
      date: "2026-07-11",
      title: "V2.8.3 裂隙猎榜与首领悬赏",
      content:
        "仙界混沌裂隙新增裂隙猎榜·首领悬赏：在裂隙页直接展示每日/每周追猎目标，击杀虚潮界鲸、坠星古傀、隙门心魔、逆律天眼或炼化首领遗珍都会推进猎榜进度。完成后可领取功德、仙玉、法则、仙器精魄与遗珍碎片，把首领击杀、弱点仙术、遗珍炼化和裂隙套装串成更稳定的周常追求闭环。",
    },
    {
      date: "2026-07-11",
      title: "V2.8.2 首领遗珍与裂隙套装",
      content:
        "仙界裂隙新增首领遗珍系统：击杀四大具名首领后会获得对应遗珍碎片，裂隙页新增“首领遗珍·裂隙套装”面板，可消耗碎片、仙玉、法则与仙器精魄炼化归墟潮心、坠星傀核、净魔心灯、逆律天瞳。遗珍提供独立仙战力，Lv.2 两件/四件激活套装加成，并会降低深层裂隙法则反噬，让首领战、掉落、仙器精魄、法则和仙玉形成更明确的长期追求闭环。",
    },
    {
      date: "2026-07-11",
      title: "V2.8.1 仙界裂隙首领深化",
      content:
        "混沌裂隙升级为更完整的仙界副本首领循环：四个裂隙分别拥有具名首领、三段战斗阶段、弱点仙术、层数加深与专属掉落。战斗中会根据首领阶段重组护盾、提升反击、狂暴反噬或侵蚀仙力；命中弱点可降低仙力消耗、提高暴击与伤害。镇压成功后除了功德、仙玉、法则和仙器精魄，还会掉落太虚尘、星陨铁、妖丹、雷精等对应材料，让仙界战斗、副本、仙器养成和资源循环更紧密。",
    },
    {
      date: "2026-07-10",
      title: "V2.8.0 仙界角色战斗基础",
      content:
        "仙界正式建立角色战斗属性：仙战力、气血、仙力、仙攻、仙防、暴击与减伤均由仙阶、三元仙身、仙器、洞天、命盘和道统共同计算，并兼容旧云存档自动补全。混沌裂隙改为真实资源战斗：仙术消耗仙力，首领会反击，仙防/减伤/暴击参与结算，回合回复仙力；气血归零则本轮失败但保留首领进度。仙界大厅新增完整战斗总览与气血、仙力动态条。",
    },
    {
      date: "2026-07-10",
      title: "V2.7.2 豪华仙身总览大厅",
      content:
        "仙界大厅升级为豪华仙身总览：扩大立绘仙门舞台与云阙档案样式，集中展示仙阶、仙职、道统、本命仙术、仙器共鸣、洞天稳定、斗法战绩、裂隙镇压、三元仙身与最近云阙战报；日常天诏仍保留为独立地图分区，大厅不再堆叠任务内容。",
    },
    {
      date: "2026-07-10",
      title: "V2.7.1 云阙天诏与仙术流派",
      content:
        "仙界大厅恢复为纯粹的仙身展示与分区入口；新增独立地图分区“云阙天诏”，承载每日试炼、裂隙镇压、洞天派遣与每周仙器淬炼目标，完成可领取功德、仙玉、法则和仙器精魄。四类仙术加入实战流派：紫霄雷印擅长破盾，曜阳真火随战斗回合增强，星河剑受斗法连胜强化，云体护身依托仙体稳健加成。",
    },
    {
      date: "2026-07-10",
      title: "V2.7.0 裂隙首领战与洞天派遣",
      content:
        "混沌裂隙升级为阶段首领战：首领拥有仙躯、法则护盾与狂暴阶段，玩家要连续施放仙术破盾、压低血量后才可镇压，首领战况会实时保存在云档；洞天新增云海巡游、星砂采炼、裂隙镇守三类每日派遣，要求先建设对应洞天节点，产出功德、仙玉、法则与仙器精魄，让仙界形成可持续的日常养成循环。",
    },
    {
      date: "2026-07-10",
      title: "V2.6.9 仙器谱与六部位共鸣",
      content:
        "仙界新增完整仙器谱：星河仙剑、云阙仙冠、玄霄仙甲、太虚仙佩、天命道印、流云仙履六部位。仙域试炼与混沌裂隙掉落仙器精魄，可消耗精魄、仙玉与法则淬炼仙器；两件/四件/六件达到Lv.3会激活仙装共鸣，形成飞升后独立的长期装备养成、战力构筑与裂隙挑战循环。",
    },
    {
      date: "2026-07-10",
      title: "V2.6.6 管理员仙界预览模式",
      content:
        "新增管理员专用仙界预览入口，admin 可临时进入仙界页面检查界面与功能完整性；预览数据不写入真实存档、不进入排行榜、不触发公告，退出后恢复原进度。",
    },
    {
      date: "2026-07-10",
      title: "V2.6.5 仙界界面视觉强化",
      content:
        "仙界页整体视觉升级：新增星穹背景、仙门轨道光效、卡片流光、按钮辉光与仙界面板玻璃质感，让飞升后的界面更有仙域氛围。",
    },
    {
      date: "2026-07-10",
      title: "V2.6.4 丹药使用规则收紧",
      content:
        "按反馈收紧丹药规则：时间禁锢丹改为现实30分钟，每个现实日最多3次；体力丹改为每个现实日最多5次；游戏时间到凌晨2点后禁止使用所有丹药，必须休息后再继续。",
    },
    {
      date: "2026-07-10",
      title: "V2.6.3 体力丹服用时间成本修复",
      content:
        "继续修复体力丹防刷：体力丹服用本身也会推进少量游戏时间，凌晨2点后禁止服用，避免玩家在打坐到2点后继续无时间成本连吃体力丹。",
    },
    {
      date: "2026-07-10",
      title: "V2.6.2 体力丹与自动打坐防刷修复",
      content:
        "修复快捷栏体力丹可被连点/扣除失败后仍恢复体力的问题：体力丹改为先扣物品再生效，并加入每日服用上限与短冷却；后台自动打坐每次会推进少量游戏时间，时间冻结期间不再执行自动打坐，防止卡凌晨2点无时间成本修炼。",
    },
    {
      date: "2026-07-10",
      title: "V2.6.1 奖励与公告防伪校验",
      content:
        "安全巡检并加固潜在注入点：世界妖潮周期奖励不再信任客户端上报贡献，改由服务端云存档计算；突破公告校验角色归属、境界合法性与云档当前境界并加入频率限制；客户端经济日志只允许白名单类型，避免伪造系统奖励审计。",
    },
    {
      date: "2026-07-10",
      title: "V2.6.0 五格快捷栏",
      content:
        "快捷使用升级为五格快捷栏：背包中可将最多5个可用物品加入快捷栏，点击游戏内悬浮快捷按钮会弹出五格选择，点选后立即使用，对应用完会自动移出快捷栏。",
    },
    {
      date: "2026-07-10",
      title: "V2.5.9 快捷物品设置与一键使用",
      content:
        "调整快捷用药交互：不再把快捷做成第二个背包页；玩家需在背包中选择可用物品设为快捷，游戏内右侧悬浮快捷按钮会直接使用该物品，用完后自动取消并提示重新设置。",
    },
    {
      date: "2026-07-10",
      title: "V2.5.8 前端注入与后台奖励拦截",
      content:
        "修复保存管理器手动上传未携带云档加载时间导致异常存档可绕过拦截的问题；后端保存接口始终读取当前云档做进度跳变校验；后台悬浮福利和GM邮件奖励统一清洗限额，阻断通过后台配置注入超大铜钱。",
    },
    {
      date: "2026-07-10",
      title: "V2.5.8 前端注入存档拦截修复",
      content:
        "修复保存管理器手动上传未携带云档加载时间导致异常存档可绕过拦截的问题；后端保存接口改为始终读取当前云档进行进度跳变校验，并限制新建角色初始存档边界。",
    },
    {
      date: "2026-07-10",
      title: "V2.5.7 快捷入口悬浮与异常角色重置",
      content:
        "将“快捷用药”入口从地图随身区域移出，改为游戏内右侧悬浮按钮；按运营处理将角色“牛马在线”保留账号/角色名并回滚为新号初始状态。",
    },
    {
      date: "2026-07-10",
      title: "V2.5.6 快捷用药与时间禁锢丹",
      content:
        "新增游戏侧边页“快捷用药”，汇总背包中可直接使用的食物、丹药与功能道具；新增体力丹，使用后体力+100且可临时超过上限，最多额外+500；新增时间禁锢丹，使用后暂停游戏时间流逝30分钟现实时间；两种新丹药接入现有背包/丹药使用体系，并在修仙市集以较高灵石价格出售。",
    },
    {
      date: "2026-07-10",
      title: "V2.5.5 云存档下载恢复",
      content:
        "修复禁用本地文件导入后，账号云存档下载继续游戏误提示存档损坏的问题；保留玩家手动导入/导出入口禁用，仅恢复云端下载写入本地槽位的内部能力。",
    },
    {
      date: "2026-07-10",
      title: "V2.5.4 存档安全与异常资产修复",
      content:
        "禁用玩家本地文件导入/导出存档入口，保留账号云存档保存/下载；服务端新增异常写档拦截，拒绝分钟级大额铜钱或修为跳变，防止客户端篡改云档；修正角色“牛马在线”异常铜钱与修为。",
    },
    {
      date: "2026-07-10",
      title: "V2.5.3 凡界仙界境界划分修正",
      content:
        "修正境界设定：凡界主境界最高到大乘后期，真仙与玄仙移入飞升后的仙界仙阶；仙界仙阶调整为真仙→玄仙→地仙→天仙→太乙金仙。排行榜与战力计算同步识别仙界仙阶，旧存档若曾写入真仙/玄仙主境界，会兼容压回大乘后期并以仙界仙阶展示。",
    },
    {
      date: "2026-07-10",
      title: "V2.5.2 排行榜战力境界权重修复",
      content:
        "修复排行榜战力和角色页战力口径不一致的问题：排行榜服务端不再按当前修为、当前灵气、当前灵力等临时资源计算战力，改为按境界上限、灵力上限、境界阶段权重和稳定养成底蕴计算；同步提高高境界基础权重，避免高境界玩家战力异常低于低境界玩家。",
    },
    {
      date: "2026-07-10",
      title: "V2.5.1 存档删除二次确认",
      content:
        "首页账号角色列表新增“删除”按钮：玩家删除存档前会先看到不可恢复风险提示，并必须二次输入“删除存档”后才能确认；删除后会同步清除云端存档、角色槽位和本地缓存，释放角色名额，后台存档审计会记录删除事件。",
    },
    {
      date: "2026-07-10",
      title: "V2.2.1 战力突破稳定修复",
      content:
        "修复战力和战斗属性过度依赖当前修为、当前灵气、当前灵力的问题：突破成功会清空修为并消耗灵气，因此改为按境界上限、灵力上限与稳定底蕴计算战力/攻防/气血，避免玩家突破境界后战力反而下降。",
    },
    {
      date: "2026-07-10",
      title: "V2.2.0 自动打坐调息",
      content:
        "修行页新增“后台自动打坐调息”按钮，玩家开启后会定时自动执行打坐调息，无需反复手动点击；过程中会正常消耗体力并获得修为、灵力和灵气收益，切换到背包、灵田、万象市集等页面仍会继续运行，体力不足时自动暂停，适合挂机修炼和减少重复操作。",
    },
    {
      date: "2026-07-10",
      title: "V2.1.9 知识库补充",
      content:
        "继续补充游戏内知识库，新增悬浮福利领取、福利按钮看不到、每日/七日福利重置、万象市集打不开、登仙塔卡层、排行榜名字特效、万象集回响、玩家拍卖、道统经营、丹药使用、物品异常、反馈补偿、V2.1.3~V2.1.8版本说明和战斗Build选择等条目，方便玩家直接搜索近期反馈问题和新系统玩法。",
    },
    {
      date: "2026-07-10",
      title: "V2.1.8 悬浮福利活动后台",
      content:
        "游戏内新增可后台控制的悬浮福利按钮：管理员可在后台开关活动、修改按钮标题、说明和新手福利/每日福利/七日福利奖励；玩家侧点悬浮按钮即可领取铜钱、灵石、灵气、修为和物品，领取状态随存档保存，支持一次性、每日和七日周期，方便运营临时加福利或做开服活动。",
    },
    {
      date: "2026-07-10",
      title: "V2.1.7 万象市集兼容与福利登塔平衡",
      content:
        "修复部分玩家因旧前端缓存导致万象市集懒加载资源打不开的问题，线上部署改为保留历史资源以兼容旧缓存；活动中心每日活跃、七日豪礼和连续满勤奖励整体加量，补足灵石、灵气、丹药与中期材料；登仙塔怪物曲线下调并加入境界软化，避免玩家提升境界后反而被塔层数值压制，同时登塔胜利修为与灵气奖励提高。",
    },
    {
      date: "2026-07-10",
      title: "V2.1.6 排行榜名字特效",
      content:
        "排行榜前10名新增玩家名字特效：第1名金焰魁首、第2名银月流光、第3名赤铜战名分别使用不同光效与徽标；第4-10名统一星辉十杰渐变流光。让榜单竞争更有荣誉感和展示欲，同时保持原有排行接口与数据结构不变。",
    },
    {
      date: "2026-07-10",
      title: "V2.1.5 人物关系与世界反馈深化",
      content:
        "NPC页新增万象集回响/人情反馈，把全村平均好感、婚后天数、子女学识羁绊、公会贡献转化为每周可领取的世界反馈奖励。玩家完成万象集请求、主动来信、婚姻陪伴、子女长期事件和公会贡献后，桃源村会给出声望文案、家族经验、好感与铜钱回响，让人物关系和世界状态开始记住玩家行为。",
    },
    {
      date: "2026-07-10",
      title: "V2.1.4 巡检缺失物品修复",
      content:
        "本次全服巡检修复炼丹与家族后代长期线的物品定义缺口：补齐炼精丹、化气丹、炼气丹、化神丹、炼神丹、延寿丹、造化丹、还虚丹、炼虚丹、合道丹、龙颜丹、补灵丹、轮回丹等高阶丹药的背包物品定义，并新增纸作为族谱修订材料，避免炼制后物品显示异常或家族事件材料永远缺失。",
    },
    {
      date: "2026-07-10",
      title: "V2.1.3 市场道统与人物行为深化",
      content:
        "新增玩家市场拍卖雏形、道统经营机构、NPC主动来信、战斗流派Build与家族后代长期事件：修仙市集增加每日竞拍高阶材料，公会页新增外门执事堂/丹药供奉堂/巡山戒律堂，NPC页可回复村民来信，小屋新增子女远学/护院/族谱修订，战斗页加入剑修、雷法、玄甲、灵兽协战流派。继续把资源消耗、人物关系、战斗选择和家族传承串到已有入口。",
    },
    {
      date: "2026-07-10",
      title: "V2.1.2 世界剧情与赛季事件",
      content:
        "活动中心新增世界剧情与季节事件，把万象集、道统、公会、家族、万象秘境、天气和节令串成长期世界线：凡界主线包含村雨妖影、道统来信、家族灯火、登仙塔异鸣等阶段；季节事件根据春夏秋冬和雷雨天气动态出现，提供农事、人情、守夜、商路、镇妖等周期奖励。继续坚持不乱加新入口，而是在活动中心承载世界运转感。",
    },
    {
      date: "2026-07-09",
      title: "V2.1.1 世界系统深耕",
      content:
        "继续深耕既有玩法而非新增散入口：NPC页新增万象集人情请求，全村好感与基础产物形成循环；万象秘境/登仙塔新增战斗策略，爆发、守势、寻宝等路线影响战斗与掉落；公会周常加入协作工程，消耗灵骨、云纹丝、灵石换长期公会加成；技能页新增生活职业委托，让灵田经营、钓鱼、采集、挖矿产物转化为每日技能经验；修仙市集显示七日行情风向；博物馆新增主题展览，按名望切换展陈并影响每日收入。",
    },
    {
      date: "2026-07-09",
      title: "V2.1.0 五段深耕合集",
      content:
        "连续补强 V2.0.6~V2.1.0：经济消耗闭环加入仙市黑市高价材料、装备/洞府维护消耗；修仙装备新增灵韧维护，低灵韧会削弱战力与渡劫稳定；修行志新增装备、洞府、灵脉、家族等卡点目标；洞府与仙界洞天加入稳定度经营和维护成本；家族传承新增护器、洞天祭扫等长期委托，配偶子女进一步接入中后期循环。",
    },
    {
      date: "2026-07-09",
      title: "V2.0.5 机缘实装与反馈补偿",
      content:
        "今日机缘改为按现实自然日刷新，修行机缘正式作用于打坐与炼化；修为达到当前境界上限后，后续修为收益不再白白吞掉，溢出药力/修为会转化为灵气沉淀；修仙市集新增高价修为丹、境界丹、直升丹，限制元婴期以下使用；玩家反馈后台补齐账号/角色展示和一键补偿入口，GM 邮件物品选择改为全量物品库。",
    },
    {
      date: "2026-07-09",
      title: "V2.0.4 丹药实装与灵根晋升修复",
      content:
        "修复炼丹与服丹体验：洗髓丹补齐物品定义，炼制后会正确进入背包；洗髓丹改为灵根必定晋升一阶，天灵根时不消耗；灵芝培元丹正式实装修为+15%与灵气+300；回灵丹在灵力已满时不再消耗并给出提示。",
    },
    {
      date: "2026-07-09",
      title: "V2.0.3 知识库补充与命名修正",
      content:
        "知识库继续补充常见问题条目，并将页面名称从桃源乡知识库修正为《我从灵田经营开始修仙》知识库，后续品牌过渡为《万象仙乡》知识库。新增知识库使用方法、卡突破怎么办、仙界从哪里开始、仙界资源循环、仙缘命盘、混沌裂隙失败原因、仙界主线推进条件、更新记录查看等内容，方便玩家直接搜索问题。",
    },
    {
      date: "2026-07-09",
      title: "V2.0.2 更新记录与教程知识库",
      content:
        "修复前端更新记录显示不全：线上数据库 updateLogs 只保留了部分记录，改为同步后端默认完整更新记录并保留最新版本置顶；新手教程升级为可搜索知识库，支持按关键词搜索、分类筛选和热门问题快捷查询，玩家可直接搜索灵气不足、雷精、飞升、仙界、洞府、道统、更新记录等内容。",
    },
    {
      date: "2026-07-09",
      title: "V2.0.1 仙界长线剧情",
      content:
        "扩展仙界主线剧情长度，避免一天内快速玩空：将原 5 章主线扩展为 4 幕 12 章长线，包括云阙初诏、裂隙真相、旧天庭遗案、凡界锚点、星海秘档、三界债契、太古盟誓、天魔反策、新天试炼、诸道争衡、万仙朝议、新天门立约。后续章节需要更高仙战力、天命积分、仙盟声望、仙擂赛季积分、命盘战力、裂隙镇压次数和仙阶进度，形成中长期推进目标；剧情围绕旧天庭腐朽、混沌裂隙、凡界锚点、三界债契、天魔反策与新天门重立展开，让仙界玩法具备更长故事线和阶段追求。",
    },
    {
      date: "2026-07-09",
      title: "V2.0.0 仙界玩法大升级",
      content:
        "仙界玩法进入 2.0 大版本：在原有飞升、仙职、洞天、仙擂、仙市、仙阶、天命、道统基础上，新增仙盟协作、混沌裂隙、仙缘命盘三大核心系统。仙盟协作消耗功德与仙玉，联动法则碎片、凡界回响和赛季积分；混沌裂隙提供带风险的高阶挑战，按仙战力、连胜气势和命盘成长判定胜负；仙缘命盘消耗法则碎片与仙玉点亮星轨，形成长期仙战力成长与路线加成。道统、天命、PK、洞天、仙阶、凡界回响被串成完整的飞升后二阶段循环，让仙界不再是数值换皮，而是带路线、风险、协作、挑战和长期养成的大版本玩法。",
    },
    {
      date: "2026-07-09",
      title: "V1.8.4 仙界天命与道统传承",
      content:
        "继续完善飞升后的仙界差异化循环：新增星河剑统、紫霄雷统、司农仙统、文命道统四类道统传承，影响仙擂、天命、凡界回响与仙市收益；新增天河决堤、星官问责、凡界香火冲突、云阙邀战等仙界天命事件，每个事件提供多种抉择，产出功德、仙玉、法则碎片、凡界回响或仙擂气势，让仙界玩法从单次按钮推进为带取舍的管理循环。",
    },
    {
      date: "2026-07-09",
      title: "V1.8.3 突破提示与洞府槽位调整",
      content:
        "优化修仙突破反馈：突破条件不足时显示具体缺少的修为或灵气，避免修为已满但灵气不足时误以为无法突破；洞府设施已安置后可取消安置，释放槽位用于重新布置。",
    },
    {
      date: "2026-07-09",
      title: "V1.8.2 仙市仙阶与仙擂赛季",
      content:
        "继续扩展飞升后的仙界第二循环：新增仙市兑换，将功德、仙玉、法则碎片转化为仙露、星陨铁、仙魂和仙体仙骨成长；新增真仙→地仙→天仙→太乙金仙仙阶突破，消耗仙界资源提升称号与仙战力底蕴；新增仙擂赛季积分与三段奖励，让 PK 从单次斗法变成长期赛季目标。",
    },
    {
      date: "2026-07-09",
      title: "V1.8.1 飞升入口补全",
      content:
        "修复地图「修仙之途」区域缺少飞升/仙界入口的问题：未飞升时显示飞升按钮并进入飞升台，已飞升后显示仙界按钮并进入仙界；同时预加载飞升台与仙界页面，减少首次打开卡顿。",
    },
    {
      date: "2026-07-09",
      title: "V1.8.0 仙擂问道与洞天回响",
      content:
        "仙界第二轮扩展：新增仙擂问道 PK，可挑战青冥剑仙、紫府雷将、广寒仙姬，按仙战力、仙术、洞天和连胜结算功德/仙玉/法则；新增仙职事务、洞天建设和凡界回响，让飞升后能处理天庭事务、建设观星台/功德池/法则碑，并赐福道统、家族和灵田。",
    },
    {
      date: "2026-07-09",
      title: "V1.7.9 仙界视觉与仙术特效",
      content:
        "飞升后的仙界玩法完成第一轮质变：角色页新增仙体、仙骨、仙魂与仙光立绘特效；仙界主页升级为云海星辉视觉，加入星河落刃、紫霄雷印、九曜焚天、云篆护体四类仙术特效；新增仙域试炼、功德、仙玉、法则碎片和巡天/司农/炼宝/文命仙职，让飞升后不再只是凡界换皮。",
    },
    {
      date: "2026-07-09",
      title: "V1.7.8 飞升与仙界初开",
      content:
        "大乘后期渡劫后触发飞升引导，新增独立飞升台与全新仙界主页；飞升消耗灵石、雷精、仙露、魂晶、灵蕴玉和铜钱，成功后进入真仙并获得初入仙门称号，可随时返回下界继续原玩法。",
    },
    {
      date: "2026-07-09",
      title: "V1.7.7 工具精通与庄园维护",
      content:
        "工具升级页新增工具精通，消耗铜钱、金属锭和中后期材料提升体力效率与蓄力效率；小屋新增庄园维护，消耗铜钱、木材、石头换取7天睡眠恢复加成，继续补强经济消耗闭环且不新增大入口。",
    },
    {
      date: "2026-07-08",
      title: "V1.7.6 高阶资源订单",
      content:
        "告示栏特殊订单扩展高阶资源回收：百工堂玄铁急单、法衣云材征集、镇塔器修复令、护山灵阵补材等订单会消耗玄铁、云纹丝、星陨铁、法宝碎片、雷精、仙露、灵骨、日炎晶等中后期材料，换取铜钱、灵石、法宝碎片和灵蕴玉，补强经济消耗闭环。",
    },
    {
      date: "2026-07-08",
      title: "V1.7.5 登仙塔赛季挑战",
      content:
        "登仙塔新增赛季挑战「云梯问道」：按本季最高登塔层数解锁踏云者、破灵使、镇塔客、问天行者四档徽章，并领取灵石、魂晶、法宝碎片、雷精和灵蕴玉等奖励；赛季目标直接嵌入登仙塔页面，不新增大入口。",
    },
    {
      date: "2026-07-08",
      title: "V1.7.4 博物馆名望与文物修复",
      content:
        "博物馆新增名望、人气收入、主题收藏和文物修复：捐赠藏品会提升名望并带来每日收入，集齐矿脉、宝石、化石、古国、仙灵主题可领取奖励，修复彩陶、玉器、化石骨架和灵物展柜，补足全收集终局追求。",
    },
    {
      date: "2026-07-08",
      title: "V1.7.3 瀚海商路与道统远征",
      content:
        "瀚海新增商队路线与护送契约，道统新增道统远征队，公会新增周常远征协作，把已有派遣/远征循环扩展到瀚海、道统和公会系统。",
    },
    {
      date: "2026-07-08",
      title: "V1.7.2 灵兽牧场血脉与派遣",
      content:
        "牧场动物新增血脉与天赋，宠物和高好感动物可派遣执行寻物、护院、寻宝等任务，灵兽也能参与洞府守卫和远征，让牧场、宠物与修仙线产生长期联动。",
    },
    {
      date: "2026-07-08",
      title: "V1.7.1 灵石炼气",
      content:
        "洞府灵石坊新增灵石炼气，可将大量灵石转化为灵气；每日固定10次，首次1000灵石约转10000灵气，后续同日成本快速递增且收益递减，定位为消耗多余灵石与突破前补缺口，避免无限膨胀。",
    },
    {
      date: "2026-07-08",
      title: "V1.7.0 公告重复滚动间隔",
      content:
        "后台全服公告新增重复间隔设置，发布时可填写每多少分钟重复滚动一次；填0则只展示一次，方便长期活动、维护和补偿提醒定时重复露出。",
    },
    {
      date: "2026-07-08",
      title: "V1.6.9 后台全服滚动公告",
      content:
        "后台新增全服滚动公告管理，可手动发布、刷新和删除公告；玩家在线时会在游戏顶部看到公告滚动通知，方便活动、维护和补偿提示。",
    },
    {
      date: "2026-07-08",
      title: "V1.6.8 家族传承与子女成长",
      content:
        "小屋家人系统新增家族传承、配偶助手专精、子女资质/学识/羁绊成长与每日家族委托，让结婚和子女系统形成长期追求。",
    },
    {
      date: "2026-07-08",
      title: "V1.6.7 中后期追求扩展",
      content:
        "道统公共建设扩展为三大工程；灵田新增灵田中后期经营目标；装备词条加入锁定、保底、套装与稀有图鉴；奇遇链升级为连续剧情、选择旗标与隐藏结局。",
    },
    {
      date: "2026-07-08",
      title: "V1.6.6 镇魔结算修复",
      content:
        "修复活动中心镇魔周期战报显示内部 eventId 的问题，改为展示本期周期；领取结算邮件时补充账号登录鉴权，避免已登录玩家仍提示请先登录。",
    },
    {
      date: "2026-07-08",
      title: "V1.6.5 镇魔周期结算",
      content:
        "全服镇魔新增周期战报与邮件结算：活动中心可查看本期贡献、参与人数和结算评级，并按个人贡献发放镇魔司邮件奖励，避免奖励只停留在本地档位。",
    },
    {
      date: "2026-07-08",
      title: "V1.6.4 全量留存玩法",
      content:
        "新增全服镇魔个人贡献奖励、道统公共建设、装备词条洗练、闭关归来礼包、奇遇链与月度修行令，全部接入现有活动/道统/炼器入口与存档。",
    },
    {
      date: "2026-07-07",
      title: "V1.6.3 周修行令",
      content:
        "活动中心新增周修行令，每7个游戏日重置一次，把万象秘境战斗、烹饪、博物馆捐赠、公会贡献、瀚海商誉、育种和钓鱼串成周目标，奖励灵石、灵气、资质经验和修仙材料。",
    },
    {
      date: "2026-07-07",
      title: "V1.6.2 连续满勤与周目标",
      content:
        "活动中心新增连续满勤奖励：玩家每天做到100活跃并领取满勤宝箱后累计连续天数，连续3/5/7天可领取额外灵石、灵气、资质经验和修仙材料；同时将活动展示口径从世界妖潮调整为全服镇魔，避免和已取消玩法混淆。",
    },
    {
      date: "2026-07-07",
      title: "V1.6.1 修仙物品与获取路径",
      content:
        "新增月华玉、日炎晶、玄铁、寒髓玉、凤羽、龙鳞、太虚尘、仙露、灵骨、妖丹、玉简、灵墨、云纹丝等修仙材料，并接入万象秘境/凶兽掉落、洞府折灵、背包来源说明和新手教程速查。",
    },
    {
      date: "2026-07-07",
      title: "V1.6.0 玩法补全目标",
      content:
        "修行志新增玩法补全目标，把竹林采集、博物馆捐赠、公会猎令、瀚海贸易、育种杂交等系统接入长期成长奖励，让冷门玩法也有明确阶段目标与回报。",
    },
    {
      date: "2026-07-07",
      title: "V1.5.9 稀有材料获取教程",
      content:
        "新手教程新增「稀有材料获取速查」，集中说明雷精、风羽、魂晶、法宝碎片、星陨铁、灵石等材料的主要获取途径和用途，方便玩家查找雷精等关键材料。",
    },
    {
      date: "2026-07-07",
      title: "V1.5.8 温室地块显示修复",
      content:
        "修复温室弹窗内地块显示错位/叠层异常：温室地块现在使用独立相对定位与裁切容器，像素地块、作物图标和空地状态会正确限制在各自格子内。",
    },
    {
      date: "2026-07-07",
      title: "V1.5.7 设施温室显示修复",
      content:
        "修复设施页温室开启后显示信息过少的问题：已开放状态现在会显示地块数、已种数量、可收获数量，并提供「前往温室」入口；同时补强温室播种、一键收获与升级扣材料校验，避免体力不足或扣除异常时造成作物/材料损失。",
    },
    {
      date: "2026-07-07",
      title: "V1.5.6 灵兽喂食扣除修复",
      content:
        "修复仙鹤等灵兽喂食时可连续点击增加羁绊但不扣除材料的问题：喂食现在必须确认蕴灵稻/凝露草/朱果实际扣除成功后才增加羁绊，并兼容旧存档异常品质物品扣除。",
    },
    {
      date: "2026-07-07",
      title: "V1.5.5 设置页首页按钮",
      content:
        "设置弹窗底部新增「首页」按钮，点击后关闭设置并返回游戏首页/主菜单，方便玩家从游戏内快速回到角色入口。",
    },
    {
      date: "2026-07-07",
      title: "V1.5.4 战力排行榜修复",
      content:
        "修复排行榜战力与角色页战力不一致的问题：服务端战力公式补齐功法、道统技能、修仙装备、符阵、本命法宝、灵兽羁绊、武器/戒指与战斗技能等加成，避免部分玩家排行战力偏低。",
    },
    {
      date: "2026-07-07",
      title: "V1.5.3 地图按钮响应修复",
      content:
        "修复移动端修仙地图中部分按钮偶发点击无反应的问题：所有地图入口统一加入导航锁，签到和系统邮件也改为先关闭地图再执行，避免遮罩/过渡层遮挡反馈。",
    },
    {
      date: "2026-07-07",
      title: "V1.5.1 客户端下载入口",
      content:
        "首页新增 iOS 与安卓客户端下载按钮，后台可分别配置下载链接；链接留空时自动隐藏对应按钮。",
    },
    {
      date: "2026-07-07",
      title: "V1.5.0 灵兽陪练与协战",
      content:
        "灵兽页新增每日陪练与羁绊阶段，战斗胜利触发灵兽协战收益，让灵狐、仙鹤、青鸾分别接入灵气、修为、灵力/雷精循环。",
    },
    {
      date: "2026-07-07",
      title: "V1.4.9 转生材料闭环",
      content:
        "轮回殿转生现在会真实消耗轮回丹，并从二转起逐步接入真灵秘录、轮回尘、灵蕴玉；轮回丹不可再在背包空服用，凶兽与红尘材料正式进入长期转生循环。",
    },
    {
      date: "2026-07-07",
      title: "V1.4.8 修仙地图按钮响应优化",
      content:
        "优化地图页修仙之途区域按钮：先关闭地图再跳转，加入防连点锁，并空闲预加载修仙页面资源，降低首次点击卡顿。",
    },
    {
      date: "2026-07-06",
      title: "V1.4.7 法宝边界说明统一",
      content:
        "统一修仙装备、本命法宝、农具法宝化三套成长说明，修正本命法宝主动威能等未实装表述，让角色页、修行页和教程口径一致。",
    },
    {
      date: "2026-07-06",
      title: "V1.4.6 制符闭环与星陨铁口径",
      content:
        "制符页接入符阵战力、渡劫稳定和愈符体力恢复，符宗获得额外收益；星陨铁说明改为当前订单/折灵材料，装备升星标注为后续系统。",
    },
    {
      date: "2026-07-06",
      title: "V1.4.5 玩法说明与死料清理",
      content:
        "修正高级玩法、法宝碎片、炼器图纸等旧说明；炼器图纸加入洞府灵石坊折灵，避免幽冥洞窟掉落成为暂无用途的死材料。",
    },
    {
      date: "2026-07-06",
      title: "V1.4.4 炼器与修仙装备贯通",
      content:
        "炼器页改为角色页修仙装备的淬炼入口，直接淬炼灵剑、法衣、云靴、护符；材料产出、炼器成长、角色战力与渡劫准备形成统一闭环。",
    },
    {
      date: "2026-07-06",
      title: "V1.4.3 修仙装备整合",
      content:
        "修仙装备栏改为更直观的灵剑、法衣、云靴、护符，和灵田/矿洞装备区分；旧护道装备等级自动迁移，并为后续炼器页贯通打底。",
    },
    {
      date: "2026-07-06",
      title: "V1.4.2 渡劫准备与修仙装备",
      content:
        "角色页新增独立修仙装备：灵剑、法衣、云靴、护符，可消耗万象秘境材料与灵石淬炼，提升战力和渡劫稳定；渡劫成功公告升级为全服滚动弹窗，文字完整滚完后自动消失。",
    },
    {
      date: "2026-07-06",
      title: "V1.4.1 炼丹品相",
      content:
        "炼丹新增普通/上品/极品品相判定：上品附带丹香收益，极品额外成丹并获得更强收益；丹宗、丹修流派和洞府炼丹位会提高高品概率。",
    },
    {
      date: "2026-07-06",
      title: "V1.4.0 万象秘境抉择",
      content:
        "万象秘境探索和挑战凶兽胜利后有概率触发万象秘境抉择：古修遗府、灵脉泉眼、妖兽巢穴提供二选一奖励，让玩家按突破、材料、灵植或稳妥恢复目标做取舍。",
    },
    {
      date: "2026-07-06",
      title: "V1.3.9 道统差异深化",
      content:
        "三宗特性接入实战循环：剑宗提升战斗攻击，丹宗提高额外成丹与灵植灵气收益，符宗提升防御/气血并强化闭关净化心魔；道统页新增实战加成展示。",
    },
    {
      date: "2026-07-06",
      title: "V1.3.8 多材料订单与万象秘境灵种",
      content:
        "特殊订单支持多材料交付，护魂丹双材令现在需要冰魄雪莲+紫韵灵芝；任务详情显示多材料与背包进度；万象秘境奇遇新增灵种遗藏/灵芝孢子，可掉落高阶灵植种子。",
    },
    {
      date: "2026-07-06",
      title: "V1.3.7 万象秘境纵深与灵植炼丹闭环",
      content:
        "万象秘境稀有事件（8种奇遇：灵脉发现、古修遗府、心魔净化、野生灵药、稀有灵药、灵宝感应、深层灵脉、先贤启示）| 高阶灵植冰魄雪莲与紫韵灵芝 | 灵植丹方3种（雪莲清心丹、灵芝培元丹、冰魄护魂丹，按境界解锁）| 高阶道统灵植订单",
    },
    {
      date: "2026-07-06",
      title: "V1.3.6 怪物像素素材风格化",
      content:
        "战斗中所有怪物和BOSS不再使用通用emoji图标，改为与怪物名字风格匹配的中国色系像素素材：灵狼灰蓝铁色+赤金眼光、灵熊深棕厚重+赤金利爪、青丘灵狐橙黄赤金+灵气外溢、冥蛛暗紫红眼、饕餮赤金巨爪+灵蕴光环、混沌暗灰紫光……每种怪物拥有独特体色、眼光、爪色和灵气光环。登仙塔怪物各有金属/暗影/烈焰/灵光风格。",
    },
    {
      date: "2026-07-06",
      title: "V1.3.5 修行流派与心境称号",
      content:
        "修行页新增清修、剑修、丹修、雷修四种流派与心境称号：清修稳修并压制心魔，剑修强化战力和周天运转，丹修强化炼化灵气与灵植丹药循环，雷修强化雷云观想、顿悟与渡劫稳定性；流派可随时切换，继续深化已有修行系统。",
    },
    {
      date: "2026-07-06",
      title: "V1.3.4 修行瓶颈与心魔",
      content:
        "修行页新增顿悟与心魔机制：闭关参悟可积累顿悟并压制心魔，顿悟会提高大境界渡劫稳定性，心魔会压低成功率；渡劫失败会积累心魔并折损顿悟，突破成功则缓解心魔，让突破准备更有修仙味。",
    },
    {
      date: "2026-07-06",
      title: "V1.3.3 修行纵深第一期",
      content:
        "修行页新增每日修行课业：纳气晨课稳拿灵气修为，周天运转消耗灵气灵力快速冲修为，雷云观想消耗雷精为渡劫与元神做准备；课业每日每门一次，并受灵田、境界、功法影响，让修行从重复点击变成每日取舍。",
    },
    {
      date: "2026-07-06",
      title: "V1.3.2 道统差异与专属委派",
      content:
        "继续深化道统系统：三宗新增专属委派，剑宗可剑冢试剑获得星陨铁与灵石，丹宗可丹房看炉消耗凝露草换灵植种子，符宗可符阵巡检消耗灵石换魂晶与木灵珠；道统技能、职位、功勋更明确接入战力估算，让三宗定位更有差异。",
    },
    {
      date: "2026-07-06",
      title: "V1.3.1 道统纵深第一期",
      content:
        "道统系统从单纯选择道统和升级技能，扩展为职位、每日道统日课、贡献、功勋和道统宝库循环；新增外门/内门/亲传/执事/长老候补晋升，日课可获得贡献功勋，贡献可升级技能或兑换灵石、灵植种子、万象秘境材料。",
    },
    {
      date: "2026-07-06",
      title: "V1.3.0 玩法内容纵深第一期",
      content:
        "更新方向从新增入口转向深耕已有玩法：特殊订单新增道统灵植订单，要求提交蕴灵稻、凝露草、朱果、雪莲等灵植，奖励灵石、种子与万象秘境材料；特殊订单提交时会实际扣除目标物品，让灵田经营、订单、修仙、万象秘境材料形成更完整循环。",
    },
    {
      date: "2026-07-06",
      title: "V1.2.8 渡劫天雷节奏优化",
      content:
        "放慢渡劫特效节奏，天雷改为逐道落下；雷劈次数会随境界提升逐步增加，最多10道，并在动画中显示本次天雷数量。",
    },
    {
      date: "2026-07-06",
      title: "V1.2.7 初战妖兽引导修复",
      content:
        "修复修仙之途战斗胜利未计入修行志怪物击杀的问题；将初战凶兽任务改名为初战妖兽，并明确引导到地图 → 修仙之途 → 万象秘境，可通过红尘历练、万象秘境探索或登仙塔低层完成。",
    },
    {
      date: "2026-07-06",
      title: "V1.2.6 地图入口图标优化",
      content:
        "修仙地图中修仙之途入口统一为原版线性图标风格，去除表情图标；修仙市集简称为市集，限时活动简称为活动，让地图按钮更整齐清爽。",
    },
    {
      date: "2026-07-06",
      title: "V1.2.5 玩家独立邮箱",
      content:
        "邮件系统改为每个玩家独立存储邮件副本；全服邮件会拆分到每个玩家邮箱，定向补偿只进入目标玩家邮箱，领取状态也独立保存，避免共用邮件池造成显示混乱。",
    },
    {
      date: "2026-07-06",
      title: "V1.2.4 游戏内聊天",
      content:
        "新增世界频道聊天系统，登录后可在聊天面板发送和查看消息，支持实时轮询刷新。",
    },
    {
      date: "2026-07-06",
      title: "V1.2.3 排行差距与功法推荐",
      content:
        "排行榜增加距上一名/上榜差距提示，修仙页增加功法选择推荐，活动页增加每日签到联动提示。",
    },
    {
      date: "2026-07-06",
      title: "V1.2.2 战斗收益与活动中心",
      content:
        "战斗页增加区域产出说明与掉落用途标签，修仙页增加挂机收益估算，活动页升级为小型活动中心展示更多进行中目标。",
    },
    {
      date: "2026-07-06",
      title: "V1.2.1 引导与用途说明",
      content:
        "修行志目标增加地点提示，修仙市集商品显示用途标签，背包物品显示用途说明，角色页新增成长诊断建议。",
    },
    {
      date: "2026-07-06",
      title: "V1.2 全功能可玩性增强",
      content:
        "修行志扩展为全功能目标系统，新增钓鱼、挖矿、烹饪、收集、培育、功法、登塔、委托等长期与每日目标，并展示奖励内容，让每个玩法都有更明确的下一步。",
    },
    {
      date: "2026-07-06",
      title: "V1.1.8 时间控制按钮优化",
      content:
        "时间倍率控制移回剩余时间条旁，改为减速和加速两个按钮，避免占用金钱与灵石显示区域。",
    },
    {
      date: "2026-07-06",
      title: "V1.1.7 时间倍率控制",
      content:
        "顶部状态栏新增时间速度按钮，可在0.2、0.3、0.5、1、2、4、8倍之间切换，支持放慢节奏或快速推进一天。",
    },
    {
      date: "2026-07-06",
      title: "V1.1.6 顶部灵石显示",
      content:
        "在顶部金钱位置旁新增灵石余额显示，进入修仙市集购买功法、纳物符、乾坤袋时可直接查看当前灵石数量。",
    },
    {
      date: "2026-07-06",
      title: "V1.1.5 灵石购买修复",
      content:
        "修复修仙市集灵石商品购买弹窗仍显示铜钱、批量购买校验异常的问题；灵石商品现在显示灵石单价与总价，并按灵石余额购买。",
    },
    {
      date: "2026-07-06",
      title: "V1.1.4 修仙市集商品修复",
      content:
        "修复修仙市集入口只停留在普通万象市集的问题，现在进入后会打开独立修仙市集，直接展示灵石、丹药、纳物符、乾坤袋与功法秘籍。",
    },
    {
      date: "2026-07-06",
      title: "V1.1.3 修仙市集入口",
      content:
        "新增地图「修仙之途 → 修仙市集」按钮，点击后直接进入商店并定位到修仙市集，方便购买功法秘籍、纳物符和乾坤袋。",
    },
    {
      date: "2026-07-06",
      title: "V1.1.2 限时活动入口",
      content:
        "新增独立「限时活动」页面和地图按钮，妖潮来袭可查看进度、前往万象秘境讨伐并直接领取活动奖励，活动说明同步写入新手教程。",
    },
    {
      date: "2026-07-06",
      title: "V1.1.1 教程与后台奖励完善",
      content:
        "新手教程补充天劫渡劫、功法市集和仙途七线说明；后台 GM 邮件奖励新增修为、灵气、灵力、灵石发放，玩家领取邮件后直接写入当前角色。",
    },
    {
      date: "2026-07-05",
      title: "V1.1 七线补全",
      content:
        "修行志新增七条长期目标：修仙主线剧情、装备套装追求、深层万象秘境首通、仙盟互助、限时妖潮活动、下一步变强引导和回访福利，让玩家从新手到中后期都有明确追求与奖励反馈。",
    },
    {
      date: "2026-07-05",
      title: "V1.0.1 功法与灵石市集扩展",
      content:
        "修仙市集新增灵石兑换的纳物符、乾坤袋，可使用后永久扩展背包；新增青木长生诀、九霄雷诀、太虚归元功三门功法，购买秘籍后可学习并消耗灵气/修为参悟升级，提升修炼收益、战力和渡劫成功率。",
    },
    {
      date: "2026-07-05",
      title: "V1.0 天劫渡劫与挂机修仙",
      content:
        "增强离线奖励，修仙后离线和在线挂机都会获得灵气、修为与元神经验；跨大境界突破加入天劫渡劫、成功率展示、雷劈像素角色特效与雷鸣音效；渡劫失败会扣修为灵力、伤元神并可能掉级；新增养魂丹、涅魂丹用于恢复伤势和元神。",
    },
    {
      date: "2026-07-05",
      title: "V0.9.2 玩家强度提升",
      content:
        "提升资质成长带来的攻击、生命、身法和减伤收益；修复修行志根骨奖励字段错配；提高修行志目标奖励，让每日目标和七日成长的变强反馈更明显。",
    },
    {
      date: "2026-07-05",
      title: "V0.9.1 箱子制造与体力恢复修复",
      content:
        "修复工坊箱子满足材料仍无法制造的问题，增加材料扣除失败保护；新增体力缓慢恢复：在线每60秒自然恢复1点，游戏时间推进和体力行动也会折算恢复。",
    },
    {
      date: "2026-07-05",
      title: "V0.9 玩家爽感与回访优化",
      content:
        "• 新增回访离线收益：离线20分钟以上再次进入游戏，可获得铜钱、体力、灵石；修仙已解锁时额外获得修为和灵气，最多累计12小时。\n• 新增全局奖励弹窗，签到、邮件、今日目标、离线收益都会用更明显的奖励反馈展示。\n• 每日签到反馈强化：连续天数和获得物品会集中展示，让玩家每天回来更有仪式感。\n• 今日目标领取反馈强化，完成目标后会弹出奖励卡，提升成长正反馈。\n• 邮件奖励领取改为弹窗展示，补偿、活动奖励更清楚。",
    },
    {
      date: "2026-07-05",
      title: "V0.8 留存与上瘾循环优化",
      content:
        "• 主界面新增「今日目标/下一步」卡片，直接展示修行志当前目标、进度、奖励和一键领奖/前往。\n• 新增每日随机「今日机缘」，每天给灵田经营、战斗、登塔、移动、修行或铜钱收益不同加成。\n• 修行志奖励反馈强化，完成后更容易看到可领取状态；财运机缘会提高今日目标铜钱奖励。\n• 登仙塔新增每5层/10层阶段宝箱，最高层刷新后提示可领取，宝箱奖励灵石、魂晶、法宝碎片等。\n• 首日体验更集中：把灵田经营、地脉、修行志、修仙战斗串成更明确的下一步目标链。",
    },
    {
      date: "2026-07-05",
      title: "V0.6.11 登仙塔与实时爬塔榜",
      content:
        "• 万象秘境页新增「登仙塔」玩法：逐层自动挑战，胜利刷新个人最高层。\n• 每层消耗灵力与体力，层数越高敌人越强、奖励越丰厚。\n• 每5层出现精英，每10层出现镇塔首领。\n• 登塔奖励包含修为、灵气、灵石、魂晶、法宝碎片、灵蕴玉等。\n• 登仙塔页面新增实时爬塔榜，按玩家最新云档最高层排行展示。",
    },
    {
      date: "2026-07-05",
      title: "V0.6.10 元神/丹药/境界异常修复",
      content:
        "• 修复金丹境界表重复导致金丹后期显示/突破映射异常的问题。\n• 修复高级丹药被错误当作筑基丹生效的问题，造化丹、炼神丹、还虚丹等恢复各自正确效果。\n• 元神修炼页面显示与实际消耗对齐：修炼消耗灵气，经验上限显示正确。\n• 元神等级现在真实提升灵力上限，但不会直接影响境界突破条件。",
    },
    {
      date: "2026-07-05",
      title: "V0.6.9 玩家反馈系统",
      content:
        "• 首页「关于游戏」下新增功能反馈、BUG反馈、意见提交入口，设置页反馈入口保留。\n• 玩家提交的反馈会进入后台管理，可按类型与状态筛选查看。\n• 后台反馈管理中文化状态：待处理、已读、已解决、已关闭。",
    },
    {
      date: "2026-07-03",
      title: "前后端分离重构",
      content: "后端Express+MySQL，前端nginx托管，数据全部存数据库",
    },
    {
      date: "2026-07-03",
      title: "修仙 V0.5：万象秘境探索/炼器/道统/法宝",
      content: "⚔️万象秘境+🔨炼器+🏛️道统+🗡️法宝+🧘境界扩展",
    },
  ],
};
async function getConfig() {
  const [rows] = await pool.execute("SELECT `key`, `value` FROM config");
  const cfg = { ...defaultConfig };
  for (const r of rows) {
    try {
      cfg[r.key] = JSON.parse(r.value);
    } catch {
      cfg[r.key] = r.value;
    }
  }
  cfg.groupEntry = {
    enabled: Boolean(cfg.groupEntry?.enabled),
    buttonText: String(
      cfg.groupEntry?.buttonText || defaultConfig.groupEntry.buttonText,
    )
      .trim()
      .slice(0, 12),
    url: String(cfg.groupEntry?.url || "").trim().slice(0, 1000),
  };
  cfg.floatingWelfare = sanitizeFloatingWelfare(
    cfg.floatingWelfare,
    defaultConfig.floatingWelfare,
  );
  cfg.floatingWelfare.configVersion = floatingWelfareConfigVersion(
    cfg.floatingWelfare,
  );
  return cfg;
}
async function setConfig(key, value) {
  const v = typeof value === "string" ? value : JSON.stringify(value);
  await pool.execute(
    "INSERT INTO config (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?",
    [key, v, v],
  );
}
async function setConfigMulti(obj) {
  for (const [k, v] of Object.entries(obj)) await setConfig(k, v);
}

// ========== 公开 API ==========
app.get("/api/config", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    send(res, 200, await getConfig());
  } catch (e) {
    send(res, 500, { error: "服务器错误" });
  }
});

app.get("/api/client/manifest", async (req, res) => {
  try {
    const manifestPath = path.join(CLIENT_BUNDLE_DIR, "manifest.json");
    if (!fs.existsSync(manifestPath))
      return send(res, 503, { error: "客户端资源包尚未生成" });
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(manifestPath);
  } catch (e) {
    send(res, 500, { error: "服务器错误" });
  }
});
app.get("/api/client/web.zip", async (req, res) => {
  try {
    const zipPath = path.join(CLIENT_BUNDLE_DIR, "web.zip");
    if (!fs.existsSync(zipPath))
      return send(res, 503, { error: "客户端资源包尚未生成" });
    res.setHeader("Cache-Control", "no-store");
    res.download(zipPath, "taoyuan-web.zip");
  } catch (e) {
    send(res, 500, { error: "服务器错误" });
  }
});

// --- 认证 ---
app.post("/api/auth/register", async (req, res) => {
  try {
    const cfg = await getConfig();
    if (!cfg.registrationEnabled)
      return send(res, 403, { error: "注册已关闭" });
    const { username, password } = req.body;
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]{3,16}$/.test(username))
      return send(res, 400, { error: "用户名需3-16位中文/字母/数字/下划线" });
    if (!password || password.length < 6)
      return send(res, 400, { error: "密码至少6位" });
    const [exist] = await pool.execute(
      "SELECT id FROM users WHERE username = ?",
      [username],
    );
    if (exist.length) return send(res, 409, { error: "用户名已存在" });
    const id = uuidv4(),
      hash = bcrypt.hashSync(password, 10);
    const [count] = await pool.execute("SELECT COUNT(*) as c FROM users");
    const role = count[0].c === 0 ? "admin" : "user";
    await pool.execute(
      "INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)",
      [id, username, hash, role],
    );
    const token = uuidv4() + uuidv4();
    await pool.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", [
      token,
      id,
    ]);
    const [u] = await pool.execute("SELECT * FROM users WHERE id = ?", [id]);
    send(res, 200, {
      token,
      user: publicUser(u[0]),
      message: role === "admin" ? "注册成功，已设为管理员" : "注册成功",
    });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: "服务器错误" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE username = ?",
      [username],
    );
    if (!rows.length) return send(res, 401, { error: "用户名或密码错误" });
    const user = rows[0];
    if (user.disabled) return send(res, 403, { error: "账号已被封禁" });
    const hashStr = user.password_hash || "";
    const isBcrypt = hashStr.startsWith("$2");
    const valid = isBcrypt
      ? bcrypt.compareSync(password, hashStr)
      : verifyLegacyPassword(password, hashStr);
    if (!valid) return send(res, 401, { error: "用户名或密码错误" });
    // 自动升级旧密码为bcrypt
    if (!isBcrypt && valid) {
      const newHash = bcrypt.hashSync(password, 10);
      pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [
        newHash,
        user.id,
      ]);
    }
    const token = uuidv4() + uuidv4();
    await pool.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", [
      token,
      user.id,
    ]);
    send(res, 200, { token, user: publicUser(user) });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: "服务器错误" });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const h = req.headers.authorization || "",
      t = h.startsWith("Bearer ") ? h.slice(7) : "";
    if (t) await pool.execute("DELETE FROM sessions WHERE token = ?", [t]);
    send(res, 200, { ok: true });
  } catch (e) {
    send(res, 500, { error: "服务器错误" });
  }
});

app.get("/api/me", async (req, res) => {
  try {
    send(res, 200, { user: publicUser(await auth(req)) });
  } catch (e) {
    send(res, 500, { error: "服务器错误" });
  }
});

// --- 角色 ---
app.get("/api/characters", async (req, res) => {
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    const [rows] = await pool.execute(
      `SELECT c.id, c.slot, c.name, c.gender, c.created_at, c.updated_at, s.meta_json, s.updated_at AS save_updated_at
      FROM characters c LEFT JOIN saves s ON s.character_id = c.id
      WHERE c.user_id = ? ORDER BY c.slot`,
      [user.id],
    );
    send(res, 200, {
      characters: rows.map((r) => ({
        id: r.id,
        slot: r.slot,
        name: r.name,
        gender: r.gender,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        saveUpdatedAt: r.save_updated_at,
        meta:
          typeof r.meta_json === "string"
            ? safeJsonParse(r.meta_json, {})
            : r.meta_json || {},
      })),
    });
  } catch (e) {
    console.error("characters err", e);
    send(res, 500, { error: "服务器错误" });
  }
});

app.get("/api/check-char-name", async (req, res) => {
  try {
    const name = normalizePlayerName(req.query.name);
    if (!name) return send(res, 400, { error: "角色名不能为空" });
    const [rows] = await pool.execute(
      "SELECT id FROM characters WHERE name = ? LIMIT 1",
      [name],
    );
    if (rows.length) return send(res, 409, { error: "角色名已被使用" });
    send(res, 200, { ok: true, available: true });
  } catch (e) {
    console.error("check name err", e);
    send(res, 500, { error: "服务器错误" });
  }
});

app.post("/api/characters", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    const name = normalizePlayerName(req.body.name);
    const gender = String(req.body.gender || "male").slice(0, 20);
    const slot = Number.isFinite(Number(req.body.slot))
      ? Number(req.body.slot)
      : 0;
    if (slot < 0 || slot > 2) {
      conn.release();
      return send(res, 400, { error: "每个账号最多3个角色" });
    }
    const [ownedCharacters] = await conn.execute(
      "SELECT id FROM characters WHERE user_id = ?",
      [user.id],
    );
    if (ownedCharacters.length >= 3) {
      conn.release();
      return send(res, 409, { error: "每个账号最多创建3个角色" });
    }
    const raw = String(req.body.raw || "");
    const payloadCheck = validateSavePayload(raw, req.body.data);
    if (!payloadCheck.ok) {
      return send(res, 400, {
        error: "存档密文与明文数据不一致，请刷新后重试。",
        code: payloadCheck.code,
        saveGuard: true,
      });
    }
    const data = payloadCheck.data;
    const meta = req.body.meta || {};
    if (!name) {
      conn.release();
      return send(res, 400, { error: "角色名不能为空" });
    }
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9_]{1,20}$/.test(name)) {
      conn.release();
      return send(res, 400, { error: "角色名只能用中文/字母/数字/下划线" });
    }
    const id = uuidv4();
    const metaJson = safeStringify({ ...meta, playerName: name, gender });
    const dataJson = data ? JSON.stringify(data) : null;
    const summary = saveSummary(raw || dataJson || "", data, {
      ...meta,
      playerName: name,
      gender,
    });
    const initialReasons = validateInitialCharacterSave(summary);
    if (initialReasons.length) {
      await recordSaveAuditEvent(user, req, {
        eventType: "character_create_guard",
        status: "rejected",
        slot,
        characterId: id,
        playerName: name,
        rawSize: summary.rawSize,
        dataSize: summary.dataSize,
        dataHash: summary.dataHash,
        detail: { ...summary, reasons: initialReasons },
      });
      return send(res, 400, {
        error: "检测到异常初始存档，已拒绝创建。请刷新页面后重新创建角色。",
        saveGuard: true,
        reasons: initialReasons,
      });
    }
    await conn.beginTransaction();
    await conn.execute(
      "INSERT INTO characters (id, user_id, slot, name, gender) VALUES (?, ?, ?, ?, ?)",
      [id, user.id, slot, name, gender],
    );
    await conn.execute(
      "INSERT INTO saves (user_id, character_id, slot, player_name, raw, data_json, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE character_id=VALUES(character_id), player_name=VALUES(player_name), raw=VALUES(raw), data_json=VALUES(data_json), meta_json=VALUES(meta_json)",
      [
        user.id,
        id,
        slot,
        name,
        raw || dataJson || "",
        dataJson || raw || "",
        metaJson,
      ],
    );
    await persistAssetBaseline(conn, {
      userId: user.id,
      characterId: id,
      slot,
      save: data,
      mode: await assetAuthorityMode(conn),
    });
    await conn.commit();
    await recordSaveAuditEvent(user, req, {
      eventType: "character_create_save",
      status: "ok",
      slot,
      characterId: id,
      playerName: name,
      rawSize: summary.rawSize,
      dataSize: summary.dataSize,
      dataHash: summary.dataHash,
      detail: summary,
    });
    const [createdSaveRows] = await pool.execute(
      "SELECT updated_at FROM saves WHERE user_id = ? AND slot = ? LIMIT 1",
      [user.id, slot],
    );
    send(res, 200, {
      ok: true,
      character: { id, slot, name, gender },
      updatedAt: createdSaveRows[0]?.updated_at || null,
    });
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    if (e && (e.code === "ER_DUP_ENTRY" || e.errno === 1062))
      return send(res, 409, { error: "角色名已被使用" });
    console.error("create character err", e);
    send(res, 500, { error: "服务器错误" });
  } finally {
    conn.release();
  }
});

// --- 存档 ---
app.get("/api/saves", async (req, res) => {
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    const [rows] = await pool.execute(
      `SELECT s.slot, s.meta_json, s.updated_at, s.player_name, c.id AS character_id, c.name AS character_name, c.gender
      FROM saves s LEFT JOIN characters c ON c.id = s.character_id
      WHERE s.user_id = ? ORDER BY s.slot`,
      [user.id],
    );
    const saves = [];
    for (const r of rows)
      saves.push({
        slot: r.slot,
        meta:
          typeof r.meta_json === "string"
            ? safeJsonParse(r.meta_json, {})
            : r.meta_json || {},
        updatedAt: r.updated_at,
        characterId: r.character_id,
        playerName: r.character_name || r.player_name,
        gender: r.gender,
      });
    send(res, 200, { saves });
  } catch (e) {
    console.error("list saves err", e);
    send(res, 500, { error: "服务器错误" });
  }
});

app.get("/api/saves/:slot", async (req, res) => {
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    const [rows] = await pool.execute(
      "SELECT * FROM saves WHERE user_id = ? AND slot = ?",
      [user.id, Number(req.params.slot)],
    );
    if (!rows.length) return send(res, 404, { error: "存档不存在" });
    const r = rows[0];
    const rawResp = r.raw || "";
    await recordSaveAuditEvent(user, req, {
      eventType: "save_load",
      status: "ok",
      slot: r.slot,
      characterId: r.character_id,
      playerName: r.player_name,
      rawSize: rawResp.length,
      dataSize: String(r.data_json || "").length,
      dataHash:
        r.data_json || rawResp
          ? crypto
              .createHash("sha256")
              .update(String(r.data_json || rawResp))
              .digest("hex")
          : null,
      serverUpdatedAt: r.updated_at,
      detail: { updatedAt: r.updated_at },
    });
    send(res, 200, {
      slot: r.slot,
      raw: rawResp,
      meta: r.meta_json,
      updatedAt: r.updated_at,
      serverPageId: saveWriterMeta(r.meta_json).pageId,
      serverSequence: saveWriterMeta(r.meta_json).sequence,
    });
  } catch (e) {
    send(res, 500, { error: "服务器错误" });
  }
});

// Protected permanent/real-day consumables are settled directly into the
// authoritative cloud save. The client supplies only slot/item/quantity and a
// retry key; it never supplies effects, counters or timestamps.
app.post("/api/saves/:slot/consume-protected", async (req, res) => {
  const conn = await pool.getConnection();
  let transactionStarted = false;
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    const slot = Number(req.params.slot);
    const itemId = String(req.body?.itemId || "");
    const quantity = Number(req.body?.quantity ?? 1);
    const idempotencyKey = String(req.body?.idempotencyKey || "");
    const expectedVersion = String(req.body?.expectedVersion || "");
    const requestPageId = String(req.body?.pageId || "").slice(0, 80);
    const requestSequence = Number(req.body?.sequence || 0);
    if (!Number.isInteger(slot) || slot < 0 || slot > 2)
      return send(res, 400, { error: "槽位无效", code: "INVALID_SAVE_SLOT" });
    if (!PROTECTED_CONSUMABLES.has(itemId))
      return send(res, 400, { error: "道具不在权威消费清单中", code: "ITEM_NOT_PROTECTED" });
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 100)
      return send(res, 400, { error: "使用数量无效", code: "INVALID_QUANTITY" });
    if (!/^[A-Za-z0-9:_-]{16,96}$/.test(idempotencyKey))
      return send(res, 400, { error: "幂等键无效", code: "INVALID_IDEMPOTENCY_KEY" });
    if (!expectedVersion || !Number.isFinite(new Date(expectedVersion).getTime()))
      return send(res, 400, { error: "云档版本无效", code: "INVALID_SAVE_VERSION" });
    if (
      requestPageId &&
      (!/^[A-Za-z0-9-]{16,80}$/.test(requestPageId) ||
        !Number.isSafeInteger(requestSequence) ||
        requestSequence <= 0)
    )
      return send(res, 400, { error: "保存页面标识无效", code: "INVALID_SAVE_WRITER" });

    await conn.beginTransaction();
    transactionStarted = true;
    await conn.execute("SELECT id FROM users WHERE id = ? FOR UPDATE", [user.id]);
    const [characters] = await conn.execute(
      "SELECT id, name FROM characters WHERE user_id = ? AND slot = ? LIMIT 1 FOR UPDATE",
      [user.id, slot],
    );
    if (!characters.length) {
      await conn.rollback(); transactionStarted = false;
      return send(res, 404, { error: "角色不存在", code: "SAVE_CHARACTER_NOT_FOUND" });
    }
    const character = characters[0];
    const [saveRows] = await conn.execute(
      "SELECT raw, data_json, meta_json, updated_at FROM saves WHERE user_id = ? AND character_id = ? AND slot = ? LIMIT 1 FOR UPDATE",
      [user.id, character.id, slot],
    );
    if (!saveRows.length) {
      await conn.rollback(); transactionStarted = false;
      return send(res, 404, { error: "云存档不存在", code: "SAVE_NOT_FOUND" });
    }
    const current = saveRows[0];
    const [receiptRows] = await conn.execute(
      "SELECT * FROM consumable_use_receipts WHERE user_id = ? AND idempotency_key = ? LIMIT 1 FOR UPDATE",
      [user.id, idempotencyKey],
    );
    if (receiptRows.length) {
      const receipt = receiptRows[0];
      if (receipt.character_id !== character.id || Number(receipt.slot) !== slot || receipt.item_id !== itemId || Number(receipt.quantity) !== quantity) {
        await conn.rollback(); transactionStarted = false;
        return send(res, 409, { error: "幂等键已绑定其他消费请求", code: "IDEMPOTENCY_BINDING_MISMATCH" });
      }
      const currentHash = crypto
        .createHash("sha256")
        .update(canonicalJson(safeJsonParse(current.data_json, null)))
        .digest("hex");
      if (currentHash !== receipt.after_hash) {
        await conn.rollback(); transactionStarted = false;
        return send(res, 409, {
          error: "该消费请求已完成，但云档已有更新，请重新加载后继续。",
          code: "CONSUMABLE_RECEIPT_STALE",
          conflict: true,
          serverUpdatedAt: current.updated_at,
        });
      }
      await conn.commit(); transactionStarted = false;
      return send(res, 200, {
        ok: true, idempotent: true, receiptId: receipt.id, state: receipt.state,
        slot, raw: receipt.result_raw,
        data: safeJsonParse(receipt.result_data_json, null),
        effect: safeJsonParse(receipt.expected_effect_json, null),
        updatedAt: current.updated_at,
        serverPageId: saveWriterMeta(current.meta_json).pageId,
        serverSequence: saveWriterMeta(current.meta_json).sequence,
      });
    }
    if (new Date(current.updated_at).getTime() !== new Date(expectedVersion).getTime()) {
      await conn.rollback(); transactionStarted = false;
      return send(res, 409, {
        error: "云档版本已变化，请重新加载后再使用。", code: "SAVE_CONFLICT",
        conflict: true, serverUpdatedAt: current.updated_at,
        serverPageId: saveWriterMeta(current.meta_json).pageId,
        serverSequence: saveWriterMeta(current.meta_json).sequence,
      });
    }
    const trusted = safeJsonParse(current.data_json, null);
    if (!trusted || typeof trusted !== "object" || Array.isArray(trusted)) {
      await conn.rollback(); transactionStarted = false;
      return send(res, 422, { error: "服务器云档无法解密或结构异常", code: "TRUSTED_SAVE_INVALID" });
    }
    // Validate the persisted ciphertext too; this prevents settling against a
    // data_json/raw disagreement left by an old or partial write.
    const payloadCheck = validateSavePayload(current.raw, trusted);
    if (!payloadCheck.ok) {
      await conn.rollback(); transactionStarted = false;
      return send(res, 422, { error: "服务器云档密文校验失败", code: payloadCheck.code });
    }
    const nowMs = Date.now();
    const applied = applyProtectedConsumable({ data: payloadCheck.data, itemId, quantity, nowMs });
    if (!applied.ok) {
      await conn.rollback(); transactionStarted = false;
      const status = applied.code === "INSUFFICIENT_INVENTORY" ? 409 : 422;
      return send(res, status, { error: applied.message, code: applied.code });
    }
    const beforeHash = crypto.createHash("sha256").update(canonicalJson(payloadCheck.data)).digest("hex");
    const afterHash = crypto.createHash("sha256").update(canonicalJson(applied.data)).digest("hex");
    const resultRaw = encryptSave(applied.data);
    const resultDataJson = JSON.stringify(applied.data);
    const receiptId = uuidv4();
    await conn.execute(
      `INSERT INTO consumable_use_receipts
       (id,user_id,character_id,slot,item_id,quantity,idempotency_key,old_save_updated_at,before_hash,after_hash,expected_effect_json,result_raw,result_data_json,state)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'issued')`,
      [receiptId, user.id, character.id, slot, itemId, quantity, idempotencyKey,
       current.updated_at, beforeHash, afterHash, JSON.stringify(applied.effect), resultRaw, resultDataJson],
    );
    await sampleTrustedSnapshot(conn, user.id, slot, {
      ...current, character_id: character.id, player_name: character.name,
    });
    const currentMeta = safeJsonParse(current.meta_json, {});
    const currentWriter = saveWriterMeta(current.meta_json);
    const authoritySequence = Math.max(
      currentWriter.sequence + 1,
      Number.isSafeInteger(requestSequence) ? requestSequence : 0,
    );
    const protectedMeta = JSON.stringify({
      ...currentMeta,
      savePageId: requestPageId || currentWriter.pageId,
      saveSequence: authoritySequence,
      authorityUpdated: true,
    });
    await conn.execute(
      "UPDATE saves SET raw = ?, data_json = ?, meta_json = ? WHERE user_id = ? AND character_id = ? AND slot = ?",
      [resultRaw, resultDataJson, protectedMeta, user.id, character.id, slot],
    );
    await persistAssetBaseline(conn, {
      userId: user.id, characterId: character.id, slot, save: applied.data,
      mode: await assetAuthorityMode(conn),
    });
    await conn.execute(
      `INSERT INTO asset_ledger
       (user_id, character_id, slot, idempotency_key, event_type, source_type, source_id,
        delta_json, before_hash, after_hash)
       VALUES (?, ?, ?, ?, 'protected_consumable', 'consume_protected', ?, ?, ?, ?)`,
      [
        user.id,
        character.id,
        slot,
        `consume-protected:${receiptId}`,
        receiptId,
        JSON.stringify({ items: [{ itemId, quantity: -quantity }], effect: applied.effect }),
        beforeHash,
        afterHash,
      ],
    );
    await conn.execute(
      "UPDATE consumable_use_receipts SET state='consumed', consumed_at=NOW(6) WHERE id=? AND state='issued'",
      [receiptId],
    );
    const [updatedRows] = await conn.execute(
      "SELECT updated_at FROM saves WHERE user_id=? AND character_id=? AND slot=? LIMIT 1",
      [user.id, character.id, slot],
    );
    await conn.commit(); transactionStarted = false;
    return send(res, 200, {
      ok: true, idempotent: false, receiptId, state: "consumed", slot,
      raw: resultRaw, data: applied.data, effect: applied.effect,
      updatedAt: updatedRows[0]?.updated_at || null,
      serverPageId: requestPageId || currentWriter.pageId,
      serverSequence: authoritySequence,
    });
  } catch (e) {
    if (transactionStarted) { try { await conn.rollback(); } catch {} }
    if (e?.code === "ER_DUP_ENTRY")
      return send(res, 409, { error: "并发请求冲突，请使用同一幂等键重试", code: "IDEMPOTENCY_RACE" });
    if (["ER_NO_SUCH_TABLE", "ER_BAD_TABLE_ERROR"].includes(e?.code))
      return send(res, 503, { error: "权威消费账本迁移尚未部署", code: "CONSUMABLE_AUTHORITY_UNAVAILABLE" });
    console.error("consume protected err", e);
    return send(res, 500, { error: "服务器错误" });
  } finally {
    conn.release();
  }
});

app.put("/api/saves/:slot", async (req, res) => {
  const conn = await pool.getConnection();
  let transactionStarted = false;
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    const slot = Number(req.params.slot);
    if (!Number.isInteger(slot) || slot < 0 || slot > 2)
      return send(res, 400, { error: "槽位无效", code: "INVALID_SAVE_SLOT" });
    const { raw, meta, data, expectedServerUpdatedAt } = req.body || {};
    const playerName = normalizePlayerName((meta && meta.playerName) || "");
    const incomingWriter = saveWriterMeta(meta);
    if (
      incomingWriter.pageId &&
      (!/^[A-Za-z0-9-]{16,80}$/.test(incomingWriter.pageId) ||
        !Number.isSafeInteger(incomingWriter.sequence) ||
        incomingWriter.sequence <= 0)
    )
      return send(res, 400, { error: "保存页面标识无效", code: "INVALID_SAVE_WRITER" });
    const metaJson = meta ? JSON.stringify(meta) : null;
    const payloadCheck = validateSavePayload(raw, data);
    if (!payloadCheck.ok)
      return send(res, 400, {
        error: "存档密文与明文数据不一致，请重新加载后保存。",
        code: payloadCheck.code,
        saveGuard: true,
      });
    const plainData = payloadCheck.data;
    const dataJson = JSON.stringify(plainData);
    const summary = saveSummary(raw || dataJson || "", plainData, meta || {});

    await conn.beginTransaction();
    transactionStarted = true;
    const [chars] = await conn.execute(
      "SELECT id, name FROM characters WHERE user_id = ? AND slot = ? LIMIT 1 FOR UPDATE",
      [user.id, slot],
    );
    if (!chars.length) {
      await conn.rollback();
      transactionStarted = false;
      return send(res, 409, {
        error: "当前槽位角色不存在，请返回角色列表刷新。",
        code: "SAVE_CHARACTER_NOT_FOUND",
      });
    }
    const saveCharacterId = chars[0].id;
    const authoritativePlayerName =
      normalizePlayerName(chars[0].name) || playerName;
    const [currentRows] = await conn.execute(
      "SELECT updated_at, character_id, player_name, raw, data_json, meta_json FROM saves WHERE user_id = ? AND slot = ? LIMIT 1 FOR UPDATE",
      [user.id, slot],
    );
    const currentSaveRow = currentRows[0] || null;
    if (currentSaveRow) {
      if (
        currentSaveRow.character_id &&
        currentSaveRow.character_id !== saveCharacterId
      ) {
        await conn.rollback();
        transactionStarted = false;
        return send(res, 409, {
          error: "角色与存档归属不一致，请联系管理员。",
          code: "SAVE_CHARACTER_MISMATCH",
        });
      }
      if (
        expectedServerUpdatedAt &&
        new Date(expectedServerUpdatedAt).getTime() !==
          new Date(currentSaveRow.updated_at).getTime()
      ) {
        await conn.rollback();
        transactionStarted = false;
        return send(res, 409, {
          error: "服务器存档已由其他页面或设备更新，请重新进入角色核对进度。",
          code: "SAVE_CONFLICT",
          conflict: true,
          serverUpdatedAt: currentSaveRow.updated_at,
          serverPageId: saveWriterMeta(currentSaveRow.meta_json).pageId,
          serverSequence: saveWriterMeta(currentSaveRow.meta_json).sequence,
        });
      }
    }
    let matchedGrantIds = [];
    let authorizedGrantDelta = null;
    if (currentSaveRow?.data_json) {
      const [issuedGrantRows] = await conn.execute(
        `SELECT id, payload_json AS rewards_json FROM asset_grants
         WHERE user_id = ? AND character_id = ? AND slot = ? AND state = 'issued'
         ORDER BY issued_at, id FOR UPDATE`,
        [user.id, saveCharacterId, slot],
      );
      if (issuedGrantRows.length) {
        const previousPlainData = safeJsonParse(currentSaveRow.data_json, null);
        const grantMatch = previousPlainData
          ? matchIssuedMailGrants(
              previousPlainData,
              plainData,
              parseGrantRows(issuedGrantRows, safeJsonParse),
            )
          : { matchedIds: [], mismatch: true };
        if (grantMatch.mismatch) {
          await conn.rollback();
          transactionStarted = false;
          return send(res, 409, {
            error: "存档中的奖励增量与服务器授权不匹配，请重新加载存档后重试。",
            code: "ASSET_GRANT_DELTA_MISMATCH",
            conflict: true,
            pendingGrant: true,
            serverUpdatedAt: currentSaveRow.updated_at,
          });
        }
        matchedGrantIds = grantMatch.matchedIds;
        authorizedGrantDelta = grantMatch.authorizedDelta;
      }
    }
    const guardResult = validateSaveProgression({
      summary,
      currentSaveRow,
      plainData,
      authorizedDelta: authorizedGrantDelta,
    });
    if (guardResult?.abnormal) {
      await recordSaveAuditEvent(
        user,
        req,
        {
          eventType: "save_auto_rollback",
          status: "rolled_back",
          slot,
          characterId: currentSaveRow.character_id || saveCharacterId,
          playerName: currentSaveRow.player_name || authoritativePlayerName,
          rawSize: summary.rawSize,
          dataSize: summary.dataSize,
          dataHash: summary.dataHash,
          clientLoadedAt: meta?.lastLoadedAt || null,
          serverUpdatedAt: currentSaveRow.updated_at,
          detail: {
            ...summary,
            reasons: guardResult.reasons,
            dayDelta: guardResult.dayDelta,
          },
        },
        conn,
      );
      await conn.commit();
      transactionStarted = false;
      return send(res, 422, {
        error: "检测到高置信数据异常，已恢复为服务器可信存档。",
        code: "SAVE_AUTO_ROLLED_BACK",
        rollback: true,
        raw: currentSaveRow.raw || currentSaveRow.data_json || "",
        meta: safeJsonParse(currentSaveRow.meta_json, {}),
        updatedAt: currentSaveRow.updated_at,
        reasons: guardResult.reasons,
      });
    }
    await sampleTrustedSnapshot(conn, user.id, slot, currentSaveRow);
    await conn.execute(
      "INSERT INTO saves (user_id, character_id, slot, player_name, raw, data_json, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE character_id=VALUES(character_id), player_name=VALUES(player_name), raw=VALUES(raw), data_json=VALUES(data_json), meta_json=VALUES(meta_json)",
      [
        user.id,
        saveCharacterId,
        slot,
        authoritativePlayerName || null,
        raw || dataJson || "",
        dataJson || raw || "",
        metaJson,
      ],
    );
    const baselineResult = await persistAssetBaseline(conn, {
      userId: user.id,
      characterId: saveCharacterId,
      slot,
      save: plainData,
      mode: await assetAuthorityMode(conn),
    });
    // baseline_only only observes accepted state/hash. Positive client deltas
    // are not grants; future ledger/grant enforcement owns authorization.
    const [savedRows] = await conn.execute(
      "SELECT updated_at, character_id, player_name FROM saves WHERE user_id = ? AND slot = ? LIMIT 1",
      [user.id, slot],
    );
    if (matchedGrantIds.length) {
      const placeholders = matchedGrantIds.map(() => "?").join(",");
      await conn.execute(
        `UPDATE asset_grants SET state = 'consumed', consumed_at = NOW()
         WHERE user_id = ? AND character_id = ? AND slot = ? AND state = 'issued'
           AND id IN (${placeholders})`,
        [user.id, saveCharacterId, slot, ...matchedGrantIds],
      );
      for (const grantId of matchedGrantIds) {
        await conn.execute(
          `INSERT INTO asset_ledger
           (user_id, character_id, slot, idempotency_key, event_type, source_type, source_id,
            delta_json, before_hash, after_hash)
           SELECT user_id, character_id, slot, CONCAT('grant-apply:', id), 'grant_consumed',
                  source_type, source_id, payload_json, NULL, ?
           FROM asset_grants WHERE id = ? AND user_id = ?
           ON DUPLICATE KEY UPDATE idempotency_key = VALUES(idempotency_key)`,
          [baselineResult.saveHash, grantId, user.id],
        );
      }
    }
    await conn.commit();
    transactionStarted = false;

    try {
      if (plainData) {
        const p =
          plainData.player ||
          plainData.playerStore ||
          (plainData.stores && plainData.stores.player) ||
          {};
        const cu =
          plainData.cultivation ||
          plainData.cultivationStore ||
          (plainData.stores && plainData.stores.cultivation) ||
          {};
        const g =
          plainData.game ||
          plainData.gameStore ||
          (plainData.stores && plainData.stores.game) ||
          {};
        const asc =
          plainData.ascension ||
          plainData.ascensionStore ||
          (plainData.stores && plainData.stores.ascension) ||
          {};
        await pool.execute(
          "INSERT INTO leaderboard (user_id, username, player_name, realm_name, cultivation, aura, money, game_year, game_season, game_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE player_name=VALUES(player_name), realm_name=VALUES(realm_name), cultivation=VALUES(cultivation), aura=VALUES(aura), money=VALUES(money), game_year=VALUES(game_year), game_season=VALUES(game_season), game_day=VALUES(game_day)",
          [
            user.id,
            user.username,
            authoritativePlayerName || p.playerName || p.name || "无名",
            realmNameFromSave(cu, asc),
            cu.cultivation || 0,
            cu.aura || 0,
            p.money || (meta && meta.money) || 0,
            g.year || (meta && meta.year) || 1,
            g.season || (meta && meta.season) || "春",
            g.day || (meta && meta.day) || 1,
          ],
        );
      }
    } catch (e2) {
      console.error("lb err", e2.message);
    }
    await recordSaveAuditEvent(user, req, {
      eventType: "save_write",
      status: "ok",
      slot,
      characterId: saveCharacterId,
      playerName: authoritativePlayerName,
      rawSize: summary.rawSize,
      dataSize: summary.dataSize,
      dataHash: summary.dataHash,
      clientLoadedAt: meta?.lastLoadedAt || null,
      serverUpdatedAt: savedRows[0]?.updated_at || null,
      detail: summary,
    });
    send(res, 200, {
      ok: true,
      updatedAt: savedRows[0]?.updated_at || null,
      serverPageId: incomingWriter.pageId,
      serverSequence: incomingWriter.sequence,
      assetAuthority: {
        mode: baselineResult.mode,
        baselineEstablished: baselineResult.established,
      },
    });
  } catch (e) {
    if (transactionStarted) {
      try {
        await conn.rollback();
      } catch {}
    }
    console.error("save err", e);
    send(res, 500, { error: "服务器错误" });
  } finally {
    conn.release();
  }
});

app.delete("/api/saves/:slot", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    const slot = Number(req.params.slot);
    if (!Number.isInteger(slot) || slot < 0 || slot > 2)
      return send(res, 400, { error: "槽位无效" });
    const [before] = await conn.execute(
      `SELECT s.character_id, COALESCE(c.name, s.player_name) AS player_name, s.updated_at, LENGTH(s.raw) AS raw_size, LENGTH(s.data_json) AS data_size
      FROM saves s LEFT JOIN characters c ON c.id = s.character_id
      WHERE s.user_id = ? AND s.slot = ? LIMIT 1`,
      [user.id, slot],
    );
    const [chars] = await conn.execute(
      "SELECT id, name FROM characters WHERE user_id = ? AND slot = ? LIMIT 1",
      [user.id, slot],
    );
    await conn.beginTransaction();
    await conn.execute("DELETE FROM saves WHERE user_id = ? AND slot = ?", [
      user.id,
      slot,
    ]);
    await conn.execute(
      "DELETE FROM characters WHERE user_id = ? AND slot = ?",
      [user.id, slot],
    );
    await conn.commit();
    const deletedCharacter = chars[0] || null;
    const auditSource = before[0] || deletedCharacter || {};
    await recordSaveAuditEvent(user, req, {
      eventType: "save_delete",
      status: "ok",
      slot,
      characterId: auditSource.character_id || deletedCharacter?.id || null,
      playerName: auditSource.player_name || deletedCharacter?.name || null,
      rawSize: auditSource.raw_size || 0,
      dataSize: auditSource.data_size || 0,
      serverUpdatedAt: auditSource.updated_at || null,
      detail: { deleted: true, characterDeleted: Boolean(deletedCharacter) },
    });
    send(res, 200, { ok: true });
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    console.error("delete save err", e);
    send(res, 500, { error: "服务器错误" });
  } finally {
    conn.release();
  }
});

// --- 签到 ---
function localDateKey(offsetHours = 8, date = new Date()) {
  return new Date(date.getTime() + offsetHours * 3600000)
    .toISOString()
    .slice(0, 10);
}
function addDaysKey(key, days) {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
async function getCheckinStreak(userId, today, db = pool) {
  const [rows] = await db.execute(
    "SELECT DATE_FORMAT(check_date, '%Y-%m-%d') AS check_date FROM checkins WHERE user_id = ? ORDER BY check_date DESC LIMIT 60",
    [userId],
  );
  const set = new Set(rows.map((r) => String(r.check_date).slice(0, 10)));
  let cursor = today;
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = addDaysKey(cursor, -1);
  }
  return streak;
}
function checkinItemsForStreak(streak) {
  const day = ((Math.max(1, streak) - 1) % 7) + 1;
  const items = [];
  if (day === 1) items.push({ itemId: "seed_cabbage", quantity: 5 });
  if (day === 2) items.push({ itemId: "basic_fertilizer", quantity: 3 });
  if (day === 3) items.push({ itemId: "seed_potato", quantity: 4 });
  if (day === 4) items.push({ itemId: "quality_fertilizer", quantity: 2 });
  if (day === 5) items.push({ itemId: "seed_radish", quantity: 4 });
  if (day === 6) items.push({ itemId: "ancient_seed", quantity: 1 });
  if (day === 7)
    items.push(
      { itemId: "quality_fertilizer", quantity: 5 },
      { itemId: "seed_watermelon", quantity: 3 },
    );
  return items;
}
function checkinRewardForStreak(streak) {
  const day = ((Math.max(1, streak) - 1) % 7) + 1;
  return 300 + day * 100 + Math.floor((Math.max(1, streak) - 1) / 7) * 50;
}

app.get("/api/checkin", async (req, res) => {
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    const today = localDateKey(8);
    const [rows] = await pool.execute(
      `SELECT c.id, g.id AS grant_id, g.state AS grant_state, g.slot AS grant_slot
       FROM checkins c
       LEFT JOIN asset_grants g
         ON g.user_id = c.user_id AND g.source_type = 'daily_checkin'
        AND g.source_id = DATE_FORMAT(c.check_date, '%Y-%m-%d')
       WHERE c.user_id = ? AND c.check_date = ? LIMIT 1`,
      [user.id, today],
    );
    const [total] = await pool.execute(
      "SELECT COUNT(*) as c FROM checkins WHERE user_id = ?",
      [user.id],
    );
    const currentStreak = await getCheckinStreak(user.id, today);
    const nextStreak = rows.length ? currentStreak : currentStreak + 1;
    send(res, 200, {
      // An issued grant is deliberately retryable: the client may have lost
      // the claim response before applying and saving the exact reward delta.
      checked: rows.length > 0 && rows[0].grant_state !== "issued",
      pendingGrant: rows[0]?.grant_state === "issued",
      pendingSlot:
        rows[0]?.grant_state === "issued" ? Number(rows[0].grant_slot) : null,
      today,
      timezone: "Asia/Shanghai",
      total: total[0].c,
      streak: currentStreak,
      nextStreak,
      reward: checkinRewardForStreak(nextStreak),
      items: checkinItemsForStreak(nextStreak),
    });
  } catch (e) {
    console.error("checkin status err", e);
    send(res, 500, { error: "服务器错误" });
  }
});

app.post("/api/checkin", async (req, res) => {
  const conn = await pool.getConnection();
  let transactionStarted = false;
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    const today = localDateKey(8);
    await conn.beginTransaction();
    transactionStarted = true;

    // The account row serializes same-user claims even before a checkins row
    // exists; the unique source/grant keys remain the final idempotency guard.
    await conn.execute("SELECT id FROM users WHERE id = ? FOR UPDATE", [user.id]);
    const [bindingRows] = await conn.execute(
      `SELECT c.slot, c.id AS character_id
       FROM characters c
       JOIN saves s
         ON s.user_id = c.user_id AND s.slot = c.slot AND s.character_id = c.id
       WHERE c.user_id = ? ORDER BY c.slot FOR UPDATE`,
      [user.id],
    );
    const binding = resolveRewardCharacter(bindingRows, req.body?.slot);
    if (binding.kind !== "ok") {
      await conn.rollback();
      transactionStarted = false;
      return send(res, binding.kind === "invalid_slot" ? 400 : 409, {
        error:
          binding.kind === "invalid_slot"
            ? "角色槽位无效，请重新进入角色后重试。"
            : "该角色槽位不属于当前账号或未绑定当前存档。",
        code:
          binding.kind === "invalid_slot"
            ? "CHECKIN_INVALID_SLOT"
            : "CHECKIN_SLOT_NOT_BOUND",
      });
    }
    const selected = binding.binding;
    const [existingCheckins] = await conn.execute(
      "SELECT id, reward FROM checkins WHERE user_id = ? AND check_date = ? FOR UPDATE",
      [user.id, today],
    );
    const yesterday = addDaysKey(today, -1);
    const yesterdayStreak = await getCheckinStreak(user.id, yesterday, conn);
    const streak = yesterdayStreak + 1;
    const reward = checkinRewardForStreak(streak);
    const items = checkinItemsForStreak(streak);
    const rewards = { money: reward, items };

    const repo = {
      async findGrant(userId, sourceType, sourceId) {
        const [rows] = await conn.execute(
          `SELECT id, character_id AS characterId, slot, state AS status,
                  payload_json AS rewardsJson
           FROM asset_grants
           WHERE user_id = ? AND source_type = ? AND source_id = ?
           LIMIT 1 FOR UPDATE`,
          [userId, sourceType, sourceId],
        );
        return rows.length
          ? { ...rows[0], rewards: safeJsonParse(rows[0].rewardsJson, {}) }
          : null;
      },
      async insertGrant(grant) {
        await conn.execute(
          `INSERT INTO asset_grants
           (id, user_id, character_id, slot, grant_type, source_type, source_id,
            payload_json, state)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'issued')`,
          [
            grant.id,
            grant.userId,
            grant.characterId,
            grant.slot,
            grant.grantType,
            grant.sourceType,
            grant.sourceId,
            JSON.stringify(grant.rewards),
          ],
        );
      },
      async insertIssuedLedger(grant) {
        await conn.execute(
          `INSERT INTO asset_ledger
           (user_id, character_id, slot, idempotency_key, event_type,
            source_type, source_id, delta_json)
           VALUES (?, ?, ?, ?, 'grant_issued', ?, ?, ?)`,
          [
            grant.userId,
            grant.characterId,
            grant.slot,
            `grant-issue:${grant.id}`,
            grant.sourceType,
            grant.sourceId,
            JSON.stringify(grant.rewards),
          ],
        );
      },
    };
    const grantResult = await issueSourceGrant(repo, {
      userId: user.id,
      characterId: selected.characterId,
      slot: selected.slot,
      sourceType: "daily_checkin",
      sourceId: today,
      grantType: "checkin_reward",
      grantId: uuidv4(),
      rewards,
    });
    if (grantResult.kind === "character_mismatch") {
      await conn.rollback();
      transactionStarted = false;
      return send(res, 409, {
        error: "今日签到奖励已绑定其他角色，请切回原角色重试。",
        code: "CHECKIN_GRANT_CHARACTER_MISMATCH",
      });
    }
    if (grantResult.kind === "consumed") {
      await conn.rollback();
      transactionStarted = false;
      return send(res, 409, { error: "今天已经签到过了", code: "CHECKIN_APPLIED" });
    }
    if (existingCheckins.length && !grantResult.idempotent) {
      await conn.rollback();
      transactionStarted = false;
      return send(res, 409, {
        error: "今天已经签到过了（旧版记录无待应用奖励）。",
        code: "LEGACY_CHECKIN_APPLIED",
      });
    }
    if (!existingCheckins.length)
      await conn.execute(
        "INSERT INTO checkins (user_id, check_date, reward) VALUES (?, ?, ?)",
        [user.id, today, reward],
      );
    await conn.commit();
    transactionStarted = false;
    const issuedRewards = grantResult.grant.rewards || rewards;
    send(res, 200, {
      ok: true,
      idempotent: grantResult.idempotent,
      grantId: grantResult.grant.id,
      grantStatus: "issued",
      pendingSave: true,
      slot: selected.slot,
      today,
      timezone: "Asia/Shanghai",
      reward: Number(issuedRewards.money || 0),
      items: issuedRewards.items || [],
      rewards: issuedRewards,
      streak,
    });
  } catch (e) {
    if (transactionStarted) {
      try { await conn.rollback(); } catch {}
    }
    console.error("checkin post err", e);
    send(res, 500, { error: "服务器错误" });
  } finally {
    conn.release();
  }
});

// --- 待确认资产授权恢复 ---
app.get("/api/asset-grants/pending", async (req, res) => {
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    const slot = Number(req.query?.slot);
    if (!Number.isInteger(slot) || slot < 0 || slot > 2)
      return send(res, 400, { error: "角色槽位无效", code: "INVALID_GRANT_SLOT" });
    const [bindings] = await pool.execute(
      `SELECT c.id AS character_id
       FROM characters c
       JOIN saves s
         ON s.user_id = c.user_id AND s.slot = c.slot AND s.character_id = c.id
       WHERE c.user_id = ? AND c.slot = ? LIMIT 1`,
      [user.id, slot],
    );
    if (!bindings.length)
      return send(res, 409, {
        error: "该角色槽位不属于当前账号或未绑定当前存档。",
        code: "GRANT_SLOT_NOT_BOUND",
      });
    const [rows] = await pool.execute(
      `SELECT id, grant_type, source_type, source_id, payload_json, issued_at
       FROM asset_grants
       WHERE user_id = ? AND character_id = ? AND slot = ? AND state = 'issued'
       ORDER BY issued_at, id`,
      [user.id, bindings[0].character_id, slot],
    );
    res.setHeader("Cache-Control", "no-store");
    send(res, 200, {
      grants: rows.map((row) => ({
        id: row.id,
        grantType: row.grant_type,
        sourceType: row.source_type,
        sourceId: row.source_id,
        issuedAt: row.issued_at,
        rewards: sanitizeRewardPayload(safeJsonParse(row.payload_json, {})),
      })),
    });
  } catch (e) {
    console.error("list pending asset grants err", e);
    send(res, 500, { error: "服务器错误" });
  }
});

// --- 邮件 ---
app.get("/api/mails", async (req, res) => {
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    const [mails] = await pool.execute(
      `SELECT um.*, rg.state AS grant_status
       FROM user_mails um
       LEFT JOIN asset_grants rg
         ON rg.id = um.grant_id AND rg.user_id = um.user_id AND rg.source_type = 'mail_claim'
       WHERE um.user_id = ? ORDER BY um.created_at DESC`,
      [user.id],
    );
    send(res, 200, {
      mails: mails.map((m) => ({
        id: m.id,
        title: m.title,
        content: m.content,
        rewards: sanitizeRewardPayload(safeJsonParse(m.rewards, {})),
        from: m.from_name,
        createdAt: m.created_at,
        // An issued-but-unapplied grant remains claimable in old clients, so a
        // lost HTTP response can replay the same grant instead of losing it.
        claimed: !!m.claimed && m.grant_status !== "issued",
      })),
    });
  } catch (e) {
    console.error("list user mails err", e);
    send(res, 500, { error: "服务器错误" });
  }
});

app.delete("/api/mails/claimed", async (req, res) => {
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    const [result] = await pool.execute(
      `DELETE um FROM user_mails um
       LEFT JOIN asset_grants rg
         ON rg.id = um.grant_id AND rg.user_id = um.user_id
        AND rg.source_type = 'mail_claim'
       WHERE um.user_id = ? AND um.claimed = 1
         AND (um.grant_id IS NULL OR rg.state = 'consumed')`,
      [user.id],
    );
    send(res, 200, { ok: true, deleted: Number(result.affectedRows || 0) });
  } catch (e) {
    console.error("cleanup claimed user mails err", e);
    send(res, 500, { error: "服务器错误" });
  }
});

app.post("/api/mails/:id/claim", async (req, res) => {
  const conn = await pool.getConnection();
  let transactionStarted = false;
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    await conn.beginTransaction();
    transactionStarted = true;
    const [mailRows] = await conn.execute(
      "SELECT * FROM user_mails WHERE id = ? AND user_id = ? FOR UPDATE",
      [req.params.id, user.id],
    );
    if (!mailRows.length) {
      await conn.rollback();
      transactionStarted = false;
      return send(res, 404, { error: "邮件不存在" });
    }
    const mail = mailRows[0];
    const [bindingRows] = await conn.execute(
      `SELECT c.slot, c.id AS character_id
       FROM characters c
       JOIN saves s
         ON s.user_id = c.user_id AND s.slot = c.slot AND s.character_id = c.id
       WHERE c.user_id = ? ORDER BY c.slot FOR UPDATE`,
      [user.id],
    );
    const binding = resolveMailClaimCharacter(bindingRows, req.body?.slot);
    if (binding.kind !== "ok") {
      await conn.rollback();
      transactionStarted = false;
      const errors = {
        invalid_slot: {
          status: 400,
          error: "角色槽位无效，请刷新客户端后重试。",
          code: "MAIL_CLAIM_INVALID_SLOT",
        },
        slot_not_bound: {
          status: 409,
          error: "该角色槽位不属于当前账号或未绑定当前存档，请重新进入角色后重试。",
          code: "MAIL_CLAIM_SLOT_NOT_BOUND",
        },
        character_required: {
          status: 409,
          error: "请先进入一个角色后再领取邮件。",
          code: "MAIL_CLAIM_CHARACTER_REQUIRED",
        },
        client_refresh_required: {
          status: 409,
          error: "检测到多个角色，旧版客户端无法确认奖励归属。请刷新或更新客户端后重试。",
          code: "MAIL_CLAIM_CLIENT_REFRESH_REQUIRED",
        },
      };
      const detail = errors[binding.kind];
      return send(res, detail.status, { error: detail.error, code: detail.code });
    }
    const selectedSave = binding.binding;
    const [existingRows] = await conn.execute(
      `SELECT id, payload_json AS rewards_json, state AS status, slot, character_id FROM asset_grants
       WHERE user_id = ? AND source_type = 'mail_claim' AND source_id = ? LIMIT 1 FOR UPDATE`,
      [user.id, mail.id],
    );
    if (existingRows.length) {
      const grant = existingRows[0];
      if (
        Number(grant.slot) !== selectedSave.slot ||
        grant.character_id !== selectedSave.characterId
      ) {
        await conn.rollback();
        transactionStarted = false;
        return send(res, 409, {
          error: "该邮件奖励已绑定其他角色，请切回原角色后重试。",
          code: "MAIL_GRANT_CHARACTER_MISMATCH",
        });
      }
      await conn.commit();
      transactionStarted = false;
      if (grant.status === "consumed")
        return send(res, 409, { error: "已领取", code: "MAIL_GRANT_APPLIED" });
      return send(res, 200, {
        ok: true,
        idempotent: true,
        grantId: grant.id,
        grantStatus: "issued",
        pendingSave: true,
        slot: Number(grant.slot),
        rewards: safeJsonParse(grant.rewards_json, {}),
      });
    }
    if (mail.claimed) {
      await conn.rollback();
      transactionStarted = false;
      return send(res, 409, { error: "已领取", code: "LEGACY_MAIL_CLAIMED" });
    }
    const rawRewards = safeJsonParse(mail.rewards, {});
    const rewards = sanitizeRewardPayload(rawRewards);
    const grantId = uuidv4();
    await conn.execute(
      `INSERT INTO asset_grants
       (id, user_id, character_id, slot, grant_type, source_type, source_id, payload_json, state)
       VALUES (?, ?, ?, ?, 'mail_reward', 'mail_claim', ?, ?, 'issued')`,
      [grantId, user.id, selectedSave.characterId, selectedSave.slot, mail.id, JSON.stringify(rewards)],
    );
    await conn.execute(
      `INSERT INTO asset_ledger
       (user_id, character_id, slot, idempotency_key, event_type, source_type, source_id, delta_json)
       VALUES (?, ?, ?, ?, 'grant_issued', 'mail_claim', ?, ?)`,
      [user.id, selectedSave.characterId, selectedSave.slot, `mail-issue:${grantId}`, mail.id, JSON.stringify(rewards)],
    );
    await conn.execute(
      "UPDATE user_mails SET claimed = 1, claimed_at = NOW(), grant_id = ? WHERE id = ? AND user_id = ? AND claimed = 0",
      [grantId, mail.id, user.id],
    );
    await conn.commit();
    transactionStarted = false;
    send(res, 200, {
      ok: true,
      grantId,
      grantStatus: "issued",
      pendingSave: true,
      slot: selectedSave.slot,
      rewards,
    });
  } catch (e) {
    if (transactionStarted) {
      try { await conn.rollback(); } catch {}
    }
    console.error("claim user mail err", e);
    send(res, 500, { error: "服务器错误" });
  } finally {
    conn.release();
  }
});

app.post("/api/economy-events", async (req, res) => {
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    const {
      eventType,
      amount,
      itemId,
      quantity,
      quality,
      source,
      detail,
      slot,
      characterId,
      playerName,
    } = req.body || {};
    const allowedClientEvents = new Set([
      "client_note",
      "shop_buy",
      "shop_sell",
      "quest_reward",
      "activity_reward",
      "item_use",
      "craft",
      "farm_harvest",
      "combat_reward",
    ]);
    const cleanType = String(eventType || "").slice(0, 40);
    if (!cleanType || !allowedClientEvents.has(cleanType))
      return send(res, 400, { error: "事件类型无效" });
    const recentLimit = await pool.execute(
      "SELECT COUNT(*) AS c FROM economy_events WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)",
      [user.id],
    );
    if (Number(recentLimit[0][0]?.c || 0) >= 20)
      return send(res, 429, { error: "记录过于频繁" });
    await recordEconomyEvent(user, req, {
      eventType: cleanType,
      amount,
      itemId,
      quantity,
      quality,
      source: `client:${String(source || cleanType).slice(0, 60)}`,
      detail,
      slot,
      characterId,
      playerName,
    });
    send(res, 200, { ok: true });
  } catch (e) {
    console.error("economy event post err", e);
    send(res, 500, { error: "服务器错误" });
  }
});

// === check char name ===
app.get("/api/check-char-name", async (req, res) => {
  try {
    const name = (req.query.name || "").trim();
    if (!name) return send(res, 400, { error: "Name required" });
    const [rows] = await pool.execute(
      "SELECT meta_json FROM saves WHERE meta_json LIKE ? LIMIT 50",
      ["%" + name + "%"],
    );
    for (const r of rows) {
      try {
        const meta = JSON.parse(r.meta_json);
        if (meta && meta.playerName === name)
          return send(res, 409, { error: "Name already taken" });
      } catch {}
    }
    send(res, 200, { available: true });
  } catch (e) {
    console.error("check-char-name err", e);
    send(res, 500, { error: "Server error" });
  }
});

function calcCombatPowerFromSave(p = {}, cu = {}, inv = {}, sk = {}, asc = {}) {
  const num = (v) => Number(v || 0) || 0;
  const artifacts = cu.artifacts || {};
  let artifactPower = 0;
  for (const v of Object.values(artifacts)) {
    if (v && typeof v === "object")
      artifactPower += Math.floor(
        num(v.atk) * 12 +
          num(v.def) * 10 +
          num(v.aura) * 4 +
          num(v.cultivation) * 6,
      );
  }
  const oldArtifactPower =
    ["glimmerHoe", "spiritKettle", "spiritRain"].filter(
      (k) => artifacts[k] === true,
    ).length * 80;
  const realmIndex = Math.max(
    0,
    Math.min(REALM_STATS.length - 1, num(cu.realmIndex ?? cu.realm)),
  );
  const rebirthCount = num(cu.rebirthCount);
  const realmStat = REALM_STATS[realmIndex] || REALM_STATS[0];
  const realmMaxCultivation = num(realmStat?.maxCultivation || 100);
  const realmMaxMana = num(realmStat?.maxMana || 30);
  const aura = num(cu.aura);
  const attrs = p.attributes || {};
  const attrLevel = (k) => num(attrs?.[k]?.level || 1);
  const attrPower =
    num(p.attributePower) ||
    ["physique", "strength", "agility", "perception"].reduce(
      (sum, k) => sum + attrLevel(k),
      0,
    );
  const attributeMaxHpBonus = (attrLevel("physique") - 1) * 10;
  const combatSkill = Array.isArray(sk.skills)
    ? sk.skills.find((x) => x?.type === "combat") || {}
    : {};
  const combatLevel = num(combatSkill.level);
  const hp =
    num(p.baseMaxHp || 100) +
    combatLevel * 5 +
    attributeMaxHpBonus +
    (combatSkill.perk5 === "fighter" ? 25 : 0) +
    (combatSkill.perk10 === "warrior" ? 40 : 0);

  // 排行榜服务端镜像前端 useCultivationStore.combatPower。不能依赖前端 computed 字段，需从存档原始字段重算。
  const weaponDefs = {
    wooden_stick: 5,
    copper_sword: 12,
    iron_blade: 18,
    war_hammer: 24,
    steel_sword: 28,
    silver_spear: 36,
    demon_slayer: 48,
    dragon_blade: 60,
  };
  const enchantBonus = { sharp: 4, fierce: 8, spirit: 12, legendary: 18 };
  const equippedWeapon = Array.isArray(inv.ownedWeapons)
    ? inv.ownedWeapons[num(inv.equippedWeaponIndex)]
    : null;
  const weaponPower =
    Math.max(
      0,
      (weaponDefs[equippedWeapon?.defId] ?? (equippedWeapon ? 5 : 5)) +
        (enchantBonus[equippedWeapon?.enchantmentId] || 0),
    ) * 16;

  const ringEffectMap = {
    quartz_ring: { attack_bonus: 3 },
    jade_guard_ring: { defense_bonus: 0.08 },
    blood_jade_ring: { max_hp_bonus: 30 },
    tiger_eye_ring: { attack_bonus: 5 },
    obsidian_guard_ring: { defense_bonus: 0.12 },
    dragon_scale_ring: { defense_bonus: 0.18, max_hp_bonus: 50 },
    phoenix_blood_ring: { attack_bonus: 8, max_hp_bonus: 40 },
    immortal_jade_ring: {
      attack_bonus: 12,
      defense_bonus: 0.2,
      max_hp_bonus: 80,
    },
  };
  const ringEffect = (type) => {
    let total = 0;
    for (const idx of [inv.equippedRingSlot1, inv.equippedRingSlot2]) {
      const ring = Array.isArray(inv.ownedRings)
        ? inv.ownedRings[num(idx)]
        : null;
      if (ring?.defId && ringEffectMap[ring.defId]?.[type])
        total += ringEffectMap[ring.defId][type];
      if (ring?.id && ringEffectMap[ring.id]?.[type])
        total += ringEffectMap[ring.id][type];
    }
    return total;
  };
  const ringPower = Math.floor(
    ringEffect("attack_bonus") * 120 +
      ringEffect("defense_bonus") * 100 +
      ringEffect("max_hp_bonus") * 3,
  );

  const manuals = cu.manuals || {};
  const manualPower =
    num(manuals.wood) * 180 +
    num(manuals.thunder) * 320 +
    num(manuals.void) * 420;
  const daoGearLevels = cu.daoGear || {};
  const daoGearPower =
    num(daoGearLevels.immortal_sword) * 520 +
    num(daoGearLevels.dharma_robe) * 420 +
    num(daoGearLevels.cloud_boots) * 360 +
    num(daoGearLevels.tribulation_amulet) * 300;
  const talismanCounts = cu.talismans || {};
  const talismanPower =
    num(talismanCounts.fire_talisman) * 180 +
    num(talismanCounts.thunder_talisman) * 260;
  const sectSkills = Array.isArray(cu.sectSkills) ? cu.sectSkills : [];
  const sectSkillPower = sectSkills.reduce(
    (sum, lv, idx) => sum + num(lv) * (220 + idx * 120),
    0,
  );
  const sectRank = num(cu.sectRank);
  const sectIdentityPower =
    cu.sect === "sword"
      ? sectSkillPower * 0.35
      : cu.sect === "talisman"
        ? sectSkillPower * 0.18 + sectRank * 260
        : cu.sect === "alchemy"
          ? sectRank * 180
          : 0;
  const path = cu.cultivationPath || "balanced";
  const pathPower =
    path === "sword"
      ? num(manuals.thunder) * 180 + realmIndex * 55
      : path === "thunder"
        ? num(cu.insight) * 10 + num(manuals.thunder) * 150
        : path === "alchemy"
          ? num(cu.fieldTier) * 160 + num(manuals.wood) * 120
          : Math.max(0, 100 - num(cu.heartDemon)) * 4;

  // V2.5.2：排行榜必须按境界稳定底蕴算，不能再吃当前修为/当前灵气/当前灵力。
  // 当前资源会在突破、消耗后大幅波动，曾导致低境界高临时资源玩家压过高境界玩家。
  const majorStageBonus = Math.floor(
    Math.pow(Math.floor(realmIndex / 3), 2) * 1200,
  );
  const realmPower = realmIndex * 3500 + majorStageBonus + rebirthCount * 50000;
  const realmFoundationPower = Math.floor(
    realmMaxCultivation * 1.05 + realmMaxMana * 24,
  );
  const auraFoundationPower = Math.floor(
    Math.log10(Math.max(1, aura) + 1) * 180,
  );
  const cultivationPower = realmFoundationPower + auraFoundationPower;
  const bodyPower = Math.floor(attrPower * 6 + hp * 1.5 + combatLevel * 180);
  const immortalRealmPower = asc?.ascended
    ? IMMORTAL_REALMS[
        Math.max(
          0,
          Math.min(
            IMMORTAL_REALMS.length - 1,
            Number(asc.immortalRealmStage || 0),
          ),
        )
      ]?.powerBonus || 0
    : 0;
  const systemPower =
    immortalRealmPower +
    num(cu.fieldTier) * 120 +
    num(cu.caveTier) * 180 +
    num(cu.yuanShenLevel) * 260 +
    num(cu.destinedArtifactLevel) * 360 +
    daoGearPower +
    talismanPower +
    num(cu.beastBond) * 12 +
    num(cu.sectContribution) * 0.2 +
    num(cu.sectMerit) * 0.6 +
    sectSkillPower +
    sectIdentityPower +
    pathPower +
    manualPower;
  return Math.max(
    0,
    Math.floor(
      realmPower +
        cultivationPower +
        bodyPower +
        weaponPower +
        ringPower +
        artifactPower +
        oldArtifactPower +
        systemPower,
    ),
  );
}

// 匿名反馈采用进程内短时限流；每日配额同时查询数据库，重启不会清空日配额。
const feedbackIpWindows = new Map();
function feedbackClientIp(req) {
  return String(req.ip || req.socket?.remoteAddress || "unknown").slice(0, 80);
}
function consumeFeedbackBurst(ip, now = Date.now()) {
  const cutoff = now - 10 * 60 * 1000;
  const recent = (feedbackIpWindows.get(ip) || []).filter((t) => t > cutoff);
  if (recent.length >= 3) return false;
  recent.push(now);
  feedbackIpWindows.set(ip, recent);
  return true;
}

// --- 玩家反馈 ---
app.post("/api/feedbacks", async (req, res) => {
  try {
    const user = await auth(req);
    const ip = feedbackClientIp(req);
    if (!consumeFeedbackBurst(ip))
      return send(res, 429, {
        error: "提交过于频繁，请稍后再试。",
        code: "FEEDBACK_RATE_LIMITED",
      });
    const [dailyRows] = await pool.execute(
      "SELECT COUNT(*) AS count FROM feedbacks WHERE ip = ? AND created_at >= CURRENT_DATE() AND created_at < CURRENT_DATE() + INTERVAL 1 DAY",
      [ip],
    );
    if (Number(dailyRows[0]?.count || 0) >= 10)
      return send(res, 429, {
        error: "今日反馈次数已达上限，请明日再试。",
        code: "FEEDBACK_DAILY_LIMIT",
      });
    const { category, title, content } = req.body || {};
    if (!category || !title || !content)
      return send(res, 400, { error: "分类/标题/内容不能为空" });
    if (!["feature", "bug", "suggestion"].includes(category))
      return send(res, 400, { error: "分类无效" });
    await pool.execute(
      "INSERT INTO feedbacks (user_id, username, player_name, category, title, content, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        user?.id || null,
        user?.username || null,
        (req.body?.playerName || "").slice(0, 20),
        category,
        title.slice(0, 100),
        content.slice(0, 2000),
        ip,
        (req.headers["user-agent"] || "").slice(0, 255),
      ],
    );
    send(res, 200, { ok: true });
  } catch (e) {
    console.error("feedback post err", e);
    send(res, 500, { error: "服务器错误" });
  }
});

// --- 玩家查看自己的反馈（必须按登录账号过滤，禁止传入任意 userId） ---
app.get("/api/feedbacks", async (req, res) => {
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录账号" });
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 50, 100));
    const [rows] = await pool.execute(
      `SELECT id, category, title, content, status, created_at
       FROM feedbacks
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ${limit}`,
      [user.id],
    );
    send(res, 200, {
      feedbacks: rows.map((row) => ({
        id: row.id,
        category: row.category,
        title: row.title,
        content: row.content,
        status: row.status,
        adminReply: null,
        createdAt: row.created_at,
        updatedAt: null,
      })),
    });
  } catch (e) {
    console.error("feedback list err", e);
    send(res, 500, { error: "服务器错误" });
  }
});

// --- 管理员查看反馈 ---
app.get("/api/admin/feedbacks", async (req, res) => {
  try {
    const u = await requireAdmin(req, res);
    if (!u) return;
    const status = req.query.status || "";
    const category = req.query.category || "";
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    let where = [];
    let params = [];
    if (status) {
      where.push("f.status = ?");
      params.push(status);
    }
    if (category) {
      where.push("f.category = ?");
      params.push(category);
    }
    const [rows] = await pool.execute(
      `SELECT f.* FROM feedbacks f ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY f.id DESC LIMIT ${limit}`,
      params,
    );
    const pendingIds = rows
      .filter((row) => row.status === "pending")
      .map((row) => Number(row.id))
      .filter(Number.isSafeInteger);
    if (pendingIds.length) {
      const placeholders = pendingIds.map(() => "?").join(",");
      await pool.execute(
        `UPDATE feedbacks SET status = 'read' WHERE status = 'pending' AND id IN (${placeholders})`,
        pendingIds,
      );
      for (const row of rows) {
        if (pendingIds.includes(Number(row.id))) row.status = "read";
      }
    }
    send(res, 200, { feedbacks: rows });
  } catch (e) {
    console.error("admin feedbacks err", e);
    send(res, 500, { error: "服务器错误" });
  }
});

app.put("/api/admin/feedbacks/:id", async (req, res) => {
  try {
    const u = await requireAdmin(req, res);
    if (!u) return;
    const { status } = req.body || {};
    if (!status || !["pending", "read", "resolved", "closed"].includes(status))
      return send(res, 400, { error: "状态无效" });
    await pool.execute("UPDATE feedbacks SET status = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);
    send(res, 200, { ok: true });
  } catch (e) {
    console.error("admin feedback put err", e);
    send(res, 500, { error: "服务器错误" });
  }
});

// --- 排行榜（优先从 saves.data_json 实时读取；坏数据用 meta/player_name/cache 兜底） ---
app.get("/api/leaderboard", async (req, res) => {
  try {
    const by = req.query.by || "cultivation";
    const [rows] = await pool.execute(
      `SELECT s.user_id, u.username, s.slot, s.player_name, s.data_json, s.meta_json, s.updated_at,
              lb.realm_name AS cached_realm_name, lb.cultivation AS cached_cultivation, lb.aura AS cached_aura,
              lb.money AS cached_money, lb.game_year AS cached_year, lb.game_season AS cached_season, lb.game_day AS cached_day
       FROM saves s
       INNER JOIN (SELECT user_id, MAX(updated_at) as max_ts FROM saves GROUP BY user_id) latest
         ON s.user_id = latest.user_id AND s.updated_at = latest.max_ts
       JOIN users u ON u.id = s.user_id
       LEFT JOIN leaderboard lb ON lb.user_id = s.user_id
       ORDER BY s.updated_at DESC`,
    );
    const entries = [];
    for (const r of rows) {
      let d = null;
      if (r.data_json && r.data_json !== "null" && r.data_json !== "") {
        try {
          d =
            typeof r.data_json === "string"
              ? JSON.parse(r.data_json)
              : r.data_json;
        } catch {}
      }
      const meta = safeJsonParse(r.meta_json, {}) || {};
      const p =
        (d && (d.player || d.playerStore || (d.stores && d.stores.player))) ||
        {};
      const cu =
        (d &&
          (d.cultivation ||
            d.cultivationStore ||
            (d.stores && d.stores.cultivation))) ||
        {};
      const g =
        (d && (d.game || d.gameStore || (d.stores && d.stores.game))) || {};
      const asc =
        (d &&
          (d.ascension ||
            d.ascensionStore ||
            (d.stores && d.stores.ascension))) ||
        {};
      const realmIdx = realmSortIndexFromSave(cu, asc);
      entries.push({
        userId: r.user_id,
        username: r.username,
        playerName:
          p.playerName || p.name || meta.playerName || r.player_name || "无名",
        // data_json 属于客户端输入，返回排行榜前必须在服务端再次清洗。
        daoTitle: normalizeDaoTitle(p.daoTitle),
        realmName: realmNameFromSave(cu, asc) || r.cached_realm_name || "凡人",
        realmIndex: realmIdx,
        rebirthCount: Number(cu.rebirthCount || 0) || 0,
        cultivation: Number(cu.cultivation ?? r.cached_cultivation ?? 0) || 0,
        combatPower: calcCombatPowerFromSave(
          p,
          cu,
          (d &&
            (d.inventory ||
              d.inventoryStore ||
              (d.stores && d.stores.inventory))) ||
            {},
          (d && (d.skill || d.skillStore || (d.stores && d.stores.skill))) ||
            {},
          asc,
        ),
        aura: Number(cu.aura ?? r.cached_aura ?? 0) || 0,
        money: Number(p.money ?? meta.money ?? r.cached_money ?? 0) || 0,
        year: Number(g.year ?? meta.year ?? r.cached_year ?? 1) || 1,
        season: g.season || meta.season || r.cached_season || "春",
        day: Number(g.day ?? meta.day ?? r.cached_day ?? 1) || 1,
        updatedAt: r.updated_at,
        dataOk: !!d,
      });
    }
    entries.sort((a, b) => {
      if (by === "money") return (b.money || 0) - (a.money || 0);
      if (by === "aura") return (b.aura || 0) - (a.aura || 0);
      if (by === "power") return (b.combatPower || 0) - (a.combatPower || 0);
      if (by === "rebirth")
        return (b.rebirthCount || 0) - (a.rebirthCount || 0);
      return (
        (b.rebirthCount || 0) - (a.rebirthCount || 0) ||
        (b.realmIndex || 0) - (a.realmIndex || 0) ||
        (b.cultivation || 0) - (a.cultivation || 0)
      );
    });
    for (const e of entries.slice(0, 50)) {
      try {
        await pool.execute(
          "INSERT INTO leaderboard (user_id, username, player_name, realm_name, cultivation, aura, money, game_year, game_season, game_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE player_name=VALUES(player_name), realm_name=VALUES(realm_name), cultivation=VALUES(cultivation), aura=VALUES(aura), money=VALUES(money), game_year=VALUES(game_year), game_season=VALUES(game_season), game_day=VALUES(game_day)",
          [
            e.userId,
            e.username,
            e.playerName,
            e.realmName,
            e.cultivation,
            e.aura,
            e.money,
            e.year,
            e.season,
            e.day,
          ],
        );
      } catch {}
    }
    send(res, 200, { leaderboard: entries.slice(0, 50) });
  } catch (e) {
    console.error("lb err", e);
    send(res, 500, { error: "服务器错误" });
  }
});

// --- 登仙塔排行榜（从最新云档实时读取） ---
app.get("/api/tower-leaderboard", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit || 10), 50));
    const [rows] = await pool.execute(
      `SELECT s.user_id, u.username, s.slot, s.player_name, s.data_json, s.meta_json, s.updated_at
       FROM saves s
       INNER JOIN (SELECT user_id, MAX(updated_at) as max_ts FROM saves GROUP BY user_id) latest
         ON s.user_id = latest.user_id AND s.updated_at = latest.max_ts
       JOIN users u ON u.id = s.user_id
       ORDER BY s.updated_at DESC`,
    );
    const entries = [];
    for (const r of rows) {
      let d = null;
      if (r.data_json && r.data_json !== "null" && r.data_json !== "") {
        try {
          d =
            typeof r.data_json === "string"
              ? JSON.parse(r.data_json)
              : r.data_json;
        } catch {}
      }
      const meta = safeJsonParse(r.meta_json, {}) || {};
      const p =
        (d && (d.player || d.playerStore || (d.stores && d.stores.player))) ||
        {};
      const combat =
        (d && (d.combat || d.combatStore || (d.stores && d.stores.combat))) ||
        {};
      const cu =
        (d &&
          (d.cultivation ||
            d.cultivationStore ||
            (d.stores && d.stores.cultivation))) ||
        {};
      const floor = Number(combat.towerHighestFloor || 0) || 0;
      if (floor <= 0) continue;
      const asc =
        (d &&
          (d.ascension ||
            d.ascensionStore ||
            (d.stores && d.stores.ascension))) ||
        {};
      const realmIdx = realmSortIndexFromSave(cu, asc);
      entries.push({
        userId: r.user_id,
        username: r.username,
        playerName:
          p.playerName || p.name || meta.playerName || r.player_name || "无名",
        floor,
        realmName: realmNameFromSave(cu, asc) || "凡人",
        rebirthCount: Number(cu.rebirthCount || 0) || 0,
        updatedAt: r.updated_at,
      });
    }
    entries.sort(
      (a, b) =>
        b.floor - a.floor ||
        b.rebirthCount - a.rebirthCount ||
        String(b.updatedAt).localeCompare(String(a.updatedAt)),
    );
    send(res, 200, { leaderboard: entries.slice(0, limit) });
  } catch (e) {
    console.error("tower leaderboard err", e);
    send(res, 500, { error: "服务器错误" });
  }
});

function getWorldBossCycleKey(date = new Date()) {
  const start = new Date(Date.UTC(2026, 0, 1));
  const now = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const days = Math.max(0, Math.floor((now - start) / 86400000));
  return `wb-${date.getUTCFullYear()}-${Math.floor(days / 7) + 1}`;
}
function worldBossCycleReward(score, globalProgress = 0) {
  const personal = Math.max(0, Number(score || 0) || 0);
  const globalBonus =
    globalProgress >= 300 ? 1.25 : globalProgress >= 180 ? 1.1 : 1;
  const tier =
    personal >= 120
      ? "镇魔功臣"
      : personal >= 60
        ? "伏魔主力"
        : personal >= 20
          ? "镇魔先锋"
          : "参与奖";
  const base =
    personal >= 120
      ? {
          money: 6800,
          spiritStone: 36,
          aura: 1200,
          items: [
            { itemId: "soul_crystal", quantity: 2 },
            { itemId: "thunder_essence", quantity: 1 },
          ],
        }
      : personal >= 60
        ? {
            money: 3600,
            spiritStone: 20,
            aura: 640,
            items: [{ itemId: "demon_core", quantity: 1 }],
          }
        : personal >= 20
          ? { money: 1800, spiritStone: 10, aura: 280, items: [] }
          : { money: 800, spiritStone: 4, aura: 120, items: [] };
  return {
    tier,
    rewards: {
      money: Math.floor(base.money * globalBonus),
      spiritStone: Math.floor(base.spiritStone * globalBonus),
      aura: Math.floor(base.aura * globalBonus),
      items: base.items,
    },
  };
}
function worldBossScoreFromSaveData(d = {}) {
  const quest = d.quest || d.questStore || (d.stores && d.stores.quest) || {};
  const combat =
    d.combat || d.combatStore || (d.stores && d.stores.combat) || {};
  const claimed = Array.isArray(quest.journeyClaimed)
    ? quest.journeyClaimed
    : [];
  const tower = Number(combat.towerHighestFloor || 0) || 0;
  let score = 0;
  // 服务端只信任云存档中已有的长期进度，不再接受客户端直接上报 personalScore。
  if (claimed.includes("v11_event_hunt")) score = Math.max(score, 20);
  score = Math.max(score, tower * 2);
  return Math.min(80, Math.max(0, Math.floor(score)));
}
async function computeWorldBossStats(focusUserId = null) {
  const [rows] = await pool.execute(
    `SELECT user_id, player_name, data_json, updated_at FROM saves WHERE data_json IS NOT NULL AND data_json <> '' ORDER BY updated_at DESC LIMIT 500`,
  );
  let progress = 0;
  let participants = 0;
  let focusScore = 0;
  let focusPlayerName = "";
  const seen = new Set();
  for (const r of rows) {
    let d = null;
    try {
      d =
        typeof r.data_json === "string" ? JSON.parse(r.data_json) : r.data_json;
    } catch {}
    if (!d) continue;
    const score = worldBossScoreFromSaveData(d);
    const userKey = r.user_id || r.player_name || String(Math.random());
    if (score > 0 && !seen.has(userKey)) {
      seen.add(userKey);
      participants++;
      progress += score;
    }
    if (focusUserId && r.user_id === focusUserId && score >= focusScore) {
      const p =
        d.player || d.playerStore || (d.stores && d.stores.player) || {};
      focusScore = score;
      focusPlayerName = normalizePlayerName(
        p.playerName || p.name || r.player_name || "",
      );
    }
  }
  const target = 300;
  const statusText =
    progress >= target
      ? "已镇压"
      : progress >= target * 0.6
        ? "决战中"
        : "进行中";
  const cycleKey = getWorldBossCycleKey();
  return {
    eventId: "yaochao-v152",
    cycleKey,
    title: "世界妖潮",
    progress,
    target,
    participants,
    percent: Math.min(100, Math.floor((progress / target) * 100)),
    statusText,
    focusScore,
    focusPlayerName,
  };
}
function isValidRealmName(name) {
  const n = String(name || "");
  return REALMS.includes(n) || IMMORTAL_REALMS.some((r) => r.name === n);
}
async function getLatestSaveSnapshot(userId) {
  const [rows] = await pool.execute(
    'SELECT s.user_id, s.player_name, s.data_json, s.updated_at, c.name AS character_name FROM saves s LEFT JOIN characters c ON c.id = s.character_id WHERE s.user_id = ? AND s.data_json IS NOT NULL AND s.data_json <> "" ORDER BY s.updated_at DESC LIMIT 1',
    [userId],
  );
  if (!rows.length) return null;
  let data = null;
  try {
    data =
      typeof rows[0].data_json === "string"
        ? JSON.parse(rows[0].data_json)
        : rows[0].data_json;
  } catch {}
  if (!data) return null;
  const p =
    data.player ||
    data.playerStore ||
    (data.stores && data.stores.player) ||
    {};
  const cu =
    data.cultivation ||
    data.cultivationStore ||
    (data.stores && data.stores.cultivation) ||
    {};
  const asc =
    data.ascension ||
    data.ascensionStore ||
    (data.stores && data.stores.ascension) ||
    {};
  return {
    row: rows[0],
    data,
    playerName: normalizePlayerName(
      p.playerName ||
        p.name ||
        rows[0].character_name ||
        rows[0].player_name ||
        "",
    ),
    realmName: realmNameFromSave(cu, asc),
    cu,
    asc,
  };
}

// --- 活动：世界妖潮（聚合线上存档进度） ---
app.get("/api/events/world-boss", async (req, res) => {
  try {
    const stats = await computeWorldBossStats();
    send(res, 200, {
      eventId: stats.eventId,
      cycleKey: stats.cycleKey,
      title: stats.title,
      progress: stats.progress,
      target: stats.target,
      participants: stats.participants,
      percent: stats.percent,
      statusText: stats.statusText,
      tierClaimsEnabled: await worldBossContributionAvailable(),
      contributionSemantics: "server_observed_only",
    });
  } catch (e) {
    console.error("world boss err", e);
    send(res, 500, { error: "服务器错误" });
  }
});

app.post("/api/events/world-boss/claim-tier", async (req, res) => {
  let conn;
  let transactionStarted = false;
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    const route = String(req.body?.route || "");
    const tierId = String(req.body?.tierId || "").slice(0, 48);
    if (!Object.values(WORLD_BOSS_TIER_ROUTES).includes(route) || !tierId)
      return send(res, 400, { error: "镇魔奖励档位无效", code: "WORLD_BOSS_TIER_INVALID" });

    conn = await pool.getConnection();
    if (!await worldBossContributionAvailable(conn))
      return send(res, 503, {
        error: "镇魔贡献账本维护中，奖励领取暂未开放。旧存档贡献仅供展示。",
        code: "WORLD_BOSS_CONTRIBUTION_MAINTENANCE",
      });

    await conn.beginTransaction();
    transactionStarted = true;
    await conn.execute("SELECT id FROM users WHERE id = ? FOR UPDATE", [user.id]);
    const [bindingRows] = await conn.execute(
      `SELECT c.slot, c.id AS character_id
       FROM characters c JOIN saves s
         ON s.user_id = c.user_id AND s.slot = c.slot AND s.character_id = c.id
       WHERE c.user_id = ? ORDER BY c.slot FOR UPDATE`,
      [user.id],
    );
    const binding = resolveRewardCharacter(bindingRows, req.body?.slot);
    if (binding.kind !== "ok") {
      await conn.rollback(); transactionStarted = false;
      return send(res, binding.kind === "invalid_slot" ? 400 : 409, {
        error: binding.kind === "invalid_slot" ? "角色槽位无效，请重新进入角色后重试。" : "该角色槽位不属于当前账号或未绑定当前存档。",
        code: binding.kind === "invalid_slot" ? "WORLD_BOSS_INVALID_SLOT" : "WORLD_BOSS_SLOT_NOT_BOUND",
      });
    }
    const selected = binding.binding;
    const cycleKey = contributionCycle(route, new Date());
    const [contributionRows] = await conn.execute(
      `SELECT route, cycle_key, contribution FROM world_boss_contributions
       WHERE user_id = ? AND character_id = ? AND slot = ? AND route = ? AND cycle_key = ?
       LIMIT 1 FOR UPDATE`,
      [user.id, selected.characterId, selected.slot, route, cycleKey],
    );
    const qualification = resolveWorldBossTierClaim({
      route, tierId, cycleKey, contributionRow: contributionRows[0] || null,
      // No client save field influences qualification or reward value.
      serverRewardContext: {},
    });
    if (qualification.kind !== "eligible") {
      await conn.rollback(); transactionStarted = false;
      const status = qualification.kind === "invalid_tier" ? 404 : 409;
      return send(res, status, {
        error: qualification.kind === "not_eligible"
          ? `服务端镇魔贡献不足，需要 ${qualification.required || 0}。旧档进度不可兑换。`
          : "镇魔奖励不可领取。",
        code: `WORLD_BOSS_${qualification.kind.toUpperCase()}`,
        contribution: qualification.contribution || 0,
        cycleKey,
      });
    }
    const sourceType = route === WORLD_BOSS_TIER_ROUTES.YAOCHAO_DAILY
      ? "world_boss_yaochao_tier" : "world_boss_long_term_tier";
    const repo = {
      async findGrant(userId, sourceTypeValue, sourceId) {
        const [rows] = await conn.execute(
          `SELECT id, character_id AS characterId, slot, state AS status,
                  payload_json AS rewardsJson FROM asset_grants
           WHERE user_id = ? AND source_type = ? AND source_id = ? LIMIT 1 FOR UPDATE`,
          [userId, sourceTypeValue, sourceId],
        );
        return rows.length ? { ...rows[0], rewards: safeJsonParse(rows[0].rewardsJson, {}) } : null;
      },
      async insertGrant(grant) {
        await conn.execute(
          `INSERT INTO asset_grants
           (id, user_id, character_id, slot, grant_type, source_type, source_id, payload_json, state)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'issued')`,
          [grant.id, grant.userId, grant.characterId, grant.slot, grant.grantType,
           grant.sourceType, grant.sourceId, JSON.stringify(grant.rewards)],
        );
      },
      async insertIssuedLedger(grant) {
        await conn.execute(
          `INSERT INTO asset_ledger
           (user_id, character_id, slot, idempotency_key, event_type, source_type, source_id, delta_json)
           VALUES (?, ?, ?, ?, 'grant_issued', ?, ?, ?)`,
          [grant.userId, grant.characterId, grant.slot, `grant-issue:${grant.id}`,
           grant.sourceType, grant.sourceId, JSON.stringify(grant.rewards)],
        );
      },
    };
    const grantResult = await issueSourceGrant(repo, {
      userId: user.id, characterId: selected.characterId, slot: selected.slot,
      sourceType, sourceId: qualification.sourceId,
      grantType: "world_boss_tier_reward", grantId: uuidv4(), rewards: qualification.rewards,
    });
    if (grantResult.kind === "character_mismatch") {
      await conn.rollback(); transactionStarted = false;
      return send(res, 409, { error: "该档奖励已绑定其他角色。", code: "WORLD_BOSS_GRANT_CHARACTER_MISMATCH" });
    }
    await conn.commit(); transactionStarted = false;
    return send(res, 200, {
      ok: true, idempotent: !!grantResult.idempotent,
      alreadyApplied: grantResult.kind === "consumed",
      pendingSave: grantResult.kind !== "consumed",
      grantId: grantResult.grant.id, grantStatus: grantResult.kind,
      slot: selected.slot, route, tierId: qualification.tier.id,
      tier: qualification.tier.title, cycleKey, contribution: qualification.contribution,
      rewards: grantResult.grant.rewards,
    });
  } catch (e) {
    if (transactionStarted && conn) { try { await conn.rollback(); } catch {} }
    console.error("world boss tier claim err", e);
    if (["ER_NO_SUCH_TABLE", "ER_BAD_TABLE_ERROR", "ER_BAD_FIELD_ERROR"].includes(e?.code))
      return send(res, 503, { error: "镇魔贡献账本维护中。", code: "WORLD_BOSS_CONTRIBUTION_MAINTENANCE" });
    return send(res, 500, { error: "服务器错误" });
  } finally {
    conn?.release();
  }
});

app.post("/api/events/world-boss/claim-cycle", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    // Legacy cycle settlement still derives from client-save fields and therefore
    // cannot mint assets in the authoritative contribution rollout.
    return send(res, 503, {
      error: "镇魔周期结算维护中；旧档战报仅供展示，不可兑换。",
      code: "WORLD_BOSS_CONTRIBUTION_MAINTENANCE",
    });
    /* istanbul ignore next -- retained for a future ledger-backed rewrite
    const stats = await computeWorldBossStats(user.id);
    const cycleKey = stats.cycleKey;
    const score = stats.focusScore;
    if (score <= 0) return send(res, 400, { error: "本期暂无镇魔贡献" });
    const legacyId = `world-boss-cycle:${cycleKey}`;
    await conn.beginTransaction();
    const [exists] = await conn.execute(
      "SELECT id FROM user_mails WHERE user_id = ? AND legacy_mail_id = ? LIMIT 1 FOR UPDATE",
      [user.id, legacyId],
    );
    if (exists.length) {
      await conn.rollback();
      return send(res, 409, { error: "本期结算邮件已发放，请前往邮箱领取" });
    }
    const calc = worldBossCycleReward(score, stats.progress);
    const cleanRewards = sanitizeRewardPayload(calc.rewards);
    const title = `全服镇魔战报 · ${cycleKey}`;
    const content = `本期全服镇魔结算完成。道友${stats.focusPlayerName || user.username || "无名"}个人贡献 ${score}，评级「${calc.tier}」。全服贡献 ${stats.progress}/${stats.target}，参与人数 ${stats.participants}。奖励已随信附上。`;
    const id = uuidv4();
    await conn.execute(
      "INSERT INTO user_mails (id, user_id, legacy_mail_id, title, content, rewards, from_name) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        user.id,
        legacyId,
        title,
        content,
        JSON.stringify(cleanRewards),
        "镇魔司",
      ],
    );
    await conn.commit();
    await recordEconomyEvent(user, req, {
      eventType: "world_boss_cycle_mail",
      amount: Number(cleanRewards.money || 0),
      source: "world_boss",
      detail: {
        cycleKey,
        score,
        progress: stats.progress,
        rewards: cleanRewards,
      },
    });
    send(res, 200, {
      ok: true,
      mailId: id,
      cycleKey,
      tier: calc.tier,
      rewards: cleanRewards,
      title,
      content,
    });
    */
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    console.error("world boss cycle claim err", e);
    send(res, 500, { error: "服务器错误" });
  } finally {
    conn.release();
  }
});

// --- 突破公告 ---
app.post("/api/breakthrough-announce", async (req, res) => {
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    const { playerName, from, to } = req.body || {};
    const cleanPlayerName = normalizePlayerName(playerName);
    const cleanTo = String(to || "").slice(0, 50);
    const cleanFrom = String(from || "凡人").slice(0, 50);
    if (
      !cleanPlayerName ||
      !cleanTo ||
      !isValidRealmName(cleanTo) ||
      (cleanFrom && !isValidRealmName(cleanFrom))
    )
      return send(res, 400, { error: "参数不完整或境界无效" });
    const snap = await getLatestSaveSnapshot(user.id);
    if (!snap || snap.playerName !== cleanPlayerName)
      return send(res, 403, { error: "角色信息不匹配" });
    // 不信任客户端写排行榜境界：排行榜境界只使用当前云档解析值；公告目标境界必须与云档当前境界一致，防伪造高境界。
    if (snap.realmName !== cleanTo)
      return send(res, 409, {
        error: "云端存档境界与公告不一致，请先完成云存档保存。",
        currentRealm: snap.realmName,
      });
    const [recent] = await pool.execute(
      "SELECT COUNT(*) AS c FROM world_announcements WHERE type = ? AND message LIKE ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)",
      ["breakthrough", `%${cleanPlayerName}%`],
    );
    if (Number(recent[0]?.c || 0) > 0)
      return send(res, 429, { error: "公告发送过于频繁，请稍后再试" });
    const msg = `⚡ 全服公告：${cleanPlayerName} 渡劫成功，自「${cleanFrom || "凡人"}」踏入「${cleanTo}」！天雷散尽，道号留名。`;
    await pool.execute(
      "INSERT INTO world_announcements (message, type) VALUES (?, ?)",
      [msg, "breakthrough"],
    );
    await pool.execute(
      "DELETE FROM world_announcements WHERE id NOT IN (SELECT id FROM (SELECT id FROM world_announcements ORDER BY created_at DESC LIMIT 20) t)",
    );
    await pool.execute(
      "INSERT INTO leaderboard (user_id, username, player_name, realm_name) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE player_name=VALUES(player_name), realm_name=VALUES(realm_name)",
      [user.id, user.username, snap.playerName, snap.realmName],
    );
    send(res, 200, { ok: true });
  } catch (e) {
    console.error("breakthrough announce err", e);
    send(res, 500, { error: "服务器错误" });
  }
});

app.get("/api/world-announcements", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, message, type, repeat_interval_minutes as repeatIntervalMinutes, created_at as time FROM world_announcements ORDER BY created_at DESC LIMIT 10",
    );
    send(res, 200, { announcements: rows });
  } catch (e) {
    send(res, 500, { error: "服务器错误" });
  }
});

// 管理员手动全服公告：复用玩家侧滚动公告队列
app.get("/api/admin/world-announcements", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    const [rows] = await pool.execute(
      "SELECT id, message, type, repeat_interval_minutes as repeatIntervalMinutes, created_at as time FROM world_announcements ORDER BY created_at DESC LIMIT " +
        limit,
    );
    send(res, 200, { announcements: rows });
  } catch (e) {
    send(res, 500, { error: "服务器错误" });
  }
});
app.post("/api/admin/world-announcements", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const message = String(req.body?.message || "")
      .trim()
      .slice(0, 500);
    const type =
      String(req.body?.type || "admin")
        .trim()
        .slice(0, 20) || "admin";
    const repeatIntervalMinutes = Math.max(
      0,
      Math.min(
        10080,
        Math.floor(Number(req.body?.repeatIntervalMinutes || 0) || 0),
      ),
    );
    if (!message) return send(res, 400, { error: "公告内容不能为空" });
    const text =
      message.startsWith("📢") || message.startsWith("⚡")
        ? message
        : `📢 全服公告：${message}`;
    await pool.execute(
      "INSERT INTO world_announcements (message, type, repeat_interval_minutes) VALUES (?, ?, ?)",
      [text, type, repeatIntervalMinutes],
    );
    await pool.execute(
      "DELETE FROM world_announcements WHERE id NOT IN (SELECT id FROM (SELECT id FROM world_announcements ORDER BY created_at DESC LIMIT 50) t)",
    );
    const [rows] = await pool.execute(
      "SELECT id, message, type, repeat_interval_minutes as repeatIntervalMinutes, created_at as time FROM world_announcements ORDER BY created_at DESC LIMIT 30",
    );
    send(res, 200, { ok: true, announcements: rows });
  } catch (e) {
    send(res, 500, { error: "服务器错误" });
  }
});
app.delete("/api/admin/world-announcements/:id", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    await pool.execute("DELETE FROM world_announcements WHERE id = ?", [
      req.params.id,
    ]);
    send(res, 200, { ok: true });
  } catch (e) {
    send(res, 500, { error: "服务器错误" });
  }
});

// ========== 聊天 API ==========
app.get("/api/chat", async (req, res) => {
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    const channel = String(req.query.channel || "world").slice(0, 20);
    const afterId = Number(req.query.after) || 0;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    let rows;
    if (channel === "private") {
      const peerId = String(req.query.peer || "").slice(0, 36);
      if (!peerId) return send(res, 400, { error: "缺少对方ID" });
      const [r] = await pool.execute(
        "SELECT c.*, u.username FROM chat_messages c JOIN users u ON u.id = c.from_user_id WHERE c.channel = ? AND ((c.from_user_id = ? AND c.to_user_id = ?) OR (c.from_user_id = ? AND c.to_user_id = ?)) AND c.id > ? ORDER BY c.id ASC LIMIT ?",
        ["private", user.id, peerId, peerId, user.id, afterId, limit],
      );
      rows = r;
    } else {
      const [r] = await pool.execute(
        "SELECT c.*, u.username FROM chat_messages c JOIN users u ON u.id = c.from_user_id WHERE c.channel = ? AND c.id > ? ORDER BY c.id DESC LIMIT ?",
        [channel, afterId, limit],
      );
      rows = r.reverse();
    }
    const playerName = await getPlayerName(user);
    send(res, 200, {
      messages: rows.map((m) => ({
        id: m.id,
        channel: m.channel,
        fromUserId: m.from_user_id,
        fromUsername: m.from_username,
        fromPlayerName: m.from_player_name,
        fromRealmName: m.from_realm_name,
        content: m.content,
        createdAt: m.created_at,
      })),
      playerNames: playerName ? { [user.id]: playerName } : {},
    });
  } catch (e) {
    console.error("chat fetch err", e.message);
    send(res, 500, { error: "服务器错误" });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    const { channel, content, toUserId } = req.body || {};
    const ch = String(channel || "world").slice(0, 20);
    const text = String(content || "")
      .trim()
      .slice(0, 200);
    if (!text) return send(res, 400, { error: "消息不能为空" });
    if (text.length > 200)
      return send(res, 400, { error: "消息过长（200字以内）" });
    // Rate limit: max 5 messages per 10 seconds (simple check)
    const [recent] = await pool.execute(
      "SELECT COUNT(*) as c FROM chat_messages WHERE from_user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)",
      [user.id],
    );
    if (recent[0].c >= 5)
      return send(res, 429, { error: "发送太快了，请稍等" });
    const playerName = await getPlayerName(user);
    const realmName = await getPlayerRealmName(user);
    const toUid = ch === "private" ? String(toUserId || "").slice(0, 36) : null;
    if (ch === "private" && !toUid)
      return send(res, 400, { error: "缺少对方ID" });
    const [result] = await pool.execute(
      "INSERT INTO chat_messages (channel, from_user_id, from_username, from_player_name, from_realm_name, to_user_id, content) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        ch,
        user.id,
        user.username,
        playerName || user.username,
        realmName,
        toUid,
        text,
      ],
    );
    send(res, 200, { ok: true, id: result.insertId });
  } catch (e) {
    console.error("chat send err", e.message);
    send(res, 500, { error: "服务器错误" });
  }
});

async function getPlayerName(user) {
  try {
    const [chars] = await pool.execute(
      "SELECT c.name FROM characters c INNER JOIN saves s ON s.character_id = c.id WHERE s.user_id = ? ORDER BY s.updated_at DESC LIMIT 1",
      [user.id],
    );
    if (chars.length) return chars[0].name;
    const [saves] = await pool.execute(
      "SELECT player_name FROM saves WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1",
      [user.id],
    );
    return saves.length ? saves[0].player_name : null;
  } catch {
    return null;
  }
}

async function getPlayerRealmName(user) {
  try {
    const [rows] = await pool.execute(
      "SELECT lb.realm_name FROM leaderboard lb WHERE lb.user_id = ? LIMIT 1",
      [user.id],
    );
    return rows.length ? rows[0].realm_name : null;
  } catch {
    return null;
  }
}

// ========== 管理员 API ==========
app.get("/api/admin/users", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const [users] = await pool.execute(
      "SELECT * FROM users ORDER BY created_at DESC",
    );
    send(res, 200, { users: users.map(publicUser) });
  } catch (e) {
    send(res, 500, { error: "服务器错误" });
  }
});
app.get("/api/admin/users/:id/saves", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const [rows] = await pool.execute(
      "SELECT slot, meta_json, updated_at, LENGTH(raw) as rawSize FROM saves WHERE user_id = ?",
      [req.params.id],
    );
    send(res, 200, {
      saves: rows.map((r) => ({
        slot: r.slot,
        meta: r.meta_json,
        updatedAt: r.updated_at,
        rawSize: r.rawSize,
      })),
    });
  } catch (e) {
    send(res, 500, { error: "服务器错误" });
  }
});
app.post("/api/admin/users/:id/ban", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    await pool.execute(
      "UPDATE users SET disabled=1,disabled_at=NOW() WHERE id=?",
      [req.params.id],
    );
    await pool.execute("DELETE FROM sessions WHERE user_id=?", [req.params.id]);
    const [u] = await pool.execute("SELECT * FROM users WHERE id=?", [
      req.params.id,
    ]);
    send(res, 200, { ok: true, user: publicUser(u[0]) });
  } catch (e) {
    send(res, 500, { error: "服务器错误" });
  }
});
app.post("/api/admin/users/:id/unban", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    await pool.execute(
      "UPDATE users SET disabled=0,disabled_at=NULL WHERE id=?",
      [req.params.id],
    );
    const [u] = await pool.execute("SELECT * FROM users WHERE id=?", [
      req.params.id,
    ]);
    send(res, 200, { ok: true, user: publicUser(u[0]) });
  } catch (e) {
    send(res, 500, { error: "服务器错误" });
  }
});
app.post("/api/admin/users/:id/reset-password", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const { password } = req.body;
    if (!password || password.length < 6)
      return send(res, 400, { error: "新密码至少6位" });
    await pool.execute("UPDATE users SET password_hash=? WHERE id=?", [
      bcrypt.hashSync(password, 10),
      req.params.id,
    ]);
    if (req.params.id !== admin.id)
      await pool.execute("DELETE FROM sessions WHERE user_id=?", [
        req.params.id,
      ]);
    send(res, 200, { ok: true });
  } catch (e) {
    send(res, 500, { error: "服务器错误" });
  }
});

const ADMIN_REWARD_LIMITS = Object.freeze({
  money: 50000,
  spiritStone: 300,
  aura: 50000,
  cultivation: 100000,
  mana: 10000,
  stamina: 500,
  attributeExp: 1000,
  itemQuantity: 99,
  itemKinds: 12,
});
const clampRewardInt = (value, max, min = 0) =>
  Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));
const sanitizeRewardPayload = (r = {}) => ({
  money: clampRewardInt(r.money, ADMIN_REWARD_LIMITS.money),
  spiritStone: clampRewardInt(
    r.spiritStone ?? r.spirit_stone,
    ADMIN_REWARD_LIMITS.spiritStone,
  ),
  aura: clampRewardInt(r.aura, ADMIN_REWARD_LIMITS.aura),
  cultivation: clampRewardInt(r.cultivation, ADMIN_REWARD_LIMITS.cultivation),
  mana: clampRewardInt(r.mana, ADMIN_REWARD_LIMITS.mana),
  stamina: clampRewardInt(r.stamina, ADMIN_REWARD_LIMITS.stamina),
  attributeExp:
    r.attributeExp && typeof r.attributeExp === "object"
      ? {
          physique: clampRewardInt(
            r.attributeExp.physique,
            ADMIN_REWARD_LIMITS.attributeExp,
          ),
          strength: clampRewardInt(
            r.attributeExp.strength,
            ADMIN_REWARD_LIMITS.attributeExp,
          ),
          agility: clampRewardInt(
            r.attributeExp.agility,
            ADMIN_REWARD_LIMITS.attributeExp,
          ),
          perception: clampRewardInt(
            r.attributeExp.perception,
            ADMIN_REWARD_LIMITS.attributeExp,
          ),
        }
      : {},
  items: Array.isArray(r.items)
    ? r.items
        .slice(0, ADMIN_REWARD_LIMITS.itemKinds)
        .map((item) => ({
          itemId: String(item?.itemId || "").slice(0, 80),
          name: String(item?.name || "").slice(0, 40),
          quantity: clampRewardInt(
            item?.quantity,
            ADMIN_REWARD_LIMITS.itemQuantity,
            1,
          ),
          quality: ["normal", "fine", "excellent", "supreme"].includes(
            String(item?.quality || "normal"),
          )
            ? String(item?.quality || "normal")
            : "normal",
        }))
        .filter((item) => item.itemId)
    : [],
});
const rewardClampInfo = (before = {}, after = {}) => {
  const keys = [
    "money",
    "spiritStone",
    "aura",
    "cultivation",
    "mana",
    "stamina",
  ];
  const clamped = [];
  for (const k of keys) {
    const src =
      k === "spiritStone"
        ? (before.spiritStone ?? before.spirit_stone)
        : before[k];
    if (Number(src || 0) !== Number(after[k] || 0)) clamped.push(k);
  }
  return clamped;
};

const sanitizeFloatingWelfare = (input, fallback = {}) => {
  const src = input && typeof input === "object" ? input : fallback;
  const rawGifts = Array.isArray(src?.gifts)
    ? src.gifts
    : Array.isArray(fallback?.gifts)
      ? fallback.gifts
      : [];
  const cleanRewards = sanitizeRewardPayload;
  return {
    enabled: Boolean(src?.enabled),
    buttonText: String(src?.buttonText || "福利").slice(0, 12),
    title: String(src?.title || "仙乡福缘").slice(0, 30),
    desc: String(src?.desc || "").slice(0, 200),
    gifts: rawGifts
      .slice(0, 12)
      .map((gift, idx) => ({
        id:
          String(gift?.id || `gift_${idx + 1}`)
            .replace(/[^a-zA-Z0-9_-]/g, "")
            .slice(0, 40) || `gift_${idx + 1}`,
        type: ["newbie", "daily", "seven_day", "custom"].includes(
          String(gift?.type || "custom"),
        )
          ? String(gift?.type || "custom")
          : "custom",
        title: String(gift?.title || "福利礼包").slice(0, 30),
        desc: String(gift?.desc || "").slice(0, 160),
        enabled: gift?.enabled !== false,
        reset: welfareResetForGift({
          type: ["newbie", "daily", "seven_day", "custom"].includes(
            String(gift?.type || "custom"),
          )
            ? String(gift?.type || "custom")
            : "custom",
          reset: String(gift?.reset || "once"),
        }),
        rewards: cleanRewards(gift?.rewards || {}),
      }))
      .filter(
        (gift, index, gifts) =>
          gift.title && gifts.findIndex((candidate) => candidate.id === gift.id) === index,
      ),
  };
};

async function lockFloatingWelfareConfig(conn) {
  const [rows] = await conn.execute(
    "SELECT `value` FROM config WHERE `key` = 'floatingWelfare' LIMIT 1 FOR UPDATE",
  );
  const raw = rows.length
    ? safeJsonParse(rows[0].value, defaultConfig.floatingWelfare)
    : defaultConfig.floatingWelfare;
  const config = sanitizeFloatingWelfare(raw, defaultConfig.floatingWelfare);
  return { config, configVersion: floatingWelfareConfigVersion(config) };
}

async function lockWelfareFirstSeen(conn, userId, today) {
  await conn.execute(
    "INSERT IGNORE INTO floating_welfare_users (user_id, first_seen_date) VALUES (?, ?)",
    [userId, today],
  );
  const [rows] = await conn.execute(
    "SELECT DATE_FORMAT(first_seen_date, '%Y-%m-%d') AS first_seen_date FROM floating_welfare_users WHERE user_id = ? FOR UPDATE",
    [userId],
  );
  return String(rows[0]?.first_seen_date || today).slice(0, 10);
}

app.get("/api/floating-welfare", async (req, res) => {
  const conn = await pool.getConnection();
  let transactionStarted = false;
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    await conn.beginTransaction();
    transactionStarted = true;
    await conn.execute("SELECT id FROM users WHERE id = ? FOR UPDATE", [user.id]);
    const today = localDateKey(8);
    const firstSeenDate = await lockWelfareFirstSeen(conn, user.id, today);
    const { config, configVersion } = await lockFloatingWelfareConfig(conn);
    const gifts = config.gifts.map((gift) => {
      const period = resolveWelfarePeriod(gift, today, firstSeenDate);
      return {
        ...gift,
        periodKey: period.kind === "ok" ? period.periodKey : null,
        available: config.enabled && gift.enabled && period.kind === "ok",
      };
    });
    const sourceIds = gifts
      .filter((gift) => gift.periodKey)
      .map((gift) => floatingWelfareSourceId(configVersion, gift.id, gift.periodKey));
    let grants = [];
    if (sourceIds.length) {
      const placeholders = sourceIds.map(() => "?").join(",");
      const [rows] = await conn.execute(
        `SELECT id, source_id, state FROM asset_grants
         WHERE user_id = ? AND source_type = 'floating_welfare'
           AND source_id IN (${placeholders})`,
        [user.id, ...sourceIds],
      );
      grants = rows;
    }
    const states = new Map(grants.map((row) => [row.source_id, row]));
    await conn.commit();
    transactionStarted = false;
    res.setHeader("Cache-Control", "no-store");
    send(res, 200, {
      ...config,
      configVersion,
      firstSeenDate,
      today,
      timezone: "Asia/Shanghai",
      gifts: gifts.map((gift) => {
        const sourceId = gift.periodKey
          ? floatingWelfareSourceId(configVersion, gift.id, gift.periodKey)
          : null;
        const grant = sourceId ? states.get(sourceId) : null;
        return {
          ...gift,
          grantId: grant?.id || null,
          grantStatus: grant?.state || null,
          claimed: grant?.state === "consumed",
        };
      }),
    });
  } catch (e) {
    if (transactionStarted) {
      try { await conn.rollback(); } catch {}
    }
    console.error("floating welfare status err", e);
    send(res, 500, { error: "服务器错误" });
  } finally {
    conn.release();
  }
});

app.post("/api/floating-welfare/claim", async (req, res) => {
  const conn = await pool.getConnection();
  let transactionStarted = false;
  try {
    const user = await auth(req);
    if (!user) return send(res, 401, { error: "请先登录" });
    const giftId = String(req.body?.giftId || "").slice(0, 40);
    if (!giftId) return send(res, 400, { error: "福利礼包无效", code: "WELFARE_INVALID_GIFT" });
    await conn.beginTransaction();
    transactionStarted = true;
    await conn.execute("SELECT id FROM users WHERE id = ? FOR UPDATE", [user.id]);
    const [bindingRows] = await conn.execute(
      `SELECT c.slot, c.id AS character_id
       FROM characters c JOIN saves s
         ON s.user_id = c.user_id AND s.slot = c.slot AND s.character_id = c.id
       WHERE c.user_id = ? ORDER BY c.slot FOR UPDATE`,
      [user.id],
    );
    const binding = resolveRewardCharacter(bindingRows, req.body?.slot);
    if (binding.kind !== "ok") {
      await conn.rollback();
      transactionStarted = false;
      return send(res, binding.kind === "invalid_slot" ? 400 : 409, {
        error: binding.kind === "invalid_slot"
          ? "角色槽位无效，请重新进入角色后重试。"
          : "该角色槽位不属于当前账号或未绑定当前存档。",
        code: binding.kind === "invalid_slot" ? "WELFARE_INVALID_SLOT" : "WELFARE_SLOT_NOT_BOUND",
      });
    }
    const today = localDateKey(8);
    const firstSeenDate = await lockWelfareFirstSeen(conn, user.id, today);
    const { config, configVersion } = await lockFloatingWelfareConfig(conn);
    const gift = config.gifts.find((candidate) => candidate.id === giftId);
    if (!config.enabled || !gift || !gift.enabled) {
      await conn.rollback();
      transactionStarted = false;
      return send(res, 404, { error: "该福利当前不可领取", code: "WELFARE_NOT_AVAILABLE" });
    }
    const period = resolveWelfarePeriod(gift, today, firstSeenDate);
    if (period.kind !== "ok") {
      await conn.rollback();
      transactionStarted = false;
      return send(res, 409, {
        error: period.kind === "expired" ? "七日福利领取期已结束" : "福利周期无效",
        code: period.kind === "expired" ? "WELFARE_PERIOD_EXPIRED" : "WELFARE_INVALID_PERIOD",
      });
    }
    const selected = binding.binding;
    const sourceId = floatingWelfareSourceId(configVersion, gift.id, period.periodKey);
    const repo = {
      async findGrant(userId, sourceType, sourceIdValue) {
        const [rows] = await conn.execute(
          `SELECT id, character_id AS characterId, slot, state AS status,
                  payload_json AS rewardsJson FROM asset_grants
           WHERE user_id = ? AND source_type = ? AND source_id = ? LIMIT 1 FOR UPDATE`,
          [userId, sourceType, sourceIdValue],
        );
        return rows.length ? { ...rows[0], rewards: safeJsonParse(rows[0].rewardsJson, {}) } : null;
      },
      async insertGrant(grant) {
        await conn.execute(
          `INSERT INTO asset_grants
           (id, user_id, character_id, slot, grant_type, source_type, source_id, payload_json, state)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'issued')`,
          [grant.id, grant.userId, grant.characterId, grant.slot, grant.grantType,
           grant.sourceType, grant.sourceId, JSON.stringify(grant.rewards)],
        );
      },
      async insertIssuedLedger(grant) {
        await conn.execute(
          `INSERT INTO asset_ledger
           (user_id, character_id, slot, idempotency_key, event_type, source_type, source_id, delta_json)
           VALUES (?, ?, ?, ?, 'grant_issued', ?, ?, ?)`,
          [grant.userId, grant.characterId, grant.slot, `grant-issue:${grant.id}`,
           grant.sourceType, grant.sourceId, JSON.stringify(grant.rewards)],
        );
      },
    };
    const grantResult = await issueSourceGrant(repo, {
      userId: user.id,
      characterId: selected.characterId,
      slot: selected.slot,
      sourceType: "floating_welfare",
      sourceId,
      grantType: "floating_welfare_reward",
      grantId: uuidv4(),
      // Rewards come only from the locked, sanitized server config.
      rewards: gift.rewards,
    });
    if (grantResult.kind === "character_mismatch") {
      await conn.rollback();
      transactionStarted = false;
      return send(res, 409, {
        error: "该福利已绑定其他角色，请切回原角色重试。",
        code: "WELFARE_GRANT_CHARACTER_MISMATCH",
      });
    }
    if (grantResult.kind === "consumed") {
      await conn.rollback();
      transactionStarted = false;
      return send(res, 409, { error: "该福利已经领取", code: "WELFARE_ALREADY_APPLIED" });
    }
    await conn.commit();
    transactionStarted = false;
    send(res, 200, {
      ok: true,
      idempotent: grantResult.idempotent,
      grantId: grantResult.grant.id,
      grantStatus: "issued",
      pendingSave: true,
      slot: selected.slot,
      giftId: gift.id,
      title: gift.title,
      desc: gift.desc,
      configVersion,
      periodKey: period.periodKey,
      rewards: grantResult.grant.rewards,
    });
  } catch (e) {
    if (transactionStarted) {
      try { await conn.rollback(); } catch {}
    }
    console.error("floating welfare claim err", e);
    send(res, 500, { error: "服务器错误" });
  } finally {
    conn.release();
  }
});

app.get("/api/admin/config", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    send(res, 200, await getConfig());
  } catch (e) {
    send(res, 500, { error: "服务器错误" });
  }
});
app.put("/api/admin/config", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const body = req.body,
      cfg = await getConfig();
    const updates = {
      siteName: String(body.siteName ?? cfg.siteName).slice(0, 30),
      announcement: String(body.announcement ?? cfg.announcement).slice(
        0,
        1000,
      ),
      announcementIntervalHours: Math.max(
        0,
        Math.min(
          720,
          Number(
            body.announcementIntervalHours ?? cfg.announcementIntervalHours,
          ) || 24,
        ),
      ),
      aboutQqText: String(body.aboutQqText ?? cfg.aboutQqText).slice(0, 80),
      aboutQqUrl: String(body.aboutQqUrl ?? cfg.aboutQqUrl).slice(0, 500),
      aboutGithubUrl: String(body.aboutGithubUrl ?? cfg.aboutGithubUrl).slice(
        0,
        500,
      ),
      aboutTapTapUrl: String(body.aboutTapTapUrl ?? cfg.aboutTapTapUrl).slice(
        0,
        500,
      ),
      iosDownloadUrl: String(
        body.iosDownloadUrl ?? cfg.iosDownloadUrl ?? "",
      ).slice(0, 1000),
      androidDownloadUrl: String(
        body.androidDownloadUrl ?? cfg.androidDownloadUrl ?? "",
      ).slice(0, 1000),
      sponsorAlipayImageUrl: String(
        body.sponsorAlipayImageUrl ?? cfg.sponsorAlipayImageUrl,
      ).slice(0, 1000),
      sponsorWechatImageUrl: String(
        body.sponsorWechatImageUrl ?? cfg.sponsorWechatImageUrl,
      ).slice(0, 1000),
      sponsorAfdianUrl: String(
        body.sponsorAfdianUrl ?? cfg.sponsorAfdianUrl,
      ).slice(0, 500),
      groupEntry: {
        enabled: Boolean(body.groupEntry?.enabled),
        buttonText: String(
          body.groupEntry?.buttonText ??
            cfg.groupEntry?.buttonText ??
            "点我加群",
        )
          .trim()
          .slice(0, 12),
        url: String(body.groupEntry?.url ?? cfg.groupEntry?.url ?? "")
          .trim()
          .slice(0, 1000),
      },
      floatingWelfare: sanitizeFloatingWelfare(
        body.floatingWelfare ?? cfg.floatingWelfare,
        cfg.floatingWelfare,
      ),
      registrationEnabled: Boolean(body.registrationEnabled),
      maintenanceMode: Boolean(body.maintenanceMode),
      updateLogs: Array.isArray(body.updateLogs)
        ? body.updateLogs
            .slice(0, 100)
            .map((x) => ({
              date: String(
                x?.date || new Date().toISOString().slice(0, 10),
              ).slice(0, 20),
              title: String(x?.title || "").slice(0, 80),
              content: String(x?.content || "").slice(0, 1000),
            }))
            .filter((x) => x.title || x.content)
        : cfg.updateLogs,
    };
    await setConfigMulti(updates);
    send(res, 200, await getConfig());
  } catch (e) {
    send(res, 500, { error: "服务器错误" });
  }
});
app.get("/api/admin/overview", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const [[{ uc }]] = await pool.execute("SELECT COUNT(*) as uc FROM users");
    const [[{ sc }]] = await pool.execute("SELECT COUNT(*) as sc FROM saves");
    const [[{ pc }]] = await pool.execute(
      "SELECT COUNT(*) as pc FROM sessions",
    );
    const [users] = await pool.execute(
      "SELECT * FROM users ORDER BY created_at DESC",
    );
    const enrichedUsers = [];
    for (const u of users) {
      const pu = publicUser(u);
      const [saves] = await pool.execute(
        "SELECT slot, meta_json, updated_at, LENGTH(raw) as rawSize FROM saves WHERE user_id = ? ORDER BY slot",
        [u.id],
      );
      let saveCount = 0,
        lastSaveAt = null,
        saveDetails = [];
      for (const s of saves) {
        saveCount++;
        const mj = s.meta_json
          ? typeof s.meta_json === "string"
            ? JSON.parse(s.meta_json)
            : s.meta_json
          : {};
        saveDetails.push({
          slot: s.slot,
          playerName: mj.playerName || "未知",
          year: mj.year,
          season: mj.season,
          day: mj.day,
          money: mj.money,
          updatedAt: s.updated_at,
          rawSize: s.rawSize,
        });
        if (!lastSaveAt || s.updated_at > lastSaveAt) lastSaveAt = s.updated_at;
      }
      pu.saveCount = saveCount;
      pu.lastSaveAt = lastSaveAt;
      pu.saves = saveDetails;
      enrichedUsers.push(pu);
    }
    send(res, 200, {
      stats: { userCount: uc, saveCount: sc, sessionCount: pc },
      users: enrichedUsers,
    });
  } catch (e) {
    send(res, 500, { error: "服务器错误" });
  }
});
app.get("/api/admin/save-audit-events", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const keyword = String(req.query.keyword || "").trim();
    const type = String(req.query.type || "").trim();
    const status = String(req.query.status || "").trim();
    const params = [];
    const where = [];
    if (keyword) {
      where.push("(username LIKE ? OR player_name LIKE ? OR user_id = ?)");
      params.push(`%${keyword}%`, `%${keyword}%`, keyword);
    }
    if (type) {
      where.push("event_type = ?");
      params.push(type);
    }
    if (status) {
      where.push("status = ?");
      params.push(status);
    }
    const sql = `SELECT id, user_id, username, character_id, player_name, slot, event_type, status, raw_size, data_size, data_hash, client_loaded_at, server_updated_at, detail_json, ip, user_agent, created_at FROM save_audit_events ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY id DESC LIMIT ${limit}`;
    const [rows] = await pool.execute(sql, params);
    send(res, 200, {
      events: rows.map((r) => ({
        ...r,
        detail: safeJsonParse(r.detail_json, null),
      })),
    });
  } catch (e) {
    console.error("admin save audit events err", e);
    send(res, 500, { error: "服务器错误" });
  }
});

app.get("/api/admin/economy-events", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const keyword = String(req.query.keyword || "").trim();
    const type = String(req.query.type || "").trim();
    const params = [];
    const where = [];
    if (keyword) {
      where.push("(username LIKE ? OR player_name LIKE ? OR user_id = ?)");
      params.push(`%${keyword}%`, `%${keyword}%`, keyword);
    }
    if (type) {
      where.push("event_type = ?");
      params.push(type);
    }
    const sql = `SELECT id, user_id, username, character_id, player_name, event_type, amount, item_id, quantity, quality, source, detail_json, ip, user_agent, created_at FROM economy_events ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY id DESC LIMIT ${limit}`;
    const [rows] = await pool.execute(sql, params);
    send(res, 200, {
      events: rows.map((r) => ({
        ...r,
        detail: safeJsonParse(r.detail_json, null),
      })),
    });
  } catch (e) {
    console.error("admin economy events err", e);
    send(res, 500, { error: "服务器错误" });
  }
});

app.post("/api/admin/mails", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const { title, content, rewards } = req.body;
    const target = req.body.target ?? req.body.to;
    const cleanTitle = String(title || "").trim();
    if (!cleanTitle) return send(res, 400, { error: "标题必填" });
    const cleanRewards = sanitizeRewardPayload(rewards || {});
    const rewardJson = JSON.stringify(cleanRewards);
    let users = [];
    if (!target || target === "all") {
      const [rows] = await conn.execute(
        "SELECT id FROM users WHERE disabled = 0",
      );
      users = rows;
    } else {
      const [rows] = await conn.execute(
        "SELECT id FROM users WHERE id = ? AND disabled = 0 LIMIT 1",
        [target],
      );
      if (!rows.length)
        return send(res, 404, { error: "收件人不存在或已封禁" });
      users = rows;
    }
    if (!users.length) return send(res, 400, { error: "没有可发送的收件人" });
    await conn.beginTransaction();
    const ids = [];
    for (const u of users) {
      const id = uuidv4();
      ids.push(id);
      await conn.execute(
        "INSERT INTO user_mails (id, user_id, title, content, rewards, from_name) VALUES (?, ?, ?, ?, ?, ?)",
        [id, u.id, cleanTitle, content || "", rewardJson, "系统"],
      );
    }
    await conn.commit();
    await recordEconomyEvent(admin, req, {
      eventType: "admin_mail_send",
      amount: Number(cleanRewards.money || 0),
      source: "admin_mail",
      detail: {
        target: target || "all",
        count: ids.length,
        rewards: cleanRewards,
        clamped: rewardClampInfo(rewards || {}, cleanRewards),
      },
    });
    send(res, 200, {
      ok: true,
      id: ids[0],
      ids,
      count: ids.length,
      rewards: cleanRewards,
    });
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    console.error("admin send user mails err", e);
    send(res, 500, { error: "服务器错误" });
  } finally {
    conn.release();
  }
});

const PORT = process.env.PORT || 3001;
ensureSchema()
  .then(() =>
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`taoyuan backend listening on ${PORT}`),
    ),
  )
  .catch((e) => {
    console.error("schema init failed", e);
    process.exit(1);
  });
