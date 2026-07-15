/**
 * FIFA World Cup 2026 tournament logic.
 *
 * The World Cup is special-cased (see leagueSystems.ts): a 12-group stage feeds
 * a fixed 32-team knockout bracket. This module holds the pure logic:
 *   • per-group standings + qualification (top 2 of each group + best 8 thirds)
 *   • the fixed Round-of-32 bracket template (official FIFA seeding), which by
 *     construction never pairs a group winner with a winner, a runner-up with a
 *     third, or any team against another from its own group in the first round
 *   • the downstream bracket tree (R16 → QF → SF → Final + third-place match)
 *     with automatic advancement of winners (and losers into the third-place
 *     match).
 *
 * No React, no Dexie writes — just data in, data out.
 */

import type { Id, Match, SeasonCompetition } from "./db";
import { computeStandings, type StandingRow } from "./standings";
import { getCupWinner } from "./cup";

export const WC_GROUP_COUNT = 12;
export const WC_TEAMS_PER_GROUP = 4;
export const WC_BEST_THIRDS = 8;

/** Group index (0..11) → letter ("A".."L"). */
export function groupLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

/** Letter ("A".."L") → group index (0..11). */
export function groupIndex(letter: string): number {
  return letter.charCodeAt(0) - 65;
}

// ---------------------------------------------------------------------------
// Group stage
// ---------------------------------------------------------------------------

export interface GroupStanding {
  group: string; // "A".."L"
  rows: StandingRow[];
}

/**
 * Compute the 12 group tables. Each group's table is a normal round-robin
 * standing restricted to that group's four teams and matches.
 */
export function computeGroupStandings(
  sc: SeasonCompetition,
  matches: Match[],
): GroupStanding[] {
  const groups = sc.groups ?? [];
  const result: GroupStanding[] = [];
  for (let i = 0; i < groups.length; i++) {
    const memberIds = groups[i] ?? [];
    const letter = groupLetter(i);
    const groupMatches = matches.filter(
      (m) =>
        m.group === letter ||
        (memberIds.includes(m.homeClubId) && memberIds.includes(m.awayClubId)),
    );
    const miniSC: SeasonCompetition = { ...sc, clubIds: memberIds };
    result.push({ group: letter, rows: computeStandings(miniSC, groupMatches) });
  }
  return result;
}

/** Every group has 4 teams and all of its 6 matches have been played. */
export function isGroupStageComplete(
  sc: SeasonCompetition,
  matches: Match[],
): boolean {
  const groups = sc.groups ?? [];
  if (groups.length !== WC_GROUP_COUNT) return false;
  if (!groups.every((g) => g.length === WC_TEAMS_PER_GROUP)) return false;
  for (let i = 0; i < groups.length; i++) {
    const letter = groupLetter(i);
    const memberIds = groups[i];
    const groupMatches = matches.filter(
      (m) =>
        m.group === letter ||
        (memberIds.includes(m.homeClubId) && memberIds.includes(m.awayClubId)),
    );
    // 4 teams, single round-robin = 6 matches, all decided.
    if (groupMatches.length < 6) return false;
    if (
      !groupMatches.every(
        (m) => typeof m.homeGoals === "number" && typeof m.awayGoals === "number",
      )
    ) {
      return false;
    }
  }
  return true;
}

export interface ThirdPlaceEntry {
  group: string;
  clubId: Id;
  row: StandingRow;
}

export interface Qualification {
  /** group letter → winner club id */
  winners: Record<string, Id>;
  /** group letter → runner-up club id */
  runnersUp: Record<string, Id>;
  /** the 8 best third-placed teams (group letters), ranked best first */
  bestThirdGroups: string[];
  /** group letter → third-placed club id (for the qualified 8) */
  thirds: Record<string, Id>;
}

/** Rank the 12 group thirds and keep the best 8 (points, GD, GF). */
export function computeQualification(standings: GroupStanding[]): Qualification {
  const winners: Record<string, Id> = {};
  const runnersUp: Record<string, Id> = {};
  const thirdEntries: ThirdPlaceEntry[] = [];

  for (const gs of standings) {
    if (gs.rows[0]) winners[gs.group] = gs.rows[0].clubId;
    if (gs.rows[1]) runnersUp[gs.group] = gs.rows[1].clubId;
    if (gs.rows[2]) {
      thirdEntries.push({ group: gs.group, clubId: gs.rows[2].clubId, row: gs.rows[2] });
    }
  }

  thirdEntries.sort(
    (a, b) =>
      b.row.points - a.row.points ||
      b.row.goalDiff - a.row.goalDiff ||
      b.row.goalsFor - a.row.goalsFor ||
      a.group.localeCompare(b.group),
  );

  const best = thirdEntries.slice(0, WC_BEST_THIRDS);
  const thirds: Record<string, Id> = {};
  for (const e of best) thirds[e.group] = e.clubId;

  return {
    winners,
    runnersUp,
    bestThirdGroups: best.map((e) => e.group),
    thirds,
  };
}

/**
 * Circle-method round-robin for an even number of teams. Returns one array of
 * pairings per matchday. For 4 teams this yields 3 matchdays of 2 matches.
 */
function roundRobinRounds(ids: Id[]): [Id, Id][][] {
  const teams = [...ids];
  const n = teams.length;
  const rounds: [Id, Id][][] = [];
  if (n < 2) return rounds;
  const arr = [...teams];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [Id, Id][] = [];
    for (let i = 0; i < n / 2; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      // Alternate home/away a little so it's not always the same side.
      pairs.push(i % 2 === 0 ? [home, away] : [away, home]);
    }
    rounds.push(pairs);
    // Rotate all but the first element.
    arr.splice(1, 0, arr.pop()!);
  }
  return rounds;
}

export interface GroupScheduleMatch {
  group: string;
  matchdayNumber: number;
  homeClubId: Id;
  awayClubId: Id;
}

/**
 * Build the full group-stage schedule for all 12 groups. Every group plays its
 * single round-robin across shared matchdays (all groups' 1st-round games sit
 * in "Spieltag 1", etc.). Pure — the caller assigns ids and persists.
 */
export function buildGroupStageSchedule(groups: Id[][]): {
  matchdayCount: number;
  matches: GroupScheduleMatch[];
} {
  const matches: GroupScheduleMatch[] = [];
  let matchdayCount = 0;
  for (let i = 0; i < groups.length; i++) {
    const rounds = roundRobinRounds(groups[i]);
    matchdayCount = Math.max(matchdayCount, rounds.length);
    const letter = groupLetter(i);
    rounds.forEach((pairs, rIdx) => {
      for (const [home, away] of pairs) {
        matches.push({
          group: letter,
          matchdayNumber: rIdx + 1,
          homeClubId: home,
          awayClubId: away,
        });
      }
    });
  }
  return { matchdayCount, matches };
}

// ---------------------------------------------------------------------------
// Fixed knockout bracket (official FIFA 2026 template)
// ---------------------------------------------------------------------------

type R32Source =
  | { kind: "winner"; group: string }
  | { kind: "runnerup"; group: string }
  | { kind: "third"; slot: number; allowed: string[] };

interface R32SlotDef {
  pos: string; // "R32-1"..."R32-16"
  home: R32Source;
  away: R32Source;
}

/**
 * The 16 Round-of-32 pairings. Third-place slots list the groups whose third
 * may be drawn into them; the allowed sets already exclude the slot's own
 * winner group, so an assigned third never meets its own group here.
 */
const R32_SLOTS: R32SlotDef[] = [
  { pos: "R32-1", home: { kind: "runnerup", group: "A" }, away: { kind: "runnerup", group: "B" } },
  { pos: "R32-2", home: { kind: "winner", group: "E" }, away: { kind: "third", slot: 0, allowed: ["A", "B", "C", "D", "F"] } },
  { pos: "R32-3", home: { kind: "winner", group: "F" }, away: { kind: "runnerup", group: "C" } },
  { pos: "R32-4", home: { kind: "winner", group: "C" }, away: { kind: "runnerup", group: "F" } },
  { pos: "R32-5", home: { kind: "winner", group: "I" }, away: { kind: "third", slot: 1, allowed: ["C", "D", "F", "G", "H"] } },
  { pos: "R32-6", home: { kind: "runnerup", group: "E" }, away: { kind: "runnerup", group: "I" } },
  { pos: "R32-7", home: { kind: "winner", group: "A" }, away: { kind: "third", slot: 2, allowed: ["C", "E", "F", "H", "I"] } },
  { pos: "R32-8", home: { kind: "winner", group: "L" }, away: { kind: "third", slot: 3, allowed: ["E", "H", "I", "J", "K"] } },
  { pos: "R32-9", home: { kind: "winner", group: "D" }, away: { kind: "third", slot: 4, allowed: ["B", "E", "F", "I", "J"] } },
  { pos: "R32-10", home: { kind: "winner", group: "G" }, away: { kind: "third", slot: 5, allowed: ["A", "E", "H", "I", "J"] } },
  { pos: "R32-11", home: { kind: "runnerup", group: "K" }, away: { kind: "runnerup", group: "L" } },
  { pos: "R32-12", home: { kind: "winner", group: "H" }, away: { kind: "runnerup", group: "J" } },
  { pos: "R32-13", home: { kind: "winner", group: "B" }, away: { kind: "third", slot: 6, allowed: ["E", "F", "G", "I", "J"] } },
  { pos: "R32-14", home: { kind: "winner", group: "J" }, away: { kind: "runnerup", group: "H" } },
  { pos: "R32-15", home: { kind: "winner", group: "K" }, away: { kind: "third", slot: 7, allowed: ["D", "E", "I", "J", "L"] } },
  { pos: "R32-16", home: { kind: "runnerup", group: "D" }, away: { kind: "runnerup", group: "G" } },
];

/**
 * Assign the 8 qualified thirds (by group) to the 8 third-slots such that each
 * third lands in a slot whose `allowed` set contains its group. Uses augmenting
 * paths (bipartite matching); FIFA's allowed sets guarantee a perfect matching
 * exists for any combination of 8 qualifying groups.
 *
 * Returns slot index (0..7) → group letter, or null if no perfect matching was
 * found (should not happen for valid input).
 */
export function assignThirdSlots(qualifiedGroups: string[]): Record<number, string> | null {
  const slots = R32_SLOTS.filter((s) => s.away.kind === "third").map((s) =>
    s.away.kind === "third" ? s.away : null,
  ).filter(Boolean) as Extract<R32Source, { kind: "third" }>[];

  // slots[k].slot is the canonical slot index (0..7)
  const slotAllowed: string[][] = [];
  for (const s of slots) slotAllowed[s.slot] = s.allowed;

  // Match groups → slots.
  const groupToSlot: Record<string, number> = {};
  const slotToGroup: Record<number, string> = {};

  const tryAssign = (group: string, visited: Set<number>): boolean => {
    for (let slot = 0; slot < slotAllowed.length; slot++) {
      if (!slotAllowed[slot]?.includes(group)) continue;
      if (visited.has(slot)) continue;
      visited.add(slot);
      const occupant = slotToGroup[slot];
      if (occupant === undefined || tryAssign(occupant, visited)) {
        slotToGroup[slot] = group;
        groupToSlot[group] = slot;
        return true;
      }
    }
    return false;
  };

  for (const group of qualifiedGroups) {
    if (!tryAssign(group, new Set())) return null;
  }

  if (Object.keys(slotToGroup).length !== qualifiedGroups.length) return null;
  return slotToGroup;
}

export interface R32Pairing {
  pos: string;
  homeClubId: Id;
  awayClubId: Id;
}

/**
 * Resolve the 16 Round-of-32 pairings into concrete club ids from the group
 * results. Returns null if the thirds cannot be assigned (invalid input).
 */
export function buildR32Pairings(q: Qualification): R32Pairing[] | null {
  const slotToGroup = assignThirdSlots(q.bestThirdGroups);
  if (!slotToGroup) return null;

  const resolve = (src: R32Source): Id | undefined => {
    if (src.kind === "winner") return q.winners[src.group];
    if (src.kind === "runnerup") return q.runnersUp[src.group];
    // third
    const group = slotToGroup[src.slot];
    return group ? q.thirds[group] : undefined;
  };

  const pairings: R32Pairing[] = [];
  for (const slot of R32_SLOTS) {
    const home = resolve(slot.home);
    const away = resolve(slot.away);
    if (!home || !away) return null;
    pairings.push({ pos: slot.pos, homeClubId: home, awayClubId: away });
  }
  return pairings;
}

// ---------------------------------------------------------------------------
// Downstream bracket wiring (R16 → QF → SF → Final + third place)
// ---------------------------------------------------------------------------

export type Feeder =
  | { kind: "winner"; pos: string }
  | { kind: "loser"; pos: string };

export interface BracketMatchDef {
  pos: string;
  /** cup round number: 1=R32, 2=R16, 3=QF, 4=SF, 5=Final/3rd place */
  round: number;
  home: Feeder;
  away: Feeder;
}

/** Round number → display name. */
export const WC_ROUND_NAMES: Record<number, string> = {
  1: "Sechzehntelfinale",
  2: "Achtelfinale",
  3: "Viertelfinale",
  4: "Halbfinale",
  5: "Finale",
};

/**
 * The 16 downstream matches. R32 matches are created directly from the group
 * results (not listed here). Consecutive R32 winners feed each R16 match, and
 * so on up the tree; the third-place match takes the two semi-final losers.
 */
export const BRACKET_WIRING: BracketMatchDef[] = [
  { pos: "R16-1", round: 2, home: { kind: "winner", pos: "R32-1" }, away: { kind: "winner", pos: "R32-2" } },
  { pos: "R16-2", round: 2, home: { kind: "winner", pos: "R32-3" }, away: { kind: "winner", pos: "R32-4" } },
  { pos: "R16-3", round: 2, home: { kind: "winner", pos: "R32-5" }, away: { kind: "winner", pos: "R32-6" } },
  { pos: "R16-4", round: 2, home: { kind: "winner", pos: "R32-7" }, away: { kind: "winner", pos: "R32-8" } },
  { pos: "R16-5", round: 2, home: { kind: "winner", pos: "R32-9" }, away: { kind: "winner", pos: "R32-10" } },
  { pos: "R16-6", round: 2, home: { kind: "winner", pos: "R32-11" }, away: { kind: "winner", pos: "R32-12" } },
  { pos: "R16-7", round: 2, home: { kind: "winner", pos: "R32-13" }, away: { kind: "winner", pos: "R32-14" } },
  { pos: "R16-8", round: 2, home: { kind: "winner", pos: "R32-15" }, away: { kind: "winner", pos: "R32-16" } },
  { pos: "QF-1", round: 3, home: { kind: "winner", pos: "R16-1" }, away: { kind: "winner", pos: "R16-2" } },
  { pos: "QF-2", round: 3, home: { kind: "winner", pos: "R16-3" }, away: { kind: "winner", pos: "R16-4" } },
  { pos: "QF-3", round: 3, home: { kind: "winner", pos: "R16-5" }, away: { kind: "winner", pos: "R16-6" } },
  { pos: "QF-4", round: 3, home: { kind: "winner", pos: "R16-7" }, away: { kind: "winner", pos: "R16-8" } },
  { pos: "SF-1", round: 4, home: { kind: "winner", pos: "QF-1" }, away: { kind: "winner", pos: "QF-2" } },
  { pos: "SF-2", round: 4, home: { kind: "winner", pos: "QF-3" }, away: { kind: "winner", pos: "QF-4" } },
  { pos: "THIRD", round: 5, home: { kind: "loser", pos: "SF-1" }, away: { kind: "loser", pos: "SF-2" } },
  { pos: "FINAL", round: 5, home: { kind: "winner", pos: "SF-1" }, away: { kind: "winner", pos: "SF-2" } },
];

/** Ordered bracket columns for rendering the tree. */
export const BRACKET_COLUMNS: { round: number; positions: string[] }[] = [
  { round: 1, positions: R32_SLOTS.map((s) => s.pos) },
  { round: 2, positions: ["R16-1", "R16-2", "R16-3", "R16-4", "R16-5", "R16-6", "R16-7", "R16-8"] },
  { round: 3, positions: ["QF-1", "QF-2", "QF-3", "QF-4"] },
  { round: 4, positions: ["SF-1", "SF-2"] },
  { round: 5, positions: ["FINAL"] },
];

/** Loser of a decided knockout match (for the third-place game). */
export function getCupLoser(match: Match): Id | undefined {
  const winner = getCupWinner(match);
  if (!winner) return undefined;
  return winner === match.homeClubId ? match.awayClubId : match.homeClubId;
}

/**
 * Resolve, for every downstream bracket position, the club ids that should
 * occupy it given the currently decided matches. Returns a map pos → {home,
 * away} (either may be undefined if its feeder isn't decided yet).
 */
export function resolveBracketTeams(
  matches: Match[],
): Record<string, { homeClubId?: Id; awayClubId?: Id }> {
  const byPos = new Map<string, Match>();
  for (const m of matches) if (m.bracketPos) byPos.set(m.bracketPos, m);

  const resolveFeeder = (f: Feeder): Id | undefined => {
    const src = byPos.get(f.pos);
    if (!src) return undefined;
    return (f.kind === "winner" ? getCupWinner(src) : getCupLoser(src)) ?? undefined;
  };

  const out: Record<string, { homeClubId?: Id; awayClubId?: Id }> = {};
  for (const def of BRACKET_WIRING) {
    out[def.pos] = {
      homeClubId: resolveFeeder(def.home),
      awayClubId: resolveFeeder(def.away),
    };
  }
  return out;
}

export interface BracketUpdate {
  id: Id;
  homeClubId: Id;
  awayClubId: Id;
}

/**
 * Given the current bracket matches, compute which downstream matches need
 * their home/away club ids updated (because a feeder just got decided, or a
 * result changed so the previous occupant is no longer valid). Empty string
 * ("") represents an as-yet-undetermined slot.
 *
 * Runs to a fixpoint over an in-memory copy so a single change cascades all the
 * way up the tree: when a match's teams change its stored result is treated as
 * cleared (a score belonging to the old teams is no longer valid), which in
 * turn re-resolves the matches it feeds. The caller must therefore also clear
 * the score of every returned match when persisting.
 */
export function computeBracketUpdates(matches: Match[]): BracketUpdate[] {
  // Work on lightweight clones we can mutate as the cascade propagates.
  const working = matches.map((m) => ({ ...m }));
  const changed = new Map<Id, BracketUpdate>();

  for (let iter = 0; iter < BRACKET_WIRING.length + 1; iter++) {
    const resolved = resolveBracketTeams(working);
    const byPos = new Map<string, (typeof working)[number]>();
    for (const m of working) if (m.bracketPos) byPos.set(m.bracketPos, m);

    let anyChange = false;
    for (const def of BRACKET_WIRING) {
      const match = byPos.get(def.pos);
      if (!match) continue;
      const wantHome = resolved[def.pos].homeClubId ?? "";
      const wantAway = resolved[def.pos].awayClubId ?? "";
      if (match.homeClubId !== wantHome || match.awayClubId !== wantAway) {
        match.homeClubId = wantHome;
        match.awayClubId = wantAway;
        // Its old result belonged to the old teams — drop it so downstream
        // matches re-resolve to "undetermined".
        match.homeGoals = undefined;
        match.awayGoals = undefined;
        match.homePen = undefined;
        match.awayPen = undefined;
        changed.set(match.id, { id: match.id, homeClubId: wantHome, awayClubId: wantAway });
        anyChange = true;
      }
    }
    if (!anyChange) break;
  }

  return [...changed.values()];
}
