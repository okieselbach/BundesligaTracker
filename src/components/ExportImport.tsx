"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { exportAllData, importAllData, shareOrDownloadJson, type BackupData } from "@/lib/backup";
import { Download, Upload, Trash2, RotateCcw, Trophy, Share2 } from "lucide-react";
import { db, type Season } from "@/lib/db";
import { getSystem } from "@/data/leagueSystems";
import { COMPETITIONS } from "@/data/competitions";
import { INITIAL_POOL_CLUBS_BY_TIER } from "@/data/clubs";
import { resolveCupEntrants } from "@/lib/seed";

interface ExportImportProps {
  onImportDone: () => void;
  currentSeason?: Season | null;
}

export function ExportImport({ onImportDone, currentSeason }: ExportImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // Check if Web Share API with file support is available (iOS/iPadOS)
    if (typeof navigator !== "undefined" && navigator.canShare) {
      const testFile = new File(["test"], "test.json", { type: "application/json" });
      setCanShare(navigator.canShare({ files: [testFile] }));
    }
  }, []);

  const handleExport = async () => {
    const data = await exportAllData();
    const date = new Date().toISOString().slice(0, 10);
    await shareOrDownloadJson(data, `bundesliga-tracker-backup-${date}.json`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("Achtung: Alle aktuellen Daten werden ersetzt. Fortfahren?")) return;
    try {
      const text = await file.text();
      const data: BackupData = JSON.parse(text);
      await importAllData(data);
      onImportDone();
    } catch {
      alert("Fehler beim Import. Bitte prüfe die Datei.");
    }
  };

  const handleResetSeason = async () => {
    if (!currentSeason) return;
    if (!confirm(`Saison "${currentSeason.name}" zurücksetzen? Alle Ergebnisse dieser Saison werden gelöscht (Spielplan bleibt erhalten).`)) return;

    // Get all season-competitions for this season
    const scs = await db.seasonCompetitions
      .where("seasonId")
      .equals(currentSeason.id)
      .toArray();

    const scIds = scs.map((sc) => sc.id);

    // Reset all match scores for these season-competitions
    const matches = await db.matches
      .where("seasonCompetitionId")
      .anyOf(scIds)
      .toArray();

    // Recompute the cup's initial roster — same as handleResetCup — so a
    // post-reset draw doesn't include late entrants persisted from R3 onward.
    const system = getSystem(currentSeason.systemId);
    const cupCompId = system.cup.competitionId;
    const cupSC = scs.find((sc) => sc.competitionId === cupCompId);
    const leagueClubIdsBySlug: Record<string, string[]> = {};
    for (const league of system.leagues) {
      const sc = scs.find((s) => s.competitionId === league.competitionId);
      if (sc) leagueClubIdsBySlug[league.slug] = sc.clubIds;
    }
    const allLeagueClubIds = new Set(Object.values(leagueClubIdsBySlug).flat());
    const poolClubIdsByTier: Record<string, string[]> = {};
    for (const tier of system.poolTiers) {
      poolClubIdsByTier[tier.id] = (INITIAL_POOL_CLUBS_BY_TIER[tier.id] ?? [])
        .map((c) => c.id)
        .filter((id) => !allLeagueClubIds.has(id));
    }
    const initialCupClubIds = cupSC
      ? resolveCupEntrants(system.cup.initialEntrants, leagueClubIdsBySlug, poolClubIdsByTier)
      : [];

    await db.transaction("rw", db.matches, db.cupRounds, db.seasonCompetitions, async () => {
      // Clear all scores
      for (const m of matches) {
        await db.matches.update(m.id, {
          homeGoals: undefined,
          awayGoals: undefined,
          homePen: undefined,
          awayPen: undefined,
        });
      }

      // Delete cup rounds (they get regenerated via Auslosung)
      for (const scId of scIds) {
        const cupRounds = await db.cupRounds
          .where("seasonCompetitionId")
          .equals(scId)
          .toArray();
        if (cupRounds.length > 0) {
          // Delete cup round matches
          const cupMatches = await db.matches
            .where("seasonCompetitionId")
            .equals(scId)
            .filter((m) => !!m.cupRoundId)
            .toArray();
          for (const m of cupMatches) {
            await db.matches.delete(m.id);
          }
          for (const r of cupRounds) {
            await db.cupRounds.delete(r.id);
          }
        }
      }

      if (cupSC) {
        await db.seasonCompetitions.update(cupSC.id, { clubIds: initialCupClubIds });
      }
    });

    onImportDone();
  };

  const handleResetCup = async () => {
    if (!currentSeason) return;
    const system = getSystem(currentSeason.systemId);
    const cupCompId = system.cup.competitionId;
    const cupName = COMPETITIONS.find((c) => c.id === cupCompId)?.name ?? "Pokal";
    if (!confirm(`${cupName} der Saison "${currentSeason.name}" zurücksetzen? Alle Runden und Ergebnisse werden gelöscht (neu auslosen).`)) return;

    const scs = await db.seasonCompetitions
      .where("seasonId")
      .equals(currentSeason.id)
      .toArray();

    const cupSC = scs.find((sc) => sc.competitionId === cupCompId);
    if (!cupSC) return;

    // Rebuild the cup's initial club roster so a fresh draw doesn't include
    // late entrants (FA Cup R3: Premier League + Championship) that the
    // previous run wrote into clubIds.
    const leagueClubIdsBySlug: Record<string, string[]> = {};
    for (const league of system.leagues) {
      const sc = scs.find((s) => s.competitionId === league.competitionId);
      if (sc) leagueClubIdsBySlug[league.slug] = sc.clubIds;
    }
    const allLeagueClubIds = new Set(Object.values(leagueClubIdsBySlug).flat());
    const poolClubIdsByTier: Record<string, string[]> = {};
    for (const tier of system.poolTiers) {
      poolClubIdsByTier[tier.id] = (INITIAL_POOL_CLUBS_BY_TIER[tier.id] ?? [])
        .map((c) => c.id)
        .filter((id) => !allLeagueClubIds.has(id));
    }
    const initialCupClubIds = resolveCupEntrants(
      system.cup.initialEntrants,
      leagueClubIdsBySlug,
      poolClubIdsByTier,
    );

    await db.transaction("rw", db.matches, db.cupRounds, db.seasonCompetitions, async () => {
      // Delete all cup matches
      const cupMatches = await db.matches
        .where("seasonCompetitionId")
        .equals(cupSC.id)
        .toArray();
      for (const m of cupMatches) {
        await db.matches.delete(m.id);
      }
      // Delete all cup rounds
      const cupRounds = await db.cupRounds
        .where("seasonCompetitionId")
        .equals(cupSC.id)
        .toArray();
      for (const r of cupRounds) {
        await db.cupRounds.delete(r.id);
      }
      // Restore initial entrant roster (drops late entrants from prior draws).
      await db.seasonCompetitions.update(cupSC.id, { clubIds: initialCupClubIds });
    });

    onImportDone();
  };

  const handleReset = async () => {
    if (!confirm("ACHTUNG: Alle Daten werden unwiderruflich gelöscht! Bist du sicher?")) return;
    if (!confirm("Wirklich ALLE Daten löschen? Das kann nicht rückgängig gemacht werden!")) return;
    await Promise.all([
      db.clubs.clear(),
      db.seasons.clear(),
      db.competitions.clear(),
      db.seasonCompetitions.clear(),
      db.matchdays.clear(),
      db.matches.clear(),
      db.cupRounds.clear(),
    ]);
    onImportDone();
  };

  const cupLabel = currentSeason
    ? COMPETITIONS.find(
        (c) => c.id === getSystem(currentSeason.systemId).cup.competitionId,
      )?.name ?? "Pokal"
    : "Pokal";

  return (
    <Card className="border-none bg-transparent shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Einstellungen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            {canShare ? <Share2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {canShare ? "Backup teilen" : "Daten exportieren"}
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" />
            Daten importieren
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>

        <Separator />

        <div className="flex flex-wrap gap-3">
          {currentSeason && (
            <Button variant="outline" onClick={handleResetCup} className="gap-2 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10">
              <Trophy className="h-4 w-4" />
              {cupLabel} zurücksetzen
            </Button>
          )}
          {currentSeason && (
            <Button variant="outline" onClick={handleResetSeason} className="gap-2 border-orange-500/50 text-orange-400 hover:bg-orange-500/10">
              <RotateCcw className="h-4 w-4" />
              Saison &quot;{currentSeason.name}&quot; zurücksetzen
            </Button>
          )}
          <Button variant="destructive" onClick={handleReset} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Alle Daten löschen
          </Button>
        </div>

        {currentSeason && (
          <p className="text-xs text-muted-foreground">
            {cupLabel} zurücksetzen: Löscht alle Pokal-Runden und Ergebnisse (neu auslosen). Saison zurücksetzen: Löscht alle Ergebnisse der Saison (inkl. Liga + Pokal), Spielpläne bleiben erhalten.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
