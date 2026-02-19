"use client";

import { useState, useEffect } from "react";
import type { Club, Id } from "@/lib/db";
import { ClubLogo } from "./ClubLogo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, ArrowRightLeft } from "lucide-react";

export interface Pairing {
  homeClubId: Id;
  awayClubId: Id;
}

interface MatchPairingEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  availableClubs: Club[];
  /** Pre-filled pairings (for editing existing matchdays) */
  initialPairings?: Pairing[];
  onSave: (pairings: Pairing[]) => void;
}

function ClubSelect({
  value,
  options,
  placeholder,
  clubMap,
  onChange,
}: {
  value: string;
  options: Club[];
  placeholder: string;
  clubMap: Map<string, Club>;
  onChange: (clubId: string) => void;
}) {
  const selected = clubMap.get(value);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground appearance-none cursor-pointer focus:ring-2 focus:ring-primary focus:outline-none"
    >
      <option value="">{placeholder}</option>
      {options.map((c) => (
        <option key={c.id} value={c.id}>
          {c.shortName} - {c.name}
        </option>
      ))}
    </select>
  );
}

export function MatchPairingEditor({
  open,
  onOpenChange,
  title,
  description,
  availableClubs,
  initialPairings,
  onSave,
}: MatchPairingEditorProps) {
  const [pairings, setPairings] = useState<Pairing[]>([]);

  // Initialize pairings when dialog opens
  useEffect(() => {
    if (open) {
      setPairings(initialPairings ?? []);
    }
  }, [open, initialPairings]);

  const clubMap = new Map(availableClubs.map((c) => [c.id, c]));

  // Track which clubs are already used
  const usedClubIds = new Set<string>();
  for (const p of pairings) {
    if (p.homeClubId) usedClubIds.add(p.homeClubId);
    if (p.awayClubId) usedClubIds.add(p.awayClubId);
  }

  const unusedClubs = availableClubs.filter((c) => !usedClubIds.has(c.id));

  const handleAddPairing = () => {
    setPairings((prev) => [...prev, { homeClubId: "", awayClubId: "" }]);
  };

  const handleAutoFill = () => {
    const remaining = [...unusedClubs];
    const newPairings: Pairing[] = [];
    while (remaining.length >= 2) {
      newPairings.push({
        homeClubId: remaining.shift()!.id,
        awayClubId: remaining.shift()!.id,
      });
    }
    setPairings((prev) => [...prev, ...newPairings]);
  };

  const handleRemovePairing = (index: number) => {
    setPairings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSwapPairing = (index: number) => {
    setPairings((prev) =>
      prev.map((p, i) =>
        i === index ? { homeClubId: p.awayClubId, awayClubId: p.homeClubId } : p
      )
    );
  };

  const handleSetHome = (index: number, clubId: string) => {
    setPairings((prev) =>
      prev.map((p, i) => (i === index ? { ...p, homeClubId: clubId } : p))
    );
  };

  const handleSetAway = (index: number, clubId: string) => {
    setPairings((prev) =>
      prev.map((p, i) => (i === index ? { ...p, awayClubId: clubId } : p))
    );
  };

  const getAvailableForSlot = (currentPairing: Pairing, isHome: boolean) => {
    const currentId = isHome ? currentPairing.homeClubId : currentPairing.awayClubId;
    const otherId = isHome ? currentPairing.awayClubId : currentPairing.homeClubId;
    return availableClubs.filter(
      (c) => c.id === currentId || (!usedClubIds.has(c.id) && c.id !== otherId)
    );
  };

  const isValid = pairings.length > 0 && pairings.every((p) => p.homeClubId && p.awayClubId);

  const handleSave = () => {
    if (!isValid) return;
    onSave(pairings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Pairings list */}
          {pairings.map((pairing, index) => {
            const homeClub = clubMap.get(pairing.homeClubId);
            const awayClub = clubMap.get(pairing.awayClubId);
            const homeOptions = getAvailableForSlot(pairing, true);
            const awayOptions = getAvailableForSlot(pairing, false);

            return (
              <div key={index} className="flex items-center gap-2 rounded-md bg-secondary/30 px-3 py-2">
                <span className="text-xs text-muted-foreground w-5 shrink-0">{index + 1}</span>

                {/* Home club logo */}
                {homeClub && (
                  <ClubLogo
                    logoUrl={homeClub.logoUrl}
                    name={homeClub.name}
                    shortName={homeClub.shortName}
                    primaryColor={homeClub.primaryColor}
                    size="sm"
                  />
                )}

                {/* Home select */}
                <div className="flex-1 min-w-0">
                  <ClubSelect
                    value={pairing.homeClubId}
                    options={homeOptions}
                    placeholder="Heim..."
                    clubMap={clubMap}
                    onChange={(v) => handleSetHome(index, v)}
                  />
                </div>

                {/* Swap */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => handleSwapPairing(index)}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                </Button>

                {/* Away select */}
                <div className="flex-1 min-w-0">
                  <ClubSelect
                    value={pairing.awayClubId}
                    options={awayOptions}
                    placeholder="Gast..."
                    clubMap={clubMap}
                    onChange={(v) => handleSetAway(index, v)}
                  />
                </div>

                {/* Away club logo */}
                {awayClub && (
                  <ClubLogo
                    logoUrl={awayClub.logoUrl}
                    name={awayClub.name}
                    shortName={awayClub.shortName}
                    primaryColor={awayClub.primaryColor}
                    size="sm"
                  />
                )}

                {/* Remove */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-400"
                  onClick={() => handleRemovePairing(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}

          {/* Empty state */}
          {pairings.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Noch keine Begegnungen. Klicke &quot;Begegnung&quot; zum Hinzufuegen oder &quot;Alle zuteilen&quot;.
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleAddPairing}
              disabled={unusedClubs.length < 2}
            >
              <Plus className="h-3.5 w-3.5" />
              Begegnung
            </Button>
            {unusedClubs.length >= 2 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleAutoFill}
              >
                Alle zuteilen
              </Button>
            )}
          </div>

          {/* Status */}
          <p className="text-xs text-muted-foreground">
            {pairings.length} Begegnungen | {unusedClubs.length} Clubs nicht zugeordnet
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
