/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref } from 'vue';
import { X, FolderOpen, Settings, Download, Trash2, Upload, CloudUpload, CloudDownload } from 'lucide-vue-next';
import Button from '@/components/game/Button.vue';
import Divider from '@/components/game/Divider.vue';
import { SEASON_NAMES } from '@/stores/useGameStore';
import { useSaveStore } from '@/stores/useSaveStore';
import { showFloat } from '@/composables/useGameLog';
import { useWebdav } from '@/composables/useWebdav';
import { Capacitor } from '@capacitor/core';
const __VLS_props = defineProps();
const emit = defineEmits();
const saveStore = useSaveStore();
const { webdavReady, uploadSave, downloadSave } = useWebdav();
const slots = ref(saveStore.getSlots());
const menuOpen = ref(null);
const uploading = ref(false);
const downloading = ref(false);
const accountBusy = ref(false);
const refreshSlots = () => {
    slots.value = saveStore.getSlots();
};
const handleExport = (slot) => {
    if (!saveStore.exportSave(slot)) {
        showFloat('导出失败。', 'danger');
    }
};
const deleteTargetSlot = ref(null);
const handleDelete = (slot) => {
    deleteTargetSlot.value = slot;
};
const confirmDelete = () => {
    if (deleteTargetSlot.value !== null) {
        saveStore.deleteSlot(deleteTargetSlot.value);
        refreshSlots();
        emit('change');
        deleteTargetSlot.value = null;
        menuOpen.value = null;
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
        const emptySlot = slots.value.find(s => !s.exists);
        if (!emptySlot) {
            showFloat('存档槽位已满，请先删除一个旧存档。');
        }
        else if (saveStore.importSave(emptySlot.slot, content)) {
            refreshSlots();
            emit('change');
            showFloat(`已导入到存档 ${emptySlot.slot + 1}。`, 'success');
        }
        else {
            showFloat('存档文件无效或已损坏。', 'danger');
        }
        input.value = '';
    };
    reader.readAsText(file);
};
const handleUpload = async (slot) => {
    uploading.value = true;
    const result = await uploadSave(slot);
    uploading.value = false;
    showFloat(result.message, result.success ? 'success' : 'danger');
    menuOpen.value = null;
};
const handleDownload = async (slot) => {
    downloading.value = true;
    const result = await downloadSave(slot);
    downloading.value = false;
    if (result.success) {
        refreshSlots();
        emit('change');
    }
    showFloat(result.message, result.success ? 'success' : 'danger');
    menuOpen.value = null;
};
const accountToken = () => localStorage.getItem('taoyuan_account_token') || '';
const accountHeaders = () => ({ 'content-type': 'application/json', authorization: `Bearer ${accountToken()}` });
const accountApi = async (path, options = {}) => {
    const res = await fetch(path, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
        throw new Error(data.error || '请求失败');
    return data;
};
const saveKey = (slot) => `taoyuanxiang_save_${slot}`;
const currentSlot = () => {
    const slot = saveStore.activeSlot;
    if (slot >= 0)
        return slot;
    const existing = saveStore.getSlots().find(s => s.exists);
    return existing?.slot ?? 0;
};
const handleSaveCurrentLocal = () => {
    const slot = currentSlot();
    if (saveStore.saveToSlot(slot)) {
        refreshSlots();
        emit('change');
        showFloat(`当前进度已保存到存档 ${slot + 1}。`, 'success');
    }
    else {
        showFloat('保存失败，请先进入游戏后再保存。', 'danger');
    }
};
const handleSaveCurrentToAccount = async () => {
    const slot = currentSlot();
    await handleAccountUpload(slot);
};
const handleAccountUpload = async (slot) => {
    accountBusy.value = true;
    try {
        // 先把当前游戏状态写入本地槽位，再上传到账号数据库
        if (!saveStore.saveToSlot(slot))
            throw new Error('本地存档失败，请先进入游戏后再保存');
        const raw = localStorage.getItem(saveKey(slot));
        if (!raw)
            throw new Error('本地没有这个存档');
        refreshSlots();
        const info = saveStore.getSlots().find(s => s.slot === slot);
        await accountApi(`/api/saves/${slot}`, { method: 'PUT', headers: accountHeaders(), body: JSON.stringify({ raw, meta: info || {} }) });
        showFloat(`存档 ${slot + 1} 已保存到账号数据库。`, 'success');
    }
    catch (e) {
        showFloat(e.message || '保存到账号失败。', 'danger');
    }
    finally {
        accountBusy.value = false;
        menuOpen.value = null;
    }
};
const handleAccountDownload = async (slot) => {
    accountBusy.value = true;
    try {
        const data = await accountApi(`/api/saves/${slot}`, { headers: accountHeaders() });
        if (!saveStore.importSave(slot, data.raw))
            throw new Error('云端存档无效或已损坏');
        refreshSlots();
        emit('change');
        showFloat(`账号云端存档 ${slot + 1} 已下载。`, 'success');
    }
    catch (e) {
        showFloat(e.message || '账号云端下载失败。', 'danger');
    }
    finally {
        accountBusy.value = false;
        menuOpen.value = null;
    }
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
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            return __VLS_ctx.$emit('close');
            // @ts-ignore
            [$emit,];
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
    ...{ class: "game-panel w-full max-w-md text-center relative max-h-[80vh] flex flex-col" },
});
/** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-md']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-[80vh]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
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
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.X} */
X;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    size: (14),
}));
const __VLS_2 = __VLS_1({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const __VLS_5 = Divider;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    title: true,
    ...{ class: "my-4" },
    label: "存档管理",
}));
const __VLS_7 = __VLS_6({
    title: true,
    ...{ class: "my-4" },
    label: "存档管理",
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
/** @type {__VLS_StyleScopedClasses['my-4']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "grid grid-cols-1 gap-2 mb-3" },
});
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
const __VLS_10 = Button || Button;
// @ts-ignore
const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
    ...{ 'onClick': {} },
    icon: (__VLS_ctx.Download),
    ...{ class: "text-center justify-center text-sm w-full" },
    disabled: (__VLS_ctx.accountBusy),
}));
const __VLS_12 = __VLS_11({
    ...{ 'onClick': {} },
    icon: (__VLS_ctx.Download),
    ...{ class: "text-center justify-center text-sm w-full" },
    disabled: (__VLS_ctx.accountBusy),
}, ...__VLS_functionalComponentArgsRest(__VLS_11));
let __VLS_15;
const __VLS_16 = {
    /** @type {typeof __VLS_15.click} */
    onClick: (__VLS_ctx.handleSaveCurrentLocal),
};
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
const { default: __VLS_17 } = __VLS_13.slots;
// @ts-ignore
[Download, accountBusy, handleSaveCurrentLocal,];
var __VLS_13;
var __VLS_14;
const __VLS_18 = Button || Button;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
    ...{ 'onClick': {} },
    icon: (__VLS_ctx.CloudUpload),
    ...{ class: "text-center justify-center text-sm w-full" },
    disabled: (__VLS_ctx.accountBusy),
}));
const __VLS_20 = __VLS_19({
    ...{ 'onClick': {} },
    icon: (__VLS_ctx.CloudUpload),
    ...{ class: "text-center justify-center text-sm w-full" },
    disabled: (__VLS_ctx.accountBusy),
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
let __VLS_23;
const __VLS_24 = {
    /** @type {typeof __VLS_23.click} */
    onClick: (__VLS_ctx.handleSaveCurrentToAccount),
};
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
const { default: __VLS_25 } = __VLS_21.slots;
(__VLS_ctx.accountBusy ? '保存中...' : '保存当前进度到账号');
// @ts-ignore
[accountBusy, accountBusy, CloudUpload, handleSaveCurrentToAccount,];
var __VLS_21;
var __VLS_22;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            return __VLS_ctx.menuOpen = null;
            // @ts-ignore
            [menuOpen,];
        } },
    ...{ class: "flex-1 flex flex-col space-y-2 mb-3" },
});
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
for (const [info] of __VLS_vFor((__VLS_ctx.slots))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (info.slot),
    });
    if (info.exists) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-1 w-full" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        if (__VLS_ctx.allowLoad) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(info.exists))
                            throw 0;
                        if (!(__VLS_ctx.allowLoad))
                            throw 0;
                        return __VLS_ctx.$emit('load', info.slot);
                        // @ts-ignore
                        [$emit, slots, allowLoad,];
                    } },
                ...{ class: "btn flex-1 !justify-between text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['!justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "inline-flex items-center space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            let __VLS_26;
            /** @ts-ignore @type { | typeof __VLS_components.FolderOpen} */
            FolderOpen;
            // @ts-ignore
            const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
                size: (12),
            }));
            const __VLS_28 = __VLS_27({
                size: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_27));
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
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "btn flex-1 !justify-between text-xs cursor-default" },
            });
            /** @type {__VLS_StyleScopedClasses['btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['!justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-default']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "inline-flex items-center space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            let __VLS_31;
            /** @ts-ignore @type { | typeof __VLS_components.FolderOpen} */
            FolderOpen;
            // @ts-ignore
            const __VLS_32 = __VLS_asFunctionalComponent1(__VLS_31, new __VLS_31({
                size: (12),
            }));
            const __VLS_33 = __VLS_32({
                size: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_32));
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
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "relative" },
        });
        /** @type {__VLS_StyleScopedClasses['relative']} */ ;
        const __VLS_36 = Button;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
            ...{ 'onClick': {} },
            ...{ class: "px-2 h-full" },
            icon: (__VLS_ctx.Settings),
            iconSize: (12),
        }));
        const __VLS_38 = __VLS_37({
            ...{ 'onClick': {} },
            ...{ class: "px-2 h-full" },
            icon: (__VLS_ctx.Settings),
            iconSize: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        let __VLS_41;
        const __VLS_42 = {
            /** @type {typeof __VLS_41.click} */
            onClick: (...[$event]) => {
                if (!(info.exists))
                    throw 0;
                return __VLS_ctx.menuOpen = __VLS_ctx.menuOpen === info.slot ? null : info.slot;
                // @ts-ignore
                [menuOpen, menuOpen, SEASON_NAMES, SEASON_NAMES, SEASON_NAMES, SEASON_NAMES, Settings,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        var __VLS_39;
        var __VLS_40;
        if (__VLS_ctx.menuOpen === info.slot) {
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
            if (__VLS_ctx.webdavReady) {
                const __VLS_43 = Button || Button;
                // @ts-ignore
                const __VLS_44 = __VLS_asFunctionalComponent1(__VLS_43, new __VLS_43({
                    ...{ 'onClick': {} },
                    icon: (__VLS_ctx.CloudUpload),
                    iconSize: (12),
                    ...{ class: "text-center !rounded-none justify-center text-sm" },
                    disabled: (__VLS_ctx.uploading),
                }));
                const __VLS_45 = __VLS_44({
                    ...{ 'onClick': {} },
                    icon: (__VLS_ctx.CloudUpload),
                    iconSize: (12),
                    ...{ class: "text-center !rounded-none justify-center text-sm" },
                    disabled: (__VLS_ctx.uploading),
                }, ...__VLS_functionalComponentArgsRest(__VLS_44));
                let __VLS_48;
                const __VLS_49 = {
                    /** @type {typeof __VLS_48.click} */
                    onClick: (...[$event]) => {
                        if (!(info.exists))
                            throw 0;
                        if (!(__VLS_ctx.menuOpen === info.slot))
                            throw 0;
                        if (!(__VLS_ctx.webdavReady))
                            throw 0;
                        return __VLS_ctx.handleUpload(info.slot);
                        // @ts-ignore
                        [CloudUpload, menuOpen, webdavReady, uploading, handleUpload,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['!rounded-none']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                const { default: __VLS_50 } = __VLS_46.slots;
                (__VLS_ctx.uploading ? '上传中...' : '上传云端');
                // @ts-ignore
                [uploading,];
                var __VLS_46;
                var __VLS_47;
            }
            if (__VLS_ctx.webdavReady) {
                const __VLS_51 = Button || Button;
                // @ts-ignore
                const __VLS_52 = __VLS_asFunctionalComponent1(__VLS_51, new __VLS_51({
                    ...{ 'onClick': {} },
                    icon: (__VLS_ctx.CloudDownload),
                    iconSize: (12),
                    ...{ class: "text-center !rounded-none justify-center text-sm" },
                    disabled: (__VLS_ctx.downloading),
                }));
                const __VLS_53 = __VLS_52({
                    ...{ 'onClick': {} },
                    icon: (__VLS_ctx.CloudDownload),
                    iconSize: (12),
                    ...{ class: "text-center !rounded-none justify-center text-sm" },
                    disabled: (__VLS_ctx.downloading),
                }, ...__VLS_functionalComponentArgsRest(__VLS_52));
                let __VLS_56;
                const __VLS_57 = {
                    /** @type {typeof __VLS_56.click} */
                    onClick: (...[$event]) => {
                        if (!(info.exists))
                            throw 0;
                        if (!(__VLS_ctx.menuOpen === info.slot))
                            throw 0;
                        if (!(__VLS_ctx.webdavReady))
                            throw 0;
                        return __VLS_ctx.handleDownload(info.slot);
                        // @ts-ignore
                        [webdavReady, CloudDownload, downloading, handleDownload,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['!rounded-none']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                const { default: __VLS_58 } = __VLS_54.slots;
                (__VLS_ctx.downloading ? '下载中...' : '云端下载');
                // @ts-ignore
                [downloading,];
                var __VLS_54;
                var __VLS_55;
            }
            const __VLS_59 = Button || Button;
            // @ts-ignore
            const __VLS_60 = __VLS_asFunctionalComponent1(__VLS_59, new __VLS_59({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.CloudUpload),
                iconSize: (12),
                ...{ class: "text-center !rounded-none justify-center text-sm" },
                disabled: (__VLS_ctx.accountBusy),
            }));
            const __VLS_61 = __VLS_60({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.CloudUpload),
                iconSize: (12),
                ...{ class: "text-center !rounded-none justify-center text-sm" },
                disabled: (__VLS_ctx.accountBusy),
            }, ...__VLS_functionalComponentArgsRest(__VLS_60));
            let __VLS_64;
            const __VLS_65 = {
                /** @type {typeof __VLS_64.click} */
                onClick: (...[$event]) => {
                    if (!(info.exists))
                        throw 0;
                    if (!(__VLS_ctx.menuOpen === info.slot))
                        throw 0;
                    return __VLS_ctx.handleAccountUpload(info.slot);
                    // @ts-ignore
                    [accountBusy, CloudUpload, handleAccountUpload,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['!rounded-none']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            const { default: __VLS_66 } = __VLS_62.slots;
            (__VLS_ctx.accountBusy ? '保存中...' : '保存到账号');
            // @ts-ignore
            [accountBusy,];
            var __VLS_62;
            var __VLS_63;
            const __VLS_67 = Button || Button;
            // @ts-ignore
            const __VLS_68 = __VLS_asFunctionalComponent1(__VLS_67, new __VLS_67({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.CloudDownload),
                iconSize: (12),
                ...{ class: "text-center !rounded-none justify-center text-sm" },
                disabled: (__VLS_ctx.accountBusy),
            }));
            const __VLS_69 = __VLS_68({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.CloudDownload),
                iconSize: (12),
                ...{ class: "text-center !rounded-none justify-center text-sm" },
                disabled: (__VLS_ctx.accountBusy),
            }, ...__VLS_functionalComponentArgsRest(__VLS_68));
            let __VLS_72;
            const __VLS_73 = {
                /** @type {typeof __VLS_72.click} */
                onClick: (...[$event]) => {
                    if (!(info.exists))
                        throw 0;
                    if (!(__VLS_ctx.menuOpen === info.slot))
                        throw 0;
                    return __VLS_ctx.handleAccountDownload(info.slot);
                    // @ts-ignore
                    [accountBusy, CloudDownload, handleAccountDownload,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['!rounded-none']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            const { default: __VLS_74 } = __VLS_70.slots;
            (__VLS_ctx.accountBusy ? '处理中...' : '账号下载');
            // @ts-ignore
            [accountBusy,];
            var __VLS_70;
            var __VLS_71;
            if (!__VLS_ctx.Capacitor.isNativePlatform()) {
                const __VLS_75 = Button || Button;
                // @ts-ignore
                const __VLS_76 = __VLS_asFunctionalComponent1(__VLS_75, new __VLS_75({
                    ...{ 'onClick': {} },
                    icon: (__VLS_ctx.Download),
                    iconSize: (12),
                    ...{ class: "text-center !rounded-none justify-center text-sm" },
                }));
                const __VLS_77 = __VLS_76({
                    ...{ 'onClick': {} },
                    icon: (__VLS_ctx.Download),
                    iconSize: (12),
                    ...{ class: "text-center !rounded-none justify-center text-sm" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_76));
                let __VLS_80;
                const __VLS_81 = {
                    /** @type {typeof __VLS_80.click} */
                    onClick: (...[$event]) => {
                        if (!(info.exists))
                            throw 0;
                        if (!(__VLS_ctx.menuOpen === info.slot))
                            throw 0;
                        if (!(!__VLS_ctx.Capacitor.isNativePlatform()))
                            throw 0;
                        return __VLS_ctx.handleExport(info.slot);
                        // @ts-ignore
                        [Download, Capacitor, handleExport,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['!rounded-none']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                const { default: __VLS_82 } = __VLS_78.slots;
                // @ts-ignore
                [];
                var __VLS_78;
                var __VLS_79;
            }
            const __VLS_83 = Button || Button;
            // @ts-ignore
            const __VLS_84 = __VLS_asFunctionalComponent1(__VLS_83, new __VLS_83({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.Trash2),
                iconSize: (12),
                ...{ class: "btn-danger !rounded-none text-center justify-center text-sm" },
            }));
            const __VLS_85 = __VLS_84({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.Trash2),
                iconSize: (12),
                ...{ class: "btn-danger !rounded-none text-center justify-center text-sm" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_84));
            let __VLS_88;
            const __VLS_89 = {
                /** @type {typeof __VLS_88.click} */
                onClick: (...[$event]) => {
                    if (!(info.exists))
                        throw 0;
                    if (!(__VLS_ctx.menuOpen === info.slot))
                        throw 0;
                    return __VLS_ctx.handleDelete(info.slot);
                    // @ts-ignore
                    [Trash2, handleDelete,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
            /** @type {__VLS_StyleScopedClasses['!rounded-none']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            const { default: __VLS_90 } = __VLS_86.slots;
            // @ts-ignore
            [];
            var __VLS_86;
            var __VLS_87;
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-1 w-full" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-xs text-muted border border-accent/10 rounded-xs px-3 py-2 flex-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        (info.slot + 1);
        if (__VLS_ctx.webdavReady) {
            const __VLS_91 = Button || Button;
            // @ts-ignore
            const __VLS_92 = __VLS_asFunctionalComponent1(__VLS_91, new __VLS_91({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.CloudDownload),
                iconSize: (12),
                ...{ class: "px-2" },
                disabled: (__VLS_ctx.downloading),
            }));
            const __VLS_93 = __VLS_92({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.CloudDownload),
                iconSize: (12),
                ...{ class: "px-2" },
                disabled: (__VLS_ctx.downloading),
            }, ...__VLS_functionalComponentArgsRest(__VLS_92));
            let __VLS_96;
            const __VLS_97 = {
                /** @type {typeof __VLS_96.click} */
                onClick: (...[$event]) => {
                    if (!!(info.exists))
                        throw 0;
                    if (!(__VLS_ctx.webdavReady))
                        throw 0;
                    return __VLS_ctx.handleDownload(info.slot);
                    // @ts-ignore
                    [webdavReady, CloudDownload, downloading, handleDownload,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            const { default: __VLS_98 } = __VLS_94.slots;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.downloading ? '下载中...' : '云端');
            // @ts-ignore
            [downloading,];
            var __VLS_94;
            var __VLS_95;
        }
        const __VLS_99 = Button || Button;
        // @ts-ignore
        const __VLS_100 = __VLS_asFunctionalComponent1(__VLS_99, new __VLS_99({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.CloudDownload),
            iconSize: (12),
            ...{ class: "px-2" },
            disabled: (__VLS_ctx.accountBusy),
        }));
        const __VLS_101 = __VLS_100({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.CloudDownload),
            iconSize: (12),
            ...{ class: "px-2" },
            disabled: (__VLS_ctx.accountBusy),
        }, ...__VLS_functionalComponentArgsRest(__VLS_100));
        let __VLS_104;
        const __VLS_105 = {
            /** @type {typeof __VLS_104.click} */
            onClick: (...[$event]) => {
                if (!!(info.exists))
                    throw 0;
                return __VLS_ctx.handleAccountDownload(info.slot);
                // @ts-ignore
                [accountBusy, CloudDownload, handleAccountDownload,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        const { default: __VLS_106 } = __VLS_102.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        // @ts-ignore
        [];
        var __VLS_102;
        var __VLS_103;
    }
    // @ts-ignore
    [];
}
if (!__VLS_ctx.Capacitor.isNativePlatform()) {
    const __VLS_107 = Button || Button;
    // @ts-ignore
    const __VLS_108 = __VLS_asFunctionalComponent1(__VLS_107, new __VLS_107({
        ...{ 'onClick': {} },
        icon: (__VLS_ctx.Upload),
        ...{ class: "text-center justify-center text-sm w-full" },
    }));
    const __VLS_109 = __VLS_108({
        ...{ 'onClick': {} },
        icon: (__VLS_ctx.Upload),
        ...{ class: "text-center justify-center text-sm w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_108));
    let __VLS_112;
    const __VLS_113 = {
        /** @type {typeof __VLS_112.click} */
        onClick: (__VLS_ctx.triggerImport),
    };
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    const { default: __VLS_114 } = __VLS_110.slots;
    // @ts-ignore
    [Capacitor, Upload, triggerImport,];
    var __VLS_110;
    var __VLS_111;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onChange: (__VLS_ctx.handleImportFile) },
        ref: "fileInputRef",
        type: "file",
        accept: ".tyx",
        ...{ class: "hidden" },
    });
    /** @type {__VLS_StyleScopedClasses['hidden']} */ ;
}
let __VLS_115;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_116 = __VLS_asFunctionalComponent1(__VLS_115, new __VLS_115({
    name: "panel-fade",
}));
const __VLS_117 = __VLS_116({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_116));
const { default: __VLS_120 } = __VLS_118.slots;
if (__VLS_ctx.deleteTargetSlot !== null) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.deleteTargetSlot !== null))
                    throw 0;
                return __VLS_ctx.deleteTargetSlot = null;
                // @ts-ignore
                [handleImportFile, deleteTargetSlot, deleteTargetSlot,];
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
    const __VLS_121 = Button || Button;
    // @ts-ignore
    const __VLS_122 = __VLS_asFunctionalComponent1(__VLS_121, new __VLS_121({
        ...{ 'onClick': {} },
    }));
    const __VLS_123 = __VLS_122({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_122));
    let __VLS_126;
    const __VLS_127 = {
        /** @type {typeof __VLS_126.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.deleteTargetSlot !== null))
                throw 0;
            return __VLS_ctx.deleteTargetSlot = null;
            // @ts-ignore
            [deleteTargetSlot, deleteTargetSlot,];
        },
    };
    const { default: __VLS_128 } = __VLS_124.slots;
    // @ts-ignore
    [];
    var __VLS_124;
    var __VLS_125;
    const __VLS_129 = Button || Button;
    // @ts-ignore
    const __VLS_130 = __VLS_asFunctionalComponent1(__VLS_129, new __VLS_129({
        ...{ 'onClick': {} },
        ...{ class: "btn-danger" },
    }));
    const __VLS_131 = __VLS_130({
        ...{ 'onClick': {} },
        ...{ class: "btn-danger" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_130));
    let __VLS_134;
    const __VLS_135 = {
        /** @type {typeof __VLS_134.click} */
        onClick: (__VLS_ctx.confirmDelete),
    };
    /** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
    const { default: __VLS_136 } = __VLS_132.slots;
    // @ts-ignore
    [confirmDelete,];
    var __VLS_132;
    var __VLS_133;
}
// @ts-ignore
[];
var __VLS_118;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
