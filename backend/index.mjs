import express from 'express'
import mysql from 'mysql2/promise'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { v4 as uuidv4 } from 'uuid'

// 兼容旧 pbkdf2 密码验证
function verifyLegacyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':')
  if (!salt || !hash) return false
  const got = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(got))
}

function safeJsonParse(val, fallback = null) {
  if (typeof val === 'object') return val
  try { return JSON.parse(String(val)) } catch { return fallback }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SOURCE_ROOT = process.env.TAOYUAN_SOURCE_ROOT || path.resolve(__dirname, '..')
const CLIENT_BUNDLE_DIR = process.env.TAOYUAN_CLIENT_BUNDLE_DIR || path.join(SOURCE_ROOT, 'client-dist')

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

const pool = mysql.createPool({
  host: 'localhost', user: 'taoyuan', password: 'taoyuan2026',
  database: 'taoyuan', waitForConnections: true, connectionLimit: 10, charset: 'utf8mb4'
})


function normalizePlayerName(name) {
  return String(name || '').trim().slice(0, 20)
}
function safeStringify(val) {
  if (val == null) return null
  return typeof val === 'string' ? val : JSON.stringify(val)
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)


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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

  await pool.execute(`INSERT IGNORE INTO user_mails (id, user_id, legacy_mail_id, title, content, rewards, from_name, claimed, claimed_at, created_at)
    SELECT UUID(), u.id, m.id, m.title, m.content, m.rewards, m.from_name,
      CASE WHEN mc.id IS NULL THEN 0 ELSE 1 END,
      CASE WHEN mc.id IS NULL THEN NULL ELSE m.created_at END,
      m.created_at
    FROM mails m
    JOIN users u ON (m.target = 'all' OR m.target = u.id)
    LEFT JOIN mail_claims mc ON mc.mail_id = m.id AND mc.user_id = u.id`)

  const [characterIdCols] = await pool.execute("SHOW COLUMNS FROM saves LIKE 'character_id'")
  if (!characterIdCols.length) await pool.execute("ALTER TABLE saves ADD COLUMN character_id VARCHAR(36) NULL AFTER user_id")
  const [playerNameCols] = await pool.execute("SHOW COLUMNS FROM saves LIKE 'player_name'")
  if (!playerNameCols.length) await pool.execute("ALTER TABLE saves ADD COLUMN player_name VARCHAR(20) NULL AFTER slot")
  const [idx] = await pool.execute("SHOW INDEX FROM saves WHERE Key_name = 'idx_saves_player_name'")
  if (!idx.length) await pool.execute("ALTER TABLE saves ADD INDEX idx_saves_player_name (player_name)")
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
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
    INDEX idx_feedbacks_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
}

function send(res, status, data) { res.status(status).json(data) }
function toMysqlDateTime(val) {
  if (!val) return null
  const d = val instanceof Date ? val : new Date(val)
  if (!Number.isFinite(d.getTime())) return null
  return d.toISOString().slice(0, 19).replace(String.fromCharCode(84), String.fromCharCode(32))
}
function saveSummary(raw, data, meta = {}) {
  const dataText = data ? JSON.stringify(data) : ''
  const rawText = raw ? String(raw) : ''
  const source = dataText || rawText
  const p = data?.player || data?.playerStore || data?.stores?.player || {}
  const cu = data?.cultivation || data?.cultivationStore || data?.stores?.cultivation || {}
  const g = data?.game || data?.gameStore || data?.stores?.game || {}
  const inv = data?.inventory || data?.inventoryStore || data?.stores?.inventory || {}
  const items = inv.items || inv.inventory || inv.bag || []
  return {
    rawSize: rawText.length,
    dataSize: dataText.length,
    dataHash: source ? crypto.createHash('sha256').update(source).digest('hex') : null,
    money: p.money ?? meta.money ?? null,
    playerName: normalizePlayerName(meta.playerName || p.playerName || p.name || ''),
    year: g.year ?? meta.year ?? null,
    season: g.season ?? meta.season ?? null,
    day: g.day ?? meta.day ?? null,
    realm: cu.realmName ?? cu.realm ?? cu.realmIndex ?? null,
    cultivation: cu.cultivation ?? null,
    itemKinds: Array.isArray(items) ? items.length : (items && typeof items === 'object' ? Object.keys(items).length : null)
  }
}

function saveSummaryNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}
async function validateSaveProgression(user, req, { slot, summary, currentSaveRow, plainData, meta, saveCharacterId, playerName }) {
  if (!currentSaveRow || !currentSaveRow.data_json || !plainData) return null
  const prev = safeJsonParse(currentSaveRow.data_json, null)
  if (!prev) return null
  const prevSummary = saveSummary(currentSaveRow.raw || currentSaveRow.data_json || '', prev, {})
  const prevMoney = saveSummaryNumber(prevSummary.money, 0)
  const nextMoney = saveSummaryNumber(summary.money, prevMoney)
  const prevCultivation = saveSummaryNumber(prevSummary.cultivation, 0)
  const nextCultivation = saveSummaryNumber(summary.cultivation, prevCultivation)
  const prevDay = saveSummaryNumber(prevSummary.day, 1)
  const nextDay = saveSummaryNumber(summary.day, prevDay)
  const dayDelta = Math.max(0, nextDay - prevDay)
  const moneyDelta = nextMoney - prevMoney
  const cultivationDelta = nextCultivation - prevCultivation
  const reasons = []

  // 正常玩法可以在结算、邮件、活动里增长，但分钟级直接写入千万/十亿级资产应拒绝。
  // 按游戏节奏给足宽限：单次保存最多允许 100万 + 每推进1天 100万 铜钱；修为最多允许 200万 + 每天 200万。
  if (moneyDelta > 1000000 + dayDelta * 1000000) reasons.push(`money_jump:${prevMoney}->${nextMoney}`)
  if (cultivationDelta > 2000000 + dayDelta * 2000000) reasons.push(`cultivation_jump:${prevCultivation}->${nextCultivation}`)
  if (nextMoney >= 100000000 && moneyDelta > 10000000) reasons.push(`money_ceiling_jump:${prevMoney}->${nextMoney}`)
  if (!reasons.length) return null

  await recordSaveAuditEvent(user, req, {
    eventType: 'save_guard', status: 'rejected', slot,
    characterId: currentSaveRow.character_id || saveCharacterId,
    playerName: currentSaveRow.player_name || playerName || summary.playerName,
    rawSize: summary.rawSize, dataSize: summary.dataSize, dataHash: summary.dataHash,
    clientLoadedAt: meta?.lastLoadedAt || null, serverUpdatedAt: currentSaveRow.updated_at,
    detail: { ...summary, previous: { money: prevMoney, cultivation: prevCultivation, day: prevDay }, reasons }
  })
  return { error: '检测到异常存档写入，已拒绝保存。请刷新页面或联系管理员处理。', saveGuard: true, reasons }
}


function validateInitialCharacterSave(summary) {
  const money = saveSummaryNumber(summary.money, 0)
  const cultivation = saveSummaryNumber(summary.cultivation, 0)
  const year = saveSummaryNumber(summary.year, 1)
  const day = saveSummaryNumber(summary.day, 1)
  const reasons = []
  // 新建角色只能提交接近新号的初始存档，防止通过创建角色接口注入高资产/高修为存档。
  if (money > 10000) reasons.push(`initial_money:${money}`)
  if (cultivation > 1000) reasons.push(`initial_cultivation:${cultivation}`)
  if (year > 1 || day > 2) reasons.push(`initial_time:${year}-${day}`)
  return reasons
}

async function recordSaveAuditEvent(user, req, event = {}) {
  if (!user) return
  try {
    const detail = event.detail == null ? null : JSON.stringify(event.detail)
    await pool.execute(`INSERT INTO save_audit_events
      (user_id, username, character_id, player_name, slot, event_type, status, raw_size, data_size, data_hash, client_loaded_at, server_updated_at, detail_json, ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        user.id,
        user.username,
        event.characterId || null,
        normalizePlayerName(event.playerName || '') || null,
        Number.isFinite(Number(event.slot)) ? Math.trunc(Number(event.slot)) : 0,
        String(event.eventType || 'unknown').slice(0, 40),
        String(event.status || 'ok').slice(0, 20),
        Number.isFinite(Number(event.rawSize)) ? Math.trunc(Number(event.rawSize)) : 0,
        Number.isFinite(Number(event.dataSize)) ? Math.trunc(Number(event.dataSize)) : 0,
        event.dataHash || null,
        toMysqlDateTime(event.clientLoadedAt),
        toMysqlDateTime(event.serverUpdatedAt),
        detail,
        String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').slice(0, 80),
        String(req.headers['user-agent'] || '').slice(0, 255)
      ])
  } catch (e) { console.error('save audit err', e.message) }
}
async function recordEconomyEvent(user, req, event = {}) {
  if (!user) return
  try {
    const slot = Number.isFinite(Number(event.slot)) ? Number(event.slot) : null
    let characterId = event.characterId || null
    let playerName = normalizePlayerName(event.playerName || '') || null
    if ((!characterId || !playerName) && slot !== null) {
      const [rows] = await pool.execute('SELECT s.character_id, COALESCE(c.name, s.player_name) AS player_name FROM saves s LEFT JOIN characters c ON c.id = s.character_id WHERE s.user_id = ? AND s.slot = ? LIMIT 1', [user.id, slot])
      if (rows.length) {
        characterId = characterId || rows[0].character_id || null
        playerName = playerName || rows[0].player_name || null
      }
    }
    const detail = event.detail == null ? null : JSON.stringify(event.detail)
    await pool.execute(`INSERT INTO economy_events
      (user_id, username, character_id, player_name, event_type, amount, item_id, quantity, quality, source, detail_json, ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        user.id,
        user.username,
        characterId,
        playerName,
        String(event.eventType || event.type || 'unknown').slice(0, 40),
        Number.isFinite(Number(event.amount)) ? Math.trunc(Number(event.amount)) : 0,
        event.itemId ? String(event.itemId).slice(0, 80) : null,
        Number.isFinite(Number(event.quantity)) ? Math.trunc(Number(event.quantity)) : 0,
        event.quality ? String(event.quality).slice(0, 30) : null,
        event.source ? String(event.source).slice(0, 80) : null,
        detail,
        String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').slice(0, 80),
        String(req.headers['user-agent'] || '').slice(0, 255)
      ])
  } catch (e) { console.error('economy event err', e.message) }
}
function publicUser(u) {
  if (!u) return null
  return { id: u.id, username: u.username, role: u.role, createdAt: u.created_at, disabled: !!u.disabled, disabledAt: u.disabled_at || null }
}
async function auth(req) {
  const h = req.headers.authorization || ''
  const t = h.startsWith('Bearer ') ? h.slice(7) : ''
  if (!t) return null
  const [rows] = await pool.execute('SELECT user_id FROM sessions WHERE token = ?', [t])
  if (!rows.length) return null
  const [users] = await pool.execute('SELECT * FROM users WHERE id = ? AND disabled = 0', [rows[0].user_id])
  return users.length ? users[0] : null
}
async function requireAdmin(req, res) {
  const u = await auth(req)
  if (!u || u.role !== 'admin') { send(res, 403, { error: '需要管理员权限' }); return null }
  return u
}

// 境界列表 (V0.4: 30级)
const REALMS = ['凡人','炼气一层','炼气二层','炼气三层','炼气四层','炼气五层','炼气六层','炼气七层','炼气八层','炼气九层','筑基初期','筑基中期','筑基后期','金丹初期','金丹中期','金丹后期','元婴初期','元婴中期','元婴后期','化神初期','化神中期','化神后期','渡劫初期','渡劫中期','渡劫后期','大乘初期','大乘中期','大乘后期']
const IMMORTAL_REALMS = [
  { name: '真仙', powerBonus: 0 },
  { name: '玄仙', powerBonus: 220 },
  { name: '地仙', powerBonus: 520 },
  { name: '天仙', powerBonus: 960 },
  { name: '太乙金仙', powerBonus: 1700 }
]
const realmNameFromSave = (cu = {}, asc = {}) => asc?.ascended ? (IMMORTAL_REALMS[Math.max(0, Math.min(IMMORTAL_REALMS.length - 1, Number(asc.immortalRealmStage || 0)))]?.name || '真仙') : (REALMS[Math.max(0, Math.min(REALMS.length - 1, Number(cu.realmIndex ?? cu.realm ?? 0) || 0))] || '凡人')
const realmSortIndexFromSave = (cu = {}, asc = {}) => asc?.ascended ? REALMS.length + Math.max(0, Math.min(IMMORTAL_REALMS.length - 1, Number(asc.immortalRealmStage || 0))) : Math.max(0, Math.min(REALMS.length - 1, Number(cu.realmIndex ?? cu.realm ?? 0) || 0))

const REALM_STATS = [
  { name: '凡人', maxCultivation: 100, maxMana: 30 },
  { name: '炼气一层', maxCultivation: 220, maxMana: 45 },
  { name: '炼气二层', maxCultivation: 420, maxMana: 65 },
  { name: '炼气三层', maxCultivation: 760, maxMana: 90 },
  { name: '炼气四层', maxCultivation: 1200, maxMana: 120 },
  { name: '炼气五层', maxCultivation: 1800, maxMana: 155 },
  { name: '炼气六层', maxCultivation: 2600, maxMana: 195 },
  { name: '炼气七层', maxCultivation: 3700, maxMana: 240 },
  { name: '炼气八层', maxCultivation: 5200, maxMana: 290 },
  { name: '炼气九层', maxCultivation: 7200, maxMana: 350 },
  { name: '筑基初期', maxCultivation: 11000, maxMana: 460 },
  { name: '筑基中期', maxCultivation: 16000, maxMana: 580 },
  { name: '筑基后期', maxCultivation: 24000, maxMana: 720 },
  { name: '金丹初期', maxCultivation: 40000, maxMana: 1000 },
  { name: '金丹中期', maxCultivation: 65000, maxMana: 1400 },
  { name: '金丹后期', maxCultivation: 100000, maxMana: 2000 },
  { name: '元婴初期', maxCultivation: 160000, maxMana: 2800 },
  { name: '元婴中期', maxCultivation: 250000, maxMana: 3800 },
  { name: '元婴后期', maxCultivation: 400000, maxMana: 5200 },
  { name: '化神初期', maxCultivation: 650000, maxMana: 7200 },
  { name: '化神中期', maxCultivation: 1000000, maxMana: 10000 },
  { name: '化神后期', maxCultivation: 1600000, maxMana: 14000 },
  { name: '渡劫初期', maxCultivation: 2600000, maxMana: 20000 },
  { name: '渡劫中期', maxCultivation: 4200000, maxMana: 28000 },
  { name: '渡劫后期', maxCultivation: 6800000, maxMana: 40000 },
  { name: '大乘初期', maxCultivation: 11000000, maxMana: 58000 },
  { name: '大乘中期', maxCultivation: 18000000, maxMana: 82000 },
  { name: '大乘后期', maxCultivation: 30000000, maxMana: 120000 }
]

const defaultConfig = {
  siteName: '桃源乡',
  announcement: '欢迎来到桃源乡自主更新版。',
  registrationEnabled: true, maintenanceMode: false, announcementIntervalHours: 24,
  aboutQqText: '718630139', aboutQqUrl: 'https://qm.qq.com/q/2BVaTTwDkI',
  aboutGithubUrl: 'https://github.com/setube/taoyuan', aboutTapTapUrl: 'https://www.taptap.cn/app/383510',
  iosDownloadUrl: '', androidDownloadUrl: '',
  sponsorAlipayImageUrl: '', sponsorWechatImageUrl: '', sponsorAfdianUrl: 'https://afdian.com/a/setube',
  floatingWelfare: {
    enabled: true,
    buttonText: '福利',
    title: '桃源福利',
    desc: '管理员可在后台调整悬浮福利内容，奖励会直接进入当前存档。',
    gifts: [
      { id: 'newbie', type: 'newbie', title: '新手福利', desc: '新号起步补给，助你更快进入种田修仙循环。', enabled: true, reset: 'once', rewards: { money: 5000, spiritStone: 40, aura: 800, cultivation: 1200, items: [{ itemId: 'mana_recovery_pill', name: '回灵丹', quantity: 3 }, { itemId: 'qi_gathering_pill', name: '聚气丹', quantity: 2 }] } },
      { id: 'daily', type: 'daily', title: '每日福利', desc: '每日登录可领，补充日常修行和商圈消耗。', enabled: true, reset: 'daily', rewards: { money: 1600, spiritStone: 8, aura: 240, cultivation: 360, items: [{ itemId: 'mana_recovery_pill', name: '回灵丹', quantity: 1 }] } },
      { id: 'seven_day', type: 'seven_day', title: '七日福利', desc: '七日内每天可领一档，适合新玩家连续成长。', enabled: true, reset: 'sevenDay', rewards: { money: 3000, spiritStone: 18, aura: 560, cultivation: 800, items: [{ itemId: 'foundation_pill', name: '筑基丹', quantity: 1 }] } }
    ]
  },
  updateLogs: [
    {"date":"2026-07-11","title":"V2.8.1 仙界裂隙首领深化","content":"混沌裂隙升级为更完整的仙界副本首领循环：四个裂隙分别拥有具名首领、三段战斗阶段、弱点仙术、层数加深与专属掉落。战斗中会根据首领阶段重组护盾、提升反击、狂暴反噬或侵蚀仙力；命中弱点可降低仙力消耗、提高暴击与伤害。镇压成功后除了功德、仙玉、法则和仙器精魄，还会掉落太虚尘、星陨铁、妖丹、雷精等对应材料，让仙界战斗、副本、仙器养成和资源循环更紧密。"},
    {"date":"2026-07-10","title":"V2.8.0 仙界角色战斗基础","content":"仙界正式建立角色战斗属性：仙战力、气血、仙力、仙攻、仙防、暴击与减伤均由仙阶、三元仙身、仙器、洞天、命盘和道统共同计算，并兼容旧云存档自动补全。混沌裂隙改为真实资源战斗：仙术消耗仙力，首领会反击，仙防/减伤/暴击参与结算，回合回复仙力；气血归零则本轮失败但保留首领进度。仙界大厅新增完整战斗总览与气血、仙力动态条。"},
    {"date":"2026-07-10","title":"V2.7.2 豪华仙身总览大厅","content":"仙界大厅升级为豪华仙身总览：扩大立绘仙门舞台与云阙档案样式，集中展示仙阶、仙职、道统、本命仙术、仙器共鸣、洞天稳定、斗法战绩、裂隙镇压、三元仙身与最近云阙战报；日常天诏仍保留为独立地图分区，大厅不再堆叠任务内容。"},
    {"date":"2026-07-10","title":"V2.7.1 云阙天诏与仙术流派","content":"仙界大厅恢复为纯粹的仙身展示与分区入口；新增独立地图分区“云阙天诏”，承载每日试炼、裂隙镇压、洞天派遣与每周仙器淬炼目标，完成可领取功德、仙玉、法则和仙器精魄。四类仙术加入实战流派：紫霄雷印擅长破盾，曜阳真火随战斗回合增强，星河剑受斗法连胜强化，云体护身依托仙体稳健加成。"},
    {"date":"2026-07-10","title":"V2.7.0 裂隙首领战与洞天派遣","content":"混沌裂隙升级为阶段首领战：首领拥有仙躯、法则护盾与狂暴阶段，玩家要连续施放仙术破盾、压低血量后才可镇压，首领战况会实时保存在云档；洞天新增云海巡游、星砂采炼、裂隙镇守三类每日派遣，要求先建设对应洞天节点，产出功德、仙玉、法则与仙器精魄，让仙界形成可持续的日常养成循环。"},
    {"date":"2026-07-10","title":"V2.6.9 仙器谱与六部位共鸣","content":"仙界新增完整仙器谱：星河仙剑、云阙仙冠、玄霄仙甲、太虚仙佩、天命道印、流云仙履六部位。仙域试炼与混沌裂隙掉落仙器精魄，可消耗精魄、仙玉与法则淬炼仙器；两件/四件/六件达到Lv.3会激活仙装共鸣，形成飞升后独立的长期装备养成、战力构筑与裂隙挑战循环。"},
    {"date": "2026-07-10", "title": "V2.6.6 管理员仙界预览模式", "content": "新增管理员专用仙界预览入口，admin 可临时进入仙界页面检查界面与功能完整性；预览数据不写入真实存档、不进入排行榜、不触发公告，退出后恢复原进度。"},
    {"date": "2026-07-10", "title": "V2.6.5 仙界界面视觉强化", "content": "仙界页整体视觉升级：新增星穹背景、仙门轨道光效、卡片流光、按钮辉光与仙界面板玻璃质感，让飞升后的界面更有仙域氛围。"},
    {"date": "2026-07-10", "title": "V2.6.4 丹药使用规则收紧", "content": "按反馈收紧丹药规则：时间禁锢丹改为现实30分钟，每个现实日最多3次；体力丹改为每个现实日最多5次；游戏时间到凌晨2点后禁止使用所有丹药，必须休息后再继续。"},
    {"date": "2026-07-10", "title": "V2.6.3 体力丹服用时间成本修复", "content": "继续修复体力丹防刷：体力丹服用本身也会推进少量游戏时间，凌晨2点后禁止服用，避免玩家在打坐到2点后继续无时间成本连吃体力丹。"},
    {"date": "2026-07-10", "title": "V2.6.2 体力丹与自动打坐防刷修复", "content": "修复快捷栏体力丹可被连点/扣除失败后仍恢复体力的问题：体力丹改为先扣物品再生效，并加入每日服用上限与短冷却；后台自动打坐每次会推进少量游戏时间，时间冻结期间不再执行自动打坐，防止卡凌晨2点无时间成本修炼。"},
    {"date": "2026-07-10", "title": "V2.6.1 奖励与公告防伪校验", "content": "安全巡检并加固潜在注入点：世界妖潮周期奖励不再信任客户端上报贡献，改由服务端云存档计算；突破公告校验角色归属、境界合法性与云档当前境界并加入频率限制；客户端经济日志只允许白名单类型，避免伪造系统奖励审计。"},
    {"date": "2026-07-10", "title": "V2.6.0 五格快捷栏", "content": "快捷使用升级为五格快捷栏：背包中可将最多5个可用物品加入快捷栏，点击游戏内悬浮快捷按钮会弹出五格选择，点选后立即使用，对应用完会自动移出快捷栏。"},
    {"date": "2026-07-10", "title": "V2.5.9 快捷物品设置与一键使用", "content": "调整快捷用药交互：不再把快捷做成第二个背包页；玩家需在背包中选择可用物品设为快捷，游戏内右侧悬浮快捷按钮会直接使用该物品，用完后自动取消并提示重新设置。"},
    {"date": "2026-07-10", "title": "V2.5.8 前端注入与后台奖励拦截", "content": "修复保存管理器手动上传未携带云档加载时间导致异常存档可绕过拦截的问题；后端保存接口始终读取当前云档做进度跳变校验；后台悬浮福利和GM邮件奖励统一清洗限额，阻断通过后台配置注入超大铜钱。"},
    {"date": "2026-07-10", "title": "V2.5.8 前端注入存档拦截修复", "content": "修复保存管理器手动上传未携带云档加载时间导致异常存档可绕过拦截的问题；后端保存接口改为始终读取当前云档进行进度跳变校验，并限制新建角色初始存档边界。"},
    {"date": "2026-07-10", "title": "V2.5.7 快捷入口悬浮与异常角色重置", "content": "将“快捷用药”入口从地图随身区域移出，改为游戏内右侧悬浮按钮；按运营处理将角色“牛马在线”保留账号/角色名并回滚为新号初始状态。"},
    {"date": "2026-07-10", "title": "V2.5.6 快捷用药与时间禁锢丹", "content": "新增游戏侧边页“快捷用药”，汇总背包中可直接使用的食物、丹药与功能道具；新增体力丹，使用后体力+100且可临时超过上限，最多额外+500；新增时间禁锢丹，使用后暂停游戏时间流逝3小时现实时间；两种新丹药接入现有背包/丹药使用体系，并在修仙市集以较高灵石价格出售。"},
    {"date":"2026-07-10","title":"V2.5.5 云存档下载恢复","content":"修复禁用本地文件导入后，账号云存档下载继续游戏误提示存档损坏的问题；保留玩家手动导入/导出入口禁用，仅恢复云端下载写入本地槽位的内部能力。"},
    {"date": "2026-07-10", "title": "V2.5.4 存档安全与异常资产修复", "content": "禁用玩家本地文件导入/导出存档入口，保留账号云存档保存/下载；服务端新增异常写档拦截，拒绝分钟级大额铜钱或修为跳变，防止客户端篡改云档；修正角色“牛马在线”异常铜钱与修为。"},
    {"date": "2026-07-10", "title": "V2.5.3 凡界仙界境界划分修正", "content": "修正境界设定：凡界主境界最高到大乘后期，真仙与玄仙移入飞升后的仙界仙阶；仙界仙阶调整为真仙→玄仙→地仙→天仙→太乙金仙。排行榜与战力计算同步识别仙界仙阶，旧存档若曾写入真仙/玄仙主境界，会兼容压回大乘后期并以仙界仙阶展示。"},
    {"date": "2026-07-10", "title": "V2.5.2 排行榜战力境界权重修复", "content": "修复排行榜战力和角色页战力口径不一致的问题：排行榜服务端不再按当前修为、当前灵气、当前灵力等临时资源计算战力，改为按境界上限、灵力上限、境界阶段权重和稳定养成底蕴计算；同步提高高境界基础权重，避免高境界玩家战力异常低于低境界玩家。"},
    {"date": "2026-07-10", "title": "V2.5.1 存档删除二次确认", "content": "首页账号角色列表新增“删除”按钮：玩家删除存档前会先看到不可恢复风险提示，并必须二次输入“删除存档”后才能确认；删除后会同步清除云端存档、角色槽位和本地缓存，释放角色名额，后台存档审计会记录删除事件。"},
    { date: "2026-07-10", title: "V2.2.1 战力突破稳定修复", content: "修复战力和战斗属性过度依赖当前修为、当前灵气、当前灵力的问题：突破成功会清空修为并消耗灵气，因此改为按境界上限、灵力上限与稳定底蕴计算战力/攻防/气血，避免玩家突破境界后战力反而下降。" },
    { date: "2026-07-10", title: "V2.2.0 自动打坐调息", content: "修行页新增“后台自动打坐调息”按钮，玩家开启后会定时自动执行打坐调息，无需反复手动点击；过程中会正常消耗体力并获得修为、灵力和灵气收益，切换到背包、农场、商圈等页面仍会继续运行，体力不足时自动暂停，适合挂机修炼和减少重复操作。" },
    { date: "2026-07-10", title: "V2.1.9 知识库补充", content: "继续补充游戏内知识库，新增悬浮福利领取、福利按钮看不到、每日/七日福利重置、商圈打不开、登仙塔卡层、排行榜名字特效、村庄回响、玩家拍卖、宗门经营、丹药使用、物品异常、反馈补偿、V2.1.3~V2.1.8版本说明和战斗Build选择等条目，方便玩家直接搜索近期反馈问题和新系统玩法。" },
    { date: "2026-07-10", title: "V2.1.8 悬浮福利活动后台", content: "游戏内新增可后台控制的悬浮福利按钮：管理员可在后台开关活动、修改按钮标题、说明和新手福利/每日福利/七日福利奖励；玩家侧点悬浮按钮即可领取铜钱、灵石、灵气、修为和物品，领取状态随存档保存，支持一次性、每日和七日周期，方便运营临时加福利或做开服活动。" },
    { date: "2026-07-10", title: "V2.1.7 商圈兼容与福利登塔平衡", content: "修复部分玩家因旧前端缓存导致商圈懒加载资源打不开的问题，线上部署改为保留历史资源以兼容旧缓存；活动中心每日活跃、七日豪礼和连续满勤奖励整体加量，补足灵石、灵气、丹药与中期材料；登仙塔怪物曲线下调并加入境界软化，避免玩家提升境界后反而被塔层数值压制，同时登塔胜利修为与灵气奖励提高。" },
    { date: "2026-07-10", title: "V2.1.6 排行榜名字特效", content: "排行榜前10名新增玩家名字特效：第1名金焰魁首、第2名银月流光、第3名赤铜战名分别使用不同光效与徽标；第4-10名统一星辉十杰渐变流光。让榜单竞争更有荣誉感和展示欲，同时保持原有排行接口与数据结构不变。" },
    { date: "2026-07-10", title: "V2.1.5 人物关系与世界反馈深化", content: "NPC页新增村庄回响/人情反馈，把全村平均好感、婚后天数、子女学识羁绊、公会贡献转化为每周可领取的世界反馈奖励。玩家完成村庄请求、主动来信、婚姻陪伴、子女长期事件和公会贡献后，桃源村会给出声望文案、家族经验、好感与铜钱回响，让人物关系和世界状态开始记住玩家行为。" },
    { date: "2026-07-10", title: "V2.1.4 巡检缺失物品修复", content: "本次全服巡检修复炼丹与家族后代长期线的物品定义缺口：补齐炼精丹、化气丹、炼气丹、化神丹、炼神丹、延寿丹、造化丹、还虚丹、炼虚丹、合道丹、龙颜丹、补灵丹、轮回丹等高阶丹药的背包物品定义，并新增纸作为族谱修订材料，避免炼制后物品显示异常或家族事件材料永远缺失。" },
    { date: "2026-07-10", title: "V2.1.3 市场宗门与人物行为深化", content: "新增玩家市场拍卖雏形、宗门经营机构、NPC主动来信、战斗流派Build与家族后代长期事件：修仙市集增加每日竞拍高阶材料，公会页新增外门执事堂/丹药供奉堂/巡山戒律堂，NPC页可回复村民来信，小屋新增子女远学/护院/族谱修订，战斗页加入剑修、雷法、玄甲、灵兽协战流派。继续把资源消耗、人物关系、战斗选择和家族传承串到已有入口。" },
    { date: "2026-07-10", title: "V2.1.2 世界剧情与赛季事件", content: "活动中心新增世界剧情与季节事件，把村庄、宗门、公会、家族、秘境、天气和节令串成长期世界线：凡界主线包含村雨妖影、宗门来信、家族灯火、登仙塔异鸣等阶段；季节事件根据春夏秋冬和雷雨天气动态出现，提供农事、人情、守夜、商路、镇妖等周期奖励。继续坚持不乱加新入口，而是在活动中心承载世界运转感。" },
    { date: "2026-07-09", title: "V2.1.1 世界系统深耕", content: "继续深耕既有玩法而非新增散入口：NPC页新增村庄人情请求，全村好感与基础产物形成循环；秘境/登仙塔新增战斗策略，爆发、守势、寻宝等路线影响战斗与掉落；公会周常加入协作工程，消耗灵骨、云纹丝、灵石换长期公会加成；技能页新增生活职业委托，让种田、钓鱼、采集、挖矿产物转化为每日技能经验；修仙市集显示七日行情风向；博物馆新增主题展览，按名望切换展陈并影响每日收入。" },
    { date: "2026-07-09", title: "V2.1.0 五段深耕合集", content: "连续补强 V2.0.6~V2.1.0：经济消耗闭环加入仙市黑市高价材料、装备/洞府维护消耗；修仙装备新增灵韧维护，低灵韧会削弱战力与渡劫稳定；修行志新增装备、洞府、灵脉、家族等卡点目标；洞府与仙界洞天加入稳定度经营和维护成本；家族传承新增护器、洞天祭扫等长期委托，配偶子女进一步接入中后期循环。" },
    { date: "2026-07-09", title: "V2.0.5 机缘实装与反馈补偿", content: "今日机缘改为按现实自然日刷新，修行机缘正式作用于打坐与炼化；修为达到当前境界上限后，后续修为收益不再白白吞掉，溢出药力/修为会转化为灵气沉淀；修仙市集新增高价修为丹、境界丹、直升丹，限制元婴期以下使用；玩家反馈后台补齐账号/角色展示和一键补偿入口，GM 邮件物品选择改为全量物品库。" },
    { date: "2026-07-09", title: "V2.0.4 丹药实装与灵根晋升修复", content: "修复炼丹与服丹体验：洗髓丹补齐物品定义，炼制后会正确进入背包；洗髓丹改为灵根必定晋升一阶，天灵根时不消耗；灵芝培元丹正式实装修为+15%与灵气+300；回灵丹在灵力已满时不再消耗并给出提示。" },
    { date: "2026-07-09", title: "V2.0.3 知识库补充与命名修正", content: "知识库继续补充常见问题条目，并将页面名称从桃源乡知识库修正为《我从种田开始修仙》知识库。新增知识库使用方法、卡突破怎么办、仙界从哪里开始、仙界资源循环、仙缘命盘、混沌裂隙失败原因、仙界主线推进条件、更新记录查看等内容，方便玩家直接搜索问题。" },
    { date: "2026-07-09", title: "V2.0.2 更新记录与教程知识库", content: "修复前端更新记录显示不全：线上数据库 updateLogs 只保留了部分记录，改为同步后端默认完整更新记录并保留最新版本置顶；新手教程升级为可搜索知识库，支持按关键词搜索、分类筛选和热门问题快捷查询，玩家可直接搜索灵气不足、雷精、飞升、仙界、洞府、宗门、更新记录等内容。" },
    { date: "2026-07-09", title: "V2.0.1 仙界长线剧情", content: "扩展仙界主线剧情长度，避免一天内快速玩空：将原 5 章主线扩展为 4 幕 12 章长线，包括云阙初诏、裂隙真相、旧天庭遗案、凡界锚点、星海秘档、三界债契、太古盟誓、天魔反策、新天试炼、诸道争衡、万仙朝议、新天门立约。后续章节需要更高仙战力、天命积分、仙盟声望、仙擂赛季积分、命盘战力、裂隙镇压次数和仙阶进度，形成中长期推进目标；剧情围绕旧天庭腐朽、混沌裂隙、凡界锚点、三界债契、天魔反策与新天门重立展开，让仙界玩法具备更长故事线和阶段追求。" },
    { date: "2026-07-09", title: "V2.0.0 仙界玩法大升级", content: "仙界玩法进入 2.0 大版本：在原有飞升、仙职、洞天、仙擂、仙市、仙阶、天命、道统基础上，新增仙盟协作、混沌裂隙、仙缘命盘三大核心系统。仙盟协作消耗功德与仙玉，联动法则碎片、凡界回响和赛季积分；混沌裂隙提供带风险的高阶挑战，按仙战力、连胜气势和命盘成长判定胜负；仙缘命盘消耗法则碎片与仙玉点亮星轨，形成长期仙战力成长与路线加成。道统、天命、PK、洞天、仙阶、凡界回响被串成完整的飞升后二阶段循环，让仙界不再是数值换皮，而是带路线、风险、协作、挑战和长期养成的大版本玩法。" },
    { date: "2026-07-09", title: "V1.8.4 仙界天命与道统传承", content: "继续完善飞升后的仙界差异化循环：新增星河剑统、紫霄雷统、司农仙统、文命道统四类道统传承，影响仙擂、天命、凡界回响与仙市收益；新增天河决堤、星官问责、凡界香火冲突、云阙邀战等仙界天命事件，每个事件提供多种抉择，产出功德、仙玉、法则碎片、凡界回响或仙擂气势，让仙界玩法从单次按钮推进为带取舍的管理循环。" },
    { date: "2026-07-09", title: "V1.8.3 突破提示与洞府槽位调整", content: "优化修仙突破反馈：突破条件不足时显示具体缺少的修为或灵气，避免修为已满但灵气不足时误以为无法突破；洞府设施已安置后可取消安置，释放槽位用于重新布置。" },
    { date: "2026-07-09", title: "V1.8.2 仙市仙阶与仙擂赛季", content: "继续扩展飞升后的仙界第二循环：新增仙市兑换，将功德、仙玉、法则碎片转化为仙露、星陨铁、仙魂和仙体仙骨成长；新增真仙→地仙→天仙→太乙金仙仙阶突破，消耗仙界资源提升称号与仙战力底蕴；新增仙擂赛季积分与三段奖励，让 PK 从单次斗法变成长期赛季目标。" },
    { date: "2026-07-09", title: "V1.8.1 飞升入口补全", content: "修复地图「修仙之途」区域缺少飞升/仙界入口的问题：未飞升时显示飞升按钮并进入飞升台，已飞升后显示仙界按钮并进入仙界；同时预加载飞升台与仙界页面，减少首次打开卡顿。" },
    { date: "2026-07-09", title: "V1.8.0 仙擂问道与洞天回响", content: "仙界第二轮扩展：新增仙擂问道 PK，可挑战青冥剑仙、紫府雷将、广寒仙姬，按仙战力、仙术、洞天和连胜结算功德/仙玉/法则；新增仙职事务、洞天建设和凡界回响，让飞升后能处理天庭事务、建设观星台/功德池/法则碑，并赐福宗门、家族和灵田。" },
    { date: "2026-07-09", title: "V1.7.9 仙界视觉与仙术特效", content: "飞升后的仙界玩法完成第一轮质变：角色页新增仙体、仙骨、仙魂与仙光立绘特效；仙界主页升级为云海星辉视觉，加入星河落刃、紫霄雷印、九曜焚天、云篆护体四类仙术特效；新增仙域试炼、功德、仙玉、法则碎片和巡天/司农/炼宝/文命仙职，让飞升后不再只是凡界换皮。" },
    { date: "2026-07-09", title: "V1.7.8 飞升与仙界初开", content: "大乘后期渡劫后触发飞升引导，新增独立飞升台与全新仙界主页；飞升消耗灵石、雷精、仙露、魂晶、灵蕴玉和铜钱，成功后进入真仙并获得初入仙门称号，可随时返回下界继续原玩法。" },
    { date: "2026-07-09", title: "V1.7.7 工具精通与庄园维护", content: "工具升级页新增工具精通，消耗铜钱、金属锭和中后期材料提升体力效率与蓄力效率；小屋新增庄园维护，消耗铜钱、木材、石头换取7天睡眠恢复加成，继续补强经济消耗闭环且不新增大入口。" },
    { date: "2026-07-08", title: "V1.7.6 高阶资源订单", content: "告示栏特殊订单扩展高阶资源回收：百工堂玄铁急单、法衣云材征集、镇塔器修复令、护山灵阵补材等订单会消耗玄铁、云纹丝、星陨铁、法宝碎片、雷精、仙露、灵骨、日炎晶等中后期材料，换取铜钱、灵石、法宝碎片和灵蕴玉，补强经济消耗闭环。" },
    { date: "2026-07-08", title: "V1.7.5 登仙塔赛季挑战", content: "登仙塔新增赛季挑战「云梯问道」：按本季最高登塔层数解锁踏云者、破灵使、镇塔客、问天行者四档徽章，并领取灵石、魂晶、法宝碎片、雷精和灵蕴玉等奖励；赛季目标直接嵌入登仙塔页面，不新增大入口。" },
    { date: "2026-07-08", title: "V1.7.4 博物馆名望与文物修复", content: "博物馆新增名望、人气收入、主题收藏和文物修复：捐赠藏品会提升名望并带来每日收入，集齐矿脉、宝石、化石、古国、仙灵主题可领取奖励，修复彩陶、玉器、化石骨架和灵物展柜，补足全收集终局追求。" },
    { date: "2026-07-08", title: "V1.7.3 瀚海商路与宗门远征", content: "瀚海新增商队路线与护送契约，门派新增宗门远征队，公会新增周常远征协作，把已有派遣/远征循环扩展到瀚海、门派和公会系统。" },
    { date: "2026-07-08", title: "V1.7.2 灵兽牧场血脉与派遣", content: "牧场动物新增血脉与天赋，宠物和高好感动物可派遣执行寻物、护院、寻宝等任务，灵兽也能参与洞府守卫和远征，让牧场、宠物与修仙线产生长期联动。" },
    { date: "2026-07-08", title: "V1.7.1 灵石炼气", content: "洞府灵石坊新增灵石炼气，可将大量灵石转化为灵气；每日固定10次，首次1000灵石约转10000灵气，后续同日成本快速递增且收益递减，定位为消耗多余灵石与突破前补缺口，避免无限膨胀。" },
    { date: "2026-07-08", title: "V1.7.0 公告重复滚动间隔", content: "后台全服公告新增重复间隔设置，发布时可填写每多少分钟重复滚动一次；填0则只展示一次，方便长期活动、维护和补偿提醒定时重复露出。" },
    { date: "2026-07-08", title: "V1.6.9 后台全服滚动公告", content: "后台新增全服滚动公告管理，可手动发布、刷新和删除公告；玩家在线时会在游戏顶部看到公告滚动通知，方便活动、维护和补偿提示。" },
    { date: "2026-07-08", title: "V1.6.8 家族传承与子女成长", content: "小屋家人系统新增家族传承、配偶助手专精、子女资质/学识/羁绊成长与每日家族委托，让结婚和子女系统形成长期追求。" },
    { date: "2026-07-08", title: "V1.6.7 中后期追求扩展", content: "宗门公共建设扩展为三大工程；农场新增灵田中后期经营目标；装备词条加入锁定、保底、套装与稀有图鉴；奇遇链升级为连续剧情、选择旗标与隐藏结局。" },
    { date: "2026-07-08", title: "V1.6.6 镇魔结算修复", content: "修复活动中心镇魔周期战报显示内部 eventId 的问题，改为展示本期周期；领取结算邮件时补充账号登录鉴权，避免已登录玩家仍提示请先登录。" },
    { date: "2026-07-08", title: "V1.6.5 镇魔周期结算", content: "全服镇魔新增周期战报与邮件结算：活动中心可查看本期贡献、参与人数和结算评级，并按个人贡献发放镇魔司邮件奖励，避免奖励只停留在本地档位。" },
    { date: "2026-07-08", title: "V1.6.4 全量留存玩法", content: "新增全服镇魔个人贡献奖励、宗门公共建设、装备词条洗练、闭关归来礼包、奇遇链与月度修行令，全部接入现有活动/门派/炼器入口与存档。" },
    { date: "2026-07-07", title: "V1.6.3 周修行令", content: "活动中心新增周修行令，每7个游戏日重置一次，把秘境战斗、烹饪、博物馆捐赠、公会贡献、瀚海商誉、育种和钓鱼串成周目标，奖励灵石、灵气、资质经验和修仙材料。" },
    { date: "2026-07-07", title: "V1.6.2 连续满勤与周目标", content: "活动中心新增连续满勤奖励：玩家每天做到100活跃并领取满勤宝箱后累计连续天数，连续3/5/7天可领取额外灵石、灵气、资质经验和修仙材料；同时将活动展示口径从世界妖潮调整为全服镇魔，避免和已取消玩法混淆。" },
    { date: "2026-07-07", title: "V1.6.1 修仙物品与获取路径", content: "新增月华玉、日炎晶、玄铁、寒髓玉、凤羽、龙鳞、太虚尘、仙露、灵骨、妖丹、玉简、灵墨、云纹丝等修仙材料，并接入秘境/凶兽掉落、洞府折灵、背包来源说明和新手教程速查。" },
    { date: "2026-07-07", title: "V1.6.0 玩法补全目标", content: "修行志新增玩法补全目标，把竹林采集、博物馆捐赠、公会猎令、瀚海贸易、育种杂交等系统接入长期成长奖励，让冷门玩法也有明确阶段目标与回报。" },
    { date: "2026-07-07", title: "V1.5.9 稀有材料获取教程", content: "新手教程新增「稀有材料获取速查」，集中说明雷精、风羽、魂晶、法宝碎片、星陨铁、灵石等材料的主要获取途径和用途，方便玩家查找雷精等关键材料。" },
    { date: "2026-07-07", title: "V1.5.8 温室地块显示修复", content: "修复温室弹窗内地块显示错位/叠层异常：温室地块现在使用独立相对定位与裁切容器，像素地块、作物图标和空地状态会正确限制在各自格子内。" },
    { date: "2026-07-07", title: "V1.5.7 设施温室显示修复", content: "修复设施页温室开启后显示信息过少的问题：已开放状态现在会显示地块数、已种数量、可收获数量，并提供「前往温室」入口；同时补强温室播种、一键收获与升级扣材料校验，避免体力不足或扣除异常时造成作物/材料损失。" },
    { date: "2026-07-07", title: "V1.5.6 灵兽喂食扣除修复", content: "修复仙鹤等灵兽喂食时可连续点击增加羁绊但不扣除材料的问题：喂食现在必须确认蕴灵稻/凝露草/朱果实际扣除成功后才增加羁绊，并兼容旧存档异常品质物品扣除。" },
    { date: "2026-07-07", title: "V1.5.5 设置页首页按钮", content: "设置弹窗底部新增「首页」按钮，点击后关闭设置并返回游戏首页/主菜单，方便玩家从游戏内快速回到角色入口。" },
    { date: "2026-07-07", title: "V1.5.4 战力排行榜修复", content: "修复排行榜战力与角色页战力不一致的问题：服务端战力公式补齐功法、宗门技能、修仙装备、符阵、本命法宝、灵兽羁绊、武器/戒指与战斗技能等加成，避免部分玩家排行战力偏低。" },
    { date: "2026-07-07", title: "V1.5.3 地图按钮响应修复", content: "修复移动端修仙地图中部分按钮偶发点击无反应的问题：所有地图入口统一加入导航锁，签到和系统邮件也改为先关闭地图再执行，避免遮罩/过渡层遮挡反馈。" },
    { date: "2026-07-07", title: "V1.5.1 客户端下载入口", content: "首页新增 iOS 与安卓客户端下载按钮，后台可分别配置下载链接；链接留空时自动隐藏对应按钮。" },
    { date: "2026-07-07", title: "V1.5.0 灵兽陪练与协战", content: "灵兽页新增每日陪练与羁绊阶段，战斗胜利触发灵兽协战收益，让灵狐、仙鹤、青鸾分别接入灵气、修为、灵力/雷精循环。" },
    { date: "2026-07-07", title: "V1.4.9 转生材料闭环", content: "轮回殿转生现在会真实消耗轮回丹，并从二转起逐步接入真灵秘录、轮回尘、灵蕴玉；轮回丹不可再在背包空服用，凶兽与红尘材料正式进入长期转生循环。" },
    { date: "2026-07-07", title: "V1.4.8 修仙地图按钮响应优化", content: "优化地图页修仙之途区域按钮：先关闭地图再跳转，加入防连点锁，并空闲预加载修仙页面资源，降低首次点击卡顿。" },
    { date: "2026-07-06", title: "V1.4.7 法宝边界说明统一", content: "统一修仙装备、本命法宝、农具法宝化三套成长说明，修正本命法宝主动威能等未实装表述，让角色页、修行页和教程口径一致。" },
    { date: "2026-07-06", title: "V1.4.6 制符闭环与星陨铁口径", content: "制符页接入符阵战力、渡劫稳定和愈符体力恢复，符宗获得额外收益；星陨铁说明改为当前订单/折灵材料，装备升星标注为后续系统。" },
    { date: "2026-07-06", title: "V1.4.5 玩法说明与死料清理", content: "修正高级玩法、法宝碎片、炼器图纸等旧说明；炼器图纸加入洞府灵石坊折灵，避免幽冥洞窟掉落成为暂无用途的死材料。" },
    { date: "2026-07-06", title: "V1.4.4 炼器与修仙装备贯通", content: "炼器页改为角色页修仙装备的淬炼入口，直接淬炼灵剑、法衣、云靴、护符；材料产出、炼器成长、角色战力与渡劫准备形成统一闭环。" },
    { date: "2026-07-06", title: "V1.4.3 修仙装备整合", content: "修仙装备栏改为更直观的灵剑、法衣、云靴、护符，和农场/矿洞装备区分；旧护道装备等级自动迁移，并为后续炼器页贯通打底。" },
    { date: "2026-07-06", title: "V1.4.2 渡劫准备与修仙装备", content: "角色页新增独立修仙装备：灵剑、法衣、云靴、护符，可消耗秘境材料与灵石淬炼，提升战力和渡劫稳定；渡劫成功公告升级为全服滚动弹窗，文字完整滚完后自动消失。" },
    { date: "2026-07-06", title: "V1.4.1 炼丹品相", content: "炼丹新增普通/上品/极品品相判定：上品附带丹香收益，极品额外成丹并获得更强收益；丹宗、丹修流派和洞府炼丹位会提高高品概率。" },
    { date: "2026-07-06", title: "V1.4.0 秘境抉择", content: "秘境探索和挑战凶兽胜利后有概率触发秘境抉择：古修遗府、灵脉泉眼、妖兽巢穴提供二选一奖励，让玩家按突破、材料、灵植或稳妥恢复目标做取舍。" },
    { date: "2026-07-06", title: "V1.3.9 宗门差异深化", content: "三宗特性接入实战循环：剑宗提升战斗攻击，丹宗提高额外成丹与灵植灵气收益，符宗提升防御/气血并强化闭关净化心魔；宗门页新增实战加成展示。" },
    { date: "2026-07-06", title: "V1.3.8 多材料订单与秘境灵种", content: "特殊订单支持多材料交付，护魂丹双材令现在需要冰魄雪莲+紫韵灵芝；任务详情显示多材料与背包进度；秘境奇遇新增灵种遗藏/灵芝孢子，可掉落高阶灵植种子。" },
    { date: "2026-07-06", title: "V1.3.7 秘境纵深与灵植炼丹闭环", content: "秘境稀有事件（8种奇遇：灵脉发现、古修遗府、心魔净化、野生灵药、稀有灵药、灵宝感应、深层灵脉、先贤启示）| 高阶灵植冰魄雪莲与紫韵灵芝 | 灵植丹方3种（雪莲清心丹、灵芝培元丹、冰魄护魂丹，按境界解锁）| 高阶宗门灵植订单" },
    { date: "2026-07-06", title: "V1.3.6 怪物像素素材风格化", content: "战斗中所有怪物和BOSS不再使用通用emoji图标，改为与怪物名字风格匹配的中国色系像素素材：灵狼灰蓝铁色+赤金眼光、灵熊深棕厚重+赤金利爪、青丘灵狐橙黄赤金+灵气外溢、冥蛛暗紫红眼、饕餮赤金巨爪+灵蕴光环、混沌暗灰紫光……每种怪物拥有独特体色、眼光、爪色和灵气光环。登仙塔怪物各有金属/暗影/烈焰/灵光风格。" },
    { date: "2026-07-06", title: "V1.3.5 修行流派与心境称号", content: "修行页新增清修、剑修、丹修、雷修四种流派与心境称号：清修稳修并压制心魔，剑修强化战力和周天运转，丹修强化炼化灵气与灵植丹药循环，雷修强化雷云观想、顿悟与渡劫稳定性；流派可随时切换，继续深化已有修行系统。" },
    { date: "2026-07-06", title: "V1.3.4 修行瓶颈与心魔", content: "修行页新增顿悟与心魔机制：闭关参悟可积累顿悟并压制心魔，顿悟会提高大境界渡劫稳定性，心魔会压低成功率；渡劫失败会积累心魔并折损顿悟，突破成功则缓解心魔，让突破准备更有修仙味。" },
    { date: "2026-07-06", title: "V1.3.3 修行纵深第一期", content: "修行页新增每日修行课业：纳气晨课稳拿灵气修为，周天运转消耗灵气灵力快速冲修为，雷云观想消耗雷精为渡劫与元神做准备；课业每日每门一次，并受灵田、境界、功法影响，让修行从重复点击变成每日取舍。" },
    { date: "2026-07-06", title: "V1.3.2 宗门差异与专属委派", content: "继续深化宗门系统：三宗新增专属委派，剑宗可剑冢试剑获得星陨铁与灵石，丹宗可丹房看炉消耗凝露草换灵植种子，符宗可符阵巡检消耗灵石换魂晶与木灵珠；宗门技能、职位、功勋更明确接入战力估算，让三宗定位更有差异。" },
    { date: "2026-07-06", title: "V1.3.1 宗门纵深第一期", content: "宗门系统从单纯选择门派和升级技能，扩展为职位、每日宗门日课、贡献、功勋和宗门宝库循环；新增外门/内门/亲传/执事/长老候补晋升，日课可获得贡献功勋，贡献可升级技能或兑换灵石、灵植种子、秘境材料。" },
    { date: "2026-07-06", title: "V1.3.0 玩法内容纵深第一期", content: "更新方向从新增入口转向深耕已有玩法：特殊订单新增宗门灵植订单，要求提交蕴灵稻、凝露草、朱果、雪莲等灵植，奖励灵石、种子与秘境材料；特殊订单提交时会实际扣除目标物品，让种田、订单、修仙、秘境材料形成更完整循环。" },
    { date: "2026-07-06", title: "V1.2.8 渡劫天雷节奏优化", content: "放慢渡劫特效节奏，天雷改为逐道落下；雷劈次数会随境界提升逐步增加，最多10道，并在动画中显示本次天雷数量。" },
    { date: "2026-07-06", title: "V1.2.7 初战妖兽引导修复", content: "修复修仙之途战斗胜利未计入修行志怪物击杀的问题；将初战凶兽任务改名为初战妖兽，并明确引导到地图 → 修仙之途 → 秘境，可通过红尘历练、秘境探索或登仙塔低层完成。" },
    { date: "2026-07-06", title: "V1.2.6 地图入口图标优化", content: "修仙地图中修仙之途入口统一为原版线性图标风格，去除表情图标；修仙市集简称为市集，限时活动简称为活动，让地图按钮更整齐清爽。" },
    { date: "2026-07-06", title: "V1.2.5 玩家独立邮箱", content: "邮件系统改为每个玩家独立存储邮件副本；全服邮件会拆分到每个玩家邮箱，定向补偿只进入目标玩家邮箱，领取状态也独立保存，避免共用邮件池造成显示混乱。" },
    { date: "2026-07-06", title: "V1.2.4 游戏内聊天", content: "新增世界频道聊天系统，登录后可在聊天面板发送和查看消息，支持实时轮询刷新。" },
    { date: "2026-07-06", title: "V1.2.3 排行差距与功法推荐", content: "排行榜增加距上一名/上榜差距提示，修仙页增加功法选择推荐，活动页增加每日签到联动提示。" },
    { date: "2026-07-06", title: "V1.2.2 战斗收益与活动中心", content: "战斗页增加区域产出说明与掉落用途标签，修仙页增加挂机收益估算，活动页升级为小型活动中心展示更多进行中目标。" },
    { date: "2026-07-06", title: "V1.2.1 引导与用途说明", content: "修行志目标增加地点提示，修仙市集商品显示用途标签，背包物品显示用途说明，角色页新增成长诊断建议。" },
    { date: "2026-07-06", title: "V1.2 全功能可玩性增强", content: "修行志扩展为全功能目标系统，新增钓鱼、挖矿、烹饪、收集、培育、功法、登塔、委托等长期与每日目标，并展示奖励内容，让每个玩法都有更明确的下一步。" },
    { date: "2026-07-06", title: "V1.1.8 时间控制按钮优化", content: "时间倍率控制移回剩余时间条旁，改为减速和加速两个按钮，避免占用金钱与灵石显示区域。" },
    { date: "2026-07-06", title: "V1.1.7 时间倍率控制", content: "顶部状态栏新增时间速度按钮，可在0.2、0.3、0.5、1、2、4、8倍之间切换，支持放慢节奏或快速推进一天。" },
    { date: "2026-07-06", title: "V1.1.6 顶部灵石显示", content: "在顶部金钱位置旁新增灵石余额显示，进入修仙市集购买功法、纳物符、乾坤袋时可直接查看当前灵石数量。" },
    { date: "2026-07-06", title: "V1.1.5 灵石购买修复", content: "修复修仙市集灵石商品购买弹窗仍显示铜钱、批量购买校验异常的问题；灵石商品现在显示灵石单价与总价，并按灵石余额购买。" },
    { date: "2026-07-06", title: "V1.1.4 修仙市集商品修复", content: "修复修仙市集入口只停留在普通商圈的问题，现在进入后会打开独立修仙市集，直接展示灵石、丹药、纳物符、乾坤袋与功法秘籍。" },
    { date: "2026-07-06", title: "V1.1.3 修仙市集入口", content: "新增地图「修仙之途 → 修仙市集」按钮，点击后直接进入商店并定位到修仙市集，方便购买功法秘籍、纳物符和乾坤袋。" },
    { date: "2026-07-06", title: "V1.1.2 限时活动入口", content: "新增独立「限时活动」页面和地图按钮，妖潮来袭可查看进度、前往秘境讨伐并直接领取活动奖励，活动说明同步写入新手教程。" },
    { date: "2026-07-06", title: "V1.1.1 教程与后台奖励完善", content: "新手教程补充天劫渡劫、功法市集和仙途七线说明；后台 GM 邮件奖励新增修为、灵气、灵力、灵石发放，玩家领取邮件后直接写入当前角色。" },
    { date: "2026-07-05", title: "V1.1 七线补全", content: "修行志新增七条长期目标：修仙主线剧情、装备套装追求、深层秘境首通、仙盟互助、限时妖潮活动、下一步变强引导和回访福利，让玩家从新手到中后期都有明确追求与奖励反馈。" },
    { date: "2026-07-05", title: "V1.0.1 功法与灵石市集扩展", content: "修仙市集新增灵石兑换的纳物符、乾坤袋，可使用后永久扩展背包；新增青木长生诀、九霄雷诀、太虚归元功三门功法，购买秘籍后可学习并消耗灵气/修为参悟升级，提升修炼收益、战力和渡劫成功率。" },
    { date: "2026-07-05", title: "V1.0 天劫渡劫与挂机修仙", content: "增强离线奖励，修仙后离线和在线挂机都会获得灵气、修为与元神经验；跨大境界突破加入天劫渡劫、成功率展示、雷劈像素角色特效与雷鸣音效；渡劫失败会扣修为灵力、伤元神并可能掉级；新增养魂丹、涅魂丹用于恢复伤势和元神。" },
    { date: "2026-07-05", title: "V0.9.2 玩家强度提升", content: "提升资质成长带来的攻击、生命、身法和减伤收益；修复修行志根骨奖励字段错配；提高修行志目标奖励，让每日目标和七日成长的变强反馈更明显。" },
    { date: "2026-07-05", title: "V0.9.1 箱子制造与体力恢复修复", content: "修复工坊箱子满足材料仍无法制造的问题，增加材料扣除失败保护；新增体力缓慢恢复：在线每60秒自然恢复1点，游戏时间推进和体力行动也会折算恢复。" },
    { date: "2026-07-05", title: "V0.9 玩家爽感与回访优化", content: "• 新增回访离线收益：离线20分钟以上再次进入游戏，可获得铜钱、体力、灵石；修仙已解锁时额外获得修为和灵气，最多累计12小时。\n• 新增全局奖励弹窗，签到、邮件、今日目标、离线收益都会用更明显的奖励反馈展示。\n• 每日签到反馈强化：连续天数和获得物品会集中展示，让玩家每天回来更有仪式感。\n• 今日目标领取反馈强化，完成目标后会弹出奖励卡，提升成长正反馈。\n• 邮件奖励领取改为弹窗展示，补偿、活动奖励更清楚。" },
    { date: "2026-07-05", title: "V0.8 留存与上瘾循环优化", content: "• 主界面新增「今日目标/下一步」卡片，直接展示修行志当前目标、进度、奖励和一键领奖/前往。\n• 新增每日随机「今日机缘」，每天给种田、战斗、登塔、移动、修行或铜钱收益不同加成。\n• 修行志奖励反馈强化，完成后更容易看到可领取状态；财运机缘会提高今日目标铜钱奖励。\n• 登仙塔新增每5层/10层阶段宝箱，最高层刷新后提示可领取，宝箱奖励灵石、魂晶、法宝碎片等。\n• 首日体验更集中：把种田、地脉、修行志、修仙战斗串成更明确的下一步目标链。" },
    { date: "2026-07-05", title: "V0.6.11 登仙塔与实时爬塔榜", content: "• 秘境页新增「登仙塔」玩法：逐层自动挑战，胜利刷新个人最高层。\n• 每层消耗灵力与体力，层数越高敌人越强、奖励越丰厚。\n• 每5层出现精英，每10层出现镇塔首领。\n• 登塔奖励包含修为、灵气、灵石、魂晶、法宝碎片、灵蕴玉等。\n• 登仙塔页面新增实时爬塔榜，按玩家最新云档最高层排行展示。" },
    { date: "2026-07-05", title: "V0.6.10 元神/丹药/境界异常修复", content: "• 修复金丹境界表重复导致金丹后期显示/突破映射异常的问题。\n• 修复高级丹药被错误当作筑基丹生效的问题，造化丹、炼神丹、还虚丹等恢复各自正确效果。\n• 元神修炼页面显示与实际消耗对齐：修炼消耗灵气，经验上限显示正确。\n• 元神等级现在真实提升灵力上限，但不会直接影响境界突破条件。" },
    { date: "2026-07-05", title: "V0.6.9 玩家反馈系统", content: "• 首页「关于游戏」下新增功能反馈、BUG反馈、意见提交入口，设置页反馈入口保留。\n• 玩家提交的反馈会进入后台管理，可按类型与状态筛选查看。\n• 后台反馈管理中文化状态：待处理、已读、已解决、已关闭。" },
    { date: "2026-07-03", title: "前后端分离重构", content: "后端Express+MySQL，前端nginx托管，数据全部存数据库" },
    { date: "2026-07-03", title: "修仙 V0.5：秘境探索/炼器/门派/法宝", content: "⚔️秘境+🔨炼器+🏛️门派+🗡️法宝+🧘境界扩展" }
  ]
}
async function getConfig() {
  const [rows] = await pool.execute('SELECT `key`, `value` FROM config')
  const cfg = { ...defaultConfig }
  for (const r of rows) { try { cfg[r.key] = JSON.parse(r.value) } catch { cfg[r.key] = r.value } }
  cfg.floatingWelfare = sanitizeFloatingWelfare(cfg.floatingWelfare, defaultConfig.floatingWelfare)
  return cfg
}
async function setConfig(key, value) {
  const v = typeof value === 'string' ? value : JSON.stringify(value)
  await pool.execute('INSERT INTO config (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?', [key, v, v])
}
async function setConfigMulti(obj) { for (const [k, v] of Object.entries(obj)) await setConfig(k, v) }

// ========== 公开 API ==========
app.get('/api/config', async (req, res) => { try { send(res, 200, await getConfig()) } catch (e) { send(res, 500, { error: '服务器错误' }) } })


app.get('/api/client/manifest', async (req, res) => {
  try {
    const manifestPath = path.join(CLIENT_BUNDLE_DIR, 'manifest.json')
    if (!fs.existsSync(manifestPath)) return send(res, 503, { error: '客户端资源包尚未生成' })
    res.setHeader('Cache-Control', 'no-store')
    res.sendFile(manifestPath)
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
})
app.get('/api/client/web.zip', async (req, res) => {
  try {
    const zipPath = path.join(CLIENT_BUNDLE_DIR, 'web.zip')
    if (!fs.existsSync(zipPath)) return send(res, 503, { error: '客户端资源包尚未生成' })
    res.setHeader('Cache-Control', 'no-store')
    res.download(zipPath, 'taoyuan-web.zip')
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
})

// --- 认证 ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const cfg = await getConfig()
    if (!cfg.registrationEnabled) return send(res, 403, { error: '注册已关闭' })
    const { username, password } = req.body
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]{3,16}$/.test(username)) return send(res, 400, { error: '用户名需3-16位中文/字母/数字/下划线' })
    if (!password || password.length < 6) return send(res, 400, { error: '密码至少6位' })
    const [exist] = await pool.execute('SELECT id FROM users WHERE username = ?', [username])
    if (exist.length) return send(res, 409, { error: '用户名已存在' })
    const id = uuidv4(), hash = bcrypt.hashSync(password, 10)
    const [count] = await pool.execute('SELECT COUNT(*) as c FROM users')
    const role = count[0].c === 0 ? 'admin' : 'user'
    await pool.execute('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)', [id, username, hash, role])
    const token = uuidv4() + uuidv4()
    await pool.execute('INSERT INTO sessions (token, user_id) VALUES (?, ?)', [token, id])
    const [u] = await pool.execute('SELECT * FROM users WHERE id = ?', [id])
    send(res, 200, { token, user: publicUser(u[0]), message: role === 'admin' ? '注册成功，已设为管理员' : '注册成功' })
  } catch (e) { console.error(e); send(res, 500, { error: '服务器错误' }) }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username])
    if (!rows.length) return send(res, 401, { error: '用户名或密码错误' })
    const user = rows[0]
    if (user.disabled) return send(res, 403, { error: '账号已被封禁' })
    const hashStr = user.password_hash || ''
    const isBcrypt = hashStr.startsWith('$2')
    const valid = isBcrypt ? bcrypt.compareSync(password, hashStr) : verifyLegacyPassword(password, hashStr)
    if (!valid) return send(res, 401, { error: '用户名或密码错误' })
    // 自动升级旧密码为bcrypt
    if (!isBcrypt && valid) {
      const newHash = bcrypt.hashSync(password, 10)
      pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id])
    }
    const token = uuidv4() + uuidv4()
    await pool.execute('INSERT INTO sessions (token, user_id) VALUES (?, ?)', [token, user.id])
    send(res, 200, { token, user: publicUser(user) })
  } catch (e) { console.error(e); send(res, 500, { error: '服务器错误' }) }
})

app.post('/api/auth/logout', async (req, res) => {
  try {
    const h = req.headers.authorization || '', t = h.startsWith('Bearer ') ? h.slice(7) : ''
    if (t) await pool.execute('DELETE FROM sessions WHERE token = ?', [t])
    send(res, 200, { ok: true })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
})

app.get('/api/me', async (req, res) => { try { send(res, 200, { user: publicUser(await auth(req)) }) } catch (e) { send(res, 500, { error: '服务器错误' }) } })


// --- 角色 ---
app.get('/api/characters', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const [rows] = await pool.execute(`SELECT c.id, c.slot, c.name, c.gender, c.created_at, c.updated_at, s.meta_json, s.updated_at AS save_updated_at
      FROM characters c LEFT JOIN saves s ON s.character_id = c.id
      WHERE c.user_id = ? ORDER BY c.slot`, [user.id])
    send(res, 200, { characters: rows.map(r => ({
      id: r.id, slot: r.slot, name: r.name, gender: r.gender,
      createdAt: r.created_at, updatedAt: r.updated_at, saveUpdatedAt: r.save_updated_at,
      meta: typeof r.meta_json === 'string' ? safeJsonParse(r.meta_json, {}) : (r.meta_json || {})
    })) })
  } catch (e) { console.error('characters err', e); send(res, 500, { error: '服务器错误' }) }
})

app.get('/api/check-char-name', async (req, res) => {
  try {
    const name = normalizePlayerName(req.query.name)
    if (!name) return send(res, 400, { error: '角色名不能为空' })
    const [rows] = await pool.execute('SELECT id FROM characters WHERE name = ? LIMIT 1', [name])
    if (rows.length) return send(res, 409, { error: '角色名已被使用' })
    send(res, 200, { ok: true, available: true })
  } catch (e) { console.error('check name err', e); send(res, 500, { error: '服务器错误' }) }
})

app.post('/api/characters', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const name = normalizePlayerName(req.body.name)
    const gender = String(req.body.gender || 'male').slice(0, 20)
    const slot = Number.isFinite(Number(req.body.slot)) ? Number(req.body.slot) : 0
    if (slot < 0 || slot > 2) { conn.release(); return send(res, 400, { error: '每个账号最多3个角色' }) }
    const [ownedCharacters] = await conn.execute('SELECT id FROM characters WHERE user_id = ?', [user.id])
    if (ownedCharacters.length >= 3) { conn.release(); return send(res, 409, { error: '每个账号最多创建3个角色' }) }
    const raw = String(req.body.raw || '')
    const data = req.body.data || (raw ? safeJsonParse(raw, null) : null)
    const meta = req.body.meta || {}
    if (!name) { conn.release(); return send(res, 400, { error: '角色名不能为空' }) }
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9_]{1,20}$/.test(name)) { conn.release(); return send(res, 400, { error: '角色名只能用中文/字母/数字/下划线' }) }
    const id = uuidv4()
    const metaJson = safeStringify({ ...meta, playerName: name, gender })
    const dataJson = data ? JSON.stringify(data) : null
    const summary = saveSummary(raw || dataJson || '', data, { ...meta, playerName: name, gender })
    const initialReasons = validateInitialCharacterSave(summary)
    if (initialReasons.length) {
      await recordSaveAuditEvent(user, req, { eventType: 'character_create_guard', status: 'rejected', slot, characterId: id, playerName: name, rawSize: summary.rawSize, dataSize: summary.dataSize, dataHash: summary.dataHash, detail: { ...summary, reasons: initialReasons } })
      return send(res, 400, { error: '检测到异常初始存档，已拒绝创建。请刷新页面后重新创建角色。', saveGuard: true, reasons: initialReasons })
    }
    await conn.beginTransaction()
    await conn.execute('INSERT INTO characters (id, user_id, slot, name, gender) VALUES (?, ?, ?, ?, ?)', [id, user.id, slot, name, gender])
    await conn.execute('INSERT INTO saves (user_id, character_id, slot, player_name, raw, data_json, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE character_id=VALUES(character_id), player_name=VALUES(player_name), raw=VALUES(raw), data_json=VALUES(data_json), meta_json=VALUES(meta_json)', [user.id, id, slot, name, raw || dataJson || '', dataJson || raw || '', metaJson])
    await conn.commit()
    await recordSaveAuditEvent(user, req, { eventType: 'character_create_save', status: 'ok', slot, characterId: id, playerName: name, rawSize: summary.rawSize, dataSize: summary.dataSize, dataHash: summary.dataHash, detail: summary })
    send(res, 200, { ok: true, character: { id, slot, name, gender } })
  } catch (e) {
    try { await conn.rollback() } catch {}
    if (e && (e.code === 'ER_DUP_ENTRY' || e.errno === 1062)) return send(res, 409, { error: '角色名已被使用' })
    console.error('create character err', e); send(res, 500, { error: '服务器错误' })
  } finally { conn.release() }
})

// --- 存档 ---
app.get('/api/saves', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const [rows] = await pool.execute(`SELECT s.slot, s.meta_json, s.updated_at, s.player_name, c.id AS character_id, c.name AS character_name, c.gender
      FROM saves s LEFT JOIN characters c ON c.id = s.character_id
      WHERE s.user_id = ? ORDER BY s.slot`, [user.id])
    const saves = []
    for (const r of rows) saves.push({
      slot: r.slot,
      meta: typeof r.meta_json === 'string' ? safeJsonParse(r.meta_json, {}) : (r.meta_json || {}),
      updatedAt: r.updated_at,
      characterId: r.character_id,
      playerName: r.character_name || r.player_name,
      gender: r.gender
    })
    send(res, 200, { saves })
  } catch (e) { console.error('list saves err', e); send(res, 500, { error: '服务器错误' }) }
})

app.get('/api/saves/:slot', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const [rows] = await pool.execute('SELECT * FROM saves WHERE user_id = ? AND slot = ?', [user.id, Number(req.params.slot)])
    if (!rows.length) return send(res, 404, { error: '存档不存在' })
    const r = rows[0]
    const rawResp = r.raw || ''
    await recordSaveAuditEvent(user, req, { eventType: 'save_load', status: 'ok', slot: r.slot, characterId: r.character_id, playerName: r.player_name, rawSize: rawResp.length, dataSize: String(r.data_json || '').length, dataHash: (r.data_json || rawResp) ? crypto.createHash('sha256').update(String(r.data_json || rawResp)).digest('hex') : null, serverUpdatedAt: r.updated_at, detail: { updatedAt: r.updated_at } })
    send(res, 200, { slot: r.slot, raw: rawResp, meta: r.meta_json, updatedAt: r.updated_at })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
})

app.put('/api/saves/:slot', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const slot = Number(req.params.slot), { raw, meta, data, characterId } = req.body
    const playerName = normalizePlayerName((meta && meta.playerName) || '')
    let saveCharacterId = characterId || null
    if (!saveCharacterId) {
      const [chars] = await pool.execute('SELECT id FROM characters WHERE user_id = ? AND slot = ? LIMIT 1', [user.id, slot])
      if (chars.length) saveCharacterId = chars[0].id
    }
    const metaJson = meta ? JSON.stringify(meta) : null
    const clientLoadedAt = meta && meta.lastLoadedAt ? new Date(meta.lastLoadedAt) : null
    // data 为明文 JSON（新前端直接传），优先存入 data_json；raw 保留兼容旧版加密 blob
    const plainData = data || (raw ? safeJsonParse(raw, null) : null)
    const dataJson = plainData ? JSON.stringify(plainData) : null
    const summary = saveSummary(raw || dataJson || '', plainData, meta || {})
    let currentSaveRow = null
    const [currentRows] = await pool.execute('SELECT updated_at, character_id, player_name, raw, data_json FROM saves WHERE user_id = ? AND slot = ? LIMIT 1', [user.id, slot])
    if (currentRows.length) {
      currentSaveRow = currentRows[0]
      if (clientLoadedAt && Number.isFinite(clientLoadedAt.getTime())) {
        const serverUpdatedAt = new Date(currentSaveRow.updated_at)
        // 同账号多端同时在线时，拒绝旧页面覆盖服务器上更新的存档。
        if (serverUpdatedAt.getTime() - clientLoadedAt.getTime() > 1500) {
          await recordSaveAuditEvent(user, req, { eventType: 'save_conflict', status: 'conflict', slot, characterId: currentSaveRow.character_id || saveCharacterId, playerName: currentSaveRow.player_name || playerName || summary.playerName, rawSize: summary.rawSize, dataSize: summary.dataSize, dataHash: summary.dataHash, clientLoadedAt: meta.lastLoadedAt, serverUpdatedAt: currentSaveRow.updated_at, detail: { ...summary, reason: 'stale_client_overwrite_rejected' } })
          return send(res, 409, { error: '云端存档已由其他设备更新，请刷新或重新进入后再继续。', conflict: true, serverUpdatedAt: currentSaveRow.updated_at })
        }
      }
    }
    const guardResult = await validateSaveProgression(user, req, { slot, summary, currentSaveRow, plainData, meta, saveCharacterId, playerName })
    if (guardResult) return send(res, 400, guardResult)
    await pool.execute(
      'INSERT INTO saves (user_id, character_id, slot, player_name, raw, data_json, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE character_id=COALESCE(VALUES(character_id), character_id), player_name=COALESCE(VALUES(player_name), player_name), raw=VALUES(raw), data_json=VALUES(data_json), meta_json=VALUES(meta_json)',
      [user.id, saveCharacterId, slot, playerName || null, raw || dataJson || '', dataJson || raw || '', metaJson]
    )
    // 排行榜：直接从明文 JSON 解析
    try {
      if (plainData) {
        const p = plainData.player || plainData.playerStore || (plainData.stores && plainData.stores.player) || {}
        const cu = plainData.cultivation || plainData.cultivationStore || (plainData.stores && plainData.stores.cultivation) || {}
        const g = plainData.game || plainData.gameStore || (plainData.stores && plainData.stores.game) || {}
        const playerName = (meta && meta.playerName) || p.playerName || p.name || '无名'
        const asc = plainData && (plainData.ascension || plainData.ascensionStore || (plainData.stores && plainData.stores.ascension)) || {}
        const realmNameDisplay = realmNameFromSave(cu, asc)
        await pool.execute(
          'INSERT INTO leaderboard (user_id, username, player_name, realm_name, cultivation, aura, money, game_year, game_season, game_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE player_name=VALUES(player_name), realm_name=VALUES(realm_name), cultivation=VALUES(cultivation), aura=VALUES(aura), money=VALUES(money), game_year=VALUES(game_year), game_season=VALUES(game_season), game_day=VALUES(game_day)',
          [user.id, user.username, playerName, realmNameDisplay, cu.cultivation || 0, cu.aura || 0, p.money || (meta && meta.money) || 0, g.year || (meta && meta.year) || 1, g.season || (meta && meta.season) || '春', g.day || (meta && meta.day) || 1]
        )
      }
    } catch (e2) { console.error('lb err', e2.message) }
    const [savedRows] = await pool.execute('SELECT updated_at, character_id, player_name FROM saves WHERE user_id = ? AND slot = ? LIMIT 1', [user.id, slot])
    await recordSaveAuditEvent(user, req, { eventType: 'save_write', status: 'ok', slot, characterId: savedRows[0]?.character_id || saveCharacterId, playerName: savedRows[0]?.player_name || playerName || summary.playerName, rawSize: summary.rawSize, dataSize: summary.dataSize, dataHash: summary.dataHash, clientLoadedAt: meta?.lastLoadedAt || null, serverUpdatedAt: savedRows[0]?.updated_at || null, detail: summary })
    send(res, 200, { ok: true, updatedAt: savedRows[0]?.updated_at || null })
  } catch (e) { console.error('save err', e); send(res, 500, { error: '服务器错误' }) }
})

app.delete('/api/saves/:slot', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const slot = Number(req.params.slot)
    if (!Number.isInteger(slot) || slot < 0 || slot > 2) return send(res, 400, { error: '槽位无效' })
    const [before] = await conn.execute(`SELECT s.character_id, COALESCE(c.name, s.player_name) AS player_name, s.updated_at, LENGTH(s.raw) AS raw_size, LENGTH(s.data_json) AS data_size
      FROM saves s LEFT JOIN characters c ON c.id = s.character_id
      WHERE s.user_id = ? AND s.slot = ? LIMIT 1`, [user.id, slot])
    const [chars] = await conn.execute('SELECT id, name FROM characters WHERE user_id = ? AND slot = ? LIMIT 1', [user.id, slot])
    await conn.beginTransaction()
    await conn.execute('DELETE FROM saves WHERE user_id = ? AND slot = ?', [user.id, slot])
    await conn.execute('DELETE FROM characters WHERE user_id = ? AND slot = ?', [user.id, slot])
    await conn.commit()
    const deletedCharacter = chars[0] || null
    const auditSource = before[0] || deletedCharacter || {}
    await recordSaveAuditEvent(user, req, { eventType: 'save_delete', status: 'ok', slot, characterId: auditSource.character_id || deletedCharacter?.id || null, playerName: auditSource.player_name || deletedCharacter?.name || null, rawSize: auditSource.raw_size || 0, dataSize: auditSource.data_size || 0, serverUpdatedAt: auditSource.updated_at || null, detail: { deleted: true, characterDeleted: Boolean(deletedCharacter) } })
    send(res, 200, { ok: true })
  } catch (e) {
    try { await conn.rollback() } catch {}
    console.error('delete save err', e)
    send(res, 500, { error: '服务器错误' })
  } finally { conn.release() }
})

// --- 签到 ---
function localDateKey(offsetHours = 8, date = new Date()) {
  return new Date(date.getTime() + offsetHours * 3600000).toISOString().slice(0, 10)
}
function addDaysKey(key, days) {
  const d = new Date(`${key}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
async function getCheckinStreak(userId, today) {
  const [rows] = await pool.execute('SELECT check_date FROM checkins WHERE user_id = ? ORDER BY check_date DESC LIMIT 60', [userId])
  const set = new Set(rows.map(r => localDateKey(0, new Date(r.check_date))))
  let cursor = today
  let streak = 0
  while (set.has(cursor)) {
    streak++
    cursor = addDaysKey(cursor, -1)
  }
  return streak
}
function checkinItemsForStreak(streak) {
  const day = ((Math.max(1, streak) - 1) % 7) + 1
  const items = []
  if (day === 1) items.push({ itemId: 'seed_cabbage', quantity: 5 })
  if (day === 2) items.push({ itemId: 'basic_fertilizer', quantity: 3 })
  if (day === 3) items.push({ itemId: 'seed_potato', quantity: 4 })
  if (day === 4) items.push({ itemId: 'quality_fertilizer', quantity: 2 })
  if (day === 5) items.push({ itemId: 'seed_strawberry', quantity: 3 })
  if (day === 6) items.push({ itemId: 'ancient_seed', quantity: 1 })
  if (day === 7) items.push({ itemId: 'quality_fertilizer', quantity: 5 }, { itemId: 'seed_watermelon', quantity: 3 })
  return items
}
function checkinRewardForStreak(streak) {
  const day = ((Math.max(1, streak) - 1) % 7) + 1
  return 300 + day * 100 + Math.floor((Math.max(1, streak) - 1) / 7) * 50
}

app.get('/api/checkin', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const today = localDateKey(8)
    const [rows] = await pool.execute('SELECT id FROM checkins WHERE user_id = ? AND check_date = ?', [user.id, today])
    const [total] = await pool.execute('SELECT COUNT(*) as c FROM checkins WHERE user_id = ?', [user.id])
    const currentStreak = await getCheckinStreak(user.id, today)
    const nextStreak = rows.length ? currentStreak : currentStreak + 1
    send(res, 200, { checked: rows.length > 0, today, timezone: 'Asia/Shanghai', total: total[0].c, streak: currentStreak, nextStreak, reward: checkinRewardForStreak(nextStreak), items: checkinItemsForStreak(nextStreak) })
  } catch (e) { console.error('checkin status err', e); send(res, 500, { error: '服务器错误' }) }
})

app.post('/api/checkin', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const today = localDateKey(8)
    const [exist] = await pool.execute('SELECT id FROM checkins WHERE user_id = ? AND check_date = ?', [user.id, today])
    if (exist.length) return send(res, 409, { error: '今天已经签到过了' })
    const yesterday = addDaysKey(today, -1)
    const yesterdayStreak = await getCheckinStreak(user.id, yesterday)
    const streak = yesterdayStreak + 1
    const reward = checkinRewardForStreak(streak)
    const items = checkinItemsForStreak(streak)
    await pool.execute('INSERT INTO checkins (user_id, check_date, reward) VALUES (?, ?, ?)', [user.id, today, reward])
    await recordEconomyEvent(user, req, { eventType: 'checkin', amount: reward, source: 'daily_checkin', detail: { today, timezone: 'Asia/Shanghai', items, streak } })
    send(res, 200, { ok: true, today, timezone: 'Asia/Shanghai', reward, items, streak })
  } catch (e) { console.error('checkin post err', e); send(res, 500, { error: '服务器错误' }) }
})

// --- 邮件 ---
app.get('/api/mails', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const [mails] = await pool.execute('SELECT * FROM user_mails WHERE user_id = ? ORDER BY created_at DESC', [user.id])
    send(res, 200, { mails: mails.map(m => ({
      id: m.id,
      title: m.title,
      content: m.content,
      rewards: sanitizeRewardPayload(safeJsonParse(m.rewards, {})),
      from: m.from_name,
      createdAt: m.created_at,
      claimed: !!m.claimed
    })) })
  } catch (e) { console.error('list user mails err', e); send(res, 500, { error: '服务器错误' }) }
})

app.post('/api/mails/:id/claim', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    await conn.beginTransaction()
    const [mailRows] = await conn.execute('SELECT * FROM user_mails WHERE id = ? AND user_id = ? FOR UPDATE', [req.params.id, user.id])
    if (!mailRows.length) { await conn.rollback(); return send(res, 404, { error: '邮件不存在' }) }
    const mail = mailRows[0]
    if (mail.claimed) { await conn.rollback(); return send(res, 409, { error: '已领取' }) }
    await conn.execute('UPDATE user_mails SET claimed = 1, claimed_at = NOW() WHERE id = ? AND user_id = ?', [req.params.id, user.id])
    const rawRewards = safeJsonParse(mail.rewards, {})
    const rewards = sanitizeRewardPayload(rawRewards)
    await conn.commit()
    await recordEconomyEvent(user, req, { eventType: 'mail_claim', amount: Number(rewards.money || 0), source: 'mail', detail: { mailId: mail.id, legacyMailId: mail.legacy_mail_id, title: mail.title, rewards, clamped: rewardClampInfo(rawRewards, rewards) } })
    send(res, 200, { ok: true, rewards })
  } catch (e) {
    try { await conn.rollback() } catch {}
    console.error('claim user mail err', e)
    send(res, 500, { error: '服务器错误' })
  } finally { conn.release() }
})

app.post('/api/economy-events', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const { eventType, amount, itemId, quantity, quality, source, detail, slot, characterId, playerName } = req.body || {}
    const allowedClientEvents = new Set(['client_note','shop_buy','shop_sell','quest_reward','activity_reward','item_use','craft','farm_harvest','combat_reward'])
    const cleanType = String(eventType || '').slice(0, 40)
    if (!cleanType || !allowedClientEvents.has(cleanType)) return send(res, 400, { error: '事件类型无效' })
    const recentLimit = await pool.execute('SELECT COUNT(*) AS c FROM economy_events WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)', [user.id])
    if (Number(recentLimit[0][0]?.c || 0) >= 20) return send(res, 429, { error: '记录过于频繁' })
    await recordEconomyEvent(user, req, { eventType: cleanType, amount, itemId, quantity, quality, source: `client:${String(source || cleanType).slice(0, 60)}`, detail, slot, characterId, playerName })
    send(res, 200, { ok: true })
  } catch (e) { console.error('economy event post err', e); send(res, 500, { error: '服务器错误' }) }
})

// === check char name ===
app.get("/api/check-char-name", async (req, res) => {
  try {
    const name = (req.query.name || "").trim()
    if (!name) return send(res, 400, { error: "Name required" })
    const [rows] = await pool.execute("SELECT meta_json FROM saves WHERE meta_json LIKE ? LIMIT 50", ["%" + name + "%"])
    for (const r of rows) {
      try {
        const meta = JSON.parse(r.meta_json)
        if (meta && meta.playerName === name) return send(res, 409, { error: "Name already taken" })
      } catch {}
    }
    send(res, 200, { available: true })
  } catch (e) { console.error("check-char-name err", e); send(res, 500, { error: "Server error" }) }
})


function calcCombatPowerFromSave(p = {}, cu = {}, inv = {}, sk = {}, asc = {}) {
  const num = v => Number(v || 0) || 0
  const artifacts = cu.artifacts || {}
  let artifactPower = 0
  for (const v of Object.values(artifacts)) {
    if (v && typeof v === 'object') artifactPower += Math.floor(num(v.atk) * 12 + num(v.def) * 10 + num(v.aura) * 4 + num(v.cultivation) * 6)
  }
  const oldArtifactPower = ['glimmerHoe', 'spiritKettle', 'spiritRain'].filter(k => artifacts[k] === true).length * 80
  const realmIndex = Math.max(0, Math.min(REALM_STATS.length - 1, num(cu.realmIndex ?? cu.realm)))
  const rebirthCount = num(cu.rebirthCount)
  const realmStat = REALM_STATS[realmIndex] || REALM_STATS[0]
  const realmMaxCultivation = num(realmStat?.maxCultivation || 100)
  const realmMaxMana = num(realmStat?.maxMana || 30)
  const aura = num(cu.aura)
  const attrs = p.attributes || {}
  const attrLevel = k => num(attrs?.[k]?.level || 1)
  const attrPower = num(p.attributePower) || ['physique', 'strength', 'agility', 'perception'].reduce((sum, k) => sum + attrLevel(k), 0)
  const attributeMaxHpBonus = (attrLevel('physique') - 1) * 10
  const combatSkill = Array.isArray(sk.skills) ? (sk.skills.find(x => x?.type === 'combat') || {}) : {}
  const combatLevel = num(combatSkill.level)
  const hp = num(p.baseMaxHp || 100) + combatLevel * 5 + attributeMaxHpBonus + (combatSkill.perk5 === 'fighter' ? 25 : 0) + (combatSkill.perk10 === 'warrior' ? 40 : 0)

  // 排行榜服务端镜像前端 useCultivationStore.combatPower。不能依赖前端 computed 字段，需从存档原始字段重算。
  const weaponDefs = { wooden_stick: 5, copper_sword: 12, iron_blade: 18, war_hammer: 24, steel_sword: 28, silver_spear: 36, demon_slayer: 48, dragon_blade: 60 }
  const enchantBonus = { sharp: 4, fierce: 8, spirit: 12, legendary: 18 }
  const equippedWeapon = Array.isArray(inv.ownedWeapons) ? inv.ownedWeapons[num(inv.equippedWeaponIndex)] : null
  const weaponPower = Math.max(0, (weaponDefs[equippedWeapon?.defId] ?? (equippedWeapon ? 5 : 5)) + (enchantBonus[equippedWeapon?.enchantmentId] || 0)) * 16

  const ringEffectMap = {
    quartz_ring: { attack_bonus: 3 }, jade_guard_ring: { defense_bonus: 0.08 }, blood_jade_ring: { max_hp_bonus: 30 }, tiger_eye_ring: { attack_bonus: 5 }, obsidian_guard_ring: { defense_bonus: 0.12 }, dragon_scale_ring: { defense_bonus: 0.18, max_hp_bonus: 50 }, phoenix_blood_ring: { attack_bonus: 8, max_hp_bonus: 40 }, immortal_jade_ring: { attack_bonus: 12, defense_bonus: 0.20, max_hp_bonus: 80 }
  }
  const ringEffect = type => {
    let total = 0
    for (const idx of [inv.equippedRingSlot1, inv.equippedRingSlot2]) {
      const ring = Array.isArray(inv.ownedRings) ? inv.ownedRings[num(idx)] : null
      if (ring?.defId && ringEffectMap[ring.defId]?.[type]) total += ringEffectMap[ring.defId][type]
      if (ring?.id && ringEffectMap[ring.id]?.[type]) total += ringEffectMap[ring.id][type]
    }
    return total
  }
  const ringPower = Math.floor(ringEffect('attack_bonus') * 120 + ringEffect('defense_bonus') * 100 + ringEffect('max_hp_bonus') * 3)

  const manuals = cu.manuals || {}
  const manualPower = num(manuals.wood) * 180 + num(manuals.thunder) * 320 + num(manuals.void) * 420
  const daoGearLevels = cu.daoGear || {}
  const daoGearPower = num(daoGearLevels.immortal_sword) * 520 + num(daoGearLevels.dharma_robe) * 420 + num(daoGearLevels.cloud_boots) * 360 + num(daoGearLevels.tribulation_amulet) * 300
  const talismanCounts = cu.talismans || {}
  const talismanPower = num(talismanCounts.fire_talisman) * 180 + num(talismanCounts.thunder_talisman) * 260
  const sectSkills = Array.isArray(cu.sectSkills) ? cu.sectSkills : []
  const sectSkillPower = sectSkills.reduce((sum, lv, idx) => sum + num(lv) * (220 + idx * 120), 0)
  const sectRank = num(cu.sectRank)
  const sectIdentityPower = cu.sect === 'sword' ? sectSkillPower * 0.35 : cu.sect === 'talisman' ? sectSkillPower * 0.18 + sectRank * 260 : cu.sect === 'alchemy' ? sectRank * 180 : 0
  const path = cu.cultivationPath || 'balanced'
  const pathPower = path === 'sword'
    ? num(manuals.thunder) * 180 + realmIndex * 55
    : path === 'thunder'
      ? num(cu.insight) * 10 + num(manuals.thunder) * 150
      : path === 'alchemy'
        ? num(cu.fieldTier) * 160 + num(manuals.wood) * 120
        : Math.max(0, 100 - num(cu.heartDemon)) * 4

  // V2.5.2：排行榜必须按境界稳定底蕴算，不能再吃当前修为/当前灵气/当前灵力。
  // 当前资源会在突破、消耗后大幅波动，曾导致低境界高临时资源玩家压过高境界玩家。
  const majorStageBonus = Math.floor(Math.pow(Math.floor(realmIndex / 3), 2) * 1200)
  const realmPower = realmIndex * 3500 + majorStageBonus + rebirthCount * 50000
  const realmFoundationPower = Math.floor(realmMaxCultivation * 1.05 + realmMaxMana * 24)
  const auraFoundationPower = Math.floor(Math.log10(Math.max(1, aura) + 1) * 180)
  const cultivationPower = realmFoundationPower + auraFoundationPower
  const bodyPower = Math.floor(attrPower * 6 + hp * 1.5 + combatLevel * 180)
  const immortalRealmPower = asc?.ascended ? (IMMORTAL_REALMS[Math.max(0, Math.min(IMMORTAL_REALMS.length - 1, Number(asc.immortalRealmStage || 0)))]?.powerBonus || 0) : 0
  const systemPower = immortalRealmPower + num(cu.fieldTier) * 120 + num(cu.caveTier) * 180 + num(cu.yuanShenLevel) * 260 + num(cu.destinedArtifactLevel) * 360 + daoGearPower + talismanPower + num(cu.beastBond) * 12 + num(cu.sectContribution) * 0.2 + num(cu.sectMerit) * 0.6 + sectSkillPower + sectIdentityPower + pathPower + manualPower
  return Math.max(0, Math.floor(realmPower + cultivationPower + bodyPower + weaponPower + ringPower + artifactPower + oldArtifactPower + systemPower))
}

// --- 玩家反馈 ---
app.post('/api/feedbacks', async (req, res) => {
  try {
    const user = await auth(req)
    const { category, title, content } = req.body || {}
    if (!category || !title || !content) return send(res, 400, { error: '分类/标题/内容不能为空' })
    if (!['feature', 'bug', 'suggestion'].includes(category)) return send(res, 400, { error: '分类无效' })
    await pool.execute(
      'INSERT INTO feedbacks (user_id, username, player_name, category, title, content, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user?.id || null, user?.username || null, (req.body?.playerName || '').slice(0, 20), category, title.slice(0, 100), content.slice(0, 2000), req.ip || null, (req.headers['user-agent'] || '').slice(0, 255)]
    )
    send(res, 200, { ok: true })
  } catch (e) { console.error('feedback post err', e); send(res, 500, { error: '服务器错误' }) }
})

// --- 管理员查看反馈 ---
app.get('/api/admin/feedbacks', async (req, res) => {
  try {
    const u = await requireAdmin(req, res); if (!u) return
    const status = req.query.status || ''
    const category = req.query.category || ''
    const limit = Math.min(Number(req.query.limit) || 200, 500)
    let where = []
    let params = []
    if (status) { where.push('f.status = ?'); params.push(status) }
    if (category) { where.push('f.category = ?'); params.push(category) }
    const [rows] = await pool.execute(
      `SELECT f.* FROM feedbacks f ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY f.id DESC LIMIT ${limit}`,
      params
    )
    send(res, 200, { feedbacks: rows })
  } catch (e) { console.error('admin feedbacks err', e); send(res, 500, { error: '服务器错误' }) }
})

app.put('/api/admin/feedbacks/:id', async (req, res) => {
  try {
    const u = await requireAdmin(req, res); if (!u) return
    const { status } = req.body || {}
    if (!status || !['pending', 'read', 'resolved', 'closed'].includes(status)) return send(res, 400, { error: '状态无效' })
    await pool.execute('UPDATE feedbacks SET status = ? WHERE id = ?', [status, req.params.id])
    send(res, 200, { ok: true })
  } catch (e) { console.error('admin feedback put err', e); send(res, 500, { error: '服务器错误' }) }
})

// --- 排行榜（优先从 saves.data_json 实时读取；坏数据用 meta/player_name/cache 兜底） ---
app.get('/api/leaderboard', async (req, res) => {
  try {
    const by = req.query.by || 'cultivation'
    const [rows] = await pool.execute(
      `SELECT s.user_id, u.username, s.slot, s.player_name, s.data_json, s.meta_json, s.updated_at,
              lb.realm_name AS cached_realm_name, lb.cultivation AS cached_cultivation, lb.aura AS cached_aura,
              lb.money AS cached_money, lb.game_year AS cached_year, lb.game_season AS cached_season, lb.game_day AS cached_day
       FROM saves s
       INNER JOIN (SELECT user_id, MAX(updated_at) as max_ts FROM saves GROUP BY user_id) latest
         ON s.user_id = latest.user_id AND s.updated_at = latest.max_ts
       JOIN users u ON u.id = s.user_id
       LEFT JOIN leaderboard lb ON lb.user_id = s.user_id
       ORDER BY s.updated_at DESC`
    )
    const entries = []
    for (const r of rows) {
      let d = null
      if (r.data_json && r.data_json !== 'null' && r.data_json !== '') {
        try { d = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json } catch {}
      }
      const meta = safeJsonParse(r.meta_json, {}) || {}
      const p = (d && (d.player || d.playerStore || (d.stores && d.stores.player))) || {}
      const cu = (d && (d.cultivation || d.cultivationStore || (d.stores && d.stores.cultivation))) || {}
      const g = (d && (d.game || d.gameStore || (d.stores && d.stores.game))) || {}
      const asc = (d && (d.ascension || d.ascensionStore || (d.stores && d.stores.ascension))) || {}
      const realmIdx = realmSortIndexFromSave(cu, asc)
      entries.push({
        userId: r.user_id,
        username: r.username,
        playerName: p.playerName || p.name || meta.playerName || r.player_name || '无名',
        realmName: realmNameFromSave(cu, asc) || r.cached_realm_name || '凡人',
        realmIndex: realmIdx,
        rebirthCount: Number(cu.rebirthCount || 0) || 0,
        cultivation: Number(cu.cultivation ?? r.cached_cultivation ?? 0) || 0,
        combatPower: calcCombatPowerFromSave(p, cu, (d && (d.inventory || d.inventoryStore || (d.stores && d.stores.inventory))) || {}, (d && (d.skill || d.skillStore || (d.stores && d.stores.skill))) || {}, asc),
        aura: Number(cu.aura ?? r.cached_aura ?? 0) || 0,
        money: Number(p.money ?? meta.money ?? r.cached_money ?? 0) || 0,
        year: Number(g.year ?? meta.year ?? r.cached_year ?? 1) || 1,
        season: g.season || meta.season || r.cached_season || '春',
        day: Number(g.day ?? meta.day ?? r.cached_day ?? 1) || 1,
        updatedAt: r.updated_at,
        dataOk: !!d
      })
    }
    entries.sort((a, b) => {
      if (by === 'money') return (b.money || 0) - (a.money || 0)
      if (by === 'aura') return (b.aura || 0) - (a.aura || 0)
      if (by === 'power') return (b.combatPower || 0) - (a.combatPower || 0)
      if (by === 'rebirth') return (b.rebirthCount || 0) - (a.rebirthCount || 0)
      return ((b.rebirthCount || 0) - (a.rebirthCount || 0)) || ((b.realmIndex || 0) - (a.realmIndex || 0)) || ((b.cultivation || 0) - (a.cultivation || 0))
    })
    for (const e of entries.slice(0, 50)) {
      try {
        await pool.execute(
          'INSERT INTO leaderboard (user_id, username, player_name, realm_name, cultivation, aura, money, game_year, game_season, game_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE player_name=VALUES(player_name), realm_name=VALUES(realm_name), cultivation=VALUES(cultivation), aura=VALUES(aura), money=VALUES(money), game_year=VALUES(game_year), game_season=VALUES(game_season), game_day=VALUES(game_day)',
          [e.userId, e.username, e.playerName, e.realmName, e.cultivation, e.aura, e.money, e.year, e.season, e.day]
        )
      } catch {}
    }
    send(res, 200, { leaderboard: entries.slice(0, 50) })
  } catch (e) { console.error('lb err', e); send(res, 500, { error: '服务器错误' }) }
})

// --- 登仙塔排行榜（从最新云档实时读取） ---
app.get('/api/tower-leaderboard', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit || 10), 50))
    const [rows] = await pool.execute(
      `SELECT s.user_id, u.username, s.slot, s.player_name, s.data_json, s.meta_json, s.updated_at
       FROM saves s
       INNER JOIN (SELECT user_id, MAX(updated_at) as max_ts FROM saves GROUP BY user_id) latest
         ON s.user_id = latest.user_id AND s.updated_at = latest.max_ts
       JOIN users u ON u.id = s.user_id
       ORDER BY s.updated_at DESC`
    )
    const entries = []
    for (const r of rows) {
      let d = null
      if (r.data_json && r.data_json !== 'null' && r.data_json !== '') {
        try { d = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json } catch {}
      }
      const meta = safeJsonParse(r.meta_json, {}) || {}
      const p = (d && (d.player || d.playerStore || (d.stores && d.stores.player))) || {}
      const combat = (d && (d.combat || d.combatStore || (d.stores && d.stores.combat))) || {}
      const cu = (d && (d.cultivation || d.cultivationStore || (d.stores && d.stores.cultivation))) || {}
      const floor = Number(combat.towerHighestFloor || 0) || 0
      if (floor <= 0) continue
      const asc = (d && (d.ascension || d.ascensionStore || (d.stores && d.stores.ascension))) || {}
      const realmIdx = realmSortIndexFromSave(cu, asc)
      entries.push({
        userId: r.user_id,
        username: r.username,
        playerName: p.playerName || p.name || meta.playerName || r.player_name || '无名',
        floor,
        realmName: realmNameFromSave(cu, asc) || '凡人',
        rebirthCount: Number(cu.rebirthCount || 0) || 0,
        updatedAt: r.updated_at
      })
    }
    entries.sort((a, b) => (b.floor - a.floor) || (b.rebirthCount - a.rebirthCount) || String(b.updatedAt).localeCompare(String(a.updatedAt)))
    send(res, 200, { leaderboard: entries.slice(0, limit) })
  } catch (e) { console.error('tower leaderboard err', e); send(res, 500, { error: '服务器错误' }) }
})


function getWorldBossCycleKey(date = new Date()) {
  const start = new Date(Date.UTC(2026, 0, 1))
  const now = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const days = Math.max(0, Math.floor((now - start) / 86400000))
  return `wb-${date.getUTCFullYear()}-${Math.floor(days / 7) + 1}`
}
function worldBossCycleReward(score, globalProgress = 0) {
  const personal = Math.max(0, Number(score || 0) || 0)
  const globalBonus = globalProgress >= 300 ? 1.25 : globalProgress >= 180 ? 1.1 : 1
  const tier = personal >= 120 ? '镇魔功臣' : personal >= 60 ? '伏魔主力' : personal >= 20 ? '镇魔先锋' : '参与奖'
  const base = personal >= 120
    ? { money: 6800, spiritStone: 36, aura: 1200, items: [{ itemId: 'soul_crystal', quantity: 2 }, { itemId: 'thunder_essence', quantity: 1 }] }
    : personal >= 60
      ? { money: 3600, spiritStone: 20, aura: 640, items: [{ itemId: 'demon_core', quantity: 1 }] }
      : personal >= 20
        ? { money: 1800, spiritStone: 10, aura: 280, items: [] }
        : { money: 800, spiritStone: 4, aura: 120, items: [] }
  return {
    tier,
    rewards: {
      money: Math.floor(base.money * globalBonus),
      spiritStone: Math.floor(base.spiritStone * globalBonus),
      aura: Math.floor(base.aura * globalBonus),
      items: base.items
    }
  }
}
function worldBossScoreFromSaveData(d = {}) {
  const quest = d.quest || d.questStore || (d.stores && d.stores.quest) || {}
  const combat = d.combat || d.combatStore || (d.stores && d.stores.combat) || {}
  const claimed = Array.isArray(quest.journeyClaimed) ? quest.journeyClaimed : []
  const tower = Number(combat.towerHighestFloor || 0) || 0
  let score = 0
  // 服务端只信任云存档中已有的长期进度，不再接受客户端直接上报 personalScore。
  if (claimed.includes('v11_event_hunt')) score = Math.max(score, 20)
  score = Math.max(score, tower * 2)
  return Math.min(80, Math.max(0, Math.floor(score)))
}
async function computeWorldBossStats(focusUserId = null) {
  const [rows] = await pool.execute(`SELECT user_id, player_name, data_json, updated_at FROM saves WHERE data_json IS NOT NULL AND data_json <> '' ORDER BY updated_at DESC LIMIT 500`)
  let progress = 0
  let participants = 0
  let focusScore = 0
  let focusPlayerName = ''
  const seen = new Set()
  for (const r of rows) {
    let d = null
    try { d = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json } catch {}
    if (!d) continue
    const score = worldBossScoreFromSaveData(d)
    const userKey = r.user_id || r.player_name || String(Math.random())
    if (score > 0 && !seen.has(userKey)) {
      seen.add(userKey)
      participants++
      progress += score
    }
    if (focusUserId && r.user_id === focusUserId && score >= focusScore) {
      const p = d.player || d.playerStore || (d.stores && d.stores.player) || {}
      focusScore = score
      focusPlayerName = normalizePlayerName(p.playerName || p.name || r.player_name || '')
    }
  }
  const target = 300
  const statusText = progress >= target ? '已镇压' : progress >= target * 0.6 ? '决战中' : '进行中'
  const cycleKey = getWorldBossCycleKey()
  return { eventId: 'yaochao-v152', cycleKey, title: '世界妖潮', progress, target, participants, percent: Math.min(100, Math.floor(progress / target * 100)), statusText, focusScore, focusPlayerName }
}
function isValidRealmName(name) {
  const n = String(name || '')
  return REALMS.includes(n) || IMMORTAL_REALMS.some(r => r.name === n)
}
async function getLatestSaveSnapshot(userId) {
  const [rows] = await pool.execute('SELECT s.user_id, s.player_name, s.data_json, s.updated_at, c.name AS character_name FROM saves s LEFT JOIN characters c ON c.id = s.character_id WHERE s.user_id = ? AND s.data_json IS NOT NULL AND s.data_json <> "" ORDER BY s.updated_at DESC LIMIT 1', [userId])
  if (!rows.length) return null
  let data = null
  try { data = typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json } catch {}
  if (!data) return null
  const p = data.player || data.playerStore || (data.stores && data.stores.player) || {}
  const cu = data.cultivation || data.cultivationStore || (data.stores && data.stores.cultivation) || {}
  const asc = data.ascension || data.ascensionStore || (data.stores && data.stores.ascension) || {}
  return { row: rows[0], data, playerName: normalizePlayerName(p.playerName || p.name || rows[0].character_name || rows[0].player_name || ''), realmName: realmNameFromSave(cu, asc), cu, asc }
}

// --- 活动：世界妖潮（聚合线上存档进度） ---
app.get('/api/events/world-boss', async (req, res) => {
  try {
    const stats = await computeWorldBossStats()
    send(res, 200, { eventId: stats.eventId, cycleKey: stats.cycleKey, title: stats.title, progress: stats.progress, target: stats.target, participants: stats.participants, percent: stats.percent, statusText: stats.statusText })
  } catch (e) { console.error('world boss err', e); send(res, 500, { error: '服务器错误' }) }
})


app.post('/api/events/world-boss/claim-cycle', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const stats = await computeWorldBossStats(user.id)
    const cycleKey = stats.cycleKey
    const score = stats.focusScore
    if (score <= 0) return send(res, 400, { error: '本期暂无镇魔贡献' })
    const legacyId = `world-boss-cycle:${cycleKey}`
    await conn.beginTransaction()
    const [exists] = await conn.execute('SELECT id FROM user_mails WHERE user_id = ? AND legacy_mail_id = ? LIMIT 1 FOR UPDATE', [user.id, legacyId])
    if (exists.length) { await conn.rollback(); return send(res, 409, { error: '本期结算邮件已发放，请前往邮箱领取' }) }
    const calc = worldBossCycleReward(score, stats.progress)
    const cleanRewards = sanitizeRewardPayload(calc.rewards)
    const title = `全服镇魔战报 · ${cycleKey}`
    const content = `本期全服镇魔结算完成。道友${stats.focusPlayerName || user.username || '无名'}个人贡献 ${score}，评级「${calc.tier}」。全服贡献 ${stats.progress}/${stats.target}，参与人数 ${stats.participants}。奖励已随信附上。`
    const id = uuidv4()
    await conn.execute('INSERT INTO user_mails (id, user_id, legacy_mail_id, title, content, rewards, from_name) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, user.id, legacyId, title, content, JSON.stringify(cleanRewards), '镇魔司'])
    await conn.commit()
    await recordEconomyEvent(user, req, { eventType: 'world_boss_cycle_mail', amount: Number(cleanRewards.money || 0), source: 'world_boss', detail: { cycleKey, score, progress: stats.progress, rewards: cleanRewards } })
    send(res, 200, { ok: true, mailId: id, cycleKey, tier: calc.tier, rewards: cleanRewards, title, content })
  } catch (e) {
    try { await conn.rollback() } catch {}
    console.error('world boss cycle claim err', e)
    send(res, 500, { error: '服务器错误' })
  } finally { conn.release() }
})

// --- 突破公告 ---
app.post('/api/breakthrough-announce', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const { playerName, from, to } = req.body || {}
    const cleanPlayerName = normalizePlayerName(playerName)
    const cleanTo = String(to || '').slice(0, 50)
    const cleanFrom = String(from || '凡人').slice(0, 50)
    if (!cleanPlayerName || !cleanTo || !isValidRealmName(cleanTo) || (cleanFrom && !isValidRealmName(cleanFrom))) return send(res, 400, { error: '参数不完整或境界无效' })
    const snap = await getLatestSaveSnapshot(user.id)
    if (!snap || snap.playerName !== cleanPlayerName) return send(res, 403, { error: '角色信息不匹配' })
    // 不信任客户端写排行榜境界：排行榜境界只使用当前云档解析值；公告目标境界必须与云档当前境界一致，防伪造高境界。
    if (snap.realmName !== cleanTo) return send(res, 409, { error: '云端存档境界与公告不一致，请先完成云存档保存。', currentRealm: snap.realmName })
    const [recent] = await pool.execute('SELECT COUNT(*) AS c FROM world_announcements WHERE type = ? AND message LIKE ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)', ['breakthrough', `%${cleanPlayerName}%`])
    if (Number(recent[0]?.c || 0) > 0) return send(res, 429, { error: '公告发送过于频繁，请稍后再试' })
    const msg = `⚡ 全服公告：${cleanPlayerName} 渡劫成功，自「${cleanFrom || '凡人'}」踏入「${cleanTo}」！天雷散尽，道号留名。`
    await pool.execute('INSERT INTO world_announcements (message, type) VALUES (?, ?)', [msg, 'breakthrough'])
    await pool.execute('DELETE FROM world_announcements WHERE id NOT IN (SELECT id FROM (SELECT id FROM world_announcements ORDER BY created_at DESC LIMIT 20) t)')
    await pool.execute('INSERT INTO leaderboard (user_id, username, player_name, realm_name) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE player_name=VALUES(player_name), realm_name=VALUES(realm_name)', [user.id, user.username, snap.playerName, snap.realmName])
    send(res, 200, { ok: true })
  } catch (e) { console.error('breakthrough announce err', e); send(res, 500, { error: '服务器错误' }) }
})

app.get('/api/world-announcements', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, message, type, repeat_interval_minutes as repeatIntervalMinutes, created_at as time FROM world_announcements ORDER BY created_at DESC LIMIT 10')
    send(res, 200, { announcements: rows })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
})

// 管理员手动全服公告：复用玩家侧滚动公告队列
app.get('/api/admin/world-announcements', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res); if (!admin) return
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100)
    const [rows] = await pool.execute('SELECT id, message, type, repeat_interval_minutes as repeatIntervalMinutes, created_at as time FROM world_announcements ORDER BY created_at DESC LIMIT ' + limit)
    send(res, 200, { announcements: rows })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
})
app.post('/api/admin/world-announcements', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res); if (!admin) return
    const message = String(req.body?.message || '').trim().slice(0, 500)
    const type = String(req.body?.type || 'admin').trim().slice(0, 20) || 'admin'
    const repeatIntervalMinutes = Math.max(0, Math.min(10080, Math.floor(Number(req.body?.repeatIntervalMinutes || 0) || 0)))
    if (!message) return send(res, 400, { error: '公告内容不能为空' })
    const text = message.startsWith('📢') || message.startsWith('⚡') ? message : `📢 全服公告：${message}`
    await pool.execute('INSERT INTO world_announcements (message, type, repeat_interval_minutes) VALUES (?, ?, ?)', [text, type, repeatIntervalMinutes])
    await pool.execute('DELETE FROM world_announcements WHERE id NOT IN (SELECT id FROM (SELECT id FROM world_announcements ORDER BY created_at DESC LIMIT 50) t)')
    const [rows] = await pool.execute('SELECT id, message, type, repeat_interval_minutes as repeatIntervalMinutes, created_at as time FROM world_announcements ORDER BY created_at DESC LIMIT 30')
    send(res, 200, { ok: true, announcements: rows })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
})
app.delete('/api/admin/world-announcements/:id', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res); if (!admin) return
    await pool.execute('DELETE FROM world_announcements WHERE id = ?', [req.params.id])
    send(res, 200, { ok: true })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
})


// ========== 聊天 API ==========
app.get('/api/chat', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const channel = String(req.query.channel || 'world').slice(0, 20)
    const afterId = Number(req.query.after) || 0
    const limit = Math.min(Number(req.query.limit) || 50, 100)
    let rows
    if (channel === 'private') {
      const peerId = String(req.query.peer || '').slice(0, 36)
      if (!peerId) return send(res, 400, { error: '缺少对方ID' })
      const [r] = await pool.execute(
        'SELECT c.*, u.username FROM chat_messages c JOIN users u ON u.id = c.from_user_id WHERE c.channel = ? AND ((c.from_user_id = ? AND c.to_user_id = ?) OR (c.from_user_id = ? AND c.to_user_id = ?)) AND c.id > ? ORDER BY c.id ASC LIMIT ?',
        ['private', user.id, peerId, peerId, user.id, afterId, limit]
      )
      rows = r
    } else {
      const [r] = await pool.execute(
        'SELECT c.*, u.username FROM chat_messages c JOIN users u ON u.id = c.from_user_id WHERE c.channel = ? AND c.id > ? ORDER BY c.id DESC LIMIT ?',
        [channel, afterId, limit]
      )
      rows = r.reverse()
    }
    const playerName = await getPlayerName(user)
    send(res, 200, { messages: rows.map(m => ({ id: m.id, channel: m.channel, fromUserId: m.from_user_id, fromUsername: m.from_username, fromPlayerName: m.from_player_name, fromRealmName: m.from_realm_name, content: m.content, createdAt: m.created_at })), playerNames: playerName ? { [user.id]: playerName } : {} })
  } catch (e) { console.error('chat fetch err', e.message); send(res, 500, { error: '服务器错误' }) }
})

app.post('/api/chat', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const { channel, content, toUserId } = req.body || {}
    const ch = String(channel || 'world').slice(0, 20)
    const text = String(content || '').trim().slice(0, 200)
    if (!text) return send(res, 400, { error: '消息不能为空' })
    if (text.length > 200) return send(res, 400, { error: '消息过长（200字以内）' })
    // Rate limit: max 5 messages per 10 seconds (simple check)
    const [recent] = await pool.execute('SELECT COUNT(*) as c FROM chat_messages WHERE from_user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)', [user.id])
    if (recent[0].c >= 5) return send(res, 429, { error: '发送太快了，请稍等' })
    const playerName = await getPlayerName(user)
    const realmName = await getPlayerRealmName(user)
    const toUid = ch === 'private' ? String(toUserId || '').slice(0, 36) : null
    if (ch === 'private' && !toUid) return send(res, 400, { error: '缺少对方ID' })
    const [result] = await pool.execute(
      'INSERT INTO chat_messages (channel, from_user_id, from_username, from_player_name, from_realm_name, to_user_id, content) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [ch, user.id, user.username, playerName || user.username, realmName, toUid, text]
    )
    send(res, 200, { ok: true, id: result.insertId })
  } catch (e) { console.error('chat send err', e.message); send(res, 500, { error: '服务器错误' }) }
})

async function getPlayerName(user) {
  try {
    const [chars] = await pool.execute('SELECT c.name FROM characters c INNER JOIN saves s ON s.character_id = c.id WHERE s.user_id = ? ORDER BY s.updated_at DESC LIMIT 1', [user.id])
    if (chars.length) return chars[0].name
    const [saves] = await pool.execute('SELECT player_name FROM saves WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1', [user.id])
    return saves.length ? saves[0].player_name : null
  } catch { return null }
}

async function getPlayerRealmName(user) {
  try {
    const [rows] = await pool.execute('SELECT lb.realm_name FROM leaderboard lb WHERE lb.user_id = ? LIMIT 1', [user.id])
    return rows.length ? rows[0].realm_name : null
  } catch { return null }
}

// ========== 管理员 API ==========
app.get('/api/admin/users', async (req, res) => {
  try { const admin = await requireAdmin(req, res); if (!admin) return; const [users] = await pool.execute('SELECT * FROM users ORDER BY created_at DESC'); send(res, 200, { users: users.map(publicUser) }) } catch (e) { send(res, 500, { error: '服务器错误' }) }
})
app.get('/api/admin/users/:id/saves', async (req, res) => {
  try { const admin = await requireAdmin(req, res); if (!admin) return; const [rows] = await pool.execute('SELECT slot, meta_json, updated_at, LENGTH(raw) as rawSize FROM saves WHERE user_id = ?', [req.params.id]); send(res, 200, { saves: rows.map(r => ({ slot: r.slot, meta: r.meta_json, updatedAt: r.updated_at, rawSize: r.rawSize })) }) } catch (e) { send(res, 500, { error: '服务器错误' }) }
})
app.post('/api/admin/users/:id/ban', async (req, res) => {
  try { const admin = await requireAdmin(req, res); if (!admin) return; await pool.execute('UPDATE users SET disabled=1,disabled_at=NOW() WHERE id=?', [req.params.id]); await pool.execute('DELETE FROM sessions WHERE user_id=?', [req.params.id]); const [u] = await pool.execute('SELECT * FROM users WHERE id=?', [req.params.id]); send(res, 200, { ok: true, user: publicUser(u[0]) }) } catch (e) { send(res, 500, { error: '服务器错误' }) }
})
app.post('/api/admin/users/:id/unban', async (req, res) => {
  try { const admin = await requireAdmin(req, res); if (!admin) return; await pool.execute('UPDATE users SET disabled=0,disabled_at=NULL WHERE id=?', [req.params.id]); const [u] = await pool.execute('SELECT * FROM users WHERE id=?', [req.params.id]); send(res, 200, { ok: true, user: publicUser(u[0]) }) } catch (e) { send(res, 500, { error: '服务器错误' }) }
})
app.post('/api/admin/users/:id/reset-password', async (req, res) => {
  try { const admin = await requireAdmin(req, res); if (!admin) return; const { password } = req.body; if (!password || password.length < 6) return send(res, 400, { error: '新密码至少6位' }); await pool.execute('UPDATE users SET password_hash=? WHERE id=?', [bcrypt.hashSync(password, 10), req.params.id]); if (req.params.id !== admin.id) await pool.execute('DELETE FROM sessions WHERE user_id=?', [req.params.id]); send(res, 200, { ok: true }) } catch (e) { send(res, 500, { error: '服务器错误' }) }
})


const ADMIN_REWARD_LIMITS = Object.freeze({
  money: 50000,
  spiritStone: 300,
  aura: 50000,
  cultivation: 100000,
  mana: 10000,
  stamina: 500,
  attributeExp: 1000,
  itemQuantity: 99,
  itemKinds: 12
})
const clampRewardInt = (value, max, min = 0) => Math.max(min, Math.min(max, Math.floor(Number(value) || 0)))
const sanitizeRewardPayload = (r = {}) => ({
  money: clampRewardInt(r.money, ADMIN_REWARD_LIMITS.money),
  spiritStone: clampRewardInt(r.spiritStone ?? r.spirit_stone, ADMIN_REWARD_LIMITS.spiritStone),
  aura: clampRewardInt(r.aura, ADMIN_REWARD_LIMITS.aura),
  cultivation: clampRewardInt(r.cultivation, ADMIN_REWARD_LIMITS.cultivation),
  mana: clampRewardInt(r.mana, ADMIN_REWARD_LIMITS.mana),
  stamina: clampRewardInt(r.stamina, ADMIN_REWARD_LIMITS.stamina),
  attributeExp: r.attributeExp && typeof r.attributeExp === 'object' ? {
    physique: clampRewardInt(r.attributeExp.physique, ADMIN_REWARD_LIMITS.attributeExp),
    strength: clampRewardInt(r.attributeExp.strength, ADMIN_REWARD_LIMITS.attributeExp),
    agility: clampRewardInt(r.attributeExp.agility, ADMIN_REWARD_LIMITS.attributeExp),
    perception: clampRewardInt(r.attributeExp.perception, ADMIN_REWARD_LIMITS.attributeExp)
  } : {},
  items: Array.isArray(r.items) ? r.items.slice(0, ADMIN_REWARD_LIMITS.itemKinds).map(item => ({
    itemId: String(item?.itemId || '').slice(0, 80),
    name: String(item?.name || '').slice(0, 40),
    quantity: clampRewardInt(item?.quantity, ADMIN_REWARD_LIMITS.itemQuantity, 1),
    quality: ['normal','fine','excellent','supreme'].includes(String(item?.quality || 'normal')) ? String(item?.quality || 'normal') : 'normal'
  })).filter(item => item.itemId) : []
})
const rewardClampInfo = (before = {}, after = {}) => {
  const keys = ['money','spiritStone','aura','cultivation','mana','stamina']
  const clamped = []
  for (const k of keys) {
    const src = k === 'spiritStone' ? (before.spiritStone ?? before.spirit_stone) : before[k]
    if (Number(src || 0) !== Number(after[k] || 0)) clamped.push(k)
  }
  return clamped
}

const sanitizeFloatingWelfare = (input, fallback = {}) => {
  const src = input && typeof input === 'object' ? input : fallback
  const rawGifts = Array.isArray(src?.gifts) ? src.gifts : Array.isArray(fallback?.gifts) ? fallback.gifts : []
  const cleanRewards = sanitizeRewardPayload
  return {
    enabled: Boolean(src?.enabled),
    buttonText: String(src?.buttonText || '福利').slice(0, 12),
    title: String(src?.title || '桃源福利').slice(0, 30),
    desc: String(src?.desc || '').slice(0, 200),
    gifts: rawGifts.slice(0, 12).map((gift, idx) => ({
      id: String(gift?.id || `gift_${idx + 1}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || `gift_${idx + 1}`,
      type: ['newbie','daily','seven_day','custom'].includes(String(gift?.type || 'custom')) ? String(gift?.type || 'custom') : 'custom',
      title: String(gift?.title || '福利礼包').slice(0, 30),
      desc: String(gift?.desc || '').slice(0, 160),
      enabled: gift?.enabled !== false,
      reset: ['once','daily','sevenDay'].includes(String(gift?.reset || 'once')) ? String(gift?.reset || 'once') : 'once',
      rewards: cleanRewards(gift?.rewards || {})
    })).filter(gift => gift.title)
  }
}

app.get('/api/admin/config', async (req, res) => {
  try { const admin = await requireAdmin(req, res); if (!admin) return; send(res, 200, await getConfig()) } catch (e) { send(res, 500, { error: '服务器错误' }) }
})
app.put('/api/admin/config', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res); if (!admin) return
    const body = req.body, cfg = await getConfig()
    const updates = {
      siteName: String(body.siteName ?? cfg.siteName).slice(0, 30), announcement: String(body.announcement ?? cfg.announcement).slice(0, 1000),
      announcementIntervalHours: Math.max(0, Math.min(720, Number(body.announcementIntervalHours ?? cfg.announcementIntervalHours) || 24)),
      aboutQqText: String(body.aboutQqText ?? cfg.aboutQqText).slice(0, 80), aboutQqUrl: String(body.aboutQqUrl ?? cfg.aboutQqUrl).slice(0, 500),
      aboutGithubUrl: String(body.aboutGithubUrl ?? cfg.aboutGithubUrl).slice(0, 500), aboutTapTapUrl: String(body.aboutTapTapUrl ?? cfg.aboutTapTapUrl).slice(0, 500),
      iosDownloadUrl: String(body.iosDownloadUrl ?? cfg.iosDownloadUrl ?? '').slice(0, 1000), androidDownloadUrl: String(body.androidDownloadUrl ?? cfg.androidDownloadUrl ?? '').slice(0, 1000),
      sponsorAlipayImageUrl: String(body.sponsorAlipayImageUrl ?? cfg.sponsorAlipayImageUrl).slice(0, 1000), sponsorWechatImageUrl: String(body.sponsorWechatImageUrl ?? cfg.sponsorWechatImageUrl).slice(0, 1000),
      sponsorAfdianUrl: String(body.sponsorAfdianUrl ?? cfg.sponsorAfdianUrl).slice(0, 500),
      floatingWelfare: sanitizeFloatingWelfare(body.floatingWelfare ?? cfg.floatingWelfare, cfg.floatingWelfare),
      registrationEnabled: Boolean(body.registrationEnabled), maintenanceMode: Boolean(body.maintenanceMode),
      updateLogs: Array.isArray(body.updateLogs) ? body.updateLogs.slice(0, 100).map(x => ({ date: String(x?.date || new Date().toISOString().slice(0, 10)).slice(0, 20), title: String(x?.title || '').slice(0, 80), content: String(x?.content || '').slice(0, 1000) })).filter(x => x.title || x.content) : cfg.updateLogs
    }
    await setConfigMulti(updates)
    send(res, 200, await getConfig())
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
})
app.get('/api/admin/overview', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res); if (!admin) return
    const [[{uc}]] = await pool.execute('SELECT COUNT(*) as uc FROM users')
    const [[{sc}]] = await pool.execute('SELECT COUNT(*) as sc FROM saves')
    const [[{pc}]] = await pool.execute('SELECT COUNT(*) as pc FROM sessions')
    const [users] = await pool.execute('SELECT * FROM users ORDER BY created_at DESC')
    const enrichedUsers = []
    for (const u of users) {
      const pu = publicUser(u)
      const [saves] = await pool.execute('SELECT slot, meta_json, updated_at, LENGTH(raw) as rawSize FROM saves WHERE user_id = ? ORDER BY slot', [u.id])
      let saveCount = 0, lastSaveAt = null, saveDetails = []
      for (const s of saves) {
        saveCount++
        const mj = s.meta_json ? (typeof s.meta_json === 'string' ? JSON.parse(s.meta_json) : s.meta_json) : {}
        saveDetails.push({ slot: s.slot, playerName: mj.playerName || '未知', year: mj.year, season: mj.season, day: mj.day, money: mj.money, updatedAt: s.updated_at, rawSize: s.rawSize })
        if (!lastSaveAt || s.updated_at > lastSaveAt) lastSaveAt = s.updated_at
      }
      pu.saveCount = saveCount
      pu.lastSaveAt = lastSaveAt
      pu.saves = saveDetails
      enrichedUsers.push(pu)
    }
    send(res, 200, { stats: { userCount: uc, saveCount: sc, sessionCount: pc }, users: enrichedUsers })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
})
app.get('/api/admin/save-audit-events', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res); if (!admin) return
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500)
    const keyword = String(req.query.keyword || '').trim()
    const type = String(req.query.type || '').trim()
    const status = String(req.query.status || '').trim()
    const params = []
    const where = []
    if (keyword) { where.push('(username LIKE ? OR player_name LIKE ? OR user_id = ?)'); params.push(`%${keyword}%`, `%${keyword}%`, keyword) }
    if (type) { where.push('event_type = ?'); params.push(type) }
    if (status) { where.push('status = ?'); params.push(status) }
    const sql = `SELECT id, user_id, username, character_id, player_name, slot, event_type, status, raw_size, data_size, data_hash, client_loaded_at, server_updated_at, detail_json, ip, user_agent, created_at FROM save_audit_events ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT ${limit}`
    const [rows] = await pool.execute(sql, params)
    send(res, 200, { events: rows.map(r => ({ ...r, detail: safeJsonParse(r.detail_json, null) })) })
  } catch (e) { console.error('admin save audit events err', e); send(res, 500, { error: '服务器错误' }) }
})

app.get('/api/admin/economy-events', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res); if (!admin) return
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500)
    const keyword = String(req.query.keyword || '').trim()
    const type = String(req.query.type || '').trim()
    const params = []
    const where = []
    if (keyword) { where.push('(username LIKE ? OR player_name LIKE ? OR user_id = ?)'); params.push(`%${keyword}%`, `%${keyword}%`, keyword) }
    if (type) { where.push('event_type = ?'); params.push(type) }
    const sql = `SELECT id, user_id, username, character_id, player_name, event_type, amount, item_id, quantity, quality, source, detail_json, ip, user_agent, created_at FROM economy_events ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT ${limit}`
    const [rows] = await pool.execute(sql, params)
    send(res, 200, { events: rows.map(r => ({ ...r, detail: safeJsonParse(r.detail_json, null) })) })
  } catch (e) { console.error('admin economy events err', e); send(res, 500, { error: '服务器错误' }) }
})

app.post('/api/admin/mails', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const admin = await requireAdmin(req, res); if (!admin) return
    const { title, content, rewards } = req.body
    const target = req.body.target ?? req.body.to
    const cleanTitle = String(title || '').trim()
    if (!cleanTitle) return send(res, 400, { error: '标题必填' })
    const cleanRewards = sanitizeRewardPayload(rewards || {})
    const rewardJson = JSON.stringify(cleanRewards)
    let users = []
    if (!target || target === 'all') {
      const [rows] = await conn.execute('SELECT id FROM users WHERE disabled = 0')
      users = rows
    } else {
      const [rows] = await conn.execute('SELECT id FROM users WHERE id = ? AND disabled = 0 LIMIT 1', [target])
      if (!rows.length) return send(res, 404, { error: '收件人不存在或已封禁' })
      users = rows
    }
    if (!users.length) return send(res, 400, { error: '没有可发送的收件人' })
    await conn.beginTransaction()
    const ids = []
    for (const u of users) {
      const id = uuidv4()
      ids.push(id)
      await conn.execute('INSERT INTO user_mails (id, user_id, title, content, rewards, from_name) VALUES (?, ?, ?, ?, ?, ?)', [id, u.id, cleanTitle, content || '', rewardJson, '系统'])
    }
    await conn.commit()
    await recordEconomyEvent(admin, req, { eventType: 'admin_mail_send', amount: Number(cleanRewards.money || 0), source: 'admin_mail', detail: { target: target || 'all', count: ids.length, rewards: cleanRewards, clamped: rewardClampInfo(rewards || {}, cleanRewards) } })
    send(res, 200, { ok: true, id: ids[0], ids, count: ids.length, rewards: cleanRewards })
  } catch (e) {
    try { await conn.rollback() } catch {}
    console.error('admin send user mails err', e)
    send(res, 500, { error: '服务器错误' })
  } finally { conn.release() }
})

const PORT = process.env.PORT || 3001
ensureSchema().then(() => app.listen(PORT, '0.0.0.0', () => console.log(`taoyuan backend listening on ${PORT}`))).catch(e => { console.error('schema init failed', e); process.exit(1) })
