"use client";

import type { Season } from "@/lib/db";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { History, Settings, Trophy } from "lucide-react";

interface HeaderProps {
  seasons: Season[];
  currentSeason: Season | null;
  onSeasonChange: (seasonId: string) => void;
  onSettingsClick: () => void;
  onHistorieClick: () => void;
}

export function Header({ seasons, currentSeason, onSeasonChange, onSettingsClick, onHistorieClick }: HeaderProps) {
  return (
    <header className="border-b border-border bg-[#282d34]">
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

          <Button variant="ghost" size="icon" onClick={onHistorieClick} title="Historie">
            <History className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={onSettingsClick}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
