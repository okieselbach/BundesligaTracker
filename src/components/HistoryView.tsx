"use client";

import { useEffect, useState } from "react";
import type { Club, Id, Season } from "@/lib/db";
import { db } from "@/lib/db";
import { computeStandings } from "@/lib/standings";
import { computeMeisterliste, computeCupStats, type MeisterEntry, type CupStatRow } from "@/lib/history";
import { getCupWinner } from "@/lib/cup";
import { ClubLogo } from "./ClubLogo";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_SYSTEM_ID, getSystem } from "@/data/leagueSystems";

interface HistoryViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Drives which system's seasons + competitions the history covers. */
  currentSeason: Season | null;
}

export function HistoryView({ open, onOpenChange, currentSeason }: HistoryViewProps) {
  const [meister, setMeister] = useState<MeisterEntry[]>([]);
  const [cupStats, setCupStats] = useState<CupStatRow[]>([]);
  const [clubs, setClubs] = useState<Map<Id, Club>>(new Map());
  const [loading, setLoading] = useState(true);

  // Resolve which system this history view is for. Falls back to "de" if no
  // season is selected (e.g. fresh database).
  const systemId = currentSeason?.systemId ?? DEFAULT_SYSTEM_ID;
  const system = getSystem(systemId);
  const topLeague = system.leagues[0];
  const cupCompetitionId = system.cup.competitionId;
  // Final round = the last round in the cup config (works for "Finale" and "Final").
  const finalRoundNumber = system.cup.rounds[system.cup.rounds.length - 1]?.number;

  useEffect(() => {
    if (!open) return;

    (async () => {
      setLoading(true);

      const allClubs = await db.clubs.toArray();
      setClubs(new Map(allClubs.map((c) => [c.id, c])));

      // Only seasons of this system count toward this country's history.
      const allSeasonsRaw = await db.seasons.orderBy("createdAt").toArray();
      const allSeasons = allSeasonsRaw.filter(
        (s) => (s.systemId ?? DEFAULT_SYSTEM_ID) === systemId,
      );
      const allComps = await db.competitions.toArray();
      const topLeagueComp = allComps.find((c) => c.slug === topLeague?.slug);
      const cupComp = allComps.find((c) => c.id === cupCompetitionId);

      // Meisterliste data
      const meisterData: { seasonName: string; meisterClubId: Id | null; pokalsiegerClubId: Id | null }[] = [];

      for (const season of allSeasons) {
        let meisterClubId: Id | null = null;
        let pokalsiegerClubId: Id | null = null;

        // Find champion (top league position 1)
        if (topLeagueComp) {
          const scs = await db.seasonCompetitions
            .where("seasonId")
            .equals(season.id)
            .toArray();
          const found = scs.find((s) => s.competitionId === topLeagueComp.id);
          if (found) {
            const matches = await db.matches
              .where("seasonCompetitionId")
              .equals(found.id)
              .toArray();
            const played = matches.filter((m) => typeof m.homeGoals === "number");
            if (played.length > 0) {
              const standings = computeStandings(found, played);
              if (standings.length > 0) meisterClubId = standings[0].clubId;
            }
          }
        }

        // Find cup winner
        if (cupComp && finalRoundNumber !== undefined) {
          const scs = await db.seasonCompetitions
            .where("seasonId")
            .equals(season.id)
            .toArray();
          const cupSC = scs.find((s) => s.competitionId === cupComp.id);

          if (cupSC) {
            const rounds = await db.cupRounds
              .where("seasonCompetitionId")
              .equals(cupSC.id)
              .toArray();
            const finale = rounds.find((r) => r.number === finalRoundNumber);
            if (finale) {
              const finaleMatches = await db.matches
                .where("cupRoundId")
                .equals(finale.id)
                .toArray();
              if (finaleMatches.length === 1) {
                pokalsiegerClubId = getCupWinner(finaleMatches[0]);
              }
            }
          }
        }

        meisterData.push({
          seasonName: season.name,
          meisterClubId,
          pokalsiegerClubId,
        });
      }

      setMeister(computeMeisterliste(meisterData));

      // Cup stats data
      if (cupComp) {
        const cupSeasons = [];
        for (const season of allSeasons) {
          const scs = await db.seasonCompetitions
            .where("seasonId")
            .equals(season.id)
            .toArray();
          const cupSC = scs.find((s) => s.competitionId === cupComp.id);
          if (!cupSC) continue;

          const rounds = await db.cupRounds
            .where("seasonCompetitionId")
            .equals(cupSC.id)
            .toArray();
          if (rounds.length === 0) continue;

          const matches = await db.matches
            .where("seasonCompetitionId")
            .equals(cupSC.id)
            .toArray();

          const roundMap = new Map(
            rounds.map((r) => [r.id, { name: r.name, number: r.number }]),
          );

          cupSeasons.push({
            seasonName: season.name,
            rounds: rounds.map((r) => ({ name: r.name, number: r.number })),
            matches: matches.map((m) => ({
              homeClubId: m.homeClubId,
              awayClubId: m.awayClubId,
              homeGoals: m.homeGoals,
              awayGoals: m.awayGoals,
              homePen: m.homePen,
              awayPen: m.awayPen,
              cupRoundId: m.cupRoundId,
            })),
            roundMap,
          });
        }

        setCupStats(computeCupStats(cupSeasons, finalRoundNumber ?? 0));
      } else {
        setCupStats([]);
      }

      setLoading(false);
    })();
  }, [open, systemId, topLeague?.slug, cupCompetitionId, finalRoundNumber]);

  const championLabel = system.championLabel;
  const cupShortLabel = system.cupShortLabel;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            <span className="flex items-center gap-2">
              <span>{system.flag}</span>
              <span>Historie {system.name}</span>
            </span>
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Laden...</div>
        ) : (
          <Tabs defaultValue="meister" className="mt-4">
            <TabsList className="w-full bg-secondary">
              <TabsTrigger value="meister" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {championLabel}
              </TabsTrigger>
              <TabsTrigger value="pokal" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {cupShortLabel}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="meister">
              <MeisterTab entries={meister} clubs={clubs} championLabel={championLabel} cupShortLabel={cupShortLabel} />
            </TabsContent>

            <TabsContent value="pokal">
              <PokalTab stats={cupStats} clubs={clubs} cupShortLabel={cupShortLabel} />
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MeisterTab({ entries, clubs, championLabel, cupShortLabel }: { entries: MeisterEntry[]; clubs: Map<Id, Club>; championLabel: string; cupShortLabel: string }) {
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Noch keine Saisons abgeschlossen.
      </p>
    );
  }

  return (
    <div className="space-y-1 mt-2">
      {entries.map((entry, i) => {
        const club = clubs.get(entry.clubId);
        if (!club) return null;

        return (
          <div key={entry.clubId} className="rounded-lg border border-border/50 p-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground w-6 text-center">{i + 1}</span>
              <ClubLogo
                logoUrl={club.logoUrl}
                name={club.name}
                shortName={club.shortName}
                primaryColor={club.primaryColor}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{club.name}</p>
                <div className="flex gap-4 text-xs text-muted-foreground mt-0.5">
                  {entry.meisterschaften > 0 && (
                    <span>&#127942; {entry.meisterschaften}x {championLabel}</span>
                  )}
                  {entry.pokalsiege > 0 && (
                    <span>&#127943; {entry.pokalsiege}x {cupShortLabel}</span>
                  )}
                </div>
              </div>
            </div>
            {(entry.meisterSaisons.length > 0 || entry.pokalSaisons.length > 0) && (
              <div className="ml-9 mt-2 text-xs text-muted-foreground space-y-0.5">
                {entry.meisterSaisons.length > 0 && (
                  <p>{championLabel}: {entry.meisterSaisons.join(", ")}</p>
                )}
                {entry.pokalSaisons.length > 0 && (
                  <p>{cupShortLabel}: {entry.pokalSaisons.join(", ")}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PokalTab({ stats, clubs, cupShortLabel }: { stats: CupStatRow[]; clubs: Map<Id, Club>; cupShortLabel: string }) {
  if (stats.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Noch keine {cupShortLabel}-Daten vorhanden.
      </p>
    );
  }

  return (
    <div className="mt-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="w-6 py-2 text-center">#</th>
            <th className="py-2 pl-2 text-left">Verein</th>
            <th className="w-8 py-2 text-center" title={`${cupShortLabel}siege`}>&#127942;</th>
            <th className="w-8 py-2 text-center" title="Finale">F</th>
            <th className="w-8 py-2 text-center" title="Siege">S</th>
            <th className="w-8 py-2 pr-2 text-center" title="Teilnahmen">TN</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((row, i) => {
            const club = clubs.get(row.clubId);
            if (!club) return null;

            return (
              <tr key={row.clubId} className="border-b border-border/50 transition-colors hover:bg-secondary/50">
                <td className="py-2 text-center text-muted-foreground">{i + 1}</td>
                <td className="py-2 pl-2">
                  <div className="flex items-center gap-2">
                    <ClubLogo
                      logoUrl={club.logoUrl}
                      name={club.name}
                      shortName={club.shortName}
                      primaryColor={club.primaryColor}
                      size="sm"
                    />
                    <span className="font-medium text-xs truncate">{club.shortName}</span>
                  </div>
                </td>
                <td className="py-2 text-center font-bold">{row.pokalsiege}</td>
                <td className="py-2 text-center">{row.finale}</td>
                <td className="py-2 text-center text-muted-foreground">{row.siege}</td>
                <td className="py-2 pr-2 text-center text-muted-foreground">{row.teilnahmen}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 px-2 pt-3 border-t border-border/50 space-y-1 text-xs text-muted-foreground">
        <div className="flex gap-3"><span className="font-semibold text-foreground w-8 shrink-0">&#127942;</span><span>{cupShortLabel}siege</span></div>
        <div className="flex gap-3"><span className="font-semibold text-foreground w-8 shrink-0">F</span><span>Finale erreicht</span></div>
        <div className="flex gap-3"><span className="font-semibold text-foreground w-8 shrink-0">S</span><span>Siege gesamt</span></div>
        <div className="flex gap-3"><span className="font-semibold text-foreground w-8 shrink-0">TN</span><span>Teilnahmen</span></div>
      </div>
    </div>
  );
}
