/** Resolve an explicitly selected character save. Reward endpoints must never
 * guess a destination when an account can own multiple characters. */
export function resolveRewardCharacter(bindings, rawSlot) {
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

/**
 * Transaction-agnostic source grant state machine. The repository must lock
 * the source row (or another unique source guard) for the whole transaction.
 */
export async function issueSourceGrant(repo, input) {
  const existing = await repo.findGrant(
    input.userId,
    input.sourceType,
    input.sourceId,
  );
  if (existing) {
    if (
      existing.characterId !== input.characterId ||
      Number(existing.slot) !== Number(input.slot)
    )
      return { kind: "character_mismatch", grant: existing };
    return {
      kind: existing.status === "consumed" ? "consumed" : "issued",
      grant: existing,
      idempotent: true,
    };
  }

  const grant = {
    id: input.grantId,
    userId: input.userId,
    characterId: input.characterId,
    slot: Number(input.slot),
    grantType: input.grantType,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    rewards: input.rewards,
    status: "issued",
  };
  await repo.insertGrant(grant);
  await repo.insertIssuedLedger(grant);
  return { kind: "issued", grant, idempotent: false };
}
