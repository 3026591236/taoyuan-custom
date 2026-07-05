import { useInventoryStore } from '@/stores/useInventoryStore'
import { useWarehouseStore } from '@/stores/useWarehouseStore'
import type { Quality } from '@/types'

const QUALITY_CONSUME_ORDER: Quality[] = ['normal', 'fine', 'excellent', 'supreme']

/** 合计背包 + 仓库所有箱子中某物品数量 */
export const getCombinedItemCount = (itemId: string, quality?: Quality): number => {
  const inv = useInventoryStore()
  const wh = useWarehouseStore()
  let total = inv.getItemCount(itemId, quality)
  if (wh.unlocked) {
    for (const chest of wh.chests) {
      total += wh.getChestItemCount(chest.id, itemId, quality)
    }
  }
  return total
}

/** 背包+仓库所有箱子是否合计拥有足够数量 */
export const hasCombinedItem = (itemId: string, quantity: number = 1): boolean => getCombinedItemCount(itemId) >= quantity

/** 优先从背包消耗，不足部分从仓库箱子消耗（虚空原料箱优先） */
export const removeCombinedItem = (itemId: string, quantity: number = 1, quality?: Quality): boolean => {
  const inv = useInventoryStore()
  const wh = useWarehouseStore()

  if (getCombinedItemCount(itemId, quality) < quantity) return false

  let remaining = quantity
  const qualities = quality !== undefined ? [quality] : QUALITY_CONSUME_ORDER
  for (const q of qualities) {
    if (remaining <= 0) break

    const fromInv = Math.min(remaining, inv.getItemCount(itemId, q))
    if (fromInv > 0) {
      if (!inv.removeItem(itemId, fromInv, q)) return false
      remaining -= fromInv
    }

    if (remaining <= 0 || !wh.unlocked) continue
    const voidInput = wh.getVoidInputChest()
    const ordered = voidInput ? [voidInput, ...wh.chests.filter(c => c.id !== voidInput.id)] : [...wh.chests]
    for (const chest of ordered) {
      if (remaining <= 0) break
      const count = wh.getChestItemCount(chest.id, itemId, q)
      if (count <= 0) continue
      const take = Math.min(remaining, count)
      if (!wh.removeItemFromChest(chest.id, itemId, take, q)) return false
      remaining -= take
    }
  }

  return remaining <= 0
}

/** 查找背包+仓库所有箱子中某物品的最低品质 */
export const getLowestCombinedQuality = (itemId: string): Quality => {
  const inv = useInventoryStore()
  const wh = useWarehouseStore()
  const order = QUALITY_CONSUME_ORDER
  for (const q of order) {
    if (inv.getItemCount(itemId, q) > 0) return q
    if (wh.unlocked) {
      for (const chest of wh.chests) {
        if (wh.getChestItemCount(chest.id, itemId, q) > 0) return q
      }
    }
  }
  return 'normal'
}
