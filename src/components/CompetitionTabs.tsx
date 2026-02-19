"use client";

import type { Competition } from "@/lib/db";
import { cn } from "@/lib/utils";

interface CompetitionTabsProps {
  competitions: Competition[];
  activeCompetition: Competition | null;
  onSelect: (comp: Competition) => void;
}

export function CompetitionTabs({ competitions, activeCompetition, onSelect }: CompetitionTabsProps) {
  return (
    <div className="border-b border-border bg-[#282d34]">
      <div className="mx-auto max-w-5xl px-4">
        <nav className="flex gap-1 overflow-x-auto py-1">
          {competitions.map((comp) => {
            const isActive = activeCompetition?.id === comp.id;
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
        </nav>
      </div>
    </div>
  );
}
