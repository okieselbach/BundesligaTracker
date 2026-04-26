import { db } from "./db";
import { CLUBS_CONFIG_VERSION, ALL_CLUBS } from "@/data/clubs";
import { COMPETITIONS } from "@/data/competitions";
import { DEFAULT_SYSTEM_ID } from "@/data/leagueSystems";

const STORAGE_KEY = "clubs_config_v";

/**
 * Migrate stored clubs/competitions/seasons to match the current code version.
 *
 * - bulkPut clubs: upsert latest tagged Club records (adds tier/systemId,
 *   pulls in newly added countries' clubs).
 * - bulkPut competitions: ensures Premier League / FA Cup rows exist for
 *   users created before Phase 2.
 * - Backfill Season.systemId on records that pre-date Phase 2 (default "de").
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

  localStorage.setItem(STORAGE_KEY, String(CLUBS_CONFIG_VERSION));
  return true;
}
