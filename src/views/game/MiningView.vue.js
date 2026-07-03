/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import { Mountain, Pickaxe, Zap, ChevronDown, LogOut, Swords, Shield, MoveRight, Skull, X, Map, Backpack, Lock, BookMarked, Check } from 'lucide-vue-next';
import Button from '@/components/game/Button.vue';
import { useAchievementStore } from '@/stores/useAchievementStore';
import { useGameStore } from '@/stores/useGameStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useMiningStore } from '@/stores/useMiningStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSkillStore } from '@/stores/useSkillStore';
import { useTutorialStore } from '@/stores/useTutorialStore';
import { ZONE_NAMES, getFloor, BOSS_MONSTERS } from '@/data';
import { getWeaponById, getEnchantmentById, getWeaponDisplayName, WEAPON_TYPE_NAMES } from '@/data/weapons';
import { getRingById, getHatById, getShoeById } from '@/data';
import { ACTION_TIME_COSTS } from '@/data/timeConstants';
import { BOMBS } from '@/data/processing';
import { getItemById } from '@/data/items';
import { sfxMine, sfxAttack, sfxHurt, sfxClick, sfxEncounter, sfxDefend, sfxFlee, sfxVictory } from '@/composables/useAudio';
import { useAudio } from '@/composables/useAudio';
import { addLog } from '@/composables/useGameLog';
import { handleEndDay } from '@/composables/useEndDay';
const miningStore = useMiningStore();
const gameStore = useGameStore();
const playerStore = usePlayerStore();
const inventoryStore = useInventoryStore();
const skillStore = useSkillStore();
const achievementStore = useAchievementStore();
const tutorialStore = useTutorialStore();
const { startBattleBgm, resumeNormalBgm } = useAudio();
const tutorialHint = computed(() => {
    if (!tutorialStore.enabled || gameStore.year > 1)
        return null;
    if (achievementStore.stats.highestMineFloor === 0)
        return '矿洞是6x6的网格，点击格子探索。遇到矿石可以开采，遇到怪物需要战斗。找到楼梯可下一层。';
    return null;
});
const exploreLog = ref([]);
const showMapModal = ref(false);
const showElevatorModal = ref(false);
/** 炸弹模式 */
const bombModeId = ref(null);
/** 战斗道具面板 */
const showCombatItems = ref(false);
/** 道具使用确认 */
const BATCH_USABLE_ITEMS = new Set(['guild_badge', 'life_talisman', 'lucky_coin', 'defense_charm']);
const pendingItemId = ref(null);
const pendingUseQty = ref(1);
const pendingItem = computed(() => {
    if (!pendingItemId.value)
        return null;
    return availableCombatItems.value.find(i => i.itemId === pendingItemId.value) ?? null;
});
const pendingCanBatch = computed(() => pendingItemId.value !== null && BATCH_USABLE_ITEMS.has(pendingItemId.value));
const addUseQty = (delta) => {
    const max = pendingItem.value?.count ?? 1;
    pendingUseQty.value = Math.max(1, Math.min(max, pendingUseQty.value + delta));
};
const onUseQtyInput = (e) => {
    const val = parseInt(e.target.value) || 1;
    const max = pendingItem.value?.count ?? 1;
    pendingUseQty.value = Math.max(1, Math.min(max, val));
};
/** 离开矿洞确认 */
const showLeaveConfirm = ref(false);
// 战斗动画状态
const combatAnimLock = ref(false);
const playerAnim = ref('');
const monsterAnim = ref('');
const playerFloat = ref(null);
const monsterFloat = ref(null);
let floatCounter = 0;
const triggerAnim = (target, cls, duration = 400) => {
    if (target === 'player') {
        playerAnim.value = cls;
        setTimeout(() => {
            playerAnim.value = '';
        }, duration);
    }
    else {
        monsterAnim.value = cls;
        setTimeout(() => {
            monsterAnim.value = '';
        }, duration);
    }
};
const showDamageFloat = (target, text) => {
    const obj = { text, key: ++floatCounter };
    if (target === 'player') {
        playerFloat.value = obj;
        setTimeout(() => {
            playerFloat.value = null;
        }, 800);
    }
    else {
        monsterFloat.value = obj;
        setTimeout(() => {
            monsterFloat.value = null;
        }, 800);
    }
};
const parseDamage = (msg) => {
    const dealt = msg.match(/造成(\d+)点伤害/);
    const taken = msg.match(/受到(\d+)点伤害/);
    return {
        dealt: dealt ? parseInt(dealt[1]) : 0,
        taken: taken ? parseInt(taken[1]) : 0,
        isCrit: msg.includes('暴击')
    };
};
const recentLog = computed(() => exploreLog.value.slice(-8));
const activeFloorNum = computed(() => {
    return miningStore.isInSkullCavern ? miningStore.skullCavernFloor : miningStore.currentFloor;
});
const availableBombs = computed(() => {
    return BOMBS.map(b => ({ id: b.id, name: b.name, count: inventoryStore.getItemCount(b.id) })).filter(b => b.count > 0);
});
/** 战斗中可用道具列表 */
const availableCombatItems = computed(() => {
    const items = [];
    // 公会徽章
    const badgeCount = inventoryStore.getItemCount('guild_badge');
    if (badgeCount > 0) {
        items.push({ itemId: 'guild_badge', name: '公会徽章', desc: '攻击力永久+3', count: badgeCount });
    }
    // 生命护符
    const talismanCount = inventoryStore.getItemCount('life_talisman');
    if (talismanCount > 0) {
        items.push({ itemId: 'life_talisman', name: '生命护符', desc: '最大生命值永久+15', count: talismanCount });
    }
    // 幸运铜钱
    const coinCount = inventoryStore.getItemCount('lucky_coin');
    if (coinCount > 0) {
        items.push({ itemId: 'lucky_coin', name: '幸运铜钱', desc: '掉落率永久+5%', count: coinCount });
    }
    // 守护符
    const defenseCharmCount = inventoryStore.getItemCount('defense_charm');
    if (defenseCharmCount > 0) {
        items.push({ itemId: 'defense_charm', name: '守护符', desc: '防御永久+3%', count: defenseCharmCount });
    }
    // 猎魔符
    if (!miningStore.slayerCharmActive) {
        const charmCount = inventoryStore.getItemCount('slayer_charm');
        if (charmCount > 0) {
            items.push({ itemId: 'slayer_charm', name: '猎魔符', desc: '掉落率+20%（本次探索）', count: charmCount });
        }
    }
    // 所有可食用的恢复类道具
    const seen = new Set(['guild_badge', 'slayer_charm', 'monster_lure', 'life_talisman', 'lucky_coin', 'defense_charm']);
    for (const invItem of inventoryStore.items) {
        if (invItem.quantity <= 0 || seen.has(invItem.itemId))
            continue;
        const def = getItemById(invItem.itemId);
        if (!def?.edible)
            continue;
        if (!def.healthRestore && !def.staminaRestore)
            continue;
        seen.add(invItem.itemId);
        const parts = [];
        if (def.healthRestore)
            parts.push(def.healthRestore >= 999 ? 'HP全满' : `HP+${def.healthRestore}`);
        if (def.staminaRestore)
            parts.push(`体力+${def.staminaRestore}`);
        items.push({
            itemId: invItem.itemId,
            name: def.name,
            desc: parts.join('，'),
            count: inventoryStore.getItemCount(invItem.itemId)
        });
    }
    return items;
});
/** 是否有怪物诱饵 */
const hasMonsterLure = computed(() => inventoryStore.getItemCount('monster_lure') > 0);
const zoneName = computed(() => {
    const floor = getFloor(miningStore.currentFloor);
    return floor ? ZONE_NAMES[floor.zone] : '';
});
/** 矿洞地图区域数据 */
const mineZones = computed(() => {
    const zones = [
        { id: 'shallow', name: '浅矿·土石洞穴', start: 1, end: 20, bossFloor: 20 },
        { id: 'frost', name: '冰窟·冰霜暗河', start: 21, end: 40, bossFloor: 40 },
        { id: 'lava', name: '熔岩层·地火暗涌', start: 41, end: 60, bossFloor: 60 },
        { id: 'crystal', name: '晶窟·水晶迷宫', start: 61, end: 80, bossFloor: 80 },
        { id: 'shadow', name: '幽境·暗影裂隙', start: 81, end: 100, bossFloor: 100 },
        { id: 'abyss', name: '深渊·无底深渊', start: 101, end: 120, bossFloor: 120 }
    ];
    const sp = miningStore.safePointFloor;
    return zones.map(z => {
        const reached = sp >= z.start - 1;
        const boss = BOSS_MONSTERS[z.bossFloor];
        const bossDefeated = boss ? miningStore.defeatedBosses.includes(boss.id) : false;
        const progress = Math.min(100, Math.max(0, ((sp - (z.start - 1)) / 20) * 100));
        const isCurrentZone = sp >= z.start - 1 && sp < z.end;
        return {
            ...z,
            reached,
            bossName: boss?.name ?? '???',
            bossDefeated,
            progress: reached ? Math.max(5, progress) : 0,
            isCurrentZone,
            barColor: bossDefeated ? 'bg-success' : isCurrentZone ? 'bg-accent' : reached ? 'bg-accent/50' : 'bg-bg'
        };
    });
});
/** 当前层是否为特殊楼层 */
const currentFloorSpecial = computed(() => {
    const floor = miningStore.getActiveFloorData();
    return floor?.specialType ?? null;
});
/** 感染层剩余怪物 */
const remainingMonsters = computed(() => {
    return miningStore.totalMonstersOnFloor - miningStore.monstersDefeatedCount;
});
/** 是否显示电梯（有可返回楼层或骷髅矿穴已解锁） */
const hasElevator = computed(() => elevatorZones.value.length > 0 || miningStore.isSkullCavernUnlocked());
/** 武器信息 */
const weaponDisplayName = computed(() => {
    const owned = inventoryStore.getEquippedWeapon();
    return getWeaponDisplayName(owned.defId, owned.enchantmentId);
});
const weaponTypeName = computed(() => {
    const owned = inventoryStore.getEquippedWeapon();
    const def = getWeaponById(owned.defId);
    return def ? WEAPON_TYPE_NAMES[def.type] : '未知';
});
const weaponAttack = computed(() => inventoryStore.getWeaponAttack() +
    skillStore.combatLevel * 2 +
    inventoryStore.getRingEffectValue('attack_bonus') +
    miningStore.guildBadgeBonusAttack);
const critRateDisplay = computed(() => `${Math.round((inventoryStore.getWeaponCritRate() + inventoryStore.getRingEffectValue('crit_rate_bonus')) * 100)}%`);
const weaponEnchantName = computed(() => {
    const owned = inventoryStore.getEquippedWeapon();
    if (!owned.enchantmentId)
        return '';
    const enchant = getEnchantmentById(owned.enchantmentId);
    return enchant ? `${enchant.name} - ${enchant.description}` : '';
});
/** 电梯楼层按区域分组 */
const elevatorZones = computed(() => {
    const allSafePoints = miningStore.getUnlockedSafePoints().filter(sp => sp < miningStore.safePointFloor);
    const zones = [
        { name: '浅矿', min: 0, max: 20 },
        { name: '冰窟', min: 21, max: 40 },
        { name: '熔岩', min: 41, max: 60 },
        { name: '晶窟', min: 61, max: 80 },
        { name: '幽境', min: 81, max: 100 },
        { name: '深渊', min: 101, max: 120 }
    ];
    return zones
        .map(z => ({
        name: z.name,
        floors: allSafePoints.filter(sp => sp >= z.min && sp <= z.max)
    }))
        .filter(z => z.floors.length > 0);
});
/** 离开矿洞提示文案 */
const leaveHint = computed(() => {
    if (miningStore.isInSkullCavern) {
        const floorData = miningStore.getActiveFloorData();
        if (floorData?.isSafePoint)
            return `当前为安全点，进度将保存至第${miningStore.skullCavernFloor}层。`;
        const lastSafe = miningStore.skullSafePointFloor;
        return lastSafe > 0 ? `下次将从第${lastSafe + 1}层开始。` : '当前进度不会保留。';
    }
    return '当前进度不会保留。';
});
/** 骷髅矿穴可选安全点楼层（排除最高安全点，因为主按钮已默认从那里开始） */
const skullElevatorFloors = computed(() => {
    return miningStore.getUnlockedSkullSafePoints().filter(sp => sp < miningStore.skullSafePointFloor);
});
// ==================== 格子 UI 辅助 ====================
/** 格子样式 */
const getTileClass = (tile) => {
    if (tile.state === 'hidden') {
        if (bombModeId.value)
            return 'bg-panel/50 border-accent/10 cursor-not-allowed opacity-40';
        if (miningStore.canRevealTile(tile.index))
            return 'bg-panel border-accent/30 hover:border-accent cursor-pointer';
        return 'bg-panel/50 border-accent/10 cursor-not-allowed opacity-40';
    }
    switch (tile.type) {
        case 'empty':
            return 'bg-bg border-accent/10';
        case 'ore':
            return tile.state === 'collected' ? 'bg-bg border-accent/10' : 'bg-accent/20 border-accent/40';
        case 'monster':
            return tile.state === 'defeated' ? 'bg-bg border-accent/10' : 'bg-danger/20 border-danger/40 cursor-pointer';
        case 'boss':
            return tile.state === 'defeated' ? 'bg-bg border-accent/10' : 'bg-danger/30 border-danger/50 cursor-pointer';
        case 'stairs':
            return 'bg-success/20 border-success/40';
        case 'trap':
            return 'bg-danger/10 border-danger/20';
        case 'treasure':
            return tile.state === 'collected' ? 'bg-bg border-accent/10' : 'bg-accent/30 border-accent/50';
        case 'mushroom':
            return tile.state === 'collected' ? 'bg-bg border-accent/10' : 'bg-success/20 border-success/30';
        default:
            return 'bg-bg border-accent/10';
    }
};
/** 格子图标 */
const getTileIcon = (tile) => {
    if (tile.state === 'hidden')
        return '?';
    switch (tile.type) {
        case 'empty':
            return '\u00B7';
        case 'ore':
            return tile.state === 'collected' ? '\u00B7' : '\u25C6';
        case 'monster':
            return tile.state === 'defeated' ? '\u00D7' : '!';
        case 'boss':
            return tile.state === 'defeated' ? '\u00D7' : '\u2620';
        case 'stairs':
            return '\u25BC';
        case 'trap':
            return '\u25B3';
        case 'treasure':
            return tile.state === 'collected' ? '\u00B7' : '\u2605';
        case 'mushroom':
            return tile.state === 'collected' ? '\u00B7' : '\u273F';
        default:
            return '\u00B7';
    }
};
/** 格子是否可点击 */
const isTileClickable = (tile) => {
    if (bombModeId.value) {
        return tile.state !== 'hidden';
    }
    // 已揭示的怪物/BOSS格可以重新交战
    if (tile.state === 'revealed' && (tile.type === 'monster' || tile.type === 'boss') && tile.data?.monster) {
        return true;
    }
    return tile.state === 'hidden' && miningStore.canRevealTile(tile.index);
};
/** 格子点击处理 */
const handleTileClick = (tile) => {
    if (gameStore.isPastBedtime) {
        addLog('太晚了，没法继续探索了。');
        handleEndDay();
        return;
    }
    if (bombModeId.value) {
        const result = miningStore.useBombOnGrid(bombModeId.value, tile.index);
        if (result.success) {
            sfxMine();
            exploreLog.value.push(result.message);
            addLog(result.message);
            const tr = gameStore.advanceTime(ACTION_TIME_COSTS.mineOre);
            if (tr.message)
                addLog(tr.message);
            if (tr.passedOut)
                handleEndDay();
        }
        else {
            exploreLog.value.push(result.message);
        }
        bombModeId.value = null;
        return;
    }
    // 已揭示的怪物/BOSS格：重新交战
    if (tile.state === 'revealed' && (tile.type === 'monster' || tile.type === 'boss') && tile.data?.monster) {
        const result = miningStore.engageRevealedMonster(tile.index);
        if (result.success) {
            exploreLog.value.push(result.message);
            addLog(result.message);
            if (result.startsCombat) {
                startBattleBgm();
                sfxEncounter();
            }
        }
        else {
            exploreLog.value.push(result.message);
            addLog(result.message);
        }
        return;
    }
    const result = miningStore.revealTile(tile.index);
    if (result.success) {
        exploreLog.value.push(result.message);
        addLog(result.message);
        if (result.startsCombat) {
            startBattleBgm();
            sfxEncounter();
            const tr = gameStore.advanceTime(ACTION_TIME_COSTS.combat);
            if (tr.message)
                addLog(tr.message);
            if (tr.passedOut)
                handleEndDay();
        }
        else {
            sfxClick();
            const tr = gameStore.advanceTime(ACTION_TIME_COSTS.revealTile);
            if (tr.message)
                addLog(tr.message);
            if (tr.passedOut)
                handleEndDay();
        }
    }
    else {
        exploreLog.value.push(result.message);
        addLog(result.message);
    }
};
/** 切换炸弹模式 */
const toggleBombMode = (bombId) => {
    bombModeId.value = bombModeId.value === bombId ? null : bombId;
};
// ==================== 事件处理 ====================
const handleEnterMine = (startFrom) => {
    showElevatorModal.value = false;
    showCombatItems.value = false;
    const msg = miningStore.enterMine(startFrom);
    exploreLog.value = [msg];
    sfxClick();
    addLog(msg);
};
const handleEnterSkullCavern = (startFrom) => {
    showElevatorModal.value = false;
    showCombatItems.value = false;
    const msg = miningStore.enterSkullCavern(startFrom);
    exploreLog.value = [msg];
    sfxClick();
    addLog(msg);
};
const handleCombat = (action) => {
    if (combatAnimLock.value)
        return;
    combatAnimLock.value = true;
    const result = miningStore.combatAction(action);
    const { dealt, taken, isCrit } = parseDamage(result.message);
    if (action === 'attack')
        sfxAttack();
    if (action === 'defend')
        sfxDefend();
    if (action === 'flee')
        sfxFlee();
    if (result.message.includes('受到'))
        sfxHurt();
    if (action === 'attack' && dealt > 0) {
        triggerAnim('monster', isCrit ? 'anim-shake-heavy' : 'anim-shake', isCrit ? 400 : 300);
        showDamageFloat('monster', isCrit ? `暴击 -${dealt}` : `-${dealt}`);
    }
    if (action === 'defend') {
        triggerAnim('player', 'anim-flash-defend', 400);
    }
    if (taken > 0) {
        triggerAnim('player', isCrit ? 'anim-shake-heavy anim-flash-red' : 'anim-flash-red', 400);
        showDamageFloat('player', `-${taken}`);
    }
    addLog(result.message);
    if (result.combatOver) {
        if (result.won) {
            sfxVictory();
            triggerAnim('monster', 'anim-victory', 1500);
        }
        resumeNormalBgm();
        showCombatItems.value = false;
        if (!miningStore.isExploring) {
            exploreLog.value.push(result.message);
        }
    }
    setTimeout(() => {
        combatAnimLock.value = false;
    }, 400);
};
const handleConfirmUseItem = () => {
    if (!pendingItemId.value)
        return;
    const result = miningStore.useCombatItem(pendingItemId.value, pendingCanBatch.value ? pendingUseQty.value : 1);
    sfxClick();
    addLog(result.message);
    if (result.success) {
        exploreLog.value.push(result.message);
    }
    pendingItemId.value = null;
};
const handlePendingItem = (itemId) => {
    pendingItemId.value = itemId;
    pendingUseQty.value = 1;
    showCombatItems.value = false;
};
/** 使用怪物诱饵 */
const handleUseMonsterLure = () => {
    const result = miningStore.useMonsterLure();
    sfxClick();
    addLog(result.message);
    if (result.success) {
        exploreLog.value.push(result.message);
    }
};
const handleNextFloor = () => {
    if (gameStore.isPastBedtime) {
        addLog('太晚了，该回去了。');
        handleEndDay();
        return;
    }
    showCombatItems.value = false;
    const result = miningStore.goNextFloor();
    if (result.success) {
        exploreLog.value = [result.message];
        bombModeId.value = null;
    }
    else {
        exploreLog.value.push(result.message);
    }
    addLog(result.message);
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.nextFloor);
    if (tr.message)
        addLog(tr.message);
    if (tr.passedOut)
        handleEndDay();
};
const handleLeave = () => {
    if (miningStore.inCombat)
        resumeNormalBgm();
    showCombatItems.value = false;
    showLeaveConfirm.value = false;
    const msg = miningStore.leaveMine();
    exploreLog.value = [];
    bombModeId.value = null;
    addLog(msg);
};
const confirmLeave = () => {
    handleLeave();
};
// ==================== 快速切装 ====================
const showPresetListModal = ref(false);
const showPresetDetailModal = ref(false);
const detailPresetId = ref(null);
const showEquipPropertyModal = ref(false);
const equipPropertyInfo = ref(null);
const EFFECT_NAMES = {
    attack_bonus: '攻击力',
    crit_rate_bonus: '暴击率',
    defense_bonus: '防御',
    vampiric: '吸血',
    max_hp_bonus: '最大HP',
    stamina_reduction: '体力消耗',
    mining_stamina: '采矿体力',
    farming_stamina: '农作体力',
    fishing_stamina: '钓鱼体力',
    crop_quality_bonus: '作物品质',
    crop_growth_bonus: '作物生长',
    fish_quality_bonus: '鱼类品质',
    fishing_calm: '钓鱼稳定',
    sell_price_bonus: '售价加成',
    shop_discount: '商店折扣',
    gift_friendship: '送礼好感',
    monster_drop_bonus: '掉落率',
    exp_bonus: '经验加成',
    treasure_find: '宝箱概率',
    ore_bonus: '矿石加成',
    luck: '幸运',
    travel_speed: '旅行加速'
};
const PCTG_EFFECTS = new Set([
    'crit_rate_bonus',
    'vampiric',
    'stamina_reduction',
    'mining_stamina',
    'farming_stamina',
    'fishing_stamina',
    'crop_quality_bonus',
    'crop_growth_bonus',
    'fish_quality_bonus',
    'fishing_calm',
    'sell_price_bonus',
    'shop_discount',
    'gift_friendship',
    'monster_drop_bonus',
    'exp_bonus',
    'treasure_find',
    'ore_bonus',
    'luck',
    'travel_speed',
    'defense_bonus'
]);
const fmtEffect = (eff) => {
    if (PCTG_EFFECTS.has(eff.type))
        return `+${Math.round(eff.value * 100)}%`;
    return `+${eff.value}`;
};
const detailPreset = computed(() => {
    if (!detailPresetId.value)
        return null;
    return inventoryStore.equipmentPresets.find(p => p.id === detailPresetId.value) ?? null;
});
const quickApplyPreset = (id) => {
    const result = inventoryStore.applyEquipmentPreset(id);
    addLog(result.message);
    showPresetListModal.value = false;
};
const viewPresetDetail = (id) => {
    detailPresetId.value = id;
    showPresetDetailModal.value = true;
};
const viewEquipProperty = (type, defId) => {
    if (type === 'weapon') {
        const def = getWeaponById(defId);
        if (!def)
            return;
        equipPropertyInfo.value = {
            category: '武器',
            name: def.name,
            description: def.description,
            effects: [
                { label: '攻击力', value: `${def.attack}` },
                { label: '类型', value: WEAPON_TYPE_NAMES[def.type] },
                { label: '暴击率', value: `${Math.round(def.critRate * 100)}%` }
            ]
        };
    }
    else if (type === 'ring') {
        const def = getRingById(defId);
        if (!def)
            return;
        equipPropertyInfo.value = {
            category: '戒指',
            name: def.name,
            description: def.description,
            effects: def.effects.map(e => ({ label: EFFECT_NAMES[e.type], value: fmtEffect(e) }))
        };
    }
    else if (type === 'hat') {
        const def = getHatById(defId);
        if (!def)
            return;
        equipPropertyInfo.value = {
            category: '帽子',
            name: def.name,
            description: def.description,
            effects: def.effects.map(e => ({ label: EFFECT_NAMES[e.type], value: fmtEffect(e) }))
        };
    }
    else {
        const def = getShoeById(defId);
        if (!def)
            return;
        equipPropertyInfo.value = {
            category: '鞋子',
            name: def.name,
            description: def.description,
            effects: def.effects.map(e => ({ label: EFFECT_NAMES[e.type], value: fmtEffect(e) }))
        };
    }
    showEquipPropertyModal.value = true;
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
    ...{ class: "flex items-center justify-between mb-3" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "text-accent text-sm" },
});
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.Mountain} */
Mountain;
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
(__VLS_ctx.miningStore.isInSkullCavern ? '骷髅矿穴' : '云隐矿洞');
const __VLS_5 = Button;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    ...{ 'onClick': {} },
    ...{ class: "py-0 px-1" },
    icon: (Map),
}));
const __VLS_7 = __VLS_6({
    ...{ 'onClick': {} },
    ...{ class: "py-0 px-1" },
    icon: (Map),
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
let __VLS_10;
const __VLS_11 = {
    /** @type {typeof __VLS_10.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.showMapModal = true;
        // @ts-ignore
        [miningStore, showMapModal,];
    },
};
/** @type {__VLS_StyleScopedClasses['py-0']} */ ;
/** @type {__VLS_StyleScopedClasses['px-1']} */ ;
var __VLS_8;
var __VLS_9;
if (__VLS_ctx.tutorialHint) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-[10px] text-muted/50 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.tutorialHint);
}
if (__VLS_ctx.miningStore.isSkullCavernUnlocked()) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-3 mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-danger" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    let __VLS_12;
    /** @ts-ignore @type { | typeof __VLS_components.Skull} */
    Skull;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
        size: (14),
        ...{ class: "inline" },
    }));
    const __VLS_14 = __VLS_13({
        size: (14),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    if (__VLS_ctx.miningStore.skullCavernBestFloor > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.miningStore.skullCavernBestFloor);
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted/40" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    if (__VLS_ctx.miningStore.skullSafePointFloor > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        (__VLS_ctx.miningStore.skullSafePointFloor);
    }
}
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
let __VLS_17;
/** @ts-ignore @type { | typeof __VLS_components.Swords} */
Swords;
// @ts-ignore
const __VLS_18 = __VLS_asFunctionalComponent1(__VLS_17, new __VLS_17({
    size: (14),
    ...{ class: "inline" },
}));
const __VLS_19 = __VLS_18({
    size: (14),
    ...{ class: "inline" },
}, ...__VLS_functionalComponentArgsRest(__VLS_18));
/** @type {__VLS_StyleScopedClasses['inline']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex flex-col space-y-1" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
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
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-accent" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
(__VLS_ctx.weaponDisplayName);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
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
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-accent" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
(__VLS_ctx.weaponAttack);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
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
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
(__VLS_ctx.weaponTypeName);
(__VLS_ctx.critRateDisplay);
if (__VLS_ctx.weaponEnchantName) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-success" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    (__VLS_ctx.weaponEnchantName);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
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
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center space-x-2" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "w-20 h-1.5 bg-bg rounded-xs border border-accent/10" },
});
/** @type {__VLS_StyleScopedClasses['w-20']} */ ;
/** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "h-full rounded-xs transition-all" },
    ...{ class: (__VLS_ctx.playerStore.getIsLowHp() ? 'bg-danger' : 'bg-success') },
    ...{ style: ({ width: __VLS_ctx.playerStore.getHpPercent() + '%' }) },
});
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs" },
    ...{ class: (__VLS_ctx.playerStore.getIsLowHp() ? 'text-danger' : 'text-muted') },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
(__VLS_ctx.playerStore.hp);
(__VLS_ctx.playerStore.getMaxHp());
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
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
    ...{ onClick: (...[$event]) => {
            return __VLS_ctx.hasElevator ? (__VLS_ctx.showElevatorModal = true) : __VLS_ctx.handleEnterMine(undefined);
            // @ts-ignore
            [miningStore, miningStore, miningStore, miningStore, miningStore, tutorialHint, tutorialHint, weaponDisplayName, weaponAttack, weaponTypeName, critRateDisplay, weaponEnchantName, weaponEnchantName, playerStore, playerStore, playerStore, playerStore, playerStore, playerStore, playerStore, hasElevator, showElevatorModal, handleEnterMine,];
        } },
    ...{ class: "border border-accent/20 rounded-xs px-3 py-2 mb-4 flex items-center justify-between cursor-pointer hover:bg-accent/5" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center space-x-1.5" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
let __VLS_22;
/** @ts-ignore @type { | typeof __VLS_components.Pickaxe} */
Pickaxe;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent1(__VLS_22, new __VLS_22({
    size: (14),
    ...{ class: "text-accent" },
}));
const __VLS_24 = __VLS_23({
    size: (14),
    ...{ class: "text-accent" },
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-sm text-accent" },
});
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
(__VLS_ctx.miningStore.safePointFloor + 1);
if (__VLS_ctx.miningStore.defeatedBosses.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    let __VLS_27;
    /** @ts-ignore @type { | typeof __VLS_components.Skull} */
    Skull;
    // @ts-ignore
    const __VLS_28 = __VLS_asFunctionalComponent1(__VLS_27, new __VLS_27({
        size: (14),
        ...{ class: "inline" },
    }));
    const __VLS_29 = __VLS_28({
        size: (14),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_28));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    for (const [zone] of __VLS_vFor((__VLS_ctx.mineZones.filter(z => z.bossDefeated)))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (zone.id),
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        (zone.bossName);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (zone.name);
        // @ts-ignore
        [miningStore, miningStore, mineZones,];
    }
}
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
if (__VLS_ctx.showMapModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showMapModal))
                    throw 0;
                return __VLS_ctx.showMapModal = false;
                // @ts-ignore
                [showMapModal, showMapModal,];
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
        ...{ class: "game-panel max-w-xs w-full" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
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
    let __VLS_38;
    /** @ts-ignore @type { | typeof __VLS_components.Map} */
    Map;
    // @ts-ignore
    const __VLS_39 = __VLS_asFunctionalComponent1(__VLS_38, new __VLS_38({
        size: (14),
        ...{ class: "inline" },
    }));
    const __VLS_40 = __VLS_39({
        size: (14),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_39));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    const __VLS_43 = Button;
    // @ts-ignore
    const __VLS_44 = __VLS_asFunctionalComponent1(__VLS_43, new __VLS_43({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }));
    const __VLS_45 = __VLS_44({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
    let __VLS_48;
    const __VLS_49 = {
        /** @type {typeof __VLS_48.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.showMapModal))
                throw 0;
            return __VLS_ctx.showMapModal = false;
            // @ts-ignore
            [showMapModal, X,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
    var __VLS_46;
    var __VLS_47;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.miningStore.safePointFloor > 0 ? `第${__VLS_ctx.miningStore.safePointFloor}层` : '入口');
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
    for (const [zone] of __VLS_vFor((__VLS_ctx.mineZones))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (zone.id),
            ...{ class: "border rounded-xs p-2" },
            ...{ class: (zone.isCurrentZone ? 'border-accent/40' : 'border-accent/10') },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex justify-between items-center text-xs mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: (zone.isCurrentZone ? 'text-accent' : zone.reached ? 'text-text' : 'text-muted/40') },
        });
        (zone.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted ml-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
        (zone.start);
        (zone.end);
        if (zone.bossDefeated) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-success flex items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            let __VLS_50;
            /** @ts-ignore @type { | typeof __VLS_components.Check} */
            Check;
            // @ts-ignore
            const __VLS_51 = __VLS_asFunctionalComponent1(__VLS_50, new __VLS_50({
                size: (12),
                ...{ class: "mr-0.5" },
            }));
            const __VLS_52 = __VLS_51({
                size: (12),
                ...{ class: "mr-0.5" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_51));
            /** @type {__VLS_StyleScopedClasses['mr-0.5']} */ ;
            (zone.bossName);
        }
        else if (zone.reached) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-danger/70" },
            });
            /** @type {__VLS_StyleScopedClasses['text-danger/70']} */ ;
            (zone.bossName);
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-muted/30" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
            let __VLS_55;
            /** @ts-ignore @type { | typeof __VLS_components.Lock} */
            Lock;
            // @ts-ignore
            const __VLS_56 = __VLS_asFunctionalComponent1(__VLS_55, new __VLS_55({
                size: (12),
                ...{ class: "inline" },
            }));
            const __VLS_57 = __VLS_56({
                size: (12),
                ...{ class: "inline" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_56));
            /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "bg-bg rounded-xs h-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "h-1.5 rounded-xs transition-all" },
            ...{ class: (zone.barColor) },
            ...{ style: ({ width: zone.progress + '%' }) },
        });
        /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        // @ts-ignore
        [miningStore, miningStore, mineZones,];
    }
}
// @ts-ignore
[];
var __VLS_35;
let __VLS_60;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent1(__VLS_60, new __VLS_60({
    name: "panel-fade",
}));
const __VLS_62 = __VLS_61({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
const { default: __VLS_65 } = __VLS_63.slots;
if (__VLS_ctx.showElevatorModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showElevatorModal))
                    throw 0;
                return __VLS_ctx.showElevatorModal = false;
                // @ts-ignore
                [showElevatorModal, showElevatorModal,];
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
                if (!(__VLS_ctx.showElevatorModal))
                    throw 0;
                return __VLS_ctx.showElevatorModal = false;
                // @ts-ignore
                [showElevatorModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_66;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_67 = __VLS_asFunctionalComponent1(__VLS_66, new __VLS_66({
        size: (14),
    }));
    const __VLS_68 = __VLS_67({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_67));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    let __VLS_71;
    /** @ts-ignore @type { | typeof __VLS_components.Pickaxe} */
    Pickaxe;
    // @ts-ignore
    const __VLS_72 = __VLS_asFunctionalComponent1(__VLS_71, new __VLS_71({
        size: (14),
        ...{ class: "inline" },
    }));
    const __VLS_73 = __VLS_72({
        size: (14),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_72));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.miningStore.safePointFloor > 0 ? `第${__VLS_ctx.miningStore.safePointFloor}层` : '入口');
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showElevatorModal))
                    throw 0;
                return __VLS_ctx.handleEnterMine(undefined);
                // @ts-ignore
                [miningStore, miningStore, handleEnterMine,];
            } },
        ...{ class: "flex items-center justify-between border border-accent/30 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.miningStore.safePointFloor + 1);
    if (__VLS_ctx.elevatorZones.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "max-h-48 overflow-y-auto mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['max-h-48']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        for (const [zone] of __VLS_vFor((__VLS_ctx.elevatorZones))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (zone.name),
                ...{ class: "mb-2 last:mb-0" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['last:mb-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-muted mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            (zone.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-wrap space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            for (const [sp] of __VLS_vFor((zone.floors))) {
                const __VLS_76 = Button || Button;
                // @ts-ignore
                const __VLS_77 = __VLS_asFunctionalComponent1(__VLS_76, new __VLS_76({
                    ...{ 'onClick': {} },
                    key: (sp),
                    ...{ class: "py-0.5 px-0 min-w-9 justify-center" },
                }));
                const __VLS_78 = __VLS_77({
                    ...{ 'onClick': {} },
                    key: (sp),
                    ...{ class: "py-0.5 px-0 min-w-9 justify-center" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_77));
                let __VLS_81;
                const __VLS_82 = {
                    /** @type {typeof __VLS_81.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.showElevatorModal))
                            throw 0;
                        if (!(__VLS_ctx.elevatorZones.length > 0))
                            throw 0;
                        return __VLS_ctx.handleEnterMine(sp);
                        // @ts-ignore
                        [miningStore, handleEnterMine, elevatorZones, elevatorZones,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['min-w-9']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                const { default: __VLS_83 } = __VLS_79.slots;
                (sp + 1);
                // @ts-ignore
                [];
                var __VLS_79;
                var __VLS_80;
                // @ts-ignore
                [];
            }
            // @ts-ignore
            [];
        }
    }
    if (__VLS_ctx.miningStore.isSkullCavernUnlocked()) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showElevatorModal))
                        throw 0;
                    if (!(__VLS_ctx.miningStore.isSkullCavernUnlocked()))
                        throw 0;
                    return __VLS_ctx.handleEnterSkullCavern(undefined);
                    // @ts-ignore
                    [miningStore, handleEnterSkullCavern,];
                } },
            ...{ class: "flex items-center justify-between border border-danger/30 rounded-xs px-3 py-1.5 mb-2 cursor-pointer hover:bg-danger/5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-danger/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-danger/5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-danger" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        let __VLS_84;
        /** @ts-ignore @type { | typeof __VLS_components.Skull} */
        Skull;
        // @ts-ignore
        const __VLS_85 = __VLS_asFunctionalComponent1(__VLS_84, new __VLS_84({
            size: (12),
            ...{ class: "inline" },
        }));
        const __VLS_86 = __VLS_85({
            size: (12),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_85));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.miningStore.skullSafePointFloor + 1);
        if (__VLS_ctx.skullElevatorFloors.length > 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "max-h-48 overflow-y-auto grid-cols-5 grid m" },
            });
            /** @type {__VLS_StyleScopedClasses['max-h-48']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
            /** @type {__VLS_StyleScopedClasses['grid-cols-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['grid']} */ ;
            /** @type {__VLS_StyleScopedClasses['m']} */ ;
            for (const [sp] of __VLS_vFor((__VLS_ctx.skullElevatorFloors))) {
                const __VLS_89 = Button || Button;
                // @ts-ignore
                const __VLS_90 = __VLS_asFunctionalComponent1(__VLS_89, new __VLS_89({
                    ...{ 'onClick': {} },
                    key: (sp),
                    ...{ class: "py-0.5 px-0 min-w-9 justify-center !border-danger/30 !text-danger mb-1 mr-1" },
                }));
                const __VLS_91 = __VLS_90({
                    ...{ 'onClick': {} },
                    key: (sp),
                    ...{ class: "py-0.5 px-0 min-w-9 justify-center !border-danger/30 !text-danger mb-1 mr-1" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_90));
                let __VLS_94;
                const __VLS_95 = {
                    /** @type {typeof __VLS_94.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.showElevatorModal))
                            throw 0;
                        if (!(__VLS_ctx.miningStore.isSkullCavernUnlocked()))
                            throw 0;
                        if (!(__VLS_ctx.skullElevatorFloors.length > 0))
                            throw 0;
                        return __VLS_ctx.handleEnterSkullCavern(sp);
                        // @ts-ignore
                        [miningStore, handleEnterSkullCavern, skullElevatorFloors, skullElevatorFloors,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['min-w-9']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['!border-danger/30']} */ ;
                /** @type {__VLS_StyleScopedClasses['!text-danger']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                const { default: __VLS_96 } = __VLS_92.slots;
                (sp + 1);
                // @ts-ignore
                [];
                var __VLS_92;
                var __VLS_93;
                // @ts-ignore
                [];
            }
        }
    }
}
// @ts-ignore
[];
var __VLS_63;
let __VLS_97;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_98 = __VLS_asFunctionalComponent1(__VLS_97, new __VLS_97({
    name: "panel-fade",
}));
const __VLS_99 = __VLS_98({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_98));
const { default: __VLS_102 } = __VLS_100.slots;
if (__VLS_ctx.miningStore.isExploring && !__VLS_ctx.miningStore.inCombat) {
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
        ...{ class: "game-panel max-w-sm w-full" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
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
    (__VLS_ctx.activeFloorNum);
    if (!__VLS_ctx.miningStore.isInSkullCavern) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.zoneName);
    }
    if (__VLS_ctx.currentFloorSpecial === 'mushroom') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-success ml-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
    }
    if (__VLS_ctx.currentFloorSpecial === 'treasure') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent ml-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
    }
    if (__VLS_ctx.currentFloorSpecial === 'infested') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-danger ml-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
    }
    if (__VLS_ctx.currentFloorSpecial === 'dark') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted ml-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
    }
    if (__VLS_ctx.currentFloorSpecial === 'boss') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-danger ml-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
    }
    const __VLS_103 = Button;
    // @ts-ignore
    const __VLS_104 = __VLS_asFunctionalComponent1(__VLS_103, new __VLS_103({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }));
    const __VLS_105 = __VLS_104({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_104));
    let __VLS_108;
    const __VLS_109 = {
        /** @type {typeof __VLS_108.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.miningStore.isExploring && !__VLS_ctx.miningStore.inCombat))
                throw 0;
            return __VLS_ctx.showLeaveConfirm = true;
            // @ts-ignore
            [miningStore, miningStore, miningStore, X, activeFloorNum, zoneName, currentFloorSpecial, currentFloorSpecial, currentFloorSpecial, currentFloorSpecial, currentFloorSpecial, showLeaveConfirm,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
    var __VLS_106;
    var __VLS_107;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-xs text-muted mb-2 border-b border-accent/20 pb-2 space-y-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['pb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    let __VLS_110;
    /** @ts-ignore @type { | typeof __VLS_components.Swords} */
    Swords;
    // @ts-ignore
    const __VLS_111 = __VLS_asFunctionalComponent1(__VLS_110, new __VLS_110({
        size: (12),
        ...{ class: "inline" },
    }));
    const __VLS_112 = __VLS_111({
        size: (12),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_111));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    (__VLS_ctx.weaponDisplayName);
    (__VLS_ctx.weaponTypeName);
    (__VLS_ctx.weaponAttack);
    (__VLS_ctx.critRateDisplay);
    if (__VLS_ctx.weaponEnchantName) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        (__VLS_ctx.weaponEnchantName);
    }
    if (__VLS_ctx.currentFloorSpecial === 'infested' && __VLS_ctx.remainingMonsters > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-danger mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.remainingMonsters);
    }
    if (__VLS_ctx.bombModeId) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-xs text-accent mb-2 border border-accent/30 rounded-xs px-2 py-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        let __VLS_115;
        /** @ts-ignore @type { | typeof __VLS_components.Zap} */
        Zap;
        // @ts-ignore
        const __VLS_116 = __VLS_asFunctionalComponent1(__VLS_115, new __VLS_115({
            size: (12),
            ...{ class: "inline" },
        }));
        const __VLS_117 = __VLS_116({
            size: (12),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_116));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.miningStore.isExploring && !__VLS_ctx.miningStore.inCombat))
                        throw 0;
                    if (!(__VLS_ctx.bombModeId))
                        throw 0;
                    return __VLS_ctx.bombModeId = null;
                    // @ts-ignore
                    [weaponDisplayName, weaponAttack, weaponTypeName, critRateDisplay, weaponEnchantName, weaponEnchantName, currentFloorSpecial, remainingMonsters, remainingMonsters, bombModeId, bombModeId,];
                } },
            ...{ class: "text-muted ml-2 underline" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['underline']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-center mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-6 gap-1" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    for (const [tile] of __VLS_vFor((__VLS_ctx.miningStore.floorGrid))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.miningStore.isExploring && !__VLS_ctx.miningStore.inCombat))
                        throw 0;
                    return __VLS_ctx.handleTileClick(tile);
                    // @ts-ignore
                    [miningStore, handleTileClick,];
                } },
            key: (tile.index),
            ...{ class: "w-10 h-10 rounded-xs flex items-center justify-center text-xs border transition-colors" },
            ...{ class: (__VLS_ctx.getTileClass(tile)) },
            disabled: (!__VLS_ctx.isTileClickable(tile)),
        });
        /** @type {__VLS_StyleScopedClasses['w-10']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
        (__VLS_ctx.getTileIcon(tile));
        // @ts-ignore
        [getTileClass, isTileClickable, getTileIcon,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [bombItem] of __VLS_vFor((__VLS_ctx.availableBombs))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (bombItem.id),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.miningStore.isExploring && !__VLS_ctx.miningStore.inCombat))
                        throw 0;
                    return __VLS_ctx.toggleBombMode(bombItem.id);
                    // @ts-ignore
                    [availableBombs, toggleBombMode,];
                } },
            ...{ class: "flex items-center justify-between border rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5" },
            ...{ class: (__VLS_ctx.bombModeId === bombItem.id ? 'border-accent text-accent' : 'border-accent/20') },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        let __VLS_120;
        /** @ts-ignore @type { | typeof __VLS_components.Zap} */
        Zap;
        // @ts-ignore
        const __VLS_121 = __VLS_asFunctionalComponent1(__VLS_120, new __VLS_120({
            size: (12),
            ...{ class: "inline" },
        }));
        const __VLS_122 = __VLS_121({
            size: (12),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_121));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        (bombItem.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (bombItem.count);
        // @ts-ignore
        [bombModeId,];
    }
    if (__VLS_ctx.hasMonsterLure) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (__VLS_ctx.handleUseMonsterLure) },
            ...{ class: "flex items-center justify-between border border-danger/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-danger/5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-danger/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-danger/5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-danger" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        let __VLS_125;
        /** @ts-ignore @type { | typeof __VLS_components.Skull} */
        Skull;
        // @ts-ignore
        const __VLS_126 = __VLS_asFunctionalComponent1(__VLS_125, new __VLS_125({
            size: (12),
            ...{ class: "inline" },
        }));
        const __VLS_127 = __VLS_126({
            size: (12),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_126));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.inventoryStore.getItemCount('monster_lure'));
    }
    if (__VLS_ctx.availableCombatItems.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.miningStore.isExploring && !__VLS_ctx.miningStore.inCombat))
                        throw 0;
                    if (!(__VLS_ctx.availableCombatItems.length > 0))
                        throw 0;
                    return __VLS_ctx.showCombatItems = true;
                    // @ts-ignore
                    [hasMonsterLure, handleUseMonsterLure, inventoryStore, availableCombatItems, showCombatItems,];
                } },
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
        let __VLS_130;
        /** @ts-ignore @type { | typeof __VLS_components.Backpack} */
        Backpack;
        // @ts-ignore
        const __VLS_131 = __VLS_asFunctionalComponent1(__VLS_130, new __VLS_130({
            size: (12),
            ...{ class: "inline" },
        }));
        const __VLS_132 = __VLS_131({
            size: (12),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_131));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.availableCombatItems.length);
    }
    if (__VLS_ctx.miningStore.stairsFound) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.miningStore.isExploring && !__VLS_ctx.miningStore.inCombat))
                        throw 0;
                    if (!(__VLS_ctx.miningStore.stairsFound))
                        throw 0;
                    return __VLS_ctx.miningStore.stairsUsable && __VLS_ctx.handleNextFloor();
                    // @ts-ignore
                    [miningStore, miningStore, availableCombatItems, handleNextFloor,];
                } },
            ...{ class: "flex items-center justify-between border border-success/30 rounded-xs px-3 py-1.5" },
            ...{ class: (__VLS_ctx.miningStore.stairsUsable ? 'cursor-pointer hover:bg-success/5' : 'opacity-50') },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-success/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        let __VLS_135;
        /** @ts-ignore @type { | typeof __VLS_components.ChevronDown} */
        ChevronDown;
        // @ts-ignore
        const __VLS_136 = __VLS_asFunctionalComponent1(__VLS_135, new __VLS_135({
            size: (12),
            ...{ class: "inline" },
        }));
        const __VLS_137 = __VLS_136({
            size: (12),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_136));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        if (!__VLS_ctx.miningStore.stairsUsable) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.miningStore.isExploring && !__VLS_ctx.miningStore.inCombat))
                    throw 0;
                return __VLS_ctx.showLeaveConfirm = true;
                // @ts-ignore
                [miningStore, miningStore, showLeaveConfirm,];
            } },
        ...{ class: "flex items-center justify-between border border-danger/30 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-danger/5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-danger/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-danger/5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-danger" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    let __VLS_140;
    /** @ts-ignore @type { | typeof __VLS_components.LogOut} */
    LogOut;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent1(__VLS_140, new __VLS_140({
        size: (12),
        ...{ class: "inline" },
    }));
    const __VLS_142 = __VLS_141({
        size: (12),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    (__VLS_ctx.miningStore.isInSkullCavern ? '离开骷髅矿穴' : '离开矿洞');
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-xs text-muted space-y-0.5 max-h-24 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-24']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    for (const [msg, i] of __VLS_vFor((__VLS_ctx.recentLog))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            key: (i),
            ...{ class: ({ 'text-text': i === __VLS_ctx.recentLog.length - 1 }) },
        });
        /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
        (msg);
        // @ts-ignore
        [miningStore, recentLog, recentLog,];
    }
}
// @ts-ignore
[];
var __VLS_100;
let __VLS_145;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_146 = __VLS_asFunctionalComponent1(__VLS_145, new __VLS_145({
    name: "panel-fade",
}));
const __VLS_147 = __VLS_146({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_146));
const { default: __VLS_150 } = __VLS_148.slots;
if (__VLS_ctx.miningStore.inCombat) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-60']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel max-w-xs w-full" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm" },
        ...{ class: (__VLS_ctx.miningStore.combatIsBoss ? 'text-danger' : 'text-accent') },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    (__VLS_ctx.miningStore.combatIsBoss ? 'BOSS 战' : '遭遇怪物');
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-[1fr_auto_1fr] gap-1.5 mb-3 items-center" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-[1fr_auto_1fr]']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 relative" },
        ...{ class: (__VLS_ctx.playerAnim) },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-center mb-1.5 truncate" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
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
    if (__VLS_ctx.playerFloat) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            key: (__VLS_ctx.playerFloat.key),
            ...{ class: "absolute -top-1 right-0 text-danger text-[11px] font-bold anim-float-up pointer-events-none" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['-top-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['right-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['anim-float-up']} */ ;
        /** @type {__VLS_StyleScopedClasses['pointer-events-none']} */ ;
        (__VLS_ctx.playerFloat.text);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted/40" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-danger/20 rounded-xs p-2 relative" },
        ...{ class: (__VLS_ctx.monsterAnim) },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-danger/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-center text-danger mb-1.5 truncate" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
    (__VLS_ctx.miningStore.combatMonster?.name);
    if (__VLS_ctx.miningStore.combatIsBoss) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px]" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "bg-bg rounded-xs h-1.5 mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "h-1.5 bg-danger rounded-xs transition-all" },
        ...{ style: ({
                width: `${__VLS_ctx.miningStore.combatMonster ? (__VLS_ctx.miningStore.combatMonsterHp / __VLS_ctx.miningStore.combatMonster.hp) * 100 : 0}%`
            }) },
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
    (__VLS_ctx.miningStore.combatMonsterHp);
    (__VLS_ctx.miningStore.combatMonster?.hp);
    if (__VLS_ctx.monsterFloat) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            key: (__VLS_ctx.monsterFloat.key),
            ...{ class: "absolute -top-1 right-0 text-accent text-[11px] font-bold anim-float-up pointer-events-none" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['-top-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['right-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['anim-float-up']} */ ;
        /** @type {__VLS_StyleScopedClasses['pointer-events-none']} */ ;
        (__VLS_ctx.monsterFloat.text);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mb-3 space-y-1" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-3 gap-1" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.miningStore.inCombat))
                    throw 0;
                return !__VLS_ctx.combatAnimLock && __VLS_ctx.handleCombat('attack');
                // @ts-ignore
                [miningStore, miningStore, miningStore, miningStore, miningStore, miningStore, miningStore, miningStore, miningStore, miningStore, playerStore, playerStore, playerStore, playerStore, playerStore, playerAnim, playerFloat, playerFloat, playerFloat, monsterAnim, monsterFloat, monsterFloat, monsterFloat, combatAnimLock, handleCombat,];
            } },
        ...{ class: "flex flex-col items-center border border-accent/20 rounded-xs py-1.5" },
        ...{ class: (__VLS_ctx.combatAnimLock ? 'opacity-50' : 'cursor-pointer hover:bg-accent/5') },
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
    let __VLS_151;
    /** @ts-ignore @type { | typeof __VLS_components.Swords} */
    Swords;
    // @ts-ignore
    const __VLS_152 = __VLS_asFunctionalComponent1(__VLS_151, new __VLS_151({
        size: (12),
        ...{ class: "inline" },
    }));
    const __VLS_153 = __VLS_152({
        size: (12),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_152));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.weaponAttack);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.miningStore.inCombat))
                    throw 0;
                return !__VLS_ctx.combatAnimLock && __VLS_ctx.handleCombat('defend');
                // @ts-ignore
                [weaponAttack, combatAnimLock, combatAnimLock, handleCombat,];
            } },
        ...{ class: "flex flex-col items-center border border-accent/20 rounded-xs py-1.5" },
        ...{ class: (__VLS_ctx.combatAnimLock ? 'opacity-50' : 'cursor-pointer hover:bg-accent/5') },
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
    let __VLS_156;
    /** @ts-ignore @type { | typeof __VLS_components.Shield} */
    Shield;
    // @ts-ignore
    const __VLS_157 = __VLS_asFunctionalComponent1(__VLS_156, new __VLS_156({
        size: (12),
        ...{ class: "inline" },
    }));
    const __VLS_158 = __VLS_157({
        size: (12),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_157));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.miningStore.inCombat))
                    throw 0;
                return !__VLS_ctx.miningStore.combatIsBoss && !__VLS_ctx.combatAnimLock && __VLS_ctx.handleCombat('flee');
                // @ts-ignore
                [miningStore, combatAnimLock, combatAnimLock, handleCombat,];
            } },
        ...{ class: "flex flex-col items-center border rounded-xs py-1.5" },
        ...{ class: (__VLS_ctx.miningStore.combatIsBoss || __VLS_ctx.combatAnimLock
                ? 'border-accent/10 opacity-50'
                : 'border-danger/20 cursor-pointer hover:bg-danger/5') },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
        ...{ class: (__VLS_ctx.miningStore.combatIsBoss ? 'text-muted' : 'text-danger') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    let __VLS_161;
    /** @ts-ignore @type { | typeof __VLS_components.MoveRight} */
    MoveRight;
    // @ts-ignore
    const __VLS_162 = __VLS_asFunctionalComponent1(__VLS_161, new __VLS_161({
        size: (12),
        ...{ class: "inline" },
    }));
    const __VLS_163 = __VLS_162({
        size: (12),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_162));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    (__VLS_ctx.miningStore.combatIsBoss ? '无法' : '逃跑');
    if (__VLS_ctx.miningStore.combatIsBoss) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-muted/40" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
    }
    if (__VLS_ctx.availableCombatItems.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.miningStore.inCombat))
                        throw 0;
                    if (!(__VLS_ctx.availableCombatItems.length > 0))
                        throw 0;
                    return __VLS_ctx.showCombatItems = true;
                    // @ts-ignore
                    [miningStore, miningStore, miningStore, miningStore, availableCombatItems, showCombatItems, combatAnimLock,];
                } },
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
        let __VLS_166;
        /** @ts-ignore @type { | typeof __VLS_components.Backpack} */
        Backpack;
        // @ts-ignore
        const __VLS_167 = __VLS_asFunctionalComponent1(__VLS_166, new __VLS_166({
            size: (12),
            ...{ class: "inline" },
        }));
        const __VLS_168 = __VLS_167({
            size: (12),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_167));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.availableCombatItems.length);
    }
    if (__VLS_ctx.inventoryStore.equipmentPresets.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.miningStore.inCombat))
                        throw 0;
                    if (!(__VLS_ctx.inventoryStore.equipmentPresets.length > 0))
                        throw 0;
                    return __VLS_ctx.showPresetListModal = true;
                    // @ts-ignore
                    [inventoryStore, availableCombatItems, showPresetListModal,];
                } },
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
            ...{ class: "text-xs text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        let __VLS_171;
        /** @ts-ignore @type { | typeof __VLS_components.BookMarked} */
        BookMarked;
        // @ts-ignore
        const __VLS_172 = __VLS_asFunctionalComponent1(__VLS_171, new __VLS_171({
            size: (12),
            ...{ class: "inline" },
        }));
        const __VLS_173 = __VLS_172({
            size: (12),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_172));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        if (__VLS_ctx.inventoryStore.activePresetId) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (__VLS_ctx.inventoryStore.equipmentPresets.find(p => p.id === __VLS_ctx.inventoryStore.activePresetId)?.name ?? '');
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-xs space-y-0.5 max-h-28 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-28']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    for (const [msg, i] of __VLS_vFor((__VLS_ctx.miningStore.combatLog))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            key: (i),
            ...{ class: (i < __VLS_ctx.miningStore.combatLog.length - 1 ? 'text-muted' : 'text-text') },
        });
        (msg);
        // @ts-ignore
        [miningStore, miningStore, inventoryStore, inventoryStore, inventoryStore,];
    }
}
// @ts-ignore
[];
var __VLS_148;
let __VLS_176;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent1(__VLS_176, new __VLS_176({
    name: "panel-fade",
}));
const __VLS_178 = __VLS_177({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_177));
const { default: __VLS_181 } = __VLS_179.slots;
if (__VLS_ctx.showCombatItems) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showCombatItems))
                    throw 0;
                return __VLS_ctx.showCombatItems = false;
                // @ts-ignore
                [showCombatItems, showCombatItems,];
            } },
        ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-[70]']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel max-w-xs w-full" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
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
    let __VLS_182;
    /** @ts-ignore @type { | typeof __VLS_components.Backpack} */
    Backpack;
    // @ts-ignore
    const __VLS_183 = __VLS_asFunctionalComponent1(__VLS_182, new __VLS_182({
        size: (14),
        ...{ class: "inline" },
    }));
    const __VLS_184 = __VLS_183({
        size: (14),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_183));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    const __VLS_187 = Button;
    // @ts-ignore
    const __VLS_188 = __VLS_asFunctionalComponent1(__VLS_187, new __VLS_187({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }));
    const __VLS_189 = __VLS_188({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_188));
    let __VLS_192;
    const __VLS_193 = {
        /** @type {typeof __VLS_192.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.showCombatItems))
                throw 0;
            return __VLS_ctx.showCombatItems = false;
            // @ts-ignore
            [X, showCombatItems,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
    var __VLS_190;
    var __VLS_191;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1 max-h-48 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-48']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    for (const [item] of __VLS_vFor((__VLS_ctx.availableCombatItems))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showCombatItems))
                        throw 0;
                    return __VLS_ctx.handlePendingItem(item.itemId);
                    // @ts-ignore
                    [availableCombatItems, handlePendingItem,];
                } },
            key: (item.itemId),
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (item.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (item.desc);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (item.count);
        // @ts-ignore
        [];
    }
    if (__VLS_ctx.availableCombatItems.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted text-center py-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    }
}
// @ts-ignore
[availableCombatItems,];
var __VLS_179;
let __VLS_194;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_195 = __VLS_asFunctionalComponent1(__VLS_194, new __VLS_194({
    name: "panel-fade",
}));
const __VLS_196 = __VLS_195({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_195));
const { default: __VLS_199 } = __VLS_197.slots;
if (__VLS_ctx.pendingItem) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.pendingItem))
                    throw 0;
                return __VLS_ctx.pendingItemId = null;
                // @ts-ignore
                [pendingItem, pendingItemId,];
            } },
        ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-[70]']} */ ;
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
                if (!(__VLS_ctx.pendingItem))
                    throw 0;
                return __VLS_ctx.pendingItemId = null;
                // @ts-ignore
                [pendingItemId,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_200;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_201 = __VLS_asFunctionalComponent1(__VLS_200, new __VLS_200({
        size: (14),
    }));
    const __VLS_202 = __VLS_201({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_201));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
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
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.pendingItem.name);
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
    (__VLS_ctx.pendingItem.desc);
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
    (__VLS_ctx.pendingItem.count);
    if (__VLS_ctx.pendingCanBatch && __VLS_ctx.pendingItem.count > 1) {
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
        const __VLS_205 = Button || Button;
        // @ts-ignore
        const __VLS_206 = __VLS_asFunctionalComponent1(__VLS_205, new __VLS_205({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.pendingUseQty <= 1),
        }));
        const __VLS_207 = __VLS_206({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.pendingUseQty <= 1),
        }, ...__VLS_functionalComponentArgsRest(__VLS_206));
        let __VLS_210;
        const __VLS_211 = {
            /** @type {typeof __VLS_210.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.pendingItem))
                    throw 0;
                if (!(__VLS_ctx.pendingCanBatch && __VLS_ctx.pendingItem.count > 1))
                    throw 0;
                return __VLS_ctx.addUseQty(-1);
                // @ts-ignore
                [pendingItem, pendingItem, pendingItem, pendingItem, pendingCanBatch, pendingUseQty, addUseQty,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_212 } = __VLS_208.slots;
        // @ts-ignore
        [];
        var __VLS_208;
        var __VLS_209;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onInput: (__VLS_ctx.onUseQtyInput) },
            type: "number",
            value: (__VLS_ctx.pendingUseQty),
            min: "1",
            max: (__VLS_ctx.pendingItem.count),
            ...{ class: "w-24 h-6 px-2 py-0.5 bg-bg border border-accent/30 rounded-xs text-xs text-center text-accent outline-none focus:border-accent transition-colors" },
        });
        /** @type {__VLS_StyleScopedClasses['w-24']} */ ;
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
        const __VLS_213 = Button || Button;
        // @ts-ignore
        const __VLS_214 = __VLS_asFunctionalComponent1(__VLS_213, new __VLS_213({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.pendingUseQty >= __VLS_ctx.pendingItem.count),
        }));
        const __VLS_215 = __VLS_214({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.pendingUseQty >= __VLS_ctx.pendingItem.count),
        }, ...__VLS_functionalComponentArgsRest(__VLS_214));
        let __VLS_218;
        const __VLS_219 = {
            /** @type {typeof __VLS_218.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.pendingItem))
                    throw 0;
                if (!(__VLS_ctx.pendingCanBatch && __VLS_ctx.pendingItem.count > 1))
                    throw 0;
                return __VLS_ctx.addUseQty(1);
                // @ts-ignore
                [pendingItem, pendingItem, pendingUseQty, pendingUseQty, addUseQty, onUseQtyInput,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_220 } = __VLS_216.slots;
        // @ts-ignore
        [];
        var __VLS_216;
        var __VLS_217;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        const __VLS_221 = Button || Button;
        // @ts-ignore
        const __VLS_222 = __VLS_asFunctionalComponent1(__VLS_221, new __VLS_221({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.pendingUseQty <= 1),
        }));
        const __VLS_223 = __VLS_222({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.pendingUseQty <= 1),
        }, ...__VLS_functionalComponentArgsRest(__VLS_222));
        let __VLS_226;
        const __VLS_227 = {
            /** @type {typeof __VLS_226.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.pendingItem))
                    throw 0;
                if (!(__VLS_ctx.pendingCanBatch && __VLS_ctx.pendingItem.count > 1))
                    throw 0;
                return __VLS_ctx.pendingUseQty = 1;
                // @ts-ignore
                [pendingUseQty, pendingUseQty,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_228 } = __VLS_224.slots;
        // @ts-ignore
        [];
        var __VLS_224;
        var __VLS_225;
        const __VLS_229 = Button || Button;
        // @ts-ignore
        const __VLS_230 = __VLS_asFunctionalComponent1(__VLS_229, new __VLS_229({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.pendingUseQty >= __VLS_ctx.pendingItem.count),
        }));
        const __VLS_231 = __VLS_230({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.pendingUseQty >= __VLS_ctx.pendingItem.count),
        }, ...__VLS_functionalComponentArgsRest(__VLS_230));
        let __VLS_234;
        const __VLS_235 = {
            /** @type {typeof __VLS_234.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.pendingItem))
                    throw 0;
                if (!(__VLS_ctx.pendingCanBatch && __VLS_ctx.pendingItem.count > 1))
                    throw 0;
                return __VLS_ctx.pendingUseQty = __VLS_ctx.pendingItem.count;
                // @ts-ignore
                [pendingItem, pendingItem, pendingUseQty, pendingUseQty,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_236 } = __VLS_232.slots;
        // @ts-ignore
        [];
        var __VLS_232;
        var __VLS_233;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    const __VLS_237 = Button || Button;
    // @ts-ignore
    const __VLS_238 = __VLS_asFunctionalComponent1(__VLS_237, new __VLS_237({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
    }));
    const __VLS_239 = __VLS_238({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_238));
    let __VLS_242;
    const __VLS_243 = {
        /** @type {typeof __VLS_242.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.pendingItem))
                throw 0;
            return __VLS_ctx.pendingItemId = null;
            // @ts-ignore
            [pendingItemId,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_244 } = __VLS_240.slots;
    // @ts-ignore
    [];
    var __VLS_240;
    var __VLS_241;
    const __VLS_245 = Button || Button;
    // @ts-ignore
    const __VLS_246 = __VLS_asFunctionalComponent1(__VLS_245, new __VLS_245({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center !bg-accent !text-bg" },
    }));
    const __VLS_247 = __VLS_246({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center !bg-accent !text-bg" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_246));
    let __VLS_250;
    const __VLS_251 = {
        /** @type {typeof __VLS_250.click} */
        onClick: (__VLS_ctx.handleConfirmUseItem),
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_252 } = __VLS_248.slots;
    (__VLS_ctx.pendingCanBatch && __VLS_ctx.pendingUseQty > 1 ? ` ×${__VLS_ctx.pendingUseQty}` : '');
    // @ts-ignore
    [pendingCanBatch, pendingUseQty, pendingUseQty, handleConfirmUseItem,];
    var __VLS_248;
    var __VLS_249;
}
// @ts-ignore
[];
var __VLS_197;
let __VLS_253;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_254 = __VLS_asFunctionalComponent1(__VLS_253, new __VLS_253({
    name: "panel-fade",
}));
const __VLS_255 = __VLS_254({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_254));
const { default: __VLS_258 } = __VLS_256.slots;
if (__VLS_ctx.showLeaveConfirm) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showLeaveConfirm))
                    throw 0;
                return __VLS_ctx.showLeaveConfirm = false;
                // @ts-ignore
                [showLeaveConfirm, showLeaveConfirm,];
            } },
        ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-[70]']} */ ;
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    (__VLS_ctx.miningStore.isInSkullCavern ? '骷髅矿穴' : '矿洞');
    (__VLS_ctx.leaveHint);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    const __VLS_259 = Button || Button;
    // @ts-ignore
    const __VLS_260 = __VLS_asFunctionalComponent1(__VLS_259, new __VLS_259({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
    }));
    const __VLS_261 = __VLS_260({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_260));
    let __VLS_264;
    const __VLS_265 = {
        /** @type {typeof __VLS_264.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.showLeaveConfirm))
                throw 0;
            return __VLS_ctx.showLeaveConfirm = false;
            // @ts-ignore
            [miningStore, showLeaveConfirm, leaveHint,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_266 } = __VLS_262.slots;
    // @ts-ignore
    [];
    var __VLS_262;
    var __VLS_263;
    const __VLS_267 = Button || Button;
    // @ts-ignore
    const __VLS_268 = __VLS_asFunctionalComponent1(__VLS_267, new __VLS_267({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center btn-danger" },
        icon: (__VLS_ctx.LogOut),
    }));
    const __VLS_269 = __VLS_268({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center btn-danger" },
        icon: (__VLS_ctx.LogOut),
    }, ...__VLS_functionalComponentArgsRest(__VLS_268));
    let __VLS_272;
    const __VLS_273 = {
        /** @type {typeof __VLS_272.click} */
        onClick: (__VLS_ctx.confirmLeave),
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
    const { default: __VLS_274 } = __VLS_270.slots;
    // @ts-ignore
    [LogOut, confirmLeave,];
    var __VLS_270;
    var __VLS_271;
}
// @ts-ignore
[];
var __VLS_256;
let __VLS_275;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_276 = __VLS_asFunctionalComponent1(__VLS_275, new __VLS_275({
    name: "panel-fade",
}));
const __VLS_277 = __VLS_276({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_276));
const { default: __VLS_280 } = __VLS_278.slots;
if (__VLS_ctx.showPresetListModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showPresetListModal))
                    throw 0;
                return __VLS_ctx.showPresetListModal = false;
                // @ts-ignore
                [showPresetListModal, showPresetListModal,];
            } },
        ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-70 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-70']} */ ;
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
                if (!(__VLS_ctx.showPresetListModal))
                    throw 0;
                return __VLS_ctx.showPresetListModal = false;
                // @ts-ignore
                [showPresetListModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_281;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_282 = __VLS_asFunctionalComponent1(__VLS_281, new __VLS_281({
        size: (14),
    }));
    const __VLS_283 = __VLS_282({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_282));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    let __VLS_286;
    /** @ts-ignore @type { | typeof __VLS_components.BookMarked} */
    BookMarked;
    // @ts-ignore
    const __VLS_287 = __VLS_asFunctionalComponent1(__VLS_286, new __VLS_286({
        size: (14),
        ...{ class: "inline" },
    }));
    const __VLS_288 = __VLS_287({
        size: (14),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_287));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    if (__VLS_ctx.inventoryStore.equipmentPresets.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1.5 max-h-60 overflow-y-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        for (const [preset] of __VLS_vFor((__VLS_ctx.inventoryStore.equipmentPresets))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (preset.id),
                ...{ class: "border rounded-xs p-2" },
                ...{ class: (__VLS_ctx.inventoryStore.activePresetId === preset.id ? 'border-accent/40' : 'border-accent/10') },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-accent truncate" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (preset.name);
            if (__VLS_ctx.inventoryStore.activePresetId === preset.id) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-success shrink-0 ml-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "grid grid-cols-2 gap-1" },
            });
            /** @type {__VLS_StyleScopedClasses['grid']} */ ;
            /** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
            const __VLS_291 = Button || Button;
            // @ts-ignore
            const __VLS_292 = __VLS_asFunctionalComponent1(__VLS_291, new __VLS_291({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5 text-[10px]" },
                disabled: (__VLS_ctx.inventoryStore.activePresetId === preset.id),
            }));
            const __VLS_293 = __VLS_292({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5 text-[10px]" },
                disabled: (__VLS_ctx.inventoryStore.activePresetId === preset.id),
            }, ...__VLS_functionalComponentArgsRest(__VLS_292));
            let __VLS_296;
            const __VLS_297 = {
                /** @type {typeof __VLS_296.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showPresetListModal))
                        throw 0;
                    if (!(__VLS_ctx.inventoryStore.equipmentPresets.length > 0))
                        throw 0;
                    return __VLS_ctx.quickApplyPreset(preset.id);
                    // @ts-ignore
                    [inventoryStore, inventoryStore, inventoryStore, inventoryStore, inventoryStore, quickApplyPreset,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            const { default: __VLS_298 } = __VLS_294.slots;
            // @ts-ignore
            [];
            var __VLS_294;
            var __VLS_295;
            const __VLS_299 = Button || Button;
            // @ts-ignore
            const __VLS_300 = __VLS_asFunctionalComponent1(__VLS_299, new __VLS_299({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5 text-[10px]" },
            }));
            const __VLS_301 = __VLS_300({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5 text-[10px]" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_300));
            let __VLS_304;
            const __VLS_305 = {
                /** @type {typeof __VLS_304.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showPresetListModal))
                        throw 0;
                    if (!(__VLS_ctx.inventoryStore.equipmentPresets.length > 0))
                        throw 0;
                    return __VLS_ctx.viewPresetDetail(preset.id);
                    // @ts-ignore
                    [viewPresetDetail,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            const { default: __VLS_306 } = __VLS_302.slots;
            // @ts-ignore
            [];
            var __VLS_302;
            var __VLS_303;
            // @ts-ignore
            [];
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center justify-center py-6" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
        let __VLS_307;
        /** @ts-ignore @type { | typeof __VLS_components.BookMarked} */
        BookMarked;
        // @ts-ignore
        const __VLS_308 = __VLS_asFunctionalComponent1(__VLS_307, new __VLS_307({
            size: (24),
            ...{ class: "text-muted/30" },
        }));
        const __VLS_309 = __VLS_308({
            size: (24),
            ...{ class: "text-muted/30" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_308));
        /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted/60 mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    }
}
// @ts-ignore
[];
var __VLS_278;
let __VLS_312;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_313 = __VLS_asFunctionalComponent1(__VLS_312, new __VLS_312({
    name: "panel-fade",
}));
const __VLS_314 = __VLS_313({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_313));
const { default: __VLS_317 } = __VLS_315.slots;
if (__VLS_ctx.showPresetDetailModal && __VLS_ctx.detailPreset) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showPresetDetailModal && __VLS_ctx.detailPreset))
                    throw 0;
                return __VLS_ctx.showPresetDetailModal = false;
                // @ts-ignore
                [showPresetDetailModal, showPresetDetailModal, detailPreset,];
            } },
        ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-80 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-80']} */ ;
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
                if (!(__VLS_ctx.showPresetDetailModal && __VLS_ctx.detailPreset))
                    throw 0;
                return __VLS_ctx.showPresetDetailModal = false;
                // @ts-ignore
                [showPresetDetailModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_318;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_319 = __VLS_asFunctionalComponent1(__VLS_318, new __VLS_318({
        size: (14),
    }));
    const __VLS_320 = __VLS_319({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_319));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.detailPreset.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showPresetDetailModal && __VLS_ctx.detailPreset))
                    throw 0;
                return __VLS_ctx.detailPreset.weaponDefId && __VLS_ctx.viewEquipProperty('weapon', __VLS_ctx.detailPreset.weaponDefId);
                // @ts-ignore
                [detailPreset, detailPreset, detailPreset, viewEquipProperty,];
            } },
        ...{ class: "flex items-center justify-between border border-accent/10 rounded-xs px-3 py-1.5" },
        ...{ class: (__VLS_ctx.detailPreset.weaponDefId ? 'cursor-pointer hover:bg-accent/5' : '') },
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
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
        ...{ class: (__VLS_ctx.detailPreset.weaponDefId ? 'text-accent' : 'text-muted/40') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.detailPreset.weaponDefId ? (__VLS_ctx.getWeaponById(__VLS_ctx.detailPreset.weaponDefId)?.name ?? '未知') : '无');
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showPresetDetailModal && __VLS_ctx.detailPreset))
                    throw 0;
                return __VLS_ctx.detailPreset.ringSlot1DefId && __VLS_ctx.viewEquipProperty('ring', __VLS_ctx.detailPreset.ringSlot1DefId);
                // @ts-ignore
                [detailPreset, detailPreset, detailPreset, detailPreset, detailPreset, detailPreset, viewEquipProperty, getWeaponById,];
            } },
        ...{ class: "flex items-center justify-between border border-accent/10 rounded-xs px-3 py-1.5" },
        ...{ class: (__VLS_ctx.detailPreset.ringSlot1DefId ? 'cursor-pointer hover:bg-accent/5' : '') },
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
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
        ...{ class: (__VLS_ctx.detailPreset.ringSlot1DefId ? 'text-accent' : 'text-muted/40') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.detailPreset.ringSlot1DefId ? (__VLS_ctx.getRingById(__VLS_ctx.detailPreset.ringSlot1DefId)?.name ?? '未知') : '无');
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showPresetDetailModal && __VLS_ctx.detailPreset))
                    throw 0;
                return __VLS_ctx.detailPreset.ringSlot2DefId && __VLS_ctx.viewEquipProperty('ring', __VLS_ctx.detailPreset.ringSlot2DefId);
                // @ts-ignore
                [detailPreset, detailPreset, detailPreset, detailPreset, detailPreset, detailPreset, viewEquipProperty, getRingById,];
            } },
        ...{ class: "flex items-center justify-between border border-accent/10 rounded-xs px-3 py-1.5" },
        ...{ class: (__VLS_ctx.detailPreset.ringSlot2DefId ? 'cursor-pointer hover:bg-accent/5' : '') },
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
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
        ...{ class: (__VLS_ctx.detailPreset.ringSlot2DefId ? 'text-accent' : 'text-muted/40') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.detailPreset.ringSlot2DefId ? (__VLS_ctx.getRingById(__VLS_ctx.detailPreset.ringSlot2DefId)?.name ?? '未知') : '无');
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showPresetDetailModal && __VLS_ctx.detailPreset))
                    throw 0;
                return __VLS_ctx.detailPreset.hatDefId && __VLS_ctx.viewEquipProperty('hat', __VLS_ctx.detailPreset.hatDefId);
                // @ts-ignore
                [detailPreset, detailPreset, detailPreset, detailPreset, detailPreset, detailPreset, viewEquipProperty, getRingById,];
            } },
        ...{ class: "flex items-center justify-between border border-accent/10 rounded-xs px-3 py-1.5" },
        ...{ class: (__VLS_ctx.detailPreset.hatDefId ? 'cursor-pointer hover:bg-accent/5' : '') },
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
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
        ...{ class: (__VLS_ctx.detailPreset.hatDefId ? 'text-accent' : 'text-muted/40') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.detailPreset.hatDefId ? (__VLS_ctx.getHatById(__VLS_ctx.detailPreset.hatDefId)?.name ?? '未知') : '无');
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showPresetDetailModal && __VLS_ctx.detailPreset))
                    throw 0;
                return __VLS_ctx.detailPreset.shoeDefId && __VLS_ctx.viewEquipProperty('shoe', __VLS_ctx.detailPreset.shoeDefId);
                // @ts-ignore
                [detailPreset, detailPreset, detailPreset, detailPreset, detailPreset, detailPreset, viewEquipProperty, getHatById,];
            } },
        ...{ class: "flex items-center justify-between border border-accent/10 rounded-xs px-3 py-1.5" },
        ...{ class: (__VLS_ctx.detailPreset.shoeDefId ? 'cursor-pointer hover:bg-accent/5' : '') },
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
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
        ...{ class: (__VLS_ctx.detailPreset.shoeDefId ? 'text-accent' : 'text-muted/40') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.detailPreset.shoeDefId ? (__VLS_ctx.getShoeById(__VLS_ctx.detailPreset.shoeDefId)?.name ?? '未知') : '无');
}
// @ts-ignore
[detailPreset, detailPreset, detailPreset, detailPreset, getShoeById,];
var __VLS_315;
let __VLS_323;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_324 = __VLS_asFunctionalComponent1(__VLS_323, new __VLS_323({
    name: "panel-fade",
}));
const __VLS_325 = __VLS_324({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_324));
const { default: __VLS_328 } = __VLS_326.slots;
if (__VLS_ctx.showEquipPropertyModal && __VLS_ctx.equipPropertyInfo) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showEquipPropertyModal && __VLS_ctx.equipPropertyInfo))
                    throw 0;
                return __VLS_ctx.showEquipPropertyModal = false;
                // @ts-ignore
                [showEquipPropertyModal, showEquipPropertyModal, equipPropertyInfo,];
            } },
        ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-90 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-90']} */ ;
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
                if (!(__VLS_ctx.showEquipPropertyModal && __VLS_ctx.equipPropertyInfo))
                    throw 0;
                return __VLS_ctx.showEquipPropertyModal = false;
                // @ts-ignore
                [showEquipPropertyModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_329;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_330 = __VLS_asFunctionalComponent1(__VLS_329, new __VLS_329({
        size: (14),
    }));
    const __VLS_331 = __VLS_330({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_330));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-[10px] text-muted mb-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-0.5']} */ ;
    (__VLS_ctx.equipPropertyInfo.category);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    (__VLS_ctx.equipPropertyInfo.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.equipPropertyInfo.description);
    if (__VLS_ctx.equipPropertyInfo.effects.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        for (const [eff, i] of __VLS_vFor((__VLS_ctx.equipPropertyInfo.effects))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (i),
                ...{ class: "flex items-center justify-between border border-accent/10 rounded-xs px-3 py-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (eff.label);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            (eff.value);
            // @ts-ignore
            [equipPropertyInfo, equipPropertyInfo, equipPropertyInfo, equipPropertyInfo, equipPropertyInfo,];
        }
    }
}
// @ts-ignore
[];
var __VLS_326;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
