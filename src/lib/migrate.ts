import { db } from "./db";
import { CLUBS_CONFIG_VERSION, ALL_CLUBS } from "@/data/clubs";
import { COMPETITIONS } from "@/data/competitions";
import { DEFAULT_SYSTEM_ID, getSystem, LEAGUE_SYSTEMS } from "@/data/leagueSystems";

const STORAGE_KEY = "clubs_config_v";

/**
 * Migrate stored clubs/competitions/seasons to match the current code version.
 *
 * - bulkPut clubs: upsert latest tagged Club records (adds tier/systemId,
 *   pulls in newly added countries' clubs).
 * - bulkPut competitions: ensures Premier League / FA Cup rows exist for
 *   users created before Phase 2.
 * - Backfill Season.systemId on records that pre-date Phase 2 (default "de").
 * - Re-label matchdays whose name uses the wrong system's prefix (English
 *   seasons created before the matchday-label fix still say "Spieltag X").
 */
export async function migrateClubsIfNeeded(): Promise<boolean> {
  const stored = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0");
  if (CLUBS_CONFIG_VERSION <= stored) return false;

  await db.clubs.bulkPut(ALL_CLUBS);
  await db.competitions.bulkPut(COMPETITIONS);

  // Backfill systemId on any season that doesn't have one yet.
  const seasonsWithoutSystem = await db.seasons.filter((s) => !s.systemId).toArray();
  for (const s of seasonsWithoutSystem) {
    await db.seasons.update(s.id, { systemId: DEFAULT_SYSTEM_ID });
  }

  // Rename matchdays whose label doesn't match their season's system.
  // Catches "Spieltag 1" in a 🇬🇧 season (and vice-versa for symmetry).
  const knownLabels = LEAGUE_SYSTEMS.map((s) => s.matchdayLabel);
  const allSeasons = await db.seasons.toArray();
  for (const season of allSeasons) {
    const expectedLabel = getSystem(season.systemId ?? DEFAULT_SYSTEM_ID).matchdayLabel;
    const scs = await db.seasonCompetitions
      .where("seasonId")
      .equals(season.id)
      .toArray();
    for (const sc of scs) {
      const matchdays = await db.matchdays
        .where("seasonCompetitionId")
        .equals(sc.id)
        .toArray();
      for (const md of matchdays) {
        // Only rename names that follow the "<knownLabel> <number>" pattern
        // — leaves manually edited names untouched.
        const expectedName = `${expectedLabel} ${md.number}`;
        if (md.name === expectedName) continue;
        const matchesKnown = knownLabels.some((label) => md.name === `${label} ${md.number}`);
        if (matchesKnown) {
          await db.matchdays.update(md.id, { name: expectedName });
        }
      }
    }
  }

  localStorage.setItem(STORAGE_KEY, String(CLUBS_CONFIG_VERSION));
  return true;
}
