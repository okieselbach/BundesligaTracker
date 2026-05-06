import type { Id, Match, Matchday, SeasonCompetition } from "./db";
import { getSystemByCompetitionSlug, positionMatches } from "./leagueSystem";

export type MatchResult = "W" | "D" | "L";

/**
 * Returns up to the last `count` finished league matches for a club, in
 * chronological order (oldest first). A match is "finished" when both goal
 * fields are numeric. Sort key is the matchday number, so this keeps working
 * even when results are entered out of order.
 */
export function computeRecentResults(
  clubId: Id,
  matches: Match[],
  matchdays: Matchday[],
  count = 5,
): MatchResult[] {
  const mdNumber = new Map(matchdays.map((md) => [md.id, md.number]));

  const played = matches
    .filter(
      (m) =>
        (m.homeClubId === clubId || m.awayClubId === clubId) &&
        typeof m.homeGoals === "number" &&
        typeof m.awayGoals === "number",
    )
    .sort((a, b) => {
      const an = a.matchdayId ? mdNumber.get(a.matchdayId) ?? 0 : 0;
      const bn = b.matchdayId ? mdNumber.get(b.matchdayId) ?? 0 : 0;
      return an - bn;
    });

  return played.slice(-count).map((m) => {
    const isHome = m.homeClubId === clubId;
    const my = (isHome ? m.homeGoals : m.awayGoals) as number;
    const opp = (isHome ? m.awayGoals : m.homeGoals) as number;
    if (my > opp) return "W";
    if (my < opp) return "L";
    return "D";
  });
}

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

/**
 * Determine the zone (CL, abstieg, ...) for a given table position by reading
 * the rules of the league's owning system. Unknown competitions return null.
 */
export function getZone(competitionSlug: string, position: number, totalTeams: number): ZoneType {
  const system = getSystemByCompetitionSlug(competitionSlug);
  if (!system) return null;
  const league = system.leagues.find((l) => l.slug === competitionSlug);
  if (!league) return null;

  for (const rule of league.zones) {
    if (positionMatches(rule.positions, position, totalTeams)) {
      return rule.type;
    }
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
