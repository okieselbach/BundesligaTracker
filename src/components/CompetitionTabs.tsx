"use client";

import type { Competition } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

interface CompetitionTabsProps {
  competitions: Competition[];
  activeCompetition: Competition | null;
  onSelect: (comp: Competition) => void;
  allClubsActive?: boolean;
  onAllClubsClick?: () => void;
}

export function CompetitionTabs({ competitions, activeCompetition, onSelect, allClubsActive, onAllClubsClick }: CompetitionTabsProps) {
  return (
    <div className="border-b border-border bg-[#282d34]">
      <div className="mx-auto max-w-5xl px-4">
        <nav className="flex gap-1 overflow-x-auto py-1">
          {competitions.map((comp) => {
            const isActive = !allClubsActive && activeCompetition?.id === comp.id;
            return (
              <button
                key={comp.id}
                onClick={() => onSelect(comp)}
                className={cn(
                  "whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {comp.shortName}
              </button>
            );
          })}

          {onAllClubsClick && (
            <>
              <div className="mx-1 my-auto h-5 w-px bg-border/50" />
              <button
                onClick={onAllClubsClick}
                className={cn(
                  "whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-1.5",
                  allClubsActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Users className="h-4 w-4" />
                Alle Clubs
              </button>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
