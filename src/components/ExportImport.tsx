"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { exportAllData, importAllData, downloadJson, type BackupData } from "@/lib/backup";
import { Download, Upload, Trash2, RotateCcw, Trophy } from "lucide-react";
import { db, type Season } from "@/lib/db";

interface ExportImportProps {
  onImportDone: () => void;
  currentSeason?: Season | null;
}

export function ExportImport({ onImportDone, currentSeason }: ExportImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const data = await exportAllData();
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(data, `bundesliga-tracker-backup-${date}.json`);
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
      alert("Fehler beim Import. Bitte pruefe die Datei.");
    }
  };

  const handleResetSeason = async () => {
    if (!currentSeason) return;
    if (!confirm(`Saison "${currentSeason.name}" zuruecksetzen? Alle Ergebnisse dieser Saison werden geloescht (Spielplan bleibt erhalten).`)) return;

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

    await db.transaction("rw", db.matches, db.cupRounds, async () => {
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
    });

    onImportDone();
  };

  const handleResetCup = async () => {
    if (!currentSeason) return;
    if (!confirm(`DFB-Pokal der Saison "${currentSeason.name}" zuruecksetzen? Alle Runden und Ergebnisse werden geloescht (neu auslosen).`)) return;

    const scs = await db.seasonCompetitions
      .where("seasonId")
      .equals(currentSeason.id)
      .toArray();

    // Find the cup season-competition
    const competitions = await db.competitions.toArray();
    const cupComp = competitions.find((c) => c.type === "cup");
    if (!cupComp) return;

    const cupSC = scs.find((sc) => sc.competitionId === cupComp.id);
    if (!cupSC) return;

    await db.transaction("rw", db.matches, db.cupRounds, async () => {
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
    });

    onImportDone();
  };

  const handleReset = async () => {
    if (!confirm("ACHTUNG: Alle Daten werden unwiderruflich geloescht! Bist du sicher?")) return;
    if (!confirm("Wirklich ALLE Daten loeschen? Das kann nicht rueckgaengig gemacht werden!")) return;
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

  return (
    <Card className="border-none bg-transparent shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Einstellungen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Daten exportieren
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
              DFB-Pokal zuruecksetzen
            </Button>
          )}
          {currentSeason && (
            <Button variant="outline" onClick={handleResetSeason} className="gap-2 border-orange-500/50 text-orange-400 hover:bg-orange-500/10">
              <RotateCcw className="h-4 w-4" />
              Saison &quot;{currentSeason.name}&quot; zuruecksetzen
            </Button>
          )}
          <Button variant="destructive" onClick={handleReset} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Alle Daten loeschen
          </Button>
        </div>

        {currentSeason && (
          <p className="text-xs text-muted-foreground">
            DFB-Pokal zuruecksetzen: Loescht alle Pokal-Runden und Ergebnisse (neu auslosen). Saison zuruecksetzen: Loescht alle Ergebnisse der Saison, Spielplaene bleiben erhalten.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
