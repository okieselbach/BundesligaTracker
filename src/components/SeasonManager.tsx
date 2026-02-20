"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { Season, Club, Id } from "@/lib/db";
import { db } from "@/lib/db";
import { createSeason, deleteSeason } from "@/lib/seed";
import { computeStandings } from "@/lib/standings";
import { ClubLogo } from "./ClubLogo";
import { COMPETITIONS } from "@/data/competitions";

const ABSTIEG_COUNT = 4;

interface SeasonManagerProps {
  seasons: Season[];
  currentSeason: Season | null;
  onRefresh: () => void;
}

export function SeasonManager({ seasons, currentSeason, onRefresh }: SeasonManagerProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [source, setSource] = useState<"default" | "copy">("copy");
  const [copyFromId, setCopyFromId] = useState<string>("");
  const [scheduleMode, setScheduleMode] = useState<"random" | "manual">("random");
  const [creating, setCreating] = useState(false);

  // 3. Liga Abstieg/Aufstieg state
  const [absteigerClubs, setAbsteigerClubs] = useState<Club[]>([]);
  const [poolClubs, setPoolClubs] = useState<Club[]>([]);
  const [selectedAufsteiger, setSelectedAufsteiger] = useState<Set<string>>(new Set());
  const [loadingAbstieg, setLoadingAbstieg] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      // Suggest next season name based on current
      if (currentSeason) {
        const match = currentSeason.name.match(/^(\d{4})\/(\d{2})$/);
        if (match) {
          const startYear = parseInt(match[1]) + 1;
          const endYear = parseInt(match[2]) + 1;
          setName(`${startYear}/${endYear.toString().padStart(2, "0")}`);
        } else {
          setName("");
        }
        setCopyFromId(currentSeason.id);
      } else {
        setName("2025/26");
      }
      setSource(currentSeason ? "copy" : "default");
      setAbsteigerClubs([]);
      setPoolClubs([]);
      setSelectedAufsteiger(new Set());
    }
    setOpen(isOpen);
  };

  // Load 3.Liga Absteiger + Regionalliga Pool when copy source changes
  useEffect(() => {
    if (!open || source !== "copy" || !copyFromId) {
      setAbsteigerClubs([]);
      setPoolClubs([]);
      setSelectedAufsteiger(new Set());
      return;
    }

    (async () => {
      setLoadingAbstieg(true);
      try {
        const allClubs = await db.clubs.toArray();
        const clubMap = new Map(allClubs.map((c) => [c.id, c]));

        // Find 3. Liga season-competition for the source season
        const thirdLigaComp = COMPETITIONS.find((c) => c.slug === "3-liga");
        if (!thirdLigaComp) { setLoadingAbstieg(false); return; }

        const scs = await db.seasonCompetitions
          .where("seasonId")
          .equals(copyFromId)
          .toArray();
        const thirdSC = scs.find((sc) => sc.competitionId === thirdLigaComp.id);

        if (!thirdSC) { setLoadingAbstieg(false); return; }

        // Compute standings
        const matches = await db.matches
          .where("seasonCompetitionId")
          .equals(thirdSC.id)
          .toArray();
        const playedMatches = matches.filter((m) => typeof m.homeGoals === "number");

        if (playedMatches.length > 0) {
          const standings = computeStandings(thirdSC, playedMatches);
          // Last ABSTIEG_COUNT are Absteiger
          const absteigerIds = standings.slice(-ABSTIEG_COUNT).map((r) => r.clubId);
          setAbsteigerClubs(
            absteigerIds.map((id) => clubMap.get(id)).filter(Boolean) as Club[]
          );
        } else {
          // No matches played, show last 4 clubs from list
          const lastIds = thirdSC.clubIds.slice(-ABSTIEG_COUNT);
          setAbsteigerClubs(
            lastIds.map((id) => clubMap.get(id)).filter(Boolean) as Club[]
          );
        }

        // Pool = all clubs NOT in any league for the source season
        const leagueCompIds = COMPETITIONS.filter((c) => c.type === "league").map((c) => c.id);
        const leagueSCs = scs.filter((sc) => leagueCompIds.includes(sc.competitionId));
        const leagueClubIds = new Set(leagueSCs.flatMap((sc) => sc.clubIds));
        const pool = allClubs
          .filter((c) => !leagueClubIds.has(c.id))
          .sort((a, b) => a.name.localeCompare(b.name));
        setPoolClubs(pool);
      } finally {
        setLoadingAbstieg(false);
      }
    })();
  }, [open, source, copyFromId]);

  const toggleAufsteiger = (clubId: string) => {
    setSelectedAufsteiger((prev) => {
      const next = new Set(prev);
      if (next.has(clubId)) {
        next.delete(clubId);
      } else if (next.size < ABSTIEG_COUNT) {
        next.add(clubId);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const thirdLeagueChanges =
        source === "copy" && absteigerClubs.length > 0 && selectedAufsteiger.size === ABSTIEG_COUNT
          ? {
              absteigerIds: absteigerClubs.map((c) => c.id),
              aufsteigerIds: [...selectedAufsteiger],
            }
          : undefined;

      await createSeason({
        name: name.trim(),
        makeCurrent: true,
        copyFromSeasonId: source === "copy" ? copyFromId : undefined,
        manual: scheduleMode === "manual",
        thirdLeagueChanges,
      });
      setOpen(false);
      onRefresh();
    } catch (err) {
      alert("Fehler beim Erstellen der Saison: " + (err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (season: Season) => {
    if (season.isCurrent) {
      alert("Die aktuelle Saison kann nicht gelöscht werden. Wechsle zuerst zu einer anderen Saison.");
      return;
    }
    if (!confirm(`Saison "${season.name}" und alle zugehörigen Daten (Spielpläne, Ergebnisse) unwiderruflich löschen?`)) return;
    await deleteSeason(season.id);
    onRefresh();
  };

  // Valid state: either no Absteiger (no changes), or exactly ABSTIEG_COUNT Aufsteiger selected
  const aufsteigValid =
    absteigerClubs.length === 0 ||
    selectedAufsteiger.size === 0 ||
    selectedAufsteiger.size === ABSTIEG_COUNT;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Saisons
        </h3>
        <Dialog open={open} onOpenChange={handleOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Neue Saison
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Neue Saison erstellen</DialogTitle>
              <DialogDescription>
                Erstellt eine neue Saison mit Spielplänen für alle Ligen.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="season-name">Saison-Name</Label>
                <Input
                  id="season-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. 2026/27"
                />
              </div>

              <div className="space-y-2">
                <Label>Club-Zusammensetzung</Label>
                <Select value={source} onValueChange={(v) => setSource(v as "default" | "copy")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="copy">Von bestehender Saison übernehmen</SelectItem>
                    <SelectItem value="default">Standard-Clubs (Seed 2025/26)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {source === "copy" && seasons.length > 0 && (
                <div className="space-y-2">
                  <Label>Clubs übernehmen von</Label>
                  <Select value={copyFromId} onValueChange={setCopyFromId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {seasons.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}{s.isCurrent ? " (aktuell)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Spielplan-Modus</Label>
                <Select value={scheduleMode} onValueChange={(v) => setScheduleMode(v as "random" | "manual")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">Zufall (automatisch generiert)</SelectItem>
                    <SelectItem value="manual">Manuell (Begegnungen selbst eintragen)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 3. Liga Auf-/Abstieg */}
              {source === "copy" && absteigerClubs.length > 0 && (
                <div className="space-y-3 rounded-lg border border-border p-3">
                  <Label className="text-sm font-semibold">3. Liga Auf-/Abstieg</Label>

                  {/* Absteiger */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Absteiger (Platz {21 - ABSTIEG_COUNT}-20):</p>
                    <div className="space-y-1">
                      {absteigerClubs.map((club) => (
                        <div key={club.id} className="flex items-center gap-2 rounded border border-red-500/30 bg-red-500/10 px-2.5 py-1.5">
                          <ClubLogo
                            logoUrl={club.logoUrl}
                            name={club.name}
                            shortName={club.shortName}
                            primaryColor={club.primaryColor}
                            size="sm"
                          />
                          <span className="text-xs font-medium">{club.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Aufsteiger Auswahl */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Aufsteiger wählen ({selectedAufsteiger.size} von {ABSTIEG_COUNT}):
                      </p>
                      {selectedAufsteiger.size > 0 && (
                        <button
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedAufsteiger(new Set())}
                        >
                          Zurücksetzen
                        </button>
                      )}
                    </div>
                    {loadingAbstieg ? (
                      <p className="text-xs text-muted-foreground py-2">Laden...</p>
                    ) : poolClubs.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">Keine Regionalliga-Clubs verfügbar.</p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1 rounded border border-border p-1.5">
                        {poolClubs.map((club) => {
                          const selected = selectedAufsteiger.has(club.id);
                          const disabled = !selected && selectedAufsteiger.size >= ABSTIEG_COUNT;
                          return (
                            <button
                              key={club.id}
                              onClick={() => toggleAufsteiger(club.id)}
                              disabled={disabled}
                              className={`flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left transition-colors ${
                                selected
                                  ? "border border-green-500/30 bg-green-500/10"
                                  : disabled
                                  ? "opacity-40"
                                  : "hover:bg-secondary/50"
                              }`}
                            >
                              <div className={`h-4 w-4 shrink-0 rounded border ${
                                selected ? "border-green-500 bg-green-500" : "border-border"
                              } flex items-center justify-center`}>
                                {selected && <span className="text-[10px] text-white font-bold">&#10003;</span>}
                              </div>
                              <ClubLogo
                                logoUrl={club.logoUrl}
                                name={club.name}
                                shortName={club.shortName}
                                primaryColor={club.primaryColor}
                                size="sm"
                              />
                              <span className="text-xs font-medium truncate">{club.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {selectedAufsteiger.size > 0 && selectedAufsteiger.size < ABSTIEG_COUNT && (
                      <p className="text-xs text-amber-400">
                        Bitte genau {ABSTIEG_COUNT} Aufsteiger wählen oder keinen (keine Änderung).
                      </p>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Die neue Saison wird als aktuelle Saison gesetzt. {scheduleMode === "manual" ? "Leere Spieltage werden erstellt - Begegnungen müssen manuell eingetragen werden." : "Spielpläne werden automatisch generiert."} DFB-Pokal muss separat ausgelost werden.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleCreate} disabled={creating || !name.trim() || !aufsteigValid}>
                {creating ? "Erstelle..." : "Saison erstellen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Season list */}
      <div className="space-y-1.5">
        {seasons.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-md bg-secondary/30 px-3 py-2 text-sm"
          >
            <span className={s.isCurrent ? "font-bold" : ""}>
              {s.name}
              {s.isCurrent && (
                <span className="ml-2 text-xs text-primary">(aktuell)</span>
              )}
            </span>
            {!s.isCurrent && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-400"
                onClick={() => handleDelete(s)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
