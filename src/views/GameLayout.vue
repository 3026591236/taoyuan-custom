<template>
  <div
    v-if="gameStore.isGameStarted"
    class="flex flex-col space-y-2 md:space-y-4 h-screen p-2 md:p-4"
    :class="{ 'py-10': Capacitor.isNativePlatform() }"
  >
    <!-- 状态栏 -->
    <StatusBar @request-sleep="showSleepConfirm = true" />

    <Button
      class="text-center justify-center !text-sm"
      :icon="Moon"
      :icon-size="12"
      @click.stop="showSleepConfirm = true"
    >
      {{ sleepLabel }}
    </Button>

    <div v-if="nextJourneyTask && !isImmortalRoute" class="daily-hook-card">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 mb-1">
            <span
              class="text-[10px] px-1 border border-accent/30 rounded-xs text-accent"
              >今日机缘</span
            >
            <span class="text-[10px] text-success truncate"
              >{{ gameStore.dailyFate.name }} ·
              {{ gameStore.dailyFate.bonusText }}</span
            >
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-sm">🎯</span>
            <span class="text-xs text-accent font-bold truncate">{{
              nextJourneyTask.title
            }}</span>
            <span
              v-if="questStore.journeySummary.claimable > 0"
              class="text-[10px] text-success"
              >可领{{ questStore.journeySummary.claimable }}</span
            >
          </div>
          <p class="text-[11px] text-muted leading-relaxed mt-1 truncate">
            {{ nextJourneyTask.desc }}
          </p>
          <div class="mt-1 flex items-center gap-2">
            <div
              class="flex-1 h-1.5 bg-bg rounded-xs border border-accent/10 overflow-hidden"
            >
              <div
                class="h-full bg-accent transition-all"
                :style="{
                  width:
                    Math.min(
                      100,
                      Math.floor(
                        (nextJourneyTask.progress / nextJourneyTask.target) *
                          100,
                      ),
                    ) + '%',
                }"
              />
            </div>
            <span class="text-[10px] text-muted whitespace-nowrap"
              >{{
                Math.min(nextJourneyTask.progress, nextJourneyTask.target)
              }}/{{ nextJourneyTask.target }}</span
            >
          </div>
        </div>
        <div class="flex flex-col gap-1 shrink-0">
          <Button
            v-if="nextJourneyTask.done && !nextJourneyTask.claimed"
            class="!px-2 !py-1 text-[10px] !bg-accent !text-bg"
            @click="claimNextJourney"
            >领取</Button
          >
          <Button class="!px-2 !py-1 text-[10px]" @click="goJourneyTarget"
            >前往</Button
          >
        </div>
      </div>
    </div>

    <!-- 内容 -->
    <div class="game-panel flex-1 min-h-0 overflow-y-auto">
      <router-view v-slot="{ Component }">
        <Transition name="panel-fade" mode="out-in">
          <component :is="Component" :key="$route.path" />
        </Transition>
      </router-view>
    </div>

    <!-- 移动端地图按钮 -->
    <button class="mobile-map-btn" @click="showMobileMap = true">
      <Map :size="20" />
    </button>
    <button
      class="quick-use-float-btn"
      title="快捷栏"
      @click="openQuickUsePicker"
    >
      <Zap :size="18" />
      <span>快捷</span>
    </button>
    <Transition name="panel-fade">
      <div
        v-if="showQuickUsePicker"
        class="quick-use-picker-mask"
        @click.self="showQuickUsePicker = false"
      >
        <div class="quick-use-picker game-panel">
          <button
            class="absolute top-2 right-2 text-muted hover:text-text"
            @click="showQuickUsePicker = false"
          >
            <X :size="14" />
          </button>
          <p class="text-sm text-accent mb-2">快捷使用</p>
          <p class="text-[10px] text-muted mb-2">
            可在背包中加入最多5个快捷物品。
          </p>
          <div v-if="inventoryStore.equipmentPresets.length" class="mb-3">
            <p class="text-[10px] text-muted mb-1">
              快捷换装（已保存 {{ inventoryStore.equipmentPresets.length }}/{{
                MAX_EQUIPMENT_PRESETS
              }}
              套）
            </p>
            <div class="grid grid-cols-2 gap-1.5">
              <button
                v-for="preset in inventoryStore.equipmentPresets"
                :key="preset.id"
                class="quick-preset-btn"
                :class="{ active: inventoryStore.activePresetId === preset.id }"
                @click="handleQuickPreset(preset.id)"
              >
                <BookMarked :size="13" />
                <span class="truncate">{{ preset.name }}</span>
              </button>
            </div>
          </div>
          <div class="grid grid-cols-5 gap-1.5">
            <button
              v-for="slot in quickUseSlots"
              :key="slot.index"
              class="quick-use-slot"
              :class="slot.item ? 'filled' : ''"
              @click="handleQuickSlotClick(slot)"
            >
              <template v-if="slot.item">
                <span class="truncate">{{ slot.name }}</span>
                <em>×{{ slot.quantity }}</em>
              </template>
              <template v-else>
                <span>空</span>
                <em>设置</em>
              </template>
            </button>
          </div>
        </div>
      </div>
    </Transition>
    <button class="mobile-setting-btn" @click="showSettings = true">
      <SettingsIcon :size="20" />
    </button>

    <!-- 虚空箱远程访问按钮 -->
    <button
      v-if="warehouseStore.hasVoidChest"
      class="mobile-void-btn"
      @click="showVoidModal = true"
    >
      <Archive :size="20" />
    </button>
    <!-- 日志按钮 -->
    <button
      class="mobile-log-btn"
      :class="{ 'with-void': warehouseStore.hasVoidChest }"
      @click="showLogModal = true"
    >
      <History :size="20" />
    </button>

    <button
      v-if="floatingWelfare.enabled"
      class="floating-welfare-btn"
      @click="showFloatingWelfare = true"
    >
      <Gift :size="18" />
      <span>{{ floatingWelfare.buttonText || "福利" }}</span>
      <em v-if="claimableFloatingWelfareCount > 0">{{
        claimableFloatingWelfareCount
      }}</em>
    </button>

    <Transition name="panel-fade">
      <div
        v-if="showMailModal"
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
        @click.self="showMailModal = false"
      >
        <div
          class="game-panel w-full max-w-2xl max-h-[82vh] overflow-y-auto space-y-3"
        >
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-accent text-lg">系统邮件</h2>
            <Button @click="showMailModal = false">关闭</Button>
          </div>
          <p class="text-xs text-muted">
            领取奖励后会立即写入当前游戏，并触发一次自动存档。
          </p>
          <div v-if="mailLoading" class="text-sm text-muted">邮件加载中…</div>
          <div v-else-if="mails.length === 0" class="text-sm text-muted">
            暂无邮件。
          </div>
          <div
            v-for="mail in mails"
            :key="mail.id"
            class="border border-accent/20 rounded-xs p-3 space-y-2"
          >
            <div class="flex flex-wrap justify-between gap-2">
              <div>
                <div class="text-accent">{{ mail.title }}</div>
                <div class="text-xs text-muted">
                  {{ formatMailTime(mail.createdAt) }} /
                  {{ mail.from || "系统" }}
                </div>
              </div>
              <span
                class="text-xs"
                :class="mail.claimed ? 'text-muted' : 'text-accent'"
                >{{ mail.claimed ? "已领取" : "未领取" }}</span
              >
            </div>
            <p v-if="mail.content" class="text-sm whitespace-pre-wrap">
              {{ mail.content }}
            </p>
            <div class="text-xs text-muted">
              奖励：{{ mailRewardText(mail.rewards) }}
            </div>
            <Button
              v-if="!mail.claimed"
              class="w-full justify-center"
              @click="claimMail(mail)"
              >领取奖励</Button
            >
          </div>
        </div>
      </div>
    </Transition>

    <!-- 悬浮福利弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showFloatingWelfare"
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-[110] p-4"
        @click.self="showFloatingWelfare = false"
      >
        <div
          class="game-panel max-w-md w-full max-h-[82vh] overflow-y-auto space-y-3"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-accent text-lg">
                {{ floatingWelfare.title || "仙乡福缘" }}
              </p>
              <p class="text-xs text-muted leading-relaxed mt-1">
                {{ floatingWelfare.desc || "点击领取当前可用福利。" }}
              </p>
            </div>
            <Button class="py-0 px-2" @click="showFloatingWelfare = false"
              >关闭</Button
            >
          </div>
          <div
            v-if="activeFloatingWelfareGifts.length === 0"
            class="text-sm text-muted border border-accent/15 rounded-xs p-3 text-center"
          >
            当前暂无可用福利。
          </div>
          <div
            v-for="gift in activeFloatingWelfareGifts"
            :key="gift.id"
            class="floating-welfare-card"
            :class="{ claimed: isFloatingGiftClaimed(gift) }"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-sm text-accent">{{ gift.title }}</p>
                <p class="text-[10px] text-muted leading-relaxed mt-1">
                  {{ gift.desc }}
                </p>
              </div>
              <span
                class="text-[10px] px-1 border border-accent/20 rounded-xs text-muted whitespace-nowrap"
                >{{ floatingGiftResetText(gift) }}</span
              >
            </div>
            <p class="text-xs text-muted mt-2">
              奖励：{{ floatingRewardText(gift.rewards) }}
            </p>
            <Button
              class="w-full justify-center mt-2"
              :disabled="isFloatingGiftClaimed(gift)"
              @click="claimFloatingWelfare(gift)"
            >
              {{ isFloatingGiftClaimed(gift) ? "已领取" : "领取福利" }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 世界公告滚动弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="worldAnnouncement"
        class="world-announcement-marquee fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
      >
        <div class="world-announcement-box">
          <span :style="worldAnnouncementStyle">{{ worldAnnouncement }}</span>
        </div>
      </div>
    </Transition>

    <!-- V0.9 回访奖励 / 爽感弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="rewardBurst"
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-[120] p-4"
        @click.self="rewardBurst = null"
      >
        <div
          class="reward-burst-panel game-panel max-w-sm w-full text-center space-y-3"
        >
          <div class="text-3xl">{{ rewardBurst.emoji }}</div>
          <div>
            <p class="text-accent text-base font-bold">
              {{ rewardBurst.title }}
            </p>
            <p
              class="text-xs text-muted mt-1 leading-relaxed whitespace-pre-line"
            >
              {{ rewardBurst.desc }}
            </p>
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div
              v-for="(line, i) in rewardBurst.lines"
              :key="i"
              class="reward-line"
            >
              {{ line }}
            </div>
          </div>
          <Button
            class="w-full justify-center !bg-accent !text-bg"
            @click="rewardBurst = null"
            >收下奖励</Button
          >
        </div>
      </div>
    </Transition>

    <SettingsDialog :open="showSettings" @close="showSettings = false" />
    <SaveManager v-if="showSaveManager" @close="showSaveManager = false" />

    <!-- 移动端地图菜单 -->
    <MobileMapMenu
      :open="showMobileMap"
      :current="currentPanel"
      :checkin-checked="checkinChecked"
      :checkin-busy="checkinBusy"
      :unclaimed-mail-count="unclaimedMailCount"
      @checkin="dailyCheckin"
      @open-mail="openMailModal"
      @open-leaderboard="openLeaderboard"
      @open-combat="openCombat"
      @open-forge="openForge"
      @open-sect="openSect"
      @close="showMobileMap = false"
    />

    <!-- 季节事件弹窗 -->
    <Transition name="panel-fade">
      <EventDialog
        v-if="currentEvent"
        :event="currentEvent"
        @close="closeEvent"
      />
    </Transition>

    <!-- 心事件弹窗 -->
    <Transition name="panel-fade">
      <HeartEventDialog
        v-if="pendingHeartEvent"
        :event="pendingHeartEvent"
        @close="closeHeartEvent"
      />
    </Transition>

    <!-- 仙灵发现场景弹窗 -->
    <Transition name="panel-fade">
      <DiscoveryScene
        v-if="pendingDiscoveryScene"
        :npc-id="pendingDiscoveryScene.npcId"
        :step="pendingDiscoveryScene.step"
        @close="closeDiscoveryScene"
      />
    </Transition>

    <!-- 互动节日 -->
    <Transition name="panel-fade">
      <div
        v-if="currentFestival"
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      >
        <FishingContestView
          v-if="currentFestival === 'fishing_contest'"
          @complete="closeFestival"
        />
        <HarvestFairView
          v-if="currentFestival === 'harvest_fair'"
          @complete="closeFestival"
        />
        <DragonBoatView
          v-if="currentFestival === 'dragon_boat'"
          @complete="closeFestival"
        />
        <LanternRiddleView
          v-if="currentFestival === 'lantern_riddle'"
          @complete="closeFestival"
        />
        <PotThrowingView
          v-if="currentFestival === 'pot_throwing'"
          @complete="closeFestival"
        />
        <DumplingMakingView
          v-if="currentFestival === 'dumpling_making'"
          @complete="closeFestival"
        />
        <FireworkShowView
          v-if="currentFestival === 'firework_show'"
          @complete="closeFestival"
        />
        <TeaContestView
          v-if="currentFestival === 'tea_contest'"
          @complete="closeFestival"
        />
        <KiteFlyingView
          v-if="currentFestival === 'kite_flying'"
          @complete="closeFestival"
        />
      </div>
    </Transition>

    <!-- 技能专精选择弹窗 -->
    <Transition name="panel-fade">
      <PerkSelectDialog
        v-if="pendingPerk"
        :skill-type="pendingPerk.skillType"
        :level="pendingPerk.level"
        @select="handlePerkSelect"
      />
    </Transition>

    <!-- 宠物领养弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="pendingPetAdoption"
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      >
        <div class="game-panel max-w-xs w-full text-center">
          <Divider title label="小动物来访" />
          <p class="text-xs leading-relaxed mb-3">
            一只小动物在你家门口徘徊，看起来很想有个家。你要收养它吗？
          </p>
          <div class="flex space-x-3 justify-center mb-3">
            <Button
              :class="petChoice === 'cat' ? '!bg-accent !text-bg' : ''"
              @click="petChoice = 'cat'"
              >猫</Button
            >
            <Button
              :class="petChoice === 'dog' ? '!bg-accent !text-bg' : ''"
              @click="petChoice = 'dog'"
              >狗</Button
            >
          </div>
          <div v-if="petChoice" class="mb-3">
            <p class="text-xs text-muted mb-1">给它取个名字：</p>
            <input
              v-model="petNameInput"
              class="w-full bg-bg border border-accent/30 rounded-xs px-2 py-1 text-xs text-text focus:border-accent accent outline-none placeholder:text-muted/40 transition-colors"
              :placeholder="petChoice === 'cat' ? '小花' : '旺财'"
              maxlength="8"
            />
          </div>
          <Button :disabled="!petChoice" @click="confirmPetAdoption"
            >领养</Button
          >
        </div>
      </div>
    </Transition>

    <!-- 子女提议弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="childProposalVisible"
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      >
        <div class="game-panel max-w-xs w-full text-center">
          <Divider title label="家庭提议" />
          <p class="text-xs leading-relaxed mb-4">
            {{
              proposalSpouseName
            }}轻声说道：「最近我在想，我们是不是该要个孩子了？」
          </p>
          <div class="flex flex-col space-y-1.5">
            <Button
              class="w-full justify-center"
              @click="handleChildProposalResponse('accept')"
              >「我也这么想。」</Button
            >
            <Button
              class="w-full justify-center"
              @click="handleChildProposalResponse('wait')"
              >「再等等吧。」</Button
            >
            <Button
              class="w-full justify-center text-muted"
              @click="handleChildProposalResponse('decline')"
              >「现在还不是时候。」</Button
            >
          </div>
        </div>
      </div>
    </Transition>

    <!-- 晨间选项事件弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="pendingFarmEvent"
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      >
        <div class="game-panel max-w-xs w-full text-center">
          <p class="text-xs leading-relaxed mb-4">
            {{ pendingFarmEvent.message }}
          </p>
          <div class="flex flex-col space-y-1.5">
            <Button
              v-for="(c, i) in pendingFarmEvent.choices"
              :key="i"
              class="w-full justify-center"
              @click="handleFarmEventChoice(c)"
            >
              {{ c.label }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 虚空箱远程存取弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showVoidModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showVoidModal = false"
      >
        <div class="game-panel max-w-sm w-full">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm text-accent">
              <Archive :size="14" class="inline" />
              虚空箱
            </p>
            <Button
              class="py-0 px-1"
              :icon="X"
              :icon-size="12"
              @click="showVoidModal = false"
            />
          </div>

          <!-- 虚空箱列表 -->
          <div class="flex flex-col space-y-1.5">
            <div
              v-for="vc in voidChests"
              :key="vc.id"
              @click="toggleVoidChest(vc.id)"
              class="border border-accent/10 rounded-xs p-2 cursor-pointer"
            >
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center space-x-1.5">
                  <span class="text-xs text-quality-supreme">{{
                    vc.label
                  }}</span>
                  <span
                    v-if="vc.voidRole === 'input'"
                    class="text-[10px] px-1 border border-accent/30 rounded-xs text-accent"
                    >原料箱</span
                  >
                  <span
                    v-if="vc.voidRole === 'output'"
                    class="text-[10px] px-1 border border-accent/30 rounded-xs text-accent"
                  >
                    成品箱
                  </span>
                </div>
                <span class="text-[10px] text-muted"
                  >{{ vc.items.length }}/{{ voidChestCapacity }}</span
                >
              </div>

              <!-- 展开的物品列表 -->
              <template v-if="expandedVoidChestId === vc.id">
                <div
                  v-if="vc.items.length > 0"
                  class="flex flex-col space-y-0.5 mb-1.5 max-h-36 overflow-y-auto"
                >
                  <div
                    v-for="(item, idx) in vc.items"
                    :key="idx"
                    class="flex items-center justify-between px-2 py-0.5 border border-accent/5 rounded-xs mr-1"
                    @click.stop="
                      voidItemDetail = {
                        itemId: item.itemId,
                        quality: item.quality,
                        quantity: item.quantity,
                      }
                    "
                  >
                    <span
                      class="text-[10px] truncate mr-2 cursor-pointer hover:underline"
                      :class="voidQualityClass(item.quality)"
                    >
                      {{ getItemName(item.itemId) }}
                      <span class="text-[10px] text-muted"
                        >&times;{{ item.quantity }}</span
                      >
                    </span>
                    <div class="flex items-center space-x-1">
                      <Button
                        class="py-0 px-1 text-[10px]"
                        @click.stop="
                          openVoidQtyModal(
                            'withdraw',
                            vc.id,
                            item.itemId,
                            item.quality,
                            item.quantity,
                          )
                        "
                      >
                        取出
                      </Button>
                    </div>
                  </div>
                </div>
                <div
                  v-else
                  class="flex flex-col items-center justify-center py-4"
                >
                  <Archive :size="28" class="text-accent/20 mb-1.5" />
                  <p class="text-[10px] text-muted">箱子是空的</p>
                  <p class="text-[10px] text-muted/50 mt-0.5">
                    点击下方「存入」添加
                  </p>
                </div>
                <Button
                  v-if="voidDuplicateDepositItems.length > 0"
                  class="w-full text-[10px] mb-1"
                  :icon="ArrowDownToLine"
                  :icon-size="10"
                  @click.stop="handleVoidDepositDuplicates"
                >
                  一键存入重复物品
                </Button>
                <Button
                  v-if="voidDepositableItems.length > 0"
                  class="w-full text-[10px]"
                  :icon="ArrowDown"
                  :icon-size="10"
                  @click.stop="openVoidDeposit(vc.id)"
                >
                  存入
                </Button>
              </template>
            </div>
          </div>
          <div
            v-if="voidChests.length === 0"
            class="flex flex-col items-center justify-center py-8"
          >
            <Archive :size="40" class="text-accent/20 mb-2" />
            <p class="text-xs text-muted">还没有虚空箱</p>
            <p class="text-[10px] text-muted/50 mt-0.5">
              在仓库中制作虚空箱后即可远程存取
            </p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 虚空箱存入弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showVoidDepositModal && voidDepositChestId"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showVoidDepositModal = false"
      >
        <div class="game-panel max-w-sm w-full">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm text-accent">存入物品</p>
            <Button
              class="py-0 px-1"
              :icon="X"
              :icon-size="12"
              @click="showVoidDepositModal = false"
            />
          </div>
          <div class="flex flex-col space-y-1 max-h-60 overflow-y-auto">
            <div
              v-for="item in voidDepositableItems"
              :key="item.itemId + item.quality"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5"
              @click="
                openVoidQtyModal(
                  'deposit',
                  voidDepositChestId!,
                  item.itemId,
                  item.quality,
                  item.quantity,
                )
              "
            >
              <span
                class="text-xs truncate mr-2"
                :class="voidQualityClass(item.quality)"
              >
                {{ getItemName(item.itemId) }}
                <span v-if="item.quality !== 'normal'" class="text-[10px]"
                  >({{ VOID_QUALITY_LABEL[item.quality] }})</span
                >
              </span>
              <span class="text-xs text-muted">&times;{{ item.quantity }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 虚空箱数量选择弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="voidQtyModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
        @click.self="voidQtyModal = null"
      >
        <div class="game-panel max-w-xs w-full">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm text-accent">
              {{ voidQtyModal.mode === "withdraw" ? "取出" : "存入" }}
            </p>
            <Button
              class="py-0 px-1"
              :icon="X"
              :icon-size="12"
              @click="voidQtyModal = null"
            />
          </div>
          <p
            class="text-xs mb-2"
            :class="voidQualityClass(voidQtyModal.quality)"
          >
            {{ getItemName(voidQtyModal.itemId) }}
            <span v-if="voidQtyModal.quality !== 'normal'" class="text-[10px]"
              >({{ VOID_QUALITY_LABEL[voidQtyModal.quality] }})</span
            >
          </p>
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs text-muted">数量</span>
              <div class="flex items-center space-x-1">
                <Button
                  class="h-6 px-1.5 py-0.5 text-xs justify-center"
                  :disabled="voidQty <= 1"
                  @click="addVoidQty(-1)"
                  >-</Button
                >
                <input
                  type="number"
                  :value="voidQty"
                  min="1"
                  :max="voidQtyModal.max"
                  class="w-24 h-6 px-2 py-0.5 bg-bg border border-accent/30 rounded-xs text-xs text-center text-accent outline-none"
                  @input="onVoidQtyInput"
                />
                <Button
                  class="h-6 px-1.5 py-0.5 text-xs justify-center"
                  :disabled="voidQty >= voidQtyModal.max"
                  @click="addVoidQty(1)"
                >
                  +
                </Button>
              </div>
            </div>
            <div class="flex space-x-1">
              <Button
                class="flex-1 justify-center"
                :disabled="voidQty <= 1"
                @click="setVoidQty(1)"
                >最少</Button
              >
              <Button
                class="flex-1 justify-center"
                :disabled="voidQty >= voidQtyModal.max"
                @click="setVoidQty(voidQtyModal!.max)"
              >
                最多
              </Button>
            </div>
          </div>
          <Button
            class="w-full justify-center !bg-accent !text-bg"
            @click="confirmVoidQty"
          >
            {{ voidQtyModal.mode === "withdraw" ? "取出" : "存入" }} &times;{{
              voidQty
            }}
          </Button>
        </div>
      </div>
    </Transition>

    <!-- 虚空箱道具信息弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="voidItemDetail && voidItemDef"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="voidItemDetail = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button
            class="absolute top-2 right-2 text-muted hover:text-text"
            @click="voidItemDetail = null"
          >
            <X :size="14" />
          </button>
          <p
            class="text-sm mb-2"
            :class="voidQualityClass(voidItemDetail.quality) || 'text-accent'"
          >
            {{ voidItemDef.name }}
          </p>
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ voidItemDef.description }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs p-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">数量</span>
              <span class="text-xs">×{{ voidItemDetail.quantity }}</span>
            </div>
            <div
              v-if="voidItemDetail.quality !== 'normal'"
              class="flex items-center justify-between mt-0.5"
            >
              <span class="text-xs text-muted">品质</span>
              <span
                class="text-xs"
                :class="voidQualityClass(voidItemDetail.quality)"
              >
                {{ VOID_QUALITY_LABEL[voidItemDetail.quality] }}
              </span>
            </div>
            <div
              v-if="voidItemDef.sellPrice"
              class="flex items-center justify-between mt-0.5"
            >
              <span class="text-xs text-muted">售价</span>
              <span class="text-xs text-accent"
                >{{ voidItemDef.sellPrice }}文</span
              >
            </div>
            <div
              v-if="voidItemDef.staminaRestore"
              class="flex items-center justify-between mt-0.5"
            >
              <span class="text-xs text-muted">恢复</span>
              <span class="text-xs text-success">
                +{{ voidItemDef.staminaRestore }}体力
                <template v-if="voidItemDef.healthRestore"
                  >/ +{{ voidItemDef.healthRestore }}HP</template
                >
              </span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 日志弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showLogModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showLogModal = false"
      >
        <div
          class="game-panel max-w-md w-full max-h-[80vh] flex flex-col relative"
        >
          <div class="flex items-center justify-between gap-3 mb-3">
            <p class="text-sm text-accent">
              <History :size="14" class="inline" />
              日志
            </p>
            <button
              class="min-w-9 min-h-9 flex items-center justify-center rounded-xs border border-accent/20 text-muted hover:text-text"
              aria-label="关闭日志"
              @click="showLogModal = false"
            >
              <X :size="16" />
            </button>
          </div>
          <Button
            v-if="groupedLogs.length > 0"
            class="w-full justify-center py-1.5 mb-3 text-[11px] btn-danger"
            :icon="Trash2"
            :icon-size="12"
            @click="requestClearLogs(null)"
          >
            清空全部日志
          </Button>
          <div class="flex-1 overflow-y-auto min-h-0">
            <div
              v-if="groupedLogs.length === 0"
              class="flex flex-col items-center justify-center py-8 text-muted"
            >
              <History :size="32" class="mb-2" />
              <p class="text-xs">暂无日志记录</p>
            </div>
            <div v-for="(group, gi) in groupedLogs" :key="gi" class="mb-3">
              <div class="flex items-center justify-between">
                <Divider :label="group.label" class="flex-1" />
                <button
                  class="text-muted hover:text-danger ml-1.5 flex-shrink-0"
                  title="清空该日日志"
                  @click="requestClearLogs(group.label)"
                >
                  <X :size="12" />
                </button>
              </div>
              <div class="flex flex-col space-y-0.5">
                <p
                  v-for="(msg, mi) in group.messages"
                  :key="mi"
                  class="text-xs text-muted px-1"
                >
                  {{ msg }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 日志清空确认 -->
    <Transition name="panel-fade">
      <div
        v-if="clearLogTarget !== undefined"
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
      >
        <div class="game-panel max-w-xs w-full text-center">
          <p class="text-xs leading-relaxed mb-4">
            {{
              clearLogTarget === null
                ? "确认清空全部日志？"
                : `确认清空「${clearLogTarget}」的日志？`
            }}
          </p>
          <div class="flex space-x-3 justify-center">
            <Button @click="clearLogTarget = undefined">取消</Button>
            <Button
              class="btn-danger"
              :icon="Trash2"
              :icon-size="12"
              @click="executeClearLogs"
              >确认</Button
            >
          </div>
        </div>
      </div>
    </Transition>

    <!-- 休息确认 -->
    <Transition name="panel-fade">
      <div
        v-if="showSleepConfirm"
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      >
        <div class="game-panel max-w-xs w-full text-center">
          <Divider title>{{ sleepLabel }}</Divider>
          <p class="text-xs leading-relaxed mb-1">{{ sleepSummary }}</p>
          <p
            v-for="(warn, wi) in sleepWarning.split('\n').filter(Boolean)"
            :key="wi"
            class="text-danger text-xs mb-1"
          >
            {{ warn }}
          </p>
          <div class="flex space-x-3 justify-center mt-4">
            <Button :icon="X" :icon-size="12" @click="showSleepConfirm = false"
              >再等等</Button
            >
            <Button
              class="btn-danger"
              :icon="Moon"
              :icon-size="12"
              @click="confirmSleep"
              >{{ sleepLabel }}</Button
            >
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAnimalStore } from "@/stores/useAnimalStore";
import { useGameStore, SEASON_NAMES } from "@/stores/useGameStore";
import { useHomeStore } from "@/stores/useHomeStore";
import { useQuestStore } from "@/stores/useQuestStore";
import { useCultivationStore } from "@/stores/useCultivationStore";
import {
  MAX_EQUIPMENT_PRESETS,
  useInventoryStore,
} from "@/stores/useInventoryStore";
import { useNpcStore } from "@/stores/useNpcStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useWarehouseStore } from "@/stores/useWarehouseStore";
import { parseSaveData, useSaveStore } from "@/stores/useSaveStore";
import { useFloatingWelfareStore } from "@/stores/useFloatingWelfareStore";
import { useAscensionStore } from "@/stores/useAscensionStore";
import { useFarmStore } from "@/stores/useFarmStore";
import { useDialogs } from "@/composables/useDialogs";
import type { MorningChoiceEvent } from "@/data/farmEvents";
import { handleEndDay } from "@/composables/useEndDay";
import {
  addLog,
  showFloat,
  logHistory,
  clearAllLogs,
  clearDayLogs,
  _registerDayLabelGetter,
} from "@/composables/useGameLog";
import {
  LATE_NIGHT_RECOVERY_MAX,
  LATE_NIGHT_RECOVERY_MIN,
  PASSOUT_STAMINA_RECOVERY,
  PASSOUT_MONEY_PENALTY_RATE,
  PASSOUT_MONEY_PENALTY_CAP,
} from "@/data/timeConstants";
import { getNpcById, getItemById, getCropById } from "@/data";
import { CHEST_DEFS } from "@/data/items";
import { useGameClock } from "@/composables/useGameClock";
import { useItemUsage, isQuickUsableItem } from "@/composables/useItemUsage";
import { useAudio } from "@/composables/useAudio";
import type { Quality } from "@/types";
import type { AttributeKey } from "@/stores/usePlayerStore";
import {
  Moon,
  X,
  Map,
  Settings as SettingsIcon,
  Archive,
  ArrowDown,
  ArrowDownToLine,
  History,
  Trash2,
  Gift,
  Zap,
  BookMarked,
} from "lucide-vue-next";
import Button from "@/components/game/Button.vue";
import Divider from "@/components/game/Divider.vue";
import MobileMapMenu from "@/components/game/MobileMapMenu.vue";
import StatusBar from "@/components/game/StatusBar.vue";
import EventDialog from "@/components/game/EventDialog.vue";
import HeartEventDialog from "@/components/game/HeartEventDialog.vue";
import PerkSelectDialog from "@/components/game/PerkSelectDialog.vue";
import FishingContestView from "@/components/game/FishingContestView.vue";
import HarvestFairView from "@/components/game/HarvestFairView.vue";
import DragonBoatView from "@/components/game/DragonBoatView.vue";
import LanternRiddleView from "@/components/game/LanternRiddleView.vue";
import PotThrowingView from "@/components/game/PotThrowingView.vue";
import DumplingMakingView from "@/components/game/DumplingMakingView.vue";
import FireworkShowView from "@/components/game/FireworkShowView.vue";
import TeaContestView from "@/components/game/TeaContestView.vue";
import KiteFlyingView from "@/components/game/KiteFlyingView.vue";
import SettingsDialog from "@/components/game/SettingsDialog.vue";
import SaveManager from "@/components/game/SaveManager.vue";
import DiscoveryScene from "@/components/game/DiscoveryScene.vue";
import { Capacitor } from "@capacitor/core";

const router = useRouter();
const route = useRoute();
const gameStore = useGameStore();
const playerStore = usePlayerStore();
const saveStore = useSaveStore();
const farmStore = useFarmStore();
const questStore = useQuestStore();
const cultivationStore = useCultivationStore();
const floatingWelfareStore = useFloatingWelfareStore();
const ascensionStore = useAscensionStore();
const { switchToSeasonalBgm } = useAudio();

type RewardBurst = {
  title: string;
  desc: string;
  emoji: string;
  lines: string[];
};
const rewardBurst = ref<RewardBurst | null>(null);
const showRewardBurst = (payload: RewardBurst) => {
  rewardBurst.value = payload;
  showFloat(payload.title, "success");
};
const addRewardLog = (title: string, lines: string[]) =>
  addLog(`${title}：${lines.join("，")}。`);

type FloatingWelfareGift = {
  id: string;
  title: string;
  desc?: string;
  enabled?: boolean;
  reset?: "once" | "daily" | "sevenDay";
  rewards?: any;
};
const serverConfig = ref<any>({
  floatingWelfare: {
    enabled: false,
    buttonText: "福利",
    title: "仙乡福缘",
    desc: "",
    gifts: [],
  },
});
const showFloatingWelfare = ref(false);
const todayRealKey = () => new Date().toISOString().slice(0, 10);
const dateIndex = (key: string) => {
  const t = Date.parse(`${key}T00:00:00.000Z`);
  return Number.isFinite(t)
    ? Math.floor(t / 86400000)
    : Math.floor(Date.now() / 86400000);
};
const floatingWelfare = computed(
  () => serverConfig.value?.floatingWelfare || { enabled: false, gifts: [] },
);
const activeFloatingWelfareGifts = computed<FloatingWelfareGift[]>(() =>
  Array.isArray(floatingWelfare.value?.gifts)
    ? floatingWelfare.value.gifts.filter((g: any) => g?.enabled !== false)
    : [],
);
const floatingGiftClaimKey = (gift: FloatingWelfareGift) => {
  const date = todayRealKey();
  if (gift.reset === "daily") return `${gift.id}:daily:${date}`;
  if (gift.reset === "sevenDay") {
    const first = floatingWelfareStore.ensureFirstSeenDate(date);
    const day = Math.max(
      1,
      Math.min(7, dateIndex(date) - dateIndex(first) + 1),
    );
    return `${gift.id}:sevenDay:${day}`;
  }
  return `${gift.id}:once`;
};
const isFloatingGiftClaimed = (gift: FloatingWelfareGift) =>
  floatingWelfareStore.isClaimed(floatingGiftClaimKey(gift));
const claimableFloatingWelfareCount = computed(
  () =>
    activeFloatingWelfareGifts.value.filter((g) => !isFloatingGiftClaimed(g))
      .length,
);
const floatingGiftResetText = (gift: FloatingWelfareGift) =>
  gift.reset === "daily"
    ? "每日"
    : gift.reset === "sevenDay"
      ? "七日"
      : "一次性";
const floatingRewardText = (rewards: any) => {
  const parts: string[] = [];
  if (rewards?.money) parts.push(`铜钱+${rewards.money}`);
  if (rewards?.spiritStone) parts.push(`灵石×${rewards.spiritStone}`);
  if (rewards?.aura) parts.push(`灵气+${rewards.aura}`);
  if (rewards?.cultivation) parts.push(`修为+${rewards.cultivation}`);
  if (rewards?.mana) parts.push(`灵力+${rewards.mana}`);
  if (rewards?.stamina) parts.push(`体力+${rewards.stamina}`);
  const attr = rewards?.attributeExp || {};
  const attrTotal = ["physique", "strength", "agility", "perception"].reduce(
    (sum, k) => sum + (Number(attr[k]) || 0),
    0,
  );
  if (attrTotal) parts.push(`资质经验+${attrTotal}`);
  for (const item of rewards?.items || [])
    parts.push(
      `${item.name || getItemName(item.itemId)}×${item.quantity || 1}`,
    );
  return parts.join("，") || "无";
};
const claimFloatingWelfare = async (gift: FloatingWelfareGift) => {
  const key = floatingGiftClaimKey(gift);
  if (floatingWelfareStore.isClaimed(key)) return;
  const rewards = gift.rewards || {};
  const lines: string[] = [];
  if (rewards.money) {
    playerStore.earnMoney(Number(rewards.money) || 0);
    lines.push(`铜钱 +${Number(rewards.money) || 0}`);
  }
  if (rewards.stamina) {
    playerStore.restoreStamina(Number(rewards.stamina) || 0);
    lines.push(`体力 +${Number(rewards.stamina) || 0}`);
  }
  if (rewards.spiritStone) {
    inventoryStore.addItem("spirit_stone", Number(rewards.spiritStone) || 0);
    lines.push(`灵石 +${Number(rewards.spiritStone) || 0}`);
  }
  if (rewards.aura) {
    cultivationStore.aura += Number(rewards.aura) || 0;
    lines.push(`灵气 +${Number(rewards.aura) || 0}`);
  }
  if (rewards.cultivation) {
    const gain = Number(rewards.cultivation) || 0;
    const before = cultivationStore.cultivation;
    cultivationStore.cultivation = Math.min(
      cultivationStore.maxCultivation,
      cultivationStore.cultivation + gain,
    );
    lines.push(`修为 +${cultivationStore.cultivation - before}`);
  }
  if (rewards.mana) {
    const v = Number(rewards.mana) || 0;
    cultivationStore.mana = Math.min(
      cultivationStore.maxMana,
      cultivationStore.mana + v,
    );
    lines.push(`灵力 +${v}`);
  }
  const attr = rewards.attributeExp || {};
  const attrGains: Partial<Record<AttributeKey, number>> = {};
  for (const k of [
    "physique",
    "strength",
    "agility",
    "perception",
  ] as AttributeKey[])
    if (Number(attr[k]) > 0) attrGains[k] = Number(attr[k]);
  if (Object.keys(attrGains).length) {
    playerStore.addAttributeExpBatch(attrGains);
    lines.push(
      `资质经验 +${Object.values(attrGains).reduce((a, b) => a + (Number(b) || 0), 0)}`,
    );
  }
  for (const item of rewards.items || []) {
    const qty = Number(item.quantity) || 1;
    inventoryStore.addItem(String(item.itemId), qty, item.quality || "normal");
    lines.push(`${item.name || getItemName(item.itemId)} ×${qty}`);
  }
  floatingWelfareStore.markClaimed(key);
  const text = lines.length ? lines : ["奖励已到账"];
  addLog(`领取${gift.title}：${text.join("，")}。`);
  showRewardBurst({
    title: gift.title || "福利已领取",
    desc: gift.desc || "奖励已放入当前存档。",
    emoji: "🎁",
    lines: text,
  });
  await autoSaveCurrent();
};
const loadServerConfig = async () => {
  try {
    serverConfig.value = await accountApi("/api/config");
  } catch {}
};

const offlineRewardKey = () => {
  const characterId = localStorage.getItem("taoyuan_active_character_id") || "";
  const slot =
    saveStore.activeSlot >= 0
      ? String(saveStore.activeSlot)
      : localStorage.getItem("taoyuan_active_slot") || "local";
  return `taoyuan_last_seen_${characterId || slot}`;
};
const grantOfflineRewards = async () => {
  if (!gameStore.isGameStarted) return;
  const key = offlineRewardKey();
  const now = Date.now();
  const last = Number(localStorage.getItem(key) || 0);
  localStorage.setItem(key, String(now));
  if (!last) return;
  const minutes = Math.floor((now - last) / 60000);
  if (minutes < 20) return;
  const cappedMinutes = Math.min(minutes, 12 * 60);
  const hours = Math.max(1, Math.floor(cappedMinutes / 60));
  const money = 140 + hours * 80 + Math.floor(gameStore.day * 10);
  const stamina = Math.min(60, 12 + hours * 5);
  const stones = Math.max(2, Math.floor(hours * 1.2));
  const lines = [
    `离线${hours}小时`,
    `铜钱 +${money}`,
    `体力 +${stamina}`,
    `灵石 +${stones}`,
  ];
  playerStore.earnMoney(money);
  playerStore.restoreStamina(stamina);
  inventoryStore.addItem("spirit_stone", stones);
  if (cultivationStore.unlocked) {
    const idle = cultivationStore.gainIdleCultivation(cappedMinutes);
    lines.push(`修为 +${idle.cultivation}`, `灵气 +${idle.aura}`);
    if (idle.yuanShen > 0) lines.push(`元神经验 +${idle.yuanShen}`);
  }
  addRewardLog("离线归来，洞府与灵田洞天已有积累", lines.slice(1));
  showRewardBurst({
    title: "离线收益已到账",
    desc: "你不在的时候，万象仙乡仍在缓慢运转。最多累计12小时回访收益。",
    emoji: "🌙",
    lines,
  });
  await autoSaveCurrent();
};

let backgroundMeditateTimer: number | null = null;
const startBackgroundMeditation = () => {
  if (backgroundMeditateTimer != null) return;
  backgroundMeditateTimer = window.setInterval(() => {
    if (!gameStore.isGameStarted || !cultivationStore.autoMeditateEnabled)
      return;
    if (isTimeFrozen.value) return;
    const changed = cultivationStore.runAutoMeditateTick();
    if (changed || !cultivationStore.autoMeditateEnabled)
      void autoSaveCurrent();
  }, 3000);
};
const stopBackgroundMeditation = () => {
  if (backgroundMeditateTimer != null) {
    window.clearInterval(backgroundMeditateTimer);
    backgroundMeditateTimer = null;
  }
};

let staminaRegenTimer: number | null = null;
const startOnlineStaminaRegen = () => {
  if (staminaRegenTimer != null) return;
  staminaRegenTimer = window.setInterval(() => {
    if (!gameStore.isGameStarted) return;
    let changed = false;
    if (playerStore.stamina < playerStore.maxStamina) {
      const before = playerStore.stamina;
      playerStore.restoreStamina(1);
      if (playerStore.stamina > before) {
        addLog(`体力自然恢复 +${playerStore.stamina - before}。`);
        showFloat(`体力 +${playerStore.stamina - before}`, "success");
        changed = true;
      }
    }
    if (cultivationStore.unlocked) {
      const idle = cultivationStore.gainIdleCultivation(1);
      addLog(
        `挂机吐纳：灵气+${idle.aura}，修为+${idle.cultivation}${idle.yuanShen ? `，元神经验+${idle.yuanShen}` : ""}。`,
      );
      changed = true;
    }
    if (changed) void autoSaveCurrent();
  }, 60000);
};
const stopOnlineStaminaRegen = () => {
  if (staminaRegenTimer != null) {
    window.clearInterval(staminaRegenTimer);
    staminaRegenTimer = null;
  }
};

let accountAutoSaveTimer: number | null = null;
const saveKey = (slot: number) => `taoyuanxiang_save_${slot}`;
const accountToken = () => localStorage.getItem("taoyuan_account_token") || "";
const accountHeaders = () => ({
  "content-type": "application/json",
  authorization: `Bearer ${accountToken()}`,
});
const accountApi = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "请求失败") as Error & {
      status?: number;
      data?: any;
    };
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

// 世界公告
const worldAnnouncement = ref("");
const worldAnnouncementStyle = ref<Record<string, string>>({});
const lastWorldAnnouncementKey = ref("");
let worldAnnouncementHideTimer: number | null = null;
let worldAnnouncementTimer: number | null = null;
const checkWorldAnnouncements = async () => {
  try {
    const data = await accountApi("/api/world-announcements");
    if (data.announcements && data.announcements.length > 0) {
      const latest = data.announcements[0];
      if (latest && latest.message) {
        const key = `${latest.id || ""}-${latest.time || ""}-${latest.message}`;
        const repeatIntervalMinutes = Math.max(
          0,
          Number(latest.repeatIntervalMinutes || 0) || 0,
        );
        const repeatStorageKey = `taoyuan_world_announcement_seen_${key}`;
        const now = Date.now();
        const lastShownAt =
          Number(localStorage.getItem(repeatStorageKey) || 0) || 0;
        if (repeatIntervalMinutes > 0) {
          if (now - lastShownAt < repeatIntervalMinutes * 60 * 1000) return;
        } else if (key === lastWorldAnnouncementKey.value || lastShownAt > 0)
          return;
        lastWorldAnnouncementKey.value = key;
        localStorage.setItem(repeatStorageKey, String(now));
        const duration = Math.max(
          7000,
          Math.min(18000, String(latest.message).length * 320 + 3600),
        );
        worldAnnouncement.value = latest.message;
        worldAnnouncementStyle.value = { animationDuration: `${duration}ms` };
        if (worldAnnouncementHideTimer != null)
          window.clearTimeout(worldAnnouncementHideTimer);
        worldAnnouncementHideTimer = window.setTimeout(() => {
          worldAnnouncement.value = "";
        }, duration + 500);
      }
    }
  } catch {}
};
const preloadCommonPanels = () => {
  const run = () => {
    void import("@/views/game/InventoryView.vue");
    void import("@/views/game/QuestView.vue");
    void import("@/views/game/CharInfoView.vue");
    void import("@/views/game/CultivationView.vue");
    void import("@/views/game/CombatView.vue");
    void import("@/views/game/LeaderboardView.vue");
  };
  const idle = (window as any).requestIdleCallback as
    undefined | ((cb: () => void) => void);
  const defer = globalThis.setTimeout;
  if (idle) idle(run);
  else defer(run, 800);
};
onMounted(() => {
  checkWorldAnnouncements();
  worldAnnouncementTimer = window.setInterval(checkWorldAnnouncements, 15000);
  preloadCommonPanels();
});

const showMailModal = ref(false);
const mailLoading = ref(false);
const mails = ref<any[]>([]);
const unclaimedMailCount = computed(
  () => mails.value.filter((m) => !m.claimed).length,
);
const loadMails = async () => {
  const token = accountToken();
  if (!token) {
    mails.value = [];
    return;
  }
  mailLoading.value = true;
  try {
    const data = await accountApi("/api/mails", { headers: accountHeaders() });
    mails.value = data.mails || [];
  } catch (e) {
    console.warn("load mails failed", e);
  } finally {
    mailLoading.value = false;
  }
};
const openLeaderboard = () => {
  showMobileMap.value = false;
  router.push("/game/leaderboard");
};
const openCombat = () => {
  showMobileMap.value = false;
  router.push("/game/combat");
};
const openForge = () => {
  showMobileMap.value = false;
  router.push("/game/forge");
};
const openSect = () => {
  showMobileMap.value = false;
  router.push("/game/sect");
};
const openMailModal = async () => {
  showMailModal.value = true;
  await loadMails();
};
const mailRewardText = (rewards: any) => {
  const parts: string[] = [];
  if (rewards?.money) parts.push(`铜钱 +${rewards.money}`);
  if (rewards?.stamina) parts.push(`体力 +${rewards.stamina}`);
  if (rewards?.cultivation) parts.push(`修为 +${rewards.cultivation}`);
  if (rewards?.aura) parts.push(`灵气 +${rewards.aura}`);
  if (rewards?.mana) parts.push(`灵力 +${rewards.mana}`);
  if (rewards?.spiritStone || rewards?.spirit_stone)
    parts.push(`灵石 +${rewards.spiritStone || rewards.spirit_stone}`);
  for (const item of rewards?.items || [])
    parts.push(`${getItemName(item.itemId)}×${item.quantity}`);
  return parts.join("，") || "无";
};
const formatMailTime = (v: string) => (v ? new Date(v).toLocaleString() : "");
const claimMail = async (mail: any) => {
  try {
    const data = await accountApi(
      `/api/mails/${encodeURIComponent(mail.id)}/claim`,
      { method: "POST", headers: accountHeaders() },
    );
    const rewards = data.rewards || {};
    if (rewards.money) playerStore.earnMoney(Number(rewards.money) || 0);
    if (rewards.stamina)
      playerStore.restoreStamina(Number(rewards.stamina) || 0);
    if (rewards.cultivation)
      cultivationStore.cultivation += Number(rewards.cultivation) || 0;
    if (rewards.aura) cultivationStore.aura += Number(rewards.aura) || 0;
    if (rewards.mana)
      cultivationStore.mana = Math.min(
        cultivationStore.maxMana,
        cultivationStore.mana + (Number(rewards.mana) || 0),
      );
    if (rewards.spiritStone || rewards.spirit_stone)
      inventoryStore.addItem(
        "spirit_stone",
        Number(rewards.spiritStone || rewards.spirit_stone) || 0,
      );
    for (const item of rewards.items || []) {
      inventoryStore.addItem(
        String(item.itemId),
        Number(item.quantity) || 1,
        item.quality || "normal",
      );
    }
    mail.claimed = true;
    const text = mailRewardText(rewards);
    addLog(`领取邮件奖励：${text}`);
    showRewardBurst({
      title: "邮件奖励已领取",
      desc: mail.title || "系统奖励已放入背包。",
      emoji: "📮",
      lines: text.split("，").filter(Boolean),
    });
    await autoSaveCurrent();
  } catch (e: any) {
    addLog(`领取邮件失败：${e?.message || "请求失败"}`);
  }
};
const showQuickUsePicker = ref(false);
const quickUseSlots = computed(() => {
  inventoryStore.compactQuickUseItems();
  return Array.from({ length: 5 }, (_, index) => {
    const quick = inventoryStore.quickUseItems[index];
    const item = quick
      ? inventoryStore.items.find(
          (i) => i.itemId === quick.itemId && i.quality === quick.quality,
        )
      : null;
    const def = quick ? getItemById(quick.itemId) : null;
    return {
      index,
      quick,
      item,
      name: def?.name || quick?.itemId || "空",
      quantity: item?.quantity || 0,
    };
  });
});
const openQuickUsePicker = () => {
  inventoryStore.compactQuickUseItems();
  showQuickUsePicker.value = true;
};
const handleQuickPreset = async (id: string) => {
  const result = inventoryStore.applyEquipmentPreset(id);
  addLog(result.message);
  showFloat(result.message, result.success ? "success" : "danger");
  if (result.success) {
    showQuickUsePicker.value = false;
    await autoSaveCurrent();
  }
};

const handleQuickSlotClick = (slot: {
  item?: { itemId: string; quality: any } | null;
}) => {
  if (slot.item) {
    useQuickSlot(slot.item);
    return;
  }
  router.push("/game/inventory");
};

const useQuickSlot = async (item: { itemId: string; quality: any }) => {
  const def = getItemById(item.itemId);
  const ok = isQuickUsableItem(item.itemId)
    ? itemUsage.useItem(item.itemId, item.quality)
    : itemUsage.eatItem(item.itemId, item.quality);
  if (ok) {
    if (
      !inventoryStore.items.some(
        (i) => i.itemId === item.itemId && i.quality === item.quality,
      )
    )
      inventoryStore.clearQuickUseItem(item.itemId, item.quality);
    inventoryStore.compactQuickUseItems();
    showQuickUsePicker.value = false;
    await autoSaveCurrent();
  } else {
    addLog(`${def?.name || "快捷物品"}当前无法使用。`);
  }
};

const autoSaveCurrent = async () => {
  if (ascensionStore.adminPreviewMode) return;
  if (!gameStore.isGameStarted || saveStore.activeSlot < 0) return;
  const slot = saveStore.activeSlot;
  localStorage.setItem("taoyuan_active_slot", String(slot));
  if (!saveStore.saveToSlot(slot)) return;
  const token = accountToken();
  if (!token) return;
  const raw = localStorage.getItem(saveKey(slot));
  if (!raw) return;
  const info = saveStore.getSlots().find((s) => s.slot === slot);
  const loadedAt =
    localStorage.getItem(`taoyuan_cloud_loaded_at_${slot}`) || "";
  try {
    const data = parseSaveData(raw);
    const result = await accountApi(`/api/saves/${slot}`, {
      method: "PUT",
      headers: accountHeaders(),
      body: JSON.stringify({
        raw,
        data,
        meta: { ...(info || {}), autoSaved: true, lastLoadedAt: loadedAt },
      }),
    });
    if (result?.updatedAt)
      localStorage.setItem(
        `taoyuan_cloud_loaded_at_${slot}`,
        String(result.updatedAt),
      );
  } catch (e: any) {
    const rollback =
      e?.data?.code === "SAVE_AUTO_ROLLED_BACK" && e.data.rollback;
    if (
      rollback &&
      typeof e.data.raw === "string" &&
      saveStore.importSave(slot, e.data.raw) &&
      saveStore.loadFromSlot(slot)
    ) {
      localStorage.setItem(
        `taoyuan_cloud_loaded_at_${slot}`,
        String(e.data.updatedAt || ""),
      );
      stopAccountAutoSave();
      addLog(
        "云端检测到高置信数据异常，已自动恢复并载入服务器可信存档，同时暂停自动保存。请确认当前进度后再继续。",
      );
      return;
    }
    if (e?.status === 409) {
      stopAccountAutoSave();
      addLog(
        "检测到同账号其他设备已有更新，已暂停本页自动保存。请刷新或从角色列表重新进入，避免覆盖进度。",
      );
      return;
    }
    // 自动保存失败不打断游戏，也不刷屏；玩家仍可手动保存。
    console.warn("account autosave failed", e);
  }
};
const startAccountAutoSave = () => {
  if (accountAutoSaveTimer != null) return;
  accountAutoSaveTimer = window.setInterval(() => {
    void autoSaveCurrent();
  }, 5000);
};
const stopAccountAutoSave = () => {
  if (accountAutoSaveTimer != null) {
    window.clearInterval(accountAutoSaveTimer);
    accountAutoSaveTimer = null;
  }
};

// 游戏未开始时优先从刷新前的活跃槽位恢复，避免刷新 /game 后回到空内存状态。
const isAdminImmortalPreviewRoute =
  router.currentRoute.value.name === "immortal-world" &&
  router.currentRoute.value.query.adminPreview === "1" &&
  localStorage.getItem("taoyuan_admin_immortal_preview") === "1";
if (isAdminImmortalPreviewRoute) {
  gameStore.isGameStarted = true;
  ascensionStore.enterAdminPreview();
} else if (!gameStore.isGameStarted) {
  const lastActiveSlot = Number(
    localStorage.getItem("taoyuan_active_slot") ?? "-1",
  );
  const restored = Number.isInteger(lastActiveSlot)
    ? saveStore.loadFromSlot(lastActiveSlot)
    : false;
  if (!restored) void router.replace("/");
}

const {
  currentEvent,
  pendingHeartEvent,
  currentFestival,
  pendingPerk,
  pendingPetAdoption,
  childProposalVisible,
  pendingFarmEvent,
  pendingDiscoveryScene,
  closeEvent,
  closeHeartEvent,
  closeFestival,
  handlePerkSelect,
  closePetAdoption,
  closeChildProposal,
  closeFarmEvent,
  closeDiscoveryScene,
} = useDialogs();

const npcStore = useNpcStore();

const { startClock, stopClock, pauseClock, resumeClock, isTimeFrozen } =
  useGameClock();

/** 移动端地图菜单 */
const showMobileMap = ref(false);

/** 休息确认弹窗 */
const showSleepConfirm = ref(false);

/** 设置弹窗 */
const showSettings = ref(false);

/** 存档管理弹窗 */
const showSaveManager = ref(false);

/** 每日签到 */
const checkinBusy = ref(false);
const checkinChecked = ref(false);

/** 日志弹窗 */
const showLogModal = ref(false);
/** 日志清空确认：undefined=不显示, null=清空全部, string=清空指定天 */
const clearLogTarget = ref<string | null | undefined>(undefined);
const requestClearLogs = (dayLabel: string | null) => {
  clearLogTarget.value = dayLabel;
};
const executeClearLogs = () => {
  if (clearLogTarget.value === null) clearAllLogs();
  else if (clearLogTarget.value) clearDayLogs(clearLogTarget.value);
  clearLogTarget.value = undefined;
};
watch(showLogModal, (v) => {
  if (!v) clearLogTarget.value = undefined;
});

const loadCheckinStatus = async () => {
  const t = accountToken();
  if (!t) return;
  try {
    const res = await fetch("/api/checkin", {
      headers: { authorization: `Bearer ${t}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    checkinChecked.value = Boolean(data.checked);
  } catch {}
};
const dailyCheckin = async () => {
  if (checkinBusy.value || checkinChecked.value) return;
  const t = accountToken();
  if (!t) {
    addLog("请先在首页登录账号，再进行每日签到。");
    return;
  }
  checkinBusy.value = true;
  try {
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { authorization: `Bearer ${t}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      addLog(data.error || "签到失败。");
      return;
    }
    playerStore.earnMoney(Number(data.reward || 0));
    const itemRewards = Array.isArray(data.items) ? data.items : [];
    for (const item of itemRewards) {
      inventoryStore.addItem(
        String(item.itemId),
        Number(item.quantity) || 1,
        item.quality || "normal",
      );
    }
    checkinChecked.value = true;
    const itemText = itemRewards.length
      ? "，并获得 " +
        itemRewards
          .map(
            (item: any) =>
              `${getItemName(String(item.itemId))}×${Number(item.quantity) || 1}`,
          )
          .join("、")
      : "";
    const streakText = data.streak ? `（连续${data.streak}天）` : "";
    const rewardLines = [
      `铜钱 +${data.reward}`,
      ...itemRewards.map(
        (item: any) =>
          `${getItemName(String(item.itemId))} ×${Number(item.quantity) || 1}`,
      ),
    ];
    addLog(`每日签到成功${streakText}，获得 ${data.reward} 铜钱${itemText}。`);
    showRewardBurst({
      title: `每日签到成功${streakText}`,
      desc: "连续回来就会越来越稳，今天也把万象仙乡照看起来了。",
      emoji: "🎁",
      lines: rewardLines,
    });
    const slot =
      saveStore.activeSlot >= 0
        ? saveStore.activeSlot
        : saveStore.assignNewSlot();
    if (slot >= 0) saveStore.saveToSlot(slot);
  } catch {
    addLog("签到失败，请稍后再试。");
  } finally {
    checkinBusy.value = false;
  }
};

// 注册天数标签获取器
_registerDayLabelGetter(
  () =>
    `第${gameStore.year}年 ${SEASON_NAMES[gameStore.season]} 第${gameStore.day}天`,
);

/** 按天分组的日志（最新天在前，每天内也倒序） */
const groupedLogs = computed(() => {
  const groups: { label: string; messages: string[] }[] = [];
  let currentLabel: string | null = null;
  for (const entry of logHistory.value) {
    if (entry.dayLabel !== currentLabel) {
      currentLabel = entry.dayLabel;
      groups.push({ label: currentLabel, messages: [] });
    }
    groups[groups.length - 1]!.messages.push(entry.msg);
  }
  for (const g of groups) g.messages.reverse();
  return groups.reverse();
});

// 实时时钟生命周期
onMounted(() => {
  startClock();
  if (!ascensionStore.adminPreviewMode) startAccountAutoSave();
  startOnlineStaminaRegen();
  startBackgroundMeditation();
  void loadServerConfig();
  void loadCheckinStatus();
  void loadMails();
  if (!ascensionStore.adminPreviewMode) {
    void grantOfflineRewards();
    void autoSaveCurrent();
  }
});
onUnmounted(() => {
  stopClock();
  stopAccountAutoSave();
  stopOnlineStaminaRegen();
  stopBackgroundMeditation();
  if (worldAnnouncementTimer != null)
    window.clearInterval(worldAnnouncementTimer);
  if (worldAnnouncementHideTimer != null)
    window.clearTimeout(worldAnnouncementHideTimer);
  void autoSaveCurrent();
});

// 弹窗打开时自动暂停时钟，全部关闭后恢复
watch(
  () =>
    !!(
      currentEvent.value ||
      pendingHeartEvent.value ||
      currentFestival.value ||
      pendingPerk.value ||
      pendingPetAdoption.value ||
      childProposalVisible.value ||
      pendingFarmEvent.value ||
      pendingDiscoveryScene.value ||
      showSleepConfirm.value
    ),
  (hasModal) => {
    if (hasModal) pauseClock();
    else resumeClock();
  },
);

/** 从路由名称获取当前面板标识 */
const currentPanel = computed(() => {
  return (route.name as string) ?? "farm";
});

const nextJourneyTask = computed(() => questStore.nextJourneyTask);
const isImmortalRoute = computed(() => route.name === "immortal-world");
const journeyTargetMap: Record<string, string> = {
  cropHarvest: "farm",
  earthPulse: "farm",
  fieldTier: "cultivation",
  cultivationUnlocked: "cultivation",
  realmIndex: "cultivation",
  moneyEarned: "farm",
  monsterKills: "combat",
  mineFloor: "mining",
  completedCommissions: "quest",
  craftedPills: "alchemy",
  attributePower: "charinfo",
};
const goJourneyTarget = () => {
  const task = nextJourneyTask.value;
  if (!task) return;
  const target = journeyTargetMap[task.metric] || "quest";
  void router.push({ name: target });
};
const claimNextJourney = () => {
  const task = nextJourneyTask.value;
  if (!task) return;
  const res = questStore.claimJourneyTask(task.id);
  showFloat(res.message, res.success ? "success" : "danger");
  addLog(res.message);
  if (res.success)
    showRewardBurst({
      title: "今日目标奖励",
      desc: task.title,
      emoji: "🎯",
      lines: res.message.split("，").filter(Boolean).slice(0, 4),
    });
};

const sleepLabel = computed(() => {
  if (gameStore.hour >= 24) return "倒头就睡";
  if (gameStore.hour >= 20) return "回家休息";
  return "休息";
});

const sleepSummary = computed(() => {
  if (playerStore.stamina <= 0 || gameStore.hour >= 26) {
    return "你已经精疲力竭……将在原地昏倒。";
  }
  if (gameStore.hour >= 24) {
    return "已经过了午夜，拖着疲惫的身体回家……";
  }
  return "回到家中，安稳入睡。明日又是新的一天。";
});

const sleepWarning = computed(() => {
  const warnings: string[] = [];
  const homeStore = useHomeStore();
  const staminaBonus = homeStore.getStaminaRecoveryBonus();
  if (playerStore.stamina <= 0 || gameStore.hour >= 26) {
    const pct = Math.round(
      Math.min(PASSOUT_STAMINA_RECOVERY + staminaBonus, 1) * 100,
    );
    const penaltyPct = Math.round(PASSOUT_MONEY_PENALTY_RATE * 100);
    if (pct < 100) {
      warnings.push(
        `体力仅恢复${pct}%，并损失${penaltyPct}%铜钱（上限${PASSOUT_MONEY_PENALTY_CAP}文）`,
      );
    } else {
      warnings.push(
        `损失${penaltyPct}%铜钱（上限${PASSOUT_MONEY_PENALTY_CAP}文）`,
      );
    }
  } else if (gameStore.hour >= 24) {
    const t = Math.min(Math.max(gameStore.hour - 24, 0), 1);
    const pct = Math.round(
      Math.min(
        LATE_NIGHT_RECOVERY_MAX -
          t * (LATE_NIGHT_RECOVERY_MAX - LATE_NIGHT_RECOVERY_MIN) +
          staminaBonus,
        1,
      ) * 100,
    );
    if (pct < 100) {
      warnings.push(`体力仅恢复${pct}%`);
    }
  }
  // 第28天换季警告：统计将枯萎的作物
  if (gameStore.day === 28) {
    const SEASON_ORDER = ["spring", "summer", "autumn", "winter"] as const;
    const nextSeason =
      SEASON_ORDER[(SEASON_ORDER.indexOf(gameStore.season) + 1) % 4]!;
    let willWitherCount = 0;
    let harvestableCount = 0;
    for (const plot of farmStore.plots) {
      if (
        (plot.state === "planted" ||
          plot.state === "growing" ||
          plot.state === "harvestable") &&
        plot.cropId
      ) {
        const crop = getCropById(plot.cropId);
        if (crop && !crop.season.includes(nextSeason)) {
          willWitherCount++;
          if (plot.state === "harvestable") harvestableCount++;
        }
      }
    }
    if (willWitherCount > 0) {
      const nextName = SEASON_NAMES[nextSeason];
      let msg = `明天进入${nextName}季，${willWitherCount}株作物将会枯萎！`;
      if (harvestableCount > 0) {
        msg += `（其中${harvestableCount}株已可收获）`;
      }
      warnings.push(msg);
    }
  }
  return warnings.join("\n");
});

/** 宠物领养 */
const petChoice = ref<"cat" | "dog" | null>(null);
const petNameInput = ref("");

const confirmPetAdoption = () => {
  if (!petChoice.value) return;
  const animalStore = useAnimalStore();
  const defaultName = petChoice.value === "cat" ? "小花" : "旺财";
  const name = petNameInput.value.trim() || defaultName;
  animalStore.adoptPet(petChoice.value, name);
  closePetAdoption();
  petChoice.value = null;
  petNameInput.value = "";
};

/** 子女提议回应 */
const proposalSpouseName = computed(() => {
  const spouse = npcStore.getSpouse();
  if (!spouse) return "配偶";
  return getNpcById(spouse.npcId)?.name ?? "配偶";
});

const handleChildProposalResponse = (
  response: "accept" | "decline" | "wait",
) => {
  const result = npcStore.respondToChildProposal(response);
  addLog(result.message);
  if (result.friendshipChange !== 0) {
    addLog(
      `(好感${result.friendshipChange > 0 ? "+" : ""}${result.friendshipChange})`,
    );
  }
  closeChildProposal();
};

const inventoryStore = useInventoryStore();
const itemUsage = useItemUsage();
const warehouseStore = useWarehouseStore();

const handleFarmEventChoice = (
  choice: MorningChoiceEvent["choices"][number],
) => {
  addLog(choice.result);
  if (choice.effect) {
    switch (choice.effect.type) {
      case "gainItem":
        inventoryStore.addItem(choice.effect.itemId, choice.effect.qty);
        break;
      case "gainMoney":
        playerStore.earnMoney(choice.effect.amount);
        break;
      case "gainFriendship":
        for (const s of npcStore.npcStates) {
          s.friendship += choice.effect.amount;
        }
        break;
    }
  }
  closeFarmEvent();
};

// === 虚空箱远程访问 ===
const showVoidModal = ref(false);
const showVoidDepositModal = ref(false);
const expandedVoidChestId = ref<string | null>(null);
const voidDepositChestId = ref<string | null>(null);

const voidChests = computed(() => warehouseStore.getVoidChests());
const voidChestCapacity = CHEST_DEFS.void.capacity;

const getItemName = (itemId: string): string =>
  getItemById(itemId)?.name ?? itemId;

const VOID_QUALITY_LABEL: Record<Quality, string> = {
  normal: "普通",
  fine: "优良",
  excellent: "精品",
  supreme: "极品",
};

const voidQualityClass = (q: Quality): string => {
  if (q === "fine") return "text-quality-fine";
  if (q === "excellent") return "text-quality-excellent";
  if (q === "supreme") return "text-quality-supreme";
  return "";
};

const toggleVoidChest = (chestId: string) => {
  expandedVoidChestId.value =
    expandedVoidChestId.value === chestId ? null : chestId;
};

const openVoidDeposit = (chestId: string) => {
  voidDepositChestId.value = chestId;
  showVoidDepositModal.value = true;
};

const voidDepositableItems = computed(() =>
  inventoryStore.items.filter((i) => {
    if (i.locked) return false;
    const def = getItemById(i.itemId);
    return def && def.category !== "seed";
  }),
);

/** 背包中可一键存入的重复物品（虚空箱中已有且未锁定、非种子） */
const voidDuplicateDepositItems = computed(() => {
  if (!expandedVoidChestId.value) return [];
  const chest = warehouseStore.getChest(expandedVoidChestId.value);
  if (!chest) return [];
  const chestItemIds = new Set(chest.items.map((i) => i.itemId));
  return inventoryStore.items.filter((i) => {
    if (i.locked) return false;
    const def = getItemById(i.itemId);
    if (!def || def.category === "seed") return false;
    return chestItemIds.has(i.itemId);
  });
});

/** 一键存入重复物品到虚空箱 */
const handleVoidDepositDuplicates = () => {
  if (!expandedVoidChestId.value) return;
  const chestId = expandedVoidChestId.value;
  const snapshot = voidDuplicateDepositItems.value.map((i) => ({
    itemId: i.itemId,
    quality: i.quality,
    quantity: i.quantity,
  }));
  let totalDeposited = 0;
  let kindCount = 0;
  for (const item of snapshot) {
    const actual = warehouseStore.depositToChest(
      chestId,
      item.itemId,
      item.quantity,
      item.quality,
    );
    if (actual > 0) {
      totalDeposited += actual;
      kindCount++;
    }
  }
  if (totalDeposited > 0) {
    addLog(`一键存入了${kindCount}种物品，共${totalDeposited}个到虚空箱。`);
  } else {
    addLog("虚空箱已满，无法存入。");
  }
};

/** 虚空箱道具信息弹窗 */
const voidItemDetail = ref<{
  itemId: string;
  quality: Quality;
  quantity: number;
} | null>(null);
const voidItemDef = computed(() => {
  if (!voidItemDetail.value) return null;
  return getItemById(voidItemDetail.value.itemId) ?? null;
});

// === 虚空箱数量选择 ===
interface VoidQtyModalData {
  mode: "withdraw" | "deposit";
  chestId: string;
  itemId: string;
  quality: Quality;
  max: number;
}
const voidQtyModal = ref<VoidQtyModalData | null>(null);
const voidQty = ref(1);

const openVoidQtyModal = (
  mode: "withdraw" | "deposit",
  chestId: string,
  itemId: string,
  quality: Quality,
  max: number,
) => {
  if (max <= 1) {
    // 数量为1时直接执行，不弹窗
    if (mode === "withdraw") executeVoidWithdraw(chestId, itemId, quality, 1);
    else executeVoidDeposit(chestId, itemId, quality, 1);
    return;
  }
  voidQtyModal.value = { mode, chestId, itemId, quality, max };
  voidQty.value = max;
};

const setVoidQty = (val: number) => {
  if (!voidQtyModal.value) return;
  voidQty.value = Math.max(1, Math.min(val, voidQtyModal.value.max));
};
const addVoidQty = (delta: number) => setVoidQty(voidQty.value + delta);
const onVoidQtyInput = (e: Event) => {
  const val = parseInt((e.target as HTMLInputElement).value, 10);
  if (!isNaN(val)) setVoidQty(val);
};

const executeVoidWithdraw = (
  chestId: string,
  itemId: string,
  quality: Quality,
  qty: number,
) => {
  if (!warehouseStore.withdrawFromChest(chestId, itemId, qty, quality)) {
    addLog("背包已满，无法取出。");
    return;
  }
  addLog(`从虚空箱取出了${getItemName(itemId)}×${qty}。`);
};

const executeVoidDeposit = (
  chestId: string,
  itemId: string,
  quality: Quality,
  qty: number,
) => {
  const actualQty = warehouseStore.depositToChest(
    chestId,
    itemId,
    qty,
    quality,
  );
  if (actualQty <= 0) {
    addLog("虚空箱已满，无法存入。");
    return;
  }
  addLog(`存入了${getItemName(itemId)}×${actualQty}到虚空箱。`);
  if (
    voidDepositableItems.value.length === 0 ||
    warehouseStore.isChestFull(chestId)
  ) {
    showVoidDepositModal.value = false;
  }
};

const confirmVoidQty = () => {
  if (!voidQtyModal.value) return;
  const { mode, chestId, itemId, quality } = voidQtyModal.value;
  if (mode === "withdraw")
    executeVoidWithdraw(chestId, itemId, quality, voidQty.value);
  else executeVoidDeposit(chestId, itemId, quality, voidQty.value);
  voidQtyModal.value = null;
};

const confirmSleep = () => {
  showSleepConfirm.value = false;
  pauseClock();
  handleEndDay();
  switchToSeasonalBgm();
  resumeClock();
};
</script>

<style scoped>
.world-announcement-box {
  width: min(86vw, 680px);
  overflow: hidden;
  border: 1px solid rgba(200, 164, 92, 0.55);
  background: rgba(26, 26, 26, 0.96);
  color: #c8a45c;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  padding: 8px 12px;
  border-radius: 2px;
  white-space: nowrap;
}
.world-announcement-box span {
  display: inline-block;
  min-width: 100%;
  padding-left: 100%;
  animation-name: world-marquee;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
@keyframes world-marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-100%);
  }
}

/* 移动端地图按钮 */
.mobile-map-btn,
.mobile-setting-btn {
  position: fixed;
  bottom: calc(calc(0.35rem * 10) + constant(safe-area-inset-bottom, 0px));
  bottom: calc(calc(0.35rem * 10) + env(safe-area-inset-bottom, 0px));
  right: 12px;
  z-index: 40;
  width: 40px;
  height: 40px;
  border-radius: 2px;
  background: rgb(var(--color-panel));
  border: 2px solid var(--color-accent);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  transition:
    background-color 0.15s,
    color 0.15s;
}

.mobile-setting-btn {
  bottom: calc(
    calc(0.35rem * 10) + 48px + constant(safe-area-inset-bottom, 0px)
  );
  bottom: calc(calc(0.35rem * 10) + 48px + env(safe-area-inset-bottom, 0px));
}

.mobile-void-btn {
  position: fixed;
  bottom: calc(
    calc(0.35rem * 10) + 96px + constant(safe-area-inset-bottom, 0px)
  );
  bottom: calc(calc(0.35rem * 10) + 96px + env(safe-area-inset-bottom, 0px));
  right: 12px;
  z-index: 40;
  width: 40px;
  height: 40px;
  border-radius: 2px;
  background: rgb(var(--color-panel));
  border: 2px solid var(--color-accent);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  transition:
    background-color 0.15s,
    color 0.15s;
}

.mobile-log-btn {
  position: fixed;
  bottom: calc(
    calc(0.35rem * 10) + 96px + constant(safe-area-inset-bottom, 0px)
  );
  bottom: calc(calc(0.35rem * 10) + 96px + env(safe-area-inset-bottom, 0px));
  right: 12px;
  z-index: 40;
  width: 40px;
  height: 40px;
  border-radius: 2px;
  background: rgb(var(--color-panel));
  border: 2px solid var(--color-accent);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  transition:
    background-color 0.15s,
    color 0.15s;
}

.mobile-log-btn.with-void {
  bottom: calc(
    calc(0.35rem * 10) + 144px + constant(safe-area-inset-bottom, 0px)
  );
  bottom: calc(calc(0.35rem * 10) + 144px + env(safe-area-inset-bottom, 0px));
}

.mobile-map-btn:hover,
.mobile-map-btn:active,
.mobile-void-btn:hover,
.mobile-void-btn:active,
.mobile-log-btn:hover,
.mobile-log-btn:active {
  background: var(--color-accent);
  color: rgb(var(--color-bg));
}

@keyframes float-up {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  10% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-30px);
  }
}

.reward-burst-panel {
  border-color: rgba(var(--color-accent-rgb, 255, 180, 0), 0.55);
  box-shadow: 0 0 32px rgba(var(--color-accent-rgb, 255, 180, 0), 0.22);
}

.reward-line {
  border: 1px solid rgba(var(--color-accent-rgb, 255, 180, 0), 0.22);
  background: rgba(var(--color-accent-rgb, 255, 180, 0), 0.08);
  border-radius: 4px;
  padding: 0.35rem 0.25rem;
  color: var(--color-accent);
}

.daily-hook-card {
  border: 1px solid rgba(var(--color-accent-rgb, 255, 180, 0), 0.35);
  background: linear-gradient(
    135deg,
    rgba(var(--color-accent-rgb, 255, 180, 0), 0.12),
    rgba(20, 12, 4, 0.72)
  );
  border-radius: 4px;
  padding: 0.55rem 0.7rem;
  box-shadow: 0 0 18px rgba(var(--color-accent-rgb, 255, 180, 0), 0.08);
}
</style>

<style scoped>
.quick-use-float-btn {
  position: fixed;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 46;
  min-width: 46px;
  height: 38px;
  padding: 0 8px;
  border-radius: 999px;
  border: 2px solid var(--color-accent);
  background: linear-gradient(
    135deg,
    rgba(75, 45, 18, 0.96),
    rgba(200, 164, 92, 0.96)
  );
  color: rgb(var(--color-bg));
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 0 16px rgba(200, 164, 92, 0.28);
  font-size: 12px;
  font-weight: 700;
}
.quick-use-float-btn:hover {
  filter: brightness(1.08);
}
.quick-use-picker-mask {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.quick-use-picker {
  max-width: 340px;
  width: 100%;
  position: relative;
  max-height: min(78vh, 620px);
  overflow-y: auto;
  overscroll-behavior: contain;
}
.quick-preset-btn {
  min-height: 34px;
  border: 1px solid rgba(200, 164, 92, 0.28);
  border-radius: 4px;
  padding: 5px 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: var(--color-muted);
  background: rgba(200, 164, 92, 0.04);
  font-size: 11px;
}
.quick-preset-btn.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: rgba(200, 164, 92, 0.12);
}
.quick-use-slot {
  min-height: 56px;
  border: 1px solid rgba(200, 164, 92, 0.28);
  border-radius: 4px;
  padding: 6px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--color-muted);
  background: rgba(200, 164, 92, 0.04);
  font-size: 11px;
}
.quick-use-slot.filled {
  color: var(--color-accent);
  background: rgba(200, 164, 92, 0.1);
}
.quick-use-slot em {
  font-size: 10px;
  color: var(--color-muted);
  font-style: normal;
}

.floating-welfare-btn {
  position: fixed;
  right: 12px;
  bottom: calc(calc(0.35rem * 10) + 144px + env(safe-area-inset-bottom, 0px));
  z-index: 45;
  min-width: 48px;
  height: 40px;
  padding: 0 8px;
  border-radius: 999px;
  border: 2px solid var(--color-accent);
  background: linear-gradient(
    135deg,
    rgba(200, 164, 92, 0.96),
    rgba(120, 78, 28, 0.96)
  );
  color: rgb(var(--color-bg));
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 0 16px rgba(200, 164, 92, 0.35);
  font-size: 12px;
  font-weight: 700;
}
.floating-welfare-btn em {
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  font-style: normal;
}
.floating-welfare-card {
  border: 1px solid rgba(200, 164, 92, 0.24);
  border-radius: 2px;
  padding: 10px;
  background: rgba(200, 164, 92, 0.04);
}
.floating-welfare-card.claimed {
  opacity: 0.58;
}

@media (max-width: 640px) {
  .quick-use-float-btn,
  .floating-welfare-btn {
    width: 34px;
    min-width: 34px;
    height: 34px;
    padding: 0;
    justify-content: center;
    gap: 0;
    touch-action: manipulation;
  }
  .quick-use-float-btn {
    top: auto;
    right: 12px;
    bottom: calc(calc(0.35rem * 10) + 192px + env(safe-area-inset-bottom, 0px));
    transform: none;
  }
  .floating-welfare-btn {
    right: 54px;
    bottom: calc(calc(0.35rem * 10) + 144px + env(safe-area-inset-bottom, 0px));
  }
  .quick-use-float-btn > span,
  .floating-welfare-btn > span {
    display: none;
  }
  .floating-welfare-btn em {
    position: absolute;
    top: -6px;
    right: -6px;
  }
}

@media (max-width: 640px) {
  .quick-use-picker-mask {
    align-items: flex-end;
    padding: 10px;
  }
  .quick-use-picker {
    max-width: none;
    max-height: min(82vh, 620px);
  }
}
</style>
