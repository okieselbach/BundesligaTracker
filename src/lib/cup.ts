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
}): { round: CupRound; matches: Match[] } {
  const { seasonCompetitionId, number, name } = params;
  const roundId = newId("cr");

  const round: CupRound = {
    id: roundId,
    seasonCompetitionId,
    number,
    name,
  };

  const teams = shuffle(params.clubIds);
  const matches: Match[] = [];

  for (let i = 0; i + 1 < teams.length; i += 2) {
    const home = teams[i];
    const away = teams[i + 1];

    matches.push({
      id: newId("m"),
      seasonCompetitionId,
      cupRoundId: roundId,
      homeClubId: home,
      awayClubId: away,
      isKnockout: true,
    });
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
