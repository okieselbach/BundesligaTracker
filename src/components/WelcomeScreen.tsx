"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { importAllData, type BackupData } from "@/lib/backup";
import { Trophy, Upload, Shuffle, Pencil } from "lucide-react";

interface WelcomeScreenProps {
  onQuickStart: (manual: boolean) => void;
  onImportDone: () => void;
}

export function WelcomeScreen({ onQuickStart, onImportDone }: WelcomeScreenProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data: BackupData = JSON.parse(text);
      await importAllData(data);
      onImportDone();
    } catch {
      alert("Fehler beim Import. Bitte prüfe die Datei.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Trophy className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">Bundesliga Tracker</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Verwalte deine eigene Bundesliga-Saison mit Tabellen, Spieltagen und DFB-Pokal.
          </p>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Quick Start - Saison 2025/26
            </p>
            <Button onClick={() => onQuickStart(false)} className="w-full gap-2" size="lg">
              <Shuffle className="h-5 w-5" />
              Zufalls-Spielplan
            </Button>
            <p className="text-xs text-muted-foreground">
              64 Clubs mit automatisch generiertem Spielplan (Begegnungen zufällig).
            </p>

            <Button onClick={() => onQuickStart(true)} variant="outline" className="w-full gap-2" size="lg">
              <Pencil className="h-5 w-5" />
              Manueller Spielplan
            </Button>
            <p className="text-xs text-muted-foreground">
              64 Clubs mit leeren Spieltagen - Begegnungen selbst eintragen (z.B. echte Bundesliga nachspielen).
            </p>

            <div className="relative py-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-3 text-xs text-muted-foreground">oder</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Backup importieren
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
