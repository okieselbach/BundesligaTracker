"use client";

import { useState, useEffect, useRef } from "react";
import type { Club, Competition, SeasonCompetition, Match } from "@/lib/db";
import { db } from "@/lib/db";
import { ClubLogo } from "./ClubLogo";
import { ClubDetail } from "./ClubDetail";
import { ClubEditor } from "./ClubEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Settings2 } from "lucide-react";
import { getBundesligaUrl } from "@/data/clubs";

interface AllClubsViewProps {
  clubs: Club[];
  competitions: Competition[];
  seasonCompetitions: SeasonCompetition[];
  onRefresh: () => void;
}

interface ClubGroup {
  label: string;
  competitionSlug?: string;
  clubs: Club[];
}

export function AllClubsView({ clubs, competitions, seasonCompetitions, onRefresh }: AllClubsViewProps) {
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedCompetitionSlug, setSelectedCompetitionSlug] = useState<string | undefined>(undefined);
  const [showEditor, setShowEditor] = useState(false);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);

  const clubMap = new Map(clubs.map((c) => [c.id, c]));

  useEffect(() => {
    if (seasonCompetitions.length === 0) return;
    (async () => {
      const matchArrays = await Promise.all(
        seasonCompetitions.map((sc) =>
          db.matches.where("seasonCompetitionId").equals(sc.id).toArray()
        )
      );
      setAllMatches(matchArrays.flat());
    })();
  }, [seasonCompetitions]);

  useEffect(() => {
    if (showEditor && editorRef.current) {
      editorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showEditor]);

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
    groups.push({ label: comp.name, competitionSlug: comp.slug, clubs: groupClubs });
  }

  // Remaining clubs = Regionalliga Pool
  const poolClubs = clubs
    .filter((c) => !assignedClubIds.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (poolClubs.length > 0) {
    groups.push({ label: "Regionalliga / Pool", clubs: poolClubs });
  }

  if (selectedClub) {
    return (
      <ClubDetail
        club={selectedClub}
        matches={allMatches}
        allClubs={clubs}
        competitionSlug={selectedCompetitionSlug}
        onBack={() => setSelectedClub(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant={showEditor ? "default" : "outline"}
          size="sm"
          onClick={() => setShowEditor(!showEditor)}
          className="gap-1.5"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Editor
        </Button>
      </div>

      {groups.map((group) => (
        <Card key={group.label} className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {group.label} ({group.clubs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {group.clubs.map((club) => {
                const linkUrl =
                  club.clubUrl ||
                  (group.competitionSlug === "1-bundesliga" || group.competitionSlug === "2-bundesliga"
                    ? getBundesligaUrl(club.slug, group.competitionSlug)
                    : null);
                return (
                  <div
                    key={club.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3 transition-colors hover:bg-secondary/60 group"
                  >
                    <div
                      className="cursor-pointer flex items-center gap-3 flex-1 min-w-0"
                      onClick={() => {
                        setSelectedClub(club);
                        setSelectedCompetitionSlug(group.competitionSlug);
                      }}
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
                    {linkUrl && (
                      <a
                        href={linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded text-muted-foreground hover:text-primary transition-colors shrink-0"
                        title="Club-Info"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {showEditor && (
        <div ref={editorRef}>
          <ClubEditor
            clubs={clubs}
            onRefresh={onRefresh}
          />
        </div>
      )}
    </div>
  );
}
