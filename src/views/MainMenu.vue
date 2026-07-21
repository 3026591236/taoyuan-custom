<template>
  <div
    class="flex min-h-screen flex-col items-center justify-center space-y-8 px-4"
    @click.once="startBgm"
    :class="{ 'py-10': Capacitor.isNativePlatform() }"
    @click="slotMenuOpen = null"
  >
    <!-- 标题 -->
    <div class="flex items-center space-x-3">
      <div class="logo" />
      <h1 class="text-accent text-2xl md:text-4xl tracking-widest">
        {{ pkg.title }}
      </h1>
    </div>

    <!-- 万象仙乡首页主视觉 -->
    <div
      class="home-pixel-scene wanxiang-hero-card w-full md:w-6/12"
      aria-label="万象仙乡主视觉：灵田村落、仙山云阙与星河仙门"
    >
      <img
        :src="wanxiangHero"
        alt="万象仙乡主视觉：灵田村落、仙山云阙与星河仙门"
        class="home-pixel-scene__image"
        draggable="false"
      />
      <div class="home-pixel-scene__caption">
        <span>万象灵田</span>
        <span>星河仙门</span>
        <span>云阙洞天</span>
      </div>
    </div>

    <!-- 自主服账号/公告 -->
    <div class="game-panel w-full md:w-6/12 space-y-3 text-sm">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-accent">
            {{ serverConfig.siteName || "万象仙乡" }} · 原创化过渡版
          </p>
          <p
            v-if="serverConfig.maintenanceMode"
            class="text-danger text-xs mt-1"
          >
            服务器维护提示已开启。
          </p>
        </div>
        <div class="flex gap-2 shrink-0">
          <button class="btn text-xs" @click.stop="showAnnouncement = true">
            公告
          </button>
          <button class="btn text-xs" @click.stop="showUpdateLogs = true">
            更新记录
          </button>
          <button class="btn text-xs" @click.stop="router.push('/admin')">
            后台
          </button>
          <button
            v-if="accountUser?.role === 'admin'"
            class="btn text-xs"
            @click.stop="openAdminImmortalPreview"
          >
            仙界预览
          </button>
        </div>
      </div>
      <div v-if="accountUser" class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span
            >已登录：<span class="text-accent">{{ accountUser.username }}</span>
            / {{ accountUser.role }}</span
          >
          <button class="btn text-xs" @click.stop="logoutAccount">退出</button>
        </div>
        <div class="border border-accent/20 rounded-xs p-2 space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="text-accent">账号角色</span>
            <span class="text-muted">{{ accountCharacters.length }}/3</span>
          </div>
          <div v-if="accountCharacters.length === 0" class="text-xs text-muted">
            当前账号还没有角色。点击「踏入旅途」创建第一个角色。
          </div>
          <div
            v-for="character in accountCharacters"
            :key="character.id"
            class="flex items-center justify-between gap-2 text-xs border border-accent/15 rounded-xs px-2 py-1.5"
          >
            <div class="min-w-0">
              <p class="text-accent truncate">{{ character.name }}</p>
              <p class="text-muted truncate">
                槽位 {{ character.slot + 1 }} ·
                {{ character.meta?.playerName || "仙乡旅人" }}
              </p>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button
                class="btn text-xs"
                @click.stop="continueCharacter(character)"
              >
                继续游戏
              </button>
              <button
                class="btn text-xs text-danger"
                :disabled="deletingSaveSlot === Number(character.slot)"
                title="删除存档"
                @click.stop="openDeleteSaveConfirm(character)"
              >
                <Trash2 :size="12" /> 删除
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-4 gap-2">
        <input
          v-model="accountUsername"
          class="input md:col-span-1"
          placeholder="账号"
          @click.stop
        />
        <input
          v-model="accountPassword"
          class="input md:col-span-1"
          placeholder="密码"
          type="password"
          @click.stop
        />
        <button class="btn justify-center" @click.stop="loginAccount">
          登录
        </button>
        <button class="btn justify-center" @click.stop="registerAccount">
          注册
        </button>
      </div>
    </div>

    <!-- 主菜单 -->
    <div class="flex flex-col space-y-3 w-full md:w-6/12">
      <Button
        class="text-center justify-center py-3"
        :icon="Play"
        :disabled="accountUser && accountCharacters.length >= 3"
        @click="handleNewJourneyClick"
        >踏入旅途</Button
      >
      <div
        v-if="accountUser && accountCharacters.length >= 3"
        class="text-xs text-muted text-center border border-accent/10 rounded-xs px-3 py-2"
      >
        当前账号已拥有 3 个角色，已达到上限。
      </div>
      <Button
        class="text-center justify-center py-2"
        :icon="BookOpen"
        @click.stop="router.push('/tutorial')"
        >新手教程</Button
      >

      <div
        v-if="iosDownloadUrl || androidDownloadUrl"
        class="game-panel p-3 space-y-2"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-accent text-sm">客户端下载</p>
          <p class="text-[10px] text-muted">手机端推荐安装客户端游玩</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <a
            v-if="iosDownloadUrl"
            :href="iosDownloadUrl"
            target="_blank"
            rel="noopener"
            class="btn justify-center py-2 text-sm"
            @click.stop
          >
            <Smartphone :size="15" /> iOS 下载
          </a>
          <a
            v-if="androidDownloadUrl"
            :href="androidDownloadUrl"
            target="_blank"
            rel="noopener"
            class="btn justify-center py-2 text-sm"
            @click.stop
          >
            <Smartphone :size="15" /> 安卓下载
          </a>
        </div>
      </div>

      <!-- 关于 -->
      <Button
        class="text-center justify-center text-muted"
        :icon="Info"
        @click="showAbout = true"
        >关于游戏</Button
      >
      <div class="grid grid-cols-3 gap-2">
        <Button
          v-for="cat in HOME_FEEDBACK_CATEGORIES"
          :key="cat.key"
          class="text-center justify-center text-muted text-xs py-2"
          :icon="cat.icon"
          :icon-size="13"
          @click.stop="openHomeFeedback(cat.key)"
        >
          {{ cat.label }}
        </Button>
      </div>
    </div>

    <!-- 删除存档二次确认弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="deleteSaveTarget"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80"
        @click.self="closeDeleteSaveConfirm"
      >
        <div class="game-panel w-full max-w-sm mx-4 relative">
          <button
            class="absolute top-2 right-2 text-muted hover:text-text"
            @click="closeDeleteSaveConfirm"
          >
            <X :size="14" />
          </button>
          <h2 class="text-danger text-lg mb-2 text-center">删除存档</h2>
          <div
            class="border border-danger/30 rounded-xs p-3 text-xs leading-relaxed space-y-2"
          >
            <p class="text-text">
              你正在删除角色「<span class="text-accent">{{
                deleteSaveTarget.name
              }}</span
              >」的存档。
            </p>
            <p class="text-danger">
              此操作会删除云端存档和本地缓存，删除后无法恢复。请确认不再需要该角色后再继续。
            </p>
          </div>
          <label class="text-xs text-muted mt-3 mb-1 block"
            >二次确认：请输入 <span class="text-danger">删除存档</span></label
          >
          <input
            v-model="deleteSaveConfirmText"
            class="input"
            placeholder="删除存档"
            @click.stop
          />
          <div class="flex space-x-3 justify-center mt-4">
            <Button
              :icon-size="12"
              :icon="ArrowLeft"
              @click="closeDeleteSaveConfirm"
              >取消</Button
            >
            <Button
              class="px-4 !text-danger"
              :disabled="
                deleteSaveConfirmText !== '删除存档' ||
                deletingSaveSlot === Number(deleteSaveTarget.slot)
              "
              :icon-size="12"
              :icon="Trash2"
              @click="deleteAccountSave"
            >
              {{
                deletingSaveSlot === Number(deleteSaveTarget.slot)
                  ? "删除中..."
                  : "确认删除"
              }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 首页反馈弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showHomeFeedback"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80"
        @click.self="showHomeFeedback = false"
      >
        <div class="game-panel w-full max-w-md mx-4 relative">
          <button
            class="absolute top-2 right-2 text-muted hover:text-text"
            @click="showHomeFeedback = false"
          >
            <X :size="14" />
          </button>
          <h2 class="text-accent text-lg mb-3 text-center">
            {{ homeFeedbackLabel }}
          </h2>
          <div class="flex flex-col space-y-3">
            <div>
              <label class="text-xs text-muted mb-1 block">标题</label>
              <input
                v-model="homeFeedbackTitle"
                maxlength="100"
                class="input"
                placeholder="简要描述你的反馈"
                @click.stop
              />
            </div>
            <div>
              <label class="text-xs text-muted mb-1 block">详细内容</label>
              <textarea
                v-model="homeFeedbackContent"
                maxlength="2000"
                rows="5"
                class="input min-h-28"
                placeholder="请详细描述问题、建议或想要的新功能"
                @click.stop
              ></textarea>
            </div>
            <Button
              class="justify-center"
              :disabled="
                homeFeedbackBusy ||
                !homeFeedbackTitle.trim() ||
                !homeFeedbackContent.trim()
              "
              @click="submitHomeFeedback"
            >
              {{ homeFeedbackBusy ? "提交中..." : "提交反馈" }}
            </Button>
            <p
              v-if="homeFeedbackMsg"
              class="text-xs text-center"
              :class="homeFeedbackOk ? 'text-success' : 'text-danger'"
            >
              {{ homeFeedbackMsg }}
            </p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 公告弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showAnnouncement"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80"
        @click.self="showAnnouncement = false"
      >
        <div class="game-panel w-full max-w-md mx-4 relative">
          <button
            class="absolute top-2 right-2 text-muted hover:text-text"
            @click="showAnnouncement = false"
          >
            <X :size="14" />
          </button>
          <h2 class="text-accent text-lg mb-3 text-center">公告</h2>
          <div
            class="border border-accent/20 rounded-xs p-3 text-sm whitespace-pre-wrap leading-relaxed"
          >
            {{ serverConfig.announcement || "暂无公告。" }}
          </div>
          <p class="text-xs text-muted mt-3 text-center">
            公告会按后台设置的间隔自动显示，也可以随时点击公告按钮查看。
          </p>
          <div class="flex justify-center mt-3">
            <Button class="px-6" @click="showAnnouncement = false"
              >知道了</Button
            >
          </div>
        </div>
      </div>
    </Transition>

    <!-- 更新记录弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showUpdateLogs"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80"
        @click.self="showUpdateLogs = false"
      >
        <div
          class="game-panel w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto relative"
        >
          <button
            class="absolute top-2 right-2 text-muted hover:text-text"
            @click="showUpdateLogs = false"
          >
            <X :size="14" />
          </button>
          <h2 class="text-accent text-lg mb-3 text-center">更新记录</h2>
          <div
            v-if="!serverConfig.updateLogs?.length"
            class="text-xs text-muted text-center border border-accent/20 rounded-xs p-3"
          >
            暂无更新记录。
          </div>
          <div
            v-for="(log, idx) in serverConfig.updateLogs"
            :key="idx"
            class="border border-accent/20 rounded-xs p-3 mb-2 text-sm"
          >
            <div class="flex justify-between gap-2 mb-1">
              <span class="text-accent">{{ log.title || "功能更新" }}</span>
              <span class="text-muted text-xs">{{ log.date }}</span>
            </div>
            <p class="text-xs whitespace-pre-wrap leading-relaxed">
              {{ log.content }}
            </p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 关于弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showAbout"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80"
        @click.self="showAbout = false"
      >
        <div class="game-panel w-full max-w-md mx-4 text-center relative">
          <button
            class="absolute top-2 right-2 text-muted hover:text-text"
            @click="showAbout = false"
          >
            <X :size="14" />
          </button>
          <h2 class="text-accent text-lg mb-3">关于{{ pkg.title }}</h2>
          <!-- 分区标签 -->
          <div class="flex space-x-1.5 mb-3">
            <Button
              class="flex-1 justify-center"
              :class="{ '!bg-accent !text-bg': aboutTab === 'about' }"
              :icon="Info"
              @click="aboutTab = 'about'"
            >
              关于游戏
            </Button>
            <Button
              class="flex-1 justify-center"
              :class="{ '!bg-accent !text-bg': aboutTab === 'author' }"
              :icon="UserRound"
              @click="aboutTab = 'author'"
            >
              版权来源
            </Button>
          </div>
          <!-- 关于 -->
          <div
            v-if="aboutTab === 'about'"
            class="flex flex-col space-y-3 text-sm"
          >
            <p class="text-xs text-muted">
              万象经营修仙，从一亩灵田走向星河仙门。
            </p>
            <div class="border border-accent/20 rounded-xs p-3">
              <p class="text-muted text-xs mb-1">当前版本</p>
              <p class="text-accent">v{{ pkg.version }}</p>
            </div>
            <div class="border border-accent/20 rounded-xs p-3">
              <p class="text-muted text-xs mb-1">游戏定位</p>
              <p class="text-xs leading-relaxed">
                《万象仙乡》以经营、修行、洞天建设、仙界探索和长期养成为核心，正在逐步形成自己的世界观、素材体系和玩法表达。
              </p>
            </div>
            <div class="border border-accent/20 rounded-xs p-3">
              <p class="text-muted text-xs mb-1">制作组</p>
              <p class="text-xs">万象仙乡制作组 · QQ: 3026591236</p>
            </div>
            <div class="border border-accent/20 rounded-xs p-3">
              <p class="text-muted text-xs mb-1">QQ 交流群</p>
              <a
                :href="aboutQqUrl"
                target="_blank"
                class="text-accent underline break-all"
              >
                {{ aboutQqText }}
              </a>
            </div>
            <div class="border border-accent/20 rounded-xs p-3">
              <p class="text-muted text-xs mb-1">TapTap</p>
              <a
                :href="aboutTapTapUrl"
                target="_blank"
                class="text-accent underline break-all"
              >
                {{ aboutTapTapUrl }}
              </a>
            </div>
          </div>

          <!-- 版权与来源 -->
          <div
            v-if="aboutTab === 'author'"
            class="flex flex-col space-y-3 text-sm text-left"
          >
            <p class="text-xs text-muted leading-relaxed">
              当前版本仍处于原创化改造阶段，保留原版作品的署名与非商业许可说明；新增系统、服务端能力与原创素材由万象仙乡制作组持续开发和登记。
            </p>
            <div class="border border-accent/20 rounded-xs p-3">
              <p class="text-muted text-xs mb-1">原版作品</p>
              <a
                href="https://github.com/setube/taoyuan"
                target="_blank"
                rel="noreferrer"
                class="text-accent underline break-all"
              >
                《桃源乡》· setube/taoyuan
              </a>
            </div>
            <div class="border border-accent/20 rounded-xs p-3">
              <p class="text-muted text-xs mb-1">当前许可状态</p>
              <p class="text-xs leading-relaxed">
                CC BY-NC 4.0：须保留署名、注明修改，未经原作者书面授权不得商业使用。
              </p>
            </div>
            <p class="text-[10px] text-muted leading-relaxed">
              详细来源、素材许可和原创化进度见仓库 CREDITS.md、ASSET_LEDGER.md 与 ORIGINALIZATION_PROGRESS.md。
            </p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 角色创建弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showCharCreate && !showFarmSelect"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80"
      >
        <div class="game-panel w-full max-w-xs mx-4 relative">
          <button
            class="absolute top-2 right-2 text-muted hover:text-text"
            @click="handleBackToMenu"
          >
            <X :size="14" />
          </button>
          <p class="text-accent text-sm mb-4 text-center">创建你的角色</p>
          <div class="flex flex-col space-y-4">
            <!-- 名字输入 -->
            <div>
              <label class="text-xs text-muted mb-1 block">你的名字</label>
              <input
                v-model="charName"
                type="text"
                maxlength="4"
                placeholder="请输入你的名字"
                class="w-full px-3 py-2 bg-bg border border-accent/30 rounded-xs text-sm focus:border-accent outline-none"
              />
            </div>
            <!-- 性别选择 -->
            <div>
              <label class="text-xs text-muted mb-1 block">性别</label>
              <div class="flex space-x-3">
                <Button
                  class="flex-1 justify-center py-2"
                  :class="
                    charGender === 'male' ? '!border-accent !bg-accent/10' : ''
                  "
                  @click="charGender = 'male'"
                >
                  男
                </Button>
                <Button
                  class="flex-1 justify-center py-2"
                  :class="
                    charGender === 'female'
                      ? '!border-accent !bg-accent/10'
                      : ''
                  "
                  @click="charGender = 'female'"
                >
                  女
                </Button>
              </div>
            </div>
          </div>
          <div class="flex space-x-3 justify-center mt-4">
            <Button :icon-size="12" :icon="ArrowLeft" @click="handleBackToMenu"
              >返回</Button
            >
            <Button
              class="px-6"
              :disabled="!charName.trim()"
              :icon-size="12"
              :icon="Play"
              @click="handleCharCreateNext"
              >下一步</Button
            >
          </div>
        </div>
      </div>
    </Transition>

    <!-- 灵田洞天选择弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showFarmSelect"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4"
      >
        <div
          class="game-panel w-full max-w-xl max-h-[80vh] flex flex-col relative"
        >
          <button
            class="absolute top-2 right-2 text-muted hover:text-text z-10"
            @click="handleBackToCharCreate"
          >
            <X :size="14" />
          </button>
          <p class="text-accent text-sm mb-3 text-center shrink-0">
            选择你的灵田洞天
          </p>
          <div class="flex-1 overflow-y-auto min-h-0">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <button
                v-for="farm in FARM_MAP_DEFS"
                :key="farm.type"
                class="border border-accent/20 rounded-xs p-3 text-left transition-all cursor-pointer hover:border-accent/50"
                @click="handleSelectFarm(farm.type)"
              >
                <div class="text-sm mb-0.5">{{ farm.name }}</div>
                <div class="text-muted text-xs mb-1">
                  {{ farm.description }}
                </div>
                <div class="text-accent text-xs">{{ farm.bonus }}</div>
              </button>
            </div>
          </div>
          <div class="flex justify-center mt-3 shrink-0">
            <Button
              :icon-size="12"
              :icon="ArrowLeft"
              @click="handleBackToCharCreate"
              >返回</Button
            >
          </div>
        </div>

        <!-- 灵田洞天确认弹窗 -->
        <Transition name="panel-fade">
          <div
            v-if="showFarmConfirm"
            class="fixed inset-0 z-60 flex items-center justify-center bg-bg/80"
            @click.self="showFarmConfirm = false"
          >
            <div class="game-panel w-full max-w-xs mx-4 text-center relative">
              <button
                class="absolute top-2 right-2 text-muted hover:text-text"
                @click="showFarmConfirm = false"
              >
                <X :size="14" />
              </button>
              <Divider title>{{ selectedFarmDef?.name }}</Divider>
              <p class="text-xs text-muted mb-2">
                {{ selectedFarmDef?.description }}
              </p>
              <p class="text-xs text-accent mb-4">
                {{ selectedFarmDef?.bonus }}
              </p>
              <div class="flex space-x-3 justify-center">
                <Button
                  :icon-size="12"
                  :icon="ArrowLeft"
                  @click="showFarmConfirm = false"
                  >取消</Button
                >
                <Button
                  class="px-6"
                  :icon-size="12"
                  :icon="Play"
                  @click="handleNewGame"
                  >开始旅程</Button
                >
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- 旧存档身份设置弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showIdentitySetup"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80"
      >
        <div class="game-panel w-full max-w-xs mx-4 relative">
          <p class="text-accent text-sm mb-2 text-center">设置角色信息</p>
          <p class="text-xs text-muted mb-4 text-center">
            检测到角色信息为空，请设置你的角色信息
          </p>
          <div class="flex flex-col space-y-4">
            <div>
              <label class="text-xs text-muted mb-1 block">你的名字</label>
              <input
                v-model="charName"
                type="text"
                maxlength="4"
                placeholder="请输入你的名字"
                class="w-full px-3 py-2 bg-bg border border-accent/30 rounded-xs text-sm focus:border-accent outline-none"
              />
            </div>
            <div>
              <label class="text-xs text-muted mb-1 block">性别</label>
              <div class="flex space-x-3">
                <Button
                  class="flex-1 justify-center py-2"
                  :class="
                    charGender === 'male' ? '!border-accent !bg-accent/10' : ''
                  "
                  @click="charGender = 'male'"
                >
                  男
                </Button>
                <Button
                  class="flex-1 justify-center py-2"
                  :class="
                    charGender === 'female'
                      ? '!border-accent !bg-accent/10'
                      : ''
                  "
                  @click="charGender = 'female'"
                >
                  女
                </Button>
              </div>
            </div>
          </div>
          <div class="flex justify-center mt-4">
            <Button
              class="px-6"
              :disabled="!charName.trim()"
              :icon-size="12"
              :icon="Play"
              @click="handleIdentityConfirm"
            >
              确认并继续
            </Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 隐私协议弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showPrivacy"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80"
        @click.self="handlePrivacyDecline"
      >
        <div class="game-panel w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
          <h2 class="text-accent text-lg mb-3 text-center">
            <ShieldCheck :size="14" class="inline" />
            隐私协议
          </h2>
          <div
            class="flex-1 overflow-y-auto text-xs text-muted space-y-2 mb-4 pr-1"
          >
            <p>欢迎来到万象仙乡！在开始游戏之前，请阅读以下隐私协议：</p>
            <p class="text-text">1. 数据存储</p>
            <p>
              登录账号后，角色信息和存档数据会保存到服务器数据库；本地也会保留一份浏览器存档用于快速读取。
            </p>
            <p class="text-text">2. 流量统计</p>
            <p>
              本游戏使用第三方统计服务收集匿名访问数据（如页面浏览量、访问时间、设备类型、浏览器信息等），用于分析游戏使用情况和改进体验。这些数据不包含您的个人身份信息。
            </p>
            <p class="text-text">3. 网络通信</p>
            <p>
              账号登录、角色创建、云存档、排行榜、签到、邮件等功能会与服务器通信，以保证退出后数据可恢复、角色名唯一和跨设备继续游戏。
            </p>
            <p class="text-text">4. 数据安全</p>
            <p>
              登录账号后存档会保存到服务器数据库；更换设备时请使用账号云存档继续游戏。
            </p>
            <p class="text-text">5. 第三方服务</p>
            <p>
              本游戏使用的第三方统计服务有其独立的隐私政策，我们不对其数据处理方式负责。游戏中的外部链接指向的第三方网站亦不受本协议约束。
            </p>
            <p class="text-text">6. 协议变更</p>
            <p>
              本协议可能随版本更新而调整，届时将在游戏内重新提示。继续使用即视为同意最新版本的协议。
            </p>
          </div>
          <div class="flex space-x-3 justify-center">
            <Button
              class="!text-sm"
              :icon="ArrowLeft"
              @click="handlePrivacyDecline"
              >不同意</Button
            >
            <Button
              class="!text-sm px-6"
              :icon="ShieldCheck"
              @click="handlePrivacyAgree"
              >同意并继续</Button
            >
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import {
  Play,
  ArrowLeft,
  Info,
  ShieldCheck,
  X,
  UserRound,
  BookOpen,
  Lightbulb,
  Bug,
  MessageSquare,
  Smartphone,
  Trash2,
} from "lucide-vue-next";
import Button from "@/components/game/Button.vue";
import Divider from "@/components/game/Divider.vue";
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useGameStore } from "@/stores/useGameStore";
import { parseSaveData, useSaveStore } from "@/stores/useSaveStore";
import { useFarmStore } from "@/stores/useFarmStore";
import { useAnimalStore } from "@/stores/useAnimalStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useQuestStore } from "@/stores/useQuestStore";
import { useInventoryStore } from "@/stores/useInventoryStore";
import { FARM_MAP_DEFS } from "@/data/farmMaps";
import _pkg from "../../package.json";
import wanxiangHero from "@/assets/wanxiang-hero.svg";
import { useAudio } from "@/composables/useAudio";
import { showFloat, addLog } from "@/composables/useGameLog";
import { resetAllStoresForNewGame } from "@/composables/useResetGame";
import { useTutorialStore } from "@/stores/useTutorialStore";
import type { FarmMapType, Gender } from "@/types";
import { Capacitor } from "@capacitor/core";

const router = useRouter();
const { startBgm } = useAudio();
const pkg = _pkg as typeof _pkg & {
  title: string;
  qq: string;
  version: string;
  name: string;
  author: string;
};

const gameStore = useGameStore();
const saveStore = useSaveStore();
const farmStore = useFarmStore();
const animalStore = useAnimalStore();
const playerStore = usePlayerStore();
const questStore = useQuestStore();
const inventoryStore = useInventoryStore();

const slots = ref(saveStore.getSlots());
const showCharCreate = ref(false);
const showFarmSelect = ref(false);
const showIdentitySetup = ref(false);
const showAbout = ref(false);
const aboutTab = ref<"about" | "author">("about");
const slotMenuOpen = ref<number | null>(null);
const selectedMap = ref<FarmMapType>("standard");
const charName = ref("");
const charGender = ref<Gender>("male");
const showPrivacy = ref(false);
const showFarmConfirm = ref(false);
const deleteSaveTarget = ref<any>(null);
const deleteSaveConfirmText = ref("");
const deletingSaveSlot = ref<number | null>(null);

const accountUsername = ref("");
const accountPassword = ref("");
const accountUser = ref<any>(null);
const serverConfig = ref<any>({
  siteName: "万象仙乡",
  announcement: "",
  announcementIntervalHours: 24,
  updateLogs: [],
  registrationEnabled: true,
  maintenanceMode: false,
  iosDownloadUrl: "",
  androidDownloadUrl: "",
});
const aboutQqText = computed(
  () => serverConfig.value?.aboutQqText || (pkg as any).qq || "QQ 交流群",
);
const aboutQqUrl = computed(
  () => serverConfig.value?.aboutQqUrl || "https://qm.qq.com/q/2BVaTTwDkI",
);
const aboutTapTapUrl = computed(
  () =>
    serverConfig.value?.aboutTapTapUrl ||
    `https://www.taptap.cn/app/${(pkg as any).tapid}`,
);
const iosDownloadUrl = computed(() =>
  String(serverConfig.value?.iosDownloadUrl || "").trim(),
);
const androidDownloadUrl = computed(() =>
  String(serverConfig.value?.androidDownloadUrl || "").trim(),
);
const accountSaves = ref<any[]>([]);
const accountCharacters = ref<any[]>([]);
const showAnnouncement = ref(false);
const showUpdateLogs = ref(false);
const HOME_FEEDBACK_CATEGORIES = [
  { key: "feature", label: "功能反馈", icon: Lightbulb },
  { key: "bug", label: "BUG反馈", icon: Bug },
  { key: "suggestion", label: "意见提交", icon: MessageSquare },
] as const;
const showHomeFeedback = ref(false);
const homeFeedbackCategory = ref<"feature" | "bug" | "suggestion">("feature");
const homeFeedbackTitle = ref("");
const homeFeedbackContent = ref("");
const homeFeedbackBusy = ref(false);
const homeFeedbackMsg = ref("");
const homeFeedbackOk = ref(false);
const homeFeedbackLabel = computed(
  () =>
    HOME_FEEDBACK_CATEGORIES.find((c) => c.key === homeFeedbackCategory.value)
      ?.label || "提交反馈",
);
const accountToken = () => localStorage.getItem("taoyuan_account_token") || "";
const openAdminImmortalPreview = async () => {
  const token = accountToken();
  if (!token || accountUser.value?.role !== "admin") {
    showFloat("只有管理员账号可使用仙界预览。", "danger");
    return;
  }
  try {
    const res = await fetch("/api/admin/config", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("管理员权限验证失败");
    localStorage.setItem("taoyuan_admin_immortal_preview", "1");
    router.push("/game/immortal-world?adminPreview=1");
  } catch (e: any) {
    showFloat(e?.message || "管理员权限验证失败", "danger");
  }
};
const accountHeaders = () => ({
  "content-type": "application/json",
  authorization: `Bearer ${accountToken()}`,
});
const accountApi = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "请求失败");
  return data;
};
const openHomeFeedback = (category: "feature" | "bug" | "suggestion") => {
  homeFeedbackCategory.value = category;
  homeFeedbackTitle.value = "";
  homeFeedbackContent.value = "";
  homeFeedbackMsg.value = "";
  homeFeedbackOk.value = false;
  showHomeFeedback.value = true;
};
const submitHomeFeedback = async () => {
  if (homeFeedbackBusy.value) return;
  homeFeedbackBusy.value = true;
  homeFeedbackMsg.value = "";
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = accountToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const data = await accountApi("/api/feedbacks", {
      method: "POST",
      headers,
      body: JSON.stringify({
        category: homeFeedbackCategory.value,
        title: homeFeedbackTitle.value.trim(),
        content: homeFeedbackContent.value.trim(),
        playerName: accountCharacters.value[0]?.meta?.playerName || "",
      }),
    });
    homeFeedbackOk.value = true;
    homeFeedbackMsg.value = data?.message || "感谢反馈！管理员会尽快查看。";
    homeFeedbackTitle.value = "";
    homeFeedbackContent.value = "";
    window.setTimeout(() => {
      showHomeFeedback.value = false;
    }, 900);
  } catch (e: any) {
    homeFeedbackOk.value = false;
    homeFeedbackMsg.value = e.message || "提交失败，请稍后重试。";
  } finally {
    homeFeedbackBusy.value = false;
  }
};
const loadServerConfig = async () => {
  try {
    serverConfig.value = await accountApi("/api/config");
    maybeShowAnnouncement();
  } catch {}
};
const maybeShowAnnouncement = () => {
  const text = String(serverConfig.value?.announcement || "").trim();
  if (!text) return;
  const hours = Number(serverConfig.value?.announcementIntervalHours ?? 24);
  const announcementVersion = `${text}|${String(serverConfig.value?.updateLogs?.[0]?.title || "")}`;
  let hash = 0;
  for (let i = 0; i < announcementVersion.length; i++)
    hash = (hash * 31 + announcementVersion.charCodeAt(i)) >>> 0;
  const key = `taoyuan_announcement_last_shown_at_${hash}`;
  const last = Number(localStorage.getItem(key) || "0");
  const now = Date.now();
  if (!last || hours <= 0 || now - last >= hours * 3600 * 1000) {
    window.setTimeout(() => {
      showAnnouncement.value = true;
    }, 300);
    localStorage.setItem(key, String(now));
  }
};
const loadAccountMe = async () => {
  try {
    accountUser.value = (
      await accountApi("/api/me", { headers: accountHeaders() })
    ).user;
    if (accountUser.value) {
      await loadAccountCharacters();
      await loadAccountSaves();
    }
  } catch {
    accountUser.value = null;
    accountSaves.value = [];
    accountCharacters.value = [];
  }
};
const loadAccountCharacters = async () => {
  try {
    if (!accountToken()) return;
    accountCharacters.value =
      (await accountApi("/api/characters", { headers: accountHeaders() }))
        .characters || [];
  } catch {
    accountCharacters.value = [];
  }
};
const loadAccountSaves = async () => {
  try {
    if (!accountToken()) return;
    const data = await accountApi("/api/saves", { headers: accountHeaders() });
    accountSaves.value = Array.isArray(data.saves)
      ? data.saves
      : Object.values(data.saves || {});
  } catch {
    accountSaves.value = [];
  }
};
const nextAccountSlot = computed(() => {
  const used = new Set(accountCharacters.value.map((c) => Number(c.slot)));
  for (let i = 0; i < 3; i++) if (!used.has(i)) return i;
  return -1;
});
const handleNewJourneyClick = () => {
  if (!accountUser.value) {
    showFloat("请先登录或注册账号，再创建角色。", "danger");
    return;
  }
  if (accountCharacters.value.length >= 3) {
    showFloat("当前账号最多创建3个角色。", "danger");
    return;
  }
  showPrivacy.value = true;
};
const openDeleteSaveConfirm = (character: any) => {
  deleteSaveTarget.value = character;
  deleteSaveConfirmText.value = "";
};
const closeDeleteSaveConfirm = () => {
  if (deletingSaveSlot.value !== null) return;
  deleteSaveTarget.value = null;
  deleteSaveConfirmText.value = "";
};
const deleteAccountSave = async () => {
  const target = deleteSaveTarget.value;
  if (!target || deleteSaveConfirmText.value !== "删除存档") return;
  const slot = Number(target.slot);
  deletingSaveSlot.value = slot;
  try {
    await accountApi(`/api/saves/${slot}`, {
      method: "DELETE",
      headers: accountHeaders(),
    });
    saveStore.deleteSlot(slot);
    localStorage.removeItem(`taoyuan_cloud_loaded_at_${slot}`);
    if (localStorage.getItem("taoyuan_active_slot") === String(slot))
      localStorage.removeItem("taoyuan_active_slot");
    await loadAccountCharacters();
    await loadAccountSaves();
    refreshSlots();
    showFloat("存档已删除。", "success");
    closeDeleteSaveConfirm();
  } catch (e: any) {
    showFloat(e.message || "删除存档失败。", "danger");
  } finally {
    deletingSaveSlot.value = null;
  }
};
const continueCharacter = async (character: any) => {
  if (!character) return;
  // 角色列表和存档摘要可能因网络请求先后不同步；继续游戏应以服务端 slot 实际存档为准。
  // downloadCloudSaveToLocal 会在账号校验后直接读取云端，避免已有存档被前端摘要误判为不存在。
  await downloadCloudSaveToLocal(Number(character.slot));
};
const downloadCloudSaveToLocal = async (slot: number) => {
  showAnnouncement.value = false;
  showUpdateLogs.value = false;
  try {
    const data = await accountApi(`/api/saves/${slot}`, {
      headers: accountHeaders(),
    });
    if (!saveStore.importSave(slot, data.raw))
      throw new Error("云端存档无效或已损坏");
    if (data.updatedAt)
      localStorage.setItem(
        `taoyuan_cloud_loaded_at_${slot}`,
        String(data.updatedAt),
      );
    localStorage.setItem("taoyuan_active_slot", String(slot));
    refreshSlots();
    showFloat("继续游戏。", "success");
    handleLoadGame(slot);
  } catch (e: any) {
    showFloat(e.message || "继续游戏失败。", "danger");
  }
};
const loginAccount = async () => {
  try {
    const data = await accountApi("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: accountUsername.value,
        password: accountPassword.value,
      }),
    });
    localStorage.setItem("taoyuan_account_token", data.token);
    accountUser.value = data.user;
    await loadAccountCharacters();
    await loadAccountSaves();
    showFloat("登录成功。", "success");
  } catch (e: any) {
    showFloat(e.message || "登录失败。", "danger");
  }
};
const registerAccount = async () => {
  try {
    const data = await accountApi("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: accountUsername.value,
        password: accountPassword.value,
      }),
    });
    localStorage.setItem("taoyuan_account_token", data.token);
    accountUser.value = data.user;
    await loadAccountCharacters();
    await loadAccountSaves();
    showFloat(data.message || "注册成功。", "success");
  } catch (e: any) {
    showFloat(e.message || "注册失败。", "danger");
  }
};
const logoutAccount = async () => {
  try {
    await accountApi("/api/auth/logout", {
      method: "POST",
      headers: accountHeaders(),
    });
  } catch {}
  localStorage.removeItem("taoyuan_account_token");
  accountUser.value = null;
  accountSaves.value = [];
  accountCharacters.value = [];
  showFloat("已退出账号。");
};
onMounted(() => {
  void loadServerConfig();
  void loadAccountMe();
});

const selectedFarmDef = computed(() =>
  FARM_MAP_DEFS.find((f) => f.type === selectedMap.value),
);

const handleSelectFarm = (type: FarmMapType) => {
  selectedMap.value = type;
  showFarmConfirm.value = true;
};

const handlePrivacyAgree = () => {
  localStorage.setItem("taoyuan_privacy_agreed", "1");
  showPrivacy.value = false;
  showCharCreate.value = true;
};

const handlePrivacyDecline = () => {
  showPrivacy.value = false;
};

const refreshSlots = () => {
  slots.value = saveStore.getSlots();
};

const handleBackToMenu = () => {
  showCharCreate.value = false;
  showFarmSelect.value = false;
  selectedMap.value = "standard";
  charName.value = "";
  charGender.value = "male";
};

const handleCharCreateNext = async () => {
  const name = charName.value.trim().slice(0, 4);
  if (!name) return;
  if (!accountUser.value) {
    showFloat("请先登录账号。", "danger");
    return;
  }
  try {
    await accountApi(`/api/check-char-name?name=${encodeURIComponent(name)}`, {
      headers: accountHeaders(),
    });
    showFarmSelect.value = true;
  } catch (e: any) {
    showFloat(e.message || "角色名已被使用。", "danger");
  }
};

const handleBackToCharCreate = () => {
  showFarmSelect.value = false;
  showFarmConfirm.value = false;
};

const handleNewGame = async () => {
  // 账号角色固定使用 0-2 槽位；本地仅作为运行缓存。
  const slot = nextAccountSlot.value;
  if (slot < 0) {
    showFloat("当前账号最多创建3个角色。", "danger");
    return;
  }
  // 重置所有游戏 store 到初始状态，防止上一个存档数据残留
  resetAllStoresForNewGame();
  playerStore.setIdentity(
    (charName.value.trim() || "未命名").slice(0, 4),
    charGender.value,
  );
  gameStore.startNewGame(selectedMap.value);
  // 标准灵田初始6×6，其余4×4
  farmStore.resetFarm(selectedMap.value === "standard" ? 6 : 4);
  // 新手赠送：10个青菜种子
  inventoryStore.addItem("seed_cabbage", 10);
  // 草地灵田：免费鸡舍 + 2只鸡
  if (selectedMap.value === "meadowlands") {
    const coop = animalStore.buildings.find((b) => b.type === "coop");
    if (coop) {
      coop.built = true;
      coop.level = 1;
    }
    animalStore.animals.push(
      {
        id: "chicken_init_1",
        type: "chicken",
        name: "小花",
        friendship: 100,
        mood: 200,
        daysOwned: 0,
        daysSinceProduct: 0,
        wasFed: false,
        fedWith: null,
        wasPetted: false,
        hunger: 0,
        sick: false,
        sickDays: 0,
      },
      {
        id: "chicken_init_2",
        type: "chicken",
        name: "小白",
        friendship: 100,
        mood: 200,
        daysOwned: 0,
        daysSinceProduct: 0,
        wasFed: false,
        fedWith: null,
        wasPetted: false,
        hunger: 0,
        sick: false,
        sickDays: 0,
      },
    );
  }
  questStore.initMainQuest();
  if (!saveStore.saveToSlot(slot)) {
    showFloat("初始存档失败，请重试。", "danger");
    return;
  }
  const raw = localStorage.getItem(`taoyuanxiang_save_${slot}`);
  const info = saveStore.getSlots().find((s) => s.slot === slot);
  try {
    const data = raw ? parseSaveData(raw) : null;
    const created = await accountApi("/api/characters", {
      method: "POST",
      headers: accountHeaders(),
      body: JSON.stringify({
        name: (charName.value.trim() || "未命名").slice(0, 4),
        gender: charGender.value,
        slot,
        raw,
        data,
        meta: info || {},
      }),
    });
    if (created?.character?.id)
      localStorage.setItem("taoyuan_active_character_id", String(created.character.id));
    if (created?.updatedAt)
      localStorage.setItem(`taoyuan_cloud_loaded_at_${slot}`, String(created.updatedAt));
    await loadAccountCharacters();
    await loadAccountSaves();
  } catch (e: any) {
    saveStore.deleteSlot(slot);
    showFloat(e.message || "创建角色失败。", "danger");
    return;
  }
  // 新手引导：游戏开始时立即显示欢迎提示
  const tutorialStore = useTutorialStore();
  if (tutorialStore.enabled) {
    addLog(
      "陆镇岳说：「欢迎来到万象仙乡！背包里有白菜种子，去灵田开垦土地、播种吧。」",
    );
    tutorialStore.markTipShown("tip_welcome");
  }
  void router.push("/game");
};

const handleLoadGame = (slot: number) => {
  showAnnouncement.value = false;
  showUpdateLogs.value = false;
  if (saveStore.loadFromSlot(slot)) {
    if (playerStore.needsIdentitySetup) {
      // 旧存档没有性别/名字数据，先让玩家设置
      showIdentitySetup.value = true;
    } else {
      void router.push("/game");
    }
  }
};

/** 旧存档身份设置完成 */
const handleIdentityConfirm = () => {
  playerStore.setIdentity(
    (charName.value.trim() || "未命名").slice(0, 4),
    charGender.value,
  );
  showIdentitySetup.value = false;
  void router.push("/game");
};
</script>

<style scoped>
.logo {
  width: 50px;
  height: 50px;
  background: url(@/assets/wanxiang-logo.svg) center / contain no-repeat;
  filter: drop-shadow(0 0 12px rgba(247, 211, 105, 0.55));
  flex-shrink: 0;
}

.wanxiang-hero-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(248, 211, 105, 0.42);
  box-shadow:
    0 0 0 1px rgba(107, 255, 232, 0.18),
    0 22px 70px rgba(31, 13, 80, 0.38),
    inset 0 0 34px rgba(122, 93, 255, 0.2);
}
.wanxiang-hero-card::before {
  content: "";
  position: absolute;
  inset: -35%;
  background: conic-gradient(
    from 120deg,
    transparent,
    rgba(255, 239, 151, 0.24),
    rgba(113, 255, 228, 0.18),
    transparent 42%
  );
  animation: wanxiangHeroHalo 11s linear infinite;
  pointer-events: none;
}
.wanxiang-hero-card::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    110deg,
    transparent 0 38%,
    rgba(255, 255, 255, 0.22) 48%,
    transparent 58% 100%
  );
  transform: translateX(-120%);
  animation: wanxiangHeroSweep 5.8s ease-in-out infinite;
  pointer-events: none;
}
.wanxiang-hero-card .home-pixel-scene__image,
.wanxiang-hero-card .home-pixel-scene__caption {
  position: relative;
  z-index: 1;
}
@keyframes wanxiangHeroHalo {
  to {
    transform: rotate(360deg);
  }
}
@keyframes wanxiangHeroSweep {
  0%,
  42% {
    transform: translateX(-125%);
  }
  64%,
  100% {
    transform: translateX(125%);
  }
}
</style>
