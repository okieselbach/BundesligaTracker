/**
 * Helpers for resolving the league system that owns a club, competition, or
 * season. Existing data has no `systemId` field on records (apart from
 * `Club.systemId`); we infer the system from competition slugs that are
 * known statically.
 */

import { COMPETITIONS } from "@/data/competitions";
import {
  DEFAULT_SYSTEM_ID,
  LEAGUE_SYSTEMS,
  getLeagueRules,
  getSystem,
  getSystemByCompetitionSlug,
  type LeagueSystem,
  type PositionSpec,
  type ZoneRule,
} from "@/data/leagueSystems";
import type { Competition, Id } from "./db";

export {
  DEFAULT_SYSTEM_ID,
  LEAGUE_SYSTEMS,
  getLeagueRules,
  getSystem,
  getSystemByCompetitionSlug,
};
export type { LeagueSystem, PositionSpec, ZoneRule };

/** Resolve the system from a competition record (by its slug). */
export function getSystemFromCompetition(
  competition: Competition,
): LeagueSystem {
  return getSystemByCompetitionSlug(competition.slug) ?? getSystem(DEFAULT_SYSTEM_ID);
}

/** Resolve the system that owns a competition by its id. */
export function getSystemFromCompetitionId(competitionId: Id): LeagueSystem {
  const comp = COMPETITIONS.find((c) => c.id === competitionId);
  if (!comp) return getSystem(DEFAULT_SYSTEM_ID);
  return getSystemFromCompetition(comp);
}

/** Ordered league competition slugs for a system, top to bottom. */
export function getLeagueOrder(systemId: string = DEFAULT_SYSTEM_ID): string[] {
  return getSystem(systemId).leagues.map((l) => l.slug);
}

/**
 * Resolve a position spec against a concrete league size into the actual
 * 1-based positions the spec covers.
 */
export function resolvePositions(
  spec: PositionSpec,
  totalTeams: number,
): number[] {
  if (spec.kind === "exact") return [...spec.positions];
  // fromEnd: last N positions
  const result: number[] = [];
  for (let i = totalTeams - spec.count + 1; i <= totalTeams; i++) {
    if (i >= 1) result.push(i);
  }
  return result;
}

/** Does a position spec cover the given 1-based position? */
export function positionMatches(
  spec: PositionSpec,
  position: number,
  totalTeams: number,
): boolean {
  return resolvePositions(spec, totalTeams).includes(position);
}
