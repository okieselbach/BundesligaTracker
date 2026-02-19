import { db, newId, type Matchday } from "./db";
import { CLUBS_1BL, CLUBS_2BL, CLUBS_3BL, CLUBS_POKAL_EXTRA } from "@/data/clubs";
import { COMPETITIONS } from "@/data/competitions";
import { generateRoundRobinSchedule } from "./schedule";

export async function seedQuickStart(seasonName: string = "2025/26", manual: boolean = false) {
  const existingSeasons = await db.seasons.count();
  if (existingSeasons > 0) return;

  // Add all clubs (18 BL1 + 18 BL2 + 20 Liga3 + 8 Pokal-Amateure = 64)
  const allClubs = [...CLUBS_1BL, ...CLUBS_2BL, ...CLUBS_3BL, ...CLUBS_POKAL_EXTRA];
  await db.clubs.bulkPut(allClubs);

  await db.competitions.bulkPut(COMPETITIONS);

  const seasonId = newId("s");
  await db.seasons.add({
    id: seasonId,
    name: seasonName,
    isCurrent: true,
    createdAt: Date.now(),
  });

  // Create league season-competitions + schedules
  const leagueConfigs = [
    { comp: COMPETITIONS[0], clubs: CLUBS_1BL },
    { comp: COMPETITIONS[1], clubs: CLUBS_2BL },
    { comp: COMPETITIONS[2], clubs: CLUBS_3BL },
  ];

  for (const { comp, clubs } of leagueConfigs) {
    const scId = newId("sc");
    const clubIds = clubs.map((c) => c.id);

    await db.seasonCompetitions.add({
      id: scId,
      seasonId,
      competitionId: comp.id,
      clubIds,
      pointsWin: 3,
      pointsDraw: 1,
      pointsLoss: 0,
      hasDoubleRound: true,
      createdAt: Date.now(),
    });

    if (manual) {
      // Create empty matchdays (no matches) for manual input
      const n = clubIds.length % 2 === 0 ? clubIds.length - 1 : clubIds.length;
      const totalMatchdays = n * 2; // Hin + Rueckrunde
      const matchdays: Matchday[] = [];
      for (let i = 1; i <= totalMatchdays; i++) {
        matchdays.push({
          id: newId("md"),
          seasonCompetitionId: scId,
          number: i,
          name: `Spieltag ${i}`,
        });
      }
      await db.matchdays.bulkAdd(matchdays);
    } else {
      const { matchdays, matches } = generateRoundRobinSchedule({
        seasonCompetitionId: scId,
        clubIds,
        doubleRound: true,
      });

      await db.matchdays.bulkAdd(matchdays);
      await db.matches.bulkAdd(matches);
    }
  }

  // DFB Pokal: alle 64 Teams (18 BL1 + 18 BL2 + 20 Liga3 + 8 Pokal-Amateure)
  const dfbComp = COMPETITIONS[3];
  const dfbScId = newId("sc");
  const dfbClubIds = allClubs.map((c) => c.id);

  await db.seasonCompetitions.add({
    id: dfbScId,
    seasonId,
    competitionId: dfbComp.id,
    clubIds: dfbClubIds,
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    hasDoubleRound: false,
    createdAt: Date.now(),
  });
}

/** Create a new season. Copies club assignments from a source season, or uses seed defaults. */
export async function createSeason(opts: {
  name: string;
  makeCurrent: boolean;
  copyFromSeasonId?: string;
  manual?: boolean;
}): Promise<string> {
  const { name, makeCurrent, copyFromSeasonId, manual } = opts;

  // Ensure competitions + clubs exist
  await db.competitions.bulkPut(COMPETITIONS);

  const seasonId = newId("s");

  if (makeCurrent) {
    // Un-mark any existing current season
    const currentSeasons = await db.seasons.where("isCurrent").equals(1).toArray();
    for (const s of currentSeasons) {
      await db.seasons.update(s.id, { isCurrent: false });
    }
  }

  await db.seasons.add({
    id: seasonId,
    name,
    isCurrent: makeCurrent,
    createdAt: Date.now(),
  });

  // Determine club assignments per competition
  let leagueClubMap: { compId: string; clubIds: string[] }[];
  let dfbClubIds: string[];

  if (copyFromSeasonId) {
    // Copy from existing season
    const sourceSCs = await db.seasonCompetitions
      .where("seasonId")
      .equals(copyFromSeasonId)
      .toArray();

    leagueClubMap = sourceSCs
      .filter((sc) => {
        const comp = COMPETITIONS.find((c) => c.id === sc.competitionId);
        return comp?.type === "league";
      })
      .map((sc) => ({ compId: sc.competitionId, clubIds: [...sc.clubIds] }));

    const dfbSC = sourceSCs.find((sc) => sc.competitionId === "comp_dfb");
    dfbClubIds = dfbSC ? [...dfbSC.clubIds] : [];
  } else {
    // Use seed defaults
    const allClubs = [...CLUBS_1BL, ...CLUBS_2BL, ...CLUBS_3BL, ...CLUBS_POKAL_EXTRA];
    await db.clubs.bulkPut(allClubs);

    leagueClubMap = [
      { compId: COMPETITIONS[0].id, clubIds: CLUBS_1BL.map((c) => c.id) },
      { compId: COMPETITIONS[1].id, clubIds: CLUBS_2BL.map((c) => c.id) },
      { compId: COMPETITIONS[2].id, clubIds: CLUBS_3BL.map((c) => c.id) },
    ];
    dfbClubIds = allClubs.map((c) => c.id);
  }

  // Create league season-competitions + schedules
  for (const { compId, clubIds } of leagueClubMap) {
    const scId = newId("sc");
    await db.seasonCompetitions.add({
      id: scId,
      seasonId,
      competitionId: compId,
      clubIds,
      pointsWin: 3,
      pointsDraw: 1,
      pointsLoss: 0,
      hasDoubleRound: true,
      createdAt: Date.now(),
    });

    if (manual) {
      // Create empty matchdays for manual input
      const n = clubIds.length % 2 === 0 ? clubIds.length - 1 : clubIds.length;
      const totalMatchdays = n * 2;
      const matchdays: Matchday[] = [];
      for (let i = 1; i <= totalMatchdays; i++) {
        matchdays.push({
          id: newId("md"),
          seasonCompetitionId: scId,
          number: i,
          name: `Spieltag ${i}`,
        });
      }
      await db.matchdays.bulkAdd(matchdays);
    } else {
      const { matchdays, matches } = generateRoundRobinSchedule({
        seasonCompetitionId: scId,
        clubIds,
        doubleRound: true,
      });

      await db.matchdays.bulkAdd(matchdays);
      await db.matches.bulkAdd(matches);
    }
  }

  // DFB Pokal
  if (dfbClubIds.length > 0) {
    const dfbScId = newId("sc");
    await db.seasonCompetitions.add({
      id: dfbScId,
      seasonId,
      competitionId: "comp_dfb",
      clubIds: dfbClubIds,
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
