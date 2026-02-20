"use client";

import { useEffect, useState } from "react";
import type { Club, Competition, Id } from "@/lib/db";
import { db } from "@/lib/db";
import { computeStandings, type StandingRow } from "@/lib/standings";
import { computeAllTimeStandings, type AllTimeRow } from "@/lib/history";
import { ClubLogo } from "./ClubLogo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AllTimeTableProps {
  competition: Competition;
  clubs: Club[];
}

export function AllTimeTable({ competition, clubs }: AllTimeTableProps) {
  const [rows, setRows] = useState<AllTimeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const clubMap = new Map(clubs.map((c) => [c.id, c]));

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Find all SeasonCompetitions for this competition across all seasons
      const allSCs = await db.seasonCompetitions
        .where("competitionId")
        .equals(competition.id)
        .toArray();

      const seasonRows: StandingRow[][] = [];

      for (const sc of allSCs) {
        const matches = await db.matches
          .where("seasonCompetitionId")
          .equals(sc.id)
          .toArray();

        // Only include seasons that have played matches
        const playedMatches = matches.filter(
          (m) => typeof m.homeGoals === "number",
        );
        if (playedMatches.length > 0) {
          seasonRows.push(computeStandings(sc, playedMatches));
        }
      }

      setRows(computeAllTimeStandings(seasonRows));
      setLoading(false);
    })();
  }, [competition.id]);

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center text-muted-foreground">
          Laden...
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center text-muted-foreground">
          Noch keine Daten für die Ewige Tabelle vorhanden.
          Spiele mindestens eine Saison.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Ewige Tabelle</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="w-8 py-2 pl-4 text-center">#</th>
                <th className="py-2 pl-2 text-left">Verein</th>
                <th className="w-8 py-2 text-center hidden sm:table-cell">S.</th>
                <th className="w-8 py-2 text-center">Sp</th>
                <th className="w-16 py-2 text-center">S-U-N</th>
                <th className="w-12 py-2 text-center hidden sm:table-cell">T</th>
                <th className="w-10 py-2 text-center">+/-</th>
                <th className="w-10 py-2 pr-4 text-center font-bold">Pkt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const club = clubMap.get(row.clubId);
                if (!club) return null;
                const pos = index + 1;

                return (
                  <tr
                    key={row.clubId}
                    className="border-b border-border/50 transition-colors hover:bg-secondary/50"
                  >
                    <td className="py-2.5 pl-4 text-center font-medium">
                      {pos}
                    </td>
                    <td className="py-2.5 pl-2">
                      <div className="flex items-center gap-2.5">
                        <ClubLogo
                          logoUrl={club.logoUrl}
                          name={club.name}
                          shortName={club.shortName}
                          primaryColor={club.primaryColor}
                          size="sm"
                        />
                        <span className="font-medium hidden sm:inline">{club.name}</span>
                        <span className="font-medium sm:hidden">{club.shortName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-center text-muted-foreground hidden sm:table-cell">{row.seasons}</td>
                    <td className="py-2.5 text-center text-muted-foreground">{row.played}</td>
                    <td className="py-2.5 text-center">{row.wins}-{row.draws}-{row.losses}</td>
                    <td className="py-2.5 text-center text-muted-foreground hidden sm:table-cell">
                      {row.goalsFor}:{row.goalsAgainst}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={row.goalDiff > 0 ? "text-green-400" : row.goalDiff < 0 ? "text-red-400" : ""}>
                        {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-center font-bold text-lg">{row.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 px-4 pt-4 border-t border-border/50">
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex gap-3"><span className="font-semibold text-foreground w-10 shrink-0">S.</span><span>Saisons</span></div>
            <div className="flex gap-3"><span className="font-semibold text-foreground w-10 shrink-0">Sp</span><span>Spiele</span></div>
            <div className="flex gap-3"><span className="font-semibold text-foreground w-10 shrink-0">S-U-N</span><span>Siege-Unentschieden-Niederlagen</span></div>
            <div className="flex gap-3"><span className="font-semibold text-foreground w-10 shrink-0">T</span><span>Tore</span></div>
            <div className="flex gap-3"><span className="font-semibold text-foreground w-10 shrink-0">+/-</span><span>Tor Differenz</span></div>
            <div className="flex gap-3"><span className="font-semibold text-foreground w-10 shrink-0">Pkt</span><span>Punkte</span></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
