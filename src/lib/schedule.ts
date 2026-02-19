import { newId, type Id, type Match, type Matchday } from "./db";

export interface GeneratedSchedule {
  matchdays: Matchday[];
  matches: Match[];
}

export function generateRoundRobinSchedule(params: {
  seasonCompetitionId: Id;
  clubIds: Id[];
  doubleRound: boolean;
}): GeneratedSchedule {
  const { seasonCompetitionId, doubleRound } = params;
  const BYE = "__BYE__";

  let teams = [...params.clubIds];
  if (teams.length % 2 === 1) teams.push(BYE);

  const n = teams.length;
  const rounds = n - 1;
  const half = n / 2;

  const allMatchdays: Matchday[] = [];
  const allMatches: Match[] = [];

  const makeRounds = (reverse: boolean, startNo: number) => {
    const arr = [...teams];

    for (let r = 0; r < rounds; r++) {
      const mdNo = startNo + r;
      const mdId = newId("md");

      allMatchdays.push({
        id: mdId,
        seasonCompetitionId,
        number: mdNo,
        name: `Spieltag ${mdNo}`,
      });

      for (let i = 0; i < half; i++) {
        const a = arr[i];
        const b = arr[n - 1 - i];
        if (a === BYE || b === BYE) continue;

        const homeFirst = (r + i) % 2 === 0;
        let home = homeFirst ? a : b;
        let away = homeFirst ? b : a;

        if (reverse) [home, away] = [away, home];

        allMatches.push({
          id: newId("m"),
          seasonCompetitionId,
          matchdayId: mdId,
          homeClubId: home,
          awayClubId: away,
          isKnockout: false,
        });
      }

      // Rotate: fix first element, rotate rest
      const fixed = arr[0];
      const rest = arr.slice(1);
      const last = rest.pop()!;
      arr.length = 0;
      arr.push(fixed, last, ...rest);
    }
  };

  makeRounds(false, 1);
  if (doubleRound) {
    makeRounds(true, rounds + 1);
  }

  return { matchdays: allMatchdays, matches: allMatches };
}
