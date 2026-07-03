/** 缘分等级阈值 */
export const AFFINITY_THRESHOLDS = [
    { level: 'eternal', min: 2500 },
    { level: 'devoted', min: 1800 },
    { level: 'trusting', min: 1000 },
    { level: 'curious', min: 400 },
    { level: 'wary', min: 0 }
];
/** 最大缘分值 */
export const MAX_AFFINITY = 3000;
/** 每心缘分值（菱形显示，12颗菱形） */
export const AFFINITY_PER_DIAMOND = 250;
/** 每日未互动缘分衰减 */
export const AFFINITY_DECAY_BONDED = 15;
export const AFFINITY_DECAY_COURTING = 10;
/** 供奉上限 */
export const MAX_OFFERS_PER_WEEK = 3;
/** 互动类型中文名 */
export const INTERACTION_NAMES = {
    meditation: '参悟',
    music: '奏乐',
    ritual: '祭仪',
    dreamwalk: '入梦',
    cultivation: '修炼'
};
