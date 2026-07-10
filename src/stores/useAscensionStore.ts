import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useCultivationStore } from './useCultivationStore'
import { usePlayerStore } from './usePlayerStore'
import { useInventoryStore } from './useInventoryStore'
import { getCombinedItemCount, removeCombinedItem } from '@/composables/useCombinedInventory'
import { addLog } from '@/composables/useGameLog'

export const ASCENSION_REALM_INDEX = 27 // 大乘后期
export const ASCENSION_MONEY = 50000
export const ASCENSION_MATERIALS = [
  { itemId: 'spirit_stone', name: '灵石', quantity: 200 },
  { itemId: 'thunder_essence', name: '雷精', quantity: 5 },
  { itemId: 'immortal_dew', name: '仙露', quantity: 3 },
  { itemId: 'soul_crystal', name: '魂晶', quantity: 5 },
  { itemId: 'lingyun_jade', name: '灵蕴玉', quantity: 2 }
]

export type ImmortalArtId = 'starfall_sword' | 'purple_thunder_seal' | 'solar_flame' | 'cloud_body'
export type ImmortalTrialId = 'star_river' | 'thunder_palace' | 'sun_ruins'
export type ImmortalOfficeId = 'xuntian' | 'sinong' | 'lianbao' | 'wenming'
export type ImmortalDutyId = 'rain_edict' | 'demon_edict' | 'forge_edict' | 'fate_edict'
export type ImmortalCaveId = 'star_platform' | 'merit_pool' | 'law_tablet' | 'spirit_spring' | 'mortal_anchor'
export type MortalEchoId = 'sect_blessing' | 'family_blessing' | 'farm_blessing'
export type ImmortalRivalId = 'sword_immortal' | 'thunder_general' | 'moon_fairy'
export type ImmortalMarketId = 'jade_seed' | 'star_sand' | 'edict_scroll' | 'law_core'
export type ImmortalRealmId = 'true_immortal' | 'xuan_immortal' | 'earth_immortal' | 'sky_immortal' | 'gold_immortal'
export type ImmortalSeasonRewardId = 'arena_10' | 'arena_30' | 'arena_60'
export type ImmortalLineageId = 'sword_dao' | 'thunder_dao' | 'harvest_dao' | 'fate_dao'
export type ImmortalMandateId = 'heaven_river' | 'star_audit' | 'mortal_incense' | 'arena_invite'
export type ImmortalMandateChoiceId = 'merit' | 'law' | 'mortal' | 'battle'
export type ImmortalAllianceId = 'cloud_guard' | 'jade_register' | 'star_forge' | 'mortal_bridge'
export type ChaosRiftId = 'void_tide' | 'fallen_star' | 'demon_gate' | 'law_maze'
export type FatePlateId = 'merit_orbit' | 'battle_orbit' | 'harvest_orbit' | 'law_orbit'
export type ImmortalStoryId = 'first_edict' | 'rift_truth' | 'old_heaven' | 'mortal_anchor' | 'star_archive' | 'three_realms_debt' | 'ancient_oath' | 'demon_counterplot' | 'heaven_trial' | 'dao_dispute' | 'alliance_coronation' | 'new_heaven'
export type ImmortalGearSlot = 'weapon' | 'crown' | 'armor' | 'pendant' | 'seal' | 'boots'
export const IMMORTAL_GEAR: Array<{ id: ImmortalGearSlot; name: string; short: string; icon: string; desc: string; basePower: number; art: string }> = [
  { id: 'weapon', name: '星河仙剑', short: '仙剑', icon: '剑', desc: '本命剑意承载星河法则，决定仙术的锋芒。', basePower: 72, art: '/assets/immortal/gear-sword.png' },
  { id: 'crown', name: '云阙仙冠', short: '仙冠', icon: '冠', desc: '镇守神识与仙魂，抵御混沌侵蚀。', basePower: 48, art: '/assets/immortal/gear-crown.png' },
  { id: 'armor', name: '玄霄仙甲', short: '仙甲', icon: '甲', desc: '护持仙体，承接天罚与首领怒击。', basePower: 66, art: '/assets/immortal/gear-armor.png' },
  { id: 'pendant', name: '太虚仙佩', short: '仙佩', icon: '佩', desc: '凝聚仙玉与功德，强化资源转化。', basePower: 42, art: '/assets/immortal/gear-pendant.png' },
  { id: 'seal', name: '天命道印', short: '道印', icon: '印', desc: '刻入命盘天命，放大仙界法则底蕴。', basePower: 58, art: '/assets/immortal/gear-seal.png' },
  { id: 'boots', name: '流云仙履', short: '仙履', icon: '履', desc: '踏云越界，提升仙擂与裂隙的斗战气势。', basePower: 45, art: '/assets/immortal/gear-boots.png' }
]

export const IMMORTAL_ARTS: Array<{ id: ImmortalArtId; name: string; icon: string; element: string; desc: string; basePower: number; effect: string }> = [
  { id: 'starfall_sword', name: '星河落刃', icon: '🌌', element: '星辰法则', desc: '引星河为剑，普通剑气升格为群星坠落。', basePower: 120, effect: '星辉连斩' },
  { id: 'purple_thunder_seal', name: '紫霄雷印', icon: '⚡', element: '天罚法则', desc: '雷法不再只是雷精爆发，而是以仙印审判敌阵。', basePower: 150, effect: '天罚破防' },
  { id: 'solar_flame', name: '九曜焚天', icon: '☀️', element: '太阳真火', desc: '凡火蜕变为太阳真火，灼烧并净化妖邪。', basePower: 138, effect: '真火灼魂' },
  { id: 'cloud_body', name: '云篆护体', icon: '☁️', element: '云篆仙体', desc: '身外浮现云篆玄光，抵御仙域反噬。', basePower: 95, effect: '玄光护体' }
]

export const IMMORTAL_TRIALS: Array<{ id: ImmortalTrialId; name: string; icon: string; enemy: string; realm: string; desc: string; difficulty: number; rewardMerit: number; rewardJade: number; rewardRule: number; rewardItem?: { itemId: string; name: string; quantity: number } }> = [
  { id: 'star_river', name: '星河残阵', icon: '🌠', enemy: '陨星阵灵', realm: '真仙初试', desc: '以星辉破阵，检验飞升后仙术掌控。', difficulty: 900, rewardMerit: 18, rewardJade: 4, rewardRule: 2, rewardItem: { itemId: 'star_iron', name: '星陨铁', quantity: 1 } },
  { id: 'thunder_palace', name: '紫霄雷宫', icon: '🏛️', enemy: '雷宫执印', realm: '雷法试炼', desc: '承受天罚雷印反震，胜则雷法蜕变。', difficulty: 1250, rewardMerit: 24, rewardJade: 6, rewardRule: 3, rewardItem: { itemId: 'thunder_essence', name: '雷精', quantity: 1 } },
  { id: 'sun_ruins', name: '九曜墟', icon: '🔥', enemy: '日曜残魂', realm: '真火试炼', desc: '在太阳真火废墟中淬炼仙体。', difficulty: 1650, rewardMerit: 32, rewardJade: 8, rewardRule: 4, rewardItem: { itemId: 'immortal_dew', name: '仙露', quantity: 1 } }
]

export const IMMORTAL_OFFICES: Array<{ id: ImmortalOfficeId; name: string; icon: string; desc: string; buff: string }> = [
  { id: 'xuntian', name: '巡天仙使', icon: '🛰️', desc: '巡视仙域、镇压妖潮。', buff: '仙域试炼功德 +10%' },
  { id: 'sinong', name: '司农仙官', icon: '🌾', desc: '调理仙灵圃与下界灵田。', buff: '仙露与灵植收益更高' },
  { id: 'lianbao', name: '炼宝仙官', icon: '🛠️', desc: '掌管仙材、修补法宝。', buff: '法宝修复与炼器消耗更稳' },
  { id: 'wenming', name: '文命仙官', icon: '📜', desc: '记录功德、回应凡界香火。', buff: '声望、博物馆与宗门反馈更强' }
]

export const IMMORTAL_DUTIES: Array<{ id: ImmortalDutyId; office: ImmortalOfficeId; name: string; icon: string; desc: string; rewardMerit: number; rewardJade: number; rewardRule: number }> = [
  { id: 'rain_edict', office: 'sinong', name: '调雨润田', icon: '🌧️', desc: '向下界灵田布雨，回响种田线而不是新增重复农场。', rewardMerit: 16, rewardJade: 3, rewardRule: 1 },
  { id: 'demon_edict', office: 'xuntian', name: '巡天镇妖', icon: '🗡️', desc: '巡查仙凡裂隙，压制妖潮与秘境异动。', rewardMerit: 20, rewardJade: 4, rewardRule: 2 },
  { id: 'forge_edict', office: 'lianbao', name: '修补仙器', icon: '🛠️', desc: '用仙职处理法宝损耗，强化经济消耗闭环。', rewardMerit: 18, rewardJade: 5, rewardRule: 1 },
  { id: 'fate_edict', office: 'wenming', name: '校准凡缘', icon: '📜', desc: '整理凡界香火、家族与宗门因果。', rewardMerit: 22, rewardJade: 3, rewardRule: 2 }
]
export const IMMORTAL_CAVE_NODES: Array<{ id: ImmortalCaveId; name: string; icon: string; desc: string; jadeCost: number; ruleCost: number; powerPerLevel: number }> = [
  { id: 'star_platform', name: '观星台', icon: '🌌', desc: '提升仙术与仙擂问道战力。', jadeCost: 8, ruleCost: 3, powerPerLevel: 95 },
  { id: 'merit_pool', name: '功德池', icon: '🪷', desc: '积累功德香火，支撑凡界回响。', jadeCost: 6, ruleCost: 2, powerPerLevel: 70 },
  { id: 'law_tablet', name: '法则碑', icon: '🪧', desc: '稳固仙界法则，提升试炼和 PK 稳定。', jadeCost: 10, ruleCost: 4, powerPerLevel: 130 },
  { id: 'spirit_spring', name: '仙露泉', icon: '💧', desc: '每日凝露，反哺炼丹、灵田和洞府维护。', jadeCost: 14, ruleCost: 5, powerPerLevel: 115 },
  { id: 'mortal_anchor', name: '凡界锚', icon: '🌉', desc: '稳住宗门、家族与灵田回响，让飞升后仍牵动下界。', jadeCost: 16, ruleCost: 6, powerPerLevel: 150 }
]
export const MORTAL_ECHOES: Array<{ id: MortalEchoId; name: string; icon: string; desc: string; meritCost: number; rewardText: string }> = [
  { id: 'sect_blessing', name: '赐福宗门', icon: '⛩️', desc: '向下界宗门降下仙谕。', meritCost: 24, rewardText: '宗门远征与日课获得仙界赐福。' },
  { id: 'family_blessing', name: '护佑家族', icon: '👨‍👩‍👧', desc: '回响配偶、子女与家族传承。', meritCost: 20, rewardText: '家族委托与子女成长获得仙缘。' },
  { id: 'farm_blessing', name: '点化灵田', icon: '🌾', desc: '让仙界影响原种田线。', meritCost: 18, rewardText: '灵田、仙露与高阶作物获得回响。' }
]
export const IMMORTAL_RIVALS: Array<{ id: ImmortalRivalId; name: string; icon: string; style: string; power: number; desc: string; rewardMerit: number; rewardJade: number; rewardRule: number }> = [
  { id: 'sword_immortal', name: '青冥剑仙', icon: '🗡️', style: '剑道连斩', power: 1100, desc: '仙擂初阶对手，擅长破云剑势。', rewardMerit: 20, rewardJade: 5, rewardRule: 2 },
  { id: 'thunder_general', name: '紫府雷将', icon: '⚡', style: '雷印压制', power: 1500, desc: '雷法强敌，考验仙骨与紫霄雷印。', rewardMerit: 28, rewardJade: 7, rewardRule: 3 },
  { id: 'moon_fairy', name: '广寒仙姬', icon: '🌙', style: '月华幻身', power: 1900, desc: '身法型对手，考验仙魂与法则碑。', rewardMerit: 36, rewardJade: 9, rewardRule: 4 }
]

export const IMMORTAL_MARKET: Array<{ id: ImmortalMarketId; name: string; icon: string; desc: string; costMerit: number; costJade: number; costRule: number; reward: string; itemId?: string; itemName?: string; itemQty?: number; bodyGain?: number; boneGain?: number; soulGain?: number }> = [
  { id: 'jade_seed', name: '仙灵种匣', icon: '🌱', desc: '司农仙官常购，可把仙界资源转化为凡界灵植后劲。', costMerit: 18, costJade: 6, costRule: 0, reward: '仙露+2', itemId: 'immortal_dew', itemName: '仙露', itemQty: 2 },
  { id: 'star_sand', name: '星砂炼材', icon: '✨', desc: '炼宝仙官用来修补法宝与洞天器纹。', costMerit: 12, costJade: 8, costRule: 1, reward: '星陨铁+1', itemId: 'star_iron', itemName: '星陨铁', itemQty: 1 },
  { id: 'edict_scroll', name: '仙谕文书', icon: '📜', desc: '文命仙官整理凡界香火，可强化仙魂。', costMerit: 36, costJade: 4, costRule: 2, reward: '仙魂+1', soulGain: 1 },
  { id: 'law_core', name: '小法则核', icon: '💠', desc: '少量法则凝核，用于稳定突破与 PK 波动。', costMerit: 24, costJade: 10, costRule: 6, reward: '仙骨+1 / 仙体+1', bodyGain: 1, boneGain: 1 }
]
export const IMMORTAL_REALMS: Array<{ id: ImmortalRealmId; name: string; icon: string; desc: string; meritCost: number; jadeCost: number; ruleCost: number; powerBonus: number; title: string }> = [
  { id: 'true_immortal', name: '真仙', icon: '☁️', desc: '初脱凡尘，掌仙术而未稳法则。', meritCost: 0, jadeCost: 0, ruleCost: 0, powerBonus: 0, title: '初入仙门' },
  { id: 'xuan_immortal', name: '玄仙', icon: '🌘', desc: '玄光入体，法则根基初成。', meritCost: 80, jadeCost: 20, ruleCost: 8, powerBonus: 220, title: '玄光仙籍' },
  { id: 'earth_immortal', name: '地仙', icon: '⛰️', desc: '洞天落成，仙力可回响下界山河。', meritCost: 180, jadeCost: 48, ruleCost: 22, powerBonus: 520, title: '洞天地仙' },
  { id: 'sky_immortal', name: '天仙', icon: '🌤️', desc: '仙职入册，可调度天庭事务与星河仙术。', meritCost: 340, jadeCost: 86, ruleCost: 42, powerBonus: 960, title: '云阙天仙' },
  { id: 'gold_immortal', name: '太乙金仙', icon: '🌟', desc: '功德成轮，仙擂与法则试炼进入第二循环。', meritCost: 650, jadeCost: 150, ruleCost: 86, powerBonus: 1700, title: '太乙金仙' }
]
export const IMMORTAL_SEASON_REWARDS: Array<{ id: ImmortalSeasonRewardId; needScore: number; name: string; icon: string; desc: string; merit: number; jade: number; rule: number }> = [
  { id: 'arena_10', needScore: 10, name: '问道小成', icon: '🥉', desc: '仙擂赛季首段奖励，鼓励参与 PK。', merit: 30, jade: 8, rule: 3 },
  { id: 'arena_30', needScore: 30, name: '连胜入榜', icon: '🥈', desc: '进入仙擂榜单，奖励洞天建设资源。', merit: 70, jade: 18, rule: 8 },
  { id: 'arena_60', needScore: 60, name: '云阙擂主', icon: '🥇', desc: '赛季擂主奖励，形成飞升后中期目标。', merit: 140, jade: 36, rule: 18 }
]

export const IMMORTAL_LINEAGES: Array<{ id: ImmortalLineageId; name: string; icon: string; desc: string; bonus: string }> = [
  { id: 'sword_dao', name: '星河剑统', icon: '🗡️', desc: '以星河落刃开道，偏向仙擂与试炼爆发。', bonus: 'PK胜利功德+6，星河落刃额外加势' },
  { id: 'thunder_dao', name: '紫霄雷统', icon: '⚡', desc: '执雷罚、正天规，偏向法则碎片与突破稳定。', bonus: '天命法则选择额外+2' },
  { id: 'harvest_dao', name: '司农仙统', icon: '🌾', desc: '以仙界调度反哺凡界，偏向仙市与凡界回响。', bonus: '凡界回响消耗降低，仙市兑换返还仙玉' },
  { id: 'fate_dao', name: '文命道统', icon: '📜', desc: '记录香火因果，偏向天命事件与功德累积。', bonus: '天命功德选择额外+8' }
]
export const IMMORTAL_ALLIANCES: Array<{ id: ImmortalAllianceId; name: string; icon: string; desc: string; costMerit: number; costJade: number; rewardRule: number; rewardEcho: number; rewardSeason: number }> = [
  { id: 'cloud_guard', name: '云阙卫盟', icon: '🛡️', desc: '召集仙友镇守云阙，偏向仙擂与战斗声望。', costMerit: 30, costJade: 8, rewardRule: 4, rewardEcho: 0, rewardSeason: 12 },
  { id: 'jade_register', name: '玉册司盟', icon: '📚', desc: '共同修订天庭玉册，偏向仙职事务和功德治理。', costMerit: 24, costJade: 6, rewardRule: 5, rewardEcho: 1, rewardSeason: 6 },
  { id: 'star_forge', name: '星炉匠盟', icon: '🔥', desc: '合炼星砂仙器，偏向洞天建设与法则碎片。', costMerit: 18, costJade: 14, rewardRule: 8, rewardEcho: 0, rewardSeason: 4 },
  { id: 'mortal_bridge', name: '凡缘桥盟', icon: '🌉', desc: '组织仙凡互济，强化宗门、家族、灵田回响。', costMerit: 36, costJade: 4, rewardRule: 2, rewardEcho: 3, rewardSeason: 5 }
]
export const CHAOS_RIFTS: Array<{ id: ChaosRiftId; name: string; icon: string; desc: string; needPower: number; rewardMerit: number; rewardJade: number; rewardRule: number; risk: number }> = [
  { id: 'void_tide', name: '虚空潮汐', icon: '🌌', desc: '混沌潮汐冲刷仙界边境，考验综合仙战力。', needPower: 180, rewardMerit: 45, rewardJade: 10, rewardRule: 6, risk: 18 },
  { id: 'fallen_star', name: '坠星残域', icon: '☄️', desc: '坠落星骸中藏有仙玉与小法则核。', needPower: 260, rewardMerit: 35, rewardJade: 18, rewardRule: 8, risk: 24 },
  { id: 'demon_gate', name: '天魔隙门', icon: '👹', desc: '天魔窥伺飞升者道心，胜者可涨仙擂气势。', needPower: 360, rewardMerit: 70, rewardJade: 12, rewardRule: 10, risk: 32 },
  { id: 'law_maze', name: '法则迷宫', icon: '🧩', desc: '迷宫内法则倒错，适合冲刺仙阶突破。', needPower: 480, rewardMerit: 60, rewardJade: 16, rewardRule: 18, risk: 38 }
]
export const FATE_PLATES: Array<{ id: FatePlateId; name: string; icon: string; desc: string; costRule: number; costJade: number; power: number; bonus: string }> = [
  { id: 'merit_orbit', name: '功德星轨', icon: '✨', desc: '将天命功德沉入命盘，提升治理类收益。', costRule: 12, costJade: 8, power: 26, bonus: '天命功德抉择额外收益' },
  { id: 'battle_orbit', name: '斗战星轨', icon: '⚔️', desc: '以仙擂气势刻入命盘，提升裂隙与 PK 表现。', costRule: 14, costJade: 10, power: 34, bonus: '混沌裂隙更容易成功' },
  { id: 'harvest_orbit', name: '丰穰星轨', icon: '🌱', desc: '把凡界回响纳入命盘，强化仙凡循环。', costRule: 10, costJade: 12, power: 24, bonus: '凡界回响与仙盟协作更强' },
  { id: 'law_orbit', name: '法则星轨', icon: '🔮', desc: '将碎片编织成命盘核心，提升仙阶底蕴。', costRule: 20, costJade: 16, power: 46, bonus: '仙阶与洞天战力加成' }
]

export const IMMORTAL_STORY_CHAPTERS: Array<{ id: ImmortalStoryId; chapter: string; title: string; icon: string; desc: string; requirement: string; rewardText: string; need: (state: { immortalPower: number; mandateProgress: number; allianceScore: number; riftScore: number; fatePlatePower: number; seasonScore: number; immortalRealmStage: number }) => boolean }> = [
  { id: 'first_edict', chapter: '第一幕·第一章', title: '云阙初诏', icon: '📜', desc: '飞升后第一道天诏落下：旧天庭功簿残缺，凡界因果仍系于你身。你不是摆脱凡尘，而是被卷入仙界秩序的重建。', requirement: '仙战力达到 180，天命积分达到 12', rewardText: '功德+80、仙玉+16、法则碎片+8', need: s => s.immortalPower >= 180 && s.mandateProgress >= 12 },
  { id: 'rift_truth', chapter: '第一幕·第二章', title: '裂隙真相', icon: '🌌', desc: '混沌裂隙并非自然灾厄，而是旧天庭崩塌后遗留的法则伤口。每一次镇压都能看见旧日仙官留下的残影。', requirement: '镇压混沌裂隙 2 次，命盘战力达到 40', rewardText: '功德+120、仙玉+24、法则碎片+14、仙擂气势+1', need: s => s.riftScore >= 2 && s.fatePlatePower >= 40 },
  { id: 'old_heaven', chapter: '第一幕·第三章', title: '旧天庭遗案', icon: '🏛️', desc: '玉册司残页揭开旧案：仙盟、仙市、仙擂皆曾是维系天道的机关。旧天庭不是被外敌攻破，而是从功德账册里开始腐朽。', requirement: '仙盟协作声望达到 3，仙擂赛季积分达到 70', rewardText: '功德+180、仙玉+32、法则碎片+22', need: s => s.allianceScore >= 3 && s.seasonScore >= 70 },
  { id: 'mortal_anchor', chapter: '第二幕·第一章', title: '凡界锚点', icon: '🌉', desc: '你发现凡界不是飞升后的过去，而是仙界法则稳定的锚点。宗门、家族、灵田的回响会决定仙界未来的形状。', requirement: '天命积分达到 80，仙阶至少达到地仙', rewardText: '功德+220、仙玉+40、法则碎片+28、凡界三线回响+3', need: s => s.mandateProgress >= 80 && s.immortalRealmStage >= 1 },
  { id: 'star_archive', chapter: '第二幕·第二章', title: '星海秘档', icon: '📚', desc: '星海深处保存着飞升者名录。你查到自己的名字旁有一行旧注：“凡缘未断者，不可入无情天。”这意味着你的仙路会被凡界牵动。', requirement: '命盘战力达到 100，天命积分达到 120', rewardText: '功德+260、仙玉+46、法则碎片+34', need: s => s.fatePlatePower >= 100 && s.mandateProgress >= 120 },
  { id: 'three_realms_debt', chapter: '第二幕·第三章', title: '三界债契', icon: '🧾', desc: '旧天庭曾向凡界抽取香火、向仙市借取仙玉、向仙盟许下战功。如今债契反噬，新仙界必须偿还旧秩序欠下的因果。', requirement: '仙盟协作声望达到 8，赛季积分达到 150', rewardText: '功德+320、仙玉+52、法则碎片+40', need: s => s.allianceScore >= 8 && s.seasonScore >= 150 },
  { id: 'ancient_oath', chapter: '第三幕·第一章', title: '太古盟誓', icon: '🪬', desc: '太古仙盟留下盟誓：仙人不得只求长生，必须守住一方世界的四时、战火、香火与记忆。你开始从飞升者变成承担者。', requirement: '仙战力达到 520，镇压裂隙 4 次', rewardText: '功德+380、仙玉+60、法则碎片+50、仙盟声望+2', need: s => s.immortalPower >= 520 && s.riftScore >= 4 },
  { id: 'demon_counterplot', chapter: '第三幕·第二章', title: '天魔反策', icon: '👁️', desc: '天魔不再正面攻打天门，而是伪装成仙盟功臣、仙市商贾、甚至凡界香火。你必须用天命抉择找出混沌的缝隙。', requirement: '天命积分达到 200，镇压裂隙 6 次', rewardText: '功德+460、仙玉+72、法则碎片+62、仙擂气势+2', need: s => s.mandateProgress >= 200 && s.riftScore >= 6 },
  { id: 'heaven_trial', chapter: '第四幕·第一章', title: '新天试炼', icon: '⚖️', desc: '新天门开启前，四道试炼同时落下：功德、斗战、丰穰、法则。命盘中每一条星轨都在审问你的道。', requirement: '命盘战力达到 220，仙战力达到 760', rewardText: '功德+540、仙玉+84、法则碎片+76', need: s => s.fatePlatePower >= 220 && s.immortalPower >= 760 },
  { id: 'dao_dispute', chapter: '第四幕·第二章', title: '诸道争衡', icon: '🌀', desc: '星河剑统、紫霄雷统、司农仙统、文命道统都要求你偏向它们。真正的新天道不是选一条路，而是让每条路都有位置。', requirement: '仙盟协作声望达到 12，仙阶至少达到天仙', rewardText: '功德+620、仙玉+96、法则碎片+90', need: s => s.allianceScore >= 12 && s.immortalRealmStage >= 2 },
  { id: 'alliance_coronation', chapter: '第四幕·第三章', title: '万仙朝议', icon: '👑', desc: '云阙诸仙、凡界香火、仙市商盟、仙擂战魁齐聚天门。你必须证明新秩序不是另一个旧天庭，而是能让三界继续生长的约定。', requirement: '赛季积分达到 320，镇压裂隙 10 次', rewardText: '功德+760、仙玉+120、法则碎片+110', need: s => s.seasonScore >= 320 && s.riftScore >= 10 },
  { id: 'new_heaven', chapter: '终幕', title: '新天门立约', icon: '🚪', desc: '云阙天门重开，你不再只是飞升者，而是新仙界秩序的立约者。道统、命盘、仙盟、凡界回响汇成你的天道雏形。', requirement: '仙战力达到 1200，命盘战力达到 360，镇压裂隙 15 次', rewardText: '功德+1000、仙玉+160、法则碎片+150、称号升级为「新天立约者」', need: s => s.immortalPower >= 1200 && s.fatePlatePower >= 360 && s.riftScore >= 15 }
]

export const IMMORTAL_MANDATES: Array<{ id: ImmortalMandateId; name: string; icon: string; desc: string; choices: Array<{ id: ImmortalMandateChoiceId; name: string; desc: string; merit: number; jade: number; rule: number; echo: number; streak: number }> }> = [
  { id: 'heaven_river', name: '天河决堤', icon: '🌊', desc: '天河水势倒灌云阙，是救灾积功德，还是截取法则稳洞天？', choices: [
    { id: 'merit', name: '救灾积德', desc: '安抚仙民，功德大增。', merit: 36, jade: 3, rule: 1, echo: 0, streak: 0 },
    { id: 'law', name: '截流悟法', desc: '观天河流向，凝聚水行法则。', merit: 12, jade: 4, rule: 5, echo: 0, streak: 0 },
    { id: 'mortal', name: '引水润凡', desc: '将余泽导入凡界灵田。', merit: 16, jade: 2, rule: 2, echo: 2, streak: 0 }
  ] },
  { id: 'star_audit', name: '星官问责', icon: '⭐', desc: '星官稽核仙职功过，选择偏向会影响仙界资源节奏。', choices: [
    { id: 'merit', name: '呈报功簿', desc: '清算功簿，功德入账。', merit: 28, jade: 5, rule: 1, echo: 0, streak: 0 },
    { id: 'law', name: '辩明天条', desc: '以法则自证，碎片增加。', merit: 10, jade: 4, rule: 6, echo: 0, streak: 0 },
    { id: 'battle', name: '请战证道', desc: '以仙擂表现回应质疑。', merit: 18, jade: 6, rule: 2, echo: 0, streak: 1 }
  ] },
  { id: 'mortal_incense', name: '凡界香火冲突', icon: '🕯️', desc: '宗门、家族、灵田争夺仙缘，需要选择回响方向。', choices: [
    { id: 'mortal', name: '均分香火', desc: '三线皆得回响。', merit: 18, jade: 3, rule: 2, echo: 3, streak: 0 },
    { id: 'merit', name: '立碑明德', desc: '聚香火成功德。', merit: 34, jade: 2, rule: 1, echo: 1, streak: 0 },
    { id: 'law', name: '斩断杂念', desc: '清理因果，凝聚法则。', merit: 8, jade: 3, rule: 5, echo: 0, streak: 0 }
  ] },
  { id: 'arena_invite', name: '云阙邀战', icon: '🥊', desc: '仙擂送来邀战帖，可借势提升赛季节奏。', choices: [
    { id: 'battle', name: '登台应战', desc: '积累连胜气势。', merit: 16, jade: 8, rule: 2, echo: 0, streak: 2 },
    { id: 'law', name: '观战悟道', desc: '不战而观法。', merit: 10, jade: 4, rule: 5, echo: 0, streak: 0 },
    { id: 'merit', name: '调停斗争', desc: '化解私斗换功德。', merit: 30, jade: 3, rule: 1, echo: 0, streak: 0 }
  ] }
]

export const useAscensionStore = defineStore('ascension', () => {
  const ascended = ref(false)
  const ascensionQuestActive = ref(false)
  const ascensionQuestComplete = ref(false)
  const inImmortalWorld = ref(false)
  const immortalTitle = ref('')
  const immortalOffice = ref<ImmortalOfficeId>('xuntian')
  const merit = ref(0)
  const immortalJade = ref(0)
  const ruleFragments = ref(0)
  const immortalEssence = ref(0)
  const gearLevels = ref<Record<ImmortalGearSlot, number>>({ weapon: 0, crown: 0, armor: 0, pendant: 0, seal: 0, boots: 0 })
  const immortalBodyLevel = ref(1)
  const immortalBoneLevel = ref(1)
  const immortalSoulLevel = ref(1)
  const trialWins = ref<Record<ImmortalTrialId, number>>({ star_river: 0, thunder_palace: 0, sun_ruins: 0 })
  const lastArtId = ref<ImmortalArtId>('starfall_sword')
  const lastBattleText = ref('仙光初凝，尚未发动仙术。')
  const visualPulse = ref(0)
  const dutyDone = ref<Record<ImmortalDutyId, boolean>>({ rain_edict: false, demon_edict: false, forge_edict: false, fate_edict: false })
  const caveLevels = ref<Record<ImmortalCaveId, number>>({ star_platform: 0, merit_pool: 0, law_tablet: 0, spirit_spring: 0, mortal_anchor: 0 })
  const caveHeavenStability = ref(100)
  const caveHeavenMaintenanceKey = ref('')
  const echoBlessings = ref<Record<MortalEchoId, number>>({ sect_blessing: 0, family_blessing: 0, farm_blessing: 0 })
  const pkWins = ref(0)
  const pkLosses = ref(0)
  const pkStreak = ref(0)
  const immortalRealmStage = ref(0)
  const marketPurchases = ref<Record<ImmortalMarketId, number>>({ jade_seed: 0, star_sand: 0, edict_scroll: 0, law_core: 0 })
  const seasonClaimed = ref<Record<ImmortalSeasonRewardId, boolean>>({ arena_10: false, arena_30: false, arena_60: false })
  const immortalLineage = ref<ImmortalLineageId>('sword_dao')
  const mandateProgress = ref(0)
  const mandateDone = ref<Record<ImmortalMandateId, number>>({ heaven_river: 0, star_audit: 0, mortal_incense: 0, arena_invite: 0 })
  const allianceProgress = ref<Record<ImmortalAllianceId, number>>({ cloud_guard: 0, jade_register: 0, star_forge: 0, mortal_bridge: 0 })
  const riftClears = ref<Record<ChaosRiftId, number>>({ void_tide: 0, fallen_star: 0, demon_gate: 0, law_maze: 0 })
  const fatePlateLevels = ref<Record<FatePlateId, number>>({ merit_orbit: 0, battle_orbit: 0, harvest_orbit: 0, law_orbit: 0 })
  const storyClaimed = ref<Record<ImmortalStoryId, boolean>>({ first_edict: false, rift_truth: false, old_heaven: false, mortal_anchor: false, star_archive: false, three_realms_debt: false, ancient_oath: false, demon_counterplot: false, heaven_trial: false, dao_dispute: false, alliance_coronation: false, new_heaven: false })
  const adminPreviewMode = ref(false)
  const adminPreviewSnapshot = ref<any | null>(null)

  const canAscend = computed(() => {
    const cultivation = useCultivationStore()
    return !ascended.value && cultivation.realmIndex >= ASCENSION_REALM_INDEX
  })
  const ascensionMaterialsReady = computed(() => {
    const playerStore = usePlayerStore()
    if (playerStore.money < ASCENSION_MONEY) return false
    return ASCENSION_MATERIALS.every(mat => getCombinedItemCount(mat.itemId) >= mat.quantity)
  })
  const ascensionMaterials = computed(() => ASCENSION_MATERIALS)
  const ascensionMoneyCost = computed(() => ASCENSION_MONEY)
  const immortalRank = computed(() => {
    const score = merit.value + immortalJade.value * 3 + ruleFragments.value * 5
    if (score >= 360) return '太乙仙班'
    if (score >= 180) return '上清仙籍'
    if (score >= 80) return '云阙仙籍'
    return '初录仙籍'
  })
  const immortalPower = computed(() => {
    const cultivation = useCultivationStore()
    return cultivation.combatPower + merit.value * 3 + immortalJade.value * 12 + ruleFragments.value * 25 + (immortalBodyLevel.value + immortalBoneLevel.value + immortalSoulLevel.value) * 80 + cavePower.value + immortalRealmPowerBonus.value + gearPower.value
  })
  const bodyProfile = computed(() => [
    { name: '仙体', level: immortalBodyLevel.value, desc: '飞升后肉身蜕凡，角色外观出现仙光与云纹。' },
    { name: '仙骨', level: immortalBoneLevel.value, desc: '承载天雷与星辉，影响仙术破防表现。' },
    { name: '仙魂', level: immortalSoulLevel.value, desc: '凝聚功德香火，影响法则掌控与试炼稳定。' }
  ])
  const officeInfo = computed(() => IMMORTAL_OFFICES.find(o => o.id === immortalOffice.value) || IMMORTAL_OFFICES[0]!)
  const caveHeavenStabilityRate = computed(() => Math.max(0.5, Math.min(1.15, caveHeavenStability.value / 100)))
  const cavePower = computed(() => Math.floor(IMMORTAL_CAVE_NODES.reduce((sum, node) => sum + (caveLevels.value[node.id] ?? 0) * node.powerPerLevel, 0) * caveHeavenStabilityRate.value))
  const gearPower = computed(() => {
    const base = IMMORTAL_GEAR.reduce((sum, gear) => sum + (gearLevels.value[gear.id] || 0) * gear.basePower, 0)
    const awakened = IMMORTAL_GEAR.filter(gear => (gearLevels.value[gear.id] || 0) >= 3).length
    const resonance = awakened >= 6 ? 360 : awakened >= 4 ? 150 : awakened >= 2 ? 55 : 0
    return base + resonance
  })
  const gearResonance = computed(() => {
    const awakened = IMMORTAL_GEAR.filter(gear => (gearLevels.value[gear.id] || 0) >= 3).length
    return awakened >= 6 ? '六件·万象仙装：仙战力+360' : awakened >= 4 ? '四件·云阙共鸣：仙战力+150' : awakened >= 2 ? '两件·初现仙辉：仙战力+55' : '激活两件至Lv.3，唤醒仙装共鸣'
  })
  const pkRecord = computed(() => `${pkWins.value}胜 / ${pkLosses.value}负 · 连胜${pkStreak.value}`)
  const immortalRealmInfo = computed(() => IMMORTAL_REALMS[Math.min(immortalRealmStage.value, IMMORTAL_REALMS.length - 1)] || IMMORTAL_REALMS[0]!)
  const nextImmortalRealm = computed(() => IMMORTAL_REALMS[immortalRealmStage.value + 1] || null)
  const immortalRealmPowerBonus = computed(() => immortalRealmInfo.value.powerBonus)
  const seasonScore = computed(() => pkWins.value * 10 + Math.max(0, pkStreak.value) * 3 + mandateProgress.value + allianceScore.value + riftScore.value * 4)
  const lineageInfo = computed(() => IMMORTAL_LINEAGES.find(l => l.id === immortalLineage.value) || IMMORTAL_LINEAGES[0]!)
  const fatePlatePower = computed(() => FATE_PLATES.reduce((sum, plate) => sum + (fatePlateLevels.value[plate.id] || 0) * plate.power, 0))
  const allianceScore = computed(() => Object.values(allianceProgress.value).reduce((sum, v) => sum + Number(v || 0), 0))
  const riftScore = computed(() => Object.values(riftClears.value).reduce((sum, v) => sum + Number(v || 0), 0))
  const storyState = computed(() => ({ immortalPower: immortalPower.value, mandateProgress: mandateProgress.value, allianceScore: allianceScore.value, riftScore: riftScore.value, fatePlatePower: fatePlatePower.value, seasonScore: seasonScore.value, immortalRealmStage: immortalRealmStage.value }))
  const storyProgress = computed(() => IMMORTAL_STORY_CHAPTERS.filter(ch => storyClaimed.value[ch.id]).length)

  const triggerAscensionQuest = () => {
    if (ascended.value || ascensionQuestActive.value) return
    ascensionQuestActive.value = true
    addLog('天劫已过，飞升之机已至！前往飞升台准备飞升仙界。')
  }
  const performAscension = (): boolean => {
    if (!canAscend.value || !ascensionMaterialsReady.value) return false
    const playerStore = usePlayerStore()
    const cultivation = useCultivationStore()
    playerStore.spendMoney(ASCENSION_MONEY)
    for (const mat of ASCENSION_MATERIALS) removeCombinedItem(mat.itemId, mat.quantity)
    if (cultivation.realmIndex > ASCENSION_REALM_INDEX) cultivation.realmIndex = ASCENSION_REALM_INDEX
    ascended.value = true
    ascensionQuestActive.value = false
    ascensionQuestComplete.value = true
    immortalTitle.value = '初入仙门'
    inImmortalWorld.value = true
    merit.value += 30
    immortalJade.value += 6
    ruleFragments.value += 3
    lastBattleText.value = '金阙开门，凡身褪尘：仙体、仙骨、仙魂已显化。'
    visualPulse.value++
    addLog('飞升成功！你踏入仙界，获得「初入仙门」称号，人物仙光与仙术特效已变化。')
    return true
  }
  const enterImmortalWorld = () => { inImmortalWorld.value = true }
  const returnToWorld = () => { inImmortalWorld.value = false }
  const chooseOffice = (id: ImmortalOfficeId) => {
    immortalOffice.value = id
    const office = IMMORTAL_OFFICES.find(o => o.id === id)
    addLog(`仙籍调整为「${office?.name ?? '仙官'}」：${office?.buff ?? '仙界事务收益变化'}。`)
  }
  const castImmortalArt = (id: ImmortalArtId) => {
    const art = IMMORTAL_ARTS.find(a => a.id === id) || IMMORTAL_ARTS[0]!
    lastArtId.value = art.id
    visualPulse.value++
    lastBattleText.value = `${art.icon} ${art.name}发动：${art.effect}，${art.element}在云海中显化。`
    addLog(lastBattleText.value)
  }
  const challengeTrial = (id: ImmortalTrialId): boolean => {
    if (!ascended.value) return false
    const trial = IMMORTAL_TRIALS.find(t => t.id === id)
    if (!trial) return false
    const inventoryStore = useInventoryStore()
    const art = IMMORTAL_ARTS.find(a => a.id === lastArtId.value) || IMMORTAL_ARTS[0]!
    const officeBonus = immortalOffice.value === 'xuntian' ? 1.1 : 1
    const power = immortalPower.value + art.basePower + Math.floor(Math.random() * 180)
    visualPulse.value++
    if (power < trial.difficulty) {
      lastBattleText.value = `${trial.icon} ${trial.enemy}挡下了${art.name}，仙域法则反震。提升仙体或积累功德后再战。`
      addLog(lastBattleText.value)
      return false
    }
    const meritGain = Math.round(trial.rewardMerit * officeBonus)
    merit.value += meritGain
    immortalJade.value += trial.rewardJade
    ruleFragments.value += trial.rewardRule
    const essenceGain = 2 + Math.floor(trial.difficulty / 700)
    immortalEssence.value += essenceGain
    trialWins.value[id] = (trialWins.value[id] ?? 0) + 1
    if (trial.rewardItem) inventoryStore.addItem(trial.rewardItem.itemId, trial.rewardItem.quantity)
    if (merit.value >= immortalBodyLevel.value * 70) immortalBodyLevel.value += 1
    if (ruleFragments.value >= immortalBoneLevel.value * 12) immortalBoneLevel.value += 1
    if (immortalJade.value >= immortalSoulLevel.value * 18) immortalSoulLevel.value += 1
    lastBattleText.value = `${trial.icon} ${art.name}击破「${trial.enemy}」！获得功德+${meritGain}、仙玉+${trial.rewardJade}、法则碎片+${trial.rewardRule}、仙器精魄+${essenceGain}${trial.rewardItem ? `、${trial.rewardItem.name}+${trial.rewardItem.quantity}` : ''}。`
    addLog(lastBattleText.value)
    return true
  }

  const completeDuty = (id: ImmortalDutyId): boolean => {
    if (!ascended.value || dutyDone.value[id]) return false
    const duty = IMMORTAL_DUTIES.find(d => d.id === id)
    if (!duty) return false
    const officeMatch = duty.office === immortalOffice.value ? 1.25 : 1
    const meritGain = Math.round(duty.rewardMerit * officeMatch)
    merit.value += meritGain
    immortalJade.value += duty.rewardJade
    ruleFragments.value += duty.rewardRule
    dutyDone.value[id] = true
    visualPulse.value++
    lastBattleText.value = `${duty.icon} 完成仙职事务「${duty.name}」：功德+${meritGain}、仙玉+${duty.rewardJade}、法则碎片+${duty.rewardRule}。`
    addLog(lastBattleText.value)
    return true
  }
  const upgradeCaveNode = (id: ImmortalCaveId): boolean => {
    const node = IMMORTAL_CAVE_NODES.find(n => n.id === id)
    if (!node) return false
    const level = caveLevels.value[id] ?? 0
    const jadeCost = node.jadeCost + level * 3
    const ruleCost = node.ruleCost + level
    if (immortalJade.value < jadeCost || ruleFragments.value < ruleCost) { addLog(`${node.name}升级需要仙玉${jadeCost}、法则碎片${ruleCost}。`); return false }
    immortalJade.value -= jadeCost
    ruleFragments.value -= ruleCost
    caveLevels.value[id] = level + 1
    visualPulse.value++
    caveHeavenStability.value = Math.min(115, caveHeavenStability.value + 10)
    lastBattleText.value = `${node.icon} 洞天「${node.name}」升至 Lv.${level + 1}，仙战力 +${node.powerPerLevel}，洞天稳定+10。`
    addLog(lastBattleText.value)
    return true
  }
  const sendMortalEcho = (id: MortalEchoId): boolean => {
    const echo = MORTAL_ECHOES.find(e => e.id === id)
    if (!echo) return false
    if (merit.value < echo.meritCost) { addLog(`${echo.name}需要功德${echo.meritCost}。`); return false }
    merit.value -= Math.max(1, echo.meritCost - (immortalLineage.value === 'harvest_dao' ? 5 : 0))
    echoBlessings.value[id] = (echoBlessings.value[id] ?? 0) + 1
    visualPulse.value++
    lastBattleText.value = `${echo.icon} ${echo.name}已降下：${echo.rewardText}`
    addLog(lastBattleText.value)
    return true
  }
  const challengeRival = (id: ImmortalRivalId): boolean => {
    if (!ascended.value) return false
    const rival = IMMORTAL_RIVALS.find(r => r.id === id)
    if (!rival) return false
    const art = IMMORTAL_ARTS.find(a => a.id === lastArtId.value) || IMMORTAL_ARTS[0]!
    const power = immortalPower.value + cavePower.value + art.basePower + pkStreak.value * 35 + Math.floor(Math.random() * 220)
    visualPulse.value++
    if (power < rival.power) {
      pkLosses.value += 1
      pkStreak.value = 0
      lastBattleText.value = `${rival.icon} 仙擂问道败给「${rival.name}」：${rival.style}压制了${art.name}，建议升级洞天或切换仙术。`
      addLog(lastBattleText.value)
      return false
    }
    pkWins.value += 1
    pkStreak.value += 1
    const streakBonus = Math.min(10, pkStreak.value)
    merit.value += rival.rewardMerit + streakBonus + (immortalLineage.value === 'sword_dao' ? 6 : 0)
    immortalJade.value += rival.rewardJade
    ruleFragments.value += rival.rewardRule
    lastBattleText.value = `${rival.icon} 仙擂胜利！${art.name}破开「${rival.name}」的${rival.style}，功德+${rival.rewardMerit + streakBonus + (immortalLineage.value === 'sword_dao' ? 6 : 0)}、仙玉+${rival.rewardJade}、法则+${rival.rewardRule}。`
    addLog(lastBattleText.value)
    return true
  }

  const buyImmortalMarket = (id: ImmortalMarketId): boolean => {
    if (!ascended.value) return false
    const goods = IMMORTAL_MARKET.find(g => g.id === id)
    if (!goods) return false
    if (merit.value < goods.costMerit || immortalJade.value < goods.costJade || ruleFragments.value < goods.costRule) {
      addLog(`${goods.name}需要功德${goods.costMerit}、仙玉${goods.costJade}、法则碎片${goods.costRule}。`)
      return false
    }
    const inventoryStore = useInventoryStore()
    merit.value -= goods.costMerit
    immortalJade.value -= goods.costJade
    ruleFragments.value -= goods.costRule
    if (goods.itemId && goods.itemQty) inventoryStore.addItem(goods.itemId, goods.itemQty)
    if (goods.bodyGain) immortalBodyLevel.value += goods.bodyGain
    if (goods.boneGain) immortalBoneLevel.value += goods.boneGain
    if (goods.soulGain) immortalSoulLevel.value += goods.soulGain
    marketPurchases.value[id] = (marketPurchases.value[id] ?? 0) + 1
    visualPulse.value++
    lastBattleText.value = `${goods.icon} 仙市购得「${goods.name}」：${goods.reward}。仙界资源转化为长期成长。`
    addLog(lastBattleText.value)
    return true
  }
  const upgradeImmortalGear = (id: ImmortalGearSlot): boolean => {
    const gear = IMMORTAL_GEAR.find(item => item.id === id)
    if (!ascended.value || !gear) return false
    const level = gearLevels.value[id] || 0
    const essenceCost = 4 + level * 3
    const jadeCost = 3 + level * 2
    const ruleCost = level >= 3 ? 1 + Math.floor((level - 3) / 2) : 0
    if (immortalEssence.value < essenceCost || immortalJade.value < jadeCost || ruleFragments.value < ruleCost) { addLog(`${gear.name}淬炼需要仙器精魄${essenceCost}、仙玉${jadeCost}${ruleCost ? `、法则${ruleCost}` : ''}。`); return false }
    immortalEssence.value -= essenceCost; immortalJade.value -= jadeCost; ruleFragments.value -= ruleCost
    gearLevels.value[id] = level + 1
    visualPulse.value++
    lastBattleText.value = `✦ ${gear.name}淬炼至 Lv.${level + 1}：仙战力+${gear.basePower}，${level + 1 === 3 ? '仙装部位已觉醒，开始计入套装共鸣。' : '仙辉在器纹中流转。'}`
    addLog(lastBattleText.value)
    return true
  }

  const breakthroughImmortalRealm = (): boolean => {
    const next = nextImmortalRealm.value
    if (!ascended.value || !next) return false
    if (merit.value < next.meritCost || immortalJade.value < next.jadeCost || ruleFragments.value < next.ruleCost) {
      addLog(`${next.name}突破需要功德${next.meritCost}、仙玉${next.jadeCost}、法则碎片${next.ruleCost}。`)
      return false
    }
    merit.value -= next.meritCost
    immortalJade.value -= next.jadeCost
    ruleFragments.value -= next.ruleCost
    immortalRealmStage.value += 1
    immortalTitle.value = next.title
    visualPulse.value++
    lastBattleText.value = `${next.icon} 仙阶突破至「${next.name}」：${next.desc} 仙战力底蕴 +${next.powerBonus}。`
    addLog(lastBattleText.value)
    return true
  }
  const claimSeasonReward = (id: ImmortalSeasonRewardId): boolean => {
    const reward = IMMORTAL_SEASON_REWARDS.find(r => r.id === id)
    if (!reward || seasonClaimed.value[id]) return false
    if (seasonScore.value < reward.needScore) { addLog(`${reward.name}需要仙擂赛季积分${reward.needScore}。`); return false }
    seasonClaimed.value[id] = true
    merit.value += reward.merit
    immortalJade.value += reward.jade
    ruleFragments.value += reward.rule
    visualPulse.value++
    lastBattleText.value = `${reward.icon} 领取仙擂赛季奖励「${reward.name}」：功德+${reward.merit}、仙玉+${reward.jade}、法则碎片+${reward.rule}。`
    addLog(lastBattleText.value)
    return true
  }

  const chooseLineage = (id: ImmortalLineageId) => {
    if (!IMMORTAL_LINEAGES.some(l => l.id === id)) return false
    immortalLineage.value = id
    const info = lineageInfo.value
    visualPulse.value++
    lastBattleText.value = `${info.icon} 道统调整为「${info.name}」：${info.bonus}。`
    addLog(lastBattleText.value)
    return true
  }
  const resolveMandate = (mandateId: ImmortalMandateId, choiceId: ImmortalMandateChoiceId): boolean => {
    if (!ascended.value) return false
    const mandate = IMMORTAL_MANDATES.find(m => m.id === mandateId)
    const choice = mandate?.choices.find(c => c.id === choiceId)
    if (!mandate || !choice) return false
    const meritBonus = choice.id === 'merit' && immortalLineage.value === 'fate_dao' ? 8 : 0
    const ruleBonus = choice.id === 'law' && immortalLineage.value === 'thunder_dao' ? 2 : 0
    merit.value += choice.merit + meritBonus
    immortalJade.value += choice.jade
    ruleFragments.value += choice.rule + ruleBonus
    if (choice.streak) pkStreak.value += choice.streak
    if (choice.echo) {
      echoBlessings.value.sect_blessing = (echoBlessings.value.sect_blessing || 0) + choice.echo
      echoBlessings.value.family_blessing = (echoBlessings.value.family_blessing || 0) + choice.echo
      echoBlessings.value.farm_blessing = (echoBlessings.value.farm_blessing || 0) + choice.echo
    }
    mandateProgress.value += 6 + choice.echo * 2 + choice.streak * 3
    mandateDone.value[mandateId] = (mandateDone.value[mandateId] || 0) + 1
    visualPulse.value++
    lastBattleText.value = `${mandate.icon} 天命「${mandate.name}」选择「${choice.name}」：功德+${choice.merit + meritBonus}、仙玉+${choice.jade}、法则+${choice.rule + ruleBonus}${choice.echo ? `，凡界回响+${choice.echo}` : ''}${choice.streak ? `，仙擂气势+${choice.streak}` : ''}。`
    addLog(lastBattleText.value)
    return true
  }

  const coordinateAlliance = (id: ImmortalAllianceId): boolean => {
    const item = IMMORTAL_ALLIANCES.find(a => a.id === id)
    if (!item) return false
    const meritCost = Math.max(1, item.costMerit - (immortalLineage.value === 'fate_dao' ? 4 : 0))
    const jadeCost = Math.max(1, item.costJade - (immortalLineage.value === 'harvest_dao' ? 2 : 0))
    if (merit.value < meritCost || immortalJade.value < jadeCost) { addLog(`${item.name}需要功德${meritCost}、仙玉${jadeCost}。`); return false }
    merit.value -= meritCost
    immortalJade.value -= jadeCost
    const echoBonus = item.rewardEcho + (immortalLineage.value === 'harvest_dao' ? 1 : 0)
    ruleFragments.value += item.rewardRule
    mandateProgress.value += item.rewardSeason
    allianceProgress.value[id] = (allianceProgress.value[id] || 0) + 1
    if (echoBonus) {
      echoBlessings.value.sect_blessing = (echoBlessings.value.sect_blessing || 0) + echoBonus
      echoBlessings.value.family_blessing = (echoBlessings.value.family_blessing || 0) + echoBonus
      echoBlessings.value.farm_blessing = (echoBlessings.value.farm_blessing || 0) + echoBonus
    }
    visualPulse.value++
    lastBattleText.value = `${item.icon} 仙盟协作「${item.name}」完成：法则+${item.rewardRule}${echoBonus ? `，凡界回响+${echoBonus}` : ''}，赛季积分+${item.rewardSeason}。`
    addLog(lastBattleText.value)
    return true
  }
  const challengeChaosRift = (id: ChaosRiftId): boolean => {
    const rift = CHAOS_RIFTS.find(r => r.id === id)
    if (!rift) return false
    const battlePlate = fatePlateLevels.value.battle_orbit || 0
    const roll = Math.floor(Math.random() * 80) + immortalPower.value + pkStreak.value * 5 + battlePlate * 20
    const success = roll >= rift.needPower
    visualPulse.value++
    if (success) {
      merit.value += rift.rewardMerit
      immortalJade.value += rift.rewardJade
      ruleFragments.value += rift.rewardRule
      const essenceGain = 5 + Math.floor(rift.risk / 8)
      immortalEssence.value += essenceGain
      pkStreak.value += id === 'demon_gate' ? 1 : 0
      riftClears.value[id] = (riftClears.value[id] || 0) + 1
      lastBattleText.value = `${rift.icon} 镇压混沌裂隙「${rift.name}」成功：功德+${rift.rewardMerit}、仙玉+${rift.rewardJade}、法则+${rift.rewardRule}、仙器精魄+${essenceGain}${id === 'demon_gate' ? '，仙擂气势+1' : ''}。`
    } else {
      const loss = Math.min(ruleFragments.value, Math.max(1, Math.floor(rift.risk / 6)))
      ruleFragments.value -= loss
      pkStreak.value = Math.max(0, pkStreak.value - 1)
      lastBattleText.value = `${rift.icon} 混沌裂隙「${rift.name}」失利：法则碎片-${loss}，仙擂气势受挫。建议先提升洞天、仙阶或命盘。`
    }
    addLog(lastBattleText.value)
    return success
  }
  const upgradeFatePlate = (id: FatePlateId): boolean => {
    const plate = FATE_PLATES.find(p => p.id === id)
    if (!plate) return false
    const level = fatePlateLevels.value[id] || 0
    const ruleCost = plate.costRule + level * 6
    const jadeCost = plate.costJade + level * 4
    if (ruleFragments.value < ruleCost || immortalJade.value < jadeCost) { addLog(`${plate.name}需要法则碎片${ruleCost}、仙玉${jadeCost}。`); return false }
    ruleFragments.value -= ruleCost
    immortalJade.value -= jadeCost
    fatePlateLevels.value[id] = level + 1
    visualPulse.value++
    lastBattleText.value = `${plate.icon} 点亮命盘「${plate.name}」Lv.${level + 1}：仙战力+${plate.power}，${plate.bonus}。`
    addLog(lastBattleText.value)
    return true
  }

  const claimStoryChapter = (id: ImmortalStoryId): boolean => {
    const chapter = IMMORTAL_STORY_CHAPTERS.find(c => c.id === id)
    if (!chapter || storyClaimed.value[id]) return false
    if (!chapter.need(storyState.value)) { addLog(`${chapter.title}尚未达成：${chapter.requirement}。`); return false }
    storyClaimed.value[id] = true
    const idx = IMMORTAL_STORY_CHAPTERS.findIndex(c => c.id === id)
    merit.value += [80, 120, 180, 220, 260, 320, 380, 460, 540, 620, 760, 1000][idx] || 80
    immortalJade.value += [16, 24, 32, 40, 46, 52, 60, 72, 84, 96, 120, 160][idx] || 16
    ruleFragments.value += [8, 14, 22, 28, 34, 40, 50, 62, 76, 90, 110, 150][idx] || 8
    if (id === 'rift_truth') pkStreak.value += 1
    if (id === 'ancient_oath') allianceProgress.value.cloud_guard = (allianceProgress.value.cloud_guard || 0) + 2
    if (id === 'demon_counterplot') pkStreak.value += 2
    if (id === 'mortal_anchor') {
      echoBlessings.value.sect_blessing = (echoBlessings.value.sect_blessing || 0) + 3
      echoBlessings.value.family_blessing = (echoBlessings.value.family_blessing || 0) + 3
      echoBlessings.value.farm_blessing = (echoBlessings.value.farm_blessing || 0) + 3
    }
    if (id === 'new_heaven') immortalTitle.value = '新天立约者'
    visualPulse.value++
    lastBattleText.value = `${chapter.icon} 完成仙界主线「${chapter.chapter}·${chapter.title}」：${chapter.rewardText}。`
    addLog(lastBattleText.value)
    return true
  }


  const todayKey = () => new Date().toISOString().slice(0, 10)
  const caveHeavenMaintenanceCost = computed(() => {
    const lv = IMMORTAL_CAVE_NODES.reduce((sum, n) => sum + (caveLevels.value[n.id] || 0), 0)
    return { merit: Math.max(20, lv * 8), jade: Math.max(6, lv * 3), rule: Math.max(2, Math.floor(lv * 1.5)) }
  })
  const caveHeavenNeedsMaintenance = computed(() => ascended.value && caveHeavenStability.value < 100)
  const maintainCaveHeaven = () => {
    if (!ascended.value) return false
    if (caveHeavenStability.value >= 100) { addLog('洞天稳定，无需维护。'); return false }
    const cost = caveHeavenMaintenanceCost.value
    if (merit.value < cost.merit || immortalJade.value < cost.jade || ruleFragments.value < cost.rule) { addLog(`洞天维护需要功德${cost.merit}、仙玉${cost.jade}、法则${cost.rule}。`); return false }
    merit.value -= cost.merit
    immortalJade.value -= cost.jade
    ruleFragments.value -= cost.rule
    caveHeavenStability.value = 110
    caveHeavenMaintenanceKey.value = todayKey()
    lastBattleText.value = `🏔️ 洞天维护完成：功德-${cost.merit}、仙玉-${cost.jade}、法则-${cost.rule}，洞天稳定恢复。`
    addLog(lastBattleText.value)
    return true
  }
  const dailyCaveHeavenUpdate = () => {
    if (!ascended.value) return ''
    const today = todayKey()
    if (caveHeavenMaintenanceKey.value === today) return ''
    const levelSum = IMMORTAL_CAVE_NODES.reduce((sum, n) => sum + (caveLevels.value[n.id] || 0), 0)
    caveHeavenStability.value = Math.max(50, caveHeavenStability.value - Math.max(4, 3 + Math.floor(levelSum / 2)))
    caveHeavenMaintenanceKey.value = today
    return caveHeavenStability.value < 80 ? `洞天稳定降至${caveHeavenStability.value}，仙战力折损，可在仙界维护洞天。` : ''
  }

  const serialize = () => adminPreviewMode.value && adminPreviewSnapshot.value ? adminPreviewSnapshot.value : ({ ascended: ascended.value, ascensionQuestActive: ascensionQuestActive.value, ascensionQuestComplete: ascensionQuestComplete.value, inImmortalWorld: inImmortalWorld.value, immortalTitle: immortalTitle.value, immortalOffice: immortalOffice.value, merit: merit.value, immortalJade: immortalJade.value, ruleFragments: ruleFragments.value, immortalEssence: immortalEssence.value, gearLevels: gearLevels.value, immortalBodyLevel: immortalBodyLevel.value, immortalBoneLevel: immortalBoneLevel.value, immortalSoulLevel: immortalSoulLevel.value, trialWins: trialWins.value, lastArtId: lastArtId.value, lastBattleText: lastBattleText.value, visualPulse: visualPulse.value, dutyDone: dutyDone.value, caveLevels: caveLevels.value, caveHeavenStability: caveHeavenStability.value, caveHeavenMaintenanceKey: caveHeavenMaintenanceKey.value, echoBlessings: echoBlessings.value, pkWins: pkWins.value, pkLosses: pkLosses.value, pkStreak: pkStreak.value, immortalRealmStage: immortalRealmStage.value, marketPurchases: marketPurchases.value, seasonClaimed: seasonClaimed.value, immortalLineage: immortalLineage.value, mandateProgress: mandateProgress.value, mandateDone: mandateDone.value, allianceProgress: allianceProgress.value, riftClears: riftClears.value, fatePlateLevels: fatePlateLevels.value, storyClaimed: storyClaimed.value })
  const enterAdminPreview = () => {
    if (!adminPreviewSnapshot.value) adminPreviewSnapshot.value = serialize()
    adminPreviewMode.value = true
    ascended.value = true
    ascensionQuestActive.value = false
    ascensionQuestComplete.value = true
    inImmortalWorld.value = true
    immortalTitle.value = '太乙巡览 · 管理预览'
    immortalOffice.value = 'xuntian'
    merit.value = 1200
    immortalJade.value = 300
    ruleFragments.value = 180
    immortalEssence.value = 160
    gearLevels.value = { weapon: 5, crown: 4, armor: 5, pendant: 4, seal: 4, boots: 3 }
    immortalBodyLevel.value = 12
    immortalBoneLevel.value = 12
    immortalSoulLevel.value = 12
    immortalRealmStage.value = 4
    caveLevels.value = { star_platform: 6, merit_pool: 6, law_tablet: 6, spirit_spring: 6, mortal_anchor: 6 }
    caveHeavenStability.value = 115
    pkWins.value = 8
    pkLosses.value = 1
    pkStreak.value = 4
    mandateProgress.value = 90
    allianceProgress.value = { cloud_guard: 3, jade_register: 3, star_forge: 3, mortal_bridge: 3 }
    riftClears.value = { void_tide: 2, fallen_star: 2, demon_gate: 2, law_maze: 2 }
    fatePlateLevels.value = { merit_orbit: 4, battle_orbit: 4, harvest_orbit: 4, law_orbit: 4 }
    storyClaimed.value = { first_edict: true, rift_truth: true, old_heaven: true, mortal_anchor: true, star_archive: true, three_realms_debt: false, ancient_oath: false, demon_counterplot: false, heaven_trial: false, dao_dispute: false, alliance_coronation: false, new_heaven: false }
    lastBattleText.value = '管理员仙界预览模式已开启：当前数据仅用于界面与功能完整性检查，不会写入正式存档、排行或公告。'
    visualPulse.value++
    addLog('管理员仙界预览模式已开启，本次预览不会保存到正式存档。')
  }
  const exitAdminPreview = () => {
    const snap = adminPreviewSnapshot.value
    adminPreviewMode.value = false
    adminPreviewSnapshot.value = null
    if (snap) deserialize(snap)
    addLog('已退出管理员仙界预览模式，正式存档未被修改。')
  }

  const deserialize = (data: any) => {
    ascended.value = data?.ascended ?? false
    ascensionQuestActive.value = data?.ascensionQuestActive ?? false
    ascensionQuestComplete.value = data?.ascensionQuestComplete ?? false
    inImmortalWorld.value = data?.inImmortalWorld ?? false
    immortalTitle.value = data?.immortalTitle ?? ''
    immortalOffice.value = data?.immortalOffice ?? 'xuntian'
    merit.value = Number(data?.merit ?? 0)
    immortalJade.value = Number(data?.immortalJade ?? 0)
    ruleFragments.value = Number(data?.ruleFragments ?? 0)
    immortalEssence.value = Number(data?.immortalEssence ?? 0)
    gearLevels.value = { weapon: 0, crown: 0, armor: 0, pendant: 0, seal: 0, boots: 0, ...(data?.gearLevels ?? {}) }
    immortalBodyLevel.value = Number(data?.immortalBodyLevel ?? (ascended.value ? 1 : 0)) || (ascended.value ? 1 : 0)
    immortalBoneLevel.value = Number(data?.immortalBoneLevel ?? (ascended.value ? 1 : 0)) || (ascended.value ? 1 : 0)
    immortalSoulLevel.value = Number(data?.immortalSoulLevel ?? (ascended.value ? 1 : 0)) || (ascended.value ? 1 : 0)
    trialWins.value = { star_river: 0, thunder_palace: 0, sun_ruins: 0, ...(data?.trialWins ?? {}) }
    lastArtId.value = data?.lastArtId ?? 'starfall_sword'
    lastBattleText.value = data?.lastBattleText ?? '仙光初凝，尚未发动仙术。'
    visualPulse.value = Number(data?.visualPulse ?? 0)
    dutyDone.value = { rain_edict: false, demon_edict: false, forge_edict: false, fate_edict: false, ...(data?.dutyDone ?? {}) }
    caveLevels.value = { star_platform: 0, merit_pool: 0, law_tablet: 0, spirit_spring: 0, mortal_anchor: 0, ...(data?.caveLevels ?? {}) }
    caveHeavenStability.value = Number(data?.caveHeavenStability ?? 100)
    caveHeavenMaintenanceKey.value = String(data?.caveHeavenMaintenanceKey ?? todayKey())
    echoBlessings.value = { sect_blessing: 0, family_blessing: 0, farm_blessing: 0, ...(data?.echoBlessings ?? {}) }
    pkWins.value = Number(data?.pkWins ?? 0)
    pkLosses.value = Number(data?.pkLosses ?? 0)
    pkStreak.value = Number(data?.pkStreak ?? 0)
    immortalRealmStage.value = Math.max(0, Math.min(IMMORTAL_REALMS.length - 1, Number(data?.immortalRealmStage ?? 0)))
    marketPurchases.value = { jade_seed: 0, star_sand: 0, edict_scroll: 0, law_core: 0, ...(data?.marketPurchases ?? {}) }
    seasonClaimed.value = { arena_10: false, arena_30: false, arena_60: false, ...(data?.seasonClaimed ?? {}) }
    immortalLineage.value = data?.immortalLineage ?? 'sword_dao'
    mandateProgress.value = Number(data?.mandateProgress ?? 0)
    mandateDone.value = { heaven_river: 0, star_audit: 0, mortal_incense: 0, arena_invite: 0, ...(data?.mandateDone ?? {}) }
    allianceProgress.value = { cloud_guard: 0, jade_register: 0, star_forge: 0, mortal_bridge: 0, ...(data?.allianceProgress ?? {}) }
    riftClears.value = { void_tide: 0, fallen_star: 0, demon_gate: 0, law_maze: 0, ...(data?.riftClears ?? {}) }
    fatePlateLevels.value = { merit_orbit: 0, battle_orbit: 0, harvest_orbit: 0, law_orbit: 0, ...(data?.fatePlateLevels ?? {}) }
    storyClaimed.value = { first_edict: false, rift_truth: false, old_heaven: false, mortal_anchor: false, star_archive: false, three_realms_debt: false, ancient_oath: false, demon_counterplot: false, heaven_trial: false, dao_dispute: false, alliance_coronation: false, new_heaven: false, ...(data?.storyClaimed ?? {}) }
  }
  return { IMMORTAL_GEAR, IMMORTAL_DUTIES, IMMORTAL_CAVE_NODES, MORTAL_ECHOES, IMMORTAL_RIVALS, IMMORTAL_MARKET, IMMORTAL_REALMS, IMMORTAL_SEASON_REWARDS, IMMORTAL_LINEAGES, IMMORTAL_MANDATES, IMMORTAL_ALLIANCES, CHAOS_RIFTS, FATE_PLATES, IMMORTAL_STORY_CHAPTERS, ascended, ascensionQuestActive, ascensionQuestComplete, inImmortalWorld, immortalTitle, immortalOffice, merit, immortalJade, ruleFragments, immortalEssence, gearLevels, gearPower, gearResonance, immortalBodyLevel, immortalBoneLevel, immortalSoulLevel, trialWins, lastArtId, lastBattleText, visualPulse, dutyDone, caveLevels, caveHeavenStability, caveHeavenStabilityRate, caveHeavenMaintenanceCost, caveHeavenNeedsMaintenance, echoBlessings, pkWins, pkLosses, pkStreak, immortalRealmStage, marketPurchases, seasonClaimed, immortalLineage, mandateProgress, mandateDone, allianceProgress, riftClears, fatePlateLevels, storyClaimed, adminPreviewMode, cavePower, pkRecord, immortalRealmInfo, nextImmortalRealm, immortalRealmPowerBonus, seasonScore, lineageInfo, fatePlatePower, allianceScore, riftScore, storyState, storyProgress, canAscend, ascensionMaterialsReady, ascensionMaterials, ascensionMoneyCost, immortalRank, immortalPower, bodyProfile, officeInfo, triggerAscensionQuest, performAscension, enterImmortalWorld, returnToWorld, chooseOffice, castImmortalArt, challengeTrial, completeDuty, upgradeCaveNode, maintainCaveHeaven, dailyCaveHeavenUpdate, sendMortalEcho, challengeRival, buyImmortalMarket, breakthroughImmortalRealm, claimSeasonReward, chooseLineage, resolveMandate, coordinateAlliance, challengeChaosRift, upgradeImmortalGear, upgradeFatePlate, claimStoryChapter, enterAdminPreview, exitAdminPreview, serialize, deserialize }
})
