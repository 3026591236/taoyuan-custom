<template>
  <div class="min-h-screen px-4 py-8 flex justify-center">
    <div class="game-panel w-full max-w-4xl space-y-4">
      <div class="flex items-center justify-between gap-3">
        <h1 class="text-accent text-xl">后台管理</h1>
        <button class="btn" @click="router.push('/')">返回首页</button>
      </div>
      <p class="text-xs text-muted">桃源乡自主更新版后台。已支持玩家总览、封号/解封、重置密码。</p>

      <div v-if="!user" class="border border-accent/20 rounded-xs p-4 space-y-3">
        <p class="text-sm text-muted">请先用管理员账号登录。第一个注册的账号会自动成为管理员。</p>
        <input v-model="username" class="input" placeholder="用户名" />
        <input v-model="password" class="input" placeholder="密码" type="password" />
        <div class="flex gap-2">
          <button class="btn flex-1 justify-center" @click="login">登录</button>
          <button class="btn flex-1 justify-center" @click="register">注册</button>
        </div>
      </div>

      <template v-else>
        <div class="border border-accent/20 rounded-xs p-3 text-sm flex flex-wrap justify-between gap-2">
          <span>当前账号：<span class="text-accent">{{ user.username }}</span> / {{ user.role }}</span>
          <button class="btn text-xs" @click="refreshAll">刷新后台数据</button>
        </div>
        <div v-if="user.role !== 'admin'" class="text-danger text-sm">当前账号不是管理员，不能修改后台配置。</div>
        <template v-else>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="border border-accent/20 rounded-xs p-3">
              <div class="text-muted text-xs">用户数</div>
              <div class="text-accent text-2xl">{{ overview.stats.userCount }}</div>
            </div>
            <div class="border border-accent/20 rounded-xs p-3">
              <div class="text-muted text-xs">云存档数</div>
              <div class="text-accent text-2xl">{{ overview.stats.saveCount }}</div>
            </div>
            <div class="border border-accent/20 rounded-xs p-3">
              <div class="text-muted text-xs">登录会话数</div>
              <div class="text-accent text-2xl">{{ overview.stats.sessionCount }}</div>
            </div>
          </div>

          <div class="border border-accent/20 rounded-xs p-2 flex flex-wrap gap-2">
            <button
              v-for="tab in adminTabs"
              :key="tab.key"
              class="btn text-xs"
              :class="activeTab === tab.key ? '!bg-accent !text-bg' : ''"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>

          <div v-if="activeTab === 'basic'" class="border border-accent/20 rounded-xs p-3 space-y-3">
            <h2 class="text-accent">基础配置</h2>
            <label class="block text-sm">站点名称</label>
            <input v-model="config.siteName" class="input" />
            <label class="block text-sm">首页公告</label>
            <textarea v-model="config.announcement" class="input min-h-28" />
            <label class="block text-sm">公告自动弹出间隔（小时，0=每次打开都显示）</label>
            <input v-model.number="config.announcementIntervalHours" class="input" type="number" min="0" max="720" />
            <label class="flex items-center gap-2 text-sm"><input v-model="config.registrationEnabled" type="checkbox" /> 开放注册</label>
            <label class="flex items-center gap-2 text-sm"><input v-model="config.maintenanceMode" type="checkbox" /> 维护模式提示</label>
            <button class="btn w-full justify-center" @click="saveConfig">保存基础配置</button>
          </div>

          <div v-if="activeTab === 'about'" class="border border-accent/20 rounded-xs p-3 space-y-3">
            <h2 class="text-accent">关于游戏 / 赞助作者</h2>
            <p class="text-xs text-muted">这些内容会显示在首页“关于游戏”和“赞助作者”弹窗里。二维码图片地址留空时使用内置默认图片。</p>
            <label class="block text-sm">QQ 群显示文字</label>
            <input v-model="config.aboutQqText" class="input" placeholder="例如：718630139" />
            <label class="block text-sm">QQ 群链接</label>
            <input v-model="config.aboutQqUrl" class="input" placeholder="https://qm.qq.com/..." />
            <label class="block text-sm">GitHub 仓库地址</label>
            <input v-model="config.aboutGithubUrl" class="input" placeholder="https://github.com/..." />
            <label class="block text-sm">TapTap 地址</label>
            <input v-model="config.aboutTapTapUrl" class="input" placeholder="https://www.taptap.cn/app/..." />
            <label class="block text-sm">支付宝赞助二维码图片地址</label>
            <input v-model="config.sponsorAlipayImageUrl" class="input" placeholder="留空使用默认图片，或填写 https://..." />
            <label class="block text-sm">微信赞助二维码图片地址</label>
            <input v-model="config.sponsorWechatImageUrl" class="input" placeholder="留空使用默认图片，或填写 https://..." />
            <label class="block text-sm">爱发电地址</label>
            <input v-model="config.sponsorAfdianUrl" class="input" placeholder="https://afdian.com/a/..." />
            <button class="btn w-full justify-center" @click="saveConfig">保存关于/赞助配置</button>
          </div>

          <div v-if="activeTab === 'updates'" class="border border-accent/20 rounded-xs p-3 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-accent">更新记录</h2>
              <button class="btn text-xs" @click="addUpdateLog">新增一条</button>
            </div>
            <div v-for="(log, idx) in config.updateLogs" :key="idx" class="border border-accent/10 rounded-xs p-2 space-y-2">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input v-model="log.date" class="input" placeholder="日期，如 2026-07-03" />
                <input v-model="log.title" class="input md:col-span-2" placeholder="标题" />
              </div>
              <textarea v-model="log.content" class="input min-h-20" placeholder="更新内容" />
              <button class="btn text-xs text-danger" @click="config.updateLogs.splice(idx, 1)">删除这条</button>
            </div>
            <button class="btn w-full justify-center" @click="saveConfig">保存更新记录</button>
          </div>

          <div v-if="activeTab === 'players'" class="border border-accent/20 rounded-xs p-3 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-accent">玩家 / 云存档总览</h2>
              <input v-model="keyword" class="input max-w-xs" placeholder="搜索用户名" />
            </div>
            <div v-if="filteredUsers.length === 0" class="text-xs text-muted">暂无用户。</div>
            <div v-for="u in filteredUsers" :key="u.id" class="border border-accent/10 rounded-xs p-3 space-y-2">
              <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <span class="text-accent">{{ u.username }}</span>
                  <span class="text-muted ml-2">{{ u.role }}</span>
                  <span v-if="u.disabled" class="text-danger ml-2">已封禁</span>
                  <span class="text-muted ml-2">注册：{{ formatTime(u.createdAt) }}</span>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <div class="text-xs text-muted">云存档 {{ u.saveCount }} 个 / 最近：{{ formatTime(u.lastSaveAt) }}</div>
                  <button class="btn text-xs" @click="resetPassword(u)">重置密码</button>
                  <button v-if="!u.disabled && u.id !== user.id" class="btn text-xs text-danger" @click="banUser(u)">封号</button>
                  <button v-if="u.disabled" class="btn text-xs" @click="unbanUser(u)">解封</button>
                </div>
              </div>
              <div v-if="u.saves.length === 0" class="text-xs text-muted">没有云存档。</div>
              <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div v-for="save in u.saves" :key="save.slot" class="border border-accent/10 rounded-xs p-2 text-xs space-y-1">
                  <div class="flex justify-between"><span class="text-accent">槽位 {{ save.slot + 1 }}</span><span>{{ formatSize(save.rawSize) }}</span></div>
                  <div>角色：{{ save.playerName || '未知' }}</div>
                  <div>日期：{{ save.year ? `第${save.year}年 ` : '' }}{{ save.season || '' }}{{ save.day ? ` 第${save.day}天` : '' }}</div>
                  <div>金钱：{{ save.money ?? '未知' }}</div>
                  <div class="text-muted">更新：{{ formatTime(save.updatedAt) }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="activeTab === 'gm'" class="border border-accent/20 rounded-xs p-3 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-accent">GM 邮件奖励</h2>
              <button class="btn text-xs" @click="addGmItem">增加物品行</button>
            </div>
            <p class="text-xs text-muted">奖励会以系统邮件发给玩家；玩家进入游戏后从邮件领取，领取后自动写入当前存档并由 5 秒自动云存档同步。</p>
            <label class="block text-sm">收件人</label>
            <select v-model="gmMail.to" class="input">
              <option value="all">全体玩家</option>
              <option v-for="u in overview.users" :key="u.id" :value="u.id">{{ u.username }}（{{ u.role }}）</option>
            </select>
            <label class="block text-sm">邮件标题</label>
            <input v-model="gmMail.title" class="input" placeholder="例如：开服补偿" />
            <label class="block text-sm">邮件内容</label>
            <textarea v-model="gmMail.content" class="input min-h-20" placeholder="给玩家看的说明" />
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label class="block text-sm">铜钱</label>
                <input v-model.number="gmMail.rewards.money" class="input" type="number" min="0" placeholder="0" />
              </div>
              <div>
                <label class="block text-sm">体力</label>
                <input v-model.number="gmMail.rewards.stamina" class="input" type="number" min="0" placeholder="0" />
              </div>
            </div>
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <label class="block text-sm">物品奖励</label>
                <span class="text-xs text-muted">物品 ID 可填 seed_spirit_rice、mana_recovery_pill 等</span>
              </div>
              <div v-for="(item, idx) in gmMail.rewards.items" :key="idx" class="grid grid-cols-1 md:grid-cols-12 gap-2">
                <input v-model="item.itemId" class="input md:col-span-5" placeholder="物品ID，如 mana_recovery_pill" />
                <input v-model.number="item.quantity" class="input md:col-span-2" type="number" min="1" placeholder="数量" />
                <select v-model="item.quality" class="input md:col-span-3">
                  <option value="normal">普通</option>
                  <option value="fine">优良</option>
                  <option value="excellent">精品</option>
                  <option value="supreme">极品</option>
                </select>
                <button class="btn text-xs text-danger md:col-span-2 justify-center" @click="gmMail.rewards.items.splice(idx, 1)">删除</button>
              </div>
            </div>
            <button class="btn w-full justify-center" @click="sendGmMail">发送 GM 邮件</button>
          </div>
        </template>
      </template>

      <p v-if="message" class="text-sm" :class="messageType === 'error' ? 'text-danger' : 'text-accent'">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const user = ref<any>(null)
const keyword = ref('')
const activeTab = ref<'basic' | 'about' | 'updates' | 'players' | 'gm'>('basic')
const adminTabs = [
  { key: 'basic', label: '基础配置' },
  { key: 'about', label: '关于/赞助' },
  { key: 'updates', label: '更新记录' },
  { key: 'players', label: '玩家管理' },
  { key: 'gm', label: 'GM邮件' }
] as const
const message = ref('')
const messageType = ref<'ok' | 'error'>('ok')
const config = reactive<any>({ siteName: '桃源乡', announcement: '', announcementIntervalHours: 24, updateLogs: [], aboutQqText: '', aboutQqUrl: '', aboutGithubUrl: '', aboutTapTapUrl: '', sponsorAlipayImageUrl: '', sponsorWechatImageUrl: '', sponsorAfdianUrl: '', registrationEnabled: true, maintenanceMode: false })
const overview = reactive<any>({ stats: { userCount: 0, saveCount: 0, sessionCount: 0 }, users: [] })
const gmMail = reactive<any>({
  to: 'all',
  title: '系统奖励',
  content: '',
  rewards: { money: 0, stamina: 0, items: [] }
})

const token = () => localStorage.getItem('taoyuan_account_token') || ''
const headers = () => ({ 'content-type': 'application/json', authorization: `Bearer ${token()}` })
const setMsg = (m: string, t: 'ok' | 'error' = 'ok') => { message.value = m; messageType.value = t }
async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(path, options)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
}
async function loadMe() { const data = await api('/api/me', { headers: headers() }); user.value = data.user }
async function loadConfig() { Object.assign(config, await api(user.value?.role === 'admin' ? '/api/admin/config' : '/api/config', { headers: headers() })) }
async function loadOverview() { if (user.value?.role === 'admin') Object.assign(overview, await api('/api/admin/overview', { headers: headers() })) }
async function refreshAll() { try { await loadMe(); await loadConfig(); await loadOverview(); setMsg('后台数据已刷新') } catch (e: any) { setMsg(e.message, 'error') } }
async function login() {
  try { const data = await api('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: username.value, password: password.value }) }); localStorage.setItem('taoyuan_account_token', data.token); user.value = data.user; await loadConfig(); await loadOverview(); setMsg('登录成功') } catch (e: any) { setMsg(e.message, 'error') }
}
async function register() {
  try { const data = await api('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: username.value, password: password.value }) }); localStorage.setItem('taoyuan_account_token', data.token); user.value = data.user; await loadConfig(); await loadOverview(); setMsg(data.message || '注册成功') } catch (e: any) { setMsg(e.message, 'error') }
}
function addUpdateLog() {
  config.updateLogs ||= []
  config.updateLogs.unshift({ date: new Date().toISOString().slice(0, 10), title: '', content: '' })
}
async function saveConfig() {
  try { Object.assign(config, await api('/api/admin/config', { method: 'PUT', headers: headers(), body: JSON.stringify(config) })); setMsg('配置已保存') } catch (e: any) { setMsg(e.message, 'error') }
}

async function banUser(u: any) {
  if (!confirm(`确定封禁账号「${u.username}」？该玩家会被踢下线并不能再登录。`)) return
  try { await api(`/api/admin/users/${encodeURIComponent(u.id)}/ban`, { method: 'POST', headers: headers() }); await loadOverview(); setMsg('已封禁账号') } catch (e: any) { setMsg(e.message, 'error') }
}
async function unbanUser(u: any) {
  try { await api(`/api/admin/users/${encodeURIComponent(u.id)}/unban`, { method: 'POST', headers: headers() }); await loadOverview(); setMsg('已解封账号') } catch (e: any) { setMsg(e.message, 'error') }
}
async function resetPassword(u: any) {
  const password = prompt(`请输入「${u.username}」的新密码，至少6位：`)
  if (!password) return
  if (password.length < 6) { setMsg('新密码至少6位', 'error'); return }
  try { await api(`/api/admin/users/${encodeURIComponent(u.id)}/reset-password`, { method: 'POST', headers: headers(), body: JSON.stringify({ password }) }); await loadOverview(); setMsg('密码已重置') } catch (e: any) { setMsg(e.message, 'error') }
}


function addGmItem() {
  gmMail.rewards.items.push({ itemId: '', quantity: 1, quality: 'normal' })
}
async function sendGmMail() {
  if (!gmMail.to) { setMsg('请选择收件人', 'error'); return }
  if (!confirm(gmMail.to === 'all' ? '确定给全体玩家发送这封奖励邮件？' : '确定给该玩家发送这封奖励邮件？')) return
  try {
    await api('/api/admin/mails', { method: 'POST', headers: headers(), body: JSON.stringify(gmMail) })
    gmMail.title = '系统奖励'
    gmMail.content = ''
    gmMail.rewards.money = 0
    gmMail.rewards.stamina = 0
    gmMail.rewards.items = []
    await loadOverview()
    setMsg('GM 邮件已发送')
  } catch (e: any) { setMsg(e.message, 'error') }
}

const filteredUsers = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return overview.users
  return overview.users.filter((u: any) => String(u.username).toLowerCase().includes(k))
})
function formatTime(v: string | null) { return v ? new Date(v).toLocaleString() : '无' }
function formatSize(n: number) { return n > 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n || 0} B` }
onMounted(async () => { try { await loadMe(); await loadConfig(); await loadOverview() } catch {} })
</script>
