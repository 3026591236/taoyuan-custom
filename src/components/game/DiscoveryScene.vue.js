/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import { getHiddenNpcById } from '@/data/hiddenNpcs';
import { useHiddenNpcStore } from '@/stores/useHiddenNpcStore';
import Button from '@/components/game/Button.vue';
const props = defineProps();
const emit = defineEmits();
const PHASE_LABELS = {
    unknown: '',
    rumor: '—— 传闻 ——',
    glimpse: '—— 惊鸿一瞥 ——',
    encounter: '—— 邂逅 ——',
    revealed: '—— 显现 ——'
};
const npcDef = computed(() => getHiddenNpcById(props.npcId));
const phaseLabel = computed(() => PHASE_LABELS[props.step.phase]);
const stepTitle = computed(() => {
    if (props.step.phase === 'revealed' && npcDef.value)
        return `${npcDef.value.name}显现了真容`;
    if (props.step.phase === 'encounter' && npcDef.value)
        return `与${npcDef.value.name}的邂逅`;
    return props.step.logMessage ?? '神秘的异象';
});
const currentIndex = ref(0);
const playedScenes = ref([]);
const hasChosen = ref(false);
const choiceResponse = ref(null);
const currentScene = computed(() => {
    return props.step.scenes[currentIndex.value] ?? null;
});
const isLastScene = computed(() => {
    return currentIndex.value >= props.step.scenes.length - 1;
});
const handleChoice = (choice) => {
    hasChosen.value = true;
    choiceResponse.value = choice.response;
    if (choice.friendshipChange !== 0) {
        const hiddenNpcStore = useHiddenNpcStore();
        hiddenNpcStore.addAffinity(props.npcId, choice.friendshipChange);
    }
};
const nextScene = () => {
    playedScenes.value.push({
        text: currentScene.value?.text ?? '',
        chosenResponse: choiceResponse.value ?? undefined
    });
    if (isLastScene.value) {
        emit('close');
        return;
    }
    currentIndex.value++;
    hasChosen.value = false;
    choiceResponse.value = null;
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
    ...{ class: "fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" },
});
/** @type {__VLS_StyleScopedClasses['fixed']} */ ;
/** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-black/80']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['z-50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "game-panel max-w-lg w-full max-h-[80vh] overflow-y-auto border-accent/40" },
});
/** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-[80vh]']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/40']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-[10px] text-accent/50 mb-1 text-center" },
});
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent/50']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
(__VLS_ctx.phaseLabel);
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "text-accent text-sm mb-3" },
});
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
(__VLS_ctx.stepTitle);
for (const [scene, i] of __VLS_vFor((__VLS_ctx.playedScenes))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (i),
        ...{ class: "mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs leading-relaxed" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
    (scene.text);
    if (scene.chosenResponse) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-accent mt-1 ml-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
        (scene.chosenResponse);
    }
    // @ts-ignore
    [phaseLabel, stepTitle, playedScenes,];
}
if (__VLS_ctx.currentScene) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs leading-relaxed mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    (__VLS_ctx.currentScene.text);
    if (__VLS_ctx.currentScene.choices && !__VLS_ctx.hasChosen) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "space-y-2 mt-3" },
        });
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        for (const [choice, ci] of __VLS_vFor((__VLS_ctx.currentScene.choices))) {
            const __VLS_0 = Button || Button;
            // @ts-ignore
            const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
                ...{ 'onClick': {} },
                key: (ci),
                ...{ class: "w-full text-left" },
            }));
            const __VLS_2 = __VLS_1({
                ...{ 'onClick': {} },
                key: (ci),
                ...{ class: "w-full text-left" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_1));
            let __VLS_5;
            const __VLS_6 = {
                /** @type {typeof __VLS_5.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.currentScene))
                        throw 0;
                    if (!(__VLS_ctx.currentScene.choices && !__VLS_ctx.hasChosen))
                        throw 0;
                    return __VLS_ctx.handleChoice(choice);
                    // @ts-ignore
                    [currentScene, currentScene, currentScene, currentScene, hasChosen, handleChoice,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-left']} */ ;
            const { default: __VLS_7 } = __VLS_3.slots;
            (choice.text);
            // @ts-ignore
            [];
            var __VLS_3;
            var __VLS_4;
            // @ts-ignore
            [];
        }
    }
    if (__VLS_ctx.choiceResponse) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-accent mt-2 ml-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
        (__VLS_ctx.choiceResponse);
    }
    if (!__VLS_ctx.currentScene.choices || __VLS_ctx.hasChosen) {
        const __VLS_8 = Button || Button;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({
            ...{ 'onClick': {} },
            ...{ class: "mt-3 w-full" },
        }));
        const __VLS_10 = __VLS_9({
            ...{ 'onClick': {} },
            ...{ class: "mt-3 w-full" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        let __VLS_13;
        const __VLS_14 = {
            /** @type {typeof __VLS_13.click} */
            onClick: (__VLS_ctx.nextScene),
        };
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        const { default: __VLS_15 } = __VLS_11.slots;
        (__VLS_ctx.isLastScene ? '结束' : '继续');
        // @ts-ignore
        [currentScene, hasChosen, choiceResponse, choiceResponse, nextScene, isLastScene,];
        var __VLS_11;
        var __VLS_12;
    }
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
