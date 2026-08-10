import type { Role, ActionType } from "@prisma/client";

/**
 * Pure functions for game rules — no DB access here. API routes call these
 * with data they've already fetched, then persist the results. Keeping
 * logic pure makes it straightforward to unit test independent of Prisma.
 */

// --- Role assignment ---------------------------------------------------

// AUTO mode: simple starter distribution, scaling werewolves with player
// count. Adjust the ratio as you tune balance.
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

// MANUAL mode: host specifies counts per role directly. Kept as a plain
// map (Role -> count) rather than named params, since the role list is
// expected to grow well past these four — adding a role later only means
// adding an entry to lib/roles.ts and this map, not new function params.
export type RoleCounts = Partial<Record<Exclude<Role, "VILLAGER">, number>>;

export function buildRoleDeckFromCounts(counts: RoleCounts, playerCount: number): Role[] {
  const deck: Role[] = [];
  let specified = 0;

  for (const [role, count] of Object.entries(counts) as [Role, number | undefined][]) {
    const n = count ?? 0;
    if (n < 0) throw new Error(`Count for ${role} can't be negative`);
    for (let i = 0; i < n; i++) deck.push(role);
    specified += n;
  }

  if (specified > playerCount) {
    throw new Error(`Configured roles (${specified}) exceed player count (${playerCount})`);
  }
  if ((counts.WEREWOLF ?? 0) < 1) {
    throw new Error("Need at least 1 werewolf");
  }

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

// --- Shared plurality tally ------------------------------------------------

/**
 * Given a list of target ids (one per voter), returns the id with the
 * most votes, or null if there were no votes or the top spot is tied.
 * Shared by both the werewolves' night kill (when there's more than one
 * werewolf, each casts a vote) and the village's day lynch vote.
 */
function plurality(targetIds: string[]): string | null {
  if (targetIds.length === 0) return null;

  const counts = new Map<string, number>();
  for (const id of targetIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
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
 * Resolves a night's actions. Every werewolf may submit their own KILL
 * action — the target with the most werewolf votes is killed; a tie
 * between top targets means no kill happens, same as a tied day vote.
 * `targetRoles` maps membershipId -> Role, needed to answer seer checks.
 */
export function resolveNightActions(
  actions: NightActionInput[],
  targetRoles: Map<string, Role>
): NightResolutionResult {
  const kills = actions.filter((a) => a.actionType === "KILL");
  const protect = actions.find((a) => a.actionType === "PROTECT");
  const investigations = actions.filter((a) => a.actionType === "INVESTIGATE");

  const killTarget = plurality(kills.map((k) => k.targetMembershipId));

  let eliminatedMembershipId: string | null = null;
  if (killTarget && killTarget !== protect?.targetMembershipId) {
    eliminatedMembershipId = killTarget;
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
  return plurality(votes.map((v) => v.targetMembershipId));
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
