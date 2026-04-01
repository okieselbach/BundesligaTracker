"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, CloudDownload, CloudUpload, LogIn, LogOut, UserPlus } from "lucide-react";
import { exportAllData, importAllData, type BackupData } from "@/lib/backup";
import * as sync from "@/lib/sync";
import { toast } from "sonner";
import { hasData } from "@/lib/seed";

interface CloudSyncProps {
  onSyncDone: () => void;
  onSyncStateChange: () => void;
}

type Mode = "idle" | "login" | "register";

export function CloudSync({ onSyncDone, onSyncStateChange }: CloudSyncProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const loggedIn = sync.isLoggedIn();
  const currentUser = sync.getUsername();
  const lastSynced = sync.getLastSyncedAt();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { lastBackupAt } = await sync.login(username, pin);
      setMode("idle");
      setUsername("");
      setPin("");

      // Check if we should auto-restore
      const localHasData = await hasData();
      if (lastBackupAt && !localHasData) {
        // No local data - auto-restore from cloud
        const data = await sync.loadFromCloud();
        await importAllData(data);
        toast.success("Daten aus der Cloud geladen");
        onSyncDone();
      } else if (lastBackupAt && localHasData) {
        // Both exist - ask user
        const cloudDate = new Date(lastBackupAt).toLocaleString("de-DE");
        if (confirm(`Es gibt Cloud-Daten (Stand: ${cloudDate}). Cloud-Daten laden? (Lokale Daten werden ersetzt)`)) {
          const data = await sync.loadFromCloud();
          await importAllData(data);
          toast.success("Cloud-Daten geladen");
          onSyncDone();
        }
      } else {
        toast.success(`Angemeldet als ${username}`);
      }
      onSyncStateChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      await sync.register(username, pin);
      setMode("idle");
      setUsername("");
      setPin("");
      toast.success("Account erstellt! Du bist jetzt angemeldet.");
      onSyncStateChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const data = await exportAllData();
      await sync.saveToCloud(data);
      toast.success("In der Cloud gespeichert");
      onSyncStateChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async () => {
    if (!confirm("Cloud-Daten laden? Alle lokalen Daten werden ersetzt.")) return;
    setLoading(true);
    try {
      const data = await sync.loadFromCloud();
      await importAllData(data as BackupData);
      toast.success("Cloud-Daten geladen");
      onSyncDone();
      onSyncStateChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sync.clearSession();
    setMode("idle");
    toast.success("Abgemeldet");
    onSyncStateChange();
  };

  const lastSyncStr = lastSynced
    ? new Date(lastSynced).toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <Card className="border-none bg-transparent shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Cloud className="h-5 w-5" />
          Cloud-Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loggedIn ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Angemeldet als <span className="font-medium text-foreground">{currentUser}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 h-7 text-xs">
                <LogOut className="h-3.5 w-3.5" />
                Abmelden
              </Button>
            </div>
            {lastSyncStr && (
              <p className="text-xs text-muted-foreground">
                Letzter Sync: {lastSyncStr}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleSave} disabled={loading} className="gap-2">
                <CloudUpload className="h-4 w-4" />
                {loading ? "Speichert..." : "Cloud speichern"}
              </Button>
              <Button variant="outline" onClick={handleLoad} disabled={loading} className="gap-2">
                <CloudDownload className="h-4 w-4" />
                {loading ? "Lädt..." : "Cloud laden"}
              </Button>
            </div>
          </>
        ) : mode === "idle" ? (
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setMode("login")} className="gap-2">
              <LogIn className="h-4 w-4" />
              Anmelden
            </Button>
            <Button variant="outline" onClick={() => setMode("register")} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Registrieren
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="sync-username">Benutzername</Label>
              <Input
                id="sync-username"
                placeholder="z.B. leon"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                maxLength={20}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sync-pin">PIN (6 Ziffern)</Label>
              <Input
                id="sync-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="123456"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={mode === "login" ? handleLogin : handleRegister}
                disabled={loading || username.length < 3 || pin.length !== 6}
                className="gap-2"
              >
                {mode === "login" ? (
                  <>
                    <LogIn className="h-4 w-4" />
                    {loading ? "Anmelden..." : "Anmelden"}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    {loading ? "Erstellt..." : "Account erstellen"}
                  </>
                )}
              </Button>
              <Button variant="ghost" onClick={() => { setMode("idle"); setUsername(""); setPin(""); }}>
                Abbrechen
              </Button>
            </div>
            {mode === "register" && (
              <p className="text-xs text-muted-foreground">
                Merke dir deinen Benutzernamen und deine PIN! Damit kannst du dich auf jedem Gerät anmelden.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
