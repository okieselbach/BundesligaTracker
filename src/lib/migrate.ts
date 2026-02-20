import { db } from "./db";
import { CLUBS_CONFIG_VERSION, ALL_CLUBS } from "@/data/clubs";

const STORAGE_KEY = "clubs_config_v";

export async function migrateClubsIfNeeded(): Promise<boolean> {
  const stored = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0");
  if (CLUBS_CONFIG_VERSION <= stored) return false;

  // bulkPut = upsert: updates existing clubs, adds new ones, removes nothing.
  // Matches, seasons and standings are untouched.
  await db.clubs.bulkPut(ALL_CLUBS);
  localStorage.setItem(STORAGE_KEY, String(CLUBS_CONFIG_VERSION));
  return true;
}
