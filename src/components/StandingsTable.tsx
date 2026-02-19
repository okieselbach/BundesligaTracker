"use client";

import type { Club, Match, SeasonCompetition } from "@/lib/db";
import { computeStandings, getZone, getZoneColor, getZoneLabel } from "@/lib/standings";
import { ClubLogo } from "./ClubLogo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StandingsTableProps {
  seasonCompetition: SeasonCompetition;
  matches: Match[];
  clubs: Club[];
  competitionSlug: string;
}

export function StandingsTable({ seasonCompetition, matches, clubs, competitionSlug }: StandingsTableProps) {
  const standings = computeStandings(seasonCompetition, matches);
  const clubMap = new Map(clubs.map((c) => [c.id, c]));
  const totalTeams = standings.length;

  // Collect unique zones for legend
  const zones = new Set<string>();
  standings.forEach((_, i) => {
    const z = getZone(competitionSlug, i + 1, totalTeams);
    if (z) zones.add(z);
  });

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Tabelle</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {/* Legend */}
        {zones.size > 0 && (
          <div className="mb-4 flex flex-wrap gap-3 px-4">
            {[...zones].map((z) => (
              <div key={z} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={`h-3 w-3 rounded-sm ${getZoneColor(z as never)}`} />
                <span>{getZoneLabel(z as never)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="w-8 py-2 pl-4 text-center">#</th>
                <th className="py-2 pl-2 text-left">Verein</th>
                <th className="w-8 py-2 text-center">Sp</th>
                <th className="w-8 py-2 text-center">S</th>
                <th className="w-8 py-2 text-center">U</th>
                <th className="w-8 py-2 text-center">N</th>
                <th className="w-12 py-2 text-center">Tore</th>
                <th className="w-10 py-2 text-center">TD</th>
                <th className="w-10 py-2 pr-4 text-center font-bold">Pkt</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, index) => {
                const club = clubMap.get(row.clubId);
                if (!club) return null;
                const pos = index + 1;
                const zone = getZone(competitionSlug, pos, totalTeams);
                const zoneColor = zone ? getZoneColor(zone) : "";

                return (
                  <tr
                    key={row.clubId}
                    className="border-b border-border/50 transition-colors hover:bg-secondary/50"
                  >
                    <td className="relative py-2.5 pl-4 text-center font-medium">
                      {zoneColor && (
                        <div className={`zone-bar absolute left-0 top-1 bottom-1 ${zoneColor}`} />
                      )}
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
                        <span className="font-medium">{club.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-center text-muted-foreground">{row.played}</td>
                    <td className="py-2.5 text-center">{row.wins}</td>
                    <td className="py-2.5 text-center">{row.draws}</td>
                    <td className="py-2.5 text-center">{row.losses}</td>
                    <td className="py-2.5 text-center text-muted-foreground">
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
      </CardContent>
    </Card>
  );
}
