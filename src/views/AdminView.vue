<template>
  <div class="min-h-screen px-4 py-8 flex justify-center">
    <div class="game-panel w-full max-w-4xl space-y-4">
      <div class="flex items-center justify-between gap-3">
        <h1 class="text-accent text-xl">后台管理</h1>
        <button class="btn" @click="router.push('/')">返回首页</button>
      </div>
      <p class="text-xs text-muted">
        万象仙乡后台。已支持玩家总览、封号/解封、重置密码。
      </p>

      <div
        v-if="!user"
        class="border border-accent/20 rounded-xs p-4 space-y-3"
      >
        <p class="text-sm text-muted">
          请先用管理员账号登录。第一个注册的账号会自动成为管理员。
        </p>
        <input v-model="username" class="input" placeholder="用户名" />
        <input
          v-model="password"
          class="input"
          placeholder="密码"
          type="password"
        />
        <div class="flex gap-2">
          <button class="btn flex-1 justify-center" @click="login">登录</button>
          <button class="btn flex-1 justify-center" @click="register">
            注册
          </button>
        </div>
      </div>

      <template v-else>
        <div
          class="border border-accent/20 rounded-xs p-3 text-sm flex flex-wrap justify-between gap-2"
        >
          <span
            >当前账号：<span class="text-accent">{{ user.username }}</span> /
            {{ user.role }}</span
          >
          <button class="btn text-xs" @click="refreshAll">刷新后台数据</button>
        </div>
        <div v-if="user.role !== 'admin'" class="text-danger text-sm">
          当前账号不是管理员，不能修改后台配置。
        </div>
        <template v-else>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="border border-accent/20 rounded-xs p-3">
              <div class="text-muted text-xs">用户数</div>
              <div class="text-accent text-2xl">
                {{ overview.stats.userCount }}
              </div>
            </div>
            <div class="border border-accent/20 rounded-xs p-3">
              <div class="text-muted text-xs">云存档数</div>
              <div class="text-accent text-2xl">
                {{ overview.stats.saveCount }}
              </div>
            </div>
            <div class="border border-accent/20 rounded-xs p-3">
              <div class="text-muted text-xs">登录会话数</div>
              <div class="text-accent text-2xl">
                {{ overview.stats.sessionCount }}
              </div>
            </div>
          </div>

          <div
            class="border border-accent/20 rounded-xs p-2 flex flex-wrap gap-2"
          >
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

          <div
            v-if="activeTab === 'basic'"
            class="border border-accent/20 rounded-xs p-3 space-y-3"
          >
            <h2 class="text-accent">基础配置</h2>
            <label class="block text-sm">站点名称</label>
            <input v-model="config.siteName" class="input" />
            <label class="block text-sm">首页公告</label>
            <textarea v-model="config.announcement" class="input min-h-28" />
            <label class="block text-sm"
              >公告自动弹出间隔（小时，0=每次打开都显示）</label
            >
            <input
              v-model.number="config.announcementIntervalHours"
              class="input"
              type="number"
              min="0"
              max="720"
            />
            <label class="flex items-center gap-2 text-sm"
              ><input v-model="config.registrationEnabled" type="checkbox" />
              开放注册</label
            >
            <label class="flex items-center gap-2 text-sm"
              ><input v-model="config.maintenanceMode" type="checkbox" />
              维护模式提示</label
            >
            <div class="border border-accent/10 rounded-xs p-3 space-y-2">
              <div class="text-sm text-accent">首页加群入口</div>
              <label class="flex items-center gap-2 text-sm">
                <input v-model="config.groupEntry.enabled" type="checkbox" />
                在新手教程下方显示加群按钮
              </label>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <label class="text-sm space-y-1">
                  <span>按钮文字</span>
                  <input
                    v-model="config.groupEntry.buttonText"
                    class="input"
                    maxlength="12"
                    placeholder="点我加群"
                  />
                </label>
                <label class="text-sm space-y-1 md:col-span-2">
                  <span>加群链接</span>
                  <input
                    v-model="config.groupEntry.url"
                    class="input"
                    maxlength="1000"
                    placeholder="https://qm.qq.com/..."
                  />
                </label>
              </div>
            </div>
            <button class="btn w-full justify-center" @click="saveConfig">
              保存基础配置
            </button>
          </div>

          <div
            v-if="activeTab === 'announcements'"
            class="border border-accent/20 rounded-xs p-3 space-y-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 class="text-accent">全服滚动公告</h2>
                <p class="text-xs text-muted mt-1">
                  发布后会进入全服公告队列，在线玩家会在游戏顶部看到滚动通知。内容会自动加上“📢
                  全服公告：”前缀。
                </p>
              </div>
              <button class="btn text-xs" @click="loadWorldAnnouncements">
                刷新公告
              </button>
            </div>
            <textarea
              v-model="newWorldAnnouncement"
              class="input min-h-24"
              maxlength="500"
              placeholder="请输入要滚动展示给全服玩家的公告内容，最多500字"
            />
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <label class="text-sm space-y-1">
                <span>重复滚动间隔（分钟）</span>
                <input
                  v-model.number="newWorldAnnouncementRepeatMinutes"
                  class="input"
                  type="number"
                  min="0"
                  max="10080"
                  placeholder="0=只展示一次，如60=每小时重复"
                />
              </label>
              <div class="text-xs text-muted flex items-end">
                填 0 只展示一次；填 10~10080
                分钟会让在线玩家按间隔重复看到同一条公告。
              </div>
            </div>
            <div
              class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted"
            >
              <span>{{ newWorldAnnouncement.length }}/500</span>
              <button
                class="btn justify-center"
                @click="publishWorldAnnouncement"
              >
                发布全服公告
              </button>
            </div>
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-sm text-accent">最近公告</h3>
                <span class="text-xs text-muted"
                  >保留最近50条，玩家侧读取最近10条。</span
                >
              </div>
              <div
                v-if="worldAnnouncements.length === 0"
                class="text-xs text-muted"
              >
                暂无公告。
              </div>
              <div
                v-for="ann in worldAnnouncements"
                :key="ann.id"
                class="border border-accent/10 rounded-xs p-2 space-y-1"
              >
                <div
                  class="flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <span class="text-muted"
                    >{{ formatTime(ann.time) }} / {{ ann.type || "admin" }} /
                    {{
                      ann.repeatIntervalMinutes
                        ? `每${ann.repeatIntervalMinutes}分钟重复`
                        : "只展示一次"
                    }}</span
                  >
                  <button
                    class="btn text-xs text-danger"
                    @click="deleteWorldAnnouncement(ann)"
                  >
                    删除
                  </button>
                </div>
                <p class="text-sm whitespace-pre-wrap">{{ ann.message }}</p>
              </div>
            </div>
          </div>

          <div
            v-if="activeTab === 'welfare'"
            class="border border-accent/20 rounded-xs p-3 space-y-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 class="text-accent">悬浮福利活动</h2>
                <p class="text-xs text-muted mt-1">
                  玩家游戏内会看到一个悬浮按钮，点开后可领取这里配置的新手福利、每日福利、七日福利或自定义礼包。
                </p>
              </div>
              <button class="btn text-xs" @click="addFloatingGift">
                新增礼包
              </button>
            </div>
            <label class="flex items-center gap-2 text-sm"
              ><input
                v-model="config.floatingWelfare.enabled"
                type="checkbox"
              />
              开启悬浮福利按钮</label
            >
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label class="block text-sm">按钮文字</label>
                <input
                  v-model="config.floatingWelfare.buttonText"
                  class="input"
                  maxlength="12"
                  placeholder="福利"
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm">弹窗标题</label>
                <input
                  v-model="config.floatingWelfare.title"
                  class="input"
                  maxlength="30"
                  placeholder="仙乡福缘"
                />
              </div>
            </div>
            <label class="block text-sm">弹窗说明</label>
            <textarea
              v-model="config.floatingWelfare.desc"
              class="input min-h-20"
              maxlength="200"
              placeholder="给玩家看的活动说明"
            />

            <div
              v-for="(gift, idx) in config.floatingWelfare.gifts"
              :key="idx"
              class="border border-accent/10 rounded-xs p-3 space-y-2"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="text-sm text-accent">
                  礼包 #{{ Number(idx) + 1 }}
                </div>
                <button
                  class="btn text-xs text-danger"
                  @click="config.floatingWelfare.gifts.splice(idx, 1)"
                >
                  删除礼包
                </button>
              </div>
              <label class="flex items-center gap-2 text-sm"
                ><input v-model="gift.enabled" type="checkbox" />
                启用该礼包</label
              >
              <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div>
                  <label class="block text-sm">礼包ID</label>
                  <input v-model="gift.id" class="input" placeholder="daily" />
                </div>
                <div>
                  <label class="block text-sm">类型</label>
                  <select v-model="gift.type" class="input">
                    <option value="newbie">新手福利</option>
                    <option value="daily">每日福利</option>
                    <option value="seven_day">七日福利</option>
                    <option value="custom">自定义</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm">重置方式</label>
                  <select v-model="gift.reset" class="input">
                    <option value="once">一次性</option>
                    <option value="daily">每日一次</option>
                    <option value="sevenDay">七日周期</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm">礼包标题</label>
                  <input
                    v-model="gift.title"
                    class="input"
                    placeholder="每日福利"
                  />
                </div>
              </div>
              <label class="block text-sm">礼包说明</label>
              <textarea
                v-model="gift.desc"
                class="input min-h-16"
                placeholder="给玩家看的说明"
              />
              <div class="grid grid-cols-2 md:grid-cols-6 gap-2">
                <div>
                  <label class="block text-sm">铜钱</label
                  ><input
                    v-model.number="gift.rewards.money"
                    class="input"
                    type="number"
                    min="0"
                    max="50000"
                  />
                </div>
                <div>
                  <label class="block text-sm">灵石</label
                  ><input
                    v-model.number="gift.rewards.spiritStone"
                    class="input"
                    type="number"
                    min="0"
                    max="300"
                  />
                </div>
                <div>
                  <label class="block text-sm">灵气</label
                  ><input
                    v-model.number="gift.rewards.aura"
                    class="input"
                    type="number"
                    min="0"
                    max="50000"
                  />
                </div>
                <div>
                  <label class="block text-sm">修为</label
                  ><input
                    v-model.number="gift.rewards.cultivation"
                    class="input"
                    type="number"
                    min="0"
                    max="100000"
                  />
                </div>
                <div>
                  <label class="block text-sm">灵力</label
                  ><input
                    v-model.number="gift.rewards.mana"
                    class="input"
                    type="number"
                    min="0"
                    max="10000"
                  />
                </div>
                <div>
                  <label class="block text-sm">体力</label
                  ><input
                    v-model.number="gift.rewards.stamina"
                    class="input"
                    type="number"
                    min="0"
                    max="500"
                  />
                </div>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label class="block text-sm">根骨经验</label
                  ><input
                    v-model.number="gift.rewards.attributeExp.physique"
                    class="input"
                    type="number"
                    min="0"
                  />
                </div>
                <div>
                  <label class="block text-sm">力道经验</label
                  ><input
                    v-model.number="gift.rewards.attributeExp.strength"
                    class="input"
                    type="number"
                    min="0"
                  />
                </div>
                <div>
                  <label class="block text-sm">身法经验</label
                  ><input
                    v-model.number="gift.rewards.attributeExp.agility"
                    class="input"
                    type="number"
                    min="0"
                  />
                </div>
                <div>
                  <label class="block text-sm">悟性经验</label
                  ><input
                    v-model.number="gift.rewards.attributeExp.perception"
                    class="input"
                    type="number"
                    min="0"
                  />
                </div>
              </div>
              <div class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <label class="block text-sm">物品奖励</label>
                  <button
                    class="btn text-xs"
                    @click="addFloatingGiftItem(gift)"
                  >
                    增加物品
                  </button>
                </div>
                <div
                  v-for="(item, itemIdx) in gift.rewards.items"
                  :key="itemIdx"
                  class="grid grid-cols-1 md:grid-cols-12 gap-2"
                >
                  <select
                    v-model="item.itemId"
                    class="input md:col-span-5"
                    @change="syncFloatingItemName(item)"
                  >
                    <option value="">请选择物品</option>
                    <optgroup v-for="cat in categories" :key="cat" :label="cat">
                      <option
                        v-for="mi in ALL_ITEMS.filter(
                          (i) => i.category === cat,
                        )"
                        :key="mi.id"
                        :value="mi.id"
                      >
                        {{ mi.name }}
                      </option>
                    </optgroup>
                  </select>
                  <input
                    v-model="item.name"
                    class="input md:col-span-2"
                    placeholder="显示名"
                  />
                  <input
                    v-model.number="item.quantity"
                    class="input md:col-span-2"
                    type="number"
                    min="1"
                    placeholder="数量"
                  />
                  <select v-model="item.quality" class="input md:col-span-2">
                    <option value="normal">普通</option>
                    <option value="fine">优良</option>
                    <option value="excellent">精品</option>
                    <option value="supreme">极品</option>
                  </select>
                  <button
                    class="btn text-xs text-danger justify-center"
                    @click="gift.rewards.items.splice(itemIdx, 1)"
                  >
                    删
                  </button>
                </div>
              </div>
            </div>
            <button class="btn w-full justify-center" @click="saveConfig">
              保存悬浮福利配置
            </button>
          </div>

          <div
            v-if="activeTab === 'about'"
            class="border border-accent/20 rounded-xs p-3 space-y-3"
          >
            <h2 class="text-accent">关于游戏</h2>
            <p class="text-xs text-muted">
              这些内容会显示在首页“关于游戏”弹窗里；版权来源由发行版本固定展示，避免后台误改署名与许可信息。
            </p>
            <label class="block text-sm">QQ 群显示文字</label>
            <input
              v-model="config.aboutQqText"
              class="input"
              placeholder="例如：718630139"
            />
            <label class="block text-sm">QQ 群链接</label>
            <input
              v-model="config.aboutQqUrl"
              class="input"
              placeholder="https://qm.qq.com/..."
            />
            <label class="block text-sm">TapTap 地址</label>
            <input
              v-model="config.aboutTapTapUrl"
              class="input"
              placeholder="https://www.taptap.cn/app/..."
            />
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label class="block text-sm">iOS 客户端下载链接</label>
                <input
                  v-model="config.iosDownloadUrl"
                  class="input"
                  placeholder="https://.../ios 或 App Store 链接"
                />
              </div>
              <div>
                <label class="block text-sm">安卓客户端下载链接</label>
                <input
                  v-model="config.androidDownloadUrl"
                  class="input"
                  placeholder="https://.../apk 或应用商店链接"
                />
              </div>
            </div>
            <p class="text-[10px] text-muted">
              下载链接留空时，首页不会显示对应平台按钮。
            </p>
            <button class="btn w-full justify-center" @click="saveConfig">
              保存关于配置
            </button>
          </div>

          <div
            v-if="activeTab === 'updates'"
            class="border border-accent/20 rounded-xs p-3 space-y-3"
          >
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-accent">更新记录</h2>
              <button class="btn text-xs" @click="addUpdateLog">
                新增一条
              </button>
            </div>
            <div
              v-for="(log, idx) in config.updateLogs"
              :key="idx"
              class="border border-accent/10 rounded-xs p-2 space-y-2"
            >
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  v-model="log.date"
                  class="input"
                  placeholder="日期，如 2026-07-03"
                />
                <input
                  v-model="log.title"
                  class="input md:col-span-2"
                  placeholder="标题"
                />
              </div>
              <textarea
                v-model="log.content"
                class="input min-h-20"
                placeholder="更新内容"
              />
              <button
                class="btn text-xs text-danger"
                @click="config.updateLogs.splice(idx, 1)"
              >
                删除这条
              </button>
            </div>
            <button class="btn w-full justify-center" @click="saveConfig">
              保存更新记录
            </button>
          </div>

          <div
            v-if="activeTab === 'saveAudit'"
            class="border border-accent/20 rounded-xs p-3 space-y-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-accent">存档审计 / 安全日志</h2>
              <button class="btn text-xs" @click="loadSaveAuditEvents">
                刷新审计
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-5 gap-2">
              <input
                v-model="saveAuditKeyword"
                class="input"
                placeholder="用户名/角色名/userId"
              />
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
              <input
                v-model.number="saveAuditLimit"
                type="number"
                min="1"
                max="500"
                class="input"
                placeholder="条数"
              />
              <button class="btn justify-center" @click="loadSaveAuditEvents">
                查询
              </button>
            </div>
            <div v-if="saveAuditEvents.length === 0" class="text-xs text-muted">
              暂无存档审计记录。
            </div>
            <div
              v-for="ev in saveAuditEvents"
              :key="ev.id"
              class="border border-accent/10 rounded-xs p-2 text-xs space-y-1"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span class="text-accent">{{ ev.username }}</span
                  ><span class="text-muted ml-1"
                    >/ {{ ev.player_name || "无角色" }} / 槽位{{
                      ev.slot
                    }}</span
                  >
                </div>
                <div class="text-muted">{{ formatTime(ev.created_at) }}</div>
              </div>
              <div class="flex flex-wrap gap-x-3 gap-y-1">
                <span>类型：{{ saveAuditTypeLabel(ev.event_type) }}</span>
                <span
                  >状态：<b
                    :class="
                      ev.status === 'conflict' ? 'text-danger' : 'text-accent'
                    "
                    >{{ saveAuditStatusLabel(ev.status) }}</b
                  ></span
                >
                <span>raw：{{ ev.raw_size }} B</span>
                <span>data：{{ ev.data_size }} B</span>
                <span v-if="ev.server_updated_at"
                  >服务器档：{{ formatTime(ev.server_updated_at) }}</span
                >
                <span v-if="ev.client_loaded_at"
                  >客户端载入：{{ formatTime(ev.client_loaded_at) }}</span
                >
                <span class="text-muted">IP：{{ ev.ip || "-" }}</span>
              </div>
              <div v-if="ev.data_hash" class="text-[10px] text-muted break-all">
                SHA256：{{ ev.data_hash }}
              </div>
              <pre
                v-if="ev.detail"
                class="text-[10px] text-muted whitespace-pre-wrap break-all bg-black/20 p-2 rounded-xs"
                >{{ JSON.stringify(ev.detail, null, 2) }}</pre>
            </div>
          </div>

          <div
            v-if="activeTab === 'ledger'"
            class="border border-accent/20 rounded-xs p-3 space-y-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-accent">经济流水 / 操作日志</h2>
              <button class="btn text-xs" @click="loadEconomyEvents">
                刷新流水
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                v-model="ledgerKeyword"
                class="input"
                placeholder="用户名/角色名/userId"
              />
              <select v-model="ledgerType" class="input">
                <option value="">全部类型</option>
                <option value="sell_item">单个出售</option>
                <option value="sell_item_all">批量出售</option>
                <option value="sell_all">一键出售</option>
                <option value="mail_claim">邮件领取</option>
                <option value="checkin">每日签到</option>
              </select>
              <input
                v-model.number="ledgerLimit"
                type="number"
                min="1"
                max="500"
                class="input"
                placeholder="条数"
              />
              <button class="btn justify-center" @click="loadEconomyEvents">
                查询
              </button>
            </div>
            <div v-if="economyEvents.length === 0" class="text-xs text-muted">
              暂无流水。
            </div>
            <div
              v-for="ev in economyEvents"
              :key="ev.id"
              class="border border-accent/10 rounded-xs p-2 text-xs space-y-1"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span class="text-accent">{{ ev.username }}</span
                  ><span class="text-muted ml-1"
                    >/ {{ ev.player_name || "无角色" }}</span
                  >
                </div>
                <div class="text-muted">{{ formatTime(ev.created_at) }}</div>
              </div>
              <div class="flex flex-wrap gap-x-3 gap-y-1">
                <span>类型：{{ eventTypeLabel(ev.event_type) }}</span>
                <span
                  >金额：<b
                    :class="
                      Number(ev.amount) >= 0 ? 'text-accent' : 'text-danger'
                    "
                    >{{ ev.amount }}</b
                  ></span
                >
                <span v-if="ev.item_id"
                  >物品：{{ ev.item_id }} ×{{ ev.quantity }}
                  {{ ev.quality || "" }}</span
                >
                <span v-if="ev.source">来源：{{ ev.source }}</span>
                <span class="text-muted">IP：{{ ev.ip || "-" }}</span>
              </div>
              <pre
                v-if="ev.detail"
                class="text-[10px] text-muted whitespace-pre-wrap break-all bg-black/20 p-2 rounded-xs"
                >{{ JSON.stringify(ev.detail, null, 2) }}</pre>
            </div>
          </div>

          <div
            v-if="activeTab === 'players'"
            class="border border-accent/20 rounded-xs p-3 space-y-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-accent">玩家 / 云存档总览</h2>
              <input
                v-model="keyword"
                class="input max-w-xs"
                placeholder="搜索用户名"
              />
            </div>
            <div v-if="filteredUsers.length === 0" class="text-xs text-muted">
              暂无用户。
            </div>
            <div
              v-for="u in filteredUsers"
              :key="u.id"
              class="border border-accent/10 rounded-xs p-3 space-y-2"
            >
              <div
                class="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <div>
                  <span class="text-accent">{{ u.username }}</span>
                  <span class="text-muted ml-2">{{ u.role }}</span>
                  <span v-if="u.disabled" class="text-danger ml-2">已封禁</span>
                  <span class="text-muted ml-2"
                    >注册：{{ formatTime(u.createdAt) }}</span
                  >
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <div class="text-xs text-muted">
                    云存档 {{ u.saveCount }} 个 / 最近：{{
                      formatTime(u.lastSaveAt)
                    }}
                  </div>
                  <button class="btn text-xs" @click="resetPassword(u)">
                    重置密码
                  </button>
                  <button
                    v-if="!u.disabled && u.id !== user.id"
                    class="btn text-xs text-danger"
                    @click="banUser(u)"
                  >
                    封号
                  </button>
                  <button
                    v-if="u.disabled"
                    class="btn text-xs"
                    @click="unbanUser(u)"
                  >
                    解封
                  </button>
                </div>
              </div>
              <div v-if="u.saves.length === 0" class="text-xs text-muted">
                没有云存档。
              </div>
              <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div
                  v-for="save in u.saves"
                  :key="save.slot"
                  class="border border-accent/10 rounded-xs p-2 text-xs space-y-1"
                >
                  <div class="flex justify-between">
                    <span class="text-accent">槽位 {{ save.slot + 1 }}</span
                    ><span>{{ formatSize(save.rawSize) }}</span>
                  </div>
                  <div>角色：{{ save.playerName || "未知" }}</div>
                  <div>
                    日期：{{ save.year ? `第${save.year}年 ` : ""
                    }}{{ save.season || ""
                    }}{{ save.day ? ` 第${save.day}天` : "" }}
                  </div>
                  <div>金钱：{{ save.money ?? "未知" }}</div>
                  <div class="text-muted">
                    更新：{{ formatTime(save.updatedAt) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <template v-if="activeTab === 'feedbacks'">
            <h2 class="text-accent">玩家反馈</h2>
            <div class="flex gap-2 mt-3 mb-3 flex-wrap">
              <button
                v-for="cat in feedbackCategoryOptions"
                :key="cat.value"
                class="btn text-xs"
                :class="
                  feedbackFilterCat === cat.value ? '!bg-accent !text-bg' : ''
                "
                @click="
                  feedbackFilterCat = cat.value;
                  loadFeedbacks();
                "
              >
                {{ cat.label }}
              </button>
              <button
                v-for="st in feedbackStatusOptions"
                :key="st.value"
                class="btn text-xs"
                :class="
                  feedbackFilterStatus === st.value ? '!bg-accent !text-bg' : ''
                "
                @click="
                  feedbackFilterStatus = st.value;
                  loadFeedbacks();
                "
              >
                {{ st.label }}
              </button>
            </div>
            <div
              v-if="feedbacks.length === 0"
              class="text-xs text-muted py-4 text-center"
            >
              暂无反馈。
            </div>
            <div
              v-for="fb in feedbacks"
              :key="fb.id"
              class="border border-accent/15 rounded-xs p-3 mb-2"
            >
              <div class="flex items-center justify-between mb-1">
                <div>
                  <span
                    class="text-xs font-bold"
                    :class="{
                      'text-blue-400': fb.category === 'feature',
                      'text-danger': fb.category === 'bug',
                      'text-yellow-400': fb.category === 'suggestion',
                    }"
                    >{{
                      fb.category === "feature"
                        ? "功能反馈"
                        : fb.category === "bug"
                          ? "BUG反馈"
                          : "意见提交"
                    }}</span
                  >
                  <span class="text-xs text-accent ml-2">{{ fb.title }}</span>
                </div>
                <select
                  v-model="fb.status_tmp"
                  class="bg-bg border border-accent/30 rounded-xs text-xs px-1 py-0.5"
                  @change="updateFeedbackStatus(fb)"
                >
                  <option value="pending">待处理</option>
                  <option value="read">已读</option>
                  <option value="resolved">已解决</option>
                  <option value="closed">已关闭</option>
                </select>
              </div>
              <p class="text-xs text-muted whitespace-pre-wrap">
                {{ fb.content }}
              </p>
              <div
                class="flex items-center gap-2 mt-1 text-[10px] text-muted/60"
              >
                <span>账号：{{ fb.username || "游客" }}</span>
                <span v-if="fb.user_id"> · ID：{{ fb.user_id }}</span>
                <span v-if="fb.player_name"> · 角色：{{ fb.player_name }}</span>
                <span> · {{ new Date(fb.created_at).toLocaleString() }}</span>
              </div>
              <div class="flex gap-2 mt-2">
                <button
                  v-if="fb.user_id"
                  class="btn text-xs"
                  @click="prepareFeedbackCompensation(fb)"
                >
                  补偿该玩家
                </button>
              </div>
            </div>
          </template>
          <div
            v-if="activeTab === 'gm'"
            class="border border-accent/20 rounded-xs p-3 space-y-3"
          >
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-accent">GM 邮件奖励</h2>
              <button class="btn text-xs" @click="addGmItem">增加物品行</button>
            </div>
            <p class="text-xs text-muted">
              奖励会以系统邮件发给玩家；玩家进入游戏后从邮件领取，领取后自动写入当前存档并由
              5 秒自动云存档同步。
            </p>
            <label class="block text-sm">收件人</label>
            <select v-model="gmMail.to" class="input">
              <option value="all">全体玩家</option>
              <option v-for="u in overview.users" :key="u.id" :value="u.id">
                {{ u.username }}（{{ u.role }}）
              </option>
            </select>
            <label class="block text-sm">邮件标题</label>
            <input
              v-model="gmMail.title"
              class="input"
              placeholder="例如：开服补偿"
            />
            <label class="block text-sm">邮件内容</label>
            <textarea
              v-model="gmMail.content"
              class="input min-h-20"
              placeholder="给玩家看的说明"
            />
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              <div>
                <label class="block text-sm">铜钱</label>
                <input
                  v-model.number="gmMail.rewards.money"
                  class="input"
                  type="number"
                  min="0"
                  max="50000"
                  placeholder="0"
                />
              </div>
              <div>
                <label class="block text-sm">体力</label>
                <input
                  v-model.number="gmMail.rewards.stamina"
                  class="input"
                  type="number"
                  min="0"
                  max="500"
                  placeholder="0"
                />
              </div>
              <div>
                <label class="block text-sm">修为</label>
                <input
                  v-model.number="gmMail.rewards.cultivation"
                  class="input"
                  type="number"
                  min="0"
                  max="100000"
                  placeholder="0"
                />
              </div>
              <div>
                <label class="block text-sm">灵气</label>
                <input
                  v-model.number="gmMail.rewards.aura"
                  class="input"
                  type="number"
                  min="0"
                  max="50000"
                  placeholder="0"
                />
              </div>
              <div>
                <label class="block text-sm">灵力</label>
                <input
                  v-model.number="gmMail.rewards.mana"
                  class="input"
                  type="number"
                  min="0"
                  max="10000"
                  placeholder="0"
                />
              </div>
              <div>
                <label class="block text-sm">灵石</label>
                <input
                  v-model.number="gmMail.rewards.spiritStone"
                  class="input"
                  type="number"
                  min="0"
                  max="300"
                  placeholder="0"
                />
              </div>
            </div>
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <label class="block text-sm">物品奖励</label>
                <span class="text-xs text-muted"
                  >物品 ID 可填 seed_spirit_rice、mana_recovery_pill 等</span
                >
              </div>
              <div
                v-for="(item, idx) in gmMail.rewards.items"
                :key="idx"
                class="grid grid-cols-1 md:grid-cols-12 gap-2"
              >
                <select v-model="item.itemId" class="input md:col-span-5">
                  <option value="">请选择物品</option>
                  <optgroup v-for="cat in categories" :key="cat" :label="cat">
                    <option
                      v-for="mi in ALL_ITEMS.filter((i) => i.category === cat)"
                      :key="mi.id"
                      :value="mi.id"
                    >
                      {{ mi.name }}
                    </option>
                  </optgroup>
                </select>
                <input
                  v-model.number="item.quantity"
                  class="input md:col-span-2"
                  type="number"
                  min="1"
                  placeholder="数量"
                />
                <select v-model="item.quality" class="input md:col-span-3">
                  <option value="normal">普通</option>
                  <option value="fine">优良</option>
                  <option value="excellent">精品</option>
                  <option value="supreme">极品</option>
                </select>
                <button
                  class="btn text-xs text-danger md:col-span-2 justify-center"
                  @click="gmMail.rewards.items.splice(idx, 1)"
                >
                  删除
                </button>
              </div>
            </div>
            <button class="btn w-full justify-center" @click="sendGmMail">
              发送 GM 邮件
            </button>
          </div>
        </template>
      </template>

      <p
        v-if="message"
        class="text-sm"
        :class="messageType === 'error' ? 'text-danger' : 'text-accent'"
      >
        {{ message }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ITEMS } from "@/data/items";

const router = useRouter();
const username = ref("");
const password = ref("");
const user = ref<any>(null);
const keyword = ref("");
const activeTab = ref<
  | "basic"
  | "about"
  | "announcements"
  | "welfare"
  | "updates"
  | "players"
  | "saveAudit"
  | "ledger"
  | "gm"
  | "feedbacks"
>("basic");
const adminTabs = [
  { key: "basic", label: "基础配置" },
  { key: "about", label: "关于/赞助" },
  { key: "announcements", label: "全服公告" },
  { key: "welfare", label: "悬浮福利" },
  { key: "updates", label: "更新记录" },
  { key: "players", label: "玩家管理" },
  { key: "saveAudit", label: "存档审计" },
  { key: "ledger", label: "经济流水" },
  { key: "gm", label: "GM邮件" },
  { key: "feedbacks", label: "玩家反馈" },
] as const;
const message = ref("");
const messageType = ref<"ok" | "error">("ok");
const config = reactive<any>({
  siteName: "万象仙乡",
  announcement: "",
  announcementIntervalHours: 24,
  updateLogs: [],
  aboutQqText: "",
  aboutQqUrl: "",
  aboutGithubUrl: "",
  aboutTapTapUrl: "",
  sponsorAlipayImageUrl: "",
  sponsorWechatImageUrl: "",
  sponsorAfdianUrl: "",
  iosDownloadUrl: "",
  androidDownloadUrl: "",
  registrationEnabled: true,
  maintenanceMode: false,
  groupEntry: {
    enabled: false,
    buttonText: "点我加群",
    url: "",
  },
  floatingWelfare: {
    enabled: false,
    buttonText: "福利",
    title: "仙乡福利",
    desc: "",
    gifts: [],
  },
});
const overview = reactive<any>({
  stats: { userCount: 0, saveCount: 0, sessionCount: 0 },
  users: [],
});
const newWorldAnnouncement = ref("");
const newWorldAnnouncementRepeatMinutes = ref(0);
const worldAnnouncements = ref<any[]>([]);
const economyEvents = ref<any[]>([]);
const ledgerKeyword = ref("");
const ledgerType = ref("");
const ledgerLimit = ref(100);
const saveAuditEvents = ref<any[]>([]);
const saveAuditKeyword = ref("");
const saveAuditType = ref("");
const saveAuditStatus = ref("");
const saveAuditLimit = ref(100);
const feedbacks = ref<any[]>([]);
const feedbackFilterCat = ref("");
const feedbackFilterStatus = ref("");
const feedbackCategoryOptions = [
  { value: "", label: "全部" },
  { value: "feature", label: "功能反馈" },
  { value: "bug", label: "BUG反馈" },
  { value: "suggestion", label: "意见提交" },
];
const feedbackStatusOptions = [
  { value: "", label: "全部状态" },
  { value: "pending", label: "待处理" },
  { value: "read", label: "已读" },
  { value: "resolved", label: "已解决" },
  { value: "closed", label: "已关闭" },
];
const ALL_ITEMS = ITEMS.map((i) => ({
  id: i.id,
  name: i.name,
  category: i.category,
}));
const categories = computed(() => {
  return Array.from(new Set(ALL_ITEMS.map((i) => i.category))).sort();
});
const gmMail = reactive<any>({
  to: "all",
  title: "系统奖励",
  content: "",
  rewards: {
    money: 0,
    stamina: 0,
    cultivation: 0,
    aura: 0,
    mana: 0,
    spiritStone: 0,
    items: [],
  },
});

const token = () => localStorage.getItem("taoyuan_account_token") || "";
const headers = () => ({
  "content-type": "application/json",
  authorization: `Bearer ${token()}`,
});
const setMsg = (m: string, t: "ok" | "error" = "ok") => {
  message.value = m;
  messageType.value = t;
};
async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "请求失败");
  return data;
}
async function loadMe() {
  const data = await api("/api/me", { headers: headers() });
  user.value = data.user;
}
async function loadConfig() {
  Object.assign(
    config,
    await api(
      user.value?.role === "admin" ? "/api/admin/config" : "/api/config",
      { headers: headers() },
    ),
  );
  normalizeFloatingWelfareConfig();
}
async function loadOverview() {
  if (user.value?.role === "admin")
    Object.assign(
      overview,
      await api("/api/admin/overview", { headers: headers() }),
    );
}
async function loadWorldAnnouncements() {
  if (user.value?.role !== "admin") return;
  const data = await api("/api/admin/world-announcements?limit=30", {
    headers: headers(),
  });
  worldAnnouncements.value = data.announcements || [];
}
async function publishWorldAnnouncement() {
  const message = newWorldAnnouncement.value.trim();
  if (!message) {
    setMsg("公告内容不能为空", "error");
    return;
  }
  try {
    const repeatIntervalMinutes = Math.max(
      0,
      Math.min(
        10080,
        Math.floor(Number(newWorldAnnouncementRepeatMinutes.value) || 0),
      ),
    );
    const data = await api("/api/admin/world-announcements", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ message, type: "admin", repeatIntervalMinutes }),
    });
    worldAnnouncements.value = data.announcements || [];
    newWorldAnnouncement.value = "";
    newWorldAnnouncementRepeatMinutes.value = 0;
    setMsg(
      repeatIntervalMinutes
        ? `全服公告已发布，将每${repeatIntervalMinutes}分钟重复滚动`
        : "全服公告已发布",
    );
  } catch (e: any) {
    setMsg(e.message, "error");
  }
}
async function deleteWorldAnnouncement(ann: any) {
  if (!confirm("确定删除这条全服公告？")) return;
  try {
    await api(`/api/admin/world-announcements/${encodeURIComponent(ann.id)}`, {
      method: "DELETE",
      headers: headers(),
    });
    await loadWorldAnnouncements();
    setMsg("公告已删除");
  } catch (e: any) {
    setMsg(e.message, "error");
  }
}
async function loadEconomyEvents() {
  if (user.value?.role !== "admin") return;
  const q = new URLSearchParams();
  if (ledgerKeyword.value.trim()) q.set("keyword", ledgerKeyword.value.trim());
  if (ledgerType.value) q.set("type", ledgerType.value);
  q.set("limit", String(ledgerLimit.value || 100));
  const data = await api(`/api/admin/economy-events?${q.toString()}`, {
    headers: headers(),
  });
  economyEvents.value = data.events || [];
}
async function loadFeedbacks() {
  if (user.value?.role !== "admin") return;
  try {
    const q = new URLSearchParams();
    if (feedbackFilterCat.value) q.set("category", feedbackFilterCat.value);
    if (feedbackFilterStatus.value) q.set("status", feedbackFilterStatus.value);
    const data = await api(`/api/admin/feedbacks?${q.toString()}`, {
      headers: headers(),
    });
    feedbacks.value = (data.feedbacks || []).map((f: any) => ({
      ...f,
      status_tmp: f.status,
    }));
  } catch {}
}
async function updateFeedbackStatus(fb: any) {
  try {
    await api(`/api/admin/feedbacks/${fb.id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ status: fb.status_tmp }),
    });
    fb.status = fb.status_tmp;
  } catch {
    fb.status_tmp = fb.status;
  }
}
function prepareFeedbackCompensation(fb: any) {
  if (!fb.user_id) {
    setMsg("该反馈没有绑定账号，无法直接补偿", "error");
    return;
  }
  gmMail.to = fb.user_id;
  gmMail.title = `反馈处理补偿：${fb.title || "玩家反馈"}`;
  gmMail.content = `感谢你的反馈「${fb.title || ""}」。管理员已核实处理，附上补偿奖励。`;
  activeTab.value = "gm";
  setMsg(`已切到 GM 邮件，收件人：${fb.username || fb.user_id}`);
}
async function loadSaveAuditEvents() {
  if (user.value?.role !== "admin") return;
  const q = new URLSearchParams();
  if (saveAuditKeyword.value.trim())
    q.set("keyword", saveAuditKeyword.value.trim());
  if (saveAuditType.value) q.set("type", saveAuditType.value);
  if (saveAuditStatus.value) q.set("status", saveAuditStatus.value);
  q.set("limit", String(saveAuditLimit.value || 100));
  const data = await api(`/api/admin/save-audit-events?${q.toString()}`, {
    headers: headers(),
  });
  saveAuditEvents.value = data.events || [];
}
async function refreshAll() {
  try {
    await loadMe();
    await loadConfig();
    await loadOverview();
    await loadWorldAnnouncements();
    await loadEconomyEvents();
    await loadSaveAuditEvents();
    await loadFeedbacks();
    setMsg("后台数据已刷新");
  } catch (e: any) {
    setMsg(e.message, "error");
  }
}
async function login() {
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: username.value,
        password: password.value,
      }),
    });
    localStorage.setItem("taoyuan_account_token", data.token);
    user.value = data.user;
    await loadConfig();
    await loadOverview();
    await loadWorldAnnouncements();
    setMsg("登录成功");
  } catch (e: any) {
    setMsg(e.message, "error");
  }
}
async function register() {
  try {
    const data = await api("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: username.value,
        password: password.value,
      }),
    });
    localStorage.setItem("taoyuan_account_token", data.token);
    user.value = data.user;
    await loadConfig();
    await loadOverview();
    await loadWorldAnnouncements();
    setMsg(data.message || "注册成功");
  } catch (e: any) {
    setMsg(e.message, "error");
  }
}
function ensureFloatingGiftShape(gift: any) {
  gift.rewards ||= {};
  gift.rewards.attributeExp ||= {
    physique: 0,
    strength: 0,
    agility: 0,
    perception: 0,
  };
  gift.rewards.items ||= [];
  return gift;
}
function addFloatingGift() {
  config.floatingWelfare ||= {
    enabled: true,
    buttonText: "福利",
    title: "仙乡福利",
    desc: "",
    gifts: [],
  };
  config.floatingWelfare.gifts ||= [];
  config.floatingWelfare.gifts.push(
    ensureFloatingGiftShape({
      id: `gift_${Date.now().toString(36)}`,
      type: "custom",
      title: "自定义福利",
      desc: "",
      enabled: true,
      reset: "once",
      rewards: {
        money: 0,
        spiritStone: 0,
        aura: 0,
        cultivation: 0,
        mana: 0,
        stamina: 0,
        attributeExp: { physique: 0, strength: 0, agility: 0, perception: 0 },
        items: [],
      },
    }),
  );
}
function addFloatingGiftItem(gift: any) {
  ensureFloatingGiftShape(gift);
  gift.rewards.items.push({
    itemId: "",
    name: "",
    quantity: 1,
    quality: "normal",
  });
}
function syncFloatingItemName(item: any) {
  const found = ALL_ITEMS.find((i) => i.id === item.itemId);
  if (found && !item.name) item.name = found.name;
}
function normalizeFloatingWelfareConfig() {
  config.groupEntry ||= {
    enabled: false,
    buttonText: "点我加群",
    url: "",
  };
  config.floatingWelfare ||= {
    enabled: false,
    buttonText: "福利",
    title: "仙乡福利",
    desc: "",
    gifts: [],
  };
  config.floatingWelfare.gifts ||= [];
  config.floatingWelfare.gifts.forEach(ensureFloatingGiftShape);
}

function addUpdateLog() {
  config.updateLogs ||= [];
  config.updateLogs.unshift({
    date: new Date().toISOString().slice(0, 10),
    title: "",
    content: "",
  });
}
async function saveConfig() {
  try {
    Object.assign(
      config,
      await api("/api/admin/config", {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify(config),
      }),
    );
    setMsg("配置已保存");
  } catch (e: any) {
    setMsg(e.message, "error");
  }
}

async function banUser(u: any) {
  if (!confirm(`确定封禁账号「${u.username}」？该玩家会被踢下线并不能再登录。`))
    return;
  try {
    await api(`/api/admin/users/${encodeURIComponent(u.id)}/ban`, {
      method: "POST",
      headers: headers(),
    });
    await loadOverview();
    setMsg("已封禁账号");
  } catch (e: any) {
    setMsg(e.message, "error");
  }
}
async function unbanUser(u: any) {
  try {
    await api(`/api/admin/users/${encodeURIComponent(u.id)}/unban`, {
      method: "POST",
      headers: headers(),
    });
    await loadOverview();
    setMsg("已解封账号");
  } catch (e: any) {
    setMsg(e.message, "error");
  }
}
async function resetPassword(u: any) {
  const password = prompt(`请输入「${u.username}」的新密码，至少6位：`);
  if (!password) return;
  if (password.length < 6) {
    setMsg("新密码至少6位", "error");
    return;
  }
  try {
    await api(`/api/admin/users/${encodeURIComponent(u.id)}/reset-password`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ password }),
    });
    await loadOverview();
    setMsg("密码已重置");
  } catch (e: any) {
    setMsg(e.message, "error");
  }
}

function addGmItem() {
  gmMail.rewards.items.push({ itemId: "", quantity: 1, quality: "normal" });
}
async function sendGmMail() {
  if (!gmMail.to) {
    setMsg("请选择收件人", "error");
    return;
  }
  if (
    !confirm(
      gmMail.to === "all"
        ? "确定给全体玩家发送这封奖励邮件？"
        : "确定给该玩家发送这封奖励邮件？",
    )
  )
    return;
  try {
    await api("/api/admin/mails", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        target: gmMail.to,
        title: gmMail.title,
        content: gmMail.content,
        rewards: gmMail.rewards,
      }),
    });
    gmMail.title = "系统奖励";
    gmMail.content = "";
    gmMail.rewards.money = 0;
    gmMail.rewards.stamina = 0;
    gmMail.rewards.cultivation = 0;
    gmMail.rewards.aura = 0;
    gmMail.rewards.mana = 0;
    gmMail.rewards.spiritStone = 0;
    gmMail.rewards.items = [];
    await loadOverview();
    setMsg("GM 邮件已发送");
  } catch (e: any) {
    setMsg(e.message, "error");
  }
}

const filteredUsers = computed(() => {
  const k = keyword.value.trim().toLowerCase();
  if (!k) return overview.users;
  return overview.users.filter((u: any) =>
    String(u.username).toLowerCase().includes(k),
  );
});
function formatTime(v: string | null) {
  return v ? new Date(v).toLocaleString() : "无";
}
function formatSize(n: number) {
  return n > 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n || 0} B`;
}
function eventTypeLabel(t: string) {
  const labels: Record<string, string> = {
    sell_item: "单个出售",
    sell_item_all: "批量出售",
    sell_all: "一键出售",
    mail_claim: "邮件领取",
    checkin: "每日签到",
  };
  return labels[t] || t;
}
function saveAuditTypeLabel(t: string) {
  const labels: Record<string, string> = {
    save_load: "读取云档",
    save_write: "写入云档",
    save_conflict: "冲突拒绝",
    save_delete: "删除存档",
    character_create_save: "创建初始档",
  };
  return labels[t] || t;
}
function saveAuditStatusLabel(t: string) {
  const labels: Record<string, string> = { ok: "正常", conflict: "冲突" };
  return labels[t] || t;
}
onMounted(async () => {
  try {
    await loadMe();
    await loadConfig();
    await loadOverview();
    await loadWorldAnnouncements();
    await loadEconomyEvents();
    await loadSaveAuditEvents();
    await loadFeedbacks();
  } catch {}
});
</script>
