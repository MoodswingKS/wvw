import type { Role, ActionType } from "@prisma/client";

/**
 * Pure functions for game rules — no DB access here. API routes call these
 * with data they've already fetched, then persist the results. Keeping
 * logic pure makes it straightforward to unit test independent of Prisma.
 */

// --- Role assignment ---------------------------------------------------

// Simple starter distribution. Real games usually scale werewolf count
// with player count (e.g. ~1 werewolf per 4-5 players) — adjust this
// as you tune balance.
export function buildRoleDeck(playerCount: number): Role[] {
  if (playerCount < 5) {
    throw new Error("Need at least 5 players to start a game");
  }

  const werewolfCount = Math.max(1, Math.floor(playerCount / 4));
  const deck: Role[] = [];

  for (let i = 0; i < werewolfCount; i++) deck.push("WEREWOLF");
  deck.push("SEER");
  deck.push("DOCTOR");
  while (deck.length < playerCount) deck.push("VILLAGER");

  return shuffle(deck);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// --- Night resolution ----------------------------------------------------

export interface NightActionInput {
  actionType: ActionType;
  actorMembershipId: string;
  targetMembershipId: string;
}

export interface NightResolutionResult {
  eliminatedMembershipId: string | null; // who dies tonight, if anyone
  seerResults: { actorMembershipId: string; targetMembershipId: string; isWerewolf: boolean }[];
}

/**
 * Resolves a night's actions. Expects at most one action per actor.
 * `targetRoles` maps membershipId -> Role, needed to answer seer checks.
 */
export function resolveNightActions(
  actions: NightActionInput[],
  targetRoles: Map<string, Role>
): NightResolutionResult {
  const kill = actions.find((a) => a.actionType === "KILL");
  const protect = actions.find((a) => a.actionType === "PROTECT");
  const investigations = actions.filter((a) => a.actionType === "INVESTIGATE");

  let eliminatedMembershipId: string | null = null;
  if (kill && kill.targetMembershipId !== protect?.targetMembershipId) {
    eliminatedMembershipId = kill.targetMembershipId;
  }

  const seerResults = investigations.map((inv) => ({
    actorMembershipId: inv.actorMembershipId,
    targetMembershipId: inv.targetMembershipId,
    isWerewolf: targetRoles.get(inv.targetMembershipId) === "WEREWOLF",
  }));

  return { eliminatedMembershipId, seerResults };
}

// --- Vote resolution ----------------------------------------------------

export interface VoteInput {
  voterMembershipId: string;
  targetMembershipId: string;
}

/**
 * Tallies day votes. Returns the eliminated membership, or null on a tie
 * (house rule: ties mean no one is lynched — change here if you prefer
 * a runoff or random tiebreak instead).
 */
export function tallyVotes(votes: VoteInput[]): string | null {
  if (votes.length === 0) return null;

  const counts = new Map<string, number>();
  for (const v of votes) {
    counts.set(v.targetMembershipId, (counts.get(v.targetMembershipId) ?? 0) + 1);
  }

  let topId: string | null = null;
  let topCount = 0;
  let isTie = false;

  for (const [id, count] of counts) {
    if (count > topCount) {
      topId = id;
      topCount = count;
      isTie = false;
    } else if (count === topCount) {
      isTie = true;
    }
  }

  return isTie ? null : topId;
}

// --- Win condition --------------------------------------------------------

export type WinResult = "VILLAGERS" | "WEREWOLVES" | null;

/**
 * Checks win conditions given currently-alive roles.
 * Villagers win when no werewolves remain; werewolves win when they
 * equal or outnumber the rest.
 */
export function checkWinCondition(aliveRoles: Role[]): WinResult {
  const werewolfCount = aliveRoles.filter((r) => r === "WEREWOLF").length;
  const otherCount = aliveRoles.length - werewolfCount;

  if (werewolfCount === 0) return "VILLAGERS";
  if (werewolfCount >= otherCount) return "WEREWOLVES";
  return null;
}
