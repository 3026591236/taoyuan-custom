/// <reference types="../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { Play, FolderOpen, ArrowLeft, Trash2, Download, Upload, Info, Settings, ShieldCheck, X, UserRound } from 'lucide-vue-next';
import Button from '@/components/game/Button.vue';
import Divider from '@/components/game/Divider.vue';
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore, SEASON_NAMES } from '@/stores/useGameStore';
import { useSaveStore } from '@/stores/useSaveStore';
import { useFarmStore } from '@/stores/useFarmStore';
import { useAnimalStore } from '@/stores/useAnimalStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useQuestStore } from '@/stores/useQuestStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { FARM_MAP_DEFS } from '@/data/farmMaps';
import _pkg from '../../package.json';
import alipayImg from '@/assets/alipay.png';
import wechatImg from '@/assets/wechat.png';
import { useAudio } from '@/composables/useAudio';
import { showFloat, addLog } from '@/composables/useGameLog';
import { resetAllStoresForNewGame } from '@/composables/useResetGame';
import { useTutorialStore } from '@/stores/useTutorialStore';
import { Capacitor } from '@capacitor/core';
const router = useRouter();
const { startBgm } = useAudio();
const pkg = _pkg;
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
const aboutTab = ref('about');
const slotMenuOpen = ref(null);
const selectedMap = ref('standard');
const charName = ref('');
const charGender = ref('male');
const showPrivacy = ref(false);
const showFarmConfirm = ref(false);
const accountUsername = ref('');
const accountPassword = ref('');
const accountUser = ref(null);
const serverConfig = ref({ siteName: '桃源乡', announcement: '', announcementIntervalHours: 24, updateLogs: [], registrationEnabled: true, maintenanceMode: false });
const aboutQqText = computed(() => serverConfig.value?.aboutQqText || pkg.qq || 'QQ 交流群');
const aboutQqUrl = computed(() => serverConfig.value?.aboutQqUrl || 'https://qm.qq.com/q/2BVaTTwDkI');
const aboutGithubUrl = computed(() => serverConfig.value?.aboutGithubUrl || `https://github.com/${pkg.author}/${pkg.name}`);
const aboutTapTapUrl = computed(() => serverConfig.value?.aboutTapTapUrl || `https://www.taptap.cn/app/${pkg.tapid}`);
const sponsorAlipayImageUrl = computed(() => serverConfig.value?.sponsorAlipayImageUrl || alipayImg);
const sponsorWechatImageUrl = computed(() => serverConfig.value?.sponsorWechatImageUrl || wechatImg);
const sponsorAfdianUrl = computed(() => serverConfig.value?.sponsorAfdianUrl || `https://afdian.com/a/${pkg.author}`);
const accountSaves = ref([]);
const showAnnouncement = ref(false);
const showUpdateLogs = ref(false);
const accountToken = () => localStorage.getItem('taoyuan_account_token') || '';
const accountHeaders = () => ({ 'content-type': 'application/json', authorization: `Bearer ${accountToken()}` });
const accountApi = async (path, options = {}) => {
    const res = await fetch(path, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
        throw new Error(data.error || '请求失败');
    return data;
};
const loadServerConfig = async () => {
    try {
        serverConfig.value = await accountApi('/api/config');
        maybeShowAnnouncement();
    }
    catch { }
};
const maybeShowAnnouncement = () => {
    const text = String(serverConfig.value?.announcement || '').trim();
    if (!text)
        return;
    const hours = Number(serverConfig.value?.announcementIntervalHours ?? 24);
    const key = 'taoyuan_announcement_last_shown_at';
    const last = Number(localStorage.getItem(key) || '0');
    const now = Date.now();
    if (!last || hours <= 0 || now - last >= hours * 3600 * 1000) {
        window.setTimeout(() => { showAnnouncement.value = true; }, 300);
        localStorage.setItem(key, String(now));
    }
};
const loadAccountMe = async () => {
    try {
        accountUser.value = (await accountApi('/api/me', { headers: accountHeaders() })).user;
        if (accountUser.value)
            await loadAccountSaves();
    }
    catch {
        accountUser.value = null;
        accountSaves.value = [];
    }
};
const loadAccountSaves = async () => {
    try {
        if (!accountToken())
            return;
        accountSaves.value = (await accountApi('/api/saves', { headers: accountHeaders() })).saves || [];
    }
    catch {
        accountSaves.value = [];
    }
};
const formatTime = (value) => {
    if (!value)
        return '';
    try {
        return new Date(value).toLocaleString();
    }
    catch {
        return value;
    }
};
const downloadCloudSaveToLocal = async (slot) => {
    showAnnouncement.value = false;
    showUpdateLogs.value = false;
    try {
        const data = await accountApi(`/api/saves/${slot}`, { headers: accountHeaders() });
        if (!saveStore.importSave(slot, data.raw))
            throw new Error('云端存档无效或已损坏');
        refreshSlots();
        showFloat(`云存档 ${slot + 1} 已下载。`, 'success');
        handleLoadGame(slot);
    }
    catch (e) {
        showFloat(e.message || '下载云存档失败。', 'danger');
    }
};
const loginAccount = async () => {
    try {
        const data = await accountApi('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: accountUsername.value, password: accountPassword.value }) });
        localStorage.setItem('taoyuan_account_token', data.token);
        accountUser.value = data.user;
        await loadAccountSaves();
        showFloat('登录成功。', 'success');
    }
    catch (e) {
        showFloat(e.message || '登录失败。', 'danger');
    }
};
const registerAccount = async () => {
    try {
        const data = await accountApi('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: accountUsername.value, password: accountPassword.value }) });
        localStorage.setItem('taoyuan_account_token', data.token);
        accountUser.value = data.user;
        await loadAccountSaves();
        showFloat(data.message || '注册成功。', 'success');
    }
    catch (e) {
        showFloat(e.message || '注册失败。', 'danger');
    }
};
const logoutAccount = async () => {
    try {
        await accountApi('/api/auth/logout', { method: 'POST', headers: accountHeaders() });
    }
    catch { }
    localStorage.removeItem('taoyuan_account_token');
    accountUser.value = null;
    accountSaves.value = [];
    showFloat('已退出账号。');
};
onMounted(() => { void loadServerConfig(); void loadAccountMe(); });
const deleteTargetSlot = ref(null);
const hasLocalSaves = computed(() => slots.value.some(s => s.exists));
const selectedFarmDef = computed(() => FARM_MAP_DEFS.find(f => f.type === selectedMap.value));
const handleSelectFarm = (type) => {
    selectedMap.value = type;
    showFarmConfirm.value = true;
};
const handlePrivacyAgree = () => {
    localStorage.setItem('taoyuan_privacy_agreed', '1');
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
    selectedMap.value = 'standard';
    charName.value = '';
    charGender.value = 'male';
};
const handleCharCreateNext = () => {
    showFarmSelect.value = true;
};
const handleBackToCharCreate = () => {
    showFarmSelect.value = false;
    showFarmConfirm.value = false;
};
const handleNewGame = () => {
    // 分配空闲存档槽位
    const slot = saveStore.assignNewSlot();
    if (slot < 0) {
        showFloat('存档槽位已满，请先删除一个旧存档。');
        return;
    }
    // 重置所有游戏 store 到初始状态，防止上一个存档数据残留
    resetAllStoresForNewGame();
    playerStore.setIdentity((charName.value.trim() || '未命名').slice(0, 4), charGender.value);
    gameStore.startNewGame(selectedMap.value);
    // 标准农场初始6×6，其余4×4
    farmStore.resetFarm(selectedMap.value === 'standard' ? 6 : 4);
    // 新手赠送：10个青菜种子
    inventoryStore.addItem('seed_cabbage', 10);
    // 草地农场：免费鸡舍 + 2只鸡
    if (selectedMap.value === 'meadowlands') {
        const coop = animalStore.buildings.find(b => b.type === 'coop');
        if (coop) {
            coop.built = true;
            coop.level = 1;
        }
        animalStore.animals.push({
            id: 'chicken_init_1',
            type: 'chicken',
            name: '小花',
            friendship: 100,
            mood: 200,
            daysOwned: 0,
            daysSinceProduct: 0,
            wasFed: false,
            fedWith: null,
            wasPetted: false,
            hunger: 0,
            sick: false,
            sickDays: 0
        }, {
            id: 'chicken_init_2',
            type: 'chicken',
            name: '小白',
            friendship: 100,
            mood: 200,
            daysOwned: 0,
            daysSinceProduct: 0,
            wasFed: false,
            fedWith: null,
            wasPetted: false,
            hunger: 0,
            sick: false,
            sickDays: 0
        });
    }
    questStore.initMainQuest();
    // 新手引导：游戏开始时立即显示欢迎提示
    const tutorialStore = useTutorialStore();
    if (tutorialStore.enabled) {
        addLog('柳村长说：「欢迎来到桃源乡！背包里有白菜种子，去农场开垦土地、播种吧。」');
        tutorialStore.markTipShown('tip_welcome');
    }
    void router.push('/game');
};
const handleLoadGame = (slot) => {
    showAnnouncement.value = false;
    showUpdateLogs.value = false;
    if (saveStore.loadFromSlot(slot)) {
        if (playerStore.needsIdentitySetup) {
            // 旧存档没有性别/名字数据，先让玩家设置
            showIdentitySetup.value = true;
        }
        else {
            void router.push('/game');
        }
    }
};
/** 旧存档身份设置完成 */
const handleIdentityConfirm = () => {
    playerStore.setIdentity((charName.value.trim() || '未命名').slice(0, 4), charGender.value);
    showIdentitySetup.value = false;
    void router.push('/game');
};
const handleDeleteSlot = (slot) => {
    deleteTargetSlot.value = slot;
};
const confirmDeleteSlot = () => {
    if (deleteTargetSlot.value !== null) {
        saveStore.deleteSlot(deleteTargetSlot.value);
        refreshSlots();
        deleteTargetSlot.value = null;
        slotMenuOpen.value = null;
    }
};
const handleExportSlot = (slot) => {
    if (!saveStore.exportSave(slot)) {
        showFloat('导出失败。', 'danger');
    }
};
const fileInputRef = ref(null);
const triggerImport = () => {
    fileInputRef.value?.click();
};
const handleImportFile = (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file)
        return;
    const reader = new FileReader();
    reader.onload = () => {
        const content = reader.result;
        // 找到第一个空槽位导入，没有则提示
        const emptySlot = slots.value.find(s => !s.exists);
        if (!emptySlot) {
            showFloat('存档槽位已满，请先删除一个旧存档。');
        }
        else if (saveStore.importSave(emptySlot.slot, content)) {
            refreshSlots();
            showFloat(`已导入到存档 ${emptySlot.slot + 1}。`, 'success');
        }
        else {
            showFloat('存档文件无效或已损坏。', 'danger');
        }
        input.value = '';
    };
    reader.readAsText(file);
};
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.startBgm) },
    ...{ onClick: (...[$event]) => {
            return __VLS_ctx.slotMenuOpen = null;
            // @ts-ignore
            [startBgm, slotMenuOpen,];
        } },
    ...{ class: "flex min-h-screen flex-col items-center justify-center space-y-8 px-4" },
    ...{ class: ({ 'py-10': __VLS_ctx.Capacitor.isNativePlatform() }) },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['min-h-screen']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-8']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-10']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center space-x-3" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "logo" },
});
/** @type {__VLS_StyleScopedClasses['logo']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
    ...{ class: "text-accent text-2xl md:text-4xl tracking-widest" },
});
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['md:text-4xl']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-widest']} */ ;
(__VLS_ctx.pkg.title);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "game-panel w-full md:w-6/12 space-y-3 text-sm" },
});
/** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['md:w-6/12']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center justify-between gap-3" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-accent" },
});
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
(__VLS_ctx.serverConfig.siteName || '桃源乡');
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-muted text-xs" },
});
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
(__VLS_ctx.serverConfig.announcement);
if (__VLS_ctx.serverConfig.maintenanceMode) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-danger text-xs mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex gap-2 shrink-0" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return __VLS_ctx.showAnnouncement = true;
            // @ts-ignore
            [Capacitor, pkg, serverConfig, serverConfig, serverConfig, showAnnouncement,];
        } },
    ...{ class: "btn text-xs" },
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return __VLS_ctx.showUpdateLogs = true;
            // @ts-ignore
            [showUpdateLogs,];
        } },
    ...{ class: "btn text-xs" },
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return __VLS_ctx.router.push('/admin');
            // @ts-ignore
            [router,];
        } },
    ...{ class: "btn text-xs" },
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
if (__VLS_ctx.accountUser) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "space-y-2" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.accountUser.username);
    (__VLS_ctx.accountUser.role);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.logoutAccount) },
        ...{ class: "btn text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-2 space-y-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.loadAccountSaves) },
        ...{ class: "btn text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    if (__VLS_ctx.accountSaves.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-muted text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    }
    for (const [save] of __VLS_vFor((__VLS_ctx.accountSaves))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (save.slot),
            ...{ class: "flex items-center justify-between gap-2 text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (save.slot + 1);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (save.meta?.playerName || '未命名');
        (__VLS_ctx.formatTime(save.updatedAt));
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.accountUser))
                        throw 0;
                    return __VLS_ctx.downloadCloudSaveToLocal(save.slot);
                    // @ts-ignore
                    [accountUser, accountUser, accountUser, logoutAccount, loadAccountSaves, accountSaves, accountSaves, formatTime, downloadCloudSaveToLocal,];
                } },
            ...{ class: "btn text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        // @ts-ignore
        [];
    }
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-1 md:grid-cols-4 gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:grid-cols-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onClick: () => { } },
        ...{ class: "input md:col-span-1" },
        placeholder: "账号",
    });
    (__VLS_ctx.accountUsername);
    /** @type {__VLS_StyleScopedClasses['input']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:col-span-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onClick: () => { } },
        ...{ class: "input md:col-span-1" },
        placeholder: "密码",
        type: "password",
    });
    (__VLS_ctx.accountPassword);
    /** @type {__VLS_StyleScopedClasses['input']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:col-span-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.loginAccount) },
        ...{ class: "btn justify-center" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.registerAccount) },
        ...{ class: "btn justify-center" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex flex-col space-y-3 w-full md:w-6/12" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['md:w-6/12']} */ ;
const __VLS_0 = Button || Button;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    ...{ class: "text-center justify-center py-3" },
    icon: (__VLS_ctx.Play),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    ...{ class: "text-center justify-center py-3" },
    icon: (__VLS_ctx.Play),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_5;
const __VLS_6 = {
    /** @type {typeof __VLS_5.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.showPrivacy = true;
        // @ts-ignore
        [accountUsername, accountPassword, loginAccount, registerAccount, Play, showPrivacy,];
    },
};
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
const { default: __VLS_7 } = __VLS_3.slots;
// @ts-ignore
[];
var __VLS_3;
var __VLS_4;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-xs text-muted text-center" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
if (!__VLS_ctx.hasLocalSaves) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-xs text-muted text-center border border-accent/10 rounded-xs px-3 py-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
}
for (const [info] of __VLS_vFor((__VLS_ctx.slots))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (info.slot),
        ...{ class: "w-full" },
    });
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    if (info.exists) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-1 w-full" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(info.exists))
                        throw 0;
                    return __VLS_ctx.handleLoadGame(info.slot);
                    // @ts-ignore
                    [hasLocalSaves, slots, handleLoadGame,];
                } },
            ...{ class: "btn flex-1 !justify-between" },
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['!justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "inline-flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        let __VLS_8;
        /** @ts-ignore @type { | typeof __VLS_components.FolderOpen} */
        FolderOpen;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({
            size: (14),
        }));
        const __VLS_10 = __VLS_9({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (info.slot + 1);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (info.playerName ?? '未命名');
        (info.year);
        (__VLS_ctx.SEASON_NAMES[info.season]);
        (info.day);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "relative" },
        });
        /** @type {__VLS_StyleScopedClasses['relative']} */ ;
        const __VLS_13 = Button;
        // @ts-ignore
        const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
            ...{ 'onClick': {} },
            ...{ class: "px-2 h-full" },
            icon: (__VLS_ctx.Settings),
            iconSize: (12),
        }));
        const __VLS_15 = __VLS_14({
            ...{ 'onClick': {} },
            ...{ class: "px-2 h-full" },
            icon: (__VLS_ctx.Settings),
            iconSize: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_14));
        let __VLS_18;
        const __VLS_19 = {
            /** @type {typeof __VLS_18.click} */
            onClick: (...[$event]) => {
                if (!(info.exists))
                    throw 0;
                return __VLS_ctx.slotMenuOpen = __VLS_ctx.slotMenuOpen === info.slot ? null : info.slot;
                // @ts-ignore
                [slotMenuOpen, slotMenuOpen, SEASON_NAMES, SEASON_NAMES, Settings,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        var __VLS_16;
        var __VLS_17;
        if (__VLS_ctx.slotMenuOpen === info.slot) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "absolute right-0 top-full mt-1 z-10 flex flex-col border border-accent/30 rounded-xs overflow-hidden w-30" },
            });
            /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
            /** @type {__VLS_StyleScopedClasses['right-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['top-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['z-10']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-30']} */ ;
            if (!__VLS_ctx.Capacitor.isNativePlatform()) {
                const __VLS_20 = Button || Button;
                // @ts-ignore
                const __VLS_21 = __VLS_asFunctionalComponent1(__VLS_20, new __VLS_20({
                    ...{ 'onClick': {} },
                    ...{ class: "text-center !rounded-none justify-center !text-sm" },
                    icon: (__VLS_ctx.Download),
                    iconSize: (12),
                }));
                const __VLS_22 = __VLS_21({
                    ...{ 'onClick': {} },
                    ...{ class: "text-center !rounded-none justify-center !text-sm" },
                    icon: (__VLS_ctx.Download),
                    iconSize: (12),
                }, ...__VLS_functionalComponentArgsRest(__VLS_21));
                let __VLS_25;
                const __VLS_26 = {
                    /** @type {typeof __VLS_25.click} */
                    onClick: (...[$event]) => {
                        if (!(info.exists))
                            throw 0;
                        if (!(__VLS_ctx.slotMenuOpen === info.slot))
                            throw 0;
                        if (!(!__VLS_ctx.Capacitor.isNativePlatform()))
                            throw 0;
                        return __VLS_ctx.handleExportSlot(info.slot);
                        // @ts-ignore
                        [slotMenuOpen, Capacitor, Download, handleExportSlot,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['!rounded-none']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['!text-sm']} */ ;
                const { default: __VLS_27 } = __VLS_23.slots;
                // @ts-ignore
                [];
                var __VLS_23;
                var __VLS_24;
            }
            const __VLS_28 = Button || Button;
            // @ts-ignore
            const __VLS_29 = __VLS_asFunctionalComponent1(__VLS_28, new __VLS_28({
                ...{ 'onClick': {} },
                ...{ class: "btn-danger !rounded-none text-center justify-center !text-sm" },
                icon: (__VLS_ctx.Trash2),
                iconSize: (12),
            }));
            const __VLS_30 = __VLS_29({
                ...{ 'onClick': {} },
                ...{ class: "btn-danger !rounded-none text-center justify-center !text-sm" },
                icon: (__VLS_ctx.Trash2),
                iconSize: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_29));
            let __VLS_33;
            const __VLS_34 = {
                /** @type {typeof __VLS_33.click} */
                onClick: (...[$event]) => {
                    if (!(info.exists))
                        throw 0;
                    if (!(__VLS_ctx.slotMenuOpen === info.slot))
                        throw 0;
                    return __VLS_ctx.handleDeleteSlot(info.slot);
                    // @ts-ignore
                    [Trash2, handleDeleteSlot,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
            /** @type {__VLS_StyleScopedClasses['!rounded-none']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['!text-sm']} */ ;
            const { default: __VLS_35 } = __VLS_31.slots;
            // @ts-ignore
            [];
            var __VLS_31;
            var __VLS_32;
        }
    }
    // @ts-ignore
    [];
}
if (!__VLS_ctx.Capacitor.isNativePlatform()) {
    const __VLS_36 = Button || Button;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
        ...{ 'onClick': {} },
        ...{ class: "text-center justify-center" },
        icon: (__VLS_ctx.Upload),
    }));
    const __VLS_38 = __VLS_37({
        ...{ 'onClick': {} },
        ...{ class: "text-center justify-center" },
        icon: (__VLS_ctx.Upload),
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    let __VLS_41;
    const __VLS_42 = {
        /** @type {typeof __VLS_41.click} */
        onClick: (__VLS_ctx.triggerImport),
    };
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_43 } = __VLS_39.slots;
    // @ts-ignore
    [Capacitor, Upload, triggerImport,];
    var __VLS_39;
    var __VLS_40;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onChange: (__VLS_ctx.handleImportFile) },
        ref: "fileInputRef",
        type: "file",
        accept: ".tyx",
        ...{ class: "hidden" },
    });
    /** @type {__VLS_StyleScopedClasses['hidden']} */ ;
}
const __VLS_44 = Button || Button;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent1(__VLS_44, new __VLS_44({
    ...{ 'onClick': {} },
    ...{ class: "text-center justify-center text-muted" },
    icon: (__VLS_ctx.Info),
}));
const __VLS_46 = __VLS_45({
    ...{ 'onClick': {} },
    ...{ class: "text-center justify-center text-muted" },
    icon: (__VLS_ctx.Info),
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
let __VLS_49;
const __VLS_50 = {
    /** @type {typeof __VLS_49.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.showAbout = true;
        // @ts-ignore
        [handleImportFile, Info, showAbout,];
    },
};
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
const { default: __VLS_51 } = __VLS_47.slots;
// @ts-ignore
[];
var __VLS_47;
var __VLS_48;
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
if (__VLS_ctx.showAnnouncement) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showAnnouncement))
                    throw 0;
                return __VLS_ctx.showAnnouncement = false;
                // @ts-ignore
                [showAnnouncement, showAnnouncement,];
            } },
        ...{ class: "fixed inset-0 z-50 flex items-center justify-center bg-bg/80" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg/80']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel w-full max-w-md mx-4 relative" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['mx-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showAnnouncement))
                    throw 0;
                return __VLS_ctx.showAnnouncement = false;
                // @ts-ignore
                [showAnnouncement,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_58;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_59 = __VLS_asFunctionalComponent1(__VLS_58, new __VLS_58({
        size: (14),
    }));
    const __VLS_60 = __VLS_59({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_59));
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "text-accent text-lg mb-3 text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-3 text-sm whitespace-pre-wrap leading-relaxed" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['whitespace-pre-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
    (__VLS_ctx.serverConfig.announcement || '暂无公告。');
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mt-3 text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-center mt-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
    const __VLS_63 = Button || Button;
    // @ts-ignore
    const __VLS_64 = __VLS_asFunctionalComponent1(__VLS_63, new __VLS_63({
        ...{ 'onClick': {} },
        ...{ class: "px-6" },
    }));
    const __VLS_65 = __VLS_64({
        ...{ 'onClick': {} },
        ...{ class: "px-6" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_64));
    let __VLS_68;
    const __VLS_69 = {
        /** @type {typeof __VLS_68.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.showAnnouncement))
                throw 0;
            return __VLS_ctx.showAnnouncement = false;
            // @ts-ignore
            [serverConfig, showAnnouncement,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['px-6']} */ ;
    const { default: __VLS_70 } = __VLS_66.slots;
    // @ts-ignore
    [];
    var __VLS_66;
    var __VLS_67;
}
// @ts-ignore
[];
var __VLS_55;
let __VLS_71;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_72 = __VLS_asFunctionalComponent1(__VLS_71, new __VLS_71({
    name: "panel-fade",
}));
const __VLS_73 = __VLS_72({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_72));
const { default: __VLS_76 } = __VLS_74.slots;
if (__VLS_ctx.showUpdateLogs) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showUpdateLogs))
                    throw 0;
                return __VLS_ctx.showUpdateLogs = false;
                // @ts-ignore
                [showUpdateLogs, showUpdateLogs,];
            } },
        ...{ class: "fixed inset-0 z-50 flex items-center justify-center bg-bg/80" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg/80']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto relative" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['mx-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-[80vh]']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showUpdateLogs))
                    throw 0;
                return __VLS_ctx.showUpdateLogs = false;
                // @ts-ignore
                [showUpdateLogs,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_77;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_78 = __VLS_asFunctionalComponent1(__VLS_77, new __VLS_77({
        size: (14),
    }));
    const __VLS_79 = __VLS_78({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_78));
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "text-accent text-lg mb-3 text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    if (!__VLS_ctx.serverConfig.updateLogs?.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-xs text-muted text-center border border-accent/20 rounded-xs p-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    }
    for (const [log, idx] of __VLS_vFor((__VLS_ctx.serverConfig.updateLogs))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (idx),
            ...{ class: "border border-accent/20 rounded-xs p-3 mb-2 text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex justify-between gap-2 mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        (log.title || '功能更新');
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (log.date);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs whitespace-pre-wrap leading-relaxed" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-pre-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
        (log.content);
        // @ts-ignore
        [serverConfig, serverConfig,];
    }
}
// @ts-ignore
[];
var __VLS_74;
let __VLS_82;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_83 = __VLS_asFunctionalComponent1(__VLS_82, new __VLS_82({
    name: "panel-fade",
}));
const __VLS_84 = __VLS_83({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_83));
const { default: __VLS_87 } = __VLS_85.slots;
if (__VLS_ctx.showAbout) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showAbout))
                    throw 0;
                return __VLS_ctx.showAbout = false;
                // @ts-ignore
                [showAbout, showAbout,];
            } },
        ...{ class: "fixed inset-0 z-50 flex items-center justify-center bg-bg/80" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg/80']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel w-full max-w-md mx-4 text-center relative" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['mx-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showAbout))
                    throw 0;
                return __VLS_ctx.showAbout = false;
                // @ts-ignore
                [showAbout,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_88;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent1(__VLS_88, new __VLS_88({
        size: (14),
    }));
    const __VLS_90 = __VLS_89({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "text-accent text-lg mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    (__VLS_ctx.pkg.title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-1.5 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    const __VLS_93 = Button || Button;
    // @ts-ignore
    const __VLS_94 = __VLS_asFunctionalComponent1(__VLS_93, new __VLS_93({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.aboutTab === 'about' }) },
        icon: (__VLS_ctx.Info),
    }));
    const __VLS_95 = __VLS_94({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.aboutTab === 'about' }) },
        icon: (__VLS_ctx.Info),
    }, ...__VLS_functionalComponentArgsRest(__VLS_94));
    let __VLS_98;
    const __VLS_99 = {
        /** @type {typeof __VLS_98.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.showAbout))
                throw 0;
            return __VLS_ctx.aboutTab = 'about';
            // @ts-ignore
            [pkg, Info, aboutTab, aboutTab,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_100 } = __VLS_96.slots;
    // @ts-ignore
    [];
    var __VLS_96;
    var __VLS_97;
    const __VLS_101 = Button || Button;
    // @ts-ignore
    const __VLS_102 = __VLS_asFunctionalComponent1(__VLS_101, new __VLS_101({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.aboutTab === 'author' }) },
        icon: (__VLS_ctx.UserRound),
    }));
    const __VLS_103 = __VLS_102({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.aboutTab === 'author' }) },
        icon: (__VLS_ctx.UserRound),
    }, ...__VLS_functionalComponentArgsRest(__VLS_102));
    let __VLS_106;
    const __VLS_107 = {
        /** @type {typeof __VLS_106.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.showAbout))
                throw 0;
            return __VLS_ctx.aboutTab = 'author';
            // @ts-ignore
            [aboutTab, aboutTab, UserRound,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_108 } = __VLS_104.slots;
    // @ts-ignore
    [];
    var __VLS_104;
    var __VLS_105;
    if (__VLS_ctx.aboutTab === 'about') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-3 text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-3" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-muted text-xs mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        (__VLS_ctx.pkg.version);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-3" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-muted text-xs mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            href: (__VLS_ctx.aboutQqUrl),
            target: "_blank",
            ...{ class: "text-accent underline break-all" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['underline']} */ ;
        /** @type {__VLS_StyleScopedClasses['break-all']} */ ;
        (__VLS_ctx.aboutQqText);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-3" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-muted text-xs mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            href: (__VLS_ctx.aboutGithubUrl),
            target: "_blank",
            ...{ class: "text-accent underline break-all" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['underline']} */ ;
        /** @type {__VLS_StyleScopedClasses['break-all']} */ ;
        (__VLS_ctx.aboutGithubUrl);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-3" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-muted text-xs mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            href: (__VLS_ctx.aboutTapTapUrl),
            target: "_blank",
            ...{ class: "text-accent underline break-all" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['underline']} */ ;
        /** @type {__VLS_StyleScopedClasses['break-all']} */ ;
        (__VLS_ctx.aboutTapTapUrl);
    }
    if (__VLS_ctx.aboutTab === 'author') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-3 text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-3" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex-1 border border-accent/20 rounded-xs p-3" },
        });
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-muted text-xs mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
            src: (__VLS_ctx.sponsorAlipayImageUrl),
            alt: "支付宝",
            ...{ class: "mx-auto" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex-1 border border-accent/20 rounded-xs p-3" },
        });
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-muted text-xs mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
            src: (__VLS_ctx.sponsorWechatImageUrl),
            alt: "微信",
            ...{ class: "mx-auto" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-3" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-muted text-xs mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            href: (__VLS_ctx.sponsorAfdianUrl),
            target: "_blank",
            ...{ class: "text-accent underline break-all" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['underline']} */ ;
        /** @type {__VLS_StyleScopedClasses['break-all']} */ ;
        (__VLS_ctx.sponsorAfdianUrl);
    }
}
// @ts-ignore
[pkg, aboutTab, aboutTab, aboutQqUrl, aboutQqText, aboutGithubUrl, aboutGithubUrl, aboutTapTapUrl, aboutTapTapUrl, sponsorAlipayImageUrl, sponsorWechatImageUrl, sponsorAfdianUrl, sponsorAfdianUrl,];
var __VLS_85;
let __VLS_109;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_110 = __VLS_asFunctionalComponent1(__VLS_109, new __VLS_109({
    name: "panel-fade",
}));
const __VLS_111 = __VLS_110({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_110));
const { default: __VLS_114 } = __VLS_112.slots;
if (__VLS_ctx.showCharCreate && !__VLS_ctx.showFarmSelect) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "fixed inset-0 z-50 flex items-center justify-center bg-bg/80" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg/80']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel w-full max-w-xs mx-4 relative" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mx-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.handleBackToMenu) },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_115;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_116 = __VLS_asFunctionalComponent1(__VLS_115, new __VLS_115({
        size: (14),
    }));
    const __VLS_117 = __VLS_116({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_116));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-accent text-sm mb-4 text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-4" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "text-xs text-muted mb-1 block" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['block']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        value: (__VLS_ctx.charName),
        type: "text",
        maxlength: "4",
        placeholder: "请输入你的名字",
        ...{ class: "w-full px-3 py-2 bg-bg border border-accent/30 rounded-xs text-sm focus:border-accent outline-none" },
    });
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['focus:border-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['outline-none']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "text-xs text-muted mb-1 block" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['block']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
    const __VLS_120 = Button || Button;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent1(__VLS_120, new __VLS_120({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center py-2" },
        ...{ class: (__VLS_ctx.charGender === 'male' ? '!border-accent !bg-accent/10' : '') },
    }));
    const __VLS_122 = __VLS_121({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center py-2" },
        ...{ class: (__VLS_ctx.charGender === 'male' ? '!border-accent !bg-accent/10' : '') },
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    let __VLS_125;
    const __VLS_126 = {
        /** @type {typeof __VLS_125.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.showCharCreate && !__VLS_ctx.showFarmSelect))
                throw 0;
            return __VLS_ctx.charGender = 'male';
            // @ts-ignore
            [showCharCreate, showFarmSelect, handleBackToMenu, charName, charGender, charGender,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    const { default: __VLS_127 } = __VLS_123.slots;
    // @ts-ignore
    [];
    var __VLS_123;
    var __VLS_124;
    const __VLS_128 = Button || Button;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent1(__VLS_128, new __VLS_128({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center py-2" },
        ...{ class: (__VLS_ctx.charGender === 'female' ? '!border-accent !bg-accent/10' : '') },
    }));
    const __VLS_130 = __VLS_129({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center py-2" },
        ...{ class: (__VLS_ctx.charGender === 'female' ? '!border-accent !bg-accent/10' : '') },
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    let __VLS_133;
    const __VLS_134 = {
        /** @type {typeof __VLS_133.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.showCharCreate && !__VLS_ctx.showFarmSelect))
                throw 0;
            return __VLS_ctx.charGender = 'female';
            // @ts-ignore
            [charGender, charGender,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    const { default: __VLS_135 } = __VLS_131.slots;
    // @ts-ignore
    [];
    var __VLS_131;
    var __VLS_132;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-3 justify-center mt-4" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    const __VLS_136 = Button || Button;
    // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent1(__VLS_136, new __VLS_136({
        ...{ 'onClick': {} },
        iconSize: (12),
        icon: (__VLS_ctx.ArrowLeft),
    }));
    const __VLS_138 = __VLS_137({
        ...{ 'onClick': {} },
        iconSize: (12),
        icon: (__VLS_ctx.ArrowLeft),
    }, ...__VLS_functionalComponentArgsRest(__VLS_137));
    let __VLS_141;
    const __VLS_142 = {
        /** @type {typeof __VLS_141.click} */
        onClick: (__VLS_ctx.handleBackToMenu),
    };
    const { default: __VLS_143 } = __VLS_139.slots;
    // @ts-ignore
    [handleBackToMenu, ArrowLeft,];
    var __VLS_139;
    var __VLS_140;
    const __VLS_144 = Button || Button;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent1(__VLS_144, new __VLS_144({
        ...{ 'onClick': {} },
        ...{ class: "px-6" },
        disabled: (!__VLS_ctx.charName.trim()),
        iconSize: (12),
        icon: (__VLS_ctx.Play),
    }));
    const __VLS_146 = __VLS_145({
        ...{ 'onClick': {} },
        ...{ class: "px-6" },
        disabled: (!__VLS_ctx.charName.trim()),
        iconSize: (12),
        icon: (__VLS_ctx.Play),
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    let __VLS_149;
    const __VLS_150 = {
        /** @type {typeof __VLS_149.click} */
        onClick: (__VLS_ctx.handleCharCreateNext),
    };
    /** @type {__VLS_StyleScopedClasses['px-6']} */ ;
    const { default: __VLS_151 } = __VLS_147.slots;
    // @ts-ignore
    [Play, charName, handleCharCreateNext,];
    var __VLS_147;
    var __VLS_148;
}
// @ts-ignore
[];
var __VLS_112;
let __VLS_152;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_153 = __VLS_asFunctionalComponent1(__VLS_152, new __VLS_152({
    name: "panel-fade",
}));
const __VLS_154 = __VLS_153({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_153));
const { default: __VLS_157 } = __VLS_155.slots;
if (__VLS_ctx.showFarmSelect) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg/80']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel w-full max-w-xl max-h-[80vh] flex flex-col relative" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-[80vh]']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.handleBackToCharCreate) },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text z-10" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-10']} */ ;
    let __VLS_158;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_159 = __VLS_asFunctionalComponent1(__VLS_158, new __VLS_158({
        size: (14),
    }));
    const __VLS_160 = __VLS_159({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_159));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-accent text-sm mb-3 text-center shrink-0" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex-1 overflow-y-auto min-h-0" },
    });
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    /** @type {__VLS_StyleScopedClasses['min-h-0']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-1 md:grid-cols-2 gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    for (const [farm] of __VLS_vFor((__VLS_ctx.FARM_MAP_DEFS))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showFarmSelect))
                        throw 0;
                    return __VLS_ctx.handleSelectFarm(farm.type);
                    // @ts-ignore
                    [showFarmSelect, handleBackToCharCreate, FARM_MAP_DEFS, handleSelectFarm,];
                } },
            key: (farm.type),
            ...{ class: "border border-accent/20 rounded-xs p-3 text-left transition-all cursor-pointer hover:border-accent/50" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-left']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:border-accent/50']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-sm mb-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-0.5']} */ ;
        (farm.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-muted text-xs mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        (farm.description);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-accent text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (farm.bonus);
        // @ts-ignore
        [];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-center mt-3 shrink-0" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    const __VLS_163 = Button || Button;
    // @ts-ignore
    const __VLS_164 = __VLS_asFunctionalComponent1(__VLS_163, new __VLS_163({
        ...{ 'onClick': {} },
        iconSize: (12),
        icon: (__VLS_ctx.ArrowLeft),
    }));
    const __VLS_165 = __VLS_164({
        ...{ 'onClick': {} },
        iconSize: (12),
        icon: (__VLS_ctx.ArrowLeft),
    }, ...__VLS_functionalComponentArgsRest(__VLS_164));
    let __VLS_168;
    const __VLS_169 = {
        /** @type {typeof __VLS_168.click} */
        onClick: (__VLS_ctx.handleBackToCharCreate),
    };
    const { default: __VLS_170 } = __VLS_166.slots;
    // @ts-ignore
    [ArrowLeft, handleBackToCharCreate,];
    var __VLS_166;
    var __VLS_167;
    let __VLS_171;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_172 = __VLS_asFunctionalComponent1(__VLS_171, new __VLS_171({
        name: "panel-fade",
    }));
    const __VLS_173 = __VLS_172({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_172));
    const { default: __VLS_176 } = __VLS_174.slots;
    if (__VLS_ctx.showFarmConfirm) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showFarmSelect))
                        throw 0;
                    if (!(__VLS_ctx.showFarmConfirm))
                        throw 0;
                    return __VLS_ctx.showFarmConfirm = false;
                    // @ts-ignore
                    [showFarmConfirm, showFarmConfirm,];
                } },
            ...{ class: "fixed inset-0 z-60 flex items-center justify-center bg-bg/80" },
        });
        /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['z-60']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-bg/80']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "game-panel w-full max-w-xs mx-4 text-center relative" },
        });
        /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mx-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['relative']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showFarmSelect))
                        throw 0;
                    if (!(__VLS_ctx.showFarmConfirm))
                        throw 0;
                    return __VLS_ctx.showFarmConfirm = false;
                    // @ts-ignore
                    [showFarmConfirm,];
                } },
            ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
        let __VLS_177;
        /** @ts-ignore @type { | typeof __VLS_components.X} */
        X;
        // @ts-ignore
        const __VLS_178 = __VLS_asFunctionalComponent1(__VLS_177, new __VLS_177({
            size: (14),
        }));
        const __VLS_179 = __VLS_178({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_178));
        const __VLS_182 = Divider || Divider;
        // @ts-ignore
        const __VLS_183 = __VLS_asFunctionalComponent1(__VLS_182, new __VLS_182({
            title: true,
        }));
        const __VLS_184 = __VLS_183({
            title: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_183));
        const { default: __VLS_187 } = __VLS_185.slots;
        (__VLS_ctx.selectedFarmDef?.name);
        // @ts-ignore
        [selectedFarmDef,];
        var __VLS_185;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.selectedFarmDef?.description);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-accent mb-4" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
        (__VLS_ctx.selectedFarmDef?.bonus);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-3 justify-center" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const __VLS_188 = Button || Button;
        // @ts-ignore
        const __VLS_189 = __VLS_asFunctionalComponent1(__VLS_188, new __VLS_188({
            ...{ 'onClick': {} },
            iconSize: (12),
            icon: (__VLS_ctx.ArrowLeft),
        }));
        const __VLS_190 = __VLS_189({
            ...{ 'onClick': {} },
            iconSize: (12),
            icon: (__VLS_ctx.ArrowLeft),
        }, ...__VLS_functionalComponentArgsRest(__VLS_189));
        let __VLS_193;
        const __VLS_194 = {
            /** @type {typeof __VLS_193.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.showFarmSelect))
                    throw 0;
                if (!(__VLS_ctx.showFarmConfirm))
                    throw 0;
                return __VLS_ctx.showFarmConfirm = false;
                // @ts-ignore
                [ArrowLeft, showFarmConfirm, selectedFarmDef, selectedFarmDef,];
            },
        };
        const { default: __VLS_195 } = __VLS_191.slots;
        // @ts-ignore
        [];
        var __VLS_191;
        var __VLS_192;
        const __VLS_196 = Button || Button;
        // @ts-ignore
        const __VLS_197 = __VLS_asFunctionalComponent1(__VLS_196, new __VLS_196({
            ...{ 'onClick': {} },
            ...{ class: "px-6" },
            iconSize: (12),
            icon: (__VLS_ctx.Play),
        }));
        const __VLS_198 = __VLS_197({
            ...{ 'onClick': {} },
            ...{ class: "px-6" },
            iconSize: (12),
            icon: (__VLS_ctx.Play),
        }, ...__VLS_functionalComponentArgsRest(__VLS_197));
        let __VLS_201;
        const __VLS_202 = {
            /** @type {typeof __VLS_201.click} */
            onClick: (__VLS_ctx.handleNewGame),
        };
        /** @type {__VLS_StyleScopedClasses['px-6']} */ ;
        const { default: __VLS_203 } = __VLS_199.slots;
        // @ts-ignore
        [Play, handleNewGame,];
        var __VLS_199;
        var __VLS_200;
    }
    // @ts-ignore
    [];
    var __VLS_174;
}
// @ts-ignore
[];
var __VLS_155;
let __VLS_204;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_205 = __VLS_asFunctionalComponent1(__VLS_204, new __VLS_204({
    name: "panel-fade",
}));
const __VLS_206 = __VLS_205({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_205));
const { default: __VLS_209 } = __VLS_207.slots;
if (__VLS_ctx.showIdentitySetup) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "fixed inset-0 z-50 flex items-center justify-center bg-bg/80" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg/80']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel w-full max-w-xs mx-4 relative" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mx-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-accent text-sm mb-2 text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-4 text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-4" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "text-xs text-muted mb-1 block" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['block']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        value: (__VLS_ctx.charName),
        type: "text",
        maxlength: "4",
        placeholder: "请输入你的名字",
        ...{ class: "w-full px-3 py-2 bg-bg border border-accent/30 rounded-xs text-sm focus:border-accent outline-none" },
    });
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['focus:border-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['outline-none']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "text-xs text-muted mb-1 block" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['block']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
    const __VLS_210 = Button || Button;
    // @ts-ignore
    const __VLS_211 = __VLS_asFunctionalComponent1(__VLS_210, new __VLS_210({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center py-2" },
        ...{ class: (__VLS_ctx.charGender === 'male' ? '!border-accent !bg-accent/10' : '') },
    }));
    const __VLS_212 = __VLS_211({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center py-2" },
        ...{ class: (__VLS_ctx.charGender === 'male' ? '!border-accent !bg-accent/10' : '') },
    }, ...__VLS_functionalComponentArgsRest(__VLS_211));
    let __VLS_215;
    const __VLS_216 = {
        /** @type {typeof __VLS_215.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.showIdentitySetup))
                throw 0;
            return __VLS_ctx.charGender = 'male';
            // @ts-ignore
            [charName, charGender, charGender, showIdentitySetup,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    const { default: __VLS_217 } = __VLS_213.slots;
    // @ts-ignore
    [];
    var __VLS_213;
    var __VLS_214;
    const __VLS_218 = Button || Button;
    // @ts-ignore
    const __VLS_219 = __VLS_asFunctionalComponent1(__VLS_218, new __VLS_218({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center py-2" },
        ...{ class: (__VLS_ctx.charGender === 'female' ? '!border-accent !bg-accent/10' : '') },
    }));
    const __VLS_220 = __VLS_219({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center py-2" },
        ...{ class: (__VLS_ctx.charGender === 'female' ? '!border-accent !bg-accent/10' : '') },
    }, ...__VLS_functionalComponentArgsRest(__VLS_219));
    let __VLS_223;
    const __VLS_224 = {
        /** @type {typeof __VLS_223.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.showIdentitySetup))
                throw 0;
            return __VLS_ctx.charGender = 'female';
            // @ts-ignore
            [charGender, charGender,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    const { default: __VLS_225 } = __VLS_221.slots;
    // @ts-ignore
    [];
    var __VLS_221;
    var __VLS_222;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-center mt-4" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    const __VLS_226 = Button || Button;
    // @ts-ignore
    const __VLS_227 = __VLS_asFunctionalComponent1(__VLS_226, new __VLS_226({
        ...{ 'onClick': {} },
        ...{ class: "px-6" },
        disabled: (!__VLS_ctx.charName.trim()),
        iconSize: (12),
        icon: (__VLS_ctx.Play),
    }));
    const __VLS_228 = __VLS_227({
        ...{ 'onClick': {} },
        ...{ class: "px-6" },
        disabled: (!__VLS_ctx.charName.trim()),
        iconSize: (12),
        icon: (__VLS_ctx.Play),
    }, ...__VLS_functionalComponentArgsRest(__VLS_227));
    let __VLS_231;
    const __VLS_232 = {
        /** @type {typeof __VLS_231.click} */
        onClick: (__VLS_ctx.handleIdentityConfirm),
    };
    /** @type {__VLS_StyleScopedClasses['px-6']} */ ;
    const { default: __VLS_233 } = __VLS_229.slots;
    // @ts-ignore
    [Play, charName, handleIdentityConfirm,];
    var __VLS_229;
    var __VLS_230;
}
// @ts-ignore
[];
var __VLS_207;
let __VLS_234;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_235 = __VLS_asFunctionalComponent1(__VLS_234, new __VLS_234({
    name: "panel-fade",
}));
const __VLS_236 = __VLS_235({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_235));
const { default: __VLS_239 } = __VLS_237.slots;
if (__VLS_ctx.deleteTargetSlot !== null) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.deleteTargetSlot !== null))
                    throw 0;
                return __VLS_ctx.deleteTargetSlot = null;
                // @ts-ignore
                [deleteTargetSlot, deleteTargetSlot,];
            } },
        ...{ class: "fixed inset-0 z-50 flex items-center justify-center bg-bg/80" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg/80']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel w-full max-w-xs mx-4 text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mx-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-danger text-sm mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    (__VLS_ctx.deleteTargetSlot + 1);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-3 justify-center" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const __VLS_240 = Button || Button;
    // @ts-ignore
    const __VLS_241 = __VLS_asFunctionalComponent1(__VLS_240, new __VLS_240({
        ...{ 'onClick': {} },
    }));
    const __VLS_242 = __VLS_241({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_241));
    let __VLS_245;
    const __VLS_246 = {
        /** @type {typeof __VLS_245.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.deleteTargetSlot !== null))
                throw 0;
            return __VLS_ctx.deleteTargetSlot = null;
            // @ts-ignore
            [deleteTargetSlot, deleteTargetSlot,];
        },
    };
    const { default: __VLS_247 } = __VLS_243.slots;
    // @ts-ignore
    [];
    var __VLS_243;
    var __VLS_244;
    const __VLS_248 = Button || Button;
    // @ts-ignore
    const __VLS_249 = __VLS_asFunctionalComponent1(__VLS_248, new __VLS_248({
        ...{ 'onClick': {} },
        ...{ class: "btn-danger" },
    }));
    const __VLS_250 = __VLS_249({
        ...{ 'onClick': {} },
        ...{ class: "btn-danger" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_249));
    let __VLS_253;
    const __VLS_254 = {
        /** @type {typeof __VLS_253.click} */
        onClick: (__VLS_ctx.confirmDeleteSlot),
    };
    /** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
    const { default: __VLS_255 } = __VLS_251.slots;
    // @ts-ignore
    [confirmDeleteSlot,];
    var __VLS_251;
    var __VLS_252;
}
// @ts-ignore
[];
var __VLS_237;
let __VLS_256;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_257 = __VLS_asFunctionalComponent1(__VLS_256, new __VLS_256({
    name: "panel-fade",
}));
const __VLS_258 = __VLS_257({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_257));
const { default: __VLS_261 } = __VLS_259.slots;
if (__VLS_ctx.showPrivacy) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (__VLS_ctx.handlePrivacyDecline) },
        ...{ class: "fixed inset-0 z-50 flex items-center justify-center bg-bg/80" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg/80']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel w-full max-w-md mx-4 max-h-[80vh] flex flex-col" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['mx-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-[80vh]']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "text-accent text-lg mb-3 text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    let __VLS_262;
    /** @ts-ignore @type { | typeof __VLS_components.ShieldCheck} */
    ShieldCheck;
    // @ts-ignore
    const __VLS_263 = __VLS_asFunctionalComponent1(__VLS_262, new __VLS_262({
        size: (14),
        ...{ class: "inline" },
    }));
    const __VLS_264 = __VLS_263({
        size: (14),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_263));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex-1 overflow-y-auto text-xs text-muted space-y-2 mb-4 pr-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['pr-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-3 justify-center" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const __VLS_267 = Button || Button;
    // @ts-ignore
    const __VLS_268 = __VLS_asFunctionalComponent1(__VLS_267, new __VLS_267({
        ...{ 'onClick': {} },
        ...{ class: "!text-sm" },
        icon: (__VLS_ctx.ArrowLeft),
    }));
    const __VLS_269 = __VLS_268({
        ...{ 'onClick': {} },
        ...{ class: "!text-sm" },
        icon: (__VLS_ctx.ArrowLeft),
    }, ...__VLS_functionalComponentArgsRest(__VLS_268));
    let __VLS_272;
    const __VLS_273 = {
        /** @type {typeof __VLS_272.click} */
        onClick: (__VLS_ctx.handlePrivacyDecline),
    };
    /** @type {__VLS_StyleScopedClasses['!text-sm']} */ ;
    const { default: __VLS_274 } = __VLS_270.slots;
    // @ts-ignore
    [showPrivacy, ArrowLeft, handlePrivacyDecline, handlePrivacyDecline,];
    var __VLS_270;
    var __VLS_271;
    const __VLS_275 = Button || Button;
    // @ts-ignore
    const __VLS_276 = __VLS_asFunctionalComponent1(__VLS_275, new __VLS_275({
        ...{ 'onClick': {} },
        ...{ class: "!text-sm px-6" },
        icon: (__VLS_ctx.ShieldCheck),
    }));
    const __VLS_277 = __VLS_276({
        ...{ 'onClick': {} },
        ...{ class: "!text-sm px-6" },
        icon: (__VLS_ctx.ShieldCheck),
    }, ...__VLS_functionalComponentArgsRest(__VLS_276));
    let __VLS_280;
    const __VLS_281 = {
        /** @type {typeof __VLS_280.click} */
        onClick: (__VLS_ctx.handlePrivacyAgree),
    };
    /** @type {__VLS_StyleScopedClasses['!text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-6']} */ ;
    const { default: __VLS_282 } = __VLS_278.slots;
    // @ts-ignore
    [ShieldCheck, handlePrivacyAgree,];
    var __VLS_278;
    var __VLS_279;
}
// @ts-ignore
[];
var __VLS_259;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
