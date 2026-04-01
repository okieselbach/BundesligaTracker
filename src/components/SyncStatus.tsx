"use client";

import { useState } from "react";
import { Cloud, CloudOff, CloudAlert, Loader2 } from "lucide-react";
import { exportAllData } from "@/lib/backup";
import * as sync from "@/lib/sync";
import { toast } from "sonner";

interface SyncStatusProps {
  isLoggedIn: boolean;
  isSynced: boolean;
  lastSyncedAt: string | null;
  username: string | null;
  onSyncDone: () => void;
}

export function SyncStatus({ isLoggedIn, isSynced, lastSyncedAt, username, onSyncDone }: SyncStatusProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const data = await exportAllData();
      await sync.saveToCloud(data);
      toast.success("In der Cloud gespeichert");
      onSyncDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground" title="Nicht angemeldet">
        <CloudOff className="h-4 w-4" />
      </div>
    );
  }

  if (saving) {
    return (
      <div className="flex items-center gap-1.5 text-blue-400" title="Speichert...">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!isSynced) {
    return (
      <button
        onClick={handleSave}
        className="flex items-center gap-1.5 text-orange-400 hover:text-orange-300 transition-colors"
        title="Nicht gespeichert - Klicken zum Speichern"
      >
        <CloudAlert className="h-4 w-4" />
      </button>
    );
  }

  const timeStr = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <button
      onClick={handleSave}
      className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
      title={`${username} - Gespeichert${timeStr ? ` (${timeStr})` : ""} - Klicken zum erneut Speichern`}
    >
      <Cloud className="h-4 w-4" />
    </button>
  );
}
