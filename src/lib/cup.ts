import { newId, type CupRound, type Id, type Match } from "./db";
import type { CupConfig, CupEntrantSource } from "@/data/leagueSystems";

export const CUP_ROUND_NAMES: Record<number, string> = {
  1: "1. Runde",
  2: "2. Runde",
  3: "Achtelfinale",
  4: "Viertelfinale",
  5: "Halbfinale",
  6: "Finale",
};

/**
 * Look up the round name from a cup configuration. Falls back to the legacy
 * German names when the cup config doesn't define a round (shouldn't happen
 * for properly-configured cups).
 */
export function getRoundName(cup: CupConfig | undefined, roundNumber: number): string {
  const def = cup?.rounds.find((r) => r.number === roundNumber);
  if (def) return def.name;
  return CUP_ROUND_NAMES[roundNumber] ?? `Runde ${roundNumber}`;
}

/** Resolve a CupEntrantSource into concrete club ids using current data. */
function resolveSource(
  source: CupEntrantSource,
  leagueClubIds: Record<string, Id[]>,
  poolByTier: Record<string, Id[]> = {},
): Id[] {
  if (source.type === "league") {
    return leagueClubIds[source.slug] ?? [];
  }
  if (source.type === "league-top") {
    return (leagueClubIds[source.slug] ?? []).slice(0, source.n);
  }
  if (source.type === "league-bottom") {
    const all = leagueClubIds[source.slug] ?? [];
    return all.slice(Math.max(0, all.length - source.n));
  }
  if (source.type === "pool") {
    const ids = source.tierId
      ? poolByTier[source.tierId] ?? []
      : Object.values(poolByTier).flat();
    return ids.slice(0, source.count);
  }
  return [];
}

/**
 * Build pots for a specific cup round. Returns undefined if the round is a
 * free draw, the cup has no rule for the round, or any pot is empty.
 *
 * `participantIds` are the clubs currently in the round (winners of prior
 * round + any late entrants). Only those are placed in pots.
 */
export function buildPotsForRound(
  cup: CupConfig | undefined,
  roundNumber: number,
  participantIds: Id[],
  leagueClubIds: Record<string, Id[]>,
  poolByTier: Record<string, Id[]> = {},
): { pot1: Id[]; pot2: Id[] } | undefined {
  if (!cup) return undefined;
  const roundDef = cup.rounds.find((r) => r.number === roundNumber);
  if (!roundDef || roundDef.draw.type !== "pots") return undefined;

  const draw = roundDef.draw;
  const participantSet = new Set(participantIds);

  const pot2: Id[] = [];
  const pot2Seen = new Set<Id>();
  for (const source of draw.pot2.sources) {
    for (const id of resolveSource(source, leagueClubIds, poolByTier)) {
      if (participantSet.has(id) && !pot2Seen.has(id)) {
        pot2.push(id);
        pot2Seen.add(id);
      }
    }
  }

  let pot1: Id[];
  if (draw.pot1IsRest) {
    pot1 = participantIds.filter((id) => !pot2Seen.has(id));
  } else {
    pot1 = [];
    const pot1Seen = new Set<Id>();
    for (const source of draw.pot1.sources) {
      for (const id of resolveSource(source, leagueClubIds, poolByTier)) {
        if (participantSet.has(id) && !pot1Seen.has(id)) {
          pot1.push(id);
          pot1Seen.add(id);
        }
      }
    }
  }

  if (pot1.length === 0 || pot2.length === 0) return undefined;
  return { pot1, pot2 };
}

/**
 * Compute clubs that newly enter the cup at the given round. For most cups
 * (DFB-Pokal) this is empty — all clubs enter at round 1. The FA Cup uses
 * this to add Premier League + Championship at round 3.
 */
export function getLateEntrants(
  cup: CupConfig | undefined,
  roundNumber: number,
  leagueClubIds: Record<string, Id[]>,
  poolByTier: Record<string, Id[]> = {},
): Id[] {
  const sources = cup?.lateEntrants?.[roundNumber];
  if (!sources) return [];
  const result: Id[] = [];
  const seen = new Set<Id>();
  for (const source of sources) {
    for (const id of resolveSource(source, leagueClubIds, poolByTier)) {
      if (!seen.has(id)) {
        result.push(id);
        seen.add(id);
      }
    }
  }
  return result;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createCupRound(params: {
  seasonCompetitionId: Id;
  number: number;
  name: string;
  clubIds: Id[];
  pots?: { pot1: Id[]; pot2: Id[] };
}): { round: CupRound; matches: Match[] } {
  const { seasonCompetitionId, number, name } = params;
  const roundId = newId("cr");

  const round: CupRound = {
    id: roundId,
    seasonCompetitionId,
    number,
    name,
  };

  const matches: Match[] = [];

  const totalTeams = params.pots
    ? params.pots.pot1.length + params.pots.pot2.length
    : params.clubIds.length;
  if (totalTeams % 2 !== 0) {
    console.warn(`Cup draw: odd number of teams (${totalTeams}), one team will be left out`);
  }

  if (params.pots) {
    // Two-pot draw: pot1 = home (3.Liga/Amateure), pot2 = away (1.BL/2.BL)
    const pot1 = shuffle(params.pots.pot1);
    const pot2 = shuffle(params.pots.pot2);
    const pairCount = Math.min(pot1.length, pot2.length);

    for (let i = 0; i < pairCount; i++) {
      matches.push({
        id: newId("m"),
        seasonCompetitionId,
        cupRoundId: roundId,
        homeClubId: pot1[i],
        awayClubId: pot2[i],
        isKnockout: true,
      });
    }

    // Remaining teams from the larger pot play against each other
    const remaining = [
      ...pot1.slice(pairCount),
      ...pot2.slice(pairCount),
    ];
    const shuffledRemaining = shuffle(remaining);
    for (let i = 0; i + 1 < shuffledRemaining.length; i += 2) {
      matches.push({
        id: newId("m"),
        seasonCompetitionId,
        cupRoundId: roundId,
        homeClubId: shuffledRemaining[i],
        awayClubId: shuffledRemaining[i + 1],
        isKnockout: true,
      });
    }
  } else {
    // Standard draw: shuffle all teams
    const teams = shuffle(params.clubIds);
    for (let i = 0; i + 1 < teams.length; i += 2) {
      matches.push({
        id: newId("m"),
        seasonCompetitionId,
        cupRoundId: roundId,
        homeClubId: teams[i],
        awayClubId: teams[i + 1],
        isKnockout: true,
      });
    }
  }

  return { round, matches };
}

export function getCupWinner(match: Match): Id | null {
  if (typeof match.homeGoals !== "number" || typeof match.awayGoals !== "number") return null;
  if (match.homeGoals > match.awayGoals) return match.homeClubId;
  if (match.homeGoals < match.awayGoals) return match.awayClubId;

  if (typeof match.homePen === "number" && typeof match.awayPen === "number") {
    if (match.homePen > match.awayPen) return match.homeClubId;
    if (match.homePen < match.awayPen) return match.awayClubId;
  }
  return null;
}

export function allRoundMatchesPlayed(matches: Match[]): boolean {
  return matches.every(
    (m) => typeof m.homeGoals === "number" && typeof m.awayGoals === "number",
  );
}

export function allRoundMatchesDecided(matches: Match[]): boolean {
  return matches.every((m) => getCupWinner(m) !== null);
}
