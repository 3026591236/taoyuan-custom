/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import { TreePine, Search, X, Swords, Shield, MoveRight } from 'lucide-vue-next';
import { useAchievementStore } from '@/stores/useAchievementStore';
import { useCookingStore } from '@/stores/useCookingStore';
import { useGameStore, SEASON_NAMES } from '@/stores/useGameStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useQuestStore } from '@/stores/useQuestStore';
import { useSkillStore } from '@/stores/useSkillStore';
import { useMiningStore } from '@/stores/useMiningStore';
import { useWalletStore } from '@/stores/useWalletStore';
import { getForageItems, getItemById, getItemSource } from '@/data';
import { WEATHER_FORAGE_MODIFIER, FOREST_ENCOUNTER_CHANCE, FOREST_DEFEAT_MONEY_PENALTY_RATE, FOREST_DEFEAT_MONEY_PENALTY_CAP, rollForestEncounter } from '@/data/forage';
import { getWeaponById, getEnchantmentById } from '@/data/weapons';
import { ACTION_TIME_COSTS, TOOL_TIME_SAVINGS, SKILL_TIME_REDUCTION_PER_LEVEL, MIN_ACTION_MINUTES } from '@/data/timeConstants';
import { sfxForage } from '@/composables/useAudio';
import { addLog } from '@/composables/useGameLog';
import { handleEndDay } from '@/composables/useEndDay';
import { useHiddenNpcStore } from '@/stores/useHiddenNpcStore';
const playerStore = usePlayerStore();
const inventoryStore = useInventoryStore();
const skillStore = useSkillStore();
const gameStore = useGameStore();
const achievementStore = useAchievementStore();
const cookingStore = useCookingStore();
const walletStore = useWalletStore();
const QUALITY_COLORS = {
    normal: '',
    fine: 'text-quality-fine',
    excellent: 'text-quality-excellent',
    supreme: 'text-quality-supreme'
};
const QUALITY_NAMES = {
    normal: '普通',
    fine: '优质',
    excellent: '精品',
    supreme: '极品'
};
const CATEGORY_NAMES = {
    seed: '种子',
    crop: '农作物',
    fish: '鱼类',
    ore: '矿石',
    gem: '宝石',
    gift: '礼物',
    food: '食物',
    material: '材料',
    misc: '杂项',
    processed: '加工品',
    machine: '机器',
    sprinkler: '洒水器',
    fertilizer: '肥料',
    animal_product: '畜产品',
    sapling: '树苗',
    fruit: '水果',
    bait: '鱼饵',
    tackle: '钓具',
    bomb: '炸弹',
    fossil: '化石',
    artifact: '文物',
    weapon: '武器',
    ring: '戒指',
    hat: '帽子',
    shoe: '鞋子'
};
const lastResults = ref([]);
const selectedResult = ref(null);
const selectedResultDef = computed(() => {
    if (!selectedResult.value?.itemId)
        return null;
    return getItemById(selectedResult.value.itemId) ?? null;
});
const currentForage = computed(() => getForageItems(gameStore.season));
const foragingSkill = computed(() => skillStore.getSkill('foraging'));
const forageCost = computed(() => Math.max(1, Math.floor(5 * inventoryStore.getToolStaminaMultiplier('axe') * (1 - skillStore.getStaminaReduction('foraging')))));
/** 采集耗时（小时），受工具和技能减免 */
const forageTime = computed(() => {
    const baseMin = ACTION_TIME_COSTS.forage * 60;
    const toolTier = inventoryStore.getTool('axe')?.tier ?? 'basic';
    const saving = TOOL_TIME_SAVINGS[toolTier] ?? 0;
    const skillReduction = skillStore.getSkill('foraging').level * SKILL_TIME_REDUCTION_PER_LEVEL;
    return Math.max(MIN_ACTION_MINUTES, Math.round((baseMin - saving) * (1 - skillReduction))) / 60;
});
const forageTimeLabel = computed(() => `${Math.round(forageTime.value * 60)}分钟`);
const weatherMod = computed(() => WEATHER_FORAGE_MODIFIER[gameStore.weather] ?? 1);
const WEATHER_MOD_LABELS = {
    rainy: '雨天：概率+15%',
    stormy: '雷雨：概率-20%',
    snowy: '雪天：概率-10%',
    windy: '大风：概率+10%',
    green_rain: '绿雨：概率+50%'
};
const weatherModLabel = computed(() => WEATHER_MOD_LABELS[gameStore.weather] ?? '');
const hasHerbalistPerk = computed(() => foragingSkill.value.perk5 === 'herbalist');
const hasLumberjackPerk = computed(() => foragingSkill.value.perk5 === 'lumberjack' || foragingSkill.value.perk10 === 'forester');
const isForestFarm = computed(() => gameStore.farmMapType === 'forest');
const cookingLuckBuff = computed(() => (cookingStore.activeBuff?.type === 'luck' ? cookingStore.activeBuff.value : 0));
const handleForage = () => {
    if (gameStore.isPastBedtime) {
        addLog('太晚了，没法采集了。');
        handleEndDay();
        return;
    }
    if (!inventoryStore.isToolAvailable('axe')) {
        addLog('斧头正在升级中，无法采集。');
        return;
    }
    const cost = forageCost.value;
    if (!playerStore.consumeStamina(cost)) {
        addLog('体力不足，无法采集。');
        return;
    }
    sfxForage();
    const items = currentForage.value;
    const gathered = [];
    const skill = foragingSkill.value;
    const forestFarm = isForestFarm.value;
    const forestXpBonus = forestFarm ? 1.25 : 1.0;
    const hiddenNpcStore = useHiddenNpcStore();
    const herbDouble = hiddenNpcStore.isAbilityActive('yue_tu_1');
    const moonHerbChance = hiddenNpcStore.isAbilityActive('yue_tu_3');
    for (const item of items) {
        const herbalistBonus = skill.perk5 === 'herbalist' ? 1.2 : 1.0;
        const cookingBuff = cookingStore.activeBuff?.type === 'luck' ? cookingStore.activeBuff.value / 100 : 0;
        const adjustedChance = Math.min(1, item.chance * (WEATHER_FORAGE_MODIFIER[gameStore.weather] ?? 1) * herbalistBonus * (1 + cookingBuff));
        if (Math.random() < adjustedChance) {
            const forageAllSkillsBuff = cookingStore.activeBuff?.type === 'all_skills' ? cookingStore.activeBuff.value : 0;
            let quality = skillStore.rollForageQuality(forageAllSkillsBuff);
            const walletBoost = walletStore.getForageQualityBoost();
            if (walletBoost > 0) {
                const qualityOrder = ['normal', 'fine', 'excellent', 'supreme'];
                const idx = qualityOrder.indexOf(quality);
                const newIdx = Math.min(idx + walletBoost, qualityOrder.length - 1);
                quality = qualityOrder[newIdx];
            }
            const qty = forestFarm && Math.random() < 0.2 ? 2 : 1;
            // 仙缘能力：药知（yue_tu_1）草药采集双倍
            const finalQty = herbDouble && (item.itemId === 'herb' || item.itemId === 'ginseng') ? qty * 2 : qty;
            inventoryStore.addItem(item.itemId, finalQty, quality);
            achievementStore.discoverItem(item.itemId);
            useQuestStore().onItemObtained(item.itemId, finalQty);
            const itemDef = getItemById(item.itemId);
            const name = itemDef?.name ?? item.itemId;
            gathered.push({ label: `获得了${finalQty > 1 ? `${name}×${finalQty}` : name}`, itemId: item.itemId, quantity: finalQty, quality });
            skillStore.addExp('foraging', Math.floor(item.expReward * forestXpBonus));
        }
    }
    if (skill.perk10 === 'forester') {
        inventoryStore.addItem('wood');
        gathered.push({ label: '获得了木材', itemId: 'wood', quantity: 1 });
    }
    else if (skill.perk5 === 'lumberjack' && Math.random() < 0.25) {
        inventoryStore.addItem('wood');
        gathered.push({ label: '获得了木材', itemId: 'wood', quantity: 1 });
    }
    if (skill.perk10 === 'tracker' && items.length > 0) {
        const randomItem = items[Math.floor(Math.random() * items.length)];
        const trackerAllSkillsBuff = cookingStore.activeBuff?.type === 'all_skills' ? cookingStore.activeBuff.value : 0;
        const quality = skillStore.rollForageQuality(trackerAllSkillsBuff);
        inventoryStore.addItem(randomItem.itemId, 1, quality);
        achievementStore.discoverItem(randomItem.itemId);
        const itemDef = getItemById(randomItem.itemId);
        const name = itemDef?.name ?? randomItem.itemId;
        gathered.push({ label: `获得了${name}`, itemId: randomItem.itemId, quantity: 1, quality });
    }
    // 仙缘能力：月华（yue_tu_3）采集8%概率获得月草
    if (moonHerbChance && Math.random() < 0.08) {
        inventoryStore.addItem('moon_herb', 1);
        achievementStore.discoverItem('moon_herb');
        gathered.push({ label: '获得了月草', itemId: 'moon_herb', quantity: 1 });
        skillStore.addExp('foraging', 15);
    }
    if (gathered.length === 0) {
        gathered.push({ label: '什么也没找到……', quantity: 0 });
    }
    lastResults.value = gathered;
    const { leveledUp, newLevel } = skillStore.addExp('foraging', 0);
    const names = gathered
        .filter(g => g.itemId)
        .map(g => {
        const def = getItemById(g.itemId);
        const name = def?.name ?? g.itemId;
        return g.quantity > 1 ? `${name}×${g.quantity}` : name;
    });
    let msg = `在竹林中采集，获得了${names.join('、') || '空气'}。(-${cost}体力)`;
    if (leveledUp)
        msg += ` 采集提升到${newLevel}级！`;
    addLog(msg);
    const tr = gameStore.advanceTime(forageTime.value);
    if (tr.message)
        addLog(tr.message);
    if (tr.passedOut) {
        handleEndDay();
        return;
    }
    // 动物遭遇判定
    if (Math.random() < FOREST_ENCOUNTER_CHANCE) {
        const enc = rollForestEncounter(gameStore.season);
        if (enc) {
            if (enc.type === 'friendly') {
                encounter.value = enc;
            }
            else {
                encounter.value = enc;
                startForestCombat(enc.monster);
            }
        }
    }
};
// ===== 动物遭遇 =====
const encounter = ref(null);
// --- 温和动物 ---
const handleFriendlyCollect = () => {
    if (!encounter.value || encounter.value.type !== 'friendly')
        return;
    const animal = encounter.value.animal;
    const forageAllSkillsBuff = cookingStore.activeBuff?.type === 'all_skills' ? cookingStore.activeBuff.value : 0;
    let quality = skillStore.rollForageQuality(forageAllSkillsBuff);
    const walletBoost = walletStore.getForageQualityBoost();
    if (walletBoost > 0) {
        const qualityOrder = ['normal', 'fine', 'excellent', 'supreme'];
        const idx = qualityOrder.indexOf(quality);
        const newIdx = Math.min(idx + walletBoost, qualityOrder.length - 1);
        quality = qualityOrder[newIdx];
    }
    inventoryStore.addItem(animal.productItemId, 1, quality);
    achievementStore.discoverItem(animal.productItemId);
    useQuestStore().onItemObtained(animal.productItemId, 1);
    const { leveledUp, newLevel } = skillStore.addExp('foraging', animal.collectExp);
    const itemDef = getItemById(animal.productItemId);
    const qLabel = quality !== 'normal' ? `(${QUALITY_NAMES[quality]})` : '';
    lastResults.value.push({
        label: `从${animal.name}处获得了${itemDef?.name ?? animal.productItemId}${qLabel}`,
        itemId: animal.productItemId,
        quantity: 1,
        quality
    });
    let msg = `在竹林遇到${animal.name}，收集到了${itemDef?.name ?? animal.productItemId}${qLabel}！`;
    if (leveledUp)
        msg += ` 采集提升到${newLevel}级！`;
    addLog(msg);
    encounter.value = null;
};
const handleFriendlyChase = () => {
    if (!encounter.value || encounter.value.type !== 'friendly')
        return;
    const animal = encounter.value.animal;
    const { leveledUp, newLevel } = skillStore.addExp('foraging', animal.chaseExp);
    lastResults.value.push({ label: `驱赶了${animal.name}（+${animal.chaseExp}经验）`, quantity: 0 });
    let msg = `在竹林遇到${animal.name}，将其驱赶了。（+${animal.chaseExp}采集经验）`;
    if (leveledUp)
        msg += ` 采集提升到${newLevel}级！`;
    addLog(msg);
    encounter.value = null;
};
// --- 野兽战斗 ---
const miningStore = useMiningStore();
const inForestCombat = ref(false);
const forestCombatMonster = ref(null);
const forestCombatMonsterHp = ref(0);
const forestCombatLog = ref([]);
const forestCombatRound = ref(0);
const forestCombatAnimLock = ref(false);
const forestWeaponAttack = computed(() => {
    const cookingAllSkillsBuff = cookingStore.activeBuff?.type === 'all_skills' ? cookingStore.activeBuff.value : 0;
    const ringAttackBonus = inventoryStore.getRingEffectValue('attack_bonus');
    return (inventoryStore.getWeaponAttack() +
        (skillStore.combatLevel + cookingAllSkillsBuff) * 2 +
        ringAttackBonus +
        miningStore.guildBadgeBonusAttack);
});
const startForestCombat = (monster) => {
    inForestCombat.value = true;
    forestCombatMonster.value = monster;
    forestCombatMonsterHp.value = monster.hp;
    forestCombatLog.value = [`${monster.name}挡住了去路！`];
    forestCombatRound.value = 0;
};
const handleForestCombat = (action) => {
    if (!inForestCombat.value || !forestCombatMonster.value)
        return;
    forestCombatRound.value++;
    const monster = forestCombatMonster.value;
    // 逃跑 —— 竹林100%成功
    if (action === 'flee') {
        forestCombatLog.value.push('你转身逃离了！');
        addLog(`在竹林遭遇${monster.name}，你选择了逃跑。`);
        endForestCombat(false);
        return;
    }
    // 防御
    if (action === 'defend') {
        const tankReduction = skillStore.getSkill('combat').perk10 === 'tank' ? 0.7 : 0.6;
        const cookingDefBuff = cookingStore.activeBuff?.type === 'defense' ? cookingStore.activeBuff.value / 100 : 0;
        const ringDefenseBonus = inventoryStore.getRingEffectValue('defense_bonus');
        const damage = Math.max(1, Math.floor(monster.attack * (1 - tankReduction) * (1 - cookingDefBuff) * (1 - ringDefenseBonus) * (1 - miningStore.guildBonusDefense)));
        playerStore.takeDamage(damage);
        let defendMsg = `你举盾防御，受到${damage}点伤害。`;
        if (skillStore.getSkill('combat').perk5 === 'defender') {
            playerStore.restoreHealth(5);
            defendMsg += '（守护者回复5HP）';
        }
        forestCombatLog.value.push(defendMsg);
        if (playerStore.hp <= 0) {
            handleForestDefeat();
            return;
        }
        return;
    }
    // 攻击
    const owned = inventoryStore.getEquippedWeapon();
    const weaponDef = getWeaponById(owned.defId);
    const enchant = owned.enchantmentId ? getEnchantmentById(owned.enchantmentId) : null;
    const cookingAllSkillsBuff = cookingStore.activeBuff?.type === 'all_skills' ? cookingStore.activeBuff.value : 0;
    const ringAttackBonus = inventoryStore.getRingEffectValue('attack_bonus');
    const baseAttack = inventoryStore.getWeaponAttack() +
        (skillStore.combatLevel + cookingAllSkillsBuff) * 2 +
        ringAttackBonus +
        miningStore.guildBadgeBonusAttack;
    // 暴击
    const critChance = (weaponDef?.critRate ?? 0.05) + (enchant?.critBonus ?? 0);
    const isCrit = Math.random() < critChance;
    const critMultiplier = isCrit ? 2.0 : 1.0;
    const bruteBonus = skillStore.getSkill('combat').perk10 === 'brute' ? 1.25 : 1.0;
    const playerDmg = Math.max(1, Math.floor(baseAttack * critMultiplier * bruteBonus) - monster.defense);
    forestCombatMonsterHp.value -= playerDmg;
    let atkMsg = isCrit ? `暴击！对${monster.name}造成${playerDmg}点伤害！` : `对${monster.name}造成${playerDmg}点伤害。`;
    // 吸血附魔
    if (enchant?.special === 'vampiric' && isCrit) {
        const heal = Math.floor(playerDmg * 0.2);
        playerStore.restoreHealth(heal);
        atkMsg += ` 吸血恢复${heal}HP。`;
    }
    forestCombatLog.value.push(atkMsg);
    // 检查野兽死亡
    if (forestCombatMonsterHp.value <= 0) {
        handleForestVictory();
        return;
    }
    // 野兽反击
    const fighterReduction = skillStore.getSkill('combat').perk5 === 'fighter' ? 0.85 : 1.0;
    const ringDefenseBonus = inventoryStore.getRingEffectValue('defense_bonus');
    const monsterDmg = Math.max(1, Math.floor(monster.attack * fighterReduction * (1 - ringDefenseBonus) * (1 - miningStore.guildBonusDefense)));
    playerStore.takeDamage(monsterDmg);
    forestCombatLog.value.push(`${monster.name}反击，造成${monsterDmg}点伤害！`);
    // 杂技师反击
    if (skillStore.getSkill('combat').perk10 === 'acrobat' && Math.random() < 0.25) {
        const counterDmg = Math.floor(monsterDmg * 0.5);
        forestCombatMonsterHp.value -= counterDmg;
        forestCombatLog.value.push(`杂技师闪避反击！造成${counterDmg}点伤害！`);
        if (forestCombatMonsterHp.value <= 0) {
            handleForestVictory();
            return;
        }
    }
    if (playerStore.hp <= 0) {
        handleForestDefeat();
    }
};
const handleForestVictory = () => {
    const monster = forestCombatMonster.value;
    forestCombatLog.value.push(`你击败了${monster.name}！`);
    // 掉落物
    const drops = [];
    const dropRateBonus = miningStore.guildBonusDropRate;
    for (const drop of monster.drops) {
        if (Math.random() < drop.chance + dropRateBonus) {
            inventoryStore.addItem(drop.itemId);
            achievementStore.discoverItem(drop.itemId);
            const itemDef = getItemById(drop.itemId);
            drops.push(itemDef?.name ?? drop.itemId);
        }
    }
    // 战斗经验
    const { leveledUp, newLevel } = skillStore.addExp('combat', monster.expReward);
    let msg = `在竹林击败了${monster.name}！`;
    if (drops.length > 0)
        msg += ` 获得了${drops.join('、')}。`;
    msg += ` (+${monster.expReward}战斗经验)`;
    if (leveledUp)
        msg += ` 战斗提升到${newLevel}级！`;
    addLog(msg);
    // 延迟关闭让玩家看到结果
    forestCombatAnimLock.value = true;
    setTimeout(() => {
        endForestCombat(false);
    }, 1200);
};
const handleForestDefeat = () => {
    const monster = forestCombatMonster.value;
    forestCombatLog.value.push(`你被${monster.name}击败了……`);
    // 惩罚：损失金钱
    const moneyLoss = Math.min(Math.floor(playerStore.money * FOREST_DEFEAT_MONEY_PENALTY_RATE), FOREST_DEFEAT_MONEY_PENALTY_CAP);
    if (moneyLoss > 0)
        playerStore.spendMoney(moneyLoss);
    // 清空本次采集结果
    lastResults.value = [{ label: `被${monster.name}击败，采集物散落一地……`, quantity: 0 }];
    // HP恢复50%
    playerStore.restoreHealth(Math.floor(playerStore.getMaxHp() * 0.5));
    let msg = `在竹林被${monster.name}击败了……`;
    if (moneyLoss > 0)
        msg += ` 丢失了${moneyLoss}文。`;
    msg += ' 采集物全部散落。';
    addLog(msg);
    forestCombatAnimLock.value = true;
    setTimeout(() => {
        endForestCombat(false);
    }, 1200);
};
const endForestCombat = (_won) => {
    inForestCombat.value = false;
    forestCombatMonster.value = null;
    forestCombatMonsterHp.value = 0;
    forestCombatLog.value = [];
    forestCombatRound.value = 0;
    forestCombatAnimLock.value = false;
    encounter.value = null;
};
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "text-accent text-sm mb-3" },
});
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.TreePine} */
TreePine;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    size: (14),
    ...{ class: "inline" },
}));
const __VLS_2 = __VLS_1({
    size: (14),
    ...{ class: "inline" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['inline']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "border border-accent/20 rounded-xs p-3 mb-4" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center justify-between mb-2" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-sm text-accent" },
});
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
(__VLS_ctx.forageCost);
(__VLS_ctx.forageTimeLabel);
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-muted mb-2" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.handleForage) },
    ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5" },
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
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
(__VLS_ctx.playerStore.stamina);
(__VLS_ctx.playerStore.maxStamina);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex flex-wrap space-x-3 mt-2" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
if (__VLS_ctx.weatherMod !== 1) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px]" },
        ...{ class: (__VLS_ctx.weatherMod > 1 ? 'text-success' : 'text-danger') },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    (__VLS_ctx.weatherModLabel);
}
if (__VLS_ctx.hasHerbalistPerk) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-success" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
}
if (__VLS_ctx.hasLumberjackPerk) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-success" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    (__VLS_ctx.foragingSkill.perk10 === 'forester' ? '伐木工：必得木材' : '樵夫：25%额外木材');
}
if (__VLS_ctx.foragingSkill.perk10 === 'tracker') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-success" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
}
if (__VLS_ctx.cookingLuckBuff > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-success" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    (__VLS_ctx.cookingLuckBuff);
}
if (__VLS_ctx.isForestFarm) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-success" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "border border-accent/20 rounded-xs p-3 mb-4" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-sm text-accent mb-2" },
});
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
let __VLS_5;
/** @ts-ignore @type { | typeof __VLS_components.Search} */
Search;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    size: (14),
    ...{ class: "inline" },
}));
const __VLS_7 = __VLS_6({
    size: (14),
    ...{ class: "inline" },
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
/** @type {__VLS_StyleScopedClasses['inline']} */ ;
if (__VLS_ctx.lastResults.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    for (const [r, i] of __VLS_vFor((__VLS_ctx.lastResults))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.lastResults.length > 0))
                        throw 0;
                    return r.itemId && (__VLS_ctx.selectedResult = r);
                    // @ts-ignore
                    [forageCost, forageTimeLabel, handleForage, playerStore, playerStore, weatherMod, weatherMod, weatherModLabel, hasHerbalistPerk, hasLumberjackPerk, foragingSkill, foragingSkill, cookingLuckBuff, cookingLuckBuff, isForestFarm, lastResults, lastResults, selectedResult,];
                } },
            key: (i),
            ...{ class: "flex items-center justify-between border border-accent/10 rounded-xs px-3 py-1.5" },
            ...{ class: (r.itemId ? 'cursor-pointer hover:bg-accent/5' : '') },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
            ...{ class: (r.quality ? __VLS_ctx.QUALITY_COLORS[r.quality] : '') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (r.label);
        if (r.itemId) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted/50" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
        }
        // @ts-ignore
        [QUALITY_COLORS,];
    }
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col items-center justify-center py-6 text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    let __VLS_10;
    /** @ts-ignore @type { | typeof __VLS_components.Search} */
    Search;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
        size: (32),
        ...{ class: "mb-2" },
    }));
    const __VLS_12 = __VLS_11({
        size: (32),
        ...{ class: "mb-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
}
let __VLS_15;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent1(__VLS_15, new __VLS_15({
    name: "panel-fade",
}));
const __VLS_17 = __VLS_16({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
const { default: __VLS_20 } = __VLS_18.slots;
if (__VLS_ctx.selectedResult && __VLS_ctx.selectedResultDef) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedResult && __VLS_ctx.selectedResultDef))
                    throw 0;
                return __VLS_ctx.selectedResult = null;
                // @ts-ignore
                [selectedResult, selectedResult, selectedResultDef,];
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
                if (!(__VLS_ctx.selectedResult && __VLS_ctx.selectedResultDef))
                    throw 0;
                return __VLS_ctx.selectedResult = null;
                // @ts-ignore
                [selectedResult,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_21;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
        size: (14),
    }));
    const __VLS_23 = __VLS_22({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_22));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm mb-2" },
        ...{ class: (__VLS_ctx.selectedResult.quality ? __VLS_ctx.QUALITY_COLORS[__VLS_ctx.selectedResult.quality] : 'text-accent') },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.selectedResultDef.name);
    if (__VLS_ctx.selectedResult.quantity > 1) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.selectedResult.quantity);
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
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.selectedResultDef.description);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
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
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.CATEGORY_NAMES[__VLS_ctx.selectedResultDef.category] ?? __VLS_ctx.selectedResultDef.category);
    if (__VLS_ctx.selectedResult.quality && __VLS_ctx.selectedResult.quality !== 'normal') {
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
            ...{ class: (__VLS_ctx.QUALITY_COLORS[__VLS_ctx.selectedResult.quality]) },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.QUALITY_NAMES[__VLS_ctx.selectedResult.quality]);
    }
    if (__VLS_ctx.selectedResultDef.sellPrice > 0) {
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
            ...{ class: "text-xs text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        (__VLS_ctx.selectedResultDef.sellPrice);
    }
    if (__VLS_ctx.selectedResultDef.edible) {
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
            ...{ class: "text-xs text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        (__VLS_ctx.selectedResultDef.staminaRestore ? `体力+${__VLS_ctx.selectedResultDef.staminaRestore}` : '');
        (__VLS_ctx.selectedResultDef.healthRestore ? `HP+${__VLS_ctx.selectedResultDef.healthRestore}` : '');
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
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.getItemSource(__VLS_ctx.selectedResult.itemId));
}
// @ts-ignore
[selectedResult, selectedResult, selectedResult, selectedResult, selectedResult, selectedResult, selectedResult, selectedResult, selectedResult, QUALITY_COLORS, QUALITY_COLORS, selectedResultDef, selectedResultDef, selectedResultDef, selectedResultDef, selectedResultDef, selectedResultDef, selectedResultDef, selectedResultDef, selectedResultDef, selectedResultDef, selectedResultDef, CATEGORY_NAMES, QUALITY_NAMES, getItemSource,];
var __VLS_18;
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
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-sm text-accent" },
});
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
(__VLS_ctx.SEASON_NAMES[__VLS_ctx.gameStore.season]);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex flex-col space-y-1" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
for (const [item] of __VLS_vFor((__VLS_ctx.currentForage))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (item.itemId),
        ...{ class: "flex items-center justify-between border border-accent/10 rounded-xs px-3 py-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (item.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted ml-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
    (item.expReward);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (Math.round(item.chance * 100));
    // @ts-ignore
    [SEASON_NAMES, gameStore, currentForage,];
}
let __VLS_26;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
    name: "panel-fade",
}));
const __VLS_28 = __VLS_27({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
const { default: __VLS_31 } = __VLS_29.slots;
if (__VLS_ctx.encounter && __VLS_ctx.encounter.type === 'friendly') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
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
        ...{ class: "game-panel max-w-xs w-full" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.encounter.animal.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    (__VLS_ctx.encounter.animal.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (__VLS_ctx.handleFriendlyCollect) },
        ...{ class: "flex items-center justify-between border border-success/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-success/5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-success/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-success/5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-success" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.encounter.animal.collectExp);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (__VLS_ctx.handleFriendlyChase) },
        ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5" },
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.encounter.animal.chaseExp);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.encounter && __VLS_ctx.encounter.type === 'friendly'))
                    throw 0;
                return __VLS_ctx.encounter = null;
                // @ts-ignore
                [encounter, encounter, encounter, encounter, encounter, encounter, encounter, handleFriendlyCollect, handleFriendlyChase,];
            } },
        ...{ class: "flex items-center justify-between border border-accent/10 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
}
// @ts-ignore
[];
var __VLS_29;
let __VLS_32;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent1(__VLS_32, new __VLS_32({
    name: "panel-fade",
}));
const __VLS_34 = __VLS_33({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
const { default: __VLS_37 } = __VLS_35.slots;
if (__VLS_ctx.inForestCombat && __VLS_ctx.forestCombatMonster) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
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
        ...{ class: "game-panel max-w-xs w-full" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-danger mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.forestCombatMonster.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-[1fr_auto_1fr] mb-3 items-center" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-[1fr_auto_1fr]']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-center mb-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "bg-bg rounded-xs h-1.5 mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "h-1.5 rounded-xs transition-all" },
        ...{ class: (__VLS_ctx.playerStore.getIsLowHp() ? 'bg-danger' : 'bg-success') },
        ...{ style: ({ width: `${__VLS_ctx.playerStore.getHpPercent()}%` }) },
    });
    /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-[10px]" },
        ...{ class: (__VLS_ctx.playerStore.getIsLowHp() ? 'text-danger' : 'text-muted') },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    (__VLS_ctx.playerStore.hp);
    (__VLS_ctx.playerStore.getMaxHp());
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted/40" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-danger/20 rounded-xs p-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-danger/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-center text-danger mb-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
    (__VLS_ctx.forestCombatMonster.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "bg-bg rounded-xs h-1.5 mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "h-1.5 bg-danger rounded-xs transition-all" },
        ...{ style: ({ width: `${(__VLS_ctx.forestCombatMonsterHp / __VLS_ctx.forestCombatMonster.hp) * 100}%` }) },
    });
    /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-[10px] text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.forestCombatMonsterHp);
    (__VLS_ctx.forestCombatMonster.hp);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-3 mb-3" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.inForestCombat && __VLS_ctx.forestCombatMonster))
                    throw 0;
                return !__VLS_ctx.forestCombatAnimLock && __VLS_ctx.handleForestCombat('attack');
                // @ts-ignore
                [playerStore, playerStore, playerStore, playerStore, playerStore, inForestCombat, forestCombatMonster, forestCombatMonster, forestCombatMonster, forestCombatMonster, forestCombatMonster, forestCombatMonsterHp, forestCombatMonsterHp, forestCombatAnimLock, handleForestCombat,];
            } },
        ...{ class: "flex flex-col items-center border border-accent/20 rounded-xs py-1.5" },
        ...{ class: (__VLS_ctx.forestCombatAnimLock ? 'opacity-50' : 'cursor-pointer hover:bg-accent/5') },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    let __VLS_38;
    /** @ts-ignore @type { | typeof __VLS_components.Swords} */
    Swords;
    // @ts-ignore
    const __VLS_39 = __VLS_asFunctionalComponent1(__VLS_38, new __VLS_38({
        size: (12),
        ...{ class: "inline" },
    }));
    const __VLS_40 = __VLS_39({
        size: (12),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_39));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.forestWeaponAttack);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.inForestCombat && __VLS_ctx.forestCombatMonster))
                    throw 0;
                return !__VLS_ctx.forestCombatAnimLock && __VLS_ctx.handleForestCombat('defend');
                // @ts-ignore
                [forestCombatAnimLock, forestCombatAnimLock, handleForestCombat, forestWeaponAttack,];
            } },
        ...{ class: "flex flex-col items-center border border-accent/20 rounded-xs py-1.5" },
        ...{ class: (__VLS_ctx.forestCombatAnimLock ? 'opacity-50' : 'cursor-pointer hover:bg-accent/5') },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    let __VLS_43;
    /** @ts-ignore @type { | typeof __VLS_components.Shield} */
    Shield;
    // @ts-ignore
    const __VLS_44 = __VLS_asFunctionalComponent1(__VLS_43, new __VLS_43({
        size: (12),
        ...{ class: "inline" },
    }));
    const __VLS_45 = __VLS_44({
        size: (12),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.inForestCombat && __VLS_ctx.forestCombatMonster))
                    throw 0;
                return !__VLS_ctx.forestCombatAnimLock && __VLS_ctx.handleForestCombat('flee');
                // @ts-ignore
                [forestCombatAnimLock, forestCombatAnimLock, handleForestCombat,];
            } },
        ...{ class: "flex flex-col items-center border border-danger/20 rounded-xs py-1.5 cursor-pointer hover:bg-danger/5" },
        ...{ class: (__VLS_ctx.forestCombatAnimLock ? 'opacity-50' : '') },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-danger/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-danger/5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-danger" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    let __VLS_48;
    /** @ts-ignore @type { | typeof __VLS_components.MoveRight} */
    MoveRight;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent1(__VLS_48, new __VLS_48({
        size: (12),
        ...{ class: "inline" },
    }));
    const __VLS_50 = __VLS_49({
        size: (12),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-xs space-y-0.5 max-h-28 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-28']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    for (const [msg, i] of __VLS_vFor((__VLS_ctx.forestCombatLog))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            key: (i),
            ...{ class: (i < __VLS_ctx.forestCombatLog.length - 1 ? 'text-muted' : 'text-text') },
        });
        (msg);
        // @ts-ignore
        [forestCombatAnimLock, forestCombatLog, forestCombatLog,];
    }
}
// @ts-ignore
[];
var __VLS_35;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
