import type { Id } from "./db";
import type { StandingRow } from "./standings";

export interface AllTimeRow {
  clubId: Id;
  seasons: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export interface MeisterEntry {
  clubId: Id;
  meisterschaften: number;
  meisterSaisons: string[];
  pokalsiege: number;
  pokalSaisons: string[];
}

export interface CupStatRow {
  clubId: Id;
  teilnahmen: number;
  siege: number;
  pokalsiege: number;
  pokalSaisons: string[];
  finale: number;
  besteRunde: string;
  besteRundeNumber: number;
}

/**
 * Aggregiert StandingRows ueber mehrere Saisons zu einer Ewigen Tabelle.
 */
export function computeAllTimeStandings(
  seasonRows: StandingRow[][],
): AllTimeRow[] {
  const map = new Map<Id, AllTimeRow>();

  for (const rows of seasonRows) {
    for (const row of rows) {
      const existing = map.get(row.clubId);
      if (existing) {
        existing.seasons++;
        existing.played += row.played;
        existing.wins += row.wins;
        existing.draws += row.draws;
        existing.losses += row.losses;
        existing.goalsFor += row.goalsFor;
        existing.goalsAgainst += row.goalsAgainst;
        existing.points += row.points;
      } else {
        map.set(row.clubId, {
          clubId: row.clubId,
          seasons: 1,
          played: row.played,
          wins: row.wins,
          draws: row.draws,
          losses: row.losses,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalDiff: 0,
          points: row.points,
        });
      }
    }
  }

  for (const row of map.values()) {
    row.goalDiff = row.goalsFor - row.goalsAgainst;
  }

  return [...map.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      a.clubId.localeCompare(b.clubId),
  );
}

/**
 * Berechnet die Meisterliste aus Endtabellen und Pokalsiegern.
 */
export function computeMeisterliste(
  data: {
    seasonName: string;
    meisterClubId: Id | null;
    pokalsiegerClubId: Id | null;
  }[],
): MeisterEntry[] {
  const map = new Map<Id, MeisterEntry>();

  const getOrCreate = (clubId: Id): MeisterEntry => {
    let entry = map.get(clubId);
    if (!entry) {
      entry = {
        clubId,
        meisterschaften: 0,
        meisterSaisons: [],
        pokalsiege: 0,
        pokalSaisons: [],
      };
      map.set(clubId, entry);
    }
    return entry;
  };

  for (const d of data) {
    if (d.meisterClubId) {
      const entry = getOrCreate(d.meisterClubId);
      entry.meisterschaften++;
      entry.meisterSaisons.push(d.seasonName);
    }
    if (d.pokalsiegerClubId) {
      const entry = getOrCreate(d.pokalsiegerClubId);
      entry.pokalsiege++;
      entry.pokalSaisons.push(d.seasonName);
    }
  }

  return [...map.values()].sort(
    (a, b) =>
      b.meisterschaften - a.meisterschaften ||
      b.pokalsiege - a.pokalsiege ||
      a.clubId.localeCompare(b.clubId),
  );
}

const ROUND_ORDER: Record<string, number> = {
  "1. Runde": 1,
  "2. Runde": 2,
  "Achtelfinale": 3,
  "Viertelfinale": 4,
  "Halbfinale": 5,
  "Finale": 6,
};

/**
 * Berechnet Ewige Pokal-Statistik aus allen Pokal-Saisons.
 */
export function computeCupStats(
  cupSeasons: {
    seasonName: string;
    rounds: { name: string; number: number }[];
    matches: { homeClubId: Id; awayClubId: Id; homeGoals?: number; awayGoals?: number; homePen?: number; awayPen?: number; cupRoundId?: string }[];
    roundMap: Map<string, { name: string; number: number }>;
  }[],
): CupStatRow[] {
  const map = new Map<Id, CupStatRow>();

  const getOrCreate = (clubId: Id): CupStatRow => {
    let entry = map.get(clubId);
    if (!entry) {
      entry = {
        clubId,
        teilnahmen: 0,
        siege: 0,
        pokalsiege: 0,
        pokalSaisons: [],
        finale: 0,
        besteRunde: "",
        besteRundeNumber: 0,
      };
      map.set(clubId, entry);
    }
    return entry;
  };

  for (const season of cupSeasons) {
    // Track which clubs participated in this season
    const participatedClubs = new Set<Id>();

    for (const match of season.matches) {
      participatedClubs.add(match.homeClubId);
      participatedClubs.add(match.awayClubId);

      const round = match.cupRoundId ? season.roundMap.get(match.cupRoundId) : undefined;
      if (!round) continue;

      // Count wins
      if (typeof match.homeGoals === "number" && typeof match.awayGoals === "number") {
        let winnerId: Id | null = null;
        if (match.homeGoals > match.awayGoals) winnerId = match.homeClubId;
        else if (match.awayGoals > match.homeGoals) winnerId = match.awayClubId;
        else if (typeof match.homePen === "number" && typeof match.awayPen === "number") {
          if (match.homePen > match.awayPen) winnerId = match.homeClubId;
          else if (match.awayPen > match.homePen) winnerId = match.awayClubId;
        }

        if (winnerId) {
          const winnerEntry = getOrCreate(winnerId);
          winnerEntry.siege++;

          // Pokalsieger = Finale gewonnen
          if (round.name === "Finale") {
            winnerEntry.pokalsiege++;
            winnerEntry.pokalSaisons.push(season.seasonName);
          }
        }
      }

      // Track Finale-Teilnehmer
      if (round.name === "Finale") {
        getOrCreate(match.homeClubId).finale++;
        getOrCreate(match.awayClubId).finale++;
      }

      // Track beste Runde
      const roundNum = ROUND_ORDER[round.name] ?? round.number;
      const homeEntry = getOrCreate(match.homeClubId);
      if (roundNum > homeEntry.besteRundeNumber) {
        homeEntry.besteRundeNumber = roundNum;
        homeEntry.besteRunde = round.name;
      }
      const awayEntry = getOrCreate(match.awayClubId);
      if (roundNum > awayEntry.besteRundeNumber) {
        awayEntry.besteRundeNumber = roundNum;
        awayEntry.besteRunde = round.name;
      }
    }

    // Count Teilnahmen
    for (const clubId of participatedClubs) {
      getOrCreate(clubId).teilnahmen++;
    }
  }

  return [...map.values()].sort(
    (a, b) =>
      b.pokalsiege - a.pokalsiege ||
      b.finale - a.finale ||
      b.siege - a.siege ||
      a.clubId.localeCompare(b.clubId),
  );
}
