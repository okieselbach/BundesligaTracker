"use client";

import { useEffect, useState } from "react";
import type { Club, Id } from "@/lib/db";
import { db } from "@/lib/db";
import { computeStandings } from "@/lib/standings";
import { computeMeisterliste, computeCupStats, type MeisterEntry, type CupStatRow } from "@/lib/history";
import { getCupWinner } from "@/lib/cup";
import { ClubLogo } from "./ClubLogo";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HistoryViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HistoryView({ open, onOpenChange }: HistoryViewProps) {
  const [meister, setMeister] = useState<MeisterEntry[]>([]);
  const [cupStats, setCupStats] = useState<CupStatRow[]>([]);
  const [clubs, setClubs] = useState<Map<Id, Club>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    (async () => {
      setLoading(true);

      const allClubs = await db.clubs.toArray();
      setClubs(new Map(allClubs.map((c) => [c.id, c])));

      const allSeasons = await db.seasons.orderBy("createdAt").toArray();
      const allComps = await db.competitions.toArray();
      const bundesliga = allComps.find((c) => c.slug === "1-bundesliga");
      const pokal = allComps.find((c) => c.slug === "dfb-pokal");

      // Meisterliste data
      const meisterData: { seasonName: string; meisterClubId: Id | null; pokalsiegerClubId: Id | null }[] = [];

      for (const season of allSeasons) {
        let meisterClubId: Id | null = null;
        let pokalsiegerClubId: Id | null = null;

        // Find Meister (1. BL Platz 1)
        if (bundesliga) {
          const sc = await db.seasonCompetitions
            .where("[seasonId+competitionId]")
            .equals([season.id, bundesliga.id])
            .first()
            .catch(() => null);

          if (!sc) {
            // Fallback: query by both fields
            const scs = await db.seasonCompetitions
              .where("seasonId")
              .equals(season.id)
              .toArray();
            const found = scs.find((s) => s.competitionId === bundesliga.id);
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
          } else {
            const matches = await db.matches
              .where("seasonCompetitionId")
              .equals(sc.id)
              .toArray();
            const played = matches.filter((m) => typeof m.homeGoals === "number");
            if (played.length > 0) {
              const standings = computeStandings(sc, played);
              if (standings.length > 0) meisterClubId = standings[0].clubId;
            }
          }
        }

        // Find Pokalsieger
        if (pokal) {
          const scs = await db.seasonCompetitions
            .where("seasonId")
            .equals(season.id)
            .toArray();
          const pokalSC = scs.find((s) => s.competitionId === pokal.id);

          if (pokalSC) {
            const rounds = await db.cupRounds
              .where("seasonCompetitionId")
              .equals(pokalSC.id)
              .toArray();
            const finale = rounds.find((r) => r.name === "Finale");
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
      if (pokal) {
        const cupSeasons = [];
        for (const season of allSeasons) {
          const scs = await db.seasonCompetitions
            .where("seasonId")
            .equals(season.id)
            .toArray();
          const pokalSC = scs.find((s) => s.competitionId === pokal.id);
          if (!pokalSC) continue;

          const rounds = await db.cupRounds
            .where("seasonCompetitionId")
            .equals(pokalSC.id)
            .toArray();
          if (rounds.length === 0) continue;

          const matches = await db.matches
            .where("seasonCompetitionId")
            .equals(pokalSC.id)
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

        setCupStats(computeCupStats(cupSeasons));
      }

      setLoading(false);
    })();
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Historie</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Laden...</div>
        ) : (
          <Tabs defaultValue="meister" className="mt-4">
            <TabsList className="w-full bg-secondary">
              <TabsTrigger value="meister" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Meister
              </TabsTrigger>
              <TabsTrigger value="pokal" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Pokal
              </TabsTrigger>
            </TabsList>

            <TabsContent value="meister">
              <MeisterTab entries={meister} clubs={clubs} />
            </TabsContent>

            <TabsContent value="pokal">
              <PokalTab stats={cupStats} clubs={clubs} />
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MeisterTab({ entries, clubs }: { entries: MeisterEntry[]; clubs: Map<Id, Club> }) {
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
                    <span>&#127942; {entry.meisterschaften}x Meister</span>
                  )}
                  {entry.pokalsiege > 0 && (
                    <span>&#127943; {entry.pokalsiege}x Pokal</span>
                  )}
                </div>
              </div>
            </div>
            {(entry.meisterSaisons.length > 0 || entry.pokalSaisons.length > 0) && (
              <div className="ml-9 mt-2 text-xs text-muted-foreground space-y-0.5">
                {entry.meisterSaisons.length > 0 && (
                  <p>Meister: {entry.meisterSaisons.join(", ")}</p>
                )}
                {entry.pokalSaisons.length > 0 && (
                  <p>Pokal: {entry.pokalSaisons.join(", ")}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PokalTab({ stats, clubs }: { stats: CupStatRow[]; clubs: Map<Id, Club> }) {
  if (stats.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Noch keine Pokal-Daten vorhanden.
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
            <th className="w-8 py-2 text-center" title="Pokalsiege">&#127942;</th>
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
        <div className="flex gap-3"><span className="font-semibold text-foreground w-8 shrink-0">&#127942;</span><span>Pokalsiege</span></div>
        <div className="flex gap-3"><span className="font-semibold text-foreground w-8 shrink-0">F</span><span>Finale erreicht</span></div>
        <div className="flex gap-3"><span className="font-semibold text-foreground w-8 shrink-0">S</span><span>Siege gesamt</span></div>
        <div className="flex gap-3"><span className="font-semibold text-foreground w-8 shrink-0">TN</span><span>Teilnahmen</span></div>
      </div>
    </div>
  );
}
