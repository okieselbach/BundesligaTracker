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
import type { Season, Club } from "@/lib/db";
import { db } from "@/lib/db";
import { createSeason, deleteSeason } from "@/lib/seed";
import type { FullRelegationChanges } from "@/lib/seed";
import { computeStandings } from "@/lib/standings";
import { computeRelegationProposal, type RelegationProposal } from "@/lib/relegation";
import { ClubLogo } from "./ClubLogo";
import { COMPETITIONS } from "@/data/competitions";
import { DEFAULT_SYSTEM_ID, getSystem, type LeagueSystem } from "@/data/leagueSystems";

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

  // For Phase 1 we always use the default (German) system. In Phase 2 the
  // active system will be derived from the season being copied / created.
  const system: LeagueSystem = getSystem(DEFAULT_SYSTEM_ID);
  const poolExchangeCount = system.poolExchangeCount;
  const poolTierLabel = system.poolTiers[0]?.name ?? "Pool";
  const bottomLeague = system.leagues[system.leagues.length - 1];

  /** Short label for a league slug ("1. BL", "Premier League", ...). */
  const leagueShortName = (slug: string): string => {
    const comp = COMPETITIONS.find((c) => c.slug === slug);
    return comp?.shortName ?? slug;
  };
  const bottomLeagueShort = bottomLeague ? leagueShortName(bottomLeague.slug) : "";

  // Full relegation state
  const [proposal, setProposal] = useState<RelegationProposal | null>(null);
  const [playoffWinners, setPlayoffWinners] = useState<Map<number, "higher" | "lower">>(new Map());
  const [clubMap, setClubMap] = useState<Map<string, Club>>(new Map());

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
      setProposal(null);
      setPlayoffWinners(new Map());
      setClubMap(new Map());
      setAbsteigerClubs([]);
      setPoolClubs([]);
      setSelectedAufsteiger(new Set());
    }
    setOpen(isOpen);
  };

  // Load all league standings + compute full relegation proposal when copy source changes
  useEffect(() => {
    if (!open || source !== "copy" || !copyFromId) {
      setProposal(null);
      setPlayoffWinners(new Map());
      setClubMap(new Map());
      setAbsteigerClubs([]);
      setPoolClubs([]);
      setSelectedAufsteiger(new Set());
      return;
    }

    (async () => {
      setLoadingAbstieg(true);
      try {
        const allClubs = await db.clubs.toArray();
        const cMap = new Map(allClubs.map((c) => [c.id, c]));
        setClubMap(cMap);

        const scs = await db.seasonCompetitions
          .where("seasonId")
          .equals(copyFromId)
          .toArray();

        // Load standings for every league in the active system
        const standingsBySlug: Record<string, import("@/lib/standings").StandingRow[]> = {};
        for (const league of system.leagues) {
          const comp = COMPETITIONS.find((c) => c.id === league.competitionId);
          if (!comp) continue;
          const sc = scs.find((s) => s.competitionId === comp.id);
          if (!sc) continue;

          const matches = await db.matches
            .where("seasonCompetitionId")
            .equals(sc.id)
            .toArray();
          const playedMatches = matches.filter((m) => typeof m.homeGoals === "number");

          standingsBySlug[league.slug] =
            playedMatches.length > 0 ? computeStandings(sc, playedMatches) : [];
        }

        // Compute full relegation proposal via the system config
        const prop = computeRelegationProposal({
          systemId: system.id,
          standingsBySlug,
        });
        setProposal(prop);
        setPlayoffWinners(new Map());

        // Bottom-league absteiger that drop into the pool
        if (prop.markedAbstiegPool.length > 0) {
          setAbsteigerClubs(
            prop.markedAbstiegPool.map((id) => cMap.get(id)).filter(Boolean) as Club[]
          );
        } else {
          setAbsteigerClubs([]);
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
  }, [open, source, copyFromId, system]);

  const toggleAufsteiger = (clubId: string) => {
    setSelectedAufsteiger((prev) => {
      const next = new Set(prev);
      if (next.has(clubId)) {
        next.delete(clubId);
      } else if (next.size < poolExchangeCount) {
        next.add(clubId);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      let relegationChanges: FullRelegationChanges | undefined;

      if (source === "copy" && proposal) {
        const movements: FullRelegationChanges["movements"] = [];

        // Add direct promotions and relegations
        for (const p of proposal.directPromotions) {
          movements.push({ clubId: p.clubId, from: p.from, to: p.to });
        }
        for (const r of proposal.directRelegations) {
          movements.push({ clubId: r.clubId, from: r.from, to: r.to });
        }

        // Add resolved playoff results
        for (const [idx, winner] of playoffWinners.entries()) {
          const match = proposal.relegationMatches[idx];
          if (!match) continue;
          if (winner === "lower") {
            // Lower league team wins: swap both clubs
            movements.push({ clubId: match.lower.clubId, from: match.lower.league, to: match.higher.league });
            movements.push({ clubId: match.higher.clubId, from: match.higher.league, to: match.lower.league });
          }
          // If "higher" wins, no movement needed (clubs stay)
        }

        const hasMovements = movements.length > 0;
        const has3LChanges = absteigerClubs.length > 0 && selectedAufsteiger.size === poolExchangeCount;

        if (hasMovements || has3LChanges) {
          relegationChanges = {
            movements,
            thirdLeagueAbsteigerIds: has3LChanges ? absteigerClubs.map((c) => c.id) : [],
            thirdLeagueAufsteigerIds: has3LChanges ? [...selectedAufsteiger] : [],
          };
        }
      }

      await createSeason({
        name: name.trim(),
        makeCurrent: true,
        copyFromSeasonId: source === "copy" ? copyFromId : undefined,
        manual: scheduleMode === "manual",
        relegationChanges,
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
    if (seasons.length <= 1) {
      alert("Die letzte Saison kann nicht gelöscht werden.");
      return;
    }
    if (!confirm(`Saison "${season.name}" und alle zugehörigen Daten (Spielpläne, Ergebnisse) unwiderruflich löschen?`)) return;

    // If deleting the current season, make another one current first
    if (season.isCurrent) {
      const other = seasons.find((s) => s.id !== season.id);
      if (other) {
        await db.seasons.update(other.id, { isCurrent: true });
      }
    }
    await deleteSeason(season.id);
    onRefresh();
  };

  // Valid state: either no Absteiger (no changes), or exactly poolExchangeCount Aufsteiger selected
  const aufsteigValid =
    absteigerClubs.length === 0 ||
    selectedAufsteiger.size === 0 ||
    selectedAufsteiger.size === poolExchangeCount;

  // All playoffs must have a winner selected (if any exist)
  const playoffsValid =
    !proposal ||
    proposal.relegationMatches.length === 0 ||
    playoffWinners.size === proposal.relegationMatches.length;

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

              {/* Full Auf-/Abstieg */}
              {source === "copy" && proposal && (proposal.directPromotions.length > 0 || proposal.directRelegations.length > 0 || proposal.relegationMatches.length > 0 || absteigerClubs.length > 0) && (
                <div className="space-y-3 rounded-lg border border-border p-3">
                  <Label className="text-sm font-semibold">Auf- / Abstieg</Label>

                  {/* Direct moves + playoffs between every adjacent league pair */}
                  {system.leagues.map((upper, idx) => {
                    const lower = system.leagues[idx + 1];
                    if (!lower) return null;
                    const upperShort = leagueShortName(upper.slug);
                    const lowerShort = leagueShortName(lower.slug);
                    const directRelegs = proposal.directRelegations.filter((r) => r.from === upper.slug);
                    const directProms = proposal.directPromotions.filter((p) => p.to === upper.slug);
                    const directMovesExist = directRelegs.length > 0 || directProms.length > 0;
                    const playoffIdx = proposal.relegationMatches.findIndex(
                      (m) => m.higher.league === upper.slug,
                    );
                    const playoff = playoffIdx >= 0 ? proposal.relegationMatches[playoffIdx] : null;
                    if (!directMovesExist && !playoff) return null;

                    return (
                      <div key={`pair-${upper.slug}`} className="space-y-3">
                        {directMovesExist && (
                          <div className="space-y-1.5">
                            <p className="text-xs text-muted-foreground font-semibold">{upperShort} / {lowerShort}</p>
                            <div className="space-y-1">
                              {directRelegs.map((r) => {
                                const club = clubMap.get(r.clubId);
                                if (!club) return null;
                                return (
                                  <div key={r.clubId} className="flex items-center gap-2 rounded border border-red-500/30 bg-red-500/10 px-2.5 py-1.5">
                                    <span className="text-xs">↓</span>
                                    <ClubLogo logoUrl={club.logoUrl} name={club.name} shortName={club.shortName} primaryColor={club.primaryColor} size="sm" />
                                    <span className="text-xs font-medium">{club.name}</span>
                                    <span className="text-xs text-muted-foreground ml-auto">→ {lowerShort}</span>
                                  </div>
                                );
                              })}
                              {directProms.map((p) => {
                                const club = clubMap.get(p.clubId);
                                if (!club) return null;
                                return (
                                  <div key={p.clubId} className="flex items-center gap-2 rounded border border-green-500/30 bg-green-500/10 px-2.5 py-1.5">
                                    <span className="text-xs">↑</span>
                                    <ClubLogo logoUrl={club.logoUrl} name={club.name} shortName={club.shortName} primaryColor={club.primaryColor} size="sm" />
                                    <span className="text-xs font-medium">{club.name}</span>
                                    <span className="text-xs text-muted-foreground ml-auto">→ {upperShort}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {playoff && (() => {
                          const higherClub = clubMap.get(playoff.higher.clubId);
                          const lowerClub = clubMap.get(playoff.lower.clubId);
                          if (!higherClub || !lowerClub) return null;
                          const selected = playoffWinners.get(playoffIdx);
                          return (
                            <div className="space-y-1.5">
                              <p className="text-xs text-muted-foreground font-semibold">Relegation {upperShort} / {lowerShort}</p>
                              <p className="text-xs text-muted-foreground">
                                Platz {playoff.higher.position} ({upperShort}) vs Platz {playoff.lower.position} ({lowerShort}) — Wer spielt nächste Saison {upperShort}?
                              </p>
                              <div className="space-y-1">
                                <button
                                  onClick={() => setPlayoffWinners((prev) => new Map(prev).set(playoffIdx, "higher"))}
                                  className={`flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left transition-colors ${
                                    selected === "higher" ? "border border-blue-500/30 bg-blue-500/10" : "hover:bg-secondary/50"
                                  }`}
                                >
                                  <div className={`h-4 w-4 shrink-0 rounded-full border ${selected === "higher" ? "border-blue-500 bg-blue-500" : "border-border"} flex items-center justify-center`}>
                                    {selected === "higher" && <span className="text-[8px] text-white font-bold">●</span>}
                                  </div>
                                  <ClubLogo logoUrl={higherClub.logoUrl} name={higherClub.name} shortName={higherClub.shortName} primaryColor={higherClub.primaryColor} size="sm" />
                                  <span className="text-xs font-medium">{higherClub.name}</span>
                                  <span className="text-xs text-muted-foreground ml-auto">bleibt {upperShort}</span>
                                </button>
                                <button
                                  onClick={() => setPlayoffWinners((prev) => new Map(prev).set(playoffIdx, "lower"))}
                                  className={`flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left transition-colors ${
                                    selected === "lower" ? "border border-blue-500/30 bg-blue-500/10" : "hover:bg-secondary/50"
                                  }`}
                                >
                                  <div className={`h-4 w-4 shrink-0 rounded-full border ${selected === "lower" ? "border-blue-500 bg-blue-500" : "border-border"} flex items-center justify-center`}>
                                    {selected === "lower" && <span className="text-[8px] text-white font-bold">●</span>}
                                  </div>
                                  <ClubLogo logoUrl={lowerClub.logoUrl} name={lowerClub.name} shortName={lowerClub.shortName} primaryColor={lowerClub.primaryColor} size="sm" />
                                  <span className="text-xs font-medium">{lowerClub.name}</span>
                                  <span className="text-xs text-muted-foreground ml-auto">steigt auf in {upperShort}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}

                  {/* Bottom league ↔ Pool exchange */}
                  {absteigerClubs.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-semibold">{bottomLeagueShort} / {poolTierLabel}</p>

                      {/* Absteiger */}
                      <p className="text-xs text-muted-foreground">Absteiger (letzte {poolExchangeCount} Plätze):</p>
                      <div className="space-y-1">
                        {absteigerClubs.map((club) => (
                          <div key={club.id} className="flex items-center gap-2 rounded border border-red-500/30 bg-red-500/10 px-2.5 py-1.5">
                            <span className="text-xs">↓</span>
                            <ClubLogo logoUrl={club.logoUrl} name={club.name} shortName={club.shortName} primaryColor={club.primaryColor} size="sm" />
                            <span className="text-xs font-medium">{club.name}</span>
                            <span className="text-xs text-muted-foreground ml-auto">→ {poolTierLabel}</span>
                          </div>
                        ))}
                      </div>

                      {/* Aufsteiger Auswahl */}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Aufsteiger wählen ({selectedAufsteiger.size} von {poolExchangeCount}):
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
                        <p className="text-xs text-muted-foreground py-2">Keine {poolTierLabel}-Clubs verfügbar.</p>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-1 rounded border border-border p-1.5">
                          {poolClubs.map((club) => {
                            const selected = selectedAufsteiger.has(club.id);
                            const disabled = !selected && selectedAufsteiger.size >= poolExchangeCount;
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
                                <ClubLogo logoUrl={club.logoUrl} name={club.name} shortName={club.shortName} primaryColor={club.primaryColor} size="sm" />
                                <span className="text-xs font-medium truncate">{club.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {selectedAufsteiger.size > 0 && selectedAufsteiger.size < poolExchangeCount && (
                        <p className="text-xs text-amber-400">
                          Bitte genau {poolExchangeCount} Aufsteiger wählen oder keinen (keine Änderung).
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* No standings hint */}
              {source === "copy" && proposal && proposal.directPromotions.length === 0 && proposal.directRelegations.length === 0 && proposal.relegationMatches.length === 0 && absteigerClubs.length === 0 && !loadingAbstieg && (
                <p className="text-xs text-muted-foreground italic">
                  Keine Spielergebnisse vorhanden — Auf-/Abstieg wird übersprungen, Club-Zusammensetzung wird 1:1 übernommen.
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Die neue Saison wird als aktuelle Saison gesetzt. {scheduleMode === "manual" ? "Leere Spieltage werden erstellt - Begegnungen müssen manuell eingetragen werden." : "Spielpläne werden automatisch generiert."} {COMPETITIONS.find((c) => c.id === system.cup.competitionId)?.name ?? "Pokal"} muss separat ausgelost werden.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleCreate} disabled={creating || !name.trim() || !aufsteigValid || !playoffsValid}>
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
            {seasons.length > 1 && (
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
