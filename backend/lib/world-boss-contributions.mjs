export const WORLD_BOSS_CONTRIBUTION_MODE_KEY = "world_boss_contribution_mode";
export const WORLD_BOSS_CONTRIBUTION_ENABLED = "server_observed";
export const WORLD_BOSS_TICKET_TTL_SECONDS = 180;

const pad = (n) => String(n).padStart(2, "0");

/** Asia/Shanghai civil date, independent of the client's save clock. */
export function shanghaiDailyCycle(date = new Date()) {
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return `sh-day:${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** Stable ISO-like Monday week in Asia/Shanghai, anchored at 2026-01-05. */
export function serverWorldBossWeek(date = new Date()) {
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const day = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  const anchor = Date.UTC(2026, 0, 5);
  return `wb-week-${Math.floor((day - anchor) / 604800000)}`;
}

export function contributionCycle(route, date = new Date()) {
  if (route === "yaochao_daily") return shanghaiDailyCycle(date);
  if (route === "world_boss_long_term") return serverWorldBossWeek(date);
  return "";
}

export function contributionFeatureEnabled(value) {
  return String(value || "").trim().toLowerCase() === WORLD_BOSS_CONTRIBUTION_ENABLED;
}

export function ticketCompletionCheck(ticket, input, now = new Date()) {
  if (!ticket) return { kind: "missing" };
  if (ticket.consumedAt || ticket.consumed_at) return { kind: "replayed" };
  if (new Date(ticket.expiresAt || ticket.expires_at).getTime() <= now.getTime()) return { kind: "expired" };
  if (String(ticket.userId || ticket.user_id) !== String(input.userId)) return { kind: "wrong_user" };
  if (String(ticket.characterId || ticket.character_id) !== String(input.characterId)) return { kind: "wrong_character" };
  if (Number(ticket.slot) !== Number(input.slot)) return { kind: "wrong_slot" };
  if (String(ticket.route) !== String(input.route)) return { kind: "wrong_route" };
  return { kind: "ok" };
}

/**
 * Tickets only prevent replay; they cannot prove a local battle happened.
 * Until a trusted combat service calls the server-observed ingestion path,
 * public client completion must stay disabled and tier claims fail closed.
 */
export const CLIENT_BATTLE_PROOF_AVAILABLE = false;

/** Repository transaction must lock the ticket and contribution row. No delta is accepted. */
export async function recordServerObservedEncounter(repo, input, now = new Date()) {
  if (!input?.eventId || !input?.ticketId || !input?.source?.startsWith("server:"))
    return { kind: "untrusted_event" };
  const ticket = await repo.lockTicket(input.ticketId);
  const checked = ticketCompletionCheck(ticket, input, now);
  if (checked.kind !== "ok") return checked;
  const event = await repo.findEvent(input.eventId, input.source);
  if (event) return { kind: "recorded", idempotent: true, contribution: event.totalContribution };
  const amount = Math.max(0, Math.trunc(Number(ticket.contribution) || 0));
  if (!amount) return { kind: "invalid_ticket" };
  const cycleKey = contributionCycle(input.route, now);
  const total = await repo.addContribution({ ...input, cycleKey, contribution: amount });
  await repo.insertEvent({ ...input, cycleKey, contribution: amount, totalContribution: total });
  await repo.consumeTicket(input.ticketId, now);
  return { kind: "recorded", idempotent: false, contribution: total, cycleKey };
}
