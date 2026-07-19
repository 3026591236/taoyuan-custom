import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 80)
const PUBLIC_DIR = path.join(__dirname, 'docs')
const DATA_DIR = process.env.DATA_DIR || '/data'
const DB_FILE = path.join(DATA_DIR, 'db.json')

const defaultConfig = {
  siteName: '万象仙乡',
  announcement: '欢迎来到万象仙乡。灵田起步，万象问道。',
  registrationEnabled: true,
  maintenanceMode: false,
  announcementIntervalHours: 24,
  aboutQqText: '718630139',
  aboutQqUrl: 'https://qm.qq.com/q/2BVaTTwDkI',
  aboutGithubUrl: 'https://github.com/3026591236/taoyuan-custom',
  aboutTapTapUrl: 'https://www.taptap.cn/app/383510',
  sponsorAlipayImageUrl: '',
  sponsorWechatImageUrl: '',
  sponsorAfdianUrl: '',
  updateLogs: [
    { date: '2026-07-03', title: '修仙 V0.3：洞府与灵兽', content: '🏠 洞府系统：开辟洞府(8000文+200灵气)，4级扩建(石洞/灵穴/洞府/仙府)，3种设施安置(丹房/灵圃/静室)；🐾 灵兽系统：引灵寻兽(30灵力)，随机遇到灵狐🦊/仙鹤🦢/青鸾🦚，喂食增羁绊；🧘 修行优化：打坐产出灵气，突破消耗降低，修行消耗体力。' },
    { date: '2026-07-03', title: '角色界面修仙数据+轮廓', content: '角色信息区新增SVG古风人物轮廓，启蒙修仙后显示境界光环动画；新增修仙属性面板(修为/灵力/灵气/灵田/炼丹炉/法宝)；修为满时可直接点击突破。' },
    { date: '2026-07-03', title: 'GM邮件物品分类选择', content: '后台GM邮件物品奖励改为分类下拉选择(丹药/灵植/种子/矿石/材料/工具/食材/宝石等)，不用手动输入物品ID；右下角存档按钮已移除。' },
    { date: '2026-07-03', title: '修仙 V0.2：灵植与炼丹', content: '新增蕴灵稻、凝露草、朱果三种灵植和炼丹炉；可炼制回灵丹、聚气丹、筑基丹；灵植主要用于炼丹，工具开始法宝化为流光锄、引灵壶、灵雨诀。' },
    { date: '2026-07-03', title: '后台管理改为 Tab 栏', content: '后台页面拆分为基础配置、关于/赞助、更新记录、玩家管理四个 Tab，减少页面堆叠，配置更清晰。' },
    { date: '2026-07-03', title: '前台关于/赞助信息后台可配置', content: '后台基础配置新增 QQ 群、GitHub 仓库、TapTap、支付宝/微信赞助二维码图片地址、爱发电地址；前台关于游戏和赞助作者读取后台配置。' },
    { date: '2026-07-03', title: '新增5秒自动账号存档', content: '进入游戏后每5秒自动保存当前槽位；已登录账号时同步上传到账号云存档，避免下线忘记点击保存到账号。' },
    { date: '2026-07-03', title: '新增灵田修行体系 V0.1', content: '新增修行入口、灵田启蒙、修为/灵力/灵气/境界、打坐调息、炼化灵气、突破、温养灵田；收获部分高阶灵植时会获得灵气。' },
    { date: '2026-07-03', title: '新增每日签到', content: '每日签到已放入地图菜单的随身区域；登录账号后每天可领取一次 500 铜钱奖励。' },
    { date: '2026-07-03', title: '新增玩家后台管理', content: '后台已支持玩家总览、封号/解封、重置密码、云存档摘要查看。' },
    { date: '2026-07-03', title: '新增账号云存档', content: '支持账号注册登录、保存当前进度到账号、首页下载并继续。' }
  ],
  updatedAt: new Date().toISOString()
}

function ensureDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], sessions: {}, saves: {}, config: defaultConfig }, null, 2))
  }
}
function readDb() { ensureDb(); return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }
function writeDb(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)) }
function send(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(data))
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', c => { body += c; if (body.length > 1024 * 1024) req.destroy() })
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}) } catch (e) { reject(e) } })
    req.on('error', reject)
  })
}
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex')
  return `${salt}:${hash}`
}
function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':')
  if (!salt || !hash) return false
  const got = hashPassword(password, salt).split(':')[1]
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(got))
}
function token() { return crypto.randomBytes(32).toString('hex') }
function mergedConfig(db) { return { ...defaultConfig, ...(db.config || {}) } }
function publicUser(u) { return u ? { id: u.id, username: u.username, role: u.role, createdAt: u.createdAt, disabled: Boolean(u.disabled), disabledAt: u.disabledAt || null } : null }
function auth(req, db) {
  const h = req.headers.authorization || ''
  const t = h.startsWith('Bearer ') ? h.slice(7) : ''
  const sid = db.sessions[t]
  if (!sid) return null
  const user = db.users.find(u => u.id === sid) || null
  if (user?.disabled) return null
  return user
}

function saveSummary(save) {
  const meta = save?.meta || {}
  let parsed = null
  if (save?.raw) {
    try { parsed = JSON.parse(save.raw) } catch {}
  }
  const game = parsed?.game || parsed?.state?.game || parsed?.gameStore || parsed?.stores?.game || {}
  const player = parsed?.player || parsed?.state?.player || parsed?.playerStore || parsed?.stores?.player || {}
  return {
    slot: save.slot,
    updatedAt: save.updatedAt,
    meta,
    playerName: meta.playerName || meta.name || player.name || player.playerName || '',
    day: meta.day ?? game.day ?? game.currentDay ?? null,
    year: meta.year ?? game.year ?? null,
    season: meta.season ?? game.season ?? null,
    money: meta.money ?? player.money ?? game.money ?? null,
    rawSize: save.raw ? String(save.raw).length : 0
  }
}

function requireAdmin(req, res, db) {
  const u = auth(req, db)
  if (!u || u.role !== 'admin') { send(res, 403, { error: '需要管理员权限' }); return null }
  return u
}
function mime(file) {
  const ext = path.extname(file).toLowerCase()
  return { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.ico':'image/x-icon', '.svg':'image/svg+xml', '.woff2':'font/woff2' }[ext] || 'application/octet-stream'
}
function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost')
  let pathname = decodeURIComponent(url.pathname)
  let file = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname)
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end('Forbidden'); return }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(PUBLIC_DIR, 'index.html')
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end('Not found'); return }
    res.writeHead(200, { 'content-type': mime(file), 'cache-control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable' })
    res.end(buf)
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (!url.pathname.startsWith('/api/')) return serveStatic(req, res)
  try {
    const db = readDb()
    db.saves ||= {}
    db.checkins ||= {}
    db.mails ||= []
    db.mails ||= []
    if (req.method === 'GET' && url.pathname === '/api/config') return send(res, 200, mergedConfig(db))
    if (req.method === 'GET' && url.pathname === '/api/leaderboard') {
      const entries = []
      for (const user of db.users || []) {
        if (user.disabled) continue
        for (const save of Object.values(db.saves[user.id] || {})) {
          if (!save || !save.meta) continue
          const d = save.data || {}
          const p = d.player || {}
          const c = d.cultivation || {}
          const REALMS = ['凡人','炼气一层','炼气二层','炼气三层','炼气四层','炼气五层','炼气六层','炼气七层','炼气八层','炼气九层','筑基初期']
          entries.push({ playerName: p.playerName || save.meta.playerName || '无名', username: user.username, money: p.money || 0, cultivation: c.cultivation || 0, aura: c.aura || 0, realmName: REALMS[c.realmIndex] || '凡人', year: (d.game || {}).year || 1, season: (d.game || {}).season || '春', day: (d.game || {}).day || 1, updatedAt: save.updatedAt })
        }
      }
      const by = url.searchParams.get('by') || 'cultivation'
      if (by === 'money') entries.sort((a, b) => b.money - a.money)
      else if (by === 'aura') entries.sort((a, b) => b.aura - a.aura)
      else entries.sort((a, b) => b.cultivation - a.cultivation)
      return send(res, 200, { leaderboard: entries.slice(0, 50) })
    }
    if (req.method === 'POST' && url.pathname === '/api/breakthrough-announce') {
      const user2 = auth(req, db)
      if (!user2) return send(res, 401, { error: '请先登录' })
      const body = JSON.parse(rawBody || '{}')
      const { playerName, from, to } = body
      if (!playerName || !to) return send(res, 400, { error: '参数不完整' })
      db.config = db.config || {}
      db.config.worldAnnouncements = db.config.worldAnnouncements || []
      db.config.worldAnnouncements.unshift({ message: '✨ ' + playerName + ' 从「' + (from || '凡人') + '」突破至「' + to + '」！', time: new Date().toISOString(), type: 'breakthrough' })
      if (db.config.worldAnnouncements.length > 20) db.config.worldAnnouncements = db.config.worldAnnouncements.slice(0, 20)
      writeDb(db)
      return send(res, 200, { ok: true })
    }
    if (req.method === 'GET' && url.pathname === '/api/world-announcements') {
      return send(res, 200, { announcements: (db.config?.worldAnnouncements || []).slice(0, 10) })
    }
    if (req.method === 'GET' && url.pathname === '/api/me') return send(res, 200, { user: publicUser(auth(req, db)) })
    if (req.method === 'POST' && url.pathname === '/api/auth/register') {
      const body = await readBody(req)
      const username = String(body.username || '').trim()
      const password = String(body.password || '')
      if (!(db.config?.registrationEnabled ?? true)) return send(res, 403, { error: '注册已关闭' })
      if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]{3,16}$/.test(username)) return send(res, 400, { error: '用户名需为3-16位中文/字母/数字/下划线' })
      if (password.length < 6) return send(res, 400, { error: '密码至少6位' })
      if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) return send(res, 409, { error: '用户名已存在' })
      const role = db.users.length === 0 ? 'admin' : 'user'
      const user = { id: crypto.randomUUID(), username, passwordHash: hashPassword(password), role, createdAt: new Date().toISOString() }
      db.users.push(user)
      const t = token(); db.sessions[t] = user.id
      writeDb(db)
      return send(res, 200, { token: t, user: publicUser(user), message: role === 'admin' ? '注册成功，你是第一个用户，已设为管理员' : '注册成功' })
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await readBody(req)
      const username = String(body.username || '').trim()
      const password = String(body.password || '')
      const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase())
      if (!user || !verifyPassword(password, user.passwordHash)) return send(res, 401, { error: '用户名或密码错误' })
      if (user.disabled) return send(res, 403, { error: '账号已被封禁，请联系管理员' })
      const t = token(); db.sessions[t] = user.id; writeDb(db)
      return send(res, 200, { token: t, user: publicUser(user) })
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      const h = req.headers.authorization || ''; const t = h.startsWith('Bearer ') ? h.slice(7) : ''
      delete db.sessions[t]; writeDb(db); return send(res, 200, { ok: true })
    }
    if (req.method === 'GET' && url.pathname === '/api/checkin') {
      const user = auth(req, db)
      if (!user) return send(res, 401, { error: '请先登录账号' })
      db.checkins ||= {}
      const today = new Date().toISOString().slice(0, 10)
      const mine = db.checkins[user.id] || { days: [], total: 0 }
      return send(res, 200, { checked: mine.days.includes(today), today, total: mine.total || 0, reward: 500 })
    }
    if (req.method === 'POST' && url.pathname === '/api/checkin') {
      const user = auth(req, db)
      if (!user) return send(res, 401, { error: '请先登录账号' })
      db.checkins ||= {}
      const today = new Date().toISOString().slice(0, 10)
      db.checkins[user.id] ||= { days: [], total: 0 }
      if (db.checkins[user.id].days.includes(today)) return send(res, 409, { error: '今天已经签到过了' })
      const reward = 500
      db.checkins[user.id].days.push(today)
      db.checkins[user.id].total = (db.checkins[user.id].total || 0) + 1
      db.checkins[user.id].lastReward = reward
      db.checkins[user.id].lastAt = new Date().toISOString()
      writeDb(db)
      return send(res, 200, { ok: true, today, reward, total: db.checkins[user.id].total })
    }

    if (req.method === 'GET' && url.pathname === '/api/mails') {
      const user = auth(req, db)
      if (!user) return send(res, 401, { error: '请先登录账号' })
      db.mails ||= []
      const mails = db.mails
        .filter(m => (m.to === 'all' || m.to === user.id) && !(m.deletedBy || []).includes(user.id))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .map(m => ({
          id: m.id,
          title: m.title,
          content: m.content,
          rewards: m.rewards || {},
          createdAt: m.createdAt,
          claimed: (m.claimedBy || []).includes(user.id),
          from: m.from || '系统'
        }))
      return send(res, 200, { mails })
    }
    if (req.method === 'POST' && url.pathname.match(/^\/api\/mails\/[^/]+\/claim$/)) {
      const user = auth(req, db)
      if (!user) return send(res, 401, { error: '请先登录账号' })
      db.mails ||= []
      const mailId = decodeURIComponent(url.pathname.split('/')[3])
      const mail = db.mails.find(m => m.id === mailId && (m.to === 'all' || m.to === user.id))
      if (!mail) return send(res, 404, { error: '邮件不存在' })
      mail.claimedBy ||= []
      if (mail.claimedBy.includes(user.id)) return send(res, 409, { error: '这封邮件已经领取过了' })
      mail.claimedBy.push(user.id)
      mail.claimedAt ||= {}
      mail.claimedAt[user.id] = new Date().toISOString()
      writeDb(db)
      return send(res, 200, { ok: true, rewards: mail.rewards || {}, mail })
    }
    if (req.method === 'POST' && url.pathname === '/api/admin/mails') {
      const admin = requireAdmin(req, res, db); if (!admin) return
      const body = await readBody(req)
      const to = String(body.to || '').trim()
      if (to !== 'all' && !db.users.some(u => u.id === to)) return send(res, 400, { error: '请选择收件人' })
      const rewardsBody = body.rewards || {}
      const items = Array.isArray(rewardsBody.items) ? rewardsBody.items.slice(0, 20).map(x => ({
        itemId: String(x?.itemId || '').trim(),
        quantity: Math.max(1, Math.min(9999, Math.floor(Number(x?.quantity || 1)))),
        quality: ['normal', 'fine', 'excellent', 'supreme'].includes(String(x?.quality)) ? String(x?.quality) : 'normal'
      })).filter(x => x.itemId) : []
      const rewards = {
        money: Math.max(0, Math.min(999999999, Math.floor(Number(rewardsBody.money || 0)))),
        stamina: Math.max(0, Math.min(999999, Math.floor(Number(rewardsBody.stamina || 0)))),
        items
      }
      if (!rewards.money && !rewards.stamina && rewards.items.length === 0) return send(res, 400, { error: '至少填写一种奖励' })
      db.mails ||= []
      const mail = {
        id: crypto.randomUUID(),
        to,
        title: String(body.title || '系统奖励').slice(0, 80),
        content: String(body.content || '').slice(0, 1000),
        rewards,
        from: admin.username || '管理员',
        createdAt: new Date().toISOString(),
        claimedBy: []
      }
      db.mails.unshift(mail)
      writeDb(db)
      return send(res, 200, { ok: true, mail })
    }
    if (url.pathname.startsWith('/api/saves/')) {
      const user = auth(req, db)
      if (!user) return send(res, 401, { error: '请先登录账号' })
      const slot = Number(url.pathname.split('/').pop())
      if (!Number.isInteger(slot) || slot < 0 || slot > 2) return send(res, 400, { error: '存档槽位无效' })
      db.saves ||= {}
      db.saves[user.id] ||= {}
      if (req.method === 'GET') {
        const save = db.saves[user.id][slot]
        if (!save) return send(res, 404, { error: '云端没有这个槽位的存档' })
        return send(res, 200, save)
      }
      if (req.method === 'PUT') {
        const body = await readBody(req)
        const raw = String(body.raw || '')
        if (!raw || raw.length > 2 * 1024 * 1024) return send(res, 400, { error: '存档为空或过大' })
        db.saves[user.id][slot] = {
          slot,
          raw,
          meta: body.meta || {},
          updatedAt: new Date().toISOString()
        }
        writeDb(db)
        return send(res, 200, { ok: true, slot, updatedAt: db.saves[user.id][slot].updatedAt })
      }
    }
    if (req.method === 'GET' && url.pathname === '/api/saves') {
      const user = auth(req, db)
      if (!user) return send(res, 401, { error: '请先登录账号' })
      db.saves ||= {}
      const mine = db.saves[user.id] || {}
      return send(res, 200, { saves: Object.values(mine).map(s => ({ slot: s.slot, meta: s.meta || {}, updatedAt: s.updatedAt })) })
    }
    if (req.method === 'GET' && url.pathname === '/api/admin/overview') {
      if (!requireAdmin(req, res, db)) return
      db.saves ||= {}
      const users = db.users.map(u => {
        const mine = db.saves[u.id] || {}
        const saves = Object.values(mine).map(saveSummary).sort((a, b) => a.slot - b.slot)
        return {
          ...publicUser(u),
          saveCount: saves.length,
          lastSaveAt: saves.map(x => x.updatedAt).filter(Boolean).sort().pop() || null,
          saves
        }
      })
      return send(res, 200, {
        users,
        stats: {
          userCount: db.users.length,
          saveCount: users.reduce((n, u) => n + u.saveCount, 0),
          sessionCount: Object.keys(db.sessions || {}).length
        }
      })
    }
    if (req.method === 'POST' && url.pathname.match(/^\/api\/admin\/users\/[^/]+\/ban$/)) {
      const admin = requireAdmin(req, res, db); if (!admin) return
      const targetId = decodeURIComponent(url.pathname.split('/')[4])
      const target = db.users.find(u => u.id === targetId)
      if (!target) return send(res, 404, { error: '用户不存在' })
      if (target.id === admin.id) return send(res, 400, { error: '不能封禁自己' })
      target.disabled = true
      target.disabledAt = new Date().toISOString()
      for (const [t, uid] of Object.entries(db.sessions || {})) if (uid === target.id) delete db.sessions[t]
      writeDb(db)
      return send(res, 200, { ok: true, user: publicUser(target) })
    }
    if (req.method === 'POST' && url.pathname.match(/^\/api\/admin\/users\/[^/]+\/unban$/)) {
      if (!requireAdmin(req, res, db)) return
      const targetId = decodeURIComponent(url.pathname.split('/')[4])
      const target = db.users.find(u => u.id === targetId)
      if (!target) return send(res, 404, { error: '用户不存在' })
      target.disabled = false
      target.disabledAt = null
      writeDb(db)
      return send(res, 200, { ok: true, user: publicUser(target) })
    }
    if (req.method === 'POST' && url.pathname.match(/^\/api\/admin\/users\/[^/]+\/reset-password$/)) {
      const admin = requireAdmin(req, res, db); if (!admin) return
      const targetId = decodeURIComponent(url.pathname.split('/')[4])
      const target = db.users.find(u => u.id === targetId)
      if (!target) return send(res, 404, { error: '用户不存在' })
      const body = await readBody(req)
      const password = String(body.password || '')
      if (password.length < 6) return send(res, 400, { error: '新密码至少6位' })
      target.passwordHash = hashPassword(password)
      target.passwordChangedAt = new Date().toISOString()
      for (const [t, uid] of Object.entries(db.sessions || {})) if (uid === target.id && target.id !== admin.id) delete db.sessions[t]
      writeDb(db)
      return send(res, 200, { ok: true, user: publicUser(target) })
    }
    if (req.method === 'GET' && url.pathname === '/api/admin/users') {
      if (!requireAdmin(req, res, db)) return
      return send(res, 200, { users: db.users.map(publicUser) })
    }
    if (req.method === 'GET' && url.pathname === '/api/admin/config') {
      if (!requireAdmin(req, res, db)) return
      return send(res, 200, mergedConfig(db))
    }
    if (req.method === 'PUT' && url.pathname === '/api/admin/config') {
      if (!requireAdmin(req, res, db)) return
      const body = await readBody(req)
      db.config = {
        ...mergedConfig(db),
        siteName: String(body.siteName ?? db.config?.siteName ?? '万象仙乡').slice(0, 30),
        announcement: String(body.announcement ?? db.config?.announcement ?? '').slice(0, 1000),
        announcementIntervalHours: Math.max(0, Math.min(720, Number(body.announcementIntervalHours ?? db.config?.announcementIntervalHours ?? 24) || 24)),
        aboutQqText: String(body.aboutQqText ?? db.config?.aboutQqText ?? defaultConfig.aboutQqText).slice(0, 80),
        aboutQqUrl: String(body.aboutQqUrl ?? db.config?.aboutQqUrl ?? defaultConfig.aboutQqUrl).slice(0, 500),
        aboutGithubUrl: String(body.aboutGithubUrl ?? db.config?.aboutGithubUrl ?? defaultConfig.aboutGithubUrl).slice(0, 500),
        aboutTapTapUrl: String(body.aboutTapTapUrl ?? db.config?.aboutTapTapUrl ?? defaultConfig.aboutTapTapUrl).slice(0, 500),
        sponsorAlipayImageUrl: String(body.sponsorAlipayImageUrl ?? db.config?.sponsorAlipayImageUrl ?? defaultConfig.sponsorAlipayImageUrl).slice(0, 1000),
        sponsorWechatImageUrl: String(body.sponsorWechatImageUrl ?? db.config?.sponsorWechatImageUrl ?? defaultConfig.sponsorWechatImageUrl).slice(0, 1000),
        sponsorAfdianUrl: String(body.sponsorAfdianUrl ?? db.config?.sponsorAfdianUrl ?? defaultConfig.sponsorAfdianUrl).slice(0, 500),
        updateLogs: Array.isArray(body.updateLogs) ? body.updateLogs.slice(0, 100).map(x => ({
          date: String(x?.date || new Date().toISOString().slice(0, 10)).slice(0, 20),
          title: String(x?.title || '').slice(0, 80),
          content: String(x?.content || '').slice(0, 1000)
        })).filter(x => x.title || x.content) : (db.config?.updateLogs || defaultConfig.updateLogs),
        registrationEnabled: Boolean(body.registrationEnabled),
        maintenanceMode: Boolean(body.maintenanceMode),
        updatedAt: new Date().toISOString()
      }
      writeDb(db)
      return send(res, 200, db.config)
    }
    return send(res, 404, { error: '接口不存在' })
  } catch (e) {
    console.error(e)
    return send(res, 500, { error: '服务器错误' })
  }
})

server.listen(PORT, '0.0.0.0', () => console.log(`taoyuan custom server listening on ${PORT}`))
