import { ref } from "vue";
import { defineStore } from "pinia";

export const useFloatingWelfareStore = defineStore("floatingWelfare", () => {
  const claimedKeys = ref<string[]>([]);
  const firstSeenDate = ref("");

  const isClaimed = (key: string): boolean => claimedKeys.value.includes(key);
  const markClaimed = (key: string) => {
    if (!key || claimedKeys.value.includes(key)) return;
    claimedKeys.value.push(key);
  };

  const ensureFirstSeenDate = (dateKey: string) => {
    if (!firstSeenDate.value) firstSeenDate.value = dateKey;
    return firstSeenDate.value;
  };

  const serialize = () => ({
    claimedKeys: claimedKeys.value,
    firstSeenDate: firstSeenDate.value,
  });
  const deserialize = (data?: {
    claimedKeys?: string[];
    firstSeenDate?: string;
  }) => {
    claimedKeys.value = Array.isArray(data?.claimedKeys)
      ? data!.claimedKeys!.map(String).filter(Boolean)
      : [];
    firstSeenDate.value = String(data?.firstSeenDate || "");
  };

  return {
    claimedKeys,
    firstSeenDate,
    ensureFirstSeenDate,
    isClaimed,
    markClaimed,
    serialize,
    deserialize,
  };
});
