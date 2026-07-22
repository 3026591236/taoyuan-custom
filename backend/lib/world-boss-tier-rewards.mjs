export const WORLD_BOSS_TIER_ROUTES = Object.freeze({
  YAOCHAO_DAILY: "yaochao_daily",
  LONG_TERM: "world_boss_long_term",
});

export const WORLD_BOSS_TIER_TABLES = Object.freeze({
  [WORLD_BOSS_TIER_ROUTES.YAOCHAO_DAILY]: Object.freeze([
    { id: "kills-5", score: 5, title: "个人讨伐·初阵", rewards: { money: 500, spiritStone: 3, attributeExp: { strength: 12 } } },
    { id: "kills-15", score: 15, title: "个人讨伐·破阵", rewards: { money: 1100, aura: 120, spiritStone: 6, attributeExp: { strength: 18, agility: 18 } } },
    { id: "kills-30", score: 30, title: "个人讨伐·镇潮", rewards: { money: 2200, aura: 260, spiritStone: 12, attributeExp: { physique: 22, strength: 28, agility: 22 } } },
  ]),
  [WORLD_BOSS_TIER_ROUTES.LONG_TERM]: Object.freeze([
    { id: "contribution-20", score: 20, title: "镇魔先锋", rewards: { money: 1200, spiritStone: 6, aura: 180 } },
    { id: "contribution-60", score: 60, title: "伏魔主力", rewards: { money: 2600, spiritStone: 14, aura: 420, items: [{ itemId: "demon_core", name: "妖丹", quantity: 1 }] } },
    { id: "contribution-120", score: 120, title: "镇魔功臣", rewards: { money: 5200, spiritStone: 26, aura: 900, items: [{ itemId: "soul_crystal", name: "魂晶", quantity: 2 }, { itemId: "thunder_essence", name: "雷精", quantity: 1 }] } },
  ]),
});

const integer = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
};

function authoritativeRewards(serverRewardContext, route, tier) {
  const rewards = structuredClone(tier.rewards);
  if (route === WORLD_BOSS_TIER_ROUTES.LONG_TERM) {
    const level = integer(serverRewardContext?.spiritArrayLevel) || 1;
    const multiplier = 1 + Math.min(0.2, Math.max(0, level - 1) * 0.02);
    if (rewards.aura) rewards.aura = Math.floor(rewards.aura * multiplier);
    if (rewards.cultivation) rewards.cultivation = Math.floor(rewards.cultivation * multiplier);
  }
  return rewards;
}

/** Qualification accepts only a locked contribution-ledger row and server cycle. */
export function resolveWorldBossTierClaim({ route, tierId, cycleKey, contributionRow, serverRewardContext = {} }) {
  const table = WORLD_BOSS_TIER_TABLES[route];
  if (!table) return { kind: "invalid_route" };
  const tier = table.find((candidate) => candidate.id === tierId);
  if (!tier) return { kind: "invalid_tier" };
  if (!cycleKey) return { kind: "invalid_cycle" };
  const contribution = integer(contributionRow?.contribution);
  if (String(contributionRow?.route || "") !== route || String(contributionRow?.cycle_key || contributionRow?.cycleKey || "") !== cycleKey)
    return { kind: "not_eligible", contribution: 0, required: tier.score, cycleKey, tier };
  if (contribution < tier.score)
    return { kind: "not_eligible", contribution, required: tier.score, cycleKey, tier };
  return {
    kind: "eligible", contribution, cycleKey, tier,
    rewards: authoritativeRewards(serverRewardContext, route, tier),
    sourceId: `${route}:${cycleKey}:${tier.id}`,
  };
}
