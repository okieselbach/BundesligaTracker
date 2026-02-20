"use client";

import { useState, useEffect, useRef } from "react";
import type { Club, Id } from "@/lib/db";
import { ClubLogo } from "./ClubLogo";
import { ClubDetail } from "./ClubDetail";
import { ClubEditor } from "./ClubEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowUp, ArrowDown, Settings2 } from "lucide-react";
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

const LEAGUE_NAMES: Record<string, string> = {
  "1-bundesliga": "1. Bundesliga",
  "2-bundesliga": "2. Bundesliga",
  "3-liga": "3. Liga",
};
const LEAGUE_ORDER = ["1-bundesliga", "2-bundesliga", "3-liga"];

export function ClubGrid({ clubs, competitionSlug, allMatches, allClubs, seasonCompetitionId, onMoveClub, leagueName, onRefresh }: ClubGridProps) {
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showEditor && editorRef.current) {
      editorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showEditor]);

  const currentIdx = LEAGUE_ORDER.indexOf(competitionSlug ?? "");
  const canMoveUp = currentIdx > 0;
  const canMoveDown = currentIdx >= 0 && currentIdx < LEAGUE_ORDER.length - 1;
  const targetUp = canMoveUp ? LEAGUE_NAMES[LEAGUE_ORDER[currentIdx - 1]] : "";
  const targetDown = canMoveDown ? LEAGUE_NAMES[LEAGUE_ORDER[currentIdx + 1]] : "";

  const handleMove = (club: Club, direction: "up" | "down") => {
    const target = direction === "up" ? targetUp : targetDown;
    const action = direction === "up" ? "aufsteigen" : "absteigen";
    if (!confirm(`${club.name} in die ${target} ${action} lassen?`)) return;
    onMoveClub?.(club.id, direction);
  };

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
              {onMoveClub && (canMoveUp || canMoveDown) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="hidden sm:inline">Auf-/Abstieg per Pfeil-Buttons</span>
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
                  {onMoveClub && canMoveUp && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 border-green-500/40 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                      onClick={(e) => { e.stopPropagation(); handleMove(club, "up"); }}
                      title={`Aufsteigen in ${targetUp}`}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onMoveClub && canMoveDown && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 border-red-500/40 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                      onClick={(e) => { e.stopPropagation(); handleMove(club, "down"); }}
                      title={`Absteigen in ${targetDown}`}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {showEditor && (
        <div ref={editorRef}>
          <ClubEditor
            clubs={clubs}
            seasonCompetitionId={seasonCompetitionId}
            competitionSlug={competitionSlug}
            onRefresh={onRefresh}
          />
        </div>
      )}
    </>
  );
}
