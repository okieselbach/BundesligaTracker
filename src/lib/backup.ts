import { db } from "./db";

export interface BackupData {
  version: number;
  exportedAt: string;
  clubs: unknown[];
  seasons: unknown[];
  competitions: unknown[];
  seasonCompetitions: unknown[];
  matchdays: unknown[];
  matches: unknown[];
  cupRounds: unknown[];
}

export async function exportAllData(): Promise<BackupData> {
  const [clubs, seasons, competitions, seasonCompetitions, matchdays, matches, cupRounds] =
    await Promise.all([
      db.clubs.toArray(),
      db.seasons.toArray(),
      db.competitions.toArray(),
      db.seasonCompetitions.toArray(),
      db.matchdays.toArray(),
      db.matches.toArray(),
      db.cupRounds.toArray(),
    ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    clubs,
    seasons,
    competitions,
    seasonCompetitions,
    matchdays,
    matches,
    cupRounds,
  };
}

export async function importAllData(data: BackupData): Promise<void> {
  await db.transaction(
    "rw",
    [db.clubs, db.seasons, db.competitions, db.seasonCompetitions, db.matchdays, db.matches, db.cupRounds],
    async () => {
      await Promise.all([
        db.clubs.clear(),
        db.seasons.clear(),
        db.competitions.clear(),
        db.seasonCompetitions.clear(),
        db.matchdays.clear(),
        db.matches.clear(),
        db.cupRounds.clear(),
      ]);

      await Promise.all([
        db.clubs.bulkAdd(data.clubs as never[]),
        db.seasons.bulkAdd(data.seasons as never[]),
        db.competitions.bulkAdd(data.competitions as never[]),
        db.seasonCompetitions.bulkAdd(data.seasonCompetitions as never[]),
        db.matchdays.bulkAdd(data.matchdays as never[]),
        db.matches.bulkAdd(data.matches as never[]),
        db.cupRounds.bulkAdd(data.cupRounds as never[]),
      ]);
    },
  );
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
