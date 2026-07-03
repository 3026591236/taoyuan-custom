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

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

const pool = mysql.createPool({
  host: 'localhost', user: 'taoyuan', password: 'taoyuan2026',
  database: 'taoyuan', waitForConnections: true, connectionLimit: 10, charset: 'utf8mb4'
})

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

// --- 存档 ---
app.get('/api/saves', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const [rows] = await pool.execute('SELECT slot, meta_json, updated_at FROM saves WHERE user_id = ?', [user.id])
    const saves = {}
    for (const r of rows) saves[r.slot] = { slot: r.slot, meta: r.meta_json, updatedAt: r.updated_at }
    send(res, 200, { saves })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
})

app.get('/api/saves/:slot', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const [rows] = await pool.execute('SELECT * FROM saves WHERE user_id = ? AND slot = ?', [user.id, Number(req.params.slot)])
    if (!rows.length) return send(res, 404, { error: '存档不存在' })
    const r = rows[0]
    send(res, 200, { slot: r.slot, raw: r.raw, meta: r.meta_json, updatedAt: r.updated_at })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
})

app.put('/api/saves/:slot', async (req, res) => {
  try {
    const user = await auth(req); if (!user) return send(res, 401, { error: '请先登录' })
    const slot = Number(req.params.slot), { raw, meta } = req.body
    const metaJson = meta ? JSON.stringify(meta) : null
    await pool.execute('INSERT INTO saves (user_id, slot, raw, meta_json) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE raw=VALUES(raw), meta_json=VALUES(meta_json)', [user.id, slot, raw || '', metaJson])
    // 更新排行榜
    try {
      if (meta) {
        const playerName = meta.playerName || meta.name || '无名'
        const money = meta.money || 0
        await pool.execute('INSERT INTO leaderboard (user_id, username, player_name, money) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE player_name=VALUES(player_name), money=VALUES(money)', [user.id, user.username, playerName, money])
      }
    } catch {}
    send(res, 200, { ok: true })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
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
    send(res, 200, { mails: mails.map(m => ({ id: m.id, title: m.title, content: m.content, rewards: m.rewards, from: m.from_name, createdAt: m.created_at, claimed: claimedSet.has(m.id) })) })
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
    send(res, 200, { ok: true, rewards: mail.rewards })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
})

// --- 排行榜 ---
app.get('/api/leaderboard', async (req, res) => {
  try {
    const by = req.query.by || 'cultivation'
    const orderBy = by === 'money' ? 'money DESC' : by === 'aura' ? 'aura DESC' : 'cultivation DESC'
    const [rows] = await pool.execute(`SELECT * FROM leaderboard ORDER BY ${orderBy} LIMIT 50`)
    send(res, 200, { leaderboard: rows })
  } catch (e) { send(res, 500, { error: '服务器错误' }) }
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
app.listen(PORT, '0.0.0.0', () => console.log(`taoyuan backend listening on ${PORT}`))
