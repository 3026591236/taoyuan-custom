import { ref } from 'vue';
import { defineStore } from 'pinia';
export const useTutorialStore = defineStore('tutorial', () => {
    /** 总开关，默认开启 */
    const enabled = ref(true);
    /** 已显示过的晨间提示 ID 列表 */
    const shownTipIds = ref([]);
    /** 已访问过的面板列表（用于"首次访问"判定） */
    const visitedPanels = ref([]);
    /** 通用标记（如 staminaWasLow、seenRain 等） */
    const flags = ref({});
    const isTipShown = (id) => shownTipIds.value.includes(id);
    const markTipShown = (id) => {
        if (!shownTipIds.value.includes(id))
            shownTipIds.value.push(id);
    };
    const hasPanelVisited = (panel) => visitedPanels.value.includes(panel);
    const markPanelVisited = (panel) => {
        if (!visitedPanels.value.includes(panel))
            visitedPanels.value.push(panel);
    };
    const setFlag = (key, val = true) => {
        flags.value[key] = val;
    };
    const getFlag = (key) => flags.value[key] ?? false;
    const serialize = () => ({
        enabled: enabled.value,
        shownTipIds: shownTipIds.value,
        visitedPanels: visitedPanels.value,
        flags: flags.value
    });
    const deserialize = (data) => {
        enabled.value = data?.enabled ?? true;
        shownTipIds.value = data?.shownTipIds ?? [];
        visitedPanels.value = data?.visitedPanels ?? [];
        flags.value = data?.flags ?? {};
    };
    return {
        enabled,
        shownTipIds,
        visitedPanels,
        flags,
        isTipShown,
        markTipShown,
        hasPanelVisited,
        markPanelVisited,
        setFlag,
        getFlag,
        serialize,
        deserialize
    };
});
