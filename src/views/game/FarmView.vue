<template>
  <div>
    <!-- 标签切换 -->
    <div class="flex space-x-1.5 mb-3">
      <Button
        class="flex-1 justify-center"
        :class="{ '!bg-accent !text-bg': farmTab === 'field' }"
        :icon="Sprout"
        @click="farmTab = 'field'"
      >
        灵田洞天
      </Button>
      <Button
        class="flex-1 justify-center"
        :class="{ '!bg-accent !text-bg': farmTab === 'tree' }"
        :icon="TreeDeciduous"
        @click="farmTab = 'tree'"
      >
        林木
      </Button>
    </div>

    <!-- 灵田洞天标签 -->
    <div v-if="farmTab === 'field'">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center space-x-1.5 text-sm text-accent">
          <Sprout :size="14" />
          <span
            >灵田洞天 ({{ farmStore.farmSize }}×{{ farmStore.farmSize }})</span
          >
        </div>
        <div class="text-xs text-muted flex space-x-3">
          <span
            v-if="farmStore.scarecrows > 0"
            class="inline-flex items-center space-x-0.5"
          >
            <Bird :size="12" />
            <span>稻草人 {{ farmStore.scarecrows }}</span>
          </span>
          <span
            v-else
            class="text-danger/80 inline-flex items-center space-x-0.5"
          >
            <Bird :size="12" />
            <span>无稻草人</span>
          </span>
          <span
            v-if="farmStore.lightningRods > 0"
            class="inline-flex items-center space-x-0.5"
          >
            <Zap :size="12" />
            <span>避雷针 {{ farmStore.lightningRods }}</span>
          </span>
        </div>
      </div>

      <!-- 新手引导 -->
      <p v-if="tutorialHint" class="text-[10px] text-muted/50 mb-2">
        {{ tutorialHint }}
      </p>

      <!-- 中后期经营目标 -->
      <div
        class="mb-3 border border-accent/20 rounded-xs p-3 space-y-2 bg-black/10"
      >
        <div class="flex items-center justify-between">
          <p class="text-xs text-accent">灵田经营目标</p>
          <span class="text-[10px] text-muted"
            >规模 · 温室 · 自动化 · 灵植链</span
          >
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div
            v-for="goal in farmGoalCards"
            :key="goal.id"
            class="border border-accent/10 rounded-xs p-2 space-y-1"
            :class="goal.done && !goal.claimed ? 'bg-accent/5' : ''"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs">{{ goal.title }}</span
              ><span class="text-[10px] text-muted"
                >{{ goal.progress }}/{{ goal.target }}</span
              >
            </div>
            <p class="text-[10px] text-muted leading-relaxed">
              {{ goal.desc }}
            </p>
            <div
              class="h-1.5 bg-bg border border-accent/20 rounded-xs overflow-hidden"
            >
              <div
                class="h-full bg-accent"
                :style="{
                  width:
                    Math.min(
                      100,
                      Math.floor(
                        (goal.progress / Math.max(1, goal.target)) * 100,
                      ),
                    ) + '%',
                }"
              />
            </div>
            <div class="text-[10px] text-accent">
              {{ longTerm.rewardText(goal.reward) }}
            </div>
            <button
              class="btn w-full justify-center text-xs"
              :disabled="!goal.done || goal.claimed"
              @click="claimFarmGoal(goal.id)"
            >
              {{ goal.claimed ? "已领取" : goal.done ? "领取奖励" : "经营中" }}
            </button>
          </div>
        </div>
      </div>

      <!-- 批量操作入口 -->
      <div class="mb-3">
        <Button
          class="w-full md:w-auto"
          :icon-size="12"
          :icon="Wrench"
          @click="showBatchActions = true"
          >一键操作</Button
        >
      </div>

      <!-- 灵田洞天特殊功能 -->
      <div
        v-if="
          gameStore.farmMapType === 'riverland' &&
          gameStore.creekCatch.length > 0
        "
        class="mb-3"
      >
        <div
          class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
          @click="handleCollectCreekCatch"
        >
          <div>
            <p class="text-xs text-accent">溪流鱼获</p>
            <p class="text-[10px] text-muted">
              溪流中捕获了{{ gameStore.creekCatch.length }}条鱼
            </p>
          </div>
          <span class="text-xs text-success">收取</span>
        </div>
      </div>

      <div
        v-if="gameStore.farmMapType === 'hilltop' && gameStore.surfaceOrePatch"
        class="mb-3"
      >
        <div
          class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
          @click="handleMineSurfaceOre"
        >
          <div>
            <p class="text-xs text-accent">地表矿脉</p>
            <p class="text-[10px] text-muted">
              发现{{ surfaceOreName }}&times;{{
                gameStore.surfaceOrePatch.quantity
              }}
            </p>
          </div>
          <span class="text-xs text-success">开采（-5体力）</span>
        </div>
      </div>

      <!-- 批量操作弹窗 -->
      <Transition name="panel-fade">
        <div
          v-if="showBatchActions"
          class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          @click.self="showBatchActions = false"
        >
          <div class="game-panel max-w-xs w-full relative">
            <button
              class="absolute top-2 right-2 text-muted hover:text-text"
              @click="showBatchActions = false"
            >
              <X :size="14" />
            </button>
            <p class="text-accent text-sm mb-2">一键操作</p>
            <div class="flex flex-col space-y-1.5">
              <button
                class="btn text-xs w-full justify-between"
                :disabled="unwateredCount === 0"
                @click="doBatchAction('water')"
              >
                <span class="flex items-center space-x-1">
                  <Droplets :size="12" />
                  <span>一键浇水</span>
                </span>
                <span class="text-muted">{{ unwateredCount }} 块</span>
              </button>
              <button
                class="btn text-xs w-full justify-between"
                :disabled="wastelandCount === 0"
                @click="doBatchAction('till')"
              >
                <span class="flex items-center space-x-1">
                  <Shovel :size="12" />
                  <span>一键开垦</span>
                </span>
                <span class="text-muted">{{ wastelandCount }} 块</span>
              </button>
              <button
                class="btn text-xs w-full justify-between"
                :disabled="harvestableCount === 0"
                @click="doBatchAction('harvest')"
              >
                <span class="flex items-center space-x-1">
                  <Wheat :size="12" />
                  <span>一键收获</span>
                </span>
                <span class="text-muted">{{ harvestableCount }} 块</span>
              </button>
              <button
                class="btn text-xs w-full justify-between"
                :disabled="
                  tilledEmptyCount === 0 ||
                  (plantableSeeds.length === 0 &&
                    plantableBreedingSeeds.length === 0)
                "
                @click="doBatchAction('plant')"
              >
                <span class="flex items-center space-x-1">
                  <Sprout :size="12" />
                  <span>一键种植</span>
                </span>
                <span class="text-muted">{{ tilledEmptyCount }} 块</span>
              </button>
              <button
                class="btn text-xs w-full justify-between"
                :disabled="
                  fertilizableCount === 0 || fertilizerItems.length === 0
                "
                @click="doBatchAction('fertilize')"
              >
                <span class="flex items-center space-x-1">
                  <CirclePlus :size="12" />
                  <span>一键施肥</span>
                </span>
                <span class="text-muted">{{ fertilizableCount }} 块</span>
              </button>
              <button
                class="btn text-xs w-full justify-between"
                :disabled="infestedCount === 0"
                @click="doBatchAction('curePest')"
              >
                <span class="flex items-center space-x-1">
                  <Bug :size="12" />
                  <span>一键除虫</span>
                </span>
                <span class="text-muted">{{ infestedCount }} 块</span>
              </button>
              <button
                class="btn text-xs w-full justify-between"
                :disabled="weedyCount === 0"
                @click="doBatchAction('clearWeed')"
              >
                <span class="flex items-center space-x-1">
                  <Leaf :size="12" />
                  <span>一键除草</span>
                </span>
                <span class="text-muted">{{ weedyCount }} 块</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 像素灵灵畦图 -->
      <div class="pixel-farm-shell">
        <div class="pixel-farm-topbar">
          <div class="pixel-farm-title">
            <span class="pixel-farm-badge">FIELD</span>
            <span
              >{{ farmStore.farmSize }}×{{ farmStore.farmSize }} 像素田畴</span
            >
          </div>
          <div class="pixel-farm-minimap">
            <span class="pixel-dot pixel-dot-water"></span>
            <span>{{ unwateredCount }} 待浇</span>
            <span class="pixel-dot pixel-dot-gold"></span>
            <span>{{ harvestableCount }} 可收</span>
          </div>
        </div>
        <div class="pixel-farm-board">
          <div
            class="pixel-farm-grid"
            :style="{
              gridTemplateColumns: `repeat(${farmStore.farmSize}, minmax(0, 1fr))`,
            }"
          >
            <button
              v-for="plot in farmStore.plots"
              :key="plot.id"
              class="farm-plot pixel-farm-tile cursor-pointer relative leading-tight"
              :class="[
                getPlotDisplay(plot).color,
                getPlotDisplay(plot).bg,
                getPixelPlotClass(plot),
                {
                  'tile-needs-water': needsWater(plot),
                  'tile-sprinkler-covered': isSprinklerCovered(plot.id),
                  'tile-selected': activePlotId === plot.id,
                  'tile-ready': plot.state === 'harvestable',
                },
              ]"
              :title="getPlotTooltip(plot)"
              @click="activePlotId = plot.id"
            >
              <span class="pixel-tile-coord">{{ plot.id + 1 }}</span>
              <div class="pixel-plot-scene">
                <div class="pixel-soil-lines"></div>
                <div
                  v-if="plot.cropId"
                  class="pixel-crop"
                  :class="getCropPixelClass(plot.cropId, plot.state)"
                >
                  <span class="pixel-crop-sprout">{{
                    getCropPixelGlyph(plot.cropId, plot.state)
                  }}</span>
                  <span class="pixel-crop-name">{{
                    getCropName(plot.cropId)
                  }}</span>
                </div>
                <component
                  v-else
                  :is="getPlotDisplay(plot).icon"
                  :size="14"
                  class="pixel-empty-icon"
                />
                <span
                  v-if="plot.giantCropGroup !== null"
                  class="pixel-giant-mark"
                  >★</span
                >
              </div>
              <div class="pixel-tile-overlay">
                <span
                  v-if="needsWater(plot)"
                  class="pixel-status-chip chip-danger"
                  ><Droplets :size="8"
                /></span>
                <span
                  v-if="hasSprinkler(plot.id)"
                  class="pixel-status-chip chip-water"
                  ><Droplet :size="8"
                /></span>
                <span v-if="plot.fertilizer" class="pixel-status-chip chip-fert"
                  ><CirclePlus :size="8"
                /></span>
                <span v-if="plot.infested" class="pixel-status-chip chip-danger"
                  ><Bug :size="8"
                /></span>
                <span v-if="plot.weedy" class="pixel-status-chip chip-weed"
                  ><Leaf :size="8"
                /></span>
              </div>
              <div
                v-if="plot.cropId && plot.state !== 'harvestable'"
                class="pixel-growth-track"
              >
                <span
                  :style="{ width: getPlotGrowthPercent(plot) + '%' }"
                ></span>
              </div>
              <div
                v-if="plot.state === 'harvestable'"
                class="pixel-ready-ribbon"
              >
                收
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- 地块操作弹窗 -->
      <Transition name="panel-fade">
        <div
          v-if="activePlot"
          class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          @click.self="activePlotId = null"
        >
          <div class="game-panel max-w-xs w-full relative">
            <button
              class="absolute top-2 right-2 text-muted hover:text-text"
              @click="activePlotId = null"
            >
              <X :size="14" />
            </button>
            <p class="text-accent text-sm mb-2">
              地块 #{{ activePlot.id + 1 }}
            </p>
            <p class="text-xs text-muted mb-2">
              {{ plotStateLabel }}
              <template v-if="activePlot.giantCropGroup !== null"
                >（巨型）</template
              >
              <template v-if="activePlot.cropId">
                · {{ activePlot.giantCropGroup !== null ? "巨型" : ""
                }}{{ getCropName(activePlot.cropId) }}
                <span v-if="plotCropRegrowth" class="text-success"
                  >[多茬 {{ activePlot.harvestCount }}/{{
                    plotCropMaxHarvests
                  }}]</span
                >
              </template>
              <template
                v-if="activePlot.cropId && activePlot.giantCropGroup === null"
              >
                ·
                <span
                  :class="activePlot.watered ? 'text-water' : 'text-danger'"
                  >{{ activePlot.watered ? "已浇水" : "未浇水" }}</span
                >
              </template>
              <template v-if="activePlot.fertilizer">
                ·
                <span class="text-success">{{ plotFertName }}</span>
              </template>
              <template v-if="hasSprinkler(activePlot.id)">
                ·
                <span class="text-water">洒水器</span>
              </template>
              <template v-if="activePlot.infested">
                ·
                <span class="text-danger"
                  >虫害({{ activePlot.infestedDays }}天)</span
                >
              </template>
              <template v-if="activePlot.weedy">
                ·
                <span class="text-success"
                  >杂草({{ activePlot.weedyDays }}天)</span
                >
              </template>
            </p>
            <!-- 生长进度条 -->
            <div
              v-if="activePlot.cropId && activePlot.state !== 'harvestable'"
              class="flex items-center space-x-2 mb-2"
            >
              <span class="text-xs text-muted shrink-0">生长</span>
              <div class="flex-1 h-1 bg-bg rounded-xs border border-accent/10">
                <div
                  class="h-full rounded-xs bg-success transition-all"
                  :style="{
                    width:
                      Math.min(
                        100,
                        Math.floor(
                          (activePlot.growthDays /
                            (Number(plotCropGrowthDays) || 1)) *
                            100,
                        ),
                      ) + '%',
                  }"
                />
              </div>
              <span class="text-xs text-muted whitespace-nowrap">
                {{ Number(activePlot.growthDays.toFixed(2)) }}/{{
                  plotCropGrowthDays
                }}天
              </span>
            </div>
            <p
              v-if="activePlot.giantCropGroup !== null"
              class="text-xs text-accent mb-2"
            >
              收获可获得大量灵植！
            </p>

            <!-- 操作列表 -->
            <div class="flex flex-col space-y-1 max-h-60 overflow-y-auto">
              <Button
                v-if="activePlot.state === 'wasteland'"
                class="w-full justify-center shrink-0"
                :icon-size="12"
                :icon="Shovel"
                @click="doTill"
              >
                开垦
              </Button>
              <Button
                v-if="canWater"
                class="w-full justify-center shrink-0"
                :icon-size="12"
                :icon="Droplets"
                @click="doWater"
                >浇水</Button
              >
              <Button
                v-if="activePlot.infested"
                class="w-full justify-center shrink-0 !bg-danger !text-text"
                :icon-size="12"
                :icon="Bug"
                @click="doCurePest"
              >
                除虫
              </Button>
              <Button
                v-if="activePlot.weedy"
                class="w-full justify-center shrink-0 !bg-success !text-bg"
                :icon-size="12"
                :icon="Leaf"
                @click="doClearWeed"
              >
                除草
              </Button>
              <Button
                v-if="activePlot.state === 'harvestable'"
                class="w-full justify-center shrink-0 !bg-accent !text-bg"
                :icon-size="12"
                :icon="Wheat"
                @click="doHarvest"
              >
                收获
              </Button>
              <Button
                v-if="
                  activePlot.state === 'planted' ||
                  activePlot.state === 'growing' ||
                  activePlot.state === 'harvestable'
                "
                class="w-full justify-center shrink-0"
                :icon-size="12"
                :icon="Trash2"
                @click="doRemoveCrop"
              >
                铲除
              </Button>
              <template
                v-if="
                  activePlot.state === 'tilled' && plantableSeeds.length > 0
                "
              >
                <Divider label="种植" />
                <button
                  v-for="seed in plantableSeeds"
                  :key="seed.cropId + ':' + seed.quality"
                  class="btn text-xs justify-between mr-1 shrink-0"
                  @click="doPlant(seed.cropId, seed.quality)"
                >
                  <span class="seed-pixel-row" :class="seed.colorClass">
                    <span
                      class="seed-pixel-bag"
                      :class="getSeedPixelClass(seed.cropId)"
                      >{{ getSeedPixelGlyph(seed.cropId) }}</span
                    >
                    <span>{{ seed.name }}</span>
                    <span
                      v-if="seed.quality !== 'normal'"
                      :class="{
                        'text-quality-fine': seed.quality === 'fine',
                        'text-quality-excellent': seed.quality === 'excellent',
                        'text-quality-supreme': seed.quality === 'supreme',
                      }"
                      class="ml-0.5"
                    >
                      [{{ QUALITY_NAMES[seed.quality] }}]
                    </span>
                    <span v-if="seed.regrowth" class="text-success ml-1"
                      >[多茬]</span
                    >
                  </span>
                  <span class="text-muted">×{{ seed.count }}</span>
                </button>
              </template>
              <template
                v-if="
                  activePlot.state === 'tilled' &&
                  plantableBreedingSeeds.length > 0
                "
              >
                <Divider label="育种灵种" class="!my-2" />
                <button
                  v-for="seed in plantableBreedingSeeds"
                  :key="seed.genetics.id"
                  class="btn text-xs justify-between mr-1 shrink-0"
                  @click="doPlantGeneticSeed(seed.genetics.id)"
                >
                  <span
                    >{{ getCropName(seed.genetics.cropId) }} G{{
                      seed.genetics.generation
                    }}</span
                  >
                  <span class="text-muted flex items-center space-x-px">
                    <Star
                      v-for="n in getStarRating(seed.genetics)"
                      :key="n"
                      :size="10"
                    />
                  </span>
                </button>
              </template>
              <!-- 灵种空状态 -->
              <div
                v-if="
                  activePlot.state === 'tilled' &&
                  plantableSeeds.length === 0 &&
                  plantableBreedingSeeds.length === 0
                "
                class="flex flex-col items-center py-4"
              >
                <Sprout :size="32" class="text-muted/30" />
                <p class="text-xs text-muted mt-2">
                  纳戒中没有当季可种植的灵种
                </p>
                <Button
                  v-if="isWanwupuOpen"
                  class="mt-2"
                  :icon-size="12"
                  :icon="Store"
                  @click="goToShop"
                  >前往万象铺购买</Button
                >
                <p v-else class="text-[10px] text-muted/60 mt-1">
                  {{ wanwupuClosedReason }}
                </p>
              </div>
              <template v-if="canFertilize && fertilizerItems.length > 0">
                <Divider label="施肥" />
                <button
                  v-for="f in fertilizerItems"
                  :key="f.itemId"
                  class="btn text-xs justify-between mr-1 shrink-0"
                  @click="doFertilize(f.type)"
                >
                  <span :class="f.colorClass">{{ f.name }}</span>
                  <span class="text-muted">×{{ f.count }}</span>
                </button>
              </template>
              <template
                v-if="!hasSprinkler(activePlot.id) && sprinklerItems.length > 0"
              >
                <Divider label="洒水器" />
                <button
                  v-for="s in sprinklerItems"
                  :key="s.itemId"
                  class="btn text-xs justify-between mr-1 shrink-0"
                  @click="doPlaceSprinkler(s.type)"
                >
                  <span :class="s.colorClass">{{ s.name }}</span>
                  <span class="text-muted">×{{ s.count }}</span>
                </button>
              </template>
              <Button
                v-if="hasSprinkler(activePlot.id)"
                class="mr-1 justify-center shrink-0"
                @click="doRemoveSprinkler"
                >拆除洒水器</Button
              >
            </div>
          </div>
        </div>
      </Transition>

      <!-- 一键种植弹窗 -->
      <Transition name="panel-fade">
        <div
          v-if="showBatchPlant"
          class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          @click.self="showBatchPlant = false"
        >
          <div class="game-panel max-w-xs w-full relative">
            <button
              class="absolute top-2 right-2 text-muted hover:text-text"
              @click="showBatchPlant = false"
            >
              <X :size="14" />
            </button>
            <p class="text-accent text-sm mb-2">一键种植</p>
            <p class="text-xs text-muted mb-2">
              空耕地 {{ tilledEmptyCount }} 块，选择要种植的灵种：
            </p>
            <div class="flex flex-col space-y-1 max-h-40 overflow-y-auto">
              <button
                v-for="seed in plantableSeeds"
                :key="seed.cropId"
                class="btn text-xs justify-between mr-1 shrink-0"
                @click="doBatchPlant(seed.cropId)"
              >
                <span class="seed-pixel-row" :class="seed.colorClass">
                  <span
                    class="seed-pixel-bag"
                    :class="getSeedPixelClass(seed.cropId)"
                    >{{ getSeedPixelGlyph(seed.cropId) }}</span
                  >
                  <span>{{ seed.name }}</span>
                  <span v-if="seed.regrowth" class="text-success ml-1"
                    >[多茬]</span
                  >
                </span>
                <span class="text-muted">×{{ seed.count }}</span>
              </button>
            </div>
            <template v-if="batchBreedingSeedGroups.length > 0">
              <Divider label="育种灵种" class="!my-2" />
              <div class="flex flex-col space-y-1 max-h-40 overflow-y-auto">
                <button
                  v-for="group in batchBreedingSeedGroups"
                  :key="group.cropId"
                  class="btn text-xs justify-between mr-1 shrink-0"
                  @click="doBatchPlantBreeding(group.cropId)"
                >
                  <span>
                    {{ group.name }}
                    <span class="text-muted"
                      >G{{ group.minGen
                      }}{{
                        group.minGen !== group.maxGen ? `~${group.maxGen}` : ""
                      }}</span
                    >
                  </span>
                  <span class="text-muted">×{{ group.count }}</span>
                </button>
              </div>
            </template>
            <div
              v-if="
                plantableSeeds.length === 0 &&
                batchBreedingSeedGroups.length === 0
              "
              class="flex flex-col items-center py-4"
            >
              <Sprout :size="32" class="text-muted/30" />
              <p class="text-xs text-muted mt-2">没有当季可种植的灵种</p>
              <Button
                v-if="isWanwupuOpen"
                class="mt-2"
                :icon-size="12"
                :icon="Store"
                @click="goToShop"
                >前往万象铺购买</Button
              >
              <p v-else class="text-[10px] text-muted/60 mt-1">
                {{ wanwupuClosedReason }}
              </p>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 一键施肥弹窗 -->
      <Transition name="panel-fade">
        <div
          v-if="showBatchFertilize"
          class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          @click.self="showBatchFertilize = false"
        >
          <div class="game-panel max-w-xs w-full relative">
            <button
              class="absolute top-2 right-2 text-muted hover:text-text"
              @click="showBatchFertilize = false"
            >
              <X :size="14" />
            </button>
            <p class="text-accent text-sm mb-2">一键施肥</p>
            <p class="text-xs text-muted mb-2">
              可施肥地块 {{ fertilizableCount }} 块，选择肥料：
            </p>
            <div class="flex flex-col space-y-1 max-h-60 overflow-y-auto">
              <button
                v-for="f in fertilizerItems"
                :key="f.itemId"
                class="btn text-xs justify-between mr-1 shrink-0"
                @click="doBatchFertilize(f.type)"
              >
                <span :class="f.colorClass">{{ f.name }}</span>
                <span class="text-muted">×{{ f.count }}</span>
              </button>
            </div>
            <div
              v-if="fertilizerItems.length === 0"
              class="flex flex-col items-center py-4"
            >
              <CirclePlus :size="32" class="text-muted/30" />
              <p class="text-xs text-muted mt-2">没有可用的肥料</p>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 图例与提示 -->
      <div class="mt-2 border border-accent/10 rounded-xs p-2">
        <div
          class="grid grid-cols-4 md:space-x-3 md:flex md:flex-wrap text-xs text-muted"
        >
          <span v-for="(item, i) in PLOT_LEGENDS" :key="i">
            <component
              :is="item.icon"
              :size="10"
              :class="[item.color, 'inline']"
            />
            {{ item.label }}
          </span>
        </div>
        <div
          v-if="plotWarnings.length > 0"
          class="flex flex-wrap space-x-2 mt-1.5 border border-accent/20 rounded-xs p-2"
        >
          <span
            v-for="(w, i) in plotWarnings"
            :key="i"
            class="inline-flex items-center space-x-0.5 text-xs"
            :class="w.color"
          >
            {{ w.text }}
          </span>
        </div>
      </div>

      <!-- 出货灵匣入口 -->
      <div
        class="mt-3 flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
        @click="showShippingBox = true"
      >
        <div class="flex items-center space-x-1.5">
          <Package :size="14" class="text-accent" />
          <span class="text-sm text-accent">出货灵匣</span>
          <span
            v-if="shopStore.shippingBox.length > 0"
            class="text-xs text-muted"
            >{{ shopStore.shippingBox.length }}种</span
          >
        </div>
        <span v-if="shippingBoxTotal > 0" class="text-xs text-accent"
          >≈{{ shippingBoxTotal }}文</span
        >
        <span v-else class="text-xs text-muted">空</span>
      </div>

      <!-- 出货灵匣弹窗 -->
      <Transition name="panel-fade">
        <div
          v-if="showShippingBox"
          class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          @click.self="showShippingBox = false"
        >
          <div class="game-panel max-w-xs w-full relative">
            <button
              class="absolute top-2 right-2 text-muted hover:text-text"
              @click="showShippingBox = false"
            >
              <X :size="14" />
            </button>
            <div class="flex items-center space-x-1.5 text-sm text-accent mb-1">
              <Package :size="14" />
              <span>出货灵匣</span>
            </div>
            <p class="text-xs text-muted mb-2">放入的物品将在次日结算。</p>
            <div class="flex flex-wrap gap-1 mb-2">
              <button
                v-for="option in shippingFilterOptions"
                :key="option.value"
                class="btn btn-xs"
                :class="{ '!bg-accent !text-bg': shippingFilter === option.value }"
                @click="shippingFilter = option.value"
              >
                {{ option.label }}
              </button>
            </div>
            <p
              v-if="inventoryStore.getRingEffectValue('sell_price_bonus') > 0"
              class="text-success text-xs mb-2"
            >
              戒指加成中：售价 +{{
                Math.round(
                  inventoryStore.getRingEffectValue("sell_price_bonus") * 100,
                )
              }}%
            </p>

            <!-- 已放入的物品 -->
            <div
              v-if="shopStore.shippingBox.length > 0"
              class="border border-accent/10 rounded-xs p-2 mb-2"
            >
              <p class="text-xs text-muted mb-1">已放入</p>
              <div class="flex flex-col space-y-1 max-h-36 overflow-y-auto">
                <div
                  v-for="(entry, idx) in shopStore.shippingBox"
                  :key="idx"
                  class="flex items-center justify-between border border-accent/20 rounded-xs px-2 py-1 cursor-pointer hover:bg-accent/5"
                  @click="
                    handleRemoveFromBox(
                      entry.itemId,
                      entry.quantity,
                      entry.quality,
                    )
                  "
                >
                  <div class="min-w-0">
                    <span
                      class="text-xs"
                      :class="{
                        'text-quality-fine': entry.quality === 'fine',
                        'text-quality-excellent': entry.quality === 'excellent',
                        'text-quality-supreme': entry.quality === 'supreme',
                      }"
                    >
                      {{ getItemName(entry.itemId) }}
                    </span>
                    <span class="text-muted text-xs ml-1"
                      >×{{ entry.quantity }}</span
                    >
                  </div>
                  <span class="text-xs text-accent whitespace-nowrap ml-2">
                    ≈{{
                      shopStore.calculateSellPrice(
                        entry.itemId,
                        entry.quantity,
                        entry.quality,
                      )
                    }}文
                  </span>
                </div>
              </div>
              <p class="text-xs text-accent mt-1.5">
                预计收入：{{ shippingBoxTotal }}文
              </p>
            </div>
            <div
              v-else
              class="flex flex-col items-center justify-center py-4 text-muted mb-2"
            >
              <Package :size="32" class="text-muted/30" />
              <p class="text-xs mt-2">出货灵匣是空的</p>
            </div>

            <!-- 可放入的纳戒物品 -->
            <div
              v-if="shippableItems.length > 0"
              class="border border-accent/10 rounded-xs p-2"
            >
              <p class="text-xs text-muted mb-1">纳戒物品</p>
              <div class="flex flex-col space-y-1 overflow-auto max-h-48">
                <div
                  v-for="item in shippableItems"
                  :key="item.itemId + item.quality"
                  class="flex items-center justify-between border border-accent/10 rounded-xs px-2 py-1 mr-1"
                >
                  <div class="min-w-0 flex items-center space-x-1">
                    <span
                      class="text-xs"
                      :class="{
                        'text-quality-fine': item.quality === 'fine',
                        'text-quality-excellent': item.quality === 'excellent',
                        'text-quality-supreme': item.quality === 'supreme',
                      }"
                    >
                      {{ item.def?.name }}
                    </span>
                    <span class="text-muted text-xs">×{{ item.quantity }}</span>
                    <span
                      v-if="shopStore.shippedItems.includes(item.itemId)"
                      class="text-[10px] text-success/60"
                      >[已出货]</span
                    >
                  </div>
                  <div class="flex space-x-1">
                    <Button
                      @click="handleAddToBox(item.itemId, 1, item.quality)"
                      >放入1</Button
                    >
                    <Button
                      v-if="item.quantity > 1"
                      @click="
                        handleAddToBox(item.itemId, item.quantity, item.quality)
                      "
                      >全部</Button
                    >
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="flex flex-col items-center py-3 text-muted">
              <Wheat :size="32" class="text-muted/30" />
              <p class="text-xs mt-2">纳戒中没有可出货的物品</p>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 温室入口 -->
      <div
        v-if="showGreenhouse"
        class="mt-3 flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
        @click="showGreenhouseModal = true"
      >
        <div class="flex items-center space-x-1.5">
          <Warehouse :size="14" class="text-accent" />
          <span class="text-sm text-accent">温室</span>
          <span v-if="ghHarvestableCount > 0" class="text-xs text-accent"
            >{{ ghHarvestableCount }}块可收获</span
          >
        </div>
        <span class="text-xs text-muted"
          >{{ farmStore.greenhousePlots.length }}块地</span
        >
      </div>
    </div>

    <!-- 林木标签 -->
    <div v-if="farmTab === 'tree'">
      <!-- 果树区 -->
      <div class="border border-accent/20 rounded-xs p-3">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-1.5 text-sm text-accent">
            <TreeDeciduous :size="14" />
            <span>果树</span>
          </div>
          <span class="text-xs text-muted"
            >{{ farmStore.fruitTrees.length }}/{{ MAX_FRUIT_TREES }}</span
          >
        </div>
        <div
          v-if="farmStore.fruitTrees.length > 0"
          class="flex flex-col space-y-1.5 mb-2"
        >
          <div
            v-for="tree in farmStore.fruitTrees"
            :key="tree.id"
            class="border border-accent/10 rounded-xs px-3 py-2"
          >
            <div class="flex items-center justify-between mb-1">
              <span
                class="text-xs font-bold"
                :class="tree.mature ? 'text-accent' : 'text-muted'"
                >{{ getTreeName(tree.type) }}</span
              >
              <span v-if="tree.mature" class="text-[10px] text-muted"
                >{{ tree.yearAge }}年</span
              >
            </div>
            <template v-if="!tree.mature">
              <div class="flex items-center space-x-2 mb-1.5">
                <div
                  class="flex-1 h-1 bg-bg rounded-xs border border-accent/10"
                >
                  <div
                    class="h-full rounded-xs bg-success transition-all"
                    :style="{
                      width:
                        Math.min(
                          100,
                          Math.floor((tree.growthDays / 28) * 100),
                        ) + '%',
                    }"
                  />
                </div>
                <span class="text-[10px] text-muted whitespace-nowrap"
                  >{{ tree.growthDays }}/28天</span
                >
              </div>
              <div class="flex justify-end">
                <Button
                  :icon-size="12"
                  :icon="Axe"
                  @click.stop="
                    chopFruitTreeTarget = { id: tree.id, type: tree.type }
                  "
                  >砍伐</Button
                >
              </div>
            </template>
            <template v-else>
              <div class="flex items-center justify-between">
                <span v-if="tree.todayFruit" class="text-[10px] text-accent"
                  >今日已结果</span
                >
                <span v-else class="text-[10px] text-success"
                  >{{ getTreeFruitSeason(tree.type) }}产果</span
                >
                <Button
                  :icon-size="12"
                  :icon="Axe"
                  @click.stop="
                    chopFruitTreeTarget = { id: tree.id, type: tree.type }
                  "
                  >砍伐</Button
                >
              </div>
            </template>
          </div>
        </div>
        <div
          v-else
          class="flex flex-col items-center justify-center py-4 text-muted mb-2"
        >
          <TreeDeciduous :size="32" class="text-muted/30" />
          <p class="text-xs mt-2">暂无果树</p>
          <p class="text-[10px] text-muted/60 mt-0.5">可在万象铺购买树苗种植</p>
        </div>
        <div
          v-if="
            plantableSaplings.length > 0 &&
            farmStore.fruitTrees.length < MAX_FRUIT_TREES
          "
          class="flex space-x-1.5 flex-wrap"
        >
          <Button
            v-for="s in plantableSaplings"
            :key="s.saplingId"
            :icon-size="12"
            :icon="TreePine"
            @click="handlePlantTree(s.type)"
          >
            种{{ s.name }} (×{{ s.count }})
          </Button>
        </div>
      </div>

      <!-- 砍伐果树确认弹窗 -->
      <Transition name="panel-fade">
        <div
          v-if="chopFruitTreeTarget"
          class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          @click.self="chopFruitTreeTarget = null"
        >
          <div class="game-panel max-w-xs w-full relative">
            <button
              class="absolute top-2 right-2 text-muted hover:text-text"
              @click="chopFruitTreeTarget = null"
            >
              <X :size="14" />
            </button>
            <p class="text-accent text-sm mb-2">砍伐果树</p>
            <p class="text-xs text-text mb-3">
              确定要砍掉
              <span class="text-accent">{{
                getTreeName(chopFruitTreeTarget.type)
              }}</span>
              吗？砍伐后不可恢复。
            </p>
            <div class="flex space-x-2">
              <Button class="flex-1" @click="chopFruitTreeTarget = null"
                >取消</Button
              >
              <Button
                class="flex-1 !bg-danger !text-text"
                :icon-size="12"
                :icon="Axe"
                @click="confirmChopFruitTree"
                >确认砍伐</Button
              >
            </div>
          </div>
        </div>
      </Transition>

      <!-- 野树伐木确认弹窗 -->
      <Transition name="panel-fade">
        <div
          v-if="chopWildTreeTarget"
          class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          @click.self="chopWildTreeTarget = null"
        >
          <div class="game-panel max-w-xs w-full relative">
            <button
              class="absolute top-2 right-2 text-muted hover:text-text"
              @click="chopWildTreeTarget = null"
            >
              <X :size="14" />
            </button>
            <p class="text-accent text-sm mb-2">伐木</p>
            <p class="text-xs text-text mb-2">
              确定要对
              <span class="text-accent">{{
                getWildTreeName(chopWildTreeTarget.type)
              }}</span>
              伐木吗？
            </p>
            <p class="text-xs text-danger mb-3">
              已伐木 {{ chopWildTreeTarget.chopCount }}/3 次，再伐
              {{ 3 - chopWildTreeTarget.chopCount }} 次后树将消失。
            </p>
            <div class="flex space-x-2">
              <Button class="flex-1" @click="chopWildTreeTarget = null"
                >取消</Button
              >
              <Button
                class="flex-1"
                :class="
                  chopWildTreeTarget.chopCount >= 2
                    ? '!bg-danger !text-text'
                    : '!bg-accent !text-bg'
                "
                :icon-size="12"
                :icon="Axe"
                @click="confirmChopWildTree"
              >
                {{ chopWildTreeTarget.chopCount >= 2 ? "确认" : "确认伐木" }}
              </Button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 野树区 -->
      <div class="mt-3 border border-accent/20 rounded-xs p-3">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-1.5 text-sm text-accent">
            <TreePine :size="14" />
            <span>野树</span>
          </div>
          <span class="text-xs text-muted"
            >{{ farmStore.wildTrees.length }}/{{ MAX_WILD_TREES }}</span
          >
        </div>
        <div
          v-if="farmStore.wildTrees.length > 0"
          class="flex flex-col space-y-1.5 mb-2"
        >
          <div
            v-for="tree in farmStore.wildTrees"
            :key="tree.id"
            class="border border-accent/10 rounded-xs px-3 py-2"
          >
            <!-- 第一行：树名 + 状态标签 -->
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center space-x-1.5">
                <span
                  class="text-xs font-bold"
                  :class="tree.mature ? 'text-accent' : 'text-muted'"
                  >{{ getWildTreeName(tree.type) }}</span
                >
                <span v-if="tree.chopCount > 0" class="text-[10px] text-danger"
                  >伐{{ tree.chopCount }}/3</span
                >
              </div>
              <span v-if="!tree.mature" class="text-[10px] text-muted"
                >生长中</span
              >
              <span
                v-else-if="tree.hasTapper && tree.tapReady"
                class="text-[10px] text-accent"
                >可收取</span
              >
              <span v-else-if="tree.hasTapper" class="text-[10px] text-muted"
                >采脂中</span
              >
              <span v-else class="text-[10px] text-success">已成熟</span>
            </div>
            <!-- 第二行：进度/详情 + 操作按钮 -->
            <template v-if="!tree.mature">
              <div class="flex items-center space-x-2 mb-1.5">
                <div
                  class="flex-1 h-1 bg-bg rounded-xs border border-accent/10"
                >
                  <div
                    class="h-full rounded-xs bg-success transition-all"
                    :style="{
                      width:
                        Math.min(
                          100,
                          Math.floor(
                            (tree.growthDays /
                              (getWildTreeDef(tree.type)?.growthDays ?? 28)) *
                              100,
                          ),
                        ) + '%',
                    }"
                  />
                </div>
                <span class="text-[10px] text-muted whitespace-nowrap">
                  {{ tree.growthDays }}/{{
                    getWildTreeDef(tree.type)?.growthDays ?? "?"
                  }}天
                </span>
              </div>
            </template>
            <template v-else-if="tree.hasTapper">
              <div class="flex items-center space-x-2 mb-1.5">
                <div
                  class="flex-1 h-1 bg-bg rounded-xs border border-accent/10"
                >
                  <div
                    class="h-full rounded-xs transition-all"
                    :class="tree.tapReady ? 'bg-accent' : 'bg-success'"
                    :style="{
                      width: tree.tapReady
                        ? '100%'
                        : Math.floor(
                            (tree.tapDaysElapsed /
                              (getWildTreeDef(tree.type)?.tapCycleDays ?? 7)) *
                              100,
                          ) + '%',
                    }"
                  />
                </div>
                <span class="text-[10px] text-muted whitespace-nowrap">
                  {{
                    tree.tapReady
                      ? "已完成"
                      : `${tree.tapDaysElapsed}/${getWildTreeDef(tree.type)?.tapCycleDays ?? "?"}天`
                  }}
                </span>
              </div>
            </template>
            <div class="flex items-center justify-end space-x-1.5">
              <Button
                v-if="tree.mature && tree.hasTapper && tree.tapReady"
                class="!bg-accent !text-bg"
                :icon-size="12"
                :icon="Gift"
                @click.stop="handleCollectTapProduct(tree.id)"
              >
                收取
              </Button>
              <Button
                v-if="tree.mature && !tree.hasTapper && hasTapper"
                :icon-size="12"
                :icon="Wrench"
                @click.stop="handleAttachTapper(tree.id)"
              >
                装采脂器
              </Button>
              <span
                v-if="tree.mature && !tree.hasTapper && !hasTapper"
                class="text-[10px] text-muted"
                >需制造采脂器</span
              >
              <Button
                v-if="tree.mature"
                :icon-size="12"
                :icon="Axe"
                @click.stop="handleChopTree(tree.id)"
                >伐木</Button
              >
            </div>
          </div>
        </div>
        <div
          v-else
          class="flex flex-col items-center justify-center py-4 text-muted mb-2"
        >
          <TreePine :size="32" class="text-muted/30" />
          <p class="text-xs mt-2">暂无野树</p>
          <p class="text-[10px] text-muted/60 mt-0.5">可使用野树灵种种植</p>
        </div>
        <div
          v-if="
            plantableWildSeeds.length > 0 &&
            farmStore.wildTrees.length < MAX_WILD_TREES
          "
          class="flex space-x-1.5 flex-wrap"
        >
          <Button
            v-for="s in plantableWildSeeds"
            :key="s.type"
            :icon-size="12"
            :icon="TreePine"
            @click="handlePlantWildTree(s.type)"
          >
            种{{ s.name }} (×{{ s.count }})
          </Button>
        </div>
      </div>
    </div>

    <!-- 温室弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showGreenhouseModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showGreenhouseModal = false"
      >
        <div class="game-panel max-w-sm w-full relative">
          <button
            class="absolute top-2 right-2 text-muted hover:text-text"
            @click="showGreenhouseModal = false"
          >
            <X :size="14" />
          </button>
          <div class="flex items-center space-x-1.5 text-sm text-accent mb-1">
            <Warehouse :size="14" />
            <span>温室</span>
          </div>
          <p class="text-xs text-muted mb-3">
            无季节限制 · 自动浇水 · {{ farmStore.greenhousePlots.length }}块地
          </p>

          <!-- 操作按钮 -->
          <div class="flex space-x-2 mb-3">
            <Button
              class="flex-1 justify-center"
              :class="{ '!bg-accent !text-bg': ghHarvestableCount > 0 }"
              :disabled="ghHarvestableCount === 0"
              :icon-size="12"
              :icon="Wheat"
              @click="doGhBatchHarvest"
            >
              一键收获{{
                ghHarvestableCount > 0 ? ` (${ghHarvestableCount}块)` : ""
              }}
            </Button>
            <Button
              class="flex-1 justify-center"
              :disabled="ghTilledEmptyCount === 0 || allSeeds.length === 0"
              :icon-size="12"
              :icon="Sprout"
              @click="showGhBatchPlant = true"
            >
              一键种植{{
                ghTilledEmptyCount > 0 ? ` (${ghTilledEmptyCount}块)` : ""
              }}
            </Button>
            <Button
              v-if="nextGhUpgrade"
              class="flex-1 justify-center"
              :icon-size="12"
              :icon="ArrowUp"
              @click="showGhUpgradeModal = true"
            >
              升级温室
            </Button>
          </div>

          <!-- 温室地块网格 -->
          <div
            class="grid gap-1 max-w-full"
            :style="{
              gridTemplateColumns: `repeat(${ghGridCols}, minmax(0, 1fr))`,
            }"
          >
            <button
              v-for="plot in farmStore.greenhousePlots"
              :key="plot.id"
              class="aspect-square relative overflow-hidden border border-accent/20 rounded-xs flex flex-col items-center justify-center cursor-pointer transition-colors hover:border-accent/60 hover:bg-panel/80 leading-tight"
              :class="getPlotDisplay(plot).color"
              :title="getPlotTooltip(plot)"
              @click="activeGhPlotId = plot.id"
            >
              <div
                class="pixel-plot-scene greenhouse-scene"
                :class="getPixelPlotClass(plot)"
              >
                <div class="pixel-soil-lines"></div>
                <div
                  v-if="plot.cropId"
                  class="pixel-crop"
                  :class="getCropPixelClass(plot.cropId, plot.state)"
                >
                  <span class="pixel-crop-sprout">{{
                    getCropPixelGlyph(plot.cropId, plot.state)
                  }}</span>
                  <span class="pixel-crop-name">{{
                    getCropName(plot.cropId)
                  }}</span>
                </div>
                <component
                  v-else
                  :is="getPlotDisplay(plot).icon"
                  :size="14"
                  class="pixel-empty-icon"
                />
              </div>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 温室升级确认弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showGhUpgradeModal && nextGhUpgrade"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showGhUpgradeModal = false"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button
            class="absolute top-2 right-2 text-muted hover:text-text"
            @click="showGhUpgradeModal = false"
          >
            <X :size="14" />
          </button>
          <p class="text-accent text-sm mb-2">{{ nextGhUpgrade.name }}</p>
          <p class="text-xs text-muted mb-3">{{ nextGhUpgrade.description }}</p>

          <div class="border border-accent/10 rounded-xs p-2 mb-3">
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="text-muted">费用</span>
              <span
                :class="
                  playerStore.money >= nextGhUpgrade.cost
                    ? 'text-success'
                    : 'text-danger'
                "
                >{{ nextGhUpgrade.cost }}文</span
              >
            </div>
            <div
              v-for="mat in nextGhUpgrade.materialCost"
              :key="mat.itemId"
              class="flex items-center justify-between text-xs"
            >
              <span class="text-muted">{{ getItemName(mat.itemId) }}</span>
              <span
                :class="
                  inventoryStore.getItemCount(mat.itemId) >= mat.quantity
                    ? 'text-success'
                    : 'text-danger'
                "
              >
                {{ inventoryStore.getItemCount(mat.itemId) }}/{{ mat.quantity }}
              </span>
            </div>
          </div>

          <div class="flex space-x-2">
            <Button class="flex-1" @click="showGhUpgradeModal = false"
              >取消</Button
            >
            <Button
              class="flex-1 !bg-accent !text-bg"
              :icon-size="12"
              :icon="ArrowUp"
              @click="handleGhUpgrade"
              >确认升级</Button
            >
          </div>
        </div>
      </div>
    </Transition>

    <!-- 温室一键种植弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showGhBatchPlant"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showGhBatchPlant = false"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button
            class="absolute top-2 right-2 text-muted hover:text-text"
            @click="showGhBatchPlant = false"
          >
            <X :size="14" />
          </button>
          <p class="text-accent text-sm mb-2">温室一键种植</p>
          <p class="text-xs text-muted mb-2">
            空耕地 {{ ghTilledEmptyCount }} 块，选择要种植的灵种：
          </p>
          <div class="flex flex-col space-y-1 max-h-60 overflow-y-auto">
            <button
              v-for="seed in allSeeds"
              :key="seed.cropId"
              class="btn text-xs justify-between mr-1 shrink-0"
              @click="doGhBatchPlant(seed.cropId)"
            >
              <span class="seed-pixel-row">
                <span
                  class="seed-pixel-bag"
                  :class="getSeedPixelClass(seed.cropId)"
                  >{{ getSeedPixelGlyph(seed.cropId) }}</span
                >
                <span>{{ seed.name }}</span>
                <span v-if="seed.regrowth" class="text-success ml-1"
                  >[多茬]</span
                >
              </span>
              <span class="text-muted">×{{ seed.count }}</span>
            </button>
          </div>
          <div
            v-if="allSeeds.length === 0"
            class="flex flex-col items-center py-4"
          >
            <Sprout :size="32" class="text-muted/30" />
            <p class="text-xs text-muted mt-2">没有可种植的灵种</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 温室地块操作弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="activeGhPlot"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="activeGhPlotId = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button
            class="absolute top-2 right-2 text-muted hover:text-text"
            @click="activeGhPlotId = null"
          >
            <X :size="14" />
          </button>
          <p class="text-accent text-sm mb-2">
            温室地块 #{{ activeGhPlot.id + 1 }}
          </p>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex flex-col space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">状态</span>
                <span class="text-xs">{{ ghPlotStateLabel }}</span>
              </div>
              <div
                v-if="activeGhPlot.cropId"
                class="flex items-center justify-between"
              >
                <span class="text-xs text-muted">灵植</span>
                <span class="text-xs">
                  {{ getCropName(activeGhPlot.cropId) }}
                  <span v-if="ghPlotCropRegrowth" class="text-success ml-1">
                    [多茬 {{ activeGhPlot.harvestCount }}/{{
                      ghPlotCropMaxHarvests
                    }}]
                  </span>
                </span>
              </div>
              <div
                v-if="
                  activeGhPlot.cropId && activeGhPlot.state !== 'harvestable'
                "
                class="flex items-center space-x-2"
              >
                <span class="text-xs text-muted shrink-0">生长</span>
                <div
                  class="flex-1 h-1 bg-bg rounded-xs border border-accent/10"
                >
                  <div
                    class="h-full rounded-xs bg-success transition-all"
                    :style="{
                      width:
                        Math.min(
                          100,
                          Math.floor(
                            (activeGhPlot.growthDays /
                              (Number(ghPlotCropGrowthDays) || 1)) *
                              100,
                          ),
                        ) + '%',
                    }"
                  />
                </div>
                <span class="text-xs text-muted whitespace-nowrap"
                  >{{ activeGhPlot.growthDays }}/{{
                    ghPlotCropGrowthDays
                  }}天</span
                >
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">特性</span>
                <span class="text-xs text-water">自动浇水 · 无季节限制</span>
              </div>
              <div
                v-if="activeGhPlot.seedGenetics"
                class="flex items-center justify-between"
              >
                <span class="text-xs text-muted">育种</span>
                <span class="text-xs text-accent">
                  G{{ activeGhPlot.seedGenetics.generation }} 甜{{
                    activeGhPlot.seedGenetics.sweetness
                  }}
                  产{{ activeGhPlot.seedGenetics.yield }} 抗{{
                    activeGhPlot.seedGenetics.resistance
                  }}
                </span>
              </div>
            </div>
          </div>

          <!-- 操作区 -->
          <div class="flex flex-col space-y-1.5">
            <!-- 已耕 → 种植（所有灵种） -->
            <div
              v-if="activeGhPlot.state === 'tilled' && allSeeds.length > 0"
              class="border border-accent/10 rounded-xs p-2"
            >
              <p class="text-xs text-muted mb-1">种植</p>
              <div class="flex flex-wrap space-x-1">
                <Button
                  v-for="seed in allSeeds"
                  :key="seed.cropId"
                  @click="doGhPlant(seed.cropId)"
                >
                  <span class="seed-pixel-row">
                    <span
                      class="seed-pixel-bag"
                      :class="getSeedPixelClass(seed.cropId)"
                      >{{ getSeedPixelGlyph(seed.cropId) }}</span
                    >
                    <span>{{ seed.name }}</span>
                    <span v-if="seed.regrowth" class="text-success ml-1"
                      >[多茬]</span
                    >
                    <span>(×{{ seed.count }})</span>
                  </span>
                </Button>
              </div>
            </div>
            <!-- 已耕 → 育种灵种种植 -->
            <template
              v-if="
                activeGhPlot.state === 'tilled' &&
                ghPlantableBreedingSeeds.length > 0
              "
            >
              <Divider label="育种灵种" class="!my-2" />
              <button
                v-for="seed in ghPlantableBreedingSeeds"
                :key="seed.genetics.id"
                class="btn text-xs justify-between mr-1 shrink-0"
                @click="doGhPlantGeneticSeed(seed.genetics.id)"
              >
                <span
                  >{{ getCropName(seed.genetics.cropId) }} G{{
                    seed.genetics.generation
                  }}</span
                >
                <span class="text-muted flex items-center space-x-px">
                  <Star
                    v-for="n in getStarRating(seed.genetics)"
                    :key="n"
                    :size="10"
                  />
                </span>
              </button>
            </template>
            <!-- 已耕无灵种空状态 -->
            <div
              v-else-if="
                activeGhPlot.state === 'tilled' && allSeeds.length === 0
              "
              class="flex flex-col items-center py-4"
            >
              <Sprout :size="32" class="text-muted/30" />
              <p class="text-xs text-muted mt-2">纳戒中没有灵种</p>
              <Button
                v-if="isWanwupuOpen"
                class="mt-2"
                :icon-size="12"
                :icon="Store"
                @click="goToShop"
                >前往万象铺购买</Button
              >
              <p v-else class="text-[10px] text-muted/60 mt-1">
                {{ wanwupuClosedReason }}
              </p>
            </div>

            <!-- 可收获 → 收获 -->
            <Button
              v-if="activeGhPlot.state === 'harvestable'"
              class="w-full justify-center !bg-accent !text-bg"
              :icon-size="12"
              :icon="Wheat"
              @click="doGhHarvest"
            >
              收获
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type Component } from "vue";
import {
  Droplets,
  Droplet,
  TreePine,
  TreeDeciduous,
  ArrowUp,
  Wrench,
  Gift,
  CirclePlus,
  X,
  Shovel,
  Wheat,
  Sprout,
  Package,
  Warehouse,
  Store,
  Axe,
  Trash2,
  Bug,
  Leaf,
  Star,
  Bird,
  Zap,
  Square,
  Flower2,
} from "lucide-vue-next";
import Button from "@/components/game/Button.vue";
import Divider from "@/components/game/Divider.vue";
import { useBreedingStore } from "@/stores/useBreedingStore";
import { useCookingStore } from "@/stores/useCookingStore";
import { useCultivationStore } from "@/stores/useCultivationStore";
import { useFarmStore } from "@/stores/useFarmStore";
import { useGameStore, SEASON_NAMES } from "@/stores/useGameStore";
import { useHomeStore } from "@/stores/useHomeStore";
import { useInventoryStore } from "@/stores/useInventoryStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useShopStore } from "@/stores/useShopStore";
import { useSkillStore } from "@/stores/useSkillStore";
import { useTutorialStore } from "@/stores/useTutorialStore";
import { useWalletStore } from "@/stores/useWalletStore";
import { useLongTermStore } from "@/stores/useLongTermStore";
import { getCropById, getCropsBySeason, getItemById } from "@/data";
import {
  getStarRating,
  shouldReturnBreedingSeed,
  generateGeneticsId,
} from "@/data/breeding";
import { FRUIT_TREE_DEFS, MAX_FRUIT_TREES } from "@/data/fruitTrees";
import { GREENHOUSE_UPGRADES } from "@/data/buildings";
import {
  WILD_TREE_DEFS,
  MAX_WILD_TREES,
  getWildTreeDef,
} from "@/data/wildTrees";
import { CROPS } from "@/data/crops";
import { FERTILIZERS, getFertilizerById } from "@/data/processing";
import { ACTION_TIME_COSTS } from "@/data/timeConstants";
import { addLog, showFloat } from "@/composables/useGameLog";
import { navigateToPanel } from "@/composables/useNavigation";
import { handleEndDay } from "@/composables/useEndDay";
import {
  getShopById,
  isShopAvailable,
  getShopClosedReason,
} from "@/data/shops";
import {
  handlePlotClick,
  useFarmActions,
  handleBatchWater,
  handleBatchTill,
  handleBatchHarvest,
  handleBatchPlant,
  handleBatchFertilize,
  handleRemoveCrop,
  handleCurePest,
  handleBatchCurePest,
  handleClearWeed,
  handleBatchClearWeed,
  QUALITY_NAMES,
  applyCropBlessing,
} from "@/composables/useFarmActions";
import type {
  SprinklerType,
  FertilizerType,
  FruitTreeType,
  WildTreeType,
  Quality,
} from "@/types";
import type { SeedGenetics } from "@/types/breeding";
import { sfxHarvest, sfxPlant } from "@/composables/useAudio";

const { selectedSeed } = useFarmActions();

const farmTab = ref<"field" | "tree">("field");

const farmStore = useFarmStore();
const longTerm = useLongTermStore();
const inventoryStore = useInventoryStore();
const gameStore = useGameStore();
const homeStore = useHomeStore();
const playerStore = usePlayerStore();
const shopStore = useShopStore();
const breedingStore = useBreedingStore();
const cultivationStore = useCultivationStore();

// === 灵田洞天特殊功能 ===

const tutorialStore = useTutorialStore();
const tutorialHint = computed(() => {
  if (!tutorialStore.enabled || gameStore.year > 1) return null;
  if (farmStore.plots.every((p) => p.state === "wasteland"))
    return "点击下方「一键操作」→「一键开垦」来开垦荒地，或直接点击地块逐一操作。";
  const hasPlanted = farmStore.plots.some(
    (p) =>
      p.state === "planted" ||
      p.state === "growing" ||
      p.state === "harvestable",
  );
  if (!hasPlanted && farmStore.plots.some((p) => p.state === "tilled"))
    return "已开垦的地块可以种植灵植。使用「一键种植」可批量播种纳戒中的灵种。";
  if (
    farmStore.plots.some(
      (p) => (p.state === "planted" || p.state === "growing") && !p.watered,
    ) &&
    !gameStore.isRainy
  )
    return "灵植需要每天浇水才会生长。「一键浇水」可一次浇完所有灵植。";
  if (farmStore.plots.some((p) => p.state === "harvestable"))
    return "金色高亮的地块表示灵植已成熟，点击「一键收获」即可批量收获。";
  return null;
});

const surfaceOreName = computed(() => {
  const patch = gameStore.surfaceOrePatch;
  if (!patch) return "";
  return getItemById(patch.oreId)?.name ?? "矿石";
});

const handleCollectCreekCatch = () => {
  const catches = gameStore.creekCatch;
  if (catches.length === 0) return;
  const names: string[] = [];
  const failed: typeof catches = [];
  for (const c of catches) {
    const added = inventoryStore.addItem(c.fishId, 1, c.quality);
    if (added) {
      const fishDef = getItemById(c.fishId);
      if (fishDef) names.push(fishDef.name);
    } else {
      failed.push(c);
    }
  }
  gameStore.creekCatch = failed;
  if (names.length > 0) {
    addLog(`收取了溪流鱼获：${names.join("、")}。`);
  }
  if (failed.length > 0) {
    addLog("纳戒已满，部分鱼获未能收取。");
  }
};

const handleMineSurfaceOre = () => {
  const patch = gameStore.surfaceOrePatch;
  if (!patch) return;
  if (!playerStore.consumeStamina(5)) {
    addLog("体力不足，无法开采。");
    return;
  }
  const added = inventoryStore.addItem(patch.oreId, patch.quantity);
  if (!added) {
    playerStore.restoreStamina(5);
    addLog("纳戒已满，无法开采。");
    return;
  }
  const oreName = getItemById(patch.oreId)?.name ?? "矿石";
  const skillStore = useSkillStore();
  skillStore.addExp("mining", 8);
  gameStore.surfaceOrePatch = null;
  addLog(`开采了地表矿脉，获得了${patch.quantity}个${oreName}。(+8采玄矿经验)`);
  const tr = gameStore.advanceTime(1);
  if (tr.message) addLog(tr.message);
  if (tr.passedOut) handleEndDay();
};

// === 出货灵匣 ===

const showShippingBox = ref(false);
type ShippingFilter = "all" | "crop" | "fish" | "animal" | "processed" | "other";
const shippingFilter = ref<ShippingFilter>("all");
const shippingFilterOptions: Array<{ value: ShippingFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "crop", label: "灵植/果实" },
  { value: "fish", label: "鱼获" },
  { value: "animal", label: "牧产" },
  { value: "processed", label: "加工/料理" },
  { value: "other", label: "其他" },
];
const showBatchPlant = ref(false);
const showBatchFertilize = ref(false);
const showBatchActions = ref(false);
const showGreenhouseModal = ref(false);
const showGhUpgradeModal = ref(false);
const showGhBatchPlant = ref(false);
const chopFruitTreeTarget = ref<{ id: number; type: string } | null>(null);
const chopWildTreeTarget = ref<{
  id: number;
  type: string;
  chopCount: number;
} | null>(null);

const goToShop = () => {
  if (!isWanwupuOpen.value) {
    showFloat(wanwupuClosedReason.value, "danger");
    return;
  }
  activePlotId.value = null;
  activeGhPlotId.value = null;
  showBatchPlant.value = false;
  showBatchFertilize.value = false;
  showBatchActions.value = false;
  showGreenhouseModal.value = false;
  navigateToPanel("shop");
};

const wanwupu = getShopById("wanwupu")!;

const isWanwupuOpen = computed(() => {
  return isShopAvailable(
    wanwupu,
    gameStore.day,
    gameStore.hour,
    gameStore.weather,
    gameStore.season,
  );
});

const wanwupuClosedReason = computed(() => {
  return (
    "万象行" +
    getShopClosedReason(
      wanwupu,
      gameStore.day,
      gameStore.hour,
      gameStore.weather,
      gameStore.season,
    )
  );
});

const farmGoalStats = computed(() => {
  const tilled = farmStore.plots.filter((p) => p.state !== "wasteland").length;
  const greenhouse =
    farmStore.greenhouseLevel * 3 +
    farmStore.greenhousePlots.filter((p) => p.state !== "wasteland").length;
  const automation =
    farmStore.sprinklers.length +
    farmStore.scarecrows +
    farmStore.lightningRods;
  const spiritItems = [
    "spirit_rice",
    "dew_grass",
    "vermilion_fruit",
    "ice_soul_lotus",
    "purple_ganoderma",
  ];
  const spiritStock = spiritItems.reduce(
    (sum, id) => sum + inventoryStore.getItemCount(id),
    0,
  );
  return {
    field_scale: tilled,
    greenhouse_supply: greenhouse,
    automation,
    spirit_crop_chain: spiritStock,
  };
});
const farmGoalCards = computed(() =>
  longTerm.farmGoalCards(farmGoalStats.value),
);
const claimFarmGoal = (
  id: "field_scale" | "greenhouse_supply" | "automation" | "spirit_crop_chain",
) => {
  const res = longTerm.claimFarmGoal(id, farmGoalStats.value);
  addLog(res.message);
  showFloat(res.message, res.success ? "success" : "danger");
};

const getItemName = (itemId: string): string =>
  getItemById(itemId)?.name ?? itemId;

const shippableItems = computed(() => {
  const items = inventoryStore.items
    .map((inv) => ({ ...inv, def: getItemById(inv.itemId) }))
    .filter(
      (item) =>
        item.def &&
        item.def.category !== "seed" &&
        item.def.category !== "machine" &&
        item.def.category !== "sprinkler",
    );
  if (shippingFilter.value === "all") return items;
  return items.filter((item) => {
    const category = item.def!.category;
    if (shippingFilter.value === "crop")
      return category === "crop" || category === "fruit";
    if (shippingFilter.value === "fish") return category === "fish";
    if (shippingFilter.value === "animal") return category === "animal_product";
    if (shippingFilter.value === "processed")
      return category === "processed" || category === "food";
    return ![
      "crop",
      "fruit",
      "fish",
      "animal_product",
      "processed",
      "food",
    ].includes(category);
  });
});

const shippingBoxTotal = computed(() => {
  return shopStore.shippingBox.reduce(
    (sum, entry) =>
      sum +
      shopStore.calculateSellPrice(entry.itemId, entry.quantity, entry.quality),
    0,
  );
});

const handleAddToBox = (itemId: string, quantity: number, quality: Quality) => {
  if (shopStore.addToShippingBox(itemId, quantity, quality)) {
    const name = getItemName(itemId);
    addLog(`将${name}×${quantity}放入了出货灵匣。`);
  }
};

const handleRemoveFromBox = (
  itemId: string,
  quantity: number,
  quality: Quality,
) => {
  if (shopStore.removeFromShippingBox(itemId, quantity, quality)) {
    const name = getItemName(itemId);
    addLog(`从出货灵匣取出了${name}×${quantity}。`);
  }
};

// === 地块弹窗状态 ===

const activePlotId = ref<number | null>(null);
const activePlot = computed(() =>
  activePlotId.value !== null
    ? (farmStore.plots.find((p) => p.id === activePlotId.value) ?? null)
    : null,
);

const activeGhPlotId = ref<number | null>(null);
const activeGhPlot = computed(() =>
  activeGhPlotId.value !== null
    ? (farmStore.greenhousePlots[activeGhPlotId.value] ?? null)
    : null,
);

// === 弹窗显示辅助 ===

const STATE_LABELS: Record<string, string> = {
  wasteland: "荒地",
  tilled: "已耕",
  planted: "已种",
  growing: "生长中",
  harvestable: "可收获",
};

const plotStateLabel = computed(() =>
  activePlot.value ? (STATE_LABELS[activePlot.value.state] ?? "?") : "",
);
const ghPlotStateLabel = computed(() =>
  activeGhPlot.value ? (STATE_LABELS[activeGhPlot.value.state] ?? "?") : "",
);

const plotCropGrowthDays = computed(() => {
  if (!activePlot.value?.cropId) return "?";
  const baseDays = getCropById(activePlot.value.cropId)?.growthDays;
  if (!baseDays) return "?";
  const fertDef = activePlot.value.fertilizer
    ? getFertilizerById(activePlot.value.fertilizer)
    : null;
  const speedup =
    (fertDef?.growthSpeedup ?? 0) + useWalletStore().getCropGrowthBonus();
  return speedup > 0
    ? Math.max(1, Math.floor(baseDays * (1 - speedup)))
    : baseDays;
});

const plotCropRegrowth = computed(() => {
  if (!activePlot.value?.cropId) return false;
  return getCropById(activePlot.value.cropId)?.regrowth ?? false;
});

const plotCropMaxHarvests = computed(() => {
  if (!activePlot.value?.cropId) return 0;
  return getCropById(activePlot.value.cropId)?.maxHarvests ?? 0;
});

const ghPlotCropGrowthDays = computed(() => {
  if (!activeGhPlot.value?.cropId) return "?";
  const baseDays = getCropById(activeGhPlot.value.cropId)?.growthDays;
  if (!baseDays) return "?";
  const fertDef = activeGhPlot.value.fertilizer
    ? getFertilizerById(activeGhPlot.value.fertilizer)
    : null;
  const speedup =
    (fertDef?.growthSpeedup ?? 0) + useWalletStore().getCropGrowthBonus();
  return speedup > 0
    ? Math.max(1, Math.floor(baseDays * (1 - speedup)))
    : baseDays;
});

const ghPlotCropRegrowth = computed(() => {
  if (!activeGhPlot.value?.cropId) return false;
  return getCropById(activeGhPlot.value.cropId)?.regrowth ?? false;
});

const ghPlotCropMaxHarvests = computed(() => {
  if (!activeGhPlot.value?.cropId) return 0;
  return getCropById(activeGhPlot.value.cropId)?.maxHarvests ?? 0;
});

const plotFertName = computed(() => {
  if (!activePlot.value?.fertilizer) return "";
  return (
    getFertilizerById(activePlot.value.fertilizer)?.name ??
    activePlot.value.fertilizer
  );
});

const canWater = computed(() => {
  if (!activePlot.value) return false;
  return (
    (activePlot.value.state === "planted" ||
      activePlot.value.state === "growing") &&
    !activePlot.value.watered
  );
});

const canFertilize = computed(() => {
  if (!activePlot.value) return false;
  return activePlot.value.state !== "wasteland" && !activePlot.value.fertilizer;
});

// === 纳戒物品列表 ===

const sprinklerItems = computed(() => {
  const types: {
    type: SprinklerType;
    itemId: string;
    name: string;
    colorClass: string;
  }[] = [
    {
      type: "bamboo_sprinkler",
      itemId: "bamboo_sprinkler",
      name: "竹筒洒水器",
      colorClass: "",
    },
    {
      type: "copper_sprinkler",
      itemId: "copper_sprinkler",
      name: "铜管洒水器",
      colorClass: "text-quality-fine",
    },
    {
      type: "gold_sprinkler",
      itemId: "gold_sprinkler",
      name: "金管洒水器",
      colorClass: "text-quality-supreme",
    },
  ];
  return types
    .map((s) => ({ ...s, count: inventoryStore.getItemCount(s.itemId) }))
    .filter((s) => s.count > 0);
});

const fertilizerItems = computed(() => {
  return FERTILIZERS.map((f) => ({
    type: f.id as FertilizerType,
    itemId: f.id,
    name: f.name,
    count: inventoryStore.getItemCount(f.id),
    colorClass: itemValueColor(f.shopPrice ?? 0),
  })).filter((f) => f.count > 0);
});

const QUALITY_ORDER: Quality[] = ["normal", "fine", "excellent", "supreme"];

const plantableSeeds = computed(() => {
  const result: {
    cropId: string;
    seedId: string;
    name: string;
    quality: Quality;
    count: number;
    colorClass: string;
    regrowth: boolean;
    regrowthDays?: number;
  }[] = [];
  for (const crop of getCropsBySeason(gameStore.season)) {
    for (const q of QUALITY_ORDER) {
      const count = inventoryStore.getItemCount(crop.seedId, q);
      if (count > 0) {
        result.push({
          cropId: crop.id,
          seedId: crop.seedId,
          name: crop.name,
          quality: q,
          count,
          colorClass: cropValueColor(crop.sellPrice),
          regrowth: crop.regrowth ?? false,
          regrowthDays: crop.regrowthDays,
        });
      }
    }
  }
  return result;
});

/** 当季可种的育种灵种 */
const plantableBreedingSeeds = computed(() => {
  const season = gameStore.season;
  return breedingStore.breedingBox.filter((seed) => {
    const crop = getCropById(seed.genetics.cropId);
    if (!crop) return false;
    return crop.season.includes(season);
  });
});

/** 根据灵植售价返回品质颜色 */
const cropValueColor = (sellPrice: number): string => {
  if (sellPrice >= 180) return "text-quality-supreme";
  if (sellPrice >= 100) return "text-quality-excellent";
  if (sellPrice >= 60) return "text-quality-fine";
  return "";
};

/** 根据道具价格返回品质颜色 */
const itemValueColor = (price: number): string => {
  if (price >= 100) return "text-quality-supreme";
  if (price >= 75) return "text-quality-excellent";
  if (price >= 40) return "text-quality-fine";
  return "";
};

// === 地块显示 ===

const getCropName = (cropId: string): string => {
  const crop = getCropById(cropId);
  return crop?.name ?? cropId;
};
const cropPixelPalettes = [
  "leafy",
  "root",
  "grain",
  "fruit",
  "flower",
  "spirit",
  "vine",
  "snow",
];
const cropGlyphs = ["◆", "●", "▲", "✦", "✿", "✧", "◈", "◇"];

const hashCropId = (cropId: string): number => {
  let hash = 0;
  for (const ch of cropId) hash = (hash * 31 + ch.charCodeAt(0)) % 9973;
  return hash;
};

const cropPixelKind = (cropId: string): string => {
  const crop = getCropById(cropId);
  const text = `${cropId} ${crop?.name ?? ""}`;
  if (
    /spirit|jade|gold|moon|frost|fairy|crystal|phoenix|ruby|灵|玉|金|月|霜|仙|朱|蕴/.test(
      text,
    )
  )
    return "spirit";
  if (/flower|tea|chrysanthemum|osmanthus|blossom|花|茶|菊|桂/.test(text))
    return "flower";
  if (/melon|peach|fruit|pumpkin|watermelon|瓜|桃|果|南瓜/.test(text))
    return "fruit";
  if (/rice|corn|wheat|sesame|grain|稻|米|麦|玉米|芝麻/.test(text))
    return "grain";
  if (/radish|potato|yam|garlic|ginger|root|萝卜|土豆|薯|藕|蒜|姜/.test(text))
    return "root";
  if (/bean|loofah|vine|豆|丝瓜/.test(text)) return "vine";
  if (/snow|frost|雪|霜/.test(text)) return "snow";
  return (
    cropPixelPalettes[hashCropId(cropId) % cropPixelPalettes.length] ?? "leafy"
  );
};

const getCropPixelClass = (cropId: string, state?: string): string => {
  const growth =
    state === "harvestable"
      ? "mature"
      : state === "growing"
        ? "growing"
        : "seedling";
  return `crop-${cropPixelKind(cropId)} crop-${growth} crop-variant-${hashCropId(cropId) % 5}`;
};

const getCropPixelGlyph = (cropId: string, state?: string): string => {
  if (state === "planted") return "·";
  if (state === "growing") return cropPixelKind(cropId) === "grain" ? "▥" : "♣";
  return cropGlyphs[hashCropId(cropId) % cropGlyphs.length] ?? "◆";
};

const getPlotGrowthPercent = (
  plot: (typeof farmStore.plots)[number],
): number => {
  if (!plot.cropId) return 0;
  const crop = getCropById(plot.cropId);
  if (!crop) return 0;
  const fertDef = plot.fertilizer ? getFertilizerById(plot.fertilizer) : null;
  const speedup =
    (fertDef?.growthSpeedup ?? 0) + useWalletStore().getCropGrowthBonus();
  const effectiveDays =
    speedup > 0
      ? Math.max(1, Math.floor(crop.growthDays * (1 - speedup)))
      : crop.growthDays;
  return Math.max(
    0,
    Math.min(
      100,
      Math.floor((plot.growthDays / Math.max(1, effectiveDays)) * 100),
    ),
  );
};

const getSeedPixelClass = (cropId: string): string =>
  `seed-${cropPixelKind(cropId)} seed-variant-${hashCropId(cropId) % 6}`;
const getSeedPixelGlyph = (cropId: string): string =>
  ["•", "◆", "◇", "✦", "▲", "●"][hashCropId(cropId) % 6] ?? "•";

const getPixelPlotClass = (plot: (typeof farmStore.plots)[number]): string => {
  const tier = cultivationStore.unlocked ? cultivationStore.fieldTier : 0;
  const parts = [`plot-state-${plot.state}`, `spirit-tier-${tier}`];
  if (plot.watered) parts.push("plot-watered");
  if (plot.fertilizer) parts.push("plot-fertilized");
  if (plot.giantCropGroup !== null) parts.push("plot-giant");
  if (plot.infested) parts.push("plot-infested");
  if (plot.weedy) parts.push("plot-weedy");
  return parts.join(" ");
};

const hasSprinkler = (plotId: number): boolean => {
  return farmStore.sprinklers.some((s) => s.plotId === plotId);
};

/** 洒水器覆盖范围（含放置洒水器的地块自身） */
const sprinklerCoverage = computed(() => farmStore.getAllWateredBySprinklers());

const isSprinklerCovered = (plotId: number): boolean =>
  sprinklerCoverage.value.has(plotId);

const needsWater = (plot: (typeof farmStore.plots)[number]): boolean => {
  return (
    (plot.state === "planted" || plot.state === "growing") &&
    !plot.watered &&
    !sprinklerCoverage.value.has(plot.id)
  );
};

const unwateredCount = computed(
  () => farmStore.plots.filter(needsWater).length,
);
const wastelandCount = computed(
  () => farmStore.plots.filter((p) => p.state === "wasteland").length,
);
const harvestableCount = computed(
  () => farmStore.plots.filter((p) => p.state === "harvestable").length,
);
const tilledEmptyCount = computed(
  () => farmStore.plots.filter((p) => p.state === "tilled").length,
);
const fertilizableCount = computed(
  () =>
    farmStore.plots.filter((p) => p.state !== "wasteland" && !p.fertilizer)
      .length,
);
const infestedCount = computed(
  () => farmStore.plots.filter((p) => p.infested).length,
);
const weedyCount = computed(
  () => farmStore.plots.filter((p) => p.weedy).length,
);

const PLOT_LEGENDS: { icon: Component; color: string; label: string }[] = [
  { icon: Shovel, color: "text-muted", label: "荒地" },
  { icon: Square, color: "text-earth", label: "已耕" },
  { icon: Sprout, color: "text-success/60", label: "已种" },
  { icon: Flower2, color: "text-success", label: "生长中" },
  { icon: Droplets, color: "text-water", label: "已浇水" },
  { icon: Wheat, color: "text-accent", label: "可收获" },
  { icon: Star, color: "text-accent", label: "巨型" },
  { icon: Droplet, color: "text-water", label: "洒水器" },
  { icon: CirclePlus, color: "text-success", label: "肥料" },
  { icon: Droplets, color: "text-danger", label: "需浇水" },
  { icon: Bug, color: "text-danger", label: "虫害" },
  { icon: Leaf, color: "text-success", label: "杂草" },
];

const plotWarnings = computed(() => {
  const list: { color: string; text: string }[] = [];
  if (unwateredCount.value > 0)
    list.push({
      color: "text-danger",
      text: `还有${unwateredCount.value}块需浇水`,
    });
  if (infestedCount.value > 0)
    list.push({ color: "text-danger", text: `有${infestedCount.value}块虫害` });
  if (weedyCount.value > 0)
    list.push({ color: "text-success", text: `有${weedyCount.value}块杂草` });
  return list;
});

const doBatchAction = (
  action:
    | "water"
    | "till"
    | "harvest"
    | "plant"
    | "fertilize"
    | "curePest"
    | "clearWeed",
) => {
  showBatchActions.value = false;
  if (action === "water") handleBatchWater();
  else if (action === "till") handleBatchTill();
  else if (action === "harvest") handleBatchHarvest();
  else if (action === "plant") showBatchPlant.value = true;
  else if (action === "fertilize") showBatchFertilize.value = true;
  else if (action === "curePest") handleBatchCurePest();
  else if (action === "clearWeed") handleBatchClearWeed();
};
/** 按cropId分组的当季育种灵种（用于一键种植弹窗） */
const batchBreedingSeedGroups = computed(() => {
  const groups: Record<
    string,
    {
      cropId: string;
      name: string;
      count: number;
      minGen: number;
      maxGen: number;
    }
  > = {};
  for (const seed of plantableBreedingSeeds.value) {
    const cid = seed.genetics.cropId;
    if (!groups[cid]) {
      groups[cid] = {
        cropId: cid,
        name: getCropName(cid),
        count: 0,
        minGen: seed.genetics.generation,
        maxGen: seed.genetics.generation,
      };
    }
    groups[cid]!.count++;
    if (seed.genetics.generation < groups[cid]!.minGen)
      groups[cid]!.minGen = seed.genetics.generation;
    if (seed.genetics.generation > groups[cid]!.maxGen)
      groups[cid]!.maxGen = seed.genetics.generation;
  }
  return Object.values(groups);
});

const doBatchPlant = (cropId: string) => {
  handleBatchPlant(cropId);
  showBatchPlant.value = false;
};

const doBatchPlantBreeding = (cropId: string) => {
  const skillStore = useSkillStore();
  const cookingStore = useCookingStore();
  const targets = farmStore.plots.filter((p) => p.state === "tilled");
  if (targets.length === 0) {
    addLog("没有可种植的空耕地。");
    showBatchPlant.value = false;
    return;
  }
  const seeds = plantableBreedingSeeds.value.filter(
    (s) => s.genetics.cropId === cropId,
  );
  let planted = 0;
  const plantRingFarmReduction =
    inventoryStore.getRingEffectValue("farming_stamina");
  const plantRingGlobalReduction =
    inventoryStore.getRingEffectValue("stamina_reduction");
  for (const plot of targets) {
    if (seeds.length === 0) break;
    const seed = seeds.shift()!;
    const farmingBuff =
      cookingStore.activeBuff?.type === "farming"
        ? cookingStore.activeBuff.value / 100
        : 0;
    const cost = Math.max(
      1,
      Math.floor(
        3 *
          inventoryStore.getToolStaminaMultiplier("hoe") *
          (1 - skillStore.getStaminaReduction("farming")) *
          (1 - farmingBuff) *
          (1 - plantRingFarmReduction) *
          (1 - plantRingGlobalReduction),
      ),
    );
    if (!playerStore.consumeStamina(cost)) break;
    if (farmStore.plantGeneticSeed(plot.id, seed.genetics)) {
      breedingStore.removeFromBox(seed.genetics.id);
      planted++;
    }
  }
  if (planted > 0) {
    addLog(
      `一键种植了${planted}株育种灵种（${getCropName(cropId)}）。(-${planted}体力)`,
    );
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plant * planted);
    if (tr.message) addLog(tr.message);
  } else {
    addLog("体力不足，无法种植。");
  }
  showBatchPlant.value = false;
};
const doBatchFertilize = (type: FertilizerType) => {
  handleBatchFertilize(type);
  showBatchFertilize.value = false;
};

const doRemoveCrop = () => {
  if (activePlotId.value === null) return;
  handleRemoveCrop(activePlotId.value);
  activePlotId.value = null;
};

const doCurePest = () => {
  if (activePlotId.value === null) return;
  handleCurePest(activePlotId.value);
  activePlotId.value = null;
};

const doClearWeed = () => {
  if (activePlotId.value === null) return;
  handleClearWeed(activePlotId.value);
  activePlotId.value = null;
};

const getPlotDisplay = (
  plot: (typeof farmStore.plots)[number],
): { icon: Component; color: string; bg: string } => {
  // 巨型灵植特殊显示（仅在已成熟时才显示巨型图标）
  if (plot.giantCropGroup !== null && plot.state === "harvestable") {
    return { icon: Star, color: "text-accent", bg: "bg-accent/10" };
  }
  // 虫害显示
  if (plot.infested) {
    return { icon: Bug, color: "text-danger", bg: "bg-danger/10" };
  }
  // 杂草显示
  if (plot.weedy) {
    return { icon: Leaf, color: "text-success/70", bg: "bg-success/10" };
  }
  switch (plot.state) {
    case "wasteland":
      return { icon: Shovel, color: "text-muted", bg: "bg-panel/40" };
    case "tilled":
      return { icon: Square, color: "text-earth", bg: "bg-earth/8" };
    case "planted":
      return {
        icon: plot.watered ? Droplets : Sprout,
        color: plot.watered ? "text-water" : "text-success/60",
        bg: plot.watered ? "bg-water/8" : "bg-success/5",
      };
    case "growing": {
      const crop = getCropById(plot.cropId!);
      const fertDef = plot.fertilizer
        ? getFertilizerById(plot.fertilizer)
        : null;
      const speedup =
        (fertDef?.growthSpeedup ?? 0) + useWalletStore().getCropGrowthBonus();
      const effectiveDays = crop
        ? speedup > 0
          ? Math.max(1, Math.floor(crop.growthDays * (1 - speedup)))
          : crop.growthDays
        : 1;
      const progress = crop
        ? Math.floor((plot.growthDays / effectiveDays) * 100)
        : 0;
      return {
        icon: plot.watered ? Droplets : Leaf,
        color: plot.watered
          ? "text-water"
          : progress > 60
            ? "text-success"
            : "text-success/80",
        bg: plot.watered ? "bg-water/8" : "bg-success/8",
      };
    }
    case "harvestable":
      return { icon: Wheat, color: "text-accent", bg: "bg-accent/15" };
    default:
      return { icon: Square, color: "text-muted", bg: "bg-panel/40" };
  }
};

const getPlotTooltip = (plot: (typeof farmStore.plots)[number]): string => {
  let tip = "";
  if (plot.state === "wasteland") tip = "荒地（点击开垦）";
  else if (plot.state === "tilled") tip = "已耕地（点击播种）";
  else if (plot.state === "harvestable") {
    const crop = getCropById(plot.cropId!);
    tip = `${crop?.name ?? ""}已成熟（点击收获）`;
  } else if (plot.state === "planted" || plot.state === "growing") {
    const crop = getCropById(plot.cropId!);
    const fertDef = plot.fertilizer ? getFertilizerById(plot.fertilizer) : null;
    const speedup =
      (fertDef?.growthSpeedup ?? 0) + useWalletStore().getCropGrowthBonus();
    const effectiveDays = crop
      ? speedup > 0
        ? Math.max(1, Math.floor(crop.growthDays * (1 - speedup)))
        : crop.growthDays
      : "?";
    tip = `${crop?.name ?? ""} ${plot.growthDays}/${effectiveDays}天 ${plot.watered ? "已浇水" : "需浇水"}`;
  }
  if (hasSprinkler(plot.id)) tip += " [洒水器]";
  if (plot.fertilizer) {
    const fertDef = getFertilizerById(plot.fertilizer);
    tip += ` [${fertDef?.name ?? plot.fertilizer}]`;
  }
  if (plot.infested) tip += ` [虫害${plot.infestedDays}天]`;
  if (plot.weedy) tip += ` [杂草${plot.weedyDays}天]`;
  return tip;
};

// === 弹窗操作：灵田 ===

const doTill = () => {
  if (activePlotId.value === null) return;
  selectedSeed.value = null;
  handlePlotClick(activePlotId.value);
  activePlotId.value = null;
};

const doPlant = (cropId: string, quality?: Quality) => {
  if (activePlotId.value === null) return;
  selectedSeed.value = { cropId, quality };
  handlePlotClick(activePlotId.value);
  selectedSeed.value = null;
  activePlotId.value = null;
};

const doPlantGeneticSeed = (seedId: string) => {
  if (activePlotId.value === null) return;
  const seed = breedingStore.breedingBox.find((s) => s.genetics.id === seedId);
  if (!seed) return;
  if (farmStore.plantGeneticSeed(activePlotId.value, seed.genetics)) {
    breedingStore.removeFromBox(seedId);
    addLog(
      `种下了育种灵种：${getCropName(seed.genetics.cropId)} G${seed.genetics.generation}。`,
    );
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plant);
    if (tr.message) addLog(tr.message);
  }
  activePlotId.value = null;
};

const doWater = () => {
  if (activePlotId.value === null) return;
  selectedSeed.value = null;
  handlePlotClick(activePlotId.value);
  activePlotId.value = null;
};

const doHarvest = () => {
  if (activePlotId.value === null) return;
  const plot = farmStore.plots.find((p) => p.id === activePlotId.value);
  if (plot && plot.giantCropGroup !== null) {
    const result = farmStore.harvestGiantCrop(activePlotId.value);
    if (result) {
      inventoryStore.addItem(result.cropId, result.quantity);
      const cropName = getCropName(result.cropId);
      addLog(`收获了巨型${cropName}！获得了${result.quantity}个${cropName}！`);
      showFloat(`巨型${cropName} ×${result.quantity}`, "accent");
      sfxHarvest();
    }
    activePlotId.value = null;
    return;
  }
  selectedSeed.value = null;
  handlePlotClick(activePlotId.value);
  activePlotId.value = null;
};

const doFertilize = (type: FertilizerType) => {
  if (activePlotId.value === null) return;
  if (!inventoryStore.removeItem(type)) {
    addLog("没有该肥料了。");
    return;
  }
  if (farmStore.applyFertilizer(activePlotId.value, type)) {
    const fertDef = getFertilizerById(type);
    addLog(`施了${fertDef?.name ?? "肥料"}。`);
  } else {
    inventoryStore.addItem(type);
    addLog("无法在此施肥（需要已开垦且未施肥的地块）。");
  }
  activePlotId.value = null;
};

const doPlaceSprinkler = (type: SprinklerType) => {
  if (activePlotId.value === null) return;
  if (!inventoryStore.removeItem(type)) {
    addLog("没有该洒水器了。");
    return;
  }
  if (farmStore.placeSprinkler(activePlotId.value, type)) {
    addLog("放置了洒水器，周围地块将自动浇水。");
  } else {
    inventoryStore.addItem(type);
    addLog("无法在此放置洒水器。");
  }
  activePlotId.value = null;
};

const doRemoveSprinkler = () => {
  if (activePlotId.value === null) return;
  const plotId = activePlotId.value;
  const type = farmStore.removeSprinkler(plotId);
  if (type) {
    if (inventoryStore.addItem(type)) {
      addLog("拆除了洒水器，已回收到纳戒。");
    } else {
      // 纳戒满，放回原处
      farmStore.placeSprinkler(plotId, type);
      addLog("纳戒已满，无法回收洒水器。");
    }
  }
  activePlotId.value = null;
};

// === 果树 ===

const getTreeName = (type: string): string => {
  return FRUIT_TREE_DEFS.find((d) => d.type === type)?.name ?? type;
};

const getTreeFruitSeason = (type: string): string => {
  const def = FRUIT_TREE_DEFS.find((d) => d.type === type);
  if (!def) return "?";
  return SEASON_NAMES[def.fruitSeason as keyof typeof SEASON_NAMES];
};

const plantableSaplings = computed(() => {
  return FRUIT_TREE_DEFS.filter((d) => inventoryStore.hasItem(d.saplingId)).map(
    (d) => ({
      type: d.type as FruitTreeType,
      saplingId: d.saplingId,
      name: d.name,
      count: inventoryStore.getItemCount(d.saplingId),
    }),
  );
});

const plantableWildSeeds = computed(() => {
  return WILD_TREE_DEFS.filter((d) => inventoryStore.hasItem(d.seedItemId)).map(
    (d) => ({
      type: d.type as WildTreeType,
      seedItemId: d.seedItemId,
      name: d.name,
      count: inventoryStore.getItemCount(d.seedItemId),
    }),
  );
});

const hasTapper = computed(() => inventoryStore.getItemCount("tapper") > 0);

const handlePlantTree = (treeType: FruitTreeType) => {
  const def = FRUIT_TREE_DEFS.find((d) => d.type === treeType);
  if (!def) return;
  if (!inventoryStore.removeItem(def.saplingId)) {
    addLog("纳戒中没有该树苗。");
    return;
  }
  if (farmStore.plantFruitTree(treeType)) {
    addLog(`种下了${def.name}苗，需28天成熟。`);
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plantTree);
    if (tr.message) addLog(tr.message);
  } else {
    inventoryStore.addItem(def.saplingId);
    addLog(`果树位已满（最多${MAX_FRUIT_TREES}棵）。`);
  }
};

const confirmChopFruitTree = () => {
  const target = chopFruitTreeTarget.value;
  if (!target) return;
  chopFruitTreeTarget.value = null;
  if (gameStore.isPastBedtime) {
    addLog("太晚了，没法砍伐了。");
    return;
  }
  if (!inventoryStore.isToolAvailable("axe")) {
    addLog("斧头正在升级中，无法砍伐。");
    return;
  }
  const skillStore = useSkillStore();
  const cost = Math.max(
    1,
    Math.floor(
      5 *
        inventoryStore.getToolStaminaMultiplier("axe") *
        (1 - skillStore.getStaminaReduction("foraging")),
    ),
  );
  if (!playerStore.consumeStamina(cost)) {
    addLog("体力不足，无法砍伐。");
    return;
  }
  const treeName = getTreeName(target.type);
  const woodQty = farmStore.removeFruitTree(target.id);
  if (woodQty > 0) {
    inventoryStore.addItem("wood", woodQty);
    addLog(`砍掉了${treeName}，获得${woodQty}个木材。（体力-${cost}）`);
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.chopTree);
    if (tr.message) addLog(tr.message);
  }
};

// === 野树 ===

const getWildTreeName = (type: string): string => {
  return getWildTreeDef(type)?.name ?? type;
};

const handlePlantWildTree = (treeType: WildTreeType) => {
  const def = WILD_TREE_DEFS.find((d) => d.type === treeType);
  if (!def) return;
  if (!inventoryStore.removeItem(def.seedItemId)) {
    addLog("纳戒中没有该灵种。");
    return;
  }
  if (farmStore.plantWildTree(treeType)) {
    addLog(`种下了${def.name}，需${def.growthDays}天成熟。`);
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plantTree);
    if (tr.message) addLog(tr.message);
  } else {
    inventoryStore.addItem(def.seedItemId);
    addLog(`野树位已满（最多${MAX_WILD_TREES}棵）。`);
  }
};

const handleAttachTapper = (treeId: number) => {
  if (!inventoryStore.removeItem("tapper")) {
    addLog("纳戒中没有采脂器。");
    return;
  }
  if (farmStore.attachTapper(treeId)) {
    addLog("安装了采脂器，将定期产出树脂。");
  } else {
    inventoryStore.addItem("tapper");
    addLog("无法安装采脂器（需要已成熟且未装采脂器的野树）。");
  }
};

const handleCollectTapProduct = (treeId: number) => {
  const productId = farmStore.collectTapProduct(treeId);
  if (productId) {
    inventoryStore.addItem(productId);
    const def = WILD_TREE_DEFS.find((d) => d.tapProduct === productId);
    addLog(`收取了${def?.tapProductName ?? productId}！`);
  }
};

const handleChopTree = (treeId: number) => {
  const tree = farmStore.wildTrees.find((t) => t.id === treeId);
  if (!tree) return;
  chopWildTreeTarget.value = {
    id: tree.id,
    type: tree.type,
    chopCount: tree.chopCount,
  };
};

const confirmChopWildTree = () => {
  const target = chopWildTreeTarget.value;
  if (!target) return;
  chopWildTreeTarget.value = null;
  if (gameStore.isPastBedtime) {
    addLog("太晚了，没法伐木了。");
    return;
  }
  if (!inventoryStore.isToolAvailable("axe")) {
    addLog("斧头正在升级中，无法伐木。");
    return;
  }
  const skillStore = useSkillStore();
  const cost = Math.max(
    1,
    Math.floor(
      5 *
        inventoryStore.getToolStaminaMultiplier("axe") *
        (1 - skillStore.getStaminaReduction("foraging")),
    ),
  );
  if (!playerStore.consumeStamina(cost)) {
    addLog("体力不足，无法伐木。");
    return;
  }
  const baseQty = 2;
  const hasLumberjack =
    skillStore.getSkill("foraging").perk5 === "lumberjack" ||
    skillStore.getSkill("foraging").perk10 === "forester";
  const qty = baseQty + (hasLumberjack ? 2 : Math.random() < 0.5 ? 1 : 0);
  inventoryStore.addItem("wood", qty);
  const { removed } = farmStore.chopWildTree(target.id);
  const treeName = getWildTreeName(target.type);
  if (removed) {
    addLog(
      `伐木获得了${qty}个木材，${treeName}已被砍倒消失了。（体力-${cost}）`,
    );
  } else {
    addLog(`伐木获得了${qty}个木材。（体力-${cost}）`);
  }
  const tr = gameStore.advanceTime(ACTION_TIME_COSTS.chopTree);
  if (tr.message) addLog(tr.message);
};

// === 温室 ===

const showGreenhouse = computed(() => homeStore.greenhouseUnlocked);

const ghHarvestableCount = computed(
  () =>
    farmStore.greenhousePlots.filter((p) => p.state === "harvestable").length,
);

const ghTilledEmptyCount = computed(
  () => farmStore.greenhousePlots.filter((p) => p.state === "tilled").length,
);

const ghGridCols = computed(() => {
  const upgradeDef = GREENHOUSE_UPGRADES[farmStore.greenhouseLevel - 1];
  return upgradeDef?.gridCols ?? 4;
});

const nextGhUpgrade = computed(
  () => GREENHOUSE_UPGRADES[farmStore.greenhouseLevel] ?? null,
);

const allSeeds = computed(() => {
  return CROPS.filter((crop) => inventoryStore.hasItem(crop.seedId)).map(
    (crop) => ({
      cropId: crop.id,
      seedId: crop.seedId,
      name: crop.name,
      count: inventoryStore.getItemCount(crop.seedId),
      regrowth: crop.regrowth ?? false,
    }),
  );
});

// === 弹窗操作：温室 ===

const doGhPlant = (cropId: string) => {
  if (activeGhPlotId.value === null) return;
  const crop = getCropById(cropId);
  if (!crop) return;
  if (!inventoryStore.hasItem(crop.seedId)) {
    addLog("纳戒中没有该灵种了。");
    return;
  }
  if (!inventoryStore.removeItem(crop.seedId)) {
    addLog("灵种扣除失败，请整理纳戒后重试。");
    return;
  }
  if (farmStore.greenhousePlantCrop(activeGhPlotId.value, cropId)) {
    addLog(`在温室中播种了${crop.name}。`);
  } else {
    inventoryStore.addItem(crop.seedId);
    addLog("温室地块状态异常，灵种已返还。");
  }
  activeGhPlotId.value = null;
};

const doGhHarvest = () => {
  if (activeGhPlotId.value === null) return;
  if (!playerStore.consumeStamina(1)) {
    addLog("体力不足，无法收获。");
    return;
  }
  const result = farmStore.greenhouseHarvestPlot(activeGhPlotId.value);
  if (result.cropId) {
    const cropId = result.cropId;
    const genetics = result.genetics;
    const cropDef = getCropById(cropId);
    const skillStore = useSkillStore();
    let quality = skillStore.rollCropQualityWithBonus(0);
    quality = applyCropBlessing(quality);
    // 育种产量加成
    const yieldDouble =
      genetics && Math.random() < (genetics.yield / 100) * 0.3;
    const harvestQty = yieldDouble ? 2 : 1;
    inventoryStore.addItem(cropId, harvestQty, quality);
    useCultivationStore().addAuraFromHarvest(cropId, harvestQty);
    const qualityLabel =
      quality !== "normal" ? `(${QUALITY_NAMES[quality]})` : "";
    const qtyLabel = yieldDouble ? "×2" : "";
    sfxHarvest();
    showFloat(
      `+${cropDef?.name ?? cropId}${qtyLabel}${qualityLabel}`,
      "success",
    );
    let msg = `在温室收获了${cropDef?.name ?? cropId}${qtyLabel}${qualityLabel}！(-1体力)`;
    if (yieldDouble) msg += " 育种产量加成！";
    // 育种甜度加成
    if (genetics && genetics.sweetness > 0 && cropDef) {
      const bonusMoney = Math.floor(
        (cropDef.sellPrice * harvestQty * genetics.sweetness) / 200,
      );
      if (bonusMoney > 0) {
        playerStore.earnMoney(bonusMoney);
        msg += ` 甜度加成+${bonusMoney}文`;
      }
    }
    // 杂交种记录
    if (genetics?.isHybrid && genetics.hybridId) {
      breedingStore.recordHybridGrown(genetics.hybridId);
    }
    // 育种灵种回收
    if (genetics && shouldReturnBreedingSeed(quality)) {
      const returned: SeedGenetics = { ...genetics, id: generateGeneticsId() };
      if (breedingStore.addToBox(returned)) {
        msg += " 育种灵种已回收。";
      } else {
        msg += " 灵种箱已满，育种灵种丢失！";
      }
    }
    addLog(msg);
  }
  activeGhPlotId.value = null;
};

const doGhBatchHarvest = () => {
  const skillStore = useSkillStore();
  const harvestablePlots = farmStore.greenhousePlots.filter(
    (p) => p.state === "harvestable",
  );
  if (harvestablePlots.length === 0) return;
  let harvested = 0;
  let seedsReturned = 0;
  let totalBonusMoney = 0;
  for (const plot of harvestablePlots) {
    if (!playerStore.consumeStamina(1)) break;
    const result = farmStore.greenhouseHarvestPlot(plot.id);
    if (!result.cropId) {
      // 极端情况下地块状态被别的操作改变：退回刚扣的体力，避免玩家亏损。
      playerStore.restoreStamina(1);
      continue;
    }
    harvested++;
    const { cropId, genetics } = result;
    let quality = skillStore.rollCropQualityWithBonus(0);
    quality = applyCropBlessing(quality);
    const yieldDouble =
      genetics && Math.random() < (genetics.yield / 100) * 0.3;
    const harvestQty = yieldDouble ? 2 : 1;
    inventoryStore.addItem(cropId, harvestQty, quality);
    useCultivationStore().addAuraFromHarvest(cropId, harvestQty);
    // 育种甜度加成
    if (genetics && genetics.sweetness > 0) {
      const cropDef = getCropById(cropId);
      if (cropDef) {
        const bonusMoney = Math.floor(
          (cropDef.sellPrice * harvestQty * genetics.sweetness) / 200,
        );
        if (bonusMoney > 0) {
          playerStore.earnMoney(bonusMoney);
          totalBonusMoney += bonusMoney;
        }
      }
    }
    // 杂交种记录
    if (genetics?.isHybrid && genetics.hybridId) {
      breedingStore.recordHybridGrown(genetics.hybridId);
    }
    // 育种灵种回收
    if (genetics && shouldReturnBreedingSeed(quality)) {
      const returned: SeedGenetics = { ...genetics, id: generateGeneticsId() };
      if (breedingStore.addToBox(returned)) seedsReturned++;
    }
  }
  if (harvested > 0) {
    sfxHarvest();
    showFloat(`温室收获 ×${harvested}`, "success");
    let msg = `在温室一键收获了${harvested}株灵植。(-${harvested}体力)`;
    if (totalBonusMoney > 0) msg += ` 甜度加成+${totalBonusMoney}文`;
    addLog(msg);
    if (harvested < harvestablePlots.length)
      addLog("体力不足，剩余成熟灵植已保留在温室中。");
  } else {
    addLog("体力不足，无法收获温室灵植。");
  }
  if (seedsReturned > 0) {
    addLog(`${seedsReturned}颗育种灵种已回收到灵种箱。`);
  }
};

/** 温室可种育种灵种（温室无季节限制，所有育种灵种都可种） */
const ghPlantableBreedingSeeds = computed(() => {
  return breedingStore.breedingBox.filter((seed) => {
    const crop = getCropById(seed.genetics.cropId);
    return !!crop;
  });
});

const doGhPlantGeneticSeed = (seedId: string) => {
  if (activeGhPlotId.value === null) return;
  const seed = breedingStore.breedingBox.find((s) => s.genetics.id === seedId);
  if (!seed) return;
  if (
    farmStore.greenhousePlantGeneticSeed(activeGhPlotId.value, seed.genetics)
  ) {
    breedingStore.removeFromBox(seedId);
    addLog(
      `在温室种下了育种灵种：${getCropName(seed.genetics.cropId)} G${seed.genetics.generation}。`,
    );
  }
  activeGhPlotId.value = null;
};

const doGhBatchPlant = (cropId: string) => {
  const crop = getCropById(cropId);
  if (!crop) return;
  const targets = farmStore.greenhousePlots.filter((p) => p.state === "tilled");
  if (targets.length === 0) return;
  let planted = 0;
  for (const plot of targets) {
    if (!inventoryStore.hasItem(crop.seedId)) break;
    if (!playerStore.consumeStamina(1)) break;
    if (!inventoryStore.removeItem(crop.seedId)) {
      playerStore.restoreStamina(1);
      break;
    }
    if (farmStore.greenhousePlantCrop(plot.id, cropId)) {
      planted++;
    } else {
      inventoryStore.addItem(crop.seedId);
      playerStore.restoreStamina(1);
    }
  }
  if (planted > 0) {
    sfxPlant();
    showFloat(`温室种植 ${crop.name} ×${planted}`, "success");
    addLog(`在温室一键种植了${planted}株${crop.name}。(-${planted}体力)`);
  } else {
    addLog("体力不足或灵种不够，无法种植。");
  }
  showGhBatchPlant.value = false;
};

const handleGhUpgrade = () => {
  const upgrade = nextGhUpgrade.value;
  if (!upgrade) return;
  for (const mat of upgrade.materialCost) {
    if (inventoryStore.getItemCount(mat.itemId) < mat.quantity) {
      addLog("材料不足，无法升级温室。");
      return;
    }
  }
  if (!playerStore.spendMoney(upgrade.cost)) {
    addLog("铜钱不足，无法升级温室。");
    return;
  }
  const removedMaterials: { itemId: string; quantity: number }[] = [];
  for (const mat of upgrade.materialCost) {
    if (!inventoryStore.removeItem(mat.itemId, mat.quantity)) {
      for (const removed of removedMaterials)
        inventoryStore.addItem(removed.itemId, removed.quantity);
      playerStore.earnMoney(upgrade.cost);
      addLog("温室升级材料扣除失败，铜钱与已扣材料已返还。");
      return;
    }
    removedMaterials.push({ itemId: mat.itemId, quantity: mat.quantity });
  }
  farmStore.upgradeGreenhouse(upgrade.plotCount);
  addLog(`温室已升级至${upgrade.name}！（${upgrade.plotCount}个地块）`);
  showGhUpgradeModal.value = false;
};
</script>

<style scoped>
.farm-plot {
  height: 0;
  padding-bottom: 100%;
  image-rendering: pixelated;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.pixel-plot-scene {
  position: absolute;
  inset: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.13) 1px, transparent 1px),
    linear-gradient(0deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    #5b3d26;
  background-size:
    8px 8px,
    8px 8px,
    auto;
}

.plot-state-wasteland {
  background-color: #3b3129;
  filter: saturate(0.75);
}
.plot-state-tilled {
  background-color: #664021;
}
.plot-state-planted {
  background-color: #6a4727;
}
.plot-state-growing {
  background-color: #5b4f24;
}
.plot-state-harvestable {
  background-color: #6b5420;
}
.plot-watered {
  box-shadow: inset 0 -8px 0 rgba(72, 172, 210, 0.2);
}
.plot-fertilized::before {
  content: "";
  position: absolute;
  inset: 2px;
  border: 1px dashed rgba(245, 198, 92, 0.45);
}
.plot-infested {
  filter: hue-rotate(-18deg) saturate(1.2);
}
.plot-weedy::after {
  content: "♣";
  position: absolute;
  left: 2px;
  top: 1px;
  font-size: 9px;
  color: #5fcf7a;
}

.spirit-tier-1 {
  background-image:
    linear-gradient(90deg, rgba(95, 207, 122, 0.14) 1px, transparent 1px),
    linear-gradient(0deg, rgba(95, 207, 122, 0.11) 1px, transparent 1px);
  box-shadow: inset 0 0 0 1px rgba(95, 207, 122, 0.35);
}
.spirit-tier-2 {
  background-image:
    linear-gradient(90deg, rgba(83, 178, 245, 0.16) 1px, transparent 1px),
    linear-gradient(0deg, rgba(95, 207, 122, 0.12) 1px, transparent 1px);
  box-shadow:
    inset 0 0 0 1px rgba(83, 178, 245, 0.45),
    inset 0 0 12px rgba(83, 178, 245, 0.14);
}
.spirit-tier-3 {
  background-image:
    linear-gradient(90deg, rgba(191, 119, 255, 0.18) 1px, transparent 1px),
    linear-gradient(0deg, rgba(83, 178, 245, 0.14) 1px, transparent 1px);
  box-shadow:
    inset 0 0 0 1px rgba(191, 119, 255, 0.48),
    inset 0 0 14px rgba(191, 119, 255, 0.18);
}
.spirit-tier-4 {
  background-image:
    linear-gradient(90deg, rgba(245, 198, 92, 0.2) 1px, transparent 1px),
    linear-gradient(0deg, rgba(191, 119, 255, 0.16) 1px, transparent 1px);
  box-shadow:
    inset 0 0 0 1px rgba(245, 198, 92, 0.55),
    inset 0 0 16px rgba(245, 198, 92, 0.22);
}

.pixel-soil-lines {
  position: absolute;
  inset: auto 2px 2px 2px;
  height: 8px;
  background: repeating-linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.22) 0 4px,
    transparent 4px 8px
  );
  opacity: 0.55;
}

.greenhouse-scene {
  position: absolute;
  inset: 1px;
  border-radius: 2px;
  pointer-events: none;
}

.pixel-empty-icon {
  opacity: 0.65;
  z-index: 1;
}
.pixel-crop {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  transform: translateY(1px);
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.45);
}
.pixel-crop-sprout {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 13px;
  line-height: 1;
}
.crop-seedling .pixel-crop-sprout {
  font-size: 12px;
  transform: translateY(3px);
}
.crop-growing .pixel-crop-sprout {
  font-size: 14px;
}
.crop-mature .pixel-crop-sprout {
  font-size: 17px;
  filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.25));
}
.pixel-crop-name {
  max-width: 95%;
  padding: 0 2px;
  font-size: 9px;
  line-height: 1;
  opacity: 0.82;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: rgba(0, 0, 0, 0.24);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.crop-leafy {
  color: #68d36c;
}
.crop-root {
  color: #f0d48a;
}
.crop-grain {
  color: #f6c85f;
}
.crop-fruit {
  color: #ff8069;
}
.crop-flower {
  color: #f19bff;
}
.crop-spirit {
  color: #73f5df;
}
.crop-vine {
  color: #81d86f;
}
.crop-snow {
  color: #d9f3ff;
}
.crop-variant-1 {
  transform: translateY(0) rotate(-2deg);
}
.crop-variant-2 {
  transform: translateY(1px) rotate(2deg);
}
.crop-variant-3 .pixel-crop-sprout {
  width: 19px;
}
.crop-variant-4 .pixel-crop-sprout {
  filter: drop-shadow(0 0 2px currentColor);
}

.seed-pixel-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.seed-pixel-bag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: #4b3426;
  box-shadow:
    inset -2px -2px 0 rgba(0, 0, 0, 0.25),
    inset 2px 2px 0 rgba(255, 255, 255, 0.08);
  font-size: 10px;
  image-rendering: pixelated;
}
.seed-leafy {
  color: #72d66f;
  background: #2f4f2a;
}
.seed-root {
  color: #f1d48a;
  background: #5b3b28;
}
.seed-grain {
  color: #f7c85c;
  background: #5c4a22;
}
.seed-fruit {
  color: #ff8773;
  background: #5a2e2c;
}
.seed-flower {
  color: #f0a0ff;
  background: #4a3155;
}
.seed-spirit {
  color: #7df4e7;
  background: #244f52;
  box-shadow:
    inset -2px -2px 0 rgba(0, 0, 0, 0.25),
    0 0 6px rgba(125, 244, 231, 0.25);
}
.seed-vine {
  color: #8edb70;
  background: #304d24;
}
.seed-snow {
  color: #dff7ff;
  background: #314d5b;
}
.seed-variant-1 {
  border-radius: 2px 0 2px 0;
}
.seed-variant-2 {
  border-style: dashed;
}
.seed-variant-3 {
  transform: rotate(-2deg);
}
.seed-variant-4 {
  transform: rotate(2deg);
}
.seed-variant-5 {
  box-shadow:
    inset -2px -2px 0 rgba(0, 0, 0, 0.25),
    inset 2px 2px 0 rgba(255, 255, 255, 0.08),
    0 0 0 1px currentColor;
}

/* V0.5.10：更接近图片素材的像素绘制层。用多层色块替代字符/emoji。 */
.pixel-plot-scene {
  border: 2px solid rgba(24, 18, 12, 0.65);
  background:
    linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.1) 0 12%,
      transparent 12% 100%
    ),
    repeating-linear-gradient(
      0deg,
      rgba(55, 32, 18, 0.32) 0 3px,
      transparent 3px 8px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(86, 52, 27, 0.3) 0 4px,
      transparent 4px 10px
    ),
    #6b4728;
  box-shadow:
    inset 2px 2px 0 rgba(255, 222, 154, 0.12),
    inset -3px -3px 0 rgba(0, 0, 0, 0.22),
    0 2px 0 rgba(0, 0, 0, 0.3);
}

.plot-state-wasteland {
  background:
    radial-gradient(circle at 28% 36%, #3d342b 0 7%, transparent 8%),
    radial-gradient(circle at 70% 64%, #2d261f 0 8%, transparent 9%),
    repeating-linear-gradient(135deg, #3a3129 0 7px, #312920 7px 14px);
}
.plot-state-tilled {
  background:
    repeating-linear-gradient(0deg, #7a4d28 0 5px, #5f371d 5px 9px), #6b4424;
}
.plot-state-planted,
.plot-state-growing {
  background:
    repeating-linear-gradient(0deg, #6f4624 0 5px, #543017 5px 9px),
    radial-gradient(
      circle at center,
      rgba(104, 211, 108, 0.13),
      transparent 50%
    );
}
.plot-state-harvestable {
  background:
    repeating-linear-gradient(0deg, #7a5225 0 5px, #573719 5px 9px),
    radial-gradient(circle at center, rgba(246, 200, 95, 0.16), transparent 55%);
}

.spirit-tier-1 {
  border-color: rgba(87, 210, 117, 0.62);
}
.spirit-tier-2 {
  border-color: rgba(84, 183, 255, 0.7);
}
.spirit-tier-3 {
  border-color: rgba(190, 121, 255, 0.78);
}
.spirit-tier-4 {
  border-color: rgba(248, 210, 103, 0.86);
}
.spirit-tier-1::before,
.spirit-tier-2::before,
.spirit-tier-3::before,
.spirit-tier-4::before {
  content: "";
  position: absolute;
  inset: 4px;
  border: 1px solid currentColor;
  opacity: 0.45;
  pointer-events: none;
}
.spirit-tier-1 {
  color: #61d77f;
}
.spirit-tier-2 {
  color: #55bbff;
}
.spirit-tier-3 {
  color: #bd7cff;
}
.spirit-tier-4 {
  color: #f6d36d;
}
.spirit-tier-4::after {
  content: "";
  position: absolute;
  width: 4px;
  height: 4px;
  left: 6px;
  top: 6px;
  background: #fff3a8;
  box-shadow:
    18px 2px #fff3a8,
    9px 17px #f0a8ff,
    26px 22px #9ef8ff;
  opacity: 0.75;
}

.pixel-crop-sprout {
  position: relative;
  display: block;
  width: 24px;
  height: 24px;
  font-size: 0;
  image-rendering: pixelated;
  filter: drop-shadow(1px 2px 0 rgba(0, 0, 0, 0.45));
}
.pixel-crop-sprout::before,
.pixel-crop-sprout::after {
  content: "";
  position: absolute;
  display: block;
  image-rendering: pixelated;
}

.crop-seedling .pixel-crop-sprout::before {
  left: 10px;
  top: 13px;
  width: 4px;
  height: 9px;
  background: #3f9d49;
  box-shadow:
    -4px -3px 0 #62c95f,
    4px -4px 0 #7bdd74;
}
.crop-growing .pixel-crop-sprout::before {
  left: 10px;
  top: 7px;
  width: 5px;
  height: 15px;
  background: #3e9343;
  box-shadow:
    -6px 2px 0 #69c768,
    6px 0 0 #78d875,
    -4px -4px 0 #5ebf5d,
    4px -5px 0 #8be37d;
}
.crop-growing .pixel-crop-sprout::after {
  left: 7px;
  top: 17px;
  width: 11px;
  height: 4px;
  background: rgba(30, 86, 37, 0.8);
}

.crop-mature.crop-leafy .pixel-crop-sprout::before,
.crop-leafy .pixel-crop-sprout::before {
  left: 7px;
  top: 6px;
  width: 11px;
  height: 14px;
  background: #5ec95f;
  box-shadow:
    -5px 3px 0 #449e43,
    5px 2px 0 #84df72,
    0 -3px 0 #97e782;
}
.crop-root.crop-mature .pixel-crop-sprout::before,
.crop-root .pixel-crop-sprout::before {
  left: 8px;
  top: 9px;
  width: 11px;
  height: 11px;
  background: #f0d188;
  box-shadow:
    0 4px 0 #d89255,
    -3px -5px 0 #6bc463,
    4px -6px 0 #7ed36f;
}
.crop-grain.crop-mature .pixel-crop-sprout::before,
.crop-grain .pixel-crop-sprout::before {
  left: 11px;
  top: 4px;
  width: 3px;
  height: 18px;
  background: #6fa04c;
  box-shadow:
    -5px 2px 0 #f2c85f,
    5px 4px 0 #e8b94c,
    -3px 8px 0 #f8dd7c,
    4px 11px 0 #d99d3f;
}
.crop-fruit.crop-mature .pixel-crop-sprout::before,
.crop-fruit .pixel-crop-sprout::before {
  left: 6px;
  top: 8px;
  width: 14px;
  height: 12px;
  background: #ff7768;
  box-shadow:
    inset -4px -4px 0 #c94b43,
    4px 3px 0 #ffb24d,
    5px -5px 0 #4ebd5b;
}
.crop-flower.crop-mature .pixel-crop-sprout::before,
.crop-flower .pixel-crop-sprout::before {
  left: 10px;
  top: 7px;
  width: 5px;
  height: 14px;
  background: #4faa55;
  box-shadow:
    -5px -2px 0 #f2a1ff,
    0 -5px 0 #ffd2ff,
    5px -2px 0 #d875ff,
    -3px 3px 0 #ff83c6,
    3px 3px 0 #ff83c6;
}
.crop-spirit.crop-mature .pixel-crop-sprout::before,
.crop-spirit .pixel-crop-sprout::before {
  left: 8px;
  top: 5px;
  width: 12px;
  height: 15px;
  background: #76f7e5;
  box-shadow:
    inset -3px -3px 0 #35b7c2,
    0 -4px 0 #d9fff8,
    -5px 4px 0 #8df0ff,
    5px 5px 0 #a979ff;
}
.crop-vine.crop-mature .pixel-crop-sprout::before,
.crop-vine .pixel-crop-sprout::before {
  left: 5px;
  top: 8px;
  width: 15px;
  height: 7px;
  background: #73d46a;
  box-shadow:
    4px 5px 0 #55b857,
    9px -3px 0 #8ee677,
    -3px 4px 0 #45984a;
}
.crop-snow.crop-mature .pixel-crop-sprout::before,
.crop-snow .pixel-crop-sprout::before {
  left: 7px;
  top: 7px;
  width: 13px;
  height: 13px;
  background: #def7ff;
  box-shadow:
    inset -3px -3px 0 #8ac6e8,
    0 -4px 0 #ffffff,
    -4px 2px 0 #b9e9ff,
    4px 3px 0 #d6f6ff;
}

.crop-mature .pixel-crop-sprout {
  width: 28px;
  height: 28px;
}
.crop-variant-1 .pixel-crop-sprout {
  transform: translateX(-1px);
}
.crop-variant-2 .pixel-crop-sprout {
  transform: translateX(1px);
}
.crop-variant-3 .pixel-crop-sprout {
  transform: translateY(-1px) scale(1.05);
}
.crop-variant-4 .pixel-crop-sprout {
  filter: drop-shadow(1px 2px 0 rgba(0, 0, 0, 0.45))
    drop-shadow(0 0 3px currentColor);
}

.seed-pixel-bag {
  position: relative;
  width: 22px;
  height: 22px;
  font-size: 0;
  border: 2px solid rgba(24, 18, 12, 0.85);
  border-radius: 0;
  box-shadow:
    inset 2px 2px 0 rgba(255, 255, 255, 0.16),
    inset -3px -3px 0 rgba(0, 0, 0, 0.3),
    0 2px 0 rgba(0, 0, 0, 0.25);
}
.seed-pixel-bag::before {
  content: "";
  position: absolute;
  left: 5px;
  top: 3px;
  width: 8px;
  height: 5px;
  background: rgba(255, 255, 255, 0.22);
  box-shadow:
    4px 7px 0 currentColor,
    -1px 11px 0 currentColor,
    8px 11px 0 currentColor;
}
.seed-pixel-bag::after {
  content: "";
  position: absolute;
  left: 3px;
  right: 3px;
  top: 8px;
  height: 2px;
  background: rgba(0, 0, 0, 0.25);
}
.seed-variant-1::before {
  box-shadow:
    2px 7px 0 currentColor,
    8px 9px 0 currentColor,
    5px 13px 0 currentColor;
}
.seed-variant-2::before {
  box-shadow:
    0 8px 0 currentColor,
    6px 6px 0 currentColor,
    10px 12px 0 currentColor;
}
.seed-variant-3::before {
  box-shadow:
    6px 6px 0 currentColor,
    2px 12px 0 currentColor,
    10px 12px 0 currentColor;
}
.seed-variant-4::before {
  box-shadow:
    -1px 8px 0 currentColor,
    4px 11px 0 currentColor,
    10px 8px 0 currentColor;
}
.seed-variant-5::before {
  box-shadow:
    1px 7px 0 currentColor,
    7px 7px 0 currentColor,
    4px 13px 0 currentColor,
    11px 13px 0 currentColor;
}

/* V0.6.6：真正像素化灵灵畦图层 */
.pixel-farm-shell {
  position: relative;
  padding: 10px;
  border: 3px solid rgba(95, 65, 35, 0.95);
  border-radius: 0;
  background:
    linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.05) 25%,
      transparent 25% 75%,
      rgba(255, 255, 255, 0.05) 75%
    ),
    linear-gradient(
      45deg,
      rgba(0, 0, 0, 0.14) 25%,
      transparent 25% 75%,
      rgba(0, 0, 0, 0.14) 75%
    ),
    #2f241a;
  background-position:
    0 0,
    4px 4px,
    0 0;
  background-size:
    8px 8px,
    8px 8px,
    auto;
  box-shadow:
    inset 0 0 0 2px rgba(255, 214, 122, 0.12),
    0 4px 0 rgba(0, 0, 0, 0.45);
  image-rendering: pixelated;
}
.pixel-farm-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 5px 7px;
  border: 2px solid rgba(126, 88, 47, 0.9);
  background: #1f1812;
  color: #f1d38b;
  box-shadow:
    inset -2px -2px 0 rgba(0, 0, 0, 0.35),
    inset 2px 2px 0 rgba(255, 255, 255, 0.06);
}
.pixel-farm-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}
.pixel-farm-badge {
  padding: 1px 4px;
  background: #c78b39;
  color: #24150c;
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.35);
  font-size: 9px;
}
.pixel-farm-minimap {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: rgba(241, 211, 139, 0.75);
}
.pixel-dot {
  width: 6px;
  height: 6px;
  display: inline-block;
  box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.5);
}
.pixel-dot-water {
  background: #48b9e8;
}
.pixel-dot-gold {
  background: #f4c85a;
}
.pixel-farm-board {
  padding: 8px;
  border: 2px solid rgba(18, 13, 9, 0.95);
  background:
    repeating-linear-gradient(
      90deg,
      rgba(87, 58, 31, 0.24) 0 8px,
      transparent 8px 16px
    ),
    repeating-linear-gradient(
      0deg,
      rgba(44, 29, 17, 0.3) 0 8px,
      transparent 8px 16px
    ),
    #4a321f;
}
.pixel-farm-grid {
  display: grid;
  gap: 3px;
  max-width: min(100%, 560px);
  margin: 0 auto;
}
.farm-plot.pixel-farm-tile {
  border: 0;
  border-radius: 0;
  outline: 2px solid #1b120b;
  outline-offset: -2px;
  background: #3a2819;
  transition: none;
  box-shadow:
    inset 2px 2px 0 rgba(255, 226, 151, 0.14),
    inset -3px -3px 0 rgba(0, 0, 0, 0.32),
    0 2px 0 rgba(0, 0, 0, 0.42);
}
.farm-plot.pixel-farm-tile:hover,
.farm-plot.pixel-farm-tile.tile-selected {
  outline-color: #f0cf78;
  transform: translateY(-1px);
  z-index: 3;
  box-shadow:
    inset 2px 2px 0 rgba(255, 239, 181, 0.24),
    inset -3px -3px 0 rgba(0, 0, 0, 0.36),
    0 3px 0 rgba(0, 0, 0, 0.52),
    0 0 0 2px rgba(240, 207, 120, 0.18);
}
.farm-plot.pixel-farm-tile.tile-ready {
  animation: pixel-ready-pulse 1.25s steps(2, end) infinite;
}
@keyframes pixel-ready-pulse {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.22) saturate(1.12);
  }
}
.pixel-tile-coord {
  position: absolute;
  left: 3px;
  top: 2px;
  z-index: 5;
  font-size: 8px;
  line-height: 1;
  color: rgba(255, 240, 190, 0.45);
  text-shadow: 1px 1px 0 #000;
  pointer-events: none;
}
.pixel-farm-tile .pixel-plot-scene {
  inset: 4px;
  border: 0;
  box-shadow: none;
}
.pixel-farm-tile.plot-state-wasteland .pixel-plot-scene {
  background:
    radial-gradient(circle at 27% 33%, #1f1a14 0 6%, transparent 7%),
    radial-gradient(circle at 71% 66%, #262018 0 8%, transparent 9%),
    repeating-linear-gradient(135deg, #3e342a 0 8px, #30271f 8px 16px);
}
.pixel-farm-tile.plot-state-tilled .pixel-plot-scene {
  background:
    repeating-linear-gradient(0deg, #80512b 0 5px, #5b351d 5px 10px),
    repeating-linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.16) 0 3px,
      transparent 3px 12px
    );
}
.pixel-farm-tile.plot-state-planted .pixel-plot-scene,
.pixel-farm-tile.plot-state-growing .pixel-plot-scene {
  background:
    radial-gradient(circle at center, rgba(83, 190, 87, 0.12), transparent 48%),
    repeating-linear-gradient(0deg, #734722 0 5px, #543019 5px 10px);
}
.pixel-farm-tile.plot-state-harvestable .pixel-plot-scene {
  background:
    radial-gradient(
      circle at center,
      rgba(246, 203, 91, 0.22),
      transparent 52%
    ),
    repeating-linear-gradient(0deg, #835724 0 5px, #603b18 5px 10px);
}
.pixel-farm-tile.plot-watered .pixel-plot-scene,
.pixel-farm-tile.tile-sprinkler-covered .pixel-plot-scene {
  box-shadow: inset 0 -10px 0 rgba(52, 163, 218, 0.2);
}
.pixel-farm-tile.tile-needs-water {
  outline-color: #b64a45;
}
.pixel-tile-overlay {
  position: absolute;
  right: 2px;
  top: 2px;
  z-index: 6;
  display: flex;
  flex-direction: column;
  gap: 1px;
  pointer-events: none;
}
.pixel-status-chip {
  width: 13px;
  height: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 0, 0, 0.65);
  box-shadow:
    inset 1px 1px 0 rgba(255, 255, 255, 0.12),
    1px 1px 0 rgba(0, 0, 0, 0.45);
  background: #2d2118;
}
.chip-danger {
  color: #ff7770;
  background: #4b2020;
}
.chip-water {
  color: #79d9ff;
  background: #17384b;
}
.chip-fert {
  color: #a8e86e;
  background: #263b1f;
}
.chip-weed {
  color: #7ee36d;
  background: #18351f;
}
.pixel-growth-track {
  position: absolute;
  left: 5px;
  right: 5px;
  bottom: 4px;
  z-index: 6;
  height: 4px;
  background: rgba(19, 13, 8, 0.75);
  border: 1px solid rgba(0, 0, 0, 0.75);
  pointer-events: none;
}
.pixel-growth-track span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #58c65a, #e9cb61);
  box-shadow: 1px 0 0 rgba(255, 255, 255, 0.22) inset;
}
.pixel-ready-ribbon {
  position: absolute;
  right: 2px;
  bottom: 2px;
  z-index: 7;
  padding: 1px 3px;
  background: #f2c75c;
  color: #2a190c;
  border: 1px solid #1c1208;
  font-size: 9px;
  line-height: 1;
  box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.55);
}
.pixel-giant-mark {
  position: absolute;
  left: 3px;
  bottom: 2px;
  z-index: 5;
  color: #ffe284;
  font-size: 11px;
  text-shadow: 1px 1px 0 #000;
}
.pixel-farm-tile .pixel-empty-icon {
  filter: drop-shadow(1px 1px 0 rgba(0, 0, 0, 0.55));
}
.pixel-farm-tile .pixel-crop-name {
  max-width: 54px;
  border-radius: 0;
  border-color: rgba(0, 0, 0, 0.55);
  background: rgba(18, 12, 8, 0.62);
  color: rgba(255, 244, 204, 0.92);
  box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.4);
}
@media (max-width: 420px) {
  .pixel-farm-shell {
    padding: 7px;
  }
  .pixel-farm-board {
    padding: 5px;
  }
  .pixel-farm-grid {
    gap: 2px;
  }
  .pixel-farm-topbar {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
  .pixel-farm-tile .pixel-crop-name {
    display: none;
  }
  .pixel-tile-coord {
    display: none;
  }
}
</style>
