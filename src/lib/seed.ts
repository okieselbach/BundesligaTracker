import { db, newId, type Matchday } from "./db";
import { CLUBS_1BL, CLUBS_2BL, CLUBS_3BL, CLUBS_REGIONALLIGA } from "@/data/clubs";
import { COMPETITIONS } from "@/data/competitions";
import { generateRoundRobinSchedule } from "./schedule";

// Only the first 8 Regionalliga clubs are used for the DFB-Pokal (to get 64 total)
const POKAL_REGIONALLIGA_COUNT = 8;

export async function seedQuickStart(seasonName: string = "2025/26", manual: boolean = false) {
  const existingSeasons = await db.seasons.count();
  if (existingSeasons > 0) return;

  // Add all clubs to DB (all leagues + full Regionalliga pool)
  const allClubs = [...CLUBS_1BL, ...CLUBS_2BL, ...CLUBS_3BL, ...CLUBS_REGIONALLIGA];
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

  // DFB Pokal: 56 Liga-Clubs + 8 Regionalliga = 64 Teams
  const dfbComp = COMPETITIONS[3];
  const dfbScId = newId("sc");
  const ligaClubIds = [...CLUBS_1BL, ...CLUBS_2BL, ...CLUBS_3BL].map((c) => c.id);
  const pokalRegionalliga = CLUBS_REGIONALLIGA.slice(0, POKAL_REGIONALLIGA_COUNT).map((c) => c.id);
  const dfbClubIds = [...ligaClubIds, ...pokalRegionalliga];

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
  thirdLeagueChanges?: { absteigerIds: string[]; aufsteigerIds: string[] };
}): Promise<string> {
  const { name, makeCurrent, copyFromSeasonId, manual, thirdLeagueChanges } = opts;

  // Ensure competitions + clubs exist (including new Regionalliga clubs)
  await db.competitions.bulkPut(COMPETITIONS);
  const allClubs = [...CLUBS_1BL, ...CLUBS_2BL, ...CLUBS_3BL, ...CLUBS_REGIONALLIGA];
  await db.clubs.bulkPut(allClubs);

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

    // Apply 3. Liga changes if provided
    if (thirdLeagueChanges && thirdLeagueChanges.absteigerIds.length > 0) {
      const thirdLigaComp = COMPETITIONS.find((c) => c.slug === "3-liga");
      if (thirdLigaComp) {
        const entry = leagueClubMap.find((e) => e.compId === thirdLigaComp.id);
        if (entry) {
          // Remove Absteiger
          entry.clubIds = entry.clubIds.filter(
            (id) => !thirdLeagueChanges.absteigerIds.includes(id),
          );
          // Add Aufsteiger
          entry.clubIds.push(...thirdLeagueChanges.aufsteigerIds);
        }
      }
    }

    const dfbSC = sourceSCs.find((sc) => sc.competitionId === "comp_dfb");
    dfbClubIds = dfbSC ? [...dfbSC.clubIds] : [];

    // Apply 3. Liga changes to DFB-Pokal too
    if (thirdLeagueChanges && thirdLeagueChanges.absteigerIds.length > 0) {
      dfbClubIds = dfbClubIds.filter(
        (id) => !thirdLeagueChanges.absteigerIds.includes(id),
      );
      for (const aufId of thirdLeagueChanges.aufsteigerIds) {
        if (!dfbClubIds.includes(aufId)) {
          dfbClubIds.push(aufId);
        }
      }
    }
  } else {
    // Use seed defaults
    leagueClubMap = [
      { compId: COMPETITIONS[0].id, clubIds: CLUBS_1BL.map((c) => c.id) },
      { compId: COMPETITIONS[1].id, clubIds: CLUBS_2BL.map((c) => c.id) },
      { compId: COMPETITIONS[2].id, clubIds: CLUBS_3BL.map((c) => c.id) },
    ];
    const ligaIds = [...CLUBS_1BL, ...CLUBS_2BL, ...CLUBS_3BL].map((c) => c.id);
    const pokalRegionalliga = CLUBS_REGIONALLIGA.slice(0, POKAL_REGIONALLIGA_COUNT).map((c) => c.id);
    dfbClubIds = [...ligaIds, ...pokalRegionalliga];
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
