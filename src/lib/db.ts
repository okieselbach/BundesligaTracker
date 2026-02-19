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
}

export interface Season {
  id: Id;
  name: string;
  isCurrent: boolean;
  createdAt: number;
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
