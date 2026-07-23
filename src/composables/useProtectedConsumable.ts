import { useSaveStore } from "@/stores/useSaveStore";
import { useGameClock } from "./useGameClock";
import { addLog } from "./useGameLog";
import { saveClientIdentity } from "@/services/saveClientIdentity";

export const PROTECTED_CONSUMABLE_IDS = new Set([
  "guild_badge", "life_talisman", "lucky_coin", "defense_charm",
  "marrow_wash_pill", "stamina_fruit", "stamina_pill",
  "time_stasis_pill", "ganoderma_pill",
]);

const pending = new Map<string, Promise<boolean>>();
const CONSUMABLE_NAMES: Record<string, string> = {
  guild_badge: "仙盟战印",
  life_talisman: "护命符",
  lucky_coin: "福缘钱",
  defense_charm: "护身符",
  marrow_wash_pill: "洗髓丹",
  stamina_fruit: "仙桃",
  stamina_pill: "体力丹",
  time_stasis_pill: "时间禁锢丹",
  ganoderma_pill: "灵芝培元丹",
};
const randomKey = () =>
  `${Date.now().toString(36)}-${crypto.randomUUID().replace(/-/g, "")}`;

/**
 * Settle a protected use against the locked authoritative cloud save, then
 * replace all local stores from the returned complete save in one synchronous
 * load. Failure and offline paths never mutate local state.
 */
export const useProtectedConsumable = () => {
  const saveStore = useSaveStore();

  const consumeProtected = async (
    itemId: string,
    quantity = 1,
    idempotencyKey = randomKey(),
  ): Promise<boolean> => {
    if (!PROTECTED_CONSUMABLE_IDS.has(itemId)) return false;
    const slot = saveStore.activeSlot;
    if (!Number.isInteger(slot) || slot < 0) {
      addLog("当前没有已绑定的账号云存档，无法使用此受保护道具。");
      return false;
    }
    const token = localStorage.getItem("taoyuan_account_token") || "";
    if (!token || !navigator.onLine) {
      addLog("受保护道具必须联网使用；离线期间不会扣除、不会排队。");
      return false;
    }
    const initialExpectedVersion = localStorage.getItem(`taoyuan_cloud_loaded_at_${slot}`) || "";
    if (!initialExpectedVersion) {
      addLog("请先重新加载账号云存档，再使用此受保护道具。");
      return false;
    }
    const requestKey = `${slot}:${itemId}:${idempotencyKey}`;
    const existing = pending.get(requestKey);
    if (existing) return existing;
    const authoritySequence = saveClientIdentity.nextSequence();
    const task = (async () => {
      try {
        let result: any = null;
        // 状态变化可能刚触发本页面实时写档。若权威消费恰好撞上该请求，
        // 等待实时写档回写最新版本后用同一幂等键重试；真正的外部更新仍会失败。
        for (let attempt = 0; attempt < 5; attempt++) {
          const expectedVersion =
            localStorage.getItem(`taoyuan_cloud_loaded_at_${slot}`) ||
            initialExpectedVersion;
          const response = await fetch(`/api/saves/${slot}/consume-protected`, {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
            body: JSON.stringify({
              itemId,
              quantity,
              idempotencyKey,
              expectedVersion,
              pageId: saveClientIdentity.pageId,
              sequence: authoritySequence,
            }),
          });
          result = await response.json().catch(() => ({}));
          if (response.ok) break;
          if (result?.code !== "SAVE_CONFLICT" || attempt === 4)
            throw new Error(result.error || "权威消费失败");
          await new Promise((resolve) => window.setTimeout(resolve, 250));
        }
        if (Number(result?.slot) !== slot || saveStore.activeSlot !== slot || typeof result?.raw !== "string")
          throw new Error("服务器返回的角色槽位不一致");
        const versionKey = `taoyuan_cloud_loaded_at_${slot}`;
        const pendingKey = `taoyuan_pending_server_save_${slot}`;
        const previousVersion = localStorage.getItem(versionKey);
        const previousPending = localStorage.getItem(pendingKey);
        localStorage.setItem(versionKey, String(result.updatedAt));
        localStorage.removeItem(pendingKey);
        saveClientIdentity.restoreSequence(result.serverSequence);
        if (!saveStore.importSave(slot, result.raw) || !saveStore.loadFromSlot(slot)) {
          if (previousVersion == null) localStorage.removeItem(versionKey);
          else localStorage.setItem(versionKey, previousVersion);
          if (previousPending == null) localStorage.removeItem(pendingKey);
          else localStorage.setItem(pendingKey, previousPending);
          throw new Error("服务器状态加载失败，请重新进入游戏");
        }
        const freezeUntil = Number(result.data?.player?.timeStasisPillFreezeUntil || 0);
        if (Number.isSafeInteger(freezeUntil) && freezeUntil > 0) {
          const clock = useGameClock();
          clock.timeFreezeUntil.value = freezeUntil;
          localStorage.setItem("taoyuan_time_freeze_until", String(freezeUntil));
        }
        const name = CONSUMABLE_NAMES[itemId] || itemId;
        addLog(`服务器已结算${name}×${quantity}${result.idempotent ? "（重复请求已幂等返回）" : ""}。`);
        return true;
      } catch (error: any) {
        addLog(error?.message || "受保护道具使用失败，本地状态未改变。");
        return false;
      } finally {
        pending.delete(requestKey);
      }
    })();
    pending.set(requestKey, task);
    return task;
  };
  return { consumeProtected };
};
