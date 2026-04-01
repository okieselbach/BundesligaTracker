"use client";

import type { Season } from "@/lib/db";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { History, Settings, Trophy, Sun, Moon, UserCircle, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { SyncStatus } from "@/components/SyncStatus";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface HeaderProps {
  seasons: Season[];
  currentSeason: Season | null;
  onSeasonChange: (seasonId: string) => void;
  onSettingsClick: () => void;
  onHistorieClick: () => void;
  syncLoggedIn: boolean;
  syncIsSynced: boolean;
  syncLastSyncedAt: string | null;
  syncUsername: string | null;
  onSyncSave: () => void;
  onLogout: () => void;
}

export function Header({ seasons, currentSeason, onSeasonChange, onSettingsClick, onHistorieClick, syncLoggedIn, syncIsSynced, syncLastSyncedAt, syncUsername, onSyncSave, onLogout }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="border-b border-border bg-header-bg">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Bundesliga Tracker</h1>
            <p className="text-xs text-muted-foreground">Saison verwalten</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {seasons.length > 0 && currentSeason && (
            <Select value={currentSeason.id} onValueChange={onSeasonChange}>
              <SelectTrigger className="w-[140px] bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {seasons.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <SyncStatus
            isLoggedIn={syncLoggedIn}
            isSynced={syncIsSynced}
            lastSyncedAt={syncLastSyncedAt}
            username={syncUsername}
            onSyncDone={onSyncSave}
          />

          {syncLoggedIn && syncUsername && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title={`Angemeldet als ${syncUsername}`}>
                  <UserCircle className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
                  Angemeldet als <span className="font-medium text-foreground">{syncUsername}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="gap-2 text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />
                  Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button variant="ghost" size="icon" onClick={onHistorieClick} title="Historie">
            <History className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Light Mode" : "Dark Mode"}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Button variant="ghost" size="icon" onClick={onSettingsClick}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
