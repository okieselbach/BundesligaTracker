"use client";

import { useState } from "react";
import type { Club, Id } from "@/lib/db";
import { ClubLogo } from "./ClubLogo";
import { ClubDetail } from "./ClubDetail";
import { ClubEditor } from "./ClubEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowUpDown, Settings2 } from "lucide-react";
import { getBundesligaUrl } from "@/data/clubs";
import type { Match } from "@/lib/db";

interface ClubGridProps {
  clubs: Club[];
  competitionSlug?: string;
  allMatches?: Match[];
  allClubs?: Club[];
  seasonCompetitionId?: Id;
  onMoveClub?: (clubId: Id, direction: "up" | "down") => void;
  leagueName?: string;
  onRefresh: () => void;
}

export function ClubGrid({ clubs, competitionSlug, allMatches, allClubs, seasonCompetitionId, onMoveClub, leagueName, onRefresh }: ClubGridProps) {
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  if (selectedClub && allMatches && allClubs) {
    return (
      <ClubDetail
        club={selectedClub}
        matches={allMatches}
        allClubs={allClubs}
        competitionSlug={competitionSlug}
        onBack={() => setSelectedClub(null)}
      />
    );
  }

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Clubs ({clubs.length})</CardTitle>
            <div className="flex items-center gap-2">
              {onMoveClub && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowUpDown className="h-3 w-3" />
                  <span className="hidden sm:inline">Auf-/Abstieg</span>
                </div>
              )}
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {clubs.map((club) => (
              <div
                key={club.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3 transition-colors hover:bg-secondary/60 group"
              >
                <div className="cursor-pointer flex items-center gap-3 flex-1 min-w-0" onClick={() => setSelectedClub(club)}>
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

                <div className="flex items-center gap-1 shrink-0">
                  {(() => {
                    const linkUrl = club.clubUrl || ((competitionSlug === "1-bundesliga" || competitionSlug === "2-bundesliga") ? getBundesligaUrl(club.slug, competitionSlug) : null);
                    return linkUrl ? (
                      <a
                        href={linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded text-muted-foreground hover:text-primary transition-colors"
                        title="Club-Info"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null;
                  })()}
                  {onMoveClub && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-green-400 opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        onClick={() => onMoveClub(club.id, "up")}
                        title="Aufsteigen lassen (eine Liga hoeher)"
                      >
                        <span className="text-xs">&#9650;</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        onClick={() => onMoveClub(club.id, "down")}
                        title="Absteigen lassen (eine Liga tiefer)"
                      >
                        <span className="text-xs">&#9660;</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {showEditor && (
        <ClubEditor
          clubs={clubs}
          seasonCompetitionId={seasonCompetitionId}
          competitionSlug={competitionSlug}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}
