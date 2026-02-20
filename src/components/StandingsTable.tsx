"use client";

import { useMemo } from "react";
import type { Club, Match, Matchday, SeasonCompetition, Id } from "@/lib/db";
import { computeStandings, getZone, getZoneColor, getZoneLabel } from "@/lib/standings";
import { ClubLogo } from "./ClubLogo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronUp, ChevronDown } from "lucide-react";

interface StandingsTableProps {
  seasonCompetition: SeasonCompetition;
  matches: Match[];
  matchdays: Matchday[];
  clubs: Club[];
  competitionSlug: string;
}

function computeTendency(
  currentStandings: { clubId: Id }[],
  matches: Match[],
  matchdays: Matchday[],
  seasonCompetition: SeasonCompetition,
): Map<Id, number> {
  const tendency = new Map<Id, number>();

  // Find the latest matchday that has at least one played match
  const playedMatchdays = matchdays
    .filter((md) => matches.some((m) => m.matchdayId === md.id && typeof m.homeGoals === "number"))
    .sort((a, b) => b.number - a.number);

  if (playedMatchdays.length < 2) {
    // Not enough matchdays to compare
    return tendency;
  }

  const latestMd = playedMatchdays[0];

  // Compute standings without the latest matchday's matches
  const previousMatches = matches.filter((m) => m.matchdayId !== latestMd.id);
  const previousStandings = computeStandings(seasonCompetition, previousMatches);

  // Build position maps
  const prevPosMap = new Map<Id, number>();
  previousStandings.forEach((row, i) => prevPosMap.set(row.clubId, i + 1));

  currentStandings.forEach((row, i) => {
    const currentPos = i + 1;
    const prevPos = prevPosMap.get(row.clubId);
    if (prevPos !== undefined) {
      tendency.set(row.clubId, prevPos - currentPos); // positive = moved up, negative = moved down
    }
  });

  return tendency;
}

export function StandingsTable({ seasonCompetition, matches, matchdays, clubs, competitionSlug }: StandingsTableProps) {
  const standings = computeStandings(seasonCompetition, matches);
  const clubMap = new Map(clubs.map((c) => [c.id, c]));
  const totalTeams = standings.length;

  const tendency = useMemo(
    () => computeTendency(standings, matches, matchdays, seasonCompetition),
    [standings, matches, matchdays, seasonCompetition],
  );

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
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="w-8 py-2 pl-4 text-center">#</th>
                <th className="py-2 pl-2 text-left">Verein</th>
                <th className="w-8 py-2 text-center">Sp</th>
                <th className="w-16 py-2 text-center">S-U-N</th>
                <th className="w-12 py-2 text-center">T</th>
                <th className="w-10 py-2 text-center">+/-</th>
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
                const diff = tendency.get(row.clubId);

                return (
                  <tr
                    key={row.clubId}
                    className="border-b border-border/50 transition-colors hover:bg-secondary/50"
                  >
                    <td className="relative py-0.5 pl-4 text-center font-medium">
                      {zoneColor && (
                        <div className={`zone-bar absolute left-0 top-1 bottom-1 ${zoneColor}`} />
                      )}
                      <div className="flex flex-col items-center leading-none min-h-[2.25rem] justify-center">
                        {diff !== undefined && diff > 0 && (
                          <ChevronUp className="h-3 w-3 -mb-0.5 text-green-400" />
                        )}
                        <span>{pos}</span>
                        {diff !== undefined && diff < 0 && (
                          <ChevronDown className="h-3 w-3 -mt-0.5 text-red-400" />
                        )}
                      </div>
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
                    <td className="py-2.5 text-center">{row.wins}-{row.draws}-{row.losses}</td>
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

        {/* Legend */}
        {zones.size > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 px-4 pt-4 border-t border-border/50">
            <div className="space-y-2">
              {[...zones].map((z) => (
                <div key={z} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <div className={`h-3.5 w-5 rounded-sm ${getZoneColor(z as never)}`} />
                  <span>{getZoneLabel(z as never)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex gap-3"><span className="font-semibold text-foreground w-10 shrink-0">Sp</span><span>Spiele</span></div>
              <div className="flex gap-3"><span className="font-semibold text-foreground w-10 shrink-0">S-U-N</span><span>Siege-Unentschieden-Niederlagen</span></div>
              <div className="flex gap-3"><span className="font-semibold text-foreground w-10 shrink-0">T</span><span>Tore</span></div>
              <div className="flex gap-3"><span className="font-semibold text-foreground w-10 shrink-0">+/-</span><span>Tor Differenz</span></div>
              <div className="flex gap-3"><span className="font-semibold text-foreground w-10 shrink-0">Pkt</span><span>Punkte</span></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
