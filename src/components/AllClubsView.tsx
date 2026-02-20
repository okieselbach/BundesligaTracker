"use client";

import type { Club, Competition, SeasonCompetition } from "@/lib/db";
import { ClubLogo } from "./ClubLogo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AllClubsViewProps {
  clubs: Club[];
  competitions: Competition[];
  seasonCompetitions: SeasonCompetition[];
}

interface ClubGroup {
  label: string;
  clubs: Club[];
}

export function AllClubsView({ clubs, competitions, seasonCompetitions }: AllClubsViewProps) {
  const clubMap = new Map(clubs.map((c) => [c.id, c]));

  // Build groups based on current season-competition assignments
  const leagueComps = competitions.filter((c) => c.type === "league");
  const assignedClubIds = new Set<string>();
  const groups: ClubGroup[] = [];

  for (const comp of leagueComps) {
    const sc = seasonCompetitions.find((s) => s.competitionId === comp.id);
    if (!sc) continue;
    const groupClubs: Club[] = [];
    for (const id of sc.clubIds) {
      const club = clubMap.get(id);
      if (club) {
        groupClubs.push(club);
        assignedClubIds.add(id);
      }
    }
    groupClubs.sort((a, b) => a.name.localeCompare(b.name));
    groups.push({ label: comp.name, clubs: groupClubs });
  }

  // Remaining clubs = Regionalliga Pool
  const poolClubs = clubs
    .filter((c) => !assignedClubIds.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (poolClubs.length > 0) {
    groups.push({ label: "Regionalliga / Pool", clubs: poolClubs });
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <Card key={group.label} className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {group.label} ({group.clubs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {group.clubs.map((club) => (
                <div
                  key={club.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3"
                >
                  <ClubLogo
                    logoUrl={club.logoUrl}
                    name={club.name}
                    shortName={club.shortName}
                    primaryColor={club.primaryColor}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{club.name}</p>
                    <p className="text-xs text-muted-foreground">{club.shortName}</p>
                    <div
                      className="mt-1 h-1 w-10 rounded-full"
                      style={{ backgroundColor: club.primaryColor }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
