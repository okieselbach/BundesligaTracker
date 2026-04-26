import type { Id } from "./db";
import type { StandingRow } from "./standings";
import { getSystem, type LeagueSystem } from "./leagueSystem";
import { DEFAULT_SYSTEM_ID } from "@/data/leagueSystems";

export interface RelegationProposal {
  directPromotions: { clubId: Id; from: string; to: string }[];
  directRelegations: { clubId: Id; from: string; to: string }[];
  relegationMatches: {
    higher: { clubId: Id; league: string; position: number };
    lower: { clubId: Id; league: string; position: number };
  }[];
  /** Bottom-league clubs that drop to the pool (the user picks the replacements). */
  markedAbstiegPool: Id[];
}

/**
 * Compute auto-promotion / auto-relegation movements between every adjacent
 * pair of leagues in a system, plus pool exchanges from the bottom league.
 *
 * Returns empty arrays for any league that has no recorded matches yet
 * (so a freshly-created season can still be copied without producing noise).
 */
export function computeRelegationProposal(params: {
  systemId?: string;
  /** Standings keyed by competition slug. Missing or empty = league not played. */
  standingsBySlug: Record<string, StandingRow[]>;
}): RelegationProposal {
  const system = getSystem(params.systemId ?? DEFAULT_SYSTEM_ID);
  const { standingsBySlug } = params;

  const directPromotions: RelegationProposal["directPromotions"] = [];
  const directRelegations: RelegationProposal["directRelegations"] = [];
  const relegationMatches: RelegationProposal["relegationMatches"] = [];
  const markedAbstiegPool: Id[] = [];

  // Walk pairs of adjacent leagues (top→bottom) and apply each league's rules.
  for (let i = 0; i < system.leagues.length; i++) {
    const league = system.leagues[i];
    const lower = system.leagues[i + 1]; // next league down (may be undefined if bottom)
    const standings = standingsBySlug[league.slug] ?? [];
    if (standings.length === 0) continue;

    // Direct relegation to next-lower league
    if (lower) {
      const lowerStandings = standingsBySlug[lower.slug] ?? [];
      for (const pos of league.directRelegationPositions) {
        if (standings.length >= pos) {
          directRelegations.push({
            clubId: standings[pos - 1].clubId,
            from: league.slug,
            to: lower.slug,
          });
        }
      }

      // Relegation playoff: this league's `thisPos` vs lower's `lowerPos`
      const playoff = league.relegationPlayoff;
      if (
        playoff &&
        standings.length >= playoff.thisPos &&
        lowerStandings.length >= playoff.lowerPos
      ) {
        relegationMatches.push({
          higher: {
            clubId: standings[playoff.thisPos - 1].clubId,
            league: league.slug,
            position: playoff.thisPos,
          },
          lower: {
            clubId: lowerStandings[playoff.lowerPos - 1].clubId,
            league: lower.slug,
            position: playoff.lowerPos,
          },
        });
      }
    }

    // Direct promotion from a lower league: handled by the lower league's own
    // directPromotionPositions, which point UP to this league. We process them
    // when we visit the lower league in this loop.
    for (const pos of league.directPromotionPositions) {
      const higher = system.leagues[i - 1];
      if (!higher) continue; // top league has no promotion target
      if (standings.length >= pos) {
        directPromotions.push({
          clubId: standings[pos - 1].clubId,
          from: league.slug,
          to: higher.slug,
        });
      }
    }

    // Bottom-league → pool exchange (e.g. 3.Liga last 4 are marked, user picks 4 from pool)
    if (!lower && league.toPoolPositions) {
      const poolDropPositions = resolvePositionsForLeague(league.toPoolPositions, standings.length);
      for (const pos of poolDropPositions) {
        if (standings.length >= pos) {
          markedAbstiegPool.push(standings[pos - 1].clubId);
        }
      }
    }
  }

  return { directPromotions, directRelegations, relegationMatches, markedAbstiegPool };
}

function resolvePositionsForLeague(
  spec: import("./leagueSystem").PositionSpec,
  totalTeams: number,
): number[] {
  if (spec.kind === "exact") return [...spec.positions];
  const result: number[] = [];
  for (let i = totalTeams - spec.count + 1; i <= totalTeams; i++) {
    if (i >= 1) result.push(i);
  }
  return result;
}

/** Re-export for legacy callers that need the system. */
export type { LeagueSystem };
