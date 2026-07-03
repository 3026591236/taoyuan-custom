/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import Button from '@/components/game/Button.vue';
import { usePlayerStore } from '@/stores/usePlayerStore';
const props = defineProps();
const emit = defineEmits();
const playerStore = usePlayerStore();
/** 替换对话中的 {player} / {title} 占位符 */
const r = (text) => text.replace(/\{player\}/g, playerStore.playerName).replace(/\{title\}/g, playerStore.honorific);
const currentIndex = ref(0);
const playedScenes = ref([]);
const hasChosen = ref(false);
const choiceResponse = ref(null);
const friendshipChanges = ref([]);
const currentScene = computed(() => {
    return props.event.scenes[currentIndex.value] ?? null;
});
const isLastScene = computed(() => {
    return currentIndex.value >= props.event.scenes.length - 1;
});
const handleChoice = (choice) => {
    hasChosen.value = true;
    choiceResponse.value = choice.response;
    if (choice.friendshipChange !== 0) {
        friendshipChanges.value.push({
            npcId: props.event.npcId,
            amount: choice.friendshipChange
        });
    }
};
const nextScene = () => {
    // 归档当前场景
    playedScenes.value.push({
        text: currentScene.value?.text ?? '',
        chosenResponse: choiceResponse.value ?? undefined
    });
    if (isLastScene.value) {
        emit('close', friendshipChanges.value);
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
    ...{ class: "game-panel max-w-lg w-full max-h-[80vh] overflow-y-auto" },
});
/** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-[80vh]']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "text-accent text-sm mb-3" },
});
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
(__VLS_ctx.event.title);
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
    (__VLS_ctx.r(scene.text));
    if (scene.chosenResponse) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-accent mt-1 ml-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
        (__VLS_ctx.r(scene.chosenResponse));
    }
    // @ts-ignore
    [event, playedScenes, r, r,];
}
if (__VLS_ctx.currentScene) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs leading-relaxed mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    (__VLS_ctx.r(__VLS_ctx.currentScene.text));
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
                    [r, currentScene, currentScene, currentScene, currentScene, hasChosen, handleChoice,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-left']} */ ;
            const { default: __VLS_7 } = __VLS_3.slots;
            (__VLS_ctx.r(choice.text));
            // @ts-ignore
            [r,];
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
        (__VLS_ctx.r(__VLS_ctx.choiceResponse));
    }
    if (!__VLS_ctx.currentScene.choices || __VLS_ctx.hasChosen) {
        const __VLS_8 = Button || Button;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({
            ...{ 'onClick': {} },
            ...{ class: "mt-3" },
        }));
        const __VLS_10 = __VLS_9({
            ...{ 'onClick': {} },
            ...{ class: "mt-3" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        let __VLS_13;
        const __VLS_14 = {
            /** @type {typeof __VLS_13.click} */
            onClick: (__VLS_ctx.nextScene),
        };
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        const { default: __VLS_15 } = __VLS_11.slots;
        (__VLS_ctx.isLastScene ? '结束' : '继续');
        // @ts-ignore
        [r, currentScene, hasChosen, choiceResponse, choiceResponse, nextScene, isLastScene,];
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
