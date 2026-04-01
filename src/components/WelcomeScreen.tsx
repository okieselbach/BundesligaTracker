"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { importAllData, type BackupData } from "@/lib/backup";
import { Trophy, Upload, Shuffle, Pencil, Cloud, LogIn } from "lucide-react";
import * as sync from "@/lib/sync";
import { toast } from "sonner";

interface WelcomeScreenProps {
  onQuickStart: (manual: boolean) => void;
  onImportDone: () => void;
}

export function WelcomeScreen({ onQuickStart, onImportDone }: WelcomeScreenProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showCloudLogin, setShowCloudLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [cloudLoading, setCloudLoading] = useState(false);

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

  const handleCloudLogin = async () => {
    setCloudLoading(true);
    try {
      const { lastBackupAt } = await sync.login(username, pin);
      if (lastBackupAt) {
        const data = await sync.loadFromCloud();
        await importAllData(data);
        toast.success("Daten aus der Cloud geladen");
        onImportDone();
      } else {
        toast.info("Angemeldet, aber kein Cloud-Backup vorhanden. Starte eine neue Saison!");
        setShowCloudLogin(false);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCloudLoading(false);
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

            {showCloudLogin ? (
              <div className="space-y-3 text-left">
                <div className="space-y-2">
                  <Label htmlFor="welcome-username">Benutzername</Label>
                  <Input
                    id="welcome-username"
                    placeholder="z.B. leon"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                    maxLength={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="welcome-pin">PIN (6 Ziffern)</Label>
                  <Input
                    id="welcome-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="123456"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                  />
                </div>
                <Button
                  onClick={handleCloudLogin}
                  disabled={cloudLoading || username.length < 3 || pin.length !== 6}
                  className="w-full gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  {cloudLoading ? "Verbindung..." : "Cloud-Daten laden"}
                </Button>
                <Button variant="ghost" onClick={() => setShowCloudLogin(false)} className="w-full">
                  Abbrechen
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setShowCloudLogin(true)}
                >
                  <Cloud className="h-4 w-4" />
                  Cloud-Anmeldung
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Backup importieren
                </Button>
              </>
            )}
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
