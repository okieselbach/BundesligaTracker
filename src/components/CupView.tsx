"use client";

import { useState } from "react";
import type { Club, CupRound, Id, Match, SeasonCompetition } from "@/lib/db";
import { db, newId } from "@/lib/db";
import { createCupRound, getCupWinner, allRoundMatchesDecided, CUP_ROUND_NAMES } from "@/lib/cup";
import { MatchCard } from "./MatchCard";
import { MatchPairingEditor, type Pairing } from "./MatchPairingEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shuffle, Pencil } from "lucide-react";

/** Number of top 2.BL teams that go into the Profitopf (real DFB-Pokal rule) */
const ZWEITLIGA_PROFITOPF_COUNT = 14;

interface CupViewProps {
  seasonCompetition: SeasonCompetition | null;
  cupRounds: CupRound[];
  matches: Match[];
  clubs: Club[];
  onRefresh: () => void;
  leagueClubIds?: { bundesliga1: Id[]; bundesliga2: Id[] };
}

export function CupView({ seasonCompetition, cupRounds, matches, clubs, onRefresh, leagueClubIds }: CupViewProps) {
  const [activeRound, setActiveRound] = useState<number>(0);
  const [manualFirstRound, setManualFirstRound] = useState(false);
  const [manualNextRound, setManualNextRound] = useState(false);
  const [editingCurrentRound, setEditingCurrentRound] = useState(false);
  const clubMap = new Map(clubs.map((c) => [c.id, c]));

  if (!seasonCompetition) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center text-muted-foreground">
          Kein DFB-Pokal Wettbewerb gefunden.
        </CardContent>
      </Card>
    );
  }

  // Build two pots for Round 1 (real DFB-Pokal rules):
  // Profitopf (32): 1.BL (18) + top 14 of 2.BL
  // Amateurtopf (32): bottom 4 of 2.BL + 3.Liga (20) + Regionalliga (8)
  const buildFirstRoundPots = (): { pot1: Id[]; pot2: Id[] } | undefined => {
    if (!leagueClubIds) return undefined;
    const bl2 = leagueClubIds.bundesliga2; // ordered by position from season setup

    const pot2: Id[] = [...leagueClubIds.bundesliga1]; // all 1.BL
    const bl2Profi = bl2.slice(0, ZWEITLIGA_PROFITOPF_COUNT); // top 14 of 2.BL
    const bl2Amateur = bl2.slice(ZWEITLIGA_PROFITOPF_COUNT); // bottom 4 of 2.BL
    pot2.push(...bl2Profi);

    const profiSet = new Set(pot2);
    const pot1: Id[] = [...bl2Amateur]; // bottom 4 of 2.BL
    for (const clubId of seasonCompetition.clubIds) {
      if (!profiSet.has(clubId) && !bl2Amateur.includes(clubId)) {
        pot1.push(clubId); // 3.Liga + Regionalliga
      }
    }

    if (pot1.length === 0 || pot2.length === 0) return undefined;
    return { pot1, pot2 };
  };

  // Build two pots for Round 2:
  // Profitopf: surviving 1.BL + 2.BL teams, Amateurtopf: rest
  // If one pot empties, remaining teams from the other pot play each other
  const buildSecondRoundPots = (winnerIds: Id[]): { pot1: Id[]; pot2: Id[] } | undefined => {
    if (!leagueClubIds) return undefined;
    const topLeagueIds = new Set([
      ...leagueClubIds.bundesliga1,
      ...leagueClubIds.bundesliga2,
    ]);
    const pot1: Id[] = []; // Amateure (Heimrecht)
    const pot2: Id[] = []; // 1.BL + 2.BL
    for (const id of winnerIds) {
      if (topLeagueIds.has(id)) {
        pot2.push(id);
      } else {
        pot1.push(id);
      }
    }
    if (pot1.length === 0 || pot2.length === 0) return undefined;
    return { pot1, pot2 };
  };

  const handleStartFirstRound = async () => {
    const roundNumber = 1;
    const roundName = CUP_ROUND_NAMES[roundNumber] || `Runde ${roundNumber}`;
    const pots = buildFirstRoundPots();
    const { round, matches: newMatches } = createCupRound({
      seasonCompetitionId: seasonCompetition.id,
      number: roundNumber,
      name: roundName,
      clubIds: seasonCompetition.clubIds,
      pots,
    });

    await db.cupRounds.add(round);
    await db.matches.bulkAdd(newMatches);
    onRefresh();
  };

  const handleManualFirstRound = async (pairings: Pairing[]) => {
    const roundNumber = 1;
    const roundName = CUP_ROUND_NAMES[roundNumber] || `Runde ${roundNumber}`;
    const roundId = newId("cr");

    const round: CupRound = {
      id: roundId,
      seasonCompetitionId: seasonCompetition.id,
      number: roundNumber,
      name: roundName,
    };

    const newMatches = pairings.map((p) => ({
      id: newId("m"),
      seasonCompetitionId: seasonCompetition.id,
      cupRoundId: roundId,
      homeClubId: p.homeClubId,
      awayClubId: p.awayClubId,
      isKnockout: true,
    }));

    await db.cupRounds.add(round);
    await db.matches.bulkAdd(newMatches);
    onRefresh();
  };

  const handleNextRound = async () => {
    const lastRound = cupRounds[cupRounds.length - 1];
    if (!lastRound) return;

    const roundMatches = matches.filter((m) => m.cupRoundId === lastRound.id);
    if (!allRoundMatchesDecided(roundMatches)) return;

    const winners = roundMatches.map((m) => getCupWinner(m)!).filter(Boolean);
    const nextNumber = lastRound.number + 1;
    const nextName = CUP_ROUND_NAMES[nextNumber] || `Runde ${nextNumber}`;

    // Round 2: two-pot draw (Pro vs Amateur), Round 3+: free draw (single pot)
    const pots = nextNumber === 2 ? buildSecondRoundPots(winners) : undefined;

    const { round, matches: newMatches } = createCupRound({
      seasonCompetitionId: seasonCompetition.id,
      number: nextNumber,
      name: nextName,
      clubIds: winners,
      pots,
    });

    await db.cupRounds.add(round);
    await db.matches.bulkAdd(newMatches);
    onRefresh();
  };

  const handleManualNextRound = async (pairings: Pairing[]) => {
    const lastRound = cupRounds[cupRounds.length - 1];
    if (!lastRound) return;

    const nextNumber = lastRound.number + 1;
    const nextName = CUP_ROUND_NAMES[nextNumber] || `Runde ${nextNumber}`;
    const roundId = newId("cr");

    const round: CupRound = {
      id: roundId,
      seasonCompetitionId: seasonCompetition.id,
      number: nextNumber,
      name: nextName,
    };

    const newMatches = pairings.map((p) => ({
      id: newId("m"),
      seasonCompetitionId: seasonCompetition.id,
      cupRoundId: roundId,
      homeClubId: p.homeClubId,
      awayClubId: p.awayClubId,
      isKnockout: true,
    }));

    await db.cupRounds.add(round);
    await db.matches.bulkAdd(newMatches);
    onRefresh();
  };

  const handleEditCurrentRound = async (pairings: Pairing[]) => {
    const currentRound = cupRounds[activeRound];
    if (!currentRound) return;

    // Delete old matches for this round
    const oldMatches = matches.filter((m) => m.cupRoundId === currentRound.id);
    await db.transaction("rw", db.matches, async () => {
      for (const m of oldMatches) {
        await db.matches.delete(m.id);
      }
      const newMatches = pairings.map((p) => ({
        id: newId("m"),
        seasonCompetitionId: seasonCompetition.id,
        cupRoundId: currentRound.id,
        homeClubId: p.homeClubId,
        awayClubId: p.awayClubId,
        isKnockout: true,
      }));
      await db.matches.bulkAdd(newMatches);
    });

    onRefresh();
  };

  const handleSaveScore = async (matchId: string, homeGoals: number, awayGoals: number) => {
    await db.matches.update(matchId, { homeGoals, awayGoals });
    onRefresh();
  };

  const handleSavePenalty = async (matchId: string, homePen: number, awayPen: number) => {
    await db.matches.update(matchId, { homePen, awayPen });
    onRefresh();
  };

  const handleClearScore = async (matchId: string) => {
    await db.matches.update(matchId, {
      homeGoals: undefined,
      awayGoals: undefined,
      homePen: undefined,
      awayPen: undefined,
    });
    onRefresh();
  };

  // Determine which clubs are available for next round (winners of last round)
  const getWinnersForNextRound = () => {
    const lastRound = cupRounds[cupRounds.length - 1];
    if (!lastRound) return [];
    const roundMatches = matches.filter((m) => m.cupRoundId === lastRound.id);
    const winnerIds = roundMatches.map((m) => getCupWinner(m)!).filter(Boolean);
    return clubs.filter((c) => winnerIds.includes(c.id));
  };

  if (cupRounds.length === 0) {
    const allCupClubs = clubs.filter((c) => seasonCompetition.clubIds.includes(c.id));

    return (
      <>
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <div className="mb-4 text-4xl">&#127942;</div>
            <h3 className="mb-2 text-lg font-semibold">DFB-Pokal</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              {seasonCompetition.clubIds.length} Teams sind bereit.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={handleStartFirstRound} className="gap-2">
                <Shuffle className="h-4 w-4" />
                {buildFirstRoundPots() ? "Auslosen (2 Töpfe)" : "Auslosen"}
              </Button>
              <Button variant="outline" onClick={() => setManualFirstRound(true)} className="gap-2">
                <Pencil className="h-4 w-4" />
                Manuell
              </Button>
            </div>
          </CardContent>
        </Card>

        <MatchPairingEditor
          open={manualFirstRound}
          onOpenChange={setManualFirstRound}
          title="1. Runde - Begegnungen manuell erstellen"
          description="Erstelle die Paarungen für die 1. Runde des DFB-Pokals."
          availableClubs={allCupClubs}
          onSave={handleManualFirstRound}
        />
      </>
    );
  }

  const currentRound = cupRounds[activeRound] ?? cupRounds[cupRounds.length - 1];
  const roundMatches = matches.filter((m) => m.cupRoundId === currentRound?.id);
  const allDecided = allRoundMatchesDecided(roundMatches);
  const isLastRound = activeRound === cupRounds.length - 1;
  const isFinal = currentRound?.name === "Finale";

  // Clubs participating in the current round (for editing)
  const currentRoundClubIds = new Set<string>();
  roundMatches.forEach((m) => {
    currentRoundClubIds.add(m.homeClubId);
    currentRoundClubIds.add(m.awayClubId);
  });
  const currentRoundClubs = clubs.filter((c) => currentRoundClubIds.has(c.id));
  const currentRoundPairings: Pairing[] = roundMatches.map((m) => ({
    homeClubId: m.homeClubId,
    awayClubId: m.awayClubId,
  }));

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">DFB-Pokal</CardTitle>
            <div className="flex items-center gap-2">
              {/* Edit current round pairings */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => setEditingCurrentRound(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Begegnungen</span>
              </Button>

              {isLastRound && allDecided && !isFinal && roundMatches.length > 1 && (
                <>
                  <Button onClick={handleNextRound} size="sm" className="gap-1">
                    <Shuffle className="h-3.5 w-3.5" /> {currentRound?.number === 1 ? "Auslosen (2 Töpfe)" : "Auslosen"}
                  </Button>
                  <Button variant="outline" onClick={() => setManualNextRound(true)} size="sm" className="gap-1">
                    <Pencil className="h-3.5 w-3.5" /> Manuell
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Round tabs */}
          <div className="mb-4 flex flex-wrap gap-2">
            {cupRounds.map((round, i) => (
              <Badge
                key={round.id}
                variant={i === activeRound ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => setActiveRound(i)}
              >
                {round.name}
              </Badge>
            ))}
          </div>

          {/* Matches */}
          <div className="grid gap-2">
            {roundMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                homeClub={clubMap.get(match.homeClubId)}
                awayClub={clubMap.get(match.awayClubId)}
                onSaveScore={handleSaveScore}
                onClearScore={handleClearScore}
                showPenalty
                onSavePenalty={handleSavePenalty}
              />
            ))}
          </div>

          {/* Winner display for Finale */}
          {isFinal && allDecided && roundMatches.length === 1 && (
            <div className="mt-6 text-center">
              <div className="text-3xl mb-2">&#127942;</div>
              <h3 className="text-lg font-bold">Pokalsieger!</h3>
              {(() => {
                const winner = getCupWinner(roundMatches[0]);
                const winnerClub = winner ? clubMap.get(winner) : null;
                return winnerClub ? (
                  <p className="text-primary font-semibold text-xl">{winnerClub.name}</p>
                ) : null;
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual next round editor */}
      <MatchPairingEditor
        open={manualNextRound}
        onOpenChange={setManualNextRound}
        title={`${CUP_ROUND_NAMES[(cupRounds[cupRounds.length - 1]?.number ?? 0) + 1] || "Nächste Runde"} - Begegnungen manuell`}
        description="Erstelle die Paarungen für die nächste Runde."
        availableClubs={getWinnersForNextRound()}
        onSave={handleManualNextRound}
      />

      {/* Edit current round pairings */}
      <MatchPairingEditor
        open={editingCurrentRound}
        onOpenChange={setEditingCurrentRound}
        title={`${currentRound?.name ?? "Runde"} - Begegnungen bearbeiten`}
        description="Paarungen für diese Runde anpassen. Bestehende Ergebnisse werden zurückgesetzt."
        availableClubs={currentRoundClubs}
        initialPairings={currentRoundPairings}
        onSave={handleEditCurrentRound}
      />
    </>
  );
}
