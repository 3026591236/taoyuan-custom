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
const REALMS = ['凡人','炼气一层','炼气二层','炼气三层','炼气四层','炼气五层','炼气六层','炼气七层','炼气八层','炼气九层','筑基初期','筑基中期','筑基后期','金丹初期','金丹中期','金丹后期','元婴初期','元婴中期','元婴后期','化神初期','化神中期','化神后期','渡劫初期','渡劫中期','渡劫后期','大乘初期','大乘中期','大乘后期','真仙','玄仙']

const defaultConfig = {
  siteName: '桃源乡',
  announcement: '欢迎来到桃源乡自主更新版。',
  registrationEnabled: true, maintenanceMode: false, announcementIntervalHours: 24,
  aboutQqText: '718630139', aboutQqUrl: 'https://qm.qq.com/q/2BVaTTwDkI',
  aboutGithubUrl: 'https://github.com/setube/taoyuan', aboutTapTapUrl: 'https://www.taptap.cn/app/383510',
  sponsorAlipayImageUrl: '', sponsorWechatImageUrl: '', sponsorAfdianUrl: 'https://afdian.com/a/setube',
  updateLogs: [
    { date: "2026-07-06", title: "V1.3.1 宗门纵深第一期", content: "宗门系统从单纯选择门派和升级技能，扩展为职位、每日宗门日课、贡献、功勋和宗门宝库循环；新增外门/内门/亲传/执事/长老候补晋升，日课可获得贡献功勋，贡献可升级技能或兑换灵石、灵植种子、秘境材料。" },
    { date: "2026-07-06", title: "V1.3.0 玩法内容纵深第一期", content: "更新方向从新增入口转向深耕已有玩法：特殊订单新增宗门灵植订单，要求提交蕴灵稻、凝露草、朱果、雪莲等灵植，奖励灵石、种子与秘境材料；特殊订单提交时会实际扣除目标物品，让种田、订单、修仙、秘境材料形成更完整循环。" },
    { date: "2026-07-06", title: "V1.2.8 渡劫天雷节奏优化", content: "放慢渡劫特效节奏，天雷改为逐道落下；雷劈次数会随境界提升逐步增加，最多10道，并在动画中显示本次天雷数量。" },
    { date: "2026-07-06", title: "V1.2.7 初战妖兽引导修复", content: "修复修仙之途战斗胜利未计入修行志怪物击杀的问题；将初战凶兽任务改名为初战妖兽，并明确引导到地图 → 修仙之途 → 秘境，可通过红尘历练、秘境探索或登仙塔低层完成。" },
    { date: "2026-07-06", title: "V1.2.6 地图入口图标优化", content: "修仙地图中修仙之途入口统一为原版线性图标风格，去除表情图标；修仙市集简称为市集，限时活动简称为活动，让地图按钮更整齐清爽。" },
    { date: "2026-07-06", title: "V1.2.5 玩家独立邮箱", content: "邮件系统改为每个玩家独立存储邮件副本；全服邮件会拆分到每个玩家邮箱，定向补偿只进入目标玩家邮箱，领取状态也独立保存，避免共用邮件池造成显示混乱。" },
    { date: '2026-07-06', title: 'V1.2.4 游戏内聊天', content: '新增世界频道聊天系统，登录后可在聊天面板发送和查看消息，支持实时轮询刷新。' },
    { date: '2026-07-06', title: 'V1.2.3 排行差距与功法推荐', content: '排行榜增加距上一名/上榜差距提示，修仙页增加功法选择推荐，活动页增加每日签到联动提示。' },
    { date: '2026-07-06', title: 'V1.2.2 战斗收益与活动中心', content: '战斗页增加区域产出说明与掉落用途标签，修仙页增加挂机收益估算，活动页升级为小型活动中心展示更多进行中目标。' },
    { date: '2026-07-06', title: 'V1.2.1 引导与用途说明', content: '修行志目标增加地点提示，修仙市集商品显示用途标签，背包物品显示用途说明，角色页新增成长诊断建议。' },
    { date: '2026-07-06', title: 'V1.2 全功能可玩性增强', content: '修行志扩展为全功能目标系统，新增钓鱼、挖矿、烹饪、收集、培育、功法、登塔、委托等长期与每日目标，并展示奖励内容，让每个玩法都有更明确的下一步。' },
    { date: '2026-07-06', title: 'V1.1.8 时间控制按钮优化', content: '时间倍率控制移回剩余时间条旁，改为减速和加速两个按钮，避免占用金钱与灵石显示区域。' },
    { date: '2026-07-06', title: 'V1.1.7 时间倍率控制', content: '顶部状态栏新增时间速度按钮，可在0.2、0.3、0.5、1、2、4、8倍之间切换，支持放慢节奏或快速推进一天。' },
    { date: '2026-07-06', title: 'V1.1.6 顶部灵石显示', content: '在顶部金钱位置旁新增灵石余额显示，进入修仙市集购买功法、纳物符、乾坤袋时可直接查看当前灵石数量。' },
    { date: '2026-07-06', title: 'V1.1.5 灵石购买修复', content: '修复修仙市集灵石商品购买弹窗仍显示铜钱、批量购买校验异常的问题；灵石商品现在显示灵石单价与总价，并按灵石余额购买。' },
    { date: '2026-07-06', title: 'V1.1.4 修仙市集商品修复', content: '修复修仙市集入口只停留在普通商圈的问题，现在进入后会打开独立修仙市集，直接展示灵石、丹药、纳物符、乾坤袋与功法秘籍。' },
    { date: '2026-07-06', title: 'V1.1.3 修仙市集入口', content: '新增地图「修仙之途 → 修仙市集」按钮，点击后直接进入商店并定位到修仙市集，方便购买功法秘籍、纳物符和乾坤袋。' },
    { date: '2026-07-06', title: 'V1.1.2 限时活动入口', content: '新增独立「限时活动」页面和地图按钮，妖潮来袭可查看进度、前往秘境讨伐并直接领取活动奖励，活动说明同步写入新手教程。' },
    { date: '2026-07-06', title: 'V1.1.1 教程与后台奖励完善', content: '新手教程补充天劫渡劫、功法市集和仙途七线说明；后台 GM 邮件奖励新增修为、灵气、灵力、灵石发放，玩家领取邮件后直接写入当前角色。' },

      {
        version: 'V1.1 七线补全',
        date: '2026-07-05',
        title: 'V1.1 七线补全',
        content: '修行志新增七条长期目标：修仙主线剧情、装备套装追求、深层秘境首通、仙盟互助、限时妖潮活动、下一步变强引导和回访福利，让玩家从新手到中后期都有明确追求与奖励反馈。',
        highlights: ['修仙主线目标', '装备套装追求', '深层秘境首通', '活动与回访福利']
      },

      {
        version: 'V1.0.1 功法与灵石市集扩展',
        date: '2026-07-05',
        title: 'V1.0.1 功法与灵石市集扩展',
        content: '修仙市集新增灵石兑换的纳物符、乾坤袋，可使用后永久扩展背包；新增青木长生诀、九霄雷诀、太虚归元功三门功法，购买秘籍后可学习并消耗灵气/修为参悟升级，提升修炼收益、战力和渡劫成功率。',
        highlights: ['灵石市集扩容道具', '新增功法系统', '功法参悟升级', '渡劫成功率加成']
      },
      {
        version: 'V1.0 天劫渡劫与挂机修仙',
        date: '2026-07-05',
        title: 'V1.0 天劫渡劫与挂机修仙',
        content: '增强离线奖励，修仙后离线和在线挂机都会获得灵气、修为与元神经验；跨大境界突破加入天劫渡劫、成功率展示、雷劈像素角色特效与雷鸣音效；渡劫失败会扣修为灵力、伤元神并可能掉级；新增养魂丹、涅魂丹用于恢复伤势和元神。',
        highlights: ['挂机修仙收益', '跨境界天劫', '雷劫特效音效', '元神伤势丹药']
      },
      {
        version: 'V0.9.2 玩家强度提升',
        date: '2026-07-05',
        title: 'V0.9.2 玩家强度提升',
        content: '提升资质成长带来的攻击、生命、身法和减伤收益；修复修行志根骨奖励字段错配；提高修行志目标奖励，让每日目标和七日成长的变强反馈更明显。',
        highlights: ['资质战力增强', '修行志奖励提升', '根骨奖励修复']
      },
      {
        version: 'V0.9.1 箱子制造与体力恢复修复',
        date: '2026-07-05',
        title: 'V0.9.1 箱子制造与体力恢复修复',
        content: '修复工坊箱子满足材料仍无法制造的问题，增加材料扣除失败保护；新增体力缓慢恢复：在线每60秒自然恢复1点，游戏时间推进和体力行动也会折算恢复。',
        highlights: ['修复箱子制造', '体力随时间缓慢恢复', '材料失败保护']
      },
    { date: '2026-07-05', title: 'V0.9 玩家爽感与回访优化', content: `• 新增回访离线收益：离线20分钟以上再次进入游戏，可获得铜钱、体力、灵石；修仙已解锁时额外获得修为和灵气，最多累计12小时。
• 新增全局奖励弹窗，签到、邮件、今日目标、离线收益都会用更明显的奖励反馈展示。
• 每日签到反馈强化：连续天数和获得物品会集中展示，让玩家每天回来更有仪式感。
• 今日目标领取反馈强化，完成目标后会弹出奖励卡，提升成长正反馈。
• 邮件奖励领取改为弹窗展示，补偿、活动奖励更清楚。` },
    { date: '2026-07-05', title: 'V0.8 留存与上瘾循环优化', content: `• 主界面新增「今日目标/下一步」卡片，直接展示修行志当前目标、进度、奖励和一键领奖/前往。
• 新增每日随机「今日机缘」，每天给种田、战斗、登塔、移动、修行或铜钱收益不同加成。
• 修行志奖励反馈强化，完成后更容易看到可领取状态；财运机缘会提高今日目标铜钱奖励。
• 登仙塔新增每5层/10层阶段宝箱，最高层刷新后提示可领取，宝箱奖励灵石、魂晶、法宝碎片等。
• 首日体验更集中：把种田、地脉、修行志、修仙战斗串成更明确的下一步目标链。` },
    { date: '2026-07-05', title: 'V0.6.11 登仙塔与实时爬塔榜', content: `• 秘境页新增「登仙塔」玩法：逐层自动挑战，胜利刷新个人最高层。
• 每层消耗灵力与体力，层数越高敌人越强、奖励越丰厚。
• 每5层出现精英，每10层出现镇塔首领。
• 登塔奖励包含修为、灵气、灵石、魂晶、法宝碎片、灵蕴玉等。
• 登仙塔页面新增实时爬塔榜，按玩家最新云档最高层排行展示。` },
    { date: '2026-07-05', title: 'V0.6.10 元神/丹药/境界异常修复', content: `• 修复金丹境界表重复导致金丹后期显示/突破映射异常的问题。
• 修复高级丹药被错误当作筑基丹生效的问题，造化丹、炼神丹、还虚丹等恢复各自正确效果。
• 元神修炼页面显示与实际消耗对齐：修炼消耗灵气，经验上限显示正确。
• 元神等级现在真实提升灵力上限，但不会直接影响境界突破条件。` },
    { date: '2026-07-05', title: 'V0.6.9 玩家反馈系统', content: `• 首页「关于游戏」下新增功能反馈、BUG反馈、意见提交入口，设置页反馈入口保留。
• 玩家提交的反馈会进入后台管理，可按类型与状态筛选查看。
• 后台反馈管理中文化状态：待处理、已读、已解决、已关闭。` },
    { date: '2026-07-03', title: '前后端分离重构', content: '后端Express+MySQL，前端nginx托管，数据全部存数据库' },
    { date: '2026-07-03', title: '修仙 V0.5：秘境探索/炼器/门派/法宝', content: '⚔️秘境+🔨炼器+🏛️门派+🗡️法宝+🧘境界扩展' }
  ]
}
async function getConfig() {
  const [rows] = await pool.execute('SELECT `key`, `value` FROM config')
  const cfg = { ...defaultConfig }
  for (const r of rows) { try { cfg[r.key] = JSON.parse(r.value) } catch { cfg[r.key] = r.value } }
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
    await conn.beginTransaction()
    await conn.execute('INSERT INTO characters (id, user_id, slot, name, gender) VALUES (?, ?, ?, ?, ?)', [id, user.id, slot, name, gender])
    const metaJson = safeStringify({ ...meta, playerName: name, gender })
    const dataJson = data ? JSON.stringify(data) : null
    await conn.execute('INSERT INTO saves (user_id, character_id, slot, player_name, raw, data_json, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE character_id=VALUES(character_id), player_name=VALUES(player_name), raw=VALUES(raw), data_json=VALUES(data_json), meta_json=VALUES(meta_json)', [user.id, id, slot, name, raw || dataJson || '', dataJson || raw || '', metaJson])
    await conn.commit()
    const summary = saveSummary(raw || dataJson || '', data, { ...meta, playerName: name, gender })
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
    if (clientLoadedAt && Number.isFinite(clientLoadedAt.getTime())) {
      const [currentRows] = await pool.execute('SELECT updated_at, character_id, player_name FROM saves WHERE user_id = ? AND slot = ? LIMIT 1', [user.id, slot])
      if (currentRows.length) {
        currentSaveRow = currentRows[0]
        const serverUpdatedAt = new Date(currentSaveRow.updated_at)
        // 同账号多端同时在线时，拒绝旧页面覆盖服务器上更新的存档。
        if (serverUpdatedAt.getTime() - clientLoadedAt.getTime() > 1500) {
          await recordSaveAuditEvent(user, req, { eventType: 'save_conflict', status: 'conflict', slot, characterId: currentSaveRow.character_id || saveCharacterId, playerName: currentSaveRow.player_name || playerName || summary.playerName, rawSize: summary.rawSize, dataSize: summary.dataSize, dataHash: summary.dataHash, clientLoadedAt: meta.lastLoadedAt, serverUpdatedAt: currentSaveRow.updated_at, detail: { ...summary, reason: 'stale_client_overwrite_rejected' } })
          return send(res, 409, { error: '云端存档已由其他设备更新，请刷新或重新进入后再继续。', conflict: true, serverUpdatedAt: currentSaveRow.updated_at })
        }
      }
    }
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
        const realmIdx = cu.realmIndex != null ? cu.realmIndex : (cu.realm || 0)
        const realmNameDisplay = cu.realmName || REALMS[realmIdx] || '凡人'
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
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const slot = Number(req.params.slot)
    const [before] = await pool.execute('SELECT character_id, player_name, updated_at, LENGTH(raw) AS raw_size, LENGTH(data_json) AS data_size FROM saves WHERE user_id = ? AND slot = ? LIMIT 1', [user.id, slot])
    await pool.execute('DELETE FROM saves WHERE user_id = ? AND slot = ?', [user.id, slot])
    if (before.length) await recordSaveAuditEvent(user, req, { eventType: 'save_delete', status: 'ok', slot, characterId: before[0].character_id, playerName: before[0].player_name, rawSize: before[0].raw_size || 0, dataSize: before[0].data_size || 0, serverUpdatedAt: before[0].updated_at, detail: { deleted: true } })
    send(res, 200, { ok: true })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
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
      rewards: safeJsonParse(m.rewards, {}),
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
    const rewards = safeJsonParse(mail.rewards, {})
    await conn.commit()
    await recordEconomyEvent(user, req, { eventType: 'mail_claim', amount: Number(rewards.money || 0), source: 'mail', detail: { mailId: mail.id, legacyMailId: mail.legacy_mail_id, title: mail.title, rewards } })
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
    if (!eventType) return send(res, 400, { error: '事件类型必填' })
    await recordEconomyEvent(user, req, { eventType, amount, itemId, quantity, quality, source, detail, slot, characterId, playerName })
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


function calcCombatPowerFromSave(p = {}, cu = {}) {
  const artifacts = cu.artifacts || {}
  let artifactPower = 0
  for (const v of Object.values(artifacts)) {
    if (v && typeof v === 'object') artifactPower += Math.floor(Number(v.atk || 0) * 12 + Number(v.def || 0) * 10 + Number(v.aura || 0) * 4 + Number(v.cultivation || 0) * 6)
  }
  const oldArtifactPower = ['glimmerHoe', 'spiritKettle', 'spiritRain'].filter(k => artifacts[k] === true).length * 80
  const realmIndex = Number(cu.realmIndex ?? cu.realm ?? 0) || 0
  const rebirthCount = Number(cu.rebirthCount || 0) || 0
  const cultivation = Number(cu.cultivation || 0) || 0
  const aura = Number(cu.aura || 0) || 0
  const mana = Number(cu.mana || 0) || 0
  const attrs = p.attributes || {}
  const attrPower = Number(p.attributePower || 0) || Object.values(attrs).reduce((sum, v) => sum + Number(v?.level || 0), 0)
  const hp = Number(p.maxHp || p.baseMaxHp || 100) || 100
  const systemPower = (Number(cu.fieldTier || 0) || 0) * 120 + (Number(cu.caveTier || 0) || 0) * 180 + (Number(cu.yuanShenLevel || 0) || 0) * 260 + (Number(cu.destinedArtifactLevel || 0) || 0) * 360 + (Number(cu.beastBond || 0) || 0) * 12 + Math.floor((Number(cu.sectContribution || 0) || 0) * 0.2)
  return Math.max(0, Math.floor(realmIndex * 1000 + rebirthCount * 50000 + cultivation * 1.2 + aura * 0.25 + mana * 2 + attrPower * 6 + hp * 1.5 + artifactPower + oldArtifactPower + systemPower))
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
      const realmIdx = cu.realmIndex != null ? cu.realmIndex : (cu.realm || 0)
      entries.push({
        userId: r.user_id,
        username: r.username,
        playerName: p.playerName || p.name || meta.playerName || r.player_name || '无名',
        realmName: cu.realmName || r.cached_realm_name || REALMS[realmIdx] || '凡人',
        realmIndex: Number(cu.realmIndex ?? cu.realm ?? 0) || 0,
        rebirthCount: Number(cu.rebirthCount || 0) || 0,
        cultivation: Number(cu.cultivation ?? r.cached_cultivation ?? 0) || 0,
        combatPower: calcCombatPowerFromSave(p, cu),
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
      const realmIdx = Number(cu.realmIndex ?? cu.realm ?? 0) || 0
      entries.push({
        userId: r.user_id,
        username: r.username,
        playerName: p.playerName || p.name || meta.playerName || r.player_name || '无名',
        floor,
        realmName: cu.realmName || REALMS[realmIdx] || '凡人',
        rebirthCount: Number(cu.rebirthCount || 0) || 0,
        updatedAt: r.updated_at
      })
    }
    entries.sort((a, b) => (b.floor - a.floor) || (b.rebirthCount - a.rebirthCount) || String(b.updatedAt).localeCompare(String(a.updatedAt)))
    send(res, 200, { leaderboard: entries.slice(0, limit) })
  } catch (e) { console.error('tower leaderboard err', e); send(res, 500, { error: '服务器错误' }) }
})
// --- 突破公告 ---
app.post('/api/breakthrough-announce', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const { playerName, from, to } = req.body
    if (!playerName || !to) return send(res, 400, { error: '参数不完整' })
    const msg = `✨ ${playerName} 从「${from || '凡人'}」突破至「${to}」！`
    await pool.execute('INSERT INTO world_announcements (message, type) VALUES (?, ?)', [msg, 'breakthrough'])
    await pool.execute('DELETE FROM world_announcements WHERE id NOT IN (SELECT id FROM (SELECT id FROM world_announcements ORDER BY created_at DESC LIMIT 20) t)')
    await pool.execute('INSERT INTO leaderboard (user_id, username, player_name, realm_name) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE realm_name=VALUES(realm_name)', [user.id, user.username, playerName, to])
    send(res, 200, { ok: true })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
})

app.get('/api/world-announcements', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT message, type, created_at as time FROM world_announcements ORDER BY created_at DESC LIMIT 10')
    send(res, 200, { announcements: rows })
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
      sponsorAlipayImageUrl: String(body.sponsorAlipayImageUrl ?? cfg.sponsorAlipayImageUrl).slice(0, 1000), sponsorWechatImageUrl: String(body.sponsorWechatImageUrl ?? cfg.sponsorWechatImageUrl).slice(0, 1000),
      sponsorAfdianUrl: String(body.sponsorAfdianUrl ?? cfg.sponsorAfdianUrl).slice(0, 500),
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
    const rewardJson = JSON.stringify(rewards || {})
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
    send(res, 200, { ok: true, id: ids[0], ids, count: ids.length })
  } catch (e) {
    try { await conn.rollback() } catch {}
    console.error('admin send user mails err', e)
    send(res, 500, { error: '服务器错误' })
  } finally { conn.release() }
})

const PORT = process.env.PORT || 3001
ensureSchema().then(() => app.listen(PORT, '0.0.0.0', () => console.log(`taoyuan backend listening on ${PORT}`))).catch(e => { console.error('schema init failed', e); process.exit(1) })
