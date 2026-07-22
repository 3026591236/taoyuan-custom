import { ref } from "vue";
import { defineStore } from "pinia";
import CryptoJS from "crypto-js";
import { useGameStore } from "./useGameStore";
import { usePlayerStore } from "./usePlayerStore";
import { useInventoryStore } from "./useInventoryStore";
import { useFarmStore } from "./useFarmStore";
import { useSkillStore } from "./useSkillStore";
import { useNpcStore } from "./useNpcStore";
import { useMiningStore } from "./useMiningStore";
import { useCookingStore } from "./useCookingStore";
import { useProcessingStore } from "./useProcessingStore";
import { useAchievementStore } from "./useAchievementStore";
import { useAnimalStore } from "./useAnimalStore";
import { useHomeStore } from "./useHomeStore";
import { useFishingStore } from "./useFishingStore";
import { useWalletStore } from "./useWalletStore";
import { useQuestStore } from "./useQuestStore";
import { useShopStore } from "./useShopStore";
import { useSettingsStore } from "./useSettingsStore";
import { useWarehouseStore } from "./useWarehouseStore";
import { useBreedingStore } from "./useBreedingStore";
import { useMuseumStore } from "./useMuseumStore";
import { useGuildStore } from "./useGuildStore";
import { useSecretNoteStore } from "./useSecretNoteStore";
import { useHanhaiStore } from "./useHanhaiStore";
import { useFishPondStore } from "./useFishPondStore";
import { useAscensionStore } from "./useAscensionStore";
import { useTutorialStore } from "./useTutorialStore";
import { useHiddenNpcStore } from "./useHiddenNpcStore";
import { useCultivationStore } from "./useCultivationStore";
import { useCombatStore } from "./useCombatStore";
import { useRetentionStore } from "./useRetentionStore";
import { useLongTermStore } from "./useLongTermStore";
import { useFloatingWelfareStore } from "./useFloatingWelfareStore";
import { useTerritoryStore } from "./useTerritoryStore";

const SAVE_KEY_PREFIX = "taoyuanxiang_save_";
const MAX_SLOTS = 3;
const ENCRYPTION_KEY = "taoyuanxiang_2024_secret";

/** 加密 JSON 字符串 */
const encrypt = (json: string): string => {
  return CryptoJS.AES.encrypt(json, ENCRYPTION_KEY).toString();
};

/** 解密为 JSON 字符串，失败返回 null */
const decrypt = (cipher: string): string | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, ENCRYPTION_KEY);
    const result = bytes.toString(CryptoJS.enc.Utf8);
    return result || null;
  } catch {
    return null;
  }
};

/** 解密并解析存档数据 */
export const parseSaveData = (raw: string): Record<string, any> | null => {
  const decrypted = decrypt(raw);
  if (!decrypted) return null;
  try {
    return JSON.parse(decrypted) as Record<string, any>;
  } catch {
    return null;
  }
};

export interface SaveSlotInfo {
  slot: number;
  exists: boolean;
  year?: number;
  season?: string;
  day?: number;
  money?: number;
  playerName?: string;
  savedAt?: string;
}

export const useSaveStore = defineStore("save", () => {
  /** 当前活跃存档槽位（-1 表示未分配） */
  const activeSlot = ref(-1);

  /** 获取所有存档槽位信息 */
  const getSlots = (): SaveSlotInfo[] => {
    const slots: SaveSlotInfo[] = [];
    for (let i = 0; i < MAX_SLOTS; i++) {
      try {
        const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${i}`);
        if (raw) {
          const data = parseSaveData(raw);
          if (data) {
            slots.push({
              slot: i,
              exists: true,
              year: data.game?.year,
              season: data.game?.season,
              day: data.game?.day,
              money: data.player?.money,
              playerName: data.player?.playerName,
              savedAt: data.savedAt,
            });
          } else {
            slots.push({ slot: i, exists: false });
          }
        } else {
          slots.push({ slot: i, exists: false });
        }
      } catch {
        slots.push({ slot: i, exists: false });
      }
    }
    return slots;
  };

  /** 为新游戏分配一个空闲槽位，无空闲则返回 -1 */
  const assignNewSlot = (): number => {
    const slots = getSlots();
    const empty = slots.find((s) => !s.exists);
    const slot = empty ? empty.slot : -1;
    activeSlot.value = slot;
    return slot;
  };

  /** 保存到指定槽位 */
  const saveToSlot = (slot: number): boolean => {
    if (slot < 0 || slot >= MAX_SLOTS) return false;
    try {
      const gameStore = useGameStore();
      const playerStore = usePlayerStore();
      const inventoryStore = useInventoryStore();
      const farmStore = useFarmStore();
      const skillStore = useSkillStore();
      const npcStore = useNpcStore();
      const miningStore = useMiningStore();
      const cookingStore = useCookingStore();
      const processingStore = useProcessingStore();
      const achievementStore = useAchievementStore();
      const animalStore = useAnimalStore();
      const homeStore = useHomeStore();
      const fishingStore = useFishingStore();
      const walletStore = useWalletStore();
      const questStore = useQuestStore();
      const shopStore = useShopStore();
      const settingsStore = useSettingsStore();
      const warehouseStore = useWarehouseStore();
      const breedingStore = useBreedingStore();
      const museumStore = useMuseumStore();
      const guildStore = useGuildStore();
      const secretNoteStore = useSecretNoteStore();
      const hanhaiStore = useHanhaiStore();
      const fishPondStore = useFishPondStore();
      const ascensionStore = useAscensionStore();
      const tutorialStore = useTutorialStore();
      const hiddenNpcStore = useHiddenNpcStore();
      const cultivationStore = useCultivationStore();
      const combatStore = useCombatStore();
      const retentionStore = useRetentionStore();
      const longTermStore = useLongTermStore();
      const floatingWelfareStore = useFloatingWelfareStore();
      const territoryStore = useTerritoryStore();

      const data = {
        game: gameStore.serialize(),
        player: playerStore.serialize(),
        inventory: inventoryStore.serialize(),
        farm: farmStore.serialize(),
        skill: skillStore.serialize(),
        npc: npcStore.serialize(),
        mining: miningStore.serialize(),
        cooking: cookingStore.serialize(),
        processing: processingStore.serialize(),
        achievement: achievementStore.serialize(),
        animal: animalStore.serialize(),
        home: homeStore.serialize(),
        fishing: fishingStore.serialize(),
        wallet: walletStore.serialize(),
        quest: questStore.serialize(),
        shop: shopStore.serialize(),
        settings: settingsStore.serialize(),
        warehouse: warehouseStore.serialize(),
        breeding: breedingStore.serialize(),
        museum: museumStore.serialize(),
        guild: guildStore.serialize(),
        secretNote: secretNoteStore.serialize(),
        hanhai: hanhaiStore.serialize(),
        fishPond: fishPondStore.serialize(),
        ascension: ascensionStore.serialize(),
        tutorial: tutorialStore.serialize(),
        hiddenNpc: hiddenNpcStore.serialize(),
        cultivation: cultivationStore.serialize(),
        combat: combatStore.serialize(),
        retention: retentionStore.serialize(),
        longTerm: longTermStore.serialize(),
        floatingWelfare: floatingWelfareStore.serialize(),
        territory: territoryStore.serialize(),
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(
        `${SAVE_KEY_PREFIX}${slot}`,
        encrypt(JSON.stringify(data)),
      );
      activeSlot.value = slot;
      return true;
    } catch {
      return false;
    }
  };

  /** 自动存档到当前活跃槽位 */
  const autoSave = (): boolean => {
    if (activeSlot.value < 0) return false;
    return saveToSlot(activeSlot.value);
  };

  /** 从指定槽位加载 */
  const loadFromSlot = (slot: number): boolean => {
    try {
      const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${slot}`);
      if (!raw) return false;

      const data = parseSaveData(raw);
      if (!data) return false;
      const gameStore = useGameStore();
      const playerStore = usePlayerStore();
      const inventoryStore = useInventoryStore();
      const farmStore = useFarmStore();
      const skillStore = useSkillStore();
      const npcStore = useNpcStore();
      const miningStore = useMiningStore();
      const cookingStore = useCookingStore();
      const processingStore = useProcessingStore();
      const achievementStore = useAchievementStore();
      const animalStore = useAnimalStore();
      const homeStore = useHomeStore();
      const fishingStore = useFishingStore();
      const walletStore = useWalletStore();
      const questStore = useQuestStore();
      const shopStore = useShopStore();
      const settingsStore = useSettingsStore();
      const warehouseStore = useWarehouseStore();
      const breedingStore = useBreedingStore();
      const museumStore = useMuseumStore();
      const guildStore = useGuildStore();
      const secretNoteStore = useSecretNoteStore();
      const hanhaiStore = useHanhaiStore();
      const fishPondStore = useFishPondStore();
      const ascensionStore = useAscensionStore();
      const tutorialStore = useTutorialStore();
      const hiddenNpcStore = useHiddenNpcStore();
      const cultivationStore = useCultivationStore();
      const combatStore = useCombatStore();
      const retentionStore = useRetentionStore();
      const longTermStore = useLongTermStore();
      const floatingWelfareStore = useFloatingWelfareStore();
      const territoryStore = useTerritoryStore();

      gameStore.deserialize(data.game);
      playerStore.deserialize(data.player);
      inventoryStore.deserialize(data.inventory);
      farmStore.deserialize(data.farm);
      if (data.skill) skillStore.deserialize(data.skill);
      if (data.npc) npcStore.deserialize(data.npc);
      if (data.mining) miningStore.deserialize(data.mining);
      if (data.cooking) cookingStore.deserialize(data.cooking);
      if (data.processing) processingStore.deserialize(data.processing);
      if (data.achievement) achievementStore.deserialize(data.achievement);
      if (data.animal) animalStore.deserialize(data.animal);
      if (data.home) homeStore.deserialize(data.home);
      if (data.fishing) fishingStore.deserialize(data.fishing);
      if (data.wallet) walletStore.deserialize(data.wallet);
      if (data.quest) questStore.deserialize(data.quest);
      if (data.shop) shopStore.deserialize(data.shop);
      if (data.settings) settingsStore.deserialize(data.settings);
      if (data.warehouse) warehouseStore.deserialize(data.warehouse);
      if (data.breeding) breedingStore.deserialize(data.breeding);
      if (data.museum) museumStore.deserialize(data.museum);
      if (data.guild) guildStore.deserialize(data.guild);
      if (data.secretNote) secretNoteStore.deserialize(data.secretNote);
      if (data.fishPond) fishPondStore.deserialize(data.fishPond);
      ascensionStore.deserialize((data as any).ascension ?? {});
      if (data.tutorial) tutorialStore.deserialize(data.tutorial);
      if (data.hiddenNpc) hiddenNpcStore.deserialize(data.hiddenNpc);
      if (data.cultivation) cultivationStore.deserialize(data.cultivation);
      if (data.combat) combatStore.deserialize(data.combat);
      if (data.retention) retentionStore.deserialize(data.retention);
      if (data.longTerm) longTermStore.deserialize(data.longTerm);
      if ((data as any).floatingWelfare)
        floatingWelfareStore.deserialize((data as any).floatingWelfare);
      if ((data as any).territory)
        territoryStore.deserialize((data as any).territory);
      if (data.hanhai) hanhaiStore.deserialize(data.hanhai);
      longTermStore.touchLoginDay();
      activeSlot.value = slot;
      return true;
    } catch {
      return false;
    }
  };

  /** 删除指定槽位 */
  const deleteSlot = (slot: number): boolean => {
    if (slot < 0 || slot >= MAX_SLOTS) return false;
    localStorage.removeItem(`${SAVE_KEY_PREFIX}${slot}`);
    if (activeSlot.value === slot) activeSlot.value = -1;
    return true;
  };

  /** 本地文件导出已禁用，防止绕过账号云存档审计。 */
  const exportSave = (_slot: number): boolean => false;

  /**
   * 内部恢复存档：仅供账号云存档/WebDAV 下载写入本地槽位使用。
   * 文件导入入口已从 UI 移除，避免玩家手动导入本地篡改存档。
   */
  const importSave = (slot: number, fileContent: string): boolean => {
    if (slot < 0 || slot >= MAX_SLOTS) return false;
    try {
      const data = parseSaveData(fileContent);
      if (!data) return false;
      localStorage.setItem(`${SAVE_KEY_PREFIX}${slot}`, fileContent);
      return true;
    } catch {
      return false;
    }
  };

  return {
    activeSlot,
    getSlots,
    assignNewSlot,
    saveToSlot,
    autoSave,
    loadFromSlot,
    deleteSlot,
    exportSave,
    importSave,
  };
});
