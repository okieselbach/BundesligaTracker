import { newId, type CupRound, type Id, type Match } from "./db";

export const CUP_ROUND_NAMES: Record<number, string> = {
  1: "1. Runde",
  2: "2. Runde",
  3: "Achtelfinale",
  4: "Viertelfinale",
  5: "Halbfinale",
  6: "Finale",
};

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
