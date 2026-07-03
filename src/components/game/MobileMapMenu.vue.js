/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from 'vue';
import { X, Gift, Mail, Trophy, Swords, Hammer, Landmark } from 'lucide-vue-next';
import { TABS, navigateToPanel } from '@/composables/useNavigation';
const __VLS_props = defineProps();
const emit = defineEmits();
const tabMap = computed(() => {
    const m = new Map();
    for (const t of TABS)
        m.set(t.key, t);
    return m;
});
const pick = (keys) => keys.map(k => tabMap.value.get(k)).filter(Boolean);
const farmGroup = computed(() => pick(['farm', 'animal', 'cottage', 'home', 'breeding', 'fishpond']));
const villageGroup = computed(() => pick(['village', 'shop', 'museum', 'guild']));
const wildGroup = computed(() => pick(['forage', 'fishing', 'mining', 'hanhai']));
const craftGroup = computed(() => pick(['cooking', 'workshop', 'upgrade']));
const personalGroup = computed(() => pick(['charinfo', 'cultivation', 'inventory', 'skills', 'achievement', 'wallet', 'quest']));
const go = (key) => {
    navigateToPanel(key);
    emit('close');
};
const handleCheckin = () => {
    emit('checkin');
};
const handleOpenMail = () => {
    emit('openMail');
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
/** @type {__VLS_StyleScopedClasses['map-loc']} */ ;
/** @type {__VLS_StyleScopedClasses['map-loc']} */ ;
/** @type {__VLS_StyleScopedClasses['daily-checkin-loc']} */ ;
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
        ...{ class: "fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/80']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "map-container game-panel w-full max-w-sm md:max-w-150 max-h-[85vh] overflow-y-auto relative" },
    });
    /** @type {__VLS_StyleScopedClasses['map-container']} */ ;
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:max-w-150']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-[85vh]']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.open))
                    throw 0;
                return __VLS_ctx.$emit('close');
                // @ts-ignore
                [$emit,];
            } },
        ...{ class: "absolute top-4 right-4 px-2 py-1 text-xs transition-colors hover:border-accent/60 hover:bg-panel/80 text-muted border border-accent/20" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:border-accent/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-panel/80']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-accent text-sm text-center mb-3 tracking-widest" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-widest']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "map-area" },
    });
    /** @type {__VLS_StyleScopedClasses['map-area']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "map-area-title" },
    });
    /** @type {__VLS_StyleScopedClasses['map-area-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "map-area-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['map-area-grid']} */ ;
    for (const [t] of __VLS_vFor((__VLS_ctx.farmGroup))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.open))
                        throw 0;
                    return __VLS_ctx.go(t.key);
                    // @ts-ignore
                    [farmGroup, go,];
                } },
            key: (t.key),
            ...{ class: "map-loc" },
            ...{ class: ({ 'map-loc-active': __VLS_ctx.current === t.key }) },
        });
        /** @type {__VLS_StyleScopedClasses['map-loc']} */ ;
        /** @type {__VLS_StyleScopedClasses['map-loc-active']} */ ;
        const __VLS_11 = (t.getIcon ? t.getIcon() : t.icon);
        // @ts-ignore
        const __VLS_12 = __VLS_asFunctionalComponent1(__VLS_11, new __VLS_11({
            size: (18),
        }));
        const __VLS_13 = __VLS_12({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_12));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (t.label);
        // @ts-ignore
        [current,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "map-path" },
    });
    /** @type {__VLS_StyleScopedClasses['map-path']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "map-area flex-1" },
    });
    /** @type {__VLS_StyleScopedClasses['map-area']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "map-area-title" },
    });
    /** @type {__VLS_StyleScopedClasses['map-area-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "map-area-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['map-area-grid']} */ ;
    for (const [t] of __VLS_vFor((__VLS_ctx.villageGroup))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.open))
                        throw 0;
                    return __VLS_ctx.go(t.key);
                    // @ts-ignore
                    [go, villageGroup,];
                } },
            key: (t.key),
            ...{ class: "map-loc" },
            ...{ class: ({ 'map-loc-active': __VLS_ctx.current === t.key }) },
        });
        /** @type {__VLS_StyleScopedClasses['map-loc']} */ ;
        /** @type {__VLS_StyleScopedClasses['map-loc-active']} */ ;
        const __VLS_16 = (t.getIcon ? t.getIcon() : t.icon);
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
            size: (18),
        }));
        const __VLS_18 = __VLS_17({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (t.label);
        // @ts-ignore
        [current,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "map-area flex-1" },
    });
    /** @type {__VLS_StyleScopedClasses['map-area']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "map-area-title" },
    });
    /** @type {__VLS_StyleScopedClasses['map-area-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "map-area-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['map-area-grid']} */ ;
    for (const [t] of __VLS_vFor((__VLS_ctx.wildGroup))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.open))
                        throw 0;
                    return __VLS_ctx.go(t.key);
                    // @ts-ignore
                    [go, wildGroup,];
                } },
            key: (t.key),
            ...{ class: "map-loc" },
            ...{ class: ({ 'map-loc-active': __VLS_ctx.current === t.key }) },
        });
        /** @type {__VLS_StyleScopedClasses['map-loc']} */ ;
        /** @type {__VLS_StyleScopedClasses['map-loc-active']} */ ;
        const __VLS_21 = (t.getIcon ? t.getIcon() : t.icon);
        // @ts-ignore
        const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
            size: (18),
        }));
        const __VLS_23 = __VLS_22({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_22));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (t.label);
        // @ts-ignore
        [current,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "map-path" },
    });
    /** @type {__VLS_StyleScopedClasses['map-path']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "map-area" },
    });
    /** @type {__VLS_StyleScopedClasses['map-area']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "map-area-title" },
    });
    /** @type {__VLS_StyleScopedClasses['map-area-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "map-area-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['map-area-grid']} */ ;
    for (const [t] of __VLS_vFor((__VLS_ctx.craftGroup))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.open))
                        throw 0;
                    return __VLS_ctx.go(t.key);
                    // @ts-ignore
                    [go, craftGroup,];
                } },
            key: (t.key),
            ...{ class: "map-loc" },
            ...{ class: ({ 'map-loc-active': __VLS_ctx.current === t.key }) },
        });
        /** @type {__VLS_StyleScopedClasses['map-loc']} */ ;
        /** @type {__VLS_StyleScopedClasses['map-loc-active']} */ ;
        const __VLS_26 = (t.getIcon ? t.getIcon() : t.icon);
        // @ts-ignore
        const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
            size: (18),
        }));
        const __VLS_28 = __VLS_27({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_27));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (t.label);
        // @ts-ignore
        [current,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "map-path" },
    });
    /** @type {__VLS_StyleScopedClasses['map-path']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "map-area" },
    });
    /** @type {__VLS_StyleScopedClasses['map-area']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "map-area-title" },
    });
    /** @type {__VLS_StyleScopedClasses['map-area-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "map-area-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['map-area-grid']} */ ;
    for (const [t] of __VLS_vFor((__VLS_ctx.personalGroup))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.open))
                        throw 0;
                    return __VLS_ctx.go(t.key);
                    // @ts-ignore
                    [go, personalGroup,];
                } },
            key: (t.key),
            ...{ class: "map-loc" },
            ...{ class: ({ 'map-loc-active': __VLS_ctx.current === t.key }) },
        });
        /** @type {__VLS_StyleScopedClasses['map-loc']} */ ;
        /** @type {__VLS_StyleScopedClasses['map-loc-active']} */ ;
        const __VLS_31 = (t.getIcon ? t.getIcon() : t.icon);
        // @ts-ignore
        const __VLS_32 = __VLS_asFunctionalComponent1(__VLS_31, new __VLS_31({
            size: (18),
        }));
        const __VLS_33 = __VLS_32({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_32));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (t.label);
        // @ts-ignore
        [current,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.handleCheckin) },
        ...{ class: "map-loc daily-checkin-loc" },
        disabled: (__VLS_ctx.checkinBusy || __VLS_ctx.checkinChecked),
    });
    /** @type {__VLS_StyleScopedClasses['map-loc']} */ ;
    /** @type {__VLS_StyleScopedClasses['daily-checkin-loc']} */ ;
    let __VLS_36;
    /** @ts-ignore @type { | typeof __VLS_components.Gift} */
    Gift;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
        size: (18),
    }));
    const __VLS_38 = __VLS_37({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.checkinChecked ? '已签到' : '每日签到');
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.handleOpenMail) },
        ...{ class: "map-loc" },
    });
    /** @type {__VLS_StyleScopedClasses['map-loc']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ style: {} },
    });
    let __VLS_41;
    /** @ts-ignore @type { | typeof __VLS_components.Mail} */
    Mail;
    // @ts-ignore
    const __VLS_42 = __VLS_asFunctionalComponent1(__VLS_41, new __VLS_41({
        size: (18),
    }));
    const __VLS_43 = __VLS_42({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_42));
    if (__VLS_ctx.unclaimedMailCount) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "mail-dot" },
        });
        /** @type {__VLS_StyleScopedClasses['mail-dot']} */ ;
        (__VLS_ctx.unclaimedMailCount > 99 ? '99+' : __VLS_ctx.unclaimedMailCount);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.open))
                    throw 0;
                return __VLS_ctx.emit('openLeaderboard');
                // @ts-ignore
                [handleCheckin, checkinBusy, checkinChecked, checkinChecked, handleOpenMail, unclaimedMailCount, unclaimedMailCount, unclaimedMailCount, emit,];
            } },
        ...{ class: "map-loc" },
    });
    /** @type {__VLS_StyleScopedClasses['map-loc']} */ ;
    let __VLS_46;
    /** @ts-ignore @type { | typeof __VLS_components.Trophy} */
    Trophy;
    // @ts-ignore
    const __VLS_47 = __VLS_asFunctionalComponent1(__VLS_46, new __VLS_46({
        size: (18),
    }));
    const __VLS_48 = __VLS_47({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_47));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.open))
                    throw 0;
                return __VLS_ctx.emit('openCombat');
                // @ts-ignore
                [emit,];
            } },
        ...{ class: "map-loc" },
    });
    /** @type {__VLS_StyleScopedClasses['map-loc']} */ ;
    let __VLS_51;
    /** @ts-ignore @type { | typeof __VLS_components.Swords} */
    Swords;
    // @ts-ignore
    const __VLS_52 = __VLS_asFunctionalComponent1(__VLS_51, new __VLS_51({
        size: (18),
    }));
    const __VLS_53 = __VLS_52({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_52));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.open))
                    throw 0;
                return __VLS_ctx.emit('openForge');
                // @ts-ignore
                [emit,];
            } },
        ...{ class: "map-loc" },
    });
    /** @type {__VLS_StyleScopedClasses['map-loc']} */ ;
    let __VLS_56;
    /** @ts-ignore @type { | typeof __VLS_components.Hammer} */
    Hammer;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent1(__VLS_56, new __VLS_56({
        size: (18),
    }));
    const __VLS_58 = __VLS_57({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.open))
                    throw 0;
                return __VLS_ctx.emit('openSect');
                // @ts-ignore
                [emit,];
            } },
        ...{ class: "map-loc" },
    });
    /** @type {__VLS_StyleScopedClasses['map-loc']} */ ;
    let __VLS_61;
    /** @ts-ignore @type { | typeof __VLS_components.Landmark} */
    Landmark;
    // @ts-ignore
    const __VLS_62 = __VLS_asFunctionalComponent1(__VLS_61, new __VLS_61({
        size: (18),
    }));
    const __VLS_63 = __VLS_62({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_62));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
}
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
