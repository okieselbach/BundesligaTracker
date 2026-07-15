import Dexie, { type Table } from "dexie";

export type Id = string;
export type CompetitionType = "league" | "cup";

export interface Club {
  id: Id;
  name: string;
  shortName: string;
  slug: string;
  logoUrl?: string;
  clubUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  /**
   * Pool tier the club belongs to when it sits outside any active league
   * (e.g. "regionalliga" for the German system, "championship" for England).
   * Active-league clubs leave this undefined; it is only meaningful for the pool.
   */
  tier?: string;
  /** Identifies which country/system this club belongs to ("de", "en", ...). */
  systemId?: string;
}

export interface Season {
  id: Id;
  name: string;
  isCurrent: boolean;
  createdAt: number;
  /** Which league system this season belongs to ("de", "en", ...). */
  systemId?: string;
}

export interface Competition {
  id: Id;
  name: string;
  shortName: string;
  type: CompetitionType;
  slug: string;
  sortOrder: number;
}

export interface SeasonCompetition {
  id: Id;
  seasonId: Id;
  competitionId: Id;
  clubIds: Id[];
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  hasDoubleRound: boolean;
  createdAt: number;
  /**
   * World Cup group stage only: the 12 groups (A..L), each an ordered list of
   * up to 4 club ids. Undefined for every other competition. Non-indexed, so
   * it needs no Dexie schema bump.
   */
  groups?: Id[][];
}

export interface Matchday {
  id: Id;
  seasonCompetitionId: Id;
  number: number;
  name: string;
}

export interface Match {
  id: Id;
  seasonCompetitionId: Id;
  matchdayId?: Id;
  cupRoundId?: Id;
  homeClubId: Id;
  awayClubId: Id;
  homeGoals?: number;
  awayGoals?: number;
  homePen?: number;
  awayPen?: number;
  isKnockout: boolean;
  playedAt?: number;
  /** World Cup group stage: which group ("A".."L") this match belongs to. */
  group?: string;
  /**
   * World Cup knockout: stable bracket slot id (e.g. "R32-3", "R16-1", "SF-2",
   * "FINAL", "THIRD"). Lets us wire winners into downstream matches. Undefined
   * for every other competition.
   */
  bracketPos?: string;
}

export interface CupRound {
  id: Id;
  seasonCompetitionId: Id;
  number: number;
  name: string;
}

class AppDB extends Dexie {
  clubs!: Table<Club, Id>;
  seasons!: Table<Season, Id>;
  competitions!: Table<Competition, Id>;
  seasonCompetitions!: Table<SeasonCompetition, Id>;
  matchdays!: Table<Matchday, Id>;
  matches!: Table<Match, Id>;
  cupRounds!: Table<CupRound, Id>;

  constructor() {
    super("bundesliga-tracker-db");
    this.version(2).stores({
      clubs: "id, slug, name",
      seasons: "id, name, isCurrent, createdAt",
      competitions: "id, slug, type, sortOrder",
      seasonCompetitions: "id, seasonId, competitionId",
      matchdays: "id, seasonCompetitionId, number",
      matches: "id, seasonCompetitionId, matchdayId, cupRoundId, homeClubId, awayClubId",
      cupRounds: "id, seasonCompetitionId, number",
    });
  }
}

export const db = new AppDB();

export function newId(prefix = "id"): Id {
  return `${prefix}_${crypto.randomUUID()}`;
}
