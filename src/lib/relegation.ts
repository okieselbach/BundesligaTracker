import type { Id, SeasonCompetition } from "./db";
import { computeStandings, type StandingRow } from "./standings";
import type { Match } from "./db";

export interface RelegationProposal {
  directPromotions: { clubId: Id; from: string; to: string }[];
  directRelegations: { clubId: Id; from: string; to: string }[];
  relegationMatches: {
    higher: { clubId: Id; league: string; position: number };
    lower: { clubId: Id; league: string; position: number };
  }[];
  markedAbstieg3Liga: Id[];
}

export function computeRelegationProposal(params: {
  standings1BL: StandingRow[];
  standings2BL: StandingRow[];
  standings3BL: StandingRow[];
}): RelegationProposal {
  const { standings1BL, standings2BL, standings3BL } = params;

  const directPromotions: RelegationProposal["directPromotions"] = [];
  const directRelegations: RelegationProposal["directRelegations"] = [];
  const relegationMatches: RelegationProposal["relegationMatches"] = [];
  const markedAbstieg3Liga: Id[] = [];

  // 1. BL -> 2. BL: Platz 17, 18 steigen ab
  if (standings1BL.length >= 18) {
    directRelegations.push(
      { clubId: standings1BL[16].clubId, from: "1-bundesliga", to: "2-bundesliga" },
      { clubId: standings1BL[17].clubId, from: "1-bundesliga", to: "2-bundesliga" },
    );
  }

  // 2. BL -> 1. BL: Platz 1, 2 steigen auf
  if (standings2BL.length >= 18) {
    directPromotions.push(
      { clubId: standings2BL[0].clubId, from: "2-bundesliga", to: "1-bundesliga" },
      { clubId: standings2BL[1].clubId, from: "2-bundesliga", to: "1-bundesliga" },
    );

    // Relegation: 16. der 1. BL vs 3. der 2. BL
    if (standings1BL.length >= 16) {
      relegationMatches.push({
        higher: { clubId: standings1BL[15].clubId, league: "1-bundesliga", position: 16 },
        lower: { clubId: standings2BL[2].clubId, league: "2-bundesliga", position: 3 },
      });
    }

    // 2. BL -> 3. Liga: Platz 17, 18 steigen ab
    directRelegations.push(
      { clubId: standings2BL[16].clubId, from: "2-bundesliga", to: "3-liga" },
      { clubId: standings2BL[17].clubId, from: "2-bundesliga", to: "3-liga" },
    );
  }

  // 3. Liga -> 2. BL: Platz 1, 2 steigen auf
  if (standings3BL.length >= 20) {
    directPromotions.push(
      { clubId: standings3BL[0].clubId, from: "3-liga", to: "2-bundesliga" },
      { clubId: standings3BL[1].clubId, from: "3-liga", to: "2-bundesliga" },
    );

    // Relegation: 16. der 2. BL vs 3. der 3. Liga
    if (standings2BL.length >= 16) {
      relegationMatches.push({
        higher: { clubId: standings2BL[15].clubId, league: "2-bundesliga", position: 16 },
        lower: { clubId: standings3BL[2].clubId, league: "3-liga", position: 3 },
      });
    }

    // 3. Liga: Platz 17-20 nur markiert (bleiben drin)
    for (let i = 16; i < standings3BL.length; i++) {
      markedAbstieg3Liga.push(standings3BL[i].clubId);
    }
  }

  return { directPromotions, directRelegations, relegationMatches, markedAbstieg3Liga };
}
