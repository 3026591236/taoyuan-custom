/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import { Hammer, Trash2, Package, Boxes, X, ArrowUpCircle } from 'lucide-vue-next';
import Button from '@/components/game/Button.vue';
import { QUALITY_NAMES } from '@/composables/useFarmActions';
import { useAnimalStore } from '@/stores/useAnimalStore';
import { useFarmStore } from '@/stores/useFarmStore';
import { useGameStore } from '@/stores/useGameStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useProcessingStore } from '@/stores/useProcessingStore';
import { useSkillStore } from '@/stores/useSkillStore';
import { useWarehouseStore } from '@/stores/useWarehouseStore';
import { getCombinedItemCount, hasCombinedItem, removeCombinedItem } from '@/composables/useCombinedInventory';
import { PROCESSING_MACHINES, SPRINKLERS, FERTILIZERS, BAITS, TACKLES, TAPPER, CRAB_POT_CRAFT, LIGHTNING_ROD, SCARECROW, AUTO_PETTER, BOMBS, getProcessingRecipeById } from '@/data/processing';
import { getItemById, CHEST_DEFS, CHEST_TIER_ORDER } from '@/data/items';
import { ACTION_TIME_COSTS } from '@/data/timeConstants';
import { sfxClick } from '@/composables/useAudio';
import { addLog } from '@/composables/useGameLog';
import { handleEndDay } from '@/composables/useEndDay';
const processingStore = useProcessingStore();
const inventoryStore = useInventoryStore();
const playerStore = usePlayerStore();
const gameStore = useGameStore();
const farmStore = useFarmStore();
const animalStore = useAnimalStore();
const skillStore = useSkillStore();
const warehouseStore = useWarehouseStore();
const activeTab = ref('process');
const onlyAvailable = ref(false);
const getFilteredRecipes = (machineType) => {
    const recipes = processingStore.getAvailableRecipes(machineType);
    if (!onlyAvailable.value)
        return recipes;
    return recipes.filter(r => r.inputItemId === null || hasCombinedItem(r.inputItemId, r.inputQuantity));
};
const QUALITY_ORDER = ['normal', 'fine', 'excellent', 'supreme'];
/** 种子制造机：按品质展开配方列表 */
const getSeedMakerQualityRecipes = (machineType) => {
    const recipes = processingStore.getAvailableRecipes(machineType);
    const result = [];
    for (const recipe of recipes) {
        if (!recipe.inputItemId)
            continue;
        let hasAny = false;
        for (const q of QUALITY_ORDER) {
            const count = getCombinedItemCount(recipe.inputItemId, q);
            if (count > 0) {
                hasAny = true;
                result.push({ recipe, quality: q, count, available: count >= recipe.inputQuantity });
            }
        }
        // 无任何品质库存时，仅在非筛选模式下显示一条（普通品质，不可用）
        if (!hasAny && !onlyAvailable.value) {
            result.push({ recipe, quality: 'normal', count: 0, available: false });
        }
    }
    return result;
};
const machineGroups = computed(() => {
    const groupMap = new Map();
    // 按 PROCESSING_MACHINES 定义顺序作为排序基准
    const typeOrder = new Map(PROCESSING_MACHINES.map((m, i) => [m.id, i]));
    for (let i = 0; i < processingStore.machines.length; i++) {
        const slot = processingStore.machines[i];
        let group = groupMap.get(slot.machineType);
        if (!group) {
            group = { machineType: slot.machineType, name: getMachineName(slot.machineType), slots: [] };
            groupMap.set(slot.machineType, group);
        }
        group.slots.push({ slot, originalIndex: i });
    }
    return [...groupMap.values()].sort((a, b) => (typeOrder.get(a.machineType) ?? 99) - (typeOrder.get(b.machineType) ?? 99));
});
const toggleGroup = (type) => {
    processingStore.toggleGroup(type);
};
/** 获取某类型机器的已有数量 */
const getMachineCountByType = (type) => {
    return processingStore.machines.filter(m => m.machineType === type).length;
};
// === 工坊升级 ===
const showUpgradeModal = ref(false);
const showUpgradeConfirm = ref(false);
const nextUpgrade = computed(() => processingStore.getNextUpgrade());
const canUpgrade = computed(() => {
    const u = nextUpgrade.value;
    if (!u)
        return false;
    return processingStore.canCraft(u.materials, u.cost);
});
const handleUpgradeFromModal = () => {
    const result = processingStore.upgradeWorkshop();
    sfxClick();
    addLog(result.message);
    if (result.success) {
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut)
            handleEndDay();
    }
    showUpgradeConfirm.value = false;
    showUpgradeModal.value = false;
};
const craftModal = ref(null);
const craftQuantity = ref(1);
const maxCraftable = computed(() => {
    const item = craftModal.value;
    if (!item?.batchable)
        return 1;
    let max = 999;
    for (const m of item.materials) {
        max = Math.min(max, Math.floor(getCombinedItemCount(m.itemId) / m.quantity));
    }
    if (item.cost > 0) {
        max = Math.min(max, Math.floor(playerStore.money / item.cost));
    }
    if (item.maxBatch) {
        max = Math.min(max, item.maxBatch());
    }
    return Math.max(1, max);
});
const displayQty = computed(() => (craftModal.value?.batchable ? craftQuantity.value : 1));
const openCraftModal = (item) => {
    craftModal.value = item;
    craftQuantity.value = 1;
};
const setCraftQuantity = (val) => {
    craftQuantity.value = Math.max(1, Math.min(val, maxCraftable.value));
};
const addCraftQuantity = (delta) => {
    setCraftQuantity(craftQuantity.value + delta);
};
const onCraftQuantityInput = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val))
        setCraftQuantity(val);
};
const JADE_RING_COST = [
    { itemId: 'jade', quantity: 1 },
    { itemId: 'gold_ore', quantity: 2 }
];
const JADE_RING_MONEY = 500;
const canCraftJadeRing = computed(() => processingStore.canCraft(JADE_RING_COST, JADE_RING_MONEY));
const STAMINA_FRUIT_COST = [
    { itemId: 'prismatic_shard', quantity: 1 },
    { itemId: 'dragon_jade', quantity: 2 },
    { itemId: 'ginseng', quantity: 5 },
    { itemId: 'iridium_bar', quantity: 3 }
];
const STAMINA_FRUIT_MONEY = 10000;
const allSkillsAbove8 = computed(() => ['farming', 'foraging', 'fishing', 'mining'].every(s => skillStore.getSkill(s).level >= 8));
const canCraftStaminaFruit = computed(() => allSkillsAbove8.value && playerStore.staminaCapLevel < 4 && processingStore.canCraft(STAMINA_FRUIT_COST, STAMINA_FRUIT_MONEY));
const craftCategories = computed(() => [
    {
        label: '加工机器',
        items: PROCESSING_MACHINES.map(m => ({
            id: m.id,
            name: m.name,
            description: m.description,
            materials: m.craftCost,
            cost: m.craftMoney,
            onCraft: () => handleCraftMachine(m.id),
            canCraft: () => processingStore.canCraft(m.craftCost, m.craftMoney) && processingStore.machineCount < processingStore.maxMachines,
            badge: `已有${getMachineCountByType(m.id)}`,
            batchable: true,
            maxBatch: () => processingStore.maxMachines - processingStore.machineCount
        }))
    },
    {
        label: '农场设施',
        items: [
            ...SPRINKLERS.map(s => ({
                id: s.id,
                name: s.name,
                description: s.description,
                materials: s.craftCost,
                cost: s.craftMoney,
                onCraft: () => handleCraftSprinkler(s.id),
                canCraft: () => processingStore.canCraft(s.craftCost, s.craftMoney),
                batchable: true
            })),
            ...FERTILIZERS.map(f => ({
                id: f.id,
                name: f.name,
                description: f.description,
                materials: f.craftCost,
                cost: f.craftMoney,
                onCraft: () => handleCraftFertilizer(f.id),
                canCraft: () => processingStore.canCraft(f.craftCost, f.craftMoney),
                batchable: true
            })),
            {
                id: 'tapper',
                name: TAPPER.name,
                description: TAPPER.description,
                materials: TAPPER.craftCost,
                cost: TAPPER.craftMoney,
                onCraft: () => handleCraftTapper(),
                canCraft: () => processingStore.canCraft(TAPPER.craftCost, TAPPER.craftMoney),
                batchable: true
            },
            {
                id: 'lightning_rod',
                name: LIGHTNING_ROD.name,
                description: LIGHTNING_ROD.description,
                materials: LIGHTNING_ROD.craftCost,
                cost: LIGHTNING_ROD.craftMoney,
                onCraft: () => handleCraftLightningRod(),
                canCraft: () => processingStore.canCraft(LIGHTNING_ROD.craftCost, LIGHTNING_ROD.craftMoney),
                badge: `已有${farmStore.lightningRods}`,
                batchable: true
            },
            {
                id: 'scarecrow',
                name: SCARECROW.name,
                description: SCARECROW.description,
                materials: SCARECROW.craftCost,
                cost: SCARECROW.craftMoney,
                onCraft: () => handleCraftScarecrow(),
                canCraft: () => processingStore.canCraft(SCARECROW.craftCost, SCARECROW.craftMoney),
                badge: `已有${farmStore.scarecrows}`,
                batchable: true
            },
            ...((animalStore.buildings.find(b => b.type === 'coop')?.level ?? 0) >= 2
                ? [
                    {
                        id: 'auto_petter_coop',
                        name: `${AUTO_PETTER.name}（鸡舍）`,
                        description: AUTO_PETTER.description,
                        materials: AUTO_PETTER.craftCost,
                        cost: AUTO_PETTER.craftMoney,
                        onCraft: () => handleCraftAutoPetter('coop'),
                        canCraft: () => !animalStore.hasAutoPetter('coop') && processingStore.canCraft(AUTO_PETTER.craftCost, AUTO_PETTER.craftMoney),
                        badge: animalStore.hasAutoPetter('coop') ? '已安装' : undefined
                    }
                ]
                : []),
            ...((animalStore.buildings.find(b => b.type === 'barn')?.level ?? 0) >= 2
                ? [
                    {
                        id: 'auto_petter_barn',
                        name: `${AUTO_PETTER.name}（牧场）`,
                        description: AUTO_PETTER.description,
                        materials: AUTO_PETTER.craftCost,
                        cost: AUTO_PETTER.craftMoney,
                        onCraft: () => handleCraftAutoPetter('barn'),
                        canCraft: () => !animalStore.hasAutoPetter('barn') && processingStore.canCraft(AUTO_PETTER.craftCost, AUTO_PETTER.craftMoney),
                        badge: animalStore.hasAutoPetter('barn') ? '已安装' : undefined
                    }
                ]
                : [])
        ]
    },
    {
        label: '渔具',
        items: [
            ...BAITS.map(b => ({
                id: b.id,
                name: b.name,
                description: b.description,
                materials: b.craftCost,
                cost: b.craftMoney,
                onCraft: () => handleCraftBait(b.id),
                canCraft: () => processingStore.canCraft(b.craftCost, b.craftMoney),
                batchable: true
            })),
            ...TACKLES.map(t => ({
                id: t.id,
                name: t.name,
                description: t.description,
                materials: t.craftCost,
                cost: t.craftMoney,
                onCraft: () => handleCraftTackle(t.id),
                canCraft: () => processingStore.canCraft(t.craftCost, t.craftMoney),
                batchable: true
            })),
            {
                id: CRAB_POT_CRAFT.id,
                name: CRAB_POT_CRAFT.name,
                description: CRAB_POT_CRAFT.description,
                materials: CRAB_POT_CRAFT.craftCost,
                cost: CRAB_POT_CRAFT.craftMoney,
                onCraft: () => handleCraftCrabPot(),
                canCraft: () => processingStore.canCraft(CRAB_POT_CRAFT.craftCost, CRAB_POT_CRAFT.craftMoney),
                batchable: true
            }
        ]
    },
    {
        label: '其他',
        items: [
            ...BOMBS.map(b => ({
                id: b.id,
                name: b.name,
                description: b.description,
                materials: b.id === 'mega_bomb' ? [{ itemId: 'mega_bomb_recipe', quantity: 1 }, ...b.craftCost] : b.craftCost,
                cost: b.craftMoney,
                onCraft: () => handleCraftBomb(b.id),
                canCraft: () => (b.id !== 'mega_bomb' || hasCombinedItem('mega_bomb_recipe')) && processingStore.canCraft(b.craftCost, b.craftMoney),
                batchable: true
            })),
            {
                id: 'jade_ring',
                name: '翡翠戒指',
                description: '用翡翠和金矿制成的戒指，可以用来求婚。',
                materials: JADE_RING_COST,
                cost: JADE_RING_MONEY,
                onCraft: () => handleCraftJadeRing(),
                canCraft: () => canCraftJadeRing.value
            },
            ...(allSkillsAbove8.value
                ? [
                    {
                        id: 'stamina_fruit',
                        name: '仙桃',
                        description: '蕴含远古灵气的果实，食用后永久提升体力上限。需要种植/觅食/钓鱼/采矿全部≥8级。',
                        materials: STAMINA_FRUIT_COST,
                        cost: STAMINA_FRUIT_MONEY,
                        onCraft: () => handleCraftStaminaFruit(),
                        canCraft: () => canCraftStaminaFruit.value,
                        badge: playerStore.staminaCapLevel >= 4 ? '已满级' : `${playerStore.staminaCapLevel}/4`
                    }
                ]
                : [])
        ]
    },
    ...(warehouseStore.unlocked
        ? [
            {
                label: '箱子',
                items: CHEST_TIER_ORDER.map(tier => {
                    const def = CHEST_DEFS[tier];
                    return {
                        id: `chest_${tier}`,
                        name: def.name,
                        description: def.description,
                        materials: def.craftCost,
                        cost: def.craftMoney,
                        onCraft: () => handleCraftChest(tier),
                        canCraft: () => warehouseStore.chests.length < warehouseStore.maxChests && processingStore.canCraft(def.craftCost, def.craftMoney),
                        badge: `${warehouseStore.chests.length}/${warehouseStore.maxChests}`,
                        batchable: true,
                        maxBatch: () => warehouseStore.maxChests - warehouseStore.chests.length
                    };
                })
            }
        ]
        : [])
]);
const handleCraftFromModal = () => {
    if (!craftModal.value)
        return;
    const qty = craftModal.value.batchable ? Math.min(craftQuantity.value, maxCraftable.value) : 1;
    const startDay = gameStore.day;
    for (let i = 0; i < qty; i++) {
        if (!craftModal.value.canCraft())
            break;
        craftModal.value.onCraft();
        // 晕倒导致日期变更，停止批量制造
        if (gameStore.day !== startDay)
            break;
    }
    craftModal.value = null;
};
// === 工具函数 ===
const getMachineName = (type) => {
    return PROCESSING_MACHINES.find(m => m.id === type)?.name ?? type;
};
const getItemName = (id) => {
    return getItemById(id)?.name ?? id;
};
const getRecipeName = (recipeId) => {
    return getProcessingRecipeById(recipeId)?.name ?? recipeId;
};
const getRecipeOutputName = (recipeId) => {
    const recipe = getProcessingRecipeById(recipeId);
    if (!recipe)
        return recipeId;
    return getItemById(recipe.outputItemId)?.name ?? recipe.name;
};
// === 制造处理 ===
const handleCraftMachine = (machineType) => {
    if (processingStore.craftMachine(machineType)) {
        sfxClick();
        addLog(`制造了${getMachineName(machineType)}并放置到加工区。`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut) {
            handleEndDay();
            return;
        }
    }
    else {
        addLog('材料不足或已达上限。');
    }
};
const handleCraftSprinkler = (sprinklerId) => {
    if (processingStore.craftSprinkler(sprinklerId)) {
        sfxClick();
        const name = SPRINKLERS.find(s => s.id === sprinklerId)?.name ?? sprinklerId;
        addLog(`制造了${name}，已放入背包。去农场放置吧。`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut) {
            handleEndDay();
            return;
        }
    }
    else {
        addLog('材料不足。');
    }
};
const handleCraftFertilizer = (fertilizerId) => {
    if (processingStore.craftFertilizer(fertilizerId)) {
        sfxClick();
        const name = FERTILIZERS.find(f => f.id === fertilizerId)?.name ?? fertilizerId;
        addLog(`制造了${name}，已放入背包。`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut) {
            handleEndDay();
            return;
        }
    }
    else {
        addLog('材料不足。');
    }
};
const handleCraftBait = (baitId) => {
    if (processingStore.craftBait(baitId)) {
        sfxClick();
        const name = BAITS.find(b => b.id === baitId)?.name ?? baitId;
        addLog(`制造了${name}，已放入背包。`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut) {
            handleEndDay();
            return;
        }
    }
    else {
        addLog('材料不足。');
    }
};
const handleCraftTackle = (tackleId) => {
    if (processingStore.craftTackle(tackleId)) {
        sfxClick();
        const name = TACKLES.find(t => t.id === tackleId)?.name ?? tackleId;
        addLog(`制造了${name}，已放入背包。`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut) {
            handleEndDay();
            return;
        }
    }
    else {
        addLog('材料不足。');
    }
};
const handleCraftCrabPot = () => {
    if (processingStore.craftCrabPot()) {
        sfxClick();
        addLog(`制造了${CRAB_POT_CRAFT.name}，已放入背包。`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut) {
            handleEndDay();
            return;
        }
    }
    else {
        addLog('材料不足。');
    }
};
const handleCraftTapper = () => {
    if (processingStore.craftTapper()) {
        sfxClick();
        addLog(`制造了采脂器，已放入背包。去农场安装到野树上吧。`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut) {
            handleEndDay();
            return;
        }
    }
    else {
        addLog('材料不足。');
    }
};
const handleCraftLightningRod = () => {
    if (processingStore.consumeCraftMaterials(LIGHTNING_ROD.craftCost, LIGHTNING_ROD.craftMoney)) {
        sfxClick();
        farmStore.lightningRods++;
        addLog(`制造了避雷针，已安装到农场。(共${farmStore.lightningRods}根)`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut) {
            handleEndDay();
            return;
        }
    }
    else {
        addLog('材料不足。');
    }
};
const handleCraftScarecrow = () => {
    if (processingStore.consumeCraftMaterials(SCARECROW.craftCost, SCARECROW.craftMoney)) {
        sfxClick();
        farmStore.scarecrows++;
        addLog(`制造了稻草人，已安装到农场。(共${farmStore.scarecrows}个)`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut) {
            handleEndDay();
            return;
        }
    }
    else {
        addLog('材料不足。');
    }
};
const handleCraftAutoPetter = (buildingType) => {
    if (animalStore.hasAutoPetter(buildingType)) {
        addLog('该畜舍已安装自动抚摸机。');
        return;
    }
    if (processingStore.consumeCraftMaterials(AUTO_PETTER.craftCost, AUTO_PETTER.craftMoney)) {
        sfxClick();
        const result = animalStore.installAutoPetter(buildingType);
        addLog(result.message);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut) {
            handleEndDay();
            return;
        }
    }
    else {
        addLog('材料不足。');
    }
};
const handleCraftBomb = (bombId) => {
    if (processingStore.craftBomb(bombId)) {
        sfxClick();
        const name = BOMBS.find(b => b.id === bombId)?.name ?? bombId;
        addLog(`制造了${name}，已放入背包。`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut) {
            handleEndDay();
            return;
        }
    }
    else {
        addLog('材料不足。');
    }
};
const handleCraftJadeRing = () => {
    if (!canCraftJadeRing.value)
        return;
    if (!playerStore.spendMoney(JADE_RING_MONEY))
        return;
    for (const c of JADE_RING_COST) {
        if (!removeCombinedItem(c.itemId, c.quantity)) {
            playerStore.earnMoney(JADE_RING_MONEY);
            return;
        }
    }
    inventoryStore.addItem('jade_ring');
    sfxClick();
    addLog('制造了翡翠戒指！可以用来求婚。');
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine);
    if (tr.message)
        addLog(tr.message);
    if (tr.passedOut) {
        handleEndDay();
        return;
    }
};
const handleCraftStaminaFruit = () => {
    if (!canCraftStaminaFruit.value)
        return;
    if (processingStore.consumeCraftMaterials(STAMINA_FRUIT_COST, STAMINA_FRUIT_MONEY)) {
        sfxClick();
        inventoryStore.addItem('stamina_fruit');
        addLog('制造了仙桃！在背包中使用可永久提升体力上限。');
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut) {
            handleEndDay();
            return;
        }
    }
    else {
        addLog('材料不足。');
    }
};
const handleCraftChest = (tier) => {
    const def = CHEST_DEFS[tier];
    if (warehouseStore.chests.length >= warehouseStore.maxChests) {
        addLog('箱子槽位已满，请先扩建仓库。');
        return;
    }
    if (processingStore.consumeCraftMaterials(def.craftCost, def.craftMoney)) {
        sfxClick();
        warehouseStore.addChest(tier);
        addLog(`制造了${def.name}，已放入仓库。`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut) {
            handleEndDay();
            return;
        }
    }
    else {
        addLog('材料不足。');
    }
};
// === 加工处理 ===
const handleStartProcessing = (slotIndex, recipeId, quality) => {
    if (processingStore.startProcessing(slotIndex, recipeId, quality)) {
        sfxClick();
        const recipe = getProcessingRecipeById(recipeId);
        const qualityLabel = quality && quality !== 'normal' ? `(${QUALITY_NAMES[quality]})` : '';
        addLog(`开始加工${recipe?.name ?? recipeId}${qualityLabel}，需要${recipe?.processingDays ?? '?'}天。`);
    }
    else {
        addLog('原料不足或机器正在使用。');
    }
};
const handleCollect = (slotIndex) => {
    const outputId = processingStore.collectProduct(slotIndex);
    if (outputId) {
        sfxClick();
        const name = getItemById(outputId)?.name ?? outputId;
        addLog(`收取了${name}！`);
    }
};
const handleRemoveMachine = (slotIndex) => {
    const slot = processingStore.machines[slotIndex];
    if (!slot)
        return;
    const name = getMachineName(slot.machineType);
    if (processingStore.removeMachine(slotIndex)) {
        addLog(`拆除了${name}，制作材料已退还。`);
    }
};
const handleCancelProcessing = (slotIndex) => {
    const slot = processingStore.machines[slotIndex];
    if (!slot)
        return;
    const name = getMachineName(slot.machineType);
    if (processingStore.cancelProcessing(slotIndex)) {
        addLog(`${name}已停止加工，原料已退回。`);
    }
};
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex space-x-1.5 mb-3" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
const __VLS_0 = Button || Button;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.activeTab === 'process' }) },
    icon: (__VLS_ctx.Boxes),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.activeTab === 'process' }) },
    icon: (__VLS_ctx.Boxes),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_5;
const __VLS_6 = {
    /** @type {typeof __VLS_5.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.activeTab = 'process';
        // @ts-ignore
        [activeTab, activeTab, Boxes,];
    },
};
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
const { default: __VLS_7 } = __VLS_3.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-[10px] ml-0.5 opacity-70" },
});
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-70']} */ ;
(__VLS_ctx.processingStore.machineCount);
(__VLS_ctx.processingStore.maxMachines);
// @ts-ignore
[processingStore, processingStore,];
var __VLS_3;
var __VLS_4;
const __VLS_8 = Button || Button;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.activeTab === 'craft' }) },
    icon: (__VLS_ctx.Hammer),
}));
const __VLS_10 = __VLS_9({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.activeTab === 'craft' }) },
    icon: (__VLS_ctx.Hammer),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_13;
const __VLS_14 = {
    /** @type {typeof __VLS_13.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.activeTab = 'craft';
        // @ts-ignore
        [activeTab, activeTab, Hammer,];
    },
};
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
const { default: __VLS_15 } = __VLS_11.slots;
// @ts-ignore
[];
var __VLS_11;
var __VLS_12;
if (__VLS_ctx.activeTab === 'process') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-1.5 text-sm text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    let __VLS_16;
    /** @ts-ignore @type { | typeof __VLS_components.Boxes} */
    Boxes;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
        size: (14),
    }));
    const __VLS_18 = __VLS_17({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted font-normal" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-normal']} */ ;
    (__VLS_ctx.processingStore.machineCount);
    (__VLS_ctx.processingStore.maxMachines);
    if (__VLS_ctx.nextUpgrade || __VLS_ctx.processingStore.workshopLevel > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'process'))
                        throw 0;
                    if (!(__VLS_ctx.nextUpgrade || __VLS_ctx.processingStore.workshopLevel > 0))
                        throw 0;
                    return __VLS_ctx.showUpgradeModal = true;
                    // @ts-ignore
                    [activeTab, processingStore, processingStore, processingStore, nextUpgrade, showUpgradeModal,];
                } },
            ...{ class: "text-[10px] px-2 py-0.5 border rounded-xs" },
            ...{ class: (__VLS_ctx.nextUpgrade ? 'border-accent/30 text-accent hover:bg-accent/5 cursor-pointer' : 'border-accent/10 text-muted') },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        let __VLS_21;
        /** @ts-ignore @type { | typeof __VLS_components.ArrowUpCircle} */
        ArrowUpCircle;
        // @ts-ignore
        const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
            size: (10),
            ...{ class: "inline mr-0.5" },
        }));
        const __VLS_23 = __VLS_22({
            size: (10),
            ...{ class: "inline mr-0.5" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_22));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-0.5']} */ ;
        (__VLS_ctx.processingStore.workshopLevel);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "flex items-center space-x-1 mb-2 cursor-pointer select-none" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
    /** @type {__VLS_StyleScopedClasses['select-none']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "checkbox",
        ...{ class: "accent-accent" },
    });
    (__VLS_ctx.onlyAvailable);
    /** @type {__VLS_StyleScopedClasses['accent-accent']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    if (__VLS_ctx.processingStore.machines.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center justify-center py-8" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-8']} */ ;
        let __VLS_26;
        /** @ts-ignore @type { | typeof __VLS_components.Boxes} */
        Boxes;
        // @ts-ignore
        const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
            size: (36),
            ...{ class: "text-accent/20 mb-2" },
        }));
        const __VLS_28 = __VLS_27({
            size: (36),
            ...{ class: "text-accent/20 mb-2" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_27));
        /** @type {__VLS_StyleScopedClasses['text-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted/50 mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        for (const [group] of __VLS_vFor((__VLS_ctx.machineGroups))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (group.machineType),
                ...{ class: "border border-accent/10 rounded-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeTab === 'process'))
                            throw 0;
                        if (!!(__VLS_ctx.processingStore.machines.length === 0))
                            throw 0;
                        return __VLS_ctx.toggleGroup(group.machineType);
                        // @ts-ignore
                        [processingStore, processingStore, nextUpgrade, onlyAvailable, machineGroups, toggleGroup,];
                    } },
                ...{ class: "flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-accent/5 select-none" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            /** @type {__VLS_StyleScopedClasses['select-none']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            (group.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (group.slots.length);
            if (group.slots.some(s => s.slot.ready)) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-success" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                (group.slots.filter(s => s.slot.ready).length);
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (__VLS_ctx.processingStore.collapsedGroups.has(group.machineType) ? '▸' : '▾');
            if (!__VLS_ctx.processingStore.collapsedGroups.has(group.machineType)) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex flex-col space-y-1.5 px-2 pb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['pb-2']} */ ;
                for (const [{ slot, originalIndex }] of __VLS_vFor((group.slots))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        key: (originalIndex),
                        ...{ class: "border rounded-xs p-2" },
                        ...{ class: (slot.ready ? 'border-success/30' : 'border-accent/20') },
                    });
                    /** @type {__VLS_StyleScopedClasses['border']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex items-center justify-between mb-1.5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-xs" },
                        ...{ class: (slot.ready ? 'text-success' : 'text-accent') },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    (group.name);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.activeTab === 'process'))
                                    throw 0;
                                if (!!(__VLS_ctx.processingStore.machines.length === 0))
                                    throw 0;
                                if (!(!__VLS_ctx.processingStore.collapsedGroups.has(group.machineType)))
                                    throw 0;
                                return __VLS_ctx.handleRemoveMachine(originalIndex);
                                // @ts-ignore
                                [processingStore, processingStore, handleRemoveMachine,];
                            } },
                        ...{ class: "text-muted hover:text-danger" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                    /** @type {__VLS_StyleScopedClasses['hover:text-danger']} */ ;
                    let __VLS_31;
                    /** @ts-ignore @type { | typeof __VLS_components.Trash2} */
                    Trash2;
                    // @ts-ignore
                    const __VLS_32 = __VLS_asFunctionalComponent1(__VLS_31, new __VLS_31({
                        size: (12),
                    }));
                    const __VLS_33 = __VLS_32({
                        size: (12),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_32));
                    if (!slot.recipeId) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                        if (slot.machineType === 'seed_maker') {
                            if (__VLS_ctx.getSeedMakerQualityRecipes(slot.machineType).length > 0) {
                                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                    ...{ class: "grid space-y-1" },
                                });
                                /** @type {__VLS_StyleScopedClasses['grid']} */ ;
                                /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
                                for (const [qr] of __VLS_vFor((__VLS_ctx.getSeedMakerQualityRecipes(slot.machineType)))) {
                                    const __VLS_36 = Button || Button;
                                    // @ts-ignore
                                    const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
                                        ...{ 'onClick': {} },
                                        key: (qr.recipe.id + ':' + qr.quality),
                                        disabled: (!qr.available),
                                    }));
                                    const __VLS_38 = __VLS_37({
                                        ...{ 'onClick': {} },
                                        key: (qr.recipe.id + ':' + qr.quality),
                                        disabled: (!qr.available),
                                    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
                                    let __VLS_41;
                                    const __VLS_42 = {
                                        /** @type {typeof __VLS_41.click} */
                                        onClick: (...[$event]) => {
                                            if (!(__VLS_ctx.activeTab === 'process'))
                                                throw 0;
                                            if (!!(__VLS_ctx.processingStore.machines.length === 0))
                                                throw 0;
                                            if (!(!__VLS_ctx.processingStore.collapsedGroups.has(group.machineType)))
                                                throw 0;
                                            if (!(!slot.recipeId))
                                                throw 0;
                                            if (!(slot.machineType === 'seed_maker'))
                                                throw 0;
                                            if (!(__VLS_ctx.getSeedMakerQualityRecipes(slot.machineType).length > 0))
                                                throw 0;
                                            return __VLS_ctx.handleStartProcessing(originalIndex, qr.recipe.id, qr.quality);
                                            // @ts-ignore
                                            [getSeedMakerQualityRecipes, getSeedMakerQualityRecipes, handleStartProcessing,];
                                        },
                                    };
                                    const { default: __VLS_43 } = __VLS_39.slots;
                                    (qr.recipe.name);
                                    if (qr.quality !== 'normal') {
                                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                            ...{ class: ({
                                                    'text-quality-fine': qr.quality === 'fine',
                                                    'text-quality-excellent': qr.quality === 'excellent',
                                                    'text-quality-supreme': qr.quality === 'supreme'
                                                }) },
                                        });
                                        /** @type {__VLS_StyleScopedClasses['text-quality-fine']} */ ;
                                        /** @type {__VLS_StyleScopedClasses['text-quality-excellent']} */ ;
                                        /** @type {__VLS_StyleScopedClasses['text-quality-supreme']} */ ;
                                        (__VLS_ctx.QUALITY_NAMES[qr.quality]);
                                    }
                                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                        ...{ class: "text-muted" },
                                    });
                                    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                                    (qr.count);
                                    (qr.recipe.inputQuantity);
                                    // @ts-ignore
                                    [QUALITY_NAMES,];
                                    var __VLS_39;
                                    var __VLS_40;
                                    // @ts-ignore
                                    [];
                                }
                            }
                            else {
                                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                                    ...{ class: "text-xs text-muted" },
                                });
                                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                                (__VLS_ctx.onlyAvailable ? '没有材料足够的配方' : '无可用配方');
                            }
                        }
                        else {
                            if (__VLS_ctx.getFilteredRecipes(slot.machineType).length > 0) {
                                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                    ...{ class: "grid space-y-1" },
                                });
                                /** @type {__VLS_StyleScopedClasses['grid']} */ ;
                                /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
                                for (const [recipe] of __VLS_vFor((__VLS_ctx.getFilteredRecipes(slot.machineType)))) {
                                    const __VLS_44 = Button || Button;
                                    // @ts-ignore
                                    const __VLS_45 = __VLS_asFunctionalComponent1(__VLS_44, new __VLS_44({
                                        ...{ 'onClick': {} },
                                        key: (recipe.id),
                                        disabled: (recipe.inputItemId !== null && !__VLS_ctx.hasCombinedItem(recipe.inputItemId, recipe.inputQuantity)),
                                    }));
                                    const __VLS_46 = __VLS_45({
                                        ...{ 'onClick': {} },
                                        key: (recipe.id),
                                        disabled: (recipe.inputItemId !== null && !__VLS_ctx.hasCombinedItem(recipe.inputItemId, recipe.inputQuantity)),
                                    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
                                    let __VLS_49;
                                    const __VLS_50 = {
                                        /** @type {typeof __VLS_49.click} */
                                        onClick: (...[$event]) => {
                                            if (!(__VLS_ctx.activeTab === 'process'))
                                                throw 0;
                                            if (!!(__VLS_ctx.processingStore.machines.length === 0))
                                                throw 0;
                                            if (!(!__VLS_ctx.processingStore.collapsedGroups.has(group.machineType)))
                                                throw 0;
                                            if (!(!slot.recipeId))
                                                throw 0;
                                            if (!!(slot.machineType === 'seed_maker'))
                                                throw 0;
                                            if (!(__VLS_ctx.getFilteredRecipes(slot.machineType).length > 0))
                                                throw 0;
                                            return __VLS_ctx.handleStartProcessing(originalIndex, recipe.id);
                                            // @ts-ignore
                                            [onlyAvailable, handleStartProcessing, getFilteredRecipes, getFilteredRecipes, hasCombinedItem,];
                                        },
                                    };
                                    const { default: __VLS_51 } = __VLS_47.slots;
                                    (recipe.name);
                                    if (recipe.inputItemId) {
                                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                            ...{ class: "text-muted" },
                                        });
                                        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                                        (__VLS_ctx.getItemName(recipe.inputItemId));
                                        (__VLS_ctx.getCombinedItemCount(recipe.inputItemId));
                                        (recipe.inputQuantity);
                                    }
                                    // @ts-ignore
                                    [getItemName, getCombinedItemCount,];
                                    var __VLS_47;
                                    var __VLS_48;
                                    // @ts-ignore
                                    [];
                                }
                            }
                            else {
                                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                                    ...{ class: "text-xs text-muted" },
                                });
                                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                                (__VLS_ctx.onlyAvailable ? '没有材料足够的配方' : '无可用配方');
                            }
                        }
                    }
                    else if (!slot.ready) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "flex items-center justify-between text-xs mb-1" },
                        });
                        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "text-muted" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                        (__VLS_ctx.getRecipeName(slot.recipeId));
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "text-muted" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                        (slot.daysProcessed);
                        (slot.totalDays);
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "h-1 bg-bg rounded-xs border border-accent/10 mb-1.5" },
                        });
                        /** @type {__VLS_StyleScopedClasses['h-1']} */ ;
                        /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
                        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                        /** @type {__VLS_StyleScopedClasses['border']} */ ;
                        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
                            ...{ class: "h-full bg-accent rounded-xs transition-all" },
                            ...{ style: ({ width: Math.floor((slot.daysProcessed / slot.totalDays) * 100) + '%' }) },
                        });
                        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
                        /** @type {__VLS_StyleScopedClasses['bg-accent']} */ ;
                        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
                        const __VLS_52 = Button || Button;
                        // @ts-ignore
                        const __VLS_53 = __VLS_asFunctionalComponent1(__VLS_52, new __VLS_52({
                            ...{ 'onClick': {} },
                            ...{ class: "w-full justify-center" },
                            icon: (__VLS_ctx.X),
                            iconSize: (10),
                        }));
                        const __VLS_54 = __VLS_53({
                            ...{ 'onClick': {} },
                            ...{ class: "w-full justify-center" },
                            icon: (__VLS_ctx.X),
                            iconSize: (10),
                        }, ...__VLS_functionalComponentArgsRest(__VLS_53));
                        let __VLS_57;
                        const __VLS_58 = {
                            /** @type {typeof __VLS_57.click} */
                            onClick: (...[$event]) => {
                                if (!(__VLS_ctx.activeTab === 'process'))
                                    throw 0;
                                if (!!(__VLS_ctx.processingStore.machines.length === 0))
                                    throw 0;
                                if (!(!__VLS_ctx.processingStore.collapsedGroups.has(group.machineType)))
                                    throw 0;
                                if (!!(!slot.recipeId))
                                    throw 0;
                                if (!(!slot.ready))
                                    throw 0;
                                return __VLS_ctx.handleCancelProcessing(originalIndex);
                                // @ts-ignore
                                [onlyAvailable, getRecipeName, X, handleCancelProcessing,];
                            },
                        };
                        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
                        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                        const { default: __VLS_59 } = __VLS_55.slots;
                        // @ts-ignore
                        [];
                        var __VLS_55;
                        var __VLS_56;
                    }
                    else {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                        const __VLS_60 = Button || Button;
                        // @ts-ignore
                        const __VLS_61 = __VLS_asFunctionalComponent1(__VLS_60, new __VLS_60({
                            ...{ 'onClick': {} },
                            ...{ class: "w-full justify-center !bg-accent !text-bg" },
                            icon: (__VLS_ctx.Package),
                            iconSize: (12),
                        }));
                        const __VLS_62 = __VLS_61({
                            ...{ 'onClick': {} },
                            ...{ class: "w-full justify-center !bg-accent !text-bg" },
                            icon: (__VLS_ctx.Package),
                            iconSize: (12),
                        }, ...__VLS_functionalComponentArgsRest(__VLS_61));
                        let __VLS_65;
                        const __VLS_66 = {
                            /** @type {typeof __VLS_65.click} */
                            onClick: (...[$event]) => {
                                if (!(__VLS_ctx.activeTab === 'process'))
                                    throw 0;
                                if (!!(__VLS_ctx.processingStore.machines.length === 0))
                                    throw 0;
                                if (!(!__VLS_ctx.processingStore.collapsedGroups.has(group.machineType)))
                                    throw 0;
                                if (!!(!slot.recipeId))
                                    throw 0;
                                if (!!(!slot.ready))
                                    throw 0;
                                return __VLS_ctx.handleCollect(originalIndex);
                                // @ts-ignore
                                [Package, handleCollect,];
                            },
                        };
                        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
                        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
                        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
                        const { default: __VLS_67 } = __VLS_63.slots;
                        (__VLS_ctx.getRecipeOutputName(slot.recipeId));
                        // @ts-ignore
                        [getRecipeOutputName,];
                        var __VLS_63;
                        var __VLS_64;
                    }
                    // @ts-ignore
                    [];
                }
            }
            // @ts-ignore
            [];
        }
    }
}
if (__VLS_ctx.activeTab === 'craft') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-1.5 text-sm text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    let __VLS_68;
    /** @ts-ignore @type { | typeof __VLS_components.Hammer} */
    Hammer;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent1(__VLS_68, new __VLS_68({
        size: (14),
    }));
    const __VLS_70 = __VLS_69({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.processingStore.machineCount);
    (__VLS_ctx.processingStore.maxMachines);
    for (const [cat] of __VLS_vFor((__VLS_ctx.craftCategories))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (cat.label),
            ...{ class: "mb-3 last:mb-0" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['last:mb-0']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        (cat.label);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1 max-h-60 overflow-y-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        for (const [item] of __VLS_vFor((cat.items))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeTab === 'craft'))
                            throw 0;
                        return __VLS_ctx.openCraftModal(item);
                        // @ts-ignore
                        [activeTab, processingStore, processingStore, craftCategories, openCraftModal,];
                    } },
                key: (item.id),
                ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5 mr-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-xs truncate mr-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
            (item.name);
            if (item.badge) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-muted ml-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
                (item.badge);
            }
            if (item.cost > 0) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-accent whitespace-nowrap" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
                (item.cost);
            }
            // @ts-ignore
            [];
        }
        // @ts-ignore
        [];
    }
}
let __VLS_73;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_74 = __VLS_asFunctionalComponent1(__VLS_73, new __VLS_73({
    name: "panel-fade",
}));
const __VLS_75 = __VLS_74({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_74));
const { default: __VLS_78 } = __VLS_76.slots;
if (__VLS_ctx.showUpgradeModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showUpgradeModal))
                    throw 0;
                return __VLS_ctx.showUpgradeModal = false;
                // @ts-ignore
                [showUpgradeModal, showUpgradeModal,];
            } },
        ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel max-w-xs w-full relative" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showUpgradeModal))
                    throw 0;
                return __VLS_ctx.showUpgradeModal = false;
                // @ts-ignore
                [showUpgradeModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_79;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_80 = __VLS_asFunctionalComponent1(__VLS_79, new __VLS_79({
        size: (14),
    }));
    const __VLS_81 = __VLS_80({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_80));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    let __VLS_84;
    /** @ts-ignore @type { | typeof __VLS_components.ArrowUpCircle} */
    ArrowUpCircle;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent1(__VLS_84, new __VLS_84({
        size: (14),
        ...{ class: "inline mr-0.5" },
    }));
    const __VLS_86 = __VLS_85({
        size: (14),
        ...{ class: "inline mr-0.5" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    /** @type {__VLS_StyleScopedClasses['mr-0.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.processingStore.workshopLevel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mt-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
    (__VLS_ctx.processingStore.maxMachines);
    if (__VLS_ctx.nextUpgrade) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        (__VLS_ctx.processingStore.workshopLevel + 1);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-text" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
        (__VLS_ctx.processingStore.maxMachines);
        (__VLS_ctx.processingStore.maxMachines + 5);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        for (const [mat] of __VLS_vFor((__VLS_ctx.nextUpgrade.materials))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (mat.itemId),
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (__VLS_ctx.getItemById(mat.itemId)?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs" },
                ...{ class: (__VLS_ctx.getCombinedItemCount(mat.itemId) >= mat.quantity ? '' : 'text-danger') },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.getCombinedItemCount(mat.itemId));
            (mat.quantity);
            // @ts-ignore
            [processingStore, processingStore, processingStore, processingStore, processingStore, nextUpgrade, nextUpgrade, getCombinedItemCount, getCombinedItemCount, getItemById,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.playerStore.money >= __VLS_ctx.nextUpgrade.cost ? '' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.nextUpgrade.cost);
        if (!__VLS_ctx.showUpgradeConfirm) {
            const __VLS_89 = Button || Button;
            // @ts-ignore
            const __VLS_90 = __VLS_asFunctionalComponent1(__VLS_89, new __VLS_89({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center" },
                ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canUpgrade }) },
                icon: (__VLS_ctx.ArrowUpCircle),
                iconSize: (12),
                disabled: (!__VLS_ctx.canUpgrade),
            }));
            const __VLS_91 = __VLS_90({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center" },
                ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canUpgrade }) },
                icon: (__VLS_ctx.ArrowUpCircle),
                iconSize: (12),
                disabled: (!__VLS_ctx.canUpgrade),
            }, ...__VLS_functionalComponentArgsRest(__VLS_90));
            let __VLS_94;
            const __VLS_95 = {
                /** @type {typeof __VLS_94.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showUpgradeModal))
                        throw 0;
                    if (!(__VLS_ctx.nextUpgrade))
                        throw 0;
                    if (!(!__VLS_ctx.showUpgradeConfirm))
                        throw 0;
                    return __VLS_ctx.showUpgradeConfirm = true;
                    // @ts-ignore
                    [nextUpgrade, nextUpgrade, playerStore, showUpgradeConfirm, showUpgradeConfirm, canUpgrade, canUpgrade, ArrowUpCircle,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
            const { default: __VLS_96 } = __VLS_92.slots;
            // @ts-ignore
            [];
            var __VLS_92;
            var __VLS_93;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            const __VLS_97 = Button || Button;
            // @ts-ignore
            const __VLS_98 = __VLS_asFunctionalComponent1(__VLS_97, new __VLS_97({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center" },
            }));
            const __VLS_99 = __VLS_98({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_98));
            let __VLS_102;
            const __VLS_103 = {
                /** @type {typeof __VLS_102.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showUpgradeModal))
                        throw 0;
                    if (!(__VLS_ctx.nextUpgrade))
                        throw 0;
                    if (!!(!__VLS_ctx.showUpgradeConfirm))
                        throw 0;
                    return __VLS_ctx.showUpgradeConfirm = false;
                    // @ts-ignore
                    [showUpgradeConfirm,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            const { default: __VLS_104 } = __VLS_100.slots;
            // @ts-ignore
            [];
            var __VLS_100;
            var __VLS_101;
            const __VLS_105 = Button || Button;
            // @ts-ignore
            const __VLS_106 = __VLS_asFunctionalComponent1(__VLS_105, new __VLS_105({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center !bg-accent !text-bg" },
                icon: (__VLS_ctx.ArrowUpCircle),
                iconSize: (12),
            }));
            const __VLS_107 = __VLS_106({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center !bg-accent !text-bg" },
                icon: (__VLS_ctx.ArrowUpCircle),
                iconSize: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_106));
            let __VLS_110;
            const __VLS_111 = {
                /** @type {typeof __VLS_110.click} */
                onClick: (__VLS_ctx.handleUpgradeFromModal),
            };
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
            const { default: __VLS_112 } = __VLS_108.slots;
            // @ts-ignore
            [ArrowUpCircle, handleUpgradeFromModal,];
            var __VLS_108;
            var __VLS_109;
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted text-center" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    }
}
// @ts-ignore
[];
var __VLS_76;
let __VLS_113;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_114 = __VLS_asFunctionalComponent1(__VLS_113, new __VLS_113({
    name: "panel-fade",
}));
const __VLS_115 = __VLS_114({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_114));
const { default: __VLS_118 } = __VLS_116.slots;
if (__VLS_ctx.craftModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.craftModal))
                    throw 0;
                return __VLS_ctx.craftModal = null;
                // @ts-ignore
                [craftModal, craftModal,];
            } },
        ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel max-w-xs w-full relative" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.craftModal))
                    throw 0;
                return __VLS_ctx.craftModal = null;
                // @ts-ignore
                [craftModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_119;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_120 = __VLS_asFunctionalComponent1(__VLS_119, new __VLS_119({
        size: (14),
    }));
    const __VLS_121 = __VLS_120({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_120));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.craftModal.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.craftModal.description);
    if (__VLS_ctx.craftModal.badge) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        (__VLS_ctx.craftModal.badge);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    for (const [mat] of __VLS_vFor((__VLS_ctx.craftModal.materials))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (mat.itemId),
            ...{ class: "flex items-center justify-between" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.getItemName(mat.itemId));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.getCombinedItemCount(mat.itemId) >= mat.quantity * __VLS_ctx.displayQty ? '' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.getCombinedItemCount(mat.itemId));
        (mat.quantity * __VLS_ctx.displayQty);
        // @ts-ignore
        [getItemName, getCombinedItemCount, getCombinedItemCount, craftModal, craftModal, craftModal, craftModal, craftModal, displayQty, displayQty,];
    }
    if (__VLS_ctx.craftModal.cost > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.playerStore.money >= __VLS_ctx.craftModal.cost * __VLS_ctx.displayQty ? '' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.craftModal.cost * __VLS_ctx.displayQty);
    }
    if (__VLS_ctx.craftModal.batchable && __VLS_ctx.maxCraftable > 1) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between mb-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        const __VLS_124 = Button || Button;
        // @ts-ignore
        const __VLS_125 = __VLS_asFunctionalComponent1(__VLS_124, new __VLS_124({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.craftQuantity <= 1),
        }));
        const __VLS_126 = __VLS_125({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.craftQuantity <= 1),
        }, ...__VLS_functionalComponentArgsRest(__VLS_125));
        let __VLS_129;
        const __VLS_130 = {
            /** @type {typeof __VLS_129.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.craftModal))
                    throw 0;
                if (!(__VLS_ctx.craftModal.batchable && __VLS_ctx.maxCraftable > 1))
                    throw 0;
                return __VLS_ctx.addCraftQuantity(-1);
                // @ts-ignore
                [playerStore, craftModal, craftModal, craftModal, craftModal, displayQty, displayQty, maxCraftable, craftQuantity, addCraftQuantity,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_131 } = __VLS_127.slots;
        // @ts-ignore
        [];
        var __VLS_127;
        var __VLS_128;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onInput: (__VLS_ctx.onCraftQuantityInput) },
            type: "number",
            value: (__VLS_ctx.craftQuantity),
            min: "1",
            max: (__VLS_ctx.maxCraftable),
            ...{ class: "w-16 h-6 px-2 py-0.5 bg-bg border border-accent/30 rounded-xs text-xs text-center text-accent outline-none focus:border-accent transition-colors" },
        });
        /** @type {__VLS_StyleScopedClasses['w-16']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['outline-none']} */ ;
        /** @type {__VLS_StyleScopedClasses['focus:border-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
        const __VLS_132 = Button || Button;
        // @ts-ignore
        const __VLS_133 = __VLS_asFunctionalComponent1(__VLS_132, new __VLS_132({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.craftQuantity >= __VLS_ctx.maxCraftable),
        }));
        const __VLS_134 = __VLS_133({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.craftQuantity >= __VLS_ctx.maxCraftable),
        }, ...__VLS_functionalComponentArgsRest(__VLS_133));
        let __VLS_137;
        const __VLS_138 = {
            /** @type {typeof __VLS_137.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.craftModal))
                    throw 0;
                if (!(__VLS_ctx.craftModal.batchable && __VLS_ctx.maxCraftable > 1))
                    throw 0;
                return __VLS_ctx.addCraftQuantity(1);
                // @ts-ignore
                [maxCraftable, maxCraftable, craftQuantity, craftQuantity, addCraftQuantity, onCraftQuantityInput,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_139 } = __VLS_135.slots;
        // @ts-ignore
        [];
        var __VLS_135;
        var __VLS_136;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        const __VLS_140 = Button || Button;
        // @ts-ignore
        const __VLS_141 = __VLS_asFunctionalComponent1(__VLS_140, new __VLS_140({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.craftQuantity <= 1),
        }));
        const __VLS_142 = __VLS_141({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.craftQuantity <= 1),
        }, ...__VLS_functionalComponentArgsRest(__VLS_141));
        let __VLS_145;
        const __VLS_146 = {
            /** @type {typeof __VLS_145.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.craftModal))
                    throw 0;
                if (!(__VLS_ctx.craftModal.batchable && __VLS_ctx.maxCraftable > 1))
                    throw 0;
                return __VLS_ctx.setCraftQuantity(1);
                // @ts-ignore
                [craftQuantity, setCraftQuantity,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_147 } = __VLS_143.slots;
        // @ts-ignore
        [];
        var __VLS_143;
        var __VLS_144;
        const __VLS_148 = Button || Button;
        // @ts-ignore
        const __VLS_149 = __VLS_asFunctionalComponent1(__VLS_148, new __VLS_148({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.craftQuantity >= __VLS_ctx.maxCraftable),
        }));
        const __VLS_150 = __VLS_149({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.craftQuantity >= __VLS_ctx.maxCraftable),
        }, ...__VLS_functionalComponentArgsRest(__VLS_149));
        let __VLS_153;
        const __VLS_154 = {
            /** @type {typeof __VLS_153.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.craftModal))
                    throw 0;
                if (!(__VLS_ctx.craftModal.batchable && __VLS_ctx.maxCraftable > 1))
                    throw 0;
                return __VLS_ctx.setCraftQuantity(__VLS_ctx.maxCraftable);
                // @ts-ignore
                [maxCraftable, maxCraftable, craftQuantity, setCraftQuantity,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_155 } = __VLS_151.slots;
        // @ts-ignore
        [];
        var __VLS_151;
        var __VLS_152;
        if (__VLS_ctx.craftModal.cost > 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between mt-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            (__VLS_ctx.craftModal.cost * __VLS_ctx.craftQuantity);
        }
    }
    const __VLS_156 = Button || Button;
    // @ts-ignore
    const __VLS_157 = __VLS_asFunctionalComponent1(__VLS_156, new __VLS_156({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.craftModal.canCraft() }) },
        icon: (__VLS_ctx.Hammer),
        iconSize: (12),
        disabled: (!__VLS_ctx.craftModal.canCraft()),
    }));
    const __VLS_158 = __VLS_157({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.craftModal.canCraft() }) },
        icon: (__VLS_ctx.Hammer),
        iconSize: (12),
        disabled: (!__VLS_ctx.craftModal.canCraft()),
    }, ...__VLS_functionalComponentArgsRest(__VLS_157));
    let __VLS_161;
    const __VLS_162 = {
        /** @type {typeof __VLS_161.click} */
        onClick: (__VLS_ctx.handleCraftFromModal),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_163 } = __VLS_159.slots;
    (__VLS_ctx.craftModal.batchable && __VLS_ctx.craftQuantity > 1 ? `制造 ×${__VLS_ctx.craftQuantity}` : '制造');
    // @ts-ignore
    [Hammer, craftModal, craftModal, craftModal, craftModal, craftModal, craftQuantity, craftQuantity, craftQuantity, handleCraftFromModal,];
    var __VLS_159;
    var __VLS_160;
}
// @ts-ignore
[];
var __VLS_116;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
