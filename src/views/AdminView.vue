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

          <div v-if="activeTab === 'saveAudit'" class="border border-accent/20 rounded-xs p-3 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-accent">存档审计 / 安全日志</h2>
              <button class="btn text-xs" @click="loadSaveAuditEvents">刷新审计</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-5 gap-2">
              <input v-model="saveAuditKeyword" class="input" placeholder="用户名/角色名/userId" />
              <select v-model="saveAuditType" class="input">
                <option value="">全部类型</option>
                <option value="save_load">读取云档</option>
                <option value="save_write">写入云档</option>
                <option value="save_conflict">冲突拒绝</option>
                <option value="save_delete">删除存档</option>
                <option value="character_create_save">创建初始档</option>
              </select>
              <select v-model="saveAuditStatus" class="input">
                <option value="">全部状态</option>
                <option value="ok">正常</option>
                <option value="conflict">冲突</option>
              </select>
              <input v-model.number="saveAuditLimit" type="number" min="1" max="500" class="input" placeholder="条数" />
              <button class="btn justify-center" @click="loadSaveAuditEvents">查询</button>
            </div>
            <div v-if="saveAuditEvents.length === 0" class="text-xs text-muted">暂无存档审计记录。</div>
            <div v-for="ev in saveAuditEvents" :key="ev.id" class="border border-accent/10 rounded-xs p-2 text-xs space-y-1">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div><span class="text-accent">{{ ev.username }}</span><span class="text-muted ml-1">/ {{ ev.player_name || '无角色' }} / 槽位{{ ev.slot }}</span></div>
                <div class="text-muted">{{ formatTime(ev.created_at) }}</div>
              </div>
              <div class="flex flex-wrap gap-x-3 gap-y-1">
                <span>类型：{{ saveAuditTypeLabel(ev.event_type) }}</span>
                <span>状态：<b :class="ev.status === 'conflict' ? 'text-danger' : 'text-accent'">{{ saveAuditStatusLabel(ev.status) }}</b></span>
                <span>raw：{{ ev.raw_size }} B</span>
                <span>data：{{ ev.data_size }} B</span>
                <span v-if="ev.server_updated_at">服务器档：{{ formatTime(ev.server_updated_at) }}</span>
                <span v-if="ev.client_loaded_at">客户端载入：{{ formatTime(ev.client_loaded_at) }}</span>
                <span class="text-muted">IP：{{ ev.ip || '-' }}</span>
              </div>
              <div v-if="ev.data_hash" class="text-[10px] text-muted break-all">SHA256：{{ ev.data_hash }}</div>
              <pre v-if="ev.detail" class="text-[10px] text-muted whitespace-pre-wrap break-all bg-black/20 p-2 rounded-xs">{{ JSON.stringify(ev.detail, null, 2) }}</pre>
            </div>
          </div>

          <div v-if="activeTab === 'ledger'" class="border border-accent/20 rounded-xs p-3 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-accent">经济流水 / 操作日志</h2>
              <button class="btn text-xs" @click="loadEconomyEvents">刷新流水</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input v-model="ledgerKeyword" class="input" placeholder="用户名/角色名/userId" />
              <select v-model="ledgerType" class="input">
                <option value="">全部类型</option>
                <option value="sell_item">单个出售</option>
                <option value="sell_item_all">批量出售</option>
                <option value="sell_all">一键出售</option>
                <option value="mail_claim">邮件领取</option>
                <option value="checkin">每日签到</option>
              </select>
              <input v-model.number="ledgerLimit" type="number" min="1" max="500" class="input" placeholder="条数" />
              <button class="btn justify-center" @click="loadEconomyEvents">查询</button>
            </div>
            <div v-if="economyEvents.length === 0" class="text-xs text-muted">暂无流水。</div>
            <div v-for="ev in economyEvents" :key="ev.id" class="border border-accent/10 rounded-xs p-2 text-xs space-y-1">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div><span class="text-accent">{{ ev.username }}</span><span class="text-muted ml-1">/ {{ ev.player_name || '无角色' }}</span></div>
                <div class="text-muted">{{ formatTime(ev.created_at) }}</div>
              </div>
              <div class="flex flex-wrap gap-x-3 gap-y-1">
                <span>类型：{{ eventTypeLabel(ev.event_type) }}</span>
                <span>金额：<b :class="Number(ev.amount) >= 0 ? 'text-accent' : 'text-danger'">{{ ev.amount }}</b></span>
                <span v-if="ev.item_id">物品：{{ ev.item_id }} ×{{ ev.quantity }} {{ ev.quality || '' }}</span>
                <span v-if="ev.source">来源：{{ ev.source }}</span>
                <span class="text-muted">IP：{{ ev.ip || '-' }}</span>
              </div>
              <pre v-if="ev.detail" class="text-[10px] text-muted whitespace-pre-wrap break-all bg-black/20 p-2 rounded-xs">{{ JSON.stringify(ev.detail, null, 2) }}</pre>
            </div>
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

            <template v-if="activeTab === 'feedbacks'">
              <h2 class="text-accent">玩家反馈</h2>
              <div class="flex gap-2 mt-3 mb-3 flex-wrap">
                <button v-for="cat in feedbackCategoryOptions" :key="cat.value" class="btn text-xs" :class="feedbackFilterCat===cat.value?'!bg-accent !text-bg':''" @click="feedbackFilterCat=cat.value;loadFeedbacks()">{{cat.label}}</button>
                <button v-for="st in feedbackStatusOptions" :key="st.value" class="btn text-xs" :class="feedbackFilterStatus===st.value?'!bg-accent !text-bg':''" @click="feedbackFilterStatus=st.value;loadFeedbacks()">{{st.label}}</button>
              </div>
              <div v-if="feedbacks.length===0" class="text-xs text-muted py-4 text-center">暂无反馈。</div>
              <div v-for="fb in feedbacks" :key="fb.id" class="border border-accent/15 rounded-xs p-3 mb-2">
                <div class="flex items-center justify-between mb-1">
                  <div>
                    <span class="text-xs font-bold" :class="{'text-blue-400':fb.category==='feature','text-danger':fb.category==='bug','text-yellow-400':fb.category==='suggestion'}">{{fb.category==='feature'?'功能反馈':fb.category==='bug'?'BUG反馈':'意见提交'}}</span>
                    <span class="text-xs text-accent ml-2">{{fb.title}}</span>
                  </div>
                  <select v-model="fb.status_tmp" class="bg-bg border border-accent/30 rounded-xs text-xs px-1 py-0.5" @change="updateFeedbackStatus(fb)">
                    <option value="pending">待处理</option>
                    <option value="read">已读</option>
                    <option value="resolved">已解决</option>
                    <option value="closed">已关闭</option>
                  </select>
                </div>
                <p class="text-xs text-muted whitespace-pre-wrap">{{fb.content}}</p>
                <div class="flex items-center gap-2 mt-1 text-[10px] text-muted/60">
                  <span>{{fb.username||'游客'}}</span>
                  <span v-if="fb.player_name"> · {{fb.player_name}}</span>
                  <span> · {{new Date(fb.created_at).toLocaleString()}}</span>
                </div>
              </div>
            </template>
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
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              <div>
                <label class="block text-sm">铜钱</label>
                <input v-model.number="gmMail.rewards.money" class="input" type="number" min="0" placeholder="0" />
              </div>
              <div>
                <label class="block text-sm">体力</label>
                <input v-model.number="gmMail.rewards.stamina" class="input" type="number" min="0" placeholder="0" />
              </div>
              <div>
                <label class="block text-sm">修为</label>
                <input v-model.number="gmMail.rewards.cultivation" class="input" type="number" min="0" placeholder="0" />
              </div>
              <div>
                <label class="block text-sm">灵气</label>
                <input v-model.number="gmMail.rewards.aura" class="input" type="number" min="0" placeholder="0" />
              </div>
              <div>
                <label class="block text-sm">灵力</label>
                <input v-model.number="gmMail.rewards.mana" class="input" type="number" min="0" placeholder="0" />
              </div>
              <div>
                <label class="block text-sm">灵石</label>
                <input v-model.number="gmMail.rewards.spiritStone" class="input" type="number" min="0" placeholder="0" />
              </div>
            </div>
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <label class="block text-sm">物品奖励</label>
                <span class="text-xs text-muted">物品 ID 可填 seed_spirit_rice、mana_recovery_pill 等</span>
              </div>
              <div v-for="(item, idx) in gmMail.rewards.items" :key="idx" class="grid grid-cols-1 md:grid-cols-12 gap-2">
                <select v-model="item.itemId" class="input md:col-span-5">
                  <option value="">请选择物品</option>
                  <optgroup v-for="cat in categories" :key="cat" :label="cat">
                  <option v-for="mi in ALL_ITEMS.filter(i => i.category === cat)" :key="mi.id" :value="mi.id">{{ mi.name }}</option>
                </optgroup>
                </select>
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
const activeTab = ref<'basic' | 'about' | 'updates' | 'players' | 'saveAudit' | 'ledger' | 'gm' | 'feedbacks'>('basic')
const adminTabs = [
  { key: 'basic', label: '基础配置' },
  { key: 'about', label: '关于/赞助' },
  { key: 'updates', label: '更新记录' },
  { key: 'players', label: '玩家管理' },
  { key: 'saveAudit', label: '存档审计' },
  { key: 'ledger', label: '经济流水' },
  { key: 'gm', label: 'GM邮件' },
  { key: 'feedbacks', label: '玩家反馈' }
] as const
const message = ref('')
const messageType = ref<'ok' | 'error'>('ok')
const config = reactive<any>({ siteName: '桃源乡', announcement: '', announcementIntervalHours: 24, updateLogs: [], aboutQqText: '', aboutQqUrl: '', aboutGithubUrl: '', aboutTapTapUrl: '', sponsorAlipayImageUrl: '', sponsorWechatImageUrl: '', sponsorAfdianUrl: '', registrationEnabled: true, maintenanceMode: false })
const overview = reactive<any>({ stats: { userCount: 0, saveCount: 0, sessionCount: 0 }, users: [] })
const economyEvents = ref<any[]>([])
const ledgerKeyword = ref('')
const ledgerType = ref('')
const ledgerLimit = ref(100)
const saveAuditEvents = ref<any[]>([])
const saveAuditKeyword = ref('')
const saveAuditType = ref('')
const saveAuditStatus = ref('')
const saveAuditLimit = ref(100)
const feedbacks = ref<any[]>([])
const feedbackFilterCat = ref('')
const feedbackFilterStatus = ref('')
const feedbackCategoryOptions = [
  { value: '', label: '全部' },
  { value: 'feature', label: '功能反馈' },
  { value: 'bug', label: 'BUG反馈' },
  { value: 'suggestion', label: '意见提交' }
]
const feedbackStatusOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待处理' },
  { value: 'read', label: '已读' },
  { value: 'resolved', label: '已解决' },
  { value: 'closed', label: '已关闭' }
]
const ALL_ITEMS = [
  { id: 'mana_recovery_pill', name: '回灵丹', category: '丹药' },
  { id: 'qi_gathering_pill', name: '聚气丹', category: '丹药' },
  { id: 'foundation_pill', name: '筑基丹', category: '丹药' },
  { id: 'dew_grass', name: '凝露草', category: '灵植' },
  { id: 'spirit_rice', name: '蕴灵稻', category: '灵植' },
  { id: 'vermilion_fruit', name: '朱果', category: '灵植' },
  { id: 'moonlight_rice', name: '月光稻', category: '灵植' },
  { id: 'phoenix_pepper', name: '凤椒', category: '灵植' },
  { id: 'snow_lotus', name: '雪莲', category: '灵植' },
  { id: 'fairy_chrysanthemum', name: '仙菊', category: '灵植' },
  { id: 'golden_melon', name: '金瓜', category: '灵植' },
  { id: 'jade_tea', name: '玉茶', category: '灵植' },
  { id: 'pearl_grain', name: '珍珠米', category: '灵植' },
  { id: 'lotus_tea', name: '莲茶', category: '灵植' },
  { id: 'purple_bamboo', name: '紫竹', category: '灵植' },
  { id: 'golden_fruit', name: '金果', category: '灵植' },
  { id: 'celestial_rice', name: '天稻', category: '灵植' },
  { id: 'saint_rice', name: '圣稻', category: '灵植' },
  { id: 'dragon_melon', name: '龙瓜', category: '灵植' },
  { id: 'primordial_melon', name: '混沌瓜', category: '灵植' },
  { id: 'seed_dew_grass', name: '凝露草种子', category: '种子' },
  { id: 'seed_spirit_rice', name: '蕴灵稻种子', category: '种子' },
  { id: 'seed_vermilion_fruit', name: '朱果种子', category: '种子' },
  { id: 'seed_moonlight_rice', name: '月光稻种子', category: '种子' },
  { id: 'seed_phoenix_pepper', name: '凤椒种子', category: '种子' },
  { id: 'seed_snow_lotus', name: '雪莲种子', category: '种子' },
  { id: 'seed_fairy_chrysanthemum', name: '仙菊种子', category: '种子' },
  { id: 'seed_golden_melon', name: '金瓜种子', category: '种子' },
  { id: 'seed_jade_tea', name: '玉茶种子', category: '种子' },
  { id: 'seed_pearl_grain', name: '珍珠米种子', category: '种子' },
  { id: 'seed_lotus_tea', name: '莲茶种子', category: '种子' },
  { id: 'seed_purple_bamboo', name: '紫竹种子', category: '种子' },
  { id: 'seed_golden_fruit', name: '金果种子', category: '种子' },
  { id: 'seed_celestial_rice', name: '天稻种子', category: '种子' },
  { id: 'seed_saint_rice', name: '圣稻种子', category: '种子' },
  { id: 'seed_dragon_melon', name: '龙瓜种子', category: '种子' },
  { id: 'seed_primordial_melon', name: '混沌瓜种子', category: '种子' },
  { id: 'vegetable_seed', name: '青菜种子', category: '种子' },
  { id: 'carrot_seed', name: '胡萝卜种子', category: '种子' },
  { id: 'turnip_seed', name: '芜菁种子', category: '种子' },
  { id: 'cabbage_seed', name: '卷心菜种子', category: '种子' },
  { id: 'tomato_seed', name: '番茄种子', category: '种子' },
  { id: 'potato_seed', name: '土豆种子', category: '种子' },
  { id: 'sunflower_seed', name: '向日葵种子', category: '种子' },
  { id: 'cotton_seed', name: '棉花种子', category: '种子' },
  { id: 'flax_seed', name: '亚麻种子', category: '种子' },
  { id: 'hemp_seed', name: '大麻种子', category: '种子' },
  { id: 'tea_seed', name: '茶叶种子', category: '种子' },
  { id: 'iron_ore', name: '铁矿', category: '矿石' },
  { id: 'gold_ore', name: '金矿', category: '矿石' },
  { id: 'silver_ore', name: '银矿', category: '矿石' },
  { id: 'copper_ore', name: '铜矿', category: '矿石' },
  { id: 'stone', name: '石头', category: '矿石' },
  { id: 'wood', name: '木头', category: '材料' },
  { id: 'leather', name: '皮革', category: '材料' },
  { id: 'cloth', name: '布料', category: '材料' },
  { id: 'magic_crystal', name: '魔法水晶', category: '材料' },
  { id: 'spirit_stone', name: '灵石', category: '材料' },
  { id: 'bamboo', name: '竹子', category: '材料' },
  { id: 'flower', name: '花', category: '材料' },
  { id: 'tree_seeds', name: '树苗', category: '材料' },
  { id: 'mushroom', name: '蘑菇', category: '材料' },
  { id: 'axe', name: '斧头', category: '工具' },
  { id: 'pickaxe', name: '镐', category: '工具' },
  { id: 'hoe', name: '锄头', category: '工具' },
  { id: 'watering_can', name: '水壶', category: '工具' },
  { id: 'fishing_rod', name: '钓竿', category: '工具' },
  { id: 'basket', name: '篮子', category: '工具' },
  { id: 'fertilizer', name: '肥料', category: '工具' },
  { id: 'pesticide', name: '杀虫剂', category: '工具' },
  { id: 'sprinkler', name: '洒水器', category: '工具' },
  { id: 'scarecrow', name: '稻草人', category: '工具' },
  { id: 'vegetable', name: '青菜', category: '食材' },
  { id: 'carrot', name: '胡萝卜', category: '食材' },
  { id: 'turnip', name: '芜菁', category: '食材' },
  { id: 'cabbage', name: '卷心菜', category: '食材' },
  { id: 'tomato', name: '番茄', category: '食材' },
  { id: 'potato', name: '土豆', category: '食材' },
  { id: 'sunflower', name: '向日葵', category: '食材' },
  { id: 'cotton', name: '棉花', category: '食材' },
  { id: 'flax', name: '亚麻', category: '食材' },
  { id: 'hemp', name: '大麻', category: '食材' },
  { id: 'tea_leaf', name: '茶叶', category: '食材' },
  { id: 'milk', name: '牛奶', category: '食材' },
  { id: 'egg', name: '蛋', category: '食材' },
  { id: 'honey', name: '蜂蜜', category: '食材' },
  { id: 'meat', name: '肉', category: '食材' },
  { id: 'bread', name: '面包', category: '食材' },
  { id: 'cheese', name: '奶酪', category: '食材' },
  { id: 'wine', name: '葡萄酒', category: '食材' },
  { id: 'beer', name: '啤酒', category: '食材' },
  { id: 'honey_cake', name: '蜂蜜蛋糕', category: '食材' },
  { id: 'flour', name: '面粉', category: '食材' },
  { id: 'sugar', name: '糖', category: '食材' },
  { id: 'salt', name: '盐', category: '食材' },
  { id: 'oil', name: '油', category: '食材' },
  { id: 'vinegar', name: '醋', category: '食材' },
  { id: 'soy_sauce', name: '酱油', category: '食材' },
  { id: 'spice', name: '香料', category: '食材' },
  { id: 'rare_fish', name: '稀有鱼类', category: '食材' },
  { id: 'common_fish', name: '普通鱼类', category: '食材' },
  { id: 'jade', name: '翡翠', category: '宝石' },
  { id: 'amber', name: '琥珀', category: '宝石' },
  { id: 'pearl', name: '珍珠', category: '宝石' },
  { id: 'diamond', name: '钻石', category: '宝石' },
  { id: 'ruby', name: '红宝石', category: '宝石' },
  { id: 'sapphire', name: '蓝宝石', category: '宝石' },
  { id: 'emerald', name: '绿宝石', category: '宝石' },
  { id: 'topaz', name: '黄玉', category: '宝石' },
  { id: 'opal', name: '蛋白石', category: '宝石' },
  { id: 'onyx', name: '玛瑙', category: '宝石' },
  { id: 'tiger_eye', name: '虎眼石', category: '宝石' },
  { id: 'obsidian', name: '黑曜石', category: '宝石' },
  { id: 'quartz', name: '石英', category: '宝石' },
  { id: 'turquoise', name: '绿松石', category: '宝石' },
  { id: 'garnet', name: '石榴石', category: '宝石' },
  { id: 'amethyst', name: '紫水晶', category: '宝石' },
  { id: 'citrine', name: '黄水晶', category: '宝石' },
  { id: 'aquamarine', name: '海蓝宝石', category: '宝石' },
  { id: 'moonstone', name: '月光石', category: '宝石' },
  { id: 'bloodstone', name: '血石', category: '宝石' },
  { id: 'legendary_gem', name: '传奇宝石', category: '宝石' },
  { id: 'rare_gem', name: '稀有宝石', category: '宝石' },
  { id: 'common_gem', name: '普通宝石', category: '宝石' },
  { id: 'potion', name: '药水', category: '道具' },
  { id: 'elixir', name: '仙丹', category: '道具' },
  { id: 'scroll', name: '卷轴', category: '道具' },
  { id: 'treasure_map', name: '藏宝图', category: '道具' },
  { id: 'ancient_relic', name: '古代遗物', category: '道具' },
  { id: 'chest', name: '箱子', category: '家具' },
  { id: 'bed', name: '床', category: '家具' },
  { id: 'table', name: '桌子', category: '家具' },
  { id: 'chair', name: '椅子', category: '家具' },
  { id: 'lantern', name: '灯笼', category: '家具' },
  { id: 'torch', name: '火把', category: '家具' },
  { id: 'trap', name: '陷阱', category: '家具' },
  { id: 'fence', name: '栅栏', category: '家具' },
  { id: 'well', name: '水井', category: '家具' },
  { id: 'mill', name: '磨坊', category: '家具' },
  { id: 'furnace', name: '熔炉', category: '家具' },
  { id: 'anvil', name: '铁砧', category: '家具' },
  { id: 'loom', name: '织布机', category: '家具' },
  { id: 'kiln', name: '窑', category: '家具' },
  { id: 'workbench', name: '工作台', category: '家具' },
  { id: 'bookshelf', name: '书架', category: '家具' },
  { id: 'spirit_oil', name: '灵油', category: '特殊' },
  { id: 'ink', name: '墨', category: '特殊' },
  { id: 'paper', name: '纸', category: '特殊' }
]
const categories = computed(() => {
  
  return ['丹药', '灵植', '种子', '矿石', '材料', '工具', '食材', '宝石', '道具', '家具', '特殊']
})
const gmMail = reactive<any>({
  to: 'all',
  title: '系统奖励',
  content: '',
  rewards: { money: 0, stamina: 0, cultivation: 0, aura: 0, mana: 0, spiritStone: 0, items: [] }
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
async function loadEconomyEvents() {
  if (user.value?.role !== 'admin') return
  const q = new URLSearchParams()
  if (ledgerKeyword.value.trim()) q.set('keyword', ledgerKeyword.value.trim())
  if (ledgerType.value) q.set('type', ledgerType.value)
  q.set('limit', String(ledgerLimit.value || 100))
  const data = await api(`/api/admin/economy-events?${q.toString()}`, { headers: headers() })
  economyEvents.value = data.events || []
}
async function loadFeedbacks() {
  if (user.value?.role !== 'admin') return
  try {
    const q = new URLSearchParams()
    if (feedbackFilterCat.value) q.set('category', feedbackFilterCat.value)
    if (feedbackFilterStatus.value) q.set('status', feedbackFilterStatus.value)
    const data = await api(`/api/admin/feedbacks?${q.toString()}`, { headers: headers() })
    feedbacks.value = (data.feedbacks||[]).map((f: any) => ({ ...f, status_tmp: f.status }))
  } catch {}
}
async function updateFeedbackStatus(fb: any) {
  try { await api(`/api/admin/feedbacks/${fb.id}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status: fb.status_tmp }) }) } catch { fb.status_tmp = fb.status }
}
async function loadSaveAuditEvents() {
  if (user.value?.role !== 'admin') return
  const q = new URLSearchParams()
  if (saveAuditKeyword.value.trim()) q.set('keyword', saveAuditKeyword.value.trim())
  if (saveAuditType.value) q.set('type', saveAuditType.value)
  if (saveAuditStatus.value) q.set('status', saveAuditStatus.value)
  q.set('limit', String(saveAuditLimit.value || 100))
  const data = await api(`/api/admin/save-audit-events?${q.toString()}`, { headers: headers() })
  saveAuditEvents.value = data.events || []
}
async function refreshAll() { try { await loadMe(); await loadConfig(); await loadOverview(); await loadEconomyEvents(); await loadSaveAuditEvents(); setMsg('后台数据已刷新') } catch (e: any) { setMsg(e.message, 'error') } }
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
    gmMail.rewards.cultivation = 0
    gmMail.rewards.aura = 0
    gmMail.rewards.mana = 0
    gmMail.rewards.spiritStone = 0
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
function eventTypeLabel(t: string) {
  const labels: Record<string, string> = { sell_item: '单个出售', sell_item_all: '批量出售', sell_all: '一键出售', mail_claim: '邮件领取', checkin: '每日签到' }
  return labels[t] || t
}
function saveAuditTypeLabel(t: string) {
  const labels: Record<string, string> = { save_load: '读取云档', save_write: '写入云档', save_conflict: '冲突拒绝', save_delete: '删除存档', character_create_save: '创建初始档' }
  return labels[t] || t
}
function saveAuditStatusLabel(t: string) {
  const labels: Record<string, string> = { ok: '正常', conflict: '冲突' }
  return labels[t] || t
}
onMounted(async () => { try { await loadMe(); await loadConfig(); await loadOverview(); await loadEconomyEvents(); await loadSaveAuditEvents() } catch {} })
</script>
