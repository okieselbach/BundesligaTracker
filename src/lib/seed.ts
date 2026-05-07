import { db, newId, type Matchday } from "./db";
import {
  ALL_CLUBS,
  INITIAL_CLUBS_BY_LEAGUE_SLUG,
  INITIAL_POOL_CLUBS_BY_TIER,
} from "@/data/clubs";
import { COMPETITIONS } from "@/data/competitions";
import {
  DEFAULT_SYSTEM_ID,
  getSystem,
  type CupConfig,
  type CupEntrantSource,
  type LeagueSystem,
} from "@/data/leagueSystems";
import { generateRoundRobinSchedule } from "./schedule";

/**
 * Resolve a list of cup-entrant sources into a flat list of club ids.
 * Used both at season seeding (initialEntrants) and is forward-compatible
 * for FA-Cup-style late entrants.
 */
export function resolveCupEntrants(
  sources: CupEntrantSource[],
  leagueClubIdsBySlug: Record<string, string[]>,
  poolClubIdsByTier: Record<string, string[]>,
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const push = (id: string) => {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  };

  for (const source of sources) {
    if (source.type === "league") {
      for (const id of leagueClubIdsBySlug[source.slug] ?? []) push(id);
    } else if (source.type === "league-top") {
      for (const id of (leagueClubIdsBySlug[source.slug] ?? []).slice(0, source.n)) push(id);
    } else if (source.type === "league-bottom") {
      const all = leagueClubIdsBySlug[source.slug] ?? [];
      for (const id of all.slice(Math.max(0, all.length - source.n))) push(id);
    } else if (source.type === "pool") {
      const ids = source.tierId
        ? poolClubIdsByTier[source.tierId] ?? []
        : Object.values(poolClubIdsByTier).flat();
      for (const id of ids.slice(0, source.count)) push(id);
    }
  }
  return result;
}

/**
 * Build the initial cup club list from a system's CupConfig + the leagues we
 * just seeded. Pool entries are taken in order from the system's tier roster.
 */
function buildInitialCupClubIds(
  cup: CupConfig,
  leagueClubIdsBySlug: Record<string, string[]>,
): string[] {
  const poolClubIdsByTier: Record<string, string[]> = {};
  for (const tierId of Object.keys(INITIAL_POOL_CLUBS_BY_TIER)) {
    poolClubIdsByTier[tierId] = INITIAL_POOL_CLUBS_BY_TIER[tierId].map((c) => c.id);
  }
  return resolveCupEntrants(cup.initialEntrants, leagueClubIdsBySlug, poolClubIdsByTier);
}

/**
 * Quick-start a fresh database with the default system.
 * No-op if any season already exists.
 */
export async function seedQuickStart(
  seasonName: string = "2025/26",
  manual: boolean = false,
  systemId: string = DEFAULT_SYSTEM_ID,
) {
  const existingSeasons = await db.seasons.count();
  if (existingSeasons > 0) return;

  const system = getSystem(systemId);

  // Add ALL_CLUBS regardless of system (each club is tagged with its systemId).
  await db.clubs.bulkPut(ALL_CLUBS);
  await db.competitions.bulkPut(COMPETITIONS);

  const seasonId = newId("s");
  await db.seasons.add({
    id: seasonId,
    name: seasonName,
    isCurrent: true,
    createdAt: Date.now(),
    systemId: system.id,
  });

  const leagueClubIdsBySlug: Record<string, string[]> = {};

  for (const league of system.leagues) {
    const clubs = INITIAL_CLUBS_BY_LEAGUE_SLUG[league.slug] ?? [];
    const clubIds = clubs.map((c) => c.id);
    leagueClubIdsBySlug[league.slug] = clubIds;
    await createLeagueSeasonCompetition({
      seasonId,
      competitionId: league.competitionId,
      clubIds,
      manual,
      matchdayLabel: system.matchdayLabel,
    });
  }

  // Cup season-competition (DFB-Pokal / FA Cup / ...)
  const cupClubIds = buildInitialCupClubIds(system.cup, leagueClubIdsBySlug);
  if (cupClubIds.length > 0) {
    await db.seasonCompetitions.add({
      id: newId("sc"),
      seasonId,
      competitionId: system.cup.competitionId,
      clubIds: cupClubIds,
      pointsWin: 3,
      pointsDraw: 1,
      pointsLoss: 0,
      hasDoubleRound: false,
      createdAt: Date.now(),
    });
  }
}

async function createLeagueSeasonCompetition(opts: {
  seasonId: string;
  competitionId: string;
  clubIds: string[];
  manual: boolean;
  matchdayLabel: string;
}) {
  const { seasonId, competitionId, clubIds, manual, matchdayLabel } = opts;
  const scId = newId("sc");

  await db.seasonCompetitions.add({
    id: scId,
    seasonId,
    competitionId,
    clubIds,
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    hasDoubleRound: true,
    createdAt: Date.now(),
  });

  if (manual) {
    // Empty matchdays — user fills in fixtures themselves.
    const n = clubIds.length % 2 === 0 ? clubIds.length - 1 : clubIds.length;
    const totalMatchdays = n * 2;
    const matchdays: Matchday[] = [];
    for (let i = 1; i <= totalMatchdays; i++) {
      matchdays.push({
        id: newId("md"),
        seasonCompetitionId: scId,
        number: i,
        name: `${matchdayLabel} ${i}`,
      });
    }
    await db.matchdays.bulkAdd(matchdays);
  } else {
    const { matchdays, matches } = generateRoundRobinSchedule({
      seasonCompetitionId: scId,
      clubIds,
      doubleRound: true,
      matchdayLabel,
    });
    await db.matchdays.bulkAdd(matchdays);
    await db.matches.bulkAdd(matches);
  }
}

export interface FullRelegationChanges {
  /** Clubs moving between leagues (direct promotions/relegations + resolved playoffs) */
  movements: { clubId: string; from: string; to: string }[];
  /** Bottom-league clubs leaving to the pool */
  thirdLeagueAbsteigerIds: string[];
  /** Pool clubs entering the bottom league */
  thirdLeagueAufsteigerIds: string[];
}

/** Create a new season. Copies club assignments from a source season, or uses seed defaults. */
export async function createSeason(opts: {
  name: string;
  makeCurrent: boolean;
  copyFromSeasonId?: string;
  manual?: boolean;
  relegationChanges?: FullRelegationChanges;
  systemId?: string;
}): Promise<string> {
  const { name, makeCurrent, copyFromSeasonId, manual, relegationChanges } = opts;
  const system: LeagueSystem = getSystem(opts.systemId ?? DEFAULT_SYSTEM_ID);

  // Ensure competitions + clubs exist
  await db.competitions.bulkPut(COMPETITIONS);
  await db.clubs.bulkPut(ALL_CLUBS);

  const seasonId = newId("s");

  if (makeCurrent) {
    const currentSeasons = await db.seasons.filter((s) => s.isCurrent).toArray();
    for (const s of currentSeasons) {
      await db.seasons.update(s.id, { isCurrent: false });
    }
  }

  await db.seasons.add({
    id: seasonId,
    name,
    isCurrent: makeCurrent,
    createdAt: Date.now(),
    systemId: system.id,
  });

  // Determine club assignments per league
  let leagueClubMap: { competitionId: string; slug: string; clubIds: string[] }[];

  if (copyFromSeasonId) {
    // Copy from existing season — preserve system layout
    const sourceSCs = await db.seasonCompetitions
      .where("seasonId")
      .equals(copyFromSeasonId)
      .toArray();

    leagueClubMap = system.leagues
      .map((league) => {
        const sourceSC = sourceSCs.find((sc) => sc.competitionId === league.competitionId);
        return {
          competitionId: league.competitionId,
          slug: league.slug,
          clubIds: sourceSC ? [...sourceSC.clubIds] : [],
        };
      })
      .filter((entry) => entry.clubIds.length > 0);

    // Apply relegation changes if provided
    if (relegationChanges) {
      // Inter-league movements (promotions, relegations, resolved playoffs)
      for (const mv of relegationChanges.movements) {
        const fromEntry = leagueClubMap.find((e) => e.slug === mv.from);
        const toEntry = leagueClubMap.find((e) => e.slug === mv.to);
        if (fromEntry && toEntry) {
          fromEntry.clubIds = fromEntry.clubIds.filter((id) => id !== mv.clubId);
          toEntry.clubIds.push(mv.clubId);
        }
      }

      // Bottom-league ↔ pool exchange
      const bottomLeague = system.leagues[system.leagues.length - 1];
      if (bottomLeague && relegationChanges.thirdLeagueAbsteigerIds.length > 0) {
        const entry = leagueClubMap.find((e) => e.slug === bottomLeague.slug);
        if (entry) {
          entry.clubIds = entry.clubIds.filter(
            (id) => !relegationChanges.thirdLeagueAbsteigerIds.includes(id),
          );
          entry.clubIds.push(...relegationChanges.thirdLeagueAufsteigerIds);
        }
      }
    }
  } else {
    // Use seed defaults: each league gets its initial roster
    leagueClubMap = system.leagues.map((league) => ({
      competitionId: league.competitionId,
      slug: league.slug,
      clubIds: (INITIAL_CLUBS_BY_LEAGUE_SLUG[league.slug] ?? []).map((c) => c.id),
    }));
  }

  // Create league season-competitions + schedules
  const leagueClubIdsBySlug: Record<string, string[]> = {};
  for (const entry of leagueClubMap) {
    leagueClubIdsBySlug[entry.slug] = entry.clubIds;
    await createLeagueSeasonCompetition({
      seasonId,
      competitionId: entry.competitionId,
      clubIds: entry.clubIds,
      manual: !!manual,
      matchdayLabel: system.matchdayLabel,
    });
  }

  // Cup: rebuild from final league compositions + remaining pool clubs.
  // Pool excludes any club currently assigned to an active league (avoids the
  // bug where a promoted Regionalliga team ends up double-counted).
  const allLeagueClubIds = new Set(leagueClubMap.flatMap((e) => e.clubIds));
  const poolClubIdsByTier: Record<string, string[]> = {};
  for (const tier of system.poolTiers) {
    poolClubIdsByTier[tier.id] = (INITIAL_POOL_CLUBS_BY_TIER[tier.id] ?? [])
      .map((c) => c.id)
      .filter((id) => !allLeagueClubIds.has(id));
  }
  const cupClubIds = resolveCupEntrants(
    system.cup.initialEntrants,
    leagueClubIdsBySlug,
    poolClubIdsByTier,
  );

  if (cupClubIds.length > 0) {
    await db.seasonCompetitions.add({
      id: newId("sc"),
      seasonId,
      competitionId: system.cup.competitionId,
      clubIds: cupClubIds,
      pointsWin: 3,
      pointsDraw: 1,
      pointsLoss: 0,
      hasDoubleRound: false,
      createdAt: Date.now(),
    });
  }

  return seasonId;
}

export async function deleteSeason(seasonId: string): Promise<void> {
  const scs = await db.seasonCompetitions
    .where("seasonId")
    .equals(seasonId)
    .toArray();

  const scIds = scs.map((sc) => sc.id);

  await db.transaction("rw", [db.seasons, db.seasonCompetitions, db.matchdays, db.matches, db.cupRounds], async () => {
    for (const scId of scIds) {
      const matches = await db.matches.where("seasonCompetitionId").equals(scId).toArray();
      for (const m of matches) await db.matches.delete(m.id);

      const mds = await db.matchdays.where("seasonCompetitionId").equals(scId).toArray();
      for (const md of mds) await db.matchdays.delete(md.id);

      const rounds = await db.cupRounds.where("seasonCompetitionId").equals(scId).toArray();
      for (const r of rounds) await db.cupRounds.delete(r.id);

      await db.seasonCompetitions.delete(scId);
    }

    await db.seasons.delete(seasonId);
  });
}

export async function hasData(): Promise<boolean> {
  const count = await db.seasons.count();
  return count > 0;
}
