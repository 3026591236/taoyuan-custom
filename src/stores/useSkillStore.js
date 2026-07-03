import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useInventoryStore } from './useInventoryStore';
/** 各等级所需累计经验 **/
const EXP_TABLE = [0, 100, 380, 770, 1300, 2150, 3300, 4800, 6900, 10000, 15000];
/** 创建初始技能状态 */
const createSkill = (type) => {
    return { type, exp: 0, level: 0, perk5: null, perk10: null };
};
export const useSkillStore = defineStore('skill', () => {
    const skills = ref([
        createSkill('farming'),
        createSkill('foraging'),
        createSkill('fishing'),
        createSkill('mining'),
        createSkill('combat')
    ]);
    const getSkill = (type) => {
        return skills.value.find(s => s.type === type);
    };
    const farmingLevel = computed(() => getSkill('farming').level);
    const fishingLevel = computed(() => getSkill('fishing').level);
    const miningLevel = computed(() => getSkill('mining').level);
    const foragingLevel = computed(() => getSkill('foraging').level);
    const combatLevel = computed(() => getSkill('combat').level);
    /** 增加经验并自动升级（含戒指经验加成） */
    const addExp = (type, amount) => {
        const ringExpBonus = useInventoryStore().getRingEffectValue('exp_bonus');
        const adjustedAmount = Math.floor(amount * (1 + ringExpBonus));
        const skill = getSkill(type);
        skill.exp += adjustedAmount;
        let leveledUp = false;
        while (skill.level < 10) {
            const nextLevelExp = EXP_TABLE[skill.level + 1];
            if (skill.exp >= nextLevelExp) {
                skill.level++;
                leveledUp = true;
            }
            else {
                break;
            }
        }
        return { leveledUp, newLevel: skill.level };
    };
    /** 获取升级到下一级所需经验 */
    const getExpToNextLevel = (type) => {
        const skill = getSkill(type);
        if (skill.level >= 10)
            return null;
        return { current: skill.exp, required: EXP_TABLE[skill.level + 1] };
    };
    /** 计算技能对体力消耗的减免 (每级减少1%，10级共减少10%) */
    const getStaminaReduction = (type) => {
        return getSkill(type).level * 0.01;
    };
    /** 设置等级5专精 */
    const setPerk5 = (type, perk) => {
        const skill = getSkill(type);
        if (skill.level < 5 || skill.perk5 !== null)
            return false;
        skill.perk5 = perk;
        return true;
    };
    /** 设置等级10专精 */
    const setPerk10 = (type, perk) => {
        const skill = getSkill(type);
        if (skill.level < 10 || skill.perk10 !== null)
            return false;
        skill.perk10 = perk;
        return true;
    };
    /** 判断作物品质（基于农耕等级） */
    const rollCropQuality = () => {
        return rollCropQualityWithBonus(0);
    };
    /** 判断作物品质（带肥料加成 + 可选技能等级加成） */
    const rollCropQualityWithBonus = (qualityBonus, levelBonus = 0) => {
        const level = farmingLevel.value + levelBonus;
        const roll = Math.random();
        if (level >= 9 && roll < 0.05 + qualityBonus * 0.5)
            return 'supreme';
        if (level >= 6 && roll < 0.15 + qualityBonus)
            return 'excellent';
        if (level >= 3 && roll < 0.3 + qualityBonus)
            return 'fine';
        return 'normal';
    };
    /** 判断采集物品质（基于采集等级和专精 + 可选技能等级加成） */
    const rollForageQuality = (levelBonus = 0) => {
        const skill = getSkill('foraging');
        if (skill.perk10 === 'botanist')
            return 'excellent';
        const level = skill.level + levelBonus;
        const roll = Math.random();
        if (level >= 9 && roll < 0.05)
            return 'supreme';
        if (level >= 6 && roll < 0.12)
            return 'excellent';
        if (level >= 3 && roll < 0.25)
            return 'fine';
        return 'normal';
    };
    const serialize = () => {
        return { skills: skills.value };
    };
    const deserialize = (data) => {
        const arr = data.skills ?? [];
        // 确保 5 个技能都存在（旧存档可能没有 combat）
        const allTypes = ['farming', 'foraging', 'fishing', 'mining', 'combat'];
        for (const type of allTypes) {
            if (!arr.find(s => s.type === type)) {
                const newSkill = createSkill(type);
                // 旧存档迁移：mining 的 fighter/warrior/brute → combat
                if (type === 'combat') {
                    const mining = arr.find(s => s.type === 'mining');
                    if (mining && mining.perk5 === 'fighter') {
                        newSkill.exp = mining.exp;
                        newSkill.level = mining.level;
                        newSkill.perk5 = 'fighter';
                        newSkill.perk10 = mining.perk10;
                        mining.perk5 = null;
                        mining.perk10 = null;
                    }
                }
                arr.push(newSkill);
            }
        }
        skills.value = arr;
    };
    return {
        skills,
        farmingLevel,
        fishingLevel,
        miningLevel,
        foragingLevel,
        combatLevel,
        getSkill,
        addExp,
        getExpToNextLevel,
        getStaminaReduction,
        setPerk5,
        setPerk10,
        rollCropQuality,
        rollCropQualityWithBonus,
        rollForageQuality,
        serialize,
        deserialize
    };
});
