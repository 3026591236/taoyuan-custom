import express from 'express'
import mysql from 'mysql2/promise'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
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
  const [characterIdCols] = await pool.execute("SHOW COLUMNS FROM saves LIKE 'character_id'")
  if (!characterIdCols.length) await pool.execute("ALTER TABLE saves ADD COLUMN character_id VARCHAR(36) NULL AFTER user_id")
  const [playerNameCols] = await pool.execute("SHOW COLUMNS FROM saves LIKE 'player_name'")
  if (!playerNameCols.length) await pool.execute("ALTER TABLE saves ADD COLUMN player_name VARCHAR(20) NULL AFTER slot")
  const [idx] = await pool.execute("SHOW INDEX FROM saves WHERE Key_name = 'idx_saves_player_name'")
  if (!idx.length) await pool.execute("ALTER TABLE saves ADD INDEX idx_saves_player_name (player_name)")
}

function send(res, status, data) { res.status(status).json(data) }
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
    const user = await auth(req); if (!user) { conn.release(); return send(res, 401, { error: '请先登录' }) }
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
    const rawResp = r.raw || ''; send(res, 200, { slot: r.slot, raw: rawResp, meta: r.meta_json, updatedAt: r.updated_at })
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
    // data 为明文 JSON（新前端直接传），优先存入 data_json；raw 保留兼容旧版加密 blob
    const plainData = data || (raw ? safeJsonParse(raw, null) : null)
    const dataJson = plainData ? JSON.stringify(plainData) : null
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
    send(res, 200, { ok: true })
  } catch (e) { console.error('save err', e); send(res, 500, { error: '服务器错误' }) }
})

app.delete('/api/saves/:slot', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    await pool.execute('DELETE FROM saves WHERE user_id = ? AND slot = ?', [user.id, Number(req.params.slot)])
    send(res, 200, { ok: true })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
})

// --- 签到 ---
app.get('/api/checkin', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const today = new Date().toISOString().slice(0, 10)
    const [rows] = await pool.execute('SELECT id FROM checkins WHERE user_id = ? AND check_date = ?', [user.id, today])
    const [total] = await pool.execute('SELECT COUNT(*) as c FROM checkins WHERE user_id = ?', [user.id])
    send(res, 200, { checked: rows.length > 0, today, total: total[0].c, reward: 500 })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
})

app.post('/api/checkin', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const today = new Date().toISOString().slice(0, 10)
    const [exist] = await pool.execute('SELECT id FROM checkins WHERE user_id = ? AND check_date = ?', [user.id, today])
    if (exist.length) return send(res, 409, { error: '今天已经签到过了' })
    await pool.execute('INSERT INTO checkins (user_id, check_date, reward) VALUES (?, ?, 500)', [user.id, today])
    send(res, 200, { ok: true, reward: 500 })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
})

// --- 邮件 ---
app.get('/api/mails', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const [mails] = await pool.execute("SELECT * FROM mails WHERE target = 'all' OR target = ? ORDER BY created_at DESC", [user.id])
    const [claimed] = await pool.execute('SELECT mail_id FROM mail_claims WHERE user_id = ?', [user.id])
    const claimedSet = new Set(claimed.map(c => c.mail_id))
    send(res, 200, { mails: mails.map(m => ({ id: m.id, title: m.title, content: m.content, rewards: safeJsonParse(m.rewards, {}), from: m.from_name, createdAt: m.created_at, claimed: claimedSet.has(m.id) })) })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
})

app.post('/api/mails/:id/claim', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const [mailRows] = await pool.execute('SELECT * FROM mails WHERE id = ?', [req.params.id])
    if (!mailRows.length) return send(res, 404, { error: '邮件不存在' })
    const mail = mailRows[0]
    if (mail.target !== 'all' && mail.target !== user.id) return send(res, 403, { error: '无法领取' })
    const [exist] = await pool.execute('SELECT id FROM mail_claims WHERE mail_id = ? AND user_id = ?', [req.params.id, user.id])
    if (exist.length) return send(res, 409, { error: '已领取' })
    await pool.execute('INSERT INTO mail_claims (mail_id, user_id) VALUES (?, ?)', [req.params.id, user.id])
    send(res, 200, { ok: true, rewards: safeJsonParse(mail.rewards, {}) })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
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
        cultivation: Number(cu.cultivation ?? r.cached_cultivation ?? 0) || 0,
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
      if (by === 'rebirth') return (b.rebirthCount || 0) - (a.rebirthCount || 0)
      return (b.cultivation || 0) - (a.cultivation || 0)
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
app.post('/api/admin/mails', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res); if (!admin) return
    const { target, title, content, rewards } = req.body
    if (!title) return send(res, 400, { error: '标题必填' })
    const id = uuidv4()
    await pool.execute('INSERT INTO mails (id, target, title, content, rewards, from_name) VALUES (?, ?, ?, ?, ?, ?)', [id, target || 'all', title, content || '', JSON.stringify(rewards || []), '系统'])
    send(res, 200, { ok: true, id })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
})

const PORT = process.env.PORT || 3001
ensureSchema().then(() => app.listen(PORT, '0.0.0.0', () => console.log(`taoyuan backend listening on ${PORT}`))).catch(e => { console.error('schema init failed', e); process.exit(1) })
