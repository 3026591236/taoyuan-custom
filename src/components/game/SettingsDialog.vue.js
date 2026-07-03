/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { X, Pause, Play, Volume2, VolumeX, Headphones, HeadphoneOff, FolderOpen, Minus, Plus, ArrowUpLeft, ArrowUp, ArrowUpRight, ArrowLeft, Circle, ArrowRight, ArrowDownLeft, ArrowDown, ArrowDownRight, Settings, Palette, Bell } from 'lucide-vue-next';
import Button from '@/components/game/Button.vue';
import Divider from '@/components/game/Divider.vue';
import { useAudio } from '@/composables/useAudio';
import { useGameClock } from '@/composables/useGameClock';
import { useGameLog } from '@/composables/useGameLog';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTutorialStore } from '@/stores/useTutorialStore';
import { useWebdav } from '@/composables/useWebdav';
import { THEMES } from '@/data/themes';
import SaveManager from '@/components/game/SaveManager.vue';
import ClipboardJS from 'clipboard';
const SETTINGS_TABS = [
    { key: 'general', label: '通用', icon: Settings },
    { key: 'display', label: '外观', icon: Palette },
    { key: 'notification', label: '通知', icon: Bell }
];
const QMSG_POSITIONS = [
    { value: 'topleft', label: '左上', icon: ArrowUpLeft },
    { value: 'top', label: '上', icon: ArrowUp },
    { value: 'topright', label: '右上', icon: ArrowUpRight },
    { value: 'left', label: '左', icon: ArrowLeft },
    { value: 'center', label: '中', icon: Circle },
    { value: 'right', label: '右', icon: ArrowRight },
    { value: 'bottomleft', label: '左下', icon: ArrowDownLeft },
    { value: 'bottom', label: '下', icon: ArrowDown },
    { value: 'bottomright', label: '右下', icon: ArrowDownRight }
];
const WRAP_OPTIONS = [
    { value: 'no-wrap', label: '不处理' },
    { value: 'wrap', label: '换行' },
    { value: 'ellipsis', label: '省略号' }
];
const TOGGLE_OPTIONS = [
    { key: 'qmsgAnimation', label: '弹出动画' },
    { key: 'qmsgAutoClose', label: '自动关闭' },
    { key: 'qmsgShowClose', label: '显示关闭图标' },
    { key: 'qmsgShowIcon', label: '显示左侧图标' },
    { key: 'qmsgShowReverse', label: '弹出方向逆反' }
];
const __VLS_props = defineProps();
const __VLS_emit = defineEmits();
const activeTab = ref('general');
const { sfxEnabled, bgmEnabled, toggleSfx, toggleBgm } = useAudio();
const { isPaused, gameSpeed, togglePause, cycleSpeed } = useGameClock();
const { showFloat } = useGameLog();
const settingsStore = useSettingsStore();
const tutorialStore = useTutorialStore();
const { webdavConfig, webdavTestStatus, webdavTestError, webdavTraceLogs, saveConfig: saveWebdavConfig, clearTrace: clearWebdavTrace, testConnection } = useWebdav();
const showSaveManager = ref(false);
let clipboard = null;
onMounted(() => {
    clipboard = new ClipboardJS('.webdav-log-copy', {
        text: () => webdavTraceLogs.value.join('\n')
    });
    clipboard.on('success', e => {
        e.clearSelection();
        showFloat('日志已复制', 'success');
    });
    clipboard.on('error', () => {
        document.body.classList.remove('select-none');
        showFloat('复制失败，请手动复制', 'danger');
    });
});
onBeforeUnmount(() => {
    clipboard?.destroy();
    clipboard = null;
});
const handleTestWebdav = async () => {
    await testConnection();
};
const setWebdavEnabled = (val) => {
    webdavConfig.value.enabled = val;
    saveWebdavConfig();
};
const changeTimeout = (delta) => {
    settingsStore.qmsgTimeout = Math.min(10000, Math.max(500, settingsStore.qmsgTimeout + delta));
    settingsStore.syncQmsgConfig();
};
const changeMaxNums = (delta) => {
    settingsStore.qmsgMaxNums = Math.min(20, Math.max(1, settingsStore.qmsgMaxNums + delta));
    settingsStore.syncQmsgConfig();
};
const changeLimitWidth = (delta) => {
    settingsStore.qmsgLimitWidthNum = Math.min(800, Math.max(100, settingsStore.qmsgLimitWidthNum + delta));
    settingsStore.syncQmsgConfig();
};
const changeWrap = (value) => {
    settingsStore.qmsgLimitWidthWrap = value;
    settingsStore.syncQmsgConfig();
};
const setBool = (key, value) => {
    settingsStore[key] = value;
    settingsStore.syncQmsgConfig();
};
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    name: "panel-fade",
}));
const __VLS_2 = __VLS_1({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const { default: __VLS_5 } = __VLS_3.slots;
if (__VLS_ctx.open) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.open))
                    throw 0;
                return __VLS_ctx.$emit('close');
                // @ts-ignore
                [open, $emit,];
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
        ...{ class: "game-panel w-full max-w-xs text-center relative" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.open))
                    throw 0;
                return __VLS_ctx.$emit('close');
                // @ts-ignore
                [$emit,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_6;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        size: (14),
    }));
    const __VLS_8 = __VLS_7({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    const __VLS_11 = Divider;
    // @ts-ignore
    const __VLS_12 = __VLS_asFunctionalComponent1(__VLS_11, new __VLS_11({
        title: true,
        ...{ class: "my-4" },
        label: "设置",
    }));
    const __VLS_13 = __VLS_12({
        title: true,
        ...{ class: "my-4" },
        label: "设置",
    }, ...__VLS_functionalComponentArgsRest(__VLS_12));
    /** @type {__VLS_StyleScopedClasses['my-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-3 justify-center gap-1 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [tab] of __VLS_vFor((__VLS_ctx.SETTINGS_TABS))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.open))
                        throw 0;
                    return __VLS_ctx.activeTab = tab.key;
                    // @ts-ignore
                    [SETTINGS_TABS, activeTab,];
                } },
            key: (tab.key),
            ...{ class: "text-xs py-1 px-3 border rounded-xs transition-colors" },
            ...{ class: (__VLS_ctx.activeTab === tab.key ? 'border-accent bg-accent/20 text-accent' : 'border-accent/20 text-muted hover:text-text') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
        const __VLS_16 = (tab.icon);
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
            size: (12),
            ...{ class: "inline-block align-[-2px] mr-1" },
        }));
        const __VLS_18 = __VLS_17({
            size: (12),
            ...{ class: "inline-block align-[-2px] mr-1" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        /** @type {__VLS_StyleScopedClasses['inline-block']} */ ;
        /** @type {__VLS_StyleScopedClasses['align-[-2px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        (tab.label);
        // @ts-ignore
        [activeTab,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
    if (__VLS_ctx.activeTab === 'general') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "max-h-[40vh] overflow-y-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['max-h-[40vh]']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-3 mr-1 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-center space-x-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        const __VLS_21 = Button || Button;
        // @ts-ignore
        const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.isPaused ? __VLS_ctx.Play : __VLS_ctx.Pause),
            iconSize: (12),
            ...{ class: "py-1 px-3" },
        }));
        const __VLS_23 = __VLS_22({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.isPaused ? __VLS_ctx.Play : __VLS_ctx.Pause),
            iconSize: (12),
            ...{ class: "py-1 px-3" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_22));
        let __VLS_26;
        const __VLS_27 = {
            /** @type {typeof __VLS_26.click} */
            onClick: (__VLS_ctx.togglePause),
        };
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        const { default: __VLS_28 } = __VLS_24.slots;
        (__VLS_ctx.isPaused ? '继续' : '暂停');
        // @ts-ignore
        [activeTab, isPaused, isPaused, Play, Pause, togglePause,];
        var __VLS_24;
        var __VLS_25;
        const __VLS_29 = Button || Button;
        // @ts-ignore
        const __VLS_30 = __VLS_asFunctionalComponent1(__VLS_29, new __VLS_29({
            ...{ 'onClick': {} },
            ...{ class: "py-1 px-3" },
        }));
        const __VLS_31 = __VLS_30({
            ...{ 'onClick': {} },
            ...{ class: "py-1 px-3" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_30));
        let __VLS_34;
        const __VLS_35 = {
            /** @type {typeof __VLS_34.click} */
            onClick: (__VLS_ctx.cycleSpeed),
        };
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        const { default: __VLS_36 } = __VLS_32.slots;
        (__VLS_ctx.gameSpeed);
        // @ts-ignore
        [cycleSpeed, gameSpeed,];
        var __VLS_32;
        var __VLS_33;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-3 mr-1 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-center space-x-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        const __VLS_37 = Button || Button;
        // @ts-ignore
        const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.sfxEnabled ? __VLS_ctx.Volume2 : __VLS_ctx.VolumeX),
            iconSize: (12),
            ...{ class: "py-1 px-3" },
        }));
        const __VLS_39 = __VLS_38({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.sfxEnabled ? __VLS_ctx.Volume2 : __VLS_ctx.VolumeX),
            iconSize: (12),
            ...{ class: "py-1 px-3" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_38));
        let __VLS_42;
        const __VLS_43 = {
            /** @type {typeof __VLS_42.click} */
            onClick: (__VLS_ctx.toggleSfx),
        };
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        const { default: __VLS_44 } = __VLS_40.slots;
        // @ts-ignore
        [sfxEnabled, Volume2, VolumeX, toggleSfx,];
        var __VLS_40;
        var __VLS_41;
        const __VLS_45 = Button || Button;
        // @ts-ignore
        const __VLS_46 = __VLS_asFunctionalComponent1(__VLS_45, new __VLS_45({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.bgmEnabled ? __VLS_ctx.Headphones : __VLS_ctx.HeadphoneOff),
            iconSize: (12),
            ...{ class: "py-1 px-3" },
        }));
        const __VLS_47 = __VLS_46({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.bgmEnabled ? __VLS_ctx.Headphones : __VLS_ctx.HeadphoneOff),
            iconSize: (12),
            ...{ class: "py-1 px-3" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_46));
        let __VLS_50;
        const __VLS_51 = {
            /** @type {typeof __VLS_50.click} */
            onClick: (__VLS_ctx.toggleBgm),
        };
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        const { default: __VLS_52 } = __VLS_48.slots;
        // @ts-ignore
        [bgmEnabled, Headphones, HeadphoneOff, toggleBgm,];
        var __VLS_48;
        var __VLS_49;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-3 mr-1 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted/50 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-center space-x-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        const __VLS_53 = Button || Button;
        // @ts-ignore
        const __VLS_54 = __VLS_asFunctionalComponent1(__VLS_53, new __VLS_53({
            ...{ 'onClick': {} },
            ...{ class: "py-1 px-3" },
            ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tutorialStore.enabled }) },
        }));
        const __VLS_55 = __VLS_54({
            ...{ 'onClick': {} },
            ...{ class: "py-1 px-3" },
            ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tutorialStore.enabled }) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_54));
        let __VLS_58;
        const __VLS_59 = {
            /** @type {typeof __VLS_58.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.open))
                    throw 0;
                if (!(__VLS_ctx.activeTab === 'general'))
                    throw 0;
                return __VLS_ctx.tutorialStore.enabled = true;
                // @ts-ignore
                [tutorialStore, tutorialStore,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        const { default: __VLS_60 } = __VLS_56.slots;
        // @ts-ignore
        [];
        var __VLS_56;
        var __VLS_57;
        const __VLS_61 = Button || Button;
        // @ts-ignore
        const __VLS_62 = __VLS_asFunctionalComponent1(__VLS_61, new __VLS_61({
            ...{ 'onClick': {} },
            ...{ class: "py-1 px-3" },
            ...{ class: ({ '!bg-accent !text-bg': !__VLS_ctx.tutorialStore.enabled }) },
        }));
        const __VLS_63 = __VLS_62({
            ...{ 'onClick': {} },
            ...{ class: "py-1 px-3" },
            ...{ class: ({ '!bg-accent !text-bg': !__VLS_ctx.tutorialStore.enabled }) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_62));
        let __VLS_66;
        const __VLS_67 = {
            /** @type {typeof __VLS_66.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.open))
                    throw 0;
                if (!(__VLS_ctx.activeTab === 'general'))
                    throw 0;
                return __VLS_ctx.tutorialStore.enabled = false;
                // @ts-ignore
                [tutorialStore, tutorialStore,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        const { default: __VLS_68 } = __VLS_64.slots;
        // @ts-ignore
        [];
        var __VLS_64;
        var __VLS_65;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-3 mr-1" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        const __VLS_69 = Button || Button;
        // @ts-ignore
        const __VLS_70 = __VLS_asFunctionalComponent1(__VLS_69, new __VLS_69({
            ...{ 'onClick': {} },
            ...{ class: "py-0.5 px-2 text-[10px]" },
            ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.webdavConfig.enabled }) },
        }));
        const __VLS_71 = __VLS_70({
            ...{ 'onClick': {} },
            ...{ class: "py-0.5 px-2 text-[10px]" },
            ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.webdavConfig.enabled }) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_70));
        let __VLS_74;
        const __VLS_75 = {
            /** @type {typeof __VLS_74.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.open))
                    throw 0;
                if (!(__VLS_ctx.activeTab === 'general'))
                    throw 0;
                return __VLS_ctx.setWebdavEnabled(true);
                // @ts-ignore
                [webdavConfig, setWebdavEnabled,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        const { default: __VLS_76 } = __VLS_72.slots;
        // @ts-ignore
        [];
        var __VLS_72;
        var __VLS_73;
        const __VLS_77 = Button || Button;
        // @ts-ignore
        const __VLS_78 = __VLS_asFunctionalComponent1(__VLS_77, new __VLS_77({
            ...{ 'onClick': {} },
            ...{ class: "py-0.5 px-2 text-[10px]" },
            ...{ class: ({ '!bg-accent !text-bg': !__VLS_ctx.webdavConfig.enabled }) },
        }));
        const __VLS_79 = __VLS_78({
            ...{ 'onClick': {} },
            ...{ class: "py-0.5 px-2 text-[10px]" },
            ...{ class: ({ '!bg-accent !text-bg': !__VLS_ctx.webdavConfig.enabled }) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_78));
        let __VLS_82;
        const __VLS_83 = {
            /** @type {typeof __VLS_82.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.open))
                    throw 0;
                if (!(__VLS_ctx.activeTab === 'general'))
                    throw 0;
                return __VLS_ctx.setWebdavEnabled(false);
                // @ts-ignore
                [webdavConfig, setWebdavEnabled,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        const { default: __VLS_84 } = __VLS_80.slots;
        // @ts-ignore
        [];
        var __VLS_80;
        var __VLS_81;
        if (__VLS_ctx.webdavConfig.enabled) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col space-y-2" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "text-[10px] text-muted mb-0.5 block" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ onChange: (__VLS_ctx.saveWebdavConfig) },
                placeholder: "请输入WebDAV云同步服务器地址",
                ...{ class: "w-full px-2 py-1.5 bg-bg border border-accent/30 rounded-xs text-xs text-text focus:border-accent outline-none placeholder:text-muted/40 transition-colors" },
            });
            (__VLS_ctx.webdavConfig.serverUrl);
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
            /** @type {__VLS_StyleScopedClasses['focus:border-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['outline-none']} */ ;
            /** @type {__VLS_StyleScopedClasses['placeholder:text-muted/40']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "text-[10px] text-muted mb-0.5 block" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ onChange: (__VLS_ctx.saveWebdavConfig) },
                placeholder: "如果没有路径需求的话可以为空",
                ...{ class: "w-full px-2 py-1.5 bg-bg border border-accent/30 rounded-xs text-xs text-text focus:border-accent outline-none placeholder:text-muted/40 transition-colors" },
            });
            (__VLS_ctx.webdavConfig.path);
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
            /** @type {__VLS_StyleScopedClasses['focus:border-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['outline-none']} */ ;
            /** @type {__VLS_StyleScopedClasses['placeholder:text-muted/40']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-muted/50 mt-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "grid grid-cols-2 gap-2" },
            });
            /** @type {__VLS_StyleScopedClasses['grid']} */ ;
            /** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "text-[10px] text-muted mb-0.5 block" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ onChange: (__VLS_ctx.saveWebdavConfig) },
                placeholder: "请输入用户名",
                ...{ class: "w-full px-2 py-1.5 bg-bg border border-accent/30 rounded-xs text-xs text-text focus:border-accent outline-none placeholder:text-muted/40 transition-colors" },
            });
            (__VLS_ctx.webdavConfig.username);
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
            /** @type {__VLS_StyleScopedClasses['focus:border-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['outline-none']} */ ;
            /** @type {__VLS_StyleScopedClasses['placeholder:text-muted/40']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "text-[10px] text-muted mb-0.5 block" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ onChange: (__VLS_ctx.saveWebdavConfig) },
                type: "password",
                placeholder: "请输入密码",
                ...{ class: "w-full px-2 py-1.5 bg-bg border border-accent/30 rounded-xs text-xs text-text focus:border-accent outline-none placeholder:text-muted/40 transition-colors" },
            });
            (__VLS_ctx.webdavConfig.password);
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
            /** @type {__VLS_StyleScopedClasses['focus:border-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['outline-none']} */ ;
            /** @type {__VLS_StyleScopedClasses['placeholder:text-muted/40']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            const __VLS_85 = Button || Button;
            // @ts-ignore
            const __VLS_86 = __VLS_asFunctionalComponent1(__VLS_85, new __VLS_85({
                ...{ 'onClick': {} },
                ...{ class: "py-1 px-3 text-xs w-full justify-center" },
                disabled: (__VLS_ctx.webdavTestStatus === 'testing' || !__VLS_ctx.webdavConfig.serverUrl),
            }));
            const __VLS_87 = __VLS_86({
                ...{ 'onClick': {} },
                ...{ class: "py-1 px-3 text-xs w-full justify-center" },
                disabled: (__VLS_ctx.webdavTestStatus === 'testing' || !__VLS_ctx.webdavConfig.serverUrl),
            }, ...__VLS_functionalComponentArgsRest(__VLS_86));
            let __VLS_90;
            const __VLS_91 = {
                /** @type {typeof __VLS_90.click} */
                onClick: (__VLS_ctx.handleTestWebdav),
            };
            /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            const { default: __VLS_92 } = __VLS_88.slots;
            (__VLS_ctx.webdavTestStatus === 'testing' ? '测试中...' : '测试连接');
            // @ts-ignore
            [webdavConfig, webdavConfig, webdavConfig, webdavConfig, webdavConfig, webdavConfig, saveWebdavConfig, saveWebdavConfig, saveWebdavConfig, saveWebdavConfig, webdavTestStatus, webdavTestStatus, handleTestWebdav,];
            var __VLS_88;
            var __VLS_89;
            if (__VLS_ctx.webdavTestStatus === 'success') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-success text-xs text-center mt-1 break-words" },
                });
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['break-words']} */ ;
            }
            if (__VLS_ctx.webdavTestStatus === 'failed') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-danger text-xs text-center mt-1 break-words" },
                });
                /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['break-words']} */ ;
                (__VLS_ctx.webdavTestError || '连接失败');
            }
            if (__VLS_ctx.webdavTraceLogs.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "border border-accent/20 rounded-xs p-2 bg-bg/40" },
                });
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-bg/40']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center justify-between mb-1" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-[10px] text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (__VLS_ctx.clearWebdavTrace) },
                    ...{ class: "text-[10px] text-muted hover:text-text" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "max-h-28 overflow-y-auto text-left" },
                });
                /** @type {__VLS_StyleScopedClasses['max-h-28']} */ ;
                /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-left']} */ ;
                for (const [line, idx] of __VLS_vFor((__VLS_ctx.webdavTraceLogs))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        key: (idx),
                        ...{ class: "text-[10px] text-muted/80 leading-4 break-all" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-muted/80']} */ ;
                    /** @type {__VLS_StyleScopedClasses['leading-4']} */ ;
                    /** @type {__VLS_StyleScopedClasses['break-all']} */ ;
                    (line);
                    // @ts-ignore
                    [webdavTestStatus, webdavTestStatus, webdavTestError, webdavTraceLogs, webdavTraceLogs, clearWebdavTrace,];
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ class: "webdav-log-copy text-[10px] text-muted hover:text-text" },
                });
                /** @type {__VLS_StyleScopedClasses['webdav-log-copy']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
            }
        }
    }
    if (__VLS_ctx.activeTab === 'display') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-3" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-center space-x-3" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
        const __VLS_93 = Button;
        // @ts-ignore
        const __VLS_94 = __VLS_asFunctionalComponent1(__VLS_93, new __VLS_93({
            ...{ 'onClick': {} },
            ...{ class: "py-1 px-3" },
            icon: (__VLS_ctx.Minus),
            iconSize: (12),
            disabled: (__VLS_ctx.settingsStore.fontSize <= 12),
        }));
        const __VLS_95 = __VLS_94({
            ...{ 'onClick': {} },
            ...{ class: "py-1 px-3" },
            icon: (__VLS_ctx.Minus),
            iconSize: (12),
            disabled: (__VLS_ctx.settingsStore.fontSize <= 12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_94));
        let __VLS_98;
        const __VLS_99 = {
            /** @type {typeof __VLS_98.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.open))
                    throw 0;
                if (!(__VLS_ctx.activeTab === 'display'))
                    throw 0;
                return __VLS_ctx.settingsStore.changeFontSize(-1);
                // @ts-ignore
                [activeTab, Minus, settingsStore, settingsStore,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        var __VLS_96;
        var __VLS_97;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-sm w-8 text-center" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-8']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        (__VLS_ctx.settingsStore.fontSize);
        const __VLS_100 = Button;
        // @ts-ignore
        const __VLS_101 = __VLS_asFunctionalComponent1(__VLS_100, new __VLS_100({
            ...{ 'onClick': {} },
            ...{ class: "py-1 px-3" },
            icon: (__VLS_ctx.Plus),
            iconSize: (12),
            disabled: (__VLS_ctx.settingsStore.fontSize >= 24),
        }));
        const __VLS_102 = __VLS_101({
            ...{ 'onClick': {} },
            ...{ class: "py-1 px-3" },
            icon: (__VLS_ctx.Plus),
            iconSize: (12),
            disabled: (__VLS_ctx.settingsStore.fontSize >= 24),
        }, ...__VLS_functionalComponentArgsRest(__VLS_101));
        let __VLS_105;
        const __VLS_106 = {
            /** @type {typeof __VLS_105.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.open))
                    throw 0;
                if (!(__VLS_ctx.activeTab === 'display'))
                    throw 0;
                return __VLS_ctx.settingsStore.changeFontSize(1);
                // @ts-ignore
                [settingsStore, settingsStore, settingsStore, Plus,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        var __VLS_103;
        var __VLS_104;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-3" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-center space-x-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        for (const [t] of __VLS_vFor((__VLS_ctx.THEMES))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.open))
                            throw 0;
                        if (!(__VLS_ctx.activeTab === 'display'))
                            throw 0;
                        return __VLS_ctx.settingsStore.changeTheme(t.key);
                        // @ts-ignore
                        [settingsStore, THEMES,];
                    } },
                key: (t.key),
                ...{ class: "w-8 h-8 border rounded-xs flex items-center justify-center text-[10px] transition-colors" },
                ...{ class: (__VLS_ctx.settingsStore.theme === t.key ? 'border-accent' : 'border-accent/20') },
                ...{ style: ({ backgroundColor: t.bg, color: t.text }) },
                title: (t.name),
            });
            /** @type {__VLS_StyleScopedClasses['w-8']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-8']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            (t.name.charAt(0));
            // @ts-ignore
            [settingsStore,];
        }
    }
    if (__VLS_ctx.activeTab === 'notification') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "max-h-[40vh] overflow-y-auto flex flex-col space-y-3" },
        });
        /** @type {__VLS_StyleScopedClasses['max-h-[40vh]']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-3 mr-1" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "grid grid-cols-3 gap-1 w-24 mx-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-24']} */ ;
        /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
        for (const [pos] of __VLS_vFor((__VLS_ctx.QMSG_POSITIONS))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.open))
                            throw 0;
                        if (!(__VLS_ctx.activeTab === 'notification'))
                            throw 0;
                        return __VLS_ctx.settingsStore.changeQmsgPosition(pos.value);
                        // @ts-ignore
                        [activeTab, settingsStore, QMSG_POSITIONS,];
                    } },
                key: (pos.value),
                ...{ class: "w-8 h-6 border rounded-xs transition-colors flex items-center justify-center" },
                ...{ class: (__VLS_ctx.settingsStore.qmsgPosition === pos.value ? 'border-accent bg-accent/20 text-accent' : 'border-accent/20 text-muted') },
                title: (pos.label),
            });
            /** @type {__VLS_StyleScopedClasses['w-8']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            const __VLS_107 = (pos.icon);
            // @ts-ignore
            const __VLS_108 = __VLS_asFunctionalComponent1(__VLS_107, new __VLS_107({
                size: (10),
            }));
            const __VLS_109 = __VLS_108({
                size: (10),
            }, ...__VLS_functionalComponentArgsRest(__VLS_108));
            // @ts-ignore
            [settingsStore,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-3 mr-1" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-center space-x-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        const __VLS_112 = Button;
        // @ts-ignore
        const __VLS_113 = __VLS_asFunctionalComponent1(__VLS_112, new __VLS_112({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1.5" },
            icon: (__VLS_ctx.Minus),
            iconSize: (10),
            disabled: (__VLS_ctx.settingsStore.qmsgTimeout <= 500),
        }));
        const __VLS_114 = __VLS_113({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1.5" },
            icon: (__VLS_ctx.Minus),
            iconSize: (10),
            disabled: (__VLS_ctx.settingsStore.qmsgTimeout <= 500),
        }, ...__VLS_functionalComponentArgsRest(__VLS_113));
        let __VLS_117;
        const __VLS_118 = {
            /** @type {typeof __VLS_117.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.open))
                    throw 0;
                if (!(__VLS_ctx.activeTab === 'notification'))
                    throw 0;
                return __VLS_ctx.changeTimeout(-500);
                // @ts-ignore
                [Minus, settingsStore, changeTimeout,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        var __VLS_115;
        var __VLS_116;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs w-12 text-center" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-12']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        ((__VLS_ctx.settingsStore.qmsgTimeout / 1000).toFixed(1));
        const __VLS_119 = Button;
        // @ts-ignore
        const __VLS_120 = __VLS_asFunctionalComponent1(__VLS_119, new __VLS_119({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1.5" },
            icon: (__VLS_ctx.Plus),
            iconSize: (10),
            disabled: (__VLS_ctx.settingsStore.qmsgTimeout >= 10000),
        }));
        const __VLS_121 = __VLS_120({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1.5" },
            icon: (__VLS_ctx.Plus),
            iconSize: (10),
            disabled: (__VLS_ctx.settingsStore.qmsgTimeout >= 10000),
        }, ...__VLS_functionalComponentArgsRest(__VLS_120));
        let __VLS_124;
        const __VLS_125 = {
            /** @type {typeof __VLS_124.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.open))
                    throw 0;
                if (!(__VLS_ctx.activeTab === 'notification'))
                    throw 0;
                return __VLS_ctx.changeTimeout(500);
                // @ts-ignore
                [settingsStore, settingsStore, Plus, changeTimeout,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        var __VLS_122;
        var __VLS_123;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-3 mr-1" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-center space-x-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        const __VLS_126 = Button;
        // @ts-ignore
        const __VLS_127 = __VLS_asFunctionalComponent1(__VLS_126, new __VLS_126({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1.5" },
            icon: (__VLS_ctx.Minus),
            iconSize: (10),
            disabled: (__VLS_ctx.settingsStore.qmsgMaxNums <= 1),
        }));
        const __VLS_128 = __VLS_127({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1.5" },
            icon: (__VLS_ctx.Minus),
            iconSize: (10),
            disabled: (__VLS_ctx.settingsStore.qmsgMaxNums <= 1),
        }, ...__VLS_functionalComponentArgsRest(__VLS_127));
        let __VLS_131;
        const __VLS_132 = {
            /** @type {typeof __VLS_131.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.open))
                    throw 0;
                if (!(__VLS_ctx.activeTab === 'notification'))
                    throw 0;
                return __VLS_ctx.changeMaxNums(-1);
                // @ts-ignore
                [Minus, settingsStore, changeMaxNums,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        var __VLS_129;
        var __VLS_130;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs w-6 text-center" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        (__VLS_ctx.settingsStore.qmsgMaxNums);
        const __VLS_133 = Button;
        // @ts-ignore
        const __VLS_134 = __VLS_asFunctionalComponent1(__VLS_133, new __VLS_133({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1.5" },
            icon: (__VLS_ctx.Plus),
            iconSize: (10),
            disabled: (__VLS_ctx.settingsStore.qmsgMaxNums >= 20),
        }));
        const __VLS_135 = __VLS_134({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1.5" },
            icon: (__VLS_ctx.Plus),
            iconSize: (10),
            disabled: (__VLS_ctx.settingsStore.qmsgMaxNums >= 20),
        }, ...__VLS_functionalComponentArgsRest(__VLS_134));
        let __VLS_138;
        const __VLS_139 = {
            /** @type {typeof __VLS_138.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.open))
                    throw 0;
                if (!(__VLS_ctx.activeTab === 'notification'))
                    throw 0;
                return __VLS_ctx.changeMaxNums(1);
                // @ts-ignore
                [settingsStore, settingsStore, Plus, changeMaxNums,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        var __VLS_136;
        var __VLS_137;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-3 mr-1" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-center space-x-1 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        const __VLS_140 = Button || Button;
        // @ts-ignore
        const __VLS_141 = __VLS_asFunctionalComponent1(__VLS_140, new __VLS_140({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-2" },
            ...{ class: (__VLS_ctx.settingsStore.qmsgIsLimitWidth ? '!bg-accent/20 !text-accent !border-accent' : '') },
        }));
        const __VLS_142 = __VLS_141({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-2" },
            ...{ class: (__VLS_ctx.settingsStore.qmsgIsLimitWidth ? '!bg-accent/20 !text-accent !border-accent' : '') },
        }, ...__VLS_functionalComponentArgsRest(__VLS_141));
        let __VLS_145;
        const __VLS_146 = {
            /** @type {typeof __VLS_145.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.open))
                    throw 0;
                if (!(__VLS_ctx.activeTab === 'notification'))
                    throw 0;
                return __VLS_ctx.setBool('qmsgIsLimitWidth', true);
                // @ts-ignore
                [settingsStore, setBool,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        const { default: __VLS_147 } = __VLS_143.slots;
        // @ts-ignore
        [];
        var __VLS_143;
        var __VLS_144;
        const __VLS_148 = Button || Button;
        // @ts-ignore
        const __VLS_149 = __VLS_asFunctionalComponent1(__VLS_148, new __VLS_148({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-2" },
            ...{ class: (!__VLS_ctx.settingsStore.qmsgIsLimitWidth ? '!bg-accent/20 !text-accent !border-accent' : '') },
        }));
        const __VLS_150 = __VLS_149({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-2" },
            ...{ class: (!__VLS_ctx.settingsStore.qmsgIsLimitWidth ? '!bg-accent/20 !text-accent !border-accent' : '') },
        }, ...__VLS_functionalComponentArgsRest(__VLS_149));
        let __VLS_153;
        const __VLS_154 = {
            /** @type {typeof __VLS_153.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.open))
                    throw 0;
                if (!(__VLS_ctx.activeTab === 'notification'))
                    throw 0;
                return __VLS_ctx.setBool('qmsgIsLimitWidth', false);
                // @ts-ignore
                [settingsStore, setBool,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        const { default: __VLS_155 } = __VLS_151.slots;
        // @ts-ignore
        [];
        var __VLS_151;
        var __VLS_152;
        if (__VLS_ctx.settingsStore.qmsgIsLimitWidth) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-center space-x-2 mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            const __VLS_156 = Button;
            // @ts-ignore
            const __VLS_157 = __VLS_asFunctionalComponent1(__VLS_156, new __VLS_156({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5" },
                icon: (__VLS_ctx.Minus),
                iconSize: (10),
                disabled: (__VLS_ctx.settingsStore.qmsgLimitWidthNum <= 100),
            }));
            const __VLS_158 = __VLS_157({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5" },
                icon: (__VLS_ctx.Minus),
                iconSize: (10),
                disabled: (__VLS_ctx.settingsStore.qmsgLimitWidthNum <= 100),
            }, ...__VLS_functionalComponentArgsRest(__VLS_157));
            let __VLS_161;
            const __VLS_162 = {
                /** @type {typeof __VLS_161.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.open))
                        throw 0;
                    if (!(__VLS_ctx.activeTab === 'notification'))
                        throw 0;
                    if (!(__VLS_ctx.settingsStore.qmsgIsLimitWidth))
                        throw 0;
                    return __VLS_ctx.changeLimitWidth(-50);
                    // @ts-ignore
                    [Minus, settingsStore, settingsStore, changeLimitWidth,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
            var __VLS_159;
            var __VLS_160;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs w-10 text-center" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-10']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            (__VLS_ctx.settingsStore.qmsgLimitWidthNum);
            const __VLS_163 = Button;
            // @ts-ignore
            const __VLS_164 = __VLS_asFunctionalComponent1(__VLS_163, new __VLS_163({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5" },
                icon: (__VLS_ctx.Plus),
                iconSize: (10),
                disabled: (__VLS_ctx.settingsStore.qmsgLimitWidthNum >= 800),
            }));
            const __VLS_165 = __VLS_164({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5" },
                icon: (__VLS_ctx.Plus),
                iconSize: (10),
                disabled: (__VLS_ctx.settingsStore.qmsgLimitWidthNum >= 800),
            }, ...__VLS_functionalComponentArgsRest(__VLS_164));
            let __VLS_168;
            const __VLS_169 = {
                /** @type {typeof __VLS_168.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.open))
                        throw 0;
                    if (!(__VLS_ctx.activeTab === 'notification'))
                        throw 0;
                    if (!(__VLS_ctx.settingsStore.qmsgIsLimitWidth))
                        throw 0;
                    return __VLS_ctx.changeLimitWidth(50);
                    // @ts-ignore
                    [settingsStore, settingsStore, Plus, changeLimitWidth,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
            var __VLS_166;
            var __VLS_167;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-center space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            for (const [opt] of __VLS_vFor((__VLS_ctx.WRAP_OPTIONS))) {
                const __VLS_170 = Button || Button;
                // @ts-ignore
                const __VLS_171 = __VLS_asFunctionalComponent1(__VLS_170, new __VLS_170({
                    ...{ 'onClick': {} },
                    key: (opt.value),
                    ...{ class: "!text-[10px] py-0 px-1.5" },
                    ...{ class: (__VLS_ctx.settingsStore.qmsgLimitWidthWrap === opt.value ? '!bg-accent/20 !text-accent !border-accent' : '') },
                }));
                const __VLS_172 = __VLS_171({
                    ...{ 'onClick': {} },
                    key: (opt.value),
                    ...{ class: "!text-[10px] py-0 px-1.5" },
                    ...{ class: (__VLS_ctx.settingsStore.qmsgLimitWidthWrap === opt.value ? '!bg-accent/20 !text-accent !border-accent' : '') },
                }, ...__VLS_functionalComponentArgsRest(__VLS_171));
                let __VLS_175;
                const __VLS_176 = {
                    /** @type {typeof __VLS_175.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.open))
                            throw 0;
                        if (!(__VLS_ctx.activeTab === 'notification'))
                            throw 0;
                        if (!(__VLS_ctx.settingsStore.qmsgIsLimitWidth))
                            throw 0;
                        return __VLS_ctx.changeWrap(opt.value);
                        // @ts-ignore
                        [settingsStore, WRAP_OPTIONS, changeWrap,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['!text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
                const { default: __VLS_177 } = __VLS_173.slots;
                (opt.label);
                // @ts-ignore
                [];
                var __VLS_173;
                var __VLS_174;
                // @ts-ignore
                [];
            }
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-3 mr-1 flex flex-col space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        for (const [opt] of __VLS_vFor((__VLS_ctx.TOGGLE_OPTIONS))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (opt.key),
                ...{ class: "flex flex-col items-center space-y-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (opt.label);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            const __VLS_178 = Button || Button;
            // @ts-ignore
            const __VLS_179 = __VLS_asFunctionalComponent1(__VLS_178, new __VLS_178({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-2" },
                ...{ class: (__VLS_ctx.settingsStore[opt.key] ? '!bg-accent/20 !text-accent !border-accent' : '') },
            }));
            const __VLS_180 = __VLS_179({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-2" },
                ...{ class: (__VLS_ctx.settingsStore[opt.key] ? '!bg-accent/20 !text-accent !border-accent' : '') },
            }, ...__VLS_functionalComponentArgsRest(__VLS_179));
            let __VLS_183;
            const __VLS_184 = {
                /** @type {typeof __VLS_183.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.open))
                        throw 0;
                    if (!(__VLS_ctx.activeTab === 'notification'))
                        throw 0;
                    return __VLS_ctx.setBool(opt.key, true);
                    // @ts-ignore
                    [settingsStore, setBool, TOGGLE_OPTIONS,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            const { default: __VLS_185 } = __VLS_181.slots;
            // @ts-ignore
            [];
            var __VLS_181;
            var __VLS_182;
            const __VLS_186 = Button || Button;
            // @ts-ignore
            const __VLS_187 = __VLS_asFunctionalComponent1(__VLS_186, new __VLS_186({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-2" },
                ...{ class: (!__VLS_ctx.settingsStore[opt.key] ? '!bg-accent/20 !text-accent !border-accent' : '') },
            }));
            const __VLS_188 = __VLS_187({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-2" },
                ...{ class: (!__VLS_ctx.settingsStore[opt.key] ? '!bg-accent/20 !text-accent !border-accent' : '') },
            }, ...__VLS_functionalComponentArgsRest(__VLS_187));
            let __VLS_191;
            const __VLS_192 = {
                /** @type {typeof __VLS_191.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.open))
                        throw 0;
                    if (!(__VLS_ctx.activeTab === 'notification'))
                        throw 0;
                    return __VLS_ctx.setBool(opt.key, false);
                    // @ts-ignore
                    [settingsStore, setBool,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            const { default: __VLS_193 } = __VLS_189.slots;
            // @ts-ignore
            [];
            var __VLS_189;
            var __VLS_190;
            // @ts-ignore
            [];
        }
    }
    const __VLS_194 = Button || Button;
    // @ts-ignore
    const __VLS_195 = __VLS_asFunctionalComponent1(__VLS_194, new __VLS_194({
        ...{ 'onClick': {} },
        icon: (__VLS_ctx.FolderOpen),
        iconSize: (12),
        ...{ class: "py-1 px-3 w-full justify-center mt-3" },
    }));
    const __VLS_196 = __VLS_195({
        ...{ 'onClick': {} },
        icon: (__VLS_ctx.FolderOpen),
        iconSize: (12),
        ...{ class: "py-1 px-3 w-full justify-center mt-3" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_195));
    let __VLS_199;
    const __VLS_200 = {
        /** @type {typeof __VLS_199.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.open))
                throw 0;
            return __VLS_ctx.showSaveManager = true;
            // @ts-ignore
            [FolderOpen, showSaveManager,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
    const { default: __VLS_201 } = __VLS_197.slots;
    // @ts-ignore
    [];
    var __VLS_197;
    var __VLS_198;
}
// @ts-ignore
[];
var __VLS_3;
let __VLS_202;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_203 = __VLS_asFunctionalComponent1(__VLS_202, new __VLS_202({
    name: "panel-fade",
}));
const __VLS_204 = __VLS_203({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_203));
const { default: __VLS_207 } = __VLS_205.slots;
if (__VLS_ctx.showSaveManager) {
    const __VLS_208 = SaveManager;
    // @ts-ignore
    const __VLS_209 = __VLS_asFunctionalComponent1(__VLS_208, new __VLS_208({
        ...{ 'onClose': {} },
    }));
    const __VLS_210 = __VLS_209({
        ...{ 'onClose': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_209));
    let __VLS_213;
    const __VLS_214 = {
        /** @type {typeof __VLS_213.close} */
        onClose: (...[$event]) => {
            if (!(__VLS_ctx.showSaveManager))
                throw 0;
            return __VLS_ctx.showSaveManager = false;
            // @ts-ignore
            [showSaveManager, showSaveManager,];
        },
    };
    var __VLS_211;
    var __VLS_212;
}
// @ts-ignore
[];
var __VLS_205;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
