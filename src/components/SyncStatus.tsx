"use client";

import { Cloud, CloudOff, CloudAlert } from "lucide-react";

interface SyncStatusProps {
  isLoggedIn: boolean;
  isSynced: boolean;
  lastSyncedAt: string | null;
  username: string | null;
}

export function SyncStatus({ isLoggedIn, isSynced, lastSyncedAt, username }: SyncStatusProps) {
  if (!isLoggedIn) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground" title="Nicht angemeldet">
        <CloudOff className="h-4 w-4" />
      </div>
    );
  }

  if (!isSynced) {
    return (
      <div className="flex items-center gap-1.5 text-orange-400" title="Nicht gespeichert">
        <CloudAlert className="h-4 w-4" />
      </div>
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
    <div
      className="flex items-center gap-1.5 text-emerald-400"
      title={`${username} - Gespeichert${timeStr ? ` (${timeStr})` : ""}`}
    >
      <Cloud className="h-4 w-4" />
    </div>
  );
}
