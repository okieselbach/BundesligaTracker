/**
 * League system configuration.
 *
 * Each system describes one country's football setup: which leagues exist,
 * how promotion/relegation works between them, how the cup is drawn, and
 * what pool tiers feed the cup and bottom-league exchange.
 *
 * The German Bundesliga system is the original. Future systems (England,
 * Spain, Italy) plug in here without changes to the core logic.
 */

export type ZoneType =
  | "cl"
  | "cl-quali"
  | "el"
  | "ecl"
  | "relegation"
  | "abstieg"
  | "aufstieg"
  | "aufstieg-relegation"
  | "abstieg-markiert";

/** A range of table positions, e.g. [1, 4] = positions 1..4 inclusive. */
export type PositionSpec =
  | { kind: "exact"; positions: number[] }
  | { kind: "fromEnd"; count: number }; // last N positions (handles variable-size leagues)

export interface ZoneRule {
  positions: PositionSpec;
  type: ZoneType;
}

/** Promotion/relegation rules for a single league within a system. */
export interface LeagueRules {
  competitionId: string;
  slug: string;
  zones: ZoneRule[];
  /** Direct relegation to next-lower league (positions). Empty if none. */
  directRelegationPositions: number[];
  /** Optional relegation playoff against the league below. */
  relegationPlayoff?: { thisPos: number; lowerPos: number };
  /** Direct promotion from this league to next-higher league (positions). */
  directPromotionPositions: number[];
  /** Optional promotion playoff against the league above. */
  promotionPlayoff?: { thisPos: number; higherPos: number };
  /** For the bottom league only: positions that drop to the pool. */
  toPoolPositions?: PositionSpec;
}

export interface PoolTier {
  id: string;
  name: string;
  shortName: string;
}

/** Where a group of cup entrants comes from. */
export type CupEntrantSource =
  | { type: "league"; slug: string }
  | { type: "league-top"; slug: string; n: number }
  | { type: "league-bottom"; slug: string; n: number }
  | { type: "pool"; tierId?: string; count: number };

/** A pot definition for a specific cup round. */
export interface CupPot {
  /** Sources that fill this pot. */
  sources: CupEntrantSource[];
}

/** Cup drawing strategy for one round. */
export type CupDraw =
  | { type: "free" }
  | {
      type: "pots";
      /** Pot 1 = home advantage (lower-tier). Pot 2 = away (higher-tier). */
      pot1: CupPot;
      pot2: CupPot;
      /** If true, "rest" semantics: pot1 = everyone not in pot2. */
      pot1IsRest?: boolean;
    };

/** A single round in the cup. */
export interface CupRoundDef {
  number: number;
  name: string;
  draw: CupDraw;
}

export interface CupConfig {
  competitionId: string;
  slug: string;
  /** Total teams entering the cup (sum of initial entrants). */
  totalTeams: number;
  /** Where the cup teams come from at start. */
  initialEntrants: CupEntrantSource[];
  /** Optional late entrants for specific rounds (e.g. FA Cup R3 = PL+Champ). */
  lateEntrants?: { [roundNumber: number]: CupEntrantSource[] };
  rounds: CupRoundDef[];
}

export interface LeagueSystem {
  id: string;
  name: string;
  flag: string;
  /** Active leagues, ordered top-to-bottom. */
  leagues: LeagueRules[];
  /** Pool tier definitions (clubs not in any active league). */
  poolTiers: PoolTier[];
  /** Number of clubs exchanged between bottom league and pool each season. */
  poolExchangeCount: number;
  cup: CupConfig;
  /** Label used for matchdays in this country ("Spieltag", "Matchday"). */
  matchdayLabel: string;
  /** Heading shown above the trophy on the cup-winner screen ("Pokalsieger"). */
  cupWinnerLabel: string;
}

// ---------------------------------------------------------------------------
// 🇩🇪 Deutschland
// ---------------------------------------------------------------------------

const GERMAN_SYSTEM: LeagueSystem = {
  id: "de",
  name: "Deutschland",
  flag: "🇩🇪",
  matchdayLabel: "Spieltag",
  cupWinnerLabel: "Pokalsieger",
  leagues: [
    {
      competitionId: "comp_1bl",
      slug: "1-bundesliga",
      zones: [
        { positions: { kind: "exact", positions: [1, 2, 3, 4] }, type: "cl" },
        { positions: { kind: "exact", positions: [5] }, type: "el" },
        { positions: { kind: "exact", positions: [6] }, type: "ecl" },
        { positions: { kind: "exact", positions: [16] }, type: "relegation" },
        { positions: { kind: "exact", positions: [17, 18] }, type: "abstieg" },
      ],
      directRelegationPositions: [17, 18],
      relegationPlayoff: { thisPos: 16, lowerPos: 3 },
      directPromotionPositions: [],
    },
    {
      competitionId: "comp_2bl",
      slug: "2-bundesliga",
      zones: [
        { positions: { kind: "exact", positions: [1, 2] }, type: "aufstieg" },
        { positions: { kind: "exact", positions: [3] }, type: "aufstieg-relegation" },
        { positions: { kind: "exact", positions: [16] }, type: "relegation" },
        { positions: { kind: "exact", positions: [17, 18] }, type: "abstieg" },
      ],
      directRelegationPositions: [17, 18],
      relegationPlayoff: { thisPos: 16, lowerPos: 3 },
      directPromotionPositions: [1, 2],
      promotionPlayoff: { thisPos: 3, higherPos: 16 },
    },
    {
      competitionId: "comp_3bl",
      slug: "3-liga",
      zones: [
        { positions: { kind: "exact", positions: [1, 2] }, type: "aufstieg" },
        { positions: { kind: "exact", positions: [3] }, type: "aufstieg-relegation" },
        { positions: { kind: "fromEnd", count: 4 }, type: "abstieg-markiert" },
      ],
      directRelegationPositions: [],
      directPromotionPositions: [1, 2],
      promotionPlayoff: { thisPos: 3, higherPos: 16 },
      toPoolPositions: { kind: "fromEnd", count: 4 },
    },
  ],
  poolTiers: [
    { id: "regionalliga", name: "Regionalliga", shortName: "RL" },
  ],
  poolExchangeCount: 4,
  cup: {
    competitionId: "comp_dfb",
    slug: "dfb-pokal",
    totalTeams: 64,
    initialEntrants: [
      { type: "league", slug: "1-bundesliga" },
      { type: "league", slug: "2-bundesliga" },
      { type: "league", slug: "3-liga" },
      { type: "pool", tierId: "regionalliga", count: 8 },
    ],
    rounds: [
      {
        number: 1,
        name: "1. Runde",
        draw: {
          type: "pots",
          pot2: {
            sources: [
              { type: "league", slug: "1-bundesliga" },
              { type: "league-top", slug: "2-bundesliga", n: 14 },
            ],
          },
          pot1: { sources: [] },
          pot1IsRest: true,
        },
      },
      {
        number: 2,
        name: "2. Runde",
        draw: {
          type: "pots",
          pot2: {
            sources: [
              { type: "league", slug: "1-bundesliga" },
              { type: "league", slug: "2-bundesliga" },
            ],
          },
          pot1: { sources: [] },
          pot1IsRest: true,
        },
      },
      { number: 3, name: "Achtelfinale", draw: { type: "free" } },
      { number: 4, name: "Viertelfinale", draw: { type: "free" } },
      { number: 5, name: "Halbfinale", draw: { type: "free" } },
      { number: 6, name: "Finale", draw: { type: "free" } },
    ],
  },
};

// ---------------------------------------------------------------------------
// 🇬🇧 England
// ---------------------------------------------------------------------------

const ENGLISH_SYSTEM: LeagueSystem = {
  id: "en",
  name: "England",
  flag: "🇬🇧",
  matchdayLabel: "Matchday",
  cupWinnerLabel: "Cup Winner",
  leagues: [
    {
      competitionId: "comp_pl",
      slug: "premier-league",
      zones: [
        { positions: { kind: "exact", positions: [1, 2, 3, 4] }, type: "cl" },
        { positions: { kind: "exact", positions: [5] }, type: "el" },
        { positions: { kind: "exact", positions: [6] }, type: "ecl" },
        { positions: { kind: "exact", positions: [18, 19, 20] }, type: "abstieg" },
      ],
      directRelegationPositions: [], // Premier League drops straight into the pool
      directPromotionPositions: [],
      // toPoolPositions handled implicitly: bottom league exchange uses
      // directRelegationPositions when no toPoolPositions is set, but our
      // pool exchange logic treats the bottom league specially.
      toPoolPositions: { kind: "exact", positions: [18, 19, 20] },
    },
  ],
  poolTiers: [
    { id: "championship", name: "Championship", shortName: "Champ" },
    { id: "league-one", name: "League One", shortName: "L1" },
    { id: "league-two", name: "League Two", shortName: "L2" },
    { id: "non-league", name: "Non-League", shortName: "NL" },
  ],
  poolExchangeCount: 3,
  cup: {
    competitionId: "comp_facup",
    slug: "fa-cup",
    // R1 = 80 teams (48 EFL + 32 Non-League stand-ins). PL + Championship
    // join at R3 via lateEntrants.
    totalTeams: 80,
    initialEntrants: [
      { type: "pool", tierId: "league-one", count: 24 },
      { type: "pool", tierId: "league-two", count: 24 },
      { type: "pool", tierId: "non-league", count: 32 },
    ],
    lateEntrants: {
      3: [
        { type: "league", slug: "premier-league" },
        { type: "pool", tierId: "championship", count: 24 },
      ],
    },
    rounds: [
      { number: 1, name: "Round 1", draw: { type: "free" } },
      { number: 2, name: "Round 2", draw: { type: "free" } },
      { number: 3, name: "Round 3", draw: { type: "free" } },
      { number: 4, name: "Round 4", draw: { type: "free" } },
      { number: 5, name: "Round 5", draw: { type: "free" } },
      { number: 6, name: "Quarter-Final", draw: { type: "free" } },
      { number: 7, name: "Semi-Final", draw: { type: "free" } },
      { number: 8, name: "Final", draw: { type: "free" } },
    ],
  },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const LEAGUE_SYSTEMS: LeagueSystem[] = [GERMAN_SYSTEM, ENGLISH_SYSTEM];

/** Default system used when no explicit choice has been made. */
export const DEFAULT_SYSTEM_ID = "de";

export function getSystem(id: string = DEFAULT_SYSTEM_ID): LeagueSystem {
  const system = LEAGUE_SYSTEMS.find((s) => s.id === id);
  if (!system) {
    throw new Error(`Unknown league system: ${id}`);
  }
  return system;
}

/** Look up the system that owns a competition by its slug. */
export function getSystemByCompetitionSlug(slug: string): LeagueSystem | undefined {
  return LEAGUE_SYSTEMS.find(
    (s) =>
      s.leagues.some((l) => l.slug === slug) || s.cup.slug === slug,
  );
}

/** Look up the league rules for a competition slug within a system. */
export function getLeagueRules(
  systemId: string,
  competitionSlug: string,
): LeagueRules | undefined {
  return getSystem(systemId).leagues.find((l) => l.slug === competitionSlug);
}
