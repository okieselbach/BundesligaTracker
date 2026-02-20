"use client";

import { useState } from "react";
import type { Club, Match, Matchday } from "@/lib/db";
import { db, newId } from "@/lib/db";
import { MatchCard } from "./MatchCard";
import { MatchPairingEditor, type Pairing } from "./MatchPairingEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";

interface MatchdayViewProps {
  matchdays: Matchday[];
  matches: Match[];
  clubs: Club[];
  seasonCompetitionId?: string;
  onRefresh: () => void;
}

export function MatchdayView({ matchdays, matches, clubs, seasonCompetitionId, onRefresh }: MatchdayViewProps) {
  const [currentMdIndex, setCurrentMdIndex] = useState(() => {
    // Find first matchday with unplayed matches
    const idx = matchdays.findIndex((md) => {
      const mdMatches = matches.filter((m) => m.matchdayId === md.id);
      return mdMatches.some((m) => typeof m.homeGoals !== "number");
    });
    return idx >= 0 ? idx : 0;
  });
  const [editingPairings, setEditingPairings] = useState(false);

  const clubMap = new Map(clubs.map((c) => [c.id, c]));
  const currentMd = matchdays[currentMdIndex];

  if (!currentMd) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center text-muted-foreground">
          Keine Spieltage vorhanden.
        </CardContent>
      </Card>
    );
  }

  const mdMatches = matches
    .filter((m) => m.matchdayId === currentMd.id)
    .sort((a, b) => {
      const aPlayed = typeof a.homeGoals === "number" ? 1 : 0;
      const bPlayed = typeof b.homeGoals === "number" ? 1 : 0;
      return aPlayed - bPlayed;
    });

  const playedCount = mdMatches.filter((m) => typeof m.homeGoals === "number").length;

  const handleSaveScore = async (matchId: string, homeGoals: number, awayGoals: number) => {
    await db.matches.update(matchId, { homeGoals, awayGoals });
    onRefresh();
  };

  const handleClearScore = async (matchId: string) => {
    await db.matches.update(matchId, { homeGoals: undefined, awayGoals: undefined });
    onRefresh();
  };

  const handleSavePairings = async (pairings: Pairing[]) => {
    if (!seasonCompetitionId) return;

    // Delete old matches for this matchday
    const oldMatches = matches.filter((m) => m.matchdayId === currentMd.id);
    await db.transaction("rw", db.matches, async () => {
      for (const m of oldMatches) {
        await db.matches.delete(m.id);
      }
      // Create new matches
      const newMatches = pairings.map((p) => ({
        id: newId("m"),
        seasonCompetitionId,
        matchdayId: currentMd.id,
        homeClubId: p.homeClubId,
        awayClubId: p.awayClubId,
        isKnockout: false,
      }));
      await db.matches.bulkAdd(newMatches);
    });

    onRefresh();
  };

  const currentPairings: Pairing[] = mdMatches.map((m) => ({
    homeClubId: m.homeClubId,
    awayClubId: m.awayClubId,
  }));

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                disabled={currentMdIndex <= 0}
                onClick={() => setCurrentMdIndex((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <CardTitle className="text-lg">{currentMd.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {playedCount}/{mdMatches.length} Spiele
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                disabled={currentMdIndex >= matchdays.length - 1}
                onClick={() => setCurrentMdIndex((i) => Math.min(matchdays.length - 1, i + 1))}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => setEditingPairings(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Begegnungen</span>
              </Button>
              <span className="text-xs text-muted-foreground">
                Spieltag {currentMd.number} / {matchdays.length}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-2">
            {mdMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                homeClub={clubMap.get(match.homeClubId)}
                awayClub={clubMap.get(match.awayClubId)}
                onSaveScore={handleSaveScore}
                onClearScore={handleClearScore}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <MatchPairingEditor
        open={editingPairings}
        onOpenChange={setEditingPairings}
        title={`${currentMd.name} - Begegnungen bearbeiten`}
        description="Paarungen für diesen Spieltag anpassen. Bestehende Ergebnisse werden zurückgesetzt."
        availableClubs={clubs}
        initialPairings={currentPairings}
        onSave={handleSavePairings}
      />
    </>
  );
}
