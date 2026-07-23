const finiteInt = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

const store = (data, name) =>
  data?.[name] || data?.[`${name}Store`] || data?.stores?.[name] || {};

function inventoryCounts(data) {
  const inventory = store(data, "inventory");
  const result = new Map();
  for (const collection of [
    inventory.items || inventory.inventory || inventory.bag || [],
    inventory.tempItems || [],
  ]) {
    if (Array.isArray(collection)) {
      for (const item of collection) {
        if (!item?.itemId) continue;
        const key = `${String(item.itemId)}\u0000${String(item.quality || "normal")}`;
        result.set(key, (result.get(key) || 0) + finiteInt(item.quantity));
      }
    } else if (collection && typeof collection === "object") {
      for (const [itemId, value] of Object.entries(collection)) {
        const quantity = finiteInt(value?.quantity ?? value);
        const quality = String(value?.quality || "normal");
        const key = `${itemId}\u0000${quality}`;
        result.set(key, (result.get(key) || 0) + quantity);
      }
    }
  }
  return result;
}

const ATTRIBUTE_KEYS = ["physique", "strength", "agility", "perception"];
const ATTRIBUTE_BASE_LEVEL = 1;
const ATTRIBUTE_MAX_LEVEL = 60;
const ATTRIBUTE_EXP_BASE = 36;
const ATTRIBUTE_EXP_STEP = 12;

function rewardVector(rewards = {}) {
  const items = new Map();
  const addItem = (itemId, quantity, quality = "normal") => {
    const qty = Math.max(0, finiteInt(quantity));
    if (!itemId || !qty) return;
    const key = `${String(itemId)}\u0000${String(quality || "normal")}`;
    items.set(key, (items.get(key) || 0) + qty);
  };
  addItem("spirit_stone", rewards.spiritStone ?? rewards.spirit_stone);
  for (const item of rewards.items || [])
    addItem(item?.itemId, item?.quantity, item?.quality);
  const attributeExp = {};
  for (const key of ATTRIBUTE_KEYS)
    attributeExp[key] = Math.max(0, finiteInt(rewards.attributeExp?.[key]));
  return {
    money: Math.max(0, finiteInt(rewards.money)),
    stamina: Math.max(0, finiteInt(rewards.stamina)),
    cultivation: Math.max(0, finiteInt(rewards.cultivation)),
    aura: Math.max(0, finiteInt(rewards.aura)),
    mana: Math.max(0, finiteInt(rewards.mana)),
    attributeExp,
    items,
  };
}

function addVectors(target, source) {
  for (const key of ["money", "stamina", "cultivation", "aura", "mana"])
    target[key] += source[key];
  for (const key of ATTRIBUTE_KEYS)
    target.attributeExp[key] += source.attributeExp[key];
  for (const [key, quantity] of source.items)
    target.items.set(key, (target.items.get(key) || 0) + quantity);
  return target;
}

function normalizedAttributeState(player, key) {
  const state = player?.attributes?.[key] || {};
  return {
    level: Math.min(
      ATTRIBUTE_MAX_LEVEL,
      Math.max(ATTRIBUTE_BASE_LEVEL, finiteInt(state.level) || ATTRIBUTE_BASE_LEVEL),
    ),
    exp: Math.max(0, finiteInt(state.exp)),
  };
}

function applyAttributeExp(state, amount) {
  const next = { ...state };
  if (next.level >= ATTRIBUTE_MAX_LEVEL || amount <= 0) return next;
  next.exp += amount;
  while (next.level < ATTRIBUTE_MAX_LEVEL) {
    const required =
      ATTRIBUTE_EXP_BASE + (next.level - ATTRIBUTE_BASE_LEVEL) * ATTRIBUTE_EXP_STEP;
    if (next.exp < required) break;
    next.exp -= required;
    next.level++;
  }
  if (next.level >= ATTRIBUTE_MAX_LEVEL) next.exp = 0;
  return next;
}

const REALM_MAX_CULTIVATION = [
  100, 220, 420, 760, 1200, 1800, 2600, 3700, 5200, 7200, 11000,
  16000, 24000, 40000, 65000, 100000, 160000, 250000, 400000, 650000,
  1000000, 1600000, 2600000, 4200000, 6800000, 11000000, 18000000,
  30000000,
];

const REALM_MAX_MANA = [
  30, 45, 65, 90, 120, 155, 195, 240, 290, 350, 460, 580, 720, 1000,
  1400, 2000, 2800, 3800, 5200, 7200, 10000, 14000, 20000, 28000,
  40000, 58000, 82000, 120000,
];

function saveDelta(previousData, nextData) {
  const previousPlayer = store(previousData, "player");
  const nextPlayer = store(nextData, "player");
  const previousCultivation = store(previousData, "cultivation");
  const nextCultivation = store(nextData, "cultivation");
  const previousItems = inventoryCounts(previousData);
  const nextItems = inventoryCounts(nextData);
  const itemKeys = new Set([...previousItems.keys(), ...nextItems.keys()]);
  const items = new Map();
  for (const key of itemKeys)
    items.set(key, (nextItems.get(key) || 0) - (previousItems.get(key) || 0));
  const previousAttributes = {};
  const nextAttributes = {};
  for (const key of ATTRIBUTE_KEYS) {
    previousAttributes[key] = normalizedAttributeState(previousPlayer, key);
    nextAttributes[key] = normalizedAttributeState(nextPlayer, key);
  }
  return {
    money: finiteInt(nextPlayer.money) - finiteInt(previousPlayer.money),
    stamina: finiteInt(nextPlayer.stamina) - finiteInt(previousPlayer.stamina),
    // The cap is authority data from the locked previous save; accepting a cap
    // supplied only by the candidate save would let it enlarge the grant.
    maxStamina: finiteInt(previousPlayer.maxStamina),
    previousStamina: finiteInt(previousPlayer.stamina),
    cultivation:
      finiteInt(nextCultivation.cultivation) -
      finiteInt(previousCultivation.cultivation),
    previousCultivation: finiteInt(previousCultivation.cultivation),
    maxCultivation:
      REALM_MAX_CULTIVATION[Math.max(0, finiteInt(previousCultivation.realmIndex))] || 100,
    aura: finiteInt(nextCultivation.aura) - finiteInt(previousCultivation.aura),
    mana: finiteInt(nextCultivation.mana) - finiteInt(previousCultivation.mana),
    maxMana:
      (REALM_MAX_MANA[Math.max(0, finiteInt(previousCultivation.realmIndex))] || 30) +
      Math.max(0, finiteInt(previousCultivation.fieldTier)) * 10 +
      Math.max(0, finiteInt(previousCultivation.yuanShenLevel)) * 2,
    previousMana: finiteInt(previousCultivation.mana),
    previousAttributes,
    nextAttributes,
    items,
  };
}

function vectorMatches(delta, reward) {
  if (delta.money !== reward.money) return false;
  // Cultivation rewards stop at the trusted realm cap. Any overflow is
  // converted to aura so the reward is neither lost nor able to enlarge the
  // cap through client-supplied candidate data.
  const cultivationRoom = Math.max(
    0,
    delta.maxCultivation - delta.previousCultivation,
  );
  const expectedCultivation = Math.min(reward.cultivation, cultivationRoom);
  const cultivationOverflow = reward.cultivation - expectedCultivation;
  if (delta.cultivation !== expectedCultivation) return false;
  if (delta.aura !== reward.aura + cultivationOverflow) return false;

  // The current client caps stamina and mana. Their caps can be derived from
  // the serialized trusted baseline, so both deltas remain exact.
  const expectedStamina = Math.max(
    0,
    Math.min(reward.stamina, delta.maxStamina - delta.previousStamina),
  );
  if (delta.stamina !== expectedStamina) return false;
  const expectedMana = Math.max(
    0,
    Math.min(reward.mana, delta.maxMana - delta.previousMana),
  );
  if (delta.mana !== expectedMana) return false;

  for (const key of ATTRIBUTE_KEYS) {
    const expected = applyAttributeExp(
      delta.previousAttributes[key],
      reward.attributeExp[key],
    );
    const actual = delta.nextAttributes[key];
    if (actual.level !== expected.level || actual.exp !== expected.exp) return false;
  }

  const itemKeys = new Set([...delta.items.keys(), ...reward.items.keys()]);
  for (const key of itemKeys) {
    if ((delta.items.get(key) || 0) !== (reward.items.get(key) || 0))
      return false;
  }
  return true;
}

function progressionAuthorization(delta) {
  const spiritStoneKey = "spirit_stone\u0000normal";
  return {
    money: Math.max(0, delta.money),
    cultivation: Math.max(0, delta.cultivation),
    aura: Math.max(0, delta.aura),
    spiritStone: Math.max(0, delta.items.get(spiritStoneKey) || 0),
  };
}

function hasProtectedPositiveDelta(delta, grants) {
  const protectedItems = new Set();
  const protectedItemIds = new Set();
  const protectedFields = new Set();
  for (const grant of grants) {
    const vector = rewardVector(grant.rewards);
    for (const field of ["money", "stamina", "cultivation", "aura", "mana"])
      if (vector[field] > 0) protectedFields.add(field);
    for (const key of ATTRIBUTE_KEYS)
      if (vector.attributeExp[key] > 0) protectedFields.add(`attribute:${key}`);
    for (const key of vector.items.keys()) {
      protectedItems.add(key);
      protectedItemIds.add(key.split("\u0000")[0]);
    }
  }
  // While a grant is pending, any movement in a rewarded asset must either be
  // the exact authorized delta or be rejected. This also prevents spending an
  // unpersisted reward and then replaying the still-issued grant.
  for (const field of protectedFields) {
    if (field.startsWith("attribute:")) {
      const key = field.slice("attribute:".length);
      const before = delta.previousAttributes[key];
      const after = delta.nextAttributes[key];
      if (before.level !== after.level || before.exp !== after.exp) return true;
    } else if (delta[field] !== 0) return true;
  }
  for (const key of protectedItems) if ((delta.items.get(key) || 0) !== 0) return true;
  // A different quality is a different stack on the client, but not a valid
  // substitute for the issued item. Reject same-item quality swaps explicitly.
  for (const [key, quantity] of delta.items)
    if (quantity !== 0 && protectedItemIds.has(key.split("\u0000")[0])) return true;
  return false;
}

/**
 * Find one exact subset of issued grants represented by this save delta.
 * A bounded exhaustive search handles the realistic small pending set; beyond
 * that, all pending grants must be applied together to avoid exponential work.
 */
export function matchIssuedMailGrants(previousData, nextData, grants) {
  const normalized = grants
    .filter((grant) => grant?.id && grant?.rewards)
    .slice(0, 64);
  if (!normalized.length)
    return { matchedIds: [], mismatch: false, authorizedDelta: null };
  const delta = saveDelta(previousData, nextData);
  const vectors = normalized.map((grant) => rewardVector(grant.rewards));
  const empty = rewardVector({});
  let matchedIds = null;

  if (normalized.length <= 16) {
    const visit = (index, selected, aggregate) => {
      if (matchedIds) return;
      if (index === normalized.length) {
        if (selected.length && vectorMatches(delta, aggregate))
          matchedIds = selected.map((i) => normalized[i].id);
        return;
      }
      visit(index + 1, selected, aggregate);
      if (matchedIds) return;
      const included = {
        ...aggregate,
        attributeExp: { ...aggregate.attributeExp },
        items: new Map(aggregate.items),
      };
      addVectors(included, vectors[index]);
      visit(index + 1, [...selected, index], included);
    };
    visit(0, [], empty);
  } else {
    const aggregate = vectors.reduce(
      (sum, vector) => addVectors(sum, vector),
      empty,
    );
    if (vectorMatches(delta, aggregate))
      matchedIds = normalized.map((grant) => grant.id);
  }

  if (matchedIds)
    return {
      matchedIds,
      mismatch: false,
      // This vector comes from the exact observed delta, but is returned only
      // after one subset of issued grants matches every protected asset. The
      // save progression guard may whitelist these fields without trusting the
      // client or the nominal (possibly capped) reward payload.
      authorizedDelta: progressionAuthorization(delta),
    };
  return {
    matchedIds: [],
    mismatch: hasProtectedPositiveDelta(delta, normalized),
    authorizedDelta: null,
  };
}

export function parseGrantRows(rows, parseJson) {
  return rows.map((row) => ({
    id: row.id,
    rewards: parseJson(row.rewards_json, {}),
  }));
}

export function resolveMailClaimCharacter(bindings, rawSlot) {
  const slotProvided = rawSlot !== undefined && rawSlot !== null && rawSlot !== "";
  if (slotProvided) {
    const slot = Number(rawSlot);
    if (!Number.isInteger(slot) || slot < 0 || slot > 2)
      return { kind: "invalid_slot" };
    const binding = bindings.find((row) => Number(row.slot) === slot);
    return binding
      ? {
          kind: "ok",
          binding: {
            slot,
            characterId: binding.characterId ?? binding.character_id,
          },
        }
      : { kind: "slot_not_bound", slot };
  }
  if (bindings.length === 1) {
    const binding = bindings[0];
    return {
      kind: "ok",
      legacy: true,
      binding: {
        slot: Number(binding.slot),
        characterId: binding.characterId ?? binding.character_id,
      },
    };
  }
  return bindings.length === 0
    ? { kind: "character_required" }
    : { kind: "client_refresh_required" };
}

/** Transaction-agnostic claim state machine; the repository must hold the mail
 * row lock until its surrounding transaction commits or rolls back. */
export async function issueMailGrant(repo, {
  userId,
  mailId,
  requestedSlot,
  grantId,
  sanitizeRewards,
}) {
  const mail = await repo.lockMail(userId, mailId);
  if (!mail) return { kind: "not_found" };
  const existing = await repo.findGrant(userId, mail.id);
  if (existing)
    return existing.status === "applied"
      ? { kind: "applied", grant: existing }
      : { kind: "issued", grant: existing, idempotent: true };
  if (mail.claimed) return { kind: "legacy_claimed" };
  const save = await repo.lockActiveSave(userId, requestedSlot);
  if (!save) return { kind: "character_required" };
  const rewards = sanitizeRewards(mail.rewards);
  const grant = {
    id: grantId,
    userId,
    characterId: save.characterId,
    slot: Number(save.slot),
    sourceId: mail.id,
    rewards,
    status: "issued",
  };
  await repo.insertGrant(grant);
  await repo.markMailClaimed(userId, mail.id);
  return { kind: "issued", grant, idempotent: false };
}
