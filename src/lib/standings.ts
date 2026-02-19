import type { Id, Match, SeasonCompetition } from "./db";

export interface StandingRow {
  clubId: Id;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export function computeStandings(
  seasonComp: SeasonCompetition,
  matches: Match[],
): StandingRow[] {
  const w = seasonComp.pointsWin;
  const d = seasonComp.pointsDraw;
  const l = seasonComp.pointsLoss;

  const map = new Map<Id, StandingRow>();
  for (const clubId of seasonComp.clubIds) {
    map.set(clubId, {
      clubId,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    });
  }

  for (const m of matches) {
    if (typeof m.homeGoals !== "number" || typeof m.awayGoals !== "number") continue;
    const home = map.get(m.homeClubId);
    const away = map.get(m.awayClubId);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += m.homeGoals;
    home.goalsAgainst += m.awayGoals;
    away.goalsFor += m.awayGoals;
    away.goalsAgainst += m.homeGoals;

    if (m.homeGoals > m.awayGoals) {
      home.wins++;
      away.losses++;
      home.points += w;
      away.points += l;
    } else if (m.homeGoals < m.awayGoals) {
      away.wins++;
      home.losses++;
      away.points += w;
      home.points += l;
    } else {
      home.draws++;
      away.draws++;
      home.points += d;
      away.points += d;
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

export type ZoneType = "cl" | "cl-quali" | "el" | "ecl" | "relegation" | "abstieg" | "aufstieg" | "aufstieg-relegation" | "abstieg-markiert" | null;

export function getZone(competitionSlug: string, position: number, totalTeams: number): ZoneType {
  if (competitionSlug === "1-bundesliga") {
    if (position <= 4) return "cl";
    if (position === 5) return "el";
    if (position === 6) return "ecl";
    if (position === 16) return "relegation";
    if (position >= 17) return "abstieg";
  }
  if (competitionSlug === "2-bundesliga") {
    if (position <= 2) return "aufstieg";
    if (position === 3) return "aufstieg-relegation";
    if (position === 16) return "relegation";
    if (position >= 17) return "abstieg";
  }
  if (competitionSlug === "3-liga") {
    if (position <= 2) return "aufstieg";
    if (position === 3) return "aufstieg-relegation";
    if (position >= totalTeams - 3) return "abstieg-markiert";
  }
  return null;
}

export function getZoneColor(zone: ZoneType): string {
  switch (zone) {
    case "cl": return "bg-[#1a9fe0]";
    case "cl-quali": return "bg-[#1a9fe0]";
    case "el": return "bg-[#f7a600]";
    case "ecl": return "bg-[#5dbe28]";
    case "aufstieg": return "bg-[#5dbe28]";
    case "aufstieg-relegation": return "bg-[#f7a600]";
    case "relegation": return "bg-[#f7a600]";
    case "abstieg": return "bg-[#e63e30]";
    case "abstieg-markiert": return "bg-[#e63e30]/50";
    default: return "";
  }
}

export function getZoneLabel(zone: ZoneType): string {
  switch (zone) {
    case "cl": return "Champions League";
    case "cl-quali": return "CL-Qualifikation";
    case "el": return "Europa League";
    case "ecl": return "Conference League";
    case "aufstieg": return "Aufstieg";
    case "aufstieg-relegation": return "Relegation (Aufstieg)";
    case "relegation": return "Relegation (Abstieg)";
    case "abstieg": return "Abstieg";
    case "abstieg-markiert": return "Abstiegsplätze (markiert)";
    default: return "";
  }
}
