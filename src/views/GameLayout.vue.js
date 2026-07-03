/// <reference types="../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAnimalStore } from '@/stores/useAnimalStore';
import { useGameStore, SEASON_NAMES } from '@/stores/useGameStore';
import { useHomeStore } from '@/stores/useHomeStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useNpcStore } from '@/stores/useNpcStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useWarehouseStore } from '@/stores/useWarehouseStore';
import { useSaveStore } from '@/stores/useSaveStore';
import { useFarmStore } from '@/stores/useFarmStore';
import { useDialogs } from '@/composables/useDialogs';
import { handleEndDay } from '@/composables/useEndDay';
import { addLog, logHistory, clearAllLogs, clearDayLogs, _registerDayLabelGetter } from '@/composables/useGameLog';
import { LATE_NIGHT_RECOVERY_MAX, LATE_NIGHT_RECOVERY_MIN, PASSOUT_STAMINA_RECOVERY, PASSOUT_MONEY_PENALTY_RATE, PASSOUT_MONEY_PENALTY_CAP } from '@/data/timeConstants';
import { getNpcById, getItemById, getCropById } from '@/data';
import { CHEST_DEFS } from '@/data/items';
import { useGameClock } from '@/composables/useGameClock';
import { useAudio } from '@/composables/useAudio';
import { Moon, X, Map, Settings as SettingsIcon, Archive, ArrowDown, ArrowDownToLine, History, Trash2 } from 'lucide-vue-next';
import Button from '@/components/game/Button.vue';
import Divider from '@/components/game/Divider.vue';
import MobileMapMenu from '@/components/game/MobileMapMenu.vue';
import StatusBar from '@/components/game/StatusBar.vue';
import EventDialog from '@/components/game/EventDialog.vue';
import HeartEventDialog from '@/components/game/HeartEventDialog.vue';
import PerkSelectDialog from '@/components/game/PerkSelectDialog.vue';
import FishingContestView from '@/components/game/FishingContestView.vue';
import HarvestFairView from '@/components/game/HarvestFairView.vue';
import DragonBoatView from '@/components/game/DragonBoatView.vue';
import LanternRiddleView from '@/components/game/LanternRiddleView.vue';
import PotThrowingView from '@/components/game/PotThrowingView.vue';
import DumplingMakingView from '@/components/game/DumplingMakingView.vue';
import FireworkShowView from '@/components/game/FireworkShowView.vue';
import TeaContestView from '@/components/game/TeaContestView.vue';
import KiteFlyingView from '@/components/game/KiteFlyingView.vue';
import SettingsDialog from '@/components/game/SettingsDialog.vue';
import SaveManager from '@/components/game/SaveManager.vue';
import DiscoveryScene from '@/components/game/DiscoveryScene.vue';
import { Capacitor } from '@capacitor/core';
const router = useRouter();
const route = useRoute();
const gameStore = useGameStore();
const playerStore = usePlayerStore();
const saveStore = useSaveStore();
const farmStore = useFarmStore();
const { switchToSeasonalBgm } = useAudio();
let accountAutoSaveTimer = null;
const saveKey = (slot) => `taoyuanxiang_save_${slot}`;
const accountToken = () => localStorage.getItem('taoyuan_account_token') || '';
const accountHeaders = () => ({ 'content-type': 'application/json', authorization: `Bearer ${accountToken()}` });
const accountApi = async (path, options = {}) => {
    const res = await fetch(path, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
        throw new Error(data.error || '请求失败');
    return data;
};
// 世界公告
const worldAnnouncement = ref('');
const checkWorldAnnouncements = async () => {
    try {
        const data = await accountApi('/api/world-announcements');
        if (data.announcements && data.announcements.length > 0) {
            const latest = data.announcements[0];
            if (latest && latest.message) {
                worldAnnouncement.value = latest.message;
                setTimeout(() => { worldAnnouncement.value = ''; }, 4000);
            }
        }
    }
    catch { }
};
onMounted(() => { checkWorldAnnouncements(); setInterval(checkWorldAnnouncements, 60000); });
const showMailModal = ref(false);
const mailLoading = ref(false);
const mails = ref([]);
const unclaimedMailCount = computed(() => mails.value.filter(m => !m.claimed).length);
const loadMails = async () => {
    const token = accountToken();
    if (!token) {
        mails.value = [];
        return;
    }
    mailLoading.value = true;
    try {
        const data = await accountApi('/api/mails', { headers: accountHeaders() });
        mails.value = data.mails || [];
    }
    catch (e) {
        console.warn('load mails failed', e);
    }
    finally {
        mailLoading.value = false;
    }
};
const openLeaderboard = () => {
    showMobileMap.value = false;
    router.push('/game/leaderboard');
};
const openCombat = () => {
    showMobileMap.value = false;
    router.push('/game/combat');
};
const openForge = () => {
    showMobileMap.value = false;
    router.push('/game/forge');
};
const openSect = () => {
    showMobileMap.value = false;
    router.push('/game/sect');
};
const openMailModal = async () => {
    showMailModal.value = true;
    await loadMails();
};
const mailRewardText = (rewards) => {
    const parts = [];
    if (rewards?.money)
        parts.push(`铜钱 +${rewards.money}`);
    if (rewards?.stamina)
        parts.push(`体力 +${rewards.stamina}`);
    for (const item of rewards?.items || [])
        parts.push(`${getItemName(item.itemId)}×${item.quantity}`);
    return parts.join('，') || '无';
};
const formatMailTime = (v) => v ? new Date(v).toLocaleString() : '';
const claimMail = async (mail) => {
    try {
        const data = await accountApi(`/api/mails/${encodeURIComponent(mail.id)}/claim`, { method: 'POST', headers: accountHeaders() });
        const rewards = data.rewards || {};
        if (rewards.money)
            playerStore.earnMoney(Number(rewards.money) || 0);
        if (rewards.stamina)
            playerStore.restoreStamina(Number(rewards.stamina) || 0);
        for (const item of rewards.items || []) {
            inventoryStore.addItem(String(item.itemId), Number(item.quantity) || 1, item.quality || 'normal');
        }
        mail.claimed = true;
        addLog(`领取邮件奖励：${mailRewardText(rewards)}`);
        await autoSaveCurrent();
    }
    catch (e) {
        addLog(`领取邮件失败：${e?.message || '请求失败'}`);
    }
};
const autoSaveCurrent = async () => {
    if (!gameStore.isGameStarted || saveStore.activeSlot < 0)
        return;
    const slot = saveStore.activeSlot;
    if (!saveStore.saveToSlot(slot))
        return;
    const token = accountToken();
    if (!token)
        return;
    const raw = localStorage.getItem(saveKey(slot));
    if (!raw)
        return;
    const info = saveStore.getSlots().find(s => s.slot === slot);
    try {
        await accountApi(`/api/saves/${slot}`, { method: 'PUT', headers: accountHeaders(), body: JSON.stringify({ raw, meta: { ...(info || {}), autoSaved: true } }) });
    }
    catch (e) {
        // 自动保存失败不打断游戏，也不刷屏；玩家仍可手动保存。
        console.warn('account autosave failed', e);
    }
};
const startAccountAutoSave = () => {
    if (accountAutoSaveTimer != null)
        return;
    accountAutoSaveTimer = window.setInterval(() => { void autoSaveCurrent(); }, 5000);
};
const stopAccountAutoSave = () => {
    if (accountAutoSaveTimer != null) {
        window.clearInterval(accountAutoSaveTimer);
        accountAutoSaveTimer = null;
    }
};
// 游戏未开始时重定向到主菜单
if (!gameStore.isGameStarted) {
    void router.replace('/');
}
const { currentEvent, pendingHeartEvent, currentFestival, pendingPerk, pendingPetAdoption, childProposalVisible, pendingFarmEvent, pendingDiscoveryScene, closeEvent, closeHeartEvent, closeFestival, handlePerkSelect, closePetAdoption, closeChildProposal, closeFarmEvent, closeDiscoveryScene } = useDialogs();
const npcStore = useNpcStore();
const { startClock, stopClock, pauseClock, resumeClock } = useGameClock();
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
const clearLogTarget = ref(undefined);
const requestClearLogs = (dayLabel) => {
    clearLogTarget.value = dayLabel;
};
const executeClearLogs = () => {
    if (clearLogTarget.value === null)
        clearAllLogs();
    else if (clearLogTarget.value)
        clearDayLogs(clearLogTarget.value);
    clearLogTarget.value = undefined;
};
watch(showLogModal, v => {
    if (!v)
        clearLogTarget.value = undefined;
});
const loadCheckinStatus = async () => {
    const t = accountToken();
    if (!t)
        return;
    try {
        const res = await fetch('/api/checkin', { headers: { authorization: `Bearer ${t}` } });
        if (!res.ok)
            return;
        const data = await res.json();
        checkinChecked.value = Boolean(data.checked);
    }
    catch { }
};
const dailyCheckin = async () => {
    if (checkinBusy.value || checkinChecked.value)
        return;
    const t = accountToken();
    if (!t) {
        addLog('请先在首页登录账号，再进行每日签到。');
        return;
    }
    checkinBusy.value = true;
    try {
        const res = await fetch('/api/checkin', { method: 'POST', headers: { authorization: `Bearer ${t}` } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            addLog(data.error || '签到失败。');
            return;
        }
        playerStore.earnMoney(Number(data.reward || 0));
        checkinChecked.value = true;
        addLog(`每日签到成功，获得 ${data.reward} 铜钱。`);
        const slot = saveStore.activeSlot >= 0 ? saveStore.activeSlot : saveStore.assignNewSlot();
        if (slot >= 0)
            saveStore.saveToSlot(slot);
    }
    catch {
        addLog('签到失败，请稍后再试。');
    }
    finally {
        checkinBusy.value = false;
    }
};
// 注册天数标签获取器
_registerDayLabelGetter(() => `第${gameStore.year}年 ${SEASON_NAMES[gameStore.season]} 第${gameStore.day}天`);
/** 按天分组的日志（最新天在前，每天内也倒序） */
const groupedLogs = computed(() => {
    const groups = [];
    let currentLabel = null;
    for (const entry of logHistory.value) {
        if (entry.dayLabel !== currentLabel) {
            currentLabel = entry.dayLabel;
            groups.push({ label: currentLabel, messages: [] });
        }
        groups[groups.length - 1].messages.push(entry.msg);
    }
    for (const g of groups)
        g.messages.reverse();
    return groups.reverse();
});
// 实时时钟生命周期
onMounted(() => { startClock(); startAccountAutoSave(); void loadCheckinStatus(); void loadMails(); void autoSaveCurrent(); });
onUnmounted(() => { stopClock(); stopAccountAutoSave(); void autoSaveCurrent(); });
// 弹窗打开时自动暂停时钟，全部关闭后恢复
watch(() => !!(currentEvent.value ||
    pendingHeartEvent.value ||
    currentFestival.value ||
    pendingPerk.value ||
    pendingPetAdoption.value ||
    childProposalVisible.value ||
    pendingFarmEvent.value ||
    pendingDiscoveryScene.value ||
    showSleepConfirm.value), hasModal => {
    if (hasModal)
        pauseClock();
    else
        resumeClock();
});
/** 从路由名称获取当前面板标识 */
const currentPanel = computed(() => {
    return route.name ?? 'farm';
});
const sleepLabel = computed(() => {
    if (gameStore.hour >= 24)
        return '倒头就睡';
    if (gameStore.hour >= 20)
        return '回家休息';
    return '休息';
});
const sleepSummary = computed(() => {
    if (playerStore.stamina <= 0 || gameStore.hour >= 26) {
        return '你已经精疲力竭……将在原地昏倒。';
    }
    if (gameStore.hour >= 24) {
        return '已经过了午夜，拖着疲惫的身体回家……';
    }
    return '回到家中，安稳入睡。明日又是新的一天。';
});
const sleepWarning = computed(() => {
    const warnings = [];
    const homeStore = useHomeStore();
    const staminaBonus = homeStore.getStaminaRecoveryBonus();
    if (playerStore.stamina <= 0 || gameStore.hour >= 26) {
        const pct = Math.round(Math.min(PASSOUT_STAMINA_RECOVERY + staminaBonus, 1) * 100);
        const penaltyPct = Math.round(PASSOUT_MONEY_PENALTY_RATE * 100);
        if (pct < 100) {
            warnings.push(`体力仅恢复${pct}%，并损失${penaltyPct}%铜钱（上限${PASSOUT_MONEY_PENALTY_CAP}文）`);
        }
        else {
            warnings.push(`损失${penaltyPct}%铜钱（上限${PASSOUT_MONEY_PENALTY_CAP}文）`);
        }
    }
    else if (gameStore.hour >= 24) {
        const t = Math.min(Math.max(gameStore.hour - 24, 0), 1);
        const pct = Math.round(Math.min(LATE_NIGHT_RECOVERY_MAX - t * (LATE_NIGHT_RECOVERY_MAX - LATE_NIGHT_RECOVERY_MIN) + staminaBonus, 1) * 100);
        if (pct < 100) {
            warnings.push(`体力仅恢复${pct}%`);
        }
    }
    // 第28天换季警告：统计将枯萎的作物
    if (gameStore.day === 28) {
        const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];
        const nextSeason = SEASON_ORDER[(SEASON_ORDER.indexOf(gameStore.season) + 1) % 4];
        let willWitherCount = 0;
        let harvestableCount = 0;
        for (const plot of farmStore.plots) {
            if ((plot.state === 'planted' || plot.state === 'growing' || plot.state === 'harvestable') && plot.cropId) {
                const crop = getCropById(plot.cropId);
                if (crop && !crop.season.includes(nextSeason)) {
                    willWitherCount++;
                    if (plot.state === 'harvestable')
                        harvestableCount++;
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
    return warnings.join('\n');
});
/** 宠物领养 */
const petChoice = ref(null);
const petNameInput = ref('');
const confirmPetAdoption = () => {
    if (!petChoice.value)
        return;
    const animalStore = useAnimalStore();
    const defaultName = petChoice.value === 'cat' ? '小花' : '旺财';
    const name = petNameInput.value.trim() || defaultName;
    animalStore.adoptPet(petChoice.value, name);
    closePetAdoption();
    petChoice.value = null;
    petNameInput.value = '';
};
/** 子女提议回应 */
const proposalSpouseName = computed(() => {
    const spouse = npcStore.getSpouse();
    if (!spouse)
        return '配偶';
    return getNpcById(spouse.npcId)?.name ?? '配偶';
});
const handleChildProposalResponse = (response) => {
    const result = npcStore.respondToChildProposal(response);
    addLog(result.message);
    if (result.friendshipChange !== 0) {
        addLog(`(好感${result.friendshipChange > 0 ? '+' : ''}${result.friendshipChange})`);
    }
    closeChildProposal();
};
const inventoryStore = useInventoryStore();
const warehouseStore = useWarehouseStore();
const handleFarmEventChoice = (choice) => {
    addLog(choice.result);
    if (choice.effect) {
        switch (choice.effect.type) {
            case 'gainItem':
                inventoryStore.addItem(choice.effect.itemId, choice.effect.qty);
                break;
            case 'gainMoney':
                playerStore.earnMoney(choice.effect.amount);
                break;
            case 'gainFriendship':
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
const expandedVoidChestId = ref(null);
const voidDepositChestId = ref(null);
const voidChests = computed(() => warehouseStore.getVoidChests());
const voidChestCapacity = CHEST_DEFS.void.capacity;
const getItemName = (itemId) => getItemById(itemId)?.name ?? itemId;
const VOID_QUALITY_LABEL = {
    normal: '普通',
    fine: '优良',
    excellent: '精品',
    supreme: '极品'
};
const voidQualityClass = (q) => {
    if (q === 'fine')
        return 'text-quality-fine';
    if (q === 'excellent')
        return 'text-quality-excellent';
    if (q === 'supreme')
        return 'text-quality-supreme';
    return '';
};
const toggleVoidChest = (chestId) => {
    expandedVoidChestId.value = expandedVoidChestId.value === chestId ? null : chestId;
};
const openVoidDeposit = (chestId) => {
    voidDepositChestId.value = chestId;
    showVoidDepositModal.value = true;
};
const voidDepositableItems = computed(() => inventoryStore.items.filter(i => {
    if (i.locked)
        return false;
    const def = getItemById(i.itemId);
    return def && def.category !== 'seed';
}));
/** 背包中可一键存入的重复物品（虚空箱中已有且未锁定、非种子） */
const voidDuplicateDepositItems = computed(() => {
    if (!expandedVoidChestId.value)
        return [];
    const chest = warehouseStore.getChest(expandedVoidChestId.value);
    if (!chest)
        return [];
    const chestItemIds = new Set(chest.items.map(i => i.itemId));
    return inventoryStore.items.filter(i => {
        if (i.locked)
            return false;
        const def = getItemById(i.itemId);
        if (!def || def.category === 'seed')
            return false;
        return chestItemIds.has(i.itemId);
    });
});
/** 一键存入重复物品到虚空箱 */
const handleVoidDepositDuplicates = () => {
    if (!expandedVoidChestId.value)
        return;
    const chestId = expandedVoidChestId.value;
    const snapshot = voidDuplicateDepositItems.value.map(i => ({ itemId: i.itemId, quality: i.quality, quantity: i.quantity }));
    let totalDeposited = 0;
    let kindCount = 0;
    for (const item of snapshot) {
        const actual = warehouseStore.depositToChest(chestId, item.itemId, item.quantity, item.quality);
        if (actual > 0) {
            totalDeposited += actual;
            kindCount++;
        }
    }
    if (totalDeposited > 0) {
        addLog(`一键存入了${kindCount}种物品，共${totalDeposited}个到虚空箱。`);
    }
    else {
        addLog('虚空箱已满，无法存入。');
    }
};
/** 虚空箱道具信息弹窗 */
const voidItemDetail = ref(null);
const voidItemDef = computed(() => {
    if (!voidItemDetail.value)
        return null;
    return getItemById(voidItemDetail.value.itemId) ?? null;
});
const voidQtyModal = ref(null);
const voidQty = ref(1);
const openVoidQtyModal = (mode, chestId, itemId, quality, max) => {
    if (max <= 1) {
        // 数量为1时直接执行，不弹窗
        if (mode === 'withdraw')
            executeVoidWithdraw(chestId, itemId, quality, 1);
        else
            executeVoidDeposit(chestId, itemId, quality, 1);
        return;
    }
    voidQtyModal.value = { mode, chestId, itemId, quality, max };
    voidQty.value = max;
};
const setVoidQty = (val) => {
    if (!voidQtyModal.value)
        return;
    voidQty.value = Math.max(1, Math.min(val, voidQtyModal.value.max));
};
const addVoidQty = (delta) => setVoidQty(voidQty.value + delta);
const onVoidQtyInput = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val))
        setVoidQty(val);
};
const executeVoidWithdraw = (chestId, itemId, quality, qty) => {
    if (!warehouseStore.withdrawFromChest(chestId, itemId, qty, quality)) {
        addLog('背包已满，无法取出。');
        return;
    }
    addLog(`从虚空箱取出了${getItemName(itemId)}×${qty}。`);
};
const executeVoidDeposit = (chestId, itemId, quality, qty) => {
    const actualQty = warehouseStore.depositToChest(chestId, itemId, qty, quality);
    if (actualQty <= 0) {
        addLog('虚空箱已满，无法存入。');
        return;
    }
    addLog(`存入了${getItemName(itemId)}×${actualQty}到虚空箱。`);
    if (voidDepositableItems.value.length === 0 || warehouseStore.isChestFull(chestId)) {
        showVoidDepositModal.value = false;
    }
};
const confirmVoidQty = () => {
    if (!voidQtyModal.value)
        return;
    const { mode, chestId, itemId, quality } = voidQtyModal.value;
    if (mode === 'withdraw')
        executeVoidWithdraw(chestId, itemId, quality, voidQty.value);
    else
        executeVoidDeposit(chestId, itemId, quality, voidQty.value);
    voidQtyModal.value = null;
};
const confirmSleep = () => {
    showSleepConfirm.value = false;
    pauseClock();
    handleEndDay();
    switchToSeasonalBgm();
    resumeClock();
};
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['mobile-setting-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-log-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-map-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-map-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-void-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-void-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-log-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-log-btn']} */ ;
if (__VLS_ctx.gameStore.isGameStarted) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-2 md:space-y-4 h-screen p-2 md:p-4" },
        ...{ class: ({ 'py-10': __VLS_ctx.Capacitor.isNativePlatform() }) },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:space-y-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-screen']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:p-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-10']} */ ;
    const __VLS_0 = StatusBar;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        ...{ 'onRequestSleep': {} },
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onRequestSleep': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_5;
    const __VLS_6 = {
        /** @type {typeof __VLS_5.requestSleep} */
        onRequestSleep: (...[$event]) => {
            if (!(__VLS_ctx.gameStore.isGameStarted))
                throw 0;
            return __VLS_ctx.showSleepConfirm = true;
            // @ts-ignore
            [gameStore, Capacitor, showSleepConfirm,];
        },
    };
    var __VLS_3;
    var __VLS_4;
    const __VLS_7 = Button || Button;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({
        ...{ 'onClick': {} },
        ...{ class: "text-center justify-center !text-sm" },
        icon: (__VLS_ctx.Moon),
        iconSize: (12),
    }));
    const __VLS_9 = __VLS_8({
        ...{ 'onClick': {} },
        ...{ class: "text-center justify-center !text-sm" },
        icon: (__VLS_ctx.Moon),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    let __VLS_12;
    const __VLS_13 = {
        /** @type {typeof __VLS_12.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.gameStore.isGameStarted))
                throw 0;
            return __VLS_ctx.showSleepConfirm = true;
            // @ts-ignore
            [showSleepConfirm, Moon,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-sm']} */ ;
    const { default: __VLS_14 } = __VLS_10.slots;
    (__VLS_ctx.sleepLabel);
    // @ts-ignore
    [sleepLabel,];
    var __VLS_10;
    var __VLS_11;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel flex-1 min-h-0 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['min-h-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    let __VLS_15;
    /** @ts-ignore @type { | typeof __VLS_components.routerView | typeof __VLS_components.RouterView | typeof __VLS_components['router-view'] | typeof __VLS_components.routerView | typeof __VLS_components.RouterView | typeof __VLS_components['router-view']} */
    routerView;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent1(__VLS_15, new __VLS_15({}));
    const __VLS_17 = __VLS_16({}, ...__VLS_functionalComponentArgsRest(__VLS_16));
    {
        const { default: __VLS_20 } = __VLS_18.slots;
        const [{ Component }] = __VLS_vSlot(__VLS_20);
        let __VLS_21;
        /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
        Transition;
        // @ts-ignore
        const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
            name: "panel-fade",
            mode: "out-in",
        }));
        const __VLS_23 = __VLS_22({
            name: "panel-fade",
            mode: "out-in",
        }, ...__VLS_functionalComponentArgsRest(__VLS_22));
        const { default: __VLS_26 } = __VLS_24.slots;
        const __VLS_27 = (Component);
        // @ts-ignore
        const __VLS_28 = __VLS_asFunctionalComponent1(__VLS_27, new __VLS_27({
            key: (__VLS_ctx.$route.path),
        }));
        const __VLS_29 = __VLS_28({
            key: (__VLS_ctx.$route.path),
        }, ...__VLS_functionalComponentArgsRest(__VLS_28));
        // @ts-ignore
        [$route,];
        var __VLS_24;
        // @ts-ignore
        [];
        __VLS_18.slots['' /* empty slot name completion */];
    }
    var __VLS_18;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.gameStore.isGameStarted))
                    throw 0;
                return __VLS_ctx.showMobileMap = true;
                // @ts-ignore
                [showMobileMap,];
            } },
        ...{ class: "mobile-map-btn" },
    });
    /** @type {__VLS_StyleScopedClasses['mobile-map-btn']} */ ;
    let __VLS_32;
    /** @ts-ignore @type { | typeof __VLS_components.Map} */
    Map;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent1(__VLS_32, new __VLS_32({
        size: (20),
    }));
    const __VLS_34 = __VLS_33({
        size: (20),
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.gameStore.isGameStarted))
                    throw 0;
                return __VLS_ctx.showSettings = true;
                // @ts-ignore
                [showSettings,];
            } },
        ...{ class: "mobile-setting-btn" },
    });
    /** @type {__VLS_StyleScopedClasses['mobile-setting-btn']} */ ;
    let __VLS_37;
    /** @ts-ignore @type { | typeof __VLS_components.SettingsIcon} */
    SettingsIcon;
    // @ts-ignore
    const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({
        size: (20),
    }));
    const __VLS_39 = __VLS_38({
        size: (20),
    }, ...__VLS_functionalComponentArgsRest(__VLS_38));
    if (__VLS_ctx.warehouseStore.hasVoidChest) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.gameStore.isGameStarted))
                        throw 0;
                    if (!(__VLS_ctx.warehouseStore.hasVoidChest))
                        throw 0;
                    return __VLS_ctx.showVoidModal = true;
                    // @ts-ignore
                    [warehouseStore, showVoidModal,];
                } },
            ...{ class: "mobile-void-btn" },
        });
        /** @type {__VLS_StyleScopedClasses['mobile-void-btn']} */ ;
        let __VLS_42;
        /** @ts-ignore @type { | typeof __VLS_components.Archive} */
        Archive;
        // @ts-ignore
        const __VLS_43 = __VLS_asFunctionalComponent1(__VLS_42, new __VLS_42({
            size: (20),
        }));
        const __VLS_44 = __VLS_43({
            size: (20),
        }, ...__VLS_functionalComponentArgsRest(__VLS_43));
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.gameStore.isGameStarted))
                    throw 0;
                return __VLS_ctx.showLogModal = true;
                // @ts-ignore
                [showLogModal,];
            } },
        ...{ class: "mobile-log-btn" },
        ...{ class: ({ 'with-void': __VLS_ctx.warehouseStore.hasVoidChest }) },
    });
    /** @type {__VLS_StyleScopedClasses['mobile-log-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['with-void']} */ ;
    let __VLS_47;
    /** @ts-ignore @type { | typeof __VLS_components.History} */
    History;
    // @ts-ignore
    const __VLS_48 = __VLS_asFunctionalComponent1(__VLS_47, new __VLS_47({
        size: (20),
    }));
    const __VLS_49 = __VLS_48({
        size: (20),
    }, ...__VLS_functionalComponentArgsRest(__VLS_48));
    let __VLS_52;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent1(__VLS_52, new __VLS_52({
        name: "panel-fade",
    }));
    const __VLS_54 = __VLS_53({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    const { default: __VLS_57 } = __VLS_55.slots;
    if (__VLS_ctx.showMailModal) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.gameStore.isGameStarted))
                        throw 0;
                    if (!(__VLS_ctx.showMailModal))
                        throw 0;
                    return __VLS_ctx.showMailModal = false;
                    // @ts-ignore
                    [warehouseStore, showMailModal, showMailModal,];
                } },
            ...{ class: "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" },
        });
        /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-black/70']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "game-panel w-full max-w-2xl max-h-[82vh] overflow-y-auto space-y-3" },
        });
        /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-w-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-[82vh]']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between gap-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
            ...{ class: "text-accent text-lg" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
        const __VLS_58 = Button || Button;
        // @ts-ignore
        const __VLS_59 = __VLS_asFunctionalComponent1(__VLS_58, new __VLS_58({
            ...{ 'onClick': {} },
        }));
        const __VLS_60 = __VLS_59({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_59));
        let __VLS_63;
        const __VLS_64 = {
            /** @type {typeof __VLS_63.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.gameStore.isGameStarted))
                    throw 0;
                if (!(__VLS_ctx.showMailModal))
                    throw 0;
                return __VLS_ctx.showMailModal = false;
                // @ts-ignore
                [showMailModal,];
            },
        };
        const { default: __VLS_65 } = __VLS_61.slots;
        // @ts-ignore
        [];
        var __VLS_61;
        var __VLS_62;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        if (__VLS_ctx.mailLoading) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-sm text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        }
        else if (__VLS_ctx.mails.length === 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-sm text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        }
        for (const [mail] of __VLS_vFor((__VLS_ctx.mails))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (mail.id),
                ...{ class: "border border-accent/20 rounded-xs p-3 space-y-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-wrap justify-between gap-2" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            (mail.title);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (__VLS_ctx.formatMailTime(mail.createdAt));
            (mail.from || '系统');
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs" },
                ...{ class: (mail.claimed ? 'text-muted' : 'text-accent') },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (mail.claimed ? '已领取' : '未领取');
            if (mail.content) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm whitespace-pre-wrap" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['whitespace-pre-wrap']} */ ;
                (mail.content);
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (__VLS_ctx.mailRewardText(mail.rewards));
            if (!mail.claimed) {
                const __VLS_66 = Button || Button;
                // @ts-ignore
                const __VLS_67 = __VLS_asFunctionalComponent1(__VLS_66, new __VLS_66({
                    ...{ 'onClick': {} },
                    ...{ class: "w-full justify-center" },
                }));
                const __VLS_68 = __VLS_67({
                    ...{ 'onClick': {} },
                    ...{ class: "w-full justify-center" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_67));
                let __VLS_71;
                const __VLS_72 = {
                    /** @type {typeof __VLS_71.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.gameStore.isGameStarted))
                            throw 0;
                        if (!(__VLS_ctx.showMailModal))
                            throw 0;
                        if (!(!mail.claimed))
                            throw 0;
                        return __VLS_ctx.claimMail(mail);
                        // @ts-ignore
                        [mailLoading, mails, mails, formatMailTime, mailRewardText, claimMail,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                const { default: __VLS_73 } = __VLS_69.slots;
                // @ts-ignore
                [];
                var __VLS_69;
                var __VLS_70;
            }
            // @ts-ignore
            [];
        }
    }
    // @ts-ignore
    [];
    var __VLS_55;
    let __VLS_74;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_75 = __VLS_asFunctionalComponent1(__VLS_74, new __VLS_74({
        name: "panel-fade",
    }));
    const __VLS_76 = __VLS_75({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_75));
    const { default: __VLS_79 } = __VLS_77.slots;
    if (__VLS_ctx.worldAnnouncement) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
        /** @type {__VLS_StyleScopedClasses['top-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['left-1/2']} */ ;
        /** @type {__VLS_StyleScopedClasses['-translate-x-1/2']} */ ;
        /** @type {__VLS_StyleScopedClasses['z-[100]']} */ ;
        /** @type {__VLS_StyleScopedClasses['pointer-events-none']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "bg-accent/90 text-bg px-4 py-2 rounded-xs text-sm font-bold whitespace-nowrap shadow-lg" },
        });
        /** @type {__VLS_StyleScopedClasses['bg-accent/90']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-bg']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
        (__VLS_ctx.worldAnnouncement);
    }
    // @ts-ignore
    [worldAnnouncement, worldAnnouncement,];
    var __VLS_77;
    const __VLS_80 = SettingsDialog;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent1(__VLS_80, new __VLS_80({
        ...{ 'onClose': {} },
        open: (__VLS_ctx.showSettings),
    }));
    const __VLS_82 = __VLS_81({
        ...{ 'onClose': {} },
        open: (__VLS_ctx.showSettings),
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    let __VLS_85;
    const __VLS_86 = {
        /** @type {typeof __VLS_85.close} */
        onClose: (...[$event]) => {
            if (!(__VLS_ctx.gameStore.isGameStarted))
                throw 0;
            return __VLS_ctx.showSettings = false;
            // @ts-ignore
            [showSettings, showSettings,];
        },
    };
    var __VLS_83;
    var __VLS_84;
    if (__VLS_ctx.showSaveManager) {
        const __VLS_87 = SaveManager;
        // @ts-ignore
        const __VLS_88 = __VLS_asFunctionalComponent1(__VLS_87, new __VLS_87({
            ...{ 'onClose': {} },
        }));
        const __VLS_89 = __VLS_88({
            ...{ 'onClose': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_88));
        let __VLS_92;
        const __VLS_93 = {
            /** @type {typeof __VLS_92.close} */
            onClose: (...[$event]) => {
                if (!(__VLS_ctx.gameStore.isGameStarted))
                    throw 0;
                if (!(__VLS_ctx.showSaveManager))
                    throw 0;
                return __VLS_ctx.showSaveManager = false;
                // @ts-ignore
                [showSaveManager, showSaveManager,];
            },
        };
        var __VLS_90;
        var __VLS_91;
    }
    const __VLS_94 = MobileMapMenu;
    // @ts-ignore
    const __VLS_95 = __VLS_asFunctionalComponent1(__VLS_94, new __VLS_94({
        ...{ 'onCheckin': {} },
        ...{ 'onOpenMail': {} },
        ...{ 'onOpenLeaderboard': {} },
        ...{ 'onOpenCombat': {} },
        ...{ 'onOpenForge': {} },
        ...{ 'onOpenSect': {} },
        ...{ 'onClose': {} },
        open: (__VLS_ctx.showMobileMap),
        current: (__VLS_ctx.currentPanel),
        checkinChecked: (__VLS_ctx.checkinChecked),
        checkinBusy: (__VLS_ctx.checkinBusy),
        unclaimedMailCount: (__VLS_ctx.unclaimedMailCount),
    }));
    const __VLS_96 = __VLS_95({
        ...{ 'onCheckin': {} },
        ...{ 'onOpenMail': {} },
        ...{ 'onOpenLeaderboard': {} },
        ...{ 'onOpenCombat': {} },
        ...{ 'onOpenForge': {} },
        ...{ 'onOpenSect': {} },
        ...{ 'onClose': {} },
        open: (__VLS_ctx.showMobileMap),
        current: (__VLS_ctx.currentPanel),
        checkinChecked: (__VLS_ctx.checkinChecked),
        checkinBusy: (__VLS_ctx.checkinBusy),
        unclaimedMailCount: (__VLS_ctx.unclaimedMailCount),
    }, ...__VLS_functionalComponentArgsRest(__VLS_95));
    let __VLS_99;
    const __VLS_100 = {
        /** @type {typeof __VLS_99.checkin} */
        onCheckin: (__VLS_ctx.dailyCheckin),
    };
    const __VLS_101 = {
        /** @type {typeof __VLS_99.openMail} */
        onOpenMail: (__VLS_ctx.openMailModal),
    };
    const __VLS_102 = {
        /** @type {typeof __VLS_99.openLeaderboard} */
        onOpenLeaderboard: (__VLS_ctx.openLeaderboard),
    };
    const __VLS_103 = {
        /** @type {typeof __VLS_99.openCombat} */
        onOpenCombat: (__VLS_ctx.openCombat),
    };
    const __VLS_104 = {
        /** @type {typeof __VLS_99.openForge} */
        onOpenForge: (__VLS_ctx.openForge),
    };
    const __VLS_105 = {
        /** @type {typeof __VLS_99.openSect} */
        onOpenSect: (__VLS_ctx.openSect),
    };
    const __VLS_106 = {
        /** @type {typeof __VLS_99.close} */
        onClose: (...[$event]) => {
            if (!(__VLS_ctx.gameStore.isGameStarted))
                throw 0;
            return __VLS_ctx.showMobileMap = false;
            // @ts-ignore
            [showMobileMap, showMobileMap, currentPanel, checkinChecked, checkinBusy, unclaimedMailCount, dailyCheckin, openMailModal, openLeaderboard, openCombat, openForge, openSect,];
        },
    };
    var __VLS_97;
    var __VLS_98;
    let __VLS_107;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_108 = __VLS_asFunctionalComponent1(__VLS_107, new __VLS_107({
        name: "panel-fade",
    }));
    const __VLS_109 = __VLS_108({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_108));
    const { default: __VLS_112 } = __VLS_110.slots;
    if (__VLS_ctx.currentEvent) {
        const __VLS_113 = EventDialog;
        // @ts-ignore
        const __VLS_114 = __VLS_asFunctionalComponent1(__VLS_113, new __VLS_113({
            ...{ 'onClose': {} },
            event: (__VLS_ctx.currentEvent),
        }));
        const __VLS_115 = __VLS_114({
            ...{ 'onClose': {} },
            event: (__VLS_ctx.currentEvent),
        }, ...__VLS_functionalComponentArgsRest(__VLS_114));
        let __VLS_118;
        const __VLS_119 = {
            /** @type {typeof __VLS_118.close} */
            onClose: (__VLS_ctx.closeEvent),
        };
        var __VLS_116;
        var __VLS_117;
    }
    // @ts-ignore
    [currentEvent, currentEvent, closeEvent,];
    var __VLS_110;
    let __VLS_120;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent1(__VLS_120, new __VLS_120({
        name: "panel-fade",
    }));
    const __VLS_122 = __VLS_121({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    const { default: __VLS_125 } = __VLS_123.slots;
    if (__VLS_ctx.pendingHeartEvent) {
        const __VLS_126 = HeartEventDialog;
        // @ts-ignore
        const __VLS_127 = __VLS_asFunctionalComponent1(__VLS_126, new __VLS_126({
            ...{ 'onClose': {} },
            event: (__VLS_ctx.pendingHeartEvent),
        }));
        const __VLS_128 = __VLS_127({
            ...{ 'onClose': {} },
            event: (__VLS_ctx.pendingHeartEvent),
        }, ...__VLS_functionalComponentArgsRest(__VLS_127));
        let __VLS_131;
        const __VLS_132 = {
            /** @type {typeof __VLS_131.close} */
            onClose: (__VLS_ctx.closeHeartEvent),
        };
        var __VLS_129;
        var __VLS_130;
    }
    // @ts-ignore
    [pendingHeartEvent, pendingHeartEvent, closeHeartEvent,];
    var __VLS_123;
    let __VLS_133;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_134 = __VLS_asFunctionalComponent1(__VLS_133, new __VLS_133({
        name: "panel-fade",
    }));
    const __VLS_135 = __VLS_134({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_134));
    const { default: __VLS_138 } = __VLS_136.slots;
    if (__VLS_ctx.pendingDiscoveryScene) {
        const __VLS_139 = DiscoveryScene;
        // @ts-ignore
        const __VLS_140 = __VLS_asFunctionalComponent1(__VLS_139, new __VLS_139({
            ...{ 'onClose': {} },
            npcId: (__VLS_ctx.pendingDiscoveryScene.npcId),
            step: (__VLS_ctx.pendingDiscoveryScene.step),
        }));
        const __VLS_141 = __VLS_140({
            ...{ 'onClose': {} },
            npcId: (__VLS_ctx.pendingDiscoveryScene.npcId),
            step: (__VLS_ctx.pendingDiscoveryScene.step),
        }, ...__VLS_functionalComponentArgsRest(__VLS_140));
        let __VLS_144;
        const __VLS_145 = {
            /** @type {typeof __VLS_144.close} */
            onClose: (__VLS_ctx.closeDiscoveryScene),
        };
        var __VLS_142;
        var __VLS_143;
    }
    // @ts-ignore
    [pendingDiscoveryScene, pendingDiscoveryScene, pendingDiscoveryScene, closeDiscoveryScene,];
    var __VLS_136;
    let __VLS_146;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_147 = __VLS_asFunctionalComponent1(__VLS_146, new __VLS_146({
        name: "panel-fade",
    }));
    const __VLS_148 = __VLS_147({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_147));
    const { default: __VLS_151 } = __VLS_149.slots;
    if (__VLS_ctx.currentFestival) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" },
        });
        /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-black/70']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
        if (__VLS_ctx.currentFestival === 'fishing_contest') {
            const __VLS_152 = FishingContestView;
            // @ts-ignore
            const __VLS_153 = __VLS_asFunctionalComponent1(__VLS_152, new __VLS_152({
                ...{ 'onComplete': {} },
            }));
            const __VLS_154 = __VLS_153({
                ...{ 'onComplete': {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_153));
            let __VLS_157;
            const __VLS_158 = {
                /** @type {typeof __VLS_157.complete} */
                onComplete: (__VLS_ctx.closeFestival),
            };
            var __VLS_155;
            var __VLS_156;
        }
        if (__VLS_ctx.currentFestival === 'harvest_fair') {
            const __VLS_159 = HarvestFairView;
            // @ts-ignore
            const __VLS_160 = __VLS_asFunctionalComponent1(__VLS_159, new __VLS_159({
                ...{ 'onComplete': {} },
            }));
            const __VLS_161 = __VLS_160({
                ...{ 'onComplete': {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_160));
            let __VLS_164;
            const __VLS_165 = {
                /** @type {typeof __VLS_164.complete} */
                onComplete: (__VLS_ctx.closeFestival),
            };
            var __VLS_162;
            var __VLS_163;
        }
        if (__VLS_ctx.currentFestival === 'dragon_boat') {
            const __VLS_166 = DragonBoatView;
            // @ts-ignore
            const __VLS_167 = __VLS_asFunctionalComponent1(__VLS_166, new __VLS_166({
                ...{ 'onComplete': {} },
            }));
            const __VLS_168 = __VLS_167({
                ...{ 'onComplete': {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_167));
            let __VLS_171;
            const __VLS_172 = {
                /** @type {typeof __VLS_171.complete} */
                onComplete: (__VLS_ctx.closeFestival),
            };
            var __VLS_169;
            var __VLS_170;
        }
        if (__VLS_ctx.currentFestival === 'lantern_riddle') {
            const __VLS_173 = LanternRiddleView;
            // @ts-ignore
            const __VLS_174 = __VLS_asFunctionalComponent1(__VLS_173, new __VLS_173({
                ...{ 'onComplete': {} },
            }));
            const __VLS_175 = __VLS_174({
                ...{ 'onComplete': {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_174));
            let __VLS_178;
            const __VLS_179 = {
                /** @type {typeof __VLS_178.complete} */
                onComplete: (__VLS_ctx.closeFestival),
            };
            var __VLS_176;
            var __VLS_177;
        }
        if (__VLS_ctx.currentFestival === 'pot_throwing') {
            const __VLS_180 = PotThrowingView;
            // @ts-ignore
            const __VLS_181 = __VLS_asFunctionalComponent1(__VLS_180, new __VLS_180({
                ...{ 'onComplete': {} },
            }));
            const __VLS_182 = __VLS_181({
                ...{ 'onComplete': {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_181));
            let __VLS_185;
            const __VLS_186 = {
                /** @type {typeof __VLS_185.complete} */
                onComplete: (__VLS_ctx.closeFestival),
            };
            var __VLS_183;
            var __VLS_184;
        }
        if (__VLS_ctx.currentFestival === 'dumpling_making') {
            const __VLS_187 = DumplingMakingView;
            // @ts-ignore
            const __VLS_188 = __VLS_asFunctionalComponent1(__VLS_187, new __VLS_187({
                ...{ 'onComplete': {} },
            }));
            const __VLS_189 = __VLS_188({
                ...{ 'onComplete': {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_188));
            let __VLS_192;
            const __VLS_193 = {
                /** @type {typeof __VLS_192.complete} */
                onComplete: (__VLS_ctx.closeFestival),
            };
            var __VLS_190;
            var __VLS_191;
        }
        if (__VLS_ctx.currentFestival === 'firework_show') {
            const __VLS_194 = FireworkShowView;
            // @ts-ignore
            const __VLS_195 = __VLS_asFunctionalComponent1(__VLS_194, new __VLS_194({
                ...{ 'onComplete': {} },
            }));
            const __VLS_196 = __VLS_195({
                ...{ 'onComplete': {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_195));
            let __VLS_199;
            const __VLS_200 = {
                /** @type {typeof __VLS_199.complete} */
                onComplete: (__VLS_ctx.closeFestival),
            };
            var __VLS_197;
            var __VLS_198;
        }
        if (__VLS_ctx.currentFestival === 'tea_contest') {
            const __VLS_201 = TeaContestView;
            // @ts-ignore
            const __VLS_202 = __VLS_asFunctionalComponent1(__VLS_201, new __VLS_201({
                ...{ 'onComplete': {} },
            }));
            const __VLS_203 = __VLS_202({
                ...{ 'onComplete': {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_202));
            let __VLS_206;
            const __VLS_207 = {
                /** @type {typeof __VLS_206.complete} */
                onComplete: (__VLS_ctx.closeFestival),
            };
            var __VLS_204;
            var __VLS_205;
        }
        if (__VLS_ctx.currentFestival === 'kite_flying') {
            const __VLS_208 = KiteFlyingView;
            // @ts-ignore
            const __VLS_209 = __VLS_asFunctionalComponent1(__VLS_208, new __VLS_208({
                ...{ 'onComplete': {} },
            }));
            const __VLS_210 = __VLS_209({
                ...{ 'onComplete': {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_209));
            let __VLS_213;
            const __VLS_214 = {
                /** @type {typeof __VLS_213.complete} */
                onComplete: (__VLS_ctx.closeFestival),
            };
            var __VLS_211;
            var __VLS_212;
        }
    }
    // @ts-ignore
    [currentFestival, currentFestival, currentFestival, currentFestival, currentFestival, currentFestival, currentFestival, currentFestival, currentFestival, currentFestival, closeFestival, closeFestival, closeFestival, closeFestival, closeFestival, closeFestival, closeFestival, closeFestival, closeFestival,];
    var __VLS_149;
    let __VLS_215;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_216 = __VLS_asFunctionalComponent1(__VLS_215, new __VLS_215({
        name: "panel-fade",
    }));
    const __VLS_217 = __VLS_216({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_216));
    const { default: __VLS_220 } = __VLS_218.slots;
    if (__VLS_ctx.pendingPerk) {
        const __VLS_221 = PerkSelectDialog;
        // @ts-ignore
        const __VLS_222 = __VLS_asFunctionalComponent1(__VLS_221, new __VLS_221({
            ...{ 'onSelect': {} },
            skillType: (__VLS_ctx.pendingPerk.skillType),
            level: (__VLS_ctx.pendingPerk.level),
        }));
        const __VLS_223 = __VLS_222({
            ...{ 'onSelect': {} },
            skillType: (__VLS_ctx.pendingPerk.skillType),
            level: (__VLS_ctx.pendingPerk.level),
        }, ...__VLS_functionalComponentArgsRest(__VLS_222));
        let __VLS_226;
        const __VLS_227 = {
            /** @type {typeof __VLS_226.select} */
            onSelect: (__VLS_ctx.handlePerkSelect),
        };
        var __VLS_224;
        var __VLS_225;
    }
    // @ts-ignore
    [pendingPerk, pendingPerk, pendingPerk, handlePerkSelect,];
    var __VLS_218;
    let __VLS_228;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_229 = __VLS_asFunctionalComponent1(__VLS_228, new __VLS_228({
        name: "panel-fade",
    }));
    const __VLS_230 = __VLS_229({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_229));
    const { default: __VLS_233 } = __VLS_231.slots;
    if (__VLS_ctx.pendingPetAdoption) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" },
        });
        /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-black/70']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "game-panel max-w-xs w-full text-center" },
        });
        /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        const __VLS_234 = Divider;
        // @ts-ignore
        const __VLS_235 = __VLS_asFunctionalComponent1(__VLS_234, new __VLS_234({
            title: true,
            label: "小动物来访",
        }));
        const __VLS_236 = __VLS_235({
            title: true,
            label: "小动物来访",
        }, ...__VLS_functionalComponentArgsRest(__VLS_235));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs leading-relaxed mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-3 justify-center mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        const __VLS_239 = Button || Button;
        // @ts-ignore
        const __VLS_240 = __VLS_asFunctionalComponent1(__VLS_239, new __VLS_239({
            ...{ 'onClick': {} },
            ...{ class: (__VLS_ctx.petChoice === 'cat' ? '!bg-accent !text-bg' : '') },
        }));
        const __VLS_241 = __VLS_240({
            ...{ 'onClick': {} },
            ...{ class: (__VLS_ctx.petChoice === 'cat' ? '!bg-accent !text-bg' : '') },
        }, ...__VLS_functionalComponentArgsRest(__VLS_240));
        let __VLS_244;
        const __VLS_245 = {
            /** @type {typeof __VLS_244.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.gameStore.isGameStarted))
                    throw 0;
                if (!(__VLS_ctx.pendingPetAdoption))
                    throw 0;
                return __VLS_ctx.petChoice = 'cat';
                // @ts-ignore
                [pendingPetAdoption, petChoice, petChoice,];
            },
        };
        const { default: __VLS_246 } = __VLS_242.slots;
        // @ts-ignore
        [];
        var __VLS_242;
        var __VLS_243;
        const __VLS_247 = Button || Button;
        // @ts-ignore
        const __VLS_248 = __VLS_asFunctionalComponent1(__VLS_247, new __VLS_247({
            ...{ 'onClick': {} },
            ...{ class: (__VLS_ctx.petChoice === 'dog' ? '!bg-accent !text-bg' : '') },
        }));
        const __VLS_249 = __VLS_248({
            ...{ 'onClick': {} },
            ...{ class: (__VLS_ctx.petChoice === 'dog' ? '!bg-accent !text-bg' : '') },
        }, ...__VLS_functionalComponentArgsRest(__VLS_248));
        let __VLS_252;
        const __VLS_253 = {
            /** @type {typeof __VLS_252.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.gameStore.isGameStarted))
                    throw 0;
                if (!(__VLS_ctx.pendingPetAdoption))
                    throw 0;
                return __VLS_ctx.petChoice = 'dog';
                // @ts-ignore
                [petChoice, petChoice,];
            },
        };
        const { default: __VLS_254 } = __VLS_250.slots;
        // @ts-ignore
        [];
        var __VLS_250;
        var __VLS_251;
        if (__VLS_ctx.petChoice) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mb-3" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ class: "w-full bg-bg border border-accent/30 rounded-xs px-2 py-1 text-xs text-text focus:border-accent accent outline-none placeholder:text-muted/40 transition-colors" },
                placeholder: (__VLS_ctx.petChoice === 'cat' ? '小花' : '旺财'),
                maxlength: "8",
            });
            (__VLS_ctx.petNameInput);
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
            /** @type {__VLS_StyleScopedClasses['focus:border-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['outline-none']} */ ;
            /** @type {__VLS_StyleScopedClasses['placeholder:text-muted/40']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
        }
        const __VLS_255 = Button || Button;
        // @ts-ignore
        const __VLS_256 = __VLS_asFunctionalComponent1(__VLS_255, new __VLS_255({
            ...{ 'onClick': {} },
            disabled: (!__VLS_ctx.petChoice),
        }));
        const __VLS_257 = __VLS_256({
            ...{ 'onClick': {} },
            disabled: (!__VLS_ctx.petChoice),
        }, ...__VLS_functionalComponentArgsRest(__VLS_256));
        let __VLS_260;
        const __VLS_261 = {
            /** @type {typeof __VLS_260.click} */
            onClick: (__VLS_ctx.confirmPetAdoption),
        };
        const { default: __VLS_262 } = __VLS_258.slots;
        // @ts-ignore
        [petChoice, petChoice, petChoice, petNameInput, confirmPetAdoption,];
        var __VLS_258;
        var __VLS_259;
    }
    // @ts-ignore
    [];
    var __VLS_231;
    let __VLS_263;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_264 = __VLS_asFunctionalComponent1(__VLS_263, new __VLS_263({
        name: "panel-fade",
    }));
    const __VLS_265 = __VLS_264({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_264));
    const { default: __VLS_268 } = __VLS_266.slots;
    if (__VLS_ctx.childProposalVisible) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" },
        });
        /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-black/70']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "game-panel max-w-xs w-full text-center" },
        });
        /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        const __VLS_269 = Divider;
        // @ts-ignore
        const __VLS_270 = __VLS_asFunctionalComponent1(__VLS_269, new __VLS_269({
            title: true,
            label: "家庭提议",
        }));
        const __VLS_271 = __VLS_270({
            title: true,
            label: "家庭提议",
        }, ...__VLS_functionalComponentArgsRest(__VLS_270));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs leading-relaxed mb-4" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
        (__VLS_ctx.proposalSpouseName);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
        const __VLS_274 = Button || Button;
        // @ts-ignore
        const __VLS_275 = __VLS_asFunctionalComponent1(__VLS_274, new __VLS_274({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
        }));
        const __VLS_276 = __VLS_275({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_275));
        let __VLS_279;
        const __VLS_280 = {
            /** @type {typeof __VLS_279.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.gameStore.isGameStarted))
                    throw 0;
                if (!(__VLS_ctx.childProposalVisible))
                    throw 0;
                return __VLS_ctx.handleChildProposalResponse('accept');
                // @ts-ignore
                [childProposalVisible, proposalSpouseName, handleChildProposalResponse,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_281 } = __VLS_277.slots;
        // @ts-ignore
        [];
        var __VLS_277;
        var __VLS_278;
        const __VLS_282 = Button || Button;
        // @ts-ignore
        const __VLS_283 = __VLS_asFunctionalComponent1(__VLS_282, new __VLS_282({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
        }));
        const __VLS_284 = __VLS_283({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_283));
        let __VLS_287;
        const __VLS_288 = {
            /** @type {typeof __VLS_287.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.gameStore.isGameStarted))
                    throw 0;
                if (!(__VLS_ctx.childProposalVisible))
                    throw 0;
                return __VLS_ctx.handleChildProposalResponse('wait');
                // @ts-ignore
                [handleChildProposalResponse,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_289 } = __VLS_285.slots;
        // @ts-ignore
        [];
        var __VLS_285;
        var __VLS_286;
        const __VLS_290 = Button || Button;
        // @ts-ignore
        const __VLS_291 = __VLS_asFunctionalComponent1(__VLS_290, new __VLS_290({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center text-muted" },
        }));
        const __VLS_292 = __VLS_291({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center text-muted" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_291));
        let __VLS_295;
        const __VLS_296 = {
            /** @type {typeof __VLS_295.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.gameStore.isGameStarted))
                    throw 0;
                if (!(__VLS_ctx.childProposalVisible))
                    throw 0;
                return __VLS_ctx.handleChildProposalResponse('decline');
                // @ts-ignore
                [handleChildProposalResponse,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        const { default: __VLS_297 } = __VLS_293.slots;
        // @ts-ignore
        [];
        var __VLS_293;
        var __VLS_294;
    }
    // @ts-ignore
    [];
    var __VLS_266;
    let __VLS_298;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_299 = __VLS_asFunctionalComponent1(__VLS_298, new __VLS_298({
        name: "panel-fade",
    }));
    const __VLS_300 = __VLS_299({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_299));
    const { default: __VLS_303 } = __VLS_301.slots;
    if (__VLS_ctx.pendingFarmEvent) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" },
        });
        /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-black/70']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "game-panel max-w-xs w-full text-center" },
        });
        /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs leading-relaxed mb-4" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
        (__VLS_ctx.pendingFarmEvent.message);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
        for (const [c, i] of __VLS_vFor((__VLS_ctx.pendingFarmEvent.choices))) {
            const __VLS_304 = Button || Button;
            // @ts-ignore
            const __VLS_305 = __VLS_asFunctionalComponent1(__VLS_304, new __VLS_304({
                ...{ 'onClick': {} },
                key: (i),
                ...{ class: "w-full justify-center" },
            }));
            const __VLS_306 = __VLS_305({
                ...{ 'onClick': {} },
                key: (i),
                ...{ class: "w-full justify-center" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_305));
            let __VLS_309;
            const __VLS_310 = {
                /** @type {typeof __VLS_309.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.gameStore.isGameStarted))
                        throw 0;
                    if (!(__VLS_ctx.pendingFarmEvent))
                        throw 0;
                    return __VLS_ctx.handleFarmEventChoice(c);
                    // @ts-ignore
                    [pendingFarmEvent, pendingFarmEvent, pendingFarmEvent, handleFarmEventChoice,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            const { default: __VLS_311 } = __VLS_307.slots;
            (c.label);
            // @ts-ignore
            [];
            var __VLS_307;
            var __VLS_308;
            // @ts-ignore
            [];
        }
    }
    // @ts-ignore
    [];
    var __VLS_301;
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
    if (__VLS_ctx.showVoidModal) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.gameStore.isGameStarted))
                        throw 0;
                    if (!(__VLS_ctx.showVoidModal))
                        throw 0;
                    return __VLS_ctx.showVoidModal = false;
                    // @ts-ignore
                    [showVoidModal, showVoidModal,];
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
        let __VLS_318;
        /** @ts-ignore @type { | typeof __VLS_components.Archive} */
        Archive;
        // @ts-ignore
        const __VLS_319 = __VLS_asFunctionalComponent1(__VLS_318, new __VLS_318({
            size: (14),
            ...{ class: "inline" },
        }));
        const __VLS_320 = __VLS_319({
            size: (14),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_319));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        const __VLS_323 = Button;
        // @ts-ignore
        const __VLS_324 = __VLS_asFunctionalComponent1(__VLS_323, new __VLS_323({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
            icon: (__VLS_ctx.X),
            iconSize: (12),
        }));
        const __VLS_325 = __VLS_324({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
            icon: (__VLS_ctx.X),
            iconSize: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_324));
        let __VLS_328;
        const __VLS_329 = {
            /** @type {typeof __VLS_328.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.gameStore.isGameStarted))
                    throw 0;
                if (!(__VLS_ctx.showVoidModal))
                    throw 0;
                return __VLS_ctx.showVoidModal = false;
                // @ts-ignore
                [showVoidModal, X,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        var __VLS_326;
        var __VLS_327;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
        for (const [vc] of __VLS_vFor((__VLS_ctx.voidChests))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.gameStore.isGameStarted))
                            throw 0;
                        if (!(__VLS_ctx.showVoidModal))
                            throw 0;
                        return __VLS_ctx.toggleVoidChest(vc.id);
                        // @ts-ignore
                        [voidChests, toggleVoidChest,];
                    } },
                key: (vc.id),
                ...{ class: "border border-accent/10 rounded-xs p-2 cursor-pointer" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-quality-supreme" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-quality-supreme']} */ ;
            (vc.label);
            if (vc.voidRole === 'input') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] px-1 border border-accent/30 rounded-xs text-accent" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            }
            if (vc.voidRole === 'output') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] px-1 border border-accent/30 rounded-xs text-accent" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (vc.items.length);
            (__VLS_ctx.voidChestCapacity);
            if (__VLS_ctx.expandedVoidChestId === vc.id) {
                if (vc.items.length > 0) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex flex-col space-y-0.5 mb-1.5 max-h-36 overflow-y-auto" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
                    /** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['max-h-36']} */ ;
                    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
                    for (const [item, idx] of __VLS_vFor((vc.items))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ onClick: (...[$event]) => {
                                    if (!(__VLS_ctx.gameStore.isGameStarted))
                                        throw 0;
                                    if (!(__VLS_ctx.showVoidModal))
                                        throw 0;
                                    if (!(__VLS_ctx.expandedVoidChestId === vc.id))
                                        throw 0;
                                    if (!(vc.items.length > 0))
                                        throw 0;
                                    return __VLS_ctx.voidItemDetail = { itemId: item.itemId, quality: item.quality, quantity: item.quantity };
                                    // @ts-ignore
                                    [voidChestCapacity, expandedVoidChestId, voidItemDetail,];
                                } },
                            key: (idx),
                            ...{ class: "flex items-center justify-between px-2 py-0.5 border border-accent/5 rounded-xs mr-1" },
                        });
                        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                        /** @type {__VLS_StyleScopedClasses['border']} */ ;
                        /** @type {__VLS_StyleScopedClasses['border-accent/5']} */ ;
                        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "text-[10px] truncate mr-2 cursor-pointer hover:underline" },
                            ...{ class: (__VLS_ctx.voidQualityClass(item.quality)) },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                        /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
                        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
                        /** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
                        (__VLS_ctx.getItemName(item.itemId));
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "text-[10px] text-muted" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                        (item.quantity);
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "flex items-center space-x-1" },
                        });
                        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
                        const __VLS_330 = Button || Button;
                        // @ts-ignore
                        const __VLS_331 = __VLS_asFunctionalComponent1(__VLS_330, new __VLS_330({
                            ...{ 'onClick': {} },
                            ...{ class: "py-0 px-1 text-[10px]" },
                        }));
                        const __VLS_332 = __VLS_331({
                            ...{ 'onClick': {} },
                            ...{ class: "py-0 px-1 text-[10px]" },
                        }, ...__VLS_functionalComponentArgsRest(__VLS_331));
                        let __VLS_335;
                        const __VLS_336 = {
                            /** @type {typeof __VLS_335.click} */
                            onClick: (...[$event]) => {
                                if (!(__VLS_ctx.gameStore.isGameStarted))
                                    throw 0;
                                if (!(__VLS_ctx.showVoidModal))
                                    throw 0;
                                if (!(__VLS_ctx.expandedVoidChestId === vc.id))
                                    throw 0;
                                if (!(vc.items.length > 0))
                                    throw 0;
                                return __VLS_ctx.openVoidQtyModal('withdraw', vc.id, item.itemId, item.quality, item.quantity);
                                // @ts-ignore
                                [voidQualityClass, getItemName, openVoidQtyModal,];
                            },
                        };
                        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
                        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                        const { default: __VLS_337 } = __VLS_333.slots;
                        // @ts-ignore
                        [];
                        var __VLS_333;
                        var __VLS_334;
                        // @ts-ignore
                        [];
                    }
                }
                else {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex flex-col items-center justify-center py-4" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
                    let __VLS_338;
                    /** @ts-ignore @type { | typeof __VLS_components.Archive} */
                    Archive;
                    // @ts-ignore
                    const __VLS_339 = __VLS_asFunctionalComponent1(__VLS_338, new __VLS_338({
                        size: (28),
                        ...{ class: "text-accent/20 mb-1.5" },
                    }));
                    const __VLS_340 = __VLS_339({
                        size: (28),
                        ...{ class: "text-accent/20 mb-1.5" },
                    }, ...__VLS_functionalComponentArgsRest(__VLS_339));
                    /** @type {__VLS_StyleScopedClasses['text-accent/20']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-[10px] text-muted" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-[10px] text-muted/50 mt-0.5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                }
                if (__VLS_ctx.voidDuplicateDepositItems.length > 0) {
                    const __VLS_343 = Button || Button;
                    // @ts-ignore
                    const __VLS_344 = __VLS_asFunctionalComponent1(__VLS_343, new __VLS_343({
                        ...{ 'onClick': {} },
                        ...{ class: "w-full text-[10px] mb-1" },
                        icon: (__VLS_ctx.ArrowDownToLine),
                        iconSize: (10),
                    }));
                    const __VLS_345 = __VLS_344({
                        ...{ 'onClick': {} },
                        ...{ class: "w-full text-[10px] mb-1" },
                        icon: (__VLS_ctx.ArrowDownToLine),
                        iconSize: (10),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_344));
                    let __VLS_348;
                    const __VLS_349 = {
                        /** @type {typeof __VLS_348.click} */
                        onClick: (__VLS_ctx.handleVoidDepositDuplicates),
                    };
                    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                    const { default: __VLS_350 } = __VLS_346.slots;
                    // @ts-ignore
                    [voidDuplicateDepositItems, ArrowDownToLine, handleVoidDepositDuplicates,];
                    var __VLS_346;
                    var __VLS_347;
                }
                if (__VLS_ctx.voidDepositableItems.length > 0) {
                    const __VLS_351 = Button || Button;
                    // @ts-ignore
                    const __VLS_352 = __VLS_asFunctionalComponent1(__VLS_351, new __VLS_351({
                        ...{ 'onClick': {} },
                        ...{ class: "w-full text-[10px]" },
                        icon: (__VLS_ctx.ArrowDown),
                        iconSize: (10),
                    }));
                    const __VLS_353 = __VLS_352({
                        ...{ 'onClick': {} },
                        ...{ class: "w-full text-[10px]" },
                        icon: (__VLS_ctx.ArrowDown),
                        iconSize: (10),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_352));
                    let __VLS_356;
                    const __VLS_357 = {
                        /** @type {typeof __VLS_356.click} */
                        onClick: (...[$event]) => {
                            if (!(__VLS_ctx.gameStore.isGameStarted))
                                throw 0;
                            if (!(__VLS_ctx.showVoidModal))
                                throw 0;
                            if (!(__VLS_ctx.expandedVoidChestId === vc.id))
                                throw 0;
                            if (!(__VLS_ctx.voidDepositableItems.length > 0))
                                throw 0;
                            return __VLS_ctx.openVoidDeposit(vc.id);
                            // @ts-ignore
                            [voidDepositableItems, ArrowDown, openVoidDeposit,];
                        },
                    };
                    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    const { default: __VLS_358 } = __VLS_354.slots;
                    // @ts-ignore
                    [];
                    var __VLS_354;
                    var __VLS_355;
                }
            }
            // @ts-ignore
            [];
        }
        if (__VLS_ctx.voidChests.length === 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col items-center justify-center py-8" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-8']} */ ;
            let __VLS_359;
            /** @ts-ignore @type { | typeof __VLS_components.Archive} */
            Archive;
            // @ts-ignore
            const __VLS_360 = __VLS_asFunctionalComponent1(__VLS_359, new __VLS_359({
                size: (40),
                ...{ class: "text-accent/20 mb-2" },
            }));
            const __VLS_361 = __VLS_360({
                size: (40),
                ...{ class: "text-accent/20 mb-2" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_360));
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
    }
    // @ts-ignore
    [voidChests,];
    var __VLS_315;
    let __VLS_364;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_365 = __VLS_asFunctionalComponent1(__VLS_364, new __VLS_364({
        name: "panel-fade",
    }));
    const __VLS_366 = __VLS_365({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_365));
    const { default: __VLS_369 } = __VLS_367.slots;
    if (__VLS_ctx.showVoidDepositModal && __VLS_ctx.voidDepositChestId) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.gameStore.isGameStarted))
                        throw 0;
                    if (!(__VLS_ctx.showVoidDepositModal && __VLS_ctx.voidDepositChestId))
                        throw 0;
                    return __VLS_ctx.showVoidDepositModal = false;
                    // @ts-ignore
                    [showVoidDepositModal, showVoidDepositModal, voidDepositChestId,];
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
        const __VLS_370 = Button;
        // @ts-ignore
        const __VLS_371 = __VLS_asFunctionalComponent1(__VLS_370, new __VLS_370({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
            icon: (__VLS_ctx.X),
            iconSize: (12),
        }));
        const __VLS_372 = __VLS_371({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
            icon: (__VLS_ctx.X),
            iconSize: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_371));
        let __VLS_375;
        const __VLS_376 = {
            /** @type {typeof __VLS_375.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.gameStore.isGameStarted))
                    throw 0;
                if (!(__VLS_ctx.showVoidDepositModal && __VLS_ctx.voidDepositChestId))
                    throw 0;
                return __VLS_ctx.showVoidDepositModal = false;
                // @ts-ignore
                [X, showVoidDepositModal,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        var __VLS_373;
        var __VLS_374;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1 max-h-60 overflow-y-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.voidDepositableItems))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.gameStore.isGameStarted))
                            throw 0;
                        if (!(__VLS_ctx.showVoidDepositModal && __VLS_ctx.voidDepositChestId))
                            throw 0;
                        return __VLS_ctx.openVoidQtyModal('deposit', __VLS_ctx.voidDepositChestId, item.itemId, item.quality, item.quantity);
                        // @ts-ignore
                        [openVoidQtyModal, voidDepositableItems, voidDepositChestId,];
                    } },
                key: (item.itemId + item.quality),
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
                ...{ class: "text-xs truncate mr-2" },
                ...{ class: (__VLS_ctx.voidQualityClass(item.quality)) },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
            (__VLS_ctx.getItemName(item.itemId));
            if (item.quality !== 'normal') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px]" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                (__VLS_ctx.VOID_QUALITY_LABEL[item.quality]);
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (item.quantity);
            // @ts-ignore
            [voidQualityClass, getItemName, VOID_QUALITY_LABEL,];
        }
    }
    // @ts-ignore
    [];
    var __VLS_367;
    let __VLS_377;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_378 = __VLS_asFunctionalComponent1(__VLS_377, new __VLS_377({
        name: "panel-fade",
    }));
    const __VLS_379 = __VLS_378({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_378));
    const { default: __VLS_382 } = __VLS_380.slots;
    if (__VLS_ctx.voidQtyModal) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.gameStore.isGameStarted))
                        throw 0;
                    if (!(__VLS_ctx.voidQtyModal))
                        throw 0;
                    return __VLS_ctx.voidQtyModal = null;
                    // @ts-ignore
                    [voidQtyModal, voidQtyModal,];
                } },
            ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" },
        });
        /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['z-[60]']} */ ;
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
        (__VLS_ctx.voidQtyModal.mode === 'withdraw' ? '取出' : '存入');
        const __VLS_383 = Button;
        // @ts-ignore
        const __VLS_384 = __VLS_asFunctionalComponent1(__VLS_383, new __VLS_383({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
            icon: (__VLS_ctx.X),
            iconSize: (12),
        }));
        const __VLS_385 = __VLS_384({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
            icon: (__VLS_ctx.X),
            iconSize: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_384));
        let __VLS_388;
        const __VLS_389 = {
            /** @type {typeof __VLS_388.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.gameStore.isGameStarted))
                    throw 0;
                if (!(__VLS_ctx.voidQtyModal))
                    throw 0;
                return __VLS_ctx.voidQtyModal = null;
                // @ts-ignore
                [X, voidQtyModal, voidQtyModal,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        var __VLS_386;
        var __VLS_387;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs mb-2" },
            ...{ class: (__VLS_ctx.voidQualityClass(__VLS_ctx.voidQtyModal.quality)) },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.getItemName(__VLS_ctx.voidQtyModal.itemId));
        if (__VLS_ctx.voidQtyModal.quality !== 'normal') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px]" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            (__VLS_ctx.VOID_QUALITY_LABEL[__VLS_ctx.voidQtyModal.quality]);
        }
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
        const __VLS_390 = Button || Button;
        // @ts-ignore
        const __VLS_391 = __VLS_asFunctionalComponent1(__VLS_390, new __VLS_390({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.voidQty <= 1),
        }));
        const __VLS_392 = __VLS_391({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.voidQty <= 1),
        }, ...__VLS_functionalComponentArgsRest(__VLS_391));
        let __VLS_395;
        const __VLS_396 = {
            /** @type {typeof __VLS_395.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.gameStore.isGameStarted))
                    throw 0;
                if (!(__VLS_ctx.voidQtyModal))
                    throw 0;
                return __VLS_ctx.addVoidQty(-1);
                // @ts-ignore
                [voidQualityClass, getItemName, VOID_QUALITY_LABEL, voidQtyModal, voidQtyModal, voidQtyModal, voidQtyModal, voidQty, addVoidQty,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_397 } = __VLS_393.slots;
        // @ts-ignore
        [];
        var __VLS_393;
        var __VLS_394;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onInput: (__VLS_ctx.onVoidQtyInput) },
            type: "number",
            value: (__VLS_ctx.voidQty),
            min: "1",
            max: (__VLS_ctx.voidQtyModal.max),
            ...{ class: "w-24 h-6 px-2 py-0.5 bg-bg border border-accent/30 rounded-xs text-xs text-center text-accent outline-none" },
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
        const __VLS_398 = Button || Button;
        // @ts-ignore
        const __VLS_399 = __VLS_asFunctionalComponent1(__VLS_398, new __VLS_398({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.voidQty >= __VLS_ctx.voidQtyModal.max),
        }));
        const __VLS_400 = __VLS_399({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.voidQty >= __VLS_ctx.voidQtyModal.max),
        }, ...__VLS_functionalComponentArgsRest(__VLS_399));
        let __VLS_403;
        const __VLS_404 = {
            /** @type {typeof __VLS_403.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.gameStore.isGameStarted))
                    throw 0;
                if (!(__VLS_ctx.voidQtyModal))
                    throw 0;
                return __VLS_ctx.addVoidQty(1);
                // @ts-ignore
                [voidQtyModal, voidQtyModal, voidQty, voidQty, addVoidQty, onVoidQtyInput,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_405 } = __VLS_401.slots;
        // @ts-ignore
        [];
        var __VLS_401;
        var __VLS_402;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        const __VLS_406 = Button || Button;
        // @ts-ignore
        const __VLS_407 = __VLS_asFunctionalComponent1(__VLS_406, new __VLS_406({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.voidQty <= 1),
        }));
        const __VLS_408 = __VLS_407({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.voidQty <= 1),
        }, ...__VLS_functionalComponentArgsRest(__VLS_407));
        let __VLS_411;
        const __VLS_412 = {
            /** @type {typeof __VLS_411.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.gameStore.isGameStarted))
                    throw 0;
                if (!(__VLS_ctx.voidQtyModal))
                    throw 0;
                return __VLS_ctx.setVoidQty(1);
                // @ts-ignore
                [voidQty, setVoidQty,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_413 } = __VLS_409.slots;
        // @ts-ignore
        [];
        var __VLS_409;
        var __VLS_410;
        const __VLS_414 = Button || Button;
        // @ts-ignore
        const __VLS_415 = __VLS_asFunctionalComponent1(__VLS_414, new __VLS_414({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.voidQty >= __VLS_ctx.voidQtyModal.max),
        }));
        const __VLS_416 = __VLS_415({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.voidQty >= __VLS_ctx.voidQtyModal.max),
        }, ...__VLS_functionalComponentArgsRest(__VLS_415));
        let __VLS_419;
        const __VLS_420 = {
            /** @type {typeof __VLS_419.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.gameStore.isGameStarted))
                    throw 0;
                if (!(__VLS_ctx.voidQtyModal))
                    throw 0;
                return __VLS_ctx.setVoidQty(__VLS_ctx.voidQtyModal.max);
                // @ts-ignore
                [voidQtyModal, voidQtyModal, voidQty, setVoidQty,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_421 } = __VLS_417.slots;
        // @ts-ignore
        [];
        var __VLS_417;
        var __VLS_418;
        const __VLS_422 = Button || Button;
        // @ts-ignore
        const __VLS_423 = __VLS_asFunctionalComponent1(__VLS_422, new __VLS_422({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center !bg-accent !text-bg" },
        }));
        const __VLS_424 = __VLS_423({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center !bg-accent !text-bg" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_423));
        let __VLS_427;
        const __VLS_428 = {
            /** @type {typeof __VLS_427.click} */
            onClick: (__VLS_ctx.confirmVoidQty),
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        const { default: __VLS_429 } = __VLS_425.slots;
        (__VLS_ctx.voidQtyModal.mode === 'withdraw' ? '取出' : '存入');
        (__VLS_ctx.voidQty);
        // @ts-ignore
        [voidQtyModal, voidQty, confirmVoidQty,];
        var __VLS_425;
        var __VLS_426;
    }
    // @ts-ignore
    [];
    var __VLS_380;
    let __VLS_430;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_431 = __VLS_asFunctionalComponent1(__VLS_430, new __VLS_430({
        name: "panel-fade",
    }));
    const __VLS_432 = __VLS_431({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_431));
    const { default: __VLS_435 } = __VLS_433.slots;
    if (__VLS_ctx.voidItemDetail && __VLS_ctx.voidItemDef) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.gameStore.isGameStarted))
                        throw 0;
                    if (!(__VLS_ctx.voidItemDetail && __VLS_ctx.voidItemDef))
                        throw 0;
                    return __VLS_ctx.voidItemDetail = null;
                    // @ts-ignore
                    [voidItemDetail, voidItemDetail, voidItemDef,];
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
                    if (!(__VLS_ctx.gameStore.isGameStarted))
                        throw 0;
                    if (!(__VLS_ctx.voidItemDetail && __VLS_ctx.voidItemDef))
                        throw 0;
                    return __VLS_ctx.voidItemDetail = null;
                    // @ts-ignore
                    [voidItemDetail,];
                } },
            ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
        let __VLS_436;
        /** @ts-ignore @type { | typeof __VLS_components.X} */
        X;
        // @ts-ignore
        const __VLS_437 = __VLS_asFunctionalComponent1(__VLS_436, new __VLS_436({
            size: (14),
        }));
        const __VLS_438 = __VLS_437({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_437));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm mb-2" },
            ...{ class: (__VLS_ctx.voidQualityClass(__VLS_ctx.voidItemDetail.quality) || 'text-accent') },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.voidItemDef.name);
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
        (__VLS_ctx.voidItemDef.description);
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
        (__VLS_ctx.voidItemDetail.quantity);
        if (__VLS_ctx.voidItemDetail.quality !== 'normal') {
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
                ...{ class: (__VLS_ctx.voidQualityClass(__VLS_ctx.voidItemDetail.quality)) },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.VOID_QUALITY_LABEL[__VLS_ctx.voidItemDetail.quality]);
        }
        if (__VLS_ctx.voidItemDef.sellPrice) {
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
            (__VLS_ctx.voidItemDef.sellPrice);
        }
        if (__VLS_ctx.voidItemDef.staminaRestore) {
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
            (__VLS_ctx.voidItemDef.staminaRestore);
            if (__VLS_ctx.voidItemDef.healthRestore) {
                (__VLS_ctx.voidItemDef.healthRestore);
            }
        }
    }
    // @ts-ignore
    [voidItemDetail, voidItemDetail, voidItemDetail, voidItemDetail, voidItemDetail, voidQualityClass, voidQualityClass, VOID_QUALITY_LABEL, voidItemDef, voidItemDef, voidItemDef, voidItemDef, voidItemDef, voidItemDef, voidItemDef, voidItemDef,];
    var __VLS_433;
    let __VLS_441;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_442 = __VLS_asFunctionalComponent1(__VLS_441, new __VLS_441({
        name: "panel-fade",
    }));
    const __VLS_443 = __VLS_442({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_442));
    const { default: __VLS_446 } = __VLS_444.slots;
    if (__VLS_ctx.showLogModal) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.gameStore.isGameStarted))
                        throw 0;
                    if (!(__VLS_ctx.showLogModal))
                        throw 0;
                    return __VLS_ctx.showLogModal = false;
                    // @ts-ignore
                    [showLogModal, showLogModal,];
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
            ...{ class: "game-panel max-w-md w-full max-h-[80vh] flex flex-col relative" },
        });
        /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-w-md']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-[80vh]']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['relative']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.gameStore.isGameStarted))
                        throw 0;
                    if (!(__VLS_ctx.showLogModal))
                        throw 0;
                    return __VLS_ctx.showLogModal = false;
                    // @ts-ignore
                    [showLogModal,];
                } },
            ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
        let __VLS_447;
        /** @ts-ignore @type { | typeof __VLS_components.X} */
        X;
        // @ts-ignore
        const __VLS_448 = __VLS_asFunctionalComponent1(__VLS_447, new __VLS_447({
            size: (14),
        }));
        const __VLS_449 = __VLS_448({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_448));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        let __VLS_452;
        /** @ts-ignore @type { | typeof __VLS_components.History} */
        History;
        // @ts-ignore
        const __VLS_453 = __VLS_asFunctionalComponent1(__VLS_452, new __VLS_452({
            size: (14),
            ...{ class: "inline" },
        }));
        const __VLS_454 = __VLS_453({
            size: (14),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_453));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        if (__VLS_ctx.groupedLogs.length > 0) {
            const __VLS_457 = Button || Button;
            // @ts-ignore
            const __VLS_458 = __VLS_asFunctionalComponent1(__VLS_457, new __VLS_457({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5 text-[10px] mr-5" },
                icon: (__VLS_ctx.Trash2),
                iconSize: (10),
            }));
            const __VLS_459 = __VLS_458({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5 text-[10px] mr-5" },
                icon: (__VLS_ctx.Trash2),
                iconSize: (10),
            }, ...__VLS_functionalComponentArgsRest(__VLS_458));
            let __VLS_462;
            const __VLS_463 = {
                /** @type {typeof __VLS_462.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.gameStore.isGameStarted))
                        throw 0;
                    if (!(__VLS_ctx.showLogModal))
                        throw 0;
                    if (!(__VLS_ctx.groupedLogs.length > 0))
                        throw 0;
                    return __VLS_ctx.requestClearLogs(null);
                    // @ts-ignore
                    [groupedLogs, Trash2, requestClearLogs,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-5']} */ ;
            const { default: __VLS_464 } = __VLS_460.slots;
            // @ts-ignore
            [];
            var __VLS_460;
            var __VLS_461;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex-1 overflow-y-auto min-h-0" },
        });
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-h-0']} */ ;
        if (__VLS_ctx.groupedLogs.length === 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col items-center justify-center py-8 text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-8']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            let __VLS_465;
            /** @ts-ignore @type { | typeof __VLS_components.History} */
            History;
            // @ts-ignore
            const __VLS_466 = __VLS_asFunctionalComponent1(__VLS_465, new __VLS_465({
                size: (32),
                ...{ class: "mb-2" },
            }));
            const __VLS_467 = __VLS_466({
                size: (32),
                ...{ class: "mb-2" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_466));
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        }
        for (const [group, gi] of __VLS_vFor((__VLS_ctx.groupedLogs))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (gi),
                ...{ class: "mb-3" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            const __VLS_470 = Divider;
            // @ts-ignore
            const __VLS_471 = __VLS_asFunctionalComponent1(__VLS_470, new __VLS_470({
                label: (group.label),
                ...{ class: "flex-1" },
            }));
            const __VLS_472 = __VLS_471({
                label: (group.label),
                ...{ class: "flex-1" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_471));
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.gameStore.isGameStarted))
                            throw 0;
                        if (!(__VLS_ctx.showLogModal))
                            throw 0;
                        return __VLS_ctx.requestClearLogs(group.label);
                        // @ts-ignore
                        [groupedLogs, groupedLogs, requestClearLogs,];
                    } },
                ...{ class: "text-muted hover:text-danger ml-1.5 flex-shrink-0" },
                title: "清空该日日志",
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:text-danger']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
            let __VLS_475;
            /** @ts-ignore @type { | typeof __VLS_components.X} */
            X;
            // @ts-ignore
            const __VLS_476 = __VLS_asFunctionalComponent1(__VLS_475, new __VLS_475({
                size: (12),
            }));
            const __VLS_477 = __VLS_476({
                size: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_476));
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col space-y-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
            for (const [msg, mi] of __VLS_vFor((group.messages))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    key: (mi),
                    ...{ class: "text-xs text-muted px-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
                (msg);
                // @ts-ignore
                [];
            }
            // @ts-ignore
            [];
        }
    }
    // @ts-ignore
    [];
    var __VLS_444;
    let __VLS_480;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_481 = __VLS_asFunctionalComponent1(__VLS_480, new __VLS_480({
        name: "panel-fade",
    }));
    const __VLS_482 = __VLS_481({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_481));
    const { default: __VLS_485 } = __VLS_483.slots;
    if (__VLS_ctx.clearLogTarget !== undefined) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" },
        });
        /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-black/70']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['z-[60]']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "game-panel max-w-xs w-full text-center" },
        });
        /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs leading-relaxed mb-4" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
        (__VLS_ctx.clearLogTarget === null ? '确认清空全部日志？' : `确认清空「${__VLS_ctx.clearLogTarget}」的日志？`);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-3 justify-center" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const __VLS_486 = Button || Button;
        // @ts-ignore
        const __VLS_487 = __VLS_asFunctionalComponent1(__VLS_486, new __VLS_486({
            ...{ 'onClick': {} },
        }));
        const __VLS_488 = __VLS_487({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_487));
        let __VLS_491;
        const __VLS_492 = {
            /** @type {typeof __VLS_491.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.gameStore.isGameStarted))
                    throw 0;
                if (!(__VLS_ctx.clearLogTarget !== undefined))
                    throw 0;
                return __VLS_ctx.clearLogTarget = undefined;
                // @ts-ignore
                [clearLogTarget, clearLogTarget, clearLogTarget, clearLogTarget,];
            },
        };
        const { default: __VLS_493 } = __VLS_489.slots;
        // @ts-ignore
        [];
        var __VLS_489;
        var __VLS_490;
        const __VLS_494 = Button || Button;
        // @ts-ignore
        const __VLS_495 = __VLS_asFunctionalComponent1(__VLS_494, new __VLS_494({
            ...{ 'onClick': {} },
            ...{ class: "btn-danger" },
            icon: (__VLS_ctx.Trash2),
            iconSize: (12),
        }));
        const __VLS_496 = __VLS_495({
            ...{ 'onClick': {} },
            ...{ class: "btn-danger" },
            icon: (__VLS_ctx.Trash2),
            iconSize: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_495));
        let __VLS_499;
        const __VLS_500 = {
            /** @type {typeof __VLS_499.click} */
            onClick: (__VLS_ctx.executeClearLogs),
        };
        /** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
        const { default: __VLS_501 } = __VLS_497.slots;
        // @ts-ignore
        [Trash2, executeClearLogs,];
        var __VLS_497;
        var __VLS_498;
    }
    // @ts-ignore
    [];
    var __VLS_483;
    let __VLS_502;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_503 = __VLS_asFunctionalComponent1(__VLS_502, new __VLS_502({
        name: "panel-fade",
    }));
    const __VLS_504 = __VLS_503({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_503));
    const { default: __VLS_507 } = __VLS_505.slots;
    if (__VLS_ctx.showSleepConfirm) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" },
        });
        /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-black/70']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "game-panel max-w-xs w-full text-center" },
        });
        /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        const __VLS_508 = Divider || Divider;
        // @ts-ignore
        const __VLS_509 = __VLS_asFunctionalComponent1(__VLS_508, new __VLS_508({
            title: true,
        }));
        const __VLS_510 = __VLS_509({
            title: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_509));
        const { default: __VLS_513 } = __VLS_511.slots;
        (__VLS_ctx.sleepLabel);
        // @ts-ignore
        [showSleepConfirm, sleepLabel,];
        var __VLS_511;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs leading-relaxed mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        (__VLS_ctx.sleepSummary);
        for (const [warn, wi] of __VLS_vFor((__VLS_ctx.sleepWarning.split('\n').filter(Boolean)))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                key: (wi),
                ...{ class: "text-danger text-xs mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            (warn);
            // @ts-ignore
            [sleepSummary, sleepWarning,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-3 justify-center mt-4" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        const __VLS_514 = Button || Button;
        // @ts-ignore
        const __VLS_515 = __VLS_asFunctionalComponent1(__VLS_514, new __VLS_514({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.X),
            iconSize: (12),
        }));
        const __VLS_516 = __VLS_515({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.X),
            iconSize: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_515));
        let __VLS_519;
        const __VLS_520 = {
            /** @type {typeof __VLS_519.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.gameStore.isGameStarted))
                    throw 0;
                if (!(__VLS_ctx.showSleepConfirm))
                    throw 0;
                return __VLS_ctx.showSleepConfirm = false;
                // @ts-ignore
                [showSleepConfirm, X,];
            },
        };
        const { default: __VLS_521 } = __VLS_517.slots;
        // @ts-ignore
        [];
        var __VLS_517;
        var __VLS_518;
        const __VLS_522 = Button || Button;
        // @ts-ignore
        const __VLS_523 = __VLS_asFunctionalComponent1(__VLS_522, new __VLS_522({
            ...{ 'onClick': {} },
            ...{ class: "btn-danger" },
            icon: (__VLS_ctx.Moon),
            iconSize: (12),
        }));
        const __VLS_524 = __VLS_523({
            ...{ 'onClick': {} },
            ...{ class: "btn-danger" },
            icon: (__VLS_ctx.Moon),
            iconSize: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_523));
        let __VLS_527;
        const __VLS_528 = {
            /** @type {typeof __VLS_527.click} */
            onClick: (__VLS_ctx.confirmSleep),
        };
        /** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
        const { default: __VLS_529 } = __VLS_525.slots;
        (__VLS_ctx.sleepLabel);
        // @ts-ignore
        [Moon, sleepLabel, confirmSleep,];
        var __VLS_525;
        var __VLS_526;
    }
    // @ts-ignore
    [];
    var __VLS_505;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
