/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import { Landmark, Send, X, CircleCheck, Circle, Package, Lock } from 'lucide-vue-next';
import Button from '@/components/game/Button.vue';
import { useMuseumStore } from '@/stores/useMuseumStore';
import { MUSEUM_ITEMS, MUSEUM_CATEGORIES, MUSEUM_MILESTONES } from '@/data/museum';
import { getItemById } from '@/data/items';
const museumStore = useMuseumStore();
const activeCategory = ref('ore');
const selectedItem = ref(null);
const filteredItems = computed(() => MUSEUM_ITEMS.filter(i => i.category === activeCategory.value));
const getCategoryCount = (cat) => {
    return MUSEUM_ITEMS.filter(i => i.category === cat && museumStore.isDonated(i.id)).length;
};
const getCategoryTotal = (cat) => {
    return MUSEUM_ITEMS.filter(i => i.category === cat).length;
};
const getCategoryLabel = (cat) => {
    return MUSEUM_CATEGORIES.find(c => c.key === cat)?.label ?? cat;
};
const getItemName = (id) => {
    return getItemById(id)?.name ?? MUSEUM_ITEMS.find(i => i.id === id)?.name ?? id;
};
const handleDonate = (itemId) => {
    museumStore.donateItem(itemId);
};
const handleDonateAndClose = (itemId) => {
    museumStore.donateItem(itemId);
    selectedItem.value = null;
};
const isMilestoneClaimed = (count) => {
    return museumStore.claimedMilestones.includes(count);
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
    ...{ class: "flex items-center justify-between mb-1" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center space-x-1.5 text-sm text-accent" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.Landmark} */
Landmark;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    size: (14),
}));
const __VLS_2 = __VLS_1({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
(__VLS_ctx.museumStore.donatedCount);
(__VLS_ctx.museumStore.totalCount);
if (__VLS_ctx.museumStore.donatedCount === 0 && __VLS_ctx.museumStore.donatableItems.length === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col items-center justify-center py-10 space-y-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-10']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
    let __VLS_5;
    /** @ts-ignore @type { | typeof __VLS_components.Landmark} */
    Landmark;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        size: (48),
        ...{ class: "text-accent/30" },
    }));
    const __VLS_7 = __VLS_6({
        size: (48),
        ...{ class: "text-accent/30" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    /** @type {__VLS_StyleScopedClasses['text-accent/30']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted/60 text-center max-w-60" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-60']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-3 md:grid-cols-6 gap-1 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:grid-cols-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [cat] of __VLS_vFor((__VLS_ctx.MUSEUM_CATEGORIES))) {
        const __VLS_10 = Button || Button;
        // @ts-ignore
        const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
            ...{ 'onClick': {} },
            key: (cat.key),
            ...{ class: "justify-center whitespace-nowrap" },
            ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.activeCategory === cat.key }) },
        }));
        const __VLS_12 = __VLS_11({
            ...{ 'onClick': {} },
            key: (cat.key),
            ...{ class: "justify-center whitespace-nowrap" },
            ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.activeCategory === cat.key }) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_11));
        let __VLS_15;
        const __VLS_16 = {
            /** @type {typeof __VLS_15.click} */
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.museumStore.donatedCount === 0 && __VLS_ctx.museumStore.donatableItems.length === 0))
                    throw 0;
                return __VLS_ctx.activeCategory = cat.key;
                // @ts-ignore
                [museumStore, museumStore, museumStore, museumStore, MUSEUM_CATEGORIES, activeCategory, activeCategory,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        const { default: __VLS_17 } = __VLS_13.slots;
        (cat.label);
        (__VLS_ctx.getCategoryCount(cat.key));
        (__VLS_ctx.getCategoryTotal(cat.key));
        // @ts-ignore
        [getCategoryCount, getCategoryTotal,];
        var __VLS_13;
        var __VLS_14;
        // @ts-ignore
        [];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-3 md:grid-cols-5 gap-1 mb-3 max-h-72 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:grid-cols-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-72']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    for (const [item] of __VLS_vFor((__VLS_ctx.filteredItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsics.template)({
            key: (item.id),
        });
        if (__VLS_ctx.museumStore.isDonated(item.id)) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.museumStore.donatedCount === 0 && __VLS_ctx.museumStore.donatableItems.length === 0))
                            throw 0;
                        if (!(__VLS_ctx.museumStore.isDonated(item.id)))
                            throw 0;
                        return __VLS_ctx.selectedItem = item;
                        // @ts-ignore
                        [museumStore, filteredItems, selectedItem,];
                    } },
                ...{ class: "border rounded-xs p-1.5 text-center text-xs transition-colors truncate cursor-pointer border-success/40 bg-success/10 text-success" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-success/40']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-success/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            (item.name);
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border rounded-xs p-1.5 text-center text-xs transition-colors truncate border-accent/20 text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            let __VLS_18;
            /** @ts-ignore @type { | typeof __VLS_components.Lock} */
            Lock;
            // @ts-ignore
            const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
                size: (12),
                ...{ class: "mx-auto text-muted/30" },
            }));
            const __VLS_20 = __VLS_19({
                size: (12),
                ...{ class: "mx-auto text-muted/30" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_19));
            /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
        }
        // @ts-ignore
        [];
    }
    if (__VLS_ctx.museumStore.donatableItems.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-2 mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-accent mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-wrap space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        for (const [itemId] of __VLS_vFor((__VLS_ctx.museumStore.donatableItems))) {
            const __VLS_23 = Button || Button;
            // @ts-ignore
            const __VLS_24 = __VLS_asFunctionalComponent1(__VLS_23, new __VLS_23({
                ...{ 'onClick': {} },
                key: (itemId),
                icon: (__VLS_ctx.Send),
                iconSize: (10),
            }));
            const __VLS_25 = __VLS_24({
                ...{ 'onClick': {} },
                key: (itemId),
                icon: (__VLS_ctx.Send),
                iconSize: (10),
            }, ...__VLS_functionalComponentArgsRest(__VLS_24));
            let __VLS_28;
            const __VLS_29 = {
                /** @type {typeof __VLS_28.click} */
                onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.museumStore.donatedCount === 0 && __VLS_ctx.museumStore.donatableItems.length === 0))
                        throw 0;
                    if (!(__VLS_ctx.museumStore.donatableItems.length > 0))
                        throw 0;
                    return __VLS_ctx.handleDonate(itemId);
                    // @ts-ignore
                    [museumStore, museumStore, Send, handleDonate,];
                },
            };
            const { default: __VLS_30 } = __VLS_26.slots;
            (__VLS_ctx.getItemName(itemId));
            // @ts-ignore
            [getItemName,];
            var __VLS_26;
            var __VLS_27;
            // @ts-ignore
            [];
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1 max-h-52 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-52']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    for (const [ms] of __VLS_vFor((__VLS_ctx.MUSEUM_MILESTONES))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (ms.count),
            ...{ class: "flex items-center space-x-2 text-xs border border-accent/10 rounded-xs px-2 py-1 mr-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        if (__VLS_ctx.isMilestoneClaimed(ms.count)) {
            let __VLS_31;
            /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
            CircleCheck;
            // @ts-ignore
            const __VLS_32 = __VLS_asFunctionalComponent1(__VLS_31, new __VLS_31({
                size: (12),
                ...{ class: "text-success shrink-0" },
            }));
            const __VLS_33 = __VLS_32({
                size: (12),
                ...{ class: "text-success shrink-0" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_32));
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        }
        else {
            let __VLS_36;
            /** @ts-ignore @type { | typeof __VLS_components.Circle} */
            Circle;
            // @ts-ignore
            const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
                size: (12),
                ...{ class: "shrink-0" },
                ...{ class: (__VLS_ctx.museumStore.donatedCount >= ms.count ? 'text-accent' : 'text-muted') },
            }));
            const __VLS_38 = __VLS_37({
                size: (12),
                ...{ class: "shrink-0" },
                ...{ class: (__VLS_ctx.museumStore.donatedCount >= ms.count ? 'text-accent' : 'text-muted') },
            }, ...__VLS_functionalComponentArgsRest(__VLS_37));
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "flex-1" },
            ...{ class: (__VLS_ctx.museumStore.donatedCount >= ms.count ? 'text-text' : 'text-muted') },
        });
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        (ms.name);
        (ms.count);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (ms.reward.money);
        (ms.reward.items ? '+物品' : '');
        if (__VLS_ctx.museumStore.donatedCount >= ms.count && !__VLS_ctx.isMilestoneClaimed(ms.count)) {
            const __VLS_41 = Button || Button;
            // @ts-ignore
            const __VLS_42 = __VLS_asFunctionalComponent1(__VLS_41, new __VLS_41({
                ...{ 'onClick': {} },
                ...{ class: "!bg-accent !text-bg px-2 py-0.5" },
            }));
            const __VLS_43 = __VLS_42({
                ...{ 'onClick': {} },
                ...{ class: "!bg-accent !text-bg px-2 py-0.5" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_42));
            let __VLS_46;
            const __VLS_47 = {
                /** @type {typeof __VLS_46.click} */
                onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.museumStore.donatedCount === 0 && __VLS_ctx.museumStore.donatableItems.length === 0))
                        throw 0;
                    if (!(__VLS_ctx.museumStore.donatedCount >= ms.count && !__VLS_ctx.isMilestoneClaimed(ms.count)))
                        throw 0;
                    return __VLS_ctx.museumStore.claimMilestone(ms.count);
                    // @ts-ignore
                    [museumStore, museumStore, museumStore, museumStore, MUSEUM_MILESTONES, isMilestoneClaimed, isMilestoneClaimed,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
            const { default: __VLS_48 } = __VLS_44.slots;
            // @ts-ignore
            [];
            var __VLS_44;
            var __VLS_45;
        }
        // @ts-ignore
        [];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-3 border border-accent/20 rounded-xs p-2" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-2 text-xs mb-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-muted shrink-0" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex-1 h-1 bg-bg rounded-xs border border-accent/10" },
    });
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "h-full bg-accent rounded-xs transition-all" },
        ...{ style: ({ width: Math.round((__VLS_ctx.museumStore.donatedCount / __VLS_ctx.museumStore.totalCount) * 100) + '%' }) },
    });
    /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent whitespace-nowrap" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
    (Math.round((__VLS_ctx.museumStore.donatedCount / __VLS_ctx.museumStore.totalCount) * 100));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-2 gap-x-3 gap-y-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-x-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-y-0.5']} */ ;
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
    (__VLS_ctx.museumStore.donatedCount);
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
    (__VLS_ctx.museumStore.donatableItems.length);
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
    (__VLS_ctx.museumStore.claimedMilestones.length);
    (__VLS_ctx.MUSEUM_MILESTONES.length);
}
let __VLS_49;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_50 = __VLS_asFunctionalComponent1(__VLS_49, new __VLS_49({
    name: "panel-fade",
}));
const __VLS_51 = __VLS_50({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_50));
const { default: __VLS_54 } = __VLS_52.slots;
if (__VLS_ctx.selectedItem) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    throw 0;
                return __VLS_ctx.selectedItem = null;
                // @ts-ignore
                [museumStore, museumStore, museumStore, museumStore, museumStore, museumStore, museumStore, selectedItem, selectedItem, MUSEUM_MILESTONES,];
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
                if (!(__VLS_ctx.selectedItem))
                    throw 0;
                return __VLS_ctx.selectedItem = null;
                // @ts-ignore
                [selectedItem,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_55;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_56 = __VLS_asFunctionalComponent1(__VLS_55, new __VLS_55({
        size: (14),
    }));
    const __VLS_57 = __VLS_56({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_56));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm mb-2" },
        ...{ class: (__VLS_ctx.museumStore.isDonated(__VLS_ctx.selectedItem.id) ? 'text-success' : 'text-accent') },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    if (__VLS_ctx.museumStore.isDonated(__VLS_ctx.selectedItem.id)) {
        (__VLS_ctx.selectedItem.name);
    }
    else {
        let __VLS_60;
        /** @ts-ignore @type { | typeof __VLS_components.Lock} */
        Lock;
        // @ts-ignore
        const __VLS_61 = __VLS_asFunctionalComponent1(__VLS_60, new __VLS_60({
            size: (14),
            ...{ class: "inline text-muted/30" },
        }));
        const __VLS_62 = __VLS_61({
            size: (14),
            ...{ class: "inline text-muted/30" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_61));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
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
    (__VLS_ctx.selectedItem.sourceHint);
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
    (__VLS_ctx.getCategoryLabel(__VLS_ctx.selectedItem.category));
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
        ...{ class: (__VLS_ctx.museumStore.isDonated(__VLS_ctx.selectedItem.id) ? 'text-success' : 'text-muted') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.museumStore.isDonated(__VLS_ctx.selectedItem.id) ? '已捐赠' : '未捐赠');
    if (__VLS_ctx.museumStore.isDonated(__VLS_ctx.selectedItem.id)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-success/30 rounded-xs p-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-success/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        let __VLS_65;
        /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
        CircleCheck;
        // @ts-ignore
        const __VLS_66 = __VLS_asFunctionalComponent1(__VLS_65, new __VLS_65({
            size: (12),
            ...{ class: "text-success" },
        }));
        const __VLS_67 = __VLS_66({
            size: (12),
            ...{ class: "text-success" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_66));
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    }
    else if (__VLS_ctx.museumStore.canDonate(__VLS_ctx.selectedItem.id)) {
        const __VLS_70 = Button || Button;
        // @ts-ignore
        const __VLS_71 = __VLS_asFunctionalComponent1(__VLS_70, new __VLS_70({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center !bg-accent !text-bg" },
            icon: (__VLS_ctx.Send),
            iconSize: (12),
        }));
        const __VLS_72 = __VLS_71({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center !bg-accent !text-bg" },
            icon: (__VLS_ctx.Send),
            iconSize: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_71));
        let __VLS_75;
        const __VLS_76 = {
            /** @type {typeof __VLS_75.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    throw 0;
                if (!!(__VLS_ctx.museumStore.isDonated(__VLS_ctx.selectedItem.id)))
                    throw 0;
                if (!(__VLS_ctx.museumStore.canDonate(__VLS_ctx.selectedItem.id)))
                    throw 0;
                return __VLS_ctx.handleDonateAndClose(__VLS_ctx.selectedItem.id);
                // @ts-ignore
                [museumStore, museumStore, museumStore, museumStore, museumStore, museumStore, selectedItem, selectedItem, selectedItem, selectedItem, selectedItem, selectedItem, selectedItem, selectedItem, selectedItem, selectedItem, Send, getCategoryLabel, handleDonateAndClose,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        const { default: __VLS_77 } = __VLS_73.slots;
        // @ts-ignore
        [];
        var __VLS_73;
        var __VLS_74;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/10 rounded-xs p-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        let __VLS_78;
        /** @ts-ignore @type { | typeof __VLS_components.Package} */
        Package;
        // @ts-ignore
        const __VLS_79 = __VLS_asFunctionalComponent1(__VLS_78, new __VLS_78({
            size: (12),
            ...{ class: "text-muted" },
        }));
        const __VLS_80 = __VLS_79({
            size: (12),
            ...{ class: "text-muted" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_79));
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    }
}
// @ts-ignore
[];
var __VLS_52;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
