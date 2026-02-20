"use client";

import { useState } from "react";
import type { Club, Match } from "@/lib/db";
import { ClubLogo } from "./ClubLogo";
import { Button } from "@/components/ui/button";
import { Check, Pencil, X } from "lucide-react";

interface MatchCardProps {
  match: Match;
  homeClub?: Club;
  awayClub?: Club;
  onSaveScore: (matchId: string, homeGoals: number, awayGoals: number) => void;
  onClearScore: (matchId: string) => void;
  showPenalty?: boolean;
  onSavePenalty?: (matchId: string, homePen: number, awayPen: number) => void;
}

const GOAL_OPTIONS = Array.from({ length: 16 }, (_, i) => i);

function GoalSelect({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoFocus={autoFocus}
      className="h-9 w-12 sm:h-10 sm:w-14 rounded-md border border-border bg-background text-center text-lg font-bold text-foreground appearance-none cursor-pointer focus:ring-2 focus:ring-primary focus:outline-none"
      style={{ textAlignLast: "center", WebkitAppearance: "none" }}
    >
      <option value="" disabled>-</option>
      {GOAL_OPTIONS.map((n) => (
        <option key={n} value={n.toString()}>{n}</option>
      ))}
    </select>
  );
}

export function MatchCard({ match, homeClub, awayClub, onSaveScore, onClearScore, showPenalty, onSavePenalty }: MatchCardProps) {
  const [editing, setEditing] = useState(false);
  const [homeGoals, setHomeGoals] = useState(match.homeGoals?.toString() ?? "");
  const [awayGoals, setAwayGoals] = useState(match.awayGoals?.toString() ?? "");
  const [homePen, setHomePen] = useState(match.homePen?.toString() ?? "");
  const [awayPen, setAwayPen] = useState(match.awayPen?.toString() ?? "");

  const hasScore = typeof match.homeGoals === "number";
  const isDraw = hasScore && match.homeGoals === match.awayGoals;
  const needsPenalty = showPenalty && match.isKnockout && isDraw;

  const handleSave = () => {
    const h = parseInt(homeGoals);
    const a = parseInt(awayGoals);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;
    onSaveScore(match.id, h, a);

    if (needsPenalty && onSavePenalty) {
      const hp = parseInt(homePen);
      const ap = parseInt(awayPen);
      if (!isNaN(hp) && !isNaN(ap) && hp >= 0 && ap >= 0) {
        onSavePenalty(match.id, hp, ap);
      }
    }
    setEditing(false);
  };

  const handleClear = () => {
    onClearScore(match.id);
    setHomeGoals("");
    setAwayGoals("");
    setHomePen("");
    setAwayPen("");
    setEditing(false);
  };

  if (!homeClub || !awayClub) return null;

  return (
    <div className="match-card rounded-lg border border-border bg-secondary/30 px-2 sm:px-4 py-3">
      <div className="flex items-center">
        {/* Home team - right aligned */}
        <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-2 min-w-0">
          <div className="text-right min-w-0 hidden sm:block">
            <p className="text-sm font-semibold truncate">{homeClub.name}</p>
            <p className="text-[10px] text-muted-foreground">{homeClub.shortName}</p>
          </div>
          <div className="text-right min-w-0 sm:hidden">
            <p className="text-xs font-semibold truncate">{homeClub.shortName}</p>
          </div>
          <ClubLogo
            logoUrl={homeClub.logoUrl}
            name={homeClub.name}
            shortName={homeClub.shortName}
            primaryColor={homeClub.primaryColor}
            size="lg"
          />
        </div>

        {/* Score center */}
        <div className="flex flex-col items-center mx-2 sm:mx-4 shrink-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <GoalSelect value={homeGoals} onChange={setHomeGoals} autoFocus />
              <span className="text-xl font-bold text-muted-foreground">:</span>
              <GoalSelect value={awayGoals} onChange={setAwayGoals} />
            </div>
          ) : hasScore ? (
            <button
              onClick={() => {
                setHomeGoals(match.homeGoals!.toString());
                setAwayGoals(match.awayGoals!.toString());
                setEditing(true);
              }}
              className="flex items-center gap-1.5 sm:gap-2 rounded-lg bg-background/60 px-3 sm:px-5 py-2 transition-colors hover:bg-background"
            >
              <span className={`text-2xl font-bold ${match.homeGoals! > match.awayGoals! ? "text-green-400" : "text-foreground"}`}>
                {match.homeGoals}
              </span>
              <span className="text-xl text-muted-foreground">:</span>
              <span className={`text-2xl font-bold ${match.awayGoals! > match.homeGoals! ? "text-green-400" : "text-foreground"}`}>
                {match.awayGoals}
              </span>
            </button>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-dashed border-border px-3 sm:px-5 py-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Pencil className="h-3 w-3" />
              <span className="text-lg font-medium">- : -</span>
            </button>
          )}

          {/* Penalty display/input */}
          {editing && needsPenalty && (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <span>n.E.</span>
              <GoalSelect value={homePen} onChange={setHomePen} />
              <span>:</span>
              <GoalSelect value={awayPen} onChange={setAwayPen} />
            </div>
          )}
          {!editing && hasScore && isDraw && match.isKnockout && typeof match.homePen === "number" && (
            <p className="mt-1 text-xs text-muted-foreground">
              n.E. {match.homePen} : {match.awayPen}
            </p>
          )}

          {/* Action buttons */}
          {editing && (
            <div className="mt-2 flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-green-400 gap-1" onClick={handleSave}>
                <Check className="h-3 w-3" /> OK
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-muted-foreground" onClick={() => setEditing(false)}>
                <X className="h-3 w-3" />
              </Button>
              {hasScore && (
                <Button variant="ghost" size="sm" className="h-7 text-red-400 text-xs" onClick={handleClear}>
                  Loeschen
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Away team - left aligned */}
        <div className="flex flex-1 items-center gap-1.5 sm:gap-2 min-w-0">
          <ClubLogo
            logoUrl={awayClub.logoUrl}
            name={awayClub.name}
            shortName={awayClub.shortName}
            primaryColor={awayClub.primaryColor}
            size="lg"
          />
          <div className="min-w-0 hidden sm:block">
            <p className="text-sm font-semibold truncate">{awayClub.name}</p>
            <p className="text-[10px] text-muted-foreground">{awayClub.shortName}</p>
          </div>
          <div className="min-w-0 sm:hidden">
            <p className="text-xs font-semibold truncate">{awayClub.shortName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
