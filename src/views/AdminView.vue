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
              <input v-model="itemSearch" class="input" placeholder="🔍 搜索物品名称..." />
              <div v-for="(item, idx) in gmMail.rewards.items" :key="idx" class="grid grid-cols-1 md:grid-cols-12 gap-2">
                <div class="md:col-span-5 relative">
                  <input v-model="item.itemId" class="input" placeholder="物品ID，如 mana_recovery_pill" @focus="showItemDropdown = true" @blur="hideDropdown" />
                  <div v-if="showItemDropdown && filteredItems.length > 0" class="absolute z-50 w-full bg-dark border border-accent/20 rounded-xs max-h-40 overflow-y-auto mt-1">
                    <div v-for="mi in filteredItems" :key="mi.id" class="px-2 py-1.5 text-xs cursor-pointer hover:bg-accent/10 flex justify-between" @click="selectItem(mi)">
                      <span>{{ mi.name }}</span>
                      <span class="text-muted">{{ mi.id }}</span>
                    </div>
                  </div>
                </div>
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
const itemSearch = ref('')
const showItemDropdown = ref(false)
const ALL_ITEMS = [
  { id: 'mana_recovery_pill', name: '回灵丹' },
  { id: 'qi_gathering_pill', name: '聚气丹' },
  { id: 'foundation_pill', name: '筑基丹' },
  { id: 'seed_spirit_rice', name: '蕴灵稻种子' },
  { id: 'seed_dew_grass', name: '凝露草种子' },
  { id: 'seed_vermilion_fruit', name: '朱果种子' },
  { id: 'seed_moonlight_rice', name: '月光稻种子' },
  { id: 'seed_phoenix_pepper', name: '凤椒种子' },
  { id: 'seed_snow_lotus', name: '雪莲种子' },
  { id: 'seed_fairy_chrysanthemum', name: '仙菊种子' },
  { id: 'seed_golden_melon', name: '金瓜种子' },
  { id: 'seed_jade_tea', name: '玉茶种子' },
  { id: 'seed_pearl_grain', name: '珍珠米种子' },
  { id: 'seed_lotus_tea', name: '莲茶种子' },
  { id: 'seed_purple_bamboo', name: '紫竹种子' },
  { id: 'seed_golden_fruit', name: '金果种子' },
  { id: 'seed_celestial_rice', name: '天稻种子' },
  { id: 'seed_saint_rice', name: '圣稻种子' },
  { id: 'seed_dragon_melon', name: '龙瓜种子' },
  { id: 'seed_primordial_melon', name: '混沌瓜种子' },
  { id: 'vegetable_seed', name: '青菜种子' },
  { id: 'carrot_seed', name: '胡萝卜种子' },
  { id: 'turnip_seed', name: '芜菁种子' },
  { id: 'cabbage_seed', name: '卷心菜种子' },
  { id: 'tomato_seed', name: '番茄种子' },
  { id: 'potato_seed', name: '土豆种子' },
  { id: 'sunflower_seed', name: '向日葵种子' },
  { id: 'cotton_seed', name: '棉花种子' },
  { id: 'flax_seed', name: '亚麻种子' },
  { id: 'hemp_seed', name: '大麻种子' },
  { id: 'tea_seed', name: '茶叶种子' },
  { id: 'herb_basic', name: '基础草药' },
  { id: 'herb_common', name: '常见草药' },
  { id: 'herb_rare', name: '稀有草药' },
  { id: 'herb_epic', name: '史诗草药' },
  { id: 'herb_legendary', name: '传说草药' },
  { id: 'dew_grass', name: '凝露草' },
  { id: 'spirit_rice', name: '蕴灵稻' },
  { id: 'vermilion_fruit', name: '朱果' },
  { id: 'moonlight_rice', name: '月光稻' },
  { id: 'phoenix_pepper', name: '凤椒' },
  { id: 'snow_lotus', name: '雪莲' },
  { id: 'fairy_chrysanthemum', name: '仙菊' },
  { id: 'golden_melon', name: '金瓜' },
  { id: 'jade_tea', name: '玉茶' },
  { id: 'pearl_grain', name: '珍珠米' },
  { id: 'lotus_tea', name: '莲茶' },
  { id: 'purple_bamboo', name: '紫竹' },
  { id: 'golden_fruit', name: '金果' },
  { id: 'celestial_rice', name: '天稻' },
  { id: 'saint_rice', name: '圣稻' },
  { id: 'dragon_melon', name: '龙瓜' },
  { id: 'primordial_melon', name: '混沌瓜' },
  { id: 'vegetable', name: '青菜' },
  { id: 'carrot', name: '胡萝卜' },
  { id: 'turnip', name: '芜菁' },
  { id: 'cabbage', name: '卷心菜' },
  { id: 'tomato', name: '番茄' },
  { id: 'potato', name: '土豆' },
  { id: 'sunflower', name: '向日葵' },
  { id: 'cotton', name: '棉花' },
  { id: 'flax', name: '亚麻' },
  { id: 'hemp', name: '大麻' },
  { id: 'tea_leaf', name: '茶叶' },
  { id: 'iron_ore', name: '铁矿' },
  { id: 'gold_ore', name: '金矿' },
  { id: 'silver_ore', name: '银矿' },
  { id: 'copper_ore', name: '铜矿' },
  { id: 'stone', name: '石头' },
  { id: 'wood', name: '木头' },
  { id: 'leather', name: '皮革' },
  { id: 'cloth', name: '布料' },
  { id: 'magic_crystal', name: '魔法水晶' },
  { id: 'spirit_stone', name: '灵石' },
  { id: 'rare_fish', name: '稀有鱼类' },
  { id: 'common_fish', name: '普通鱼类' },
  { id: 'mushroom', name: '蘑菇' },
  { id: 'honey', name: '蜂蜜' },
  { id: 'egg', name: '蛋' },
  { id: 'milk', name: '牛奶' },
  { id: 'meat', name: '肉' },
  { id: 'bread', name: '面包' },
  { id: 'cheese', name: '奶酪' },
  { id: 'wine', name: '葡萄酒' },
  { id: 'beer', name: '啤酒' },
  { id: 'honey_cake', name: '蜂蜜蛋糕' },
  { id: 'spirit_oil', name: '灵油' },
  { id: 'ink', name: '墨' },
  { id: 'paper', name: '纸' },
  { id: 'bamboo', name: '竹子' },
  { id: 'flower', name: '花' },
  { id: 'tree_seeds', name: '树苗' },
  { id: 'herb_basic', name: '基础草药' },
  { id: 'herb_common', name: '常见草药' },
  { id: 'herb_rare', name: '稀有草药' },
  { id: 'herb_epic', name: '史诗草药' },
  { id: 'herb_legendary', name: '传说草药' },
  { id: 'fertilizer', name: '肥料' },
  { id: 'pesticide', name: '杀虫剂' },
  { id: 'sprinkler', name: '洒水器' },
  { id: 'scarecrow', name: '稻草人' },
  { id: 'fishing_rod', name: '钓竿' },
  { id: 'axe', name: '斧头' },
  { id: 'pickaxe', name: '镐' },
  { id: 'hoe', name: '锄头' },
  { id: 'watering_can', name: '水壶' },
  { id: 'basket', name: '篮子' },
  { id: 'chest', name: '箱子' },
  { id: 'bed', name: '床' },
  { id: 'table', name: '桌子' },
  { id: 'chair', name: '椅子' },
  { id: 'lantern', name: '灯笼' },
  { id: 'torch', name: '火把' },
  { id: 'trap', name: '陷阱' },
  { id: 'fence', name: '栅栏' },
  { id: 'well', name: '水井' },
  { id: 'mill', name: '磨坊' },
  { id: 'furnace', name: '熔炉' },
  { id: 'anvil', name: '铁砧' },
  { id: 'loom', name: '织布机' },
  { id: 'kiln', name: '窑' },
  { id: 'workbench', name: '工作台' },
  { id: 'bookshelf', name: '书架' },
  { id: 'scroll', name: '卷轴' },
  { id: 'potion', name: '药水' },
  { id: 'elixir', name: '仙丹' },
  { id: 'treasure_map', name: '藏宝图' },
  { id: 'ancient_relic', name: '古代遗物' },
  { id: 'dragon_scale', name: '龙鳞' },
  { id: 'phoenix_feather', name: '凤凰羽毛' },
  { id: 'unicorn_horn', name: '独角兽角' },
  { id: 'griffin_claw', name: '狮鹫爪' },
  { id: 'serpent_fang', name: '蛇牙' },
  { id: 'demon_blood', name: '恶魔之血' },
  { id: 'angel_dust', name: '天使之尘' },
  { id: 'star_fragment', name: '星辰碎片' },
  { id: 'moon_stone', name: '月亮石' },
  { id: 'sun_stone', name: '太阳石' },
  { id: 'earth_stone', name: '大地石' },
  { id: 'wind_stone', name: '风之石' },
  { id: 'fire_stone', name: '火焰石' },
  { id: 'water_stone', name: '水之石' },
  { id: 'void_stone', name: '虚空石' },
  { id: 'legendary_gem', name: '传奇宝石' },
  { id: 'rare_gem', name: '稀有宝石' },
  { id: 'common_gem', name: '普通宝石' },
  { id: 'jade', name: '翡翠' },
  { id: 'amber', name: '琥珀' },
  { id: 'pearl', name: '珍珠' },
  { id: 'diamond', name: '钻石' },
  { id: 'ruby', name: '红宝石' },
  { id: 'sapphire', name: '蓝宝石' },
  { id: 'emerald', name: '绿宝石' },
  { id: 'topaz', name: '黄玉' },
  { id: 'opal', name: '蛋白石' },
  { id: 'onyx', name: '玛瑙' },
  { id: 'tiger_eye', name: '虎眼石' },
  { id: 'obsidian', name: '黑曜石' },
  { id: 'quartz', name: '石英' },
  { id: 'turquoise', name: '绿松石' },
  { id: 'garnet', name: '石榴石' },
  { id: 'amethyst', name: '紫水晶' },
  { id: 'citrine', name: '黄水晶' },
  { id: 'aquamarine', name: '海蓝宝石' },
  { id: 'moonstone', name: '月光石' },
  { id: 'bloodstone', name: '血石' },
  { id: 'flour', name: '面粉' },
  { id: 'sugar', name: '糖' },
  { id: 'salt', name: '盐' },
  { id: 'oil', name: '油' },
  { id: 'vinegar', name: '醋' },
  { id: 'soy_sauce', name: '酱油' },
  { id: 'spice', name: '香料' },
  { id: 'herb_basic', name: '基础草药' },
  { id: 'herb_common', name: '常见草药' },
  { id: 'herb_rare', name: '稀有草药' },
  { id: 'herb_epic', name: '史诗草药' },
  { id: 'herb_legendary', name: '传说草药' }
]
const filteredItems = computed(() => {
  const q = itemSearch.value.toLowerCase().trim()
  if (!q) return ALL_ITEMS
  return ALL_ITEMS.filter(i => i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q))
})
const hideDropdown = () => { showItemDropdown.value = false }
const selectItem = (item: any) => {
  const rewardItem = gmMail.rewards.items[gmMail.rewards.items.length - 1]
  if (rewardItem) {
    rewardItem.itemId = item.id
  }
  showItemDropdown.value = false
  itemSearch.value = ''
}
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
