import type { Quality } from "@/types";
import { getItemById } from "@/data";
import { useAchievementStore } from "@/stores/useAchievementStore";
import { useInventoryStore } from "@/stores/useInventoryStore";
import { useQuestStore } from "@/stores/useQuestStore";
import { useSkillStore } from "@/stores/useSkillStore";

export interface ForageSettlementRequest {
  itemId: string;
  quantity?: number;
  quality?: Quality;
  forageExp?: number;
}

export interface ForageSettlementResult extends Required<Omit<ForageSettlementRequest, "forageExp">> {
  accepted: boolean;
  name: string;
  forageExp: number;
  leveledUp: boolean;
  newLevel: number;
}

export interface ForageBatchSettlementResult {
  accepted: boolean;
  rewards: ForageSettlementResult[];
  leveledUp: boolean;
  newLevel: number;
}

const MAX_STACK = 999;
const TEMP_CAPACITY = 10;

/** Records progression only after the complete reward has entered inventory. */
export const useForageSettlement = () => {
  const inventory = useInventoryStore();
  const achievement = useAchievementStore();
  const quest = useQuestStore();
  const skill = useSkillStore();

  const normalize = (request: ForageSettlementRequest): ForageSettlementResult => ({
    accepted: false,
    itemId: request.itemId,
    quantity: Math.max(1, request.quantity ?? 1),
    quality: request.quality ?? "normal",
    name: getItemById(request.itemId)?.name ?? request.itemId,
    forageExp: Math.max(0, Math.floor(request.forageExp ?? 0)),
    leveledUp: false,
    newLevel: skill.getSkill("foraging").level,
  });

  const recordAccepted = (reward: ForageSettlementResult): ForageSettlementResult => {
    achievement.discoverItem(reward.itemId);
    quest.onItemObtained(reward.itemId, reward.quantity);
    const levelResult = reward.forageExp > 0
      ? skill.addExp("foraging", reward.forageExp)
      : { leveledUp: false, newLevel: skill.getSkill("foraging").level };
    return { ...reward, accepted: true, ...levelResult };
  };

  const canAcceptBatch = (rewards: ForageSettlementResult[]): boolean => {
    if (rewards.some((reward) => !getItemById(reward.itemId))) return false;
    const slots = [...inventory.items, ...inventory.tempItems].map((slot) => ({
      itemId: slot.itemId,
      quality: slot.quality,
      quantity: slot.quantity,
    }));
    let freeSlots =
      inventory.capacity - inventory.items.length +
      (TEMP_CAPACITY - inventory.tempItems.length);

    for (const reward of rewards) {
      let remaining = reward.quantity;
      for (const slot of slots) {
        if (
          slot.itemId === reward.itemId &&
          slot.quality === reward.quality &&
          slot.quantity < MAX_STACK
        ) {
          const added = Math.min(remaining, MAX_STACK - slot.quantity);
          slot.quantity += added;
          remaining -= added;
          if (remaining <= 0) break;
        }
      }
      while (remaining > 0 && freeSlots > 0) {
        const added = Math.min(remaining, MAX_STACK);
        slots.push({ itemId: reward.itemId, quality: reward.quality, quantity: added });
        remaining -= added;
        freeSlots--;
      }
      if (remaining > 0) return false;
    }
    return true;
  };

  const settle = (request: ForageSettlementRequest): ForageSettlementResult => {
    const reward = normalize(request);
    if (!inventory.canAcceptItem(reward.itemId, reward.quantity, reward.quality)) return reward;
    if (!inventory.addItem(reward.itemId, reward.quantity, reward.quality)) return reward;
    return recordAccepted(reward);
  };

  const settleBatch = (requests: ForageSettlementRequest[]): ForageBatchSettlementResult => {
    const rewards = requests.map(normalize);
    const currentLevel = skill.getSkill("foraging").level;
    if (!canAcceptBatch(rewards)) {
      return { accepted: false, rewards, leveledUp: false, newLevel: currentLevel };
    }

    for (const reward of rewards) {
      if (!inventory.addItem(reward.itemId, reward.quantity, reward.quality)) {
        throw new Error("Forage batch capacity changed after preflight");
      }
    }

    let leveledUp = false;
    let newLevel = currentLevel;
    const acceptedRewards = rewards.map((reward) => {
      const accepted = recordAccepted(reward);
      leveledUp ||= accepted.leveledUp;
      newLevel = accepted.newLevel;
      return accepted;
    });
    return { accepted: true, rewards: acceptedRewards, leveledUp, newLevel };
  };

  return { settle, settleBatch };
};
